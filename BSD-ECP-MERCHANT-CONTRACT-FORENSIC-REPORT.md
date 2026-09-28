# INFORME DE AUDITORÍA FORENSE ARQUITECTÓNICA
## BLUE SYSTEM DELIVERY ENTERPRISE
### PROTOCOLO: BSD-ECP-MERCHANT-INTEGRATION-CONTRACT-AUDIT-001
### NOMBRE OFICIAL: ECP Public Interface / Merchant Integration Contract Audit

```text
Fecha de Emisión:     2026-09-08
Estado de Auditoría:  FINALIZADA / CERTIFICADA
Modo de Operación:    🔒 READ-ONLY / ZERO-MUTATION
Auditor:              Senior Developer & Auditor Forense BlueSystem v2.1/v2.2 Enterprise
Repositorio:          BlueSystem_delivery
Touchpoints:          merchant-web, panel-admin, functions, services/, app/src/main/java/com/example/enterprise/
```

---

## 1. RESUMEN EJECUTIVO FORENSE

La presente auditoría técnica forense fue ejecutada bajo el mandato estricto de determinar, mediante **evidencia física y empírica del código fuente, configuraciones de despliegue, Cloud Functions, Firestore Rules, microservicios, tests y documentación oficial**:
1. Cómo está expuesto realmente el ecosistema transversal de comunicaciones (**Enterprise Communication Platform - ECP v3.0 / v3.1**).
2. Dónde vive físicamente el Core de ECP.
3. Si existe un contrato público, SDK o API para el consumo desde el portal web de comercios (**Merchant Web**).
4. Por qué el módulo `CommunicationModule.tsx` de `merchant-web` permanece desconectado indicando *"Plataforma no conectada / Phase 8"*.
5. Cuál es el estado de la integración del canal de *"Ayuda & Soporte"*.
6. La viabilidad técnica y de seguridad para una eventual exposición de ECP hacia comercios.

### Hallazgo Central
**NO EXISTE UN CONTRATO PÚBLICO NI INTERFAZ DE INTEGRACIÓN LEGÍTIMA DE ECP PARA COMERCIOS.**

La investigación forense demostró una profunda fragmentación y divergencia arquitectónica en el ecosistema de comunicaciones:
1. **ECP v3.0 / v3.1 (Sprint 14.4 y 14.5)** fue implementado físicamente como un **motor nativo Android en Kotlin** (`com.example.enterprise.communication.*`), residiendo exclusivamente dentro de la aplicación móvil APK del cliente y repartidor.
2. **El motor de despacho masivo backend de ECP** (`functions/src/services/notificationQueueWorker.ts`) es un procesador asíncrono sobre Firestore (`/notification_campaigns`), pero carece de callable de creación para clientes externos o comercios; opera exclusivamente mediante escrituras directas de administradores de plataforma.
3. **El microservicio Cloud Run** (`services/notification-service/`) es una carcasa experimental (*architectural shell*) con proveedores simulados (*stubs* que retornan `{ success: true }` sin despachar SMS, WhatsApp ni Email), no desplegado ni referenciado por ningún frontend.
4. **Las reglas de seguridad de Firestore (`firestore.rules`)** bloquean terminantemente a cualquier usuario con rol de comercio (`MERCHANT_OWNER`, `OWNER`, `STORE_MANAGER`) en la colección `/notification_campaigns`, exigiendo estrictamente privilegios de `isPlatformAdmin()`.
5. **El callable administrativo `sendPushNotification`** rechaza a nivel de backend cualquier invocación originada por roles de comercio (`allowedRoles` acotado a administradores, supervisores y auditores).
6. **En `merchant-web`**, `CommunicationModule.tsx` es un componente estático de 26 líneas con un aviso informativo y cero llamadas de red, mientras que el botón *"Ayuda & Soporte"* en `MainLayout.tsx` es un elemento HTML interactivo huérfano de `onClick`.

---

## 2. MAPA FÍSICO DE LA ARQUITECTURA ECP

El ecosistema analizado presenta cuatro realidades desacopladas e inconexas:

