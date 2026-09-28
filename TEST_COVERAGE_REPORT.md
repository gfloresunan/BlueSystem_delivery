# TEST COVERAGE REPORT
## Sprint 13B.1A - Restaurant Menu Core

## 📌 Summary
- **Target Module**: Restaurant Menu Core v2.2
- **Unit Test Execution**: `gradlew testDebugUnitTest`
- **Build Status**: **SUCCESSFUL**
- **Test Pass Rate**: **100% (7/7 Suites Passed)**

---

## 📊 Cobertura por Paquete de Componentes

| Componente Auditado | Clase de Prueba | Casos de Prueba | Cobertura Estimada | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Entidad MenuCategory** | `MenuCategoryTest.kt` | 1 | 100% de campos base | PASSED |
| **Entidad MenuProduct** | `MenuProductTest.kt` | 1 | 100% de campos y helper de precio | PASSED |
| **Entidad MenuVersion** | `MenuVersionTest.kt` | 1 | 100% de inicialización de versión | PASSED |
| **Checksum SHA-256 Canónico**| `CanonicalJsonChecksumHelperTest.kt` | 2 | 100% determinismo y sensibilidad a cambios | PASSED |
| **Mappers DTO <-> Domain** | `MenuMapperTest.kt` | 2 | 100% conversión bidireccional | PASSED |
| **LegacyMenuAdapter** | `LegacyMenuAdapterTest.kt` | 2 | 100% compatibilidad con modelo legado | PASSED |
| **MenuCoreValidator** | `MenuCoreValidatorTest.kt` | 2 | 100% validación de campos requeridos | PASSED |

---

## 🧪 Detalle de Asserts Clave
1. `CanonicalJsonChecksumHelperTest`: Confirma que el orden inicial de los elementos en la lista no altera el SHA-256 generado (canónico).
2. `LegacyMenuAdapterTest`: Confirma que un `MenuProduct` v2.2 mapeado a `com.example.domain.model.Product` conserva su `price`, `formattedPrice`, `imageUrl` y `status` sin romper la interfaz de usuario existente.
