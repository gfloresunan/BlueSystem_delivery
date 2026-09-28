package com.example.presentation.customer.cart

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.Address
import com.example.data.CartItem
import com.example.data.repository.BusinessInfo
import com.example.ui.theme.BluePrimary
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

@Composable
fun CartCheckoutDialog(
    showCartDialog: Boolean,
    cartModalStep: Int,
    cartItems: List<CartItem>,
    subtotal: Double,
    publicBusinesses: List<BusinessInfo>,
    userAddresses: List<Address>,
    defaultAddressDoc: Address?,
    isPlacingOrder: Boolean,
    isGuest: Boolean,
    additionalChargeAmount: Double = 0.0,
    additionalChargeDescription: String = "Cargo adicional por servicio",
    additionalChargePolicyId: String = "global_delivery_charge",
    additionalChargePolicyVersion: Int = 1,
    couponCodeInput: String,
    appliedCouponDiscount: Double,
    appliedCouponCode: String?,
    couponValidationMessage: String?,
    isValidatingCoupon: Boolean,
    onDismiss: () -> Unit,
    onStepChange: (Int) -> Unit,
    onIncrementQuantity: (String) -> Unit,
    onDecrementQuantity: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
    onClearCart: () -> Unit,
    onApplyCoupon: (String) -> Unit,
    onCouponCodeChange: (String) -> Unit,
    onProceedToCheckout: (Double, Int) -> Unit,
    onConfirmOrder: (
        effectiveAddress: String,
        deliveryFee: Double,
        paymentMethod: String,
        addressId: String?,
        latitude: Double,
        longitude: Double,
        fullAddress: String,
        instructions: String,
        tipAmount: Double,
        tipSelectionType: String,
        additionalChargeAmount: Double,
        additionalChargePolicyId: String,
        additionalChargePolicyVersion: Int,
        deliveryNote: String
    ) -> Unit,
    onGuestRedirectToAuth: () -> Unit,
    onInvalidAddressWarning: () -> Unit
) {
    if (!showCartDialog) return

    val groupedByBiz = remember(cartItems) {
        cartItems.groupBy { if (it.businessId.isNotBlank()) it.businessId else "general" }
    }

    // Calcular costo de envío por comercio en el carrito (Modelo B)
    val bizDeliveryFees = remember(groupedByBiz, publicBusinesses) {
        groupedByBiz.keys.associateWith { bizId ->
            val bInfo = publicBusinesses.find { it.id == bizId }
            bInfo?.getEffectiveDeliveryFee() ?: 45.0
        }
    }
    val totalDeliveryFees = bizDeliveryFees.values.sum()

    // Estados de Propina al Repartidor (100% voluntaria)
    var tipAmount by remember { mutableStateOf(0.0) }
    var tipSelectionType by remember { mutableStateOf("NONE") }
    var customTipInput by remember { mutableStateOf("") }

    // Estado de Nota de Entrega
    var deliveryNoteText by remember { mutableStateOf("") }

    // Cálculo Canónico Soberano:
    // total = max(0.0, subtotal - discount + deliveryFee + additionalCharge + tip)
    val baseGrandTotal = subtotal + totalDeliveryFees + additionalChargeAmount + tipAmount
    val grandTotal = (baseGrandTotal - appliedCouponDiscount).coerceAtLeast(0.0)

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var selectedSavedAddressId by remember { mutableStateOf<String?>(null) }
    var customAddressText by remember { mutableStateOf("") }
    var isCustomAddressSelected by remember { mutableStateOf(false) }
    var selectedPaymentMethod by remember { mutableStateOf("efectivo") }

    var customLatitude by remember { mutableDoubleStateOf(0.0) }
    var customLongitude by remember { mutableDoubleStateOf(0.0) }
    var isResolvingCoordinates by remember { mutableStateOf(false) }

    fun requestCurrentGpsLocation() {
        isResolvingCoordinates = true
        try {
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            ) {
                fusedLocationClient.lastLocation.addOnSuccessListener { loc ->
                    if (loc != null) {
                        customLatitude = loc.latitude
                        customLongitude = loc.longitude
                        coroutineScope.launch {
                            withContext(Dispatchers.IO) {
                                try {
                                    val geocoder = Geocoder(context, Locale.getDefault())
                                    val res = geocoder.getFromLocation(loc.latitude, loc.longitude, 1)
                                    if (!res.isNullOrEmpty()) {
                                        val addrLine = res[0].getAddressLine(0)
                                        if (!addrLine.isNullOrBlank()) {
                                            withContext(Dispatchers.Main) {
                                                customAddressText = addrLine
                                            }
                                        }
                                    }
                                } catch (_: Exception) {}
                            }
                            isResolvingCoordinates = false
                        }
                    } else {
                        isResolvingCoordinates = false
                        Toast.makeText(context, "No se pudo obtener la posición GPS actual.", Toast.LENGTH_SHORT).show()
                    }
                }.addOnFailureListener {
                    isResolvingCoordinates = false
                    Toast.makeText(context, "Error al obtener GPS.", Toast.LENGTH_SHORT).show()
                }
            } else {
                isResolvingCoordinates = false
            }
        } catch (e: Exception) {
            isResolvingCoordinates = false
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions.getOrDefault(Manifest.permission.ACCESS_FINE_LOCATION, false) ||
                permissions.getOrDefault(Manifest.permission.ACCESS_COARSE_LOCATION, false)
        if (granted) {
            requestCurrentGpsLocation()
        } else {
            Toast.makeText(context, "Permiso de ubicación denegado para usar el GPS.", Toast.LENGTH_SHORT).show()
        }
    }

    // Geocodificación automática reactiva cuando el usuario escribe en customAddressText
    LaunchedEffect(customAddressText, isCustomAddressSelected) {
        if (isCustomAddressSelected && customAddressText.trim().length >= 6) {
            delay(800)
            try {
                isResolvingCoordinates = true
                withContext(Dispatchers.IO) {
                    val geocoder = Geocoder(context, Locale.getDefault())
                    val query = if (!customAddressText.contains("Nicaragua", ignoreCase = true)) {
                        "${customAddressText.trim()}, Managua, Nicaragua"
                    } else {
                        customAddressText.trim()
                    }
                    val results = geocoder.getFromLocationName(query, 1)
                    if (!results.isNullOrEmpty()) {
                        val found = results[0]
                        withContext(Dispatchers.Main) {
                            customLatitude = found.latitude
                            customLongitude = found.longitude
                        }
                    }
                }
            } catch (_: Exception) {
            } finally {
                isResolvingCoordinates = false
            }
        }
    }

    // Inicializar dirección guardada seleccionada al abrir
    LaunchedEffect(showCartDialog, userAddresses, defaultAddressDoc) {
        if (selectedSavedAddressId == null && userAddresses.isNotEmpty()) {
            val def = defaultAddressDoc ?: userAddresses.firstOrNull()
            selectedSavedAddressId = def?.id
        } else if (userAddresses.isEmpty()) {
            isCustomAddressSelected = true
        }
    }

    AlertDialog(
        onDismissRequest = {
            if (!isPlacingOrder) {
                onDismiss()
            }
        },
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (cartModalStep == 1) Icons.Default.ShoppingCart else Icons.Default.ReceiptLong,
                        contentDescription = null,
                        tint = BluePrimary,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (cartModalStep == 1) "Mi Carrito" else "Finalizar Pedido",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
                if (cartItems.isNotEmpty()) {
                    Text(
                        text = "Paso $cartModalStep de 2",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF475569)
                    )
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 440.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (cartModalStep == 1) {
                    CartItemsStepContent(
                        cartItems = cartItems,
                        groupedByBiz = groupedByBiz,
                        bizDeliveryFees = bizDeliveryFees,
                        publicBusinesses = publicBusinesses,
                        subtotal = subtotal,
                        totalDeliveryFees = totalDeliveryFees,
                        additionalChargeAmount = additionalChargeAmount,
                        additionalChargeDescription = additionalChargeDescription,
                        tipAmount = tipAmount,
                        tipSelectionType = tipSelectionType,
                        customTipInput = customTipInput,
                        onTipPresetSelected = { amount, type ->
                            tipAmount = amount
                            tipSelectionType = type
                        },
                        onCustomTipChange = { input ->
                            customTipInput = input
                            tipAmount = input.toDoubleOrNull() ?: 0.0
                            tipSelectionType = "CUSTOM"
                        },
                        appliedCouponDiscount = appliedCouponDiscount,
                        appliedCouponCode = appliedCouponCode,
                        grandTotal = grandTotal,
                        couponCodeInput = couponCodeInput,
                        onCouponCodeChange = onCouponCodeChange,
                        isValidatingCoupon = isValidatingCoupon,
                        couponValidationMessage = couponValidationMessage,
                        onApplyCoupon = onApplyCoupon,
                        onIncrementQuantity = onIncrementQuantity,
                        onDecrementQuantity = onDecrementQuantity,
                        onRemoveItem = onRemoveItem
                    )
                } else {
                    CheckoutStepContent(
                        userAddresses = userAddresses,
                        selectedSavedAddressId = selectedSavedAddressId,
                        onSelectSavedAddress = { id ->
                            selectedSavedAddressId = id
                            isCustomAddressSelected = false
                        },
                        isCustomAddressSelected = isCustomAddressSelected,
                        onSelectCustomAddress = {
                            isCustomAddressSelected = true
                            selectedSavedAddressId = "custom"
                        },
                        customAddressText = customAddressText,
                        onCustomAddressChange = { customAddressText = it },
                        customLatitude = customLatitude,
                        customLongitude = customLongitude,
                        isResolvingCoordinates = isResolvingCoordinates,
                        onTriggerGps = {
                            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                                ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                            ) {
                                requestCurrentGpsLocation()
                            } else {
                                locationPermissionLauncher.launch(
                                    arrayOf(
                                        Manifest.permission.ACCESS_FINE_LOCATION,
                                        Manifest.permission.ACCESS_COARSE_LOCATION
                                    )
                                )
                            }
                        },
                        deliveryNoteText = deliveryNoteText,
                        onDeliveryNoteChange = { deliveryNoteText = it },
                        selectedPaymentMethod = selectedPaymentMethod,
                        onSelectPaymentMethod = { selectedPaymentMethod = it },
                        groupedBizCount = groupedByBiz.size,
                        subtotal = subtotal,
                        totalDeliveryFees = totalDeliveryFees,
                        additionalChargeAmount = additionalChargeAmount,
                        tipAmount = tipAmount,
                        discountAmount = appliedCouponDiscount,
                        grandTotal = grandTotal
                    )
                }
            }
        },
        confirmButton = {
            if (cartItems.isNotEmpty()) {
                if (cartModalStep == 1) {
                    Button(
                        onClick = {
                            onProceedToCheckout(grandTotal, cartItems.sumOf { it.quantity })
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BluePrimary, contentColor = Color.White)
                    ) {
                        Text("Continuar al Checkout →", fontWeight = FontWeight.Black, color = Color.White)
                    }
                } else {
                    val selAddress = if (!isCustomAddressSelected && userAddresses.isNotEmpty()) {
                        userAddresses.find { it.id == selectedSavedAddressId }
                    } else null

                    val effectiveAddressToSubmit = if (selAddress != null) {
                        "${selAddress.label}: ${selAddress.fullAddress}"
                    } else {
                        customAddressText
                    }

                    val isAddressValid = effectiveAddressToSubmit.isNotBlank() && effectiveAddressToSubmit != "Seleccionar dirección 📍"

                    val resolvedLat = if (selAddress != null && selAddress.latitude != 0.0) {
                        selAddress.latitude
                    } else if (customLatitude != 0.0) {
                        customLatitude
                    } else {
                        0.0
                    }

                    val resolvedLng = if (selAddress != null && selAddress.longitude != 0.0) {
                        selAddress.longitude
                    } else if (customLongitude != 0.0) {
                        customLongitude
                    } else {
                        0.0
                    }

                    val hasValidCoordinates = resolvedLat != 0.0 && resolvedLng != 0.0 && !resolvedLat.isNaN() && !resolvedLng.isNaN()

                    Button(
                        onClick = {
                            if (isGuest) {
                                onGuestRedirectToAuth()
                                return@Button
                            }
                            if (!isAddressValid) {
                                onInvalidAddressWarning()
                                return@Button
                            }
                            if (!hasValidCoordinates) {
                                Toast.makeText(
                                    context,
                                    "⚠️ Ubicación no confirmada. Presiona 'Usar mi GPS' o ingresa una dirección identificable para calcular la entrega.",
                                    Toast.LENGTH_LONG
                                ).show()
                                return@Button
                            }

                            onConfirmOrder(
                                effectiveAddressToSubmit,
                                totalDeliveryFees,
                                selectedPaymentMethod,
                                selAddress?.id,
                                resolvedLat,
                                resolvedLng,
                                selAddress?.fullAddress ?: effectiveAddressToSubmit,
                                selAddress?.getEffectiveInstructions() ?: "",
                                tipAmount,
                                tipSelectionType,
                                additionalChargeAmount,
                                additionalChargePolicyId,
                                additionalChargePolicyVersion,
                                deliveryNoteText
                            )
                        },
                        enabled = !isPlacingOrder && isAddressValid,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        )
                    ) {
                        if (isPlacingOrder) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Text("CONFIRMAR PEDIDO 🚀", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color.White)
                        }
                    }
                }
            }
        },
        dismissButton = {
            if (cartItems.isNotEmpty()) {
                if (cartModalStep == 2) {
                    TextButton(onClick = { onStepChange(1) }) {
                        Text("← Volver al Carrito", color = BluePrimary)
                    }
                } else {
                    TextButton(onClick = {
                        onClearCart()
                        onDismiss()
                    }) {
                        Text("Vaciar", color = Color.Red)
                    }
                }
            } else {
                TextButton(onClick = onDismiss) {
                    Text("Cerrar")
                }
            }
        },
        shape = RoundedCornerShape(20.dp),
        containerColor = MaterialTheme.colorScheme.surface
    )
}
