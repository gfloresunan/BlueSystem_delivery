package com.example.domain.engine

import com.example.data.dto.menu.ProductDto
import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.Branch

/**
 * Motor de Elegibilidad y Asignación de Flota (Fase 10.2)
 *
 * Principio Arquitectónico:
 * Infraestructura de Flota Compartida entre dos Dominios de Negocio Aislados:
 * - DOMINIO A: COMMERCE_DELIVERY (/orders) -> Requiere businessId + branchId + disponibilidad de productos
 * - DOMINIO B: X_TO_Y_DELIVERY (/deliveryTrips) -> Requiere origin + destination (branchId PROHIBIDO/NO REQUERIDO)
 */
object FleetEligibilityEngine {

    enum class ServiceType {
        COMMERCE_DELIVERY,
        X_TO_Y_DELIVERY
    }

    data class CourierState(
        val courierId: String = "",
        val courierName: String = "",
        val isOnline: Boolean = true,
        val isActive: Boolean = true,
        val currentLat: Double = 0.0,
        val currentLng: Double = 0.0,
        val lastLocationUpdateMs: Long = System.currentTimeMillis(),
        val activeAssignmentId: String? = null,
        val tenantId: String = "",
        val departmentId: String = "",
        val departmentName: String = "",
        val municipalityId: String = "",
        val municipalityName: String = "",
        val cityId: String = "",
        val city: String = "",
        val isApproved: Boolean = true,
        val canReceiveNewOrders: Boolean = true,
        val financialAccessState: String = "ALLOW",
        val cashOutstandingCents: Long = 0L,
        val effectiveCashLimitCents: Long = 200000L,
        val hasOverdueClosure: Boolean = false,
        val financialAccessReason: String? = null
    )

    data class EligibilityResult(
        val isEligible: Boolean,
        val rejectionReason: String? = null,
        val distanceToOriginKm: Double = 0.0
    )

    /**
     * Valida de forma estricta la concordancia de Tenant y Municipio operacional (Actividad #19).
     */
    fun evaluateCityAndTenantEligibility(
        courierTenantId: String,
        courierCityId: String,
        targetTenantId: String,
        targetCityId: String,
        courierDepartmentId: String = "",
        targetDepartmentId: String = ""
    ): EligibilityResult {
        // 1. Tenant Isolation
        val cleanCourierTenant = courierTenantId.trim()
        val cleanTargetTenant = targetTenantId.trim()
        if (cleanCourierTenant.isNotBlank() && cleanTargetTenant.isNotBlank() && cleanCourierTenant != cleanTargetTenant) {
            return EligibilityResult(false, "Incompatibilidad Multi-Tenant ($cleanCourierTenant vs $cleanTargetTenant).")
        }

        // 2. Municipality / City Isolation (Sin bypass departamental)
        val cleanCourierMuni = courierCityId.trim().uppercase()
        val cleanTargetMuni = targetCityId.trim().uppercase()

        if (cleanCourierMuni.isNotBlank() && cleanTargetMuni.isNotBlank() && cleanCourierMuni != cleanTargetMuni) {
            return EligibilityResult(false, "Incompatibilidad de municipio operacional ($cleanCourierMuni vs $cleanTargetMuni).")
        }

        return EligibilityResult(true, null, 0.0)
    }

