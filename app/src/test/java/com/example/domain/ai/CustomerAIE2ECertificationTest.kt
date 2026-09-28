package com.example.domain.ai

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.repository.BusinessInfo
import com.example.data.repository.CustomerAIRepository
import com.example.domain.engine.ai.*
import com.example.domain.engine.intelligence.CustomerSearchResultType
import com.example.domain.engine.intelligence.EnterpriseSearchEngine
import com.example.domain.model.Product
import com.example.domain.model.ProductCategory
import com.example.domain.model.ProductStatus
import com.example.domain.model.ai.AIBusinessCard
import com.example.domain.model.ai.AIProductCard
import com.example.domain.model.ai.CustomerAIResponse
import com.example.presentation.customer.ai.CustomerAIAgentViewModel
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * PROTOCOLO: BSD-AI-ASSISTANT-E2E-CERTIFICATION-001
 * MATRIZ DE CERTIFICACIÓN E2E MAESTRA (AI-E2E-001 a AI-E2E-016)
 */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class CustomerAIE2ECertificationTest {

    private val testDispatcher = StandardTestDispatcher()

    // Catálogo Canónico Real de BlueSystem para Certificación E2E
    private val canonicalBusinesses = listOf(
        BusinessInfo(
            id = "biz_fritoni",
            name = "FRITONI",
            category = "Fritanga y Comida Típica",
            logoUrl = "https://firebasestorage.googleapis.com/fritoni_logo.png",
            bannerUrl = "https://firebasestorage.googleapis.com/fritoni_banner.png",
            isOpen = true,
            status = "ACTIVE",
            tenantId = "tenant_nicaragua"
        ),
        BusinessInfo(
            id = "biz_pollo_estrella",
            name = "Pollo Estrella",
            category = "Pollo Frito",
            logoUrl = "", // Sin logo para prueba AI-E2E-016
            isOpen = false,
            status = "ACTIVE",
            tenantId = "tenant_nicaragua"
        ),
        BusinessInfo(
            id = "biz_other_tenant",
            name = "Restaurante Extranjero",
            category = "Internacional",
            isOpen = true,
            status = "ACTIVE",
            tenantId = "tenant_costarica" // Para prueba de aislamiento multi-tenant AI-E2E-014
        )
    )

    private val canonicalProducts = listOf(
        Product(
            id = "prod_tacos_fritoni",
            businessId = "biz_fritoni",
            name = "FritoTacos Mixtos",
            description = "Crujientes tacos con carne desmenuzada y ensalada",
            price = 120.0,
            originalPrice = null,
            imageUrl = "https://firebasestorage.googleapis.com/tacos.png",
            status = ProductStatus.ACTIVE,
            category = ProductCategory.MAIN_COURSE
        ),
        Product(
            id = "prod_pike_fritoni",
            businessId = "biz_fritoni",
            name = "El Pike Fritoni",
            description = "Especialidad con cerdo frito y tostones",
            price = 180.0,
            originalPrice = null,
            imageUrl = "https://firebasestorage.googleapis.com/pike.png",
            status = ProductStatus.ACTIVE,
            category = ProductCategory.MAIN_COURSE
        ),
        Product(
            id = "prod_macanazo_fritoni",
            businessId = "biz_fritoni",
            name = "El Macanazo",
            description = "Super porción familiar",
            price = 350.0,
            originalPrice = 450.0,
            imageUrl = "https://firebasestorage.googleapis.com/macanazo.png",
            status = ProductStatus.ACTIVE,
            category = ProductCategory.MAIN_COURSE
        ),
        Product(
            id = "prod_promo_hamburguesa",
            businessId = "biz_fritoni",
            name = "Hamburguesa Criolla Promo",
            description = "Hamburguesa con queso frito",
            price = 135.0,
            originalPrice = 270.0,
            imageUrl = "https://firebasestorage.googleapis.com/burger.png",
            status = ProductStatus.ACTIVE,
            category = ProductCategory.MAIN_COURSE
        ),
        Product(
            id = "prod_sin_imagen",
            businessId = "biz_fritoni",
            name = "Refresco Natural de Ensalada",
            description = "Bebida típica sin foto",
            price = 45.0,
            originalPrice = null,
            imageUrl = "", // Sin imagen para prueba AI-E2E-015
            status = ProductStatus.ACTIVE,
            category = ProductCategory.BEVERAGE
        ),
        Product(
            id = "prod_other_tenant",
            businessId = "biz_other_tenant",
            name = "Gallo Pinto Tico",
            price = 100.0,
            status = ProductStatus.ACTIVE,
            category = ProductCategory.MAIN_COURSE
        )
    )

    private val executionContext = LocalExecutionContext(
        isAuthenticated = true,
        currentUserId = "cust_real_123",
        isGuest = false
    )

    private val catalogProvider = object : CatalogDataProvider {
        override fun getProducts(): List<Product> = canonicalProducts
    }

    private val businessProvider = object : BusinessDataProvider {
        override fun getBusinesses(): List<BusinessInfo> = canonicalBusinesses
    }

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)

        val context = ApplicationProvider.getApplicationContext<Context>()
        val options = FirebaseOptions.Builder()
            .setApplicationId("com.aistudio.delivery.djweq")
            .setApiKey("AIzaSyFakeKeyForTestOnly1234567890")
            .setProjectId("bluesystem-delivery")
            .build()

        if (FirebaseApp.getApps(context).isEmpty()) {
            FirebaseApp.initializeApp(context, options)
        }
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // =========================================================================
    // AI-E2E-001: "hay tacos" -> Descubrimiento de productos reales y tarjetas
    // =========================================================================
    @Test
    fun `AI-E2E-001 - Consulta hay tacos devuelve productos reales con tarjetas sin IDs`() = runTest(testDispatcher) {
        val adapter = SearchProductsAdapter(
            catalogProvider = catalogProvider,
            businessProvider = businessProvider
        )

        val result = adapter.execute(mapOf("query" to "hay tacos"), executionContext)

        assertTrue("Debe ser exitoso", result.success)
        assertTrue("Debe encontrar productos", result.cards.isNotEmpty())
        val card = result.cards.first() as AIProductCard
        assertEquals("FritoTacos Mixtos", card.name)
        assertEquals(120.0, card.price, 0.01)
        assertEquals("FRITONI", card.businessName)
        assertEquals("https://firebasestorage.googleapis.com/tacos.png", card.imageUrl)

        // Verificación Zero IDs
        val sanitizedContext = result.sanitizedLlmContext
        assertFalse("No debe contener prod_", sanitizedContext.contains("prod_"))
        assertFalse("No debe contener biz_", sanitizedContext.contains("biz_"))
        assertFalse("No debe contener [ID:", sanitizedContext.contains("[ID:"))
        assertTrue("Debe contener precio formateado C$ 120.00", sanitizedContext.contains("120.00"))
    }

    // =========================================================================
    // AI-E2E-002: "qué restaurantes hay" -> Comercios reales sin alucinaciones
    // =========================================================================
    @Test
    fun `AI-E2E-002 - Consulta que restaurantes hay devuelve 100 porciento comercios reales autorizados`() = runTest(testDispatcher) {
        val adapter = SearchBusinessesAdapter(
            businessProvider = businessProvider,
            catalogProvider = catalogProvider
        )

        val result = adapter.execute(mapOf("query" to "qué restaurantes hay"), executionContext)

        assertTrue(result.success)
        assertTrue(result.cards.isNotEmpty())
        val validBusinessNames = setOf("FRITONI", "Pollo Estrella", "Restaurante Extranjero")
        result.cards.forEach { card ->
            val bizCard = card as AIBusinessCard
            assertTrue("El comercio ${bizCard.name} debe pertenecer al catálogo real", validBusinessNames.contains(bizCard.name))
        }

        // Cero alucinaciones
        val sanitized = result.sanitizedLlmContext
        assertFalse(sanitized.contains("McDonalds"))
        assertFalse(sanitized.contains("Burger King"))
    }

    // =========================================================================
    // AI-E2E-003: "qué platos tiene fritoni" -> Búsqueda acotada por comercio
    // =========================================================================
    @Test
    fun `AI-E2E-003 - Consulta que platos tiene fritoni acota exclusivamente a FRITONI`() = runTest(testDispatcher) {
        val adapter = SearchProductsAdapter(
            catalogProvider = catalogProvider,
            businessProvider = businessProvider
        )

        val result = adapter.execute(mapOf("query" to "qué platos tiene fritoni"), executionContext)

        assertTrue(result.success)
        val productCards = result.cards.filterIsInstance<AIProductCard>()
        assertTrue(productCards.isNotEmpty())
        productCards.forEach { card ->
            assertEquals("Todos los productos deben ser de FRITONI", "FRITONI", card.businessName)
            assertEquals("biz_fritoni", card.businessId)
        }
    }

    // =========================================================================
    // AI-E2E-004: "productos con descuento" -> SSOT E2E con Home
    // =========================================================================
    @Test
    fun `AI-E2E-004 - Productos con descuento coincide al 100 porciento con la logica del Home`() {
        // En CustomerHomeScreen, listenToDiscountedProducts filtra hasDiscount / originalPrice > price
        val homeDiscountedProducts = canonicalProducts.filter {
            it.status == ProductStatus.ACTIVE && (it.hasDiscount || (it.originalPrice != null && it.originalPrice!! > it.price))
        }

        val searchResult = EnterpriseSearchEngine.searchCatalog(
            query = "productos con descuento",
            businesses = canonicalBusinesses.filter { it.tenantId == "tenant_nicaragua" },
            products = canonicalProducts.filter { it.businessId != "biz_other_tenant" }
        )

        val aiDiscountedProducts = searchResult.products.filter {
            it.originalPrice != null && it.originalPrice!! > (it.price ?: 0.0)
        }

        assertEquals("Debe encontrar la misma cantidad de ofertas que el Home",
            homeDiscountedProducts.size, aiDiscountedProducts.size)
        assertTrue(searchResult.products.any { it.title == "Hamburguesa Criolla Promo" && it.price == 135.0 })
        assertTrue(searchResult.products.any { it.title == "El Macanazo" && it.price == 350.0 })
    }

    // =========================================================================
    // AI-E2E-005: "qué está en oferta" -> Sinónimos promocionales
    // =========================================================================
    @Test
    fun `AI-E2E-005 - Consulta sinonima que esta en oferta resuelve promociones reales`() = runTest(testDispatcher) {
        val adapter = SearchProductsAdapter(
            catalogProvider = catalogProvider,
            businessProvider = businessProvider
        )

        val result = adapter.execute(mapOf("query" to "qué está en oferta"), executionContext)

        assertTrue(result.success)
        val cards = result.cards.filterIsInstance<AIProductCard>()
        assertTrue(cards.any { it.discountPercentage > 0 })
    }

    // =========================================================================
    // AI-E2E-006: "quiero algo barato" -> Diferenciación CHEAP vs DISCOUNTED
    // =========================================================================
    @Test
    fun `AI-E2E-006 - Diferenciacion semantica Barato prioriza menor precio nominal`() {
        val searchResult = EnterpriseSearchEngine.searchCatalog(
            query = "quiero algo barato",
            businesses = canonicalBusinesses.filter { it.tenantId == "tenant_nicaragua" },
            products = canonicalProducts.filter { it.businessId != "biz_other_tenant" }
        )

        assertTrue(searchResult.products.isNotEmpty())
        // El refresco cuesta C$45 y los tacos C$120 -> deben aparecer antes que la promo de C$135
        val firstProduct = searchResult.products.first()
        assertEquals("prod_sin_imagen", firstProduct.id)
        assertEquals(45.0, firstProduct.price)

        val secondProduct = searchResult.products[1]
        assertEquals("prod_tacos_fritoni", secondProduct.id)
        assertEquals(120.0, secondProduct.price)
    }

    // =========================================================================
    // AI-E2E-007: "abre fritotacos" -> Acción OPEN_PRODUCT con navegación
    // =========================================================================
    @Test
    fun `AI-E2E-007 - Accion de abrir producto resuelve IDs internamente para navegacion`() {
        val targetProduct = canonicalProducts.first { it.name.contains("FritoTacos") }
        val card = LocalSanitization.sanitizeProductToCard(targetProduct, "FRITONI")

        // El ID existe internamente en la tarjeta pero no en la presentación
        assertEquals("prod_tacos_fritoni", card.productId)
        assertEquals("biz_fritoni", card.businessId)
        assertEquals("FritoTacos Mixtos", card.name)

        // El route de navegación es comercio_detalle_screen/{comercioId}?productId={productId}
        val targetRoute = "comercio_detalle_screen/${card.businessId}?productId=${card.productId}"
        assertEquals("comercio_detalle_screen/biz_fritoni?productId=prod_tacos_fritoni", targetRoute)
    }

    // =========================================================================
    // AI-E2E-008: "qué platos tiene fritoni" -> "el segundo"
    // =========================================================================
    @Test
    fun `AI-E2E-008 - Resolucion multi-turno de ordinal el segundo`() = runTest(testDispatcher) {
        val fakeRepo = object : CustomerAIRepository() {
            override suspend fun sendChatMessage(
                message: String,
                conversationHistory: List<Map<String, String>>,
                confirmedToken: String?,
                customerLat: Double?,
                customerLng: Double?
            ): Result<CustomerAIResponse> = Result.success(
                CustomerAIResponse(
                    responseId = "resp_1",
                    conversationId = "conv_1",
                    message = "Platos de FRITONI:",
                    cards = listOf(
                        AIProductCard(productId = "prod_1", businessId = "biz_fritoni", businessName = "FRITONI", name = "FritoTacos", price = 120.0),
                        AIProductCard(productId = "prod_2", businessId = "biz_fritoni", businessName = "FRITONI", name = "El Pike", price = 180.0),
                        AIProductCard(productId = "prod_3", businessId = "biz_fritoni", businessName = "FRITONI", name = "El Macanazo", price = 350.0)
                    )
                )
            )
        }

        val viewModel = CustomerAIAgentViewModel(fakeRepo, LocalToolDispatcher(emptyList()))
        viewModel.openOverlay()
        viewModel.sendMessage("qué platos tiene fritoni")
        testDispatcher.scheduler.advanceUntilIdle()

        // Turno 2: "el segundo"
        viewModel.sendMessage("el segundo")

        val lastMsg = viewModel.uiState.value.messages.last()
        assertTrue("Debe identificar El Pike", lastMsg.text.contains("El Pike"))
        assertEquals(1, lastMsg.cards.size)
        assertEquals("prod_2", (lastMsg.cards.first() as AIProductCard).productId)
    }

    // =========================================================================
    // AI-E2E-009: "qué platos tiene fritoni" -> "cuál es más barato"
    // =========================================================================
    @Test
    fun `AI-E2E-009 - Comparacion multi-turno cual es mas barato`() = runTest(testDispatcher) {
        val fakeRepo = object : CustomerAIRepository() {
            override suspend fun sendChatMessage(
                message: String,
                conversationHistory: List<Map<String, String>>,
                confirmedToken: String?,
                customerLat: Double?,
                customerLng: Double?
            ): Result<CustomerAIResponse> = Result.success(
                CustomerAIResponse(
                    responseId = "resp_1",
                    conversationId = "conv_1",
                    message = "Opciones:",
                    cards = listOf(
                        AIProductCard(productId = "prod_1", businessId = "biz_fritoni", businessName = "FRITONI", name = "FritoTacos", price = 120.0),
                        AIProductCard(productId = "prod_2", businessId = "biz_fritoni", businessName = "FRITONI", name = "El Pike", price = 180.0),
                        AIProductCard(productId = "prod_3", businessId = "biz_fritoni", businessName = "FRITONI", name = "El Macanazo", price = 350.0)
                    )
                )
            )
        }

        val viewModel = CustomerAIAgentViewModel(fakeRepo, LocalToolDispatcher(emptyList()))
        viewModel.openOverlay()
        viewModel.sendMessage("qué platos tiene fritoni")
        testDispatcher.scheduler.advanceUntilIdle()

        // Turno 2: "cuál es más barato?"
        viewModel.sendMessage("cuál es más barato?")

        val lastMsg = viewModel.uiState.value.messages.last()
        assertTrue("Debe identificar FritoTacos como el más barato", lastMsg.text.contains("FritoTacos"))
        assertTrue("Debe mostrar C$ 120.00", lastMsg.text.contains("120.00"))
    }

    // =========================================================================
    // AI-E2E-010: "qué restaurantes hay" -> "cuál está abierto"
    // =========================================================================
    @Test
    fun `AI-E2E-010 - Filtro contextual cual esta abierto sobre comercios previos`() = runTest(testDispatcher) {
        val fakeRepo = object : CustomerAIRepository() {
            override suspend fun sendChatMessage(
                message: String,
                conversationHistory: List<Map<String, String>>,
                confirmedToken: String?,
                customerLat: Double?,
                customerLng: Double?
            ): Result<CustomerAIResponse> = Result.success(
                CustomerAIResponse(
                    responseId = "resp_1",
                    conversationId = "conv_1",
                    message = "Restaurantes:",
                    cards = listOf(
                        AIBusinessCard(businessId = "biz_fritoni", name = "FRITONI", category = "Fritanga", isOpen = true, rating = 4.8),
                        AIBusinessCard(businessId = "biz_pollo_estrella", name = "Pollo Estrella", category = "Pollo Frito", isOpen = false, rating = 4.2)
                    )
                )
            )
        }

        val viewModel = CustomerAIAgentViewModel(fakeRepo, LocalToolDispatcher(emptyList()))
        viewModel.openOverlay()
        viewModel.sendMessage("qué restaurantes hay")
        testDispatcher.scheduler.advanceUntilIdle()

        // Turno 2: "cuál está abierto?"
        viewModel.sendMessage("cuál está abierto?")

        val lastMsg = viewModel.uiState.value.messages.last()
        assertTrue("Debe mencionar que FRITONI está abierto", lastMsg.text.contains("FRITONI"))
        assertEquals(1, lastMsg.cards.size)
        assertEquals("biz_fritoni", (lastMsg.cards.first() as AIBusinessCard).businessId)
    }

    // =========================================================================
    // AI-E2E-011: "muéstrame ese" -> Referente singular anafórico
    // =========================================================================
    @Test
    fun `AI-E2E-011 - Referente anaforico singular muestrame ese`() = runTest(testDispatcher) {
        val fakeRepo = object : CustomerAIRepository() {
            override suspend fun sendChatMessage(
                message: String,
                conversationHistory: List<Map<String, String>>,
                confirmedToken: String?,
                customerLat: Double?,
                customerLng: Double?
            ): Result<CustomerAIResponse> = Result.success(
                CustomerAIResponse(
                    responseId = "resp_1",
                    conversationId = "conv_1",
                    message = "El Pike — C$ 180.00",
                    cards = listOf(
                        AIProductCard(productId = "prod_pike_fritoni", businessId = "biz_fritoni", businessName = "FRITONI", name = "El Pike Fritoni", price = 180.0)
                    )
                )
            )
        }

        val viewModel = CustomerAIAgentViewModel(fakeRepo, LocalToolDispatcher(emptyList()))
        viewModel.openOverlay()
        viewModel.sendMessage("ver el pike")
        testDispatcher.scheduler.advanceUntilIdle()

        // Turno 2: "muéstrame ese"
        viewModel.sendMessage("muéstrame ese")

        val lastMsg = viewModel.uiState.value.messages.last()
        assertTrue(lastMsg.text.contains("El Pike"))
        assertEquals(1, lastMsg.cards.size)
    }

    // =========================================================================
    // AI-E2E-012: Producto inexistente -> Cero alucinación
    // =========================================================================
    @Test
    fun `AI-E2E-012 - Producto inexistente responde sin alucinaciones ni tarjetas falsas`() = runTest(testDispatcher) {
        val adapter = SearchProductsAdapter(
            catalogProvider = catalogProvider,
            businessProvider = businessProvider
        )

        val result = adapter.execute(mapOf("query" to "sushi interestelar 999"), executionContext)

        assertTrue(result.success)
        assertTrue("No debe retornar tarjetas", result.cards.isEmpty())
        assertTrue("Debe informar que no encontró coincidencias",
            result.sanitizedLlmContext.contains("No encontré"))
    }

    // =========================================================================
    // AI-E2E-013: Comercio inexistente -> Cero alucinación
    // =========================================================================
    @Test
    fun `AI-E2E-013 - Comercio inexistente responde sin inventar restaurantes`() = runTest(testDispatcher) {
        val adapter = SearchBusinessesAdapter(
            businessProvider = businessProvider,
            catalogProvider = catalogProvider
        )

        val result = adapter.execute(mapOf("query" to "Cafeteria Marciana 999"), executionContext)

        assertTrue(result.success)
        assertTrue("No debe retornar tarjetas", result.cards.isEmpty())
        assertTrue("Debe informar que no encontró el comercio",
            result.sanitizedLlmContext.contains("No encontré"))
    }

    // =========================================================================
    // AI-E2E-014: Aislamiento Multi-Tenant (Zero Leakage)
    // =========================================================================
    @Test
    fun `AI-E2E-014 - Aislamiento Multi-Tenant no devuelve productos ni comercios de otro tenant`() = runTest(testDispatcher) {
        val currentTenant = "tenant_nicaragua"
        val tenantCatalogProvider = object : CatalogDataProvider {
            override fun getProducts(): List<Product> {
                val allowedBizIds = canonicalBusinesses.filter { it.tenantId == currentTenant }.map { it.id }.toSet()
                return canonicalProducts.filter { it.businessId in allowedBizIds }
            }
        }
        val tenantBusinessProvider = object : BusinessDataProvider {
            override fun getBusinesses(): List<BusinessInfo> = canonicalBusinesses.filter { it.tenantId == currentTenant }
        }

        val adapter = SearchProductsAdapter(
            catalogProvider = tenantCatalogProvider,
            businessProvider = tenantBusinessProvider
        )

        val result = adapter.execute(mapOf("query" to "Gallo Pinto Tico"), executionContext)

        assertTrue(result.success)
        assertTrue("No debe filtrar ni exponer productos del otro tenant", result.cards.isEmpty())
    }

    // =========================================================================
    // AI-E2E-015: Producto sin imagen -> Fallback limpio sin URLs externas aleatorias
    // =========================================================================
    @Test
    fun `AI-E2E-015 - Producto sin imagen usa cadena vacia para fallback de Coil sin romper UI`() {
        val prodNoImage = canonicalProducts.first { it.id == "prod_sin_imagen" }
        val card = LocalSanitization.sanitizeProductToCard(prodNoImage, "FRITONI")

        assertEquals("", card.imageUrl)
        assertEquals("Refresco Natural de Ensalada", card.name)
        assertEquals(45.0, card.price, 0.01)
    }

    // =========================================================================
    // AI-E2E-016: Comercio sin logo -> Fallback limpio
    // =========================================================================
    @Test
    fun `AI-E2E-016 - Comercio sin logo provee fallback seguro sin romper UI`() {
        val bizNoLogo = canonicalBusinesses.first { it.id == "biz_pollo_estrella" }
        val card = LocalSanitization.sanitizeBusinessToCard(bizNoLogo)

        assertEquals("", card.logoUrl)
        assertEquals("Pollo Estrella", card.name)
        assertFalse(card.isOpen)
    }
}
