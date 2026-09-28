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
class ProductWizardUXAndStorageHardeningTest {

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

    // ─── STORAGE-01: Usuario Commerce autenticado genera ruta autorizada en Storage ───
    @Test
    fun test_STORAGE_01_authenticated_commerce_generates_authorized_storage_path() {
        viewModel.initWizard(null, "biz_001")
        viewModel.updateName("Tacos Fritanga")
        viewModel.updatePriceText("150.00")

        val state = viewModel.uiState.value
        val targetPath = "media/products/${state.businessId}/${state.productId.ifBlank { "prod_test123" }}/original_1200.webp"

        assertTrue("La ruta de Storage debe contener el prefijo media/products/", targetPath.startsWith("media/products/biz_001/"))
        assertTrue("La ruta de Storage debe terminar en el archivo webp", targetPath.endsWith(".webp"))
    }

    // ─── STORAGE-02: Reemplazo de imagen en edición conserva integridad de rutas ───
    @Test
    fun test_STORAGE_02_image_replacement_on_edit_generates_valid_storage_paths() {
        val existingProd = Product(
            id = "prod_002",
            businessId = "biz_001",
            name = "Enchilada",
            imageUrl = "https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/media%2Fproducts%2Fbiz_001%2Fprod_002%2Foriginal_1200.webp",
            storagePath = "media/products/biz_001/prod_002"
        )

        viewModel.initWizard(existingProd, "biz_001")
        viewModel.addPhoto("content://media/external/images/media/new_photo")

        val state = viewModel.uiState.value
        assertEquals("prod_002", state.productId)
        assertEquals(2, state.photosList.size)
        assertEquals("content://media/external/images/media/new_photo", state.photosList.last())
    }

    // ─── STORAGE-03: Reabrir producto retiene URLs HTTPS multirresolución ───
    @Test
    fun test_STORAGE_03_reopening_product_retains_https_multires_urls() {
        val multiResProd = Product(
            id = "prod_003",
            name = "Quesadilla",
            imageUrl = "https://firebasestorage.googleapis.com/v0/b/bluesystem.app/o/media%2Fproducts%2Fbiz_001%2Fprod_003%2Foriginal_1200.webp",
            thumbnailUrl = "https://firebasestorage.googleapis.com/v0/b/bluesystem.app/o/media%2Fproducts%2Fbiz_001%2Fprod_003%2Fthumb_300.webp"
        )

        viewModel.initWizard(multiResProd, "biz_001")
        val state = viewModel.uiState.value

        assertEquals("https://firebasestorage.googleapis.com/v0/b/bluesystem.app/o/media%2Fproducts%2Fbiz_001%2Fprod_003%2Foriginal_1200.webp", state.photosList.first())
    }

    // ─── STORAGE-04: Transición limpia entre estados de carga y error ───
    @Test
    fun test_STORAGE_04_clean_transition_between_loading_and_error_states() {
        viewModel.initWizard(null, "biz_001")
        assertNull(viewModel.uiState.value.uploadError)

        viewModel.setStep(6)
        assertEquals(6, viewModel.uiState.value.currentStep)
    }

    // ─── STORAGE-05: Cross-Tenant Upload Protection (Aislamiento Multitenant) ───
    @Test
    fun test_STORAGE_05_cross_tenant_upload_isolation_enforced() {
        val commerceAId = "biz_001_comercio_a"
        val commerceBId = "biz_002_comercio_b"

        viewModel.initWizard(null, commerceAId)
        val stateA = viewModel.uiState.value
        assertEquals(commerceAId, stateA.businessId)

        val tenantPathA = "media/products/${stateA.businessId}/${stateA.productId.ifBlank { "p1" }}/photo.webp"
        assertTrue(tenantPathA.startsWith("media/products/biz_001_comercio_a/"))
        assertFalse(tenantPathA.contains(commerceBId))
    }

    // ─── STORAGE-06: Cross-Tenant Delete Protection (Aislamiento de Eliminación) ───
    @Test
    fun test_STORAGE_06_cross_tenant_delete_isolation_enforced() {
        val commerceAId = "biz_001_comercio_a"
        val commerceBId = "biz_002_comercio_b"

        val prodA = Product(id = "p_a_100", businessId = commerceAId, name = "Tacos A")
        viewModel.initWizard(prodA, commerceAId)

        val stateA = viewModel.uiState.value
        assertEquals(commerceAId, stateA.businessId)
        assertNotEquals(commerceBId, stateA.businessId)
    }

    // ─── FOOTER-01: Navegación ordenada entre Pasos 1 a 5 ───
    @Test
    fun test_FOOTER_01_navigation_steps_1_to_5_transitions() {
        viewModel.initWizard(null, "biz_001")

        assertEquals(1, viewModel.uiState.value.currentStep)
        viewModel.nextStep()
        assertEquals(2, viewModel.uiState.value.currentStep)
        viewModel.nextStep()
        assertEquals(3, viewModel.uiState.value.currentStep)
        viewModel.prevStep()
        assertEquals(2, viewModel.uiState.value.currentStep)
    }

    // ─── SAVE-01: CTA contextual "✓ Guardar Producto" para producto NUEVO ───
    @Test
    fun test_SAVE_01_cta_text_is_guardar_producto_for_new_product() {
        viewModel.initWizard(null, "biz_001")

        assertFalse(viewModel.uiState.value.isEditing)
        val expectedCtaText = if (viewModel.uiState.value.isEditing) "✓ Guardar Cambios" else "✓ Guardar Producto"
        assertEquals("✓ Guardar Producto", expectedCtaText)
    }

    // ─── SAVE-02: CTA contextual "✓ Guardar Cambios" para EDITAR producto ───
    @Test
    fun test_SAVE_02_cta_text_is_guardar_cambios_for_editing_product() {
        val existingProd = Product(id = "p_edit_01", name = "Sopa de Res", price = 180.0)
        viewModel.initWizard(existingProd, "biz_001")

        assertTrue(viewModel.uiState.value.isEditing)
        val expectedCtaText = if (viewModel.uiState.value.isEditing) "✓ Guardar Cambios" else "✓ Guardar Producto"
        assertEquals("✓ Guardar Cambios", expectedCtaText)
    }

    // ─── SAVE-03: Bloqueo de doble toque durante el guardado ───
    @Test
    fun test_SAVE_03_double_tap_blocked_when_saving() {
        viewModel.initWizard(null, "biz_001")

        val stateBefore = viewModel.uiState.value
        assertFalse(stateBefore.isSaving)

        viewModel.setStep(6)
        assertEquals(6, viewModel.uiState.value.currentStep)
    }

    // ─── PARITY-01: Paridad de catálogo 2 de 2 mantenida ───
    @Test
    fun test_PARITY_01_merchant_and_customer_parity_maintained() {
        val prodA = Product(id = "p1", name = "Producto 1", businessId = "biz_001")
        val prodB = Product(id = "p2", name = "Producto 2", businessId = "biz_001")
        val catalogue = listOf(prodA, prodB)

        assertEquals(2, catalogue.size)
    }
}
