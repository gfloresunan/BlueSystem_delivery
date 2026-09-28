package com.example.domain.model.ai

/**
 * Registro Canónico Inmutable de Herramientas de IA: ToolRegistry (v2.2 Enterprise)
 *
 * Contiene la definición formal de las 19 herramientas autorizadas según los contratos
 * congelados en C1-R1, C2-A y C2-B.
 *
 * INVARIANTE:
 * - Este registro es puramente descriptivo y de tipado.
 * - NO ejecuta herramientas.
 * - NO accede a Firestore, CartManager ni Cloud Functions.
 */
object ToolRegistry {

    val TOOL_SEARCH_PRODUCTS = AIToolDefinition(
        toolId = "tool_search_products",
        description = "Búsqueda semántica y difusa de productos en catálogo público activo",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_0_PUBLIC_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "EnterpriseSearchEngine.searchCatalog"
    )

    val TOOL_SEARCH_BUSINESSES = AIToolDefinition(
        toolId = "tool_search_businesses",
        description = "Búsqueda de comercios y restaurantes activos por nombre, tag o categoría",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_0_PUBLIC_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "EnterpriseSearchEngine.searchCatalog"
    )

    val TOOL_RESOLVE_CATALOG_ENTITY = AIToolDefinition(
        toolId = "tool_resolve_catalog_entity",
        description = "Resolución de desambiguación para vincular texto conversacional a entidad real",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_0_PUBLIC_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "EnterpriseSearchEngine.searchCatalog"
    )

    val TOOL_GET_PRODUCT_DETAIL = AIToolDefinition(
        toolId = "tool_get_product_detail",
        description = "Consulta de detalle de producto, variantes, grupos de opciones y disponibilidad",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_0_PUBLIC_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "ProductRepository.getActiveProducts"
    )

    val TOOL_GET_BUSINESS_DETAIL = AIToolDefinition(
        toolId = "tool_get_business_detail",
        description = "Consulta de perfil público de comercio, horario, estado y tarifa de entrega",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_0_PUBLIC_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "BusinessRepository.getBusiness"
    )

    val TOOL_GET_NEARBY_BUSINESSES = AIToolDefinition(
        toolId = "tool_get_nearby_businesses",
        description = "Consulta de comercios cercanos en radio de cobertura geográfica",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_0_PUBLIC_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "NearbyMerchantEngine.findNearbyMerchants"
    )

    val TOOL_GET_CART = AIToolDefinition(
        toolId = "tool_get_cart",
        description = "Lectura del estado actual del carrito local y subtotal",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_1_AUTH_CUSTOMER_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "CartManager.cartItems"
    )

    val TOOL_ADD_TO_CART = AIToolDefinition(
        toolId = "tool_add_to_cart",
        description = "Adición de ítem validado al carrito local con opciones seleccionadas",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_2_AUTH_CUSTOMER_MUTATION,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "CartManager.addToCart"
    )

    val TOOL_UPDATE_CART_QUANTITY = AIToolDefinition(
        toolId = "tool_update_cart_quantity",
        description = "Modificación de cantidad de línea de carrito existente",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_2_AUTH_CUSTOMER_MUTATION,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "CartManager.incrementQuantity / decrementQuantity"
    )

    val TOOL_REMOVE_FROM_CART = AIToolDefinition(
        toolId = "tool_remove_from_cart",
        description = "Eliminación de una línea específica del carrito local",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_2_AUTH_CUSTOMER_MUTATION,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = false,
        sourceReference = "CartManager.removeItem"
    )

    val TOOL_CLEAR_CART = AIToolDefinition(
        toolId = "tool_clear_cart",
        description = "Vaciado total del carrito local (Acción destructiva)",
        executionPlane = ToolExecutionPlane.LOCAL,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_3_USER_CONFIRMATION_REQUIRED,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = true,
        requiresAuthentication = false,
        sourceReference = "CartManager.clear"
    )

    val TOOL_GET_CUSTOMER_CONTEXT = AIToolDefinition(
        toolId = "tool_get_customer_context",
        description = "Consulta de contexto básico sanitizado (nombre de pila, dirección predeterminada)",
        executionPlane = ToolExecutionPlane.LOCAL_BACKEND,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_1_AUTH_CUSTOMER_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = true,
        sourceReference = "SessionManager / UserProfile"
    )

    val TOOL_GET_ACTIVE_ORDER = AIToolDefinition(
        toolId = "tool_get_active_order",
        description = "Consulta one-shot de pedido activo del cliente autenticado",
        executionPlane = ToolExecutionPlane.BACKEND,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_1_AUTH_CUSTOMER_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = true,
        sourceReference = "FirebaseManager.listenToActiveCustomerOrder (Snapshot)"
    )

