package com.example.data.repository

import com.example.domain.model.BusinessAnalytics
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

class AnalyticsRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {
    companion object {
        private const val ANALYTICS_COLLECTION = "business_analytics"
    }

    fun getBusinessAnalytics(businessId: String): Flow<BusinessAnalytics?> = callbackFlow {
        val listener = firestore.collection(ANALYTICS_COLLECTION)
            .document(businessId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val analytics = try {
                    snapshot?.toObject(BusinessAnalytics::class.java)
                } catch (e: Exception) {
                    android.util.Log.w("AnalyticsRepo", "Error parsing analytics for $businessId: ${e.message}")
                    null
                }
                trySend(analytics)
            }
        
        awaitClose { listener.remove() }
    }
}
