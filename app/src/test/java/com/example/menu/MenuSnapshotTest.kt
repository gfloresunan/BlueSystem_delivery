package com.example.menu

import com.example.data.dto.menu.MenuSnapshotDto
import com.example.data.mapper.menu.MenuSnapshotMapper
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuSnapshot
import com.example.domain.model.menu.MenuSnapshotStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MenuSnapshotTest {

    @Test
    fun `MenuSnapshot holds immutable version metadata correctly`() {
        val snapshot = MenuSnapshot(
            id = "snap_v2.3.0",
            restaurantId = "rest1",
            semanticVersion = "v2.3.0",
            publisherUserId = "user_admin",
            changeReason = "Actualización de menú de verano",
            status = MenuSnapshotStatus.PUBLISHED,
            sha256Checksum = "a1b2c3d4e5f6",
            products = listOf(
                MenuProduct(id = "p1", name = "Pizza Pepperoni", basePrice = 250.0)
            )
        )

        assertEquals("snap_v2.3.0", snapshot.id)
        assertEquals("v2.3.0", snapshot.semanticVersion)
        assertEquals(MenuSnapshotStatus.PUBLISHED, snapshot.status)
        assertEquals(1, snapshot.products.size)
        assertEquals("a1b2c3d4e5f6", snapshot.sha256Checksum)
    }

    @Test
    fun `MenuSnapshotMapper converts bidirectionally without data loss`() {
        val domain = MenuSnapshot(
            id = "snap_v2.3.0",
            restaurantId = "rest1",
            branchId = "branch_main",
            semanticVersion = "v2.3.0",
            publisherUserId = "user_admin",
            changeReason = "Cambio de temporada",
            status = MenuSnapshotStatus.PUBLISHED,
            sha256Checksum = "checksum123"
        )

        val dto = MenuSnapshotMapper.toDto(domain)
        val domainRestored = MenuSnapshotMapper.toDomain(dto)

        assertEquals(domain.id, domainRestored.id)
        assertEquals(domain.semanticVersion, domainRestored.semanticVersion)
        assertEquals(domain.status, domainRestored.status)
        assertEquals(domain.sha256Checksum, domainRestored.sha256Checksum)
    }
}