```mermaid
graph TD
    subgraph "1. Android Client (Kotlin Frozen Core)"
        A1[CommunicationOrchestrator.kt] --> A2[CommunicationTemplateEngine.kt]
        A1 --> A3[CommunicationQueueEngine.kt]
        A1 --> A4[WorkflowCommunicationEngine.kt]
        A1 --> A5[CommunicationAnalyticsPlatform.kt]
    end

    subgraph "2. Firebase Functions Backend (Production Core)"
        B1[notification_campaigns Firestore] -->|onCreate / onUpdate| B2[notificationQueue.ts Trigger]
        B3[notificationQueue.ts Scheduler 1min] --> B4[notificationQueueWorker.ts 725 LOC]
        B2 --> B4
        B4 -->|FCM Multicast| B5[Firebase Messaging Gateway]
        B4 -->|Idempotent Delivery Record| B6[campaign_deliveries]
        B4 -->|User Inbox Write| B7[users/{uid}/notifications]
    end

    subgraph "3. Cloud Run Microservices (Sprint 17.2 Shell)"
        C1[notification-service :8080] --> C2[routes/v1/notifications.ts]
        C2 --> C3[fcm.ts - Real]
        C2 --> C4[whatsapp.ts - Stub]
        C2 --> C5[sms.ts - Stub]
        C2 --> C6[email.ts - Stub]
    end

    subgraph "4. Web Frontends"
        D1[panel-admin / notifications.js] -->|Direct SDK Write| B1
        D2[merchant-web / CommunicationModule.tsx] -.->|DESCONECTADO / Sin Contrato| X[Placeholder Phase 8]
    end

    classDef real fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef stub fill:#7f1d1d,stroke:#ef4444,stroke-width:2px,color:#fff;
    classDef placeholder fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#fff;
    
    class A1,A2,A3,A4,A5,B1,B2,B3,B4,B5,B6,B7,C3,D1 real;
    class C4,C5,C6 stub;
    class D2,X placeholder;
```

---

## 3. INVENTARIO FÍSICO DE COMPONENTES ECP

### 3.1. Componentes Reales del Backend (Producción)
1. **`functions/src/services/notificationQueueWorker.ts` (725 líneas):**
   - Motor maestro de procesamiento de campañas por lotes.
   - Idempotencia granular garantizada mediante claves unívocas en `/campaign_deliveries/{campaignId}_{uid}_{deviceId}`.
   - Bloqueo de leases distribuidos con TTL de 5 minutos (`leaseExpiration`).
   - Gestión de reintentos exponencial con estados: `QUEUED`, `PROCESSING`, `SENT`, `PARTIALLY_SENT`, `FAILED`.
   - Escritura atómica a buzones de usuarios en `/users/{uid}/notifications/{campaignId}`.
2. **`functions/src/triggers/notificationQueue.ts`:**
   - Triggers `onNotificationCampaignCreated` y `onNotificationCampaignUpdated` que invocan inmediatamente a `notificationQueueWorker.processCampaign()`.
3. **`functions/src/schedulers/notificationQueue.ts`:**
   - Cloud Scheduler con frecuencia de 1 minuto (`every 1 minutes`) que sondea campañas pendientes o atascadas.
4. **`functions/src/callables/notifications.ts` (`sendPushNotification`, 246 líneas):**
   - Callable HTTPS transaccional y broadcast directo.
   - Restricción estricta de roles:
     ```typescript
     allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN", "supervisor", "SUPERVISOR", "support", "SUPPORT", "auditor", "AUDITOR", "call_center", "marketing"]
     ```
     *(Roles de comercio excluidos al 100%)*.
5. **`functions/src/callables/admin.ts`:**
   - `adminDeleteCampaign`: Baja lógica con borrado en cascada sobre buzones de usuario.
   - `adminDisableNotificationForUser`: Ocultamiento granular por usuario.
   - `diagnoseFcmSystem` y `sendFcmDiagnostic`: Telemetría operativa.

