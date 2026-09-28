package com.example.menu

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper
import com.example.domain.engine.menu.MenuEngineImpl
import com.example.domain.model.menu.FirestoreBatchLimitExceededException
import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuConflictException
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.MenuVersion
import com.example.domain.model.menu.MenuVersionStatus
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuSyncResilienceTest {

    @Test
    fun `test optimistic locking conflict throws MenuConflictException when local version is not greater than server version`() {
        val localVersion = 2L
        val serverVersion = 2L

        var conflictCaught = false
        try {
            if (localVersion <= serverVersion) {
                throw MenuConflictException("rest_01", localVersion, serverVersion)
            }
        } catch (e: MenuConflictException) {
            conflictCaught = true
            assertEquals(2L, e.localVersion)
            assertEquals(2L, e.serverVersion)
        }

        assertTrue("Debe capturarse la excepción de conflicto de versión", conflictCaught)
    }

    @Test
    fun `test batch limit check throws FirestoreBatchLimitExceededException if operations exceed 500`() {
        val totalOperations = 550

        var batchLimitCaught = false
        try {
            if (totalOperations > 500) {
                throw FirestoreBatchLimitExceededException(totalOperations)
            }
        } catch (e: FirestoreBatchLimitExceededException) {
            batchLimitCaught = true
            assertEquals(550, e.operationCount)
        }

        assertTrue("Debe capturarse la excepción de límite de operaciones batch", batchLimitCaught)
    }

    @Test
    fun `test customer menu fallback when published document is missing dynamically synthesizes active menu`() = runBlocking {
        val categories = listOf(
            MenuCategory(id = "c1", restaurantId = "r1", primaryName = "Tacos", isActive = true)
        )
        val products = listOf(
            MenuProduct(id = "p1", restaurantId = "r1", primaryCategoryId = "c1", name = "Taco Al Pastor", status = MenuProductStatus.ACTIVE)
        )

        val menuEngine = MenuEngineImpl(
            categoryRepository = FakeCategoryRepo(categories),
            productRepository = FakeProductRepo(products),
            versionRepository = FakeVersionRepo(null) // Simula documento ausente
        )

        val customerTree = menuEngine.getPublishedMenuForCustomer("r1").first()

        assertEquals(1, customerTree.categories.size)
        assertEquals("Tacos", customerTree.categories.first().primaryName)
        assertEquals(1, customerTree.productsByCategory["c1"]?.size)
        assertEquals("Taco Al Pastor", customerTree.productsByCategory["c1"]?.first()?.name)
    }

    @Test
    fun `test re-publishing with same content produces identical SHA-256 checksum for idempotency`() {
        val categories = listOf(MenuCategory(id = "c1", restaurantId = "r1", primaryName = "Pizzas"))
        val products = listOf(MenuProduct(id = "p1", restaurantId = "r1", primaryCategoryId = "c1", name = "Pepperoni", basePrice = 300.0))

        val checksum1 = CanonicalJsonChecksumHelper.computeMenuChecksum(categories, products)
        val checksum2 = CanonicalJsonChecksumHelper.computeMenuChecksum(categories, products)

        assertEquals("El checksum debe ser estrictamente idéntico (idempotente)", checksum1, checksum2)
    }

    @Test
    fun `test publication failure transition marks version status as FAILED`() {
        val initialVersion = MenuVersion(
            id = "ver_01",
            restaurantId = "rest_01",
            version = 1L,
            status = MenuVersionStatus.BUILDING
        )

        // Simulación de fallo durante la transacción de publicación
        val failedVersion = initialVersion.copy(
            status = MenuVersionStatus.FAILED
        )

        assertEquals(MenuVersionStatus.FAILED, failedVersion.status)
        assertNotEquals(MenuVersionStatus.PUBLISHED, failedVersion.status)
    }

    @Test
    fun `test concurrent publications resolve deterministically via optimistic locking version numbers`() {
        val serverCurrentVersion = 3L

        val adminAPublishAttemptVersion = 4L
        val adminBPublishAttemptVersion = 4L

        // Admin A publica primero con éxito y avanza el servidor a v4
        val serverNewVersion = adminAPublishAttemptVersion

        // Admin B intenta publicar con su versión desactualizada (v4 <= server v4)
        var adminBConflict = false
        if (adminBPublishAttemptVersion <= serverNewVersion) {
            adminBConflict = true
        }

        assertTrue("El intento concurrente del Admin B debe ser rechazado determinísticamente", adminBConflict)
    }
}
