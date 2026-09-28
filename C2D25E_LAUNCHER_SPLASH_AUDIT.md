# C2D25E — LAUNCHER & SPLASH AUDIT
## Protocol ID: `BSD-C2D25E-MULTI-BRAND-BUILD-FACTORY-HARDENING-001`

---

### 1. Auditoría de Recursos de Arranque y Launcher

- **Launcher Icons:** Declarados en `AndroidManifest.xml` como `@mipmap/ic_launcher` y `@mipmap/ic_launcher_round`.
- **Adaptive Icon XML:** En `app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` (utiliza `<background>` y `<foreground>`).
- **Splash Screen API (Android 12+):** Definido en `app/src/main/res/values/themes.xml`:
  ```xml
  <style name="Theme.App.Starting" parent="Theme.SplashScreen">
      <item name="windowSplashScreenBackground">@color/splash_background</item>
      <item name="windowSplashScreenAnimatedIcon">@drawable/bluesystem_logo</item>
      <item name="postSplashScreenTheme">@style/Theme.MyApplication</item>
  </style>
  ```

---

### 2. Diseño del Hardening para Multi-Marca
1. **Separación de Icono de Splash:** Parametrizar el drawable de splash mediante overlays de recursos (`resValue` o sourceSets temporales por brand).
2. **Generador Determinista de Mipmaps:** Generar mipmaps (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) a partir del logo vectorial de la marca previo a la compilación.
3. **Validación Pre-Vuelo:** Validar dimensiones (ej. 512x512 PNG/SVG), relación de aspecto y formato antes de permitir el arranque de Gradle.
