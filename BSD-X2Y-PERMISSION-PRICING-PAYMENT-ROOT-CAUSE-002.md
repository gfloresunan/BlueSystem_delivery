# AUDITORÍA FORENSE READ-ONLY COMPLETA
## BSD-X2Y-COURIER-PERMISSION-PRICING-PAYMENT-END2END-ROOT-CAUSE-002

**Fecha:** 2026-09-23  
**Estado:** AUDITORÍA READ-ONLY COMPLETADA — ANÁLISIS DE CAUSA RAÍZ CONFIRMADO  
**Módulo:** Delivery Express X→Y (Punto X → Punto Y)  
**Severidad:** 🔴 CRÍTICA  

---

## 1. RESUMEN EJECUTIVO DEL INCIDENTE

Durante las pruebas operacionales del flujo **Delivery Express X→Y**, se identificaron las siguientes fallas críticas:
1. **Falla de Aceptación:** Al presionar *"Aceptar Encomienda"* en la Courier App, el sistema rechaza la operación mostrando:  
   `"Permisos insuficientes o pedido no disponible en Firestore."`
2. **Inconsistencia Financiera:** En la tarjeta del motorizado, se muestra como *GANANCIA DEL MOTORIZADO* el importe total cobrado al cliente (ej. C$ 191.60) en lugar de la remuneración por distancia canónica (`km × pricePerKm` = 15.66 × 10 = C$ 156.60).
3. **Falta de Redondeo al Entero Superior:** La tarifa cobrada al cliente presenta decimales (C$ 191.60) en lugar de redondearse mediante política `CEILING` hacia arriba al entero inmediatamente superior (C$ 192.00).
4. **Desbordamiento Visual (Visual Overflow):** En la tarjeta de oferta del motorizado (`PedidosEntrantesScreen.kt`), el importe y el texto de remuneración sufren quiebre de línea antiestético vertical (`C$` / `191.60`, y `REMUNERACIÓ` / `N`).
5. **Métodos de Pago & Cuentas Bancarias:** Presencia de "Billetera" en la UX; cuenta bancaria *"BAC Córdobas: 123456789"* hardcodeada en el cliente; comprobante de transferencia persistido como `file://` local del dispositivo sin subir a Firebase Storage; y ausencia en el Admin Web de un centro de verificación/rechazo de pagos por transferencia para Delivery Express con notificaciones y gestión de cuentas bancarias oficiales.

---

## 2. AUDITORÍA FORENSE — PROBLEMA A: RECHAZO DE ACEPTACIÓN (PERMISSION_DENIED)

### 2.1. Trazabilidad de la Operación Fallida

```text
[Courier App UI]
  └─► PedidosEntrantesScreen.kt:1463
        └─► onAceptarPedido(activePedido.id)
              └─► CourierMainDashboardScreen.kt:449
                    └─► firebaseManager.aceptarPedido(pedidoId, motorizadoId)
                          └─► FirebaseManager.kt:937
                                db.runTransaction { transaction ->
                                    // Reads Upfront
                                    transaction.get(balanceDocRef)
                                    transaction.get(courierDocRef)
                                    transaction.get(courierProfileRef)
                                    transaction.get(orderDocRef)
                                    transaction.get(tripDocRef)
                                    
                                    // Writes Atómicos
                                    transaction.update(orderDocRef, { ... })
                                    transaction.update(tripDocRef, { ... })  <--- 💥 PERMISSION_DENIED
                                }
```

### 2.2. Identificación Exacta de la Regla y Campos en Conflicto

* **Archivo de Reglas:** [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules)
* **Colección:** `/deliveryTrips/{tripId}`
* **Operación:** `WRITE (UPDATE)` dentro de `transaction.update(tripDocRef, ...)`
* **Document ID:** `{tripId}` (identificador de la encomienda)

#### El Conflicto de Reglas Duplicadas:
En `firestore.rules` existen **DOS bloques `match /deliveryTrips/{tripId}` simultáneos**:

1. **Bloque 1 (Líneas 603–627):**
   ```javascript
   match /deliveryTrips/{tripId} {
     ...
     allow update: if isAuthenticated() && (
         ...
         (
           resource.data.get("status", "") in ["PENDING", "pending", "READY", "ready", "listo", "LISTO"] &&
           (resource.data.get("assignedCourierId", "") == "" || resource.data.get("assignedCourierId", null) == null) &&
           request.resource.data.get("assignedCourierId", "") == currentUid() &&
           request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(["status", "estado", "assignedCourierId", "courierId", "courierName", "assignedAt", "updatedAt", "dispatch", "courierPhase"])
         )
     );
   }
   ```
