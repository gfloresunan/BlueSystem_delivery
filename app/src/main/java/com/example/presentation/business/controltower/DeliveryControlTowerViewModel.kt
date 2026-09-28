package com.example.presentation.business.controltower

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.AuditLogger
import com.example.Pedido
import com.example.data.repository.DeliveryControlTowerRepository
import com.example.domain.engine.controltower.ControlTowerAlertEngine
import com.example.domain.engine.controltower.ControlTowerEtaEngine
import com.example.domain.engine.controltower.ControlTowerSmartAssignmentEngine
import com.example.domain.engine.controltower.FleetMapEngine
import com.example.domain.engine.orders.OrderPriorityEngine
import com.example.domain.engine.orders.SlaEngine
import com.example.domain.model.controltower.*
import com.example.domain.model.orders.MerchantOrder
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DeliveryControlTowerUiState(
    val isLoading: Boolean = true,
    val businessId: String = "",
    val isStoreOpen: Boolean = true,
    val isOfflineMode: Boolean = false,
    val searchQuery: String = "",
    val selectedStatusFilter: String? = null,
    val selectedCourierStatusFilter: FleetCourierStatus? = null,

    // Zona 1: Smart Command Header & Salud
    val systemHealth: ControlTowerSystemHealth = ControlTowerSystemHealth(),

    // Zona 2: KPIs Operativos
    val activeOrdersCount: Int = 0,
    val overdueOrdersCount: Int = 0,
    val readyOrdersCount: Int = 0,
    val kitchenOrdersCount: Int = 0,
    val inTransitOrdersCount: Int = 0,
    val todaySalesAmount: Double = 0.0,
    val avgPrepMinutes: Int = 14,
    val avgDeliveryMinutes: Int = 22,
    val slaCompliancePercentage: Int = 96,
    val cancelledOrdersCount: Int = 0,

    // Zona 3: Mapa Operacional de Flota & Pedidos
    val fleetCouriers: List<FleetCourier> = emptyList(),
    val filteredFleetCouriers: List<FleetCourier> = emptyList(),
    val selectedCourierForDetail: FleetCourier? = null,
    val recommendedCourier: FleetCourier? = null,

    val activeOrders: List<ControlTowerOrder> = emptyList(),
    val filteredActiveOrders: List<ControlTowerOrder> = emptyList(),
    val selectedOrderForDetail: ControlTowerOrder? = null,

    // KDS Summary por Estaciones
    val kdsStations: List<KdsStationSummary> = listOf(
        KdsStationSummary(KdsStationType.GRILL, pendingCount = 3, avgTimeMinutes = 12),
        KdsStationSummary(KdsStationType.FRYER, pendingCount = 2, avgTimeMinutes = 8),
        KdsStationSummary(KdsStationType.DRINKS, pendingCount = 1, avgTimeMinutes = 3),
        KdsStationSummary(KdsStationType.DESSERT, pendingCount = 0, avgTimeMinutes = 5),
        KdsStationSummary(KdsStationType.ASSEMBLY, pendingCount = 2, avgTimeMinutes = 4)
    ),

    // Alertas Operativas & ETA
    val criticalAlerts: List<ControlTowerAlert> = emptyList(),
    val etaBreakdown: EtaBreakdown = EtaBreakdown(),

    // Modales & Drawers
    val isAssignmentModalOpen: Boolean = false,

    val featureFlags: Map<String, Boolean> = mapOf(
        "EnableControlTower" to true,
        "EnableSmartAssignment" to true,
        "EnableFleetMap" to true,
        "EnableOperationalTimeline" to true,
        "EnableAdvancedAlerts" to true,
        "EnableLiveETA" to true
    ),
    val errorMessage: String? = null
)

