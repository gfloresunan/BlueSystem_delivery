# AUDITORÍA DE REALIDAD, FUENTES DE DATOS Y E2E — DASHBOARD CLIENTE
**Sistema:** BlueSystem Delivery Enterprise (App Cliente Android)  
**Fecha de Auditoría:** 17 de Agosto, 2026  
**Auditor:** Senior Developer & Auditor de BlueSystem  
**Estado General del Dashboard:** 🟡 PARCIALMENTE CERTIFICADO (Mezcla de Listeners Firestore Real-time con Bloques MOCK Hardcoded)

---

## 🎯 1. RESPUESTAS CON EVIDENCIA A LAS 5 PREGUNTAS CLAVE

### 1. ¿Lo que veo en el Dashboard realmente está implementado?
**Respuesta:** **PARCIALMENTE.**  
- **Implementado y Conectado a Firestore:** Encabezado con Saludo y Badges, Carrusel de Banners Promocionales (`/banners`), Categorías (`/categories`), Comercios Destacados (`/businesses` con `isFeatured=true`), Productos Estrella (`/featuredProducts`), Ofertas Flash (`/flashDeals`), Notificaciones (`users/{uid}/notifications`), Pedidos (`/orders`), y Favoritos (`users/{uid}/favorites`).
- **NO Implementado Realmente / MOCK:** 
  - **"Precios Imperdibles %":** Es una lista 100% hardcoded en el Composable (`CustomerHomeScreen.kt:L743-749`), sin consulta a Firestore.
  - **Dirección del Cliente en Header:** Texto `"Mi dirección guardada"` hardcoded en `CustomerHomeScreen.kt:L118`. No lee la dirección predeterminada desde `users/{uid}/addresses`.
  - **Tarifa de Envío:** Distancia fija simulada de 2.7 km (`CustomerHomeScreen.kt:L176`).

### 2. ¿De dónde viene exactamente cada dato que veo?
- **Nombre de Usuario:** `FirebaseAuth.currentUser.displayName` (con fallback local `"Gerald"`).
- **Notificaciones:** Listener en tiempo real a `users/{uid}/notifications` mediante `NotificationRepository`.
- **Carrito:** Objeto singleton en memoria `CartManager` (no persiste en SQLite/Room ni Firestore mientras se arma, pero al dar "Solicitar Envío" impacta atómicamente en `/orders`).
- **Banners:** Listener en tiempo real a colección `/banners` mediante `FirebaseManager.listenToPromotionalBanners()`.
- **Categorías:** Híbrido entre categorías extraídas de `/businesses`, la colección `/categories` vía `CategoryRepository`, y un fallback estático.
- **Comercios Cerca de Ti:** Colección `/businesses` filtrada por `isValidPublicCatalogItem()`.
- **Comercios Destacados:** Colección `/businesses` filtrada por `isFeatured == true` || `featured == true`.
- **Productos Estrella:** Colección `/featuredProducts` vía `FirebaseManager.listenToFeaturedProducts()`.
- **Ofertas Flash:** Colección `/flashDeals` vía `FirebaseManager.listenToFlashDeals()`.
- **Precios Imperdibles:** Lista local estática `listOf(Triple("Hamburguesa Doble", ...))` dentro de `CustomerHomeScreen.kt`.

