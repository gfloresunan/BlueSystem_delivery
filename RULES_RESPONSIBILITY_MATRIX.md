# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0 — MATRIZ DE RESPONSABILIDAD DE FIRESTORE SECURITY RULES (RULES RESPONSIBILITY MATRIX)
**Protocolo:** `BSD-C2D35-IMPLEMENTATION-READINESS-RUNTIME-MAPPING-001`  
**Fase:** POST-C2D.34A / PRE-C2D.35 IMPLEMENTATION  
**Modo:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DATA MUTATION`  
**Fecha:** 3 de Septiembre de 2026  

---

### 1. PRINCIPIO DE DELIMITACIÓN DE RESPONSABILIDADES (DEC-14 / ADR-019)
Las reglas de seguridad de Firestore (`firestore.rules`) actúan exclusivamente como **perímetro de defensa rápida** para:
- **Autenticación:** Validar que `request.auth != null`.
- **Aislamiento Multi-Tenant:** `resource.data.tenantId == request.auth.token.tenantId`.
- **Pertenencia & Propiedad:** `currentUid() == resource.data.uid`.
- **Inmutabilidad:** Denegar `update` y `delete` en colecciones históricas y de auditoría.
- **Filtro Grueso de Estado:** `request.auth.token.subscriptionStatus != 'SUSPENDED'`.

El **Backend (Cloud Functions / Gatekeeper)** es la **autoridad exclusiva** para:
- La máquina de estados de suscripción y cambios de ciclo de vida.
- El cómputo y bloqueo de cuotas atómicas (`/usage_counters`).
- La evaluación jerárquica de entitlements (`disabledFeatures > enabledFeatures > default`).
- Transacciones financieras, cierres de caja y liquidaciones de efectivo.

---

### 2. MATRIZ DE RESPONSABILIDAD POR COLECCIÓN

| Colección / Ruta | Identity (UID Check) | Tenant Boundary | Ownership Check | Role / RBAC | Commercial Status (CURRENT vs TARGET) | Quota Check | Backend Autoridad Requerida |
| :--- | :---: | :---: | :---: | :---: | :--- | :---: | :---: |
| `/users/{uid}` | ✅ `currentUid() == uid` | 🔴 Faltante en update (P0) | ✅ Propio doc | ✅ Platform Admin | **CURRENT:** No valida suscripción.<br>**TARGET:** No aplica (Identidad pura). | ❌ N/A | Auth Trigger (`setUserClaims`) |
| `/tenants/{tenantId}` | ✅ Auth required | ✅ `getTenantId() == tenantId` | N/A (Tenant) | ✅ Admin / Owner | **CURRENT:** `status == 'ACTIVE'` público.<br>**TARGET:** Proyección derivada de `/subscriptions` (DEC-04). | ❌ N/A | `adminMutateSubscription` / `provisionTenantEnterprise` |
| `/subscriptions/{subId}` | ✅ Auth required | ✅ `isTenantMember(tenantId)` | N/A (Tenant) | ✅ Platform Admin | **CURRENT:** Solo lectura para tenant, escritura solo Admin.<br>**TARGET:** Inmutable client-side; mutada solo por Callable (DEC-13). | ❌ N/A | `adminMutateSubscription` (Concurrencia Optimista `version`) |
| `/orders/{orderId}` | ✅ `customerId == currentUid()` | ⚠️ Débil en creación cliente | ✅ Customer / Merchant | ✅ Customer / Courier / Merchant | **CURRENT:** Cliente crea directo sin validar status del comercio.<br>**TARGET:** Pre-commit Gatekeeper + Inbound Lock ante suspensión (DEC-01, DEC-10). | 🔴 Faltante en Rules (Debe evaluarse en backend) | Callable `createAuthoritativeOrder` + Trigger `notifyNewOrder` |
| `/deliveryTrips/{tripId}` | ✅ `senderUid == currentUid()` | N/A (P2P Encomiendas) | ✅ Sender / Courier | ✅ Customer / Courier | **CURRENT:** Dominio B aislado de suscripciones comerciales.<br>**TARGET:** Preservar desacoplamiento absoluto de `/orders` (DEC-20). | ❌ N/A | Inmutable bajo ADR-015 (Courier Core) |
| `/businesses/{businessId}` | ✅ Auth en escritura | 🟡 Vía `comercioId`/`businessId` | ✅ `ownsBusiness()` | ✅ Business Admin | **CURRENT:** Lectura pública global.<br>**TARGET:** Catálogo público condicionado a suscripción activa del tenant. | 🔴 Faltante (MaxBusinesses) | `provisionTenantEnterprise` / Admin Callables |
| `/branches/{branchId}` | ✅ Auth en escritura | ✅ `isTenantMember(tenantId)` | ✅ `ownsBusiness()` | ✅ Business Admin | **CURRENT:** Escritura controlada por Admin de negocio.<br>**TARGET:** Bloqueo estricto por cuota `maxBranches` (5 en Professional). | 🔴 Faltante (MaxBranches) | Callable `createBranch` con check de cuota |
| `/products/{productId}` | ✅ Auth en escritura | 🟡 Vía `businessId` | ✅ `ownsBusiness()` | ✅ Business Admin / Staff | **CURRENT:** Escritura directa client-side desde Merchant Web.<br>**TARGET:** Gatekeeper valida entitlement `CATALOG` (catálogo ilimitado en Professional según DEC-06). | ❌ N/A (Sin cuota de productos) | Callable o Gatekeeper pre-commit |
| `/couriers/{courierId}` | ✅ Auth required | 🟡 Vía `tenantId`/`cityId` | ✅ Propio perfil | ✅ Courier / Supervisor | **CURRENT:** Registro y lectura controlada.<br>**TARGET:** Validar límite `maxCouriers` (10 en Professional). | 🔴 Faltante (MaxCouriers) | Callable de onboarding y aprobación de flota |
| `/courier_balances/{courierId}` | ✅ Auth required | 🔴 Fuga P0 (`isBusinessAdmin`) | ✅ Courier titular | 🔴 Merchant puede leer (P0) | **CURRENT:** Cualquier merchant puede leer balances de courier.<br>**TARGET:** Solo repartidor titular y supervisor auditado (ADR-018 / DEC-21). | ❌ N/A | Solo Cloud Functions (`courierSettlement.ts`) |
| `/courier_cash_ledger/{entryId}` | ✅ Auth required | 🔴 Fuga (`isBusinessAdmin`) | ✅ Courier titular | 🔴 Merchant puede leer | **CURRENT:** Lectura permitida a merchants.<br>**TARGET:** Subledger inmutable de custodia; solo courier y supervisor. | ❌ N/A | Solo Cloud Functions (`courierAccessPolicy.ts`) |
| `/courier_daily_closures/{closureId}` | ✅ Auth required | 🔴 Fuga (`isBusinessAdmin`) | ✅ Courier titular | 🔴 Merchant puede leer | **CURRENT:** Permite lectura amplia.<br>**TARGET:** Inmutable; auditado bajo 4 capas de conciliación (ADR-018). | ❌ N/A | Callables: `initiateCourierDailyClosure`, `verifyCourierDailyClosure` |
| `/financial_events/{eventId}` | ✅ Auth required | ✅ `ownsBusiness()` | ✅ Business Admin | ✅ Admin / Merchant | **CURRENT:** Inmutable en escritura para clientes (`write: if false`).<br>**TARGET:** Preservar inmutabilidad absoluta ante suspensión (DEC-21). | ❌ N/A | Solo Cloud Functions (Triggers de liquidación) |
| `/audit_events/{eventId}` | ✅ Auth required | 🟡 Vía `businessId` | ✅ Actor / Tenant | 🟠 Admin puede borrar (P2) | **CURRENT:** `allow update, delete: if isPlatformAdmin()`.<br>**TARGET:** Inmutable absoluto (`allow update, delete: if false;`) (DEC-22). | ❌ N/A | Todas las Cloud Functions transaccionales |
| `/coupons/{couponId}` | ✅ Auth en escritura | 🟡 Vía `businessId` | ✅ `ownsBusiness()` | ✅ Business Admin | **CURRENT:** Creación client-side directa desde Merchant Web.<br>**TARGET:** Redención atómica gobernada por backend (`coupons.ts`). | ❌ N/A | Callable `redeemCouponAtomic` |
| `/ubicaciones_repartidores/{id}` | ✅ Auth required | ✅ Motorizado propio / Despacho | ✅ Motorizado titular | ✅ Motorizado / Despacho | **CURRENT:** Motorizado actualiza su ubicación cada 5s/60s.<br>**TARGET:** Inmutable bajo ADR-016 (Courier Core Freeze). | ❌ N/A | Worker nativo Android + Dispatch Backend |
| `/usage_counters/{tenantId}/periods/{periodKey}/shards/{shardId}` | ❌ No existe hoy | ❌ No existe hoy | ❌ No existe hoy | ❌ No existe hoy | **CURRENT:** INEXISTENTE.<br>**TARGET:** Solo lectura agregada para tenant; escritura exclusiva de Cloud Functions (`write: if false`). | ✅ Sharded Quota (DEC-08) | `ShardedCounterEngine.ts` (Incremento atómico en 5 shards independientes) |

---

### 3. SÍNTESIS DE ACCIONES CORRECTIVAS PARA FIRESTORE RULES EN C2D.35
1. **Regla `/users/{uid}` (L204-217):** Sellar fuga de lectura global y bloquear mutación de `tenantId` en claves permitidas.
2. **Regla `/courier_balances/{courierId}` (L1180-1186):** Eliminar `isBusinessAdmin()` de la cláusula de lectura.
3. **Regla `/courier_cash_ledger/{entryId}` (L1169-1175):** Eliminar `isBusinessAdmin()` de la cláusula de lectura.
4. **Regla `/audit_events/{eventId}` (L836):** Convertir en estrictamente inmutable (`allow update, delete: if false;`).
5. **Regla `/usage_counters/{docId}` [NEW]:** Declarar `allow read: if isTenantMember(resource.data.tenantId); allow write: if false;`.
