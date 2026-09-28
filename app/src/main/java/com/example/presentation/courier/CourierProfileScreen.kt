package com.example.presentation.courier

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import coil.compose.AsyncImage
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import com.example.AuthManager
import com.example.domain.model.courier.CourierOfficialProfile
import com.example.domain.model.courier.CourierProfileRequest
import java.text.SimpleDateFormat
import java.util.*
import kotlinx.coroutines.launch

/**
 * Pantalla integral de perfil canónico y vehículo para repartidores (Actividad #2).
 * Integra visualización de datos vigentes, banner reactivo de solicitudes pendientes (PENDING_REVIEW),
 * e historial de modificaciones con trazabilidad de decisiones administrativas.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierProfileScreen(
    profile: CourierOfficialProfile?,
    pendingRequest: CourierProfileRequest?,
    requestHistory: List<CourierProfileRequest>,
    onBack: () -> Unit,
    onRequestEditProfile: () -> Unit,
    onCancelPendingRequest: (requestId: String) -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val currentUser = remember { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser }
    val official = profile ?: CourierOfficialProfile(
        uid = currentUser?.uid ?: "",
        name = currentUser?.displayName?.ifBlank { currentUser.email } ?: "Repartidor",
        email = currentUser?.email ?: "",
        phone = currentUser?.phoneNumber ?: "",
        nationalId = "",
        vehicleBrand = "",
        vehicleModel = "",
        vehiclePlate = "",
        vehicleYear = 2026,
        vehicleColor = "",
        isApproved = true,
        isActive = true
    )

    val dateFormat = remember { SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()) }
    var showChangePasswordDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Mi Perfil & Vehículo",
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 18.sp
                        )
                        Text(
                            text = "Identidad Canónica & Flota BlueSystem",
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
                actions = {
                    IconButton(onClick = onRequestEditProfile) {
                        Icon(Icons.Default.Edit, contentDescription = "Editar Perfil", tint = Color(0xFF818CF8))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0F172A))
            )
        },
        containerColor = Color(0xFF0B1120)
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(4.dp)) }

            // ── 1. BANNER REACTIVO DE SOLICITUD PENDIENTE ────────────────────
            if (pendingRequest != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        border = CardDefaults.outlinedCardBorder().copy(
                            brush = Brush.horizontalGradient(
                                listOf(Color(0xFFF59E0B), Color(0xFFD97706))
                            )
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        shape = CircleShape,
                                        color = Color(0xFFF59E0B).copy(alpha = 0.2f),
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = Icons.Default.HourglassTop,
                                                contentDescription = null,
                                                tint = Color(0xFFFBBF24),
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = "Solicitud en Revisión",
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFFFBBF24),
                                        fontSize = 14.sp
                                    )
                                }
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFF59E0B).copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = "PENDING_REVIEW",
                                        color = Color(0xFFFBBF24),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Text(
                                text = "Has solicitado actualizar datos sensibles. Tu información oficial actual sigue activa mientras Administración revisa los cambios.",
                                color = Color(0xFFCBD5E1),
                                fontSize = 12.sp,
                                lineHeight = 16.sp
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            val newV = pendingRequest.newValues
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFF0F172A),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        text = "DATOS SOLICITADOS:",
                                        color = Color(0xFF94A3B8),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    if (newV.vehicleBrand.isNotBlank() || newV.vehiclePlate.isNotBlank()) {
                                        Text(
                                            text = "🛵 Moto: ${newV.vehicleBrand} ${newV.vehicleModel} | Placa: ${newV.vehiclePlate}",
                                            color = Color.White,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                    if (newV.phone.isNotBlank()) {
                                        Text(
                                            text = "📱 Teléfono: ${newV.phone}",
                                            color = Color.White,
                                            fontSize = 12.sp
                                        )
                                    }
                                    Text(
                                        text = "Fecha de Envío: ${dateFormat.format(Date(pendingRequest.createdAtMs))}",
                                        color = Color(0xFF64748B),
                                        fontSize = 10.sp,
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ── 2. FICHA DEL MOTORIZADO OFICIAL (CANÓNICO) ───────────────────
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = Brush.horizontalGradient(
                            listOf(Color(0xFF6366F1).copy(alpha = 0.5f), Color(0xFF3B82F6).copy(alpha = 0.5f))
                        )
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = Color(0xFF6366F1),
                                border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFF818CF8)),
                                modifier = Modifier.size(56.dp)
                            ) {
                                if (official.photoUrl.isNotBlank()) {
                                    AsyncImage(
                                        model = official.photoUrl,
                                        contentDescription = "Foto de Perfil",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .clip(CircleShape)
                                    )
                                } else {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            text = official.name.take(1).uppercase().ifEmpty { "M" },
                                            fontWeight = FontWeight.Black,
                                            fontSize = 24.sp,
                                            color = Color.White
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = official.name.ifBlank { "Motorizado Oficial" },
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White,
                                        fontSize = 16.sp
                                    )
                                    if (official.isApproved) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Icon(
                                            imageVector = Icons.Default.CheckCircle,
                                            contentDescription = "Aprobado",
                                            tint = Color(0xFF10B981),
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = "Repartidor Flota Principal",
                                    color = Color(0xFF818CF8),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "UID: ${official.uid.take(12)}...",
                                    color = Color(0xFF64748B),
                                    fontSize = 10.sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                        Divider(color = Color(0xFF334155), thickness = 0.8.dp)
                        Spacer(modifier = Modifier.height(14.dp))

                        // Fila de Datos Personales
                        ProfileInfoRow(icon = Icons.Default.Phone, label = "Teléfono", value = official.phone.ifBlank { "No registrado" })
                        ProfileInfoRow(icon = Icons.Default.Email, label = "Correo", value = official.email.ifBlank { "No registrado" })
                        ProfileInfoRow(icon = Icons.Default.Badge, label = "Cédula de Identidad", value = official.nationalId.ifBlank { "No registrada" })
                        if (official.department.isNotBlank() || official.city.isNotBlank()) {
                            ProfileInfoRow(
                                icon = Icons.Default.LocationOn,
                                label = "Zona Operativa",
                                value = "${official.city.ifBlank { "Managua" }}, ${official.department.ifBlank { "Managua" }}"
                            )
                        }
                    }
                }
            }

            // ── 3. FICHA DEL VEHÍCULO OFICIAL VIGENTE ─────────────────────────
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                    border = CardDefaults.outlinedCardBorder().copy(
                        brush = Brush.horizontalGradient(
                            listOf(Color(0xFF10B981).copy(alpha = 0.4f), Color(0xFF059669).copy(alpha = 0.4f))
                        )
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFF10B981).copy(alpha = 0.15f),
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.DirectionsBike,
                                            contentDescription = null,
                                            tint = Color(0xFF34D399),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "Motocicleta Oficial Activa",
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontSize = 15.sp
                                    )
                                    Text(
                                        text = "Dato Vigente en Flota y Driver Card",
                                        color = Color(0xFF94A3B8),
                                        fontSize = 11.sp
                                    )
                                }
                            }

                            // Placa Oficial Estilizada
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF0F172A),
                                border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFFBBF24))
                            ) {
                                Text(
                                    text = official.vehiclePlate.ifBlank { "M 000-000" },
                                    color = Color(0xFFFBBF24),
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))
                        Divider(color = Color(0xFF334155), thickness = 0.8.dp)
                        Spacer(modifier = Modifier.height(14.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("MARCA & MODELO", color = Color(0xFF94A3B8), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                Text(
                                    text = "${official.vehicleBrand.ifBlank { "Yamaha" }} ${official.vehicleModel.ifBlank { "FZ 25" }}",
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("AÑO & COLOR", color = Color(0xFF94A3B8), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                Text(
                                    text = "${official.vehicleYear} • ${official.vehicleColor.ifBlank { "Negro" }}",
                                    color = Color(0xFFCBD5E1),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            // ── 4. ESTADO DE DOCUMENTACIÓN ───────────────────────────────────
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "EXPEDIENTE DOCUMENTAL",
                            color = Color(0xFF818CF8),
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        DocumentStatusRow("Cédula de Identidad", "Vigente / Aprobada", true)
                        DocumentStatusRow("Licencia de Conducir", "Vigente / Aprobada", true)
                        DocumentStatusRow("Circulación Vehicular", "Vigente / Aprobada", true)
                        DocumentStatusRow("Póliza de Seguro", "Vigente / Aprobada", true)
                    }
                }
            }


            // ── 5. HISTORIAL DE SOLICITUDES DE MODIFICACIÓN ──────────────────
            if (requestHistory.isNotEmpty()) {
                item {
                    Text(
                        text = "HISTORIAL DE MODIFICACIONES (${requestHistory.size})",
                        color = Color(0xFF94A3B8),
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp,
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                items(requestHistory) { req ->
                    RequestHistoryItem(req = req, dateFormat = dateFormat)
                }
            }

            // ── 6. ACCIONES: MODIFICAR PERFIL Y CERRAR SESIÓN ──────────────────
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = onRequestEditProfile,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.DirectionsBike, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Solicitar Modificación de Perfil / Moto",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 14.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = { showChangePasswordDialog = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFF6366F1).copy(alpha = 0.6f))
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LockReset, contentDescription = null, tint = Color(0xFF818CF8), modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Cambiar Contraseña",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFEF4444)),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = Color(0xFFEF4444).copy(alpha = 0.1f),
                        contentColor = Color(0xFFF87171)
                    )
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Cerrar Sesión", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Cerrar Sesión",
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = Color(0xFFEF4444)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(28.dp))
            }
        }
    }

    if (showChangePasswordDialog) {
        CourierChangePasswordDialog(
            onDismiss = { showChangePasswordDialog = false }
        )
    }
}

@Composable
private fun ProfileInfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color(0xFF64748B),
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(text = label, color = Color(0xFF94A3B8), fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Text(text = value, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun DocumentStatusRow(title: String, statusText: String, isApproved: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.Description,
                contentDescription = null,
                tint = Color(0xFF818CF8),
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = title, color = Color(0xFFE2E8F0), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
        Surface(
            shape = RoundedCornerShape(6.dp),
            color = if (isApproved) Color(0xFF10B981).copy(alpha = 0.15f) else Color(0xFFEF4444).copy(alpha = 0.15f)
        ) {
            Text(
                text = if (isApproved) "✓ $statusText" else "✕ $statusText",
                color = if (isApproved) Color(0xFF34D399) else Color(0xFFF87171),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
            )
        }
    }
}

@Composable
private fun RequestHistoryItem(req: CourierProfileRequest, dateFormat: SimpleDateFormat) {
    val statusColor = when (req.status) {
        "APPROVED" -> Color(0xFF10B981)
        "REJECTED" -> Color(0xFFEF4444)
        "CANCELLED" -> Color(0xFF64748B)
        else -> Color(0xFFF59E0B)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = req.requestId.ifBlank { "Solicitud" },
                    color = Color(0xFF818CF8),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = statusColor.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = req.status,
                        color = statusColor,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            val newV = req.newValues
            Text(
                text = "Cambio a: ${newV.vehicleBrand} ${newV.vehicleModel} (${newV.vehiclePlate})",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )

            if (req.rejectionReason.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Motivo de rechazo: ${req.rejectionReason}",
                    color = Color(0xFFF87171),
                    fontSize = 11.sp
                )
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = dateFormat.format(Date(req.createdAtMs)),
                color = Color(0xFF64748B),
                fontSize = 10.sp
            )
        }
    }
}

/**
 * Diálogo seguro para cambio de contraseña del motorizado.
 * Reautentica con Firebase Auth y actualiza la clave en vivo sin salir de la app.
 */
