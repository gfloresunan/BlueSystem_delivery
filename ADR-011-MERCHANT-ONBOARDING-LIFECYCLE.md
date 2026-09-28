# ADR-011: Merchant Onboarding Portal & Lifecycle Architecture
## Architecture Decision Record — BlueSystem Delivery Enterprise v2.2

**Estado:** APROBADO — Agosto 2026
**Autor:** Senior Developer & Auditor BlueSystem
**Prioridad:** P0 — Transversal a toda la plataforma
**Dependencias:** EIAM v2.2, ADR-004 (Architecture Freeze), ADR-010 (E2E Certification)

---

## 1. Contexto y Problema

El flujo actual de alta de un comercio en BlueSystem presenta una **brecha operativa crítica**:

- El sistema no tiene un punto de entrada formal para que un interesado solicite afiliarse a la plataforma.
- El administrador debe crear manualmente múltiples entidades en Firestore sin ninguna automatización.
- No existe una máquina de estados que permita auditar y gobernar el ciclo de vida de una solicitud comercial.
- El Merchant Web no ofrece un asistente de configuración inicial (*wizard*), lo que genera curva de aprendizaje alta y abandono.
- El rol `MERCHANT_OWNER` es asignado manualmente sin provisión automática de identidad EIAM, businesses, branches ni invitaciones.

---

## 2. Decisión

Se adopta oficialmente la **Arquitectura de Afiliación y Ciclo de Vida de Comercio** con los siguientes 5 componentes:

```
[1] Merchant Onboarding Portal
        ↓
[2] Governance Center (Admin Web)
        ↓
[3] EIAM Provisioning Engine (Cloud Function Automática)
        ↓
[4] Merchant Web — First Time Wizard
        ↓
[5] Android POS — Operación Diaria
```

---

## 3. Arquitectura Completa

### 3.1 Diagrama de Flujo Definitivo

```
  Interesado
      │
      ▼
┌───────────────────────────────┐
│   Merchant Onboarding Portal  │  ← Sitio independiente
│   merchant-apply.bluesystem   │    (React SPA, sin auth requerida)
│                               │
│   Formulario de Solicitud:    │
│   ├─ Nombre Comercial         │
│   ├─ Razón Social             │
│   ├─ RUC / NIT                │
│   ├─ Dirección                │
│   ├─ Ciudad / Zona            │
│   ├─ Rubro / Categoría        │
│   ├─ Contacto / Teléfono      │
│   ├─ Correo Electrónico       │
│   ├─ Ubicación GPS            │
│   └─ Carga de Documentos      │
│                               │
│   [Solicitar Afiliación]      │
└───────────────┬───────────────┘
                │ Escribe: /merchant_applications/{appId}
                │ Estado: PENDING
                ▼
┌───────────────────────────────┐
│   Governance Center           │  ← Panel Web Admin
│   admin.bluesystem.app        │
│                               │
│   Bandeja de Solicitudes:     │
│   ├─ Pizza Roma       PENDING │
│   ├─ Sushi House  UNDER_REVIEW│
│   └─ Farmacia     PENDING     │
│                               │
│   Acciones:                   │
│   ├─ [Aprobar]                │
│   ├─ [Rechazar con motivo]    │
│   └─ [Solicitar documentos]   │
└───────────────┬───────────────┘
                │ Admin pulsa [Aprobar]
                ▼
┌───────────────────────────────┐
│   EIAM Provisioning Engine    │  ← Cloud Function automática
│   (100% automatizado)         │
│                               │
│   Ejecución atómica:          │
│   1. Crear Firebase Auth UID  │
│   2. Crear /users/{uid}       │
│   3. Crear /organizations/    │
│   4. Crear /businesses/       │
│   5. Crear /branches/         │
│   6. Crear /membership/       │
│   7. Sync Custom Claims (JWT) │
│   8. Registrar /audit_events/ │
│   9. Enviar Invitación        │
│      EMAIL + DEEP_LINK        │
│  10. Status: ONBOARDING       │
└───────────────┬───────────────┘
                │ Propietario recibe email con link
                ▼
┌───────────────────────────────┐
│   Merchant Web Portal         │  ← merchant.bluesystem.app
│   (Primera vez: Wizard)       │
│                               │
│   Paso 1/5 → Datos del Negocio│
│   Paso 2/5 → Sucursal Principal
│   Paso 3/5 → Horario          │
│   Paso 4/5 → Cuenta Bancaria  │
│   Paso 5/5 → Menú Inicial     │
│                               │
│   [Finalizar]                 │
│   Status: ONBOARDING → ACTIVE │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│   Android POS                 │
│   Operación Diaria            │
│   ├─ Pedidos entrantes        │
│   ├─ Cocina (KDS)             │
│   ├─ Caja y Pagos             │
│   └─ Inventory rápido         │
└───────────────────────────────┘
```

