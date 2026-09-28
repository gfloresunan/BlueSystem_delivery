# BLUE SYSTEM DELIVERY ENTERPRISE
# INFORME FORENSE DE ARQUITECTURA Y DESCUBRIMIENTO
## FASE 5D.0 — CART & CHECKOUT FORENSIC DISCOVERY
### Customer App — Transactional Flow, Cart State, Security & Order Protection

---

## 1. Executive Summary (Resumen Ejecutivo)
La **Fase 5D.0** ejecutó una radiografía forense integral del subsistema de **Carrito (`Cart`)** y **Finalización de Compra (`Checkout`)** de la Customer App. Se identificó que Cart/Checkout es una frontera híbrida donde convergen la persistencia local desacoplada (`CartManager`), la gestión de estado de Compose, la validación determinista de cupones (`CouponRepository`), la resolución de direcciones de entrega y la creación particionada de órdenes multi-comercio en Firestore (`Modelo B`).

La fase se ejecutó bajo la regla estricta de **CERO MUTACIÓN DE CÓDIGO (Zero Code Mutation)**, estableciendo las salvaguardas necesarias antes de cualquier extracción modular.

---

## 2. Authorization (Autorización)
Esta fase fue autorizada como el diagnóstico forense previo obligatorio a la modularización de Cart/Checkout (Fases 5D.1+), tras la certificación exitosa de las Fases 5A, 5B y 5C.

---

## 3. Zero Mutation Declaration (Declaración de Cero Mutación)
- **Archivos de producción modificados:** **0**
- **Archivos de producción creados:** **0**
- **Mutaciones en Firestore / Backend:** **0**
- **Mutaciones en Reglas de Seguridad (`firestore.rules`):** **0**
- **Mutaciones en Cloud Functions:** **0**

---

## 4. Cart Architecture (Arquitectura del Carrito)
El subsistema de carrito opera mediante una arquitectura de tres capas:
1. **Capa de Dominio / Persistencia (`CartManager.kt`):** Singleton en memoria con respaldo síncrono en `SharedPreferences` (`bluesystem_cart_prefs`).
2. **Capa de Presentación / Diálogo (`CustomerHomeScreen.kt` - Paso 1):** Diálogo modal (`AlertDialog`) con agrupación por comercio, control de cantidades (`+`, `-`, `delete`), input reactivo de cupones y resumen de subtotales.
3. **Capa de Eventos / Analytics (`AnalyticsHelper`):** Disparo de eventos `logAddToCart` y `logBeginCheckout`.

---

## 5. Checkout Architecture (Arquitectura de Checkout)
El flujo de Checkout se activa en el **Paso 2** del diálogo modal y coordina:
1. **Selección de Dirección:** Lectura de `userAddresses` desde Firestore (`/users/{uid}/addresses`) o ingreso de dirección manual (`customAddressText`).
2. **Método de Pago:** Selección entre `efectivo` (💵 Efectivo) y `tarjeta` (💳 Tarjeta).
3. **Resumen de Modelo B:** Notificación de que se generarán órdenes independientes por cada comercio involucrado.
4. **Confirmación Transaccional:** Invocación a `viewModel.placeOrder(...)` con validación de sesión de usuario (`isGuest` vs autenticado).

---

## 6. CartManager Analysis (Análisis de CartManager)
- **Ubicación:** `app/src/main/java/com/example/data/CartManager.kt`
- **Tipo:** `object CartManager` (Singleton en memoria).
- **Flujos Reactivos:**
  - `val cartItems: StateFlow<List<CartItem>>`
  - `val cartItemCount: StateFlow<Int>`
- **Estructura de `CartItem`:**
  - `productId`, `productName`, `price`, `quantity`, `businessId`, `businessName`, `imageUrl`, `branchId`, `selectedOptions`, `cartItemId`.
  - Propiedad calculada `unitPriceWithExtras = price + selectedOptions.sumOf { it.finalPrice }`.
- **Firma Única:** Generada vía `CartItemSignatureGenerator.generateSignatureKey(...)` para distinguir productos idénticos con diferentes opciones/extras seleccionados.

