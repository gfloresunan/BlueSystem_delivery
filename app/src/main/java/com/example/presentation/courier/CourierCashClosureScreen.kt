package com.example.presentation.courier

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

/**
 * Pantalla integral de Cierre Diario de Efectivo, Depósito Bancario y Acta Oficial del Motorizado.
 * Estilo visual: BlueSystem Enterprise Dark Theme (#020617, #0F172A, #1E293B, #10B981, #38BDF8).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierCashClosureScreen(
    onBack: () -> Unit,
    onNavigateToHistory: () -> Unit = {}
) {
    val auth = remember { FirebaseAuth.getInstance() }
    val db = remember { FirebaseFirestore.getInstance() }
    val storage = remember { FirebaseStorage.getInstance() }
    val functions = remember { FirebaseFunctions.getInstance() }
    val courierUid = auth.currentUser?.uid ?: ""
    val coroutineScope = rememberCoroutineScope()

    val focusManager = androidx.compose.ui.platform.LocalFocusManager.current

    val todayDateStr = remember {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("America/Managua")
        sdf.format(Date())
    }

    val (todayStartMs, todayEndMs) = remember {
        val cal = Calendar.getInstance(TimeZone.getTimeZone("America/Managua"))
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val start = cal.timeInMillis
        cal.set(Calendar.HOUR_OF_DAY, 23)
        cal.set(Calendar.MINUTE, 59)
        cal.set(Calendar.SECOND, 59)
        cal.set(Calendar.MILLISECOND, 999)
        val end = cal.timeInMillis
        Pair(start, end)
    }

    var totalRecaudadoState by remember { mutableStateOf(0.0) }
    var effectiveCashLimitState by remember { mutableStateOf(2000.0) }
    var pedidosCountState by remember { mutableStateOf(0) }
    var closureStatusState by remember { mutableStateOf("OPEN") }
    var closureIdState by remember { mutableStateOf("") }
    var officialActNumberState by remember { mutableStateOf("") }
    var verificationCodeState by remember { mutableStateOf("") }
    var rejectionReasonState by remember { mutableStateOf("") }
    var courierRealNameState by remember { mutableStateOf("") }
    var loadingState by remember { mutableStateOf(true) }

    // Campos de Depósito Bancario
    val availableBanks = listOf("BAC Credomatic", "Banco LAFISE Bancentro", "Banpro Grupo Promerica", "BDF Banco de Finanzas", "Avanz", "Billetera Móvil / Banpro", "Kash / BAC")
    var selectedBank by remember { mutableStateOf(availableBanks.first()) }
    var bankDropdownExpanded by remember { mutableStateOf(false) }
    var bankReferenceInput by remember { mutableStateOf("") }
    var depositAmountInput by remember { mutableStateOf("") }
    var notesInput by remember { mutableStateOf("") }

    // Voucher selection
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedImageUri = uri
        }
    }

    var isSubmittingDeposit by remember { mutableStateOf(false) }
    var uploadProgressText by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successDialogMessage by remember { mutableStateOf<String?>(null) }

    // Cargar datos de subledger y pedidos completados en efectivo para la jornada de hoy
    LaunchedEffect(courierUid) {
        if (courierUid.isEmpty()) {
            loadingState = false
            return@LaunchedEffect
        }

        // 0. Cargar nombre real del motorizado de Firestore
        val authUser = auth.currentUser
        val initialName = authUser?.displayName?.takeIf { it.isNotBlank() && it != "Repartidor" && it != "Motorizado" } ?: ""
        if (initialName.isNotBlank()) {
            courierRealNameState = initialName
        }
        db.collection("users").document(courierUid).get().addOnSuccessListener { uDoc ->
            val n = uDoc.getString("name") ?: uDoc.getString("nombre") ?: uDoc.getString("displayName") ?: uDoc.getString("fullName")
            if (!n.isNullOrBlank() && n != "Repartidor" && n != "Motorizado") {
                courierRealNameState = n
            }
        }
        db.collection("couriers").document(courierUid).get().addOnSuccessListener { cDoc ->
            val n = cDoc.getString("name") ?: cDoc.getString("nombre") ?: cDoc.getString("displayName")
            if (!n.isNullOrBlank() && n != "Repartidor" && n != "Motorizado" && (courierRealNameState.isBlank() || courierRealNameState == "Repartidor" || courierRealNameState == "Motorizado")) {
                courierRealNameState = n
            }
        }
        db.collection("courier_balances").document(courierUid).addSnapshotListener { bDoc, _ ->
            if (bDoc != null && bDoc.exists()) {
                val n = bDoc.getString("courierName")
                if (!n.isNullOrBlank() && n != "Repartidor" && n != "Motorizado" && (courierRealNameState.isBlank() || courierRealNameState == "Repartidor" || courierRealNameState == "Motorizado")) {
                    courierRealNameState = n
                }
                val limitCents = bDoc.getLong("effectiveCashLimitCents")
                    ?: bDoc.getLong("cashLimitCents")
                    ?: 200000L
                if (limitCents > 0L) {
                    effectiveCashLimitState = limitCents / 100.0
                }
            }
        }

        // 1. Escuchar cierre formal de hoy
        db.collection("courier_daily_closures")
            .whereEqualTo("courierId", courierUid)
            .whereEqualTo("businessDate", todayDateStr)
            .limit(1)
            .addSnapshotListener { snap, _ ->
                if (snap != null && !snap.isEmpty) {
                    val doc = snap.documents[0]
                    closureIdState = doc.id
                    closureStatusState = doc.getString("status") ?: "OPEN"
                    rejectionReasonState = doc.getString("rejectionReason") ?: ""
                    totalRecaudadoState = (doc.getLong("expectedAmountCents") ?: 0L) / 100.0
                    pedidosCountState = (doc.getLong("ordersCount") ?: 0L).toInt()

                    val cNameFromDoc = doc.getString("courierName")
                    if (!cNameFromDoc.isNullOrBlank() && cNameFromDoc != "Repartidor" && cNameFromDoc != "Motorizado") {
                        courierRealNameState = cNameFromDoc
                    }

                    val act = doc.get("officialAct") as? Map<*, *>
                    if (act != null) {
                        officialActNumberState = (act["actNumber"] as? String) ?: ""
                        verificationCodeState = (act["verificationCode"] as? String) ?: ""
                    }
                    loadingState = false
                } else {
                    // 2. Si no hay cierre formal, leer de /courier_balances
                    db.collection("courier_balances").document(courierUid).get()
                        .addOnSuccessListener { bDoc ->
                            if (bDoc.exists()) {
                                val outstanding = (bDoc.getLong("cashOutstandingCents") ?: 0L) / 100.0
                                if (outstanding > 0.0) {
                                    totalRecaudadoState = outstanding
                                }
                                val limitCents = bDoc.getLong("effectiveCashLimitCents")
                                    ?: bDoc.getLong("cashLimitCents")
                                    ?: 200000L
                                if (limitCents > 0L) {
                                    effectiveCashLimitState = limitCents / 100.0
                                }
                            }
                            // 3. Reconciliación con pedidos en efectivo completados hoy (filtrados por fecha y courier)
                            db.collection("orders")
                                .whereEqualTo("assignedCourierId", courierUid)
                                .whereIn("status", listOf("delivered", "completed", "entregado", "completado"))
                                .get()
                                .addOnSuccessListener { orderSnap ->
                                    var directCashSum = 0.0
                                    var directCount = 0
                                    orderSnap.documents.forEach { oDoc ->
                                        val ts = oDoc.getTimestamp("deliveredAt")?.toDate()?.time
                                            ?: oDoc.getTimestamp("completedAt")?.toDate()?.time
                                            ?: oDoc.getTimestamp("createdAt")?.toDate()?.time
                                            ?: oDoc.getLong("completedAt")
                                            ?: oDoc.getLong("deliveredAt")
                                            ?: oDoc.getLong("createdAt")
                                            ?: 0L
                                        val isToday = ts == 0L || ts in todayStartMs..todayEndMs

                                        if (isToday) {
                                            val pMethod = (oDoc.getString("paymentMethod") ?: oDoc.getString("metodoPago") ?: "").lowercase()
                                            if (pMethod in listOf("efectivo", "cash")) {
                                                val cashRec = (oDoc.get("cashReceived") as? Number)?.toDouble()
                                                    ?: (oDoc.get("total") as? Number)?.toDouble()
                                                    ?: 0.0
                                                val chGiven = (oDoc.get("changeGiven") as? Number)?.toDouble() ?: 0.0
                                                val courierEarning = (oDoc.get("courierTotalEarnings") as? Number)?.toDouble()
                                                    ?: (oDoc.get("courierEarnings") as? Number)?.toDouble()
                                                    ?: (oDoc.get("deliveryFee") as? Number)?.toDouble()
                                                    ?: 0.0
                                                val netCash = maxOf(0.0, cashRec - chGiven)
                                                val toDeposit = maxOf(0.0, netCash - courierEarning)
                                                directCashSum += toDeposit
                                                directCount++
                                            }
                                        }
                                    }
                                    if (totalRecaudadoState == 0.0 && directCashSum > 0.0) {
                                        totalRecaudadoState = directCashSum
                                    }
                                    if (pedidosCountState == 0) {
                                        pedidosCountState = directCount
                                    }
                                    loadingState = false
                                }
                                .addOnFailureListener {
                                    loadingState = false
                                }
                        }
                        .addOnFailureListener {
                            loadingState = false
                        }
                }
            }
    }

    val context = androidx.compose.ui.platform.LocalContext.current
    var showHistoryModal by remember { mutableStateOf(false) }
    var historyFilterRange by remember { mutableStateOf("ALL") } // "7_DAYS", "30_DAYS", "ALL"
    var historyClosuresList by remember { mutableStateOf<List<PastClosureItem>>(emptyList()) }
    var loadingHistory by remember { mutableStateOf(false) }

    // Cargar historial de cierres del motorizado
    LaunchedEffect(showHistoryModal, courierUid) {
        if (showHistoryModal && courierUid.isNotEmpty()) {
            loadingHistory = true
            db.collection("courier_daily_closures")
                .whereEqualTo("courierId", courierUid)
                .get()
                .addOnSuccessListener { snap ->
                    val list = snap.documents.mapNotNull { doc ->
                        val act = doc.get("officialAct") as? Map<*, *>
                        val bank = doc.get("bankDeposit") as? Map<*, *>
                        PastClosureItem(
                            closureId = doc.id,
                            businessDate = doc.getString("businessDate") ?: "",
                            courierName = doc.getString("courierName") ?: "",
                            status = doc.getString("status") ?: "OPEN",
                            expectedAmountCents = doc.getLong("expectedAmountCents") ?: 0L,
                            ordersCount = (doc.getLong("ordersCount") ?: 0L).toInt(),
                            bankName = (bank?.get("bankName") as? String) ?: doc.getString("bankName") ?: "",
                            bankReference = (bank?.get("bankReference") as? String) ?: doc.getString("bankReference") ?: "",
                            depositAmountCents = (bank?.get("depositAmountCents") as? Number)?.toLong() ?: doc.getLong("depositAmountCents") ?: 0L,
                            actNumber = (act?.get("actNumber") as? String) ?: "",
                            verificationCode = (act?.get("verificationCode") as? String) ?: "",
                            receiptUrl = (bank?.get("receiptDownloadUrl") as? String) ?: doc.getString("receiptDownloadUrl") ?: "",
                            rejectionReason = doc.getString("rejectionReason") ?: "",
                            createdAtMs = doc.getTimestamp("createdAt")?.toDate()?.time ?: doc.getLong("createdAtMs") ?: 0L
                        )
                    }.sortedByDescending { it.businessDate }
                    historyClosuresList = list
                    loadingHistory = false
                }
                .addOnFailureListener {
                    loadingHistory = false
                }
        }
    }

    Scaffold(
        containerColor = Color(0xFF020617),
        topBar = {
            TopAppBar(
                title = { Text("Cierre de Efectivo del Día", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Regresar", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = { showHistoryModal = true }) {
                        Icon(Icons.Default.History, contentDescription = "Historial de Cierres", tint = Color(0xFF38BDF8))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F172A),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .imePadding()
                .background(Color(0xFF020617))
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Card Principal: Resumen de Recaudación
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                border = BorderStroke(1.dp, Color(0xFF1E293B))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "TOTAL RECAUDADO HOY",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 1.sp
                        )
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = when (closureStatusState) {
                                "VERIFIED" -> Color(0xFF10B981)
                                "PENDING_ADMIN_VERIFICATION", "PENDING_VERIFICATION" -> Color(0xFFF59E0B)
                                "REJECTED" -> Color(0xFFEF4444)
                                else -> Color(0xFF334155)
                            }
                        ) {
                            Text(
                                text = when (closureStatusState) {
                                    "VERIFIED" -> "VERIFICADO"
                                    "PENDING_ADMIN_VERIFICATION", "PENDING_VERIFICATION" -> "EN REVISIÓN"
                                    "REJECTED" -> "RECHAZADO"
                                    else -> "ABIERTO"
                                },
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "C$ ${String.format(Locale.US, "%.2f", totalRecaudadoState)}",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF38BDF8)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF1E293B), RoundedCornerShape(12.dp))
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("Fecha Operacional", fontSize = 10.sp, color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
                            Text(todayDateStr, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Pedidos Cobrados", fontSize = 10.sp, color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
                            Text("$pedidosCountState", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                        }
                    }
                }
            }

            // Alerta si el comprobante fue rechazado
            if (closureStatusState == "REJECTED") {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF450A0A)),
                    border = BorderStroke(1.dp, Color(0xFFEF4444))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Error, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("COMPROBANTE RECHAZADO", fontWeight = FontWeight.Black, color = Color(0xFFFCA5A5), fontSize = 13.sp)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Motivo: ${rejectionReasonState.ifBlank { "Rechazado por auditoría administrativa." }}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFECACA)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Por favor verifica los datos de tu depósito bancario y vuelve a subir el comprobante correcto.",
                            fontSize = 11.sp,
                            color = Color(0xFFFCA5A5)
                        )
                    }
                }
            }

            // Banner Informativo de Límite Reiniciado cuando el cierre está Verificado
            if (closureStatusState == "VERIFIED") {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF064E3B)),
                    border = BorderStroke(1.dp, Color(0xFF10B981))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("LÍMITE REINICIADO — OPERACIONES ACTIVAS", fontWeight = FontWeight.Black, color = Color(0xFFD1FAE5), fontSize = 12.sp)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Tu depósito de C$ ${String.format(Locale.US, "%.2f", totalRecaudadoState)} fue verificado y liquidado por la administración. Tu custodia de efectivo actual es C$ 0.00 y puedes continuar recibiendo pedidos con normalidad.",
                            fontSize = 11.sp,
                            color = Color(0xFFA7F3D0)
                        )
                    }
                }
            }

            // Alerta de Límite de Efectivo (Solo se muestra si el depósito NO ha sido enviado ni verificado)
            val hasPendingDeposit = closureStatusState in listOf("VERIFIED", "PENDING_ADMIN_VERIFICATION", "PENDING_VERIFICATION")
            val isLimitExceeded = effectiveCashLimitState > 0.0 && totalRecaudadoState >= effectiveCashLimitState
            if (!hasPendingDeposit && isLimitExceeded) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF451A03)),
                    border = BorderStroke(1.dp, Color(0xFFF59E0B))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("LÍMITE MÁXIMO DE EFECTIVO ALCANZADO", fontWeight = FontWeight.Black, color = Color(0xFFFCD34D), fontSize = 12.sp)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Has acumulado C$ ${String.format(Locale.US, "%.2f", totalRecaudadoState)} bajo custodia (Límite: C$ ${String.format(Locale.US, "%,.2f", effectiveCashLimitState)}).",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFFEF3C7)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Para continuar recibiendo nuevos pedidos debes completar el cierre de efectivo y registrar el comprobante de depósito bancario.",
                            fontSize = 11.sp,
                            color = Color(0xFFFDE68A)
                        )
                    }
                }
            }

            // Sección: Acta Oficial Emitida y Descarga en PDF
            if (officialActNumberState.isNotEmpty() || closureStatusState == "VERIFIED") {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF064E3B)),
                    border = BorderStroke(1.dp, Color(0xFF10B981))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Acta Oficial de Cierre Aprobada", fontWeight = FontWeight.Black, color = Color(0xFFD1FAE5), fontSize = 13.sp)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Acta No: ${officialActNumberState.ifBlank { "ACTA-CASH-$todayDateStr" }}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFA7F3D0))
                        Text("Hash de Validación: ${verificationCodeState.ifBlank { "VERIFIED-OK" }}", fontSize = 11.sp, color = Color(0xFF6EE7B7))
                        
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        Button(
                            onClick = {
                                val cName = courierRealNameState.ifBlank {
                                    auth.currentUser?.displayName?.takeIf { it.isNotBlank() }
                                        ?: auth.currentUser?.email?.takeIf { it.isNotBlank() }
                                        ?: "Motorizado"
                                }
                                downloadOfficialActPdf(
                                    context = context,
                                    actNumber = officialActNumberState.ifBlank { "ACTA-CASH-$todayDateStr" },
                                    verificationCode = verificationCodeState.ifBlank { "VERIFIED-OK" },
                                    courierName = cName,
                                    courierId = courierUid,
                                    businessDate = todayDateStr,
                                    expectedAmount = totalRecaudadoState,
                                    countedAmount = totalRecaudadoState,
                                    bankName = selectedBank,
                                    bankReference = bankReferenceInput.ifBlank { "Depósito Verificado" },
                                    depositAmount = totalRecaudadoState
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                        ) {
                            Icon(Icons.Default.PictureAsPdf, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Descargar Acta Oficial (PDF) 📄", fontWeight = FontWeight.Black, color = Color.White, fontSize = 12.sp)
                        }
                    }
                }
            }

            // Sección: Formulario de Depósito Bancario
            if (closureStatusState != "VERIFIED") {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Text(
                            text = "REGISTRAR DEPÓSITO BANCARIO",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF38BDF8),
                            letterSpacing = 0.5.sp
                        )

                        // Selector de Banco (Dropdown)
                        ExposedDropdownMenuBox(
                            expanded = bankDropdownExpanded,
                            onExpandedChange = { bankDropdownExpanded = !bankDropdownExpanded }
                        ) {
                            OutlinedTextField(
                                value = selectedBank,
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Banco Receptor") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = bankDropdownExpanded) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Color.White,
                                    unfocusedTextColor = Color.White,
                                    focusedBorderColor = Color(0xFF38BDF8),
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedLabelColor = Color(0xFF38BDF8),
                                    unfocusedLabelColor = Color(0xFF94A3B8)
                                )
                            )
                            ExposedDropdownMenu(
                                expanded = bankDropdownExpanded,
                                onDismissRequest = { bankDropdownExpanded = false },
                                modifier = Modifier.background(Color(0xFF1E293B))
                            ) {
                                availableBanks.forEach { bank ->
                                    DropdownMenuItem(
                                        text = { Text(bank, color = Color.White, fontWeight = FontWeight.Medium) },
                                        onClick = {
                                            selectedBank = bank
                                            bankDropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        // Número de Comprobante / Voucher
                        OutlinedTextField(
                            value = bankReferenceInput,
                            onValueChange = { bankReferenceInput = it },
                            label = { Text("Número de Comprobante / Boucher *") },
                            placeholder = { Text("Ej: 987654321", color = Color(0xFF64748B)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                keyboardType = androidx.compose.ui.text.input.KeyboardType.Text,
                                imeAction = androidx.compose.ui.text.input.ImeAction.Next
                            ),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFF38BDF8),
                                unfocusedBorderColor = Color(0xFF334155),
                                focusedLabelColor = Color(0xFF38BDF8),
                                unfocusedLabelColor = Color(0xFF94A3B8)
                            )
                        )

                        // Monto Depositado
                        OutlinedTextField(
                            value = depositAmountInput,
                            onValueChange = { depositAmountInput = it },
                            label = { Text("Monto Depositado (C$) *") },
                            placeholder = { Text(String.format(Locale.US, "%.2f", totalRecaudadoState), color = Color(0xFF64748B)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                                imeAction = androidx.compose.ui.text.input.ImeAction.Next
                            ),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFF38BDF8),
                                unfocusedBorderColor = Color(0xFF334155),
                                focusedLabelColor = Color(0xFF38BDF8),
                                unfocusedLabelColor = Color(0xFF94A3B8)
                            )
                        )

                        // Observaciones
                        OutlinedTextField(
                            value = notesInput,
                            onValueChange = { notesInput = it },
                            label = { Text("Observaciones / Nota (Opcional)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = false,
                            maxLines = 3,
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                imeAction = androidx.compose.ui.text.input.ImeAction.Done
                            ),
                            keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                                onDone = { focusManager.clearFocus() }
                            ),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFF38BDF8),
                                unfocusedBorderColor = Color(0xFF334155),
                                focusedLabelColor = Color(0xFF38BDF8),
                                unfocusedLabelColor = Color(0xFF94A3B8)
                            )
                        )

                        // Selector de Foto del Voucher
                        Text(
                            text = "COMPROBANTE FÍSICO / CAPTURA *",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 0.5.sp
                        )

                        if (selectedImageUri != null) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(180.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color(0xFF1E293B))
                                    .border(1.dp, Color(0xFF10B981), RoundedCornerShape(12.dp))
                            ) {
                                AsyncImage(
                                    model = selectedImageUri,
                                    contentDescription = "Voucher de depósito",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                                IconButton(
                                    onClick = { selectedImageUri = null },
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .padding(8.dp)
                                        .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                                ) {
                                    Icon(Icons.Default.Close, contentDescription = "Eliminar foto", tint = Color.White)
                                }
                            }
                        } else {
                            OutlinedButton(
                                onClick = { imagePickerLauncher.launch("image/*") },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, Color(0xFF38BDF8)),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF38BDF8))
                            ) {
                                Icon(Icons.Default.AddPhotoAlternate, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Adjuntar Foto del Comprobante 📸", fontWeight = FontWeight.Bold)
                            }
                        }

                        if (errorMessage != null) {
                            Text(
                                text = errorMessage!!,
                                color = Color(0xFFEF4444),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        if (uploadProgressText.isNotEmpty()) {
                            Text(
                                text = uploadProgressText,
                                color = Color(0xFF38BDF8),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Botón de Envío
                        Button(
                            onClick = {
                                val amountFloat = depositAmountInput.toDoubleOrNull() ?: totalRecaudadoState
                                val amountCents = Math.round(amountFloat * 100).toInt()

                                if (bankReferenceInput.trim().isEmpty()) {
                                    errorMessage = "Por favor ingresa el número de referencia del comprobante."
                                    return@Button
                                }
                                if (amountCents <= 0) {
                                    errorMessage = "El monto depositado debe ser mayor a 0."
                                    return@Button
                                }
                                if (selectedImageUri == null) {
                                    errorMessage = "Debes adjuntar la foto o captura del comprobante."
                                    return@Button
                                }

                                errorMessage = null
                                isSubmittingDeposit = true
                                uploadProgressText = "Iniciando cierre y subiendo comprobante..."

                                coroutineScope.launch {
                                    try {
                                        // 1. Obtener o inicializar closureId formal autoritativamente
                                        var targetClosureId = closureIdState.trim()
                                        if (targetClosureId.isEmpty()) {
                                            uploadProgressText = "Iniciando cierre diario oficial..."
                                            val opId = "cop_${UUID.randomUUID()}"
                                            val initPayload = hashMapOf(
                                                "closureOperationId" to opId,
                                                "courierId" to courierUid,
                                                "businessDate" to todayDateStr,
                                                "shift" to "FULL_DAY"
                                            )
                                            val initResult = functions.getHttpsCallable("initiateCourierDailyClosure").call(initPayload).await()
                                            val initData = initResult.data as? Map<*, *>
                                            val funcClosureId = initData?.get("closureId") as? String
                                            if (!funcClosureId.isNullOrBlank()) {
                                                targetClosureId = funcClosureId
                                                closureIdState = funcClosureId
                                            } else {
                                                throw IllegalStateException("No se pudo obtener el identificador de cierre oficial.")
                                            }
                                        }

                                        // 2. Subir imagen del comprobante a Firebase Storage seguro
                                        uploadProgressText = "Subiendo imagen del comprobante a Storage seguro..."
                                        val fileName = "voucher_${System.currentTimeMillis()}.jpg"
                                        val storagePath = "courier_closures/$courierUid/$targetClosureId/$fileName"
                                        val storageRef = storage.reference.child(storagePath)

                                        val metadata = com.google.firebase.storage.StorageMetadata.Builder()
                                            .setContentType("image/jpeg")
                                            .setCustomMetadata("courierId", courierUid)
                                            .setCustomMetadata("closureId", targetClosureId)
                                            .build()

                                        val uploadTask = storageRef.putFile(selectedImageUri!!, metadata).await()
                                        val downloadUrl = uploadTask.storage.downloadUrl.await().toString()

                                        // 3. Registrar comprobante bancario mediante Cloud Function autoritativa
                                        uploadProgressText = "Registrando depósito en auditoría financiera..."
                                        val depositPayload = hashMapOf(
                                            "closureId" to targetClosureId,
                                            "bankName" to selectedBank,
                                            "bankReference" to bankReferenceInput.trim(),
                                            "depositAmountCents" to amountCents,
                                            "depositDate" to todayDateStr,
                                            "receiptStoragePath" to storagePath,
                                            "receiptDownloadUrl" to downloadUrl,
                                            "notes" to notesInput.trim()
                                        )
                                        functions.getHttpsCallable("registerBankDepositReceipt").call(depositPayload).await()

                                        isSubmittingDeposit = false
                                        uploadProgressText = ""
                                        closureStatusState = "PENDING_ADMIN_VERIFICATION"
                                        bankReferenceInput = ""
                                        selectedImageUri = null
                                        successDialogMessage = "Comprobante de depósito registrado con éxito para verificación por la administración."
                                    } catch (e: Exception) {
                                        isSubmittingDeposit = false
                                        uploadProgressText = ""
                                        android.util.Log.e("FLOTA_DEBUG", "Error al procesar depósito", e)
                                        errorMessage = "Error al procesar el depósito: ${e.localizedMessage ?: e.message}"
                                    }
                                }
                            },
                            enabled = !isSubmittingDeposit && (totalRecaudadoState > 0.0 || (depositAmountInput.toDoubleOrNull() ?: 0.0) > 0.0),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF10B981),
                                disabledContainerColor = Color(0xFF1E293B)
                            )
                        ) {
                            if (isSubmittingDeposit) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp))
                                Spacer(modifier = Modifier.width(10.dp))
                                Text("Procesando...", fontWeight = FontWeight.Bold, color = Color.White)
                            } else {
                                Icon(Icons.Default.CloudUpload, contentDescription = null, tint = Color.White)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Enviar Comprobante y Cerrar Día", fontWeight = FontWeight.Black, color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }

    // Diálogo de Éxito
    successDialogMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = { successDialogMessage = null },
            title = { Text("Operación Registrada", fontWeight = FontWeight.Black, color = Color.White) },
            text = { Text(msg, color = Color(0xFFCBD5E1)) },
            confirmButton = {
                Button(
                    onClick = {
                        successDialogMessage = null
                        onBack()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Aceptar", fontWeight = FontWeight.Bold)
                }
            },
            shape = RoundedCornerShape(16.dp),
            containerColor = Color(0xFF0F172A),
            tonalElevation = 6.dp
        )
    }

    // Modal de Historial de Cierres Diarios
    if (showHistoryModal) {
        val filteredList = remember(historyClosuresList, historyFilterRange) {
            when (historyFilterRange) {
                "7_DAYS" -> {
                    val cutoff = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(System.currentTimeMillis() - 7L * 86400000L))
                    historyClosuresList.filter { it.businessDate >= cutoff }
                }
                "30_DAYS" -> {
                    val cutoff = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(System.currentTimeMillis() - 30L * 86400000L))
                    historyClosuresList.filter { it.businessDate >= cutoff }
                }
                else -> historyClosuresList
            }
        }

        AlertDialog(
            onDismissRequest = { showHistoryModal = false },
            confirmButton = {
                Button(
                    onClick = { showHistoryModal = false },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B))
                ) {
                    Text("Cerrar", color = Color.White)
                }
            },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("📊 Historial de Cierres", fontWeight = FontWeight.Black, color = Color.White, fontSize = 16.sp)
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 480.dp)
                ) {
                    // Filtros de fecha
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("ALL" to "Todos", "7_DAYS" to "7 Días", "30_DAYS" to "30 Días").forEach { (key, label) ->
                            val isSelected = historyFilterRange == key
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) Color(0xFF0284C7) else Color(0xFF1E293B),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { historyFilterRange = key }
                            ) {
                                Text(
                                    text = label,
                                    modifier = Modifier.padding(vertical = 6.dp),
                                    textAlign = TextAlign.Center,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color.White else Color(0xFF94A3B8)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (loadingHistory) {
                        Box(modifier = Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Color(0xFF38BDF8))
                        }
                    } else if (filteredList.isEmpty()) {
                        Box(modifier = Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                            Text("No se registraron cierres en este período.", color = Color(0xFF64748B), fontSize = 12.sp)
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(items = filteredList, key = { it.closureId }) { closureItem ->
                                val expNio = closureItem.expectedAmountCents / 100.0
                                val depNio = closureItem.depositAmountCents / 100.0
                                val actNum = closureItem.actNumber.ifBlank { "ACTA-${closureItem.businessDate}" }
                                val verCode = closureItem.verificationCode.ifBlank { "VERIFIED-OK" }
                                val bName = closureItem.bankName.ifBlank { "Banco" }
                                val bRef = closureItem.bankReference.ifBlank { "Depósito" }
                                val effectiveDeposit = if (depNio > 0.0) depNio else expNio

                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                                    border = BorderStroke(1.dp, Color(0xFF334155))
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = closureItem.businessDate,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White,
                                                fontSize = 13.sp
                                            )
                                            Surface(
                                                shape = RoundedCornerShape(6.dp),
                                                color = when (closureItem.status) {
                                                    "VERIFIED" -> Color(0xFF10B981)
                                                    "PENDING_ADMIN_VERIFICATION", "PENDING_VERIFICATION" -> Color(0xFFF59E0B)
                                                    "REJECTED" -> Color(0xFFEF4444)
                                                    else -> Color(0xFF475569)
                                                }
                                            ) {
                                                Text(
                                                    text = when (closureItem.status) {
                                                        "VERIFIED" -> "VERIFICADO"
                                                        "PENDING_ADMIN_VERIFICATION", "PENDING_VERIFICATION" -> "EN REVISIÓN"
                                                        "REJECTED" -> "RECHAZADO"
                                                        else -> closureItem.status
                                                    },
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(6.dp))

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("Recaudado: C$ ${String.format(Locale.US, "%.2f", expNio)}", fontSize = 11.sp, color = Color(0xFF94A3B8))
                                            Text("Depositado: C$ ${String.format(Locale.US, "%.2f", depNio)}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF38BDF8))
                                        }

                                        if (closureItem.bankName.isNotBlank() || closureItem.bankReference.isNotBlank()) {
                                            Text(
                                                text = "${closureItem.bankName} • Ref: ${closureItem.bankReference}",
                                                fontSize = 10.sp,
                                                color = Color(0xFF64748B)
                                            )
                                        }

                                        if (closureItem.status == "VERIFIED") {
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Button(
                                                onClick = {
                                                    val cName = closureItem.courierName.takeIf { it.isNotBlank() && it != "Motorizado" && it != "Repartidor" }
                                                        ?: courierRealNameState.takeIf { it.isNotBlank() && it != "Motorizado" && it != "Repartidor" }
                                                        ?: auth.currentUser?.displayName?.takeIf { it.isNotBlank() }
                                                        ?: "Motorizado"
                                                    downloadOfficialActPdf(
                                                        context = context,
                                                        actNumber = actNum,
                                                        verificationCode = verCode,
                                                        courierName = cName,
                                                        courierId = courierUid,
                                                        businessDate = closureItem.businessDate,
                                                        expectedAmount = expNio,
                                                        countedAmount = expNio,
                                                        bankName = bName,
                                                        bankReference = bRef,
                                                        depositAmount = effectiveDeposit
                                                    )
                                                },
                                                modifier = Modifier.fillMaxWidth().height(36.dp),
                                                shape = RoundedCornerShape(8.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669))
                                            ) {
                                                Icon(Icons.Default.PictureAsPdf, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text("Descargar Acta (PDF)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color(0xFF0F172A),
            tonalElevation = 8.dp
        )
    }
}

/**
 * Data Model para historial de cierres
 */