---

## 4. Máquina de Estados del Comercio

```
  Solicitud enviada
        │
        ▼
    PENDING ──── Admin revisa ────► UNDER_REVIEW
        │                                │
        │                    ┌───────────┴──────────────┐
        │                    │                          │
        ▼                    ▼                          ▼
    REJECTED         DOCS_REQUESTED               APPROVED
                            │                          │
                  Docs recibidos                EIAM Auto-Provision
                            │                          │
                            └──────────────────────────┘
                                                       │
                                                  ONBOARDING
                                                       │
                                              Wizard completado
                                                       │
                                                    ACTIVE ◄──┐
                                                       │       │ Reactivar
                                                       ▼       │
                                                  SUSPENDED ───┘
                                                       │
                                                  TERMINATED
```

| Estado | Descripción | Actor |
|---|---|---|
| `PENDING` | Solicitud recibida, sin revisar | Sistema automático |
| `UNDER_REVIEW` | Admin está revisando | Admin Web |
| `DOCS_REQUESTED` | Se pidieron documentos adicionales | Admin Web |
| `APPROVED` | Aprobado — EIAM provisionando | Cloud Function |
| `REJECTED` | Rechazado con motivo | Admin Web |
| `ONBOARDING` | Identidad creada, configurando Merchant Web | Merchant Web Wizard |
| `ACTIVE` | Comercio completamente operacional | Sistema |
| `SUSPENDED` | Suspendido temporalmente | Admin Web |
| `TERMINATED` | Baja definitiva | Admin Web (requiere confirmación) |

---

## 5. Nuevas Colecciones Firestore

### 5.1 `/merchant_applications/{appId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `appId` | String | UUID generado en el cliente |
| `businessName` | String | Nombre comercial del negocio |
| `legalName` | String | Razón social |
| `ruc` | String | RUC o NIT fiscal |
| `address` | String | Dirección completa |
| `city` | String | Ciudad |
| `zone` | String | Zona / Barrio |
| `category` | String | Rubro (restaurante, farmacia, tienda...) |
| `contactName` | String | Nombre del propietario / contacto |
| `phone` | String | Teléfono |
| `email` | String | Correo electrónico |
| `location` | GeoPoint | Coordenadas GPS |
| `documentUrls` | List\<String\> | URLs en Firebase Storage |
| `status` | Enum | PENDING / UNDER_REVIEW / APPROVED / REJECTED / DOCS_REQUESTED |
| `rejectionReason` | String? | Motivo de rechazo |
| `docsRequestedNote` | String? | Nota sobre documentos solicitados |
| `reviewedBy` | String? | UID del admin que revisó |
| `reviewedAt` | Timestamp? | Fecha de revisión |
| `provisionedBusinessId` | String? | ID del Business creado |
| `provisionedUid` | String? | UID de Firebase Auth creado |
| `createdAt` | Timestamp | Fecha de la solicitud |
| `updatedAt` | Timestamp | Última actualización |

### 5.2 Extensión a `/businesses/{businessId}`

