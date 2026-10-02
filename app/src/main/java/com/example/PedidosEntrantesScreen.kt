package com.example

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.firebase.firestore.SetOptions
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.maps.android.compose.*
import com.google.android.gms.maps.CameraUpdateFactory
import com.example.data.repository.courier.CourierRoutingRepository
import com.example.domain.model.courier.CourierRoutePhase

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PedidosEntrantesScreen(
    pedidoActivo: PedidoOfrecido? = null, // Recibe el pedido en tiempo real de Firestore (Legacy fallback)
    ordersState: CourierOrdersState = CourierOrdersState(), // Estado unificado 6-State
    onAceptarPedido: suspend (pedidoId: String) -> Unit,
    onRechazarPedido: (pedidoId: String) -> Unit = {},
    onRechazarPedidoConMotivo: (pedidoId: String, motivo: String) -> Unit = { id, motivo -> onRechazarPedido(id) },
    onLogout: () -> Unit,
    onReconectarRutaActiva: (pedidoId: String, comercioNombre: String, comercioDireccion: String, clienteDireccion: String) -> Unit = { _, _, _, _ -> }
) {
    android.util.Log.d("FLOTA_DEBUG", "CREANDO_PEDIDOS_ENTRANTES_SCREEN: Iniciando composición de PedidosEntrantesScreen")
    val coroutineScope = rememberCoroutineScope()
    var aceptando by remember { mutableStateOf(false) }
    var pendingRejectOrderId by remember { mutableStateOf<String?>(null) }
    var isCardMinimized by remember { mutableStateOf(false) }

    // Estado online
    var isOnline by remember { mutableStateOf(true) }
    var showProfileDialog by remember { mutableStateOf(false) }

    val authUser = remember { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser }
    var profileName by remember { mutableStateOf(authUser?.displayName?.ifBlank { authUser.email } ?: "Repartidor") }
    var profilePhone by remember { mutableStateOf(authUser?.phoneNumber ?: "") }
    var profileEmail by remember { mutableStateOf(authUser?.email ?: "") }
    var profileVehicleInfo by remember { mutableStateOf("") }
    var profileZone by remember { mutableStateOf("Managua") }

    LaunchedEffect(authUser?.uid) {
        val uid = authUser?.uid ?: return@LaunchedEffect
        try {
            val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
            db.collection("users").document(uid).get().addOnSuccessListener { uDoc ->
                if (uDoc.exists()) {
                    val n = uDoc.getString("name") ?: uDoc.getString("nombre") ?: ""
                    val p = uDoc.getString("phone") ?: uDoc.getString("telefono") ?: ""
                    val e = uDoc.getString("email") ?: ""
                    if (n.isNotBlank()) profileName = n
                    if (p.isNotBlank()) profilePhone = p
                    if (e.isNotBlank()) profileEmail = e
                }
            }
            db.collection("couriers").document(uid).get().addOnSuccessListener { cDoc ->
                if (cDoc.exists()) {
                    val n = cDoc.getString("name") ?: ""
                    val p = cDoc.getString("phone") ?: ""
                    val e = cDoc.getString("email") ?: ""
                    val brand = cDoc.getString("vehicleBrand") ?: cDoc.getString("brand") ?: ""
                    val model = cDoc.getString("vehicleModel") ?: cDoc.getString("model") ?: ""
                    val plate = cDoc.getString("vehiclePlate") ?: cDoc.getString("plate") ?: cDoc.getString("placa") ?: ""
                    val dept = cDoc.getString("departmentName") ?: cDoc.getString("department") ?: ""
                    val mun = cDoc.getString("municipalityName") ?: cDoc.getString("city") ?: ""
                    if (n.isNotBlank()) profileName = n
                    if (p.isNotBlank()) profilePhone = p
                    if (e.isNotBlank()) profileEmail = e
                    if (brand.isNotBlank() || plate.isNotBlank()) {
                        profileVehicleInfo = "$brand $model ${if (plate.isNotBlank()) "(Placa: $plate)" else ""}".trim()
                    }
                    if (dept.isNotBlank() || mun.isNotBlank()) {
                        profileZone = "${mun.ifBlank { "Managua" }}, ${dept.ifBlank { "Managua" }}"
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("FLOTA_DEBUG", "Error cargando perfil", e)
        }
    }

    // Control de excepciones visuales
    var errorCaught by remember { mutableStateOf<Throwable?>(null) }

    // Gestión de permisos y GPS
    val context = androidx.compose.ui.platform.LocalContext.current
    
    val playServicesAvailable = remember {
        try {
            val code = com.google.android.gms.common.GoogleApiAvailability.getInstance()
                .isGooglePlayServicesAvailable(context)
            code == com.google.android.gms.common.ConnectionResult.SUCCESS
        } catch (e: Throwable) {
            false
        }
    }

    var locationPermissionGranted by remember {
        mutableStateOf(
            try {
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            } catch (e: Throwable) {
                errorCaught = e
                false
            }
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        try {
            locationPermissionGranted = permissions.values.any { it }
        } catch (e: Throwable) {
            errorCaught = e
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
            errorCaught = e
        }
    }

    val fusedLocationClient = remember {
        try {
            LocationServices.getFusedLocationProviderClient(context)
        } catch (e: Throwable) {
            errorCaught = e
            null
        }
    }
    var userLocation by remember { mutableStateOf<LatLng?>(null) }
    var mapLoaded by remember { mutableStateOf(false) }

    val cameraPositionState = rememberCameraPositionState {
        try {
            position = CameraPosition.fromLatLngZoom(LatLng(12.1364, -86.2514), 14f)
        } catch (e: Throwable) {
            errorCaught = e
        }
    }

    val centerOnUserLocation = remember(locationPermissionGranted, mapLoaded) {
        {
            if (locationPermissionGranted && fusedLocationClient != null && mapLoaded) {
                try {
                    fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
                        try {
                            if (loc != null) {
                                val latLng = LatLng(loc.latitude, loc.longitude)
                                userLocation = latLng
                                coroutineScope.launch {
                                    try {
                                        com.example.domain.engine.courier.CourierDebugCounters.cameraAnimationsStarted.incrementAndGet()
                                        cameraPositionState.animate(
                                            CameraUpdateFactory.newLatLngZoom(latLng, 15.5f),
                                            1000
                                        )
                                    } catch (e: kotlinx.coroutines.CancellationException) {
                                        com.example.domain.engine.courier.CourierDebugCounters.cameraAnimationsCancelled.incrementAndGet()
                                        // Cancelación normal de la animación por actualización o mapa
                                    } catch (e: Throwable) {
                                        com.example.domain.engine.courier.CourierDebugCounters.errors.incrementAndGet()
                                        errorCaught = e
                                    }
                                }
                            }
                        } catch (e: Throwable) {
                            if (e !is kotlinx.coroutines.CancellationException) {
                                errorCaught = e
                            }
                        }
                    }.addOnFailureListener { e ->
                        if (e !is kotlinx.coroutines.CancellationException) {
                            errorCaught = e
                        }
                    }
                } catch (e: Throwable) {
                    if (e !is kotlinx.coroutines.CancellationException) {
                        errorCaught = e
                    }
                }
            }
        }
    }

    LaunchedEffect(locationPermissionGranted, mapLoaded) {
        try {
            if (locationPermissionGranted && mapLoaded) {
                centerOnUserLocation()
            }
        } catch (e: Throwable) {
            if (e !is kotlinx.coroutines.CancellationException) {
                errorCaught = e
            }
        }
    }

    // BSD-X2Y-COURIER-GPS-HEARTBEAT-001: Latido periódico de telemetría GPS
    // Activo exclusivamente mientras isOnline==true y locationPermissionGranted==true.
    // Persiste la ubicación en /ubicaciones_repartidores cada 30 segundos para que
    // xToYDispatchEngine no descarte al motorizado por GPS stale (umbral: 10 min).
    val courierUid = remember { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid }
    DisposableEffect(isOnline, locationPermissionGranted, courierUid) {
        val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
        var locationCallback: LocationCallback? = null

        if (isOnline && locationPermissionGranted && fusedLocationClient != null && courierUid != null) {
            val locationRequest = LocationRequest.Builder(
                Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                30_000L // Intervalo de 30 segundos
            ).apply {
                setMinUpdateIntervalMillis(10_000L) // Mínimo cada 10 segundos
                setMinUpdateDistanceMeters(5f)      // Mínimo 5 metros de desplazamiento
            }.build()

            locationCallback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    val loc = result.lastLocation ?: return
                    val locData = mapOf(
                        "motorizadoId" to courierUid,
                        "coordenadas" to mapOf(
                            "latitud" to loc.latitude,
                            "longitud" to loc.longitude
                        ),
                        "latitud" to loc.latitude,
                        "longitud" to loc.longitude,
                        "bearing" to loc.bearing,
                        "speed" to loc.speed,
                        "accuracy" to loc.accuracy,
                        "isOnline" to true,
                        "estado" to "disponible",
                        "ultimaActualizacion" to com.google.firebase.Timestamp.now()
                    )
                    db.collection("ubicaciones_repartidores")
                        .document(courierUid)
                        .set(locData, SetOptions.merge())
                    android.util.Log.d("GPS_HEARTBEAT", "Ubicacion actualizada: lat=${loc.latitude} lng=${loc.longitude} uid=$courierUid")
                }
            }

            try {
                fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback,
                    android.os.Looper.getMainLooper()
                )
                android.util.Log.d("GPS_HEARTBEAT", "Heartbeat GPS INICIADO para $courierUid")
            } catch (e: SecurityException) {
                android.util.Log.w("GPS_HEARTBEAT", "SecurityException al iniciar heartbeat GPS", e)
            }
        }

        onDispose {
            // Al desmontar la pantalla o al pasar a offline: detener updates y marcar offline en Firestore
            locationCallback?.let { cb ->
                fusedLocationClient?.removeLocationUpdates(cb)
                android.util.Log.d("GPS_HEARTBEAT", "Heartbeat GPS DETENIDO para $courierUid")
            }
            if (!isOnline && courierUid != null) {
                db.collection("ubicaciones_repartidores")
                    .document(courierUid)
                    .set(
                        mapOf(
                            "isOnline" to false,
                            "estado" to "offline",
                            "ultimaActualizacion" to com.google.firebase.Timestamp.now()
                        ),
                        SetOptions.merge()
                    )
                android.util.Log.d("GPS_HEARTBEAT", "Motorizado marcado OFFLINE en Firestore: $courierUid")
            }
        }
    }

    LaunchedEffect(ordersState.activeRouteOrder) {
        try {
            val activeRoute = ordersState.activeRouteOrder
            if (activeRoute != null) {
                android.util.Log.d("FLOTA_DEBUG", "RECONECTANDO_RUTA_ACTIVA: ${activeRoute.id}")
                onReconectarRutaActiva(
                    activeRoute.id,
                    activeRoute.comercioNombre,
                    activeRoute.comercioDireccion,
                    activeRoute.clienteDireccion
                )
            }
        } catch (e: Throwable) {
            android.util.Log.w("FLOTA_DEBUG", "Error reconectando ruta activa", e)
        }
    }
    
    // Temporizador de aceptación (Failsafe de 60 segundos)
    var tiempoRestante by remember { mutableStateOf(60) }

    // Coordenadas fijas en Managua para simulación visual interactiva
    val motorizadoLatLng = remember { LatLng(12.1364, -86.2514) } // Rotonda Rubén Darío
    val comercioLatLng = remember { LatLng(12.1432, -86.2625) }  // Plaza Inter
    val clienteLatLng = remember { LatLng(12.1220, -86.2390) }   // Altamira

    // Configuración del mapa para una visualización limpia
    val mapUiSettings = remember {
        MapUiSettings(
            zoomControlsEnabled = true,
            myLocationButtonEnabled = false,
            compassEnabled = true
        )
    }
    val mapProperties = remember(locationPermissionGranted) {
        MapProperties(
            isMyLocationEnabled = locationPermissionGranted,
            mapType = MapType.NORMAL
        )
    }

    // Animación de radar para el estado de "Esperando Pedidos"
    val infiniteTransition = rememberInfiniteTransition(label = "radar")
    val radarRadius by infiniteTransition.animateFloat(
        initialValue = 10f,
        targetValue = 100f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = LinearOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "radius"
    )
    val radarAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = LinearOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "alpha"
    )

    val effectiveOrdersList = if (ordersState.poolOrders.isNotEmpty()) {
        ordersState.poolOrders
    } else if (ordersState.assignedOrders.isNotEmpty()) {
        ordersState.assignedOrders
    } else {
        emptyList()
    }

    var selectedOrderId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(effectiveOrdersList.map { it.id }) {
        if (effectiveOrdersList.isNotEmpty()) {
            if (selectedOrderId == null || effectiveOrdersList.none { it.id == selectedOrderId }) {
                selectedOrderId = effectiveOrdersList.first().id
            }
        } else {
            selectedOrderId = null
        }
    }

    LaunchedEffect(selectedOrderId) {
        isCardMinimized = false
    }

    val activeOrderFromState = if (effectiveOrdersList.isNotEmpty()) {
        effectiveOrdersList.find { it.id == selectedOrderId } ?: effectiveOrdersList.first()
    } else {
        ordersState.activeRouteOrder
    }

    val activePedido = activeOrderFromState ?: pedidoActivo

    // BSD-COURIER-REAL-ROAD-ROUTING-ETA-001: Motor autoritativo de routing vial real
    val routingRepo = remember { CourierRoutingRepository() }
    var routePointsToMerchant by remember { mutableStateOf<List<LatLng>>(emptyList()) }
    var routePointsToCustomer by remember { mutableStateOf<List<LatLng>>(emptyList()) }

    // Resolución asíncrona de las calles de Managua para Fase 1 (Courier->Comercio) y Fase 2 (Comercio->Cliente)
    LaunchedEffect(activePedido?.id, comercioLatLng, clienteLatLng, userLocation) {
        if (activePedido != null) {
            val courierPos = userLocation ?: motorizadoLatLng
            withContext(Dispatchers.IO) {
                // Tramo 1: Courier -> Comercio
                if (routingRepo.isValidCoordinate(courierPos) && routingRepo.isValidCoordinate(comercioLatLng)) {
                    try {
                        val (_, r1) = routingRepo.resolveRoute(
                            origin = courierPos,
                            destination = comercioLatLng,
                            phase = CourierRoutePhase.TO_MERCHANT
                        )
                        withContext(Dispatchers.Main) {
                            routePointsToMerchant = r1?.points ?: emptyList()
                        }
                    } catch (e: Throwable) {
                        android.util.Log.w("FLOTA_DEBUG", "Error resolviendo ruta vial al comercio: ${e.message}")
                    }
                }
                // Tramo 2: Comercio -> Cliente
                if (routingRepo.isValidCoordinate(comercioLatLng) && routingRepo.isValidCoordinate(clienteLatLng)) {
                    try {
                        val (_, r2) = routingRepo.resolveRoute(
                            origin = comercioLatLng,
                            destination = clienteLatLng,
                            phase = CourierRoutePhase.TO_CUSTOMER
                        )
                        withContext(Dispatchers.Main) {
                            routePointsToCustomer = r2?.points ?: emptyList()
                        }
                    } catch (e: Throwable) {
                        android.util.Log.w("FLOTA_DEBUG", "Error resolviendo ruta vial al cliente: ${e.message}")
                    }
                }
            }
        } else {
            routePointsToMerchant = emptyList()
            routePointsToCustomer = emptyList()
        }
    }

    LaunchedEffect(activePedido?.id, mapLoaded) {
        if (mapLoaded) {
            if (activePedido != null) {
                cameraPositionState.position = CameraPosition.fromLatLngZoom(comercioLatLng, 14.5f)
            } else {
                val centerLoc = userLocation ?: motorizadoLatLng
                cameraPositionState.position = CameraPosition.fromLatLngZoom(centerLoc, 14f)
            }
        }
    }

    // Auto-encuadre de cámara para ver la ruta vial completa cuando se minimiza la tarjeta para ver el mapa
    LaunchedEffect(isCardMinimized, mapLoaded, routePointsToMerchant.isNotEmpty() || routePointsToCustomer.isNotEmpty()) {
        if (mapLoaded && isCardMinimized && activePedido != null) {
            val allPoints = mutableListOf<LatLng>()
            userLocation?.let { allPoints.add(it) }
            allPoints.add(comercioLatLng)
            allPoints.add(clienteLatLng)
            if (routePointsToMerchant.isNotEmpty()) allPoints.addAll(routePointsToMerchant)
            if (routePointsToCustomer.isNotEmpty()) allPoints.addAll(routePointsToCustomer)

            if (allPoints.size >= 2) {
                val builder = LatLngBounds.builder()
                allPoints.forEach { builder.include(it) }
                try {
                    val bounds = builder.build()
                    cameraPositionState.animate(
                        CameraUpdateFactory.newLatLngBounds(bounds, 130),
                        durationMs = 800
                    )
                } catch (_: Throwable) {}
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFE2E8F0))
    ) {
        // 1. MAPA DE FONDO AL 100%
        if (playServicesAvailable) {
            android.util.Log.d("FLOTA_DEBUG", "INICIALIZANDO_MAPA: Dibujando GoogleMap")
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                uiSettings = mapUiSettings,
                properties = mapProperties,
                onMapLoaded = {
                    android.util.Log.d("FLOTA_DEBUG", "ON_MAP_LOADED: El mapa se cargó y renderizó con éxito")
                    mapLoaded = true
                }
            ) {
                // Marcador del Motorizado siempre activo
                Marker(
                    state = MarkerState(position = userLocation ?: motorizadoLatLng),
                    title = "Mi Ubicación (Repartidor)",
                    snippet = if (isOnline) "Disponible" else "Fuera de Servicio"
                )

                if (activePedido != null) {
                    // Marcadores autorizados de Comercio y Cliente
                    Marker(
                        state = MarkerState(position = comercioLatLng),
                        title = activePedido.comercioNombre,
                        snippet = "Punto de Recogida (Origen)"
                    )

                    Marker(
                        state = MarkerState(position = clienteLatLng),
                        title = "Cliente",
                        snippet = activePedido.clienteDireccion
                    )

                    // BSD-COURIER-REAL-ROAD-ROUTING-ETA-001: RUTAS VIALES REALES POR CALLES (CERO LÍNEAS RECTAS)
                    // Tramo 1: Motorizado -> Comercio (Fase 1: Violeta / Indigo Canónico #6366F1)
                    if (routePointsToMerchant.size >= 2) {
                        Polyline(
                            points = routePointsToMerchant,
                            color = Color(0xFF6366F1),
                            width = 12f
                        )
                    }

                    // Tramo 2: Comercio -> Cliente (Fase 2: Verde Esmeralda Canónico #10B981)
                    if (routePointsToCustomer.size >= 2) {
                        Polyline(
                            points = routePointsToCustomer,
                            color = Color(0xFF10B981),
                            width = 12f
                        )
                    }
                }
            }
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF1E293B)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Google Play Services no disponible.\nEl mapa se ha desactivado para garantizar la estabilidad de la aplicación.",
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(24.dp)
                )
            }
        }



        // 3. EFECTO VISUAL DE RADAR EN EL CENTRO DE LA PANTALLA (Solo si no hay pedido y está online)
        if (activePedido == null && isOnline) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(200.dp),
                contentAlignment = Alignment.Center
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    drawCircle(
                        color = Color(0xFF6366F1).copy(alpha = radarAlpha),
                        radius = radarRadius * 2
                    )
                }
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .shadow(8.dp, CircleShape)
                        .background(Color(0xFF6366F1), CircleShape)
                        .border(3.dp, Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.DirectionsBike,
                        contentDescription = "Radar Repartidor",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }

        // 4. TARJETA FLOTANTE INFERIOR (STYLE PEDIDOSYA)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(16.dp)
                .align(Alignment.BottomCenter)
        ) {
            if (activePedido == null) {
                // TARJETA DE ESPERA ACTIVA / DESCONECTADO
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(12.dp, RoundedCornerShape(24.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Switch de Estado (En Línea / Fuera de Servicio)
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(if (isOnline) Color(0xFF10B981) else Color(0xFFEF4444), CircleShape)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (isOnline) "En Línea" else "Fuera de Servicio",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = if (isOnline) Color(0xFF10B981) else Color(0xFFEF4444)
                                )
                            }
                            Switch(
                                checked = isOnline,
                                onCheckedChange = { isOnline = it },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = Color.White,
                                    checkedTrackColor = Color(0xFF10B981),
                                    uncheckedThumbColor = Color.White,
                                    uncheckedTrackColor = Color(0xFFEF4444)
                                )
                            )
                        }

                        if (isOnline) {
                            when (ordersState.status) {
                                CourierUiStatus.LOADING -> {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center,
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
                                    ) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            color = Color(0xFF6366F1),
                                            strokeWidth = 2.dp
                                        )
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Text(
                                            text = "Consultando pedidos en tiempo real...",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF6366F1)
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Sincronizando con la red de comercios...",
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B),
                                        textAlign = TextAlign.Center
                                    )
                                }
                                CourierUiStatus.ERROR -> {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(Color(0xFFFEF2F2), RoundedCornerShape(12.dp))
                                            .border(1.dp, Color(0xFFFCA5A5), RoundedCornerShape(12.dp))
                                            .padding(12.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                text = "⚠️ No pudimos consultar los pedidos",
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF991B1B),
                                                fontSize = 14.sp
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = ordersState.errorMessage ?: "Verifica tu conexión a internet.",
                                                fontSize = 11.sp,
                                                color = Color(0xFF7F1D1D),
                                                textAlign = TextAlign.Center
                                            )
                                        }
                                    }
                                }
                                else -> { // EMPTY state or default idle
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .background(Color(0xFF10B981), CircleShape)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "🛵 No hay pedidos disponibles",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF0F172A)
                                        )
                                    }
                                    
                                    Spacer(modifier = Modifier.height(12.dp))
                                    
                                    Text(
                                        text = "Esperando pedidos en Managua...",
                                        fontSize = 17.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFF1E293B),
                                        textAlign = TextAlign.Center
                                    )
                                    
                                    Spacer(modifier = Modifier.height(6.dp))
                                    
                                    Text(
                                        text = "Cuando un comercio tenga un pedido listo para entrega aparecerá aquí.",
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B),
                                        textAlign = TextAlign.Center,
                                        lineHeight = 18.sp
                                    )
                                    

                                }
                            }
                        } else {
                            Text(
                                text = "Estás desconectado",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFF64748B),
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Ponte en línea para comenzar a recibir solicitudes de envíos y rastreo en tiempo real.",
                                fontSize = 12.sp,
                                color = Color(0xFF94A3B8),
                                textAlign = TextAlign.Center,
                                lineHeight = 18.sp
                            )
                            Button(
                                onClick = { isOnline = true },
                                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Ponerse en Línea", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                if (isCardMinimized) {
                    val isXToY = activePedido.serviceType == "X_TO_Y_DELIVERY"
                    val isAcceptedByCourier = activePedido.status.lowercase() == "courier_accepted"
                    // TARJETA MINIMIZADA ULTRA-COMPACTA: DEJA LIBRE EL 90%+ DEL MAPA DE GOOGLE
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(12.dp, RoundedCornerShape(18.dp))
                            .testTag("pedido_minimized_card"),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(18.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Información condensada a la izquierda (Timer + Código + Monto)
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f, fill = false)
                            ) {
                                // Temporizador circular compacto
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.size(34.dp)
                                ) {
                                    CircularProgressIndicator(
                                        progress = { tiempoRestante / 60f },
                                        color = if (tiempoRestante <= 15) Color(0xFFEF4444) else Color(0xFF6366F1),
                                        trackColor = Color(0xFFF1F5F9),
                                        strokeWidth = 3.dp,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                    Text(
                                        text = "${tiempoRestante}s",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 9.sp,
                                        color = if (tiempoRestante <= 15) Color(0xFFEF4444) else Color(0xFF1E293B)
                                    )
                                }

                                Spacer(modifier = Modifier.width(8.dp))

                                Column(modifier = Modifier.padding(end = 6.dp)) {
                                    Text(
                                        text = if (isXToY) "Encomienda #${activePedido.id.takeLast(6).uppercase()}" else "Pedido #${activePedido.displayOrderCode}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFF1E293B),
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = "C$ ${String.format(java.util.Locale.US, "%.2f", activePedido.gananciaRepartidor)}",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Color(0xFF10B981),
                                            maxLines = 1
                                        )
                                        if (activePedido.distanceKm > 0.0) {
                                            Text(
                                                text = " • ${String.format(java.util.Locale.US, "%.1f", activePedido.distanceKm)} km",
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = Color(0xFF64748B),
                                                maxLines = 1
                                            )
                                        }
                                    }
                                }
                            }

                            // Botones de acción a la derecha (Ver Oferta + Aceptar)
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                // Botón para re-expandir y volver a ver todos los detalles del pedido
                                Surface(
                                    onClick = { isCardMinimized = false },
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFF6366F1)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.KeyboardArrowUp,
                                            contentDescription = "Ver Oferta",
                                            tint = Color.White,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Spacer(modifier = Modifier.width(2.dp))
                                        Text(
                                            text = "Ver Oferta",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    }
                                }

                                // Botón de Aceptar directo desde la barra minimizada
                                Surface(
                                    onClick = {
                                        aceptando = true
                                        coroutineScope.launch {
                                            try {
                                                if (isAcceptedByCourier && activePedido != null) {
                                                    onReconectarRutaActiva(
                                                        activePedido.id,
                                                        activePedido.comercioNombre,
                                                        activePedido.comercioDireccion,
                                                        activePedido.clienteDireccion
                                                    )
                                                } else {
                                                    onAceptarPedido(activePedido.id)
                                                }
                                            } catch (e: Throwable) {
                                                android.util.Log.e("COURIER_ASSIGN", "Fallo al aceptar pedido", e)
                                            } finally {
                                                aceptando = false
                                            }
                                        }
                                    },
                                    enabled = !aceptando,
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFF10B981)
                                ) {
                                    Text(
                                        text = if (aceptando) "..." else "Aceptar",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color.White,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                                    )
                                }
                            }
                        }
                    }
                } else {
                    // TARJETA DE PEDIDO OFRECIDO (ALERT / ACCIÓN COMPLETA EXPANDIDA)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(16.dp, RoundedCornerShape(28.dp))
                            .testTag("pedido_ofrecido_card"),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        shape = RoundedCornerShape(28.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .verticalScroll(rememberScrollState())
                                .padding(16.dp)
                        ) {
                            
                            // CABECERA DIVERSIFICADA (DIRECT ASSIGNMENT VS POOL OFFER & COMMERCE VS X->Y)
                            val isXToY = activePedido.serviceType == "X_TO_Y_DELIVERY"
                            val isAcceptedByCourier = activePedido.status.lowercase() == "courier_accepted"
                            val isDirectAssignment = activePedido.assignedCourierId.isNotEmpty() || ordersState.status == CourierUiStatus.ASSIGNED_ORDERS
                            
                            val badgeText = when {
                                isXToY && isAcceptedByCourier -> "📦 ENCOMIENDA ACEPTADA — DIRÍGETE AL PUNTO X"
                                isXToY && isDirectAssignment -> "📦 ¡ENCOMIENDA ASIGNADA DIRECTAMENTE!"
                                isXToY -> "📦 ¡NUEVA ENCOMIENDA X→Y DISPONIBLE!"
                                isAcceptedByCourier -> "PEDIDO ACEPTADO — DIRÍGETE AL COMERCIO"
                                isDirectAssignment -> "¡PEDIDO ASIGNADO DIRECTAMENTE!"
                                ordersState.status == CourierUiStatus.ACTIVE_ROUTE -> "RUTA EN CURSO"
                                else -> "¡NUEVA OFERTA DISPONIBLE!"
                            }
                            val badgeBg = if (isXToY) {
                                if (isAcceptedByCourier) Color(0xFFD1FAE5) else Color(0xFFFEF3C7)
                            } else {
                                if (isAcceptedByCourier) Color(0xFFDCFCE7) else if (isDirectAssignment) Color(0xFFF3E8FF) else Color(0xFFEEF2F6)
                            }
                            val badgeTextColor = if (isXToY) {
                                if (isAcceptedByCourier) Color(0xFF047857) else Color(0xFFB45309)
                            } else {
                                if (isAcceptedByCourier) Color(0xFF15803D) else if (isDirectAssignment) Color(0xFF7E22CE) else Color(0xFF6366F1)
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f, fill = false)) {
                                    Box(
                                        modifier = Modifier
                                            .background(badgeBg, RoundedCornerShape(8.dp))
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = badgeText,
                                            color = badgeTextColor,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 10.sp,
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = if (isXToY) "Encomienda #${activePedido.id.takeLast(6).uppercase()}" else "Pedido #${activePedido.displayOrderCode}",
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFF1E293B)
                                    )
                                }
                                
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    // Botón para ocultar la tarjeta y ver el mapa
                                    Surface(
                                        onClick = { isCardMinimized = true },
                                        shape = RoundedCornerShape(12.dp),
                                        color = Color(0xFFEEF2F6),
                                        modifier = Modifier.padding(end = 8.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Map,
                                                contentDescription = "Ver Mapa",
                                                tint = Color(0xFF6366F1),
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "Ver Mapa",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF6366F1)
                                            )
                                        }
                                    }

                                    // Multi-Order Chip Selector if effectiveOrdersList > 1
                                    if (effectiveOrdersList.size > 1) {
                                        val currentIdx = effectiveOrdersList.indexOfFirst { it.id == selectedOrderId }.coerceAtLeast(0)
                                        Surface(
                                            onClick = {
                                                val nextIdx = (currentIdx + 1) % effectiveOrdersList.size
                                                selectedOrderId = effectiveOrdersList[nextIdx].id
                                            },
                                            shape = RoundedCornerShape(12.dp),
                                            color = Color(0xFFEEF2F6)
                                        ) {
                                            Text(
                                                text = "${currentIdx + 1}/${effectiveOrdersList.size} ➔",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF6366F1),
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                            )
                                        }
                                    } else {
                                        // Temporizador de Cuenta Regresiva Circular
                                        Box(
                                            contentAlignment = Alignment.Center,
                                            modifier = Modifier.size(44.dp)
                                        ) {
                                            CircularProgressIndicator(
                                                progress = { tiempoRestante / 60f },
                                                color = badgeTextColor,
                                                trackColor = Color(0xFFF1F5F9),
                                                strokeWidth = 3.dp,
                                                modifier = Modifier.fillMaxSize()
                                            )
                                            Text(
                                                text = "${tiempoRestante}s",
                                                fontWeight = FontWeight.ExtraBold,
                                                fontSize = 11.sp,
                                                color = Color(0xFF1E293B)
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))
                            HorizontalDivider(color = Color(0xFFF1F5F9))
                            Spacer(modifier = Modifier.height(14.dp))

                        if (isXToY) {
                            // ── VISTA EXCLUSIVA X→Y: ENCOMIENDA PUNTO X → PUNTO Y ──
                            // ORIGEN X (RECOGER)
                            Row(verticalAlignment = Alignment.Top) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .background(Color(0xFFFEF3C7), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = "Punto X",
                                        tint = Color(0xFFD97706),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "📍 PUNTO X (RECOGER)",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFFD97706),
                                        letterSpacing = 0.5.sp
                                    )
                                    Text(
                                        text = if (activePedido.senderName.isNotBlank()) "Remitente: ${activePedido.senderName}" else "Origen del Paquete",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Color(0xFF1E293B)
                                    )
                                    Text(
                                        text = activePedido.comercioDireccion,
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B)
                                    )
                                    if (activePedido.senderPhone.isNotBlank()) {
                                        Text(
                                            text = "📞 ${activePedido.senderPhone}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color(0xFF475569)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // DESTINO Y (ENTREGAR)
                            Row(verticalAlignment = Alignment.Top) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .background(Color(0xFFD1FAE5), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = "Punto Y",
                                        tint = Color(0xFF059669),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "📍 PUNTO Y (ENTREGAR)",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFF059669),
                                        letterSpacing = 0.5.sp
                                    )
                                    Text(
                                        text = if (activePedido.recipientName.isNotBlank()) "Destinatario: ${activePedido.recipientName}" else "Destino de Entrega",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Color(0xFF1E293B)
                                    )
                                    Text(
                                        text = activePedido.clienteDireccion,
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B)
                                    )
                                    if (activePedido.recipientPhone.isNotBlank()) {
                                        Text(
                                            text = "📞 ${activePedido.recipientPhone}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color(0xFF475569)
                                        )
                                    }
                                }
                            }

                            // DESCRIPCIÓN DEL PAQUETE & NOTAS
                            if (activePedido.packageDescription.isNotBlank() || activePedido.notes.isNotBlank()) {
                                Spacer(modifier = Modifier.height(10.dp))
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFFF8FAFC),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(10.dp)) {
                                        if (activePedido.packageDescription.isNotBlank()) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text("📦 Paquete: ", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                                                Text(activePedido.packageDescription, fontSize = 11.sp, color = Color(0xFF475569))
                                            }
                                        }
                                        if (activePedido.notes.isNotBlank()) {
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text("📝 Instrucción: ", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                                                Text(activePedido.notes, fontSize = 11.sp, color = Color(0xFF64748B))
                                            }
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // DESGLOSE FINANCIERO CANÓNICO X→Y (ADR-026 & SSOT)
                            val isCash = activePedido.pagoMetodo.trim().lowercase() in listOf("efectivo", "cash")
                            val isRecipientPayer = activePedido.payer == "RECIPIENT"
                            val customerTotal = if (activePedido.total > 0.0) {
                                activePedido.total
                            } else {
                                activePedido.customerOffer ?: activePedido.calculatedFee
                            }

                            // ─── BLOQUE 1: COBRO EN DESTINO / ESTADO DE COBRO (CUSTOMER_TOTAL) ───
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(if (isRecipientPayer && isCash) Color(0xFFFFFBEB) else Color(0xFFEFF6FF), RoundedCornerShape(14.dp))
                                    .border(1.dp, if (isRecipientPayer && isCash) Color(0xFFFDE68A) else Color(0xFFBFDBFE), RoundedCornerShape(14.dp))
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f, fill = false)) {
                                    Text(
                                        text = if (isRecipientPayer && isCash) "💰 COBRO EN DESTINO" else "✓ ENVÍO YA PAGADO",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (isRecipientPayer && isCash) Color(0xFFB45309) else Color(0xFF1D4ED8),
                                        maxLines = 1
                                    )
                                    Text(
                                        text = if (isRecipientPayer && isCash) "Cobrar al destinatario" else "No cobrar en destino",
                                        fontSize = 11.sp,
                                        color = if (isRecipientPayer && isCash) Color(0xFF92400E) else Color(0xFF1E40AF),
                                        maxLines = 1
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Column(horizontalAlignment = Alignment.End) {
                                    val totalFormatted = if (customerTotal % 1.0 == 0.0) {
                                        String.format(java.util.Locale.US, "%.0f", customerTotal)
                                    } else {
                                        String.format(java.util.Locale.US, "%.2f", customerTotal)
                                    }
                                    Text(
                                        text = if (isRecipientPayer && isCash) "C$ $totalFormatted" else "C$ 0",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Black,
                                        color = if (isRecipientPayer && isCash) Color(0xFFB45309) else Color(0xFF1D4ED8),
                                        maxLines = 1,
                                        softWrap = false
                                    )
                                    Text(
                                        text = if (isCash) "EFECTIVO" else activePedido.pagoMetodo.uppercase(),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF64748B),
                                        maxLines = 1
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // ─── BLOQUE 2: GANANCIA DEL MOTORIZADO (COURIER_EARNINGS CANÓNICA) ───
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFECFDF5), RoundedCornerShape(14.dp))
                                    .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(14.dp))
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f, fill = false)) {
                                    Text(
                                        text = "🛵 GANANCIA MOTORIZADO",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFF047857),
                                        maxLines = 1
                                    )
                                    Text(
                                        text = "POR ESTE ENVÍO",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF065F46),
                                        maxLines = 1
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "C$ ${String.format(java.util.Locale.US, "%.2f", activePedido.gananciaRepartidor)}",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFF047857),
                                        maxLines = 1,
                                        softWrap = false
                                    )
                                    Text(
                                        text = "REMUNERACIÓN",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFF059669),
                                        maxLines = 1
                                    )
                                }
                            }
                        } else {
                            // ── VISTA TRADICIONAL COMMERCE DELIVERY ──
                            // ORIGEN (COMERCIO)
                            Row(verticalAlignment = Alignment.Top) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .background(Color(0xFFEEF2F6), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Store,
                                        contentDescription = "Comercio",
                                        tint = Color(0xFF6366F1),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "ORIGEN (RECOGER)",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFF94A3B8),
                                        letterSpacing = 0.5.sp
                                    )
                                    Text(
                                        text = activePedido.comercioNombre,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFF1E293B)
                                    )
                                    Text(
                                        text = activePedido.comercioDireccion,
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // DESTINO (CLIENTE)
                            Row(verticalAlignment = Alignment.Top) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .background(Color(0xFFFCE7F3), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = "Cliente",
                                        tint = Color(0xFFEC4899),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "DESTINO (ENTREGAR)",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFF94A3B8),
                                        letterSpacing = 0.5.sp
                                    )
                                    Text(
                                        text = "Dirección del Cliente",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFF1E293B)
                                    )
                                    Text(
                                        text = activePedido.clienteDireccion,
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // CAJA DE GANANCIA Y DESGLOSE FINANCIERO MOTORIZADO
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFF8FAFC), RoundedCornerShape(16.dp))
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp))
                                    .padding(14.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                // Fila 1: Tu Ganancia Estimada
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = "Tu Ganancia Estimada",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color(0xFF64748B)
                                        )
                                        val distLabel = if (activePedido.distanceKm > 0.0) "${String.format(java.util.Locale.US, "%.1f", activePedido.distanceKm)} km" else ""
                                        val rateLabel = if (activePedido.courierRatePerKmApplied > 0.0) " • C$ ${activePedido.courierRatePerKmApplied.toInt()}/km" else ""
                                        Text(
                                            text = "Envío: $distLabel$rateLabel",
                                            fontSize = 11.sp,
                                            color = Color(0xFF475569)
                                        )
                                    }
                                    Text(
                                        text = "C$ ${String.format(java.util.Locale.US, "%.2f", activePedido.gananciaRepartidor)}",
                                        fontSize = 22.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFF16A34A)
                                    )
                                }

                                // Desglose de Propina si aplica
                                if (activePedido.tip > 0.0) {
                                    HorizontalDivider(color = Color(0xFFE2E8F0), thickness = 0.8.dp)
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = "• Envío por distancia:",
                                            fontSize = 11.sp,
                                            color = Color(0xFF64748B)
                                        )
                                        Text(
                                            text = "C$ ${String.format(java.util.Locale.US, "%.2f", activePedido.courierDistanceEarnings)}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color(0xFF334155)
                                        )
                                    }
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(
                                            text = "• Propina del cliente:",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = Color(0xFF059669)
                                        )
                                        Text(
                                            text = "+ C$ ${String.format(java.util.Locale.US, "%.2f", activePedido.tip)}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF059669)
                                        )
                                    }
                                }

                                // Fila 2: Total a cobrar al cliente
                                HorizontalDivider(color = Color(0xFFE2E8F0), thickness = 0.8.dp)

                                val isCash = activePedido.pagoMetodo.lowercase() in listOf("efectivo", "cash")
                                if (isCash) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(Color(0xFFFEF3C7).copy(alpha = 0.75f), RoundedCornerShape(10.dp))
                                            .padding(horizontal = 12.dp, vertical = 9.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "💵 Cobrar al cliente:",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF92400E)
                                        )
                                        Text(
                                            text = "C$ ${String.format(java.util.Locale.US, "%.2f", activePedido.total)}",
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFF92400E),
                                            maxLines = 1,
                                            softWrap = false
                                        )
                                    }
                                } else {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .background(Color(0xFFDCFCE7).copy(alpha = 0.7f), RoundedCornerShape(10.dp))
                                            .padding(horizontal = 10.dp, vertical = 8.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "💳 Pago digital (${activePedido.pagoMetodo.uppercase()})",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF166534)
                                        )
                                        Text(
                                            text = "NO COBRAR",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFF166534)
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // BOTONES DE RECHAZAR / ACEPTAR O IR AL COMERCIO/ORIGEN
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    if (activePedido != null) {
                                        android.util.Log.d("COURIER_REJECT", "Boton rechazar presionado para orderId=${activePedido.id}, abriendo modal")
                                        pendingRejectOrderId = activePedido.id
                                    }
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(52.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF64748B)),
                                border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy()
                            ) {
                                Text("Rechazar", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }

                            Button(
                                onClick = {
                                    aceptando = true
                                    coroutineScope.launch {
                                        try {
                                            if (isAcceptedByCourier && activePedido != null) {
                                                onReconectarRutaActiva(
                                                    activePedido.id,
                                                    activePedido.comercioNombre,
                                                    activePedido.comercioDireccion,
                                                    activePedido.clienteDireccion
                                                )
                                            } else if (activePedido != null) {
                                                onAceptarPedido(activePedido.id)
                                            } else if (pedidoActivo != null) {
                                                onAceptarPedido(pedidoActivo.id)
                                            }
                                        } catch (e: Throwable) {
                                            val pedidoId = activePedido?.id ?: pedidoActivo?.id ?: "unknown"
                                            val sType = activePedido?.serviceType ?: "COMMERCE"
                                            android.util.Log.e("FLOTA_DEBUG", "X2Y_ACCEPT_FAILURE | pedidoId=$pedidoId | serviceType=$sType | error=${e.message}", e)
                                            val rawMsg = e.message ?: ""
                                            val userMsg = when {
                                                rawMsg.contains("PERMISSION_DENIED", ignoreCase = true) ->
                                                    "No fue posible aceptar la encomienda en este momento. Intenta nuevamente."
                                                rawMsg.contains("Lock Atómico", ignoreCase = true) ->
                                                    "El pedido ya fue tomado por otro repartidor."
                                                rawMsg.contains("Bloqueo Financiero", ignoreCase = true) ->
                                                    rawMsg
                                                rawMsg.isNotBlank() && !rawMsg.contains("Exception", ignoreCase = true) ->
                                                    rawMsg
                                                else ->
                                                    "No se pudo aceptar el pedido. Intente nuevamente."
                                            }
                                            android.widget.Toast.makeText(context, userMsg, android.widget.Toast.LENGTH_LONG).show()
                                        } finally {
                                            aceptando = false
                                        }
                                    }
                                },
                                enabled = !aceptando,
                                modifier = Modifier
                                    .weight(2f)
                                    .height(52.dp)
                                    .testTag("aceptar_pedido_button"),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (isAcceptedByCourier) Color(0xFF10B981) else if (isXToY) Color(0xFF059669) else Color(0xFF6366F1)
                                )
                            ) {
                                if (aceptando) {
                                    CircularProgressIndicator(
                                        color = Color.White,
                                        modifier = Modifier.size(20.dp),
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Text(
                                        text = when {
                                            isAcceptedByCourier && isXToY -> "IR AL PUNTO X 📍"
                                            isAcceptedByCourier -> "IR AL COMERCIO"
                                            isXToY -> "Aceptar Encomienda 📦"
                                            else -> "Aceptar Pedido"
                                        },
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 15.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

        // 5. BOTÓN FLOTANTE PARA CENTRAR UBICACIÓN POR GPS
        if (locationPermissionGranted) {
            FloatingActionButton(
                onClick = { centerOnUserLocation() },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(
                        end = 16.dp,
                        bottom = if (activePedido != null && !isCardMinimized) 360.dp
                                 else if (activePedido != null) 85.dp
                                 else 220.dp
                    ),
                containerColor = Color.White,
                contentColor = Color(0xFF6366F1),
                shape = CircleShape
            ) {
                Icon(
                    imageVector = Icons.Default.MyLocation,
                    contentDescription = "Centrar en mi ubicación"
                )
            }
        }

        // 6. DIÁLOGO DE HISTORIAL & PERFIL DE FLOTA
        if (showProfileDialog) {
            AlertDialog(
                onDismissRequest = { showProfileDialog = false },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            tint = Color(0xFF6366F1)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Mi Perfil & Flota",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = Color(0xFF1E293B)
                        )
                    }
                },
                text = {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "INFORMACIÓN DEL REPARTIDOR",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Nombre: $profileName",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Color(0xFF1E293B)
                        )
                        Text(
                            text = "Correo: ${profileEmail.ifBlank { "No registrado" }}",
                            fontSize = 13.sp,
                            color = Color(0xFF64748B)
                        )
                        if (profilePhone.isNotBlank()) {
                            Text(
                                text = "Teléfono: $profilePhone",
                                fontSize = 13.sp,
                                color = Color(0xFF64748B)
                            )
                        }
                        Text(
                            text = "Vehículo: ${profileVehicleInfo.ifBlank { "Motocicleta Oficial Activa" }}",
                            fontSize = 13.sp,
                            color = Color(0xFF64748B)
                        )
                        Text(
                            text = "Zona Operativa: $profileZone",
                            fontSize = 13.sp,
                            color = Color(0xFF64748B)
                        )

                        Spacer(modifier = Modifier.height(16.dp))
                        HorizontalDivider(color = Color(0xFFF1F5F9))
                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            text = "ESTADO OPERACIONAL",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Disponibilidad GPS",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFF334155)
                            )
                            Text(
                                text = if (isOnline) "En Línea 🟢" else "Fuera de Línea 🔴",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isOnline) Color(0xFF10B981) else Color(0xFFEF4444)
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Pedidos Disponibles",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFF334155)
                            )
                            Text(
                                text = "${ordersState.poolOrders.size} ofertas",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF6366F1)
                            )
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showProfileDialog = false }) {
                        Text("Cerrar", color = Color(0xFF6366F1), fontWeight = FontWeight.Bold)
                    }
                },
                shape = RoundedCornerShape(20.dp),
                containerColor = Color.White
            )
        }

        if (pendingRejectOrderId != null) {
            com.example.presentation.courier.components.CourierRejectionModal(
                orderId = pendingRejectOrderId!!,
                onDismiss = { pendingRejectOrderId = null },
                onConfirmRejection = { reason ->
                    val orderId = pendingRejectOrderId!!
                    pendingRejectOrderId = null
                    onRechazarPedidoConMotivo(orderId, reason)
                }
            )
        }
    }
}