class DeliveryControlTowerViewModel(
    repositorySupplier: (() -> DeliveryControlTowerRepository)? = null
) : ViewModel() {

    private val repository by lazy { repositorySupplier?.invoke() ?: DeliveryControlTowerRepository() }

    private val _uiState = MutableStateFlow(DeliveryControlTowerUiState())
    val uiState: StateFlow<DeliveryControlTowerUiState> = _uiState.asStateFlow()

    fun startControlTower(businessId: String) {
        _uiState.update { it.copy(businessId = businessId, isLoading = true) }

        viewModelScope.launch {
            combine(
                repository.getControlTowerOrdersStream(businessId),
                repository.getFleetCouriersStream(businessId)
            ) { rawOrders, couriers ->
                val enrichedOrders = rawOrders.map { enrichOrder(it) }
                val recommended = ControlTowerSmartAssignmentEngine.suggestBestCourier(couriers)
                val alerts = ControlTowerAlertEngine.generateSystemAlerts(
                    overdueCount = enrichedOrders.count { it.elapsedMinutes > 20 },
                    outOfStockCount = 0,
                    pausedCouriersCount = couriers.count { it.status == FleetCourierStatus.PAUSED }
                )

                processControlTowerData(enrichedOrders, couriers, recommended, alerts)
            }.catch { e ->
                _uiState.update { it.copy(isLoading = false, errorMessage = e.message) }
            }.collect { newState ->
                _uiState.value = newState
            }
        }
    }

    private fun enrichOrder(p: Pedido): ControlTowerOrder {
        val elapsed = 14
        val sla = SlaEngine.calculateSlaStatus(elapsed)
        val merchantOrder = MerchantOrder(rawPedido = p, elapsedMinutes = elapsed, slaStatus = sla)
        val priority = OrderPriorityEngine.determinePriority(merchantOrder)

        return ControlTowerOrder(
            rawPedido = p,
            slaStatus = sla,
            priority = priority,
            elapsedMinutes = elapsed
        )
    }

    private fun processControlTowerData(
        orders: List<ControlTowerOrder>,
        couriers: List<FleetCourier>,
        recommended: FleetCourier?,
        alerts: List<ControlTowerAlert>
    ): DeliveryControlTowerUiState {
        val active = orders.filter { !it.rawPedido.status.equals("delivered", true) && !it.rawPedido.status.equals("cancelled", true) }
        val overdue = active.count { it.elapsedMinutes > 20 }
        val ready = active.count { it.rawPedido.status.equals("ready", true) }
        val kitchen = active.count { it.rawPedido.status.equals("preparing", true) }
        val inTransit = active.count { it.rawPedido.status.equals("in_transit", true) }
        val todaySales = orders.filter { it.rawPedido.status.equals("delivered", true) }.sumOf { it.totalAmount }

        val filteredCouriers = FleetMapEngine.filterCouriersByStatus(couriers, _uiState.value.selectedCourierStatusFilter)

        val dynamicKdsStations = listOf(
            KdsStationSummary(KdsStationType.GRILL, pendingCount = (kitchen * 0.4).toInt(), avgTimeMinutes = 12),
            KdsStationSummary(KdsStationType.FRYER, pendingCount = (kitchen * 0.3).toInt(), avgTimeMinutes = 8),
            KdsStationSummary(KdsStationType.DRINKS, pendingCount = (kitchen * 0.2).toInt(), avgTimeMinutes = 3),
            KdsStationSummary(KdsStationType.ASSEMBLY, pendingCount = kitchen, avgTimeMinutes = 4)
        )

        return _uiState.value.copy(
            isLoading = false,
            activeOrdersCount = active.size,
            overdueOrdersCount = overdue,
            readyOrdersCount = ready,
            kitchenOrdersCount = kitchen,
            inTransitOrdersCount = inTransit,
            todaySalesAmount = todaySales,
            activeOrders = active,
            filteredActiveOrders = active,
            fleetCouriers = couriers,
            filteredFleetCouriers = filteredCouriers,
            recommendedCourier = recommended,
            criticalAlerts = alerts,
            kdsStations = dynamicKdsStations
        )
    }

    fun updateSearchQuery(query: String) {
        _uiState.update { state ->
            val filtered = if (query.isBlank()) state.activeOrders else state.activeOrders.filter {
                it.orderId.contains(query, ignoreCase = true) || it.customerName.contains(query, ignoreCase = true) || it.customerAddress.contains(query, ignoreCase = true)
            }
            state.copy(searchQuery = query, filteredActiveOrders = filtered)
        }
    }

    fun selectCourierForDetail(courier: FleetCourier?) {
        _uiState.update { it.copy(selectedCourierForDetail = courier) }
    }

    fun selectOrderForDetail(order: ControlTowerOrder?) {
        _uiState.update { it.copy(selectedOrderForDetail = order) }
    }

    fun openAssignmentModal(order: ControlTowerOrder) {
        _uiState.update { it.copy(selectedOrderForDetail = order, isAssignmentModalOpen = true) }
    }

    fun closeAssignmentModal() {
        _uiState.update { it.copy(isAssignmentModalOpen = false) }
    }

    fun assignCourierToOrder(orderId: String, courierId: String, courierName: String) {
        viewModelScope.launch {
            FirebaseFirestore.getInstance().collection("orders").document(orderId).update(
                mapOf(
                    "motorizadoId" to courierId,
                    "status" to "in_transit"
                )
            )
            AuditLogger.logEvent("DCT_ASSIGN_COURIER", mapOf("orderId" to orderId, "courierId" to courierId, "courierName" to courierName, "traceId" to System.currentTimeMillis()))
            _uiState.update { it.copy(isAssignmentModalOpen = false) }
        }
    }
}
