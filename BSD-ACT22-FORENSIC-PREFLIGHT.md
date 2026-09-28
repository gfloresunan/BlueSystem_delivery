# BSD-ACT22-FORENSIC-PREFLIGHT
## Preflight Forense de Catálogos y Modelos Canónicos
**Protocol ID:** `BSD-ACT22-SUBSCRIPTION-FEATURE-MANAGER-001`  

---

### 1. Evidencia de Modelos Canónicos Auditados
- `SubscriptionEntity` (`functions/src/domain/platform/models.ts`): Contrato completo con `subscriptionId`, `tenantId`, `planId`, `planName`, `planTier`, `status`, `enabledFeatures`, `disabledFeatures`, `limits` (`SubscriptionQuotas`).
- `MODULE_CATALOG` (`functions/src/domain/gatekeeper/catalog.ts`): 16 módulos de capacidad (`ORDERS`, `CATALOG`, `CUSTOMERS`, `PROMOTIONS`, `FINANCE`, `REPORTS`, `CONTROL_TOWER`, `FLEET_CORE`, `GPS_TRACKING`, `X_TO_Y_DELIVERY`, `NOTIFICATIONS`, `ANALYTICS`, `GOVERNANCE`, `MULTI_BRANCH`, `MULTI_BRAND`, `API_ACCESS`).
- `PLAN_CATALOG` (`functions/src/domain/gatekeeper/catalog.ts`): 4 niveles de suscripción con paquetes de entitlements y cuotas base.
- `Gatekeeper Engine` (`functions/src/domain/gatekeeper/gatekeeper.ts`): Motor evaluador con Default Deny y deducción dinámica de entitlements.

### 2. Dictamen de Entitlements
Se confirmó que los Entitlements son **derivados en memoria por Gatekeeper** y no requieren una colección física paralela `/entitlements` ni reglas adicionales en Firestore.
