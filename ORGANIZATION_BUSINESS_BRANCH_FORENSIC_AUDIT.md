# BLUE SYSTEM DELIVERY ENTERPRISE
## FORENSIC ARCHITECTURAL AUDIT — ORGANIZATION → BUSINESS → BRANCH (FASE 1 — FASE 21)

**PROYECTO:** BlueSystem Delivery Enterprise  
**FIREBASE PROJECT:** bluesystem-7c9af  
**FECHA Y HORA:** 2026-08-17 10:27:00 UTC-6  
**MODO AUDITORÍA:** READ-ONLY / ZERO MODIFICATION / ZERO DEPLOY  

---

### 1. INVENTARIO COMPLETO Y MAPPING DE COMPONENTES (FASE 1 & FASE 6)

#### Hallazgos del Governance Center (Panel Admin Web)
- **Archivos Clave Auditados:**
  - [governanceCenter.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/governanceCenter.js) (SHA-256: `e4e1c1519bc7301e4c5ddc72558e0a4fc9503f61ec9c85a115ba15b843235d99`)
  - [governanceService.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js) (SHA-256: `4fb33e9d0da0e3f505d58e04987d7deef59a8dfb3c5937db12831dac2d4f02e7`)

- **Respuestas a Interrogantes de Gobernanza:**
  1. **¿Qué colecciones consulta?** `/organizations`, `/businesses`, `/branches`, `/merchant_applications`, `/users`, `/employees`, `/invitations`, `/roles`, `/permissions`.
  2. **¿Qué documentos crea?** Documentos en `/organizations`, `/businesses`, `/branches`, `/merchant_applications`, `/audit_events`.
  3. **¿Qué documentos modifica?** Actualizaciones con `{ merge: true }` en `/organizations/{orgId}`, `/businesses/{businessId}`, `/branches/{branchId}` y `/merchant_applications/{appId}`.
  4. **¿Qué documentos elimina?** `.delete()` directo en `/organizations/{orgId}`, `/businesses/{businessId}`, `/roles/{roleId}`.
  5. **¿Qué significa `BlueSystem Holding Principal`?** Es una **Organización Virtual creada en memoria** por `governanceService.js#L23` como fallback si Firestore no retorna ningún documento en `/organizations`.
  6. **¿Qué significa `org_default_bluesystem`?** Es un **String ID Hardcodeado** (`governanceService.js#L22`) inyectado en runtime a cualquier Comercio o Sucursal cuyo documento Firestore carezca del campo `orgId`.
  7. **¿Existe un CRUD real de Organization?** SÍ a nivel de Admin Web (`saveOrganization`, `getOrganizations`), pero NO tiene integración funcional con la app Android ni con la aplicación de Clientes.
  8. **¿"Nueva Empresa" crea Organization o Business?** "Nueva Empresa" crea un documento en `/organizations`. "Comercios" crea documentos en `/businesses`.

---

### 2. AUDITORÍA DE PEDIDOS, CATÁLOGO Y USUARIOS (FASE 13, 14, 15)

#### FASE 13 — Flujo de Pedidos (Orders)
- **Campos en Documento `/orders/{orderId}`:**
  - `businessId`: ✅ Presente.
  - `branchId`: 🟡 Opcional (Asignado si proviene de sucursal específica).
  - `orgId`: 🔴 **MISSING**. Los pedidos NO almacenan `orgId`.
- **Efecto Arquitectónico:**
  No es posible consultar pedidos consolidados por Organización de forma directa en Firestore mediante `where("orgId", "==", orgId)`. Toda agregación requiere join manual en cliente/backend.

#### FASE 14 — Productos / Catálogo (Products)
- **Campos en Documento `/products/{productId}`:**
  - `businessId`: ✅ Presente.
  - `branchId`: 🔴 **MISSING**. Los productos pertenecen al comercio global (`businessId`).
  - `orgId`: 🔴 **MISSING**. No existe catálogo global por Organización.

#### FASE 15 — Usuarios, Staff y Motorizados (Users / Membership)
- **Colección `/users/{uid}`:** Posee `orgId`, `businessId`, `branchId`, `role`.
- **Colección `/membership/{membershipId}`:** Mantiene el vínculo explícito EIAM entre el `uid`, `orgId`, `businessId` y `branchId` con su lista de `permissions: []`.
- **Motorizados (Couriers):** Los documentos de motorizados carecen de vínculo con `orgId` o `businessId` específico (Flotas globales/flotantes).

---

### 3. EVENTOS DE AUDITORÍA Y ENTIDADES HUÉRFANAS (FASE 17 & FASE 21)

#### FASE 17 — Audit Events (`/audit_events`)
- **Estructura Registrada:** Los eventos generados por Cloud Functions ([merchantApplications.ts:L326](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/triggers/merchantApplications.ts#L326)) preservan la triada `orgId`, `businessId`, `branchId`.
- **Vulnerabilidad Auditada:** Los eventos generados directamente desde el Admin Web no validan la consistencia jerárquica y permiten registrar `businessId` sin validar pertenencia al `orgId`.

#### FASE 21 — Detección de Entidades Huérfanas
1. **Business sin Organization:** Hallado en escrituras directas legacy donde `orgId` es `null` o asignado al fallback `'org_default_bluesystem'`.
2. **Branch sin Business:** No hallado (Toda Branch se crea vinculada a un `businessId`).
3. **Order sin Org:** 100% de las órdenes registradas carecen de `orgId`.
4. **Product sin Org/Branch:** 100% de los productos carecen de `orgId` y `branchId`.
5. **Organization sin Business:** Producido cuando se elimina un Business vía `deprovisionTenant` en modo `HARD_DELETE`, dejando la Organización huérfana en Firestore.
