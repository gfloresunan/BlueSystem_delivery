# INFORME DE MICRO-AUDITORÍA FORENSE DE FALLBACK DE TARIFA COURIER
## PROTOCOLO: COURIER-RATE-FALLBACK-FORENSIC-003
### BlueSystem Delivery Enterprise v2.3
### Fecha de Ejecución: 08 de Septiembre de 2026

---

## 1. RESUMEN EJECUTIVO (EXECUTIVE SUMMARY)

### 1.1 Objetivo del Dictamen
Determinar con evidencia forense objetiva, rastreo estricto de control de flujo (Control Flow Trace), análisis de alcanzabilidad (Reachability Analysis) y grafos de llamada (Call Graph) si los valores hardcodeados de **C$ 7.00 / km** detectados en:
1. `functions/src/triggers/orders.ts`
2. `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt`
3. `app/src/main/java/com/example/FirebaseManager.kt`
4. `functions/src/triggers/trips.ts`

pueden ejecutarse realmente en runtime y, por tanto, **convertirse en una segunda fuente de verdad espuria que suplante o anule la configuración administrativa oficial vigente en `/system_config/global.courierRatePerKm`**.

### 1.2 Dictamen Definitivo
# 🔴 DICTAMEN: FAIL — SSOT VIOLATION (VIOLACIÓN CRÍTICA DEL SINGLE SOURCE OF TRUTH)

Se ha demostrado mediante inspección analítica del código fuente que **SÍ es posible que una NUEVA orden termine utilizando C$ 7.00/km cuando el Administrador tiene configurado C$ 8.00/km o C$ 10.00/km en `/system_config/global`**.

Existen **tres (3) vectores reales de fuga en runtime** donde el valor hardcoded C$ 7.00 se impone sobre el valor de Admin:
1. **Vector 1 (Customer Injection Bypass):** `CustomerHomeViewModel.kt` (L636) inyecta hardcoded `"courierRatePerKmApplied": 7.0` en el payload de creación de la orden. En el backend, `orders.ts` (L180) tiene la condición `if (gData.courierRatePerKm != null && order.courierRatePerKmApplied == null)`. Al no ser nulo, **el backend ignora la configuración de Admin (`C$ 8.00`) y preserva los `C$ 7.00` inyectados por el cliente**.
2. **Vector 2 (Scope Else Bypass en Comercios con Comisión Especial):** En `orders.ts` (L164), la lectura de `/system_config/global` está encapsulada dentro del bloque `else` de `bizData.commissionOverrideRate`. Si un comercio tiene comisión personalizada, **el backend jamás lee `/system_config/global`**, manteniendo la variable inicial `let courierRatePerKm = 7.0`.
3. **Vector 3 (Fallback Silencioso por Falla de Red / Firestore):** Si la lectura de `/system_config/global` falla (timeout, error de permisos o indisponibilidad), el bloque `catch` (L190) captura el error sin abortar la orden, estampando en `/orders/{orderId}` la tarifa residual `C$ 7.00`.

---

## 2. MATRIZ DE LOCALIZACIÓN EXACTA DE TODOS LOS FALLBACKS (FASE 1)

