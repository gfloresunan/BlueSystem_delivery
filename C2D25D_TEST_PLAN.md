# C2D25D — TEST PLAN (FACTORY-01 to FACTORY-20)
## Protocol ID: `BSD-C2D25D-MULTI-BRAND-BUILD-FACTORY-READINESS-001`

---

### 1. Batería de Pruebas de Fábrica Multi-Marca (Diseño Estático No Destructivo)

| Test ID | Objetivo de la Prueba | Método de Verificación | Estado |
|---|---|---|---|
| **FACTORY-01** | Resolución de Segunda Marca | Validación de esquema `BrandEntity` | 🟢 READY |
| **FACTORY-02** | Resolución de Segundo AppConfig | Validación de esquema `AppConfigEntity` | 🟢 READY |
| **FACTORY-03** | Mapeo de Segundo Cliente Firebase | Verificación de array `client` en JSON | 🔴 GAP (P0) |
| **FACTORY-04** | Inyección Dinámica de Application ID | Verificación de flag `-PcustomApplicationId` | 🟢 READY |
| **FACTORY-05** | Inyección Dinámica de App Name | Verificación de flag `-PcustomAppName` | 🟢 READY |
| **FACTORY-06** | Aislamiento de Assets de Marca | Verificación de rutas segregadas de Storage | 🟡 GAP (P1) |
| **FACTORY-07** | Aislamiento de Tenant | Verificación de binding determinístico | 🟢 READY |
| **FACTORY-08** | Aislamiento de Suscripción | Desacoplamiento de Build Engine | 🟢 READY |
| **FACTORY-09** | Aislamiento de Features | Control en Runtime vía Gatekeeper | 🟢 READY |
| **FACTORY-10** | Validación de Autorización Humana | Formato Level 6 y scoped limits | 🟢 READY |
| **FACTORY-11** | Consumo Single-Use de Token | Transición atómica a `isConsumed: true` | 🟢 READY |
| **FACTORY-12** | Rechazo de Replay | Bloqueo estricto de reintentos | 🟢 READY |
| **FACTORY-13** | Prevención de Colisión de Artefactos | Rutas particionadas en Cloud Storage | 🟢 READY |
| **FACTORY-14** | Verificación de Integridad SHA-256 | Algoritmo NIST FIPS 180-4 | 🟢 READY |
| **FACTORY-15** | Reproducibilidad de Compilación | Fijación de versiones de compilador | 🟢 READY |
| **FACTORY-16** | Recuperación ante Fallos | Protocolo *Fail-Closed* con limpieza | 🟢 READY |
| **FACTORY-17** | Cero Contaminación entre Marcas | Verificación de variables en Gradle | 🟢 READY |
| **FACTORY-18** | Cero Contaminación entre Tenants | Aislamiento lógico y de storage | 🟢 READY |
| **FACTORY-19** | Cero Regresión en Track A | Blindaje de `app/src/main/` | 🟢 READY |
| **FACTORY-20** | Parada de Gobernanza Obligatoria | Bloqueo de auto-rollout y mass builds | 🟢 READY |
