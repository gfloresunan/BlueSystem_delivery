package com.example.presentation.business.dashboard

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.ui.draw.scale
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.Pedido
import com.example.domain.model.dashboard.*
import com.example.domain.engine.dashboard.*
import com.example.domain.model.AppNotification
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.launch
import androidx.compose.ui.text.style.TextAlign
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary

val dashRed = Color(0xFFEF4444)
val dashGreen = Color(0xFF10B981)
val dashOrange = Color(0xFFF59E0B)
val dashBlue = Color(0xFF2563EB)
val dashBg = Color(0xFFF8FAFC)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MerchantOperationsDashboardScreen(
    businessId: String,
    onNavigateTab: (String) -> Unit,
    onOpenWizard: () -> Unit,
    onOpenKds: () -> Unit,
    onOpenDrawer: () -> Unit = {},
    onLogout: () -> Unit = {},
    viewModel: MerchantDashboardViewModel = remember { MerchantDashboardViewModel() }
) {
    val uiState by viewModel.uiState.collectAsState()
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current

    val currentUid = remember { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: "" }
    val notificationRepo = remember { com.example.data.repository.NotificationRepository() }
    val notifications by notificationRepo.notifications.collectAsState(initial = emptyList())
    val unreadNotifsCount by notificationRepo.unreadCount.collectAsState(initial = 0)

    var showNotificationCenter by remember { mutableStateOf(false) }
    var showProfileSheet by remember { mutableStateOf(false) }
    var showCustomizeModal by remember { mutableStateOf(false) }
    var showLogoutConfirmDialog by remember { mutableStateOf(false) }

    LaunchedEffect(businessId, currentUid) {
        viewModel.startDashboard(businessId, context)
        if (currentUid.isNotBlank()) {
            notificationRepo.startListening(currentUid)
        }
        com.example.service.BatteryOptimizationHelper.requestExemptionIfNeeded(context)
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(dashBg)
    ) {
        val isTablet = maxWidth > 600.dp

        if (uiState.isLoading) {
            DashboardSkeletonShimmer()
        } else {
            Column(modifier = Modifier.fillMaxSize()) {

                // ─── BANNER VISUAL OFFLINE ───
                if (uiState.isOfflineMode) {
                    Surface(
                        color = Color(0xFFFEF3C7),
                        border = BorderStroke(1.dp, Color(0xFFF59E0B)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.WifiOff, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Trabajando Offline — ${uiState.offlinePendingChangesCount} cambios pendientes • Sinc: ${uiState.lastSyncTimeText}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF92400E)
                                )
                            }
                            TextButton(onClick = { viewModel.toggleOfflineMode() }) {
                                Text("Reconectar", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = BluePrimary)
                            }
                        }
                    }
                }

                // ─── BANNER DE ERROR FIRESTORE (SI OCURRE) ───
                if (uiState.errorMessage != null) {
                    Surface(
                        color = Color(0xFFFEE2E2),
                        border = BorderStroke(1.dp, Color(0xFFEF4444)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = Color(0xFFB91C1C), modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text("Error al actualizar pedidos", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF991B1B))
                                    Text(uiState.errorMessage ?: "", fontSize = 11.sp, color = Color(0xFF7F1D1D), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                            Button(
                                onClick = { viewModel.startDashboard(businessId) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                modifier = Modifier.height(32.dp)
                            ) {
                                Text("Reintentar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // ─── HEADER OPERACIONAL CANÓNICO ───
                RedesignedHeaderPremiumWidget(
                    uiState = uiState,
                    unreadCount = unreadNotifsCount,
                    onOpenDrawer = onOpenDrawer,
                    onOpenNotifications = { showNotificationCenter = true },
                    onOpenProfile = { showProfileSheet = true }
                )

                // ─── LISTA SCROLLABLE OPERACIONAL DINÁMICA ───
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = if (isTablet) 20.dp else 12.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(top = 10.dp, bottom = 24.dp)
                ) {
                    // ─── ALERTA DISCRETA: LIQUIDACIÓN PENDIENTE DE REVISIÓN ───
                    if (uiState.pendingActionSettlement != null) {
                        val pending = uiState.pendingActionSettlement!!
                        item(key = "pending_settlement_banner") {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color(0xFFFFFBEB),
                                border = BorderStroke(1.dp, Color(0xFFF59E0B)),
                                shadowElevation = 2.dp,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onNavigateTab("FINANCE") }
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                        Surface(shape = CircleShape, color = Color(0xFFFEF3C7), modifier = Modifier.size(38.dp)) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Text("🏦", fontSize = 18.sp)
                                            }
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(
                                                "Liquidación Lista para Revisión",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Color(0xFF92400E)
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                "Pago registrado de C$ ${pending.netPayableNio.toInt()}. Revisa el comprobante y confirma recepción.",
                                                fontSize = 11.sp,
                                                color = Color(0xFFB45309),
                                                maxLines = 2
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFFD97706)
                                    ) {
                                        Text(
                                            "Revisar ➔",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    val visibleWidgets = uiState.activeWidgets.filter { it.isVisible }
                    visibleWidgets.forEach { w ->
                        when (w.type) {
                            WidgetType.UNIFIED_SEARCH_BAR -> {
                                item(key = "widget_search") {
                                    OmniboxSearchBarWidget(
                                        query = uiState.searchQuery,
                                        onQueryChange = { viewModel.updateSearchQuery(it) },
                                        filteredProductsCount = uiState.searchFilteredProducts.size,
                                        filteredOrdersCount = uiState.searchFilteredOrders.size,
                                        onOpenCustomize = { showCustomizeModal = true }
                                    )
                                }
                            }
                            WidgetType.SMART_HEADER -> {
                                item(key = "widget_store_status") {
                                    RedesignedStoreStatusCard(
                                        isStoreOpen = uiState.isStoreOpen,
                                        isOffline = uiState.isOfflineMode,
                                        lastSyncTimeText = uiState.lastSyncTimeText,
                                        onToggleStore = { viewModel.toggleStoreStatus() }
                                    )
                                }
                            }
                            WidgetType.DAILY_GOAL_WIDGET -> {
                                item(key = "widget_daily_goal") {
                                    RedesignedDailyGoalWidget(
                                        goal = uiState.dailyGoal,
                                        hasConfiguredGoal = uiState.hasConfiguredGoal,
                                        scheduleText = uiState.scheduleText
                                    )
                                }
                            }
                            WidgetType.LIVE_ORDER_KPIS -> {
                                item(key = "widget_live_kpis") {
                                    RedesignedMainKpisRow(
                                        uiState = uiState,
                                        onNavigateTab = onNavigateTab
                                    )
                                }
                            }
                            WidgetType.FINANCIAL_KPIS -> {
                                item(key = "widget_financial_kpis") {
                                    FinancialKpiRow(
                                        uiState = uiState,
                                        onOpenFinance = { onNavigateTab("FINANCE") }
                                    )
                                }
                            }
                            WidgetType.PERFORMANCE_KPIS -> {
                                item(key = "widget_performance_kpis") {
                                    PerformanceKpiRow(uiState = uiState)
                                }
                            }
                            WidgetType.SYSTEM_HEALTH_WIDGET -> {
                                item(key = "widget_system_health") {
                                    SystemHealthMonitorWidget(
                                        firestoreStatus = uiState.firestoreHealthStatus,
                                        syncStatus = uiState.syncHealthStatus,
                                        offlineStatus = uiState.offlineHealthStatus,
                                        notifStatus = uiState.notificationsHealthStatus
                                    )
                                }
                            }
                            WidgetType.CLASSIFIED_ALERTS -> {
                                item(key = "widget_alerts") {
                                    ClassifiedAlertsWidget(
                                        alerts = uiState.classifiedAlerts,
                                        onAction = { alert ->
                                            when (alert.actionType) {
                                                AlertActionType.OPEN_ORDER -> onNavigateTab("ORDERS")
                                                AlertActionType.OPEN_PRODUCT -> onNavigateTab("MENU")
                                                else -> onNavigateTab("ORDERS")
                                            }
                                        }
                                    )
                                }
                            }
                            WidgetType.LIVE_ORDERS_CENTER -> {
                                item(key = "widget_live_orders") {
                                    LiveOrdersCenterWidget(
                                        orders = uiState.liveOrders,
                                        onAccept = { viewModel.acceptOrder(it) },
                                        onReady = { viewModel.readyOrder(it) },
                                        onViewAll = { onNavigateTab("ORDERS") }
                                    )
                                }
                            }
                            WidgetType.COURIER_TRACKING -> {
                                item(key = "widget_couriers") {
                                    CourierTrackingWidget(
                                        couriersCount = uiState.motorizadosActivosCount,
                                        couriersList = uiState.couriersList
                                    )
                                }
                            }
                            WidgetType.CUSTOMER_INSIGHTS -> {
                                item(key = "widget_customers") {
                                    CustomerInsightsWidget(
                                        newCount = uiState.clientesAtendidosCount,
                                        recurringCount = uiState.recurringCustomersCount,
                                        vipCount = uiState.vipCustomersCount,
                                        reviewScore = uiState.calificacionPromedio
                                    )
                                }
                            }
                            WidgetType.KDS_SUMMARY -> {
                                item(key = "widget_kds") {
                                    KdsSummaryWidget(
                                        preparandoCount = uiState.preparandoCount,
                                        avgTimeMin = uiState.tiempoCocinaPromedioMin,
                                        onOpenKds = onOpenKds
                                    )
                                }
                            }
                            WidgetType.PRODUCT_SUMMARY -> {
                                item(key = "widget_product_summary") {
                                    ProductSummaryWidget(
                                        outOfStockCount = uiState.outOfStockProducts.size,
                                        lowStockCount = uiState.lowStockProducts.size,
                                        onAddProduct = onOpenWizard,
                                        onViewMenu = { onNavigateTab("MENU") }
                                    )
                                }
                            }
                            WidgetType.EXECUTIVE_ANALYTICS -> {
                                item(key = "widget_executive_analytics") {
                                    RedesignedOperationalGrid(
                                        uiState = uiState,
                                        onNavigateTab = onNavigateTab,
                                        onOpenKds = onOpenKds
                                    )
                                }
                            }
                            WidgetType.REALTIME_TIMELINE -> {
                                item(key = "widget_timeline") {
                                    RealtimeTimelineWidget(timeline = uiState.activityTimeline)
                                }
                            }
                            WidgetType.QUICK_ACTIONS -> {
                                item(key = "widget_quick_actions") {
                                    RedesignedQuickActionsRow(
                                        onAddProduct = onOpenWizard,
                                        onOpenPromos = { onNavigateTab("PROMOTIONS") },
                                        onOpenKds = onOpenKds,
                                        onOpenMenu = { onNavigateTab("MENU") },
                                        onOpenMore = { showCustomizeModal = true }
                                    )
                                }
                            }
                            WidgetType.MERCHANT_ASSISTANT -> {
                                if (uiState.priorityInsights.isNotEmpty()) {
                                    val topInsight = uiState.priorityInsights.first()
                                    item(key = "widget_ai_assistant") {
                                        RedesignedAiInsightChip(
                                            insight = topInsight,
                                            onOpenAi = { onNavigateTab(topInsight.targetTab) }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ─── CENTRO DE NOTIFICACIONES DEL COMERCIO ───
    if (showNotificationCenter) {
        MerchantNotificationCenterDialog(
            notifications = notifications,
            unreadCount = unreadNotifsCount,
            onDismiss = { showNotificationCenter = false },
            onMarkAsRead = { id -> coroutineScope.launch { notificationRepo.markAsRead(id) } },
            onMarkAllAsRead = { coroutineScope.launch { notificationRepo.markAllAsRead() } },
            onSelectNotification = { notif ->
                showNotificationCenter = false
                if (notif.category.equals("Pedidos", true) || notif.type.equals("ORDER", true)) {
                    onNavigateTab("ORDERS")
                } else if (notif.category.equals("Promociones", true)) {
                    onNavigateTab("PROMOTIONS")
                } else if (notif.category.equals("Finanzas", true) || notif.category.equals("Liquidaciones", true) ||
                           notif.type.contains("SETTLEMENT", true) || notif.action.contains("SETTLEMENT", true)) {
                    onNavigateTab("FINANCE")
                }
            }
        )
    }

    // ─── PERFIL DEL COMERCIO & LOGOUT SHEET ───
    if (showProfileSheet) {
        MerchantBusinessProfileDialog(
            businessInfo = uiState.businessInfo,
            isStoreOpen = uiState.isStoreOpen,
            onToggleStore = { viewModel.toggleStoreStatus() },
            onOpenCustomize = { showProfileSheet = false; showCustomizeModal = true },
            onDismiss = { showProfileSheet = false },
            onRequestLogout = {
                showProfileSheet = false
                showLogoutConfirmDialog = true
            }
        )
    }

    // ─── DIÁLOGO DE CONFIRMACIÓN DE LOGOUT ───
    if (showLogoutConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutConfirmDialog = false },
            icon = { Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(32.dp)) },
            title = { Text("¿Deseas cerrar sesión?", fontWeight = FontWeight.Bold) },
            text = { Text("Se cerrará tu sesión activa en este dispositivo. Tus pedidos y la información del comercio permanecerán protegidos.") },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutConfirmDialog = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Cerrar sesión", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showLogoutConfirmDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    // ─── MODAL DE PERSONALIZACIÓN SECUNDARIO (ALTO CONTRASTE) ───
    if (showCustomizeModal) {
        AlertDialog(
            onDismissRequest = { showCustomizeModal = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Tune, contentDescription = null, tint = Color(0xFF0052CC))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Personalizar Dashboard", fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 380.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        "Activa o desactiva las tarjetas operativas para personalizar tu vista de trabajo:",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )

                    uiState.activeWidgets.forEach { w ->
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFF8FAFC),
                            border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    IconButton(
                                        onClick = { viewModel.togglePinWidget(w.type) },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Icon(
                                            if (w.isPinned) Icons.Default.Star else Icons.Default.StarBorder,
                                            contentDescription = null,
                                            tint = if (w.isPinned) Color(0xFFF59E0B) else Color(0xFF94A3B8)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        w.title,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Color(0xFF0F172A),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                Switch(
                                    checked = w.isVisible,
                                    onCheckedChange = { viewModel.toggleWidgetVisibility(w.type) },
                                    colors = SwitchDefaults.colors(
                                        checkedThumbColor = Color.White,
                                        checkedTrackColor = Color(0xFF0052CC)
                                    )
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showCustomizeModal = false },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0052CC))
                ) {
                    Text("Listo", fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}

// ─── 0. OMNIBOX UNIFIED SEARCH BAR MATERIAL 3 ───
@Composable
fun OmniboxSearchBarWidget(
    query: String,
    onQueryChange: (String) -> Unit,
    filteredProductsCount: Int,
    filteredOrdersCount: Int,
    onOpenCustomize: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Search,
                    contentDescription = null,
                    tint = Color(0xFF64748B),
                    modifier = Modifier.padding(start = 12.dp).size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                TextField(
                    value = query,
                    onValueChange = onQueryChange,
                    placeholder = {
                        Text(
                            "Buscar productos, pedidos, clientes o promociones...",
                            fontSize = 13.sp,
                            color = Color(0xFF94A3B8),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    ),
                    modifier = Modifier.weight(1f)
                )
                if (query.isNotBlank()) {
                    IconButton(onClick = { onQueryChange("") }) {
                        Icon(Icons.Default.Clear, contentDescription = null, tint = Color.Gray)
                    }
                }
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFF1F5F9),
                    modifier = Modifier
                        .padding(end = 4.dp)
                        .clickable { onOpenCustomize() }
                ) {
                    Box(modifier = Modifier.padding(8.dp)) {
                        Icon(Icons.Default.Tune, contentDescription = "Filtros", tint = Color(0xFF334155), modifier = Modifier.size(20.dp))
                    }
                }
            }

            if (query.isNotBlank()) {
                Surface(
                    color = Color(0xFFF1F5F9),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Row(modifier = Modifier.padding(8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Coincidencias Productos: $filteredProductsCount", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                        Text("Coincidencias Pedidos: $filteredOrdersCount", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = dashGreen)
                    }
                }
            }
        }
    }
}

// ─── 1. SMART HEADER PREMIUM WIDGET ───
@Composable
fun SmartHeaderWidget(
    uiState: MerchantDashboardUiState,
    onToggleStore: () -> Unit,
    onSelectProfile: (DashboardProfileType) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // Banner Superior Azul Degradado Premium
        Surface(
            shape = RoundedCornerShape(22.dp),
            color = Color.Transparent,
            shadowElevation = 4.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFF0284C7), Color(0xFF1E40AF))
                        )
                    )
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(contentAlignment = Alignment.BottomEnd) {
                            Surface(
                                shape = CircleShape,
                                color = Color.White,
                                modifier = Modifier.size(52.dp)
                            ) {
                                val logoUrl = uiState.businessInfo?.logoUrl?.ifBlank { uiState.businessInfo?.photoUrl } ?: ""
                                if (logoUrl.isNotBlank()) {
                                    AsyncImage(
                                        model = logoUrl,
                                        contentDescription = "Logo Comercio",
                                        modifier = Modifier.fillMaxSize().clip(CircleShape),
                                        contentScale = ContentScale.Crop
                                    )
                                } else {
                                    val cat = (uiState.businessInfo?.category ?: uiState.businessInfo?.categoria ?: uiState.businessInfo?.nombre ?: "").lowercase()
                                    val iconEmoji = when {
                                        cat.contains("farm") || cat.contains("salud") || cat.contains("medic") -> "💊"
                                        cat.contains("tec") || cat.contains("comput") || cat.contains("cel") || cat.contains("electr") -> "💻"
                                        cat.contains("super") || cat.contains("market") || cat.contains("pulper") || cat.contains("abarrot") -> "🛒"
                                        cat.contains("rest") || cat.contains("comida") || cat.contains("burger") || cat.contains("pizza") -> "🍽️"
                                        cat.contains("flor") -> "💐"
                                        cat.contains("licor") || cat.contains("bebida") -> "🍾"
                                        else -> "🏪"
                                    }
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(iconEmoji, fontSize = 26.sp)
                                    }
                                }
                            }
                            Icon(
                                Icons.Default.Verified,
                                contentDescription = "Verificado",
                                tint = Color(0xFF38BDF8),
                                modifier = Modifier
                                    .size(18.dp)
                                    .background(Color.White, CircleShape)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                uiState.businessInfo?.nombre?.ifBlank { "Hamburguesas El Gordo" } ?: "Hamburguesas El Gordo",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 17.sp,
                                color = Color.White
                            )
                            Text(
                                "Sucursal Principal • EOC v15.1",
                                fontSize = 12.sp,
                                color = Color(0xFFE0F2FE)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFFFEF08A).copy(alpha = 0.25f),
                                border = BorderStroke(1.dp, Color(0xFFFACC15))
                            ) {
                                Text(
                                    "👑 PREMIUM",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color(0xFFFEF08A),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    // Botón de Notificaciones con Badge
                    Box(contentAlignment = Alignment.TopEnd) {
                        Surface(
                            shape = CircleShape,
                            color = Color.White.copy(alpha = 0.2f),
                            modifier = Modifier
                                .size(42.dp)
                                .clickable { }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Notifications, contentDescription = "Notificaciones", tint = Color.White, modifier = Modifier.size(22.dp))
                            }
                        }
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFFEF4444),
                            modifier = Modifier.size(16.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("3", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                }
            }
        }

        // Tarjeta Horizontal de Estado del Comercio (ABIERTO / CERRADO)
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.White,
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .background(
                                if (uiState.isStoreOpen) Color(0xFFDCFCE7) else Color(0xFFFEE2E2),
                                RoundedCornerShape(14.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Storefront,
                            contentDescription = null,
                            tint = if (uiState.isStoreOpen) Color(0xFF166534) else Color(0xFF991B1B),
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            if (uiState.isStoreOpen) "ABIERTO" else "CERRADO",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = if (uiState.isStoreOpen) Color(0xFF15803D) else Color(0xFFB91C1C)
                        )
                        Text(
                            if (uiState.isStoreOpen) "Recibiendo pedidos" else "Pausado temporalmente",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color(0xFF334155)
                        )
                        Text(
                            "Tu comercio está visible para los clientes",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Switch(
                        checked = uiState.isStoreOpen,
                        onCheckedChange = { onToggleStore() },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = Color(0xFF22C55E)
                        )
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(if (uiState.isStoreOpen) Color(0xFF22C55E) else Color.Red, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Actualizado: 21:00", fontSize = 10.sp, color = Color(0xFF64748B))
                    }
                }
            }
        }

        // Segmented Buttons / Tabs de Navegación Operativa
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color(0xFFF1F5F9),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                val tabs = listOf(
                    Triple(DashboardProfileType.OPERATIONS, "Operación", Icons.Default.Speed),
                    Triple(DashboardProfileType.KITCHEN, "Cocina", Icons.Default.SoupKitchen),
                    Triple(DashboardProfileType.SALES, "Ventas", Icons.Default.AttachMoney),
                    Triple(DashboardProfileType.INVENTORY, "Inventario", Icons.Default.Inventory2),
                    Triple(DashboardProfileType.CUSTOM, "Más", Icons.Default.GridView)
                )
                tabs.forEach { (profile, label, icon) ->
                    val isSelected = uiState.activeProfileType == profile
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) Color(0xFF1E3A8A) else Color.Transparent,
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onSelectProfile(profile) }
                    ) {
                        Row(
                            modifier = Modifier.padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                icon,
                                contentDescription = null,
                                tint = if (isSelected) Color.White else Color(0xFF475569),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                label,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium,
                                color = if (isSelected) Color.White else Color(0xFF475569)
                            )
                        }
                    }
                }
            }
        }
    }
}

