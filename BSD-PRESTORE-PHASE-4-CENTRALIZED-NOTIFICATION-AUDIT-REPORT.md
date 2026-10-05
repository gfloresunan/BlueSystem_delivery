# REPORTE DE AUDITORÍA FORENSE — FASE 4
## Sistema Centralizado de Notificaciones y Push Multiplataforma
### BlueSystem Delivery — Admin Web → Backend Worker → Firebase/FCM → Android + iOS
**Protocolo:** `BSD-PRESTORE-PHASE-4-CENTRALIZED-NOTIFICATION-MULTIPLATFORM-AUDIT-001`  
**Fase:** 4 de 6  
**Dependencias:** Fase 1 (Data Layer Certified), Fase 2 (Cross-Platform UI/UX Certified), Fase 3 (Cross-Device Identity Certified)  
**Modalidad:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DEPLOYMENT`  
**Fecha de Ejecución:** Octubre 2026  
**Auditor Responsable:** Senior Developer & Auditor de BlueSystem  

---

## 1. EXECUTIVE SUMMARY

Se ha llevado a cabo una auditoría forense exhaustiva y de código profundo sobre la infraestructura completa de notificaciones de **BlueSystem Delivery Enterprise**. La investigación abarcó desde el frontend administrativo (**Admin Web**), pasando por el motor de encolamiento y despacho en la nube (**Cloud Functions / Firestore**), hasta los clientes móviles finales (**Android Nativo** en Kotlin y **iOS** sobre Flutter).

### 🎯 Respuesta a la Pregunta Central de Certificación:
> **"¿Desde un único módulo centralizado de Admin Web puedo enviar una notificación y hacer que llegue correctamente a los usuarios Android y iOS, sin crear un módulo administrativo separado para cada sistema operativo?"**

**DICTAMEN TÉCNICO:** **SÍ A NIVEL DE ARQUITECTURA ADMINISTRATIVA Y BACKEND QUEUE WORKER, CON CONDICIONANTES OPERATIVAS Y DE INFRAESTRUCTURA MÓVIL.**

1. **Un Solo Centro Administrativo Multiplataforma (VERIFICADO 🟢):**  
   Admin Web dispone de **un único módulo de notificaciones** (`panel-admin/public/js/dashboard/notifications.js`). El operador redacta una sola campaña, selecciona los destinatarios (Global, Segmento, Rol o UIDs específicos) y el sistema emite un único documento en la colección `/notification_campaigns` con estado `QUEUED`. No existen pantallas segregadas para Android o iOS.
2. **Despacho Centralizado Multi-Dispositivo (VERIFICADO 🟢):**  
   El backend Queue Worker (`notificationQueueWorker.ts`) procesa la campaña de forma desacoplada y transaccional (`runTransaction`). Resuelve los dispositivos activos en `/user_devices`, agrupando tokens Android e iOS indistintamente. Despacha mediante `admin.messaging().sendEachForMulticast` con un payload híbrido optimizado:
   - Para **Android**: Bloque `data` prioritario con campos de acción, canal de sonido (`new_orders_channel_v3` / `order_status_channel`), iconos e intenciones de ruteo.
   - Para **iOS**: Bloque `apns` nativo con `aps: { alert: { title, body }, sound: "default", badge: 1, contentAvailable: true }`.
3. **Buzón In-App Sincronizado (VERIFICADO 🟢):**  
   El mismo worker escribe atómicamente en `/users/{uid}/notifications/{campaignId}` con `{ merge: true }`. Tanto el cliente Android como el cliente iOS escuchan esta colección en tiempo real, garantizando consistencia absoluta entre la notificación del sistema (Push) y el buzón interno (In-App).
4. **Desconexión entre ECP Declarada y Realidad de Providers (HALLAZGO CRÍTICO 🔴):**  
   La "Enterprise Communication Platform (ECP)" documentada en los Sprints 14.4 y 14.5 como un microservicio transversal para 7 canales (Push, Email, WhatsApp, SMS, Telegram, Webhook, In-App) **no existe como servicio backend distribuido**. En el cliente Android (`ChannelProviders.kt`), los providers de WhatsApp, SMS, Telegram y Webhook son **STUBS MOCK** que retornan `isDelivered = true` de forma fija sin realizar peticiones a redes externas.
5. **Brecha de Seguridad en Cierre de Sesión (HALLAZGO CRÍTICO 🔴):**  
   Ni en Android (`AuthManager.cerrarSesion`) ni en Flutter (`SessionState.signOut`) se desactiva el token (`isActive: false` o desvinculación de UID) en `/user_devices/${uid}_${deviceId}`. Si un usuario cierra sesión, el dispositivo físico continúa recibiendo notificaciones privadas dirigidas al usuario anterior.
6. **Estado del Gate de Entrega iOS / APNs (CONDICIONAL / BLOCKED 🟠):**  
   El puente en el código de la app iOS (`AppDelegate.swift`, `PlatformNotificationAdapter.dart`, `Info.plist`) está completamente codificado con `FirebaseMessaging` y token bridging. Sin embargo, la entrega física a iPhones está bloqueada a la espera de la configuración de la clave APNs (`.p8`) en Firebase Console y la compilación controlada en macOS Xcode (dependencia de infraestructura de Fase 2.2).

---

## 2. CURRENT NOTIFICATION ARCHITECTURE

El mapa real del sistema implementado físicamente en el repositorio es el siguiente:

```
┌──────────────────────────────────────────────────────────────────┐
│                      ADMIN WEB (Control Panel)                   │
│             panel-admin/public/js/dashboard/notifications.js     │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ 1. Crea documento con status: "QUEUED"
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│              FIRESTORE: /notification_campaigns/{id}             │
└──────────────────┬───────────────────────────────┬───────────────┘
                   │ 2. onCreate / onUpdate        │ 2b. Fallback cada 1 min
                   ↓                               ↓
