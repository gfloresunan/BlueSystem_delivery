# BSD — FEATURE ENGINE & ENFORCEMENT AUDIT REPORT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. REGLA DE SEGURIDAD CRÍTICA
> [!IMPORTANT]
> **La ocultación visual de elementos en la UI (`hideButton()`) NO constituye seguridad ni autorización.**  
> Toda decisión de acceso debe validarse en el servidor mediante Cloud Functions, Custom Claims JWT y Firestore Security Rules.

---

## 2. AUDITORÍA DE ENFORCEMENT POR CAPA

### A. Capa Backend & Cloud Functions
- **Motor:** `TenantFeatureEngine` (`functions/src/domain/whitelabel/tenantFeatureEngine.ts`) y `Gatekeeper` (`functions/src/domain/gatekeeper/gatekeeper.ts`).
- **Enforcement en Callables HTTPS:**
  - `registerTenantDomain` / `verifyTenantDomainDns`: Valida explícitamente `TenantFeatureEngine.isDomainTypeAllowed(tenantTier, domainType)`.
  - `createOrUpdateCoupon`: Exige validación de rol y scope de negocio en backend.
  - `adminSaveEmailTemplate`: Restringido exclusivamente a `isPlatformAdmin` y verificado por token JWT.
  - `executeCourierSettlement`: Transacción atómica ejecutada en backend con validación de rol de supervisor.
- **Estado:** 🟢 `REAL / OPERACIONAL Y BLINDADO`.

### B. Capa Base de Datos (Firestore Rules)
- **Motor:** `firestore.rules` (1,107 líneas de reglas declarativas).
- **Validaciones:**
  - `isTenantMember(resourceTenantId)`: Compara el claim inmutable del token JWT contra el documento de Firestore.
  - `ownsBusiness(resourceBusinessId)`: Impide que un comercio lea o escriba datos de otro.
  - `isAppCheckVerified()`: Exige token de App Check válido (reCAPTCHA Enterprise / Play Integrity).
  - Bloqueo de escrituras de balance y subledgers desde clientes: `courier_cash_ledger`, `courier_balances`, `financial_events` tienen `allow write: if false;` (solo Admin SDK).
- **Estado:** 🟢 `REAL / OPERACIONAL Y BLINDADO`.

### C. Capa Frontend Web (Merchant Web)
- **Motor:** `useGatekeeper.ts`.
- **Comportamiento:** Intercepta la navegación entre módulos (Dashboard, Pedidos, Torre de Control, Finanzas, etc.). Si un módulo no está incluido en el plan del Tenant o el rol del usuario, emite una decisión denegada con motivo específico (`ROLE_UNAUTHORIZED_FOR_MODULE`, `MODULE_DISABLED_BY_TENANT_FEATURE_FLAG`, `ENTITLEMENT_MISSING`).
- **Estado:** 🟢 `REAL / OPERACIONAL`.

### D. Capa Mobile Android (Customer & Courier App)
- **Motor:** `app/src/main/java/com/example/whitelabel/ClientExperienceConfig.kt` (`EntitlementDrivenNavigation`).
- **Brecha:** Los modelos y filtros existen en Kotlin, pero los composables de navegación principal (`CustomerHomeScreen.kt`, `CourierMainDashboardScreen.kt`) aún renderizan barras de navegación con items fijos.
- **Estado:** 🟡 `PARTIAL / LÓGICA EXISTE, ENLACE DE VISTA PENDIENTE`.
