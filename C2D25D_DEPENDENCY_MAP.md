# C2D25D — DEPENDENCY MAP
## Protocol ID: `BSD-C2D25D-MULTI-BRAND-BUILD-FACTORY-READINESS-001`

---

### 1. Mapa de Dependencias para un Segundo Producto Comercial

```text
                                 [HUMAN DECISION]
                                        │
                                        ▼
                        [PROVISIONING EN FIREBASE CONSOLE]
                        (Registrar nuevo Application ID)
                                        │
                                        ▼
                            [google-services.json]
                        (Contiene package 1 y package 2)
                                        │
                                        ▼
                                 [BRAND ENTITY]
                      (Metadatos de Marca + Assets Gráficos)
                                        │
                                        ▼
                              [APP CONFIG ENTITY]
                      (Vinculación Tenant + Brand + Plan)
                                        │
                                        ▼
                             [BUILD REQUEST ENTITY]
                      (Flavor 'whitelabel' + Props Dinámicas)
                                        │
                                        ▼
                        [HUMAN LEVEL 6 AUTHORIZATION]
                      (Token Single-Use de Compilación)
                                        │
                                        ▼
                             [PREFLIGHT CHECKPOINT]
                                        │
                                        ▼
                            [GRADLE ASSEMBLE (1 ONLY)]
                                        │
                                        ▼
                         [SECOND APK + SHA-256 REGISTER]
                                        │
                                        ▼
                                    [🛑 STOP]
```

---

### 2. Puntos Críticos de Bloqueo
1. **Dependencia Externa de Firebase:** No se puede compilar con éxito funcional un nuevo `applicationId` sin la intervención humana previa en la consola de Firebase / GCP.
2. **Dependencia de Assets:** La inyección de íconos requiere que `BrandEntity` posea URLs válidas de íconos en Storage.
