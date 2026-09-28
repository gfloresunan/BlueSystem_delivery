# BSD-X2Y-FINANCIAL-END-TO-END-ROOT-CAUSE-AUDIT-001
## AUDITORÍA FORENSE DE CAUSA RAÍZ INTEGRAL: CICLO FINANCIERO Y OPERACIONAL DELIVERY EXPRESS X→Y
### BlueSystem Delivery Enterprise v6.2.0 — Dominio X→Y (/deliveryTrips/{tripId})
**Fecha:** 2026-09-24  
**Clasificación:** FASE 1 — READ-ONLY FORENSIC AUDIT (CERO MODIFICACIONES DE CÓDIGO)  
**Autoridad:** Senior Developer & Auditor de BlueSystem  
**Contrato Base:** `ADR-026 (BSD-X2Y-FINANCIAL-FROZEN-CORE-001)` & `BSD_X2Y_FINANCIAL_CANONICAL_CONTRACT.md`

---

## 1. RESUMEN EJECUTIVO Y VEREDICTO FORENSE

Tras una inspección exhaustiva de extremo a extremo que abarcó:
- Cloud Functions (`trips.ts`, `orders.ts`, `routingService.ts`, `courierClosureCallables.ts`)
- Reglas de Seguridad (`firestore.rules`)
- Aplicación Android Courier y Cliente (`MainActivity.kt`, `RutaActivaScreen.kt`, `FirebaseManager.kt`, `CourierFinanceCalculator.kt`, `CourierOrderDetailScreen.kt`, `OrderDetailScreen.kt`)
- Admin Web (`deliveryExpress.js`)
- Colecciones reales de Firestore (`/deliveryTrips`, `/orders`, `/courier_cash_ledger`, `/courier_balances`, `/ubicaciones_repartidores`)

Se declara: **CAUSA RAÍZ TÉCNICA Y MATEMÁTICA CONFIRMADA CON EVIDENCIA OBJETIVA IRREFUTABLE**.

El incidente reportado por el operador (donde en un viaje de C$ 85.00 el motorizado ve Custodia = C$ 0.00, Ganancias = C$ 85.00 en Rendimiento, pero C$ 0.00 en Detalle de Servicio) **no es un fallo de presentación cosmético**. Es el resultado de un **desacoplamiento estructural y de seguridad entre capas**:
1. Un bloqueo de permisos en `firestore.rules` impidió que `deliveryTrips` se actualizara a `completed`, dejando los viajes X→Y atascados en `in_transit`.
2. Como consecuencia, el trigger backend canónico `onTripCompleted` (`trips.ts`) **nunca se disparó**.
3. En su lugar, debido a la duplicación histórica del documento en `/orders/{tripId}`, el trigger de Commerce (`orders.ts`) procesó la finalización del viaje tratándolo erróneamente como una orden comercial, asignando el 100% del flete al motorizado y liquidando la custodia de plataforma en cero.
4. En la app del repartidor, `CourierFinanceCalculator.kt` tomó el `CUSTOMER_TOTAL` como ganancia del motorizado, compensó el 100% del efectivo contra dicha ganancia y concluyó que el motorizado debía depositar C$ 0.00 a la empresa.

---

## 2. EVIDENCIA DE DATOS REALES EN FIRESTORE

Ejecución de script forense de inspección read-only sobre base de datos activa:

```text
=== INSPECTING LATEST /orders ===
[ORDER] ID: env_6eb88653, serviceType: X_TO_Y_DELIVERY, status: completed, customerId: 3Wt0XdzeOTfG1OXn72ApIhVbE5i1, deliveryFee: 89
[ORDER] ID: env_6a23b10c, serviceType: X_TO_Y_DELIVERY, status: completed, customerId: 3Wt0XdzeOTfG1OXn72ApIhVbE5i1, deliveryFee: 85

=== INSPECTING LATEST /deliveryTrips ===
[TRIP] ID: env_6eb88653, serviceType: X_TO_Y_DELIVERY, status: in_transit, customerId: 3Wt0XdzeOTfG1OXn72ApIhVbE5i1, deliveryFee: 89
[TRIP] ID: env_6a23b10c, serviceType: X_TO_Y_DELIVERY, status: in_transit, customerId: 3Wt0XdzeOTfG1OXn72ApIhVbE5i1, deliveryFee: 85
```

### Hallazgo Clave:
En `/deliveryTrips` el viaje `env_6a23b10c` (el viaje exacto de las capturas de C$ 85.00) permanece en `in_transit`, mientras que en `/orders` figura como `completed`. Existe una divergencia total entre ambas colecciones.

---

## 3. MATRIZ DE CAUSAS RAÍZ IDENTIFICADAS (CLASIFICACIÓN P1 - P10)

