package com.example.dashboard

import com.example.presentation.business.dashboard.MerchantDashboardViewModel
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class OmniboxSearchTest {

    private lateinit var viewModel: MerchantDashboardViewModel

    @Before
    fun setUp() {
        viewModel = MerchantDashboardViewModel()
    }

    @Test
    fun testUpdateSearchQueryState() {
        viewModel.updateSearchQuery("Pizza")
        assertEquals("Pizza", viewModel.uiState.value.searchQuery)
    }

    @Test
    fun testEmptySearchQueryClearsResults() {
        viewModel.updateSearchQuery("Hamburguesa")
        viewModel.updateSearchQuery("")
        assertTrue(viewModel.uiState.value.searchFilteredProducts.isEmpty())
    }
}
