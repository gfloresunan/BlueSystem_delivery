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
import com.example.FeaturedProduct
import com.example.presentation.customer.components.StarProductCard

@Composable
fun StarProductsSection(
    showFeaturedProducts: Boolean,
    featuredProducts: List<FeaturedProduct>,
    onProductClick: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!showFeaturedProducts) return

    val starList = remember(featuredProducts) {
        featuredProducts
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Productos Estrella ⭐",
            fontWeight = FontWeight.ExtraBold,
            fontSize = 18.sp,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(10.dp))

        if (starList.isEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Text(
                    text = "No hay productos estrella configurados actualmente.",
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
                items(starList) { star ->
                    StarProductCard(
                        name = star.name,
                        price = star.price,
                        originalPrice = star.originalPrice,
                        businessName = star.businessName,
                        imageUrl = star.imageUrl,
                        onClick = { onProductClick(star.businessId) }
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}