┌──────────────────────────────────────┐  ┌────────────────────────┐
│  Trigger: onNotificationCampaign...  │  │  Scheduler: cron(1m)   │
│  notificationQueue.ts                │  │  notificationQueue.ts  │
└──────────────────┬───────────────────┘  └────────┬───────────────┘
                   │                               │
                   └───────────────┬───────────────┘
                                   │ Invoca con lease lock
                                   ↓
┌──────────────────────────────────────────────────────────────────┐
│              BACKEND WORKER: notificationQueueWorker.ts          │
│  - Adquiere Lock atómico (runTransaction)                        │
│  - Resuelve destinatarios según targetType / targetUids          │
│  - Consulta /user_devices donde isActive == true                 │
│  - Deduplica envíos mediante /campaign_deliveries/{key}          │
│  - Agrupa en lotes de 500 tokens                                 │
└──────────────┬───────────────────────────────────┬───────────────┘
               │                                   │
       A. PUSH │ (sendEachForMulticast)    B. IN-APP│ (Batch Write)
               ↓                                   ↓
┌──────────────────────────────┐       ┌───────────────────────────┐
│ Firebase Cloud Messaging     │       │ Firestore Buzón Usuario:  │
│ (FCM v1 / Admin SDK)         │       │ /users/{uid}/notifications│
└──────┬────────────────┬──────┘       └───────────┬───────────────┘
       │                │                          │
       ↓ (FCM)          ↓ (APNs)                   │
┌──────────────┐ ┌──────────────┐                  │
│   ANDROID    │ │     iOS      │                  │
│  (Kotlin)    │ │  (Flutter)   │                  │
└──────┬───────┘ └──────┬───────┘                  │
       │                │                          │
       └────────┬───────┴──────────────────────────┘
                │ Presentación local, sonido y navegación
                ↓
┌──────────────────────────────┐
│       DISPOSITIVO FINAL      │
│  - System Tray Notification  │
│  - Unread Badge Increment    │
│  - Deep Link Navigation      │
└──────────────────────────────┘
```

---

## 3. ADMIN WEB NOTIFICATION CENTER

- **Ubicación:** `panel-admin/public/js/dashboard/notifications.js` (1,725 líneas).
- **Ruta de Interfaz:** `#notifications` dentro de `dashboard.html`.
- **Componente:** `NotificationsModule` (inicializado mediante `initNotificationsModule()`).
- **Permisos y Roles:** Exclusivo para Platform Admin / Super Admin (validado mediante `requireAuth` y claims de Firebase Auth).
- **Formulario Unificado:**
  - **Título y Mensaje:** Inputs con validación de longitud máxima y caracteres especiales.
  - **Categoría:** Transaccional (`PEDIDOS`, `SISTEMA`, `SEGURIDAD`) o Comercial (`PROMOCIONES`, `NOVEDADES`).
  - **Segmentación:** Todos (`all`), Solo Clientes (`customer`), Solo Comercios (`business`), Solo Motorizados (`courier`), Inactivos 30 días (`active_30_days`), Sin Pedidos (`no_orders`), Frecuentes (`frequent_orders`) o UIDs Manuales.
  - **Acción / Deep Link:** Pantalla destino (`ORDER_DETAILS`, `PROMOTIONS`, `PROFILE`, etc.) y entidad asociada (`orderId`, `businessId`, `couponId`).
  - **Imagen Promocional:** URL de imagen con previsualización en tiempo real y soporte para estilo `BigPictureStyle`.
  - **Programación:** Envío inmediato (`sendNow`) o programado (`scheduledAt: ISO Timestamp`).
- **Mecanismo de Despacho:** **Asíncrono y Desacoplado**. La interfaz escribe en `/notification_campaigns` con `status: 'QUEUED'`. **No realiza envíos síncronos directos**, evitando bloqueos del navegador.
- **Historial y Monitoreo:** Tabla reactiva con listeners a `/notification_campaigns` que muestra métricas en vivo: Total Objetivos, Dispositivos Notificados (`deliveredCount`), Fallidos (`failureCount`), Tasa de Éxito (`%`), y Log de Auditoría.

---

## 4. ECP CORE (ENTERPRISE COMMUNICATION PLATFORM)

- **Realidad del Código:** Las clases asociadas al ECP residen en el paquete de cliente Android `com.example.enterprise.communication.*`.
- **Componentes Identificados:**
  - `CommunicationOrchestrator.kt`: Fachada orquestadora cliente.
  - `CommunicationMessage.kt`: Modelo agnóstico de mensaje.
  - `ChannelProviders.kt`: Clases de entrega por canal.
  - `CommunicationQueueEngine.kt`: Cola local de mensajes.
  - `WorkflowCommunicationEngine.kt`: Máquina de estados en memoria para flujos temporizados.
  - `UserPreferenceCenter.kt`: Almacén de preferencias en memoria.
- **Veredicto ECP Core:** **🔴 STUB / FALSE SUCCESS A NIVEL GLOBAL**.
  No existe un microservicio o cluster de backend ejecutando ECP. Se trata de una biblioteca Kotlin compilada dentro del APK de Android. La verdadera plataforma de comunicaciones del backend es el binomio **Cloud Functions (`notificationQueueWorker.ts`) + FCM Admin SDK + EmailService (SMTP)**.

---

## 5. ENTERPRISE EVENT BUS

- **Ubicación:** `app/src/main/java/com/example/enterprise/communication/EnterpriseEventBus.kt`.
- **Implementación:** `SharedFlow<DomainEvent>` de Kotlin Coroutines en memoria local del dispositivo Android.
- **Veredicto:** **🔴 SHELL / LOCAL ONLY**. No está conectado a un Event Bus distribuido (Google Cloud Pub/Sub o Eventarc). Solo comunica componentes internos dentro del mismo proceso del APK de Android. Los eventos de dominio entre backend y clientes viajan mediante **Firestore Document Triggers** (`onCreate`, `onUpdate` en `/orders`, `/deliveryTrips`, `/notification_campaigns`).

