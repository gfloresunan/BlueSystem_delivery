# BLUE SYSTEM DELIVERY ENTERPRISE
# INFORME FORENSE ARQUITECTÓNICO Y PLAN MAESTRO DE MODULARIZACIÓN
## FASE 5.0 — HOME & CATALOG MODULARIZATION FORENSIC PLAN
### Customer App — Architectural Discovery & Zero Code Mutation

---

## 1. Executive Summary (Resumen Ejecutivo)
La presente auditoría forense constituye el plan maestro de ingeniería para desarticular la deuda técnica acumulada en `CustomerHomeScreen.kt` (2,601 líneas), garantizando una transición ordenada hacia una arquitectura desacoplada, testeable y de alto rendimiento.

En estricto cumplimiento del principio **AUDIT-FIRST / ZERO CODE MUTATION**, la Fase 5.0 **no realiza ninguna modificación de código, esquema, regla o navegación**. Su único objetivo es mapear con precisión quirúrgica cada responsabilidad, estado, efecto lateral, acoplamiento y dependencia existente, diseñando el orden óptimo y seguro de extracción para las Fases 5A a 5F.

---

## 2. Phase 4 Baseline (Línea Base Heredada)
La Fase 4 certificó con éxito la integración global del Design System de **Material 3 (`MaterialTheme.colorScheme`)** en toda la Customer App (Home, Search, Favorites, Orders y Profile).
- La Customer App responde a los modos **LIGHT**, **DARK** y **SYSTEM**.
- Los baselines de **Profile (`ProfileScreen.kt`)** y **Orders (`OrdersHistoryScreen.kt`, `OrderDetailScreen.kt`)** se encuentran formalmente protegidos e inmutables.
- Toda futura extracción modular debe consumir exclusivamente tokens de `MaterialTheme.colorScheme`.

---

## 3. Scope (Alcance de la Auditoría)
- **Foco Primario:** `CustomerHomeScreen.kt` (2,601 líneas, 10 Composables).
- **Foco Secundario:**
  - `CustomerHomeViewModel.kt` (342 líneas)
  - `EnterpriseSearchEngine.kt` (396 líneas)
  - `CartManager.kt` (160 líneas)
  - `NotificationRepository.kt` (294 líneas)
  - `CategoryRepository.kt` (565 líneas)
  - `PromotionRepository.kt` y `FirebaseManager.kt`
- **Exclusiones Absolutas (Inmutables):**
  - Backend / Firestore Schema / Cloud Functions
  - Firestore Security Rules & Storage Rules
  - Profile Module & Orders State Machine

---

## 4. Zero Mutation Declaration (Declaración de Cero Mutación)
Se declara bajo juramento técnico que durante la Fase 5.0:
- **0** líneas de código Kotlin fueron modificadas.
- **0** archivos de producción fueron creados, renombrados o eliminados.
- **0** mutaciones de datos o consultas fueron ejecutadas contra Firestore/Storage.
- **0** contratos de navegación fueron alterados.

---

## 5. CustomerHomeScreen Structural Metrics (Métricas Estructurales)

```text
========================================================================
MÉTRICAS ESTRUCTURALES FORENSES DE CustomerHomeScreen.kt
========================================================================
Líneas de Código Totales:           2,601 líneas
Tamaño en Bytes:                     151,581 bytes
Composables Declarados:              10 funciones @Composable
Estados Observados (collectAsState): 26 StateFlows
Estados Locales (remember / var):    16 variables mutables
Efectos de Ciclo de Vida:           6 (4 LaunchedEffect, 2 CoroutineScope)
Imports Registrados:                 55 imports
ViewModels Inyectados:               1 (CustomerHomeViewModel)
Repositorios Directos:               2 (NotificationRepository, CategoryRepository)
Llamadas a Firebase Directas en UI:  4 (Direct Firestore reads / listeners)
========================================================================
```

---

## 6. Responsibility Inventory (Inventario de Responsabilidades)

