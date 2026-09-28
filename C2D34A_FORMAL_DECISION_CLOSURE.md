# BLUESYSTEM DELIVERY ENTERPRISE
## C2D.34A — PUERTA FORMAL DE CIERRE DE DECISIONES ARQUITECTÓNICAS Y COMERCIALES
**Decision Closure Package, Canonical Contracts & ADR Approval Baseline**

- **Protocolo Oficial:** `BSD-C2D34A-FORMAL-ARCHITECTURAL-COMMERCIAL-DECISION-CLOSURE-001`
- **Sistema:** BlueSystem Delivery Enterprise v2.2 / v3 EIAM
- **Fase de Ejecución:** Post-C2D.34 / Pre-C2D.35
- **Modo Operativo:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DATA MUTATION / ZERO DEPLOYMENT`
- **Autor y Auditor Principal:** Senior Developer & Auditor de BlueSystem Enterprise
- **Fecha de Emisión:** 3 de Septiembre de 2026
- **Estado de Cierre:** `DECISION CLOSURE STATUS: 🟢 CLOSED`

---

## 1. EXECUTIVE DECISION SUMMARY

La fase **C2D.34A** constituye la compuerta formal, vinculante e ineludible que clausura el ciclo de diagnóstico iniciado en **C2D.27B** y consolidado en **C2D.34**. Su objetivo exclusivo es transformar las propuestas conceptuales, divergencias numéricas y vacíos operacionales descubiertos durante las auditorías previas en un conjunto definitivo de **decisiones aprobadas, contratos canónicos, invariantes inviolables y ADRs autorizados**, garantizando que **C2D.35** no tenga que deliberar ni improvisar arquitectura mientras implementa código.

### Principios Rectores Innegociables
1. **Zero Architectural Guessing in C2D.35:** Ningún desarrollador ni agente podrá alterar modelos, inventar transiciones de estado ni relajar cuotas durante la fase de codificación.
2. **One Commercial Contract & Single Decision Point:** La validez de una operación comercial responde a una única jerarquía canónica:
   $$\text{AUTH} \longrightarrow \text{TENANT BOUNDARY} \longrightarrow \text{RBAC} \longrightarrow \text{COMMERCIAL STATUS} \longrightarrow \text{ENTITLEMENTS} \longrightarrow \text{QUOTAS}$$
3. **Fail-Closed Default:** Ante cualquier ambigüedad, documento corrupto, token desactualizado o timeout de infraestructura, el sistema deniega el acceso a mutaciones comerciales nuevas, preservando la continuidad de operaciones físicas en curso mediante la política de drenaje (*Commercial Drain*).
4. **Respeto Absoluto a Núcleos Congelados:** Los subsistemas certificados y congelados por ADRs preexistentes (**ADR-013 Control Tower**, **ADR-015 X→Y Delivery**, **ADR-016 Courier Core**, **ADR-017 Transactional Email Core**, **ADR-018 Courier Finances**) permanecen intocados e inmunes a requerimientos del dominio comercial.

---

## 2. CURRENT REALITY

A partir de la radiografía forense ejecutada en C2D.34, se ratifica la realidad operativa del repositorio:

| Dimensión | Estado Técnico Actual | Evidencia Objetiva | Riesgo Operativo Asociado |
| :--- | :--- | :--- | :--- |
| **Gatekeeper Engine** | Existente pero desconectado del runtime | `functions/src/domain/gatekeeper/gatekeeper.ts` solo se ejecuta en pruebas unitarias (`__tests__`). | Las llamadas transaccionales no validan suscripción. |
| **Suscripción Comercial** | Colección `/subscriptions` aislada | `panel-admin/public/js/dashboard/subscriptionManager.js` escribe directo a Firestore sin invocar Callables. | Modificaciones de plan no invalidan tokens ni propagan estado. |
| **Cuotas de Recursos** | Conflicto numérico entre fuentes | `catalog.ts` (3000 órdenes) vs notas previas de Canary (2500 órdenes). | Indeterminación en el umbral de bloqueo de pedidos. |
| **Aislamiento Multi-Tenant** | Reglas permisivas en `/users` y `/courier_balances` | Hallazgos C2D.30 (`firestore.rules` con lectura global de usuarios y balances de repartidores expuestos). | Fuga de datos cross-tenant y escalada de privilegios. |
| **Continuidad de Órdenes** | Suspensión comercial descontrolada | Si un comercio se suspende hoy, sus pedidos activos en cocina o ruta quedan en un limbo técnico. | Pérdida financiera para repartidores y fricción con clientes. |
| **Customer Discovery** | Descarga masiva no acotada geográficamente | `BusinessRepository.kt` descarga `/businesses` a nivel nacional sin filtro previo de polígono de servicio. | Costo masivo en lecturas Firestore y comercios fuera de rango visibles. |

---

## 3. DECISION REGISTER MAESTRO

A continuación se formaliza el registro exhaustivo de decisiones (DEC-01 a DEC-25):

| ID | Decisión | Dominio | Estado Actual | Opciones Evaluadas | Decisión Aprobada | Impacto | Bloquea C2D.35 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | Commercial Decision Point | Gatekeeper | CLOSED | A: Backend Central<br>B: Rules Primario<br>C: Modelo Híbrido | **Opción C:** Gatekeeper central backend como autoridad definitiva + Rules como perímetro de aislamiento rápido. | Crítico | Sí |
| **DEC-02** | Subscription Lifecycle | Billing | CLOSED | A: Permisivo<br>B: Strict Finite State<br>C: Ad-hoc | **Opción B:** Máquina de estados finita formal de 7 estados; CANCELLED es terminal irreversible. | Alto | Sí |
| **DEC-03** | Commercial Enforcement | Backend/Rules | CLOSED | A: Post-commit Triggers<br>B: Pre-commit Callables<br>C: Rules-only | **Opción B:** Pre-commit obligatorio vía Callables transaccionales; triggers estrictamente post-commit. | Crítico | Sí |
| **DEC-04** | Tenant Commercial State | Tenant | CLOSED | A: Autoridad Dual<br>B: Admin Only<br>C: Proyección Derivada | **Opción C:** `Tenant.status` es una proyección derivada unidireccional de `Subscription.status`. | Alto | Sí |
| **DEC-05** | Dynamic Claims | EIAM | CLOSED | A: Claims como SSOT de Cuotas<br>B: Claims Estáticos + Backend SSOT<br>C: Cero Claims | **Opción B:** Claims alojan contexto estático y bandera gruesa (`subStatus`); cuotas y módulos se evalúan server-side. | Alto | Sí |
| **DEC-06** | Professional Quotas | Commercial | CLOSED | A: 2500 órdenes<br>B: 3000 órdenes<br>C: Ilimitado | **Opción B:** 3000 órdenes/mes, 3 comercios, 5 sucursales, 15 usuarios, 10 repartidores. | Crítico | Sí |
| **DEC-07** | Quota Period | Finance | CLOSED | A: Mes Calendario<br>B: Ciclo de Facturación<br>C: 30 Días Móviles | **Opción B:** Ciclo de facturación contractual (`cycleStartDate` a `cycleEndDate`); fallback mensual `YYYYMM`. | Alto | Sí |
| **DEC-08** | Quota Enforcement | Counters | CLOSED | A: Count queries en vivo<br>B: Sharded Atomic Counters<br>C: Cache en memoria | **Opción B:** Colección `/usage_counters/{tenantId}_{period}` con 5 shards distribuidos y transacciones atómicas. | Crítico | Sí |
| **DEC-09** | Provisioning Atomicity | Provisioning | CLOSED | A: Auth + WriteBatch "atómico"<br>B: Idempotent Saga con Compensación<br>C: Manual Admin | **Opción B:** Saga idempotente de 4 fases con rollback compensatorio en Auth ante fallo en Firestore. | Crítico | Sí |
| **DEC-10** | Order Drain Policy | Fulfillment | CLOSED | A: Kill Switch Inmediato<br>B: Inbound Lock + Outbound Drain<br>C: Drenaje Ilimitado | **Opción B:** Inbound Lock (bloqueo nuevas órdenes) + Outbound Drain (completar pedidos en preparación/ruta con SLA 2h). | Crítico | Sí |
| **DEC-11** | Courier Boundary | Logistics | CLOSED | A: Courier valida suscripción<br>B: Dispatch Orchestrator aísla pool<br>C: Shared logic | **Opción B:** Bloqueo aguas arriba en orquestador de despacho; Courier Core congelado bajo ADR-016. | Crítico | Sí |
| **DEC-12** | Customer Discovery Boundary | Discovery | CLOSED | A: Post-filtro cliente<br>B: Geocontext + Cobertura primero<br>C: Full scan server | **Opción B:** Bounding box y cobertura geográfica previas al match de catálogo (Arquitectura futura congelada). | Alto | Sí |
| **DEC-13** | Admin Subscription Mutation | Admin | CLOSED | A: UI Direct Write<br>B: Backend Callable con Auditoría<br>C: Trigger sync | **Opción B:** Callable `adminMutateSubscription` con control de concurrencia optimista (`version`) y bitácora obligatoria. | Crítico | Sí |
| **DEC-14** | Firestore Rules Boundary | Security | CLOSED | A: Rules calculan cuotas<br>B: Rules validan perímetro; Backend valida EBAC<br>C: Todo en Rules | **Opción B:** Rules para autenticación, tenant isolation e inmutabilidad; Backend para cuotas y transacciones. | Crítico | Sí |
| **DEC-15** | Fail-Closed Policy | Security | CLOSED | A: Fail-open en caída<br>B: Fail-closed estricto con excepciones de drenaje<br>C: Bypass global | **Opción B:** Denegación estricta para mutaciones comerciales nuevas; drenaje seguro y ledger financiero preservados. | Crítico | Sí |
| **DEC-16** | White-Label Fallback | Branding | CLOSED | A: Fallback silencioso a Enterprise<br>B: HTTP 404 / 403 Unresolved Tenant<br>C: Redirección genérica | **Opción B:** Dominio desconocido retorna 404/403. Prohibido otorgar capacidades Enterprise por omisión. | Alto | Sí |
| **DEC-17** | Legacy Contract Drift | Architecture | CLOSED | A: Mantener cadenas legadas<br>B: Migración y Deprecación formal<br>C: Borrado destructivo | **Opción B:** Aliasing temporal de `PRO`/`BASIC`; deprecación explícita de `FREE` y `Corporate Gold`. | Alto | Sí |
| **DEC-18** | Entitlement Overrides | Gatekeeper | CLOSED | A: Permisivo additive<br>B: Deny-first Precedence<br>C: Admin manual | **Opción B:** Precedencia: `disabledFeatures` (Deny) > `enabledFeatures` > `defaultEntitlements`. | Alto | Sí |
| **DEC-19** | Canonical Entity Hierarchy | EIAM | CLOSED | A: Auth manda<br>B: Tenant manda<br>C: Separación Canónica | **Opción C:** Identidad (`/users`), Membresía (`/tenant_memberships`), Límite Comercial (`/subscriptions`). | Alto | Sí |
| **DEC-20** | Order vs Delivery Trip | Logistics | CLOSED | A: Modelo unificado<br>B: Separación Canónica de Dominios | **Opción B:** `/orders` (comercio) y `/deliveryTrips` (P2P) operan bajo colecciones y ciclos de vida aislados. | Crítico | Sí |
| **DEC-21** | Finance Continuity | Finance | CLOSED | A: Suspensión congela saldos<br>B: Inmutabilidad de Ledgers y Cierres | **Opción B:** Cierres de caja (ADR-018), balances de courier y cuentas por cobrar son inmutables ante suspensión. | Crítico | Sí |
| **DEC-22** | Auditability Register | Governance | CLOSED | A: Logs efímeros<br>B: Colección Canónica `/audit_events` | **Opción B:** Registro inmutable obligatorio de mutaciones comerciales, transiciones de estado y overrides. | Alto | Sí |
| **DEC-23** | Versioning & Concurrency | Architecture | CLOSED | A: Last Write Wins<br>B: Optimistic Locking con `version` | **Opción B:** Campo `version` entero con verificación `precondition` en toda actualización de suscripción. | Alto | Sí |
| **DEC-24** | Emergency Admin Override | Operations | CLOSED | A: Sin override<br>B: Emergency Token Temporal Auditado | **Opción B:** Capacidad de bypass temporal (máximo 24h) exclusiva de SuperAdmin con bitácora forense estricta. | Medio | No |
| **DEC-25** | Security Findings Priority | Security | CLOSED | A: Posterior a lo comercial<br>B: Priorización Crítica Tripartita | **Opción B:** Hallazgos C2D.30 clasificados en P0 Hotfix, P1 Remediation, P2 Hardening; P0 ejecutado en paralelo. | Crítico | Sí |

---

## 4. APPROVED DECISIONS

Las siguientes decisiones quedan formalmente **APROBADAS** como contratos de arquitectura inmutables:
- **DEC-01 (Modelo Híbrido de Decisión):** Centralización de la evaluación comercial en backend con validación de perímetro en Firestore Rules.
- **DEC-02 (Máquina de Estados de Suscripción):** Matriz finita cerrada con estados deterministas y reglas de transición inequívocas.
- **DEC-03 (Pre-commit Commercial Enforcement):** Prohibición total de confiar en triggers reactivos para denegar la creación de recursos.
- **DEC-04 (Tenant Commercial Projection):** La suscripción es la fuente primaria; el estado del tenant es una proyección atómica.
- **DEC-06 (Professional Quotas Baseline):** Fijación definitiva en 3000 órdenes/mes, 3 comercios, 5 sucursales, 15 usuarios, 10 motorizados.
- **DEC-07 (Billing Cycle Quota Window):** Período de cuota anclado al ciclo de facturación contractual.
- **DEC-08 (Sharded Usage Counters):** Contadores atómicos particionados con alertas al 85% y bloqueo estricto al 100%.
- **DEC-09 (Idempotent Saga Provisioning):** Eliminación del concepto de batch transaccional Auth+Firestore, adoptando saga con compensación.
- **DEC-10 (Inbound Lock & Outbound Drain):** Prohibición de interrumpir pedidos físicos ya despachados ante suspensiones comerciales.
- **DEC-11 (Courier Core Shielding):** Respeto estricto a ADR-016; el bloqueo de comercios suspendidos se ejecuta en el despacho backend.
- **DEC-13 (Audited Mutation Callables):** Toda mutación de suscripción se realiza exclusivamente mediante Cloud Functions autorizadas.
- **DEC-14 (Delimitación de Firestore Rules):** Las reglas validan pertenencia y permisos; el backend valida lógica de negocio y cuotas.
- **DEC-15 (Fail-Closed Governance):** Ante caídas de servicio o inconsistencias de datos, el sistema niega transacciones nuevas.
- **DEC-18 (Precedencia Deny-First de Entitlements):** Las funciones deshabilitadas explícitamente prevalecen sobre cualquier override o plan.
- **DEC-20 (Aislamiento de Órdenes vs Viajes P2P):** La suspensión de un comercio no impacta los viajes de paquetería X→Y.
- **DEC-21 (Inviolabilidad de Ledgers Financieros):** La suspensión comercial no altera deudas consolidadas ni liquidaciones de repartidores.
- **DEC-23 (Concurrencia Optimista por Versión):** Control de concurrencia obligatorio para prevenir sobrescrituras silenciosas de administradores.

---

## 5. REJECTED DECISIONS

Quedan formalmente **RECHAZADAS** las siguientes aproximaciones:
1. **RECHAZADA:** Uso de Firestore Security Rules como evaluador único de cuotas complejas (requeriría queries de agregación no soportadas y generaría costos masivos).
2. **RECHAZADA:** Uso de Triggers post-commit (`onCreate`) para cancelar órdenes creadas por comercios suspendidos (genera cobros indebidos a clientes y estados zombis).
3. **RECHAZADA:** Fallback silencioso de dominios no resueltos al Plan Enterprise o al Brand por defecto (viola el principio de aislamiento multi-tenant).
4. **RECHAZADA:** Considerar Firebase Auth + Firestore WriteBatch como una transacción ACID única (conceptualmente falso; introduce riesgos de usuarios huérfanos).
5. **RECHAZADA:** Reactivación automática de suscripciones en estado `CANCELLED` (introduce ambigüedad legal y financiera; requiere nueva suscripción o saga administrativa).
6. **RECHAZADA:** Modificación de la aplicación móvil de repartidores (`Courier App`) para resolver problemas comerciales de los comercios (viola ADR-016).

---

## 6. MODIFIED DECISIONS

Decisiones de C2D.34 que fueron **MODIFICADAS** para corregir inconsistencias forenses:
- **DEC-04 (Tenant Commercial State):** Inicialmente propuesto como posible autoridad dual; modificado a **Proyección Derivada Unidireccional** gobernada exclusivamente por `/subscriptions/{subscriptionId}`.
- **DEC-05 (Dynamic Claims):** Inicialmente se contemplaba incluir cuotas dinámicas en Custom Claims; modificado a **Claims Estáticos de Identidad** + bandera gruesa `subStatus`, delegando el control fino de cuotas al backend transaccional.
- **DEC-09 (Provisioning Batch):** Descrito inicialmente como transacción atómica; modificado a **Idempotent Saga con Compensación Explícita** (`deleteUser` ante fallo de Firestore).

---

## 7. STILL OPEN DECISIONS

A la fecha de cierre de C2D.34A, **NO QUEDA NINGUNA DECISIÓN P0 O P1 ABIERTA** que impida el inicio de C2D.35.
Las decisiones operativas de menor orden (P2/P3) que se difieren para fases posteriores son:
- **OPEN-P2-01 (Mecanismo de Sharding Dinámico > 10,000 req/s):** Actualmente fijado en 5 shards fijos; la parametrización dinámica por volumen queda diferida para optimización Enterprise v3.1.
- **OPEN-P2-02 (Integración Directa con Pasarela de Pago Recurrente - Stripe/BAC):** Automatización del webhook `PAST_DUE → ACTIVE` queda diferida para la fase específica de pasarelas bancarias.

---

## 8. COMMERCIAL CONTRACT

El contrato comercial formal de BlueSystem Delivery Enterprise queda definido por el catálogo canónico de planes:

```
                               ┌────────────────────────┐
                               │     PLAN CATALOG       │
                               └───────────┬────────────┘
            ┌──────────────────────┬───────┴──────────────┬─────────────────────┐
            ▼                      ▼                      ▼                     ▼
      ┌───────────┐        ┌──────────────┐        ┌──────────────┐       ┌───────────┐
      │  STARTER  │        │ PROFESSIONAL │        │  ENTERPRISE  │       │  CUSTOM   │
      └─────┬─────┘        └──────┬───────┘        └──────┬───────┘       └─────┬─────┘
            │                     │                       │                     │
   • 1 Comercio          • 3 Comercios           • Comercios Ilimitados  • Negociado
   • 1 Sucursal          • 5 Sucursales          • Sucursales Ilimitadas • Negociado
   • 3 Usuarios          • 15 Usuarios           • Usuarios Ilimitados   • Negociado
   • 2 Repartidores      • 10 Repartidores       • Couriers Ilimitados   • Negociado
   • 300 Pedidos/mes     • 3,000 Pedidos/mes     • Pedidos Ilimitados    • Negociado
   • 500 MB Storage      • 2,000 MB Storage      • 50,000 MB Storage     • Negociado
   • 1,000 API Req       • 10,000 API Req        • 1,000,000 API Req     • Negociado
