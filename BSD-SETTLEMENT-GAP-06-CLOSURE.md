# ACTA DE CIERRE Y CERTIFICACIÓN: GAP-06 — MULTI-TENANT SECURITY & TENANT ISOLATION

**Protocolo:** `BSD-COURIER-SETTLEMENT-PHASE2-CONTROLLED-IMPLEMENTATION-001`  
**Módulo:** Firestore Security Rules & Multi-Tenant Boundary (`/courier_daily_closures/{closureId}`)  
**Fecha:** 2026-09-29  
**Estado:** 🟢 CERTIFIED  

---

## 1. Problema Identificado (Root Cause)
La auditoría forense detectó que la regla de lectura sobre `/courier_daily_closures/{closureId}` contenía la función `isBusinessAdmin()`:
```javascript
// REGLA ANTERIOR VULNERABLE
match /courier_daily_closures/{closureId} {
  allow read: if isAuthenticated() && (
    currentUid() == resource.data.courierId ||
    isPlatformAdmin() ||
    isBusinessAdmin() || // ⚠️ VULNERABILIDAD: dueños de comercios podían leer liquidaciones globales
    isSupervisor()
  );
  allow write: if false;
}
```
Esto permitía que dueños, gerentes o administradores de comercios afiliados (restaurantes, farmacias) tuvieran acceso de lectura a los cierres diarios de caja de cualquier motorizado, comprometiendo comprobantes de depósito bancario, diferencias en mesa e información financiera privada de la plataforma. Además, los cierres no contaban con estampado explícito de `tenantId` al momento de inicialización ni filtro tenant-bound para supervisores locales.

---

## 2. Matriz de Acceso Auditada (Current vs Expected Access Matrix)

| Colección | Operación | Actor / Rol | Alcance Tenant | Regla Anterior | Regla Certificada (GAP-06) | Veredicto |
|---|---|---|---|---|---|---|
| `/courier_daily_closures/{id}` | Read | Motorizado (`currentUid() == courierId`) | Cierre propio | `ALLOW` | `ALLOW` | 🟢 Conforme |
| `/courier_daily_closures/{id}` | Read | Administrador de Comercio (`isBusinessAdmin()`) | Cualquier comercio | `ALLOW` ⚠️ | `DENY` 🔒 | 🟢 Aislamiento Blindado |
| `/courier_daily_closures/{id}` | Read | Supervisor de Tenant A | Cierre de Tenant A | `ALLOW` | `ALLOW` | 🟢 Conforme |
| `/courier_daily_closures/{id}` | Read | Supervisor de Tenant A | Cierre de Tenant B | `ALLOW` ⚠️ | `DENY` 🔒 | 🟢 Aislamiento Multi-Tenant |
| `/courier_daily_closures/{id}` | Read | Platform Admin / Super Admin | Todos los tenants | `ALLOW` | `ALLOW` | 🟢 Gobernanza Global |
| `/courier_daily_closures/{id}` | Write | Cualquier SDK Cliente | Cualquier tenant | `DENY` | `DENY` (`allow write: if false`) | 🟢 Server-Authoritative |

---

## 3. Archivos Modificados
- [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules) & [`app/src/main/firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/firestore.rules)
  - Eliminado formalmente `isBusinessAdmin()`.
  - Incorporado control estricto de frontera de inquilinos (`tenantId` matching y `isTenantMember`).
- [`functions/src/callables/courierClosureCallables.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/callables/courierClosureCallables.ts)
  - Función `initiateCourierDailyClosure` actualizada para estampar canónicamente `tenantId` en el documento `/courier_daily_closures/{closureId}` desde el momento de su creación.

## 4. Archivos NO Modificados (Financial Core Preservado)
- `functions/src/services/courierCashLedgerService.ts` (100% Intacto)
- `functions/src/triggers/orders.ts` (100% Intacto)
- `functions/src/triggers/trips.ts` (100% Intacto)
- Colecciones `/courier_balances` y `/courier_cash_ledger` (SSOT Inalterado)

---

## 5. Pruebas y Evidencia de Certificación
Se ejecutó la suite de pruebas unitarias y de reglas de seguridad [`functions/src/__tests__/courierClosureMultiTenantSecurity.test.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/__tests__/courierClosureMultiTenantSecurity.test.ts):

```
▶ GAP-06: Multi-Tenant Security & Tenant Isolation Suite
  ✔ Test 1: Courier A puede leer su propio cierre pero Courier B NO puede leer el de Courier A (1.7551ms)
  ✔ Test 2: Administrador de comercio (Business Admin / Store Owner) tiene lectura DENEGADA (0.3458ms)
  ✔ Test 3: Supervisor de Tenant A puede leer Cierre A pero se le RECHAZA acceso a Cierre B (Aislamiento Multi-Tenant) (0.3574ms)
  ✔ Test 4: Platform Admin / Super Admin conserva acceso gobernado sobre todos los tenants (0.2767ms)
  ✔ Test 5: Escritura directa de cliente prohibida en cualquier circunstancia (allow write: if false) (2.0799ms)
✔ GAP-06: Multi-Tenant Security & Tenant Isolation Suite (8.3328ms)
ℹ tests 5 | pass 5 | fail 0
```

### Prueba de Regresión del Financial Core:
```
▶ CERTIFICACIÓN E2E FORENSE — COURIER CASH LEDGER & SETTLEMENT SUITE
  ✔ TEST 01 a 11: 11 tests aprobados (0 fallos)
```

**Estatus Final GAP-06:** 🟢 CERTIFIED
