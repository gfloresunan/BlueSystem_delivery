# C2D25A — AUTHORIZATION AUDIT REPORT
## Auditoría del Gateway de Autorización y Tokens de Un Solo Uso
**Protocol ID:** `C2D.25A`  

---

### 1. Principios de Validación del Token de Autorización
- **Scoped:** Vinculado a un único `tenantId`, `brandId`, `appConfigId`, `artifactType` y `buildNumber`.
- **Temporal:** Parámetro `expiresAt` con ventana estricta de caducidad.
- **Single-Use:** Al iniciar la compilación el token cambia atómicamente a `isConsumed = true`.
- **Veredicto:** 🟢 **PASS**
