# FASE I — DOCUMENTO DE CAMBIOS QUE REQUIEREN APROBACIÓN EXPLÍCITA

**Fase:** FASE I — Reconciliación y Remediación Controlada  
**Estado:** PENDING HUMAN REVIEW & APPROVAL  

---

## 1. Tabla de Cambios Propuestos sujeto a Aprobación Humana

| UID | Estado Actual | Cambio Propuesto | Riesgo | Dependencias | Motivo | Estrategia Rollback | Aprobación Requerida |
| :--- | :--- | :--- | :-: | :--- | :--- | :--- | :-: |
| `user_cli_1768237897386` | POS Client Legacy | `LINK` con `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | LOW | Cliente POS Local | Vincular lógicamente las compras POS con la cuenta EIAM de Aldrich Flores sin borrar ningún documento. | Desvincular campo `linkedIdentityId` | **REQUERIDA** |
| `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | Cliente OTP Anónimo | `LINK` por número `82397401` | MEDIUM | Ninguna activa | Caso de teléfono compartido por 4 UIDs. Requiere verificación SMS. | Mantener UIDs separados | **REQUERIDA** |
