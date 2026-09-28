# C2D23 — PERMISSION AUDIT
## Matriz de Permisos EIAM en App Configuration Manager
**Protocol ID:** `C2D.23`  

---

### 1. Control de Acceso por Rol EIAM

| Rol EIAM | Acceso a Módulo | Crear / Editar App Config | Archivar Config | Visualizar App Preview |
|---|:---:|:---:|:---:|:---:|
| `SUPER_ADMIN` | 🟢 Permitido | 🟢 Permitido | 🟢 Permitido | 🟢 Permitido |
| `ADMIN` | 🟢 Permitido | 🟢 Permitido | 🟢 Permitido | 🟢 Permitido |
| `AUDITOR` | 🟢 Permitido | 🔴 Denegado | 🔴 Denegado | 🟢 Permitido |
| `SUPERVISOR` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
| `OPERATOR` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
| `SUPPORT` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
| `CUSTOMER` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
| `COURIER` | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado | 🔴 Denegado |
