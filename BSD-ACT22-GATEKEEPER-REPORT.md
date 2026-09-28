# BSD-ACT22-GATEKEEPER-REPORT
## Integración con el Motor Gatekeeper Canónico
**Protocol ID:** `BSD-ACT22-SUBSCRIPTION-FEATURE-MANAGER-001`  

---

### 1. Evaluador Canónico (`gatekeeper.ts`)
- **Preservación Inmutable:** El archivo `functions/src/domain/gatekeeper/gatekeeper.ts` no fue modificado, garantizando cero regresiones en la lógica de evaluación pura.
- **Flujo de Decisión:**
  1. `validateContext()`: Verifica integridad de `uid`, `membershipId`, `tenantId` y `role`.
  2. `evaluateSubscription()`: Verifica que el estado sea `ACTIVE` o `TRIAL`, que pertenezca al `tenantId` del contexto y valida fechas de vigencia (`startDate`, `endDate`).
  3. `getEffectiveEntitlements()`: Calcula los módulos efectivos sumando `enabledFeatures` y deduciendo `disabledFeatures`.
  4. `canAccessModule()`: Retorna `AccessDecision` con `allowed: true/false` y razón diagnóstica.
