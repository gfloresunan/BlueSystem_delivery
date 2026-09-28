# BSD — GAP ANALYSIS & BLOCKERS REPORT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 GAP ANALYSIS`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. MATRIZ DE BRECHAS ESTRATÉGICAS

```
OBJETIVO COMERCIAL                    ESTADO EN CÓDIGO                     BRECHA / GAP PRINCIPAL
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
1. BLUE SYSTEM MARKETPLACE             🟢 100% REAL / OPERACIONAL           Ninguna brecha crítica. Multi-comercio,
   (Multi-comercio en app común)                                            catálogo, carrito, checkout, tracking.

2. BLUE SYSTEM AGENCY                  🟡 65% PARCIAL                       Modelos de datos y EIAM v3 soportan
   (Agencia con N comercios y marca)                                        agencias, pero falta consola para que la
                                                                            agencia conmute entre comercios sin rol global.

3. WHITE LABEL COMMERCE                🟡 50% PARCIAL                       Backend y Web son dinámicos; falta
   (App Android y Web propia)                                               Brand Manager UI, Android Flavors en Gradle
                                                                            y generación de APKs customizadas.

4. ENTERPRISE DELIVERY                 🔵 30% DISEÑADO / SCHEMAS            Modelos de cuotas y contratos definidos;
   (Grandes cuentas / multi-sucursal)                                       falta integración con infraestructura
                                                                            aislada / bases de datos dedicadas.
```

---

## 2. DETALLE DE BRECHAS POR SUBSISTEMA

### A. Tenant & Brand Management (Admin Web)
- **Brecha:** No existe módulo visual en `panel-admin` para que un operador cree una nueva marca, suba su logotipo a Google Cloud Storage, elija su paleta HSL/HEX y la asocie a un Tenant.
- **Impacto:** Las marcas hoy en día solo pueden crearse mediante scripts de aprovisionamiento en TypeScript (`provisioningPipeline.ts`).
- **Nivel de Riesgo:** 🟡 Medio (Falta de autoservicio visual, pero seguridad backend garantizada).

### B. Subscription & Entitlement Engine (Admin Web & Backend)
- **Brecha:** Los planes (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`) y sus capacidades están codificados en `tenantFeatureEngine.ts` y evaluados en `gatekeeper.ts`. Falta el CRUD administrativo en `panel-admin` y la integración con pasarelas de cobro recurrente B2B.
- **Impacto:** Los cambios de plan se gestionan a nivel de datos Firestore o aprovisionamiento manual.
- **Nivel de Riesgo:** 🟡 Medio.

### C. Android Multi-Brand Build System
- **Brecha:** `app/build.gradle.kts` solo define un `applicationId` (`com.aistudio.delivery.djweq`) y no tiene configurados `productFlavors` (ej: `flavorDimensions += "brand"` con `flavor_marketplace`, `flavor_fitoni`, etc.).
- **Impacto:** No es posible compilar simultáneamente la APK de BlueSystem Marketplace y la APK de Fitoni Express desde el mismo codebase sin modificar manualmente el archivo Gradle.
- **Nivel de Riesgo:** 🟠 Alto (Requiere refactor de build script sin tocar el código fuente funcional de Compose).

### D. Android Runtime Dynamic Theming
- **Brecha:** Aunque `BrandHydrationResolver.kt` y `BrandThemeProvider.kt` están implementados en el paquete `com.example.whitelabel`, `MainActivity.kt` aún inicializa con `MyApplicationTheme` de forma estática.
- **Impacto:** La app Android no cambia sus colores en runtime si un comercio White-Label inicia sesión.
- **Nivel de Riesgo:** 🟢 Bajo (Hotfix menor para envolver el árbol Compose con `BrandThemeProvider`).

### E. Conexión de Dominio Web (Multi-Tenant Routing)
- **Brecha:** `functions/src/domain/whitelabel/tenantDomainResolver.ts` y los callables de `domainManagement.ts` están implementados, pero Firebase Hosting requiere mapeo de dominios personalizados en Firebase Console.
- **Impacto:** Los dominios personalizados requieren configuración DNS y registro en Firebase Hosting.
- **Nivel de Riesgo:** 🟢 Bajo.

---

## 3. BLOQUEADORES PARA LA TRANSFORMACIÓN COMERCIAL

| Bloqueador ID | Descripción | Dependencia Previa | Severidad |
|---|---|---|---|
| **BLK-01** | Inexistencia de Brand Manager UI en Admin Web | Subir assets a Cloud Storage | 🟡 Media |
| **BLK-02** | Inexistencia de Subscription Manager UI en Admin Web | Contratos de planes en Firestore | 🟡 Media |
| **BLK-03** | Falta de Product Flavors en `app/build.gradle.kts` | Estructura de assets de recursos Android | 🟠 Alta |
| **BLK-04** | Falta de pipeline de CI/CD para compilación de APKs White-Label | Keystores y Secrets por marca | 🟠 Alta |
| **BLK-05** | Certificación C2D.22 pendiente (Observación de los 3 Tenants actuales) | Estabilidad de producción | 🔒 Bloqueante Regulatorio |
