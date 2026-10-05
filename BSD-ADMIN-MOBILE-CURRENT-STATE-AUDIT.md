# BSD-ADMIN-MOBILE-CURRENT-STATE-AUDIT.md
## PROTOCOLO: `BSD-ADMIN-MOBILE-ENTERPRISE-CONSOLIDATION-001`
### FASE 0 — DISCOVERY & AUDITORÍA FORENSE READ-ONLY DEL SISTEMA ADMINISTRATIVO

---

## 1. RESUMEN EJECUTIVO & ALCANCE

El presente documento constituye la **Fase 0 (Discovery & Forensic Audit)** para la implementación y consolidación del rol **ADMIN** en la plataforma móvil nativa Android (Kotlin + Jetpack Compose + Material 3) bajo el protocolo `BSD-ADMIN-MOBILE-ENTERPRISE-CONSOLIDATION-001`.

La premisa inmutable es:
> **ONE CORE / ONE CODEBASE / ZERO FORKS.**
> La aplicación Android Admin no crea un sistema paralelo ni una fuente de verdad móvil; opera como un cliente oficial del **BlueSystem Canonical Core**, garantizando paridad bidireccional inmediata con Admin Web, Merchant Web, Courier App y Customer App.

---

## 2. INVENTARIO COMPLETO DEL ESTADO ACTUAL

### 2.1. Rutas y Navegación Android Actual

| Ruta / Screen | Archivo Origen | Estado Actual | Observación Técnica |
|---|---|---|---|
| `Screen.Admin` (`"admin"`) | [MainActivity.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L573) | 🟡 Parcial / Monolítico | Renderiza [AdminDashboardScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/AdminDashboardScreen.kt) con pestañas internas (Orders, Drivers, Commerce, Users, Finance). No posee Drawer Enterprise ni estructura de Live Operations Cards. |
| `"admin_users"` | [MainActivity.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L592) | 🟡 Básico / Legacy | Renderiza [AdminUsersScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/admin/AdminUsersScreen.kt). Permite buscar usuarios y aprobar roles de forma genérica. Desconectado de EIAM v2.2. |
| `EiamAdminCenterScreen` | [EiamAdminCenterScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/eiam/presentation/admin/EiamAdminCenterScreen.kt) | 🔴 Mock / Stub | Pantalla no enlazada en `MainActivity.kt`. Contiene pestañas con mocks hardcodeados (`usr_admin_1`). |
| `MapaGlobalAdmin` | [MapaGlobalAdmin.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MapaGlobalAdmin.kt) | 🔴 Legacy | Componente aislado de mapa, no adaptado al motor de telemetría reactiva `/ubicaciones_repartidores`. |
| `AdminMotorizadosPanel` | [AdminMotorizadosPanel.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/AdminMotorizadosPanel.kt) | 🔴 Legacy | Panel secundario no integrado en el flujo canónico. |

---

### 2.2. ViewModels y Capa de Presentación

| Componente | Archivo | Responsabilidad Actual | Brecha / Gap Identificado |
|---|---|---|---|
| `SplashViewModel` | [SplashViewModel.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/splash/SplashViewModel.kt) | Resuelve `AppRole.ADMIN` y emite `NavigationEvent.NavigateToAdmin`. | Funcional y canónico. Ya utiliza `AppRoleResolver.resolveRole()`. |
| `AdminUsersViewModel` | [AdminUsersViewModel.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/admin/AdminUsersViewModel.kt) | Gestiona lista de usuarios y aprobación de solicitudes directas sobre `/users`. | No utiliza EIAM ni genera auditoría formal `/audit_events`. |
| `EiamAdminViewModel` | [EiamAdminViewModel.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/eiam/presentation/admin/EiamAdminViewModel.kt) | ViewModel desconectado con stubs mock. | Debe conectarse con los 12 engines y repositorios de `com.example.eiam`. |

---

### 2.3. Motores (Engines), Casos de Uso y Repositorios Existentes

El backend de dominio en Android cuenta con una sólida arquitectura ya implementada que **DEBE REUTILIZARSE AL 100%**:

