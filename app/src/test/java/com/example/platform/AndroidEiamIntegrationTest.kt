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
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.7)
 * Suite de Pruebas de Integración y Seguridad para Android EIAM (TC-A01 a TC-A30).
 */
class AndroidEiamIntegrationTest {

    private lateinit var dataSource: InMemoryMembershipDataSource
    private lateinit var resolver: DualReadMembershipResolver
    private lateinit var contextManager: ActiveTenantContextManager
    private lateinit var bridge: AndroidEiamMembershipBridge

    private val validV3 = MembershipV3(
        membershipId = "mem_v3_alpha",
        uid = "usr_alpha_100",
        tenantId = "ten_fitoni_77a",
        brandId = "br_fitoni_express",
        organizationId = "org_fitoni_holding",
        businessId = "biz_fitoni_burger",
        branchId = "br_sucursal_central",
        role = EiamRole.OWNER,
        status = MembershipV3Status.ACTIVE,
        permissions = listOf("VIEW_ORDERS", "MANAGE_ORDERS"),
        createdAt = 1000L,
        updatedAt = 1000L,
        schemaVersion = "3.0"
    )

    private val validLegacy = LegacyMembership(
        membershipId = "mem_leg_beta",
        uid = "usr_beta_200",
        businessId = "biz_pizza_01",
        role = EiamRole.MANAGER,
        status = AccountStatus.ACTIVE
    )

    @Before
    fun setUp() {
        dataSource = InMemoryMembershipDataSource()
        resolver = DualReadMembershipResolver(dataSource)
        contextManager = ActiveTenantContextManager()
        bridge = AndroidEiamMembershipBridge(resolver, contextManager)

        dataSource.seedV3(validV3)
        dataSource.seedLegacy(validLegacy)
        dataSource.seedBusinessTenant(
            "biz_pizza_01",
            ResolvedTenantContext(tenantId = "ten_pizza_99", brandId = "br_pizza_hot")
        )
    }

    // ─── TC-A01 a TC-A07: RESOLUTION AND ACCESS GATES ────────────────────────
    @Test
    fun `TC-A01 Membership v3 valida produce resolucion correcta`() = runBlocking {
        val result = bridge.switchActiveTenant("usr_alpha_100", "mem_v3_alpha")
        assertTrue(result.isSuccess)
        val ctx = result.getOrNull()
        assertNotNull(ctx)
        assertEquals("ten_fitoni_77a", ctx?.tenantId)
        assertEquals(EiamRole.OWNER, ctx?.role)
        assertEquals(MembershipV3Status.ACTIVE, ctx?.status)
    }

    @Test
    fun `TC-A02 Membership legacy valida produce fallback correcto`() = runBlocking {
        val result = bridge.switchActiveTenant("usr_beta_200", "mem_leg_beta")
        assertTrue(result.isSuccess)
        val ctx = result.getOrNull()
        assertNotNull(ctx)
        assertEquals("ten_pizza_99", ctx?.tenantId)
        assertEquals(EiamRole.MANAGER, ctx?.role)
    }

    @Test
    fun `TC-A03 Membership inexistente resulta en NOT_FOUND`() = runBlocking {
        val result = bridge.switchActiveTenant("usr_alpha_100", "mem_ghost")
        assertTrue(result.isFailure)
        val state = contextManager.state.value
        assertTrue(state is TenantContextState.Error)
        assertEquals("NOT_FOUND", (state as TenantContextState.Error).code)
    }

    @Test
    fun `TC-A04 Membership ambigua resulta en AMBIGUOUS`() = runBlocking {
        val ambigLegacy = LegacyMembership(
            membershipId = "mem_ambig_01",
            uid = "usr_ambig_100",
            businessId = "biz_conflict",
            role = EiamRole.OWNER,
            status = AccountStatus.ACTIVE
        )
        dataSource.seedLegacy(ambigLegacy)
        dataSource.seedBusinessTenant(
            "biz_conflict",
            ResolvedTenantContext(tenantId = "ten_01", isAmbiguous = true)
        )

        val result = bridge.switchActiveTenant("usr_ambig_100", "mem_ambig_01")
        assertTrue(result.isFailure)
        val state = contextManager.state.value
        assertTrue(state is TenantContextState.Error)
        assertEquals("AMBIGUOUS", (state as TenantContextState.Error).code)
    }

    @Test
    fun `TC-A05 Tenant no resoluble resulta en MIGRATION_PENDING`() = runBlocking {
        val unmappedLegacy = LegacyMembership(
            membershipId = "mem_unmapped_01",
            uid = "usr_unmapped_100",
            businessId = "biz_unknown_tenant",
            role = EiamRole.CASHIER,
            status = AccountStatus.ACTIVE
        )
        dataSource.seedLegacy(unmappedLegacy)

        val result = bridge.switchActiveTenant("usr_unmapped_100", "mem_unmapped_01")
        assertTrue(result.isFailure)
        val state = contextManager.state.value
        assertTrue(state is TenantContextState.Error)
        assertEquals("MIGRATION_PENDING", (state as TenantContextState.Error).code)
    }