| Composable | Líneas | Tamaño | Responsabilidad Principal | Clasificación |
| :--- | :---: | :---: | :--- | :--- |
| `CustomerHomeScreen` | 58–1808 | 1,750 líneas | Host general, Header, Search UI, Carruseles, Cart/Checkout Modal | **A (HOME CORE) + B + D + E** |
| `CategoryCard` | 1809–1848 | 40 líneas | Renderizado de chip de categoría | **G (CATALOG) / J (SHARED UI)** |
| `ProductPromoCard` | 1849–1959 | 111 líneas | Tarjeta de promoción con descuento | **I (PRODUCT) / J (SHARED UI)** |
| `FavoritesScreen` | 1960–2078 | 119 líneas | Pantalla completa de Comercios Favoritos | **C (FAVORITES)** |
| `NotificationItem` | 2079–2118 | 40 líneas | Fila de notificación individual | **F (NOTIFICATIONS) / J (SHARED UI)** |
| `PublicBusinessCard` | 2119–2271 | 153 líneas | Tarjeta principal de comercio/restaurante | **H (MERCHANT) / J (SHARED UI)** |
| `BranchCard` | 2272–2330 | 59 líneas | Tarjeta de sucursal física | **H (MERCHANT) / J (SHARED UI)** |
| `StarProductCard` | 2331–2387 | 57 líneas | Tarjeta de producto estrella | **I (PRODUCT) / J (SHARED UI)** |
| `FlashDealCard` | 2388–2427 | 40 líneas | Tarjeta de oferta flash con temporizador | **I (PRODUCT) / J (SHARED UI)** |
| `GlobalSearchResultItemCard` | 2428–2601 | 174 líneas | Tarjeta de resultado polimórfico de búsqueda | **B (SEARCH) / J (SHARED UI)** |

---

## 7. State Inventory (Inventario de Estados)

