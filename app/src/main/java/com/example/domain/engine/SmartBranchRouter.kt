package com.example.domain.engine

import com.example.data.dto.menu.ProductDto
import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.Branch
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Motor de Selección Inteligente de Sucursales (Fase 9.3)
 * Regla Canónica: La sucursal más cercana NO gana automáticamente.
 * Gana la sucursal activa, abierta, compatible con fulfillmentType (DELIVERY/PICKUP),
 * dentro de radio de cobertura y capaz de preparar TODOS los productos del carrito.
 * Entre las candidatas válidas, se prioriza la de menor distancia GPS.
 */
object SmartBranchRouter {

    data class RoutingResult(
        val selectedBranch: Branch?,
        val candidateBranches: List<Branch>,
        val isEligible: Boolean,
        val rejectionReason: String? = null
    )

    fun selectOptimalBranch(
        branches: List<Branch>,
        cartProducts: List<ProductDto>,
        customerLat: Double,
        customerLng: Double,
        fulfillmentType: String // "DELIVERY" | "PICKUP"
    ): RoutingResult {
        if (branches.isEmpty()) {
            return RoutingResult(null, emptyList(), false, "No existen sucursales registradas para este comercio.")
        }

        // 1. Filtrar sucursales activas y abiertas
        val activeBranches = branches.filter { it.status.isOperational && (it.isOpen || it.isPrimary) }
        if (activeBranches.isEmpty()) {
            return RoutingResult(null, emptyList(), false, "El comercio no tiene sucursales abiertas en este momento.")
        }

        // 2. Filtrar compatibilidad de modalidad (DELIVERY / PICKUP)
        val modeBranches = activeBranches.filter { branch ->
            if (fulfillmentType.equals("DELIVERY", ignoreCase = true)) {
                branch.deliveryRadiusKm > 0.0
            } else {
                true // PICKUP siempre permitido si la sucursal está abierta
            }
        }

        if (modeBranches.isEmpty()) {
            return RoutingResult(null, emptyList(), false, "Ninguna sucursal ofrece la modalidad $fulfillmentType en esta área.")
        }

        // 3. Filtrar por Disponibilidad de TODOS los Productos en la Sucursal
        val availableBranches = modeBranches.filter { branch ->
            cartProducts.all { product -> product.isAvailableInBranch(branch.branchId) }
        }

        if (availableBranches.isEmpty()) {
            return RoutingResult(null, modeBranches, false, "Los productos seleccionados no están disponibles juntos en una misma sucursal.")
        }

        // 4. Filtrar Cobertura por Distancia GPS para DELIVERY
        val eligibleWithDistance = availableBranches.map { branch ->
            val distKm = calculateDistanceKm(customerLat, customerLng, branch.latitude, branch.longitude)
            Pair(branch, distKm)
        }.filter { (branch, distKm) ->
            if (fulfillmentType.equals("DELIVERY", ignoreCase = true)) {
                distKm <= branch.deliveryRadiusKm
            } else {
                true // PICKUP no requiere restricción de radio
            }
        }

        if (eligibleWithDistance.isEmpty()) {
            return RoutingResult(null, availableBranches, false, "Tu ubicación se encuentra fuera del radio de entrega del comercio.")
        }

        // 5. Optimización: Ordenar por menor distancia GPS
        val sortedCandidates = eligibleWithDistance.sortedBy { it.second }
        val winner = sortedCandidates.first().first

        return RoutingResult(
            selectedBranch = winner,
            candidateBranches = sortedCandidates.map { it.first },
            isEligible = true,
            rejectionReason = null
        )
    }

    fun calculateDistanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        if (lat1 == 0.0 || lon1 == 0.0 || lat2 == 0.0 || lon2 == 0.0) return 1.0
        val r = 6371.0 // Radio de la Tierra en km
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }
}
