package com.example.presentation.admin

import android.content.Intent
import android.net.Uri
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
import com.example.DriverUser
import com.example.FirebaseManager
import com.example.MotorizadoActivo
import com.example.ui.theme.BluePrimary

/**
 * MÓDULO 7: Live Courier Monitor & Telemetría (AdminLiveCourierMonitorScreen).
 *
 * Supervisión de la flota en tiempo real consumiendo /ubicaciones_repartidores/{courierId}:
 * - Estado operativo (Online Disponible, Ocupado en Ruta, En Pausa, Offline).
 * - Coordenadas GPS satelitales en tiempo real.
 * - Acciones rápidas de enlace telefónico.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminLiveCourierMonitorScreen(
    onBack: () -> Unit,
    firebaseManager: FirebaseManager
) {
    val context = LocalContext.current
    val motorizadosGps by firebaseManager.obtenerFlujoMotorizadosActivos().collectAsState(initial = emptyList())
    val registeredDrivers by firebaseManager.listenToDrivers().collectAsState(initial = emptyList())

    var selectedStatusFilter by remember { mutableStateOf("ALL") }
    var searchQuery by remember { mutableStateOf("") }

    val resolvedCouriers = remember(motorizadosGps, registeredDrivers) {
        motorizadosGps.map { courier ->
            val matchingDriver = registeredDrivers.firstOrNull { it.uid == courier.id }
            val realName = matchingDriver?.nombre?.takeIf { it.isNotBlank() }
                ?: courier.nombre.takeIf { !it.startsWith("Motorizado ") || it.length > 15 }
                ?: matchingDriver?.email?.takeIf { it.isNotBlank() }
                ?: courier.nombre

            courier to (matchingDriver?.copy(nombre = realName) ?: DriverUser(uid = courier.id, nombre = realName))
        }
    }

    val filteredCouriers = remember(resolvedCouriers, searchQuery, selectedStatusFilter) {
        resolvedCouriers.filter { (courier, driver) ->
            val matchQuery = searchQuery.isBlank() ||
                    driver.nombre.contains(searchQuery, ignoreCase = true) ||
                    driver.email.contains(searchQuery, ignoreCase = true) ||
                    driver.telefono.contains(searchQuery, ignoreCase = true) ||
                    courier.id.contains(searchQuery, ignoreCase = true)

            val isAvailable = courier.estado.lowercase() in listOf("disponible", "activo", "online")
            val matchStatus = when (selectedStatusFilter) {
                "ONLINE" -> isAvailable
                "BUSY" -> !isAvailable
                else -> true
            }

            matchQuery && matchStatus
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Live Courier Monitor", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Telemetría satelital y estado de flota", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
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
            // Buscador
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar motorizado por nombre o ID...", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(18.dp)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = Color.White,
                    focusedContainerColor = Color.White,
                    unfocusedBorderColor = Color(0xFFE2E8F0)
                )
            )

            // Filtros de telemetría
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedStatusFilter == "ALL",
                        onClick = { selectedStatusFilter = "ALL" },
                        label = { Text("Flota Activa (${resolvedCouriers.size})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedStatusFilter == "ONLINE",
                        onClick = { selectedStatusFilter = "ONLINE" },
                        label = { Text("Disponibles (${resolvedCouriers.count { it.first.estado.lowercase() in listOf("disponible", "activo", "online") }})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedStatusFilter == "BUSY",
                        onClick = { selectedStatusFilter = "BUSY" },
                        label = { Text("Ocupados en Ruta (${resolvedCouriers.count { it.first.estado.lowercase() !in listOf("disponible", "activo", "online") }})", fontSize = 11.sp) }
                    )
                }
            }

            if (filteredCouriers.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.GpsOff, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        Text("No hay motorizados transmitiendo telemetría", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredCouriers, key = { it.first.id }) { (courier, driver) ->
                        LiveCourierCard(
                            courier = courier,
                            displayName = driver.nombre,
                            phone = driver.telefono,
                            email = driver.email,
                            onCall = { phoneToCall ->
                                if (phoneToCall.isNotBlank()) {
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phoneToCall"))
                                    context.startActivity(intent)
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
private fun LiveCourierCard(
    courier: MotorizadoActivo,
    displayName: String,
    phone: String,
    email: String,
    onCall: (String) -> Unit
) {
    val isOnline = courier.estado.lowercase() in listOf("disponible", "activo", "online")
    val statusColor = if (isOnline) Color(0xFF10B981) else Color(0xFF2563EB)
    val statusText = if (isOnline) "ONLINE DISPONIBLE" else "OCUPADO EN RUTA"

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
                            .clip(CircleShape)
                            .background(statusColor.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = statusColor, modifier = Modifier.size(22.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(displayName, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = Color(0xFF0F172A))
                        if (email.isNotBlank() && !email.equals(displayName, ignoreCase = true)) {
                            Text(email, fontSize = 10.sp, color = Color(0xFF64748B))
                        }
                        Text("ID: ${courier.id.take(8)}...", fontSize = 9.5.sp, color = Color(0xFF94A3B8))
                    }
                }

                Surface(
                    color = statusColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        statusText,
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
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Coordenadas GPS", fontSize = 10.sp, color = Color(0xFF64748B))
                    Text("${String.format("%.4f", courier.latitud)}, ${String.format("%.4f", courier.longitud)}", fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B))
                }

                if (phone.isNotBlank()) {
                    IconButton(
                        onClick = { onCall(phone) },
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color(0xFFEFF6FF), CircleShape)
                    ) {
                        Icon(Icons.Default.Phone, contentDescription = "Llamar", tint = BluePrimary, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}
