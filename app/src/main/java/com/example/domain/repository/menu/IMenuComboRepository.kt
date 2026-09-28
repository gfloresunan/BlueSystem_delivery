package com.example.domain.repository.menu

import com.example.domain.model.menu.MenuCombo
import kotlinx.coroutines.flow.Flow

/**
 * Interfaz de Repositorio de Dominio: IMenuComboRepository (v2.2 Enterprise)
 */
interface IMenuComboRepository {
    fun getCombosFlow(restaurantId: String): Flow<List<MenuCombo>>
    suspend fun getComboById(comboId: String): Result<MenuCombo?>
    suspend fun saveCombo(combo: MenuCombo): Result<Unit>
    suspend fun deleteCombo(comboId: String): Result<Unit>
}
