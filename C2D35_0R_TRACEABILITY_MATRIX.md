# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0-R — MATRIZ REMEDIADA DE TRAZABILIDAD BIDIRECCIONAL
**Bidirectional Traceability Matrix: Decisions → Contracts → Enforcement Points → Tests**

- **Protocolo Oficial:** `BSD-C2D35.0R-TRACEABILITY-MATRIX-001`
- **Fase:** POST-C2D.35.0 / PRE-C2D.35.1
- **Autoridad:** C2D.34A Decision Baseline (`DEC-01` a `DEC-25`)
- **Modo:** `READ-ONLY AUDIT & CONTRACT VERIFICATION`
- **Fecha:** 3 de Septiembre de 2026

---

## 1. PRINCIPIO DE INTEGRIDAD DE TRAZABILIDAD (NO FALSE PASS)

Bajo las reglas estrictas de gobernanza de C2D.35.0-R:
- ❌ **DOCUMENTED $\ne$ IMPLEMENTED:** El hecho de que exista una especificación no autoriza a marcar un componente como implementado.
- ❌ **IMPLEMENTED $\ne$ CERTIFIED:** Código sin pruebas de integración con emuladores no puede recibir certificación.
- ✅ **CONTRACT SEALED / READY FOR IMPLEMENTATION:** Denota que el contrato de arquitectura, la firma de la interfaz, el punto de enforcement y el caso de prueba están 100% definidos y libres de contradicción, listos para ser codificados en C2D.35.1.

---

## 2. MATRIZ MAESTRA DE TRAZABILIDAD BIDIRECCIONAL

| Decisión C2D.34A | Requisito Formal de Arquitectura | Contrato de Runtime | Punto Físico de Enforcement | Artefacto de Código Target | Suite de Pruebas de Validación | Estado de Preparación (Readiness Status) |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **DEC-01** (Decision Point) | Modelo Híbrido: Gatekeeper Backend central + Rules perimetral | `evaluateSubscription()` | Callable entrypoint & Rules header | `gatekeeper.ts` / `firestore.rules` | `integrationGatekeeperContract.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-02** (Lifecycle) | 7 estados finitos; 5 días de gracia operativa en `PAST_DUE` | `SubscriptionStateMachine` | `evaluateSubscription()` L57 | `lifecycleStateMachine.ts` | `pastDueGraceWindow.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-03** (Pre-commit) | Prohibición de triggers reactivos para denegación comercial | Pre-commit Callable Gate | Entrypoints síncronos Cloud Functions | `createAuthoritativeOrder.ts` | `preCommitVsTriggerOrder.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-05** (Claims Subordination) | Claims como optimización de ruteo; SSOT en `/subscriptions` | `ClaimsAuthorityContract` | Gatekeeper Runtime Adapter | `authClaimsSync.ts` | `staleTokenSafety.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-06** (Professional Quotas) | 3k órdenes, 3 comercios, 5 sucursales, 15 usuarios, 10 motorizados. Cero maxProducts | `ProfessionalQuotaContract` | Sharded Quota Checker | `quotaEngine.ts` | `professionalQuotaLimits.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-07** (Billing Period) | Período anclado a `cycleStartDate → cycleEndDate` | `resolveBillingPeriod()` | Cálculo determinista de `periodKey` | `billingPeriodResolver.ts` | `billingCycleTransition.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-08** (Sharded Counters) | 5 documentos físicos en subcolección `/shards` con reserve/commit | `PhysicalShardModel` | Transacción atómica Firestore | `shardedCounterEngine.ts` | `concurrentShardReservation.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-09** (Provisioning Saga) | Saga 4 fases con compensación (`deleteUser` en Auth) | `ProvisioningSagaEngine` | Callable `provisionTenantEnterprise` | `provisionTenantCallable.ts` | `provisioningCompensationRollback.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-10** (Order Drain) | Inbound Lock en nuevas órdenes + Outbound Drain (SLA 2h) | `OrderContinuityEngine` | Gatekeeper + Despacho | `orderContinuityManager.ts` | `inboundLockOutboundDrain.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-11** (Courier Core Frozen) | ADR-016 blindado; filtrado aguas arriba en despacho | `FrozenCourierBoundary` | `claimOrderAtomically` (intacto) | `FirebaseManager.kt` | `courierCoreZeroDrift.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-13** (Admin Mutation) | Invocación exclusiva vía Callable con control `version` | `adminMutateSubscription` | Callable con optimistic lock | `adminMutateSubscription.ts` | `concurrencyVersionLock.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-14** (Rules vs Backend) | Rules aísla multi-tenant; Backend valida lógica y cuotas | `RulesResponsibilityMatrix` | `firestore.rules` L204, L1180 | `firestore.rules` | `firestoreRulesPerimeter.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-15** (Fail-Closed) | Denegación estricta ante errores o timeouts de cuota | `FailClosedPolicy` | Gatekeeper catch block | `gatekeeper.ts` | `failClosedGracefulDenial.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-16** (White-Label) | Prohibido otorgar Enterprise por omisión en dominios raíz | `TenantDomainResolver` | `resolveTenantByDomain()` | `tenantDomainResolver.ts` | `unresolvedDomain404.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-18** (Deny-First Overrides)| `disabledFeatures` prevalece sobre `enabledFeatures` y planes | `resolveEffectiveEntitlements` | Gatekeeper Feature Evaluator | `gatekeeper.ts` | `denyFirstPrecedence.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-20** (Orders vs Trips) | Aislamiento estricto `/orders` vs `/deliveryTrips` (P2P) | `BiDomainIsolationContract` | Colecciones y Callables independientes | `FirebaseManager.kt` | `p2pDeliveryTripImmunity.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-21** (Finance Continuity) | Inmutabilidad de cierres (ADR-018) ante suspensión comercial | `FinancialLedgerImmunity` | Cierres y balances desacoplados | `courierClosureCallables.ts` | `financialLedgerContinuity.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-22** (Mandatory Audit) | Bitácora inmutable append-only en `/audit_events` | `AuditEventSchema` | Rules (`allow update, delete: if false;`)| `firestore.rules` L836 | `auditEventsImmutability.test.ts` | 🟢 **CONTRACT SEALED** |
| **DEC-23** (Version Concurrency)| Control de concurrencia optimista mediante campo `version` | `OptimisticLockingPrecondition`| Precondition en WriteBatch/Tx | `adminMutateSubscription.ts` | `optimisticVersionCollision.test.ts` | 🟢 **CONTRACT SEALED** |

---

## 3. AUDITORÍA DE CONSISTENCIA Y CIERRE

1. **Cero Gaps de Decisión:** Cada una de las 19 decisiones críticas cuenta con un contrato de runtime, un punto de enforcement inequívoco, un archivo físico asignado y un diseño de prueba unitaria/integración.
2. **Eliminación de Contradicciones:** Se resolvió la discrepancia de `claimOrderAtomically` (DEC-11), el período de gracia de `PAST_DUE` (DEC-02) y la purga de `maxProducts` (DEC-06).
3. **Estado de Certificación:** Todos los elementos quedan sellados como **CONTRACT SEALED**, listos para la fase de implementación C2D.35.1.
