package com.example.eiam.domain.engine

import com.example.eiam.domain.model.Organization
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * EIAM — OrganizationEngine (EIAM v2.1)
 * Motor para crear y administrar holdings, franquicias y grupos de comercios (Business).
 */
class OrganizationEngine(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val collection = firestore.collection("organizations")

    suspend fun createOrganization(
        name: String,
        ownerUid: String,
        taxId: String? = null,
        logoUrl: String? = null
    ): Result<Organization> {
        val orgId = "org_${System.currentTimeMillis()}"
        val org = Organization(
            organizationId = orgId,
            name = name,
            taxId = taxId,
            ownerUid = ownerUid,
            businessIds = emptyList(),
            logoUrl = logoUrl
        )

        return try {
            collection.document(orgId).set(org).await()
            Result.success(org)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addBusinessToOrganization(orgId: String, businessId: String): Result<Boolean> {
        return try {
            val orgRef = collection.document(orgId)
            firestore.runTransaction { transaction ->
                val snapshot = transaction.get(orgRef)
                val currentBusinessIds = snapshot.get("businessIds") as? List<String> ?: emptyList()
                if (!currentBusinessIds.contains(businessId)) {
                    val updatedList = currentBusinessIds + businessId
                    transaction.update(orgRef, "businessIds", updatedList)
                }
            }.await()

            // Actualizar referencia en la entidad Business
            firestore.collection("businesses").document(businessId)
                .update("organizationId", orgId).await()

            Result.success(true)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getOrganization(orgId: String): Organization? {
        return try {
            val doc = collection.document(orgId).get().await()
            doc.toObject(Organization::class.java)
        } catch (e: Exception) {
            null
        }
    }
}
