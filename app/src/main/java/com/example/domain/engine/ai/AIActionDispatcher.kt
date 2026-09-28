package com.example.domain.engine.ai

import android.util.Log
import androidx.navigation.NavController
import com.example.Screen
import com.example.domain.model.ai.AIAction
import com.example.domain.model.ai.AIActionType

/**
 * Estatus determinístico de la resolución de una acción de IA (Phase C3-F)
 */
enum class AIDispatchStatus {
    SUCCESS,
    REJECTED_UNKNOWN_ACTION,
    REJECTED_MALFORMED_PARAMETERS,
    REJECTED_ARBITRARY_ROUTE,
    REJECTED_UNAUTHORIZED,
    REQUIRES_CONFIRMATION
}

/**
 * Resultado del despacho de acción de IA (Phase C3-F)
 */
data class AIDispatchResult(
    val status: AIDispatchStatus,
    val targetRouteResolved: String? = null,
    val message: String? = null
)

/**
 * BlueSystem Delivery Enterprise — Customer AI Action Dispatcher (Phase C3-F)
 *
 * Responsabilidades:
 * - Recibir acciones tipadas [AIAction] emitidas por la capa de IA / ViewModel.
 * - Validar de forma exhaustiva los parámetros y tipo de acción contra una lista blanca estricta.
 * - Rechazar categóricamente cualquier intento de inyección de rutas arbitrarias, scripts o escalada de privilegios.
 * - Mapear acciones válidas a rutas y pantallas EXISTENTES de la aplicación (Product, Business, Order, Tracking, Cart, etc.).
 * - Preservar los límites de autenticación, aislamiento multi-tenant y la Puerta de Confirmación (Level 3/4).
 * - CERO acceso directo a Gemini o Firestore.
 * - CERO exposición de coordenadas GPS brutas hacia el modelo de IA.
 */
