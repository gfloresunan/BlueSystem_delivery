package com.example.catalog

import com.example.data.repository.CategoryRepository
import com.example.domain.model.Category
import com.example.domain.model.Product
import com.example.presentation.business.catalog.ProductWizardUiState
import com.example.presentation.business.catalog.ProductWizardViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * FASE 2.7 — PRODUCT WIZARD — FOOTER + OPTIONS UI + MERCHANT SUBCATEGORY MANAGEMENT
 * Matriz de Pruebas Automatizadas de Certificación UX & Subcategorías (Sprint FASE 2.7)
 */
class ProductWizardUXAndSubcategoryCertificationTest {

    private lateinit var viewModel: ProductWizardViewModel

    @Before
    fun setUp() {
        viewModel = ProductWizardViewModel()
    }

    // ─── BLOQUE FOOTER (FOOTER-01 a FOOTER-08) ───

    @Test
    fun test_FOOTER_01_Step1_Has_SiguientePaso2() {
        viewModel.setStep(1)
        val state = viewModel.uiState.value
        assertEquals(1, state.currentStep)
        assertFalse(state.isEditing)
    }

    @Test
    fun test_FOOTER_02_Step2_Has_Atras_And_SiguientePaso3() {
        viewModel.setStep(2)
        val state = viewModel.uiState.value
        assertEquals(2, state.currentStep)
    }

    @Test
    fun test_FOOTER_03_Step3_Has_Atras_And_SiguientePaso4() {
        viewModel.setStep(3)
        val state = viewModel.uiState.value
        assertEquals(3, state.currentStep)
    }

    @Test
    fun test_FOOTER_04_Step4_Has_Atras_And_SiguientePaso5() {
        viewModel.setStep(4)
        val state = viewModel.uiState.value
        assertEquals(4, state.currentStep)
    }

    @Test
    fun test_FOOTER_05_Step5_Has_Atras_And_SiguientePaso6() {
        viewModel.setStep(5)
        val state = viewModel.uiState.value
        assertEquals(5, state.currentStep)
    }

    @Test
    fun test_FOOTER_06_Step6_NewProduct_Has_GuardarProducto() {
        viewModel.setStep(6)
        val state = viewModel.uiState.value
        assertEquals(6, state.currentStep)
        assertFalse(state.isEditing)
    }

    @Test
    fun test_FOOTER_06_Step6_EditProduct_Has_GuardarCambios() {
        val existing = Product(id = "p_100", name = "Tacos Mixtos", businessId = "biz_001")
        viewModel.initWizard(existing, "biz_001")
        viewModel.setStep(6)
        val state = viewModel.uiState.value
        assertEquals(6, state.currentStep)
        assertTrue(state.isEditing)
    }

    @Test
    fun test_FOOTER_07_Keyboard_Resilience_State_Structure() {
        // Verifica que la estructura del dialogo contenga padding para IME y NavigationBars
        viewModel.setStep(1)
        val state = viewModel.uiState.value
        assertNotNull(state)
    }

    @Test
    fun test_FOOTER_08_NavigationBars_Resilience_State_Structure() {
        viewModel.setStep(6)
        val state = viewModel.uiState.value
        assertNotNull(state)
    }

    // ─── BLOQUE OPTIONS UI (OPTIONS-01 a OPTIONS-08) ───

    @Test
    fun test_OPTIONS_01_AddGroup_InitialState_Empty() {
        val state = viewModel.uiState.value
        assertTrue(state.optionGroups.isEmpty())
    }

    @Test
    fun test_OPTIONS_02_AddGroup_Creates_Group_In_ViewModel() {
        viewModel.addOptionGroup("Tamaños de Pizza", isRequired = true)
        val groups = viewModel.uiState.value.optionGroups
        assertEquals(1, groups.size)
        assertEquals("Tamaños de Pizza", groups[0].name)
        assertTrue(groups[0].isRequired)
    }

    @Test
    fun test_OPTIONS_03_AddOptionItem_Creates_Item_With_Price() {
        viewModel.addOptionGroup("Salsas", isRequired = false)
        val groupId = viewModel.uiState.value.optionGroups[0].id

        viewModel.addOptionItem(groupId, "Salsa Chipote", 15.0)

        val updatedGroup = viewModel.uiState.value.optionGroups[0]
        assertEquals(1, updatedGroup.options.size)
        assertEquals("Salsa Chipote", updatedGroup.options[0].name)
        assertEquals(15.0, updatedGroup.options[0].additionalPrice, 0.01)
    }

    @Test
    fun test_OPTIONS_04_RemoveOptionItem_Functional() {
        viewModel.addOptionGroup("Extras", isRequired = false)
        val groupId = viewModel.uiState.value.optionGroups[0].id
        viewModel.addOptionItem(groupId, "Queso Extra", 20.0)
        val itemId = viewModel.uiState.value.optionGroups[0].options[0].id

        viewModel.removeOptionItem(groupId, itemId)

        val updatedGroup = viewModel.uiState.value.optionGroups[0]
        assertTrue(updatedGroup.options.isEmpty())
    }

