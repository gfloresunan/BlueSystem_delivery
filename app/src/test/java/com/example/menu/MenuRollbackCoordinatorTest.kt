package com.example.menu

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.engine.menu.MenuRollbackCoordinatorImpl
import com.example.domain.model.menu.MenuAuditEvent
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.repository.menu.IMenuAuditRepository
import com.example.domain.repository.menu.IMenuSnapshotRepository
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FakeSnapshotRepo : IMenuSnapshotRepository {
    private val memory = mutableMapOf<String, MenuSnapshot>()
    override suspend fun saveSnapshot(snapshot: MenuSnapshot) { memory[snapshot.id] = snapshot }
    override suspend fun getSnapshotByVersion(restaurantId: String, semanticVersion: String): MenuSnapshot? = memory.values.find { it.semanticVersion == semanticVersion }
    override suspend fun getLatestSnapshot(restaurantId: String): MenuSnapshot? = memory.values.lastOrNull()
    override suspend fun listSnapshots(restaurantId: String): List<MenuSnapshot> = memory.values.toList()
}

class FakeAuditRepo : IMenuAuditRepository {
    val events = mutableListOf<MenuAuditEvent>()
    override suspend fun recordEvent(event: MenuAuditEvent) { events.add(event) }
    override suspend fun getAuditHistory(restaurantId: String): List<MenuAuditEvent> = events
}

class MenuRollbackCoordinatorTest {

    private val snapshotRepo = FakeSnapshotRepo()
    private val auditRepo = FakeAuditRepo()
    private val coordinator = MenuRollbackCoordinatorImpl(snapshotRepo, auditRepo)

    @Test
    fun `executeRollback succeeds when checksum matches`() = runBlocking {
        val products = listOf(MenuProduct(id = "p1", name = "Pizza", basePrice = 200.0))
        val validChecksum = CanonicalJsonChecksumHelper.computeMenuChecksum(categories = emptyList(), products = products, optionGroups = emptyList())

        val targetSnapshot = MenuSnapshot(
            id = "snap_v2.1.0",
            restaurantId = "rest1",
            semanticVersion = "v2.1.0",
            sha256Checksum = validChecksum,
            products = products
        )

        val result = coordinator.executeRollback(
            restaurantId = "rest1",
            targetSnapshot = targetSnapshot,
            userId = "admin_user",
            reason = "Revertir incremento erróneo de precios"
        )

        assertTrue(result.isSuccess)
        assertTrue(result.checksumVerified)
        assertEquals("v2.1.0", result.restoredVersion)
        assertEquals(1, auditRepo.events.size)
    }

    @Test
    fun `executeRollback fails when checksum is corrupted`() = runBlocking {
        val products = listOf(MenuProduct(id = "p1", name = "Pizza", basePrice = 200.0))

        val corruptedSnapshot = MenuSnapshot(
            id = "snap_v2.1.0",
            restaurantId = "rest1",
            semanticVersion = "v2.1.0",
            sha256Checksum = "CORRUPTED_CHECKSUM_HASH",
            products = products
        )

        val result = coordinator.executeRollback(
            restaurantId = "rest1",
            targetSnapshot = corruptedSnapshot,
            userId = "admin_user",
            reason = "Prueba de corrupción"
        )

        assertFalse(result.isSuccess)
        assertFalse(result.checksumVerified)
    }
}
