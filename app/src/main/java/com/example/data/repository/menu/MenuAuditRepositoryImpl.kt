package com.example.data.repository.menu

import com.example.data.dto.menu.MenuAuditEventDto
import com.example.data.mapper.menu.MenuAuditMapper
import com.example.domain.model.menu.MenuAuditEvent
import com.example.domain.repository.menu.IMenuAuditRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

class MenuAuditRepositoryImpl(
    private val firestore: FirebaseFirestore
) : IMenuAuditRepository {

    override suspend fun recordEvent(event: MenuAuditEvent) {
        val dto = MenuAuditMapper.toDto(event)
        firestore.collection("restaurants")
            .document(event.restaurantId)
            .collection("audit_logs")
            .document(event.id)
            .set(dto)
            .await()
    }

    override suspend fun getAuditHistory(restaurantId: String): List<MenuAuditEvent> {
        val snapshot = firestore.collection("restaurants")
            .document(restaurantId)
            .collection("audit_logs")
            .orderBy("timestamp", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .get()
            .await()

        return snapshot.documents.mapNotNull { doc ->
            doc.toObject(MenuAuditEventDto::class.java)?.let { dto ->
                dto.id = doc.id
                MenuAuditMapper.toDomain(dto)
            }
        }
    }
}
