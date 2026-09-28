# BSD — ANDROID WHITE-LABEL READINESS & BUILD ENGINE AUDIT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. EVALUACIÓN DE WHITE-LABEL EN ANDROID

### A. Dependencias Hardcodeadas Actuales

| Elemento | Ubicación en Código | Estado Actual | Solución Arquitectónica Requerida |
|---|---|---|---|
| **App Name** | `app/src/main/res/values/strings.xml:2` | Hardcoded: `"BlueSystem Delivery"` | Inyectar vía `manifestPlaceholders["appName"]` o strings por Flavor |
| **Application ID** | `app/build.gradle.kts:22` | Hardcoded: `"com.aistudio.delivery.djweq"` | Inyectar sufijos de paquete por `productFlavors` |
| **Google Maps API Key** | `app/build.gradle.kts:37` | Fallback hardcoded | Inyectar por `.env` / `local.properties` por Flavor |
| **Facebook App ID** | `app/src/main/res/values/strings.xml:3` | Hardcoded: `"979190771774021"` | Inyectar por Flavor o configuración remota |
| **Logotipos e Iconos** | `app/src/main/res/mipmap/` | Assets estáticos de BlueSystem | Resource Overlays por Flavor (`src/marketplace/`, `src/fitoni/`) |
| **Firebase Config** | `google-services.json` | Configuración para `bluesystem-7c9af` | Estructurar carpetas por Flavor (`app/src/fitoni/google-services.json`) |
| **Dynamic Colors** | `BrandHydrationResolver.kt` | Implementado en Kotlin Compose | Enlazar `BrandThemeProvider` en `MainActivity.kt` |

---

## 2. AUDITORÍA DE GRADLE Y PRODUCT FLAVORS

### A. Estado Actual en `app/build.gradle.kts`
- **Flavors:** 🔴 `INEXISTENTES`. Actualmente solo existen `buildTypes { release, debug }`.
- **Compilación Multi-Tenant:** Imposible sin modificar el archivo manualmente antes de compilar.

### B. Diseño Requerido (Sin Modificar Todavía)
```kotlin
android {
    flavorDimensions += listOf("brand", "distribution")
    
    productFlavors {
        create("marketplace") {
            dimension = "brand"
            applicationId = "com.aistudio.delivery.djweq"
            manifestPlaceholders["appName"] = "BlueSystem Delivery"
        }
        create("fitoni") {
            dimension = "brand"
            applicationId = "com.fitoni.delivery.express"
            manifestPlaceholders["appName"] = "Fitoni Express"
        }
    }
}
```

### C. Esfuerzo de Implementación y Riesgos
- **Esfuerzo:** 🟡 Medio (2-3 días de trabajo estructurado de configuración Gradle y estructura de carpetas de recursos `src/<flavor>/res`).
- **Riesgo:** 🟢 Bajo (No altera la lógica de negocio de los ViewModels, Repositories ni Compose Screens existentes).
- **Compatibilidad con Código Congelado:** 100% compatible. No toca ni altera los componentes blindados de GPS, Fleet Core ni X→Y.

---

## 3. COMPATIBILIDAD CON FUTURO CLIENTE IOS
- **Evaluación:** Los contratos de API, Firestore Collections, Webhooks y Schemas de datos son 100% agnósticos de plataforma.
- **Conclusión:** La arquitectura actual soporta plenamente la integración de un cliente iOS futuro en Swift/SwiftUI consumiendo exactamente las mismas Cloud Functions y reglas de seguridad de Firestore.
