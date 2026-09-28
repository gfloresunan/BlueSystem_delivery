package com.example.presentation.business.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.AuditLogger
import com.example.Pedido
import com.example.data.repository.MerchantOrdersRepository
import com.example.domain.engine.orders.OrderPriorityEngine
import com.example.domain.engine.orders.SlaEngine
import com.example.domain.engine.orders.SmartCourierAssignmentEngine
import com.example.domain.model.orders.*
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class MerchantOrdersUiState(
    val isLoading: Boolean = true,
    val businessId: String = "",
    val isKanbanView: Boolean = true,
    val isSmartAssignmentEnabled: Boolean = true,
    val searchQuery: String = "",
    val selectedStatusFilter: String? = null, // null = Todos, "pending", "preparing", "ready", "in_transit", "delivered", "cancelled"
    val isVipOnlyFilter: Boolean = false,
    val isUrgentOnlyFilter: Boolean = false,

    // Smart Header KPIs
    val nuevosCount: Int = 0,
    val enCocinaCount: Int = 0,
    val listosCount: Int = 0,
    val enRutaCount: Int = 0,
    val entregadosCount: Int = 0,
    val canceladosCount: Int = 0,
    val ventasHoyAmount: Double = 0.0,
    val promedioSlaMinutes: Int = 18,

    // Collections
    val allOrders: List<MerchantOrder> = emptyList(),
    val filteredOrders: List<MerchantOrder> = emptyList(),
    val availableCouriers: List<CourierRecommendation> = emptyList(),
    val rankedCouriers: List<CourierRecommendation> = emptyList(),

    // Drawer & Modals
    val selectedOrderForDetail: MerchantOrder? = null,
    val isDetailDrawerOpen: Boolean = false,
    val orderForCourierAssignment: MerchantOrder? = null,
    val isCourierModalOpen: Boolean = false,
    val orderForIncident: MerchantOrder? = null,
    val isIncidentModalOpen: Boolean = false,
    val orderForRefund: MerchantOrder? = null,
    val isRefundModalOpen: Boolean = false,

    val featureFlags: Map<String, Boolean> = mapOf(
        "EnableMerchantOrdersCenter" to true,
        "EnableSmartAssignment" to true,
        "EnableCourierTracking" to true,
        "EnableRefundCenter" to true,
        "EnableIncidents" to true,
        "EnableOrderTimeline" to true,
        "EnableOperationalAnalytics" to true
    ),
    val errorMessage: String? = null
)