---

## 7. Cart State Map (Mapa de Estado del Carrito)
```
UI Events (Add / Increment / Decrement / Remove)
        ↓
CartManager (addToCart, incrementQuantity, decrementQuantity, removeItem, clear)
        ↓
_cartItems (MutableStateFlow) + _cartItemCount (MutableStateFlow)
        ↓
SharedPreferences JSON Serialization ("bluesystem_cart_prefs" -> "cart_items_json")
        ↓
Subtotal Calculation (sumOf { it.unitPriceWithExtras * it.quantity })
        ↓
CustomerHomeScreen (collectAsState -> UI Reactiva)
```

---

## 8. Multi-Commerce Analysis (Análisis Multi-Comercio — Modelo B)
- BlueSystem permite que el cliente agregue productos de **diferentes comercios simultáneamente** en el mismo carrito.
- **Agrupación en UI:** `cartItems.groupBy { it.businessId }`.
- **Cálculo de Envíos:** Cada comercio tiene su propio costo de envío calculado vía `bInfo?.getEffectiveDeliveryFee() ?: 45.0`.
- **Creación de Pedidos:** En lugar de una orden combinada gigante, el backend genera **1 pedido independiente en Firestore por cada comercio** (`groupedItems.forEach`), permitiendo que cada negocio gestione su propio KDS y despacho.

---

## 9. Price Authority (Autoridad de Precios)
- **Precios de Entrada:** Provienen del catálogo (`Product.price` / `BusinessInfo`).
- **Extras y Modificadores:** Suman a través de `SelectedOption.finalPrice`.
- **Cálculo de Subtotal:** `CartManager.subtotal`.
- **Tope de Descuentos:** `grandTotal = (baseGrandTotal - appliedCouponDiscount).coerceAtLeast(0.0)`.

---

## 10. Total Calculation (Cálculo de Totales)
Fórmula canónica auditada:
$$\text{Subtotal} = \sum (\text{unitPriceWithExtras} \times \text{quantity})$$
$$\text{Total Envíos} = \sum_{\text{biz} \in \text{groupedBiz}} \text{DeliveryFee}_{\text{biz}}$$
$$\text{Base Grand Total} = \text{Subtotal} + \text{Total Envíos}$$
$$\text{Grand Total Final} = \max(0.0, \text{Base Grand Total} - \text{Descuento Cupón})$$

---

## 11. Coupon Architecture (Arquitectura de Cupones)
- **Repositorio:** `com.example.data.repository.CouponRepository`.
- **Colección Firestore:** `/coupons` (con fallback de nombres y compatibilidad).
- **Validaciones Ejecutadas:**
  1. Existencia y código exacto (uppercase).
  2. Estado activo (`isActive == true`).
  3. Rango de vigencia temporal (`isValidNow()`).
  4. Alcance del comercio (`GLOBAL` vs `MERCHANT_SPECIFIC` con match de `businessId`).
  5. Sucursales autorizadas (`branchIds`).
  6. Monto mínimo de compra (`cartSubtotal >= minimumOrderAmount`).
  7. Límite de usos global (`usageCount < usageLimit`).
  8. Cálculo de descuento porcentual / monto fijo / envío gratis con tope máximo (`maximumDiscountAmount`).

---

## 12. Coupon Security (Seguridad de Cupones)
- **Regla Crítica:** La aplicación del cupón genera un `couponSnapshot` completo que se incrusta en el documento `/orders/{orderId}`, asegurando inmutabilidad histórica e impidiendo que una modificación posterior del cupón altere la contabilidad del pedido.
- **Acceso:** Customer App sólo realiza consultas filtradas (`whereEqualTo("code", cleanCode)` con `limit(1)`).

---

## 13. Address Architecture (Arquitectura de Direcciones)
- **Colección:** `/users/{uid}/addresses`.
- **Modelo:** `com.example.Address` (`id`, `label`, `fullAddress`, `latitude`, `longitude`, `instructions`, `isDefault`).
- **Gestión:** Sincronizado reactivamente por `CustomerHomeViewModel.addressesListener`.

