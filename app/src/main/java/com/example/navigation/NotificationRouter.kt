package com.example.navigation

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.navigation.NavController
import com.example.Screen
import com.example.domain.model.AppNotification
import com.example.domain.model.ChatDomain

/**
 * Módulo Centralizado y Autoritativo de Enrutamiento de Notificaciones y Deep Links (ADR-016 / Sprint 18.1).
 *
 * Convierte cualquier evento de notificación (Push del Sistema, Clic en Notification Center In-App,
 * Intent de Cold Start o Universal Link) en una ruta segura y verificada de navegación Jetpack Compose.
 *
 * Invariantes:
 * 1. Role Guard estricto (un repartidor jamás navega a Customer OrderDetail y viceversa).
 * 2. Fallback Universal ante entidades no encontradas o eliminadas (cero pantallas en blanco / crashes).
 * 3. Backward Compatibility total con esquemas legados (action, screen, orderId, deepLink).
 * 4. Normalización de esquemas canónicos bluesystem://.
 */
object NotificationRouter {

    private const val TAG = "NotificationRouter"

    /**
     * Resuelve la ruta de destino a partir de un AppNotification del Notification Center In-App.
     */
    fun resolve(notification: AppNotification, userRole: String = ""): String {
        return resolveInternal(
            type = notification.type,
            destinationType = notification.destinationType,
            action = notification.action,
            destinationRoute = notification.destinationRoute.ifBlank { notification.deepLink.ifBlank { notification.navigationRoute } },
            fallbackDestination = notification.fallbackDestination,
            orderId = notification.orderId.ifBlank { if (notification.entityType == "order") notification.entityId else "" },
            tripId = notification.tripId.ifBlank { if (notification.entityType == "trip") notification.entityId else "" },
            businessId = notification.businessId.ifBlank { if (notification.entityType == "business") notification.entityId else "" },
            productId = notification.productId.ifBlank { if (notification.entityType == "product") notification.entityId else "" },
            couponId = notification.couponId.ifBlank { if (notification.entityType == "coupon") notification.entityId else "" },
            supportConversationId = notification.supportConversationId.ifBlank { if (notification.entityType == "support_ticket") notification.entityId else "" },
            screen = "",
            domain = "",
            userRole = userRole
        )
    }

    /**
     * Resuelve la ruta de destino a partir de los extras de un Intent o notificación push del sistema.
     */
    fun resolve(intent: Intent?, userRole: String = ""): String? {
        if (intent == null) return null
        val extras = intent.extras ?: Bundle()

        val type = extras.getString("type") ?: ""
        val destinationType = extras.getString("destinationType") ?: ""
        val action = extras.getString("action") ?: ""
        val destinationRoute = extras.getString("destinationRoute")
            ?: extras.getString("deepLink")
            ?: extras.getString("navigationRoute")
            ?: ""
        val fallbackDestination = extras.getString("fallbackDestination") ?: ""
        val orderId = extras.getString("orderId") ?: ""
        val tripId = extras.getString("tripId") ?: ""
        val businessId = extras.getString("businessId") ?: ""
        val productId = extras.getString("productId") ?: ""
        val couponId = extras.getString("couponId") ?: ""
        val supportConversationId = extras.getString("supportConversationId") ?: ""
        val screen = extras.getString("screen") ?: ""
        val domain = extras.getString("domain") ?: ""

        val resolved = resolveInternal(
            type = type,
            destinationType = destinationType,
            action = action,
            destinationRoute = destinationRoute,
            fallbackDestination = fallbackDestination,
            orderId = orderId,
            tripId = tripId,
            businessId = businessId,
            productId = productId,
            couponId = couponId,
            supportConversationId = supportConversationId,
            screen = screen,
            domain = domain,
            userRole = userRole
        )

        return resolved.ifBlank { null }
    }

