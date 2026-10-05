package com.example.presentation.admin

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.FirebaseManager
import com.example.Pedido
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch

/**
 * HOME CANÓNICO: Dashboard Live Operations Enterprise.
 *
 * Muestra KPIs en tiempo real de 5 dominios autoritativos:
 * 1. PEDIDOS GLOBALES (Total, Pendientes, En Preparación, Esperando Courier, Asignados, En Ruta, Entregados, Cancelados)
 * 2. COMERCIO (Commerce Delivery Activos, Entregados, Cancelados)
 * 3. DELIVERY EXPRESS X→Y (Creados, Esperando Courier, Asignados, En Tránsito, Completados, Cancelados)
 * 4. FLOTA (Activos, Online Disponibles, Ocupados, En Pausa, Offline)
 * 5. OPERACIÓN (Activos Ahora, Sin Motorizado, Con Retraso, Incidencias)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    firebaseManager: FirebaseManager
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }

    // ── 1. SNAPSHOT LISTENERS DE FIRESTORE EN TIEMPO REAL ───────────────────
    val orders by firebaseManager.listenToPedidos().collectAsState(initial = emptyList())
    val drivers by firebaseManager.listenToDrivers().collectAsState(initial = emptyList())
    val motorizadosGps by firebaseManager.obtenerFlujoMotorizadosActivos().collectAsState(initial = emptyList())
    val allUsers by firebaseManager.listenToAllUsers().collectAsState(initial = emptyList())

    // ── 2. DERIVACIÓN CANÓNICA DE KPIS DE LIVE OPERATIONS ───────────────────

    // A. PEDIDOS GLOBALES
    val totalOrders = orders.size
    val pendingCount = remember(orders) { orders.count { it.status.lowercase() in listOf("pending", "pendiente", "created") } }
    val preparingCount = remember(orders) { orders.count { it.status.lowercase() in listOf("preparing", "preparando") } }
    val waitingCourierCount = remember(orders) { orders.count { it.status.lowercase() in listOf("ready", "listo", "ready_for_pickup") && it.motorizadoId.isBlank() } }
    val assignedCount = remember(orders) { orders.count { it.status.lowercase() in listOf("assigned", "asignado", "courier_accepted") } }
    val pickedUpCount = remember(orders) { orders.count { it.status.lowercase() in listOf("picked_up", "recogido") } }
    val inTransitCount = remember(orders) { orders.count { it.status.lowercase() in listOf("in_transit", "en_ruta", "delivering") } }
    val deliveredCount = remember(orders) { orders.count { it.status.lowercase() in listOf("delivered", "entregado", "completed", "completado") } }
    val cancelledCount = remember(orders) { orders.count { it.status.lowercase() in listOf("cancelled", "cancelado", "rejected") } }

    // B. COMERCIO (Commerce Delivery)
    val commerceOrders = remember(orders) { orders.filter { it.serviceType != "X_TO_Y_DELIVERY" } }
    val commerceActive = remember(commerceOrders) { commerceOrders.count { it.status.lowercase() !in listOf("delivered", "entregado", "completed", "cancelled", "cancelado") } }
    val commerceDelivered = remember(commerceOrders) { commerceOrders.count { it.status.lowercase() in listOf("delivered", "entregado", "completed") } }
    val commerceCancelled = remember(commerceOrders) { commerceOrders.count { it.status.lowercase() in listOf("cancelled", "cancelado") } }

    // C. DELIVERY EXPRESS X→Y
    val expressOrders = remember(orders) { orders.filter { it.serviceType == "X_TO_Y_DELIVERY" } }
    val expressCreated = expressOrders.size
    val expressWaitingCourier = remember(expressOrders) { expressOrders.count { it.motorizadoId.isBlank() && it.status.lowercase() !in listOf("delivered", "completed", "cancelled") } }
    val expressAssigned = remember(expressOrders) { expressOrders.count { it.motorizadoId.isNotBlank() && it.status.lowercase() in listOf("assigned", "courier_accepted") } }
    val expressInTransit = remember(expressOrders) { expressOrders.count { it.status.lowercase() in listOf("in_transit", "delivering", "picked_up") } }
    val expressCompleted = remember(expressOrders) { expressOrders.count { it.status.lowercase() in listOf("delivered", "completed", "entregado") } }
    val expressCancelled = remember(expressOrders) { expressOrders.count { it.status.lowercase() in listOf("cancelled", "cancelado") } }

    // D. FLOTA
    val totalDrivers = drivers.size
    val activeDrivers = remember(drivers) { drivers.count { it.active } }
    val onlineDrivers = remember(motorizadosGps) { motorizadosGps.size }
    val busyDrivers = remember(orders) { orders.filter { it.status.lowercase() in listOf("in_transit", "delivering", "picked_up") && it.motorizadoId.isNotBlank() }.map { it.motorizadoId }.distinct().size }
    val availableDrivers = (onlineDrivers - busyDrivers).coerceAtLeast(0)

    // E. OPERACIÓN & ALERTAS
    val activeOrdersNow = pendingCount + preparingCount + waitingCourierCount + assignedCount + inTransitCount
    val unassignedOrders = pendingCount + waitingCourierCount
    val totalRevenue = remember(orders) { orders.filter { it.status.lowercase() in listOf("delivered", "completed") }.sumOf { it.total } }

    // Búsqueda y filtrado de órdenes en vivo
    var searchQuery by remember { mutableStateOf("") }
    var selectedDomainFilter by remember { mutableStateOf("ALL") } // ALL, COMMERCE, EXPRESS

    val filteredLiveOrders = remember(orders, searchQuery, selectedDomainFilter) {
        orders.filter { o ->
            val matchQuery = searchQuery.isBlank() ||
                    o.pedidoId.contains(searchQuery, ignoreCase = true) ||
                    o.customerName.contains(searchQuery, ignoreCase = true) ||
                    o.businessName.contains(searchQuery, ignoreCase = true)
            val matchDomain = when (selectedDomainFilter) {
                "COMMERCE" -> o.serviceType != "X_TO_Y_DELIVERY"
                "EXPRESS" -> o.serviceType == "X_TO_Y_DELIVERY"
                else -> true
            }
            matchQuery && matchDomain
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            AdminDrawerContent(
                currentRoute = AdminRoutes.DASHBOARD,
                onNavigate = onNavigate,
                onCloseDrawer = { coroutineScope.launch { drawerState.close() } },
                onLogout = onLogout
            )
        }
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("BlueSystem", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color.White)
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(
                                    color = Color(0xFF10B981),
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text("LIVE OPS", color = Color.White, fontSize = 8.5.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                                }
                            }
                            Text("Consola Administrativa Global", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = { coroutineScope.launch { drawerState.open() } }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menú", tint = Color.White)
                        }
                    },
                    actions = {
                        IconButton(onClick = { onNavigate(AdminRoutes.NOTIFICATIONS) }) {
                            BadgedBox(
                                badge = {
                                    if (unassignedOrders > 0) {
                                        Badge(containerColor = Color(0xFFEF4444)) { Text(unassignedOrders.toString()) }
                                    }
                                }
                            ) {
                                Icon(Icons.Default.Notifications, contentDescription = "Notificaciones", tint = Color.White)
                            }
                        }
                        IconButton(onClick = { onNavigate(AdminRoutes.LIVE_COURIER_MONITOR) }) {
                            Icon(Icons.Default.GpsFixed, contentDescription = "Mapa en Vivo", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = BluePrimary)
                )
            }
        ) { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // ── BLOQUE DE ACCESO RÁPIDO A MÓDULOS ─────────────────────────
                item {
                    Text(
                        "MÓDULOS OPERACIONALES ENTERPRISE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF64748B),
                        letterSpacing = 0.8.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        item {
                            QuickModuleCard(
                                title = "Solicitudes Comercio",
                                count = "Revisar",
                                icon = Icons.Default.Storefront,
                                color = Color(0xFF4F46E5),
                                onClick = { onNavigate(AdminRoutes.MERCHANT_REQUESTS) }
                            )
                        }
                        item {
                            QuickModuleCard(
                                title = "Solicitudes Courier",
                                count = "Expedientes",
                                icon = Icons.Default.TwoWheeler,
                                color = Color(0xFF0284C7),
                                onClick = { onNavigate(AdminRoutes.COURIER_REQUESTS) }
                            )
                        }
                        item {
                            QuickModuleCard(
                                title = "Caja & Cierres",
                                count = "Arqueos",
                                icon = Icons.Default.AccountBalanceWallet,
                                color = Color(0xFF059669),
                                onClick = { onNavigate(AdminRoutes.COURIER_CASH_CENTER) }
                            )
                        }
                        item {
                            QuickModuleCard(
                                title = "Soporte & Ayuda",
                                count = "Tickets",
                                icon = Icons.Default.SupportAgent,
                                color = Color(0xFFD97706),
                                onClick = { onNavigate(AdminRoutes.SUPPORT_CENTER) }
                            )
                        }
                        item {
                            QuickModuleCard(
                                title = "Configuración",
                                count = "Global",
                                icon = Icons.Default.SettingsSuggest,
                                color = Color(0xFF475569),
                                onClick = { onNavigate(AdminRoutes.GLOBAL_CONFIG) }
                            )
                        }
                    }
                }

                // ── 1. DOMINIO: PEDIDOS GLOBALES ──────────────────────────────
                item {
                    KpiDomainCard(
                        title = "PEDIDOS GLOBALES",
                        icon = Icons.Default.ReceiptLong,
                        accentColor = BluePrimary
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            KpiMetricItem("Total Pedidos", totalOrders.toString(), Color(0xFF1E293B), modifier = Modifier.weight(1f))
                            KpiMetricItem("Pendientes", pendingCount.toString(), Color(0xFFE11938), modifier = Modifier.weight(1f))
                            KpiMetricItem("En Preparación", preparingCount.toString(), Color(0xFFD97706), modifier = Modifier.weight(1f))
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            KpiMetricItem("Esperando Courier", waitingCourierCount.toString(), Color(0xFFDC2626), modifier = Modifier.weight(1f))
                            KpiMetricItem("Asignados", assignedCount.toString(), Color(0xFF2563EB), modifier = Modifier.weight(1f))
                            KpiMetricItem("En Ruta", inTransitCount.toString(), Color(0xFF0284C7), modifier = Modifier.weight(1f))
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            KpiMetricItem("Entregados", deliveredCount.toString(), Color(0xFF10B981), modifier = Modifier.weight(1f))
                            KpiMetricItem("Cancelados", cancelledCount.toString(), Color(0xFF64748B), modifier = Modifier.weight(1f))
                            KpiMetricItem("Ventas Totales", "C$ ${String.format("%.0f", totalRevenue)}", Color(0xFF059669), modifier = Modifier.weight(1f))
                        }
                    }
                }

                // ── 2. DOMINIO: COMERCIO & EXPRESS X→Y ────────────────────────
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // COMERCIO
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Store, contentDescription = null, tint = Color(0xFF4F46E5), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("COMERCIO", fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = Color(0xFF1E293B))
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                MetricRow("Pedidos Totales", commerceOrders.size.toString())
                                MetricRow("Activos", commerceActive.toString(), Color(0xFF2563EB))
                                MetricRow("Entregados", commerceDelivered.toString(), Color(0xFF10B981))
                                MetricRow("Cancelados", commerceCancelled.toString(), Color(0xFFDC2626))
                            }
                        }

                        // EXPRESS X→Y
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.ElectricMoped, contentDescription = null, tint = Color(0xFF0284C7), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("EXPRESS X→Y", fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = Color(0xFF1E293B))
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                MetricRow("Creados", expressCreated.toString())
                                MetricRow("Sin Courier", expressWaitingCourier.toString(), Color(0xFFE11938))
                                MetricRow("En Tránsito", expressInTransit.toString(), Color(0xFF2563EB))
                                MetricRow("Completados", expressCompleted.toString(), Color(0xFF10B981))
                            }
                        }
                    }
                }

                // ── 3. DOMINIO: FLOTA & OPERACIÓN ─────────────────────────────
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // FLOTA
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = Color(0xFF059669), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("FLOTA GPS", fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = Color(0xFF1E293B))
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                MetricRow("Registrados", totalDrivers.toString())
                                MetricRow("Online GPS", onlineDrivers.toString(), Color(0xFF10B981))
                                MetricRow("Ocupados", busyDrivers.toString(), Color(0xFFD97706))
                                MetricRow("Disponibles", availableDrivers.toString(), Color(0xFF2563EB))
                            }
                        }

                        // OPERACIÓN
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Speed, contentDescription = null, tint = Color(0xFFE11938), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("OPERACIÓN", fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = Color(0xFF1E293B))
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                MetricRow("Activos Ahora", activeOrdersNow.toString(), Color(0xFF2563EB))
                                MetricRow("Sin Motorizado", unassignedOrders.toString(), Color(0xFFDC2626))
                                MetricRow("En Preparación", preparingCount.toString(), Color(0xFFD97706))
                                MetricRow("Completados", deliveredCount.toString(), Color(0xFF10B981))
                            }
                        }
                    }
                }

                // ── 4. LISTA EN TIEMPO REAL: ACTIVIDAD Y ÓRDENES ──────────────
                item {
                    Column {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                "ACTIVIDAD EN TIEMPO REAL",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF64748B),
                                letterSpacing = 0.8.sp
                            )
                            Text(
                                "${filteredLiveOrders.size} órdenes",
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))

                        // Barra de búsqueda
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Buscar por código, cliente o comercio...", fontSize = 12.sp) },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(18.dp)) },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                unfocusedContainerColor = Color.White,
                                focusedContainerColor = Color.White,
                                unfocusedBorderColor = Color(0xFFE2E8F0)
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // Filtros de dominio
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(
                                selected = selectedDomainFilter == "ALL",
                                onClick = { selectedDomainFilter = "ALL" },
                                label = { Text("Todas (${orders.size})", fontSize = 11.sp) }
                            )
                            FilterChip(
                                selected = selectedDomainFilter == "COMMERCE",
                                onClick = { selectedDomainFilter = "COMMERCE" },
                                label = { Text("Comercio (${commerceOrders.size})", fontSize = 11.sp) }
                            )
                            FilterChip(
                                selected = selectedDomainFilter == "EXPRESS",
                                onClick = { selectedDomainFilter = "EXPRESS" },
                                label = { Text("Express X→Y (${expressOrders.size})", fontSize = 11.sp) }
                            )
                        }
                    }
                }

                if (filteredLiveOrders.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.Inbox, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(48.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("No hay órdenes coincidentes", color = Color(0xFF94A3B8), fontSize = 13.sp)
                            }
                        }
                    }
                } else {
                    items(filteredLiveOrders.take(30), key = { it.pedidoId }) { order ->
                        LiveOrderRowCard(order = order)
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickModuleCard(
    title: String,
    count: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit
) {
    Surface(
        color = Color.White,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier
            .width(135.dp)
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(color.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 11.5.sp, color = Color(0xFF1E293B), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(count, fontSize = 10.sp, color = color, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun KpiDomainCard(
    title: String,
    icon: ImageVector,
    accentColor: Color,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(title, fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFF1E293B), letterSpacing = 0.5.sp)
            }
            Spacer(modifier = Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun KpiMetricItem(
    label: String,
    value: String,
    valueColor: Color,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(value, fontWeight = FontWeight.Black, fontSize = 15.sp, color = valueColor)
        Text(label, fontSize = 10.sp, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun MetricRow(label: String, value: String, color: Color = Color(0xFF1E293B)) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 11.sp, color = Color(0xFF64748B))
        Text(value, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = color)
    }
}

@Composable
private fun LiveOrderRowCard(order: Pedido) {
    val isExpress = order.serviceType == "X_TO_Y_DELIVERY"
    val statusColor = when (order.status.lowercase()) {
        "pending", "pendiente" -> Color(0xFFE11938)
        "preparing", "preparando" -> Color(0xFFD97706)
        "ready", "listo" -> Color(0xFF0284C7)
        "in_transit", "en_ruta" -> Color(0xFF2563EB)
        "delivered", "entregado", "completed" -> Color(0xFF10B981)
        else -> Color(0xFF64748B)
    }

    Surface(
        color = Color.White,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isExpress) Color(0xFFE0F2FE) else Color(0xFFEEF2FF)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isExpress) Icons.Default.ElectricMoped else Icons.Default.Store,
                    contentDescription = null,
                    tint = if (isExpress) Color(0xFF0284C7) else BluePrimary,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "#${order.pedidoId.takeLast(8).uppercase()}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.5.sp,
                        color = Color(0xFF0F172A)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        color = statusColor.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            order.status.uppercase(),
                            color = statusColor,
                            fontSize = 8.5.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }
                Text(
                    if (isExpress) "Remitente: ${order.customerName}" else order.businessName,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "C$ ${String.format("%.0f", order.total)}",
                    fontWeight = FontWeight.Black,
                    fontSize = 13.sp,
                    color = Color(0xFF0F172A)
                )
                Text(
                    if (order.motorizadoId.isNotBlank()) "Courier Asignado" else "Sin Courier",
                    fontSize = 9.5.sp,
                    color = if (order.motorizadoId.isNotBlank()) Color(0xFF10B981) else Color(0xFFE11938),
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}
