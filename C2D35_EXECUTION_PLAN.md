# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0 — PLAN MAESTRO DE EJECUCIÓN FÍSICA (C2D.35 EXECUTION PLAN)
**Protocolo:** `BSD-C2D35-IMPLEMENTATION-READINESS-RUNTIME-MAPPING-001`  
**Fase:** POST-C2D.34A / PRE-C2D.35 IMPLEMENTATION  
**Modo:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DATA MUTATION`  
**Fecha:** 3 de Septiembre de 2026  

---

### 1. REGLAS SUPREMAS DE EJECUCIÓN
1. **Zero Architectural Invention:** C2D.35 no podrá inventar transiciones de estado, modelos de datos ni cuotas.
2. **Especificidad Quirúrgica:** Queda estrictamente prohibido usar expresiones ambiguas como *"modificar archivos relacionados"*. Cada workstream declara archivos exactos, símbolos exactos y líneas exactas.
3. **No Auto-Rollout Policy (ADR-014):** La ejecución de C2D.35 requiere autorización humana explícita posterior.

---

### WORKSTREAM 1 — SECURITY FOUNDATION & PERIMETER HARDENING

- **WORKSTREAM ID:** `WS-1-SEC`
- **Objective:** Sellar las vulnerabilidades P0 de seguridad en `firestore.rules` (fuga de lectura global de `/users`, escalación de privilegios en perfiles y balance de repartidores expuesto a comerciantes).
- **Approved Decision(s):** `DEC-14`, `DEC-25`
- **ADR:** `ADR-019`, `ADR-004`
- **Current State:** 
  - `firestore.rules` L204-209 permite lectura de `/users/{uid}` a cualquier `isBusinessStaff()` o `isBusinessAdmin()`.
  - `firestore.rules` L214-217 permite actualizar `/users/{uid}` sin verificar `tenantId` en claves afectadas.
  - `firestore.rules` L1180-1186 permite a `isBusinessAdmin()` leer balances de cualquier repartidor en `/courier_balances/{courierId}`.
  - `firestore.rules` L836 permite a administradores modificar o eliminar bitácoras en `/audit_events`.
- **Exact Files:** `firestore.rules`, `app/src/main/firestore.rules`
- **Exact Symbols:** Reglas `match /users/{uid}`, `match /courier_balances/{courierId}`, `match /audit_events/{eventId}`
- **Mutation Paths:** N/A (reglas de seguridad de base de datos)
- **Dependencies:** Ninguna (Punto de entrada FASE 0 en el grafo)
- **Required Changes:**
  1. En `match /users/{uid}`: Eliminar `isBusinessStaff() || isBusinessAdmin()` de la regla de lectura, restringiendo a `currentUid() == uid || isPlatformAdmin()`.
  2. En `match /users/{uid}`: Agregar `"tenantId"`, `"permissions"`, `"eiamVer"`, `"businessId"`, `"branchId"` a la lista de claves protegidas en `affectedKeys().hasAny(...)`.
  3. En `match /courier_balances/{courierId}`: Eliminar `isBusinessAdmin()` de la regla de lectura.
  4. En `match /audit_events/{eventId}`: Reemplazar `allow update, delete: if isPlatformAdmin();` por `allow update, delete: if false;`.
- **Forbidden Changes:** Prohibido modificar reglas de `/orders`, `/deliveryTrips` o colecciones no relacionadas. Prohibido relajar reglas de autenticación.
- **Security Impact:** Elimina la fuga masiva de datos personales y la autoasignación cross-tenant.
- **Data Impact:** Cero mutación de datos; solo endurecimiento de permisos.
- **Financial Impact:** Protege la privacidad de saldos acumulados de los repartidores.
- **Client Impact:** Los clientes solo pueden leer y actualizar sus propios perfiles.
- **Test Requirements:** Ejecutar `firestoreRulesDifferential.test.ts` en emulador Firebase con matrices de ataque de C2D.30.
- **Rollback Strategy:** Revertir cambios en `firestore.rules` mediante Git checkout al hash anterior.
- **Compensation Strategy:** N/A (reglas declarativas).
- **Acceptance Criteria:** Todas las pruebas de ataque cross-tenant sobre `/users` y `/courier_balances` retornan `PERMISSION_DENIED` (100% pass).
- **Entry Gate:** Human Authorization de C2D.35.0.
- **Exit Gate:** 0 fallos en suite de seguridad perimetral de Firestore Rules.

---

### WORKSTREAM 2 — COMMERCIAL GATEKEEPER RUNTIME ADAPTER

- **WORKSTREAM ID:** `WS-2-GK`
- **Objective:** Conectar el motor Gatekeeper (`gatekeeper.ts`) con el runtime de Cloud Functions y resolver las contradicciones de `PAST_DUE` y fallback `ENTERPRISE`.
- **Approved Decision(s):** `DEC-01`, `DEC-02`, `DEC-03`, `DEC-15`, `DEC-16`, `DEC-18`
- **ADR:** `ADR-019`
- **Current State:**
  - `functions/src/domain/gatekeeper/gatekeeper.ts` es puro in-memory, sin acceso a Firestore.
  - Línea 57 de `gatekeeper.ts` rechaza `PAST_DUE` inmediatamente sin evaluar gracia.
  - Línea 164 de `functions/src/domain/whitelabel/tenantDomainResolver.ts` otorga `ENTERPRISE` por omisión.
- **Exact Files:**
  - `functions/src/domain/gatekeeper/gatekeeper.ts`
  - `functions/src/domain/gatekeeper/GatekeeperRuntimeAdapter.ts` [NEW]
  - `functions/src/domain/whitelabel/tenantDomainResolver.ts`
- **Exact Symbols:**
  - `evaluateSubscription()` (L39-75)
  - `canAccessModule()` (L117-199)
  - `GatekeeperRuntimeAdapter.loadContextAndEvaluate()` [NEW]
  - `TenantDomainResolver.resolveDomain()` (L137-167)
- **Mutation Paths:** N/A (solo evaluación de acceso)
- **Dependencies:** `WS-1-SEC`
- **Required Changes:**
  1. En `gatekeeper.ts:57`: Permitir `PAST_DUE` si `now <= sub.pastDueGraceUntil` (5 días continuos de gracia aprobados en DEC-02).
  2. Crear `GatekeeperRuntimeAdapter.ts`: Carga `/subscriptions/{subscriptionId}` desde Firestore, verifica concurrencia y evalúa `canAccessModule`.
  3. En `tenantDomainResolver.ts:164`: Eliminar asignación de `planTier: 'ENTERPRISE'` en dominios por defecto; asignar `STARTER` o exigir resolución formal de tenant.
- **Forbidden Changes:** Prohibido relajar el principio de Default Deny. Prohibido ignorar `disabledFeatures`.
- **Security Impact:** Establece la compuerta de acceso definitiva previa a la ejecución de código comercial.
- **Data Impact:** Cero mutación en base de datos.
- **Financial Impact:** Garantiza que los comercios en mora no consuman recursos fuera de su gracia.
- **Client Impact:** Respeta los 5 días de gracia para que el comercio no sufra apagón inmediato por fallas bancarias.
- **Test Requirements:** Actualizar y ejecutar `certG01GatekeeperShield.test.ts` y `entitlementGatekeeper.test.ts`.
- **Rollback Strategy:** Revertir `gatekeeper.ts` y eliminar `GatekeeperRuntimeAdapter.ts`.
- **Compensation Strategy:** Fail-Closed por defecto ante fallo de lectura de suscripción.
- **Acceptance Criteria:** Comercios con `PAST_DUE` en gracia operan; comercios en día 6 post-vencimiento reciben `SUBSCRIPTION_EXPIRED`.
- **Entry Gate:** Cierre exitoso de `WS-1-SEC`.
- **Exit Gate:** 100% de tests de Gatekeeper validados en emulador.

---

### WORKSTREAM 3 — SUBSCRIPTION LIFECYCLE & MUTATION CALLABLE

- **WORKSTREAM ID:** `WS-3-SUB`
- **Objective:** Implementar el Callable `adminMutateSubscription` con máquina de estados de 7 estados, control de concurrencia optimista (`version`), bitácora forense y revocación de tokens.
- **Approved Decision(s):** `DEC-02`, `DEC-04`, `DEC-05`, `DEC-13`, `DEC-22`, `DEC-23`
- **ADR:** `ADR-019`, `ADR-022`
- **Current State:**
  - No existe `adminMutateSubscription`.
  - Admin Web (`subscriptionManager.js:812`) muta `/subscriptions` directamente desde el navegador con `{ merge: true }`.
  - No se maneja el campo `version` (riesgo de sobrescritura entre administradores).
  - No se revocan sesiones en `SUSPENDED` o `CANCELLED`.
- **Exact Files:**
  - `functions/src/callables/adminMutateSubscription.ts` [NEW]
  - `functions/src/domain/platform/lifecycleStateMachine.ts`
  - `functions/src/index.ts`
- **Exact Symbols:**
  - `adminMutateSubscription` [NEW]
  - `SubscriptionStateMachine.transition()`
  - `export { adminMutateSubscription } from './callables/adminMutateSubscription'`
- **Mutation Paths:** `MUT-SUB-001`, `MUT-SUB-002`
- **Dependencies:** `WS-2-GK`
- **Required Changes:**
  1. Crear `adminMutateSubscription.ts`:
     - Exigir rol de Platform Admin validado.
     - Leer `/subscriptions/{subId}` en transacción.
     - Validar que `expectedVersion === currentSub.version` (Optimistic Concurrency). Si no coincide: abortar con `FAILED_PRECONDITION`.
     - Validar transición permitida en la máquina de 7 estados (CANCELLED es terminal irreversible).
     - Incrementar `version = currentSub.version + 1`.
     - Escribir en `/subscriptions/{subId}` y sincronizar proyección derivada unidireccional en `/tenants/{tenantId}.status`.
     - Si la transición es hacia `SUSPENDED` o `CANCELLED`: invocar `admin.auth().revokeRefreshTokens(ownerUid)` y actualizar `subStatus` en Custom Claims.
     - Escribir bitácora append-only en `/audit_events` dentro de la transacción.
  2. Exportar en `functions/src/index.ts`.
- **Forbidden Changes:** Prohibido permitir la transición `CANCELLED → ACTIVE`. Prohibido mutar `tenant.status` de forma independiente a la suscripción.
- **Security Impact:** Cierra la puerta trasera de mutación client-side de contratos comerciales.
- **Data Impact:** Introduce campo `version: number` en todas las suscripciones mutadas.
- **Financial Impact:** Impide la reactivación fraudulenta de suscripciones canceladas.
- **Client Impact:** Los administradores concurrentes no sobrescriben configuraciones ajenas.
- **Test Requirements:** Suite unitaria `subscriptionMutationConcurrency.test.ts` probando 10 mutaciones paralelas (solo 1 pasa, 9 fallan con version mismatch).
- **Rollback Strategy:** Desplegar versión anterior de Functions; las escrituras existentes no sufren corrupción.
- **Compensation Strategy:** La transacción atómica de Firestore revierte todos los cambios si falla cualquier paso.
- **Acceptance Criteria:** Toda mutación incrementa `version`, escribe en `/audit_events` y revoca tokens si suspende.
- **Entry Gate:** Cierre de `WS-2-GK`.
- **Exit Gate:** Pruebas de concurrencia optimista y transiciones de estado aprobadas.

---

### WORKSTREAM 4 — QUOTA ENGINE & DISTRIBUTED SHARDS

- **WORKSTREAM ID:** `WS-4-QTA`
- **Objective:** Crear la colección `/usage_counters/{tenantId}_{period}` con 5 shards distribuidos, transacciones de incremento atómico y compuertas al 85% y 100%.
- **Approved Decision(s):** `DEC-06`, `DEC-07`, `DEC-08`
- **ADR:** `ADR-021`
- **Current State:**
  - La colección `/usage_counters` no existe físicamente en el repositorio.
  - `gatekeeper.ts:checkQuota` compara argumentos en memoria sin persistencia.
- **Exact Files:**
  - `functions/src/domain/quotas/UsageCounterEngine.ts` [NEW]
  - `functions/src/domain/quotas/models.ts` [NEW]
  - `functions/src/domain/gatekeeper/gatekeeper.ts`
- **Exact Symbols:**
  - `UsageCounterEngine.incrementUsage()` [NEW]
  - `UsageCounterEngine.getAggregatedUsage()` [NEW]
  - `UsageCounterEngine.reconcileCounters()` [NEW]
  - `checkQuota()` (L258-339)
- **Mutation Paths:** `/usage_counters/{tenantId}_{periodKey}`
- **Dependencies:** `WS-2-GK`
- **Required Changes:**
  1. Crear `models.ts` para cuotas: definir estructura de documento con `shard_0` a `shard_4`, `totalCached`, `periodKey` (`YYYYMM`), `resourceType`.
  2. Crear `UsageCounterEngine.ts`:
     - Seleccionar shard aleatorio $i \in \{0..4\}$.
     - Ejecutar transacción atómica en Firestore con `FieldValue.increment(requestedAmount)`.
     - Validar que $\sum \text{shards} + \text{requested} \le \text{limit}$.
     - Si excede el 85%: emitir advertencia de Soft Limit vía logger y notificación.
     - Si excede el 100%: rechazar con error `QUOTA_EXCEEDED` (HTTP 429).
     - Si el plan es `ENTERPRISE` (`limit == -1`): bypass por diseño.
  3. Vincular `checkQuota` en `gatekeeper.ts` con `UsageCounterEngine`.
- **Forbidden Changes:** Prohibido almacenar contadores en memoria volátil de Node.js. Prohibido usar un único contador monolítico sin particionamiento (sharding).
- **Security Impact:** Previene ataques de agotamiento de recursos y uso abusivo fuera del contrato pagado.
- **Data Impact:** Nueva colección `/usage_counters`.
- **Financial Impact:** Hace exigible el límite de 3,000 órdenes en el plan Professional.
- **Client Impact:** Comercios que llegan al 85% reciben aviso previo antes de ser bloqueados al 100%.
- **Test Requirements:** Suite `shardedQuotaEngine.test.ts` con 50 peticiones concurrentes validando que el límite de 3,000 órdenes no sea perforado.
- **Rollback Strategy:** Si falla el conteo en shards, activar modo fail-closed y correr script de reconciliación desde `/orders`.
- **Compensation Strategy:** En caso de orden cancelada o rechazada inmediatamente, invocar `decrementUsage()` sobre un shard.
- **Acceptance Criteria:** La suma de los 5 shards refleja exactamente el número de pedidos creados en el ciclo.
- **Entry Gate:** Cierre de `WS-2-GK`.
- **Exit Gate:** 50 requests concurrentes en el límite 2,999 bloquean a partir de la orden 3,001.

---

### WORKSTREAM 5 — ENTERPRISE TENANT PROVISIONING SAGA

- **WORKSTREAM ID:** `WS-5-PRV`
- **Objective:** Reemplazar el simulador in-memory de aprovisionamiento por el Callable productivo `provisionTenantEnterprise` con saga de compensación explícita.
- **Approved Decision(s):** `DEC-09`, `DEC-19`
- **ADR:** `ADR-022`
- **Current State:**
  - `functions/src/domain/provisioning/provisioningPipeline.ts` usa un adaptador simulado en memoria (`ControlledFirestoreBatchEngine`).
  - No hay un Callable que cree el usuario en Firebase Auth y los documentos en Firestore con rollback real.
- **Exact Files:**
  - `functions/src/callables/provisionTenantEnterprise.ts` [NEW]
  - `functions/src/domain/provisioning/firestoreProvisioningAdapter.ts`
  - `functions/src/index.ts`
- **Exact Symbols:**
  - `provisionTenantEnterprise` [NEW]
  - `ProvisioningEngine.provisionTenant()`
  - `export { provisionTenantEnterprise } from './callables/provisionTenantEnterprise'`
- **Mutation Paths:** `/tenants`, `/brands`, `/businesses`, `/branches`, `/subscriptions`, `/tenant_memberships`, `/usage_counters`, Firebase Auth
- **Dependencies:** `WS-3-SUB`, `WS-4-QTA`
- **Required Changes:**
  1. Crear `provisionTenantEnterprise.ts`:
     - FASE 1: Validar unicidad de slug, dominio y email.
     - FASE 2: Crear usuario en Firebase Auth con `admin.auth().createUser()`.
     - FASE 3: Escribir en `WriteBatch` atómico de Firestore real todas las entidades (`/tenants`, `/brands`, `/businesses`, `/branches`, `/subscriptions`, `/tenant_memberships`, `/usage_counters`).
     - FASE 3.COMPENSACIÓN: Si falla el batch de Firestore, invocar inmediatamente `admin.auth().deleteUser(uid)` para no dejar usuarios huérfanos.
     - FASE 4: Emitir Custom Claims iniciales (`tenantId`, `eiamRole: 'OWNER'`, `eiamVer: 1`, `subStatus: 'ACTIVE'`).
  2. Implementar registro de idempotencia mediante `idempotencyKey` persistida.
- **Forbidden Changes:** Prohibido asumir que Auth y Firestore son transaccionales sin compensación explícita.
- **Security Impact:** Garantiza identidades congruentes y membresías limpias sin usuarios huérfanos.
- **Data Impact:** Crea el paquete estructural canónico completo para nuevos clientes.
- **Financial Impact:** Asigna el contrato de suscripción y los contadores en cero desde el día 1.
- **Client Impact:** Experiencia de alta determinística sin fallas silenciosas.
- **Test Requirements:** Suite `enterpriseProvisioningSaga.test.ts` inyectando fallo inducido en Fase 3 y verificando que el usuario Auth sea purgado.
- **Rollback Strategy:** Si la saga falla a medio camino, la compensación elimina los residuos.
- **Compensation Strategy:** LIFO Rollback: `admin.auth().deleteUser(uid)` + eliminación de documentos creados.
- **Acceptance Criteria:** Fallo en Firestore elimina usuario en Auth; re-ejecución con misma idempotencyKey retorna `REPLAYED`.
- **Entry Gate:** Cierre de `WS-3-SUB` y `WS-4-QTA`.
- **Exit Gate:** Prueba de inyección de fallas aprobada con cero estado residual.

---

### WORKSTREAM 6 — ORDER CONTINUITY & COMMERCIAL DRAIN

- **WORKSTREAM ID:** `WS-6-ORD`
- **Objective:** Implementar la compuerta de creación autoritativa de órdenes y las reglas de drenaje (Inbound Lock & Outbound Drain con SLA 2h) ante comercios suspendidos.
- **Approved Decision(s):** `DEC-01`, `DEC-03`, `DEC-10`, `DEC-11`, `DEC-20`, `DEC-21`
- **ADR:** `ADR-019`, `ADR-020`, `ADR-016`
- **Current State:**
  - Los pedidos se crean directamente desde la aplicación móvil del cliente en Firestore (`FirebaseManager.kt:256`).
  - No existe validación pre-commit del estado comercial del comercio.
  - Si un comercio es suspendido, no existe lógica formal para permitir el despacho de pedidos ya aceptados o en cocina.
- **Exact Files:**
  - `functions/src/callables/coupons.ts` (`createAuthoritativeOrder`)
  - `functions/src/triggers/orders.ts` (`notifyNewOrder`)
  - `merchant-web/src/modules/OrdersModule.tsx`
  - `app/src/main/java/com/example/FirebaseManager.kt`
- **Exact Symbols:**
  - `createAuthoritativeOrder`
  - `notifyNewOrder`
  - `handleUpdateStatus`
  - `crearPedido()`
- **Mutation Paths:** `MUT-ORD-001`, `MUT-ORD-004`, `MUT-ORD-008`
- **Dependencies:** `WS-2-GK`, `WS-4-QTA`
- **Required Changes:**
  1. En `createAuthoritativeOrder`:
     - Invocar `GatekeeperRuntimeAdapter` para validar que el comercio tenga `subscription.status in ['ACTIVE', 'TRIAL']` (o `PAST_DUE` en gracia).
     - Invocar `UsageCounterEngine.incrementUsage()` para reservar 1 orden dentro del límite de 3,000.
     - Si el comercio está `SUSPENDED` o `CANCELLED`: rechazar inmediatamente (Inbound Lock activo).
  2. En `notifyNewOrder`:
     - Verificar que pedidos creados para comercios suspendidos sean cancelados automáticamente si están en estado `CREATED`.
     - Si la orden está en `PREPARING`, `READY`, `ASSIGNED`, `PICKED_UP`, `IN_TRANSIT`: permitir flujo normal de entrega y liquidación de repartidor (Outbound Drain activo).
  3. En `OrdersModule.tsx`:
     - Mostrar banner de drenaje si el comercio está suspendido: *"Comercio suspendido: complete los pedidos en preparación en las próximas 2 horas. No se recibirán nuevas órdenes."*
- **Forbidden Changes:** Prohibido interrumpir entregas en manos de motorizados (`PICKED_UP`, `IN_TRANSIT`). Prohibido modificar el código de la Courier App (ADR-016). Prohibido afectar encomiendas `X_TO_Y_DELIVERY` (DEC-20).
- **Security Impact:** Elimina la creación de órdenes no autorizadas en comercios morosos.
- **Data Impact:** Estampa campos de auditoría de drenaje (`drainDeadline`, `commercialStatusAtCreation`) en la orden.
- **Financial Impact:** Protege el cobro de comisiones y garantiza el 100% de la ganancia al repartidor.
- **Client Impact:** Clientes no pueden ordenar en restaurantes suspendidos; órdenes activas se entregan con normalidad.
- **Test Requirements:** Suite `orderDrainLifecycle.test.ts` simulando suspensión de comercio mientras tiene 1 orden en `CREATED`, 1 en `PREPARING` y 1 en `IN_TRANSIT`.
- **Rollback Strategy:** Restaurar la función `notifyNewOrder` original.
- **Compensation Strategy:** Órdenes rechazadas en `createAuthoritativeOrder` no incrementan el contador de cuota.
- **Acceptance Criteria:** Orden en `CREATED` de comercio suspendido se cancela; orden en `IN_TRANSIT` se entrega y liquida exitosamente.
- **Entry Gate:** Cierre de `WS-2-GK` y `WS-4-QTA`.
- **Exit Gate:** Pruebas de Inbound Lock y Outbound Drain verificadas.

---

### WORKSTREAM 7 — MERCHANT & ADMIN INTEGRATION

- **WORKSTREAM ID:** `WS-7-INT`
- **Objective:** Actualizar las interfaces de Merchant Web y Admin Web para invocar los nuevos Callables autorizados y eliminar escrituras directas y cadenas legadas.
- **Approved Decision(s):** `DEC-13`, `DEC-17`, `DEC-18`
- **ADR:** `ADR-019`, `ADR-021`
- **Current State:**
  - `subscriptionManager.js` escribe directo a Firestore (`db.collection('subscriptions')`).
  - `governanceCenter.js` permite seleccionar planes legados (`Corporate Gold`, `Standard Tenant`).
  - `useGatekeeper.ts` en Merchant Web no valida el estado de la suscripción.
- **Exact Files:**
  - `panel-admin/public/js/dashboard/subscriptionManager.js`
  - `panel-admin/public/js/dashboard/governanceCenter.js`
  - `merchant-web/src/shared/gatekeeper/useGatekeeper.ts`
- **Exact Symbols:**
  - `subscriptionManagerModule.saveSubscription()` (L743)
  - `governanceCenterModule.handleSaveOrganization()` (L616)
  - `useGatekeeper.isModuleEnabled()` (L49)
- **Mutation Paths:** `MUT-SUB-001`, `MUT-TEN-001`
- **Dependencies:** `WS-3-SUB`, `WS-5-PRV`
- **Required Changes:**
  1. En `subscriptionManager.js:743`:
     - Reemplazar `db.collection('subscriptions').doc().set(...)` por `firebase.functions().httpsCallable('adminMutateSubscription')({ ... })`.
     - Enviar `expectedVersion: currentSub.version`.
     - Manejar error `FAILED_PRECONDITION` mostrando alerta: *"La suscripción fue modificada por otro administrador. Recargue la página."*
  2. En `governanceCenter.js:583`:
     - Reemplazar opciones del selector por planes oficiales: `STARTER`, `PROFESSIONAL`, `ENTERPRISE`, `CUSTOM`.
  3. En `useGatekeeper.ts:49`:
     - Integrar lectura de `activeTenant.subscriptionStatus`. Si es `SUSPENDED` o `CANCELLED`: bloquear pestañas comerciales (Catálogo, Promociones) y dejar únicamente Dashboard y Liquidación de Caja.
- **Forbidden Changes:** Prohibido reintroducir llamadas directas `setDoc`/`updateDoc` sobre `/subscriptions`.
- **Security Impact:** La UI queda completamente subordinada a los Callables de backend.
- **Data Impact:** Cero escrituras no auditadas desde navegadores.
- **Financial Impact:** Erradica el aliasing de planes legados.
- **Client Impact:** Interfaces administrativas reflejan en tiempo real el estado contractual real.
- **Test Requirements:** Pruebas en navegador de edición concurrente en `subscriptionManager.js` verificando el bloqueo por versión.
- **Rollback Strategy:** Revertir commits en archivos JS/TSX del frontend.
- **Compensation Strategy:** N/A (UI reactiva).
- **Acceptance Criteria:** `subscriptionManager.js` no contiene ninguna llamada `db.collection('subscriptions').doc().set`.
- **Entry Gate:** Cierre de `WS-3-SUB` y `WS-5-PRV`.
- **Exit Gate:** Auditoría estática confirmando 0 mutaciones directas a `/subscriptions` desde el frontend.

---

### WORKSTREAM 8 — CUSTOMER BOUNDARY GUARDRAIL (FUTURE SCOPE)

- **WORKSTREAM ID:** `WS-8-CST`
- **Objective:** Blindar y documentar los guardrails de Customer Discovery sin implementar código prematuro (C2D.34A DEC-12).
- **Approved Decision(s):** `DEC-12`, `DEC-16`
- **ADR:** `ADR-019`
- **Current State:** La arquitectura de descubrimiento geográfico por cobertura de polígono previo a catálogo está aprobada conceptualmente pero diferida para desarrollo futuro.
- **Exact Files:** `app/src/main/java/com/example/data/business/BusinessRepository.kt` (Solo inspección)
- **Exact Symbols:** `getBusinesses()`, `searchProducts()`
- **Mutation Paths:** N/A (Solo lectura)
- **Dependencies:** N/A
- **Required Changes:**
  1. CERO cambios de código en Android Customer App en C2D.35.
  2. Mantener especificación técnica para la fase de Discovery dedicada.
- **Forbidden Changes:** Prohibido implementar endpoints de geocodificación o cambiar índices de catálogo en C2D.35.
- **Security Impact:** N/A
- **Data Impact:** Cero mutación.
- **Financial Impact:** N/A
- **Client Impact:** La aplicación cliente existente continúa operando sin regresión.
- **Test Requirements:** Pruebas de regresión de compilación en Android Studio.
- **Rollback Strategy:** N/A
- **Compensation Strategy:** N/A
- **Acceptance Criteria:** Código de Customer Android permanece intocado.
- **Entry Gate:** N/A
- **Exit Gate:** Verificación de no-mutación en `git status app/`.

---

### WORKSTREAM 9 — INTEGRAL CERTIFICATION & AUDIT CLOSURE

- **WORKSTREAM ID:** `WS-9-CERT`
- **Objective:** Ejecutar la suite completa de pruebas de integración, pruebas de estrés de concurrencia, validación de reglas de Firestore y emitir la certificación E2E.
- **Approved Decision(s):** `DEC-01` a `DEC-25`
- **ADR:** Todos los ADRs del sistema
- **Current State:** C2D.35.0 en auditoría de preparación.
- **Exact Files:** `functions/src/__tests__/**`, `firestore.rules`
- **Exact Symbols:** Todas las suites de prueba del sistema
- **Mutation Paths:** Ejecución exclusiva en Firebase Emulators / Test Sandboxes
- **Dependencies:** `WS-1-SEC` a `WS-7-INT`
- **Required Changes:**
  1. Ejecutar suite `npm test` en `functions/`.
  2. Ejecutar prueba de concurrencia de cuotas (50 hilos paralelos).
  3. Ejecutar prueba de mutación concurrente de suscripciones.
  4. Ejecutar matriz de pruebas de reglas de seguridad de Firestore.
  5. Validar inmutabilidad de núcleos congelados (ADR-013, ADR-015, ADR-016, ADR-017, ADR-018).
- **Forbidden Changes:** Prohibido alterar aserciones de prueba para forzar aprobaciones falsas.
- **Security Impact:** Garantiza la inviolabilidad de la plataforma.
- **Data Impact:** Cero escrituras en producción.
- **Financial Impact:** Certifica la consistencia financiera total.
- **Client Impact:** Plataforma robusta y lista para promoción controlada.
- **Test Requirements:** 100% de suites en verde sin excepciones ni skips no documentados.
- **Rollback Strategy:** N/A
- **Compensation Strategy:** N/A
- **Acceptance Criteria:** Todas las pruebas pasan; reporte formal C2D.36 listo para firma de auditoría.
- **Entry Gate:** Cierre exitoso de todos los workstreams previos (WS-1 a WS-7).
- **Exit Gate:** Certificación E2E formal emitida.
