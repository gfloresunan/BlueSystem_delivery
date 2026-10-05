package com.example.presentation.admin

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BluePrimary
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.functions.FirebaseFunctions
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class CourierDailyClosureAdmin(
    val id: String = "",
    val courierId: String = "",
    val courierName: String = "",
    val closureDate: String = "",
    val expectedCash: Double = 0.0,
    val declaredCash: Double = 0.0,
    val difference: Double = 0.0,
    val bankDepositAmount: Double = 0.0,
    val bankReference: String = "",
    val depositReceiptUrl: String = "",
    val actNumber: String = "",
    val status: String = "PENDING_APPROVAL", // PENDING_APPROVAL, APPROVED, REJECTED
    val createdAtMillis: Long = 0L
)

/**
 * MÓDULO 6: Caja de Motorizados & Cierres Diarios (AdminCourierCashCenterScreen).
 *
 * Visualiza y concilia los arqueos diarios de los motorizados (/courier_daily_closures),
 * revisa comprobantes de depósito bancario, actas oficiales y aprueba de forma
 * server-authoritative liberando el balance y límite de efectivo.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminCourierCashCenterScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }
    val currentAdminUid = auth.currentUser?.uid ?: "admin"

    var closures by remember { mutableStateOf<List<CourierDailyClosureAdmin>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedStatusFilter by remember { mutableStateOf("PENDING_APPROVAL") }
    var selectedClosureForDetail by remember { mutableStateOf<CourierDailyClosureAdmin?>(null) }
    var isProcessing by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        val listener = db.collection("courier_daily_closures")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                isLoading = false
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val data = doc.data ?: return@mapNotNull null
                        val officialAct = data["officialAct"] as? Map<*, *>
                        val bankDeposit = data["bankDeposit"] as? Map<*, *>

                        val expectedCashNio = (data["expectedCash"] as? Number)?.toDouble()
                            ?: (data["expectedAmountCents"] as? Number)?.toDouble()?.div(100.0)
                            ?: (data["totalEfectivoRecaudado"] as? Number)?.toDouble() ?: 0.0

                        val declaredCashNio = (data["declaredCash"] as? Number)?.toDouble()
                            ?: (data["countedAmountCents"] as? Number)?.toDouble()?.div(100.0)
                            ?: (bankDeposit?.get("depositAmountCents") as? Number)?.toDouble()?.div(100.0)
                            ?: (data["totalEfectivoArqueo"] as? Number)?.toDouble() ?: 0.0

                        val diffNio = (data["difference"] as? Number)?.toDouble()
                            ?: (data["depositDiscrepancyCents"] as? Number)?.toDouble()?.div(100.0)
                            ?: (data["differenceCents"] as? Number)?.toDouble()?.div(100.0)
                            ?: (data["diferenciaArqueo"] as? Number)?.toDouble() ?: 0.0

                        val depositAmountNio = (data["bankDepositAmount"] as? Number)?.toDouble()
                            ?: (bankDeposit?.get("depositAmountCents") as? Number)?.toDouble()?.div(100.0)
                            ?: (data["montoDeposito"] as? Number)?.toDouble() ?: 0.0

                        val bankRef = data["bankReference"] as? String
                            ?: bankDeposit?.get("bankReference") as? String
                            ?: data["referenciaBanco"] as? String ?: ""

                        val actNum = officialAct?.get("actNumber") as? String
                            ?: data["actNumber"] as? String
                            ?: data["numeroActa"] as? String ?: "ACTA-PENDIENTE"

                        CourierDailyClosureAdmin(
                            id = doc.id,
                            courierId = data["courierId"] as? String ?: "",
                            courierName = data["courierName"] as? String ?: data["nombreMotorizado"] as? String ?: "Motorizado",
                            closureDate = data["closureDate"] as? String ?: data["fecha"] as? String ?: data["businessDate"] as? String ?: "",
                            expectedCash = expectedCashNio,
                            declaredCash = declaredCashNio,
                            difference = diffNio,
                            bankDepositAmount = depositAmountNio,
                            bankReference = bankRef,
                            depositReceiptUrl = data["depositReceiptUrl"] as? String ?: bankDeposit?.get("voucherUrl") as? String ?: data["comprobanteUrl"] as? String ?: "",
                            actNumber = actNum,
                            status = (data["status"] as? String ?: "PENDING_ADMIN_VERIFICATION").uppercase(),
                            createdAtMillis = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: System.currentTimeMillis()
                        )
                    }
                    closures = list
                }
            }

        onDispose { listener.remove() }
    }

    val filteredClosures = remember(closures, selectedStatusFilter) {
        when (selectedStatusFilter) {
            "PENDING_APPROVAL" -> closures.filter { it.status in listOf("PENDING_ADMIN_VERIFICATION", "PENDING_APPROVAL", "SUBMITTED", "PENDIENTE", "OPEN") }
            "APPROVED" -> closures.filter { it.status in listOf("VERIFIED", "APPROVED", "APROBADO") }
            "REJECTED" -> closures.filter { it.status in listOf("REJECTED", "RECHAZADO") }
            else -> closures
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Caja de Motorizados", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Arqueos, depósitos y conciliación de liquidaciones", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BluePrimary)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC))
        ) {
            // Filtros
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = selectedStatusFilter == "PENDING_APPROVAL",
                    onClick = { selectedStatusFilter = "PENDING_APPROVAL" },
                    label = { Text("Pendientes (${closures.count { it.status in listOf("PENDING_APPROVAL", "SUBMITTED", "PENDIENTE") }})", fontSize = 11.sp) }
                )
                FilterChip(
                    selected = selectedStatusFilter == "APPROVED",
                    onClick = { selectedStatusFilter = "APPROVED" },
                    label = { Text("Aprobados (${closures.count { it.status in listOf("APPROVED", "APROBADO") }})", fontSize = 11.sp) }
                )
                FilterChip(
                    selected = selectedStatusFilter == "ALL",
                    onClick = { selectedStatusFilter = "ALL" },
                    label = { Text("Todos (${closures.size})", fontSize = 11.sp) }
                )
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BluePrimary)
                }
            } else if (filteredClosures.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        Text("No hay cierres de caja en esta vista", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredClosures, key = { it.id }) { closure ->
                        CourierClosureCard(
                            closure = closure,
                            onViewDetail = { selectedClosureForDetail = closure },
                            onApprove = {
                                coroutineScope.launch {
                                    isProcessing = true
                                    try {
                                        // Aprobación Server-Authoritative mediante Callable certificada (GAP-04)
                                        val functions = FirebaseFunctions.getInstance()
                                        val payload = hashMapOf<String, Any>(
                                            "closureId" to closure.id,
                                            "action" to "VERIFY"
                                        )
                                        val result = functions.getHttpsCallable("verifyCourierDailyClosure").call(payload).await()
                                        val resMap = result.data as? Map<*, *>
                                        val actData = resMap?.get("officialAct") as? Map<*, *>
                                        val issuedActNumber = actData?.get("actNumber") as? String ?: closure.actNumber

                                        Toast.makeText(context, "Cierre #${issuedActNumber} verificado y liquidado exitosamente", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Error al verificar: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                                    } finally {
                                        isProcessing = false
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    // Modal detalle comprobante y acta
    selectedClosureForDetail?.let { closure ->
        AlertDialog(
            onDismissRequest = { selectedClosureForDetail = null },
            title = {
                Text("Acta: ${closure.actNumber}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Motorizado: ${closure.courierName}", fontSize = 12.sp)
                    Text("Fecha de Corte: ${closure.closureDate}", fontSize = 12.sp)
                    Text("Efectivo Esperado: C$ ${String.format("%.2f", closure.expectedCash)}", fontSize = 12.sp)
                    Text("Efectivo Declarado: C$ ${String.format("%.2f", closure.declaredCash)}", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text("Diferencia: C$ ${String.format("%.2f", closure.difference)}", fontSize = 12.sp, color = if (closure.difference == 0.0) Color(0xFF10B981) else Color(0xFFDC2626))
                    Text("Depósito Bancario: C$ ${String.format("%.2f", closure.bankDepositAmount)}", fontSize = 12.sp)
                    Text("Ref. Banco: ${closure.bankReference.ifBlank { "N/A" }}", fontSize = 12.sp)
                    Text("Estado: ${closure.status}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedClosureForDetail = null }) {
                    Text("Cerrar")
                }
            }
        )
    }
}

@Composable
private fun CourierClosureCard(
    closure: CourierDailyClosureAdmin,
    onViewDetail: () -> Unit,
    onApprove: () -> Unit
) {
    val statusColor = when (closure.status) {
        "APPROVED", "APROBADO" -> Color(0xFF10B981)
        "REJECTED", "RECHAZADO" -> Color(0xFFDC2626)
        else -> Color(0xFFD97706)
    }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFECFDF5)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Receipt, contentDescription = null, tint = Color(0xFF059669), modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(closure.courierName, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = Color(0xFF0F172A))
                        Text(closure.actNumber, fontSize = 10.5.sp, color = Color(0xFF64748B))
                    }
                }

                Surface(
                    color = statusColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        closure.status,
                        color = statusColor,
                        fontSize = 8.5.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Recaudado", fontSize = 10.sp, color = Color(0xFF64748B))
                    Text("C$ ${String.format("%.0f", closure.expectedCash)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                }
                Column {
                    Text("Depositado", fontSize = 10.sp, color = Color(0xFF64748B))
                    Text("C$ ${String.format("%.0f", closure.declaredCash)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                }
                Column {
                    Text("Diferencia", fontSize = 10.sp, color = Color(0xFF64748B))
                    Text(
                        "C$ ${String.format("%.0f", closure.difference)}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (closure.difference == 0.0) Color(0xFF10B981) else Color(0xFFDC2626)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onViewDetail,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Ver Acta", fontSize = 11.sp)
                }

                if (closure.status in listOf("PENDING_ADMIN_VERIFICATION", "PENDING_APPROVAL", "SUBMITTED", "PENDIENTE", "OPEN")) {
                    Button(
                        onClick = onApprove,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Aprobar Arqueo", fontSize = 11.sp, color = Color.White)
                    }
                }
            }
        }
    }
}
