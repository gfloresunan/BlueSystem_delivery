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
import com.example.CourierFinancialItem
import com.example.CourierFinancesState
import com.example.FinanceDateFilter
import com.example.domain.engine.courier.CourierFinanceCalculator
import java.text.SimpleDateFormat
import java.util.*

/**
 * Pantalla Canónica de Finanzas del Motorizado por Línea de Negocio (Actividad #13).
 *
 * Muestra el desglose financiero transparente entre:
 * 🏪 Delivery Comercio (Comercio -> Cliente)
 * 📦 Delivery Punto A -> Punto B (Encomiendas X->Y)
 * 💰 Total Acumulado (Comercio + X->Y)
 */
@Composable
fun CourierFinancesScreen(
    financesState: CourierFinancesState,
    onFilterChanged: (FinanceDateFilter, Long?, Long?) -> Unit,
    onNavigateToClosure: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var showCustomDateDialog by remember { mutableStateOf(false) }

    val dateFormat = remember { SimpleDateFormat("dd/MM/yyyy hh:mm a", Locale.getDefault()) }
    val shortDate = remember { SimpleDateFormat("dd MMM yyyy", Locale.getDefault()) }

    val (startTs, endTs) = remember(financesState.selectedFilter, financesState.customStartDateMs, financesState.customEndDateMs) {
        CourierFinanceCalculator.calculateFilterBounds(
            financesState.selectedFilter,
            financesState.customStartDateMs,
            financesState.customEndDateMs
        )
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF020617))
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // ── 1. HEADER & TITULO ──────────────────────────────────────────────
        item {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.weight(1f, fill = false)) {
                        Text(
                            text = "💰 MIS INGRESOS",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            letterSpacing = 0.5.sp,
                            maxLines = 1,
                            softWrap = false
                        )
                        Text(
                            text = "Finanzas consolidadas por línea de negocio",
                            fontSize = 12.sp,
                            color = Color(0xFF94A3B8),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = Color(0xFF0F172A),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Verified, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("SSOT", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color(0xFF38BDF8), maxLines = 1, softWrap = false)
                        }
                    }
                }
            }
        }

        // ── 1.1 ALERTA DE CIERRE PENDIENTE DE DÍA ANTERIOR ─────────────────
        val notice = financesState.overduePendingClosure
        if (notice != null && notice.hasOverdue) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF450A0A)),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFEF4444))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("⚠️", fontSize = 20.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "CIERRE PENDIENTE",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFFCA5A5)
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Tienes un depósito pendiente correspondiente al: ${notice.overdueDate.ifBlank { "Día anterior" }}.",
                            fontSize = 12.sp,
                            color = Color(0xFFFEE2E2),
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Monto pendiente a liquidar: C$ ${String.format(Locale.US, "%.2f", notice.outstandingAmount)}",
                            fontSize = 13.sp,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = onNavigateToClosure,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                text = "IR A CIERRE Y DEPÓSITO →",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }

        // ── 2. SELECTOR DE FILTROS TEMPORALES ────────────────────────────────
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    FilterChipButton(
                        text = "Hoy",
                        isSelected = financesState.selectedFilter == FinanceDateFilter.TODAY,
                        onClick = { onFilterChanged(FinanceDateFilter.TODAY, null, null) },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChipButton(
                        text = "Ayer",
                        isSelected = financesState.selectedFilter == FinanceDateFilter.YESTERDAY,
                        onClick = { onFilterChanged(FinanceDateFilter.YESTERDAY, null, null) },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChipButton(
                        text = "Semana",
                        isSelected = financesState.selectedFilter == FinanceDateFilter.THIS_WEEK,
                        onClick = { onFilterChanged(FinanceDateFilter.THIS_WEEK, null, null) },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChipButton(
                        text = "Mes",
                        isSelected = financesState.selectedFilter == FinanceDateFilter.THIS_MONTH,
                        onClick = { onFilterChanged(FinanceDateFilter.THIS_MONTH, null, null) },
                        modifier = Modifier.weight(1f)
                    )
                    FilterChipButton(
                        text = "Rango",
                        isSelected = financesState.selectedFilter == FinanceDateFilter.CUSTOM,
                        onClick = { showCustomDateDialog = true },
                        modifier = Modifier.weight(1f)
                    )
                }

                // Rango activo label
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF0B132B),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CalendarToday, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "${shortDate.format(Date(startTs))} — ${shortDate.format(Date(endTs))}",
                                fontSize = 11.sp,
                                color = Color(0xFFCBD5E1),
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Text(
                            text = "${financesState.totalGeneralCount} entregas",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF38BDF8)
                        )
                    }
                }
            }
        }

        // ── 3. CARDS: TOTAL GANANCIAS & EFECTIVO RECIBIDO ────────────────────
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Card 1: Mis Ganancias Realizadas (Desglose Enterprise: KM + Bonos + Propinas)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(
                        1.5.dp,
                        Brush.horizontalGradient(listOf(Color(0xFF38BDF8), Color(0xFF818CF8), Color(0xFF34D399)))
                    )
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "💰 MIS GANANCIAS",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF94A3B8),
                                letterSpacing = 1.sp
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFF10B981).copy(alpha = 0.2f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981))
                            ) {
                                Text(
                                    text = "PROPIO",
                                    color = Color(0xFF34D399),
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "C$ ${String.format(Locale.US, "%.2f", financesState.totalGeneralEarnings)}",
                            fontSize = 30.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF38BDF8)
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Micro-desglose por concepto
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("🛣️ Distancia (${String.format(Locale.US, "%.1f", financesState.totalGeneralDistanceKm)} km)", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                Text("C$ ${String.format(Locale.US, "%.2f", financesState.totalGeneralDistanceEarnings)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                            Column {
                                Text("🎁 Bonos (${financesState.totalGeneralCount} ped)", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                Text("C$ ${String.format(Locale.US, "%.2f", financesState.totalGeneralBonusEarnings)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                            Column {
                                Text("✨ Propinas (100%)", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                Text("C$ ${String.format(Locale.US, "%.2f", financesState.totalGeneralTips)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF34D399))
                            }
                        }
                    }
                }

                // Card 2: Efectivo, Custodia y Liquidación Requerida
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0B132B)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f, fill = false)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("💵", fontSize = 14.sp)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "EFECTIVO EN CUSTODIA / A DEPOSITAR",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFFFBBF24),
                                        letterSpacing = 0.5.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "C$ ${String.format(Locale.US, "%.2f", financesState.totalGeneralRequiredDeposit)}",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            Button(
                                onClick = onNavigateToClosure,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    text = "Arqueo / Cierre →",
                                    fontSize = 11.sp,
                                    color = Color(0xFF38BDF8),
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    softWrap = false
                                )
                            }
                        }

                        if (financesState.totalGeneralCompensated > 0.0) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF064E3B).copy(alpha = 0.4f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.4f)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "⚖️ Total Cobrado: C$ ${String.format(Locale.US, "%.2f", financesState.totalGeneralCashReceived)} | Compensado de tus ganancias: -C$ ${String.format(Locale.US, "%.2f", financesState.totalGeneralCompensated)}",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF6EE7B7),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // ── 4. DESGLOSE POR LAS 2 LÍNEAS DE NEGOCIO (2 CARDS 50/50) ───────────
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Línea A: Delivery Comercio
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0B132B)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🏪", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "COMERCIO",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF818CF8),
                                letterSpacing = 0.5.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "C$ ${String.format(Locale.US, "%.2f", financesState.commerceSummary.totalEarnings)}",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${financesState.commerceSummary.count} servicios",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                // Línea B: Punto A -> Punto B (X->Y)
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0B132B)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("📦", fontSize = 16.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "PUNTO A → B",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF34D399),
                                letterSpacing = 0.5.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "C$ ${String.format(Locale.US, "%.2f", financesState.xToYSummary.totalEarnings)}",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${financesState.xToYSummary.count} servicios",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        // ── 5. SECCIÓN HISTORIAL TRAZABLE ──────────────────────────────────
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "HISTORIAL DE OPERACIONES",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFFCBD5E1),
                    letterSpacing = 0.5.sp
                )
                Text(
                    text = "${financesState.items.size} registros",
                    fontSize = 11.sp,
                    color = Color(0xFF64748B)
                )
            }
        }

        if (financesState.items.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.ReceiptLong, contentDescription = null, tint = Color(0xFF475569), modifier = Modifier.size(40.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Sin registros financieros en este período",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF94A3B8)
                        )
                        Text(
                            text = "Completa entregas de comercio o encomiendas X→Y para ver tus ganancias aquí.",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        } else {
            items(financesState.items, key = { it.orderId }) { item ->
                FinancialRecordRow(item = item, dateFormat = dateFormat)
            }
        }
    }

    // Diálogo de Selección de Rango Personalizado
    if (showCustomDateDialog) {
        var startYear by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.YEAR)) }
        var startMonth by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.MONTH)) }
        var startDay by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.DAY_OF_MONTH)) }

        var endYear by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.YEAR)) }
        var endMonth by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.MONTH)) }
        var endDay by remember { mutableIntStateOf(Calendar.getInstance().get(Calendar.DAY_OF_MONTH)) }

        AlertDialog(
            onDismissRequest = { showCustomDateDialog = false },
            title = { Text("Seleccionar Rango de Fechas", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Configura el período de auditoría financiera para tus ingresos:", fontSize = 12.sp, color = Color(0xFF64748B))

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
                        showCustomDateDialog = false
                        onFilterChanged(FinanceDateFilter.CUSTOM, cStart.timeInMillis, cEnd.timeInMillis)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF38BDF8))
                ) {
                    Text("Aplicar Rango", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCustomDateDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
private fun FilterChipButton(
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .height(34.dp)
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
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
                color = if (isSelected) Color(0xFF0F172A) else Color(0xFF94A3B8)
            )
        }
    }
}

