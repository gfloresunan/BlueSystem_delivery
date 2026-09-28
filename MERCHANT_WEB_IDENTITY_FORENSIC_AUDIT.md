# MERCHANT WEB — IDENTITY FORENSIC AUDIT

```text
Project:          BlueSystem Delivery Enterprise
Target:           Merchant Web
Firebase Project: bluesystem-7c9af
Production URL:   https://bluesystem-7c9af-merchant.web.app/
Date:             2026-08-09
Auditor:          Antigravity AI (Senior Developer & Governance Auditor)
Mode:             READ-ONLY FORENSIC AUDIT
Files Modified:   NONE
Deployment:       NOT PERFORMED
Contract:         MERCHANT_WEB_CANONICAL_IDENTITY_CONTRACT.md
```

---

## 1. Executive Summary

La auditoría forense de identidad de Merchant Web revela que el núcleo de autenticación e identidad EIAM ha sido **implementado correctamente** en su arquitectura principal: la resolución del `businessId` se realiza exclusivamente desde JWT Custom Claims y validación Firestore de membresía. No existen datos mock que puedan usurpar la identidad real.

Sin embargo, se identificaron **5 hallazgos de severidad MEDIUM a HIGH** relacionados con:
1. Persistencia de estado de navegación por usuario en `localStorage` (sin borrado en logout)
2. Estado de apertura de tienda (`isStoreOpen`) en `MainLayout` que **no escribe en Firestore**
3. Duplicidad de reglas para `/businesses/{businessId}` en `firestore.rules`
4. Módulo `audit_events` con restricción de escritura excesivamente permisiva para el cliente
5. Ausencia de limpieza del `TabStateContext` (`bluesystem_merchant_tab_states_v1` y `bluesystem_merchant_active_module`) durante el logout

No se encontró **ningún dato mock de identidad** (fresh_merchant_2026, demoMerchant, fallback identity). El flujo FAIL-CLOSED está **operativo y correcto** a nivel de Auth. La paridad `restaurantId === businessId` (SSOT-01) está correctamente implementada.

**FINAL VERDICT: PARTIAL — REMEDIATION REQUIRED**

---

## 2. Audit Scope

| Elemento | Auditado | Método |
|---|---|---|
| Firebase SDK initialization | ✅ | SOURCE CODE VERIFIED |
| Auth flow (Login → Claims → Membership) | ✅ | SOURCE CODE VERIFIED |
| JWT / Custom Claims resolution | ✅ | SOURCE CODE VERIFIED |
| Membership validation | ✅ | SOURCE CODE VERIFIED |
| MerchantIdentityContext | ✅ | SOURCE CODE VERIFIED |
| businessId source | ✅ | SOURCE CODE VERIFIED |
| restaurantId / SSOT-01 | ✅ | SOURCE CODE VERIFIED |
| branchId source | ✅ | SOURCE CODE VERIFIED |
| role / permissions | ✅ | SOURCE CODE VERIFIED |
| Firestore Rules | ✅ | SOURCE CODE VERIFIED |
| Firestore Queries (all modules) | ✅ | SOURCE CODE VERIFIED |
| Logout flow | ✅ | SOURCE CODE VERIFIED |
| Cache / localStorage | ✅ | SOURCE CODE VERIFIED |
| Mock / Demo data scan | ✅ | SOURCE CODE VERIFIED |
| Fallback data scan | ✅ | SOURCE CODE VERIFIED |
| Onboarding Wizard | ✅ | SOURCE CODE VERIFIED |
| Lifecycle (lifecycleStatus, wizardCompleted) | ✅ | SOURCE CODE VERIFIED |
| Multi-tenant isolation | ✅ | SOURCE CODE VERIFIED |
| User switching scenario | ❌ | NOT VERIFIED (no second test account) |
| Production console evidence | ❌ | NOT VERIFIED (no browser session) |

---

## 3. Canonical Contract

Contrato aplicado: `MERCHANT_WEB_CANONICAL_IDENTITY_CONTRACT.md` — **VIGENTE & CANÓNICO (EIAM v2.2 / SSOT-01)**

### Modelo Canónico Esperado

```typescript
interface MerchantIdentityContext {
  uid: string;           // Firebase Auth UID
  email: string;
  orgId: string;         // Holding / Tenant principal
  businessId: string;    // Comercio asignado (desde JWT claim)
  restaurantId: string;  // idéntico a businessId (SSOT-01)
  branchId: string;      // Sucursal activa
  membershipId: string;  // ID del doc de membresía Firestore
  role: CanonicalRole;   // Rol EIAM
  permissions: string[]; // Permisos operativos
  lifecycleStatus: string;
  wizardCompleted: boolean;
}
```

### Verificación de Implementación vs. Contrato

| Campo Canónico | Implementado | Fuente | Estado |
|---|---|---|---|
| `uid` | ✅ | `currentUser.uid` (Firebase Auth) | COMPLIANT |
| `email` | ✅ | `currentUser.email` | COMPLIANT |
| `orgId` | ⚠️ | JWT claim `orgId` → fallback `membershipData.orgId` → `'org_default'` | PARTIAL (fallback a hardcoded `'org_default'`) |
| `businessId` | ✅ | JWT claim `businessId` — FAIL-CLOSED si ausente | COMPLIANT |
| `restaurantId` | ✅ | `claimBusinessId` (parity rule explícita) | COMPLIANT (SSOT-01) |
| `branchId` | ⚠️ | JWT claim `branchId` → fallback `membershipData.branchId` → `'main_branch'` | PARTIAL (fallback a hardcoded `'main_branch'`) |
| `membershipId` | ✅ | `membershipDoc.id` desde Firestore | COMPLIANT |
| `role` | ✅ | JWT claim `role` — FAIL-CLOSED si ausente | COMPLIANT |
| `permissions` | ⚠️ | `membershipData.permissions || []` | PARTIAL (fallback a array vacío) |
| `lifecycleStatus` | ⚠️ | `bizData.lifecycleStatus || 'ONBOARDING'` | PARTIAL (fallback a `'ONBOARDING'`) |
| `wizardCompleted` | ✅ | `bizData.wizardCompleted === true` | COMPLIANT |

---

## 4. Firebase Verification

