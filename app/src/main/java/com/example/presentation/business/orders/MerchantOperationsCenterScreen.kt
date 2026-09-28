package com.example.presentation.business.orders

import android.content.Intent
import android.net.Uri
import androidx.compose.ui.platform.LocalContext
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.model.orders.*
import com.example.eiam.presentation.ui.bsds.components.BSEmptyState
import com.example.eiam.presentation.ui.bsds.components.BSEmptyStateType
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary

val moocRed = Color(0xFFEF4444)
val moocGreen = Color(0xFF10B981)
val moocOrange = Color(0xFFF59E0B)
val moocBlue = Color(0xFF0284C7)
val moocPurple = Color(0xFF8B5CF6)
val moocGold = Color(0xFFF59E0B)
val moocDark = Color(0xFF0F172A)
val moocBg = Color(0xFFF8FAFC)

enum class MoocViewMode {
    SMART_QUEUE, KANBAN, LIST
}

enum class MoocFocusMode(val label: String, val emoji: String) {
    ALL("Todos los pedidos", "📋"),
    CRITICAL("Solo Críticos", "🚨"),
    KITCHEN("Solo Cocina", "🍳"),
    VIP("Solo VIP", "👑"),
    DELIVERY("Solo Delivery", "🛵")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MerchantOrdersOperationsCenterScreen(
    businessId: String,
    onOpenKds: () -> Unit,
    viewModel: MerchantOrdersViewModel = remember { MerchantOrdersViewModel() }
) {
    val uiState by viewModel.uiState.collectAsState()

    var isKitchenMode by remember { mutableStateOf(false) }
    var activeFocusMode by remember { mutableStateOf(MoocFocusMode.ALL) }

    LaunchedEffect(businessId) {
        viewModel.startOrdersCenter(businessId)
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(moocBg)
    ) {
        val isTablet = maxWidth > 720.dp
        var activeViewMode by remember(isTablet) {
            mutableStateOf(if (isTablet) MoocViewMode.KANBAN else MoocViewMode.SMART_QUEUE)
        }

        // Aplicación del Modo Enfoque a los pedidos filtrados
        val focusedOrders = remember(uiState.filteredOrders, activeFocusMode) {
            when (activeFocusMode) {
                MoocFocusMode.ALL -> uiState.filteredOrders
                MoocFocusMode.CRITICAL -> uiState.filteredOrders.filter { it.slaStatus == SlaStatus.CRITICAL || it.priority == OrderPriority.URGENT }
                MoocFocusMode.KITCHEN -> uiState.filteredOrders.filter { it.rawPedido.status.equals("preparing", true) || it.rawPedido.status.equals("pending", true) }
                MoocFocusMode.VIP -> uiState.filteredOrders.filter { it.isVipCustomer }
                MoocFocusMode.DELIVERY -> uiState.filteredOrders.filter { it.rawPedido.status.equals("in_transit", true) }
            }
        }

        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = BluePrimary)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Cargando Merchant Workspace 3.0...", fontSize = 13.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                }
            }
        } else {
            Row(modifier = Modifier.fillMaxSize()) {

                // ─── ÁREA PRINCIPAL DE PEDIDOS ───
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                ) {
                    // 1. Header Compacto (📦 Pedidos • SLA Promedio + Modo Cocina Toggle)
                    MoocCompactHeader(
                        uiState = uiState,
                        isKitchenMode = isKitchenMode,
                        onToggleKitchenMode = { isKitchenMode = !isKitchenMode },
                        onRefresh = { viewModel.startOrdersCenter(businessId) },
                        onOpenKds = onOpenKds
                    )

                    // 2. Fila de KPIs Rápidos Operativos
                    MoocQuickKpisRow(uiState = uiState)

                    // 3. Toolbar (OmniSearch + Conmutador Vista + Modo Enfoque + Chips Material 3)
                    MoocToolbar(
                        uiState = uiState,
                        activeViewMode = activeViewMode,
                        activeFocusMode = activeFocusMode,
                        onViewModeChange = { activeViewMode = it },
                        onFocusModeChange = { activeFocusMode = it },
                        onQueryChange = { viewModel.updateSearchQuery(it) },
                        onSelectStatus = { viewModel.setStatusFilter(it) },
                        onToggleVip = { viewModel.toggleVipFilter() },
                        onToggleUrgent = { viewModel.toggleUrgentFilter() }
                    )

                    // 4. Espacio de Trabajo Principal
                    Box(modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp)) {
                        when (activeViewMode) {
                            MoocViewMode.SMART_QUEUE -> {
                                MoocSmartQueueView(
                                    orders = focusedOrders,
                                    isKitchenMode = isKitchenMode,
                                    onAccept = { viewModel.acceptOrder(it) },
                                    onReady = { viewModel.markOrderReady(it) },
                                    onAssignCourier = { viewModel.openCourierModal(it) },
                                    onOpenDrawer = { viewModel.openOrderDetailDrawer(it) },
                                    onOpenIncident = { viewModel.openIncidentModal(it) },
                                    onOpenRefund = { viewModel.openRefundModal(it) },
                                    onCancel = { viewModel.cancelOrder(it, "Rechazado por el comercio") }
                                )
                            }
                            MoocViewMode.KANBAN -> {
                                MoocKanbanBoard(
                                    orders = focusedOrders,
                                    isKitchenMode = isKitchenMode,
                                    onAccept = { viewModel.acceptOrder(it) },
                                    onPrepare = { viewModel.markOrderPreparing(it) },
                                    onReady = { viewModel.markOrderReady(it) },
                                    onAssignCourier = { viewModel.openCourierModal(it) },
                                    onOpenDrawer = { viewModel.openOrderDetailDrawer(it) },
                                    onOpenIncident = { viewModel.openIncidentModal(it) },
                                    onOpenRefund = { viewModel.openRefundModal(it) },
                                    onCancel = { viewModel.cancelOrder(it, "Rechazado por el comercio") }
                                )
                            }
                            MoocViewMode.LIST -> {
                                MoocListView(
                                    orders = focusedOrders,
                                    onOpenDrawer = { viewModel.openOrderDetailDrawer(it) },
                                    onAccept = { viewModel.acceptOrder(it) }
                                )
                            }
                        }
                    }
                }

                // ─── 5. PANEL LATERAL DE DETALLE (DRAWER) ───
                if (uiState.isDetailDrawerOpen && uiState.selectedOrderForDetail != null) {
                    MoocOrderDetailDrawer(
                        order = uiState.selectedOrderForDetail!!,
                        isTablet = isTablet,
                        onClose = { viewModel.closeOrderDetailDrawer() },
                        onAccept = { viewModel.acceptOrder(it) },
                        onReady = { viewModel.markOrderReady(it) },
                        onAssignCourier = { viewModel.openCourierModal(it) },
                        onCancel = { viewModel.cancelOrder(it, "Cancelado desde panel lateral") }
                    )
                }
            }
        }

        // ─── MODALES (ASIGNACIÓN, INCIDENCIAS, REEMBOLSOS) ───
        if (uiState.isCourierModalOpen && uiState.orderForCourierAssignment != null) {
            MoocCourierAssignmentModal(
                order = uiState.orderForCourierAssignment!!,
                couriers = uiState.rankedCouriers,
                onDismiss = { viewModel.closeCourierModal() },
                onSelectCourier = { cId, cName -> viewModel.assignCourierToOrder(uiState.orderForCourierAssignment!!.orderId, cId, cName) }
            )
        }

        if (uiState.isIncidentModalOpen && uiState.orderForIncident != null) {
            MoocIncidentModal(
                order = uiState.orderForIncident!!,
                onDismiss = { viewModel.closeIncidentModal() },
                onSubmit = { type, notes -> viewModel.submitIncident(uiState.orderForIncident!!.orderId, type, notes) }
            )
        }

        if (uiState.isRefundModalOpen && uiState.orderForRefund != null) {
            MoocRefundModal(
                order = uiState.orderForRefund!!,
                onDismiss = { viewModel.closeRefundModal() },
                onSubmit = { type, amount, reason -> viewModel.submitRefund(uiState.orderForRefund!!.orderId, type, amount, reason) }
            )
        }
    }
}

