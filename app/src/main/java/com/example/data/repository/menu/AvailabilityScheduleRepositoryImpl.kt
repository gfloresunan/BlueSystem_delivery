package com.example.data.repository.menu

import com.example.data.dto.menu.AvailabilityScheduleDto
import com.example.data.mapper.menu.AvailabilityMapper
import com.example.domain.model.menu.AvailabilitySchedule
import com.example.domain.repository.menu.IAvailabilityScheduleRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Implementación Firestore de IAvailabilityScheduleRepository (v2.2 Enterprise)
 */
class AvailabilityScheduleRepositoryImpl(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IAvailabilityScheduleRepository {

    override fun getSchedulesFlow(restaurantId: String, branchId: String?): Flow<List<AvailabilitySchedule>> = callbackFlow {
        if (restaurantId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        var query = firestore.collection("availabilitySchedules")
            .whereEqualTo("restaurantId", restaurantId)

        if (!branchId.isNullOrBlank()) {
            query = query.whereEqualTo("branchId", branchId)
        }

        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            val schedules = snapshot?.documents?.mapNotNull { doc ->
                doc.toObject(AvailabilityScheduleDto::class.java)?.let { AvailabilityMapper.scheduleToDomain(it) }
            } ?: emptyList()
            trySend(schedules)
        }

        awaitClose { listener.remove() }
    }

    override suspend fun getScheduleById(scheduleId: String): Result<AvailabilitySchedule?> {
        return try {
            val doc = firestore.collection("availabilitySchedules").document(scheduleId).get().await()
            val dto = doc.toObject(AvailabilityScheduleDto::class.java)
            Result.success(dto?.let { AvailabilityMapper.scheduleToDomain(it) })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun saveSchedule(schedule: AvailabilitySchedule): Result<Unit> {
        return try {
            val docRef = firestore.collection("availabilitySchedules").document(
                schedule.id.ifBlank { firestore.collection("availabilitySchedules").document().id }
            )
            val updated = schedule.copy(id = docRef.id, updatedAt = System.currentTimeMillis())
            val dto = AvailabilityMapper.scheduleToDto(updated)
            docRef.set(dto).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteSchedule(scheduleId: String): Result<Unit> {
        return try {
            firestore.collection("availabilitySchedules").document(scheduleId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
