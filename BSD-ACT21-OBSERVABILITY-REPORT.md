# BSD-ACT21-OBSERVABILITY-REPORT
## Trazabilidad, Auditoría y Telemetría Operacional
**Protocol ID:** `BSD-ACT21-BRAND-MANAGER-COMMERCIAL-FOUNDATION-001`  

---

### 1. Registro de Eventos en `/audit_events`
Toda operación realizada desde Brand Manager genera un documento estructurado e inmutable:
- `eventType`: `BRAND_CREATED` | `BRAND_UPDATED` | `BRAND_STATUS_CHANGED`
- `actorUid`: UID del Platform Admin autenticado
- `targetBrandId`: ID de la marca afectada
- `targetTenantId`: ID del Tenant propietario
- `timestamp`: Epoch server time
- `metadata`: Objeto sanitizado con `{ displayName, slug, status }` (sin tokens, sin passwords).

### 2. Logs en Consola de Operaciones
- Prefijo canónico: `[BRAND_MANAGER]`
- Niveles de log: `INFO` para transiciones de UI, `WARN` para advertencias de validación, `ERROR` para excepciones de red/Storage.
