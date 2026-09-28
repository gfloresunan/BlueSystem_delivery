package com.example

import android.widget.Toast
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.maps.android.compose.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.Locale

data class CourierLiveMarker(
    val id: String,
    val lat: Double,
    val lng: Double,
    val name: String = "Motorizado"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EsperandoRepartidorScreen(
    pedidoId: String,
    flujoEstadoPedido: Flow<String?>, // Emite el motorizadoId asignado
    onRepartidorAsignado: (motorizadoId: String) -> Unit,
    onCancelarPedido: () -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    // Colores
    val brandRed = Color(0xFFE11938)
    val brandBlue = Color(0xFF2563EB)
    val darkText = Color(0xFF0F172A)
    val grayText = Color(0xFF64748B)

    // Datos del viaje en tiempo real
    var originAddress by remember { mutableStateOf("") }
    var destinationAddress by remember { mutableStateOf("") }
    var originLat by remember { mutableStateOf(12.1364) }
    var originLng by remember { mutableStateOf(-86.2514) }
    var destLat by remember { mutableStateOf(12.1400) }
    var destLng by remember { mutableStateOf(-86.2600) }
    var hasValidCoords by remember { mutableStateOf(false) }
    var routePolyline by remember { mutableStateOf("") }

    var currentFee by remember { mutableStateOf(0.0) }
    var calculatedFee by remember { mutableStateOf(0.0) }
    var customerOffer by remember { mutableStateOf(0.0) }
    var payer by remember { mutableStateOf("SENDER") }
    var packageDesc by remember { mutableStateOf("") }
    var paymentMethod by remember { mutableStateOf("efectivo") }
    var showChangePriceDialog by remember { mutableStateOf(false) }
    var showCancelConfirmationDialog by remember { mutableStateOf(false) }
    var newOfferInput by remember { mutableStateOf("") }
    var isUpdatingOffer by remember { mutableStateOf(false) }
    var isCancelling by remember { mutableStateOf(false) }
    var searchElapsedSeconds by remember { mutableIntStateOf(0) }
    var tripCreatedAtMs by remember { mutableLongStateOf(0L) }
    var dispatchRadiusKm by remember { mutableDoubleStateOf(5.0) }
    var dispatchStage by remember { mutableStateOf("SEARCHING_5KM") }
    var candidateCouriersCount by remember { mutableIntStateOf(0) }
    var isTimedOut by remember { mutableStateOf(false) }

    // Temporizador de búsqueda anclado canónicamente a trip.createdAt (Single SSOT)
    LaunchedEffect(tripCreatedAtMs) {
        while (true) {
            if (tripCreatedAtMs > 0L) {
                val now = System.currentTimeMillis()
                searchElapsedSeconds = ((now - tripCreatedAtMs) / 1000L).coerceAtLeast(0L).toInt()
            } else {
                searchElapsedSeconds++
            }
            kotlinx.coroutines.delay(1000L)
        }
    }

    // Motorizados activos en tiempo real de /ubicaciones_repartidores
    var liveCouriers by remember { mutableStateOf<List<CourierLiveMarker>>(emptyList()) }

    // Escucha canónica del viaje X→Y en /deliveryTrips (SSOT - CERO /orders)
    LaunchedEffect(pedidoId) {
        if (pedidoId.isNotEmpty()) {
            val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
            db.collection("deliveryTrips").document(pedidoId)
                .addSnapshotListener { snap, _ ->
                    if (snap != null && snap.exists()) {
                        val originMap = snap.get("origin") as? Map<String, Any>
                        val destMap = snap.get("destination") as? Map<String, Any>
                        originAddress = originMap?.get("address") as? String ?: snap.getString("businessAddress") ?: ""
                        destinationAddress = destMap?.get("address") as? String ?: snap.getString("destinationAddress") ?: ""
                        
                        val oLat = (originMap?.get("latitude") as? Number)?.toDouble() ?: 12.1364
                        val oLng = (originMap?.get("longitude") as? Number)?.toDouble() ?: -86.2514
                        val dLat = (destMap?.get("latitude") as? Number)?.toDouble() ?: 12.1400
                        val dLng = (destMap?.get("longitude") as? Number)?.toDouble() ?: -86.2600

                        originLat = oLat
                        originLng = oLng
                        destLat = dLat
                        destLng = dLng
                        hasValidCoords = true

                        // Anclaje temporal al createdAt del viaje
                        val createdTs = snap.getTimestamp("createdAt")
                        if (createdTs != null && tripCreatedAtMs == 0L) {
                            tripCreatedAtMs = createdTs.toDate().time
                        }

                        // Telemetría de dispatch dinámico gobernada por el backend (Read-Only)
                        dispatchRadiusKm = snap.getDouble("dispatchRadiusKm") ?: 5.0
                        dispatchStage = snap.getString("dispatchStage") ?: "SEARCHING_5KM"
                        val countServer = snap.getLong("candidateCouriersCount")
                            ?: snap.getLong("eligibleCouriersCount")
                            ?: ((snap.get("dispatch") as? Map<*, *>)?.get("eligibleCount") as? Number)?.toLong()
                        if (countServer != null) {
                            candidateCouriersCount = countServer.toInt()
                        }

                        val routingMap = snap.get("routing") as? Map<String, Any>
                        val rawPoly = routingMap?.get("polyline") as? String ?: snap.getString("polyline") ?: ""
                        if (rawPoly.isNotBlank()) {
                            routePolyline = rawPoly
                        }

                        val pSnap = snap.get("pricingSnapshot") as? Map<String, Any>
                        currentFee = (pSnap?.get("calculatedAmount") as? Number)?.toDouble()
                            ?: snap.getDouble("calculatedFee") ?: snap.getDouble("deliveryFee") ?: snap.getDouble("total") ?: 0.0
                        calculatedFee = (pSnap?.get("calculatedAmount") as? Number)?.toDouble() ?: snap.getDouble("calculatedFee") ?: currentFee
                        customerOffer = snap.getDouble("customerOffer") ?: currentFee
                        payer = snap.getString("payer") ?: "SENDER"
                        packageDesc = snap.getString("packageDescription") ?: ""
                        paymentMethod = snap.getString("paymentMethod") ?: "efectivo"

                        val assigned = snap.getString("assignedCourierId") ?: snap.getString("courierId") ?: snap.getString("motorizadoId")
                        val status = (snap.getString("status") ?: "").uppercase()
                        val cancelReason = snap.getString("cancelReason") ?: ""

                        // Detección de timeout a los 10 minutos
                        if (status == "CANCELLED" && (cancelReason == "NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT" || cancelReason.contains("TIMEOUT"))) {
                            isTimedOut = true
                        } else if (!assigned.isNullOrBlank() || status in listOf("ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "IN_TRANSIT", "COURIER_ACCEPTED")) {
                            onRepartidorAsignado(assigned ?: "")
                        }
                    }
                }

            // Escuchar motorizados activos en /ubicaciones_repartidores con filtro estricto de frescura (<= 10 min)
            db.collection("ubicaciones_repartidores")
                .limit(50)
                .addSnapshotListener { snap, _ ->
                    if (snap != null) {
                        val list = mutableListOf<CourierLiveMarker>()
                        val nowMs = System.currentTimeMillis()
                        for (doc in snap.documents) {
                            val coords = doc.get("coordenadas") as? Map<*, *>
                            val lat = doc.getDouble("latitud") ?: (coords?.get("latitud") as? Number)?.toDouble() ?: doc.getDouble("lat") ?: doc.getDouble("latitude")
                            val lng = doc.getDouble("longitud") ?: (coords?.get("longitud") as? Number)?.toDouble() ?: doc.getDouble("lng") ?: doc.getDouble("longitude")
                            val name = doc.getString("nombre") ?: doc.getString("name") ?: "Motorizado"
                            val isOnline = doc.getBoolean("isOnline") ?: true
                            val lastUpdateTs = doc.getTimestamp("ultimaActualizacion")?.toDate()?.time
                                ?: (doc.get("ultimaActualizacion") as? Number)?.toLong()
                                ?: 0L
                            val isFresh = lastUpdateTs > 0 && (nowMs - lastUpdateTs) <= 10 * 60 * 1000L
                            if (lat != null && lng != null && lat != 0.0 && lng != 0.0 && isOnline && isFresh) {
                                list.add(CourierLiveMarker(doc.id, lat, lng, name))
                            }
                        }
                        liveCouriers = list
                    }
                }
        }
    }

    // Escucha del flujo reactivo de asignación
    val motorizadoIdAsignado by flujoEstadoPedido.collectAsState(initial = null)
    LaunchedEffect(motorizadoIdAsignado) {
        motorizadoIdAsignado?.let { id ->
            if (id.isNotBlank()) {
                onRepartidorAsignado(id)
            }
        }
    }

    // Animación de Radar Pulse
    val infiniteTransition = rememberInfiniteTransition(label = "RadarPulse")
    val escalaPulso by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 2.4f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = LinearOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "Escala"
    )
    val alfaPulso by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = LinearOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "Opacidad"
    )

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(LatLng(originLat, originLng), 13.5f)
    }

    LaunchedEffect(hasValidCoords) {
        if (hasValidCoords) {
            try {
                val p1 = LatLng(originLat, originLng)
                val p2 = LatLng(destLat, destLng)
                val bounds = LatLngBounds.builder().include(p1).include(p2).build()
                cameraPositionState.animate(CameraUpdateFactory.newLatLngBounds(bounds, 140))
            } catch (e: Exception) {
                // Fallback de cámara
            }
        }
    }

    // Función atómica para actualizar la oferta del cliente en Firestore con límites de seguridad
    fun updateCustomerOffer(newAmount: Double) {
        if (newAmount < calculatedFee) {
            Toast.makeText(context, "La oferta mínima es la cotización del sistema (C$ ${String.format("%.2f", calculatedFee)})", Toast.LENGTH_SHORT).show()
            return
        }
        val maxAllowed = (calculatedFee * 3.0).coerceAtLeast(600.0)
        if (newAmount > maxAllowed) {
            Toast.makeText(context, "La oferta máxima permitida es C$ ${String.format("%.2f", maxAllowed)}", Toast.LENGTH_SHORT).show()
            return
        }
        isUpdatingOffer = true
        coroutineScope.launch {
            try {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                val updates = mapOf(
                    "customerOffer" to newAmount,
                    "deliveryFee" to newAmount,
                    "total" to newAmount
                )
                db.collection("orders").document(pedidoId).update(updates)
                db.collection("deliveryTrips").document(pedidoId).update(updates)
                customerOffer = newAmount
                currentFee = newAmount
                Toast.makeText(context, "Oferta actualizada a C$ ${String.format("%.2f", newAmount)}", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(context, "Error al actualizar oferta: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                isUpdatingOffer = false
                showChangePriceDialog = false
            }
        }
    }

    // Cancelación atómica del viaje por el cliente vía Cloud Function autoritativa
    fun handleCancelTrip() {
        if (isCancelling) return
        isCancelling = true
        coroutineScope.launch {
            try {
                val functions = com.google.firebase.functions.FirebaseFunctions.getInstance()
                val payload = hashMapOf(
                    "tripId" to pedidoId,
                    "reason" to "CANCELLED_BY_CUSTOMER",
                    "actorRole" to "CUSTOMER"
                )
                functions.getHttpsCallable("cancelDeliveryTrip")
                    .call(payload)
                    .await()

                Toast.makeText(context, "Solicitud de envío cancelada exitosamente", Toast.LENGTH_SHORT).show()
                onCancelarPedido()
            } catch (e: Exception) {
                val msg = e.message ?: ""
                val userMsg = when {
                    msg.contains("PAQUETE_YA_RECOGIDO") -> "El motorizado ya tiene en mano tu encomienda. Por seguridad no puede cancelarse."
                    msg.contains("ENCOMIENDA_NO_CANCELABLE") -> "El motorizado ya llegó al punto de recogida. No es posible cancelar en este momento."
                    msg.contains("ESTADO_NO_CANCELABLE") -> "La encomienda ya se encuentra en un estado que no permite cancelación."
                    msg.contains("SOLO_CLIENTE_PUEDE_CANCELAR") -> "No tienes permisos para cancelar esta encomienda."
                    else -> "No fue posible cancelar el viaje: ${e.localizedMessage ?: msg}"
                }
                Toast.makeText(context, userMsg, Toast.LENGTH_LONG).show()
            } finally {
                isCancelling = false
                showCancelConfirmationDialog = false
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // 1. GOOGLE MAPS COMPLETO EN EL FONDO CON TELEMETRÍA REAL
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            uiSettings = MapUiSettings(zoomControlsEnabled = false, myLocationButtonEnabled = true)
        ) {
            // Marcador Origen X
            Marker(
                state = rememberMarkerState(position = LatLng(originLat, originLng)),
                title = "Origen X (Recogida)",
                snippet = originAddress
            )

            // Marcador Destino Y
            Marker(
                state = rememberMarkerState(position = LatLng(destLat, destLng)),
                title = "Destino Y (Entrega)",
                snippet = destinationAddress
            )

            // Línea de Ruta Vial Real (Decodificada)
            val roadPoints = remember(routePolyline) {
                if (routePolyline.isNotBlank()) {
                    com.example.data.repository.courier.CourierRoutingRepository.decodePolyline(routePolyline)
                } else emptyList()
            }

            if (roadPoints.isNotEmpty()) {
                Polyline(
                    points = roadPoints,
                    color = brandBlue,
                    width = 6f
                )
            } else {
                Polyline(
                    points = listOf(LatLng(originLat, originLng), LatLng(destLat, destLng)),
                    color = brandBlue.copy(alpha = 0.35f),
                    width = 3f
                )
            }

            // Círculo de Radio de Búsqueda Dinámico (5 km -> 15 km -> 30 km)
            Circle(
                center = LatLng(originLat, originLng),
                radius = dispatchRadiusKm * 1000.0, // 5000m, 15000m o 30000m
                fillColor = Color(0xFF3B82F6).copy(alpha = 0.10f),
                strokeColor = Color(0xFF2563EB).copy(alpha = 0.65f),
                strokeWidth = 3f
            )

            // Marcadores de Motorizados Reales en Tiempo Real
            liveCouriers.forEach { courier ->
                Marker(
                    state = rememberMarkerState(position = LatLng(courier.lat, courier.lng)),
                    title = "🛵 ${courier.name}",
                    snippet = "Disponible para entregas"
                )
            }
        }

        // Filtro de candidatos en el radio dinámico actual
        val candidatesInRadius = remember(liveCouriers, originLat, originLng, dispatchRadiusKm) {
            liveCouriers.filter { c ->
                val dist = GeoUtils.calculateDistance(originLat, originLng, c.lat, c.lng)
                dist <= dispatchRadiusKm
            }
        }

        val effectiveCandidates = candidateCouriersCount
        val stageTitle = when {
            dispatchRadiusKm >= 30.0 -> "Buscando en radio extendido (30 km)..."
            dispatchRadiusKm >= 15.0 -> "Ampliando radio de búsqueda (15 km)..."
            else -> "Buscando motorizados cercanos..."
        }
        val stageSubtitle = when {
            dispatchRadiusKm >= 30.0 -> "Radio extendido 30 km"
            dispatchRadiusKm >= 15.0 -> "Radio ampliado 15 km"
            else -> "Radio cercano 5 km"
        }
        val candidateText = if (effectiveCandidates > 0) "$effectiveCandidates disponible(s)" else "Localizando..."

        // 2. CABECERA FLOTANTE CON RADAR DE BÚSQUEDA
        Surface(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(16.dp)
                .fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = Color.White.copy(alpha = 0.95f),
            shadowElevation = 4.dp
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Radar animado compacto
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(38.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .scale(escalaPulso)
                            .background(Color(0xFF3B82F6).copy(alpha = alfaPulso), CircleShape)
                    )
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .background(brandBlue, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.DirectionsBike,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stageTitle,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 13.sp,
                        color = darkText
                    )
                    val minutes = searchElapsedSeconds / 60
                    val seconds = searchElapsedSeconds % 60
                    Text(
                        text = "$stageSubtitle • ${String.format("%02d:%02d", minutes, seconds)} • $candidateText",
                        fontSize = 11.sp,
                        color = grayText
                    )
                }

                IconButton(
                    onClick = { showCancelConfirmationDialog = true },
                    modifier = Modifier
                        .size(32.dp)
                        .background(Color(0xFFF1F5F9), CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Cancelar Búsqueda",
                        tint = darkText,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        // 3. PANEL INFERIOR CON RESUMEN Y CONTROLES DE OFERTA EN VIVO
        Surface(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            shadowElevation = 8.dp
        ) {
            Column(
                modifier = Modifier
                    .padding(18.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Resumen de Oferta y Modificación
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Tu Oferta para el Envío",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = grayText
                        )
                        Text(
                            text = "C$ ${String.format("%.2f", currentFee)}",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            color = brandBlue
                        )
                    }

                    // Botones rápidos [-5] [+5]
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedButton(
                            onClick = {
                                updateCustomerOffer((currentFee - 5.0).coerceAtLeast(calculatedFee))
                            },
                            enabled = !isUpdatingOffer && currentFee > calculatedFee,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Text("-5", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = darkText)
                        }

                        Button(
                            onClick = {
                                updateCustomerOffer(currentFee + 5.0)
                            },
                            enabled = !isUpdatingOffer,
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = brandBlue),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Text("+5", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                        }

                        OutlinedButton(
                            onClick = {
                                newOfferInput = String.format(Locale.US, "%.0f", currentFee)
                                showChangePriceDialog = true
                            },
                            enabled = !isUpdatingOffer,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Text("Cambiar", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = brandBlue)
                        }
                    }
                }

                HorizontalDivider(color = Color(0xFFF1F5F9))

                // Resumen del Viaje (Origen -> Destino, Paquete, Payer)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(8.dp).background(brandRed, CircleShape))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = originAddress.ifBlank { "Origen X" },
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = darkText,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(8.dp).background(brandBlue, CircleShape))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = destinationAddress.ifBlank { "Destino Y" },
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = darkText,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Badges informativos
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFF1F5F9),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "📦 ${packageDesc.ifBlank { "Paquete" }}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = darkText,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (payer == "RECIPIENT") Color(0xFFFEF3C7) else Color(0xFFDCFCE7),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = if (payer == "RECIPIENT") "💰 Destinatario paga" else "✓ Remitente paga",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (payer == "RECIPIENT") Color(0xFF92400E) else Color(0xFF166534),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }

    // Modal para Cambiar Oferta
    if (showChangePriceDialog) {
        Dialog(onDismissRequest = { showChangePriceDialog = false }) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shadowElevation = 6.dp
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text("Mejorar Oferta de Envío", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = darkText)
                    Text(
                        text = "Aumentar tu oferta permite que los conductores acepten tu solicitud con mayor rapidez.",
                        fontSize = 12.sp,
                        color = grayText
                    )

                    OutlinedTextField(
                        value = newOfferInput,
                        onValueChange = { newOfferInput = it },
                        label = { Text("Nueva Oferta (C$)") },
                        colors = highContrastTextFieldColors(brandBlue),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = { showChangePriceDialog = false },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Cancelar", color = darkText)
                        }

                        Button(
                            onClick = {
                                val parsed = newOfferInput.toDoubleOrNull()
                                if (parsed != null) {
                                    updateCustomerOffer(parsed)
                                }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = brandBlue)
                        ) {
                            Text("Guardar", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }

    // Diálogo de Confirmación de Cancelación
    if (showCancelConfirmationDialog) {
        AlertDialog(
            onDismissRequest = { if (!isCancelling) showCancelConfirmationDialog = false },
            title = {
                Text("¿Cancelar solicitud de envío?", fontWeight = FontWeight.Black, fontSize = 16.sp, color = darkText)
            },
            text = {
                Text(
                    "Si cancelas, la búsqueda de motorizados se detendrá y la solicitud quedará cancelada en el sistema.",
                    fontSize = 13.sp,
                    color = grayText
                )
            },
            confirmButton = {
                Button(
                    onClick = { handleCancelTrip() },
                    enabled = !isCancelling,
                    colors = ButtonDefaults.buttonColors(containerColor = brandRed),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    if (isCancelling) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Sí, Cancelar Envío", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showCancelConfirmationDialog = false },
                    enabled = !isCancelling,
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Seguir buscando", color = darkText, fontSize = 12.sp)
                }
            },
            containerColor = Color.White,
            shape = RoundedCornerShape(20.dp)
        )
    }

    // Diálogo de Timeout / Sin Repartidores Disponibles (10 min transcurridos)
    if (isTimedOut) {
        AlertDialog(
            onDismissRequest = { /* Modal bloqueante hasta acción del usuario */ },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        tint = brandRed,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Sin repartidores disponibles",
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        color = darkText
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Buscamos en un radio extendido de hasta 30 km durante 10 minutos, pero ningún repartidor disponible pudo tomar tu envío en este momento.",
                        fontSize = 13.sp,
                        color = darkText
                    )
                    Text(
                        text = "Puedes intentar nuevamente en unos momentos o crear una nueva solicitud con una mejor oferta.",
                        fontSize = 12.sp,
                        color = grayText
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { onCancelarPedido() },
                    colors = ButtonDefaults.buttonColors(containerColor = brandBlue),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Solicitar nuevamente", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { onCancelarPedido() },
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Cerrar", color = darkText, fontSize = 12.sp)
                }
            },
            containerColor = Color.White,
            shape = RoundedCornerShape(20.dp)
        )
    }
}
