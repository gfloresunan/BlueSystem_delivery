# C2D25D — GAP ANALYSIS
## Protocol ID: `BSD-C2D25D-MULTI-BRAND-BUILD-FACTORY-READINESS-001`

---

### 1. Clasificación Formal de Brechas (GAPs)

| GAP ID | Severidad | Descripción del Gap | Impacto / Riesgo | Resolución Recomendada |
|---|---|---|---|---|
| **GAP-FB-01** | **P0 (Blocker)** | Falta de registro del `applicationId` del segundo producto en `google-services.json`. | Firebase Auth/FCM fallarán en runtime si se compila un nuevo package name no provisionado. | Registrar la nueva Android App en la consola de Firebase (`bluesystem-7c9af`) e incorporar su cliente a `google-services.json`. |
| **GAP-BA-01** | **P1 (High)** | Inyección de assets de marca (ícono adaptativo y splash) no automatizada en Gradle. | El APK de una segunda marca compartiría el ícono de launcher por defecto de BlueSystem. | Diseñar pipeline de inyección de recursos gráficos de launcher durante el pre-vuelo del build. |
| **GAP-FB-02** | **P2 (Medium)** | Credenciales de Google Maps vinculadas a un único SHA-1 en Google Cloud Console. | Los mapas en el segundo APK podrían fallar si la clave de Maps no autoriza el nuevo package name. | Añadir la huella digital SHA-1 del keystore y el nuevo package name a la API Key de Maps en GCP. |
| **GAP-SG-01** | **P3 (Low)** | Proceso manual de parametrización de variables de entorno para firma de release. | Retraso operativo al promover de staging a release. | Integrar gestión automática de secretos vía Google Cloud Secret Manager en CI/CD futuro. |

---

### 2. Resumen de Brechas
- **GAPs P0 (Blockers):** 1 (`GAP-FB-01: Firebase Android App Registration`)
- **GAPs P1 (High):** 1 (`GAP-BA-01: Launcher Icon & Splash Asset Injection`)
- **GAPs P2 (Medium):** 1 (`GAP-FB-02: Google Maps API Key Package Whitelist`)
- **GAPs P3 (Low):** 1 (`GAP-SG-01: Automated Release Secret Management`)

---

### 3. Veredicto de Preparación
Dado que existe al menos un GAP clasificado como P0 (Blocker de Firebase para un segundo `applicationId`), se requiere una fase de **Hardening** antes de autorizar la compilación física de un segundo producto.
