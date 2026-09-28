# MERCHANT FINANCE SECURITY & MULTI-TENANT SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.7)**

---

## 1. Seguridad Multi-Tenant y Validación de Permisos

- **Aislamiento Multi-Tenant**: Toda consulta exige el `businessId` verificado del token autenticado. Ningún comercio puede acceder a la información de otro restaurante.
- **AuditLogger**: La generación de reportes y exportación en PDF/Excel queda registrada en AuditLogger con `traceId` y `userId`.