// ─── 1. HEADER COMPACTO CON MODO COCINA (<= 56dp) ───
@Composable
fun MoocCompactHeader(
    uiState: MerchantOrdersUiState,
    isKitchenMode: Boolean,
    onToggleKitchenMode: () -> Unit,
    onRefresh: () -> Unit,
    onOpenKds: () -> Unit
) {
    Surface(
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(if (isKitchenMode) "🍳" else "📦", fontSize = 22.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (isKitchenMode) "Pedidos (Modo Cocina)" else "Pedidos",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 17.sp,
                            color = moocDark
                        )
                        if (isKitchenMode) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFFEA580C)) {
                                Text("MODO KDS", fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                            }
                        }
                    }
                    Text("SLA Promedio: ${uiState.promedioSlaMinutes} min", fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
                }
            }

            // Acciones Rápidas del Encabezado & Toggle Modo Cocina
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Button Toggle Modo Cocina
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = if (isKitchenMode) Color(0xFFFFEDD5) else Color(0xFFF1F5F9),
                    border = BorderStroke(1.dp, if (isKitchenMode) Color(0xFFEA580C) else Color(0xFFCBD5E1)),
                    modifier = Modifier.clickable { onToggleKitchenMode() }
                ) {
                    Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.SoupKitchen, contentDescription = null, tint = if (isKitchenMode) Color(0xFFEA580C) else Color(0xFF475569), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (isKitchenMode) "Cocina On" else "Modo Cocina",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isKitchenMode) Color(0xFFEA580C) else Color(0xFF475569)
                        )
                    }
                }

                IconButton(onClick = onRefresh, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.Refresh, contentDescription = "Actualizar", tint = BluePrimary, modifier = Modifier.size(20.dp))
                }
                IconButton(onClick = { }, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.QrCodeScanner, contentDescription = "Escanear QR", tint = moocPurple, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

// ─── 2. FILA DE KPIS RÁPIDOS OPERATIVOS ───
@Composable
fun MoocQuickKpisRow(uiState: MerchantOrdersUiState) {
    Surface(
        color = Color(0xFFF1F5F9),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            QuickKpiPill("Hoy: ${uiState.allOrders.size}", Color(0xFF334155), Modifier.weight(1f))
            QuickKpiPill("Pendientes: ${uiState.nuevosCount}", moocOrange, Modifier.weight(1f))
            QuickKpiPill("SLA: ${uiState.promedioSlaMinutes} min", moocBlue, Modifier.weight(1f))
            val retrasadosCount = uiState.allOrders.count { it.slaStatus == SlaStatus.CRITICAL }
            QuickKpiPill("Retrasados: $retrasadosCount", if (retrasadosCount > 0) moocRed else Color(0xFF10B981), Modifier.weight(1f))
        }
    }
}

