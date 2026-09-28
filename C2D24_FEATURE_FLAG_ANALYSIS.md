# C2D24 — FEATURE FLAG ANALYSIS
## Análisis de Seguridad e Integridad de Feature Flags
**Protocol ID:** `C2D.24`  

---

### 1. Invariante de Seguridad: Feature Flags $\neq$ Autorización
- **Principio Inviolable:** Un feature flag (`BuildConfig.FEATURE_X` o `AppConfigEntity.featureFlags.x`) **solo controla la visibilidad o disponibilidad cosmética de la UI**.
- **Autorización Final:** El acceso a datos, mutaciones y operaciones críticas en backend es evaluado **estrictamente por Gatekeeper y Firestore Rules**.
- **Garantía Anti-Bypass:** Si un cliente o usuario manipula el binario para forzar un feature flag en `true`, cualquier consulta al servidor será rechazada si el Tenant no cuenta con el módulo en su `SubscriptionEntity`.