// ─── 2. DAILY GOAL PROGRESS WIDGET ───
@Composable
fun DailyGoalProgressWidget(goal: DashboardGoal) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("🎯", fontSize = 18.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Meta del día", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = Color(0xFF0F172A))
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("42%", fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Color(0xFF16A34A))
                    Text("Completado", fontSize = 11.sp, color = Color(0xFF64748B))
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text("Llevas: C$ 2,100", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                    Text("Objetivo: C$ 5,000", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF0F172A))
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Restante", fontSize = 11.sp, color = Color(0xFF64748B))
                    Text("C$ 2,900", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF16A34A))
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Termina en 03:59:00", fontSize = 10.sp, color = Color(0xFF64748B))
                    }
                }
            }

            // Barra de progreso con gradiente e indicador verde (Thumb)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp)
                    .background(Color(0xFFE2E8F0), CircleShape),
                contentAlignment = Alignment.CenterStart
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.42f)
                        .height(10.dp)
                        .background(
                            Brush.horizontalGradient(listOf(Color(0xFF4ADE80), Color(0xFF16A34A))),
                            CircleShape
                        )
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.42f),
                    contentAlignment = Alignment.CenterEnd
                ) {
                    Box(
                        modifier = Modifier
                            .size(14.dp)
                            .background(Color.White, CircleShape)
                            .border(2.dp, Color(0xFF16A34A), CircleShape)
                    )
                }
            }
        }
    }
}