| ID | Clasificación | Archivo Afectado | Líneas | Causa Raíz Técnica |
|---|---|---|---|---|
| **CR-01** | **P7 — Firestore Rules** | `firestore.rules` | 825–826 | La regla de actualización de `/deliveryTrips/{tripId}` exige `affectedKeys().hasOnly([...])`, pero omite `changeGiven`, `cashCollectedNet`, `discrepancyAmount`, `financialReconciliationStatus`. Cuando Android intenta completar la encomienda, Firestore arroja `PERMISSION_DENIED`. |
| **CR-02** | **P1 — Backend Trigger Bypass** | `functions/src/triggers/trips.ts` | 17–38 | `onTripCompleted` escucha exclusivamente `/deliveryTrips/{tripId}`. Al fallar el update por CR-01, este trigger **nunca se ejecutó**. Cero eventos en `/financial_events` bajo claves `X2Y_*`. |
| **CR-03** | **P10 — Cross-Contamination** | `app/src/main/java/com/example/MainActivity.kt` | 835 | `MainActivity` escribe duplicadamente en `/orders/{id}` al crear la encomienda X→Y, sin incluir `pricingSnapshot`. |
| **CR-04** | **P10 — Cross-Contamination** | `functions/src/triggers/orders.ts` | 1654–1715 | Al actualizarse `/orders/{id}` a `completed`, el trigger de Commerce procesa la encomienda como si fuera pedido de restaurante: asume `courierTotalEarnings = deliveryFee` (C$ 85.00), creando un asiento inválido en `courier_cash_ledger` (`sourceDomain: "COMMERCE_DELIVERY"`). |
| **CR-05** | **P5 — ViewModel / Calculator** | `app/.../CourierFinanceCalculator.kt` | 120–135, 225, 322 | Si `order.courierTotalEarnings` es 0 o no está, usa `customerOffer` o `deliveryFee` como ganancia del motorizado (`earning = 85.00`). Luego calcula `compensatedAmount = minOf(85.00, 85.00) = 85.00` y `requiredDeposit = 85.00 - 85.00 = 0.00`. |
| **CR-06** | **P6 — UI Courier Detalle** | `app/.../CourierOrderDetailScreen.kt` | 212–219 | Si el viaje no está completado en `deliveryTrips` (CR-01), o no contiene `courierTotalEarnings`, muestra `C$ 0.00` como ganancia en el servicio. |
| **CR-07** | **P6 — UI Customer Detalle** | `app/.../customer/profile/OrderDetailScreen.kt` | 77–84, 1167–1240 | Usa el modelo `Pedido` de Commerce y la tarjeta `PaymentSummaryCard`, mostrando desglose de productos/subtotal inexistentes para encomiendas X→Y. |
| **CR-08** | **P9 — Admin Web** | `panel-admin/.../deliveryExpress.js` | 1740–1755 | El Admin Web recalcula empíricamente tarifas con `distKm * ratePerKm` en vez de consumir los valores autoritativos del `pricingSnapshot` y carece de visibilidad del subledger de custodia, depósitos y conciliación. |
| **CR-09** | **P5 — Ordenamiento Historial** | `app/.../FirebaseManager.kt` | 873 | `obtenerHistorialCourier` une listas con `(assignedList + legacyList + tripsList)` sin ordenar descendentemente por timestamp canónico. |
| **CR-10** | **P5 — Listener Ruta Activa** | `app/.../RutaActivaScreen.kt` | 386, 1401–1406 | `RutaActivaScreen` suscribe su listener a `orders` en vez de `deliveryTrips`, asumiendo `serviceType = "COMMERCE_DELIVERY"`. |

---

## 4. DETALLE TÉCNICO DE CADA COMPONENTE AUDITADO

### 4.1. `firestore.rules` (Líneas 825–826)
```javascript
// firestore.rules:825
request.resource.data.diff(resource.data).affectedKeys()
  .hasOnly(["status", "estado", "historialEstados", "ubicacionRepartidor", "deliveredAt", 
            "entregadoAt", "acceptedAt", "assignedAt", "pickedUpAt", "completedAt", 
            "completadoAt", "updatedAt", "courierPhase", "assignedCourierId", "courierId", 
            "motorizadoId", "courierName", "driverName", "motorizadoNombre", "driverPhone", 
            "motorizadoTelefono", "cashReceived", "cashDiscrepancy", "rejectionReason", 
            "rejectedAt", "rejectionHistory", "rejectedByCouriers", "dispatch"])
```
En `RutaActivaScreen.kt:1385-1399`, el cliente envía:
```kotlin
val finalUpdates = hashMapOf<String, Any>(
    "status" to "completed",
    "estado" to "completado",
    "courierPhase" to 3,
    "deliveredAt" to com.google.firebase.Timestamp.now(),
    "completedAt" to com.google.firebase.Timestamp.now(),
    "updatedAt" to com.google.firebase.Timestamp.now(),
    "historialEstados" to FieldValue.arrayUnion(deliveryEvent, completedEvent),
    "cashReceived" to receivedAmount,
    "changeGiven" to changeAmount,                          // 🚨 NO PERMITIDO
    "cashCollectedNet" to finalCashCollected,                // 🚨 NO PERMITIDO
    "cashDiscrepancy" to (cashDiscrepancy != 0.0),
    "discrepancyAmount" to cashDiscrepancy,                  // 🚨 NO PERMITIDO
    "financialReconciliationStatus" to "RECONCILED_OK"       // 🚨 NO PERMITIDO
)
```
Al contener esas 4 propiedades no contempladas en `hasOnly`, la regla deniega el update. El documento `/deliveryTrips` nunca cambia de estado.

