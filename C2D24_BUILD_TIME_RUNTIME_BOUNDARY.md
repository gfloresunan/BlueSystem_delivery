# C2D24 — BUILD-TIME VS RUNTIME BOUNDARY
## Matriz de Límites entre Tiempo de Compilación y Tiempo de Ejecución
**Protocol ID:** `C2D.24`  

---

### 1. Clasificación Exhaustiva de Campos

| Campo de Configuración | Build-Time (APK) | Runtime (Firestore) | Release-Time | Inmutable Post-Release |
|---|:---:|:---:|:---:|:---:|
| `applicationId` / Package Name | 🟢 SÍ | — | — | 🔒 SÍ (Inmutable) |
| `versionCode` / `buildNumber` | 🟢 SÍ | — | — | 🔒 SÍ (Inmutable) |
| `versionName` | 🟢 SÍ | — | — | 🔒 SÍ (Inmutable) |
| Launcher Icon (`res/mipmap`) | 🟢 SÍ | — | — | — (Actualizable vía build) |
| Launcher App Name (`app_name`) | 🟢 SÍ | — | — | — (Actualizable vía build) |
| `google-services.json` (OAuth/Keys)| 🟢 SÍ | — | — | 🔒 SÍ (Crítico para Auth) |
| Maps API Key (Manifest) | 🟢 SÍ | — | — | — |
| Brand Primary / Secondary Color | ⚪ Default | 🟢 SÍ (Hydration) | — | 🔄 Mutable dinámico |
| Brand Logo / Splash URL | ⚪ Default | 🟢 SÍ (Coil Async)| — | 🔄 Mutable dinámico |
| Subscription Entitlements | ⚪ Default | 🟢 SÍ (Gatekeeper) | — | 🔄 Mutable dinámico |
| Feature Flags de App | ⚪ Default | 🟢 SÍ (AppConfig) | — | 🔄 Mutable dinámico |
| Client Experience Config | — | 🟢 SÍ (Firestore) | — | 🔄 Mutable dinámico |