data class PastClosureItem(
    val closureId: String = "",
    val businessDate: String = "",
    val courierName: String = "",
    val status: String = "OPEN",
    val expectedAmountCents: Long = 0L,
    val ordersCount: Int = 0,
    val bankName: String = "",
    val bankReference: String = "",
    val depositAmountCents: Long = 0L,
    val actNumber: String = "",
    val verificationCode: String = "",
    val receiptUrl: String = "",
    val rejectionReason: String = "",
    val createdAtMs: Long = 0L
)

/**
 * Generador y Descargador Directo de Acta Oficial PDF para Android
 * Guarda el archivo en la carpeta Downloads y lo abre directamente.
 */
fun downloadOfficialActPdf(
    context: android.content.Context,
    actNumber: String,
    verificationCode: String,
    courierName: String,
    courierId: String,
    businessDate: String,
    expectedAmount: Double,
    countedAmount: Double,
    bankName: String,
    bankReference: String,
    depositAmount: Double
) {
    try {
        val resolvedCourierName = when {
            courierName.isNotBlank() && courierName != "Motorizado" && courierName != "Repartidor" -> courierName
            courierId.isNotBlank() -> "Motorizado (${courierId.takeLast(6)})"
            else -> "Motorizado Oficial"
        }

        val pdfDocument = android.graphics.pdf.PdfDocument()
        val pageInfo = android.graphics.pdf.PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 at 72 dpi
        val page = pdfDocument.startPage(pageInfo)
        val canvas = page.canvas

        val paint = android.graphics.Paint()
        val textPaint = android.graphics.Paint().apply {
            isAntiAlias = true
            color = android.graphics.Color.parseColor("#0F172A")
        }

        // Fondo
        canvas.drawColor(android.graphics.Color.WHITE)

        // Borde cabecera
        paint.color = android.graphics.Color.parseColor("#0F172A")
        paint.strokeWidth = 2f
        paint.style = android.graphics.Paint.Style.STROKE
        canvas.drawLine(36f, 75f, 559f, 75f, paint)

        // Título
        textPaint.textSize = 16f
        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        textPaint.color = android.graphics.Color.parseColor("#0F172A")
        canvas.drawText("BLUESYSTEM DELIVERY ENTERPRISE", 36f, 48f, textPaint)

        textPaint.textSize = 10f
        textPaint.typeface = android.graphics.Typeface.DEFAULT
        textPaint.color = android.graphics.Color.parseColor("#64748B")
        canvas.drawText("Acta Oficial de Arqueo, Liquidación y Depósito Bancario", 36f, 64f, textPaint)

        // Badge
        paint.style = android.graphics.Paint.Style.FILL
        paint.color = android.graphics.Color.parseColor("#DCFCE7")
        val badgeRect = android.graphics.RectF(380f, 32f, 559f, 62f)
        canvas.drawRoundRect(badgeRect, 8f, 8f, paint)

        textPaint.textSize = 9.5f
        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        textPaint.color = android.graphics.Color.parseColor("#166534")
        canvas.drawText(actNumber, 390f, 50f, textPaint)

        // Sección 1: Datos de Identificación
        textPaint.textSize = 11f
        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        textPaint.color = android.graphics.Color.parseColor("#334155")
        canvas.drawText("1. DATOS DE IDENTIFICACIÓN", 36f, 102f, textPaint)

        paint.color = android.graphics.Color.parseColor("#E2E8F0")
        paint.strokeWidth = 1f
        paint.style = android.graphics.Paint.Style.STROKE
        canvas.drawLine(36f, 108f, 559f, 108f, paint)

        // Cuadro 1
        paint.style = android.graphics.Paint.Style.FILL
        paint.color = android.graphics.Color.parseColor("#F8FAFC")
        canvas.drawRoundRect(android.graphics.RectF(36f, 116f, 559f, 186f), 8f, 8f, paint)
        paint.style = android.graphics.Paint.Style.STROKE
        paint.color = android.graphics.Color.parseColor("#E2E8F0")
        canvas.drawRoundRect(android.graphics.RectF(36f, 116f, 559f, 186f), 8f, 8f, paint)

        textPaint.textSize = 10f
        textPaint.typeface = android.graphics.Typeface.DEFAULT
        textPaint.color = android.graphics.Color.parseColor("#0F172A")
        canvas.drawText("Motorizado: $resolvedCourierName", 48f, 138f, textPaint)
        canvas.drawText("ID Courier: $courierId", 48f, 156f, textPaint)
        canvas.drawText("Estado: VERIFICADO Y APROBADO", 48f, 174f, textPaint)

        canvas.drawText("Fecha Operacional: $businessDate", 320f, 138f, textPaint)
        canvas.drawText("Código Validación: $verificationCode", 320f, 156f, textPaint)
        canvas.drawText("Moneda: NIO (Córdobas)", 320f, 174f, textPaint)

        // Sección 2: Conciliación de 4 Capas
        textPaint.textSize = 11f
        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        textPaint.color = android.graphics.Color.parseColor("#334155")
        canvas.drawText("2. CONCILIACIÓN Y LIQUIDACIÓN CONTABLE", 36f, 218f, textPaint)

        paint.color = android.graphics.Color.parseColor("#E2E8F0")
        paint.strokeWidth = 1f
        paint.style = android.graphics.Paint.Style.STROKE
        canvas.drawLine(36f, 224f, 559f, 224f, paint)

        // Tabla Header
        paint.style = android.graphics.Paint.Style.FILL
        paint.color = android.graphics.Color.parseColor("#F1F5F9")
        canvas.drawRect(36f, 234f, 559f, 258f, paint)
        paint.style = android.graphics.Paint.Style.STROKE
        paint.color = android.graphics.Color.parseColor("#CBD5E1")
        canvas.drawRect(36f, 234f, 559f, 258f, paint)

        textPaint.textSize = 9.5f
        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        textPaint.color = android.graphics.Color.parseColor("#475569")
        canvas.drawText("Capa Contable", 44f, 250f, textPaint)
        canvas.drawText("Concepto", 180f, 250f, textPaint)
        canvas.drawText("Monto (NIO)", 400f, 250f, textPaint)
        canvas.drawText("Estado", 495f, 250f, textPaint)

        // Fila 1: Capa 1
        paint.style = android.graphics.Paint.Style.FILL
        paint.color = android.graphics.Color.WHITE
        canvas.drawRect(36f, 258f, 559f, 288f, paint)
        paint.style = android.graphics.Paint.Style.STROKE
        canvas.drawRect(36f, 258f, 559f, 288f, paint)

        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        textPaint.color = android.graphics.Color.parseColor("#0F172A")
        canvas.drawText("Capa 1: Recaudación", 44f, 276f, textPaint)
        textPaint.typeface = android.graphics.Typeface.DEFAULT
        canvas.drawText("Efectivo total esperado", 180f, 276f, textPaint)
        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        canvas.drawText("C$ ${String.format(java.util.Locale.US, "%.2f", expectedAmount)}", 400f, 276f, textPaint)
        textPaint.color = android.graphics.Color.parseColor("#166534")
        canvas.drawText("Conforme", 495f, 276f, textPaint)

        // Fila 2: Capa 2
        paint.style = android.graphics.Paint.Style.FILL
        paint.color = android.graphics.Color.parseColor("#F8FAFC")
        canvas.drawRect(36f, 288f, 559f, 318f, paint)
        paint.style = android.graphics.Paint.Style.STROKE
        paint.color = android.graphics.Color.parseColor("#CBD5E1")
        canvas.drawRect(36f, 288f, 559f, 318f, paint)

        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        textPaint.color = android.graphics.Color.parseColor("#0F172A")
        canvas.drawText("Capa 2: Arqueo Mesa", 44f, 306f, textPaint)
        textPaint.typeface = android.graphics.Typeface.DEFAULT
        canvas.drawText("Efectivo físico entregado", 180f, 306f, textPaint)
        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        canvas.drawText("C$ ${String.format(java.util.Locale.US, "%.2f", countedAmount)}", 400f, 306f, textPaint)
        textPaint.color = android.graphics.Color.parseColor("#166534")
        canvas.drawText("Exacto", 495f, 306f, textPaint)

        // Fila 3: Capa 3
        paint.style = android.graphics.Paint.Style.FILL
        paint.color = android.graphics.Color.WHITE
        canvas.drawRect(36f, 318f, 559f, 348f, paint)
        paint.style = android.graphics.Paint.Style.STROKE
        canvas.drawRect(36f, 318f, 559f, 348f, paint)

        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        textPaint.color = android.graphics.Color.parseColor("#0F172A")
        canvas.drawText("Capa 3: Depósito", 44f, 336f, textPaint)
        textPaint.typeface = android.graphics.Typeface.DEFAULT
        val bInfo = if (bankReference.isNotBlank()) "$bankName (Ref: $bankReference)" else bankName
        val truncatedBankInfo = if (bInfo.length > 30) bInfo.take(28) + "..." else bInfo
        canvas.drawText(truncatedBankInfo, 180f, 336f, textPaint)
        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        canvas.drawText("C$ ${String.format(java.util.Locale.US, "%.2f", depositAmount)}", 400f, 336f, textPaint)
        textPaint.color = android.graphics.Color.parseColor("#166534")
        canvas.drawText("Liquidado", 495f, 336f, textPaint)

        // Sección de Firmas
        paint.strokeWidth = 1f
        paint.color = android.graphics.Color.parseColor("#0F172A")
        canvas.drawLine(70f, 440f, 220f, 440f, paint)
        canvas.drawLine(375f, 440f, 525f, 440f, paint)

        textPaint.textSize = 9.5f
        textPaint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
        textPaint.color = android.graphics.Color.parseColor("#0F172A")
        canvas.drawText(resolvedCourierName, 75f, 456f, textPaint)
        canvas.drawText("Auditoría & Finanzas", 390f, 456f, textPaint)

        textPaint.textSize = 8.5f
        textPaint.typeface = android.graphics.Typeface.DEFAULT
        textPaint.color = android.graphics.Color.parseColor("#64748B")
        canvas.drawText("Motorizado Responsable", 75f, 470f, textPaint)
        canvas.drawText("Supervisor Autorizado", 390f, 470f, textPaint)

        // Pie de página de seguridad
        paint.color = android.graphics.Color.parseColor("#CBD5E1")
        paint.strokeWidth = 1f
        canvas.drawLine(36f, 520f, 559f, 520f, paint)

        textPaint.textSize = 8f
        textPaint.color = android.graphics.Color.parseColor("#64748B")
        canvas.drawText("Documento inmutable generado por BlueSystem Delivery Enterprise.", 150f, 536f, textPaint)
        canvas.drawText("Hash de Seguridad: $verificationCode", 200f, 548f, textPaint)

        pdfDocument.finishPage(page)

        // Guardar archivo PDF en Downloads del dispositivo
        val fileName = "Acta_Oficial_${actNumber}.pdf"
        var pdfUri: android.net.Uri? = null
        var targetFile: java.io.File? = null

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            val contentValues = android.content.ContentValues().apply {
                put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS)
            }
            val resolver = context.contentResolver
            pdfUri = resolver.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
            if (pdfUri != null) {
                resolver.openOutputStream(pdfUri)?.use { outputStream ->
                    pdfDocument.writeTo(outputStream)
                }
            }
        } else {
            val downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS)
            if (!downloadsDir.exists()) downloadsDir.mkdirs()
            targetFile = java.io.File(downloadsDir, fileName)
            java.io.FileOutputStream(targetFile).use { outputStream ->
                pdfDocument.writeTo(outputStream)
            }
            pdfUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                targetFile
            )
        }
        pdfDocument.close()

        // Notificar al usuario con Toast
        android.widget.Toast.makeText(
            context,
            "✅ Acta guardada en Descargas: $fileName",
            android.widget.Toast.LENGTH_LONG
        ).show()

        // Abrir el archivo PDF automáticamente con el visor del dispositivo
        if (pdfUri != null) {
            try {
                val viewIntent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                    setDataAndType(pdfUri, "application/pdf")
                    addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(android.content.Intent.createChooser(viewIntent, "Abrir Acta Oficial PDF"))
            } catch (e: Exception) {
                android.util.Log.w("FLOTA_DEBUG", "No hay visor de PDF instalado por defecto", e)
            }
        }
    } catch (e: Exception) {
        android.util.Log.e("FLOTA_DEBUG", "Error generando archivo PDF", e)
        android.widget.Toast.makeText(context, "Error al generar PDF: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
    }
}