@Composable
fun QuickKpiPill(text: String, color: Color, modifier: Modifier = Modifier) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.12f),
        border = BorderStroke(1.dp, color.copy(alpha = 0.3f)),
        modifier = modifier
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(vertical = 4.dp, horizontal = 6.dp)) {
            Text(
                text = text,
                fontSize = 11.sp,
                fontWeight = FontWeight.ExtraBold,
                color = color,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

// ─── 3. TOOLBAR CON MODO ENFOQUE + OMNISEARCH + CONMUTADOR + FILTROS ───
@Composable
fun MoocToolbar(
    uiState: MerchantOrdersUiState,
    activeViewMode: MoocViewMode,
    activeFocusMode: MoocFocusMode,
    onViewModeChange: (MoocViewMode) -> Unit,
    onFocusModeChange: (MoocFocusMode) -> Unit,
    onQueryChange: (String) -> Unit,
    onSelectStatus: (String?) -> Unit,
    onToggleVip: () -> Unit,
    onToggleUrgent: () -> Unit
) {
    Surface(
        color = Color.White,
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            // OmniSearch & Conmutador Modo Vista
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = onQueryChange,
                    placeholder = { Text("Buscar pedido, cliente, tel, #pedido...", fontSize = 12.sp, color = Color(0xFF94A3B8)) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(18.dp)) },
                    trailingIcon = {
                        if (uiState.searchQuery.isNotEmpty()) {
                            IconButton(onClick = { onQueryChange("") }) {
                                Icon(Icons.Default.Clear, contentDescription = "Limpiar", tint = Color.Gray, modifier = Modifier.size(16.dp))
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BluePrimary,
                        unfocusedBorderColor = Color(0xFFE2E8F0)
                    ),
                    modifier = Modifier.weight(1f).height(42.dp)
                )

                Spacer(modifier = Modifier.width(8.dp))

                // Conmutador Segmentado de Vistas (Cola 📋 | Kanban 📊 | Lista 📜)
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFF1F5F9),
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                ) {
                    Row(modifier = Modifier.padding(2.dp)) {
                        ViewModeIconButton(
                            icon = Icons.Default.FormatListBulleted,
                            isSelected = activeViewMode == MoocViewMode.SMART_QUEUE,
                            onClick = { onViewModeChange(MoocViewMode.SMART_QUEUE) },
                            tooltip = "Smart Queue"
                        )
                        ViewModeIconButton(
                            icon = Icons.Default.ViewColumn,
                            isSelected = activeViewMode == MoocViewMode.KANBAN,
                            onClick = { onViewModeChange(MoocViewMode.KANBAN) },
                            tooltip = "Kanban"
                        )
                        ViewModeIconButton(
                            icon = Icons.Default.ViewList,
                            isSelected = activeViewMode == MoocViewMode.LIST,
                            onClick = { onViewModeChange(MoocViewMode.LIST) },
                            tooltip = "Lista"
                        )
                    }
                }
            }

            // Fila de Modo Enfoque (Focus Modes)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(MoocFocusMode.values()) { mode ->
                    val isSelected = activeFocusMode == mode
                    FilterChip(
                        selected = isSelected,
                        onClick = { onFocusModeChange(mode) },
                        label = { Text("${mode.emoji} ${mode.label}", fontSize = 11.sp, fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary.copy(alpha = 0.15f),
                            selectedLabelColor = BluePrimary
                        )
                    )
                }
            }
        }
    }
}

@Composable
private fun ViewModeIconButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    onClick: () -> Unit,
    tooltip: String
) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(if (isSelected) BluePrimary else Color.Transparent)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            icon,
            contentDescription = tooltip,
            tint = if (isSelected) Color.White else Color(0xFF64748B),
            modifier = Modifier.size(18.dp)
        )
    }
}

