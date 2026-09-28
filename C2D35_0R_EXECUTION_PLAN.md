# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0-R — PLAN MAESTRO DE EJECUCIÓN REMEDIADO (C2D.35.1 EXECUTION PLAN)
**Implementation Plan, Workstream Sequencing, Boundary Constraints & Rollback Protocols**

- **Protocolo Oficial:** `BSD-C2D35.0R-EXECUTION-PLAN-001`
- **Fase:** POST-C2D.35.0 / PRE-C2D.35.1
- **Autoridad:** C2D.34A Baseline & C2D.35.0-R Remediation
- **Modo:** `PLAN ONLY — NO IMMEDIATE EXECUTION — ZERO CODE MUTATION AUTHORIZED YET`
- **Fecha:** 3 de Septiembre de 2026

---

> [!CAUTION]
> ### 🛑 REGLA DE GOBERNANZA ADR-014 (NO AUTO-ROLLOUT POLICY)
> Este documento constituye exclusivamente un **Plan de Ingeniería Estructurado**. La existencia, completitud o aprobación de este plan **NO AUTORIZA** por sí misma la modificación de código fuente, la alteración de reglas de Firestore ni el despliegue a producción. Se requiere una orden humana expresa y separada antes de ejecutar el primer Workstream.

---

## 1. RESUMEN DE WORKSTREAMS Y PRELACIÓN FÍSICA

El plan de ejecución se estructura en 8 workstreams estrictamente acoplados al Grafo Dirigido Acíclico (`C2D35_0R_DAG.md`):

```
[WS-1: SECURITY P0] ──► [WS-2: RUNTIME BASE] ──► [WS-4: QUOTA FOUNDATION]
                                                          │
                                ┌─────────────────────────┴────────────────────────┐
                                ▼                                                  ▼
                     [WS-3: SUBSCRIPTION LIFECYCLE]                     [WS-5: PROVISIONING SAGA]
                                │                                                  │
                                └─────────────────────────┬────────────────────────┘
                                                          ▼
                                            [WS-6: ORDER CONTINUITY & DRAIN]
                                                          │
                                                          ▼
                                            [WS-7: UI SHELL INTEGRATION]
                                                          │
                                                          ▼
                                            [WS-9: E2E CERTIFICATION]
```

---

## 2. DETALLE DE WORKSTREAMS DE IMPLEMENTACIÓN

### 2.1 Workstream WS-1: Security P0 Foundation
- **Objetivo:** Erradicar las vulnerabilidades P0 en `firestore.rules` cerrando la lectura global de `/users`, la auto-escalación de `tenantId` y la exposición de balances de motorizados.
- **Precondiciones:** Repositorio en rama limpia; emulador de Firestore configurado.
- **Dependencias:** Ninguna (Punto de entrada de Fase 0).
- **Componentes Afectados:**
  - `firestore.rules` (L204-209, L214-217, L836, L1180-1186).
- **Componentes Prohibidos:** Prohibido modificar reglas de `/orders` o `/subscriptions` en este paso.
- **Puntos de Entrada:** Edición quirúrgica de `firestore.rules`.
- **Frontera de Seguridad:**
  - `/users/{uid}`: `read: if currentUid() == uid || isPlatformAdmin();`.
  - `/courier_balances/{courierId}`: `read: if currentUid() == courierId || isPlatformAdmin() || isSupervisor();`.
  - `/audit_events`: `allow update, delete: if false;`.
- **Rollback / Compensación:** Reversión atómica de `firestore.rules` mediante Git.
- **Pruebas Obligatorias:** `npm test -- firestoreRulesSecurity.test.ts`.
- **Gate de Certificación:** 100% de tests de penetración en emuladores aprobados.

---

### 2.2 Workstream WS-2: Commercial Runtime Base & Gatekeeper Adapter
- **Objetivo:** Conectar `gatekeeper.ts` con el runtime real de Cloud Functions; corregir el período de gracia de 5 días en `PAST_DUE`; eliminar el fallback silencioso a `ENTERPRISE` en dominios raíz.
- **Precondiciones:** WS-1 certificado.
- **Dependencias:** WS-1.
- **Componentes Afectados:**
  - `functions/src/domain/gatekeeper/gatekeeper.ts` (L57-59, L164-166).
  - [NEW] `functions/src/domain/gatekeeper/GatekeeperRuntimeAdapter.ts`.
  - `functions/src/domain/whitelabel/tenantDomainResolver.ts`.
