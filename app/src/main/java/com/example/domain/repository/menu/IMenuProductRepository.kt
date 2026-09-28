package com.example.domain.repository.menu

import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import kotlinx.coroutines.flow.Flow

interface IMenuProductRepository {
    fun getProductsFlow(restaurantId: String): Flow<List<MenuProduct>>
    fun getProductsByCategoryFlow(restaurantId: String, categoryId: String): Flow<List<MenuProduct>>
    fun getProductsByGlobalCategoryFlow(globalCategoryId: String): Flow<List<MenuProduct>>
    suspend fun getProductById(productId: String): Result<MenuProduct?>
    suspend fun saveProduct(product: MenuProduct): Result<Unit>
    suspend fun updateProductStatus(productId: String, status: MenuProductStatus): Result<Unit>
    suspend fun deleteProduct(productId: String): Result<Unit>
}
