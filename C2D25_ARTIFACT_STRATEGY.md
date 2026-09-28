# C2D25 — ARTIFACT STRATEGY (APK VS AAB)
## Estrategia de Gestión de Artefactos e Inmutabilidad
**Protocol ID:** `C2D.25`  

---

### 1. Convención de Artefactos y Rutas

| Tipo | Extensión | Destino | Uso |
|---|---|---|---|
| **APK** | `.apk` | `gs://bluesystem-build-artifacts/{tenantId}/{brandId}/{buildNumber}/app-release.apk` | Distribución interna directa y QA |
| **AAB** | `.aab` | `gs://bluesystem-build-artifacts/{tenantId}/{brandId}/{buildNumber}/app-release.aab` | Publicación en Google Play Store |

### 2. Registro Canónico en `/releases` o `/artifacts`
Cada compilación exitosa registrará un documento inmutable:
- `artifactId`: UUIDv4
- `sha256`: Hash criptográfico SHA-256 del binario.
- `fileSizeBytes`: Tamaño exacto en bytes.
- `storageUrl`: URI de Google Cloud Storage protegida por IAM.
- `gitCommit`: Hash exacto del commit de Git utilizado.
