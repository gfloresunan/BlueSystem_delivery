package com.example.domain.engine

import com.example.DashboardConfig
import com.example.GeoUtils
import com.example.data.repository.BusinessInfo
import com.example.BranchItem
import java.util.Locale

/**
 * Motor Geoespacial Canónico de Comercios Cercanos (Actividad #18 Enterprise)
 * PROTOCOL ID: BSDEL-C18-NEARBY-MERCHANTS
 *
 * Principio Operativo:
 * - Descubrimiento determinista basado en coordenadas reales (Haversine).
 * - Expansión automática multi-etapa: Radio Inicial (5km) -> Secundario (10km) -> Máximo (15km).
 * - Ordenamiento por proximidad estricta (nearest first).
 * - Cero llamadas $N+1$, $0 costo de mapas externos.
 */
object NearbyMerchantEngine {

    data class NearbyBusinessItem(
        val business: BusinessInfo,
        val distanceKm: Double,
        val formattedDistance: String,
        val merchantLat: Double,
        val merchantLng: Double
    )

    data class NearbySearchResult(
        val items: List<NearbyBusinessItem>,
        val activeRadiusKm: Double,
        val wasExpanded: Boolean,
        val expansionStage: Int, // 1: Initial, 2: Secondary, 3: Max
        val totalEligibleInMaxRadius: Int,
        val hasCustomerCoordinates: Boolean,
        val isServiceAvailable: Boolean
    )

    /**
     * Valida si un par de coordenadas es numéricamente y geográficamente válido.
     */
    fun isValidCoordinate(lat: Double, lng: Double): Boolean {
        return !lat.isNaN() && !lng.isNaN() &&
                !lat.isInfinite() && !lng.isInfinite() &&
                lat in -90.0..90.0 && lng in -180.0..180.0 &&
                !(lat == 0.0 && lng == 0.0)
    }

    /**
     * Sanitiza la configuración administrativa previniendo bucles o valores incoherentes.
     */
    fun sanitizeConfig(config: DashboardConfig): DashboardConfig {
        val initial = if (config.nearbyInitialRadiusKm > 0.0) config.nearbyInitialRadiusKm else 5.0
        val secondary = if (config.nearbySecondaryRadiusKm > initial) config.nearbySecondaryRadiusKm else (initial + 5.0)
        val max = if (config.nearbyMaxRadiusKm >= secondary) config.nearbyMaxRadiusKm else (secondary + 5.0)
        val minCount = if (config.nearbyMinimumMerchantCount >= 1) config.nearbyMinimumMerchantCount else 5

        return config.copy(
            nearbyInitialRadiusKm = initial,
            nearbySecondaryRadiusKm = secondary,
            nearbyMaxRadiusKm = max,
            nearbyMinimumMerchantCount = minCount
        )
    }

    /**
     * Ejecuta el algoritmo de descubrimiento de comercios cercanos.
     */
    fun findNearbyMerchants(
        customerLat: Double,
        customerLng: Double,
        businesses: List<BusinessInfo>,
        branches: List<BranchItem> = emptyList(),
        config: DashboardConfig = DashboardConfig()
    ): NearbySearchResult {
        val hasCustomerCoords = isValidCoordinate(customerLat, customerLng)
        if (!hasCustomerCoords) {
            return NearbySearchResult(
                items = emptyList(),
                activeRadiusKm = config.nearbyInitialRadiusKm,
                wasExpanded = false,
                expansionStage = 1,
                totalEligibleInMaxRadius = 0,
                hasCustomerCoordinates = false,
                isServiceAvailable = false
            )
        }

        val safeConfig = sanitizeConfig(config)

        // 1. Filtrar comercios elegibles (activos, válidos, no eliminados) con coordenadas válidas
        val eligibleMerchantsWithDistance = businesses.mapNotNull { biz ->
            if (!biz.getEffectiveIsActive()) return@mapNotNull null

            val bizLat = biz.getEffectiveLatitude(branches)
            val bizLng = biz.getEffectiveLongitude(branches)

            if (!isValidCoordinate(bizLat, bizLng)) return@mapNotNull null

            val distance = GeoUtils.calculateDistance(customerLat, customerLng, bizLat, bizLng)
            if (distance.isNaN() || distance.isInfinite() || distance < 0.0) return@mapNotNull null

            val formattedDist = formatDistance(distance)
            NearbyBusinessItem(
                business = biz,
                distanceKm = distance,
                formattedDistance = formattedDist,
                merchantLat = bizLat,
                merchantLng = bizLng
            )
        }

        // Ordenamiento natural por menor distancia (nearest first)
        val sortedAll = eligibleMerchantsWithDistance.sortedBy { it.distanceKm }

        val initialRadius = safeConfig.nearbyInitialRadiusKm
        val secondaryRadius = safeConfig.nearbySecondaryRadiusKm
        val maxRadius = safeConfig.nearbyMaxRadiusKm
        val minCount = safeConfig.nearbyMinimumMerchantCount
        val autoExpand = safeConfig.nearbyAutoExpandEnabled

        // Etapa 1: Radio Inicial (ej: 5 km)
        val stage1Items = sortedAll.filter { it.distanceKm <= initialRadius }
        if (stage1Items.size >= minCount || !autoExpand) {
            return NearbySearchResult(
                items = stage1Items,
                activeRadiusKm = initialRadius,
                wasExpanded = false,
                expansionStage = 1,
                totalEligibleInMaxRadius = sortedAll.count { it.distanceKm <= maxRadius },
                hasCustomerCoordinates = true,
                isServiceAvailable = stage1Items.isNotEmpty()
            )
        }

        // Etapa 2: Radio Secundario (ej: 10 km)
        val stage2Items = sortedAll.filter { it.distanceKm <= secondaryRadius }
        if (stage2Items.size >= minCount) {
            return NearbySearchResult(
                items = stage2Items,
                activeRadiusKm = secondaryRadius,
                wasExpanded = true,
                expansionStage = 2,
                totalEligibleInMaxRadius = sortedAll.count { it.distanceKm <= maxRadius },
                hasCustomerCoordinates = true,
                isServiceAvailable = true
            )
        }

        // Etapa 3: Radio Máximo (ej: 15 km)
        val stage3Items = sortedAll.filter { it.distanceKm <= maxRadius }
        return NearbySearchResult(
            items = stage3Items,
            activeRadiusKm = maxRadius,
            wasExpanded = true,
            expansionStage = 3,
            totalEligibleInMaxRadius = stage3Items.size,
            hasCustomerCoordinates = true,
            isServiceAvailable = stage3Items.isNotEmpty()
        )
    }

    /**
     * Formatea la distancia de manera limpia para la UI (ej: 0.5 km, 1.2 km, 12.0 km).
     */
    fun formatDistance(distanceKm: Double): String {
        return if (distanceKm < 0.1) {
            "< 100 m"
        } else if (distanceKm < 1.0) {
            String.format(Locale.US, "%.1f km", distanceKm)
        } else {
            String.format(Locale.US, "%.1f km", distanceKm)
        }
    }
}
