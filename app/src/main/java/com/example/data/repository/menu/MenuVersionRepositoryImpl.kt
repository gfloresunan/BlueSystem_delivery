package com.example.data.repository.menu

import com.example.data.dto.menu.MenuVersionDto
import com.example.data.mapper.menu.MenuVersionMapper
import com.example.domain.model.menu.MenuVersion
import com.example.domain.model.menu.MenuVersionStatus
import com.example.domain.repository.menu.IMenuVersionRepository
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class MenuVersionRepositoryImpl(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IMenuVersionRepository {

    private val versionsCollection = firestore.collection("menu_versions")

    override fun getLatestMenuVersionFlow(restaurantId: String): Flow<MenuVersion?> = callbackFlow {
        if (restaurantId.isBlank()) {
            trySend(null)
            close()
            return@callbackFlow
        }

        val listener = versionsCollection
            .whereEqualTo("restaurantId", restaurantId)
            .orderBy("version", Query.Direction.DESCENDING)
            .limit(1)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    trySend(null)
                    return@addSnapshotListener
                }

                val dto = snapshot?.documents?.firstOrNull()?.toObject(MenuVersionDto::class.java)
                trySend(dto?.let { MenuVersionMapper.toDomain(it) })
            }

        awaitClose { listener.remove() }
    }

    override suspend fun saveMenuVersion(menuVersion: MenuVersion): Result<Unit> {
        return try {
            val docId = menuVersion.id.ifBlank { versionsCollection.document().id }
            val finalVersion = menuVersion.copy(id = docId)
            val dto = MenuVersionMapper.toDto(finalVersion)
            versionsCollection.document(docId).set(dto).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun publishMenuVersion(
        restaurantId: String,
        menuVersionId: String
    ): Result<Unit> {
        return try {
            val batch = firestore.batch()
            val versionRef = versionsCollection.document(menuVersionId)

            batch.update(
                versionRef,
                mapOf(
                    "status" to MenuVersionStatus.PUBLISHED.name,
                    "publishedAt" to System.currentTimeMillis()
                )
            )

            val restaurantRef = firestore.collection("restaurants").document(restaurantId)
            batch.update(restaurantRef, "currentMenuVersionId", menuVersionId)

            batch.commit().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
