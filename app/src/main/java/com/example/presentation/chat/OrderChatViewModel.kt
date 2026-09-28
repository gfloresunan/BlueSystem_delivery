package com.example.presentation.chat

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.Pedido
import com.example.data.repository.OrderChatRepository
import com.example.domain.model.ChatDomain
import com.example.domain.model.OrderChatMessage
import com.example.domain.model.OrderChatSenderRole
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class OrderChatUiState {
    object Loading : OrderChatUiState()
    data class Active(
        val order: Pedido,
        val otherParticipantName: String,
        val otherParticipantPhone: String,
        val otherParticipantRole: String,
        val otherParticipantPhotoUrl: String = "",
        val isReadOnly: Boolean
    ) : OrderChatUiState()
    data class Closed(val reason: String) : OrderChatUiState()
    data class Forbidden(val message: String) : OrderChatUiState()
    data class Error(val message: String) : OrderChatUiState()
}

class OrderChatViewModel(
    val conversationId: String,
    val domain: ChatDomain = ChatDomain.COMMERCE_ORDER,
    private val repository: OrderChatRepository = OrderChatRepository()
) : ViewModel() {

    companion object {
        private const val TAG = "OrderChatVM"
    }

    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    private val _uiState = MutableStateFlow<OrderChatUiState>(OrderChatUiState.Loading)
    val uiState: StateFlow<OrderChatUiState> = _uiState.asStateFlow()

    private val _messages = MutableStateFlow<List<OrderChatMessage>>(emptyList())
    val messages: StateFlow<List<OrderChatMessage>> = _messages.asStateFlow()

    private val _inputText = MutableStateFlow("")
    val inputText: StateFlow<String> = _inputText.asStateFlow()

    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending.asStateFlow()

    private val _errorMessage = MutableSharedFlow<String>()
    val errorMessage: SharedFlow<String> = _errorMessage.asSharedFlow()

    private var currentRole: OrderChatSenderRole = OrderChatSenderRole.CUSTOMER
    private var currentUserName: String = "Usuario"
    private var currentOrder: Pedido? = null
    private var messagesJob: Job? = null
    private var orderJob: Job? = null

    init {
        loadOrderAndStartChat()
    }

    fun onInputTextChanged(newText: String) {
        _inputText.value = newText
    }

    private fun loadOrderAndStartChat() {
        val currentUid = auth.currentUser?.uid
        val parentCol = OrderChatRepository.getParentCollectionName(domain)
        Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PARENT_PATH=$parentCol/$conversationId | AUTH_UID=$currentUid | INIT_CHAT")
        if (currentUid == null) {
            _uiState.value = OrderChatUiState.Forbidden("Sesión no autenticada")
            return
        }

        viewModelScope.launch {
            try {
                // Obtener orden o viaje en tiempo real según el dominio
                db.collection(parentCol).document(conversationId)
                    .addSnapshotListener { docSnap, error ->
                        if (error != null) {
                            Log.e(TAG, "Error escuchando $parentCol/$conversationId", error)
                            Log.e("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$parentCol/$conversationId | LISTEN_ERROR | msg=${error.message}")
                            _uiState.value = OrderChatUiState.Error("Error cargando la conversación: ${error.message}")
                            return@addSnapshotListener
                        }

                        if (docSnap == null || !docSnap.exists()) {
                            Log.w("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | NOT_FOUND")
                            _uiState.value = OrderChatUiState.Error(if (domain == ChatDomain.COMMERCE_ORDER) "El pedido no existe" else "El viaje no existe")
                            return@addSnapshotListener
                        }

                        val data = docSnap.data ?: emptyMap<String, Any>()
                        val customerId = (data["customerId"] ?: data["clienteId"] ?: "").toString().trim()
                        val assignedCourierId = (data["assignedCourierId"] ?: data["courierId"] ?: data["motorizadoId"] ?: "").toString().trim()
                        val status = (data["status"] ?: data["estado"] ?: "").toString().lowercase().trim()
                        val customerName = (data["customerName"] ?: data["senderName"] ?: "Cliente").toString()
                        val customerPhone = (data["customerPhone"] ?: data["senderPhone"] ?: "").toString()
                        val courierName = (data["driverName"] ?: data["assignedCourierName"] ?: data["courierName"] ?: data["motorizadoNombre"] ?: "Motorizado").toString()
                        val courierPhone = (data["driverPhone"] ?: data["courierPhone"] ?: data["motorizadoTelefono"] ?: "").toString()

                        // Determinar rol y acceso
                        val isCustomer = currentUid == customerId
                        val isCourier = currentUid == assignedCourierId
                        val isClosed = status in listOf("delivered", "completed", "cancelled", "entregado", "completado", "cancelado")

                        Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | AUTH_UID=$currentUid | customerId=$customerId | assignedCourierId=$assignedCourierId | isCustomer=$isCustomer | isCourier=$isCourier | status=$status")

                        if (!isCustomer && !isCourier) {
                            _uiState.value = OrderChatUiState.Forbidden("No tienes autorización para acceder a esta conversación")
                            return@addSnapshotListener
                        }

                        currentRole = if (isCustomer) OrderChatSenderRole.CUSTOMER else OrderChatSenderRole.COURIER
                        currentUserName = if (isCustomer) customerName else courierName

                        val otherName = if (isCustomer) courierName else customerName
                        val otherPhone = if (isCustomer) courierPhone else customerPhone
                        val otherRole = if (isCustomer) "Motorizado Asignado" else "Cliente"

                        val parsedOrder = Pedido(
                            pedidoId = conversationId,
                            customerId = customerId,
                            assignedCourierId = assignedCourierId,
                            status = status,
                            customerName = customerName,
                            customerPhone = customerPhone,
                            businessName = (data["businessName"] ?: (if (domain == ChatDomain.X_TO_Y_TRIP) "Envío Punto a Punto" else "")).toString()
                        )
                        currentOrder = parsedOrder

                        val otherPhotoInitial = (data["driverPhoto"] ?: data["courierPhoto"] ?: data["customerPhoto"] ?: "").toString()

                        _uiState.value = OrderChatUiState.Active(
                            order = parsedOrder,
                            otherParticipantName = otherName,
                            otherParticipantPhone = otherPhone,
                            otherParticipantRole = otherRole,
                            otherParticipantPhotoUrl = otherPhotoInitial,
                            isReadOnly = isClosed || (isCourier && assignedCourierId != currentUid)
                        )

                        // Enriquecer en tiempo real con nombre completo y foto de perfil desde Firestore
                        val targetUid = if (isCustomer) assignedCourierId else customerId
                        if (targetUid.isNotEmpty()) {
                            db.collection("users").document(targetUid).get().addOnSuccessListener { uDoc ->
                                if (uDoc != null && uDoc.exists()) {
                                    val realName = uDoc.getString("nombre") ?: uDoc.getString("name") ?: ""
                                    val realPhoto = uDoc.getString("photoUrl") ?: uDoc.getString("foto") ?: uDoc.getString("profileImage") ?: ""
                                    val current = _uiState.value
                                    if (current is OrderChatUiState.Active) {
                                        _uiState.value = current.copy(
                                            otherParticipantName = if (realName.isNotBlank()) realName else current.otherParticipantName,
                                            otherParticipantPhotoUrl = if (realPhoto.isNotBlank()) realPhoto else current.otherParticipantPhotoUrl
                                        )
                                    }
                                }
                            }
                            if (isCustomer) {
                                db.collection("couriers").document(targetUid).get().addOnSuccessListener { cDoc ->
                                    if (cDoc != null && cDoc.exists()) {
                                        val cName = cDoc.getString("name") ?: cDoc.getString("fullName") ?: ""
                                        val cPhoto = cDoc.getString("photoUrl") ?: cDoc.getString("photo") ?: ""
                                        val current = _uiState.value
                                        if (current is OrderChatUiState.Active) {
                                            _uiState.value = current.copy(
                                                otherParticipantName = if (cName.isNotBlank()) cName else current.otherParticipantName,
                                                otherParticipantPhotoUrl = if (cPhoto.isNotBlank()) cPhoto else current.otherParticipantPhotoUrl
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Iniciar escucha de mensajes si aún no está activa
                        if (messagesJob == null) {
                            listenMessages()
                        }
                    }
            } catch (e: Exception) {
                Log.e(TAG, "Error iniciando chat", e)
                Log.e("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | START_CHAT_EXCEPTION | ${e.message}", e)
                _uiState.value = OrderChatUiState.Error("Fallo al iniciar el chat: ${e.message}")
            }
        }
    }

    private fun listenMessages() {
        messagesJob = viewModelScope.launch {
            repository.listenOrderMessages(conversationId, domain).collect { msgList ->
                _messages.value = msgList
                // Marcar como leído
                repository.markMessagesAsRead(conversationId, currentRole, domain)
            }
        }
    }

    fun sendMessage() {
        val text = _inputText.value.trim()
        Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | VM_SEND_INVOKED | textLength=${text.length} | isSending=${_isSending.value}")
        if (text.isEmpty() || _isSending.value) return

        val state = _uiState.value
        if (state is OrderChatUiState.Active && state.isReadOnly) {
            Log.w("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | SEND_BLOCKED_READ_ONLY")
            return
        }

        _isSending.value = true
        viewModelScope.launch {
            try {
                val result = repository.sendMessage(
                    conversationId = conversationId,
                    text = text,
                    senderRole = currentRole,
                    senderName = currentUserName,
                    domain = domain,
                    tenantId = currentOrder?.businessId ?: "",
                    businessId = currentOrder?.businessId ?: ""
                )
                if (result.isSuccess) {
                    _inputText.value = ""
                    Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | VM_SEND_SUCCESS")
                } else {
                    val err = result.exceptionOrNull()?.message ?: "Error desconocido al enviar mensaje"
                    Log.e(TAG, "Error enviando mensaje: $err")
                    Log.e("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | VM_SEND_FAILURE | err=$err")
                    _errorMessage.emit("No se pudo enviar el mensaje: $err")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Excepción enviando mensaje: ${e.message}", e)
                Log.e("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | VM_SEND_EXCEPTION | ${e.message}", e)
                _errorMessage.emit("Error de conexión: ${e.message}")
            } finally {
                _isSending.value = false
            }
        }
    }

    fun logCallEvent() {
        viewModelScope.launch {
            repository.recordCallEvent(
                conversationId = conversationId,
                callerRole = currentRole,
                callerName = currentUserName,
                domain = domain
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        messagesJob?.cancel()
        orderJob?.cancel()
        Log.d(TAG, "OrderChatViewModel limpiado para $conversationId (${domain.name})")
    }
}

class OrderChatViewModelFactory(
    private val conversationId: String,
    private val domain: ChatDomain = ChatDomain.COMMERCE_ORDER
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(OrderChatViewModel::class.java)) {
            return OrderChatViewModel(conversationId, domain) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

