# C2D25E — DECISION PACKAGE
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`
### Formal Name: Multi-Brand Build Factory Hardening & Second Product Provisioning Readiness

---

### 1. Respuestas Ejecutivas a las 10 Preguntas Críticas

1. **¿La fábrica está lista para un segundo producto?**
   Arquitectónicamente **SÍ** (*Zero-Flavor-Expansion* verificado), pero operativamente requiere completar el aprovisionamiento de Firebase (**GAP-FB-01**) e inyección de assets (**GAP-BA-01**).
2. **¿Qué gaps permanecen?**
   - `GAP-FB-01` (P0): Registro de la segunda Android App en `bluesystem-7c9af`.
   - `GAP-BA-01` (P1): Inyección automatizada de launcher icons y splash.
   - `GAP-FB-02` (P2): Autorización de package y SHA-1 en Google Maps.
3. **¿Cuál es el blocker principal?**
   `GAP-FB-01` (Falta del segundo cliente en `google-services.json`).
4. **¿Qué acciones son internas?**
   Diseño del script pre-build de inyección de assets y validación estática de `AppConfigEntity`.
5. **¿Qué acciones son externas?**
   Registro en Firebase Console y autorización en Google Cloud Console.
6. **¿Qué acciones requieren autorización humana?**
   La provisión en consolas y la emisión del token Level 6 específico para el segundo build.
7. **¿Qué riesgo existe si se construye ahora?**
   El APK compilaría pero fallaría en runtime al inicializar Firebase Auth, FCM y Maps.
8. **¿Qué debe verificarse antes del segundo build?**
   Que `google-services.json` contenga ambos clientes y que los assets de la marca estén listos.
9. **¿Cuál sería el candidato correcto para una futura fase (C2D.25F)?**
   Un segundo producto comercial bien definido (ej. `brand-live-commercial-02` / `com.fitoni.delivery` o package WhiteLabel) con su correspondiente `AppConfigEntity`.
10. **¿Qué autorización específica deberá emitir el humano en la siguiente fase?**
    Una orden explícita con scope: `tenantId`, `brandId`, `appConfigId`, `flavor: whitelabel`, `variant: whitelabelDebug`, `buildNumber`, `maxBuilds: 1`, `single-use: true`.

---

### 2. Veredicto Final de Decisión

```text
══════════════════════════════════════════════════════════════
FINAL DECISION:
🟡 HARDENING_REQUIRED_BEFORE_SECOND_BUILD
══════════════════════════════════════════════════════════════
```