    val TOOL_GET_ORDER_HISTORY = AIToolDefinition(
        toolId = "tool_get_order_history",
        description = "Consulta paginada de historial de pedidos pasados del cliente",
        executionPlane = ToolExecutionPlane.BACKEND,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_1_AUTH_CUSTOMER_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = true,
        sourceReference = "OrdersViewModel.loadOrders (Snapshot)"
    )

    val TOOL_GET_ORDER_TRACKING = AIToolDefinition(
        toolId = "tool_get_order_tracking",
        description = "Telemetría derivada y segura del pedido en curso (distancia, ETA, estado)",
        executionPlane = ToolExecutionPlane.BACKEND,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_2_AUTH_CUSTOMER_MUTATION,
        capabilityClassification = CapabilityClassification.REQUIRES_BACKEND_ADAPTER,
        requiresConfirmation = false,
        requiresAuthentication = true,
        sourceReference = "FirebaseManager.listenToCourierLocation (Relational)"
    )

    val TOOL_VALIDATE_COUPON = AIToolDefinition(
        toolId = "tool_validate_coupon",
        description = "Validación transaccional de código de cupón contra subtotal autoritativo",
        executionPlane = ToolExecutionPlane.BACKEND,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_1_AUTH_CUSTOMER_READ,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = true,
        sourceReference = "functions/src/callables/coupons.ts: validateCouponCode"
    )

    val TOOL_CREATE_AUTHORITATIVE_ORDER = AIToolDefinition(
        toolId = "tool_create_authoritative_order",
        description = "Creación atómica de pedido con validación de precios en backend",
        executionPlane = ToolExecutionPlane.BACKEND,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_4_SERVER_FINANCIAL_MUTATION,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = true,
        requiresAuthentication = true,
        sourceReference = "functions/src/callables/coupons.ts: createAuthoritativeOrder"
    )

    val TOOL_CANCEL_ORDER = AIToolDefinition(
        toolId = "tool_cancel_order",
        description = "Solicitud de cancelación de pedido activo dentro de ventana permitida",
        executionPlane = ToolExecutionPlane.BACKEND,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_3_USER_CONFIRMATION_REQUIRED,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = true,
        requiresAuthentication = true,
        sourceReference = "OrdersViewModel.cancelOrder"
    )

    val TOOL_SUBMIT_ORDER_REVIEW = AIToolDefinition(
        toolId = "tool_submit_order_review",
        description = "Envío de reseña y calificación para pedido completado",
        executionPlane = ToolExecutionPlane.BACKEND,
        authorizationLevel = ToolAuthorizationLevel.LEVEL_2_AUTH_CUSTOMER_MUTATION,
        capabilityClassification = CapabilityClassification.EXISTING_CAPABILITY,
        requiresConfirmation = false,
        requiresAuthentication = true,
        sourceReference = "OrdersViewModel.submitReview"
    )

    private val ALL_TOOLS: Map<String, AIToolDefinition> = listOf(
        TOOL_SEARCH_PRODUCTS,
        TOOL_SEARCH_BUSINESSES,
        TOOL_RESOLVE_CATALOG_ENTITY,
        TOOL_GET_PRODUCT_DETAIL,
        TOOL_GET_BUSINESS_DETAIL,
        TOOL_GET_NEARBY_BUSINESSES,
        TOOL_GET_CART,
        TOOL_ADD_TO_CART,
        TOOL_UPDATE_CART_QUANTITY,
        TOOL_REMOVE_FROM_CART,
        TOOL_CLEAR_CART,
        TOOL_GET_CUSTOMER_CONTEXT,
        TOOL_GET_ACTIVE_ORDER,
        TOOL_GET_ORDER_HISTORY,
        TOOL_GET_ORDER_TRACKING,
        TOOL_VALIDATE_COUPON,
        TOOL_CREATE_AUTHORITATIVE_ORDER,
        TOOL_CANCEL_ORDER,
        TOOL_SUBMIT_ORDER_REVIEW
    ).associateBy { it.toolId }

    /**
     * Retorna la lista inmutable de todas las herramientas canónicas registradas (19 en total).
     */
    fun getAllTools(): List<AIToolDefinition> = ALL_TOOLS.values.toList()

    /**
     * Busca una herramienta por su identificador canónico.
     */
    fun getTool(toolId: String): AIToolDefinition? = ALL_TOOLS[toolId]

    /**
     * Filtra herramientas por plano de ejecución.
     */
    fun getToolsForPlane(plane: ToolExecutionPlane): List<AIToolDefinition> =
        ALL_TOOLS.values.filter { it.executionPlane == plane }

    /**
     * Filtra herramientas por nivel de autorización.
     */
    fun getToolsForAuthLevel(level: ToolAuthorizationLevel): List<AIToolDefinition> =
        ALL_TOOLS.values.filter { it.authorizationLevel == level }

    /**
     * Cantidad total de herramientas registradas.
     */
    val toolCount: Int get() = ALL_TOOLS.size
}