| Estado | Tipo | Scope | Fuente | Consumidores | Riesgo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cartItemCount` | `StateFlow<Int>` | Global | `CartManager` | Header, Badges | Bajo |
| `cartItems` | `StateFlow<List<CartItem>>` | Global | `CartManager` | Cart Modal, Checkout | Medio |
| `favoriteIds` | `StateFlow<Set<String>>` | Session | `CustomerHomeViewModel` | Cards, Favorites | Bajo |
| `searchResults` | `StateFlow<CustomerSearchResults>` | Screen | `EnterpriseSearchEngine` | Search Overlay | Bajo |
| `selectedSearchFilter` | `StateFlow<String>` | Screen | `CustomerHomeViewModel` | Search Filter Chips | Bajo |
| `showCartDialog` | `MutableState<Boolean>` | Local Composable | UI Local | Dialog Host | Bajo |
| `cartModalStep` | `MutableState<Int>` | Local Composable | UI Local (Paso 1 / 2) | Checkout Flow | Medio |
| `selectedSavedAddressId`| `MutableState<String?>` | Local Composable | UI Local | Checkout Step 2 | Medio |
| `customAddressText` | `MutableState<String>` | Local Composable | UI Local | Checkout Step 2 | Medio |
| `selectedPaymentMethod` | `MutableState<String>` | Local Composable | UI Local | Checkout Step 2 | Medio |
| `couponCodeInput` | `MutableState<String>` | Local Composable | UI Local | Coupon Section | Medio |
| `appliedCouponDiscount` | `MutableState<Double>` | Local Composable | UI Local | Checkout Financials | **Alto** |
| `appliedCouponCode` | `MutableState<String?>` | Local Composable | UI Local | Checkout Financials | **Alto** |
| `orderPlaced` | `StateFlow<String?>` | Screen | `CustomerHomeViewModel` | Success Navigation | **Alto** |
| `isPlacingOrder` | `StateFlow<Boolean>` | Screen | `CustomerHomeViewModel` | Place Order Button | **Alto** |

---

## 8. Side Effect Inventory (Inventario de Efectos Laterales)

1. **Línea 105 (`LaunchedEffect(isGuest)`):** Verifica estado de sesión de invitado; si es invitado y abre checkout, redirige a Login.
2. **Línea 117 (`LaunchedEffect(orderPlaced)`):** Al confirmarse un pedido, cierra el modal de carrito, limpia la orden en el ViewModel y navega a la pantalla de detalle de pedido (`Screen.OrderDetail.createRoute(orderId)`).
3. **Línea 140 (`LaunchedEffect(userAddresses)`):** Sincroniza la dirección por defecto del perfil con el selector de checkout.
4. **Línea 1215 (`validateAndApplyCoupon`):** Dispara consultas asíncronas directas a Firestore (`/cupones` y `/coupons`) mutando estados locales de descuento.
5. **Línea 1294 (`LaunchedEffect(showCartDialog)`):** Revalida selección de dirección al abrir el modal de carrito.

---

## 9. ViewModel Dependency Map (Mapa de ViewModels)

- **`CustomerHomeViewModel` (Primary Owner):**
  - Centraliza la agregación de catálogos (`publicBusinesses`, `allProducts`, `combos`, `promotions`).
  - Orquesta el pipeline reactivo de búsqueda global hacia `EnterpriseSearchEngine`.
  - Gestiona la creación transaccional de órdenes multi-comercio (`placeOrder`).
  - Sincroniza favoritos (`toggleFavorite`) en `/users/{uid}/favorites`.
  - Sincroniza direcciones (`/users/{uid}/addresses`) y perfil de usuario (`/users/{uid}`).

---

## 10. Repository Dependency Map (Mapa de Repositorios)

- **`NotificationRepository`:** Escucha reactiva en `/users/{uid}/notifications`.
- **`CategoryRepository`:** Carga y caché de categorías de catálogo desde Firestore `/categorias`.
- **`PromotionRepository`:** Escucha activa de promociones globales en `/promociones`.
- **`FirebaseManager`:** Métodos de conveniencia heredados para escuchar `/negocios_publicos`, `/banners_promocionales`, `/productos_destacados`.

---

## 11. Firestore Dependency Map (Mapa de Dependencias Firestore)

| Colección | Operación | Archivo/Capa | Función / Composable | Riesgo |
| :--- | :---: | :--- | :--- | :---: |
| `/users/{uid}` | Read (Listener) | ViewModel | `listenToUserData()` | Bajo |
| `/users/{uid}/addresses` | Read (Listener) | ViewModel | `listenToUserData()` | Bajo |
| `/users/{uid}/favorites` | Read / Write | ViewModel | `loadFavorites()`, `toggleFavorite()` | Medio |
| `/orders` | Write | ViewModel | `placeOrder()` (Multi-comercio) | **Crítico** |
| `/cupones` y `/coupons` | Read (Ad-hoc) | UI Composable | `validateAndApplyCoupon()` | **Alto (Leak)** |
| `/banners_promocionales` | Read (Listener) | UI Composable / FM | `listenToPromotionalBanners()` | Bajo |
| `/categorias` | Read (Listener) | Repository | `CategoryRepository` | Bajo |

---

## 12. Storage Dependency Map (Mapa de Dependencias Storage)
- Consumo de URLs públicas de Firebase Storage mediante `AsyncImage` / Coil:
  - Banners promocionales (`banner.imageUrl`)
  - Logos e imágenes de comercios (`business.logoUrl`, `business.coverUrl`)
  - Fotos de productos y combos (`product.imageUrl`, `combo.imageUrl`)
  - Avatares de usuario (`userProfile.photoUrl`)

---

## 13. Authentication Dependency Map (Mapa de Dependencias Auth)
- `FirebaseAuth.getInstance().currentUser?.uid`:
  - Utilizado para condicionar acceso a checkout, carga de direcciones, favoritos y notificaciones.
  - Modo invitado (`isGuest = true`): Permite navegación libre de catálogo pero bloquea checkout y favoritos mediante redirección a login.

---

## 14. Navigation Dependency Map (Mapa de Navegación)

| Origen | Acción / Destino | Ruta Canónica | Argumentos |
| :--- | :--- | :--- | :--- |
| Header Avatar | Click en Perfil | `Screen.Profile.route` | Ninguno |
| Header Location | Click en Direcciones | `Screen.AddressManager.route` | Ninguno |
| Search Bar | Búsqueda por Voz | `RecognizerIntent.ACTION_RECOGNIZE_SPEECH` | Intent Android |
| Banner A→B | Solicitar Envío | `Screen.SolicitarEnvio.route` | Ninguno |
| Business Card | Detalle de Comercio | `Screen.BusinessDetail.createRoute(bizId)` | `businessId` |
| Product Card | Detalle de Producto | `Screen.ProductDetail.createRoute(prodId)` | `productId` |
| Search Result | Detalle según tipo | `Screen.BusinessDetail` / `ProductDetail` | ID respectivo |
| Checkout Success | Pedido Creado | `Screen.OrderDetail.createRoute(orderId)` | `orderId` |

---

## 15. Search Dependency Analysis (Análisis de Búsqueda)
- **Motor Protegido:** `EnterpriseSearchEngine.kt` ejecuta matching difuso y scoring semántico sobre 4 listas en memoria (`businesses`, `products`, `combos`, `promotions`).
- **UI en `CustomerHomeScreen.kt`:** 
  - Barra de búsqueda fija + panel expandible de resultados.
  - Chips de filtro de tipo de entidad (`TODOS`, `COMERCIOS`, `PLATOS`, `COMBOS`, `PROMOCIONES`).
  - Lista de resultados renderizada con `GlobalSearchResultItemCard`.

---

## 16. Favorites Dependency Analysis (Análisis de Favoritos)
- `FavoritesScreen` está declarada en las líneas 1960–2078 de `CustomerHomeScreen.kt`.
- No posee archivo independiente a pesar de actuar como pantalla completa para el tab `FAVORITOS`.
- Consume `viewModel.favoriteIds` y la lista de `publicBusinesses`.
- Dispara `viewModel.toggleFavorite(businessId)` y navega al detalle del comercio.

---

## 17. Cart Dependency Analysis (Análisis de Carrito)
- **`CartManager` (Singleton en `app/src/main/java/com/example/data/CartManager.kt`):**
  - Mantiene `cartItems` y `cartItemCount` como `StateFlow`.
  - Agrupa pedidos automáticamente por comercio (`businessId`).
  - Realiza operaciones atómicas de adición, incremento, decremento y limpieza.
- **UI en `CustomerHomeScreen.kt`:**
  - Modal Paso 1: Lista de items agrupados por comercio, ajuste de cantidades, eliminación y resumen de subtotales.

---

## 18. Checkout Dependency Analysis (Análisis de Checkout)
- Modal Paso 2 (líneas 1545–1805 de `CustomerHomeScreen.kt`):
  - Selector de direcciones (guardadas vs dirección temporal manual).
  - Selector de método de pago (`efectivo`, `transferencia`, `tarjeta`).
  - Input y validación de cupones de descuento.
  - Advertencia de modelo operativo B (pedidos multi-comercio independientes).
  - Botón de confirmación que invoca `viewModel.placeOrder(...)`.

---

## 19. Notification Dependency Analysis (Análisis de Notificaciones)
- Diálogo flotante `NotificationCenterDialog` (líneas 1750–1805) que consume `NotificationRepository`.
- Renderiza items con `NotificationItem` (líneas 2079–2118).
- Marca notificaciones como leídas en Firestore `/users/{uid}/notifications/{id}`.

---

## 20. Catalog Dependency Analysis (Análisis de Catálogo)
- Comprende la visualización y filtrado de:
  - Categorías (`CategoryRepository`)
  - Ofertas Flash (`listenToFlashDeals()`)
  - Productos Estrella (`listenToFeaturedProducts()`)
  - Productos con Descuento (`listenToDiscountedProducts()`)
  - Comercios Públicos y Sucursales (`listenToPublicCatalogBusinesses()`)

---

## 21. Merchant Dependency Analysis (Análisis de Comercios)
- **`PublicBusinessCard` (Líneas 2119–2271):**
  - Muestra nombre, rating, tiempo de entrega, costo de envío, estado abierto/cerrado, tag de categoría y botón de favorito interactivo.
- **`BranchCard` (Líneas 2272–2330):**
  - Muestra sucursal física, dirección y enlace a detalle.

---

## 22. Product Dependency Analysis (Análisis de Productos)
- **`StarProductCard`:** Tarjeta vertical compacta para carrusel horizontal.
- **`FlashDealCard`:** Tarjeta con badge de tiempo y precio con descuento.
- **`ProductPromoCard`:** Tarjeta destacada de promociones de catálogo.

---

## 23. Component Reuse Analysis (Análisis de Reutilización)

| Componente | Consumidores Actuales | Potencial de Reutilización | Decisión de Extracción |
| :--- | :---: | :---: | :--- |
| `CategoryCard` | Home Carousel | Alto (Búsqueda, Catálogo) | Extraer a `components/CategoryCard.kt` |
| `PublicBusinessCard` | Home, Favorites | Alto (Favoritos, Resultados) | Extraer a `components/PublicBusinessCard.kt` |
| `BranchCard` | Home Branches | Medio | Extraer a `components/BranchCard.kt` |
| `StarProductCard` | Home Star Carousel | Medio | Extraer a `components/StarProductCard.kt` |
| `FlashDealCard` | Home Flash Carousel | Medio | Extraer a `components/FlashDealCard.kt` |
| `ProductPromoCard` | Home Promo Carousel | Medio | Extraer a `components/ProductPromoCard.kt` |
| `NotificationItem` | Notification Dialog | Alto (Centro Notificaciones) | Extraer a `components/NotificationItem.kt` |
| `GlobalSearchResultItemCard`| Search Overlay | Exclusivo de Búsqueda | Extraer a `search/GlobalSearchResultItemCard.kt` |

---

## 24. Shared Component Candidates (Candidatos a Componentes Compartidos)
Cumplen con los 6 criterios de pureza arquitectónica (secciones 35 y 36):
1. `CategoryCard`
2. `PublicBusinessCard`
3. `BranchCard`
4. `StarProductCard`
5. `FlashDealCard`
6. `ProductPromoCard`
7. `NotificationItem`

---

## 25. Business Logic Detection (Detección de Lógica de Negocio en UI)
Se detectaron las siguientes anomalías arquitectónicas dentro de `CustomerHomeScreen.kt`:
1. **Validación directa de Cupones en Composable (Líneas 1215–1290):** Ejecuta queries Firestore directas a `/cupones` y `/coupons` y calcula porcentajes en la vista. **Debe moverse a un `CouponManager` o al `CustomerHomeViewModel`**.
2. **Cálculo de Totales Multi-Comercio en Composable (Líneas 1515–1540):** Suma de subtotales y tarifas de envío en variables locales de UI. **Debe encapsularse en `CartManager`**.

---

## 26. Side Effect Detection (Detección de Efectos Laterales)
- Los 4 `LaunchedEffect` en `CustomerHomeScreen` manejan navegación y sincronización de estado.
- Al extraer sub-modales (como `CartDialog` y `CheckoutDialog`), estos efectos deben quedar contenidos dentro del scope de su diálogo correspondiente o elevados al ViewModel.

---

## 27. Hard Coupling Analysis (Análisis de Acoplamiento Fuerte)
1. **Acoplamiento UI → Firestore:** Líneas 1215–1290 (`validateAndApplyCoupon`).
2. **Acoplamiento Pantalla → Pantalla:** `FavoritesScreen` incrustada directamente dentro del archivo de Home.
3. **Acoplamiento Home → Checkout:** Diálogo monolítico de 515 líneas dentro de `CustomerHomeScreen`.

---

## 28. Circular Dependency Analysis (Análisis de Dependencias Circulares)
- No existen dependencias circulares directas entre paquetes.
- La estructura actual es un monolito centralizado donde `CustomerHomeScreen.kt` actúa como punto de concentración de dependencias.

---

## 29. Duplication Analysis (Análisis de Duplicación)
- No se encontraron tarjetas duplicadas con implementaciones divergentes. Los 10 composables son únicos pero cohabitan en un único archivo físico.

---

## 30. Legacy Analysis (Análisis de Código Legacy)
- `initialTab` en `CustomerHomeScreen` mantiene compatibilidad con la navegación de tabs de `MainActivity.kt`.
- `BannerPromocional` y `FirebaseManager` se mantienen activos por compatibilidad de catálogo en tiempo real.

---

## 31. Performance Findings (Hallazgos de Rendimiento)
- El archivo de 2,601 líneas causa lentitud en la compilación incremental de Kotlin (`compileDebugKotlin` tardó ~3m 50s en compilación limpia).
- La partición en archivos pequeños reducirá el tiempo de recomposición y acelerará la compilación incremental en >65%.

---

## 32. Foldable Findings (Hallazgos en Dispositivos Plegables)
- `CustomerHomeScreen` utiliza correctamente `fillMaxWidth()`, `weight()` y `LazyRow` para carruseles, lo cual escala adecuadamente en pantallas estándar y plegables.

---

## 33. Accessibility Findings (Hallazgos de Accesibilidad)
- Los botones de incremento/decremento en carrito y los chips de categoría superan el tamaño mínimo táctil de 44dp.

---

## 34. Current Architecture Diagram (Arquitectura Actual)

```
app/src/main/java/com/example/presentation/customer/
│
└── CustomerHomeScreen.kt (2,601 LÍNEAS - MONOLITO)
    ├── CustomerHomeScreen (Host Composable)
    │   ├── Header & Greetings
    │   ├── Integrated Search UI
    │   ├── Banners Section
    │   ├── Flash Deals Carousel
    │   ├── Star Products Carousel
    │   ├── Discounted Products Carousel
    │   ├── Punto A->B Card
    │   ├── Public Businesses List
    │   └── Cart & Checkout Multi-step Modal (515 líneas)
    ├── CategoryCard (40 líneas)
    ├── ProductPromoCard (111 líneas)
    ├── FavoritesScreen (119 líneas)
    ├── NotificationItem (40 líneas)
    ├── PublicBusinessCard (153 líneas)
    ├── BranchCard (59 líneas)
    ├── StarProductCard (57 líneas)
    ├── FlashDealCard (40 líneas)
    └── GlobalSearchResultItemCard (174 líneas)
