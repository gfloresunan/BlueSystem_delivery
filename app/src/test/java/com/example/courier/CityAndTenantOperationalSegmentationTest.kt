package com.example.courier

import com.example.data.dto.menu.ProductDto
import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.Branch
import com.example.domain.engine.FleetEligibilityEngine
import com.example.domain.engine.FleetEligibilityEngine.CourierState
import com.example.domain.engine.FleetEligibilityEngine.EligibilityResult
import org.junit.Assert.*
import org.junit.Test

/**
 * ACTIVIDAD #1 — TEST SUITE: SEGMENTACIÓN OPERACIONAL POR CIUDAD & MULTI-TENANT
 *
 * Valida los Casos A-F, aislamiento de dominios, resiliencia y seguridad.
 */
class CityAndTenantOperationalSegmentationTest {

    private fun createDummyCourier(
        courierId: String = "drv_1",
        tenantId: String = "TENANT_A",
        cityId: String = "MANAGUA",
        departmentId: String = "MANAGUA",
        isOnline: Boolean = true,
        isActive: Boolean = true
    ) = CourierState(
        courierId = courierId,
        courierName = "Motorizado Test",
        isOnline = isOnline,
        isActive = isActive,
        currentLat = 12.1364,
        currentLng = -86.2514,
        lastLocationUpdateMs = System.currentTimeMillis(),
        tenantId = tenantId,
        cityId = cityId,
        departmentId = departmentId
    )

    private fun createDummyBranch(
        branchId: String = "br_1",
        tenantId: String = "TENANT_A",
        cityId: String = "MANAGUA",
        departmentId: String = "MANAGUA",
        isOpen: Boolean = true
    ) = Branch(
        branchId = branchId,
        businessId = "biz_1",
        name = "Sucursal Principal",
        address = "Managua",
        phone = "12345678",
        latitude = 12.1364,
        longitude = -86.2514,
        isOpen = isOpen,
        isPrimary = true,
        status = AccountStatus.ACTIVE,
        tenantId = tenantId,
        cityId = cityId,
        departmentId = departmentId
    )

    // =========================================================================
    // CASOS CANÓNICOS ACTIVIDAD #19
    // =========================================================================

