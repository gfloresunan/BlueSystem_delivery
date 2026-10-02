package com.example.presentation.customer.cart

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.Address
import com.example.ui.theme.BluePrimary

@Composable
fun CheckoutStepContent(
    userAddresses: List<Address>,
    selectedSavedAddressId: String?,
    onSelectSavedAddress: (String) -> Unit,
    isCustomAddressSelected: Boolean,
    onSelectCustomAddress: () -> Unit,
    customAddressText: String,
    onCustomAddressChange: (String) -> Unit,
    customLatitude: Double = 0.0,
    customLongitude: Double = 0.0,
    isResolvingCoordinates: Boolean = false,
    onTriggerGps: () -> Unit = {},
    deliveryNoteText: String = "",
    onDeliveryNoteChange: (String) -> Unit = {},
    selectedPaymentMethod: String,
    onSelectPaymentMethod: (String) -> Unit,
    groupedBizCount: Int,
    subtotal: Double = 0.0,
    additionalChargeAmount: Double = 0.0,
    tipAmount: Double = 0.0,
    discountAmount: Double = 0.0,
    grandTotal: Double,
    commerceQuote: com.example.presentation.customer.CommerceDeliveryQuote? = null,
    isCalculatingCommerceQuote: Boolean = false,
    quoteErrorMessage: String? = null,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // ── PASO 2: CHECKOUT (DIRECCIÓN & MÉTODOS DE PAGO) ────────────────
        Text(
            text = "📍 DIRECCIÓN DE ENTREGA",
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            color = BluePrimary
        )

        if (userAddresses.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                userAddresses.forEach { addr ->
                    val isSelected = !isCustomAddressSelected && selectedSavedAddressId == addr.id
                    val iconVector = when (addr.label.lowercase()) {
                        "casa", "home" -> Icons.Default.Home
                        "trabajo", "work", "oficina" -> Icons.Default.Work
                        else -> Icons.Default.Place
                    }

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelectSavedAddress(addr.id) },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerLow
                        ),
                        border = BorderStroke(
                            if (isSelected) 2.dp else 1.dp,
                            if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                iconVector,
                                contentDescription = null,
                                tint = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(22.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    addr.label.ifBlank { "Dirección Guardada" },
                                    fontWeight = FontWeight.Black,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    addr.fullAddress,
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                            if (isSelected) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = "Seleccionada",
                                    tint = BluePrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectCustomAddress() },
                    colors = CardDefaults.cardColors(
                        containerColor = if (isCustomAddressSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerLow
                    ),
                    border = BorderStroke(
                        if (isCustomAddressSelected) 2.dp else 1.dp,
                        if (isCustomAddressSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(
                            Icons.Default.AddLocation,
                            contentDescription = null,
                            tint = if (isCustomAddressSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(22.dp)
                        )
                        Text(
                            "➕ Usar otra dirección",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = if (isCustomAddressSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }

        if (isCustomAddressSelected || userAddresses.isEmpty()) {
            OutlinedTextField(
                value = customAddressText,
                onValueChange = onCustomAddressChange,
                placeholder = {
                    Text(
                        "Ej: Semáforos UCA 2c al lago, Casa #45",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = BluePrimary) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                maxLines = 3,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BluePrimary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface
                )
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Botón GPS y estado de geolocalización
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(
                    onClick = onTriggerGps,
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = BluePrimary),
                    border = BorderStroke(1.dp, BluePrimary.copy(alpha = 0.6f)),
                    modifier = Modifier.height(34.dp)
                ) {
                    if (isResolvingCoordinates) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = BluePrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Ubicando...", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    } else {
                        Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(14.dp), tint = BluePrimary)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Usar mi GPS", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                if (customLatitude != 0.0 && customLongitude != 0.0) {
                    Surface(
                        color = Color(0xFF10B981).copy(alpha = 0.15f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Ubicación fijada",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF059669)
                            )
                        }
                    }
                } else {
                    Text(
                        "⚠️ GPS recomendado",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFFD97706)
                    )
                }
            }
        }

        // ── RESUMEN DE ENVÍO DINÁMICO (CORE ROUTING A->B) ────────────────
        if (isCalculatingCommerceQuote) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF0F9FF)),
                border = BorderStroke(1.dp, Color(0xFF38BDF8))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = BluePrimary)
                    Text("Calculando distancia vial y tarifa oficial...", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BluePrimary)
                }
            }
        } else if (commerceQuote != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                border = BorderStroke(1.5.dp, Color(0xFF0284C7))
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🚚", fontSize = 15.sp)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("RESUMEN DE ENVÍO", fontSize = 12.sp, fontWeight = FontWeight.Black, color = Color(0xFF0284C7))
                        }
                        Surface(
                            color = Color(0xFFE0F2FE),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "Ruta Vial Real",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF0369A1),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                    HorizontalDivider(color = Color(0xFFE2E8F0))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Distancia de entrega", fontSize = 12.sp, color = Color(0xFF475569))
                        Text("${String.format(java.util.Locale.US, "%.2f", commerceQuote.routeDistanceKm)} km", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Costo de envío", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                        Text("C$ ${String.format(java.util.Locale.US, "%.2f", commerceQuote.deliveryFee)}", fontSize = 13.sp, fontWeight = FontWeight.Black, color = Color(0xFF0284C7))
                    }
                }
            }
        } else if (quoteErrorMessage != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                border = BorderStroke(1.dp, Color(0xFFFCA5A5))
            ) {
                Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("⚠️ $quoteErrorMessage", fontSize = 11.sp, color = Color(0xFFB91C1C), fontWeight = FontWeight.Medium)
                }
            }
        }

        Spacer(modifier = Modifier.height(2.dp))

        // ── NOTA DE ENTREGA (OPCIONAL) ──────────────────────────────────
        Text(
            text = "📝 NOTA DE ENTREGA (OPCIONAL)",
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            color = BluePrimary
        )

        OutlinedTextField(
            value = deliveryNoteText,
            onValueChange = { if (it.length <= 200) onDeliveryNoteChange(it) },
            placeholder = {
                Text(
                    "Ej: Tocar el timbre azul, dejar con recepción, llamar al llegar...",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            leadingIcon = { Icon(Icons.Default.EditNote, contentDescription = null, tint = BluePrimary) },
            trailingIcon = {
                Text(
                    text = "${deliveryNoteText.length}/200",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(end = 8.dp)
                )
            },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            maxLines = 2,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BluePrimary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
            )
        )

        Spacer(modifier = Modifier.height(2.dp))
        Text("💳 MÉTODO DE PAGO", fontSize = 12.sp, fontWeight = FontWeight.Black, color = BluePrimary)

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Opción 1: Efectivo (Habilitada y Certificada)
            val isCashSelected = selectedPaymentMethod == "efectivo"
            Card(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onSelectPaymentMethod("efectivo") },
                colors = CardDefaults.cardColors(
                    containerColor = if (isCashSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerLow
                ),
                border = BorderStroke(
                    if (isCashSelected) 2.dp else 1.dp,
                    if (isCashSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                )
            ) {
                Box(modifier = Modifier.padding(10.dp), contentAlignment = Alignment.Center) {
                    Text(
                        "💵 Efectivo",
                        fontWeight = FontWeight.Black,
                        fontSize = 13.sp,
                        color = if (isCashSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            // Opción 2: Tarjeta (Deshabilitada con Payment Activation Gate)
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest.copy(alpha = 0.5f)
                ),
                border = BorderStroke(
                    1.dp,
                    MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "💳 Tarjeta",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Surface(
                        color = Color(0xFFE2E8F0),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            "Próximamente",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF64748B),
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        // Desglose consolidado del Paso 2
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
        ) {
            Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Subtotal productos", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("C$ ${String.format(java.util.Locale.US, "%.2f", subtotal)}", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Envío", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (commerceQuote != null) {
                        Text("C$ ${String.format(java.util.Locale.US, "%.2f", commerceQuote.deliveryFee)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0284C7))
                    } else if (isCalculatingCommerceQuote) {
                        Text("Calculando...", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Color(0xFF64748B))
                    } else {
                        Text("Pendiente de ruta", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = Color(0xFFD97706))
                    }
                }
                if (additionalChargeAmount > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Cargo de servicio", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("(+) C$ ${String.format(java.util.Locale.US, "%.2f", additionalChargeAmount)}", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
                if (discountAmount > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Descuento", fontSize = 12.sp, color = Color(0xFF10B981))
                        Text("-C$ ${String.format(java.util.Locale.US, "%.2f", discountAmount)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                    }
                }
                if (tipAmount > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Propina al repartidor", fontSize = 12.sp, color = Color(0xFFF59E0B))
                        Text("(+) C$ ${String.format(java.util.Locale.US, "%.2f", tipAmount)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
                    }
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("TOTAL FINAL", fontSize = 14.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                    Text("C$ ${String.format(java.util.Locale.US, "%.2f", grandTotal)}", fontSize = 15.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}