---

## 6. NOTIFICATION DISPATCHER

- **En Android:** `NotificationDispatcher.kt` rutea mensajes en base a un mapa de proveedores (`Map<CommunicationChannel, IChannelProvider>`).
- **En Backend (Canónico):** La función de despacho real la ejecuta `notificationQueueWorker.ts` mediante la función interna:
  ```typescript
  const multicastPayload: admin.messaging.MulticastMessage = {
    tokens: chunk,
    data: dataPayload,
    android: { priority: "high", ttl: 86400 * 1000 },
    apns: {
      headers: { "apns-priority": "10" },
      payload: {
        aps: {
          alert: { title: campaign.title, body: campaign.body },
          sound: "default",
          badge: 1,
          contentAvailable: true
        }
      }
    }
  };
  const response = await admin.messaging().sendEachForMulticast(multicastPayload);
  ```
- **Veredicto:** El dispatcher backend es **🟢 REAL / VERIFIED**, desacoplado, transaccional y altamente eficiente.

---

## 7. FCM (FIREBASE CLOUD MESSAGING)

- **SDK Utilizado:** `firebase-admin` (Node.js) v11+ en Backend, `firebase-messaging` (Android BOM 32.7.0+) en Android, y `firebase_messaging: ^15.2.4` en Flutter iOS.
- **Método de Despacho:** `sendEachForMulticast` en bloques de hasta 500 tokens (límite de la API de FCM).
- **Manejo de Respuestas:** El worker recorre `response.responses`:
  - Si `resp.success === true`: Registra entrega exitosa en `/campaign_deliveries`.
  - Si `resp.success === false`: Clasifica el error mediante `resp.error?.code`.
- **Limpieza de Tokens Inválidos:** Si el código de error es `messaging/registration-token-not-registered`, `messaging/invalid-registration-token` o `messaging/invalid-argument`, el worker ejecuta inmediatamente una mutación en Firestore sobre `/user_devices/{docId}`:
  ```typescript
  await db.collection("user_devices").document(device.docId).update({
    isActive: false,
    tokenStatus: "invalid",
    invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
    invalidationReason: resp.error.code
  });
  ```
- **Veredicto:** **🟢 REAL / VERIFIED / HARDENED**.

---

## 8. APNs (APPLE PUSH NOTIFICATION SERVICE)

- **Configuración en Backend:**
  - El backend `notificationQueueWorker.ts` inyecta la cabecera canónica `apns-priority: 10` y el bloque `aps` estructurado.
- **Configuración en iOS (`flutter_client/ios`):**
  - `AppDelegate.swift`: Invoca `application.registerForRemoteNotifications()` y vincula el token APNs con FCM mediante `Messaging.messaging().apnsToken = deviceToken`.
  - `Info.plist`: Declara `UIBackgroundModes` con `remote-notification`, `fetch` y `location`. Configura `FirebaseAppDelegateProxyEnabled: false`.
- **Puntos No Verificados / Pendientes:**
  - **Entitlements en Disco:** El archivo `flutter_client/ios/Runner/Runner.entitlements` con `aps-environment` no está físicamente generado en el repositorio (está definido como especificación formal en `C2D29_ENTITLEMENTS_CONTRACT.md`).
  - **Credenciales Apple Developer (.p8):** La subida del Auth Key de APNs a la consola de Firebase es una operación cloud externa que no se encuentra versionada en el código.
- **Veredicto:** **🟡 PARTIAL / PENDING EXTERNAL PROVISIONING (Fase 2.2 Dependency)**.

---

## 9. ANDROID PUSH

- **Servicio:** `DeliveryFirebaseMessagingService.kt` (extiende `FirebaseMessagingService`).
- **Canales de Notificación (Android 8.0+ / API 26+):**
  - `CHANNEL_ALARM_V3_ID` (`new_orders_channel_v3`): Prioridad `IMPORTANCE_HIGH`, vibración continua, luces rojas y sonido de alarma para asignaciones de pedidos y ofertas entrantes.
  - `CHANNEL_STATUS_ID` (`order_status_channel`): Canal estándar para cambios de estado y campañas generales.
- **Permisos en Android 13+ (API 33+):**
  - Declarado en `AndroidManifest.xml`: `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`.
  - Solicitado en tiempo de ejecución en `MainActivity.kt` (`requestNotificationPermissionLauncher`).
- **Pantalla Completa en Bloqueo:** Declara `<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />` y configura `fullScreenPendingIntent` para pedidos urgentes de motorizados.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 10. IOS PUSH

- **Implementación:** `PlatformNotificationAdapter.dart` en `flutter_client/lib/platform/notifications/`.
- **Integración Dual:** Combina `FirebaseMessaging` para la recepción de red y `flutter_local_notifications` para la presentación visual en primer plano (Foreground).
- **Configuración de Presentación en Foreground:**
  ```dart
  await _fcm.setForegroundNotificationPresentationOptions(
    alert: true,
    badge: true,
    sound: true,
  );
  ```
- **Handler en Background / Terminated:** Define `_firebaseMessagingBackgroundHandler` como función `@pragma('vm:entry-point')` de nivel superior.
- **Veredicto:** **🟢 REAL / VERIFIED A NIVEL DE CÓDIGO CLIENTE**.

---

## 11. USER DEVICE REGISTRY (`/user_devices`)

