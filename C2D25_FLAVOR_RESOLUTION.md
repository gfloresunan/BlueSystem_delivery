# C2D25 — FLAVOR RESOLUTION & ZERO-FLAVOR-EXPANSION
## Resolución Dinámica de Perfiles Comerciales sin Expansión de Gradle
**Protocol ID:** `C2D.25`  

---

### 1. Resolución por Perfil Comercial (`commercialProfile`)

| Modelo Comercial | Flavor Mapeado | Estrategia de Inyección en Build Engine |
|---|---|---|
| **Marketplace Oficial** | `core` | `applicationId = "com.aistudio.delivery.djweq"` (fijo) |
| **Enterprise Fitoni** | `enterpriseFitoni` | `applicationId = "com.fitoni.delivery"` (referencia) |
| **White Label / Agencia / Nuevos Tenants** | `whitelabel` | **Inyección Dinámica de Parámetros** desde `AppConfigEntity` (`applicationId`, `app_name`, `versionName`, `buildNumber`) |

### 2. Inyección Dinámica en Gradle
El Build Engine ejecutará Gradle pasando propiedades del proyecto:
```bash
./gradlew :app:assembleWhitelabelRelease \
  -PcustomApplicationId="com.nuevo-cliente.delivery" \
  -PcustomAppName="Nuevo Cliente Express" \
  -PcustomVersionName="1.0.0" \
  -PcustomBuildNumber=101
```
De esta forma, `app/build.gradle.kts` utiliza `project.findProperty("customApplicationId") ?: "com.bluesystem.delivery"`, permitiendo compilar infinitos clientes comerciales sobre el flavor `whitelabel` sin tocar el código fuente ni modificar `build.gradle.kts`.