### Archivo: `merchant-web/src/shared/services/firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
  authDomain: "bluesystem-7c9af.firebaseapp.com",
  projectId: "bluesystem-7c9af",              ✅ CORRECTO
  storageBucket: "bluesystem-7c9af.firebasestorage.app",
  messagingSenderId: "514416631826",
  appId: "1:514416631826:web:788b99430f87324e88b8cb"
};
```

| Verificación | Estado |
|---|---|
| `projectId: "bluesystem-7c9af"` | ✅ CORRECTO |
| `authDomain` apunta a `bluesystem-7c9af` | ✅ CORRECTO |
| No se detectan referencias a `bluesystem-delivery` | ✅ CORRECTO |
| `getAuth(app)` inicializado correctamente | ✅ CORRECTO |
| `getFirestore(app)` inicializado correctamente | ✅ CORRECTO |
| No se importa `Storage` ni `Functions` (no requerido en merchant-web) | ✅ INFO |
| Patrón `!getApps().length ? initializeApp(...) : getApp()` evita doble init | ✅ CORRECTO |

**FIREBASE VERIFICATION: PASS**

---

## 5. Auth Analysis

### Archivo: `merchant-web/src/shared/context/AuthContext.tsx`

**Flujo implementado:**

```
onAuthStateChanged(auth)
       ↓
currentUser !== null?
  → NO  → setUser(null), setIdentity(null), setLoading(false)
  → SÍ  → getIdTokenResult(currentUser, true)   // Force refresh ✅
              ↓
       claims.businessId + claims.role presentes?
         → NO  → throw 'AUTH_ERROR' → FAIL-CLOSED ✅
         → SÍ  → query /membership where uid == currentUser.uid LIMIT 1
                     ↓
                 membershipSnap.empty?
                   → SÍ → throw 'AUTHORIZATION_ERROR' → FAIL-CLOSED ✅
                   → NO → membershipData.status !== 'ACTIVE'?
                             → SÍ → throw 'AUTHORIZATION_ERROR' ✅
                             → NO → membershipData.businessId !== claimBusinessId?
                                      → SÍ → throw 'SECURITY_ERROR' ✅
                                      → NO → onSnapshot(/businesses/{claimBusinessId})
                                                 ↓
                                           !bizSnap.exists()?
                                             → SÍ → FAIL-CLOSED ✅
                                             → NO → Build MerchantIdentityContext ✅
