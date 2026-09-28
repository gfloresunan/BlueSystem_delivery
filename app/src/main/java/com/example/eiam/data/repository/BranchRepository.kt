package com.example.eiam.data.repository

import android.util.Log
import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.Branch
import com.example.eiam.domain.repository.IBranchRepository
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

/**
 * EIAM — BranchRepository (FASE 7)
 * Implementación de Firestore para sucursales con deserialización resiliente.
 */
class BranchRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : IBranchRepository {

    private val collection = firestore.collection("branches")

    private fun parseBranchSafely(doc: DocumentSnapshot): Branch? {
        if (!doc.exists()) return null
        return try {
            doc.toObject(Branch::class.java)?.copy(branchId = doc.id)
        } catch (e: Exception) {
            Log.w("BranchRepository", "Error deserializando Branch ${doc.id}, aplicando fallback seguro: ${e.message}")
            val rawStatus = doc.getString("status")
            val status = AccountStatus.fromString(rawStatus, defaultStatus = AccountStatus.ACTIVE)
            Branch(
                branchId = doc.id,
                businessId = doc.getString("businessId") ?: "",
                name = doc.getString("name") ?: doc.getString("branchName") ?: doc.getString("nombre") ?: "Sucursal Principal",
                address = doc.getString("address") ?: doc.getString("direccion") ?: "",
                phone = doc.getString("phone") ?: doc.getString("telefono") ?: "",
                isOpen = doc.getBoolean("isOpen") ?: doc.getBoolean("open") ?: true,
                isPrimary = doc.getBoolean("isPrimary") ?: doc.getBoolean("primary") ?: false,
                status = status
            )
        }
    }

    override suspend fun getBranchById(branchId: String): Branch? {
        return try {
            val snapshot = collection.document(branchId).get().await()
            parseBranchSafely(snapshot)
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun getBranchesByBusinessId(businessId: String): List<Branch> {
        return try {
            val snapshot = collection.whereEqualTo("businessId", businessId).get().await()
            snapshot.documents.mapNotNull { parseBranchSafely(it) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    override suspend fun saveBranch(branch: Branch): Boolean {
        return try {
            collection.document(branch.branchId).set(branch).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun updateBranchStatus(branchId: String, isActive: Boolean): Boolean {
        return try {
            collection.document(branchId).update("isActive", isActive).await()
            true
        } catch (e: Exception) {
            false
        }
    }
}

