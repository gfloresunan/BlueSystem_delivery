# NOTIFICATION_LIFECYCLE_ANDROID_TRAY_AUDIT.md
## Auditoría Forense Read-Only y Plan de Arquitectura Canónica — Fase 4.2
**Proyecto:** BlueSystem Delivery Enterprise  
**Módulo:** Notification Center Enterprise + Android Notification System  
**Fase:** 4.2 — Notification Lifecycle & Android System Tray Hardening  
**Fecha:** 2026-08-17  
**Estado:** 🟢 AUDITORÍA COMPLETADA (READ-ONLY)

---

## 1. Resumen Ejecutivo & Diagnóstico Forense

El presente documento constituye la auditoría técnica read-only para la **Fase 4.2**, orientada a consolidar el ciclo de vida completo de notificaciones en **BlueSystem Delivery Enterprise**, fortaleciendo la experiencia nativa en el **System Tray de Android** y garantizando la integridad financiera, la auditabilidad y la conservación absoluta de métricas históricas.

### Hallazgos Clave del Sistema Actual:
1. **Creación y Cola Backend:** Las campañas se originan en `panel-admin/public/js/dashboard/notifications.js` y se persisten en `notification_campaigns/{campaignId}` con estado inicial `QUEUED` / `SCHEDULED` / `DRAFT`. El `notificationQueueWorker.ts` consume estas campañas de forma atómica e idempotente.
2. **Entregas FCM (Ledger):** Cada intento de envío registra una clave única determinista (`buildDeliveryKey` = `${campaignId}_${uid}_${deviceId}`) en `campaign_deliveries`. Si `status == "FCM_ACCEPTED"`, el worker omite reenvíos futuros.
3. **Buzón In-App por Usuario:** El worker escribe un documento determinista por usuario en `users/{uid}/notifications/{campaignId}`.
4. **Estado READ/UNREAD Actual:** Existen las propiedades booleanas `isRead` y `read` en `AppNotification.kt` y `users/{uid}/notifications`. Sin embargo, falta la formalización del origen de lectura (`readSource`) y la distinción de estados cuando la lectura proviene del System Tray.
5. **System Tray Nativo Android & Intent Handling:** `DeliveryFirebaseMessagingService.kt` construye notificaciones nativas en `onMessageReceived()` usando `NotificationManager`. Sin embargo:
   - `MainActivity.kt` no parsea actualmente los `extras` del `Intent` de notificación (`campaignId`, `notificationId`, `deepLink`, `readSource`).
   - El payload enviado por `notificationQueueWorker.ts` incluía la clave de nivel superior `notification: {...}`, lo cual provocaba que en estado **Background/Killed**, Android OS gestionara la notificación por defecto sin invocar `onMessageReceived()` del servicio en todos los escenarios.
6. **Eliminación y Deshabilitación Actual:** No existía una acción formal de **Eliminación Lógica (DELETE)** a nivel de campaña que oculte la notificación para los clientes sin destruir las métricas del Admin Panel, ni una acción de **Deshabilitación Selectiva por Cliente (DISABLE)**.

---

## 2. Mapa Completo de Archivos, Funciones y Componentes Involucrados

