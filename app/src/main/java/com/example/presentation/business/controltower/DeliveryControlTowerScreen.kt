package com.example.presentation.business.controltower

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.model.controltower.*
import com.example.domain.model.dashboard.AlertSeverity
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary

val dctRed = Color(0xFFEF4444)
val dctGreen = Color(0xFF10B981)
val dctOrange = Color(0xFFF59E0B)
val dctBlue = Color(0xFF2563EB)
val dctPurple = Color(0xFF8B5CF6)
val dctDark = Color(0xFF0F172A)
val dctBg = Color(0xFFF8FAFC)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryControlTowerScreen(
    businessId: String,
    onOpenKds: () -> Unit,
    onOpenDashboard: () -> Unit,
    viewModel: DeliveryControlTowerViewModel = remember { DeliveryControlTowerViewModel() }
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(businessId) {
        viewModel.startControlTower(businessId)
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(dctBg)
    ) {
        val isTablet = maxWidth > 720.dp

        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = BluePrimary)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Cargando Delivery Control Tower (DCT)...", fontSize = 13.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                }
            }
        } else {
            Column(modifier = Modifier.fillMaxSize()) {

                // ─── ZONA 1: SMART COMMAND HEADER ───
                DctSmartCommandHeader(
                    uiState = uiState,
                    onOpenDashboard = onOpenDashboard,
                    onOpenKds = onOpenKds
                )

                // ─── ZONA 2: KPIS OPERATIVOS ───
                DctKpiRow(uiState = uiState)

                // ─── BUSCADOR OMNIBOX UNIFICADO ───
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = uiState.searchQuery,
                        onValueChange = { viewModel.updateSearchQuery(it) },
                        placeholder = { Text("Buscar en la Torre de Control (Pedido, Cliente, Repartidor, Dirección)...", fontSize = 12.sp) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = BluePrimary) },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    )
                }

                // ─── CONTENIDO PRINCIPAL: DIVISION EN COLUMNAS/ZONAS ───
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Columna Izquierda: Mapa Operacional de Flota (Corazón del DCT)
                    Column(modifier = Modifier.weight(if (isTablet) 1.2f else 1f).fillMaxHeight()) {
                        DctFleetMapWidget(
                            couriers = uiState.filteredFleetCouriers,
                            recommendedCourier = uiState.recommendedCourier,
                            selectedCourier = uiState.selectedCourierForDetail,
                            onSelectCourier = { viewModel.selectCourierForDetail(it) }
                        )
                    }

                    // Columna Derecha: Pedidos Activos, KDS, Alertas & Incidencias
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // 1. Panel de Pedidos Activos
                        DctActiveOrdersPanel(
                            orders = uiState.filteredActiveOrders,
                            onSelectOrder = { viewModel.selectOrderForDetail(it) },
                            onAssign = { viewModel.openAssignmentModal(it) }
                        )

                        // 2. Panel KDS por Estaciones de Cocina
                        DctKdsStationPanel(
                            stations = uiState.kdsStations,
                            onOpenKds = onOpenKds
                        )

                        // 3. Panel de Alertas & ETA Center
                        DctAlertsAndEtaPanel(
                            alerts = uiState.criticalAlerts,
                            eta = uiState.etaBreakdown
                        )
                    }
                }
            }
        }

        // ─── MODAL ASIGNACIÓN INTELIGENTE ───
        if (uiState.isAssignmentModalOpen && uiState.selectedOrderForDetail != null) {
            DctAssignmentModal(
                order = uiState.selectedOrderForDetail!!,
                couriers = uiState.fleetCouriers,
                recommended = uiState.recommendedCourier,
                onDismiss = { viewModel.closeAssignmentModal() },
                onConfirmAssign = { cId, cName -> viewModel.assignCourierToOrder(uiState.selectedOrderForDetail!!.orderId, cId, cName) }
            )
        }
    }
}

