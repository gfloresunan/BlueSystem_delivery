# 🏛️ BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.27A
# AUDITORÍA FORENSE: CREACIÓN DE EMPRESA MULTITENANT & PLANES COMERCIALES

**Protocol ID:** `BSD-C2D27A-MULTITENANT-COMPANY-CREATION-PLAN-FORENSIC-AUDIT-001`  
**Fecha:** 2026-09-02  
**Autor:** Senior Developer & Platform Auditor  
**Modo:** `READ-ONLY-FIRST` / `FAIL-CLOSED` / `ZERO-PRODUCTION-MUTATION`

---

## 🎯 1. RESUMEN EJECUTIVO & RESPUESTA A LA PREGUNTA PRINCIPAL

### Pregunta Principal:
> *¿Qué sucede REALMENTE cuando un PLATFORM_ADMIN / SUPER_ADMIN abre «🏢 Nueva Empresa MultiTenant» y selecciona «Enterprise MultiTenant», «Corporate Gold» o «Standard Tenant»?*

### Veredicto Forense Basado en Código Real:
1. **La acción UI «Crear Empresa» NO aprovisiona un Tenant Canónico (`/tenants/{tenantId}`):**
   - El formulario contenido en [governanceCenter.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/governanceCenter.js#L571-L635) invoca [governanceService.saveOrganization](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/services/governanceService.js#L35-L57).
   - Esta función ejecuta **exclusivamente un `set` sobre `/organizations/{orgId}`** con un ID generado en cliente (`'org_' + Date.now()`).
2. **Las opciones de plan (`Enterprise MultiTenant`, `Corporate Gold`, `Standard Tenant`) son ETIQUETAS DECORATIVAS:**
   - La opción seleccionada se guarda literalmente como un string en el campo `organizations.plan`.
   - **NO existe ninguna mutación ni mapeo hacia `SubscriptionEntity.planTier`** (`'STARTER'`, `'PROFESSIONAL'`, `'ENTERPRISE'`, `'CUSTOM'`).
   - **NO se crea ningún documento en `/subscriptions/{subscriptionId}`**.
   - **NO se activan cuotas operacionales (`SubscriptionQuotas`) ni límites de pedidos, repartidores o sucursales**.
   - **NO se habilitan módulos de capacidades (`CapabilityModule[]`) en Gatekeeper**.
3. **NO se crea Marca (`BrandEntity`), ni Configuración de App (`AppConfigEntity`), ni Usuarios, ni Custom Claims:**
   - No se dispara ninguna Cloud Function ni trigger en segundo plano para `/organizations`.
   - La arquitectura canónica `TENANT → BRAND → SUBSCRIPTION → APP_CONFIG → GATEKEEPER` (certificada en C2D.21, C2D.22, C2D.23, C2D.25, C2D.26) opera de forma completamente desacoplada a través de [subscriptionManager.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/subscriptionManager.js), [brandManager.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/brandManager.js) y [appConfigManager.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/appConfigManager.js).

---

## 🔍 2. CADENA DE EJECUCIÓN FORENSE (PHASE 1)

```text
[UI: Governance Center]
  └─ Tab "Empresas & Holding Multi-Tenant"
       └─ Botón "➕ Nueva Empresa"
            └─ governanceCenterModule.openSaveOrganizationModal(null)
                 └─ Renderiza Drawer Form (org-nombre, org-plan, org-email, org-telefono, org-status)
                      └─ Botón "Crear Empresa" (Submit)
                           └─ governanceCenterModule.handleSaveOrganization(event, null)
                                └─ Extrae { orgId: null, nombre, plan, contactoEmail, contactoTelefono, status }
                                     └─ governanceService.saveOrganization(orgData)
                                          └─ orgId = 'org_' + Date.now()
                                          └─ db.collection('organizations').doc(orgId).set({
                                               nombre,
                                               ownerUid: 'admin',
                                               status: 'ACTIVE',
                                               plan: 'Enterprise MultiTenant' | 'Corporate Gold' | 'Standard Tenant',
                                               contactoEmail,
                                               contactoTelefono,
                                               updatedAt: serverTimestamp(),
                                               createdAt: serverTimestamp()
                                             }, { merge: true })
                                          └─ Cierra Drawer y refresca UI
```

---

## 📊 3. MATRIZ COMPARATIVA: PLANES UI VS COMPORTAMIENTO REAL (PHASE 6)

| UI PLAN LABEL | INTERNAL ENUM | DOCUMENTO CREADO | SUBSCRIPTION TIER | CUOTAS ACTIVADAS | FEATURES GATEKEEPER | MARCA CREADA | APP CONFIG |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Enterprise MultiTenant** | Ninguno (String) | `/organizations/{orgId}` | *Ninguna* (No creada) | *Ninguna* (No asignadas) | *Ninguna* | *Ninguna* | *Ninguna* |
| **Corporate Gold** | Ninguno (String) | `/organizations/{orgId}` | *Ninguna* (No creada) | *Ninguna* (No asignadas) | *Ninguna* | *Ninguna* | *Ninguna* |
| **Standard Tenant** | Ninguno (String) | `/organizations/{orgId}` | *Ninguna* (No creada) | *Ninguna* (No asignadas) | *Ninguna* | *Ninguna* | *Ninguna* |

---

## 🏢 4. MODELO DE DOMINIO: COMPANY / HOLDING VS TENANT (PHASE 3)

### ¿Es Company una entidad separada de Tenant?
**SÍ (Arquitecturalmente), pero existe una discrepancia en la UI:**
1. **Contrato Canónico de Dominio ([models.ts](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/functions/src/domain/platform/models.ts#L296-L312)):**
   - `TenantEntity` (`/tenants/{tenantId}`): Entidad raíz del aislamiento de datos, licenciamiento y facturación.
   - `OrganizationEntity` (`/organizations/{orgId}`): Entidad corporativa que agrupa múltiples comercios (`businessIds: string[]`) bajo un `tenantId` (`tenantId: string`).
2. **Discrepancia en la UI:**
   - La pantalla de Governance Center titula la sección como *"Empresas & Holding Multi-Tenant (Tenants Multi-Empresa)"*, tratando a la entidad Organization como si fuera el Tenant principal.
   - Sin embargo, los módulos de [subscriptionManager.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/subscriptionManager.js#L195), [brandManager.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/brandManager.js#L114) y [appConfigManager.js](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/panel-admin/public/js/dashboard/appConfigManager.js#L137) consultan la colección canónica `/tenants`.

---

## 🔒 5. ANÁLISIS DE SEGURIDAD, AISLAMIENTO Y GOBERNANZA

1. **Aislamiento Multi-Tenant (Invariante Inviolable):**
   - Tenant 01: 🟢 Intacto / No modificado
   - Tenant 02: 🟢 Intacto / No modificado
   - Tenant 03: 🟢 Intacto / No modificado
   - Tenant 04: 🔒 Ausente / No creado / No autorizado
2. **Track A (Android Reference Client):**
   - 🟢 Intacto y protegido sin ninguna modificación en `app/` ni código nativo Kotlin.
3. **Flutter Commercial Architecture (Track B):**
   - Compatible con la especificación Multi-Platform Single-Core (`ONE CORE / ONE FIRESTORE / MULTIPLE CLIENTS`).
4. **Idempotencia y Race Conditions:**
   - La generación de IDs en cliente (`Date.now()`) no es idempotente ante reintentos rápidos de red.
   - No hay validación de unicidad de Slug o RUC en la creación directa de organizaciones en la UI.
5. **Rollback & Transaccionalidad:**
   - Al no existir aprovisionamiento en cascada en la UI, no hay riesgo de fallos parciales de suscripción en este modal, pero existe una desalineación de gobernanza al no aprovisionar el stack completo canónico de forma atómica.

---

## 🚦 SCORECARD FINAL C2D.27A

| Módulo / Dimensión | Estatus | Diagnóstico Forense |
| :--- | :---: | :--- |
| **Company Creation UI** | 🟡 | Solo crea `/organizations/{orgId}`; no aprovisiona Tenant canónico. |
| **Enterprise MultiTenant** | 🟡 | Etiqueta descriptiva sin enlace automático a `PlanTier.ENTERPRISE`. |
| **Corporate Gold** | 🟡 | Etiqueta descriptiva sin enlace automático a `PlanTier.PROFESSIONAL`. |
| **Standard Tenant** | 🟡 | Etiqueta descriptiva sin enlace automático a `PlanTier.STARTER`. |
| **Subscription Mapping** | 🟡 | Desacoplado; debe gestionarse independientemente en `subscriptionManager`. |
| **Tenant Provisioning** | 🟡 | Requiere unificación atómica con `/tenants`. |
| **Brand Management** | 🟢 | Funciona canónicamente en `brandManager.js` sobre `/brands`. |
| **App Configuration** | 🟢 | Funciona canónicamente en `appConfigManager.js` sobre `/app_configs`. |
| **EIAM & Security Rules** | 🟢 | Reglas `/organizations` y `/tenants` alineadas y protegidas. |
| **Gatekeeper** | 🟢 | Catálogo canónico estricto en `catalog.ts` y `models.ts`. |
| **Tenant Isolation** | 🟢 | Cero riesgo de contaminación cruzada. |
| **Build Boundary** | 🟢 | Cero compilaciones ejecutadas; barrera Gradle 100% activa. |
| **Track A Protection** | 🟢 | Código Kotlin y flujo Android nativo 100% intactos. |
