package com.example.presentation.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.engine.courier.ShiftCashBalance

/**
 * Pantalla de Arqueo Financiero Diario y Cierre de Caja del Motorizado.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettlementSummaryScreen(
    balance: ShiftCashBalance,
    onBack: () -> Unit,
    onConfirmSettlement: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Arqueo Diario de Caja", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Regresar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color(0xFFF8FAFC))
                .verticalScroll(rememberScrollState())
                .padding(20.dp)
        ) {
            // Balance Card Principal
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(
                        text = "SALDO NETO A ENTREGAR A CAJA",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF94A3B8),
                        letterSpacing = 0.5.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "C$ ${String.format("%.2f", balance.netBalanceToSettle)}",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        color = if (balance.netBalanceToSettle >= 0) Color(0xFF38BDF8) else Color(0xFFF87171)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Diferencia neta calculada automáticamente a partir del efectivo cobrado menos comisiones, propinas y bonos recibidos.",
                        fontSize = 12.sp,
                        color = Color(0xFFCBD5E1)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text("Desglose Detallado del Turno", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
            Spacer(modifier = Modifier.height(12.dp))

            // Desglose de Ítems
            FinancialItemRow("Efectivo Cobrado al Cliente", balance.totalCashCollected, isPositive = true, isCash = true)
            FinancialItemRow("Comisiones de Envíos Ganadas", -balance.totalDeliveryFeesEarned, isPositive = false)
            FinancialItemRow("Propinas Retenidas", -balance.totalTips, isPositive = false)
            FinancialItemRow("Bonificaciones por Alta Demanda", -balance.totalBonuses, isPositive = false)
            FinancialItemRow("Penalizaciones por Demora", balance.totalPenalties, isPositive = true)
            FinancialItemRow("Reembolsos Procesados", balance.totalRefunds, isPositive = true)

            Spacer(modifier = Modifier.weight(1f))
            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onConfirmSettlement,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
            ) {
                Icon(Icons.Default.AccountBalanceWallet, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Confirmar y Liquidar Cierre de Caja", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
        }
    }
}

@Composable
private fun FinancialItemRow(label: String, amount: Double, isPositive: Boolean, isCash: Boolean = false) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF334155))
            Text(
                text = "C$ ${String.format("%.2f", Math.abs(amount))}",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = when {
                    isCash -> Color(0xFF0284C7)
                    isPositive -> Color(0xFFDC2626)
                    else -> Color(0xFF166534)
                }
            )
        }
    }
}
