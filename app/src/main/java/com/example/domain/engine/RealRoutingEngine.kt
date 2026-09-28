package com.example.domain.engine

import com.example.GeoUtils
import com.example.RouteSnapshot
import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.tasks.await
import java.util.Locale
import kotlin.math.roundToLong

/**
 * Motor canónico de cálculo de rutas reales y tarificación autoritativa (Actividad #16).
 * Código: BSDEL-C16-REAL-ROUTING
 */
object RealRoutingEngine {
    const val TARIFA_BASE_NIO = 35.0
    const val COSTO_POR_KM_NIO = 15.0
    const val MANAGUA_ROAD_TORTUOSITY_FACTOR = 1.28

    private val localCache = mutableMapOf<String, RouteSnapshot>()

    /**
     * Calcula la tarifa oficial autoritativa según la distancia en kilómetros.
     * Aplica la regla canónica KM_BLOCK_2DEC para concordancia exacta con la distancia presentada.
     */
    fun calculateAuthoritativeFee(distanceKm: Double): Double {
        if (distanceKm <= 0.0) return TARIFA_BASE_NIO
        val roundedKm = kotlin.math.round(distanceKm * 100.0) / 100.0
        val raw = TARIFA_BASE_NIO + (roundedKm * COSTO_POR_KM_NIO)
        return kotlin.math.round(raw * 100.0) / 100.0
    }

    /**
     * Calcula la tarifa oficial autoritativa a partir de metros de ruta.
     */
    fun calculateAuthoritativeFeeFromMeters(distanceMeters: Long): Double {
        val km = distanceMeters / 1000.0
        return calculateAuthoritativeFee(km)
    }

    /**
     * Calcula la distancia estimada de red vial a partir de la distancia euclidiana Haversine.
     */
    fun calculateEstimatedRoadDistanceMeters(
        lat1: Double, lon1: Double,
        lat2: Double, lon2: Double
    ): Long {
        val haversineKm = GeoUtils.calculateDistance(lat1, lon1, lat2, lon2)
        val roadKm = haversineKm * MANAGUA_ROAD_TORTUOSITY_FACTOR
        return (roadKm * 1000.0).roundToLong()
    }

    /**
     * Genera un snapshot geométrico de estimación vial exclusivamente para dibujo/distancia en mapa.
     * NO genera tarificación autoritativa (pricingSnapshot = null, calculatedFee = 0.0) para garantizar Fail-Closed.
     */
    fun createFallbackSnapshot(
        lat1: Double, lon1: Double,
        lat2: Double, lon2: Double,
        transportProfile: String = "TWO_WHEELER"
    ): RouteSnapshot {
        val straightLineKm = GeoUtils.calculateDistance(lat1, lon1, lat2, lon2)
        val straightLineMeters = (straightLineKm * 1000.0).roundToLong()
        val roadMeters = (straightLineKm * MANAGUA_ROAD_TORTUOSITY_FACTOR * 1000.0).roundToLong()
        val durationSeconds = ((roadMeters / 1000.0) * 120.0).roundToLong() // ~30 km/h
        val now = System.currentTimeMillis().toString()

        return RouteSnapshot(
            routeDistanceMeters = roadMeters,
            routeDurationSeconds = durationSeconds,
            straightLineDistanceMeters = straightLineMeters,
            calculatedFee = 0.0,
            pricingSnapshot = null,
            routingProvider = "FALLBACK_ESTIMATED",
            routingVersion = "v1.0",
            transportProfile = transportProfile,
            isFallback = true,
            calculatedAt = now
        )
    }

