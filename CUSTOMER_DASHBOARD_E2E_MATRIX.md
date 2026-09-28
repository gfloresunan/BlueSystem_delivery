# CUSTOMER DASHBOARD E2E MATRIX — SPRINT MER 18.0
**Sistema:** BlueSystem Delivery Enterprise  
**Módulo:** Dashboard Principal del Cliente (`CustomerHomeScreen.kt`)  
**Fecha:** 17 de Agosto, 2026

---

## 🌐 MATRIZ DE SINCRONIZACIÓN E2E TRIPARTITA

Esta matriz certifica el flujo de datos bidireccional entre la App Cliente Android, Firestore, Merchant Web y AMI (Admin Dashboard).

| Flujo de Información | App Cliente (APK) | Firestore Collection | Merchant Web | AMI (Admin Dashboard) | E2E Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Nombre / Perfil Usuario** | Recibe via `users/{uid}` listener | `users/{uid}` | Visualiza cliente en pedidos | Muestra en gestión de usuarios | 🟢 CERTIFIED |
| **Dirección Predeterminada** | Enlaza `isDefault == true` en Header | `users/{uid}/addresses` | Recibe dirección en `/orders` | Visualiza mapa de entrega | 🟢 CERTIFIED |
| **Banners Promocionales** | Visualiza carrusel en tiempo real | `/banners` | Edita/elimina banners | Crea/desactiva campañas | 🟢 CERTIFIED |
| **Categorías de Comercio** | Filtra comercios por categoría | `/categories` | Administra categorías | Controla catálogo global | 🟢 CERTIFIED |
| **Comercios y Apertura** | Visualiza `isOpen` y distancia GPS | `/businesses` | Alterna abierto/cerrado | Gestiona estado del comercio | 🟢 CERTIFIED |
| **Comercios Destacados ⭐**| Muestra en cinta "Destacados" | `/businesses` (`isFeatured`) | Solicita destaque | Aprobar/Activar flag destaque | 🟢 CERTIFIED |
| **Productos Estrella ⭐** | Visualiza cards "Estrella" | `/featuredProducts` | Define productos top | Modifica destacados globales | 🟢 CERTIFIED |
| **Ofertas Flash ⚡** | Muestra ofertas con contador | `/flashDeals` | Configura descuento flash | Monitorea promociones | 🟢 CERTIFIED |
| **Precios Imperdibles %**| Visualiza productos en oferta real | `/featuredProducts` & `/promotions` | Modifica precios de producto | Revisa métricas de venta | 🟢 CERTIFIED |
| **Creación de Pedidos** | Envía pedido desde Carrito | `/orders` (`status: "pending"`) | Alerta sonora + KDS | Torre de Control Delivery | 🟢 CERTIFIED |
| **Notificaciones Push** | Recibe badges y notificaciones | `users/{uid}/notifications` | Envía updates de pedido | Emite campañas masivas | 🟢 CERTIFIED |
| **Favoritos** | Almacena y lista favoritos | `users/{uid}/favorites` | N/A | Analítica de popularidad | 🟢 CERTIFIED |

---

## 🧪 PROTOCOLO DE PRUEBA FRESH CLIENT & FRESH MERCHANT

### Prueba 1: Fresh Customer (Cliente Nuevo Limpio)
1. Se crea un usuario cliente nuevo desde el módulo de autenticación.
2. Al abrir el Dashboard:
   - El Header muestra el nombre del nuevo usuario (o su prefijo de correo) sin referencias a nombres previos ("Gerald").
   - El selector de dirección indica `"Seleccionar dirección 📍"` si no tiene direcciones guardadas.
   - Las secciones de Banners, Categorías, Comercios y Productos muestran **EXCLUSIVAMENTE** datos reales leídos de Firestore.
   - Si una sección no tiene documentos cargados en Firestore, se presenta una tarjeta de estado vacío elegante sin fallbacks hardcoded.

### Prueba 2: Fresh Merchant & Realtime Propagation (Comercio Nuevo en Vivo)
1. Se registra un nuevo comercio en la Web de Comercios/AMI.
2. Se agrega un producto y se marca como destacado (`isFeatured = true`).
3. **Resultado:** En el Dashboard de la APK Cliente, el comercio y sus productos promocionales aparecen instantáneamente en la cinta de **Comercios Destacados ⭐** sin necesidad de cerrar sesión ni reinstalar la APK.
