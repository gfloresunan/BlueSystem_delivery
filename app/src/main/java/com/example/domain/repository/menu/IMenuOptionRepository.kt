package com.example.domain.repository.menu

import com.example.domain.model.menu.MenuOption
import kotlinx.coroutines.flow.Flow

/**
 * Interfaz de Repositorio de Dominio: IMenuOptionRepository (v2.2 Enterprise)
 */
interface IMenuOptionRepository {
    fun getOptionsByGroupIdFlow(groupId: String): Flow<List<MenuOption>>
    suspend fun getOptionById(optionId: String): Result<MenuOption?>
    suspend fun saveOption(option: MenuOption): Result<Unit>
    suspend fun deleteOption(optionId: String): Result<Unit>
}
