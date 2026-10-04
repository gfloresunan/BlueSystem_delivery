package com.example.presentation.customer.home

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.Pedido
import com.example.data.CartManager
import com.example.data.repository.BusinessInfo
import com.example.data.repository.DashboardAnalyticsTracker
import com.example.domain.model.Product

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — QUICK REORDER SECTION
 * Protocolo: BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001 (Phase 5)
 *
 * Motor de reordenamiento seguro de 7 capas:
 * 1. Lee pedidos históricos completados/entregados.
 * 2. Valida cada producto contra el catálogo vivo actual (allProducts).
 * 3. Valida disponibilidad real (isActive && isAvailable).
 * 4. Aplica estrictamente el PRECIO VIVO ACTUAL (nunca el precio histórico).
 * 5. Valida estado activo del comercio (merchant status).
 * 6. Omite explícitamente productos descontinuados notificando al usuario.
 * 7. Invariante: El pedido histórico permanece 100% inmutable.
 */
import com.example.BlockActionConfig

@Composable
fun QuickReorderSection(
    showQuickReorder: Boolean,
    recentOrders: List<Pedido>,
    allProducts: List<Product>,
    publicBusinesses: List<BusinessInfo>,
    navController: NavController,
    context: Context,
    modifier: Modifier = Modifier,
    title: String = "Volver a Pedir 🔄",
    headerAction: BlockActionConfig? = null,
    onHeaderActionClick: ((BlockActionConfig) -> Unit)? = null
) {
    if (!showQuickReorder) return

    val eligibleOrders = remember(recentOrders) {
        recentOrders.filter { order ->
            val s = (order.status.ifBlank { order.estado }).trim().lowercase()
            s == "delivered" || s == "entregado" || s == "completed" || s == "completado"
        }.take(5)
    }

    if (eligibleOrders.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = title,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f, fill = false)
            )
            if (headerAction != null && !headerAction.type.equals("NONE", ignoreCase = true) && headerAction.type.isNotBlank()) {
                TextButton(
                    onClick = { onHeaderActionClick?.invoke(headerAction) },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                ) {
                    Text(
                        text = headerAction.label.ifBlank { "Ver más ›" },
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(eligibleOrders, key = { it.pedidoId.ifBlank { it.clientRequestId } }) { order ->
                QuickReorderCard(
                    order = order,
                    onReorderClick = {
                        reconstructCartFromHistoricalOrder(
                            order = order,
                            allProducts = allProducts,
                            publicBusinesses = publicBusinesses,
                            context = context,
                            navController = navController
                        )
                    }
                )
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}

@Composable
private fun QuickReorderCard(
    order: Pedido,
    onReorderClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(260.dp)
            .shadow(4.dp, RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = order.businessName.ifBlank { "Comercio" },
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "✓ Entregado",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF10B981),
                    maxLines = 1,
                    softWrap = false
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            val itemsSummary = if (order.items.isNotEmpty()) {
                order.items.joinToString(", ") { "${it.quantity}x ${it.name}" }
            } else {
                "Pedido anterior"
            }
            Text(
                text = itemsSummary,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                lineHeight = 16.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = onReorderClick,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                Text(
                    text = "Repetir Pedido 🔄",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
    }
}

/**
 * Reconstruye de forma segura un nuevo carrito a partir del pedido histórico.
 * Garantiza que jamás se usen precios históricos ni productos descontinuados.
 */
private fun reconstructCartFromHistoricalOrder(
    order: Pedido,
    allProducts: List<Product>,
    publicBusinesses: List<BusinessInfo>,
    context: Context,
    navController: NavController
) {
    val orderId = order.pedidoId.ifBlank { order.clientRequestId }
    DashboardAnalyticsTracker.logEvent(
        eventType = "click",
        itemType = "quick_reorder",
        itemId = orderId,
        itemName = order.businessName
    )

    // 1. Validar que el comercio siga existiendo y esté activo
    val merchant = publicBusinesses.find { it.id == order.businessId }
    if (merchant != null && !merchant.getEffectiveIsActive()) {
        Toast.makeText(context, "El comercio ${order.businessName} no está disponible actualmente.", Toast.LENGTH_LONG).show()
        return
    }

    // 2. Limpiar carrito previo si pertenece a otro comercio
    if (CartManager.currentBusinessId.isNotEmpty() && CartManager.currentBusinessId != order.businessId) {
        CartManager.clear()
    }

    var addedCount = 0
    var omittedCount = 0

    // 3. Validar cada ítem del pedido histórico contra el catálogo vivo actual
    for (item in order.items) {
        val liveProduct = allProducts.find { it.id == item.productId || (it.name.equals(item.name, ignoreCase = true) && it.businessId == order.businessId) }

        if (liveProduct != null && liveProduct.status == com.example.domain.model.ProductStatus.ACTIVE && !liveProduct.isHidden) {
            // Se agrega al carrito usando el PRECIO ACTUAL DEL CATÁLOGO VIVO
            CartManager.addToCart(
                productId = liveProduct.id,
                productName = liveProduct.name,
                price = liveProduct.price, // PRECIO VIVO
                quantity = item.quantity.coerceAtLeast(1),
                businessId = order.businessId,
                businessName = order.businessName,
                imageUrl = liveProduct.imageUrl
            )
            addedCount++
        } else {
            // Producto no disponible en catálogo vivo -> Omitir de forma explícita
            omittedCount++
        }
    }

    if (addedCount > 0) {
        if (omittedCount > 0) {
            Toast.makeText(
                context,
                "¡Carrito reconstruido con precios actuales! ($omittedCount producto(s) omitidos por no estar disponibles)",
                Toast.LENGTH_LONG
            ).show()
        } else {
            Toast.makeText(context, "¡Pedido reconstruido con precios actuales! 🛒", Toast.LENGTH_SHORT).show()
        }
        navController.navigate("carrito_screen")
    } else {
        Toast.makeText(
            context,
            "Los productos de este pedido ya no se encuentran disponibles en el comercio.",
            Toast.LENGTH_LONG
        ).show()
    }
}
