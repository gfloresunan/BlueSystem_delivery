# C2D25 — SIGNING ARCHITECTURE
## Arquitectura de Firma de Binarios (Keystore / Play App Signing)
**Protocol ID:** `C2D.25`  

---

### 1. Modelo de Firma por Entorno

| Entorno | Llave Utilizada | Tipo de Artefacto | Propósito |
|---|---|---|---|
| **Development** | `debug.keystore` | APK (Debug) | Pruebas locales / Emulador / QA |
| **Staging** | Upload Key (Staging) | APK (Staging) | Pruebas internas cerradas (Firebase App Dist.) |
| **Production** | Google Play App Signing / Release Key | AAB (Release) | Publicación en Google Play Store |

### 2. Prevención de Firma No Autorizada
- Solo un `BuildRequest` con `status: AUTHORIZED` y token temporal válido podrá invocar el bloque de firma de producción (`signingConfig = signingConfigs.getByName("release")`).
