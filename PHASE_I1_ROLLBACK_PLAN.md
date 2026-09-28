# FASE I.1 — ESTRATEGIA CANÓNICA DE ROLLBACK Y REVERSIBILIDAD

**Principio Absoluto:** Todo cambio futuro aprobado en eventuales fases posteriores debe poseer una captura `BEFORE` / `AFTER` y un script de rollback inverso idempotente.

---

## 1. Matriz de Estrategias de Rollback

| Tipo de Cambio Propuesto | Accion en Firestore | Operación de Rollback Idempotente |
| :--- | :--- | :--- |
| **Normalización de Nombres (`nombre` <- `name`)** | Creación del campo `nombre` con el valor de `name` | Ejecutar `FieldValue.delete()` sobre la propiedad `nombre` |
| **Enlace Lógico (`LINK_CANDIDATE`)** | Creación de propiedad `linkedIdentityId` | Eliminar propiedad `linkedIdentityId` mediante `FieldValue.delete()` |
