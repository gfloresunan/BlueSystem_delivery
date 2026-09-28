# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0 — MATRIZ DE APLICACIÓN EN TIEMPO DE EJECUCIÓN (RUNTIME ENFORCEMENT MATRIX)
**Protocolo:** `BSD-C2D35-IMPLEMENTATION-READINESS-RUNTIME-MAPPING-001`  
**Fase:** POST-C2D.34A / PRE-C2D.35 IMPLEMENTATION  
**Modo:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DATA MUTATION`  
**Fecha:** 3 de Septiembre de 2026  

---

### 1. DIAGNÓSTICO FORENSE DEL MOTOR GATEKEEPER
El motor Gatekeeper (`functions/src/domain/gatekeeper/gatekeeper.ts`) es la autoridad de seguridad comercial central aprobada por **DEC-01** y **ADR-019**. Sin embargo, la auditoría física del repositorio demuestra su desconexión operativa en el runtime transaccional.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 GATEKEEPER ENGINE                      │
                  │   functions/src/domain/gatekeeper/gatekeeper.ts        │
                  └───────────────────────────┬────────────────────────────┘
                                              │
             ┌────────────────────────────────┼────────────────────────────────┐
             ▼                                ▼                                ▼
   ¿Quién lo invoca hoy?             ¿Qué datos lee?                  ¿Quién confía en su retorno?
   • Tests unitarios (142 suites)    • GatekeeperContext en memoria   • Suites de pruebas exclusivamente.
   • canaryPreflightGuard.ts         • Sub.limits y sub.status        • CERO llamadas productivas en
   • CERO Callables transaccionales    pasados en el argumento          Cloud Functions o Firestore Rules.
   • CERO Triggers de órdenes          (NO consulta Firestore en vivo)
```

| Dimensión de Análisis | Estado Observado en Repositorio | Contrato Aprobado C2D.34A (Target) | Brecha de Runtime (Gap) | Severidad |
| :--- | :--- | :--- | :--- | :---: |
| **Puntos de Invocación (Callers)** | Exclusivamente archivos en `functions/src/__tests__/**` y `controlledCanary/canaryPreflightGuard.ts`. | Debe invocarse antes de mutar pedidos, agregar ítems de catálogo, crear usuarios y asignar motorizados. | El backend productivo no invoca el Gatekeeper en ninguna transacción viva. | 🔴 **CRÍTICO** |
| **Fuente de Datos (Data Source)** | Recibe un objeto `GatekeeperContext` suministrado manualmente por el llamador. No realiza I/O contra Firestore. | Debe existir una capa intermedia (`GatekeeperRuntimeAdapter`) que cargue en tiempo real el documento `/subscriptions/{subscriptionId}`. | Si el llamador pasa un objeto incompleto o simulado, la decisión es trivialmente eludible. | 🔴 **CRÍTICO** |
| **Modelo de Decisión (Output Model)** | Retorna estructuras tipadas: `AccessDecision` (`allowed: boolean`, `reason`) y `QuotaDecision`. | Retorno tipado estándar con códigos HTTP mapeados (HTTP 403 Forbidden, HTTP 429 Quota Exceeded). | Correcto en definición de tipos, pero sin integración HTTP/Callable. | 🟢 **PASS (Tipos)** |
| **Confianza de Retorno (Trust)** | Únicamente las aserciones `assert()` de los tests evalúan el resultado de `canAccessModule`. | Los Callables transaccionales deben abortar inmediatamente si `allowed === false`. | Desconexión total: el resultado se descarta porque nadie lo consulta en runtime. | 🔴 **CRÍTICO** |
| **Clasificación Operativa** | **🔴 ISOLATED (Isla Lógica)** | **🟢 OPERATIONALLY CONNECTED** | Aislado en memoria sin integración con endpoints transaccionales reales. | 🔴 **CRÍTICO** |

---

### 2. MATRIZ INTEGRAL DE ENFORCEMENT POR SUPERFICIE Y MÓDULO

Esta matriz mapea cómo se valida hoy y cómo debe validarse bajo el contrato de C2D.34A cada una de las operaciones del sistema.