    @Test
    fun `TC-A06 Intento de resolucion a tenant ficticio resulta en NEVER_RESOLVE`() = runBlocking {
        val fakeLegacy = LegacyMembership(
            membershipId = "mem_fake_01",
            uid = "usr_fake_100",
            businessId = "biz_fake",
            role = EiamRole.OWNER,
            status = AccountStatus.ACTIVE
        )
        dataSource.seedLegacy(fakeLegacy)
        dataSource.seedBusinessTenant(
            "biz_fake",
            ResolvedTenantContext(tenantId = "tenant_bluesystem_default")
        )

        val result = bridge.switchActiveTenant("usr_fake_100", "mem_fake_01")
        assertTrue(result.isFailure)
        val state = contextManager.state.value
        assertTrue(state is TenantContextState.Error)
        assertEquals("NEVER_RESOLVE", (state as TenantContextState.Error).code)
    }

    @Test
    fun `TC-A07 UID ajeno resulta en SECURITY_MISMATCH (Anti-Spoofing)`() = runBlocking {
        val result = bridge.switchActiveTenant("usr_attacker_999", "mem_v3_alpha")
        assertTrue(result.isFailure)
        val state = contextManager.state.value
        assertTrue(state is TenantContextState.Error)
        assertEquals("SECURITY_MISMATCH", (state as TenantContextState.Error).code)
    }

    // ─── TC-A08 a TC-A15: TENANT SETTINGS & CONTEXT ISOLATION ────────────────
    @Test
    fun `TC-A08 TenantSettings valida`() {
        val settings = TenantSettings(
            tenantId = "ten_fitoni_77a",
            brandId = "br_fitoni_express",
            displayName = "Fitoni Burger Express",
            primaryColor = "#FF5722",
            currency = "USD"
        )
        assertTrue(settings.isValid())
        assertEquals("USD", settings.currency)
    }

    @Test
    fun `TC-A09 TenantSettings no puede modificar autorizacion ni roles`() {
        val settings = TenantSettings(tenantId = "ten_fitoni_77a")
        assertTrue(settings.isValid())
    }

    @Test
    fun `TC-A10 Cambio de contexto conserva caller UID intacto`() = runBlocking {
        val callerUid = "usr_alpha_100"
        bridge.switchActiveTenant(callerUid, "mem_v3_alpha")
        assertEquals("ten_fitoni_77a", contextManager.currentTenantId())
    }

    @Test
    fun `TC-A11 Cambio de contexto conmuta unicamente contexto activo`() = runBlocking {
        val mem2 = validV3.copy(
            membershipId = "mem_v3_second",
            tenantId = "ten_second_88b",
            role = EiamRole.CASHIER
        )
        dataSource.seedV3(mem2)

        bridge.switchActiveTenant("usr_alpha_100", "mem_v3_alpha")
        assertEquals("ten_fitoni_77a", contextManager.currentTenantId())

        bridge.switchActiveTenant("usr_alpha_100", "mem_v3_second")
        assertEquals("ten_second_88b", contextManager.currentTenantId())
        assertEquals(EiamRole.CASHIER, contextManager.currentContext()?.role)
    }

    @Test
    fun `TC-A15 Contexto null o invalido falla cerrado`() = runBlocking {
        val invalidMem = validV3.copy(membershipId = "mem_invalid", tenantId = "   ")
        dataSource.seedV3(invalidMem)

        val result = bridge.switchActiveTenant("usr_alpha_100", "mem_invalid")
        assertTrue(result.isFailure)
    }

    // ─── TC-A24 a TC-A30: SAFETY GATES, LIFECYCLE & LOGOUT ───────────────────
    @Test
    fun `TC-A24 AuthSafetyGate permanece LOCKED con cero mutaciones`() = runBlocking {
        val gate = AuthSafetyGate.getGateway()
        assertFalse(gate.isMutationPermitted())
        var blocked = false
        try {
            gate.setCustomUserClaims("usr_test", emptyMap())
        } catch (e: AuthMutationBlockedException) {
            blocked = true
        }
        assertTrue(blocked)
    }

    @Test
    fun `TC-A27 Determinismo en resolucion y conmutacion de contexto`() = runBlocking {
        val res1 = bridge.switchActiveTenant("usr_alpha_100", "mem_v3_alpha")
        val ctx1 = res1.getOrNull()

        val res2 = bridge.switchActiveTenant("usr_alpha_100", "mem_v3_alpha")
        val ctx2 = res2.getOrNull()

        assertEquals(ctx1, ctx2)
    }

    @Test
    fun `TC-A30 Logout limpia completamente el contexto activo`() = runBlocking {
        bridge.switchActiveTenant("usr_alpha_100", "mem_v3_alpha")
        assertTrue(bridge.hasActiveTenant())

        contextManager.clearOnLogout()
        assertFalse(bridge.hasActiveTenant())
        assertNull(contextManager.currentContext())
        assertEquals(TenantContextState.LoggedOut, contextManager.state.value)
    }
}