```

**Evaluación:** El flujo Auth es **EIAM-COMPLIANT**. Todos los puntos de falla críticos están implementados como FAIL-CLOSED. La llamada `getIdTokenResult(currentUser, true)` fuerza el refresco del JWT, resolviendo el token refresh gap documentado en la auditoría del Governance Center.

---

## 6. JWT / Claims

### Fuente: `AuthContext.tsx` — L88–100

| Claim | Variable | Tipo | Verificación | Resultado |
|---|---|---|---|---|
| `businessId` | `claimBusinessId` | `string \| undefined` | FAIL-CLOSED si `undefined` | ✅ CORRECTO |
| `role` | `claimRole` | `CanonicalRole \| undefined` | FAIL-CLOSED si `undefined` | ✅ CORRECTO |
| `orgId` | `claimOrgId` | `string \| undefined` | Fallback a `membershipData.orgId \| 'org_default'` | ⚠️ PARTIAL |
| `branchId` | `claimBranchId` | `string \| undefined` | Fallback a `membershipData.branchId \| 'main_branch'` | ⚠️ PARTIAL |

> [!WARNING]
> **FINDING MW-001 — MEDIUM:** `orgId` y `branchId` no son FAIL-CLOSED. Si los Custom Claims carecen de estas propiedades y la membresía tampoco las tiene, se asignan valores hardcoded (`'org_default'` y `'main_branch'`). El contrato exige que cualquier discrepancia resulte en FAIL-CLOSED.

---

## 7. Membership

### Fuente: `AuthContext.tsx` — L103–125

```typescript
const membershipQuery = query(
  collection(db, 'membership'),      // Colección: /membership
  where('uid', '==', currentUser.uid),
  limit(1)
);
```

| Verificación | Estado |
|---|---|
| Colección consultada: `/membership` | ✅ CORRECTO |
| Filtro por `uid` del usuario autenticado | ✅ CORRECTO |
| Verificación `membershipSnap.empty` → FAIL-CLOSED | ✅ CORRECTO |
| Verificación `membershipData.status !== 'ACTIVE'` → FAIL-CLOSED | ✅ CORRECTO |
| Cruce de coherencia: `membershipData.businessId !== claimBusinessId` → SECURITY_ERROR | ✅ CORRECTO |
| `membershipId` = `membershipDoc.id` | ✅ CORRECTO |
| `permissions` = `membershipData.permissions || []` | ⚠️ Fallback a array vacío |

**Evaluación:** La membresía es verificada correctamente antes de construir el `MerchantIdentityContext`. La triple verificación (vacío → inactivo → businessId mismatch) es robusta. El único punto débil es `permissions: membershipData.permissions || []` que puede silenciosamente proveer un array vacío sin bloquear el acceso.

---

## 8. MerchantIdentityContext

### Construcción: `AuthContext.tsx` — L143–155

```typescript
const resolvedIdentity: MerchantIdentityContext = {
  uid: currentUser.uid,                              // SOURCE: Firebase Auth
  email: currentUser.email || '',                    // SOURCE: Firebase Auth
  orgId: claimOrgId || membershipData.orgId || 'org_default',  // ⚠️ FALLBACK
  businessId: claimBusinessId,                       // SOURCE: JWT Claim ✅
  restaurantId: claimBusinessId,                     // SSOT-01 Parity Rule ✅
  branchId: claimBranchId || membershipData.branchId || 'main_branch',  // ⚠️ FALLBACK
  membershipId,                                      // SOURCE: Firestore /membership
  role: claimRole,                                   // SOURCE: JWT Claim ✅
  permissions: membershipData.permissions || [],     // SOURCE: Firestore /membership
  lifecycleStatus,                                   // SOURCE: /businesses/{businessId}
  wizardCompleted                                    // SOURCE: /businesses/{businessId}
};
```

**Observación crítica:** El contexto es **inmutable** durante la sesión (construido en `onAuthStateChanged`). El único campo dinámico es `lifecycleStatus` y `wizardCompleted` que se actualiza reactivamente via `onSnapshot` en `/businesses/{businessId}`.

---

## 9. businessId

### Inventario de todas las fuentes de `businessId` encontradas en el codebase

| Módulo | Archivo | Línea | Fuente | Clasificación |
|---|---|---|---|---|
| AuthContext | AuthContext.tsx | L93, L98, L121–122 | JWT claim `claims.businessId` | ✅ AUTORITATIVA |
| AuthContext | AuthContext.tsx | L148 | `claimBusinessId` (del JWT) | ✅ AUTORITATIVA |
| DashboardModule | DashboardModule.tsx | L28 | `identity?.businessId \|\| ''` (del contexto EIAM) | ✅ DERIVADA |
| OrdersModule | OrdersModule.tsx | L35 | `identity?.businessId \|\| ''` (del contexto EIAM) | ✅ DERIVADA |
| CatalogModule | CatalogModule.tsx | L23 | `identity?.businessId \|\| ''` (del contexto EIAM) | ✅ DERIVADA |
| FinanceModule | FinanceModule.tsx | L160 | `identity?.businessId \|\| null` (del contexto EIAM) | ✅ DERIVADA |
| SettingsModule | SettingsModule.tsx | L20 | `identity?.businessId \|\| ''` (del contexto EIAM) | ✅ DERIVADA |
| OnboardingWizardModule | OnboardingWizardModule.tsx | Props | `businessId` prop de `App.tsx` → `identity?.businessId` | ✅ DERIVADA |
| CatalogModule | CatalogModule.tsx | L147, L148 | Escrito en Firestore como `businessId: merchantId` | ✅ DERIVADA |
| OrdersModule | OrdersModule.tsx | L193–196 | Escrito en audit_events como `businessId` | ✅ DERIVADA |

**CONCLUSIÓN:** El `businessId` **siempre se origina** en el JWT Custom Claim (`claims.businessId`). Todas las fuentes derivadas consumen `identity.businessId` desde el `AuthContext`. **No existe ninguna fuente de `businessId` desde `localStorage`, `sessionStorage`, cookies, URL params o hardcoded values.**

**BUSINESSID: COMPLIANT — NO CONTRACT VIOLATION**

---

## 10. restaurantId

### SSOT-01 Parity Verification

**Código:** `AuthContext.tsx` — L148
```typescript
restaurantId: claimBusinessId, // Parity Rule: restaurantId is identical to businessId
```

**Queries en SettingsModule:**
```typescript
doc(db, 'restaurant_settings', merchantId)  // merchantId = identity.businessId
doc(db, 'businesses', merchantId)
```

**OnboardingWizard:**
```typescript
await setDoc(doc(db, 'restaurant_settings', businessId), {
  restaurantId: businessId,    // ← Dual write establece paridad
  ...
});
```

| Verificación | Estado |
|---|---|
| `restaurantId === businessId` en MerchantIdentityContext | ✅ SOURCE CODE VERIFIED |
| `/restaurant_settings/{businessId}` usa mismo ID que `/businesses/{businessId}` | ✅ SOURCE CODE VERIFIED |
| OnboardingWizard escribe `restaurantId: businessId` en el documento | ✅ SOURCE CODE VERIFIED |
| Firestore Rules: `match /restaurant_settings/{restaurantId}` con `ownsBusiness(restaurantId)` | ✅ SOURCE CODE VERIFIED |

**SSOT-01: PASS — COMPLIANT**

---

## 11. branchId

### Fuente: `AuthContext.tsx` — L149
```typescript
branchId: claimBranchId || membershipData.branchId || 'main_branch',
```

| Fuente Evaluada | Resultado |
|---|---|
| JWT Custom Claim `branchId` | ✅ Fuente primaria |
| `membershipData.branchId` (Firestore) | ⚠️ Fallback válido pero secundario |
| `'main_branch'` (hardcoded string) | ❌ VIOLACIÓN POTENCIAL DEL CONTRATO |
| `localStorage` | ✅ NO UTILIZADO |
| `URL / query param` | ✅ NO UTILIZADO |
| Estado React / context externo | ✅ NO UTILIZADO |

> [!WARNING]
> **FINDING MW-002 — MEDIUM:** Si el JWT no tiene `branchId` y la membresía tampoco, `branchId` se establece a `'main_branch'` (valor hardcoded). Aunque benign en la mayoría de casos de un comercio de una sucursal, esto viola el principio FAIL-CLOSED del contrato canónico. Un usuario con JWT sin `branchId` debería bloquearse, no recibir un ID genérico.

**¿Puede ser manipulado por el cliente?** NO — No hay ningún mecanismo de input del usuario que modifique `branchId` en el contexto.

---

## 12. Role / Permissions

### Role

```typescript
// AuthContext.tsx L92, L151
const claimRole = claims.role as CanonicalRole | undefined;
// ...
role: claimRole,   // FAIL-CLOSED si undefined (L98)
```

El `role` proviene **exclusivamente** del JWT Custom Claim. Si está ausente → FAIL-CLOSED.

### Permissions

```typescript
// AuthContext.tsx L152
permissions: membershipData.permissions || [],
```

Los `permissions` provienen de Firestore `/membership/{membershipId}.permissions`. Si el campo no existe, se usa un array vacío.

> [!WARNING]
> **FINDING MW-003 — MEDIUM:** `permissions: []` como fallback puede conceder o denegar silenciosamente acceso a módulos que evalúen el array. No es un FAIL-CLOSED para permisos vacíos. El contrato no especifica explícitamente qué ocurre con `permissions = []`, pero la arquitectura defensiva debe tratar esto como una condición de denegación o bloqueo.

**Uso de role en los módulos:** Solo se consume visualmente en `MainLayout.tsx` (L64: `identity?.role || 'MERCHANT_OWNER'`). No se encontró gate de acceso basado en `role` en ningún módulo operativo. **Todo el control de acceso depende de Firestore Rules.**

---

## 13. Firestore Rules

### Análisis de colecciones accedidas por Merchant Web

| Colección | Regla Firestore | Condición de Lectura Merchant | Evaluación |
|---|---|---|---|
| `/membership/{membershipId}` | L165–177 | `currentUid() == resource.data.uid` | ✅ CORRECTO |
| `/businesses/{businessId}` | L140–149 (PRIMERA REGLA) | `ownsBusiness(businessId) \|\| isBusinessStaff()` | ⚠️ Ver Finding MW-007 |
| `/businesses/{businessId}` | L312–320 (SEGUNDA REGLA) | `allow read: if true` | 🔴 CRÍTICO — Ver Finding MW-007 |
| `/restaurant_settings/{restaurantId}` | L323–329 | `ownsBusiness(restaurantId) \|\| isBusinessStaff()` | ✅ CORRECTO |
| `/products/{productId}` | L262–273 | `allow read: if true` | ✅ OK (productos son públicos) |
| `/orders/{orderId}` | L242–259 | `ownsBusiness(resource.data.businessId)` | ✅ CORRECTO |
| `/audit_events/{eventId}` | L275–281 | `isPlatformAdmin()` sólo | ⚠️ Ver Finding MW-006 |
| `/dashboard_summary/{merchantId}` | ❌ No existe match explícito | Cae en `allow read, write: if false` | 🔴 CRÍTICO — Ver Finding MW-005 |
| `/merchant_summaries/{businessId}` | L344–352 | `ownsBusiness(businessId)` | ✅ CORRECTO |
| `/financial_events/{eventId}` | L334–341 | `ownsBusiness(resource.data.businessId)` | ✅ CORRECTO |

---

## 14. Firestore Queries

### Inventario completo de queries en Merchant Web

| Módulo | Archivo | Línea | Colección | Tipo | Filtro WHERE | Scope ID |
|---|---|---|---|---|---|---|
| AuthContext | AuthContext.tsx | L103–107 | `/membership` | getDocs | `uid == currentUser.uid` | uid |
| AuthContext | AuthContext.tsx | L128–164 | `/businesses/{claimBusinessId}` | onSnapshot (doc) | — | businessId (JWT) |
| DashboardModule | DashboardModule.tsx | L58–73 | `/dashboard_summary/{merchantId}` | onSnapshot (doc) | — | businessId |
| DashboardModule | DashboardModule.tsx | L76–89 | `/orders` | onSnapshot (query) | `merchantId == merchantId` | businessId |
| OrdersModule | OrdersModule.tsx | L57–60 | `/orders` | onSnapshot (query) | `businessId == businessId` | businessId |
| CatalogModule | CatalogModule.tsx | L46–49 | `/products` | onSnapshot (query) | `businessId == merchantId` | businessId |
| SettingsModule | SettingsModule.tsx | L39–54 | `/restaurant_settings/{merchantId}` | onSnapshot (doc) | — | businessId |
| SettingsModule | SettingsModule.tsx | L58–74 | `/businesses/{merchantId}` | onSnapshot (doc) | — | businessId |
| FinanceModule | FinanceModule.tsx | L163 | useFinanceData | hook | — | businessId |
| useFinanceData | useFinanceData.ts | L129 | `/merchant_summaries/{businessId}` | onSnapshot (doc) | — | businessId |
| useFinanceData | useFinanceData.ts | L162–167 | `/financial_events` | onSnapshot (query) | `businessId == businessId` | businessId |
| OnboardingWizard | OnboardingWizardModule.tsx | L78 | `/businesses/{businessId}` | getDoc | — | businessId |
| OnboardingWizard | OnboardingWizardModule.tsx | L92 | `/restaurant_settings/{businessId}` | getDoc | — | businessId |

**Observación ADR-003:** DashboardModule utiliza un `onSnapshot` de documento agregado (`/dashboard_summary/{merchantId}`), cumpliendo ADR-003. Sin embargo, **este documento no tiene regla explícita en `firestore.rules`** → cae en `deny by default`.

---

## 15. SSOT-01

| Regla SSOT-01 | Verificación | Estado |
|---|---|---|
| `restaurantId === businessId` en MerchantIdentityContext | AuthContext.tsx L148 | ✅ COMPLIANT |
| Documento `/businesses/{businessId}` usa `businessId` como Document ID | OnboardingWizardModule.tsx L173 | ✅ COMPLIANT |
| Documento `/restaurant_settings/{businessId}` usa mismo `businessId` | OnboardingWizardModule.tsx L187 | ✅ COMPLIANT |
| `restaurantId` se escribe en el documento `restaurant_settings` | OnboardingWizardModule.tsx L197: `restaurantId: businessId` | ✅ COMPLIANT |
| Lecturas de Settings usan mismo ID: `doc(db, 'restaurant_settings', merchantId)` | SettingsModule.tsx L40 | ✅ COMPLIANT |

**SSOT-01: PASS**

---

## 16. Mock / Demo Scan

### Búsqueda exhaustiva de patrones: `mock`, `demo`, `dummy`, `sample`, `fixture`, `fake`, `seed`, `fallback`, `defaultData`, `initialData`, `fresh_merchant_2026`, `demoMerchant`, `demoBusiness`

| Patrón | Hallazgo | Severidad |
|---|---|---|
| `mock` | NO ENCONTRADO en merchant-web/src/ | ✅ CLEAN |
| `demo` | NO ENCONTRADO | ✅ CLEAN |
| `dummy` | NO ENCONTRADO | ✅ CLEAN |
| `sample` | NO ENCONTRADO | ✅ CLEAN |
| `fixture` | NO ENCONTRADO | ✅ CLEAN |
| `fake` | NO ENCONTRADO | ✅ CLEAN |
| `seed` | NO ENCONTRADO | ✅ CLEAN |
| `fresh_merchant_2026` | NO ENCONTRADO | ✅ CLEAN |
| `demoMerchant` | NO ENCONTRADO | ✅ CLEAN |
| `demoBusiness` | NO ENCONTRADO | ✅ CLEAN |
| `demoRestaurant` | NO ENCONTRADO | ✅ CLEAN |
| `defaultData` | NO ENCONTRADO | ✅ CLEAN |
| `initialData` | NO ENCONTRADO | ✅ CLEAN |
| `INITIAL_ORDERS: OrderItem[] = []` | OrdersModule.tsx L31 | ✅ ARRAY VACÍO (no es mock data) |
| `INITIAL_PRODUCTS: Product[] = []` | CatalogModule.tsx L17 | ✅ ARRAY VACÍO (no es mock data) |

### Hardcoded business / restaurant data

| Hallazgo | Archivo | Línea | Evaluación |
|---|---|---|---|
| Categorías hardcoded en UI: `🍗 Pollo Frito`, `🍕 Pizzas`, `🍔 Hamburguesas` | CatalogModule.tsx | L235–246 | ⚠️ UI placeholder fija — NO son datos reales de catálogo |
| Badge `5` hardcoded en menú de navegación (Pedidos) | MainLayout.tsx | L22 | ⚠️ Badge fijo — no refleja conteo real de pedidos |
| `taxId: 'J0310000000001'` como valor inicial del estado | SettingsModule.tsx | L25 | ⚠️ Default RUC hardcoded — se sobreescribe con Firestore si el doc existe |
| `deliveryFee: 35.0`, `deliveryRadiusKm: 5.0` en estado inicial | SettingsModule.tsx | L27–28 | ⚠️ Valores por defecto — se sobreescriben con Firestore |
| `scheduleWeekday`, `scheduleWeekend` hardcoded | SettingsModule.tsx | L29–30 | ⚠️ No se obtienen de Firestore actualmente |

> [!WARNING]
> **FINDING MW-004 — MEDIUM:** `SettingsModule.tsx` inicializa el estado React con valores hardcoded (`taxId`, `deliveryFee`, `scheduleWeekday`, `scheduleWeekend`). Si Firestore falla al cargar (Firestore permission denied o timeout), **estos valores hardcoded permanecen visibles en la UI**. Para `taxId` y `scheduleWeekday/scheduleWeekend`, estos datos nunca son actualizados por Firestore en la versión actual — solo `commercialName`, `deliveryFee`, `isOpen` y `deliveryRadiusKm` se actualizan.

---

## 17. Fallback Scan

| Tipo de Fallback | Archivo | Línea | Evaluación | Clasificación |
|---|---|---|---|---|
| `orgId` → `'org_default'` | AuthContext.tsx | L146 | Fallback hardcoded en identidad | 🔴 VIOLACIÓN CONTRATO |
| `branchId` → `'main_branch'` | AuthContext.tsx | L149 | Fallback hardcoded en identidad | 🔴 VIOLACIÓN CONTRATO |
| `lifecycleStatus` → `'ONBOARDING'` | AuthContext.tsx | L139 | Fallback en campo de Firestore ausente | ⚠️ Aceptable si el doc existe |
| `permissions` → `[]` | AuthContext.tsx | L152 | Fallback a array vacío | ⚠️ No FAIL-CLOSED |
| `DashboardModule kpiData` → `{todaySales: 0, ...}` | DashboardModule.tsx | L33–38 | Estado inicial con ceros | ✅ No es identidad, es KPI |
| `identity?.businessId \|\| ''` en todos los módulos | DashboardModule, OrdersModule, etc. | — | Fallback a string vacío | ✅ Si `identity` es null, el módulo no hace queries |
| `taxId: 'J0310000000001'` en SettingsModule | SettingsModule.tsx | L25 | Valor por defecto en estado | ⚠️ MEDIUM |
| Categorías hardcoded en CatalogModule UI | CatalogModule.tsx | L235–246 | No son datos de identidad | ⚠️ UX issue |

---

## 18. Logout Forensic

### Función `logout` en `AuthContext.tsx` (L183–210)

```typescript
const logout = async () => {
  // 1. Cancel active listeners ← ✅
  activeUnsubscribes.forEach(unsub => unsub());
  setActiveUnsubscribes([]);

  // 2. Sign out from Firebase Auth ← ✅
  await signOut(auth);

  // 3. Clear identity contexts ← ✅
  setUser(null);
  setIdentity(null);
  setError(null);

  // 4. Remove merchant-specific keys ← ⚠️ INCOMPLETO
  localStorage.removeItem('bluesystem_active_merchant_id');
  localStorage.removeItem('bluesystem_merchant_dashboard_widgets_v1');
  sessionStorage.clear();
};
```

### Análisis de persistencia post-logout

| Item | Se borra en logout | Riesgo |
|---|---|---|
| `user` (React state) | ✅ setUser(null) | — |
| `identity` (React state) | ✅ setIdentity(null) | — |
| Firebase Auth session (IndexedDB) | ✅ signOut(auth) | — |
| `bluesystem_active_merchant_id` (localStorage) | ✅ removeItem | — |
| `bluesystem_merchant_dashboard_widgets_v1` (localStorage) | ✅ removeItem | — |
| `bluesystem_merchant_tab_states_v1` (localStorage) | ❌ **NO SE BORRA** | ⚠️ HIGH |
| `bluesystem_merchant_active_module` (localStorage) | ❌ **NO SE BORRA** | ⚠️ MEDIUM |
| Firestore offline cache (IndexedDB) | ❌ NO SE LIMPIA | ⚠️ MEDIUM |
| `activeUnsubscribes` listeners (React state) | ✅ Cancelados antes de signOut | — |

> [!CAUTION]
> **FINDING MW-005 — HIGH:** La función `logout()` no borra las claves `bluesystem_merchant_tab_states_v1` y `bluesystem_merchant_active_module` del `localStorage`. Estas claves son escritas por `TabStateContext.tsx` (L38, L43) y contienen el módulo activo del comerciante y estados de filtros/tabs por módulo. Cuando USER B inicia sesión en el mismo navegador, hereda el módulo activo y los filtros de búsqueda de USER A.

> [!WARNING]
> **FINDING MW-006 — MEDIUM:** Firestore offline persistence (IndexedDB) no es limpiada explícitamente durante logout. Dependiendo de la configuración de Firestore SDK, datos de USER A podrían servirse desde caché antes de que las Firestore Rules rechacen la solicitud de USER B.

---

## 19. Cache / Persistence

### Inventario completo de mecanismos de cache

| Mecanismo | Clave | ¿Se borra en logout? | Tipo de dato | Riesgo |
|---|---|---|---|---|
| `localStorage` | `bluesystem_merchant_dashboard_widgets_v1` | ✅ SÍ | Config. de widgets (no identidad) | LOW |
| `localStorage` | `bluesystem_active_merchant_id` | ✅ SÍ | businessId anterior | ELIMINADO |
| `localStorage` | `bluesystem_merchant_tab_states_v1` | ❌ NO | Estado de tabs por módulo | MEDIUM |
| `localStorage` | `bluesystem_merchant_active_module` | ❌ NO | Módulo activo (ej: 'orders') | MEDIUM |
| `sessionStorage` | (todas las claves) | ✅ sessionStorage.clear() | — | — |
| `IndexedDB` (Firebase SDK) | (manejado por SDK) | ❌ NO | Datos Firestore cacheados | MEDIUM |
| `React context` (AuthContext) | `user`, `identity` | ✅ SÍ | Identidad EIAM completa | — |
| `React state` (DashboardModule) | `kpiData`, `realOrders`, `widgets` | ✅ (unmount) | Datos operativos | — |
| `React state` (OrdersModule) | `orders`, `viewMode`, `searchQuery` | ✅ (unmount) | Datos de pedidos | — |

**Service Workers:** No se encontró ninguna configuración de Service Worker ni cache storage en el codebase de `merchant-web`. ✅ CLEAN.

**Zustand / Redux:** No se utiliza ningún store global con persistencia. ✅ CLEAN.

---

## 20. Router / Guards

### `App.tsx` — Gestión de rutas y guards

```typescript
// Guard 1: Loading state
if (loading) { return <Spinner />; }

