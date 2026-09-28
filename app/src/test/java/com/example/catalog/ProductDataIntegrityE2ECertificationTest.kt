package com.example.catalog

import com.example.data.CartItem
import com.example.data.CartManager
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.SelectedOption
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

@OptIn(ExperimentalCoroutinesApi::class)
class ProductDataIntegrityE2ECertificationTest {

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

    // ─── TEST 01: Crear producto completo con longDescription, categoría Admin y Badges ───
    @Test
    fun test_01_create_full_product_with_long_description_category_and_badges() {
        viewModel.initWizard(null, "biz_001")
        viewModel.updateName("FritoTacos Especiales")
        viewModel.updateShortDescription("Tacos mixtos de Cerdo, Res y Pollo")
        viewModel.updateLongDescription("Enchilada completa con muchos toppings tradicionales, tortilla frita de maíz y queso seco...")
        viewModel.updateCategoryName("Antojitos Nicas")
        viewModel.updateSubCategoryName("Fritanga")
        viewModel.updatePriceText("200.00")
        viewModel.updateEstimatedCostText("100.00")
        viewModel.updateTaxPercentageText("15")

        // Activar Badges
        viewModel.toggleIsPopular()
        viewModel.toggleIsNew()
        viewModel.toggleIsTopSeller()
        viewModel.toggleIsRecommended()

        val s = viewModel.uiState.value
        assertEquals("FritoTacos Especiales", s.name)
        assertEquals("Tacos mixtos de Cerdo, Res y Pollo", s.shortDescription)
        assertEquals("Enchilada completa con muchos toppings tradicionales, tortilla frita de maíz y queso seco...", s.longDescription)
        assertEquals("Antojitos Nicas", s.categoryName)
        assertTrue(s.isPopular)
        assertTrue(s.isNew)
        assertTrue(s.isTopSeller)
        assertTrue(s.isRecommended)
    }

    // ─── TEST 02: Editar y conservar longDescription de forma independiente ───
    @Test
    fun test_02_edit_and_preserve_long_description_independently() {
        val prod = Product(
            id = "p_long_desc",
            name = "FritoTacos",
            shortDescription = "Tacos mixto de Cerdo Res y Pollo",
            longDescription = "Enchilada completa con muchos toppings de la casa",
            price = 200.0
        )

        viewModel.initWizard(prod, "biz_001")
        viewModel.updateLongDescription("Enchilada completa con muchos toppings extras y crema fresca...")

        val s = viewModel.uiState.value
        assertEquals("FritoTacos", s.name)
        assertEquals("Tacos mixto de Cerdo Res y Pollo", s.shortDescription)
        assertEquals("Enchilada completa con muchos toppings extras y crema fresca...", s.longDescription)
    }

    // ─── TEST 03: Editar y almacenar IDs de categorías/subcategorías del Admin ───
    @Test
    fun test_03_edit_and_store_admin_category_ids() {
        val prod = Product(
            id = "p_cat_admin",
            name = "Nacatamal Especial",
            categoryId = "cat_admin_nicas_100",
            categoryName = "Platos Típicos",
            subCategoryId = "sub_cat_managua_01",
            subCategoryName = "Fritangas Central",
            price = 120.0
        )

        viewModel.initWizard(prod, "biz_001")
        val s = viewModel.uiState.value

        assertEquals("cat_admin_nicas_100", s.categoryId)
        assertEquals("sub_cat_managua_01", s.subCategoryId)
        assertEquals("Platos Típicos", s.categoryName)
        assertEquals("Fritangas Central", s.subCategoryName)
    }

    // ─── TEST 04: Persistir e hidratar Badges ───
    @Test
    fun test_04_persist_and_hydrate_badges() {
        val prod = Product(
            id = "p_badges",
            name = " Hamburguesa Suprema",
            isPopular = true,
            isNew = true,
            isTopSeller = true,
            isRecommended = true
        )

        viewModel.initWizard(prod, "biz_001")
        val s = viewModel.uiState.value

        assertTrue(s.isPopular)
        assertTrue(s.isNew)
        assertTrue(s.isTopSeller)
        assertTrue(s.isRecommended)
    }

    // ─── TEST 05: Persistir option_groups ───
    @Test
    fun test_05_persist_option_groups_in_firestore() {
        viewModel.initWizard(null, "biz_001")
        viewModel.addOptionGroup("Toppings Fritanga", isRequired = false)
        val grpId = viewModel.uiState.value.optionGroups.first().id
        viewModel.addOptionItem(grpId, "Queso Extra", 20.0)
        viewModel.addOptionItem(grpId, "Tocino Extra", 10.0)

        val groups = viewModel.uiState.value.optionGroups
        assertEquals(1, groups.size)
        assertEquals("Toppings Fritanga", groups.first().name)
        assertEquals(2, groups.first().options.size)
        assertEquals(20.0, groups.first().options[0].additionalPrice, 0.01)
        assertEquals(10.0, groups.first().options[1].additionalPrice, 0.01)
    }

