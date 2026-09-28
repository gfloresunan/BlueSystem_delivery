# C2D25E — TEST PLAN (FACTORY-01 to FACTORY-20)
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

---

### 1. Batería de Pruebas Estáticas de Fábrica (20/20)

| Test ID | Vector / Funcionalidad | Método de Verificación Estática | Estado |
|---|---|---|---|
| **FACTORY-01** | Firebase package mapping | Validación de array `client` en JSON | 🔴 GAP-FB-01 |
| **FACTORY-02** | Second applicationId resolution | Evaluación de Gradle `-PcustomApplicationId` | 🟢 READY |
| **FACTORY-03** | Wrong applicationId rejection | Validación fail-closed en script pre-build | 🟢 READY |
| **FACTORY-04** | Tenant mismatch rejection | Binding `buildRequest.tenantId === appConfig.tenantId` | 🟢 READY |
| **FACTORY-05** | Brand mismatch rejection | Binding `appConfig.brandId === brand.id` | 🟢 READY |
| **FACTORY-06** | Subscription mismatch rejection | Binding `brand.tenantId === subscription.tenantId` | 🟢 READY |
| **FACTORY-07** | Invalid launcher asset rejection | Validación de dimensiones (512x512 PNG/SVG) | 🟡 GAP-BA-01 |
| **FACTORY-08** | Wrong-brand asset rejection | Segregación por prefijo de storage | 🟢 READY |
| **FACTORY-09** | Maps configuration mismatch | Verificación de manifest placeholder | 🟡 GAP-FB-02 |
| **FACTORY-10** | Duplicate BuildRequest | Evaluación de `IdempotencyKey` SHA-256 | 🟢 READY |
| **FACTORY-11** | Consumed authorization token | Validación de flag `isConsumed: true` | 🟢 READY |
| **FACTORY-12** | Expired authorization | Comparación temporal contra `expiresAt` | 🟢 READY |
| **FACTORY-13** | Artifact collision prevention | Rutas segregadas `{tenant}/{brand}/{build}/` | 🟢 READY |
| **FACTORY-14** | Cross-tenant artifact access | Verificación de reglas IAM en Cloud Storage | 🟢 READY |
| **FACTORY-15** | Cross-brand artifact access | Verificación de particionado de Storage | 🟢 READY |
| **FACTORY-16** | Production signing attempt | Bloqueo de llaves privadas sin credenciales | 🟢 READY |
| **FACTORY-17** | Release escalation attempt | Bloqueo arquitectónico de Release Manager | 🟢 READY |
| **FACTORY-18** | Automatic retry attempt | Comportamiento fail-closed sin bucles | 🟢 READY |
| **FACTORY-19** | Tenant 04 attempt | Bloqueo de creación de Tenant 04 | 🟢 READY |
| **FACTORY-20** | Track A mutation attempt | Blindaje de `app/src/main/` bajo ADR-018 | 🟢 READY |
