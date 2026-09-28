# C2D25C — OBSERVABILITY REPORT
## Protocol ID: `BSD-C2D25C-FIRST-CONTROLLED-BUILD-EXECUTION-001`

---

### 1. Registro de Eventos Sanitizados de Auditoría

| Timestamp (UTC) | Evento Auditado | Parámetros Registrados (Sanitizados) |
|---|---|---|
| `2026-09-01T00:28:36.980Z` | `BUILD_REQUEST_CREATED` | `id: BREQ-C2D25C-CORE-001` |
| `2026-09-01T00:28:36.981Z` | `BUILD_AUTHORIZATION_VALIDATED` | `authId: AUTH-C2D25C-HUMAN-001` |
| `2026-09-01T00:28:36.981Z` | `BUILD_PREFLIGHT_STARTED` | `checks: repo, firebase, gradle` |
| `2026-09-01T00:28:36.982Z` | `IDEMPOTENCY_KEY_COMPUTED` | `idempotencyKey: [SHA256]` |
| `2026-09-01T00:28:36.982Z` | `BUILD_AUTHORIZATION_CONSUMED` | `isConsumed: true` |
| `2026-09-01T00:28:36.983Z` | `BUILD_PREFLIGHT_PASSED` | `status: OK` |
| `2026-09-01T00:28:36.983Z` | `BUILD_STARTED` | `flavor: core, variant: coreDebug` |
| `2026-09-01T00:31:04.229Z` | `BUILD_SUCCEEDED` | `duration: 147.2s` |
| `2026-09-01T00:31:04.461Z` | `ARTIFACT_HASH_COMPUTED` | `sha256: 95a3e6...4545fb` |
| `2026-09-01T00:31:04.461Z` | `ARTIFACT_REGISTERED` | `storageUri: gs://...` |
| `2026-09-01T00:31:04.462Z` | `ARTIFACT_READY` | `status: ARTIFACT_READY` |

---

### 2. Sanitización de Secretos
- Cero contraseñas de keystore registradas.
- Cero tokens de autenticación expuestos.
- Cero llaves privadas registradas en logs.
