package com.example.catalog

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
class ValidationEngineTest {

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
    fun testEmptyNameProducesValidationError() {
        viewModel.updateName("")
        viewModel.validateStepRealtime()
        assertTrue(viewModel.uiState.value.validationErrors.any { it.contains("nombre") })
    }

    @Test
    fun testOriginalPriceLowerThanPriceProducesPriceError() {
        viewModel.updatePriceText("200.0")
        viewModel.updateOriginalPriceText("150.0")
        viewModel.validateStepRealtime()
        assertNotNull(viewModel.uiState.value.priceError)
    }

    @Test
    fun testValidPricesClearPriceError() {
        viewModel.updatePriceText("150.0")
        viewModel.updateOriginalPriceText("200.0")
        viewModel.validateStepRealtime()
        assertNull(viewModel.uiState.value.priceError)
    }
}
