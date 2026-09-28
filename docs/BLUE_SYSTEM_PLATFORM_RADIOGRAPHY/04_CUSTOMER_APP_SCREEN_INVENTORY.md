# 04 — CUSTOMER APP SCREEN-BY-SCREEN INVENTORY

**Platform:** Android Native (Customer Module)  
**Role Required:** `CUSTOMER` / Unauthenticated Guest (Browsing only)  
**Audit Protocol:** BSD-MASTER-PLATFORM-RADIOGRAPHY-UXUI-001

---

## Screen Inventory Summary Table

| Screen ID | Screen / Composable Name | File Path | Primary Purpose |
|---|---|---|---|
| **CUS-SCR-001** | `CustomerHomeScreen` | `app/.../customer/HomeScreen.kt` | Main storefront, categories, promo carousel, nearby merchants. |
| **CUS-SCR-002** | `MerchantDetailScreen` | `app/.../customer/MerchantDetailScreen.kt` | Merchant profile, opening hours, categorized menu/products. |
| **CUS-SCR-003** | `ProductDetailDialog` | `app/.../customer/ProductDetailDialog.kt` | Product options, variants, quantity selector, add to cart. |
| **CUS-SCR-004** | `CartBottomSheet` | `app/.../customer/CartBottomSheet.kt` | Cart item review, quantity adjustments, order subtotal. |
| **CUS-SCR-005** | `CheckoutScreen` | `app/.../customer/CheckoutScreen.kt` | Delivery address picker, payment method, order submission. |
| **CUS-SCR-006** | `OrderTrackingScreen` | `app/.../customer/OrderTrackingScreen.kt` | Live order timeline, courier map tracking, ETA display. |
| **CUS-SCR-007** | `SolicitarEnvioScreen` | `app/.../customer/SolicitarEnvioScreen.kt` | X→Y delivery creation, origin/destination map picker. |
| **CUS-SCR-008** | `DeliveryTripTrackingScreen` | `app/.../customer/DeliveryTripTrackingScreen.kt` | X→Y point-to-point live package tracking & courier contact. |
| **CUS-SCR-009** | `CustomerAIScreen` | `app/.../customer/CustomerAIScreen.kt` | Gemini AI interactive assistant for search and recommendations. |
| **CUS-SCR-010** | `OrderHistoryScreen` | `app/.../customer/OrderHistoryScreen.kt` | Past orders list, re-order button, invoice view. |
| **CUS-SCR-011** | `CustomerProfileScreen` | `app/.../customer/CustomerProfileScreen.kt` | User account details, phone verification, theme toggle. |
| **CUS-SCR-012** | `SavedAddressesScreen` | `app/.../customer/SavedAddressesScreen.kt` | Address CRUD, default delivery address selection. |
| **CUS-SCR-013** | `ReviewOrderDialog` | `app/.../customer/ReviewOrderDialog.kt` | 5-star rating and comments for food and courier service. |
| **CUS-SCR-014** | `VoucherUploadDialog` | `app/.../customer/VoucherUploadDialog.kt` | Bank transfer proof image upload to Cloud Storage. |
| **CUS-SCR-015** | `MapLocationPickerDialog` | `app/.../customer/MapLocationPickerDialog.kt` | Fullscreen interactive map with central pin for coordinate picking. |

---

## Detailed Radiography: Screen by Screen

### CUS-SCR-001 — CustomerHomeScreen

- **Plataforma:** Android Native (Customer)
- **Rol:** `CUSTOMER` / Guest
- **Ruta:** `customer/home`
- **Punto de entrada:** Login exitoso o inicio de app como cliente.
- **Objetivo:** Descubrir comercios, explorar categorías, ver banners promocionales y acceder a servicios de delivery o envíos X→Y.
- **Qué ve el usuario:**
  - Header superior con selector de dirección de entrega actual y avatar.
  - Barra de búsqueda interactiva y botón de asistente IA.
  - Carrusel horizontal de Banners promocionales (`/banners`).
  - Grid de Categorías con iconos (`/categories`).
  - Selector de Servicio: "Comida & Tiendas" vs "Envío X→Y Express".
  - Lista vertical de Comercios destacados con tiempo estimado y costo de envío.
  - Bottom Navigation Bar fija (Inicio, Envíos, Pedidos, Perfil).
- **Componentes visuales:** `TopAppBar`, `AddressHeaderBar`, `BannerCarousel`, `CategoryGrid`, `ServiceSelectorTabs`, `MerchantCard`, `NavigationBar`.
- **Acciones disponibles:**
  - Tocar dirección: Abre `SavedAddressesScreen`.
  - Tocar IA: Abre `CustomerAIScreen`.
  - Tocar categoría: Filtra comercios.
  - Tocar comercio: Navega a `MerchantDetailScreen` (`CUS-SCR-002`).
  - Tocar "Envío X→Y": Navega a `SolicitarEnvioScreen` (`CUS-SCR-007`).