    /**
     * Normaliza URIs profundas canónicas (bluesystem://...) a rutas internas de Compose.
     */
    fun parseDeepLinkUri(uri: Uri): String? {
        val scheme = uri.scheme?.lowercase() ?: return null
        if (scheme != "bluesystem" && scheme != "https") return null

        val host = uri.host?.lowercase() ?: ""
        val path = uri.path ?: ""
        val rawFullPath = if (host.isNotEmpty()) "$host$path" else path.trimStart('/')
        val fullPath = rawFullPath.trim('/')
        val normalizedPath = fullPath.removePrefix("customer/").removePrefix("customer").trimStart('/')

        val qBizId = uri.getQueryParameter("businessId") ?: ""
        val qProdId = uri.getQueryParameter("productId") ?: ""
        val qCouponId = uri.getQueryParameter("couponId") ?: ""
        val qConvId = uri.getQueryParameter("conversationId") ?: ""

        return when {
            // bluesystem://customer/home | bluesystem://customer_dashboard
            normalizedPath.isEmpty() || normalizedPath == "home" || normalizedPath == "dashboard" || fullPath.startsWith("customer_dashboard") -> {
                "customer_dashboard"
            }
            // bluesystem://customer/coupons | bluesystem://coupon/{couponId}
            normalizedPath == "coupons" -> {
                if (qCouponId.isNotBlank()) "customer_coupons?couponId=$qCouponId" else Screen.CustomerCoupons.route
            }
            normalizedPath.matches(Regex("coupon/[^/]+.*")) -> {
                val segments = normalizedPath.split("/")
                val couponId = segments.getOrNull(1) ?: qCouponId
                if (couponId.isNotBlank()) "customer_coupons?couponId=$couponId" else Screen.CustomerCoupons.route
            }
            // bluesystem://customer/orders | bluesystem://orders
            normalizedPath == "orders" -> {
                Screen.OrdersHistory.route
            }
            // bluesystem://orders/{orderId}/tracking | bluesystem://customer/orders/{orderId}/tracking | bluesystem://customer/order_tracking/{orderId}
            normalizedPath.matches(Regex("orders/[^/]+/tracking.*")) || normalizedPath.matches(Regex("order_tracking/[^/]+.*")) -> {
                val segments = normalizedPath.split("/")
                val orderId = segments.getOrNull(1) ?: ""
                if (orderId.isNotBlank()) "customer/order_tracking/$orderId" else "orders_history"
            }
            // bluesystem://orders/{orderId} | bluesystem://customer/orders/{orderId}
            normalizedPath.matches(Regex("orders/[^/]+.*")) -> {
                val segments = normalizedPath.split("/")
                val orderId = segments.getOrNull(1) ?: ""
                if (orderId.isNotBlank()) Screen.OrderDetail.createRoute(orderId) else "orders_history"
            }
            // bluesystem://merchant/{businessId}/product/{productId} | bluesystem://customer/merchant/{businessId}/product/{productId}
            normalizedPath.matches(Regex("merchant/[^/]+/product/[^/]+.*")) -> {
                val segments = normalizedPath.split("/")
                val bizId = segments.getOrNull(1) ?: ""
                val prodId = segments.getOrNull(3) ?: qProdId
                if (bizId.isNotBlank() && prodId.isNotBlank()) {
                    "comercio_detalle_screen/$bizId?productId=$prodId"
                } else if (bizId.isNotBlank()) {
                    "comercio_detalle_screen/$bizId"
                } else {
                    "customer_dashboard"
                }
            }
            // bluesystem://product/{productId}?businessId={businessId} | bluesystem://customer/product/{productId}?businessId={businessId}
            normalizedPath.matches(Regex("product/[^/]+.*")) -> {
                val segments = normalizedPath.split("/")
                val prodId = segments.getOrNull(1) ?: ""
                val bizId = qBizId
                if (bizId.isNotBlank() && prodId.isNotBlank()) {
                    "comercio_detalle_screen/$bizId?productId=$prodId"
                } else if (bizId.isNotBlank()) {
                    "comercio_detalle_screen/$bizId"
                } else {
                    "customer_dashboard"
                }
            }
            // bluesystem://merchant/{businessId} | bluesystem://customer/merchant/{businessId}
            normalizedPath.matches(Regex("merchant/[^/]+.*")) -> {
                val segments = normalizedPath.split("/")
                val bizId = segments.getOrNull(1) ?: ""
                val prodId = qProdId
                if (bizId.isNotBlank() && prodId.isNotBlank()) {
                    "comercio_detalle_screen/$bizId?productId=$prodId"
                } else if (bizId.isNotBlank()) {
                    "comercio_detalle_screen/$bizId"
                } else {
                    "customer_dashboard"
                }
            }
            // bluesystem://support/{conversationId} | bluesystem://customer/support/{conversationId}
            normalizedPath == "support" || normalizedPath == "help" -> {
                if (qConvId.isNotBlank()) "customer_help?conversationId=$qConvId" else "customer_help"
            }
            normalizedPath.matches(Regex("support/[^/]+.*")) || normalizedPath.matches(Regex("help/[^/]+.*")) -> {
                val segments = normalizedPath.split("/")
                val convId = segments.getOrNull(1) ?: qConvId
                if (convId.isNotBlank()) "customer_help?conversationId=$convId" else "customer_help"
            }
            normalizedPath.startsWith("merchant/settlements") || normalizedPath.startsWith("merchant/finance") -> "business_dashboard"
            fullPath.startsWith("courier") || normalizedPath.startsWith("courier") -> Screen.Courier.route
            fullPath.startsWith("business_dashboard") || normalizedPath.startsWith("business_dashboard") -> "business_dashboard"
            // Deep Links Administrativos Enterprise
            fullPath.startsWith("admin/merchant-request") || fullPath.startsWith("admin/merchant_requests") -> com.example.presentation.admin.AdminRoutes.MERCHANT_REQUESTS
            fullPath.startsWith("admin/courier-request") || fullPath.startsWith("admin/courier_requests") -> com.example.presentation.admin.AdminRoutes.COURIER_REQUESTS
            fullPath.startsWith("admin/courier") || fullPath.startsWith("admin/courier_profile_mgmt") -> com.example.presentation.admin.AdminRoutes.COURIER_PROFILE_MGMT
            fullPath.startsWith("admin/support") || fullPath.startsWith("admin/support_center") -> com.example.presentation.admin.AdminRoutes.SUPPORT_CENTER
            fullPath.startsWith("admin/courier-closure") || fullPath.startsWith("admin/courier_cash_center") -> com.example.presentation.admin.AdminRoutes.COURIER_CASH_CENTER
            fullPath.startsWith("admin/commerce") || fullPath.startsWith("admin/enterprise_commerce") -> com.example.presentation.admin.AdminRoutes.ENTERPRISE_COMMERCE
            fullPath.startsWith("admin/configuration") || fullPath.startsWith("admin/global_config") -> com.example.presentation.admin.AdminRoutes.GLOBAL_CONFIG
            fullPath.startsWith("admin/live_courier_monitor") || fullPath.startsWith("admin/couriers_live") -> com.example.presentation.admin.AdminRoutes.LIVE_COURIER_MONITOR
            fullPath.startsWith("admin/identity") || fullPath.startsWith("admin/identity_center") -> com.example.presentation.admin.AdminRoutes.IDENTITY_CENTER
            fullPath.startsWith("admin/notifications") -> com.example.presentation.admin.AdminRoutes.NOTIFICATIONS
            fullPath.startsWith("admin") || normalizedPath.startsWith("admin") -> Screen.Admin.route
            else -> null
        }
    }