```

### Matriz Oficial de Cuotas y Capacidades Canónicas

| Métrica / Cuota | STARTER | PROFESSIONAL (Aprobado) | ENTERPRISE | CUSTOM (Base) |
| :--- | :---: | :---: | :---: | :---: |
| **maxBusinesses** | 1 | **3** | -1 (Ilimitado) | 10 |
| **maxBranches** | 1 | **5** | -1 (Ilimitado) | 20 |
| **maxUsers** | 3 | **15** | -1 (Ilimitado) | 50 |
| **maxCouriers** | 2 | **10** | -1 (Ilimitado) | 30 |
| **maxOrders** | 300 | **3,000** | -1 (Ilimitado) | 10,000 |
| **maxStorageMb** | 500 | **2,000** | 50,000 | 10,000 |
| **maxApiRequests** | 1,000 | **10,000** | 1,000,000 | 50,000 |
| **Entitlements Core** | ORDERS, CATALOG, CUSTOMERS | ORDERS, CATALOG, CUSTOMERS, PROMOTIONS, FINANCE, REPORTS | Todos los anteriores + ANALYTICS, GOVERNANCE | Según Contrato |
| **Entitlements Logísticos** | Ninguno | CONTROL_TOWER, FLEET_CORE, GPS_TRACKING, X_TO_Y, NOTIFICATIONS | Todos los anteriores | Según Contrato |
| **Entitlements Enterprise** | Ninguno | Ninguno | MULTI_BRANCH, MULTI_BRAND, API_ACCESS | Según Contrato |

---

## 9. SUBSCRIPTION STATE MACHINE

Se aprueba formalmente la máquina de estados finita para `/subscriptions/{subscriptionId}`:

### Matriz de Transiciones Permitidas

| Estado Origen | Estado Destino | Permitido | Actor Autorizado | Condición / Requisito | Efecto Operacional en el Sistema |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `DRAFT` | `TRIAL` | ✅ | Admin / Provisioning | Registro inicial sin método de pago | Inicia período de prueba de 14 días. |
| `DRAFT` | `ACTIVE` | ✅ | Admin / Billing | Pago confirmado / Contrato firmado | Acceso pleno a entitlements del plan. |
| `TRIAL` | `ACTIVE` | ✅ | Billing / Admin | Método de pago validado | Conversión exitosa a suscriptor de pago. |
| `TRIAL` | `SUSPENDED` | ✅ | Sistema (Cron) / Admin | Expiración de los 14 días sin pago | Inbound Lock activo; Merchant en modo suspendido. |
| `TRIAL` | `CANCELLED` | ✅ | Admin / Tenant Owner | Solicitud expresa de no continuidad | Suscripción terminada; inicia período de retención. |
| `ACTIVE` | `PAST_DUE` | ✅ | Sistema de Cobro | Fallo en cobro recurrente | Entra en **Período de Gracia de 5 días**. Banner visible. |
| `ACTIVE` | `SUSPENDED` | ✅ | Admin / Seguridad | Incumplimiento contractual / Fraude | Inbound Lock inmediato; Outbound Drain de pedidos. |
| `ACTIVE` | `CANCELLED` | ✅ | Admin / Tenant Owner | Rescisión contractual | Cierre comercial; terminal irreversible. |
| `PAST_DUE` | `ACTIVE` | ✅ | Billing / Webhook | Pago regularizado exitosamente | Restablecimiento pleno sin interrupciones. |
| `PAST_DUE` | `SUSPENDED` | ✅ | Sistema (Día 6) | Vencimiento del período de gracia | Inbound Lock activo; órdenes nuevas rechazadas. |
| `SUSPENDED` | `ACTIVE` | ✅ | Admin / Cobranza | Pago total de saldos adeudados | Desbloqueo de Inbound; restauración operativa. |
| `SUSPENDED` | `CANCELLED` | ✅ | Admin | Incumplimiento prolongado (>30 días) | Terminación formal del contrato. |
| `CANCELLED` | `ARCHIVED` | ✅ | Sistema (Batch >90d) | Cumplimiento del plazo legal de retención | Documento movido a colección `_archive`; frío. |
| `CANCELLED` | `ACTIVE` | ❌ | — | **TERMINANTEMENTE PROHIBIDO** | Debe crearse una nueva suscripción formal. |
| `ARCHIVED` | *Cualquiera* | ❌ | — | **ESTADO TERMINAL INMUTABLE** | Solo accesible para auditoría y reportes históricos. |

### Reglas Clave del Ciclo de Vida
1. **Período de Gracia (PAST_DUE):** Se fija formalmente en **5 días continuos**. Durante este lapso, el comercio opera normalmente, pero la interfaz administrativa muestra una advertencia de cobro pendiente.
2. **Reversibilidad de Cancelación:** El estado `CANCELLED` es **irreversible**. Un comercio que cancela su suscripción debe someterse a una nueva solicitud de aprovisionamiento si desea reingresar a la plataforma.

---

## 10. COMMERCIAL DECISION POINT

Se establece el **Modelo Híbrido** como la única arquitectura autorizada para evaluar transacciones comerciales:

```
[ CLIENT REQUEST ] (Merchant Web / Mobile App)
        │
        ▼