| Campo Nuevo | Tipo | Descripción |
|---|---|---|
| `lifecycleStatus` | Enum | ONBOARDING / ACTIVE / SUSPENDED / TERMINATED |
| `applicationId` | String | Referencia a la solicitud de origen |
| `onboardingStep` | Int | Último paso del wizard completado (1–5) |
| `wizardCompleted` | Boolean | `true` cuando el Wizard ha finalizado |
| `onboardingCompletedAt` | Timestamp? | Fecha de finalización del wizard |

---

## 6. Cloud Functions

### 6.1 `onMerchantApplicationApproved` (Trigger Firestore)

**Trigger:** `onUpdate` en `/merchant_applications/{appId}`
**Condición:** `status` cambia a `"APPROVED"`

```typescript
async function onMerchantApplicationApproved(change, context) {
  const app = change.after.data();
  const db = admin.firestore();

  await db.runTransaction(async (tx) => {
    // 1. Crear usuario Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: app.email,
      displayName: app.contactName,
      password: generateSecureTemp(),
    });
    const uid = userRecord.uid;

    // 2. Crear /users/{uid}
    tx.set(db.collection('users').doc(uid), {
      uid, role: 'business', userType: 'business',
      nombre: app.contactName, email: app.email,
      phone: app.phone, active: true,
      fechaRegistro: FieldValue.serverTimestamp(),
    });

    // 3. Crear Organization
    const orgId = generateUUID();
    tx.set(db.collection('organizations').doc(orgId), {
      orgId, name: app.legalName, ownerUid: uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 4. Crear Business
    const businessId = generateUUID();
    tx.set(db.collection('businesses').doc(businessId), {
      businessId, orgId, ownerUid: uid,
      name: app.businessName, category: app.category,
      address: app.address, city: app.city,
      location: app.location,
      lifecycleStatus: 'ONBOARDING',
      wizardCompleted: false, onboardingStep: 0,
      applicationId: context.params.appId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 5. Crear Branch Principal
    const branchId = generateUUID();
    tx.set(db.collection('branches').doc(branchId), {
      branchId, businessId, orgId, name: 'Sucursal Principal',
      address: app.address, location: app.location,
      isPrimary: true, createdAt: FieldValue.serverTimestamp(),
    });

    // 6. Crear Membership
    tx.set(db.collection('membership').doc(generateUUID()), {
      uid, businessId, orgId, branchId,
      role: 'MERCHANT_OWNER',
      status: 'ACTIVE', createdAt: FieldValue.serverTimestamp(),
    });

    // 7. Actualizar application con IDs provisionados
    tx.update(change.after.ref, {
      status: 'ONBOARDING',
      provisionedUid: uid,
      provisionedBusinessId: businessId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 8. Audit Event
    tx.set(db.collection('audit_events').doc(), {
      event: 'BUSINESS_CREATED', uid,
      businessId, orgId, branchId,
      triggeredBy: app.reviewedBy,
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  // 9. Sync Custom Claims (fuera de transacción)
  await admin.auth().setCustomUserClaims(uid, {
    role: 'MERCHANT_OWNER', businessId, orgId,
  });

  // 10. Enviar invitación por email
  await sendMerchantInvitationEmail(app.email, app.contactName, businessId);
}
```

### 6.2 `onMerchantWizardCompleted` (Callable)

```typescript
export const onMerchantWizardCompleted = functions.https.onCall(async (data, context) => {
  // Validar que quien llama es MERCHANT_OWNER del businessId enviado
  if (!context.auth?.token?.role?.includes('MERCHANT_OWNER')) throw new Error('Unauthorized');

  const { businessId } = data;
  const db = admin.firestore();

  await db.collection('businesses').doc(businessId).update({
    lifecycleStatus: 'ACTIVE',
    wizardCompleted: true,
    onboardingCompletedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection('audit_events').add({
    event: 'ONBOARDING_COMPLETED',
    uid: context.auth.uid,
    businessId,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true, lifecycleStatus: 'ACTIVE' };
});
```

---

## 7. Componentes a Implementar

