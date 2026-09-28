package com.example.domain.repository.menu

import com.example.domain.model.menu.AvailabilitySchedule
import kotlinx.coroutines.flow.Flow

/**
 * Interfaz de Repositorio de Dominio: IAvailabilityScheduleRepository (v2.2 Enterprise)
 */
interface IAvailabilityScheduleRepository {
    fun getSchedulesFlow(restaurantId: String, branchId: String? = null): Flow<List<AvailabilitySchedule>>
    suspend fun getScheduleById(scheduleId: String): Result<AvailabilitySchedule?>
    suspend fun saveSchedule(schedule: AvailabilitySchedule): Result<Unit>
    suspend fun deleteSchedule(scheduleId: String): Result<Unit>
}