| Superficie | Dominio / Módulo | Operación Técnica | Archivo Actual | Autoridad Actual | Fallo Observado (Bypass / Riesgo) | Enforcement Aprobado C2D.34A | Nuevo Punto de Control (Runtime Gate) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer App** | Comercio | Crear Pedido (`COMMERCE_DELIVERY`) | `FirebaseManager.kt:256` (`db.collection("orders").add`) | Firestore Rules (`allow create: if customerId == auth.uid`) | Pedido creado directo en BD sin consultar suscripción ni cuotas del comercio. | Pre-commit Gatekeeper check en Callable de creación de órdenes. | `callable: createAuthoritativeOrder` o Rule con validación de status de suscripción. |
| **Customer App** | Encomiendas | Crear Encomienda (`X_TO_Y_DELIVERY`) | `FirebaseManager.kt:256` | Firestore Rules (líneas 614-622) | Operación P2P aislada. No depende de suscripción de comercio (ADR-015). | Inmutable. Preservar separación canónica (DEC-20). | Firestore Rules (sin mutación, Dominio B preservado). |
| **Customer App** | Catálogo | Búsqueda y Visualización | `BusinessRepository.kt` | Firestore Rules (`allow read: if true`) | Comercios suspendidos siguen visibles en la app cliente si `isActive == true`. | Filtro de elegibilidad geográfica y comercial antes de mostrar catálogo. | Backend Discovery (Arquitectura futura DEC-12). |
| **Courier App** | Flota | Tomar Pedido (`claimOrderAtomically`) | `CourierViewModel.kt` / `FirebaseManager.kt:770` | Transacción atómica en `/orders/{orderId}` | Si el pedido ya fue creado, el motorizado lo reclama sin verificar el plan del comercio. | Motorizado NO verifica suscripción (ADR-016 / DEC-11). Filtro previo en Despacho. | Inmutable en Courier App. El backend excluye comercios suspendidos de la bolsa. |
| **Merchant Web** | Pedidos | Aceptar / Procesar Pedido | `OrdersModule.tsx:765` (`updateDoc(orderRef)`) | Firestore Rules (`allow update: if ownsBusiness`) | Si el comercio fue suspendido, el personal puede seguir mutando pedidos en cocina. | Política Outbound Drain: permitir completar pedidos en curso con SLA 2h (DEC-10). | Gatekeeper evalúa estado de orden: drain permitido, creación denegada. |
| **Merchant Web** | Catálogo | Crear / Editar Producto | `CatalogModule.tsx:714` (`addDoc(products)`) | Firestore Rules (`allow create: if ownsBusiness`) | No se valida cuota de storage ni límite de productos; escritura directa. | Gatekeeper evalúa entitlement `CATALOG` y cuotas de productos. | Interponer Callable `adminSaveProduct` o Gatekeeper pre-commit. |
| **Merchant Web** | Personal | Invitar Empleado / Usuario | `StaffModule.tsx:308` (`setDoc(employees)`) | Firestore Rules (`allow create: if isBusinessAdmin`) | No valida `maxUsers` (15 en Professional); se pueden crear infinitos empleados. | Quota Engine evalúa contador `maxUsers` contra `/usage_counters` antes de escribir. | Callable `adminInviteEmployee` con verificación estricta de cuota. |
| **Merchant Web** | Sucursales | Crear Nueva Sucursal | `liveRestaurants.js:1188` (`update({branches})`) | Firestore Rules (`allow update: if isBusinessAdmin`) | No valida `maxBranches` (5 en Professional). Escritura directa sin control de plan. | Quota Engine evalúa `maxBranches` contra `/usage_counters`. | Callable `createBranch` con check atómico de cuota. |
| **Admin Web** | Suscripción | Cambiar Plan / Estado / Cuotas | `subscriptionManager.js:812` (`set(doc)`) | Firestore Rules (`allow write: if isPlatformAdmin`) | Escritura client-side sin concurrency control, sin invalidar tokens, sin audit backend. | Callable `adminMutateSubscription` con locking optimista (`version`) y audit. | Backend Callable obligatorio: `adminMutateSubscription`. |
| **Admin Web** | Empresas | Crear Organización Holding | `governanceService.js:52` (`doc().set()`) | Firestore Rules (`allow write: if isPlatformAdmin`) | Utiliza planes legados (`Corporate Gold`) y escribe directo en `/organizations`. | Mapeo obligatorio al catálogo canónico `PLAN_CATALOG` e inmutabilidad de plan. | Callable `adminSaveOrganization` o normalización de esquemas. |
| **Backend** | Despacho | Notificar y Asignar Flota | `functions/src/triggers/orders.ts:44` (`onCreate`) | Cloud Functions Trigger | Trigger reactivo post-commit. No puede prevenir la creación de órdenes de comercio en mora. | Pre-commit obligatorio; trigger solo despacha push a pool elegible. | `notifyNewOrder` valida `order.subscriptionStatus != 'SUSPENDED'`. |
| **Backend** | Ciclo de Vida | Vencimiento de Facturación | Ausente (no existe scheduler de mora) | N/A | No hay automatismo para transicionar de `ACTIVE` a `PAST_DUE` o `SUSPENDED`. | Cron job evalúa `cycleEndDate` + gracia de 5 días y ejecuta transición formal. | Scheduler diario: `subscriptionLifecycleScheduler`. |

---

### 3. CADENA DE AUTORIDAD DE TIEMPO DE EJECUCIÓN (TARGET RUNTIME FLOW)

Para toda operación con impacto comercial en C2D.35, la ruta de ejecución obligatoria es:

```
[ 1. CLIENT REQUEST ]
        │
        ▼
[ 2. FIRESTORE PERIMETER (RULES) ]
   • ¿Token JWT válido?
   • ¿TenantId coincide con recurso?
   • ¿subscriptionStatus != 'SUSPENDED'? (Filtro perimetral grueso)
        │
        │ (Si es mutación comercial autoritativa)
        ▼
[ 3. CENTRAL BACKEND CALLABLE ]
   • Carga /subscriptions/{subId} en tiempo real.
   • Invoca Gatekeeper.canAccessModule(ctx, module).
   • Invoca Gatekeeper.checkQuota(ctx, resourceKey, requestedAmount, currentUsage).
        │
        ├──► [ RECHAZO ] ──► Emite HTTP 403 / 429 con código diagnóstico. Fin.
        │
        └──► [ APROBADO ]
                 │
                 ▼
[ 4. ATOMIC TRANSACTION ]
   • Escritura del documento comercial en Firestore.
   • Incremento atómico en /usage_counters/{tenantId}_{period} (shard aleatorio 0..4).
   • Registro append-only en /audit_events.
```
