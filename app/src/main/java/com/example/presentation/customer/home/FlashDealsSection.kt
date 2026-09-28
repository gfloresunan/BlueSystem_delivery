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
import com.example.FlashDeal
import com.example.presentation.customer.components.FlashDealCard

@Composable
fun FlashDealsSection(
    showFlashDeals: Boolean,
    flashDeals: List<FlashDeal>,
    onDealClick: (deal: FlashDeal) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!showFlashDeals) return

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Ofertas Flash ⚡ (Tiempo Limitado)",
            fontWeight = FontWeight.ExtraBold,
            fontSize = 18.sp,
            color = Color(0xFFD97706),
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(10.dp))

        val dealsList = remember(flashDeals) {
            flashDeals
        }

        if (dealsList.isEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Text(
                    text = "No hay ofertas flash activas en este momento.",
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
                items(dealsList) { deal ->
                    FlashDealCard(
                        title = deal.title.ifBlank { deal.productName },
                        discountTag = deal.discountTag,
                        price = deal.price,
                        originalPrice = deal.originalPrice,
                        businessName = deal.businessName,
                        imageUrl = deal.imageUrl,
                        onClick = { onDealClick(deal) }
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}
