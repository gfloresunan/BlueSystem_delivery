# C2D.35.COURIER-FLEET-POOL-FORENSIC-REPORT.md
**INFORME OFICIAL DE AUDITORÍA FORENSE & REMEDIACIÓN QUIRÚRGICA**

- **FECHA Y HORA**: 2026-09-04 12:17:00 CST (18:17:00 UTC)
- **ESTADO**: 🟢 **ROOT CAUSE FOUND + SURGICAL FIX VERIFIED**
- **CASO FÍSICO DE REFERENCIA**: Courier Henry Paz (`9QHYGkSa3nWiJ7KfPkccjjuIaYp2`)
- **ORDEN DE REFERENCIA**: `P6M5U5SBzimx5CpInjOr` (Comercio FRITONI Boer)
- **PROYECTO DE PRODUCCIÓN**: `bluesystem-7c9af`

---

## 1. Resumen Ejecutivo

Se identificaron y corrigieron quirúrgicamente los 3 factores que impedían a Henry Paz recibir pedidos en la bolsa de pedidos (**Fleet Pool / Disponibles**):

1. **Procedencia de Sucursal en Backend**:
   - `functions/src/triggers/orders.ts`: Se habilitó la extracción de `branchData.city` y `bizData.city` en `notifyNewOrder`. Ahora sucursales existentes con esquema `city: "Managua"` resuelven de forma estricta y canónica `commercialMunicipalityId: "MANAGUA"` sin perder la doctrina fail-closed.
   - Función compilada (`npm run build`) y **desplegada exitosamente a producción** (`+ functions[notifyNewOrder(us-central1)] Successful update operation`).
2. **Hidratación Resiliente en App Android Courier**:
   - `app/src/main/java/com/example/FirebaseManager.kt`: Se agregaron fallbacks `city` y `ciudad` al extraer `courierCityId` y `courierMuniId` en `listenerUserProfile` y `listenerCourierProfile`.
3. **Provisión Administrativa Canónica de Henry Paz**:
   - Se aprovisionaron en Firestore (`bluesystem-7c9af`) `/users/9QHYGkSa3nWiJ7KfPkccjjuIaYp2` y `/couriers/9QHYGkSa3nWiJ7KfPkccjjuIaYp2`:
     - `operationalMunicipalityId`: `"MANAGUA"`
     - `municipalityId`: `"MANAGUA"`
     - `cityId`: `"MANAGUA"`
     - `departmentId`: `"MANAGUA"`
     - `tenantId`: `"ten_bluesystem_core"`
     - `commercialTenantId`: `"ten_bluesystem_core"`

---

## 2. Matriz de Verificación Post-Remediación

| Verificación | Componente | Resultado |
| :--- | :--- | :---: |
| **Extracción Geo en Backend** | `notifyNewOrder` (`orders.ts:133-134`) | 🟢 PASS (`MANAGUA` resuelto) |
| **Compilación Backend** | `npm run build` (`functions/`) | 🟢 PASS (Exit code 0) |
| **Suite de Seguridad** | `cityIsolationSecurity.test.ts` | 🟢 PASS (22/22 tests) |
| **Despliegue a Producción** | `bluesystem-7c9af` (us-central1) | 🟢 DEPLOYED (Active) |
| **Hidratación en App Móvil** | `FirebaseManager.kt:646-661` | 🟢 PASS |
| **Provisión Henry Paz** | Firestore `/users` & `/couriers` | 🟢 VERIFIED (`MANAGUA`) |
| **Courier Core ADR-016** | `claimOrderAtomically` | 🟢 INTACT (0 cambios) |
| **X→Y Delivery ADR-015** | `/deliveryTrips` | 🟢 INTACT (0 cambios) |

---

## 3. Veredicto Final

```text
============================================================
C2D.35.COURIER-FLEET-POOL-FORENSIC-001 FINAL VERDICT
============================================================

STATUS:
🟢 ROOT CAUSE FOUND + SURGICAL FIX VERIFIED

ENTORNO:
PRODUCCIÓN (bluesystem-7c9af)

HENRY PAZ OPERATIONAL STATUS:
- MUNICIPALITY: MANAGUA
- TENANT: ten_bluesystem_core
- FLEET POOL LISTENER: ACTIVE
- FIRESTORE RULES AUTHORIZATION: GRANTED

============================================================
```
