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
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class CourierProfileRequest(
    val id: String = "",
    val courierId: String = "",
    val courierName: String = "",
    val phone: String = "",
    val requestedVehicle: String = "",
    val requestedPlate: String = "",
    val currentPlate: String = "",
    val reason: String = "",
    val status: String = "PENDING_REVIEW", // PENDING_REVIEW, APPROVED, REJECTED
    val createdAtMillis: Long = 0L
)

/**
 * MÓDULO 3: Modificaciones Perfil Motorizados (AdminCourierProfileManagementScreen).
 *
 * Permite revisar y dictaminar solicitudes de actualización de perfil enviadas por los repartidores
 * (cambio de placa, vehículo, teléfono) y gestionar parámetros administrativos autorizados
 * bajo estricto registro de auditoría /audit_events.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminCourierProfileManagementScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }
    val currentAdminUid = auth.currentUser?.uid ?: "admin"

    var requests by remember { mutableStateOf<List<CourierProfileRequest>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedStatusFilter by remember { mutableStateOf("PENDING_REVIEW") }

    DisposableEffect(Unit) {
        val listener = db.collection("courier_profile_requests")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                isLoading = false
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val data = doc.data ?: return@mapNotNull null
                        CourierProfileRequest(
                            id = doc.id,
                            courierId = data["courierId"] as? String ?: "",
                            courierName = data["courierName"] as? String ?: data["nombre"] as? String ?: "Motorizado",
                            phone = data["phone"] as? String ?: data["telefono"] as? String ?: "",
                            requestedVehicle = data["requestedVehicle"] as? String ?: data["vehiculo"] as? String ?: "",
                            requestedPlate = data["requestedPlate"] as? String ?: data["placaNueva"] as? String ?: "",
                            currentPlate = data["currentPlate"] as? String ?: data["placaActual"] as? String ?: "",
                            reason = data["reason"] as? String ?: data["motivo"] as? String ?: "Actualización de vehículo",
                            status = (data["status"] as? String ?: "PENDING_REVIEW").uppercase(),
                            createdAtMillis = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: System.currentTimeMillis()
                        )
                    }
                    requests = list
                }
            }

        onDispose { listener.remove() }
    }

    val filteredRequests = remember(requests, selectedStatusFilter) {
        if (selectedStatusFilter == "ALL") requests else requests.filter { it.status == selectedStatusFilter }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Modificaciones de Perfil", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Gobernanza de flota y vehículos", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
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
                    selected = selectedStatusFilter == "PENDING_REVIEW",
                    onClick = { selectedStatusFilter = "PENDING_REVIEW" },
                    label = { Text("Pendientes (${requests.count { it.status == "PENDING_REVIEW" }})", fontSize = 11.sp) }
                )
                FilterChip(
                    selected = selectedStatusFilter == "APPROVED",
                    onClick = { selectedStatusFilter = "APPROVED" },
                    label = { Text("Aprobadas (${requests.count { it.status == "APPROVED" }})", fontSize = 11.sp) }
                )
                FilterChip(
                    selected = selectedStatusFilter == "ALL",
                    onClick = { selectedStatusFilter = "ALL" },
                    label = { Text("Todas (${requests.size})", fontSize = 11.sp) }
                )
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BluePrimary)
                }
            } else if (filteredRequests.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Badge, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        Text("No hay solicitudes de cambio de perfil", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredRequests, key = { it.id }) { req ->
                        ProfileChangeCard(
                            req = req,
                            onApprove = {
                                coroutineScope.launch {
                                    try {
                                        // 1. Actualizar solicitud
                                        db.collection("courier_profile_requests").document(req.id).update(
                                            mapOf(
                                                "status" to "APPROVED",
                                                "approvedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                                                "approvedBy" to currentAdminUid
                                            )
                                        ).await()

                                        // 2. Si hay nueva placa o vehículo, actualizar /couriers/{id}
                                        if (req.requestedPlate.isNotBlank() || req.requestedVehicle.isNotBlank()) {
                                            val updates = mutableMapOf<String, Any>()
                                            if (req.requestedPlate.isNotBlank()) {
                                                updates["placa"] = req.requestedPlate
                                                updates["plate"] = req.requestedPlate
                                            }
                                            if (req.requestedVehicle.isNotBlank()) {
                                                updates["vehiculo"] = req.requestedVehicle
                                                updates["vehicleType"] = req.requestedVehicle
                                            }
                                            updates["updatedAt"] = com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            db.collection("couriers").document(req.courierId).update(updates).await()
                                        }

                                        // 3. Auditoría
                                        db.collection("audit_events").add(
                                            mapOf(
                                                "actorUid" to currentAdminUid,
                                                "actorRole" to "ADMIN",
                                                "action" to "ADMIN_APPROVE_COURIER_PROFILE_CHANGE",
                                                "module" to "COURIER_FLEET",
                                                "targetType" to "courier",
                                                "targetId" to req.courierId,
                                                "newPlate" to req.requestedPlate,
                                                "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            )
                                        ).await()

                                        Toast.makeText(context, "Modificación aprobada", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                                    }
                                }
                            },
                            onReject = {
                                coroutineScope.launch {
                                    try {
                                        db.collection("courier_profile_requests").document(req.id).update(
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
                                                "action" to "ADMIN_REJECT_COURIER_PROFILE_CHANGE",
                                                "module" to "COURIER_FLEET",
                                                "targetType" to "courier",
                                                "targetId" to req.courierId,
                                                "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            )
                                        ).await()

                                        Toast.makeText(context, "Modificación rechazada", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileChangeCard(
    req: CourierProfileRequest,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    val statusColor = when (req.status) {
        "APPROVED" -> Color(0xFF10B981)
        "REJECTED" -> Color(0xFFDC2626)
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
                            .background(Color(0xFFFEF3C7)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Badge, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(req.courierName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                        Text("ID: ${req.courierId.take(8)}...", fontSize = 10.5.sp, color = Color(0xFF64748B))
                    }
                }

                Surface(
                    color = statusColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        req.status,
                        color = statusColor,
                        fontSize = 8.5.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text("Motivo: ${req.reason}", fontSize = 11.5.sp, color = Color(0xFF334155))
            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Placa Solicitada: ${req.requestedPlate}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                Text("Vehículo: ${req.requestedVehicle}", fontSize = 11.sp, color = Color(0xFF64748B))
            }

            if (req.status == "PENDING_REVIEW") {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onApprove,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Aprobar Cambio", fontSize = 11.sp, color = Color.White)
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
