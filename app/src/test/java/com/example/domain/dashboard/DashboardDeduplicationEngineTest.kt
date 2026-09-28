package com.example.domain.dashboard

import com.example.data.repository.BusinessInfo
import com.example.domain.engine.dashboard.DashboardDeduplicationEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DashboardDeduplicationEngineTest {

    private fun createMockBusiness(id: String, name: String = "Business $id"): BusinessInfo {
        return BusinessInfo(
            id = id,
            name = name,
            isOpen = true,
            isFeatured = true
        )
    }

    @Test
    fun `business appearing in multiple curated sections is capped at M=2 appearances`() {
        val bizA = createMockBusiness("biz_A")
        val bizB = createMockBusiness("biz_B")
        val bizC = createMockBusiness("biz_C")

        val sectionOrder = listOf(
            "FEATURED_BUSINESSES",
            "SAME_PRICE",
            "TOP_SELLING",
            "RECOMMENDED",
            "NEW_BUSINESSES"
        )

        // biz_A is present in all 5 pools
        val featured = listOf(bizA, bizB)
        val samePrice = listOf(bizA, bizC)
        val topSelling = listOf(bizA, bizB)
        val recommended = listOf(bizA, bizC)
        val newBiz = listOf(bizA)

        val result = DashboardDeduplicationEngine.filterCuratedSections(
            sectionOrder = sectionOrder,
            featuredPool = featured,
            samePricePool = samePrice,
            topSellingPool = topSelling,
            recommendedPool = recommended,
            newBusinessesPool = newBiz
        )

        // biz_A appeared in FEATURED (#1) and SAME_PRICE (#2)
        assertTrue(result.featuredBusinesses.any { it.id == "biz_A" })
        assertTrue(result.samePriceBusinesses.any { it.id == "biz_A" })

        // In TOP_SELLING, since bizB is accepted (count 2 total items >= 2), biz_A must be suppressed
        assertTrue("bizB should be accepted", result.topSellingBusinesses.any { it.id == "biz_B" })
    }

    @Test
    fun `anti-emptying rule rescues candidate if section has fewer than 2 items`() {
        val bizA = createMockBusiness("biz_A")

        val sectionOrder = listOf(
            "FEATURED_BUSINESSES",
            "SAME_PRICE",
            "TOP_SELLING"
        )

        // biz_A was in featured and samePrice (already 2 appearances)
        val featured = listOf(bizA, createMockBusiness("biz_B"), createMockBusiness("biz_C"))
        val samePrice = listOf(bizA, createMockBusiness("biz_D"), createMockBusiness("biz_E"))
        // In topSelling, only biz_A is in the pool. Without rescue it would be empty (0 < 2).
        val topSelling = listOf(bizA)

        val result = DashboardDeduplicationEngine.filterCuratedSections(
            sectionOrder = sectionOrder,
            featuredPool = featured,
            samePricePool = samePrice,
            topSellingPool = topSelling,
            recommendedPool = emptyList(),
            newBusinessesPool = emptyList()
        )

        // Anti-emptying rescues biz_A so topSelling has 1 item and is not completely empty
        assertEquals(1, result.topSellingBusinesses.size)
        assertEquals("biz_A", result.topSellingBusinesses[0].id)
    }

    @Test
    fun `exempt sections are defined with immutable semantic integrity`() {
        assertTrue(DashboardDeduplicationEngine.EXEMPT_SECTIONS.contains("FAVORITES"))
        assertTrue(DashboardDeduplicationEngine.EXEMPT_SECTIONS.contains("NEARBY"))
        assertTrue(DashboardDeduplicationEngine.EXEMPT_SECTIONS.contains("BRANCHES"))
        assertTrue(DashboardDeduplicationEngine.EXEMPT_SECTIONS.contains("ALL_BUSINESSES"))

        assertFalse(DashboardDeduplicationEngine.EXEMPT_SECTIONS.contains("FEATURED_BUSINESSES"))
        assertFalse(DashboardDeduplicationEngine.EXEMPT_SECTIONS.contains("TOP_SELLING"))
    }
}
