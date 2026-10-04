package com.example.presentation.customer.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.BlockActionConfig
import com.example.FeaturedProduct
import com.example.presentation.customer.components.ProductPromoCard

@Composable
fun DiscountedProductsSection(
    showPromotions: Boolean = true,
    discountedProducts: List<FeaturedProduct>,
    onProductClick: (businessId: String) -> Unit,
    onAddToCart: (FeaturedProduct) -> Unit,
    modifier: Modifier = Modifier,
    title: String = "Productos con Descuentos 🏷️",
    headerAction: BlockActionConfig? = null,
    onHeaderActionClick: ((BlockActionConfig) -> Unit)? = null
) {
    if (!showPromotions || discountedProducts.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            Text(
                text = title,
                fontWeight = FontWeight.Bold,
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

        val promoItemsList = remember(discountedProducts) {
            discountedProducts
        }

        if (promoItemsList.isEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Text(
                    text = "No hay productos con descuentos configurados actualmente.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(16.dp)
                )
            }
        } else {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(promoItemsList) { prod ->
                    val formattedPrice = "C$ ${String.format("%.2f", prod.price)}"
                    val formattedOriginalPrice = if (prod.originalPrice != null && prod.originalPrice > prod.price) {
                        "C$ ${String.format("%.2f", prod.originalPrice)}"
                    } else ""
                    val discountPct = if (prod.originalPrice != null && prod.originalPrice > prod.price && prod.originalPrice > 0.0) {
                        (((prod.originalPrice - prod.price) / prod.originalPrice) * 100).toInt()
                    } else 0
                    val discountTag = if (discountPct > 0) "-$discountPct%" else ""

                    ProductPromoCard(
                        name = prod.name,
                        price = formattedPrice,
                        originalPrice = formattedOriginalPrice,
                        imageUrl = prod.imageUrl,
                        discountTag = discountTag,
                        onClick = {
                            if (prod.businessId.isNotBlank()) {
                                onProductClick(prod.businessId)
                            }
                        },
                        onAddToCart = {
                            onAddToCart(prod)
                        }
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}
