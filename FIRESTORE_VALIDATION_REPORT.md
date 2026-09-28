# FIRESTORE VALIDATION REPORT
## Sprint 13B.1A - Restaurant Menu Core

## 📌 Summary
- **Module**: Restaurant Menu Engine v2.2 Data Layer
- **Status**: **VERIFIED & COMPLIANT**
- **Date**: July 30, 2026

---

## 🔍 Validación de Estructuras y DTOs

1. **Colección `/categories`**:
   - DTO: `CategoryDto.kt`
   - Mapeo de anotaciones `@get:PropertyName("isActive")` / `@set:PropertyName("isActive")` verificado para evitar conflictos de serialización JavaBeans en Kotlin.
   - Indexación compuesta: `whereEqualTo("restaurantId")` + `orderBy("orderIndex")`.

2. **Colección `/products`**:
   - DTO: `ProductDto.kt`
   - Campos de etiquetas secundarias `secondaryCollectionTags` deserializables como `List<String>`.
   - Mapeo de banderas booleanas (`isPopular`, `isVegetarian`, `isSpicy`, `isGlutenFree`) verificado con anotaciones `@PropertyName`.

3. **Colección `/menu_versions`**:
   - DTO: `MenuVersionDto.kt`
   - Control de versión ordenado por `whereEqualTo("restaurantId")` + `orderBy("version", DESCENDING)`.

---

## 🛠️ Cumplimiento de Reglas Firestore
- [x] Desacoplamiento total entre objetos DTO y entidades de Dominio.
- [x] Limpieza de suscripciones `addSnapshotListener` dentro de `awaitClose {}` en todos los repositorios `Flow`.
- [x] Operaciones de escritura seguras utilizando `set(dto)` y `batch()`.