### 3. ¿Qué ocurre técnicamente cuando presiono cada botón?
- **Botón Notificaciones (🔔):** Abre un `AlertDialog` que consume `NotificationRepository.notifications`. Al tocar una notificación no leída, llama a `notificationRepo.markAsRead(item.id)` actualizando Firestore (`isRead: true`, `readAt: Timestamp.now()`).
- **Botón Carrito (🛒 / FAB Central):** Abre `AlertDialog`. Si contiene items y el usuario confirma, ejecuta `viewModel.placeOrder(...)` que escribe un nuevo documento en la colección `/orders` de Firestore con estado `"pending"`, vacía el carrito local y navega a `OrderDetailScreen`.
- **Tarjeta de Comercio:** Ejecuta `navController.navigate("comercio_detalle_screen/${business.id}")`.
- **Botón Favorito (❤️):** Ejecuta `viewModel.toggleFavorite(businessId)` agregando/eliminando la referencia en `users/{uid}/favorites/{businessId}` en Firestore.
- **Filtro de Categoría:** Filtra localmente en memoria la lista `publicBusinesses` mediante `remember(publicBusinesses, searchQueryText, selectedCategoryFilter)`.
- **Buscador (Barra / Micrófono):** Ejecuta filtro local por coincidencia de texto en nombre, categoría o dirección de los comercios cargados. Soporta entrada por voz vía `RecognizerIntent`.

### 4. Si cambio algo desde Merchant Web o AMI, ¿aparece realmente en la APK?
- **SÍ en Banners:** Al agregar/modificar/desactivar un documento en `/banners` desde Merchant Web o AMI, el `HorizontalPager` se actualiza instantáneamente sin reiniciar la APK.
- **SÍ en Comercios / Destacados:** Al cambiar `isFeatured`, `name`, `status` o `isOpen` en un documento de `/businesses`, el Dashboard del cliente refleja el cambio inmediatamente vía `addSnapshotListener`.
- **SÍ en Categorías:** Al agregar/desactivar en `/categories`, `CategoryRepository` notifica el nuevo estado.
- **SÍ en Productos Estrella y Flash Deals:** Escuchan `/featuredProducts` y `/flashDeals` en tiempo real.
- **NO en Precios Imperdibles:** Cualquier cambio en productos o precios promocionales en Firestore NO afectará el bloque de Precios Imperdibles por ser datos estáticos hardcoded en la APK.

### 5. Si creo un comercio completamente nuevo, ¿el Dashboard se construye con datos reales o aparecen datos de demostración?
- Se construye con **DATOS REALES** en las secciones: `Comercios Cerca de Ti` y `Categorías`. Si el nuevo comercio tiene `isFeatured: true`, también aparece en `Comercios Destacados ⭐`.
- Sin embargo, los productos en `Precios Imperdibles` seguirán mostrando las 5 hamburguesas/pizzas de demostración hardcoded.

---

## 🧭 2. AUDITORÍA DETALLADA POR MÓDULO (1 AL 13)

### 1. Encabezado del Cliente (Header)
- **Estado:** 🟡 REQUIERE REFRESH / MEJORA
- **Análisis de Código:**  
  `currentUserName` se calcula una sola vez con `remember { FirebaseAuth.getInstance().currentUser?.displayName ... ?: "Gerald" }`.
  Si el cliente edita su perfil desde `ProfileScreen` o Firestore, el nombre en el Dashboard NO se actualiza dinámicamente salvo que se recomponga la pantalla completa o se reinicie la app.
- **Badge Notificaciones:** Conectado a `notificationRepo.unreadCount` (Snapshot Listener a `users/{uid}/notifications`). 🟢 REAL-TIME.

### 2. Notificaciones
- **Estado:** 🟢 CERTIFICADO (Nivel Firestore + Local UI) / 🟡 PARCIAL (Nivel FCM DeepLink)
- **Análisis de Código:**  
  - Cuenta con `DeliveryFirebaseMessagingService` configurado en `AndroidManifest.xml` con 3 canales (`CHANNEL_ALARM_ID`, `CHANNEL_STATUS_ID`, `CHANNEL_LEGACY_ID`).
  - Escucha la subcolección `users/{uid}/notifications` ordenada por `sentAt DESC`.
  - Soporta marcado como leído (`isRead`, `read`, `readAt`), tracking de apertura (`openedAt`, `openCount`), y borrado por usuario (`deletedByUser`).

