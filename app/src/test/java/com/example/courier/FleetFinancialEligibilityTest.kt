package com.example.courier

import com.example.data.dto.menu.ProductDto
import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.Branch
import com.example.domain.engine.FleetEligibilityEngine
import com.example.domain.engine.FleetEligibilityEngine.CourierState
import org.junit.Assert.*
import org.junit.Test

/**
 * TEST SUITE: RESTRICCIONES FINANCIERAS Y ELEGIBILIDAD DE FLOTA EN ANDROID
 * BSD-COURIER-FINANCIAL-ELIGIBILITY-LOCK-FORENSIC-001
 */
class FleetFinancialEligibilityTest {

    private fun createCourier(
        courierId: String = "courier_henry",
        cashOutstandingCents: Long = 0L,
        effectiveCashLimitCents: Long = 200000L,
        canReceiveNewOrders: Boolean = true,
        financialAccessState: String = "ALLOW",
        hasOverdueClosure: Boolean = false
    ) = CourierState(
        courierId = courierId,
        courierName = "Henry Paz",
        isOnline = true,
        isActive = true,
        currentLat = 12.1364,
        currentLng = -86.2514,
        lastLocationUpdateMs = System.currentTimeMillis(),
        tenantId = "TENANT_MGA",
        cityId = "MANAGUA",
        departmentId = "MANAGUA",
        canReceiveNewOrders = canReceiveNewOrders,
        financialAccessState = financialAccessState,
        cashOutstandingCents = cashOutstandingCents,
        effectiveCashLimitCents = effectiveCashLimitCents,
        hasOverdueClosure = hasOverdueClosure
    )

    private fun createBranch() = Branch(
        branchId = "br_1",
        businessId = "biz_1",
        name = "Sucursal Central",
        address = "Managua",
        phone = "88888888",
        latitude = 12.1364,
        longitude = -86.2514,
        isOpen = true,
        isPrimary = true,
        status = AccountStatus.ACTIVE,
        tenantId = "TENANT_MGA",
        cityId = "MANAGUA",
        departmentId = "MANAGUA"
    )

    @Test
    fun test01_courierBelowLimit_isEligible() {
        val courier = createCourier(cashOutstandingCents = 150000L) // C$ 1,500 < C$ 2,000
        val res = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, createBranch(), emptyList())
        assertTrue("Courier con C$1,500 debe ser elegible", res.isEligible)
        assertNull(res.rejectionReason)
    }

    @Test
    fun test02_courierExactLimit_isRejected() {
        val courier = createCourier(cashOutstandingCents = 200000L) // C$ 2,000 == C$ 2,000 (Exact threshold)
        val res = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, createBranch(), emptyList())
        assertFalse("Courier con C$2,000 exacto debe ser rechazado inmediatamente", res.isEligible)
        assertNotNull(res.rejectionReason)
        assertTrue(res.rejectionReason!!.contains("Límite") || res.rejectionReason!!.contains("alcanzado"))
    }

    @Test
    fun test03_courierExceededLimit_isRejected() {
        val courier = createCourier(cashOutstandingCents = 250000L) // C$ 2,500 > C$ 2,000
        val res = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, createBranch(), emptyList())
        assertFalse("Courier con C$2,500 debe ser rechazado", res.isEligible)
    }

    @Test
    fun test04_courierOverdueClosure_isRejected() {
        val courier = createCourier(
            cashOutstandingCents = 50000L,
            hasOverdueClosure = true,
            financialAccessState = "BLOCKED_OVERDUE_CLOSURE"
        )
        val res = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, createBranch(), emptyList())
        assertFalse("Courier con cierre pendiente anterior debe ser rechazado", res.isEligible)
        assertTrue(res.rejectionReason!!.contains("Cierre") || res.rejectionReason!!.contains("pendiente"))
    }

    @Test
    fun test05_casoHenryPaz_cash3185AndOverdue_isRejected() {
        val courier = createCourier(
            courierId = "henry_paz",
            cashOutstandingCents = 318500L, // C$ 3,185.00
            effectiveCashLimitCents = 200000L, // C$ 2,000.00
            hasOverdueClosure = true,
            financialAccessState = "BLOCKED_CASH_LIMIT_AND_OVERDUE",
            canReceiveNewOrders = false
        )
        // 1. Envíos de Comercio
        val resCommerce = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, createBranch(), emptyList())
        assertFalse("Henry Paz con C$3,185 y cierre pendiente debe ser RECHAZADO para comercio", resCommerce.isEligible)

        // 2. Envíos X a Y
        val resXToY = FleetEligibilityEngine.evaluateXToYTripEligibility(courier, 12.1364, -86.2514)
        assertFalse("Henry Paz con C$3,185 y cierre pendiente debe ser RECHAZADO para encomiendas X->Y", resXToY.isEligible)
    }

    @Test
    fun test06_customOverrideLimit_allowsHigherLimit() {
        val courier = createCourier(
            cashOutstandingCents = 250000L, // C$ 2,500.00
            effectiveCashLimitCents = 300000L // Custom limit C$ 3,000.00
        )
        val res = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, createBranch(), emptyList())
        assertTrue("Courier con límite personalizado de C$3,000 y custodia de C$2,500 debe ser ELEGIBLE", res.isEligible)
    }

    @Test
    fun test07_customOverrideLimit_exceededRejects() {
        val courier = createCourier(
            cashOutstandingCents = 300000L, // C$ 3,000.00
            effectiveCashLimitCents = 300000L // Custom limit C$ 3,000.00 (Exact threshold)
        )
        val res = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, createBranch(), emptyList())
        assertFalse("Courier con límite de C$3,000 y custodia de C$3,000 debe ser RECHAZADO", res.isEligible)
    }
}