| Componente / Capa | Archivo / Rango de Líneas | Responsabilidad Técnica |
| :--- | :--- | :--- |
| **Admin Panel (Web)** | [`panel-admin/public/js/dashboard/notifications.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/notifications.js#L1-L833) | Interfaz de gestión de campañas, KPIs, render de historial y formularios de envío. |
| **Queue Worker (Backend)** | [`functions/src/services/notificationQueueWorker.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/notificationQueueWorker.ts#L1-L633) | Procesamiento atómico, dispatch FCM Data-Only, idempotencia en `campaign_deliveries` y escritura en `users/{uid}/notifications`. |
| **Callables & Diagnostics** | [`functions/src/callables/admin.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/admin.ts#L416-L800) | Funciones HTTPS Callable para diagnóstico FCM (`diagnoseFcmSystem`, `sendFcmDiagnostic`) y gobernanza EIAM. |
| **Android Manifest** | [`app/src/main/AndroidManifest.xml`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/AndroidManifest.xml#L1-L80) | Permisos `POST_NOTIFICATIONS`, `USE_FULL_SCREEN_INTENT`, declaración de `DeliveryFirebaseMessagingService` y `MainActivity`. |
| **FCM Service (Android)** | [`app/src/main/java/com/example/service/DeliveryFirebaseMessagingService.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/service/DeliveryFirebaseMessagingService.kt#L1-L231) | `onMessageReceived()`, creación de `NotificationChannel`, construcción de `NotificationCompat.Builder` y `PendingIntent`. |
| **Main Activity (Android)** | [`app/src/main/java/com/example/MainActivity.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L1-L695) | Entrada principal del app Android. Requiere integración del handler de `Intent` de notificaciones (DeepLinks, `campaignId`, `READ` status). |
| **Repository (Android)** | [`app/src/main/java/com/example/data/repository/NotificationRepository.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/data/repository/NotificationRepository.kt#L1-L285) | Listener en tiempo real de `users/{uid}/notifications`, tracking de apertura, botones, conversiones, y filtrado `deletedByUser` / `disabled`. |
| **Modelo Domain (Android)**| [`app/src/main/java/com/example/domain/model/AppNotification.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/model/AppNotification.kt#L1-L65) | Modelo de datos Kotlin para notificaciones in-app y botones interactivos. |
| **Reglas de Seguridad** | [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L568-L580) | Reglas de acceso para `notification_campaigns`, `campaign_deliveries` y `users/{uid}/notifications`. |

---

## 3. Auditoría de los 16 Puntos del Modelo Actual

1. **Cómo se crea actualmente una notificación:**
   `notifications.js` envía un objeto de campaña a `notification_campaigns/{campaignId}` con `status: "QUEUED"`, `title`, `body`, `category`, `type`, `priority`, `imageUrl`, `deepLink`, `buttons`, `analytics`, etc.
2. **Cómo se entrega:**
   `notificationQueueWorker.ts` resuelve los dispositivos en `user_devices`, evalúa la clave determinista `deliveryKey` (`${campaignId}_${uid}_${deviceId}`) en `campaign_deliveries`, efectúa el multicast a FCM y escribe la notificación in-app en `users/{uid}/notifications/{campaignId}`.
3. **Cómo se escribe en `users/{uid}/notifications`:**
   En lotes de 500 por el Worker Backend utilizando la clave de documento `campaignId` (idempotencia in-app).
4. **Cómo se determina si está leída:**
   En Firestore mediante los campos `isRead: boolean` y `read: boolean`. En Kotlin mediante `AppNotification.getEffectiveIsRead()`.
5. **Cómo se muestra actualmente en la aplicación:**
   En Android mediante `NotificationRepository.startListening(uid)`, que mantiene un `Flow<List<AppNotification>>` filtrado. En Admin Web mediante snap-listener a `notification_campaigns`.
6. **Cómo se construye el historial del Admin Panel:**
   `notificationsModule.loadHistory()` lee los últimos 20 documentos de `notification_campaigns` ordenados por `createdAt desc`.
7. **Cómo se calculan actualmente los KPIs:**
   - **Enviados:** `analytics.sentCount`
   - **Abiertos:** `analytics.openedCount` (incrementado vía `FieldValue.increment(1)` por `trackNotificationOpened`)
   - **CTR:** `(opened / sent) * 100`
   - **Compras:** `analytics.conversionCount`
   - **Conversión:** `(conversions / sent) * 100`
8. **Cómo se identifica `campaignId`:**
   Cadena determinista `camp_${timestamp}` o `camp_diag_${timestamp}`.
9. **Cómo se identifica `uid`:**
   UID único de Firebase Auth (`user_123`).
10. **Cómo se identifica `deviceId`:**
    Identificador único de hardware/sesión registrado en `user_devices` (`${uid}_${deviceId}`).
11. **Cómo se construye `deliveryKey`:**
    Función `buildDeliveryKey(campaignId, uid, deviceId)` = `${campaignId}_${cleanUid}_${cleanDeviceId}`.
12. **Cómo se maneja el click:**
    In-App: `trackNotificationOpened` actualiza `isRead: true`, `read: true`, `readAt`, `openedAt` y llama a `updateCampaignAnalytics(campaignId, "openedCount")`.
    System Tray: `DeliveryFirebaseMessagingService.kt` genera la notificación nativa, pero `MainActivity.kt` no parseaba los extras al abrir la app.
13. **Cómo funciona `onMessageReceived()`:**
    Recibe la `RemoteMessage`, extrae `data`, selecciona el `NotificationChannel` (`CHANNEL_ALARM_ID` para `NEW_ORDER`, `CHANNEL_STATUS_ID` para otros) y lanza `notificationManager.notify()`.
14. **Cómo se crean los `NotificationChannel`:**
    En `createNotificationChannels()` de `DeliveryFirebaseMessagingService.kt`:
    - `new_orders_channel_v2` (Importancia HIGH, Alarma)
    - `order_status_channel` (Importancia DEFAULT)
    - `new_orders_channel` (Legacy)
15. **Qué permisos Android utiliza:**
    `android.permission.POST_NOTIFICATIONS` y `android.permission.USE_FULL_SCREEN_INTENT` declarados en `AndroidManifest.xml`.
16. **Comportamiento en Foreground / Background / Killed:**
    - **Foreground:** `onMessageReceived()` se ejecuta siempre.
    - **Background / Killed:** Se garantiza ejecución directa en `onMessageReceived()` únicamente si el payload FCM es **Data-Only** (sin objeto `notification` raíz). Si el payload incluye `notification`, el SO muestra el banner genérico y solo pasa control al usuario al tocarlo.

---

## 4. Diseño del Modelo Canónico de Estados (Fase 4.2)

### A. Delivery Status (`campaign_deliveries`)
Permanecen inalterados para la gestión operativa FCM:
- `PENDING`
- `SENDING`
- `FCM_ACCEPTED`
- `FAILED_RETRYABLE`
- `FAILED_PERMANENT`

### B. Read Status (`users/{uid}/notifications/{id}`)
- `UNREAD`: Estado inicial (`isRead: false`, `read: false`).
- `READ`: Transición al hacer clic o abrir la notificación (`isRead: true`, `read: true`).
- Metadatos de lectura auditables:
  - `readAt`: Timestamp del servidor/dispositivo.
  - `readSource`: `"in_app"` | `"system_tray"` | `"deep_link"` | `"notification_center"`.
  - `readByUid`: UID del usuario que confirmó la lectura.

### C. Visibility Status
Separación estricta entre visibilidad y estado de campaña:
- `VISIBLE`: Visible para el cliente en el Notification Center e interactiva.
- `DISABLED`: Oculta selectivamente para un cliente específico (`users/{uid}/notifications/{id}` -> `status: "DISABLED"` o `disabled: true`). La campaña y entregas globales continúan intactas.
- `DELETED`: Eliminación lógica global (`notification_campaigns/{id}` -> `visibility: { status: "DELETED", deletedAt, deletedBy }`). La notificación desaparece de la UI/contador de los clientes, pero se conservan todas las estadísticas, entregas y auditoría.

### D. Campaign Status (`notification_campaigns`)
Estados del ciclo de vida backend:
- `QUEUED`, `PROCESSING`, `SENT`, `RETRY`, `FAILED`, `SCHEDULED`, `DRAFT`.

---

## 5. Estrategia de Eliminación Lógica (DELETE) y Deshabilitación (DISABLE)

### 🗑 Eliminación Lógica (DELETE):
1. **Admin Panel:** Menú de acciones en cada tarjeta de campaña -> `Eliminar de la bandeja`.
2. **Backend / Firestore:**
   Se actualiza `notification_campaigns/{campaignId}`:
   ```json
   {
     "visibility": {
       "status": "DELETED",
       "deletedAt": "SERVER_TIMESTAMP",
       "deletedBy": "admin_uid"
     }
   }
   ```
3. **Comportamiento en Clientes:**
   - La subcolección `users/{uid}/notifications/{campaignId}` o el filtro de escucha en Android/Web omite documentos de campañas con `visibility.status == "DELETED"`.
   - El contador de no leídas se descuenta automáticamente.
   - **Importante sobre System Tray:** Si la notificación nativa ya fue mostrada en la barra de Android antes de la eliminación lógica, al tocarla la app consulta Firestore; detecta `status == "DELETED"`, evita mostrar el contenido como activo de forma segura y marca la interacción sin restaurar la campaña.

### 🚫 Deshabilitación por Cliente (DISABLE):
1. **Admin Panel:** Menú de acciones -> `Deshabilitar para cliente` -> Especificar `targetUid`.
2. **Firestore:** Se actualiza la notificación del usuario objetivo `users/{targetUid}/notifications/{campaignId}`:
   ```json
   {
     "visibilityStatus": "DISABLED",
     "disabledAt": "SERVER_TIMESTAMP",
     "disabledBy": "admin_uid"
   }
   ```
3. **Resultado:** El Usuario A continúa viendo la campaña (`VISIBLE`), mientras el Usuario B no la ve (`DISABLED`). Las estadísticas globales y entregas de la campaña permanecen 100% intactas.

---

## 6. Integración Nativa Android System Tray & PendingIntent

### Flujo de Interacción:
```
FCM Data-Only Payload
       │
       ▼
DeliveryFirebaseMessagingService.onMessageReceived()
       │
       ▼
NotificationManager.notify() con PendingIntent
       │ (Extras: campaignId, notificationId, deepLink, readSource="system_tray")
       ▼
🔔 ANDROID SYSTEM TRAY
       │
       ▼ (User Click)
MainActivity.onNewIntent() / onCreate()
       │
       ▼
Parsea Extras → Consulta Firestore Visibility
       │
  ┌────┴──────────────────────────┐
  ▼                               ▼
[VISIBLE]                    [DELETED / DISABLED]
  │                               │
  ├─ Marca READ (readSource)      ├─ Manejo seguro sin restaurar
  ├─ Registra readAt              └─ Notifica al usuario
  └─ Navega a DeepLink / Screen
```

---

## 7. Plan de Verificación & Matriz de Pruebas (Phase 4.2)

1. **TEST A (UNREAD Inicial):** Creación de campaña -> Notificación in-app arranca en `UNREAD` (`isRead: false`).
2. **TEST B (READ In-App):** Clic en notificación in-app -> Transición a `READ`, registra `readAt` y `readSource="in_app"`.
3. **TEST C (READ System Tray):** Clic desde System Tray Android -> La app se abre, navega al DeepLink, marca `READ` y registra `readSource="system_tray"`.
4. **TEST D (Foreground / Background / Killed):** Notificación nativa se genera en la barra superior en los 3 estados usando el payload Data-Only.
5. **TEST E (DELETE Lógico):** Admin elimina campaña -> Oculta en cliente in-app y ajusta contador `UNREAD`. Conserva `sentCount`, `campaign_deliveries` y métricas.
6. **TEST F (DISABLE Cliente):** Admin deshabilita para Usuario C -> Usuario C no la ve; Usuarios A y B la mantienen `VISIBLE`.
7. **TEST G (Regresión FCM & Idempotencia):** Re-ejecutar Smoke Tests Fases 3.2 y 4.1. Confirmar 0 mensajes duplicados y 0 ruptura de Queue Worker o Delivery Ledger.

---

## 8. Criterio de Aceptación para Certificación 🟢 CERTIFIED

La Fase 4.2 se certificaría como **🟢 CERTIFIED** una vez ejecutada la implementación quirúrgica y comprobado que:
- Los estados `UNREAD`, `READ`, `VISIBLE`, `DISABLED` y `DELETED` funcionan con total independencia.
- La eliminación lógica no destruye ningún registro de `notification_campaigns`, `campaign_deliveries`, ni auditoría.
- Las notificaciones nativas en el System Tray de Android abren la app, marcan `READ` y navegan correctamente sin alterar los componentes canónicos certificados.