- **Colección Canónica:** `/user_devices/{uid}_{deviceId}`.
- **Esquema de Documento:**
  ```typescript
  {
    deviceId: string,          // ANDROID_ID / UUID persistente
    uid: string,               // Firebase Auth UID
    email: string,             // Email del usuario
    role: string,              // "customer" | "courier" | "business" | "admin"
    fcmToken: string,          // Token de FCM vigente
    token: string,             // Paridad para legacy triggers
    platform: string,          // "Android" | "iOS"
    deviceType: string,        // "Smartphone" | "Tablet"
    appVersion: string,        // Versión instalada
    model: string,             // Modelo de hardware
    manufacturer: string,      // Fabricante
    language: string,          // Idioma del sistema
    isActive: boolean,         // true = habilitado para envíos
    isTokenValid: boolean,     // false si rebotó en FCM
    lastActiveAt: Timestamp,   // Última actividad
    lastTokenUpdate: Timestamp,// Fecha del último refresh
    updatedAt: Timestamp       // Timestamp de sincronización
  }
  ```
- **Subcolección Espejo:** `/users/{uid}/devices/{deviceId}` (mantenida para consultas contextuales del propio usuario).
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 12. TOKEN LIFECYCLE

- **Registro Inicial:** Ejecutado automáticamente tras el login (`FcmManager.registerCurrentDeviceToken()` en Android y `PlatformNotificationAdapter.registerDeviceToken()` en Flutter).
- **Token Rotation / Refresh:**
  - Android: `DeliveryFirebaseMessagingService.onNewToken(newToken)` actualiza atómicamente el documento en `/user_devices/${uid}_${deviceId}`.
  - Flutter / iOS: `_fcm.onTokenRefresh.listen(...)` re-ejecuta `registerDeviceToken()`.
- **Detección de Invalidez:** Gestionada en el backend por `notificationQueueWorker.ts` al recibir respuestas de rechazo de FCM.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 13. MULTI-DEVICE

- **Soporte Real:** **1 Usuario → N Dispositivos Activos**.
- **Mecanismo:** La clave del documento en `/user_devices` es `${uid}_${deviceId}`. Un mismo UID con una tablet Android y un iPhone tendrá dos documentos independientes:
  - `/user_devices/USR_001_samsung_tab_123` (`platform: "Android"`)
  - `/user_devices/USR_001_iphone_uuid_456` (`platform: "iOS"`)
- **Despacho:** Cuando el worker envía a `USR_001`, consulta todos los documentos con `uid == USR_001` e `isActive == true`. Ambos tokens son incluidos en el lote multicast de FCM.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 14. LOGOUT / REINSTALL (VULNERABILIDAD FORENSE)

- **Comportamiento en Logout:**
  - En Android (`AuthManager.cerrarSesion`): Ejecuta `auth.signOut()`, detiene listeners locales y limpia cachés en memoria. **NO actualiza Firestore ni marca `isActive: false` en `/user_devices`**.
  - En Flutter (`SessionState.signOut`): Desconecta Auth pero **NO llama a `PlatformNotificationAdapter` para desvincular el dispositivo**.
- **Riesgo Operativo (Cross-User Data Leak):**
  Si el Usuario A cierra sesión y deja el teléfono, las notificaciones dirigidas al Usuario A continúan llegando físicamente a ese teléfono. Si posteriormente el Usuario B inicia sesión en ese mismo teléfono físico:
  - Se genera un nuevo registro `/user_devices/USR_B_${deviceId}`.
  - El registro `/user_devices/USR_A_${deviceId}` **permanece activo** con el mismo token FCM si el deviceId difiere o no es purgado.
- **Comportamiento en Reinstalación:**
  Al reinstalar la app, el sistema operativo genera un nuevo token FCM. El registro anterior queda huérfano hasta que FCM devuelva `NotRegistered` en el siguiente envío masivo, momento en el cual el worker lo desactiva.
- **Veredicto:** **🔴 CRITICAL VULNERABILITY (Finding P4-01)**. Requiere método explícito de `unbindDeviceOnLogout()`.

---

## 15. FOREGROUND / BACKGROUND / TERMINATED

Matriz de Comportamiento Forense Auditada:

| Estado de la Aplicación | Android (Nativo) | iOS (Flutter) | Mecanismo de Procesamiento |
| :--- | :--- | :--- | :--- |
| **App Abierta (Foreground)** | Notificación en System Tray + In-App Dialog / Badge | `flutter_local_notifications` muestra Banner + Badge | Stream reactivo en memoria (`onNotificationReceived`) |
| **En Segundo Plano (Background)** | Android System Tray con canal asignado y sonido | APNs Banner nativo gestionado por iOS | FCM Data Payload / APNs `alert` |
| **App Terminada (Killed/Closed)** | Wakeup mediante FCM High-Priority Data Message | APNs entrega nativa en Notification Center | `onMessageOpenedApp` / `getInitialMessage` al pulsar |
| **Dispositivo Bloqueado (Locked)** | FullScreenIntent (Pedidos) o Lockscreen Notification | Alerta en pantalla de bloqueo con sonido estándar | Configuración `lockscreenVisibility: PUBLIC` |
| **Dispositivo Reiniciado (Reboot)** | Canales persistentes; Push reactivo al iniciar red | APNs reactivo tras primer desbloqueo de usuario | Sistema Operativo + Google Play Services |

- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 16. DEEP LINKS

- **Estructura del Payload:**
  - `action`: Tipo de acción (`NEW_ORDER`, `ORDER_STATUS`, `NAVIGATE_SCREEN`, `PROMOTION`).
  - `destinationRoute` / `navigationRoute`: Ruta canónica (`/orders/detail`, `/customer/dashboard`, etc.).
  - `orderId`, `tripId`, `businessId`, `couponId`, `campaignId`.
- **Ruteo en Android:**
  - `DeliveryFirebaseMessagingService` empaca los campos en el `Intent`.
  - `MainActivity.kt` intercepta el Intent en `onNewIntent` y en `onCreate` (Cold Start).
  - `NotificationRouter.resolve(intent, appRole.name)` valida los permisos del rol del usuario antes de ejecutar la transición de pantalla en Jetpack Compose Navigation, previniendo crashes o navegación a pantallas no autorizadas.
