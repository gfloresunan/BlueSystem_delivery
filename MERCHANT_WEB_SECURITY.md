# MERCHANT_WEB_SECURITY.md
## Seguridad Multi-Tenant y EIAM Integration

## 🔐 1. Aislamiento Multi-Tenant Estricto
- Todo acceso a Firestore está filtrado por `businessId` y `branchId`.
- El token JWT del usuario contiene Custom Claims firmados por Firebase Auth (`role`, `businessId`, `branchId`, `orgId`).
- El cliente web NO puede modificar o forzar consultas pertenecientes a otro `businessId`.

## 🛡️ 2. Integración con EIAM Engines
- **RoleEngine**: Validación de jerarquía de roles (OWNER, MANAGER, SUPERVISOR, CASHIER, COOK).
- **PermissionEngine**: Verificación de permisos granulares (`EiamAction.CREATE_PRODUCT`, `EiamAction.VIEW_FINANCE`, etc.).
- **PolicyEngine**: Evaluación de políticas de seguridad antes de permitir cualquier mutación.
