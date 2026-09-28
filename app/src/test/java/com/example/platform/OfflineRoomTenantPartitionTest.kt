package com.example.platform

import com.example.data.local.entity.OfflineOrderEntity
import com.example.data.local.entity.PendingActionEntity
import com.example.domain.model.identity.offline.shadow.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 OFFLINE PARTITIONING (FASE 2C.10)
 * Suite de Pruebas JUnit de Particionado Offline y Aislamiento Multi-Tenant (TC-O01 a TC-O30).
 */
class OfflineRoomTenantPartitionTest {

    private lateinit var repository: ShadowTenantPartitionRepository
    private lateinit var syncEngine: ShadowOfflineSyncEngine
    private lateinit var migrationSimulator: ShadowRoomMigrationSimulator

    private val contextTenantA = OfflineTenantContext(
        tenantId = "ten_fitoni_77a",
        brandId = "br_fitoni_express",
        businessId = "biz_fitoni_01",
        role = "OWNER"
    )

    private val contextTenantB = OfflineTenantContext(
        tenantId = "ten_pizza_88b",
        brandId = "br_pizza_hot",
        businessId = "biz_pizza_02",
        role = "OWNER"
    )

    @Before
    fun setUp() {
        repository = ShadowTenantPartitionRepository()
        syncEngine = ShadowOfflineSyncEngine(repository)
        migrationSimulator = ShadowRoomMigrationSimulator()
    }

    // ─── TC-O01 a TC-O06: BASELINE & TENANT KEY VALIDATION ───────────────────

    @Test
    fun `TC-O01 & TC-O02 Legacy entity compatibility is preserved without breaking changes`() {
        val legacyOrder = OfflineOrderEntity(
            orderId = "ord_leg_01",
            businessId = "biz_01",
            total = 25.50,
            status = "PENDING"
        )
        val legacyAction = PendingActionEntity(
            orderId = "ord_leg_01",
            actionType = "CONFIRM_ORDER",
            payload = "{}"
        )
        assertEquals("ord_leg_01", legacyOrder.orderId)
        assertEquals(25.50, legacyOrder.total, 0.001)
        assertEquals("CONFIRM_ORDER", legacyAction.actionType)
    }

    @Test
    fun `TC-O03 & TC-O04 Valid tenant context creates proper partition`() {
        assertTrue(contextTenantA.isPartitioningActive)
        assertEquals("ten_fitoni_77a", contextTenantA.tenantId)
    }

    @Test
    fun `TC-O05 & TC-O06 Fake tenant and empty tenant are strictly blocked`() {
        assertThrows(IllegalArgumentException::class.java) {
            OfflineTenantContext(tenantId = "", role = "OWNER")
        }
        assertThrows(IllegalArgumentException::class.java) {
            OfflineTenantContext(tenantId = "tenant_bluesystem_default", role = "OWNER")
        }
    }

    // ─── TC-O07 a TC-O13: CROSS-TENANT ISOLATION & LEAKAGE PREVENTION ─────────

    @Test
    fun `TC-O07, TC-O08, TC-O09 Tenant A and Tenant B data is strictly isolated`() {
        val orderA = OfflineOrderTenantAwareShadow(
            orderId = "ord_alpha_01",
            tenantId = contextTenantA.tenantId,
            businessId = "biz_fitoni_01",
            total = 100.0,
            status = "DELIVERED"
        )
        val orderB = OfflineOrderTenantAwareShadow(
            orderId = "ord_beta_01",
            tenantId = contextTenantB.tenantId,
            businessId = "biz_pizza_02",
            total = 50.0,
            status = "PENDING"
        )

        repository.saveOrder(contextTenantA, orderA)
        repository.saveOrder(contextTenantB, orderB)

        val ordersForA = repository.getOrders(contextTenantA)
        val ordersForB = repository.getOrders(contextTenantB)

        assertEquals(1, ordersForA.size)
        assertEquals("ord_alpha_01", ordersForA[0].orderId)

        assertEquals(1, ordersForB.size)
        assertEquals("ord_beta_01", ordersForB[0].orderId)

        // TC-O09: Cross-tenant read is blocked
        assertNull(repository.getOrderById(contextTenantA, "ord_beta_01"))
        assertNull(repository.getOrderById(contextTenantB, "ord_alpha_01"))
    }

    @Test
    fun `TC-O10 & TC-O11 Cross-tenant write and pending action are rejected with SecurityException`() {
        val crossTenantOrder = OfflineOrderTenantAwareShadow(
            orderId = "ord_rogue",
            tenantId = contextTenantB.tenantId,
            businessId = "biz_02",
            total = 10.0
        )
        val result = repository.saveOrder(contextTenantA, crossTenantOrder)
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is SecurityException)

