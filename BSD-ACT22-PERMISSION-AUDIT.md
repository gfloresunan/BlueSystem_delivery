# BSD-ACT22-PERMISSION-AUDIT
## Matriz de Permisos Administrativos y Roles EIAM
**Protocol ID:** `BSD-ACT22-SUBSCRIPTION-FEATURE-MANAGER-001`  

---

### 1. Acceso a Subscription & Feature Manager

| Rol EIAM | Acceso a Pestaña | Crear / Editar Suscripción | Asignar a Tenant | Visualizar Catálogo |
|---|:---:|:---:|:---:|:---:|
| `SUPER_ADMIN` | 🟢 Permitido | 🟢 Permitido | 🟢 Permitido | 🟢 Permitido |
| `ADMIN` | 🟢 Permitido | 🟢 Permitido | 🟢 Permitido | 🟢 Permitido |
| `AUDITOR` | 🟢 Permitido | 🔴 Denegado (Solo Lectura) | 🔴 Denegado | 🟢 Permitido |
| `SUPERVISOR` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
| `OPERATOR` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
| `SUPPORT` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
| `CUSTOMER` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
| `COURIER` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
