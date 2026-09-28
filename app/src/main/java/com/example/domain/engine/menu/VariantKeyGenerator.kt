package com.example.domain.engine.menu

import com.example.domain.model.menu.ProductSize

/**
 * Generador Determinista de Clave/SKU de Variante (VariantKeyGenerator - Sprint 13B.3B)
 *
 * REGLA DE NEGOCIO (Precondición 2):
 * Produce un identificador inmutable y determinista para cada combinación de Variante
 * independientemente del orden en que se especifiquen las dimensiones.
 * Formato: var_{productId}_{sizeId}_{dimKey1=val1}_{dimKey2=val2}...
 */
object VariantKeyGenerator {

    fun generateVariantKey(
        productId: String,
        size: ProductSize?,
        dimensionValues: Map<String, String>
    ): String {
        val cleanProdId = productId.trim().lowercase()
        val sizeSegment = size?.id?.ifBlank { size.name.trim().lowercase() } ?: "nosize"

        val sortedDimensionsSegment = dimensionValues.entries
            .sortedBy { it.key.trim().lowercase() }
            .joinToString(separator = "_") { (key, value) ->
                "${key.trim().lowercase().replace(" ", "")}=${value.trim().lowercase().replace(" ", "")}"
            }

        return if (sortedDimensionsSegment.isBlank()) {
            "var_${cleanProdId}_$sizeSegment"
        } else {
            "var_${cleanProdId}_${sizeSegment}_$sortedDimensionsSegment"
        }
    }
}
