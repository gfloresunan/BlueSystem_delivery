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
import com.example.data.repository.BusinessInfo
import com.example.presentation.customer.components.PublicBusinessCard

@Composable
fun FeaturedBusinessesSection(
    showFeaturedBusinesses: Boolean,
    publicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!showFeaturedBusinesses) return

    val featuredPublicList = remember(publicBusinesses) {
        publicBusinesses.filter { it.getEffectiveIsFeatured() }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Comercios Destacados ⭐",
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
            color = Color(0xFF1E293B),
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))

        if (featuredPublicList.isEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "No hay comercios destacados configurados actualmente.",
                    color = Color.Gray,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(16.dp)
                )
            }
        } else {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(featuredPublicList) { business ->
                    PublicBusinessCard(
                        business = business,
                        isFavorite = favoriteIds.contains(business.id),
                        onToggleFavorite = { onToggleFavorite(business.id) },
                        onClick = { onBusinessClick(business.id) }
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}
