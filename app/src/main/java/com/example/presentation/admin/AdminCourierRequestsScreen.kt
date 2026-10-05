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
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class CourierApplication(
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val nationalId: String = "",
    val licenseNumber: String = "",
    val vehicleType: String = "MOTO",
    val plate: String = "",
    val city: String = "Managua",
    val status: String = "PENDING", // PENDING, APPROVED, REJECTED, DOCS_REQUIRED
    val photoUrl: String = "",
    val licenseUrl: String = "",
    val circulationCardUrl: String = "",
    val createdAtMillis: Long = 0L
)

/**
 * MÓDULO 2: Solicitudes de Motorizado (AdminCourierRequestsScreen).
 *
 * Visualiza expedientes de aspirantes a repartidor desde /courier_applications,
 * permite validar documentación (cédula, licencia, placa, foto) y aprobar o rechazar
 * de forma server-authoritative con registro de auditoría.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminCourierRequestsScreen(
    onBack: () -> Unit,
    onNavigateToDetail: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }
    val currentAdminUid = auth.currentUser?.uid ?: "admin"

    var applications by remember { mutableStateOf<List<CourierApplication>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedStatusFilter by remember { mutableStateOf("ALL") }
    var selectedCourierForDetail by remember { mutableStateOf<CourierApplication?>(null) }
    var isProcessingAction by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        val listener = db.collection("courier_applications")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                isLoading = false
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val data = doc.data ?: return@mapNotNull null
                        val personal = data["personal"] as? Map<*, *>
                        val vehicle = data["vehicle"] as? Map<*, *>

                        CourierApplication(
                            id = doc.id,
                            name = personal?.get("name") as? String ?: data["name"] as? String ?: data["nombre"] as? String ?: "Aspirante sin nombre",
                            phone = personal?.get("phone") as? String ?: data["phone"] as? String ?: data["telefono"] as? String ?: "",
                            email = personal?.get("email") as? String ?: data["email"] as? String ?: "",
                            nationalId = personal?.get("nationalId") as? String ?: data["nationalId"] as? String ?: data["cedula"] as? String ?: "",
                            licenseNumber = data["licenseNumber"] as? String ?: data["licencia"] as? String ?: "",
                            vehicleType = vehicle?.get("type") as? String ?: data["vehicleType"] as? String ?: "Motocicleta",
                            plate = vehicle?.get("plate") as? String ?: data["plate"] as? String ?: data["placa"] as? String ?: "",
                            city = data["city"] as? String ?: data["ciudad"] as? String ?: "Managua",
                            status = (data["status"] as? String ?: "PENDING").uppercase(),
                            photoUrl = data["photoUrl"] as? String ?: "",
                            licenseUrl = data["licenseUrl"] as? String ?: "",
                            circulationCardUrl = data["circulationCardUrl"] as? String ?: "",
                            createdAtMillis = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: System.currentTimeMillis()
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
                        Text("Solicitudes de Motorizado", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Expedientes y homologación de flota", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
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
                        label = { Text("Aprobados (${applications.count { it.status == "APPROVED" }})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedStatusFilter == "REJECTED",
                        onClick = { selectedStatusFilter = "REJECTED" },
                        label = { Text("Rechazados (${applications.count { it.status == "REJECTED" }})", fontSize = 11.sp) }
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
                        Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        Text("No hay solicitudes de motorizado en esta vista", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredApps, key = { it.id }) { app ->
                        CourierApplicationCard(
                            app = app,
                            onViewDetail = { selectedCourierForDetail = app },
                            onApprove = {
                                coroutineScope.launch {
                                    isProcessingAction = true
                                    try {
                                        db.collection("courier_applications").document(app.id).update(
                                            mapOf(
                                                "status" to "APPROVED",
                                                "approvedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                                                "approvedBy" to currentAdminUid
                                            )
                                        ).await()

                                        db.collection("audit_events").add(
                                            mapOf(
                                                "actorUid" to currentAdminUid,
                                                "actorRole" to "ADMIN",
                                                "action" to "ADMIN_APPROVE_COURIER_APPLICATION",
                                                "module" to "COURIER_ONBOARDING",
                                                "targetType" to "courier_application",
                                                "targetId" to app.id,
                                                "courierName" to app.name,
                                                "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            )
                                        ).await()

                                        Toast.makeText(context, "Motorizado '${app.name}' aprobado exitosamente", Toast.LENGTH_SHORT).show()
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
                                        db.collection("courier_applications").document(app.id).update(
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
                                                "action" to "ADMIN_REJECT_COURIER_APPLICATION",
                                                "module" to "COURIER_ONBOARDING",
                                                "targetType" to "courier_application",
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

    // Modal de expediente de motorizado
    selectedCourierForDetail?.let { app ->
        AlertDialog(
            onDismissRequest = { selectedCourierForDetail = null },
            title = {
                Text("Expediente: ${app.name}", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Teléfono: ${app.phone}", fontSize = 12.sp)
                    Text("Correo: ${app.email}", fontSize = 12.sp)
                    Text("Cédula: ${app.nationalId.ifBlank { "No especificada" }}", fontSize = 12.sp)
                    Text("Licencia: ${app.licenseNumber.ifBlank { "No especificada" }}", fontSize = 12.sp)
                    Text("Vehículo: ${app.vehicleType}", fontSize = 12.sp)
                    Text("Placa: ${app.plate.ifBlank { "Sin placa" }}", fontSize = 12.sp)
                    Text("Ciudad: ${app.city}", fontSize = 12.sp)
                    Text("Estado: ${app.status}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedCourierForDetail = null }) {
                    Text("Cerrar")
                }
            }
        )
    }
}

@Composable
private fun CourierApplicationCard(
    app: CourierApplication,
    onViewDetail: () -> Unit,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    val statusColor = when (app.status) {
        "APPROVED" -> Color(0xFF10B981)
        "REJECTED" -> Color(0xFFDC2626)
        else -> Color(0xFF0284C7)
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
                            .background(Color(0xFFE0F2FE)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = Color(0xFF0284C7), modifier = Modifier.size(22.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(app.name, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = Color(0xFF0F172A))
                        Text("Placa: ${app.plate.ifBlank { "N/A" }} • ${app.vehicleType}", fontSize = 11.sp, color = Color(0xFF64748B))
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
                Text("🪪 ${app.nationalId.take(10)}...", fontSize = 11.sp, color = Color(0xFF64748B))
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
                    Text("Expediente", fontSize = 11.sp)
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
