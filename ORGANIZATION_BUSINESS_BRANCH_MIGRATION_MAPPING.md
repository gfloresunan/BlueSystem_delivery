# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — MAPEO DE MIGRACIÓN Y REGLA DE PRESERVACIÓN DE IDs

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. REGLA ABSOLUTA DE PRESERVACIÓN DE IDENTIFICADORES (NO DOCUMENT ID CHANGES)

Durante cualquier migración futura aprobada, **QUEDA RESTRINGIDA LA ALTERACIÓN O DUPLICACIÓN DE CUALQUIER DOCUMENT ID**:

```text
orderId        ───► PERMANECE INTACTO (Sin crear copias)
productId      ───► PERMANECE INTACTO (Sin crear copias)
businessId     ───► PERMANECE INTACTO
branchId       ───► PERMANECE INTACTO
organizationId ───► PERMANECE INTACTO
user UID       ───► PERMANECE INTACTO
membershipId   ───► PERMANECE INTACTO
```

**Razón de Integridad:** Modificar los Document IDs rompería las referencias cruzadas de auditoría, eventos financieros en `/financial_events`, conciliaciones contables y los tokens de sesión de los usuarios.

---

### 2. MATRIZ DE MAPEO DE DOCUMENTOS HACIA EL MODELO CANÓNICO

| Colección | Document ID | `orgId` Actual | `orgId` Propuesto | `branchId` Propuesto | Estado de Migración | Riesgo | Acción Futura |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/organizations` | `{orgId}` | Self | Self | N/A | `MIGRATION_SAFE` | Bajo | Mantener inmutable |
| `/businesses` | `{businessId}` | Valido / Fallback | `business.orgId` (Resuelto) | `branchIds[]` | `MIGRATION_SAFE` | Bajo | Normalizar fallback `org_default_bluesystem` |
| `/branches` | `{branchId}` | Valido / Fallback | `business.orgId` | Self | `MIGRATION_SAFE` | Bajo | Sincronizar `orgId` con su Business padre |
| `/orders` | `{orderId}` | 🔴 `MISSING` | Derivado de `business.orgId` | Preservar actual / `BRANCH_UNRESOLVED` | `MIGRATION_REQUIRES_REVIEW` | Medio | Backfill de `orgId` vía script atómico en lote |
| `/products` | `{productId}` | 🔴 `MISSING` | Derivado de `business.orgId` | Modelado por catálogo (Business Level) | `MIGRATION_REQUIRES_REVIEW` | Medio | Inyectar `orgId` derivado de Business |
| `/users` | `{uid}` | Valido | Invariable | Invariable | `MIGRATION_SAFE` | Bajo | Conservar datos EIAM |
| Documentos Legacy sin Org | Diversos | 🔴 `null` | **NO INVENTAR** | **NO INVENTAR** | `UNRESOLVED_HIERARCHY` | Alto | Reportar como `UNRESOLVED_HIERARCHY` para revisión |
