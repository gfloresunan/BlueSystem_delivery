# FASE I — PLAN DE ROLLBACK Y AUDITORÍA DE MUTACIONES

**Principio de Reversibilidad:** Cualquier mutación futura aprobada debe ser precedeida por un evento de auditoría en `/audit_events` y una captura del estado `BEFORE` y `AFTER`.  

---

## 1. Estrategia de Rollback por Tipo de Operación

1. **Normalización de Nombres (`nombre` <- `name`):**
   * **Antes:** Documento sin propiedad `nombre`.
   * **Después:** Documento con `nombre = name`.
   * **Procedimiento Rollback:** Ejecutar `FieldValue.delete()` sobre el campo `nombre` para retornar la estructura exacta previa.

2. **Vinculación de Cuentas (`LINK`):**
   * **Antes:** Documento sin campo `linkedIdentityId`.
   * **Después:** Documento con `linkedIdentityId = targetUid`.
   * **Procedimiento Rollback:** Remover la referencia `linkedIdentityId`.

3. **Cero Operaciones Destructivas:**
   * Al no realizarse ninguna eliminación (`deleteDoc`), el estado de la base de datos se mantiene 100% conservado.