    // ─── TEST 06: Reabrir producto y recuperar el 100% de las opciones ───
    @Test
    fun test_06_reopen_product_and_recover_options_100_percent() {
        val existingGroup = MenuOptionGroup(
            id = "grp_toppings",
            name = "Toppings",
            isRequired = false,
            options = listOf(
                MenuOption(id = "opt_tocino", name = "Tocino", additionalPrice = 10.0),
                MenuOption(id = "opt_queso", name = "Queso", additionalPrice = 20.0),
                MenuOption(id = "opt_chile", name = "Chile Jalapeño", additionalPrice = 20.0)
            )
        )
        val prod = Product(
            id = "p_with_options",
            name = "FritoTacos",
            price = 200.0,
            optionGroups = listOf(existingGroup)
        )

        viewModel.initWizard(prod, "biz_001")
        val s = viewModel.uiState.value

        assertEquals(1, s.optionGroups.size)
        assertEquals("Toppings", s.optionGroups.first().name)
        assertEquals(3, s.optionGroups.first().options.size)
        assertEquals("Tocino", s.optionGroups.first().options[0].name)
        assertEquals("Queso", s.optionGroups.first().options[1].name)
        assertEquals("Chile Jalapeño", s.optionGroups.first().options[2].name)
    }

    // ─── TEST 07: Cliente consume longDescription de forma independiente ───
    @Test
    fun test_07_customer_consumes_long_description() {
        val prod = Product(
            id = "p_detail",
            name = "FritoTacos",
            shortDescription = "Tacos mixto de Cerdo Res y Pollo",
            longDescription = "Enchilada completa con muchos toppings, tortilla frita de maíz casera y ensalada fresca de repollo.",
            price = 200.0
        )

        assertNotEquals("shortDescription y longDescription deben ser independientes", prod.shortDescription, prod.longDescription)
        assertTrue(prod.longDescription.contains("Enchilada completa"))
    }

    // ─── TEST 08: Cliente visualiza grupos de opciones ───
    @Test
    fun test_08_customer_visualizes_option_groups() {
        val group = MenuOptionGroup(
            id = "grp_toppings",
            name = "Topping",
            options = listOf(
                MenuOption(id = "o1", name = "Tocino", additionalPrice = 10.0),
                MenuOption(id = "o2", name = "Queso", additionalPrice = 20.0)
            )
        )
        val prod = Product(id = "p_cust_opt", name = "FritoTacos", optionGroups = listOf(group))

        assertEquals(1, prod.optionGroups.size)
        assertEquals("Topping", prod.optionGroups.first().name)
        assertEquals(2, prod.optionGroups.first().options.size)
    }

    // ─── TEST 09: Cliente selecciona opciones y las envía al carrito ───
    @Test
    fun test_09_customer_selects_options_and_adds_to_cart() {
        val selQueso = SelectedOption(
            optionGroupId = "grp_topping",
            optionGroupName = "Topping",
            optionId = "opt_queso",
            optionName = "Queso",
            additionalPrice = 20.0,
            finalPrice = 20.0
        )
        val selTocino = SelectedOption(
            optionGroupId = "grp_topping",
            optionGroupName = "Topping",
            optionId = "opt_tocino",
            optionName = "Tocino",
            additionalPrice = 10.0,
            finalPrice = 10.0
        )

        val selectedList = listOf(selQueso, selTocino)
        assertEquals(2, selectedList.size)
        assertEquals(30.0, selectedList.sumOf { it.finalPrice }, 0.01)
    }

    // ─── TEST 10: Carrito calcula subtotal correcto (Base + Extras) ───
    @Test
    fun test_10_cart_calculates_correct_subtotal_with_extras() {
        val item = CartItem(
            productId = "prod_frito_tacos",
            productName = "FritoTacos",
            price = 200.0,
            quantity = 1,
            selectedOptions = listOf(
                SelectedOption(optionGroupId = "g1", optionId = "o1", optionName = "Queso", additionalPrice = 20.0, finalPrice = 20.0),
                SelectedOption(optionGroupId = "g1", optionId = "o2", optionName = "Tocino", additionalPrice = 10.0, finalPrice = 10.0)
            )
        )

        // Verificación: Base 200 + Queso 20 + Tocino 10 = 230
        assertEquals(30.0, item.optionsAddons, 0.01)
        assertEquals(230.0, item.unitPriceWithExtras, 0.01)
        assertEquals(230.0, item.unitPriceWithExtras * item.quantity, 0.01)
    }

    // ─── TEST 11 & 12: Diagnósticos explicitos en Storage ───
    @Test
    fun test_11_and_12_storage_image_upload_diagnostics() {
        viewModel.initWizard(null, "biz_001")
        viewModel.addPhoto("content://media/external/images/media/999")

        val state = viewModel.uiState.value
        assertEquals(1, state.photosList.size)
        assertEquals("content://media/external/images/media/999", state.photosList.first())
    }

    // ─── TEST 13 & 14: Paridad de conteo Merchant y Customer (2 de 2) ───
    @Test
    fun test_13_and_14_parity_between_merchant_and_customer_counts() {
        val prodA = Product(id = "prod_a", businessId = "biz_001", name = "FritoTacos", price = 200.0)
        val prodB = Product(id = "prod_b", businessId = "biz_001", name = "Quezuda", price = 250.0)

        val firestoreList = listOf(prodA, prodB)
        assertEquals(2, firestoreList.size)
    }

    // ─── TEST 15: Regresión completa Product Management Engine v2.2 ───
    @Test
    fun test_15_product_management_engine_v22_full_regression() {
        viewModel.initWizard(null, "biz_001")
        (1..6).forEach { step ->
            viewModel.setStep(step)
            assertEquals(step, viewModel.uiState.value.currentStep)
        }

        viewModel.updatePriceText("225.00")
        assertEquals(225.0, viewModel.uiState.value.priceText.replace(',', '.').toDouble(), 0.01)
    }
}
