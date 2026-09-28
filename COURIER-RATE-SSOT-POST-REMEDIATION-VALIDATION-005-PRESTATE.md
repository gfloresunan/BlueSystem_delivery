# ESTADO PREVIO DE VALIDACIÓN POST-REMEDIACIÓN SSOT TARIFA COURIER
## PROTOCOLO: COURIER-RATE-SSOT-POST-REMEDIATION-VALIDATION-005
**Fecha de Generación:** 2026-09-08T09:37:00-06:00  
**Entorno:** Inspection & Forensic Validation (Zero Mutation)  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Modalidad:** READ + INSPECT + TRACE + EXECUTE TESTS + FORENSIC VALIDATION  

---

## 1. ANTECEDENTES Y CADENA DE AUDITORÍA

La arquitectura de tarifas de Courier ha atravesado las siguientes fases formales de gobernanza:

1. **`COURIER_EARNINGS_DISTANCE_FORENSIC_001`**: Desacoplamiento de cobro de envío del comercio (`deliveryFee`) vs ganancia por distancia del motorizado (`courierDistanceEarnings`).
2. **`COURIER-RATE-CONFIG-SSOT-AUDIT-002`**: Identificación de bypass en cliente Android (`CustomerHomeViewModel.kt`), bloqueo condicional en `orders.ts` y fallback espurio `7.0` en `FirebaseManager.kt`.
3. **`COURIER-RATE-FALLBACK-FORENSIC-003`**: Mapeo forense exhaustivo de los 3 vectores de fuga de runtime y confirmación de violación SSOT.
4. **`COURIER-RATE-SSOT-REMEDIATION-004`**: Remediación quirúrgica en backend (`orders.ts`, `trips.ts`), cliente (`CustomerHomeViewModel.kt`) y courier consumer (`FirebaseManager.kt`), junto con suite de 21 pruebas unitarias deterministas (`courierRateSsotRemediation004.test.ts`).

---

## 2. BASELINE DE MODIFICACIONES AUTORIZADAS (REMEDIATION-004)

### Archivos Modificados en la Remediación
1. **`app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt`**:
   - *Modificación:* Eliminación de campos de autoridad financiera (`courierRatePerKmApplied`, `courierDistanceEarnings`, `courierTotalEarnings`). El cliente conserva únicamente la estimación geométrica (`routeDistanceMeters`, `routeDistanceKm`, `distanceSource = "FALLBACK_ESTIMATED"`).
2. **`functions/src/triggers/orders.ts`**:
   - *Modificación:* `courierRatePerKm` se inicializa en `null`. Se eliminó la adopción del valor del cliente. La lectura de `/system_config/global` es incondicional (independiente de `bizData.commissionOverrideRate`). Validación fail-closed estricta si la tarifa es nula/negativa/inválida.
3. **`functions/src/triggers/trips.ts`**:
   - *Modificación:* Inicialización en `null`, lectura de `/system_config/global` incondicional, validación fail-closed y respeto estricto de snapshot congelado.
4. **`app/src/main/java/com/example/FirebaseManager.kt`**:
   - *Modificación:* `courierRatePerKmApplied` eliminado el fallback `?: 7.0` y sustituido por `?: 0.0` (indicador de ausencia de snapshot).

### Archivos No Modificados (Preservados Intactos)
- `/businesses`, `/branches`, `/products`, categorías y catálogos comerciales.
- Reglas de asignación y despacho (`FleetEligibilityEngine`, `runTransaction`).
- Modelos contables de liquidación (`onOrderDelivered`, `/financial_events`, `/courier_cash_ledger`, `/courier_balances`).
- Módulo de Control Tower Web (`DeliveryControlTowerModule.tsx`).
- Módulo de Encomiendas X→Y (ADR-015 Location Architecture Freeze).

---

## 3. INVARIANTES QUE DEBEN PRESERVARSE

1. **SSOT Único:** `/system_config/global.courierRatePerKm` es la única autoridad de tarifa para nuevas operaciones.
2. **Zero-Trust Client:** El cliente Customer no tiene autoridad monetaria sobre la remuneración del Courier.
3. **Aislamiento de Comisión:** La comisión del comercio no afecta la tarifa del motorizado.
4. **Fail-Closed:** Si la configuración no está disponible, el sistema no inventa valores ni recurre a `7.0`.
5. **Inmutabilidad de Snapshot:** Órdenes históricas procesadas bajo tarifa previa (ej. `7.0`) liquidan estrictamente bajo su snapshot sellado sin ser alteradas por cambios posteriores en Admin (ej. `8.0` o `10.0`).
6. **Consistencia Aritmética:** Todas las operaciones monetarias se liquidan en centavos enteros (`Math.round(...)`) con paridad exacta entre backend y cliente.

---

## 4. REGISTRO PREVIO DE MUTACIONES
```text
CODE MUTATIONS = 0
DATABASE MUTATIONS = 0
CONFIGURATION MUTATIONS = 0
DEPLOYMENTS = 0
TEST FILE MUTATIONS = 0
PRODUCTION WRITES = 0
```