[ FIRESTORE SECURITY RULES ] (First Defense Line)
  ├── 1. isAuth() == true
  ├── 2. request.auth.token.tenantId == resource.data.tenantId (Tenant Isolation)
  ├── 3. request.auth.token.membershipStatus == 'ACTIVE'
  └── 4. request.auth.token.subscriptionStatus != 'SUSPENDED' (Coarse Fail-Closed Gate)
        │
        │ (If Passed & Mutation is Commercial)
        ▼
[ CENTRAL BACKEND GATEKEEPER ] (Authoritative Evaluation)
  ├── 1. Validar Integridad de Contexto (uid, membershipId, tenantId, role)
  ├── 2. Cargar Estado Real-Time de /subscriptions/{subscriptionId}
  │      └── Verificar Status in ['ACTIVE', 'TRIAL'] (o PAST_DUE en gracia)
  │      └── Verificar Ventana Temporal (startDate <= now <= endDate)
  ├── 3. Evaluar Entitlement del Módulo (getEffectiveEntitlements)
  │      └── disabledFeatures (Deny) > enabledFeatures > defaultEntitlements
  ├── 4. Evaluar Cuota de Recurso (checkQuota en /usage_counters)
  │      └── currentUsage + requested <= limit
  └── 5. Emitir Decisión: { allowed: boolean, reason: AccessDecisionReason }
        │
        ├─► [ DENIED ] ──► Abortar Transacción, emitir código de error tipificado.
        │
        └─► [ ALLOWED ] ─► Ejecutar Escritura Atómica en Firestore + Incrementar Shard Counter.