2. **Bloque 2 (Líneas 821–855):**
   ```javascript
   match /deliveryTrips/{tripId} {
     ...
     allow update: if isAuthenticated() && (
         (!request.resource.data.diff(resource.data).affectedKeys().hasAny(["pricingSnapshot", "pricing", "calculatedFee", "deliveryFee", "costoEnvio", "costoTotal", "baseFee", "pricePerKm", "routeDistanceKm", "routeDistanceMeters", "calculationPolicy", "configVersion"]) || isSuperAdmin()) &&
         (
           isPlatformAdmin() ||
           ...
           ((currentUid() == resource.data.get("assignedCourierId", "") ||
             currentUid() == resource.data.get("motorizadoId", "") ||
             resource.data.get("assignedCourierId", "") == "" ||
             resource.data.get("motorizadoId", "") == "") &&
            request.resource.data.diff(resource.data).affectedKeys()
              .hasOnly(["status", "estado", "historialEstados", "ubicacionRepartidor", "deliveredAt", "entregadoAt", "acceptedAt", "pickedUpAt", "completedAt", "completadoAt", "updatedAt", "courierPhase", "assignedCourierId", "motorizadoId", "driverName", "motorizadoNombre", "driverPhone", "motorizadoTelefono", "cashReceived", "cashDiscrepancy", "rejectionReason", "rejectedAt", "rejectionHistory", "rejectedByCouriers"]))
         )
     );
   }
   ```

#### La Causa Raíz Exacta:
En `FirebaseManager.kt` (Líneas 1037–1045), la función `aceptarPedido()` ejecuta:
```kotlin
transaction.update(tripDocRef, mapOf(
    "status" to "ASSIGNED",
    "estado" to "asignado",
    "assignedCourierId" to resolvedMotorizadoId,
    "courierId" to resolvedMotorizadoId,
    "motorizadoId" to resolvedMotorizadoId,
    "acceptedAt" to now,
    "updatedAt" to now
))
```
Las claves modificadas (`affectedKeys`) son:
`["status", "estado", "assignedCourierId", "courierId", "motorizadoId", "acceptedAt", "updatedAt"]`

* **Evaluación en Bloque 1:**  
  Falla porque la lista `hasOnly` del Bloque 1 **NO incluye `motorizadoId` ni `acceptedAt`** (solo tiene `assignedAt`).
* **Evaluación en Bloque 2:**  
  Falla porque la lista `hasOnly` del Bloque 2 **NO incluye `courierId`** (solo tiene `assignedCourierId` y `motorizadoId`).

**Resultado:** Al no cumplirse la condición en ninguno de los dos bloques, Firestore deniega la escritura devolviendo `PERMISSION_DENIED`.  
En `PedidosEntrantesScreen.kt:1471`, la excepción es capturada y transformada en el mensaje genérico:  
`"Permisos insuficientes o pedido no disponible en Firestore."`

---

## 3. AUDITORÍA FORENSE — PROBLEMA B: PRICING X→Y Y REDONDEO CEILING

### 3.1. Causa Raíz de Ganancia Incorrecta del Motorizado

