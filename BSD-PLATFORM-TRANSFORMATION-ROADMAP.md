# BSD — COMMERCIAL PLATFORM TRANSFORMATION ROADMAP
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 TRANSFORMATION ROADMAP`  
**Execution Mode:** `READ-ONLY / AUDIT-FIRST`  

---

## 1. FLUJO CONCEPTUAL DEL ROADMAP

```
CURRENT STATE (POST-C2D.21 / C2D.22: 3 TENANTS CANARY)
      │
      ▼
PHASE 01: FOUNDATION GAPS CLOSURE
      │
      ▼
PHASE 02: TENANT / BRAND FOUNDATION & BRAND MANAGER UI
      │
      ▼
PHASE 03: SUBSCRIPTION & FEATURE ENGINE (ADMIN + BILLING GATES)
      │
      ▼
PHASE 04: WEB DYNAMIC EXPERIENCE (MULTI-BRAND PORTAL)
      │
      ▼
PHASE 05: ANDROID WHITE-LABEL ENGINE (DYNAMIC THEME IN RUNTIME)
      │
      ▼
PHASE 06: ANDROID BUILD SYSTEM (PRODUCT FLAVORS & AUTOMATION)
      │
      ▼
PHASE 07: MULTI-MODEL VALIDATION (MARKETPLACE, AGENCY, WHITE LABEL)
      │
      ▼
PHASE 08: 3-TENANT EXTENDED OBSERVATION (C2D.22 CERTIFICATION)
      │
      ▼
PHASE 09: HUMAN DECISION GATE (NO AUTO-EXPANSION)
      │
      ▼
FUTURE ENTERPRISE (INFRAESTRUCTURA DEDICADA)
```

---

## 2. DETALLE DE FASES DE IMPLEMENTACIÓN

### FASE 01: FOUNDATION GAPS CLOSURE
- **Objetivo:** Cerrar inconsistencias de hidratación de datos y preparar los modelos de contratos en frontend.
- **Estado Actual:** 🟡 En progreso conceptual.
- **Dependencias:** Ninguna.
- **Archivos Clave:** `functions/src/domain/platform/models.ts`, `merchant-web/src/shared/branding/types.ts`.
- **Riesgo:** 🟢 Bajo.

### FASE 02: BRAND MANAGER UI EN ADMIN WEB
- **Objetivo:** Construir la consola visual `brandManager.js` en `panel-admin` para crear/editar marcas, subir logos a Cloud Storage y previsualizar paletas de color HSL/HEX.
- **Estado Actual:** 🔴 Pendiente de implementación.
- **Dependencias:** FASE 01.
- **Archivos Clave:** `panel-admin/public/js/dashboard/brandManager.js`, `storage.rules`.
- **Riesgo:** 🟢 Bajo (Aditivo).

### FASE 03: SUBSCRIPTION & FEATURE MANAGER UI
- **Objetivo:** Construir la consola visual `subscriptionManager.js` para administrar planes (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`), cuotas y feature flags.
- **Estado Actual:** 🔴 Pendiente de implementación.
- **Dependencias:** FASE 02.
- **Archivos Clave:** `panel-admin/public/js/dashboard/subscriptionManager.js`, `functions/src/domain/gatekeeper/gatekeeper.ts`.
- **Riesgo:** 🟢 Bajo (Aditivo).

### FASE 04: ANDROID RUNTIME DYNAMIC THEME ENLACE
- **Objetivo:** Enlazar `BrandThemeProvider` en el punto de entrada de Compose en `MainActivity.kt` para que la aplicación adapte su paleta dinámicamente al autenticar un Tenant / Brand.
- **Estado Actual:** 🟡 Código de Provider existe en `com.example.whitelabel`, falta enlace en `MainActivity`.
- **Dependencias:** FASE 02.
- **Archivos Clave:** `app/src/main/java/com/example/MainActivity.kt`, `app/.../whitelabel/BrandThemeProvider.kt`.
- **Riesgo:** 🟢 Bajo (Quirúrgico).

### FASE 05: ANDROID BUILD FLAVORS & MULTI-BRAND PIPELINE
- **Objetivo:** Configurar `productFlavors` en `app/build.gradle.kts` para permitir compilar binarios independientes (`com.aistudio.delivery.djweq`, `com.fitoni.delivery.express`) con sus respectivos iconos y nombres de app.
- **Estado Actual:** 🔴 Pendiente.
- **Dependencias:** FASE 04.
- **Archivos Clave:** `app/build.gradle.kts`, `app/src/<flavor>/res/`.
- **Riesgo:** 🟡 Medio (Requiere validación de compilación Gradle).

### FASE 06: MULTI-MODEL VALIDATION & C2D.22 CERTIFICACIÓN
- **Objetivo:** Validar los 4 modelos comerciales (Marketplace, Agency, White Label, Enterprise) sobre la flota de 3 Tenants en Canary sin crear nuevos tenants.
- **Estado Actual:** 🔵 Esperando autorización.
- **Dependencias:** FASES 01 a 05.
- **Riesgo:** 🟢 Bajo.
