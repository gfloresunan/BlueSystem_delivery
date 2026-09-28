# C2D25E — ZERO-FLAVOR-EXPANSION AUDIT
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

---

### 1. Validación del Principio Zero-Flavor-Expansion

El principio fundamental exige que un nuevo cliente **NUNCA requiera modificar `build.gradle.kts` ni crear un nuevo product flavor estático**.

```text
NUEVO CLIENTE ──► BRAND + TENANT + SUBSCRIPTION ──► APP CONFIG ──► BUILD REQUEST
                                                                         │
                                                                         ▼
                                                                FLAVOR 'whitelabel'
                                                              (Propiedades Dinámicas)
                                                                         │
                                                                         ▼
                                                                  ARTEFACTO AISLADO
```

---

### 2. Auditoría del Bloque `whitelabel` en Gradle
En `app/build.gradle.kts`:
```kotlin
create("whitelabel") {
  dimension = "commercialProfile"
  val customAppId = (project.findProperty("customApplicationId") as? String)?.takeIf { it.isNotBlank() } ?: "com.bluesystem.delivery"
  val customAppName = (project.findProperty("customAppName") as? String)?.takeIf { it.isNotBlank() } ?: "Delivery WhiteLabel"
  val customVersionName = (project.findProperty("customVersionName") as? String)?.takeIf { it.isNotBlank() } ?: "1.0.0"
  val customBuildNumber = (project.findProperty("customBuildNumber") as? String)?.toIntOrNull() ?: 100

  applicationId = customAppId
  versionName = customVersionName
  versionCode = customBuildNumber
  resValue("string", "app_name", customAppName)
  manifestPlaceholders["app_name"] = customAppName
}
```

---

### 3. Veredicto
🟢 **ZERO-FLAVOR-EXPANSION: GREEN (Certificado).**
La parametrización dinámica mediante `-PcustomApplicationId` y `-PcustomAppName` cumple al 100% con la regla arquitectónica de *One Core / Zero Forks*.
