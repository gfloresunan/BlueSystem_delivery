# C2D25E.1 — LAUNCHER & SPLASH CLOSURE AUDIT
## Protocol ID: `BSD-C2D25E1-EXTERNAL-PROVISIONING-HARDENING-CLOSURE-001`

---

### 1. Inspección de Recursos de Launcher y Splash

1. **Launcher Icons (Core Baseline):**
   - `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
   - `app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`
   - Configurados con background y foreground estáticos de BlueSystem.
2. **Splash Screen (Android 12+ API):**
   - `app/src/main/res/values/themes.xml`:
     - `Theme.App.Starting` utiliza `windowSplashScreenAnimatedIcon` apuntando a `@drawable/bluesystem_logo`.
     - `windowSplashScreenBackground` apunta a `@color/splash_background`.

---

### 2. Estado de Cierre para Multi-Marca

- **Situación Actual:**
  - El core funciona perfectamente con la identidad de BlueSystem.
  - Para una segunda marca (ej. Fitoni Express), si se compilara sin overlay, el APK mostraría el splash y launcher de BlueSystem.
- **Validación Estática:**
  - Se requiere que el pipeline transitorio de assets provea un reemplazo determinístico de estos drawables en `build/generated/res/brandAssets/`.
- **Estado GAP-BA-01 (Launcher & Splash):** 🔴 **OPEN / PARTIALLY DESIGNED**.