// ─── 4. SMART QUEUE VIRTUAL Y VERTICAL (WORKSPACE 3.0) ───
@Composable
fun MoocSmartQueueView(
    orders: List<MerchantOrder>,
    isKitchenMode: Boolean,
    onAccept: (String) -> Unit,
    onReady: (String) -> Unit,
    onAssignCourier: (MerchantOrder) -> Unit,
    onOpenDrawer: (MerchantOrder) -> Unit,
    onOpenIncident: (MerchantOrder) -> Unit,
    onOpenRefund: (MerchantOrder) -> Unit,
    onCancel: (String) -> Unit = {}
) {
    val prioritarios = orders.filter { it.isVipCustomer || it.priority == OrderPriority.URGENT || it.slaStatus == SlaStatus.CRITICAL }
    val nuevos = orders.filter { it.rawPedido.status.equals("pending", true) && !prioritarios.contains(it) }
    val preparando = orders.filter { it.rawPedido.status.equals("preparing", true) && !prioritarios.contains(it) }
    val listos = orders.filter { it.rawPedido.status.equals("ready", true) && !prioritarios.contains(it) }
    val enRuta = orders.filter { it.rawPedido.status.equals("in_transit", true) && !prioritarios.contains(it) }
    val entregados = orders.filter { (it.rawPedido.status.equals("delivered", true) || it.rawPedido.status.equals("completed", true)) && !prioritarios.contains(it) }

    if (orders.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            BSEmptyState(
                type = BSEmptyStateType.Orders,
                customTitle = "Sin pedidos en cola",
                customDescription = "Los nuevos pedidos recibidos o filtrados aparecerán en este espacio de trabajo."
            )
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            if (prioritarios.isNotEmpty()) {
                item(key = "queue_header_priority") {
                    QueueSectionHeader(
                        title = "⚡ ATENCIONES PRIORITARIAS (${prioritarios.size})",
                        badgeBg = Color(0xFFFEF2F2),
                        badgeTextColor = moocRed,
                        icon = Icons.Default.Bolt
                    )
                }
                items(prioritarios, key = { "pri_${it.orderId}" }) { order ->
                    MoocEnterpriseOrderCard(
                        order = order,
                        isKitchenMode = isKitchenMode,
                        onAccept = { onAccept(order.orderId) },
                        onReady = { onReady(order.orderId) },
                        onAssignCourier = { onAssignCourier(order) },
                        onOpenDrawer = { onOpenDrawer(order) },
                        onOpenIncident = { onOpenIncident(order) },
                        onOpenRefund = { onOpenRefund(order) },
                        onCancel = { onCancel(order.orderId) }
                    )
                }
            }

            if (nuevos.isNotEmpty()) {
                item(key = "queue_header_new") {
                    QueueSectionHeader(
                        title = "🟡 NUEVOS PEDIDOS (${nuevos.size})",
                        badgeBg = moocOrange.copy(alpha = 0.15f),
                        badgeTextColor = moocOrange,
                        icon = Icons.Default.Notifications
                    )
                }
                items(nuevos, key = { "new_${it.orderId}" }) { order ->
                    MoocEnterpriseOrderCard(
                        order = order,
                        isKitchenMode = isKitchenMode,
                        onAccept = { onAccept(order.orderId) },
                        onReady = { onReady(order.orderId) },
                        onAssignCourier = { onAssignCourier(order) },
                        onOpenDrawer = { onOpenDrawer(order) },
                        onOpenIncident = { onOpenIncident(order) },
                        onOpenRefund = { onOpenRefund(order) },
                        onCancel = { onCancel(order.orderId) }
                    )
                }
            }

            if (preparando.isNotEmpty()) {
                item(key = "queue_header_prep") {
                    QueueSectionHeader(
                        title = "🟠 EN COCINA / PREPARANDO (${preparando.size})",
                        badgeBg = Color(0xFFFFEDD5),
                        badgeTextColor = Color(0xFFEA580C),
                        icon = Icons.Default.SoupKitchen
                    )
                }
                items(preparando, key = { "prep_${it.orderId}" }) { order ->
                    MoocEnterpriseOrderCard(
                        order = order,
                        isKitchenMode = isKitchenMode,
                        onAccept = { onAccept(order.orderId) },
                        onReady = { onReady(order.orderId) },
                        onAssignCourier = { onAssignCourier(order) },
                        onOpenDrawer = { onOpenDrawer(order) },
                        onOpenIncident = { onOpenIncident(order) },
                        onOpenRefund = { onOpenRefund(order) }
                    )
                }
            }

            if (listos.isNotEmpty() && !isKitchenMode) {
                item(key = "queue_header_ready") {
                    QueueSectionHeader(
                        title = "🟣 LISTOS PARA REPARTIDOR (${listos.size})",
                        badgeBg = Color(0xFFF3E8FF),
                        badgeTextColor = moocPurple,
                        icon = Icons.Default.CheckCircle
                    )
                }
                items(listos, key = { "ready_${it.orderId}" }) { order ->
                    MoocEnterpriseOrderCard(
                        order = order,
                        isKitchenMode = isKitchenMode,
                        onAccept = { onAccept(order.orderId) },
                        onReady = { onReady(order.orderId) },
                        onAssignCourier = { onAssignCourier(order) },
                        onOpenDrawer = { onOpenDrawer(order) },
                        onOpenIncident = { onOpenIncident(order) },
                        onOpenRefund = { onOpenRefund(order) }
                    )
                }
            }

            if (enRuta.isNotEmpty() && !isKitchenMode) {
                item(key = "queue_header_route") {
                    QueueSectionHeader(
                        title = "🩵 EN RUTA (${enRuta.size})",
                        badgeBg = Color(0xFFE0F2FE),
                        badgeTextColor = moocBlue,
                        icon = Icons.Default.TwoWheeler
                    )
                }
                items(enRuta, key = { "route_${it.orderId}" }) { order ->
                    MoocEnterpriseOrderCard(
                        order = order,
                        isKitchenMode = isKitchenMode,
                        onAccept = { onAccept(order.orderId) },
                        onReady = { onReady(order.orderId) },
                        onAssignCourier = { onAssignCourier(order) },
                        onOpenDrawer = { onOpenDrawer(order) },
                        onOpenIncident = { onOpenIncident(order) },
                        onOpenRefund = { onOpenRefund(order) }
                    )
                }
            }

            if (entregados.isNotEmpty() && !isKitchenMode) {
                item(key = "queue_header_delivered") {
                    QueueSectionHeader(
                        title = "🟢 ENTREGADOS HOY (${entregados.size})",
                        badgeBg = Color(0xFFDCFCE7),
                        badgeTextColor = moocGreen,
                        icon = Icons.Default.TaskAlt
                    )
                }
                items(entregados, key = { "del_${it.orderId}" }) { order ->
                    MoocEnterpriseOrderCard(
                        order = order,
                        isKitchenMode = isKitchenMode,
                        onAccept = { onAccept(order.orderId) },
                        onReady = { onReady(order.orderId) },
                        onAssignCourier = { onAssignCourier(order) },
                        onOpenDrawer = { onOpenDrawer(order) },
                        onOpenIncident = { onOpenIncident(order) },
                        onOpenRefund = { onOpenRefund(order) }
                    )
                }
            }
        }
    }
}

@Composable
private fun QueueSectionHeader(
    title: String,
    badgeBg: Color,
    badgeTextColor: Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = badgeBg,
        border = BorderStroke(1.dp, badgeTextColor.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = badgeTextColor, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = badgeTextColor)
        }
    }
}