    /**
     * Motor central de resolución con Role Guard y Fallback defensivo.
     */
    private fun resolveInternal(
        type: String,
        destinationType: String,
        action: String,
        destinationRoute: String,
        fallbackDestination: String,
        orderId: String,
        tripId: String,
        businessId: String,
        productId: String,
        couponId: String,
        supportConversationId: String,
        screen: String,
        domain: String,
        userRole: String
    ): String {
        val appRole = com.example.domain.model.AppRole.fromString(userRole)
        val isAdmin = appRole == com.example.domain.model.AppRole.ADMIN
        val isCourier = appRole == com.example.domain.model.AppRole.COURIER
        val isMerchant = appRole == com.example.domain.model.AppRole.MERCHANT
        val isCustomer = appRole == com.example.domain.model.AppRole.CUSTOMER

        Log.d(TAG, "Resolviendo destino: type=$type, destType=$destinationType, action=$action, orderId=$orderId, role=$appRole")

        // 0. ROLE GUARD: Administradores Enterprise
        if (isAdmin) {
            when (type.uppercase().trim()) {
                "ADMIN_NEW_MERCHANT_REQUEST" -> return com.example.presentation.admin.AdminRoutes.MERCHANT_REQUESTS
                "ADMIN_NEW_COURIER_REQUEST" -> return com.example.presentation.admin.AdminRoutes.COURIER_REQUESTS
                "ADMIN_COURIER_PROFILE_CHANGE" -> return com.example.presentation.admin.AdminRoutes.COURIER_PROFILE_MGMT
                "ADMIN_SUPPORT_TICKET_CREATED", "ADMIN_SUPPORT_TICKET_PRIORITY" -> return com.example.presentation.admin.AdminRoutes.SUPPORT_CENTER
                "ADMIN_COURIER_CLOSURE_SUBMITTED", "ADMIN_COURIER_CASH_DIFFERENCE" -> return com.example.presentation.admin.AdminRoutes.COURIER_CASH_CENTER
                "ADMIN_COMMERCE_STATUS_CHANGED" -> return com.example.presentation.admin.AdminRoutes.ENTERPRISE_COMMERCE
                "ADMIN_CONFIGURATION_CHANGED" -> return com.example.presentation.admin.AdminRoutes.GLOBAL_CONFIG
                "ADMIN_SYSTEM_ALERT", "ADMIN_INCIDENT_CRITICAL" -> return com.example.presentation.admin.AdminRoutes.NOTIFICATIONS
            }
            if (destinationRoute.isNotBlank() && isKnownInternalRoute(destinationRoute)) {
                return destinationRoute
            }
            return Screen.Admin.route
        }

        // 1. ROLE GUARD: Couriers jamás van a Customer OrderDetail
        if (isCourier) {
            if (action == "TRIP_CHAT_MESSAGE" || (screen == "order_chat" && domain == "X_TO_Y_TRIP")) {
                return Screen.OrderChat.createRoute(tripId.ifBlank { orderId }, ChatDomain.X_TO_Y_TRIP)
            }
            if (action == "ORDER_CHAT_MESSAGE" || screen == "order_chat") {
                return Screen.OrderChat.createRoute(orderId.ifBlank { tripId }, ChatDomain.COMMERCE_ORDER)
            }
            // Toda acción operacional de Courier redirige a su módulo Courier
            return Screen.Courier.route
        }

        // 2. ROLE GUARD: Merchants navegan a su panel comercial
        if (isMerchant) {
            if (action == "ORDER_CHAT_MESSAGE" || screen == "order_chat") {
                return Screen.OrderChat.createRoute(orderId.ifBlank { tripId }, ChatDomain.COMMERCE_ORDER)
            }
            return "business_dashboard"
        }

        // 3. Normalizar por Deep Link directo si es una URI de bluesystem:// o ruta interna válida
        if (destinationRoute.isNotBlank()) {
            val uri = Uri.parse(destinationRoute)
            val parsedRoute = parseDeepLinkUri(uri)
            if (parsedRoute != null && (isCustomer || isKnownInternalRoute(parsedRoute))) {
                return parsedRoute
            }

            if (isKnownInternalRoute(destinationRoute)) {
                return destinationRoute
            }
        }

        // 4. Resolución por DestinationType Canónico (solo si es Customer o Guest)
        when (destinationType.uppercase().trim()) {
            "CUSTOMER_ORDER_TRACKING" -> {
                return if (orderId.isNotBlank()) {
                    "customer/order_tracking/$orderId"
                } else {
                    fallbackDestination.ifBlank { Screen.OrdersHistory.route }
                }
            }

            "CUSTOMER_ORDER_DETAIL" -> {
                return if (orderId.isNotBlank()) {
                    Screen.OrderDetail.createRoute(orderId)
                } else {
                    fallbackDestination.ifBlank { Screen.OrdersHistory.route }
                }
            }

            "CUSTOMER_ORDERS" -> return Screen.OrdersHistory.route

            "CUSTOMER_SUPPORT_CHAT" -> {
                return if (supportConversationId.isNotBlank()) {
                    "customer_help?conversationId=$supportConversationId"
                } else {
                    "customer_help"
                }
            }

            "CUSTOMER_PRODUCT" -> {
                return if (businessId.isNotBlank() && productId.isNotBlank()) {
                    "comercio_detalle_screen/$businessId?productId=$productId"
                } else if (businessId.isNotBlank()) {
                    "comercio_detalle_screen/$businessId"
                } else {
                    fallbackDestination.ifBlank { "customer_dashboard" }
                }
            }

            "CUSTOMER_MERCHANT" -> {
                return if (businessId.isNotBlank()) {
                    "comercio_detalle_screen/$businessId"
                } else {
                    fallbackDestination.ifBlank { "customer_dashboard" }
                }
            }

            "CUSTOMER_COUPON" -> {
                return if (couponId.isNotBlank()) {
                    "customer_coupons?couponId=$couponId"
                } else {
                    Screen.CustomerCoupons.route
                }
            }

            "CUSTOMER_HOME" -> return "customer_dashboard"

            "CUSTOMER_PROFILE" -> return "customer_dashboard?tab=3"

            "COURIER_FLEET_POOL", "COURIER_ASSIGNED_ORDERS", "COURIER_ACTIVE_DELIVERY", "COURIER_SUPPORT" -> {
                return Screen.Courier.route
            }

            "MERCHANT_ORDERS", "MERCHANT_ORDER_DETAIL", "MERCHANT_CONTROL_TOWER", "MERCHANT_SUPPORT" -> {
                return "business_dashboard"
            }
        }

        // 5. Resolución por Type Canónico
        when (type.uppercase().trim()) {
            "WELCOME_FIRST_REGISTRATION" -> return "customer_dashboard"

            "ORDER_PICKED_UP", "ORDER_IN_TRANSIT", "COURIER_ARRIVING" -> {
                return if (orderId.isNotBlank()) "customer/order_tracking/$orderId" else Screen.OrdersHistory.route
            }

            "ORDER_CREATED", "ORDER_ACCEPTED", "ORDER_PREPARING", "ORDER_READY", "ORDER_DELIVERED", "ORDER_CANCELLED" -> {
                return if (orderId.isNotBlank()) Screen.OrderDetail.createRoute(orderId) else Screen.OrdersHistory.route
            }

            "SUPPORT_MESSAGE", "SUPPORT_TICKET_UPDATED" -> {
                return if (supportConversationId.isNotBlank()) "customer_help?conversationId=$supportConversationId" else "customer_help"
            }

            "PRODUCT_PROMOTION" -> {
                return if (businessId.isNotBlank() && productId.isNotBlank()) {
                    "comercio_detalle_screen/$businessId?productId=$productId"
                } else if (businessId.isNotBlank()) {
                    "comercio_detalle_screen/$businessId"
                } else {
                    "customer_dashboard"
                }
            }

            "MERCHANT_PROMOTION", "NEW_MERCHANT" -> {
                return if (businessId.isNotBlank()) "comercio_detalle_screen/$businessId" else "customer_dashboard"
            }

            "COUPON_AVAILABLE" -> {
                return if (couponId.isNotBlank()) "customer_coupons?couponId=$couponId" else Screen.CustomerCoupons.route
            }
        }

        // 6. Compatibilidad Hacia Atrás (Legacy Action & Screen)
        if (action == "TRIP_CHAT_MESSAGE" || (screen == "order_chat" && domain == "X_TO_Y_TRIP")) {
            return Screen.OrderChat.createRoute(tripId.ifBlank { orderId }, ChatDomain.X_TO_Y_TRIP)
        }
        if (action == "ORDER_CHAT_MESSAGE" || screen == "order_chat") {
            return Screen.OrderChat.createRoute(orderId.ifBlank { tripId }, ChatDomain.COMMERCE_ORDER)
        }
        if (action == "COURIER_ASSIGNED") {
            if (isCustomer) {
                val targetTripId = tripId.ifBlank { orderId }
                if (targetTripId.isNotBlank()) {
                    return Screen.TrackingPedido.createRoute(targetTripId, "")
                }
            }
            return if (isCourier) Screen.Courier.route else if (isMerchant) "business_dashboard" else "customer_dashboard"
        }
        if (tripId.isNotBlank() && isCustomer) {
            return Screen.TrackingPedido.createRoute(tripId, "")
        }
        if (action in listOf("NEW_ORDER", "NEW_X_TO_Y_DELIVERY", "NEW_DELIVERY_OFFER") || screen in listOf("assigned_orders", "courier_dashboard")) {
            return if (isCourier) Screen.Courier.route else if (isMerchant) "business_dashboard" else "customer_dashboard"
        }
        if (orderId.isNotBlank()) {
            return Screen.OrderDetail.createRoute(orderId)
        }
        if (screen.isNotBlank() && isKnownInternalRoute(screen)) {
            return screen
        }

        // 7. Fallback Seguro por Rol
        return if (fallbackDestination.isNotBlank()) {
            fallbackDestination
        } else when (appRole) {
            com.example.domain.model.AppRole.MERCHANT -> "business_dashboard"
            com.example.domain.model.AppRole.COURIER -> Screen.Courier.route
            com.example.domain.model.AppRole.ADMIN -> Screen.Admin.route
            com.example.domain.model.AppRole.CUSTOMER -> "customer_dashboard"
            com.example.domain.model.AppRole.UNKNOWN -> Screen.LoginRegister.route
        }
    }

