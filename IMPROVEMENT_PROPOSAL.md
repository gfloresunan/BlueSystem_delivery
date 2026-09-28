# IMPROVEMENT_PROPOSAL.md
# Propuesta de Mejoras del Sistema de Usuarios, Roles y Permisos
# BlueSystem Delivery Enterprise

> **IMPORTANTE**: Este documento es una **propuesta** únicamente.
> **No implementar sin aprobación explícita del equipo.**
> Todas las mejoras respetan la Frozen Core Policy y la ADR-003.

---

## 1. Normalización del Modelo de Roles

### Propuesta 1.1 — Enum Unificado de Roles
Consolidar todos los roles en un único enum canónico:

```kotlin
enum class UserRole {
    // Roles de plataforma
    ADMIN,          // Administrador de BlueSystem
    
    // Roles de comercio
    OWNER,          // Propietario del restaurante
    MANAGER,        // Gerente general
    SUPERVISOR,     // Supervisor de turno
    CASHIER,        // Cajero
    COOK,           // Cocinero / KDS
    
    // Roles externos
    DRIVER,         // Motorizado
    CLIENT,         // Cliente final
    GUEST           // Invitado (no autenticado)
}
```

### Propuesta 1.2 — Campo Único de Rol en AppUser
Eliminar la triple redundancia y mantener solo `role: String`:

```kotlin
data class AppUser(
    val uid: String = "",
    val role: UserRole = UserRole.CLIENT,   // Único campo de rol
    // Eliminar: userType, rol
)
```

---

## 2. Modelo de Empleados y Comercio

### Propuesta 2.1 — Colección `employees`

```
/employees/{employeeId}
  uid: String            ← Firebase Auth UID
  businessId: String     ← UID del comercio
  branchId: String?      ← Sucursal asignada (null = todas)
  role: UserRole         ← Rol dentro del comercio
  status: "active" | "suspended" | "pending"
  invitedBy: String      ← UID del OWNER que invitó
  invitedAt: Timestamp
  acceptedAt: Timestamp?
  permissions: List<String>  ← Overrides opcionales
```

### Propuesta 2.2 — Separar `businesses` de `users`

```
/businesses/{businessId}
  ownerUid: String       ← Referencia al dueño
  name: String
  taxId: String
  branchIds: List<String>
  createdAt: Timestamp

/branches/{branchId}
  businessId: String
  name: String
  address: String
  gps: GeoPoint
  employeeIds: List<String>
```

---

## 3. Sistema de Invitaciones

### Propuesta 3.1 — Flujo de Invitación

```
OWNER genera invitación
        ↓
/invitations/{token}
  businessId: String
  branchId: String?
  role: UserRole          ← Rol pre-asignado
  invitedEmail: String?
  invitedPhone: String?
  createdBy: String       ← UID del OWNER
  createdAt: Timestamp
  expiresAt: Timestamp    ← 48h por defecto
  status: "pending" | "accepted" | "expired" | "cancelled"
        ↓
Empleado recibe link: bluesystem://invite/{token}
        ↓
Se registra o inicia sesión
        ↓
Sistema valida token + crea /employees/{uid}
        ↓
Empleado accede directamente al módulo de su rol
```

---

## 4. PolicyEngine Ampliado

### Propuesta 4.1 — Más PolicyActions

```kotlin
enum class PolicyAction {
    // Menú
    PUBLISH_MENU, CREATE_PRODUCT, EDIT_PRODUCT, DELETE_PRODUCT, EDIT_PRICE,
    
    // Finanzas
    VIEW_FINANCES, EXPORT_REPORT, VIEW_COMMISSIONS,
    
    // Pedidos
    CONFIRM_ORDER, CANCEL_ORDER, REFUND_ORDER, ASSIGN_DRIVER,
    
    // Personal
    INVITE_EMPLOYEE, SUSPEND_EMPLOYEE, CHANGE_EMPLOYEE_ROLE,
    
    // Sistema
    PUBLISH_MENU, EXECUTE_ROLLBACK, OPEN_RESTAURANT,
    CLOSE_CASH_REGISTER, EDIT_SETTINGS
}
```

### Propuesta 4.2 — Custom Claims en Firebase Auth

```
Admin Console → Función Cloud Function:
onUserCreate → asigna Custom Claims:
  { "role": "business", "businessId": "xxx", "tenantId": "xxx" }
```

Esto permitiría validar en Firestore Security Rules:
```javascript
allow read: if request.auth.token.businessId == resource.data.businessId;
```

---

## 5. Firestore Security Rules (Propuesta)

```javascript
// orders
match /orders/{orderId} {
  allow read: if request.auth.token.businessId == resource.data.businessId
               || request.auth.uid == resource.data.customerId
               || request.auth.uid == resource.data.assignedCourierId;
  allow write: if request.auth.token.role in ['business', 'admin', 'driver'];
}

// products
match /products/{productId} {
  allow read: if true; // público
  allow write: if request.auth.token.businessId == resource.data.businessId;
}

// users
match /users/{uid} {
  allow read, write: if request.auth.uid == uid
                     || request.auth.token.role == 'admin';
}
```

---

## 6. Suspensión y Gestión de Cuentas

### Propuesta 6.1 — Estados de Cuenta

```kotlin
enum class AccountStatus {
    ACTIVE,
    SUSPENDED,     // Temporal — puede reactivarse
    TERMINATED,    // Permanente — baja del sistema
    PENDING        // En espera de activación
}
```

### Propuesta 6.2 — Acción en Admin Panel
- Botón "Suspender" en `AdminUsersScreen`
- Campo `status: AccountStatus` en `AppUser`
- Firestore Security Rule que bloquee lectura/escritura si `status == SUSPENDED`

---

## 7. Priorización de Mejoras

| Prioridad | Mejora | Impacto |
|---|:---:|---|
| P0 | Verificar Firestore Security Rules | Seguridad crítica |
| P0 | Agregar validación cruzada `businessId == currentUser.uid` en ViewModels | Seguridad |
| P1 | Normalizar rol a campo único (`role`) | Consistencia |
| P1 | Agregar `MANAGER`, `CASHIER`, `COOK` como roles asignables en Admin UI | Funcionalidad |
| P1 | Crear colección `employees` | Funcionalidad Enterprise |
| P2 | Sistema de invitaciones | Experiencia de comercio |
| P2 | Firebase Custom Claims | Seguridad server-side |
| P3 | Separar colección `businesses` de `users` | Escalabilidad |
| P3 | Sistema de suspensión de cuentas | Gobernanza |

---

> **Nota Final**: Las propuestas P0 son correctivos de seguridad que no requieren nuevas funcionalidades. Las P1-P3 son mejoras arquitectónicas para implementar en sprints futuros respetando la Frozen Core Policy.
