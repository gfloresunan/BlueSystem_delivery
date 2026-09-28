package com.example.orders

import com.example.presentation.business.orders.MerchantOrdersViewModel
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class MerchantOrdersViewModelTest {

    private lateinit var viewModel: MerchantOrdersViewModel

    @Before
    fun setUp() {
        viewModel = MerchantOrdersViewModel()
    }

    @Test
    fun testInitialOrdersCenterState() {
        viewModel.startOrdersCenter("biz_demo_123")
        assertEquals("biz_demo_123", viewModel.uiState.value.businessId)
        assertTrue(viewModel.uiState.value.isKanbanView)
    }

    @Test
    fun testToggleViewMode() {
        assertTrue(viewModel.uiState.value.isKanbanView)
        viewModel.toggleViewMode()
        assertFalse(viewModel.uiState.value.isKanbanView)
    }
}
