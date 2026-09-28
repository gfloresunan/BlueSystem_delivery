# BSD — PLATFORM CAPABILITY MATRIX
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. MATRIZ DE CAPACIDADES PRINCIPAL

| Componente / Módulo | Existe | Implementado | Parcial | Solo Diseño | Falta | Evidencia Técnica (Archivos / Colecciones) | Nivel de Riesgo |
|---|---|---|---|---|---|---|---|
| **Tenant Engine** | Sí | 🟢 Sí | | | | `functions/src/domain/platform/models.ts`, `/tenants/{id}`, `firestore.rules:147` | 🟢 Bajo |
| **Brand Engine** | Sí | 🟢 Sí | | | | `functions/src/domain/platform/models.ts`, `/brands/{id}`, `firestore.rules:163` | 🟢 Bajo |
| **Brand Manager (UI)** | No | | | | 🔴 Sí | Falta vista en `panel-admin/public/js/dashboard/` | 🟡 Medio |
| **Subscription Engine** | Sí | 🟢 Sí | | | | `functions/src/domain/gatekeeper/gatekeeper.ts`, `tenantFeatureEngine.ts` | 🟢 Bajo |
| **Subscription Manager (UI)** | No | | | | 🔴 Sí | Falta vista en `panel-admin/public/js/dashboard/` | 🟡 Medio |
| **Feature Engine (Backend)** | Sí | 🟢 Sí | | | | `functions/src/domain/whitelabel/tenantFeatureEngine.ts` | 🟢 Bajo |
| **Feature Manager (UI)** | No | | | | 🔴 Sí | Falta control dinámico de features en Admin Web | 🟡 Medio |
| **Tenant Access Control (EIAM)** | Sí | 🟢 Sí | | | | `firestore.rules:52-78`, `functions/src/triggers/auth.ts` | 🟢 Bajo |
| **Brand Hydration (Web)** | Sí | 🟢 Sí | | | | `merchant-web/src/shared/branding/ClientExperienceProvider.tsx` | 🟢 Bajo |
| **Brand Hydration (Android)** | Sí | | 🟡 Sí | | | `app/.../whitelabel/BrandHydrationResolver.kt`, `BrandThemeProvider.kt` | 🟡 Medio |
| **Dynamic Theming (Web)** | Sí | 🟢 Sí | | | | `merchant-web/src/shared/branding/designTokenResolver.ts` | 🟢 Bajo |
| **Dynamic Theming (Android)** | Sí | | 🟡 Sí | | | Implementado en `BrandThemeProvider.kt`, pendiente enlace en `MainActivity.kt` | 🟡 Medio |
| **App Configuration Engine** | Sí | | | 🔵 Sí | | Schemas en `functions/src/domain/platform/models.ts`, valores en archivos estáticos | 🟡 Medio |
| **Android Build Manager** | No | | | | 🔴 Sí | No existe script de automatización de compilación multi-brand | 🟠 Alto |
| **Release Manager** | No | | | | 🔴 Sí | Schemas en `models.ts:231`, falta sistema de versionado y distribución | 🟡 Medio |
| **Marketplace Model (Model 01)** | Sí | 🟢 Sí | | | | `CustomerHomeScreen.kt`, `LiveOrdersView.tsx`, `HomeScreen.kt` | 🟢 Bajo |
| **Agency Model (Model 02)** | Sí | | 🟡 Sí | | | Multi-business por tenant en EIAM v3; falta selector de agencias en UI | 🟡 Medio |
| **White Label Model (Model 03)** | Sí | | 🟡 Sí | | | Soportado en Web/Backend; falta pipeline de APKs separadas en Android | 🟠 Alto |
| **Enterprise Model (Model 04)** | Sí | | | 🔵 Sí | | Modelos de cuotas en `models.ts:162`, infraestructura dedicada no implementada | 🟡 Medio |
| **Multi-Brand Web** | Sí | 🟢 Sí | | | | Inyección CSS y tokens dinámicos en runtime | 🟢 Bajo |
| **Multi-Brand Android** | Sí | | 🟡 Sí | | | Resolutor de tokens existe, falta configuración de Flavors en Gradle | 🟠 Alto |
| **Multi-Tenant Firestore** | Sí | 🟢 Sí | | | | Particionado lógico por `tenantId`, `businessId`, `branchId` | 🟢 Bajo |
| **EIAM (Auth & Claims)** | Sí | 🟢 Sí | | | | `functions/src/triggers/auth.ts`, `AuthReadyGate.js`, `TenantContext.tsx` | 🟢 Bajo |
| **Feature Enforcement Backend** | Sí | 🟢 Sí | | | | `functions/src/domain/gatekeeper/gatekeeper.ts` (Default Deny) | 🟢 Bajo |
| **Feature Enforcement UI (Web)** | Sí | 🟢 Sí | | | | `merchant-web/src/shared/gatekeeper/useGatekeeper.ts` | 🟢 Bajo |
| **Feature Enforcement UI (Android)** | Sí | | 🟡 Sí | | | `ClientExperienceConfig.kt:EntitlementDrivenNavigation`, falta enlace a BottomNav | 🟡 Medio |
| **Fleet Multi-Tenant** | Sí | 🟢 Sí | | | | `LocationTrackingService.kt`, `/ubicaciones_repartidores`, `firestore.rules:547` | 🔒 Bajo (Congelado) |
| **Notification Isolation** | Sí | 🟢 Sí | | | | `/user_devices/{uid}_{deviceId}`, `notificationQueueWorker.ts` | 🟢 Bajo |
| **Finance Isolation** | Sí | 🟢 Sí | | | | `/financial_events`, `/merchant_summaries`, `courierAccessPolicy.ts` | 🟢 Bajo |
| **Audit / Governance** | Sí | 🟢 Sí | | | | `panel-admin/public/js/dashboard/governanceCenter.js`, `/audit_events` | 🟢 Bajo |
| **Dedicated Infra Abstraction** | No | | | 🔵 Sí | | Documentado como visión técnica futura | 🟢 Bajo |

---

## 2. DESGLOSE DE CLASIFICACIÓN TÉCNICA

- 🟢 **REAL / OPERACIONAL (18/31 - 58%):** Core transaccional, Firestore multi-tenant, EIAM, Gatekeeper backend, Merchant Web Gatekeeper/Theming, Notificaciones, Finanzas, Auditoría, Flota, Marketplace.
- 🟡 **PARCIAL (7/31 - 23%):** Android Dynamic Theming, Modelo Agencia, Modelo White Label, Feature Enforcement Android, App Configuration.
- 🔵 **SOLO DISEÑO / SCHEMAS (3/31 - 10%):** Modelo Enterprise Aislado, Infraestructura Dedicada, Contratos de AppConfig/Releases.
- 🔴 **FALTA / MISSING (3/31 - 9%):** Brand Manager UI, Subscription Manager UI, Android Build & Flavors Manager.
- 🔒 **CONTRATOS CONGELADOS (5):** Fleet Core, Control Tower, X→Y Location, Transactional Email, No Auto-Rollout.
