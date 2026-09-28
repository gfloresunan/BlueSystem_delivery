# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0 — MATRIZ DE DESVIACIÓN DE CONTRATOS LEGADOS (LEGACY CONTRACT DRIFT MATRIX)
**Protocolo:** `BSD-C2D35-IMPLEMENTATION-READINESS-RUNTIME-MAPPING-001`  
**Fase:** POST-C2D.34A / PRE-C2D.35 IMPLEMENTATION  
**Modo:** `READ-ONLY / AUDIT-FIRST / ZERO CODE MUTATION / ZERO DATA MUTATION`  
**Fecha:** 3 de Septiembre de 2026  

---

### 1. ALCANCE Y GOBERNANZA DE CADENAS LEGADAS (DEC-17)
Durante la evolución de la plataforma coexistieron diferentes convenciones de nombres para planes y niveles de suscripción. **DEC-17** dictaminó:
- **PRO:** Aliased y reemplazado formalmente por `PlanTier.PROFESSIONAL`.
- **BASIC:** Aliased y reemplazado por `PlanTier.STARTER`.
- **FREE:** Deprecado formalmente (no existen suscripciones comerciales gratuitas en el modelo Enterprise).
- **Corporate Gold:** Deprecado formalmente (etiqueta decorativa sin cuotas definidas).
- **Standard Tenant:** Deprecado formalmente.
- **Enterprise MultiTenant (String libre):** Estandarizado formalmente bajo el enum canónico `PlanTier.ENTERPRISE`.

**Regla de Oro:** Durante C2D.35.0 NO se elimina ninguna cadena; se mapea la sustitución que C2D.35 deberá aplicar sin romper compatibilidad histórica.

---

### 2. MATRIZ DE DESVIACIÓN DE CONTRATOS LEGADOS

| Cadena / Modelo Legado | Archivo Físico | Símbolo / Variable | Uso Actual en Código | Reemplazo Canónico Aprobado | Migración Requerida en C2D.35 | Riesgo Operativo |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **`"Corporate Gold"`** | `panel-admin/.../governanceCenter.js:585` | `<option value="Corporate Gold">` | Selector de plan corporativo en modal de creación de empresas holding. | `PlanTier.PROFESSIONAL` (o `CUSTOM`) | Reemplazar opción en selector HTML y migrar documentos en `/organizations`. | 🔴 **ALTO** (Inconsistencia de cuotas) |
| **`"Standard Tenant"`** | `panel-admin/.../governanceCenter.js:586` | `<option value="Standard Tenant">` | Selector de plan en modal de empresas. | `PlanTier.STARTER` | Reemplazar opción por `STARTER`. | 🔴 **ALTO** |
| **`"Enterprise MultiTenant"`** | `panel-admin/.../governanceCenter.js:584` | `<option value="Enterprise MultiTenant">` | Selector de plan libre como string no estructurado. | `PlanTier.ENTERPRISE` | Normalizar valor a clave enum `ENTERPRISE`. | 🟠 **MEDIO** |
| **`"FREE"`** | `panel-admin/.../legacyPlans.js` (si existe) / Docs | String literal de plan sin costo | Menciones en comentarios y documentación previa. | Deprecado (Plan inexistente) | Rechazar cualquier aprovisionamiento que intente usar `"FREE"`. | 🟠 **MEDIO** |
| **`"BASIC"`** | `panel-admin/.../subscriptionManager.js` | Aliasing legacy | Referencia a comercios pequeños de versión 1. | `PlanTier.STARTER` | Aliasing bidireccional: `tier === 'BASIC' ? 'STARTER' : tier`. | 🟡 **BAJO** (Aliasing seguro) |
| **`"PRO"`** | `panel-admin/.../subscriptionManager.js` | Aliasing legacy | Referencia a suscripciones profesionales de versión 1. | `PlanTier.PROFESSIONAL` | Aliasing bidireccional: `tier === 'PRO' ? 'PROFESSIONAL' : tier`. | 🟡 **BAJO** (Aliasing seguro) |
| **`organizations.plan`** | `panel-admin/.../governanceService.js:42` | `plan: orgData.plan \|\| 'Enterprise'` | Campo string plano en `/organizations/{orgId}` sin enlace a suscripción real. | `/subscriptions/{subId}.planTier` | Proyectar `planTier` canónico en organización; no almacenar planes como strings decorativos. | 🔴 **ALTO** (Desconexión de suscripción) |
| **`tenant.subscriptionPlan`** | `functions/.../domainManagement.ts:83` | `tenantData.subscriptionPlan \|\| tenantData.planTier` | Dualidad de campo para leer el plan del tenant. | `tenantData.currentPlanTier` (proyección) | Unificar lectura canónica de `currentPlanTier` sincronizado por `adminMutateSubscription`. | 🟠 **MEDIO** |
| **`users.branches` (Array)** | `panel-admin/.../liveRestaurants.js:1188` | `db.collection('users').doc().update({branches})` | Persistencia de sucursales dentro del documento del usuario en `/users`. | Colección canónica `/branches/{branchId}` | Migrar mutación a `/branches` con `tenantId` y `businessId` canónicos (DEC-19). | 🔴 **ALTO** (Violación EIAM) |

---

### 3. ESTRATEGIA DE MIGRACIÓN SIN RUPTURA (NON-BREAKING TRANSITION)
Para garantizar la continuidad operativa de clientes antiguos:
1. **Capa de Normalización en Backend:** Toda función que reciba un string de plan ejecutará:
   ```typescript
   export function normalizePlanTier(rawPlan: string | undefined | null): PlanTier {
     const p = (rawPlan || '').trim().toUpperCase();
     if (p === 'PRO') return 'PROFESSIONAL';
     if (p === 'BASIC') return 'STARTER';
     if (p === 'ENTERPRISE MULTITENANT' || p === 'ENTERPRISE') return 'ENTERPRISE';
     if (p === 'CORPORATE GOLD') return 'PROFESSIONAL';
     if (p === 'STANDARD TENANT') return 'STARTER';
     if (p === 'CUSTOM') return 'CUSTOM';
     return 'STARTER'; // Default fail-safe baseline
   }
   ```
2. **Eliminación de la UI en C2D.35:** Las interfaces administrativas reemplazarán los selectores legados por los cuatro planes oficiales: `STARTER`, `PROFESSIONAL`, `ENTERPRISE`, `CUSTOM`.