// ─── 3. SYSTEM HEALTH MONITOR WIDGET ───
@Composable
fun SystemHealthMonitorWidget(firestoreStatus: String, syncStatus: String, offlineStatus: String, notifStatus: String) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Dashboard de Salud (Health Monitor) 🛡️", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = Color(0xFF0F172A))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                HealthStatusCard("Firestore", firestoreStatus, Modifier.weight(1f))
                HealthStatusCard("Internet", syncStatus, Modifier.weight(1f))
                HealthStatusCard("Notificaciones", notifStatus, Modifier.weight(1f))
                HealthStatusCard("Sincronización", offlineStatus, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun HealthStatusCard(title: String, status: String, modifier: Modifier = Modifier) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFF8FAFC),
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, fontSize = 9.sp, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(modifier = Modifier.height(2.dp))
            Text("🟢", fontSize = 12.sp)
        }
    }
}

// ─── LIVE ORDER KPIS (6 TARJETAS CON ICONO CIRCULAR DE COLOR) ───
@Composable
fun LiveOrderKpiRow(uiState: MerchantDashboardUiState, onNavigateTab: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("👥", fontSize = 16.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text("Estado Operativo Hoy", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = Color(0xFF0F172A))
            }
            Text(
                "Ver detalle ➔",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF2563EB),
                modifier = Modifier.clickable { onNavigateTab("ORDERS") }
            )
        }

        // Grilla 2x3 de Tarjetas Operativas con Icono Circular
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiCircleCard(
                icon = Icons.Default.Notifications,
                iconBg = Color(0xFFDBEAFE),
                iconColor = Color(0xFF2563EB),
                count = uiState.nuevosCount.toString(),
                title = "Nuevos",
                subtitle = "Pendientes",
                modifier = Modifier.weight(1f).clickable { onNavigateTab("ORDERS") }
            )
            KpiCircleCard(
                icon = Icons.Default.SoupKitchen,
                iconBg = Color(0xFFFFEDD5),
                iconColor = Color(0xFFEA580C),
                count = uiState.preparandoCount.toString(),
                title = "En cocina",
                subtitle = "En preparación",
                modifier = Modifier.weight(1f).clickable { onNavigateTab("ORDERS") }
            )
            KpiCircleCard(
                icon = Icons.Default.TwoWheeler,
                iconBg = Color(0xFFE0F2FE),
                iconColor = Color(0xFF0284C7),
                count = uiState.motorizadosActivosCount.toString(),
                title = "En ruta",
                subtitle = "Con repartidor",
                modifier = Modifier.weight(1f).clickable { onNavigateTab("ORDERS") }
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KpiCircleCard(
                icon = Icons.Default.CheckCircle,
                iconBg = Color(0xFFDCFCE7),
                iconColor = Color(0xFF16A34A),
                count = uiState.listosCount.toString(),
                title = "Listos",
                subtitle = "Para entregar",
                modifier = Modifier.weight(1f).clickable { onNavigateTab("ORDERS") }
            )
            KpiCircleCard(
                icon = Icons.Default.DoneAll,
                iconBg = Color(0xFFF3E8FF),
                iconColor = Color(0xFF9333EA),
                count = uiState.clientesAtendidosCount.toString(),
                title = "Entregados",
                subtitle = "Completados",
                modifier = Modifier.weight(1f).clickable { onNavigateTab("ORDERS") }
            )
            KpiCircleCard(
                icon = Icons.Default.Cancel,
                iconBg = Color(0xFFFEE2E2),
                iconColor = Color(0xFFDC2626),
                count = uiState.cancelacionesCount.toString(),
                title = "Cancelados",
                subtitle = "Hoy",
                modifier = Modifier.weight(1f).clickable { onNavigateTab("ORDERS") }
            )
        }
    }
}

