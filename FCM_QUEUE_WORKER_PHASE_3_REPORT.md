# Reporte Final — FASE 3: Queue Worker Enterprise
**BlueSystem Delivery Enterprise v2.1**
**Fecha:** 16 de Agosto, 2026

---

## 1. Arquitectura Anterior
Anteriormente, cuando se redactaba una campaña en el Admin Panel (`panel-admin/public/js/dashboard/notifications.js`), la aplicación frontend intentaba llamar directamente de forma síncrona a `functionsService.sendPushNotification` y realizaba la escritura batch en las notificaciones del buzón de usuario (`users/{uid}/notifications`), cambiando localmente el documento a `status: 'SENT'`. No existía un worker o servicio en segundo plano (Backend Queue Worker) que procesara de manera desacoplada e independiente los documentos de campañas.

## 2. Problema Encontrado
- Si la conexión del Admin Panel fallaba durante el envío masivo o se cerraba la pestaña, la campaña quedaba en estado `QUEUED` sin enviarse.
- No existía protección contra condiciones de carrera si dos administradores o tareas intentaban procesar la misma campaña.
- El envío masivo síncrono desde el navegador saturaba el hilo de ejecución frontend.

## 3. Arquitectura Nueva
```
[Admin Web / API]
       │
       ▼ (Escribe documento)
[Firestore: notification_campaigns/{campaignId}]
  status = "QUEUED"
       │
       ├─────────────────────────────────────────────────┐
       ▼ (Trigger onCreate / onUpdate real-time)          ▼ (Cron Worker periódico cada 1 min)
[onNotificationCampaignCreated / Updated]       [notificationQueueScheduler]
       │                                                 │
       └────────────────────────┬────────────────────────┘
                                │ (Ejecuta)
                                ▼
                   [notificationQueueWorker]
                                │ (Lock atómico en transacción)
                                ▼
                           PROCESSING
                                │ (Resuelve destinatarios)
                                ▼
                     [user_devices (Multi-Device)]
                                │
                                ▼
                 [FCM sendEachForMulticast]
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼ (Respuesta exitosa / parcial)             ▼ (Tokens inválidos NotRegistered)
[In-App Notifications users/{uid}/notifications] [Desactiva user_devices tokenStatus='invalid']
          │
          ▼
        SENT (o RETRY / FAILED)
```

## 4. Worker Implementado
Se implementó el servicio central [`functions/src/services/notificationQueueWorker.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/notificationQueueWorker.ts), junto con sus triggers Firestore [`functions/src/triggers/notificationQueue.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/notificationQueue.ts) y su scheduler pubsub [`functions/src/schedulers/notificationQueue.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/schedulers/notificationQueue.ts).

## 5. Estados Canónicos Integrados
- `QUEUED`: Campaña creada y lista en cola.
- `PROCESSING`: Campaña tomada exclusivamente por un Worker (bloqueo atómico activo).
- `SENT`: Campaña procesada y enviada a FCM y buzón In-App.
- `FAILED`: Campaña fallida tras agotar reintentos (max 3 intentos).
- `RETRY`: Campaña con error transitorio en espera del siguiente intento.
- Estados preservados: `DRAFT`, `SCHEDULED`, `CANCELLED`, `ARCHIVED`.

## 6. Mecanismo de Lock / Lease (Prevención de Carreras)
Antes de procesar, el Worker ejecuta una **transacción atómica en Firestore**:
```typescript
transaction.update(campaignRef, {
  status: "PROCESSING",
  processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
  workerId: workerId,
  attempts: admin.firestore.FieldValue.increment(1)
});
```
Si el documento ya se encuentra en `PROCESSING` y la propiedad `processingStartedAt` fue registrada hace menos de 5 minutos (ventana de arrendamiento / lease), cualquier otro Worker aborta inmediatamente. Si transcurrieron más de 5 minutos, el Worker asume que la ejecución previa colapsó y recupera la campaña de forma segura.

## 7. Estrategia de Idempotencia
- **Lock Atómico:** Impide ejecuciones simultáneas redundantes.
- **Buzón In-App Idempotente:** Notificaciones en `users/{uid}/notifications/{campaignId}` usan el `campaignId` determinista como ID de documento con `{ merge: true }`. Si ocurre un reintento, el documento se actualiza/sobrescribe sin duplicar notificaciones visibles para el usuario.
- **Identificador de Entrega:** Cada worker registra `workerId` y `processingStartedAt`.

## 8. Targeting de Destinatarios
Soporte completo para los tipos de targeting certificados en Fase 1:
- `all`: Todos los dispositivos activos.
- `customer` / `cliente`: Filtra roles de cliente.
- `courier` / `driver` / `motorizado`: Filtra roles de repartidor.
- `business` / `comercio`: Filtra roles de comercios.
- `admin` / `super_admin`: Filtra administradores.
- `specific`: Resuelve por lista explícita de UIDs (`targetUids`) en lotes de 30 consultas `in`.
- Segmentos avanzados: `active_30_days`, `no_orders`, `frequent_orders`.

## 9. Resiliencia Multi-Dispositivo
- Lectura directa de `/user_devices` (`${uid}_${deviceId}`).
- Soporta usuarios con 1, 2, 3 o más dispositivos activos simultáneamente.
- Agrupa todos los tokens FCM válidos y remite mensajes multicast manteniendo el enlace con el UID.

## 10. Control de Reintentos (Retries)
- Límite máximo de intentos: 3.
- Ante falla transitoria, la campaña pasa a `status: "RETRY"` con marca de tiempo `nextRetryAt` (+1 minuto).
- Si alcanza 3 intentos fallidos, pasa automáticamente a `status: "FAILED"`.

## 11. Invalidación de Tokens FCM Obsoletos
- Si FCM devuelve `registration-token-not-registered`, `invalid-registration-token`, o `NotRegistered`:
- Se actualiza el documento del dispositivo en `user_devices` fijando `isActive = false`, `tokenStatus = "invalid"`, `fcmToken = null`, y `lastCleanedAt = serverTimestamp()`.
- Ningún token FCM se imprime de manera completa en los logs del servidor por seguridad EIAM.

## 12. Resultados de la Suite de Pruebas (TEST A - H)
Se ejecutó la suite de pruebas en [`queueWorker.test.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/__tests__/queueWorker.test.ts):
- ✅ **TEST A:** Campaña QUEUED ➔ Claim (PROCESSING) ➔ SENT exitosamente.
- ✅ **TEST B:** Campaña sin destinatarios ➔ Procesada correctamente con 0 envíos (sin crash).
- ✅ **TEST C:** Usuario con 2 dispositivos ➔ Ambos reciben el envío multicast.
- ✅ **TEST D:** Token FCM inválido ➔ Falla contabilizada y token invalidado en DB.
- ✅ **TEST E:** Error transitorio ➔ Transición a RETRY con backoff.
- ✅ **TEST F:** Campaña ya SENT ➔ Ignorada por el Worker (Idempotencia).
- ✅ **TEST G:** Ejecuciones simultáneas ➔ Solo 1 worker obtiene el lock atómico.
- ✅ **TEST H:** Campaña SCHEDULED futura ➔ No se procesa antes de `scheduledAt`.