| # | Archivo | Línea | Variable / Expresión | Contexto | Clasificación | Alcance |
|---|---|---|---|---|---|---|
| 1 | `functions/src/triggers/orders.ts` | 153 | `let courierRatePerKm = 7.0;` | Inicialización en trigger `notifyNewOrder` (`onCreate`) | **A. Runtime fallback / B. Runtime default** | 🔴 REACHABLE |
| 2 | `functions/src/triggers/orders.ts` | 180 | `&& order.courierRatePerKmApplied == null` | Guardia que condiciona la adopción de `gData.courierRatePerKm` | **C. Runtime hardcode condition** | 🔴 REACHABLE |
| 3 | `functions/src/triggers/orders.ts` | 1066 | `let courierRatePerKm = 7.0;` | Inicialización en trigger `onOrderDelivered` (`onUpdate`) | **A. Runtime fallback / B. Runtime default** | 🔴 REACHABLE |
| 4 | `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt` | 636 | `val courierRatePerKmApplied = 7.0` | Checkout del cliente previo a creación en Firestore | **C. Runtime hardcode** | 🔴 REACHABLE |
| 5 | `app/src/main/java/com/example/FirebaseManager.kt` | 417 | `?.takeIf { it > 0.0 } ?: 7.0` | Deserialización de oferta de pedido en Courier App | **A. Runtime fallback** | 🔴 REACHABLE |
| 6 | `app/src/main/java/com/example/FirebaseManager.kt` | 420 | `(routeDistanceKm * courierRatePerKmApplied)` | Fallback de cálculo de ganancia por km si campo falta | **A. Runtime fallback** | 🔴 REACHABLE |
| 7 | `functions/src/triggers/trips.ts` | 69 | `let courierRatePerKm = 7.0;` | Inicialización en encomiendas X→Y (`onTripCompleted`) | **A. Runtime fallback / B. Runtime default** | 🔴 REACHABLE |
| 8 | `panel-admin/public/js/dashboard/config.js` | 135 | `value="7.00"` | Valor por defecto en formulario HTML de Admin Web | **B. Runtime default (UI)** | 🟢 CONTROLLED |
| 9 | `panel-admin/public/js/dashboard/config.js` | 302 | `: '7.00'` | Fallback al renderizar configuración de plataforma | **A. Runtime fallback (UI)** | 🟢 CONTROLLED |
| 10 | `panel-admin/public/js/dashboard/config.js` | 548 | `\|\| 7.00;` | Fallback al guardar formulario si input está vacío | **A. Runtime fallback (UI)** | 🟢 CONTROLLED |
| 11 | `functions/src/__tests__/courierFinancialPolicyFreezePOL001_023.test.ts` | 24, 60, 270 | `courierRatePerKm: 7.0` | Suite de congelamiento de políticas de liquidación | **D. Unit test fixture** | ⚪ TEST ONLY |
| 12 | `functions/src/__tests__/courierEarningsPaymentModelPAY001_020.test.ts` | 21, 39, 238 | `courierRatePerKm: 7.0` | Suite de pruebas de modelo de pagos y comisiones | **D. Unit test fixture** | ⚪ TEST ONLY |
| 13 | `functions/src/__tests__/courierEarningsForensicPostValidationFV001_020.test.ts` | 24, 42, 444 | `courierRatePerKm: 7.0` | Suite de validación pos-remediación contable | **D. Unit test fixture** | ⚪ TEST ONLY |
| 14 | `functions/src/__tests__/courierEarningsDistanceForensic001.test.ts` | 78, 112 | `ratePerKm = params.courierRatePerKm ?? 7.0;` | Suite forense de desacoplamiento propina/distancia | **D. Unit test fixture** | ⚪ TEST ONLY |
| 15 | `app/src/test/java/com/example/courier/CourierEarningsPaymentModelTest.kt` | 23, 52, 83 | `courierRatePerKmApplied = 7.0` | Suite unitaria Android de modelo financiero | **D. Unit test fixture** | ⚪ TEST ONLY |
| 16 | `COURIER_FINANCIAL_POLICY_FREEZE.md` | 90 | `courierRatePerKm = C$ 7.00/km` | Documentación formal de políticas de liquidación | **E. Documentation / F. Comment** | ⚪ DOC ONLY |

---

## 3. GRAFO DE LLAMADA Y ANÁLISIS DE CONTROL DE FLUJO (FASE 2 Y 3)

### 3.1 Grafo de Llamadas de Creación y Despacho
```
                     [CLIENTE: CustomerHomeViewModel.kt]
                                      │
                                      │ Inyecta courierRatePerKmApplied = 7.0
                                      ▼
                        [/orders/{orderId} en Firestore]
                                      │
                                      │ Trigger onCreate
                                      ▼
                      [BACKEND: notifyNewOrder (orders.ts)]
                                      │
                     ┌────────────────┴────────────────┐
     ¿bizData tiene comisión override?                 │
                     │                                 │
            SÍ ──────┘                                 │ NO
            ▼                                          ▼
 [Salta lectura de system_config]          [Lee /system_config/global]
            │                                          │
            │ courierRatePerKm queda en 7.0            ▼
            │                         ¿order.courierRatePerKmApplied == null?
            │                                          │
            │                                 NO ──────┤ (Viene 7.0 de Customer)
            │                                          ▼
            │                            [IGNORA TARIFA DE ADMIN (8.0)]
            │                                          │
            └───────────────────┬──────────────────────┘
                                │
                                ▼
         Estampa en /orders/{orderId}: courierRatePerKmApplied = 7.0
                                │
                                ▼
            [COURIER: PedidosEntrantesScreen / FirebaseManager]
                     Lee y calcula ganancia con C$ 7.00
                                │
                                ▼
             [FINANCE: onOrderDelivered / courier_balances]
                    Liquida definitivamente con C$ 7.00
```

