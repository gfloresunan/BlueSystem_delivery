# C2D23 — IMPLEMENTATION PLAN
## Phase 2D.23 — App Configuration Manager & Commercial Product Configuration Foundation
**Protocol ID:** `C2D.23`  
**Execution Class:** `CONTROLLED IMPLEMENTATION / AUDIT-FIRST / ZERO-AUTO-BUILD / ZERO-TENANT-EXPANSION`  
**Governance State:** `WAITING_FOR_HUMAN_DECISION`  

---

## 1. Contexto y Objetivos

La fase **C2D.23** construye la capacidad de definir configuraciones comerciales de aplicación conectando **Tenant + Brand + Subscription + Features + Gatekeeper $\longrightarrow$ App Configuration**, permitiendo a la plataforma preparar la definición de producto tecnológico sin ejecutar compilaciones automáticas de APK/AAB ni alterar la base de datos viva.

---

## 2. Salvaguardas y Principios Inviolables

1. **`READY_FOR_BUILD ≠ BUILD`:** Una configuración en estado válido / `ACTIVE` **NO autoriza ni dispara builds de Gradle**, generación de APK/AAB, ni flujos de CI/CD.
2. **`PRODUCTION MUTATION GUARD`:** Cero mutaciones comerciales en `Tenant 01`, `Tenant 02`, `Tenant 03`. Las pruebas utilizarán fixtures sintéticos.
3. **`TENANT 04`:** Estrictamente **BLOQUEADO / NO AUTORIZADO / NO CREADO**.
4. **`PRODUCT FLAVORS / BUILD ENGINE / RELEASE MANAGER`:** Estrictamente **FUERA DE ALCANCE** de C2D.23.

---

## 3. Matriz de Archivos a Modificar / Crear

### Archivos a Crear:
1. `panel-admin/public/js/dashboard/appConfigManager.js` (`[NEW]`):
   - Módulo SPA completo con:
     - Tabla interactiva de configuraciones de aplicación (`/app_configs`).
     - Filtros por Tenant, Plataforma (`ANDROID`, `IOS`, `WEB`), Entorno (`DEV`, `STAGING`, `PROD`) y Estado (`DRAFT`, `ACTIVE`, `DEPRECATED`, `ARCHIVED`).
     - Modal de Creación y Edición con validación determinística `brand.tenantId === tenant.tenantId` y `sub.tenantId === tenant.tenantId`.
     - Configuración de Distribución (`appName`, `shortName`, `applicationId`, `versionName`, `buildNumber`).
     - Configuración de Proveedores (`firebaseProjectId`, `firebaseAppId`, `mapsApiKey`).
     - Feature Flags específicos de app derivados de la suscripción del Tenant.
     - Live App Preview (Read-Only Ephemeral).
     - Guardado atómico en `/app_configs/{configId}` y registro en `/audit_events`.

### Archivos a Modificar:
2. `panel-admin/public/dashboard.html` (`[MODIFY]`):
   - Inclusión de `<script src="js/dashboard/appConfigManager.js?v=1.0.0"></script>`.
3. `panel-admin/public/js/dashboard/dashboard.js` (`[MODIFY]`):
   - Registro en `getModule()` y en el menú de navegación bajo `🏛 GOBERNANZA EMPRESARIAL -> Configuración de Apps (📱)`.
4. `firestore.rules` (`[MODIFY]`):
   - Inclusión de regla para `/app_configs/{configId}` con lectura para administradores/miembros del tenant y escritura exclusiva para Platform Admins / SuperAdmins.

### Archivos Inmutables (🔒 CONGELADOS):
- `DeliveryControlTowerModule.tsx` / `liveMap.js` (ADR-013 Control Tower).
- `SolicitarEnvioScreen.kt` / `GeoUtils.kt` (ADR-015 X→Y Location).
- `LocationTrackingService.kt` (ADR-016 Fleet Core).
- `emailService.ts` / `emailTemplates.js` (ADR-017 Transactional Email Core).
- `app/build.gradle.kts` (Product Flavors fuera de alcance).
- `gatekeeper.ts` (Motor evaluador canónico intacto).

---

## 4. Cuantificación de Riesgos y Mutaciones Previstas

| Parámetro | Estado Previsto | Observación |
|---|---|---|
| Mutaciones en BD Productiva | `0` | Tests con fixtures sintéticos |
| Mutaciones en Tenants Vivos | `0` | Tenant 01, 02, 03 inalterados |
| Tenant 04 | 🔒 `BLOQUEADO` | Ausente y no creado |
| Compilaciones Gradle / APK | `0` | Cero builds en C2D.23 |
| Deployments / Migraciones | `0` | Cero deploys |
| ADRs Congelados | 🔒 `100% INTACTOS` | ADR-013, 014, 015, 016, 017 |

---

## 5. Batería de Pruebas de Certificación (APP-01 a APP-20, SEC-01 a SEC-30)

- **Configuración CRUD (APP-01 a APP-05):** Creación, lectura, edición, archivado y validación de campos obligatorios.
- **Aislamiento e Identidad (APP-06 a APP-10):** Validación estricta Tenant $\leftrightarrow$ Brand $\leftrightarrow$ Subscription y denegación cross-tenant.
- **Resolución Comercial (APP-11 a APP-15):** Resolución de plan, feature flags y consistencia con Gatekeeper (Default Deny).
- **Plataforma y Barrera de Build (APP-16 a APP-20):** Configuración Android/iOS schema, validación de entorno y certificación de la barrera `READY_FOR_BUILD ≠ BUILD`.
- **Matriz de Seguridad (SEC-01 a SEC-30):** 30 vectores de seguridad evaluados al 100%.

---

## 6. Estado de Parada Obligatoria

```
============================================================
🛑 HUMAN REVIEW REQUIRED — C2D.23
============================================================

PHASE 2D.23:
APP CONFIGURATION MANAGER & PRODUCT CONFIGURATION FOUNDATION

PLAN:
GENERATED & REVIEW READY

IMPLEMENTATION:
LOCKED

TENANT 04:
LOCKED (NOT AUTHORIZED)

PRODUCT FLAVORS:
LOCKED

BUILD ENGINE:
LOCKED

CI/CD:
LOCKED

RELEASE MANAGER:
LOCKED

IOS:
LOCKED

DEDICATED FIREBASE:
LOCKED

ROLLOUT:
LOCKED

LEVEL_7:
NOT GRANTED

GOVERNANCE STATUS:
WAITING_FOR_HUMAN_DECISION
============================================================
```