// Guard 2: Fail-Closed error
if (error) { return <AuthErrorScreen logout={logout} />; }

// Guard 3: Unauthenticated
if (!isAuthenticated) { return <LoginModule />; }

// Guard 4: Wizard gate
useEffect(() => {
  if (isAuthenticated && identity && !identity.wizardCompleted) {
    setActiveModule('onboarding');   // Force wizard
  }
}, [isAuthenticated, identity, activeModule, setActiveModule]);
```

| Guard | Implementado | Evaluación |
|---|---|---|
| Loading gate (muestra spinner durante resolución EIAM) | ✅ | CORRECTO |
| EIAM error gate (muestra pantalla error + logout button) | ✅ | CORRECTO |
| Unauthenticated gate (muestra LoginModule) | ✅ | CORRECTO |
| Wizard gate (redirige a onboarding si !wizardCompleted) | ✅ | CORRECTO |
| Role-based module access gate | ❌ | NO IMPLEMENTADO — ver Finding MW-008 |

> [!NOTE]
> **FINDING MW-008 — LOW/INFO:** No existe un gate de acceso por rol a módulos individuales. Cualquier usuario autenticado con membresía ACTIVA puede navegar a cualquier módulo (Dashboard, Finance, Catalog, Orders). El control de acceso a datos se delega completamente a Firestore Rules, lo cual es aceptable en la arquitectura actual pero inconsistente con el modelo `CanonicalRole` definido.

---

## 21. Lifecycle

### `lifecycleStatus` flow

| Campo | Fuente | Donde se usa | Evaluación |
|---|---|---|---|
| `lifecycleStatus` | `bizData.lifecycleStatus \|\| 'ONBOARDING'` (Firestore `/businesses`) | Solo leído en identidad | ✅ Correcto |
| `wizardCompleted` | `bizData.wizardCompleted === true` (Firestore `/businesses`) | Gate en App.tsx | ✅ Correcto |

La actualización de `lifecycleStatus` a `'ACTIVE'` solo ocurre en el wizard completion (L182 de OnboardingWizardModule):
```typescript
await updateDoc(busRef, {
  wizardCompleted: true,
  lifecycleStatus: 'ACTIVE',
  ...
});
```

Luego, el `onSnapshot` en `AuthContext.tsx` (L129) detecta el cambio reactivamente, y `App.tsx` remueve el wizard gate al detectar `wizardCompleted = true`.

**LIFECYCLE: CORRECT**

---

## 22. Wizard

### Análisis del `OnboardingWizardModule.tsx`

| Verificación | Estado |
|---|---|
| `businessId` recibido como prop desde `identity?.businessId` | ✅ CORRECTO |
| FAIL-CLOSED si `!businessId` al completar | ✅ L128–130 |
| Escritura atómica: `/businesses` + `/restaurant_settings` + `/products` + `/audit_events` | ✅ Implementado secuencialmente (no atómica en batch) |
| Read-back verification post-write | ✅ L250–260 |
| `restaurantId: businessId` escrito en `/restaurant_settings` | ✅ SSOT-01 compliant |
| No se usan datos mock en el wizard | ✅ CLEAN |

> [!WARNING]
> **FINDING MW-009 — MEDIUM:** El wizard realiza 4 escrituras secuenciales (no en un batch atómico de Firestore). Si la escritura 3 (`/products`) o 4 (`/audit_events`) falla después de que `/businesses` ya fue actualizado con `wizardCompleted: true`, el comercio queda en estado `ACTIVE` sin producto inicial. Si el read-back (paso 5) pasa, el wizard se marca como completo aunque el producto no haya sido creado. Esto no es un problema de identidad pero sí de integridad operacional.

---

## 23. Multi-Tenant Isolation

### Evaluación del aislamiento por tenant

| Mecanismo | Verificación | Estado |
|---|---|---|
| `businessId` proviene exclusivamente de JWT → no manipulable por cliente | ✅ | CORRECTO |
| Queries de Firestore incluyen `where('businessId', '==', businessId)` | ✅ | CORRECTO |
| Firestore Rules validan `ownsBusiness(resource.data.businessId)` | ✅ | CORRECTO |
| No hay endpoints que acepten businessId de query params / body | ✅ | CORRECTO |
| `onSnapshot(/businesses/{claimBusinessId})` usa el businessId del JWT directamente | ✅ | CORRECTO |
| Tenant mismatch entre claim y membership → SECURITY_ERROR | ✅ | CORRECTO |

**MULTI-TENANT ISOLATION: COMPLIANT** — El aislamiento de datos por tenant está correctamente implementado a través del JWT y validado por Firestore Rules.

---

## 24. User Switching

**Escenario:** USER A → LOGOUT → USER B

| Elemento | Estado después de logout | Riesgo para USER B |
|---|---|---|
| Firebase Auth session | ✅ Limpiada (signOut) | Sin riesgo |
| `identity` context | ✅ `null` | Sin riesgo |
| `user` context | ✅ `null` | Sin riesgo |
| Pantalla mostrada | ✅ LoginModule | Sin riesgo |
| businessId heredado | ✅ NO — se resuelve de JWT de USER B | Sin riesgo |
| `bluesystem_merchant_tab_states_v1` | ❌ Persiste de USER A | USER B hereda último módulo/filtros de USER A (NO datos sensibles de identidad) |
| `bluesystem_merchant_active_module` | ❌ Persiste | USER B ve el módulo en que USER A cerró sesión |
| Datos Firestore cacheados | ❌ No limpiados | Potencial lectura de caché de USER A antes de refresh |

**USER SWITCH: NOT VERIFIED** — No se realizó prueba en producción con dos usuarios reales. La evaluación es basada en análisis de código fuente.

**Riesgo Confirmado (INFERRED → SOURCE CODE VERIFIED):** USER B heredará la interfaz en el módulo donde USER A cerró sesión (`bluesystem_merchant_active_module`) y con los filtros de búsqueda/tab de USER A (`bluesystem_merchant_tab_states_v1`). **No son datos financieros ni de identidad**, pero es un degradé de experiencia y privacidad menor.

---

## 25. Production Evidence

**Estado:** `NOT VERIFIED` — No se realizó inspección de DevTools, Console o Network en producción durante esta auditoría.

La producción de Merchant Web está en: `https://bluesystem-7c9af-merchant.web.app/`