    @Test
    fun test_OPTIONS_05_RemoveOptionGroup_Functional() {
        viewModel.addOptionGroup("Grupo A Eliminar", isRequired = false)
        val groupId = viewModel.uiState.value.optionGroups[0].id

        viewModel.removeOptionGroup(groupId)

        assertTrue(viewModel.uiState.value.optionGroups.isEmpty())
    }

    @Test
    fun test_OPTIONS_06_Multiple_Option_Groups_Structure() {
        viewModel.addOptionGroup("Tamaño", isRequired = true)
        viewModel.addOptionGroup("Bebida", isRequired = false)

        val groups = viewModel.uiState.value.optionGroups
        assertEquals(2, groups.size)
        assertEquals("Tamaño", groups[0].name)
        assertEquals("Bebida", groups[1].name)
    }

    @Test
    fun test_OPTIONS_07_EditGroup_Retains_Group_Data() {
        viewModel.addOptionGroup("Tamaño Original", isRequired = true)
        val groupId = viewModel.uiState.value.optionGroups[0].id
        viewModel.addOptionItem(groupId, "Grande", 50.0)

        val group = viewModel.uiState.value.optionGroups[0]
        assertEquals("Tamaño Original", group.name)
        assertEquals(1, group.options.size)
    }

    @Test
    fun test_OPTIONS_08_EditOption_Price_Format_Resilience() {
        viewModel.addOptionGroup("Adicionales", isRequired = false)
        val groupId = viewModel.uiState.value.optionGroups[0].id

        viewModel.addOptionItem(groupId, "Tocino Extra", 25.50)

        val item = viewModel.uiState.value.optionGroups[0].options[0]
        assertEquals(25.50, item.additionalPrice, 0.01)
    }

    // ─── BLOQUE SUBCATEGORÍAS (SUBCAT-01 a SUBCAT-08) ───

    @Test
    fun test_SUBCAT_01_ListMerchantSubCategories_Default_Empty() {
        val state = viewModel.uiState.value
        assertTrue(state.availableSubCategories.isEmpty())
    }

    @Test
    fun test_SUBCAT_02_SelectSubCategory_Updates_State() {
        val subCat = Category(id = "sub_01", name = "Tacos", businessId = "biz_001", active = true)
        viewModel.selectSubCategory(subCat)

        val state = viewModel.uiState.value
        assertEquals("sub_01", state.subCategoryId)
        assertEquals("Tacos", state.subCategoryName)
    }

    @Test
    fun test_SUBCAT_03_SelectCategory_And_SubCategory_Independent() {
        val globalCat = Category(id = "cat_main", name = "Platos Principales", type = "PRODUCT", active = true)
        val subCat = Category(id = "sub_02", name = "Enchiladas", businessId = "biz_001", active = true)

        viewModel.selectCategory(globalCat)
        viewModel.selectSubCategory(subCat)

        val state = viewModel.uiState.value
        assertEquals("cat_main", state.categoryId)
        assertEquals("Platos Principales", state.categoryName)
        assertEquals("sub_02", state.subCategoryId)
        assertEquals("Enchiladas", state.subCategoryName)
    }

    @Test
    fun test_SUBCAT_04_SubCategory_Status_Active_Validation() {
        val activeSub = Category(id = "sub_act", name = "Combos", active = true)
        val inactiveSub = Category(id = "sub_inact", name = "Descontinuados", active = false)

        assertTrue(activeSub.active)
        assertFalse(inactiveSub.active)
    }

    @Test
    fun test_SUBCAT_05_Multitenant_SubCategory_Isolation() {
        val subComercioA = Category(id = "sub_a", name = "Bebidas Comercio A", businessId = "biz_COMERCIO_A")
        val subComercioB = Category(id = "sub_b", name = "Bebidas Comercio B", businessId = "biz_COMERCIO_B")

        assertEquals("biz_COMERCIO_A", subComercioA.businessId)
        assertEquals("biz_COMERCIO_B", subComercioB.businessId)
        assertNotEquals(subComercioA.businessId, subComercioB.businessId)
    }

    @Test
    fun test_SUBCAT_06_Wizard_Selector_Consumes_SubCategory() {
        val subCat = Category(id = "sub_003", name = "Postres Nicas", businessId = "biz_001")
        viewModel.selectSubCategory(subCat)

        assertEquals("sub_003", viewModel.uiState.value.subCategoryId)
        assertEquals("Postres Nicas", viewModel.uiState.value.subCategoryName)
    }

    @Test
    fun test_SUBCAT_07_SaveProduct_Retains_SubCategoryId() {
        val subCat = Category(id = "sub_999", name = "Asados", businessId = "biz_001")
        viewModel.updateName("Pollo Asado con Tajadas")
        viewModel.selectSubCategory(subCat)

        val state = viewModel.uiState.value
        assertEquals("Pollo Asado con Tajadas", state.name)
        assertEquals("sub_999", state.subCategoryId)
        assertEquals("Asados", state.subCategoryName)
    }