---

## 14. Address-to-Order Flow (Flujo Dirección → Orden)
1. Si el usuario tiene direcciones guardadas, se preselecciona la predeterminada (`defaultAddressDoc ?: userAddresses.first()`).
2. Si el usuario selecciona "Usar otra dirección", se habilita `customAddressText`.
3. Al confirmar la orden, se extraen `deliveryAddress`, `fullAddress`, `latitude`, `longitude`, `instructions` y `addressId`, inyectándose en el payload de Firestore.

---

## 15. Payment Architecture (Arquitectura de Pagos)
- **Efectivo (`efectivo`):** 🟢 **REAL / FUNCIONAL** — Registrado en orden para cobro contra entrega.
- **Tarjeta (`tarjeta`):** 🟠 **UI WITHOUT DIRECT GATEWAY** — Registra la intención de pago con tarjeta para POS móvil del repartidor o cobro en entrega.

---

## 16. Checkout State Machine (Máquina de Estados de Checkout)
```
[Estado 0: Carrito Cerrado]
        ↓ (showCartDialog = true)
[Estado 1: Revisión de Carrito (cartModalStep = 1)]
        ├── Agregar / Quitar / Eliminar Items
        ├── Validar Cupón (CouponRepository)
        └── Vaciar Carrito (CartManager.clear())
        ↓ (Continuar al Checkout -> beginCheckout)
[Estado 2: Checkout & Despacho (cartModalStep = 2)]
        ├── Seleccionar / Ingresar Dirección
        ├── Seleccionar Método de Pago
        └── Volver al Carrito (cartModalStep = 1)
        ↓ (CONFIRMAR PEDIDO -> isPlacingOrder = true)
[Estado 3: Creación de Pedidos en Firestore]
        ├── Iteración por Comercios (Modelo B)
        ├── Escritura atómica a /orders
        ├── Limpieza de Carrito (CartManager.clear())
        └── Emisión de _orderPlaced -> Redirección a OrderDetailScreen
```

---

## 17. Order Creation (Creación de Pedidos)
- **Ejecutor:** `CustomerHomeViewModel.placeOrder(...)`.
- **Colección:** `/orders`.
- **Generación de ID:** Document Reference automático de Firestore (`db.collection("orders").document().id`).

---

## 18. Authoritative Order Protection (Protección de Órdenes)
- Las órdenes creadas son consumidas por:
  - **Merchant Web:** Control Tower y KDS.
  - **Courier App:** Asignación y despacho en ruta.
  - **Customer App:** Seguimiento y tracking en tiempo real.
- Los campos de compatibilidad bilingüe (`status`/`estado`, `customerId`/`clienteId`/`userId`/`uid`, `address`/`deliveryAddress`/`destinationAddress`) se encuentran preservados para garantizar interoperabilidad multiplataforma.

---

## 19. Order Payload (Payload de la Orden en Firestore)
Campos canónicos inyectados:
```kotlin
hashMapOf(
    "pedidoId" to orderRef.id,
    "customerId" to uid,
    "clienteId" to uid,
    "userId" to uid,
    "uid" to uid,
    "customerName" to customerName,
    "customerPhone" to customerPhone,
    "businessId" to bizId,
    "businessName" to bizName,
    "branchId" to branchId,
    "items" to orderItems, // List<Map<String, Any>> (productId, productName, price, quantity, subtotal, imageUrl)
    "subtotal" to subtotal,
    "deliveryFee" to bizDeliveryFee,
    "couponCode" to (couponCode ?: ""),
    "couponDiscount" to couponDiscount,
    "promotionDiscount" to promotionDiscount,
    "totalDiscount" to (couponDiscount + promotionDiscount),
    "coupon" to (couponSnapshot ?: emptyMap()),
    "total" to total,
    "status" to "pending",
    "estado" to "pendiente",
    "paymentMethod" to paymentMethod,
    "addressId" to (addressId ?: ""),
    "address" to effectiveAddress,
    "deliveryAddress" to effectiveAddress,
    "destinationAddress" to effectiveAddress,
    "fullAddress" to fullAddress.ifBlank { effectiveAddress },
    "latitude" to latitude,
    "longitude" to longitude,
    "instructions" to instructions,
    "deliveryInstructions" to instructions,
    "createdAt" to Timestamp.now(),
    "creadoEl" to Timestamp.now().toString(),
    "courierPhase" to 1,
    "hasBeenRated" to false
)
```