- **Componentes Prohibidos:** Prohibido modificar `catalog.ts` ni inventar estados de suscripción.
- **Puntos de Entrada:** Implementación de clase singleton `GatekeeperRuntimeAdapter`.
- **Frontera de Seguridad:** Validación estricta fail-closed ante errores de lectura.
- **Rollback / Compensación:** Restauración de `gatekeeper.ts`.
- **Pruebas Obligatorias:** `npm test -- gatekeeperRuntimeAdapter.test.ts`.
- **Gate de Certificación:** Evaluación exitosa de `PAST_DUE` a los 4 días (permitido) y a los 6 días (denegado).

---

### 2.3 Workstream WS-4: Sharded Quota Foundation
- **Objetivo:** Implementar el subsistema físico de contadores con 5 documentos de shards independientes por período, resolver canónico de ciclo de facturación y protocolo atómico `RESERVE → COMMIT → RELEASE`.
- **Precondiciones:** WS-2 certificado.
- **Dependencias:** WS-2.
- **Componentes Afectados:**
  - [NEW] `functions/src/domain/quotas/ShardedCounterEngine.ts`.
  - [NEW] `functions/src/domain/quotas/BillingPeriodResolver.ts`.
  - [NEW] `functions/src/domain/quotas/QuotaReservationManager.ts`.
  - [NEW] `functions/src/triggers/scheduledQuotaReconciliation.ts`.
- **Componentes Prohibidos:** Prohibido reintroducir `maxProducts` o crear shards como campos de 1 documento.
- **Puntos de Entrada:** Invocación en transacciones de Cloud Functions.
- **Frontera de Seguridad:** Transacciones Firestore atómicas con precondiciones de límite.
- **Rollback / Compensación:** Compensación automática por sweep worker si la reserva expira (>120s).
- **Pruebas Obligatorias:** `npm test -- concurrentShardReservation.test.ts` (100 escrituras concurrentes).
- **Gate de Certificación:** Cero carreras de cuota (`QUOTA-RACE`); bloqueo estricto al 100% (3,000 pedidos).

---

### 2.4 Workstream WS-3: Subscription Lifecycle & Concurrency
- **Objetivo:** Crear el Callable `adminMutateSubscription` con control de concurrencia optimista (`version`), máquina de 7 estados deterministas y revocación de tokens JWT en suspensión.
- **Precondiciones:** WS-4 certificado.
- **Dependencias:** WS-2, WS-4.
- **Componentes Afectados:**
  - [NEW] `functions/src/callables/adminMutateSubscription.ts`.
  - `functions/src/domain/subscriptions/lifecycleStateMachine.ts`.
- **Componentes Prohibidos:** Prohibido permitir transiciones no autorizadas (e.g. `CANCELLED → ACTIVE`).
- **Puntos de Entrada:** Callable seguro en `functions/src/index.ts`.
- **Frontera de Seguridad:** Exclusivo para usuarios con `role == 'SUPER_ADMIN'` o `isPlatformAdmin()`.
- **Rollback / Compensación:** Invalidez de la mutación ante colisión de `expectedVersion`.
- **Pruebas Obligatorias:** `npm test -- subscriptionLifecycleConcurrency.test.ts`.
- **Gate de Certificación:** Colisión rechazada si dos administradores editan la misma versión simultáneamente.

---

### 2.5 Workstream WS-5: Enterprise Provisioning Saga
- **Objetivo:** Implementar el Callable `provisionTenantEnterprise` mediante una saga idempotente de 4 fases con compensación garantizada (`admin.auth().deleteUser`) ante fallo en Firestore.
- **Precondiciones:** WS-3 y WS-4 certificados.
- **Dependencias:** WS-3, WS-4.
- **Componentes Afectados:**
  - [NEW] `functions/src/callables/provisionTenantEnterprise.ts`.
  - `functions/src/domain/provisioning/provisioningPipeline.ts`.