1. **EIAM Domain Engines ([eiam/domain/engine/](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/eiam/domain/engine)):**
   - `PermissionEngine.kt`: Matriz de permisos RBAC/ABAC de 12 niveles.
   - `RoleEngine.kt`: Jerarquía de roles y transiciones de roles.
   - `OrganizationEngine.kt`: Holding, multi-holding y estructura de grupos.
   - `EmployeeEngine.kt`: Asignación de sucursales y permisos de staff.
   - `SessionEngine.kt`: Gestión de sesiones activas, tokens y dispositivos.
   - `DeviceRiskEngine.kt`: Cálculo de TrustScore, emuladores y riesgos de hardware.
   - `IdentityTimelineEngine.kt`: Auditoría de línea de tiempo de identidades.
   - `InvitationEngine.kt`: Ciclo de vida de invitaciones multicanal.
   - `MembershipEngine.kt`: Membresías multi-tenant y roles asociados.
   - `MigrationEngine.kt`: Homologación de esquemas v2.1 a v3.0.
   - `BranchEngine.kt` & `BusinessEngine.kt`: Gobernanza de entidades comerciales.

2. **Enterprise & Policy Infrastructure ([enterprise/](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/enterprise)):**
   - `PolicyEngineImpl.kt`: Evaluación de políticas de seguridad.
   - `AuditLogger.kt`: Registro inmutable de eventos en `/audit_events`.
   - `FeatureFlagEngine`: Gobernanza de flags operativos y experimentales.
   - `TenantSettingsManager`: Contexto multi-tenant y aislamiento.

3. **Core Firebase Management ([FirebaseManager.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt)):**
   - `listenToPedidos()`: Snapshot listener reactivo sobre `/orders`.
   - `listenToDrivers()`: Snapshot listener reactivo sobre `/couriers`.
   - `obtenerFlujoMotorizadosActivos()`: Flujo GPS en vivo sobre `/ubicaciones_repartidores`.
   - `listenToAllUsers()`: Flujo reactivo sobre `/users`.

---

## 3. AUDITORÍA BACKEND & CLOUD FUNCTIONS CANÓNICAS

El backend en `functions/src/` dispone de callables autoritativos ya probados y certificados. **Queda terminantemente prohibido duplicar o crear callables paralelos.**

| Módulo Funcional | Cloud Function Callable Canónica | Archivo Backend | Colecciones Firestore Afectadas |
|---|---|---|---|
| **Solicitudes Comercio** | `submitMerchantApplication`<br>`adminApproveMerchantApplication`<br>`adminRejectMerchantApplication` | [merchant.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchant.ts)<br>[admin.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/admin.ts) | `/merchant_applications`<br>`/businesses`<br>`/users`<br>`/audit_events` |
| **Solicitudes Motorizado** | `submitCourierApplication`<br>`adminApproveCourierApplication`<br>`adminRejectCourierApplication` | [courierOnboarding.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/courierOnboarding.ts) | `/courier_applications`<br>`/couriers`<br>`/users`<br>`/audit_events` |
| **Perfil Motorizado** | `adminApproveCourierProfileChanges`<br>`adminRejectCourierProfileChanges` | [courierProfile.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/courierProfile.ts) | `/courier_profile_requests`<br>`/couriers`<br>`/audit_events` |
| **Caja & Cierres Diarios** | `adminApproveCourierDailyClosure`<br>`adminRejectCourierDailyClosure` | [courierClosureCallables.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/courierClosureCallables.ts) | `/courier_daily_closures`<br>`/courier_balances`<br>`/courier_cash_ledger`<br>`/financial_events` |
| **Liquidaciones Comerciales** | `adminGeneratePreSettlement`<br>`adminRecordSettlementPayment`<br>`adminResolveSettlementDispute` | [merchantSettlement.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/merchantSettlement.ts) | `/merchant_settlements`<br>`/financial_events`<br>`/audit_events` |
| **Identidad & EIAM** | `adminSetUserClaims`<br>`adminRevokeSession`<br>`adminUpdateUserRole` | [identity.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/identity.ts)<br>[rbac.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/rbac.ts) | Custom Claims Auth<br>`/users`<br>`/sessions`<br>`/audit_events` |
| **Soporte & Tickets** | Gestión reactiva directa Firestore + subcolección `/messages` | [firestore.rules](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L1089-L1124) | `/support_tickets`<br>`/support_tickets/{id}/messages` |
| **Configuración Global** | `adminUpdateSystemConfig`<br>`adminUpdatePricingPolicy` | [admin.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/admin.ts)<br>[xToYAdmin.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/xToYAdmin.ts) | `/system_config/global`<br>`/platform_config/pricing`<br>`/audit_events` |

