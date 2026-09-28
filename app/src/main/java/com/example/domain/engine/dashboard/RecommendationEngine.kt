package com.example.domain.engine.dashboard

import com.example.BranchItem
import com.example.GeoUtils
import com.example.Pedido
import com.example.data.repository.BusinessInfo

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — C2D RECOMMENDATION ENGINE
 * Actividad: BSD-C2D-TOPSELLING-RECOMMENDED-SEMANTIC-CORRECTION-001 (P1-02)
 *
 * Contrato Canónico Multivariable:
 * S = 0.40 C_affinity + 0.25 R_norm + 0.20 P_geo + 0.15 F_trusted
 *
 * Especificación de Ponderación (0 - 100 puntos):
 * 1. Afinidad de Categoría (40% - 40 pts):
 *    - Analiza las últimas 5 órdenes completadas del cliente autenticado.
 *    - Categoría #1 más consumida: 1.0 (40.0 pts)
 *    - Categoría #2 más consumida: 0.6 (24.0 pts)
 *    - Sin coincidencia / Cold Start: 0.0 (0.0 pts)
 * 2. Calificación Normalizada (25% - 25 pts):
 *    - R_norm = ((rating - 3.5) / 1.5).coerceIn(0.0, 1.0)
 *    - Puntos = R_norm * 25.0
 * 3. Proximidad Geográfica Haversine (20% - 20 pts):
 *    - <= 2.0 km: 1.0 (20.0 pts)
 *    - 2.0 - 5.0 km: 0.7 (14.0 pts)
 *    - 5.0 - 10.0 km: 0.4 (8.0 pts)
 *    - > 10.0 km: 0.1 (2.0 pts)
 *    - Coordenadas no disponibles / null: 0.0 (0.0 pts - neutral fallback honesto)
 * 4. Confianza y Destacado (15% - 15 pts):
 *    - isVerified && isFeatured: 1.0 (15.0 pts)
 *    - Solo isVerified: 0.5 (7.5 pts)
 *    - Ninguno: 0.0 (0.0 pts)
 *
 * Inmunidad: Cero dependencias de Android UI, Composable o llamadas directas a Firestore.
 */
object RecommendationEngine {

    data class UserCoordinates(
        val latitude: Double,
        val longitude: Double
    )

    data class RecommendationScore(
        val businessId: String,
        val categoryScore: Double,
        val ratingScore: Double,
        val geoScore: Double,
        val trustScore: Double,
        val totalScore: Double
    )