---

## 20. Transactionality (Transaccionalidad)
- Cada orden se escribe mediante `.set(orderData).await()` dentro de una corrutina de ViewModel (`viewModelScope.launch`).
- Al finalizar con éxito todas las órdenes del batch, se ejecuta `CartManager.clear()` y se activa `_orderPlaced.value = lastOrderCreatedId`.

---

## 21. Idempotency & Duplicate Order Risk (Idempotencia y Riesgo de Duplicados)
- **Protección Actual:** El botón "CONFIRMAR PEDIDO" valida `enabled = !isPlacingOrder && isAddressValid`.
- Al hacer clic, `_isPlacingOrder.value = true` bloquea clics secundarios y muestra un `CircularProgressIndicator`.
- Al finalizar o fallar en el bloque `try/finally`, `_isPlacingOrder.value = false`.

---

## 22. Offline Behavior (Comportamiento Offline)
- **Carrito:** 100% offline-first mediante `CartManager` y `SharedPreferences`.
- **Checkout:** Requiere conectividad con Firestore para validar cupones y registrar la orden. Si el dispositivo está sin red, Firestore encola la escritura en caché local y emite éxito de corrutina cuando el SDK de Firebase sincroniza.

---

## 23. Error States (Estados de Error y Validaciones)
1. **Carrito Vacío:** Diálogo muestra icono y mensaje explicativo; botón de confirmación deshabilitado.
2. **Dirección Inválida:** Toast de advertencia y botón deshabilitado.
3. **Cupón Inválido / Expirado:** Mensaje de error en rojo bajo el campo de texto; descuento restablecido a 0.0.
4. **Fallo en Creación de Orden:** Captura de excepción en `try/catch` con log forense `FATAL_ERROR_CREATING_ORDER` y liberación del estado `isPlacingOrder`.

---

## 24. Compose Side Effects (Efectos Colaterales en Compose)
- `LaunchedEffect(orderPlaced)`: Detecta la creación de la orden, emite Toast informativo y navega a `Screen.OrderDetail`.
- `LaunchedEffect(showCartDialog, userAddresses, defaultAddressDoc)`: Sincroniza la dirección predeterminada al abrir el diálogo.

---

## 25. Firestore Dependencies (Dependencias con Firestore)
- Colección `/orders` (Escritura).
- Colección `/users/{uid}/addresses` (Lectura reactiva).
- Colección `/users/{uid}` (Lectura de perfil: `nombre`, `telefono`).
- Colección `/coupons` (Lectura determinista de cupones).

---

## 26. Cloud Functions & Backend Triggers (Cloud Functions)
- La creación de una orden en `/orders` dispara los listeners de backend en Merchant Web y la torre de control de motorizados.

---

## 27. Web / Admin Dependencies (Dependencias con Web y Admin)
- Merchant Web lee directamente `/orders` para alertar al comercio mediante sonido y visualización en KDS.
- La estructura del documento debe mantener estricta compatibilidad con `DeliveryControlTowerModule.tsx` y `MerchantOperationsDashboardScreen.kt`.

---

## 28. Business Dependencies (Dependencias de Comercios)
- El costo de envío por negocio se obtiene dinámicamente de `BusinessInfo.getEffectiveDeliveryFee()`.
- Si el comercio está cerrado, el catálogo restringe pedidos.

---

## 29. Profile Dependencies (Dependencias de Perfil)
- El nombre y teléfono del cliente se extraen de `/users/{uid}` para contacto de entrega.

---

## 30. Orders Dependencies (Dependencias con Módulo de Pedidos)
- Al confirmarse el pedido, la app navega inmediatamente a `Screen.OrderDetail.createRoute(oid)`, vinculando el historial de órdenes (`OrdersHistoryScreen`).

