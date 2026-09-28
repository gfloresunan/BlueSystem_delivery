# BSD-ACT21-FORENSIC-PREFLIGHT
## Preflight Forense de Infraestructura y Modelos Preexistentes
**Protocol ID:** `BSD-ACT21-BRAND-MANAGER-COMMERCIAL-FOUNDATION-001`  

---

### 1. Modelos Preexistentes Auditados
- `BrandEntity` en `functions/src/domain/platform/models.ts`: Define `brandId`, `tenantId`, `displayName`, `shortName`, `slug`, `visual`, `metadata`, `status`.
- `BrandVisualConfig`: Define `logoUrl`, `iconUrl`, `splashUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `textColor`, `fontFamily`.
- `BrandHydrationResolver.kt` & `BrandThemeProvider.kt`: Existen en `app/src/main/java/com/example/whitelabel/`.

### 2. Estado de Colecciones y Rutas
- Colección `/brands`: Existente en Firestore con reglas públicas de lectura y control administrativo de escritura.
- Bucket de Storage `/brands/{brandId}/{fileName}`: Configurado con control admin y validación de tipos.
- Rutas del Admin Web: SPA modular con arquitectura de `AuthReadyGate`.

### 3. Conclusión de Preflight
Infraestructura base 100% compatible y lista para el consumo sin necesidad de duplicación de contratos.
