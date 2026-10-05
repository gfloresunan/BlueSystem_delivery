package com.example.presentation.admin

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class GlobalConfigModel(
    val maintenanceMode: Boolean = false,
    val maintenanceMessage: String = "",
    val supportPhone: String = "",
    val supportWhatsapp: String = "",
    val xToYBaseFee: Double = 35.0,
    val xToYPricePerKm: Double = 15.0,
    val defaultCommissionPercent: Double = 15.0,
    val minOrderAmount: Double = 50.0,
    val version: String = "2.2-Enterprise"
)

/**
 * MÓDULO 9: Configuración Global & Comisiones Enterprise (AdminGlobalConfigurationScreen).
 *
 * Visualiza y gobierna los parámetros maestros del sistema (/system_config/global y /platform_config/pricing):
 * - Parámetros de Operación y Modo Mantenimiento.
 * - Tarificación X→Y Delivery Express (baseFee, pricePerKm) bajo política inmutable ADR-015/ADR-026.
 * - Comisiones porcentuales de plataforma.
 * - Registro inmutable de snapshots en /audit_events.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminGlobalConfigurationScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }
    val currentAdminUid = auth.currentUser?.uid ?: "admin"

    var config by remember { mutableStateOf(GlobalConfigModel()) }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }

    // Campos editables
    var maintenanceMode by remember { mutableStateOf(false) }
    var supportPhone by remember { mutableStateOf("") }
    var supportWhatsapp by remember { mutableStateOf("") }
    var commissionPercent by remember { mutableStateOf("15.0") }

    DisposableEffect(Unit) {
        val listener = db.collection("system_config").document("global")
            .addSnapshotListener { snapshot, error ->
                isLoading = false
                if (snapshot != null && snapshot.exists()) {
                    val data = snapshot.data ?: return@addSnapshotListener
                    val xToYPricing = data["xToYPricing"] as? Map<*, *>
                    val resolvedBaseFee = (xToYPricing?.get("baseFee") as? Number)?.toDouble()
                        ?: (data["xToYBaseFee"] as? Number)?.toDouble() ?: 35.0
                    val resolvedPricePerKm = (xToYPricing?.get("pricePerKm") as? Number)?.toDouble()
                        ?: (xToYPricing?.get("perKmRate") as? Number)?.toDouble()
                        ?: (data["xToYPricePerKm"] as? Number)?.toDouble() ?: 15.0

                    // Canónico SSOT: merchantCommissionRate (decimal, ej. 0.15 = 15%)
                    val merchantCommissionRate = (data["merchantCommissionRate"] as? Number)?.toDouble()
                    val resolvedCommissionPercent = if (merchantCommissionRate != null) {
                        merchantCommissionRate * 100.0
                    } else {
                        (data["commissionPercent"] as? Number)?.toDouble() ?: 15.0
                    }

                    val loaded = GlobalConfigModel(
                        maintenanceMode = data["maintenanceMode"] as? Boolean ?: false,
                        maintenanceMessage = data["maintenanceMessage"] as? String ?: "",
                        supportPhone = data["supportPhone"] as? String ?: "+50588888888",
                        supportWhatsapp = data["supportWhatsapp"] as? String ?: "+50588888888",
                        xToYBaseFee = resolvedBaseFee,
                        xToYPricePerKm = resolvedPricePerKm,
                        defaultCommissionPercent = resolvedCommissionPercent,
                        version = data["version"] as? String ?: "2.2-Enterprise"
                    )
                    config = loaded
                    maintenanceMode = loaded.maintenanceMode
                    supportPhone = loaded.supportPhone
                    supportWhatsapp = loaded.supportWhatsapp
                    commissionPercent = loaded.defaultCommissionPercent.toString()
                }
            }

        onDispose { listener.remove() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Configuración Global", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Parámetros maestros y comisiones Enterprise", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
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
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BluePrimary)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // ── SECCIÓN 1: TARIFAS CANÓNICAS X→Y (FROZEN CORE ADR-015/026) ────
                item {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color.White,
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF0284C7), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("TARIFAS X→Y (FROZEN CORE ADR-015)", fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFF1E293B))
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                "Las tarifas de Delivery Express están blindadas bajo ADR-015/ADR-026 para garantizar consistencia contractual y financiera:",
                                fontSize = 11.sp,
                                color = Color(0xFF64748B)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Tarifa Base (Base Fee):", fontSize = 12.sp, color = Color(0xFF334155))
                                Text("C$ ${config.xToYBaseFee}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Precio por Kilómetro (Price/Km):", fontSize = 12.sp, color = Color(0xFF334155))
                                Text("C$ ${config.xToYPricePerKm} / km", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                            }
                        }
                    }
                }

                // ── SECCIÓN 2: COMISIÓN DE PLATAFORMA ─────────────────────────
                item {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color.White,
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Percent, contentDescription = null, tint = Color(0xFF059669), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("COMISIÓN DE PLATAFORMA", fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFF1E293B))
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            OutlinedTextField(
                                value = commissionPercent,
                                onValueChange = { commissionPercent = it },
                                label = { Text("Comisión por defecto (%)") },
                                singleLine = true,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }

                // ── SECCIÓN 3: PARÁMETROS DE OPERACIÓN Y SOPORTE ──────────────
                item {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color.White,
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.HeadsetMic, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("CONTACTO DE SOPORTE & AYUDA", fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFF1E293B))
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            OutlinedTextField(
                                value = supportPhone,
                                onValueChange = { supportPhone = it },
                                label = { Text("Teléfono de Soporte") },
                                singleLine = true,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = supportWhatsapp,
                                onValueChange = { supportWhatsapp = it },
                                label = { Text("WhatsApp de Soporte") },
                                singleLine = true,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }

                // ── SECCIÓN 4: MODO MANTENIMIENTO ─────────────────────────────
                item {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color.White,
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Modo Mantenimiento", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                                Text("Bloquea el acceso temporal a clientes y comercios", fontSize = 11.sp, color = Color(0xFF64748B))
                            }
                            Switch(
                                checked = maintenanceMode,
                                onCheckedChange = { maintenanceMode = it }
                            )
                        }
                    }
                }

                // ── BOTÓN GUARDAR SNAPSHOT ────────────────────────────────────
                item {
                    Button(
                        onClick = {
                            coroutineScope.launch {
                                isSaving = true
                                try {
                                    val newCommission = commissionPercent.toDoubleOrNull() ?: 15.0
                                    val canonicalCommissionRate = newCommission / 100.0

                                    // 1. Actualizar /system_config/global con SSOT canónico
                                    db.collection("system_config").document("global").set(
                                        mapOf(
                                            "maintenanceMode" to maintenanceMode,
                                            "supportPhone" to supportPhone,
                                            "supportWhatsapp" to supportWhatsapp,
                                            "merchantCommissionRate" to canonicalCommissionRate,
                                            "commissionPercent" to newCommission,
                                            "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                                            "updatedBy" to currentAdminUid
                                        ),
                                        com.google.firebase.firestore.SetOptions.merge()
                                    ).await()

                                    // 2. Snapshot de Auditoría inmutable
                                    db.collection("audit_events").add(
                                        mapOf(
                                            "actorUid" to currentAdminUid,
                                            "actorRole" to "ADMIN",
                                            "action" to "ADMIN_UPDATE_GLOBAL_CONFIG",
                                            "module" to "GLOBAL_CONFIGURATION",
                                            "targetType" to "system_config",
                                            "targetId" to "global",
                                            "maintenanceMode" to maintenanceMode,
                                            "merchantCommissionRate" to canonicalCommissionRate,
                                            "commissionPercent" to newCommission,
                                            "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                        )
                                    ).await()

                                    Toast.makeText(context, "Configuración actualizada con snapshot de auditoría", Toast.LENGTH_SHORT).show()
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                                } finally {
                                    isSaving = false
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        enabled = !isSaving
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                        } else {
                            Text("Guardar Configuración Inmutable", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }
}
