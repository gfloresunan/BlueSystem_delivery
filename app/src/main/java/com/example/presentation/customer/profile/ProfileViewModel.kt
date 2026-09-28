package com.example.presentation.customer.profile

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.Address
import com.example.AppUser
import com.example.data.repository.Customer360Stats
import com.example.data.repository.CustomerSettings
import com.example.data.repository.ProfileManagerRepository
import com.example.toAddressSafely
import com.example.toAppUserSafely
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.userProfileChangeRequest
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageMetadata
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.io.ByteArrayOutputStream

class ProfileViewModel(
    private val repository: ProfileManagerRepository = ProfileManagerRepository()
) : ViewModel() {
    private val db = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    private val _currentUser = MutableStateFlow<AppUser?>(null)
    val currentUser: StateFlow<AppUser?> = _currentUser.asStateFlow()

    private val _isLoadingProfile = MutableStateFlow(false)
    val isLoadingProfile: StateFlow<Boolean> = _isLoadingProfile.asStateFlow()

    private val _profileError = MutableStateFlow<String?>(null)
    val profileError: StateFlow<String?> = _profileError.asStateFlow()

    private val _addresses = MutableStateFlow<List<Address>>(emptyList())
    val addresses: StateFlow<List<Address>> = _addresses.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    // ─── Real Orders Stats 100% Canónico (CAMBIO 3: 0 Fallbacks Hardcodeados) ──
    private val _realCustomerStats = MutableStateFlow(Customer360Stats(totalOrders = 0))
    val customerStats: StateFlow<Customer360Stats> = _realCustomerStats.asStateFlow()

    // ─── Contacto Directo Dinámico (/system_config/support - CAMBIO 5) ─────────
    private val _supportConfig = MutableStateFlow(DirectSupportConfig())
    val supportConfig: StateFlow<DirectSupportConfig> = _supportConfig.asStateFlow()

    // ─── Sistema de Tickets de Soporte en Vivo (CAMBIO 4) ──────────────────────
    private val _supportTickets = MutableStateFlow<List<SupportTicket>>(emptyList())
    val supportTickets: StateFlow<List<SupportTicket>> = _supportTickets.asStateFlow()

    private val _currentTicketMessages = MutableStateFlow<List<SupportTicketMessage>>(emptyList())
    val currentTicketMessages: StateFlow<List<SupportTicketMessage>> = _currentTicketMessages.asStateFlow()

    private val _selectedTicketId = MutableStateFlow<String?>(null)
    val selectedTicketId: StateFlow<String?> = _selectedTicketId.asStateFlow()

    // Profile Hub StateFlows from Repository
    val globalConfig = repository.globalConfig
    val loyaltyInfo = repository.loyaltyInfo
    val coupons = repository.coupons
    val walletInfo = repository.walletInfo
    val timeline = repository.timeline
    val customerSettings = repository.customerSettings

    private var addressesListener: ListenerRegistration? = null
    private var ordersListener: ListenerRegistration? = null
    private var supportConfigListener: ListenerRegistration? = null
    private var supportTicketsListener: ListenerRegistration? = null
    private var ticketMessagesListener: ListenerRegistration? = null

    init {
        loadUserProfile()
        loadAddresses()
        listenToRealOrdersStats()
        listenToSupportConfig()
        listenToSupportTickets()
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            loadUserProfile()
            loadAddresses()
            listenToRealOrdersStats()
            listenToSupportConfig()
            listenToSupportTickets()
            kotlinx.coroutines.delay(600)
            _isRefreshing.value = false
        }
    }

    private fun loadUserProfile() {
        val uid = auth.currentUser?.uid
        if (uid.isNullOrBlank()) {
            _currentUser.value = null
            _isLoadingProfile.value = false
            _profileError.value = null
            return
        }
        viewModelScope.launch {
            _isLoadingProfile.value = true
            _profileError.value = null
            try {
                val doc = db.collection("users").document(uid).get().await()
                if (doc.exists()) {
                    val user = doc.toAppUserSafely()
                    _currentUser.value = user?.copy(uid = uid)
                    _profileError.value = null
                } else {
                    Log.w("ProfileViewModel", "Document /users/$uid does not exist in Firestore")
                    _currentUser.value = null
                    _profileError.value = "No se encontró el perfil de usuario en el servidor"
                }
            } catch (e: Exception) {
                Log.w("ProfileViewModel", "Error loading user profile", e)
                _profileError.value = e.localizedMessage ?: "Error al cargar el perfil"
            } finally {
                _isLoadingProfile.value = false
            }
        }
    }

    private fun loadAddresses() {
        val uid = auth.currentUser?.uid ?: return
        viewModelScope.launch {
            _isLoading.value = true
            try {
                addressesListener?.remove()
                addressesListener = db.collection("users").document(uid).collection("addresses")
                    .addSnapshotListener { snapshot, error ->
                        if (error != null || snapshot == null) return@addSnapshotListener
                        val list = snapshot.documents.mapNotNull { it.toAddressSafely() }
                        _addresses.value = list
                    }
            } catch (e: Exception) {
                Log.w("ProfileViewModel", "Error listening to addresses", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Listener reactivo a /orders para calcular la métrica REAL de pedidos del cliente (CAMBIO 3)
     */
    private fun listenToRealOrdersStats() {
        val uid = auth.currentUser?.uid ?: run {
            _realCustomerStats.value = Customer360Stats(totalOrders = 0)
            return
        }
        ordersListener?.remove()
        ordersListener = db.collection("orders")
            .whereEqualTo("customerId", uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) {
                    Log.w("ProfileViewModel", "Error reading real orders stats for $uid: ${error?.message}")
                    return@addSnapshotListener
                }
                val docs = snapshot.documents
                val totalCount = docs.size
                val deliveredCount = docs.count { 
                    val st = (it.getString("status") ?: it.getString("estado") ?: "").lowercase()
                    st in listOf("delivered", "completado", "entregado", "finalizado")
                }
                val cancelledCount = docs.count {
                    val st = (it.getString("status") ?: it.getString("estado") ?: "").lowercase()
                    st in listOf("cancelled", "cancelado")
                }

                _realCustomerStats.value = _realCustomerStats.value.copy(
                    totalOrders = totalCount,
                    deliveredOrders = deliveredCount,
                    cancelledOrders = cancelledCount
                )
                Log.d("ProfileViewModel", "Real orders stats updated for $uid: total=$totalCount, delivered=$deliveredCount, cancelled=$cancelledCount")
            }
    }

    /**
     * Listener reactivo a /system_config/support para contacto dinámico (CAMBIO 5)
     */
    private fun listenToSupportConfig() {
        supportConfigListener?.remove()
        supportConfigListener = db.collection("system_config").document("support")
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null || !snapshot.exists()) {
                    return@addSnapshotListener
                }
                try {
                    val config = DirectSupportConfig(
                        whatsappActive = snapshot.getBoolean("whatsappActive") ?: true,
                        whatsappNumber = snapshot.getString("whatsappNumber") ?: "+505 8888-0000",
                        whatsappText = snapshot.getString("whatsappText") ?: "WhatsApp Soporte",
                        emailActive = snapshot.getBoolean("emailActive") ?: true,
                        supportEmail = snapshot.getString("supportEmail") ?: "soporte@bluesystemdelivery.com",
                        emailText = snapshot.getString("emailText") ?: "Correo Electrónico",
                        scheduleDays = snapshot.getString("scheduleDays") ?: "Lun-Dom",
                        scheduleHours = snapshot.getString("scheduleHours") ?: "8:00am a 8:00pm",
                        availabilityMessage = snapshot.getString("availabilityMessage") ?: "Respondemos usualmente en menos de 15 minutos durante horario hábil."
                    )
                    _supportConfig.value = config
                } catch (e: Exception) {
                    Log.w("ProfileViewModel", "Error parsing /system_config/support", e)
                }
            }
    }

    /**
     * Listener reactivo a /support_tickets del cliente autenticado (CAMBIO 4)
     */
    fun listenToSupportTickets() {
        val uid = auth.currentUser?.uid ?: return
        supportTicketsListener?.remove()
        supportTicketsListener = db.collection("support_tickets")
            .whereEqualTo("customerId", uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) {
                    Log.w("ProfileViewModel", "Error listening to support tickets", error)
                    return@addSnapshotListener
                }
                val tickets = snapshot.documents.mapNotNull { doc ->
                    try {
                        SupportTicket(
                            id = doc.id,
                            ticketId = doc.getString("ticketId") ?: doc.id,
                            customerId = doc.getString("customerId") ?: "",
                            customerName = doc.getString("customerName") ?: "",
                            customerEmail = doc.getString("customerEmail") ?: "",
                            subject = doc.getString("subject") ?: "",
                            status = doc.getString("status") ?: "OPEN",
                            lastMessage = doc.getString("lastMessage") ?: "",
                            lastMessageSender = doc.getString("lastMessageSender") ?: "CUSTOMER",
                            lastMessageAt = doc.getTimestamp("lastMessageAt"),
                            unreadByCustomer = doc.getLong("unreadByCustomer")?.toInt() ?: 0,
                            unreadByAdmin = doc.getLong("unreadByAdmin")?.toInt() ?: 0,
                            createdAt = doc.getTimestamp("createdAt"),
                            updatedAt = doc.getTimestamp("updatedAt")
                        )
                    } catch (e: Exception) {
                        null
                    }
                }.sortedByDescending { it.updatedAt?.seconds ?: it.createdAt?.seconds ?: 0L }

                _supportTickets.value = tickets
            }
    }

    fun selectTicketAndListen(ticketId: String) {
        _selectedTicketId.value = ticketId
        ticketMessagesListener?.remove()
        
        // Reset unread count for customer on open
        viewModelScope.launch {
            try {
                db.collection("support_tickets").document(ticketId).update("unreadByCustomer", 0).await()
            } catch (e: Exception) {
                // Ignore
            }
        }

        ticketMessagesListener = db.collection("support_tickets").document(ticketId)
            .collection("messages")
            .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener
                val messages = snapshot.documents.mapNotNull { doc ->
                    try {
                        SupportTicketMessage(
                            id = doc.id,
                            ticketId = ticketId,
                            senderId = doc.getString("senderId") ?: "",
                            senderRole = doc.getString("senderRole") ?: "CUSTOMER",
                            senderName = doc.getString("senderName") ?: "",
                            text = doc.getString("text") ?: doc.getString("message") ?: "",
                            isRead = doc.getBoolean("isRead") ?: false,
                            createdAt = doc.getTimestamp("createdAt")
                        )
                    } catch (e: Exception) {
                        null
                    }
                }
                _currentTicketMessages.value = messages
            }
    }

    fun createSupportTicket(
        subject: String,
        initialMessage: String,
        onResult: (Boolean, String?) -> Unit
    ) {
        val uid = auth.currentUser?.uid ?: return onResult(false, "Usuario no autenticado")
        val email = auth.currentUser?.email ?: ""
        val name = _currentUser.value?.nombre ?: _currentUser.value?.name ?: "Cliente"

        if (subject.isBlank()) return onResult(false, "Por favor ingresa un asunto")
        if (initialMessage.isBlank()) return onResult(false, "Por favor escribe tu mensaje")

        viewModelScope.launch {
            try {
                val ticketRef = db.collection("support_tickets").document()
                val now = Timestamp.now()
                val cleanSubject = subject.trim()
                val cleanMsg = initialMessage.trim()

                val ticketData = mapOf(
                    "ticketId" to ticketRef.id,
                    "customerId" to uid,
                    "userId" to uid,
                    "customerName" to name,
                    "customerEmail" to email,
                    "subject" to cleanSubject,
                    "status" to "OPEN",
                    "lastMessage" to cleanMsg,
                    "lastMessageSender" to "CUSTOMER",
                    "lastMessageAt" to now,
                    "unreadByCustomer" to 0,
                    "unreadByAdmin" to 1,
                    "createdAt" to now,
                    "updatedAt" to now
                )

                ticketRef.set(ticketData).await()

                val messageRef = ticketRef.collection("messages").document()
                val msgData = mapOf(
                    "ticketId" to ticketRef.id,
                    "senderId" to uid,
                    "senderRole" to "CUSTOMER",
                    "senderName" to name,
                    "text" to cleanMsg,
                    "createdAt" to now,
                    "isRead" to false
                )
                messageRef.set(msgData).await()

                selectTicketAndListen(ticketRef.id)
                onResult(true, ticketRef.id)
            } catch (e: Exception) {
                Log.e("ProfileViewModel", "Error creating support ticket", e)
                onResult(false, e.localizedMessage ?: "Error al crear ticket de soporte")
            }
        }
    }

    fun sendTicketMessage(
        ticketId: String,
        text: String,
        onResult: (Boolean, String?) -> Unit = { _, _ -> }
    ) {
        val uid = auth.currentUser?.uid ?: return onResult(false, "Usuario no autenticado")
        val name = _currentUser.value?.nombre ?: _currentUser.value?.name ?: "Cliente"
        val cleanText = text.trim()
        if (cleanText.isBlank()) return

        viewModelScope.launch {
            try {
                val now = Timestamp.now()
                val messageRef = db.collection("support_tickets").document(ticketId).collection("messages").document()
                val msgData = mapOf(
                    "ticketId" to ticketId,
                    "senderId" to uid,
                    "senderRole" to "CUSTOMER",
                    "senderName" to name,
                    "text" to cleanText,
                    "createdAt" to now,
                    "isRead" to false
                )
                messageRef.set(msgData).await()

                try {
                    db.collection("support_tickets").document(ticketId).update(
                        mapOf(
                            "lastMessage" to cleanText,
                            "lastMessageSender" to "CUSTOMER",
                            "lastMessageAt" to now,
                            "unreadByAdmin" to com.google.firebase.firestore.FieldValue.increment(1),
                            "updatedAt" to now
                        )
                    ).await()
                } catch (pe: Exception) {
                    Log.w("ProfileViewModel", "Could not update parent ticket metadata", pe)
                }

                onResult(true, null)
            } catch (e: Exception) {
                Log.e("ProfileViewModel", "Error sending message in ticket $ticketId", e)
                onResult(false, e.localizedMessage ?: "Error al enviar mensaje")
            }
        }
    }

    fun saveAddress(address: Address) {
        val uid = auth.currentUser?.uid ?: return
        viewModelScope.launch {
            try {
                val collRef = db.collection("users").document(uid).collection("addresses")
                val now = System.currentTimeMillis()
                val effectiveInst = address.getEffectiveInstructions()

                val docRef = if (address.id.isNotBlank()) collRef.document(address.id) else collRef.document()
                val targetId = docRef.id

                val isFirstAddress = _addresses.value.isEmpty()
                val makeDefault = address.isDefault || isFirstAddress

                val batch = db.batch()

                val finalAddress = address.copy(
                    id = targetId,
                    userId = uid,
                    label = address.label.ifBlank { "Casa" },
                    fullAddress = address.fullAddress.ifBlank { "Ubicación en mapa (${if (address.latitude != 0.0) address.latitude else 12.136389}, ${if (address.longitude != 0.0) address.longitude else -86.251389})" },
                    instructions = effectiveInst,
                    deliveryInstructions = effectiveInst,
                    isDefault = makeDefault,
                    latitude = if (address.latitude != 0.0) address.latitude else 12.136389,
                    longitude = if (address.longitude != 0.0) address.longitude else -86.251389,
                    createdAt = if (address.createdAt == 0L) now else address.createdAt,
                    updatedAt = now
                )

                if (makeDefault) {
                    val currentAddresses = _addresses.value
                    for (existing in currentAddresses) {
                        if (existing.id != targetId && existing.id.isNotBlank()) {
                            batch.update(collRef.document(existing.id), mapOf(
                                "isDefault" to false,
                                "default" to false,
                                "userId" to uid,
                                "id" to existing.id,
                                "updatedAt" to now
                            ))
                        }
                    }
                    batch.update(db.collection("users").document(uid), mapOf(
                        "defaultAddressId" to targetId,
                        "address" to finalAddress.fullAddress,
                        "latitude" to finalAddress.latitude,
                        "longitude" to finalAddress.longitude,
                        "updatedAt" to now
                    ))
                }

                batch.set(docRef, finalAddress)
                batch.commit().await()
                Log.d("ADDRESS_DEBUG", "Address saved atomically: id=$targetId label=${finalAddress.label} default=$makeDefault")
            } catch (e: Exception) {
                Log.e("ADDRESS_DEBUG", "Error saving address", e)
            }
        }
    }

    fun setDefaultAddress(addressId: String) {
        val uid = auth.currentUser?.uid ?: return
        viewModelScope.launch {
            try {
                val collRef = db.collection("users").document(uid).collection("addresses")
                val userRef = db.collection("users").document(uid)
                val batch = db.batch()
                val now = System.currentTimeMillis()
                var targetAddress: Address? = null

                val currentList = _addresses.value
                for (item in currentList) {
                    val isTarget = (item.id == addressId)
                    if (isTarget) {
                        targetAddress = item.copy(isDefault = true)
                    }
                    if (item.id.isNotBlank()) {
                        batch.update(collRef.document(item.id), mapOf(
                            "isDefault" to isTarget,
                            "default" to isTarget,
                            "userId" to uid,
                            "id" to item.id,
                            "updatedAt" to now
                        ))
                    }
                }

                if (targetAddress != null) {
                    batch.update(userRef, mapOf(
                        "defaultAddressId" to addressId,
                        "address" to targetAddress.fullAddress,
                        "latitude" to targetAddress.latitude,
                        "longitude" to targetAddress.longitude,
                        "updatedAt" to now
                    ))
                }

                batch.commit().await()
                Log.d("ADDRESS_DEBUG", "Default address updated atomically: addressId=$addressId (synced to user)")
            } catch (e: Exception) {
                Log.e("ADDRESS_DEBUG", "Error setting default address", e)
            }
        }
    }

    fun deleteAddress(addressId: String) {
        val uid = auth.currentUser?.uid ?: return
        viewModelScope.launch {
            try {
                val collRef = db.collection("users").document(uid).collection("addresses")
                val wasDefault = _addresses.value.find { it.id == addressId }?.isDefault ?: false
                
                collRef.document(addressId).delete().await()
                Log.d("ADDRESS_DEBUG", "Address deleted: addressId=$addressId")

                if (wasDefault) {
                    val remaining = _addresses.value.filter { it.id != addressId }
                    val firstRemaining = remaining.firstOrNull()
                    if (firstRemaining != null && firstRemaining.id.isNotBlank()) {
                        collRef.document(firstRemaining.id).update(
                            mapOf(
                                "isDefault" to true,
                                "userId" to uid,
                                "id" to firstRemaining.id,
                                "updatedAt" to System.currentTimeMillis()
                            )
                        ).await()
                        Log.d("ADDRESS_DEBUG", "Promoted new default address: ${firstRemaining.id}")
                    }
                }
            } catch (e: Exception) {
                Log.e("ADDRESS_DEBUG", "Error deleting address", e)
            }
        }
    }

    fun updateSettings(newSettings: CustomerSettings) {
        repository.updateSettings(newSettings)
    }

    fun savePreferences(newSettings: CustomerSettings, context: Context) {
        repository.updateSettings(newSettings)
        val mode = when (newSettings.themeMode.lowercase()) {
            "dark" -> AppThemeMode.DARK
            "light" -> AppThemeMode.LIGHT
            else -> AppThemeMode.SYSTEM
        }
        ProfileThemeManager.setTheme(mode, context)
    }

    fun updateUserProfile(
        nombre: String,
        telefono: String,
        onResult: (Boolean, String?) -> Unit
    ) {
        val uid = auth.currentUser?.uid ?: return onResult(false, "Usuario no autenticado")
        viewModelScope.launch {
            try {
                val cleanNombre = nombre.trim()
                val cleanPhone = telefono.trim()
                val updates = mutableMapOf<String, Any>(
                    "nombre" to cleanNombre,
                    "name" to cleanNombre,
                    "telefono" to cleanPhone,
                    "phone" to cleanPhone,
                    "updatedAt" to System.currentTimeMillis()
                )
                db.collection("users").document(uid).update(updates).await()

                try {
                    val profileUpdates = userProfileChangeRequest {
                        displayName = cleanNombre
                    }
                    auth.currentUser?.updateProfile(profileUpdates)?.await()
                } catch (e: Exception) {
                    Log.w("PROFILE_DEBUG", "No se pudo actualizar Auth displayName: ${e.message}")
                }

                _currentUser.value = _currentUser.value?.copy(
                    nombre = cleanNombre,
                    name = cleanNombre,
                    telefono = cleanPhone,
                    phone = cleanPhone
                )
                onResult(true, null)
            } catch (e: Exception) {
                Log.e("PROFILE_DEBUG", "Error actualizando perfil en Firestore", e)
                onResult(false, e.localizedMessage ?: "Error al actualizar perfil")
            }
        }
    }

    fun uploadAvatar(
        imageUri: Uri,
        context: Context,
        onResult: (Boolean, String?) -> Unit
    ) {
        val uid = auth.currentUser?.uid ?: return onResult(false, "Usuario no autenticado")
        viewModelScope.launch {
            try {
                val inputStream = context.contentResolver.openInputStream(imageUri)
                    ?: return@launch onResult(false, "No se pudo leer la imagen seleccionada")
                val originalBitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
                inputStream.close()

                if (originalBitmap == null) {
                    return@launch onResult(false, "Formato de imagen no válido")
                }

                val maxDimension = 800
                val width = originalBitmap.width
                val height = originalBitmap.height
                val scaledBitmap = if (width > maxDimension || height > maxDimension) {
                    val ratio = width.toFloat() / height.toFloat()
                    val newWidth = if (ratio > 1) maxDimension else (maxDimension * ratio).toInt()
                    val newHeight = if (ratio > 1) (maxDimension / ratio).toInt() else maxDimension
                    android.graphics.Bitmap.createScaledBitmap(originalBitmap, newWidth, newHeight, true)
                } else {
                    originalBitmap
                }

                val baos = ByteArrayOutputStream()
                scaledBitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 80, baos)
                val byteArray = baos.toByteArray()

                if (byteArray.size > 5 * 1024 * 1024) {
                    return@launch onResult(false, "La imagen comprimida excede el límite de 5MB")
                }

                val storageRef = FirebaseStorage.getInstance().reference
                    .child("avatars/$uid/avatar_${System.currentTimeMillis()}.jpg")

                val metadata = StorageMetadata.Builder()
                    .setContentType("image/jpeg")
                    .build()

                storageRef.putBytes(byteArray, metadata).await()
                val downloadUrl = storageRef.downloadUrl.await().toString()

                db.collection("users").document(uid).update(
                    mapOf(
                        "photoUrl" to downloadUrl,
                        "updatedAt" to System.currentTimeMillis()
                    )
                ).await()

                try {
                    val profileUpdates = userProfileChangeRequest {
                        photoUri = Uri.parse(downloadUrl)
                    }
                    auth.currentUser?.updateProfile(profileUpdates)?.await()
                } catch (e: Exception) {
                    Log.w("PROFILE_DEBUG", "No se pudo actualizar Auth photoUri: ${e.message}")
                }

                _currentUser.value = _currentUser.value?.copy(photoUrl = downloadUrl)
                onResult(true, null)
            } catch (e: Exception) {
                Log.e("PROFILE_DEBUG", "Error subiendo avatar a Storage", e)
                onResult(false, e.localizedMessage ?: "Error al subir foto de perfil")
            }
        }
    }

    fun addWalletTopUp(amount: Double) {
        repository.addWalletTopUp(amount)
    }

    override fun onCleared() {
        super.onCleared()
        addressesListener?.remove()
        addressesListener = null
        ordersListener?.remove()
        ordersListener = null
        supportConfigListener?.remove()
        supportConfigListener = null
        supportTicketsListener?.remove()
        supportTicketsListener = null
        ticketMessagesListener?.remove()
        ticketMessagesListener = null
        repository.stopListening()
    }
}
