# 🔵 BLUESYSTEM DELIVERY ENTERPRISE
# AUDITORÍA FORENSE INTEGRAL DEL SISTEMA DE PAGOS
## Documento 1: Estado Actual, Mapeo de Código, Dependencias, Seguridad y Deuda Técnica

---

## 1. RESUMEN EJECUTIVO DE LA AUDITORÍA

La presente auditoría forense analiza exhaustivamente el subsistema de pagos de **BlueSystem Delivery Enterprise**, abarcando sus dos dominios de negocio diferenciados:
1. **Commerce Delivery** (Marketplace B2B2C): Pedidos de restaurantes y comercios (`/orders/{orderId}`).
2. **Servicio X → Y** (Encomiendas P2P): Envíos punto a punto entre usuarios (`/deliveryTrips/{id}` y réplica operacional en `/orders/{id}`).

### Hallazgo Primario
- **Efectivo (CASH):** Se encuentra **100% OPERATIVO, ROBUSTO Y CERTIFICADO E2E** en todos los touchpoints (App Cliente, App Repartidor, Control de Cambio, Liquidación de Caja y Auditoría en Firestore).
- **Pagos Electrónicos Actuales (Transferencia / Billetera P2P en X→Y):** Operan mediante flujo manual asistido (subida de comprobante fotográfico `comprobanteUrl`, número de referencia y verificación manual).
- **Tarjetas de Crédito/Débito (CARD en Commerce Delivery):** Actualmente existe una opción en la UI del checkout (`"tarjeta"`), pero **carece de pasarela, tokenización, autorización o verificación en backend**. Si un cliente selecciona "tarjeta", el pedido se persiste con `paymentMethod = "tarjeta"`, el comercio lo recibe y el repartidor visualiza `PAGADO CON TARJETA / ELECTRÓNICO`, creándose una **brecha de cobro crítico (falso pagado)** al no existir aún procesamiento bancario real.

---

## 2. MAPA ESTRUCTURAL DEL SISTEMA DE PAGOS ACTUAL

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BLUESYSTEM DELIVERY                                  │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│         DOMINIO A: COMMERCE DELIVERY      │           DOMINIO B: ENCOMIENDAS X → Y     │
│             (/orders/{orderId})           │     (/deliveryTrips/{id} & /orders/{id})   │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • Checkout: Efectivo vs Tarjeta           │ • Checkout: Efectivo vs Billetera vs Transf│
│ • Creación: status='pending'              │ • Creación: status='ready' (CASH) o        │
│ • PaymentMethod: 'efectivo' | 'tarjeta'   │             status='payment_verifying'     │
│ • No existe pasarela conectada            │ • Comprobante: receiptUrl + referenceNumber│
│ • Courier: Valida efectivo o asume tarjeta│ • Courier: Valida efectivo o cobro destino │
│ • Finance: Eventos en /financial_events   │ • Cloud Function: onPaymentStatusUpdated   │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 3. AUDITORÍA DETALLADA POR TOUCHPOINT Y CÓDIGO FUENTE

### 3.1. Frontend Customer — App Android (Kotlin & Jetpack Compose)

