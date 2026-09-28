# CUSTOMER DASHBOARD FIRESTORE CONTRACT — SPRINT MER 18.0
**Sistema:** BlueSystem Delivery Enterprise  
**Módulo:** Dashboard Principal del Cliente (`CustomerHomeScreen.kt`)  
**Fecha:** 17 de Agosto, 2026

---

## 🗺️ CONTRATO DE DATOS FIRESTORE COMPLETO

### 1. Header Cliente (Saludo & Perfil)
- **UI:** Header Avatar & Greeting (`CustomerHomeScreen.kt:L280-318`)
- **ViewModel:** `CustomerHomeViewModel.currentUserProfile`
- **Repository:** Direct Firestore Listener (`db.collection("users").document(uid)`)
- **Collection:** `users`
- **Document:** `{uid}`
- **Fields:** `displayName`, `nombre`, `name`, `photoUrl`, `email`, `telefono`
- **Listener:** `addSnapshotListener`
- **Real-Time Status:** 🟢 REAL-TIME (Cualquier cambio de nombre en perfil/Firestore se actualiza instantáneamente en el Header)

---

### 2. Notificaciones
- **UI:** Badge & Dialog de Notificaciones (`CustomerHomeScreen.kt:L331-339`, `L887-935`)
- **ViewModel:** `CustomerHomeViewModel` (UI) / `NotificationRepository`
- **Repository:** `NotificationRepository`
- **Collection:** `users/{uid}/notifications`
- **Document:** `{notificationId}`
- **Fields:** `title`, `body`, `isRead`, `read`, `readAt`, `sentAt`, `type`, `category`, `deletedByUser`
- **Listener:** `addSnapshotListener` ordenado por `sentAt DESC`
- **Real-Time Status:** 🟢 REAL-TIME

---

### 3. Carrito y Checkout
- **UI:** Cart Badge (`CustomerBottomNavigationBar.kt:L110-120`) & Checkout Dialog (`CustomerHomeScreen.kt:L780-885`)
- **ViewModel:** `CustomerHomeViewModel.placeOrder()`
- **Repository:** `CartManager` (Memoria Local) → Firestore direct write en checkout
- **Collection:** `orders`
- **Document:** Auto-ID `{orderId}`
- **Fields:** `customerId`, `clienteId`, `customerName`, `customerPhone`, `businessId`, `businessName`, `items` (array), `subtotal`, `deliveryFee`, `total`, `status` (`"pending"`), `estado` (`"pendiente"`), `paymentMethod`, `destinationAddress`, `createdAt`, `courierPhase` (`1`), `hasBeenRated` (`false`)
- **Listener:** `CartManager` StateFlow (Local) → Firestore `set().await()`
- **Real-Time Status:** 🟢 LOCAL REAL-TIME / 🟢 FIRESTORE ATOMIC WRITE

---

### 4. Dirección del Cliente (Header)
- **UI:** Selector de Dirección (`CustomerHomeScreen.kt:L367-379`)
- **ViewModel:** `CustomerHomeViewModel.defaultAddress`
- **Repository:** Direct Firestore Listener (`db.collection("users").document(uid).collection("addresses")`)
- **Collection:** `users/{uid}/addresses`
- **Document:** `{addressId}`
- **Fields:** `fullAddress`, `label`, `isDefault`, `latitude`, `longitude`, `deliveryInstructions`
- **Listener:** `addSnapshotListener` consumiendo el documento con `isDefault == true`
- **Real-Time Status:** 🟢 REAL-TIME

---

### 5. Banners Promocionales
- **UI:** Carrusel Pager (`BannersSection.kt`)
- **ViewModel:** Local Flow binding in `CustomerHomeScreen.kt`
- **Repository:** `FirebaseManager.listenToPromotionalBanners()`
- **Collection:** `banners`
- **Document:** `{bannerId}`
- **Fields:** `imageUrl`/`imagenUrl`, `title`/`titulo`, `subtitle`, `actionType`/`tipoAccion`, `actionId`/`destinoId`, `isActive`, `priority`, `backgroundColor`
- **Listener:** `addSnapshotListener` en `/banners`
- **Real-Time Status:** 🟢 REAL-TIME

---

