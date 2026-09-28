package com.example.data.repository.menu

import com.example.data.dto.menu.MenuSnapshotDto
import com.example.data.mapper.menu.MenuSnapshotMapper
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.repository.menu.IMenuSnapshotRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

class MenuSnapshotRepositoryImpl(
    private val firestore: FirebaseFirestore
) : IMenuSnapshotRepository {

    override suspend fun saveSnapshot(snapshot: MenuSnapshot) {
        val dto = MenuSnapshotMapper.toDto(snapshot)
        firestore.collection("restaurants")
            .document(snapshot.restaurantId)
            .collection("snapshots")
            .document(snapshot.id)
            .set(dto)
            .await()
    }

    override suspend fun getSnapshotByVersion(restaurantId: String, semanticVersion: String): MenuSnapshot? {
        val snapshot = firestore.collection("restaurants")
            .document(restaurantId)
            .collection("snapshots")
            .whereEqualTo("semanticVersion", semanticVersion)
            .limit(1)
            .get()
            .await()

        val doc = snapshot.documents.firstOrNull() ?: return null
        val dto = doc.toObject(MenuSnapshotDto::class.java) ?: return null
        dto.id = doc.id
        return MenuSnapshotMapper.toDomain(dto)
    }

    override suspend fun getLatestSnapshot(restaurantId: String): MenuSnapshot? {
        val snapshot = firestore.collection("restaurants")
            .document(restaurantId)
            .collection("snapshots")
            .orderBy("publishedAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .limit(1)
            .get()
            .await()

        val doc = snapshot.documents.firstOrNull() ?: return null
        val dto = doc.toObject(MenuSnapshotDto::class.java) ?: return null
        dto.id = doc.id
        return MenuSnapshotMapper.toDomain(dto)
    }

    override suspend fun listSnapshots(restaurantId: String): List<MenuSnapshot> {
        val snapshot = firestore.collection("restaurants")
            .document(restaurantId)
            .collection("snapshots")
            .orderBy("publishedAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .get()
            .await()

        return snapshot.documents.mapNotNull { doc ->
            doc.toObject(MenuSnapshotDto::class.java)?.let { dto ->
                dto.id = doc.id
                MenuSnapshotMapper.toDomain(dto)
            }
        }
    }
}