// ─── ZONA 1: SMART COMMAND HEADER ───
@Composable
fun DctSmartCommandHeader(
    uiState: DeliveryControlTowerUiState,
    onOpenDashboard: () -> Unit,
    onOpenKds: () -> Unit
) {
    Surface(
        color = Color.White,
        shadowElevation = 4.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(
                            Brush.linearGradient(listOf(BluePrimary, BlueSecondary)),
                            RoundedCornerShape(10.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.CellTower, contentDescription = null, tint = Color.White, modifier = Modifier.size(22.dp))
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text("Delivery Control Tower (DCT) v1.0", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = dctDark)
                    Text(uiState.systemHealth.overallStatusLabel, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = dctGreen)
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(onClick = onOpenDashboard, shape = RoundedCornerShape(8.dp)) {
                    Text("Dashboard", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
                Button(onClick = onOpenKds, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = dctGreen)) {
                    Text("Abrir KDS", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ─── ZONA 2: KPIS OPERATIVOS ───
@Composable
fun DctKpiRow(uiState: DeliveryControlTowerUiState) {
    Surface(color = Color(0xFFF1F5F9), modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            DctKpiCard("ACTIVOS", uiState.activeOrdersCount.toString(), BluePrimary, Modifier.weight(1f))
            DctKpiCard("EN RIESGO", uiState.overdueOrdersCount.toString(), if (uiState.overdueOrdersCount > 0) dctRed else Color.Gray, Modifier.weight(1f))
            DctKpiCard("COCINA", uiState.kitchenOrdersCount.toString(), dctOrange, Modifier.weight(1f))
            DctKpiCard("LISTOS", uiState.readyOrdersCount.toString(), dctPurple, Modifier.weight(1f))
            DctKpiCard("EN RUTA", uiState.inTransitOrdersCount.toString(), dctGreen, Modifier.weight(1f))
            DctKpiCard("SLA %", "${uiState.slaCompliancePercentage}%", dctGreen, Modifier.weight(1f))
        }
    }
}

@Composable
fun DctKpiCard(title: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = Color.White,
        shadowElevation = 1.dp,
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF64748B))
            Text(value, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = color)
        }
    }
}

// ─── ZONA 3: MAPA OPERACIONAL DE FLOTA (CORAZÓN DEL DCT) ───
@Composable
fun DctFleetMapWidget(
    couriers: List<FleetCourier>,
    recommendedCourier: FleetCourier?,
    selectedCourier: FleetCourier?,
    onSelectCourier: (FleetCourier?) -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFF0F172A), // Simulación de Mapa Dark Mode
        shadowElevation = 4.dp,
        modifier = Modifier.fillMaxSize()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Map, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Mapa Operacional de Flota en Vivo 🗺️", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = Color.White)
                }
                Surface(shape = CircleShape, color = dctGreen) {
                    Text("${couriers.size} Repartidores", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                }
            }

            // Simulación Interactiva del Mapa de Flota
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFF1E293B),
                border = BorderStroke(1.dp, Color(0xFF334155)),
                modifier = Modifier.weight(1f).fillMaxWidth()
            ) {
                Box(modifier = Modifier.fillMaxSize().padding(12.dp)) {
                    Text("📍 Restaurante Sucursal Central", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF38BDF8), modifier = Modifier.align(Alignment.Center))

                    // Representación de Repartidores en Mapa
                    LazyRow(
                        modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(couriers, key = { it.courierId }) { courier ->
                            val isRec = courier.courierId == recommendedCourier?.courierId
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (isRec) Color(0xFF0284C7) else Color(0xFF334155),
                                border = BorderStroke(1.dp, if (isRec) Color.White else Color.Transparent),
                                modifier = Modifier.clickable { onSelectCourier(courier) }
                            ) {
                                Row(modifier = Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text("🛵", fontSize = 14.sp)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Column {
                                        Text(courier.name, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        Text("${courier.status.label} • ${courier.distanceKm} km", fontSize = 9.sp, color = Color(0xFF94A3B8))
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Ficha Técnica de Repartidor Seleccionado
            if (selectedCourier != null) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFF1E293B),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text(selectedCourier.name, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                            Text("Vehículo: ${selectedCourier.vehicleType} • Batería: ${selectedCourier.batteryLevel}% • Rating: ⭐ ${selectedCourier.rating}", fontSize = 10.sp, color = Color(0xFF94A3B8))
                        }
                        IconButton(onClick = { onSelectCourier(null) }) {
                            Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color.White, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}

// ─── PANEL DE PEDIDOS ACTIVOS ───
@Composable
fun DctActiveOrdersPanel(
    orders: List<ControlTowerOrder>,
    onSelectOrder: (ControlTowerOrder) -> Unit,
    onAssign: (ControlTowerOrder) -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Pedidos Activos (${orders.size}) 📦", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)

            if (orders.isEmpty()) {
                Text("No hay pedidos activos.", fontSize = 11.sp, color = Color.Gray)
            } else {
                orders.take(4).forEach { order ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, order.slaStatus.badgeColor.copy(alpha = 0.5f)),
                        modifier = Modifier.fillMaxWidth().clickable { onSelectOrder(order) }
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("#${order.displayOrderCode.removePrefix("#")} — ${order.customerName}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    if (order.isVip) Text(" 👑", fontSize = 10.sp)
                                }
                                Text("${order.itemsSummary} • C$ ${order.totalAmount.toInt()}", fontSize = 10.sp, color = Color.Gray)
                            }

                            Button(
                                onClick = { onAssign(order) },
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Text("Asignar 🛵", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── PANEL KDS POR ESTACIONES DE COCINA ───
@Composable
fun DctKdsStationPanel(stations: List<KdsStationSummary>, onOpenKds: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Cocina por Estaciones (KDS) 🍳", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
                TextButton(onClick = onOpenKds) { Text("Ver KDS ➔", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BluePrimary) }
            }

            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(stations) { st ->
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFF1F5F9),
                        modifier = Modifier.width(130.dp)
                    ) {
                        Column(modifier = Modifier.padding(8.dp)) {
                            Text(st.stationType.label, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                            Text("Pendientes: ${st.pendingCount}", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = BluePrimary)
                            Text("Promedio: ${st.avgTimeMinutes}m", fontSize = 9.sp, color = Color.Gray)
                        }
                    }
                }
            }
        }
    }
}

// ─── PANEL DE ALERTAS & ETA CENTER ───
@Composable
fun DctAlertsAndEtaPanel(alerts: List<ControlTowerAlert>, eta: EtaBreakdown) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("ETA Center & Alertas 🔔", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
            Text("Cocina (${eta.kitchenPrepMinutes}m) ➔ Despacho (${eta.dispatchMinutes}m) ➔ Viaje (${eta.travelMinutes}m) = ETA Total: ${eta.totalEtaMinutes}m", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BluePrimary)

            alerts.forEach { alert ->
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFFEF2F2),
                    border = BorderStroke(1.dp, dctRed),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("🔴 ", fontSize = 12.sp)
                        Column {
                            Text(alert.title, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = dctRed)
                            Text(alert.message, fontSize = 10.sp, color = Color(0xFF475569))
                        }
                    }
                }
            }
        }
    }
}