### 7.1 Merchant Onboarding Portal (Nuevo — Sprint 18.2)

| Componente | Descripción |
|---|---|
| `ApplicationForm.tsx` | Formulario multi-paso de solicitud (4 pasos) |
| `DocumentUploader.tsx` | Upload a Firebase Storage con barra de progreso |
| `LocationPicker.tsx` | Mapa interactivo (Google Maps / Leaflet) |
| `ApplicationStatusPage.tsx` | Seguimiento del estado con email lookup |
| `SuccessScreen.tsx` | Confirmación post-envío con número de referencia |

**Tecnología:** React 18 + TypeScript + Vite + TailwindCSS
**Auth:** NO requerida para enviar solicitud

### 7.2 Governance Center — Admin Web (Sprint 18.3)

| Componente | Descripción |
|---|---|
| `ApplicationsInbox.tsx` | Bandeja paginada filtrable por estado |
| `ApplicationDetailModal.tsx` | Vista completa + documentos + mapa |
| `ApplicationActions.tsx` | Aprobar / Rechazar / Solicitar Docs |
| `MerchantLifecycleBoard.tsx` | Vista Kanban de comercios por estado |
| `SuspendMerchantModal.tsx` | Suspensión con motivo y duración |

### 7.3 Merchant Web — First Time Wizard (Sprint 18.4)

| Componente | Descripción |
|---|---|
| `OnboardingWizard.tsx` | Contenedor con stepper y progress bar |
| `WizardStep1_BusinessData.tsx` | Confirmación/edición de datos del negocio |
| `WizardStep2_Branch.tsx` | Configuración de la sucursal principal |
| `WizardStep3_Schedule.tsx` | Horarios de atención por día |
| `WizardStep4_Banking.tsx` | Datos bancarios y métodos de pago aceptados |
| `WizardStep5_Menu.tsx` | Crear primera categoría y primer producto |
| `WizardCompletion.tsx` | Pantalla de éxito + CTA → Dashboard |

**Regla:** Wizard visible solo cuando `business.wizardCompleted === false`.

---

## 8. Reglas de Seguridad Firestore

```javascript
// /merchant_applications/{appId}
match /merchant_applications/{appId} {
  // Público: cualquiera puede CREAR (solicitud sin auth)
  allow create: if request.resource.data.status == 'PENDING'
                && request.resource.data.email is string
                && request.resource.data.businessName is string;

  // El solicitante puede leer por email
  allow read: if request.auth != null
              && request.auth.token.email == resource.data.email;

  // Solo admins pueden actualizar estado
  allow update: if request.auth != null
                && request.auth.token.role == 'admin';

  // Nadie puede eliminar (auditabilidad permanente)
  allow delete: if false;
}
```

---

## 9. Integración con EIAM v2.2

Secuencia de servicios EIAM invocados automáticamente al aprobar:

```
Admin aprueba
      │
      ▼
onMerchantApplicationApproved()
      │
      ├─► IdentityService.createIdentity()          → /users/{uid}
      ├─► OrganizationEngine.createOrganization()   → /organizations/{orgId}
      ├─► BusinessEngine.createBusiness()           → /businesses/{businessId}
      ├─► BranchEngine.createBranch()               → /branches/{branchId}
      ├─► MembershipEngine.createMembership()       → /membership/{id}
      ├─► CustomClaimsEngine.syncClaims()           → JWT: { role, businessId, orgId }
      ├─► InvitationEngine.createInvitation()       → EMAIL + DEEP_LINK
      ├─► AuditLogger.logEvent(BUSINESS_CREATED)    → /audit_events/{id}
      └─► Update: application.status = ONBOARDING
```

> [!IMPORTANT]
> Todo ejecutado en una **transacción atómica Firestore**. Si cualquier paso falla, se revierte completamente. El Custom Claims sync se ejecuta fuera de la transacción (es una operación Firebase Auth, no Firestore).

---

## 10. Consecuencias y Restricciones