### 3.2. Componentes Nativos Android (Kotlin Frozen Core)
Físicamente ubicados en `app/src/main/java/com/example/enterprise/communication/`:
1. `CommunicationOrchestrator.kt`: Evaluador de reglas, prioridades y despacho multicanal en cliente.
2. `CommunicationTemplateEngine.kt`: Interpolador local de cadenas `{orderId}`, `{total}`.
3. `CommunicationQueueEngine.kt`: Encolamiento local offline en SQLite/Room.
4. `advanced/WorkflowCommunicationEngine.kt`: Máquina de estados para secuencias de mensajes temporizados.
5. `advanced/CommunicationAnalyticsPlatform.kt`: Métricas de agregación local de lectura y apertura.

### 3.3. Componentes Microservicio Cloud Run (`services/notification-service/`)
- Express 4.19 en TypeScript escuchando en puerto 8080.
- Endpoint `/v1/notifications/send`.
- `fcm.ts`: Despacho real mediante `admin.messaging().sendEachForMulticast()`.
- `whatsapp.ts`: **STUB** (`return { success: true, messageId: 'wa_mock_...' }`).
- `sms.ts`: **STUB** (`return { success: true, messageId: 'sms_mock_...' }`).
- `email.ts`: **STUB** (`return { success: true, messageId: 'email_mock_...' }`).

---

## 4. AUDITORÍA DETALLADA DE SEGURIDAD Y REGLAS FIRESTORE

### 4.1. Barrera de Seguridad en `/notification_campaigns`
En `firestore.rules`, líneas 1267 a 1277:
```javascript
match /notification_campaigns/{campaignId} {
  allow read: if isAuthenticated() && isPlatformAdmin();
  allow create, update: if isAuthenticated() && isPlatformAdmin();
  allow delete: if isSuperAdmin();

  match /versions/{versionId} {
    allow read: if isAuthenticated() && isPlatformAdmin();
    allow create, update: if isAuthenticated() && isPlatformAdmin();
    allow delete: if isSuperAdmin();
  }
}
```
Definición de `isPlatformAdmin()` (líneas 81-91):
```javascript
function isPlatformAdmin() {
  return isAuthenticated() && (
    getRole() in ["SUPER_ADMIN", "ADMIN", "AUDITOR", "SUPPORT", "SUPERVISOR", "OPERATOR", "OPERATIONS", ...] ||
    request.auth.token.get("eiamRole", "") in ["SUPER_ADMIN", "ADMIN", ...] ||
    request.auth.token.get("admin", false) == true ||
    request.auth.token.get("isSuperAdmin", false) == true
  );
}
```
**Veredicto de Seguridad:** Cualquier intento por parte de un comercio (`role: "MERCHANT_OWNER"`, `"STORE_MANAGER"`) de interactuar directamente con `/notification_campaigns` resulta en un rechazo inmediato por Firestore (`PERMISSION_DENIED`).

### 4.2. Vector de Riesgo por Ausencia de Aislamiento Multitenant
La colección `/notification_campaigns` **NO cuenta con particionamiento por `businessId` ni aislamiento de tenant**:
- Los documentos contienen campañas globales (`targetType: 'all'`, `'customers'`, etc.).
- Las entregas en `/campaign_deliveries` indexan por `campaignId_uid_deviceId`.
- Si se permitiera lectura a los comercios sobre esta colección, se generaría una **fuga masiva de datos (Data Leakage)**: cualquier comercio podría auditar las promociones, cupones, clientes destinatarios, volúmenes de venta y estrategias comerciales de todos los restaurantes competidores de la plataforma.

---

## 5. AUDITORÍA DEL CONSUMO EN PANEL-ADMIN VS MERCHANT-WEB

