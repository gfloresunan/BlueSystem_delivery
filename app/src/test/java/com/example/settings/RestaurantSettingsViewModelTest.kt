package com.example.settings

import com.example.presentation.business.settings.RestaurantSettingsViewModel
import com.example.presentation.business.settings.SettingsCategory
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class RestaurantSettingsViewModelTest {

    private lateinit var viewModel: RestaurantSettingsViewModel

    @Before
    fun setUp() {
        viewModel = RestaurantSettingsViewModel()
    }

    @Test
    fun testInitialRscState() {
        viewModel.startSettingsCenter("res_demo_001")
        assertEquals("res_demo_001", viewModel.uiState.value.restaurantId)
    }

    @Test
    fun testSelectCategoryOpensDrawer() {
        viewModel.selectCategory(SettingsCategory.BRANCHES)
        assertEquals(SettingsCategory.BRANCHES, viewModel.uiState.value.selectedCategory)
        assertTrue(viewModel.uiState.value.isDrawerEditorOpen)
    }

    @Test
    fun testRestaurantHealthAndChangeHistoryPresent() {
        viewModel.startSettingsCenter("res_demo_001")
        val settings = viewModel.uiState.value.settings
        assertTrue(settings.readiness.readinessScorePercent > 0)
        assertTrue(settings.changeHistory.isNotEmpty())
    }
}