    /**
     * Valida si una ruta interna pertenece al grafo conocido de navegación Compose para evitar rutas arbitrarias.
     */
    fun isKnownInternalRoute(route: String): Boolean {
        val base = route.substringBefore('?').substringBefore('/')
        return base in listOf(
            "splash",
            "login_register",
            "seleccion_rol",
            "solicitar_envio",
            "customer_dashboard",
            "guest_home",
            "orders_history",
            "order_detail",
            "order_chat",
            "customer_help",
            "customer_coupons",
            "comercio_detalle_screen",
            "tracking_pedido",
            "esperando_repartidor",
            "courier",
            "business_dashboard",
            "address_manager",
            "loyalty_points",
            "loyalty_level",
            "security_settings",
            "biometric_unlock",
            "customer",
            "admin",
            "admin_users"
        )
    }

    /**
     * Ejecuta la navegación segura desde un NavController validando que la ruta no sea idéntica a la actual.
     */
    fun navigateSafely(navController: NavController, targetRoute: String) {
        try {
            val currentRoute = navController.currentDestination?.route ?: ""
            if (currentRoute != targetRoute && currentRoute != Screen.Splash.route) {
                Log.d(TAG, "Navegando de forma segura a: $targetRoute")
                navController.navigate(targetRoute)
            } else {
                Log.d(TAG, "Ruta destino $targetRoute es igual a la actual o está en Splash.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error navegando a $targetRoute. Aplicando fallback a customer_dashboard", e)
            try {
                navController.navigate("customer_dashboard")
            } catch (fallbackErr: Exception) {
                Log.e(TAG, "Fallo crítico en navegación", fallbackErr)
            }
        }
    }
}
