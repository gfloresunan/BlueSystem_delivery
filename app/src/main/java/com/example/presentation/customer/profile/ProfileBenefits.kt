package com.example.presentation.customer.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Percent
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.Customer360Stats

@Composable
fun ProfileBenefits(
    stats: Customer360Stats,
    loyaltyLevel: String,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Mis Beneficios & Customer 360 👑",
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 6.dp)
        )

        // Permanent VIP Benefit Banner
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF59E0B))
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFF59E0B)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Percent, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Descuento Permanente Cliente $loyaltyLevel", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFF92400E))
                    Text("10% de Descuento Automático en todos tus pedidos", fontSize = 12.sp, color = Color(0xFFB45309))
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Customer 360 Insights Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Analytics, contentDescription = null, tint = Color(0xFF6366F1), modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Perfil del Cliente (Customer 360)", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                }

                Spacer(modifier = Modifier.height(12.dp))

                listOf(
                    "Última compra:" to stats.lastPurchaseDate,
                    "Ticket promedio:" to "C$ ${stats.avgTicket}",
                    "Horario favorito:" to stats.favoriteHour,
                    "Categoría favorita:" to stats.favoriteCategory,
                    "Comercio favorito:" to stats.favoriteMerchant,
                    "Ahorro total generado:" to "C$ ${stats.totalSavings}"
                ).forEach { (label, value) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(label, fontSize = 12.sp, color = Color.Gray)
                        Text(value, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                    }
                }
            }
        }
    }
}