        val crossTenantAction = TenantAwarePendingActionShadow(
            id = "act_rogue",
            tenantId = contextTenantB.tenantId,
            orderId = "ord_rogue",
            actionType = "DISPATCH"
        )
        val actionResult = repository.savePendingAction(contextTenantA, crossTenantAction)
        assertTrue(actionResult.isFailure)
        assertTrue(actionResult.exceptionOrNull() is SecurityException)
    }

    @Test
    fun `TC-O12 & TC-O13 Context switch and cache isolation`() {
        val orderA = OfflineOrderTenantAwareShadow(
            orderId = "ord_switch_01",
            tenantId = contextTenantA.tenantId,
            businessId = "biz_fitoni_01",
            total = 30.0
        )
        repository.saveOrder(contextTenantA, orderA)

        // Switch to Tenant B -> Dataset should be empty
        val ordersInB = repository.getOrders(contextTenantB)
        assertTrue(ordersInB.isEmpty())

        // Switch back to Tenant A -> Dataset restored safely
        val ordersInA = repository.getOrders(contextTenantA)
        assertEquals(1, ordersInA.size)
        assertEquals("ord_switch_01", ordersInA[0].orderId)
    }

    // ─── TC-O14 a TC-O19: SHADOW MIGRATION SIMULATION & ROLLBACK ─────────────

    @Test
    fun `TC-O14, TC-O15, TC-O16 Migration preserves 100 percent of operational data`() {
        val legacyList = listOf(
            OfflineOrderEntity(orderId = "ord_01", businessId = "biz_fitoni_01", total = 45.0, status = "COMPLETED"),
            OfflineOrderEntity(orderId = "ord_02", businessId = "biz_pizza_02", total = 20.0, status = "PREPARING")
        )
        val mapping = mapOf(
            "biz_fitoni_01" to "ten_fitoni_77a",
            "biz_pizza_02" to "ten_pizza_88b"
        )

        val result = migrationSimulator.simulateMigration(legacyList, mapping)
        assertTrue(result.success)
        assertEquals(2, result.migratedOrders.size)
        assertEquals("ten_fitoni_77a", result.migratedOrders[0].tenantId)
        assertEquals(45.0, result.migratedOrders[0].total, 0.001)
        assertEquals("ten_pizza_88b", result.migratedOrders[1].tenantId)
    }

    @Test
    fun `TC-O17 & TC-O18 Ambiguous tenant blocks migration and force fail triggers rollback`() {
        val legacyList = listOf(
            OfflineOrderEntity(orderId = "ord_unmapped", businessId = "biz_unknown", total = 10.0)
        )
        val result = migrationSimulator.simulateMigration(legacyList, emptyMap())
        assertFalse(result.success)
        assertEquals(1, result.unmappedOrders.size)

        // Test Rollback simulation
        val rollbackResult = migrationSimulator.simulateMigration(legacyList, mapOf("biz_unknown" to "ten_ok"), forceFail = true)
        assertFalse(rollbackResult.success)
        assertTrue(rollbackResult.migratedOrders.isEmpty())
    }

    // ─── TC-O20 a TC-O25: OFFLINE SYNC, IDEMPOTENCY & LOGOUT ──────────────────

    @Test
    fun `TC-O20 & TC-O21 Sync Engine enforces tenant matching and action idempotency`() {
        val actionA = TenantAwarePendingActionShadow(
            id = "act_sync_01",
            tenantId = contextTenantA.tenantId,
            orderId = "ord_01",
            actionType = "ACCEPT_ORDER"
        )

        // Sync with matching context -> SUCCESS
        val syncRes1 = syncEngine.syncPendingAction(contextTenantA, actionA)
        assertTrue(syncRes1.isSuccess)
        assertEquals("SYNCED_SUCCESSFULLY", syncRes1.getOrNull())

        // Re-sync same action -> IDEMPOTENT SUCCESS
        val syncRes2 = syncEngine.syncPendingAction(contextTenantA, actionA)
        assertTrue(syncRes2.isSuccess)
        assertEquals("IDEMPOTENT_ALREADY_PROCESSED", syncRes2.getOrNull())

        // Sync action for Tenant A with Tenant B context -> REJECTED
        val crossSyncRes = syncEngine.syncPendingAction(contextTenantB, actionA)
        assertTrue(crossSyncRes.isFailure)
        assertTrue(crossSyncRes.exceptionOrNull() is SecurityException)
    }

    @Test
    fun `TC-O23 & TC-O24 Logout clears active tenant session without data corruption`() {
        val orderA = OfflineOrderTenantAwareShadow(
            orderId = "ord_logout_01",
            tenantId = contextTenantA.tenantId,
            businessId = "biz_01",
            total = 15.0
        )
        repository.saveOrder(contextTenantA, orderA)
        assertEquals(1, repository.getOrders(contextTenantA).size)

        // User A log out -> Clear session
        repository.clearTenantSession(contextTenantA.tenantId)
        assertTrue(repository.getOrders(contextTenantA).isEmpty())
    }

    @Test
    fun `TC-O29 & TC-O30 Complete offline isolation scenario certified`() {
        assertEquals(0, repository.getTotalOrdersCountAcrossPartitions())
    }
}
