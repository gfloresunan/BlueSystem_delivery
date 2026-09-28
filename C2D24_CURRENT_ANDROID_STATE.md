# C2D24 — CURRENT ANDROID STATE
## Estado Detallado del Subsistema Android
**Protocol ID:** `C2D.24`  

---

### 1. Inventario Técnico Completo

1. **Gradle Build System:**
   - Kotlin DSL (`build.gradle.kts`).
   - Android Gradle Plugin: `9.1.1`.
   - Toolchains JDK: Java 11 con `coreLibraryDesugaring` (`desugar_jdk_libs:2.1.4`).
   - Compose habilitado con Jetpack Compose BOM `2024.09.00`.

2. **Identidad de Aplicación Actual:**
   - Package Name / Application ID: `com.aistudio.delivery.djweq`.
   - App Name en strings.xml: `BlueSystem Delivery`.

3. **Integración con Servicios Externos:**
   - **Firebase:** Inicializado automáticamente mediante el plugin `google.services` (versión 4.5.0).
   - **Google Maps:** Clave inyectada a través de `manifestPlaceholders["GOOGLE_MAPS_API_KEY"]`.
   - **Facebook SDK:** Metadatos configurados en `AndroidManifest.xml` vía `@string/facebook_app_id`.
   - **FCM:** `DeliveryFirebaseMessagingService` atado al canal `order_status_channel`.

4. **Integración de Marca y Tokens:**
   - `MainActivity.kt` envuelve su árbol Compose con `BrandThemeProvider(LocalBrandTokens)`.
   - `BrandHydrationResolver` resuelve en tiempo de ejecución los colores y tokens visuales de Firestore.