### 3.2 Análisis Línea a Línea del Control de Flujo en `orders.ts`

```typescript
// orders.ts:L153
let courierRatePerKm = 7.0; // [PUNTO 1: Inicialización con Fallback Hardcoded]

// orders.ts:L157-159
if (order.courierRatePerKmApplied != null && Number(order.courierRatePerKmApplied) > 0) {
    courierRatePerKm = Number(order.courierRatePerKmApplied); // [PUNTO 2: Acepta valor del cliente sin validar contra Admin]
}

// orders.ts:L164-166
if (bizData.commissionOverrideRate !== undefined && bizData.commissionOverrideRate !== null) {
    commissionRate = Number(bizData.commissionOverrideRate);
    // [ERROR DE ARQUITECTURA]: La lectura de system_config/global está en el ELSE.
    // Si el negocio tiene override de comisión, el backend NUNCA lee system_config.
} else {
    try {
        const globalCfgDoc = await db.collection("system_config").doc("global").get();
        if (globalCfgDoc.exists) {
            const gData = globalCfgDoc.data() || {};
            ...
            // orders.ts:L180-182
            if (gData.courierRatePerKm != null && order.courierRatePerKmApplied == null) {
                courierRatePerKm = Number(gData.courierRatePerKm);
                // [PUNTO CRÍTICO]: Solo adopta la tarifa de Admin SI order.courierRatePerKmApplied es null.
                // Pero CustomerHomeViewModel.kt SIEMPRE lo envía con 7.0.
            }
        }
    } catch (cfgErr) {
        // [PUNTO 3: En error de lectura, no aborta ni alerta; prosigue con 7.0 silencioso]
        functions.logger.warn(`[CONFIG_WARN] Error leyendo system_config/global:`, cfgErr);
    }
}
```

---

## 4. MATRIZ DE CONDICIONES DEL BACKEND (FASE 3)

| Caso ID | Entrada /system_config/global | Entrada order.courierRatePerKmApplied | Rama de Código | ¿Se activa Fallback? | Tarifa Final Aplicada | Estatus SSOT |
|---|---|---|---|---|---|---|
| **CASE-BE-001** | `courierRatePerKm = 8` | `null` (orden pura de API) | L180 `(gData != null && order == null)` | NO | **8.0** | 🟢 PASS |
| **CASE-BE-002** | `courierRatePerKm = 10` | `null` (orden pura de API) | L180 `(gData != null && order == null)` | NO | **10.0** | 🟢 PASS |
| **CASE-BE-003** | `courierRatePerKm = null` | `null` | L180 evalúa false $\to$ mantiene L153 | **SÍ (Fallback 7.0)** | **7.0** | 🟡 FALLBACK |
| **CASE-BE-004** | `courierRatePerKm = 0` | `null` | L180 asigna `Number(0)` = `0.0` | NO (asigna 0) | **0.0** | 🔴 ANOMALÍA |
| **CASE-BE-005** | Campo ausente | `null` | L180 evalúa false $\to$ mantiene L153 | **SÍ (Fallback 7.0)** | **7.0** | 🟡 FALLBACK |
| **CASE-BE-006** | Doc `/system_config/global` no existe | `null` | L169 `exists == false` $\to$ mantiene L153 | **SÍ (Fallback 7.0)** | **7.0** | 🟡 FALLBACK |
| **CASE-BE-007** | Lectura lanza Excepción / Timeout | `null` | L190 `catch` $\to$ mantiene L153 | **SÍ (Fallback 7.0)** | **7.0** | 🔴 FALLA SILENCIOSA |
| **CASE-BE-008** | Estructura inválida (objeto/array) | `null` | `Number({})` = `NaN` $\to$ L309 guarda `NaN` | NO | **NaN** | 🔴 CRASH NUMÉRICO |
| **CASE-BE-009** | String `"8"` | `null` | `Number("8")` = `8.0` | NO | **8.0** | 🟢 PASS |
| **CASE-BE-010** | String `"invalid"` | `null` | `Number("invalid")` = `NaN` | NO | **NaN** | 🔴 CRASH NUMÉRICO |
| **CASE-BE-011** | Negativo `-5.0` | `null` | Asigna `-5.0` (sin clamp mínimo) | NO | **-5.0** | 🔴 GRAVE |
| **CASE-BE-012** | Decimal `8.25` | `null` | Asigna `8.25` | NO | **8.25** | 🟢 PASS |
| **CASE-BE-V1** | **`courierRatePerKm = 8`** | **`7.0` (Customer App actual)** | **L157-158 asigna 7.0; L180 es FALSE** | **SÍ (Gana Cliente 7.0)**| **7.0** | 🔴 **SSOT VIOLATION** |
| **CASE-BE-V2** | **`courierRatePerKm = 8`** | **`bizData.commissionOverride` activo** | **L164 TRUE $\to$ ELSE no se ejecuta** | **SÍ (Ignora Admin 8.0)**| **7.0** | 🔴 **SSOT VIOLATION** |

