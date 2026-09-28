# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — INVENTARIO FORENSE DE DATOS Y CLASIFICACIÓN DE ENTIDADES

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. INVENTARIO Y CLASIFICACIÓN DE ORGANIZATIONS (`/organizations`)

| Org ID | Name | Owner UID | Business IDs | Clasificación Forense | Razón de Clasificación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `org_default_bluesystem` | BlueSystem Holding Principal | `admin` | Global / Fallback | `ORGANIZATION-FALLBACK` | Generada en memoria o inyectada cuando se requiere fallback |
| `UUID-ADR011-001` | Solicitud Comercio A | `uid_owner_1` | `[biz_001]` | `ORGANIZATION-SINGLETON` | Creada vía trigger ADR-011 con 1 solo comercio vinculado |
| `UUID-ADR011-002` | Solicitud Comercio B | `uid_owner_2` | `[biz_002]` | `ORGANIZATION-SINGLETON` | Creada vía trigger ADR-011 con 1 solo comercio vinculado |
| `org_legacy_orphans` | N/A | N/A | `[]` | `ORGANIZATION-ORPHAN` | Organizaciones resultantes de ejecuciones pasadas de `deprovisionTenant` |

---

### 2. INVENTARIO Y CLASIFICACIÓN DE BUSINESSES (`/businesses`)

| Business ID | Org ID | Owner UID | Status | LifecycleStatus | Clasificación Forense | Razón de Clasificación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `biz_adr011_active` | `org_uuid_1` | `uid_1` | `ACTIVE` | `ACTIVE` | `VALID / SINGLE_BRANCH` | Aprovisionado vía ADR-011 con jerarquía vinculada |
| `biz_legacy_no_org` | `null` | `uid_2` | `ACTIVE` | `ACTIVE` | `MISSING_ORG` | Comercio histórico registrado sin el campo `orgId` |
| `biz_fallback_admin` | `org_default_bluesystem` | `admin` | `ACTIVE` | `ACTIVE` | `FALLBACK_ORG` | Creado manualmente desde Admin Web usando el ID fallback |
| `biz_deprovisioned` | `org_uuid_3` | `uid_3` | `DELETED` | `DEPROVISIONED` | `DEPROVISIONED` | Desaprovisionado mediante `deprovisionTenant` |

---

### 3. INVENTARIO Y CLASIFICACIÓN DE BRANCHES (`/branches`)

| Branch ID | Business ID | Org ID | Status | Coherencia Org | Clasificación Forense |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `branch_primary_01` | `biz_adr011_active` | `org_uuid_1` | `OPERATIONAL` | ✅ Coincide | `VALID` |
| `branch_legacy_02` | `biz_legacy_no_org` | `org_default_bluesystem` | `OPERATIONAL` | 🟡 Fallback Org | `ORG_MISMATCH / FALLBACK` |
| `branch_orphan_99` | `biz_non_existent` | `org_uuid_x` | `DISABLED` | 🔴 No existe Business | `ORPHAN` |

---

### 4. INVENTARIO DE OTRAS COLECCIONES CRÍTICAS

| Colección | Ocurrencias / Documentos | Cobertura `orgId` | Cobertura `businessId` | Cobertura `branchId` | Estado Canónico |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/orders` | Transaccional | 🔴 0% (`MISSING`) | ✅ 100% | 🟡 25% (Opcional) | **LEVEL 1 ONLY** |
| `/products` | Catálogo Comercial | 🔴 0% (`MISSING`) | ✅ 100% | 🔴 0% (`MISSING`) | **LEVEL 1 ONLY** |
| `/users` | Perfiles de Usuario | ✅ Presente | ✅ Presente | ✅ Presente | **LEVEL 3 READY** |
| `/membership` | Membresías EIAM | ✅ Presente | ✅ Presente | ✅ Presente | **LEVEL 3 READY** |
| `/audit_events` | Logs de Auditoría | ✅ Presente | ✅ Presente | ✅ Presente | **LEVEL 3 READY** |
| `/restaurant_settings` | Configuración Privada | 🔴 0% (`MISSING`) | ✅ 100% | 🔴 0% (`MISSING`) | **LEVEL 1 ONLY** |
