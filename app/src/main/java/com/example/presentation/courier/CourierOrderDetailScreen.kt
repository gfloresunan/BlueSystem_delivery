package com.example.presentation.courier

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
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
import com.example.PedidoOfrecido
import com.example.domain.model.ChatDomain
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.*

/**
 * Pantalla nativa dedicada de Detalle de Servicio / Pedido en contexto exclusivo de Motorizado / Courier.
 * Estilo visual: BlueSystem Enterprise Dark Theme (#020617, #0F172A, #1E293B, #10B981, #38BDF8).
 * Aislamiento total de rol: Cero contaminación de rutas y estado de Cliente o Comercio.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierOrderDetailScreen(
    orderId: String,
    initialPedido: PedidoOfrecido? = null,
    onNavigateToChat: (orderId: String, domain: ChatDomain) -> Unit = { _, _ -> },
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val db = remember { FirebaseFirestore.getInstance() }
    var pedidoState by remember { mutableStateOf(initialPedido) }
    var isLoading by remember { mutableStateOf(initialPedido == null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(orderId) {
        if (pedidoState == null && orderId.isNotBlank()) {
            try {
                val doc = db.collection("orders").document(orderId).get().await()
                if (doc.exists()) {
                    pedidoState = com.example.FirebaseManager.parsePedidoOfrecido(doc)
                } else {
                    // Intentar en encomiendas X->Y (deliveryTrips)
                    val tripDoc = db.collection("deliveryTrips").document(orderId).get().await()
                    if (tripDoc.exists()) {
                        pedidoState = com.example.FirebaseManager.parsePedidoOfrecido(tripDoc)
                    } else {
                        errorMessage = "No se encontró el servicio solicitado (#$orderId)."
                    }
                }
            } catch (e: Exception) {
                errorMessage = "Error al cargar los detalles: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    val pedido = pedidoState

    Scaffold(
        containerColor = Color(0xFF020617),
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = if (pedido?.serviceType == "X_TO_Y_DELIVERY") "Detalle de Encomienda" else "Detalle de Entrega",
                            fontWeight = FontWeight.Black,
                            fontSize = 17.sp,
                            color = Color.White
                        )
                        Text(
                            text = if (pedido != null) "#${pedido.displayOrderCode.removePrefix("#")}" else if (orderId.isNotBlank()) "#${orderId.takeLast(6).uppercase()}" else "Cargando...",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Regresar", tint = Color.White)
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
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(Color(0xFF020617)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFF38BDF8))
            }
        } else if (pedido == null || errorMessage != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(Color(0xFF020617))
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(48.dp))
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = errorMessage ?: "No fue posible cargar los datos del servicio.",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = onBack,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Regresar a Mis Pedidos", color = Color.White)
                    }
                }
            }
        } else {
            val isXToY = pedido.serviceType == "X_TO_Y_DELIVERY"
            val statusColor = when (pedido.status.lowercase()) {
                "delivered", "completed", "entregado", "completado" -> Color(0xFF10B981)
                "in_transit", "en_camino" -> Color(0xFF3B82F6)
                "cancelled", "cancelado" -> Color(0xFFEF4444)
                else -> Color(0xFFF59E0B)
            }
            val statusLabel = when (pedido.status.lowercase()) {
                "delivered", "completed", "entregado", "completado" -> "ENTREGADO EXITOSAMENTE ✅"
                "in_transit", "en_camino" -> "EN RUTA ACTIVA 🚚"
                "cancelled", "cancelado" -> "CANCELADO ❌"
                "courier_accepted", "asignado", "assigned" -> "ASIGNADO A TI 📍"
                else -> pedido.status.uppercase()
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(Color(0xFF020617))
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Card 1: Estado y Ganancia Neta
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = statusColor.copy(alpha = 0.2f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, statusColor.copy(alpha = 0.5f))
                            ) {
                                Text(
                                    text = statusLabel,
                                    color = statusColor,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                            Text(
                                text = if (isXToY) "📦 Encomienda X→Y" else "🏪 Comercio Aliado",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // BSD-COURIER-EARNINGS-AND-DELIVERY-FEE-FORENSIC-001:
                        // Para ordenes completadas: mostrar courierTotalEarnings (backend autoritativo)
                        // Para ordenes activas/pre-entrega: mostrar gananciaRepartidor (estimado)
                        val isCompleted = pedido.status.lowercase() in listOf(
                            "delivered", "completed", "entregado", "completado"
                        )
                        val displayEarnings = if (isCompleted && pedido.courierTotalEarnings > 0.0) {
                            pedido.courierTotalEarnings
                        } else {
                            pedido.gananciaRepartidor
                        }
                        val hasFullBreakdown = isCompleted &&
                            pedido.courierTotalEarnings > 0.0 &&
                            (pedido.courierDistanceEarnings > 0.0 ||
                             pedido.courierBonusEarnings > 0.0 ||
                             pedido.courierTipEarnings > 0.0)

                        Text(
                            "TU GANANCIA EN ESTE SERVICIO",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 1.sp
                        )
                        Text(
                            text = "C$ ${String.format(Locale.US, "%.2f", displayEarnings)}",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF10B981)
                        )

                        if (hasFullBreakdown) {
                            // Desglose completo post-entrega (datos autoritativos del backend)
                            Spacer(modifier = Modifier.height(12.dp))
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = Color(0xFF0D2137),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    if (pedido.courierDistanceEarnings > 0.0) {
                                        val distKm = if (pedido.routeDistanceKm > 0.0) pedido.routeDistanceKm
                                                     else if (pedido.routeDistanceMeters > 0L) pedido.routeDistanceMeters / 1000.0
                                                     else pedido.distanceKm
                                        val rateLabel = if (pedido.courierRatePerKmApplied > 0.0)
                                            " (${String.format(Locale.US, "%.0f", distKm)} km × C$${String.format(Locale.US, "%.2f", pedido.courierRatePerKmApplied)})"
                                        else ""
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                "🛵 Pago envío$rateLabel",
                                                fontSize = 11.sp,
                                                color = Color(0xFF94A3B8),
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.weight(1f)
                                            )
                                            Text(
                                                "C$ ${String.format(Locale.US, "%.2f", pedido.courierDistanceEarnings)}",
                                                fontSize = 11.sp,
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                    if (pedido.courierBonusEarnings > 0.0) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                "🎁 Bono por entrega",
                                                fontSize = 11.sp,
                                                color = Color(0xFF94A3B8),
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Text(
                                                "C$ ${String.format(Locale.US, "%.2f", pedido.courierBonusEarnings)}",
                                                fontSize = 11.sp,
                                                color = Color(0xFF38BDF8),
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                    if (pedido.courierTipEarnings > 0.0) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                "✨ Propina",
                                                fontSize = 11.sp,
                                                color = Color(0xFF94A3B8),
                                                fontWeight = FontWeight.SemiBold
                                            )
                                            Text(
                                                "C$ ${String.format(Locale.US, "%.2f", pedido.courierTipEarnings)}",
                                                fontSize = 11.sp,
                                                color = Color(0xFF34D399),
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                    // Linea divisora y total
                                    HorizontalDivider(
                                        modifier = Modifier.padding(vertical = 4.dp),
                                        color = Color(0xFF1E293B)
                                    )
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            "TOTAL GANADO",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color.White,
                                            letterSpacing = 0.5.sp
                                        )
                                        Text(
                                            "C$ ${String.format(Locale.US, "%.2f", pedido.courierTotalEarnings)}",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFF10B981)
                                        )
                                    }
                                }
                            }
                            // Metadatos de distancia y metodo
                            val distKmFinal = if (pedido.routeDistanceKm > 0.0) pedido.routeDistanceKm
                                             else if (pedido.routeDistanceMeters > 0L) pedido.routeDistanceMeters / 1000.0
                                             else pedido.distanceKm
                            if (distKmFinal > 0.0) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Text(
                                        "📍 ${String.format(Locale.US, "%.2f", distKmFinal)} km",
                                        fontSize = 10.sp,
                                        color = Color(0xFF64748B),
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    if (pedido.distanceSource.isNotBlank()) {
                                        val methodLabel = when (pedido.distanceSource.uppercase()) {
                                            "ROUTING_ENGINE", "GOOGLE_ROUTES_V2" -> "🗺️ Ruta real"
                                            "FALLBACK_ESTIMATED" -> "📐 Estimada"
                                            else -> "📐 ${pedido.distanceSource}"
                                        }
                                        Text(
                                            methodLabel,
                                            fontSize = 10.sp,
                                            color = Color(0xFF64748B),
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                }
                            }
                        } else if (!isCompleted && (pedido.tip > 0.0 || pedido.courierBonusEarnings > 0.0 || pedido.routeDistanceKm > 0.0)) {
                            // Pre-entrega: mostrar resumen compacto solo si hay datos parciales
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                if (pedido.routeDistanceKm > 0.0) {
                                    Text("🛣️ ${String.format(Locale.US, "%.1f", pedido.routeDistanceKm)} km", fontSize = 11.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.SemiBold)
                                }
                                if (pedido.courierBonusEarnings > 0.0) {
                                    Text("🎁 Bono: C$ ${String.format(Locale.US, "%.2f", pedido.courierBonusEarnings)}", fontSize = 11.sp, color = Color(0xFF38BDF8), fontWeight = FontWeight.SemiBold)
                                }
                                if (pedido.tip > 0.0) {
                                    Text("✨ Propina: C$ ${String.format(Locale.US, "%.2f", pedido.tip)}", fontSize = 11.sp, color = Color(0xFF34D399), fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                }

                // Card 2: Ruta y Puntos Operacionales (Origen y Destino)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Text(
                            text = "TRAZABILIDAD DE RUTA",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF38BDF8),
                            letterSpacing = 0.5.sp
                        )

                        // Punto Origen / Recogida
                        Row(verticalAlignment = Alignment.Top) {
                            Surface(
                                shape = CircleShape,
                                color = Color(0xFF6366F1).copy(alpha = 0.2f),
                                modifier = Modifier.size(32.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Store, contentDescription = null, tint = Color(0xFF818CF8), modifier = Modifier.size(18.dp))
                                }
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (isXToY) (if (pedido.senderName.isNotBlank()) "Punto X (Remitente: ${pedido.senderName})" else "Punto de Recogida X") else (pedido.comercioNombre.ifBlank { "Comercio Aliado" }),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = pedido.comercioDireccion.ifBlank { "Dirección no disponible" },
                                    fontSize = 12.sp,
                                    color = Color(0xFF94A3B8)
                                )
                                if (pedido.senderPhone.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    TextButton(
                                        onClick = {
                                            try {
                                                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${pedido.senderPhone}")))
                                            } catch (_: Exception) {}
                                        },
                                        contentPadding = PaddingValues(0.dp)
                                    ) {
                                        Icon(Icons.Default.Call, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Llamar al Origen (${pedido.senderPhone})", fontSize = 11.sp, color = Color(0xFF38BDF8), fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        HorizontalDivider(color = Color(0xFF1E293B))

                        // Punto Destino / Entrega
                        Row(verticalAlignment = Alignment.Top) {
                            Surface(
                                shape = CircleShape,
                                color = Color(0xFF10B981).copy(alpha = 0.2f),
                                modifier = Modifier.size(32.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(18.dp))
                                }
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (isXToY) (if (pedido.recipientName.isNotBlank()) "Punto Y (Destinatario: ${pedido.recipientName})" else "Punto de Entrega Y") else (if (pedido.recipientName.isNotBlank()) pedido.recipientName else "Cliente Final"),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Color.White
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = pedido.clienteDireccion.ifBlank { "Dirección no disponible" },
                                    fontSize = 12.sp,
                                    color = Color(0xFF94A3B8)
                                )
                                if (pedido.recipientPhone.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    TextButton(
                                        onClick = {
                                            try {
                                                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${pedido.recipientPhone}")))
                                            } catch (_: Exception) {}
                                        },
                                        contentPadding = PaddingValues(0.dp)
                                    ) {
                                        Icon(Icons.Default.Call, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Llamar al Cliente (${pedido.recipientPhone})", fontSize = 11.sp, color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        if (pedido.notes.isNotBlank() || pedido.packageDescription.isNotBlank()) {
                            HorizontalDivider(color = Color(0xFF1E293B))
                            Column {
                                if (pedido.packageDescription.isNotBlank()) {
                                    Text("📦 Paquete: ${pedido.packageDescription}", fontSize = 12.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.SemiBold)
                                }
                                if (pedido.notes.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("📝 Instrucciones: ${pedido.notes}", fontSize = 11.sp, color = Color(0xFF94A3B8))
                                }
                            }
                        }
                    }
                }

                // Card: Historial de Conversación con el Cliente (Auditoría / Soporte)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "COMUNICACIÓN CON EL CLIENTE",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF38BDF8),
                                letterSpacing = 0.5.sp
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Color(0xFF38BDF8).copy(alpha = 0.15f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8).copy(alpha = 0.3f))
                            ) {
                                Text(
                                    text = "HISTORIAL AUDITABLE",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF38BDF8),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        Text(
                            text = "Consulta el registro cronológico completo de mensajes y eventos de llamada sostenidos durante la atención de este servicio.",
                            fontSize = 12.sp,
                            color = Color(0xFF94A3B8),
                            lineHeight = 16.sp
                        )

                        Button(
                            onClick = {
                                val domain = if (isXToY) ChatDomain.X_TO_Y_TRIP else ChatDomain.COMMERCE_ORDER
                                onNavigateToChat(pedido.id, domain)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF2563EB)
                            )
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Chat,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "💬 Ver Historial de Conversación",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = Color.White
                            )
                        }
                    }
                }

                // Card 3: Desglose Financiero del Servicio
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "DESGLOSE FINANCIERO Y COBRO",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF38BDF8),
                            letterSpacing = 0.5.sp
                        )

                        if (!isXToY && pedido.subtotalProductos > 0.0) {
                            FinancialRow(label = "Productos del Comercio", amount = pedido.subtotalProductos)
                        }
                        if (pedido.deliveryFee > 0.0) {
                            FinancialRow(label = "Tarifa de Envío / Flete", amount = pedido.deliveryFee)
                        }
                        if (pedido.tip > 0.0) {
                            FinancialRow(label = "Propina al Motorizado", amount = pedido.tip, highlight = true)
                        }
                        if (pedido.additionalCharge > 0.0) {
                            FinancialRow(label = "Cargos Adicionales", amount = pedido.additionalCharge)
                        }
                        if (pedido.discountAmount > 0.0) {
                            val discLabel = if (pedido.couponCode.isNotBlank()) "Descuento (Cupón: ${pedido.couponCode})" else "Descuento / Promoción"
                            FinancialRow(label = discLabel, amount = pedido.discountAmount, isDiscount = true)
                        }

                        HorizontalDivider(color = Color(0xFF1E293B))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Total del Servicio", fontWeight = FontWeight.Black, color = Color.White, fontSize = 14.sp)
                            Text("C$ ${String.format(Locale.US, "%.2f", pedido.total)}", fontWeight = FontWeight.Black, color = Color.White, fontSize = 16.sp)
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF1E293B),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Método de Pago: ${pedido.pagoMetodo.uppercase()}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (pedido.pagoMetodo.lowercase() in listOf("efectivo", "cash")) Color(0xFFFBBF24) else Color(0xFF38BDF8)
                                )
                                if (pedido.cashReceived > 0.0) {
                                    Text(
                                        text = "Recibido: C$ ${String.format(Locale.US, "%.2f", pedido.cashReceived)}",
                                        fontSize = 11.sp,
                                        color = Color(0xFF94A3B8),
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun FinancialRow(
    label: String, 
    amount: Double, 
    highlight: Boolean = false,
    isDiscount: Boolean = false
) {
    val textColor = when {
        isDiscount -> Color(0xFF38BDF8)
        highlight -> Color(0xFF34D399)
        else -> Color(0xFF94A3B8)
    }
    val valueColor = when {
        isDiscount -> Color(0xFF38BDF8)
        highlight -> Color(0xFF34D399)
        else -> Color.White
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, fontSize = 12.sp, color = textColor, fontWeight = if (highlight || isDiscount) FontWeight.Bold else FontWeight.Normal)
        Text(
            text = if (isDiscount) "-C$ ${String.format(Locale.US, "%.2f", amount)}" else "C$ ${String.format(Locale.US, "%.2f", amount)}", 
            fontSize = 13.sp, 
            color = valueColor, 
            fontWeight = FontWeight.Bold
        )
    }
}
