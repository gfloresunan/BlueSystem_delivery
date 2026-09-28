# BSD — PLATFORM TRANSFORMATION IMPLEMENTATION BACKLOG
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 IMPLEMENTATION BACKLOG`  
**Execution Mode:** `READ-ONLY / ZERO-MUTATION`  

---

## 1. BACKLOG PRIORIZADO DE TAREAS DE INGENIERÍA

| ID | Prioridad | Módulo | Descripción | Archivos Involucrados | Riesgo |
|---|---|---|---|---|---|
| **TSK-01** | P0 (Inmediato) | Admin Web | Crear `brandManager.js` para visualización, creación y edición de marcas en `/brands`. | `panel-admin/public/js/dashboard/brandManager.js` | 🟢 Bajo |
| **TSK-02** | P0 (Inmediato) | Admin Web | Crear `subscriptionManager.js` para asignación de planes y cuotas de tenants en `/subscriptions`. | `panel-admin/public/js/dashboard/subscriptionManager.js` | 🟢 Bajo |
| **TSK-03** | P1 (Alta) | Android Core | Enlazar `BrandThemeProvider` en `MainActivity.kt` manteniendo fallback a `MyApplicationTheme`. | `app/src/main/java/com/example/MainActivity.kt` | 🟢 Bajo |
| **TSK-04** | P1 (Alta) | Android Build | Configurar `productFlavors` en `app/build.gradle.kts` para variantes de marca. | `app/build.gradle.kts` | 🟡 Medio |
| **TSK-05** | P2 (Media) | Cloud Functions | Implementar callables CRUD `adminSaveBrand`, `adminSaveSubscription`, `adminGetTenantQuotas`. | `functions/src/callables/admin.ts` | 🟢 Bajo |
| **TSK-06** | P2 (Media) | Merchant Web | Enriquecer selector de agencia para soportar N comercios bajo un único login de agencia. | `merchant-web/src/shared/eiam/TenantContext.tsx` | 🟢 Bajo |
| **TSK-07** | P3 (Gobernanza)| Plataforma | Certificación E2E de los 3 Tenants en Canary (C2D.22) antes de cualquier apertura. | Todo el sistema | 🔒 Bloqueante |

---

## 2. REGLA DE NO REGRESIÓN
Cada tarea del backlog debe ejecutarse con **cambios mínimos y aislados**, cumpliendo estrictamente con las reglas de ingeniería del proyecto.
