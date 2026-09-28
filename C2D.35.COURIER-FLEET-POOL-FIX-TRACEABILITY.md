# C2D.35.COURIER-FLEET-POOL-FIX-TRACEABILITY.md
**MATRIZ DE TRAZABILIDAD DE REMEDIACIÓN QUIRÚRGICA**

---

### MODIFICACIÓN 1: Inclusión de `city` / `ciudad` en Provenance de Orden (Backend)
- **FILE**: `functions/src/triggers/orders.ts`
- **FUNCTION**: `notifyNewOrder` (Líneas 131-135)
- **OLD BEHAVIOR**:
  ```typescript
  const rawDept = branchData?.departmentId || branchData?.department || branchData?.departamento ||
                  bizData.departmentId || bizData.departamento || bizData.department;
  const rawMuni = branchData?.municipalityId || branchData?.municipio || branchData?.municipality || branchData?.cityId ||
                  bizData.municipalityId || bizData.municipio || bizData.municipality || bizData.cityId;
  ```
  Ignoraba `branchData.city` y `bizData.city`. Para comercios con `city: "Managua"`, resultaba en `rawMuni = undefined` y `commercialMunicipalityId = ""`.
- **NEW BEHAVIOR**:
  ```typescript
  const rawDept = branchData?.departmentId || branchData?.department || branchData?.departamento ||
                  bizData.departmentId || bizData.departamento || bizData.department;
  const rawMuni = branchData?.municipalityId || branchData?.municipio || branchData?.municipality || branchData?.cityId || branchData?.city || branchData?.ciudad ||
                  bizData.municipalityId || bizData.municipio || bizData.municipality || bizData.cityId || bizData.city || bizData.ciudad;
  ```
- **WHY REQUIRED**: Permite que las órdenes de sucursales existentes con esquema `city` resuelvan canónicamente su municipio mediante `normalizeGeoLocationStrict` sin violar el principio fail-closed.
- **RISK**: Nulo. `normalizeGeoLocationStrict` valida que la cadena pertenezca al catálogo oficial de Nicaragua.
- **TEST COVERAGE**: `cityIsolationSecurity.test.ts` (Suite 3 & Suite 4).

---

### MODIFICACIÓN 2: Hidratación Resiliente de Perfil de Repartidor en Android
- **FILE**: `app/src/main/java/com/example/FirebaseManager.kt`
- **FUNCTION**: `obtenerFlujoPedidosCourier` -> `listenerUserProfile` y `listenerCourierProfile` (Líneas 646-649 y 658-661)
- **OLD BEHAVIOR**:
  ```kotlin
  courierCityId = snapshot.getString("operationalMunicipalityId") ?: snapshot.getString("cityId") ?: snapshot.getString("municipalityId") ?: courierCityId
  courierMuniId = snapshot.getString("operationalMunicipalityId") ?: snapshot.getString("municipalityId") ?: courierMuniId
  ```
  Si el documento carece de `operationalMunicipalityId` y `municipalityId`, `courierMuniId` queda vacío, abortando la conexión al pool.
- **NEW BEHAVIOR**:
  ```kotlin
  courierCityId = snapshot.getString("operationalMunicipalityId") ?: snapshot.getString("municipalityId") ?: snapshot.getString("cityId") ?: snapshot.getString("city") ?: snapshot.getString("ciudad") ?: courierCityId
  courierMuniId = snapshot.getString("operationalMunicipalityId") ?: snapshot.getString("municipalityId") ?: snapshot.getString("cityId") ?: snapshot.getString("city") ?: snapshot.getString("ciudad") ?: courierMuniId
  ```
- **WHY REQUIRED**: Resuelve el municipio para repartidores que tengan `city` o `cityId` en su perfil sin romper las validaciones posteriores.
- **RISK**: Bajo. `attachPoolListenerIfNeeded` normaliza con `.trim().uppercase()`.
- **TEST COVERAGE**: Verificación en dispositivo real y tests unitarios.

---

### MODIFICACIÓN 3: Provisión Administrativa de Henry Paz (Datos Canónicos)
- **FILE / DOCUMENT**: Firestore `/users/9QHYGkSa3nWiJ7KfPkccjjuIaYp2` y `/couriers/9QHYGkSa3nWiJ7KfPkccjjuIaYp2`
- **CURRENT DATA**: `operationalMunicipalityId: null`, `tenantId: null`.
- **PROPOSED DATA**:
  - `operationalMunicipalityId`: `"MANAGUA"`
  - `municipalityId`: `"MANAGUA"`
  - `cityId`: `"MANAGUA"`
  - `departmentId`: `"MANAGUA"`
  - `tenantId`: `"ten_bluesystem_core"`
  - `commercialTenantId`: `"ten_bluesystem_core"`
- **WHY REQUIRED**: Henry Paz opera en Managua (como lo confirman sus telemetrías GPS en `12.1056, -86.2701`). Al ser un motorizado legacy, requiere su asignación territorial oficial para cumplir con Firestore Rules y la segmentación del pool.
- **RISK**: Cero impacto en otros repartidores. Se ejecuta bajo autoridad administrativa.