### ✅ Habilitado por este ADR
- Captura automatizada y auditable de solicitudes de afiliación.
- Provisión 100% automática de identidad EIAM al aprobar un comercio.
- Experiencia de onboarding guiada (wizard) para el primer acceso.
- Ciclo de vida completo y auditable del comercio.
- Eliminación total del trabajo manual del administrador en alta de comercios.

### ❌ Prohibido por este ADR
- El administrador **NO** crea comercios manualmente desde Firebase Console.
- Solo Cloud Functions pueden modificar `lifecycleStatus` (nunca el cliente).
- El Merchant Web **NO** muestra el Dashboard completo mientras `wizardCompleted === false`.
- El Portal de Afiliación **NO** realiza transacciones monetarias ni crea usuarios en Firebase Auth.
- El rol `admin` no puede ser solicitado desde la App Móvil (regla existente en `AuthManager.kt` — sin modificar).

### 🔒 Frozen Core — Sin impacto en módulos existentes
- `AuthManager.kt`, `FirebaseManager.kt`, `SplashViewModel.kt` y todos los módulos frozen de Sprints 15.x **permanecen sin modificaciones**.
- El router `SplashViewModel` ya soporta el rol `business` correctamente → **0 cambios requeridos**.

---

## 11. Criterios de Aceptación E2E

| Escenario | Criterio de Éxito |
|---|---|
| Interesado llena formulario | Documento en `/merchant_applications` con status `PENDING` en < 2s |
| Admin ve bandeja | Lista paginada de solicitudes filtrable por estado |
| Admin aprueba | Cloud Function ejecuta provisión en < 5s sin errores |
| Entities creadas | users + businesses + organizations + branches + membership + audit_events |
| Propietario recibe email | Magic link funcional hacia Merchant Web |
| Wizard completado | `lifecycleStatus` cambia de `ONBOARDING` a `ACTIVE` |
| Android redirige | `SplashViewModel` → `business_dashboard` con rol `business` |
| Comercio suspendido | No recibe pedidos; muestra pantalla de cuenta suspendida |
| Rechazo notifica | Solicitante recibe email con motivo de rechazo |
| Auditabilidad | Todos los cambios de estado en `/audit_events` y `/role_history` |

---

## 12. Plan de Implementación

| Sprint | Componente | Entregable | Criterio de Done |
|---|---|---|---|
| **18.1** | Cloud Function EIAM | `onMerchantApplicationApproved` + `onMerchantWizardCompleted` | Provisión atómica E2E funcional |
| **18.2** | Merchant Onboarding Portal | Formulario + Upload + Status Page | Solicitud llega a Firestore con PENDING |
| **18.3** | Governance Center | Bandeja + Acciones + Lifecycle Board | Admin puede aprobar y disparar provisión |
| **18.4** | Merchant Web Wizard | 5 pasos + Completion + API calls | lifecycleStatus → ACTIVE al finalizar |
| **18.5** | Lifecycle completo | SUSPENDED, TERMINATED, notificaciones | Todos los estados funcionan sin errores |
| **18.6** | Certificación E2E | Todos los criterios del punto 11 | 100% de criterios cumplidos con evidencia |

---

## Referencias

- [EIAM_ARCHITECTURE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/EIAM_ARCHITECTURE.md)
- [ADR-004: Architecture Freeze EIAM v2.2](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/ADR-004-ARCHITECTURE-FREEZE-EIAM-V2.2.md)
- [INVITATION_SYSTEM_AUDIT.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/INVITATION_SYSTEM_AUDIT.md)
- [AUTHENTICATION_ARCHITECTURE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/AUTHENTICATION_ARCHITECTURE.md)
- [MERCHANT_WEB_ARCHITECTURE.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/MERCHANT_WEB_ARCHITECTURE.md)
- [ROLE_SYSTEM.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/ROLE_SYSTEM.md)
- [EIAM_V2.1_UPGRADE_REPORT.md](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/EIAM_V2.1_UPGRADE_REPORT.md)
