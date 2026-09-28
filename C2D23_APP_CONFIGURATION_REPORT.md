# C2D23 — APP CONFIGURATION REPORT
## Arquitectura y Capacidades de la Interfaz App Configuration Manager
**Protocol ID:** `C2D.23`  

---

### 1. Integración en Cockpit Admin
- **Archivo:** `panel-admin/public/js/dashboard/appConfigManager.js`
- **Ubicación:** `🏛 GOBERNANZA EMPRESARIAL -> Configuración de Apps (📱)`
- **Permisos:** Protegido por `AuthReadyGate` y Custom Claims (`isPlatformAdmin()`).

### 2. Vistas y Componentes
1. **Monitor de Configuraciones:** Grid interactivo de tarjetas de configuración con badges de estado, logos de marca, identificadores de paquete (`applicationId`), versión, entorno y conteo de feature flags.
2. **Modal de Configuración Multicapa:** Formulario estructurado en 3 secciones (Vinculación, Distribución, Proveedores) con validaciones de pertenencia de marca y suscripción.
3. **App Preview Simulator:** Mockup visual para previsualizar el encabezado móvil, color primario, logo y metadatos de la aplicación sin ejecutar ningún build.
