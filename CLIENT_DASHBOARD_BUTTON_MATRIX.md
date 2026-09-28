# BUTTON MATRIX & INTERACTION AUDIT — CLIENT DASHBOARD
**Sistema:** BlueSystem Delivery Enterprise  
**Módulo:** Dashboard Principal del Cliente (`CustomerHomeScreen.kt`)  
**Fecha:** 17 de Agosto, 2026

---

## 🕹️ MATRIZ COMPLETA DE BOTONES Y ELEMENTOS INTERACTIVOS

| Elemento UI | Evento | Callback / Lógica | ViewModel | UseCase / Repository | Firestore / Cloud Function | Resultado Visible en UI |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Botón Notificaciones (🔔)** | `onClick` | `showNotificationDialog = true` | N/A | `NotificationRepository` | Reads `users/{uid}/notifications` | Abre `AlertDialog` con historial de notificaciones y badge de no leídas |
| **Item Notificación (Dialog)** | `onClick` | `notificationRepo.markAsRead(item.id)` | N/A | `NotificationRepository` | Updates `users/{uid}/notifications/{id}` (`isRead: true`, `readAt`) | Quita el punto rojo de "no leída" e incrementa contador global |
| **Botón Carrito TopBar (🛒)** | `onClick` | `if (isGuest) navigate(Login) else showCartDialog = true` | N/A | `CartManager` | Reads `CartManager.cartItems` StateFlow | Abre `AlertDialog` con el resumen del pedido actual |
| **Selector de Dirección (📍)** | `onClick` | `if (isGuest) navigate(Login) else navigate(AddressManager)` | N/A | N/A | N/A | Navega a la pantalla `AddressManagerScreen` (Sin actualización de retorno) |
| **Barra de Búsqueda (🔍)** | `onClick` / `onValueChange` | `showSearchBar = true` / `searchQueryText = it` | N/A | N/A | N/A (Filtro local) | Filtra en tiempo real los comercios mostrados por nombre/categoría |
| **Botón de Voz (Mic 🎙️)** | `onClick` | `speechRecognizerLauncher.launch(intent)` | N/A | Android Recognizer Intent | N/A | Captura voz del usuario e inserta el texto en el buscador |
| **Card de Banner Promocional** | `onClick` | `onBannerClick(banner)` | N/A | N/A | Checks `actionType == "comercio"` & `actionId` | Navega a `comercio_detalle_screen/{actionId}` |
| **Item de Categoría (Pill)** | `onClick` | `selectedCategoryFilter = if (isSelected) "" else catName` | N/A | `CategoryRepository` | N/A (Filtro local) | Resalta la categoría seleccionada y filtra la lista de comercios |
| **Card de Comercio Cerca de Ti** | `onClick` | `navController.navigate("comercio_detalle_screen/${business.id}")` | `CustomerHomeViewModel` | `BusinessRepository` / `FirebaseManager` | Reads `/businesses` | Abre la pantalla de detalle y menú del comercio |
| **Botón Favorito (❤️ en Card)** | `onClick` | `viewModel.toggleFavorite(business.id)` | `CustomerHomeViewModel` | `CustomerHomeViewModel` direct DB | Writes/Deletes `users/{uid}/favorites/{businessId}` | Cambia el estado del icono (Corazón lleno rojo / borde blanco) |
| **Card Comercio Destacado ⭐** | `onClick` | `navController.navigate("comercio_detalle_screen/${business.id}")` | `CustomerHomeViewModel` | `FirebaseManager` | Reads `/businesses` (`isFeatured=true`) | Abre la pantalla de detalle del comercio destacado |
| **Card Producto Estrella ⭐** | `onClick` | `navController.navigate("comercio_detalle_screen/${star.businessId}")` | `CustomerHomeViewModel` | `FirebaseManager` | Reads `/featuredProducts` | Navega al menú del comercio propietario del producto estrella |
| **Card Oferta Flash ⚡** | `onClick` | `navController.navigate("comercio_detalle_screen/${deal.businessId}")` | `CustomerHomeViewModel` | `FirebaseManager` | Reads `/flashDeals` | Navega al comercio asociado a la oferta flash |
| **Botón "Agregar 🛒" (Imperdibles)** | `onClick` | `CartManager.addToCart(...)` | N/A | `CartManager` (Memoria Local) | N/A (MOCK ID: `demo_comercio`) | Agrega un producto demo al carrito e incrementa badge |
| **Botón "Solicitar Envío 🚀" (Cart)** | `onClick` | `viewModel.placeOrder(deliveryAddress, deliveryFee)` | `CustomerHomeViewModel` | Direct Firestore `db.collection("orders").document()` | Writes `/orders` (`status: "pending"`, `courierPhase: 1`) | Vacía carrito, muestra Toast de éxito y navega a `OrderDetailScreen` |
| **Botón "Vaciar" (Cart Dialog)** | `onClick` | `CartManager.clear(); showCartDialog = false` | N/A | `CartManager` | N/A | Vacía todos los ítems del carrito local y cierra el diálogo |
| **Tab 0: Inicio (BottomNav)** | `onClick` | `selectedTab = 0` | N/A | N/A | N/A | Cambia la vista al Dashboard Principal |
| **Tab 1: Favoritos (BottomNav)** | `onClick` | `selectedTab = 1` | N/A | `CustomerHomeViewModel` | Reads `users/{uid}/favorites` | Renderiza la pantalla `FavoritesScreen` |
| **Tab 3: Pedidos (BottomNav)** | `onClick` | `if (isGuest) navigate(Login) else selectedTab = 3` | N/A | `OrdersHistoryScreen` | Reads `/orders` (`customerId == uid`) | Renderiza el historial de pedidos del cliente |
| **Tab 4: Mi Perfil (BottomNav)** | `onClick` | `if (isGuest) navigate(Login) else selectedTab = 4` | N/A | `ProfileScreen` | Reads `users/{uid}` | Renderiza la pantalla de perfil, direcciones y ayuda |
| **Pull to Refresh** | `onRefresh` | `viewModel.refresh()` | `CustomerHomeViewModel` | Re-triggers local state flags | N/A | Muestra indicador de recarga y refresca datos |