| Dimensión | Panel Admin (`panel-admin/public/js/dashboard/notifications.js`) | Merchant Web (`merchant-web/src/app/CommunicationModule.tsx`) |
| :--- | :--- | :--- |
| **Mecanismo de Creación** | Escritura directa `db.collection('notification_campaigns').doc().set(...)` | NINGUNO (No tiene código ejecutable) |
| **Autenticación / Roles** | Token de Administrador con Custom Claim `admin: true` | Token de Comercio (`MERCHANT_OWNER`) |
| **Canales Operativos** | FCM Push, Notificación In-App, Popup Dialog (SMS/Email deshabilitados en UI) | Ninguno |
| **Pruebas en Vivo (Dry Run)** | Escribe en `/notification_campaigns` y buzón `/users/{uid}/notifications` | Inexistente |
| **Diagnóstico de Red** | Consume callables `diagnoseFcmSystem` y `sendFcmDiagnostic` | Inexistente |
| **Estado del Módulo** | 🟢 **100% OPERATIVO EN PRODUCCIÓN** | 🔴 **0% CONECTADO / PLACEHOLDER** |

---

## 6. AUDITORÍA DEL MÓDULO "AYUDA & SOPORTE"

### 6.1. Infraestructura Existente en la Plataforma
1. **Colección `/support_tickets/{ticketId}`:**
   - Posee un trigger backend activo: `functions/src/triggers/supportTickets.ts` (`onTicketCreatedSendNotification`, `onTicketMessageSendNotification`).
   - Envía notificaciones Push automáticas al cliente cuando el Administrador responde, y notificaciones de alerta a soporte cuando se abre un ticket.
   - Cuenta con soporte completo en el Panel Administrativo: `panel-admin/public/js/dashboard/supportCenter.js` (30,107 bytes, gestión en tiempo real de tickets, chat bidireccional, actualización de estados).
2. **Colección `/system_config/support`:**
   - Contiene la configuración dinámica oficial de soporte: teléfono de WhatsApp, correo de soporte, horarios de atención y mensajes de disponibilidad.
3. **Reglas de Seguridad (`firestore.rules` líneas 1058-1093):**
   - **Permite expresamente la creación y lectura por parte de cualquier usuario autenticado** siempre que coincida con el creador:
     ```javascript
     allow read: if isAuthenticated() && (resource.data.customerId == currentUid() || resource.data.userId == currentUid() || isPlatformAdmin());
     allow create: if isAuthenticated() && (request.resource.data.customerId == currentUid() || request.resource.data.userId == currentUid() || isPlatformAdmin());
     ```
   - **Permite la lectura pública** de `/system_config/support` (`allow read: if true;`).

### 6.2. Estado en Merchant Web
- En `merchant-web/src/layouts/MainLayout.tsx`, línea 98:
  ```tsx
  <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition w-full">
    <HelpCircle className="w-4 h-4 text-slate-500" />
    <span>Ayuda & Soporte</span>
  </button>
  ```
- **El botón carece de `onClick` o navegación.** Es puramente visual.
- A diferencia de ECP (que carece de backend para comercios), **Ayuda & Soporte TIENE un backend y reglas de seguridad 100% compatibles**, requiriendo únicamente una interfaz de usuario en `merchant-web` que consulte `/system_config/support` y permita abrir tickets en `/support_tickets`.

---

## 7. RESPUESTAS TAXATIVAS A LAS 35 PREGUNTAS DEL PROTOCOLO

#### 1. ¿Cómo está expuesto REALMENTE ECP v3.0 / v3.1?
Está expuesto de forma bifurcada:
- Como una librería interna en Kotlin dentro de la aplicación móvil Android (`com.example.enterprise.communication.*`).
- Como un motor backend de Cloud Functions que procesa documentos creados en la colección `/notification_campaigns` de Firestore. No existe una API REST pública ni un endpoint HTTP seguro expuesto para consumo de aplicaciones web clientes.

#### 2. ¿Dónde vive físicamente ECP Core?
- **El motor de entrega y cola real:** En `functions/src/services/notificationQueueWorker.ts` (725 líneas) y sus triggers asociados (`functions/src/triggers/notificationQueue.ts`).
- **El motor de plantillas y orquestación local:** En `app/src/main/java/com/example/enterprise/communication/` (código fuente Android).

