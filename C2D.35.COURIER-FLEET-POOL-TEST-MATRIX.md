# C2D.35.COURIER-FLEET-POOL-TEST-MATRIX.md
**MATRIZ DE PRUEBAS DE SEGURIDAD Y DISPONIBILIDAD DE FLOTA**

---

| ID | Escenario de Prueba | Comportamiento Esperado | Estado Actual | Estado Post-Fix |
| :---: | :--- | :--- | :---: | :---: |
| **TEST 01** | Henry Paz + Pedido Managua `ready` | Pedido visible en Fleet Pool `Disponibles (1)` | 🔴 FAIL (0) | 🟢 PASS |
| **TEST 02** | Pedro Flores + Pedido Ciudad Darío `ready` | Pedido visible en Fleet Pool `Disponibles (1)` | 🟢 PASS | 🟢 PASS |
| **TEST 03** | Henry (Managua) vs Pedido Jinotega | Pedido NO visible en Fleet Pool | 🟢 PASS | 🟢 PASS |
| **TEST 04** | Courier tenant ajeno vs Pedido `ten_bluesystem_core` | Pedido NO visible en Fleet Pool | 🟢 PASS | 🟢 PASS |
| **TEST 05** | Pedido con `commercialMunicipalityId = ""` | Bloqueado / No emitido al pool | 🟢 PASS | 🟢 PASS |
| **TEST 06** | Pedido con municipio inválido | Rechazado en backend / Fail-closed | 🟢 PASS | 🟢 PASS |
| **TEST 07** | FCM con municipio Managua | Notificación emitida a `fleet_ten_bluesystem_core_MANAGUA` | 🟢 PASS | 🟢 PASS |
| **TEST 08** | FCM con municipio null/vacío | Broadcast abortado (cero fuga nacional) | 🟢 PASS | 🟢 PASS |
| **TEST 09** | Lectura directa Firestore cross-municipio | `PERMISSION_DENIED` por Firestore Rules | 🟢 PASS | 🟢 PASS |
| **TEST 10** | Claim transaccional cross-municipio | `PERMISSION_DENIED` / Rechazado | 🟢 PASS | 🟢 PASS |
| **TEST 11** | Manual assignment a Henry Paz | Pedido recibido como `"¡PEDIDO ASIGNADO DIRECTAMENTE!"` | 🟢 PASS | 🟢 PASS |
| **TEST 12** | Manual assignment a repartidor inactivo | Rechazado por reglas comerciales | 🟢 PASS | 🟢 PASS |
| **TEST 13** | Orden en estado `READY` | Visible en Fleet Pool | 🔴 FAIL (Henry) | 🟢 PASS |
| **TEST 14** | Orden en estado `PENDING` | NO visible en Fleet Pool | 🟢 PASS | 🟢 PASS |
| **TEST 15** | Orden en estado `PREPARING` | NO visible en Fleet Pool | 🟢 PASS | 🟢 PASS |
| **TEST 16** | Orden en estado `ASSIGNED` | NO visible en Fleet Pool | 🟢 PASS | 🟢 PASS |
