# Informe de Auditoría Forense — Hardening del Queue Worker (FASE 3.1)
**BlueSystem Delivery Enterprise v2.1**
**Fecha de Auditoría:** 16 de Agosto, 2026

---

## 1. Auditoría del Flujo Exacto (`notificationQueueWorker.ts`)

El análisis forense del código implementado en [`notificationQueueWorker.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/notificationQueueWorker.ts) revela el siguiente orden secuencial de operaciones durante el procesamiento de una campaña:

```
[1. Lock/Claim Atómico] ──► [2. Resolución Targets] ──► [3. Envío Multicast FCM] ──► [4. Escritura In-App] ──► [5. Estado Final SENT]
  (runTransaction)          (user_devices)             (sendEachForMulticast)      (users/{uid}/notif)        (update campaign)
```

### Detalle Secuencial:
1. **Lock/Claim Atómico (Líneas 36–88):**
   - Transacción Firestore que evalúa si `status == "QUEUED"`, `status == "RETRY"`, o `status == "PROCESSING"` con lease expirado (> 5 min).
   - Cambia atómicamente el estado a `PROCESSING`, registra `processingStartedAt = serverTimestamp()`, `workerId` e incrementa `attempts`.
2. **Resolución de Destinatarios (Líneas 121–217):**
   - Consulta `user_devices` (filtrando por rol, segmento o lista de `targetUids`).
   - Extrae el mapa de tokens activos únicos (`tokensArray`) y la lista de UIDs de usuarios destinatarios (`recipientUidsList`).
3. **Envío Externo FCM Multicast (Líneas 224–305):**
   - Construye el payload FCM y ejecuta `messaging.sendEachForMulticast` en bloques de 500 tokens.
   - En caso de tokens marcados como `NotRegistered` o `InvalidRegistration`, desactiva el dispositivo en `user_devices`.
4. **Escritura de Notificaciones In-App (Líneas 308–347):**
   - Escribe en lotes de 500 documentos en la subcolección `users/{uid}/notifications/{campaignId}` usando `{ merge: true }`.
5. **Actualización de Estado Final a SENT (Líneas 354–367):**
   - Actualiza el documento de campaña en `notification_campaigns/{campaignId}` a `status: "SENT"`, registrando `completedAt`, `successCount`, `failureCount` y analíticas de entrega.

---

## 2. Análisis de Escenarios Críticos y Clasificación de Riesgos

### Escenario A: Fallo del Worker posterior al envío FCM y antes de registrar `SENT`
- **Análisis:** Si Worker A reclama la campaña (`QUEUED` ➔ `PROCESSING`), ejecuta exitosamente `messaging.sendEachForMulticast` (los teléfonos físicos reciben la notificación push), pero Worker A se estrella o sufre un corte de red antes de ejecutar `campaignRef.update({ status: "SENT" })`, la campaña permanece en estado `PROCESSING`.
- **Efecto:** Al transcurrir 5 minutos, la ventana de arrendamiento (lease) expira. Worker B (vía scheduler cron) detecta la campaña abandonada en `PROCESSING`, la reclama (`PROCESSING` ➔ `PROCESSING`), resuelve nuevamente los destinatarios y vuelve a ejecutar `messaging.sendEachForMulticast`.
- **Resultado en Teléfonos Físicos:** Los dispositivos reciben una **segunda notificación push física**.
- **Resultado en Buzón In-App:** El buzón In-App no se duplica porque la ruta `users/{uid}/notifications/{campaignId}` utiliza `campaignId` determinista con `{ merge: true }`.
- **Clasificación:** 🔴 **DUPLICATE DELIVERY RISK**

---

### Escenario B: Éxito Parcial y Reintentos (Partial Success & Retries)
- **Análisis:** Supóngase una campaña enviada a 3 dispositivos:
  - `device1` (User A) ➔ FCM SUCCESS
  - `device2` (User A) ➔ FCM SUCCESS
  - `device3` (User B) ➔ FCM FAILURE (Error de red o timeout en ese batch)
- Si una excepción o fallo parcial provoca que la campaña cambie a `status: "RETRY"`, en el Intento 2 (Attempt 2), el Worker vuelve a consultar `user_devices`, obtiene nuevamente `device1`, `device2` y `device3`, y ejecuta `sendEachForMulticast` para **los 3 dispositivos otra vez**.
- **Resultado:** `device1` y `device2` (que tuvieron éxito en el Intento 1) reciben una **segunda notificación push física**.
- **Clasificación:** 🔴 **DUPLICATE DELIVERY RISK**

---

### Escenario C: Expiración de Lease durante Procesamiento Masivo (Lease Expiration)
- **Análisis:** En campañas de gran escala (ej. 50,000+ dispositivos), la resolución de targets en Firestore, el envío de 100 batches FCM de 500 tokens y la escritura de 100 batches Firestore In-App puede tomar más de 5 minutos en entornos con latencia de red o arranques en frío (cold starts).
- Si el procesamiento de Worker A supera los 5 minutos (ej. 5 min 10 s), el Worker B en background detectará que `processingStartedAt` superó los 5 minutos y reclamará la misma campaña de forma concurrente mientras Worker A aún no termina.
- **Resultado:** Worker A y Worker B enviarán ráfagas simultáneas de notificaciones push FCM a los mismos dispositivos.
- **Clasificación:** 🔴 **DUPLICATE DELIVERY RISK**

---

### Escenario D: Idempotencia In-App vs. Idempotencia FCM Externa
- **Buzón In-App (`users/{uid}/notifications/{campaignId}`):**
  - Utiliza `campaignId` como ID determinista de documento.
  - La operación `batch.set(ref, data, { merge: true })` es **100% idempotente**. Múltiples escrituras no crean registros duplicados en el buzón.
  - **Clasificación:** 🟢 **SAFE**

- **Notificación Física Push FCM (`messaging.sendEachForMulticast`):**
  - La API de FCM es sin estado (stateless). Firebase Admin SDK envía cada solicitud push a los servidores de Google Play Services / APNs, los cuales entregan la notificación física al dispositivo.
  - Sin un registro persistente previo por dispositivo (`campaignId_uid_deviceId`), FCM no puede detectar si esa notificación específica ya se entregó físicamente al teléfono en un intento previo.
  - **Clasificación:** 🔴 **DUPLICATE DELIVERY RISK**

---

### Escenario E: Concurrencia Simultánea dentro del Lease (Worker A + Worker B)
- **Análisis:** Si Worker A y Worker B se ejecutan en el mismo milisegundo mientras la campaña está en `QUEUED`, la transacción atómica Firestore `db.runTransaction` garantiza que **únicamente un Worker obtendrá el lock**. El segundo Worker recibirá `claimSuccess == false` y abortará de inmediato sin enviar FCM.
- **Clasificación:** 🟢 **SAFE**

---

## 3. Matriz de Clasificación de Riesgos Forenses

| Escenario / Componente | Descripción | Clasificación |
| :--- | :--- | :---: |
| **Lock Atómico Simultáneo** | Transacción Firestore `QUEUED` ➔ `PROCESSING` dentro de ventana lease | 🟢 **SAFE** |
| **Buzón In-App (`users/{uid}/notifications`)** | Escritura con ID determinista `campaignId` y `{ merge: true }` | 🟢 **SAFE** |
| **Token Invalidation Policy** | Desactivación de tokens `NotRegistered` / `InvalidRegistration` | 🟢 **SAFE** |
| **Recuperación por Lease Expirado** | Reintento de campaña colgada reenvía FCM masivo | 🔴 **DUPLICATE DELIVERY RISK** |
| **Reintento por Falla Parcial (RETRY)** | Reintento vuelve a enviar FCM a tokens exitosos previos | 🔴 **DUPLICATE DELIVERY RISK** |
| **Procesamiento Masivo > 5 Minutos** | Lease expira durante ejecución legítima larga causando doble worker | 🔴 **DUPLICATE DELIVERY RISK** |

---

## 4. Requerimientos Técnicos para Idempotencia Real FCM (Fase Futura 3.2)

Para elevar los puntos marcados con 🔴 **DUPLICATE DELIVERY RISK** al estado 🟢 **SAFE**, se requerirá evaluar en una fase futura la incorporación de una colección o subcolección de registros de entrega deterministas por combinación única:

$$\text{DeliveryKey} = \text{campaignId} + \text{"\_"} + \text{uid} + \text{"\_"} + \text{deviceId}$$

### Estrategia Conceptual de Entrega Determinista (Sin aplicar cambios aún):
1. **Colección/Subcolección `campaign_deliveries`:**
   - Registro con ID determinista `${campaignId}_${uid}_${deviceId}`.
   - Estado por dispositivo: `PENDING` | `DELIVERED` | `FAILED`.
2. **Filtrado previo a FCM:**
   - Antes de llamar a `sendEachForMulticast`, el Worker verifica qué `deliveryKey` ya se encuentran marcados como `DELIVERED`.
   - Únicamente los dispositivos en estado no entregado son incluidos en el payload multicast de reintento.
3. **Heartbeat / Extensión de Lease:**
   - Para campañas masivas de larga duración, actualizar periódicamente `processingStartedAt` durante los bucles de batch para evitar expiraciones falsas del lease.

---

## 5. Declaración de Cumplimiento de Reglas (FASE 3.1)

En estricto cumplimiento de las directivas de la FASE 3.1:
- ❌ **NO se ha modificado código fuente.**
- ❌ **NO se ha realizado ningún deploy.**
- ❌ **NO se han modificado Firestore Rules ni Storage Rules.**
- ❌ **NO se ha modificado el proyecto Android Kotlin.**
- ❌ **NO se ha modificado App Check ni Auth Claims.**
- ✅ **Se entrega exclusivamente este documento de auditoría forense para revisión.**

---
**ESTADO DE LA AUDITORÍA FASE 3.1:** 📋 **INFORME COMPLETO Y ENTREGADO**
