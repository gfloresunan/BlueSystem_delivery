package com.example.data.repository

import android.util.Log
import com.example.domain.model.ai.*
import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.tasks.await

/**
 * BlueSystem Delivery Enterprise — Customer AI Repository (Phase C3-E)
 *
 * Cliente tipado y seguro para invocar los endpoints de IA en Cloud Functions:
 * - processCustomerAIChat (Conversación natural orquestada con Gemini + Confirmation Gate)
 * - customerAIGateway (Despacho directo de herramientas backend autoritativas)
 *
 * REGLAS DE SEGURIDAD INVIOLABLES:
 * - NUNCA expone ni almacena API Keys de Gemini en Android.
 * - NUNCA consulta Firestore directamente para razonamiento de IA.
 * - NUNCA calcula precios o totales financieros (autoridad 100% backend).
 * - La identidad del cliente se deriva exclusivamente del token de Firebase Auth.
 */
open class CustomerAIRepository(
    private val functions: FirebaseFunctions = FirebaseFunctions.getInstance()
) {
    companion object {
        private const val TAG = "CUSTOMER_AI_REPO"
    }

    /**
     * Envía un mensaje natural a processCustomerAIChat y mapea la respuesta estructurada.
     */
    open suspend fun sendChatMessage(
        message: String,
        conversationHistory: List<Map<String, String>> = emptyList(),
        confirmedToken: String? = null,
        customerLat: Double? = null,
        customerLng: Double? = null
    ): Result<CustomerAIResponse> {
        return try {
            val payload = HashMap<String, Any?>().apply {
                put("message", message)
                if (conversationHistory.isNotEmpty()) {
                    put("conversationHistory", conversationHistory)
                }
                if (!confirmedToken.isNullOrBlank()) {
                    put("confirmedToken", confirmedToken)
                }
                if (customerLat != null && customerLng != null) {
                    put("customerLat", customerLat)
                    put("customerLng", customerLng)
                }
            }

            val result = functions.getHttpsCallable("processCustomerAIChat")
                .call(payload)
                .await()

            val data = result.data as? Map<*, *>
            if (data == null) {
                return Result.failure(IllegalStateException("Respuesta vacía del gateway de IA"))
            }

            val parsedResponse = parseCustomerAIResponse(data)
            Result.success(parsedResponse)
        } catch (e: Exception) {
            Log.e(TAG, "Error invocando processCustomerAIChat: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Ejecuta una herramienta backend autoritativa (usado también tras confirmación explícita).
     */
    open suspend fun executeBackendTool(
        toolId: String,
        parameters: Map<String, Any?>,
        confirmedByUser: Boolean = false,
        confirmationToken: String? = null
    ): Result<ToolResult> {
        return try {
            val payload = HashMap<String, Any?>().apply {
                put("toolId", toolId)
                put("parameters", parameters)
                put("confirmedByUser", confirmedByUser)
                if (!confirmationToken.isNullOrBlank()) {
                    put("confirmationToken", confirmationToken)
                }
            }

            val result = functions.getHttpsCallable("customerAIGateway")
                .call(payload)
                .await()

            val data = result.data as? Map<*, *>
            if (data == null) {
                return Result.failure(IllegalStateException("Respuesta vacía al ejecutar tool: $toolId"))
            }

            val toolResult = parseToolResult(data, toolId)
            Result.success(toolResult)
        } catch (e: Exception) {
            Log.e(TAG, "Error ejecutando backend tool $toolId: ${e.message}", e)
            Result.failure(e)
        }
    }

    // ============================================================================
    // MAPPERS PRIVADOS SEGUROS
    // ============================================================================

    private fun parseCustomerAIResponse(map: Map<*, *>): CustomerAIResponse {
        val text = map["text"] as? String ?: ""
        val intent = map["intent"] as? String ?: "GENERAL_QUERY"
        val executionId = map["executionId"] as? String ?: "exec_${System.currentTimeMillis()}"

        // Parse Cards
        val rawCards = map["cards"] as? List<*> ?: emptyList<Any>()
        val cards = rawCards.mapNotNull { item ->
            val cardMap = item as? Map<*, *> ?: return@mapNotNull null
            parseCard(cardMap)
        }

        // Parse Actions
        val rawActions = map["actions"] as? List<*> ?: emptyList<Any>()
        val actions = rawActions.mapNotNull { item ->
            val actionMap = item as? Map<*, *> ?: return@mapNotNull null
            parseAction(actionMap)
        }

        // Parse Pending Confirmation
        val rawConfirmation = map["pendingConfirmation"] as? Map<*, *>
        val pendingConfirmation = rawConfirmation?.let { parsePendingConfirmation(it) }

        return CustomerAIResponse(
            responseId = executionId,
            conversationId = executionId,
            message = text,
            cards = cards,
            actions = actions,
            confirmationRequired = pendingConfirmation != null,
            pendingConfirmation = pendingConfirmation,
            serverTimestamp = System.currentTimeMillis()
        )
    }

    private fun parsePendingConfirmation(map: Map<*, *>): PendingConfirmation {
        val confirmationToken = map["confirmationToken"] as? String ?: ""
        val summary = map["summary"] as? String ?: "Confirmación requerida"
        val toolId = map["toolId"] as? String ?: ""
        val expiresAt = (map["expiresAt"] as? Number)?.toLong() ?: (System.currentTimeMillis() + 300000L)

        val rawBreakdown = map["financialBreakdown"] as? Map<*, *>
        val financialBreakdown = rawBreakdown?.let {
            FinancialBreakdown(
                subtotal = (it["subtotal"] as? Number)?.toDouble() ?: 0.0,
                deliveryFee = (it["deliveryFee"] as? Number)?.toDouble() ?: 0.0,
                discount = (it["discount"] as? Number)?.toDouble() ?: 0.0,
                total = (it["total"] as? Number)?.toDouble() ?: 0.0,
                currency = "C$"
            )
        }

        val actionType = when (toolId) {
            "tool_create_authoritative_order" -> AIActionType.REQUEST_ORDER_CONFIRMATION
            "tool_cancel_order" -> AIActionType.REQUEST_CANCEL_CONFIRMATION
            else -> AIActionType.REQUEST_ORDER_CONFIRMATION
        }

        return PendingConfirmation(
            confirmationNonce = confirmationToken,
            actionType = actionType,
            summaryText = summary,
            financialBreakdown = financialBreakdown,
            expiresAtTimestamp = expiresAt
        )
    }

    private fun parseCard(map: Map<*, *>): AICard? {
        val cardType = map["cardType"] as? String ?: map["type"] as? String ?: return null
        return when (cardType) {
            "PRODUCT_CARD" -> {
                AIProductCard(
                    productId = map["productId"] as? String ?: "",
                    businessId = map["businessId"] as? String ?: "",
                    businessName = map["businessName"] as? String ?: "",
                    name = map["name"] as? String ?: "",
                    description = map["description"] as? String ?: "",
                    price = (map["price"] as? Number)?.toDouble() ?: 0.0,
                    originalPrice = (map["originalPrice"] as? Number)?.toDouble(),
                    discountPercentage = (map["discountPercentage"] as? Number)?.toInt() ?: 0,
                    imageUrl = map["imageUrl"] as? String ?: "",
                    rating = (map["rating"] as? Number)?.toDouble() ?: 0.0,
                    isAvailable = map["isAvailable"] as? Boolean ?: true,
                    hasRequiredOptions = map["hasRequiredOptions"] as? Boolean ?: false
                )
            }
            "BUSINESS_CARD" -> {
                AIBusinessCard(
                    businessId = map["businessId"] as? String ?: "",
                    name = map["name"] as? String ?: "",
                    category = map["category"] as? String ?: "",
                    logoUrl = map["logoUrl"] as? String ?: "",
                    rating = (map["rating"] as? Number)?.toDouble() ?: 0.0,
                    deliveryFee = (map["deliveryFee"] as? Number)?.toDouble() ?: 0.0,
                    distanceKm = (map["distanceKm"] as? Number)?.toDouble() ?: 0.0,
                    formattedDistance = map["formattedDistance"] as? String ?: "",
                    estimatedDeliveryMinutes = (map["estimatedDeliveryMinutes"] as? Number)?.toInt() ?: 0,
                    isOpen = map["isOpen"] as? Boolean ?: true
                )
            }
            "ORDER_CARD" -> {
                AIOrderCard(
                    orderId = map["orderId"] as? String ?: "",
                    businessName = map["businessName"] as? String ?: "",
                    status = map["status"] as? String ?: "",
                    statusLabel = map["statusLabel"] as? String ?: map["status"] as? String ?: "",
                    itemsSummary = map["itemsSummary"] as? String ?: "${(map["itemCount"] as? Number)?.toInt() ?: 0} items",
                    total = (map["total"] as? Number)?.toDouble() ?: 0.0,
                    paymentMethod = map["paymentMethod"] as? String ?: "Efectivo",
                    createdAtFormatted = map["createdAtFormatted"] as? String ?: "",
                    courierAssigned = map["courierAssigned"] as? Boolean ?: false
                )
            }
            "TRACKING_CARD" -> {
                AITrackingCard(
                    orderId = map["orderId"] as? String ?: "",
                    status = map["status"] as? String ?: map["orderStatus"] as? String ?: "EN_CAMINO",
                    statusLabel = map["statusLabel"] as? String ?: "En camino",
                    courierDisplayName = map["courierDisplayName"] as? String ?: map["courierName"] as? String ?: "Repartidor Asignado",
                    courierPlate = map["courierPlate"] as? String ?: "",
                    distanceKm = (map["distanceKm"] as? Number)?.toDouble() ?: (map["distanceRemainingKm"] as? Number)?.toDouble() ?: 0.0,
                    etaMinutes = (map["etaMinutes"] as? Number)?.toInt() ?: (map["estimatedMinutesArrival"] as? Number)?.toInt() ?: 0,
                    signalFreshnessSeconds = (map["signalFreshnessSeconds"] as? Number)?.toInt() ?: 0,
                    isMoving = map["isMoving"] as? Boolean ?: true
                )
            }
            else -> null
        }
    }

    private fun parseAction(map: Map<*, *>): AIAction {
        val typeStr = map["type"] as? String ?: ""
        val payload = (map["payload"] as? Map<*, *>)?.mapNotNull { (k, v) ->
            if (k != null && v != null) k.toString() to v.toString() else null
        }?.toMap() ?: emptyMap()

        val actionType = try {
            AIActionType.valueOf(typeStr)
        } catch (_: Exception) {
            when (typeStr) {
                "EXECUTE_LOCAL_TOOL" -> AIActionType.OPEN_PRODUCT
                "REQUEST_CONFIRMATION" -> AIActionType.REQUEST_ORDER_CONFIRMATION
                else -> AIActionType.OPEN_PRODUCT
            }
        }

        return AIAction(
            actionId = "act_${System.currentTimeMillis()}",
            actionType = actionType,
            targetRoute = payload["targetRoute"],
            parameters = payload
        )
    }

    private fun parseToolResult(map: Map<*, *>, toolId: String): ToolResult {
        val success = map["success"] as? Boolean ?: false
        val statusStr = map["status"] as? String ?: if (success) "COMPLETED" else "FAILED"
        val status = try {
            ToolResultStatus.valueOf(statusStr)
        } catch (_: Exception) {
            if (success) ToolResultStatus.COMPLETED else ToolResultStatus.FAILED
        }

        val sanitizedContext = map["sanitizedLlmContext"] as? String ?: ""
        val rawSummary = map["rawOutputSummary"] as? String ?: ""
        val rawUiPayload = (map["uiPayload"] as? Map<*, *>)?.mapNotNull { (k, v) ->
            if (k != null && v != null) k.toString() to v.toString() else null
        }?.toMap() ?: emptyMap()

        val errorMap = map["error"] as? Map<*, *>
        val error = errorMap?.let {
            val codeStr = it["code"] as? String ?: "INTERNAL_ERROR"
            val code = try {
                AIErrorCode.valueOf(codeStr)
            } catch (_: Exception) {
                AIErrorCode.INTERNAL_ERROR
            }
            AIError(
                code = code,
                userMessage = it["userMessage"] as? String ?: "Error en la operación",
                technicalReason = it["technicalReason"] as? String ?: "",
                recoverable = it["recoverable"] as? Boolean ?: false,
                requiresClarification = it["requiresClarification"] as? Boolean ?: false,
                suggestedAction = it["suggestedAction"] as? String
            )
        }

        return ToolResult(
            toolId = toolId,
            status = status,
            success = success,
            sanitizedLlmContext = sanitizedContext,
            rawOutputSummary = rawSummary,
            uiPayload = rawUiPayload,
            error = error
        )
    }
}
