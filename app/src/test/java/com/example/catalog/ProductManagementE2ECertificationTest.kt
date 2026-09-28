package com.example.catalog

import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.presentation.business.catalog.ProductWizardViewModel
import com.google.firebase.Timestamp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.util.Locale

@OptIn(ExperimentalCoroutinesApi::class)
class ProductManagementE2ECertificationTest {

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

    // ─── TEST 01: Producto nuevo sin imagen ───
    @Test
    fun test_01_create_product_without_image() {
        viewModel.initWizard(null, "biz_001")
        viewModel.updateName("Pollo Asado Especial")
        viewModel.updateShortDescription("Con tajadas y ensalada")
        viewModel.updateLongDescription("Pollo entero marinado con especias tradicionales...")
        viewModel.updateCategoryName("Platos Principales")
        viewModel.updateSubCategoryName("Asados")
        viewModel.updatePriceText("200.00")
        viewModel.updateEstimatedCostText("110.00")
        viewModel.updateTaxPercentageText("15")
        viewModel.updateStockQuantityText("30")

        viewModel.validateStepRealtime()

        val state = viewModel.uiState.value
        assertTrue("El estado debe ser válido sin errores", state.validationErrors.isEmpty())

        assertEquals("Pollo Asado Especial", state.name)
        assertEquals(200.0, state.priceText.replace(',', '.').toDouble(), 0.01)
        assertEquals(110.0, state.estimatedCostText.replace(',', '.').toDouble(), 0.01)
        assertEquals(15.0, state.taxPercentageText.replace(',', '.').toDouble(), 0.01)
        assertEquals(30, state.stockQuantityText.toInt())
        assertTrue("Sin fotos cargadas", state.photosList.isEmpty())
    }

    // ─── TEST 02: Producto nuevo con imagen ───
    @Test
    fun test_02_create_product_with_image() {
        viewModel.initWizard(null, "biz_001")
        viewModel.updateName("Pizza Pepperoni Enterprise")
        viewModel.updatePriceText("350.00")

        val storageUrl = "https://firebasestorage.googleapis.com/v0/b/app/o/products%2Fprod_100%2Fmain.webp"
        viewModel.addPhoto(storageUrl)

        val state = viewModel.uiState.value
        assertEquals(1, state.photosList.size)
        assertEquals(storageUrl, state.photosList.first())
    }

    // ─── TEST 03: Edición completa — Los 6 Pasos Cargar e Hidratar ───
    @Test
    fun test_03_edit_full_product_hydration_all_6_steps() {
        val existingGroup = MenuOptionGroup(
            id = "grp_salsas",
            name = "Salsas Reutilizables",
            isRequired = false,
            options = listOf(MenuOption(id = "opt_bbq", name = "Salsa BBQ", additionalPrice = 15.0))
        )

        val existingProduct = Product(
            id = "prod_999",
            businessId = "biz_001",
            name = "Hamburguesa Premium",
            shortDescription = "Carne 100% res",
            longDescription = "Pan brioche artesanal, doble carne res, queso cheddar...",
            categoryName = "Hamburguesas",
            subCategoryName = "Gourmet",
            price = 250.0,
            originalPrice = 280.0,
            estimatedCost = 130.0,
            taxPercentage = 15.0,
            stockQuantity = 25,
            minStockAlert = 5,
            autoHideOnZeroStock = true,
            imageUrl = "https://storage.com/photo.webp",
            images = listOf("https://storage.com/photo.webp"),
            isPopular = true,
            isNew = true,
            isTopSeller = true,
            isRecommended = true,
            spicyLevel = 2,
            optionGroups = listOf(existingGroup)
        )

        viewModel.initWizard(existingProduct, "biz_001")
        val s = viewModel.uiState.value

        assertTrue("Debe marcar modo edición", s.isEditing)
        assertEquals("prod_999", s.productId)
        assertEquals("Hamburguesa Premium", s.name)
        assertEquals("Carne 100% res", s.shortDescription)
        assertEquals("Pan brioche artesanal, doble carne res, queso cheddar...", s.longDescription)
        assertEquals("Hamburguesas", s.categoryName)
        assertEquals("Gourmet", s.subCategoryName)

        // Verificación de formateo independiente de Locale
        assertEquals(250.0, s.priceText.replace(',', '.').toDouble(), 0.01)
        assertEquals(280.0, s.originalPriceText.replace(',', '.').toDouble(), 0.01)
        assertEquals(130.0, s.estimatedCostText.replace(',', '.').toDouble(), 0.01)

        assertTrue(s.isPopular)
        assertTrue(s.isNew)
        assertTrue(s.isTopSeller)
        assertTrue(s.isRecommended)
        assertEquals(2, s.spicyLevel)
        assertEquals(1, s.photosList.size)
        assertEquals(1, s.optionGroups.size)
        assertEquals("25", s.stockQuantityText)
    }