---

## 31. Notification Dependencies (Dependencias de Notificaciones)
- Creación de orden dispara notificaciones locales y FCM a través de Cloud Functions vinculadas.

---

## 32. Data Ownership Matrix (Matriz de Propiedad de Datos)

| Dato | UI Local | CartManager | ViewModel | Firestore | Backend / Web |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Items & Cantidades** | ❌ (Lee) | 🟢 **Owner** | ❌ | ❌ | ❌ |
| **Opciones y Extras** | ❌ (Lee) | 🟢 **Owner** | ❌ | ❌ | ❌ |
| **Subtotal Carrito** | ❌ (Lee) | 🟢 **Calcula**| ❌ | ❌ | ❌ |
| **Dirección Seleccionada**| 🟢 **Local** | ❌ | ❌ | 🟢 (Almacena)| ❌ |
| **Código de Cupón** | 🟢 **Local** | ❌ | ❌ | 🟢 (Valida) | ❌ |
| **Descuento Aplicado** | 🟢 **Local** | ❌ | ❌ | 🟢 (Persiste)| ❌ |
| **Método de Pago** | 🟢 **Local** | ❌ | ❌ | 🟢 (Persiste)| ❌ |
| **Creación de Orden** | ❌ | ❌ | 🟢 **Ejecuta** | 🟢 **Persiste** | 🟢 (Consume) |

---

## 33. Function Status Matrix (Matriz de Estado de Funciones)

| Función | Estado | Clasificación |
| :--- | :---: | :--- |
| **Gestión de Carrito (`CartManager`)** | 🟢 **CERTIFIED** | Persistencia local y cálculo de subtotales activo |
| **Revisión Multi-Comercio (Paso 1)** | 🟢 **CERTIFIED** | Agrupación y desglose de envíos por negocio |
| **Validación de Cupones (`CouponRepository`)** | 🟢 **CERTIFIED** | Determinista en Firestore con control de límites |
| **Selección de Direcciones (Paso 2)** | 🟢 **CERTIFIED** | Integrado con `/users/{uid}/addresses` |
| **Pago en Efectivo** | 🟢 **CERTIFIED** | Registrado en orden contra entrega |
| **Pago con Tarjeta** | 🟠 **UI ONLY** | Marca método sin pasarela digital directa |
| **Creación de Orden (`placeOrder`)** | 🟢 **CERTIFIED** | Escritura particionada Modelo B en Firestore |
| **Redirección a Detalle de Pedido** | 🟢 **CERTIFIED** | Navegación automática a `Screen.OrderDetail` |

---

## 34. Risk Matrix (Matriz de Riesgo)

| Componente | Nivel de Riesgo | Justificación |
| :--- | :---: | :--- |
| **Cart Items UI & Summary** | 🟡 **LOW** | Renderizado puro de items y subtotales |
| **Coupon Input & Validation** | 🟡 **MEDIUM** | Requiere coordinación con `CouponRepository` |
| **Address & Payment Selectors** | 🟡 **MEDIUM** | Gestión de dirección custom y método de pago |
| **Order Placement (`placeOrder`)** | 🔴 **HIGH (P0)** | Escritura transaccional en Firestore y afectación financiera |

---

## 35. UI / Business Logic Separation (Separación UI vs Lógica de Negocio)
- **Candidatos a PURE UI:**
  - Lista de productos en carrito y tarjetas de comercio.
  - Formulario de ingreso de cupón y mensaje de validación.
  - Selector de direcciones guardadas / campo de dirección personalizada.
  - Selector de métodos de pago.
  - Resumen financiero de totales.
- **Lógica que DEBE PERMANECER en Host / ViewModel:**
  - `viewModel.placeOrder(...)` (Transacción y persistencia en Firestore).
  - `CartManager` (Persistencia y cálculo de estado del carrito).
  - `LaunchedEffect(orderPlaced)` (Coordinador de navegación).

---

