package com.example.presentation.customer.profile

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.Address
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

private val CorporateBlue = Color(0xFF0D47A1)
private val PrimaryBlue = Color(0xFF1D4ED8)
private val LightBlueBg = Color(0xFFEFF6FF)
private val BackgroundGray = Color(0xFFF8FAFC)
private val TextDark = Color(0xFF0F172A)
private val TextMuted = Color(0xFF64748B)

@Composable
fun highContrastTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color(0xFF0F172A),
    unfocusedTextColor = Color(0xFF0F172A),
    disabledTextColor = Color(0xFF334155),
    focusedBorderColor = PrimaryBlue,
    unfocusedBorderColor = Color(0xFF94A3B8),
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White,
    focusedLabelColor = PrimaryBlue,
    unfocusedLabelColor = Color(0xFF475569),
    focusedPlaceholderColor = Color(0xFF94A3B8),
    unfocusedPlaceholderColor = Color(0xFF94A3B8)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressManagerScreen(
    onBackClick: () -> Unit,
    onNavigateToLogin: (() -> Unit)? = null,
    viewModel: ProfileViewModel = viewModel()
) {
    val addresses by viewModel.addresses.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val context = LocalContext.current
    val authUser = remember { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser }
    var showAddDialog by remember { mutableStateOf(false) }
    var addressToEdit by remember { mutableStateOf<Address?>(null) }
    var addressToDelete by remember { mutableStateOf<Address?>(null) }

    Scaffold(
        topBar = {
            Surface(
                color = CorporateBlue,
                shadowElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 4.dp, vertical = 8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        IconButton(onClick = onBackClick) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Volver",
                                tint = Color.White
                            )
                        }
                        Spacer(modifier = Modifier.width(4.dp))
                        Column {
                            Text(
                                text = "Mis Direcciones",
                                fontWeight = FontWeight.Black,
                                fontSize = 20.sp,
                                color = Color.White
                            )
                            Text(
                                text = "Gestiona tus lugares de entrega",
                                fontSize = 12.sp,
                                color = Color.White.copy(alpha = 0.85f)
                            )
                        }
                    }
                }
            }
        },
        floatingActionButton = {
            if (authUser != null) {
                ExtendedFloatingActionButton(
                    onClick = {
                        addressToEdit = null
                        showAddDialog = true
                    },
                    containerColor = PrimaryBlue,
                    contentColor = Color.White,
                    icon = { Icon(Icons.Default.Add, contentDescription = null) },
                    text = { Text("Nueva Dirección", fontWeight = FontWeight.Bold) }
                )
            }
        }
    ) { paddingValues ->
        if (authUser == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(BackgroundGray)
                    .padding(paddingValues)
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .background(LightBlueBg, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = null,
                                modifier = Modifier.size(36.dp),
                                tint = PrimaryBlue
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Inicia sesión para ver tus direcciones",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = TextDark,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Estás navegando como invitado. Inicia sesión con tu cuenta para ver tus direcciones guardadas y registrar nuevas.",
                            fontSize = 13.sp,
                            color = TextMuted,
                            modifier = Modifier.padding(horizontal = 16.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = { onNavigateToLogin?.invoke() ?: onBackClick() },
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
                        ) {
                            Icon(Icons.Default.Login, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Iniciar Sesión", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = PrimaryBlue)
            }
        } else if (addresses.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(BackgroundGray)
                    .padding(paddingValues)
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .background(LightBlueBg, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = null,
                                modifier = Modifier.size(36.dp),
                                tint = PrimaryBlue
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "No tienes direcciones guardadas",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = TextDark
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Guarda tus lugares frecuentes para pedir más rápido y sin complicaciones.",
                            fontSize = 13.sp,
                            color = TextMuted,
                            modifier = Modifier.padding(horizontal = 16.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(
                            onClick = {
                                addressToEdit = null
                                showAddDialog = true
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Agregar mi primera dirección", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(BackgroundGray)
                    .padding(paddingValues)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(addresses) { address ->
                    AddressCard(
                        address = address,
                        onSetDefault = { viewModel.setDefaultAddress(address.id) },
                        onEdit = {
                            addressToEdit = address
                            showAddDialog = true
                        },
                        onDelete = { addressToDelete = address }
                    )
                }
                item {
                    Spacer(modifier = Modifier.height(72.dp))
                }
            }
        }
    }

    if (showAddDialog) {
        AddressLocationEditorDialog(
            address = addressToEdit,
            onDismiss = { showAddDialog = false },
            onSave = { newAddress ->
                viewModel.saveAddress(newAddress)
                showAddDialog = false
                android.widget.Toast.makeText(context, "Dirección guardada", android.widget.Toast.LENGTH_SHORT).show()
            }
        )
    }

    if (addressToDelete != null) {
        val target = addressToDelete!!
        AlertDialog(
            onDismissRequest = { addressToDelete = null },
            title = { Text("¿Eliminar esta dirección?", fontWeight = FontWeight.Bold, color = TextDark) },
            text = {
                Column {
                    Text("Estás a punto de eliminar la dirección \"${target.label}\" (${target.fullAddress}).", color = TextDark)
                    if (target.isDefault) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "⚠️ Esta es tu dirección predeterminada. Al eliminarla, otra dirección se establecerá como predeterminada automáticamente.",
                            color = Color(0xFFD97706),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteAddress(target.id)
                        addressToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Eliminar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { addressToDelete = null }) {
                    Text("Cancelar", color = TextMuted)
                }
            }
        )
    }
}

@Composable
fun AddressCard(
    address: Address,
    onSetDefault: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val isDefault = address.isDefault
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.White
        ),
        border = BorderStroke(
            width = if (isDefault) 2.dp else 1.dp,
            color = if (isDefault) PrimaryBlue else Color(0xFFE2E8F0)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isDefault) 3.dp else 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val iconVector = when (address.label.lowercase().trim()) {
                        "casa", "home" -> Icons.Default.Home
                        "trabajo", "work", "oficina" -> Icons.Default.Work
                        else -> Icons.Default.LocationOn
                    }
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(if (isDefault) LightBlueBg else Color(0xFFF1F5F9), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = iconVector,
                            contentDescription = null,
                            tint = if (isDefault) PrimaryBlue else TextMuted,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = address.label,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = TextDark
                        )
                    }
                }

                if (isDefault) {
                    Surface(
                        color = Color(0xFF10B981),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("✓ PREDETERMINADA", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Black)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = address.fullAddress.ifBlank { "Sin dirección formateada" },
                fontSize = 14.sp,
                color = TextDark,
                fontWeight = FontWeight.Medium
            )

            if (address.latitude != 0.0 || address.longitude != 0.0) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Place, contentDescription = null, tint = PrimaryBlue, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "📍 ${String.format(Locale.US, "%.6f", address.latitude)}, ${String.format(Locale.US, "%.6f", address.longitude)}",
                        fontSize = 12.sp,
                        color = PrimaryBlue,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            val instructions = address.getEffectiveInstructions()
            if (instructions.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    color = Color(0xFFF1F5F9),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = TextMuted, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "\"$instructions\"",
                            fontSize = 12.sp,
                            color = TextDark,
                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = Color(0xFFF1F5F9))
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (!isDefault) {
                    TextButton(
                        onClick = onSetDefault,
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = PrimaryBlue, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Marcar como predeterminada",
                            color = PrimaryBlue,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    TextButton(onClick = onEdit) {
                        Icon(Icons.Default.Edit, contentDescription = "Editar", tint = TextMuted, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Editar", color = TextMuted, fontSize = 13.sp)
                    }
                    TextButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Eliminar", color = Color(0xFFEF4444), fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressLocationEditorDialog(
    address: Address?,
    onDismiss: () -> Unit,
    onSave: (Address) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var labelInput by remember { mutableStateOf(address?.label ?: "Casa") }
    var fullAddressInput by remember { mutableStateOf(address?.fullAddress ?: "") }
    var instructionsInput by remember { mutableStateOf(address?.getEffectiveInstructions() ?: "") }
    var isDefaultInput by remember { mutableStateOf(address?.isDefault ?: false) }

    var selectedLat by remember { mutableDoubleStateOf(if (address != null && address.latitude != 0.0) address.latitude else 12.136389) }
    var selectedLng by remember { mutableDoubleStateOf(if (address != null && address.longitude != 0.0) address.longitude else -86.251389) }

    var searchText by remember { mutableStateOf("") }
    var isSearching by remember { mutableStateOf(false) }
    var isLocatingGps by remember { mutableStateOf(false) }
    var locationError by remember { mutableStateOf<String?>(null) }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(LatLng(selectedLat, selectedLng), 16f)
    }

    suspend fun reverseGeocode(lat: Double, lng: Double) {
        withContext(Dispatchers.IO) {
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                val results = geocoder.getFromLocation(lat, lng, 1)
                if (!results.isNullOrEmpty()) {
                    val addr = results[0]
                    val formatted = addr.getAddressLine(0) ?: "$lat, $lng"
                    withContext(Dispatchers.Main) {
                        fullAddressInput = formatted
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        if (fullAddressInput.isBlank()) {
                            fullAddressInput = "Ubicación en mapa (${String.format(Locale.US, "%.5f", lat)}, ${String.format(Locale.US, "%.5f", lng)})"
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("GEOCODER", "Reverse geocode error", e)
                withContext(Dispatchers.Main) {
                    if (fullAddressInput.isBlank()) {
                        fullAddressInput = "Ubicación en mapa (${String.format(Locale.US, "%.5f", lat)}, ${String.format(Locale.US, "%.5f", lng)})"
                    }
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        if (fullAddressInput.isBlank()) {
            reverseGeocode(selectedLat, selectedLng)
        }
    }

    val executeSave = {
        val finalLabel = labelInput.trim().ifBlank { "Casa" }
        val finalFullAddress = fullAddressInput.trim().ifBlank {
            "Ubicación en mapa (${String.format(Locale.US, "%.5f", selectedLat)}, ${String.format(Locale.US, "%.5f", selectedLng)})"
        }
        onSave(
            Address(
                id = address?.id ?: "",
                userId = address?.userId ?: "",
                label = finalLabel,
                fullAddress = finalFullAddress,
                instructions = instructionsInput.trim(),
                deliveryInstructions = instructionsInput.trim(),
                isDefault = isDefaultInput,
                latitude = selectedLat,
                longitude = selectedLng,
                createdAt = address?.createdAt ?: 0L,
                updatedAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun searchPlace(query: String) {
        if (query.isBlank()) return
        isSearching = true
        locationError = null
        withContext(Dispatchers.IO) {
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                val searchFormatted = if (query.lowercase().contains("managua") || query.lowercase().contains("nicaragua")) query else "$query, Managua, Nicaragua"
                val results = geocoder.getFromLocationName(searchFormatted, 1)
                if (!results.isNullOrEmpty()) {
                    val place = results[0]
                    val lat = place.latitude
                    val lng = place.longitude
                    val formatted = place.getAddressLine(0) ?: query
                    withContext(Dispatchers.Main) {
                        selectedLat = lat
                        selectedLng = lng
                        fullAddressInput = formatted
                        cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 16f))
                        isSearching = false
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        locationError = "No se encontraron resultados para '$query'"
                        isSearching = false
                    }
                }
            } catch (e: Exception) {
                Log.e("GEOCODER", "Search place error", e)
                withContext(Dispatchers.Main) {
                    locationError = "Error al buscar la ubicación. Intenta nuevamente."
                    isSearching = false
                }
            }
        }
    }

    fun requestGpsLocation() {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) {
            locationError = "Se requiere permiso de GPS para obtener tu ubicación actual."
            return
        }

        isLocatingGps = true
        locationError = null
        try {
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
            fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
                if (loc != null) {
                    selectedLat = loc.latitude
                    selectedLng = loc.longitude
                    coroutineScope.launch {
                        cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(loc.latitude, loc.longitude), 17f))
                        reverseGeocode(loc.latitude, loc.longitude)
                        isLocatingGps = false
                    }
                } else {
                    isLocatingGps = false
                    locationError = "No se pudo obtener la ubicación GPS actual. Activa el GPS o selecciona en el mapa."
                }
            }.addOnFailureListener { e ->
                isLocatingGps = false
                locationError = "Error al obtener GPS: ${e.message}"
            }
        } catch (e: Exception) {
            isLocatingGps = false
            locationError = "Excepción GPS: ${e.message}"
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            requestGpsLocation()
        } else {
            locationError = "Para utilizar tu ubicación actual necesitamos permiso de ubicación."
        }
    }

    LaunchedEffect(cameraPositionState.isMoving) {
        if (!cameraPositionState.isMoving) {
            val target = cameraPositionState.position.target
            if (target.latitude != 0.0 && target.longitude != 0.0) {
                selectedLat = target.latitude
                selectedLng = target.longitude
                reverseGeocode(target.latitude, target.longitude)
            }
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding(),
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            color = Color.White
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Header Fijo con botón Guardar directo en la cabecera
                Surface(
                    color = CorporateBlue,
                    shadowElevation = 4.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (address == null) "Nueva dirección" else "Editar dirección",
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp,
                                color = Color.White
                            )
                            Text(
                                text = "Guarda una ubicación para tus pedidos",
                                fontSize = 12.sp,
                                color = Color.White.copy(alpha = 0.85f)
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Button(
                                onClick = executeSave,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF10B981),
                                    contentColor = Color.White
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Guardar", fontWeight = FontWeight.Black, fontSize = 13.sp)
                            }

                            IconButton(onClick = onDismiss) {
                                Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color.White)
                            }
                        }
                    }
                }

                // Cuerpo Scrollable — CON LOS BOTONES DENTRO DEL SCROLL PARA VISIBILIDAD GARANTIZADA
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Etiqueta
                    Column {
                        Text("Etiqueta (Obligatorio)", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextDark)
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            listOf("Casa", "Trabajo", "Oficina", "Otra").forEach { tag ->
                                val isSelected = labelInput.lowercase().trim() == tag.lowercase()
                                FilterChip(
                                    selected = isSelected,
                                    onClick = { labelInput = tag },
                                    label = { Text(tag, fontWeight = FontWeight.Bold) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = PrimaryBlue,
                                        selectedLabelColor = Color.White,
                                        containerColor = Color(0xFFF1F5F9),
                                        labelColor = TextDark
                                    )
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = labelInput,
                            onValueChange = { labelInput = it },
                            placeholder = { Text("Ej. Casa, Trabajo, Casa de mamá", color = Color(0xFF94A3B8)) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            isError = labelInput.isBlank(),
                            shape = RoundedCornerShape(10.dp),
                            colors = highContrastTextFieldColors(),
                            textStyle = TextStyle(color = TextDark, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        )
                    }

                    // Buscador Google Maps
                    Column {
                        Text("Buscar una dirección", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextDark)
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = searchText,
                                onValueChange = { searchText = it },
                                placeholder = { Text("Escribe una dirección o lugar...", color = Color(0xFF94A3B8)) },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = PrimaryBlue) },
                                singleLine = true,
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                colors = highContrastTextFieldColors(),
                                textStyle = TextStyle(color = TextDark, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            )
                            Button(
                                onClick = {
                                    coroutineScope.launch {
                                        searchPlace(searchText)
                                    }
                                },
                                enabled = searchText.isNotBlank() && !isSearching,
                                colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue, contentColor = Color.White),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp)
                            ) {
                                if (isSearching) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                } else {
                                    Text("Buscar", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }

                    // Banner de error si existe
                    if (locationError != null) {
                        Surface(
                            color = Color(0xFFFEF2F2),
                            shape = RoundedCornerShape(10.dp),
                            border = BorderStroke(1.dp, Color(0xFFFCA5A5))
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(locationError!!, color = Color(0xFF991B1B), fontSize = 12.sp, modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                                IconButton(onClick = { locationError = null }, modifier = Modifier.size(24.dp)) {
                                    Icon(Icons.Default.Close, contentDescription = null, tint = Color(0xFF991B1B), modifier = Modifier.size(14.dp))
                                }
                            }
                        }
                    }

                    // Botón Usar mi ubicación actual
                    OutlinedButton(
                        onClick = {
                            val hasPermission = ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.ACCESS_FINE_LOCATION
                            ) == PackageManager.PERMISSION_GRANTED
                            if (hasPermission) {
                                requestGpsLocation()
                            } else {
                                permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = PrimaryBlue),
                        border = BorderStroke(1.5.dp, PrimaryBlue)
                    ) {
                        if (isLocatingGps) {
                            CircularProgressIndicator(color = PrimaryBlue, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Obteniendo GPS...", fontWeight = FontWeight.Bold)
                        } else {
                            Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(18.dp), tint = PrimaryBlue)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("📍 Usar mi ubicación actual", fontWeight = FontWeight.Bold, color = PrimaryBlue)
                        }
                    }

                    // Mapa Interactivo con Marcador Central
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Ubica el pin en el punto exacto", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextDark)
                            Text("Arrastra el mapa 📍", fontSize = 11.sp, color = PrimaryBlue, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(6.dp))

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .border(1.5.dp, PrimaryBlue, RoundedCornerShape(14.dp))
                        ) {
                            GoogleMap(
                                modifier = Modifier.fillMaxSize(),
                                cameraPositionState = cameraPositionState,
                                uiSettings = MapUiSettings(
                                    zoomControlsEnabled = true,
                                    myLocationButtonEnabled = false
                                )
                            )

                            // Marcador Central Fijo 📍
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = "Ubicación seleccionada",
                                tint = Color(0xFFEF4444),
                                modifier = Modifier
                                    .size(44.dp)
                                    .align(Alignment.Center)
                                    .padding(bottom = 20.dp)
                            )
                        }
                    }

                    // Cuadro de Dirección Seleccionada & Coordenadas
                    Surface(
                        color = LightBlueBg,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Color(0xFFBFDBFE))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp)
                        ) {
                            Text("Dirección seleccionada:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryBlue)
                            Spacer(modifier = Modifier.height(4.dp))
                            OutlinedTextField(
                                value = fullAddressInput,
                                onValueChange = { fullAddressInput = it },
                                placeholder = { Text("Dirección legible de entrega...", color = Color(0xFF94A3B8)) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                maxLines = 3,
                                colors = highContrastTextFieldColors(),
                                textStyle = TextStyle(color = TextDark, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Place, contentDescription = null, tint = PrimaryBlue, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Coordenadas: ${String.format(Locale.US, "%.6f", selectedLat)}, ${String.format(Locale.US, "%.6f", selectedLng)}",
                                    fontSize = 11.sp,
                                    color = PrimaryBlue,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    // Instrucciones de Entrega
                    Column {
                        Text("Instrucciones de entrega (Opcional)", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextDark)
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = instructionsInput,
                            onValueChange = { instructionsInput = it },
                            placeholder = { Text("Ej. Frente al parque, casa azul con portón negro", color = Color(0xFF94A3B8)) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            maxLines = 2,
                            colors = highContrastTextFieldColors(),
                            textStyle = TextStyle(color = TextDark, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                        )
                    }

                    // Predeterminada Checkbox
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { isDefaultInput = !isDefaultInput }
                    ) {
                        Checkbox(
                            checked = isDefaultInput,
                            onCheckedChange = { isDefaultInput = it },
                            colors = CheckboxDefaults.colors(checkedColor = PrimaryBlue)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Marcar como predeterminada", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextDark)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // 🎯 BOTÓN DE GUARDAR DIRECCIÓN — DENTRO DEL SCROLL PARA GARANTIZAR VISIBILIDAD 100%
                    Button(
                        onClick = executeSave,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PrimaryBlue,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(14.dp),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("GUARDAR DIRECCIÓN", fontWeight = FontWeight.Black, color = Color.White, fontSize = 15.sp)
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.5.dp, Color(0xFFCBD5E1))
                    ) {
                        Text("Cancelar", color = TextMuted, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}
