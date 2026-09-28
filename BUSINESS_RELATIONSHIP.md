# BUSINESS_RELATIONSHIP.md
# Relación Usuario–Comercio–Sucursal — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Extraído del código fuente. Sin suposiciones.
> **Fuentes**: `Models.kt`, `FirebaseManager.kt`, `BusinessDashboardScreen.kt`, `MerchantOrdersRepository.kt`

---

## 1. Modelo de Relación Actual

```
Firebase Auth UID
       │
       ▼
/users/{uid}              ← Perfil del usuario
  role: "business"
  nombre: "..."
       │
       │   (el UID del usuario es también el businessId)
       ▼
/orders/{orderId}
  businessId: "{uid}"     ← El UID del comercio se usa como businessId en pedidos
  branchId: "main_branch" ← Referencia a sucursal
       │
       ▼
/products/{productId}
  businessId: "{uid}"
```

### Relación de identidad crítica

> **El UID del usuario con rol `business`/`owner` ES el `businessId`.**
> No existe una colección separada `businesses/` ni un ID de comercio distinto al UID del usuario.
> Esta es la relación de identidad fundamental del sistema actual.

---

## 2. Respuestas Directas Basadas en Código

### ¿Puede un usuario pertenecer a varios restaurantes?
**❌ No.** El sistema actual vincula a un usuario a un único restaurante mediante su UID. No existe tabla puente ni estructura multi-restaurante por usuario.

### ¿Puede un empleado trabajar en varias sucursales?
**❌ No implementado.** El modelo `AppUser` no tiene `branchId`. Los pedidos sí tienen `branchId` pero los usuarios no.

### ¿Existe tabla puente (business_users / employees)?
**❌ No existe.**
- No hay colección `employees` en Firestore (no se referencia en ningún archivo del proyecto).
- No hay colección `business_users`.
- No hay colección `branch_users`.
- No hay colección `staff`.

### ¿Existe colección `businesses`?
**❌ No referenciada.** Ningún archivo Kotlin hace `.collection("businesses")`. Los datos del comercio se almacenan en `/users/{uid}` con `role = "business"`.

---

## 3. Modelo `BranchConfig` (Domain — Sprint 15.5)

```kotlin
data class BranchConfig(
    val branchId: String = "main_branch",
    // ... configuración de la sucursal
)
```

**Fuente**: `domain/model/settings/BranchConfig.kt`

La sucursal existe como **objeto embebido** dentro de `RestaurantSettings`, no como documento independiente en Firestore con su propia colección.

---

## 4. Colecciones Relacionadas con Comercio

| Colección | Campo de Relación | Tipo |
|---|---|---|
| `/orders/{id}` | `businessId = uid_del_comercio` | Pedidos del comercio |
| `/products/{id}` | `businessId = uid_del_comercio` | Catálogo del comercio |
| `/users/{uid}` | El propio documento es el comercio | Perfil del comercio |
| `/restaurant_settings/{uid}` | Inferido del UID | Configuración (Sprint 15.5) |

---

## 5. Flujo de Relación en BusinessDashboard

**Archivo**: `BusinessDashboardScreen.kt:81`

```kotlin
val currentUid = remember { FirebaseAuth.getInstance().currentUser?.uid ?: "" }
// ...
.whereEqualTo("businessId", currentUid)
```

El dashboard del comercio usa el UID del usuario autenticado directamente como `businessId` para filtrar pedidos. No hay ningún paso de resolución intermediario.

---

## 6. Diagrama de Relación Actual

```
┌──────────────────────────────────────────────────────┐
│                  Firebase Auth                       │
│  UID: "abc123"                                       │
└──────────────────────┬───────────────────────────────┘
                       │
            ┌──────────▼──────────┐
            │  /users/abc123      │
            │  role: "business"   │
            │  nombre: "Restaurante X" │
            └──────────┬──────────┘
                       │ (uid como businessId)
          ┌────────────┼────────────────┐
          │            │                │
    ┌─────▼────┐ ┌─────▼────┐ ┌────────▼────┐
    │ /orders/ │ │/products/│ │/restaurant_ │
    │ businessId│ │businessId│ │settings/    │
    │ = "abc123"│ │= "abc123"│ │uid          │
    └──────────┘ └──────────┘ └─────────────┘
```

---

## 7. Limitaciones Identificadas

| Limitación | Impacto |
|---|---|
| 1 usuario = 1 comercio máximo | No se puede gestionar una cadena de restaurantes con un mismo usuario |
| Sin colección `employees` | El personal adicional (cajeros, supervisores, cocineros) no puede tener cuentas separadas vinculadas al comercio |
| Sin colección `branches` | Las sucursales son objetos de configuración, no entidades Firestore independientes |
| Sin tabla puente | No existe forma de asignar múltiples empleados a un comercio ni a una sucursal |
| Sin jerarquía de permisos por sucursal | Un empleado no puede ser "cajero de Sucursal Norte" específicamente |
