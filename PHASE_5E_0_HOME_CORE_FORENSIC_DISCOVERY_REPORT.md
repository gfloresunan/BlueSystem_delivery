# BLUE SYSTEM DELIVERY ENTERPRISE
# INFORME FORENSE DE ARQUITECTURA Y DESCUBRIMIENTO
## FASE 5E.0 — HOME CORE FORENSIC DISCOVERY & MODULARIZATION PLAN
### Customer App — Home Core Architecture, Sections Inventory & Blast-Radius Mapping

---

## 1. Executive Summary (Resumen Ejecutivo)
La **Fase 5E.0** ejecutó una auditoría forense exhaustiva sobre el núcleo de la pantalla principal (`Home Core`) de la Customer App contenida en `CustomerHomeScreen.kt` (actualmente en 1,365 líneas tras la certificación de las Fases 5A, 5B, 5C y 5D.1).

Se mapearon todas las responsabilidades visuales, estados locales, dependencias con `CustomerHomeViewModel`, llamadas a repositorios, efectos colaterales de Compose, listeners en tiempo real y contratos con módulos certificados. Se estableció la clasificación de cada bloque y la estrategia de extracción modular por etapas para la Fase 5E.

La fase se ejecutó bajo la regla estricta de **CERO MUTACIÓN DE CÓDIGO (Zero Code Mutation)**.

---

## 2. Authorization (Autorización)
Esta fase fue autorizada como el diagnóstico forense previo obligatorio a la modularización de las secciones del Home (Fases 5E.1+), garantizando la inmutabilidad de los baselines ya certificados (Profile, Search, Favorites, Cart/Checkout).

---

## 3. Zero Mutation Declaration (Declaración de Cero Mutación)
- **Archivos de producción modificados:** **0**
- **Archivos de producción creados:** **0**
- **Mutaciones en Firestore / Backend:** **0**
- **Mutaciones en Reglas de Seguridad (`firestore.rules`):** **0**
- **Mutaciones en Cloud Functions:** **0**

---

## 4. Baseline Actual
- **Archivo auditado:** `app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt`
- **Líneas actuales:** 1,365 líneas.
- **Estado Previo:**
  - Fase 5A (Shared Components): 7 componentes extraídos a `components/`.
  - Fase 5B (Search UI): Search Overlay extraído a `search/`.
  - Fase 5C (Favorites Screen): `FavoritesScreen.kt` extraído a `favorites/`.
  - Fase 5D.1 (Cart & Checkout): 4 componentes extraídos a `cart/`.

---

## 5. Current CustomerHome Architecture (Arquitectura Actual de CustomerHome)
```
CustomerHomeScreen.kt (Host Orchestrator - 1,365 líneas)
│
├── 1. Scaffold & Bottom Navigation Host
│   ├── Tab 0: Home Core (PullToRefreshBox + Column con verticalScroll)
│   ├── Tab 1: FavoritesScreen (com.example.presentation.customer.favorites)
│   ├── Tab 3: OrdersHistoryScreen (com.example.presentation.customer.profile)
│   └── Tab 4: ProfileScreen (com.example.presentation.customer.profile)
│
├── 2. Inline Home Core Sections (Tab 0)
│   ├── Topbar / Header (Avatar, Saludo, Botones Notificaciones & Carrito, Selector Dirección, Barra Búsqueda & Mic)
│   ├── BannersSection (com.example.presentation.customer.BannersSection)
│   ├── Categorías (Chips horizontales con selección de filtro)
│   ├── Global Search Results (Overlay inline de resultados cuando searchQueryText != "")
│   ├── Comercios Cerca de Ti / Filtrados por Categoría (LazyRow con PublicBusinessCard)
│   ├── Comercios Destacados (LazyRow con PublicBusinessCard)
│   ├── Productos Estrella (LazyRow con StarProductCard)
│   ├── Ofertas Flash (LazyRow con FlashDealCard)
│   ├── Productos con Descuentos (LazyRow con ProductPromoCard)
│   └── Banner Express Delivery Punto A -> Punto B (Card degradado con CTA)
│
├── 3. Dialog Containers
│   ├── CartCheckoutDialog (com.example.presentation.customer.cart)
│   └── NotificationDialog (Inline AlertDialog con NotificationItem)
│
└── 4. State & Effect Orchestration
    ├── collectAsState (ViewModel, Repositories, FirebaseManager)
    ├── LaunchedEffect (Init context, Order placed toast/nav, Address sync)
    └── SpeechRecognizerLauncher (Reconocimiento por voz)
```

---

