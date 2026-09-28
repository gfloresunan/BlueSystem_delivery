# PRODUCT WIZARD TEST PLAN SPECIFICATION
**BlueSystem Delivery Enterprise v2.1**

---

## 1. Suite de Pruebas Unitarias Implementadas

Se implementaron **10 Clases de Prueba Unitarias** bajo la ruta `app/src/test/java/com/example/catalog/`:

| Clase de Prueba | Objetivo y Cobertura |
| :--- | :--- |
| `ProductWizardViewModelTest.kt` | Verifica la inicialización del asistente, navegación por pasos (1-6) y adición de grupos de opciones y adicionales. |
| `GalleryEngineTest.kt` | Prueba el conteo de fotos, selección de portada y eliminación de imágenes de la galería. |
| `VariantPersistenceTest.kt` | Valida la integridad estructural de las entidades `MenuOptionGroup` e `OptionItem`. |
| `DraftRecoveryTest.kt` | Comprueba la serialización y restauración del objeto `ProductDraft`. |
| `ValidationEngineTest.kt` | Evalúa las validaciones en tiempo real para nombre obligatorio y error de precio anterior menor al actual. |
| `PriceCalculatorTest.kt` | Valida el cálculo matemático de porcentajes de descuento y formato de moneda. |
| `ImageCompressionTest.kt` | Verifica que el servicio de compresión `ImageCompressionEngine` retorne arreglos de bytes procesados. |
| `PreviewEngineTest.kt` | Comprueba la conmutación de estado del modo claro/oscuro en la vista previa del cliente. |
| `OfflineSyncTest.kt` | Evalúa la coherencia de los enums `ProductStatus` en operaciones offline. |
| `FirestoreRepositoryTest.kt` | Verifica el mapeo de campos de la entidad `Product` para la persistencia en Firestore. |

---

## 2. Comando para Ejecución de Pruebas

```powershell
.\gradlew testDebugUnitTest --tests "com.example.catalog.*"
```