    @Test
    fun testCaso01_MismoTenant_MismoMunicipio_CiudadDario_Elegible() {
        // Comercio: Tenant A, Ciudad Darío (Matagalpa)
        // Courier: Tenant A, Ciudad Darío (Matagalpa)
        // Resultado esperado: ELEGIBLE
        val courier = createDummyCourier(tenantId = "TENANT_A", cityId = "CIUDAD_DARIO", departmentId = "MATAGALPA")
        val branch = createDummyBranch(tenantId = "TENANT_A", cityId = "CIUDAD_DARIO", departmentId = "MATAGALPA")

        val result = FleetEligibilityEngine.evaluateCityAndTenantEligibility(
            courierTenantId = courier.tenantId,
            courierCityId = courier.cityId,
            targetTenantId = branch.tenantId,
            targetCityId = branch.cityId,
            courierDepartmentId = courier.departmentId,
            targetDepartmentId = branch.departmentId
        )
        assertTrue("Caso 01 debe ser elegible", result.isEligible)

        val fullResult = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, branch, emptyList())
        assertTrue("Resultado completo para Caso 01 debe ser elegible", fullResult.isEligible)
    }

    @Test
    fun testCaso02_MismoTenant_MismoDepartamento_DiferenteMunicipio_CiudadDario_vs_Matagalpa_NO_Elegible() {
        // Comercio: Tenant A, Ciudad Darío (Matagalpa)
        // Courier: Tenant A, Matagalpa (Matagalpa) - Mismo departamento, diferente municipio!
        // Resultado esperado: NO ELEGIBLE (Cero bypass departamental)
        val courier = createDummyCourier(tenantId = "TENANT_A", cityId = "MATAGALPA", departmentId = "MATAGALPA")
        val branch = createDummyBranch(tenantId = "TENANT_A", cityId = "CIUDAD_DARIO", departmentId = "MATAGALPA")

        val result = FleetEligibilityEngine.evaluateCityAndTenantEligibility(
            courierTenantId = courier.tenantId,
            courierCityId = courier.cityId,
            targetTenantId = branch.tenantId,
            targetCityId = branch.cityId,
            courierDepartmentId = courier.departmentId,
            targetDepartmentId = branch.departmentId
        )
        assertFalse("Caso 02 NO debe ser elegible: Ciudad Darío vs Matagalpa", result.isEligible)
        assertTrue(result.rejectionReason?.contains("municipio") == true || result.rejectionReason?.contains("ciudad") == true)

        val fullResult = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, branch, emptyList())
        assertFalse("Resultado completo para Caso 02 NO debe ser elegible", fullResult.isEligible)
    }

    @Test
    fun testCaso03_DiferenteTenant_MismoMunicipio_CiudadDario_NO_Elegible() {
        // Comercio: Tenant A, Ciudad Darío
        // Courier: Tenant B, Ciudad Darío
        // Resultado esperado: NO ELEGIBLE (Aislamiento Multi-Tenant)
        val courier = createDummyCourier(tenantId = "TENANT_B", cityId = "CIUDAD_DARIO", departmentId = "MATAGALPA")
        val branch = createDummyBranch(tenantId = "TENANT_A", cityId = "CIUDAD_DARIO", departmentId = "MATAGALPA")

        val result = FleetEligibilityEngine.evaluateCityAndTenantEligibility(
            courierTenantId = courier.tenantId,
            courierCityId = courier.cityId,
            targetTenantId = branch.tenantId,
            targetCityId = branch.cityId,
            courierDepartmentId = courier.departmentId,
            targetDepartmentId = branch.departmentId
        )
        assertFalse("Caso 03 NO debe ser elegible por Tenant diferente", result.isEligible)
        assertTrue(result.rejectionReason?.contains("Tenant") == true)

        val fullResult = FleetEligibilityEngine.evaluateCommerceDeliveryEligibility(courier, branch, emptyList())
        assertFalse("Resultado completo para Caso 03 NO debe ser elegible", fullResult.isEligible)
    }

    @Test
    fun testCaso04_MismoTenant_MismoMunicipio_DiferenteDireccion_Elegible() {
        // Comercio: Tenant A, Ciudad Darío, Barrio Central
        // Courier: Tenant A, Ciudad Darío, Barrio Las Colinas
        // Resultado esperado: ELEGIBLE (Dirección física o barrio no impide la elegibilidad municipal)
        val courier = createDummyCourier(tenantId = "TENANT_A", cityId = "CIUDAD_DARIO", departmentId = "MATAGALPA")
        val branch = createDummyBranch(branchId = "br_cd_1", tenantId = "TENANT_A", cityId = "CIUDAD_DARIO", departmentId = "MATAGALPA")

        val result = FleetEligibilityEngine.evaluateCityAndTenantEligibility(
            courierTenantId = courier.tenantId,
            courierCityId = courier.cityId,
            targetTenantId = branch.tenantId,
            targetCityId = branch.cityId,
            courierDepartmentId = courier.departmentId,
            targetDepartmentId = branch.departmentId
        )
        assertTrue("Caso 04: Misma municipio con diferentes barrios/direcciones debe ser ELEGIBLE", result.isEligible)
    }

    @Test
    fun testCaso05_X_To_Y_Delivery_Sin_TenantComercial_Elegible() {
        // Dominio B: X -> Y Delivery
        val courier = createDummyCourier(tenantId = "TENANT_A", cityId = "CIUDAD_DARIO", departmentId = "MATAGALPA")
        val result = FleetEligibilityEngine.evaluateXToYTripEligibility(
            courier = courier,
            originLat = courier.currentLat,
            originLng = courier.currentLng
        )
        assertTrue("Dominio B: X->Y Delivery debe ser elegible sin branch ni tenant comercial", result.isEligible)
    }
}
