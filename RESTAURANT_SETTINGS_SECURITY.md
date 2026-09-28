# RESTAURANT SETTINGS SECURITY & AUDIT SPECIFICATION
**BlueSystem Delivery Enterprise v2.1 (Sprint 15.5)**

---

## 1. Seguridad y Registro de Auditoría

- **Policy Engine**: Todo cambio en configuraciones sensibles (impuestos, métodos de pago, personal) valida la pertenencia a los roles `PROPIETARIO` o `GERENTE`.
- **Trazabilidad AuditLogger**: Cada guardado genera un registro de auditoría conteniendo `restaurantId`, `userId`, `version`, `checksumSha256` y `traceId`.
