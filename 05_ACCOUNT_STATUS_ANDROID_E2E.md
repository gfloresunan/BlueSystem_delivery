# 05 — ACCOUNT STATUS ANDROID E2E TEST REPORT

**Proyecto:** BlueSystem Delivery Android  
**Dispositivo Físico:** Samsung Galaxy Z Fold 5 (`RFCW71DR2WY`)  

---

## 1. Verificación E2E de Comercios con Datos Reales

### A. Comercio FRITONI (`dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`)
- **Sucursales en Firestore:**
  - `br_1786988052589` (Fritoni Boer): `status = "OPERATIONAL"`
  - `br_1786993038705` (Fritoni Carretera Masaya): `status = "OPERATIONAL"`
- **Resultado en App:**
  - Apertura de ComercioDetalle: 🟢 **SIN CRASH**
  - Carga de Sucursales: 🟢 **Fritoni Boer** seleccionada como principal.
  - Navegación entre sucursales: 🟢 Operativa.

### B. Comercio El Chanchito (`bbb760d5-a8f3-4700-9a96-f58f11f345ac`)
- **Sucursales en Firestore:**
  - `30945c9c-3aee-4e45-b35d-a998b57cf2fa` (Sucursal Principal): `status = undefined`
- **Resultado en App:**
  - Apertura de ComercioDetalle: 🟢 **SIN CRASH**
  - Carga de Sucursal: Mapeado seguro a `AccountStatus.ACTIVE`.

### C. Comercio Variedades TECNOHOME (`e7dc911e-e587-4be9-a741-7d9d9828011f`)
- **Sucursales en Firestore:**
  - `794f7c02-8077-40a8-b260-2fdd27a6f35d` (Sucursal Principal Las Delicias): `status = undefined`
- **Resultado en App:**
  - Apertura de ComercioDetalle: 🟢 **SIN CRASH**
  - Carga de Sucursal: Mapeado seguro a `AccountStatus.ACTIVE`.
