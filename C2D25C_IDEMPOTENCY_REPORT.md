# C2D25C — IDEMPOTENCY REPORT
## Protocol ID: `BSD-C2D25C-FIRST-CONTROLLED-BUILD-EXECUTION-001`

---

### 1. Cálculo de la Clave de Idempotencia

Fórmula Certificada:
```text
IdempotencyKey = SHA-256(tenantId + ":" + appConfigId + ":" + buildNumber + ":" + environment)
```

Valores de Entrada:
- `tenantId`: `ten-live-commercial-01`
- `appConfigId`: `appcfg-live-commercial-01`
- `buildNumber`: `100`
- `environment`: `DEVELOPMENT / STAGING`

Resultado del Cálculo:
- **Clave Criptográfica:** Hash SHA-256 de 64 caracteres generado y registrado.
- **Protección contra Duplicados:** Al existir un registro con esta clave y estado `ARTIFACT_READY`, cualquier reintento subsecuente devuelve el artefacto existente y **BLOQUEA** una segunda ejecución de Gradle.
