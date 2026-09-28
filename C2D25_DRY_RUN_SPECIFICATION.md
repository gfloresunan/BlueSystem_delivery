# C2D25 — DRY RUN SPECIFICATION (C2D.25A PRE-BUILD VERIFICATION)
## Especificación y Protocolo de Verificación Pre-Build Dry-Run
**Protocol ID:** `C2D.25A`  
**Execution Class:** `DRY-RUN / PRE-BUILD SIMULATION / ZERO-BINARY`  

---

### 1. Propósito de la Verificación Dry-Run
Validar de forma exhaustiva e integral toda la cadena de compilación declarativa antes de autorizar cualquier compilación física en Gradle:

```
AppConfig
   ↓
BuildRequest
   ↓
Authorization (Single-Use Token)
   ↓
Tenant Validation (Aislamiento Multi-Tenant)
   ↓
Brand Isolation (brand.tenantId === tenant.tenantId)
   ↓
Subscription & Plan (Gatekeeper Conforme)
   ↓
Feature Entitlements (Resolución Dinámica)
   ↓
Commercial Profile Mapping ('whitelabel' Universal)
   ↓
Firebase Client Mapping (google-services.json Package Match)
   ↓
Gradle Parameter Injection (-PcustomApplicationId, -PcustomAppName)
   ↓
Signing Policy (Secret Manager Keystore Protection)
   ↓
Artifact Destination (Storage Path / SHA-256 Checksum Pipeline)
   ↓
🛑 HARD STOP — PRE-BUILD VERIFICATION SUCCESSFUL (0 Builds Executed)
```

### 2. Instrumentación en UI
El módulo `buildEngineManager.js` incorpora el simulador interactivo **"Ejecutar Dry-Run Preflight"** que evalúa las 9 verificaciones en tiempo real para cualquier `AppConfigEntity` seleccionada.
