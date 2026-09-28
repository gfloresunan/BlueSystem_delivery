# Enterprise Policy Engine Specification

`PolicyEngine` centraliza todas las reglas de autorización y permisos de negocio.

## Acciones Soportadas (`PolicyAction`)
- `PUBLISH_MENU`: OWNER, ADMIN, SUPERVISOR.
- `CREATE_PROMOTION`: OWNER, ADMIN.
- `EXECUTE_ROLLBACK`: OWNER, ADMIN.
- `OPEN_RESTAURANT`: CASHIER, SUPERVISOR, OWNER, ADMIN.
- `CLOSE_CASH_REGISTER`: CASHIER, SUPERVISOR, OWNER, ADMIN.
- `ASSIGN_DRIVER`: CASHIER, SUPERVISOR, ADMIN.

## Ejemplo de Uso
```kotlin
val policyEngine = PolicyEngineImpl()
val canRollback = policyEngine.evaluatePolicy(PolicyAction.EXECUTE_ROLLBACK, UserRole.COOK) // false
```
