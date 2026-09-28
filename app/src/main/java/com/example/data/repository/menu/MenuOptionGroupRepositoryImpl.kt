package com.example.data.repository.menu

import com.example.data.dto.menu.OptionGroupDto
import com.example.data.mapper.menu.OptionGroupMapper
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.repository.menu.IMenuOptionGroupRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Implementación Firestore de IMenuOptionGroupRepository (v2.2 Enterprise)
 */
class MenuOptionGroupRepositoryImpl(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IMenuOptionGroupRepository {

    override fun getOptionGroupsFlow(restaurantId: String): Flow<List<MenuOptionGroup>> = callbackFlow {
        if (restaurantId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("option_groups")
            .whereEqualTo("restaurantId", restaurantId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val groups = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(OptionGroupDto::class.java)?.let { OptionGroupMapper.toDomain(it) }
                } ?: emptyList()
                trySend(groups.sortedBy { it.orderIndex })
            }

        awaitClose { listener.remove() }
    }

    override suspend fun getOptionGroupById(groupId: String): Result<MenuOptionGroup?> {
        return try {
            val doc = firestore.collection("option_groups").document(groupId).get().await()
            val dto = doc.toObject(OptionGroupDto::class.java)
            Result.success(dto?.let { OptionGroupMapper.toDomain(it) })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getOptionGroupsByIds(groupIds: List<String>): Result<List<MenuOptionGroup>> {
        return try {
            if (groupIds.isEmpty()) return Result.success(emptyList())
            val snapshot = firestore.collection("option_groups")
                .whereIn("id", groupIds.take(10)) // Limitación Firestore whereIn
                .get().await()
            val groups = snapshot.documents.mapNotNull { doc ->
                doc.toObject(OptionGroupDto::class.java)?.let { OptionGroupMapper.toDomain(it) }
            }
            Result.success(groups)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun saveOptionGroup(optionGroup: MenuOptionGroup): Result<Unit> {
        return try {
            val docRef = firestore.collection("option_groups").document(
                optionGroup.id.ifBlank { firestore.collection("option_groups").document().id }
            )
            val updatedGroup = optionGroup.copy(id = docRef.id, updatedAt = System.currentTimeMillis())
            val dto = OptionGroupMapper.toDto(updatedGroup)
            docRef.set(dto).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteOptionGroup(groupId: String): Result<Unit> {
        return try {
            firestore.collection("option_groups").document(groupId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
