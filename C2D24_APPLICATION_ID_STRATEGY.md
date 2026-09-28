# C2D24 — APPLICATION ID STRATEGY
## Estrategia de Identidad de Aplicación y Prevención de Colisiones
**Protocol ID:** `C2D.24`  

---

### 1. Formato y Reglas Canónicas
- **Estructura Estándar:** `com.<brand_slug>.delivery` o `com.bluesystem.<sub_identity>`
- **Inmutabilidad Absoluta:** Un `applicationId` publicado en Google Play Store **no puede cambiar**. Si un cliente cambia su nombre comercial o logo, solo muta su `BrandEntity` en runtime; su `applicationId` permanece inmutable.
- **Unicidad:** Cada flavor o perfil de compilación debe mapear a un identificador registrado en `google-services.json` para no romper Google Sign-In, Auth ni App Check Play Integrity.
- **Identificadores Reservados:**
  - `com.aistudio.delivery.djweq` (Canary / Core Baseline)
  - `com.bluesystem.delivery` (Marketplace Oficial)
  - `com.fitoni.delivery` (Tenant 01 Enterprise Reference)