    /**
     * Resuelve la ruta real invocando el backend autoritativo con soporte de caché.
     * Si no se obtiene pricingSnapshot autoritativo, propaga excepción Fail-Closed.
     */
    suspend fun resolveRealRoute(
        originLat: Double,
        originLng: Double,
        destLat: Double,
        destLng: Double,
        transportProfile: String = "TWO_WHEELER"
    ): RouteSnapshot {
        val cacheKey = String.format(Locale.US, "%.4f,%.4f->%.4f,%.4f:%s", originLat, originLng, destLat, destLng, transportProfile)
        localCache[cacheKey]?.let { return it }

        val functions = FirebaseFunctions.getInstance()
        val payload = mapOf(
            "originLat" to originLat,
            "originLng" to originLng,
            "destLat" to destLat,
            "destLng" to destLng,
            "transportProfile" to transportProfile
        )

        val result = functions
            .getHttpsCallable("calculateDeliveryRouteCallable")
            .call(payload)
            .await()

        val data = (result.data as? Map<*, *>)?.get("data") as? Map<*, *>
            ?: throw IllegalStateException("ROUTING_BACKEND_EMPTY: Respuesta vacía del servidor de rutas.")

        val distanceMeters = (data["routeDistanceMeters"] as? Number)?.toLong() ?: 0L
        val durationSeconds = (data["routeDurationSeconds"] as? Number)?.toLong() ?: 0L
        val straightMeters = (data["straightLineDistanceMeters"] as? Number)?.toLong() ?: 0L
        val provider = data["routingProvider"] as? String ?: "GOOGLE_ROUTES_V2"
        val version = data["routingVersion"] as? String ?: "v1.0"
        val isFallback = data["isFallback"] as? Boolean ?: false
        val polyline = data["polyline"] as? String ?: ""
        val calculatedAt = data["calculatedAt"] as? String ?: System.currentTimeMillis().toString()

        val snapMap = data["pricingSnapshot"] as? Map<*, *>
            ?: throw IllegalStateException("PRICING_SNAPSHOT_MISSING: El backend autoritativo no proveyó pricingSnapshot.")

        val baseFee = (snapMap["baseFee"] as? Number)?.toDouble()
            ?: throw IllegalStateException("PRICING_BASE_FEE_MISSING: El snapshot carece de baseFee autoritativa.")
        val pricePerKm = (snapMap["pricePerKm"] as? Number)?.toDouble()
            ?: (snapMap["perKmRate"] as? Number)?.toDouble()
            ?: throw IllegalStateException("PRICING_PRICE_PER_KM_MISSING: El snapshot carece de pricePerKm autoritativo.")
        val distKm = (snapMap["distanceKm"] as? Number)?.toDouble()
            ?: (kotlin.math.round((distanceMeters / 1000.0) * 100.0) / 100.0)
        val distM = (snapMap["distanceMeters"] as? Number)?.toLong() ?: distanceMeters
        val amount = (snapMap["calculatedAmount"] as? Number)?.toDouble()
            ?: throw IllegalStateException("PRICING_AMOUNT_MISSING: El snapshot carece de calculatedAmount.")
        val currency = snapMap["currency"] as? String ?: "NIO"
        val policy = snapMap["pricingPolicy"] as? String ?: "KM_BLOCK_2DEC"
        val pVersion = snapMap["pricingVersion"] as? String ?: "v2.0"
        val calcAt = snapMap["calculatedAt"] as? String ?: calculatedAt

        val courierEarn = (snapMap["courierEarnings"] as? Number)?.toDouble()
            ?: (kotlin.math.round(distKm * pricePerKm * 100.0) / 100.0)
        val rawTotal = (snapMap["rawCalculatedTotal"] as? Number)?.toDouble()
            ?: (kotlin.math.round((baseFee + courierEarn) * 100.0) / 100.0)
        val roundAdj = (snapMap["roundingAdjustment"] as? Number)?.toDouble()
            ?: (kotlin.math.round((amount - rawTotal) * 100.0) / 100.0)
        val platRev = (snapMap["platformRevenue"] as? Number)?.toDouble()
            ?: (kotlin.math.round((amount - courierEarn) * 100.0) / 100.0)

        val pricingSnapshot = com.example.PricingSnapshot(
            baseFee = baseFee,
            pricePerKm = pricePerKm,
            distanceKm = distKm,
            distanceMeters = distM,
            calculatedAmount = amount,
            rawCalculatedTotal = rawTotal,
            roundingAdjustment = roundAdj,
            courierEarnings = courierEarn,
            platformRevenue = platRev,
            currency = currency,
            pricingPolicy = policy,
            pricingVersion = pVersion,
            calculatedAt = calcAt
        )

        val snapshot = RouteSnapshot(
            routeDistanceMeters = distanceMeters,
            routeDurationSeconds = durationSeconds,
            straightLineDistanceMeters = straightMeters,
            calculatedFee = amount,
            pricingSnapshot = pricingSnapshot,
            routingProvider = provider,
            routingVersion = version,
            transportProfile = transportProfile,
            isFallback = isFallback,
            polyline = polyline,
            calculatedAt = calculatedAt
        )

        localCache[cacheKey] = snapshot
        return snapshot
    }

