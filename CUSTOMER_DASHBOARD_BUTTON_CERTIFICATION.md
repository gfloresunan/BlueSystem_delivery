# CUSTOMER DASHBOARD BUTTON CERTIFICATION — SPRINT MER 18.0
**Sistema:** BlueSystem Delivery Enterprise  
**Módulo:** Dashboard Principal del Cliente (`CustomerHomeScreen.kt`)  
**Fecha:** 17 de Agosto, 2026

---

## 🕹️ CERTIFICACIÓN E2E DE BOTONES Y ELEMENTOS INTERACTIVOS

| Botón / Elemento UI | Evento | Callback | ViewModel | Repository | Firestore / Function | Resultado UI | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Notificaciones (🔔)** | `onClick` | `showNotificationDialog = true` | N/A | `NotificationRepository` | Reads `users/{uid}/notifications` | Abre `AlertDialog` notificaciones | 🟢 CERTIFIED |
| **Item Notificación** | `onClick` | `notificationRepo.markAsRead(id)` | N/A | `NotificationRepository` | Updates `users/{uid}/notifications/{id}` | Desaparece indicador no leído | 🟢 CERTIFIED |
| **Carrito TopBar (🛒)** | `onClick` | `showCartDialog = true` | N/A | `CartManager` | Reads `CartManager.cartItems` | Abre `AlertDialog` carrito | 🟢 CERTIFIED |
| **Selector Dirección (📍)**| `onClick` | `navController.navigate(AddressManager)` | N/A | Direct Firestore | Reads `users/{uid}/addresses` | Navega a gestor de direcciones | 🟢 CERTIFIED |
| **Buscador (🔍)** | `onValueChange` | `searchQueryText = it` | N/A | N/A | Client-side filter | Filtra comercios por texto/categoría | 🟢 CERTIFIED |
| **Micrófono (🎙️)** | `onClick` | `speechRecognizerLauncher.launch(...)` | N/A | Android Recognizer | Speech API | Inserta texto por voz en el buscador | 🟢 CERTIFIED |
| **Banner Promocional** | `onClick` | `onBannerClick(banner)` | N/A | `FirebaseManager` | Reads `/banners` | Navega a detalle de comercio | 🟢 CERTIFIED |
| **Categoría (Pill)** | `onClick` | `selectedCategoryFilter = catName` | N/A | `CategoryRepository` | Reads `/categories` | Filtra comercios en tiempo real | 🟢 CERTIFIED |
| **Comercio Cerca** | `onClick` | `navController.navigate("comercio_detalle_screen/${id}")` | `CustomerHomeViewModel` | `BusinessRepository` | Reads `/businesses` | Abre menú del comercio | 🟢 CERTIFIED |
| **Favorito (❤️)** | `onClick` | `viewModel.toggleFavorite(id)` | `CustomerHomeViewModel` | Direct Firestore | Writes `users/{uid}/favorites/{id}` | Alterna icono corazón rojo/borde | 🟢 CERTIFIED |
| **Comercio Destacado ⭐**| `onClick` | `navController.navigate("comercio_detalle_screen/${id}")` | `CustomerHomeViewModel` | `FirebaseManager` | Reads `/businesses` | Abre menú del comercio destacado | 🟢 CERTIFIED |
| **Producto Estrella ⭐** | `onClick` | `navController.navigate("comercio_detalle_screen/${id}")` | `CustomerHomeViewModel` | `FirebaseManager` | Reads `/featuredProducts` | Abre menú del comercio propietario | 🟢 CERTIFIED |
| **Oferta Flash ⚡** | `onClick` | `navController.navigate("comercio_detalle_screen/${id}")` | `CustomerHomeViewModel` | `FirebaseManager` | Reads `/flashDeals` | Abre comercio con oferta flash | 🟢 CERTIFIED |
| **"Agregar 🛒" (Imperdibles)**| `onClick` | `CartManager.addToCart(prod.id, ...)` | N/A | `CartManager` | Real `productId` & `businessId` | Inserta producto real al carrito | 🟢 CERTIFIED |
| **"Solicitar Envío 🚀"** | `onClick` | `viewModel.placeOrder(...)` | `CustomerHomeViewModel` | Direct Firestore | Writes `/orders` (`status: "pending"`) | Crea pedido, vacía carrito y navega | 🟢 CERTIFIED |
| **"Vaciar" (Cart)** | `onClick` | `CartManager.clear()` | N/A | `CartManager` | N/A | Vacía carrito y cierra diálogo | 🟢 CERTIFIED |
| **Tab 0: Inicio** | `onClick` | `selectedTab = 0` | N/A | N/A | N/A | Muestra Dashboard Principal | 🟢 CERTIFIED |
| **Tab 1: Favoritos** | `onClick` | `selectedTab = 1` | N/A | `CustomerHomeViewModel` | Reads `users/{uid}/favorites` | Renderiza `FavoritesScreen` | 🟢 CERTIFIED |
| **Tab 3: Pedidos** | `onClick` | `selectedTab = 3` | N/A | `OrdersHistoryScreen` | Reads `/orders` | Renderiza `OrdersHistoryScreen` | 🟢 CERTIFIED |
| **Tab 4: Mi Perfil** | `onClick` | `selectedTab = 4` | N/A | `ProfileScreen` | Reads `users/{uid}` | Renderiza `ProfileScreen` | 🟢 CERTIFIED |
| **Pull to Refresh** | `onRefresh` | `viewModel.refresh()` | `CustomerHomeViewModel` | StateFlows refresh | Re-triggers listeners | Muestra spinner y recarga UI | 🟢 CERTIFIED |
