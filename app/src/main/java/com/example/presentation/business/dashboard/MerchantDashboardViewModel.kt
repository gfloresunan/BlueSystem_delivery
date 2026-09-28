package com.example.presentation.business.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.AuditLogger
import com.example.Pedido
import com.example.data.repository.BusinessInfo
import com.example.data.repository.MerchantDashboardRepository
import com.example.data.repository.ProductRepository
import com.example.domain.engine.dashboard.AssistantPriorityEngine
import com.example.domain.engine.dashboard.PriorityInsight
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.domain.model.dashboard.*
import com.example.domain.model.finance.FinancialSummary
import com.example.domain.model.finance.MerchantSettlement
import com.example.data.repository.MerchantFinanceRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class MerchantDashboardUiState(
    val isLoading: Boolean = true,
    val businessId: String = "",
    val businessInfo: BusinessInfo? = null,
    val isStoreOpen: Boolean = true,
    val isOfflineMode: Boolean = false,
    val offlinePendingChangesCount: Int = 0,
    val lastSyncTimeText: String = "Sincronizado",
    val lastUpdatedTimestamp: Long = System.currentTimeMillis(),

    // Perfiles de Layout (Notion/Shopify style)
    val activeProfileType: DashboardProfileType = DashboardProfileType.OPERATIONS,

    // Meta del Día & KPIs Históricos
    val dailyGoal: DashboardGoal = DashboardGoal(targetAmount = 0.0, currentAmount = 0.0),
    val hasConfiguredGoal: Boolean = false,
    val scheduleText: String = "",
    val ventasHoyVsAyerDeltaPercent: Double = 0.0,
    val ventasHoyVsSemanaPasadaDeltaPercent: Double = 0.0,

    // Buscador Unificado Omnibox (Quick Search)
    val searchQuery: String = "",
    val searchFilteredProducts: List<Product> = emptyList(),
    val searchFilteredOrders: List<Pedido> = emptyList(),

    // Row 1: Live Order KPIs
    val nuevosCount: Int = 0,
    val preparandoCount: Int = 0,
    val listosCount: Int = 0,
    val motorizadosActivosCount: Int = 0,
    val totalOrdersTodayCount: Int = 0,

    // Row 2: Financial KPIs (SSOT /merchant_summaries)
    val ventasHoyAmount: Double = 0.0,
    val ventasSemanaAmount: Double = 0.0,
    val ticketPromedioAmount: Double = 0.0,
    val clientesAtendidosCount: Int = 0,
    val financialSummary: FinancialSummary = FinancialSummary(),
    val pendingActionSettlement: MerchantSettlement? = null,

    // Row 3: Performance KPIs
    val tiempoCocinaPromedioMin: Int = 0,
    val tiempoEntregaPromedioMin: Int = 0,
    val calificacionPromedio: Double = 0.0,
    val cancelacionesCount: Int = 0,

    // Widget: Salud del Sistema (Health Monitor Integrado)
    val firestoreHealthStatus: String = "🟢 Óptimo",
    val syncHealthStatus: String = "🟢 Al día",
    val offlineHealthStatus: String = "🟢 Online",
    val notificationsHealthStatus: String = "🟢 Activas",

    // Widget: Motorizados Activos
    val couriersList: List<String> = emptyList(),

    // Widget: Clientes Insights
    val newCustomersCount: Int = 0,
    val recurringCustomersCount: Int = 0,
    val vipCustomersCount: Int = 0,
    val latestReviewScore: Double = 0.0,

    // Lists & Aggregations
    val liveOrders: List<Pedido> = emptyList(),
    val outOfStockProducts: List<Product> = emptyList(),
    val lowStockProducts: List<Product> = emptyList(),
    val topSellingProducts: List<Product> = emptyList(),
    val classifiedAlerts: List<MerchantAlert> = emptyList(),
    val activityTimeline: List<TimelineActivity> = emptyList(),
    val priorityInsights: List<PriorityInsight> = emptyList(),

    // Modular Widget Layout (Marketplace Architecture)
    val activeWidgets: List<MerchantDashboardWidget> = listOf(
        MerchantDashboardWidget(WidgetType.UNIFIED_SEARCH_BAR, "Buscador Unificado", true, true, WidgetDensity.MEDIUM, 0),
        MerchantDashboardWidget(WidgetType.SMART_HEADER, "Header Inteligente", true, true, WidgetDensity.MEDIUM, 1),
        MerchantDashboardWidget(WidgetType.DAILY_GOAL_WIDGET, "Meta del Día 🎯", true, false, WidgetDensity.MEDIUM, 2),
        MerchantDashboardWidget(WidgetType.LIVE_ORDER_KPIS, "Pedidos en Vivo", true, false, WidgetDensity.MEDIUM, 3),
        MerchantDashboardWidget(WidgetType.FINANCIAL_KPIS, "Métricas Financieras", true, false, WidgetDensity.MEDIUM, 4),
        MerchantDashboardWidget(WidgetType.PERFORMANCE_KPIS, "Rendimiento Operativo", true, false, WidgetDensity.MEDIUM, 5),
        MerchantDashboardWidget(WidgetType.SYSTEM_HEALTH_WIDGET, "Salud del Sistema 🟢", true, false, WidgetDensity.MEDIUM, 6),
        MerchantDashboardWidget(WidgetType.CLASSIFIED_ALERTS, "Centro de Alertas", true, false, WidgetDensity.MEDIUM, 7),
        MerchantDashboardWidget(WidgetType.LIVE_ORDERS_CENTER, "Centro de Pedidos Vivo", true, false, WidgetDensity.MEDIUM, 8),
        MerchantDashboardWidget(WidgetType.COURIER_TRACKING, "Motorizados en Ruta 🛵", true, false, WidgetDensity.MEDIUM, 9),
        MerchantDashboardWidget(WidgetType.CUSTOMER_INSIGHTS, "Métricas de Clientes 👥", true, false, WidgetDensity.MEDIUM, 10),
        MerchantDashboardWidget(WidgetType.KDS_SUMMARY, "Resumen de Cocina KDS", true, false, WidgetDensity.MEDIUM, 11),
        MerchantDashboardWidget(WidgetType.PRODUCT_SUMMARY, "Control de Inventario", true, false, WidgetDensity.MEDIUM, 12),
        MerchantDashboardWidget(WidgetType.EXECUTIVE_ANALYTICS, "Analíticas Ejecutivas", true, false, WidgetDensity.MEDIUM, 13),
        MerchantDashboardWidget(WidgetType.REALTIME_TIMELINE, "Feed de Actividad", true, false, WidgetDensity.MEDIUM, 14),
        MerchantDashboardWidget(WidgetType.QUICK_ACTIONS, "Acciones Rápidas", true, false, WidgetDensity.MEDIUM, 15),
        MerchantDashboardWidget(WidgetType.MERCHANT_ASSISTANT, "Asistente Inteligente", true, false, WidgetDensity.MEDIUM, 16)
    ),

    val featureFlags: MerchantDashboardFeatureState = MerchantDashboardFeatureState(),
    val errorMessage: String? = null
)

