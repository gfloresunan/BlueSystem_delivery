package com.example.dashboard

import com.example.presentation.business.dashboard.MerchantDashboardViewModel
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class SystemHealthWidgetTest {

    private lateinit var viewModel: MerchantDashboardViewModel

    @Before
    fun setUp() {
        viewModel = MerchantDashboardViewModel()
    }

    @Test
    fun testSystemHealthDefaultStatuses() {
        assertTrue(viewModel.uiState.value.firestoreHealthStatus.contains("Óptimo"))
        assertTrue(viewModel.uiState.value.syncHealthStatus.contains("día"))
    }
}