    data class RecommendedBusinessResult(
        val business: BusinessInfo,
        val score: RecommendationScore
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
     * Normaliza un string de categoría para comparaciones insensibles a mayúsculas y acentos.
     */
    fun normalizeCategory(category: String): String {
        return category.trim().lowercase()
            .replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
    }

    /**
     * Determina las categorías predominantes (#1 y #2) a partir de las últimas 5 órdenes completadas.
     * Retorna un Pair donde first es Categoría #1 y second es Categoría #2 (o null si no existen).
     */
    fun extractTopUserCategories(
        recentOrders: List<Pedido>,
        publicBusinesses: List<BusinessInfo>
    ): Pair<String?, String?> {
        val bizMap = publicBusinesses.associateBy { it.id }

        // 1. Filtrar órdenes calificadas terminales de éxito
        val qualifiedOrders = recentOrders.filter { order ->
            if (order.hasBeenRated) {
                // Si ha sido calificada, ya concluyó
            }
            val st = (order.status.ifBlank { order.estado }).trim().lowercase()
            val isSuccess = st == "delivered" || st == "completed" || st == "entregado" || st == "completado"
            val isExcluded = st == "cancelled" || st == "cancelado" || st == "rejected" || st == "rechazado" ||
                    st == "refunded" || st == "reembolsado" || st == "in_transit" || st == "preparing" || st == "pending"
            isSuccess && !isExcluded
        }.sortedByDescending { it.createdAt?.seconds ?: 0L }
            .take(5)

        if (qualifiedOrders.isEmpty()) {
            return Pair(null, null)
        }

        // 2. Extraer y normalizar categorías por orden
        val categoryCounts = mutableMapOf<String, Int>()
        val categoryRecency = mutableMapOf<String, Int>() // menor índice = más reciente

        qualifiedOrders.forEachIndexed { index, order ->
            val biz = bizMap[order.businessId]
            val catRaw = biz?.getEffectiveCategory() ?: ""
            val catNorm = normalizeCategory(catRaw)
            if (catNorm.isNotBlank()) {
                categoryCounts[catNorm] = categoryCounts.getOrDefault(catNorm, 0) + 1
                if (!categoryRecency.containsKey(catNorm)) {
                    categoryRecency[catNorm] = index
                }
            }
        }

        if (categoryCounts.isEmpty()) {
            return Pair(null, null)
        }

        // 3. Ordenar por frecuencia descendente, con desempate por recencia
        val sortedCategories = categoryCounts.entries.sortedWith(
            compareByDescending<Map.Entry<String, Int>> { it.value }
                .thenBy { categoryRecency[it.key] ?: Int.MAX_VALUE }
        ).map { it.key }

        val top1 = sortedCategories.getOrNull(0)
        val top2 = sortedCategories.getOrNull(1)

        return Pair(top1, top2)
    }

    /**
     * Calcula la puntuación multivariable completa para un comercio individual.
     */
    fun scoreBusiness(
        business: BusinessInfo,
        topCategory1: String?,
        topCategory2: String?,
        userLocation: UserCoordinates?,
        branches: List<BranchItem> = emptyList()
    ): RecommendationScore {
        // 1. Afinidad de Categoría (40% - 40 pts)
        val bizCatNorm = normalizeCategory(business.getEffectiveCategory())
        val categoryScore = when {
            topCategory1 != null && bizCatNorm == topCategory1 -> 40.0
            topCategory2 != null && bizCatNorm == topCategory2 -> 24.0
            else -> 0.0
        }

        // 2. Calificación Normalizada (25% - 25 pts): ((rating - 3.5) / 1.5) * 25.0
        val effectiveRating = business.getEffectiveRating()
        val rNorm = ((effectiveRating - 3.5) / 1.5).coerceIn(0.0, 1.0)
        val ratingScore = rNorm * 25.0

        // 3. Proximidad Geográfica Haversine (20% - 20 pts)
        val geoScore = if (userLocation != null && isValidCoordinate(userLocation.latitude, userLocation.longitude)) {
            val bizLat = business.getEffectiveLatitude(branches)
            val bizLng = business.getEffectiveLongitude(branches)
            if (isValidCoordinate(bizLat, bizLng)) {
                val distanceKm = GeoUtils.calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    bizLat,
                    bizLng
                )
                when {
                    distanceKm <= 2.0 -> 20.0
                    distanceKm <= 5.0 -> 14.0
                    distanceKm <= 10.0 -> 8.0
                    else -> 2.0
                }
            } else {
                0.0
            }
        } else {
            0.0 // Neutral fallback sin inventar distancias fijas
        }

        // 4. Confianza y Destacado (15% - 15 pts)
        val isVerified = business.getEffectiveIsVerified()
        val isFeatured = business.getEffectiveIsFeatured()
        val trustScore = when {
            isVerified && isFeatured -> 15.0
            isVerified -> 7.5
            else -> 0.0
        }

        val totalScore = (categoryScore + ratingScore + geoScore + trustScore).coerceIn(0.0, 100.0)

        return RecommendationScore(
            businessId = business.id,
            categoryScore = categoryScore,
            ratingScore = ratingScore,
            geoScore = geoScore,
            trustScore = trustScore,
            totalScore = totalScore
        )
    }

    /**
     * Evalúa y devuelve la lista puntuada y ordenada determinísticamente de comercios recomendados.
     */
    fun scoreBusinesses(
        publicBusinesses: List<BusinessInfo>,
        recentOrders: List<Pedido>,
        userLocation: UserCoordinates? = null,
        branches: List<BranchItem> = emptyList(),
        limit: Int = 10
    ): List<RecommendedBusinessResult> {
        val (top1, top2) = extractTopUserCategories(recentOrders, publicBusinesses)

        return publicBusinesses
            .filter { it.isOpen && it.getEffectiveIsOpen() }
            .map { biz ->
                val score = scoreBusiness(
                    business = biz,
                    topCategory1 = top1,
                    topCategory2 = top2,
                    userLocation = userLocation,
                    branches = branches
                )
                RecommendedBusinessResult(biz, score)
            }
            .sortedWith(
                compareByDescending<RecommendedBusinessResult> { it.score.totalScore }
                    .thenByDescending { it.business.getEffectiveRating() }
                    .thenBy { it.business.id }
            )
            .take(limit)
    }

    /**
     * Interfaz principal consumida por el Customer Dashboard.
     * Devuelve la lista pura de comercios ordenada por recomendación personalizada.
     */
    fun calculateRecommendations(
        publicBusinesses: List<BusinessInfo>,
        recentOrders: List<Pedido>,
        userLocation: UserCoordinates? = null,
        branches: List<BranchItem> = emptyList(),
        limit: Int = 10
    ): List<BusinessInfo> {
        return scoreBusinesses(
            publicBusinesses = publicBusinesses,
            recentOrders = recentOrders,
            userLocation = userLocation,
            branches = branches,
            limit = limit
        ).map { it.business }
    }
}