---

## 5. DEMOSTRACIÓN DE LOS ESCENARIOS DEFINITIVOS (FASES 4 A 10)

### 5.1 Escenario C$ 8 (Fase 4)
* **Condición Ideal (Orden sin inyección de cliente y sin comisión override):**
  * Admin: `courierRatePerKm = 8`
  * `routeDistanceKm = 4.2`
  * `courierDistanceEarnings = 4.2 * 8 = C$ 33.60`
  * `courierTipEarnings = C$ 40.00`
  * `courierTotalEarnings = 33.60 + 40.00 = C$ 73.60`
  * **Comportamiento en Backend:** Si `order.courierRatePerKmApplied == null`, el backend procesa exitosamente C$ 8.00.
  * **Comportamiento Real con App Cliente:** La app cliente envía `7.0` $\implies$ **El backend procesa C$ 7.00, FALLANDO el escenario C$ 8**.

### 5.2 Escenario C$ 10 (Fase 5)
* **Condición:** Admin configura C$ 10.00 en `/system_config/global`.
* **Resultado:** Idéntico a Fase 4. La orden del cliente llega con `7.0`, el backend aborta la lectura de `system_config` porque `order.courierRatePerKmApplied != null`, y la orden queda estampada con `courierRatePerKmApplied = 7.0` en lugar de `10.0`.

### 5.3 Inmutabilidad Histórica (Fase 6)
* **Condición:**
  * Orden A creada cuando la tarifa era C$ 8.00 (`order.courierRatePerKmApplied = 8.0`).
  * Posteriormente, Admin cambia `/system_config/global.courierRatePerKm` a C$ 10.00.
  * El repartidor entrega la orden y se dispara `onOrderDelivered`.
* **Control Flow en `orders.ts` (L1105-1107):**
  ```typescript
  if (after.courierRatePerKmApplied != null) {
      courierRatePerKm = Number(after.courierRatePerKmApplied);
  }
  ```
* **Resultado:** **🟢 PASS**. El trigger `onOrderDelivered` respeta el snapshot congelado de la orden (`8.0`) y **no recalcula** con la tarifa global actual (`10.0`). La inmutabilidad histórica se cumple al 100%.

### 5.4 Prueba de Falla de Lectura de Configuración (Fase 7)
* **Condición:** Admin tiene configurado C$ 8.00, pero la llamada `db.collection("system_config").doc("global").get()` falla (red, timeout o desconexión).
* **Control Flow en `orders.ts` (L167-193):**
  1. `let courierRatePerKm = 7.0;` ya fue asignado en L153.
  2. La promesa rechaza $\to$ entra al `catch (cfgErr)` en L190.
  3. Emite log de advertencia `[CONFIG_WARN] Error leyendo system_config/global:`.
  4. La función **no lanza excepción ni aborta la creación de la oferta**.
  5. La orden se persiste en Firestore con:
     * `courierRatePerKmApplied = 7.0`
     * `courierDistanceEarnings = routeDistanceKm * 7.0`
     * `courierTotalEarnings = (routeDistanceKm * 7.0) + tip`
  6. **Respuesta a la Pregunta de la Fase 7:**
     * ¿Qué hace `orders.ts`? **Opción B: Utiliza 7.0.**
     * ¿Se crea la orden? **SÍ.**
     * ¿El Courier recibe una oferta calculada con 7.0? **SÍ.**
     * **Veredicto:** 🔴 **VIOLACIÓN REAL DEL SSOT**. La falla de lectura degrada silenciosamente a la tarifa hardcodeada sin alertar a finanzas ni reintentar.

