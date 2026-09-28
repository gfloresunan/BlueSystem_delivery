# C2D23 — DEPENDENCY MAP
## Mapa de Dependencias y Relaciones Canónicas
**Protocol ID:** `C2D.23`  

---

```
                                 TENANT ENTITY (/tenants/{tenantId})
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
             BRAND ENTITY (/brands/{brandId})          SUBSCRIPTION ENTITY (/subscriptions/{subId})
                        │                                                 │
                        │                                                 ▼
                        │                                          MODULE_CATALOG (16 Features)
                        │                                                 │
                        │                                                 ▼
                        │                                         GATEKEEPER ENGINE (Default Deny)
                        │                                                 │
                        └────────────────────────┬────────────────────────┘
                                                 ▼
                                     APP CONFIGURATION ENTITY
                                    (/app_configs/{configId})
                                                 │
                                                 ├── Platform: ANDROID | IOS | WEB
                                                 ├── Environment: DEV | STAGING | PROD
                                                 ├── Distribution: (appName, applicationId, version)
                                                 ├── Providers: (firebaseProjectId, mapsApiKey)
                                                 └── FeatureFlags: Record<string, boolean>
                                                 │
                                                 ▼
                                     VALIDATION & COMPLIANCE
                                                 │
                                                 ▼
                                          READY_FOR_BUILD
                                                 │
                                              🛑 STOP
```