    /**
     * Resuelve la ruta y tarifa dinámica de comercio invocando el backend autoritativo con servicio COMMERCE_DELIVERY.
     * Aplica la regla canónica KM_BLOCK_2DEC y separa la tarifa del cliente de la ganancia del courier.
     */
    suspend fun resolveCommerceRoute(
        originLat: Double,
        originLng: Double,
        destLat: Double,
        destLng: Double,
        transportProfile: String = "TWO_WHEELER"
    ): RouteSnapshot {
        val cacheKey = String.format(Locale.US, "COMMERCE:%.4f,%.4f->%.4f,%.4f:%s", originLat, originLng, destLat, destLng, transportProfile)
        localCache[cacheKey]?.let { return it }

        val functions = FirebaseFunctions.getInstance()
        val payload = mapOf(
            "originLat" to originLat,
            "originLng" to originLng,
            "destLat" to destLat,
            "destLng" to destLng,
            "transportProfile" to transportProfile,
            "serviceType" to "COMMERCE_DELIVERY"
        )

        val result = functions
            .getHttpsCallable("calculateDeliveryRouteCallable")
            .call(payload)
            .await()

        val data = (result.data as? Map<*, *>)?.get("data") as? Map<*, *>
            ?: throw IllegalStateException("ROUTING_BACKEND_EMPTY: Respuesta vacía del servidor de rutas.")

        val distanceMeters = (data["routeDistanceMeters"] as? Number)?.toLong() ?: 0L
        val durationSeconds = (data["routeDurationSeconds"] as? Number)?.toLong() ?: 0L
        val straightMeters = (data["straightLineDistanceMeters"] as? Number)?.toLong() ?: 0L
        val provider = data["routingProvider"] as? String ?: "GOOGLE_ROUTES_V2"
        val version = data["routingVersion"] as? String ?: "v2.2-commerce"
        val isFallback = data["isFallback"] as? Boolean ?: false
        val polyline = data["polyline"] as? String ?: ""
        val calculatedAt = data["calculatedAt"] as? String ?: System.currentTimeMillis().toString()

        val snapMap = data["pricingSnapshot"] as? Map<*, *>
            ?: throw IllegalStateException("PRICING_SNAPSHOT_MISSING: El backend autoritativo no proveyó pricingSnapshot.")

        val baseFee = (snapMap["baseFee"] as? Number)?.toDouble() ?: 0.0
        val pricePerKm = (snapMap["customerPricePerKm"] as? Number)?.toDouble()
            ?: (snapMap["pricePerKm"] as? Number)?.toDouble()
            ?: (snapMap["perKmRate"] as? Number)?.toDouble()
            ?: 8.0
        val distKm = (snapMap["distanceKm"] as? Number)?.toDouble()
            ?: (kotlin.math.round((distanceMeters / 1000.0) * 100.0) / 100.0)
        val distM = (snapMap["distanceMeters"] as? Number)?.toLong() ?: distanceMeters
        val amount = (snapMap["deliveryFee"] as? Number)?.toDouble()
            ?: (snapMap["calculatedAmount"] as? Number)?.toDouble()
            ?: (kotlin.math.round(distKm * pricePerKm * 100.0) / 100.0)
        val courierEarn = (snapMap["courierEarnings"] as? Number)?.toDouble()
            ?: (snapMap["courierEarningsFloat"] as? Number)?.toDouble()
            ?: (kotlin.math.round(distKm * 7.0 * 100.0) / 100.0)
        val currency = snapMap["currency"] as? String ?: "NIO"
        val policy = snapMap["pricingPolicy"] as? String ?: "KM_BLOCK_2DEC"
        val pVersion = snapMap["pricingVersion"] as? String ?: "v2.2-commerce"
        val calcAt = snapMap["calculatedAt"] as? String ?: calculatedAt

        val pricingSnapshot = com.example.PricingSnapshot(
            baseFee = baseFee,
            pricePerKm = pricePerKm,
            distanceKm = distKm,
            distanceMeters = distM,
            calculatedAmount = amount,
            rawCalculatedTotal = amount,
            roundingAdjustment = 0.0,
            courierEarnings = courierEarn,
            platformRevenue = maxOf(0.0, kotlin.math.round((amount - courierEarn) * 100.0) / 100.0),
            currency = currency,
            pricingPolicy = policy,
            pricingVersion = pVersion,
            calculatedAt = calcAt
        )

        val snapshot = RouteSnapshot(
            routeDistanceMeters = distanceMeters,
            routeDurationSeconds = durationSeconds,
            straightLineDistanceMeters = straightMeters,
            calculatedFee = amount,
            pricingSnapshot = pricingSnapshot,
            routingProvider = provider,
            routingVersion = version,
            transportProfile = transportProfile,
            isFallback = isFallback,
            polyline = polyline,
            calculatedAt = calculatedAt
        )

        localCache[cacheKey] = snapshot
        return snapshot
    }
}