## 6. Home Core Inventory (Inventario de Home Core)
Se identificaron 10 bloques visuales principales en Tab 0:
1. **Home Header & Topbar:** Líneas 323–530.
2. **Dynamic Banners Section:** Líneas 532–546.
3. **Categories Section:** Líneas 547–626.
4. **Search Results Section (Inline Overlay):** Líneas 627–802.
5. **Nearby / Filtered Businesses Section:** Líneas 803–875.
6. **Featured Businesses Section:** Líneas 877–922.
7. **Star Products Section:** Líneas 924–973.
8. **Flash Deals Section:** Líneas 975–1023.
9. **Discounted Products Section:** Líneas 1025–1096.
10. **Express Delivery Banner (Punto A → Punto B):** Líneas 1097–1207.
11. **Notifications Dialog:** Líneas 1314–1362.

---

## 7. Composable Inventory (Inventario de Composables)
- **Top-Level Composable:** `CustomerHomeScreen` (Única función en el archivo).
- **Sub-composables externos consumidos:**
  - `CustomerBottomNavigationBar` (`BottomNavigationBar.kt`)
  - `FavoritesScreen` (`favorites/FavoritesScreen.kt`)
  - `OrdersHistoryScreen` (`profile/OrdersHistoryScreen.kt`)
  - `ProfileScreen` (`profile/ProfileScreen.kt`)
  - `BannersSection` (`BannersSection.kt`)
  - `GlobalSearchResultItemCard` (`search/GlobalSearchResultItemCard.kt`)
  - `PublicBusinessCard` (`components/PublicBusinessCard.kt`)
  - `StarProductCard` (`components/StarProductCard.kt`)
  - `FlashDealCard` (`components/FlashDealCard.kt`)
  - `ProductPromoCard` (`components/ProductPromoCard.kt`)
  - `NotificationItem` (`components/NotificationItem.kt`)
  - `CartCheckoutDialog` (`cart/CartCheckoutDialog.kt`)

---

## 8. State Inventory (Inventario de Estados Locales)

| Estado | Tipo | Propósito | Owner | Movible a Componente |
| :--- | :--- | :--- | :---: | :---: |
| `selectedTab` | `Int` | Pestaña activa del BottomBar | Host | ❌ (Host) |
| `showCartDialog` | `Boolean` | Visibilidad del diálogo de carrito | Host | ❌ (Host) |
| `cartModalStep` | `Int` | Paso 1 (Items) vs Paso 2 (Checkout) | Host | ❌ (Host) |
| `showNotificationDialog` | `Boolean` | Visibilidad diálogo notificaciones | Host | ❌ (Host) |
| `showSearchBar` | `Boolean` | Expansión del campo de búsqueda | TopBar | 🟢 (Header/TopBar) |
| `searchQueryText` | `String` | Texto de búsqueda activa | Host | 🟡 (Compartido con Search) |
| `selectedCategoryFilter` | `String` | Categoría seleccionada para filtrar | Host | 🟡 (Compartido con Categorías y Comercios) |
| `selectedSavedAddressId` | `String?` | ID dirección seleccionada | Host | ❌ (Host) |
| `customAddressText` | `String` | Texto dirección manual | Host | ❌ (Host) |
| `isCustomAddressSelected` | `Boolean` | Flag dirección manual | Host | ❌ (Host) |
| `selectedPaymentMethod` | `String` | Método pago ("efectivo"/"tarjeta") | Host | ❌ (Host) |
| `couponCodeInput` | `String` | Código de cupón ingresado | Host | ❌ (Host) |
| `appliedCouponDiscount` | `Double` | Descuento calculado | Host | ❌ (Host) |
| `appliedCouponCode` | `String?` | Código cupón aplicado | Host | ❌ (Host) |
| `appliedCouponSnapshot` | `Map?` | Snapshot inmutable del cupón | Host | ❌ (Host) |
| `couponValidationMessage` | `String?`| Mensaje de validación | Host | ❌ (Host) |
| `isValidatingCoupon` | `Boolean` | Spinner de validación de cupón | Host | ❌ (Host) |

---

## 9. ViewModel Dependencies (Dependencias con CustomerHomeViewModel)

