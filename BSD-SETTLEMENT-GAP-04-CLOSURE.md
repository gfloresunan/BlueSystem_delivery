# ACTA DE CIERRE Y CERTIFICACIÓN: GAP-04 — ADMIN MOBILE CLOSURE APPROVAL ARCHITECTURE

**Protocolo:** `BSD-COURIER-SETTLEMENT-PHASE2-CONTROLLED-IMPLEMENTATION-001`  
**Módulo:** Admin Mobile (`AdminCourierCashCenterScreen.kt`) & Server-Authoritative Closure Verification  
**Fecha:** 2026-09-29  
**Estado:** 🟢 CERTIFIED  

---

## 1. Problema Identificado (Root Cause)
La auditoría forense determinó que `AdminCourierCashCenterScreen.kt` en la aplicación móvil intentaba mutar directamente las colecciones `/courier_daily_closures` y `/courier_balances` desde el cliente Android mediante `FirebaseFirestore.getInstance().collection(...).update(...)`. 

Dado que las reglas de seguridad de Firestore establecen estrictamente:
```javascript
// /courier_balances/{courierId}
allow write: if false;

// /courier_daily_closures/{closureId}
allow create: if isCourier();
allow update: if isCourier() && (resource.data.courierId == request.auth.uid) ...;
```
Cualquier intento de aprobación directa desde Admin Mobile resultaba en `PERMISSION_DENIED`.

**Decisión Inviolable:** Quedó formalmente prohibido debilitar las reglas de Firestore para conceder permisos de escritura a clientes móviles. La solución obligatoria fue unificar la vía de aprobación a través de la Cloud Function certificada `verifyCourierDailyClosure`.

---

## 2. Archivos Modificados
- [`app/src/main/java/com/example/presentation/admin/AdminCourierCashCenterScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/admin/AdminCourierCashCenterScreen.kt)
  - Eliminadas las mutaciones directas de cliente sobre Firestore (`update` de estado y saldos).
  - Integrada la llamada server-authoritative vía `FirebaseFunctions.getInstance().getHttpsCallable("verifyCourierDailyClosure")` con payload canónico `{"closureId": closure.id, "action": "VERIFY"}`.
  - Adaptada la deserialización de documentos para soportar campos canónicos de la certificación (`expectedAmountCents`, `bankDeposit.depositAmountCents`, `depositDiscrepancyCents`, `officialAct.actNumber`) y compatibilidad retrospectiva.
  - Estados actualizados a canonical: `PENDING_ADMIN_VERIFICATION`, `VERIFIED`, `REJECTED`.

## 3. Archivos NO Modificados (Financial Core Preservado)
- `functions/src/services/courierCashLedgerService.ts` (100% Intacto)
- `functions/src/triggers/orders.ts` (100% Intacto)
- `functions/src/triggers/trips.ts` (100% Intacto)
- Colección canónica `/courier_balances` (SSOT Preservado)
- Colección canónica `/courier_cash_ledger` (SSOT Preservado)

---

## 4. Pruebas y Evidencia de Certificación
Se ejecutó la suite de pruebas automatizada [`functions/src/__tests__/adminMobileClosureApproval.test.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/__tests__/adminMobileClosureApproval.test.ts):

```
▶ GAP-04: Admin Mobile Closure Approval & Security Architecture
  ✔ Test 1: Rechaza solicitudes sin autenticación (3.7957ms)
  ✔ Test 2: Rechaza usuarios no autorizados (repartidor o cliente intentando aprobar) (0.7815ms)
  ✔ Test 3: Admin Mobile ejecuta exitosamente verifyCourierDailyClosure con payload móvil (4.2042ms)
  ✔ Test 4: Idempotencia en aprobaciones repetidas desde Mobile (1.202ms)
  ✔ Test 5: Flujo de rechazo formal con motivo auditable (1.1965ms)
✔ GAP-04: Admin Mobile Closure Approval & Security Architecture (16.167ms)
ℹ tests 5 | pass 5 | fail 0
```

### Prueba de Regresión del Financial Core:
```
▶ CERTIFICACIÓN E2E FORENSE — COURIER CASH LEDGER & SETTLEMENT SUITE
  ✔ TEST 01 a 11: 11 tests aprobados (0 fallos)
```

---

## 5. Matriz de Estado y Resolución de Arquitectura
```
                      ADMIN WEB ────────┐
                                        ├──> verifyCourierDailyClosure()
                      ADMIN MOBILE ─────┘               │
                                                        ▼
                                          ┌───────────────────────────┐
                                          │ 1. Atomic Transaction     │
                                          │ 2. Issue Official Act     │
                                          │ 3. Ledger DEBIT Entry     │
                                          │ 4. Decrement Balance      │
                                          │ 5. Audit Event Log        │
                                          │ 6. Email & Push Dispatch  │
                                          └───────────────────────────┘
```

**Conclusión:** Ambas interfaces (Web y Mobile) consumen ahora la misma Single Source of Truth para liquidación sin vulnerar las reglas de Firestore.

**Estatus Final GAP-04:** 🟢 CERTIFIED
