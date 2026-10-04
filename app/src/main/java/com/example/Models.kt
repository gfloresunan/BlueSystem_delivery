package com.example

import kotlin.math.*

// --- Schema Definitions ---

@com.google.firebase.firestore.IgnoreExtraProperties
data class Usuario(
    val uid: String = "",
    val nombre: String = "",
    val telefono: String = "",
    val rol: String = "", // "admin", "motorizado", "cliente"
    @get:com.google.firebase.firestore.PropertyName("fechaRegistro")
    val rawFechaRegistro: Any? = null,
    val detallesVehiculo: DetallesVehiculo? = null
) {
    @get:com.google.firebase.firestore.Exclude
    val fechaRegistro: String
        get() = when (rawFechaRegistro) {
            is com.google.firebase.Timestamp -> rawFechaRegistro.toDate().time.toString()
            is String -> rawFechaRegistro
            is Number -> rawFechaRegistro.toLong().toString()
            else -> ""
        }
}

@com.google.firebase.firestore.IgnoreExtraProperties
data class DetallesVehiculo(
    val marca: String = "",
    val modelo: String = "",
    val placa: String = "",
    val color: String = ""
)

enum class LocationSelectionSource {
    SEARCH,
    MAP_PICKER,
    CURRENT_LOCATION,
    SAVED_ADDRESS,
    MANUAL
}