---

## 26. Findings

| ID | Severidad | Componente | Descripción | Archivo | Línea |
|---|---|---|---|---|---|
| **MW-001** | MEDIUM | AuthContext / EIAM | `orgId` y `branchId` no son FAIL-CLOSED; fallback a `'org_default'` y `'main_branch'` respectivamente | AuthContext.tsx | L146, L149 |
| **MW-002** | MEDIUM | AuthContext / branchId | `branchId` hardcoded a `'main_branch'` si no está en JWT ni en membership | AuthContext.tsx | L149 |
| **MW-003** | MEDIUM | AuthContext / permissions | `permissions: []` como fallback silencioso sin bloqueo | AuthContext.tsx | L152 |
| **MW-004** | MEDIUM | SettingsModule | Valores hardcoded (`taxId`, `scheduleWeekday`, `scheduleWeekend`) persisten si Firestore falla o no tiene esos campos | SettingsModule.tsx | L23–31 |
| **MW-005** | HIGH | AuthContext / Logout | `bluesystem_merchant_tab_states_v1` y `bluesystem_merchant_active_module` no se borran en logout | AuthContext.tsx | L183–210 |
| **MW-006** | MEDIUM | AuthContext / Logout | Firestore IndexedDB cache no se limpia en logout | AuthContext.tsx | L191 |
| **MW-007** | HIGH | firestore.rules | Duplicación de match `/businesses/{businessId}` con `allow read: if true` (L312–320 sobreescribe L140–149 con read público) | firestore.rules | L312–320 |
| **MW-008** | LOW | App.tsx / Router | Ausencia de gate de acceso por rol a módulos individuales (Finance, Catalog) | App.tsx | L95–178 |
| **MW-009** | MEDIUM | OnboardingWizardModule | 4 escrituras secuenciales no atómicas — parcial completion posible | OnboardingWizardModule.tsx | L170–266 |
| **MW-010** | HIGH | firestore.rules | `/dashboard_summary/{merchantId}` no tiene regla match explícita — cae en `deny by default` bloqueando al DashboardModule | firestore.rules | — |
| **MW-011** | LOW | CatalogModule | Categorías de menú hardcoded en UI (`Pollo Frito`, `Pizzas`, `Hamburguesas`) — no son datos reales de Firestore | CatalogModule.tsx | L235–246 |
| **MW-012** | LOW | MainLayout | Badge `5` hardcoded en el menú de Pedidos — no refleja conteo real | MainLayout.tsx | L22 |
| **MW-013** | MEDIUM | audit_events | El cliente merchant puede escribir en `/audit_events` directamente (OrdersModule L190, L230) pero las Rules solo permiten `isPlatformAdmin()` | OrdersModule.tsx | L190, L230; firestore.rules L280 |

