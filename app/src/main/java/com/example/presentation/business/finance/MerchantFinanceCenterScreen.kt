package com.example.presentation.business.finance

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.domain.model.finance.*
import com.google.firebase.Timestamp
import java.text.SimpleDateFormat
import java.util.*

private val mfcBg = Color(0xFFF8FAFC)
private val mfcDark = Color(0xFF0F172A)
private val mfcCardBg = Color.White
private val mfcBlue = Color(0xFF2563EB)
private val mfcGreen = Color(0xFF10B981)
private val mfcAmber = Color(0xFFF59E0B)
private val mfcRose = Color(0xFFEF4444)
private val mfcPurple = Color(0xFF8B5CF6)
private val mfcBorder = Color(0xFFE2E8F0)

fun formatNio(amount: Double): String {
    return "C$ ${"%,.2f".format(Locale.US, amount)}"
}

fun formatTimestamp(ts: Timestamp?): String {
    if (ts == null) return "—"
    val sdf = SimpleDateFormat("dd MMM, HH:mm", Locale("es", "NI"))
    return sdf.format(ts.toDate())
}

fun formatTimestampDateOnly(ts: Timestamp?): String {
    if (ts == null) return "—"
    val sdf = SimpleDateFormat("dd MMM yyyy", Locale("es", "NI"))
    return sdf.format(ts.toDate())
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MerchantFinanceCenterScreen(
    businessId: String,
    onNavigateBack: () -> Unit,
    initialSettlementId: String? = null,
    viewModel: MerchantFinanceViewModel = remember { MerchantFinanceViewModel() }
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(businessId) {
        viewModel.startFinanceCenter(businessId, initialSettlementId)
    }

    Scaffold(
        topBar = {
            Surface(
                color = Color.White,
                shadowElevation = 2.dp
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = onNavigateBack) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Regresar", tint = mfcDark)
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Finanzas", fontWeight = FontWeight.Black, fontSize = 18.sp, color = mfcDark)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFFDCFCE7),
                                        border = BorderStroke(1.dp, Color(0xFF86EFAC))
                                    ) {
                                        Text(
                                            "✓ Inmutable",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF15803D),
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                                Text(
                                    "Sucursal Principal · Estado contable en vivo",
                                    fontSize = 11.sp,
                                    color = Color(0xFF64748B)
                                )
                            }
                        }

                        var showExportMenu by remember { mutableStateOf(false) }
                        Box {
                            FilledTonalButton(
                                onClick = { showExportMenu = true },
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = Color(0xFFEFF6FF),
                                    contentColor = Color(0xFF2563EB)
                                ),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Exportar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }

                            DropdownMenu(
                                expanded = showExportMenu,
                                onDismissRequest = { showExportMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("📄 Descargar / Compartir PDF", fontSize = 13.sp, fontWeight = FontWeight.Medium) },
                                    onClick = {
                                        showExportMenu = false
                                        com.example.domain.engine.finance.FinancialReportGenerator.exportPdfReport(
                                            context = context,
                                            restaurantName = "Mi Comercio",
                                            summary = uiState.summary,
                                            events = uiState.events
                                        )
                                    }
                                )
                                DropdownMenuItem(
                                    text = { Text("📊 Descargar / Compartir CSV", fontSize = 13.sp, fontWeight = FontWeight.Medium) },
                                    onClick = {
                                        showExportMenu = false
                                        com.example.domain.engine.finance.FinancialReportGenerator.exportCsvReport(
                                            context = context,
                                            restaurantName = "Mi Comercio",
                                            summary = uiState.summary,
                                            events = uiState.events
                                        )
                                    }
                                )
                            }
                        }
                    }

                    // Sub-tabs de navegación canónica
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FinanceSubTab.values().forEach { tab ->
                            val isSelected = uiState.activeSubTab == tab
                            val title = when (tab) {
                                FinanceSubTab.RESUMEN -> "Resumen"
                                FinanceSubTab.TRANSACTIONS -> "Ventas"
                                FinanceSubTab.SETTLEMENTS -> "Liquidaciones"
                            }
                            val icon = when (tab) {
                                FinanceSubTab.RESUMEN -> Icons.Default.TrendingUp
                                FinanceSubTab.TRANSACTIONS -> Icons.Default.ReceiptLong
                                FinanceSubTab.SETTLEMENTS -> Icons.Default.AccountBalance
                            }
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) mfcBlue else Color(0xFFF1F5F9),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { viewModel.selectTab(tab) }
                            ) {
                                Row(
                                    modifier = Modifier.padding(vertical = 8.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        icon,
                                        contentDescription = null,
                                        tint = if (isSelected) Color.White else Color(0xFF64748B),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        title,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                                        color = if (isSelected) Color.White else Color(0xFF475569)
                                    )
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        },
        containerColor = mfcBg
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {

                // Banner de Feedback de Acción
                uiState.actionFeedback?.let { msg ->
                    Surface(
                        color = if (uiState.actionFeedbackType == "SUCCESS") Color(0xFFDCFCE7) else Color(0xFFFEE2E2),
                        border = BorderStroke(1.dp, if (uiState.actionFeedbackType == "SUCCESS") Color(0xFF86EFAC) else Color(0xFFFCA5A5)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                msg,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (uiState.actionFeedbackType == "SUCCESS") Color(0xFF166534) else Color(0xFF991B1B),
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(
                                onClick = { viewModel.clearFeedback() },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                // Selector de Filtros Temporales (Solo en Resumen y Transacciones)
                if (uiState.activeSubTab != FinanceSubTab.SETTLEMENTS) {
                    MfcFilterChipRow(
                        activeFilter = uiState.activeFilter,
                        onSelectFilter = { viewModel.setFilter(it) }
                    )
                }

                // Contenido dinámico según el SubTab activo
                when (uiState.activeSubTab) {
                    FinanceSubTab.RESUMEN -> {
                        FinanceSummaryTabContent(summary = uiState.summary)
                    }
                    FinanceSubTab.TRANSACTIONS -> {
                        FinanceTransactionsTabContent(
                            events = uiState.events,
                            isLoading = uiState.isLoadingEvents,
                            onSelectEvent = { viewModel.selectOrderEvent(it) }
                        )
                    }
                    FinanceSubTab.SETTLEMENTS -> {
                        FinanceSettlementsTabContent(
                            settlements = uiState.settlements,
                            pendingSettlementNio = uiState.summary.pendingSettlementNio,
                            isLoading = uiState.isLoadingSettlements,
                            currentPage = uiState.currentPage,
                            hasNextPage = uiState.hasNextPage,
                            hasPrevPage = uiState.hasPrevPage,
                            onNextPage = { viewModel.loadNextSettlementsPage() },
                            onPrevPage = { viewModel.loadPrevSettlementsPage() },
                            onSelectSettlement = { viewModel.selectSettlement(it) }
                        )
                    }
                }
            }

            // Modal: Detalle de Liquidación
            uiState.selectedSettlement?.let { settlement ->
                SettlementDetailModal(
                    settlement = settlement,
                    isSubmitting = uiState.isSubmittingAction,
                    onDismiss = { viewModel.selectSettlement(null) },
                    onConfirm = { notes -> viewModel.confirmSettlement(settlement.settlementId, notes) },
                    onDispute = { reason, diff, desc ->
                        viewModel.disputeSettlement(settlement.settlementId, reason, diff, desc)
                    },
                    onOpenReceipt = { url ->
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            // URL inválida o no compatible
                        }
                    }
                )
            }

            // Modal: Detalle Financiero del Pedido ("¿De dónde salió este dinero?")
            uiState.selectedOrderEvent?.let { ev ->
                OrderFinancialBreakdownModal(
                    event = ev,
                    onDismiss = { viewModel.selectOrderEvent(null) }
                )
            }
        }
    }
}

// ─── FILTROS TEMPORALES ───
@Composable
fun MfcFilterChipRow(
    activeFilter: FinancialFilter,
    onSelectFilter: (FinancialFilter) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        listOf(
            FinancialFilter.TODAY to "Hoy",
            FinancialFilter.YESTERDAY to "Ayer",
            FinancialFilter.THIS_WEEK to "Semana",
            FinancialFilter.THIS_MONTH to "Mes"
        ).forEach { (f, label) ->
            val isSel = activeFilter == f
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = if (isSel) mfcBlue else Color.White,
                border = BorderStroke(1.dp, if (isSel) mfcBlue else mfcBorder),
                modifier = Modifier
                    .weight(1f)
                    .clickable { onSelectFilter(f) }
            ) {
                Text(
                    label,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isSel) Color.White else Color(0xFF475569),
                    modifier = Modifier.padding(vertical = 6.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
    }
}

// ─── TAB 1: RESUMEN GENERAL ───
@Composable
fun FinanceSummaryTabContent(summary: FinancialSummary) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            // Saldo pendiente de liquidación (Hero Card)
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF1E293B),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("SALDO PENDIENTE DE LIQUIDACIÓN", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color(0xFF94A3B8), letterSpacing = 0.5.sp)
                        Icon(Icons.Default.HourglassBottom, contentDescription = null, tint = mfcAmber, modifier = Modifier.size(18.dp))
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        formatNio(summary.pendingSettlementNio),
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF34D399),
                        fontFamily = FontFamily.Monospace
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Neto acumulado que se consolidará en el próximo corte formal.",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8)
                    )
                }
            }
        }

        item {
            // 4 Tarjetas de Métricas Clave
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                FinancialMetricCard(
                    title = "Ventas Brutas",
                    value = formatNio(summary.revenueNio),
                    subtitle = "${summary.ordersCount} pedidos",
                    color = Color(0xFF1E3A8A),
                    modifier = Modifier.weight(1f)
                )
                FinancialMetricCard(
                    title = "Neto Comercio",
                    value = formatNio(summary.netRevenueNio),
                    subtitle = "Ingreso tras deducción",
                    color = Color(0xFF059669),
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                FinancialMetricCard(
                    title = "Comisión BSD (15%)",
                    value = "- ${formatNio(summary.platformFeesNio)}",
                    subtitle = "Tarifa de servicio",
                    color = Color(0xFFDC2626),
                    modifier = Modifier.weight(1f)
                )
                FinancialMetricCard(
                    title = "Ticket Promedio",
                    value = formatNio(summary.averageTicketNio),
                    subtitle = "Por pedido",
                    color = Color(0xFF475569),
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            // Banner de Integridad & Trazabilidad
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFFF1F5F9),
                border = BorderStroke(1.dp, mfcBorder),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Shield, contentDescription = null, tint = mfcBlue, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("Ledger Inmutable BSD-FINANCE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = mfcDark)
                        Text(
                            "Los registros proceden directamente del ledger general y de documentos agregados actualizados en tiempo real por transacciones atómicas.",
                            fontSize = 10.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FinancialMetricCard(
    title: String,
    value: String,
    subtitle: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 1.dp,
        border = BorderStroke(1.dp, mfcBorder),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(title, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
            Spacer(modifier = Modifier.height(4.dp))
            Text(value, fontSize = 16.sp, fontWeight = FontWeight.Black, color = color, fontFamily = FontFamily.Monospace)
            Spacer(modifier = Modifier.height(2.dp))
            Text(subtitle, fontSize = 10.sp, color = Color(0xFF94A3B8))
        }
    }
}

// ─── TAB 2: VENTAS / TRANSACCIONES ───
@Composable
fun FinanceTransactionsTabContent(
    events: List<FinancialEvent>,
    isLoading: Boolean,
    onSelectEvent: (FinancialEvent) -> Unit
) {
    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = mfcBlue)
        }
        return
    }

    if (events.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.ReceiptLong, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(48.dp))
                Spacer(modifier = Modifier.height(8.dp))
                Text("Sin movimientos en este período", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF64748B))
                Text("Las órdenes completadas generarán eventos aquí automáticamente.", fontSize = 11.sp, color = Color(0xFF94A3B8))
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(events) { ev ->
            val isCredit = ev.direction == FinancialDirection.CREDIT
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = Color.White,
                border = BorderStroke(1.dp, mfcBorder),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSelectEvent(ev) }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Surface(
                            shape = CircleShape,
                            color = if (isCredit) Color(0xFFDCFCE7) else Color(0xFFFEE2E2),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    if (isCredit) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                                    contentDescription = null,
                                    tint = if (isCredit) Color(0xFF16A34A) else Color(0xFFDC2626),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                ev.description.ifBlank { ev.eventType.label },
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = mfcDark,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                "${formatTimestamp(ev.createdAt)} · #${ev.displayOrderCode}",
                                fontSize = 10.sp,
                                color = Color(0xFF64748B)
                            )
                        }
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            "${if (isCredit) "+" else "-"}${formatNio(ev.amountNio)}",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace,
                            color = if (isCredit) Color(0xFF16A34A) else Color(0xFFDC2626)
                        )
                        Text(
                            "Ver detalle ➔",
                            fontSize = 9.sp,
                            color = mfcBlue,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

// ─── TAB 3: LIQUIDACIONES (SETTLEMENT ENGINE) ───
@Composable
fun FinanceSettlementsTabContent(
    settlements: List<MerchantSettlement>,
    pendingSettlementNio: Double,
    isLoading: Boolean,
    currentPage: Int,
    hasNextPage: Boolean,
    hasPrevPage: Boolean,
    onNextPage: () -> Unit,
    onPrevPage: () -> Unit,
    onSelectSettlement: (MerchantSettlement) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            // Tarjeta de Saldo Pendiente del Período en Curso
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFF1E293B),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("CORTE EN CURSO", fontSize = 9.sp, fontWeight = FontWeight.Black, color = Color(0xFF94A3B8), letterSpacing = 0.5.sp)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(formatNio(pendingSettlementNio), fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color(0xFF34D399), fontFamily = FontFamily.Monospace)
                        Text("Neto acumulado a liquidar", fontSize = 10.sp, color = Color(0xFF94A3B8))
                    }
                    Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(28.dp))
                }
            }
        }

        if (isLoading) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = mfcBlue)
                }
            }
        } else if (settlements.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.HourglassEmpty, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Sin liquidaciones formalizadas", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF64748B))
                        Text("Aparecerán aquí cuando Administración realice el primer corte.", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    }
                }
            }
        } else {
            items(settlements) { s ->
                val isActionRequired = s.isAwaitingConfirmation
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    border = BorderStroke(if (isActionRequired) 1.5.dp else 1.dp, if (isActionRequired) Color(0xFF818CF8) else mfcBorder),
                    shadowElevation = if (isActionRequired) 2.dp else 0.dp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectSettlement(s) }
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "#${s.settlementId.takeLast(8).uppercase()}",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace,
                                color = mfcDark
                            )
                            SettlementStatusBadge(status = s.status, isFrozen = s.isFrozen)
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("Período Liquidado", fontSize = 10.sp, color = Color(0xFF64748B))
                                Text(
                                    "${formatTimestampDateOnly(s.periodStart)} - ${formatTimestampDateOnly(s.periodEnd)}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = mfcDark
                                )
                                Text("${s.ordersCount} órdenes", fontSize = 9.sp, color = Color(0xFF94A3B8))
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("Neto Pagadero", fontSize = 10.sp, color = Color(0xFF64748B))
                                Text(
                                    formatNio(s.netPayableNio),
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = FontFamily.Monospace,
                                    color = Color(0xFF059669)
                                )
                            }
                        }

                        if (isActionRequired) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = Color(0xFFEEF2FF),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        "🔔 Transferencia reportada · Requiere tu confirmación",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF4338CA)
                                    )
                                    Text("Revisar ➔", fontSize = 10.sp, fontWeight = FontWeight.Black, color = mfcBlue)
                                }
                            }
                        }
                    }
                }
            }

            item {
                // Controles de Paginación Cursor
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = onPrevPage,
                        enabled = hasPrevPage && !isLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
                    ) {
                        Text("← Anterior", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    Text("Página $currentPage", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))

                    Button(
                        onClick = onNextPage,
                        enabled = hasNextPage && !isLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF334155))
                    ) {
                        Text("Siguiente →", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// ─── BADGE DE ESTADO DE LIQUIDACIÓN ───
@Composable
fun SettlementStatusBadge(status: SettlementStatus, isFrozen: Boolean) {
    val (bgColor, textColor, text) = when {
        isFrozen || status == SettlementStatus.CLOSED -> Triple(Color(0xFFE2E8F0), Color(0xFF334155), "Cerrada / Congelada")
        status == SettlementStatus.AWAITING_CONFIRMATION || status == SettlementStatus.PAID -> Triple(Color(0xFFEDE9FE), Color(0xFF6D28D9), "Pago Registrado")
        status == SettlementStatus.PREPARED -> Triple(Color(0xFFDBEAFE), Color(0xFF1D4ED8), "Preparada")
        status == SettlementStatus.AWAITING_PAYMENT -> Triple(Color(0xFFFEF3C7), Color(0xFFB45309), "En Proceso de Pago")
        status == SettlementStatus.CONFIRMED -> Triple(Color(0xFFDCFCE7), Color(0xFF15803D), "Confirmada")
        status == SettlementStatus.DISPUTED -> Triple(Color(0xFFFEE2E2), Color(0xFFB91C1C), "En Disputa")
        status == SettlementStatus.UNDER_REVIEW -> Triple(Color(0xFFFFEDD5), Color(0xFFC2410C), "En Revisión")
        status == SettlementStatus.RESOLVED -> Triple(Color(0xFFE0E7FF), Color(0xFF3730A3), "Disputa Resuelta")
        else -> Triple(Color(0xFFF1F5F9), Color(0xFF64748B), status.label)
    }

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = bgColor
    ) {
        Text(
            text,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = textColor,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
        )
    }
}

// ─── MODAL: DETALLE DE VENTA ("¿De dónde salió este dinero?") ───
@Composable
fun OrderFinancialBreakdownModal(
    event: FinancialEvent,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .wrapContentHeight()
                .clip(RoundedCornerShape(24.dp)),
            color = Color.White
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Detalle de Venta", fontSize = 16.sp, fontWeight = FontWeight.Black, color = mfcDark)
                        Text("#${event.displayOrderCode}", fontSize = 13.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color.Gray)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))
                HorizontalDivider(color = mfcBorder)
                Spacer(modifier = Modifier.height(14.dp))

                // Desglose Canónico Limpio para Comercio (BSD-MERCHANT-FINANCE-MOBILE-SALES-VISIBILITY-REFINEMENT-001)
                BreakdownRow("Productos / Venta", formatNio(event.merchantGrossSalesCents / 100.0))
                if (event.discountCents > 0) {
                    BreakdownRow("Descuento aplicado", "- ${formatNio(event.discountNio)}", isDeduction = true)
                }

                BreakdownRow("Comisión BlueSystem (${event.commissionPercentageText})", "- ${formatNio(event.commissionNio)}", isDeduction = true)

                Spacer(modifier = Modifier.height(14.dp))
                HorizontalDivider(color = mfcBorder)
                Spacer(modifier = Modifier.height(14.dp))

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFDCFCE7),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Neto Comercio", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFF166534))
                        Text(formatNio(event.netPayoutNio), fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color(0xFF166534), fontFamily = FontFamily.Monospace)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
                ) {
                    Text("Cerrar Detalle", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun BreakdownRow(
    label: String,
    value: String,
    isDeduction: Boolean = false,
    isBold: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            fontSize = 12.sp,
            color = if (isBold) mfcDark else Color(0xFF64748B),
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal
        )
        Text(
            value,
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
            color = if (isDeduction) Color(0xFFDC2626) else if (isBold) mfcDark else Color(0xFF334155),
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal
        )
    }
}

