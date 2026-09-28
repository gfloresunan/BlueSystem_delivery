# C2D23 — SUBSCRIPTION & FEATURE INTEGRATION
## Integración de Suscripciones y Resolución con Gatekeeper
**Protocol ID:** `C2D.23`  

---

### 1. Resolución Dinámica de Capacidades
- **Vinculación Read-Only:** La configuración de aplicación consulta el `subscriptionId` del Tenant y valida que el contrato esté en estado `ACTIVE` o `TRIAL`.
- **Diferenciación de Conceptos:**
  - **Subscription Entitlement:** ¿El cliente tiene contratado el módulo? (Determinado por `SubscriptionEntity`).
  - **Feature Flag de App:** ¿La aplicación específica tiene activa esta interfaz? (Determinado por `AppConfigEntity.featureFlags`).
  - **User Role Permission:** ¿El usuario tiene permiso para ejecutar la acción? (Determinado por `UserSession.role`).
- **Gatekeeper como Fuente Única:** El acceso final efectivo continúa siendo arbitrado por `Gatekeeper.canAccessModule()`.
