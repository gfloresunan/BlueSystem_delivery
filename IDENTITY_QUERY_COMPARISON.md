# FASE F — MATRIZ COMPARATIVA DE CONSULTAS DE IDENTIDADES & USUARIOS

**Proyecto:** BlueSystem Delivery (`bluesystem-7c9af`)  
**Fecha:** 16 de Agosto, 2026  
**Fase:** F — Auditoría Forense de Identidades y Usuarios (Modo Solo Lectura)  

---

## 1. Matriz Comparativa de Consultas

| Elemento | Governance Center | Panel Admin Web (Usuarios & Roles) |
| :--- | :--- | :--- |
| **Archivo Responsable** | [`panel-admin/public/js/services/identityService.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/identityService.js#L10) | [`panel-admin/public/js/dashboard/users.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/users.js#L66) |
| **Función / Método** | `identityService.getIdentities(searchQuery, roleFilter, statusFilter, orgId)` | `usersModule.loadUsers()` |
| **Colección Principal** | `/users` | `/users` |
| **Subcolecciones / Relacionales** | Consultas ad-hoc en `getIdentity360`: `/employees`, `/membership`, `/devices`, `/sessions`, `/audit_events`, `/invitations` | `/user_devices` |
| **Query Firestore Exacta** | `db.collection('users').get()` | `db.collection('users').orderBy('nombre', 'asc').onSnapshot(...)` |
| **Filtros Firestore (Backend)** | **Ninguno** (Obtiene el 100% de los documentos físicos de `/users`) | **Filtro Implícito de Firestore**: `orderBy('nombre', 'asc')` excluye automáticamente todo documento que carezca de la propiedad `nombre`. |
| **Filtros Cliente (JavaScript)** | `matchesQuery` (nombre, email, telefono, uid), `matchesRole` (vía `eiamAdapter`), `matchesStatus` (`isActive !== false`) | `matchesQuery` (nombre, email), `matchesRole` (`user.role \|\| user.rol`), `matchesStatus` (`user.isActive`) |
| **Filtro de Estado (Status)** | Cliente: `ACTIVE` / `SUSPENDED` / `BLOCKED` (vía `isActive`) | Cliente: `active` / `blocked` (vía `isActive`) |
| **Filtro de Rol (Role)** | Cliente: Mapeo EIAM (`super_admin`, `admin`, `supervisor`, `business`, `branch_manager`, `cashier`, `courier`, `customer`) | Cliente: Filtro simple por string (`super_admin`, `admin`, `supervisor`, `call_center`, `marketing`, `support`, `business`, `courier`, `customer`) |
| **Paginación** | Sin paginación en servicio (renderiza lista completa) | Paginación en cliente (`Pagination` helper, 8 items por página) |
| **Ordenamiento** | Sin ordenamiento en Firestore (orden nativo por Document ID) | Ordenado explitamente en Firestore por `nombre` ascendente (`orderBy('nombre', 'asc')`) |
| **Realtime Listener** | **NO** (Consulta única _one-shot_ `await db.collection('users').get()`) | **SÍ** (`onSnapshot()` en `/users` y `onSnapshot()` en `/user_devices`) |
| **Fuente Secundaria FCM / Dispositivos** | Colección `/devices` (que actualmente tiene 0 documentos) | Colección `/user_devices` (que contiene 16 documentos con FCM Tokens y metadata de dispositivo) |
| **Transformación de Datos** | Mapea roles vía `eiamAdapter.toEiamRole()`, asigna `canonicalRole`, `roleLevel`, `roleLabel`, `displayStatus` | Normaliza `role` como `user.role \|\| user.rol \|\| 'customer'`, cruza en memoria con `usersModule.devicesMap[user.uid]` |
| **Total de Registros Mostrados** | **41 identidades** | **9 usuarios** |

---

## 2. Análisis Detallado de las Discrepancias

### 2.1. Causa Técnica de la Diferencia (41 vs 9)
La diferencia fundamental entre los 41 registros de **Governance Center** y los 9 registros del **Panel Admin Web** radica en el comportamiento nativo de indexación de **Google Cloud Firestore**:

1. **Governance Center** ejecuta `db.collection('users').get()`. Esta consulta realiza un *collection scan* completo sin ordenamiento ni filtros en Firestore. Retorna absolutamente todos los 41 documentos existentes en la colección `/users`.
2. **Panel Admin Web** ejecuta `db.collection('users').orderBy('nombre', 'asc').onSnapshot(...)`. En Firestore, cualquier consulta que incluya `orderBy('campo')` utiliza un índice sobre ese campo y **omite automáticamente todos los documentos en los que dicho campo no existe o es `undefined`**.
3. De los 41 documentos almacenados en `/users`, **únicamente 9 poseen la propiedad `nombre`**. Los 32 documentos restantes fueron creados utilizando esquemas alternativos o legacy (algunos usan la propiedad `name`, otros son clientes sincronizados desde el punto de venta local con prefijos `user_cli_*` o `user_cliente*`, y otros son registros incompletos sin nombre).

### 2.2. Discrepancia en Dispositivos y FCM Tokens
* **Panel Admin Web** escucha la colección `/user_devices` (`onSnapshot`), acumulando en `usersModule.devicesMap` la información del token FCM (`fcmToken`), plataforma (`platform`) y modelo (`model`). `/user_devices` contiene actualmente **16 registros**.
* **Governance Center** consulta la colección `/devices` mediante `identityService.getDevices()`. La colección `/devices` contiene **0 documentos**, provocando que el tab *Dispositivos Trust* de Governance aparezca vacío.

### 2.3. Modo de Conexión (Realtime vs One-Shot)
* **Panel Admin Web** implementa persistencia en tiempo real mediante `onSnapshot` para ambas colecciones (`/users` y `/user_devices`), permitiendo ver reflejados cambios inmediatamente.
* **Governance Center** funciona mediante peticiones *one-shot* (`Promise.allSettled` con `get()`), requiriendo recargar la pestaña o invocar `loadData()` para sincronizar cambios.

---

> [!IMPORTANT]
> **Modo Solo Lectura Confirmado:** No se realizaron modificaciones en archivos de código, consultas de Firestore ni índices de base de datos durante la elaboración de esta matriz.
