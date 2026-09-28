# USER_DATA_MODEL.md
# Modelo de Datos del Usuario — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Extraído del código fuente. Sin suposiciones.
> **Fuente**: `Models.kt:234-251`, `AuthManager.kt:44-57`, `AuthManager.kt:206-213`

---

## 1. Modelo Principal: `AppUser` (Firestore: `/users/{uid}`)

```kotlin
@IgnoreExtraProperties
data class AppUser(
    val uid: String = "",            // UID de Firebase Auth (PK)
    val nombre: String = "",         // Nombre completo (campo principal)
    val name: String = "",           // Alias en inglés (duplicado para compatibilidad)
    val email: String = "",          // Correo electrónico
    val telefono: String = "",       // Teléfono (campo principal)
    val phone: String = "",          // Alias en inglés (duplicado para compatibilidad)
    val userType: String = "",       // Tipo: "customer", "driver", "business", "admin"
    val role: String = "",           // Rol (inglés) — valor autoritativo actual
    val rol: String = "",            // Rol (español) — duplicado por compatibilidad
    val requestedRole: String = "",  // Rol solicitado pendiente de aprobación por admin
    val active: Boolean = true,      // Estado activo/inactivo
    val isActive: Boolean = true,    // Alias de active (campo de Firebase)
    val fechaRegistro: String = "",  // Timestamp de registro (milisegundos como String)
    val photoUrl: String = ""        // URL de foto de perfil
)
```

### Notas de diseño importantes
- **Triple redundancia de rol**: El sistema almacena el rol en `userType`, `role` y `rol`. La lectura siempre busca en ese orden: `role ?: rol ?: userType`.
- **No existen campos**: `businessId`, `branchId`, `permissions`, `featureFlags`, `tenantId` en `AppUser`. La relación con el comercio se establece mediante el UID del usuario que coincide con el `businessId` en los pedidos.

---

## 2. Modelo Legado: `Usuario` (Colección `/ubicaciones_repartidores`)

```kotlin
@IgnoreExtraProperties
data class Usuario(
    val uid: String = "",
    val nombre: String = "",
    val telefono: String = "",
    val rol: String = "",            // "admin", "motorizado", "cliente"
    val fechaRegistro: String = "",
    val detallesVehiculo: DetallesVehiculo? = null
)
```

---

## 3. Modelo de Motorizado: `DriverUser`

```kotlin
data class DriverUser(
    val uid: String = "",
    val nombre: String = "",
    val email: String = "",
    val telefono: String = "",
    val userType: String = "",
    val active: Boolean = false
)
```

---

## 4. Documento Firestore creado en Registro (`/users/{uid}`)

Al registrarse, `AuthManager.registrarUsuario()` escribe los siguientes campos:

```json
{
  "uid": "<firebase_uid>",
  "email": "<email>",
  "nombre": "<nombre_completo>",
  "name": "<nombre_completo>",
  "telefono": "<telefono>",
  "phone": "<telefono>",
  "userType": "<customer|driver|business>",
  "role": "<customer|driver|business>",
  "rol": "<customer|driver|business>",
  "active": true,
  "isActive": true,
  "fechaRegistro": "<milisegundos_como_string>"
}
```

---

## 5. Subcolecciones del Usuario (`/users/{uid}/...`)

Creadas automáticamente al registro:

| Subcolección | Documento | Campos |
|---|---|---|
| `preferences` | `settings` | `theme: "dark"`, `language: "es"` |
| `notificationSettings` | `settings` | `pushEnabled: true`, `emailEnabled: true`, `orderUpdates: true` |
| `shoppingCart` | `cart` | `items: []`, `updatedAt: <timestamp>` |
| `favorites` | `list` | `businessIds: []`, `productIds: []` |
| `role_history` | (múltiples) | `previousRole`, `newRole`, `changedBy`, `changedAt`, `reason` |

---

## 6. Campos de Registro de Pedido Relacionados con Usuario

El documento `/orders/{orderId}` referencia al usuario mediante:
```json
{
  "clienteId": "<uid_cliente>",
  "customerId": "<uid_cliente>",
  "businessId": "<uid_comercio>",
  "assignedCourierId": "<uid_motorizado>",
  "motorizadoId": "<uid_motorizado>",
  "customerName": "<nombre>",
  "customerPhone": "<telefono>"
}
```

---

## 7. Campos Ausentes (No Implementados en AppUser)

| Campo | Estado |
|---|---|
| `businessId` | ❌ No existe en AppUser. Se usa el UID del usuario como identificador del negocio |
| `branchId` | ❌ No existe en AppUser |
| `permissions[]` | ❌ No existe en AppUser |
| `featureFlags` | ❌ No existe en AppUser |
| `tenantId` | ❌ No existe en AppUser |
| `lastLoginAt` | ❌ No existe |
| `deviceTokens[]` | ❌ No existe directamente en AppUser |
