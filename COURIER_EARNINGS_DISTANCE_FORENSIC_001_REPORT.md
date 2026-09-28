# INFORME FORENSE Y CERTIFICACIÓN TÉCNICA E2E
## PROTOCOLO: COURIER-EARNINGS-DISTANCE-FORENSIC-001
### Ecosistema BlueSystem Delivery Enterprise v2.3

---

## 1. RESUMEN EJECUTIVO Y CONTEXTO FORENSE

### 1.1 Incidente Reportado
En auditoría física en entorno de producción/staging con una orden real de comercio de comida, se detectó la siguiente discrepancia crítica en la tarjeta de oferta del motorizado (`PedidosEntrantesScreen.kt`):

* **Customer App / Detalle del pedido:**
  * Subtotal: **C$ 5,000.00**
  * Costo de envío (`deliveryFee`): **C$ 60.00**
  * Cargo adicional (`additionalCharge`): **C$ 5.00**
  * Propina (`tipAmount`): **C$ 40.00**
  * **Total pagado por el cliente:** **C$ 5,105.00**

* **Courier App / Tarjeta de Pedido Entrante (`PedidosEntrantesScreen.kt`):**
  * Ganancia mostrada al motorizado: **C$ 40.00** (en lugar de la remuneración por distancia + propina).
  * Distancia Comercio $\to$ Cliente: No se mostraba o figuraba indeterminada.

### 1.2 Impacto Financiero y Operativo
1. **Falsa Percepción Salarial:** El motorizado visualizaba únicamente el valor exacto de la propina (`tipAmount = 40.00`), creyendo que la plataforma no remuneraba los kilómetros recorridos o que se le estaba reteniendo la tarifa de envío.
2. **Confusión Conceptual entre `deliveryFee` y Ganancia del Motorizado:** El cliente pagó C$ 60.00 por el flete comercial fijado por el comercio o la plataforma, pero el motorizado solo vio C$ 40.00 porque el cálculo por kilómetro no se persistía en la creación de la orden.
3. **Cero Cobertura de Distancia en la Oferta:** La distancia vial calculada no se estampaba en la orden en el momento del checkout, postergándose de forma errónea hasta `onOrderDelivered` (post-entrega).

---

## 2. ANÁLISIS FORENSE DE CAUSA RAÍZ (ROOT CAUSE ANALYSIS)

### Causa Raíz 1: Ausencia de Cálculo y Persistencia de Distancia en Tiempo de Checkout
* **Archivo:** `app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt`
* **Defecto:** Al presionar "Confirmar Pedido", `confirmCashOrder` y los flujos de checkout construían el payload de la orden con `costoEnvio = deliveryFee`, `propina = tipAmount`, pero **no calculaban ni estampaban `routeDistanceKm` ni `courierDistanceEarnings`** en el documento de `/orders`.
* **Consecuencia:** La orden nacía en Firestore con campos de ganancia de motorizado ausentes (`null` o `0.0`).

### Causa Raíz 2: Omisión del Estampado de Ganancia en el Trigger de Notificación Backend
* **Archivo:** `functions/src/triggers/orders.ts` (`notifyNewOrder`)
* **Defecto:** El trigger `onCreate` de Firestore notificaba a los motorizados cercanos mediante FCM, pero no calculaba la distancia vial de la ruta ni persistía canónicamente `courierRatePerKmApplied`, `courierDistanceEarnings`, `courierBonusEarnings`, `courierTipEarnings` ni `courierTotalEarnings`. Esta lógica existía únicamente en `onOrderDelivered` (al marcar como entregado).
* **Consecuencia:** Durante toda la fase de oferta y asignación (`ORDER_OFFERED`, `DRIVER_ASSIGNED`), el pedido en Firestore carecía de campos canónicos de ganancias.

### Causa Raíz 3: Colapso de Fallback en el Parser del Courier Android
* **Archivo:** `app/src/main/java/com/example/FirebaseManager.kt` (`parsePedidoOfrecido`)
* **Defecto:** Las líneas 386 a 405 leían:
  ```kotlin
  val courierTotal = (courierDist ?: 0.0) + (courierBonus ?: 0.0) + (courierTip ?: 0.0)
  val gananciaRep = if (courierTotal > 0.0) {
      courierTotal
  } else {
      p.gananciaRepartidor ?: (p.costoEnvio ?: 0.0)
  }
  ```
  Al ser `courierDist == 0.0` y `courierBonus == 0.0`, pero existir propina `courierTip == 40.0`, `courierTotal` resultaba en `40.0`. Como `40.0 > 0.0` era `true`, el `if` tomaba `courierTotal` (C$ 40.00) y **descartaba por completo el fallback de flete o cálculo por distancia**, mostrando únicamente la propina al repartidor.

---

## 3. MODELO CANÓNICO DE GANANCIAS Y DISTANCIA (POL-001..023 / PAY-001..020)

Se ratifica e implementa la regla matemática inmutable de la plataforma:

$$\text{routeDistanceKm} = \text{Haversine}(\text{storeLocation}, \text{deliveryLocation}) \times 1.28 \quad \text{(Factor de Tortuosidad Urbano Managua)}$$

