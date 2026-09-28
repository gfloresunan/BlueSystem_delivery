package com.example.presentation.customer.ai

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.repository.CustomerAIRepository
import com.example.data.repository.CouponRepository
import com.example.domain.engine.ai.LocalExecutionContext
import com.example.domain.engine.ai.LocalToolDispatcher
import com.example.domain.engine.intelligence.EnterpriseSearchEngine
import com.example.domain.model.ai.*
import com.example.domain.model.coupon.CouponDiscountType
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Emisor del Mensaje Conversacional
 */
enum class MessageSender {
    USER,
    ASSISTANT
}

/**
 * Modelo de Mensaje para la Interfaz Conversacional de IA
 */
data class CustomerChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val sender: MessageSender,
    val text: String,
    val cards: List<AICard> = emptyList(),
    val actions: List<AIAction> = emptyList(),
    val pendingConfirmation: PendingConfirmation? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val isError: Boolean = false
)

/**
 * Estado Inmutable de la UI del Asistente de IA (Phase C3-E)
 */
data class CustomerAIUiState(
    val isOverlayVisible: Boolean = false,
    val isThinking: Boolean = false,
    val messages: List<CustomerChatMessage> = emptyList(),
    val pendingConfirmation: PendingConfirmation? = null,
    val errorMessage: String? = null,
    val quickSuggestions: List<String> = listOf(
        "¿Dónde viene mi pedido?",
        "Promociones del día",
        "Pizzas y hamburguesas cercanas",
        "Ver mi carrito"
    )
)

/**
 * BlueSystem Delivery Enterprise — Customer AI Agent ViewModel (Phase C3-E)
 *
 * Responsabilidades:
 * - Gestionar el estado de la interfaz conversacional (CustomerAIOverlay).
 * - Orquestar la comunicación con Cloud Function processCustomerAIChat vía CustomerAIRepository.
 * - Despachar herramientas locales a través del LocalToolDispatcher certificado de C3-B.
 * - Presentar la puerta de confirmación criptográfica (ConfirmationGateModal) para operaciones Level 3 / Level 4.
 * - Prevenir envíos duplicados durante el procesamiento.
 * - NUNCA acceder a Gemini directamente ni almacenar API Keys en Android.
 * - NUNCA calcular precios ni modificar inventarios sin autoridad del backend.
 */
