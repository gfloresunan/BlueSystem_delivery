package com.example.menu

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.engine.menu.MenuDiffEngineImpl
import com.example.domain.engine.menu.MenuRollbackCoordinatorImpl
import com.example.domain.model.menu.MenuAuditEventType
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.model.menu.MenuSnapshotStatus
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuVersioningE2ETest {

    private val snapshotRepo = FakeSnapshotRepo()
    private val auditRepo = FakeAuditRepo()
    private val diffEngine = MenuDiffEngineImpl()
    private val rollbackCoordinator = MenuRollbackCoordinatorImpl(snapshotRepo, auditRepo)

    @Test
    fun `E2E Flow - Versioning, Diff Calculation, Audit Logging and Verified Rollback`() = runBlocking {
        // 1. Crear y firmar Snapshot Versión 1 (v2.2.0)
        val v1Products = listOf(
            MenuProduct(id = "p1", name = "Hamburguesa Clásica", basePrice = 120.0),
            MenuProduct(id = "p2", name = "Papas Fritas", basePrice = 40.0)
        )
        val v1Checksum = CanonicalJsonChecksumHelper.computeMenuChecksum(categories = emptyList(), products = v1Products, optionGroups = emptyList())
        val snapshotV1 = MenuSnapshot(
            id = "snap_v2.2.0",
            restaurantId = "rest_enterprise",
            semanticVersion = "v2.2.0",
            publisherUserId = "chef_01",
            changeReason = "Menú Base Inicial",
            status = MenuSnapshotStatus.PUBLISHED,
            sha256Checksum = v1Checksum,
            products = v1Products
        )
        snapshotRepo.saveSnapshot(snapshotV1)

        // 2. Crear y firmar Snapshot Versión 2 (v2.3.0) con cambios de precio y nuevo producto
        val v2Products = listOf(
            MenuProduct(id = "p1", name = "Hamburguesa Clásica", basePrice = 140.0), // +20.0
            MenuProduct(id = "p2", name = "Papas Fritas", basePrice = 40.0),
            MenuProduct(id = "p3", name = "Malteada de Chocolate", basePrice = 60.0) // Nuevo
        )
        val v2Checksum = CanonicalJsonChecksumHelper.computeMenuChecksum(categories = emptyList(), products = v2Products, optionGroups = emptyList())
        val snapshotV2 = MenuSnapshot(
            id = "snap_v2.3.0",
            restaurantId = "rest_enterprise",
            semanticVersion = "v2.3.0",
            publisherUserId = "chef_01",
            changeReason = "Actualización de Precios Verano",
            status = MenuSnapshotStatus.PUBLISHED,
            sha256Checksum = v2Checksum,
            products = v2Products
        )
        snapshotRepo.saveSnapshot(snapshotV2)

        // 3. Ejecutar Diff Engine entre v2.2.0 y v2.3.0
        val diff = diffEngine.calculateDiff(snapshotV1, snapshotV2)
        assertEquals(1, diff.addedProducts.size)
        assertEquals("p3", diff.addedProducts[0].id)
        assertEquals(1, diff.priceChanges.size)
        assertEquals(120.0, diff.priceChanges[0].oldPrice, 0.001)
        assertEquals(140.0, diff.priceChanges[0].newPrice, 0.001)

        // 4. Administrador decide hacer Rollback a la versión v2.2.0
        val rollbackResult = rollbackCoordinator.executeRollback(
            restaurantId = "rest_enterprise",
            targetSnapshot = snapshotV1,
            userId = "admin_super",
            reason = "Ajuste por desacuerdo en incremento de precio de hamburguesa"
        )

        // 5. Verificación de Integridad Atómica y Auditoría
        assertTrue(rollbackResult.isSuccess)
        assertTrue(rollbackResult.checksumVerified)
        assertEquals("v2.2.0", rollbackResult.restoredVersion)

        val auditHistory = auditRepo.getAuditHistory("rest_enterprise")
        assertEquals(1, auditHistory.size)
        assertEquals(MenuAuditEventType.ROLLBACK_EXECUTED, auditHistory[0].eventType)
        assertEquals("admin_super", auditHistory[0].userId)
        assertEquals("v2.2.0", auditHistory[0].semanticVersion)
    }
}
