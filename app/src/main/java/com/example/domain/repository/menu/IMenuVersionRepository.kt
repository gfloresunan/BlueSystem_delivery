package com.example.domain.repository.menu

import com.example.domain.model.menu.MenuVersion
import kotlinx.coroutines.flow.Flow

interface IMenuVersionRepository {
    fun getLatestMenuVersionFlow(restaurantId: String): Flow<MenuVersion?>
    suspend fun saveMenuVersion(menuVersion: MenuVersion): Result<Unit>
    suspend fun publishMenuVersion(restaurantId: String, menuVersionId: String): Result<Unit>
}
