# C2D25E — REPLAY AUDIT
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

---

### 1. Auditoría del Mecanismo Anti-Replay

El ciclo de vida del token de autorización Level 6 garantiza su uso estrictamente unitario:

$$\text{HUMAN\_AUTHORIZED} \xrightarrow{\text{Preflight Validation}} \text{isConsumed: true} \xrightarrow{\text{Subsequent Execution}} \text{REPLAY\_BLOCKED}$$

---

### 2. Controles Auditados
- **Consumo Atómico:** El estado `isConsumed` se actualiza inmediatamente antes de arrancar Gradle.
- **Rechazo Instantáneo:** Cualquier reintento con el mismo `authId` lanza una excepción `FAIL-CLOSED` (`AUTH_ALREADY_CONSUMED`).
- **Límites Forzados:** `maxBuilds: 1` y `maxArtifacts: 1` impiden la generación de artefactos adicionales bajo el mismo token.

---

### 3. Veredicto
🟢 **REPLAY PROTECTION: GREEN (Comprobado y Activo).**
