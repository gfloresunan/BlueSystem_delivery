package com.example.domain.repository.menu

import com.example.domain.model.menu.MenuOptionGroup
import kotlinx.coroutines.flow.Flow

/**
 * Interfaz de Repositorio de Dominio: IMenuOptionGroupRepository (v2.2 Enterprise)
 */
interface IMenuOptionGroupRepository {
    fun getOptionGroupsFlow(restaurantId: String): Flow<List<MenuOptionGroup>>
    suspend fun getOptionGroupById(groupId: String): Result<MenuOptionGroup?>
    suspend fun getOptionGroupsByIds(groupIds: List<String>): Result<List<MenuOptionGroup>>
    suspend fun saveOptionGroup(optionGroup: MenuOptionGroup): Result<Unit>
    suspend fun deleteOptionGroup(groupId: String): Result<Unit>
}
