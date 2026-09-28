# Auditoría Técnica y de Arquitectura: Módulo Comercio (Business)
**Sistema**: BlueSystem Delivery v2.1 Enterprise  
**Fecha de Auditoría**: 30 de Julio de 2026  
**Auditor Lead**: Antigravity (Senior Developer & Auditor)  

---

## 1. Arquitectura del Módulo

Archivos del proyecto asociados al Módulo Comercio:

### Capa de Presentación (UI / ViewModels)
- `com/example/presentation/business/BusinessDashboardScreen.kt`: Pantalla principal del comercio. Gestiona la cocina digital, pedidos entrantes, en preparación, listos/en tránsito, rechazo de pedidos y barra de navegación inferior.
- `com/example/presentation/business/catalog/CatalogScreen.kt`: Vista principal del catálogo de productos. Grid de productos, barra de búsqueda en tiempo real, chips de estadísticas y menú contextual de acciones.
- `com/example/presentation/business/catalog/CatalogViewModel.kt`: ViewModel reactivo del catálogo. Gestiona estado de carga (`uiState`), filtros de búsqueda, activación/desactivación y borrado de productos.
- `com/example/presentation/business/catalog/ProductDialog.kt`: Diálogo modal para agregar/editar productos. Campos de nombre, descripción, precio, precio original (descuento), tiempo de preparación, categoría, stock y atributos (`isPopular`, `isVegetarian`, `isSpicy`).
- `com/example/presentation/business/analytics/AnalyticsScreen.kt`: Pantalla de estadísticas comerciales. Métricas de ventas, gráficos de volumen por estado de pedido y ranking de productos más vendidos.
- `com/example/presentation/business/analytics/AnalyticsViewModel.kt`: ViewModel de analíticas. Carga pedidos del comercio y calcula métricas financieras y operativas.

### Capa de Datos & Dominio (Repositories / Models)
- `com/example/data/repository/BusinessRepository.kt`: Repositorio de información del comercio (`BusinessInfo`). Escucha de comercios destacados e información general (`isOpen`, `deliveryFee`, `deliveryTime`, `schedule`).
- `com/example/data/repository/ProductRepository.kt`: Repositorio de productos. CRUD contra Firestore (`products`) y Firebase Storage (`product_images`), reordenamiento por batch y toggle de estado (`ACTIVE`, `INACTIVE`, `OUT_OF_STOCK`).
- `com/example/data/repository/AnalyticsRepository.kt`: Repositorio de analíticas comerciales.
- `com/example/domain/model/Product.kt`: Modelo de datos del producto, junto con los enums `ProductStatus` (`ACTIVE`, `INACTIVE`, `OUT_OF_STOCK`) y `ProductCategory` (`MAIN_COURSE`, `APPETIZER`, `DESSERT`, `BEVERAGE`, `COMBO`, `SPECIAL`).
- `com/example/domain/model/Analytics.kt`: Modelo de analíticas comerciales (`BusinessAnalytics`, `TopProductStat`, `SalesByDayStat`).

---

## 2. Árbol de Navegación

```
BusinessDashboardScreen
├── Pedidos (Cocina Digital)
│   ├── Nuevos (Pending / Payment Verifying)
│   │   ├── Aceptar Pedido (Mueve a Preparing)
│   │   └── Rechazar Pedido (Diálogo con motivo de rechazo)
│   ├── En Preparación (Preparing)
│   │   └── Marcar Listo / En Tránsito (Ready / In Transit)
│   └── Listos / En Camino (Ready / In Transit)
├── Catálogo (CatalogScreen)
│   ├── Agregar Producto (ProductDialog)
│   ├── Editar Producto (ProductDialog)
│   ├── Activar / Desactivar (Toggle ProductStatus)
│   └── Eliminar Producto (Status -> INACTIVE)
├── Analíticas (AnalyticsScreen)
│   ├── Total Ventas
│   ├── Total Pedidos
│   ├── Ticket Promedio
│   └── Productos Más Vendidos
└── Perfil Comercio / Ajustes
```

---

## 3. Matriz de Interfaces y Estado

| Nombre de Pantalla / Componente | Función Principal | Archivo de Origen | Estado Actual |
| :--- | :--- | :--- | :--- |
| **BusinessDashboardScreen** | Gestión de cocina digital en tiempo real, control de pedidos entrantes, cambio de estados y rechazos. | `BusinessDashboardScreen.kt` | **Completa** |
| **CatalogScreen** | Grid de productos del comercio con tarjetas reactivas, estadísticas rápidas de stock y filtros. | `CatalogScreen.kt` | **Completa** |
| **CatalogViewModel** | Lógica de negocio y sincronización reactiva del catálogo con Firestore. | `CatalogViewModel.kt` | **Completa** |
| **ProductDialog** | Formulario modal para creación y edición de producto con carga de imágenes. | `ProductDialog.kt` | **Bueno (Parcial)** |
| **AnalyticsScreen** | Panel de métricas de ventas, ticket promedio, gráficos de pedidos y top productos. | `AnalyticsScreen.kt` | **Completa** |
| **AnalyticsViewModel** | Cálculo reactivo de ventas totales, pedidos completados y productos populares. | `AnalyticsViewModel.kt` | **Completa** |