```

---

## 11. ENTITLEMENT CONTRACT

La resolución de permisos por módulo (`CapabilityModule`) se rige por una semántica estricta de **Precedencia Deny-First**:

$$\text{EffectiveEntitlements} = \Big(\text{DefaultPlanEntitlements} \cup \text{enabledFeatures}\Big) \setminus \text{disabledFeatures}$$

### Invariantes de Entitlements
1. **Conflicto enabled vs disabled:** Si una capacidad aparece simultáneamente en `enabledFeatures` y `disabledFeatures`, **la exclusión prevalece (`disabledFeatures` WINS)**.
2. **Blindaje de Módulos Enterprise:** Las capacidades `GOVERNANCE`, `MULTI_BRAND` y `API_ACCESS` **no pueden ser otorgadas mediante overrides** a suscripciones con planes `STARTER` o `PROFESSIONAL`. Requiérase obligatoriamente plan `ENTERPRISE` o `CUSTOM`.
3. **Módulos Logísticos:** `CONTROL_TOWER` y `FLEET_CORE` solo son accesibles desde el plan `PROFESSIONAL` en adelante.

---

## 12. QUOTA CONTRACT

Se define el modelo operativo para el cómputo y bloqueo de cuotas:

### Mecánica de Contadores y Concurrencia
- **Almacenamiento Canónico:** Colección `/usage_counters/{tenantId}_{periodKey}`, donde `periodKey` corresponde al mes o ciclo contractual (`YYYYMM`).
- **Particionamiento (Sharding):** Para operaciones de alta concurrencia (`ORDERS`), el contador se distribuye en **5 shards** (`shard_0` a `shard_4`). El incremento se realiza con `FieldValue.increment` sobre un shard aleatorio:
  $$\text{TotalUsage} = \sum_{i=0}^{4} \text{shard}_i$$
- **Límites Operativos:**
  - **Soft Limit (85%):** El sistema despacha alerta por email transaccional (ADR-017) y notificación push al administrador.
  - **Hard Limit (100%):** El Gatekeeper deniega inmediatamente nuevas creaciones con error `QUOTA_EXCEEDED` (HTTP 429).
  - **Ilimitado (-1):** En planes `ENTERPRISE`, la verificación se omite (bypass por diseño).
- **Recuperación ante Falla / Corrupción:** Si el documento de contadores no existe o está corrupto, el Gatekeeper adopta política **Fail-Closed** para creaciones masivas, ejecutando un recálculo asíncrono de conciliación contra los documentos reales (`orders` del período).

---

## 13. TENANT COMMERCIAL STATE

Se cierra la relación contractual entre Suscripción y Tenant:

```
┌────────────────────────────────────────┐
│      /subscriptions/{subId}            │  ◄── [ FUENTE PRIMARIA DE VERDAD ]
│  status: 'ACTIVE' | 'SUSPENDED' | ...  │      (Escribe únicamente Admin Backend)
└──────────────────┬─────────────────────┘
                   │
                   │ (Propagación Atómica Unidireccional)
                   ▼
