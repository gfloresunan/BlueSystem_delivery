# PERMISSION_MATRIX.md
# Matriz de Permisos — BlueSystem Delivery Enterprise

> **Política**: Documento de solo lectura. Extraído del código fuente. Sin suposiciones.
> **Fuentes**: `PolicyEngineImpl.kt`, `OrderLifecycleEngine.kt`, `AdminUsersScreen.kt`, `SplashViewModel.kt`
> **Leyenda**: ✅ Permitido | ❌ Denegado | ⚠️ Parcial / Condicionado | 🔲 No implementado en PolicyEngine

---

## 1. Matriz de Acceso por Módulo (Routing Level)

| Módulo / Pantalla | CLIENT | DRIVER | BUSINESS/OWNER | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Home Cliente (SolicitarEnvio) | ✅ | ❌ | ❌ | ❌ |
| Historial de Pedidos Cliente | ✅ | ❌ | ❌ | ❌ |
| Perfil Cliente | ✅ | ❌ | ❌ | ❌ |
| Dashboard Motorizado | ❌ | ✅ | ❌ | ❌ |
| Pedidos Entrantes (Motorizado) | ❌ | ✅ | ❌ | ❌ |
| Business Dashboard (EOC) | ❌ | ❌ | ✅ | ❌ |
| Merchant Orders Center (MOOC) | ❌ | ❌ | ✅ | ❌ |
| Delivery Control Tower (DCT) | ❌ | ❌ | ✅ | ❌ |
| Restaurant Settings (RSC) | ❌ | ❌ | ✅ | ❌ |
| Merchant Finance Center (MFC) | ❌ | ❌ | ✅ | ❌ |
| Admin Panel | ❌ | ❌ | ❌ | ✅ |
| Admin Users Screen | ❌ | ❌ | ❌ | ✅ |

---

## 2. Matriz de Acciones del PolicyEngine

| Acción | CLIENT | COOK | CASHIER | SUPERVISOR | OWNER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `PUBLISH_MENU` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `CREATE_PROMOTION` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `EXECUTE_ROLLBACK` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `OPEN_RESTAURANT` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `CLOSE_CASH_REGISTER` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| `ASSIGN_DRIVER` | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |

---

## 3. Matriz de Transiciones de Estado Comercial (OrderLifecycleEngine)

| Cambio de Estado | CLIENT | COOK | CASHIER | SUPERVISOR | OWNER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| → `PENDING_PAYMENT` | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| → `CONFIRMED` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| → `CANCELLED` | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| → `REFUNDED` | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## 4. Matriz de Transiciones de Estado Operativo / Cocina

| Cambio de Estado | CLIENT | COOK | CASHIER | SUPERVISOR | OWNER | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| → `QUEUED` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| → `PREPARING` | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| → `ASSEMBLING` | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| → `READY` | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| → `PACKED` | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| → `OUT_FOR_DELIVERY` | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| → `DELIVERED` | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |

> ⚠️ **Nota**: `OWNER` no puede cambiar estados operativos de cocina directamente. Solo `COOK`, `CASHIER`, `SUPERVISOR` y `ADMIN`.

---

## 5. Matriz de Gestión de Usuarios (AdminUsersScreen)

| Acción | CLIENT | DRIVER | BUSINESS | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Ver lista de usuarios | ❌ | ❌ | ❌ | ✅ |
| Asignar rol `CLIENT` | ❌ | ❌ | ❌ | ✅ |
| Asignar rol `BUSINESS` | ❌ | ❌ | ❌ | ✅ |
| Asignar rol `DRIVER` | ❌ | ❌ | ❌ | ✅ |
| Asignar rol `ADMIN` | ❌ | ❌ | ❌ | ✅ |
| Aprobar solicitud de rol | ❌ | ❌ | ❌ | ✅ |
| Rechazar solicitud de rol | ❌ | ❌ | ❌ | ✅ |
| Desactivar usuario | ❌ | ❌ | ❌ | 🔲 |

---

## 6. Acciones sin Cobertura en PolicyEngine (No Implementadas)

Las siguientes funcionalidades **no** pasan por el PolicyEngine:

| Funcionalidad | Estado |
|---|---|
| Crear/editar producto en menú | 🔲 Sin PolicyEngine (solo por rol de routing) |
| Ver finanzas del comercio | 🔲 Sin PolicyEngine |
| Editar configuración de restaurante | 🔲 Sin PolicyEngine |
| Descargar reportes PDF/Excel | 🔲 Sin PolicyEngine |
| Ver Control Tower | 🔲 Sin PolicyEngine |
| Gestionar motorizados | 🔲 Sin PolicyEngine |
| Activar/desactivar promociones | 🔲 Sin PolicyEngine |
| Acceder a KDS | 🔲 Sin PolicyEngine (acceso implícito por businessId) |
| Suspender empleados | 🔲 No implementado |
| Transferir propiedad del comercio | 🔲 No implementado |
