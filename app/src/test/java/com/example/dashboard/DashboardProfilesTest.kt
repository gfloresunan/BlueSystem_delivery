package com.example.dashboard

import com.example.domain.model.dashboard.DashboardProfileType
import com.example.presentation.business.dashboard.MerchantDashboardViewModel
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class DashboardProfilesTest {

    private lateinit var viewModel: MerchantDashboardViewModel

    @Before
    fun setUp() {
        viewModel = MerchantDashboardViewModel()
    }

    @Test
    fun testSelectKitchenProfileFiltersWidgets() {
        viewModel.selectProfile(DashboardProfileType.KITCHEN)
        assertEquals(DashboardProfileType.KITCHEN, viewModel.uiState.value.activeProfileType)
    }
}
