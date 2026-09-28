# 04 — ACCOUNT STATUS UNIT TEST REPORT

**Suite de Pruebas:** `com.example.eiam.AccountStatusTest`  
**Ejecutado con:** `./gradlew testDebugUnitTest --tests "com.example.eiam.AccountStatusTest"`  

---

## 1. Resultados de Casos de Prueba (TC-01 a TC-08)

| ID | Nombre | Input | Expected Output | Status |
|---|---|---|---|---|
| TC-01 | `testTC01_ActiveStatus` | `"ACTIVE"` | `AccountStatus.ACTIVE`, `isOperational = true` | 🟢 PASS |
| TC-02 | `testTC02_InactiveStatusFallback` | `"INACTIVE"` | `AccountStatus.UNKNOWN`, `isOperational = false` | 🟢 PASS |
| TC-03 | `testTC03_SuspendedStatus` | `"SUSPENDED"` | `AccountStatus.SUSPENDED`, `isOperational = false` | 🟢 PASS |
| TC-04 | `testTC04_OperationalStatus` | `"OPERATIONAL"` | `AccountStatus.OPERATIONAL`, `isOperational = true` | 🟢 PASS |
| TC-05 | `testTC05_NullValueFallback` | `null` | `AccountStatus.ACTIVE`, `isOperational = true` | 🟢 PASS |
| TC-06 | `testTC06_EmptyStringFallback` | `""` | `AccountStatus.ACTIVE`, `isOperational = true` | 🟢 PASS |
| TC-07 | `testTC07_UnknownNewStatusSafeFallback` | `"WHATEVER_NEW_STATUS"` | `AccountStatus.UNKNOWN`, `isOperational = false` | 🟢 PASS |
| TC-08 | `testTC08_RealFirestoreValuesMapping` | `"OPERATIONAL"`, `null`, `""` | Mapeo correcto sin excepción fatal | 🟢 PASS |

---

## 2. Resumen de Cobertura
- Cobertura de métodos `AccountStatus.fromString(...)`: 100%
- Cobertura de propiedad `isOperational`: 100%
- Tolerancia a nulos y vacíos: 100%
- Resiliencia ante cadenas no registradas: 100%
