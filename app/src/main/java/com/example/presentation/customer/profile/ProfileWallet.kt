package com.example.presentation.customer.profile

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCard
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.WalletInfo

@Composable
fun ProfileWallet(
    walletInfo: WalletInfo,
    onTopUpClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var showTopUpDialog by remember { mutableStateOf(false) }

    if (showTopUpDialog) {
        AlertDialog(
            onDismissRequest = { showTopUpDialog = false },
            title = { Text("Recargar Saldo BlueSystem 💰", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Selecciona el monto a recargar:", fontSize = 13.sp)
                    listOf(100.0, 250.0, 500.0, 1000.0).forEach { amount ->
                        Button(
                            onClick = {
                                onTopUpClick()
                                showTopUpDialog = false
                                Toast.makeText(context, "¡Recarga de C$ $amount procesada con éxito!", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Recargar C$ ${amount.toInt()}.00", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showTopUpDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Mi Cartera & Métodos de Pago 💰",
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 6.dp)
        )

        // Wallet Balance Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(6.dp, shape = RoundedCornerShape(20.dp)),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Color(0xFF059669), Color(0xFF10B981), Color(0xFF047857))
                        )
                    )
                    .padding(18.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.AccountBalanceWallet, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Saldo BlueSystem Wallet", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color.White.copy(alpha = 0.9f))
                        }
                        Button(
                            onClick = { showTopUpDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("+ Recargar", color = Color(0xFF047857), fontWeight = FontWeight.Black, fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "${walletInfo.currency} ${String.format("%.2f", walletInfo.balance)}",
                        fontWeight = FontWeight.Black,
                        fontSize = 28.sp,
                        color = Color.White
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text("Disponible para compras instantáneas sin comisión", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Payment Methods Grid
        Text("Métodos de Pago Aceptados:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                Triple("Tarjetas", Icons.Default.CreditCard, Color(0xFF3B82F6)),
                Triple("Transf.", Icons.Default.QrCode, Color(0xFF8B5CF6)),
                Triple("Wallet", Icons.Default.AccountBalanceWallet, Color(0xFF10B981)),
                Triple("Efectivo", Icons.Default.Payments, Color(0xFFF59E0B))
            ).forEach { (label, icon, col) ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = col.copy(alpha = 0.12f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, col.copy(alpha = 0.3f)),
                    modifier = Modifier.weight(1f)
                ) {
                    Column(
                        modifier = Modifier.padding(10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(icon, contentDescription = null, tint = col, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = col)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Recent Wallet Movements
        Text("Últimos Movimientos:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
        Spacer(modifier = Modifier.height(6.dp))

        walletInfo.movements.take(3).forEach { tx ->
            val isPositive = tx.amount > 0
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(tx.description, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF0F172A))
                    Text(tx.date, fontSize = 10.sp, color = Color.Gray)
                }
                Text(
                    text = "${if (isPositive) "+" else ""}${walletInfo.currency} ${tx.amount}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = if (isPositive) Color(0xFF059669) else Color(0xFFDC2626)
                )
            }
            HorizontalDivider(color = Color(0xFFF1F5F9))
        }
    }
}