// ─── 5. TABLERO KANBAN DE PEDIDOS (NATIVO TABLET) ───
@Composable
fun MoocKanbanBoard(
    orders: List<MerchantOrder>,
    isKitchenMode: Boolean,
    onAccept: (String) -> Unit,
    onPrepare: (String) -> Unit,
    onReady: (String) -> Unit,
    onAssignCourier: (MerchantOrder) -> Unit,
    onOpenDrawer: (MerchantOrder) -> Unit,
    onOpenIncident: (MerchantOrder) -> Unit,
    onOpenRefund: (MerchantOrder) -> Unit,
    onCancel: (String) -> Unit = {}
) {
    val nuevos = orders.filter { it.rawPedido.status.equals("pending", true) }
    val preparando = orders.filter { it.rawPedido.status.equals("preparing", true) }
    val listos = orders.filter { it.rawPedido.status.equals("ready", true) }
    val enRuta = orders.filter { it.rawPedido.status.equals("in_transit", true) }
    val entregados = orders.filter { it.rawPedido.status.equals("delivered", true) || it.rawPedido.status.equals("completed", true) }

    LazyRow(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item { KanbanColumn("Nuevos", "🟡", nuevos, moocOrange, "Sin pedidos nuevos", "Los pedidos recién realizados aparecerán aquí.", isKitchenMode, onAccept, onPrepare, onReady, onAssignCourier, onOpenDrawer, onOpenIncident, onOpenRefund, onCancel) }
        item { KanbanColumn("Preparando", "🟠", preparando, Color(0xFFEA580C), "Sin pedidos en preparación", "Los pedidos aceptados en cocina figuran aquí.", isKitchenMode, onAccept, onPrepare, onReady, onAssignCourier, onOpenDrawer, onOpenIncident, onOpenRefund, onCancel) }
        item { KanbanColumn("Listos", "🟣", listos, moocPurple, "Sin pedidos listos", "Los pedidos finalizados listos para entrega.", isKitchenMode, onAccept, onPrepare, onReady, onAssignCourier, onOpenDrawer, onOpenIncident, onOpenRefund, onCancel) }
        item { KanbanColumn("En Ruta", "🩵", enRuta, moocBlue, "Sin pedidos en ruta", "Los pedidos asignados a repartidores en entrega.", isKitchenMode, onAccept, onPrepare, onReady, onAssignCourier, onOpenDrawer, onOpenIncident, onOpenRefund, onCancel) }
        item { KanbanColumn("Entregados", "🟢", entregados, moocGreen, "Sin pedidos entregados", "Historial de pedidos entregados del día.", isKitchenMode, onAccept, onPrepare, onReady, onAssignCourier, onOpenDrawer, onOpenIncident, onOpenRefund, onCancel) }
    }
}

@Composable
fun KanbanColumn(
    title: String,
    emoji: String,
    orders: List<MerchantOrder>,
    accentColor: Color,
    emptyTitle: String,
    emptyDescription: String,
    isKitchenMode: Boolean,
    onAccept: (String) -> Unit,
    onPrepare: (String) -> Unit,
    onReady: (String) -> Unit,
    onAssignCourier: (MerchantOrder) -> Unit,
    onOpenDrawer: (MerchantOrder) -> Unit,
    onOpenIncident: (MerchantOrder) -> Unit,
    onOpenRefund: (MerchantOrder) -> Unit,
    onCancel: (String) -> Unit = {}
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier.width(250.dp).fillMaxHeight()
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = accentColor.copy(alpha = 0.1f),
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(emoji, fontSize = 12.sp)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(title, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, color = accentColor)
                    }
                    Surface(shape = CircleShape, color = accentColor) {
                        Text(
                            "${orders.size}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            if (orders.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    BSEmptyState(
                        type = BSEmptyStateType.Orders,
                        customTitle = emptyTitle,
                        customDescription = emptyDescription,
                        modifier = Modifier.padding(8.dp)
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(orders, key = { it.orderId }) { order ->
                        MoocEnterpriseOrderCard(
                            order = order,
                            isKitchenMode = isKitchenMode,
                            onAccept = { onAccept(order.orderId) },
                            onReady = { onReady(order.orderId) },
                            onAssignCourier = { onAssignCourier(order) },
                            onOpenDrawer = { onOpenDrawer(order) },
                            onOpenIncident = { onOpenIncident(order) },
                            onOpenRefund = { onOpenRefund(order) },
                            onCancel = { onCancel(order.orderId) }
                        )
                    }
                }
            }
        }
    }
}