---

## 4. Funcionalidades de Productos

- [x] **Crear productos**: Soportado (`ProductRepository.addProduct`).
- [x] **Editar productos**: Soportado (`ProductRepository.updateProduct`).
- [x] **Eliminar productos**: Soportado vía borrado lógico (`ProductStatus.INACTIVE`).
- [ ] **Duplicar productos**: *No implementado*.
- [x] **Activar / Desactivar**: Soportado (`ProductRepository.toggleProductStatus`).
- [x] **Agotar producto**: Soportado (`ProductStatus.OUT_OF_STOCK`).
- [x] **Ocultar producto**: Soportado al pasar a `INACTIVE`.
- [x] **Ordenar productos**: Soportado mediante el campo `order` (`ProductRepository.reorderProducts`).
- [x] **Buscar productos**: Soportado en tiempo real en `CatalogScreen` (filtra por nombre y descripción).
- [ ] **Filtrar por categoría**: *No implementado en la UI* (la infraestructura del enum `ProductCategory` existe, pero falta el selector de filtro en pantalla).
- [ ] **Código interno**: *No implementado*.
- [ ] **SKU**: *No implementado*.
- [ ] **Código QR / Código de barras**: *No implementado*.

---

## 5. Menú y Estructura Comercial

- [x] **Categorías**: Enum `ProductCategory` (`MAIN_COURSE`, `APPETIZER`, `DESSERT`, `BEVERAGE`, `COMBO`, `SPECIAL`).
- [ ] **Subcategorías**: *No implementado*.
- [x] **Productos destacados / populares**: Soportado mediante el flag `@PropertyName("isPopular") val isPopular: Boolean`.
- [ ] **Menú del día**: *No implementado*.
- [x] **Combos**: Soportado mediante la categoría `ProductCategory.COMBO`.
- [ ] **Packs / Menús agrupados**: *No implementado*.
- [ ] **Recomendaciones inteligentes**: *No implementado*.
- [x] **Productos nuevos**: Ordenado por fecha de creación `createdAt` descendente.

---

## 6. Extras, Variantes y Opciones

- [ ] **Ingredientes adicionales**: *No implementado*.
- [ ] **Salsas / Aderezos**: *No implementado*.
- [ ] **Bebidas de acompañamiento**: *No implementado*.
- [ ] **Toppings**: *No implementado*.
- [ ] **Tamaños / Variantes de precio**: *No implementado*.
- [ ] **Opciones obligatorias / opcionales**: *No implementado*.
- [ ] **Límite de cantidad máxima por opción**: *No implementado*.
- [ ] **Precio adicional por extra**: *No implementado*.

---

## 7. Control de Inventario

- [x] **Stock (Cantidad en unidades)**: Soportado mediante `val stockQuantity: Int?`.
- [x] **Inventario ilimitado**: Soportado cuando `stockQuantity == null`.
- [ ] **Inventario por sucursal**: *No implementado* (los productos están vinculados globalmente al `businessId`).
- [x] **Alertas de Stock Bajo / Sin Stock**: Soportado en `CatalogStats` y tarjetas con badge `SIN STOCK`.
- [x] **Estado Producto Agotado**: Soportado vía `ProductStatus.OUT_OF_STOCK`.
- [ ] **Reposición automática / Lote**: *No implementado*.

---

## 8. Gestión de Imágenes

- [x] **Imagen principal**: Soportado (`val imageUrl: String`).
- [ ] **Galería de varias imágenes**: *No implementado* (soporta 1 sola imagen por producto).
- [ ] **Reordenar imágenes**: *No implementado*.
- [ ] **Eliminar imágenes individuales**: *No implementado*.
- [ ] **Compresión automática nativa**: *Pendiente de implementación en cliente* (la función `compressImage` en `ProductRepository` actualmente retorna los bytes originales).

---

## 9. Horarios y Disponibilidad Comercial

- [x] **Horario semanal**: Soportado como string descriptivo en `BusinessInfo` (`schedule`).
- [x] **Apertura / Cierre temporal**: Soportado mediante `isOpen: Boolean`.
- [ ] **Configurador gráfico de horarios por día**: *No implementado*.
- [ ] **Excepciones por Días Festivos**: *No implementado*.
- [ ] **Cierre automático por temporizador**: *No implementado*.

---

## 10. Promociones y Descuentos