| Flujo / Función en ViewModel | Propósito | Consumidor en Home | Riesgo |
| :--- | :--- | :--- | :---: |
| `isRefreshing` | Estado de Pull-To-Refresh | `PullToRefreshBox` | 🟢 LOW |
| `cartItemCount` | Conteo total de items en carrito | Badge en Header y BottomBar | 🟢 LOW |
| `cartItems` | Lista de `CartItem` | `CartCheckoutDialog` | 🟢 LOW |
| `favoriteIds` | Set de IDs favoritos | `FavoritesScreen`, `PublicBusinessCard` | 🟢 LOW |
| `orderPlaced` | ID de última orden creada | `LaunchedEffect` navegación | 🔴 HIGH (P0) |
| `isPlacingOrder` | Bloqueo de concurrencia | `CartCheckoutDialog` | 🔴 HIGH (P0) |
| `currentUserProfile` | Perfil del cliente | Saludo "Hola, $name" | 🟢 LOW |
| `addresses` | Lista de direcciones | `CartCheckoutDialog` | 🟡 MEDIUM |
| `defaultAddress` | Dirección predeterminada | Header "Entregar en:" | 🟢 LOW |
| `publicBusinesses` | Lista de comercios | Comercios, categorías, filtros | 🟢 LOW |
| `dashboardConfig` | Flags de visibilidad de secciones | Categorías, Destacados, Flash | 🟢 LOW |
| `featuredProducts` | Productos estrella | Sección Productos Estrella | 🟢 LOW |
| `flashDeals` | Ofertas flash activas | Sección Ofertas Flash | 🟢 LOW |
| `discountedProducts` | Productos con descuento | Sección Descuentos | 🟢 LOW |
| `searchResults` | Resultados de búsqueda unificada | Overlay de búsqueda | 🟢 LOW |
| `onSearchQueryChanged(q)` | Dispara búsqueda en ViewModel | Buscador & Launcher de Voz | 🟢 LOW |
| `onSearchFilterSelected(f)`| Filtra entidades de búsqueda | Tabs de búsqueda | 🟢 LOW |
| `toggleFavorite(id)` | Agrega/quita favorito | Tarjetas de comercio | 🟢 LOW |
| `placeOrder(...)` | Crea órdenes en Firestore | `CartCheckoutDialog` callback | 🔴 CRITICAL (P0) |
| `refresh()` | Recarga catálogos y comercios | Pull-To-Refresh | 🟢 LOW |

---

## 10. Firebase Dependencies (Dependencias Directas con Firebase)
- `FirebaseAuth.getInstance().currentUser`: Lectura de `uid` y `email` para saludo y listener de notificaciones.
- `firebaseManager.listenToPromotionalBanners()`: Stream reactivo de banners.
- `firebaseManager.listenToFeaturedBusinesses()`: Stream reactivo de comercios destacados.

---

## 11. Firestore Collections (Colecciones de Firestore Utilizadas)
1. `/users/{uid}` (Perfil de usuario).
2. `/users/{uid}/addresses` (Direcciones de entrega).
3. `/businesses` (Catálogo público de comercios).
4. `/categories` (Categorías oficiales de Home).
5. `/banners` (Banners promocionales).
6. `/notifications/{uid}` (Notificaciones de usuario).
7. `/orders` (Creación de pedidos transaccionales).
8. `/coupons` (Validación de cupones).

---

## 12. Data Source Matrix (Matriz de Fuentes de Datos)

| Sección / Feature | Fuente | Tipo de Carga | Propietario |
| :--- | :--- | :--- | :--- |
| **Header Saludo** | `currentUserProfile` / `FirebaseAuth` | Memory / Flow | `CustomerHomeViewModel` |
| **Header Notificaciones** | `NotificationRepository` | Real-time Listener | `NotificationRepository` |
| **Banners Carousel** | `firebaseManager.listenToPromotionalBanners` | Real-time Listener | `FirebaseManager` |
| **Categorías** | `CategoryRepository` + `publicBusinesses` | Real-time / Memory | `CategoryRepository` |
| **Resultados de Búsqueda** | `EnterpriseSearchEngine` vía ViewModel | Computed Flow | `CustomerHomeViewModel` |
| **Comercios Cerca** | `publicBusinesses` ordenados por GPS | Real-time Stream | `CustomerHomeViewModel` |
| **Comercios Destacados** | `publicBusinesses.filter { isFeatured }` | Real-time Stream | `CustomerHomeViewModel` |
| **Productos Estrella** | `featuredProducts` | One-shot / Cached | `CustomerHomeViewModel` |
| **Ofertas Flash** | `flashDeals` | One-shot / Cached | `CustomerHomeViewModel` |
| **Productos con Descuentos**| `discountedProducts` | One-shot / Cached | `CustomerHomeViewModel` |
| **Banner Delivery A -> B** | Estático con navegación a formulario | Local UI | Local UI |

---

## 13. Mock / Fake Data Audit (Auditoría de Datos Mock)
- **Categorías fallback:** Líneas 563–576 contienen un fallback con emojis estáticos si `/categories` en Firestore está vacío (`restaurante` -> 🍔, `tienda` -> 🏬, etc.). Este fallback es seguro y no genera fallos.
- **Distancia orientativa:** Línea 178 contiene `4.8` km como placeholder visual si el GPS no ha triangulado.
- **0 mocks destructivos detectados.**

---

