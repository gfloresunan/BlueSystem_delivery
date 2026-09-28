# 03. Informe de Corrección en ProductRepository

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Archivo Modificado:** `app/src/main/java/com/example/data/repository/ProductRepository.kt`  
**Estatus:** 🟢 APLICADO Y VERIFICADO  

---

## 1. Descripción de Cambios

Se actualizó la lógica de deserialización y parseo de productos en `ProductRepository.kt` para integrar las 5 fuentes posibles dentro de Firestore y aplicar la resolución multicampo de categorías sin alterar los datos originales.

---

## 2. Fragmento de Código Aplicado

```kotlin
    private fun parseAndFilterProducts(documents: List<com.google.firebase.firestore.DocumentSnapshot>): List<Product> {
        return documents.mapNotNull { doc ->
            try {
                val statusStr = doc.getString("status") ?: ""
                val lifecycleStatusStr = doc.getString("lifecycleStatus") ?: ""
                if (statusStr.equals("DELETED", ignoreCase = true) || lifecycleStatusStr.equals("DELETED", ignoreCase = true)) {
                    return@mapNotNull null
                }
                if (statusStr.equals("INACTIVE", ignoreCase = true)) {
                    return@mapNotNull null
                }

                val isActive = getBooleanValue(doc, "active", "isActive")
                val isAvail = getBooleanValue(doc, "isAvailable", "available")
                if (isActive == false || isAvail == false) return@mapNotNull null

                val catNameDoc = doc.getString("categoryName")
                    ?: doc.getString("categoria")
                    ?: doc.getString("category")
                    ?: "Menú Principal"

                var p: Product? = null
                try {
                    p = doc.toObject(Product::class.java)?.copy(
                        id = doc.id,
                        categoryName = catNameDoc
                    )
                } catch (e: Exception) {
                    Log.w(TAG, "Error en des-serialización directa de producto ${doc.id}, ejecutando parseo manual: ${e.message}")
                }

                if (p == null || p.categoryName.isBlank()) {
                    p = parseProductManual(doc).copy(categoryName = catNameDoc)
                }
                p
            } catch (e: Exception) {
                Log.e(TAG, "Error al deserializar producto ${doc.id}: ${e.message}")
                null
            }
        }
    }
```

---

## 3. Garantías de Calidad

1. **Sin Parches Visuales:** El producto recupera su categoría real desde Firestore.
2. **Resiliencia ante Nulos:** `getBooleanValue` y `getDoubleValue` convierten automáticamente cadenas, enteros y flotantes.
3. **Puntuación de Coincidencia de Sucursales:** Soporta productos globales de comercio (`branchId` vacío) o asignados a sucursales específicas mediante `branchAvailability`.