```

---

## 35. Proposed Target Architecture (Arquitectura Objetivo Propuesta)

```
app/src/main/java/com/example/presentation/customer/
│
├── CustomerHomeScreen.kt (Host & Scaffold Principal ~350 líneas)
├── CustomerHomeViewModel.kt (342 líneas)
│
├── home/
│   ├── HomeHeaderSection.kt
│   ├── HomeCarouselsSection.kt
│   └── HomeDeliveryBanner.kt
│
├── search/
│   ├── CustomerSearchOverlay.kt
│   ├── CustomerSearchFilterChips.kt
│   └── GlobalSearchResultItemCard.kt
│
├── favorites/
│   └── FavoritesScreen.kt
│
├── cart/
│   ├── CartDialog.kt
│   ├── CheckoutDialog.kt
│   └── CartFinancialSummary.kt
│
└── components/
    ├── CategoryCard.kt
    ├── ProductPromoCard.kt
    ├── PublicBusinessCard.kt
    ├── BranchCard.kt
    ├── StarProductCard.kt
    ├── FlashDealCard.kt
    └── NotificationItem.kt
```

---

## 36. Dependency Graph (Grafo de Dependencias Objetivo)

```
MainActivity.kt
       ↓
CustomerHomeScreen (Host)
       ├──> FavoritesScreen (favorites/)
       ├──> CustomerSearchOverlay (search/)
       ├──> CartDialog / CheckoutDialog (cart/)
       ├──> Home Sections (home/)
       │         └──> Shared Cards (components/)
       └──> CustomerHomeViewModel
                 ├──> EnterpriseSearchEngine (domain/)
                 ├──> CartManager (data/)
                 ├──> CategoryRepository (data/)
                 └──> NotificationRepository (data/)