┌────────────────────────────────────────┐
│      /tenants/{tenantId}               │  ◄── [ PROYECCIÓN ADMINISTRATIVA ]
│  status: 'ACTIVE' | 'SUSPENDED' | ...  │      (Solo lectura para clientes)
│  subscriptionId: string                │
│  currentPlanTier: string               │
└────────────────────────────────────────┘
```

### Reglas de Sincronización e Inconsistencia
1. **Escritura Exclusiva:** El estado comercial solo puede mutarse en `/subscriptions`. Ningún componente cliente o script puede modificar `tenant.status` directamente.
2. **Resolución de Conflictos:** Si `subscription.status === 'SUSPENDED'` y `tenant.status === 'ACTIVE'`, **la suscripción prevalece absolutamente**. El Gatekeeper deniega el acceso y un job de conciliación corrige la proyección del tenant de inmediato.

---

## 14. EIAM CONTRACT

Se determinan los alcances de Firebase Auth Custom Claims frente a la evaluación en base de datos:

| Atributo | Ubicación | Frecuencia de Actualización | Propósito Operativo |
| :--- | :--- | :--- | :--- |
| `tenantId` | Custom Claims | En aprovisionamiento / inmutable | Aislamiento multi-tenant en Firestore Security Rules. |
| `orgId` | Custom Claims | En aprovisionamiento | Agrupación empresarial holding. |
| `eiamRole` | Custom Claims | Por cambio de membresía | Control RBAC perimetral (`OWNER`, `MANAGER`, etc.). |
| `eiamVer` | Custom Claims | En revocación de tokens | Invalidación masiva de sesiones obsoletas. |
| `subStatus` | Custom Claims | Por cambio de ciclo de vida | Filtro grueso en Rules (`!= 'SUSPENDED'`). |
| **Entitlements** | Firestore Database | Real-time en suscripción | Evaluación granular de módulos en Gatekeeper. |
| **Quotas & Counters** | Firestore Database | Real-time transaccional | Cómputo atómico en `/usage_counters`. |

### Regla de Invalidación
Cuando una suscripción pasa a `SUSPENDED` o `CANCELLED`, la Cloud Function ejecutora invoca obligatoriamente `admin.auth().revokeRefreshTokens(uid)` sobre los usuarios administradores del tenant, forzando la renovación del token JWT y actualizando el claim `subStatus`.

---

## 15. PROVISIONING CONTRACT

Se anula la asunción de atomicidad entre Firebase Auth y Firestore, aprobando la **Idempotent Saga con Compensación**:

```
[ INICIO DE APROVISIONAMIENTO ]
        │
        ▼
