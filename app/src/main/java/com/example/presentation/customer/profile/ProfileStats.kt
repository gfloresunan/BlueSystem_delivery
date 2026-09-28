package com.example.presentation.customer.profile

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class ProfileStatCardItem(
    val id: String,
    val title: String,
    val value: String,
    val emoji: String,
    val bgColor: Color,
    val textColor: Color
)

@Composable
fun ProfileStats(
    points: Int,
    ordersCount: Int,
    walletBalance: String,
    couponsCount: Int,
    favoritesCount: Int,
    onStatClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val stats = listOf(
        ProfileStatCardItem("points", "Puntos", "$points pts", "⭐", Color(0xFFFEF3C7), Color(0xFFD97706)),
        ProfileStatCardItem("orders", "Pedidos", "$ordersCount", "🛍️", Color(0xFFEFF6FF), Color(0xFF2563EB)),
        ProfileStatCardItem("wallet", "Cartera", walletBalance, "💰", Color(0xFFECFDF5), Color(0xFF059669)),
        ProfileStatCardItem("coupons", "Cupones", "$couponsCount", "🎟️", Color(0xFFFDF2F8), Color(0xFFDB2777)),
        ProfileStatCardItem("favorites", "Favoritos", "$favoritesCount", "❤️", Color(0xFFFFF1F2), Color(0xFFE11D48))
    )

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Resumen de Mi Cuenta",
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 6.dp)
        )

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 4.dp)
        ) {
            items(stats) { item ->
                StatCard(item = item, onClick = { onStatClick(item.id) })
            }
        }
    }
}

@Composable
private fun StatCard(
    item: ProfileStatCardItem,
    onClick: () -> Unit
) {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1.0f,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "scaleAnim"
    )

    Card(
        modifier = Modifier
            .width(135.dp)
            .scale(scale)
            .clickable { onClick() }
            .shadow(3.dp, shape = RoundedCornerShape(16.dp)),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = item.bgColor)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(item.emoji, fontSize = 22.sp)
                Text(
                    text = item.title,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = item.textColor.copy(alpha = 0.8f)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = item.value,
                fontWeight = FontWeight.Black,
                fontSize = 17.sp,
                color = item.textColor
            )
        }
    }
}
