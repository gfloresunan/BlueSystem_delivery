package com.example.presentation.business.commerce

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus

@Composable
fun ProductCardEnterprise(
    product: Product,
    isSelectionMode: Boolean,
    isSelected: Boolean,
    onSelectToggle: () -> Unit,
    onEdit: () -> Unit,
    onDuplicate: () -> Unit,
    onToggleStatus: () -> Unit,
    onQuickPriceUpdate: (Double) -> Unit,
    onDelete: () -> Unit
) {
    var showQuickPriceDialog by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    val isActive = product.status == ProductStatus.ACTIVE
    val statusColor = if (isActive) Color(0xFF22C55E) else Color(0xFFEF4444)
    val statusBg = if (isActive) Color(0xFFF0FDF4) else Color(0xFFFEF2F2)
    val statusText = if (isActive) "Disponible" else "Agotado"
    val stockVal = product.stockQuantity ?: 0

    Surface(
        shape = RoundedCornerShape(18.dp),
        color = Color.White,
        border = BorderStroke(
            1.5.dp,
            if (isSelected) Color(0xFF2563EB) else Color(0xFFE2E8F0)
        ),
        shadowElevation = if (isSelected) 4.dp else 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable {
                if (isSelectionMode) onSelectToggle() else onEdit()
            }
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Checkbox Selección Múltiple
                if (isSelectionMode) {
                    Checkbox(
                        checked = isSelected,
                        onCheckedChange = { onSelectToggle() },
                        colors = CheckboxDefaults.colors(checkedColor = Color(0xFF2563EB))
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                }

                // Foto del Producto
                val mainImage = product.getMainImage()
                Box(contentAlignment = Alignment.TopStart) {
                    if (mainImage.isNotBlank()) {
                        AsyncImage(
                            model = mainImage,
                            contentDescription = product.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(68.dp)
                                .clip(RoundedCornerShape(14.dp))
                        )
                    } else {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color(0xFFF1F5F9),
                            modifier = Modifier.size(68.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Fastfood, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(32.dp))
                            }
                        }
                    }

                    // Badge BDL Status
                    Surface(
                        shape = CircleShape,
                        color = statusColor,
                        modifier = Modifier
                            .padding(4.dp)
                            .size(10.dp)
                    ) {}
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Info del Producto
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Text(
                            text = product.name,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = statusBg
                        ) {
                            Text(
                                text = statusText,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = statusColor,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Text(
                        text = product.categoryName.ifBlank { "General" },
                        fontSize = 11.sp,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Precio con Edición Inline al Tocar
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFEFF6FF),
                            border = BorderStroke(1.dp, Color(0xFFBFDBFE)),
                            modifier = Modifier.clickable { showQuickPriceDialog = true }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "C$ ${product.price.toInt()}",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color(0xFF1E40AF)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(Icons.Default.Edit, contentDescription = "Editar precio", tint = Color(0xFF2563EB), modifier = Modifier.size(12.dp))
                            }
                        }

                        // Rating & Stock
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(13.dp))
                            Spacer(modifier = Modifier.width(2.dp))
                            Text("4.8", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (stockVal > 0) "Stock: $stockVal" else "Sin Stock",
                                fontSize = 11.sp,
                                color = if (stockVal > 0) Color(0xFF64748B) else Color(0xFFEF4444),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = Color(0xFFF1F5F9), thickness = 1.dp)
            Spacer(modifier = Modifier.height(6.dp))

            // Barra de Acciones Rápidas & Switch Inline
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = onEdit,
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("Editar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = onDuplicate,
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(3.dp))
                        Text("Duplicar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    Box {
                        IconButton(
                            onClick = { showMenu = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.MoreVert, contentDescription = "Más opciones", tint = Color(0xFF64748B), modifier = Modifier.size(18.dp))
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Eliminar producto", color = Color(0xFFEF4444), fontSize = 12.sp) },
                                onClick = { showMenu = false; onDelete() },
                                leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp)) }
                            )
                        }
                    }
                }

                // Switch Inline de Disponibilidad
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = if (isActive) "Disponible" else "Pausado",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isActive) Color(0xFF15803D) else Color(0xFF991B1B)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Switch(
                        checked = isActive,
                        onCheckedChange = { onToggleStatus() },
                        modifier = Modifier.scale(0.85f),
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = Color(0xFF22C55E)
                        )
                    )
                }
            }
        }
    }

    // Modal Popover de Edición Rápida de Precio
    if (showQuickPriceDialog) {
        var priceInput by remember { mutableStateOf(product.price.toInt().toString()) }

        AlertDialog(
            onDismissRequest = { showQuickPriceDialog = false },
            title = { Text("⚡ Cambiar precio rápido", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column {
                    Text(product.name, fontSize = 13.sp, color = Color(0xFF64748B))
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = priceInput,
                        onValueChange = { priceInput = it },
                        label = { Text("Precio en C$") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = {
                            val newP = priceInput.toDoubleOrNull()
                            if (newP != null && newP > 0) {
                                onQuickPriceUpdate(newP)
                                showQuickPriceDialog = false
                            }
                        }),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val newP = priceInput.toDoubleOrNull()
                        if (newP != null && newP > 0) {
                            onQuickPriceUpdate(newP)
                            showQuickPriceDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                ) {
                    Text("Guardar Precio")
                }
            },
            dismissButton = {
                TextButton(onClick = { showQuickPriceDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}
