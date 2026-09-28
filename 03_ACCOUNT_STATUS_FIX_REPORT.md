# 03 — ACCOUNT STATUS FIX REPORT

**Proyecto:** BlueSystem Delivery Android  
**Componentes Modificados:**
- `app/src/main/java/com/example/eiam/domain/model/AccountStatus.kt`
- `app/src/main/java/com/example/ComercioDetalleViewModel.kt`
- `app/src/main/java/com/example/eiam/data/repository/BranchRepository.kt`
- `app/src/main/java/com/example/domain/engine/SmartBranchRouter.kt`
- `app/src/main/java/com/example/domain/engine/FleetEligibilityEngine.kt`

---

## 1. Resumen de Cambios Aplicados

### A. Dominio EIAM (`AccountStatus.kt`)
- Adición de la constante `UNKNOWN` al enum `AccountStatus`.
- Adición de la propiedad de extensión `isOperational` (`this == ACTIVE || this == OPERATIONAL`).
- Adición del método de fábrica seguro `AccountStatus.fromString(value: String?, defaultStatus: AccountStatus = ACTIVE)` que intercepta cualquier valor no contemplado sin lanzar excepciones y registra la etiqueta `[EIAM_STATUS_NORMALIZATION]`.

### B. UI ViewModel (`ComercioDetalleViewModel.kt`)
- Actualización de `parseBranchManual` para obtener el estado bruto `doc.getString("status")` y procesarlo de forma segura mediante `AccountStatus.fromString(rawStatus, defaultStatus = AccountStatus.ACTIVE)`.
- Eliminación de asignación estática fija que ignoraba estados operacionales legítimos.

### C. Capa de Datos (`BranchRepository.kt`)
- Implementación de `parseBranchSafely(doc: DocumentSnapshot): Branch?` que encapsula la deserialización.
- Reemplazo de llamadas directas y frágiles a `snapshot.toObjects(Branch::class.java)` por mapeos iterativos seguros `snapshot.documents.mapNotNull { parseBranchSafely(it) }`.
- Garantiza que la existencia de un solo documento con formato inesperado no tumbe la consulta ni devuelva listas vacías.

### D. Motores de Negocio (`SmartBranchRouter.kt` & `FleetEligibilityEngine.kt`)
- Actualización de filtros de sucursales activas de `it.status == AccountStatus.ACTIVE` a `it.status.isOperational` (aplica para `ACTIVE` y `OPERATIONAL`).
- Garantiza que sucursales en estado `OPERATIONAL` (como **FRITONI**) sean reconocidas como operativas para enrutamiento de pedidos y validación de flota.
