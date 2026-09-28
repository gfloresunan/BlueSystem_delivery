# C2D24 — GAP ANALYSIS
## Análisis de Brechas en la Configuración Gradle y Flavors
**Protocol ID:** `C2D.24`  

---

### 1. Matriz de Brechas

| Capacidad | Estado Actual | Estado Objetivo | Brecha / Solución en C2D.24 |
|---|---|---|---|
| Product Flavors | `0` flavors | Dimensión `commercialProfile` (3 flavors) | Definir `core`, `whitelabel`, `enterpriseFitoni` en plan |
| Application ID | Single `com.aistudio.delivery.djweq` | Multi-Application ID por flavor | Parametrizar en cada flavor block |
| Google Services | Single client en JSON | Multi-client array en `google-services.json` | Mapear cada `applicationId` al proyecto Firebase |
| Brand Overlays | Runtime only | Hybrid (Runtime + `res/mipmap` por flavor) | Definir estructura `src/<flavor>/res` |
| Manifest Placeholders | Maps API Key en `defaultConfig` | Placeholders contextuales por flavor | Inyectar `app_name` y providers por flavor |