// ─── TARJETA WORKSPACE 3.0 (TIMELINE VIVO + SLA RING + AI SUGGESTIONS + LIVE PULSE + MODO COCINA) ───
@Composable
fun MoocEnterpriseOrderCard(
    order: MerchantOrder,
    isKitchenMode: Boolean,
    onAccept: () -> Unit,
    onReady: () -> Unit,
    onAssignCourier: () -> Unit,
    onOpenDrawer: () -> Unit,
    onOpenIncident: () -> Unit,
    onOpenRefund: () -> Unit,
    onCancel: () -> Unit = {}
) {
    var isExpanded by remember { mutableStateOf(false) }
    var showRejectConfirmDialog by remember { mutableStateOf(false) }

    // Live Pulse Animation para pedidos nuevos
    val isPending = order.rawPedido.status.equals("pending", true)
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isPending) 1.02f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    // Determinar color de Borde y SLA Ring Ratio
    val (borderColor, borderWidth) = remember(order.isVipCustomer, order.priority, order.slaStatus, isPending) {
        when {
            order.isVipCustomer -> Pair(moocGold, 2.dp)
            order.slaStatus == SlaStatus.CRITICAL -> Pair(moocRed, 2.dp)
            order.priority == OrderPriority.URGENT -> Pair(Color(0xFFEA580C), 2.dp)
            isPending -> Pair(moocBlue, 2.dp)
            else -> Pair(Color(0xFFE2E8F0), 1.dp)
        }
    }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (order.isVipCustomer) Color(0xFFFFFBEB) else Color.White,
        border = BorderStroke(borderWidth, borderColor),
        shadowElevation = if (order.isVipCustomer || isPending) 4.dp else 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .scale(pulseScale)
            .clickable { onOpenDrawer() }
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // ─── 1. TIMELINE VIVO ANIMADO SUPERIOR ───
            OrderLiveTimelineBar(status = order.rawPedido.status)

            // ─── 2. HEADER DE TARJETA CON SLA RING CIRCULAR ───
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val initials = order.customerName.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercase() }.joinToString("")
                    Surface(
                        shape = CircleShape,
                        color = if (order.isVipCustomer) moocGold else BluePrimary.copy(alpha = 0.15f),
                        modifier = Modifier.size(32.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                initials.ifBlank { "BS" },
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (order.isVipCustomer) Color.White else BluePrimary
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("#${order.displayOrderCode.removePrefix("#")}", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = moocDark)
                            if (order.isVipCustomer) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Surface(shape = RoundedCornerShape(4.dp), color = moocGold) {
                                    Text("👑 VIP", fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                }
                            }
                            if (order.priority == OrderPriority.URGENT) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFFEA580C)) {
                                    Text("⚡ URGENTE", fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                }
                            }
                        }
                        if (!isKitchenMode) {
                            Text(order.customerName, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF1E293B), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }

                // ─── 3. SLA RING CIRCULAR ───
                SlaRingIndicator(elapsedMinutes = order.elapsedMinutes, slaStatus = order.slaStatus)
            }

            // ─── 4. SMART SUGGESTIONS DE IA (SI APLICA) ───
            if (order.elapsedMinutes >= 15 && (isPending || order.rawPedido.status.equals("preparing", true))) {
                AiSmartSuggestionChip(elapsedMinutes = order.elapsedMinutes)
            }

            // Chips resumen (En Modo Cocina se oculta Precio y Método de Pago)
            if (!isKitchenMode) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    OrderTypePill(label = "🛵 Delivery", color = Color(0xFF0369A1))
                    OrderTypePill(label = "💳 ${order.paymentMethod}", color = Color(0xFF334155))
                    Spacer(modifier = Modifier.weight(1f))
                    Text("💰 C$ ${order.totalAmount.toInt()}", fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, color = BluePrimary)
                }
            }

            // Vista previa de Productos (Destacada en Modo Cocina)
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = if (isKitchenMode) Color(0xFFFFF7ED) else Color.Transparent,
                border = if (isKitchenMode) BorderStroke(1.dp, Color(0xFFFED7AA)) else null,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(modifier = Modifier.padding(if (isKitchenMode) 6.dp else 0.dp)) {
                    Text(
                        "🍔 ${order.itemsSummary}",
                        fontSize = if (isKitchenMode) 13.sp else 11.sp,
                        fontWeight = if (isKitchenMode) FontWeight.ExtraBold else FontWeight.Medium,
                        color = if (isKitchenMode) Color(0xFF9A3412) else Color(0xFF334155),
                        maxLines = if (isExpanded || isKitchenMode) 10 else 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // ─── ACCIONES RÁPIDAS INTELIGENTES ───
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.weight(1f)) {
                    when (order.rawPedido.status.lowercase()) {
                        "pending" -> {
                            Button(
                                onClick = onAccept,
                                colors = ButtonDefaults.buttonColors(containerColor = moocGreen),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                modifier = Modifier.height(34.dp)
                            ) {
                                Text("Aceptar ✔", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                            }
                            OutlinedButton(
                                onClick = { showRejectConfirmDialog = true },
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = moocRed),
                                border = BorderStroke(1.dp, moocRed),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                modifier = Modifier.height(34.dp)
                            ) {
                                Text("Rechazar ✕", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                            }
                        }
                        "preparing" -> {
                            Button(
                                onClick = onReady,
                                colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                modifier = Modifier.height(34.dp)
                            ) {
                                Text("Listo en Cocina 🏁", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                            }
                        }
                        "ready" -> {
                            Button(
                                onClick = onAssignCourier,
                                colors = ButtonDefaults.buttonColors(containerColor = moocPurple),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                modifier = Modifier.height(34.dp)
                            ) {
                                Text("Asignar Motorizado 🛵", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                            }
                        }
                        "in_transit" -> {
                            Button(
                                onClick = { onOpenDrawer() },
                                colors = ButtonDefaults.buttonColors(containerColor = moocBlue),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                modifier = Modifier.height(34.dp)
                            ) {
                                Text("Rastrear Entrega 📍", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                            }
                        }
                        else -> {
                            OutlinedButton(
                                onClick = { onOpenDrawer() },
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                modifier = Modifier.height(34.dp)
                            ) {
                                Text("Ver Detalle 👁️", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    IconButton(
                        onClick = onOpenIncident,
                        modifier = Modifier
                            .size(34.dp)
                            .background(Color(0xFFFEF2F2), RoundedCornerShape(8.dp))
                            .border(BorderStroke(1.dp, Color(0xFFFECACA)), RoundedCornerShape(8.dp))
                    ) {
                        Icon(Icons.Default.Warning, contentDescription = "Incidencia", tint = moocRed, modifier = Modifier.size(16.dp))
                    }
                }

                // Desplegable Accordion Inline — Control Refinado UX/UI
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isExpanded) Color(0xFFEFF6FF) else Color(0xFFF8FAFC),
                    border = BorderStroke(
                        1.dp, 
                        if (isExpanded) Color(0xFF3B82F6) else Color(0xFFCBD5E1)
                    ),
                    shadowElevation = if (isExpanded) 1.dp else 0.dp,
                    modifier = Modifier
                        .height(34.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { isExpanded = !isExpanded }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = if (isExpanded) "Menos" else "Más",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isExpanded) Color(0xFF1D4ED8) else Color(0xFF1E293B)
                        )
                        Icon(
                            imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            contentDescription = if (isExpanded) "Colapsar información del pedido" else "Expandir información del pedido",
                            tint = if (isExpanded) Color(0xFF1D4ED8) else Color(0xFF1E293B),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Accordion Inline Expandible
            AnimatedVisibility(visible = isExpanded) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .background(Color(0xFFF8FAFC), RoundedCornerShape(10.dp))
                        .border(BorderStroke(1.dp, Color(0xFFE2E8F0)), RoundedCornerShape(10.dp))
                        .padding(10.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    HorizontalDivider(color = Color(0xFFE2E8F0))
                    if (!isKitchenMode) {
                        Text("📍 Dirección: ${order.deliveryAddress}", fontSize = 11.sp, color = Color(0xFF1E293B), fontWeight = FontWeight.Medium)
                        Text("📞 Teléfono: ${order.customerPhone}", fontSize = 11.sp, color = Color(0xFF1E293B), fontWeight = FontWeight.Medium)
                    }
                    if (order.assignedCourierName != null) {
                        Text("🛵 Repartidor: ${order.assignedCourierName}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = moocPurple)
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
                        Button(
                            onClick = { },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                            modifier = Modifier.weight(1f).height(32.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text("📞 Llamar", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Button(
                            onClick = { },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = moocGreen),
                            modifier = Modifier.weight(1f).height(32.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text("💬 WhatsApp", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        OutlinedButton(
                            onClick = { onOpenRefund() },
                            shape = RoundedCornerShape(8.dp),
                            border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF1E293B)),
                            modifier = Modifier.weight(1f).height(32.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text("💰 Reembolso", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                        }
                    }
                }
            }
        }
    }

    if (showRejectConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showRejectConfirmDialog = false },
            title = { Text("¿Rechazar Pedido?", fontWeight = FontWeight.Black, fontSize = 16.sp) },
            text = { Text("¿Estás seguro de que deseas rechazar este pedido de ${order.customerName}? Esta acción cancelará el pedido en el sistema.", fontSize = 13.sp) },
            confirmButton = {
                Button(
                    onClick = {
                        showRejectConfirmDialog = false
                        onCancel()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = moocRed)
                ) {
                    Text("Sí, Rechazar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRejectConfirmDialog = false }) {
                    Text("Volver")
                }
            }
        )
    }
}

// ─── 6. BARRA DE TIMELINE VIVO ANIMADO ───
@Composable
fun OrderLiveTimelineBar(status: String) {
    val progressRatio by animateFloatAsState(
        targetValue = when (status.lowercase()) {
            "pending" -> 0.2f
            "preparing" -> 0.45f
            "ready" -> 0.7f
            "in_transit" -> 0.9f
            "delivered", "completed" -> 1.0f
            else -> 0.1f
        },
        animationSpec = tween(600, easing = FastOutSlowInEasing),
        label = "timeline"
    )

    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .background(Color(0xFFE2E8F0), CircleShape),
            contentAlignment = Alignment.CenterStart
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progressRatio)
                    .height(4.dp)
                    .background(
                        Brush.horizontalGradient(listOf(BluePrimary, moocGreen)),
                        CircleShape
                    )
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            TimelineDotLabel("Nuevo", progressRatio >= 0.2f)
            TimelineDotLabel("Cocina", progressRatio >= 0.45f)
            TimelineDotLabel("Listo", progressRatio >= 0.7f)
            TimelineDotLabel("En Ruta", progressRatio >= 0.9f)
        }
    }
}

@Composable
private fun TimelineDotLabel(label: String, isActive: Boolean) {
    Text(
        text = label,
        fontSize = 8.sp,
        fontWeight = if (isActive) FontWeight.ExtraBold else FontWeight.Normal,
        color = if (isActive) BluePrimary else Color(0xFF94A3B8)
    )
}

// ─── 7. SLA RING INDICATOR CIRCULAR ───
@Composable
fun SlaRingIndicator(elapsedMinutes: Int, slaStatus: SlaStatus) {
    val ringColor = when (slaStatus) {
        SlaStatus.NORMAL -> Color(0xFF10B981)
        SlaStatus.WARNING -> Color(0xFFF59E0B)
        SlaStatus.CRITICAL -> Color(0xFFEF4444)
        SlaStatus.BREACHED -> Color(0xFF0F172A)
    }

    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(34.dp)) {
        CircularProgressIndicator(
            progress = { (elapsedMinutes.coerceAtMost(30) / 30f) },
            color = ringColor,
            strokeWidth = 3.dp,
            trackColor = ringColor.copy(alpha = 0.2f),
            modifier = Modifier.size(34.dp)
        )
        Text(
            "${elapsedMinutes}m",
            fontSize = 9.sp,
            fontWeight = FontWeight.ExtraBold,
            color = ringColor
        )
    }
}

// ─── 8. SMART AI SUGGESTIONS CHIP ───
@Composable
fun AiSmartSuggestionChip(elapsedMinutes: Int) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFFEFF6FF),
        border = BorderStroke(1.dp, BluePrimary.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("🤖", fontSize = 12.sp)
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                "Sugerencia IA: Lleva $elapsedMinutes min. Conviene priorizar en cocina.",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = BluePrimary
            )
        }
    }
}

@Composable
private fun OrderTypePill(label: String, color: Color) {
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = label,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = color,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

// ─── 9. VISTA DE LISTA COMPACTA ───
@Composable
fun MoocListView(
    orders: List<MerchantOrder>,
    onOpenDrawer: (MerchantOrder) -> Unit,
    onAccept: (String) -> Unit
) {
    if (orders.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            BSEmptyState(
                type = BSEmptyStateType.Orders,
                customTitle = "Sin resultados de pedidos",
                customDescription = "No hay pedidos que coincidan con la búsqueda o filtro seleccionado."
            )
        }
    } else {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxSize()) {
            items(orders, key = { it.orderId }) { order ->
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    modifier = Modifier.fillMaxWidth().clickable { onOpenDrawer(order) }
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("#${order.displayOrderCode.removePrefix("#")} — ${order.customerName}", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text("${order.itemsSummary} • C$ ${order.totalAmount.toInt()}", fontSize = 11.sp, color = Color.Gray)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(order.rawPedido.status.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = BluePrimary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.Gray)
                        }
                    }
                }
            }
        }
    }
}