### 3. Carrito
- **Estado:** 🟢 HÍBRIDO (Local In-Memory durante Selección + Firestore Atómico en Checkout)
- **Análisis de Código:**  
  - `CartManager` mantiene `cartItems` y `cartItemCount` en memoria via `MutableStateFlow`.
  - Si la app se cierra antes de hacer checkout, el carrito se pierde (No hay persistencia SQLite/Room local).
  - Al presionar "Solicitar Envío", `CustomerHomeViewModel.placeOrder()` escribe el documento completo en `/orders` registrando `customerId`, `businessId`, `items`, `subtotal`, `deliveryFee`, `total`, `status: "pending"`, `courierPhase: 1`.

### 4. Dirección del Cliente
- **Estado:** 🔴 MOCK / HARDCODED
- **Análisis de Código:**  
  `CustomerHomeScreen.kt:L118` define `var deliveryAddressForOrder by remember { mutableStateOf("Mi dirección guardada") }`.  
  Al hacer clic, navega a `AddressManagerScreen`. Sin embargo, seleccionar una dirección en `AddressManagerScreen` no retorna el valor seleccionado al Dashboard. La tarifa se calcula con `simulatedDistance = 2.7 km` dando C$ 40.00 fijos.

### 5. Buscador Global
- **Estado:** 🟡 PARCIAL (Filtro Client-side de Comercios)
- **Análisis de Código:**  
  `filteredPublicBusinesses` filtra la lista en memoria `publicBusinesses` por coincidencia en `name`, `category` o `address`.  
  No realiza búsqueda en tiempo real sobre la colección de productos (`/products`) ni utiliza motores externos (Algolia).

### 6. Banner Publicitario
- **Estado:** 🟢 CERTIFICADO (Real-time Firestore)
- **Análisis de Código:**  
  `BannersSection.kt` renderiza un `HorizontalPager` conectado a `firebaseManager.listenToPromotionalBanners()`.  
  Lee la colección `/banners`. Si la colección está vacía, muestra un banner corporativo elegante de fallback.

### 7. Categorías
- **Estado:** 🟢 CERTIFICADO
- **Análisis de Código:**  
  Combina categorías dinámicas de los comercios cargados con `CategoryRepository` (escuchando `/categories` activas). Al seleccionar una categoría, filtra instantáneamente los comercios mostrados.

### 8. Comercios Cerca de Ti
- **Estado:** 🟡 PARCIAL (Sin ordenamiento GPS)
- **Análisis de Código:**  
  Muestra los comercios de la colección `/businesses` filtrando los válidos y activos (`isValidPublicCatalogItem()`). No calcula distancia Haversine real entre la coordenada del usuario y del comercio para ordenar.

### 9. Comercios Destacados ⭐
- **Estado:** 🟢 CERTIFICADO
- **Análisis de Código:**  
  Filtra `publicBusinesses` donde `isFeatured == true` || `featured == true`. Se actualiza en tiempo real cuando un administrador activa el flag desde AMI o Merchant Web.

### 10. Productos Estrella ⭐
- **Estado:** 🟢 CERTIFICADO
- **Análisis de Código:**  
  Escucha en tiempo real la colección `/featuredProducts` mapeada a la entidad `FeaturedProduct`.

### 11. Ofertas Flash ⚡
- **Estado:** 🟢 CERTIFICADO
- **Análisis de Código:**  
  Escucha en tiempo real la colección `/flashDeals` mapeada a la entidad `FlashDeal`.

### 12. Precios Imperdibles %
- **Estado:** 🔴 MOCK / HARDCODED
- **Análisis de Código:**  
  `CustomerHomeScreen.kt:L743-749` hardcodea una lista estática:
  - Hamburguesa Doble (C$ 180.00)
  - Pizza Familiar (C$ 350.00)
  - Combo Subway (C$ 150.00)
  - Pollo Frito x4 (C$ 220.00)
  - Café Capuccino (C$ 85.00)
  Agregar cualquiera de estos productos inserta un item con ID `"demo_comercio"` en el carrito.

