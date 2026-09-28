# 10 — ADMIN WEB SCREEN-BY-SCREEN INVENTORY

**Platform:** Admin Web Panel (SPA)  
**Audit Protocol:** BSD-MASTER-PLATFORM-RADIOGRAPHY-UXUI-001

---

## Screen Inventory Summary Table

| Screen ID | Module / View Name | File Path | Primary Purpose |
|---|---|---|---|
| **ADM-SCR-001** | `AdminLoginView` | `panel-admin/public/index.html` | Admin authentication, 2FA, session initialization. |
| **ADM-SCR-002** | `GovernanceDashboardView` | `panel-admin/public/dashboard.html` | Global metrics, active tenants, total GMV, live orders. |
| **ADM-SCR-003** | `TenantManagementModule` | `panel-admin/public/js/dashboard/governance.js` | Tenant CRUD, subscription tier, branding config. |
| **ADM-SCR-004** | `IdentityEIAMModule` | `panel-admin/public/js/dashboard/identity.js` | User roles, custom claims elevation, session revocation. |
| **ADM-SCR-005** | `MerchantsAdminModule` | `panel-admin/public/js/dashboard/merchants.js` | Merchant approval, branch activation, commission rates. |
| **ADM-SCR-006** | `CouriersAdminModule` | `panel-admin/public/js/dashboard/couriers.js` | Driver document validation, status override, fleet stats. |
| **ADM-SCR-007** | `GlobalControlTowerModule` | `panel-admin/public/js/dashboard/liveMap.js` | Global real-time map of all couriers & trips. |
| **ADM-SCR-008** | `BannersMarketingModule` | `panel-admin/public/banners.html` | App banner carousel manager, promotion targeting. |
| **ADM-SCR-009** | `SystemHealthAuditModule` | `panel-admin/public/js/dashboard/health.js` | Cloud Functions logs, error rates, Canary status. |

---

## Detailed Radiography: Screen by Screen

### ADM-SCR-003 — TenantManagementModule

- **Plataforma:** Admin Web Panel
- **Rol:** `PLATFORM_ADMIN` / `SUPER_ADMIN`
- **Ruta:** `#governance/tenants` en `dashboard.html`
- **Objetivo:** Alta, baja, modificación y gobierno de tenants multi-marca en la plataforma.
- **Qué ve el usuario:**
  - Tabla de Tenants activos con: ID, Nombre Comercial, Plan (Enterprise/Standard), Comercios asociados, Estado (Activo/Suspendido).
  - Botón "Crear Nuevo Tenant" (Abre modal de aprovisionamiento).
  - Panel de detalle con cuotas máximas de usuarios, almacenamiento y feature flags activos.
- **Acciones disponibles:**
  - Aprovisionar nuevo tenant (`createTenantAtomically`).
  - Modificar cuotas y límites.
  - Suspender tenant (desactiva accesos de inmediato vía EIAM).
- **Firestore:** Colección `/tenants` y `/system_config`.
- **Cloud Functions:** Invoca callable `provisionTenantEnterprise`.
- **Estado:** 🟢 `REAL / ACTIVE`
