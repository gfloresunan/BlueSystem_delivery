# C2D.25E.5 — FIRESTORE CONTRACT SPECIFICATION
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Mapa Canónico de Colecciones Firestore Consumidas por Flutter

| Colección Firestore | Documento / Schema | Propósito | Operaciones Flutter |
| :--- | :--- | :--- | :--- |
| `/tenants/{tenantId}` | `TenantEntity` | Entidad raíz del tenant | `get`, `watch` (Read-only) |
| `/brands/{brandId}` | `BrandEntity` | Identidad de marca y `BrandVisualConfig` | `get`, `watch` (Read-only) |
| `/subscriptions/{subId}` | `SubscriptionEntity` | Contrato comercial, cuotas y módulos | `get`, `watch` (Read-only) |
| `/app_configs/{configId}` | `AppConfigEntity` | Configuración de distribución y feature flags | `get`, `query` (Read-only) |
| `/orders/{orderId}` | `OrderEntity` | Pedidos comerciales de entrega | `get`, `watch`, `create`, `updateStatus` |
| `/deliveryTrips/{tripId}` | `TripEntity` | Viajes punto a punto X→Y | `get`, `watch`, `create`, `updateStatus` |
| `/ubicaciones_repartidores/{courierId}` | `CourierLocationEntity` | Telemetría GPS en tiempo real | `set` (Merge), `watch` |
| `/users/{uid}` | `UserProfileEntity` | Perfil de usuario y memberships | `get`, `update` |

---

### 2. Aislamiento y Reglas de Seguridad

- **Restricción Multi-Tenant:** Cualquier lectura o escritura que intente acceder a un documento con `tenantId != request.auth.token.tenantId` es rechazada inmediatamente por `firestore.rules`.
- **Zero Mock Data:** Todas las entidades implementadas en `flutter_client/lib/domain/entities/` mapean directamente contra las colecciones reales de Firestore.
