package com.example.dashboard

import com.example.presentation.business.dashboard.MerchantDashboardViewModel
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class MerchantDashboardViewModelTest {

    private lateinit var viewModel: MerchantDashboardViewModel

    @Before
    fun setUp() {
        viewModel = MerchantDashboardViewModel()
    }

    @Test
    fun testStartDashboardInitialState() {
        viewModel.startDashboard("biz_demo_123")
        assertEquals("biz_demo_123", viewModel.uiState.value.businessId)
    }

    @Test
    fun testActiveWidgetsCount() {
        val widgets = viewModel.uiState.value.activeWidgets
        assertTrue(widgets.isNotEmpty())
        assertEquals(17, widgets.size)
    }
}
