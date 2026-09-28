package com.example.data.repository

import android.util.Log
import com.example.domain.model.ChatDomain
import com.example.domain.model.OrderChatMessage
import com.example.domain.model.OrderChatMessageType
import com.example.domain.model.OrderChatSenderRole
import com.example.domain.model.OrderChatMessageStatus
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID

class OrderChatRepository(
    private val db: FirebaseFirestore = FirebaseFirestore.getInstance(),
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    companion object {
        private const val TAG = "OrderChatRepo"

        fun getParentCollectionName(domain: ChatDomain): String = when (domain) {
            ChatDomain.COMMERCE_ORDER -> "orders"
            ChatDomain.X_TO_Y_TRIP -> "deliveryTrips"
        }
    }

    private fun getMessagesCollectionRef(domain: ChatDomain, conversationId: String) =
        db.collection(getParentCollectionName(domain))
            .document(conversationId)
            .collection("messages")

    /**
     * Escucha en tiempo real los mensajes de un pedido o viaje ordenados cronológicamente
     */
    fun listenOrderMessages(
        conversationId: String,
        domain: ChatDomain = ChatDomain.COMMERCE_ORDER
    ): Flow<List<OrderChatMessage>> = callbackFlow {
        if (conversationId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val parentCollection = getParentCollectionName(domain)
        val path = "$parentCollection/$conversationId/messages"
        Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | LISTENER_ATTACHED")

        val listener = getMessagesCollectionRef(domain, conversationId)
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | LISTENER_ERROR | msg=${error.message}", error)
                    Log.e(TAG, "Error escuchando mensajes en $path: ${error.message}", error)
                    // Do not close if offline; Firestore continues to serve local cache
                    return@addSnapshotListener
                }

                if (snapshot != null) {
                    val messages = snapshot.documents.mapNotNull { doc ->
                        try {
                            val msg = doc.toObject(OrderChatMessage::class.java)
                            msg?.copy(
                                id = doc.id,
                                isPendingSync = doc.metadata.hasPendingWrites()
                            )
                        } catch (e: Exception) {
                            Log.w(TAG, "Error deserializando mensaje ${doc.id}", e)
                            null
                        }
                    }
                    Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | SNAPSHOT_RECEIVED | count=${messages.size}")
                    trySend(messages)
                }
            }

        awaitClose {
            Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | LISTENER_REMOVED")
            Log.d(TAG, "Removiendo listener de mensajes para $path")
            listener.remove()
        }
    }

    /**
     * Envía un mensaje de texto atómicamente con ID idempotente en el dominio especificado
     */
    suspend fun sendMessage(
        conversationId: String,
        text: String,
        senderRole: OrderChatSenderRole,
        senderName: String,
        domain: ChatDomain = ChatDomain.COMMERCE_ORDER,
        tenantId: String = "",
        businessId: String = ""
    ): Result<String> {
        val currentUser = auth.currentUser ?: return Result.failure(IllegalStateException("No authenticated user"))
        val trimmedText = text.trim()
        if (trimmedText.isEmpty()) {
            return Result.failure(IllegalArgumentException("El mensaje no puede estar vacío"))
        }
        if (trimmedText.length > 2000) {
            return Result.failure(IllegalArgumentException("El mensaje excede el límite de 2000 caracteres"))
        }

        val parentCollection = getParentCollectionName(domain)
        val messageId = "msg_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(8)}"
        val path = "$parentCollection/$conversationId/messages/$messageId"

        Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | AUTH_UID=${currentUser.uid} | SENDER_ID=${currentUser.uid} | SENDER_ROLE=${senderRole.name} | REPOSITORY_SEND_INVOKED | textLength=${trimmedText.length} | messageId=$messageId")

        val messageDocRef = getMessagesCollectionRef(domain, conversationId).document(messageId)

        val messagePayload = hashMapOf<String, Any>(
            "id" to messageId,
            "orderId" to conversationId, // Always populated as alias/canonical
            "tripId" to (if (domain == ChatDomain.X_TO_Y_TRIP) conversationId else ""),
            "domain" to domain.name,
            "senderId" to currentUser.uid,
            "senderRole" to senderRole.name,
            "senderNameSnapshot" to senderName,
            "senderName" to senderName,
            "text" to trimmedText,
            "type" to OrderChatMessageType.TEXT.name,
            "createdAt" to FieldValue.serverTimestamp(),
            "readBy" to listOf(currentUser.uid),
            "status" to OrderChatMessageStatus.SENT.name,
            "tenantId" to tenantId,
            "businessId" to businessId
        )

        return try {
            Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | AUTH_UID=${currentUser.uid} | SENDER_ID=${currentUser.uid} | SENDER_ROLE=${senderRole.name} | WRITE_START")
            messageDocRef.set(messagePayload).await()
            Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | AUTH_UID=${currentUser.uid} | SENDER_ID=${currentUser.uid} | SENDER_ROLE=${senderRole.name} | WRITE_SUCCESS | messageId=$messageId")
            Log.d(TAG, "Mensaje $messageId enviado con éxito a $path")
            Result.success(messageId)
        } catch (e: Exception) {
            Log.e("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | AUTH_UID=${currentUser.uid} | SENDER_ID=${currentUser.uid} | SENDER_ROLE=${senderRole.name} | WRITE_ERROR | error=${e.message}", e)
            Log.e(TAG, "Error enviando mensaje a $path", e)
            Result.failure(e)
        }
    }

    /**
     * Registra un evento de llamada en el historial del pedido o viaje
     */
    suspend fun recordCallEvent(
        conversationId: String,
        callerRole: OrderChatSenderRole,
        callerName: String,
        domain: ChatDomain = ChatDomain.COMMERCE_ORDER,
        tenantId: String = "",
        businessId: String = ""
    ): Result<String> {
        val currentUser = auth.currentUser ?: return Result.failure(IllegalStateException("No authenticated user"))
        val messageId = "call_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(8)}"
        val parentCollection = getParentCollectionName(domain)
        val path = "$parentCollection/$conversationId/messages/$messageId"
        val messageDocRef = getMessagesCollectionRef(domain, conversationId).document(messageId)

        val callText = if (callerRole == OrderChatSenderRole.CUSTOMER) {
            "📞 Cliente inició llamada al motorizado"
        } else {
            "📞 Motorizado inició llamada al cliente"
        }

        val payload = hashMapOf<String, Any>(
            "id" to messageId,
            "orderId" to conversationId,
            "tripId" to (if (domain == ChatDomain.X_TO_Y_TRIP) conversationId else ""),
            "domain" to domain.name,
            "senderId" to currentUser.uid,
            "senderRole" to callerRole.name,
            "senderNameSnapshot" to callerName,
            "senderName" to callerName,
            "text" to callText,
            "type" to OrderChatMessageType.CALL_EVENT.name,
            "createdAt" to FieldValue.serverTimestamp(),
            "readBy" to listOf(currentUser.uid),
            "status" to OrderChatMessageStatus.SENT.name,
            "tenantId" to tenantId,
            "businessId" to businessId
        )

        return try {
            Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | CALL_EVENT_WRITE_START")
            messageDocRef.set(payload).await()
            Log.d("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | CALL_EVENT_WRITE_SUCCESS")
            Log.d(TAG, "Evento de llamada registrado en $path")
            Result.success(messageId)
        } catch (e: Exception) {
            Log.e("CHAT_DEBUG", "[CHAT_DEBUG] DOMAIN=${domain.name} | CONVERSATION_ID=$conversationId | PATH=$path | CALL_EVENT_WRITE_ERROR | error=${e.message}", e)
            Log.e(TAG, "Error registrando evento de llamada en $path", e)
            Result.failure(e)
        }
    }

    /**
     * Marca los mensajes no leídos como leídos para el usuario actual y limpia contadores
     */
    suspend fun markMessagesAsRead(
        conversationId: String,
        currentRole: OrderChatSenderRole,
        domain: ChatDomain = ChatDomain.COMMERCE_ORDER
    ) {
        val currentUid = auth.currentUser?.uid ?: return
        val parentCollection = getParentCollectionName(domain)
        try {
            val unreadQuery = getMessagesCollectionRef(domain, conversationId)
                .whereNotEqualTo("senderId", currentUid)
                .limit(20)
                .get()
                .await()

            for (doc in unreadQuery.documents) {
                val readBy = (doc.get("readBy") as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList()
                if (!readBy.contains(currentUid)) {
                    doc.reference.update(
                        mapOf(
                            "readBy" to FieldValue.arrayUnion(currentUid),
                            "readAt" to FieldValue.serverTimestamp(),
                            "status" to OrderChatMessageStatus.READ.name
                        )
                    )
                }
            }

            // Resetear contador unread en el documento padre de forma aislada
            val parentDocRef = db.collection(parentCollection).document(conversationId)
            if (currentRole == OrderChatSenderRole.CUSTOMER) {
                parentDocRef.update("unreadCustomerCount", 0)
            } else if (currentRole == OrderChatSenderRole.COURIER) {
                parentDocRef.update("unreadCourierCount", 0)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Aviso marcando mensajes como leídos en $parentCollection/$conversationId", e)
        }
    }
}