---

## 4. AUDITORÍA ADMIN WEB & MAPA DE PARIDAD

El panel administrativo web en `panel-admin/public/js/dashboard/` define la referencia funcional completa que debe proyectarse de forma móvil y ergonómica en Android:

```text
ADMIN WEB MODULES                           ANDROID ADMIN EQUIVALENT (ESTRUCTURA OBJETIVO)
├── dashboard.js / liveOperations.js   ───►  HOME: AdminDashboardScreen (Live Operations KPIs)
├── liveRestaurants.js (Applications) ───►  MÓDULO 1: AdminMerchantRequestsScreen
├── liveCouriers.js (Applications)    ───►  MÓDULO 2: AdminCourierRequestsScreen
├── liveCouriers.js (Profile Edits)   ───►  MÓDULO 3: AdminCourierProfileManagementScreen
├── users.js / identityAdminDrawer.js  ───►  MÓDULO 4: AdminIdentityCenterScreen (EIAM Connected)
├── supportCenter.js                   ───►  MÓDULO 5: AdminSupportCenterScreen
├── courierCashControl.js              ───►  MÓDULO 6: AdminCourierCashCenterScreen
├── liveMap.js / liveCouriers.js       ───►  MÓDULO 7: AdminLiveCourierMonitorScreen
├── liveRestaurants.js (Stores/Branch) ───►  MÓDULO 8: AdminEnterpriseCommerceScreen
└── config.js / deliveryExpress.js     ───►  MÓDULO 9: AdminGlobalConfigurationScreen
```

---

## 5. AUDITORÍA DE NOTIFICACIONES, ROUTER Y DEEP LINKS

En [NotificationRouter.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/navigation/NotificationRouter.kt):
- Actualmente soporta navegación de `CUSTOMER`, `COURIER` y `MERCHANT`.
- Para `ADMIN` solo existe un fallback genérico que apunta a `Screen.Admin.route`.
- **Gaps a incorporar:**
  1. Tipos de eventos administrativos canónicos:
     - `ADMIN_NEW_MERCHANT_REQUEST` ➔ `bluesystem://admin/merchant-request/{id}`
     - `ADMIN_NEW_COURIER_REQUEST` ➔ `bluesystem://admin/courier-request/{id}`
     - `ADMIN_COURIER_PROFILE_CHANGE` ➔ `bluesystem://admin/courier/{id}`
     - `ADMIN_SUPPORT_TICKET_CREATED` / `ADMIN_SUPPORT_TICKET_PRIORITY` ➔ `bluesystem://admin/support/{ticketId}`
     - `ADMIN_COURIER_CLOSURE_SUBMITTED` / `ADMIN_COURIER_CASH_DIFFERENCE` ➔ `bluesystem://admin/courier-closure/{closureId}`
     - `ADMIN_COMMERCE_STATUS_CHANGED` ➔ `bluesystem://admin/commerce/{businessId}`
     - `ADMIN_CONFIGURATION_CHANGED` ➔ `bluesystem://admin/configuration`
  2. Role Guard estricto para Admin con fallback seguro si no tiene permisos.

---

## 6. MATRIZ DE GAPS Y RIESGOS FORENSES