@Composable
private fun KpiCircleCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconBg: Color,
    iconColor: Color,
    count: String,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = iconBg,
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(count, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF0F172A))
                Text(title, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155), maxLines = 1)
                Text(subtitle, fontSize = 9.sp, color = Color(0xFF94A3B8), maxLines = 1)
            }
        }
    }
}

// ─── FINANCIAL KPIS (RESUMEN FINANCIERO EN 4 COLUMNAS) ───
@Composable
fun FinancialKpiRow(
    uiState: MerchantDashboardUiState,
    onOpenFinance: () -> Unit = {}
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onOpenFinance() }
                ) {
                    Surface(shape = CircleShape, color = Color(0xFFDCFCE7), modifier = Modifier.size(24.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("$", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF16A34A))
                        }
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Resumen Financiero", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = Color(0xFF0F172A))
                }
                Text(
                    "Ver más ➔",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF2563EB),
                    modifier = Modifier.clickable { onOpenFinance() }
                )
            }

            // 4 Columnas Financieras con datos 100% reales SSOT
            val hasSummary = uiState.financialSummary.ordersCount > 0
            val grossRevenueText = if (hasSummary) "C$ ${uiState.financialSummary.revenueNio.toInt()}" else "C$ ${uiState.ventasHoyAmount.toInt()}"
            val grossRevenueSub = if (hasSummary) "${uiState.financialSummary.ordersCount} ventas" else "${uiState.clientesAtendidosCount} ventas hoy"
            val ordersCountText = if (hasSummary) "${uiState.financialSummary.ordersCount}" else "${uiState.totalOrdersTodayCount}"
            val averageTicketText = if (hasSummary) "C$ ${uiState.financialSummary.averageTicketNio.toInt()}" else "C$ ${uiState.ticketPromedioAmount.toInt()}"
            val feesText = if (hasSummary) "C$ ${uiState.financialSummary.platformFeesNio.toInt()}" else "C$ ${(uiState.ventasHoyAmount * 0.10).toInt()}"

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Ventas Brutas", fontSize = 10.sp, color = Color(0xFF64748B))
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(grossRevenueText, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF1E3A8A), maxLines = 1)
                    Text(grossRevenueSub, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                }
                Box(modifier = Modifier.width(1.dp).height(36.dp).background(Color(0xFFE2E8F0)))
                Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                    Text("Pedidos", fontSize = 10.sp, color = Color(0xFF64748B))
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(ordersCountText, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF0F172A), maxLines = 1)
                    Text("${uiState.nuevosCount + uiState.preparandoCount + uiState.listosCount} activos", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                }
                Box(modifier = Modifier.width(1.dp).height(36.dp).background(Color(0xFFE2E8F0)))
                Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                    Text("Ticket Prom.", fontSize = 10.sp, color = Color(0xFF64748B))
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(averageTicketText, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF0F172A), maxLines = 1)
                    Text("Por pedido", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A))
                }
                Box(modifier = Modifier.width(1.dp).height(36.dp).background(Color(0xFFE2E8F0)))
                Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                    Text("Comisiones", fontSize = 10.sp, color = Color(0xFF64748B))
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(feesText, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF0F172A), maxLines = 1)
                    Text("BlueSystem", fontSize = 9.sp, color = Color(0xFF64748B))
                }
            }
        }
    }
}

// ─── PERFORMANCE KPIS ───
@Composable
fun PerformanceKpiRow(uiState: MerchantDashboardUiState) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        DashboardKpiCard("TIEMPO COCINA", "${uiState.tiempoCocinaPromedioMin} min", Color(0xFF0284C7), Modifier.weight(1f))
        DashboardKpiCard("CALIFICACIÓN", "⭐ ${uiState.calificacionPromedio}", dashOrange, Modifier.weight(1f))
        DashboardKpiCard("CANCELACIONES", uiState.cancelacionesCount.toString(), if (uiState.cancelacionesCount > 0) dashRed else Color.Gray, Modifier.weight(1f))
    }
}

@Composable
fun DashboardKpiCard(title: String, value: String, color: Color, modifier: Modifier = Modifier, subtitle: String? = null) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF64748B))
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = color, maxLines = 1)
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(subtitle, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = dashGreen)
            }
        }
    }
}

// ─── CLASSIFIED ALERTS WIDGET (3 CÁPSULAS SUAVES) ───
@Composable
fun ClassifiedAlertsWidget(alerts: List<MerchantAlert>, onAction: (MerchantAlert) -> Unit) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🔔", fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Centro de Alertas", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = Color(0xFF0F172A))
                }
                Text("Ver todas (3) ➔", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2563EB))
            }

            if (alerts.isEmpty()) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFF0FDF4),
                    border = BorderStroke(1.dp, Color(0xFFBBF7D0)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF16A34A), modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Operación óptima: No hay alertas críticas ni stock bajo", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF15803D))
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    alerts.take(3).forEach { alert ->
                        val alertBg = when (alert.severity) {
                            AlertSeverity.CRITICAL -> Color(0xFFFEE2E2)
                            AlertSeverity.IMPORTANT -> Color(0xFFFEF3C7)
                            else -> Color(0xFFDBEAFE)
                        }
                        val alertTint = when (alert.severity) {
                            AlertSeverity.CRITICAL -> Color(0xFFEF4444)
                            AlertSeverity.IMPORTANT -> Color(0xFFF59E0B)
                            else -> Color(0xFF3B82F6)
                        }
                        val alertText = when (alert.severity) {
                            AlertSeverity.CRITICAL -> Color(0xFF991B1B)
                            AlertSeverity.IMPORTANT -> Color(0xFF92400E)
                            else -> Color(0xFF1E40AF)
                        }

                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = alertBg,
                            modifier = Modifier.fillMaxWidth().clickable { onAction(alert) }
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Surface(shape = RoundedCornerShape(8.dp), color = alertTint, modifier = Modifier.size(28.dp)) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(if (alert.severity == AlertSeverity.CRITICAL) "⚠️" else "🔔", fontSize = 14.sp)
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(alert.title, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = alertText)
                                        Text(alert.message, fontSize = 10.sp, color = alertText.copy(alpha = 0.85f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = alertText, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── LIVE ORDERS CENTER WIDGET (EMPTY STATE CON ILUSTRACIÓN DE CAJA) ───
@Composable
fun LiveOrdersCenterWidget(
    orders: List<Pedido>,
    onAccept: (String) -> Unit,
    onReady: (String) -> Unit,
    onViewAll: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("📦", fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Pedidos activos", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = Color(0xFF0F172A))
                }
                Text("Ver todos (${orders.size}) ➔", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2563EB), modifier = Modifier.clickable { onViewAll() })
            }

            if (orders.isEmpty()) {
                // Empty State con Ilustración de Caja Azul Abierta
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFFF8FAFC),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = Color(0xFFEFF6FF),
                            modifier = Modifier.size(72.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("📦", fontSize = 36.sp)
                            }
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            "No hay pedidos activos en este momento",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 13.sp,
                            color = Color(0xFF334155)
                        )
                        Text(
                            "Cuando tengas pedidos, aparecerán aquí.",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = onViewAll,
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                            border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                            shape = RoundedCornerShape(12.dp),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 1.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, tint = Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Actualizar", color = Color(0xFF2563EB), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            } else {
                orders.take(3).forEach { order ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Pedido #${order.displayOrderCode.removePrefix("#")}", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text("Monto: C$ ${order.total.toInt()} • Estado: ${order.status.uppercase()}", fontSize = 11.sp, color = Color.Gray)
                            }
                            if (order.status.equals("pending", true)) {
                                Button(
                                    onClick = { onAccept(order.pedidoId) },
                                    colors = ButtonDefaults.buttonColors(containerColor = dashGreen),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text("Aceptar ✔", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            } else if (order.status.equals("preparing", true)) {
                                Button(
                                    onClick = { onReady(order.pedidoId) },
                                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text("Marcar Listo 🏁", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── COURIER TRACKING WIDGET ───
@Composable
fun CourierTrackingWidget(couriersCount: Int, couriersList: List<String>) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        shadowElevation = 3.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Motorizados en Ruta 🛵", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(shape = CircleShape, color = dashBlue) {
                        Text("$couriersCount", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                    }
                }
            }

            couriersList.forEach { courier ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.DirectionsBike, contentDescription = null, tint = dashBlue, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(courier, fontSize = 12.sp, color = Color(0xFF334155))
                }
            }
        }
    }
}

// ─── CUSTOMER INSIGHTS WIDGET ───
@Composable
fun CustomerInsightsWidget(newCount: Int, recurringCount: Int, vipCount: Int, reviewScore: Double) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        shadowElevation = 3.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Clientes & Reseñas 👥", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Nuevos: $newCount", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                    Text("Recurrentes: $recurringCount", fontSize = 12.sp, color = Color(0xFF64748B))
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("VIP: $vipCount 👑", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = dashOrange)
                    Text("Última Reseña: ⭐ $reviewScore", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = dashGreen)
                }
            }
        }
    }
}

