package com.example.presentation.customer.profile

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.CouponModel

@Composable
fun ProfileCoupons(
    coupons: List<CouponModel>,
    onApplyCoupon: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedFilter by remember { mutableStateOf("activo") } // activo, vencido, usado, promocional, personalizado
    val context = LocalContext.current

    val filters = listOf(
        "activo" to "Activos 🎟️",
        "promocional" to "Promocionales 📢",
        "personalizado" to "Personalizados ⭐",
        "usado" to "Usados ✔️",
        "vencido" to "Vencidos ⏰"
    )

    val filteredCoupons = remember(coupons, selectedFilter) {
        coupons.filter { it.status.equals(selectedFilter, ignoreCase = true) }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Mis Cupones & Promociones",
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 6.dp)
        )

        // Filter Tabs
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 4.dp)
        ) {
            items(filters) { (key, label) ->
                val isSelected = selectedFilter == key
                FilterChip(
                    selected = isSelected,
                    onClick = { selectedFilter = key },
                    label = { Text(label, fontSize = 12.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Color(0xFF6366F1),
                        selectedLabelColor = Color.White,
                        containerColor = Color.White,
                        labelColor = Color(0xFF475569)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (filteredCoupons.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No tienes cupones en la categoría '${selectedFilter.uppercase()}'",
                    color = Color.Gray,
                    fontSize = 13.sp
                )
            }
        } else {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                filteredCoupons.forEach { coupon ->
                    CouponCardItem(
                        coupon = coupon,
                        onCopyCode = { code ->
                            val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                            val clip = android.content.ClipData.newPlainText("Cupón", code)
                            clipboard.setPrimaryClip(clip)
                            Toast.makeText(context, "¡Código $code copiado!", Toast.LENGTH_SHORT).show()
                            onApplyCoupon(code)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun CouponCardItem(
    coupon: CouponModel,
    onCopyCode: (String) -> Unit
) {
    val isExpiredOrUsed = coupon.status in listOf("vencido", "usado")

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = if (isExpiredOrUsed) Color(0xFFF8FAFC) else Color.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon Badge
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (isExpiredOrUsed) Color(0xFFCBD5E1) else Color(0xFFEEF2FF)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.ConfirmationNumber,
                    contentDescription = null,
                    tint = if (isExpiredOrUsed) Color(0xFF64748B) else Color(0xFF4F46E5),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val isCombo = coupon.code.startsWith("CMB-") || coupon.category.equals("COMBO", ignoreCase = true)
                    if (isCombo) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFFEF3C7),
                            modifier = Modifier.wrapContentWidth()
                        ) {
                            Text(
                                text = "🎁 COMBO",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFB45309),
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                                maxLines = 1,
                                softWrap = false
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                    }

                    Text(
                        text = coupon.code,
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        color = if (isExpiredOrUsed) Color.Gray else Color(0xFF0F172A),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFFECFDF5),
                        modifier = Modifier.wrapContentWidth()
                    ) {
                        Text(
                            text = coupon.expiryDate,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF059669),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            maxLines = 1,
                            softWrap = false
                        )
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = coupon.title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    color = Color(0xFF334155),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = coupon.description,
                    fontSize = 11.sp,
                    color = Color.Gray,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (!isExpiredOrUsed) {
                IconButton(onClick = { onCopyCode(coupon.code) }) {
                    Icon(Icons.Default.ContentCopy, contentDescription = "Copiar", tint = Color(0xFF4F46E5), modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}
