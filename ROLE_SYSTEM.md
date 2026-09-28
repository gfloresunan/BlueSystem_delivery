# ROLE_SYSTEM.md
# Sistema de Roles — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Extraído del código fuente. Sin suposiciones.
> **Fuentes**: `OrderLifecycleEngine.kt:7-14`, `PolicyEngineImpl.kt`, `SplashViewModel.kt`, `AdminUsersScreen.kt:306`

---

## 1. Definición Formal de Roles (Enum `UserRole`)

**Archivo**: `app/src/main/java/com/example/domain/engine/order/OrderLifecycleEngine.kt:7-14`

```kotlin
enum class UserRole {
    CLIENT,
    COOK,
    CASHIER,
    SUPERVISOR,
    OWNER,
    ADMIN
}
```

**Nota**: `DRIVER` **no existe** en el enum `UserRole`. El driver es tratado por su `userType` en Firestore, pero no tiene una entrada en el `UserRole` del dominio de pedidos.

---

## 2. Roles en Firestore (Strings)

Los roles se almacenan como strings en Firestore y son referenciados por múltiples campos:

| Campo Firestore | Valores Observados en Código |
|---|---|
| `userType` | `"customer"`, `"driver"`, `"business"`, `"admin"`, `"comercio"`, `"merchant"`, `"owner"`, `"courier"`, `"motorizado"` |
| `role` | `"CLIENT"`, `"BUSINESS"`, `"DRIVER"`, `"ADMIN"` (en AdminUsersScreen) |
| `rol` | Alias en español de `role` |

---

## 3. Roles en el Panel de Administración

**Archivo**: `AdminUsersScreen.kt:306`

```kotlin
val roles = listOf("CLIENT", "BUSINESS", "DRIVER", "ADMIN")
```

El admin puede asignar únicamente estos 4 roles desde la UI.

---

## 4. Routing por Rol en Splash

**Archivo**: `SplashViewModel.kt:68-72`

```kotlin
val targetRoute = when (userType.lowercase()) {
    "driver", "motorizado", "courier"        -> "courier"
    "admin"                                  -> "admin"
    "business", "comercio", "merchant", "owner" -> "business_dashboard"
    else                                     -> "solicitar_envio"
}
```

| Rol (Firestore) | Pantalla de Destino |
|---|---|
| `driver / motorizado / courier` | Módulo Motorizado |
| `admin` | Panel de Administración |
| `business / comercio / merchant / owner` | Business Dashboard |
| `customer` (default) | Solicitar Envío (Home Cliente) |

---

## 5. Roles en ProfileScreen

**Archivo**: `ProfileScreen.kt:300-301`

```kotlin
val isBusinessUser = userRole in listOf("business", "comercio", "merchant", "owner", "admin")
```

Esto determina si se muestra la sección de perfil de negocio en la pantalla de perfil.

---

## 6. Pantallas Consumidoras por Rol

| Módulo / Pantalla | Roles con Acceso |
|---|---|
| `AdminUsersScreen` | `ADMIN` |
| `BusinessDashboardScreen` | `business`, `comercio`, `merchant`, `owner` |
| `MerchantOperationsDashboardScreen` | `business`, `owner` |
| `MerchantOperationsCenterScreen` (MOOC) | `business`, `owner` |
| `DeliveryControlTowerScreen` (DCT) | `business`, `owner` |
| `RestaurantSettingsCenterScreen` (RSC) | `business`, `owner` |
| `MerchantFinanceCenterScreen` (MFC) | `business`, `owner` |
| `CourierDashboard` | `driver`, `motorizado`, `courier` |
| `CustomerHomeScreen` | `customer` (default) |
| `KDS (Kitchen Display)` | Acceso por `businessId`, sin validación de rol explícita en UI |

---

## 7. Roles en el Domain Engine (OrderLifecycleEngine)

| Estado Comercial | Roles Autorizados |
|---|---|
| `PENDING_PAYMENT` | `CLIENT`, `CASHIER`, `ADMIN` |
| `CONFIRMED` | `CASHIER`, `SUPERVISOR`, `OWNER`, `ADMIN` |
| `CANCELLED` | `CLIENT`, `CASHIER`, `SUPERVISOR`, `OWNER`, `ADMIN` |
| `REFUNDED` | `SUPERVISOR`, `OWNER`, `ADMIN` |

| Estado Operativo (Cocina) | Roles Autorizados |
|---|---|
| `QUEUED` | Todos (automático) |
| `PREPARING` | `COOK`, `SUPERVISOR`, `ADMIN` |
| `ASSEMBLING` | `COOK`, `SUPERVISOR`, `ADMIN` |
| `READY` | `COOK`, `SUPERVISOR`, `ADMIN` |
| `PACKED` | `CASHIER`, `SUPERVISOR`, `ADMIN` |
| `OUT_FOR_DELIVERY` | `CASHIER`, `SUPERVISOR`, `ADMIN` |
| `DELIVERED` | `CASHIER`, `SUPERVISOR`, `ADMIN` |

---

## 8. Solicitud de Cambio de Rol

**Archivo**: `FirebaseManager.kt:669-687`

Un usuario puede **solicitar** cambio de rol a `"business"` o `"courier"`. El admin debe aprobar o rechazar:
```kotlin
val validRoles = listOf("business", "courier", null)
```
Se escribe en `requestedRole` en Firestore. El admin lo ve en la pestaña de solicitudes pendientes.

---

## 9. Inconsistencias Detectadas

| Inconsistencia | Descripción |
|---|---|
| `DRIVER` falta en `UserRole` enum | Existe en Firestore y en AdminUsersScreen pero no en el enum de dominio |
| Triple campo de rol | `userType`, `role`, `rol` almacenan el mismo valor — redundancia sin sincronización garantizada |
| Roles en inglés vs español | `"comercio"`, `"motorizado"` coexisten con `"business"`, `"driver"` sin normalización |
| `COOK` en enum pero sin rol Firestore | `COOK` existe en el enum pero no en el listado de roles de Admin (UI) ni como `userType` en Firestore |
| `SUPERVISOR`, `CASHIER`, `OWNER` en PolicyEngine pero no en AdminUsersScreen | No son asignables desde la UI de admin |