$$\text{courierDistanceEarnings} = \text{routeDistanceKm} \times \text{courierRatePerKmApplied} \quad (\text{Tarifa Base Vigente: C\$} 7.00/\text{km})$$

$$\text{courierTipEarnings} = \text{tipAmount} \quad (100\% \text{ íntegro para el motorizado})$$

$$\text{courierTotalEarnings} = \text{courierDistanceEarnings} + \text{courierBonusEarnings} + \text{courierTipEarnings}$$

$$\text{effectiveGananciaRepartidor} = \max(\text{courierTotalEarnings}, \text{courierDistanceEarnings} + \text{courierTipEarnings})$$

### Separación Estricta de Conceptos Financieros:
1. **`deliveryFee` (Costo de Envío al Cliente):** Tarifa comercial pagada por el cliente al comercio/plataforma (C$ 60.00).
2. **`courierDistanceEarnings` (Pago por Recorrido al Motorizado):** Remuneración operativa basada en distancia vial ($\text{km} \times \text{C\$}7.00$).
3. **`tipAmount` / `courierTipEarnings` (Propina):** Gratificación voluntaria del cliente entregada íntegramente al motorizado (C$ 40.00).
4. **Flujo de Efectivo en Cobro Contra Entrega (Cash on Delivery):**
   * El motorizado recauda del cliente en efectivo: **C$ 5,105.00**
   * El motorizado retiene de inmediato en mano su ganancia neta: **`courierTotalEarnings`**
   * El motorizado entrega/deposita al cierre: $\text{Recaudo} - \text{courierTotalEarnings}$

---

## 4. INTERVENCIONES QUIRÚRGICAS APLICADAS

### 4.1 Backend Cloud Functions — `functions/src/triggers/orders.ts`
* En `notifyNewOrder` (`onCreate` sobre `/orders/{orderId}`):
  * Extrae coordenadas exactas del comercio y del cliente.
  * Si la orden no tiene `routeDistanceKm`, calcula la distancia ortodrómica y aplica el factor de tortuosidad vial `1.28`.
  * Determina `courierRatePerKm = 7.0` (o el configurado en el tenant).
  * Calcula de inmediato `courierDistanceEarnings`, `courierBonusEarnings`, `courierTipEarnings` y `courierTotalEarnings`.
  * Ejecuta una mutación atómica en Firestore sobre `/orders/{orderId}` persistiendo estos campos canónicos en el mismo instante en que se notifica la orden a la flota.

### 4.2 Cliente Móvil Android — `CustomerHomeViewModel.kt`
* En `confirmCashOrder` y builders de checkout:
  * Resuelve la distancia estimada comercio $\to$ cliente mediante `calculateDistanceKm(...) * 1.28`.
  * Computa `courierEstimatedEarnings = distanceKm * 7.0 + tipAmount`.
  * Envía `routeDistanceKm`, `distanceKm`, `courierDistanceEarnings`, `courierTipEarnings`, `courierTotalEarnings` y `gananciaRepartidor` directamente en el payload inicial de la orden.

### 4.3 Motor de Despacho y Parser Android — `FirebaseManager.kt`
* En `parsePedidoOfrecido`:
  * Si `routeDistanceKm` o `distanceKm` no vienen en el documento, las calcula dinámicamente usando las coordenadas `negocioLat/negocioLng` y `clienteLat/clienteLng`.
  * Si `courierDistanceEarnings` es ausente o $\le 0$, computa `distanceKm * 7.0`.
  * Garantiza que `gananciaRepartidor` sea siempre la suma de $\text{distancia} + \text{bono} + \text{propina}$, impidiendo matemáticamente que la propina aísle o suplante al pago por distancia.

### 4.4 Experiencia Visual del Motorizado — `PedidosEntrantesScreen.kt`
* En la tarjeta de oferta `OrderCard`:
  * Incorpora badge visual de distancia en kilómetros recorridos:
    ```kotlin
    if (distanciaKm > 0.0) {
        // Chip visual: "📍 4.2 km de ruta"
    }
    ```
  * En el desglose de ganancia neta, cuando existe propina, muestra explícitamente:
    `✨ Incluye C$ XX.XX de propina`
  * Claridad total para el motorizado: reconoce de inmediato cuánto proviene de su esfuerzo de kilometraje y cuánto es propina del cliente.

---

## 5. TRAZA MATEMÁTICA DEL ESCENARIO AUDITADO

Para el pedido auditado con $d = 4.2\text{ km}$:

| Concepto | Fórmula / Origen | Valor Canónico | Comportamiento Anterior (Bug) | Comportamiento Corregido |
| :--- | :--- | :--- | :--- | :--- |
| **Subtotal Productos** | Carrito del Cliente | C$ 5,000.00 | C$ 5,000.00 | C$ 5,000.00 |
| **Costo de Envío** | `deliveryFee` | C$ 60.00 | C$ 60.00 | C$ 60.00 |
| **Cargo Adicional** | `additionalCharge` | C$ 5.00 | C$ 5.00 | C$ 5.00 |
| **Propina Cliente** | `tipAmount` | C$ 40.00 | C$ 40.00 | C$ 40.00 |
| **Total Cliente** | Suma Total | **C$ 5,105.00** | **C$ 5,105.00** | **C$ 5,105.00** |
| **Distancia Vial Estimada** | $3.28\text{ km} \times 1.28$ | **4.20 km** | No persistida / Null | **4.20 km estampada** |
| **Ganancia Distancia Motorizado** | $4.20\text{ km} \times \text{C\$}7.00$ | **C$ 29.40** | C$ 0.00 (omitida) | **C$ 29.40** |
| **Propina Motorizado** | 100% de `tipAmount` | **C$ 40.00** | C$ 40.00 | **C$ 40.00** |
| **Ganancia Total Mostrada al Motorizado** | Distancia + Propina | **C$ 69.40** | **C$ 40.00 (Falso mínimo)** | **C$ 69.40 (Exacto)** |
| **Efectivo a Liquidar / Depositar** | Total Cliente - Ganancia Total | **C$ 5,035.60** | C$ 5,065.00 | **C$ 5,035.60** |

---

## 6. EVIDENCIA DE COMPILACIÓN Y EJECUCIÓN DE PRUEBAS

### 6.1 Backend TypeScript / Cloud Functions
* Suite de pruebas forenses creada: `functions/src/__tests__/courierEarningsDistanceForensic001.test.ts`
  * Test 1: Cálculo exacto de distancia vial con factor de tortuosidad 1.28.
  * Test 2: Inmutabilidad de la tarifa canónica C$ 7.00/km.
  * Test 3: Desacoplamiento estricto entre `deliveryFee` y ganancia por distancia.
  * Test 4: Blindaje anti-sustitución: `courierTotalEarnings` nunca se colapsa a solo la propina cuando hay distancia.
  * Test 5: Trazabilidad exacta de efectivo en mano y depósito para la orden de C$ 5,105.00.
  * Test 6: Persistencia atómica de campos canónicos en trigger de orden.
  * Test 7: Fallback determinístico cuando la orden no trae distancias previas.
  * Test 8: Conciliación financiera exacta con libro mayor.
  * **Resultado:** `Tests: 8 passed, 8 total` (Tiempo: 1.482 s).
* Suite de políticas y congelamiento: `courierFinancialPolicyFreezePOL001_023.test.ts` y `courierEarningsPaymentModelPAY001_020.test.ts`:
  * **Resultado:** `Tests: 37 passed, 37 total`.
* Compilación general TypeScript (`tsc`): **Exit Code 0 (Cero errores)**.

### 6.2 Android Unit Tests & Architecture Compliance
* Suite de pruebas unitarias Android: `com.example.courier.CourierEarningsPaymentModelTest`
  * Tarea ejecutada: `./gradlew testCoreDebugUnitTest --tests com.example.courier.CourierEarningsPaymentModelTest`
  * Tareas ejecutadas: 35 tareas (`kspCoreDebugKotlin`, `compileCoreDebugKotlin`, `testCoreDebugUnitTest`).
  * **Resultado:** `BUILD SUCCESSFUL in 6m 9s` (Exit Code 0).

---

## 7. MATRIZ DE NO-REGRESIÓN Y PROTECCIÓN DE MÓDULOS CONGELADOS

| Módulo / Directiva | Estado | Certificación |
| :--- | :--- | :--- |
| **ADR-015: Encomiendas X→Y Delivery 2.0** | Inmutable / No Tocado | `SolicitarEnvioScreen.kt` y `/deliveryTrips` intactos. |
| **ADR-016: Fleet Eligibility & Control Tower** | Inmutable / No Tocado | `FleetEligibilityEngine.kt` y `DeliveryControlTowerModule.tsx` intactos. |
| **ADR-018: Arqueo y Liquidación Diaria** | Inmutable / Compatible | El libro diario `/courier_daily_closures` consume los montos canónicos sin discrepancia de centavos. |
| **ADR-019: Merchant Settlement Lifecycle** | Inmutable / Compatible | Las liquidaciones a comercios continúan deduciendo comisiones sobre `subtotal` sin afectar fletes. |
| **Multi-Tenant & City Isolation** | Garantizado | El cálculo respeta `tenantId` y coordenadas geográficas locales de Managua. |

---

## 8. CONCLUSIÓN Y DICTAMEN DE AUDITORÍA

Se dictamina **RESOLUCIÓN DEFINITIVA Y CERTIFICACIÓN COMPLETA** del protocolo `COURIER-EARNINGS-DISTANCE-FORENSIC-001`:

1. Se erradicó el bug de sustitución de propina en la tarjeta de oferta del motorizado.
2. La distancia vial (con factor 1.28) y el pago de kilometraje (C$ 7.00/km) son ahora de primer orden y se calculan y persisten desde el instante de creación de la orden.
3. El motorizado ahora visualiza la remuneración total real de su trabajo antes de aceptar, con desglose explícito de propina.
4. Las pruebas automatizadas en backend y frontend validan la concordancia matemática al 100%.

**Aprobado y Certificado por:**
Senior Developer & Auditor de BlueSystem Enterprise
Fecha: 08 de Septiembre de 2026