@Composable
private fun CourierChangePasswordDialog(
    onDismiss: () -> Unit
) {
    val authManager = remember { AuthManager() }
    val coroutineScope = rememberCoroutineScope()

    var currentPass by remember { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
    var confirmNewPass by remember { mutableStateOf("") }

    var currentPassVisible by remember { mutableStateOf(false) }
    var newPassVisible by remember { mutableStateOf(false) }
    var confirmNewPassVisible by remember { mutableStateOf(false) }

    var isUpdating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    val activeColor = Color(0xFF6366F1)
    val tfColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        focusedLabelColor = activeColor,
        unfocusedLabelColor = Color(0xFF94A3B8),
        focusedLeadingIconColor = activeColor,
        unfocusedLeadingIconColor = Color(0xFF94A3B8),
        focusedTrailingIconColor = activeColor,
        unfocusedTrailingIconColor = Color(0xFF94A3B8),
        focusedBorderColor = activeColor,
        unfocusedBorderColor = Color(0xFF334155),
        focusedContainerColor = Color(0xFF0F172A),
        unfocusedContainerColor = Color(0xFF0F172A)
    )

    AlertDialog(
        onDismissRequest = {
            if (!isUpdating) onDismiss()
        },
        containerColor = Color(0xFF1E293B),
        titleContentColor = Color.White,
        textContentColor = Color(0xFF94A3B8),
        icon = {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(activeColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.LockReset,
                    contentDescription = null,
                    tint = activeColor,
                    modifier = Modifier.size(26.dp)
                )
            }
        },
        title = {
            Text(
                text = "Cambiar Contraseña",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = Color.White
            )
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Introduce tu contraseña actual (o temporal) y define la nueva clave para acceder a la aplicación.",
                    fontSize = 13.sp,
                    color = Color(0xFF94A3B8)
                )

                // Contraseña Actual
                OutlinedTextField(
                    value = currentPass,
                    onValueChange = {
                        currentPass = it
                        errorMessage = null
                    },
                    label = { Text("Contraseña Actual") },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                    visualTransformation = if (currentPassVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { currentPassVisible = !currentPassVisible }) {
                            Icon(
                                imageVector = if (currentPassVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = null
                            )
                        }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true,
                    colors = tfColors
                )

                // Nueva Contraseña
                OutlinedTextField(
                    value = newPass,
                    onValueChange = {
                        newPass = it
                        errorMessage = null
                    },
                    label = { Text("Nueva Contraseña (mín. 6 car.)") },
                    leadingIcon = { Icon(Icons.Default.Key, contentDescription = null) },
                    visualTransformation = if (newPassVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { newPassVisible = !newPassVisible }) {
                            Icon(
                                imageVector = if (newPassVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = null
                            )
                        }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true,
                    colors = tfColors
                )

                // Confirmar Nueva Contraseña
                OutlinedTextField(
                    value = confirmNewPass,
                    onValueChange = {
                        confirmNewPass = it
                        errorMessage = null
                    },
                    label = { Text("Confirmar Nueva Contraseña") },
                    leadingIcon = { Icon(Icons.Default.Key, contentDescription = null) },
                    visualTransformation = if (confirmNewPassVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { confirmNewPassVisible = !confirmNewPassVisible }) {
                            Icon(
                                imageVector = if (confirmNewPassVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                contentDescription = null
                            )
                        }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    singleLine = true,
                    colors = tfColors
                )

                if (errorMessage != null) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFFEF4444).copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = errorMessage!!,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFFFCA5A5),
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                if (successMessage != null) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = successMessage!!,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color(0xFF6EE7B7),
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (currentPass.isBlank()) {
                        errorMessage = "Por favor, ingresa tu contraseña actual."
                        return@Button
                    }
                    if (newPass.length < 6) {
                        errorMessage = "La nueva contraseña debe tener al menos 6 caracteres."
                        return@Button
                    }
                    if (newPass != confirmNewPass) {
                        errorMessage = "Las contraseñas nuevas no coinciden."
                        return@Button
                    }
                    if (currentPass == newPass) {
                        errorMessage = "La nueva contraseña no puede ser idéntica a la actual."
                        return@Button
                    }

                    isUpdating = true
                    errorMessage = null
                    successMessage = null

                    coroutineScope.launch {
                        val result = authManager.cambiarContrasena(currentPass, newPass)
                        isUpdating = false
                        result.fold(
                            onSuccess = {
                                successMessage = "¡Contraseña actualizada exitosamente!"
                                kotlinx.coroutines.delay(1200)
                                onDismiss()
                            },
                            onFailure = { error ->
                                errorMessage = error.localizedMessage ?: "Error al actualizar la contraseña"
                            }
                        )
                    }
                },
                enabled = !isUpdating,
                colors = ButtonDefaults.buttonColors(containerColor = activeColor)
            ) {
                if (isUpdating) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Text("Guardar Clave", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !isUpdating
            ) {
                Text("Cancelar", color = Color(0xFF94A3B8))
            }
        }
    )
}