## 14. Home Header Audit (Auditoría del Header)
- **Líneas:** 323 a 530.
- **Componentes:**
  - Avatar circular con inicial del usuario.
  - Textos de saludo reactivos a `currentUserName`.
  - Icono de notificaciones con badge `unreadCount`.
  - Icono de carrito con badge `cartItemCount`.
  - Fila de dirección ("Entregar en: $address") con navegación a AddressManager.
  - Barra de búsqueda con selector de modo expandido y launcher de reconocimiento de voz.
- **Clasificación:** 🟠 **UI + LOCAL STATE + PRESENTATION LOGIC**.
- **Candidato a Extracción:** `HomeHeader.kt` (Paso 5E.1).

---

## 15. Delivery Banner Audit (Auditoría del Banner Express A -> B)
- **Líneas:** 1097 a 1207.
- **Componentes:** Card con degradado oscuro y borde celeste neón, icono 🚚, textos descriptivos y botón "SOLICITAR DELIVERY" que navega a `solicitar_envio_form`.
- **Clasificación:** 🟢 **PURE UI + NAVIGATION CALLBACK**.
- **Candidato a Extracción:** `ExpressDeliveryBanner.kt` (Paso 5E.1).

---

## 16. Categories Audit (Auditoría de Categorías)
- **Líneas:** 547 a 626.
- **Componentes:** LazyRow de chips de categorías con soporte para emojis, colores de fondo parseados y filtro activo `selectedCategoryFilter`.
- **Clasificación:** 🟡 **UI + LOCAL STATE + FILTER CALLBACK**.
- **Candidato a Extracción:** `HomeCategoriesSection.kt` (Paso 5E.2).

---

## 17. Flash Deals Audit (Auditoría de Ofertas Flash)
- **Líneas:** 975 a 1023.
- **Componentes:** `dashboardConfig.showFlashDeals` check, LazyRow de `FlashDealCard`, empty state card.
- **Clasificación:** 🟢 **PURE UI + NAVIGATION CALLBACK**.
- **Candidato a Extracción:** `FlashDealsSection.kt` (Paso 5E.3).

---

## 18. Featured Businesses Audit (Auditoría de Comercios Destacados)
- **Líneas:** 877 a 922.
- **Componentes:** `dashboardConfig.showFeaturedBusinesses` check, LazyRow de `PublicBusinessCard`, empty state card.
- **Clasificación:** 🟢 **PURE UI + FAVORITE/NAV CALLBACKS**.
- **Candidato a Extracción:** `FeaturedBusinessesSection.kt` (Paso 5E.4).

---

## 19. Branches Audit (Auditoría de Sucursales)
- Actualmente las sucursales se integran dentro del flujo de `PublicBusinessCard` y `BranchCard` en comercio detalle.
- En Home Core se presentan mediante las tarjetas de comercio.

---

## 20. Star Products Audit (Auditoría de Productos Estrella)
- **Líneas:** 924 a 973.
- **Componentes:** `dashboardConfig.showFeaturedProducts` check, LazyRow de `StarProductCard`, empty state card.
- **Clasificación:** 🟢 **PURE UI + NAVIGATION CALLBACK**.
- **Candidato a Extracción:** `StarProductsSection.kt` (Paso 5E.5).

---

## 21. Product Promotions Audit (Auditoría de Promociones y Descuentos)
- **Líneas:** 1025 a 1096.
- **Componentes:** LazyRow de `ProductPromoCard` con formateo de precios y cálculo de porcentaje de descuento, callback `onAddToCart` y `onClick`.
- **Clasificación:** 🟢 **PURE UI + CART/NAV CALLBACKS**.
- **Candidato a Extracción:** `DiscountedProductsSection.kt` (Paso 5E.5).

---

## 22. Notifications Audit (Auditoría de Diálogo de Notificaciones)
- **Líneas:** 1314 a 1362.
- **Componentes:** `AlertDialog` modal con lista scrolleable de `NotificationItem` y acción `markAsRead`.
- **Clasificación:** 🟡 **UI + LOCAL STATE + REPOSITORY CALLBACK**.
- **Candidato a Extracción:** `CustomerNotificationDialog.kt` (Paso 5E.6).

---

## 23. Search Protection (Protección del Subsistema de Búsqueda)
- `CustomerSearchOverlay.kt` y `GlobalSearchResultItemCard.kt` están formalmente certificados en `com.example.presentation.customer.search`.
- Home Core utiliza `GlobalSearchResultItemCard` en el renderizado de resultados.
- **Clasificación:** 🔐 **PROTECTED**.

---

## 24. Favorites Protection (Protección de Favoritos)
- `FavoritesScreen.kt` está formalmente certificada en `com.example.presentation.customer.favorites`.
- Home Core delega Tab 1 a `FavoritesScreen`.
- **Clasificación:** 🔐 **PROTECTED**.

---

