package com.example.eiam.data.repository

import com.example.eiam.domain.model.Business
import com.example.eiam.domain.repository.IBusinessRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * EIAM — BusinessRepository (FASE 6)
 * Implementación de Firestore para la entidad de Business/Comercio.
 */
class BusinessRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IBusinessRepository {

    private val collection = firestore.collection("businesses")

    override suspend fun getBusinessById(businessId: String): Business? {
        return try {
            val snapshot = collection.document(businessId).get().await()
            if (snapshot.exists()) {
                snapshot.toObject(Business::class.java)
            } else null
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun saveBusiness(business: Business): Boolean {
        return try {
            collection.document(business.businessId).set(business).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun updateBusinessStatus(businessId: String, status: String): Boolean {
        return try {
            collection.document(businessId).update("status", status).await()
            true
        } catch (e: Exception) {
            false
        }
    }
}
