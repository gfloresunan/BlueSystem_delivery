# CUSTOMER DASHBOARD REALITY CERTIFICATION — SPRINT MER 18.0
**Sistema:** BlueSystem Delivery Enterprise (App Cliente Android)  
**Fecha de Certificación:** 17 de Agosto, 2026  
**Auditor Lead:** Senior Developer & Auditor de BlueSystem  
**Estado General de Realidad:** 🟢 100% CERTIFIED REALITY (Mocks & Hardcoded Data Eliminated)

---

## 🎯 1. OBJETIVOS CUMPLIDOS Y ELIMINACIÓN DE MOCKS

En este Sprint MER 18.0, se completó el cierre de realidad y la eliminación absoluta de datos ficticios o hardcoded en el Dashboard Principal del Cliente (`CustomerHomeScreen.kt`), manteniendo intacta la estructura visual y funcional previamente aprobada.

### Mocks y Datos Ficticios Eliminados de Raíz:
1. ❌ **"Gerald" (Nombre de Usuario Hardcoded):** Eliminado de `CustomerHomeScreen.kt`, `ProfileHeader.kt` y `ProfileScreen.kt`. Reemplazado por escucha en tiempo real de la subcolección/documento `users/{uid}` (`displayName` / `nombre` / `name`) con fallback a email prefix o `"Cliente"`.
2. ❌ **"Mi dirección guardada" (Dirección Hardcoded):** Eliminado de `CustomerHomeScreen.kt`. Reemplazado por listener en tiempo real a `users/{uid}/addresses` consumiendo la dirección marcada con `isDefault == true`.
3. ❌ **"2.7 km" y "C$ 40" (Distancia y Tarifa Fija Simulatadas):** Eliminado el valor fijo en `CustomerHomeScreen.kt`. Reemplazado por cálculo dinámico de tarifa y distancia GPS Haversine entre las coordenadas de la dirección del cliente y el comercio.
4. ❌ **"Hamburguesa Doble", "Pizza Familiar", "demo_comercio" (Precios Imperdibles Mock):** Eliminada la lista estática `listOf(Triple("Hamburguesa Doble", ...))` y la asignación del ID ficticio `demo_comercio`. Conectado a la lista real de `/featuredProducts` / `/promotions` de Firestore. Al presionar "Agregar 🛒", se transfieren el `productId` real y el `businessId` real del comercio a `CartManager`. Si no existen productos promocionales en Firestore, se renderiza una tarjeta elegante de estado vacío.

---

## 🧭 2. AUDITORÍA Y CERTIFICACIÓN MÓDULO POR MÓDULO

### 1. Header Cliente
- **Estado:** 🟢 CERTIFIED REALTIME
- **Fuente:** `users/{uid}` (`addSnapshotListener` en `CustomerHomeViewModel`)
- **Evidencia:** `CustomerHomeViewModel.kt:L71-80` escucha los cambios en tiempo real del perfil del usuario autenticado. `CustomerHomeScreen.kt` recalcula `currentUserName` dinámicamente mediante `remember(userProfile)`.

### 2. Notificaciones
- **Estado:** 🟢 CERTIFIED REALTIME
- **Fuente:** `users/{uid}/notifications` (`NotificationRepository`)
- **Evidencia:** Escucha `sentAt DESC`, maneja badge de no leídas (`unreadCount`), marcado como leído (`isRead`, `readAt`), tracking de aperturas y borrado.

### 3. Carrito y Checkout
- **Estado:** 🟢 CERTIFIED E2E
- **Fuente:** `CartManager` (Memoria Local durante selección) → Firestore `/orders` en checkout.
- **Evidencia:** Al presionar "Solicitar Envío 🚀", `placeOrder()` escribe el documento atómico en `/orders` con `customerId`, `businessId`, `items`, `subtotal`, `deliveryFee`, `total`, `status: "pending"`, `courierPhase: 1`.

### 4. Dirección Predeterminada
- **Estado:** 🟢 CERTIFIED REALTIME
- **Fuente:** `users/{uid}/addresses` (`addSnapshotListener` en `CustomerHomeViewModel`)
- **Evidencia:** Filtra el documento con `isDefault == true` (o el primero disponible) y lo enlaza dinámicamente al Selector de Dirección del Header.

### 5. Buscador Global
- **Estado:** 🟢 CERTIFIED
- **Fuente:** Búsqueda en memoria sobre `publicBusinesses`, categorización y productos.
- **Evidencia:** Soporta filtro por nombre, categoría y dirección, además de dictado por voz mediante `RecognizerIntent`.

### 6. Banners Promocionales
- **Estado:** 🟢 CERTIFIED REALTIME
- **Fuente:** `/banners` (`FirebaseManager.listenToPromotionalBanners()`)
- **Evidencia:** Escucha `addSnapshotListener` en `/banners` y renderiza el `HorizontalPager`. Navega al comercio en `onBannerClick`.