### 5.5 Pruebas de Documento Ausente, Null y Zero (Fases 8, 9 y 10)
* **Doc Ausente (Fase 8):** `globalCfgDoc.exists` es falso $\to$ se usa `7.0`.
* **Null (Fase 9):** `gData.courierRatePerKm == null` $\to$ L180 no se cumple $\to$ se usa `7.0`.
* **Zero (Fase 10):** `gData.courierRatePerKm = 0` $\to$ L180 asigna `Number(0)` = `0.0`. La orden nace con tarifa $C\$ 0.00/km$. No se activa fallback a 7.

---

## 6. ANÁLISIS FORENSE DE COURIER ANDROID (`FirebaseManager.kt`) (FASES 11 Y 12)

### 6.1 Código Fuente en `FirebaseManager.kt` (L417-428)
```kotlin
val courierRatePerKmApplied = safeParseDouble(doc.get("courierRatePerKmApplied"))?.takeIf { it > 0.0 } ?: 7.0
val courierOrderBonusApplied = safeParseDouble(doc.get("courierOrderBonusApplied")) ?: 0.0
val courierDistanceEarnings = safeParseDouble(doc.get("courierDistanceEarnings"))
    ?: (if (routeDistanceKm > 0.0) kotlin.math.round((routeDistanceKm * courierRatePerKmApplied) * 100.0) / 100.0 else 0.0)
```

### 6.2 Escenarios en el Courier:
| Escenario | Valor en Documento Firestore | Resultado en Courier App | ¿Muestra C$ 7.00? |
|---|---|---|---|
| **SC-COU-001** | `courierRatePerKmApplied = 8.0` | Usa 8.0 | NO (Usa 8.0) |
| **SC-COU-002** | `courierRatePerKmApplied = 10.0` | Usa 10.0 | NO (Usa 10.0) |
| **SC-COU-003** | Campo ausente | Fallback L417 se activa $\to$ `7.0` | **SÍ (Fallback 7.0)** |
| **SC-COU-004** | Campo `null` | Fallback L417 se activa $\to$ `7.0` | **SÍ (Fallback 7.0)** |
| **SC-COU-005** | Campo `= 0.0` | `takeIf { it > 0.0 }` falla $\to$ `7.0` | **SÍ (Fallback 7.0)** |
| **SC-COU-006** | Offline / Caché desactualizada | Si la orden se cacheó antes de la mutación del backend, lee el valor inicial inyectado por el cliente (`7.0`) | **SÍ (Caché 7.0)** |

### 6.3 Test de Divergencia Admin C$ 8 $\to$ Courier C$ 7 (Fase 13)
* Si una nueva orden es creada y por latencia de red el Courier App la lee antes de que el trigger `notifyNewOrder` estampe la actualización de backend, o si el trigger falla:
  * El documento carecerá de `courierDistanceEarnings`.
  * `FirebaseManager.kt` ejecutará L420: `routeDistanceKm * 7.0`.
  * **El motorizado verá una oferta con tarifa C$ 7.00/km mientras Admin tiene C$ 8.00/km.**
  * Clasificación: 🔴 **CRITICAL**.

---

## 7. ANÁLISIS DE LIQUIDACIÓN FINANCIERA (FASE 15)

### 7.1 Consumo en Finanzas y Libros Contables
En `orders.ts` (`onOrderDelivered` L1105-1355):
1. **Partida de Ingresos / Asiento Contable:**
   * Escribe en `/financial_events` el campo `courierRatePerKmApplied`.
   * Escribe en `/courier_cash_ledger` los centavos `distanceEarningsCents` y `earningsCents`.
   * Incrementa `/courier_balances/{courierUid}` con `totalEarningsCents` y `totalDistanceEarningsCents`.
2. **Fuente de Verdad Financiera:**
   * Finanzas utiliza **exclusivamente el snapshot de la orden (`after.courierRatePerKmApplied`)**.
   * Finanzas **NO vuelve a consultar `/system_config/global`** para recalcular pedidos históricos.
   * Si una orden histórica nació con C$ 8.00 y la tarifa global subió a C$ 10.00, Finanzas liquida con **C$ 8.00**.
   * **Conclusión Financiera:** El libro mayor es estrictamente consistente con el snapshot de la orden. El riesgo financiero radica en que si la orden nació con el fallback espurio de C$ 7.00, Finanzas liquidará permanentemente con C$ 7.00, consumando una pérdida patrimonial para el motorizado.

