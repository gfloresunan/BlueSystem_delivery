package com.example

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Navigation
import androidx.compose.material.icons.filled.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.zIndex
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material.icons.filled.Phone
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import kotlinx.coroutines.launch
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.presentation.courier.CourierViewModel
import com.example.presentation.courier.CourierViewModelFactory
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material.icons.filled.CloudOff
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.LatLngBounds
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import com.example.GeoUtils
import com.example.domain.model.courier.CourierRoute
import com.example.domain.model.courier.CourierRoutePhase
import com.example.domain.model.courier.RouteCardVisibility
import com.example.domain.model.courier.RoutingStatus
import com.example.presentation.courier.CourierRouteViewModel


@Composable
fun RutaActivaScreen(
    pedidoId: String,
    comercioNombre: String,
    comercioDireccion: String,
    clienteDireccion: String,
    onActualizarEstadoFirestore: suspend (pedidoId: String, nuevoEstado: String) -> Unit,
    onFinalizarEntrega: () -> Unit
) {
    val context = LocalContext.current
    val viewModel: CourierViewModel = remember {
        try {
            android.util.Log.d("FLOTA_DEBUG", "CREANDO_VIEWMODEL: Inicializando CourierViewModel para la pantalla RutaActivaScreen")
            CourierViewModelFactory(context.applicationContext).create(CourierViewModel::class.java)
        } catch (e: Throwable) {
            android.util.Log.e("FLOTA_DEBUG", "ERROR AL CREAR VIEWMODEL", e)
            throw e
        }
    }
    val coroutineScope = rememberCoroutineScope()
    var faseActual by remember { mutableStateOf(1) } // 1: Hacia Origen, 2: Hacia Destino, 3: Entregado
    var serviceTypeState by remember { mutableStateOf("COMMERCE_DELIVERY") }
    var orderStatusDbState by remember { mutableStateOf("") }
    var actualizandoEstado by remember { mutableStateOf(false) }
    var senderPhoneState by remember { mutableStateOf("") }
    var senderNameState by remember { mutableStateOf("") }
    var customerPhoneState by remember { mutableStateOf("") }
    var customerNameState by remember { mutableStateOf("Cliente Destinatario") }
    var paymentMethodState by remember { mutableStateOf("") }
    var paymentStatusState by remember { mutableStateOf("") }
    var paymentVerifiedState by remember { mutableStateOf(false) }
    var payerState by remember { mutableStateOf("SENDER") }
    var packageDescriptionState by remember { mutableStateOf("") }
    var deliveryNoteState by remember { mutableStateOf("") }
    var tipAmountState by remember { mutableStateOf(0.0) }
    var additionalChargeState by remember { mutableStateOf(0.0) }
    var subtotalOrderState by remember { mutableStateOf(0.0) }
    var discountOrderState by remember { mutableStateOf(0.0) }
    var amountPaidState by remember { mutableStateOf(0.0) }
    var changeNeededState by remember { mutableStateOf(0.0) }
    var totalOrderState by remember { mutableStateOf(0.0) }
    var deliveryFeeState by remember { mutableStateOf(0.0) }
    var courierEarningsState by remember { mutableStateOf(0.0) }
    var cashReceivedInput by remember { mutableStateOf("") }
    var orderProductsListState by remember { mutableStateOf<List<Pair<String, Int>>>(emptyList()) }
    var mostrarExitoDialog by remember { mutableStateOf(false) }

    // BSD-COURIER-REAL-ROAD-ROUTING-ETA-001: Arquitectura de Routing desacoplada
    val routeViewModel: CourierRouteViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
    val activeRoute by routeViewModel.activeRoute.collectAsState()
    val customerRoute by routeViewModel.customerRoute.collectAsState()
    val routingStatus by routeViewModel.routingStatus.collectAsState()
    val cardVisibility by routeViewModel.cardVisibility.collectAsState()

    var effectivePedidoId by remember(pedidoId) {
        mutableStateOf(if (pedidoId.isBlank() || pedidoId.contains("{")) "" else pedidoId)
    }
    var commerceNameDbState by remember { mutableStateOf("") }
    var commerceAddressDbState by remember { mutableStateOf("") }
    var clientAddressDbState by remember { mutableStateOf("") }

    // Auto-recuperación resiliente si la ruta vino con llaves de plantilla {pedidoId}
    LaunchedEffect(pedidoId) {
        if (effectivePedidoId.isBlank()) {
            val uid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
            if (uid != null) {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                db.collection("orders")
                    .whereEqualTo("assignedCourierId", uid)
                    .whereIn("status", listOf("courier_accepted", "picked_up", "in_transit", "asignado", "en_camino"))
                    .limit(1)
                    .get()
                    .addOnSuccessListener { query ->
                        if (!query.isEmpty) {
                            val doc = query.documents.first()
                            effectivePedidoId = doc.id
                            android.util.Log.d("FLOTA_DEBUG", "AUTO_RECUPERADO_PEDIDO_ACTIVO: ${doc.id}")
                        }
                    }
            }
        }
    }

    // Coordenadas reales resueltas desde Firestore (CERO Managua Centro como fallback artificial)
    var comercioCoords by remember { mutableStateOf<LatLng?>(null) }
    var clienteCoords by remember { mutableStateOf<LatLng?>(null) }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(LatLng(12.1364, -86.2514), 14.5f)
    }
    
    val isOnline by viewModel.isOnline.collectAsState()
    val pendingCount by viewModel.pendingActionsCount.collectAsState(initial = 0)

    // Control de excepciones visuales
    var errorCaught by remember { mutableStateOf<Throwable?>(null) }
    var mapLoaded by remember { mutableStateOf(false) }

    val playServicesAvailable = remember {
        try {
            val code = com.google.android.gms.common.GoogleApiAvailability.getInstance()
                .isGooglePlayServicesAvailable(context)
            code == com.google.android.gms.common.ConnectionResult.SUCCESS
        } catch (e: Throwable) {
            false
        }
    }

    // Gestión de permisos y ubicación GPS en tiempo real
    var locationPermissionGranted by remember {
        mutableStateOf(
            try {
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            } catch (e: Throwable) {
                if (e !is kotlinx.coroutines.CancellationException) {
                    errorCaught = e
                }
                false
            }
        )
    }

    var showChatDialog by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        try {
            locationPermissionGranted = permissions.values.any { it }
        } catch (e: Throwable) {
            if (e !is kotlinx.coroutines.CancellationException) {
                errorCaught = e
            }
        }
    }

    LaunchedEffect(Unit) {
        try {
            if (!locationPermissionGranted) {
                permissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                )
            }
        } catch (e: Throwable) {
            if (e !is kotlinx.coroutines.CancellationException) {
                errorCaught = e
            }
        }
    }

    // Estado centralizado para inicialización segura del mapa y GPS
    val canInitializeMap = playServicesAvailable &&
            com.google.firebase.auth.FirebaseAuth.getInstance().currentUser != null &&
            pedidoId.isNotBlank()

    // Logs de auditoría APP_BOOT
    LaunchedEffect(playServicesAvailable) {
        if (playServicesAvailable) {
            android.util.Log.d("APP_BOOT", "Play Services OK")
        }
    }

    LaunchedEffect(locationPermissionGranted) {
        if (locationPermissionGranted) {
            android.util.Log.d("APP_BOOT", "Permisos concedidos")
        }
    }

    // Fused Location Client inicializado únicamente si se cumplen todas las condiciones de canInitializeMap
    val fusedLocationClient = remember(canInitializeMap) {
        if (canInitializeMap) {
            try {
                LocationServices.getFusedLocationProviderClient(context)
            } catch (e: Throwable) {
                if (e !is kotlinx.coroutines.CancellationException) {
                    errorCaught = e
                }
                null
            }
        } else {
            null
        }
    }
    var userLocation by remember { mutableStateOf<LatLng?>(null) }

    // Bucle GPS en tiempo real con FusedLocationProviderClient para hardware real GPS
    DisposableEffect(canInitializeMap, locationPermissionGranted) {
        var locationCallback: com.google.android.gms.location.LocationCallback? = null
        if (canInitializeMap && locationPermissionGranted && fusedLocationClient != null) {
            try {
                val locationRequest = com.google.android.gms.location.LocationRequest.Builder(
                    com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY,
                    5000L
                ).setMinUpdateIntervalMillis(4000L)
                 .setMinUpdateDistanceMeters(5f)
                 .build()

                var lastUploadedLat = 0.0
                var lastUploadedLng = 0.0
                var lastUploadedTimeMs = 0L

                locationCallback = object : com.google.android.gms.location.LocationCallback() {
                    override fun onLocationResult(result: com.google.android.gms.location.LocationResult) {
                        val loc = result.lastLocation ?: return
                        val newLatLng = LatLng(loc.latitude, loc.longitude)
                        userLocation = newLatLng
                        com.example.domain.engine.courier.CourierDebugCounters.gpsUpdates.incrementAndGet()
                        android.util.Log.d("COURIER_GPS", "REAL_HARDWARE_GPS_FIX: lat=${loc.latitude} lng=${loc.longitude} bearing=${loc.bearing} accuracy=${loc.accuracy}")

                        // BSD-COURIER-REAL-ROAD-ROUTING-ETA-001: Evaluación de llegada a geocerca (50m) y desvío controlado (>200m)
                        val targetCoords = if (faseActual == 1) comercioCoords else clienteCoords
                        val currentRoutePhase = if (faseActual == 1) CourierRoutePhase.TO_MERCHANT else CourierRoutePhase.TO_CUSTOMER
                        if (targetCoords != null) {
                            val distToDestMeters = GeoUtils.calculateDistance(
                                loc.latitude, loc.longitude,
                                targetCoords.latitude, targetCoords.longitude
                            ) * 1000.0
                            if (distToDestMeters <= 50.0) {
                                routeViewModel.onArrivedAtGeofence()
                            }
                        }
                        routeViewModel.onGpsLocationUpdated(
                            currentLocation = newLatLng,
                            currentPhase = currentRoutePhase,
                            destination = targetCoords
                        )

                        val now = System.currentTimeMillis()
                        val distanceMeters = FloatArray(1)
                        if (lastUploadedLat != 0.0 && lastUploadedLng != 0.0) {
                            android.location.Location.distanceBetween(
                                lastUploadedLat, lastUploadedLng,
                                loc.latitude, loc.longitude,
                                distanceMeters
                            )
                        } else {
                            distanceMeters[0] = 999f
                        }

                        // Throttle inteligente: escribir en Firestore si se desplazó > 5m o pasaron > 15s (heartbeat activo)
                        val shouldUpload = distanceMeters[0] >= 5f || (now - lastUploadedTimeMs) >= 15000L
                        if (!shouldUpload) {
                            return
                        }

                        lastUploadedLat = loc.latitude
                        lastUploadedLng = loc.longitude
                        lastUploadedTimeMs = now

                        val courierUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""
                        if (courierUid.isNotEmpty()) {
                            val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                            val locData = mapOf(
                                "motorizadoId" to courierUid,
                                "coordenadas" to mapOf("latitud" to loc.latitude, "longitud" to loc.longitude),
                                "latitud" to loc.latitude,
                                "longitud" to loc.longitude,
                                "bearing" to loc.bearing,
                                "speed" to loc.speed,
                                "accuracy" to loc.accuracy,
                                "estado" to "en_ruta",
                                "ultimaActualizacion" to com.google.firebase.Timestamp.now()
                            )
                            db.collection("ubicaciones_repartidores").document(courierUid)
                                .set(locData, com.google.firebase.firestore.SetOptions.merge())
                                .addOnFailureListener { e ->
                                    android.util.Log.w("FLOTA_DEBUG", "Error al guardar ubicacion_repartidor", e)
                                }

                            if (pedidoId.isNotEmpty()) {
                                db.collection("orders").document(pedidoId).update(
                                    "ubicacionRepartidor", mapOf(
                                        "latitud" to loc.latitude,
                                        "longitud" to loc.longitude,
                                        "bearing" to loc.bearing,
                                        "speed" to loc.speed,
                                        "timestamp" to System.currentTimeMillis()
                                    )
                                ).addOnFailureListener { e ->
                                    android.util.Log.w("FLOTA_DEBUG", "Error al actualizar ubicacionRepartidor en order", e)
                                }
                            }
                        }
                    }
                }
                fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, android.os.Looper.getMainLooper())
            } catch (e: Throwable) {
                if (e !is kotlinx.coroutines.CancellationException) {
                    errorCaught = e
                }
            }
        }

        onDispose {
            locationCallback?.let {
                try {
                    fusedLocationClient?.removeLocationUpdates(it)
                } catch (e: Throwable) {
                    // ignore cleanup exception
                }
            }
        }
    }

    val effectiveComercioNombre = if (comercioNombre.isNotBlank() && !comercioNombre.contains("{")) comercioNombre else commerceNameDbState.ifBlank { "Comercio" }
    val effectiveComercioDireccion = if (comercioDireccion.isNotBlank() && !comercioDireccion.contains("{")) comercioDireccion else commerceAddressDbState.ifBlank { "Dirección de recogida" }
    val effectiveClienteDireccion = if (clienteDireccion.isNotBlank() && !clienteDireccion.contains("{")) clienteDireccion else clientAddressDbState.ifBlank { "Dirección de entrega" }

    // Firestore listener descartable y seguro
    DisposableEffect(effectivePedidoId) {
        val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        var listenerRegistration: com.google.firebase.firestore.ListenerRegistration? = null

        if (currentUser != null && effectivePedidoId.isNotBlank()) {
            android.util.Log.d("APP_BOOT", "Pedido cargado: $effectivePedidoId")
            val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
            listenerRegistration = db.collection("orders").document(effectivePedidoId)
                .addSnapshotListener { snapshot, error ->
                    if (error == null && snapshot != null && snapshot.exists()) {
                            val estadoRaw = (snapshot.getString("status") ?: snapshot.getString("estado") ?: "courier_accepted").lowercase()
                            orderStatusDbState = estadoRaw
                            val phase = snapshot.getLong("courierPhase")?.toInt() ?: 1
                            serviceTypeState = snapshot.getString("serviceType") ?: snapshot.getString("type") ?: "COMMERCE_DELIVERY"
                            
                            val parseDoubleField = { key: String ->
                                val raw = snapshot.get(key)
                                when (raw) {
                                    is Number -> raw.toDouble()
                                    is String -> raw.replace("[^0-9.]".toRegex(), "").toDoubleOrNull() ?: 0.0
                                    else -> 0.0
                                }
                            }
                            val origenMap = snapshot.get("origen") as? Map<*, *>
                            val destinoMap = snapshot.get("destino") as? Map<*, *>

                            // Extracción segura de nombres y direcciones para evitar mostrar cadenas de plantilla
                            val cName = snapshot.getString("commerceName") ?: snapshot.getString("businessName") ?: (origenMap?.get("nombreComercio") as? String) ?: (origenMap?.get("nombre") as? String)
                            if (!cName.isNullOrBlank()) commerceNameDbState = cName

                            val cAddr = snapshot.getString("commerceAddress") ?: snapshot.getString("pickupAddress") ?: (origenMap?.get("direccion") as? String)
                            if (!cAddr.isNullOrBlank()) commerceAddressDbState = cAddr

                            val clAddr = snapshot.getString("customerAddress") ?: snapshot.getString("deliveryAddress") ?: (destinoMap?.get("direccion") as? String)
                            if (!clAddr.isNullOrBlank()) clientAddressDbState = clAddr

                            // BSD-COURIER-REAL-ROAD-ROUTING-ETA-001: Extracción exhaustiva de coordenadas reales (CERO Managua Centro)
                            val parseCoords = { map: Map<*, *>? ->
                                if (map == null) null
                                else {
                                    val coordSub = (map["coordenadas"] ?: map["ubicacion"] ?: map["location"]) as? Map<*, *>
                                    val rawLat = coordSub?.get("latitud") ?: coordSub?.get("latitude") ?: coordSub?.get("lat")
                                        ?: map["latitud"] ?: map["latitude"] ?: map["lat"]
                                    val rawLng = coordSub?.get("longitud") ?: coordSub?.get("longitude") ?: coordSub?.get("lng")
                                        ?: map["longitud"] ?: map["longitude"] ?: map["lng"]
                                    val lat = when (rawLat) {
                                        is Number -> rawLat.toDouble()
                                        is String -> rawLat.toDoubleOrNull()
                                        else -> null
                                    }
                                    val lng = when (rawLng) {
                                        is Number -> rawLng.toDouble()
                                        is String -> rawLng.toDoubleOrNull()
                                        else -> null
                                    }
                                    if (lat != null && lng != null && lat != 0.0 && lng != 0.0) LatLng(lat, lng) else null
                                }
                            }
                            val origC = parseCoords(origenMap) ?: run {
                                val rootLat = snapshot.getDouble("merchantLat") ?: snapshot.getDouble("pickupLatitude")
                                val rootLng = snapshot.getDouble("merchantLng") ?: snapshot.getDouble("pickupLongitude")
                                if (rootLat != null && rootLng != null && rootLat != 0.0 && rootLng != 0.0) LatLng(rootLat, rootLng) else null
                            }
                            val destC = parseCoords(destinoMap) ?: run {
                                val rootLat = snapshot.getDouble("customerLat") ?: snapshot.getDouble("deliveryLatitude")
                                val rootLng = snapshot.getDouble("customerLng") ?: snapshot.getDouble("deliveryLongitude")
                                if (rootLat != null && rootLng != null && rootLat != 0.0 && rootLng != 0.0) LatLng(rootLat, rootLng) else null
                            }
                            if (origC != null) comercioCoords = origC
                            if (destC != null) clienteCoords = destC

                            senderNameState = snapshot.getString("senderName") ?: (origenMap?.get("nombreCliente") as? String) ?: ""
                            senderPhoneState = snapshot.getString("senderPhone") ?: (origenMap?.get("telefono") as? String) ?: ""

                            customerPhoneState = snapshot.getString("customerPhone") ?: snapshot.getString("recipientPhone") ?: (destinoMap?.get("telefono") as? String) ?: snapshot.getString("telefono") ?: ""
                            paymentMethodState = snapshot.getString("paymentMethod") ?: snapshot.getString("metodoPago") ?: ""
                            paymentStatusState = snapshot.getString("paymentStatus") ?: ""
                            paymentVerifiedState = snapshot.getBoolean("paymentVerified") ?: false
                            payerState = snapshot.getString("payer") ?: "SENDER"
                            deliveryNoteState = snapshot.getString("deliveryNote") ?: snapshot.getString("notes") ?: snapshot.getString("deliveryInstructions") ?: snapshot.getString("instructions") ?: ""
                            tipAmountState = parseDoubleField("tipAmount").let { if (it > 0) it else parseDoubleField("tip") }
                            additionalChargeState = parseDoubleField("additionalChargeAmount").let { if (it > 0) it else parseDoubleField("additionalCharge") }
                            subtotalOrderState = parseDoubleField("subtotal")
                            discountOrderState = parseDoubleField("discountAmount").let { if (it > 0) it else parseDoubleField("couponDiscount") }
                            amountPaidState = parseDoubleField("amountPaid")
                            changeNeededState = parseDoubleField("changeNeeded")
                            totalOrderState = parseDoubleField("total")
                            if (totalOrderState == 0.0) {
                                totalOrderState = parseDoubleField("montoTotal")
                            }
                            deliveryFeeState = parseDoubleField("deliveryFee")
                            if (deliveryFeeState == 0.0) {
                                deliveryFeeState = parseDoubleField("costoEnvio")
                            }
                            if (deliveryFeeState == 0.0) {
                                deliveryFeeState = parseDoubleField("customerOffer")
                            }

                            val pSnapMap = snapshot.get("pricingSnapshot") as? Map<*, *>
                            val parseFromSnap = { key: String ->
                                val v = pSnapMap?.get(key)
                                when (v) {
                                    is Number -> v.toDouble()
                                    is String -> v.replace("[^0-9.]".toRegex(), "").toDoubleOrNull() ?: 0.0
                                    else -> 0.0
                                }
                            }
                            val rawCourierEarn = parseDoubleField("courierEarnings")
                                .let { if (it > 0) it else parseDoubleField("courierTotalEarnings") }
                                .let { if (it > 0) it else parseDoubleField("gananciaRepartidor") }
                                .let { if (it > 0) it else parseDoubleField("gananciaMotorizado") }
                                .let { if (it > 0) it else parseDoubleField("courierDistanceEarnings") }
                                .let { if (it > 0) it else parseFromSnap("courierEarnings") }

                            courierEarningsState = if (serviceTypeState == "X_TO_Y_DELIVERY") {
                                if (rawCourierEarn > 0) rawCourierEarn else deliveryFeeState
                            } else {
                                if (rawCourierEarn > 0) kotlin.math.floor(rawCourierEarn) else 0.0
                            }
                            val name = snapshot.getString("customerName") ?: snapshot.getString("recipientName") ?: (destinoMap?.get("nombreCliente") as? String)
                            if (!name.isNullOrEmpty()) {
                                customerNameState = name
                            }

                            val rawItems = (snapshot.get("items") ?: snapshot.get("productos")) as? List<*>
                            if (rawItems != null) {
                                orderProductsListState = rawItems.mapNotNull { itemRaw ->
                                    if (itemRaw is Map<*, *>) {
                                        val itemName = (itemRaw["productName"] ?: itemRaw["name"] ?: itemRaw["nombre"] ?: itemRaw["title"] ?: itemRaw["producto"] ?: itemRaw["product_name"] ?: itemRaw["descripcion"] ?: itemRaw["description"]) as? String ?: "Producto"
                                        val itemQty = when (val q = itemRaw["quantity"] ?: itemRaw["cantidad"] ?: itemRaw["qty"]) {
                                            is Number -> q.toInt()
                                            is String -> q.toIntOrNull() ?: 1
                                            else -> 1
                                        }
                                        Pair(itemName, itemQty)
                                    } else null
                                }
                            }
                            
                            faseActual = when {
                                estadoRaw in listOf("delivered", "completed", "entregado", "completado") || phase == 3 -> 3
                                estadoRaw in listOf("in_transit", "en_ruta", "en_camino") || phase == 2 -> 2
                                estadoRaw in listOf("picked_up", "recogido") -> 2
                                else -> 1
                            }
                        }
                    }
            }

        onDispose {
            listenerRegistration?.remove()
        }
    }

    // BSD-COURIER-REAL-ROAD-ROUTING-ETA-001: Disparador de cálculo de ruta vial por calles
    LaunchedEffect(faseActual, comercioCoords, clienteCoords, userLocation != null) {
        val target = if (faseActual == 1) comercioCoords else clienteCoords
        val start = userLocation
        val phase = if (faseActual == 1) CourierRoutePhase.TO_MERCHANT else CourierRoutePhase.TO_CUSTOMER
        if (start != null && target != null) {
            routeViewModel.loadRouteForPhase(
                origin = start,
                destination = target,
                phase = phase
            )
        }
        // Cargar SIEMPRE la ruta hacia el cliente para mostrarla por las calles
        if (clienteCoords != null) {
            val distToMerc = if (start != null && comercioCoords != null) {
                GeoUtils.calculateDistance(start.latitude, start.longitude, comercioCoords!!.latitude, comercioCoords!!.longitude) * 1000.0
            } else Double.MAX_VALUE

            val custOrigin = if (distToMerc <= 50.0 && start != null) start else (comercioCoords ?: start)
            if (custOrigin != null) {
                routeViewModel.loadCustomerRoute(
                    origin = custOrigin,
                    destination = clienteCoords
                )
            }
        }
    }

    // BSD-COURIER-REAL-ROAD-ROUTING-ETA-001: Cámara adaptada automáticamente a las rutas viales activas
    LaunchedEffect(activeRoute, customerRoute, mapLoaded) {
        if (mapLoaded) {
            val allPoints = mutableListOf<LatLng>()
            userLocation?.let { allPoints.add(it) }
            comercioCoords?.let { allPoints.add(it) }
            clienteCoords?.let { allPoints.add(it) }
            activeRoute?.points?.let { allPoints.addAll(it) }
            customerRoute?.points?.let { allPoints.addAll(it) }

            if (allPoints.size >= 2) {
                try {
                    val builder = LatLngBounds.builder()
                    allPoints.forEach { builder.include(it) }
                    val bounds = builder.build()
                    cameraPositionState.animate(
                        CameraUpdateFactory.newLatLngBounds(bounds, 130),
                        1000
                    )
                } catch (e: Exception) {
                    userLocation?.let { loc ->
                        cameraPositionState.position = CameraPosition.fromLatLngZoom(loc, 15f)
                    }
                }
            } else if (userLocation != null) {
                try {
                    cameraPositionState.animate(
                        CameraUpdateFactory.newLatLngZoom(userLocation!!, 15f),
                        800
                    )
                } catch (_: Exception) {}
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFE2E8F0))
    ) {

        // 1. MAPA DE FONDO AL 100%
        if (canInitializeMap) {
            val initLogTriggered = remember { mutableStateOf(false) }
            if (!initLogTriggered.value) {
                android.util.Log.d("APP_BOOT", "Inicializando GoogleMap")
                initLogTriggered.value = true
            }
            
            android.util.Log.d("FLOTA_DEBUG", "INICIALIZANDO_MAPA: Dibujando GoogleMap en RutaActivaScreen")
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                uiSettings = MapUiSettings(
                    zoomControlsEnabled = true,
                    myLocationButtonEnabled = true,
                    compassEnabled = true
                ),
                properties = MapProperties(
                    isMyLocationEnabled = locationPermissionGranted,
                    mapType = MapType.NORMAL
                ),
                onMapLoaded = {
                    android.util.Log.d("FLOTA_DEBUG", "ON_MAP_LOADED: El mapa se cargó y renderizó con éxito en RutaActivaScreen")
                    android.util.Log.d("APP_BOOT", "GoogleMap listo")
                    mapLoaded = true
                }
            ) {
                // Marcador del Motorizado
                userLocation?.let { loc ->
                    Marker(
                        state = MarkerState(position = loc),
                        title = "Tu Ubicación",
                        snippet = "Repartidor en camino"
                    )
                }

                // Marcador del Origen (Comercio) si existen coordenadas válidas
                comercioCoords?.let { coords ->
                    Marker(
                        state = MarkerState(position = coords),
                        title = effectiveComercioNombre,
                        snippet = "Origen: " + effectiveComercioDireccion
                    )
                }

                // Marcador del Destino (Cliente) si existen coordenadas válidas
                clienteCoords?.let { coords ->
                    Marker(
                        state = MarkerState(position = coords),
                        title = customerNameState.ifEmpty { "Cliente Destinatario" },
                        snippet = "Destino: " + effectiveClienteDireccion
                    )
                }

                // BSD-COURIER-REAL-ROAD-ROUTING-ETA-001: Líneas de ruta vial real por calles (CERO líneas rectas)
                // 1. Ruta al Cliente (Verde Esmeralda #10B981) - Siempre visible para guiar la entrega por calles
                val custPts = customerRoute?.points ?: (if (faseActual == 2) activeRoute?.points else null)
                if (!custPts.isNullOrEmpty() && custPts.size >= 2) {
                    Polyline(
                        points = custPts,
                        color = Color(0xFF10B981),
                        width = 14f
                    )
                }

                // 2. Ruta al Comercio (Violeta #6366F1) - Visible durante Fase 1 si el motorizado aún no ha llegado al comercio
                val merchantPts = if (faseActual == 1) activeRoute?.points else null
                val isAlreadyAtMerchant = userLocation != null && comercioCoords != null && 
                    (GeoUtils.calculateDistance(userLocation!!.latitude, userLocation!!.longitude, comercioCoords!!.latitude, comercioCoords!!.longitude) * 1000.0 <= 50.0)
                if (!isAlreadyAtMerchant && !merchantPts.isNullOrEmpty() && merchantPts.size >= 2) {
                    Polyline(
                        points = merchantPts,
                        color = Color(0xFF6366F1),
                        width = 14f
                    )
                }
            }
        } else {
            if (!playServicesAvailable) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF1E293B)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Google Play Services no disponible.\nEl mapa se ha desactivado para garantizar la estabilidad de la aplicación.",
                        color = Color.White,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(24.dp)
                    )
                }
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF1E293B)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Inicializando mapa...",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                    }
                }
            }
        }

        // BSD-COURIER-REAL-ROAD-ROUTING-ETA-001: Botón flotante para recentrar la cámara en la posición actual
        FloatingActionButton(
            onClick = {
                userLocation?.let { loc ->
                    coroutineScope.launch {
                        try {
                            cameraPositionState.animate(
                                CameraUpdateFactory.newLatLngZoom(loc, 16.5f),
                                800
                            )
                        } catch (e: Exception) {
                            cameraPositionState.position = CameraPosition.fromLatLngZoom(loc, 16.5f)
                        }
                    }
                }
            },
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 16.dp)
                .size(48.dp)
                .zIndex(10f),
            shape = CircleShape,
            containerColor = Color.White,
            contentColor = Color(0xFF1E293B),
            elevation = FloatingActionButtonDefaults.elevation(6.dp)
        ) {
            Icon(
                imageVector = Icons.Default.MyLocation,
                contentDescription = "Recentrar",
                modifier = Modifier.size(22.dp)
            )
        }

        // 2. HEADER TRANSLÚCIDO FLOTANTE (ESTADO DE LA RUTA)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .align(Alignment.TopCenter)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(6.dp, RoundedCornerShape(16.dp))
                    .background(Color.White.copy(alpha = 0.94f), RoundedCornerShape(16.dp))
                    .border(1.dp, Color.White, RoundedCornerShape(16.dp))
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(
                                when {
                                    faseActual == 3 -> Color(0xFFDCFCE7)
                                    faseActual == 2 -> Color(0xFFDCFCE7)
                                    orderStatusDbState == "picked_up" -> Color(0xFFFEF3C7)
                                    else -> Color(0xFFEEF2F6)
                                },
                                CircleShape
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (faseActual == 3) Icons.Default.CheckCircle else Icons.AutoMirrored.Filled.DirectionsBike,
                            contentDescription = "Fase",
                            tint = when {
                                faseActual == 3 -> Color(0xFF10B981)
                                faseActual == 2 -> Color(0xFF10B981)
                                orderStatusDbState == "picked_up" -> Color(0xFFD97706)
                                else -> Color(0xFF6366F1)
                            },
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        val isXToY = serviceTypeState == "X_TO_Y_DELIVERY"
                        val headerTitle = when {
                            faseActual == 3 && isXToY -> "Fase 2: Encomienda Entregada"
                            faseActual == 3 -> "Fase 3: Entregado"
                            faseActual == 2 && isXToY -> "Fase 2: Hacia Destino (Punto Y)"
                            faseActual == 2 -> "Fase 2: En Ruta al Cliente"
                            orderStatusDbState == "picked_up" && isXToY -> "Fase 1: Encomienda Recogida"
                            orderStatusDbState == "picked_up" -> "Fase 1: Pedido Recogido"
                            isXToY -> "Fase 1: Hacia Punto X (Origen)"
                            else -> "Fase 1: En el Comercio"
                        }
                        val headerSubtitle = when {
                            faseActual == 3 -> "Entrega completada"
                            faseActual == 2 && isXToY -> "En camino hacia el destinatario"
                            faseActual == 2 -> "Hacia el cliente"
                            orderStatusDbState == "picked_up" && isXToY -> "Listo para iniciar ruta a Punto Y"
                            orderStatusDbState == "picked_up" -> "Listo para iniciar ruta"
                            isXToY -> "Dirígete al punto de recogida"
                            else -> "Estoy en el comercio"
                        }
                        Text(
                            text = headerTitle,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 14.sp,
                            color = Color(0xFF1E293B)
                        )
                        val distToMerchantMeters = if (userLocation != null && comercioCoords != null) {
                            GeoUtils.calculateDistance(userLocation!!.latitude, userLocation!!.longitude, comercioCoords!!.latitude, comercioCoords!!.longitude) * 1000.0
                        } else Double.MAX_VALUE
                        val isAtMerchant = distToMerchantMeters <= 50.0 || orderStatusDbState in listOf("picked_up", "recogido")
                        val relevantRoute = if (isAtMerchant && customerRoute != null) customerRoute else activeRoute

                        if (relevantRoute != null && routingStatus != RoutingStatus.NO_ROUTE_AVAILABLE) {
                            val suffix = if (isAtMerchant && faseActual == 1) " al cliente" else ""
                            Text(
                                text = "${String.format(java.util.Locale.US, "%.1f", relevantRoute!!.distanceKm)} km • ${relevantRoute!!.durationMinutes} min$suffix",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (faseActual == 1 && !isAtMerchant) Color(0xFF4F46E5) else Color(0xFF059669)
                            )
                        } else if (routingStatus == RoutingStatus.NO_ROUTE_AVAILABLE) {
                            Text(
                                text = "⚠️ Ruta vial temporalmente no disponible",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFFDC2626)
                            )
                        } else if (routingStatus == RoutingStatus.NO_VALID_COORDINATES) {
                            Text(
                                text = "⚠️ Coordenadas de destino no registradas",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFFD97706)
                            )
                        } else if (routingStatus == RoutingStatus.CALCULATING || routingStatus == RoutingStatus.UPDATING) {
                            Text(
                                text = "Calculando ruta vial...",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color(0xFF6366F1)
                            )
                        } else {
                            Text(
                                text = headerSubtitle,
                                fontSize = 11.sp,
                                color = Color(0xFF64748B)
                            )
                        }
                    }
                }

                val isXToY = serviceTypeState == "X_TO_Y_DELIVERY"
                val badgeText = when {
                    faseActual == 3 -> "ENTREGADO"
                    faseActual == 2 && isXToY -> "HACIA DESTINO"
                    faseActual == 2 -> "EN RUTA"
                    orderStatusDbState == "picked_up" -> "RECOGIDO"
                    isXToY -> "RECOGIDA X"
                    else -> "RECOGIDA"
                }
                val badgeBg = when {
                    faseActual == 3 -> Color(0xFFD1FAE5)
                    faseActual == 2 -> Color(0xFFD1FAE5)
                    orderStatusDbState == "picked_up" -> Color(0xFFFEF3C7)
                    else -> Color(0xFFE0E7FF)
                }
                val badgeColor = when {
                    faseActual == 3 -> Color(0xFF065F46)
                    faseActual == 2 -> Color(0xFF065F46)
                    orderStatusDbState == "picked_up" -> Color(0xFFB45309)
                    else -> Color(0xFF4F46E5)
                }

                Box(
                    modifier = Modifier
                        .background(badgeBg, RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = badgeText,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                        color = badgeColor
                    )
                }
            }
        }

        val focusManager = LocalFocusManager.current

        // 3. TARJETA FLOTANTE INFERIOR DE ACCIÓN (CON TOGGLE DE NAVEGACIÓN Y VALIDACIÓN DE PAGO)
        if (cardVisibility == RouteCardVisibility.COLLAPSED) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 16.dp)
                    .align(Alignment.BottomCenter)
            ) {
                Button(
                    onClick = { routeViewModel.toggleCardVisibility() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp)
                        .shadow(10.dp, RoundedCornerShape(18.dp))
                        .testTag("btn_expandir_tarjeta"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (faseActual == 1) Color(0xFF6366F1) else Color(0xFF10B981)
                    ),
                    shape = RoundedCornerShape(18.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.KeyboardArrowUp,
                        contentDescription = "Expandir",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (faseActual == 1) "Ver pedido" else "Ver entrega",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color.White
                    )
                }
            }
        } else {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .imePadding()
                    .padding(16.dp)
                    .align(Alignment.BottomCenter)
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(16.dp, RoundedCornerShape(28.dp))
                        .testTag("tarjeta_ruta_activa"),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .padding(20.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Barra superior para contraer durante navegación
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(
                                onClick = { routeViewModel.setCardVisibility(RouteCardVisibility.COLLAPSED) },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.KeyboardArrowDown,
                                    contentDescription = "Ocultar",
                                    tint = Color(0xFF64748B),
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Ocultar",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF64748B)
                                )
                            }
                        }
                    
                    // Indicador Visual de Dirección Activa
                    val isXToY = serviceTypeState == "X_TO_Y_DELIVERY"
                    Row(verticalAlignment = Alignment.Top) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .background(
                                    if (faseActual == 1) (if (isXToY) Color(0xFFFEF3C7) else Color(0xFFEEF2F6)) else Color(0xFFFCE7F3),
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (faseActual == 1 && !isXToY) Icons.Default.Store else Icons.Default.LocationOn,
                                contentDescription = if (faseActual == 1) "Origen" else "Destino",
                                tint = if (faseActual == 1) (if (isXToY) Color(0xFFD97706) else Color(0xFF6366F1)) else Color(0xFFEC4899),
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        
                        Spacer(modifier = Modifier.width(14.dp))
                        
                        Column(modifier = Modifier.weight(1f)) {
                            val distToClientMeters = if (userLocation != null && clienteCoords != null) {
                                GeoUtils.calculateDistance(userLocation!!.latitude, userLocation!!.longitude, clienteCoords!!.latitude, clienteCoords!!.longitude) * 1000.0
                            } else Double.MAX_VALUE
                            val isAtCustomer = distToClientMeters <= 60.0

                            val cardLabel = when {
                                faseActual == 2 && isXToY && isAtCustomer -> "📍 HAS LLEGADO AL DESTINO (PUNTO Y)"
                                faseActual == 2 && isXToY -> "🚚 EN RUTA AL DESTINATARIO (PUNTO Y)"
                                faseActual == 2 && isAtCustomer -> "📍 HAS LLEGADO AL DESTINO (CLIENTE)"
                                faseActual == 2 -> "🛵 EN RUTA AL DESTINO (CLIENTE)"
                                orderStatusDbState == "picked_up" && isXToY -> "📦 ENCOMIENDA RECOGIDA EN PUNTO X"
                                orderStatusDbState == "picked_up" -> "📦 RECOGIDA CONFIRMADA EN COMERCIO"
                                isXToY -> "📍 ORIGEN DE RECOGIDA (PUNTO X)"
                                else -> "🏪 PUNTO DE RECOGIDA (COMERCIO)"
                            }
                            Text(
                                text = cardLabel,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black,
                                color = if (faseActual == 2) Color(0xFFBE185D) else Color(0xFF94A3B8),
                                letterSpacing = 0.5.sp
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            val displayName = when {
                                faseActual == 2 -> customerNameState
                                isXToY && senderNameState.isNotBlank() -> "Remitente: $senderNameState"
                                else -> effectiveComercioNombre
                            }
                            Text(
                                text = displayName,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = Color(0xFF1E293B)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = if (faseActual == 2) effectiveClienteDireccion else effectiveComercioDireccion,
                                fontSize = 13.sp,
                                color = Color(0xFF64748B),
                                lineHeight = 18.sp
                            )
                        }
                        
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // Botón de Chat en vivo con el Cliente
                            IconButton(
                                onClick = { showChatDialog = true }
                            ) {
                                Surface(
                                    shape = CircleShape,
                                    color = Color(0xFFEFF6FF),
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.AutoMirrored.Filled.Chat,
                                            contentDescription = "Chat con el cliente",
                                            tint = Color(0xFF3B82F6),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }

                            // Botón de Llamada telefónica (Fase 1: Remitente / Fase 2: Destinatario)
                            val phoneToCall = if (faseActual == 1) senderPhoneState else customerPhoneState
                            if (phoneToCall.isNotEmpty()) {
                                Spacer(modifier = Modifier.width(4.dp))
                                IconButton(
                                    onClick = {
                                        val intent = Intent(Intent.ACTION_DIAL).apply {
                                            data = Uri.parse("tel:$phoneToCall")
                                        }
                                        context.startActivity(intent)
                                    }
                                ) {
                                    Surface(
                                        shape = CircleShape,
                                        color = Color(0xFFECFDF5),
                                        modifier = Modifier.size(36.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = Icons.Default.Phone,
                                                contentDescription = if (faseActual == 1) "Llamar al remitente" else "Llamar al destinatario",
                                                tint = Color(0xFF10B981),
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = Color(0xFFF1F5F9))
                    Spacer(modifier = Modifier.height(14.dp))
                    
                    // SECCIÓN DE RESUMEN Y COBRO DE PAGO HIGH-CONTRAST (PAYMENT HARDENING)
                    val methodLower = paymentMethodState.trim().lowercase()
                    val isEfectivo = methodLower.isEmpty() || methodLower == "efectivo" || methodLower == "cash"
                    val isElectronicPaidConfirmed = !isEfectivo && paymentStatusState.equals("PAID", ignoreCase = true) && paymentVerifiedState

                    val receivedAmount = cashReceivedInput.toDoubleOrNull() ?: 0.0
                    val changeAmount = receivedAmount - totalOrderState
                    val isCashValid = (faseActual == 1) || (payerState != "RECIPIENT" && !isEfectivo) || (receivedAmount >= totalOrderState)
                    val isPaymentReadyToDeliver = if (isEfectivo) isCashValid else (isElectronicPaidConfirmed || (faseActual == 1))

                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (isEfectivo) Color(0xFFFFF7ED) else if (isElectronicPaidConfirmed) Color(0xFFF0FDF4) else Color(0xFFFEF2F2)
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isEfectivo) Color(0xFFFFEDD5) else if (isElectronicPaidConfirmed) Color(0xFFDCFCE7) else Color(0xFFFECACA)
                        )
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            if (orderProductsListState.isNotEmpty()) {
                                Surface(
                                    color = Color(0xFFF1F5F9),
                                    shape = RoundedCornerShape(10.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)
                                ) {
                                    Column(modifier = Modifier.padding(10.dp)) {
                                        Text(
                                            text = "🛍️ PRODUCTOS A LLEVAR (${orderProductsListState.sumOf { it.second }})",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFF334155),
                                            letterSpacing = 0.5.sp
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        orderProductsListState.forEach { (pName, pQty) ->
                                            Text(
                                                text = "• ${pQty}x $pName",
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF0F172A),
                                                modifier = Modifier.padding(vertical = 2.dp)
                                            )
                                        }
                                    }
                                }
                            }

                            if (packageDescriptionState.isNotEmpty()) {
                                Surface(
                                    color = Color(0xFFF1F5F9),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                                ) {
                                    Text(
                                        text = "📦 Paquete: $packageDescriptionState",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF0F172A),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                    )
                                }
                            }

                            if (deliveryNoteState.isNotEmpty()) {
                                Surface(
                                    color = Color(0xFFEFF6FF),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)
                                ) {
                                    Text(
                                        text = "📝 Nota de entrega: $deliveryNoteState",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF1E40AF),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                    )
                                }
                            }

                            if (payerState == "RECIPIENT") {
                                if (faseActual == 1) {
                                    Text("ℹ️ NO COBRAR AL REMITENTE", fontWeight = FontWeight.Black, fontSize = 11.sp, color = Color(0xFF2563EB))
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text("El destinatario pagará C$ ${String.format("%.2f", totalOrderState)} en efectivo al entregar.", fontSize = 12.sp, color = Color(0xFF1E40AF), fontWeight = FontWeight.SemiBold)
                                } else {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("💰 Cobro en destino:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF9A3412))
                                        Text("C$ ${String.format(java.util.Locale.US, "%.2f", totalOrderState)}", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color(0xFF9A3412), maxLines = 1, softWrap = false)
                                    }
                                }
                            } else if (isEfectivo) {
                                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("💵 Cobro en efectivo:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF9A3412))
                                        Text("C$ ${String.format(java.util.Locale.US, "%.2f", totalOrderState)}", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color(0xFF9A3412), maxLines = 1, softWrap = false)
                                    }
                                    if (tipAmountState > 0) {
                                        Text("Incluye C$ ${String.format("%.2f", tipAmountState)} de propina para vos 🎉", fontSize = 11.sp, color = Color(0xFFD97706), fontWeight = FontWeight.Bold)
                                    }
                                }
                            } else if (isElectronicPaidConfirmed) {
                                Text(
                                    text = "✓ PAGADO CON TARJETA / ELECTRÓNICO",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 12.sp,
                                    color = Color(0xFF15803D)
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "No solicitar cobro al cliente (Pago verificado).",
                                    fontSize = 13.sp,
                                    color = Color(0xFF166534),
                                    fontWeight = FontWeight.SemiBold
                                )
                            } else {
                                Text(
                                    text = "⚠️ PAGO ELECTRÓNICO NO CONFIRMADO",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 12.sp,
                                    color = Color(0xFFDC2626)
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Estado: $paymentStatusState. No entregar sin confirmación de pago.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF991B1B),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    // CAMPO DE EFECTIVO RECIBIDO Y CÁLCULO DE CAMBIO (SOLO FASE 2 + EFECTIVO)
                    if (faseActual == 2 && isEfectivo) {
                        Spacer(modifier = Modifier.height(14.dp))
                        OutlinedTextField(
                            value = cashReceivedInput,
                            onValueChange = { cashReceivedInput = it },
                            label = { Text("Efectivo recibido (C$)", fontWeight = FontWeight.Bold) },
                            placeholder = { Text("Ej. 500", color = Color(0xFF94A3B8)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            textStyle = androidx.compose.ui.text.TextStyle(
                                color = Color(0xFF0F172A),
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            ),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color(0xFF0F172A),
                                unfocusedTextColor = Color(0xFF0F172A),
                                focusedContainerColor = Color(0xFFF8FAFC),
                                unfocusedContainerColor = Color(0xFFF8FAFC),
                                focusedBorderColor = Color(0xFF10B981),
                                unfocusedBorderColor = Color(0xFF94A3B8),
                                focusedLabelColor = Color(0xFF047857),
                                unfocusedLabelColor = Color(0xFF475569),
                                cursorColor = Color(0xFF10B981)
                            ),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Decimal,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = { focusManager.clearFocus() }
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // BADGE DE CÁLCULO DE VUELTO O ADVERTENCIA
                        if (cashReceivedInput.isNotEmpty()) {
                            if (receivedAmount < totalOrderState) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(Color(0xFFFEF2F2), RoundedCornerShape(12.dp))
                                        .border(1.dp, Color(0xFFFECACA), RoundedCornerShape(12.dp))
                                        .padding(10.dp)
                                ) {
                                    Text(
                                        text = "⚠️ Monto insuficiente. Faltan C$ ${String.format("%.2f", totalOrderState - receivedAmount)}",
                                        color = Color(0xFFDC2626),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                }
                            } else {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(Color(0xFFF0FDF4), RoundedCornerShape(12.dp))
                                        .border(1.dp, Color(0xFF86EFAC), RoundedCornerShape(12.dp))
                                        .padding(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "✓ Cambio a entregar al cliente:",
                                            color = Color(0xFF166534),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp
                                        )
                                        Text(
                                            text = "C$ ${String.format("%.2f", changeAmount)}",
                                            color = Color(0xFF15803D),
                                            fontWeight = FontWeight.Black,
                                            fontSize = 16.sp
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // BOTÓN PRINCIPAL DE ACCIÓN
                    val isPickupStep = orderStatusDbState !in listOf("picked_up", "recogido", "in_transit", "en_ruta", "en_camino", "delivered", "completed", "entregado", "completado")
                    val isStartRouteStep = orderStatusDbState in listOf("picked_up", "recogido")

                    val buttonText = when {
                        isPickupStep && isXToY -> "CONFIRMAR RECOGIDA DE ENCOMIENDA 📦"
                        isPickupStep -> "Estoy en el comercio — CONFIRMAR RECOGIDA"
                        isStartRouteStep && isXToY -> "INICIAR RUTA HACIA DESTINATARIO 🚚"
                        isStartRouteStep -> "INICIAR RUTA AL CLIENTE 🚀"
                        isEfectivo && !isCashValid -> "Efectivo Insuficiente (Faltan C$ ${String.format("%.2f", totalOrderState - receivedAmount)})"
                        !isEfectivo && !isElectronicPaidConfirmed -> "Pago no confirmado — No entregar"
                        isXToY -> "CONFIRMAR ENTREGA Y FINALIZAR ✅"
                        else -> "CONFIRMAR ENTREGA Y COBRO"
                    }

                    val targetOrderId = effectivePedidoId.ifBlank { pedidoId }

                    Button(
                        onClick = {
                            if (actualizandoEstado) return@Button
                            focusManager.clearFocus()
                            if (isPickupStep) {
                                actualizandoEstado = true
                                android.util.Log.d("COURIER_PICKUP", "orderId=$targetOrderId status=in_transit")
                                coroutineScope.launch {
                                    try {
                                        val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                                        val updates = mapOf<String, Any>(
                                            "status" to "in_transit",
                                            "estado" to "en_camino",
                                            "courierPhase" to 2,
                                            "pickedUpAt" to com.google.firebase.Timestamp.now(),
                                            "updatedAt" to com.google.firebase.Timestamp.now()
                                        )
                                        if (isXToY) {
                                            db.collection("deliveryTrips")
                                                .document(targetOrderId)
                                                .update(updates)
                                                .addOnSuccessListener {
                                                    actualizandoEstado = false
                                                    orderStatusDbState = "in_transit"
                                                    faseActual = 2
                                                    db.collection("orders").document(targetOrderId).update(updates)
                                                        .addOnFailureListener { mirrorErr ->
                                                            android.util.Log.w("COURIER_PICKUP", "[MIRROR] orders update failed (inocuous): ${mirrorErr.message}")
                                                        }
                                                }
                                                .addOnFailureListener { e ->
                                                    actualizandoEstado = false
                                                    android.util.Log.e("COURIER_PICKUP", "Error al actualizar deliveryTrips a in_transit", e)
                                                }
                                        } else {
                                            db.collection("orders")
                                                .document(targetOrderId)
                                                .update(updates)
                                                .addOnSuccessListener {
                                                    actualizandoEstado = false
                                                    orderStatusDbState = "in_transit"
                                                    faseActual = 2
                                                }
                                                .addOnFailureListener { e ->
                                                    actualizandoEstado = false
                                                    android.util.Log.e("COURIER_PICKUP", "Error al actualizar estado a in_transit", e)
                                                }
                                        }
                                    } catch (e: Exception) {
                                        actualizandoEstado = false
                                    }
                                }
                            } else if (isStartRouteStep) {
                                actualizandoEstado = true
                                android.util.Log.d("COURIER_START_ROUTE", "orderId=$targetOrderId status=in_transit")
                                coroutineScope.launch {
                                    try {
                                        val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                                        val updates = mapOf<String, Any>(
                                            "status" to "in_transit",
                                            "estado" to "en_camino",
                                            "courierPhase" to 2,
                                            "updatedAt" to com.google.firebase.Timestamp.now()
                                        )
                                        if (isXToY) {
                                            db.collection("deliveryTrips")
                                                .document(targetOrderId)
                                                .update(updates)
                                                .addOnSuccessListener {
                                                    actualizandoEstado = false
                                                    orderStatusDbState = "in_transit"
                                                    faseActual = 2
                                                    db.collection("orders").document(targetOrderId).update(updates)
                                                        .addOnFailureListener { mirrorErr ->
                                                            android.util.Log.w("COURIER_START_ROUTE", "[MIRROR] orders update failed (inocuous): ${mirrorErr.message}")
                                                        }
                                                }
                                                .addOnFailureListener { e ->
                                                    actualizandoEstado = false
                                                    android.util.Log.e("COURIER_START_ROUTE", "Error al actualizar deliveryTrips a in_transit", e)
                                                }
                                        } else {
                                            db.collection("orders")
                                                .document(targetOrderId)
                                                .update(updates)
                                                .addOnSuccessListener {
                                                    actualizandoEstado = false
                                                    orderStatusDbState = "in_transit"
                                                    faseActual = 2
                                                }
                                                .addOnFailureListener { e ->
                                                    actualizandoEstado = false
                                                    android.util.Log.e("COURIER_START_ROUTE", "Error al actualizar estado a in_transit", e)
                                                }
                                        }
                                    } catch (e: Exception) {
                                        actualizandoEstado = false
                                    }
                                }
                            } else {
                                // Fase 2 -> Confirmar Entrega y Cierre COMPLETED
                                actualizandoEstado = true
                                android.util.Log.d("COURIER_PAYMENT", "total=$totalOrderState received=$receivedAmount change=$changeAmount")
                                android.util.Log.d("COURIER_DELIVERY", "orderId=$targetOrderId status=delivered -> status=completed")
                                coroutineScope.launch {
                                    try {
                                        val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                                        val nowIso = java.time.Instant.now().toString()
                                        val deliveryEvent = mapOf(
                                            "status" to "delivered",
                                            "estado" to "entregado",
                                            "timestamp" to nowIso
                                        )
                                        val completedEvent = mapOf(
                                            "status" to "completed",
                                            "estado" to "completado",
                                            "timestamp" to nowIso
                                        )
                                        val finalCashCollected = if (isEfectivo) (receivedAmount - changeAmount.coerceAtLeast(0.0)) else 0.0
                                        val cashDiscrepancy = if (isEfectivo) (receivedAmount - totalOrderState) else 0.0

                                        if (isXToY) {
                                            // ── FASE 3B: CIERRE OPERATIVO CANÓNICO X→Y (/deliveryTrips/{tripId}) ──
                                            // /deliveryTrips/{tripId} es la entidad PRIMARIA Y AUTORITATIVA indiscutible.
                                            // Android escribe ÚNICAMENTE campos operativos. CERO autoridad financiera (sin financialReconciliationStatus).
                                            val tripUpdates = hashMapOf<String, Any>(
                                                "status" to "completed",
                                                "estado" to "completado",
                                                "courierPhase" to 3,
                                                "deliveredAt" to com.google.firebase.Timestamp.now(),
                                                "completedAt" to com.google.firebase.Timestamp.now(),
                                                "updatedAt" to com.google.firebase.Timestamp.now(),
                                                "historialEstados" to com.google.firebase.firestore.FieldValue.arrayUnion(deliveryEvent, completedEvent),
                                                "cashReceived" to receivedAmount,
                                                "changeGiven" to changeAmount,
                                                "cashCollectedNet" to finalCashCollected,
                                                "cashDiscrepancy" to (cashDiscrepancy != 0.0),
                                                "discrepancyAmount" to cashDiscrepancy
                                            )

                                            android.util.Log.d("COURIER_DELIVERY", "[X_TO_Y_PRIMARY] Actualizando primariamente deliveryTrips/$targetOrderId a completed")
                                            db.collection("deliveryTrips")
                                                .document(targetOrderId)
                                                .update(tripUpdates)
                                                .addOnSuccessListener {
                                                    actualizandoEstado = false
                                                    orderStatusDbState = "completed"
                                                    faseActual = 3
                                                    mostrarExitoDialog = true
                                                    android.util.Log.d("COURIER_DELIVERY", "[X_TO_Y_PRIMARY_SUCCESS] deliveryTrips/$targetOrderId marcado exitosamente como completed")

                                                    // Sincronización desacoplada del mirror auxiliar /orders/{id} (Non-blocking, fail-safe)
                                                    // Un fallo en el mirror de orders NUNCA debe anular ni impedir la finalización de deliveryTrips.
                                                    val orderMirrorUpdates = hashMapOf<String, Any>(
                                                        "status" to "completed",
                                                        "estado" to "completado",
                                                        "courierPhase" to 3,
                                                        "deliveredAt" to com.google.firebase.Timestamp.now(),
                                                        "completedAt" to com.google.firebase.Timestamp.now(),
                                                        "updatedAt" to com.google.firebase.Timestamp.now(),
                                                        "historialEstados" to com.google.firebase.firestore.FieldValue.arrayUnion(deliveryEvent, completedEvent),
                                                        "cashReceived" to receivedAmount,
                                                        "changeGiven" to changeAmount,
                                                        "cashCollectedNet" to finalCashCollected,
                                                        "cashDiscrepancy" to (cashDiscrepancy != 0.0),
                                                        "discrepancyAmount" to cashDiscrepancy
                                                    )
                                                    db.collection("orders")
                                                        .document(targetOrderId)
                                                        .update(orderMirrorUpdates)
                                                        .addOnFailureListener { mirrorErr ->
                                                            android.util.Log.w("COURIER_DELIVERY", "[MIRROR_NON_BLOCKING] orders/$targetOrderId mirror no actualizado (inocuo para X->Y): ${mirrorErr.message}")
                                                        }
                                                }
                                                .addOnFailureListener { e ->
                                                    actualizandoEstado = false
                                                    android.util.Log.e("COURIER_DELIVERY", "[X_TO_Y_PRIMARY_ERROR] Error al completar deliveryTrips/$targetOrderId", e)
                                                }
                                        } else {
                                            // ── FLUJO PREEXISTENTE COMMERCE DELIVERY (INTACTO Y SIN MODIFICACIONES) ──
                                            val finalUpdates = hashMapOf<String, Any>(
                                                "status" to "completed",
                                                "estado" to "completado",
                                                "courierPhase" to 3,
                                                "deliveredAt" to com.google.firebase.Timestamp.now(),
                                                "completedAt" to com.google.firebase.Timestamp.now(),
                                                "updatedAt" to com.google.firebase.Timestamp.now(),
                                                "historialEstados" to com.google.firebase.firestore.FieldValue.arrayUnion(deliveryEvent, completedEvent),
                                                "cashReceived" to receivedAmount,
                                                "changeGiven" to changeAmount,
                                                "cashCollectedNet" to finalCashCollected,
                                                "cashDiscrepancy" to (cashDiscrepancy != 0.0),
                                                "discrepancyAmount" to cashDiscrepancy,
                                                "financialReconciliationStatus" to if (cashDiscrepancy != 0.0) "DISCREPANCY_FLAGGED" else "RECONCILED_OK"
                                            )

                                            db.collection("orders")
                                                .document(targetOrderId)
                                                .update(finalUpdates)
                                                .addOnSuccessListener {
                                                    actualizandoEstado = false
                                                    orderStatusDbState = "completed"
                                                    faseActual = 3
                                                    mostrarExitoDialog = true
                                                }
                                                .addOnFailureListener { e ->
                                                    actualizandoEstado = false
                                                    android.util.Log.e("COURIER_DELIVERY", "Error al completar pedido Commerce", e)
                                                }
                                        }
                                    } catch (e: Exception) {
                                        actualizandoEstado = false
                                    }
                                }
                            }
                        },
                        enabled = !actualizandoEstado && (isPickupStep || isStartRouteStep || isPaymentReadyToDeliver),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp)
                            .testTag("boton_accion_ruta"),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isPickupStep) Color(0xFF6366F1) else if (isStartRouteStep) Color(0xFFF59E0B) else Color(0xFF10B981),
                            disabledContainerColor = Color(0xFFCBD5E1),
                            disabledContentColor = Color(0xFF64748B)
                        )
                    ) {
                        if (actualizandoEstado) {
                            CircularProgressIndicator(
                                color = Color.White,
                                modifier = Modifier.size(22.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = buttonText,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 15.sp,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }
    }

        // Diálogo de éxito de entrega final
        if (mostrarExitoDialog) {
            AlertDialog(
                onDismissRequest = {
                    mostrarExitoDialog = false
                    onFinalizarEntrega()
                },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF10B981)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("¡Entrega Exitosa!", fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                    }
                },
                text = {
                    Column {
                        Text(
                            text = "El pedido ha sido entregado correctamente al cliente.",
                            color = Color(0xFF475569)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF0FDF4), RoundedCornerShape(12.dp))
                                .border(1.dp, Color(0xFFDCFCE7), RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            val effectiveGain = if (courierEarningsState > 0.0) courierEarningsState
                                else if (serviceTypeState == "X_TO_Y_DELIVERY" && deliveryFeeState > 0.0) deliveryFeeState
                                else 0.0
                            val totalCourierEarn = effectiveGain + tipAmountState

                            Column {
                                Text(
                                    text = "TU GANANCIA POR ESTE ENVÍO",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF15803D)
                                )
                                Text(
                                    text = "C$ ${String.format(java.util.Locale.US, "%.2f", totalCourierEarn)}",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF166534)
                                )
                                if (tipAmountState > 0.0) {
                                    Text(
                                        text = "Envío: C$ ${String.format(java.util.Locale.US, "%.2f", effectiveGain)} + Propina: C$ ${String.format(java.util.Locale.US, "%.2f", tipAmountState)}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF047857)
                                    )
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            mostrarExitoDialog = false
                            onFinalizarEntrega()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                    ) {
                        Text("Aceptar")
                    }
                },
                shape = RoundedCornerShape(20.dp),
                containerColor = Color.White
            )
        }

        // Pantalla / Modal de Chat en Vivo con el Cliente (Overlay Full-Screen reactivo)
        if (showChatDialog) {
            androidx.activity.compose.BackHandler { showChatDialog = false }
            Surface(
                modifier = Modifier
                    .fillMaxSize()
                    .zIndex(100f),
                color = MaterialTheme.colorScheme.background
            ) {
                val chatDomain = if (serviceTypeState == "X_TO_Y_DELIVERY" || serviceTypeState == "P2P") {
                    com.example.domain.model.ChatDomain.X_TO_Y_TRIP
                } else {
                    com.example.domain.model.ChatDomain.COMMERCE_ORDER
                }
                com.example.presentation.chat.OrderChatScreen(
                    orderId = pedidoId,
                    domain = chatDomain,
                    onBack = { showChatDialog = false }
                )
            }
        }
    }
}

@Composable
fun OfflineBanner(
    pendingCount: Int,
    onSync: () -> Unit
) {
    Surface(
        color = MaterialTheme.colorScheme.errorContainer,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.CloudOff,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onErrorContainer
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Modo sin conexión",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
                if (pendingCount > 0) {
                    Text(
                        "$pendingCount tareas por sincronizar",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onErrorContainer
                    )
                }
            }
            TextButton(onClick = onSync) {
                Text("Sync")
            }
        }
    }
}