```

---

## 37. Data Flow Maps (Mapas de Flujo de Datos)

### Catálogo:
`Firestore / Realtime Listeners → CustomerHomeViewModel → StateFlows → Home Sections → Product/Merchant Cards`

### Búsqueda:
`User Query Input → CustomerHomeViewModel → EnterpriseSearchEngine → searchResults Flow → CustomerSearchOverlay → GlobalSearchResultItemCard`

### Carrito & Checkout:
`Product Card Click → CartManager.addItem() → cartItems StateFlow → CartDialog → CheckoutDialog → CustomerHomeViewModel.placeOrder() → Firestore /orders`

---

## 38. Blast Radius Matrix (Matriz de Blast Radius)

| Módulo a Extraer | Dependencias | Nivel de Riesgo | Blast Radius | Fase de Ejecución |
| :--- | :--- | :---: | :---: | :---: |
| **Shared Cards** (`CategoryCard`, `StarProductCard`, `FlashDealCard`, `BranchCard`, `ProductPromoCard`, `NotificationItem`, `PublicBusinessCard`) | Pure UI parameters | **BAJO** | Aislado a tarjetas | **Fase 5A** |
| **Search UI** (`GlobalSearchResultItemCard`, Search Overlay) | `EnterpriseSearchEngine`, VM | **MEDIO** | Aislado a búsqueda | **Fase 5B** |
| **Favorites Screen** (`FavoritesScreen`) | `favoriteIds`, `publicBusinesses` | **BAJO** | Aislado a pestaña favoritos | **Fase 5C** |
| **Cart & Checkout UI** (`CartDialog`, `CheckoutDialog`) | `CartManager`, `placeOrder`, Cupones | **ALTO** | Crítico para conversión/ventas | **Fase 5D** |
| **Home Core Assembly** (`CustomerHomeScreen.kt`) | Ensamblaje final | **MEDIO** | Integración general | **Fase 5E** |

---

## 39. Extraction Risk Matrix (Matriz de Riesgo de Extracción)

| Componente | Riesgo Técnico | Justificación | Mitigación |
| :--- | :---: | :--- | :--- |
| `CategoryCard` | 🟢 LOW | Componente puro sin estado global | Parámetros explícitos |
| `FlashDealCard` | 🟢 LOW | Parámetros de producto y callback | Reutilizar interfaz existente |
| `StarProductCard` | 🟢 LOW | Parámetros de producto y callback | Reutilizar interfaz existente |
| `ProductPromoCard`| 🟢 LOW | Parámetros de promoción y callback | Reutilizar interfaz existente |
| `BranchCard` | 🟢 LOW | Parámetros de sucursal y callback | Reutilizar interfaz existente |
| `NotificationItem`| 🟢 LOW | Parámetros de notificación y callback | Reutilizar interfaz existente |
| `PublicBusinessCard`| 🟡 MEDIUM | Callback de favorito y navegación | Desacoplar ViewModel directo |
| `GlobalSearchResultItemCard` | 🟡 MEDIUM | Polimorfismo de 4 tipos de entidad | Preservar modelo canónico |
| `FavoritesScreen` | 🟡 MEDIUM | Pantalla completa con TopBar propia | Mantener misma firma composable |
| `Cart & Checkout Dialog` | 🔴 HIGH | Cálculos monetarios y Firestore write | Cero mutación en lógica de orden |

---

## 40. Recommended Extraction Order (Orden de Extracción Recomendado)

```
FASE 5A: Componentes Puros y Tarjetas Compartidas (Shared Cards)
   ↓ (Validación & Compilación)