| Módulo | Estado Actual | Causa Raíz (Root Cause) | Riesgo si se hace Bypass | Ruta Recomendada |
|---|---|---|---|---|
| **Dashboard** | Pestañas monolíticas y cálculos en memoria básica | No existía diseño reactivo unificado de KPIs de 5 dominios | Inconsistencia de conteos con respecto a Web | Implementar `AdminDashboardScreen` con 5 bloques de métricas reactivas derivadas de las consultas canónicas de Firestore. |
| **Solicitudes Comercio** | Pestaña básica de usuarios | La app móvil no leía la colección canónica `/merchant_applications` | Aprobación incompleta sin claims ni provisionamiento | Implementar `AdminMerchantRequestsScreen` consumiendo `/merchant_applications` y llamando a Cloud Functions autoritativas. |
| **Solicitudes Courier** | Inexistente en móvil | No se había implementado UI móvil para `/courier_applications` | Aprobación manual sin validar expediente ni licencia | Implementar `AdminCourierRequestsScreen` con visor de documentos y callable `adminApproveCourierApplication`. |
| **Perfil Courier** | Inexistente en móvil | Solo existía diálogo para que el courier solicite cambios | Mutación no autorizada directa sobre `/couriers` | Implementar `AdminCourierProfileManagementScreen` conectado a `/courier_profile_requests`. |
| **EIAM / Identidades** | UI existe pero como Stub | La UI no estaba conectada a los 12 engines ya construidos | Duplicar lógica RBAC o saltarse auditoría | Conectar `AdminIdentityCenterScreen` con `PermissionEngine`, `RoleEngine`, `SessionEngine` y repositorios EIAM existentes. |
| **Soporte Enterprise** | Solo existe cliente móvil Customer | No se había expuesto la consola de soporte al Admin en Compose | Pérdida de SLA de atención de incidencias en ruta | Implementar `AdminSupportCenterScreen` consumiendo `/support_tickets` y chat bidireccional. |
| **Caja de Motorizados** | Solo pantalla de courier para enviar cierre | Falta la consola de revisión administrativa y conciliación | Descuadre financiero o bypass de auditoría contable | Implementar `AdminCourierCashCenterScreen` conectado a `/courier_daily_closures` y callable `adminApproveCourierDailyClosure` (Zero Client Ledger Mutation). |
| **Live Courier Monitor** | Componente legado no reactivo | No se integraba con el stream de telemetría `/ubicaciones_repartidores` | Exceso de lecturas GPS o datos desactualizados | Implementar `AdminLiveCourierMonitorScreen` con suscripción eficiente a ubicaciones activas. |
| **Comercios & Sucursales** | Lista básica en pestaña de Dashboard | No administraba sucursales ni estado operacional detallado | Desincronización con catálogo y marketplace | Implementar `AdminEnterpriseCommerceScreen` con gestión integral de comercios y sucursales. |
| **Configuración Global** | Inexistente en móvil | Se dependía exclusivamente del panel web | Modificación accidental de reglas de tarificación congeladas (ADR-015/ADR-026) | Implementar `AdminGlobalConfigurationScreen` con snapshot inmutable y registro en `/audit_events`. |

---

## 7. DICTAMEN DE AUDITORÍA Y PLAN DE EJECUCIÓN QUIRÚRGICA

### Conclusión Técnica de la Fase 0:
1. **La base de dominio y seguridad está completa y sólida**: Firestore Rules (EIAM v2.1/v3), Cloud Functions autoritativas y engines de dominio Android ya existen.
2. **No se requiere crear ninguna nueva colección paralela ni nuevo ledger financiero**: Las fuentes canónicas `/orders`, `/deliveryTrips`, `/users`, `/couriers`, `/merchant_applications`, `/courier_applications`, `/courier_daily_closures`, `/financial_events`, `/system_config` y `/support_tickets` cubren el 100% de las necesidades.
3. **El alcance es puramente de Presentación, Navegación, Reactividad y Enlace con el Core Existente**.

### Secuencia de Fases de Implementación:
- **FASE 1:** Shell de Navegación, Home Canónico, Drawer Enterprise y Role Guards.
- **FASE 2:** Dashboard Live Operations con KPIs reactivos en tiempo real.
- **FASE 3:** Módulo de Solicitudes (Comercio & Motorizado) con callables autoritativos.
- **FASE 4:** Módulo de Flota (Gestión Perfil Courier & Live Courier Monitor con Telemetría).
- **FASE 5:** Módulo de Identidades EIAM conectado a los 12 engines reales.
- **FASE 6:** Módulo de Centro de Soporte & Ayuda Enterprise (Tickets + Chat).
- **FASE 7:** Módulo de Caja de Motorizados & Cierres Diarios (Arqueos, Depósitos, Aprobación Server-Authoritative).
- **FASE 8:** Módulo de Comercios & Sucursales Enterprise.
- **FASE 9:** Módulo de Configuración Global, Comisiones & Snapshots Inmutables.
- **FASE 10:** Notification Center Enterprise, Deep Linking y Matriz de Certificación E2E.
