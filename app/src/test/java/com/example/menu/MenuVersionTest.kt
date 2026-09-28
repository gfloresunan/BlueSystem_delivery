package com.example.menu

import com.example.domain.model.menu.MenuVersion
import com.example.domain.model.menu.MenuVersionStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class MenuVersionTest {

    @Test
    fun `test menu version initialization`() {
        val version = MenuVersion(
            id = "ver_01",
            restaurantId = "rest_01",
            version = 2L,
            checksum = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            status = MenuVersionStatus.PUBLISHED
        )

        assertEquals("ver_01", version.id)
        assertEquals(2L, version.version)
        assertEquals(MenuVersionStatus.PUBLISHED, version.status)
        assertEquals("2.2.0", version.schemaVersion)
    }
}