class MerchantDashboardViewModel(
    dashboardRepoSupplier: (() -> MerchantDashboardRepository)? = null,
    productRepoSupplier: (() -> ProductRepository)? = null,
    preferenceRepoSupplier: (() -> com.example.data.repository.MerchantDashboardPreferenceRepository)? = null,
    financeRepoSupplier: (() -> MerchantFinanceRepository)? = null
) : ViewModel() {

    private val dashboardRepository by lazy { dashboardRepoSupplier?.invoke() ?: MerchantDashboardRepository() }
    private val productRepository by lazy { productRepoSupplier?.invoke() ?: ProductRepository() }
    private val financeRepository by lazy { financeRepoSupplier?.invoke() ?: MerchantFinanceRepository() }
    private var preferenceRepository: com.example.data.repository.MerchantDashboardPreferenceRepository? = preferenceRepoSupplier?.invoke()

    private val _uiState = MutableStateFlow(MerchantDashboardUiState())
    val uiState: StateFlow<MerchantDashboardUiState> = _uiState.asStateFlow()

    private var allProductsCache: List<Product> = emptyList()
    private var allOrdersCache: List<Pedido> = emptyList()

    fun startDashboard(businessId: String, context: android.content.Context? = null) {
        if (preferenceRepository == null && context != null) {
            preferenceRepository = com.example.data.repository.MerchantDashboardPreferenceRepository(context.applicationContext)
        }

        // Cargar preferencias persistidas del comercio (aislamiento por businessId)
        val prefRepo = preferenceRepository
        val savedWidgets = prefRepo?.getWidgetConfig(businessId)
        val savedGoalTarget = prefRepo?.getDailyGoalTarget(businessId) ?: 0.0
        val savedProfile = prefRepo?.getActiveProfile(businessId) ?: DashboardProfileType.OPERATIONS

        _uiState.update { current ->
            val effectiveWidgets = if (savedWidgets != null && savedWidgets.isNotEmpty()) {
                // Combinar con la lista por defecto en caso de nuevos tipos de widgets añadidos
                val savedMap = savedWidgets.associateBy { it.type }
                current.activeWidgets.map { defaultWidget ->
                    savedMap[defaultWidget.type]?.copy(title = defaultWidget.title) ?: defaultWidget
                }.sortedWith(compareByDescending<MerchantDashboardWidget> { it.isPinned }.thenBy { it.order })
            } else {
                current.activeWidgets
            }

            current.copy(
                businessId = businessId,
                isLoading = true,
                errorMessage = null,
                activeProfileType = savedProfile,
                activeWidgets = effectiveWidgets,
                dailyGoal = current.dailyGoal.copy(targetAmount = if (savedGoalTarget > 0.0) savedGoalTarget else current.dailyGoal.targetAmount),
                hasConfiguredGoal = savedGoalTarget > 0.0
            )
        }

        viewModelScope.launch {
            combine(
                dashboardRepository.getOrdersStream(businessId),
                dashboardRepository.getBusinessInfoStream(businessId),
                productRepository.getProductsByBusiness(businessId)
            ) { orders, bInfo, products ->
                allOrdersCache = orders
                allProductsCache = products
                processDashboardData(orders, bInfo, products)
            }.catch { e ->
                _uiState.update { it.copy(isLoading = false, errorMessage = e.message ?: "Error al sincronizar con Firestore") }
            }.collect { newState ->
                _uiState.value = newState
            }
        }

        // Suscripción SSOT a /merchant_summaries/{businessId} (integridad financiera en centavos)
        viewModelScope.launch {
            financeRepository.getFinancialSummaryStream(businessId)
                .catch { e -> android.util.Log.e("MerchantDashboardVM", "Error listening financial summary: ${e.message}") }
                .collect { summary ->
                    _uiState.update { current ->
                        current.copy(
                            financialSummary = summary,
                            ventasHoyAmount = if (summary.ordersCount > 0) summary.revenueCents / 100.0 else current.ventasHoyAmount,
                            ticketPromedioAmount = if (summary.ordersCount > 0) summary.averageTicketCents / 100.0 else current.ticketPromedioAmount
                        )
                    }
                }
        }

        // Suscripción a liquidaciones pendientes de acción (AWAITING_CONFIRMATION)
        viewModelScope.launch {
            financeRepository.getAwaitingConfirmationSettlementStream(businessId)
                .catch { e -> android.util.Log.e("MerchantDashboardVM", "Error listening pending settlement: ${e.message}") }
                .collect { pendingSettlement ->
                    _uiState.update { it.copy(pendingActionSettlement = pendingSettlement) }
                }
        }
    }

    private fun normalizeOrderStatus(rawStatus: String?): String {
        return when (rawStatus?.trim()?.lowercase()) {
            "pending", "pendiente", "payment_verifying", "verificando_pago" -> "pending"
            "preparing", "en_preparacion", "preparando", "cocina" -> "preparing"
            "ready", "listo", "esperando_repartidor" -> "ready"
            "assigned", "asignado", "in_transit", "en_camino", "en_ruta" -> "in_transit"
            "delivered", "entregado", "completed", "completado" -> "delivered"
            "cancelled", "cancelado", "rejected", "rechazado" -> "cancelled"
            else -> rawStatus?.lowercase() ?: "pending"
        }
    }

    private fun processDashboardData(
        orders: List<Pedido>,
        bInfo: BusinessInfo?,
        products: List<Product>
    ): MerchantDashboardUiState {
        val normalizedOrders = orders.map { o ->
            o to normalizeOrderStatus(o.status)
        }

        val nuevos = normalizedOrders.filter { it.second == "pending" }.map { it.first }
        val preparando = normalizedOrders.filter { it.second == "preparing" }.map { it.first }
        val listos = normalizedOrders.filter { it.second == "ready" }.map { it.first }
        val enCamino = normalizedOrders.filter { it.second == "in_transit" }.map { it.first }
        val entregados = normalizedOrders.filter { it.second == "delivered" }.map { it.first }
        val cancelados = normalizedOrders.filter { it.second == "cancelled" }.map { it.first }

        // Cálculo canónico de ventas: Exclusivamente pedidos entregados/completados sin cancelaciones ni duplicidad
        val ventasHoy = entregados.sumOf { it.total }
        val ticketProm = if (entregados.isNotEmpty()) ventasHoy / entregados.size else 0.0

        val outOfStock = products.filter { it.status == ProductStatus.OUT_OF_STOCK || (it.stockQuantity != null && it.stockQuantity <= 0) }
        val lowStock = products.filter { it.stockQuantity != null && it.stockQuantity in 1..(it.minStockAlert ?: 5) }

        // Motor de Clasificación de Alertas (🔴/🟠/🔵)
        val alerts = mutableListOf<MerchantAlert>()
        if (outOfStock.isNotEmpty()) {
            alerts.add(
                MerchantAlert(
                    id = "alt_out",
                    title = "Productos Agotados (${outOfStock.size})",
                    message = "Tienes ${outOfStock.size} producto(s) sin stock disponible.",
                    severity = AlertSeverity.CRITICAL,
                    actionType = AlertActionType.OPEN_PRODUCT
                )
            )
        }
        if (nuevos.size >= 5) {
            alerts.add(
                MerchantAlert(
                    id = "alt_surge",
                    title = "Alta Demanda de Pedidos Entrantes",
                    message = "Tienes ${nuevos.size} pedidos nuevos esperando aceptación.",
                    severity = AlertSeverity.CRITICAL,
                    actionType = AlertActionType.OPEN_ORDER
                )
            )
        }
        if (lowStock.isNotEmpty()) {
            alerts.add(
                MerchantAlert(
                    id = "alt_low",
                    title = "Stock Bajo Detectado (${lowStock.size})",
                    message = "Varios productos están cerca de su stock mínimo.",
                    severity = AlertSeverity.IMPORTANT,
                    actionType = AlertActionType.OPEN_PRODUCT
                )
            )
        }

        // Feed de Actividad en Tiempo Real desde pedidos reales
        val timeline = orders.take(10).map { o ->
            TimelineActivity(
                id = o.pedidoId,
                title = "Pedido #${o.displayOrderCode.removePrefix("#")}",
                description = "Estado: ${o.status.uppercase()} — Monto: C$ ${o.total.toInt()}",
                type = when (normalizeOrderStatus(o.status)) {
                    "pending" -> ActivityType.ORDER_RECEIVED
                    "preparing" -> ActivityType.ORDER_ACCEPTED
                    "ready" -> ActivityType.ORDER_READY
                    "in_transit" -> ActivityType.COURIER_ASSIGNED
                    "delivered" -> ActivityType.ORDER_DELIVERED
                    else -> ActivityType.ORDER_RECEIVED
                },
                timestamp = (o.createdAt?.seconds ?: System.currentTimeMillis() / 1000) * 1000
            )
        }

        val priorityInsights = AssistantPriorityEngine.evaluateInsights(
            overdueOrdersCount = nuevos.count { System.currentTimeMillis() - ((it.createdAt?.seconds ?: 0L) * 1000) > 600000L },
            outOfStockCount = outOfStock.size,
            lowStockCount = lowStock.size,
            todaySales = ventasHoy,
            ticketDropPercentage = 0.0
        )

        // Extracción dinámica de motorizados en ruta reales
        val realCouriers = enCamino.mapNotNull { ord ->
            val id = if (ord.motorizadoId.isNotBlank()) ord.motorizadoId else ord.assignedCourierId
            if (id.isNotBlank()) "Repartidor ($id)" else null
        }.distinct()

        // Meta del día: solo si está configurada o si target > 0
        val targetAmount = _uiState.value.dailyGoal.targetAmount
        val hasGoal = targetAmount > 0.0
        val updatedGoal = _uiState.value.dailyGoal.copy(currentAmount = ventasHoy)

        val scheduleInfo = when (val s = bInfo?.schedule) {
            is String -> if (s.isNotBlank()) s else (bInfo.horario)
            else -> bInfo?.horario ?: ""
        }

        val timeFormat = java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault())
        val syncTime = timeFormat.format(java.util.Date())

        return _uiState.value.copy(
            isLoading = false,
            businessInfo = bInfo,
            isStoreOpen = bInfo?.getEffectiveIsOpen() ?: true,
            lastUpdatedTimestamp = System.currentTimeMillis(),
            lastSyncTimeText = syncTime,
            dailyGoal = updatedGoal,
            hasConfiguredGoal = hasGoal,
            scheduleText = scheduleInfo,
            nuevosCount = nuevos.size,
            preparandoCount = preparando.size,
            listosCount = listos.size,
            motorizadosActivosCount = enCamino.size,
            totalOrdersTodayCount = orders.size,
            ventasHoyAmount = if (_uiState.value.financialSummary.ordersCount > 0) _uiState.value.financialSummary.revenueCents / 100.0 else ventasHoy,
            ventasSemanaAmount = if (_uiState.value.financialSummary.ordersCount > 0) _uiState.value.financialSummary.revenueCents / 100.0 else ventasHoy,
            ticketPromedioAmount = if (_uiState.value.financialSummary.ordersCount > 0) _uiState.value.financialSummary.averageTicketCents / 100.0 else ticketProm,
            clientesAtendidosCount = entregados.size,
            cancelacionesCount = cancelados.size,
            liveOrders = orders.take(15),
            outOfStockProducts = outOfStock,
            lowStockProducts = lowStock,
            topSellingProducts = products.sortedByDescending { it.salesCount }.take(5),
            classifiedAlerts = alerts,
            activityTimeline = timeline,
            priorityInsights = priorityInsights,
            couriersList = realCouriers,
            errorMessage = null
        )
    }

    // ─── AMBIENTE DE PERFILES DE LAYOUT ───
    fun selectProfile(profileType: DashboardProfileType) {
        _uiState.update { state ->
            val visibleTypes = when (profileType) {
                DashboardProfileType.OPERATIONS -> WidgetType.values().toSet()
                DashboardProfileType.KITCHEN -> setOf(
                    WidgetType.UNIFIED_SEARCH_BAR, WidgetType.SMART_HEADER, WidgetType.LIVE_ORDER_KPIS,
                    WidgetType.CLASSIFIED_ALERTS, WidgetType.LIVE_ORDERS_CENTER, WidgetType.KDS_SUMMARY, WidgetType.SYSTEM_HEALTH_WIDGET
                )
                DashboardProfileType.SALES -> setOf(
                    WidgetType.UNIFIED_SEARCH_BAR, WidgetType.SMART_HEADER, WidgetType.DAILY_GOAL_WIDGET,
                    WidgetType.FINANCIAL_KPIS, WidgetType.PERFORMANCE_KPIS, WidgetType.EXECUTIVE_ANALYTICS, WidgetType.CUSTOMER_INSIGHTS
                )
                DashboardProfileType.INVENTORY -> setOf(
                    WidgetType.UNIFIED_SEARCH_BAR, WidgetType.SMART_HEADER, WidgetType.PRODUCT_SUMMARY,
                    WidgetType.CLASSIFIED_ALERTS, WidgetType.QUICK_ACTIONS
                )
                DashboardProfileType.CUSTOM -> state.activeWidgets.map { it.type }.toSet()
            }

            val updatedWidgets = state.activeWidgets.map { w ->
                w.copy(isVisible = visibleTypes.contains(w.type))
            }
            if (state.businessId.isNotBlank()) {
                preferenceRepository?.saveActiveProfile(state.businessId, profileType)
                preferenceRepository?.saveWidgetConfig(state.businessId, updatedWidgets)
            }
            state.copy(activeProfileType = profileType, activeWidgets = updatedWidgets)
        }
    }

    fun updateDailyGoalTarget(target: Double) {
        _uiState.update { state ->
            if (state.businessId.isNotBlank()) {
                preferenceRepository?.saveDailyGoalTarget(state.businessId, target)
            }
            state.copy(dailyGoal = state.dailyGoal.copy(targetAmount = target), hasConfiguredGoal = target > 0.0)
        }
    }

    // ─── BUSCADOR UNIFICADO OMNIBOX ───
    fun updateSearchQuery(query: String) {
        _uiState.update { state ->
            val filteredProds = if (query.isBlank()) emptyList() else allProductsCache.filter { it.name.contains(query, ignoreCase = true) || it.categoryName.contains(query, ignoreCase = true) }
            val filteredOrds = if (query.isBlank()) emptyList() else allOrdersCache.filter { it.pedidoId.contains(query, ignoreCase = true) || it.customerName.contains(query, ignoreCase = true) }
            state.copy(searchQuery = query, searchFilteredProducts = filteredProds, searchFilteredOrders = filteredOrds)
        }
    }

    // ─── PERSONALIZACIÓN NOTION-STYLE WIDGETS ───
    fun togglePinWidget(widgetType: WidgetType) {
        _uiState.update { state ->
            val updated = state.activeWidgets.map {
                if (it.type == widgetType) it.copy(isPinned = !it.isPinned) else it
            }.sortedWith(compareByDescending<MerchantDashboardWidget> { it.isPinned }.thenBy { it.order })
            if (state.businessId.isNotBlank()) {
                preferenceRepository?.saveWidgetConfig(state.businessId, updated)
            }
            state.copy(activeWidgets = updated)
        }
    }

    fun setWidgetDensity(widgetType: WidgetType, density: WidgetDensity) {
        _uiState.update { state ->
            val updated = state.activeWidgets.map {
                if (it.type == widgetType) it.copy(density = density) else it
            }
            if (state.businessId.isNotBlank()) {
                preferenceRepository?.saveWidgetConfig(state.businessId, updated)
            }
            state.copy(activeWidgets = updated)
        }
    }

    fun toggleWidgetVisibility(widgetType: WidgetType) {
        _uiState.update { state ->
            val updated = state.activeWidgets.map {
                if (it.type == widgetType) it.copy(isVisible = !it.isVisible) else it
            }
            if (state.businessId.isNotBlank()) {
                preferenceRepository?.saveWidgetConfig(state.businessId, updated)
            }
            state.copy(activeWidgets = updated)
        }
    }

    // ─── ACCIONES DIRECTAS DESDE EL DASHBOARD ───
    fun acceptOrder(orderId: String) {
        viewModelScope.launch {
            FirebaseFirestore.getInstance().collection("orders").document(orderId).update("status", "preparing")
            AuditLogger.logEvent("MERCHANT_DASH_ACCEPT_ORDER", mapOf("orderId" to orderId))
        }
    }

    fun readyOrder(orderId: String) {
        viewModelScope.launch {
            FirebaseFirestore.getInstance().collection("orders").document(orderId).update("status", "ready")
            AuditLogger.logEvent("MERCHANT_DASH_READY_ORDER", mapOf("orderId" to orderId))
        }
    }

    fun toggleStoreStatus() {
        val current = _uiState.value.isStoreOpen
        val bId = _uiState.value.businessId
        if (bId.isBlank()) return

        val nextState = !current
        // Actualización optimista inmediata en UI
        _uiState.update { it.copy(isStoreOpen = nextState) }

        viewModelScope.launch {
            try {
                val db = FirebaseFirestore.getInstance()
                val updates = mapOf<String, Any>(
                    "isOpen" to nextState,
                    "abierto" to nextState,
                    "isOpenOverride" to nextState,
                    "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                )

                val batch = db.batch()
                val bizRef = db.collection("businesses").document(bId)
                val settingsRef = db.collection("restaurant_settings").document(bId)
                batch.set(bizRef, updates, com.google.firebase.firestore.SetOptions.merge())
                batch.set(settingsRef, updates, com.google.firebase.firestore.SetOptions.merge())
                batch.commit().await()

                AuditLogger.logEvent("MERCHANT_DASH_TOGGLE_STORE", mapOf("businessId" to bId, "isOpen" to nextState, "abierto" to nextState))
            } catch (e: Exception) {
                android.util.Log.e("MerchantDashboardVM", "Error al actualizar estado de la tienda: ${e.message}", e)
                // Rollback a estado previo si falló la escritura en Firestore
                _uiState.update { it.copy(isStoreOpen = current, errorMessage = "Error al cambiar estado de la tienda") }
            }
        }
    }

    fun toggleOfflineMode() {
        _uiState.update { it.copy(isOfflineMode = !it.isOfflineMode, offlinePendingChangesCount = 0) }
    }
}