#### 3. ¿Qué componentes forman realmente ECP Core?
`notificationQueueWorker.ts`, `notificationQueue.ts` (trigger y scheduler), `notifications.ts` (callable), `supportTickets.ts` (trigger), `emailService.ts` (transporte SMTP transaccional), y los componentes Android `CommunicationOrchestrator.kt`, `CommunicationQueueEngine.kt` y `CommunicationTemplateEngine.kt`.

#### 4. ¿Qué componentes declarados en documentación NO existen en el código?
- No existe el `EnterpriseEventBus` distribuido accesible por frontend web mencionado en `SPRINT_14.4_TECHNICAL_REPORT.md`.
- No existe el `TemplateStudioEngine` ni el `WorkflowCommunicationEngine` como servicios cloud o web (solo existen como clases Kotlin locales en Android).
- No existe pasarela activa de WhatsApp o SMS en el backend (son funciones simuladas que retornan true en `services/notification-service`).

#### 5. ¿Existe un SDK cliente TypeScript/JS para ECP?
**NO.** No existe ningún SDK, paquete, cliente ni wrapper TypeScript/JS para invocar ECP desde aplicaciones cliente web.

#### 6. ¿Existe un package npm interno o externo para ECP?
**NO.** El directorio `packages/` no contiene ningún paquete de comunicaciones. El microservicio en `services/notification-service` es un proyecto standalone privado no empaquetado como biblioteca.

#### 7. ¿Existe un EventBus transversal accesible desde navegador?
**NO.** El único EventBus mencionado en el sistema es interno de memoria en Android o interfaces TypeScript no conectadas a WebSockets ni Server-Sent Events en navegadores.

#### 8. ¿Qué interfaces públicas de ECP existen realmente?
Ninguna. ECP carece por completo de interfaces públicas o de cara al cliente web.

#### 9. ¿Qué interfaces son exclusivamente internas de backend?
- `notificationQueueWorker.processCampaign()`
- `onNotificationCampaignCreated` / `onNotificationCampaignUpdated`
- `notificationQueueScheduler`
- Microservicio Express `/v1/notifications/send` (no expuesto a Internet público).

#### 10. ¿Qué interfaces son exclusivamente de Android/Kotlin?
Todas las clases del paquete `com.example.enterprise.communication.*`: `CommunicationOrchestrator`, `CommunicationTemplateEngine`, `CommunicationQueueEngine`, `WorkflowCommunicationEngine`, `CommunicationAnalyticsPlatform`.

#### 11. ¿Qué interfaces son exclusivamente de Admin Panel?
- El módulo `notificationsModule` en `panel-admin/public/js/dashboard/notifications.js`.
- Las funciones callables con validación de roles de plataforma: `sendPushNotification`, `adminDeleteCampaign`, `adminDisableNotificationForUser`, `diagnoseFcmSystem`, `sendFcmDiagnostic`.

#### 12. ¿Qué contratos de mensajería expone `services/notification-service`?
Expone la ruta POST `/v1/notifications/send` que espera un payload con `{ target, channel, templateId, data }`. Sin embargo, es un servicio Cloud Run desconectado de los frontends.

#### 13. ¿Qué canales de comunicación están realmente implementados y cuáles son stubs?
- **FCM Push:** 🟢 REAL (implementado vía `firebase-admin` en Functions y microservicio).
- **In-App Notification Center:** 🟢 REAL (escritura directa a subcolecciones de usuarios).
- **Email Transaccional Corporativo:** 🟢 REAL (implementado en Cloud Functions vía SMTP SSL/TLS contra `mail.bluesystemdelivery.com` en `emailService.ts`).
- **WhatsApp:** 🔴 STUB (retorna `{ success: true }` simulado sin integración con API oficial).
- **SMS:** 🔴 STUB (retorna `{ success: true }` simulado sin proveedor Twilio/Infobip).
- **Telegram:** 🔴 INEXISTENTE (solo mencionado en documentación).
- **Webhooks Salientes:** 🔴 INEXISTENTE (solo interfaces TypeScript sin ejecutor).