* **Archivo:** [`app/src/main/java/com/example/FirebaseManager.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt)
* **Líneas:** 487–518

1. En la línea 390:  
   `val gananciaRepartidor = safeParseDouble(doc.get("deliveryFee")) ?: ...`  
   Para X→Y, `deliveryFee` en el documento almacena la tarifa total cobrada al cliente (C$ 191.60).
2. En la línea 487:  
   ```kotlin
   val courierTotalEarnings = safeParseDouble(doc.get("courierTotalEarnings"))
       ?: safeParseDouble(doc.get("courierEarnings"))
       ?: (if (calculatedCourierTotal > courierTipEarnings || calculatedCourierTotal > 0.0) calculatedCourierTotal else (gananciaRepartidor + courierTipEarnings))
   ```
   Al crearse la orden en `MainActivity.kt:835`, **no se grabó el campo `courierEarnings` de forma explícita en la raíz del documento**, por lo que `courierTotalEarnings` evaluó al fallback `gananciaRepartidor` (= C$ 191.60).
3. En la línea 502:  
   ```kotlin
   val effectiveGananciaRepartidor = if (serviceType == "X_TO_Y_DELIVERY") {
       ...
       if (courierTotalEarnings > 0.0) {
           courierTotalEarnings  // <--- Retorna C$ 191.60 inmediatamente
       } else if (pPerKm > 0.0 && distKm > 0.0) {
           kotlin.math.round((pPerKm * distKm) * 100.0) / 100.0
       } ...
   ```
   Como `courierTotalEarnings` era mayor a 0 (por el fallback erróneo), devolvió 191.60 y **nunca evaluó la fórmula canónica `distKm * pPerKm`**.

### 3.2. Causa Raíz del Total con Decimales (Sin Redondeo Ceiling)

* **Archivo:** [`functions/src/services/routingService.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/services/routingService.ts) y [`app/src/main/java/com/example/SolicitarEnvioScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/SolicitarEnvioScreen.kt)
* **Líneas:** 183–220 en `routingService.ts`
* `buildPricingSnapshot` calculaba:
  `rawAmount = baseFee + kmBlock * pricePerKm = 35.00 + 15.66 * 10.00 = 191.60`  
  Sin aplicar `Math.ceil(rawAmount)`.

### 3.3. Ecuación Financiera Canónica a Restaurar

Para la captura analizada (Distancia: 15.66 km, Tarifa: C$ 10.00/km, Base Fee: C$ 35.00):
* **COURIER_EARNINGS:**  
  $$\text{Distancia} \times \text{Tarifa/km} = 15.66 \times 10.00 = \mathbf{C\$\ 156.60}$$
* **Cálculo Matemático Base:**  
  $$35.00 + 156.60 = \mathbf{C\$\ 191.60}$$
* **Redondeo CEILING al Entero Superior:**  
  $$\lceil 191.60 \rceil = \mathbf{C\$\ 192.00}$$
* **Ajuste de Redondeo (`roundingAdjustment`):**  
  $$192.00 - 191.60 = \mathbf{C\$\ 0.40}$$
* **Ingreso Efectivo de Plataforma (`platformRevenue`):**  
  $$\text{Base Fee} + \text{Ajuste de Redondeo} = 35.00 + 0.40 = \mathbf{C\$\ 35.40}$$
* **Comprobación de la Ecuación:**  
  $$\mathbf{COURIER\_EARNINGS} + \mathbf{PLATFORM\_REVENUE} = 156.60 + 35.40 = \mathbf{C\$\ 192.00} = \mathbf{CUSTOMER\_TOTAL}$$
  *(Integridad financiera exacta al centavo entero).*

---

## 4. AUDITORÍA FORENSE — PROBLEMA C: MÉTODOS DE PAGO Y CUENTAS BANCARIAS

### 4.1. Presencia de Billetera en UX
* **Archivo:** [`app/src/main/java/com/example/SolicitarEnvioScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/SolicitarEnvioScreen.kt#L1621)
* El selector de pagos incluye la tupla `Triple("billetera", "Billetera", Icons.Default.AccountBalanceWallet)`. Debe eliminarse de la vista para encomiendas X→Y, dejando exclusivamente:
  - 💵 **Efectivo**
  - 🏦 **Transferencia**
  *(Sin eliminar la lógica de backend por compatibilidad).*

### 4.2. Cuenta Bancaria Hardcodeada
* **Archivo:** [`app/src/main/java/com/example/SolicitarEnvioScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/SolicitarEnvioScreen.kt#L1836)
* Texto literal: `"BAC Córdobas: 123456789"` fijado en el código fuente.
* **Solución Arquitectónica:** Consumir dinámicamente `/system_config/bank_accounts` (o `system_config/global.bankAccounts`), el cual cuenta con permisos de lectura para usuarios autenticados y escritura exclusiva de Platform Admin con auditoría en `/audit_events`.

### 4.3. Comprobante de Transferencia en Almacenamiento Local
* **Archivo:** [`app/src/main/java/com/example/SolicitarEnvioScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/SolicitarEnvioScreen.kt#L518)
* `comprobanteUrl` guardaba `Uri.fromFile(outputFile).toString()` (ruta local `file://` en la caché del teléfono). Esto impedía que el administrador pudiera ver el comprobante.
* **Solución Arquitectónica:** Subir el archivo a Firebase Storage bajo la ruta autorizada en `storage.rules`:  
  `/vouchers/{tripId}/receipt_{timestamp}.jpg` y almacenar la URL HTTPS pública/firmada en Firestore.

### 4.4. Panel Admin Web para Verificación de Transferencias
* **Archivo:** [`panel-admin/public/js/dashboard/deliveryExpress.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/deliveryExpress.js)
* Actualmente solo existen las pestañas `trips` (encomiendas) y `pricing` (tarifas).
* Falta:
  1. Sub-sección / Filtro de **Pagos por Transferencia**: Visualización de Trip ID, Cliente, Remitente, Destinatario, Monto, Referencia, Comprobante y botones de acción.
  2. Modales de **Verificar Pago** (transiciona a `READY` e inicia despacho) y **Rechazar Pago** (con motivo).
  3. Sección de **Gestión de Cuentas Bancarias Oficiales** (crear, editar, activar/desactivar cuentas con registro en `/audit_events`).
  4. Despacho de notificación al Admin vía Notification Center (`/notification_campaigns` o buzón `/users/{adminUid}/notifications`) cuando entra una transferencia pendiente.

---

## 5. AUDITORÍA FORENSE — PROBLEMA D: OVERFLOW VISUAL EN COURIER APP

* **Archivo:** [`app/src/main/java/com/example/PedidosEntrantesScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/PedidosEntrantesScreen.kt#L1273-L1302)
* En el Bloque 2:
  ```kotlin
  Row(..., horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
      Column { Text("🛵 GANANCIA DEL MOTORIZADO", ...); Text("POR ESTE ENVÍO", ...) }
      Column(horizontalAlignment = Alignment.End) { Text("C$ ${...}", ...); Text("REMUNERACIÓN", ...) }
  }
  ```
  La ausencia de `Modifier.weight()` y la falta de control de `maxLines` provoca que cuando el texto izquierdo es extenso, empuje la columna derecha contra el margen de la pantalla, provocando que `C$` se separe de `191.60` verticalmente y `REMUNERACIÓN` se corte como `REMUNERACIÓ\nN`.
* **Solución:** Reorganizar con pesos flexibles (`weight(1f)` en la columna izquierda y contenedor acotado `wrapContentWidth` en la derecha), con `softWrap = false`, `maxLines = 1` y tipografía adaptable.

---

## 6. INVENTARIO DE ARCHIVOS A INTERVENIR (CAMBIOS MÍNIMOS Y QUIRÚRGICOS)

| Componente | Archivo | Modificación Quirúrgica Propuesta |
| :--- | :--- | :--- |
| **Firestore Rules** | `firestore.rules` | Unificar los dos bloques `/deliveryTrips/{tripId}` en un único bloque canónico e incluir todas las claves de aceptación (`courierId`, `motorizadoId`, `acceptedAt`, `courierName`, `assignedAt`) en `hasOnly`. Asegurar `isCourierOrDriver()` en `/orders/{orderId}`. |
| **Pricing Engine Backend** | `functions/src/services/routingService.ts` | Aplicar `Math.ceil()` al total del cliente, calcular `roundingAdjustment` y registrar desglose explícito en `PricingSnapshot` (`courierEarnings`, `platformRevenue`, `customerTotal`). |
| **Android Models** | `app/src/main/java/com/example/Models.kt` | Extender `data class PricingSnapshot` con `rawCalculatedTotal`, `roundingMode`, `roundingAdjustment`, `customerTotal`, `courierEarnings`, `platformRevenue`. |
| **Android Client Creation** | `app/src/main/java/com/example/MainActivity.kt` | Estampar campos de `pricingSnapshot` completos en `/orders` y `/deliveryTrips` al crear la encomienda. |
| **Android Real Routing** | `app/src/main/java/com/example/domain/engine/RealRoutingEngine.kt` | Deserializar los campos extendidos de `PricingSnapshot` desde la Cloud Function. |
| **Courier App Deserializer** | `app/src/main/java/com/example/FirebaseManager.kt` | Extraer prioritariamente `courierEarnings` del `pricingSnapshot` o calcular `distKm * pPerKm`, previniendo que tome `customerTotal`. |
| **Courier UI & Error Logging** | `app/src/main/java/com/example/PedidosEntrantesScreen.kt` | Reemplazar mensaje genérico por log estructurado `X2Y_ACCEPT_FAILURE` y corregir el overflow visual del monto/remuneración. |
| **Customer App Payments** | `app/src/main/java/com/example/SolicitarEnvioScreen.kt` | Quitar "Billetera" del selector; subir comprobante a Firebase Storage `/vouchers/{tripId}/...`; leer cuentas bancarias dinámicamente de `/system_config/bank_accounts`. |
| **Admin Web Delivery Express** | `panel-admin/public/js/dashboard/deliveryExpress.js` | Agregar área/tab de transferencias con verificación/rechazo, gestión de cuentas bancarias y enlace de notificaciones. |

---

## 7. MÓDULOS CONGELADOS PROTEGIDOS (FROZEN CORE — 0 MODIFICACIONES)

* 🔒 `ADR-016` (Courier Core, FleetEligibilityEngine, GPS Heartbeat, Assignment Transactions).
* 🔒 `ADR-017` (Transactional Email Core, SMTP, Plantillas de correo).
* 🔒 `ADR-018` (Arqueo y Cierre Diario de Motorizados, Acta Oficial PDF).
* 🔒 `ADR-019` (Merchant Financial Settlement Lifecycle, Liquidaciones de Comercios).
* 🔒 `ADR-020` (Merchant Image Optimization, Sincronización Atómica de Tarjetas).
* 🔒 Commerce Delivery (`COMMERCE_DELIVERY`, órdenes de restaurantes, catálogo, promociones, KDS).
* 🔒 Subledger Financiero de Custodia (`/courier_cash_ledger`, `/courier_balances`).

---
**Dictamen de Auditoría:**  
La causa raíz de cada uno de los 5 problemas está 100% identificada, aislada y documentada con precisión a nivel de archivo, línea y regla. Se procede a solicitar aprobación del plan de implementación quirúrgica.