#### A. Checkout & Selección de Método de Pago (Commerce Delivery)
- **Archivos:**
  - [`CheckoutStepContent.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/cart/CheckoutStepContent.kt#L170-L198)
  - [`CartCheckoutDialog.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/cart/CartCheckoutDialog.kt#L51-L85)
  - [`CustomerHomeViewModel.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/presentation/customer/CustomerHomeViewModel.kt#L226-L338)
- **Comportamiento en Código:**
  En `CheckoutStepContent.kt` (líneas 174-198), se presenta un selector con dos opciones hardcodeadas:
  ```kotlin
  listOf("efectivo" to "💵 Efectivo", "tarjeta" to "💳 Tarjeta").forEach { (methodKey, label) ->
      val isSelected = selectedPaymentMethod == methodKey
      // ...
  }
  ```
  Al confirmar la orden en `CustomerHomeViewModel.placeOrder(...)` (líneas 285-323):
  - Se genera un documento en `/orders/{orderRef.id}`.
  - Se persiste: `"paymentMethod" to paymentMethod`, `"status" to "pending"`, `"estado" to "pendiente"`.
  - **No se genera ningún documento en `/payments` ni se valida `paymentStatus`**.
  - No existe un interceptor o feature flag que inhabilite la opción de tarjeta mientras no exista pasarela bancaria.

#### B. Flujo de Pago en Encomiendas X → Y
- **Archivos:**
  - [`SolicitarEnvioScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/SolicitarEnvioScreen.kt#L1535-L1780)
  - [`MainActivity.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MainActivity.kt#L625-L725)
- **Comportamiento en Código:**
  `SolicitarEnvioScreen.kt` permite seleccionar:
  1. `efectivo`: Valida monto de pago (`montoEfectivo >= tarifaFinal`), calcula cambio en tiempo real y permite delegar el pago al receptor (`payerSelected == "RECIPIENT"`).
  2. `billetera` / `transferencia`: Muestra cuentas bancarias de la plataforma (BAC / LAFISE / Billeteras) y exige adjuntar comprobante gráfico (`imagePickerLauncher`) y número de referencia.
  Al persistir en `MainActivity.kt`:
  - Si `metodo == "efectivo"` $\rightarrow$ `status = "ready"` (entra directo al pool de motorizados).
  - Si `metodo != "efectivo"` $\rightarrow$ `status = "payment_verifying"` (espera aprobación manual o Cloud Function).

---

### 3.2. Courier App — Flujo de Cobro en Ruta

- **Archivo:** [`RutaActivaScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/RutaActivaScreen.kt#L693-L1007)
- **Comportamiento en Código:**
  1. **Determinación del método:**
     ```kotlin
     val isEfectivo = paymentMethodState.isEmpty() || paymentMethodState.lowercase() == "efectivo"
     val receivedAmount = cashReceivedInput.toDoubleOrNull() ?: 0.0
     val changeAmount = receivedAmount - totalOrderState
     val isCashValid = !isEfectivo || (faseActual == 1) || (payerState != "RECIPIENT" && !isEfectivo) || (receivedAmount >= totalOrderState)
     ```
  2. **Bloqueo por Efectivo Insuficiente:**
     Si `isEfectivo` y `receivedAmount < totalOrderState`, la UI muestra:
     - Badge rojo: `"⚠️ Monto insuficiente. Faltan C$ ..."`
     - El botón de confirmación queda bloqueado: `"Efectivo Insuficiente (Faltan C$ ...)"`.
  3. **Pago Electrónico:**
     Si `!isEfectivo`, muestra badge verde:
     ```
     ✓ PAGADO CON TARJETA / ELECTRÓNICO
     No solicitar cobro al cliente.
     ```
     El repartidor no ingresa montos y confirma la entrega directamente.
  4. **Cierre Transaccional (Fase 2):**
     Al confirmar entrega (`completed`), actualiza en Firestore:
     - `status: "completed"`, `courierPhase: 3`, `deliveredAt`, `completedAt`.
     - Si es efectivo: `cashReceived: receivedAmount`, `cashDiscrepancy: (receivedAmount != totalOrderState)`.
     - Registra telemetría: `Log.d("COURIER_PAYMENT", "total=$totalOrderState received=$receivedAmount change=$changeAmount")`.

---

### 3.3. Merchant Web & Panel Admin

- **Archivos:**
  - [`liveOrders.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/liveOrders.js#L256-L270)
  - [`FinanceModule.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/FinanceModule.tsx#L1-L150)
  - [`OrdersModule.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/OrdersModule.tsx#L390-L410)
  - [`DeliveryControlTowerModule.tsx`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/merchant-web/src/modules/DeliveryControlTowerModule.tsx)
- **Comportamiento en Código:**
  - En `liveOrders.js`, la resolución de método y estado está normalizada con fallbacks resilientes:
    - `resolvePaymentMethod(ord)`: Mapea a `TARJETA`, `BILLETERA`, `TRANSFERENCIA` o `EFECTIVO`.
    - `resolvePaymentStatus(ord)`: Mapea a `PAGADO`, `FALLIDO`, `REEMBOLSADO` o `PENDIENTE`.
  - En `FinanceModule.tsx`: Consume agregados de `/merchant_summaries/{businessId}` y el flujo inmutable `/financial_events` generado exclusivamente por Cloud Functions.
  - En `OrdersModule.tsx`: Muestra el listado de pedidos sin filtrar por `paymentMethod` ni exponer datos de pago.
  - En `DeliveryControlTowerModule.tsx`: Mantiene estricto congelamiento (ADR-013) visualizando únicamente estado operativo del pedido y posición GPS del repartidor, sin alterar datos financieros.

---

### 3.4. Cloud Functions & Backend Transaccional

- **Archivo:** [`functions/src/triggers/orders.ts`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/orders.ts)
- **Funciones Relevantes:**
  1. `notifyNewOrder`:
     - Ejecuta auditoría financiera autoritativa de cupones (`evaluateCoupon`), recalculando `subtotal`, `deliveryFee` y `total` de forma determinista para evitar fraudes de inyección de descuentos en el cliente.
     - Enruta encomiendas X→Y a `available_orders` y pedidos comerciales a los dispositivos de comercio mediante FCM.
  2. `notifyOrderStatusChange`:
     - Notifica al motorizado asignado (`COURIER_ASSIGNED`) y al cliente (`ORDER_STATUS`).
  3. `onPaymentStatusUpdated`:
     - Detecta la transición de `payment_verifying` $\rightarrow$ `pending` en pedidos con comprobante manual rechazado y notifica al cliente (`PAYMENT_REJECTED`).
     - Detecta pedidos cancelados por exceder 3 intentos de comprobante no verificado.
  4. `onOrderDelivered`:
     - Disparador financiero atómico e idempotente (`idempotencyKey = ${orderId}_ORDER_REVENUE`).
     - Genera dos registros en `/financial_events`: `ORDER_REVENUE` (crédito al comercio) y `PLATFORM_FEE` (comisión de plataforma).
     - Actualiza atómicamente `/merchant_summaries/{businessId}` con `FieldValue.increment` en centavos enteros (evitando errores de punto flotante).

---

### 3.5. Seguridad en Firestore (`firestore.rules`)

- **Archivo:** [`firestore.rules`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/firestore.rules#L522-L730)
- **Evaluación de Seguridad:**
  - **Aislamiento Multi-Tenant & Roles:** La lectura en `/orders/{orderId}` está restringida a: cliente dueño (`customerId` / `clienteId`), comercio dueño (`ownsBusiness`), courier asignado (`assignedCourierId` / `motorizadoId`) o Platform Admin.
  - **Inmutabilidad Financiera:**
    - Los clientes solo pueden cancelar pedidos si están en `pending/draft/created/preparing`, modificando estrictamente `status`, `estado`, `cancelReason`, `cancelledAt`, `historialEstados`, `updatedAt`.
    - Los repartidores solo pueden actualizar estados operativos y registrar `cashReceived`, `cashDiscrepancy`.
    - Las colecciones `/financial_events` y `/merchant_summaries` están **bloqueadas para escritura directa desde cualquier cliente** (`allow create, update, delete: if isPlatformAdmin()`), siendo actualizables únicamente por Cloud Functions con Firebase Admin SDK.

---

## 4. INVENTARIO DE CAMPOS Y MODELO DE DATOS DE PAGO

| Campo | Modelo / Colección | Tipo | Estatus | Propósito / Uso Actual |
| :--- | :--- | :--- | :--- | :--- |
| `paymentMethod` | `Pedido`, `orders`, `deliveryTrips` | `String` | **Canónico** | Método seleccionado (`"efectivo"`, `"tarjeta"`, `"billetera"`, `"transferencia"`) |
| `metodoPago` | `ValoresMonetarios`, `orders` | `String` | **Legacy** | Objeto anidado de retrocompatibilidad |
| `total` | `Pedido`, `orders`, `deliveryTrips` | `Double` | **Canónico** | Monto final total de la orden |
| `subtotal` | `Pedido`, `orders`, `deliveryTrips` | `Double` | **Canónico** | Suma de productos sin delivery |
| `deliveryFee` | `Pedido`, `orders`, `deliveryTrips` | `Double` | **Canónico** | Tarifa de envío |
| `cashReceived` | `Pedido`, `orders`, `deliveryTrips` | `Double` | **Canónico** | Efectivo entregado físicamente por el cliente al courier |
| `cashDiscrepancy` | `Pedido`, `orders` | `Boolean` | **Canónico** | Bandera que indica si `cashReceived != total` |
| `amountPaid` | `Pedido`, `orders`, `deliveryTrips` | `Double` | **Operacional** | Monto declarado con el que pagará el cliente (para cálculo de cambio previo) |
| `changeNeeded` / `change` | `Pedido`, `orders`, `deliveryTrips` | `Double` | **Operacional** | Cambio a llevar por el courier |
| `receiptUrl` | `Pedido`, `orders`, `deliveryTrips` | `String` | **Operacional** | URL Storage del comprobante de transferencia |
| `referenceNumber` | `Pedido`, `orders`, `deliveryTrips` | `String` | **Operacional** | Número de referencia bancaria manual |
| `paymentRejectionReason` | `Pedido`, `orders` | `String` | **Operacional** | Motivo de rechazo de comprobante manual |
| `paymentAttempts` | `Pedido`, `orders` | `Int` | **Operacional** | Contador de intentos de comprobante (máx 3) |
| `paymentStatus` | No persistido en orders | `String` | **Ausente / Virtual** | Resuelto en `liveOrders.js` mediante inferencia |
| `amountCents` | `/financial_events` | `Int` | **Canónico** | Monto en centavos para trazabilidad contable |

---

## 5. ANÁLISIS DE RIESGOS Y VULNERABILIDADES FORENSES

### 🔴 Riesgo Crítico 1: Brecha de Cobro por Selección de "Tarjeta" sin Pasarela
- **Causa Raíz:** En `CheckoutStepContent.kt`, la opción "Tarjeta" está habilitada para el cliente final. Al seleccionarla, la orden se crea sin procesar cobro y el repartidor recibe la instrucción `✓ PAGADO CON TARJETA / No solicitar cobro al cliente`.
- **Impacto:** Si un cliente selecciona "tarjeta", recibe la mercancía gratis y el comercio/repartidor asume la pérdida.
- **Acción Requerida:** Inhabilitar inmediatamente la opción "tarjeta" en la UI de checkout mediante un **Feature Flag estricto (`CARD_PAYMENTS_ENABLED = false`)** o marcarla como "Próximamente" (deshabilitada) hasta que se integre la pasarela bancaria oficial.

### 🟡 Riesgo 2: Acoplamiento de Estado Operacional con Estado Financiero
- **Causa Raíz:** El ciclo de vida de Commerce Delivery asume que `status = "completed"` implica que el dinero fue recaudado.
- **Impacto:** Para pagos en efectivo esto es válido (el courier recauda en mano), pero para tarjetas o pagos bancarios, el pago debe confirmarse **antes** de preparar el pedido o de despacharlo.
- **Acción Requerida:** Desacoplar la máquina de estados del pedido (`OrderStatus`) de la máquina de estados de pago (`PaymentStatus`).

### 🟢 Fortaleza Confirmada: Zero Datos Sensibles de Tarjeta
- El código fuente actual **no almacena, no procesa ni transporta números de tarjeta (PAN), CVVs, fechas de expiración ni PINs**. No existe contaminación PCI en Firestore ni en logs locales.

---

## 6. CONCLUSIÓN FORENSE

El sistema BlueSystem Delivery cuenta con un núcleo de cobro en efectivo sólido, resiliente y auditado. Sin embargo, para la llegada de una pasarela bancaria institucional, es imperativo establecer una capa de abstracción desacoplada (`PaymentGateway` / `PaymentService`), una máquina de estados independiente y una pasarela de entrada segura con control de idempotencia y validación de webhooks.
