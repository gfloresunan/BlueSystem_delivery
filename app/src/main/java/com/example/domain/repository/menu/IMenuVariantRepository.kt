package com.example.domain.repository.menu

import com.example.domain.model.menu.ProductVariant
import kotlinx.coroutines.flow.Flow

/**
 * Interfaz de Repositorio de Dominio: IMenuVariantRepository (v2.2 Enterprise)
 */
interface IMenuVariantRepository {
    fun getVariantsByProductIdFlow(productId: String): Flow<List<ProductVariant>>
    suspend fun getVariantBySKU(variantKey: String): Result<ProductVariant?>
    suspend fun saveVariant(variant: ProductVariant): Result<Unit>
    suspend fun saveVariantsBatch(variants: List<ProductVariant>): Result<Unit>
    suspend fun deleteVariant(variantId: String): Result<Unit>
}