- [x] **Descuentos sobre producto**: Soportado mediante `originalPrice` y `price` (calcula `% de descuento` y muestra precio tachado).
- [ ] **Cupones de comercio**: *No implementado a nivel de producto individual* (gestionado centralizadamente).
- [ ] **Happy Hour**: *No implementado*.
- [ ] **Promoción 2x1**: *No implementado*.
- [ ] **Envío Gratis configurado por comercio**: Soportado en `BusinessInfo` si `deliveryFee == 0.0`.

---

## 11. Pedidos (Acciones del Comercio)

El comercio puede realizar las siguientes acciones en `BusinessDashboardScreen`:
1. **Visualizar Pedidos Entrantes**: Pestaña "Nuevos" en tiempo real.
2. **Aceptar Pedido**: Cambia el estado a `PREPARING`.
3. **Rechazar Pedido**: Abre diálogo modal para ingresar motivo de rechazo y actualiza estado a `CANCELLED`.
4. **Marcar Listo / En Tránsito**: Cambia el estado a `READY` / `IN_TRANSIT`.
5. **Filtrar Pedidos**: Pestañas de estado (Nuevos, En Preparación, Listos/En camino).

---

## 12. Estadísticas e Indicadores Comercial

En `AnalyticsScreen.kt` se calculan y visualizan:
- **Total Ventas (C$)**: Suma monetaria acumulada de pedidos completados.
- **Total Pedidos**: Conteo absoluto de pedidos registrados.
- **Pedidos Completados**: Conteo de entregas exitosas.
- **Pedidos Cancelados**: Conteo de ordenes rechazadas o canceladas.
- **Ticket Promedio (C$)**: `Ventas Totales / Pedidos Completados`.
- **Top Productos Más Vendidos**: Ranking con unidades vendidas e ingresos generados.

---

## 13. Configuración del Comercio

Opciones disponibles en el modelo `BusinessInfo`:
- `nombre`: Nombre comercial.
- `logoUrl`: URL del logotipo.
- `bannerUrl`: URL del banner publicitario.
- `isOpen`: Interruptor Abierto / Cerrado en tiempo real.
- `deliveryFee`: Tarifa de envío.
- `deliveryTime`: Tiempo estimado de entrega (ej. "20-30 min").
- `isFeatured`: Flag de comercio destacado.
- `isActive`: Estado activo en la plataforma.
- `schedule`: Texto de horario.

---

## 14. Colecciones de Firestore Utilizadas

1. **`businesses`**: Expediente principal de los comercios.
2. **`products`**: Catálogo de productos.
3. **`orders`**: Pedidos asociados al comercio (`businessId`).
4. **`user_devices`**: Tokens FCM y dispositivos del comercio.
5. **`notifications`**: Notificaciones dirigidas al comercio.
6. **`audit_logs` / `audit_log`**: Bitácora de auditoría de acciones.

---

## 15. Estructura en Firebase Storage

- **`product_images/{productId}.jpg`**: Ruta donde se almacenan las fotografías de los productos del comercio.

---

## 16. Matriz de Seguridad y Restricciones

- **Rol**: `BUSINESS` (Comercio).
- **Permisos Asignados en RBAC (`PermissionManager`)**:
  - `CAN_VIEW_ORDER`
  - `CAN_VIEW_PRODUCTS`
  - `CAN_CREATE_PRODUCT`
  - `CAN_EDIT_PRODUCT`
  - `CAN_DELETE_PRODUCT`
  - `CAN_VIEW_INVENTORY`
  - `CAN_EDIT_INVENTORY`
  - `CAN_MANAGE_INVENTORY`
  - `CAN_VIEW_PAYMENTS`
- **Restricciones Críticas**:
  - No puede modificar precios o estados de ventas pasadas/completadas.
  - Bloqueo de transacciones financieras directas desde el portal de usuario.

---

## 17. Capacidades Offline (Resiliencia)

- **Lectura en Caché Local**: Los pedidos se respaldan en la base de datos local Room (`OfflineOrderDao`).
- **Cola de Sincronización Pendiente**: Las acciones realizadas sin conexión quedan en `PendingSyncManager`.

---

## 18. Integraciones y APIs Utilizadas

- **Firebase Authentication**: Autenticación del comercio.
- **Firebase Firestore**: Listeners reactivos (`addSnapshotListener`) con fallback de ordenamiento en memoria si falta un índice.
- **Firebase Storage**: Subida de imágenes de catálogo.
- **Firebase Cloud Messaging (FCM)**: Recepción de alertas de nuevos pedidos.

---

## 19. Funciones Pendientes (TODOs Encontrados)

1. `CatalogScreen.kt#L89`: `/* Cambiar modo vista */` - Toggle de vista lista/grid no implementado en el icono de la TopBar.
2. `ProductRepository.kt#L178`: `compressImage(bytes)` - La función retorna los bytes sin comprimir (`return bytes`).

