# C2D25 — BUILD AUTHORIZATION MODEL
## Modelo de Autorización de Compilación Scoped y de Un Solo Uso
**Protocol ID:** `C2D.25`  

---

### 1. Invariantes de la Autorización de Build
Toda autorización de compilación debe cumplir con los siguientes 7 principios de seguridad:
1. **EXPLICIT:** No se infiere por el éxito de una fase previa.
2. **SPECIFIC:** Contiene el `tenantId`, `brandId`, `appConfigId`, `artifactType` y `buildNumber` exactos.
3. **SCOPED:** No permite compilar ningún otro tenant ni otro flavor.
4. **TEMPORAL:** Expira automáticamente tras una ventana de tiempo estricta (ej. 30 minutos).
5. **SINGLE-USE (Non-Replayable):** Una vez consumida por el Build Engine, su estado pasa a `CONSUMED` y no puede volver a ejecutarse.
6. **AUDITABLE:** Registrada en `/audit_events` con el `actorUid` humano que autorizó la acción.
7. **FAIL-CLOSED:** Cualquier discrepancia en checksums, permisos o firmas aborta el proceso de inmediato.