#### 14. ¿Cómo funciona la cola de procesamiento de campañas (`notificationQueueWorker.ts`)?
Sondea o recibe eventos de documentos en `/notification_campaigns` con estado `QUEUED`. Adquiere un lease temporal atómico, fragmenta los destinatarios en lotes, envía mensajes mediante `admin.messaging().sendEachForMulticast()`, registra las entregas en `/campaign_deliveries` con una clave determinística `campaignId_uid_deviceId` para evitar duplicados, escribe la notificación en el buzón personal del usuario y actualiza los contadores de analítica en el documento maestro de la campaña.

#### 15. ¿Qué colecciones de Firestore constituyen el modelo de datos de ECP?
- `/notification_campaigns` (campañas maestras)
- `/notification_campaigns/{id}/versions` (versionado de campañas)
- `/campaign_deliveries` (registro idempotente de entregas por dispositivo)
- `/user_devices` (tokens FCM de dispositivos por usuario)
- `/users/{uid}/notifications` (buzón in-app de usuario)
- `/email_events` (auditoría de correos enviados)
- `/email_templates` (plantillas de correo)

#### 16. ¿Qué reglas de seguridad (`firestore.rules`) aplican a esas colecciones?
`/notification_campaigns`, `/email_events` y `/email_templates` exigen de forma exclusiva `isPlatformAdmin()`. `/campaign_deliveries` no permite escritura a clientes. `/users/{uid}/notifications` permite lectura solo al titular (`currentUid() == uid`) o a `isPlatformAdmin()`.

#### 17. ¿Tiene el rol `MERCHANT_OWNER` o similar permisos de lectura o escritura sobre colecciones de campañas?
**NO.** Ningún rol de comercio tiene permisos de lectura ni de escritura sobre `/notification_campaigns` en las reglas de Firestore actuales.

#### 18. ¿Qué callables de Firebase Functions existen para ECP y qué roles autorizan?
- `sendPushNotification`: Solo `admin`, `super_admin`, `supervisor`, `support`, `auditor`, `call_center`, `marketing`.
- `adminDeleteCampaign`: Solo `admin`, `super_admin`.
- `adminDisableNotificationForUser`: Solo `admin`, `super_admin`.
- `diagnoseFcmSystem`: Solo `admin`, `super_admin`.
- `sendFcmDiagnostic`: Solo `admin`, `super_admin`.
*Ninguno autoriza roles de comercio.*

#### 19. ¿Existe algún callable que permita a un comercio crear o disparar una campaña o notificación?
**NO.** No existe ningún callable diseñado para que un comercio emita campañas o notificaciones directas.

#### 20. ¿Cómo consume `panel-admin` el sistema de notificaciones/campañas?
Escribe directamente en Firestore mediante el SDK web usando credenciales administrativas autenticadas, creando documentos en `/notification_campaigns` con `status: "QUEUED"` o `"SCHEDULED"`. El trigger backend detecta la inserción y ejecuta `notificationQueueWorker.ts`.

#### 21. ¿Existe paridad o disparidad entre el consumo de Admin y lo que necesitaría Merchant Web?
**Existe una DISPARIDAD TOTAL:**
- Admin opera como un operador global de la plataforma con acceso sin restricciones a toda la base de usuarios y a todas las colecciones.
- Merchant Web requiere aislamiento multitenant estricto (`tenantId` / `businessId`), segmentación acotada exclusivamente a los clientes que hayan ordenado en su negocio, cuotas de envío para prevenir spam y facturación por mensaje.

#### 22. ¿Qué es físicamente `CommunicationModule.tsx` en `merchant-web`?
Es un componente React JSX estático de 26 líneas que muestra un contenedor estilizado con fondo ámbar advirtiendo que la plataforma de comunicaciones no está conectada y está planificada para "Phase 8".

#### 23. ¿Qué promete `SPRINT_16_MERCHANT_WEB_PORTAL.md` respecto a ECP?
Promete en su sección 3, ítem 11: *"Comunicación (ECP Integration): Plantillas y campañas por WhatsApp, SMS, Push y Email"*, reutilizando el motor congelado del Sprint 14.4 / 14.5.

