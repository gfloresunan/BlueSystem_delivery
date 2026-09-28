# C2D25B — FIRST BUILD CANDIDATE SPECIFICATION
## Especificación y Justificación del Candidato para el Primer Build Controlado
**Protocol ID:** `BSD-C2D25B-BUILD-HARDENING-FIRST-BUILD-READINESS-001`  

---

### 1. Perfil del Candidato de Compilación

| Parámetro | Valor Certificado |
|---|---|
| **Flavor Canónico** | `core` |
| **Variante de Build** | `coreDebug` |
| **Application ID** | `com.aistudio.delivery.djweq` |
| **Nombre de App** | `BlueSystem Delivery` |
| **Versión** | `1.0.0` (Build Number: `100`) |
| **Tipo de Artefacto** | `APK` |
| **Ambiente** | `DEVELOPMENT / STAGING` |
| **Tenant Asociado** | `ten-live-commercial-01` (o baseline) |
| **Firma** | `debugConfig` (`debug.keystore`) |
| **Mapeo Firebase** | 🟢 **100% Provisto en `google-services.json`** |

### 2. Justificación Técnica
Es la única configuración que garantiza **cero fricciones en la verificación física**, permitiendo certificar el compilador local sin riesgos para tenants comerciales externos.