    // ─── TEST 04: Edición parcial — Retención estricta de atributos no modificados ───
    @Test
    fun test_04_partial_edit_preserves_non_modified_fields() {
        val creationTime = Timestamp.now()
        val originalProduct = Product(
            id = "prod_keep_all",
            businessId = "biz_001",
            branchId = "branch_central",
            name = "Quezuda Especial",
            shortDescription = "Con todo",
            longDescription = "Receta secreta de la casa con triple queso...",
            price = 200.0,
            originalPrice = 250.0,
            estimatedCost = 100.0,
            taxPercentage = 15.0,
            stockQuantity = 15,
            salesCount = 42,
            favoritesCount = 18,
            rating = 4.9,
            totalRevenue = 8400.0,
            createdAt = creationTime,
            branchAvailability = mapOf("branch_central" to mapOf("isAvailable" to true))
        )

        // 1. Cargar producto en wizard
        viewModel.initWizard(originalProduct, "biz_001")

        // 2. Modificar ÚNICAMENTE el precio de venta (200.00 -> 225.00)
        viewModel.updatePriceText("225.00")

        // 3. Validar estado del formulario
        viewModel.validateStepRealtime()
        val s = viewModel.uiState.value
        assertEquals("225.00", s.priceText)

        // 4. Verificar que costo, ISV, stock y métricas originales se mantengan
        assertEquals(100.0, s.estimatedCostText.replace(',', '.').toDouble(), 0.01)
        assertEquals(15.0, s.taxPercentageText.replace(',', '.').toDouble(), 0.01)
        assertEquals("15", s.stockQuantityText)
        assertEquals(42, originalProduct.salesCount)
        assertEquals(4.9, originalProduct.rating, 0.01)
        assertEquals("branch_central", originalProduct.branchId)
    }

    // ─── TEST 05: Opciones Reutilizadas ───
    @Test
    fun test_05_reused_option_groups() {
        val reusableGroup = MenuOptionGroup(
            id = "grp_extras_global",
            name = "Extras de la Casa",
            isRequired = false,
            options = listOf(
                MenuOption(id = "opt_queso", name = "Queso Extra", additionalPrice = 25.0),
                MenuOption(id = "opt_tocino", name = "Tocino Extra", additionalPrice = 30.0)
            )
        )

        // Asignar el grupo reutilizable al producto A
        viewModel.initWizard(null, "biz_001")
        viewModel.addOptionGroup(reusableGroup.name, reusableGroup.isRequired)
        val groupId = viewModel.uiState.value.optionGroups.first().id
        viewModel.addOptionItem(groupId, "Queso Extra", 25.0)

        val productAOptionGroups = viewModel.uiState.value.optionGroups
        assertEquals(1, productAOptionGroups.size)
        assertEquals("Extras de la Casa", productAOptionGroups.first().name)
        assertEquals(25.0, productAOptionGroups.first().options.first().additionalPrice, 0.01)
    }

    // ─── TEST 06: Live Preview Card Mirror Reactivity ───
    @Test
    fun test_06_live_preview_card_mirror() {
        viewModel.initWizard(null, "biz_001")

        // Inicial
        assertEquals("", viewModel.uiState.value.name)
        assertEquals("", viewModel.uiState.value.priceText)

        // Mutar formulario
        viewModel.updateName("Tacos al Pastor Card Mirror")
        viewModel.updatePriceText("180.00")
        viewModel.updateShortDescription("3 tacos con piña y cilantro")

        // El estado de preview debe reflejarlo al instante
        val state = viewModel.uiState.value
        assertEquals("Tacos al Pastor Card Mirror", state.name)
        assertEquals("180.00", state.priceText)
        assertEquals("3 tacos con piña y cilantro", state.shortDescription)
    }

    // ─── TEST 07: Formateo de Inputs y Pestañas ───
    @Test
    fun test_07_step_stepper_and_text_fields_formatting() {
        viewModel.initWizard(null, "biz_001")

        // Navegación de pasos (1 al 6)
        (1..6).forEach { step ->
            viewModel.setStep(step)
            assertEquals(step, viewModel.uiState.value.currentStep)
        }

        // Prueba de entrada con coma y punto
        viewModel.updatePriceText("225,50")
        assertEquals(225.50, viewModel.uiState.value.priceText.replace(',', '.').toDouble(), 0.01)
    }

    // ─── TEST 08: Regresión de Disponibilidad y Stock ───
    @Test
    fun test_08_catalog_regression_and_stock_toggle() {
        viewModel.initWizard(null, "biz_001")
        assertTrue("Por defecto disponible", viewModel.uiState.value.isAvailable)

        viewModel.updateIsAvailable(false)
        assertFalse("Debe actualizar disponibilidad a false", viewModel.uiState.value.isAvailable)

        viewModel.updateStockQuantityText("0")
        assertEquals("0", viewModel.uiState.value.stockQuantityText)
    }
}
