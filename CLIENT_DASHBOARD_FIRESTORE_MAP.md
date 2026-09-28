# FIRESTORE DATA MAP — CLIENT DASHBOARD
**Sistema:** BlueSystem Delivery Enterprise  
**Módulo:** Dashboard Principal del Cliente (`CustomerHomeScreen.kt`)  
**Fecha:** 17 de Agosto, 2026

---

## 🗺️ MAPA TÉCNICO DE FLUJO DE DATOS FIRESTORE

### 1. Cliente / Perfil
- **UI Element:** Saludo e Inicial (`CustomerHomeScreen.kt:L293-316`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** `CustomerHomeViewModel`
- **Repository:** Direct Auth (`FirebaseAuth.getInstance().currentUser`)
- **Collection:** `users`
- **Document:** `{uid}`
- **Field:** `displayName`, `nombre`, `email`
- **Listener:** None (Single read on composition via `remember`)
- **Real-Time Status:** 🔴 NO SINCRONIZADO (Requiere reinicio/recomposición para reflejar cambios de nombre)

---

### 2. Notificaciones & Contador Badge
- **UI Element:** Badge e Historial de Notificaciones (`CustomerHomeScreen.kt:L331-339`, `L887-935`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** `CustomerHomeViewModel` (interfaz UI) / Direct `NotificationRepository`
- **Repository:** `NotificationRepository`
- **Collection:** `users/{uid}/notifications`
- **Document:** `{notificationId}`
- **Field:** `title`, `body`, `isRead`, `read`, `readAt`, `sentAt`, `type`, `category`, `deletedByUser`
- **Listener:** `addSnapshotListener` ordenado por `sentAt DESC`
- **Real-Time Status:** 🟢 REAL-TIME (`StateFlow<List<AppNotification>>` y `StateFlow<Int> unreadCount`)

---

### 3. Carrito y Creación de Pedidos
- **UI Element:** Badge Carrito (`CustomerBottomNavigationBar.kt:L110-120`) y Diálogo Checkout (`CustomerHomeScreen.kt:L780-885`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** `CustomerHomeViewModel.placeOrder()`
- **Repository:** `CartManager` (Memoria Local) → Direct Firestore en Checkout
- **Collection:** `orders`
- **Document:** Auto-generated `{orderId}`
- **Field:** `customerId`, `clienteId`, `customerName`, `customerPhone`, `businessId`, `businessName`, `items` (array), `subtotal`, `deliveryFee`, `total`, `status` (`"pending"`), `estado` (`"pendiente"`), `paymentMethod`, `destinationAddress`, `createdAt`, `courierPhase` (`1`), `hasBeenRated` (`false`)
- **Listener:** Local `StateFlow` en `CartManager` (Items en memoria) → Firestore `Task.await()` en checkout
- **Real-Time Status:** 🟢 LOCAL REAL-TIME (Items) / 🟢 FIRESTORE WRITE (Checkout)

---

### 4. Banners Promocionales
- **UI Element:** Carrusel de Banners (`BannersSection.kt`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** Local Flow binding in `CustomerHomeScreen.kt:L167`
- **Repository:** `FirebaseManager.listenToPromotionalBanners()`
- **Collection:** `banners`
- **Document:** `{bannerId}`
- **Field:** `imageUrl`/`imagenUrl`, `title`/`titulo`, `subtitle`, `actionType`/`tipoAccion`, `actionId`/`destinoId`, `isActive`, `priority`, `backgroundColor`
- **Listener:** `addSnapshotListener` en `/banners`
- **Real-Time Status:** 🟢 REAL-TIME (`Flow<List<BannerPromocional>>`)

---

### 5. Categorías
- **UI Element:** Tiras Horizontales de Categorías (`CustomerHomeScreen.kt:L476-536`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** Dynamic composition of `publicBusinesses` + `CategoryRepository.categories`
- **Repository:** `CategoryRepository`
- **Collection:** `categories`
- **Document:** `{categoryId}`
- **Field:** `name`, `icon`, `businessId`, `active`, `orderIndex`
- **Listener:** `addSnapshotListener` con filtro `active == true` ordenado por `orderIndex ASC`
- **Real-Time Status:** 🟢 REAL-TIME (`StateFlow<List<Category>>`)

---

### 6. Comercios Cerca de Ti (Catálogo Público)
- **UI Element:** Cards de Comercios (`CustomerHomeScreen.kt:L580-612`, `PublicBusinessCard`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** `CustomerHomeViewModel.publicBusinesses`
- **Repository:** `FirebaseManager.listenToPublicCatalogBusinesses()` / `BusinessRepository`
- **Collection:** `businesses`
- **Document:** `{businessId}`
- **Field:** `name`/`nombre`/`comercioNombre`, `category`/`categoria`, `address`/`direccion`, `logoUrl`/`photoUrl`, `bannerUrl`/`coverUrl`/`portadaUrl`, `isOpen`/`abierto`, `isFeatured`/`featured`, `isActive`/`active`, `status`, `lifecycleStatus`, `rating`
- **Listener:** `addSnapshotListener` en `/businesses`
- **Real-Time Status:** 🟢 REAL-TIME (`Flow<List<BusinessInfo>>`)

---

### 7. Comercios Destacados ⭐
- **UI Element:** Tira de Comercios Destacados (`CustomerHomeScreen.kt:L614-658`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** `CustomerHomeViewModel.publicBusinesses.filter { it.getEffectiveIsFeatured() }`
- **Repository:** `FirebaseManager.listenToFeaturedBusinesses()`
- **Collection:** `businesses`
- **Document:** `{businessId}`
- **Field:** `isFeatured`, `featured`, `status`, `lifecycleStatus`, `active`, `name`
- **Listener:** `addSnapshotListener` en `/businesses`
- **Real-Time Status:** 🟢 REAL-TIME (`Flow<List<Usuario>>` / `Flow<List<BusinessInfo>>`)

---

### 8. Productos Estrella ⭐
- **UI Element:** Cards Productos Estrella (`CustomerHomeScreen.kt:L666-696`, `StarProductCard`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** `CustomerHomeViewModel.featuredProducts`
- **Repository:** `FirebaseManager.listenToFeaturedProducts()`
- **Collection:** `featuredProducts`
- **Document:** `{featuredProductId}`
- **Field:** `name`, `price`, `originalPrice`, `imageUrl`, `rating`, `businessId`, `businessName`, `categoryName`, `isPopular`
- **Listener:** `addSnapshotListener` en `/featuredProducts`
- **Real-Time Status:** 🟢 REAL-TIME (`Flow<List<FeaturedProduct>>`)

---

### 9. Ofertas Flash ⚡
- **UI Element:** Cards Ofertas Flash (`CustomerHomeScreen.kt:L699-728`, `FlashDealCard`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** `CustomerHomeViewModel.flashDeals`
- **Repository:** `FirebaseManager.listenToFlashDeals()`
- **Collection:** `flashDeals`
- **Document:** `{flashDealId}`
- **Field:** `title`, `discountTag`, `productName`, `price`, `originalPrice`, `businessId`, `businessName`, `imageUrl`, `expiresAtMinutes`
- **Listener:** `addSnapshotListener` en `/flashDeals`
- **Real-Time Status:** 🟢 REAL-TIME (`Flow<List<FlashDeal>>`)

---

### 10. Precios Imperdibles %
- **UI Element:** Cards de Ofertas Promo (`CustomerHomeScreen.kt:L731-769`, `ProductPromoCard`)
- **Screen:** `CustomerHomeScreen`
- **ViewModel:** N/A (Hardcoded local array inside Composable)
- **Repository:** N/A
- **Collection:** N/A (Sin conexión a Firestore)
- **Document:** N/A
- **Field:** N/A
- **Listener:** N/A
- **Real-Time Status:** 🔴 MOCK (Datos estáticos hardcoded)

---

### 11. Favoritos
- **UI Element:** Pantalla Favoritos (`CustomerHomeScreen.kt:L1063-1178`, `FavoritesScreen`)
- **Screen:** `CustomerHomeScreen` (Tab index 1)
- **ViewModel:** `CustomerHomeViewModel.favoriteIds`
- **Repository:** `CustomerHomeViewModel.loadFavorites()` / `toggleFavorite()`
- **Collection:** `users/{uid}/favorites`
- **Document:** `{businessId}`
- **Field:** `addedAt` (Timestamp)
- **Listener:** `addSnapshotListener` en `users/{uid}/favorites`
- **Real-Time Status:** 🟢 REAL-TIME (`StateFlow<Set<String>>`)

---

## 📊 RESUMEN TABULAR DE COLECCIONES FIRESTORE CONSUMIDAS

| Elemento | Colección Firestore | Documento | Campos Clave | Tipo de Conexión | Estado Real-time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Banners** | `banners` | `{id}` | `imageUrl`, `title`, `actionType`, `actionId`, `isActive` | Snapshot Listener | 🟢 REAL-TIME |
| **Categorías** | `categories` | `{id}` | `name`, `icon`, `active`, `orderIndex` | Snapshot Listener | 🟢 REAL-TIME |
| **Comercios** | `businesses` | `{id}` | `name`, `category`, `address`, `isOpen`, `isFeatured`, `status` | Snapshot Listener | 🟢 REAL-TIME |
| **Productos Estrella** | `featuredProducts` | `{id}` | `name`, `price`, `originalPrice`, `businessId`, `rating` | Snapshot Listener | 🟢 REAL-TIME |
| **Ofertas Flash** | `flashDeals` | `{id}` | `title`, `discountTag`, `price`, `originalPrice`, `businessId` | Snapshot Listener | 🟢 REAL-TIME |
| **Notificaciones** | `users/{uid}/notifications` | `{id}` | `title`, `body`, `isRead`, `sentAt`, `type` | Snapshot Listener | 🟢 REAL-TIME |
| **Favoritos** | `users/{uid}/favorites` | `{businessId}` | `addedAt` | Snapshot Listener | 🟢 REAL-TIME |
| **Pedidos (Creación)** | `orders` | Auto ID | `customerId`, `businessId`, `items`, `total`, `status` | Task Write | 🟢 FIRESTORE WRITE |
| **Dirección Cliente** | `users/{uid}/addresses` | `{id}` | `fullAddress`, `isDefault`, `latitude`, `longitude` | None (Hardcoded UI) | 🔴 MOCK |
| **Precios Imperdibles** | N/A | N/A | Hardcoded list in Composable | None | 🔴 MOCK |