- **Ruteo en Flutter (iOS):**
  - `PlatformNotificationAdapter` captura `onMessageOpenedApp` y `getInitialMessage` y emite al controlador de deep links.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 17. IN_APP NOTIFICATIONS

- **Colección:** `/users/{uid}/notifications/{id}`.
- **Seguridad en Firestore (`firestore.rules`):**
  - Auditada y certificada en Fase 3.2. Prohíbe lectura pública; únicamente el titular autenticado (`request.auth.uid == uid`) o el Platform Admin pueden leer o modificar su buzón.
- **Campos del Documento:**
  - `id`: Determinista (`campaignId` o ID de evento).
  - `title`, `body`, `type`, `imageUrl`.
  - `isRead`: booleano.
  - `sentAt`: Timestamp del envío.
  - `readAt`: Timestamp de lectura.
  - `readSource`: `"in_app"` o `"system_tray"`.
  - `visibilityStatus`: `"VISIBLE"` o `"DISABLED"`.
- **Comportamiento en Clientes:**
  - Android: `NotificationRepository.kt` mantiene un snapshot listener reactivo que alimenta el badge de la campana y la lista desplegable.
  - Merchant Web: `NotificationCenter.tsx` ofrece bandeja de entrada con marcado de lectura y filtrado.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 18. PUSH ↔ IN_APP CONSISTENCY

- **Evaluación:** ¿Un cambio de estado en un pedido genera dos notificaciones inconexas o una sola acción coordinada?
- **Flujo Auditado:**
  1. En campañas masivas: El worker `notificationQueueWorker.ts` envía el push a FCM y escribe en `/users/{uid}/notifications/{campaignId}` **en la misma ejecución transaccional**.
  2. Al pulsar la notificación en la barra de Android (System Tray): `MainActivity.kt` invoca `NotificationRepository.trackNotificationOpened()`, actualizando automáticamente en Firestore `isRead: true`, `readSource: "system_tray"` y `readAt: serverTimestamp()`.
  3. Resultado: Al abrir la app, la notificación ya aparece marcada como leída tanto en el System Tray como en la lista In-App. No hay inconsistencias de lectura.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 19. IDEMPOTENCY

- **Mecanismo Backend:**
  - Colección `/campaign_deliveries/{deliveryKey}` donde `deliveryKey = ${campaignId}_${uid}_${deviceId}`.
  - Antes de despachar a un dispositivo, el worker verifica si el documento de delivery ya existe.
  - Si una Cloud Function se reinicia o reintenta por timeout, la clave determinista evita duplicar el envío a FCM.
- **Mecanismo Cliente (Android):**
  - `DeliveryFirebaseMessagingService` mantiene una caché de deduplicación en memoria:
    ```kotlin
    private val recentFcmEvents = ConcurrentHashMap<String, Long>()
    ```
    Si recibe dos pushes con el mismo `messageId` o `conversationId` en una ventana de 60 segundos, descarta el segundo evento silenciosamente.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 20. RETRIES

- **Envíos Masivos (Campaigns):**
  - Si el worker experimenta un fallo temporal de red con FCM, la campaña permanece en estado `PROCESSING`.
  - La Cloud Function Scheduler (`notificationQueueScheduler`) ejecuta un barrido cada 1 minuto. Si detecta una campaña con lock expirado (`leaseExpiresAt < now`), reasume el procesamiento desde el último bloque no entregado.
  - Tras 3 intentos fallidos documentados en `retryCount`, la campaña pasa a estado `FAILED` con log de error.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 21. INVALID TOKENS

- **Protocolo de Inactivación:**
  - Cuando FCM retorna errores `NotRegistered` o `InvalidRegistration`, el sistema no vuelve a intentar el envío a ese dispositivo.
  - Actualiza el documento en `/user_devices`: `isActive: false`, `tokenStatus: 'invalid'`.
  - En la siguiente consulta de la cola, ese dispositivo queda automáticamente excluido de la cláusula `.where("isActive", "==", true)`.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 22. AUDIT TRAIL

- **Rastreo Completo:**
  - `/notification_campaigns/{id}` almacena el actor (`createdByUid`, `createdByEmail`), los filtros de segmentación, los timestamps de inicio/fin y los contadores agregados (`targetCount`, `deliveredCount`, `failureCount`).
  - `/campaign_deliveries/{key}` registra la entrega individual por dispositivo con el `fcmMessageId` retornado por Google.
  - `/audit_events` registra la creación y cancelación de campañas por parte de administradores.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 23. TRACEABILITY (TRACE ID / SPAN ID)

- **Auditoría Forense:** Se buscó la propagación real de cabeceras `TraceId` y `SpanId` declaradas en el Sprint 14.4.
- **Resultado:** **🟡 PARTIAL / MOCK**.
  El modelo `CommunicationMessage.kt` tiene propiedades `traceId` y `spanId`, pero estas no se propagan en las cabeceras HTTP de FCM ni son recolectadas por Cloud Trace o Datadog. La trazabilidad real se realiza mediante `campaignId` y `deliveryKey`.

---

## 24. USER PREFERENCES

- **Auditoría Forense:**
  - Se analizó si los usuarios pueden desactivar notificaciones de promociones sin perder las de pedidos.
  - La clase `UserPreferenceCenter.kt` declara la matriz de categorías (`ORDERS`, `PROMOTIONS`, `INVOICES`, etc.), pero reside **únicamente en memoria en el cliente Android** (`userPreferencesMap = mutableMapOf<String, UserCommunicationPreferences>()`).
  - El backend `notificationQueueWorker.ts` **no consulta ninguna tabla de preferencias** antes de enviar una campaña promocional. Si un usuario es de tipo `customer`, recibe todas las campañas dirigidas a clientes.
