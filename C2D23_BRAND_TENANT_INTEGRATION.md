# C2D23 — BRAND & TENANT INTEGRATION
## Integración y Validación Cruzada Tenant ↔ Brand
**Protocol ID:** `C2D.23`  

---

### 1. Garantía de Aislamiento
El módulo `appConfigManager.js` implementa validación cruzada en frontend y backend:
- Al seleccionar un Tenant (`tenantId`), el selector de marcas (`brandId`) se filtra estrictamente para mostrar únicamente aquellas marcas donde `brand.tenantId === tenantId`.
- Si se intenta guardar una configuración con una marca ajena al Tenant, la operación es **bloqueada inmediatamente** con mensaje de error de integridad.

### 2. Atestación de No Fuga Cross-Tenant
Se certifica que ningún Tenant puede configurar o reutilizar marcas comerciales pertenecientes a otro Tenant sin autorización explícita global.
