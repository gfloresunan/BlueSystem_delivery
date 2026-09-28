# BSD — SUBSCRIPTION & ENTITLEMENT ENGINE AUDIT REPORT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. SEPARACIÓN FUNDAMENTAL: PLAN VS ROL

El sistema implementa con estricto rigor la separación entre lo que el cliente posee y lo que el usuario puede hacer:

```
┌─────────────────────────────────────────────────────────────┐
│                       TENANT CONTEXT                        │
│                     (Fitoni Express)                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
     SUBSCRIPTION (PLAN)                 USER (ROLE)
  [WHAT THE CLIENT OWNS]             [WHAT THE USER CAN DO]
 ─────────────────────────          ────────────────────────
  Tier: PROFESSIONAL                 Role: MANAGER
  Features: Control Tower,           Permissions: View Orders,
            Dynamic Menu,                        Assign Courier,
            Advanced Reports                     View Catalog
 ─────────────────────────          ────────────────────────
               │                               │
               └───────────────┬───────────────┘
                               ▼
                        EFFECTIVE ACCESS
            ROLE_PERMISSIONS ∩ SUBSCRIPTION_ENTITLEMENTS
```

---

## 2. ESTADO DEL SUBSCRIPTION ENGINE

### A. Modelos de Contratos y Planes
- **Ruta Firestore:** `/subscriptions/{subscriptionId}`
- **Schema:** `SubscriptionEntity`, `SubscriptionQuotas`, `PlanTier` en `functions/src/domain/platform/models.ts` (líneas 162-193).
- **Niveles de Plan Soportados:**
  1. `STARTER`: 0 dominios custom, sin subdominios, sin marca custom, sin torre de control avanzada.
  2. `PROFESSIONAL`: 1 subdominio custom, marca personalizada, reportes avanzados, control tower activo.
  3. `ENTERPRISE` / `CUSTOM`: Hasta 10 dominios propios, marca completa, correos transaccionales dedicados, SLA prioritario.
- **Cuotas Operacionales:** `maxBusinesses`, `maxBranches`, `maxUsers`, `maxCouriers`, `maxOrders`, `maxStorageMb`, `maxApiRequests`.
- **Estado:** 🟢 `REAL / OPERACIONAL`.

### B. Evaluador Gatekeeper (Backend)
- **Implementación:** `functions/src/domain/gatekeeper/gatekeeper.ts` (370 líneas de TypeScript puro).
- **Validaciones Forenses:**
  - `Default Deny`: Si falta contexto, membresía o suscripción, el acceso es denegado inmediatamente (`SUBSCRIPTION_MISSING`, `TENANT_MISMATCH`).
  - `Subscription Lifecycle Guard`: Valida estados `ACTIVE`, `TRIAL`, `SUSPENDED`, `PAST_DUE`.
  - `Time-Window Guard`: Valida `startDate <= now <= endDate`.
  - `Quota Enforcement`: Valida consumo frente a límites máximos (`QUOTA_EXCEEDED`).
- **Estado:** 🟢 `REAL / OPERACIONAL`.

### C. Evaluador Gatekeeper (Frontend Web)
- **Implementación:** `merchant-web/src/shared/gatekeeper/useGatekeeper.ts`.
- **Comportamiento:** Intersecta el rol del usuario (`ROLE_RESTRICTIONS`) con las capacidades del plan y feature flags del tenant.
- **Seguridad:** La UI oculta pestañas y botones no autorizados, pero la seguridad real está blindada en Cloud Functions y Firestore Rules.
- **Estado:** 🟢 `REAL / OPERACIONAL`.

### D. Subscription Manager (UI Admin)
- **Diagnóstico:** 🔴 **MISSING**. No existe una pantalla de gestión de planes o suscripciones en `panel-admin`.