@Composable
private fun FinancialRecordRow(
    item: CourierFinancialItem,
    dateFormat: SimpleDateFormat
) {
    val isXToY = item.serviceType == "X_TO_Y_DELIVERY"
    val lineBadgeBg = if (isXToY) Color(0xFF064E3B) else Color(0xFF1E1B4B)
    val lineBadgeText = if (isXToY) Color(0xFF34D399) else Color(0xFF818CF8)
    val lineBadgeLabel = if (isXToY) "📦 PUNTO A → B" else "🏪 COMERCIO"

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header del registro
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = RoundedCornerShape(6.dp), color = lineBadgeBg) {
                        Text(
                            text = lineBadgeLabel,
                            color = lineBadgeText,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = item.referenceNumber,
                        fontWeight = FontWeight.Black,
                        fontSize = 13.sp,
                        color = Color.White
                    )
                }

                // Ganancia
                Text(
                    text = if (item.isCompleted) "+ C$ ${String.format(Locale.US, "%.2f", item.earningAmount)}" else "C$ 0.00",
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    color = if (item.isCompleted) Color(0xFF34D399) else Color(0xFF64748B)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Entidad / Comercio / Remitente
            Text(
                text = item.entityName,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFE2E8F0),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            // Ruta / Dirección
            Text(
                text = item.routeDescription,
                fontSize = 11.sp,
                color = Color(0xFF94A3B8),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // Desglose de Ganancia (KM + Bono + Propina)
            if (item.isCompleted && (item.distanceEarnings > 0.0 || item.bonusEarnings > 0.0 || item.tipEarnings > 0.0)) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (item.distanceKm > 0.0) {
                        Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFF0F172A), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))) {
                            Text(
                                text = "🛣️ ${String.format(Locale.US, "%.1f", item.distanceKm)}km (C$ ${String.format(Locale.US, "%.2f", item.distanceEarnings)})",
                                fontSize = 9.sp,
                                color = Color(0xFF94A3B8),
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                    if (item.bonusEarnings > 0.0) {
                        Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFF0F172A), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))) {
                            Text(
                                text = "🎁 Bono C$ ${String.format(Locale.US, "%.2f", item.bonusEarnings)}",
                                fontSize = 9.sp,
                                color = Color(0xFF94A3B8),
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                    if (item.tipEarnings > 0.0) {
                        Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFF064E3B), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF059669))) {
                            Text(
                                text = "✨ Propina C$ ${String.format(Locale.US, "%.2f", item.tipEarnings)}",
                                fontSize = 9.sp,
                                color = Color(0xFF34D399),
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Footer: Fecha, Método y Estado
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (item.timestamp > 0) dateFormat.format(Date(item.timestamp)) else "Fecha no registrada",
                    fontSize = 10.sp,
                    color = Color(0xFF64748B)
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFF1E293B)) {
                        Text(
                            text = item.paymentMethod.uppercase(),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8),
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                        )
                    }

                    val (statusBg, statusFg, statusLabel) = when (item.status.lowercase()) {
                        "completed", "completado", "delivered", "entregado" -> Triple(Color(0xFF052E16), Color(0xFF22C55E), "ENTREGADO ✓")
                        "cancelled", "cancelado" -> Triple(Color(0xFF450A0A), Color(0xFFEF4444), "CANCELADO ✕")
                        else -> Triple(Color(0xFF1E293B), Color(0xFFF59E0B), item.status.uppercase())
                    }

                    Surface(shape = RoundedCornerShape(4.dp), color = statusBg) {
                        Text(
                            text = statusLabel,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = statusFg,
                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}
