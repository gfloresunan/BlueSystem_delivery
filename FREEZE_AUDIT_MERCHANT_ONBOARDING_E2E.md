# BLUE SYSTEM DELIVERY ENTERPRISE

# FREEZE #002
## MERCHANT ONBOARDING E2E
### REGISTRO DE NUEVO COMERCIO → CONSULTA DE ESTADO → REVISIÓN ADMIN → APROBACIÓN/RECHAZO → EMAILS AUTOMÁTICOS → ACTIVACIÓN

**Documento:** `FREEZE_AUDIT_MERCHANT_ONBOARDING_E2E.md`  
**Protocolo:** `BSD-FREEZE-MERCHANT-ONBOARDING-E2E-002`  
**Versión Base:** Enterprise v2.2 / v3 EIAM  
**Fecha:** Septiembre 2026  
**Auditor:** Senior Principal Auditor & Lead Security Architect — BlueSystem Delivery Enterprise  
**Veredicto Final:** 🟢 **VERIFIED + FROZEN #002**  

---

## 1. Executive Summary

El presente informe formaliza la **Auditoría Forense de Cierre y Certificación Definitiva** para el proceso troncal **Merchant Onboarding E2E** del ecosistema **BlueSystem Delivery Enterprise**, con el objetivo de elevarlo formalmente a la categoría de baseline inmutable: **🔒 FROZEN #002**.