class AIActionDispatcher(
    private val isUserAuthenticatedProvider: () -> Boolean = { false }
) {
    companion object {
        private const val TAG = "AI_ACTION_DISPATCHER"
        private val SAFE_ID_REGEX = Regex("^[a-zA-Z0-9_-]{1,64}$")
    }

    /**
     * Valida y despacha una acción de IA hacia el sistema de navegación existente.
     *
     * @param action Acción estructurada emitida por el Asistente de IA.
     * @param navController Controlador de navegación de Jetpack Compose (opcional si solo se valida/resuelve ruta).
     * @return [AIDispatchResult] indicando el estatus y la ruta resuelta.
     */
    fun dispatch(
        action: AIAction,
        navController: NavController? = null
    ): AIDispatchResult {
        Log.d(TAG, "Procesando acción de IA: ${action.actionType}, params: ${action.parameters.keys}")

        // 1. Verificación de Autenticación si la acción lo requiere
        if (action.requiresAuthentication && !isUserAuthenticatedProvider()) {
            Log.w(TAG, "Acción ${action.actionType} rechazada: Requiere autenticación activa")
            return AIDispatchResult(
                status = AIDispatchStatus.REJECTED_UNAUTHORIZED,
                message = "La acción requiere que el usuario inicie sesión."
            )
        }

        // 2. Verificación de Puerta de Confirmación (Level 3 / Level 4)
        // El Dispatcher NUNCA ejecuta mutaciones sensibles sin confirmación previa
        if (action.requiresConfirmation ||
            action.actionType == AIActionType.REQUEST_ORDER_CONFIRMATION ||
            action.actionType == AIActionType.REQUEST_CANCEL_CONFIRMATION
        ) {
            Log.d(TAG, "Acción ${action.actionType} interceptada por Confirmation Gate")
            return AIDispatchResult(
                status = AIDispatchStatus.REQUIRES_CONFIRMATION,
                message = "La acción requiere confirmación explícita del usuario."
            )
        }

        // 3. Resolución y Validación de Destino contra Allowlist Estricto
        val resolvedRoute = when (action.actionType) {
            AIActionType.OPEN_PRODUCT -> resolveOpenProduct(action.parameters)
            AIActionType.OPEN_BUSINESS -> resolveOpenBusiness(action.parameters)
            AIActionType.OPEN_ORDER -> resolveOpenOrder(action.parameters)
            AIActionType.OPEN_TRACKING -> resolveOpenTracking(action.parameters)
            AIActionType.OPEN_CART -> "customer_dashboard?tab=2"
            AIActionType.OPEN_CHECKOUT -> "customer_dashboard?tab=2"
            AIActionType.OPEN_ADDRESS_MANAGER -> Screen.AddressManager.route
            AIActionType.RENDER_PRODUCT_CARD,
            AIActionType.RENDER_TRACKING_CARD -> {
                // Son acciones puras de presentación en el Overlay, no requieren navegación en NavHost
                return AIDispatchResult(
                    status = AIDispatchStatus.SUCCESS,
                    message = "Acción de renderizado UI consumida en Overlay"
                )
            }
            else -> null
        }

        if (resolvedRoute == null) {
            Log.w(TAG, "Parámetros inválidos o acción no resoluble: ${action.actionType}")
            return AIDispatchResult(
                status = AIDispatchStatus.REJECTED_MALFORMED_PARAMETERS,
                message = "Parámetros insuficientes o inválidos para la acción solicitada."
            )
        }

        // 4. Protección contra inyección de rutas arbitrarias o escaladas
        if (!isAllowlistedRoute(resolvedRoute)) {
            Log.e(TAG, "⛔ Intento de navegación a ruta no permitida: $resolvedRoute")
            return AIDispatchResult(
                status = AIDispatchStatus.REJECTED_ARBITRARY_ROUTE,
                message = "Destino bloqueado por políticas de seguridad."
            )
        }

        // 5. Ejecución en NavController si está disponible
        navController?.let { nav ->
            try {
                nav.navigate(resolvedRoute)
                Log.d(TAG, "Navegación exitosa a ruta existente: $resolvedRoute")
            } catch (e: Exception) {
                Log.e(TAG, "Error al invocar NavController para ruta $resolvedRoute", e)
            }
        }

        return AIDispatchResult(
            status = AIDispatchStatus.SUCCESS,
            targetRouteResolved = resolvedRoute
        )
    }

    private fun resolveOpenProduct(params: Map<String, String>): String? {
        val businessId = params["businessId"]?.trim()
        val productId = params["productId"]?.trim()

        if (!businessId.isNullOrBlank() && SAFE_ID_REGEX.matches(businessId)) {
            return "comercio_detalle_screen/$businessId"
        }
        if (!productId.isNullOrBlank() && SAFE_ID_REGEX.matches(productId)) {
            val fallbackBiz = params["businessId"] ?: ""
            if (fallbackBiz.isNotBlank() && SAFE_ID_REGEX.matches(fallbackBiz)) {
                return "comercio_detalle_screen/$fallbackBiz"
            }
        }
        return null
    }

    private fun resolveOpenBusiness(params: Map<String, String>): String? {
        val businessId = params["businessId"]?.trim() ?: params["id"]?.trim()
        if (!businessId.isNullOrBlank() && SAFE_ID_REGEX.matches(businessId)) {
            return "comercio_detalle_screen/$businessId"
        }
        return null
    }

    private fun resolveOpenOrder(params: Map<String, String>): String? {
        val orderId = params["orderId"]?.trim() ?: params["id"]?.trim()
        if (!orderId.isNullOrBlank()) {
            if (SAFE_ID_REGEX.matches(orderId)) {
                return Screen.OrderDetail.createRoute(orderId)
            }
            return null
        }
        return Screen.OrdersHistory.route
    }

    private fun resolveOpenTracking(params: Map<String, String>): String? {
        val orderId = params["orderId"]?.trim() ?: params["pedidoId"]?.trim()
        val motorizadoId = params["motorizadoId"]?.trim() ?: params["courierId"]?.trim()

        if (!orderId.isNullOrBlank() && SAFE_ID_REGEX.matches(orderId)) {
            if (!motorizadoId.isNullOrBlank() && SAFE_ID_REGEX.matches(motorizadoId)) {
                return Screen.TrackingPedido.createRoute(orderId, motorizadoId)
            }
            return Screen.OrderDetail.createRoute(orderId)
        }
        return null
    }

    /**
     * Lista blanca inmutable de patrones de rutas canónicas permitidas para navegación desde IA.
     */
    private fun isAllowlistedRoute(route: String): Boolean {
        return when {
            route.startsWith("comercio_detalle_screen/") -> true
            route.startsWith("order_detail/") -> true
            route.startsWith("tracking_pedido/") -> true
            route == "customer_dashboard?tab=2" -> true
            route == Screen.OrdersHistory.route -> true
            route == Screen.AddressManager.route -> true
            route == Screen.SolicitarEnvio.route -> true
            else -> false
        }
    }
}
