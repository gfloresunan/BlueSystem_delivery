# SPRINT 13B.1C TECHNICAL REPORT (Auditoría de Directrices de Resiliencia)
## Firestore Persistence, Synchronization & Resilience Testing

## 📌 Report Metadata
- **Sprint**: Sub-Hito 13B.1C (Audit & Hardening)
- **System**: BlueSystem Delivery Enterprise Edition (v2.2)
- **Status**: **VERIFIED & 100% COMPLIANT**
- **Date**: July 30, 2026

---

## 1. Ciclo de Vida y Flujo Completo de Publicación

El proceso de publicación en `MenuEngine` y `MenuWriteCoordinator` sigue una máquina de estados determinista:

```
  [ BUILDING / PENDING ] ──( 1. Validaciones Core )──> [ VALIDATED ]
           │                                                │
           │ (Fallo en Validaciones o Red)                   │ (2. Checksum SHA-256 Canónico)
           ▼                                                ▼
      [ FAILED ] <──────( 3. Fallo en WriteBatch )────── [ READY_TO_WRITE ]
                                                            │
                                                            │ (4. WriteBatch Atómico Exitoso)
                                                            ▼
                                                        [ PUBLISHED ]
```

### Estados Documentados:
- **`BUILDING` / `PENDING`**: Estado inicial durante el armado del árbol y validación por `ValidationEngine`.
- **`PUBLISHED`**: Estado final tras la ejecución exitosa del `WriteBatch` de 4 operaciones en Firestore (`MenuVersion`, `/menus/{restaurantId}`, y `restaurants`).
- **`FAILED`**: Estado asignado en caso de error de red, fallo de validación o conflicto de versión. El menú previo permanece intacto en producción.

---

## 2. Responsabilidad Única de Coordinación (`MenuWriteCoordinator`)

- **Principio**: `MenuWriteCoordinator` es el **único responsable** de coordinar las transacciones `WriteBatch` y escrituras en `/menus/{restaurantId}`.
- **Aislamiento**: Ningún repositorio CRUD (`MenuCategoryRepositoryImpl`, `MenuProductRepositoryImpl`) ni ViewModel contiene lógica de síntesis ni publicaciones batch relacionales.

---

## 3. Matriz de Pruebas de Resiliencia Realizadas (`MenuSyncResilienceTest.kt`)

| Escenario de Resiliencia | Tipo de Prueba | Mecanismo de Control | Estado |
| :--- | :--- | :--- | :--- |
| **Fallo de Red en Transacción** | Integración / Unit | Reintento idempotente / Retorno de `Result.failure` | **PASSED** |
| **Conflicto por Bloqueo Optimista** | Unitario | Lanzamiento de `MenuConflictException` si `localVersion <= serverVersion` | **PASSED** |
| **Documento Sintetizado Ausente** | Integración | Fallback dinámico en `MenuEngine.getPublishedMenuForCustomer` | **PASSED** |
| **Idempotencia de Checksum SHA-256** | Unitario | Verificación determinista en `CanonicalJsonChecksumHelper` | **PASSED** |
| **Transición de Estado a FAILED** | Unitario | Transición de estado a `FAILED` conservando el menú previo | **PASSED** |
| **Publicaciones Concurrentes** | Unitario | Resolución determinista rechazando el intento del segundo administrador | **PASSED** |

---

## 4. Limitaciones Operativas y Estrategia Futura (>500 Operaciones por Batch)

### Límite Actual en Firestore:
- Firestore impone un límite máximo estricto de **500 operaciones por `WriteBatch`**.
- La publicación actual realiza 3 escrituras fijas base más las listas de categorías y productos.

### Estrategia de Mitigación Prevista (Future-Proof Strategy):
1. **Validación Preventiva**: `MenuWriteCoordinator` evalúa el número total de operaciones previo al commit. Si supera 500, lanza `FirestoreBatchLimitExceededException`.
2. **Estrategia para Menús Gigantes (>500 productos)**:
   - *Chunked Multi-Batch Writes*: División de escrituras en múltiples batches encadenados mediante transacciones secuenciales.
   - *Cloud Function Offloading*: Para menús de cadenas masivas (>2,000 ítems), la publicación se delega a la Cloud Function de síntesis asíncrona (ADR-001).
