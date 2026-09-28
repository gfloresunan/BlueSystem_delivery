package com.example.domain.engine.menu

import com.example.domain.model.menu.ProductSize
import com.example.domain.model.menu.ProductVariant
import com.example.domain.model.menu.ProductVariantStatus
import com.example.domain.model.menu.VariantDimension

interface IVariantMatrixEngine {
    fun generateVariantMatrix(
        productId: String,
        restaurantId: String,
        sizes: List<ProductSize>,
        dimensions: List<VariantDimension>,
        basePrice: Double
    ): List<ProductVariant>
}

/**
 * Servidor de Dominio: VariantMatrixEngineImpl (Sprint 13B.3B)
 *
 * MITIGACIÓN DE EXPLOSIÓN COMBINATORIA (Precondición 1):
 * Genera el producto cartesiano de tamaños x dimensiones utilizando caché determinista
 * de claves para evitar recalculaciones repetitivas.
 */
class VariantMatrixEngineImpl : IVariantMatrixEngine {

    private val matrixCache = mutableMapOf<String, List<ProductVariant>>()

    override fun generateVariantMatrix(
        productId: String,
        restaurantId: String,
        sizes: List<ProductSize>,
        dimensions: List<VariantDimension>,
        basePrice: Double
    ): List<ProductVariant> {
        val cacheKey = "$productId-$restaurantId-${sizes.hashCode()}-${dimensions.hashCode()}-$basePrice"
        matrixCache[cacheKey]?.let { return it }

        val effectiveSizes = if (sizes.isEmpty()) listOf(null) else sizes
        val dimensionCombinations = cartesianProductDimensions(dimensions)

        val resultVariants = mutableListOf<ProductVariant>()

        for (size in effectiveSizes) {
            for (dimMap in dimensionCombinations) {
                val variantKey = VariantKeyGenerator.generateVariantKey(productId, size, dimMap)
                val priceAdjustment = size?.priceAdjustment ?: 0.0
                val calculatedPrice = (basePrice + priceAdjustment) * (size?.priceMultiplier ?: 1.0)

                val variant = ProductVariant(
                    id = variantKey,
                    productId = productId,
                    restaurantId = restaurantId,
                    size = size,
                    dimensionValues = dimMap,
                    variantKey = variantKey,
                    priceOverride = calculatedPrice,
                    status = ProductVariantStatus.ACTIVE
                )
                resultVariants.add(variant)
            }
        }

        matrixCache[cacheKey] = resultVariants
        return resultVariants
    }

    private fun cartesianProductDimensions(dimensions: List<VariantDimension>): List<Map<String, String>> {
        if (dimensions.isEmpty()) return listOf(emptyMap())

        var acc = listOf<Map<String, String>>(emptyMap())

        for (dim in dimensions) {
            if (dim.options.isEmpty()) continue
            val nextAcc = mutableListOf<Map<String, String>>()
            for (existingMap in acc) {
                for (optionValue in dim.options) {
                    val newMap = existingMap.toMutableMap()
                    newMap[dim.name] = optionValue
                    nextAcc.add(newMap)
                }
            }
            acc = nextAcc
        }

        return acc
    }
}