## 36. Extraction Candidates (Candidatos para Modularización Fase 5D.1+)
Para ejecutar una modularización limpia y de mínimo impacto, se proponen los siguientes componentes desacoplados dentro del subpaquete `com.example.presentation.customer.cart`:
1. `CartItemsStepContent.kt` (Paso 1: Lista de items agrupados por comercio, controles de cantidad y resumen de subtotal).
2. `CheckoutStepContent.kt` (Paso 2: Selección de direcciones, métodos de pago y resumen final).
3. `CouponSection.kt` (Input y botón de validación de cupones).
4. `CartCheckoutDialog.kt` (Diálogo contenedor de 2 pasos que orquesta los pasos anteriores).

---

## 37. Cart Extraction Plan (Plan de Extracción del Carrito)
- Extraer exclusivamente las composables de renderizado.
- Recibir datos de `CartManager` y `publicBusinesses` por parámetro.
- Emitir eventos mediante callbacks puros (`onIncrement`, `onDecrement`, `onRemove`, `onApplyCoupon`, `onClearCart`, `onProceedToCheckout`).

---

## 38. Checkout Extraction Plan (Plan de Extracción de Checkout)
- Extraer selector de direcciones y método de pago como componentes stateless.
- El diálogo emitirá el callback final `onConfirmOrder(...)` hacia `CustomerHomeScreen`, el cual invocará a `viewModel.placeOrder(...)`.

---

## 39. Protected Baselines (Líneas Base Protegidas Inmutables)
- `CartManager.kt`
- `CustomerHomeViewModel.kt`
- `EnterpriseSearchEngine.kt`
- `FavoritesScreen.kt`
- `ProfileScreen.kt`
- `OrdersHistoryScreen.kt` / `OrderDetailScreen.kt`
- `firestore.rules`

---

## 40. Blast Radius (Radio de Impacto Estimado)
- **Nivel Estimado para Fase 5D.1:** 🟡 **MEDIO** (Acotado estrictamente a la presentación del diálogo de carrito/checkout en Customer App, sin alterar el backend ni los ViewModels).

---

## 41. Rollback Considerations (Consideraciones de Reversión)
- Toda extracción en `cart/` será modular y podrá revertirse sin afectar la lógica de home, búsqueda, favoritos ni perfil.

---

## 42. Recommended Phase 5D.1 (Recomendación para Fase 5D.1)
Proceder a la **FASE 5D.1 — CART & CHECKOUT UI EXTRACTION** con la creación del paquete `com.example.presentation.customer.cart` y la extracción modular de `CartCheckoutDialog.kt` manteniendo la persistencia y la creación de órdenes intactas.

---

## 43. Certification Status (Estado de Certificación de Descubrimiento)

| Criterio Forense | Estado | Observaciones |
| :--- | :---: | :--- |
| **Cart Architecture Mapped** | 🟢 **PASS** | `CartManager` y persistencia en SharedPreferences auditados |
| **Multi-Commerce Model B Mapped** | 🟢 **PASS** | Agrupación por negocio y envíos independientes auditados |
| **Coupon Validation Mapped** | 🟢 **PASS** | Integración determinista con `CouponRepository` confirmada |
| **Address & Payment Flow Mapped** | 🟢 **PASS** | Flujo de direcciones guardadas y custom verificado |
| **Order Creation Traced** | 🟢 **PASS** | `viewModel.placeOrder` y payload de `/orders` documentados |
| **Protected Baselines Identified** | 🟢 **PASS** | `CartManager`, ViewModels y Rules protegidos |
| **Zero Code Mutation Verified** | 🟢 **PASS** | 0 archivos modificados o creados en código fuente |

---

# 🏆 ESTADO FINAL OFICIAL
# 🟢 FORENSIC DISCOVERY COMPLETE (FASE 5D.0 CUMPLIDA AL 100%)

---

### ⏸️ HUMAN APPROVAL GATE
En cumplimiento de la Sección 57 del protocolo, la ejecución se detiene aquí.
**Se requiere la autorización expresa del usuario antes de proceder a la FASE 5D.1 (Cart & Checkout UI Extraction).**