// ─── KDS SUMMARY WIDGET ───
@Composable
fun KdsSummaryWidget(preparandoCount: Int, avgTimeMin: Int, onOpenKds: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color(0xFF0F172A),
        shadowElevation = 4.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Cocina Digital (KDS Summary) 🍳", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = Color.White)
                Text("$preparandoCount pedido(s) en preparación • Promedio $avgTimeMin min", fontSize = 12.sp, color = Color(0xFF94A3B8))
            }
            Button(
                onClick = onOpenKds,
                colors = ButtonDefaults.buttonColors(containerColor = dashGreen),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Abrir KDS", fontWeight = FontWeight.Bold, fontSize = 11.sp)
            }
        }
    }
}

// ─── PRODUCT SUMMARY WIDGET ───
@Composable
fun ProductSummaryWidget(outOfStockCount: Int, lowStockCount: Int, onAddProduct: () -> Unit, onViewMenu: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        shadowElevation = 3.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Control de Productos & Stock 📦", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                Button(onClick = onAddProduct, shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = BluePrimary)) {
                    Text("+ Producto", fontSize = 11.sp)
                }
            }
            Text("Agotados: $outOfStockCount • Stock Bajo: $lowStockCount", fontSize = 12.sp, color = Color.Gray)
        }
    }
}

// ─── MERCHANT ASSISTANT PRIORITY WIDGET ───
@Composable
fun MerchantAssistantPriorityWidget(insights: List<PriorityInsight>, onActionClick: (PriorityInsight) -> Unit) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color(0xFFEFF6FF),
        border = BorderStroke(1.dp, BluePrimary.copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Merchant Assistant Insights (Priority Engine) 🤖", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = BluePrimary)
            }

            insights.forEach { insight ->
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(insight.title, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Text(insight.message, fontSize = 11.sp, color = Color(0xFF475569))
                        }
                        if (insight.actionText != null) {
                            TextButton(onClick = { onActionClick(insight) }) {
                                Text(insight.actionText, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── REALTIME TIMELINE WIDGET ───
@Composable
fun RealtimeTimelineWidget(timeline: List<TimelineActivity>) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        shadowElevation = 3.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Actividad en Tiempo Real ⚡", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
            timeline.take(4).forEach { item ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("•", color = BluePrimary, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(item.title, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(item.description, fontSize = 11.sp, color = Color.Gray)
                }
            }
        }
    }
}

// ─── QUICK ACTIONS WIDGET ───
@Composable
fun QuickActionsWidget(
    onAddProduct: () -> Unit,
    onOpenPromos: () -> Unit,
    onOpenKds: () -> Unit,
    onToggleStore: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        shadowElevation = 3.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Acciones Rápidas 🚀", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onAddProduct,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary)
                ) {
                    Text("+ Producto", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = onOpenPromos,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = dashOrange)
                ) {
                    Text("+ Promo", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = onOpenKds,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = dashGreen)
                ) {
                    Text("Abrir KDS", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}



// ─── SPRINT 17.2 ENTERPRISE POLISH: SKELETON SHIMMER LOADER ───
@Composable
fun DashboardSkeletonShimmer() {
    val infiniteTransition = rememberInfiniteTransition(label = "skeleton_shimmer")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 0.55f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "shimmer_alpha"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(90.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Color.Gray.copy(alpha = alpha))
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(Color.Gray.copy(alpha = alpha))
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(84.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(Color.Gray.copy(alpha = alpha))
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            repeat(3) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(110.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color.Gray.copy(alpha = alpha))
                )
            }
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(Color.Gray.copy(alpha = alpha))
        )
    }
}

// ─── REDESIGNED COMPONENT 1: HEADER PREMIUM COMPACTO (<= 110dp) ───
// ─── REDESIGNED COMPONENT 1: HEADER OPERACIONAL CANÓNICO ───
@Composable
fun RedesignedHeaderPremiumWidget(
    uiState: MerchantDashboardUiState,
    unreadCount: Int = 0,
    onOpenDrawer: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenProfile: () -> Unit = {}
) {
    val infiniteTransition = rememberInfiniteTransition(label = "notif_pulse")
    val badgeScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.18f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "badge_scale"
    )

    val storeName = uiState.businessInfo?.getEffectiveName()?.ifBlank { "Mi Comercio" } ?: "Mi Comercio"
    val logoUrl = uiState.businessInfo?.getEffectiveLogoUrl() ?: ""
    val isVerified = uiState.businessInfo?.getEffectiveIsVerified() ?: true

    Surface(
        color = Color(0xFF0052CC),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f, fill = false)
            ) {
                IconButton(
                    onClick = onOpenDrawer,
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(Icons.Default.Menu, contentDescription = "Menú Lateral", tint = Color.White)
                }

                Box(
                    modifier = Modifier
                        .clickable { onOpenProfile() },
                    contentAlignment = Alignment.BottomEnd
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color.White,
                        shadowElevation = 4.dp,
                        modifier = Modifier.size(46.dp)
                    ) {
                        if (logoUrl.isNotBlank()) {
                            AsyncImage(
                                model = logoUrl,
                                contentDescription = storeName,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Storefront, contentDescription = null, tint = Color(0xFF0052CC), modifier = Modifier.size(26.dp))
                            }
                        }
                    }
                    if (isVerified) {
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF0EA5E9)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Check, contentDescription = "Verificado", tint = Color.White, modifier = Modifier.size(10.dp))
                        }
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                Column(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .clickable { onOpenProfile() }
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = storeName,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (isVerified) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(Icons.Default.CheckCircle, contentDescription = "Verificado", tint = Color(0xFF38BDF8), modifier = Modifier.size(15.dp))
                        }
                    }
                    Text(
                        text = if (uiState.scheduleText.isNotBlank()) "Horario: ${uiState.scheduleText}" else "Sucursal Principal • En Línea",
                        fontSize = 11.sp,
                        color = Color.White.copy(alpha = 0.85f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color.Transparent
                    ) {
                        Box(
                            modifier = Modifier
                                .background(
                                    Brush.linearGradient(
                                        listOf(Color(0xFFF59E0B), Color(0xFFD97706))
                                    ),
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.WorkspacePremium, contentDescription = null, tint = Color.White, modifier = Modifier.size(10.dp))
                                Spacer(modifier = Modifier.width(2.dp))
                                Text("COMERCIO ACTIVO", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                            }
                        }
                    }
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                // Botón de Notificaciones con Badge Real
                Box(contentAlignment = Alignment.TopEnd) {
                    IconButton(
                        onClick = onOpenNotifications,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(Icons.Default.Notifications, contentDescription = "Notificaciones", tint = Color.White)
                    }
                    if (unreadCount > 0) {
                        Box(
                            modifier = Modifier
                                .scale(badgeScale)
                                .size(18.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFEF4444)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = if (unreadCount > 99) "99+" else "$unreadCount",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(4.dp))

                // Avatar / Perfil del Comercio
                Box(
                    modifier = Modifier
                        .clickable { onOpenProfile() },
                    contentAlignment = Alignment.BottomEnd
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFE2E8F0),
                        shadowElevation = 2.dp,
                        modifier = Modifier.size(38.dp)
                    ) {
                        if (logoUrl.isNotBlank()) {
                            AsyncImage(
                                model = logoUrl,
                                contentDescription = "Perfil",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Storefront, contentDescription = "Perfil Comercio", tint = Color(0xFF0052CC), modifier = Modifier.size(22.dp))
                            }
                        }
                    }
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(if (uiState.isStoreOpen) Color(0xFF22C55E) else Color(0xFFEF4444))
                    )
                }
            }
        }
    }
}