// ─── 10. PANEL LATERAL DE DETALLE DEL PEDIDO (DRAWER) ───
@Composable
fun MoocOrderDetailDrawer(
    order: MerchantOrder,
    isTablet: Boolean,
    onClose: () -> Unit,
    onAccept: (String) -> Unit,
    onReady: (String) -> Unit,
    onAssignCourier: (MerchantOrder) -> Unit,
    onCancel: (String) -> Unit
) {
    Surface(
        color = Color.White,
        shadowElevation = 16.dp,
        modifier = Modifier
            .width(if (isTablet) 380.dp else 300.dp)
            .fillMaxHeight()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Detalle del Pedido #${order.displayOrderCode.removePrefix("#")}", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                IconButton(onClick = onClose) { Icon(Icons.Default.Close, contentDescription = "Cerrar") }
            }

            HorizontalDivider()

            Text("Información del Cliente 👤", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(order.customerName, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text("Tel: ${order.customerPhone}", fontSize = 11.sp, color = Color.Gray)
            Text("Dirección: ${order.deliveryAddress}", fontSize = 11.sp, color = Color.Gray)

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                val context = LocalContext.current
                val rawDigits = order.customerPhone.filter { it.isDigit() }
                Button(
                    onClick = {
                        if (order.customerPhone.isNotBlank()) {
                            try {
                                val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${order.customerPhone.trim()}"))
                                context.startActivity(dialIntent)
                            } catch (_: Exception) {}
                        }
                    },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Llamar", fontSize = 10.sp)
                }
                Button(
                    onClick = {
                        if (rawDigits.isNotBlank()) {
                            try {
                                val waNumber = if (rawDigits.length == 8) "505$rawDigits" else rawDigits
                                val waUri = Uri.parse("https://api.whatsapp.com/send?phone=$waNumber")
                                val waIntent = Intent(Intent.ACTION_VIEW, waUri)
                                context.startActivity(waIntent)
                            } catch (_: Exception) {}
                        }
                    },
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = moocGreen),
                    modifier = Modifier.weight(1f)
                ) {
                    Text("WhatsApp", fontSize = 10.sp)
                }
            }

            HorizontalDivider()

            Text("Timeline del Pedido ⏱️", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            order.timelineSteps.forEach { step ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (step.isCompleted) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                        contentDescription = null,
                        tint = if (step.isCompleted) moocGreen else Color.Gray,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(step.stepName, fontSize = 11.sp, fontWeight = if (step.isCompleted) FontWeight.Bold else FontWeight.Normal)
                    Spacer(modifier = Modifier.weight(1f))
                    Text(step.timestampFormatted, fontSize = 10.sp, color = Color.Gray)
                }
            }

            HorizontalDivider()

            Text("Productos Solicitados 🍔", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(order.itemsSummary, fontSize = 11.sp, color = Color(0xFF334155))
            Text("Total: C$ ${order.totalAmount.toInt()} (${order.paymentMethod})", fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, color = BluePrimary)

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedButton(
                onClick = { onCancel(order.orderId) },
                colors = ButtonDefaults.outlinedButtonColors(contentColor = moocRed),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Cancelar Pedido", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

// ─── 11. MODAL ASIGNACIÓN INTELIGENTE DE REPARTIDORES ───
@Composable
fun MoocCourierAssignmentModal(
    order: MerchantOrder,
    couriers: List<CourierRecommendation>,
    onDismiss: () -> Unit,
    onSelectCourier: (String, String) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Asignación de Motorizado (Smart Mode) 🛵", fontWeight = FontWeight.Bold, fontSize = 15.sp) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 300.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text("Repartidores recomendados para el pedido #${order.displayOrderCode.removePrefix("#")}:", fontSize = 12.sp, color = Color.Gray)

                couriers.forEach { c ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (c.isRecommended) Color(0xFFEFF6FF) else Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, if (c.isRecommended) BluePrimary else Color(0xFFE2E8F0)),
                        modifier = Modifier.fillMaxWidth().clickable { onSelectCourier(c.courierId, c.courierName) }
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(c.courierName, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    if (c.isRecommended) {
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("⭐ Recomendado", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                                    }
                                }
                                Text("${c.vehicleType} • ${c.distanceKm} km • ETA ${c.etaMinutes}m • Score ${c.score}/100", fontSize = 10.sp, color = Color.Gray)
                            }
                            Button(onClick = { onSelectCourier(c.courierId, c.courierName) }, shape = RoundedCornerShape(8.dp)) {
                                Text("Asignar", fontSize = 10.sp)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Cerrar") }
        }
    )
}

// ─── 12. MODAL DE INCIDENCIAS ───
@Composable
fun MoocIncidentModal(order: MerchantOrder, onDismiss: () -> Unit, onSubmit: (IncidentType, String) -> Unit) {
    var selectedType by remember { mutableStateOf(IncidentType.CUSTOMER_UNRESPONSIVE) }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Registrar Incidencia ⚠️", fontWeight = FontWeight.Bold, fontSize = 15.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Selecciona el tipo de eventualidad para #${order.displayOrderCode.removePrefix("#")}:", fontSize = 12.sp)
                IncidentType.values().forEach { type ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth().clickable { selectedType = type }
                    ) {
                        RadioButton(selected = selectedType == type, onClick = { selectedType = type })
                        Text(type.label, fontSize = 11.sp)
                    }
                }
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    placeholder = { Text("Notas adicionales...", fontSize = 11.sp) },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSubmit(selectedType, notes) }, colors = ButtonDefaults.buttonColors(containerColor = moocRed)) {
                Text("Registrar Incidencia")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}

// ─── 13. MODAL DE REEMBOLSOS ───
@Composable
fun MoocRefundModal(order: MerchantOrder, onDismiss: () -> Unit, onSubmit: (RefundType, Double, String) -> Unit) {
    var refundType by remember { mutableStateOf(RefundType.TOTAL) }
    var reason by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Procesar Reembolso 💰", fontWeight = FontWeight.Bold, fontSize = 15.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Reembolso para #${order.displayOrderCode.removePrefix("#")} (Total: C$ ${order.totalAmount.toInt()}):", fontSize = 12.sp)
                Row {
                    RadioButton(selected = refundType == RefundType.TOTAL, onClick = { refundType = RefundType.TOTAL })
                    Text("Total (C$ ${order.totalAmount.toInt()})", fontSize = 11.sp, modifier = Modifier.align(Alignment.CenterVertically))
                }
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    placeholder = { Text("Motivo del reembolso...", fontSize = 11.sp) },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSubmit(refundType, order.totalAmount, reason) }, colors = ButtonDefaults.buttonColors(containerColor = BluePrimary)) {
                Text("Aprobar Reembolso")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}