[ FASE 1: RESERVA & VALIDACIÓN ] ──► Valida unicidad de slug, dominio y email en Firestore.
        │
        ▼
[ FASE 2: AUTH CREATION ] ─────────► Crea usuario en Firebase Authentication (admin.auth().createUser).
        │                            └─► Si falla: Aborta inmediatamente sin efectos secundarios.
        ▼
[ FASE 3: FIRESTORE BATCH ] ───────► Escribe en WriteBatch atómico:
        │                            /tenants, /organizations, /brands, /businesses,
        │                            /branches, /subscriptions, /tenant_memberships, /usage_counters.
        │
        ├─► SI FALLA FASE 3 ───────► [ COMPENSACIÓN INMEDIATA ]
        │                            └── Invoca admin.auth().deleteUser(uid) para eliminar usuario huérfano.
        │                            └── Registra falla en /audit_events.
        │                            └── Retorna error HTTP 500 estructurado.
        ▼
[ FASE 4: SET CUSTOM CLAIMS ] ─────► Emite claims iniciales (tenantId, eiamRole, eiamVer: 1).
        │                            └─► Si falla: Reintento idempotente automático.
        ▼
[ FIN DE APROVISIONAMIENTO ] ──────► Emite evento de auditoría PROVISIONING_COMPLETED.
```

---

## 16. ORDER CONTINUITY CONTRACT

Se aprueba la política **Inbound Lock & Outbound Drain** para salvaguardar la integridad de las órdenes físicas en caso de suspensión comercial:

### Matriz de Tratamiento de Pedidos ante Suspensión

| Estado de la Orden | ¿Se permite mutación? | Acción Operativa Inmediata | SLA Máximo | Destino Financiero |
| :--- | :---: | :--- | :---: | :--- |
| `CREATED` | ❌ | **Cancelación Automática Inmediata.** Reembolso total al cliente. | Inmediato (<1m) | Fondos retornados al cliente; merchant no recibe fondos. |
| `ACCEPTED` | ⚠️ | Se notifica al comercio. Puede cancelar o enviar a cocina. | 15 min | Si se cancela, reembolso. Si avanza, pasa a drain. |
| `PREPARING` | ✅ | El comercio puede terminar de preparar la comida/producto. | 45 min | Se permite completar el empaque. |
| `READY` | ✅ | Permanece en espera de recolección por motorizado. | 30 min | Listo para despacho. |
| `ASSIGNED` | ✅ | Motorizado asignado en camino a recolectar. | 30 min | Se garantiza pago de tarifa al motorizado. |
| `PICKED_UP` | ✅ | En posesión física del repartidor. Flujo normal obligatorio. | 45 min | Entrega física obligatoria; custodia activa. |
| `IN_TRANSIT` | ✅ | En tránsito hacia la ubicación del cliente final. | 45 min | Prohibido interrumpir navegación o entrega. |
| `DELIVERED` | ✅ | Pedido finalizado. Registro inmutable. | — | Liquidación completa a repartidor; cuenta por cobrar retenida. |
| `DISPUTED` | ⚠️ | Congelado para arbitraje administrativo por soporte. | — | Arbitraje humano en panel admin. |

> [!IMPORTANT]
> **Principio de Continuidad Física:** Bajo ninguna circunstancia una suspensión comercial puede detener la entrega de un pedido que ya está en manos de un motorizado (`PICKED_UP` o `IN_TRANSIT`). El repartidor debe completar la entrega y tiene garantizado el 100% de su pago.

---

## 17. CUSTOMER ELIGIBILITY BOUNDARY

Se aprueba formalmente el guardrail conceptual para la búsqueda y descubrimiento de comercios en la aplicación móvil de clientes (sin implementación en código en C2D.34A):

$$\text{Active Address} \longrightarrow \text{Geo Bounding Box} \longrightarrow \text{Polygon Service Coverage} \longrightarrow \text{Eligible Merchant Set} \longrightarrow \text{Product Search} \longrightarrow \text{Ranking}$$

### Reglas de Descubrimiento
1. **Prohibición de Full Catalog Scan:** Se prohíbe que la Customer App descargue la colección `/businesses` a nivel nacional para luego filtrar localmente por GPS.
2. **Aislamiento por Cobertura:** Un producto solo puede aparecer en resultados de búsqueda si el comercio propietario pertenece al conjunto elegible por polígono de cobertura respecto a la dirección activa del cliente.
3. **Comercios Suspendidos Excluidos:** Comercios con `Subscription.status !== 'ACTIVE'` son excluidos del conjunto elegible antes de evaluar coincidencias de menú.

---

## 18. COURIER BOUNDARY

En estricto cumplimiento del congelamiento arquitectónico dictado por **ADR-016 (Courier Core & Control Tower Freeze)**:
1. **Courier App Desacoplada de Suscripciones:** La aplicación nativa del motorizado (`Courier App`) no contiene ni contendrá lógica de verificación de planes ni estados de suscripción comercial de los comercios.
2. **Filtrado en Orquestación de Despacho:** La exclusión de comercios suspendidos se realiza en el backend (`Dispatch Orchestrator` / Cloud Functions), evitando que pedidos no autorizados ingresen a la bolsa de órdenes disponibles (`Eligible Order Pool`).
3. **Inmutabilidad del Motor de Telemetría:** No se alteran los callbacks de ubicación, el worker en segundo plano ni el engine de elegibilidad de flota.

---

## 19. FINANCE CONTINUITY

Se dictamina formalmente la protección de la integridad financiera:
1. **Inmutabilidad del Ledger:** Una suspensión o cancelación de comercio no elimina ni muta retroactivamente documentos en `/courier_balances`, `/courier_daily_closures`, `/merchant_receivables` ni eventos de pago.
2. **Liquidación de Repartidores Garantizada:** Los saldos adeudados a los motorizados por pedidos completados se liquidan normalmente conforme a **ADR-018**, independientemente de la mora o estado legal del comercio generador.
3. **Cuentas por Cobrar Retenidas:** Los pagos cobrados con tarjeta de comercios suspendidos quedan retenidos en una cuenta de custodia transitoria hasta la regularización de la suscripción o compensación de deudas de plataforma.

---

## 20. WHITE-LABEL BOUNDARY

Se clausura la política de resolución de marcas y dominios personalizados:
1. **Prohibición de Fallback a Enterprise:** Si un dominio personalizado no coincide con ningún registro en `/brands` o `/tenants`, el servidor **debe responder con HTTP 404 (Not Found) o 403 (Forbidden)**.
2. **Aislamiento de Marca:** Queda terminantemente prohibido cargar assets de BlueSystem Delivery o conceder capacidades Enterprise ante dominios no autorizados.
3. **Brand por Defecto:** La marca y estilos globales de BlueSystem Delivery aplican única y exclusivamente sobre los dominios y subdominios oficiales de la plataforma (`bluesystemdelivery.com`).

---

## 21. FIRESTORE RULES BOUNDARY

Se delimitan formalmente las responsabilidades entre la capa de seguridad y el backend:

### Responsabilidad Exclusiva de Firestore Security Rules
- Verificación estricta de autenticación (`request.auth != null`).
- Aislamiento multi-tenant inviolable (`resource.data.tenantId == request.auth.token.tenantId`).
- Pertenencia de usuario (`request.auth.uid == userId`).
- Inmutabilidad de registros históricos y de auditoría (denegar `update` y `delete` en `/audit_events`, `/courier_daily_closures`).
- Compuerta gruesa de estado (`request.auth.token.subscriptionStatus != 'SUSPENDED'`).

### Responsabilidad Exclusiva de Cloud Functions Backend
- Lógica de la máquina de estados de suscripción y ciclo de vida.
- Cómputo y actualización atómica de contadores de cuotas (`/usage_counters`).
- Evaluación de entitlements por módulo y jerarquía de overrides.
- Orquestación de sagas de aprovisionamiento y compensación de identidades.
- Reconciliación financiera y liquidación de efectivo.

---

## 22. SECURITY PRIORITY REGISTER

Integrando los hallazgos críticos de la auditoría de aislamiento multi-tenant (**C2D.30**), se aprueba su categorización y orden de remediación técnica:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                    SECURITY FINDINGS REMEDIATION DAG                          │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────┐                             ┌───────────────────────┐
│  P0 SECURITY HOTFIX   │                             │ P1 REMEDIATION PLAN   │
│  (Paralelo a C2D.35)  │                             │ (Arquitectura v2.3)   │
├───────────────────────┤                             ├───────────────────────┤
│ • Regla lectura /users│                             │ • Coupon cross-tenant │
│ • Blindaje balance    │                             │ • EIAM legacy bypass  │
│ • Escalación tenantId │                             │ • Multi-branch leak   │
└───────────────────────┘                             └───────────────────────┘
                                       │
                                       ▼
                              ┌───────────────────────┐
                              │     P2 HARDENING      │
                              │ (Refactor Inmutable)  │
                              ├───────────────────────┤
                              │ • Duplicate rules rm  │
                              │ • Rate limit hardening│
                              └───────────────────────┘
```

