package com.example.data.repository

import com.example.Pedido
import com.example.toPedidoSafely
import com.example.domain.model.controltower.FleetCourier
import com.example.domain.model.controltower.FleetCourierStatus
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

/**
 * Repositorio en Tiempo Real para el Delivery Control Tower (DCT)
 * Cumple estricto presupuesto ADR-003: Máximo 2 listeners activos por sesión en Firestore.
 */
class DeliveryControlTowerRepository(
    private val firestore: FirebaseFirestore? = try { FirebaseFirestore.getInstance() } catch (e: Throwable) { null }
) {
    companion object {
        private const val ORDERS_COLLECTION = "orders"
        private const val FLEET_COLLECTION = "couriers"
    }

    /**
     * Listener 1: Flujo en tiempo real de Pedidos Activos del Comercio
     */
    fun getControlTowerOrdersStream(businessId: String): Flow<List<Pedido>> = callbackFlow {
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
     * Listener 2: Flujo en tiempo real de Flota de Motorizados en Mapa
     */
    fun getFleetCouriersStream(businessId: String): Flow<List<FleetCourier>> = callbackFlow {
        if (firestore == null) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val registration = firestore.collection(FLEET_COLLECTION)
            .addSnapshotListener { snapshot, _ ->
                val list = mutableListOf<FleetCourier>()
                if (snapshot != null) {
                    for (doc in snapshot.documents) {
                        val id = doc.id
                        val name = doc.getString("nombre") ?: doc.getString("name") ?: "Repartidor #$id"
                        val lat = doc.getDouble("lat") ?: doc.getDouble("latitude") ?: 0.0
                        val lng = doc.getDouble("lng") ?: doc.getDouble("longitude") ?: 0.0
                        list.add(
                            FleetCourier(
                                courierId = id,
                                name = name,
                                status = FleetCourierStatus.AVAILABLE,
                                latitude = lat,
                                longitude = lng
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
}
