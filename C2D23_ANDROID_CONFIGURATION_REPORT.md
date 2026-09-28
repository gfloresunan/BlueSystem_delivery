# C2D23 — ANDROID CONFIGURATION REPORT
## Estado de la Configuración Android y Barrera de Compilación
**Protocol ID:** `C2D.23`  

---

### 1. Parámetros Android Gestionados
- `applicationId`: Identificador de paquete canónico (ej: `com.fitoni.delivery`).
- `versionName`: Versión visible (ej: `1.0.0`).
- `buildNumber`: Código de compilación entero (ej: `100`).
- `firebaseProjectId` / `firebaseAppId`: Identificadores de proyecto y app de Firebase.
- `mapsApiKey`: Clave de Google Maps.

### 2. Demostración Física de la Barrera de Build (`READY_FOR_BUILD ≠ BUILD`)
- Se verificó que guardar una configuración en `appConfigManager.js`:
  1. No ejecuta comandos de consola (`gradlew`, `assembleRelease`, `bundleRelease`).
  2. No modifica `app/build.gradle.kts`.
  3. No genera artefactos APK ni AAB.
  4. No dispara flujos de CI/CD ni GitHub Actions.
- La configuración reside exclusivamente como un documento declarativo en Firestore `/app_configs`.
