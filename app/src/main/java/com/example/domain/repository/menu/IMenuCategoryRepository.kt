package com.example.domain.repository.menu

import com.example.domain.model.menu.MenuCategory
import kotlinx.coroutines.flow.Flow

interface IMenuCategoryRepository {
    fun getCategoriesFlow(restaurantId: String): Flow<List<MenuCategory>>
    suspend fun getCategoryById(categoryId: String): Result<MenuCategory?>
    suspend fun saveCategory(category: MenuCategory): Result<Unit>
    suspend fun deleteCategory(categoryId: String): Result<Unit>
    suspend fun updateCategoryOrder(restaurantId: String, orderedCategoryIds: List<String>): Result<Unit>
}
