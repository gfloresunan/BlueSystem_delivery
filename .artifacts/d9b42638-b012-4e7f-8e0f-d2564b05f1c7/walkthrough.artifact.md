# Walkthrough: Actualización de Screenshot Tests

He actualizado los tests de captura de pantalla para que utilicen pantallas reales de tu aplicación en lugar del marcador de posición `Greeting`.

## Cambios Realizados

### Configuración del Proyecto
* Se añadió la dependencia de `MockK` al proyecto para facilitar el mockeo de ViewModels y Casos de Uso.
* Se agregó un valor por defecto para `GOOGLE_MAPS_API_KEY` en `manifestPlaceholders` dentro de `app/build.gradle.kts`. Esto evita que el Manifest Merger falle durante la ejecución de tests unitarios cuando la API Key no está presente en el entorno local.

### Corrección de Tests Existentes
* Se actualizó `ExampleRobolectricTest.kt` para reflejar el nombre actual de la aplicación ("Delivery Track"), corrigiendo un fallo de aserción.

### Tests de Captura de Pantalla
* Se actualizó `GreetingScreenshotTest.kt` (ahora contiene la clase `MainScreensScreenshotTest`).
* Se implementaron dos nuevos tests:
    1. **`role_selector_screenshot`**: Captura la pantalla de selección de rol.
    2. **`splash_screen_screenshot`**: Captura la pantalla de inicio (Splash) utilizando un `SplashViewModel` mockeado.

## Archivos Modificados
* [GreetingScreenshotTest.kt](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/test/java/com/example/GreetingScreenshotTest.kt)
* [build.gradle.kts](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/build.gradle.kts)
* [libs.versions.toml](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/gradle/libs.versions.toml)

> [!TIP]
> Ahora puedes ejecutar estos tests para generar capturas de pantalla reales que reflejen el estado actual de tu UI. Esto es muy útil para detectar regresiones visuales.

> [!NOTE]
> Aunque el archivo todavía se llama `GreetingScreenshotTest.kt`, la clase interna ha sido renombrada a `MainScreensScreenshotTest`. Puedes renombrar el archivo físicamente en el IDE haciendo click derecho -> Refactor -> Rename.