## 25. Cart Protection (Protección de Carrito y Checkout)
- `CartCheckoutDialog.kt`, `CartItemsStepContent.kt`, `CheckoutStepContent.kt` y `CouponSection.kt` están certificados en `com.example.presentation.customer.cart`.
- Home Core delega la presentación del diálogo a `CartCheckoutDialog`.
- **Clasificación:** 🔐 **PROTECTED**.

---

## 26. Orders Protection (Protección de Pedidos)
- `OrdersHistoryScreen.kt` y `OrderDetailScreen.kt` están protegidos.
- Home Core delega Tab 3 a `OrdersHistoryScreen` y navega a `OrderDetailScreen` ante `orderPlaced`.
- **Clasificación:** 🔐 **PROTECTED**.

---

## 27. Profile Protection (Protección de Perfil)
- `ProfileScreen.kt` y subcomponentes están certificados.
- Home Core delega Tab 4 a `ProfileScreen`.
- **Clasificación:** 🔐 **PROTECTED**.

---

## 28. Navigation Audit (Auditoría de Rutas y Navegación)

| Ruta de Destino | Disparador | Argumentos | Riesgo |
| :--- | :--- | :--- | :---: |
| `Screen.LoginRegister.route` | Acciones de invitado (Guest) | Ninguno | 🟢 LOW |
| `Screen.AddressManager.route`| Clic en "Entregar en:" | Ninguno | 🟢 LOW |
| `Screen.OrderDetail.createRoute(oid)` | Creación exitosa de orden | `orderId` | 🔴 HIGH (P0) |
| `"comercio_detalle_screen/{id}"` | Clic en comercio, producto o banner | `businessId` | 🟢 LOW |
| `"solicitar_envio_form"` | Clic en Banner Delivery A -> B | Ninguno | 🟢 LOW |
| `"business_dashboard"` | Clic en Dashboard desde perfil | Ninguno | 🟢 LOW |
| `"customer_help"` | Clic en Ayuda desde perfil | Ninguno | 🟢 LOW |

---

## 29. Analytics Audit (Auditoría de Eventos Analíticos)
- `AnalyticsHelper.logAddToCart` y `AnalyticsHelper.logBeginCheckout` encapsulados en `CartManager`.
- 0 disparos descontrolados inline en Home.

---

## 30. Theme Audit (Auditoría de Material 3)
- Home Core utiliza `MaterialTheme.colorScheme` de forma consistente.
- Los degradados de Topbar (`BluePrimary`, `BlueSecondary`) y Banner A->B (`Color(0xFF0F172A)`) están justificados semánticamente como acentos de marca.

---

## 31. Responsive / Foldable Audit (Auditoría Dispositivos Plegables)
- `verticalScroll(rememberScrollState())` en Home Core y `LazyRow` con `contentPadding` horizontales aseguran fluidez en pantallas plegables (Galaxy Z Fold 5) tanto en modo cerrado como abierto.

---

## 32. Accessibility Audit (Auditoría de Accesibilidad)
- Iconos poseen `contentDescription` explicativos ("Notificaciones", "Carrito", "Buscar", "Voz", "Ubicación").

---

## 33. State Ownership Matrix (Matriz de Propiedad de Estado)

| Estado | Propietario Canónico | Consumidores | Fuente de Mutación | Candidato a Mover |
| :--- | :---: | :---: | :---: | :---: |
| **Pestaña Activa** | Host Composable | Scaffold BottomBar | Usuario / Redirección | ❌ No (Host) |
| **Búsqueda Query** | Host Composable | Header, Search Results | Usuario / Reconocimiento de Voz | ❌ No (Host) |
| **Filtro Categoría** | Host Composable | Chips Categorías, Comercios | Clic en Chip | ❌ No (Host) |
| **Diálogo Carrito** | Host Composable | FAB, TopBar, CartDialog | Clic en Carrito / Dismiss | ❌ No (Host) |
| **Diálogo Notif.** | Host Composable | TopBar, NotifDialog | Clic en Notif / Dismiss | ❌ No (Host) |
| **Perfil Usuario** | `CustomerHomeViewModel` | Header Saludo, ProfileTab | Firestore `/users/{uid}` | ❌ No |
| **Direcciones** | `CustomerHomeViewModel` | Header Address, CartDialog | Firestore `/addresses` | ❌ No |

---

## 34. Dependency Matrix (Matriz de Dependencias de Componentes)

