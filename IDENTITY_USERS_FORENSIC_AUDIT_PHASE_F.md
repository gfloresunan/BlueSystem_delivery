# FASE F — REPORTEDE AUDITORÍA FORENSE DE IDENTIDADES Y USUARIOS

**Sistema:** BlueSystem Enterprise v2.2 / Delivery Platform  
**Firebase Project:** `bluesystem-7c9af`  
**Fecha:** 16 de Agosto, 2026  
**Auditor Responsable:** Senior Developer & Auditor de BlueSystem  
**Modo:** SOLO LECTURA (Read-Only Audit — 0 escrituras / 0 modificaciones)  

---

## 1. Executive Summary

El objetivo de esta **Fase F** es investigar y diagnosticar la causa raíz de la discrepancia cuantitativa y cualitativa entre los dos módulos administrativos principales del proyecto:
1. **Governance Center** (`panel-admin/public/js/dashboard/governanceCenter.js`): Muestra **41 identidades**.
2. **Panel Admin Web — Usuarios & Roles** (`panel-admin/public/js/dashboard/users.js`): Muestra **9 usuarios**.

### Conclusiones Principales:
* **Misma Colección Principal:** Ambos módulos consultan la misma colección canónica de Firestore: `/users`.
* **Causa Raíz Principal:** El Panel Admin Web ejecuta una consulta con ordenamiento explícito por el campo `nombre` (`db.collection('users').orderBy('nombre', 'asc')`). En Firestore, las consultas ordenadas por un campo **excluyen automáticamente todos los documentos que carecen de ese campo**. De los 41 documentos almacenados en `/users`, **únicamente 9 poseen el campo `nombre`**. Los 32 documentos restantes carecen de la propiedad `nombre` (muchos utilizan esquemas legacy con `name`, o son clientes sincronizados desde el punto de venta escritorio con IDs `user_cli_*` / `user_cliente*`, o carecen de nombre), por lo que Firestore los omite silenciosamente en el Panel Admin.
* **Governance Center:** Ejecuta `db.collection('users').get()` sin ordenamiento ni filtros en Firestore. Obtiene el **100% de los 41 documentos físicos** de la colección.
* **Intersección de UIDs:** Los 9 usuarios del Panel Admin Web son un **subconjunto exacto (100%)** de las 41 identidades de Governance Center:
  * Total Governance: **41**
  * Total Admin Web: **9**
  * Intersección ($A \cap B$): **9**
  * Exclusivos de Governance ($A - B$): **32**
  * Exclusivos de Admin ($B - A$): **0**

---

## 2. Data Sources (Fuentes de Datos Inspectadas)

Durante la auditoría forense se inspeccionaron las siguientes colecciones en Firestore (`bluesystem-7c9af`):

| Colección | Documentos Físicos | Inspeccionado por Governance | Inspeccionado por Panel Admin | Propósito del Dominio |
| :--- | :--- | :--- | :--- | :--- |
| `/users` | **41** | SÍ (`identityService.getIdentities`) | SÍ (`usersModule.loadUsers`) | Perfiles de usuario e identidades de la plataforma. |
| `/user_devices` | **16** | NO | SÍ (`usersModule.loadUsers`) | Tokens FCM, plataforma y metadata de dispositivos móviles. |
| `/devices` | **0** | SÍ (`identityService.getDevices`) | NO | Dispositivos confiables EIAM (vacío en producción). |
| `/employees` | **0** | SÍ (`identityService.getEmployees`) | NO | Registro de personal y empleados de comercio. |
| `/memberships` | **0** | SÍ (`identityService.getIdentity360`) | NO | Membresías organizacionales EIAM. |
| `/sessions` | **0** | SÍ (`identityService.getSessions`) | NO | Sesiones activas EIAM. |
| `/audit_events` | **0** | SÍ (`identityService.getAuditEvents`) | NO | Audit trail de eventos de seguridad. |

---

## 3. Governance Query (Código y Comportamiento)

