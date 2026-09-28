# 11. Evidence Index: Test Suites & Logs

## Protocolo: BSD-AI-ASSISTANT-E2E-CERTIFICATION-001

### 1. Suites de Pruebas Ejecutadas y Aprobadas

```bash
./gradlew testDebugUnitTest \
  --tests "com.example.domain.engine.intelligence.EnterpriseSearchEngineTest" \
  --tests "com.example.domain.ai.LocalToolExecutionAndSecurityTest" \
  --tests "com.example.presentation.customer.ai.CustomerAIAgentViewModelTest" \
  --tests "com.example.domain.ai.CustomerAIE2ECertificationTest"
```
**Resultado:** `BUILD SUCCESSFUL` (100% de tests aprobados).

### 2. Compilación de Release/Debug APK

```bash
./gradlew assembleDebug
```
**Resultado:** `BUILD SUCCESSFUL` en 1m 47s (APK generado íntegramente).

---

### 3. Índice de Casos de Prueba Automatizados

1. **`EnterpriseSearchEngineTest.kt`** (18 tests):
   - Scoring por títulos, categorías, tokens, comercios, descuentos, ordenamiento barato (`price ASC`), y descubrimiento genérico de restaurantes.
2. **`LocalToolExecutionAndSecurityTest.kt`** (14 tests):
   - Cero IDs en sanitización, dispatching local seguro, verificación de autorización y manejo de errores.
3. **`CustomerAIAgentViewModelTest.kt`** (11 tests):
   - Ciclo de vida conversacional, gate de confirmación de órdenes, y resolución contextual inmediata.
4. **`CustomerAIE2ECertificationTest.kt`** (16 tests):
   - Validación E2E formal de los 16 casos maestros AI-E2E-001 a AI-E2E-016 sobre modelos y adaptadores canónicos.
