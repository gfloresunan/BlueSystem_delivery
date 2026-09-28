# BSD-ACT22-OBSERVABILITY-REPORT
## Trazabilidad y Eventos de Auditoría Administrativa
**Protocol ID:** `BSD-ACT22-SUBSCRIPTION-FEATURE-MANAGER-001`  

---

### 1. Esquema de Registro en `/audit_events`
Toda acción ejecutada desde `subscriptionManager.js` produce un registro inmutable:
- `eventType`: `SUBSCRIPTION_CREATED` | `SUBSCRIPTION_UPDATED` | `SUBSCRIPTION_ASSIGNED` | `SUBSCRIPTION_STATUS_CHANGED`
- `actorUid`: UID del Platform Admin
- `targetSubscriptionId`: ID de la suscripción
- `targetTenantId`: ID del Tenant asociado
- `timestamp`: Epoch ms
- `metadata`: `{ planTier, planName, status, enabledFeaturesCount }` (cero secretos, cero credenciales).

### 2. Logs en Consola
- Prefijo canónico: `[SUBSCRIPTION_MANAGER]`
- Formato estructurado para depuración forense en navegador y tests.
