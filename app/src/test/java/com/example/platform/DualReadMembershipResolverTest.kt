package com.example.platform

import com.example.domain.model.identity.*
import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.EiamRole
import com.example.eiam.domain.model.Membership as LegacyMembership
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.3)
 * Pruebas Unitarias JUnit para DualReadMembershipResolver en Android.
 */
class DualReadMembershipResolverTest {

    private lateinit var dataSource: InMemoryMembershipDataSource
    private lateinit var resolver: DualReadMembershipResolver

    @Before
    fun setup() {
        dataSource = InMemoryMembershipDataSource()
        resolver = DualReadMembershipResolver(dataSource)
    }

    @Test
    fun `test resolve V3 only returns RESOLVED_V3`() = runBlocking {
        val v3 = MembershipV3(
            membershipId = "mem_v3_001",
            uid = "usr_001",
            tenantId = "tenant_alpha_001",
            brandId = "brand_alpha_express",
            role = EiamRole.OWNER,
            status = MembershipV3Status.ACTIVE,
            schemaVersion = "3.0"
        )
        dataSource.seedV3(v3)

        val result = resolver.resolveByMembershipId("usr_001", "mem_v3_001")
        assertEquals(DualReadStatus.RESOLVED_V3, result.status)
        assertEquals("V3", result.source)
        assertEquals("tenant_alpha_001", result.membership?.tenantId)
        assertEquals(0, result.writeCount)
    }

    @Test
    fun `test resolve Legacy only returns RESOLVED_LEGACY`() = runBlocking {
        val legacy = LegacyMembership(
            membershipId = "mem_leg_001",
            uid = "usr_002",
            businessId = "biz_pizza_01",
            role = EiamRole.MANAGER,
            status = AccountStatus.ACTIVE
        )
        dataSource.seedLegacy(legacy)
        dataSource.seedBusinessTenant("biz_pizza_01", ResolvedTenantContext(
            tenantId = "tenant_beta_002",
            brandId = "brand_beta_crust"
        ))

        val result = resolver.resolveByMembershipId("usr_002", "mem_leg_001")
        assertEquals(DualReadStatus.RESOLVED_LEGACY, result.status)
        assertEquals("LEGACY", result.source)
        assertEquals("tenant_beta_002", result.membership?.tenantId)
        assertEquals(0, result.writeCount)
    }

    @Test
    fun `test resolve non existent returns NOT_FOUND`() = runBlocking {
        val result = resolver.resolveByMembershipId("usr_ghost", "mem_missing")
        assertEquals(DualReadStatus.NOT_FOUND, result.status)
        assertNull(result.membership)
        assertEquals(0, result.writeCount)
    }

    @Test
    fun `test resolve invalid V3 returns INVALID`() = runBlocking {
        val invalidV3 = MembershipV3(
            membershipId = "mem_invalid",
            uid = "usr_003",
            tenantId = "", // Inválido
            role = EiamRole.CASHIER,
            schemaVersion = "3.0"
        )
        dataSource.seedV3(invalidV3)

        val result = resolver.resolveByMembershipId("usr_003", "mem_invalid")
        assertEquals(DualReadStatus.INVALID, result.status)
        assertNull(result.membership)
    }

    @Test
    fun `test resolve unmapped Legacy returns MIGRATION_PENDING`() = runBlocking {
        val unmapped = LegacyMembership(
            membershipId = "mem_unmapped",
            uid = "usr_004",
            businessId = "biz_unknown_orphan",
            role = EiamRole.COOK,
            status = AccountStatus.ACTIVE
        )
        dataSource.seedLegacy(unmapped)

        val result = resolver.resolveByMembershipId("usr_004", "mem_unmapped")
        assertEquals(DualReadStatus.MIGRATION_PENDING, result.status)
        assertNull(result.membership)
    }

    @Test
    fun `test resolve fake default tenant returns NEVER_RESOLVE`() = runBlocking {
        val fakeDefault = LegacyMembership(
            membershipId = "mem_fake_default",
            uid = "usr_005",
            businessId = "biz_fake",
            role = EiamRole.DRIVER,
            status = AccountStatus.ACTIVE
        )
        dataSource.seedLegacy(fakeDefault)
        dataSource.seedBusinessTenant("biz_fake", ResolvedTenantContext(
            tenantId = "tenant_bluesystem_default"
        ))

        val result = resolver.resolveByMembershipId("usr_005", "mem_fake_default")
        assertEquals(DualReadStatus.NEVER_RESOLVE, result.status)
        assertNull(result.membership)
    }

    @Test
    fun `test resolve security mismatch returns SECURITY_MISMATCH`() = runBlocking {
        val v3 = MembershipV3(
            membershipId = "mem_v3_secure",
            uid = "usr_real_owner",
            tenantId = "tenant_alpha_001",
            role = EiamRole.OWNER,
            status = MembershipV3Status.ACTIVE
        )
        dataSource.seedV3(v3)

        val result = resolver.resolveByMembershipId("usr_attacker", "mem_v3_secure")
        assertEquals(DualReadStatus.SECURITY_MISMATCH, result.status)
        assertNull(result.membership)
    }

    @Test
    fun `test resolve conflicting V3 and Legacy returns AMBIGUOUS`() = runBlocking {
        val v3 = MembershipV3(
            membershipId = "mem_conflict",
            uid = "usr_006",
            tenantId = "tenant_alpha_001",
            role = EiamRole.OWNER,
            status = MembershipV3Status.ACTIVE
        )
        val legacy = LegacyMembership(
            membershipId = "mem_conflict",
            uid = "usr_006",
            businessId = "biz_001",
            role = EiamRole.COOK, // Conflicto: V3 es OWNER, Legacy es COOK
            status = AccountStatus.ACTIVE
        )
        dataSource.seedV3(v3)
        dataSource.seedLegacy(legacy)

        val result = resolver.resolveByMembershipId("usr_006", "mem_conflict")
        assertEquals(DualReadStatus.AMBIGUOUS, result.status)
        assertNotNull(result.conflict)
    }

    @Test
    fun `test write count is zero across all operations`() = runBlocking {
        assertEquals(0, dataSource.writeCount)
    }
}
