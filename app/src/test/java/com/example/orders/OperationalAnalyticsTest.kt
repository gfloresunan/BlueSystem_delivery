package com.example.orders

import com.example.presentation.business.orders.MerchantOrdersViewModel
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class OperationalAnalyticsTest {

    private lateinit var viewModel: MerchantOrdersViewModel

    @Before
    fun setUp() {
        viewModel = MerchantOrdersViewModel()
    }

    @Test
    fun testDefaultFeatureFlagsPresence() {
        val flags = viewModel.uiState.value.featureFlags
        assertTrue(flags["EnableMerchantOrdersCenter"] == true)
        assertTrue(flags["EnableSmartAssignment"] == true)
    }
}