### 4.2. `CourierFinanceCalculator.kt` (Líneas 120–135)
```kotlin
val earning = if (isCompleted) {
    if (order.courierTotalEarnings > 0.0) {
        order.courierTotalEarnings
    } else if (isXToY) {
        val rawOffer = order.customerOffer
        if (rawOffer != null && rawOffer > 0.0) {
            rawOffer // 🚨 ERROR: rawOffer es el TOTAL DEL CLIENTE, no la ganancia del courier
        } else if (order.gananciaRepartidor > 0.0) {
            order.gananciaRepartidor // 🚨 ERROR: en FirebaseManager:390 es deliveryFee = TOTAL CLIENTE
        } else {
            order.calculatedFee
        }
    } else {
        order.gananciaRepartidor + order.tip
    }
} else 0.0
```
Cuando un viaje X→Y no tiene `courierTotalEarnings` explícito en centavos, este bloque le asigna el total cobrado al cliente (ej. C$ 85.00) como ganancia del repartidor. Esto distorsiona por completo:
- Ganancias del motorizado (infladas al total del cliente).
- Compensación de efectivo (compensa el total).
- Custodia exigible a depositar (reducida a C$ 0.00).

### 4.3. Desglose Numérico del Caso de Prueba C$ 85.00
Si un cliente solicitó un servicio con costo total de C$ 85.00:
- Bajo el contrato canónico ADR-026:
  - $\text{CUSTOMER\_TOTAL} = \text{C\$ 85.00}$
  - Si la distancia fue 5.0 km (con base C$ 35 y precio C$ 10/km):
    - $\text{COURIER\_EARNINGS} = 5.0 \times 10 = \text{C\$ 50.00}$
    - $\text{PLATFORM\_REVENUE} = \text{C\$ 35.00}$
    - $\text{CASH\_COLLECTED} = \text{C\$ 85.00}$
    - $\text{CUSTODY\_LIABILITY} = 85.00 - 50.00 = \text{C\$ 35.00}$
    - El courier conserva para sí C$ 50.00 y debe depositar C$ 35.00 a la empresa.
- Lo que sucedió en la realidad auditada:
  - El sistema interpretó $\text{COURIER\_EARNINGS} = \text{C\$ 85.00}$.
  - Compensó los C$ 85.00 contra el efectivo recibido.
  - La custodia quedó en C$ 0.00.
  - La plataforma BlueSystem perdió sus C$ 35.00 de ingreso tecnológico.

---

## 5. MATRIZ DE FUENTES DE VERDAD CANÓNICAS

| Concepto Financiero | Fuente Canónica Inmutable | Prohibido Utilizar |
|---|---|---|
| **Distancia de Ruta** | `pricingSnapshot.routeDistanceKm` | Haversine en UI, texto formateado |
| **Tarifa por KM** | `pricingSnapshot.pricePerKm` | Hardcoded 15.0 o 10.0 |
| **Tarifa Base** | `pricingSnapshot.baseFee` | Hardcoded 35.0 |
| **Total Cliente** | `pricingSnapshot.calculatedAmount` | `totalPrice`, suma de items |
| **Ganancia Courier** | `pricingSnapshot.courierEarnings` | `deliveryFee`, `customerOffer`, `total` |
| **Ingreso Plataforma** | `pricingSnapshot.platformRevenue` | Cálculo libre en cliente |
| **Recaudación Efectivo** | `financial_events (CASH_COLLECTION)` / `courier_cash_ledger` | `cashReceived` no validado |
| **Pasivo de Custodia** | `courier_cash_ledger.netCustodyCents` | Resta no atómica en memoria |
| **Saldo a Depositar** | `courier_balances.cashOutstandingCents` | Saldo derivado en UI |

---

## 6. CONCLUSIÓN DE LA AUDITORÍA FASE 1

Queda formalmente completada la **FASE 1 (READ-ONLY)**. No se modificó ningún archivo, no se desplegaron Cloud Functions ni se alteraron reglas de seguridad en esta fase.

La causa raíz ha sido completamente desmantelada y explicada a nivel de código, reglas y datos de producción. Se procede a generar la propuesta del plan quirúrgico de intervención en el archivo:
`BSD-X2Y-FINANCIAL-END-TO-END-IMPLEMENTATION-PLAN-001.md`.
