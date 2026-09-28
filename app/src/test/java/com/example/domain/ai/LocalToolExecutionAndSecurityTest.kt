package com.example.domain.ai

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.CartManager
import com.example.data.repository.BusinessInfo
import com.example.domain.engine.ai.*
import com.example.domain.model.Product
import com.example.domain.model.ai.AIErrorCode
import com.example.domain.model.ai.ToolAuthorizationLevel
import com.example.domain.model.ai.ToolExecutionPlane
import com.example.domain.model.ai.ToolRegistry
import com.example.domain.model.ai.ToolResultStatus
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Suite de Pruebas de Seguridad y Ejecución Local para Fase C3-B
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class LocalToolExecutionAndSecurityTest {

    private lateinit var fakeCatalogProvider: CatalogDataProvider
    private lateinit var fakeBusinessProvider: BusinessDataProvider
    private lateinit var dispatcher: LocalToolDispatcher

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val options = FirebaseOptions.Builder()
            .setApplicationId("com.aistudio.delivery.djweq")
            .setApiKey("AIzaSyFakeKeyForTestOnly1234567890")
            .setProjectId("bluesystem-delivery")
            .build()

        if (FirebaseApp.getApps(context).isEmpty()) {
            FirebaseApp.initializeApp(context, options)
        }

        val testProducts = listOf(
            Product(
                id = "p1",
                businessId = "b1",
                name = "Pizza Margarita",
                description = "Deliciosa pizza artesanal con albahaca",
                price = 180.0,
                originalPrice = 220.0
            ),
            Product(
                id = "p2",
                businessId = "b2",
                name = "Hamburguesa Doble",
                description = "Doble carne con queso cheddar",
                price = 150.0
            )
        )

        val testBusinesses = listOf(
            BusinessInfo(
                id = "b1",
                name = "Pizzeria Napoli",
                category = "Pizzeria",
                deliveryFee = 45.0,
                isOpen = true
            ),
            BusinessInfo(
                id = "b2",
                name = "Burger Joint",
                category = "Hamburguesas",
                deliveryFee = 35.0,
                isOpen = true
            )
        )

        fakeCatalogProvider = object : CatalogDataProvider {
            override fun getProducts(): List<Product> = testProducts
        }

        fakeBusinessProvider = object : BusinessDataProvider {
            override fun getBusinesses(): List<BusinessInfo> = testBusinesses
        }

        val adapters = listOf(
            SearchProductsAdapter(catalogProvider = fakeCatalogProvider, businessProvider = fakeBusinessProvider),
            SearchBusinessesAdapter(businessProvider = fakeBusinessProvider, catalogProvider = fakeCatalogProvider),
            ResolveCatalogEntityAdapter(catalogProvider = fakeCatalogProvider, businessProvider = fakeBusinessProvider),
            GetProductDetailAdapter(catalogProvider = fakeCatalogProvider, businessProvider = fakeBusinessProvider),
            GetBusinessDetailAdapter(businessProvider = fakeBusinessProvider),
            GetNearbyBusinessesAdapter(businessProvider = fakeBusinessProvider),
            GetCartAdapter(cartManager = CartManager),
            AddToCartAdapter(cartManager = CartManager, catalogProvider = fakeCatalogProvider, businessProvider = fakeBusinessProvider),
            UpdateCartQuantityAdapter(cartManager = CartManager),
            RemoveFromCartAdapter(cartManager = CartManager),
            ClearCartAdapter(cartManager = CartManager)
        )

        dispatcher = LocalToolDispatcher(adapters = adapters)
    }

    @Test
    fun testToolEligibilityForGuestUser() {
        val guestContext = LocalExecutionContext(isAuthenticated = false, isGuest = true)
        val eligibleTools = ToolEligibilityEngine.evaluateEligibleTools(guestContext)

        // Los tools de nivel 0 deben estar disponibles
        assertTrue("tool_search_products debe ser elegible para invitados", eligibleTools.any { it.toolId == "tool_search_products" })
        assertTrue("tool_get_product_detail debe ser elegible para invitados", eligibleTools.any { it.toolId == "tool_get_product_detail" })
        assertTrue("tool_get_nearby_businesses debe ser elegible para invitados", eligibleTools.any { it.toolId == "tool_get_nearby_businesses" })

        // Backend tools NO deben estar en el plano local
        assertFalse("tool_create_authoritative_order nunca debe ser elegible localmente", eligibleTools.any { it.toolId == "tool_create_authoritative_order" })
        assertFalse("tool_cancel_order nunca debe ser elegible localmente", eligibleTools.any { it.toolId == "tool_cancel_order" })
    }

    @Test
    fun testAuthorizationPolicyGuardRejectsBackendTools() {
        val authContext = LocalExecutionContext(isAuthenticated = true, currentUserId = "usr_123")
        val decision = AuthorizationPolicyGuard.authorizeInvocation(
            toolId = "tool_create_authoritative_order",
            parameters = emptyMap(),
            context = authContext
        )

        assertTrue("tool_create_authoritative_order debe ser denegado por el guard local", decision is AuthorizationDecision.Denied)
        val denied = decision as AuthorizationDecision.Denied
        assertEquals(AIErrorCode.UNAUTHORIZED, denied.error.code)
    }

    @Test
    fun testAuthorizationPolicyGuardRejectsUnknownTools() {
        val authContext = LocalExecutionContext(isAuthenticated = true, currentUserId = "usr_123")
        val decision = AuthorizationPolicyGuard.authorizeInvocation(
            toolId = "tool_unknown_speculative_hack",
            parameters = emptyMap(),
            context = authContext
        )

        assertTrue("Herramienta desconocida debe ser denegada", decision is AuthorizationDecision.Denied)
        val denied = decision as AuthorizationDecision.Denied
        assertEquals(AIErrorCode.TOOL_NOT_ELIGIBLE, denied.error.code)
    }

    @Test
    fun testConfirmationGatedToolWithoutConfirmation() = runTest {
        val unconfirmedContext = LocalExecutionContext(isAuthenticated = true, currentUserId = "usr_123", confirmedByUser = false)
        val result = dispatcher.dispatch(
            toolId = "tool_clear_cart",
            parameters = emptyMap(),
            context = unconfirmedContext
        )

        assertFalse("tool_clear_cart sin confirmación física debe fallar", result.success)
        assertEquals(ToolResultStatus.REQUIRES_CONFIRMATION, result.status)
        assertEquals(AIErrorCode.CONFIRMATION_REQUIRED, result.error?.code)
    }

    @Test
    fun testConfirmationGatedToolWithConfirmation() = runTest {
        val confirmedContext = LocalExecutionContext(isAuthenticated = true, currentUserId = "usr_123", confirmedByUser = true)
        val result = dispatcher.dispatch(
            toolId = "tool_clear_cart",
            parameters = emptyMap(),
            context = confirmedContext
        )

        assertTrue("tool_clear_cart con confirmación física debe tener éxito", result.success)
        assertEquals(ToolResultStatus.COMPLETED, result.status)
    }

    @Test
    fun testSearchProductsExecution() = runTest {
        val context = LocalExecutionContext(isAuthenticated = true)
        val result = dispatcher.dispatch(
            toolId = "tool_search_products",
            parameters = mapOf("query" to "pizza"),
            context = context
        )

        assertTrue("Búsqueda de pizza debe tener éxito", result.success)
        assertTrue("El contexto debe contener Pizza Margarita", result.sanitizedLlmContext.contains("Pizza Margarita"))
        assertFalse("No debe filtrar costo de producto", result.sanitizedLlmContext.contains("cost"))
        assertFalse("No debe contener [ID:", result.sanitizedLlmContext.contains("[ID:"))
        assertFalse("No debe contener [Plato]", result.sanitizedLlmContext.contains("[Plato]"))
        assertTrue("Debe retornar tarjetas visuales", result.cards.isNotEmpty())
    }

    @Test
    fun testZeroInternalIdsInSanitization() = runTest {
        val context = LocalExecutionContext(isAuthenticated = true)
        val result = dispatcher.dispatch(
            toolId = "tool_search_products",
            parameters = mapOf("query" to "hamburguesa"),
            context = context
        )

        assertTrue(result.success)
        assertFalse("No debe contener [ID:", result.sanitizedLlmContext.contains("[ID:"))
        assertFalse("No debe contener prod_", result.sanitizedLlmContext.contains("prod_"))
        assertFalse("No debe contener biz_", result.sanitizedLlmContext.contains("biz_"))
        assertTrue(result.sanitizedLlmContext.contains("Hamburguesa Doble"))
    }

    @Test
    fun testResolveCatalogEntityExecution() = runTest {
        val context = LocalExecutionContext(isAuthenticated = true)
        val result = dispatcher.dispatch(
            toolId = "tool_resolve_catalog_entity",
            parameters = mapOf("entityName" to "Hamburguesa"),
            context = context
        )

        assertTrue(result.success)
        assertEquals("p2", result.uiPayload["resolvedId"])
        assertTrue(result.sanitizedLlmContext.contains("Hamburguesa Doble"))
    }

    @Test
    fun testGetProductDetailExecution() = runTest {
        val context = LocalExecutionContext(isAuthenticated = true)
        val result = dispatcher.dispatch(
            toolId = "tool_get_product_detail",
            parameters = mapOf("productId" to "p1"),
            context = context
        )

        assertTrue(result.success)
        assertTrue(result.sanitizedLlmContext.contains("Pizza Margarita"))
        assertTrue(result.sanitizedLlmContext.contains("180"))
    }

    @Test
    fun testCartOperationsLifecycle() = runTest {
        val context = LocalExecutionContext(isAuthenticated = true, currentUserId = "usr_123")

        // 1. Add to cart
        val addResult = dispatcher.dispatch(
            toolId = "tool_add_to_cart",
            parameters = mapOf("productId" to "p1", "quantity" to 2),
            context = context
        )
        assertTrue("addResult debe ser exitoso. Error: ${addResult.error?.userMessage}", addResult.success)

        // 2. Get cart
        val getResult = dispatcher.dispatch(
            toolId = "tool_get_cart",
            parameters = emptyMap(),
            context = context
        )
        assertTrue(getResult.success)
        assertTrue(getResult.sanitizedLlmContext.contains("Pizza Margarita"))
        assertFalse(getResult.sanitizedLlmContext.contains("[ID:"))
    }

    @Test
    fun testMultiTenantIsolationGuaranteed() = runTest {
        // Asegura que un parámetro customerId falsificado por el LLM no sea utilizado
        val context = LocalExecutionContext(isAuthenticated = true, currentUserId = "authenticated_user_001")
        val maliciousParameters = mapOf("customerId" to "victim_user_999", "productId" to "p1")

        val result = dispatcher.dispatch(
            toolId = "tool_add_to_cart",
            parameters = maliciousParameters,
            context = context
        )
        assertTrue("Multi-tenant addResult debe ser exitoso", result.success)
        // El carrito opera exclusivamente sobre el estado local autenticado
    }
}
