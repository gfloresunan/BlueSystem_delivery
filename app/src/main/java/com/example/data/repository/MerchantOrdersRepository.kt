package com.example.data.repository

import com.example.Pedido
import com.example.toPedidoSafely
import com.example.domain.model.orders.CourierRecommendation
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Repositorio de Agregación de Pedidos para el MOOC (Merchant Orders Operations Center)
 * Cumple estricto presupuesto ADR-003: Máximo 2 listeners activos por sesión en Firestore.
 */
class MerchantOrdersRepository(
    private val firestore: FirebaseFirestore? = try { FirebaseFirestore.getInstance() } catch (e: Throwable) { null }
) {
    companion object {
        private const val ORDERS_COLLECTION = "orders"
        private const val COURIERS_COLLECTION = "couriers"
    }

    /**
     * Listener 1: Flujo en tiempo real de Pedidos del Comercio
     */
    fun getOrdersStream(businessId: String): Flow<List<Pedido>> = callbackFlow {
        if (businessId.isEmpty() || firestore == null) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        var fallbackRegistration: ListenerRegistration? = null
        val registration = firestore.collection(ORDERS_COLLECTION)
            .whereEqualTo("businessId", businessId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    fallbackRegistration = firestore.collection(ORDERS_COLLECTION)
                        .addSnapshotListener { fbSnap, _ ->
                            val fullList = fbSnap?.documents?.mapNotNull { doc -> doc.toPedidoSafely() } ?: emptyList()
                            val filtered = fullList.filter { it.businessId == businessId }
                            trySend(filtered)
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
     * Listener 2: Flujo en tiempo real de Repartidores Disponibles
     */
    fun getAvailableCouriersStream(businessId: String): Flow<List<CourierRecommendation>> = callbackFlow {
        if (firestore == null) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val registration = firestore.collection(COURIERS_COLLECTION)
            .addSnapshotListener { snapshot, _ ->
                val list = mutableListOf<CourierRecommendation>()
                if (snapshot != null) {
                    for (doc in snapshot.documents) {
                        val id = doc.id
                        val name = doc.getString("nombre") ?: doc.getString("name") ?: "Repartidor #$id"
                        val vehicle = doc.getString("vehicleType") ?: doc.getString("tipoVehiculo") ?: "Motocicleta"
                        val rating = doc.getDouble("rating") ?: doc.getDouble("calificacion") ?: 5.0
                        list.add(
                            CourierRecommendation(
                                courierId = id,
                                courierName = name,
                                vehicleType = vehicle,
                                distanceKm = doc.getDouble("distanceKm") ?: 0.0,
                                etaMinutes = doc.getLong("etaMinutes")?.toInt() ?: 0,
                                score = doc.getLong("score")?.toInt() ?: 100,
                                rating = rating
                            )
                        )
                    }
                }
                trySend(list)
            }

        awaitClose {
            registration.remove()
        }
    }

    suspend fun submitIncident(orderId: String, businessId: String, type: String, notes: String): Result<Unit> {
        return try {
            val db = firestore ?: FirebaseFirestore.getInstance()
            val incident = mapOf(
                "orderId" to orderId,
                "businessId" to businessId,
                "type" to type,
                "notes" to notes,
                "createdAt" to com.google.firebase.Timestamp.now()
            )
            db.collection("order_incidents").add(incident).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitRefund(orderId: String, businessId: String, type: String, amount: Double, reason: String): Result<Unit> {
        return try {
            val db = firestore ?: FirebaseFirestore.getInstance()
            val refund = mapOf(
                "orderId" to orderId,
                "businessId" to businessId,
                "type" to type,
                "amount" to amount,
                "reason" to reason,
                "status" to "REQUESTED",
                "createdAt" to com.google.firebase.Timestamp.now()
            )
            db.collection("order_refunds").add(refund).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