| Componente Candidato | ViewModel | Repository | Firebase | CartManager | Navigation | Analytics | Riesgo |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `HomeHeader` | ❌ (Parámetros) | ❌ | ❌ | ❌ | ❌ (Callback)| ❌ | 🟢 LOW |
| `HomeCategoriesSection` | ❌ (Parámetros) | ❌ | ❌ | ❌ | ❌ (Callback)| ❌ | 🟢 LOW |
| `FeaturedBusinessesSection` | ❌ (Parámetros) | ❌ | ❌ | ❌ | ❌ (Callback)| ❌ | 🟢 LOW |
| `StarProductsSection` | ❌ (Parámetros) | ❌ | ❌ | ❌ | ❌ (Callback)| ❌ | 🟢 LOW |
| `FlashDealsSection` | ❌ (Parámetros) | ❌ | ❌ | ❌ | ❌ (Callback)| ❌ | 🟢 LOW |
| `DiscountedProductsSection` | ❌ (Parámetros) | ❌ | ❌ | ❌ | ❌ (Callback)| ❌ | 🟢 LOW |
| `ExpressDeliveryBanner` | ❌ (Parámetros) | ❌ | ❌ | ❌ | ❌ (Callback)| ❌ | 🟢 LOW |
| `CustomerNotificationDialog`| ❌ (Parámetros) | ❌ | ❌ | ❌ | ❌ (Callback)| ❌ | 🟢 LOW |

---

## 35. Extraction Candidate Matrix (Matriz de Candidatos de Extracción)

| Candidato | Tipo | Líneas Aprox. | Dependencias | Efectos Colaterales | Riesgo | Recomendación |
| :--- | :---: | :---: | :--- | :--- | :---: | :--- |
| `HomeHeader.kt` | 🟠 UI + State | 210 | Avatar, Greeting, Search | Speech Launcher | 🟡 MEDIUM | 🟢 Extraer con callbacks (5E.1) |
| `ExpressDeliveryBanner.kt` | 🟢 Pure UI | 110 | Estilos degradados | Ninguno | 🟢 LOW | 🟢 Extraer de inmediato (5E.1) |
| `HomeCategoriesSection.kt` | 🟡 UI + State | 80 | Chips, Categorías | Filtro activo | 🟢 LOW | 🟢 Extraer con callbacks (5E.2) |
| `FlashDealsSection.kt` | 🟢 Pure UI | 50 | `FlashDealCard` | Navegación | 🟢 LOW | 🟢 Extraer de inmediato (5E.3) |
| `FeaturedBusinessesSection.kt`| 🟢 Pure UI | 45 | `PublicBusinessCard` | Navegación | 🟢 LOW | 🟢 Extraer de inmediato (5E.4) |
| `StarProductsSection.kt` | 🟢 Pure UI | 50 | `StarProductCard` | Navegación | 🟢 LOW | 🟢 Extraer de inmediato (5E.5) |
| `DiscountedProductsSection.kt`| 🟢 Pure UI | 70 | `ProductPromoCard` | AddToCart / Nav | 🟢 LOW | 🟢 Extraer con callbacks (5E.5) |
| `CustomerNotificationDialog.kt`| 🟡 UI + State | 50 | `NotificationItem` | Mark as read | 🟢 LOW | 🟢 Extraer con callbacks (5E.6) |

---

## 36. Shared Component Analysis (Análisis de Componentes Compartidos)
- Todos los candidatos consumen las tarjetas certificadas en `com.example.presentation.customer.components.*` (`CategoryCard`, `StarProductCard`, `FlashDealCard`, `BranchCard`, `ProductPromoCard`, `PublicBusinessCard`, `NotificationItem`).
- No existe duplicación de tarjetas en el código auditado.

---

## 37. Business Logic in UI (Lógica de Negocio en la UI)
- **Cálculo de descuento porcentual:** Línea 1066 calcula `(((prod.originalPrice - prod.price) / prod.originalPrice) * 100).toInt()`. Es puramente de formato visual.
- **Normalización de acentos para filtrado:** Líneas 186–205 normalizan strings para búsqueda local en memoria. Debe preservarse intacto.

---

## 38. Real-Time Data Audit (Auditoría de Datos en Tiempo Real)
- Los listeners de `CategoryRepository`, `NotificationRepository` y `FirebaseManager` se inicializan en `LaunchedEffect(isGuest, context)`.
- Su ciclo de vida está gobernado por el Host Composable y se cancela automáticamente al salir de la pantalla.

---

## 39. Loading / Error / Empty Matrix (Matriz de Estados)

| Sección | Loading State | Empty State | Error State |
| :--- | :--- | :--- | :--- |
| **Categorías** | Fallback a categorías de comercio | Muestra fallback estático | Fallback silencioso |
| **Búsqueda Global** | Indicado por Flow reactivo | Card con icono `SearchOff` y sugerencias | Mensaje contextual |
| **Comercios** | Skeleton / Flow | "No hay comercios disponibles" | Empty card |
| **Productos Estrella** | Flow reactivo | "No hay productos estrella configurados" | Empty card |
| **Ofertas Flash** | Flow reactivo | "No hay ofertas flash activas" | Empty card |
| **Descuentos** | Flow reactivo | "No hay productos con descuentos configurados"| Empty card |

---