## 13. Resultado de la Prueba Real Controlada (Smoke Test Real)
Ejecución verificada en tiempo real sobre Firebase Cloud Functions:
- **Campaign ID:** `camp_smoke_test_1786893243740`
- **Worker ID:** `scheduler_1786893245208`
- **Intentos (attempts):** `1`
- **Usuarios Objetivos:** `1`
- **Dispositivos Objetivos:** `2`
- **Estado Final:** `SENT`
- **Tiempo de Ejecución:** `586ms`
- **Resultado Android:** Las notificaciones data-only y visuales en segundo plano mantuvieron la recepción certificada en Fase 2.

## 14. Despliegue (Deploy)
Despliegue realizado de forma aislada y limpia:
```bash
firebase deploy --only functions:onNotificationCampaignCreated,functions:onNotificationCampaignUpdated,functions:notificationQueueScheduler,firestore:indexes
```

## 15. Archivos Modificados / Creados
- [`functions/src/services/notificationQueueWorker.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/notificationQueueWorker.ts) [NUEVO]
- [`functions/src/triggers/notificationQueue.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/notificationQueue.ts) [NUEVO]
- [`functions/src/schedulers/notificationQueue.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/schedulers/notificationQueue.ts) [NUEVO]
- [`functions/src/__tests__/queueWorker.test.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/__tests__/queueWorker.test.ts) [NUEVO]
- [`functions/src/__tests__/smokeTestPhase3.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/__tests__/smokeTestPhase3.ts) [NUEVO]
- [`functions/src/index.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/index.ts) [MODIFICADO]
- [`panel-admin/public/js/dashboard/notifications.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/notifications.js) [MODIFICADO]
- [`firestore.indexes.json`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.indexes.json) [MODIFICADO]

## 16. Archivos NO Modificados (Preservados Intactos)
- Código Kotlin en Android (Servicios `BlueMessagingService`, layout, etc.)
- Reglas de Firestore / Storage
- Configuración de App Check / reCAPTCHA Enterprise
- Merchant Web / Onboarding
- Claims de Auth

## 17. Riesgos Residuales
- **Límite de lectura de usuarios masivos:** Si la base de datos supera los 50,000 usuarios en un solo `targetType = all`, se recomienda habilitar paginación mediante cursor `startAfter` en el worker para optimizar el consumo de memoria en Node.js.

---
**ESTADO DE LA FASE 3:** 🟢 **COMPLETADA Y CERTIFICADA**