// ─── REDESIGNED COMPONENT 2: ESTADO DEL COMERCIO COMPACTO (<= 90dp) ───
@Composable
fun RedesignedStoreStatusCard(
    isStoreOpen: Boolean,
    isOffline: Boolean = false,
    lastSyncTimeText: String,
    onToggleStore: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f, fill = false)
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(if (isStoreOpen) Color(0xFF22C55E).copy(alpha = 0.12f) else Color(0xFFEF4444).copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        if (isStoreOpen) Icons.Default.Storefront else Icons.Default.Store,
                        contentDescription = null,
                        tint = if (isStoreOpen) Color(0xFF22C55E) else Color(0xFFEF4444),
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f, fill = false)) {
                    Text(
                        text = if (isStoreOpen) "ABIERTO" else "CERRADO",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (isStoreOpen) Color(0xFF22C55E) else Color(0xFFEF4444)
                    )
                    Text(
                        text = if (isStoreOpen) "Recibiendo pedidos" else "Pausado temporalmente",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF475569),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(if (!isOffline) Color(0xFF22C55E) else Color(0xFFF59E0B))
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (!isOffline) "Sincronizado: $lastSyncTimeText" else "Modo Offline",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (!isOffline) Color(0xFF22C55E).copy(alpha = 0.12f) else Color(0xFFFEF3C7),
                    modifier = Modifier.padding(end = 8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            if (!isOffline) Icons.Default.Wifi else Icons.Default.WifiOff,
                            contentDescription = null,
                            tint = if (!isOffline) Color(0xFF15803D) else Color(0xFFD97706),
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (!isOffline) "Conectado" else "Offline",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (!isOffline) Color(0xFF15803D) else Color(0xFFD97706)
                        )
                    }
                }

                Switch(
                    checked = isStoreOpen,
                    onCheckedChange = { onToggleStore() },
                    modifier = Modifier.size(48.dp),
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Color(0xFF22C55E)
                    )
                )
            }
        }
    }
}

// ─── REDESIGNED COMPONENT 3: KPIS PRINCIPALES BDL (DATOS 100% REALES) ───
@Composable
fun RedesignedMainKpisRow(
    uiState: MerchantDashboardUiState,
    onNavigateTab: (String) -> Unit
) {
    val totalActivos = uiState.nuevosCount + uiState.preparandoCount + uiState.listosCount + uiState.motorizadosActivosCount

    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        // KPI 1: Ventas Hoy (Dorado 🟡 BDL Finanzas)
        item {
            KpiCompactCard(
                title = "Ventas Hoy",
                value = "C$ ${uiState.ventasHoyAmount.toInt()}",
                subtext = "${uiState.clientesAtendidosCount} completados",
                subtextColor = Color(0xFF22C55E),
                icon = Icons.Default.ShoppingBag,
                iconTint = Color(0xFFF59E0B),
                bgColor = Color(0xFFFFFBEB),
                onClick = { onNavigateTab("STATS") }
            )
        }

        // KPI 2: Pedidos Hoy (Verde 🟢 BDL Operación)
        item {
            KpiCompactCard(
                title = "Pedidos Hoy",
                value = "${uiState.totalOrdersTodayCount}",
                subtext = "$totalActivos activos",
                subtextColor = Color(0xFF22C55E),
                icon = Icons.Default.Inventory2,
                iconTint = Color(0xFF22C55E),
                bgColor = Color(0xFFF0FDF4),
                onClick = { onNavigateTab("ORDERS") }
            )
        }

        // KPI 3: Ticket Promedio (Azul 🔵 BDL Finanzas)
        item {
            KpiCompactCard(
                title = "Ticket Promedio",
                value = "C$ ${uiState.ticketPromedioAmount.toInt()}",
                subtext = "Por venta válida",
                subtextColor = Color(0xFF0284C7),
                icon = Icons.Default.ReceiptLong,
                iconTint = Color(0xFF2563EB),
                bgColor = Color(0xFFEFF6FF),
                onClick = { onNavigateTab("STATS") }
            )
        }

        // KPI 4: En Ruta (Celeste 🩵 BDL Delivery)
        item {
            KpiCompactCard(
                title = "En Ruta",
                value = "${uiState.motorizadosActivosCount}",
                subtext = if (uiState.motorizadosActivosCount > 0) "Con repartidor" else "Sin envíos",
                subtextColor = Color(0xFF0284C7),
                icon = Icons.Default.TwoWheeler,
                iconTint = Color(0xFF06B6D4),
                bgColor = Color(0xFFECFEFF),
                onClick = { onNavigateTab("ORDERS") }
            )
        }

        // KPI 5: En Cocina (Naranja 🟠 BDL Cocina)
        item {
            KpiCompactCard(
                title = "En Cocina",
                value = "${uiState.preparandoCount}",
                subtext = "En preparación",
                subtextColor = Color(0xFFD97706),
                icon = Icons.Default.Restaurant,
                iconTint = Color(0xFFF97316),
                bgColor = Color(0xFFFFF7ED),
                onClick = { onNavigateTab("ORDERS") }
            )
        }

        // KPI 6: Cancelados (Rojo 🔴 BDL Riesgo)
        item {
            KpiCompactCard(
                title = "Cancelados",
                value = "${uiState.cancelacionesCount}",
                subtext = "Hoy",
                subtextColor = Color(0xFFEF4444),
                icon = Icons.Default.Cancel,
                iconTint = Color(0xFFEF4444),
                bgColor = Color(0xFFFEF2F2),
                onClick = { onNavigateTab("ORDERS") }
            )
        }
    }
}

@Composable
fun KpiCompactCard(
    title: String,
    value: String,
    subtext: String,
    subtextColor: Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    bgColor: Color,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = bgColor,
        border = BorderStroke(1.dp, iconTint.copy(alpha = 0.2f)),
        shadowElevation = 2.dp,
        modifier = Modifier
            .widthIn(min = 130.dp, max = 155.dp)
            .height(110.dp)
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(iconTint.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = title, tint = iconTint, modifier = Modifier.size(18.dp))
            }
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF475569),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = value,
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF0F172A),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = subtext,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = subtextColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

