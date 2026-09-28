# Plan de Implementación: Actualización de Tests de Captura de Pantalla

Este plan detalla la actualización de los tests de captura de pantalla para utilizar pantallas reales de la aplicación en lugar de marcadores de posición (`Greeting`).

## Cambios Propuestos

### Componente de Testing

#### [MODIFY] [GreetingScreenshotTest.kt](file:///C:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/test/java/com/example/GreetingScreenshotTest.kt)
* Renombrar el archivo a `MainScreensScreenshotTest.kt` para reflejar mejor su contenido.
* Eliminar la referencia a `Greeting`.
* Añadir un test para `RoleSelectorScreen`.
* Añadir un test para `SplashScreen`.

## Detalles Técnicos

### RoleSelectorScreen Test
* Esta pantalla es ideal para tests de captura de pantalla ya que es mayormente estática y fácil de instanciar.
* Se proporcionará un callback vacío para `onRoleSelected`.

### SplashScreen Test
* Requiere un `SplashViewModel`. Se intentará instanciar con dependencias mínimas o mocks si es necesario para asegurar la predictibilidad del test.

## Plan de Verificación

### Tests Automatizados
* Ejecutar los tests de captura de pantalla utilizando el comando de Roborazzi (gradle task correspondiente, usualmente `recordRoborazziDebug`).
* Verificar que se generen los archivos de imagen en `src/test/screenshots/`.

### Verificación Manual
* Revisar las imágenes generadas para asegurar que las pantallas se renderizan correctamente según el diseño.
