# BSD-ACT21-BRAND-CRUD-REPORT
## Operaciones CRUD y Validación de Datos de Marca
**Protocol ID:** `BSD-ACT21-BRAND-MANAGER-COMMERCIAL-FOUNDATION-001`  

---

### 1. Operaciones Soportadas
- **Create:** Generación de nuevas marcas con `brandId` determinístico (`brand-live-{slug}-01`), asociación a un Tenant existente y validación de campos obligatorios.
- **Read:** Suscripción reactiva en tiempo real (`onSnapshot`) a la colección `/brands` con soporte de búsqueda client-side.
- **Update:** Actualización segura de campos visuales y metadata con `merge: true`, registrando `updatedAt` y `updatedBy`.
- **Status Change:** Transición controlada entre `ACTIVE`, `DRAFT` y `ARCHIVED`.

### 2. Validaciones de Integridad
- **Formato HEX:** Expresión regular `^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$` obligatoria en los 5 tokens de color.
- **Inmutabilidad de Brand ID:** El ID de marca no puede ser modificado una vez creada la entidad.
- **Aislamiento de Tenant:** Es obligatorio seleccionar un Tenant registrado.