- **Componentes Prohibidos:** Prohibido utilizar batches en memoria simulados en producción.
- **Puntos de Entrada:** Callable transaccional backend.
- **Frontera de Seguridad:** Validación estricta de cuotas (`maxBusinesses <= 3`).
- **Rollback / Compensación:** Bloque `catch` invoca eliminación de Auth si falla el batch de Firestore.
- **Pruebas Obligatorias:** `npm test -- provisioningSagaCompensation.test.ts`.
- **Gate de Certificación:** Prueba de inyección de fallo en fase 3 elimina el usuario en Auth sin dejar basura en BD.

---

### 2.6 Workstream WS-6: Order Continuity & Commercial Drain
- **Objetivo:** Crear el Callable `createAuthoritativeOrder` con pre-commit comercial, Inbound Lock en suspensión y Outbound Drain para pedidos en cocina/ruta; blindar Courier Core (**ADR-016**).
- **Precondiciones:** WS-3 y WS-5 certificados.
- **Dependencias:** WS-3, WS-5.
- **Componentes Afectados:**
  - [NEW] `functions/src/callables/createAuthoritativeOrder.ts`.
  - `functions/src/domain/orders/orderContinuityEngine.ts`.
  - `firestore.rules` (`allow create: if false;` en `/orders` para SDKs directos).
- **Componentes Prohibidos:** **TERMINANTEMENTE PROHIBIDO MODIFICAR COURIER CORE** (`FirebaseManager.kt:claimOrderAtomically`, `CourierViewModel.kt`).
- **Puntos de Entrada:** Callable de órdenes y trigger de despacho aguas arriba.
- **Frontera de Seguridad:** Gatekeeper pre-commit síncrono.
- **Rollback / Compensación:** Liberación de reserva de cuota si la creación de la orden falla.
- **Pruebas Obligatorias:** `npm test -- orderContinuityDrain.test.ts`.
- **Gate de Certificación:** Órdenes bloqueadas para comercio suspendido; órdenes activas se entregan con éxito.

---

### 2.7 Workstream WS-7: Administrative UI Shell & Normalization
- **Objetivo:** Conectar `subscriptionManager.js` al Callable `adminMutateSubscription`; normalizar selectores de planes a los 4 canónicos en `governanceCenter.js`; adaptar Merchant Web y Android Customer App al Callable de órdenes.
- **Precondiciones:** WS-6 certificado.
- **Dependencias:** WS-3, WS-6.
- **Componentes Afectados:**
  - `panel-admin/public/js/dashboard/subscriptionManager.js` (L811-824).
  - `panel-admin/public/js/dashboard/governanceCenter.js` (L584-586).
  - `merchant-web/src/modules/orders/OrdersModule.tsx`.
  - `app/src/main/java/com/example/FirebaseManager.kt` (ruteo a Callable).
- **Componentes Prohibidos:** Prohibido escribir directo con `db.collection('subscriptions').set()`.
- **Puntos de Entrada:** SDK de Firebase Functions `httpsCallable`.
- **Frontera de Seguridad:** Manejo seguro de errores HTTP 429 / Quota Exceeded en frontend.
- **Rollback / Compensación:** Reversión de assets estáticos web.
- **Pruebas Obligatorias:** Verificación visual y pruebas de integración de navegador.
- **Gate de Certificación:** Transición de estado exitosa reflejada en UI sin bypass client-side.

---

### 2.8 Workstream WS-9: Certification & C2D.36 Closure Gate
- **Objetivo:** Ejecutar la suite integral de pruebas de integración y regresión; validar cero impacto en núcleos congelados (**ADR-013**, **ADR-015**, **ADR-016**, **ADR-017**, **ADR-018**); emitir reporte de certificación C2D.36.
- **Precondiciones:** Todos los workstreams previos completados.
- **Dependencias:** WS-1 a WS-7.
- **Componentes Afectados:** Reportes de certificación y suites completas.
- **Gate Final:** Emisión de dictamen `PROMOTION_AUTHORIZED` para despliegue en Canary.

---

## 3. CONCLUSIÓN DEL PLAN DE EJECUCIÓN

El plan maestro queda completamente definido, delimitado y protegido contra mutaciones no autorizadas. Su ejecución permanece en espera de la orden humana correspondiente.