### 13. Navegación Inferior
- **Estado:** 🟢 CERTIFICADO
- **Análisis de Código:**  
  `CustomerBottomNavigationBar.kt` gestiona los 5 elementos: Inicio, Favoritos, Carrito (FAB elevado), Pedidos y Perfil. Todos tienen callbacks funcionales y navegación por `NavController`.

---

## 🏆 3. MATRIZ FINAL DE CERTIFICACIÓN E2E

| Elemento | UI | Datos Reales | Firestore | Listener | Acción | E2E | Estado |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Header (Saludo/Avatar)** | ✅ | 🟡 Parcial | 🟡 Auth | 🔴 No | ❌ | 🟡 | 🟡 PARTIAL |
| **Notificaciones (Icono/Badge)** | ✅ | ✅ | ✅ `users/{uid}/notifications` | ✅ Realtime | ✅ Abre Dialog / Read | ✅ | 🟢 CERTIFIED |
| **Carrito (Icono/Badge/FAB)** | ✅ | ✅ | ✅ `orders` (Checkout) | ✅ StateFlow | ✅ Abre Cart / Order | ✅ | 🟢 CERTIFIED |
| **Dirección del Cliente** | ✅ | 🔴 Mock | 🔴 No | 🔴 No | 🟡 Abre Manager (Sin Return) | 🔴 | 🔴 MOCK |
| **Buscador Global** | ✅ | 🟡 Parcial | 🟡 In-Memory | 🔴 No | ✅ Filtra Comercios | 🟡 | 🟡 PARTIAL |
| **Banner Publicitario** | ✅ | ✅ | ✅ `banners` | ✅ Realtime | ✅ Navega a Comercio | ✅ | 🟢 CERTIFIED |
| **Categorías** | ✅ | ✅ | ✅ `categories` & `businesses` | ✅ Realtime | ✅ Filtra UI | ✅ | 🟢 CERTIFIED |
| **Comercios Cerca de Ti** | ✅ | ✅ | ✅ `businesses` | ✅ Realtime | ✅ Detalle Comercio | 🟡 | 🟡 PARTIAL (Sin GPS Sort) |
| **Comercios Destacados ⭐** | ✅ | ✅ | ✅ `businesses` (`isFeatured`) | ✅ Realtime | ✅ Detalle Comercio | ✅ | 🟢 CERTIFIED |
| **Productos Estrella ⭐** | ✅ | ✅ | ✅ `featuredProducts` | ✅ Realtime | ✅ Detalle Comercio | ✅ | 🟢 CERTIFIED |
| **Ofertas Flash ⚡** | ✅ | ✅ | ✅ `flashDeals` | ✅ Realtime | ✅ Detalle Comercio | ✅ | 🟢 CERTIFIED |
| **Precios Imperdibles %** | ✅ | 🔴 Mock | 🔴 No | 🔴 No | 🟡 Demo Add Cart | 🔴 | 🔴 MOCK |
| **Barra Navegación Inferior** | ✅ | ✅ | ✅ N/A | ✅ StateFlow | ✅ Navegación completa | ✅ | 🟢 CERTIFIED |

---

## 📋 4. RECOMENDACIONES TÉCNICAS DE CORRECCIÓN (Siguiente Sprint)
1. **Conectar Dirección Real:** Vincular la dirección mostrada en el Header con `users/{uid}/addresses` filtrando por `isDefault == true`.
2. **Reemplazar Precios Imperdibles MOCK:** Conectar este bloque a una consulta Firestore sobre `/promotions` o `/products` con `whereEqualTo("onSale", true)`.
3. **Búsqueda Global de Productos:** Extender el ViewModel para que la búsqueda consulte la colección `/products` además de `/businesses`.
4. **Geolocalización en Comercios Cerca de Ti:** Aplicar `GeoUtils.calculateDistance()` entre las coordenadas del cliente y cada documento de `/businesses` para ordenar ascendentemente por proximidad física.
