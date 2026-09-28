package com.example.presentation.courier

import android.app.DatePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.engine.courier.CourierRewardState
import com.example.domain.model.courier.CourierMetrics
import com.example.domain.model.courier.CourierReviewItem
import java.text.SimpleDateFormat
import java.util.*

enum class PerformanceDateFilter(val label: String) {
    DEFAULT_LAST_5("Recientes"),
    TODAY("Hoy"),
    YESTERDAY("Ayer"),
    LAST_7_DAYS("7 Días"),
    LAST_30_DAYS("30 Días"),
    CUSTOM("Rango")
}

/**
 * Pantalla de Rendimiento, Telemetría para IA, Gamificación, Historial Operacional y Reseñas.
 * Protocolo: BSD-COURIER-PERFORMANCE-HISTORY-DATA-HOMOLOGATION-001
 *
 * Mejoras incorporadas:
 * 1. ID de pedido 100% homologado (#displayOrderCode).
 * 2. Calificación real y opiniones de clientes desde /reviews con paginación de 3 opiniones por página.
 * 3. Historial por comercio con selector dinámico, selector de fechas y paginación de 5 pedidos por página.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierPerformanceScreen(
    metrics: CourierMetrics,
    rewardState: CourierRewardState,
    historyOrders: List<com.example.PedidoOfrecido> = emptyList(),
    reviews: List<CourierReviewItem> = emptyList(),
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var selectedCommerce by remember { mutableStateOf("Todos los comercios") }
    var selectedDateFilter by remember { mutableStateOf(PerformanceDateFilter.DEFAULT_LAST_5) }
    var customStartDateMs by remember { mutableStateOf<Long?>(null) }
    var customEndDateMs by remember { mutableStateOf<Long?>(null) }
    var showCustomDateDialog by remember { mutableStateOf(false) }
    var commerceDropdownExpanded by remember { mutableStateOf(false) }

    // Estados reactivos de paginación
    var reviewsPage by remember { mutableStateOf(0) }
    var ordersPage by remember { mutableStateOf(0) }

    val shortDateFormat = remember { SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()) }

    val availableBusinesses = remember(historyOrders) {
        listOf("Todos los comercios") + historyOrders
            .map { it.comercioNombre.ifBlank { "Comercio Local" } }
            .distinct()
            .sorted()
    }

    // Calcular límites de fecha para el filtro temporal
    val now = remember { System.currentTimeMillis() }
    val (startRangeMs, endRangeMs) = remember(selectedDateFilter, customStartDateMs, customEndDateMs, now) {
        when (selectedDateFilter) {
            PerformanceDateFilter.DEFAULT_LAST_5 -> Pair(0L, Long.MAX_VALUE)
            PerformanceDateFilter.TODAY -> {
                val cal = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val start = cal.timeInMillis
                cal.set(Calendar.HOUR_OF_DAY, 23)
                cal.set(Calendar.MINUTE, 59)
                cal.set(Calendar.SECOND, 59)
                cal.set(Calendar.MILLISECOND, 999)
                Pair(start, cal.timeInMillis)
            }
            PerformanceDateFilter.YESTERDAY -> {
                val cal = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, -1)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val start = cal.timeInMillis
                cal.set(Calendar.HOUR_OF_DAY, 23)
                cal.set(Calendar.MINUTE, 59)
                cal.set(Calendar.SECOND, 59)
                cal.set(Calendar.MILLISECOND, 999)
                Pair(start, cal.timeInMillis)
            }
            PerformanceDateFilter.LAST_7_DAYS -> {
                val cal = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, -7)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                Pair(cal.timeInMillis, Long.MAX_VALUE)
            }
            PerformanceDateFilter.LAST_30_DAYS -> {
                val cal = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, -30)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                Pair(cal.timeInMillis, Long.MAX_VALUE)
            }
            PerformanceDateFilter.CUSTOM -> {
                Pair(customStartDateMs ?: 0L, customEndDateMs ?: Long.MAX_VALUE)
            }
        }
    }

    // Filtrado de pedidos según comercio y fecha
    val filteredOrders = remember(historyOrders, selectedCommerce, selectedDateFilter, startRangeMs, endRangeMs) {
        val sorted = historyOrders.sortedByDescending { order ->
            order.getFinancialTimestamp().takeIf { it > 0L } ?: order.createdAt ?: 0L
        }

        sorted.filter { order ->
            val commerceName = order.comercioNombre.ifBlank { "Comercio Local" }
            val matchesCommerce = (selectedCommerce == "Todos los comercios") || (commerceName == selectedCommerce)

            val orderTs = order.getFinancialTimestamp().takeIf { it > 0L } ?: order.createdAt ?: 0L
            val matchesDate = if (selectedDateFilter == PerformanceDateFilter.DEFAULT_LAST_5) {
                true
            } else {
                orderTs in startRangeMs..endRangeMs
            }

            matchesCommerce && matchesDate
        }
    }

    // Reiniciar página de pedidos al cambiar comercio o filtro de fechas
    LaunchedEffect(selectedCommerce, selectedDateFilter, startRangeMs, endRangeMs) {
        ordersPage = 0
    }

    // Paginación de pedidos: 5 pedidos por página
    val ORDERS_PER_PAGE = 5
    val totalOrdersPages = if (filteredOrders.isEmpty()) 1 else ((filteredOrders.size + ORDERS_PER_PAGE - 1) / ORDERS_PER_PAGE)
    val safeOrdersPage = ordersPage.coerceIn(0, (totalOrdersPages - 1).coerceAtLeast(0))
    val pagedOrders = remember(filteredOrders, safeOrdersPage) {
        filteredOrders.drop(safeOrdersPage * ORDERS_PER_PAGE).take(ORDERS_PER_PAGE)
    }

    val ordersByCommerce = remember(pagedOrders) {
        pagedOrders.groupBy { it.comercioNombre.ifBlank { "Comercio Local" } }
    }

    // Paginación de opiniones de clientes: 3 opiniones por página
    val REVIEWS_PER_PAGE = 3
    val totalReviewsPages = if (reviews.isEmpty()) 1 else ((reviews.size + REVIEWS_PER_PAGE - 1) / REVIEWS_PER_PAGE)
    val safeReviewsPage = reviewsPage.coerceIn(0, (totalReviewsPages - 1).coerceAtLeast(0))
    val pagedReviews = remember(reviews, safeReviewsPage) {
        reviews.drop(safeReviewsPage * REVIEWS_PER_PAGE).take(REVIEWS_PER_PAGE)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Mi Rendimiento e Historial",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 18.sp
                        )
                        Text(
                            text = "Telemetría & Trazabilidad de Entregas",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Regresar", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        },
        containerColor = Color(0xFF020617)
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(4.dp)) }

            // ── 1. TARJETA DE GAMIFICACIÓN Y RECOMPENSAS ─────────────────────
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = Brush.horizontalGradient(
                            listOf(Color(0xFF6366F1), Color(0xFF4F46E5))
                        )
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFFFBBF24).copy(alpha = 0.15f),
                            modifier = Modifier.size(52.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.EmojiEvents,
                                    contentDescription = null,
                                    tint = Color(0xFFFBBF24),
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Racha Actual: ${rewardState.currentStreakCount} Entregas",
                                color = Color.White,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 15.sp
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Ranking Semanal: #${rewardState.weeklyRankPosition} en Flota",
                                color = Color(0xFFC7D2FE),
                                fontSize = 12.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Bono Acumulado: C$ ${String.format(Locale.US, "%.2f", rewardState.totalBonusEarnedThisWeek)}",
                                color = Color(0xFF34D399),
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp
                            )
                        }
                    }
                }
            }

            // ── 2. MÉTRICAS DE TELEMETRÍA ────────────────────────────────────
            item {
                Text(
                    text = "MÉTRICAS DE RENDIMIENTO",
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = Color(0xFF818CF8),
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.height(8.dp))

                val ordersPerHourText = if (metrics.ordersPerHour > 0.0) {
                    String.format(Locale.US, "%.1f /h", metrics.ordersPerHour)
                } else {
                    "N/D"
                }

                val earningsPerKmText = if (metrics.earningsPerKm > 0.0) {
                    "C$ ${String.format(Locale.US, "%.2f", metrics.earningsPerKm)}"
                } else {
                    "N/D"
                }

                // Grid 2x2 Uniforme Dark Theme (Sección 15)
                // Fila 1: Total Viajes | Comercio
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    DarkMetricCard(
                        title = "🏁 Total Viajes",
                        value = "${metrics.completedTotalTrips}",
                        icon = Icons.Default.DoneAll,
                        modifier = Modifier.weight(1f)
                    )
                    DarkMetricCard(
                        title = "🚚 Comercio",
                        value = "${metrics.completedCommerceTrips}",
                        icon = Icons.Default.Storefront,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                // Fila 2: Viajes X→Y | Tasa de Éxito
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    DarkMetricCard(
                        title = "📦 Viajes X→Y",
                        value = "${metrics.completedX2YTrips}",
                        icon = Icons.Default.LocalShipping,
                        modifier = Modifier.weight(1f)
                    )
                    DarkMetricCard(
                        title = "Tasa de Éxito",
                        value = "${String.format(Locale.US, "%.1f", metrics.completionRate)}%",
                        icon = Icons.Default.CheckCircle,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                // Fila 3: Calificación | Pedidos / Hora
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    RatingMetricCard(
                        averageRating = metrics.averageRating,
                        ratingCount = metrics.ratingCount,
                        modifier = Modifier.weight(1f)
                    )
                    DarkMetricCard(
                        title = "Pedidos / Hora",
                        value = ordersPerHourText,
                        icon = Icons.Default.Speed,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(modifier = Modifier.height(10.dp))
                // Fila 4: Ingreso / Km
                Row(modifier = Modifier.fillMaxWidth()) {
                    DarkMetricCard(
                        title = "Ingreso / Km",
                        value = earningsPerKmText,
                        icon = Icons.Default.MonetizationOn,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // ── 2.1 OPINIONES DE CLIENTES (DESDE /reviews) ───────────────────
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.RateReview,
                            contentDescription = null,
                            tint = Color(0xFF818CF8),
                            modifier = Modifier.size(15.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "OPINIONES DE CLIENTES",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = Color(0xFF818CF8),
                            letterSpacing = 1.sp
                        )
                    }
                    if (reviews.isNotEmpty()) {
                        Text(
                            text = "${reviews.size} ${if (reviews.size == 1) "opinión" else "opiniones"} (Pág. ${safeReviewsPage + 1}/$totalReviewsPages)",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            if (reviews.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("💬", fontSize = 20.sp)
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Aún no tienes opiniones escritas",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = Color.White
                                )
                                Text(
                                    text = "Las valoraciones y comentarios de los clientes aparecerán aquí.",
                                    fontSize = 11.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }
                    }
                }
            } else {
                items(pagedReviews, key = { it.orderId.ifBlank { it.timestampMs.toString() } }) { rev ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "⭐ ${rev.rating}.0",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 13.sp,
                                        color = Color(0xFFFBBF24)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    for (i in 1..5) {
                                        Icon(
                                            imageVector = Icons.Default.Star,
                                            contentDescription = null,
                                            tint = if (i <= rev.rating) Color(0xFFFBBF24) else Color(0xFF475569),
                                            modifier = Modifier.size(12.dp)
                                        )
                                    }
                                }
                                if (rev.date.isNotBlank()) {
                                    Text(
                                        text = rev.date,
                                        fontSize = 10.sp,
                                        color = Color(0xFF64748B)
                                    )
                                }
                            }
                            if (rev.comment.isNotBlank()) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "\"${rev.comment}\"",
                                    fontSize = 12.sp,
                                    color = Color(0xFFE2E8F0),
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.VerifiedUser,
                                    contentDescription = null,
                                    tint = Color(0xFF38BDF8),
                                    modifier = Modifier.size(11.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Cliente verificado",
                                    fontSize = 10.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }
                    }
                }

                if (totalReviewsPages > 1) {
                    item {
                        DarkPaginationBar(
                            currentPage = safeReviewsPage,
                            totalPages = totalReviewsPages,
                            onPageChange = { reviewsPage = it }
                        )
                    }
                }
            }

            // ── 3. HISTORIAL DE PEDIDOS AGRUPADOS POR COMERCIO ────────────────
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "HISTORIAL POR COMERCIO",
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = Color(0xFF818CF8),
                            letterSpacing = 1.sp
                        )
                        Text(
                            text = if (filteredOrders.isEmpty()) {
                                "0 entregas encontradas"
                            } else {
                                "Mostrando ${pagedOrders.size} de ${filteredOrders.size} (Pág. ${safeOrdersPage + 1}/$totalOrdersPages)"
                            },
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }

                    // Selector de Comercio (Dropdown Dark Theme)
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF0F172A),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { commerceDropdownExpanded = !commerceDropdownExpanded }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Storefront,
                                        contentDescription = null,
                                        tint = Color(0xFF818CF8),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = selectedCommerce,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                                Icon(
                                    imageVector = if (commerceDropdownExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = Color(0xFF94A3B8),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        DropdownMenu(
                            expanded = commerceDropdownExpanded,
                            onDismissRequest = { commerceDropdownExpanded = false },
                            modifier = Modifier
                                .background(Color(0xFF0F172A))
                                .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp))
                        ) {
                            availableBusinesses.forEach { bizName ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = bizName,
                                            color = if (bizName == selectedCommerce) Color(0xFF38BDF8) else Color.White,
                                            fontWeight = if (bizName == selectedCommerce) FontWeight.Black else FontWeight.Normal,
                                            fontSize = 12.sp
                                        )
                                    },
                                    onClick = {
                                        selectedCommerce = bizName
                                        commerceDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    // Selector de Rango de Fechas
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        PerformanceFilterChip(
                            text = "Recientes",
                            isSelected = selectedDateFilter == PerformanceDateFilter.DEFAULT_LAST_5,
                            onClick = { selectedDateFilter = PerformanceDateFilter.DEFAULT_LAST_5 },
                            modifier = Modifier.weight(1f)
                        )
                        PerformanceFilterChip(
                            text = "Hoy",
                            isSelected = selectedDateFilter == PerformanceDateFilter.TODAY,
                            onClick = { selectedDateFilter = PerformanceDateFilter.TODAY },
                            modifier = Modifier.weight(1f)
                        )
                        PerformanceFilterChip(
                            text = "Ayer",
                            isSelected = selectedDateFilter == PerformanceDateFilter.YESTERDAY,
                            onClick = { selectedDateFilter = PerformanceDateFilter.YESTERDAY },
                            modifier = Modifier.weight(1f)
                        )
                        PerformanceFilterChip(
                            text = "7 Días",
                            isSelected = selectedDateFilter == PerformanceDateFilter.LAST_7_DAYS,
                            onClick = { selectedDateFilter = PerformanceDateFilter.LAST_7_DAYS },
                            modifier = Modifier.weight(1f)
                        )
                        PerformanceFilterChip(
                            text = "Rango",
                            isSelected = selectedDateFilter == PerformanceDateFilter.CUSTOM,
                            onClick = { showCustomDateDialog = true },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    if (selectedDateFilter == PerformanceDateFilter.CUSTOM && customStartDateMs != null && customEndDateMs != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFF0B132B),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.CalendarToday, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(12.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Rango: ${shortDateFormat.format(Date(customStartDateMs!!))} — ${shortDateFormat.format(Date(customEndDateMs!!))}",
                                    fontSize = 11.sp,
                                    color = Color(0xFFCBD5E1),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            if (filteredOrders.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.SearchOff,
                                contentDescription = null,
                                tint = Color(0xFF64748B),
                                modifier = Modifier.size(40.dp)
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "No encontramos pedidos",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "No hay entregas que coincidan con los filtros seleccionados.",
                                fontSize = 12.sp,
                                color = Color(0xFF94A3B8),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                // Renderizar Comercios y sus pedidos
                ordersByCommerce.forEach { (commerceName, orders) ->
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                // Header del Comercio / Remitente
                                val isSenderGroup = commerceName.startsWith("Remitente:", ignoreCase = true) || orders.any { it.serviceType == "X_TO_Y_DELIVERY" }
                                val displayName = if (commerceName.startsWith("Remitente:", ignoreCase = true)) {
                                    commerceName.removePrefix("Remitente:").trim()
                                } else {
                                    commerceName
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Row(
                                        modifier = Modifier.weight(1f),
                                        verticalAlignment = Alignment.Top
                                    ) {
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Color(0xFF6366F1).copy(alpha = 0.2f),
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Icon(
                                                    imageVector = if (isSenderGroup) Icons.Default.LocalShipping else Icons.Default.Storefront,
                                                    contentDescription = null,
                                                    tint = Color(0xFF818CF8),
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            if (isSenderGroup) {
                                                Text(
                                                    text = "Remitente:",
                                                    color = Color(0xFF818CF8),
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                            Text(
                                                text = displayName,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Color.White,
                                                fontSize = 14.sp,
                                                maxLines = 2,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "${orders.size} ${if (orders.size == 1) "pedido" else "pedidos"}",
                                                color = Color(0xFF94A3B8),
                                                fontSize = 11.sp
                                            )
                                        }
                                    }

                                    val totalEarningsInCommerce = orders
                                        .filter { it.status.lowercase() in listOf("completed", "completado", "delivered", "entregado") }
                                        .sumOf { if (it.courierTotalEarnings > 0.0) it.courierTotalEarnings else it.gananciaRepartidor }
                                    if (totalEarningsInCommerce > 0.0) {
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = Color(0xFF10B981).copy(alpha = 0.15f)
                                        ) {
                                            Text(
                                                text = "C$ ${String.format(Locale.US, "%.2f", totalEarningsInCommerce)}",
                                                color = Color(0xFF34D399),
                                                fontWeight = FontWeight.Black,
                                                fontSize = 12.sp,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))
                                HorizontalDivider(color = Color(0xFF334155), thickness = 0.8.dp)
                                Spacer(modifier = Modifier.height(12.dp))

                                // Lista de pedidos del comercio
                                orders.forEachIndexed { index, order ->
                                    val isCompleted = order.status.lowercase() in listOf("completed", "completado", "delivered", "entregado")
                                    val isRejected = order.status.lowercase() in listOf("rejected", "rechazado", "cancelled", "cancelado")

                                    val (statusText, statusBg, statusColor) = when {
                                        isCompleted -> Triple("ENTREGADO ✓", Color(0xFF10B981).copy(alpha = 0.2f), Color(0xFF34D399))
                                        isRejected -> Triple("RECHAZADO ✕", Color(0xFFEF4444).copy(alpha = 0.2f), Color(0xFFF87171))
                                        else -> Triple(order.status.uppercase(), Color(0xFFF59E0B).copy(alpha = 0.2f), Color(0xFFFBBF24))
                                    }

                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = Color(0xFF0F172A),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            // Fila ID + Badge Estado + Ganancia
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    Surface(
                                                        shape = RoundedCornerShape(6.dp),
                                                        color = statusBg
                                                    ) {
                                                        Text(
                                                            text = statusText,
                                                            color = statusColor,
                                                            fontWeight = FontWeight.ExtraBold,
                                                            fontSize = 10.sp,
                                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                        )
                                                    }
                                                    Spacer(modifier = Modifier.width(8.dp))
                                                    // HOMOLOGACIÓN DE ID CANÓNICO (#displayOrderCode)
                                                    Text(
                                                        text = "#${order.displayOrderCode.removePrefix("#")}",
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 13.sp,
                                                        color = Color.White
                                                    )
                                                }

                                                val earning = if (order.courierTotalEarnings > 0.0) order.courierTotalEarnings else order.gananciaRepartidor
                                                Text(
                                                    text = if (isCompleted) "💰 Ganancia: C$ ${String.format(Locale.US, "%.2f", earning)}" else "C$ 0.00",
                                                    fontWeight = FontWeight.ExtraBold,
                                                    fontSize = 13.sp,
                                                    color = if (isCompleted) Color(0xFF34D399) else Color(0xFF64748B)
                                                )
                                            }

                                            Spacer(modifier = Modifier.height(10.dp))

                                            // 📍 PUNTO A: RECOGIDA
                                            Row(verticalAlignment = Alignment.Top) {
                                                Surface(
                                                    shape = CircleShape,
                                                    color = Color(0xFF6366F1).copy(alpha = 0.2f),
                                                    modifier = Modifier.size(20.dp)
                                                ) {
                                                    Box(contentAlignment = Alignment.Center) {
                                                        Text("A", color = Color(0xFF818CF8), fontSize = 10.sp, fontWeight = FontWeight.Black)
                                                    }
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(
                                                        text = "PUNTO A — RECOGIDA (COMERCIO)",
                                                        color = Color(0xFF818CF8),
                                                        fontSize = 9.sp,
                                                        fontWeight = FontWeight.ExtraBold
                                                    )
                                                    Text(
                                                        text = order.comercioNombre.ifBlank { "Comercio Principal" },
                                                        color = Color.White,
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        maxLines = 2,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                    if (order.comercioDireccion.isNotBlank()) {
                                                        Text(
                                                            text = order.comercioDireccion,
                                                            color = Color(0xFF94A3B8),
                                                            fontSize = 11.sp,
                                                            maxLines = 2,
                                                            overflow = TextOverflow.Ellipsis
                                                        )
                                                    }
                                                }
                                            }

                                            // Conector vertical de ruta
                                            Box(
                                                modifier = Modifier
                                                    .padding(start = 9.dp, top = 2.dp, bottom = 2.dp)
                                                    .width(2.dp)
                                                    .height(12.dp)
                                                    .background(Color(0xFF334155))
                                            )

                                            // 📍 PUNTO B: ENTREGA
                                            Row(verticalAlignment = Alignment.Top) {
                                                Surface(
                                                    shape = CircleShape,
                                                    color = Color(0xFF10B981).copy(alpha = 0.2f),
                                                    modifier = Modifier.size(20.dp)
                                                ) {
                                                    Box(contentAlignment = Alignment.Center) {
                                                        Text("B", color = Color(0xFF34D399), fontSize = 10.sp, fontWeight = FontWeight.Black)
                                                    }
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(
                                                        text = "PUNTO B — ENTREGA (CLIENTE)",
                                                        color = Color(0xFF34D399),
                                                        fontSize = 9.sp,
                                                        fontWeight = FontWeight.ExtraBold
                                                    )
                                                    val clienteTitle = if (order.recipientName.isNotBlank()) order.recipientName else "Destino Cliente"
                                                    Text(
                                                        text = clienteTitle,
                                                        color = Color.White,
                                                        fontSize = 12.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        maxLines = 2,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                    Text(
                                                        text = order.clienteDireccion.ifBlank { "Dirección no especificada" },
                                                        color = Color(0xFF94A3B8),
                                                        fontSize = 11.sp,
                                                        maxLines = 2,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    if (index < orders.size - 1) {
                                        Spacer(modifier = Modifier.height(10.dp))
                                    }
                                }
                            }
                        }
                    }
                }

                if (totalOrdersPages > 1) {
                    item {
                        DarkPaginationBar(
                            currentPage = safeOrdersPage,
                            totalPages = totalOrdersPages,
                            onPageChange = { ordersPage = it }
                        )
                    }
                }
            }

            // ── 4. MISIONES ACTIVAS DE LA SEMANA ─────────────────────────────
            item {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "MISIONES ACTIVAS DE LA SEMANA",
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    color = Color(0xFF818CF8),
                    letterSpacing = 1.sp
                )
            }

            if (rewardState.activeMissions.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
                    ) {
                        Text(
                            text = "No hay misiones activas por el momento.",
                            modifier = Modifier.padding(16.dp),
                            fontSize = 12.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }
            } else {
                items(rewardState.activeMissions) { mission ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (mission.isCompleted) Color(0xFF10B981).copy(alpha = 0.5f) else Color(0xFF334155)
                        )
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = mission.title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = Color.White
                                )
                                Text(
                                    text = "+ C$ ${mission.bonusRewardAmount}",
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF34D399),
                                    fontSize = 13.sp
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = mission.description,
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            LinearProgressIndicator(
                                progress = {
                                    (mission.currentOrderCount.toFloat() / mission.requiredOrderCount.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f)
                                },
                                modifier = Modifier.fillMaxWidth(),
                                color = if (mission.isCompleted) Color(0xFF10B981) else Color(0xFF6366F1),
                                trackColor = Color(0xFF0F172A)
                            )
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }

    // Diálogo Selector de Rango Personalizado
    if (showCustomDateDialog) {
        var startYear by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.YEAR)) }
        var startMonth by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.MONTH)) }
        var startDay by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.DAY_OF_MONTH)) }

        var endYear by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.YEAR)) }
        var endMonth by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.MONTH)) }
        var endDay by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.DAY_OF_MONTH)) }

        AlertDialog(
            onDismissRequest = { showCustomDateDialog = false },
            title = { Text("Filtrar por Rango de Fechas", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White) },
            containerColor = Color(0xFF0F172A),
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Selecciona el período para consultar el historial de entregas:", fontSize = 12.sp, color = Color(0xFF94A3B8))

                    Button(
                        onClick = {
                            DatePickerDialog(context, { _, y, m, d ->
                                startYear = y; startMonth = m; startDay = d
                            }, startYear, startMonth, startDay).show()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
                    ) {
                        Text("Desde: $startDay/${startMonth + 1}/$startYear", fontSize = 13.sp, color = Color.White)
                    }

                    Button(
                        onClick = {
                            DatePickerDialog(context, { _, y, m, d ->
                                endYear = y; endMonth = m; endDay = d
                            }, endYear, endMonth, endDay).show()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
                    ) {
                        Text("Hasta: $endDay/${endMonth + 1}/$endYear", fontSize = 13.sp, color = Color.White)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val cStart = Calendar.getInstance().apply {
                            set(startYear, startMonth, startDay, 0, 0, 0)
                            set(Calendar.MILLISECOND, 0)
                        }
                        val cEnd = Calendar.getInstance().apply {
                            set(endYear, endMonth, endDay, 23, 59, 59)
                            set(Calendar.MILLISECOND, 999)
                        }
                        customStartDateMs = cStart.timeInMillis
                        customEndDateMs = cEnd.timeInMillis
                        selectedDateFilter = PerformanceDateFilter.CUSTOM
                        showCustomDateDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF38BDF8))
                ) {
                    Text("Aplicar Rango", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCustomDateDialog = false }) {
                    Text("Cancelar", color = Color(0xFF94A3B8))
                }
            }
        )
    }
}

@Composable
private fun DarkMetricCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.defaultMinSize(minHeight = 84.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
    ) {
        Column(
            modifier = Modifier
                .padding(14.dp)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.Center
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF94A3B8)
                )
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Color(0xFF818CF8),
                    modifier = Modifier.size(16.dp)
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = value,
                fontSize = 16.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
        }
    }
}

@Composable
private fun RatingMetricCard(
    averageRating: Double,
    ratingCount: Int,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.defaultMinSize(minHeight = 84.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
    ) {
        Column(
            modifier = Modifier
                .padding(14.dp)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.Center
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Calificación",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF94A3B8)
                )
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = null,
                    tint = Color(0xFFFBBF24),
                    modifier = Modifier.size(16.dp)
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            if (ratingCount > 0 || averageRating > 0.0) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "⭐ ${String.format(Locale.US, "%.1f", averageRating)}",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                    Text(
                        text = "($ratingCount)",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8),
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                // Row de 5 estrellas representativas del promedio
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val filledStars = kotlin.math.round(averageRating).toInt().coerceIn(0, 5)
                    for (i in 1..5) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            tint = if (i <= filledStars) Color(0xFFFBBF24) else Color(0xFF475569),
                            modifier = Modifier.size(11.dp)
                        )
                    }
                }
            } else {
                Text(
                    text = "Sin valoraciones",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF94A3B8)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "0 valoraciones",
                    fontSize = 10.sp,
                    color = Color(0xFF64748B)
                )
            }
        }
    }
}

@Composable
private fun PerformanceFilterChip(
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .height(32.dp)
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) Color(0xFF38BDF8) else Color(0xFF0F172A),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) Color(0xFF38BDF8) else Color(0xFF1E293B)
        )
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            Text(
                text = text,
                fontSize = 10.sp,
                fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
                color = if (isSelected) Color(0xFF0F172A) else Color(0xFF94A3B8)
            )
        }
    }
}

@Composable
private fun DarkPaginationBar(
    currentPage: Int,
    totalPages: Int,
    onPageChange: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    if (totalPages <= 1) return
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Botón Anterior
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = if (currentPage > 0) Color(0xFF1E293B) else Color(0xFF0F172A),
            border = androidx.compose.foundation.BorderStroke(1.dp, if (currentPage > 0) Color(0xFF334155) else Color(0xFF1E293B)),
            modifier = Modifier.clickable(enabled = currentPage > 0) {
                onPageChange(currentPage - 1)
            }
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.KeyboardArrowLeft,
                    contentDescription = "Anterior",
                    tint = if (currentPage > 0) Color(0xFF38BDF8) else Color(0xFF475569),
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "Anterior",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (currentPage > 0) Color(0xFF38BDF8) else Color(0xFF475569)
                )
            }
        }

        // Indicador de Página
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = Color(0xFF0F172A),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
        ) {
            Text(
                text = "Página ${currentPage + 1} de $totalPages",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFE2E8F0),
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
            )
        }

        // Botón Siguiente
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = if (currentPage < totalPages - 1) Color(0xFF1E293B) else Color(0xFF0F172A),
            border = androidx.compose.foundation.BorderStroke(1.dp, if (currentPage < totalPages - 1) Color(0xFF334155) else Color(0xFF1E293B)),
            modifier = Modifier.clickable(enabled = currentPage < totalPages - 1) {
                onPageChange(currentPage + 1)
            }
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Siguiente",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (currentPage < totalPages - 1) Color(0xFF38BDF8) else Color(0xFF475569)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    imageVector = Icons.Default.KeyboardArrowRight,
                    contentDescription = "Siguiente",
                    tint = if (currentPage < totalPages - 1) Color(0xFF38BDF8) else Color(0xFF475569),
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
