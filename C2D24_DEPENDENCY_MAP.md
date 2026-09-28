# C2D24 — DEPENDENCY MAP
## Mapa de Dependencias entre App Configuration, Flavors y Build Engine
**Protocol ID:** `C2D.24`  

---

```
                       C2D.23: APP CONFIGURATION ENTITY (/app_configs/{configId})
                                                 │
                                                 ├── tenantId & brandId
                                                 ├── distribution: (appName, applicationId, version)
                                                 └── providers: (firebaseProjectId, mapsApiKey)
                                                 │
                                                 ▼
                       C2D.24: ANDROID PRODUCT FLAVORS (DIMENSIÓN "commercialProfile")
                                                 │
                       ┌─────────────────────────┼─────────────────────────┐
                       ▼                         ▼                         ▼
                 FLAVOR: core           FLAVOR: enterpriseFitoni     FLAVOR: whitelabel
              (com.aistudio...)            (com.fitoni.delivery)       (com.client.delivery)
                       │                         │                         │
                       └─────────────────────────┼─────────────────────────┘
                                                 ▼
                                        ANDROID BUILD VARIANTS
                                                 │
                                    (6 Variantes: 3 flavors × 2 buildTypes)
                                                 │
                                                 ▼
                                  🛑 C2D.24 GOVERNANCE BOUNDARY
                                                 │
                                      (STOP — NO BUILD EXECUTION)
                                                 │
                                                 ▼
                                     [FUTURE C2D.25: BUILD ENGINE]
```
