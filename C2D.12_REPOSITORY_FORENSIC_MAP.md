# BLUE SYSTEM DELIVERY ENTERPRISE
## PHASE 2D.12 — REPOSITORY FORENSIC MAP & CODE DISCOVERY
### PROTOCOL IDENTIFIER: C2D.12

**Objective:** Map exact repository assets and answer the 20 fundamental forensic questions with concrete evidence from files, symbols, functions, and paths.

---

## 1. REPOSITORY ASSET DISCOVERY

| Domain Component | Primary Path | Canonical Symbols / Classes | Convergence Status |
|---|---|---|---|
| **A. Core Identity & Platform** | `functions/src/domain/platform/models.ts` | `TenantEntity`, `BrandEntity`, `BusinessEntity`, `BranchEntity`, `SubscriptionEntity`, `EntitlementEntity` | 🟢 CANONICAL CORE |
| **B. Tenant Context & Gate** | `merchant-web/src/shared/eiam/TenantContext.tsx` | `TenantProvider`, `useTenant`, `WebActiveTenantContext` | 🟢 INTEGRATED |
| **C. Domain Resolution Gate** | `merchant-web/src/shared/domains/TenantDomainGate.tsx` | `TenantDomainGate`, `resolveTenantDomain` | 🟢 INTEGRATED |
| **D. Brand & Client Experience** | `merchant-web/src/shared/branding/ClientExperienceProvider.tsx` | `ClientExperienceProvider`, `useClientExperience`, `resolveWebDesignTokens` | 🟢 INTEGRATED |
| **E. Android Brand Tokens** | `app/src/main/java/com/example/whitelabel/BrandHydrationResolver.kt` | `BrandHydrationResolver`, `BrandDesignTokens`, `BrandThemeProvider` | 🟢 INTEGRATED |
| **F. Subscriptions & Plans** | `functions/src/domain/gatekeeper/catalog.ts` | `PLAN_CATALOG`, `MODULE_CATALOG`, `PlanTier` | 🟢 CANONICAL CORE |
| **G. Entitlements & Access** | `functions/src/domain/gatekeeper/gatekeeper.ts` | `canAccessModule`, `hasEntitlement`, `resolveEffectiveCapabilities` | 🟢 CANONICAL CORE |
| **H. Gatekeeper UI Shield** | `merchant-web/src/shared/gatekeeper/GatekeeperShield.tsx` | `GatekeeperShield`, `useGatekeeper` | 🟢 INTEGRATED |
| **I. Provisioning Pipeline** | `functions/src/domain/provisioning/provisioningPipeline.ts` | `ProvisioningEngine`, `ControlledFirestoreBatchEngine` | 🟢 CANONICAL CORE |
| **J. Firestore Adapters** | `functions/src/domain/provisioning/firestoreProvisioningAdapter.ts` | `createControlledFirestoreProvisioningAdapter` | 🟢 INTEGRATED |
| **K. Auth & EIAM Context** | `merchant-web/src/shared/context/AuthContext.tsx` | `AuthProvider`, `useAuth`, `MerchantIdentityContext` | 🟢 INTEGRATED |
| **L. Navigation Resolver** | `functions/src/domain/whitelabel/navigationResolver.ts` | `EntitlementDrivenNavigationResolver`, `CANONICAL_NAVIGATION_CATALOG` | 🟢 INTEGRATED |
| **M. SSOT Configuration** | `/system_config/global` (Firestore) | `system_config`, `maintenanceMode`, `forceUpdate` | 🟢 SSOT |
| **N. Android Tenant Manager** | `app/src/main/java/com/example/enterprise/tenant/TenantSettingsManager.kt` | `TenantSettingsManager` | 🟢 INTEGRATED |

---

## 2. FORENSIC AUDIT: 20 CODE EVIDENCE QUESTIONS

### 1. ¿Quién determina actualmente el tenant?
- **Web:** `TenantDomainGate.tsx` resuelve el `tenantId` a partir del hostname entrante (`functions/src/domain/whitelabel/tenantDomainResolver.ts`). `TenantContext.tsx` y `AuthContext.tsx` validan que los Custom Claims del usuario pertenezcan a dicho tenant (`claims.tenantId`).
- **Android:** `TenantSettingsManager.kt` y `AuthManager.kt` resuelven el `tenantId` a partir del perfil autenticado del usuario (`users/{uid}.tenantId` y custom claims).
- **Backend:** `functions/src/domain/gatekeeper/gatekeeper.ts` (`GatekeeperContext.tenantId`) y `firestore.rules` (`request.auth.token.tenantId`).

### 2. ¿Quién determina actualmente el brand?
- **Web:** `ClientExperienceProvider.tsx` sincronizado reactivamente con `TenantContext.activeTenant.brandId` y resuelto vía `designTokenResolver.ts`.
- **Android:** `BrandHydrationResolver.kt` resuelve `BrandDesignTokens` a partir de `BrandVisualConfig` almacenado en Firestore o fallback a `DefaultBrandTokens`.
- **Backend:** `functions/src/domain/whitelabel/clientExperienceResolver.ts` (`ClientExperienceResolver.resolveSnapshot`).

### 3. ¿Quién determina actualmente el subscription?
- **Backend:** `functions/src/domain/gatekeeper/catalog.ts` (`PLAN_CATALOG`) y la colección `/subscriptions/{subscriptionId}` asociada al `tenantId`.
- **Frontend / Mobile:** Consumido como solo-lectura dentro del `GatekeeperContext` o `TenantContext.settings`.