- **Veredicto:** **🔴 SHELL / NOT ENFORCED BY BACKEND (Finding P4-04)**.

---

## 25. MARKETING VS TRANSACTIONAL

- **En Backend:**
  - `notificationQueueWorker.ts` distingue campañas promocionales de transaccionales mediante la bandera `isPromotionalCampaign`.
  - Si la campaña es promocional (`type == "PROMOTION"` o `category == "marketing"`), el worker excluye forzosamente roles de comercios y motorizados (`nonCustomerRoles`), evitando que personal operativo reciba anuncios comerciales.
- **En Clientes:**
  - Los pedidos utilizan el canal de alerta máxima con sonido continuo.
  - Las promociones utilizan el canal general sin despertar al usuario con alarma.
- **Veredicto:** **🟢 REAL / VERIFIED (A nivel de segregación de roles y canales)**.

---

## 26. WORKFLOWS (WORKFLOW COMMUNICATION ENGINE)

- **Declaración:** Sprint 14.5 documentó secuencias automáticas temporizadas (ej. recordatorio de pago a los 10 minutos y cancelación al pagar).
- **Inspección de Código:** `WorkflowCommunicationEngine.kt` existe únicamente como clase Kotlin de cliente. No hay triggers de Cloud Functions o tareas en Cloud Tasks ejecutando flujos de comunicación temporizados multicanal.
- **Veredicto:** **🔴 SHELL / LOCAL MOCK**.

---

## 27. TEMPLATES (TEMPLATE STUDIO ENGINE)

- **Inspección de Código:**
  - Existe un sistema real y certificado de plantillas de **Email Transaccional** (`functions/src/services/emailTemplateEngine.ts` con 10 plantillas HTML en `/email_templates`).
  - Para notificaciones Push, **no existe motor de plantillas dinámicas** ni editor visual (`TemplateStudioEngine`). Los textos de las notificaciones push se redactan directamente como texto plano en el formulario de Admin Web.
- **Veredicto:** **🟡 PARTIAL (Email Certified / Push Not Template-Driven)**.

---

## 28. MULTI-TENANT SECURITY

- **Aislamiento de Comercios:**
  - Los operadores de comercios (`merchant`, `store_manager`) no tienen acceso al módulo de campañas masivas de Admin Web (`firestore.rules` exige `isPlatformAdmin()`).
  - Las notificaciones operativas de pedidos emitidas por comercios están estrictamente acotadas por `tenantId` y `businessId` en las Cloud Functions transaccionales de órdenes.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 29. PROVIDER REALITY (INVENTARIO DE CANALES)

Auditoría forense canal por canal de la plataforma de comunicaciones:

| Canal | Arquitectura Declarada | Implementación Real Encontrada | Veredicto |
| :--- | :--- | :--- | :--- |
| **PUSH (Android)** | ECP → FCM | `notificationQueueWorker.ts` → `admin.messaging().sendEachForMulticast()` → `DeliveryFirebaseMessagingService.kt` | 🟢 **REAL / VERIFIED** |
| **PUSH (iOS)** | ECP → FCM → APNs | `notificationQueueWorker.ts` (bloque `apns`) → FCM → `AppDelegate.swift` / `PlatformNotificationAdapter.dart` | 🟡 **PARTIAL (Código listo, APNs p8 pendiente)** |
| **IN_APP** | ECP In-App | Worker escribe en `/users/{uid}/notifications` → Listeners en Android, Flutter y Merchant Web | 🟢 **REAL / VERIFIED** |
| **EMAIL** | ECP Email Provider | `EmailService.ts` vía SMTP nativo SSL puerto 465 contra `mail.bluesystemdelivery.com` (ADR-017) | 🟢 **REAL / VERIFIED (Backend)** |
| **WHATSAPP** | WhatsApp Business API | `WhatsAppChannelProvider` en Kotlin retorna `true, "WA_API_SENT"` hardcodeado sin cliente HTTP | 🔴 **STUB / FALSE SUCCESS** |
| **SMS** | SMS Gateway Provider | `SmsChannelProvider` en Kotlin retorna `true, "SMS_GATEWAY_DELIVERED"` hardcodeado | 🔴 **STUB / FALSE SUCCESS** |
| **TELEGRAM** | Telegram Bot Provider | `TelegramChannelProvider` en Kotlin retorna `true, "TELEGRAM_BOT_DELIVERED"` hardcodeado | 🔴 **STUB / FALSE SUCCESS** |
| **WEBHOOK** | Webhook Dispatcher | `WebhookChannelProvider` en Kotlin retorna `true, "WEBHOOK_POST_200_OK"` hardcodeado | 🔴 **STUB / FALSE SUCCESS** |

---

## 30. ANALYTICS

- **Declaración:** Sprint 14.5 documentó `CommunicationAnalyticsPlatform` con Open Rate, Click Rate, Bounce Rate y Delivery Time.
- **Realidad en Admin Web:**
  - El módulo de notificaciones calcula métricas reales de:
    - **Total Recipients (Objetivos)**: Contabilizado en Firestore.
    - **Delivered Count (Entregados)**: Sumatoria de respuestas exitosas de FCM.
    - **Failure Count (Fallidos)**: Sumatoria de tokens rechazados.
    - **Opened Count (Abiertos)**: Registrado cuando el usuario pulsa la notificación (`readSource: "system_tray"`).
  - Tasas de entrega y apertura son **reales y calculadas** a partir de documentos en Firestore.
- **Veredicto:** **🟢 REAL / VERIFIED (Métricas de Push)**.

---

## 31. FAILURE HANDLING

- **FCM No Disponible / Error de Red:** La Cloud Function aborta transaccionalmente; el Scheduler reintenta en el próximo minuto.
- **Token Inválido / Desinstalación:** Se desactiva inmediatamente en `/user_devices`.
- **Rechazo de Permisos (Android 13+):** La app no truena (crash-free); los canales se configuran normalmente y el token se registra para sincronización de datos en segundo plano.
- **Veredicto:** **🟢 REAL / VERIFIED**.