class CustomerAIAgentViewModel(
    private val repository: CustomerAIRepository = CustomerAIRepository(),
    localToolDispatcher: LocalToolDispatcher? = null,
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
    private val couponRepository: CouponRepository = CouponRepository()
) : ViewModel() {

    private var activeLocalDispatcher: LocalToolDispatcher? = localToolDispatcher
    private var customerName: String = ""

    fun setLocalToolDispatcher(dispatcher: LocalToolDispatcher) {
        this.activeLocalDispatcher = dispatcher
    }

    fun setCustomerName(name: String) {
        this.customerName = name.trim()
    }

    fun getCustomerFirstName(): String {
        val raw = if (customerName.isNotBlank() && !customerName.equals("Cliente", ignoreCase = true)) {
            customerName
        } else {
            val authUser = auth.currentUser
            val displayName = authUser?.displayName?.takeIf { it.isNotBlank() }
            val emailName = authUser?.email?.substringBefore("@")?.takeIf { it.isNotBlank() }
            displayName ?: emailName ?: ""
        }
        val clean = raw.trim()
        if (clean.isBlank() || clean.equals("Cliente", ignoreCase = true)) return ""
        val first = clean.split("\\s+".toRegex()).firstOrNull() ?: clean
        return first.replaceFirstChar { if (it.isLowerCase()) it.titlecase(java.util.Locale.getDefault()) else it.toString() }
    }

    private val _uiState = MutableStateFlow(CustomerAIUiState())
    val uiState: StateFlow<CustomerAIUiState> = _uiState.asStateFlow()

    fun openOverlay() {
        _uiState.update { current ->
            val initialMessages = if (current.messages.isEmpty()) {
                val firstName = getCustomerFirstName()
                val greeting = if (firstName.isNotBlank()) {
                    "¡Hola, $firstName! 👋😊 Soy tu asistente de BlueSystem Delivery 🛵✨ ¿En qué te puedo ayudar hoy?"
                } else {
                    "¡Hola! Soy tu asistente de BlueSystem Delivery. ¿En qué te puedo ayudar hoy?"
                }
                listOf(
                    CustomerChatMessage(
                        sender = MessageSender.ASSISTANT,
                        text = greeting
                    )
                )
            } else {
                current.messages
            }
            current.copy(isOverlayVisible = true, messages = initialMessages, errorMessage = null)
        }
    }

    fun closeOverlay() {
        _uiState.update { it.copy(isOverlayVisible = false) }
    }

    fun toggleOverlay() {
        if (_uiState.value.isOverlayVisible) closeOverlay() else openOverlay()
    }

    fun clearConversation() {
        val firstName = getCustomerFirstName()
        val restartText = if (firstName.isNotBlank()) {
            "Conversación reiniciada. ¡Listo para ayudarte, $firstName! 🛵✨ ¿Qué deseas buscar o consultar?"
        } else {
            "Conversación reiniciada. ¡Listo para ayudarte! 🛵✨ ¿Qué deseas buscar o consultar?"
        }
        _uiState.update {
            it.copy(
                messages = listOf(
                    CustomerChatMessage(
                        sender = MessageSender.ASSISTANT,
                        text = restartText
                    )
                ),
                pendingConfirmation = null,
                errorMessage = null
            )
        }
    }

    /**
     * Envía un mensaje natural del cliente. Protegido contra envíos duplicados y reentradas.
     */
    fun sendMessage(rawQuery: String, customerLat: Double? = null, customerLng: Double? = null) {
        val query = rawQuery.trim()
        if (query.isBlank()) return

        // 1. Protección contra envíos duplicados / carrera concurrente
        if (_uiState.value.isThinking) return

        val userMessage = CustomerChatMessage(
            sender = MessageSender.USER,
            text = query
        )

        // 2. Verificar si es un saludo directo o social ("hola", "buenos días", etc.)
        val directGreetingAnswer = resolveDirectGreeting(query)
        if (directGreetingAnswer != null) {
            _uiState.update {
                it.copy(
                    messages = it.messages + userMessage + directGreetingAnswer,
                    isThinking = false,
                    errorMessage = null
                )
            }
            return
        }

        // 3. Verificar si es una referencia conversacional inmediata sobre las tarjetas mostradas
        val directContextAnswer = resolveContextualReference(query, _uiState.value.messages)
        if (directContextAnswer != null) {
            _uiState.update {
                it.copy(
                    messages = it.messages + userMessage + directContextAnswer,
                    isThinking = false,
                    errorMessage = null
                )
            }
            return
        }

        // Actualizar UI con mensaje del usuario y estado thinking
        _uiState.update {
            it.copy(
                messages = it.messages + userMessage,
                isThinking = true,
                errorMessage = null
            )
        }

        viewModelScope.launch {
            try {
                // Preparar historial conversacional mínimo (últimos 6 mensajes)
                val history = _uiState.value.messages
                    .takeLast(6)
                    .map { msg ->
                        mapOf(
                            "role" to if (msg.sender == MessageSender.USER) "user" else "model",
                            "content" to msg.text
                        )
                    }

                // 2. Invocar Gateway de IA
                val result = repository.sendChatMessage(
                    message = query,
                    conversationHistory = history,
                    customerLat = customerLat,
                    customerLng = customerLng
                )

                result.onSuccess { response ->
                    handleAIResponse(response, query)
                }.onFailure { error ->
                    val errorMsg = error.message ?: "No pudimos comunicarnos con el asistente."
                    _uiState.update { current ->
                        current.copy(
                            isThinking = false,
                            errorMessage = errorMsg,
                            messages = current.messages + CustomerChatMessage(
                                sender = MessageSender.ASSISTANT,
                                text = "Lo siento, ocurrió un problema temporal. Por favor intenta de nuevo.",
                                isError = true
                            )
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update { current ->
                    current.copy(
                        isThinking = false,
                        errorMessage = e.message,
                        messages = current.messages + CustomerChatMessage(
                            sender = MessageSender.ASSISTANT,
                            text = "Error interno al procesar el mensaje.",
                            isError = true
                        )
                    )
                }
            }
        }
    }

    /**
     * Procesa la respuesta estructurada devuelta por el AI Gateway.
     */
    private suspend fun handleAIResponse(response: CustomerAIResponse, originalQuery: String = "") {
        // Verificar si la respuesta incluye una acción de herramienta local (EXECUTE_LOCAL_TOOL)
        val localAction = response.actions.firstOrNull { it.parameters["toolId"] != null }

        var finalCards = response.cards
        var finalText = response.message

        val currentDispatcher = activeLocalDispatcher
        if (localAction != null && currentDispatcher != null) {
            val toolId = localAction.parameters["toolId"] ?: ""
            val rawParamsJson = localAction.parameters["parametersJson"]
            val params: Map<String, Any?> = if (!rawParamsJson.isNullOrBlank()) {
                try {
                    val jsonObj = org.json.JSONObject(rawParamsJson)
                    val map = mutableMapOf<String, Any?>()
                    val keys = jsonObj.keys()
                    while (keys.hasNext()) {
                        val key = keys.next()
                        map[key] = jsonObj.opt(key)
                    }
                    map
                } catch (e: Exception) {
                    localAction.parameters
                }
            } else {
                localAction.parameters
            }

            val currentUid = auth.currentUser?.uid
            val execContext = LocalExecutionContext(
                isAuthenticated = !currentUid.isNullOrBlank(),
                currentUserId = currentUid,
                isGuest = currentUid.isNullOrBlank()
            )

            android.util.Log.d("CUSTOMER_AI_DEBUG", "[AI_DISPATCH] toolId=$toolId | params=$params")
            val localResult = currentDispatcher.dispatch(toolId, params, execContext)
            android.util.Log.d("CUSTOMER_AI_DEBUG", "[AI_RESULT] success=${localResult.success} | cards=${localResult.cards.size} | context='${localResult.sanitizedLlmContext}' | error=${localResult.error?.userMessage}")
            if (localResult.success) {
                if (localResult.sanitizedLlmContext.isNotBlank()) {
                    finalText = localResult.sanitizedLlmContext
                }
                if (localResult.cards.isNotEmpty()) {
                    finalCards = localResult.cards
                }
            }
        }

        // Resolución de respaldo para cupones y beneficios si la nube no incluyó los códigos
        val qNorm = EnterpriseSearchEngine.normalizeForSearch(originalQuery)
        val isCouponQuery = qNorm.contains("cupon") || qNorm.contains("beneficio") || qNorm.contains("descuento") || qNorm.contains("promo")
        if (isCouponQuery && (finalText.isBlank() || finalText.contains("No tengo una respuesta") || !finalText.contains("•"))) {
            val userCoupons = couponRepository.getAvailableCouponsForUser(auth.currentUser?.uid)
            if (userCoupons.isNotEmpty()) {
                val formatted = buildString {
                    append("Tienes los siguientes cupones y beneficios activos disponibles:\n\n")
                    userCoupons.forEach { c ->
                        val disc = when (c.discountType) {
                            CouponDiscountType.PERCENTAGE -> "${c.discountValue.toInt()}% de descuento"
                            CouponDiscountType.FIXED_AMOUNT -> "C$ ${String.format(java.util.Locale.US, "%.2f", c.discountValue)} de descuento"
                            CouponDiscountType.FREE_DELIVERY -> "Envío gratis"
                        }
                        val title = if (c.title.isNotBlank()) " (${c.title})" else ""
                        val minSpend = if (c.minimumOrderAmount > 0) " [Compra mínima: C$ ${c.minimumOrderAmount.toInt()}]" else " [Sin compra mínima]"
                        val biz = if (!c.businessName.isNullOrBlank()) " [Válido en: ${c.businessName}]" else ""
                        append("• Código **${c.code}**: $disc$title$minSpend$biz\n")
                    }
                    append("\nPuedes aplicar cualquiera de estos códigos al momento de confirmar tu pedido en el carrito 🎟️.")
                }
                finalText = formatted
            }
        }

        // Fallback proactivo: Si no hay tarjetas y la consulta era de búsqueda de productos/comida/tecnología,
        // o si el asistente respondió que no encontró productos, aplicar la Regla Maestra:
        // recomendar lo más parecido u ofertas/destacados para nunca dejar la pantalla sin opciones de compra.
        val isOrderTrackingQuery = qNorm.contains("pedido") || qNorm.contains("orden") || qNorm.contains("tracking") || qNorm.contains("donde viene")
        val isProductSearch = qNorm.contains("laptop") || qNorm.contains("pan") || qNorm.contains("comida") ||
                qNorm.contains("pizza") || qNorm.contains("hamburg") || qNorm.contains("buscar") ||
                qNorm.contains("precio") || qNorm.contains("venden") || qNorm.contains("tienen") ||
                qNorm.contains("hay ") || qNorm.contains("quiero") || qNorm.contains("antojo") ||
                qNorm.contains("plato") || qNorm.contains("comput") || qNorm.contains("pc") ||
                qNorm.contains("tech") || finalText.contains("No encontré productos") ||
                finalText.contains("no encontramos") || finalText.contains("no encontré")

        if (finalCards.isEmpty() && !isCouponQuery && !isOrderTrackingQuery && isProductSearch) {
            val currentUid = auth.currentUser?.uid
            val execContext = LocalExecutionContext(
                isAuthenticated = !currentUid.isNullOrBlank(),
                currentUserId = currentUid,
                isGuest = currentUid.isNullOrBlank()
            )
            val fallbackResult = activeLocalDispatcher?.dispatch(
                "tool_search_products",
                mapOf("query" to originalQuery, "allowFallback" to "true"),
                execContext
            )
            if (fallbackResult != null && fallbackResult.cards.isNotEmpty()) {
                finalCards = fallbackResult.cards
                if (finalText.isBlank() || finalText.contains("No encontré productos o comercios disponibles que coincidan")) {
                    finalText = fallbackResult.sanitizedLlmContext
                }
            }
        }

        val assistantMessage = CustomerChatMessage(
            sender = MessageSender.ASSISTANT,
            text = if (finalText.isNotBlank()) finalText else "Aquí tienes la información solicitada:",
            cards = finalCards,
            actions = response.actions,
            pendingConfirmation = response.pendingConfirmation
        )

        _uiState.update { current ->
            current.copy(
                isThinking = false,
                messages = current.messages + assistantMessage,
                pendingConfirmation = response.pendingConfirmation
            )
        }
    }

    /**
     * Confirma o rechaza una acción pendiente que requiere confirmación humana (Level 3 / Level 4).
     */
    fun confirmAction(confirmed: Boolean) {
        val pending = _uiState.value.pendingConfirmation ?: return

        if (!confirmed) {
            // Usuario canceló explícitamente en el ConfirmationGateModal
            _uiState.update { current ->
                current.copy(
                    pendingConfirmation = null,
                    messages = current.messages + CustomerChatMessage(
                        sender = MessageSender.ASSISTANT,
                        text = "Acción cancelada por el usuario. No se realizó ninguna modificación."
                    )
                )
            }
            return
        }

        // Usuario confirmó: enviar token criptográfico al backend
        _uiState.update { it.copy(isThinking = true, pendingConfirmation = null) }

        viewModelScope.launch {
            try {
                val result = repository.sendChatMessage(
                    message = "CONFIRMADO_POR_USUARIO",
                    confirmedToken = pending.confirmationNonce
                )

                result.onSuccess { response ->
                    val successMsg = CustomerChatMessage(
                        sender = MessageSender.ASSISTANT,
                        text = if (response.message.isNotBlank()) response.message else "¡Operación confirmada y ejecutada exitosamente!",
                        cards = response.cards,
                        actions = response.actions
                    )
                    _uiState.update { current ->
                        current.copy(
                            isThinking = false,
                            messages = current.messages + successMsg
                        )
                    }
                }.onFailure { error ->
                    _uiState.update { current ->
                        current.copy(
                            isThinking = false,
                            errorMessage = error.message,
                            messages = current.messages + CustomerChatMessage(
                                sender = MessageSender.ASSISTANT,
                                text = "No se pudo completar la operación autorizada: ${error.message}",
                                isError = true
                            )
                        )
                    }
                }
            } catch (e: Exception) {
                _uiState.update { current ->
                    current.copy(
                        isThinking = false,
                        errorMessage = e.message,
                        messages = current.messages + CustomerChatMessage(
                            sender = MessageSender.ASSISTANT,
                            text = "Error al confirmar la operación.",
                            isError = true
                        )
                    )
                }
            }
        }
    }

    fun dismissConfirmation() {
        _uiState.update { it.copy(pendingConfirmation = null) }
    }

    /**
     * Resuelve consultas contextuales y referenciales ("el segundo", "cuál es más barato", "cuánto cuesta", "muéstrame ese")
     * de forma inmediata sobre las tarjetas mostradas en el turno conversacional anterior.
     */
    private fun resolveContextualReference(
        query: String,
        prevMessages: List<CustomerChatMessage>
    ): CustomerChatMessage? {
        val qNorm = query.lowercase().trim()
        val lastAssistantWithCards = prevMessages.lastOrNull { it.sender == MessageSender.ASSISTANT && it.cards.isNotEmpty() }
        val productCards = lastAssistantWithCards?.cards?.filterIsInstance<AIProductCard>().orEmpty()
        val businessCards = lastAssistantWithCards?.cards?.filterIsInstance<AIBusinessCard>().orEmpty()

        if (productCards.isEmpty() && businessCards.isEmpty()) return null

        // 1. Pregunta sobre comercios abiertos ("cuál está abierto", "cuáles están abiertos", "hay alguno abierto")
        val isOpenQuery = qNorm.contains("abierto") || qNorm.contains("abiertos") || qNorm.contains("abierta")
        if (isOpenQuery && businessCards.isNotEmpty()) {
            val openBizs = businessCards.filter { it.isOpen }
            return if (openBizs.isNotEmpty()) {
                val listText = openBizs.joinToString("\n") { "• **${it.name}** — ${it.category}" }
                CustomerChatMessage(
                    sender = MessageSender.ASSISTANT,
                    text = "De los comercios mostrados anteriormente, actualmente están abiertos:\n$listText\n\nToca cualquier tarjeta para explorar su menú.",
                    cards = openBizs
                )
            } else {
                CustomerChatMessage(
                    sender = MessageSender.ASSISTANT,
                    text = "En este momento ninguno de los comercios anteriores se encuentra abierto.",
                    cards = emptyList()
                )
            }
        }

        // 2. Ordinales sobre productos ("el primero", "el 1", "el segundo", "el 2", "el tercero", "el 3", "el ultimo")
        if (productCards.isNotEmpty()) {
            val ordinalIndex = when {
                qNorm in listOf("el primero", "el 1", "primero", "opcion 1", "opción 1", "la primera") -> 0
                qNorm in listOf("el segundo", "el 2", "segundo", "opcion 2", "opción 2", "la segunda") -> 1
                qNorm in listOf("el tercero", "el 3", "tercero", "opcion 3", "opción 3", "la tercera") -> 2
                qNorm in listOf("el cuarto", "el 4", "cuarto", "opcion 4", "opción 4", "la cuarta") -> 3
                qNorm in listOf("el ultimo", "el último", "la ultima", "la última") -> productCards.size - 1
                else -> null
            }

            if (ordinalIndex != null && ordinalIndex in productCards.indices) {
                val target = productCards[ordinalIndex]
                val discText = if (target.discountPercentage > 0) " (en oferta con ${target.discountPercentage}% de descuento)" else ""
                val origText = if (target.originalPrice != null && target.originalPrice > target.price) " (antes C$ ${String.format(java.util.Locale.US, "%.2f", target.originalPrice)})" else ""
                return CustomerChatMessage(
                    sender = MessageSender.ASSISTANT,
                    text = "${target.name} de ${target.businessName} — C$ ${String.format(java.util.Locale.US, "%.2f", target.price)}$origText$discText.\n\nToca la tarjeta para abrir los detalles y ordenar.",
                    cards = listOf(target)
                )
            }

            // Comparativo: "¿cuál es más barato?" / "el más económico"
            val isCheapestQuery = qNorm.contains("mas barato") || qNorm.contains("más barato") || 
                                  qNorm.contains("mas economico") || qNorm.contains("más económico") || 
                                  qNorm.contains("menor precio")
            if (isCheapestQuery) {
                val cheapest = productCards.minByOrNull { it.price }
                if (cheapest != null) {
                    return CustomerChatMessage(
                        sender = MessageSender.ASSISTANT,
                        text = "De las opciones anteriores, la más económica es **${cheapest.name}** a solo **C$ ${String.format(java.util.Locale.US, "%.2f", cheapest.price)}** en ${cheapest.businessName}.",
                        cards = listOf(cheapest)
                    )
                }
            }

            // Demostrativo / Pregunta de precio: "ese", "esa", "ábrelo", "muéstrame ese", "cuánto cuesta", "precio"
            val isSingleReferent = productCards.size == 1
            val isDemonstrative = qNorm in listOf("ese", "esa", "este", "esta", "ábrelo", "abrelo", "muéstrame ese", "muestrame ese", "abre ese", "quiero ese", "ver ese")
            val isPriceQuery = qNorm.contains("cuanto cuesta") || qNorm.contains("cuánto cuesta") || 
                               qNorm.contains("precio") || qNorm.contains("cuanto vale") || qNorm.contains("cuánto vale")

            if ((isDemonstrative || isPriceQuery) && isSingleReferent) {
                val target = productCards.first()
                val origText = if (target.originalPrice != null && target.originalPrice > target.price) " (antes C$ ${String.format(java.util.Locale.US, "%.2f", target.originalPrice)})" else ""
                val discText = if (target.discountPercentage > 0) " (${target.discountPercentage}% off)" else ""
                val text = if (isPriceQuery) {
                    "${target.name} cuesta C$ ${String.format(java.util.Locale.US, "%.2f", target.price)}$origText$discText."
                } else {
                    "Aquí tienes ${target.name} de ${target.businessName}. Toca la tarjeta para ver los detalles y agregarlo a tu orden."
                }
                return CustomerChatMessage(
                    sender = MessageSender.ASSISTANT,
                    text = text,
                    cards = listOf(target)
                )
            }
        }

        // 3. Ordinales sobre comercios si no hay productos
        if (businessCards.isNotEmpty() && productCards.isEmpty()) {
            val ordinalIndex = when {
                qNorm in listOf("el primero", "el 1", "primero", "opcion 1", "opción 1", "la primera") -> 0
                qNorm in listOf("el segundo", "el 2", "segundo", "opcion 2", "opción 2", "la segunda") -> 1
                qNorm in listOf("el tercero", "el 3", "tercero", "opcion 3", "opción 3", "la tercera") -> 2
                qNorm in listOf("el ultimo", "el último", "la ultima", "la última") -> businessCards.size - 1
                else -> null
            }
            if (ordinalIndex != null && ordinalIndex in businessCards.indices) {
                val target = businessCards[ordinalIndex]
                return CustomerChatMessage(
                    sender = MessageSender.ASSISTANT,
                    text = "**${target.name}** (${target.category}) — ${if (target.isOpen) "Abierto ahora 🟢" else "Cerrado 🔴"}.\n\nToca la tarjeta para explorar su catálogo.",
                    cards = listOf(target)
                )
            }
        }

        return null
    }

    /**
     * Resuelve saludos directos ("hola", "buenos días", etc.) de forma inmediata,
     * amigable, con emojis y personalizando con el nombre registrado del cliente.
     */
    private fun resolveDirectGreeting(query: String): CustomerChatMessage? {
        val q = query.lowercase().trim()
            .replace("¡", "")
            .replace("!", "")
            .replace("¿", "")
            .replace("?", "")
            .replace(".", "")
            .replace(",", "")
            .trim()

        val qNorm = q
            .replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")

        val isGreeting = when (qNorm) {
            "hola", "holaa", "holaaa", "hola asistente", "hola ai", "hola bot", "hola amigos",
            "buenos dias", "buen dia", "buenas tardes", "buenas noches", "buenas",
            "que tal", "como estas", "como te va", "saludos", "hey", "hello", "hi",
            "quien eres", "como te llamas", "que puedes hacer", "ayuda" -> true
            else -> {
                val words = qNorm.split("\\s+".toRegex()).filter { it.isNotBlank() }
                val greetingWords = setOf("hola", "buenas", "buenos", "dias", "dia", "tardes", "noches", "saludos", "hey", "asistente", "amigo", "blue")
                words.isNotEmpty() && words.size <= 4 && words.all { it in greetingWords }
            }
        }

        if (!isGreeting) return null

        val firstName = getCustomerFirstName()
        val text = if (firstName.isNotBlank()) {
            "¡Hola, $firstName! 👋😊 ¡Qué gusto saludarte!\n\nSoy tu asistente de BlueSystem Delivery 🛵✨ Estoy aquí para ayudarte a encontrar comidas deliciosas 🍔🍕, productos de tecnología 💻, ofertas activas 🏷️ y todo lo que necesites.\n\n¿En qué te puedo ayudar hoy?"
        } else {
            "¡Hola! 👋😊 ¡Qué gusto saludarte!\n\nSoy tu asistente de BlueSystem Delivery 🛵✨ Estoy aquí para ayudarte a encontrar comidas deliciosas 🍔🍕, productos de tecnología 💻, ofertas activas 🏷️ y todo lo que necesites.\n\n¿En qué te puedo ayudar hoy?"
        }

        return CustomerChatMessage(
            sender = MessageSender.ASSISTANT,
            text = text
        )
    }
}
