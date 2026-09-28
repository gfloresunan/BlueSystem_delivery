package com.example.presentation.customer.cart

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.RemoveCircleOutline
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.CartItem
import com.example.data.repository.BusinessInfo

@Composable
fun CartItemsStepContent(
    cartItems: List<CartItem>,
    groupedByBiz: Map<String, List<CartItem>>,
    bizDeliveryFees: Map<String, Double>,
    publicBusinesses: List<BusinessInfo>,
    subtotal: Double,
    totalDeliveryFees: Double,
    additionalChargeAmount: Double = 0.0,
    additionalChargeDescription: String = "Cargo adicional",
    tipAmount: Double = 0.0,
    tipSelectionType: String = "NONE",
    customTipInput: String = "",
    onTipPresetSelected: (Double, String) -> Unit = { _, _ -> },
    onCustomTipChange: (String) -> Unit = {},
    appliedCouponDiscount: Double,
    appliedCouponCode: String?,
    grandTotal: Double,
    couponCodeInput: String,
    onCouponCodeChange: (String) -> Unit,
    isValidatingCoupon: Boolean,
    couponValidationMessage: String?,
    onApplyCoupon: (String) -> Unit,
    onIncrementQuantity: (String) -> Unit,
    onDecrementQuantity: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val focusManager = LocalFocusManager.current

    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (cartItems.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.ShoppingCart,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Tu carrito está vacío 🛒",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Agregá productos desde el menú de cualquier comercio.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            // ── PASO 1: REVISIÓN DE CARRITO MULTI-COMERCIO ─────────────────────
            groupedByBiz.forEach { (bizId, bizItems) ->
                val bizName = bizItems.firstOrNull { it.businessName.isNotBlank() }?.businessName
                    ?: publicBusinesses.find { it.id == bizId }?.getEffectiveName()
                    ?: "Comercio"
                val fee = bizDeliveryFees[bizId] ?: 45.0

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "🏪 $bizName",
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))

                        bizItems.forEach { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        item.productName,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        "C$ ${String.format("%.2f", item.price)} c/u",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    IconButton(
                                        onClick = { onDecrementQuantity(item.productId) },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.RemoveCircleOutline,
                                            contentDescription = "Menos",
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }

                                    Text(
                                        text = "${item.quantity}",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.padding(horizontal = 4.dp)
                                    )

                                    IconButton(
                                        onClick = { onIncrementQuantity(item.productId) },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.AddCircle,
                                            contentDescription = "Más",
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }

                                    IconButton(
                                        onClick = { onRemoveItem(item.productId) },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.DeleteOutline,
                                            contentDescription = "Eliminar",
                                            tint = Color(0xFFEF4444),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(2.dp))

            // Sección de Código de Cupón / Descuento 🎟️
            CouponSection(
                couponCodeInput = couponCodeInput,
                onCouponCodeChange = onCouponCodeChange,
                isValidatingCoupon = isValidatingCoupon,
                appliedCouponCode = appliedCouponCode,
                couponValidationMessage = couponValidationMessage,
                onApplyCoupon = onApplyCoupon
            )

            Spacer(modifier = Modifier.height(2.dp))

            // ── SECCIÓN DE PROPINA AL REPARTIDOR (100% VOLUNTARIA) ────────────
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.VolunteerActivism,
                            contentDescription = null,
                            tint = Color(0xFFF59E0B),
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "Propina a repartidor",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "La propina es voluntaria y va 100% al repartidor.",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // Botones de presets
                    val presets = listOf(
                        Triple("C$10", 10.0, "PRESET_10"),
                        Triple("C$20", 20.0, "PRESET_20"),
                        Triple("C$30", 30.0, "PRESET_30"),
                        Triple("C$40", 40.0, "PRESET_40")
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        presets.forEach { (label, amount, key) ->
                            val isSelected = tipSelectionType == key && tipAmount == amount
                            OutlinedButton(
                                onClick = { onTipPresetSelected(amount, key) },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(36.dp),
                                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                    contentColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                ),
                                border = BorderStroke(
                                    if (isSelected) 2.dp else 1.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
                                )
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium
                                )
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        // Botón Otro Monto
                        val isCustomSelected = tipSelectionType == "CUSTOM"
                        OutlinedButton(
                            onClick = {
                                val parsed = customTipInput.toDoubleOrNull() ?: 0.0
                                onTipPresetSelected(parsed, "CUSTOM")
                            },
                            modifier = Modifier
                                .weight(1f)
                                .height(36.dp),
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = if (isCustomSelected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                                contentColor = if (isCustomSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                            ),
                            border = BorderStroke(
                                if (isCustomSelected) 2.dp else 1.dp,
                                if (isCustomSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant
                            )
                        ) {
                            Text(
                                text = "Otro monto",
                                fontSize = 11.sp,
                                fontWeight = if (isCustomSelected) FontWeight.Black else FontWeight.Medium
                            )
                        }

                        // Botón Sin Propina
                        val isNoneSelected = tipSelectionType == "NONE" || (tipAmount == 0.0 && tipSelectionType != "CUSTOM")
                        OutlinedButton(
                            onClick = { onTipPresetSelected(0.0, "NONE") },
                            modifier = Modifier
                                .weight(1f)
                                .height(36.dp),
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.outlinedButtonColors(
                                containerColor = if (isNoneSelected) MaterialTheme.colorScheme.surfaceVariant else Color.Transparent,
                                contentColor = if (isNoneSelected) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface
                            ),
                            border = BorderStroke(
                                if (isNoneSelected) 2.dp else 1.dp,
                                if (isNoneSelected) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.outlineVariant
                            )
                        ) {
                            Text(
                                text = "Sin propina",
                                fontSize = 11.sp,
                                fontWeight = if (isNoneSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }

                    // Campo de entrada de monto personalizado
                    if (tipSelectionType == "CUSTOM") {
                        OutlinedTextField(
                            value = customTipInput,
                            onValueChange = { input ->
                                val filtered = input.filter { it.isDigit() || it == '.' }
                                onCustomTipChange(filtered)
                            },
                            label = { Text("Otra propina", fontSize = 11.sp) },
                            placeholder = { Text("0.00", fontSize = 11.sp) },
                            prefix = { Text("C$ ", fontWeight = FontWeight.Bold, fontSize = 12.sp) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Decimal,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = { focusManager.clearFocus() }
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(2.dp))

            // Resumen Financiero del Paso 1
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceContainerLow, RoundedCornerShape(12.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Subtotal Productos", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                    Text("C$ ${String.format("%.2f", subtotal)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Envío", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                    Text(
                        "Se calculará al seleccionar\ntu dirección de entrega",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color(0xFF64748B),
                        textAlign = TextAlign.End
                    )
                }
                if (additionalChargeAmount > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(additionalChargeDescription.ifBlank { "Cargo adicional" }, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                        Text("(+) C$ ${String.format("%.2f", additionalChargeAmount)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
                if (appliedCouponDiscount > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Descuento Cupón (${appliedCouponCode ?: ""})", fontSize = 13.sp, color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
                        Text("-C$ ${String.format("%.2f", appliedCouponDiscount)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                    }
                }
                if (tipAmount > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Propina a repartidor", fontSize = 13.sp, color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold)
                        Text("(+) C$ ${String.format("%.2f", tipAmount)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
                    }
                }
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Total Parcial", fontSize = 15.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                    Text("C$ ${String.format("%.2f", grandTotal)}", fontSize = 16.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}