---

## 20. Evaluación por Módulo

| Módulo / Subcomponente | Calificación | Estado y Observaciones |
| :--- | :--- | :--- |
| **Cocina Digital / Dashboard** | **Excelente** | Gestión de pedidos en tiempo real con fallback de índices. |
| **Catálogo de Productos** | **Bueno** | CRUD completo de productos con imágenes y stock simple. |
| **Estadísticas y Analíticas** | **Bueno** | Métricas financieras y ranking de productos operativos. |
| **Gestión de Stock / Inventario** | **Regular** | Soporta stock simple (unidades/ilimitado), pero sin alertas por lote o por sucursal. |
| **Variantes y Extras (Opciones)** | **No implementado** | No existe estructura para aderezos, tamaños ni modificadores. |
| **Gestión de Horarios Semanales** | **Regular** | Es un campo de texto plano, sin programador de horas. |
| **Combos y Packs** | **Incompleto** | Solo existe el enum `ProductCategory.COMBO`, pero no hay modelado de sub-productos. |

---

## Respuestas Técnicas Directas para la Auditoría

### 1. ¿Cómo está modelado actualmente un producto en Firestore?
Un producto se almacena como un documento plano en la colección `products`:
```json
{
  "id": "uuid-v4",
  "businessId": "uid-del-comercio",
  "name": "Hamburguesa Doble",
  "description": "Con queso cheddar y tocineta",
  "price": 250.0,
  "originalPrice": 300.0,
  "category": "MAIN_COURSE",
  "status": "ACTIVE",
  "imageUrl": "https://firebasestorage.googleapis.com/...",
  "preparationTimeMinutes": 15,
  "isPopular": true,
  "isVegetarian": false,
  "isSpicy": false,
  "allergens": ["gluten", "lacteos"],
  "calories": 650,
  "stockQuantity": 50,
  "order": 0,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### 2. ¿Cómo está modelado un combo?
Actualmente un combo **NO posee una estructura de sub-productos o paquete**. Se almacena exactamente como un `Product` estándar, utilizando el valor `ProductCategory.COMBO` en el atributo `category`.

### 3. ¿Cómo se almacenan los extras y variantes?
Actualmente **NO existen campos en el modelo `Product` ni subcolecciones para almacenar extras, aderezos, tamaños o variantes de precio**.

### 4. ¿Cómo se administran las categorías?
Las categorías están definidas mediante un enum fijo en Kotlin (`ProductCategory`): `MAIN_COURSE`, `APPETIZER`, `DESSERT`, `BEVERAGE`, `COMBO`, `SPECIAL`. No se administran dinámicamente en Firestore.

### 5. ¿Cómo se administran las imágenes?
Se administra una **única imagen principal** por producto mediante el campo `imageUrl: String`. La imagen se sube a Firebase Storage en la ruta `product_images/{productId}.jpg`.

### 6. ¿Cómo se relacionan las sucursales con los productos?
No existe relación de sucursales en el modelo de productos. El campo `businessId: String` vincula el producto a un comercio global único.

### 7. ¿Qué pantallas del comercio están terminadas y cuáles están en desarrollo?
- **Terminadas**: `BusinessDashboardScreen` (Cocina Digital), `CatalogScreen` (Catálogo), `AnalyticsScreen` (Analíticas).
- **En Desarrollo / Pendientes**: Pantalla de Configuración Avanzada de Sucursales y Administrador de Horarios Diarios.

### 8. ¿Qué funcionalidades existen pero aún no son accesibles desde la interfaz?
- Reordenamiento batch de productos (`ProductRepository.reorderProducts`).
- Toggle de vista Grid/Lista en `CatalogScreen` (el botón de icono existe pero la acción está vacía).

### 9. ¿Qué limitaciones técnicas tiene actualmente el módulo?
1. Falta de modificadores/extras (imprescindible para restaurantes con opciones personalizables).
2. Ausencia de multi-sucursal a nivel de inventario.
3. Las categorías son estáticas (enum) y no dinámicas por comercio.
4. Compresión de imágenes en blanco (retorna bytes sin optimizar).

### 10. ¿Qué recomienda Antigravity mejorar antes de pasar a producción?
1. **Modelar Variantes y Extras**: Incorporar la estructura `ProductOptionGroup` (ej. Tamaño, Aderezos, Bebida) con precios adicionales.
2. **Categorías Dinámicas por Comercio**: Permitir que cada comercio cree sus propias categorías de menú.
3. **Activar Compresión Real de Imágenes**: Implementar compresión WebP/JPEG antes de subir a Firebase Storage para optimizar consumo de ancho de banda.
4. **Soporte Multi-Imagen**: Permitir una galería de hasta 3-5 fotos por producto.
