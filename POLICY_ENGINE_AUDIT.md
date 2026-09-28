# POLICY_ENGINE_AUDIT.md
# Auditoría del Policy Engine — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Extraído del código fuente. Sin suposiciones.
> **Fuentes**: `PolicyEngineImpl.kt`, `OrderLifecycleEngine.kt`, `PermissionAuditLogger.kt`

---

## 1. Arquitectura del Policy Engine

El sistema tiene **dos capas de control de permisos**:

```
┌─────────────────────────────────────────────────────┐
│  CAPA 1: PolicyEngineImpl (Sprint 15 Enterprise)    │
│  Acciones de alto nivel de negocio                  │
│  Archivo: enterprise/policy/PolicyEngineImpl.kt     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  CAPA 2: OrderLifecycleEngine                       │
│  Transiciones de estado de pedidos                  │
│  Archivo: domain/engine/order/OrderLifecycleEngine  │
└─────────────────────────────────────────────────────┘
```

---

## 2. PolicyEngineImpl (Capa 1)

**Archivo**: `app/src/main/java/com/example/enterprise/policy/PolicyEngineImpl.kt`

### Interface
```kotlin
interface IPolicyEngine {
    fun evaluatePolicy(action: PolicyAction, role: UserRole): Boolean
}
```

### Acciones Definidas
```kotlin
enum class PolicyAction {
    PUBLISH_MENU,
    CREATE_PROMOTION,
    EXECUTE_ROLLBACK,
    OPEN_RESTAURANT,
    CLOSE_CASH_REGISTER,
    ASSIGN_DRIVER
}
```

### Matriz de Evaluación
```kotlin
override fun evaluatePolicy(action: PolicyAction, role: UserRole): Boolean {
    return when (action) {
        PolicyAction.PUBLISH_MENU        -> role in setOf(OWNER, ADMIN, SUPERVISOR)
        PolicyAction.CREATE_PROMOTION    -> role in setOf(OWNER, ADMIN)
        PolicyAction.EXECUTE_ROLLBACK    -> role in setOf(OWNER, ADMIN)
        PolicyAction.OPEN_RESTAURANT     -> role in setOf(CASHIER, SUPERVISOR, OWNER, ADMIN)
        PolicyAction.CLOSE_CASH_REGISTER -> role in setOf(CASHIER, SUPERVISOR, OWNER, ADMIN)
        PolicyAction.ASSIGN_DRIVER       -> role in setOf(CASHIER, SUPERVISOR, ADMIN)
    }
}
```

---

## 3. OrderLifecycleEngine (Capa 2)

**Archivo**: `app/src/main/java/com/example/domain/engine/order/OrderLifecycleEngine.kt`

Valida permisos para **transiciones de estado** comerciales y operativas:

### Estados Comerciales
| Acción | Roles Autorizados |
|---|---|
| → `PENDING_PAYMENT` | `CLIENT`, `CASHIER`, `ADMIN` |
| → `CONFIRMED` | `CASHIER`, `SUPERVISOR`, `OWNER`, `ADMIN` |
| → `CANCELLED` | `CLIENT`, `CASHIER`, `SUPERVISOR`, `OWNER`, `ADMIN` |
| → `REFUNDED` | `SUPERVISOR`, `OWNER`, `ADMIN` |

### Estados Operativos (Cocina)
| Acción | Roles Autorizados |
|---|---|
| → `QUEUED` | Todos |
| → `PREPARING` | `COOK`, `SUPERVISOR`, `ADMIN` |
| → `ASSEMBLING` | `COOK`, `SUPERVISOR`, `ADMIN` |
| → `READY` | `COOK`, `SUPERVISOR`, `ADMIN` |
| → `PACKED` | `CASHIER`, `SUPERVISOR`, `ADMIN` |
| → `OUT_FOR_DELIVERY` | `CASHIER`, `SUPERVISOR`, `ADMIN` |
| → `DELIVERED` | `CASHIER`, `SUPERVISOR`, `ADMIN` |

---

## 4. PermissionAuditLogger

**Archivo**: `app/src/main/java/com/example/data/auth/PermissionAuditLogger.kt`

Registra eventos de acceso denegado:

```kotlin
fun logPermissionDenied(permissionName: String, screen: String) {
    // Lee UID de FirebaseAuth.currentUser
    // Lee SessionMode de SessionManager
    // Registra en AuditLogger con severidad SECURITY
}
```

Campos del evento auditado:
- `uid`: UID del usuario que intentó la acción
- `permission`: Nombre del permiso denegado
- `screen`: Pantalla donde ocurrió
- `timestamp`: Timestamp Unix
- `session`: Modo de sesión (`AUTHENTICATED`, `GUEST`)

---

## 5. Mecanismo de Validación — Flujo Completo

```
Usuario realiza acción (ej: Publicar Menú)
        │
        ▼
ViewModel llama PolicyEngine.evaluatePolicy(
    action = PolicyAction.PUBLISH_MENU,
    role   = UserRole.OWNER       ← viene de Firestore /users/{uid}.role
)
        │
        ├─ true  ──► Ejecuta la operación
        │
        └─ false ──► PermissionAuditLogger.logPermissionDenied()
                     Muestra mensaje de error al usuario
```

---

## 6. Qué NO utiliza el Policy Engine actual

| Mecanismo | Estado |
|---|---|
| Firebase Auth Custom Claims | ❌ No implementado |
| Feature Flags por usuario | ❌ No implementado en PolicyEngine |
| Tenant isolation (businessId check) | ❌ No implementado en PolicyEngine (se hace a nivel de query Firestore) |
| Branch-level permissions | ❌ No implementado |
| Time-based policies (horario) | ❌ No implementado |
| Resource-level ACL | ❌ No implementado |

---

## 7. Limitaciones Críticas

1. **Mapeo manual de roles**: El `role` string de Firestore (`"business"`, `"owner"`) debe convertirse manualmente al enum `UserRole` antes de llamar al PolicyEngine. No existe un mapper automático.
2. **Solo 6 acciones cubierta**: El PolicyEngine actualmente cubre solo `PUBLISH_MENU`, `CREATE_PROMOTION`, `EXECUTE_ROLLBACK`, `OPEN_RESTAURANT`, `CLOSE_CASH_REGISTER`, `ASSIGN_DRIVER`. Decenas de otras acciones críticas (editar precio, ver finanzas, configurar delivery, etc.) no pasan por PolicyEngine.
3. **No se consume en todos los módulos**: Los módulos Sprint 15.x no invocan `PolicyEngineImpl` directamente; la validación de roles es implícita por routing en `SplashViewModel`.