// ─── MODAL: DETALLE DE LIQUIDACIÓN, COMPROBANTE, CONFIRMAR Y DISPUTAR ───
@Composable
fun SettlementDetailModal(
    settlement: MerchantSettlement,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (notes: String) -> Unit,
    onDispute: (reason: String, differenceCents: Long, description: String) -> Unit,
    onOpenReceipt: (url: String) -> Unit
) {
    var isConfirmingMode by remember { mutableStateOf(false) }
    var isDisputingMode by remember { mutableStateOf(false) }

    var confirmNotes by remember { mutableStateOf("") }
    var disputeReason by remember { mutableStateOf("TRANSFER_MISMATCH") }
    var disputeDiffText by remember { mutableStateOf("") }
    var disputeDesc by remember { mutableStateOf("") }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .wrapContentHeight()
                .clip(RoundedCornerShape(24.dp)),
            color = Color.White
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Liquidación Comercial", fontSize = 16.sp, fontWeight = FontWeight.Black, color = mfcDark)
                        Text("#${settlement.settlementId.takeLast(10).uppercase()}", fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = Color(0xFF64748B))
                    }
                    SettlementStatusBadge(status = settlement.status, isFrozen = settlement.isFrozen)
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = mfcBorder)
                Spacer(modifier = Modifier.height(12.dp))

                if (isConfirmingMode) {
                    // Vista de Confirmación
                    Text("Confirmar Recepción de Fondos", fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color(0xFF059669))
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "Al confirmar, declaras haber recibido la transferencia de ${formatNio(settlement.netPayableNio)}. El período quedará cerrado formalmente y el registro se congelará para auditoría.",
                        fontSize = 11.sp,
                        color = Color(0xFF64748B)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = confirmNotes,
                        onValueChange = { confirmNotes = it },
                        label = { Text("Notas u observaciones (opcional)") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { isConfirmingMode = false },
                            modifier = Modifier.weight(1f),
                            enabled = !isSubmitting
                        ) {
                            Text("Atrás")
                        }
                        Button(
                            onClick = { onConfirm(confirmNotes) },
                            modifier = Modifier.weight(1f),
                            enabled = !isSubmitting,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                        ) {
                            if (isSubmitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                            } else {
                                Text("Confirmar Cierre", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else if (isDisputingMode) {
                    // Vista de Disputa
                    Text("Reportar Discrepancia / Disputar", fontSize = 14.sp, fontWeight = FontWeight.Black, color = Color(0xFFDC2626))
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "Esta acción abre una disputa formal y bloquea el cierre del período hasta revisión administrativa.",
                        fontSize = 11.sp,
                        color = Color(0xFF64748B)
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = disputeDiffText,
                        onValueChange = { disputeDiffText = it },
                        label = { Text("Diferencia reclamada (C$ Córdobas)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = disputeDesc,
                        onValueChange = { disputeDesc = it },
                        label = { Text("Descripción detallada de la discrepancia") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { isDisputingMode = false },
                            modifier = Modifier.weight(1f),
                            enabled = !isSubmitting
                        ) {
                            Text("Atrás")
                        }
                        Button(
                            onClick = {
                                val diffCents = Math.round((disputeDiffText.toDoubleOrNull() ?: 0.0) * 100)
                                onDispute(disputeReason, diffCents, disputeDesc)
                            },
                            modifier = Modifier.weight(1f),
                            enabled = !isSubmitting && disputeDesc.isNotBlank(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                        ) {
                            if (isSubmitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                            } else {
                                Text("Abrir Disputa", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else {
                    // Vista Normal de Detalle
                    BreakdownRow("Período", "${formatTimestampDateOnly(settlement.periodStart)} al ${formatTimestampDateOnly(settlement.periodEnd)}")
                    BreakdownRow("Ventas Brutas", formatNio(settlement.grossSalesNio))
                    BreakdownRow("Comisión Plataforma", "- ${formatNio(settlement.platformFeesNio)}", isDeduction = true)
                    BreakdownRow("Ajustes", formatNio(settlement.adjustmentsNio))
                    BreakdownRow("Neto a Transferir", formatNio(settlement.netPayableNio), isBold = true)

                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, mfcBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Datos de la Transferencia Bancaria", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = mfcDark)
                            BreakdownRow("Banco", settlement.bankName ?: "Pendiente")
                            BreakdownRow("Referencia", settlement.transferReference ?: "—")
                            BreakdownRow("Fecha Depósito", formatTimestamp(settlement.paymentDate))
                            if (settlement.paidNio != null) {
                                BreakdownRow("Monto Depositado", formatNio(settlement.paidNio!!), isBold = true)
                            }
                        }
                    }

                    // Comprobante adjunto si existe
                    if (!settlement.receiptUrl.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedButton(
                            onClick = { onOpenReceipt(settlement.receiptUrl!!) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Receipt, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Ver Comprobante de Depósito", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    // Botones de acción si requiere confirmación
                    if (settlement.isAwaitingConfirmation) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { isConfirmingMode = true },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Confirmar Recepción Conforme", fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedButton(
                            onClick = { isDisputingMode = true },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626))
                        ) {
                            Icon(Icons.Default.ReportProblem, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Reportar Discrepancia / Disputar", fontWeight = FontWeight.Bold)
                        }
                    } else if (settlement.isFrozen) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFF1F5F9),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                "🔒 Período cerrado y congelado para auditoría contable inmutable.",
                                fontSize = 10.sp,
                                color = Color(0xFF475569),
                                modifier = Modifier.padding(10.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    TextButton(
                        onClick = onDismiss,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Cerrar", color = Color.Gray, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
