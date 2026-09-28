# BSD — TENANT ENGINE AUDIT REPORT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. ESTADO DEL TENANT ENGINE

### A. Colección `/tenants` y Estructura de Datos
- **Ruta Firestore:** `/tenants/{tenantId}`
- **Schema:** `TenantEntity` en `functions/src/domain/platform/models.ts` (líneas 98-114).
  - `tenantId` (string, inmutable)
  - `name`, `legalName`, `slug`
  - `type` (`MARKETPLACE` | `AGENCY` | `WHITE_LABEL_COMMERCE` | `ENTERPRISE`)
  - `status` (`DRAFT` | `ACTIVE` | `SUSPENDED` | `MIGRATION_PENDING` | `ARCHIVED`)
  - `primaryBrandId`, `subscriptionId`, `defaultAppConfigId`
  - `schemaVersion: "1.0"`
  - `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- **Estado:** 🟢 `REAL / OPERACIONAL`.

### B. Ciclo de Vida y Transiciones
- **Manejador Backend:** `functions/src/domain/provisioning/lifecycleStateMachine.ts`.
- **Transiciones soportadas:**
  - `DRAFT` → `ACTIVE` (vía aprovisionamiento exitoso)
  - `ACTIVE` → `SUSPENDED` (vía acción administrativa o falta de pago)
  - `SUSPENDED` → `ACTIVE` (reactivación)
  - `ACTIVE` | `SUSPENDED` → `ARCHIVED` (deprovisioning seguro)
- **Estado:** 🟢 `REAL / OPERACIONAL`.

### C. Aislamiento y Custom Claims
- **Claim JWT:** `tenantId` inyectado vía `functions/src/triggers/auth.ts` (`setUserClaims`, `setMembershipClaims`).
- **Resolución Contextual:** `switchActiveTenantContext` en `functions/src/callables/identity.ts`.
- **Reglas de Seguridad:** `firestore.rules` líneas 52-70 (`getTenantId()`, `isTenantMember(tenantId)`, `canAccessTenant(tenantId)`).
- **Estado:** 🟢 `REAL / OPERACIONAL`.

### D. Flota en Producción / Canary
- **Tenants Activos en Canary:**
  1. `ten-live-commercial-01` (Tenant 01 - Certificado)
  2. `ten-live-commercial-02` (Tenant 02 - Certificado)
  3. `ten-live-commercial-03` (Tenant 03 - Observación C2D.21 / C2D.22)
- **Tenant 04:** 🔒 **ESTRICTAMENTE NO AUTORIZADO / INEXISTENTE**.
- **Estado:** 🟢 `CERTIFICADO EN OBSERVACIÓN`.

### E. Brecha en Tenant Engine
- **Brecha:** No existe interfaz gráfica en el Admin Web para la creación de nuevos Tenants ni para la gestión de su ciclo de vida sin intervención técnica.
- **Clasificación General:** 🟢 **REAL / BACKEND & SEGURIDAD OPERACIONAL** (🟡 Interfaz Visual Pendiente).