    /**
     * Evalúa la elegibilidad de un motorizado para un pedido de comercio (COMMERCE_DELIVERY)
     */
    fun evaluateCommerceDeliveryEligibility(
        courier: CourierState,
        branch: Branch,
        cartProducts: List<ProductDto>,
        maxStaleLocationMs: Long = 10 * 60 * 1000L // 10 minutos
    ): EligibilityResult {
        // 0. Validación de Restricciones Financieras (Límite de Efectivo y Cierre Diario)
        if (!courier.canReceiveNewOrders ||
            courier.financialAccessState.startsWith("BLOCKED") ||
            courier.hasOverdueClosure ||
            (courier.effectiveCashLimitCents > 0 && courier.cashOutstandingCents >= courier.effectiveCashLimitCents)
        ) {
            val reason = courier.financialAccessReason ?: when {
                courier.hasOverdueClosure && courier.cashOutstandingCents >= courier.effectiveCashLimitCents ->
                    "Límite de efectivo alcanzado y cierre pendiente de fecha anterior."
                courier.cashOutstandingCents >= courier.effectiveCashLimitCents ->
                    "Límite máximo de efectivo en custodia alcanzado (${courier.cashOutstandingCents / 100.0} >= ${courier.effectiveCashLimitCents / 100.0})."
                courier.hasOverdueClosure ->
                    "Cierre y depósito de efectivo pendiente de fecha anterior."
                else -> "Recepción de nuevos pedidos restringida por políticas financieras."
            }
            return EligibilityResult(false, reason)
        }

        // 1. Estado básico del motorizado
        if (!courier.isOnline || !courier.isActive) {
            return EligibilityResult(false, "Motorizado fuera de línea o inactivo.")
        }

        // 2. Conflicto de asignaciones activas
        if (!courier.activeAssignmentId.isNull_orEmpty()) {
            return EligibilityResult(false, "Motorizado tiene un servicio activo asignado actualmente.")
        }

        // 3. Frescura de ubicación GPS
        val locationAgeMs = System.currentTimeMillis() - courier.lastLocationUpdateMs
        if (locationAgeMs > maxStaleLocationMs) {
            return EligibilityResult(false, "Ubicación GPS del motorizado no actualizada en los últimos 10 minutos.")
        }

        // 4. Validación de Aislamiento Multi-Tenant
        val courierTenant = courier.tenantId.trim()
        val branchTenant = branch.tenantId.trim()
        if (courierTenant.isNotBlank() && branchTenant.isNotBlank() && courierTenant != branchTenant) {
            return EligibilityResult(false, "Motorizado pertenece a un Tenant diferente ($courierTenant vs $branchTenant).")
        }

        // 5. Validación de Segmentación Operacional por Municipio (Municipality Isolation)
        val courierMuni = courier.municipalityId.ifBlank { courier.cityId.ifBlank { courier.city } }.trim().uppercase()
        val branchMuni = branch.municipalityId.ifBlank { branch.cityId.ifBlank { branch.city } }.trim().uppercase()
        if (courierMuni.isNotBlank() && branchMuni.isNotBlank() && courierMuni != branchMuni) {
            return EligibilityResult(false, "Motorizado no pertenece al mismo municipio operacional ($courierMuni vs $branchMuni).")
        }

        // 6. Estado de la sucursal de origen
        if (!branch.status.isOperational || (!branch.isOpen && !branch.isPrimary)) {
            return EligibilityResult(false, "Sucursal de origen no se encuentra operativa.")
        }

        // 7. Disponibilidad de productos en la sucursal
        val isAllAvailable = cartProducts.all { it.isAvailableInBranch(branch.branchId) }
        if (!isAllAvailable) {
            return EligibilityResult(false, "Productos no disponibles en la sucursal solicitada.")
        }

        // 8. Cálculo de distancia GPS del motorizado a la sucursal
        val distKm = SmartBranchRouter.calculateDistanceKm(
            courier.currentLat,
            courier.currentLng,
            branch.latitude,
            branch.longitude
        )

        return EligibilityResult(true, null, distKm)
    }

    /**
     * Evalúa la elegibilidad de un motorizado para un viaje X -> Y (X_TO_Y_DELIVERY)
     * Regla estricta: NO requiere branchId ni businessId.
     */
    fun evaluateXToYTripEligibility(
        courier: CourierState,
        originLat: Double,
        originLng: Double,
        maxRadiusKm: Double = 15.0,
        maxStaleLocationMs: Long = 10 * 60 * 1000L
    ): EligibilityResult {
        // 0. Validación de Restricciones Financieras (Límite de Efectivo y Cierre Diario)
        if (!courier.canReceiveNewOrders ||
            courier.financialAccessState.startsWith("BLOCKED") ||
            courier.hasOverdueClosure ||
            (courier.effectiveCashLimitCents > 0 && courier.cashOutstandingCents >= courier.effectiveCashLimitCents)
        ) {
            val reason = courier.financialAccessReason ?: when {
                courier.hasOverdueClosure && courier.cashOutstandingCents >= courier.effectiveCashLimitCents ->
                    "Límite de efectivo alcanzado y cierre pendiente de fecha anterior."
                courier.cashOutstandingCents >= courier.effectiveCashLimitCents ->
                    "Límite máximo de efectivo en custodia alcanzado (${courier.cashOutstandingCents / 100.0} >= ${courier.effectiveCashLimitCents / 100.0})."
                courier.hasOverdueClosure ->
                    "Cierre y depósito de efectivo pendiente de fecha anterior."
                else -> "Recepción de nuevos pedidos restringida por políticas financieras."
            }
            return EligibilityResult(false, reason)
        }

        if (!courier.isOnline || !courier.isActive) {
            return EligibilityResult(false, "Motorizado fuera de línea o inactivo.")
        }

        if (!courier.activeAssignmentId.isNull_orEmpty()) {
            return EligibilityResult(false, "Motorizado tiene un servicio activo asignado actualmente.")
        }

        val locationAgeMs = System.currentTimeMillis() - courier.lastLocationUpdateMs
        if (locationAgeMs > maxStaleLocationMs) {
            return EligibilityResult(false, "Ubicación GPS no actualizada.")
        }

        val distKm = SmartBranchRouter.calculateDistanceKm(
            courier.currentLat,
            courier.currentLng,
            originLat,
            originLng
        )

        if (distKm > maxRadiusKm) {
            return EligibilityResult(false, "Motorizado fuera del radio de servicio ($distKm km > $maxRadiusKm km).")
        }

        return EligibilityResult(true, null, distKm)
    }

    private fun String?.isNull_orEmpty(): Boolean = this == null || this.trim().isEmpty()
}