- **Navegación:** Permite transiciones hacia Merchant Detail, Solicitar Envio, Customer AI, Carrito y Pedidos.
- **Estados:** `Loading` (Shimmer placeholders), `Success` (Feed cargado), `Empty` (Sin comercios en zona), `Error` (Banner de reconexión).
- **Datos consumidos:** `/banners` (donde `isActive == true`), `/categories`, `/merchants`.
- **Datos modificados:** Ninguno (Lectura reactiva).
- **Firestore:** `banners`, `categories`, `merchants`.
- **Cloud Functions:** Ninguna directamente.
- **APIs:** Google Maps Geocoder (para nombre de dirección activa).
- **Permisos:** `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`.
- **Seguridad:** Lectura pública o autenticada según Firestore Rules.
- **Offline:** Caché local de Room para comercios y categorías recientes.
- **Notificaciones:** Recibe push en background si hay una orden activa.
- **Estado:** 🟢 `REAL / ACTIVE`
- **Observaciones UX/UI:** Requiere asegurar que el padding inferior respete la Safe Area y la barra de navegación del sistema.

---

### CUS-SCR-005 — CheckoutScreen

- **Plataforma:** Android Native (Customer)
- **Rol:** `CUSTOMER`
- **Ruta:** `customer/checkout`
- **Punto de entrada:** Botón "Proceder al Pago" en `CartBottomSheet`.
- **Objetivo:** Confirmar dirección de entrega, seleccionar método de pago, ingresar notas para el comercio/repartidor y confirmar la orden.
- **Qué ve el usuario:**
  - Tarjeta de Resumen del Comercio (nombre, sucursal).
  - Tarjeta de Dirección de Entrega con botón de cambio o edición.
  - Selector de Método de Pago: Efectivo, Tarjeta (Stripe/Terminal), Transferencia Bancaria (con botón de comprobante).
  - Campo de monto con el que paga el cliente (para cálculo de cambio en efectivo).
  - Campo de instrucciones especiales ("Timbre dañado, dejar en recepción").
  - Desglose financiero: Subtotal, Tarifa de Envío, Descuentos/Cupones, Total Final.
  - Botón principal flotante: "Confirmar y Enviar Pedido".
- **Acciones disponibles:**
  - Cambiar dirección de entrega.
  - Seleccionar método de pago.
  - Aplicar cupón de descuento (`/coupons`).
  - Pulsar "Confirmar y Enviar Pedido".
- **Navegación:** Al confirmar con éxito, navega a `OrderTrackingScreen` (`CUS-SCR-006`) y vacía el carrito local.
- **Estados:** `Idle`, `Submitting` (CircularProgressIndicator bloqueante), `Success`, `PaymentError`.
- **Datos consumidos:** `CartManager` (items locales), `/coupons`, `/system_config/fees`.
- **Datos modificados:** Escribe nuevo documento en `/orders/{orderId}`.
- **Firestore:** `/orders`, `/coupons`.
- **Cloud Functions:** Desencadena `onOrderCreated` al insertar en Firestore.
- **Permisos:** Autenticación requerida.
- **Estado:** 🟢 `REAL / ACTIVE`

---

### CUS-SCR-006 — OrderTrackingScreen

- **Plataforma:** Android Native (Customer)
- **Rol:** `CUSTOMER`
- **Ruta:** `customer/order_tracking/{orderId}`
- **Punto de entrada:** Checkout exitoso o selección de pedido activo en `OrderHistoryScreen`.
- **Objetivo:** Visualizar el estado de preparación y despacho en tiempo real, ver la posición GPS del motorizado en el mapa y comunicarse con él.
- **Qué ve el usuario:**
  - Timeline de estados: `PENDING` → `PREPARING` → `READY` → `IN_TRANSIT` → `DELIVERED`.
  - Mapa embebido (Google Maps Native) con marcadores: Comercio (Origen), Cliente (Destino), y Motorizado (con icono de moto rotado según heading).
  - Tarjeta flotante del Repartidor (foto, nombre, vehículo, placa, botón de llamada / chat).
  - Tiempo Estimado de Llegada (ETA) dinámico.
  - Código PIN de confirmación de entrega (para entregar al repartidor).
  - Botón de Cancelación (activo sólo en estado `PENDING`).
- **Acciones disponibles:**
  - Llamar al repartidor / Llamar al restaurante.
  - Abrir chat en tiempo real.
  - Cancelar pedido (si no ha sido aceptado por el restaurante).
- **Navegación:** Al pasar a `DELIVERED`, abre automáticamente `ReviewOrderDialog` (`CUS-SCR-013`).
- **Datos consumidos:** `/orders/{orderId}`, `/ubicaciones_repartidores/{courierId}`, `/users/{courierId}`.
- **Firestore:** Suscripción reactiva (`addSnapshotListener`) a `/orders/{orderId}` y `/ubicaciones_repartidores/{courierId}`.
- **Estado:** 🟢 `REAL / ACTIVE`
