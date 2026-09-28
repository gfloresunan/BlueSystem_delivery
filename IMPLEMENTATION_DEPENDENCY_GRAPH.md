# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0 — GRAFO DE DEPENDENCIAS DE IMPLEMENTACIÓN (IMPLEMENTATION DEPENDENCY GRAPH)
**Protocolo:** `BSD-C2D35-IMPLEMENTATION-READINESS-RUNTIME-MAPPING-001`  
**Fase:** POST-C2D.34A / PRE-C2D.35 IMPLEMENTATION  
**Modo:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DATA MUTATION`  
**Fecha:** 3 de Septiembre de 2026  

---

### 1. DERIVACIÓN FÍSICA DEL GRAFO
El orden de implementación para **C2D.35** no se basa en preferencias teóricas ni en supuestos abstractos, sino en la **cadena de dependencias físicas** demostrada en el repositorio:
1. **Perímetro de Seguridad Primero:** Ninguna llamada de suscripción o cuotas puede proteger los datos si `firestore.rules` permite lectura irrestricta de usuarios (`/users/{uid}`) o balances de repartidores.
2. **Motor de Dominio antes de Endpoints:** Los Callables (`adminMutateSubscription`, `createAuthoritativeOrder`) no pueden funcionar si `gatekeeper.ts` y el modelo de cuotas no están conectados a Firestore.
3. **Contadores de Cuotas antes de Creación de Recursos:** La creación de órdenes o sucursales no puede validarse si la colección `/usage_counters` y su lógica de shards no existen.
4. **Saga de Aprovisionamiento antes de Migración:** No se pueden aprovisionar nuevos tenants seguros sin tener resuelta la compensación Auth+Firestore.
5. **Drenaje de Órdenes antes de Suspensión:** La suspensión comercial de comercios no puede activarse en producción si el orquestador de despacho interrumpe entregas en curso.

---

### 2. GRAFO DIRIGIDO ACÍCLICO (DAG MAESTRO REMEDIADO)

```
                         C2D.34A CLOSED
                               │
                               ▼
                   ┌───────────────────────┐
                   │    WS-1 SECURITY P0   │
                   │    Rules Perimeter    │
                   │  • /users isolation   │
                   │  • /courier_balances  │
                   │  • /audit_events      │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │ CONTRACT RUNTIME BASE │
                   │  • Gatekeeper Adapter │
                   │  • PAST_DUE 5d grace  │
                   │  • Fail-Closed engine │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │   QUOTA FOUNDATION    │
                   │  • 5 physical shards  │
                   │  • Billing resolver   │
                   │  • Reserve / Commit   │
                   └───────────┬───────────┘
                               │
                     ┌─────────┴─────────┐
                     ▼                   ▼
             ┌───────────────┐   ┌───────────────┐
             │ WS-3 SUBS     │   │ WS-5 PROV.    │
             │ • Lifecycle   │   │ • Idempotent  │
             │ • Version int │   │   Saga        │
             │ • Token rev.  │   │ • Rollback    │
             └───────┬───────┘   └───────┬───────┘
                     │                   │
                     └─────────┬─────────┘
                               ▼
                   ┌───────────────────────┐
                   │    WS-6 ORDER CTRL    │
                   │  • Pre-commit order   │
                   │  • Inbound Lock       │
                   │  • Outbound Drain     │
                   │  • Courier Core safe  │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │        WS-7 UI        │
                   │  • Merchant shell     │
                   │  • Admin shell        │
                   │  • Plan normalization │
                   └───────────┬───────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │  WS-9 CERTIFICATION   │
                   │  • E2E Integration    │
                   │  • Concurrency tests  │
                   │  • C2D.36 Gate        │
                   └───────────────────────┘
```

---

### 3. MATRIZ DETALLADA DE PRELACIÓN Y DEPENDENCIAS

| Workstream | Título | Depende Directamente De | Artefactos Físicos Requeridos | ¿Por qué no puede ejecutarse antes? |
| :--- | :--- | :--- | :--- | :--- |
| **WS-1** | Security Foundation | Ninguno (Punto de entrada) | `firestore.rules` | Es la compuerta perimetral P0; cualquier endpoint expuesto antes de este paso es vulnerable. |
| **WS-2** | Gatekeeper Runtime | **WS-1** | `gatekeeper.ts`, `catalog.ts`, `models.ts` | Requiere que el perímetro de aislamiento multi-tenant esté sellado en Rules. |
| **WS-4** | Quota Engine | **WS-2** | `/usage_counters` schema, `gatekeeper.ts:checkQuota` | Las cuotas requieren que el Gatekeeper sepa evaluar la suscripción antes de computar consumo. |
| **WS-3** | Subscription Lifecycle | **WS-2**, **WS-4** | `adminMutateSubscription.ts`, `lifecycleStateMachine.ts` | Las mutaciones de suscripción deben inicializar y verificar contadores de cuota de plan. |
| **WS-5** | Provisioning Saga | **WS-3**, **WS-4** | `provisionTenantEnterprise.ts`, `provisioningPipeline.ts` | El aprovisionamiento crea suscripciones y contadores; ambas estructuras deben estar ya definidas. |
| **WS-6** | Order Continuity | **WS-2**, **WS-4** | `orders.ts`, `OrdersModule.tsx`, `FirebaseManager.kt` | El bloqueo de nuevas órdenes y el drenaje dependen de la suscripción y el Gatekeeper. |
| **WS-7** | Admin/Merchant Shell | **WS-3**, **WS-5** | `subscriptionManager.js`, `governanceCenter.js`, `SettingsModule.tsx` | La UI no puede invocar Callables si estos no existen y no han sido probados en backend. |
| **WS-8** | Customer Boundary | Arquitectura Futura (C2D.34A DEC-12) | `BusinessRepository.kt` | Congelado para implementación comercial core; solo guardrails documentados. |
| **WS-9** | E2E Certification | **WS-1 a WS-7** | Emuladores Firebase, Jest test suites | Requiere que todos los touchpoints estén materializados y conectados. |

---

### 4. IMPLICACIONES DE ROLLBACK EN EL GRAFO
Si un workstream falla durante su ejecución en C2D.35:
- **Fallo en WS-1 (Security Rules):** Revertir git commit de `firestore.rules` inmediatamente. No afecta base de datos ni datos persistidos.
- **Fallo en WS-2 (Gatekeeper):** Los Callables regresan a fallback seguro fail-closed sin corromper esquemas.
- **Fallo en WS-4 (Quota Engine):** Si los shards se corrompen, el recálculo asíncrono desde `/orders` del mes restaura el total sin pérdida financiera.
- **Fallo en WS-3 (Subscription Lifecycle):** El campo `version` rechaza escrituras concurrentes. Rollback de documento restaura versión previa sin tocar `tenant.status`.
- **Fallo en WS-5 (Provisioning Saga):** La compensación LIFO ejecuta `admin.auth().deleteUser(uid)` y elimina documentos creados en Firestore, retornando al estado cero.
- **Fallo en WS-6 (Order Continuity):** No se tocan órdenes `PICKED_UP` o `IN_TRANSIT`; el motorizado y el cliente están blindados por ADR-016 y ADR-018.