// ─── REDESIGNED COMPONENT 4: META DEL DÍA COMPACTA (SIN DATOS INVENTADOS) ───
@Composable
fun RedesignedDailyGoalWidget(
    goal: DashboardGoal,
    hasConfiguredGoal: Boolean,
    scheduleText: String
) {
    val targetAmount = goal.targetAmount
    val hasValidGoal = hasConfiguredGoal && targetAmount > 0.0

    val progress = if (hasValidGoal) (goal.currentAmount / targetAmount.coerceAtLeast(1.0)).toFloat().coerceIn(0f, 1f) else 0f
    val percent = (progress * 100).toInt()

    val progressBarColor = when {
        percent >= 100 -> Color(0xFFF59E0B)
        percent >= 80 -> Color(0xFF10B981)
        else -> Color(0xFF2563EB)
    }

    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        if (!hasValidGoal) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFEFF6FF)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.AdsClick, contentDescription = null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text("Meta del día", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                        Text(
                            if (scheduleText.isNotBlank()) "Horario: $scheduleText" else "Sin meta diaria configurada",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }
                Text(
                    "C$ ${goal.currentAmount.toInt()} hoy",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF10B981)
                )
            }
        } else {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(0.38f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(26.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFFFFBEB)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                if (percent >= 100) Icons.Default.Star else Icons.Default.AdsClick,
                                contentDescription = null,
                                tint = Color(0xFFF59E0B),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Meta del día", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("$percent%", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = progressBarColor)
                    Text(
                        if (percent >= 100) "¡Alcanzado! 🚀" else if (percent >= 80) "¡Casi listo! 🎯" else "En progreso",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = progressBarColor
                    )
                }

                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .height(60.dp)
                        .background(Color(0xFFE2E8F0))
                )

                Column(
                    modifier = Modifier
                        .weight(0.62f)
                        .padding(start = 14.dp)
                ) {
                    Text("Llevas: C$ ${goal.currentAmount.toInt()}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("Objetivo: C$ ${targetAmount.toInt()}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Spacer(modifier = Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = progressBarColor,
                        trackColor = Color(0xFFE2E8F0)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Schedule, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            if (scheduleText.isNotBlank()) "Horario: $scheduleText" else "Jornada en curso",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF64748B)
                        )
                    }
                }
            }
        }
    }
}

// ─── REDESIGNED COMPONENT 5: ESTADO OPERATIVO HOY (GRID COMPACTO E INTERACTIVO) ───
@Composable
fun RedesignedOperationalGrid(
    uiState: MerchantDashboardUiState,
    onNavigateTab: (String) -> Unit,
    onOpenKds: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Group, contentDescription = null, tint = Color(0xFF0F172A), modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Estado Operativo Hoy", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
            }
            TextButton(
                onClick = { onNavigateTab("ORDERS") },
                modifier = Modifier.heightIn(min = 48.dp)
            ) {
                Text("Ver detalle →", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF2563EB))
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            OperationalCardItem(
                count = "${uiState.nuevosCount}",
                title = "Nuevos",
                subtitle = "Pendientes",
                icon = Icons.Default.Notifications,
                iconTint = Color(0xFF2563EB),
                bgColor = Color(0xFFEFF6FF),
                onClick = { onNavigateTab("ORDERS") },
                modifier = Modifier.weight(1f)
            )
            OperationalCardItem(
                count = "${uiState.preparandoCount}",
                title = "En Cocina",
                subtitle = "Preparación",
                icon = Icons.Default.Restaurant,
                iconTint = Color(0xFFF97316),
                bgColor = Color(0xFFFFF7ED),
                onClick = { onOpenKds() },
                modifier = Modifier.weight(1f)
            )
            OperationalCardItem(
                count = "${uiState.listosCount}",
                title = "Listos",
                subtitle = "Para entrega",
                icon = Icons.Default.CheckCircle,
                iconTint = Color(0xFF22C55E),
                bgColor = Color(0xFFF0FDF4),
                onClick = { onNavigateTab("ORDERS") },
                modifier = Modifier.weight(1f)
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            OperationalCardItem(
                count = "${uiState.motorizadosActivosCount}",
                title = "En Ruta",
                subtitle = "Repartiendo",
                icon = Icons.Default.TwoWheeler,
                iconTint = Color(0xFF06B6D4),
                bgColor = Color(0xFFECFEFF),
                onClick = { onNavigateTab("ORDERS") },
                modifier = Modifier.weight(1f)
            )
            OperationalCardItem(
                count = "${uiState.clientesAtendidosCount}",
                title = "Entregados",
                subtitle = "Completados",
                icon = Icons.Default.DoneAll,
                iconTint = Color(0xFF10B981),
                bgColor = Color(0xFFECFDF5),
                onClick = { onNavigateTab("ORDERS") },
                modifier = Modifier.weight(1f)
            )
            OperationalCardItem(
                count = "${uiState.cancelacionesCount}",
                title = "Cancelados",
                subtitle = "Hoy",
                icon = Icons.Default.Cancel,
                iconTint = Color(0xFFEF4444),
                bgColor = Color(0xFFFEF2F2),
                onClick = { onNavigateTab("ORDERS") },
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
fun OperationalCardItem(
    count: String,
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    bgColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = bgColor,
        shadowElevation = 1.dp,
        modifier = modifier
            .height(84.dp)
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(iconTint.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = title, tint = iconTint, modifier = Modifier.size(14.dp))
            }
            Text(count, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(title, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle, fontSize = 9.sp, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

// ─── REDESIGNED COMPONENT 6: ACCIONES RÁPIDAS (5 BOTONES ORDENADOS DE 56dp) ───
@Composable
fun RedesignedQuickActionsRow(
    onAddProduct: () -> Unit,
    onOpenPromos: () -> Unit,
    onOpenKds: () -> Unit,
    onOpenMenu: () -> Unit,
    onOpenMore: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Bolt, contentDescription = null, tint = Color(0xFF0F172A), modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Acciones Rápidas", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
        }

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            item {
                QuickActionButton(
                    label = "+ Producto",
                    icon = Icons.Default.Inventory,
                    bgColor = Color(0xFF0052CC),
                    contentColor = Color.White,
                    onClick = onAddProduct
                )
            }
            item {
                QuickActionButton(
                    label = "Abrir KDS",
                    icon = Icons.Default.Restaurant,
                    bgColor = Color(0xFF22C55E),
                    contentColor = Color.White,
                    onClick = onOpenKds
                )
            }
            item {
                QuickActionButton(
                    label = "+ Promoción",
                    icon = Icons.Default.AutoAwesome,
                    bgColor = Color(0xFFF59E0B),
                    contentColor = Color.White,
                    onClick = onOpenPromos
                )
            }
            item {
                QuickActionButton(
                    label = "Catálogo",
                    icon = Icons.Default.MenuBook,
                    bgColor = Color(0xFF4F46E5),
                    contentColor = Color.White,
                    onClick = onOpenMenu
                )
            }
            item {
                QuickActionButton(
                    label = "⋯ Personalizar",
                    icon = Icons.Default.Tune,
                    bgColor = Color(0xFFF1F5F9),
                    contentColor = Color(0xFF334155),
                    onClick = onOpenMore
                )
            }
        }
    }
}

@Composable
fun QuickActionButton(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    bgColor: Color,
    contentColor: Color,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = bgColor,
            contentColor = contentColor
        ),
        modifier = Modifier
            .height(56.dp)
            .defaultMinSize(minWidth = 120.dp)
    ) {
        Icon(icon, contentDescription = label, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(6.dp))
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

// ─── REDESIGNED COMPONENT 7: AI INSIGHT CHIP (COMPACTO) ───
@Composable
fun RedesignedAiInsightChip(
    insight: PriorityInsight,
    onOpenAi: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFF4F46E5),
        shadowElevation = 3.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpenAi() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "🤖 Recomendación: ${insight.title}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Text(insight.actionText?.let { "$it →" } ?: "Ver →", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFA5B4FC))
        }
    }
}

