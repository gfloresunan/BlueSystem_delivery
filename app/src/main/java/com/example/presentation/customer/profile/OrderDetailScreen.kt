package com.example.presentation.customer.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.Pedido
import com.example.toPedidoSafely
import com.example.ui.theme.OrderStatusTheme
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.maps.android.compose.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    orderId: String,
    onBackClick: () -> Unit,
    onNavigateToChat: (String) -> Unit = {},
    viewModel: OrdersViewModel = viewModel()
) {
    val orders by viewModel.orders.collectAsState()
    var directOrder by remember { mutableStateOf<Pedido?>(null) }
    var isLoadingDirect by remember { mutableStateOf(true) }
    var showRatingDialog by remember { mutableStateOf(false) }
    var ratingDialogInitialTab by remember { mutableStateOf(0) }
    var isSubmittingRating by remember { mutableStateOf(false) }
    var tripSnapshot by remember { mutableStateOf<com.google.firebase.firestore.DocumentSnapshot?>(null) }
    var isCancellingTrip by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    DisposableEffect(orderId) {
        val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
        val listener = db.collection("deliveryTrips").document(orderId)
            .addSnapshotListener { snap, _ ->
                tripSnapshot = snap
            }
        onDispose { listener.remove() }
    }

    LaunchedEffect(orderId, orders) {
        val found = orders.find { it.pedidoId == orderId }
        if (found != null) {
            directOrder = found
            isLoadingDirect = false
        } else {
            try {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                db.collection("orders").document(orderId).get().addOnSuccessListener { doc ->
                    if (doc != null && doc.exists()) {
                        directOrder = doc.toPedidoSafely()
                        isLoadingDirect = false
                    } else {
                        db.collection("deliveryTrips").document(orderId).get().addOnSuccessListener { tripDoc ->
                            if (tripDoc != null && tripDoc.exists()) {
                                directOrder = tripDoc.toPedidoSafely()
                                isLoadingDirect = false
                            } else {
                                isLoadingDirect = false
                            }
                        }.addOnFailureListener {
                            isLoadingDirect = false
                        }
                    }
                }.addOnFailureListener {
                    isLoadingDirect = false
                }
            } catch (e: Exception) {
                isLoadingDirect = false
            }
        }
    }

    val order = directOrder

    var isRestaurant by remember { mutableStateOf(false) }

    LaunchedEffect(order?.businessId) {
        val bId = order?.businessId ?: ""
        if (bId.isNotEmpty()) {
            try {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                db.collection("businesses").document(bId).get().addOnSuccessListener { bDoc ->
                    if (bDoc != null && bDoc.exists()) {
                        val isRestVal = bDoc.getBoolean("isRestaurant")
                        if (isRestVal != null) {
                            isRestaurant = isRestVal
                        } else {
                            val cat = bDoc.getString("category") ?: bDoc.getString("categoria") ?: bDoc.getString("businessCategory") ?: ""
                            val bType = bDoc.getString("businessType") ?: ""
                            isRestaurant = OrderPresentationResolver.isGastronomyCategory(cat, bType)
                        }
                    } else {
                        db.collection("users").document(bId).get().addOnSuccessListener { uDoc ->
                            if (uDoc != null && uDoc.exists()) {
                                val isRestVal = uDoc.getBoolean("isRestaurant")
                                if (isRestVal != null) {
                                    isRestaurant = isRestVal
                                } else {
                                    val cat = uDoc.getString("category") ?: uDoc.getString("categoria") ?: uDoc.getString("businessCategory") ?: ""
                                    val bType = uDoc.getString("businessType") ?: ""
                                    isRestaurant = OrderPresentationResolver.isGastronomyCategory(cat, bType)
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Fallback seguro: isRestaurant = false
            }
        }
    }

    var showCancelConfirmDialog by remember { mutableStateOf(false) }

    val currentUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
    var favoriteProductIds by remember { mutableStateOf(setOf<String>()) }

    DisposableEffect(currentUid) {
        if (currentUid.isNullOrBlank()) {
            onDispose { }
        } else {
            val listener = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                .collection("users")
                .document(currentUid)
                .collection("favorites")
                .whereEqualTo("type", "product")
                .addSnapshotListener { snap, _ ->
                    if (snap != null) {
                        val ids = snap.documents.mapNotNull { it.getString("productId") }.toSet()
                        favoriteProductIds = ids
                    }
                }
            onDispose { listener.remove() }
        }
    }

    fun toggleProductFavorite(item: OrderItem, bId: String, bName: String) {
        val uid = currentUid ?: return
        val prodId = if (item.productId.isNotBlank()) item.productId else item.name.trim().lowercase().replace(" ", "_")
        val isFav = favoriteProductIds.contains(prodId)
        val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
        val docRef = db.collection("users").document(uid).collection("favorites").document("prod_$prodId")

        if (isFav) {
            docRef.delete()
        } else {
            val data = hashMapOf(
                "id" to prodId,
                "productId" to prodId,
                "businessId" to bId,
                "businessName" to bName,
                "name" to item.name,
                "price" to item.price,
                "imageUrl" to "",
                "type" to "product",
                "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
            )
            docRef.set(data)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalle de Pedido", fontWeight = FontWeight.Black, fontSize = 20.sp, color = MaterialTheme.colorScheme.onSurface) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = MaterialTheme.colorScheme.onSurface)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { paddingValues ->
        if (order == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                if (isLoadingDirect) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                } else {
                    Text("Pedido no encontrado", color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                }
            }
        } else {
            val isXToY = (tripSnapshot?.exists() == true) || order.serviceType == "X_TO_Y_DELIVERY" || order.businessId.isBlank() || order.businessName == "Punto de Recogida X" || order.items.isEmpty()
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header (Status Normalizado en Español)
                item {
                    OrderStatusHeader(order = order, isRestaurant = isRestaurant)
                }

                // Timeline Canónico del Pedido
                item {
                    OrderCustomerTimelineCard(order = order, isRestaurant = isRestaurant)
                }

                // Fase 10.4-C: Visual Realtime Tracking Map (Customer Experience)
                item {
                    CustomerLiveTrackingCard(order = order, onNavigateToChat = onNavigateToChat)
                }

                // Delivery Info
                item {
                    DeliveryInfoCard(order = order, onNavigateToChat = onNavigateToChat)
                }

                if (isXToY) {
                    // Bloque C: Encomiendas X→Y — Origen, Destino, Distancia, Tarifa Base y Tarifa por km
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text("📦 Detalles del Envío Express (X→Y)", fontWeight = FontWeight.Black, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                                
                                val ps = tripSnapshot?.get("pricingSnapshot") as? Map<*, *>
                                val origAddr = tripSnapshot?.getString("originAddress") 
                                    ?: ((tripSnapshot?.get("origin") as? Map<*, *>)?.get("address") as? String)
                                    ?: order.branchAddress.ifBlank { order.origen.direccion.ifBlank { "Dirección de Origen" } }
                                val destAddr = tripSnapshot?.getString("destinationAddress") 
                                    ?: ((tripSnapshot?.get("destination") as? Map<*, *>)?.get("address") as? String)
                                    ?: order.destinationAddress.ifBlank { order.destino.direccion.ifBlank { "Dirección de Destino" } }
                                val distKm = (ps?.get("routeDistanceKm") as? Number)?.toDouble() ?: 0.0
                                val pkgDesc = tripSnapshot?.getString("packageDescription") ?: order.deliveryNote.ifBlank { "Encomienda estándar" }

                                Row(verticalAlignment = Alignment.Top) {
                                    Text("🟢 Origen:", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(90.dp))
                                    Text(origAddr, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                                }
                                Row(verticalAlignment = Alignment.Top) {
                                    Text("🔴 Destino:", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(90.dp))
                                    Text(destAddr, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                                }
                                if (pkgDesc.isNotBlank()) {
                                    Row(verticalAlignment = Alignment.Top) {
                                        Text("📦 Paquete:", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(90.dp))
                                        Text(pkgDesc, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                    }
                                }
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Distancia de ruta:", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("${String.format(java.util.Locale.US, "%.2f", distKm)} km", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                } else {
                    // Items list (Comercio / Restaurante)
                    item {
                        Text("Productos", fontWeight = FontWeight.Black, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                    }
                    
                    if (order.items.isEmpty()) {
                        item {
                            Text(
                                if (order.deliveryNote.isNotBlank()) "Nota / Contenido: ${order.deliveryNote}" else "Detalles de productos no especificados.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                    } else {
                        items(order.items) { item ->
                            val prodId = if (item.productId.isNotBlank()) item.productId else item.name.trim().lowercase().replace(" ", "_")
                            val isFav = favoriteProductIds.contains(prodId)
                            OrderItemRow(
                                item = item,
                                isFavorite = isFav,
                                onToggleFavorite = {
                                    toggleProductFavorite(item, order.businessId, order.businessName)
                                }
                            )
                        }
                    }

                    // Sugerencia de guardar en Favoritos si el pedido fue completado/entregado
                    val isOrderCompleted = order.status.lowercase() in listOf("delivered", "completed", "entregado")
                    if (isOrderCompleted && order.items.isNotEmpty()) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f))
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Favorite, contentDescription = null, tint = Color(0xFFFF3B30), modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            "¿Te gustó este pedido? ⭐",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 15.sp,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "Toca el corazón ❤️ en tus platos para guardarlos en Favoritos y volver a pedirlos cuando quieras.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        lineHeight = 16.sp
                                    )
                                }
                            }
                        }
                    }
                }

                // Payment Summary
                item {
                    PaymentSummaryCard(order)
                }

                // Botón Calificar y Reseñar / Tarjeta de Historial de Valoración
                val currentAuthUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
                val isDelivered = OrderPresentationResolver.isOrderPhysicallyDelivered(order)
                val hasRatedAny = order.hasBeenRated || order.rating > 0 || order.courierRating > 0
                val canRateFull = OrderPresentationResolver.isOrderRatingEligible(order, currentAuthUid)
                val canonicalCourier = OrderPresentationResolver.resolveCanonicalCourierId(order)
                val canRateCourier = isDelivered && canonicalCourier.isNotBlank() && (order.courierRating <= 0 && !order.hasRatedCourier)

                if (canRateFull) {
                    item {
                        Button(
                            onClick = {
                                ratingDialogInitialTab = 0
                                showRatingDialog = true
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFE11D48),
                                contentColor = Color.White
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 3.dp)
                        ) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFD700), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Calificar y Reseñar Pedido ⭐", fontWeight = FontWeight.Black, fontSize = 15.sp)
                        }
                    }
                } else if (hasRatedAny) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFFFB300), modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Tu Valoración del Pedido",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 15.sp,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                    Surface(
                                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text(
                                            text = "Calificado",
                                            color = Color(0xFF10B981),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(12.dp))

                                // Valoración Comercio
                                if (order.rating > 0) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Store, contentDescription = null, tint = Color(0xFFE11D48), modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("${order.businessName}:", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("⭐ ${order.rating} / 5", fontWeight = FontWeight.Black, color = Color(0xFFFFB300), fontSize = 13.sp)
                                    }
                                    if (order.ratingComment.isNotBlank()) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "\"${order.ratingComment}\"",
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(start = 24.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                }

                                // Valoración Motorizado
                                if (order.courierRating > 0) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.AutoMirrored.Filled.DirectionsBike, contentDescription = null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Repartidor:", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("⭐ ${order.courierRating} / 5", fontWeight = FontWeight.Black, color = Color(0xFFFFB300), fontSize = 13.sp)
                                    }
                                    if (order.courierRatingComment.isNotBlank()) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "\"${order.courierRatingComment}\"",
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(start = 24.dp)
                                        )
                                    }
                                } else if (canRateCourier) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Button(
                                        onClick = {
                                            ratingDialogInitialTab = 1
                                            showRatingDialog = true
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFF2563EB),
                                            contentColor = Color.White
                                        ),
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth().height(44.dp)
                                    ) {
                                        Icon(Icons.AutoMirrored.Filled.DirectionsBike, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Calificar al Repartidor ⭐", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    }
                                }
                            }
                        }
                    }
                }

                // Botón de Cancelar Pedido (Commerce y Encomiendas X→Y Pre-Custodia)
                val tripStatusFromSnap = tripSnapshot?.getString("status")?.uppercase()
                val isTripCancelled = tripStatusFromSnap == "CANCELLED" || order.status.uppercase() == "CANCELLED"
                val isTripFinished = tripStatusFromSnap in listOf("DELIVERED", "COMPLETED") || order.status.uppercase() in listOf("DELIVERED", "COMPLETED")
                val hasPickedUp = tripSnapshot?.get("pickedUpAt") != null || tripStatusFromSnap in listOf("PICKED_UP", "IN_TRANSIT")
                val hasArrivedPickup = tripSnapshot?.get("pickupArrivedAt") != null

                val isXToYCancellable = isXToY && !isTripCancelled && !isTripFinished && !hasPickedUp && !hasArrivedPickup &&
                    (tripStatusFromSnap == null || tripStatusFromSnap in listOf("PENDING", "ASSIGNED", "EN_ROUTE_PICKUP", "SEARCHING_5KM", "SEARCHING_15KM", "SEARCHING_30KM", "PAYMENT_VERIFYING", "READY"))

                val isCommerceCancellable = !isXToY && order.status.lowercase() in listOf("pending", "preparing", "pendiente", "preparando")

                val isCancellable = isXToYCancellable || isCommerceCancellable

                if (isCancellable) {
                    item {
                        Button(
                            onClick = { showCancelConfirmDialog = true },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer,
                                contentColor = MaterialTheme.colorScheme.error
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Default.Cancel, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isXToY) "Cancelar Solicitud de Encomienda ❌" else "Cancelar Pedido ❌",
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp
                            )
                        }
                    }
                } else if (isXToY && !isTripCancelled && !isTripFinished && (hasArrivedPickup || hasPickedUp)) {
                    item {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = if (hasPickedUp) "Tu paquete ya fue recogido por el motorizado y ya no puede cancelarse."
                                           else "El motorizado ya llegó al punto de recogida y la encomienda ya no puede cancelarse.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.Medium,
                                    lineHeight = 16.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showCancelConfirmDialog && order != null) {
        val isXToYDialog = (tripSnapshot != null && tripSnapshot?.exists() == true) || order.businessId.isBlank() || order.businessName == "Punto de Recogida X" || order.items.isEmpty()
        AlertDialog(
            onDismissRequest = { if (!isCancellingTrip) showCancelConfirmDialog = false },
            title = {
                Text(
                    text = if (isXToYDialog) "❌ ¿Cancelar Encomienda?" else "¿Cancelar Pedido?",
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onSurface
                )
            },
            text = {
                Text(
                    text = if (isXToYDialog) "¿Confirmas que deseas cancelar esta solicitud de encomienda express? Se notificará al repartidor y la solicitud quedará cancelada en el sistema."
                           else "¿Estás seguro de que deseas cancelar este pedido en ${order.businessName}? Esta acción no se puede deshacer.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (isXToYDialog) {
                            coroutineScope.launch {
                                isCancellingTrip = true
                                try {
                                    val functions = com.google.firebase.functions.FirebaseFunctions.getInstance()
                                    val payload = hashMapOf(
                                        "tripId" to order.pedidoId,
                                        "reason" to "CANCELLED_BY_CUSTOMER",
                                        "actorRole" to "CUSTOMER"
                                    )
                                    functions.getHttpsCallable("cancelDeliveryTrip").call(payload).await()
                                    android.widget.Toast.makeText(context, "Encomienda cancelada exitosamente", android.widget.Toast.LENGTH_SHORT).show()
                                    showCancelConfirmDialog = false
                                    onBackClick()
                                } catch (e: Exception) {
                                    val msg = e.message ?: ""
                                    val userMsg = when {
                                        msg.contains("PAQUETE_YA_RECOGIDO") -> "El motorizado ya tiene en mano tu encomienda. Por seguridad no puede cancelarse."
                                        msg.contains("ENCOMIENDA_NO_CANCELABLE") -> "El motorizado ya llegó al punto de recogida. No es posible cancelar en este momento."
                                        msg.contains("ESTADO_NO_CANCELABLE") -> "La encomienda ya se encuentra en un estado que no permite cancelación."
                                        else -> "No fue posible cancelar el viaje: ${e.localizedMessage ?: msg}"
                                    }
                                    android.widget.Toast.makeText(context, userMsg, android.widget.Toast.LENGTH_LONG).show()
                                } finally {
                                    isCancellingTrip = false
                                }
                            }
                        } else {
                            showCancelConfirmDialog = false
                            viewModel.cancelOrder(order.pedidoId) { success ->
                                if (success) {
                                    onBackClick()
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError
                    ),
                    enabled = !isCancellingTrip
                ) {
                    if (isCancellingTrip) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.onError, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Cancelando...", fontWeight = FontWeight.Black)
                    } else {
                        Text(if (isXToYDialog) "Sí, Cancelar Encomienda" else "Sí, Cancelar Pedido", fontWeight = FontWeight.Black)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelConfirmDialog = false }, enabled = !isCancellingTrip) {
                    Text(if (isXToYDialog) "Seguir esperando" else "No, Conservar", color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    if (showRatingDialog && order != null) {
        val courierId = OrderPresentationResolver.resolveCanonicalCourierId(order)
        RatingDialog(
            order = order,
            initialTab = ratingDialogInitialTab,
            allowRateBusiness = !order.hasRatedBusiness && order.rating <= 0,
            allowRateCourier = courierId.isNotBlank() && (!order.hasRatedCourier && order.courierRating <= 0),
            isSubmitting = isSubmittingRating,
            onDismiss = { if (!isSubmittingRating) showRatingDialog = false },
            onSubmit = { bRating, cRating, bComments, cComments ->
                isSubmittingRating = true
                viewModel.submitReview(
                    orderId = order.pedidoId,
                    businessId = order.businessId,
                    courierId = courierId,
                    businessRating = bRating,
                    courierRating = cRating,
                    comments = bComments,
                    courierComments = cComments,
                    onComplete = { success, errorMsg ->
                        isSubmittingRating = false
                        if (success) {
                            directOrder = directOrder?.copy(
                                hasBeenRated = true,
                                rating = if (bRating > 0) bRating else directOrder?.rating ?: 0,
                                ratingComment = if (bComments.isNotBlank()) bComments else directOrder?.ratingComment ?: "",
                                courierRating = if (cRating > 0) cRating else directOrder?.courierRating ?: 0,
                                courierRatingComment = if (cComments.isNotBlank()) cComments else directOrder?.courierRatingComment ?: "",
                                hasRatedBusiness = if (bRating > 0) true else directOrder?.hasRatedBusiness ?: false,
                                hasRatedCourier = if (cRating > 0) true else directOrder?.hasRatedCourier ?: false
                            )
                            showRatingDialog = false
                            android.widget.Toast.makeText(context, "¡Calificación guardada con éxito!", android.widget.Toast.LENGTH_SHORT).show()
                        } else {
                            android.widget.Toast.makeText(context, "Error: ${errorMsg ?: "No se pudo guardar la calificación"}", android.widget.Toast.LENGTH_LONG).show()
                        }
                    }
                )
            }
        )
    }
}

@Composable
fun OrderStatusHeader(order: Pedido, isRestaurant: Boolean = false) {
    val presentation = OrderPresentationResolver.resolve(order, isRestaurant)
    val statusColor = OrderStatusTheme.contentColor(order.status)
    val statusBg = OrderStatusTheme.containerColor(order.status)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(statusBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(presentation.icon, contentDescription = null, tint = statusColor, modifier = Modifier.size(24.dp))
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(presentation.title, fontWeight = FontWeight.Black, fontSize = 18.sp, color = statusColor)
                if (presentation.formattedOrderId.isNotEmpty()) {
                    Text(presentation.formattedOrderId, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}

@Composable
fun OrderCustomerTimelineCard(order: Pedido, isRestaurant: Boolean = false) {
    val steps = remember(order.status, order.estado, isRestaurant) {
        OrderPresentationResolver.buildTimelineSteps(order, isRestaurant)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Seguimiento del Pedido",
                fontWeight = FontWeight.Black,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(16.dp))

            steps.forEachIndexed { index, step ->
                val nodeColor = when {
                    step.isCompleted -> Color(0xFF10B981)
                    step.isCurrent -> MaterialTheme.colorScheme.primary
                    else -> MaterialTheme.colorScheme.outlineVariant
                }
                val textColor = when {
                    step.isCompleted -> MaterialTheme.colorScheme.onSurface
                    step.isCurrent -> MaterialTheme.colorScheme.primary
                    else -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(nodeColor.copy(alpha = if (step.isCompleted || step.isCurrent) 0.18f else 0.08f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                step.icon,
                                contentDescription = null,
                                tint = nodeColor,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        if (index < steps.size - 1) {
                            Box(
                                modifier = Modifier
                                    .width(2.dp)
                                    .height(26.dp)
                                    .background(
                                        if (step.isCompleted && steps[index + 1].isCompleted) Color(0xFF10B981)
                                        else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                                    )
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.padding(top = 4.dp)) {
                        Text(
                            step.title,
                            fontWeight = if (step.isCurrent || step.isCompleted) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 13.sp,
                            color = textColor
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DeliveryInfoCard(
    order: Pedido,
    onNavigateToChat: (String) -> Unit = {}
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val courierId = OrderPresentationResolver.resolveCanonicalCourierId(order)

    var driverName by remember { mutableStateOf("Repartidor Asignado") }
    var driverPlate by remember { mutableStateOf("") }
    var driverIdStr by remember { mutableStateOf(if (courierId.isNotEmpty()) "DRV-" + courierId.take(4).uppercase() else "") }
    var driverPhone by remember { mutableStateOf("") }
    var driverRating by remember { mutableStateOf(0.0) }
    var driverRatingCount by remember { mutableStateOf(0) }

    LaunchedEffect(courierId) {
        if (courierId.isNotEmpty()) {
            try {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                db.collection("users").document(courierId).get()
                    .addOnSuccessListener { doc ->
                        if (doc != null && doc.exists()) {
                            val name = doc.getString("nombre") ?: doc.getString("name") ?: ""
                            if (name.isNotBlank()) driverName = name
                            val plate = doc.getString("licensePlate") ?: doc.getString("placa") ?: ""
                            if (plate.isNotBlank()) driverPlate = plate
                            val drvId = doc.getString("driverId") ?: doc.getString("codigoOperativo") ?: ""
                            if (drvId.isNotBlank()) driverIdStr = drvId
                            val phone = doc.getString("telefono") ?: doc.getString("phone") ?: ""
                            if (phone.isNotBlank()) driverPhone = phone
                            val r = doc.getDouble("averageRating") ?: doc.getDouble("rating") ?: 0.0
                            val rc = (doc.getLong("ratingCount") ?: 0L).toInt()
                            if (r > 0.0) driverRating = r
                            if (rc > 0) driverRatingCount = rc
                        }
                    }
                db.collection("couriers").document(courierId).get()
                    .addOnSuccessListener { cDoc ->
                        if (cDoc != null && cDoc.exists()) {
                            val name = cDoc.getString("name") ?: cDoc.getString("fullName") ?: ""
                            if (name.isNotBlank()) driverName = name
                            val plate = cDoc.getString("licensePlate") ?: cDoc.getString("plate") ?: ""
                            if (plate.isNotBlank()) driverPlate = plate
                            val phone = cDoc.getString("phone") ?: ""
                            if (phone.isNotBlank()) driverPhone = phone
                            val cr = cDoc.getDouble("averageRating") ?: cDoc.getDouble("rating") ?: 0.0
                            val crc = (cDoc.getLong("ratingCount") ?: 0L).toInt()
                            if (cr > 0.0) driverRating = cr
                            if (crc > 0) driverRatingCount = crc
                        }
                    }
            } catch (e: Throwable) {
                // ignore fallback to defaults
            }
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Título de la tarjeta
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Detalles de Entrega",
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (courierId.isNotEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                    ) {
                        Text(
                            text = "🛵 En Curso",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Ruta Origen -> Destino con estilo Visual Stepper / Tracker
            val origen = order.businessName.ifEmpty { order.origen.nombreComercio.ifEmpty { "Origen" } }
            val destino = order.destinationAddress.ifEmpty { order.destino.direccion.ifEmpty { "Destino" } }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceContainerLowest, RoundedCornerShape(12.dp))
                    .padding(12.dp)
            ) {
                // Origen
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(Color(0xFF10B981).copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(Color(0xFF10B981), CircleShape)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Desde (Comercio / Origen)",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = origen,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Línea conectora
                Box(
                    modifier = Modifier
                        .padding(start = 11.dp)
                        .width(2.dp)
                        .height(16.dp)
                        .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f))
                )

                // Destino
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Para (Dirección de Entrega)",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = destino,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            // Bloque del Motorizado Asignado
            if (courierId.isNotEmpty()) {
                Spacer(modifier = Modifier.height(14.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                Spacer(modifier = Modifier.height(14.dp))

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = 0.6f),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        // Fila Superior: Avatar + Nombre + Botones de Acción (Chat y Llamada)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.DirectionsBike,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = driverName,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "Motorizado Repartidor",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            // Acciones de Comunicación
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                // Botón Chat
                                Surface(
                                    shape = CircleShape,
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clickable { onNavigateToChat(order.pedidoId) }
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.Chat,
                                            contentDescription = "Chat con motorizado",
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }

                                if (driverPhone.isNotEmpty()) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Surface(
                                        shape = CircleShape,
                                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                                        modifier = Modifier
                                            .size(38.dp)
                                            .clickable {
                                                val intent = android.content.Intent(android.content.Intent.ACTION_DIAL).apply {
                                                    data = android.net.Uri.parse("tel:$driverPhone")
                                                }
                                                context.startActivity(intent)
                                            }
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                Icons.Default.Phone,
                                                contentDescription = "Llamar al motorizado",
                                                tint = Color(0xFF10B981),
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Fila Inferior: Chips Horizontales de Datos (ID, Placa y Rating)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (driverIdStr.isNotBlank()) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = MaterialTheme.colorScheme.surfaceContainer
                                ) {
                                    Text(
                                        text = "ID: $driverIdStr",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        softWrap = false,
                                        maxLines = 1
                                    )
                                }
                            }

                            if (driverPlate.isNotBlank()) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
                                ) {
                                    Text(
                                        text = "🛵 Placa: $driverPlate",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        softWrap = false,
                                        maxLines = 1
                                    )
                                }
                            }

                            if (driverRatingCount > 0 && driverRating > 0.0) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFF59E0B).copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = "★ ${String.format(java.util.Locale.US, "%.1f", driverRating)} ($driverRatingCount)",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFFD97706),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        softWrap = false,
                                        maxLines = 1
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.Top) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.SemiBold)
            Text(value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
fun OrderItemRow(
    item: OrderItem,
    isFavorite: Boolean = false,
    onToggleFavorite: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text("${item.quantity}x", fontWeight = FontWeight.Black, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(item.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text("C$ ${item.price}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("C$ ${item.price * item.quantity}", fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onSurface)
            if (onToggleFavorite != null) {
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = onToggleFavorite,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Favorito",
                        tint = if (isFavorite) Color(0xFFFF3B30) else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun PaymentSummaryCard(order: Pedido) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Resumen de Pago", fontWeight = FontWeight.Black, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
            Spacer(modifier = Modifier.height(16.dp))
            
            val isXToY = order.serviceType == "X_TO_Y_DELIVERY"
            val total = if (order.total > 0) order.total else order.valoresMonetarios.total
            val deliveryFee = if (order.deliveryFee > 0) order.deliveryFee else order.valoresMonetarios.costoEnvio
            val subtotal = if (order.subtotal > 0) order.subtotal else if (order.items.isNotEmpty()) order.items.sumOf { it.price * it.quantity } else order.valoresMonetarios.subtotal
            val additionalCharge = order.additionalChargeAmount
            val tip = order.tipAmount
            val discount = order.discountAmount
            val note = order.deliveryNote.ifBlank { "" }
            
            if (isXToY) {
                SummaryRow("Tarifa de Encomienda", "C$ ${String.format(java.util.Locale.US, "%.2f", total)}")
                Spacer(modifier = Modifier.height(8.dp))
            } else {
                if (subtotal > 0) {
                    SummaryRow("Subtotal", "C$ ${String.format(java.util.Locale.US, "%.2f", subtotal)}")
                    Spacer(modifier = Modifier.height(8.dp))
                }
                
                if (deliveryFee > 0) {
                    SummaryRow("Costo de envío", "C$ ${String.format(java.util.Locale.US, "%.2f", deliveryFee)}")
                    Spacer(modifier = Modifier.height(8.dp))
                }

                if (additionalCharge > 0) {
                    SummaryRow("Cargo adicional", "C$ ${String.format(java.util.Locale.US, "%.2f", additionalCharge)}")
                    Spacer(modifier = Modifier.height(8.dp))
                }

                if (discount > 0) {
                    SummaryRow("Descuento", "-C$ ${String.format(java.util.Locale.US, "%.2f", discount)}")
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }

            if (tip > 0) {
                SummaryRow("Propina a repartidor", "(+) C$ ${String.format(java.util.Locale.US, "%.2f", tip)}")
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Total", fontWeight = FontWeight.Black, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                Text("C$ ${String.format(java.util.Locale.US, "%.2f", total)}", fontWeight = FontWeight.Black, fontSize = 17.sp, color = MaterialTheme.colorScheme.primary)
            }
            
            val paymentMethod = order.paymentMethod.ifEmpty { order.valoresMonetarios.metodoPago.ifEmpty { "efectivo" } }
            Spacer(modifier = Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Payment, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Método de pago: $paymentMethod", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            if (note.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Note, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Nota de entrega: $note", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        }
    }
}

@Composable
fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
    }
}

/**
 * Fase 10.4-C: Componente de Tracking Visual Realtime para el Cliente
 * Escucha en tiempo real /ubicaciones_repartidores/{courierId} y /orders/{pedidoId}.ubicacionRepartidor.
 */
@Composable
fun CustomerLiveTrackingCard(
    order: Pedido,
    onNavigateToChat: (String) -> Unit = {}
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val courierId = OrderPresentationResolver.resolveCanonicalCourierId(order)
    val isDeliveryActive = order.status in listOf("assigned", "ready", "preparing", "in_transit", "picked_up", "delivering", "EN_RUTA", "ASIGNADO")
    val navBarBottomInset = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()

    var courierLocation by remember { mutableStateOf<LatLng?>(null) }
    var courierSpeedKmh by remember { mutableStateOf<Int?>(null) }
    var lastSignalTime by remember { mutableStateOf("") }
    var isFullScreenMap by remember { mutableStateOf(false) }
    var streetRoutePoints by remember { mutableStateOf<List<LatLng>>(emptyList()) }
    val coroutineScope = rememberCoroutineScope()

    // Coordenadas reales de Origen y Destino
    val storeLatLng = remember(order) {
        if (order.origen.coordenadas.latitud != 0.0 && order.origen.coordenadas.longitud != 0.0) {
            LatLng(order.origen.coordenadas.latitud, order.origen.coordenadas.longitud)
        } else {
            LatLng(12.1364, -86.2514) // Managua Central
        }
    }
    val customerLatLng = remember(order) {
        if (order.destino.coordenadas.latitud != 0.0 && order.destino.coordenadas.longitud != 0.0) {
            LatLng(order.destino.coordenadas.latitud, order.destino.coordenadas.longitud)
        } else {
            LatLng(12.1220, -86.2390)
        }
    }

    // Cálculo dinámico de ruta por calles reales (turn-by-turn)
    val routeOrigin = courierLocation ?: storeLatLng
    LaunchedEffect(routeOrigin, customerLatLng) {
        val points = com.example.domain.engine.navigation.StreetRoutingEngine.getRouteCoordinates(routeOrigin, customerLatLng)
        if (points.isNotEmpty()) {
            streetRoutePoints = points
        }
    }

    val activePolylinePoints = remember(streetRoutePoints, routeOrigin, customerLatLng) {
        if (streetRoutePoints.isNotEmpty()) streetRoutePoints else listOf(routeOrigin, customerLatLng)
    }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(courierLocation ?: storeLatLng, 15f)
    }

    val fullScreenCameraState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(courierLocation ?: storeLatLng, 16.5f)
    }

    // Centrar automáticamente cuando llega la primera señal GPS
    LaunchedEffect(courierLocation) {
        if (courierLocation != null) {
            cameraPositionState.animate(
                CameraUpdateFactory.newLatLng(courierLocation!!),
                1000
            )
        }
    }

    // Escucha dual en tiempo real: /ubicaciones_repartidores/{courierId} y /orders/{pedidoId}
    DisposableEffect(courierId, isDeliveryActive, order.pedidoId) {
        if (courierId.isNotEmpty() && isDeliveryActive) {
            val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
            
            // Listener 1: Telemetría de flota del motorizado
            val courierListener = db.collection("ubicaciones_repartidores")
                .document(courierId)
                .addSnapshotListener { snap, err ->
                    if (err == null && snap != null && snap.exists()) {
                        val lat = snap.getDouble("latitud") ?: snap.getDouble("latitude")
                            ?: (snap.get("coordenadas.latitud") as? Number)?.toDouble()
                            ?: (snap.get("coordenadas.latitude") as? Number)?.toDouble()
                        val lng = snap.getDouble("longitud") ?: snap.getDouble("longitude")
                            ?: (snap.get("coordenadas.longitud") as? Number)?.toDouble()
                            ?: (snap.get("coordenadas.longitude") as? Number)?.toDouble()
                        val speedMs = snap.getDouble("speed") ?: (snap.get("speed") as? Number)?.toDouble()

                        if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
                            courierLocation = LatLng(lat, lng)
                            courierSpeedKmh = speedMs?.let { (it * 3.6).toInt().coerceAtLeast(0) }
                            lastSignalTime = "Hace un momento"
                        }
                    }
                }

            // Listener 2: Fallback desde el pedido directo
            val orderListener = if (order.pedidoId.isNotBlank()) {
                db.collection("orders").document(order.pedidoId)
                    .addSnapshotListener { oSnap, _ ->
                        if (oSnap != null && oSnap.exists() && courierLocation == null) {
                            val locMap = oSnap.get("ubicacionRepartidor") as? Map<*, *>
                            val lat = (locMap?.get("latitud") as? Number)?.toDouble()
                            val lng = (locMap?.get("longitud") as? Number)?.toDouble()
                            if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
                                courierLocation = LatLng(lat, lng)
                                lastSignalTime = "Hace un momento"
                            }
                        }
                    }
            } else null

            onDispose {
                courierListener.remove()
                orderListener?.remove()
            }
        } else {
            onDispose { }
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Seguimiento en Vivo 🛵", fontWeight = FontWeight.Black, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                    if (courierSpeedKmh != null && courierSpeedKmh!! > 3) {
                        Text("⚡ Velocidad: ~$courierSpeedKmh km/h", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (courierLocation != null) {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = Color(0xFF10B981).copy(alpha = 0.15f)
                        ) {
                            Text(
                                "🔴 GPS En Vivo",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF10B981),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    } else {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = MaterialTheme.colorScheme.surfaceContainer
                        ) {
                            Text(
                                if (courierId.isEmpty()) "Por Asignar" else "Conectando GPS...",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(6.dp))

                    // Botón para Ampliar a Pantalla Completa
                    IconButton(
                        onClick = { isFullScreenMap = true },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Fullscreen,
                                    contentDescription = "Pantalla completa",
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Mapa Embebido en la Tarjeta
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainer)
            ) {
                GoogleMap(
                    modifier = Modifier.fillMaxSize(),
                    cameraPositionState = cameraPositionState,
                    uiSettings = MapUiSettings(
                        zoomControlsEnabled = false,
                        compassEnabled = true,
                        mapToolbarEnabled = false
                    )
                ) {
                    // Marcador Origen Comercio
                    Marker(
                        state = MarkerState(position = storeLatLng),
                        title = order.businessName.ifEmpty { "Comercio Origen" },
                        snippet = "Punto de recogida",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN)
                    )

                    // Marcador Destino Cliente
                    Marker(
                        state = MarkerState(position = customerLatLng),
                        title = "Tu Dirección de Entrega",
                        snippet = order.destinationAddress.ifEmpty { "Punto de entrega" },
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED)
                    )

                    // Marcador Repartidor en tiempo real
                    if (courierLocation != null) {
                        Marker(
                            state = MarkerState(position = courierLocation!!),
                            title = "🛵 Repartidor en Ruta",
                            snippet = if (courierSpeedKmh != null) "Velocidad: $courierSpeedKmh km/h" else "Transmitiendo señal",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
                        )
                    }

                    // Polilínea por calles reales
                    Polyline(
                        points = activePolylinePoints,
                        color = Color(0xFF2563EB),
                        width = 10f
                    )
                }

                // Botón Flotante "Ver Pantalla Completa" sobre el mapa
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(12.dp)
                        .clickable { isFullScreenMap = true },
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
                    shadowElevation = 4.dp
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Fullscreen, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Ampliar Mapa", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }

    // Modal / Diálogo de Mapa en Pantalla Completa
    if (isFullScreenMap) {
        val bottomClearance = if (navBarBottomInset > 0.dp) navBarBottomInset + 28.dp else 84.dp

        Dialog(
            onDismissRequest = { isFullScreenMap = false },
            properties = DialogProperties(
                usePlatformDefaultWidth = false,
                dismissOnBackPress = true
            )
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    // Mapa Interactivo Completo
                    GoogleMap(
                        modifier = Modifier.fillMaxSize(),
                        cameraPositionState = fullScreenCameraState,
                        uiSettings = MapUiSettings(
                            zoomControlsEnabled = true,
                            compassEnabled = true,
                            myLocationButtonEnabled = false,
                            mapToolbarEnabled = true
                        )
                    ) {
                        Marker(
                            state = MarkerState(position = storeLatLng),
                            title = order.businessName.ifEmpty { "Comercio Origen" },
                            snippet = "Punto de recogida",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN)
                        )

                        Marker(
                            state = MarkerState(position = customerLatLng),
                            title = "Tu Dirección",
                            snippet = order.destinationAddress.ifEmpty { "Punto de entrega" },
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED)
                        )

                        if (courierLocation != null) {
                            Marker(
                                state = MarkerState(position = courierLocation!!),
                                title = "🛵 Repartidor en Vivo",
                                snippet = if (courierSpeedKmh != null) "Velocidad: $courierSpeedKmh km/h" else "En ruta",
                                icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
                            )
                        }

                        // Polilínea por calles reales
                        Polyline(
                            points = activePolylinePoints,
                            color = Color(0xFF2563EB),
                            width = 12f
                        )
                    }

                    // Barra Superior con Botón de Regresar
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(12.dp),
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
                        shadowElevation = 6.dp
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(
                                    onClick = { isFullScreenMap = false },
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.ArrowBack,
                                        contentDescription = "Cerrar mapa",
                                        tint = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(
                                        text = "Seguimiento en Vivo",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "Pedido #${order.displayOrderCode}",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }

                            if (courierLocation != null) {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color(0xFF10B981).copy(alpha = 0.15f)
                                ) {
                                    Text(
                                        text = "🔴 GPS Activo",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFF10B981),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Botones Flotantes de Control de Cámara (Derecha)
                    Column(
                        modifier = Modifier
                            .align(Alignment.CenterEnd)
                            .padding(end = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // Centrar en Motorizado
                        if (courierLocation != null) {
                            FloatingActionButton(
                                onClick = {
                                    coroutineScope.launch {
                                        fullScreenCameraState.animate(
                                            CameraUpdateFactory.newLatLngZoom(courierLocation!!, 17f),
                                            800
                                        )
                                    }
                                },
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                contentColor = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(44.dp)
                            ) {
                                Icon(Icons.AutoMirrored.Filled.DirectionsBike, contentDescription = "Centrar en Repartidor", modifier = Modifier.size(22.dp))
                            }
                        }

                        // Centrar en Destino Cliente
                        FloatingActionButton(
                            onClick = {
                                coroutineScope.launch {
                                    fullScreenCameraState.animate(
                                        CameraUpdateFactory.newLatLngZoom(customerLatLng, 17f),
                                        800
                                    )
                                }
                            },
                            containerColor = MaterialTheme.colorScheme.surface,
                            contentColor = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.size(44.dp)
                        ) {
                            Icon(Icons.Default.LocationOn, contentDescription = "Centrar en Destino", modifier = Modifier.size(22.dp))
                        }
                    }

                    // Tarjeta Inferior de Estado Flotante - Elevada completamente sobre la barra de 3 botones
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .align(Alignment.BottomCenter)
                            .padding(horizontal = 16.dp)
                            .padding(bottom = bottomClearance),
                        shape = RoundedCornerShape(24.dp),
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.98f),
                        shadowElevation = 14.dp,
                        tonalElevation = 6.dp,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                Surface(
                                    shape = CircleShape,
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    modifier = Modifier.size(46.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.DirectionsBike,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(26.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column {
                                    Text(
                                        text = if (courierLocation != null) "Motorizado en Camino 🛵" else "Preparando Entrega",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = if (courierSpeedKmh != null && courierSpeedKmh!! > 3) {
                                            "Velocidad: ~$courierSpeedKmh km/h • $lastSignalTime"
                                        } else {
                                            "Actualización GPS en vivo"
                                        },
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            // Botón de Chat Directo
                            Button(
                                onClick = {
                                    isFullScreenMap = false
                                    onNavigateToChat(order.pedidoId)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                shape = RoundedCornerShape(14.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                                elevation = ButtonDefaults.buttonElevation(defaultElevation = 3.dp)
                            ) {
                                Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Chat", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