@com.google.firebase.firestore.IgnoreExtraProperties
data class DireccionCacheada(
    val id: String = "",
    val searchText: String = "",
    val formattedAddress: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val source: String = LocationSelectionSource.SEARCH.name,
    val placeId: String = ""
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class UbicacionRepartidor(
    val motorizadoId: String = "",
    val coordenadas: Coordenadas = Coordenadas(),
    val geohash: String = "",
    val ultimaActualizacion: Any? = null,
    val estadoDisponibilidad: String = "" // "disponible", "en_ruta", "offline"
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class Coordenadas(
    val latitud: Double = 0.0,
    val longitud: Double = 0.0
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class Pedido(
    val pedidoId: String = "",
    val clientRequestId: String = "",
    val clienteId: String = "",
    val customerId: String = "",
    val businessId: String = "",
    val branchId: String = "",
    val branchName: String = "",
    val branchAddress: String = "",
    val fulfillmentType: String = "DELIVERY", // "DELIVERY" | "PICKUP"
    val motorizadoId: String = "",
    val assignedCourierId: String = "",
    val courierPhase: Int = 1,
    val serviceType: String = "",
    val status: String = "", // "pending", "preparing", "ready", "in_transit", "delivered", "cancelled"
    val estado: String = "", // Backward compat
    val createdAt: com.google.firebase.Timestamp? = null,
    val creadoEl: String = "",
    val customerName: String = "",
    val customerPhone: String = "",
    val businessName: String = "",
    val destinationAddress: String = "",
    val total: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val subtotal: Double = 0.0,
    val merchantGrossSales: Double = 0.0,
    val discountAmount: Double = 0.0,
    val additionalChargeAmount: Double = 0.0,
    val tipAmount: Double = 0.0,
    val deliveryNote: String = "",
    val paymentMethod: String = "",
    val amountPaid: Double = 0.0,
    val changeNeeded: Double = 0.0,
    val receiptUrl: String = "",
    val referenceNumber: String = "",
    val paymentRejectionReason: String = "",
    val paymentAttempts: Int = 0,
    val cancellationReason: String = "",
    val cashReceived: Double = 0.0,
    @get:com.google.firebase.firestore.PropertyName("cashDiscrepancy")
    val cashDiscrepancy: Boolean = false,
    val hasBeenRated: Boolean = false,
    val hasRatedBusiness: Boolean = false,
    val hasRatedCourier: Boolean = false,
    val rating: Int = 0,
    val courierRating: Int = 0,
    val ratingComment: String = "",
    val courierRatingComment: String = "",
    val platform: String = "",
    val items: List<com.example.presentation.customer.profile.OrderItem> = emptyList(),
    val orderCode: String = "",
    val orderShortCode: String = "",
    val orderSequence: Long = 0L,
    val orderCodePrefix: String = "",
    @get:com.google.firebase.firestore.PropertyName("origen")
    val rawOrigen: Any? = null,
    @get:com.google.firebase.firestore.PropertyName("destino")
    val rawDestino: Any? = null,
    val valoresMonetarios: ValoresMonetarios = ValoresMonetarios(),
    val historialEstados: List<EstadoHistorial> = emptyList(),
    val deliveredAt: com.google.firebase.Timestamp? = null,
    val completedAt: com.google.firebase.Timestamp? = null
) {
    @get:com.google.firebase.firestore.Exclude
    val displayOrderCode: String
        get() = if (orderCode.isNotBlank()) orderCode else if (pedidoId.isNotBlank()) pedidoId.takeLast(6).uppercase() else "ORD-000000"

    @get:com.google.firebase.firestore.Exclude
    val displayShortCode: String
        get() = if (orderShortCode.isNotBlank()) orderShortCode else if (pedidoId.isNotBlank()) pedidoId.takeLast(4).uppercase() else "0000"

    @get:com.google.firebase.firestore.Exclude
    val origen: UbicacionPedido
        get() = parseUbicacion(rawOrigen)

    @get:com.google.firebase.firestore.Exclude
    val destino: UbicacionPedido
        get() = parseUbicacion(rawDestino)

    companion object {
        fun parseUbicacion(raw: Any?): UbicacionPedido {
            return when (raw) {
                is UbicacionPedido -> raw
                is Map<*, *> -> {
                    val nombreComercio = raw["nombreComercio"] as? String ?: ""
                    val nombreCliente = raw["nombreCliente"] as? String ?: ""
                    val direccion = raw["direccion"] as? String ?: ""
                    val coordMap = raw["coordenadas"] as? Map<*, *>
                    val lat = (coordMap?.get("latitud") as? Number)?.toDouble() ?: 0.0
                    val lng = (coordMap?.get("longitud") as? Number)?.toDouble() ?: 0.0
                    UbicacionPedido(nombreComercio, nombreCliente, direccion, Coordenadas(lat, lng))
                }
                is String -> UbicacionPedido(direccion = raw)
                else -> UbicacionPedido()
            }
        }
    }
}

fun com.google.firebase.firestore.DocumentSnapshot.toPedidoSafely(): Pedido {
    return try {
        parsePedidoManual(this)
    } catch (e: Exception) {
        android.util.Log.w("PedidoParser", "Resilient fallback for order doc ${this.id}: ${e.message}")
        parsePedidoManual(this)
    }
}

fun parsePedidoManual(doc: com.google.firebase.firestore.DocumentSnapshot): Pedido {
    val clientReqId = doc.getString("clientRequestId") ?: ""
    val clienteId = doc.getString("clienteId") ?: doc.getString("customerId") ?: ""
    val customerId = doc.getString("customerId") ?: doc.getString("clienteId") ?: ""
    val businessId = doc.getString("businessId") ?: doc.getString("restaurantId") ?: doc.getString("comercioId") ?: ""
    val branchId = doc.getString("branchId") ?: doc.getString("sucursalId") ?: ""
    val branchName = doc.getString("branchName") ?: doc.getString("nombreSucursal") ?: ""
    val branchAddress = doc.getString("branchAddress") ?: doc.getString("direccionSucursal") ?: ""
    val fulfillmentType = doc.getString("fulfillmentType") ?: "DELIVERY"
    val motorizadoId = (doc.getString("motorizadoId")?.takeIf { it.isNotBlank() }
        ?: doc.getString("assignedCourierId")?.takeIf { it.isNotBlank() } ?: "")
    val assignedCourierId = (doc.getString("assignedCourierId")?.takeIf { it.isNotBlank() }
        ?: doc.getString("motorizadoId")?.takeIf { it.isNotBlank() } ?: "")
    val courierPhase = (doc.get("courierPhase") as? Number)?.toInt() ?: 1
    val status = doc.getString("status") ?: doc.getString("estado") ?: "pending"
    val estado = doc.getString("estado") ?: doc.getString("status") ?: "pending"
    val createdAt = doc.getTimestamp("createdAt")
    val deliveredAt = doc.getTimestamp("deliveredAt")
    val completedAt = doc.getTimestamp("completedAt")
    val creadoEl = doc.getString("creadoEl") ?: ""
    val customerName = doc.getString("customerName") ?: doc.getString("nombreCliente") ?: ""
    val customerPhone = doc.getString("customerPhone") ?: doc.getString("telefonoCliente") ?: ""
    val businessName = doc.getString("businessName") ?: doc.getString("nombreComercio") ?: ""
    val destinationAddress = doc.getString("destinationAddress") ?: doc.getString("direccionDestino") ?: ""
    val total = (doc.get("total") as? Number)?.toDouble() ?: 0.0
    val deliveryFee = (doc.get("deliveryFee") as? Number)?.toDouble() ?: 0.0
    val subtotal = (doc.get("subtotal") as? Number)?.toDouble() ?: 0.0
    val merchantGrossSales = (doc.get("merchantGrossSales") as? Number)?.toDouble() ?: 0.0
    val discountAmount = (doc.get("discountAmount") as? Number)?.toDouble() ?: (doc.get("couponDiscount") as? Number)?.toDouble() ?: 0.0
    val additionalChargeAmount = (doc.get("additionalChargeAmount") as? Number)?.toDouble() ?: (doc.get("additionalCharge") as? Number)?.toDouble() ?: (doc.get("cargosAdicionales") as? Number)?.toDouble() ?: 0.0
    val tipAmount = (doc.get("tipAmount") as? Number)?.toDouble() ?: (doc.get("tip") as? Number)?.toDouble() ?: (doc.get("propina") as? Number)?.toDouble() ?: 0.0
    val deliveryNote = doc.getString("deliveryNote") ?: doc.getString("notes") ?: doc.getString("instructions") ?: doc.getString("deliveryInstructions") ?: ""
    val paymentMethod = doc.getString("paymentMethod") ?: doc.getString("metodoPago") ?: ""
    val amountPaid = (doc.get("amountPaid") as? Number)?.toDouble() ?: 0.0
    val changeNeeded = (doc.get("changeNeeded") as? Number)?.toDouble() ?: 0.0
    val receiptUrl = doc.getString("receiptUrl") ?: ""
    val referenceNumber = doc.getString("referenceNumber") ?: ""
    val paymentRejectionReason = doc.getString("paymentRejectionReason") ?: ""
    val paymentAttempts = (doc.get("paymentAttempts") as? Number)?.toInt() ?: 0
    val cancellationReason = doc.getString("cancellationReason") ?: doc.getString("cancelReason") ?: ""
    val cashReceived = (doc.get("cashReceived") as? Number)?.toDouble() ?: 0.0
    val cashDiscrepancy = doc.getBoolean("cashDiscrepancy") ?: false
    val hasBeenRated = doc.getBoolean("hasBeenRated") ?: false
    val rating = (doc.get("rating") as? Number)?.toInt() ?: 0
    val courierRating = (doc.get("courierRating") as? Number)?.toInt() ?: 0
    val ratingComment = doc.getString("ratingComment") ?: doc.getString("comment") ?: ""
    val courierRatingComment = doc.getString("courierRatingComment") ?: ""
    val hasRatedBusiness = doc.getBoolean("hasRatedBusiness") ?: (rating > 0)
    val hasRatedCourier = doc.getBoolean("hasRatedCourier") ?: (courierRating > 0)
    val platform = doc.getString("platform") ?: ""
    val orderCode = doc.getString("orderCode")
        ?: doc.getString("codigoPedido")
        ?: doc.getString("orderNumber")
        ?: doc.getString("numeroPedido")
        ?: ""
    val orderShortCode = doc.getString("orderShortCode") ?: (if (orderCode.isNotBlank()) orderCode.takeLast(4) else "")
    val orderSequence = (doc.get("orderSequence") as? Number)?.toLong() ?: 0L
    val orderCodePrefix = doc.getString("orderCodePrefix") ?: ""
    val rawItems = doc.get("items")
    val items = parseOrderItems(rawItems)

    return Pedido(
        pedidoId = doc.id,
        orderCode = orderCode,
        orderShortCode = orderShortCode,
        orderSequence = orderSequence,
        orderCodePrefix = orderCodePrefix,
        clientRequestId = clientReqId,
        clienteId = clienteId,
        customerId = customerId,
        businessId = businessId,
        branchId = branchId,
        branchName = branchName,
        branchAddress = branchAddress,
        fulfillmentType = fulfillmentType,
        motorizadoId = motorizadoId,
        assignedCourierId = assignedCourierId,
        courierPhase = courierPhase,
        status = status,
        estado = estado,
        createdAt = createdAt,
        creadoEl = creadoEl,
        customerName = customerName,
        customerPhone = customerPhone,
        businessName = businessName,
        destinationAddress = destinationAddress,
        total = total,
        deliveryFee = deliveryFee,
        subtotal = subtotal,
        merchantGrossSales = merchantGrossSales,
        discountAmount = discountAmount,
        additionalChargeAmount = additionalChargeAmount,
        tipAmount = tipAmount,
        deliveryNote = deliveryNote,
        paymentMethod = paymentMethod,
        amountPaid = amountPaid,
        changeNeeded = changeNeeded,
        receiptUrl = receiptUrl,
        referenceNumber = referenceNumber,
        paymentRejectionReason = paymentRejectionReason,
        paymentAttempts = paymentAttempts,
        cancellationReason = cancellationReason,
        cashReceived = cashReceived,
        cashDiscrepancy = cashDiscrepancy,
        hasBeenRated = hasBeenRated,
        hasRatedBusiness = hasRatedBusiness,
        hasRatedCourier = hasRatedCourier,
        rating = rating,
        courierRating = courierRating,
        ratingComment = ratingComment,
        courierRatingComment = courierRatingComment,
        platform = platform,
        items = items,
        rawOrigen = doc.get("origen"),
        rawDestino = doc.get("destino"),
        deliveredAt = deliveredAt,
        completedAt = completedAt
    )
}

fun parseOrderItems(rawItems: Any?): List<com.example.presentation.customer.profile.OrderItem> {
    if (rawItems == null) return emptyList()
    val rawList = when (rawItems) {
        is List<*> -> rawItems
        is Array<*> -> rawItems.toList()
        else -> return emptyList()
    }
    if (rawList.isEmpty()) return emptyList()

    val parsedList = mutableListOf<com.example.presentation.customer.profile.OrderItem>()

    for (element in rawList) {
        try {
            when (element) {
                is com.example.presentation.customer.profile.OrderItem -> {
                    parsedList.add(element)
                }
                is Map<*, *> -> {
                    val productId = (element["productId"] as? String)
                        ?: (element["id"] as? String)
                        ?: ""

                    val name = (element["productName"] as? String)
                        ?.ifBlank { null }
                        ?: (element["name"] as? String)
                        ?.ifBlank { null }
                        ?: (element["titulo"] as? String)
                        ?.ifBlank { null }
                        ?: (element["nombre"] as? String)
                        ?.ifBlank { null }
                        ?: ""

                    val price = (element["price"] as? Number)?.toDouble()
                        ?: (element["precio"] as? Number)?.toDouble()
                        ?: (element["unitPrice"] as? Number)?.toDouble()
                        ?: 0.0

                    val quantity = (element["quantity"] as? Number)?.toInt()
                        ?: (element["cantidad"] as? Number)?.toInt()
                        ?: (element["qty"] as? Number)?.toInt()
                        ?: 1

                    val rawSubtotal = (element["subtotal"] as? Number)?.toDouble()
                        ?: (element["total"] as? Number)?.toDouble()
                    val subtotal = rawSubtotal ?: (price * quantity)

                    val imageUrl = (element["imageUrl"] as? String)
                        ?: (element["image"] as? String)
                        ?: (element["imagen"] as? String)
                        ?: (element["photoUrl"] as? String)
                        ?: ""

                    val rawOptions = (element["selectedOptions"] as? List<*>) ?: emptyList<Any>()
                    val parsedOptions = rawOptions.mapNotNull { opt ->
                        when (opt) {
                            is com.example.domain.model.menu.SelectedOption -> opt
                            is Map<*, *> -> {
                                com.example.domain.model.menu.SelectedOption(
                                    optionGroupId = (opt["optionGroupId"] as? String) ?: "",
                                    optionGroupName = (opt["optionGroupName"] as? String) ?: "",
                                    optionId = (opt["optionId"] as? String) ?: "",
                                    optionName = (opt["optionName"] as? String) ?: "",
                                    additionalPrice = (opt["additionalPrice"] as? Number)?.toDouble() ?: 0.0,
                                    isFreeOption = (opt["isFreeOption"] as? Boolean) ?: false
                                )
                            }
                            else -> null
                        }
                    }

                    if (productId.isNotBlank() || name.isNotBlank() || price > 0.0) {
                        parsedList.add(
                            com.example.presentation.customer.profile.OrderItem(
                                productId = productId,
                                name = if (name.isNotBlank()) name else "Producto sin nombre",
                                price = price,
                                quantity = if (quantity > 0) quantity else 1,
                                imageUrl = imageUrl,
                                subtotal = subtotal,
                                selectedOptions = parsedOptions
                            )
                        )
                    } else {
                        safeLogWarning("PedidoParser", "Item descartado por falta de datos mínimos: $element")
                    }
                }
                else -> {
                    safeLogWarning("PedidoParser", "Elemento de items no reconocido: $element")
                }
            }
        } catch (e: Exception) {
            safeLogWarning("PedidoParser", "Error parsing individual item: ${e.message}", e)
        }
    }

    return parsedList
}

private fun safeLogWarning(tag: String, message: String, throwable: Throwable? = null) {
    try {
        if (throwable != null) {
            android.util.Log.w(tag, message, throwable)
        } else {
            android.util.Log.w(tag, message)
        }
    } catch (_: Throwable) {
        // Fallback seguro para tests unitarios locales en JVM
    }
}

data class UbicacionPedido(
    val nombreComercio: String = "",
    val nombreCliente: String = "",
    val direccion: String = "",
    val coordenadas: Coordenadas = Coordenadas()
)

data class ValoresMonetarios(
    val subtotal: Double = 0.0,
    val costoEnvio: Double = 0.0,
    val total: Double = 0.0,
    val metodoPago: String = "" // "efectivo", "tarjeta"
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class EstadoHistorial(
    val estado: String = "",
    val status: String = "",
    val assignedCourierId: String = "",
    val motorizadoId: String = "",
    val triggeredBy: String = "",
    val timestamp: String = ""
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class BannerPromocional(
    val id: String = "",
    val imageUrl: String = "",
    val title: String = "",
    val subtitle: String = "",
    val actionType: String = "", // "PRODUCT", "CATEGORY", "BUSINESS", "URL"
    val actionId: String = "",   // ID del producto/categoría/comercio o enlace
    val targetUrl: String = "",
    val linkUrl: String = "",
    val link: String = "",
    val deepLink: String = "",
    val businessId: String = "",
    @get:com.google.firebase.firestore.PropertyName("isActive")
    @set:com.google.firebase.firestore.PropertyName("isActive")
    var isActive: Boolean = true,
    val priority: Int = 0,
    val backgroundColor: String = "#0D47A1",
    // Legacy fields for backward compatibility
    val imagenUrl: String = "",
    val titulo: String = "",
    val tipoAccion: String = "",
    val destinoId: String = ""
) {
    fun getEffectiveImageUrl(): String = imageUrl.ifBlank { imagenUrl }
    fun getEffectiveTitle(): String = title.ifBlank { titulo.ifBlank { "Promoción Especial" } }
    fun getEffectiveActionType(): String = actionType.ifBlank { tipoAccion }
    fun getEffectiveActionId(): String = actionId.ifBlank { targetUrl.ifBlank { linkUrl.ifBlank { link.ifBlank { deepLink.ifBlank { destinoId } } } } }
}

// ─── BSD-COMMERCE-ANNOUNCEMENT-CARD-ENTERPRISE-001 ───────────────────────────
@com.google.firebase.firestore.IgnoreExtraProperties
data class CommerceAnnouncement(
    val id: String = "",
    val tenantId: String = "",
    val businessId: String = "",
    val branchId: String = "",
    val title: String = "",
    val description: String = "",
    val imageUrl: String = "",
    val imageStoragePath: String = "",
    val showImage: Boolean = true,
    val ctaLabel: String = "",
    val ctaAction: String = "NONE", // NONE, MERCHANT_MENU, MERCHANT_DISCOUNTS, PRODUCT, PROMOTION, EXTERNAL_URL
    val ctaTarget: String = "",
    val showCTA: Boolean = false,
    @get:com.google.firebase.firestore.PropertyName("isActive")
    @set:com.google.firebase.firestore.PropertyName("isActive")
    var isActive: Boolean = true,
    val displayOrder: Int = 1,
    val startAt: Any? = null,
    val endAt: Any? = null,
    val source: String = "MERCHANT", // MERCHANT | ADMIN
    val version: Int = 1,
    val createdAt: Any? = null,
    val updatedAt: Any? = null,
    val createdBy: String = "",
    val updatedBy: String = ""
) {
    fun isCurrentlyValid(): Boolean {
        if (!isActive) return false
        val nowMs = System.currentTimeMillis()

        val startMs = parseTimeToMs(startAt)
        if (startMs != null && nowMs < startMs) return false

        val endMs = parseTimeToMs(endAt)
        if (endMs != null && nowMs > endMs) return false

        return true
    }

    private fun parseTimeToMs(value: Any?): Long? {
        if (value == null) return null
        return when (value) {
            is com.google.firebase.Timestamp -> value.toDate().time
            is Number -> value.toLong()
            is String -> {
                if (value.isBlank()) null
                else runCatching {
                    java.time.Instant.parse(value).toEpochMilli()
                }.recoverCatching {
                    java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).parse(value)?.time
                }.recoverCatching {
                    java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).parse(value)?.time
                }.getOrNull()
            }
            else -> null
        }
    }
}

// --- Proximity Algorithm ---

object GeoUtils {
    private const val EARTH_RADIUS_KM = 6371.0

    /**
     * Calcula la distancia Haversine entre dos coordenadas en kilómetros.
     */
    fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return EARTH_RADIUS_KM * c
    }
    
    /**
     * Filtra y lista los motorizados disponibles más cercanos al punto de recogida.
     */
    fun findNearestCouriers(
        pickupLocation: Coordenadas,
        couriers: List<UbicacionRepartidor>,
        limit: Int = 3
    ): List<Pair<UbicacionRepartidor, Double>> {
        return couriers
            .filter { it.estadoDisponibilidad == "disponible" }
            .map { courier ->
                val distance = calculateDistance(
                    pickupLocation.latitud, pickupLocation.longitud,
                    courier.coordenadas.latitud, courier.coordenadas.longitud
                )
                Pair(courier, distance)
            }
            .sortedBy { it.second }
            .take(limit)
    }

    /**
     * Calcula el ángulo (bearing) entre dos coordenadas.
     */
    fun calculateBearing(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val lat1Rad = Math.toRadians(lat1)
        val lat2Rad = Math.toRadians(lat2)
        val dLon = Math.toRadians(lon2 - lon1)

        val y = sin(dLon) * cos(lat2Rad)
        val x = cos(lat1Rad) * sin(lat2Rad) - sin(lat1Rad) * cos(lat2Rad) * cos(dLon)
        var bearing = Math.toDegrees(atan2(y, x))
        return (bearing + 360) % 360
    }

    /**
     * Verifica si una coordenada está dentro de un radio en metros (Geocerca).
     */
    fun isWithinGeofence(currentLat: Double, currentLon: Double, targetLat: Double, targetLon: Double, radiusMeters: Double = 50.0): Boolean {
        val distanceKm = calculateDistance(currentLat, currentLon, targetLat, targetLon)
        return distanceKm * 1000 <= radiusMeters
    }
}


data class DriverUser(
    val uid: String = "",
    val nombre: String = "",
    val email: String = "",
    val telefono: String = "",
    val userType: String = "",
    val active: Boolean = false
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class AppUser(
    val uid: String = "",
    val nombre: String = "",
    val name: String = "",
    val email: String = "",
    val telefono: String = "",
    val phone: String = "",
    val userType: String = "",
    val role: String = "",
    val rol: String = "",
    val requestedRole: String = "",
    val active: Boolean = true,
    @get:com.google.firebase.firestore.PropertyName("isActive")
    val isActive: Boolean = true,
    @get:com.google.firebase.firestore.PropertyName("fechaRegistro")
    val rawFechaRegistro: Any? = null,
    val photoUrl: String = "",
    val tenantId: String = ""
) {
    @get:com.google.firebase.firestore.Exclude
    val fechaRegistro: String
        get() = when (rawFechaRegistro) {
            is com.google.firebase.Timestamp -> rawFechaRegistro.toDate().time.toString()
            is String -> rawFechaRegistro
            is Number -> rawFechaRegistro.toLong().toString()
            else -> ""
        }
}

/**
 * Deserialización ultra-resiliente de DocumentSnapshot a AppUser.
 * Resuelve discrepancias de tipos (Timestamp vs String en fechaRegistro, boolean vs string en active/isActive)
 * y previene caídas runtime en listeners en tiempo real.
 */
fun com.google.firebase.firestore.DocumentSnapshot.toAppUserSafely(): AppUser? {
    if (!this.exists()) return null
    return try {
        this.toObject(AppUser::class.java)?.copy(uid = this.id)
    } catch (e: Exception) {
        android.util.Log.w("AppUserParser", "Direct toObject(AppUser) fallback for ${this.id}: ${e.message}")
        try {
            val activeAny = this.get("active") ?: this.get("isActive")
            val isAct = when (activeAny) {
                is Boolean -> activeAny
                is String -> activeAny.equals("true", ignoreCase = true)
                is Number -> activeAny.toInt() == 1
                else -> true
            }
            AppUser(
                uid = this.id,
                nombre = this.getString("nombre") ?: this.getString("name") ?: "",
                name = this.getString("name") ?: this.getString("nombre") ?: "",
                email = this.getString("email") ?: "",
                telefono = this.getString("telefono") ?: this.getString("phone") ?: "",
                phone = this.getString("phone") ?: this.getString("telefono") ?: "",
                userType = this.getString("userType") ?: "",
                role = this.getString("role") ?: this.getString("rol") ?: "",
                rol = this.getString("rol") ?: this.getString("role") ?: "",
                requestedRole = this.getString("requestedRole") ?: "",
                active = isAct,
                isActive = isAct,
                rawFechaRegistro = this.get("fechaRegistro"),
                photoUrl = this.getString("photoUrl") ?: this.getString("photo") ?: "",
                tenantId = this.getString("tenantId") ?: ""
            )
        } catch (fallbackEx: Exception) {
            android.util.Log.e("AppUserParser", "Fatal fallback error deserializing ${this.id}: ${fallbackEx.message}", fallbackEx)
            null
        }
    }
}

@com.google.firebase.firestore.IgnoreExtraProperties
data class Address(
    val id: String = "",
    val userId: String = "",
    val label: String = "Casa",
    val fullAddress: String = "",
    val instructions: String = "",
    val deliveryInstructions: String = "",
    @get:com.google.firebase.firestore.PropertyName("isDefault")
    val isDefault: Boolean = false,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val departmentId: String = "",
    val departmentName: String = "",
    val municipalityId: String = "",
    val municipalityName: String = "",
    val cityId: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
) {
    fun getEffectiveInstructions(): String = instructions.ifBlank { deliveryInstructions }
}

/**
 * Deserialización ultra-resiliente de DocumentSnapshot a Address.
 * Resuelve discrepancias de nombres (isDefault vs default), tipos primitivos y coordenadas (GeoPoint, Map, lat/lng).
 */
fun com.google.firebase.firestore.DocumentSnapshot.toAddressSafely(): Address? {
    try {
        val direct = this.toObject(Address::class.java)
        if (direct != null && (direct.fullAddress.isNotBlank() || direct.label.isNotBlank())) {
            val isDefAny = this.get("isDefault") ?: this.get("default") ?: this.get("predeterminada") ?: this.get("isPrimary")
            val isDef = when (isDefAny) {
                is Boolean -> isDefAny
                is String -> isDefAny.equals("true", ignoreCase = true)
                is Number -> isDefAny.toInt() == 1
                else -> direct.isDefault
            }
            var lat = direct.latitude
            var lng = direct.longitude
            if (lat == 0.0 && lng == 0.0) {
                val locAny = this.get("location") ?: this.get("coordenadas")
                if (locAny is com.google.firebase.firestore.GeoPoint) {
                    lat = locAny.latitude
                    lng = locAny.longitude
                } else if (locAny is Map<*, *>) {
                    lat = (locAny["latitude"] as? Number)?.toDouble() ?: (locAny["lat"] as? Number)?.toDouble() ?: 0.0
                    lng = (locAny["longitude"] as? Number)?.toDouble() ?: (locAny["lng"] as? Number)?.toDouble() ?: 0.0
                } else {
                    lat = (this.get("lat") as? Number)?.toDouble() ?: (this.get("latitud") as? Number)?.toDouble() ?: 0.0
                    lng = (this.get("lng") as? Number)?.toDouble() ?: (this.get("longitud") as? Number)?.toDouble() ?: 0.0
                }
            }
            val effectiveDeptId = direct.departmentId.ifBlank { this.getString("departmentId") ?: this.getString("departamento") ?: "" }
            val effectiveDeptName = direct.departmentName.ifBlank { this.getString("departmentName") ?: effectiveDeptId }
            val effectiveMuniId = direct.municipalityId.ifBlank { this.getString("municipalityId") ?: this.getString("municipio") ?: this.getString("cityId") ?: "" }
            val effectiveMuniName = direct.municipalityName.ifBlank { this.getString("municipalityName") ?: effectiveMuniId }
            val effectiveCityId = direct.cityId.ifBlank { this.getString("cityId") ?: effectiveMuniId }
            return direct.copy(
                id = this.id,
                isDefault = isDef,
                latitude = lat,
                longitude = lng,
                departmentId = effectiveDeptId,
                departmentName = effectiveDeptName,
                municipalityId = effectiveMuniId,
                municipalityName = effectiveMuniName,
                cityId = effectiveCityId
            )
        }
    } catch (e: Exception) {
        // Fallback manual
    }

    return try {
        val uid = this.getString("userId") ?: this.getString("uid") ?: ""
        val label = this.getString("label") ?: this.getString("nombre") ?: this.getString("tag") ?: "Casa"
        val fullAddress = this.getString("fullAddress") ?: this.getString("address") ?: this.getString("direccion") ?: ""
        val instructions = this.getString("instructions") ?: this.getString("deliveryInstructions") ?: this.getString("instrucciones") ?: ""
        
        val isDefAny = this.get("isDefault") ?: this.get("default") ?: this.get("predeterminada") ?: this.get("isPrimary")
        val isDef = when (isDefAny) {
            is Boolean -> isDefAny
            is String -> isDefAny.equals("true", ignoreCase = true)
            is Number -> isDefAny.toInt() == 1
            else -> false
        }

        var lat = (this.get("latitude") as? Number)?.toDouble()
            ?: (this.get("lat") as? Number)?.toDouble()
            ?: (this.get("latitud") as? Number)?.toDouble()
            ?: 0.0
        var lng = (this.get("longitude") as? Number)?.toDouble()
            ?: (this.get("lng") as? Number)?.toDouble()
            ?: (this.get("longitud") as? Number)?.toDouble()
            ?: 0.0

        val locAny = this.get("location") ?: this.get("coordenadas")
        if (locAny is com.google.firebase.firestore.GeoPoint) {
            lat = locAny.latitude
            lng = locAny.longitude
        } else if (locAny is Map<*, *>) {
            val mLat = (locAny["latitude"] as? Number)?.toDouble() ?: (locAny["lat"] as? Number)?.toDouble() ?: 0.0
            val mLng = (locAny["longitude"] as? Number)?.toDouble() ?: (locAny["lng"] as? Number)?.toDouble() ?: 0.0
            if (lat == 0.0 && mLat != 0.0) lat = mLat
            if (lng == 0.0 && mLng != 0.0) lng = mLng
        }

        val deptId = this.getString("departmentId") ?: this.getString("departamentoId") ?: this.getString("department") ?: this.getString("departamento") ?: ""
        val deptName = this.getString("departmentName") ?: this.getString("departamento") ?: deptId
        val muniId = this.getString("municipalityId") ?: this.getString("municipioId") ?: this.getString("municipality") ?: this.getString("municipio") ?: this.getString("cityId") ?: ""
        val muniName = this.getString("municipalityName") ?: this.getString("municipio") ?: this.getString("cityName") ?: muniId
        val cityId = this.getString("cityId") ?: muniId

        val created = (this.get("createdAt") as? Number)?.toLong() ?: System.currentTimeMillis()
        val updated = (this.get("updatedAt") as? Number)?.toLong() ?: System.currentTimeMillis()

        Address(
            id = this.id,
            userId = uid,
            label = label,
            fullAddress = fullAddress,
            instructions = instructions,
            deliveryInstructions = instructions,
            isDefault = isDef,
            latitude = lat,
            longitude = lng,
            departmentId = deptId,
            departmentName = deptName,
            municipalityId = muniId,
            municipalityName = muniName,
            cityId = cityId,
            createdAt = created,
            updatedAt = updated
        )
    } catch (e: Exception) {
        android.util.Log.e("Models", "Error parsing address doc ${this.id}", e)
        null
    }
}

data class PedidoOfrecido(
    val id: String = "",
    val comercioNombre: String = "",
    val comercioDireccion: String = "",
    val clienteDireccion: String = "",
    val pagoMetodo: String = "",
    val gananciaRepartidor: Double = 0.0,
    val status: String = "ready",
    val estado: String = "listo",
    val assignedCourierId: String = "",
    val motorizadoId: String = "",
    val serviceType: String = "COMMERCE_DELIVERY",
    val businessId: String = "",
    val branchId: String = "",
    val rejectedByCouriers: List<String> = emptyList(),
    val rejectionReason: String = "",
    val rejectedAt: Long? = null,
    // C29 X→Y Extended Operational Fields
    val senderName: String = "",
    val senderPhone: String = "",
    val recipientName: String = "",
    val recipientPhone: String = "",
    val packageDescription: String = "",
    val deliveryType: String = "A la puerta",
    val notes: String = "",
    val payer: String = "SENDER", // "SENDER" | "RECIPIENT"
    val calculatedFee: Double = 0.0,
    val customerOffer: Double? = null,
    val amountPaid: Double = 0.0,
    val changeNeeded: Double = 0.0,
    val distanceKm: Double = 0.0,
    // Actividad #1: Segmentación Operacional por Ciudad & Multi-Tenant
    val tenantId: String = "",
    val departmentId: String = "",
    val departmentName: String = "",
    val municipalityId: String = "",
    val municipalityName: String = "",
    val cityId: String = "",
    val cityName: String = "",
    // Actividad #13 & Protocolo BSD-COURIER-EARNINGS-CASH-SETTLEMENT-001: Desglose Monetario Canónico
    val total: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val subtotalProductos: Double = 0.0,
    val discountAmount: Double = 0.0,
    val couponCode: String = "",
    val tip: Double = 0.0,
    val additionalCharge: Double = 0.0,
    val cashReceived: Double = 0.0,
    // Snapshots Inmutables del Modelo de Ganancias del Courier
    val routeDistanceMeters: Long = 0L,
    val routeDistanceKm: Double = 0.0,
    val courierRatePerKmApplied: Double = 0.0,
    val courierOrderBonusApplied: Double = 0.0,
    val courierDistanceEarnings: Double = 0.0,
    val courierBonusEarnings: Double = 0.0,
    val courierTipEarnings: Double = 0.0,
    val courierTotalEarnings: Double = 0.0,
    val compensatedAmount: Double = 0.0,
    val distanceSource: String = "",
    val orderCode: String = "",
    val orderShortCode: String = "",
    val orderSequence: Long = 0L,
    val orderCodePrefix: String = "",
    // Actividad #13: Timestamps Canónicos para Auditoría y Finanzas
    val createdAt: Long? = null,
    val deliveredAt: Long? = null,
    val completedAt: Long? = null,
    val updatedAt: Long? = null
) {
    val displayOrderCode: String
        get() = if (orderCode.isNotBlank()) orderCode else if (id.isNotBlank()) id.takeLast(6).uppercase() else "ORD-000000"

    val displayShortCode: String
        get() = if (orderShortCode.isNotBlank()) orderShortCode else if (id.isNotBlank()) id.takeLast(4).uppercase() else "0000"

    fun getFinancialTimestamp(): Long {
        return completedAt ?: deliveredAt ?: updatedAt ?: createdAt ?: 0L
    }
}

// --- ACTIVIDAD #13: MODELOS DE FINANZAS POR LÍNEA DE NEGOCIO ---

enum class FinanceDateFilter {
    TODAY,
    YESTERDAY,
    THIS_WEEK,
    THIS_MONTH,
    CUSTOM
}

data class LineOfBusinessSummary(
    val lineName: String,
    val serviceType: String,
    val count: Int = 0,
    val totalEarnings: Double = 0.0,
    val totalBilled: Double = 0.0,
    val totalCashReceived: Double = 0.0,
    val totalTips: Double = 0.0,
    val totalDeliveryFees: Double = 0.0,
    val totalProductsAmount: Double = 0.0,
    val totalAdditionalCharges: Double = 0.0,
    val totalOutstandingSettlement: Double = 0.0,
    val totalDistanceKm: Double = 0.0,
    val totalDistanceEarnings: Double = 0.0,
    val totalBonusEarnings: Double = 0.0,
    val totalCompensated: Double = 0.0
)

data class CourierFinancialItem(
    val orderId: String,
    val serviceType: String, // COMMERCE_DELIVERY vs X_TO_Y_DELIVERY
    val referenceNumber: String,
    val entityName: String,
    val routeDescription: String,
    val status: String,
    val paymentMethod: String,
    val earningAmount: Double,
    val totalAmount: Double = 0.0,
    val cashReceived: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val productSubtotal: Double = 0.0,
    val tipAmount: Double = 0.0,
    val additionalCharge: Double = 0.0,
    val distanceKm: Double = 0.0,
    val ratePerKmApplied: Double = 0.0,
    val distanceEarnings: Double = 0.0,
    val bonusEarnings: Double = 0.0,
    val tipEarnings: Double = 0.0,
    val compensatedAmount: Double = 0.0,
    val distanceSource: String = "",
    val timestamp: Long,
    val isCompleted: Boolean
)

data class OverdueClosureNotice(
    val hasOverdue: Boolean = false,
    val overdueDate: String = "",
    val outstandingAmount: Double = 0.0,
    val closureId: String = "",
    val reason: String = ""
)

data class CourierFinancesState(
    val selectedFilter: FinanceDateFilter = FinanceDateFilter.TODAY,
    val customStartDateMs: Long? = null,
    val customEndDateMs: Long? = null,
    val commerceSummary: LineOfBusinessSummary = LineOfBusinessSummary(
        lineName = "Delivery Comercio",
        serviceType = "COMMERCE_DELIVERY"
    ),
    val xToYSummary: LineOfBusinessSummary = LineOfBusinessSummary(
        lineName = "Punto A → Punto B",
        serviceType = "X_TO_Y_DELIVERY"
    ),
    val totalGeneralEarnings: Double = 0.0,
    val totalGeneralCashReceived: Double = 0.0,
    val totalGeneralBilled: Double = 0.0,
    val totalGeneralTips: Double = 0.0,
    val totalGeneralDeliveryFees: Double = 0.0,
    val totalGeneralProductsAmount: Double = 0.0,
    val totalGeneralAdditionalCharges: Double = 0.0,
    val totalGeneralOutstandingSettlement: Double = 0.0,
    val totalGeneralDistanceKm: Double = 0.0,
    val totalGeneralDistanceEarnings: Double = 0.0,
    val totalGeneralBonusEarnings: Double = 0.0,
    val totalGeneralCompensated: Double = 0.0,
    val totalGeneralPayableBalance: Double = 0.0,
    val totalGeneralRequiredDeposit: Double = 0.0,
    val totalGeneralCount: Int = 0,
    val items: List<CourierFinancialItem> = emptyList(),
    val overduePendingClosure: OverdueClosureNotice? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

enum class CourierUiStatus {
    LOADING,
    EMPTY,
    ERROR,
    POOL_ORDERS,
    ASSIGNED_ORDERS,
    ACTIVE_ROUTE
}

data class CourierOrdersState(
    val status: CourierUiStatus = CourierUiStatus.LOADING,
    val poolOrders: List<PedidoOfrecido> = emptyList(),
    val assignedOrders: List<PedidoOfrecido> = emptyList(),
    val activeRouteOrder: PedidoOfrecido? = null,
    val errorMessage: String? = null
)

/**
 * Normalizador Canónico de Estados de Pedidos para BlueSystem Courier Enterprise.
 * Mapea variaciones de idioma y casing a claves semánticas uniformes.
 */
fun normalizeOrderStatus(status: String?): String {
    if (status.isNullOrBlank()) return "pending"
    return when (status.trim().lowercase()) {
        "ready", "listo" -> "ready"
        "assigned", "asignado", "courier_accepted", "aceptado_por_courier" -> "assigned"
        "in_transit", "en_ruta", "picked_up", "recogido", "delivering" -> "in_transit"
        "delivered", "entregado" -> "delivered"
        "completed", "completado" -> "completed"
        "pending", "pendiente", "draft", "created" -> "pending"
        "preparing", "preparando" -> "preparing"
        "payment_verifying" -> "payment_verifying"
        "cancelled", "cancelado" -> "cancelled"
        "rejected", "rechazado" -> "rejected"
        else -> status.trim().lowercase()
    }
}

// --- SPRINT 15 ENTERPRISE DASHBOARD MODELS ---

@com.google.firebase.firestore.IgnoreExtraProperties
data class BlockActionConfig(
    val type: String = "NONE", // NONE, MERCHANT, PRODUCT, CATEGORY, INTERNAL_ROUTE, EXTERNAL_URL
    val target: String = "",
    val label: String = ""
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class HomeEditorialAd(
    val id: String = "",
    val type: String = "GENERIC_EDITORIAL", // MERCHANT_ACQUISITION, COURIER_RECRUITMENT, MERCHANT_PROMOTION, PRODUCT_PROMOTION, PLATFORM_CAMPAIGN, EVENT, SERVICE_PROMOTION, GENERIC_EDITORIAL
    val title: String = "",
    val subtitle: String = "",
    @get:com.google.firebase.firestore.PropertyName("badgeText")
    @set:com.google.firebase.firestore.PropertyName("badgeText")
    var badgeText: String = "",
    val ctaText: String = "",
    val imageUrl: String = "",
    val actionType: String = "NONE", // NONE, MERCHANT, PRODUCT, CATEGORY, INTERNAL_ROUTE, EXTERNAL_URL
    @get:com.google.firebase.firestore.PropertyName("actionTarget")
    @set:com.google.firebase.firestore.PropertyName("actionTarget")
    var actionTarget: String = "",
    val merchantId: String = "",
    @get:com.google.firebase.firestore.PropertyName("merchantNameSnapshot")
    @set:com.google.firebase.firestore.PropertyName("merchantNameSnapshot")
    var merchantNameSnapshot: String = "",
    @get:com.google.firebase.firestore.PropertyName("merchantLogoUrlSnapshot")
    @set:com.google.firebase.firestore.PropertyName("merchantLogoUrlSnapshot")
    var merchantLogoUrlSnapshot: String = "",
    val productId: String = "",
    @get:com.google.firebase.firestore.PropertyName("productNameSnapshot")
    @set:com.google.firebase.firestore.PropertyName("productNameSnapshot")
    var productNameSnapshot: String = "",
    val productPrice: Double? = null,
    @get:com.google.firebase.firestore.PropertyName("active")
    @set:com.google.firebase.firestore.PropertyName("active")
    var active: Boolean = true,
    val order: Int = 0,
    val startAt: Long? = null,
    val endAt: Long? = null,
    // Future-ready segmentation fields
    val targetCity: String? = null,
    val tenantId: String? = null,
    val targetPlatform: String? = null,
    val createdAt: Long? = null,
    val updatedAt: Long? = null,
    val createdBy: String? = null,
    // Compat aliases
    @get:com.google.firebase.firestore.PropertyName("badge")
    @set:com.google.firebase.firestore.PropertyName("badge")
    var badge: String? = null,
    @get:com.google.firebase.firestore.PropertyName("isActive")
    @set:com.google.firebase.firestore.PropertyName("isActive")
    var isActive: Boolean? = null,
    @get:com.google.firebase.firestore.PropertyName("merchantName")
    @set:com.google.firebase.firestore.PropertyName("merchantName")
    var merchantName: String? = null,
    @get:com.google.firebase.firestore.PropertyName("merchantLogoUrl")
    @set:com.google.firebase.firestore.PropertyName("merchantLogoUrl")
    var merchantLogoUrl: String? = null,
    @get:com.google.firebase.firestore.PropertyName("productName")
    @set:com.google.firebase.firestore.PropertyName("productName")
    var productName: String? = null,
    @get:com.google.firebase.firestore.PropertyName("targetId")
    @set:com.google.firebase.firestore.PropertyName("targetId")
    var targetId: String? = null,
    @get:com.google.firebase.firestore.PropertyName("targetRoute")
    @set:com.google.firebase.firestore.PropertyName("targetRoute")
    var targetRoute: String? = null,
    @get:com.google.firebase.firestore.PropertyName("targetUrl")
    @set:com.google.firebase.firestore.PropertyName("targetUrl")
    var targetUrl: String? = null
) {
    val effectiveBadgeText: String get() = badgeText.ifBlank { badge ?: "" }
    val effectiveIsActive: Boolean get() = isActive ?: active
    val effectiveMerchantName: String get() = merchantNameSnapshot.ifBlank { merchantName ?: "" }
    val effectiveMerchantLogoUrl: String get() = merchantLogoUrlSnapshot.ifBlank { merchantLogoUrl ?: "" }
    val effectiveProductName: String get() = productNameSnapshot.ifBlank { productName ?: "" }
    val effectiveActionTarget: String get() = actionTarget.ifBlank { targetUrl ?: targetRoute ?: targetId ?: "" }

    fun isCurrentlyValid(nowMs: Long = System.currentTimeMillis()): Boolean {
        if (!effectiveIsActive) return false
        if (startAt != null && nowMs < startAt) return false
        if (endAt != null && nowMs > endAt) return false
        return true
    }
}

@com.google.firebase.firestore.IgnoreExtraProperties
data class DashboardConfig(
    val showBanners: Boolean = true,
    val showCategories: Boolean = true,
    val showBranchesBlock: Boolean = true,
    val showFeaturedBusinesses: Boolean = true,
    val showFeaturedProducts: Boolean = true,
    val showPromotions: Boolean = true,
    val showSamePrice: Boolean = true,
    val showFlashDeals: Boolean = true,
    val showTopSelling: Boolean = true,
    val showRecommended: Boolean = true,
    val showNewBusinesses: Boolean = true,
    val showQuickReorder: Boolean = true,
    val showFavoritesBlock: Boolean = true,
    val showNearbyBusinesses: Boolean = true,
    val showExpressDeliveryBanner: Boolean = false, // FAIL-CLOSED: Oculto por defecto (Addendum P0-02)
    val xToYServiceEnabled: Boolean = false,        // FAIL-CLOSED: Deshabilitado por defecto (Addendum P0-02)
    val showEditorialAds: Boolean = true,           // Dynamic Editorial Ads (BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001)
    val nearbyInitialRadiusKm: Double = 5.0,
    val nearbySecondaryRadiusKm: Double = 10.0,
    val nearbyMaxRadiusKm: Double = 15.0,
    val nearbyMinimumMerchantCount: Int = 5,
    val nearbyAutoExpandEnabled: Boolean = true,
    val nearbyOrdering: String = "nearest", // "nearest" | "rating"
    @get:com.google.firebase.firestore.PropertyName("sectionOrder")
    @set:com.google.firebase.firestore.PropertyName("sectionOrder")
    var sectionOrder: List<String> = CANONICAL_DEFAULT_SECTION_ORDER,
    @get:com.google.firebase.firestore.PropertyName("blockTitles")
    @set:com.google.firebase.firestore.PropertyName("blockTitles")
    var blockTitles: Map<String, String> = emptyMap(),
    @get:com.google.firebase.firestore.PropertyName("blockActions")
    @set:com.google.firebase.firestore.PropertyName("blockActions")
    var blockActions: Map<String, BlockActionConfig> = emptyMap()
) {
    companion object {
        val CANONICAL_DEFAULT_SECTION_ORDER: List<String> = listOf(
            "BANNERS",
            "CATEGORIES",
            "BRANCHES",
            "NEARBY",
            "FEATURED_BUSINESSES",
            "FEATURED_PRODUCTS",
            "FLASH_DEALS",
            "PROMOTIONS",
            "SAME_PRICE",
            "TOP_SELLING",
            "RECOMMENDED",
            "NEW_BUSINESSES",
            "QUICK_REORDER",
            "FAVORITES",
            "EXPRESS_DELIVERY",
            "EDITORIAL_ADS"
        )

        val CANONICAL_DEFAULT_BLOCK_TITLES: Map<String, String> = mapOf(
            "BANNERS" to "Banners Promocionales",
            "CATEGORIES" to "¿Qué se te antoja hoy?",
            "BRANCHES" to "Sucursales por Comercio 🏢",
            "NEARBY" to "Comercios Cerca de Ti 🏢",
            "FEATURED_BUSINESSES" to "Comercios Destacados ⭐",
            "FEATURED_PRODUCTS" to "Productos Estrella ⭐",
            "FLASH_DEALS" to "Ofertas Flash ⚡ (Tiempo Limitado)",
            "PROMOTIONS" to "Productos con Descuentos 🏷️",
            "SAME_PRICE" to "Mismo Precio que en Local 💰",
            "TOP_SELLING" to "Los Más Vendidos 🔥",
            "RECOMMENDED" to "Recomendados para ti 🎯",
            "NEW_BUSINESSES" to "Comercios Nuevos 🟢",
            "QUICK_REORDER" to "Volver a Pedir 🔄",
            "FAVORITES" to "Tus Comercios Favoritos ❤️",
            "EXPRESS_DELIVERY" to "Envíos Express X→Y",
            "EDITORIAL_ADS" to "Destacados y Novedades"
        )
    }

    /**
     * Normaliza la lista de orden de secciones (BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001):
     * 1. Respeta el orden remoto válido.
     * 2. Elimina IDs duplicados conservando la primera aparición válida.
     * 3. Descarta IDs desconocidos.
     * 4. Anexa al final cualquier sección canónica faltante de forma determinista.
     * 5. La identidad siempre es blockId, NUNCA el título visible.
     */
    fun getNormalizedSectionOrder(): List<String> {
        val result = mutableListOf<String>()
        val knownUpperSet = CANONICAL_DEFAULT_SECTION_ORDER.toSet()

        sectionOrder.forEach { rawId ->
            val id = rawId.trim().uppercase()
            if (knownUpperSet.contains(id) && !result.contains(id)) {
                result.add(id)
            }
        }

        CANONICAL_DEFAULT_SECTION_ORDER.forEach { canonicalId ->
            if (!result.contains(canonicalId)) {
                result.add(canonicalId)
            }
        }

        return result
    }

    /**
     * Resuelve el título dinámico con degradación segura:
     * displayTitle = blockTitles[blockId]?.trim()?.takeIf { it.isNotBlank() } ?: defaultTitle ?: CANONICAL_DEFAULT
     */
    fun getDisplayTitle(blockId: String, defaultTitle: String? = null): String {
        val normalizedId = blockId.trim().uppercase()
        val custom = blockTitles[normalizedId]?.trim()
        if (!custom.isNullOrBlank()) {
            return custom
        }
        if (!defaultTitle.isNullOrBlank()) {
            return defaultTitle
        }
        return CANONICAL_DEFAULT_BLOCK_TITLES[normalizedId] ?: blockId
    }

    /**
     * Obtiene la acción configurada para el encabezado del bloque.
     * Retorna null si es NONE o está vacía (Fail-Closed).
     */
    fun getBlockAction(blockId: String): BlockActionConfig? {
        val normalizedId = blockId.trim().uppercase()
        val action = blockActions[normalizedId] ?: return null
        if (action.type.equals("NONE", ignoreCase = true) || action.type.isBlank()) {
            return null
        }
        return action
    }
}

/**
 * Parser defensivo de DashboardConfig para evitar que campos malformados o nuevos
 * descarten la configuración legacy recibida.
 */
fun com.google.firebase.firestore.DocumentSnapshot?.toDashboardConfigSafely(): DashboardConfig {
    if (this == null || !this.exists()) {
        return DashboardConfig()
    }
    return try {
        val raw = this.toObject(DashboardConfig::class.java) ?: DashboardConfig()

        val rawOrder = when (val o = this.get("sectionOrder")) {
            is List<*> -> o.filterIsInstance<String>()
            else -> raw.sectionOrder
        }

        val rawTitles = when (val t = this.get("blockTitles")) {
            is Map<*, *> -> t.entries.mapNotNull { (k, v) ->
                if (k is String && v is String) k to v else null
            }.toMap()
            else -> raw.blockTitles
        }

        val rawActions = when (val a = this.get("blockActions")) {
            is Map<*, *> -> a.entries.mapNotNull { (k, v) ->
                if (k is String && v is Map<*, *>) {
                    val type = (v["type"] as? String) ?: "NONE"
                    val target = (v["target"] as? String) ?: ""
                    val label = (v["label"] as? String) ?: ""
                    k to BlockActionConfig(type = type, target = target, label = label)
                } else null
            }.toMap()
            else -> raw.blockActions
        }

        raw.copy(
            showEditorialAds = this.getBoolean("showEditorialAds") ?: raw.showEditorialAds,
            sectionOrder = if (rawOrder.isNotEmpty()) rawOrder else raw.sectionOrder,
            blockTitles = rawTitles,
            blockActions = rawActions
        )
    } catch (e: Exception) {
        android.util.Log.w("DashboardConfig", "Error deserializing DashboardConfig, falling back defensively", e)
        try {
            val showBanners = this.getBoolean("showBanners") ?: true
            val showCategories = this.getBoolean("showCategories") ?: true
            val showBranchesBlock = this.getBoolean("showBranchesBlock") ?: true
            val showFeaturedBusinesses = this.getBoolean("showFeaturedBusinesses") ?: true
            val showFeaturedProducts = this.getBoolean("showFeaturedProducts") ?: true
            val showPromotions = this.getBoolean("showPromotions") ?: true
            val showSamePrice = this.getBoolean("showSamePrice") ?: true
            val showFlashDeals = this.getBoolean("showFlashDeals") ?: true
            val showTopSelling = this.getBoolean("showTopSelling") ?: true
            val showRecommended = this.getBoolean("showRecommended") ?: true
            val showNewBusinesses = this.getBoolean("showNewBusinesses") ?: true
            val showQuickReorder = this.getBoolean("showQuickReorder") ?: true
            val showFavoritesBlock = this.getBoolean("showFavoritesBlock") ?: true
            val showNearbyBusinesses = this.getBoolean("showNearbyBusinesses") ?: true
            val showExpressDeliveryBanner = this.getBoolean("showExpressDeliveryBanner") ?: false
            val xToYServiceEnabled = this.getBoolean("xToYServiceEnabled") ?: false
            val showEditorialAds = this.getBoolean("showEditorialAds") ?: true

            val rawOrder = (this.get("sectionOrder") as? List<*>)?.filterIsInstance<String>()
                ?: DashboardConfig.CANONICAL_DEFAULT_SECTION_ORDER

            val rawTitles = (this.get("blockTitles") as? Map<*, *>)?.entries?.mapNotNull { (k, v) ->
                if (k is String && v is String) k to v else null
            }?.toMap() ?: emptyMap()

            val rawActions = (this.get("blockActions") as? Map<*, *>)?.entries?.mapNotNull { (k, v) ->
                if (k is String && v is Map<*, *>) {
                    val type = (v["type"] as? String) ?: "NONE"
                    val target = (v["target"] as? String) ?: ""
                    val label = (v["label"] as? String) ?: ""
                    k to BlockActionConfig(type = type, target = target, label = label)
                } else null
            }?.toMap() ?: emptyMap()

            DashboardConfig(
                showBanners = showBanners,
                showCategories = showCategories,
                showBranchesBlock = showBranchesBlock,
                showFeaturedBusinesses = showFeaturedBusinesses,
                showFeaturedProducts = showFeaturedProducts,
                showPromotions = showPromotions,
                showSamePrice = showSamePrice,
                showFlashDeals = showFlashDeals,
                showTopSelling = showTopSelling,
                showRecommended = showRecommended,
                showNewBusinesses = showNewBusinesses,
                showQuickReorder = showQuickReorder,
                showFavoritesBlock = showFavoritesBlock,
                showNearbyBusinesses = showNearbyBusinesses,
                showExpressDeliveryBanner = showExpressDeliveryBanner,
                xToYServiceEnabled = xToYServiceEnabled,
                showEditorialAds = showEditorialAds,
                sectionOrder = rawOrder,
                blockTitles = rawTitles,
                blockActions = rawActions
            )
        } catch (_: Exception) {
            DashboardConfig()
        }
    }
}

/**
 * Parser defensivo para HomeEditorialAd desde DocumentSnapshot de /home_editorial_ads.
 * Soporta timestamps nativos de Firestore y números epoch, y alias de compatibilidad.
 */
fun com.google.firebase.firestore.DocumentSnapshot.toHomeEditorialAdSafely(): HomeEditorialAd? {
    if (!exists()) return null
    return try {
        val id = id
        val title = getString("title") ?: return null
        val type = getString("type") ?: "GENERIC_EDITORIAL"
        val subtitle = getString("subtitle") ?: ""
        val badgeText = getString("badgeText") ?: getString("badge") ?: ""
        val ctaText = getString("ctaText") ?: "Ver más"
        val imageUrl = getString("imageUrl") ?: ""
        val actionType = getString("actionType") ?: "NONE"
        val actionTarget = getString("actionTarget") ?: getString("targetUrl") ?: getString("targetRoute") ?: getString("targetId") ?: ""
        val merchantId = getString("merchantId") ?: getString("targetId") ?: ""
        val merchantNameSnapshot = getString("merchantNameSnapshot") ?: getString("merchantName") ?: ""
        val merchantLogoUrlSnapshot = getString("merchantLogoUrlSnapshot") ?: getString("merchantLogoUrl") ?: ""
        val productId = getString("productId") ?: ""
        val productNameSnapshot = getString("productNameSnapshot") ?: getString("productName") ?: ""
        val productPrice = getDouble("productPrice")
        val active = getBoolean("active") ?: getBoolean("isActive") ?: true
        val order = getLong("order")?.toInt() ?: 0

        val startAt = when (val s = get("startAt")) {
            is com.google.firebase.Timestamp -> s.toDate().time
            is Number -> s.toLong()
            else -> null
        }
        val endAt = when (val e = get("endAt")) {
            is com.google.firebase.Timestamp -> e.toDate().time
            is Number -> e.toLong()
            else -> null
        }
        val createdAt = when (val c = get("createdAt")) {
            is com.google.firebase.Timestamp -> c.toDate().time
            is Number -> c.toLong()
            else -> null
        }
        val updatedAt = when (val u = get("updatedAt")) {
            is com.google.firebase.Timestamp -> u.toDate().time
            is Number -> u.toLong()
            else -> null
        }
        val targetCity = getString("targetCity")
        val tenantId = getString("tenantId")
        val targetPlatform = getString("targetPlatform")
        val createdBy = getString("createdBy")

        HomeEditorialAd(
            id = id,
            type = type,
            title = title,
            subtitle = subtitle,
            badgeText = badgeText,
            ctaText = ctaText,
            imageUrl = imageUrl,
            actionType = actionType,
            actionTarget = actionTarget,
            merchantId = merchantId,
            merchantNameSnapshot = merchantNameSnapshot,
            merchantLogoUrlSnapshot = merchantLogoUrlSnapshot,
            productId = productId,
            productNameSnapshot = productNameSnapshot,
            productPrice = productPrice,
            active = active,
            order = order,
            startAt = startAt,
            endAt = endAt,
            targetCity = targetCity,
            tenantId = tenantId,
            targetPlatform = targetPlatform,
            createdAt = createdAt,
            updatedAt = updatedAt,
            createdBy = createdBy
        )
    } catch (e: Exception) {
        android.util.Log.w("HomeEditorialAd", "Error parsing editorial ad $id", e)
        null
    }
}

@com.google.firebase.firestore.IgnoreExtraProperties
data class FeaturedProduct(
    val id: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val originalPrice: Double? = null,
    val imageUrl: String = "",
    val rating: Double = 4.9,
    val businessId: String = "",
    val businessName: String = "",
    val categoryName: String = "",
    val isPopular: Boolean = true,
    val productId: String = "",
    val active: Boolean = true
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class FlashDeal(
    val id: String = "",
    val title: String = "",
    val discountTag: String = "40% OFF",
    val productName: String = "",
    val price: Double = 0.0,
    val originalPrice: Double = 0.0,
    val businessId: String = "",
    val businessName: String = "",
    val imageUrl: String = "",
    val expiresAtMinutes: Int = 120,
    val productId: String = "",
    val active: Boolean = true,
    val startAt: com.google.firebase.Timestamp? = null,
    val endAt: com.google.firebase.Timestamp? = null,
    val createdAt: com.google.firebase.Timestamp? = null
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class BranchItem(
    val id: String = "",
    val businessId: String = "",
    val businessName: String = "",
    val branchName: String = "", // ej: "Sucursal Metrocentro"
    val address: String = "",
    val prepTimeMinutes: Int = 20,
    val isOpen: Boolean = true,
    val rating: Double = 4.8,
    val distanceKm: Double = 1.8,
    val imageUrl: String = "",
    val tenantId: String = "",
    val departmentId: String = "",
    val departmentName: String = "",
    val municipalityId: String = "",
    val municipalityName: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class FavoriteItem(
    val itemId: String = "",
    val itemType: String = "business", // "business" o "product"
    val name: String = "",
    val imageUrl: String = "",
    val rating: Double = 4.8,
    val businessId: String = "",
    val addedAt: com.google.firebase.Timestamp? = null
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class CommerceReview(
    val id: String = "",
    val businessId: String = "",
    val branchId: String = "",
    val uid: String = "",
    val userName: String = "Cliente BlueSystem",
    val authorName: String = "",
    val userPhotoUrl: String = "",
    val rating: Double = 5.0,
    val comment: String = "",
    val date: String = "",
    val createdAt: com.google.firebase.Timestamp? = null
) {
    fun getEffectiveAuthor(): String = userName.ifBlank { authorName.ifBlank { "Cliente BlueSystem" } }
}

@com.google.firebase.firestore.IgnoreExtraProperties
data class PricingSnapshot(
    val baseFee: Double = 0.0,
    val pricePerKm: Double = 0.0,
    val distanceKm: Double = 0.0,
    val distanceMeters: Long = 0L,
    val calculatedAmount: Double = 0.0,
    val rawCalculatedTotal: Double = 0.0,
    val roundingAdjustment: Double = 0.0,
    val courierEarnings: Double = 0.0,
    val platformRevenue: Double = 0.0,
    val currency: String = "NIO",
    val pricingPolicy: String = "KM_BLOCK_2DEC",
    val pricingVersion: String = "v2.0",
    val calculatedAt: String = ""
)

@com.google.firebase.firestore.IgnoreExtraProperties
data class RouteSnapshot(
    val routeDistanceMeters: Long = 0L,
    val routeDurationSeconds: Long = 0L,
    val straightLineDistanceMeters: Long = 0L,
    val calculatedFee: Double = 0.0,
    val pricingSnapshot: PricingSnapshot? = null,
    val routingProvider: String = "FALLBACK_ESTIMATED",
    val routingVersion: String = "v1.0",
    val transportProfile: String = "TWO_WHEELER",
    val isFallback: Boolean = false,
    val polyline: String = "",
    val calculatedAt: String = ""
) {
    val distanceKm: Double get() = kotlin.math.round((routeDistanceMeters / 1000.0) * 100.0) / 100.0
    val durationMinutes: Int get() = (routeDurationSeconds / 60).toInt()
}