---

## 32. ANDROID E2E GATE

- **Flujo Completo:** Admin Web (`notifications.js`) → Firestore (`notification_campaigns`) → Worker (`notificationQueueWorker.ts`) → FCM Multicast → Android Device (`DeliveryFirebaseMessagingService.kt`) → System Tray → Tap Intent → `MainActivity.kt` → `NotificationRouter` → Destino.
- **Validación Forense:** **🟢 PASS**. El código está 100% implementado, con canales configurados, soporte para imágenes grandes, deep links y prevención de duplicados.

---

## 33. IOS E2E GATE

- **Flujo Completo:** Admin Web → Firestore → Worker (con payload `apns`) → FCM → APNs → iPhone (`AppDelegate.swift` / `PlatformNotificationAdapter.dart`).
- **Validación Forense:** **🟡 BLOCKED / PENDING INFRASTRUCTURE**.
  El código Flutter e iOS nativo es estructuralmente correcto y tiene paridad 1:1 con Android. Sin embargo, no puede declararse funcional E2E hasta que se complete la compilación en hardware Mac con perfil de aprovisionamiento de Apple y subida de la clave `.p8` a Firebase Console.

---

## 34. CROSS-PLATFORM E2E GATE

- **Escenario:** Usuario con 1 Android + 1 iPhone.
- **Comportamiento en Backend:** Se despacha a ambos tokens en el mismo paquete multicast.
- **Comportamiento en Buzón:** Se genera un único documento en `/users/{uid}/notifications/{campaignId}`. Al abrirlo en cualquiera de los dos dispositivos, el estado pasa a `isRead: true` y se refleja inmediatamente en el otro mediante el listener en tiempo real de Firestore.
- **Veredicto:** **🟢 ARCHITECTURALLY VERIFIED (Con reserva de entrega física APNs)**.

---

## 35. HALLAZGOS FORENSES (FINDINGS)

### FINDING ID: P4-01
- **CATEGORY:** SECURITY / PRIVACY (DATA LEAK)
- **PLATFORM:** Android & iOS (Flutter)
- **COMPONENT:** Session / Token Registry
- **FILE:** `app/src/main/java/com/example/AuthManager.kt` & `flutter_client/lib/platform/notifications/notification_adapter.dart`
- **FUNCTION:** `cerrarSesion()` / `signOut()`
- **CURRENT STATE:** Al cerrar sesión, la aplicación invoca `FirebaseAuth.signOut()`, pero no desactiva el token FCM ni actualiza `isActive: false` en `/user_devices/${uid}_${deviceId}`.
- **EXPECTED STATE:** Al cerrar sesión, debe invocarse un método `unbindDeviceOnLogout()` que actualice atómicamente en Firestore `/user_devices/${uid}_${deviceId}` con `isActive: false`, impidiendo que el dispositivo continúe recibiendo notificaciones privadas dirigidas al usuario saliente.
- **EVIDENCE:** `AuthManager.kt` líneas 325-337 no realizan ninguna operación sobre Firestore ni llaman a `FcmManager`.
- **USER IMPACT:** Un usuario que preste o venda su teléfono, o cierre sesión en un dispositivo compartido, expondrá sus notificaciones privadas y alertas de pedidos al siguiente ocupante del teléfono.
- **SECURITY IMPACT:** 🔴 **CRITICAL** (Violación de privacidad y riesgo de exposición de PII).
- **OPERATIONAL IMPACT:** Alto.
- **SEVERITY:** 🔴 **CRITICAL**
- **BLOCKER:** **SÍ (Debe remediarse antes de lanzamiento en stores)**.
- **RECOMMENDATION:** Implementar función `unbindCurrentDevice()` en `FcmManager` y `PlatformNotificationAdapter` y ejecutarla de forma obligatoria durante el flujo de logout antes de desautenticar en Firebase Auth.

---

### FINDING ID: P4-02
- **CATEGORY:** ARCHITECTURAL INTEGRITY (FALSE SUCCESS STUBS)
- **PLATFORM:** Android / ECP Core
- **COMPONENT:** Channel Providers
- **FILE:** `app/src/main/java/com/example/enterprise/communication/ChannelProviders.kt`
- **FUNCTION:** `deliverMessage()` en `WhatsAppChannelProvider`, `SmsChannelProvider`, `TelegramChannelProvider`, `WebhookChannelProvider`
- **CURRENT STATE:** Los providers retornan hardcodeado `DeliveryReport(..., true, "...")` sin integración real con APIs externas.
- **EXPECTED STATE:** No simular éxito (`isDelivered = true`) en canales no conectados. Deben arrojar excepción de no implementado o retornar `isDelivered = false, providerStatus = "CHANNEL_NOT_CONFIGURED"`.
- **EVIDENCE:** `ChannelProviders.kt` líneas 47-77.
- **USER IMPACT:** Ninguno directo para push/in-app, pero induce a error a desarrolladores y auditores al reportar canales operativos que no existen.
- **SECURITY IMPACT:** Bajo.
- **OPERATIONAL IMPACT:** Confusión de gobernanza de software.
- **SEVERITY:** 🟠 **HIGH**
- **BLOCKER:** No para Push/FCM, pero sí para cualquier certificación de omnicanalidad ECP.
- **RECOMMENDATION:** Desactivar o aislar formalmente estos stubs y documentar que los únicos canales reales de BlueSystem son FCM Push, In-App y Email Transaccional (SMTP).

---