#### 24. ¿Qué promete `ENTERPRISE_COMMUNICATION_PLATFORM.md` y `ECP_ADVANCED_EXPANSION_GUIDE.md`?
Prometen una plataforma transversal omnicanal con 7 canales operativos, diseñador visual de plantillas dinámicas (`TemplateStudioEngine`), flujos automáticos temporizados (`WorkflowCommunicationEngine`) y analítica avanzada multicanal con latencias menores a 100 ms.

#### 25. ¿Por qué `CommunicationModule.tsx` dice "Plataforma no conectada / Phase 8"?
Porque durante el desarrollo de Merchant Web (Sprint 16), el equipo reconoció que ECP no poseía una API multi-tenant para comercios y dejó un marcador visual (*stub placeholder*) postergando la integración para una fase no implementada denominada "Phase 8".

#### 26. ¿Qué es "Phase 8" y existe en el roadmap oficial o es un placeholder no vinculado?
Es una etiqueta descriptiva informal introducida por el desarrollador del componente. No existe ningún documento de ingeniería formal, ADR, ni especificación en el repositorio que defina el alcance, arquitectura o entregables de una "Phase 8".

#### 27. ¿Qué relación existe entre ECP y el módulo de Ayuda & Soporte?
Son subsistemas conceptualmente separados pero que convergen en notificaciones:
- Ayuda & Soporte maneja incidencias y atención al usuario vía tickets (`/support_tickets`). Utiliza la mensajería Push de ECP como canal de notificación cuando un administrador o cliente responde un mensaje.
- ECP es el motor genérico de mensajería masiva y transaccional.

#### 28. ¿Qué colecciones o contratos existen para Ayuda & Soporte (`support_tickets`, `system_config/support`)?
- `/support_tickets`: Modelo de datos completo con mensajes anidados en `/support_tickets/{ticketId}/messages/{messageId}`.
- `/system_config/support`: Configuración global con números de WhatsApp, correos y horarios de atención.
- Triggers en `functions/src/triggers/supportTickets.ts`.

#### 29. ¿Tiene Merchant Web acceso a los contratos de Ayuda & Soporte?
**SÍ, a nivel de Firestore Rules:** Las reglas permiten explícitamente a cualquier usuario autenticado consultar la configuración en `/system_config/support` y crear/consultar tickets en `/support_tickets` siempre que su UID coincida con `customerId` o `userId`.

#### 30. ¿Por qué el botón "Ayuda & Soporte" en `MainLayout.tsx` de Merchant Web es un stub sin handler?
Porque en la implementación inicial de la barra lateral de navegación de `merchant-web`, el botón fue maquetado únicamente con estilos TailwindCSS e ícono Lucide (`<HelpCircle />`), omitiendo intencionalmente la vinculación con un modal o una ruta de navegación.

#### 31. ¿Existe riesgo de seguridad (tenant isolation / data leakage) si un comercio accediera a las colecciones actuales de ECP?
**SÍ, RIESGO CRÍTICO (P0):** Si se abriera acceso a `/notification_campaigns` sin un rediseño multitenant, un comercio podría leer las campañas de la competencia, acceder a tokens de dispositivos de otros negocios y enviar mensajes no autorizados a toda la base de clientes de la plataforma.

#### 32. ¿Qué requeriría técnicamente la exposición de un contrato legítimo de ECP para Merchant Web?
Requeriría una fase completa de ingeniería que diseñe:
1. Un callable seguro (ej. `merchantCreateCampaign`) que valide la sesión del comercio vía Custom Claims (`businessId`).
2. Una colección aislada multitenant (ej. `/businesses/{businessId}/campaigns`).
3. Validación estricta de destinatarios (solo clientes que hayan comprado previamente en dicho comercio).
4. Restricción y sanitización de plantillas para evitar abusos o phishing.
5. Políticas de rate limiting y presupuesto por comercio.