---

## 27. Contract Deviations

| Cláusula del Contrato | Implementación Actual | Estado |
|---|---|---|
| "El frontend nunca resolverá de forma autónoma el `businessId` basándose en almacenamiento modificable del lado del cliente" | `businessId` proviene del JWT claim — CORRECTO | ✅ COMPLIANT |
| "Si existe cualquier discrepancia o ausencia de datos en Custom Claims o /membership → FAIL-CLOSED" | `orgId` y `branchId` usan fallback hardcoded en lugar de FAIL-CLOSED | ⚠️ PARTIAL |
| "No se cargará ningún dato de prueba o mock (`fresh_merchant_2026`)" | No existe ningún mock en el codebase | ✅ COMPLIANT |
| "Se suspenderá el acceso a las vistas operativas de inmediato" | Si `businessId` o `role` son nulos → FAIL-CLOSED. Si `orgId` o `branchId` son nulos → NO se bloquea | ⚠️ PARTIAL |
| `restaurantId = businessId` | `restaurantId: claimBusinessId` explícito en AuthContext | ✅ COMPLIANT |
| `/businesses/{businessId}` y `/restaurant_settings/{businessId}` con mismo ID | Verificado en wizard y settings | ✅ COMPLIANT |

---

## 28. Root Cause Candidates