### FINDING ID: P4-03
- **CATEGORY:** INFRASTRUCTURE / DEPLOYMENT
- **PLATFORM:** iOS
- **COMPONENT:** APNs Push Capability
- **FILE:** `flutter_client/ios/Runner/Runner.entitlements`
- **CURRENT STATE:** Falta el archivo de entitlements generado en disco y la configuración de clave APNs `.p8` en Firebase Console.
- **EXPECTED STATE:** Archivo `Runner.entitlements` con `aps-environment` y certificado/clave APNs en Firebase.
- **EVIDENCE:** Ausencia de `Runner.entitlements` en `flutter_client/ios/Runner/`.
- **USER IMPACT:** Los dispositivos iOS no reciben físicamente notificaciones push remotas en background.
- **SECURITY IMPACT:** Neutro.
- **OPERATIONAL IMPACT:** Inoperancia de push en iPhones hasta aprovisionamiento.
- **SEVERITY:** 🟠 **HIGH**
- **BLOCKER:** **SÍ para la publicación y certificación física de iOS (Dependencia Fase 2.2)**.
- **RECOMMENDATION:** Ejecutar la Fase de Controlled Provisioning en macOS para generar entitlements y subir clave APNs a Firebase.

---

### FINDING ID: P4-04
- **CATEGORY:** FUNCTIONAL / USER PREFERENCES
- **PLATFORM:** Backend Worker
- **COMPONENT:** Campaign Filtering
- **FILE:** `functions/src/services/notificationQueueWorker.ts`
- **FUNCTION:** `processCampaign()`
- **CURRENT STATE:** El worker consulta `/user_devices` directamente sin filtrar usuarios que hayan solicitado no recibir promociones.
- **EXPECTED STATE:** Campañas de marketing deben omitir usuarios que tengan `optOutPromotions: true` en sus preferencias de cuenta.
- **EVIDENCE:** `notificationQueueWorker.ts` líneas 180-300 no realizan lecturas a subcolecciones de preferencias de usuario.
- **USER IMPACT:** Clientes reciben promociones masivas sin opción efectiva de exclusión (opt-out) desde la base de datos.
- **SECURITY IMPACT:** Cumplimiento normativo (Spam / GDPR / CAN-SPAM).
- **OPERATIONAL IMPACT:** Medio.
- **SEVERITY:** 🟡 **MEDIUM**
- **BLOCKER:** No bloquea la arquitectura centralizada, pero requiere hardening antes de campañas a gran escala.
- **RECOMMENDATION:** Conectar una verificación de exclusión voluntaria en el worker para campañas con `category == "promociones"`.

---

## 36. BLOCKERS SUMMARY

| ID | Bloqueante | Nivel | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **BLK-01** | Token huérfano en Logout (P4-01) | 🔴 CRITICAL | Riesgo de filtración de datos privados al no desvincular el token en `/user_devices`. |
| **BLK-02** | Aprovisionamiento APNs en iOS (P4-03) | 🟠 HIGH | Entrega física en iPhone bloqueada por falta de credenciales de Apple Developer y build en Mac. |

---

## 37. REMEDIATION PLAN (HOJA DE RUTA FASE 4.1)

Para llevar la Fase 4 al estatus de **100% CERTIFICADA**, se propone la siguiente intervención técnica mínima y aislada:

1. **Paquete A — Desvinculación de Token en Logout (P4-01):**
   - En Android (`FcmManager.kt`): Crear `suspend fun unbindCurrentDeviceToken(context: Context, uid: String)` que actualice `/user_devices/${uid}_${deviceId}` con `{ isActive: false, unbindAt: serverTimestamp() }`.
   - En `AuthManager.kt`: Invocar la desvinculación antes de ejecutar `auth.signOut()`.
   - En Flutter (`PlatformNotificationAdapter.dart`): Añadir `Future<void> unbindDeviceToken(String uid, String deviceId)` y conectarlo en el logout de Flutter.
2. **Paquete B — Neutralización de Stubs Falsos de ECP (P4-02):**
   - Modificar `ChannelProviders.kt` para que los canales no conectados retornen explícitamente `isDelivered = false, providerStatus = "NOT_IMPLEMENTED"`, eliminando el falso éxito.
3. **Paquete C — Generación de Entitlements iOS (P4-03):**
   - Crear físicamente `flutter_client/ios/Runner/Runner.entitlements` según la especificación de `C2D29_ENTITLEMENTS_CONTRACT.md`.

---

## 38. FINAL CERTIFICATION & VERDICT

```
========================================================================================
                      FASE 4 — VEREDICTO DE AUDITORÍA FORENSE
========================================================================================
PROTOCOLO:    BSD-PRESTORE-PHASE-4-CENTRALIZED-NOTIFICATION-MULTIPLATFORM-AUDIT-001
RESULTADO:    🟠 PHASE 4 — CENTRALIZED PUSH AUDITED: CONDITIONAL / ACTIONABLE
========================================================================================
```

### Resumen del Veredicto:
- **¿Existe un único módulo centralizado en Admin Web?**  
  👉 **SÍ (CERTIFICADO 🟢)**. `notifications.js` administra centralizadamente campañas para Android y iOS sin duplicidad.
- **¿El backend despacha de forma desacoplada y confiable a FCM?**  
  👉 **SÍ (CERTIFICADO 🟢)**. `notificationQueueWorker.ts` implementa transacciones, deduplicación, chunks de 500 y limpieza de tokens inválidos.
- **¿Existe consistencia entre Push e In-App?**  
  👉 **SÍ (CERTIFICADO 🟢)**. El buzón `/users/{uid}/notifications` se actualiza sincrónicamente con el push y rastrea lecturas en tiempo real.
- **¿Se puede certificar el flujo completo de entrega en este momento?**  
  👉 **CONDICIONADO 🟠**. Debe resolverse la vulnerabilidad crítica de desvinculación de tokens en logout (Finding P4-01) y completarse el aprovisionamiento APNs de Apple para iOS (Finding P4-03).

*Reporte generado bajo estricto cumplimiento del protocolo Read-Only, Zero Code Mutation y Zero Deployment.*