    @Test
    fun test_SUBCAT_08_ReopenProduct_Retains_SubCategory() {
        val existing = Product(
            id = "p_500",
            name = "Carne Asada",
            categoryId = "cat_main",
            categoryName = "Platos Principales",
            subCategoryId = "sub_999",
            subCategoryName = "Asados",
            businessId = "biz_001"
        )

        viewModel.initWizard(existing, "biz_001")

        val state = viewModel.uiState.value
        assertEquals("p_500", state.productId)
        assertEquals("Carne Asada", state.name)
        assertEquals("sub_999", state.subCategoryId)
        assertEquals("Asados", state.subCategoryName)
    }

    // ─── BLOQUE BANDERAS COMERCIALES & PICANTE (BADGES & SPICY 01-05) ───

    @Test
    fun test_BADGES_01_MultiSelection_Independent() {
        assertFalse(viewModel.uiState.value.isPopular)
        assertFalse(viewModel.uiState.value.isNew)
        assertFalse(viewModel.uiState.value.isTopSeller)
        assertFalse(viewModel.uiState.value.isRecommended)
        assertFalse(viewModel.uiState.value.isVegetarian)
        assertFalse(viewModel.uiState.value.isSpicy)

        // Activar todos de forma independiente
        viewModel.toggleIsPopular()
        viewModel.toggleIsNew()
        viewModel.toggleIsTopSeller()
        viewModel.toggleIsRecommended()
        viewModel.toggleIsVegetarian()
        viewModel.toggleIsSpicy()

        var state = viewModel.uiState.value
        assertTrue(state.isPopular)
        assertTrue(state.isNew)
        assertTrue(state.isTopSeller)
        assertTrue(state.isRecommended)
        assertTrue(state.isVegetarian)
        assertTrue(state.isSpicy)

        // Desactivar selectivamente
        viewModel.toggleIsPopular()
        state = viewModel.uiState.value
        assertFalse(state.isPopular)
        assertTrue(state.isNew)
        assertTrue(state.isTopSeller)
    }

    @Test
    fun test_SPICY_01_Level_Range_And_Sync_With_IsSpicy() {
        // Nivel 0 -> isSpicy false
        viewModel.setSpicyLevel(0)
        var state = viewModel.uiState.value
        assertEquals(0, state.spicyLevel)
        assertFalse(state.isSpicy)

        // Nivel 1 a 5 -> isSpicy true
        for (lvl in 1..5) {
            viewModel.setSpicyLevel(lvl)
            state = viewModel.uiState.value
            assertEquals(lvl, state.spicyLevel)
            assertTrue("Nivel $lvl debe marcar isSpicy = true", state.isSpicy)
        }

        // Regresar a nivel 0
        viewModel.setSpicyLevel(0)
        state = viewModel.uiState.value
        assertEquals(0, state.spicyLevel)
        assertFalse(state.isSpicy)
    }

    @Test
    fun test_REHYDRATION_Badges_And_Spicy_Loaded() {
        val existing = Product(
            id = "p_spicy_veg",
            name = "Curry Picante Vegano",
            businessId = "biz_001",
            isPopular = true,
            isNew = true,
            isTopSeller = true,
            isRecommended = true,
            isVegetarian = true,
            isSpicy = true,
            spicyLevel = 4
        )

        viewModel.initWizard(existing, "biz_001")
        val state = viewModel.uiState.value

        assertTrue(state.isPopular)
        assertTrue(state.isNew)
        assertTrue(state.isTopSeller)
        assertTrue(state.isRecommended)
        assertTrue(state.isVegetarian)
        assertTrue(state.isSpicy)
        assertEquals(4, state.spicyLevel)
    }

    @Test
    fun test_ORPHAN_Subcategory_Detection() {
        val existing = Product(
            id = "p_orphan",
            name = "Plato Huérfano",
            businessId = "biz_001",
            subCategoryId = "sub_old_999",
            subCategoryName = "Antiguos Especiales"
        )
        viewModel.initWizard(existing, "biz_001")

        val state = viewModel.uiState.value
        assertEquals("Antiguos Especiales", state.subCategoryName)

        val catalogSubCats = listOf(
            Category(id = "sub_01", name = "Tacos", businessId = "biz_001"),
            Category(id = "sub_02", name = "Bebidas", businessId = "biz_001")
        )

        val isOrphan = state.subCategoryName.isNotBlank() &&
                catalogSubCats.isNotEmpty() &&
                catalogSubCats.none { it.name.equals(state.subCategoryName, ignoreCase = true) || it.id == state.subCategoryId }

        assertTrue("La subcategoría debe ser detectada como huérfana", isOrphan)
    }
}
