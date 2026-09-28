package com.example.controltower

import com.example.presentation.business.controltower.DeliveryControlTowerViewModel
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class DeliveryControlTowerViewModelTest {

    private lateinit var viewModel: DeliveryControlTowerViewModel

    @Before
    fun setUp() {
        viewModel = DeliveryControlTowerViewModel()
    }

    @Test
    fun testInitialControlTowerState() {
        viewModel.startControlTower("biz_demo_123")
        assertEquals("biz_demo_123", viewModel.uiState.value.businessId)
        assertTrue(viewModel.uiState.value.systemHealth.overallStatusLabel.contains("OPERATIVO"))
    }
}