### 7. Categorías
- **Estado:** 🟢 CERTIFIED REALTIME
- **Fuente:** `/categories` (`CategoryRepository`) + Categorías dinámicas de `/businesses`.
- **Evidencia:** Al agregar o modificar una categoría en Firestore desde AMI/Merchant Web, aparece instantáneamente en el LazyRow de Categorías y filtra la lista de comercios.

### 8. Comercios Cerca de Ti
- **Estado:** 🟢 CERTIFIED REALTIME & GPS SORT
- **Fuente:** `/businesses` (`BusinessRepository`)
- **Evidencia:** Filtra por `isValidPublicCatalogItem()` (`getEffectiveIsActive() && status != "DELETED"`). Ordena ascendentemente por distancia GPS cuando la ubicación del cliente está disponible.

### 9. Comercios Destacados ⭐
- **Estado:** 🟢 CERTIFIED REALTIME
- **Fuente:** `/businesses` (`isFeatured == true`)
- **Evidencia:** Escucha en tiempo real. Un cambio en `isFeatured` desde AMI o Merchant Web se refleja inmediatamente en el cliente sin reiniciar la APK.

### 10. Productos Estrella ⭐
- **Estado:** 🟢 CERTIFIED REALTIME
- **Fuente:** `/featuredProducts`
- **Evidencia:** Renderiza la entidad `FeaturedProduct`. Tocar un producto navega directamente al `comercio_detalle_screen/{businessId}`.

### 11. Ofertas Flash ⚡
- **Estado:** 🟢 CERTIFIED REALTIME
- **Fuente:** `/flashDeals`
- **Evidencia:** Escucha las ofertas en tiempo real y expone las promociones por tiempo limitado.

### 12. Precios Imperdibles %
- **Estado:** 🟢 CERTIFIED REALTIME (Mock Eliminado)
- **Fuente:** `/featuredProducts` / `/promotions` de Firestore.
- **Evidencia:** Muestra los productos en oferta reales con su precio actual, precio original y nombre de comercio real. El botón "Agregar 🛒" envía el `productId` real y el `businessId` real a `CartManager`. Muestra estado vacío elegante si no existen productos en promoción.

### 13. Navegación Inferior
- **Estado:** 🟢 CERTIFIED
- **Fuente:** `CustomerBottomNavigationBar.kt`
- **Evidencia:** Los 5 tabs (Inicio, Favoritos, Carrito, Pedidos, Perfil) están 100% operativos con navegación Jetpack Navigation.

---

## 🏆 MATRIZ DE CERTIFICACIÓN DE REALIDAD MER 18.0

| Módulo / Sección | Mocks Previos | Estado Actual | Colección Firestore / Fuente | E2E Status |
| :--- | :--- | :--- | :--- | :---: |
| **Header Saludo** | `"Gerald"` | Nombre Real / Email | `users/{uid}` | 🟢 CERTIFIED |
| **Notificaciones** | Ninguno | Realtime Listener | `users/{uid}/notifications` | 🟢 CERTIFIED |
| **Carrito** | Ninguno | Local → Firestore | `/orders` | 🟢 CERTIFIED |
| **Dirección** | `"Mi dirección guardada"` | Dirección Predeterminada | `users/{uid}/addresses` | 🟢 CERTIFIED |
| **Distancia & Fee** | `"2.7 km"` / `"C$ 40"` | GPS Dinámico | GeoUtils / Customer Coords | 🟢 CERTIFIED |
| **Buscador** | Solo Comercios | Global | Client-side search engine | 🟢 CERTIFIED |
| **Banners** | Ninguno | Realtime Listener | `/banners` | 🟢 CERTIFIED |
| **Categorías** | Fallback Demo | Realtime Listener | `/categories` | 🟢 CERTIFIED |
| **Comercios Cerca** | Sin GPS Sort | Realtime + GPS Sort | `/businesses` | 🟢 CERTIFIED |
| **Destacados ⭐** | Ninguno | Realtime Listener | `/businesses` (`isFeatured`) | 🟢 CERTIFIED |
| **Prod. Estrella ⭐**| Ninguno | Realtime Listener | `/featuredProducts` | 🟢 CERTIFIED |
| **Ofertas Flash ⚡** | Ninguno | Realtime Listener | `/flashDeals` | 🟢 CERTIFIED |
| **Precios Imperdibles**| `"Hamburguesa Doble"`, `"demo_comercio"` | Realtime Firestore / Empty State | `/featuredProducts` & `/promotions` | 🟢 CERTIFIED |
| **Bottom Nav** | Ninguno | 100% Funcional | Compose Navigation | 🟢 CERTIFIED |
