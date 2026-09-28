package com.example.platform

import com.example.domain.model.identity.*
import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.EiamRole
import com.example.eiam.domain.model.Membership as LegacyMembership
import org.junit.Assert.*
import org.junit.Test

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.2)
 * Pruebas Unitarias JUnit para Membresía V3, Claims V3, Contexto Activo y Legacy Adapter.
 */
class MembershipV3DomainTest {

    @Test
    fun `test valid MembershipV3 passes validation`() {
        val membership = MembershipV3(
            membershipId = "mem_test_001",
            uid = "usr_001",
            tenantId = "tenant_alpha_001",
            brandId = "brand_alpha_express",
            organizationId = "org_alpha_group",
            businessId = "biz_alpha_burger",
            branchId = "branch_central",
            role = EiamRole.OWNER,
            status = MembershipV3Status.ACTIVE,
            permissions = listOf("VIEW_ORDERS", "MANAGE_ORDERS", "VIEW_FINANCE"),
            schemaVersion = "3.0"
        )

        val result = MembershipV3Validators.validateMembershipV3(membership)
        assertTrue("Membership válida debe pasar validación", result.isValid)
        assertEquals(0, result.errors.size)
    }

    @Test
    fun `test missing tenantId fails validation`() {
        val membership = MembershipV3(
            membershipId = "mem_test_002",
            uid = "usr_002",
            tenantId = "   ",
            role = EiamRole.CASHIER,
            status = MembershipV3Status.ACTIVE
        )

        val result = MembershipV3Validators.validateMembershipV3(membership)
        assertFalse("Membresía sin tenantId debe fallar", result.isValid)
        assertTrue(result.errors.any { it.contains("tenantId") })
    }

    @Test
    fun `test missing uid fails validation`() {
        val membership = MembershipV3(
            membershipId = "mem_test_003",
            uid = "",
            tenantId = "tenant_alpha_001",
            role = EiamRole.COOK,
            status = MembershipV3Status.ACTIVE
        )

        val result = MembershipV3Validators.validateMembershipV3(membership)
        assertFalse("Membresía sin uid debe fallar", result.isValid)
        assertTrue(result.errors.any { it.contains("uid") })
    }

    @Test
    fun `test invalid schemaVersion fails validation`() {
        val membership = MembershipV3(
            membershipId = "mem_test_004",
            uid = "usr_004",
            tenantId = "tenant_alpha_001",
            role = EiamRole.DRIVER,
            status = MembershipV3Status.ACTIVE,
            schemaVersion = "2.1"
        )

        val result = MembershipV3Validators.validateMembershipV3(membership)
        assertFalse("Membresía con schemaVersion distinta de 3.0 debe fallar", result.isValid)
        assertTrue(result.errors.any { it.contains("schemaVersion") })
    }

    @Test
    fun `test null branchId and brandId are allowed as tenant-wide scopes`() {
        val membership = MembershipV3(
            membershipId = "mem_test_005",
            uid = "usr_005",
            tenantId = "tenant_alpha_001",
            brandId = null,
            branchId = null,
            role = EiamRole.OWNER,
            status = MembershipV3Status.ACTIVE
        )

        val result = MembershipV3Validators.validateMembershipV3(membership)
        assertTrue("branchId y brandId null deben ser permitidos", result.isValid)
    }

    @Test
    fun `test valid CanonicalCustomClaimsV3 passes validation`() {
        val claims = CanonicalCustomClaimsV3(
            role = "OWNER",
            tenantId = "tenant_alpha_001",
            brandId = "brand_alpha_express",
            businessId = "biz_alpha_burger",
            branchId = "branch_central",
            status = "ACTIVE",
            eiamVer = 3
        )

        val result = MembershipV3Validators.validateCustomClaimsV3(claims)
        assertTrue("Claims V3 válidos deben pasar", result.isValid)
    }

    @Test
    fun `test valid ActiveTenantContext passes validation`() {
        val context = ActiveTenantContext(
            tenantId = "tenant_alpha_001",
            brandId = "brand_alpha_express",
            organizationId = "org_alpha_group",
            businessId = "biz_alpha_burger",
            branchId = "branch_central",
            role = EiamRole.OWNER,
            membershipId = "mem_test_001",
            status = MembershipV3Status.ACTIVE
        )

        val result = MembershipV3Validators.validateActiveTenantContext(context)
        assertTrue("ActiveTenantContext válido debe pasar", result.isValid)
    }

    @Test
    fun `test LegacyMembershipAdapter transforms valid legacy membership`() {
        val legacy = LegacyMembership(
            membershipId = "mem_legacy_001",
            uid = "usr_leg_123",
            businessId = "biz_leg_456",
            branchId = "branch_leg_01",
            role = EiamRole.OWNER,
            status = AccountStatus.ACTIVE,
            permissions = listOf("VIEW_ORDERS", "MANAGE_ORDERS")
        )

        val resolved = LegacyMembershipAdapter.transformLegacyToV3(
            legacy = legacy,
            resolvedContext = ResolvedTenantContext(
                tenantId = "tenant_resolved_777",
                brandId = "brand_resolved_888"
            )
        )

        assertEquals(ResolutionStatus.RESOLVED, resolved.status)
        assertNotNull(resolved.entity)
        assertEquals("tenant_resolved_777", resolved.entity?.tenantId)
        assertEquals("brand_resolved_888", resolved.entity?.brandId)
        assertEquals(EiamRole.OWNER, resolved.entity?.role)
        assertEquals(MembershipV3Status.ACTIVE, resolved.entity?.status)
    }

    @Test
    fun `test LegacyMembershipAdapter fails closed when tenant is unresolvable`() {
        val legacy = LegacyMembership(
            membershipId = "mem_legacy_002",
            uid = "usr_leg_999",
            businessId = "biz_unresolved_001",
            role = EiamRole.CASHIER,
            status = AccountStatus.ACTIVE
        )

        val resolved = LegacyMembershipAdapter.transformLegacyToV3(
            legacy = legacy,
            resolvedContext = null
        )

        assertEquals(ResolutionStatus.MIGRATION_PENDING, resolved.status)
        assertNull(resolved.entity)
    }

    @Test
    fun `test LegacyMembershipAdapter blocks tenant_bluesystem_default`() {
        val legacy = LegacyMembership(
            membershipId = "mem_legacy_003",
            uid = "usr_leg_888",
            businessId = "biz_001",
            role = EiamRole.DRIVER,
            status = AccountStatus.ACTIVE
        )

        val resolved = LegacyMembershipAdapter.transformLegacyToV3(
            legacy = legacy,
            resolvedContext = ResolvedTenantContext(tenantId = "tenant_bluesystem_default")
        )

        assertEquals(ResolutionStatus.MIGRATION_PENDING, resolved.status)
        assertNull(resolved.entity)
        assertTrue(resolved.errorDetail?.contains("ficticio") == true)
    }

    @Test
    fun `test LegacyMembershipAdapter marks ambiguous relationship as AMBIGUOUS`() {
        val legacy = LegacyMembership(
            membershipId = "mem_legacy_004",
            uid = "usr_leg_777",
            businessId = "biz_conflict_001",
            role = EiamRole.MANAGER,
            status = AccountStatus.ACTIVE
        )

        val resolved = LegacyMembershipAdapter.transformLegacyToV3(
            legacy = legacy,
            resolvedContext = ResolvedTenantContext(
                tenantId = "tenant_001",
                isAmbiguous = true
            )
        )

        assertEquals(ResolutionStatus.AMBIGUOUS, resolved.status)
        assertNull(resolved.entity)
    }
}
