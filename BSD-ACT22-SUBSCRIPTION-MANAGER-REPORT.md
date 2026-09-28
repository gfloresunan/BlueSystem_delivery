# BSD-ACT22-SUBSCRIPTION-MANAGER-REPORT
## Arquitectura de la Interfaz Subscription Manager
**Protocol ID:** `BSD-ACT22-SUBSCRIPTION-FEATURE-MANAGER-001`  

---

### 1. Integración en Cockpit Admin
- **Archivo:** `panel-admin/public/js/dashboard/subscriptionManager.js`
- **Categoría:** `🏛 GOBERNANZA EMPRESARIAL -> Suscripciones & Features (💳)`
- **Permisos:** Protegido por `AuthReadyGate` y Custom Claims (`isPlatformAdmin()`).

### 2. Capacidades Funcionales
1. **Suscripciones Activas:** Monitor de contratos comerciales con resumen de cuotas (comercios, usuarios, módulos activos) y estado de ciclo de vida.
2. **Modal de Edición/Creación:** Formulario de 3 secciones con auto-poblado inteligente al seleccionar `planTier`, configuración de cuotas numéricas y matriz de selección de módulos por checkboxes.
3. **Asignación Determinística a Tenant:** Al guardar la suscripción, se actualiza atómicamente el campo `subscriptionId` en el documento del Tenant correspondiente.
