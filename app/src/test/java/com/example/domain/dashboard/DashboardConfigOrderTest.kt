package com.example.domain.dashboard

import com.example.DashboardConfig
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DashboardConfigOrderTest {

    @Test
    fun `canonical default section order contains exactly 15 defined sections`() {
        val canonical = DashboardConfig.CANONICAL_DEFAULT_SECTION_ORDER
        assertEquals(15, canonical.size)
        assertTrue(canonical.contains("BANNERS"))
        assertTrue(canonical.contains("CATEGORIES"))
        assertTrue(canonical.contains("BRANCHES"))
        assertTrue(canonical.contains("NEARBY"))
        assertTrue(canonical.contains("FEATURED_BUSINESSES"))
        assertTrue(canonical.contains("FEATURED_PRODUCTS"))
        assertTrue(canonical.contains("FLASH_DEALS"))
        assertTrue(canonical.contains("PROMOTIONS"))
        assertTrue(canonical.contains("SAME_PRICE"))
        assertTrue(canonical.contains("TOP_SELLING"))
        assertTrue(canonical.contains("RECOMMENDED"))
        assertTrue(canonical.contains("NEW_BUSINESSES"))
        assertTrue(canonical.contains("QUICK_REORDER"))
        assertTrue(canonical.contains("FAVORITES"))
        assertTrue(canonical.contains("EXPRESS_DELIVERY"))
    }

    @Test
    fun `default DashboardConfig returns normalized canonical order`() {
        val config = DashboardConfig()
        val normalized = config.getNormalizedSectionOrder()
        assertEquals(DashboardConfig.CANONICAL_DEFAULT_SECTION_ORDER, normalized)
    }

    @Test
    fun `default DashboardConfig has fail-closed safe defaults for X to Y features`() {
        val config = DashboardConfig()
        assertFalse("showExpressDeliveryBanner must default to false", config.showExpressDeliveryBanner)
        assertFalse("xToYServiceEnabled must default to false", config.xToYServiceEnabled)
    }

    @Test
    fun `custom reordered sections are strictly preserved at top`() {
        val customOrder = listOf("FLASH_DEALS", "FEATURED_BUSINESSES", "CATEGORIES", "BANNERS")
        val config = DashboardConfig(sectionOrder = customOrder)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals("FLASH_DEALS", normalized[0])
        assertEquals("FEATURED_BUSINESSES", normalized[1])
        assertEquals("CATEGORIES", normalized[2])
        assertEquals("BANNERS", normalized[3])

        // Missing canonical sections must be appended
        assertEquals(15, normalized.size)
        assertTrue(normalized.contains("NEARBY"))
        assertTrue(normalized.contains("PROMOTIONS"))
        assertTrue(normalized.contains("FAVORITES"))
        assertTrue(normalized.contains("EXPRESS_DELIVERY"))
    }

    @Test
    fun `unknown section IDs are safely ignored without crashing`() {
        val corruptOrder = listOf("UNKNOWN_SECTION_1", "FLASH_DEALS", "INVALID_BLOCK", "BANNERS")
        val config = DashboardConfig(sectionOrder = corruptOrder)
        val normalized = config.getNormalizedSectionOrder()

        assertFalse(normalized.contains("UNKNOWN_SECTION_1"))
        assertFalse(normalized.contains("INVALID_BLOCK"))
        assertEquals("FLASH_DEALS", normalized[0])
        assertEquals("BANNERS", normalized[1])
        assertEquals(15, normalized.size)
    }

    @Test
    fun `duplicate section IDs are deduplicated preserving first occurrence`() {
        val duplicateOrder = listOf("BANNERS", "FLASH_DEALS", "BANNERS", "CATEGORIES", "FLASH_DEALS")
        val config = DashboardConfig(sectionOrder = duplicateOrder)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals(15, normalized.size)
        assertEquals(15, normalized.toSet().size) // No duplicates
        assertEquals("BANNERS", normalized[0])
        assertEquals("FLASH_DEALS", normalized[1])
        assertEquals("CATEGORIES", normalized[2])
    }

    @Test
    fun `case insensitivity and whitespace trimming work properly`() {
        val messyOrder = listOf("  flash_deals  ", "banners  ", "  CaTeGoRiEs ")
        val config = DashboardConfig(sectionOrder = messyOrder)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals("FLASH_DEALS", normalized[0])
        assertEquals("BANNERS", normalized[1])
        assertEquals("CATEGORIES", normalized[2])
        assertEquals(15, normalized.size)
    }
}
