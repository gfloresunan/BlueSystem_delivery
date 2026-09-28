package com.example.presentation.customer.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.Pedido
import com.example.ui.theme.OrderStatusTheme
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.Locale

@Composable
fun OrderStatusBadge(
    statusText: String,
    statusColor: Color,
    statusBg: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.wrapContentWidth(),
        shape = RoundedCornerShape(16.dp),
        color = statusBg
    ) {
        Text(
            text = statusText,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            color = statusColor,
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            maxLines = 1,
            softWrap = false,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersHistoryScreen(
    onNavigateToDetail: (String) -> Unit,
    onNavigateToCart: () -> Unit = {},
    onNavigateToSolicitarEnvio: () -> Unit = {},
    viewModel: OrdersViewModel = viewModel()
) {
    val orders by viewModel.orders.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    var orderToRate by remember { mutableStateOf<Pedido?>(null) }
    var isSubmittingRate by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = { Text("Historial de Pedidos", fontWeight = FontWeight.Black, fontSize = 20.sp, color = MaterialTheme.colorScheme.onSurface) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else if (orders.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Receipt,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "Aún no tienes pedidos 🛒",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(orders) { order ->
                    val isXToYOrder = order.businessId.isBlank() || order.businessName == "Punto de Recogida X" || order.items.isEmpty()
                    OrderHistoryCard(
                        order = order,
                        onClick = { onNavigateToDetail(order.pedidoId) },
                        onRateClick = { orderToRate = order },
                        onCancelClick = {
                            if (isXToYOrder) {
                                coroutineScope.launch {
                                    try {
                                        val functions = com.google.firebase.functions.FirebaseFunctions.getInstance()
                                        val payload = hashMapOf(
                                            "tripId" to order.pedidoId,
                                            "reason" to "CANCELLED_BY_CUSTOMER",
                                            "actorRole" to "CUSTOMER"
                                        )
                                        functions.getHttpsCallable("cancelDeliveryTrip").call(payload).await()
                                        android.widget.Toast.makeText(context, "Encomienda cancelada exitosamente", android.widget.Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        val msg = e.message ?: ""
                                        val userMsg = when {
                                            msg.contains("PAQUETE_YA_RECOGIDO") -> "El motorizado ya tiene en mano tu encomienda. Por seguridad no puede cancelarse."
                                            msg.contains("ENCOMIENDA_NO_CANCELABLE") -> "El motorizado ya llegó al punto de recogida. No es posible cancelar en este momento."
                                            msg.contains("ESTADO_NO_CANCELABLE") -> "La encomienda ya se encuentra en un estado que no permite cancelación."
                                            else -> "No fue posible cancelar el viaje: ${e.localizedMessage ?: msg}"
                                        }
                                        android.widget.Toast.makeText(context, userMsg, android.widget.Toast.LENGTH_LONG).show()
                                    }
                                }
                            } else {
                                viewModel.cancelOrder(order.pedidoId)
                            }
                        },
                        onReorderClick = {
                            if (isXToYOrder) {
                                android.widget.Toast.makeText(context, "Iniciando nueva solicitud de encomienda express 📦", android.widget.Toast.LENGTH_SHORT).show()
                                onNavigateToSolicitarEnvio()
                            } else {
                                if (order.items.isNotEmpty()) {
                                    if (com.example.data.CartManager.currentBusinessId.isNotEmpty() && com.example.data.CartManager.currentBusinessId != order.businessId) {
                                        com.example.data.CartManager.clear()
                                    }
                                    order.items.forEach { item ->
                                        com.example.data.CartManager.addToCart(
                                            productId = item.productId,
                                            productName = item.name,
                                            price = item.price,
                                            quantity = item.quantity.coerceAtLeast(1),
                                            businessId = order.businessId,
                                            businessName = order.businessName
                                        )
                                    }
                                    android.widget.Toast.makeText(context, "¡Productos agregados al carrito! 🛒", android.widget.Toast.LENGTH_SHORT).show()
                                    onNavigateToCart()
                                } else {
                                    android.widget.Toast.makeText(context, "No fue posible reconstruir los productos de este pedido.", android.widget.Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    )
                }
            }
        }
    }

    if (orderToRate != null) {
        val courierId = OrderPresentationResolver.resolveCanonicalCourierId(orderToRate!!)
        RatingDialog(
            order = orderToRate!!,
            isSubmitting = isSubmittingRate,
            onDismiss = { if (!isSubmittingRate) orderToRate = null },
            onSubmit = { bRating, cRating, bComments, cComments ->
                isSubmittingRate = true
                viewModel.submitReview(
                    orderId = orderToRate!!.pedidoId,
                    businessId = orderToRate!!.businessId,
                    courierId = courierId,
                    businessRating = bRating,
                    courierRating = cRating,
                    comments = bComments,
                    courierComments = cComments,
                    onComplete = { success, errorMsg ->
                        isSubmittingRate = false
                        if (success) {
                            orderToRate = null
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
fun OrderHistoryCard(
    order: Pedido,
    onClick: () -> Unit,
    onRateClick: () -> Unit,
    onCancelClick: () -> Unit,
    onReorderClick: () -> Unit
) {
    var showCancelConfirmDialog by remember { mutableStateOf(false) }
    val isXToY = order.businessId.isBlank() || order.businessName == "Punto de Recogida X" || order.items.isEmpty()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Storefront, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f, fill = false)) {
                        val name = order.businessName.ifEmpty { order.origen.nombreComercio.ifEmpty { "Comercio Asociado" } }
                        Text(
                            text = name,
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        val dateString = order.createdAt?.toDate()?.let { 
                            SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault()).format(it)
                        } ?: order.creadoEl
                        Text(
                            text = dateString,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))
                
                val presentation = OrderPresentationResolver.resolve(order)
                val statusText = presentation.shortLabel
                val statusColor = OrderStatusTheme.contentColor(order.status)
                val statusBg = OrderStatusTheme.containerColor(order.status)
                
                OrderStatusBadge(
                    statusText = statusText,
                    statusColor = statusColor,
                    statusBg = statusBg
                )
            }
            
            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(12.dp))
            
            val itemsCount = order.items.sumOf { it.quantity }
            val itemsDesc = if (itemsCount > 0) {
                "$itemsCount producto(s)"
            } else {
                "Detalles del pedido"
            }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(itemsDesc, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                val totalAmount = if (order.total > 0) order.total else order.valoresMonetarios.total
                Text("C$ ${String.format("%.2f", totalAmount)}", fontWeight = FontWeight.Black, fontSize = 17.sp, color = MaterialTheme.colorScheme.onSurface)
            }
            
            Spacer(modifier = Modifier.height(14.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val isCancellable = if (isXToY) {
                    order.status.lowercase() in listOf("ready", "pending", "payment_verifying") &&
                    order.motorizadoId.isBlank() && order.assignedCourierId.isBlank()
                } else {
                    order.status in listOf("pending", "preparing", "PENDIENTE", "PREPARANDO")
                }

                if (isCancellable) {
                    Button(
                        onClick = { showCancelConfirmDialog = true },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                            contentColor = MaterialTheme.colorScheme.error
                        ),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Cancel, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.error)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(if (isXToY) "Cancelar" else "Cancelar", fontWeight = FontWeight.Black, fontSize = 12.sp)
                    }
                }

                Button(
                    onClick = onReorderClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.primary
                    ),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(if (isXToY) "Volver a pedir" else "Volver a pedir", fontWeight = FontWeight.Black, fontSize = 12.sp)
                }
                
                val currentAuthUid = remember { com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid }
                if (OrderPresentationResolver.isOrderRatingEligible(order, currentAuthUid)) {
                    Button(
                        onClick = onRateClick,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary
                        ),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Calificar ⭐", fontWeight = FontWeight.Black, fontSize = 12.sp)
                    }
                }
            }
        }
    }

    if (showCancelConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showCancelConfirmDialog = false },
            title = { Text(if (isXToY) "❌ ¿Cancelar Encomienda?" else "¿Cancelar Pedido?", fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onSurface) },
            text = {
                Text(
                    text = if (isXToY) "¿Confirmas que deseas cancelar esta solicitud de encomienda express? Se detendrá la búsqueda y el viaje quedará cancelado."
                           else "¿Estás seguro de que deseas cancelar este pedido en ${order.businessName}? Esta acción no se puede deshacer.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showCancelConfirmDialog = false
                        onCancelClick()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError
                    )
                ) {
                    Text(if (isXToY) "Sí, Cancelar Encomienda" else "Sí, Cancelar Pedido", fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelConfirmDialog = false }) {
                    Text("No, Conservar", color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}
