package com.example.data.repository.menu

import com.example.data.dto.menu.OptionDto
import com.example.data.mapper.menu.OptionMapper
import com.example.domain.model.menu.MenuOption
import com.example.domain.repository.menu.IMenuOptionRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Implementación Firestore de IMenuOptionRepository (v2.2 Enterprise)
 */
class MenuOptionRepositoryImpl(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IMenuOptionRepository {

    override fun getOptionsByGroupIdFlow(groupId: String): Flow<List<MenuOption>> = callbackFlow {
        if (groupId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("options")
            .whereEqualTo("groupId", groupId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val options = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(OptionDto::class.java)?.let { OptionMapper.toDomain(it) }
                } ?: emptyList()
                trySend(options.sortedBy { it.orderIndex })
            }

        awaitClose { listener.remove() }
    }

    override suspend fun getOptionById(optionId: String): Result<MenuOption?> {
        return try {
            val doc = firestore.collection("options").document(optionId).get().await()
            val dto = doc.toObject(OptionDto::class.java)
            Result.success(dto?.let { OptionMapper.toDomain(it) })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun saveOption(option: MenuOption): Result<Unit> {
        return try {
            val docRef = firestore.collection("options").document(
                option.id.ifBlank { firestore.collection("options").document().id }
            )
            val updatedOption = option.copy(id = docRef.id, updatedAt = System.currentTimeMillis())
            val dto = OptionMapper.toDto(updatedOption)
            docRef.set(dto).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteOption(optionId: String): Result<Unit> {
        return try {
            firestore.collection("options").document(optionId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
