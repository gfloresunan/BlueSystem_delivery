package com.example.catalog

import com.example.domain.model.Product
import com.example.presentation.business.catalog.ProductWizardViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ProductWizardViewModelTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var viewModel: ProductWizardViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        viewModel = ProductWizardViewModel()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testInitWizardNewProductDefaultsToStep1() {
        viewModel.initWizard(null, "bus_123")
        assertEquals(1, viewModel.uiState.value.currentStep)
        assertFalse(viewModel.uiState.value.isEditing)
    }

    @Test
    fun testUpdateNameValidatesRealtime() {
        viewModel.updateName("Hamburguesa Especial")
        assertEquals("Hamburguesa Especial", viewModel.uiState.value.name)
    }

    @Test
    fun testSetStepNavigatesCorrectly() {
        viewModel.setStep(3)
        assertEquals(3, viewModel.uiState.value.currentStep)
    }

    @Test
    fun testAddOptionGroupAndItem() {
        viewModel.addOptionGroup("Tamaño", isRequired = true, minSel = 1, maxSel = 1)
        assertEquals(1, viewModel.uiState.value.optionGroups.size)
        val groupId = viewModel.uiState.value.optionGroups.first().id

        viewModel.addOptionItem(groupId, "Grande", 30.0)
        assertEquals(1, viewModel.uiState.value.optionGroups.first().options.size)
        assertEquals("Grande", viewModel.uiState.value.optionGroups.first().options.first().name)
        assertEquals(30.0, viewModel.uiState.value.optionGroups.first().options.first().additionalPrice, 0.01)
    }
}
