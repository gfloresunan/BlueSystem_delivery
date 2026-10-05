package com.example

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import com.example.data.repository.toBusinessInfoSafely

class FirebaseManager {
    private val db = FirebaseFirestore.getInstance()

    private fun isPrivateAccessAllowed(): Boolean {
        val user = FirebaseAuth.getInstance().currentUser
        val isGuest = com.example.data.sync.SessionManager.isGuest()
        if (user == null || isGuest) {
            Log.d("FirebaseManager", "Skipping private listener. Guest mode.")
            return false
        }
        return true
    }

    // 1. Backend / Admin: Filtrar motorizados disponibles
    suspend fun getAvailableCouriers(): List<UbicacionRepartidor> {
        return try {
            val snapshot = db.collection("ubicaciones_repartidores")
                .whereEqualTo("estadoDisponibilidad", "disponible")
                .get()
                .await()
            snapshot.toObjects(UbicacionRepartidor::class.java)
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error fetching couriers", e)
            emptyList()
        }
    }

    // Algoritmo de cercanía simulado (filtra los 3 más cercanos)
    suspend fun getNearestCouriers(pickupLocation: Coordenadas, limit: Int = 3): List<Pair<UbicacionRepartidor, Double>> {
        val availableCouriers = getAvailableCouriers()
        return GeoUtils.findNearestCouriers(pickupLocation, availableCouriers, limit)
    }

    // Asignar pedido
    suspend fun assignOrder(pedidoId: String, motorizadoId: String) {
        try {
            val pedidoRef = db.collection("orders").document(pedidoId)
            
            db.runTransaction { transaction ->
                val snapshot = transaction.get(pedidoRef)
                
                // Actualizar estado y motorizado
                transaction.update(pedidoRef, "motorizadoId", motorizadoId)
                transaction.update(pedidoRef, "estado", "asignado")
                
                // Agregar al historial de estados
                val historial = snapshot.get("historialEstados") as? MutableList<Map<String, Any>> ?: mutableListOf()
                historial.add(
                    mapOf(
                        "estado" to "asignado",
                        "timestamp" to System.currentTimeMillis().toString()
                    )
                )
                transaction.update(pedidoRef, "historialEstados", historial)
            }.await()
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error assigning order", e)
        }
    }