// ─── MODAL COMPONENTE 8: CENTRO DE NOTIFICACIONES DEL COMERCIO ───
@Composable
fun MerchantNotificationCenterDialog(
    notifications: List<AppNotification>,
    unreadCount: Int,
    onDismiss: () -> Unit,
    onMarkAsRead: (id: String) -> Unit,
    onMarkAllAsRead: () -> Unit,
    onSelectNotification: (item: AppNotification) -> Unit
) {
    var selectedCategoryFilter by remember { mutableStateOf<String?>(null) }
    val timeFormat = remember { SimpleDateFormat("HH:mm · dd/MM", Locale.getDefault()) }

    val filtered = remember(notifications, selectedCategoryFilter) {
        if (selectedCategoryFilter == null) {
            notifications
        } else if (selectedCategoryFilter == "Finanzas") {
            notifications.filter {
                it.category.equals("Finanzas", true) ||
                it.category.equals("Liquidaciones", true) ||
                it.type.contains("SETTLEMENT", true) ||
                it.action.contains("SETTLEMENT", true)
            }
        } else {
            notifications.filter { it.category.equals(selectedCategoryFilter, true) || it.type.equals(selectedCategoryFilter, true) }
        }
    }

    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .fillMaxHeight(0.85f)
                .clip(RoundedCornerShape(24.dp)),
            color = Color(0xFF0F172A),
            border = BorderStroke(1.dp, Color(0xFF334155)),
            shadowElevation = 24.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(18.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF3B82F6).copy(alpha = 0.2f),
                            modifier = Modifier.size(38.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                BadgedBox(
                                    badge = {
                                        if (unreadCount > 0) {
                                            Badge(containerColor = Color(0xFFEF4444), contentColor = Color.White) {
                                                Text("$unreadCount", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Notifications,
                                        contentDescription = null,
                                        tint = Color(0xFF60A5FA),
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Notificaciones del Comercio",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp
                            )
                            Text(
                                text = if (unreadCount > 0) "$unreadCount no leída(s)" else "Al día con tus alertas",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (unreadCount > 0) {
                            TextButton(onClick = onMarkAllAsRead) {
                                Text("Leídas ✓✓", fontSize = 11.sp, color = Color(0xFF60A5FA), fontWeight = FontWeight.Bold)
                            }
                        }
                        IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color(0xFF94A3B8))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFF1E293B))
                Spacer(modifier = Modifier.height(10.dp))

                // Categorías / Filtros
                ScrollableTabRow(
                    selectedTabIndex = when (selectedCategoryFilter) {
                        null -> 0
                        "Pedidos" -> 1
                        "Finanzas" -> 2
                        "Sistema" -> 3
                        "Admin" -> 4
                        else -> 0
                    },
                    containerColor = Color.Transparent,
                    contentColor = Color.White,
                    edgePadding = 0.dp,
                    divider = {}
                ) {
                    Tab(
                        selected = selectedCategoryFilter == null,
                        onClick = { selectedCategoryFilter = null },
                        text = { Text("Todas (${notifications.size})", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = selectedCategoryFilter == "Pedidos",
                        onClick = { selectedCategoryFilter = "Pedidos" },
                        text = { Text("Pedidos", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = selectedCategoryFilter == "Finanzas",
                        onClick = { selectedCategoryFilter = "Finanzas" },
                        text = { Text("Finanzas", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = selectedCategoryFilter == "Sistema",
                        onClick = { selectedCategoryFilter = "Sistema" },
                        text = { Text("Operativas", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = selectedCategoryFilter == "Admin",
                        onClick = { selectedCategoryFilter = "Admin" },
                        text = { Text("Admin", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Lista de notificaciones
                if (filtered.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.NotificationsNone,
                                contentDescription = null,
                                tint = Color(0xFF475569),
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "No hay notificaciones en esta categoría",
                                color = Color(0xFF64748B),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filtered, key = { it.id }) { item ->
                            val isUnread = !item.getEffectiveIsRead()
                            Surface(
                                onClick = {
                                    onMarkAsRead(item.id)
                                    onSelectNotification(item)
                                },
                                shape = RoundedCornerShape(14.dp),
                                color = if (isUnread) Color(0xFF1E293B) else Color(0xFF0F172A),
                                border = BorderStroke(
                                    1.dp,
                                    if (isUnread) Color(0xFF3B82F6).copy(alpha = 0.5f) else Color(0xFF334155)
                                ),
                                shadowElevation = if (isUnread) 4.dp else 0.dp
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Surface(
                                        shape = CircleShape,
                                        color = when {
                                            item.type.contains("SETTLEMENT", true) || item.category.contains("Finanzas", true) -> Color(0xFF10B981).copy(alpha = 0.2f)
                                            item.type.contains("ORDER", true) -> Color(0xFF10B981).copy(alpha = 0.2f)
                                            item.type.contains("ADMIN", true) -> Color(0xFFF59E0B).copy(alpha = 0.2f)
                                            else -> Color(0xFF3B82F6).copy(alpha = 0.2f)
                                        },
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = when {
                                                    item.type.contains("SETTLEMENT", true) || item.category.contains("Finanzas", true) -> Icons.Default.AccountBalance
                                                    item.type.contains("ORDER", true) -> Icons.Default.ReceiptLong
                                                    item.type.contains("ADMIN", true) -> Icons.Default.AdminPanelSettings
                                                    else -> Icons.Default.Notifications
                                                },
                                                contentDescription = null,
                                                tint = when {
                                                    item.type.contains("SETTLEMENT", true) || item.category.contains("Finanzas", true) -> Color(0xFF34D399)
                                                    item.type.contains("ORDER", true) -> Color(0xFF34D399)
                                                    item.type.contains("ADMIN", true) -> Color(0xFFFBBF24)
                                                    else -> Color(0xFF60A5FA)
                                                },
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.width(12.dp))

                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = item.title,
                                                color = Color.White,
                                                fontWeight = if (isUnread) FontWeight.ExtraBold else FontWeight.Bold,
                                                fontSize = 13.sp,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                                modifier = Modifier.weight(1f)
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = item.sentAt?.toDate()?.let { timeFormat.format(it) } ?: "Reciente",
                                                color = Color(0xFF64748B),
                                                fontSize = 10.sp
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(4.dp))

                                        Text(
                                            text = item.body,
                                            color = Color(0xFF94A3B8),
                                            fontSize = 12.sp,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                            lineHeight = 16.sp
                                        )
                                    }

                                    if (isUnread) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(Color(0xFF3B82F6))
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── MODAL COMPONENTE 9: PERFIL DEL COMERCIO & LOGOUT ───
@Composable
fun MerchantBusinessProfileDialog(
    businessInfo: com.example.data.repository.BusinessInfo?,
    isStoreOpen: Boolean,
    onToggleStore: () -> Unit,
    onOpenCustomize: () -> Unit,
    onDismiss: () -> Unit,
    onRequestLogout: () -> Unit
) {
    val currentUser = remember { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser }
    val storeName = businessInfo?.getEffectiveName()?.ifBlank { "Mi Comercio" } ?: "Mi Comercio"
    val logoUrl = businessInfo?.getEffectiveLogoUrl() ?: ""

    androidx.compose.ui.window.Dialog(
        onDismissRequest = onDismiss
    ) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            shadowElevation = 24.dp,
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .wrapContentHeight()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header con Logo
                Box(contentAlignment = Alignment.BottomEnd) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFF1F5F9),
                        border = BorderStroke(2.dp, Color(0xFF0052CC)),
                        modifier = Modifier.size(72.dp)
                    ) {
                        if (logoUrl.isNotBlank()) {
                            AsyncImage(
                                model = logoUrl,
                                contentDescription = storeName,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Storefront, contentDescription = null, tint = Color(0xFF0052CC), modifier = Modifier.size(38.dp))
                            }
                        }
                    }
                    Box(
                        modifier = Modifier
                            .size(18.dp)
                            .clip(CircleShape)
                            .background(if (isStoreOpen) Color(0xFF22C55E) else Color(0xFFEF4444)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            if (isStoreOpen) Icons.Default.Check else Icons.Default.Close,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = storeName,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF0F172A),
                    textAlign = TextAlign.Center
                )
                Text(
                    text = businessInfo?.getEffectiveCategory() ?: "Restaurante Asociado",
                    fontSize = 12.sp,
                    color = Color(0xFF64748B)
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Estado de Atención Switch
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = if (isStoreOpen) Color(0xFFF0FDF4) else Color(0xFFFEF2F2),
                    border = BorderStroke(1.dp, if (isStoreOpen) Color(0xFFBBF7D0) else Color(0xFFFECACA)),
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
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(if (isStoreOpen) Color(0xFF22C55E) else Color(0xFFEF4444))
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                if (isStoreOpen) "Comercio Abierto" else "Comercio Pausado",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = if (isStoreOpen) Color(0xFF15803D) else Color(0xFFB91C1C)
                            )
                        }
                        Switch(
                            checked = isStoreOpen,
                            onCheckedChange = { onToggleStore() },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color(0xFF22C55E)
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Info Operacional
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = businessInfo?.getEffectiveAddress() ?: "Managua, Nicaragua",
                            fontSize = 12.sp,
                            color = Color(0xFF334155),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Phone, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = businessInfo?.getEffectivePhone()?.ifBlank { "Sin teléfono registrado" } ?: "Contacto disponible",
                            fontSize = 12.sp,
                            color = Color(0xFF334155)
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = currentUser?.email ?: "Operador Autorizado",
                            fontSize = 12.sp,
                            color = Color(0xFF334155),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Botón Personalizar Dashboard
                OutlinedButton(
                    onClick = onOpenCustomize,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Tune, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Personalizar Dashboard", fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Botón Cerrar Sesión
                Button(
                    onClick = onRequestLogout,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Cerrar Sesión", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}
