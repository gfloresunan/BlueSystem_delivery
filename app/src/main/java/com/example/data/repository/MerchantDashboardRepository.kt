package com.example.data.repository

import android.util.Log
import com.example.Pedido
import com.example.toPedidoSafely
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

/**
 * Repositorio de Agregación para el Merchant Operations Dashboard (EOC)
 * Cumple estricto presupuesto ADR-003: Máximo 2 listeners activos por sesión.
 */
class MerchantDashboardRepository(
    firestoreProvider: (() -> FirebaseFirestore)? = null
) {
    private val firestore: FirebaseFirestore by lazy { firestoreProvider?.invoke() ?: FirebaseFirestore.getInstance() }

    companion object {
        private const val ORDERS_COLLECTION = "orders"
        private const val BUSINESSES_COLLECTION = "businesses"
    }

    fun getOrdersStream(businessId: String): Flow<List<Pedido>> = callbackFlow {
        if (businessId.isBlank()) {
            trySend(emptyList())
            awaitClose { }
            return@callbackFlow
        }

        var fallbackRegistration: ListenerRegistration? = null
        val registration = firestore.collection(ORDERS_COLLECTION)
            .whereEqualTo("businessId", businessId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w("MerchantDashRepo", "Primary query index error, using fallback: ${error.message}")
                    fallbackRegistration = firestore.collection(ORDERS_COLLECTION)
                        .whereEqualTo("businessId", businessId)
                        .addSnapshotListener { snap2, err2 ->
                            if (err2 != null) {
                                trySend(emptyList())
                                return@addSnapshotListener
                            }
                            val list = snap2?.documents?.mapNotNull { doc -> doc.toPedidoSafely() } ?: emptyList()
                            trySend(list.sortedByDescending { it.createdAt?.seconds ?: 0L })
                        }
                    return@addSnapshotListener
                }

                val list = snapshot?.documents?.mapNotNull { doc -> doc.toPedidoSafely() } ?: emptyList()
                trySend(list)
            }

        awaitClose {
            registration.remove()
            fallbackRegistration?.remove()
        }
    }

    /**
     * Listener 2: Flujo en tiempo real de Estado e Información del Comercio
     */
    fun getBusinessInfoStream(businessId: String): Flow<BusinessInfo?> = callbackFlow {
        if (businessId.isEmpty() || firestore == null) {
            trySend(null)
            close()
            return@callbackFlow
        }

        val registration = firestore.collection(BUSINESSES_COLLECTION)
            .document(businessId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    trySend(null)
                    return@addSnapshotListener
                }
                val info = snapshot?.toBusinessInfoSafely()
                trySend(info)
            }

        awaitClose { registration.remove() }
    }
}