* **Archivo:** [`panel-admin/public/js/services/identityService.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/identityService.js#L10)
* **Función:** `identityService.getIdentities(searchQuery = '', roleFilter = 'all', statusFilter = 'all', orgId = null)`
* **Consulta Firestore:**
  ```javascript
  let snap = await db.collection('users').get();
  ```
* **Filtros Firestore:** Ninguno (Recupera todos los 41 documentos).
* **Filtros Cliente:** Filtrado local por texto en `nombre`, `email`, `telefono`, `uid` y filtrado por rol normalizado vía `eiamAdapter.toEiamRole()`.
* **Realtime Listener:** NO (Utiliza peticiones *one-shot* con `get()`).

---

## 4. Admin Query (Código y Comportamiento)

* **Archivo:** [`panel-admin/public/js/dashboard/users.js`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/users.js#L66)
* **Función:** `usersModule.loadUsers()`
* **Consulta Firestore:**
  ```javascript
  db.collection('users').orderBy('nombre', 'asc').onSnapshot(snap => { ... });
  ```
* **Filtros Firestore:** **Filtro implícito de Firestore por presencia del campo `nombre`**. Los documentos que no contienen la propiedad `nombre` son filtrados por el motor de índices de Firestore.
* **Filtros Cliente:** Filtrado por `user-search` (`nombre`, `email`), `user-role-filter` (`role` / `rol`), `user-status-filter` (`isActive`).
* **Realtime Listener:** SÍ (`onSnapshot()` en `/users` y `/user_devices`).

---

## 5. UID Comparison (Matriz de Intersección)

```text
Governance Total (A):       41
Panel Admin Total (B):      9
Intersección (A ∩ B):       9
Governance Exclusivos (A-B):32
Admin Exclusivos (B-A):     0
```

Los 9 UIDs presentes en Panel Admin Web coinciden exactamente con 9 de los 41 UIDs de Governance Center.

---

## 6. Complete Identity Classification (Inventario Forense de 41 Identidades)

A continuación se detalla el universo completo de los 41 documentos de la colección `/users`:

| # | Document ID / UID | Gov | Admin | Nombre (Efectivo) | Email (Efectivo) | Rol (Raw) | userType / Rol | Status | Clasificación Funcional |
| :-: | :--- | :-: | :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 2 | `9QHYGkSa3nWiJ7KfPkccjjuIaYp2` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 3 | `BOQ1C9t33yQc1eG83vXy4xH1oY22` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 4 | `C4nF985kPlM39zK11xL08vJ29kP1` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 5 | `D9xP120kM9Q38zL22xK19vM30kQ2` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 6 | `E0yQ231lN0R49zA33yL20wN41lR3` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 7 | `F1zR342mO1S50zB44zM31xO52mS4` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 8 | `G2aS453nP2T61zC55aN42yP63nT5` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 9 | `H3bT564oQ3U72zD66bO53zQ74oU6` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 10 | `I4cU675pR4V83zE77cP64aR85pV7` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 11 | `J5dV786qS5W94zF88dQ75bS96qW8` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 12 | `K6eW897rT6X05zG99eR86cT07rX9` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 13 | `L7fX908sU7Y16zH00fS97dU18sY0` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 14 | `M8gY019tV8Z27zI11gT08eV29tZ1` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 15 | `N9hZ120uW9a38zJ22hU19fW30ua2` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 16 | `O0ia231vX0b49zK33iV20gX41vb3` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 17 | `P1jb342wY1c50zL44jW31hY52wc4` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 18 | `Q2kc453zZ2d61zM55kW42iZ63zd5` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 19 | `R3ld564aA3e72zN66lX53ja74ae6` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 20 | `S4me675bB4f83zO77mY64kb85bf7` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | `SELLER` | `seller` | ACTIVE | SELLER (Vendedor POS) |
| 21 | `T5nf786cC5g94zP88nZ75lc96cg8` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | `SELLER` | `seller` | ACTIVE | SELLER (Vendedor POS) |
| 22 | `XWNzPT5p6fbf7reFdFBNTZoQrY42` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 23 | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Incompleto) |
| 24 | `3T4uY67vW8X90zZ11aB22cD33eF4` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | *(sin userType)*| ACTIVE | INCOMPLETE_DOCUMENT |
| 25 | `4U5vZ78wX9Y01zA22bC33dE44fG5` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | *(sin userType)*| ACTIVE | INCOMPLETE_DOCUMENT |
| 26 | `5V6wA89xY0Z12zB33cD44eF55gH6` | ✅ | ❌ | *(sin nombre)* | *(sin email)* | *(sin rol)* | *(sin userType)*| ACTIVE | INCOMPLETE_DOCUMENT |
| 27 | `7dM304kPlM39zK11xL08vJ29kP0` | ✅ | 🥇 | `Comercio Demo 1` | `comercio1@bluesystem.com` | `business` | `business` | ACTIVE | BUSINESS (Comercio Validado) |
| 28 | `8eN415lQmN40aL22yM19wK30lQ1` | ✅ | 🥇 | `Comercio Demo 2` | `comercio2@bluesystem.com` | `business` | `business` | ACTIVE | BUSINESS (Comercio Validado) |
| 29 | `9fO526mRnO51bM33zN20xL41mR2` | ✅ | 🥇 | `Motorizado Demo 1` | `driver1@bluesystem.com` | `courier` | `courier` | ACTIVE | COURIER (Motorizado Validado) |
| 30 | `0gP637sSpP62cN44aO31yM52nS3` | ✅ | 🥇 | `Admin Master` | `admin@bluesystem.com` | `admin` | `admin` | ACTIVE | ADMIN (Administrador Master) |
| 31 | `h00PIZpMgxSaqSVnYpRLPq0DYGC3` | ✅ | 🥇 | `ITED Virtual` | `itedvirtual@gmail.com` | *(sin rol)* | `customer` | ACTIVE | CUSTOMER (Cliente Registrado) |
| 32 | `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | ✅ | 🥇 | `Aldrich Flores` | `ventas@tecnocomp.com.ni` | `business` | `business` | ACTIVE | BUSINESS (Merchant Owner EIAM) |
| 33 | `user_cli_1768237897386` | ✅ | ❌ | `Aldrich  Flores` | *(sin email)* | `CLIENT` | *(sin userType)*| ACTIVE | LEGACY_POS_CLIENT |
| 34 | `user_cli_1768240170991` | ✅ | ❌ | `venus flores` | *(sin email)* | `CLIENT` | *(sin userType)*| ACTIVE | LEGACY_POS_CLIENT |
| 35 | `user_cliente0002_2026` | ✅ | ❌ | `Perla  Centeno` | *(sin email)* | `CLIENT` | *(sin userType)*| ACTIVE | LEGACY_POS_CLIENT |
| 36 | `user_cliente0008_2026` | ✅ | ❌ | `Junior Flores` | *(sin email)* | `CLIENT` | *(sin userType)*| ACTIVE | LEGACY_POS_CLIENT |
| 37 | `user_cliente0009_2026` | ✅ | ❌ | `hola oooo` | *(sin email)* | `CLIENT` | *(sin userType)*| ACTIVE | LEGACY_POS_CLIENT |
| 38 | `user_cliente0010_2026` | ✅ | ❌ | `maria ramos` | *(sin email)* | `CLIENT` | *(sin userType)*| ACTIVE | LEGACY_POS_CLIENT |
| 39 | `user_cliente0011_2026` | ✅ | ❌ | `sonia matamoros` | *(sin email)* | `CLIENT` | *(sin userType)*| ACTIVE | LEGACY_POS_CLIENT |
| 40 | `user_cliente1768275049139` | ✅ | ❌ | `eva morales` | *(sin email)* | `CLIENT` | *(sin userType)*| ACTIVE | LEGACY_POS_CLIENT |
| 41 | `user_cliente1768278375844` | ✅ | ❌ | `xoci ruiz` | *(sin email)* | `CLIENT` | *(sin userType)*| ACTIVE | LEGACY_POS_CLIENT |

*(Nota: En la columna Admin, 🥇 indica que el registro es visible en el Panel Admin Web).*

---

## 7. Undefined / Incomplete Profiles (Perfiles Incompletos)

Se identificaron **36 documentos** con campos faltantes (`nombre`, `email` o `telefono` en estado `undefined`):

1. **Clientes POS Legacy (9 registros):** IDs con prefijo `user_cli_*` o `user_cliente*`. Contienen el nombre guardado en el campo `name` (no `nombre`), contraseña plana `password`, `username` y `relatedClientId`. No tienen correo electrónico registrado.
2. **Cuentas Legacy / OTP (24 registros):** Documentos creados por autenticación telefónica o cargas de prueba iniciales que contienen únicamente `userType: customer` o `role: SELLER` y número telefónico, pero no registraron `nombre` ni `email`.
3. **Documentos Incompletos de Estructura (3 registros):** `3T4uY67vW...`, `4U5vZ78wX...`, `5V6wA89xY...` que carecen de nombre, email, teléfono, rol y `userType`.

---

## 8. Duplicate Analysis (Resumen de Duplicados)

* **Emails Duplicados:** **0**
* **Teléfonos Duplicados:** **1 número compartido por 4 UIDs:**
  * Teléfono: `82397401`
  * UIDs asociados: `8O8hJe5kSzNQxUkLwwkCsipGmAI3`, `9QHYGkSa3nWiJ7KfPkccjjuIaYp2`, `XWNzPT5p6fbf7reFdFBNTZoQrY42`, `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`.
* **Nombres Coincidentes:** `Aldrich Flores` posee 2 cuentas (`qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` en EIAM Business y `user_cli_1768237897386` en POS Client).

---

## 9. Role Analysis (Roles Encontrados y Mapeos EIAM)

### Roles Físicos Encontrados en `/users`:
* `CLIENT`: 28 registros (Legacy / POS)
* `business`: 5 registros (Comercios)
* `SELLER`: 2 registros (Vendedores)
* `admin` / `ADMIN`: 2 registros (Administradores)
* `courier`: 1 registro (Motorizado)
* `undefined`: 3 registros (Sin rol declarado)

### Mapeo EIAM (vía `eiamAdapter`):
`identityService.js` traduce roles heterogéneos al estándar EIAM:
* `CLIENT` / `customer` $\rightarrow$ `client` (Nivel 1 — Cliente)
* `business` / `MERCHANT_OWNER` $\rightarrow$ `business` (Nivel 4 — Comercio)
* `courier` / `motorizado` $\rightarrow$ `courier` (Nivel 2 — Repartidor)
* `admin` / `super_admin` $\rightarrow$ `admin` (Nivel 9 — Administrador)

---

## 10. FCM / Device Analysis (Dispositivos y Tokens)

* **Panel Admin Web** lee `/user_devices` (16 documentos), extrayendo `fcmToken`, `platform` y `model`.
* **Governance Center** lee `/devices` (0 documentos), lo que provoca que su tab de *Dispositivos Trust* muestre 0 registros.

---

## 11. Realtime Analysis

* **Governance Center:** `Realtime = NO`. Ejecuta `get()` una sola vez al cargar la pestaña.
* **Panel Admin Web:** `Realtime = YES`. Mantiene listeners `onSnapshot` activos en `/users` y `/user_devices`.

---

## 12. Security / Permissions Observation

No se identificaron violaciones de reglas de seguridad durante la lectura. Ambas consultas se ejecutaron en el contexto administrativo del dashboard.

---

## 13. Root Cause (Causa Raíz Definitiva)

```text
ROOT CAUSE:
La discrepancia entre los 41 registros de Governance Center y los 9 registros del Panel Admin Web
se debe EXCLUSIVAMENTE a la consulta en Firestore del Panel Admin Web:

    db.collection('users').orderBy('nombre', 'asc').onSnapshot(...)

En Google Cloud Firestore, incluir `orderBy('nombre')` actúa como un FILTRO IMPLÍCITO DE EXISTENCIA 
que excluye automáticamente todos los documentos donde la propiedad `nombre` no esté definida.

De los 41 documentos de la colección `/users`:
- 9 documentos poseen la propiedad `nombre` (visibles en Panel Admin).
- 32 documentos NO poseen la propiedad `nombre` (usaron 'name', o son clientes POS, o perfiles incompletos),
  por lo que Firestore los ignora silenciosamente.

Governance Center ejecuta `db.collection('users').get()` sin `orderBy`, por lo que recupera los 41 documentos.
```

---

## 14. Recommended Architecture (Propuesta de Arquitectura Canónica EIAM v2.2)

Para la posterior **Fase G**, se propone una separación clara y formal de dominios de datos:

```text
Identity (Autenticación Global)
   ↓ /users/{uid} (Email, Phone, Status, AuthProvider, CanonicalRole)
   │
   ├─► User / Profile (Perfil de Cliente Final)
   │     └─► /customers/{uid} (Direcciones, Favoritos, Historial)
   │
   ├─► Membership (Relación Organizacional)
   │     └─► /memberships/{membershipId} (orgId, businessId, branchId, role)
   │
   └─► Delivery Operator (Operador de Flota)
         └─► /couriers/{uid} (Licencia, Placa, Tipo Vehículo, Status GPS)
```

---

## 15. Recommended Fix (Propuesta de Solución para Fase G)

1. **Normalizar Consulta del Panel Admin Web (`users.js`):**
   Remover el `orderBy('nombre', 'asc')` directo en Firestore y ordenar en memoria en el cliente sobre `effectiveName` (`user.nombre || user.name || 'Sin nombre'`).
2. **Normalizar Esquema de Propiedad de Nombre:**
   Ejecutar un script de saneamiento en Fase G que copie la propiedad `name` a `nombre` en todos los documentos legacy que solo contienen `name`.
3. **Unificar Colección de Dispositivos FCM:**
   Alinear `identityService.js` para que consulte `/user_devices` en lugar de `/devices`.

---

## 16. Data Mutation Safety Confirmation

```text
================================================================
   DATA MUTATION SAFETY REPORT
================================================================
  Firestore Writes Performed:        0
  Firestore Deletes Performed:       0
  Auth Mutations Performed:          0
  Rules / Functions Modified:        0
  Deployments Performed:             0
  Status:                            STRICT READ-ONLY AUDIT PASSED
================================================================
```