### 6. Categorías
- **UI:** LazyRow de Categorías (`CustomerHomeScreen.kt:L476-536`)
- **ViewModel:** Combined dynamic list (`publicBusinesses` + `CategoryRepository.categories`)
- **Repository:** `CategoryRepository`
- **Collection:** `categories`
- **Document:** `{categoryId}`
- **Fields:** `name`, `icon`, `businessId`, `active`, `orderIndex`
- **Listener:** `addSnapshotListener` con filtro `active == true`
- **Real-Time Status:** 🟢 REAL-TIME

---

### 7. Comercios Cerca de Ti
- **UI:** Cards de Comercios Público (`CustomerHomeScreen.kt:L580-612`)
- **ViewModel:** `CustomerHomeViewModel.publicBusinesses` (Ordenados por GPS)
- **Repository:** `FirebaseManager.listenToPublicCatalogBusinesses()` / `BusinessRepository`
- **Collection:** `businesses`
- **Document:** `{businessId}`
- **Fields:** `name`/`nombre`/`comercioNombre`, `category`/`categoria`, `address`/`direccion`, `logoUrl`/`photoUrl`, `bannerUrl`/`coverUrl`/`portadaUrl`, `isOpen`/`abierto`, `isFeatured`/`featured`, `isActive`/`active`, `status`, `lifecycleStatus`, `rating`
- **Listener:** `addSnapshotListener` en `/businesses`
- **Real-Time Status:** 🟢 REAL-TIME

---

### 8. Comercios Destacados ⭐
- **UI:** Cards Comercios Destacados (`CustomerHomeScreen.kt:L614-658`)
- **ViewModel:** `CustomerHomeViewModel.publicBusinesses.filter { it.getEffectiveIsFeatured() }`
- **Repository:** `FirebaseManager.listenToFeaturedBusinesses()`
- **Collection:** `businesses`
- **Document:** `{businessId}`
- **Fields:** `isFeatured`, `featured`, `status`, `lifecycleStatus`, `active`, `name`
- **Listener:** `addSnapshotListener` en `/businesses`
- **Real-Time Status:** 🟢 REAL-TIME

---

### 9. Productos Estrella ⭐
- **UI:** Cards Productos Estrella (`CustomerHomeScreen.kt:L666-696`)
- **ViewModel:** `CustomerHomeViewModel.featuredProducts`
- **Repository:** `FirebaseManager.listenToFeaturedProducts()`
- **Collection:** `featuredProducts`
- **Document:** `{featuredProductId}`
- **Fields:** `name`, `price`, `originalPrice`, `imageUrl`, `rating`, `businessId`, `businessName`, `categoryName`, `isPopular`
- **Listener:** `addSnapshotListener` en `/featuredProducts`
- **Real-Time Status:** 🟢 REAL-TIME

---

### 10. Ofertas Flash ⚡
- **UI:** Cards Ofertas Flash (`CustomerHomeScreen.kt:L699-728`)
- **ViewModel:** `CustomerHomeViewModel.flashDeals`
- **Repository:** `FirebaseManager.listenToFlashDeals()`
- **Collection:** `flashDeals`
- **Document:** `{flashDealId}`
- **Fields:** `title`, `discountTag`, `productName`, `price`, `originalPrice`, `businessId`, `businessName`, `imageUrl`, `expiresAtMinutes`
- **Listener:** `addSnapshotListener` en `/flashDeals`
- **Real-Time Status:** 🟢 REAL-TIME

---

### 11. Precios Imperdibles %
- **UI:** Promo Product Cards (`CustomerHomeScreen.kt:L755-795`)
- **ViewModel:** `CustomerHomeViewModel.featuredProducts` / `promotions`
- **Repository:** `PromotionRepository` / `FirebaseManager`
- **Collection:** `/featuredProducts` & `/promotions`
- **Document:** `{id}`
- **Fields:** `name`, `price`, `originalPrice`, `businessId`, `businessName`, `imageUrl`
- **Listener:** `addSnapshotListener`
- **Real-Time Status:** 🟢 REAL-TIME (Mock Hamburguesa Doble Eliminado)

---

### 12. Favoritos
- **UI:** Favorites Screen (`CustomerHomeScreen.kt:L1063-1178`)
- **ViewModel:** `CustomerHomeViewModel.favoriteIds`
- **Repository:** `CustomerHomeViewModel.loadFavorites()` / `toggleFavorite()`
- **Collection:** `users/{uid}/favorites`
- **Document:** `{businessId}`
- **Fields:** `addedAt`
- **Listener:** `addSnapshotListener`
- **Real-Time Status:** 🟢 REAL-TIME