---

## 8. MATRIZ DEFINITIVA DE ESCENARIOS (FASE 22)

| # | Escenario | Admin Rate (`system_config`) | Estado Config | Backend Result (`orders.ts`) | Applied Rate en `/orders` | Courier Result (`FirebaseManager`) | Finance Result (`courier_balances`) | Veredicto |
|---|---|---|---|---|---|---|---|---|
| 1 | Operación Nominal A | C$ 7.00 | Válida | 7.0 | 7.0 | 7.0 | 7.0 | 🟢 PASS |
| 2 | Operación Nominal B (Orden API sin cliente) | C$ 8.00 | Válida | 8.0 | 8.0 | 8.0 | 8.0 | 🟢 PASS |
| 3 | Operación Nominal C (Orden API sin cliente) | C$ 10.00 | Válida | 10.0 | 10.0 | 10.0 | 10.0 | 🟢 PASS |
| 4 | **Orden desde Customer App** | **C$ 8.00** | **Válida** | **7.0 (Inyección L180)** | **7.0** | **7.0** | **7.0** | 🔴 **SSOT VIOLATION** |
| 5 | **Comercio con Comisión Override** | **C$ 8.00** | **Válida** | **7.0 (Scope Else L164)**| **7.0** | **7.0** | **7.0** | 🔴 **SSOT VIOLATION** |
| 6 | Config Null | null | Inválida | 7.0 (Fallback) | 7.0 | 7.0 | 7.0 | 🟡 FALLBACK |
| 7 | Config Zero | 0.0 | Anómala | 0.0 | 0.0 | 7.0 (takeIf > 0) | 0.0 | 🔴 DISCREPANCIA |
| 8 | Config ausente | Ausente | Inválida | 7.0 (Fallback) | 7.0 | 7.0 | 7.0 | 🟡 FALLBACK |
| 9 | Documento ausente | Inexistente | Inválida | 7.0 (Fallback) | 7.0 | 7.0 | 7.0 | 🟡 FALLBACK |
| 10| **Error de lectura (Falla de Red)** | **C$ 8.00** | **Inalcanzable** | **7.0 (Catch Silencioso)**| **7.0** | **7.0** | **7.0** | 🔴 **SSOT VIOLATION** |
| 11| Tipo inválido (string "abc") | "abc" | Corrupta | NaN | NaN | 7.0 | NaN | 🔴 CRASH |
| 12| Orden histórica nacida en C$ 8 | C$ 10.00 | Mutada post-orden | Respeta 8.0 | 8.0 | 8.0 | 8.0 | 🟢 PASS (Inmutable) |

---

## 9. EVALUACIÓN DE GATES CRÍTICOS (FASE 23)