class MerchantOrdersViewModel(
    repositorySupplier: (() -> MerchantOrdersRepository)? = null
) : ViewModel() {

    private val repository by lazy { repositorySupplier?.invoke() ?: MerchantOrdersRepository() }

    private val _uiState = MutableStateFlow(MerchantOrdersUiState())
    val uiState: StateFlow<MerchantOrdersUiState> = _uiState.asStateFlow()

    fun startOrdersCenter(businessId: String) {
        _uiState.update { it.copy(businessId = businessId, isLoading = true) }

        viewModelScope.launch {
            combine(
                repository.getOrdersStream(businessId),
                repository.getAvailableCouriersStream(businessId)
            ) { rawOrders, couriers ->
                val enriched = rawOrders.map { enrichOrder(it) }
                val ranked = SmartCourierAssignmentEngine.rankCouriers(couriers)

                processOrdersState(enriched, ranked)
            }.catch { e ->
                _uiState.update { it.copy(isLoading = false, errorMessage = e.message) }
            }.collect { newState ->
                _uiState.value = newState
            }
        }
    }

    private fun enrichOrder(p: Pedido): MerchantOrder {
        val now = System.currentTimeMillis()
        val createdAtMillis = (p.createdAt?.seconds ?: (now / 1000)) * 1000
        val elapsed = ((now - createdAtMillis) / 60000L).toInt().coerceAtLeast(0)
        val sla = SlaEngine.calculateSlaStatus(elapsed)
        val initialOrder = MerchantOrder(
            rawPedido = p,
            elapsedMinutes = elapsed,
            slaStatus = sla,
            isVipCustomer = p.total > 1500 || p.customerName.contains("VIP", ignoreCase = true)
        )
        val priority = OrderPriorityEngine.determinePriority(initialOrder)

        val timeFormat = java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault())
        val createdTime = timeFormat.format(java.util.Date(createdAtMillis))
        val updatedTime = timeFormat.format(java.util.Date(now))

        val statusLower = p.status.lowercase().trim()
        val isAccepted = statusLower != "pending" && statusLower != "payment_verifying"
        val isReady = statusLower == "ready" || statusLower == "assigned" || statusLower == "in_transit" || statusLower == "delivered" || statusLower == "completed"
        val isInTransit = statusLower == "in_transit" || statusLower == "delivered" || statusLower == "completed"
        val isDelivered = statusLower == "delivered" || statusLower == "completed"

        val timeline = listOf(
            OrderTimelineStep("Pedido Recibido", createdTime, isCompleted = true),
            OrderTimelineStep("Aceptado", if (isAccepted) updatedTime else "Pendiente", isCompleted = isAccepted),
            OrderTimelineStep("En Preparación", if (isAccepted) updatedTime else "Pendiente", isCompleted = isAccepted),
            OrderTimelineStep("Listo para Despacho", if (isReady) updatedTime else "Pendiente", isCompleted = isReady),
            OrderTimelineStep("En Ruta", if (isInTransit) updatedTime else "Pendiente", isCompleted = isInTransit),
            OrderTimelineStep("Entregado", if (isDelivered) updatedTime else "Pendiente", isCompleted = isDelivered)
        )

        return initialOrder.copy(priority = priority, timelineSteps = timeline)
    }

    private fun processOrdersState(
        orders: List<MerchantOrder>,
        rankedCouriers: List<CourierRecommendation>
    ): MerchantOrdersUiState {
        val nuevos = orders.filter { it.rawPedido.status.equals("pending", true) }
        val cocina = orders.filter { it.rawPedido.status.equals("preparing", true) }
        val listos = orders.filter { it.rawPedido.status.equals("ready", true) }
        val ruta = orders.filter { it.rawPedido.status.equals("in_transit", true) }
        val entregados = orders.filter { it.rawPedido.status.equals("delivered", true) || it.rawPedido.status.equals("completed", true) }
        val cancelados = orders.filter { it.rawPedido.status.equals("cancelled", true) || it.rawPedido.status.equals("rejected", true) }

        val ventasHoy = entregados.sumOf { it.totalAmount }
        val sortedOrders = OrderPriorityEngine.sortOrdersByPriority(orders)

        val filtered = applyFilters(sortedOrders, _uiState.value.searchQuery, _uiState.value.selectedStatusFilter, _uiState.value.isVipOnlyFilter, _uiState.value.isUrgentOnlyFilter)

        return _uiState.value.copy(
            isLoading = false,
            nuevosCount = nuevos.size,
            enCocinaCount = cocina.size,
            listosCount = listos.size,
            enRutaCount = ruta.size,
            entregadosCount = entregados.size,
            canceladosCount = cancelados.size,
            ventasHoyAmount = ventasHoy,
            allOrders = sortedOrders,
            filteredOrders = filtered,
            availableCouriers = rankedCouriers,
            rankedCouriers = rankedCouriers
        )
    }

    private fun applyFilters(
        orders: List<MerchantOrder>,
        query: String,
        statusFilter: String?,
        vipOnly: Boolean,
        urgentOnly: Boolean
    ): List<MerchantOrder> {
        return orders.filter { o ->
            val matchesQuery = query.isBlank() ||
                o.orderId.contains(query, ignoreCase = true) ||
                o.displayOrderCode.contains(query, ignoreCase = true) ||
                o.customerName.contains(query, ignoreCase = true) ||
                o.customerPhone.contains(query, ignoreCase = true) ||
                o.deliveryAddress.contains(query, ignoreCase = true) ||
                o.itemsSummary.contains(query, ignoreCase = true)

            val matchesStatus = statusFilter == null || o.rawPedido.status.equals(statusFilter, ignoreCase = true)
            val matchesVip = !vipOnly || o.isVipCustomer
            val matchesUrgent = !urgentOnly || o.priority == OrderPriority.URGENT || o.slaStatus == SlaStatus.CRITICAL

            matchesQuery && matchesStatus && matchesVip && matchesUrgent
        }
    }

    fun updateSearchQuery(query: String) {
        _uiState.update { state ->
            val filtered = applyFilters(state.allOrders, query, state.selectedStatusFilter, state.isVipOnlyFilter, state.isUrgentOnlyFilter)
            state.copy(searchQuery = query, filteredOrders = filtered)
        }
    }

    fun setStatusFilter(status: String?) {
        _uiState.update { state ->
            val filtered = applyFilters(state.allOrders, state.searchQuery, status, state.isVipOnlyFilter, state.isUrgentOnlyFilter)
            state.copy(selectedStatusFilter = status, filteredOrders = filtered)
        }
    }

    fun toggleVipFilter() {
        _uiState.update { state ->
            val updatedVip = !state.isVipOnlyFilter
            val filtered = applyFilters(state.allOrders, state.searchQuery, state.selectedStatusFilter, updatedVip, state.isUrgentOnlyFilter)
            state.copy(isVipOnlyFilter = updatedVip, filteredOrders = filtered)
        }
    }

    fun toggleUrgentFilter() {
        _uiState.update { state ->
            val updatedUrgent = !state.isUrgentOnlyFilter
            val filtered = applyFilters(state.allOrders, state.searchQuery, state.selectedStatusFilter, state.isVipOnlyFilter, updatedUrgent)
            state.copy(isUrgentOnlyFilter = updatedUrgent, filteredOrders = filtered)
        }
    }

    fun toggleViewMode() {
        _uiState.update { it.copy(isKanbanView = !it.isKanbanView) }
    }

    // ─── TRANSICIONES DE ESTADO DE PEDIDOS ───
    fun acceptOrder(orderId: String) {
        viewModelScope.launch {
            FirebaseFirestore.getInstance().collection("orders").document(orderId).update("status", "preparing")
            AuditLogger.logEvent("MOOC_ACCEPT_ORDER", mapOf("orderId" to orderId, "traceId" to System.currentTimeMillis()))
        }
    }

    fun markOrderPreparing(orderId: String) {
        viewModelScope.launch {
            FirebaseFirestore.getInstance().collection("orders").document(orderId).update("status", "preparing")
            AuditLogger.logEvent("MOOC_PREPARE_ORDER", mapOf("orderId" to orderId))
        }
    }

    fun markOrderReady(orderId: String) {
        viewModelScope.launch {
            FirebaseFirestore.getInstance().collection("orders").document(orderId).update("status", "ready")
            AuditLogger.logEvent("MOOC_READY_ORDER", mapOf("orderId" to orderId))
        }
    }

    fun assignCourierToOrder(orderId: String, courierId: String, courierName: String) {
        viewModelScope.launch {
            FirebaseFirestore.getInstance().collection("orders").document(orderId).update(
                mapOf(
                    "motorizadoId" to courierId,
                    "status" to "in_transit"
                )
            )
            AuditLogger.logEvent("MOOC_ASSIGN_COURIER", mapOf("orderId" to orderId, "courierId" to courierId, "courierName" to courierName))
            _uiState.update { it.copy(isCourierModalOpen = false, orderForCourierAssignment = null) }
        }
    }

    fun cancelOrder(orderId: String, reason: String) {
        viewModelScope.launch {
            val updates = mapOf(
                "status" to "cancelled",
                "estado" to "cancelled",
                "cancelReason" to reason,
                "cancelledAt" to com.google.firebase.Timestamp.now()
            )
            FirebaseFirestore.getInstance().collection("orders").document(orderId).update(updates)
            AuditLogger.logEvent("MOOC_CANCEL_ORDER", mapOf("orderId" to orderId, "reason" to reason))
            _uiState.update { it.copy(isDetailDrawerOpen = false) }
        }
    }

    // ─── MANEJO DE MODALES & DRAWER ───
    fun openOrderDetailDrawer(order: MerchantOrder) {
        _uiState.update { it.copy(selectedOrderForDetail = order, isDetailDrawerOpen = true) }
    }

    fun closeOrderDetailDrawer() {
        _uiState.update { it.copy(isDetailDrawerOpen = false, selectedOrderForDetail = null) }
    }

    fun openCourierModal(order: MerchantOrder) {
        _uiState.update { it.copy(orderForCourierAssignment = order, isCourierModalOpen = true) }
    }

    fun closeCourierModal() {
        _uiState.update { it.copy(isCourierModalOpen = false, orderForCourierAssignment = null) }
    }

    fun openIncidentModal(order: MerchantOrder) {
        _uiState.update { it.copy(orderForIncident = order, isIncidentModalOpen = true) }
    }

    fun closeIncidentModal() {
        _uiState.update { it.copy(isIncidentModalOpen = false, orderForIncident = null) }
    }

    fun submitIncident(orderId: String, type: IncidentType, notes: String) {
        viewModelScope.launch {
            val bizId = _uiState.value.businessId
            repository.submitIncident(orderId, bizId, type.name, notes)
            AuditLogger.logEvent("MOOC_SUBMIT_INCIDENT", mapOf("orderId" to orderId, "type" to type.name, "notes" to notes))
            _uiState.update { it.copy(isIncidentModalOpen = false, orderForIncident = null) }
        }
    }

    fun openRefundModal(order: MerchantOrder) {
        _uiState.update { it.copy(orderForRefund = order, isRefundModalOpen = true) }
    }

    fun closeRefundModal() {
        _uiState.update { it.copy(isRefundModalOpen = false, orderForRefund = null) }
    }

    fun submitRefund(orderId: String, type: RefundType, amount: Double, reason: String) {
        viewModelScope.launch {
            val bizId = _uiState.value.businessId
            repository.submitRefund(orderId, bizId, type.name, amount, reason)
            AuditLogger.logEvent("MOOC_SUBMIT_REFUND", mapOf("orderId" to orderId, "type" to type.name, "amount" to amount, "reason" to reason))
            _uiState.update { it.copy(isRefundModalOpen = false, orderForRefund = null) }
        }
    }
}