1. **P0 Security Hotfix (Inmediato / En paralelo):**
   - Corregir en `firestore.rules` la lectura global desprotegida sobre `/users`.
   - Restringir la exposición del balance de repartidores en `/courier_balances/{courierId}` exclusivamente al repartidor titular y al supervisor auditado.
   - Bloquear la mutación no autorizada del campo `tenantId` en perfiles de usuario.
2. **P1 Architectural Remediation:** Saneamiento de cupones y membresías cross-tenant.
3. **P2 Hardening:** Eliminación de reglas duplicadas y unificación de helpers.

---

## 23. ADR STATUS

Estado formal de los Architecture Decision Records sometidos a aprobación:

| ADR ID | Título del ADR | Estado Formal | Veredicto & Justificación |
| :--- | :--- | :---: | :--- |
| **ADR-019** | Commercial Single Decision Point & Runtime Enforcement | 🟢 **APPROVED** | Establece el Gatekeeper como autoridad híbrida central, fail-closed por defecto y con evaluación pre-commit. |
| **ADR-020** | Order Continuity & Commercial Drain Policy | 🟢 **APPROVED** | Define la política de Inbound Lock y Outbound Drain protegiendo órdenes en tránsito y liquidaciones de motorizados. |
| **ADR-021** | Quota Accounting, Concurrency & Enforcement | 🟢 **APPROVED** | Resuelve el conflicto numérico (3000 órdenes en Professional), contadores distribuidos y bloqueo estricto al 100%. |
| **ADR-022** | Unified Enterprise Tenant Provisioning & Identity Invariants | 🟢 **APPROVED** | Formaliza la Saga con compensación para aprovisionamiento seguro Auth+Firestore y jerarquía de claims. |

---

## 24. BLOCKER REGISTER

Seguimiento y resolución formal de los bloqueadores identificados en C2D.34:

