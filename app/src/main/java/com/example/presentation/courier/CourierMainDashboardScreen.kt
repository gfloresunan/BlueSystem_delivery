package com.example.presentation.courier

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.AuthManager
import com.example.FirebaseManager
import com.example.PedidoOfrecido
import com.example.PedidosEntrantesScreen
import com.example.domain.model.courier.*
import com.example.domain.model.courier.CourierShiftState
import com.example.presentation.courier.components.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierMainDashboardScreen(
    navController: NavController,
    firebaseManager: FirebaseManager,
    authManager: AuthManager,
    onLogout: () -> Unit,
    viewModel: CourierViewModel = viewModel(factory = CourierViewModelFactory(LocalContext.current))
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val motorizadoId = authManager.currentUser?.uid ?: com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""

    LaunchedEffect(motorizadoId) {
        if (motorizadoId.isBlank()) {
            android.util.Log.w("COURIER_AUTH", "Sesión de motorizado inválida o UID nulo. Redirigiendo a autenticación.")
            onLogout()
        } else {
            viewModel.setMotorizadoId(motorizadoId)
        }
    }

    DisposableEffect(Unit) {
        val currentCount = com.example.domain.engine.courier.CourierDebugCounters.screenInstances.incrementAndGet()
        android.util.Log.d("FLOTA_DEBUG", "COURIER_INSTANCE_CREATED | Active instances: $currentCount")
        onDispose {
            val remainingCount = com.example.domain.engine.courier.CourierDebugCounters.screenInstances.decrementAndGet()
            android.util.Log.d("FLOTA_DEBUG", "COURIER_INSTANCE_DESTROYED | Active instances: $remainingCount")
        }
    }

    // Flujos y estados del motorizado desde ViewModel con ciclo de vida (pausa listeners en background)
    val shiftSession by viewModel.shiftSession.collectAsStateWithLifecycle()
    val currentMetrics by viewModel.currentMetrics.collectAsStateWithLifecycle()
    val rewardState by viewModel.rewardState.collectAsStateWithLifecycle()
    val assignedVehicle by viewModel.vehicleEngine.assignedVehicle.collectAsStateWithLifecycle()
    val ordersState by viewModel.courierOrdersState.collectAsStateWithLifecycle()
    val pedidoActivo by viewModel.courierPedidoActivo.collectAsStateWithLifecycle()
    val historyOrders by viewModel.courierHistoryOrders.collectAsStateWithLifecycle()
    val rejectedOrders by viewModel.courierRejectedOrders.collectAsStateWithLifecycle()
    val notificationsList by viewModel.notifications.collectAsStateWithLifecycle()
    val unreadNotifCount by viewModel.unreadNotificationCount.collectAsStateWithLifecycle()
    val officialProfile by viewModel.officialProfile.collectAsStateWithLifecycle()
    val activePendingRequest by viewModel.activePendingRequest.collectAsStateWithLifecycle()
    val profileRequests by viewModel.profileRequests.collectAsStateWithLifecycle()
    val financesState by viewModel.courierFinancesState.collectAsStateWithLifecycle()
    val courierReviews by viewModel.courierReviews.collectAsStateWithLifecycle()

    var lastNotifiedSignature by remember { mutableStateOf("") }

    LaunchedEffect(ordersState) {
        if (ordersState.status == com.example.CourierUiStatus.ASSIGNED_ORDERS || ordersState.status == com.example.CourierUiStatus.POOL_ORDERS) {
            val currentOrders = if (ordersState.status == com.example.CourierUiStatus.ASSIGNED_ORDERS) ordersState.assignedOrders else ordersState.poolOrders
            val idsSignature = currentOrders.map { it.id }.sorted().joinToString(",")
            val currentSignature = "STATUS:${ordersState.status}|IDS:[$idsSignature]"

            if (currentSignature != lastNotifiedSignature && currentOrders.isNotEmpty()) {
                lastNotifiedSignature = currentSignature
                com.example.domain.engine.courier.CourierDebugCounters.vibrationsTriggered.incrementAndGet()
                com.example.domain.engine.courier.CourierDebugCounters.notificationsCreated.incrementAndGet()
                com.example.domain.engine.courier.CourierDebugCounters.logSnapshot("NOTIFY_NEW_ORDERS")

                try {
                    val vibrator = androidx.core.content.ContextCompat.getSystemService(context, android.os.Vibrator::class.java)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        vibrator?.vibrate(android.os.VibrationEffect.createOneShot(500, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator?.vibrate(500)
                    }
                } catch (e: Exception) {
                    android.util.Log.w("VIBRATOR", "Vibration failed or unauthorized", e)
                }
                val count = currentOrders.size
                Toast.makeText(context, "🛵 ¡TIENES $count PEDIDO(S) DISPONIBLE(S)!", Toast.LENGTH_LONG).show()

                // Registrar en centro de notificaciones interno
                viewModel.addNotificationFromFcm(
                    title = "🛵 ¡$count Pedido(s) Disponible(s)!",
                    body = "Nuevas ofertas disponibles en el Fleet Pool para entrega.",
                    category = com.example.domain.engine.courier.NotificationCategory.NUEVO_PEDIDO,
                    orderId = currentOrders.firstOrNull()?.id
                )
            }
        }
    }

    // Pestaña activa en la barra inferior (0: Pedidos/Mapa, 1: Rendimiento, 2: Finanzas/Caja, 3: Vehículo)
    var selectedTab by remember { mutableIntStateOf(0) }
    // Sub-pestaña activa dentro de Pedidos (0: Disponibles, 1: Mis Pedidos, 2: Rechazados)
    var subTabPedidos by remember { mutableIntStateOf(0) }
    // Sub-pestaña activa dentro de Finanzas (0: Mis Ingresos, 1: Cierre & Depósito)
    var subTabFinanzas by remember { mutableIntStateOf(0) }

    // Control de diálogos
    var showStartShiftDialog by remember { mutableStateOf(false) }
    var showPauseShiftDialog by remember { mutableStateOf(false) }
    var showEndShiftDialog by remember { mutableStateOf(false) }
    var showIncidentDialog by remember { mutableStateOf(false) }
    var showNotificationCenterDialog by remember { mutableStateOf(false) }
    var showEditProfileDialog by remember { mutableStateOf(false) }
    var selectedDetailOrderId by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            Surface(
                color = Color(0xFF0F172A),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B)),
                shadowElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Título e Identidad
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF6366F1).copy(alpha = 0.2f),
                            border = if (!officialProfile?.photoUrl.isNullOrBlank()) androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFF818CF8)) else null,
                            modifier = Modifier.size(38.dp)
                        ) {
                            if (!officialProfile?.photoUrl.isNullOrBlank()) {
                                AsyncImage(
                                    model = officialProfile?.photoUrl,
                                    contentDescription = "Foto de Perfil",
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .clip(CircleShape)
                                )
                            } else {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.DirectionsBike,
                                        contentDescription = null,
                                        tint = Color(0xFF818CF8),
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "BlueSystem Courier",
                                    color = Color.White,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 15.sp
                                )
                            }
                            Text(
                                text = authManager.currentUser?.email ?: "Motorizado Activo",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }
                    }

                    // Acciones Rápidas (Badge de Turno, SOS, Incidencias)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Badge Interactivo de Estado del Turno
                        val (statusText, statusBg, statusColor) = when (shiftSession.currentState) {
                            CourierShiftState.OFFLINE ->
                                Triple("OFFLINE 🔴", Color(0xFFEF4444).copy(alpha = 0.2f), Color(0xFFF87171))
                            CourierShiftState.PAUSED ->
                                Triple("EN PAUSA 🟡", Color(0xFFF59E0B).copy(alpha = 0.2f), Color(0xFFFBBF24))
                            else ->
                                Triple("EN LÍNEA 🟢", Color(0xFF10B981).copy(alpha = 0.2f), Color(0xFF34D399))
                        }

                        Surface(
                            onClick = {
                            when (shiftSession.currentState) {
                                CourierShiftState.OFFLINE -> showStartShiftDialog = true
                                CourierShiftState.PAUSED -> showEndShiftDialog = true
                                else -> showPauseShiftDialog = true
                            }
                            },
                            shape = RoundedCornerShape(20.dp),
                            color = statusBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, statusColor.copy(alpha = 0.4f))
                        ) {
                            Text(
                                text = statusText,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = statusColor,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }

                        // Campanita de Notificaciones (Centro de Notificaciones Interno)
                        IconButton(
                            onClick = { showNotificationCenterDialog = true },
                            modifier = Modifier.size(36.dp)
                        ) {
                            BadgedBox(
                                badge = {
                                    if (unreadNotifCount > 0) {
                                        Badge(containerColor = Color(0xFFEF4444), contentColor = Color.White) {
                                            Text("$unreadNotifCount", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Notifications,
                                    contentDescription = "Centro de Notificaciones",
                                    tint = if (unreadNotifCount > 0) Color(0xFFFBBF24) else Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }

                        // Botón SOS Emergencia
                        SosEmergencyButton(
                            onTriggerEmergency = {
                                viewModel.triggerEmergency()
                                Toast.makeText(context, "🚨 ALERTA SOS ENVIADA A CENTRAL DE OPERACIONES", Toast.LENGTH_LONG).show()
                            }
                        )

                        // Reporte de Incidencias
                        IconButton(
                            onClick = { showIncidentDialog = true },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = "Incidencia", tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF0F172A),
                contentColor = Color.White,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.AutoMirrored.Filled.DirectionsBike, contentDescription = "Pedidos") },
                    label = { Text("Pedidos", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color.White,
                        selectedTextColor = Color(0xFF818CF8),
                        indicatorColor = Color(0xFF6366F1),
                        unselectedIconColor = Color(0xFF64748B),
                        unselectedTextColor = Color(0xFF64748B)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.EmojiEvents, contentDescription = "Rendimiento") },
                    label = { Text("Rendimiento", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color.White,
                        selectedTextColor = Color(0xFF818CF8),
                        indicatorColor = Color(0xFF6366F1),
                        unselectedIconColor = Color(0xFF64748B),
                        unselectedTextColor = Color(0xFF64748B)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.AccountBalanceWallet, contentDescription = "Finanzas") },
                    label = { Text("Finanzas", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color.White,
                        selectedTextColor = Color(0xFF818CF8),
                        indicatorColor = Color(0xFF6366F1),
                        unselectedIconColor = Color(0xFF64748B),
                        unselectedTextColor = Color(0xFF64748B)
                    )
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.Person, contentDescription = "Mi Perfil") },
                    label = { Text("Mi Perfil", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color.White,
                        selectedTextColor = Color(0xFF818CF8),
                        indicatorColor = Color(0xFF6366F1),
                        unselectedIconColor = Color(0xFF64748B),
                        unselectedTextColor = Color(0xFF64748B)
                    )
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color(0xFF020617))
        ) {
            when (selectedTab) {
                0 -> {
                    // Pestaña 0: CENTRO OPERACIONAL DEL MOTORIZADO (Disponibles / Mis Pedidos / Rechazados)
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Sub-Barra de Navegación Operativa
                        ScrollableTabRow(
                            selectedTabIndex = subTabPedidos,
                            containerColor = Color(0xFF0F172A),
                            contentColor = Color.White,
                            edgePadding = 12.dp,
                            divider = { HorizontalDivider(color = Color(0xFF1E293B)) }
                        ) {
                            Tab(
                                selected = subTabPedidos == 0,
                                onClick = { subTabPedidos = 0 },
                                text = {
                                    Text(
                                        "🟢 Disponibles (${ordersState.poolOrders.size})",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (subTabPedidos == 0) Color(0xFF34D399) else Color(0xFF64748B)
                                    )
                                }
                            )
                            Tab(
                                selected = subTabPedidos == 1,
                                onClick = { subTabPedidos = 1 },
                                text = {
                                    Text(
                                        "📦 Mis Pedidos (${ordersState.assignedOrders.size})",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (subTabPedidos == 1) Color(0xFF818CF8) else Color(0xFF64748B)
                                    )
                                }
                            )
                            Tab(
                                selected = subTabPedidos == 2,
                                onClick = { subTabPedidos = 2 },
                                text = {
                                    Text(
                                        "❌ Rechazados (${rejectedOrders.size})",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (subTabPedidos == 2) Color(0xFFF87171) else Color(0xFF64748B)
                                    )
                                }
                            )
                        }

                        // ── BANNER BLOQUEO OPERACIONAL / CIERRE PENDIENTE ──
                        val notice = financesState.overduePendingClosure
                        if (notice != null && notice.hasOverdue) {
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 6.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF450A0A)),
                                border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFEF4444))
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "⚠️ CIERRE PENDIENTE: ${notice.overdueDate.ifBlank { "Día anterior" }}",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 12.sp,
                                            color = Color(0xFFFCA5A5)
                                        )
                                        Text(
                                            text = "Monto pendiente: C$ ${String.format(java.util.Locale.US, "%.2f", notice.outstandingAmount)}",
                                            fontSize = 11.sp,
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                    Button(
                                        onClick = {
                                            selectedTab = 2
                                            subTabFinanzas = 1
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                    ) {
                                        Text("IR A CIERRE →", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                    }
                                }
                            }
                        }

                        Box(modifier = Modifier.fillMaxSize().weight(1f)) {
                            when (subTabPedidos) {
                                0 -> {
                                    PedidosEntrantesScreen(
                                        pedidoActivo = pedidoActivo,
                                        ordersState = ordersState,
                                        onAceptarPedido = { pedidoId ->
                                            firebaseManager.aceptarPedido(pedidoId, motorizadoId)
                                            val targetOrder = ordersState.assignedOrders.find { it.id == pedidoId }
                                                ?: ordersState.poolOrders.find { it.id == pedidoId }
                                                ?: pedidoActivo
                                            targetOrder?.let {
                                                navController.navigate(
                                                    com.example.Screen.RutaActiva.createRoute(
                                                        pedidoId = it.id,
                                                        comercioNombre = it.comercioNombre,
                                                        comercioDireccion = it.comercioDireccion,
                                                        clienteDireccion = it.clienteDireccion
                                                    )
                                                )
                                            }
                                        },
                                        onRechazarPedido = { rejectedId ->
                                            android.util.Log.d("COURIER_REJECT", "Iniciando rechazo en ViewModel para pedidoId=$rejectedId")
                                            viewModel.rechazarPedido(rejectedId)
                                        },
                                        onRechazarPedidoConMotivo = { rejectedId, motivo ->
                                            android.util.Log.d("COURIER_REJECT", "Iniciando rechazo con motivo para pedidoId=$rejectedId, motivo=$motivo")
                                            viewModel.rechazarPedido(rejectedId, motivo)
                                        },
                                        onLogout = onLogout,
                                        onReconectarRutaActiva = { pedidoId, comercioNombre, comercioDireccion, clienteDireccion ->
                                            navController.navigate(
                                                com.example.Screen.RutaActiva.createRoute(
                                                    pedidoId = pedidoId,
                                                    comercioNombre = comercioNombre,
                                                    comercioDireccion = comercioDireccion,
                                                    clienteDireccion = clienteDireccion
                                                )
                                            )
                                        }
                                    )
                                }
                                1 -> {
                                    if (selectedDetailOrderId != null) {
                                        CourierOrderDetailScreen(
                                            orderId = selectedDetailOrderId!!,
                                            initialPedido = (ordersState.assignedOrders + historyOrders).find { it.id == selectedDetailOrderId },
                                            onNavigateToChat = { targetOrderId, domain ->
                                                navController.navigate(
                                                    com.example.Screen.OrderChat.createRoute(targetOrderId, domain)
                                                )
                                            },
                                            onBack = { selectedDetailOrderId = null }
                                        )
                                    } else {
                                        MisPedidosCourierScreen(
                                            assignedOrders = ordersState.assignedOrders,
                                            activeRouteOrder = ordersState.activeRouteOrder,
                                            historyOrders = historyOrders,
                                            onSelectOrder = { orderId ->
                                                selectedDetailOrderId = orderId
                                            },
                                            onNavigateToRoute = { order ->
                                                navController.navigate(
                                                    com.example.Screen.RutaActiva.createRoute(
                                                        pedidoId = order.id,
                                                        comercioNombre = order.comercioNombre,
                                                        comercioDireccion = order.comercioDireccion,
                                                        clienteDireccion = order.clienteDireccion
                                                    )
                                                )
                                            },
                                            onBack = { subTabPedidos = 0 }
                                        )
                                    }
                                }
                                2 -> {
                                    CourierRejectedHistoryScreen(
                                        rejectedOrders = rejectedOrders,
                                        onBack = { subTabPedidos = 0 }
                                    )
                                }
                            }
                        }
                    }
                }
                1 -> {
                    // Pestaña 1: Rendimiento, Gamificación e Historial
                    CourierPerformanceScreen(
                        metrics = currentMetrics,
                        rewardState = rewardState,
                        historyOrders = historyOrders,
                        reviews = courierReviews,
                        onBack = { selectedTab = 0 }
                    )
                }
                2 -> {
                    // Pestaña 2: FINANZAS & CONTROL DE CAJA DEL MOTORIZADO (Actividad #13)
                    Column(modifier = Modifier.fillMaxSize()) {
                        // Sub-Barra de Navegación Financiera
                        TabRow(
                            selectedTabIndex = subTabFinanzas,
                            containerColor = Color(0xFF0F172A),
                            contentColor = Color.White,
                            divider = { HorizontalDivider(color = Color(0xFF1E293B)) }
                        ) {
                            Tab(
                                selected = subTabFinanzas == 0,
                                onClick = { subTabFinanzas = 0 },
                                text = {
                                    Text(
                                        "💰 Mis Ingresos",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (subTabFinanzas == 0) Color(0xFF38BDF8) else Color(0xFF64748B)
                                    )
                                }
                            )
                            Tab(
                                selected = subTabFinanzas == 1,
                                onClick = { subTabFinanzas = 1 },
                                text = {
                                    Text(
                                        "🛡️ Cierre & Depósito",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (subTabFinanzas == 1) Color(0xFF34D399) else Color(0xFF64748B)
                                    )
                                }
                            )
                        }

                        Box(modifier = Modifier.fillMaxSize().weight(1f)) {
                            when (subTabFinanzas) {
                                0 -> {
                                    CourierFinancesScreen(
                                        financesState = financesState,
                                        onFilterChanged = { filter, start, end ->
                                            viewModel.setFinanceFilter(filter, start, end)
                                        },
                                        onNavigateToClosure = {
                                            subTabFinanzas = 1
                                        }
                                    )
                                }
                                1 -> {
                                    CourierCashClosureScreen(
                                        onBack = { subTabFinanzas = 0 },
                                        financesState = financesState
                                    )
                                }
                            }
                        }
                    }
                }
                3 -> {
                    // Pestaña 3: Mi Perfil Canónico & Vehículo (Actividad #2)
                    CourierProfileScreen(
                        profile = officialProfile,
                        pendingRequest = activePendingRequest,
                        requestHistory = profileRequests,
                        onBack = { selectedTab = 0 },
                        onRequestEditProfile = { showEditProfileDialog = true },
                        onCancelPendingRequest = { reqId ->
                            viewModel.cancelPendingProfileRequest(
                                requestId = reqId,
                                onSuccess = { Toast.makeText(context, "Solicitud cancelada", Toast.LENGTH_SHORT).show() },
                                onError = { err -> Toast.makeText(context, err, Toast.LENGTH_SHORT).show() }
                            )
                        },
                        onLogout = onLogout
                    )
                }
            }

            // ── Diálogos de Gestión de Turno ─────────────────────────────────
            if (showStartShiftDialog) {
                StartShiftDialog(
                    onDismiss = { showStartShiftDialog = false },
                    onConfirm = { battery, odo ->
                        showStartShiftDialog = false
                        viewModel.startShift(motorizadoId, battery, odo)
                        Toast.makeText(context, " Turno Operativo Iniciado", Toast.LENGTH_SHORT).show()
                    }
                )
            }

            if (showPauseShiftDialog) {
                PauseShiftDialog(
                    onDismiss = { showPauseShiftDialog = false },
                    onConfirm = { reason ->
                        showPauseShiftDialog = false
                        viewModel.pauseShift(reason)
                        Toast.makeText(context, "Turno en Pausa: ${reason.name}", Toast.LENGTH_SHORT).show()
                    }
                )
            }

            if (showEndShiftDialog) {
                AlertDialog(
                    onDismissRequest = { showEndShiftDialog = false },
                    title = { Text("Finalizar Turno", fontWeight = FontWeight.Bold) },
                    text = { Text("¿Estás seguro de finalizar tu turno operativo? Tu cierre de caja quedará disponible para revisión.") },
                    confirmButton = {
                        Button(
                            onClick = {
                                showEndShiftDialog = false
                                viewModel.endShift(null)
                                Toast.makeText(context, "Turno Finalizado. Revisa tu Cierre de Caja.", Toast.LENGTH_LONG).show()
                                selectedTab = 2
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                        ) { Text("Finalizar", fontWeight = FontWeight.Bold) }
                    },
                    dismissButton = {
                        TextButton(onClick = { showEndShiftDialog = false }) { Text("Cancelar") }
                    }
                )
            }

            if (showIncidentDialog) {
                IncidentReportDialog(
                    onDismiss = { showIncidentDialog = false },
                    onReportSubmitted = { type, desc, photoUrl ->
                        showIncidentDialog = false
                        viewModel.reportIncident(
                            courierId = motorizadoId,
                            incidentType = type,
                            description = desc,
                            photoUrl = photoUrl
                        )
                        Toast.makeText(context, "⚠️ Incidencia reportada a Central de Operaciones", Toast.LENGTH_LONG).show()
                    }
                )
            }

            if (showNotificationCenterDialog) {
                CourierNotificationCenterDialog(
                    notifications = notificationsList,
                    onDismiss = { showNotificationCenterDialog = false },
                    onMarkAsRead = { id -> viewModel.markNotificationAsRead(id) },
                    onMarkAllAsRead = { viewModel.markAllNotificationsAsRead() },
                    onSelectNotification = { item ->
                        showNotificationCenterDialog = false
                        if (!item.orderId.isNullOrBlank()) {
                            selectedTab = 0
                            subTabPedidos = 0
                        }
                    }
                )
            }

            if (showEditProfileDialog) {
                EditCourierProfileDialog(
                    currentProfile = officialProfile ?: CourierOfficialProfile(
                        uid = motorizadoId,
                        name = authManager.currentUser?.email ?: "Motorizado",
                        vehicleBrand = assignedVehicle?.brand ?: "Yamaha",
                        vehicleModel = assignedVehicle?.model ?: "FZ 25",
                        vehiclePlate = assignedVehicle?.documents?.licensePlate ?: "M 384-902",
                        vehicleYear = assignedVehicle?.year ?: 2024,
                        vehicleColor = assignedVehicle?.color ?: "Negro"
                    ),
                    onDismiss = { showEditProfileDialog = false },
                    onSubmitRequest = { newVals ->
                        showEditProfileDialog = false
                        viewModel.submitProfileUpdateRequest(
                            requestType = "VEHICLE_CHANGE",
                            newValues = newVals,
                            onSuccess = { reqId ->
                                Toast.makeText(context, "✅ Solicitud enviada a validación administrativa", Toast.LENGTH_LONG).show()
                            },
                            onError = { err ->
                                Toast.makeText(context, "❌ $err", Toast.LENGTH_LONG).show()
                            }
                        )
                    }
                )
            }
        }
    }
}