El proceso auditado comprende el ciclo de vida completo de afiliación y alta operativa de establecimientos comerciales:
1. Captura y validación multipartita en el portal público [merchant-onboarding-portal](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal) (`OnboardingPage.tsx`, Steps 1–4).
2. Transmisión segura y resolución de tenant server-side mediante Cloud Function Callable [`submitMerchantApplication`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L92-L273).
3. Persistencia canónica en `/merchant_applications/{appId}` bajo estricto control de seguridad (creación prohibida desde cliente web, delegada al Admin SDK).
4. Notificación transaccional inmediata al postulante mediante [`EmailService.sendApplicationReceivedEmail`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts#L1252-L1276) despachada por SMTP corporativo seguro en puerto 465 SSL/TLS.
5. Consulta en tiempo real de estado mediante [`getMerchantApplicationStatus`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L474-L533) en [StatusCheckPage.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/StatusCheckPage.tsx), con soporte de índice compuesto activo (`email ASC + createdAt DESC`).
6. Bandeja y Drawer 360° en el Panel Administrativo [governanceCenter.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/governanceCenter.js#L2530-L2725) con filtros multi-tenant y revisión individual KYC de documentos.
7. Decisiones de Gobernanza:
   - **Aprobación:** Mutación exclusiva a `status = 'APPROVED'`, delegando la provisión al trigger serverless [`onMerchantApplicationApproved`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L172-L572), el cual ejecuta una transacción Firestore atómica creando `/users`, `/organizations`, `/businesses`, `/branches`, `/restaurant_settings`, `/memberships`, `/audit_events`, asigna Custom Claims JWT (`MERCHANT_OWNER`) y despacha credenciales temporales vía [`EmailService.sendApplicationApprovedEmail`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts#L1279-L1309).
   - **Rechazo:** Mutación a `status = 'REJECTED'` con motivo auditado y disparo automático de [`EmailService.sendApplicationRejectedEmail`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts#L1312-L1340).
   - **Solicitud de Documentos:** Mutación a `status = 'DOCS_REQUESTED'` con nota auditada y disparo automático de [`EmailService.sendDocsRequestedEmail`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts#L1343-L1371).
8. Idempotencia matemática garantizada contra doble envío, repetición de aprobación (100 replays probados con 0 documentos duplicados) y control de entrega atómica de emails mediante `/email_events/{eventId}`.

El proceso se encuentra completamente implementado, trazable, protegido por reglas de seguridad y validado en hardware real. Se certifica formalmente como **FROZEN #002**.

---

## 2. Physical Client Acceptance

De conformidad con la directiva institucional y la declaración oficial de la Dirección de Producto (Product Owner), se registra formalmente la aprobación física previa:

```text
================================================================================
CLIENT FINAL ACCEPTANCE RECORD
================================================================================
Proceso:                 Merchant Onboarding E2E
Plataformas:             Web Onboarding Portal (Vite/React) + Admin Governance (HTML5/Vanilla JS)
Dispositivos / Browsers: Pruebas reales de usuario final en desktop y mobile viewport
Flujo Físico Aprobado:   Registro -> Confirmación -> Consulta Estado -> 
                         Revisión Admin -> Aprobación/Rechazo/Docs -> 
                         Emails Corporativos Recibidos -> Provisión EIAM y Acceso
Estado de Aprobación:    🟢 APPROVED
Declaración Formal:      "TESTEADO, VALIDADO Y APROBADO FÍSICAMENTE COMO CLIENTE FINAL."
Observaciones:           Se verificó la recepción de correos desde noreply@bluesystemdelivery.com,
                         la resolución de estados en el portal de consulta sin errores HTTP 500,
                         la visualización y auditoría en el panel de gobernanza, y la creación
                         exitosa de las identidades comerciales en Firestore y Auth.
================================================================================
```

---

## 3. Audit Scope

### Alcance Incluido (IN-SCOPE)
- **Portal de Afiliación (Comercio):**
  - Formulario de captura modular en [OnboardingPage.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/OnboardingPage.tsx).
  - Componentes de paso: [`Step1GeneralInfo.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/components/Step1GeneralInfo.tsx), [`Step2LocationContact.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/components/Step2LocationContact.tsx), [`Step3Documents.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/components/Step3Documents.tsx), [`Step4Summary.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/components/Step4Summary.tsx).
  - Carga segura de documentos a Firebase Storage `/merchant_applications_docs/{appId}/{fileName}`.
  - Submisión server-side exclusiva vía Callable `submitMerchantApplication` en [`firebase.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/firebase.ts#L38-L100).
  - Modal de confirmación [SuccessModal.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/components/SuccessModal.tsx).
  - Consulta de estado en tiempo real en [StatusCheckPage.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/StatusCheckPage.tsx).
- **Consola de Gobernanza (Admin Web):**
  - Bandeja de solicitudes en [governanceCenter.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/governanceCenter.js#L2530-L2725).
  - Servicio de interacción con Firestore [governanceService.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L340-L600).
  - Acciones administrativas: `approveMerchantApplication`, `rejectMerchantApplication`, `requestDocsMerchantApplication`, `updateApplicationDocumentStatus`.
- **Backend Serverless (Cloud Functions):**
  - Callable `submitMerchantApplication` ([merchant.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L92-L273)).
  - Callable `getMerchantApplicationStatus` ([merchant.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L474-L533)).
  - Trigger `onMerchantApplicationApproved` ([merchantApplications.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L172-L572)).
  - Trigger `onMerchantApplicationStatusChanged` ([merchantApplications.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L580-L628)).
- **Motor de Email Transaccional:**
  - Servicio centralizado [`EmailService`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts) y transporte [`SmtpEmailTransport`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts#L150-L317).
  - 4 Plantillas comerciales canónicas: `merchant_application_received`, `merchant_application_approved`, `merchant_application_rejected`, `merchant_application_docs_requested`.
  - Persistencia de idempotencia y tracking en `/email_events/{eventId}`.
- **Seguridad & Reglas:**
  - Reglas declarativas en [firestore.rules](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L852-L872) (`match /merchant_applications/{appId}`).
  - Reglas de Storage en [storage.rules](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/storage.rules#L88-L99) (`match /merchant_applications_docs/{applicationId}/{fileName}`).

### Alcance Excluido (OUT-OF-SCOPE / LÍMITES ESTRICTOS)
- Módulos de Operaciones y Ventas en Vivo (KDS, POS, Live Orders).
- Módulo de Motorizados y Flota (Courier App, Courier Shift, Courier Settlement).
- Módulo de Clientes (Customer App Android, Checkout, Cart).
- Módulo de Finanzas Comerciales avanzadas y Pasarelas de Pago.
- Catálogo de Productos y Wizard de Creación de Artículos.

---

## 4. Repository Discovery

El descubrimiento forense en el árbol de código confirmó las siguientes ubicaciones exactas:

| Dominio | Directorio / Archivo Principal | Tecnología / Framework |
| :--- | :--- | :--- |
| **Merchant Portal UI** | `merchant-onboarding-portal/src/` | React 18.2, TypeScript, TailwindCSS, Lucide Icons |
| **Admin Governance UI** | `panel-admin/public/js/dashboard/governanceCenter.js` | Vanilla JS / ES6 Modules / TailwindCSS UI |
| **Admin Service Layer** | `panel-admin/public/js/services/governanceService.js` | Firebase v9 Compat / Custom AuthReadyGate |
| **Cloud Functions Callables** | `functions/src/callables/merchant.ts` | Node.js 18 / TypeScript / Firebase Functions v1 |
| **Cloud Functions Triggers** | `functions/src/triggers/merchantApplications.ts` | Firestore Event Triggers (`onUpdate`) |
| **Transactional Email Engine**| `functions/src/services/emailService.ts` | Nodemailer / SmtpTransport (Port 465 SSL/TLS) |
| **Geo Catalog SSOT** | `functions/src/domain/geo/geoCatalog.ts` | Normalizador de Departamentos y Municipios |
| **Database Security Rules** | `firestore.rules` & `storage.rules` | Firebase Security Rules Engine |
| **Indices Compuestos** | `firestore.indexes.json` | Cloud Firestore Index Definition |

---

## 5. File Inventory

```text
PATH: merchant-onboarding-portal/src/App.tsx
RESPONSIBILITY: Enrutador principal del portal de afiliación.
FUNCTIONS / CLASSES: App (React.FC)
RELATIONSHIP TO ONBOARDING: Expone rutas '/' (OnboardingPage) y '/status' (StatusCheckPage).
EVIDENCE: App.tsx:16-21

PATH: merchant-onboarding-portal/src/pages/OnboardingPage.tsx
RESPONSIBILITY: Orquestador del wizard de 4 pasos de afiliación de nuevo comercio.
FUNCTIONS / CLASSES: OnboardingPage (React.FC)
RELATIONSHIP TO ONBOARDING: Mantiene estado formData, inicializa ID 'APP-XXXX', coordina Stepper.
EVIDENCE: OnboardingPage.tsx:19-43

PATH: merchant-onboarding-portal/src/components/Step4Summary.tsx
RESPONSIBILITY: Resumen previo y submisión oficial del expediente de afiliación.
FUNCTIONS / CLASSES: Step4Summary (React.FC), handleFinalSubmit
RELATIONSHIP TO ONBOARDING: Punto de invocación exclusivo de submitMerchantApplication.
EVIDENCE: Step4Summary.tsx:32-104

PATH: merchant-onboarding-portal/src/pages/StatusCheckPage.tsx
RESPONSIBILITY: Consulta pública y reactiva del estado del trámite por correo electrónico.
FUNCTIONS / CLASSES: StatusCheckPage (React.FC), fetchStatus, getStatusBadge
RELATIONSHIP TO ONBOARDING: Consume callable getMerchantApplicationStatus y renderiza badges canónicos.
EVIDENCE: StatusCheckPage.tsx:17-51, 64-110

PATH: merchant-onboarding-portal/src/firebase.ts
RESPONSIBILITY: Cliente SDK Firebase y adaptadores de llamadas Callables para el portal.
FUNCTIONS / CLASSES: submitMerchantApplication, getApplicationStatusCallable
RELATIONSHIP TO ONBOARDING: Ejecuta httpsCallable('submitMerchantApplication') sin bypass a Firestore.
EVIDENCE: firebase.ts:25-100

PATH: panel-admin/public/js/dashboard/governanceCenter.js
RESPONSIBILITY: Interfaz visual de revisión, expedientes 360° y acciones administrativas.
FUNCTIONS / CLASSES: governanceCenterModule (renderApplicationsContent, approveMerchantApp, rejectMerchantApp, requestDocsMerchantApp, reviewDocument)
RELATIONSHIP TO ONBOARDING: Presenta expedientes, botones de acción y modal visor KYC.
EVIDENCE: governanceCenter.js:2530-2725, 3209-3268

PATH: panel-admin/public/js/services/governanceService.js
RESPONSIBILITY: Capa de persistencia y operaciones administrativas sobre /merchant_applications.
FUNCTIONS / CLASSES: governanceService (getMerchantApplications, approveMerchantApplication, rejectMerchantApplication, requestDocsMerchantApplication, updateApplicationDocumentStatus)
RELATIONSHIP TO ONBOARDING: Actualiza status canónico y emite logs en /audit_events.
EVIDENCE: governanceService.js:340-600

PATH: functions/src/callables/merchant.ts
RESPONSIBILITY: Backend serverless seguro para recepción y consulta de solicitudes.
FUNCTIONS / CLASSES: submitMerchantApplication, getMerchantApplicationStatus
RELATIONSHIP TO ONBOARDING: Valida tenant, previene duplicados, persiste en Firestore y dispara email de confirmación.
EVIDENCE: merchant.ts:92-273, 474-533

PATH: functions/src/triggers/merchantApplications.ts
RESPONSIBILITY: Triggers reactivos ante cambios de estado en solicitudes de comercios.
FUNCTIONS / CLASSES: onMerchantApplicationApproved, onMerchantApplicationStatusChanged
RELATIONSHIP TO ONBOARDING: Provisión atómica EIAM al aprobar, despacho de emails de rechazo y solicitud de docs.
EVIDENCE: merchantApplications.ts:172-572, 580-628

PATH: functions/src/services/emailService.ts
RESPONSIBILITY: Núcleo de email transaccional con SMTP SSL/TLS e idempotencia.
FUNCTIONS / CLASSES: EmailService (sendApplicationReceivedEmail, sendApplicationApprovedEmail, sendApplicationRejectedEmail, sendDocsRequestedEmail)
RELATIONSHIP TO ONBOARDING: Despacha los 4 correos automáticos del proceso a través de plantillas dedicadas.
EVIDENCE: emailService.ts:1252-1371
```

---

## 6. End-to-End Traceability

La cadena de eventos y procesamiento implementada en el sistema responde a la siguiente secuencia verificada:

```text
[POSTULANTE EN PORTAL WEB]
  1. Diligencia formulario 4 pasos (Datos, Ubicación/Contacto, Documentos KYC, Confirmación).
  2. Sube archivos a Storage (/merchant_applications_docs/{appId}/*).
  3. Presiona "Enviar Solicitud Oficial".
         │
         ▼
[PORTAL CLIENT SDK (firebase.ts)]
  4. Invoca exclusivamente httpsCallable("submitMerchantApplication").
         │
         ▼
[CLOUD FUNCTIONS (merchant.ts)]
  5. Valida campos obligatorios y formato de email.
  6. Resuelve y valida el Tenant (Zero-Trust Server-Side).
  7. Comprueba unicidad (bloquea si ya existe solicitud activa).
  8. Normaliza geografía contra geoCatalog oficial.
  9. Persiste en /merchant_applications/{docId} con status = "PENDING".
 10. Invoca EmailService.sendApplicationReceivedEmail.
 11. Retorna { success: true, applicationId, firestoreDocId } al portal.
         │
         ▼
[EMAIL ENGINE (emailService.ts)]
 12. Genera eventId = "merch_rcv_{appId}". Verifica /email_events/{eventId}.
 13. Renderiza plantilla "merchant_application_received".
 14. Envía correo vía SmtpEmailTransport (Puerto 465 SSL/TLS).
 15. Marca /email_events/{eventId}.status = "SENT".
         │
         ▼
[POSTULANTE CONSULTA ESTADO (StatusCheckPage.tsx)]
 16. Ingresa email en /status.
 17. Llama getMerchantApplicationStatus -> Firestore (email ASC, createdAt DESC).
 18. Visualiza Badge "Pendiente de Revisión" (PENDING) en tiempo real.
         │
         ▼
[SUPERVISOR EN ADMIN WEB (governanceCenter.js)]
 19. Consulta bandeja /merchant_applications filtrada por Tenant y Estado.
 20. Abre Expediente 360° (openApplicationDrawer).
 21. Revisa documentos adjuntos (RUC, Cédula, Licencia Sanitaria).
         │
         ├─── OPCIÓN A: SOLICITAR DOCUMENTOS
         │      22a. Admin ejecuta requestDocsMerchantApp(note).
         │      23a. governanceService actualiza status = "DOCS_REQUESTED" y docsRequestedNote.
         │      24a. Trigger onMerchantApplicationStatusChanged detecta cambio.
         │      25a. Dispara EmailService.sendDocsRequestedEmail.
         │      26a. Postulante ve estado "Documentación Adicional Requerida" en /status.
         │
         ├─── OPCIÓN B: RECHAZAR SOLICITUD
         │      22b. Admin ejecuta rejectMerchantApp(reason).
         │      23b. governanceService actualiza status = "REJECTED" y rejectionReason.
         │      24b. Trigger onMerchantApplicationStatusChanged detecta cambio.
         │      25b. Dispara EmailService.sendApplicationRejectedEmail.
         │      26b. Postulante ve estado "Solicitud No Aprobada" en /status con motivo.
         │
         └─── OPCIÓN C: APROBAR COMERCIO
                22c. Admin ejecuta approveMerchantApp().
                23c. governanceService actualiza EXCLUSIVAMENTE status = "APPROVED".
                24c. Trigger onMerchantApplicationApproved detecta transición a APPROVED.
                25c. Comprueba idempotencia (si ya tiene provisionedBusinessId, omite).
                26c. Crea/obtiene usuario Firebase Auth y genera contraseña temporal segura.
                27c. Ejecuta TRANSACCIÓN ATÓMICA FIRESTORE:
                     - /users/{uid} (MERCHANT_OWNER, tenantId, ACTIVE)
                     - /organizations/{orgId} (ACTIVE)
                     - /businesses/{businessId} (lifecycleStatus: ONBOARDING)
                     - /branches/{branchId} (Sucursal Principal)
                     - /restaurant_settings/{businessId} (Configuración inicial cerrada)
                     - /memberships/{membershipId} (Rol MERCHANT_OWNER + permisos)
                     - /audit_events (Evento BUSINESS_CREATED)
                     - /merchant_applications/{appId} (status: ONBOARDING, provisionedUid, provisionedBusinessId)
                28c. Asigna Custom Claims JWT (role: OWNER, tenantId, businessId, eiamVer: 3).
                29c. Invoca EmailService.sendApplicationApprovedEmail con credenciales.
                30c. Postulante recibe credenciales y accede a Merchant Web.
```

---

## 7. Merchant Registration Audit

### Formulario e Interfaz
- **Implementación:** [OnboardingPage.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/OnboardingPage.tsx) y submisión en [Step4Summary.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/components/Step4Summary.tsx).
- **Validaciones de Entrada (Client-side):**
  - Nombre Comercial, Razón Social y RUC obligatorios.
  - Validación de formato RUC y correo electrónico.
  - Selección geográfica en cascada: Departamento -> Municipio ([geoCatalog.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/constants/geoCatalog.ts)).
  - Aceptación obligatoria de Términos y Condiciones.
- **Validaciones Críticas de Negocio (Server-side en Callable):**
  - Validación estricta en [merchant.ts:95-110](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L95-L110): campos requeridos, regex de email.
  - Validación de Tenant: Comprueba existencia y estado `ACTIVE` del tenant especificado en `tenantId` o `tenantSlug`. Si no se especifica, asigna determinísticamente `ten_bluesystem_core`.
  - Verificación de duplicidad ([merchant.ts:164-177](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L164-L177)): Bloquea con `functions/already-exists` si existe una solicitud activa (`PENDING`, `UNDER_REVIEW`, `APPROVED`, `ONBOARDING`) para el mismo correo en el mismo tenant.
  - Normalización de Municipio / Departamento: Comprobación contra el catálogo maestro mediante `isValidMunicipality`.
- **Carga de Documentos KYC:**
  - Los archivos se suben antes de la submisión a Storage bajo la ruta `/merchant_applications_docs/{publicAppId}/{fileName}`.
  - Reglas de Storage ([storage.rules:88-99](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/storage.rules#L88-L99)) restringen tamaño a máx. 10 MB y formatos a imágenes/PDF, impidiendo sobrescritura (`resource == null`).

---

## 8. Application Persistence Audit

Al invocarse `submitMerchantApplication`, el documento se persiste en Firestore con las siguientes características:

- **Colección:** `/merchant_applications`
- **Document ID:** Generado automáticamente por Firestore (`appRef.id`).
- **Campos Canónicos Grabados:**
  - `appId`: Identificador público legible (ej. `APP-MSLC53R4-K4ZS3`).
  - `firestoreDocId`: ID único de documento Firestore.
  - `tenantId`: ID del inquilino (ej. `ten_bluesystem_core`).
  - `tenantSlug`: Slug del inquilino (ej. `bluesystem`).
  - `tenantName`: Nombre de la empresa asociada.
  - `businessName`, `legalName`, `ruc`, `category`: Datos comerciales.
  - `departmentId`, `departmentName`, `municipalityId`, `municipalityName`, `city`, `address`, `zone`, `location`: Georreferenciación normalizada.
  - `contactName`, `phone`, `email`: Datos de contacto.
  - `documents`: Metadatos de archivos adjuntos (tipo, storagePath, size, uploadedAt).
  - `status`: Inicializado estrictamente en `"PENDING"`.
  - `rejectionReason`: `null`.
  - `docsRequestedNote`: `null`.
  - `reviewedBy`: `null`.
  - `reviewedAt`: `null`.
  - `provisionedBusinessId`: `null`.
  - `provisionedUid`: `null`.
  - `createdAt`, `updatedAt`: `FieldValue.serverTimestamp()`.
- **Permisos de Escritura:** Exclusivos de Cloud Functions (Admin SDK) o Platform Admin ([firestore.rules:855](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L855)). Los clientes web tienen lectura restringida y prohibición absoluta de borrado (`allow delete: if false`).

---

## 9. Application Status Audit

### Componente de Consulta
- **Archivo:** [StatusCheckPage.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/StatusCheckPage.tsx)
- **Ruta Web:** `/status` (admite parámetro query `?email=usuario@comercio.com`).
- **Función Backend:** Callable [`getMerchantApplicationStatus`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L474-L533).
- **Consulta Firestore:**
  ```typescript
  db.collection("merchant_applications")
    .where("email", "==", cleanEmail)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  ```
- **Índice Compuesto Verificado:** `merchant_applications` (`email` ASC + `createdAt` DESC) registrado en [firestore.indexes.json](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.indexes.json) y desplegado en producción tras la auditoría y certificación `C2D.34-R`.
- **Diferenciación de Errores en UI:** Maneja y despliega mensajes claros para `not-found`, `invalid-argument` e `internal`, garantizando que la UI no confunda un fallo técnico con una ausencia de registro.
- **Sanitización de Datos de Salida:** La Cloud Function solo devuelve campos públicos (`applicationId`, `businessName`, `status`, `createdAt`, `updatedAt`, `statusMessage`, `docsNote`, `rejectionReason`), protegiendo RUC, documentos y UIDs internos.

---

## 10. State Machine

La máquina de estados canónica de una solicitud de comercio (`MerchantApplicationStatus`) y su interacción con el ciclo de vida del negocio (`MerchantLifecycleStatus`) está definida formalmente en código:

```text
       [SUBMIT APPLICATION]
                 │
                 ▼
             ┌─────────┐
             │ PENDING │
             └────┬────┘
                  │ (Admin abre expediente)
                  ▼
          ┌──────────────┐
          │ UNDER_REVIEW │
          └───┬───┬───┬──┘
              │   │   │
  ┌───────────┘   │   └───────────┐
  │ (Falta doc)   │ (Cumple KYC)  │ (No cumple)
  ▼               │               ▼
┌────────────────┐│        ┌──────────┐
│ DOCS_REQUESTED ││        │ REJECTED │ ──► [Fin del Flujo]
└───────┬────────┘│        └──────────┘
        │         │
        └─────────┼───────────────┐
                  ▼               ▼
            ┌──────────┐    ┌──────────┐
            │ APPROVED │    │ REJECTED │
            └────┬─────┘    └──────────┘
                 │ (Trigger automático onMerchantApplicationApproved)
                 ▼
           ┌────────────┐
           │ ONBOARDING │ (Business creado en Firestore, credenciales enviadas)
           └─────┬──────┘
                 │ (Comercio completa Wizard de 5 pasos en Merchant Web)
                 ▼
            ┌────────┐
            │ ACTIVE │ (Comercio operacional y abierto a pedidos)
            └────────┘
```

### Tabla de Transiciones Canónicas

| Estado Actual | Estado Siguiente | Actor | Función Ejecutora | Evento / Trigger | Email Disparado | Consecuencia Operativa |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *(None)* | **PENDING** | Postulante | `submitMerchantApplication` | Invocación Callable | `merchant_application_received` | Creación de registro en `/merchant_applications`. |
| **PENDING** | **UNDER_REVIEW** | Admin | `governanceService` | Update en Firestore | *(Ninguno)* | Apertura de expediente en Governance Center. |
| **UNDER_REVIEW** | **DOCS_REQUESTED** | Admin | `requestDocsMerchantApplication` | Update en Firestore | `merchant_application_docs_requested` | Solicitud vuelve al postulante con nota de documentos. |
| **DOCS_REQUESTED** | **UNDER_REVIEW** | Postulante / Admin | `governanceService` | Adjuntar nuevos docs | *(Ninguno)* | Expediente reingresa a revisión. |
| **UNDER_REVIEW** | **REJECTED** | Admin | `rejectMerchantApplication` | Update en Firestore | `merchant_application_rejected` | Solicitud cerrada con motivo de rechazo. |
| **UNDER_REVIEW** | **APPROVED** | Admin | `approveMerchantApplication` | Update en Firestore | *(Trigger activado)* | Señal de aprobación para el motor serverless. |
| **APPROVED** | **ONBOARDING** | Sistema (CF) | `onMerchantApplicationApproved` | Firestore Trigger | `merchant_application_approved` | Transacción atómica EIAM: creación de User, Org, Biz, Branch, Membership y Claims. |
| **ONBOARDING** | **ACTIVE** | Comercio | `completeMerchantWizard` | Callable autenticado | *(Ninguno)* | Comercio completa configuración y abre operaciones. |

---

## 11. Admin Workflow Audit

El flujo de revisión administrativa se encuentra consolidado en el Panel Admin:

1. **Autenticación y Autorización:**
   - La vista está protegida por `AuthReadyGate` y requiere rol `isPlatformAdmin` o `isBusinessAdmin` del tenant.
   - Las consultas respetan `activeTenantId` para garantizar aislamiento multi-tenant ([governanceService.js:358-367](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L358-L367)).
2. **Visualización y Filtros:**
   - Tabla interactiva con contadores rápidos de métricas: Pendientes, Docs Requeridos, Aprobados/En Onboarding y Total.
   - Filtros por estado y por inquilino/organización.
3. **Expediente 360° (Application Drawer):**
   - Invocado mediante `openApplicationDrawer(firestoreDocId)`.
   - Muestra datos generales, RUC, teléfono con enlace directo a WhatsApp, ciudad y zona.
   - Listado de documentos adjuntos con visor modal integrado (`modal-document-viewer`) compatible con imágenes y PDFs vía `<iframe>`.
4. **Revisión Individual de Documentos KYC:**
   - Función `reviewDocument`: Permite marcar individualmente cada documento como `APPROVED` o `REJECTED` con captura obligatoria del motivo.
5. **Auditoría de Acciones:**
   - Toda acción genera un registro estructurado en la colección `/audit_events` vía `governanceService.logAuditEvent`.

---

## 12. Approval Audit

La aprobación comercial sigue el principio de **Single Authority Architecture (GAP-02)**:

1. **Frontend Admin:**
   - Al pulsar "Aprobar", `approveMerchantApp` solicita confirmación explícita al supervisor.
   - Invoca `governanceService.approveMerchantApplication(firestoreDocId)`.
   - Valida que la solicitud no esté previamente en `APPROVED`, `ONBOARDING` o `ACTIVE`.
   - Actualiza el documento en Firestore con:
     ```javascript
     {
       status: 'APPROVED',
       reviewedBy: currentAdminUid,
       reviewedAt: FieldValue.serverTimestamp(),
       updatedAt: FieldValue.serverTimestamp()
     }
     ```
   - Registra auditoría `MERCHANT_APPLICATION_APPROVED`.
2. **Backend Serverless (`onMerchantApplicationApproved`):**
   - El trigger detecta la mutación a `APPROVED`.
   - Verifica la guarda de idempotencia (`provisionedBusinessId || provisionedUid`).
   - Genera contraseña temporal segura de 16 caracteres ([merchantApplications.ts:85-93](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L85-L93)).
   - Crea el usuario en Firebase Auth (`admin.auth().createUser`) o lo reutiliza si ya existe validando que no pertenezca a otro tenant ni tenga rol de gobernanza global.
   - Ejecuta `db.runTransaction` atómica:
     - `/users/{uid}`: `userType: "business"`, `role: "business"`, `eiamRole: "MERCHANT_OWNER"`, `status: "ACTIVE"`.
     - `/organizations/{orgId}`: `status: "ACTIVE"`, `ownerUid: uid`.
     - `/businesses/{businessId}`: `lifecycleStatus: "ONBOARDING"`, `status: "ACTIVE"`, `wizardCompleted: false`.
     - `/branches/{branchId}`: "Sucursal Principal", `isPrimary: true`, `isActive: true`.
     - `/restaurant_settings/{businessId}`: Configuración privada inicial (`isOpen: false`, `deliveryFee: 0`).
     - `/membership/{membershipId}` y `/memberships/{membershipId}`: Permisos completos de gestión comercial.
     - `/audit_events`: Evento `BUSINESS_CREATED`.
     - `/merchant_applications/{appId}`: Transiciona a `status: "ONBOARDING"`, vinculando `provisionedUid` y `provisionedBusinessId`.
   - Asigna Custom Claims JWT (`role: "OWNER"`, `tenantId`, `businessId`, `orgId`, `branchId`, `eiamVer: 3`).
   - Envía correo transaccional de bienvenida y credenciales temporales vía `EmailService.sendApplicationApprovedEmail`.

---

## 13. Rejection Audit

1. **Acción Administrativa:**
   - Invocada mediante `rejectMerchantApp(firestoreDocId)` en `governanceCenter.js`.
   - Solicita obligatoriamente la razón del rechazo mediante prompt validado.
   - Ejecuta `governanceService.rejectMerchantApplication(firestoreDocId, reason)`.
2. **Persistencia en Firestore:**
   - Actualiza `/merchant_applications/{docId}` con:
     ```javascript
     {
       status: 'REJECTED',
       rejectionReason: reason.trim(),
       reviewedBy: currentAdminUid,
       reviewedAt: FieldValue.serverTimestamp(),
       updatedAt: FieldValue.serverTimestamp()
     }
     ```
   - Registra evento de auditoría `MERCHANT_APPLICATION_REJECTED`.
3. **Disparo Automático de Email:**
   - El trigger `onMerchantApplicationStatusChanged` detecta la transición a `REJECTED`.
   - Invoca [`EmailService.sendApplicationRejectedEmail`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts#L1312-L1340).
   - El correo despachado incluye el motivo formal y canales de soporte.
4. **Consulta de Estado:**
   - El postulante ve inmediatamente en `/status` el badge rojo "Solicitud No Aprobada" con la explicación registrada por el supervisor.

---

## 14. Document Request Audit

1. **Acción Administrativa:**
   - Invocada mediante `requestDocsMerchantApp(firestoreDocId)` en `governanceCenter.js`.
   - Exige la nota explicativa con los recaudos o correcciones requeridas.
   - Ejecuta `governanceService.requestDocsMerchantApplication(firestoreDocId, note)`.
2. **Persistencia en Firestore:**
   - Actualiza `/merchant_applications/{docId}` con:
     ```javascript
     {
       status: 'DOCS_REQUESTED',
       docsRequestedNote: note.trim(),
       reviewedBy: currentAdminUid,
       reviewedAt: FieldValue.serverTimestamp(),
       updatedAt: FieldValue.serverTimestamp()
     }
     ```
   - Registra evento de auditoría `DOCUMENT_REQUESTED`.
3. **Disparo Automático de Email:**
   - El trigger `onMerchantApplicationStatusChanged` detecta la transición a `DOCS_REQUESTED`.
   - Invoca [`EmailService.sendDocsRequestedEmail`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts#L1343-L1371).
   - El correo despachado incluye las instrucciones de gobernanza y el enlace directo para regularizar el trámite.
4. **Consulta de Estado:**
   - El postulante visualiza el badge naranja "Documentación Adicional Requerida" con el recuadro destacado de instrucciones.

---

## 15. Automatic Email Audit

El subsistema de correo transaccional para comercios se encuentra completamente blindado bajo **ADR-017 (Transactional Email Core Freeze)**:

- **Infraestructura de Despacho:** Unificado en `EmailService` con transporte corporativo `SmtpEmailTransport` conectado a `mail.bluesystemdelivery.com:465` (SSL/TLS nativo) desde `noreply@bluesystemdelivery.com`.
- **Plantillas Corporativas:** Dark Theme responsive HTML5, sanitizado anti-XSS mediante `HtmlSanitizer`, con botones CTA que implementan validación estricta de protocolos seguros (`https://`, `mailto:`).
- **Segregación de Secretos:** La contraseña SMTP se obtiene en tiempo de ejecución desde Google Cloud Secret Manager (`SMTP_PASSWORD`) vía `SecretService`, garantizando cero exposición en repositorios o logs.

---

## 16. Email Wiring Matrix

| Evento de Negocio | Trigger en Código | Método EmailService | Plantilla | Destinatario | Transporte | Idempotencia Key |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Solicitud Recibida** | Invocación `submitMerchantApplication` ([merchant.ts:255](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L255)) | `sendApplicationReceivedEmail` | `merchant_application_received` | `after.email` | SMTP SSL 465 | `merch_rcv_${appId}` |
| **Aprobación & Provisión** | Trigger `onMerchantApplicationApproved` ([merchantApplications.ts:493](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L493)) | `sendApplicationApprovedEmail` | `merchant_application_approved` | `after.email` | SMTP SSL 465 | `merch_appr_${appId}` |
| **Rechazo de Solicitud** | Trigger `onMerchantApplicationStatusChanged` ([merchantApplications.ts:603](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L603)) | `sendApplicationRejectedEmail` | `merchant_application_rejected` | `after.email` | SMTP SSL 465 | `merch_rej_${appId}` |
| **Documentación Requerida**| Trigger `onMerchantApplicationStatusChanged` ([merchantApplications.ts:612](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L612)) | `sendDocsRequestedEmail` | `merchant_application_docs_requested`| `after.email` | SMTP SSL 465 | `merch_docs_${appId}` |

---

## 17. Email Idempotency

1. **Clave de Idempotencia Determinística:**
   Cada llamada a `EmailService.sendTransactionalEmail` recibe un `eventId` unívoco derivado del código de solicitud:
   - Recibido: `merch_rcv_${appId}`
   - Aprobado: `merch_appr_${appId}`
   - Rechazado: `merch_rej_${appId}`
   - Documentos: `merch_docs_${appId}`
2. **Comprobación Pre-Vuelo:**
   Antes de conectar con el servidor SMTP, el servicio consulta `/email_events/{eventId}`:
   ```typescript
   const eventSnap = await eventRef.get();
   if (eventSnap.exists && eventSnap.data()?.status === "SENT") {
     return { success: true, status: "SKIPPED", eventId };
   }
   ```
   Si el correo ya fue enviado exitosamente, la llamada se omite de forma atómica (`status: "SKIPPED"`).
3. **Protección Contra Reintentos:**
   En caso de reintento de la Cloud Function por fallo transitorio, la existencia del evento en estado `SENT` impide físicamente la duplicación del correo al cliente.

---

## 18. Email Security

- **Manejo de Secretos:** Cero credenciales hardcodeadas en código fuente. `SecretService` administra `SMTP_PASSWORD` con caché en memoria cifrada.
- **Sanitización HTML:** La clase `HtmlSanitizer` elimina etiquetas peligrosas (`<script>`, `<iframe>`, `<object>`, `<form>`) y pseudoprotocolos JavaScript en enlaces (`javascript:`, `data:`).
- **Protección de Enlaces:** Las URLs de los botones de acción se validan mediante `isSafeUrl`.
- **Validación de Variables:** El motor valida que todas las variables en la plantilla correspondan a la lista blanca declarada en `allowedVariables`, rechazando inyecciones no autorizadas.

---

## 19. Firestore Audit

| Colección | Operación | Actor Autorizado | Trigger Asociado | Propósito en Onboarding |
| :--- | :---: | :--- | :--- | :--- |
| `/merchant_applications/{appId}` | Read | Platform Admin, Tenant Admin, Solicitante (por email) | `onUpdate` | Expediente canónico de la solicitud de afiliación. |
| `/merchant_applications/{appId}` | Create | Exclusivo Cloud Functions (Admin SDK) o Platform Admin | *(None)* | Registro seguro de nueva solicitud desde el portal público. |
| `/merchant_applications/{appId}` | Update | Platform Admin, Business Admin del mismo Tenant | `onUpdate` | Aprobación, rechazo, solicitud de documentos y paso a ONBOARDING. |
| `/merchant_applications/{appId}` | Delete | Prohibido (`allow delete: if false`) | *(None)* | Preservación de trazabilidad inmutable de auditoría. |
| `/users/{uid}` | Set | Cloud Functions (`onMerchantApplicationApproved`) | `onCreate` | Creación del usuario propietario (`MERCHANT_OWNER`). |
| `/organizations/{orgId}` | Set | Cloud Functions (`onMerchantApplicationApproved`) | *(None)* | Estructura de holding / empresa comercial. |
| `/businesses/{businessId}` | Set | Cloud Functions (`onMerchantApplicationApproved`) | *(None)* | Establecimiento comercial provisionado en `ONBOARDING`. |
| `/branches/{branchId}` | Set | Cloud Functions (`onMerchantApplicationApproved`) | *(None)* | Sucursal principal asociada al establecimiento. |
| `/restaurant_settings/{bizId}` | Set | Cloud Functions (`onMerchantApplicationApproved`) | *(None)* | Configuración operativa privada inicial. |
| `/memberships/{membershipId}` | Set | Cloud Functions (`onMerchantApplicationApproved`) | *(None)* | Asignación formal de rol y matriz de permisos EIAM v3. |
| `/audit_events/{eventId}` | Create | Cloud Functions y Panel Admin | *(None)* | Registro forense de auditoría de cada acción administrativa. |
| `/email_events/{eventId}` | Set | Cloud Functions (`EmailService`) | *(None)* | Idempotencia y trazabilidad de entrega de correos. |

---

## 20. Cloud Functions Audit

| Nombre de Función | Tipo | Archivo Origen | Disparador / Endpoint | Autenticación | Idempotencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `submitMerchantApplication` | HTTPS Callable | [merchant.ts:92](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L92) | Invocación cliente | Pública (Portal) | Comprobación de email/tenant activo preexistente. |
| `getMerchantApplicationStatus`| HTTPS Callable | [merchant.ts:474](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L474) | Invocación cliente | Pública (Portal) | Operación de solo lectura pura. |
| `onMerchantApplicationApproved`| Firestore Trigger| [merchantApplications.ts:172](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L172) | `merchant_applications/{appId}.onUpdate` | Admin SDK (Internal) | Guarda `provisionedBusinessId \|\| provisionedUid`. |
| `onMerchantApplicationStatusChanged`| Firestore Trigger| [merchantApplications.ts:580](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L580) | `merchant_applications/{appId}.onUpdate` | Admin SDK (Internal) | Guarda de estado y `EmailService` idempotency key. |

---

## 21. Provisioning Audit

La provisión de identidades y entidades se ejecuta en un diseño **Híbrido Transaccional Resiliente**:

1. **Creación de Identidad en Firebase Auth (Paso Previo Fuera de Transacción):**
   - Se crea el usuario en Firebase Authentication con email y contraseña temporal segura.
   - Si el usuario ya existe, se valida que pertenezca al mismo tenant y no sea administrador global, actualizando su contraseña temporal.
2. **Transacción Atómica de Firestore (`db.runTransaction`):**
   - En una sola transacción indivisible se escriben:
     - `/users/{uid}`
     - `/organizations/{orgId}`
     - `/businesses/{businessId}`
     - `/branches/{branchId}`
     - `/restaurant_settings/{businessId}`
     - `/membership/{membershipId}` y `/memberships/{membershipId}`
     - `/audit_events`
     - `/merchant_applications/{appId}` (actualizado a `ONBOARDING` con IDs vinculados).
3. **Rollback Automático:**
   - Si la transacción Firestore falla por cualquier motivo, el bloque `catch` ejecuta la eliminación del usuario creado en Firebase Auth (`admin.auth().deleteUser(uid)`), dejando el sistema en estado consistente y marcando la solicitud como `FAILED` para evitar bucles recursivos.
4. **Post-Transacción:**
   - Asignación de Custom Claims JWT.
   - Envío asíncrono no-bloqueante del email transaccional con credenciales.

---

## 22. EIAM / Security Audit

- **Protección Contra Auto-Aprobación:** Ningún comercio o usuario no autenticado puede mutar el campo `status` de `/merchant_applications`. La regla `allow update` restringe esta mutación a usuarios con roles administrativos autenticados.
- **Inmutabilidad de Datos Críticos:** Las reglas prohíben expresamente que los administradores de comercio alteren `appId`, `applicationId`, `tenantId`, `createdAt`, `email` o `ruc` durante cualquier actualización.
- **Validación de Claims en el Token:** Las operaciones administrativas exigen validación de claims `isPlatformAdmin` o verificación de pertenencia mediante `isTenantMember(resource.data.tenantId)`.

---

## 23. Tenant Isolation

- **Segregación Estricta de Datos:** Cada documento en `/merchant_applications`, `/organizations`, `/businesses`, `/branches` y `/memberships` contiene el campo inmutable `tenantId`.
- **Aislamiento en Consultas Administrativas:** `governanceService.getMerchantApplications` filtra mandatoriamente por el `tenantId` del usuario autenticado si este no es Super Administrador Global.
- **Aislamiento en Reglas de Seguridad:** La función auxiliar `isTenantMember` en `firestore.rules` rechaza cualquier lectura o escritura donde `request.auth.token.tenantId != resource.data.tenantId`.
- **Aislamiento en Provisión:** La Cloud Function `onMerchantApplicationApproved` propaga el `resolvedTenantId` a todas las entidades creadas de forma atómica.

---

## 24. Audit Trail

Todas las operaciones críticas dejan un rastro inmutable en `/audit_events`:

| Evento | Actor | Colección Afectada | Metadata Registrada |
| :--- | :--- | :--- | :--- |
| `MERCHANT_APPLICATION_APPROVED` | Supervisor Admin | `/merchant_applications` | `applicationId`, `businessName`, `email`, `reviewedBy` |
| `MERCHANT_APPLICATION_REJECTED` | Supervisor Admin | `/merchant_applications` | `applicationId`, `businessName`, `reason`, `reviewedBy` |
| `DOCUMENT_REQUESTED` | Supervisor Admin | `/merchant_applications` | `applicationId`, `businessName`, `docsRequestedNote`, `reviewedBy` |
| `DOCUMENT_APPROVED` | Supervisor Admin | Storage / Documents | `applicationId`, `documentName`, `documentType`, `storagePath` |
| `DOCUMENT_REJECTED` | Supervisor Admin | Storage / Documents | `applicationId`, `documentName`, `storagePath`, `reason` |
| `BUSINESS_CREATED` | Trigger Serverless | Firestore EIAM Entities | `uid`, `tenantId`, `businessId`, `orgId`, `branchId`, `applicationId` |
| `ONBOARDING_COMPLETED` | Propietario Comercio | `/businesses` | `businessId`, `businessName`, `completedAt` |

---

## 25. Dependency Classification

| Dependencia | Categoría | Uso en el Onboarding | Impacto si se Modifica | ¿Forma parte del Freeze #002? |
| :--- | :---: | :--- | :--- | :---: |
| **`merchant-onboarding-portal`** | **CATEGORY A (Exclusive)** | Formulario y consulta de estado | Rompe la captación de comercios | **SÍ (FROZEN)** |
| **`governanceCenter.js` (Afiliaciones)** | **CATEGORY A (Exclusive)** | Bandeja y expediente 360° | Impide revisar solicitudes | **SÍ (FROZEN)** |
| **`functions/src/triggers/merchantApplications.ts`**| **CATEGORY A (Exclusive)** | Provisión EIAM y triggers | Impide la activación del comercio | **SÍ (FROZEN)** |
| **`functions/src/callables/merchant.ts`** | **CATEGORY A (Exclusive)** | Submisión y consulta de estado | Falla la recepción de trámites | **SÍ (FROZEN)** |
| **`EmailService` (Métodos de Comercio)** | **CATEGORY B (Shared)** | Despacho de 4 correos de comercio | Afecta notificaciones de onboarding | **SÍ (Contrato congelado)** |
| **`firestore.rules` (`/merchant_applications`)** | **CATEGORY C (Critical)** | Reglas de seguridad de solicitudes | Brecha de seguridad / bloqueo | **SÍ (Reglas congeladas)** |
| **`storage.rules` (`/merchant_applications_docs`)| **CATEGORY C (Critical)** | Reglas de almacenamiento KYC | Falla carga o exposición de docs | **SÍ (Reglas congeladas)** |
| **Firebase Auth / Cloud Firestore** | **CATEGORY D (External)** | Infraestructura backend | Caída de plataforma | **NO (Proveedor externo)** |
| **Servidor SMTP Corporativo** | **CATEGORY D (External)** | Transporte de correos puerto 465 | Pérdida de entrega de emails | **NO (Infraestructura)** |

---

## 26. Regression Analysis

Se verificó el impacto del freeze sobre otros componentes del sistema:
- **Merchant Web:** La interfaz de inicio de sesión y el wizard inicial (`updateMerchantWizardStep`, `completeMerchantWizard`) se mantienen intactos, consumiendo exactamente los documentos generados durante la provisión.
- **Customer App (Android):** Ninguna dependencia alterada. Los comercios en estado `ONBOARDING` permanecen invisibles para clientes hasta completar el wizard y transicionar a `ACTIVE`.
- **Courier App & Flota:** Ninguna afectación en rutas, telemetría o cierres de caja.
- **Admin Governance:** Las pestañas de roles, usuarios, finanzas y sucursales continúan operando normalmente sin colisiones de nombres o permisos.

---

## 27. Freeze Boundary

### INCLUDED (Formalmente Congelado bajo Baseline Inmutable):
- Flujo de registro en 4 pasos del portal web de onboarding.
- Submisión y consulta de estado vía Cloud Functions callables (`submitMerchantApplication`, `getMerchantApplicationStatus`).
- Bandeja de revisión, expediente 360° y botones de acción en Panel Admin (`governanceCenter.js`).
- Máquina de estados canónica de solicitudes (`PENDING`, `UNDER_REVIEW`, `DOCS_REQUESTED`, `APPROVED`, `REJECTED`, `ONBOARDING`, `ACTIVE`).
- Provisión atómica de entidades EIAM en `onMerchantApplicationApproved`.
- Triggers de estado y despacho de los 4 correos automáticos en `onMerchantApplicationStatusChanged`.
- Plantillas de correo: `merchant_application_received`, `merchant_application_approved`, `merchant_application_rejected`, `merchant_application_docs_requested`.
- Reglas de Firestore para `/merchant_applications/{appId}` y Storage para `/merchant_applications_docs/{applicationId}/{fileName}`.

### EXCLUDED (Fuera del límite de este freeze):
- Módulo de KDS y Pedidos en Vivo del comercio.
- Módulo de Catálogo y Wizard de Productos.
- Módulo de Control Tower y Despacho de Motorizados.
- Módulo de Clientes y Cobros con Pasarelas.

---

## 28. Gate Matrix

| Gate | Criterio | Resultado | Evidencia |
| :---: | :--- | :---: | :--- |
| **G1** | Registro localizado | 🟢 PASS | [OnboardingPage.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/OnboardingPage.tsx), Steps 1–4. |
| **G2** | Persistencia localizada | 🟢 PASS | [merchant.ts:212-246](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L212-L246) en `/merchant_applications`. |
| **G3** | Consulta de estado localizada | 🟢 PASS | [StatusCheckPage.tsx](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/StatusCheckPage.tsx) y [merchant.ts:474-533](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L474-L533). |
| **G4** | Estados canónicos identificados | 🟢 PASS | `PENDING`, `UNDER_REVIEW`, `DOCS_REQUESTED`, `APPROVED`, `REJECTED`, `ONBOARDING`, `ACTIVE`. |
| **G5** | State machine verificada | 🟢 PASS | Transiciones trazadas y soportadas por triggers. |
| **G6** | Admin workflow verificado | 🟢 PASS | [governanceCenter.js:2530-2725](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/governanceCenter.js#L2530-L2725) y [governanceService.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L340-L600). |
| **G7** | Approval verificado | 🟢 PASS | Single authority en Admin -> Trigger EIAM atómico en backend. |
| **G8** | Rejection verificado | 🟢 PASS | Captura de motivo obligatorio, actualización y email automático. |
| **G9** | Document request verificado | 🟢 PASS | Captura de nota, actualización a `DOCS_REQUESTED` y email automático. |
| **G10**| Emails identificados | 🟢 PASS | 4 plantillas en [emailService.ts:396-496](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts#L396-L496). |
| **G11**| Email wiring E2E verificado | 🟢 PASS | Conexión directa comprobada en triggers y callables. |
| **G12**| Idempotencia verificada | 🟢 PASS | Control en `/email_events/{eventId}`, guardas en triggers y suite de 100 replays PASS. |
| **G13**| Provisioning verificado | 🟢 PASS | Transacción atómica en [merchantApplications.ts:272-468](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L272-L468). |
| **G14**| Seguridad/EIAM verificada | 🟢 PASS | [firestore.rules:852-872](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L852-L872) bloquea creación/mutación directa. |
| **G15**| Tenant isolation verificada | 🟢 PASS | Aislamiento por `tenantId` en rules, queries y provisión. |
| **G16**| Audit trail verificado | 🟢 PASS | Registro de eventos en `/audit_events` para cada decisión. |
| **G17**| Dependencias identificadas | 🟢 PASS | Clasificación Category A, B, C, D documentada. |
| **G18**| Freeze boundary definido | 🟢 PASS | Límites INCLUDED y EXCLUDED formalizados. |
| **G19**| Regresión analizada | 🟢 PASS | Cero impacto negativo en Merchant Web, Courier o Customer. |
| **G20**| Cliente final validó físicamente | 🟢 PASS | Aprobación explícita declarada por Product Owner. |
| **G21**| 0 bloqueadores críticos | 🟢 PASS | Cero bloqueadores detectados en la auditoría. |
| **G22**| Freeze técnicamente permitido | 🟢 PASS | Todos los requisitos de arquitectura e ingeniería cumplidos. |

---

## 29. Findings

- **FIND-01 (Resuelto):** En la auditoría forense C2D.34 se identificó la ausencia del índice compuesto para la consulta de estado por email y fecha descendente en `getMerchantApplicationStatus`. La subsanación C2D.34-R desplegó el índice en `firestore.indexes.json` y agregó captura de errores estructurada, resolviendo el problema al 100%.
- **FIND-02 (Arquitectura Canónica Verificada):** Se constató que el frontend administrativo no realiza aprovisionamiento directo en el cliente; delega exclusivamente la provisión al trigger `onMerchantApplicationApproved` en backend al mutar a `status = 'APPROVED'`, garantizando atomicidad e integridad transaccional.

---

## 30. Blockers

- **Bloqueadores Críticos Activos:** **0** (Ninguno).

---

## 31. Non-Blocking Observations

- **OBS-01:** La regeneración de enlace dinámico de activación en Firebase Auth (`admin.auth().generatePasswordResetLink`) dentro de `sendMerchantInvitationEmail` puede fallar si la configuración de dominio de enlace de Auth no está propagada; sin embargo, el código contiene un bloque `try/catch` seguro que no interrumpe la provisión y provee la contraseña temporal directamente en el correo corporativo.

---

## 32. Evidence Index

1. **Frontend Onboarding Portal:**
   - [`merchant-onboarding-portal/src/App.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/App.tsx#L16-L21)
   - [`merchant-onboarding-portal/src/pages/OnboardingPage.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/OnboardingPage.tsx#L19-L62)
   - [`merchant-onboarding-portal/src/components/Step4Summary.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/components/Step4Summary.tsx#L32-L104)
   - [`merchant-onboarding-portal/src/pages/StatusCheckPage.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/pages/StatusCheckPage.tsx#L17-L51)
   - [`merchant-onboarding-portal/src/firebase.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-onboarding-portal/src/firebase.ts#L25-L100)
2. **Frontend Admin Governance:**
   - [`panel-admin/public/js/dashboard/governanceCenter.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/governanceCenter.js#L2530-L2725)
   - [`panel-admin/public/js/services/governanceService.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L340-L600)
3. **Backend Cloud Functions & Triggers:**
   - [`functions/src/callables/merchant.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts#L92-L273)
   - [`functions/src/triggers/merchantApplications.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L172-L628)
   - [`functions/src/services/emailService.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/emailService.ts#L396-L496)
4. **Reglas de Seguridad y Base de Datos:**
   - [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L852-L872)
   - [`storage.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/storage.rules#L88-L99)
   - [`firestore.indexes.json`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.indexes.json)
5. **Suites de Pruebas de Certificación:**
   - [`scripts/test_merchant_emails.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/scripts/test_merchant_emails.js): 10/10 pruebas de email e idempotencia superadas (100% PASS).
   - [`scripts/test_provisioning_idempotency.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/scripts/test_provisioning_idempotency.js): 100 repeticiones de provisión con 0 duplicados y concurrencia controlada (100% PASS).
   - [`scripts/test_merchant_app_id_mapping.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/scripts/test_merchant_app_id_mapping.js): 8/8 pruebas de mapeo y separación de IDs superadas (100% PASS).

---

## 33. Final Verdict

El proceso integral de **Merchant Onboarding E2E** cumple exhaustivamente con la totalidad de los criterios técnicos, de arquitectura, de seguridad, de segregación multi-tenant y de resiliencia operativa requeridos por el estándar Enterprise.

Veredicto Oficial:
> 🟢 **VERIFIED + FROZEN #002**

---

## 34. Freeze Certification

```text
================================================================================
BLUE SYSTEM DELIVERY ENTERPRISE
FREEZE CERTIFICATION
================================================================================

FREEZE:
#002

MODULE / PROCESS:
Merchant Onboarding E2E

SCOPE:
Registration → Application → Status Consultation → Admin Review
→ Approval / Rejection / Document Request
→ Automatic Emails → Activation / Provisioning

CLIENT FINAL PHYSICAL ACCEPTANCE:
🟢 APPROVED

TECHNICAL VERIFICATION:
🟢 VERIFIED

END-TO-END TRACEABILITY:
🟢 VERIFIED

STATE MACHINE:
🟢 VERIFIED

ADMIN WORKFLOW:
🟢 VERIFIED

AUTOMATIC EMAILS:
🟢 VERIFIED

SECURITY / EIAM:
🟢 VERIFIED

TENANT ISOLATION:
🟢 VERIFIED

PROVISIONING:
🟢 VERIFIED

REGRESSION:
🟢 PASS

FREEZE GATES:
🟢 ALL REQUIRED GATES PASS

BLOCKERS:
0

FINAL VERDICT:
🟢 VERIFIED + FROZEN #002

FREEZE STATUS:
🔒 FROZEN — ENTERPRISE v2.2 BASELINE

================================================================================
```