| Gate ID | Descripción del Gate | Resultado | Observación Forense |
|---|---|---|---|
| **GATE-FB-001** | No existe hardcoded 7 alcanzable en backend cuando la config es válida | 🔴 **FAIL** | Fallback 7 es alcanzable por inyección del Customer App (L180) y por comisiones override (L164). |
| **GATE-FB-002** | No existe hardcoded 7 alcanzable en Courier para orden nueva cuando Admin = 8 | 🔴 **FAIL** | En ausencia de campo en Firestore, `FirebaseManager.kt` calcula automáticamente con 7.0. |
| **GATE-FB-003** | C$ 8 produce Applied Rate = 8 | 🔴 **FAIL** | En órdenes creadas desde la app cliente, produce 7.0 debido a L180 en `orders.ts`. |
| **GATE-FB-004** | C$ 10 produce Applied Rate = 10 | 🔴 **FAIL** | Idem a GATE-FB-003. |
| **GATE-FB-005** | Histórico 8 permanece 8 aunque global cambie a 10 | 🟢 **PASS** | Cumplido. L1105 en `onOrderDelivered` respeta el snapshot previo inmutable. |
| **GATE-FB-006** | Finance utiliza snapshot histórico | 🟢 **PASS** | Cumplido. Asientos contables liquidan sobre `courierRatePerKmApplied` del documento. |
| **GATE-FB-007** | Courier no sustituye tarifa configurada por 7 | 🟢 **PASS** | Si el snapshot viene en el documento con 8 o 10, el Courier lo respeta estrictamente. |
| **GATE-FB-008** | Customer no impone tarifa definitiva | 🔴 **FAIL** | Violado: `CustomerHomeViewModel.kt` inyecta 7.0 y `orders.ts` (L180) no lo sobreescribe. |
| **GATE-FB-009** | No existe segunda configuración contradictoria | 🟢 **PASS** | No existen tablas paralelas; solo `/system_config/global`. |
| **GATE-FB-010** | Offline no genera nueva orden con tarifa obsoleta | 🔴 **FAIL** | Si el cliente crea orden offline o con caché, inyecta su hardcoded 7.0. |
| **GATE-FB-011** | Read failure tiene comportamiento explícito | 🔴 **FAIL** | Captura con warning y degrada a 7.0 sin levantar alarma financiera ni reintentar. |
| **GATE-FB-012** | Null tiene comportamiento explícito | 🟡 **WARN** | Degrada a 7.0 sin registrar evento de configuración corrupta. |
| **GATE-FB-013** | Zero tiene comportamiento explícito | 🔴 **FAIL** | Asigna 0.0 en backend pero Courier lo eleva a 7.0 por `takeIf { it > 0.0 }`. |
| **GATE-FB-014** | No se modificó código | 🟢 **PASS** | Cero líneas modificadas. Auditoría estrictamente pasiva. |
| **GATE-FB-015** | No se modificó Firestore | 🟢 **PASS** | Cero escrituras en la base de datos de producción/desarrollo. |
| **GATE-FB-016** | No se modificó configuración | 🟢 **PASS** | Cero alteraciones a `/system_config/global`. |
| **GATE-FB-017** | No hubo deployment | 🟢 **PASS** | Cero despliegues a Firebase Functions, Hosting o reglas. |

---

## 10. CONCLUSIONES Y RECOMENDACIONES DE AUDITORÍA (SIN MUTACIÓN)

### 10.1 Conclusión Fundamental
El valor `7.0` no actúa únicamente como un "fallback de resiliencia ante catástrofe de red"; **actualmente actúa como una segunda fuente de verdad activa y dominante** que sabotea la autoridad de `/system_config/global` debido a dos defectos estructurales en el código:
1. La condición de guarda `order.courierRatePerKmApplied == null` en `orders.ts:L180` otorga precedencia indebida al payload del cliente sobre el backend.
2. El anidamiento erróneo del bloque `system_config` dentro del `else` de `bizData.commissionOverrideRate` en `orders.ts:L164` hace que cualquier restaurante con comisión personalizada anule la actualización de tarifas globales para los motorizados que entregan sus pedidos.

### 10.2 Acciones Correctivas Recomendadas para una Futura Fase de Ingeniería (No aplicadas en este protocolo):
* En `orders.ts`:
  1. Desacoplar la lectura de `system_config/global` de la comisión del comercio, leyéndolo siempre de forma incondicional.
  2. Eliminar la condición `&& order.courierRatePerKmApplied == null`, garantizando que la configuración de Admin **siempre sobreescriba autoritativamente** cualquier valor enviado por el cliente.
  3. En caso de fallo de lectura de `system_config/global`, registrar un evento crítico en `/audit_events` y evaluar si la orden debe encolarse o reintentar antes de despachar con tarifa degradada.
* En `CustomerHomeViewModel.kt`:
  1. Eliminar la inyección de `courierRatePerKmApplied` en el payload de creación, o marcarla explícitamente como `estimatedRate` meramente visual.
* En `FirebaseManager.kt`:
  1. Eliminar el fallback `?: 7.0` cuando el documento carezca del campo, requiriendo que la orden sea hidratada por el backend antes de presentarse en la tarjeta de oferta.

---

## 11. EVIDENCIA DE CERO MUTACIÓN (ZERO MUTATION PROOF)

En estricto cumplimiento del protocolo **COURIER-RATE-FALLBACK-FORENSIC-003**, se certifica bajo fe de auditor que el estado del sistema no ha sufrido ninguna modificación:

```yaml
CODE MUTATIONS: 0
DATABASE MUTATIONS: 0
CONFIGURATION MUTATIONS: 0
FIRESTORE WRITES: 0
DEPLOYMENTS: 0
PRODUCTION CHANGES: 0
FILES MODIFIED: 0
TEST FILES MODIFIED: 0
```

**Auditor Responsable:**
Senior Developer & Auditor de BlueSystem Enterprise
Fecha: 08 de Septiembre de 2026