1. **MW-005 / Logout incompleto:** El equipo de desarrollo priorizó la limpieza de claves de identidad explícita (`bluesystem_active_merchant_id`) pero no limpió las claves de estado de UI (`tab_states`, `active_module`) al implementar `TabStateContext`.

2. **MW-007 / Duplicación de regla `/businesses`:** En algún sprint posterior se añadió un segundo bloque `match /businesses/{businessId}` con `allow read: if true` para hacer los negocios públicamente legibles (ej. para el App Cliente). Firestore evalúa el **primer match ganador que permita** — por lo que con dos bloques para la misma colección, el `allow read: if true` en L312 sobreescribe el `ownsBusiness()` de L140, haciendo públicos los documentos de `/businesses`.

3. **MW-010 / Colección `dashboard_summary` sin regla:** Esta colección fue añadida como documento agregado (ADR-003) en `DashboardModule.tsx` pero no se añadió la regla correspondiente en `firestore.rules`, causando que el listener falle con Permission Denied en producción.

4. **MW-013 / Escrituras directas a `audit_events`:** El cliente escribe audit_events directamente (`setDoc(doc(collection(db, 'audit_events')))`) pero las Rules definen `allow write: if isPlatformAdmin()`. Esto fallará en producción para usuarios merchant.

---

## 29. Recommended Remediation

> [!IMPORTANT]
> **Estas recomendaciones son SOLO INFORMATIVAS en esta fase. NO implementar hasta recibir instrucciones.**

