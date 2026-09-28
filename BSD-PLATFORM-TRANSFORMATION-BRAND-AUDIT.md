# BSD — BRAND ENGINE & BRAND MANAGER AUDIT REPORT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. ESTADO DEL BRAND ENGINE

### A. Colección `/brands` y Contratos de Datos
- **Ruta Firestore:** `/brands/{brandId}`
- **Schema:** `BrandEntity`, `BrandVisualConfig`, `BrandMetadata` en `functions/src/domain/platform/models.ts` (líneas 117-159).
  - `brandId`, `tenantId`, `displayName`, `shortName`, `slug`
  - `visual`: `logoUrl`, `iconUrl`, `splashUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `textColor`, `fontFamily`, `themeConfig`
  - `metadata`: `supportEmail`, `supportPhone`, `website`, `socialLinks`, `termsUrl`, `privacyUrl`
  - `status`: `DRAFT` | `ACTIVE` | `ARCHIVED`
- **Reglas de Seguridad:** `firestore.rules` líneas 163-169.
  - Lectura: `allow read: if true;` (Acceso público requerido para storefronts y branding de clientes).
  - Escritura: `allow create, update: if isAuthenticated() && (isPlatformAdmin() || (isBusinessAdmin() && isTenantMember(request.resource.data.tenantId)));`
- **Estado:** 🟢 `REAL / OPERACIONAL`.

### B. Hidratación de Marca en Web (Merchant Web)
- **Implementación:** `merchant-web/src/shared/branding/ClientExperienceProvider.tsx` y `designTokenResolver.ts`.
- **Comportamiento:** Inyecta variables CSS en tiempo de ejecución (`--primary`, `--secondary`, `--accent`, `--bg`, etc.) y actualiza dinámicamente `document.title` y logos.
- **Fallback Seguro:** Si no existe configuración de marca personalizada, hidrata con `DEFAULT_BRAND_CONFIG` (BlueSystem Enterprise).
- **Estado:** 🟢 `REAL / OPERACIONAL`.

### C. Hidratación de Marca en Android (Customer / Courier App)
- **Implementación:** `app/src/main/java/com/example/whitelabel/`
  - `BrandDesignTokens.kt`: Data classes para tokens de color y assets.
  - `BrandHydrationResolver.kt`: Parser robusto de códigos HEX (`#RGB`, `#RRGGBB`) con cálculo de contraste de luminancia YIQ y fallback a paleta por defecto.
  - `BrandThemeProvider.kt`: Wrapper composable `BrandThemeProvider` y `LocalBrandTokens` para inyección de `ColorScheme` en Jetpack Compose.
- **Brecha en Runtime:** `MainActivity.kt` no envuelve la jerarquía de pantallas en `BrandThemeProvider`, sino que usa `MyApplicationTheme` estático.
- **Estado:** 🟡 `PARTIAL / IMPLEMENTADO PERO NO ENLAZADO EN MAIN RUNTIME`.

---

## 2. ESTADO DEL BRAND MANAGER (CONSOLA DE GESTIÓN)

### A. Búsqueda Forense en Admin Panel
- **Búsqueda ejecutada:** `grep_search` sobre `panel-admin/public/js/` buscando `brandManager`, `brands/`, `BrandVisualConfig`.
- **Resultado:** 🔴 **0 coincidencias encontradas**.
- **Diagnóstico:** El Brand Manager visual **NO EXISTE** en el Admin Panel. Actualmente, la creación y edición de marcas depende exclusivamente de scripts backend o Cloud Functions.

---

## 3. RESUMEN Y ACCIONES REQUERIDAS

| Componente | Estado | Brecha Principal |
|---|---|---|
| **Contrato de Datos `/brands`** | 🟢 `REAL` | Ninguna. |
| **Seguridad Firestore `/brands`** | 🟢 `REAL` | Ninguna. |
| **Web Dynamic Branding** | 🟢 `REAL` | Ninguna. |
| **Android Dynamic Theming** | 🟡 `PARTIAL` | Enlazar `BrandThemeProvider` en `MainActivity.kt`. |
| **Brand Manager (UI Admin)** | 🔴 `MISSING` | Crear módulo `brandManager.js` en `panel-admin/public/js/dashboard/` con selector de colores, preview en vivo y subida de logos a Storage. |