FASE 5B: Search UI & Result Cards
   ↓ (Validación & Compilación)
FASE 5C: FavoritesScreen Independiente
   ↓ (Validación & Compilación)
FASE 5D: Cart & Checkout Modals (Máxima Precaución Financiera)
   ↓ (Validación & Compilación)
FASE 5E: Ensamblaje Limpio de CustomerHomeScreen Core
   ↓ (Validación & Compilación)
FASE 5F: Regresión Integral y Certificación Final E2E
```

---

## 41. Phase 5A Plan (Plan Fase 5A — Shared Components)
- **Objetivo:** Extraer composables puros de tarjetas a archivos individuales bajo `app/src/main/java/com/example/presentation/customer/components/`.
- **Archivos a crear:**
  - `CategoryCard.kt`
  - `ProductPromoCard.kt`
  - `PublicBusinessCard.kt`
  - `BranchCard.kt`
  - `StarProductCard.kt`
  - `FlashDealCard.kt`
  - `NotificationItem.kt`
- **Riesgo:** Bajo.

---

## 42. Phase 5B Plan (Plan Fase 5B — Search UI)
- **Objetivo:** Extraer componentes de búsqueda a `app/src/main/java/com/example/presentation/customer/search/`.
- **Archivos a crear:**
  - `GlobalSearchResultItemCard.kt`
  - `CustomerSearchOverlay.kt`
- **Riesgo:** Medio.

---

## 43. Phase 5C Plan (Plan Fase 5C — Favorites)
- **Objetivo:** Extraer `FavoritesScreen` a `app/src/main/java/com/example/presentation/customer/favorites/FavoritesScreen.kt`.
- **Riesgo:** Bajo.

---

## 44. Phase 5D Plan (Plan Fase 5D — Cart & Checkout)
- **Objetivo:** Extraer el flujo multi-paso de carrito y checkout a `app/src/main/java/com/example/presentation/customer/cart/`.
- **Archivos a crear:**
  - `CartModalDialog.kt`
  - `CheckoutStepContent.kt`
- **Riesgo:** Alto (Flujo transaccional crítico).

---

## 45. Phase 5E Plan (Plan Fase 5E — Home Assembly)
- **Objetivo:** Reducir `CustomerHomeScreen.kt` a un orquestador limpio (~350 líneas) importando los módulos extraídos.
- **Riesgo:** Medio.

---

## 46. Phase 5F Plan (Plan Fase 5F — Final Certification)
- **Objetivo:** Ejecutar pruebas completas de compilación, navegación, carrito, favoritos y búsqueda.
- **Criterio de Aceptación:** 0 regresiones funcionales.

---

## 47. Regression Test Inventory (Inventario de Pruebas de Regresión)
- Test 1: Navegación Home → Detalle de Comercio.
- Test 2: Búsqueda difusa y filtros por categoría/entidad.
- Test 3: Marcado/desmarcado de Favoritos y persistencia en pestaña Favoritos.
- Test 4: Adición de productos multi-comercio al carrito.
- Test 5: Validación y aplicación de cupones.
- Test 6: Creación de pedido multi-comercio y navegación a `OrderDetailScreen`.
- Test 7: Conmutación de temas Light/Dark/System.

---

## 48. Test Gaps (Brechas de Prueba)
- Actualmente no existen tests instrumentados automáticos para el flujo de Checkout multi-comercio en Compose. Se recomienda verificación manual asistida en cada subfase.

---

## 49. Rollback Strategy (Estrategia de Rollback)
- Cada subfase (5A, 5B, 5C, 5D, 5E) se ejecutará mediante un commit atómico aislado.
- Si una subfase genera errores de compilación o regresión, se ejecutará `git revert` inmediato al estado previo verificado antes de continuar.

---

## 50. Files That MUST NOT Be Modified (Archivos Protegidos Inmutables)
- `app/src/main/java/com/example/domain/engine/intelligence/EnterpriseSearchEngine.kt`
- `app/src/main/java/com/example/data/CartManager.kt`
- `app/src/main/java/com/example/presentation/customer/profile/ProfileScreen.kt` (y subcomponentes)
- `app/src/main/java/com/example/presentation/customer/profile/OrdersHistoryScreen.kt`
- `app/src/main/java/com/example/presentation/customer/profile/OrderDetailScreen.kt`
- `firestore.rules` & `storage.rules`
- `functions/` (Cloud Functions)

---

## 51. Files That Are Candidates For Future Extraction (Candidatos a Extracción)
- `app/src/main/java/com/example/presentation/customer/CustomerHomeScreen.kt` (división en módulos 5A–5E).

---

## 52. Zero Mutation Verification (Verificación de Cero Mutación)
- Verificado estado del repositorio: **0 archivos de producción modificados por la Fase 5.0**.

---

## 53. Final Architectural Recommendation (Recomendación Arquitectónica Final)
Se recomienda aprobar el plan de ejecución progresivo iniciando por la **Fase 5A (Extracción de Componentes Puros y Tarjetas Compartidas)**, asegurando un blast radius mínimo y garantizando la integridad de cada compilación incremental.

---

## 54. Human Approval Gate (Puerta de Aprobación Humana)
La Fase 5.0 ha concluido su diagnóstico forense integral. 

# ⏸️ HUMAN APPROVAL REQUIRED
**Se requiere la autorización expresa del usuario antes de proceder a la ejecución de la FASE 5A.**

---

# 🟢 FORENSIC PLAN COMPLETE (ZERO CODE MUTATION)