    // 2. Panel del Motorizado: Escuchar pedidos asignados
    fun listenToAssignedOrders(motorizadoId: String): Flow<List<Pedido>> = callbackFlow {
        if (!isPrivateAccessAllowed()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }
        val listener = db.collection("orders")
            .whereEqualTo("assignedCourierId", motorizadoId)
            .whereIn("status", listOf("in_transit", "ready"))
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToAssignedOrders", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    try {
                        val pedidos = snapshot.toObjects(Pedido::class.java)
                        trySend(pedidos)
                    } catch (e: Exception) {
                        Log.e("FirebaseManager", "Error deserializing assigned orders", e)
                        trySend(emptyList())
                    }
                }
            }
        awaitClose { listener.remove() }
    }

    // Motorizado: Asignación atómica de orden de comercio (Fase 10.2 Lock Previo)
    suspend fun claimOrderAtomically(orderId: String, courierId: String, courierName: String): Result<Boolean> {
        return try {
            val orderRef = db.collection("orders").document(orderId)
            val success = db.runTransaction { transaction ->
                val snapshot = transaction.get(orderRef)
                val existingCourier = snapshot.getString("assignedCourierId") ?: snapshot.getString("motorizadoId")
                if (!existingCourier.isNullOrEmpty() && existingCourier != courierId) {
                    return@runTransaction false // Lock Atómico: Segundo motorizado es rechazado
                }
                transaction.update(orderRef, mapOf(
                    "assignedCourierId" to courierId,
                    "motorizadoId" to courierId,
                    "courierName" to courierName,
                    "status" to "ASSIGNED",
                    "estado" to "asignado",
                    "courierPhase" to 2,
                    "assignedAt" to com.google.firebase.Timestamp.now()
                ))
                true
            }.await()
            Result.success(success)
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error claiming order atomically", e)
            Result.failure(e)
        }
    }

    // Motorizado: Asignación atómica de viaje X -> Y (Fase 10.2 Dominio B Aislado)
    suspend fun claimTripAtomically(tripId: String, courierId: String, courierName: String): Result<Boolean> {
        return try {
            val tripRef = db.collection("deliveryTrips").document(tripId)
            val orderRef = db.collection("orders").document(tripId)
            val success = db.runTransaction { transaction ->
                // --- FASE 1: TODAS LAS LECTURAS (READS UPFRONT) ---
                val snapshot = transaction.get(tripRef)
                val orderSnap = transaction.get(orderRef)

                // --- FASE 2: VALIDACIONES IN-MEMORY ---
                if (!snapshot.exists()) {
                    return@runTransaction false
                }
                val currentStatus = (snapshot.getString("status") ?: "").uppercase()
                if (currentStatus in listOf("CANCELLED", "TIMEOUT", "COMPLETED", "DELIVERED")) {
                    Log.w("FirebaseManager", "claimTripAtomically: Trip $tripId en estado $currentStatus. Reclamo rechazado.")
                    return@runTransaction false // Lock Atómico contra cancelación/timeout
                }
                val existingCourier = snapshot.getString("courierId") ?: snapshot.getString("assignedCourierId")
                if (!existingCourier.isNullOrEmpty() && existingCourier != courierId) {
                    return@runTransaction false // Lock Atómico: Segundo motorizado rechazado
                }

                // --- FASE 3: TODAS LAS ESCRITURAS (WRITES) ---
                val now = com.google.firebase.Timestamp.now()
                transaction.update(tripRef, mapOf(
                    "courierId" to courierId,
                    "assignedCourierId" to courierId,
                    "courierName" to courierName,
                    "status" to "ASSIGNED",
                    "estado" to "asignado",
                    "assignedAt" to now,
                    "acceptedAt" to now,
                    "updatedAt" to now
                ))

                // Dual sync atómico si el documento en /orders existe (evita desincronización)
                if (orderSnap.exists()) {
                    transaction.update(orderRef, mapOf(
                        "courierId" to courierId,
                        "assignedCourierId" to courierId,
                        "motorizadoId" to courierId,
                        "driverName" to courierName,
                        "motorizadoNombre" to courierName,
                        "status" to "courier_accepted",
                        "estado" to "aceptado_por_courier",
                        "acceptedAt" to now,
                        "updatedAt" to now
                    ))
                }
                true
            }.await()
            Result.success(success)
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error claiming trip atomically", e)
            Result.failure(e)
        }
    }

    // Fase 10.4-C: Persistencia de Ruta Planificada (2 tramos: TO_BRANCH y TO_CUSTOMER)
    suspend fun updateOrderRouteData(
        orderId: String,
        activeLeg: String, // "TO_BRANCH" | "TO_CUSTOMER"
        legDistanceMeters: Long,
        legDurationSeconds: Long,
        encodedPolyline: String = ""
    ) {
        try {
            val orderRef = db.collection("orders").document(orderId)
            val now = com.google.firebase.Timestamp.now()
            val legData = mapOf(
                "encodedPolyline" to encodedPolyline,
                "distanceMeters" to legDistanceMeters,
                "durationSeconds" to legDurationSeconds,
                "generatedAt" to now
            )
            val legKey = if (activeLeg == "TO_BRANCH") "route.toBranch" else "route.toCustomer"
            val routeUpdate = mapOf(
                "route.version" to 1,
                "route.activeLeg" to activeLeg,
                legKey to legData,
                "route.source" to "GOOGLE_ROUTES",
                "route.updatedAt" to now
            )
            orderRef.update(routeUpdate).await()
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error updating order route data", e)
        }
    }

    // Motorizado: Actualizar estado de orden
    suspend fun updateOrderStatus(pedidoId: String, newStatus: String) {
        try {
            val pedidoRef = db.collection("orders").document(pedidoId)
            db.runTransaction { transaction ->
                val snapshot = transaction.get(pedidoRef)
                transaction.update(pedidoRef, "estado", newStatus)
                transaction.update(pedidoRef, "status", newStatus) // backward compat
                
                val historial = snapshot.get("historialEstados") as? MutableList<Map<String, Any>> ?: mutableListOf()
                historial.add(
                    mapOf(
                        "estado" to newStatus,
                        "timestamp" to System.currentTimeMillis().toString()
                    )
                )
                transaction.update(pedidoRef, "historialEstados", historial)
                
                if (newStatus == "entregado" || newStatus == "delivered") {
                    val createdAt = snapshot.getTimestamp("createdAt")?.toDate()?.time ?: System.currentTimeMillis()
                    val deliveryTimeMinutes = (System.currentTimeMillis() - createdAt) / 60000
                    com.example.AnalyticsHelper.logOrderDelivered(pedidoId, deliveryTimeMinutes)
                } else if (newStatus == "cancelado" || newStatus == "cancelled") {
                    val reason = snapshot.getString("cancellationReason") ?: "Usuario/Comercio canceló"
                    com.example.AnalyticsHelper.logOrderCancelled(pedidoId, reason)
                }
            }.await()
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error updating order status", e)
        }
    }

    // Motorizado: Actualizar ubicación y verificar Geocerca
    suspend fun updateCourierLocation(
        motorizadoId: String, 
        lat: Double, 
        lng: Double, 
        pedidoActivoId: String? = null,
        destinoLat: Double? = null,
        destinoLng: Double? = null
    ) {
        try {
            db.collection("ubicaciones_repartidores").document(motorizadoId)
                .update(
                    mapOf(
                        "coordenadas" to mapOf("latitud" to lat, "longitud" to lng),
                        "ultimaActualizacion" to System.currentTimeMillis().toString()
                    )
                ).await()
                
            // Geofence Auto-Arrived validation
            if (pedidoActivoId != null && destinoLat != null && destinoLng != null) {
                if (GeoUtils.isWithinGeofence(lat, lng, destinoLat, destinoLng, 50.0)) {
                    // Auto-actualizar estado a "repartidor_en_sitio" o "entregado"
                    updateOrderStatus(pedidoActivoId, "repartidor_en_sitio")
                }
            }
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error updating location", e)
        }
    }

    // 3. Panel del Cliente: Tracking en tiempo real
    suspend fun crearNuevoPedido(pedidoData: Map<String, Any>): String {
        return try {
            val docRef = db.collection("orders").add(pedidoData).await()
            docRef.id
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error creating order", e)
            ""
        }
    }



    fun obtenerFlujoMotorizadoAsignado(pedidoId: String): Flow<String?> = callbackFlow {
        if (pedidoId.isEmpty()) {
            trySend(null)
            awaitClose { }
            return@callbackFlow
        }
        // Escucha canónica sobre Dominio B (/deliveryTrips/{pedidoId} SSOT)
        val tripListener = db.collection("deliveryTrips").document(pedidoId)
            .addSnapshotListener { snapshot, error ->
                if (snapshot != null && snapshot.exists()) {
                    val motorizadoId = snapshot.getString("assignedCourierId")
                        ?: snapshot.getString("courierId")
                        ?: snapshot.getString("motorizadoId")
                    if (!motorizadoId.isNullOrBlank()) {
                        trySend(motorizadoId)
                    }
                }
            }

        // Compatibilidad sobre Dominio A (/orders/{pedidoId})
        val orderListener = db.collection("orders").document(pedidoId)
            .addSnapshotListener { snapshot, error ->
                if (snapshot != null && snapshot.exists()) {
                    val motorizadoId = snapshot.getString("motorizadoId")
                        ?: snapshot.getString("assignedCourierId")
                    if (!motorizadoId.isNullOrBlank()) {
                        trySend(motorizadoId)
                    }
                }
            }

        awaitClose {
            tripListener.remove()
            orderListener.remove()
        }
    }

    companion object {
        fun parsePedidoOfrecido(doc: com.google.firebase.firestore.DocumentSnapshot): PedidoOfrecido {
            val origen = doc.get("origen") as? Map<String, Any>
            val destino = doc.get("destino") as? Map<String, Any>
            val valores = doc.get("valoresMonetarios") as? Map<String, Any>

            val serviceType = doc.getString("serviceType") ?: doc.getString("type") ?: "COMMERCE_DELIVERY"

            val senderName = doc.getString("senderName") ?: (origen?.get("nombreCliente") as? String) ?: ""
            val senderPhone = doc.getString("senderPhone") ?: (origen?.get("telefono") as? String) ?: ""
            val recipientName = doc.getString("recipientName") ?: (destino?.get("nombreCliente") as? String) ?: doc.getString("customerName") ?: ""
            val recipientPhone = doc.getString("recipientPhone") ?: (destino?.get("telefono") as? String) ?: doc.getString("customerPhone") ?: ""
            val packageDescription = doc.getString("packageDescription") ?: ""
            val deliveryType = doc.getString("deliveryType") ?: "A la puerta"
            val notes = doc.getString("deliveryNote") ?: doc.getString("notes") ?: doc.getString("deliveryInstructions") ?: doc.getString("instructions") ?: ""
            val payer = doc.getString("payer") ?: "SENDER"

            val originAddressRaw = doc.getString("origin.address")
                ?: (origen?.get("direccion") as? String)
                ?: doc.getString("comercioDireccion")
                ?: doc.getString("businessAddress")
                ?: "Punto de Recogida X"

            val destAddressRaw = doc.getString("destination.address")
                ?: (destino?.get("direccion") as? String)
                ?: doc.getString("destinationAddress")
                ?: doc.getString("clienteDireccion")
                ?: "Punto de Entrega Y"

            val comercioNombre = if (serviceType == "X_TO_Y_DELIVERY") {
                if (senderName.isNotBlank()) "Remitente: $senderName" else "Punto de Recogida X"
            } else {
                doc.getString("businessName")
                    ?: doc.getString("comercioNombre")
                    ?: (origen?.get("nombreComercio") as? String ?: "Comercio")
            }

            val comercioDireccion = originAddressRaw
            val clienteDireccion = destAddressRaw

            val pagoMetodo = doc.getString("paymentMethod")
                ?: (valores?.get("metodoPago") as? String ?: "efectivo")
            val safeParseDouble = { raw: Any? ->
                when (raw) {
                    is Number -> raw.toDouble()
                    is String -> raw.replace("[^0-9.]".toRegex(), "").toDoubleOrNull()
                    else -> null
                }
            }
            val pricingSnapshotMap = doc.get("pricingSnapshot") as? Map<*, *>
            val pricingSnapshotAmount = safeParseDouble(pricingSnapshotMap?.get("calculatedAmount"))
                ?: safeParseDouble(pricingSnapshotMap?.get("totalAmount"))

            val gananciaRepartidor = safeParseDouble(doc.get("deliveryFee"))
                ?: safeParseDouble(valores?.get("costoEnvio"))
                ?: 0.0
            val calculatedFee = pricingSnapshotAmount
                ?: safeParseDouble(doc.get("calculatedFee"))
                ?: safeParseDouble(doc.get("totalPrice"))
                ?: gananciaRepartidor
            val customerOffer = safeParseDouble(doc.get("customerOffer"))
            val amountPaid = safeParseDouble(doc.get("amountPaid")) ?: 0.0
            val changeNeeded = safeParseDouble(doc.get("changeNeeded")) ?: safeParseDouble(doc.get("change")) ?: 0.0
            val distanceKm = safeParseDouble(pricingSnapshotMap?.get("routeDistanceKm"))
                ?: safeParseDouble(doc.get("distanceKm"))
                ?: 0.0

            val status = doc.getString("status") ?: doc.getString("estado") ?: "ready"
            val estado = doc.getString("estado") ?: doc.getString("status") ?: "listo"
            val assignedCourierId = doc.getString("assignedCourierId") ?: doc.getString("motorizadoId") ?: doc.getString("courierId") ?: ""
            val motorizadoId = doc.getString("motorizadoId") ?: doc.getString("assignedCourierId") ?: doc.getString("courierId") ?: ""
            val businessId = doc.getString("businessId") ?: doc.getString("comercioId") ?: ""
            val branchId = doc.getString("branchId") ?: doc.getString("restaurantBranchId") ?: ""

            val tenantId = doc.getString("commercialTenantId") ?: doc.getString("tenantId") ?: ""
            val departmentId = doc.getString("departmentId") ?: ""
            val departmentName = doc.getString("departmentName") ?: ""
            val municipalityId = doc.getString("commercialMunicipalityId") ?: doc.getString("municipalityId") ?: ""
            val municipalityName = doc.getString("municipalityName") ?: ""
            val cityId = doc.getString("cityId") ?: municipalityId
            val cityName = doc.getString("cityName") ?: doc.getString("city") ?: doc.getString("municipalityName") ?: ""

            @Suppress("UNCHECKED_CAST")
            val rejectedByCouriers = (doc.get("rejectedByCouriers") as? List<String>) ?: emptyList()
            val rejectionReason = doc.getString("rejectionReason") ?: doc.getString("motivoRechazo") ?: ""
            val rejectedAt = doc.getTimestamp("rejectedAt")?.toDate()?.time ?: doc.getLong("rejectedAt")

            val parseTs = { key: String ->
                doc.getTimestamp(key)?.toDate()?.time ?: doc.getLong(key)
            }
            val createdAt = parseTs("createdAt")
            val deliveredAt = parseTs("deliveredAt") ?: parseTs("entregadoAt")
            val completedAt = parseTs("completedAt") ?: parseTs("completadoAt")
            val updatedAt = parseTs("updatedAt")

            val total = safeParseDouble(doc.get("total")) ?: safeParseDouble(doc.get("totalPrice")) ?: (if (serviceType == "X_TO_Y_DELIVERY") (safeParseDouble(doc.get("customerTotal")) ?: safeParseDouble(doc.get("canonicalPrice")) ?: safeParseDouble(doc.get("deliveryFee")) ?: pricingSnapshotAmount ?: customerOffer ?: calculatedFee) else 0.0)
            val deliveryFee = safeParseDouble(doc.get("deliveryFee")) ?: safeParseDouble(doc.get("costoEnvio")) ?: gananciaRepartidor
            val subtotalProductos = safeParseDouble(doc.get("subtotal")) ?: (if (total > deliveryFee && serviceType != "X_TO_Y_DELIVERY") total - deliveryFee else 0.0)
            val tip = safeParseDouble(doc.get("tipAmount")) ?: safeParseDouble(doc.get("tip")) ?: safeParseDouble(doc.get("tips")) ?: safeParseDouble(doc.get("propina")) ?: 0.0
            val discountAmount = safeParseDouble(doc.get("discountAmount"))
                ?: safeParseDouble(doc.get("couponDiscount"))
                ?: safeParseDouble(doc.get("totalDiscount"))
                ?: safeParseDouble(doc.get("descuento"))
                ?: 0.0
            val couponCode = doc.getString("couponCode") ?: doc.getString("codigoCupon") ?: ""
            val additionalCharge = safeParseDouble(doc.get("additionalChargeAmount")) ?: safeParseDouble(doc.get("additionalCharge")) ?: safeParseDouble(doc.get("cargosAdicionales")) ?: 0.0
            val cashReceived = safeParseDouble(doc.get("cashReceived")) ?: 0.0

            val originLat = safeParseDouble(doc.get("businessLatitude"))
                ?: safeParseDouble((doc.get("origin") as? Map<*, *>)?.get("latitude"))
                ?: safeParseDouble(((origen?.get("coordenadas") as? Map<*, *>)?.get("latitud")))
                ?: 0.0
            val originLng = safeParseDouble(doc.get("businessLongitude"))
                ?: safeParseDouble((doc.get("origin") as? Map<*, *>)?.get("longitude"))
                ?: safeParseDouble(((origen?.get("coordenadas") as? Map<*, *>)?.get("longitud")))
                ?: 0.0
            val destLat = safeParseDouble(doc.get("destinationLatitude"))
                ?: safeParseDouble(doc.get("latitude"))
                ?: safeParseDouble((doc.get("destination") as? Map<*, *>)?.get("latitude"))
                ?: safeParseDouble(((destino?.get("coordenadas") as? Map<*, *>)?.get("latitud")))
                ?: 0.0
            val destLng = safeParseDouble(doc.get("destinationLongitude"))
                ?: safeParseDouble(doc.get("longitude"))
                ?: safeParseDouble((doc.get("destination") as? Map<*, *>)?.get("longitude"))
                ?: safeParseDouble(((destino?.get("coordenadas") as? Map<*, *>)?.get("longitud")))
                ?: 0.0

            var routeDistanceMeters = (pricingSnapshotMap?.get("routeDistanceMeters") as? Number)?.toLong()
                ?: (doc.getLong("routeDistanceMeters") ?: (safeParseDouble(doc.get("routeDistanceKm"))?.times(1000)?.toLong()))
                ?: (if (distanceKm > 0.0) (distanceKm * 1000).toLong() else 0L)
            var routeDistanceKm = safeParseDouble(pricingSnapshotMap?.get("routeDistanceKm"))
                ?: safeParseDouble(doc.get("routeDistanceKm"))
                ?: (if (distanceKm > 0.0) distanceKm else if (routeDistanceMeters > 0L) routeDistanceMeters / 1000.0 else 0.0)

            // BSD-COURIER-EARNINGS-DISTANCE-FORENSIC-001: Si no hay distancia persistida pero hay coordenadas válidas, resolver por red vial
            if (routeDistanceKm <= 0.0 && originLat != 0.0 && originLng != 0.0 && destLat != 0.0 && destLng != 0.0) {
                val straightKm = GeoUtils.calculateDistance(originLat, originLng, destLat, destLng)
                routeDistanceMeters = kotlin.math.round(straightKm * 1.28 * 1000.0).toLong()
                routeDistanceKm = kotlin.math.round((routeDistanceMeters / 1000.0) * 100.0) / 100.0
            }

            // COURIER-RATE-SSOT-REMEDIATION-004 (CR-005 CLOSED): No invented rate. 0.0 = no valid snapshot.
            val courierRatePerKmApplied = safeParseDouble(doc.get("courierRatePerKmApplied"))?.takeIf { it > 0.0 } ?: 0.0
            val courierOrderBonusApplied = if (serviceType == "X_TO_Y_DELIVERY") (safeParseDouble(doc.get("courierOrderBonusApplied")) ?: 0.0) else 0.0
            val snapshotCourierEarnings = safeParseDouble(pricingSnapshotMap?.get("courierEarnings"))
            val snapshotCourierRate = safeParseDouble(pricingSnapshotMap?.get("courierPricePerKm")) ?: courierRatePerKmApplied
            val rawDistEarnings = safeParseDouble(doc.get("courierDistanceEarnings"))
                ?: (if (routeDistanceKm > 0.0 && snapshotCourierRate > 0.0) routeDistanceKm * snapshotCourierRate else 0.0)
            val courierDistanceEarnings = if (serviceType != "X_TO_Y_DELIVERY") {
                if (snapshotCourierEarnings != null && snapshotCourierEarnings > 0.0) kotlin.math.floor(snapshotCourierEarnings)
                else if (rawDistEarnings > 0.0) kotlin.math.floor(rawDistEarnings)
                else 0.0
            } else {
                rawDistEarnings
            }
            val courierBonusEarnings = if (serviceType == "X_TO_Y_DELIVERY") (safeParseDouble(doc.get("courierBonusEarnings")) ?: courierOrderBonusApplied) else 0.0
            val courierTipEarnings = safeParseDouble(doc.get("courierTipEarnings")) ?: tip
            val calculatedCourierTotal = kotlin.math.round((courierDistanceEarnings + courierBonusEarnings + courierTipEarnings) * 100.0) / 100.0

            val courierTotalEarnings = safeParseDouble(doc.get("courierTotalEarnings"))
                ?: safeParseDouble(doc.get("courierEarnings"))
                ?: calculatedCourierTotal
            val compensatedAmount = safeParseDouble(doc.get("compensatedAmount")) ?: safeParseDouble(doc.get("totalCompensated")) ?: calculatedCourierTotal
            val distanceSource = doc.getString("distanceSource") ?: (if (routeDistanceKm > 0.0) "FALLBACK_ESTIMATED" else "")
            val orderCode = doc.getString("orderCode") ?: doc.getString("orderNumber") ?: ""
            val orderShortCode = doc.getString("orderShortCode") ?: (if (orderCode.isNotBlank()) orderCode.takeLast(4) else "")
            val orderSequence = doc.getLong("orderSequence") ?: 0L
            val orderCodePrefix = doc.getString("orderCodePrefix") ?: ""

            val effectiveGananciaRepartidor = if (serviceType == "X_TO_Y_DELIVERY") {
                val ps = doc.get("pricingSnapshot") as? Map<String, Any>
                val x2yCourierEarnings = safeParseDouble(ps?.get("courierEarnings"))
                val pPerKm = safeParseDouble(ps?.get("pricePerKm")) ?: safeParseDouble(ps?.get("perKmRate")) ?: 0.0
                val distKm = safeParseDouble(ps?.get("routeDistanceKm")) ?: safeParseDouble(ps?.get("distanceKm")) ?: routeDistanceKm
                val baseFee = safeParseDouble(ps?.get("baseFee"))
                val tipAmount = safeParseDouble(doc.get("tipAmount")) ?: safeParseDouble(doc.get("tip")) ?: 0.0

                val baseEarnings = if (x2yCourierEarnings != null && x2yCourierEarnings > 0.0) {
                    x2yCourierEarnings
                } else if (pPerKm > 0.0 && distKm > 0.0) {
                    kotlin.math.round((pPerKm * distKm) * 100.0) / 100.0
                } else if (baseFee != null && baseFee > 0.0) {
                    val total = customerOffer ?: pricingSnapshotAmount ?: calculatedFee
                    if (total > baseFee) kotlin.math.round((total - baseFee) * 100.0) / 100.0 else 0.0
                } else {
                    0.0
                }
                baseEarnings + tipAmount
            } else {
                courierDistanceEarnings + courierTipEarnings
            }

            return PedidoOfrecido(
                id = doc.id,
                comercioNombre = comercioNombre,
                comercioDireccion = comercioDireccion,
                clienteDireccion = clienteDireccion,
                pagoMetodo = pagoMetodo,
                gananciaRepartidor = effectiveGananciaRepartidor,
                status = status,
                estado = estado,
                assignedCourierId = assignedCourierId,
                motorizadoId = motorizadoId,
                serviceType = serviceType,
                businessId = businessId,
                branchId = branchId,
                rejectedByCouriers = rejectedByCouriers,
                rejectionReason = rejectionReason,
                rejectedAt = rejectedAt,
                senderName = senderName,
                senderPhone = senderPhone,
                recipientName = recipientName,
                recipientPhone = recipientPhone,
                packageDescription = packageDescription,
                deliveryType = deliveryType,
                notes = notes,
                payer = payer,
                calculatedFee = calculatedFee,
                customerOffer = customerOffer,
                amountPaid = amountPaid,
                changeNeeded = changeNeeded,
                distanceKm = if (routeDistanceKm > 0.0) routeDistanceKm else distanceKm,
                tenantId = tenantId,
                departmentId = departmentId,
                departmentName = departmentName,
                municipalityId = municipalityId,
                municipalityName = municipalityName,
                cityId = cityId,
                cityName = cityName,
                total = total,
                deliveryFee = deliveryFee,
                subtotalProductos = subtotalProductos,
                discountAmount = discountAmount,
                couponCode = couponCode,
                tip = tip,
                additionalCharge = additionalCharge,
                cashReceived = cashReceived,
                routeDistanceMeters = routeDistanceMeters,
                routeDistanceKm = routeDistanceKm,
                courierRatePerKmApplied = courierRatePerKmApplied,
                courierOrderBonusApplied = courierOrderBonusApplied,
                courierDistanceEarnings = courierDistanceEarnings,
                courierBonusEarnings = courierBonusEarnings,
                courierTipEarnings = courierTipEarnings,
                courierTotalEarnings = effectiveGananciaRepartidor,
                compensatedAmount = compensatedAmount,
                distanceSource = distanceSource,
                orderCode = orderCode,
                orderShortCode = orderShortCode,
                orderSequence = orderSequence,
                orderCodePrefix = orderCodePrefix,
                createdAt = createdAt,
                deliveredAt = deliveredAt,
                completedAt = completedAt,
                updatedAt = updatedAt
            )
        }
    }

    fun obtenerFlujoPedidosCourier(motorizadoId: String): Flow<CourierOrdersState> = callbackFlow {
        if (!isPrivateAccessAllowed() || motorizadoId.isBlank()) {
            trySend(CourierOrdersState(status = CourierUiStatus.EMPTY))
            close()
            return@callbackFlow
        }

        com.example.domain.engine.courier.CourierDebugCounters.flowCreated.incrementAndGet()
        com.example.domain.engine.courier.CourierDebugCounters.listenerCreated.addAndGet(6)
        com.example.domain.engine.courier.CourierDebugCounters.logSnapshot("FLOW_CREATED")

        val assignedOrdersMap = java.util.concurrent.ConcurrentHashMap<String, PedidoOfrecido>()
        val legacyOrdersMap = java.util.concurrent.ConcurrentHashMap<String, PedidoOfrecido>()
        val assignedTripsMap = java.util.concurrent.ConcurrentHashMap<String, PedidoOfrecido>()
        val poolOrdersMap = java.util.concurrent.ConcurrentHashMap<String, PedidoOfrecido>()
        val poolTripsMap = java.util.concurrent.ConcurrentHashMap<String, PedidoOfrecido>()

        var lastError: String? = null
        var courierTenantId = ""
        var courierCityId = ""
        var courierMuniId = ""
        var courierDeptId = ""

        // Estado Financiero Canónico del Motorizado
        var canReceiveNewOrders = true
        var financialAccessState = "ALLOW"
        var cashOutstandingCents = 0L
        var effectiveCashLimitCents = 200000L
        var hasOverdueClosure = false

        fun updateState() {
            if (lastError != null) {
                trySend(CourierOrdersState(status = CourierUiStatus.ERROR, errorMessage = lastError))
                return
            }

            val currentUid = FirebaseAuth.getInstance().currentUser?.uid ?: motorizadoId
            val isRejected = { order: PedidoOfrecido ->
                rejectedOrderIds.contains(order.id) || order.rejectedByCouriers.contains(currentUid)
            }

            val allAssignedRaw = (assignedOrdersMap.values + legacyOrdersMap.values + assignedTripsMap.values).distinctBy { it.id }

            val activeRouteOrder = allAssignedRaw.firstOrNull { order ->
                normalizeOrderStatus(order.status) in listOf("in_transit")
            }

            val assignedOrders = allAssignedRaw.filter { order ->
                !isRejected(order) && normalizeOrderStatus(order.status) in listOf("ready", "assigned")
            }

            // Validación de elegibilidad financiera estricta: si está bloqueado, NO se reciben ofertas de la bolsa (pool)
            val isFinanciallyEligible = canReceiveNewOrders &&
                !financialAccessState.startsWith("BLOCKED") &&
                !hasOverdueClosure &&
                (effectiveCashLimitCents <= 0 || cashOutstandingCents < effectiveCashLimitCents)

            val poolCommerceOrders = if (!isFinanciallyEligible) {
                emptyList()
            } else {
                poolOrdersMap.values.filter { order ->
                    val isNotRejected = !isRejected(order)
                    val isReady = normalizeOrderStatus(order.status) in listOf("ready")
                    val isUnassigned = order.assignedCourierId.isEmpty() && order.motorizadoId.isEmpty()
                    val isCommerce = order.serviceType != "X_TO_Y_DELIVERY"

                    val isSameTenant = courierTenantId.isBlank() || order.tenantId.isBlank() ||
                        courierTenantId == order.tenantId ||
                        (courierTenantId in listOf("ten_bluesystem_core", "default", "") && (order.tenantId.isBlank() || order.tenantId in listOf("ten_bluesystem_core", "default")))
                    val courierEffectiveMuni = courierMuniId.ifBlank { courierCityId }.trim().uppercase()
                    val orderEffectiveMuni = order.municipalityId.ifBlank { order.cityId }.trim().uppercase()
                    val isSameMunicipality = courierEffectiveMuni.isNotBlank() && orderEffectiveMuni.isNotBlank() && courierEffectiveMuni == orderEffectiveMuni

                    isNotRejected && isReady && isUnassigned && isCommerce && isSameTenant && isSameMunicipality
                }
            }

            val poolXToYOrders = if (!isFinanciallyEligible) {
                emptyList()
            } else {
                poolTripsMap.values.filter { order ->
                    val isNotRejected = !isRejected(order)
                    val isReady = normalizeOrderStatus(order.status) in listOf("ready", "pending")
                    val isUnassigned = order.assignedCourierId.isEmpty() && order.motorizadoId.isEmpty()
                    val isXToY = order.serviceType == "X_TO_Y_DELIVERY"

                    val courierEffectiveMuni = courierMuniId.ifBlank { courierCityId }.trim().uppercase()
                    val orderEffectiveMuni = order.municipalityId.ifBlank { order.cityId }.trim().uppercase()
                    val isSameMunicipality = courierEffectiveMuni.isBlank() || orderEffectiveMuni.isBlank() || courierEffectiveMuni == orderEffectiveMuni

                    isNotRejected && isReady && isUnassigned && isXToY && isSameMunicipality
                }
            }

            val poolOrders = (poolCommerceOrders + poolXToYOrders).distinctBy { it.id }

            val uiStatus = when {
                activeRouteOrder != null -> CourierUiStatus.ACTIVE_ROUTE
                assignedOrders.isNotEmpty() -> CourierUiStatus.ASSIGNED_ORDERS
                poolOrders.isNotEmpty() -> CourierUiStatus.POOL_ORDERS
                else -> CourierUiStatus.EMPTY
            }

            com.example.domain.engine.courier.CourierDebugCounters.stateEmissions.incrementAndGet()
            Log.d("FLOTA_DEBUG", "FIRESTORE_COURIER_FLOW: uiStatus=$uiStatus, isFinanciallyEligible=$isFinanciallyEligible, pool=${poolOrders.size}, assigned=${assignedOrders.size}, route=${activeRouteOrder?.id}")
            trySend(
                CourierOrdersState(
                    status = uiStatus,
                    poolOrders = poolOrders,
                    assignedOrders = assignedOrders,
                    activeRouteOrder = activeRouteOrder
                )
            )
        }

        Log.d("COURIER_QUERY", "Starting targeted listeners for motorizadoId=$motorizadoId")

        // 0. Escuchar estado financiero canónico (/courier_balances/{motorizadoId})
        val listenerCourierBalance = db.collection("courier_balances").document(motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w("FirebaseManager", "[COURIER_QUERY] listenerCourierBalance error: ${error.message}")
                } else if (snapshot != null && snapshot.exists()) {
                    canReceiveNewOrders = snapshot.getBoolean("canReceiveNewOrders") ?: true
                    financialAccessState = snapshot.getString("financialAccessState") ?: "ALLOW"
                    cashOutstandingCents = snapshot.getLong("cashOutstandingCents") ?: 0L
                    effectiveCashLimitCents = snapshot.getLong("effectiveCashLimitCents")
                        ?: snapshot.getLong("cashLimitCents")
                        ?: 200000L
                    hasOverdueClosure = snapshot.getBoolean("hasOverdueClosure") ?: false
                    Log.d("FLOTA_DEBUG", "COURIER_BALANCE_UPDATE: canReceiveNewOrders=$canReceiveNewOrders, state=$financialAccessState, cash=$cashOutstandingCents, limit=$effectiveCashLimitCents, overdue=$hasOverdueClosure")
                }
                updateState()
            }

        var listenerPool: com.google.firebase.firestore.ListenerRegistration? = null
        var currentPoolMuni: String? = null
        var currentPoolTenant: String? = null

        fun attachPoolListenerIfNeeded(muni: String, tenant: String) {
            val normMuni = muni.trim().uppercase()
            val normTenant = tenant.trim()
            if (normMuni.isBlank()) return
            if (normMuni == currentPoolMuni && normTenant == currentPoolTenant && listenerPool != null) return

            listenerPool?.remove()
            currentPoolMuni = normMuni
            currentPoolTenant = normTenant

            var poolQuery: com.google.firebase.firestore.Query = db.collection("orders")
                .whereEqualTo("commercialMunicipalityId", normMuni)
                .whereIn("status", listOf("ready", "READY", "listo", "LISTO"))

            if (normTenant.isNotBlank() && normTenant !in listOf("ten_bluesystem_core", "default")) {
                poolQuery = poolQuery.whereEqualTo("commercialTenantId", normTenant)
            }

            Log.d("COURIER_QUERY", "Attaching partitioned pool listener: muni=$normMuni, tenant=$normTenant")
            listenerPool = poolQuery.addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w("FirebaseManager", "[COURIER_QUERY] listenerPool error: ${error.message}")
                    return@addSnapshotListener
                }
                poolOrdersMap.clear()
                snapshot?.documents?.forEach { doc ->
                    poolOrdersMap[doc.id] = parsePedidoOfrecido(doc)
                }
                updateState()
            }
        }

        // 1. Escuchar perfil de usuario y courier
        val listenerUserProfile = db.collection("users").document(motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w("FirebaseManager", "[COURIER_QUERY] listenerUserProfile error: ${error.message}")
                } else if (snapshot != null && snapshot.exists()) {
                    courierTenantId = snapshot.getString("commercialTenantId") ?: snapshot.getString("tenantId") ?: snapshot.getString("activeTenantId") ?: courierTenantId
                    courierCityId = snapshot.getString("operationalMunicipalityId") ?: snapshot.getString("municipalityId") ?: snapshot.getString("cityId") ?: snapshot.getString("city") ?: snapshot.getString("ciudad") ?: courierCityId
                    courierMuniId = snapshot.getString("operationalMunicipalityId") ?: snapshot.getString("municipalityId") ?: snapshot.getString("cityId") ?: snapshot.getString("city") ?: snapshot.getString("ciudad") ?: courierMuniId
                    courierDeptId = snapshot.getString("departmentId") ?: courierDeptId
                    attachPoolListenerIfNeeded(courierMuniId, courierTenantId)
                }
                updateState()
            }

        val listenerCourierProfile = db.collection("couriers").document(motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error == null && snapshot != null && snapshot.exists()) {
                    courierTenantId = snapshot.getString("commercialTenantId") ?: snapshot.getString("tenantId") ?: courierTenantId
                    courierCityId = snapshot.getString("operationalMunicipalityId") ?: snapshot.getString("municipalityId") ?: snapshot.getString("cityId") ?: snapshot.getString("city") ?: snapshot.getString("ciudad") ?: courierCityId
                    courierMuniId = snapshot.getString("operationalMunicipalityId") ?: snapshot.getString("municipalityId") ?: snapshot.getString("cityId") ?: snapshot.getString("city") ?: snapshot.getString("municipalityName") ?: courierMuniId
                    courierDeptId = snapshot.getString("departmentName") ?: courierDeptId
                    attachPoolListenerIfNeeded(courierMuniId, courierTenantId)
                }
                updateState()
            }

        // 2. Pedidos asignados canónicos (/orders)
        val listenerAssigned = db.collection("orders")
            .whereEqualTo("assignedCourierId", motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    lastError = error.message
                    updateState()
                    return@addSnapshotListener
                }
                lastError = null
                assignedOrdersMap.clear()
                snapshot?.documents?.forEach { doc ->
                    assignedOrdersMap[doc.id] = parsePedidoOfrecido(doc)
                }
                updateState()
            }

        // 3. Pedidos asignados legacy (/orders)
        val listenerLegacy = db.collection("orders")
            .whereEqualTo("motorizadoId", motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) return@addSnapshotListener
                legacyOrdersMap.clear()
                snapshot?.documents?.forEach { doc ->
                    legacyOrdersMap[doc.id] = parsePedidoOfrecido(doc)
                }
                updateState()
            }

        // 4. Encomiendas X→Y asignadas (/deliveryTrips)
        val listenerTripsAssigned = db.collection("deliveryTrips")
            .whereEqualTo("assignedCourierId", motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) return@addSnapshotListener
                assignedTripsMap.clear()
                snapshot?.documents?.forEach { doc ->
                    assignedTripsMap[doc.id] = parsePedidoOfrecido(doc)
                }
                updateState()
            }

        // 5. Fleet Pool Encomiendas X→Y (/deliveryTrips)
        // Dirigido por eligibleCouriers para respetar reglas de seguridad EIAM y privacidad de clientes
        val listenerXToYPool = db.collection("deliveryTrips")
            .whereArrayContains("eligibleCouriers", motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w("FirebaseManager", "listenerXToYPool snapshot error para courier $motorizadoId: ${error.message}", error)
                    return@addSnapshotListener
                }
                poolTripsMap.clear()
                snapshot?.documents?.forEach { doc ->
                    val status = (doc.getString("status") ?: "").uppercase()
                    val assigned = doc.getString("assignedCourierId") ?: doc.getString("courierId") ?: ""
                    if (status in listOf("PENDING", "READY", "LISTO") && assigned.isBlank()) {
                        poolTripsMap[doc.id] = parsePedidoOfrecido(doc)
                    }
                }
                updateState()
            }

        awaitClose {
            com.example.domain.engine.courier.CourierDebugCounters.listenerRemoved.addAndGet(7)
            com.example.domain.engine.courier.CourierDebugCounters.logSnapshot("FLOW_CLOSED")
            listenerCourierBalance.remove()
            listenerUserProfile.remove()
            listenerCourierProfile.remove()
            listenerAssigned.remove()
            listenerLegacy.remove()
            listenerTripsAssigned.remove()
            listenerPool?.remove()
            listenerXToYPool.remove()
        }
    }

    fun obtenerHistorialCourier(motorizadoId: String): Flow<List<PedidoOfrecido>> = callbackFlow {
        if (!isPrivateAccessAllowed() || motorizadoId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }
        val assignedList = mutableListOf<PedidoOfrecido>()
        val legacyList = mutableListOf<PedidoOfrecido>()
        val tripsList = mutableListOf<PedidoOfrecido>()

        fun emitCombined() {
            val combined = (assignedList + legacyList + tripsList).distinctBy { it.id }
            trySend(combined)
        }

        val listenerAssigned = db.collection("orders")
            .whereEqualTo("assignedCourierId", motorizadoId)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error al obtener historial (assigned)", error)
                    return@addSnapshotListener
                }
                assignedList.clear()
                snapshot?.documents?.forEach { assignedList.add(parsePedidoOfrecido(it)) }
                emitCombined()
            }

        val listenerLegacy = db.collection("orders")
            .whereEqualTo("motorizadoId", motorizadoId)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error al obtener historial (legacy)", error)
                    return@addSnapshotListener
                }
                legacyList.clear()
                snapshot?.documents?.forEach { legacyList.add(parsePedidoOfrecido(it)) }
                emitCombined()
            }

        val listenerTrips = db.collection("deliveryTrips")
            .whereEqualTo("assignedCourierId", motorizadoId)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error al obtener historial (trips)", error)
                    return@addSnapshotListener
                }
                tripsList.clear()
                snapshot?.documents?.forEach { tripsList.add(parsePedidoOfrecido(it)) }
                emitCombined()
            }

        awaitClose {
            listenerAssigned.remove()
            listenerLegacy.remove()
            listenerTrips.remove()
        }
    }

    suspend fun aceptarPedido(pedidoId: String, motorizadoId: String = "") {
        try {
            val resolvedMotorizadoId = if (motorizadoId.isNotBlank()) {
                motorizadoId
            } else {
                com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""
            }
            if (resolvedMotorizadoId.isBlank()) {
                throw IllegalStateException("No hay sesión de motorizado activa para aceptar el pedido.")
            }
            android.util.Log.d("FLOTA_DEBUG", "ORDER_ASSIGNMENT_START | pedidoId=$pedidoId, courierUid=$resolvedMotorizadoId")

            val orderDocRef = db.collection("orders").document(pedidoId)
            val tripDocRef = db.collection("deliveryTrips").document(pedidoId)
            val courierDocRef = db.collection("users").document(resolvedMotorizadoId)
            val courierProfileRef = db.collection("couriers").document(resolvedMotorizadoId)
            val balanceDocRef = db.collection("courier_balances").document(resolvedMotorizadoId)

            db.runTransaction { transaction ->
                // --- FASE 1: TODAS LAS LECTURAS (READS UPFRONT) ---
                android.util.Log.d("FLOTA_DEBUG", "Paso 1: Leyendo balance $resolvedMotorizadoId")
                val balanceSnap = transaction.get(balanceDocRef)

                android.util.Log.d("FLOTA_DEBUG", "Paso 2: Leyendo users/$resolvedMotorizadoId")
                val courierSnap = transaction.get(courierDocRef)

                android.util.Log.d("FLOTA_DEBUG", "Paso 3: Leyendo couriers/$resolvedMotorizadoId")
                val courierProfileSnap = transaction.get(courierProfileRef)

                android.util.Log.d("FLOTA_DEBUG", "Paso 4: Leyendo orders/$pedidoId")
                val orderSnap = transaction.get(orderDocRef)

                android.util.Log.d("FLOTA_DEBUG", "Paso 5: Leyendo deliveryTrips/$pedidoId")
                val tripSnap = transaction.get(tripDocRef)

                // --- FASE 2: VALIDACIONES IN-MEMORY ---
                if (!orderSnap.exists() && !tripSnap.exists()) {
                    throw Exception("El pedido o encomienda $pedidoId no fue encontrado.")
                }

                if (balanceSnap.exists()) {
                    val canReceive = balanceSnap.getBoolean("canReceiveNewOrders") ?: true
                    val accessState = balanceSnap.getString("financialAccessState") ?: "ALLOW"
                    val cashCents = balanceSnap.getLong("cashOutstandingCents") ?: 0L
                    val limitCents = balanceSnap.getLong("effectiveCashLimitCents")
                        ?: balanceSnap.getLong("cashLimitCents")
                        ?: 200000L
                    val hasOverdue = balanceSnap.getBoolean("hasOverdueClosure") ?: false
                    val reason = balanceSnap.getString("financialAccessReason") ?: "Límite de efectivo alcanzado o cierre diario pendiente."

                    if (!canReceive || accessState.startsWith("BLOCKED") || hasOverdue || (limitCents > 0 && cashCents >= limitCents)) {
                        throw Exception("Bloqueo Financiero Operacional: $reason")
                    }
                }

                val courierTenant = courierSnap.getString("tenantId") ?: courierSnap.getString("activeTenantId") ?: courierProfileSnap.getString("tenantId") ?: ""
                val courierMuni = courierSnap.getString("municipalityId") ?: courierSnap.getString("cityId") ?: courierProfileSnap.getString("municipalityName") ?: courierProfileSnap.getString("city") ?: ""

                if (orderSnap.exists()) {
                    val currentStatus = (orderSnap.getString("status") ?: orderSnap.getString("estado") ?: "").lowercase()
                    val serviceType = orderSnap.getString("serviceType") ?: "COMMERCE_DELIVERY"
                    val orderTenant = orderSnap.getString("tenantId") ?: ""
                    val orderMuni = orderSnap.getString("municipalityId") ?: orderSnap.getString("cityId") ?: orderSnap.getString("city") ?: ""

                    // Lock Atómico de Asignación Concurrente (BSD-C4-004)
                    val existingCourier = orderSnap.getString("assignedCourierId") ?: orderSnap.getString("motorizadoId")
                    if (!existingCourier.isNullOrEmpty() && existingCourier != resolvedMotorizadoId) {
                        throw Exception("Lock Atómico: El pedido ya fue aceptado por otro motorizado.")
                    }

                    if (currentStatus !in listOf("ready", "listo", "assigned", "asignado", "courier_accepted")) {
                        throw Exception("El pedido no está disponible en estado de asignación (estado actual: $currentStatus)")
                    }

                    if (serviceType != "X_TO_Y_DELIVERY") {
                        if (courierTenant.isNotBlank() && orderTenant.isNotBlank() && courierTenant != orderTenant) {
                            throw Exception("Rechazo Operacional: Incompatibilidad de Tenant ($courierTenant vs $orderTenant)")
                        }
                        if (courierMuni.isNotBlank() && orderMuni.isNotBlank()) {
                            val sameMuni = courierMuni.trim().uppercase() == orderMuni.trim().uppercase()
                            if (!sameMuni) {
                                throw Exception("Rechazo Operacional: Incompatibilidad de Municipio ($courierMuni vs $orderMuni)")
                            }
                        }
                    }
                }

                if (tripSnap.exists()) {
                    val tripStatus = (tripSnap.getString("status") ?: tripSnap.getString("estado") ?: "").uppercase()
                    if (tripStatus in listOf("CANCELLED", "TIMEOUT")) {
                        throw Exception("Lock Atómico: La encomienda fue cancelada o expiró.")
                    }
                    val existingTripCourier = tripSnap.getString("assignedCourierId") ?: tripSnap.getString("courierId") ?: tripSnap.getString("motorizadoId")
                    if (!existingTripCourier.isNullOrEmpty() && existingTripCourier != resolvedMotorizadoId) {
                        throw Exception("Lock Atómico: La encomienda ya fue aceptada por otro motorizado.")
                    }
                    if (!orderSnap.exists() && tripStatus !in listOf("PENDING", "READY", "LISTO", "ASSIGNED", "ASIGNADO")) {
                        throw Exception("La encomienda no está disponible en estado de asignación (estado actual: $tripStatus)")
                    }
                }

                // --- FASE 3: TODAS LAS ESCRITURAS (WRITES) ---
                val now = com.google.firebase.Timestamp.now()
                if (orderSnap.exists()) {
                    android.util.Log.d("FLOTA_DEBUG", "Paso 6: Ejecutando update atómico en orders/$pedidoId")
                    transaction.update(orderDocRef, mapOf(
                        "status" to "courier_accepted",
                        "estado" to "aceptado_por_courier",
                        "courierPhase" to 1,
                        "assignedCourierId" to resolvedMotorizadoId,
                        "motorizadoId" to resolvedMotorizadoId,
                        "acceptedAt" to now,
                        "updatedAt" to now
                    ))
                }

                if (tripSnap.exists()) {
                    android.util.Log.d("FLOTA_DEBUG", "Paso 7: Ejecutando update atómico en deliveryTrips/$pedidoId")
                    transaction.update(tripDocRef, mapOf(
                        "status" to "ASSIGNED",
                        "estado" to "asignado",
                        "assignedCourierId" to resolvedMotorizadoId,
                        "courierId" to resolvedMotorizadoId,
                        "motorizadoId" to resolvedMotorizadoId,
                        "acceptedAt" to now,
                        "updatedAt" to now
                    ))
                }
            }.await()
            android.util.Log.d("FLOTA_DEBUG", "ORDER_ASSIGNMENT_COMMIT | pedidoId=$pedidoId asignado a $resolvedMotorizadoId")
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error al aceptar pedido $pedidoId", e)
            throw e
        }
    }

    private val rejectedOrderIds = java.util.Collections.synchronizedSet(mutableSetOf<String>())

    suspend fun rechazarPedido(pedidoId: String, motivo: String = "No especificado", motorizadoId: String = "") {
        try {
            val resolvedUid = if (motorizadoId.isNotBlank()) motorizadoId else (FirebaseAuth.getInstance().currentUser?.uid ?: "")
            Log.d("COURIER_REJECT", "Ejecutando rechazo atómico en Firestore para pedidoId=$pedidoId por uid=$resolvedUid con motivo: $motivo")
            rejectedOrderIds.add(pedidoId)
            val docRef = db.collection("orders").document(pedidoId)

            db.runTransaction { transaction ->
                val snapshot = transaction.get(docRef)
                if (snapshot.exists()) {
                    val rejectionEvent = mapOf(
                        "courierId" to resolvedUid,
                        "timestamp" to com.google.firebase.Timestamp.now(),
                        "reason" to motivo,
                        "orderId" to pedidoId
                    )

                    val updates = mutableMapOf<String, Any>(
                        "status" to "ready",
                        "estado" to "listo",
                        "assignedCourierId" to "",
                        "motorizadoId" to "",
                        "driverName" to "",
                        "motorizadoNombre" to "",
                        "courierPhase" to 1,
                        "rejectionReason" to motivo,
                        "rejectedAt" to com.google.firebase.Timestamp.now(),
                        "updatedAt" to com.google.firebase.Timestamp.now(),
                        "rejectionHistory" to com.google.firebase.firestore.FieldValue.arrayUnion(rejectionEvent)
                    )
                    if (resolvedUid.isNotEmpty()) {
                        updates["rejectedByCouriers"] = com.google.firebase.firestore.FieldValue.arrayUnion(resolvedUid)
                    }
                    transaction.update(docRef, updates)
                }
            }.await()

            try {
                val tripRef = db.collection("deliveryTrips").document(pedidoId)
                val tripSnap = tripRef.get().await()
                if (tripSnap.exists()) {
                    val tripUpdates = mutableMapOf<String, Any>(
                        "status" to "PENDING",
                        "estado" to "listo",
                        "assignedCourierId" to "",
                        "motorizadoId" to "",
                        "driverName" to "",
                        "motorizadoNombre" to "",
                        "rejectionReason" to motivo,
                        "rejectedAt" to com.google.firebase.Timestamp.now(),
                        "updatedAt" to com.google.firebase.Timestamp.now()
                    )
                    if (resolvedUid.isNotEmpty()) {
                        tripUpdates["rejectedByCouriers"] = com.google.firebase.firestore.FieldValue.arrayUnion(resolvedUid)
                    }
                    tripRef.update(tripUpdates).await()
                }
            } catch (e: Exception) {
                Log.w("COURIER_REJECT", "Aviso: no se requirió actualizar deliveryTrips para $pedidoId (${e.message})")
            }

            Log.d("COURIER_REJECT", "Pedido $pedidoId desasignado y marcado como rechazado exitosamente en Firestore")
        } catch (e: Exception) {
            Log.e("COURIER_REJECT", "Error al rechazar el pedido $pedidoId", e)
        }
    }

    fun obtenerHistorialRechazadosCourier(motorizadoId: String): Flow<List<PedidoOfrecido>> = callbackFlow {
        if (!isPrivateAccessAllowed() || motorizadoId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }
        android.util.Log.d("COURIER_REJECT", "Iniciando listener de historial de rechazados para courier=$motorizadoId")
        val rejectedOrdersMap = java.util.concurrent.ConcurrentHashMap<String, PedidoOfrecido>()
        val rejectedTripsMap = java.util.concurrent.ConcurrentHashMap<String, PedidoOfrecido>()

        fun emitCombined() {
            val all = (rejectedOrdersMap.values + rejectedTripsMap.values).sortedByDescending { it.rejectedAt ?: it.createdAt ?: 0L }
            trySend(all)
        }

        val listenerOrders = db.collection("orders")
            .whereArrayContains("rejectedByCouriers", motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.e("COURIER_REJECT", "Error Firestore en historial de rechazados (orders): ${error.message}")
                    return@addSnapshotListener
                }
                rejectedOrdersMap.clear()
                snapshot?.documents?.forEach { rejectedOrdersMap[it.id] = parsePedidoOfrecido(it) }
                emitCombined()
            }

        val listenerTrips = db.collection("deliveryTrips")
            .whereArrayContains("rejectedByCouriers", motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.e("COURIER_REJECT", "Error Firestore en historial de rechazados (trips): ${error.message}")
                    return@addSnapshotListener
                }
                rejectedTripsMap.clear()
                snapshot?.documents?.forEach { rejectedTripsMap[it.id] = parsePedidoOfrecido(it) }
                emitCombined()
            }

        awaitClose {
            listenerOrders.remove()
            listenerTrips.remove()
        }
    }

    suspend fun actualizarEstadoPedido(pedidoId: String, nuevoEstado: String) {
        try {
            db.collection("orders").document(pedidoId)
                .update("status", nuevoEstado).await()

            // Generar notificación en tiempo real para el cliente
            val orderSnap = db.collection("orders").document(pedidoId).get().await()
            if (orderSnap.exists()) {
                val customerId = orderSnap.getString("customerId") ?: orderSnap.getString("clienteId") ?: orderSnap.getString("userId") ?: ""
                val businessName = orderSnap.getString("businessName") ?: "Comercio"
                if (customerId.isNotEmpty()) {
                    val notifId = "notif_" + java.util.UUID.randomUUID().toString().take(12)
                    val statusText = when(nuevoEstado) {
                        "pending" -> "Pendiente de Confirmación ⏳"
                        "preparing" -> "En Preparación por el Comercio 👨‍🍳"
                        "ready" -> "Listo para Recoger 📦"
                        "in_transit", "EN_RUTA" -> "En Camino a tu Dirección 🛵"
                        "delivered" -> "Entregado con Éxito 🎉"
                        "cancelled" -> "Cancelado ❌"
                        else -> nuevoEstado
                    }
                    
                    val notifData = mapOf(
                        "id" to notifId,
                        "title" to "Actualización de Pedido 🚀",
                        "body" to "Tu pedido #${pedidoId.takeLast(6).uppercase()} en $businessName cambió a: $statusText",
                        "type" to "ORDER_STATUS",
                        "category" to "orders",
                        "orderId" to pedidoId,
                        "sentAt" to com.google.firebase.Timestamp.now(),
                        "isRead" to false,
                        "read" to false
                    )
                    
                    db.collection("users").document(customerId)
                        .collection("notifications").document(notifId)
                        .set(notifData).await()
                        
                    Log.d("FirebaseManager", "NOTIFICACIÓN GENERADA AUTOMÁTICAMENTE para $customerId: $statusText")
                }
            }
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error updating order status or creating notification", e)
        }
    }

    fun listenToOrder(pedidoId: String): Flow<Pedido?> = callbackFlow {
        if (pedidoId.isEmpty()) {
            trySend(null)
            awaitClose { }
            return@callbackFlow
        }
        val listener = db.collection("orders").document(pedidoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToOrder", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    trySend(snapshot.toObject(Pedido::class.java))
                } else {
                    trySend(null)
                }
            }
        awaitClose { listener.remove() }
    }

    fun listenToDeliveryTrip(tripId: String): Flow<com.google.firebase.firestore.DocumentSnapshot?> = callbackFlow {
        if (tripId.isEmpty()) {
            trySend(null)
            awaitClose { }
            return@callbackFlow
        }
        val listener = db.collection("deliveryTrips").document(tripId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToDeliveryTrip", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    trySend(snapshot)
                } else {
                    trySend(null)
                }
            }
        awaitClose { listener.remove() }
    }

    fun listenToCourierLocation(motorizadoId: String): Flow<UbicacionRepartidor?> = callbackFlow {
        if (motorizadoId.isEmpty()) {
            trySend(null)
            awaitClose { }
            return@callbackFlow
        }
        val listener = db.collection("ubicaciones_repartidores").document(motorizadoId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToCourierLocation", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    trySend(snapshot.toObject(UbicacionRepartidor::class.java))
                } else {
                    trySend(null)
                }
            }
        awaitClose { listener.remove() }
    }

    fun obtenerFlujoMotorizadosActivos(): Flow<List<MotorizadoActivo>> = callbackFlow {
        if (!isPrivateAccessAllowed()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }
        val listener = db.collection("ubicaciones_repartidores")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in obtenerFlujoMotorizadosActivos", error)
                    close()
                    return@addSnapshotListener
                }
                
                if (snapshot != null) {
                    val motorizados = snapshot.documents.mapNotNull { doc ->
                        try {
                            val ubicacion = doc.toObject(UbicacionRepartidor::class.java)
                            val docName = doc.getString("nombre")
                                ?: doc.getString("name")
                                ?: doc.getString("motorizadoNombre")
                                ?: doc.getString("courierName")
                                ?: ""

                            if (ubicacion != null) {
                                val courierId = if (ubicacion.motorizadoId.isNotBlank()) ubicacion.motorizadoId else doc.id
                                MotorizadoActivo(
                                    id = courierId,
                                    nombre = if (docName.isNotBlank()) docName else "Motorizado ${doc.id.takeLast(4)}",
                                    latitud = ubicacion.coordenadas.latitud,
                                    longitud = ubicacion.coordenadas.longitud,
                                    estado = ubicacion.estadoDisponibilidad.ifEmpty { "activo" }
                                )
                            } else {
                                val coordsMap = doc.get("coordenadas") as? Map<*, *>
                                val lat = (coordsMap?.get("latitud") as? Number)?.toDouble() ?: 0.0
                                val lng = (coordsMap?.get("longitud") as? Number)?.toDouble() ?: 0.0
                                val estado = doc.getString("estadoDisponibilidad") ?: "activo"
                                MotorizadoActivo(
                                    id = doc.id,
                                    nombre = if (docName.isNotBlank()) docName else "Motorizado ${doc.id.takeLast(4)}",
                                    latitud = lat,
                                    longitud = lng,
                                    estado = estado
                                )
                            }
                        } catch (e: Exception) {
                            Log.w("FirebaseManager", "Fallo al deserializar ubicacion de motorizado doc: ${doc.id}", e)
                            null
                        }
                    }
                    trySend(motorizados)
                }
            }
        awaitClose { listener.remove() }
    }

    suspend fun buscarDireccionLocal(query: String): DireccionCacheada? {
        return try {
            val queryLower = query.lowercase().trim()
            val snapshot = db.collection("direcciones_frecuentes")
                .whereGreaterThanOrEqualTo("searchText", queryLower)
                .whereLessThanOrEqualTo("searchText", queryLower + "\uf8ff")
                .limit(1)
                .get()
                .await()
            if (!snapshot.isEmpty) {
                snapshot.documents.first().toObject(DireccionCacheada::class.java)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error searching local cache", e)
            null
        }
    }

    suspend fun guardarDireccionCache(direccion: DireccionCacheada) {
        try {
            db.collection("direcciones_frecuentes").document(direccion.id)
                .set(direccion).await()
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error saving to cache", e)
        }
    }

    fun listenToAllOrders(): Flow<List<Pedido>> = callbackFlow {
        if (!isPrivateAccessAllowed()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }
        val listener = db.collection("orders")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToAllOrders", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    try {
                        val pedidos = snapshot.toObjects(Pedido::class.java)
                        trySend(pedidos)
                    } catch (e: Exception) {
                        Log.e("FirebaseManager", "Error deserializing assigned orders", e)
                        trySend(emptyList())
                    }
                }
            }
        awaitClose { listener.remove() }
    }

    fun listenToPedidos(): Flow<List<Pedido>> = callbackFlow {
        if (!isPrivateAccessAllowed()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }
        val listener = db.collection("orders")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToPedidos", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val orders = snapshot.documents.mapNotNull { doc ->
                        try {
                            val order = doc.toObject(Pedido::class.java)
                            order?.copy(pedidoId = doc.id)
                        } catch (e: Exception) {
                            Log.e("FirebaseManager", "Error parsing Pedido", e)
                            null
                        }
                    }
                    trySend(orders)
                }
            }
        awaitClose { listener.remove() }
    }

    fun listenToDrivers(): Flow<List<DriverUser>> = callbackFlow {
        val listener = db.collection("users")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToDrivers", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val drivers = snapshot.documents.mapNotNull { doc ->
                        try {
                            val r = listOfNotNull(
                                doc.getString("role"),
                                doc.getString("eiamRole"),
                                doc.getString("rol"),
                                doc.getString("userType"),
                                doc.getString("tipo")
                            ).joinToString(" ").lowercase()

                            val isDriver = r.contains("motorizado") ||
                                    r.contains("courier") ||
                                    r.contains("driver") ||
                                    r.contains("repartidor")

                            if (isDriver) {
                                val email = doc.getString("email") ?: ""
                                val nombre = doc.getString("nombre")
                                    ?: doc.getString("name")
                                    ?: doc.getString("displayName")
                                    ?: ""
                                val telefono = doc.getString("telefono")
                                    ?: doc.getString("phone")
                                    ?: doc.getString("celular")
                                    ?: ""
                                val userType = doc.getString("userType") ?: doc.getString("role") ?: "driver"
                                val active = doc.getBoolean("active") ?: true
                                DriverUser(
                                    uid = doc.id,
                                    nombre = nombre,
                                    email = email,
                                    telefono = telefono,
                                    userType = userType,
                                    active = active
                                )
                            } else null
                        } catch (e: Exception) {
                            Log.e("FirebaseManager", "Error parsing DriverUser", e)
                            null
                        }
                    }
                    trySend(drivers)
                }
            }
        awaitClose { listener.remove() }
    }

    fun listenToAllUsers(): Flow<List<AppUser>> = callbackFlow {
        val listener = db.collection("users")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToAllUsers", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val users = snapshot.documents.mapNotNull { doc ->
                        try {
                            val email = doc.getString("email") ?: ""
                            val nombre = doc.getString("nombre") ?: doc.getString("name") ?: ""
                            val telefono = doc.getString("telefono") ?: doc.getString("phone") ?: ""
                            val userType = doc.getString("userType") ?: ""
                            val active = doc.getBoolean("active") ?: false
                            AppUser(
                                uid = doc.id,
                                nombre = nombre,
                                email = email,
                                telefono = telefono,
                                userType = userType,
                                role = doc.getString("role") ?: doc.getString("rol") ?: "",
                                requestedRole = doc.getString("requestedRole") ?: "",
                                active = active
                            )
                        } catch (e: Exception) {
                            Log.e("FirebaseManager", "Error parsing AppUser", e)
                            null
                        }
                    }
                    trySend(users)
                }
            }
        awaitClose { listener.remove() }
    }

    suspend fun actualizarUsuario(uid: String, nombre: String, telefono: String, userType: String): Boolean {
        return try {
            db.collection("users").document(uid).update(
                mapOf(
                    "nombre" to nombre,
                    "name" to nombre,
                    "telefono" to telefono,
                    "phone" to telefono,
                    "userType" to userType
                )
            ).await()
            true
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error updating user $uid", e)
            false
        }
    }

    suspend fun eliminarUsuario(uid: String): Boolean {
        return try {
            db.collection("users").document(uid).delete().await()
            true
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error deleting user $uid", e)
            false
        }
    }

    fun listenToActiveCustomerOrder(clienteId: String): Flow<Pedido?> = callbackFlow {
        val listener = db.collection("orders")
            .whereEqualTo("customerId", clienteId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToActiveCustomerOrder", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    try {
                        val pedidos = snapshot.toObjects(Pedido::class.java)
                        val activePedido = pedidos.firstOrNull { it.estado != "entregado" }
                        trySend(activePedido)
                    } catch (e: Exception) {
                        Log.e("FirebaseManager", "Error deserializing Pedido (customer flow)", e)
                        trySend(null)
                    }
                } else {
                    trySend(null)
                }
            }
        awaitClose { listener.remove() }
    }

    fun listenToBusinessOrders(businessId: String): Flow<List<Pedido>> = callbackFlow {
        val listener = db.collection("orders")
            .whereEqualTo("businessId", businessId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToBusinessOrders", error)
                    close()
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    try {
                        val pedidos = snapshot.toObjects(Pedido::class.java)
                        trySend(pedidos)
                    } catch (e: Exception) {
                        Log.e("FirebaseManager", "Error deserializing Pedidos", e)
                        trySend(emptyList())
                    }
                } else {
                    trySend(emptyList())
                }
            }
        awaitClose { listener.remove() }
    }

    suspend fun actualizarAtributoPedido(pedidoId: String, campo: String, valor: Any) {
        try {
            db.collection("orders").document(pedidoId)
                .update(campo, valor).await()
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error updating order attribute $campo for $pedidoId", e)
        }
    }

    suspend fun updateUserRole(
        userId: String,
        newRole: String,
        changedByAdminId: String = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "",
        reason: String = "Cambio manual por admin",
        previousRole: String = ""
    ): Boolean {
        return try {
            val userRef = db.collection("users").document(userId)
            val docSnapshot = userRef.get().await()
            val prevRole = if (previousRole.isNotEmpty()) previousRole else (docSnapshot.getString("role") ?: docSnapshot.getString("rol") ?: "client")

            userRef.update(
                mapOf(
                    "role" to newRole,
                    "rol" to newRole,
                    "active" to true,
                    "requestedRole" to "",
                    "updatedAt" to com.google.firebase.Timestamp.now()
                )
            ).await()

            // Audit log subcollection: /users/{userId}/role_history
            val auditLog = mapOf(
                "previousRole" to prevRole,
                "newRole" to newRole,
                "changedBy" to changedByAdminId.ifEmpty { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "system" },
                "changedAt" to com.google.firebase.Timestamp.now(),
                "reason" to reason
            )
            userRef.collection("role_history").add(auditLog).await()
            true
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error updating user role for $userId", e)
            false
        }
    }

    suspend fun rejectUserRoleRequest(
        userId: String,
        changedByAdminId: String = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""
    ): Boolean {
        return try {
            val userRef = db.collection("users").document(userId)
            val docSnapshot = userRef.get().await()
            val prevRole = docSnapshot.getString("role") ?: docSnapshot.getString("rol") ?: "client"
            val requestedRole = docSnapshot.getString("requestedRole") ?: ""

            userRef.update(
                mapOf(
                    "requestedRole" to "",
                    "updatedAt" to com.google.firebase.Timestamp.now()
                )
            ).await()

            val auditLog = mapOf(
                "previousRole" to prevRole,
                "newRole" to prevRole,
                "changedBy" to changedByAdminId.ifEmpty { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "system" },
                "changedAt" to com.google.firebase.Timestamp.now(),
                "reason" to if (requestedRole.isNotEmpty()) "Solicitud de rol '$requestedRole' rechazada" else "Solicitud rechazada por admin"
            )
            userRef.collection("role_history").add(auditLog).await()
            true
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error rejecting user request for $userId", e)
            false
        }
    }

    suspend fun solicitarCambioRol(userId: String, requestedRole: String?): Boolean {
        val validRoles = listOf("business", "courier", null)
        if (requestedRole != null && requestedRole !in validRoles) {
            Log.e("FirebaseManager", "Rol solicitado no válido: $requestedRole")
            return false
        }
        return try {
            db.collection("users").document(userId).update(
                mapOf(
                    "requestedRole" to (requestedRole ?: ""),
                    "updatedAt" to com.google.firebase.Timestamp.now()
                )
            ).await()
            true
        } catch (e: Exception) {
            Log.e("FirebaseManager", "Error solicitando cambio de rol", e)
            false
        }
    }

    fun listenToPromotionalBanners(): Flow<List<BannerPromocional>> = callbackFlow {
        // 1. Carga instantánea desde el caché local de Firestore (0 milisegundos)
        db.collection("banners")
            .get(com.google.firebase.firestore.Source.CACHE)
            .addOnSuccessListener { cacheSnap ->
                if (cacheSnap != null && !cacheSnap.isEmpty) {
                    try {
                        val cachedBanners = cacheSnap.toObjects(BannerPromocional::class.java)
                        if (cachedBanners.isNotEmpty()) {
                            Log.d("BANNERS", "CACHE HIT: Emitted ${cachedBanners.size} banners instantly")
                            trySend(cachedBanners)
                        }
                    } catch (e: Exception) { null }
                }
            }

        // 2. Listener en tiempo real
        val listener = db.collection("banners")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToPromotionalBanners", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    try {
                        val banners = snapshot.toObjects(BannerPromocional::class.java)
                        trySend(banners)
                    } catch (e: Exception) {
                        Log.e("FirebaseManager", "Error deserializing banners", e)
                        trySend(emptyList())
                    }
                }
            }
        awaitClose { listener.remove() }
    }

    fun listenToPublicCatalogBusinesses(): Flow<List<com.example.data.repository.BusinessInfo>> = callbackFlow {
        Log.d("BusinessRepo", "PUBLIC BUSINESSES QUERY: listening to /businesses collection")
        
        // 1. Carga instantánea desde el caché local de Firestore (0 milisegundos)
        db.collection("businesses")
            .get(com.google.firebase.firestore.Source.CACHE)
            .addOnSuccessListener { cacheSnap ->
                if (cacheSnap != null && !cacheSnap.isEmpty) {
                    val cachedList = cacheSnap.documents.mapNotNull { doc ->
                        val parsed = doc.toBusinessInfoSafely()
                        if (parsed != null && parsed.isValidPublicCatalogItem()) parsed else null
                    }
                    if (cachedList.isNotEmpty()) {
                        Log.d("FirebaseManager", "CACHE HIT: Emitted ${cachedList.size} businesses instantly")
                        trySend(cachedList)
                    }
                }
            }

        // 2. Listener continuo en segundo plano
        val listener = db.collection("businesses")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToPublicCatalogBusinesses", error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val parsed = doc.toBusinessInfoSafely()
                        if (parsed != null && parsed.isValidPublicCatalogItem()) {
                            parsed
                        } else null
                    }
                    trySend(list)
                }
            }
        awaitClose { listener.remove() }
    }

    fun listenToFeaturedBusinesses(): Flow<List<Usuario>> = callbackFlow {
        // 1. Carga instantánea desde el caché local de Firestore (0 milisegundos)
        db.collection("businesses")
            .get(com.google.firebase.firestore.Source.CACHE)
            .addOnSuccessListener { cacheSnap ->
                if (cacheSnap != null && !cacheSnap.isEmpty) {
                    val cachedList = cacheSnap.documents.mapNotNull { doc ->
                        val status = (doc.getString("status") ?: "").trim().uppercase()
                        val lifecycleStatus = (doc.getString("lifecycleStatus") ?: "").trim().uppercase()
                        val isDeleted = doc.getBoolean("isDeleted") ?: false
                        val active = doc.getBoolean("active") ?: doc.getBoolean("isActive") ?: (status == "ACTIVE")
                        val isActive = doc.getBoolean("isActive") ?: doc.getBoolean("active") ?: (status == "ACTIVE")
                        if (isDeleted || !active || !isActive || status == "DELETED" || status == "DEPROVISIONED" || status == "SUSPENDED" || status == "INACTIVE" ||
                            lifecycleStatus == "DELETED" || lifecycleStatus == "DEPROVISIONED" || lifecycleStatus == "SUSPENDED" || lifecycleStatus == "INACTIVE") return@mapNotNull null
                        val nombre = doc.getString("name") ?: doc.getString("comercioNombre") ?: doc.getString("nombre") ?: ""
                        val isFeatured = doc.getBoolean("isFeatured") ?: doc.getBoolean("featured") ?: false
                        if (isFeatured && nombre.isNotEmpty()) Usuario(uid = doc.id, nombre = nombre, rol = "business") else null
                    }
                    if (cachedList.isNotEmpty()) {
                        trySend(cachedList)
                    }
                }
            }

        // 2. Listener en tiempo real sin filtro de índice pesado
        val listener = db.collection("businesses")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error in listenToFeaturedBusinesses", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    try {
                        val businesses = snapshot.documents.mapNotNull { doc ->
                            val status = (doc.getString("status") ?: "").trim().uppercase()
                            val lifecycleStatus = (doc.getString("lifecycleStatus") ?: "").trim().uppercase()
                            val isDeleted = doc.getBoolean("isDeleted") ?: false
                            val active = doc.getBoolean("active") ?: doc.getBoolean("isActive") ?: (status == "ACTIVE")
                            val isActive = doc.getBoolean("isActive") ?: doc.getBoolean("active") ?: (status == "ACTIVE")

                            if (isDeleted || !active || !isActive || status == "DELETED" || status == "DEPROVISIONED" || status == "SUSPENDED" || status == "INACTIVE" ||
                                lifecycleStatus == "DELETED" || lifecycleStatus == "DEPROVISIONED" || lifecycleStatus == "SUSPENDED" || lifecycleStatus == "INACTIVE") {
                                return@mapNotNull null
                            }

                            val nombre = doc.getString("name") ?: doc.getString("comercioNombre") ?: doc.getString("nombre") ?: ""
                            val isFeatured = doc.getBoolean("isFeatured") ?: doc.getBoolean("featured") ?: false
                            if (isFeatured && nombre.isNotEmpty()) {
                                Usuario(uid = doc.id, nombre = nombre, rol = "business")
                            } else null
                        }
                        trySend(businesses)
                    } catch (e: Exception) {
                        Log.e("FirebaseManager", "Error deserializing featured businesses", e)
                        trySend(emptyList())
                    }
                }
            }
        awaitClose { listener.remove() }
    }

    // --- SPRINT 15 / C2D ENTERPRISE DASHBOARD FLOWS ---
    // Contrato Canónico: Tenant Override (/tenants/{tenantId}/dashboard/configuration) -> Global Default (/dashboard/configuration)

    fun listenToDashboardConfig(tenantId: String? = null): Flow<DashboardConfig> = callbackFlow {
        val effectiveTenantId = tenantId?.trim()?.takeIf { it.isNotEmpty() && it != "GLOBAL" }
        var globalRegistration: com.google.firebase.firestore.ListenerRegistration? = null
        var tenantRegistration: com.google.firebase.firestore.ListenerRegistration? = null
        var lastGlobalConfig = DashboardConfig()
        var lastTenantSnapshot: com.google.firebase.firestore.DocumentSnapshot? = null

        fun emitMerged() {
            val tenantSnap = lastTenantSnapshot
            if (tenantSnap != null && tenantSnap.exists()) {
                trySend(tenantSnap.toDashboardConfigSafely(base = lastGlobalConfig))
            } else {
                trySend(lastGlobalConfig)
            }
        }

        globalRegistration = db.collection("dashboard").document("configuration")
            .addSnapshotListener { globalSnapshot, globalError ->
                if (globalError == null && globalSnapshot != null && globalSnapshot.exists()) {
                    lastGlobalConfig = globalSnapshot.toDashboardConfigSafely()
                } else if (globalError != null) {
                    Log.e("FirebaseManager", "Error loading Global DashboardConfig", globalError)
                }
                emitMerged()
            }

        if (effectiveTenantId != null) {
            val tenantDocRef = db.collection("tenants").document(effectiveTenantId)
                .collection("dashboard").document("configuration")

            tenantRegistration = tenantDocRef.addSnapshotListener { tenantSnapshot, tenantError ->
                if (tenantError == null) {
                    lastTenantSnapshot = tenantSnapshot
                    emitMerged()
                } else {
                    Log.w("FirebaseManager", "Error loading Tenant DashboardConfig", tenantError)
                    emitMerged()
                }
            }
        }

        awaitClose {
            tenantRegistration?.remove()
            globalRegistration?.remove()
        }
    }

    /**
     * Listener en tiempo real para anuncios editoriales e institucionales del Home (/home_editorial_ads).
     * Zero N+1: Los documentos se ordenan en memoria por 'order ASC' sin requerir índices compuestos.
     */
    fun listenToHomeEditorialAds(): Flow<List<HomeEditorialAd>> = callbackFlow {
        val listener = db.collection("home_editorial_ads")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error loading /home_editorial_ads", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot == null || snapshot.isEmpty) {
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                val ads = snapshot.documents.mapNotNull { doc ->
                    doc.toHomeEditorialAdSafely()
                }.sortedBy { it.order }
                trySend(ads)
            }
        awaitClose { listener.remove() }
    }

    private fun parseProductFromDoc(doc: com.google.firebase.firestore.DocumentSnapshot): Product? {
        try {
            val statusStr = doc.getString("status") ?: ""
            val lifecycleStatusStr = doc.getString("lifecycleStatus") ?: ""
            if (statusStr.equals("DELETED", ignoreCase = true) || lifecycleStatusStr.equals("DELETED", ignoreCase = true)) {
                return null
            }
            if (statusStr.equals("INACTIVE", ignoreCase = true)) {
                return null
            }
            val active = doc.getBoolean("active") ?: doc.getBoolean("isActive") ?: true
            val avail = doc.getBoolean("isAvailable") ?: doc.getBoolean("available") ?: true
            if (!active || !avail) return null

            val name = doc.getString("name") ?: doc.getString("nombre") ?: doc.getString("title") ?: ""
            if (name.isBlank()) return null

            val price = (doc.get("price") as? Number)?.toDouble()
                ?: (doc.get("precio") as? Number)?.toDouble() ?: 0.0
            val origPrice = (doc.get("originalPrice") as? Number)?.toDouble()
                ?: (doc.get("precioOriginal") as? Number)?.toDouble()
            var imageUrl = doc.getString("imageUrl") ?: doc.getString("imagenUrl") ?: doc.getString("photoUrl") ?: ""
            var thumbnailUrl = doc.getString("thumbnailUrl") ?: imageUrl

            // Sanitización preventiva: Descartar rutas locales privadas que pudieran existir en documentos legacy
            val isLocalImg = imageUrl.startsWith("file://") || imageUrl.startsWith("/data/user/") || imageUrl.startsWith("/data/data/") || imageUrl.startsWith("/storage/emulated/") || imageUrl.startsWith("content://")
            if (isLocalImg) {
                Log.w("FirebaseManager", "[IMAGE_AUDIT] Producto ${doc.id} contiene ruta local privada en Firestore ($imageUrl). Descartando para cliente.")
                imageUrl = ""
            }

            val isLocalThumb = thumbnailUrl.startsWith("file://") || thumbnailUrl.startsWith("/data/user/") || thumbnailUrl.startsWith("/data/data/") || thumbnailUrl.startsWith("/storage/emulated/") || thumbnailUrl.startsWith("content://")
            if (isLocalThumb) {
                thumbnailUrl = ""
            }

            val variants = (doc.get("imageVariants") as? Map<*, *>)?.mapNotNull { (k, v) ->
                val key = k?.toString()
                val value = v?.toString()
                if (key != null && value != null && (value.startsWith("http://") || value.startsWith("https://"))) {
                    key to value
                } else null
            }?.toMap() ?: emptyMap()

            val rawImages = (doc.get("images") as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList()
            val validImages = rawImages.filter { it.startsWith("http://") || it.startsWith("https://") }

            // Si imageUrl quedó vacía pero existen variantes o imágenes remotas válidas en Storage, utilizarlas
            if (imageUrl.isBlank()) {
                imageUrl = variants["1200"] ?: variants["600"] ?: variants["300"] ?: validImages.firstOrNull().orEmpty()
            }
            if (thumbnailUrl.isBlank()) {
                thumbnailUrl = variants["300"] ?: variants["100"] ?: imageUrl
            }

            val businessId = doc.getString("businessId") ?: doc.getString("restaurantId") ?: doc.getString("comercioId") ?: ""
            // Sanitización de Integridad: En la plataforma de delivery para clientes, todo producto DEBE pertenecer a un comercio registrado.
            // Se descartan automáticamente registros huérfanos o demos sin comercio asignado.
            if (businessId.isBlank()) {
                return null
            }
            val categoryName = doc.getString("categoryName") ?: doc.getString("categoria") ?: doc.getString("category") ?: "Menú Principal"
            val isPopular = doc.getBoolean("isPopular") ?: doc.getBoolean("popular") ?: doc.getBoolean("isTopSeller") ?: doc.getBoolean("isFeatured") ?: false

            val desc = doc.getString("description") ?: doc.getString("descripcion") ?: doc.getString("longDescription") ?: doc.getString("shortDescription") ?: ""
            val shortDesc = doc.getString("shortDescription") ?: doc.getString("descripcionCorta") ?: desc.take(120)
            val longDesc = doc.getString("longDescription") ?: doc.getString("descripcionLarga") ?: desc
            val tags = (doc.get("tags") as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList()
            val status = ProductStatus.fromString(doc.getString("status") ?: doc.getString("estado"), ProductStatus.ACTIVE)

            return Product(
                id = doc.id,
                name = name,
                description = desc,
                shortDescription = shortDesc,
                longDescription = longDesc,
                price = price,
                originalPrice = origPrice,
                imageUrl = imageUrl,
                thumbnailUrl = thumbnailUrl,
                imageVariants = variants,
                images = validImages,
                businessId = businessId,
                categoryName = categoryName,
                status = status,
                tags = tags,
                isPopular = isPopular
            )
        } catch (e: Exception) {
            return null
        }
    }

    fun listenToFeaturedProducts(): Flow<List<FeaturedProduct>> = callbackFlow {
        val configuredFeaturedDocs = mutableMapOf<String, FeaturedProduct>()
        val realProductsMap = mutableMapOf<String, Product>()
        val businessNamesMap = mutableMapOf<String, String>()

        fun emitCombined() {
            val resultList = mutableListOf<FeaturedProduct>()
            val handledProductIds = mutableSetOf<String>()

            // 1. Procesar elementos configurados explícitamente en /featuredProducts
            configuredFeaturedDocs.values.forEach { fp ->
                if (fp.active) {
                    val pId = if (fp.productId.isNotBlank()) fp.productId else fp.id
                    val liveProd = realProductsMap[pId]

                    if (liveProd != null) {
                        // El producto existe en /products -> validar que esté activo y visible
                        val isProdActive = liveProd.status != ProductStatus.INACTIVE && !liveProd.isHidden
                        if (isProdActive) {
                            val bId = liveProd.businessId.ifBlank { fp.businessId }
                            val bName = businessNamesMap[bId]?.ifBlank { null } ?: fp.businessName.ifBlank { "Comercio" }
                            val imgUrl = liveProd.getMainImage().ifBlank { fp.imageUrl }

                            resultList.add(
                                fp.copy(
                                    id = fp.id,
                                    productId = liveProd.id,
                                    name = liveProd.name.ifBlank { fp.name },
                                    price = liveProd.price,
                                    originalPrice = liveProd.originalPrice ?: fp.originalPrice,
                                    imageUrl = imgUrl,
                                    businessId = bId,
                                    businessName = bName,
                                    categoryName = liveProd.categoryName.ifBlank { fp.categoryName },
                                    isPopular = true
                                )
                            )
                            handledProductIds.add(liveProd.id)
                        }
                    } else if (fp.name.isNotBlank() && fp.price > 0) {
                        // Snapshot de respaldo si el doc en /products no ha cargado aún
                        val bName = businessNamesMap[fp.businessId]?.ifBlank { null } ?: fp.businessName.ifBlank { "Comercio" }
                        resultList.add(fp.copy(businessName = bName))
                        handledProductIds.add(fp.id)
                    }
                }
            }

            // 2. Procesar productos en /products con isFeatured/isPopular/isTopSeller activos
            realProductsMap.values.forEach { prod ->
                val isFeaturedInCatalog = (prod.isPopular || prod.isTopSeller)
                val isProdActive = prod.status != ProductStatus.INACTIVE && !prod.isHidden
                if (isFeaturedInCatalog && isProdActive && !handledProductIds.contains(prod.id)) {
                    val bName = businessNamesMap[prod.businessId]?.ifBlank { null } ?: "Comercio"
                    resultList.add(
                        FeaturedProduct(
                            id = prod.id,
                            productId = prod.id,
                            name = prod.name,
                            price = prod.price,
                            originalPrice = prod.originalPrice,
                            imageUrl = prod.getMainImage(),
                            rating = prod.rating,
                            businessId = prod.businessId,
                            businessName = bName,
                            categoryName = prod.categoryName,
                            isPopular = true
                        )
                    )
                    handledProductIds.add(prod.id)
                }
            }

            trySend(resultList)
        }

        val lBiz = db.collection("businesses")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    snapshot.documents.forEach { doc ->
                        val name = doc.getString("name") ?: doc.getString("nombre") ?: ""
                        if (name.isNotBlank()) businessNamesMap[doc.id] = name
                    }
                    emitCombined()
                }
            }

        val lFeatured = db.collection("featuredProducts")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    configuredFeaturedDocs.clear()
                    snapshot.documents.forEach { doc ->
                        doc.toObject(FeaturedProduct::class.java)?.copy(id = doc.id)?.let {
                            configuredFeaturedDocs[doc.id] = it
                        }
                    }
                    emitCombined()
                }
            }

        val lProducts = db.collection("products")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    realProductsMap.clear()
                    snapshot.documents.forEach { doc ->
                        val p = parseProductFromDoc(doc)
                        if (p != null) {
                            realProductsMap[doc.id] = p
                        }
                    }
                    emitCombined()
                }
            }

        awaitClose {
            lBiz.remove()
            lFeatured.remove()
            lProducts.remove()
        }
    }

    fun listenToFlashDeals(): Flow<List<FlashDeal>> = callbackFlow {
        val configuredDeals = mutableMapOf<String, FlashDeal>()
        val realProductsMap = mutableMapOf<String, Product>()
        val businessNamesMap = mutableMapOf<String, String>()

        fun emitCombined() {
            val nowMs = System.currentTimeMillis()
            val resultList = mutableListOf<FlashDeal>()

            configuredDeals.values.forEach { deal ->
                if (!deal.active) return@forEach

                // Validación temporal estricta de vigencia
                if (deal.startAt != null && deal.startAt.toDate().time > nowMs) {
                    return@forEach // No ha iniciado
                }
                if (deal.endAt != null && deal.endAt.toDate().time < nowMs) {
                    return@forEach // Expiró por fecha fin
                }
                if (deal.expiresAtMinutes > 0 && deal.createdAt != null) {
                    val expireTime = deal.createdAt.toDate().time + (deal.expiresAtMinutes * 60 * 1000L)
                    if (nowMs > expireTime) {
                        return@forEach // Expiró por temporizador
                    }
                }

                val pId = if (deal.productId.isNotBlank()) deal.productId else deal.id
                val liveProd = realProductsMap[pId]
                if (liveProd != null) {
                    // Sincronizar datos reales actuales del producto
                    val isProdActive = liveProd.status != ProductStatus.INACTIVE && !liveProd.isHidden
                    if (isProdActive) {
                        val bId = liveProd.businessId.ifBlank { deal.businessId }
                        val bName = businessNamesMap[bId]?.ifBlank { null } ?: deal.businessName.ifBlank { "Comercio" }
                        val imgUrl = liveProd.getMainImage().ifBlank { deal.imageUrl }
                        val effectiveOrigPrice = if (deal.originalPrice > 0.0) deal.originalPrice else (liveProd.originalPrice ?: liveProd.price)
                        val effectiveFlashPrice = if (deal.price > 0.0) deal.price else liveProd.price

                        val calcDiscountTag = if (effectiveOrigPrice > effectiveFlashPrice && effectiveOrigPrice > 0.0) {
                            val pct = (((effectiveOrigPrice - effectiveFlashPrice) / effectiveOrigPrice) * 100).toInt()
                            "-$pct%"
                        } else deal.discountTag

                        resultList.add(
                            deal.copy(
                                id = deal.id,
                                productId = liveProd.id,
                                title = deal.title.ifBlank { liveProd.name },
                                productName = liveProd.name,
                                price = effectiveFlashPrice,
                                originalPrice = effectiveOrigPrice,
                                discountTag = calcDiscountTag,
                                businessId = bId,
                                businessName = bName,
                                imageUrl = imgUrl
                            )
                        )
                    }
                } else if (deal.title.isNotBlank() && deal.price > 0) {
                    // Fallback snapshot si /products no se encuentra individualmente
                    val bName = businessNamesMap[deal.businessId]?.ifBlank { null } ?: deal.businessName.ifBlank { "Comercio" }
                    resultList.add(deal.copy(businessName = bName))
                }
            }

            trySend(resultList)
        }

        val lBiz = db.collection("businesses")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    snapshot.documents.forEach { doc ->
                        val name = doc.getString("name") ?: doc.getString("nombre") ?: ""
                        if (name.isNotBlank()) businessNamesMap[doc.id] = name
                    }
                    emitCombined()
                }
            }

        val lDeals = db.collection("flashDeals")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    configuredDeals.clear()
                    snapshot.documents.forEach { doc ->
                        doc.toObject(FlashDeal::class.java)?.copy(id = doc.id)?.let {
                            configuredDeals[doc.id] = it
                        }
                    }
                    emitCombined()
                }
            }

        val lProducts = db.collection("products")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    realProductsMap.clear()
                    snapshot.documents.forEach { doc ->
                        val p = parseProductFromDoc(doc)
                        if (p != null) {
                            realProductsMap[doc.id] = p
                        }
                    }
                    emitCombined()
                }
            }

        awaitClose {
            lBiz.remove()
            lDeals.remove()
            lProducts.remove()
        }
    }

    fun listenToDiscountedProducts(): Flow<List<FeaturedProduct>> = callbackFlow {
        val realProductsMap = mutableMapOf<String, Product>()
        val businessNamesMap = mutableMapOf<String, String>()

        fun emitCombined() {
            val list = realProductsMap.values.filter { prod ->
                prod.originalPrice != null && prod.originalPrice > prod.price && prod.price > 0.0 &&
                prod.status != ProductStatus.INACTIVE && !prod.isHidden
            }.map { prod ->
                val bName = businessNamesMap[prod.businessId]?.ifBlank { null } ?: "Comercio"
                FeaturedProduct(
                    id = prod.id,
                    productId = prod.id,
                    name = prod.name,
                    price = prod.price,
                    originalPrice = prod.originalPrice,
                    imageUrl = prod.getMainImage(),
                    rating = prod.rating,
                    businessId = prod.businessId,
                    businessName = bName,
                    categoryName = prod.categoryName,
                    isPopular = prod.isPopular
                )
            }
            trySend(list)
        }

        val lBiz = db.collection("businesses")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    snapshot.documents.forEach { doc ->
                        val name = doc.getString("name") ?: doc.getString("nombre") ?: ""
                        if (name.isNotBlank()) businessNamesMap[doc.id] = name
                    }
                    emitCombined()
                }
            }

        val lProducts = db.collection("products")
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    realProductsMap.clear()
                    snapshot.documents.forEach { doc ->
                        val p = parseProductFromDoc(doc)
                        if (p != null) {
                            realProductsMap[doc.id] = p
                        }
                    }
                    emitCombined()
                }
            }

        awaitClose {
            lBiz.remove()
            lProducts.remove()
        }
    }

    fun listenToBranches(): Flow<List<BranchItem>> = callbackFlow {
        val listener = db.collection("branches")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error listening to branches", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val branches = snapshot.documents.mapNotNull { doc ->
                        val isActive = doc.getBoolean("active") ?: true
                        if (!isActive) return@mapNotNull null

                        val item = doc.toObject(BranchItem::class.java)?.copy(id = doc.id) ?: return@mapNotNull null
                        val effectiveName = item.branchName.ifBlank { item.businessName }
                        if (effectiveName.isNotBlank() && (item.businessId.isNotBlank() || item.businessName.isNotBlank()) && item.address.isNotBlank()) {
                            item.copy(branchName = effectiveName)
                        } else null
                    }
                    trySend(branches)
                }
            }
        awaitClose { listener.remove() }
    }

    /**
     * Escucha en tiempo real todos los productos activos de la colección /products para el Customer Global Search.
     * Incluye carga instantánea desde caché local.
     */
    fun listenToAllActiveProducts(): Flow<List<Product>> = callbackFlow {
        // 1. Carga desde caché local
        db.collection("products")
            .get(com.google.firebase.firestore.Source.CACHE)
            .addOnSuccessListener { cacheSnap ->
                if (cacheSnap != null && !cacheSnap.isEmpty) {
                    val cachedList = cacheSnap.documents.mapNotNull { parseProductFromDoc(it) }
                    if (cachedList.isNotEmpty()) {
                        trySend(cachedList)
                    }
                }
            }

        // 2. Listener en tiempo real
        val listener = db.collection("products")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error listening to all active products: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val products = snapshot.documents.mapNotNull { parseProductFromDoc(it) }
                    trySend(products)
                }
            }
        awaitClose { listener.remove() }
    }

    /**
     * Escucha en tiempo real todos los combos activos de la colección /combos para el Customer Global Search.
     */
    fun listenToActiveCombos(): Flow<List<com.example.domain.model.menu.MenuCombo>> = callbackFlow {
        db.collection("combos")
            .get(com.google.firebase.firestore.Source.CACHE)
            .addOnSuccessListener { cacheSnap ->
                if (cacheSnap != null && !cacheSnap.isEmpty) {
                    val cachedList = cacheSnap.documents.mapNotNull { doc ->
                        doc.toObject(com.example.data.dto.menu.ComboDto::class.java)?.let {
                            com.example.data.mapper.menu.ComboMapper.comboToDomain(it)
                        }
                    }.filter { it.status == com.example.domain.model.menu.MenuComboStatus.ACTIVE }
                    if (cachedList.isNotEmpty()) {
                        trySend(cachedList)
                    }
                }
            }

        val listener = db.collection("combos")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("FirebaseManager", "Error listening to active combos: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val combos = snapshot.documents.mapNotNull { doc ->
                        doc.toObject(com.example.data.dto.menu.ComboDto::class.java)?.let {
                            com.example.data.mapper.menu.ComboMapper.comboToDomain(it)
                        }
                    }.filter { it.status == com.example.domain.model.menu.MenuComboStatus.ACTIVE }
                    trySend(combos)
                }
            }
        awaitClose { listener.remove() }
    }
}