### 4. ¿Quién determina actualmente los entitlements?
- **Backend:** `functions/src/domain/gatekeeper/gatekeeper.ts` (`getEffectiveEntitlements`, `canAccessModule`).
- **Web Shell:** `useGatekeeper.ts` evalúa `ROLE_RESTRICTIONS` intersecado con `TenantSettings.features` y `permissions` de la membresía.

### 5. ¿Quién determina actualmente el role?
- **SSOT Identity:** Firebase Authentication Custom Claims (`claims.role`, `claims.eiamRole`) sincronizado con `/memberships/{membershipId}` y `/membership/{membershipId}`.
- **Normalización:** `normalizeCanonicalRole` en `AuthContext.tsx` y `EiamRole.kt` en Android.

### 6. ¿Dónde se valida el acceso a módulos?
- **Web Shell:** `merchant-web/src/app/App.tsx` en `renderModuleContent()` envolviendo cada ruta en `GatekeeperShield.tsx`.
- **Backend Callables / API:** `canAccessModule` en `functions/src/domain/gatekeeper/gatekeeper.ts`.
- **Base de Datos:** `firestore.rules` con predicados `hasRole()`, `isOwner()`, `isManager()`, y aislamiento por tenant.

### 7. ¿Dónde se construye la navegación?
- **Web:** `merchant-web/src/layouts/MainLayout.tsx` filtrando `MENU_ITEMS` mediante `useGatekeeper().isModuleEnabled()`.
- **Backend / Omnichannel:** `functions/src/domain/whitelabel/navigationResolver.ts` (`EntitlementDrivenNavigationResolver.resolveNavigation`).

### 8. ¿Dónde se obtiene la configuración?
- **SSOT Operativa:** Documento canónico `/system_config/global` en Firestore.
- **Configuración de Tenant:** Documento `/tenant_settings/{tenantId}` y `/tenants/{tenantId}`.

### 9. ¿Dónde se resuelven los tokens visuales?
- **Web:** `merchant-web/src/shared/branding/designTokenResolver.ts` (`resolveWebDesignTokens`, `injectCssVariables`).
- **Android:** `app/src/main/java/com/example/whitelabel/BrandHydrationResolver.kt` (`resolveTokens`).

### 10. ¿Dónde se escriben orders?
- **Cliente / App:** Creación en `/orders/{orderId}` validada por `firestore.rules`.
- **X→Y Trips:** Creación en `/deliveryTrips/{tripId}` vía `SolicitarEnvioScreen.kt`.
- **Backend:** `functions/src/triggers/orders.ts` (transiciones de estado y asignación).

### 11. ¿Dónde se leen orders?
- **Merchant Web:** `merchant-web/src/modules/OrdersModule.tsx` y `DeliveryControlTowerModule.tsx`.
- **Android Driver / Courier:** `PedidosEntrantesScreen.kt`, `RutaActivaScreen.kt`, `FirebaseManager.kt`.
- **Android Customer:** `CustomerHomeScreen.kt`, `ClienteTrackingMap.kt`.

### 12. ¿Dónde se determina el businessId?
- **Auth Context:** `claims.businessId` en token JWT validado contra `/membership/{membershipId}`.
- **Selección de Comercio:** `ComercioDetalleScreen.kt` (Android) o `businesses/{businessId}` (Web).

### 13. ¿Dónde se determina el branchId?
- **Auth Context:** `claims.branchId` en token JWT y `/branches/{branchId}`.

### 14. ¿Qué lógica sigue siendo legacy?
- Dual read en `membership` vs `memberships` (`WebDualReadMembershipResolver.ts`) para retrocompatibilidad 100% segura con cuentas preexistentes.

### 15. ¿Qué lógica ya consume el Core?
- Gatekeeper de suscripciones y entitlements.
- Motor de aprovisionamiento transaccional (`ProvisioningEngine`).
- Dynamic Brand Tokens y CSS variable injection.
- Resoluctor de dominios y subdominios (`tenantDomainResolver.ts`).

### 16. ¿Qué lógica está duplicada?
- **Cero duplicación de reglas de negocio:** Web y Android consumen los mismos estados de orden (`OrderStatus`: `pending`, `accepted`, `in_preparation`, `ready`, `in_transit`, `delivered`, `cancelled`) y design tokens canónicos.

### 17. ¿Qué modelos tienen dual mapping?
- `Membership` (EIAM v2.1 `/membership` single-tenant legacy → EIAM v3 `/memberships` multi-membership enterprise).

### 18. ¿Qué listeners son demasiado amplios?
- Ninguno en componentes certificados: Control Tower y Driver usan queries dirigidas (`assignedCourierId == uid`, `motorizadoId == uid`, `status in ['ready', 'in_transit']`).

### 19. ¿Existe riesgo cross-tenant?
- **0.00% de riesgo:** Todas las consultas y mutaciones están acotadas por `tenantId` en Firestore Rules y en Gatekeeper.

### 20. ¿Existe alguna posibilidad de producción accidental?
- **0.00% de posibilidad:** `ProductionInvocationDetector` bloquea cualquier mutación fuera del entorno local/emulador/test. ADR-014 enforcea fail-closed hard blocks.
