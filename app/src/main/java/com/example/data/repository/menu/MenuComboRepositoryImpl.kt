package com.example.data.repository.menu

import com.example.data.dto.menu.ComboDto
import com.example.data.mapper.menu.ComboMapper
import com.example.domain.model.menu.MenuCombo
import com.example.domain.repository.menu.IMenuComboRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Implementación Firestore de IMenuComboRepository (v2.2 Enterprise)
 */
class MenuComboRepositoryImpl(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IMenuComboRepository {

    override fun getCombosFlow(restaurantId: String): Flow<List<MenuCombo>> = callbackFlow {
        if (restaurantId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("combos")
            .whereEqualTo("restaurantId", restaurantId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val combos = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(ComboDto::class.java)?.let { ComboMapper.comboToDomain(it) }
                } ?: emptyList()
                trySend(combos.sortedBy { it.orderIndex })
            }

        awaitClose { listener.remove() }
    }

    override suspend fun getComboById(comboId: String): Result<MenuCombo?> {
        return try {
            val doc = firestore.collection("combos").document(comboId).get().await()
            val dto = doc.toObject(ComboDto::class.java)
            Result.success(dto?.let { ComboMapper.comboToDomain(it) })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun saveCombo(combo: MenuCombo): Result<Unit> {
        return try {
            val docRef = firestore.collection("combos").document(
                combo.id.ifBlank { firestore.collection("combos").document().id }
            )
            val updatedCombo = combo.copy(id = docRef.id, updatedAt = System.currentTimeMillis())
            val dto = ComboMapper.comboToDto(updatedCombo)
            docRef.set(dto).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteCombo(comboId: String): Result<Unit> {
        return try {
            firestore.collection("combos").document(comboId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
