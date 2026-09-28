# 11. Manifiesto Completo de Cambios (Change Manifest)

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Fecha:** 17 de Agosto, 2026  
**Ámbito de Corrección:** Mapeo de Productos y Persistencia Real de Reseñas  

---

## 1. Archivos Modificados en el Repositorio

| Archivo | Tipo de Cambio | Justificación Técnica |
| :--- | :--- | :--- |
| `app/src/main/java/com/example/data/repository/ProductRepository.kt` | Modificación | Extrae `categoryName` evaluando `categoryName`, `categoria` y `category` en Firestore para evitar que los productos queden descartados. |
| `app/src/main/java/com/example/ComercioDetalleViewModel.kt` | Modificación | Implementa `submitReview` con confirmación síncrona `set().await()` en Firestore, elimina Optimistic UI engañoso y protege `loadBranches` ante enums desconocidos. |
| `app/src/main/java/com/example/FirebaseManager.kt` | Modificación | Conecta `listenToFeaturedProducts` directamente con la colección `/products` para nutrir la pantalla de inicio con productos reales. |
| `app/src/main/java/com/example/Models.kt` | Modificación | Agrega campos `branchId`, `uid`, `authorName` al modelo `CommerceReview` y registra `AccountStatus.OPERATIONAL`. |

---

## 2. Archivos Integros (Sin Modificación)

- `merchant-web/*` (Cero cambios)
- `functions/*` (Cero cambios)
- Firestore Rules (`firestore.rules`) (Cero cambios)
- `MainActivity.kt` (Cero cambios)
- `CustomerHomeScreen.kt` (Cero cambios)
- `CustomerHelpScreen.kt` (Cero cambios)
