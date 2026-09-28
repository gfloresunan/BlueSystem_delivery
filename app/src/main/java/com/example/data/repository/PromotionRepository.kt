package com.example.data.repository

import android.util.Log
import com.example.domain.model.Promotion
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class PromotionRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    private val _promotions = MutableStateFlow<List<Promotion>>(emptyList())
    val promotions: StateFlow<List<Promotion>> = _promotions.asStateFlow()

    private var listenerRegistration: ListenerRegistration? = null

    fun startListening(businessId: String? = null) {
        if (listenerRegistration != null) return

        var query: Query = firestore.collection("promotions")
        if (!businessId.isNullOrBlank()) {
            query = query.whereEqualTo("businessId", businessId)
        }

        listenerRegistration = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e("PromotionRepo", "Error listening to promotions collection", error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    try {
                        doc.toObject(Promotion::class.java)?.copy(id = doc.id)
                    } catch (e: Exception) {
                        Log.w("PromotionRepo", "Error deserializing promo ${doc.id}: ${e.message}")
                        null
                    }
                }
                _promotions.value = list
                Log.d("PromotionRepo", "Promotions updated: count=${list.size} (businessId=$businessId)")
            }
        }
    }

    fun stopListening() {
        listenerRegistration?.remove()
        listenerRegistration = null
        _promotions.value = emptyList()
    }

    fun getPromotionsFlow(businessId: String? = null): Flow<List<Promotion>> = callbackFlow {
        var query: Query = firestore.collection("promotions")
        if (!businessId.isNullOrBlank()) {
            query = query.whereEqualTo("businessId", businessId)
        }

        val listener = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e("PromotionRepo", "Error in getPromotionsFlow", error)
                close(error)
                return@addSnapshotListener
            }
            val list = snapshot?.documents?.mapNotNull { doc ->
                try {
                    doc.toObject(Promotion::class.java)?.copy(id = doc.id)
                } catch (e: Exception) {
                    Log.w("PromotionRepo", "Error deserializing promo ${doc.id}: ${e.message}")
                    null
                }
            } ?: emptyList()
            trySend(list)
        }
        awaitClose { listener.remove() }
    }

    suspend fun addPromotion(promotion: Promotion): Result<Promotion> {
        return try {
            val docRef = if (promotion.id.isNotBlank()) {
                firestore.collection("promotions").document(promotion.id)
            } else {
                firestore.collection("promotions").document()
            }
            val newPromo = promotion.copy(id = docRef.id)
            docRef.set(newPromo).await()
            Result.success(newPromo)
        } catch (e: Exception) {
            Log.e("PromotionRepo", "Error adding promotion", e)
            Result.failure(e)
        }
    }

    suspend fun updatePromotion(promotionId: String, updates: Map<String, Any>): Result<Unit> {
        return try {
            firestore.collection("promotions").document(promotionId).update(updates).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("PromotionRepo", "Error updating promotion", e)
            Result.failure(e)
        }
    }

    suspend fun togglePromotionActive(promotionId: String, currentActive: Boolean): Result<Boolean> {
        val newActive = !currentActive
        return try {
            firestore.collection("promotions").document(promotionId).update("active", newActive).await()
            Result.success(newActive)
        } catch (e: Exception) {
            Log.e("PromotionRepo", "Error toggling promotion active state", e)
            Result.failure(e)
        }
    }

    suspend fun deletePromotion(promotionId: String): Result<Unit> {
        return try {
            firestore.collection("promotions").document(promotionId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Log.e("PromotionRepo", "Error deleting promotion", e)
            Result.failure(e)
        }
    }
}

