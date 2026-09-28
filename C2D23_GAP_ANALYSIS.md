# C2D23 — GAP ANALYSIS
## Análisis de Brechas: Diseñado vs Real vs Faltante
**Protocol ID:** `C2D.23`  

---

### 1. Matriz de Brechas (Gap Matrix)

| Componente | Estado de Diseño (TypeScript) | Estado Operativo | Brecha a Resolver en C2D.23 |
|---|---|---|---|
| `AppConfigEntity` Model | 100% definido en `models.ts` | Schema puro en backend | Exponer entidad en Firestore y Admin UI |
| Admin App Config Cockpit | Inexistente | Inexistente | Construir `appConfigManager.js` en `panel-admin` |
| Validación Tenant $\leftrightarrow$ Brand | Diseñada en arquitectura | Validada en Brand Manager | Exigir estricta pertenencia `brand.tenantId === tenant.tenantId` |
| Validación Tenant $\leftrightarrow$ Sub | Diseñada en arquitectura | Validada en Sub Manager | Exigir `sub.tenantId === tenant.tenantId` |
| Visualización de App Preview | No implementada | No implementada | Previsualizador read-only efímero de App (sin build) |
| Reglas de `/app_configs` | No existente en `firestore.rules` | Default Deny | Agregar regla protegida para Platform Admins |
| Barrera `READY_FOR_BUILD` | Diseñada en protocolo | No instrumentada | Validar configuración y bloquear disparadores de build |