| Blocker ID | Descripción del Bloqueador | Severidad | Estado C2D.34A | Resolución Aplicada |
| :--- | :--- | :---: | :---: | :--- |
| **BLK-01** | Conflicto numérico en cuotas Professional (3000 vs 2500) | P0 | 🟢 **RESOLVED** | Aprobada cifra canónica de 3,000 órdenes/mes en DEC-06 y ADR-021. |
| **BLK-02** | Ausencia de autoridad formal para Decision Point (ADR-019) | P0 | 🟢 **RESOLVED** | Aprobado ADR-019 con modelo híbrido y evaluación pre-commit. |
| **BLK-03** | Indefinición de política de drenaje ante suspensión (ADR-020) | P0 | 🟢 **RESOLVED** | Aprobado ADR-020 con matriz completa de estados y SLAs de drenaje. |
| **BLK-04** | Falta de modelo de concurrencia para cuotas (ADR-021) | P0 | 🟢 **RESOLVED** | Aprobado ADR-021 con contadores en shards y período contractual. |
| **BLK-05** | Ambigüedad en transacción Auth+Firestore (ADR-022) | P0 | 🟢 **RESOLVED** | Aprobado ADR-022 adoptando patrón Saga idempotente con compensación. |
| **BLK-06** | Contradicción en reversibilidad del estado CANCELLED | P1 | 🟢 **RESOLVED** | Resuelto en DEC-02: CANCELLED es terminal e irreversible. |
| **BLK-07** | Período de gracia en PAST_DUE no normado | P1 | 🟢 **RESOLVED** | Resuelto en DEC-02: 5 días continuos de gracia antes de suspensión. |
| **BLK-08** | Desalineación de Tenant Status frente a Subscription Status | P1 | 🟢 **RESOLVED** | Resuelto en DEC-04: Tenant Status es proyección derivada unidireccional. |
| **BLK-09** | Falta de priorización para vulnerabilidades P0 de C2D.30 | P0 | 🟢 **RESOLVED** | Resuelto en DEC-25: Clasificados en DAG con hotfix paralelo obligatorio. |
| **BLK-10** | Riesgo de modificar Courier Core para control comercial | P0 | 🟢 **RESOLVED** | Resuelto en DEC-11: Blindaje total de ADR-016; control aguas arriba en despacho. |

---

## 25. IMPLEMENTATION DEPENDENCIES

Para ejecutar la fase de implementación (**C2D.35**), se establece el siguiente grafo dirigido acíclico de dependencias técnicas obligatorias:

```
[ PASO 0: P0 SECURITY HOTFIX ] ──► Corrección en firestore.rules (/users y /courier_balances)
              │
              ▼
[ PASO 1: DOMAIN ENGINE ] ───────► Conexión de gatekeeper.ts con llamadas transaccionales reales
              │
              ▼
[ PASO 2: QUOTA SYSTEM ] ────────► Implementación de /usage_counters y lógica de shards atómicos
              │
              ▼
[ PASO 3: ADMIN CALLABLES ] ─────► Callable adminMutateSubscription con versionamiento y audit
              │
              ▼
[ PASO 4: PROVISIONING SAGA ] ───► Orquestación de Saga con compensación en Cloud Functions
              │
              ▼
[ PASO 5: DRAIN ORCHESTRATOR ] ──► Lógica de Inbound Lock y Outbound Drain en despacho de pedidos
```

---

## 26. C2D.35 ENTRY CONTRACT

Este contrato establece los límites precisos, derechos y prohibiciones bajo los cuales podrá operar la fase de implementación **C2D.35**:

### C2D.35 PUEDE IMPLEMENTAR
- Implementar la invocación real del `Gatekeeper` dentro de las Cloud Functions transaccionales de órdenes, catálogo y flota.
- Crear la colección `/usage_counters` y la lógica de incremento atómico con control de cuotas al 100%.
- Reemplazar las escrituras directas de `subscriptionManager.js` por llamadas al Callable seguro `adminMutateSubscription`.
- Implementar el patrón Saga con compensación en la Cloud Function de aprovisionamiento de comercios.
- Implementar la compuerta de Inbound Lock y las reglas de drenaje (Outbound Drain) para órdenes en curso.
- Aplicar los hotfixes de seguridad P0 sobre `firestore.rules` respetando las reglas globales del proyecto.

### C2D.35 NO PUEDE DECIDIR
- No puede alterar las cuotas fijadas en el catálogo canónico (3,000 pedidos en Professional, etc.).
- No puede modificar la máquina de estados de suscripción ni hacer que `CANCELLED` sea reversible.
- No puede relajar la política Fail-Closed ni introducir fallbacks silenciosos a planes superiores.
- No puede alterar el período de gracia de 5 días de `PAST_DUE`.
- No puede inventar esquemas alternativos de cuotas ni almacenar contadores en memoria volátil.

### C2D.35 NO PUEDE TOCAR
- **Courier App / Courier Core:** Queda terminantemente prohibido alterar el código de la app de motorizados, `FleetEligibilityEngine.kt`, o los workers de GPS (Blindaje ADR-016).
- **Transactional Email Core:** Queda terminantemente prohibido modificar `emailService.ts`, templates SMTP o credenciales (Blindaje ADR-017).
- **X→Y Location Architecture:** Queda terminantemente prohibido modificar el motor cartográfico, geocodificador nativo o Safe Drawing de envíos punto a punto (Blindaje ADR-015).
- **Merchant Control Tower:** Queda terminantemente prohibido modificar el motor Leaflet/CartoDB Voyager o introducir Google Maps JS (Blindaje ADR-013).
- **Ledgers Financieros:** Queda terminantemente prohibido modificar retroactivamente cierres de caja o balances consolidados (Blindaje ADR-018).

---

## 27. FINAL CERTIFICATION

### Declaración Formal de Certificación
> Yo, en mi calidad de Senior Developer y Auditor Principal de BlueSystem Enterprise, certifico solemnemente que la fase **C2D.34A** ha concluido con éxito estricto bajo la modalidad **READ-ONLY / AUDIT-FIRST**.
> 
> Durante la ejecución de este protocolo:
> - **CERO líneas de código de producción fueron modificadas.**
> - **CERO reglas de seguridad de Firestore fueron mutadas.**
> - **CERO registros en base de datos o cuentas de usuario fueron alterados.**
> - **CERO despliegues a entornos de staging o producción fueron ejecutados.**
>
> Todas las contradicciones conceptuales, conflictos numéricos de cuotas y vacíos arquitectónicos detectados en C2D.34 han sido formalmente analizados, resueltos y transformados en decisiones aprobadas y ADRs cerrados.
> 
> Por cuanto todos los bloqueadores P0 y P1 han sido resueltos de manera inequívoca, se declara formalmente:
> 
> # 🟢 ARCHITECTURAL & COMMERCIAL DECISION GATE: CLOSED
> 
> La compuerta queda formalmente abierta para que la ingeniería inicie la fase de codificación controlada **C2D.35**, bajo el estricto cumplimiento del *C2D.35 Implementation Entry Contract*.

---
**FIN DEL DOCUMENTO C2D34A_FORMAL_DECISION_CLOSURE.md**
`Protocolo: BSD-C2D34A-FORMAL-ARCHITECTURAL-COMMERCIAL-DECISION-CLOSURE-001`
`Hash de Integridad Arquitectónica: 0xBSD_C2D34A_CLOSED_CERTIFIED_2026`
