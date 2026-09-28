package com.example.presentation.customer.ai

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.CartManager
import com.example.data.repository.CustomerAIRepository
import com.example.domain.engine.ai.*
import com.example.domain.model.ai.*
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Suite de Pruebas Unitarias y de Seguridad para Phase C3-E:
 * CustomerAIAgentViewModel + Confirmation Gate + Local Dispatcher
 */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class CustomerAIAgentViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var fakeRepository: FakeCustomerAIRepository
    private lateinit var mockLocalDispatcher: LocalToolDispatcher

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

        fakeRepository = FakeCustomerAIRepository()

        // Usar adaptador GetCartAdapter del ecosistema certificado
        val cartAdapter = GetCartAdapter(CartManager)
        mockLocalDispatcher = LocalToolDispatcher(listOf(cartAdapter))
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `Estado Inicial - El overlay debe iniciar cerrado con estado limpio`() {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        val state = viewModel.uiState.value
        assertFalse(state.isOverlayVisible)
        assertFalse(state.isThinking)
        assertTrue(state.messages.isEmpty())
        assertNull(state.pendingConfirmation)
        assertNull(state.errorMessage)
    }

    @Test
    fun `Apertura de Overlay - Debe inicializar con mensaje de bienvenida`() {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        viewModel.openOverlay()
        val state = viewModel.uiState.value

        assertTrue(state.isOverlayVisible)
        assertEquals(1, state.messages.size)
        assertEquals(MessageSender.ASSISTANT, state.messages.first().sender)
    }

    @Test
    fun `Envio de Mensaje - Debe transicionar a thinking y registrar mensaje del usuario`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        fakeRepository.nextResponse = Result.success(
            CustomerAIResponse(
                responseId = "resp_1",
                conversationId = "conv_1",
                message = "Respuesta del asistente AI"
            )
        )

        viewModel.openOverlay()
        viewModel.sendMessage("Consultar menú")

        // Antes de que avance la coroutine
        assertTrue(viewModel.uiState.value.isThinking)
        assertEquals(2, viewModel.uiState.value.messages.size) // Bienvenida + Mensaje Usuario
        assertEquals("Consultar menú", viewModel.uiState.value.messages.last().text)

        testDispatcher.scheduler.advanceUntilIdle()

        // Posterior a la respuesta del repositorio
        assertFalse(viewModel.uiState.value.isThinking)
        assertEquals(3, viewModel.uiState.value.messages.size) // + Respuesta Asistente
        assertEquals("Respuesta del asistente AI", viewModel.uiState.value.messages.last().text)
    }

    @Test
    fun `Saludo Directo y Personalizado - Responde de inmediato con nombre registrado y emojis`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )
        viewModel.setCustomerName("Gerald Morales")

        viewModel.openOverlay()
        viewModel.sendMessage("Hola")

        // Inmediato sin thinking de red
        assertFalse(viewModel.uiState.value.isThinking)
        assertEquals(3, viewModel.uiState.value.messages.size) // Bienvenida + Hola + Saludo personalizado
        val lastMsg = viewModel.uiState.value.messages.last()
        assertEquals(MessageSender.ASSISTANT, lastMsg.sender)
        assertTrue(lastMsg.text.contains("Gerald"))
        assertTrue(lastMsg.text.contains("👋"))
        assertTrue(lastMsg.text.contains("🛵"))
    }

    @Test
    fun `Proteccion contra Envio Duplicado - Ignora mensajes concurrentes mientras isThinking es true`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        viewModel.openOverlay()
        viewModel.sendMessage("Primer mensaje")

        // Enviar segundo mensaje inmediatamente sin avanzar dispatcher
        viewModel.sendMessage("Segundo mensaje duplicado")

        // Solo debe haber registrado el primer mensaje
        val userMessages = viewModel.uiState.value.messages.filter { it.sender == MessageSender.USER }
        assertEquals(1, userMessages.size)
        assertEquals("Primer mensaje", userMessages.first().text)

        testDispatcher.scheduler.advanceUntilIdle()
    }

    @Test
    fun `Confirmation Gate - Detecta Level 4 Order Creation y activa PendingConfirmation`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        val pending = PendingConfirmation(
            confirmationNonce = "nonce_12345.sig_abcde",
            actionType = AIActionType.REQUEST_ORDER_CONFIRMATION,
            summaryText = "Crear pedido en Pizzeria Napoli por C$250",
            financialBreakdown = FinancialBreakdown(
                subtotal = 200.0,
                deliveryFee = 50.0,
                total = 250.0
            )
        )

        fakeRepository.nextResponse = Result.success(
            CustomerAIResponse(
                responseId = "resp_order",
                conversationId = "conv_order",
                message = "Voy a crear tu pedido por C$250.",
                confirmationRequired = true,
                pendingConfirmation = pending
            )
        )

        viewModel.openOverlay()
        viewModel.sendMessage("Quiero ordenar pizza")

        testDispatcher.scheduler.advanceUntilIdle()

        assertNotNull(viewModel.uiState.value.pendingConfirmation)
        assertEquals("nonce_12345.sig_abcde", viewModel.uiState.value.pendingConfirmation?.confirmationNonce)
        assertEquals(250.0, viewModel.uiState.value.pendingConfirmation?.financialBreakdown?.total ?: 0.0, 0.01)
    }

    @Test
    fun `Confirmacion Humana - Usuario cancela operacion en modal`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        val pending = PendingConfirmation(
            confirmationNonce = "nonce_cancel.sig_123",
            actionType = AIActionType.REQUEST_CANCEL_CONFIRMATION,
            summaryText = "Cancelar pedido #1234"
        )

        fakeRepository.nextResponse = Result.success(
            CustomerAIResponse(
                responseId = "resp_c",
                conversationId = "conv_c",
                message = "¿Deseas cancelar el pedido?",
                confirmationRequired = true,
                pendingConfirmation = pending
            )
        )

        viewModel.sendMessage("Cancela mi pedido")
        testDispatcher.scheduler.advanceUntilIdle()

        assertNotNull(viewModel.uiState.value.pendingConfirmation)

        // Usuario presiona "Cancelar"
        viewModel.confirmAction(confirmed = false)

        assertNull(viewModel.uiState.value.pendingConfirmation)
        assertTrue(viewModel.uiState.value.messages.last().text.contains("Acción cancelada por el usuario"))
    }

    @Test
    fun `Confirmacion Humana - Usuario aprueba operacion y envia token al backend`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        val pending = PendingConfirmation(
            confirmationNonce = "nonce_valid_hmac_sha256",
            actionType = AIActionType.REQUEST_ORDER_CONFIRMATION,
            summaryText = "Crear pedido autoritativo"
        )

        fakeRepository.nextResponse = Result.success(
            CustomerAIResponse(
                responseId = "resp_ord",
                conversationId = "conv_ord",
                message = "Confirmación requerida",
                pendingConfirmation = pending
            )
        )

        viewModel.sendMessage("Crear pedido")
        testDispatcher.scheduler.advanceUntilIdle()

        // Siguiente respuesta tras enviar la confirmación
        fakeRepository.nextResponse = Result.success(
            CustomerAIResponse(
                responseId = "resp_success",
                conversationId = "conv_ord",
                message = "¡Pedido #ORD-999 creado exitosamente en backend!"
            )
        )

        viewModel.confirmAction(confirmed = true)
        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(viewModel.uiState.value.pendingConfirmation)
        assertEquals("nonce_valid_hmac_sha256", fakeRepository.lastConfirmedTokenSent)
        assertTrue(viewModel.uiState.value.messages.last().text.contains("creado exitosamente"))
    }

    @Test
    fun `Manejo de Errores - Normaliza fallos del gateway sin exponer stack traces`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        fakeRepository.nextResponse = Result.failure(RuntimeException("Rate limit exceeded"))

        viewModel.openOverlay()
        viewModel.sendMessage("Consulta")

        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(viewModel.uiState.value.isThinking)
        assertTrue(viewModel.uiState.value.messages.last().isError)
        assertEquals("Lo siento, ocurrió un problema temporal. Por favor intenta de nuevo.", viewModel.uiState.value.messages.last().text)
    }

    @Test
    fun `Reinicio de Conversacion - Limpia mensajes y estado pendiente`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        viewModel.openOverlay()
        viewModel.clearConversation()

        val state = viewModel.uiState.value
        assertEquals(1, state.messages.size)
        assertTrue(state.messages.first().text.contains("Conversación reiniciada"))
        assertNull(state.pendingConfirmation)
    }

    @Test
    fun `Contextual - El segundo resuelve la tarjeta ordinalmente y abre opciones`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        val productCards = listOf(
            AIProductCard(productId = "p1", businessId = "b1", businessName = "FRITONI", name = "FritoTacos", price = 200.0),
            AIProductCard(productId = "p2", businessId = "b1", businessName = "FRITONI", name = "El Pike", price = 180.0),
            AIProductCard(productId = "p3", businessId = "b1", businessName = "FRITONI", name = "Macanazo", price = 300.0)
        )

        fakeRepository.nextResponse = Result.success(
            CustomerAIResponse(
                responseId = "resp_menu",
                conversationId = "conv_1",
                message = "Estos son los platos disponibles en FRITONI:",
                cards = productCards
            )
        )

        viewModel.openOverlay()
        viewModel.sendMessage("¿Qué platos tiene Fritoni?")
        testDispatcher.scheduler.advanceUntilIdle()

        // Usuario pregunta: "el segundo"
        viewModel.sendMessage("el segundo")

        val lastMsg = viewModel.uiState.value.messages.last()
        assertTrue("Debe identificar El Pike", lastMsg.text.contains("El Pike"))
        assertEquals(1, lastMsg.cards.size)
        assertEquals("p2", (lastMsg.cards.first() as AIProductCard).productId)
    }

    @Test
    fun `Contextual - Cual es mas barato compara precios de las tarjetas anteriores`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        val productCards = listOf(
            AIProductCard(productId = "p1", businessId = "b1", businessName = "FRITONI", name = "FritoTacos", price = 200.0),
            AIProductCard(productId = "p2", businessId = "b1", businessName = "FRITONI", name = "El Pike", price = 180.0),
            AIProductCard(productId = "p3", businessId = "b1", businessName = "FRITONI", name = "Macanazo", price = 300.0)
        )

        fakeRepository.nextResponse = Result.success(
            CustomerAIResponse(
                responseId = "resp_menu",
                conversationId = "conv_1",
                message = "Estos son los platos disponibles en FRITONI:",
                cards = productCards
            )
        )

        viewModel.openOverlay()
        viewModel.sendMessage("¿Qué platos tiene Fritoni?")
        testDispatcher.scheduler.advanceUntilIdle()

        // Usuario pregunta: "¿cuál es más barato?"
        viewModel.sendMessage("¿cuál es más barato?")

        val lastMsg = viewModel.uiState.value.messages.last()
        assertTrue("Debe recomendar El Pike como el más barato", lastMsg.text.contains("El Pike"))
        assertTrue("Debe indicar el precio C$ 180.00", lastMsg.text.contains("180.00"))
        assertEquals(1, lastMsg.cards.size)
    }

    @Test
    fun `Contextual - Muestrame ese resuelve el referente singular`() = runTest(testDispatcher) {
        val viewModel = CustomerAIAgentViewModel(
            repository = fakeRepository,
            localToolDispatcher = mockLocalDispatcher
        )

        val singleCard = listOf(
            AIProductCard(productId = "p2", businessId = "b1", businessName = "FRITONI", name = "El Pike", price = 180.0)
        )

        fakeRepository.nextResponse = Result.success(
            CustomerAIResponse(
                responseId = "resp_pike",
                conversationId = "conv_1",
                message = "El Pike — C$ 180.00",
                cards = singleCard
            )
        )

        viewModel.openOverlay()
        viewModel.sendMessage("el segundo")
        testDispatcher.scheduler.advanceUntilIdle()

        // Usuario dice: "muéstrame ese"
        viewModel.sendMessage("muéstrame ese")

        val lastMsg = viewModel.uiState.value.messages.last()
        assertTrue("Debe referenciar a El Pike", lastMsg.text.contains("El Pike"))
        assertEquals(1, lastMsg.cards.size)
        assertEquals("p2", (lastMsg.cards.first() as AIProductCard).productId)
    }
}

/**
 * Fake Determinístico para Pruebas Unitarias de CustomerAIRepository
 */
private class FakeCustomerAIRepository : CustomerAIRepository() {
    var nextResponse: Result<CustomerAIResponse>? = null
    var lastConfirmedTokenSent: String? = null

    override suspend fun sendChatMessage(
        message: String,
        conversationHistory: List<Map<String, String>>,
        confirmedToken: String?,
        customerLat: Double?,
        customerLng: Double?
    ): Result<CustomerAIResponse> {
        lastConfirmedTokenSent = confirmedToken
        return nextResponse ?: Result.success(
            CustomerAIResponse(
                responseId = "resp_default",
                conversationId = "conv_default",
                message = "Respuesta default de prueba"
            )
        )
    }
}