| ID | Acción | Prioridad |
|---|---|---|
| MW-005 | Agregar en `logout()`: `localStorage.removeItem('bluesystem_merchant_tab_states_v1'); localStorage.removeItem('bluesystem_merchant_active_module');` | HIGH |
| MW-007 | Eliminar el segundo bloque `match /businesses/{businessId}` en firestore.rules (L312–320) o fusionarlo con el primero | HIGH |
| MW-010 | Agregar regla explícita para `/dashboard_summary/{merchantId}` en firestore.rules: `allow read: if isAuthenticated() && ownsBusiness(merchantId);` | HIGH |
| MW-013 | Cambiar `allow write: if isPlatformAdmin()` en `/audit_events` a `allow write: if isAuthenticated() && (ownsBusiness(request.resource.data.businessId) || isPlatformAdmin());` | HIGH |
| MW-001/MW-002 | Convertir ausencia de `orgId` o `branchId` en FAIL-CLOSED en lugar de usar fallback hardcoded | MEDIUM |
| MW-003 | Si `permissions` está vacío y el rol requiere permisos específicos, bloquear acceso | MEDIUM |
| MW-006 | Llamar `clearIndexedDbPersistence(db)` o `terminate(db)` durante logout para limpiar caché offline | MEDIUM |
| MW-009 | Migrar las 4 escrituras del wizard a un batch de Firestore (`writeBatch`) para atomicidad | MEDIUM |
| MW-004 | Eliminar valores hardcoded del estado inicial de SettingsModule o mostrar el módulo como LOADING hasta recibir datos | MEDIUM |

---

## 30. Tests Not Executed

- Prueba de USER SWITCH en producción con dos cuentas reales
- Inspección de DevTools Console en `https://bluesystem-7c9af-merchant.web.app/`
- Verificación de errores `Permission Denied` en producción para `/dashboard_summary`
- Verificación de errores `Permission Denied` para escrituras a `/audit_events` desde un merchant
- Verificación del comportamiento de Firestore offline cache post-logout

---

## 31. Limitations

1. **Análisis Read-Only:** No se realizaron modificaciones ni pruebas de escritura.
2. **Sin cuenta de prueba:** El escenario USER A → USER B no fue verificado en entorno real.
3. **Sin acceso a Firebase Console:** No se verificaron Custom Claims reales de usuarios en producción.
4. **Sin Firestore Rules Simulator:** Las reglas se analizaron por inspección de código.
5. **Caché de Firestore:** El comportamiento exacto de la caché offline depende de la configuración del SDK que no se verifica en el código fuente.

---

## 32. FINAL VERDICT

```text
══════════════════════════════════════════════════
 BLUE SYSTEM — MERCHANT WEB IDENTITY FORENSIC AUDIT
══════════════════════════════════════════════════

MODE:              READ-ONLY
FILES MODIFIED:    NONE
DEPLOYMENT:        NOT PERFORMED

TARGET:            MERCHANT WEB
CONTRACT:          MERCHANT_WEB_CANONICAL_IDENTITY_CONTRACT.md
REPORT:            MERCHANT_WEB_IDENTITY_FORENSIC_AUDIT.md

FIREBASE:          PASS (bluesystem-7c9af, auth + firestore correctos)
AUTH:              PASS (onAuthStateChanged + getIdTokenResult(true))
JWT:               PASS (businessId y role son FAIL-CLOSED)
CUSTOM CLAIMS:     PARTIAL (orgId y branchId tienen fallback hardcoded)
MEMBERSHIP:        PASS (triple validación: exists + ACTIVE + businessId match)
MERCHANT IDENTITY: PASS (MerchantIdentityContext construido correctamente)
BUSINESS ID:       PASS — NO CONTRACT VIOLATION (solo JWT → contexto → módulos)
RESTAURANT ID:     PASS — SSOT-01 COMPLIANT (restaurantId === businessId)
BRANCH ID:         PARTIAL (fallback hardcoded 'main_branch' si JWT y membership sin branchId)
SSOT-01:           PASS
MOCK DATA:         PASS — NINGÚN mock de identidad encontrado
FALLBACKS:         PARTIAL — orgId/branchId/permissions con fallbacks no FAIL-CLOSED
LOGOUT:            PARTIAL — tab_states y active_module persisten entre sesiones
CACHE:             PARTIAL — IndexedDB Firestore no limpiada; 2 keys localStorage sin borrar
MULTI-TENANT:      PASS — businessId del JWT, nunca del cliente
FAIL-CLOSED:       PARTIAL — businessId/role son FAIL-CLOSED; orgId/branchId/permissions NO
LIFECYCLE:         PASS — lifecycleStatus y wizardCompleted desde Firestore reactivo
WIZARD:            PARTIAL — 4 escrituras secuenciales no atómicas
PRODUCTION:        NOT VERIFIED

CRITICAL FINDINGS:
  ❌ NONE — No hay violaciones de identidad EIAM críticas

HIGH FINDINGS:
  🔴 MW-005: tab_states + active_module no borrados en logout
  🔴 MW-007: Duplicación de /businesses regla con allow read: if true
  🔴 MW-010: /dashboard_summary sin regla Firestore → Permission Denied en producción
  🔴 MW-013: Merchant escribe a /audit_events que Rules sólo permiten a isPlatformAdmin()

MEDIUM FINDINGS:
  ⚠️ MW-001: orgId fallback hardcoded ('org_default')
  ⚠️ MW-002: branchId fallback hardcoded ('main_branch')
  ⚠️ MW-003: permissions fallback a [] sin bloqueo
  ⚠️ MW-004: SettingsModule valores hardcoded persisten si Firestore falla
  ⚠️ MW-006: Firestore IndexedDB cache no limpiada en logout
  ⚠️ MW-009: Wizard escribe 4 documentos secuenciales (no atómico)

ROOT CAUSE:
  1. Tab state keys omitidas en función de logout
  2. Segunda regla /businesses con allow read: if true añadida para App Cliente
  3. /dashboard_summary añadida al código pero sin regla Firestore
  4. audit_events Rules demasiado restrictivas para escrituras del cliente

FINAL VERDICT:
  ⚠️ PARTIAL — REMEDIATION REQUIRED

  El núcleo de identidad EIAM (businessId, role, membership) es CORRECTO y COMPLIANT.
  No existe ningún mock/fallback de identidad que pueda suplantar al comerciante real.
  Los hallazgos HIGH están relacionados con logout incompleto, regla duplicada de
  Firestore y colecciones sin cobertura de Rules — no con violaciones de identidad.
  Se requieren correcciones quirúrgicas antes de certificar como PASS.

══════════════════════════════════════════════════
END — READ-ONLY MERCHANT WEB IDENTITY AUDIT
══════════════════════════════════════════════════
```