#### 33. ¿Qué requeriría técnicamente la activación del módulo de Ayuda & Soporte en Merchant Web?
Requeriría una intervención simple y de bajo riesgo:
1. Crear un modal o pantalla `SupportModal.tsx` o `SupportCenterModule.tsx` en `merchant-web`.
2. Conectar el listener a `/system_config/support` para mostrar WhatsApp oficial y correo de soporte.
3. Permitir redactar un ticket que escriba en `/support_tickets` con `userId = auth.currentUser.uid`.
4. Asignar el handler `onClick` en el botón de `MainLayout.tsx`.

#### 34. ¿Viola la integración directa con ECP alguna regla de arquitectura o congelamiento (ADR-003, ADR-013, ADR-016, ADR-017, ADR-018, ADR-019, ADR-020)?
**SÍ.** Violaría:
- **ADR-003:** Por riesgo de consultas descontroladas y listeners masivos sobre colecciones globales.
- **Reglas del Proyecto (Workspace Rules):** Violación de aislamiento multitenant e introducción de cambios empíricos en módulos congelados sin evidencia objetiva ni diseño previo.
- **ADR-017 (Transactional Email Core Freeze):** Prohíbe mutar el despachador de correos y plantillas corporativas.

#### 35. ¿Cuál es el veredicto arquitectónico final: GO, CONDITIONAL GO o NO-GO?
**🔴 NO-GO para la integración directa e inmediata de `CommunicationModule.tsx` con ECP.**
Cualquier intento de conectar `merchant-web` al estado actual de ECP sin una Cloud Function intermediaria y particionamiento de datos constituye una vulnerabilidad crítica de seguridad y una violación de gobernanza.

---

## 8. DICTAMEN ARQUITECTÓNICO FINAL

```text
================================================================================
                    VEREDICTO ARQUITECTÓNICO OFICIAL
================================================================================

PROTOCOLO:  BSD-ECP-MERCHANT-INTEGRATION-CONTRACT-AUDIT-001
FECHA:      2026-09-08
DICTAMEN:   🔴 NO-GO (PARA INTEGRACIÓN DIRECTA DE COMUNICACIÓN ECP)
            🟢 GO CONDICIONAL (EXCLUSIVAMENTE PARA AYUDA & SOPORTE)

FUNDAMENTACIÓN TÉCNICA:
1. ECP v3.0 / v3.1 no posee un contrato público ni callable multi-tenant para
   comercios. Forzar una conexión en este momento provocaría fallos inmediatos
   de PERMISSION_DENIED por Firestore Rules o una vulneración de tenant isolation.
2. El módulo "CommunicationModule.tsx" debe permanecer en su estado actual
   declarativo hasta que se diseñe e implemente una Cloud Function autoritativa
   con validación de Tenant y aislamiento estricto de audiencias.
3. El módulo "Ayuda & Soporte" SÍ posee un contrato compatible en Firestore Rules
   y backend, pudiendo activarse quirúrgicamente en una actividad separada sin
   alterar ningún motor congelado.
================================================================================
```

---

## 9. CERTIFICACIÓN DE CERO MUTACIONES (ZERO-MUTATION CERTIFICATION)

Se certifica formalmente que durante la ejecución de la auditoría `BSD-ECP-MERCHANT-INTEGRATION-CONTRACT-AUDIT-001`:
- 🔒 **Zero Code Mutation:** Ningún archivo del código fuente de producción (`merchant-web`, `panel-admin`, `functions`, `services`, `app`) fue editado ni alterado.
- 🔒 **Zero Firestore Mutation:** Ningún documento, colección o índice de Firestore fue creado, modificado o eliminado.
- 🔒 **Zero Rules Mutation:** Los archivos `firestore.rules` y `storage.rules` permanecen intactos.
- 🔒 **Zero Dependency Mutation:** No se instalaron ni actualizaron paquetes en `package.json`.
- 🔒 **Zero External Dispatch:** No se emitieron notificaciones push, correos electrónicos, SMS ni mensajes de prueba a ningún destinatario real o sintético.

*Fin del Informe Forense.*
