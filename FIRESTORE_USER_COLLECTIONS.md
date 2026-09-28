# FIRESTORE_USER_COLLECTIONS.md
# Colecciones Firestore Relacionadas con Usuarios — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Extraído del código fuente. Sin suposiciones.
> **Método**: Análisis de todas las llamadas `.collection("...")` en archivos `.kt` del proyecto.

---

## 1. Colecciones Directamente Relacionadas con Usuarios

### `/users/{uid}` — Colección Principal de Usuarios
**Referencias en código**: `AuthManager.kt`, `FirebaseManager.kt`, `AdminUsersViewModel.kt`, `ProfileViewModel.kt`, múltiples repositorios.

| Campo | Tipo | Descripción |
|---|---|---|
| `uid` | String | UID de Firebase Auth (PK) |
| `nombre` | String | Nombre completo |
| `name` | String | Alias en inglés |
| `email` | String | Correo electrónico |
| `telefono` | String | Teléfono principal |
| `phone` | String | Alias en inglés |
| `userType` | String | Tipo de usuario |
| `role` | String | Rol autoritativo |
| `rol` | String | Alias en español |
| `requestedRole` | String | Rol solicitado pendiente |
| `active` | Boolean | Estado activo |
| `isActive` | Boolean | Alias de active |
| `fechaRegistro` | String | Timestamp de registro |
| `photoUrl` | String | URL de foto |
| `updatedAt` | Timestamp | Última actualización (set en updateUserRole) |

#### Subcolecciones de `/users/{uid}`:

| Subcolección | Documento | Campos |
|---|---|---|
| `preferences` | `settings` | `theme`, `language` |
| `notificationSettings` | `settings` | `pushEnabled`, `emailEnabled`, `orderUpdates` |
| `shoppingCart` | `cart` | `items[]`, `updatedAt` |
| `favorites` | `list` | `businessIds[]`, `productIds[]` |
| `role_history` | (múltiples) | `previousRole`, `newRole`, `changedBy`, `changedAt`, `reason` |
| `addresses` | (múltiples) | `fullAddress`, `latitude`, `longitude`, `isDefault`, `label` |

---

## 2. Colecciones de Pedidos (Relacionan Usuarios)

### `/orders/{orderId}`
**Referencias en código**: `FirebaseManager.kt`, `MerchantOrdersRepository.kt`, `DeliveryControlTowerRepository.kt`, `MerchantDashboardRepository.kt`

| Campo de Relación | Referencia |
|---|---|
| `customerId` | UID del cliente |
| `clienteId` | UID del cliente (legacy) |
| `businessId` | UID del comercio |
| `assignedCourierId` | UID del motorizado |
| `motorizadoId` | UID del motorizado (legacy) |
| `customerName` | Nombre del cliente (desnormalizado) |
| `customerPhone` | Teléfono del cliente (desnormalizado) |
| `businessName` | Nombre del comercio (desnormalizado) |
| `branchId` | ID de sucursal |

---

## 3. Colecciones de Ubicaciones

### `/ubicaciones_repartidores/{motorizadoId}`
**Referencias en código**: `FirebaseManager.kt:30-38`, `CourierViewModel.kt`

| Campo | Tipo |
|---|---|
| `motorizadoId` | String (UID del motorizado) |
| `coordenadas.latitud` | Double |
| `coordenadas.longitud` | Double |
| `geohash` | String |
| `ultimaActualizacion` | String |
| `estadoDisponibilidad` | String ("disponible", "en_ruta", "offline") |

---

## 4. Colecciones de Productos/Menú

### `/products/{productId}`
| Campo de Relación | Referencia |
|---|---|
| `businessId` | UID del comercio propietario |
| `restaurantId` | ID del restaurante (en módulos de menú) |
| `status` | `ACTIVE`, `INACTIVE` |

### `/menu_products/{id}`, `/menu_categories/{id}`, `/menu_combos/{id}`, `/menu_options/{id}`, `/menu_option_groups/{id}`, `/menu_variants/{id}`, `/menu_promotions/{id}`, `/menu_versions/{id}`, `/menu_snapshots/{id}`, `/availability_schedules/{id}`
- Todas filtradas por `restaurantId` o `businessId`.

---

## 5. Colecciones de Infraestructura

### `/audit_logs/{id}` — AuditLogger
| Campo | Tipo |
|---|---|
| `event` | String |
| `details` | Map |
| `severity` | String (SECURITY, INFO, etc.) |
| `uid` | String |
| `timestamp` | Timestamp |

### `/heartbeats/{uid}` — HealthMonitor
| Campo | Tipo |
|---|---|
| `uid` | String |
| `role` | String |
| `timestamp` | Timestamp |
| `sessionMode` | String |

### `/sessions/{sessionId}` — SessionManager
| Campo | Tipo |
|---|---|
| `uid` | String |
| `deviceId` | String |
| `startedAt` | Timestamp |

### `/banners/{id}` — Banners Promocionales
| Campo | Tipo |
|---|---|
| `imageUrl` | String |
| `title` | String |
| `actionType` | String |
| `actionId` | String |
| `isActive` | Boolean |

### `/categories/{id}` — Categorías de Comercio

### `/coupons/{id}` — Cupones

---

## 6. Colecciones NO Encontradas en Código

Las siguientes colecciones son **inexistentes** en el código fuente actual:

| Colección Esperada | Estado |
|---|---|
| `businesses` | ❌ No referenciada |
| `employees` | ❌ No referenciada |
| `staff` | ❌ No referenciada |
| `branch_users` | ❌ No referenciada |
| `business_users` | ❌ No referenciada |
| `invitations` | ❌ No referenciada |
| `permissions` | ❌ No referenciada (como colección Firestore) |
| `devices` | ❌ No referenciada |
| `branches` | ❌ No referenciada (solo existe como campo en documentos) |
| `restaurants` | ❌ No referenciada |