## 40. Guest Mode Audit (Auditoría de Modo Invitado)
- Si `isGuest == true`:
  - Clic en Notificaciones: Abre diálogo vacío.
  - Clic en Carrito: Redirige a `Screen.LoginRegister.route`.
  - Clic en Dirección: Redirige a `Screen.LoginRegister.route`.
  - Tabs 3 (Pedidos) y 4 (Perfil): Redirigen a `Screen.LoginRegister.route`.

---

## 41. Authenticated Mode Audit (Auditoría de Modo Autenticado)
- Si `isGuest == false`:
  - Se activa `notificationRepo.startListening(uid)`.
  - Se cargan direcciones desde `/users/{uid}/addresses`.
  - Acceso completo a Carrito, Checkout y Perfil.

---

## 42. Refresh / Resume Audit (Auditoría de Pull-To-Refresh)
- `PullToRefreshBox` envuelve todo el contenido de Tab 0.
- Al ejecutar gesto de refresco, dispara `viewModel.refresh()`, actualizando catálogos y comercios.

---

## 43. Scroll Architecture (Arquitectura de Desplazamiento)
- Desplazamiento vertical global: `verticalScroll(rememberScrollState())` en la columna principal.
- Desplazamiento horizontal interno: Múltiples `LazyRow` independientes con `contentPadding`.
- Estructura no anida `LazyColumn` dentro de `verticalScroll`, garantizando 0 colisiones de scroll.

---

## 44. Performance Findings (Hallazgos de Rendimiento)
- Todas las listas horizontales usan `items()` dentro de `LazyRow`, reutilizando vistas de Compose de forma óptima.
- Los filtros pesados están protegidos por `remember(sortedPublicBusinesses, searchQueryText, selectedCategoryFilter)`.

---

## 45. Image / Media Dependencies (Dependencias de Imágenes)
- Carga de imágenes delegada a `AsyncImage` (Coil) dentro de los componentes certificados (`PublicBusinessCard`, `StarProductCard`, `ProductPromoCard`, etc.).

---

## 46. Web / Admin Dependencies (Dependencias con Web y Admin)
- La configuración de secciones (`dashboardConfig`) es administrada desde el panel web de administración (`panel-admin`).

---

## 47. Cloud Functions Dependencies (Dependencias con Cloud Functions)
- 0 dependencias directas en la capa visual de Home.

---

## 48. Security Rules Dependencies (Dependencias con Reglas de Seguridad)
- Las lecturas de `/businesses`, `/categories`, `/banners` son públicas (`allow read: if true;`).
- Las lecturas de `/users/{uid}/*` requieren autenticación (`request.auth.uid == uid`).

---

## 49. Target Architecture (Arquitectura Futura Propuesta)
```
com.example.presentation.customer/
│
├── CustomerHomeScreen.kt (Host Orchestrator ≈ 350 líneas)
│
├── components/ (7 Shared Components Certificados)
│   ├── CategoryCard.kt
│   ├── StarProductCard.kt
│   ├── FlashDealCard.kt
│   ├── BranchCard.kt
│   ├── ProductPromoCard.kt
│   ├── PublicBusinessCard.kt
│   └── NotificationItem.kt
│
├── search/ (Certified Search Subsystem)
│   ├── CustomerSearchOverlay.kt
│   └── GlobalSearchResultItemCard.kt
│
├── favorites/ (Certified Favorites Subsystem)
│   └── FavoritesScreen.kt
│
├── cart/ (Certified Cart & Checkout Subsystem)
│   ├── CartCheckoutDialog.kt
│   ├── CartItemsStepContent.kt
│   ├── CheckoutStepContent.kt
│   └── CouponSection.kt
│
└── home/ (NUEVO SUBPAQUETE HOME CORE FASE 5E)
    ├── HomeHeader.kt
    ├── ExpressDeliveryBanner.kt
    ├── HomeCategoriesSection.kt
    ├── FlashDealsSection.kt
    ├── FeaturedBusinessesSection.kt
    ├── StarProductsSection.kt
    ├── DiscountedProductsSection.kt
    └── CustomerNotificationDialog.kt
```

---

## 50. Responsibility Boundary (Límites de Responsabilidad)
- **Host (`CustomerHomeScreen.kt`):** Orquestación de navegación, Scaffold, BottomNavigationBar, recolección de ViewModels, lanzamiento de Launchers y diálogo de carrito.
- **Secciones de Home (`home/*`):** Componentes visuales desacoplados que reciben datos inmutables y emiten eventos a través de callbacks.

---