// ─── MODAL DE ASIGNACIÓN INTELIGENTE ───
@Composable
fun DctAssignmentModal(
    order: ControlTowerOrder,
    couriers: List<FleetCourier>,
    recommended: FleetCourier?,
    onDismiss: () -> Unit,
    onConfirmAssign: (String, String) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Asignar Repartidor a #${order.displayOrderCode.removePrefix("#")} 🛵", fontWeight = FontWeight.Bold, fontSize = 15.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (recommended != null) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFFEFF6FF),
                        border = BorderStroke(1.dp, BluePrimary),
                        modifier = Modifier.fillMaxWidth().clickable { onConfirmAssign(recommended.courierId, recommended.name) }
                    ) {
                        Row(modifier = Modifier.padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text("⭐ Recomendado: ${recommended.name}", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = BluePrimary)
                                Text("Distancia: ${recommended.distanceKm} km • Rating: ⭐ ${recommended.rating}", fontSize = 10.sp, color = Color.Gray)
                            }
                            Button(onClick = { onConfirmAssign(recommended.courierId, recommended.name) }) { Text("Asignar", fontSize = 10.sp) }
                        }
                    }
                }

                Text("Otros repartidores disponibles:", fontSize = 11.sp, color = Color.Gray)
                couriers.forEach { c ->
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFF8FAFC),
                        modifier = Modifier.fillMaxWidth().clickable { onConfirmAssign(c.courierId, c.name) }
                    ) {
                        Row(modifier = Modifier.padding(8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(c.name, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            Text("${c.distanceKm} km", fontSize = 10.sp, color = Color.Gray)
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Cerrar") } }
    )
}
