# C2D25D — BUILD-TIME VS RUNTIME AUDIT
## Protocol ID: `BSD-C2D25D-MULTI-BRAND-BUILD-FACTORY-READINESS-001`

---

### 1. Matriz de Distribución: Build-Time vs Runtime

| Elemento de Configuración | Clasificación | Justificación Técnica |
|---|---|---|
| **Application ID (`package`)** | **BUILD-TIME** | Requisito fundamental del SO Android y Google Play. |
| **App Name (OS Display)** | **BUILD-TIME** | Definido en `AndroidManifest.xml` vía `@string/app_name`. |
| **Version Name & Build Number** | **BUILD-TIME** | Gestión de versiones en `build.gradle.kts`. |
| **Launcher Icon & Adaptive Icon** | **BUILD-TIME** | Empaquetado estático en APK en `res/mipmap-*/`. |
| **Splash Screen Icon** | **BUILD-TIME** | Requerido por `Theme.App.Starting` en el arranque del SO. |
| **Primary & Secondary Colors** | **RUNTIME** | Inyectados dinámicamente en el tema Compose desde `BrandEntity`. |
| **Logos & Banners Comerciales** | **RUNTIME** | Descargados asíncronamente desde Firebase Storage vía Coil. |
| **Typography & Theme Style** | **RUNTIME** | Hidratados en tiempo de ejecución según `BrandEntity.themeConfig`. |
| **Feature Flags / Módulos Activos**| **RUNTIME** | Evaluados por Gatekeeper según Entitlements y Plan de Suscripción. |
| **Tenant ID & Dominio** | **BOTH** | Default embebido en AppConfig y resuelto/validado en Runtime. |
| **Google Maps API Key** | **BUILD-TIME** | Declarado en `AndroidManifest.xml` (meta-data). |
| **Firebase Project & App ID** | **BUILD-TIME** | Generado por plugin `google-services` en build-time. |
| **FCM Channel ID** | **BUILD-TIME** | Meta-data de notification channel en `AndroidManifest.xml`. |

---

### 2. Regla Arquitectónica de Minimización de Builds
```text
COSMETIC / OPERATIONAL CONFIGURATION ───► RUNTIME HYDRATION (0 Rebuilds)
OS IDENTITY / SIGNING / COMPILER PLUGINS ───► BUILD-TIME (Controlled Physical Build)
```