## 51. Extraction Roadmap (Hoja de Ruta para Fase 5E)
1. **Fase 5E.1:** Extracción de `HomeHeader.kt` y `ExpressDeliveryBanner.kt`.
2. **Fase 5E.2:** Extracción de `HomeCategoriesSection.kt`.
3. **Fase 5E.3:** Extracción de `FlashDealsSection.kt`.
4. **Fase 5E.4:** Extracción de `FeaturedBusinessesSection.kt`.
5. **Fase 5E.5:** Extracción de `StarProductsSection.kt` y `DiscountedProductsSection.kt`.
6. **Fase 5E.6:** Extracción de `CustomerNotificationDialog.kt`.
7. **Fase 5E.7:** Ensamblaje final de `CustomerHomeScreen.kt` y certificación global E2E.

---

## 52. Risk Matrix (Matriz de Riesgo)

| Componente | Riesgo | Mitigación |
| :--- | :---: | :--- |
| `HomeHeader` | 🟡 MEDIUM | Encapsular launcher de voz y emitir callbacks puros de búsqueda y clicks |
| `ExpressDeliveryBanner` | 🟢 LOW | Componente sin estado local; navegación pura |
| `HomeCategoriesSection` | 🟢 LOW | Recibir lista procesada y emitir callback de selección |
| `FlashDealsSection` | 🟢 LOW | Renderizado puro de items |
| `FeaturedBusinessesSection`| 🟢 LOW | Renderizado puro con callbacks de favoritos |
| `StarProductsSection` | 🟢 LOW | Renderizado puro de items |
| `DiscountedProductsSection`| 🟢 LOW | Callbacks directos para `onAddToCart` |
| `CustomerNotificationDialog`| 🟢 LOW | Diálogo modal desacoplado con callback `onMarkAsRead` |

---

## 53. Blast Radius (Radio de Impacto Estimado)
- **Nivel Global Estimado para Fase 5E:** 🟢 **BAJO / MODERADO** (Acotado estrictamente a la presentación interna de `CustomerHomeScreen.kt`, sin afectar ViewModels, Repositorios, Firebase ni la frontera transaccional).

---

## 54. Rollback Strategy (Estrategia de Reversión)
- Cada subfase (5E.1 a 5E.6) creará archivos atómicos en `com.example.presentation.customer.home`.
- En caso de fallo o regresión en cualquiera de los gates, se revertirá exclusivamente el archivo de la subfase activa sin afectar los baselines previos.

---

## 55. Protected Baselines (Líneas Base Protegidas Inmutables)
- `CartManager.kt`
- `CustomerHomeViewModel.kt`
- `EnterpriseSearchEngine.kt`
- `FavoritesScreen.kt`
- `ProfileScreen.kt`
- `OrdersHistoryScreen.kt` / `OrderDetailScreen.kt`
- `CartCheckoutDialog.kt` y subcomponentes en `cart/`
- `components/` (7 Shared Components)
- `firestore.rules` y Cloud Functions

---

## 56. Unexpected Changes (Cambios Inesperados)
- **0 cambios no autorizados detectados durante la auditoría.**

---

## 57. Zero Mutation Verification (Verificación de Cero Mutación)
- Durante la ejecución de la Fase 5E.0:
  - 0 líneas modificadas en código fuente.
  - 0 archivos creados en `app/`.

---

## 58. Recommended Phase 5E.1 (Recomendación para Fase 5E.1)
Proceder a la **FASE 5E.1 — HOME HEADER & DELIVERY BANNER EXTRACTION** mediante la creación del paquete `com.example.presentation.customer.home` y la extracción de:
1. `HomeHeader.kt`
2. `ExpressDeliveryBanner.kt`

---

## 59. Certification Status (Estado de Certificación de Descubrimiento)

| Criterio Forense | Estado | Observaciones |
| :--- | :---: | :--- |
| **CustomerHomeScreen Audited** | 🟢 **PASS** | 1,365 líneas mapeadas en su totalidad |
| **Home Core Sections Mapped** | 🟢 **PASS** | 10 secciones identificadas y clasificadas |
| **State Ownership Mapped** | 🟢 **PASS** | Todos los mutableStateOf y StateFlows asignados |
| **Protected Baselines Verified** | 🟢 **PASS** | Search, Favorites, Cart/Checkout, Profile protegidos |
| **Zero Code Mutation Verified** | 🟢 **PASS** | 0 archivos modificados o creados en código fuente |
| **Extraction Roadmap Defined** | 🟢 **PASS** | Subfases 5E.1 a 5E.7 planificadas secuencialmente |

---

# 🏆 ESTADO FINAL OFICIAL
# 🟢 FORENSIC DISCOVERY COMPLETE (FASE 5E.0 CUMPLIDA AL 100%)

---

### ⏸️ HUMAN APPROVAL GATE
En cumplimiento de la Sección 75 del protocolo, la ejecución se detiene aquí.
**Se requiere la autorización expresa del usuario antes de proceder a la FASE 5E.1 (Home Header & Delivery Banner Extraction).**
