package com.example

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.maps.android.compose.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.Locale
import java.util.UUID

@Composable
fun highContrastTextFieldColors(
    accentColor: Color = Color(0xFF2563EB)
) = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color(0xFF0F172A),
    unfocusedTextColor = Color(0xFF0F172A),
    disabledTextColor = Color(0xFF334155),
    focusedBorderColor = accentColor,
    unfocusedBorderColor = Color(0xFFCBD5E1),
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White,
    focusedLabelColor = accentColor,
    unfocusedLabelColor = Color(0xFF475569),
    focusedPlaceholderColor = Color(0xFF94A3B8),
    unfocusedPlaceholderColor = Color(0xFF94A3B8),
    cursorColor = accentColor
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SolicitarEnvioScreen(
    firebaseManager: FirebaseManager,
    onPedidoCreadoExitosamente: (pedidoId: String) -> Unit,
    onGuardarPedidoFirestore: (
        id: String,
        origen: String,
        destino: String,
        metodoPago: String,
        costo: Double,
        origenLat: Double,
        origenLng: Double,
        destinoLat: Double,
        destinoLng: Double,
        amountPaid: Double,
        changeNeeded: Double,
        receiptUrl: String,
        referenceNumber: String,
        payer: String,
        calculatedFee: Double,
        customerOffer: Double,
        senderName: String,
        senderPhone: String,
        recipientName: String,
        recipientPhone: String,
        packageDescription: String,
        deliveryType: String,
        notes: String,
        routeSnapshot: RouteSnapshot?,
        receiptPath: String
    ) -> Unit,
    onLogout: () -> Unit = {},
    onBack: () -> Unit = {},
    onComercioClick: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()
    val clipboardManager = LocalClipboardManager.current
    val focusManager = LocalFocusManager.current

    // Paleta de colores canónica y moderna BlueSystem
    val brandRed = Color(0xFFE11938)
    val brandBlue = Color(0xFF2563EB)
    val darkText = Color(0xFF0F172A)
    val grayText = Color(0xFF64748B)
    val lightBg = Color(0xFFF8FAFC)
    val borderGray = Color(0xFFE2E8F0)
    val greenSuccess = Color(0xFF10B981)

    val currentUser = remember { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser }
    val currentUserId = remember { currentUser?.uid ?: "" }
    val userPhoneAuth = remember { currentUser?.phoneNumber ?: "" }
    val userNameAuth = remember { currentUser?.displayName ?: "Cliente" }

    // Estados de inputs Origen y Destino
    var direccionOrigenX by remember { mutableStateOf("") }
    var direccionDestinoY by remember { mutableStateOf("") }

    var origenCacheado by remember { mutableStateOf<DireccionCacheada?>(null) }
    var destinoCacheado by remember { mutableStateOf<DireccionCacheada?>(null) }

    var isResolvingOrigin by remember { mutableStateOf(false) }
    var isResolvingDest by remember { mutableStateOf(false) }

    var originSuggestions by remember { mutableStateOf<List<DireccionCacheada>>(emptyList()) }
    var destSuggestions by remember { mutableStateOf<List<DireccionCacheada>>(emptyList()) }

    var showOriginSuggestions by remember { mutableStateOf(false) }
    var showDestSuggestions by remember { mutableStateOf(false) }

    var searchSeqOrigin by remember { mutableIntStateOf(0) }
    var searchSeqDest by remember { mutableIntStateOf(0) }

    // GPS & Ubicación Actual del Cliente
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }
    var isLocatingGps by remember { mutableStateOf(false) }
    var gpsFeedbackMessage by remember { mutableStateOf<String?>(null) }
    var pendingGpsTarget by remember { mutableStateOf<String?>(null) }

    // Modal de Mapa para Selección Directa
    var showMapPickerDialog by remember { mutableStateOf(false) }
    var mapPickerTarget by remember { mutableStateOf<String>("ORIGEN") } // "ORIGEN" o "DESTINO"

    // Direcciones guardadas del usuario
    var savedAddresses by remember { mutableStateOf<List<Address>>(emptyList()) }
    var showSaveAddressDialog by remember { mutableStateOf(false) }
    var addressToSaveTarget by remember { mutableStateOf<DireccionCacheada?>(null) }
    var addressSaveLabel by remember { mutableStateOf("Casa") }

    // Modal de Detalles del Envío
    var showDetailsDialog by remember { mutableStateOf(false) }
    var senderName by remember { mutableStateOf(userNameAuth) }
    var senderPhone by remember { mutableStateOf(userPhoneAuth) }
    var recipientName by remember { mutableStateOf("") }
    var recipientPhone by remember { mutableStateOf("") }
    var packageDescription by remember { mutableStateOf("") }
    var deliveryType by remember { mutableStateOf("PUERTA") } // "PUERTA" o "INMUEBLE"
    var additionalNotes by remember { mutableStateOf("") }

    // Cotización y Oferta de Precio
    var customOfferAmount by remember { mutableStateOf<Double?>(null) }
    var showOfferDialog by remember { mutableStateOf(false) }
    var offerInputText by remember { mutableStateOf("") }

    // Métodos de Pago y Quién Paga
    var metodoPagoSeleccionado by remember { mutableStateOf("efectivo") } // "efectivo", "billetera", "transferencia"
    var payerSelected by remember { mutableStateOf("SENDER") } // "SENDER" o "RECIPIENT"
    var montoEfectivo by remember { mutableStateOf("") }
    var comprobanteUrl by remember { mutableStateOf("") }
    var numeroReferencia by remember { mutableStateOf("") }

    var procesandoPedido by remember { mutableStateOf(false) }
    var mensajeError by remember { mutableStateOf<String?>(null) }

    // Helper: Reverse Geocoding seguro
    suspend fun reverseGeocodeCoordinates(lat: Double, lng: Double): String {
        return withContext(Dispatchers.IO) {
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                val list = geocoder.getFromLocation(lat, lng, 1)
                if (!list.isNullOrEmpty()) {
                    list[0].getAddressLine(0) ?: "Managua (${String.format(Locale.US, "%.4f", lat)}, ${String.format(Locale.US, "%.4f", lng)})"
                } else {
                    "Managua (${String.format(Locale.US, "%.4f", lat)}, ${String.format(Locale.US, "%.4f", lng)})"
                }
            } catch (e: Exception) {
                "${String.format(Locale.US, "%.4f", lat)}, ${String.format(Locale.US, "%.4f", lng)}"
            }
        }
    }

    // Helper: Solicitar GPS de forma atómica y robusta
    fun solicitarUbicacionActualGps(
        target: String,
        onGpsSuccess: ((Location, String) -> Unit)? = null
    ) {
        val finePerm = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarsePerm = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!finePerm && !coarsePerm) {
            pendingGpsTarget = target
            return
        }

        val locManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        val isGpsEnabled = locManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true ||
                locManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true
        if (!isGpsEnabled) {
            isLocatingGps = false
            gpsFeedbackMessage = "Tu ubicación está desactivada. Activa el GPS para usar 'Mi ubicación actual'."
            Toast.makeText(context, "GPS desactivado. Por favor actívalo en ajustes.", Toast.LENGTH_LONG).show()
            return
        }

        isLocatingGps = true
        gpsFeedbackMessage = null

        try {
            fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnSuccessListener { loc ->
                    if (loc != null) {
                        coroutineScope.launch {
                            val readableAddress = reverseGeocodeCoordinates(loc.latitude, loc.longitude)
                            if (loc.hasAccuracy() && loc.accuracy > 100f) {
                                gpsFeedbackMessage = "⚠️ Tu ubicación tiene baja precisión (${loc.accuracy.toInt()}m). Puedes ajustar el punto en el mapa."
                            } else {
                                gpsFeedbackMessage = null
                            }

                            val item = DireccionCacheada(
                                id = UUID.randomUUID().toString(),
                                searchText = readableAddress.lowercase().trim(),
                                formattedAddress = readableAddress,
                                latitude = loc.latitude,
                                longitude = loc.longitude,
                                source = LocationSelectionSource.CURRENT_LOCATION.name
                            )

                            when (target) {
                                "ORIGEN" -> {
                                    direccionOrigenX = readableAddress
                                    origenCacheado = item
                                    showOriginSuggestions = false
                                }
                                "DESTINO" -> {
                                    direccionDestinoY = readableAddress
                                    destinoCacheado = item
                                    showDestSuggestions = false
                                }
                                "MAP_PICKER" -> {
                                    onGpsSuccess?.invoke(loc, readableAddress)
                                }
                            }
                            isLocatingGps = false
                        }
                    } else {
                        fusedLocationClient.lastLocation.addOnSuccessListener { lastLoc ->
                            if (lastLoc != null) {
                                coroutineScope.launch {
                                    val readableAddress = reverseGeocodeCoordinates(lastLoc.latitude, lastLoc.longitude)
                                    val item = DireccionCacheada(
                                        id = UUID.randomUUID().toString(),
                                        searchText = readableAddress.lowercase().trim(),
                                        formattedAddress = readableAddress,
                                        latitude = lastLoc.latitude,
                                        longitude = lastLoc.longitude,
                                        source = LocationSelectionSource.CURRENT_LOCATION.name
                                    )
                                    when (target) {
                                        "ORIGEN" -> {
                                            direccionOrigenX = readableAddress
                                            origenCacheado = item
                                            showOriginSuggestions = false
                                        }
                                        "DESTINO" -> {
                                            direccionDestinoY = readableAddress
                                            destinoCacheado = item
                                            showDestSuggestions = false
                                        }
                                        "MAP_PICKER" -> {
                                            onGpsSuccess?.invoke(lastLoc, readableAddress)
                                        }
                                    }
                                    isLocatingGps = false
                                }
                            } else {
                                isLocatingGps = false
                                gpsFeedbackMessage = "No se pudo obtener la ubicación GPS actual. Puedes buscar o seleccionar en el mapa."
                            }
                        }.addOnFailureListener {
                            isLocatingGps = false
                            gpsFeedbackMessage = "Error al obtener GPS. Puedes seleccionar el punto en el mapa."
                        }
                    }
                }.addOnFailureListener { e ->
                    isLocatingGps = false
                    gpsFeedbackMessage = "Error de GPS: ${e.localizedMessage ?: "No disponible"}"
                }
        } catch (e: SecurityException) {
            isLocatingGps = false
            gpsFeedbackMessage = "Permiso de ubicación denegado."
        } catch (e: Exception) {
            isLocatingGps = false
            gpsFeedbackMessage = "Error al consultar ubicación: ${e.message}"
        }
    }

    // Launcher de Permisos de Ubicación
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (fineGranted || coarseGranted) {
            pendingGpsTarget?.let { target ->
                solicitarUbicacionActualGps(target)
            }
        } else {
            isLocatingGps = false
            gpsFeedbackMessage = "No pudimos acceder a tu ubicación. Puedes buscar una dirección o seleccionar el punto en el mapa."
            Toast.makeText(context, "Permiso de ubicación denegado", Toast.LENGTH_SHORT).show()
        }
        pendingGpsTarget = null
    }

    fun triggerGpsRequest(target: String, onGpsSuccess: ((Location, String) -> Unit)? = null) {
        val finePerm = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarsePerm = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!finePerm && !coarsePerm) {
            pendingGpsTarget = target
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        } else {
            solicitarUbicacionActualGps(target, onGpsSuccess)
        }
    }

    // Cargar direcciones guardadas del usuario en tiempo real
    LaunchedEffect(currentUserId) {
        if (currentUserId.isNotEmpty()) {
            try {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                db.collection("users").document(currentUserId).collection("addresses")
                    .addSnapshotListener { snapshot, _ ->
                        if (snapshot != null) {
                            val list = snapshot.documents.mapNotNull { doc ->
                                doc.toObject(Address::class.java)?.copy(id = doc.id)
                            }
                            savedAddresses = list

                            // Sugerir la dirección predeterminada para Destino Y si está vacío
                            val def = list.find { it.isDefault } ?: list.firstOrNull()
                            if (def != null && direccionDestinoY.isBlank()) {
                                direccionDestinoY = def.fullAddress
                                if (def.latitude != 0.0 && def.longitude != 0.0) {
                                    destinoCacheado = DireccionCacheada(
                                        id = def.id,
                                        searchText = def.fullAddress.lowercase().trim(),
                                        formattedAddress = def.fullAddress,
                                        latitude = def.latitude,
                                        longitude = def.longitude,
                                        source = LocationSelectionSource.SAVED_ADDRESS.name
                                    )
                                }
                            }
                        }
                    }
            } catch (e: Exception) {
                // Fallback silencioso
            }
        }
    }

    // Geocodificación / Búsqueda con caché local y sugerencias múltiples
    suspend fun buscarDirecciones(query: String): List<DireccionCacheada> {
        if (query.isBlank() || query.trim().length < 3) return emptyList()
        val results = mutableListOf<DireccionCacheada>()

        // 1. Buscar en caché local
        val cached = firebaseManager.buscarDireccionLocal(query)
        if (cached != null) {
            results.add(cached.copy(source = LocationSelectionSource.SEARCH.name))
        }

        // 2. Geocoder de Android con resolución de lugares y direcciones
        withContext(Dispatchers.IO) {
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                val cleanQuery = query.trim()
                val searchQuery = if (cleanQuery.lowercase().contains("managua") || cleanQuery.lowercase().contains("nicaragua")) {
                    cleanQuery
                } else {
                    "$cleanQuery, Managua, Nicaragua"
                }
                val addresses = geocoder.getFromLocationName(searchQuery, 5)
                if (!addresses.isNullOrEmpty()) {
                    for (addr in addresses) {
                        val formatted = addr.getAddressLine(0) ?: cleanQuery
                        val item = DireccionCacheada(
                            id = UUID.randomUUID().toString(),
                            searchText = cleanQuery.lowercase().trim(),
                            formattedAddress = formatted,
                            latitude = addr.latitude,
                            longitude = addr.longitude,
                            source = LocationSelectionSource.SEARCH.name
                        )
                        if (results.none { it.formattedAddress == formatted }) {
                            results.add(item)
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore geocoder timeout or connectivity issues
            }
        }
        return results
    }

    // Debounce para resolución de Origen X con secuencia para evitar respuestas fuera de orden
    LaunchedEffect(direccionOrigenX) {
        val currentSeq = ++searchSeqOrigin
        if (direccionOrigenX.trim().length >= 3 && origenCacheado?.formattedAddress != direccionOrigenX) {
            isResolvingOrigin = true
            delay(350)
            if (currentSeq != searchSeqOrigin) return@LaunchedEffect
            val list = buscarDirecciones(direccionOrigenX)
            if (currentSeq == searchSeqOrigin) {
                originSuggestions = list
                if (list.isNotEmpty() && origenCacheado == null) {
                    origenCacheado = list.first()
                }
                showOriginSuggestions = list.isNotEmpty()
                isResolvingOrigin = false
            }
        } else {
            isResolvingOrigin = false
            if (direccionOrigenX.trim().length < 3) {
                originSuggestions = emptyList()
                showOriginSuggestions = false
            }
        }
    }

    // Debounce para resolución de Destino Y con secuencia
    LaunchedEffect(direccionDestinoY) {
        val currentSeq = ++searchSeqDest
        if (direccionDestinoY.trim().length >= 3 && destinoCacheado?.formattedAddress != direccionDestinoY) {
            isResolvingDest = true
            delay(350)
            if (currentSeq != searchSeqDest) return@LaunchedEffect
            val list = buscarDirecciones(direccionDestinoY)
            if (currentSeq == searchSeqDest) {
                destSuggestions = list
                if (list.isNotEmpty() && destinoCacheado == null) {
                    destinoCacheado = list.first()
                }
                showDestSuggestions = list.isNotEmpty()
                isResolvingDest = false
            }
        } else {
            isResolvingDest = false
            if (direccionDestinoY.trim().length < 3) {
                destSuggestions = emptyList()
                showDestSuggestions = false
            }
        }
    }

    // Launcher de comprobante de pago
    var comprobanteFile by remember { mutableStateOf<File?>(null) }
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            coroutineScope.launch(Dispatchers.IO) {
                try {
                    val inputStream = context.contentResolver.openInputStream(uri)
                    val bitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
                    inputStream?.close()
                    if (bitmap != null) {
                        val outputFile = File(context.cacheDir, "receipt_xy_${System.currentTimeMillis()}.jpg")
                        val outputStream = FileOutputStream(outputFile)
                        bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 70, outputStream)
                        outputStream.close()
                        comprobanteFile = outputFile
                        comprobanteUrl = Uri.fromFile(outputFile).toString()
                    }
                } catch (e: Exception) {
                    comprobanteUrl = uri.toString()
                }
            }
        }
    }

    // Cuentas Bancarias Dinámicas (/system_config/bank_accounts)
    var bankAccounts by remember {
        mutableStateOf<List<Map<String, String>>>(
            listOf(
                mapOf("bankName" to "BAC Credomatic (Córdobas)", "accountNumber" to "365821945", "beneficiary" to "BlueSystem Delivery"),
                mapOf("bankName" to "Banpro Grupo Promerica (Córdobas)", "accountNumber" to "10020304050607", "beneficiary" to "BlueSystem Delivery")
            )
        )
    }

    LaunchedEffect(Unit) {
        try {
            com.google.firebase.firestore.FirebaseFirestore.getInstance()
                .collection("system_config")
                .document("bank_accounts")
                .get()
                .addOnSuccessListener { doc ->
                    if (doc != null && doc.exists()) {
                        val accounts = doc.get("accounts") as? List<Map<String, Any>>
                        if (!accounts.isNullOrEmpty()) {
                            bankAccounts = accounts.map { acc ->
                                mapOf(
                                    "bankName" to (acc["bankName"]?.toString() ?: "Banco"),
                                    "accountNumber" to (acc["accountNumber"]?.toString() ?: ""),
                                    "beneficiary" to (acc["beneficiary"]?.toString() ?: "BlueSystem Delivery")
                                )
                            }
                        }
                    }
                }
        } catch (_: Exception) {}
    }

    // Motor de Routing Real y Distancia Vial (Actividad #16 - BSDEL-C16-REAL-ROUTING)
    var routeSnapshotState by remember { mutableStateOf<RouteSnapshot?>(null) }
    var isCalculatingRoute by remember { mutableStateOf(false) }
    var pricingErrorMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(origenCacheado, destinoCacheado) {
        if (origenCacheado != null && destinoCacheado != null) {
            isCalculatingRoute = true
            pricingErrorMessage = null
            try {
                // Debounce de 300ms para evitar múltiples consultas mientras el usuario interactúa
                delay(300L)
                val snapshot = com.example.domain.engine.RealRoutingEngine.resolveRealRoute(
                    origenCacheado!!.latitude, origenCacheado!!.longitude,
                    destinoCacheado!!.latitude, destinoCacheado!!.longitude
                )
                if (snapshot.pricingSnapshot == null || snapshot.calculatedFee <= 0.0) {
                    routeSnapshotState = null
                    pricingErrorMessage = "Error de cotización: No se recibió tarifa válida del servidor."
                } else {
                    routeSnapshotState = snapshot
                }
            } catch (e: Exception) {
                // Fail-Closed: Sin fallback financiero silencioso
                routeSnapshotState = null
                pricingErrorMessage = "Error de cotización: No se pudo verificar la tarifa con el servidor (${e.message ?: "Sin conexión"})."
            } finally {
                isCalculatingRoute = false
            }
        } else {
            routeSnapshotState = null
            pricingErrorMessage = null
        }
    }

    val distanciaKm = remember(routeSnapshotState) {
        routeSnapshotState?.distanceKm ?: 0.0
    }

    // Cotización autoritativa calculada estrictamente por el backend SSOT (baseFee + km * pricePerKm)
    val cotizacionCalculada = remember(routeSnapshotState) {
        routeSnapshotState?.pricingSnapshot?.calculatedAmount ?: 0.0
    }

    // Oferta final a aplicar (o la cotización si el cliente no especificó una oferta personalizada)
    val tarifaFinal = remember(cotizacionCalculada, customOfferAmount) {
        customOfferAmount ?: cotizacionCalculada
    }

    // Manejo seguro de mapa y cámara
    val defaultCenter = remember { LatLng(12.1364, -86.2514) } // Managua
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(defaultCenter, 13f)
    }

    LaunchedEffect(origenCacheado, destinoCacheado) {
        try {
            if (origenCacheado != null && destinoCacheado != null) {
                val p1 = LatLng(origenCacheado!!.latitude, origenCacheado!!.longitude)
                val p2 = LatLng(destinoCacheado!!.latitude, destinoCacheado!!.longitude)
                val bounds = LatLngBounds.builder().include(p1).include(p2).build()
                cameraPositionState.animate(CameraUpdateFactory.newLatLngBounds(bounds, 120))
            } else if (origenCacheado != null) {
                val p1 = LatLng(origenCacheado!!.latitude, origenCacheado!!.longitude)
                cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(p1, 14f))
            } else if (destinoCacheado != null) {
                val p2 = LatLng(destinoCacheado!!.latitude, destinoCacheado!!.longitude)
                cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(p2, 14f))
            }
        } catch (e: Exception) {
            // Protección de renderizado
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            modifier = Modifier
                .fillMaxSize()
                .navigationBarsPadding()
                .imePadding(),
            topBar = {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color.White,
                    shadowElevation = 3.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = onBack,
                            modifier = Modifier
                                .size(40.dp)
                                .background(Color(0xFFF1F5F9), CircleShape)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Volver",
                                tint = darkText,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Enviar Paquete",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = darkText
                        )
                        Text(
                            text = "Servicio Express Punto X → Punto Y",
                            fontSize = 12.sp,
                            color = grayText,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Box(
                        modifier = Modifier
                            .background(Color(0xFFEFF6FF), RoundedCornerShape(10.dp))
                            .padding(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.DirectionsBike,
                                contentDescription = null,
                                tint = brandBlue,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Express",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = brandBlue
                            )
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(lightBg)
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {

            // Banner de Feedback de GPS / Precisión
            if (gpsFeedbackMessage != null) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFFEF2F2),
                    border = BorderStroke(1.dp, Color(0xFFFCA5A5))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = Color(0xFFDC2626),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = gpsFeedbackMessage!!,
                            color = Color(0xFF991B1B),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(
                            onClick = { gpsFeedbackMessage = null },
                            modifier = Modifier.size(22.dp)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Cerrar",
                                tint = Color(0xFF991B1B),
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }

            // 1. TARJETA DE DIRECCIONES (ORIGEN X Y DESTINO Y CON TODAS LAS MODALIDADES)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Ruta del Envío",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = darkText
                        )
                        Text(
                            text = "X → Y",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = brandBlue
                        )
                    }

                    // ====== SECCIÓN ORIGEN X ======
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .background(brandRed, CircleShape)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "PUNTO DE RECOGIDA (ORIGEN X)",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = brandRed,
                                    letterSpacing = 0.5.sp
                                )
                            }
                            if (isResolvingOrigin) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(14.dp),
                                    strokeWidth = 2.dp,
                                    color = brandRed
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        OutlinedTextField(
                            value = direccionOrigenX,
                            onValueChange = {
                                direccionOrigenX = it
                                mensajeError = null
                            },
                            placeholder = { Text("Escribe o busca el punto de recogida...", color = Color(0xFF94A3B8), fontSize = 13.sp) },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.TripOrigin,
                                    contentDescription = null,
                                    tint = brandRed,
                                    modifier = Modifier.size(18.dp)
                                )
                            },
                            trailingIcon = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (direccionOrigenX.isNotEmpty()) {
                                        IconButton(onClick = {
                                            direccionOrigenX = ""
                                            origenCacheado = null
                                            originSuggestions = emptyList()
                                            showOriginSuggestions = false
                                        }) {
                                            Icon(Icons.Default.Clear, contentDescription = "Limpiar", tint = grayText, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                    IconButton(onClick = {
                                        mapPickerTarget = "ORIGEN"
                                        showMapPickerDialog = true
                                    }) {
                                        Icon(Icons.Default.Map, contentDescription = "Seleccionar en mapa", tint = brandRed, modifier = Modifier.size(18.dp))
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("origen_input"),
                            shape = RoundedCornerShape(12.dp),
                            colors = highContrastTextFieldColors(brandRed),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                        )

                        // Acción rápida: Usar ubicación actual para Origen
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            horizontalArrangement = Arrangement.Start
                        ) {
                            Surface(
                                modifier = Modifier.clickable {
                                    triggerGpsRequest("ORIGEN")
                                },
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFFEF2F2),
                                border = BorderStroke(1.dp, Color(0xFFFECDD3))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (isLocatingGps && pendingGpsTarget == "ORIGEN") {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(12.dp),
                                            strokeWidth = 1.5.dp,
                                            color = brandRed
                                        )
                                    } else {
                                        Icon(
                                            Icons.Default.MyLocation,
                                            contentDescription = null,
                                            tint = brandRed,
                                            modifier = Modifier.size(13.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(5.dp))
                                    Text(
                                        text = "📍 Usar mi ubicación actual",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = brandRed
                                    )
                                }
                            }
                        }

                        // Sugerencias de autocompletado para Origen
                        if (showOriginSuggestions && originSuggestions.isNotEmpty()) {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 4.dp),
                                shape = RoundedCornerShape(10.dp),
                                color = Color(0xFFF8FAFC),
                                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                shadowElevation = 3.dp
                            ) {
                                Column(modifier = Modifier.padding(4.dp)) {
                                    originSuggestions.take(4).forEach { sug ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    direccionOrigenX = sug.formattedAddress
                                                    origenCacheado = sug
                                                    showOriginSuggestions = false
                                                }
                                                .padding(horizontal = 10.dp, vertical = 8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = brandRed, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = sug.formattedAddress,
                                                    fontSize = 12.sp,
                                                    color = darkText,
                                                    fontWeight = FontWeight.Medium,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Badge de confirmación GPS y botón guardar dirección
                        if (origenCacheado != null) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "📍 ${origenCacheado!!.formattedAddress}",
                                    fontSize = 11.sp,
                                    color = greenSuccess,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.weight(1f),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "💾 Guardar",
                                    fontSize = 11.sp,
                                    color = brandBlue,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clickable {
                                            addressToSaveTarget = origenCacheado
                                            showSaveAddressDialog = true
                                        }
                                        .padding(start = 6.dp)
                                )
                            }
                        }

                        // Direcciones Guardadas Rápidas para Origen
                        if (savedAddresses.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Direcciones guardadas:",
                                fontSize = 11.sp,
                                color = grayText,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(savedAddresses) { addr ->
                                    Surface(
                                        modifier = Modifier.clickable {
                                            direccionOrigenX = addr.fullAddress
                                            origenCacheado = DireccionCacheada(
                                                id = addr.id,
                                                searchText = addr.fullAddress.lowercase().trim(),
                                                formattedAddress = addr.fullAddress,
                                                latitude = addr.latitude,
                                                longitude = addr.longitude,
                                                source = LocationSelectionSource.SAVED_ADDRESS.name
                                            )
                                            showOriginSuggestions = false
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFFF1F5F9),
                                        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = when (addr.label.lowercase()) {
                                                    "casa" -> "🏠"
                                                    "trabajo" -> "💼"
                                                    "bodega" -> "📦"
                                                    else -> "📍"
                                                },
                                                fontSize = 11.sp
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = addr.label,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = darkText
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    HorizontalDivider(color = Color(0xFFF1F5F9))

                    // ====== SECCIÓN DESTINO Y ======
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .background(brandBlue, CircleShape)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "DIRECCIÓN DE ENTREGA (DESTINO Y)",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = brandBlue,
                                    letterSpacing = 0.5.sp
                                )
                            }
                            if (isResolvingDest) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(14.dp),
                                    strokeWidth = 2.dp,
                                    color = brandBlue
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        OutlinedTextField(
                            value = direccionDestinoY,
                            onValueChange = {
                                direccionDestinoY = it
                                mensajeError = null
                            },
                            placeholder = { Text("Escribe o busca la dirección de entrega...", color = Color(0xFF94A3B8), fontSize = 13.sp) },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = brandBlue,
                                    modifier = Modifier.size(18.dp)
                                )
                            },
                            trailingIcon = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (direccionDestinoY.isNotEmpty()) {
                                        IconButton(onClick = {
                                            direccionDestinoY = ""
                                            destinoCacheado = null
                                            destSuggestions = emptyList()
                                            showDestSuggestions = false
                                        }) {
                                            Icon(Icons.Default.Clear, contentDescription = "Limpiar", tint = grayText, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                    IconButton(onClick = {
                                        mapPickerTarget = "DESTINO"
                                        showMapPickerDialog = true
                                    }) {
                                        Icon(Icons.Default.Map, contentDescription = "Seleccionar en mapa", tint = brandBlue, modifier = Modifier.size(18.dp))
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("destino_input"),
                            shape = RoundedCornerShape(12.dp),
                            colors = highContrastTextFieldColors(brandBlue),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() })
                        )

                        // Acción rápida: Usar ubicación actual para Destino
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            horizontalArrangement = Arrangement.Start
                        ) {
                            Surface(
                                modifier = Modifier.clickable {
                                    triggerGpsRequest("DESTINO")
                                },
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFEFF6FF),
                                border = BorderStroke(1.dp, Color(0xFFBFDBFE))
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (isLocatingGps && pendingGpsTarget == "DESTINO") {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(12.dp),
                                            strokeWidth = 1.5.dp,
                                            color = brandBlue
                                        )
                                    } else {
                                        Icon(
                                            Icons.Default.MyLocation,
                                            contentDescription = null,
                                            tint = brandBlue,
                                            modifier = Modifier.size(13.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(5.dp))
                                    Text(
                                        text = "📍 Usar mi ubicación actual",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = brandBlue
                                    )
                                }
                            }
                        }

                        // Sugerencias de autocompletado para Destino
                        if (showDestSuggestions && destSuggestions.isNotEmpty()) {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 4.dp),
                                shape = RoundedCornerShape(10.dp),
                                color = Color(0xFFF8FAFC),
                                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                shadowElevation = 3.dp
                            ) {
                                Column(modifier = Modifier.padding(4.dp)) {
                                    destSuggestions.take(4).forEach { sug ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    direccionDestinoY = sug.formattedAddress
                                                    destinoCacheado = sug
                                                    showDestSuggestions = false
                                                }
                                                .padding(horizontal = 10.dp, vertical = 8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = brandBlue, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = sug.formattedAddress,
                                                    fontSize = 12.sp,
                                                    color = darkText,
                                                    fontWeight = FontWeight.Medium,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Badge de confirmación GPS y botón guardar dirección
                        if (destinoCacheado != null) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "📍 ${destinoCacheado!!.formattedAddress}",
                                    fontSize = 11.sp,
                                    color = greenSuccess,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.weight(1f),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = "💾 Guardar",
                                    fontSize = 11.sp,
                                    color = brandBlue,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .clickable {
                                            addressToSaveTarget = destinoCacheado
                                            showSaveAddressDialog = true
                                        }
                                        .padding(start = 6.dp)
                                )
                            }
                        }

                        // Direcciones Guardadas Rápidas para Destino
                        if (savedAddresses.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Direcciones guardadas:",
                                fontSize = 11.sp,
                                color = grayText,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(savedAddresses) { addr ->
                                    Surface(
                                        modifier = Modifier.clickable {
                                            direccionDestinoY = addr.fullAddress
                                            destinoCacheado = DireccionCacheada(
                                                id = addr.id,
                                                searchText = addr.fullAddress.lowercase().trim(),
                                                formattedAddress = addr.fullAddress,
                                                latitude = addr.latitude,
                                                longitude = addr.longitude,
                                                source = LocationSelectionSource.SAVED_ADDRESS.name
                                            )
                                            showDestSuggestions = false
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFFF1F5F9),
                                        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = when (addr.label.lowercase()) {
                                                    "casa" -> "🏠"
                                                    "trabajo" -> "💼"
                                                    "bodega" -> "📦"
                                                    else -> "📍"
                                                },
                                                fontSize = 11.sp
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = addr.label,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = darkText
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. GOOGLE MAPS CARD CON RUTA X -> Y
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    GoogleMap(
                        modifier = Modifier.fillMaxSize(),
                        cameraPositionState = cameraPositionState,
                        uiSettings = MapUiSettings(
                            zoomControlsEnabled = false,
                            myLocationButtonEnabled = false,
                            mapToolbarEnabled = false
                        )
                    ) {
                        if (origenCacheado != null) {
                            Marker(
                                state = rememberMarkerState(
                                    position = LatLng(origenCacheado!!.latitude, origenCacheado!!.longitude)
                                ),
                                title = "Origen X (Recogida)",
                                snippet = direccionOrigenX
                            )
                        }

                        if (destinoCacheado != null) {
                            Marker(
                                state = rememberMarkerState(
                                    position = LatLng(destinoCacheado!!.latitude, destinoCacheado!!.longitude)
                                ),
                                title = "Destino Y (Entrega)",
                                snippet = direccionDestinoY
                            )
                        }

                        val roadPoints = remember(routeSnapshotState?.polyline) {
                            val rawPoly = routeSnapshotState?.polyline
                            if (!rawPoly.isNullOrBlank()) {
                                com.example.data.repository.courier.CourierRoutingRepository.decodePolyline(rawPoly)
                            } else emptyList()
                        }

                        if (roadPoints.isNotEmpty()) {
                            Polyline(
                                points = roadPoints,
                                color = brandBlue,
                                width = 6f
                            )
                        } else if (origenCacheado != null && destinoCacheado != null) {
                            Polyline(
                                points = listOf(
                                    LatLng(origenCacheado!!.latitude, origenCacheado!!.longitude),
                                    LatLng(destinoCacheado!!.latitude, destinoCacheado!!.longitude)
                                ),
                                color = brandBlue.copy(alpha = 0.35f),
                                width = 3f
                            )
                        }
                    }

                    // Badge de Distancia en Mapa
                    Surface(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(10.dp),
                        shape = RoundedCornerShape(8.dp),
                        color = Color.White.copy(alpha = 0.94f),
                        shadowElevation = 2.dp
                    ) {
                        Text(
                            text = if (distanciaKm > 0.0) "Distancia: ${String.format("%.2f", distanciaKm)} km" else "Google Maps Activo 🗺️",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = darkText,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // 3. CARD "DETALLES DEL ENVÍO" (ACCESO A BOTTOM SHEET / MODAL)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showDetailsDialog = true },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, if (packageDescription.isNotEmpty() && recipientPhone.isNotEmpty()) greenSuccess else borderGray),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .background(if (packageDescription.isNotEmpty()) Color(0xFFECFDF5) else Color(0xFFEFF6FF), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (packageDescription.isNotEmpty()) Icons.Default.CheckCircle else Icons.Default.Inventory2,
                                contentDescription = null,
                                tint = if (packageDescription.isNotEmpty()) greenSuccess else brandBlue,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Detalles del Envío",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = darkText
                            )
                            Text(
                                text = if (packageDescription.isNotEmpty()) {
                                    "📦 $packageDescription • ${if (deliveryType == "PUERTA") "A la puerta" else "En inmueble"}"
                                } else {
                                    "¿Qué envías? • Teléfonos • Instrucciones"
                                },
                                fontSize = 12.sp,
                                color = if (packageDescription.isNotEmpty()) Color(0xFF047857) else grayText,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = "Configurar",
                        tint = grayText
                    )
                }
            }

            // 4. TARJETA DE COTIZACIÓN Y OFERTA DE PRECIO
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Cotización & Oferta",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = darkText
                        )
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFEFF6FF)
                        ) {
                            Text(
                                text = "Tarifa Oficial + Oferta",
                                fontSize = 10.sp,
                                color = brandBlue,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(text = "Cotización BlueSystem", fontSize = 12.sp, color = grayText)
                            val durationLabel = routeSnapshotState?.let { if (it.durationMinutes > 0) " • ~${it.durationMinutes} min" else "" } ?: ""
                            val fallbackLabel = if (routeSnapshotState?.isFallback == true) " (Aprox)" else ""
                            Text(
                                text = "Ruta real: ${String.format("%.2f", distanciaKm)} km$durationLabel$fallbackLabel",
                                fontSize = 11.sp,
                                color = darkText,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        if (isCalculatingRoute) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = brandBlue
                            )
                        } else if (pricingErrorMessage != null) {
                            Text(
                                text = "Sin cotización",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFDC2626)
                            )
                        } else {
                            Text(
                                text = "C$ ${String.format("%.2f", cotizacionCalculada)}",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = darkText
                            )
                        }
                    }

                    if (pricingErrorMessage != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFFEF2F2),
                            border = BorderStroke(1.dp, Color(0xFFFECACA)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = Color(0xFFDC2626), modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(pricingErrorMessage!!, color = Color(0xFFDC2626), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    HorizontalDivider(color = Color(0xFFF1F5F9))

                    // SECCIÓN OFERTA DEL CLIENTE
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (customOfferAmount != null) "Tu oferta propuesta" else "Precio final del viaje",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (customOfferAmount != null) brandBlue else darkText
                            )
                            Text(
                                text = if (customOfferAmount != null) "Incentiva a motorizados cercanos" else "Basado en kilometraje exacto",
                                fontSize = 10.sp,
                                color = grayText
                            )
                        }
                        Text(
                            text = if (cotizacionCalculada > 0.0) "C$ ${String.format("%.2f", tarifaFinal)}" else "--",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            color = if (customOfferAmount != null) brandBlue else brandRed
                        )
                    }

                    // Botones de ajuste de oferta rápido [-5] [+5] [Ofrecer precio]
                    val canAdjustOffer = cotizacionCalculada > 0.0 && pricingErrorMessage == null
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedButton(
                            onClick = {
                                val current = customOfferAmount ?: cotizacionCalculada
                                val next = (current - 5.0).coerceAtLeast(cotizacionCalculada)
                                customOfferAmount = if (next == cotizacionCalculada) null else next
                            },
                            enabled = canAdjustOffer,
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                            modifier = Modifier.height(38.dp)
                        ) {
                            Text("-5", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = darkText)
                        }

                        OutlinedButton(
                            onClick = {
                                val current = customOfferAmount ?: cotizacionCalculada
                                customOfferAmount = current + 5.0
                            },
                            enabled = canAdjustOffer,
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                            modifier = Modifier.height(38.dp)
                        ) {
                            Text("+5", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = brandBlue)
                        }

                        Button(
                            onClick = {
                                offerInputText = String.format(Locale.US, "%.0f", tarifaFinal)
                                showOfferDialog = true
                            },
                            enabled = canAdjustOffer,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF1F5F9)),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(38.dp)
                        ) {
                            Icon(Icons.Default.LocalOffer, contentDescription = null, tint = if (canAdjustOffer) brandBlue else grayText, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (customOfferAmount != null) "Cambiar oferta" else "Ofrecer precio",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (canAdjustOffer) brandBlue else grayText
                            )
                        }
                    }
                }
            }

            // 5. SELECTOR DE MÉTODO DE PAGO Y ¿QUIÉN PAGA?
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "Método de Pago",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = darkText
                    )

                    // SELECTOR DE MÉTODO (Efectivo / Billetera / Transferencia)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf(
                            Triple("efectivo", "Efectivo", Icons.Default.Payments),
                            Triple("transferencia", "Transferencia", Icons.Default.AccountBalance)
                        ).forEach { (id, name, icon) ->
                            val isSelected = metodoPagoSeleccionado == id
                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(52.dp)
                                    .clickable { metodoPagoSeleccionado = id },
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) brandRed else Color(0xFFF8FAFC),
                                border = BorderStroke(1.dp, if (isSelected) brandRed else borderGray)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = icon,
                                        contentDescription = null,
                                        tint = if (isSelected) Color.White else darkText,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = name,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp,
                                        color = if (isSelected) Color.White else darkText
                                    )
                                }
                            }
                        }
                    }

                    // CHECKBOX / SELECTOR: EL DESTINATARIO PAGA EL ENVÍO
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                payerSelected = if (payerSelected == "RECIPIENT") "SENDER" else "RECIPIENT"
                            },
                        shape = RoundedCornerShape(12.dp),
                        color = if (payerSelected == "RECIPIENT") Color(0xFFEFF6FF) else Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, if (payerSelected == "RECIPIENT") brandBlue else borderGray)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = payerSelected == "RECIPIENT",
                                onCheckedChange = { isChecked ->
                                    payerSelected = if (isChecked) "RECIPIENT" else "SENDER"
                                },
                                colors = CheckboxDefaults.colors(checkedColor = brandBlue)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = "El destinatario paga el envío",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = darkText
                                )
                                Text(
                                    text = "El motorizado cobrará C$ ${String.format("%.2f", tarifaFinal)} al entregar el paquete.",
                                    fontSize = 11.sp,
                                    color = grayText
                                )
                            }
                        }
                    }

                    // DETALLES POR MÉTODO
                    if (metodoPagoSeleccionado == "efectivo") {
                        if (payerSelected == "SENDER") {
                            val amountEntered = montoEfectivo.toDoubleOrNull() ?: 0.0
                            val cambio = if (amountEntered >= tarifaFinal) amountEntered - tarifaFinal else 0.0

                            OutlinedTextField(
                                value = montoEfectivo,
                                onValueChange = { montoEfectivo = it },
                                label = { Text("¿Con cuánto pagas? (Para llevar tu vuelto)", fontSize = 12.sp) },
                                placeholder = { Text("Ej: 200 o 500", color = Color(0xFF94A3B8)) },
                                leadingIcon = {
                                    Icon(Icons.Default.MonetizationOn, contentDescription = null, tint = brandRed)
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                colors = highContrastTextFieldColors(brandRed)
                            )

                            if (montoEfectivo.isNotEmpty()) {
                                if (amountEntered < tarifaFinal) {
                                    Surface(
                                        color = Color(0xFFFEF2F2),
                                        shape = RoundedCornerShape(8.dp),
                                        border = BorderStroke(1.dp, Color(0xFFFECACA)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = "⚠️ Efectivo insuficiente. El monto debe ser al menos C$ ${String.format("%.2f", tarifaFinal)}",
                                            color = Color(0xFFDC2626),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(10.dp)
                                        )
                                    }
                                } else {
                                    Surface(
                                        color = Color(0xFFECFDF5),
                                        shape = RoundedCornerShape(8.dp),
                                        border = BorderStroke(1.dp, Color(0xFFA7F3D0)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = "💵 Tu vuelto será de: C$ ${String.format("%.2f", cambio)}",
                                            color = Color(0xFF047857),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            modifier = Modifier.padding(10.dp)
                                        )
                                    }
                                }
                            }
                        } else {
                            Surface(
                                color = Color(0xFFEFF6FF),
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, Color(0xFFBFDBFE)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "ℹ️ No necesitas especificar efectivo. El repartidor cobrará directamente al receptor en destino.",
                                    color = Color(0xFF1E40AF),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }
                    } else if (metodoPagoSeleccionado == "billetera") {
                        Surface(
                            color = Color(0xFFF8FAFC),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, borderGray),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Billeteras Disponibles (Banpro / LAFISE)", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = darkText)
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Tigo Money / Claro Pay: 8888-1122", fontSize = 12.sp, color = darkText, fontWeight = FontWeight.SemiBold)
                                    TextButton(onClick = { clipboardManager.setText(AnnotatedString("88881122")) }) {
                                        Text("Copiar", color = brandRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }

                        OutlinedButton(
                            onClick = { imagePickerLauncher.launch("image/*") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, if (comprobanteUrl.isNotEmpty()) greenSuccess else borderGray)
                        ) {
                            Icon(
                                imageVector = if (comprobanteUrl.isNotEmpty()) Icons.Default.CheckCircle else Icons.Default.CloudUpload,
                                contentDescription = null,
                                tint = if (comprobanteUrl.isNotEmpty()) greenSuccess else brandRed,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (comprobanteUrl.isNotEmpty()) "¡Comprobante Adjuntado!" else "Adjuntar Comprobante de Pago",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (comprobanteUrl.isNotEmpty()) greenSuccess else darkText
                            )
                        }

                        OutlinedTextField(
                            value = numeroReferencia,
                            onValueChange = { numeroReferencia = it },
                            label = { Text("No. de Referencia (Opcional)", fontSize = 12.sp) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = highContrastTextFieldColors(brandRed),
                            singleLine = true
                        )
                    } else if (metodoPagoSeleccionado == "transferencia") {
                        Surface(
                            color = Color(0xFFF8FAFC),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, borderGray),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Cuentas Bancarias Oficiales", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = darkText)
                                bankAccounts.forEach { acc ->
                                    val bName = acc["bankName"] ?: "Banco"
                                    val bNum = acc["accountNumber"] ?: ""
                                    val bBen = acc["beneficiary"] ?: ""
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text("$bName: $bNum", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = darkText)
                                            if (bBen.isNotBlank()) {
                                                Text("Titular: $bBen", fontSize = 10.sp, color = Color(0xFF64748B))
                                            }
                                        }
                                        TextButton(onClick = {
                                            clipboardManager.setText(AnnotatedString(bNum))
                                            Toast.makeText(context, "Cuenta $bName copiada", Toast.LENGTH_SHORT).show()
                                        }) {
                                            Text("Copiar", color = brandRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }

                        OutlinedButton(
                            onClick = { imagePickerLauncher.launch("image/*") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, if (comprobanteUrl.isNotEmpty()) greenSuccess else borderGray)
                        ) {
                            Icon(
                                imageVector = if (comprobanteUrl.isNotEmpty()) Icons.Default.CheckCircle else Icons.Default.CloudUpload,
                                contentDescription = null,
                                tint = if (comprobanteUrl.isNotEmpty()) greenSuccess else brandRed,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (comprobanteUrl.isNotEmpty()) "¡Comprobante Adjuntado!" else "Adjuntar Comprobante de Transferencia",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (comprobanteUrl.isNotEmpty()) greenSuccess else darkText
                            )
                        }

                        OutlinedTextField(
                            value = numeroReferencia,
                            onValueChange = { numeroReferencia = it },
                            label = { Text("No. de Referencia (Opcional)", fontSize = 12.sp) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = highContrastTextFieldColors(brandRed),
                            singleLine = true
                        )
                    }
                }
            }

            // Banner de error si existe
            if (mensajeError != null) {
                Surface(
                    color = Color(0xFFFEF2F2),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFFECACA)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = Color(0xFFDC2626))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = mensajeError!!,
                            color = Color(0xFFDC2626),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // 6. BOTÓN DE ACCIÓN PRINCIPAL (SOLICITAR ENVÍO CON IDEMPOTENCIA)
            Button(
                onClick = {
                    if (procesandoPedido) return@Button

                    val user = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
                    if (user == null) {
                        mensajeError = "⚠️ Sesión no detectada. Inicia sesión para solicitar un envío."
                        return@Button
                    }

                    if (direccionOrigenX.trim().isEmpty() || origenCacheado == null) {
                        mensajeError = "⚠️ Selecciona un punto de recogida (Origen X) válido."
                        return@Button
                    }

                    if (direccionDestinoY.trim().isEmpty() || destinoCacheado == null) {
                        mensajeError = "⚠️ Selecciona una dirección de entrega (Destino Y) válida."
                        return@Button
                    }

                    if (routeSnapshotState?.pricingSnapshot == null || cotizacionCalculada <= 0.0) {
                        mensajeError = pricingErrorMessage ?: "⚠️ Error de cotización. No es posible solicitar el envío sin tarifa oficial autorizada."
                        return@Button
                    }

                    if (packageDescription.trim().isEmpty()) {
                        mensajeError = "⚠️ Por favor ingresa los detalles del paquete a enviar."
                        showDetailsDialog = true
                        return@Button
                    }

                    if (recipientPhone.trim().isEmpty()) {
                        mensajeError = "⚠️ Por favor ingresa el teléfono del destinatario en Detalles del Envío."
                        showDetailsDialog = true
                        return@Button
                    }

                    if (payerSelected == "SENDER" && metodoPagoSeleccionado == "efectivo") {
                        val monto = montoEfectivo.toDoubleOrNull() ?: 0.0
                        if (monto < tarifaFinal) {
                            mensajeError = "⚠️ El monto en efectivo debe ser mayor o igual a C$ ${String.format("%.2f", tarifaFinal)}."
                            return@Button
                        }
                    } else if (metodoPagoSeleccionado != "efectivo") {
                        if (comprobanteUrl.isEmpty()) {
                            mensajeError = "⚠️ Debes adjuntar la foto del comprobante de pago."
                            return@Button
                        }
                    }

                    val amountPaid = if (payerSelected == "SENDER" && metodoPagoSeleccionado == "efectivo") {
                        montoEfectivo.toDoubleOrNull() ?: tarifaFinal
                    } else {
                        tarifaFinal
                    }
                    val changeNeeded = if (payerSelected == "SENDER" && metodoPagoSeleccionado == "efectivo") {
                        amountPaid - tarifaFinal
                    } else {
                        0.0
                    }

                    procesandoPedido = true
                    mensajeError = null
                    val nuevoPedidoId = "env_${UUID.randomUUID().toString().take(8)}"

                    coroutineScope.launch {
                        try {
                            var resolvedReceiptUrl = ""
                            var resolvedReceiptPath = ""
                            if (metodoPagoSeleccionado == "transferencia" || metodoPagoSeleccionado == "billetera") {
                                if (comprobanteFile == null || !comprobanteFile!!.exists()) {
                                    mensajeError = "⚠️ Debes adjuntar la foto del comprobante de pago."
                                    procesandoPedido = false
                                    return@launch
                                }
                                val currentAuthUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""
                                val receiptFileName = "receipt_${System.currentTimeMillis()}.jpg"
                                val storagePath = "vouchers/$nuevoPedidoId/$receiptFileName"
                                val storageRef = com.google.firebase.storage.FirebaseStorage.getInstance()
                                    .reference
                                    .child(storagePath)

                                val metadata = com.google.firebase.storage.StorageMetadata.Builder()
                                    .setContentType("image/jpeg")
                                    .setCustomMetadata("userId", currentAuthUid)
                                    .build()

                                storageRef.putFile(Uri.fromFile(comprobanteFile!!), metadata).await()
                                resolvedReceiptUrl = storageRef.downloadUrl.await().toString()
                                resolvedReceiptPath = storagePath
                            }

                            origenCacheado?.let { firebaseManager.guardarDireccionCache(it) }
                            destinoCacheado?.let { firebaseManager.guardarDireccionCache(it) }

                            onGuardarPedidoFirestore(
                                nuevoPedidoId,
                                direccionOrigenX,
                                direccionDestinoY,
                                metodoPagoSeleccionado,
                                tarifaFinal,
                                origenCacheado?.latitude ?: 12.1364,
                                origenCacheado?.longitude ?: -86.2514,
                                destinoCacheado?.latitude ?: 12.1400,
                                destinoCacheado?.longitude ?: -86.2600,
                                amountPaid,
                                changeNeeded,
                                resolvedReceiptUrl,
                                numeroReferencia,
                                payerSelected,
                                cotizacionCalculada,
                                customOfferAmount ?: cotizacionCalculada,
                                senderName.ifBlank { "Cliente Remitente" },
                                senderPhone.ifBlank { userPhoneAuth },
                                recipientName.ifBlank { "Destinatario" },
                                recipientPhone,
                                packageDescription,
                                deliveryType,
                                additionalNotes,
                                routeSnapshotState!!,
                                resolvedReceiptPath
                            )
                            AnalyticsHelper.logPurchase(nuevoPedidoId, tarifaFinal, metodoPagoSeleccionado, 1)
                            procesandoPedido = false
                            onPedidoCreadoExitosamente(nuevoPedidoId)
                        } catch (e: Exception) {
                            android.util.Log.e("SolicitarEnvio", "Error creando pedido o subiendo comprobante", e)
                            mensajeError = if (metodoPagoSeleccionado == "transferencia" || metodoPagoSeleccionado == "billetera") {
                                "⚠️ Error al subir el comprobante bancario: ${e.message ?: "Verifique su conexión e intente nuevamente."}"
                            } else {
                                "⚠️ Error al registrar la encomienda: ${e.message ?: "Intente nuevamente."}"
                            }
                            procesandoPedido = false
                        }
                    }
                },
                enabled = !procesandoPedido && !isCalculatingRoute && routeSnapshotState?.pricingSnapshot != null && cotizacionCalculada > 0.0,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .testTag("solicitar_envio_submit_button"),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = brandRed,
                    disabledContainerColor = brandRed.copy(alpha = 0.6f)
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 3.dp)
            ) {
                if (procesandoPedido) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.5.dp
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Creando envío...", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "SOLICITAR ENVÍO • C$ ${String.format("%.2f", tarifaFinal)}",
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    // ==========================================
    // OVERLAY MODAL 1: DETALLES DEL ENVÍO
    // ==========================================
    if (showDetailsDialog) {
        BackHandler { showDetailsDialog = false }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.55f))
                .clickable { showDetailsDialog = false }
                .navigationBarsPadding()
                .statusBarsPadding()
                .imePadding(),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth(0.94f)
                    .fillMaxHeight(0.86f)
                    .clickable(enabled = false) {},
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                shadowElevation = 12.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(18.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Detalles del Envío",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = darkText
                        )
                        IconButton(onClick = { showDetailsDialog = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = grayText)
                        }
                    }

                    HorizontalDivider(color = Color(0xFFF1F5F9))
                    Spacer(modifier = Modifier.height(8.dp))

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // REMITENTE
                        Text("INFORMACIÓN DEL REMITENTE", fontSize = 11.sp, fontWeight = FontWeight.Black, color = brandRed)
                        OutlinedTextField(
                            value = senderName,
                            onValueChange = { senderName = it },
                            label = { Text("Nombre del Remitente") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = highContrastTextFieldColors(brandRed),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = senderPhone,
                            onValueChange = { senderPhone = it },
                            label = { Text("Teléfono de Contacto (Remitente)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            colors = highContrastTextFieldColors(brandRed),
                            singleLine = true
                        )

                        // DESTINATARIO
                        Text("INFORMACIÓN DEL DESTINATARIO", fontSize = 11.sp, fontWeight = FontWeight.Black, color = brandBlue)
                        OutlinedTextField(
                            value = recipientName,
                            onValueChange = { recipientName = it },
                            label = { Text("Nombre de quien recibe (Opcional)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = highContrastTextFieldColors(brandBlue),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = recipientPhone,
                            onValueChange = { recipientPhone = it },
                            label = { Text("Teléfono del Destinatario (Requerido) *") },
                            placeholder = { Text("Ej: 8888 7777") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            colors = highContrastTextFieldColors(brandBlue),
                            singleLine = true
                        )

                        // TIPO DE ENTREGA
                        Text("TIPO DE ENTREGA", fontSize = 11.sp, fontWeight = FontWeight.Black, color = darkText)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(
                                Pair("PUERTA", "A la puerta"),
                                Pair("INMUEBLE", "En el inmueble")
                            ).forEach { (type, label) ->
                                val isSel = deliveryType == type
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { deliveryType = type },
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (isSel) brandBlue else Color(0xFFF8FAFC),
                                    border = BorderStroke(1.dp, if (isSel) brandBlue else borderGray)
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSel) Color.White else darkText,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(vertical = 10.dp)
                                    )
                                }
                            }
                        }

                        // ¿QUÉ ESTÁS ENVIANDO? (CON SUGERENCIAS Y CONTADOR)
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("¿QUÉ ESTÁS ENVIANDO? *", fontSize = 11.sp, fontWeight = FontWeight.Black, color = darkText)
                                Text("${packageDescription.length}/200", fontSize = 10.sp, color = grayText)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                items(listOf("Ropa", "Documentos", "Medicamentos", "Comida", "Paquete pequeño", "Llaves")) { chip ->
                                    Surface(
                                        modifier = Modifier.clickable {
                                            packageDescription = if (packageDescription.isBlank()) chip else "$packageDescription, $chip"
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFFF1F5F9)
                                    ) {
                                        Text(chip, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = darkText, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            OutlinedTextField(
                                value = packageDescription,
                                onValueChange = { if (it.length <= 200) packageDescription = it },
                                placeholder = { Text("Descripción para el motorizado (Ej: Bolsa con documentos y llaves)") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                maxLines = 3,
                                colors = highContrastTextFieldColors(brandBlue)
                            )
                        }

                        // INSTRUCCIONES ADICIONALES
                        Text("COMENTARIOS PARA EL MOTORIZADO", fontSize = 11.sp, fontWeight = FontWeight.Black, color = darkText)
                        OutlinedTextField(
                            value = additionalNotes,
                            onValueChange = { additionalNotes = it },
                            placeholder = { Text("Ej: Llamar al llegar, tocar el timbre azul...") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            maxLines = 2,
                            colors = highContrastTextFieldColors(brandBlue)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = { showDetailsDialog = false },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = brandBlue),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 3.dp)
                    ) {
                        Text("Guardar Detalles", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }
        }
    }

    // ==========================================
    // OVERLAY MODAL 2: SELECCIONAR EN EL MAPA CON GOOGLE MAPS PIN & REVERSE GEOCODING
    // ==========================================
    if (showMapPickerDialog) {
        BackHandler { showMapPickerDialog = false }
        var markerCenter by remember {
            mutableStateOf(
                if (mapPickerTarget == "ORIGEN" && origenCacheado != null) {
                    LatLng(origenCacheado!!.latitude, origenCacheado!!.longitude)
                } else if (mapPickerTarget == "DESTINO" && destinoCacheado != null) {
                    LatLng(destinoCacheado!!.latitude, destinoCacheado!!.longitude)
                } else {
                    LatLng(12.1364, -86.2514)
                }
            )
        }
        var resolvedAddressText by remember { mutableStateOf("Buscando dirección...") }
        var isReverseGeocoding by remember { mutableStateOf(false) }
        val pickerCameraState = rememberCameraPositionState {
            position = CameraPosition.fromLatLngZoom(markerCenter, 16f)
        }

        // Reverse Geocoding reactivo al mover la cámara
        LaunchedEffect(pickerCameraState.position.target) {
            markerCenter = pickerCameraState.position.target
            isReverseGeocoding = true
            delay(400)
            val addr = reverseGeocodeCoordinates(markerCenter.latitude, markerCenter.longitude)
            resolvedAddressText = addr
            isReverseGeocoding = false
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.White)
        ) {
            // Mapa Interactivo
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = pickerCameraState,
                uiSettings = MapUiSettings(
                    zoomControlsEnabled = false,
                    myLocationButtonEnabled = false
                )
            )

            // Pin central fijo sobre el mapa
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(bottom = 36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = "Pin de ubicación",
                    tint = if (mapPickerTarget == "ORIGEN") brandRed else brandBlue,
                    modifier = Modifier.size(48.dp)
                )
            }

            // Cabecera superior flotante
            Surface(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                color = Color.White.copy(alpha = 0.96f),
                shadowElevation = 6.dp,
                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(
                                        if (mapPickerTarget == "ORIGEN") brandRed else brandBlue,
                                        CircleShape
                                    )
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (mapPickerTarget == "ORIGEN") "PUNTO DE RECOGIDA (ORIGEN X)" else "DIRECCIÓN DE ENTREGA (DESTINO Y)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = if (mapPickerTarget == "ORIGEN") brandRed else brandBlue,
                                letterSpacing = 0.5.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (isReverseGeocoding) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(12.dp),
                                    strokeWidth = 1.5.dp,
                                    color = brandBlue
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                            }
                            Text(
                                text = resolvedAddressText,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = darkText,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                    IconButton(onClick = { showMapPickerDialog = false }) {
                        Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = darkText)
                    }
                }
            }

            // Botón flotante FAB: Mi Ubicación (Derecha, encima del panel inferior)
            FloatingActionButton(
                onClick = {
                    triggerGpsRequest("MAP_PICKER") { loc, addr ->
                        val targetLatLng = LatLng(loc.latitude, loc.longitude)
                        markerCenter = targetLatLng
                        resolvedAddressText = addr
                        coroutineScope.launch {
                            pickerCameraState.animate(CameraUpdateFactory.newLatLngZoom(targetLatLng, 17f))
                        }
                    }
                },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .navigationBarsPadding()
                    .padding(end = 16.dp, bottom = 156.dp),
                containerColor = Color.White,
                contentColor = brandBlue,
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp)
            ) {
                if (isLocatingGps) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = brandBlue)
                } else {
                    Icon(Icons.Default.MyLocation, contentDescription = "Centrar en mi ubicación", modifier = Modifier.size(22.dp))
                }
            }

            // Panel inferior de acciones (siempre visible dentro del safe area por encima de la barra de navegación)
            Surface(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 16.dp),
                shape = RoundedCornerShape(18.dp),
                color = Color.White,
                shadowElevation = 8.dp,
                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Botón "Usar mi ubicación actual"
                    OutlinedButton(
                        onClick = {
                            triggerGpsRequest("MAP_PICKER") { loc, addr ->
                                val targetLatLng = LatLng(loc.latitude, loc.longitude)
                                markerCenter = targetLatLng
                                resolvedAddressText = addr
                                coroutineScope.launch {
                                    pickerCameraState.animate(CameraUpdateFactory.newLatLngZoom(targetLatLng, 17f))
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = if (mapPickerTarget == "ORIGEN") brandRed else brandBlue
                        ),
                        border = BorderStroke(
                            1.5.dp,
                            if (mapPickerTarget == "ORIGEN") brandRed else brandBlue
                        )
                    ) {
                        if (isLocatingGps) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = if (mapPickerTarget == "ORIGEN") brandRed else brandBlue
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Obteniendo GPS...", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        } else {
                            Icon(
                                Icons.Default.MyLocation,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("📍 Usar mi ubicación actual", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    // Botón principal "CONFIRMAR PUNTO"
                    Button(
                        onClick = {
                            val item = DireccionCacheada(
                                id = UUID.randomUUID().toString(),
                                searchText = resolvedAddressText.lowercase().trim(),
                                formattedAddress = resolvedAddressText,
                                latitude = markerCenter.latitude,
                                longitude = markerCenter.longitude,
                                source = LocationSelectionSource.MAP_PICKER.name
                            )
                            if (mapPickerTarget == "ORIGEN") {
                                direccionOrigenX = resolvedAddressText
                                origenCacheado = item
                                showOriginSuggestions = false
                            } else {
                                direccionDestinoY = resolvedAddressText
                                destinoCacheado = item
                                showDestSuggestions = false
                            }
                            showMapPickerDialog = false
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                            .testTag("confirmar_punto_mapa_button"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (mapPickerTarget == "ORIGEN") brandRed else brandBlue
                        ),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "CONFIRMAR ESTE PUNTO",
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = Color.White,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }
        }
    }

    // ==========================================
    // OVERLAY MODAL 3: OFRECER PRECIO PERSONALIZADO
    // ==========================================
    if (showOfferDialog) {
        BackHandler { showOfferDialog = false }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.55f))
                .clickable { showOfferDialog = false }
                .navigationBarsPadding()
                .statusBarsPadding()
                .imePadding(),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth(0.92f)
                    .clickable(enabled = false) {}
                    .padding(16.dp),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .padding(20.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text("Ofrecer Precio por el Envío", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = darkText)
                    Text(
                        text = "Cotización sugerida por el sistema: C$ ${String.format("%.2f", cotizacionCalculada)}",
                        fontSize = 12.sp,
                        color = grayText
                    )

                    OutlinedTextField(
                        value = offerInputText,
                        onValueChange = { offerInputText = it },
                        label = { Text("Tu Oferta (C$)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = highContrastTextFieldColors(brandBlue),
                        singleLine = true
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = {
                                customOfferAmount = null
                                showOfferDialog = false
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Restablecer", color = darkText, fontSize = 12.sp)
                        }

                        Button(
                            onClick = {
                                val parsed = offerInputText.toDoubleOrNull()
                                if (cotizacionCalculada <= 0.0) {
                                    Toast.makeText(context, "No se puede ofertar sin cotización válida del servidor", Toast.LENGTH_SHORT).show()
                                } else if (parsed != null && parsed >= cotizacionCalculada) {
                                    customOfferAmount = parsed
                                    showOfferDialog = false
                                } else {
                                    Toast.makeText(context, "La oferta mínima es de C$ ${String.format("%.2f", cotizacionCalculada)}", Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = brandBlue)
                        ) {
                            Text("Confirmar", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }

    // ==========================================
    // OVERLAY MODAL 4: GUARDAR DIRECCIÓN EN /users/{uid}/addresses
    // ==========================================
    if (showSaveAddressDialog && addressToSaveTarget != null) {
        BackHandler { showSaveAddressDialog = false }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.55f))
                .clickable { showSaveAddressDialog = false }
                .navigationBarsPadding()
                .statusBarsPadding()
                .imePadding(),
            contentAlignment = Alignment.Center
        ) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                modifier = Modifier
                    .fillMaxWidth(0.92f)
                    .clickable(enabled = false) {}
                    .padding(16.dp),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .padding(20.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text("Guardar Dirección", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = darkText)
                    Text(
                        text = addressToSaveTarget!!.formattedAddress,
                        fontSize = 12.sp,
                        color = grayText,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    OutlinedTextField(
                        value = addressSaveLabel,
                        onValueChange = { addressSaveLabel = it },
                        label = { Text("Nombre / Etiqueta (Ej. Casa, Trabajo, Bodega)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = highContrastTextFieldColors(brandBlue),
                        singleLine = true
                    )

                    Button(
                        onClick = {
                            if (currentUserId.isNotEmpty() && addressSaveLabel.isNotBlank()) {
                                try {
                                    val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                                    val newDoc = db.collection("users").document(currentUserId).collection("addresses").document()
                                    val addressObj = Address(
                                        id = newDoc.id,
                                        userId = currentUserId,
                                        label = addressSaveLabel.trim(),
                                        fullAddress = addressToSaveTarget!!.formattedAddress,
                                        latitude = addressToSaveTarget!!.latitude,
                                        longitude = addressToSaveTarget!!.longitude,
                                        createdAt = System.currentTimeMillis(),
                                        updatedAt = System.currentTimeMillis()
                                    )
                                    newDoc.set(addressObj)
                                    Toast.makeText(context, "Dirección guardada exitosamente", Toast.LENGTH_SHORT).show()
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error al guardar: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                            showSaveAddressDialog = false
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp),
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
}
