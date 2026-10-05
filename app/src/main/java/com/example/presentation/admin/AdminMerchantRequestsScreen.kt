package com.example.presentation.admin

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BluePrimary
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class MerchantApplication(
    val id: String = "",
    val businessName: String = "",
    val ownerName: String = "",
    val email: String = "",
    val phone: String = "",
    val city: String = "",
    val municipality: String = "",
    val address: String = "",
    val category: String = "",
    val ruc: String = "",
    val status: String = "PENDING", // PENDING, APPROVED, REJECTED, CORRECTION_REQUIRED
    val createdAtMillis: Long = 0L,
    val documentUrl: String = "",
    val branchesCount: Int = 1
)

/**
 * MÓDULO 1: Solicitudes de Comercio (AdminMerchantRequestsScreen).
 *
 * Permite visualizar solicitudes reales de registro de comercios desde /merchant_applications,
 * consultar expediente completo y aplicar decisiones de aprobación/rechazo server-authoritative
 * con auditoría inmutable en /audit_events.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminMerchantRequestsScreen(
    onBack: () -> Unit,
    onNavigateToDetail: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }
    val currentAdminUid = auth.currentUser?.uid ?: "admin"

    var applications by remember { mutableStateOf<List<MerchantApplication>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedStatusFilter by remember { mutableStateOf("ALL") }
    var selectedAppForDetail by remember { mutableStateOf<MerchantApplication?>(null) }
    var isProcessingAction by remember { mutableStateOf(false) }

    // Cargar solicitudes en tiempo real desde /merchant_applications
    DisposableEffect(Unit) {
        val listener = db.collection("merchant_applications")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                isLoading = false
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val data = doc.data ?: return@mapNotNull null
                        MerchantApplication(
                            id = doc.id,
                            businessName = data["businessName"] as? String ?: data["nombreComercio"] as? String ?: "Comercio sin nombre",
                            ownerName = data["ownerName"] as? String ?: data["nombrePropietario"] as? String ?: data["owner"] as? String ?: "Propietario no especificado",
                            email = data["email"] as? String ?: data["correo"] as? String ?: "",
                            phone = data["phone"] as? String ?: data["telefono"] as? String ?: "",
                            city = data["city"] as? String ?: data["ciudad"] as? String ?: "Managua",
                            municipality = data["municipality"] as? String ?: data["municipio"] as? String ?: "",
                            address = data["address"] as? String ?: data["direccion"] as? String ?: "",
                            category = data["category"] as? String ?: data["categoria"] as? String ?: "Restaurante",
                            ruc = data["ruc"] as? String ?: "",
                            status = (data["status"] as? String ?: "PENDING").uppercase(),
                            createdAtMillis = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: System.currentTimeMillis(),
                            documentUrl = data["documentUrl"] as? String ?: data["cedulaUrl"] as? String ?: "",
                            branchesCount = (data["branchesCount"] as? Number)?.toInt() ?: 1
                        )
                    }
                    applications = list
                }
            }

        onDispose { listener.remove() }
    }

    val filteredApps = remember(applications, selectedStatusFilter) {
        when (selectedStatusFilter) {
            "PENDING" -> applications.filter { it.status == "PENDING" }
            "APPROVED" -> applications.filter { it.status == "APPROVED" }
            "REJECTED" -> applications.filter { it.status == "REJECTED" }
            else -> applications
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Solicitudes de Comercio", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Altas y homologación comercial", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
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
            // Filtros de estado
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedStatusFilter == "ALL",
                        onClick = { selectedStatusFilter = "ALL" },
                        label = { Text("Todas (${applications.size})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedStatusFilter == "PENDING",
                        onClick = { selectedStatusFilter = "PENDING" },
                        label = { Text("Pendientes (${applications.count { it.status == "PENDING" }})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedStatusFilter == "APPROVED",
                        onClick = { selectedStatusFilter = "APPROVED" },
                        label = { Text("Aprobadas (${applications.count { it.status == "APPROVED" }})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedStatusFilter == "REJECTED",
                        onClick = { selectedStatusFilter = "REJECTED" },
                        label = { Text("Rechazadas (${applications.count { it.status == "REJECTED" }})", fontSize = 11.sp) }
                    )
                }
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BluePrimary)
                }
            } else if (filteredApps.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Storefront, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        Text("No hay solicitudes de comercio en esta vista", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredApps, key = { it.id }) { app ->
                        MerchantApplicationCard(
                            app = app,
                            onViewDetail = { selectedAppForDetail = app },
                            onApprove = {
                                coroutineScope.launch {
                                    isProcessingAction = true
                                    try {
                                        // 1. Actualizar estado de la solicitud en Firestore
                                        db.collection("merchant_applications").document(app.id).update(
                                            mapOf(
                                                "status" to "APPROVED",
                                                "approvedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                                                "approvedBy" to currentAdminUid
                                            )
                                        ).await()

                                        // 2. Registrar evento de auditoría
                                        db.collection("audit_events").add(
                                            mapOf(
                                                "actorUid" to currentAdminUid,
                                                "actorRole" to "ADMIN",
                                                "action" to "ADMIN_APPROVE_MERCHANT_APPLICATION",
                                                "module" to "MERCHANT_ONBOARDING",
                                                "targetType" to "merchant_application",
                                                "targetId" to app.id,
                                                "businessName" to app.businessName,
                                                "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            )
                                        ).await()

                                        Toast.makeText(context, "Comercio '${app.businessName}' aprobado exitosamente", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Error al aprobar: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                                    } finally {
                                        isProcessingAction = false
                                    }
                                }
                            },
                            onReject = {
                                coroutineScope.launch {
                                    isProcessingAction = true
                                    try {
                                        db.collection("merchant_applications").document(app.id).update(
                                            mapOf(
                                                "status" to "REJECTED",
                                                "rejectedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                                                "rejectedBy" to currentAdminUid
                                            )
                                        ).await()

                                        db.collection("audit_events").add(
                                            mapOf(
                                                "actorUid" to currentAdminUid,
                                                "actorRole" to "ADMIN",
                                                "action" to "ADMIN_REJECT_MERCHANT_APPLICATION",
                                                "module" to "MERCHANT_ONBOARDING",
                                                "targetType" to "merchant_application",
                                                "targetId" to app.id,
                                                "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            )
                                        ).await()

                                        Toast.makeText(context, "Solicitud rechazada", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Error al rechazar: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                                    } finally {
                                        isProcessingAction = false
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    // Modal de detalle completo
    selectedAppForDetail?.let { app ->
        AlertDialog(
            onDismissRequest = { selectedAppForDetail = null },
            title = {
                Text(app.businessName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Propietario: ${app.ownerName}", fontSize = 12.sp)
                    Text("Correo: ${app.email}", fontSize = 12.sp)
                    Text("Teléfono: ${app.phone}", fontSize = 12.sp)
                    Text("Ciudad/Municipio: ${app.city} / ${app.municipality}", fontSize = 12.sp)
                    Text("Dirección: ${app.address}", fontSize = 12.sp)
                    Text("Categoría: ${app.category}", fontSize = 12.sp)
                    Text("RUC: ${app.ruc.ifBlank { "No registrado" }}", fontSize = 12.sp)
                    Text("Sucursales: ${app.branchesCount}", fontSize = 12.sp)
                    Text("Estado: ${app.status}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedAppForDetail = null }) {
                    Text("Cerrar")
                }
            }
        )
    }
}

@Composable
private fun MerchantApplicationCard(
    app: MerchantApplication,
    onViewDetail: () -> Unit,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    val statusColor = when (app.status) {
        "APPROVED" -> Color(0xFF10B981)
        "REJECTED" -> Color(0xFFDC2626)
        "CORRECTION_REQUIRED" -> Color(0xFFD97706)
        else -> Color(0xFF2563EB)
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
                            .size(40.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0xFFEEF2FF)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Storefront, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(22.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(app.businessName, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = Color(0xFF0F172A))
                        Text("Propietario: ${app.ownerName}", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                }

                Surface(
                    color = statusColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        app.status,
                        color = statusColor,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("📍 ${app.city}", fontSize = 11.sp, color = Color(0xFF64748B))
                Text("📞 ${app.phone}", fontSize = 11.sp, color = Color(0xFF64748B))
                Text("🏷️ ${app.category}", fontSize = 11.sp, color = Color(0xFF64748B))
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
                    Text("Detalle", fontSize = 11.sp)
                }

                if (app.status == "PENDING") {
                    Button(
                        onClick = onApprove,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Aprobar", fontSize = 11.sp, color = Color.White)
                    }

                    Button(
                        onClick = onReject,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Rechazar", fontSize = 11.sp, color = Color.White)
                    }
                }
            }
        }
    }
}
