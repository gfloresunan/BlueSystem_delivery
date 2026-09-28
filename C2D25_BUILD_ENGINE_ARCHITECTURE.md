# C2D25 — BUILD ENGINE ARCHITECTURE
## Arquitectura del Android Build Engine Multi-Marca
**Protocol ID:** `C2D.25`  

---

### 1. Diagrama de Flujo de Compilación Controlada

```
                         BUILD REQUEST (/build_requests/{requestId})
                                            │
                                            ▼
                    TEMPORAL & SINGLE-USE AUTHORIZATION TOKEN
                                            │
                                            ▼
                         VALIDATION & ISOLATION GATEWAY
                                            │
                    ├─ Valida Tenant ↔ Brand ↔ Subscription
                    ├─ Valida AppConfig status: ACTIVE / READY_FOR_BUILD
                    ├─ Valida coincidencia de applicationId en Firebase
                    ├─ Valida límites de cuota y permisos del actor
                    └─ Valida integridad de firma (Keystore en HSM/Secret)
                                            │
                                            ▼
                           GRADLE ORCHESTRATION ADAPTER
                                            │
                      (Inyección de Propiedades Dinámicas:
                       ./gradlew :app:assembleWhitelabelRelease
                       -PcustomAppId=... -PcustomAppName=...)
                                            │
                                            ▼
                         ARTIFACT REGISTRATION & CHECKSUM
                                            │
                                            ▼
                        🛑 STOP — ARTIFACT IN SECURE STORAGE
                                            │
                                 [FUTURE C2D.26: RELEASE]
```

### 2. Separación Absoluta de Responsabilidades
- **Build Engine $\neq$ Release Manager:** El Build Engine termina cuando el binario (APK/AAB) es generado, verificado por hash SHA-256 y archivado en Storage seguro. **No publica ni distribuye.**
- **Ready for Build $\neq$ Build Authorized $\neq$ Build Executed.**
