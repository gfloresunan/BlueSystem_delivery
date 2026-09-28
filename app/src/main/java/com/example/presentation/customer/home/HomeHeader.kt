package com.example.presentation.customer.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary

@Composable
fun HomeHeader(
    currentUserName: String,
    unreadCount: Int,
    cartItemCount: Int,
    deliveryAddressForOrder: String,
    searchQueryText: String,
    onSearchQueryChange: (String) -> Unit,
    showSearchBar: Boolean,
    onToggleSearchBar: () -> Unit,
    onClearSearch: () -> Unit,
    onVoiceSearchClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    onCartClick: () -> Unit,
    onAddressClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    // 1. TOPBAR CON GRADIENTE AZUL/CELESTE Y BUSCADOR
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.horizontalGradient(
                    colors = listOf(BluePrimary, BlueSecondary)
                )
            )
            .padding(bottom = 20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            // Header Enterprise Sprint 15 (Avatar, Saludo, Notificaciones & Carrito)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Bloque de Usuario (Avatar y Saludo) - AISLADO CON WEIGHT
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .shadow(4.dp, CircleShape)
                            .background(Color.White, CircleShape)
                            .border(2.dp, Color.White.copy(alpha = 0.6f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = currentUserName.take(1).uppercase(),
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp,
                            color = BluePrimary
                        )
                    }
                    Column(modifier = Modifier.weight(1f, fill = false)) {
                        Text(
                            text = "Hola, $currentUserName",
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "¡Bienvenido! 👋",
                            fontWeight = FontWeight.Medium,
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.9f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "¿Qué deseas pedir hoy?",
                            fontSize = 10.sp,
                            color = Color.White.copy(alpha = 0.75f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Iconos de Notificaciones y Carrito a la Derecha con Sombras - ÁREA PROTEGIDA
                Row(
                    modifier = Modifier.wrapContentWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Botón Notificaciones
                    Surface(
                        shape = CircleShape,
                        color = Color.White.copy(alpha = 0.2f),
                        modifier = Modifier.size(40.dp)
                    ) {
                        IconButton(onClick = onNotificationsClick) {
                            if (unreadCount > 0) {
                                BadgedBox(badge = { Badge { Text(unreadCount.toString(), fontSize = 9.sp) } }) {
                                    Icon(Icons.Outlined.Notifications, contentDescription = "Notificaciones", tint = Color.White, modifier = Modifier.size(22.dp))
                                }
                            } else {
                                Icon(Icons.Outlined.Notifications, contentDescription = "Notificaciones", tint = Color.White, modifier = Modifier.size(22.dp))
                            }
                        }
                    }

                    // Botón Carrito
                    Surface(
                        shape = CircleShape,
                        color = Color.White.copy(alpha = 0.2f),
                        modifier = Modifier.size(40.dp)
                    ) {
                        IconButton(onClick = onCartClick) {
                            if (cartItemCount > 0) {
                                BadgedBox(badge = { Badge(containerColor = Color(0xFFEF4444)) { Text(cartItemCount.toString(), fontSize = 9.sp, color = Color.White) } }) {
                                    Icon(Icons.Default.ShoppingCart, contentDescription = "Carrito", tint = Color.White, modifier = Modifier.size(22.dp))
                                }
                            } else {
                                Icon(Icons.Default.ShoppingCart, contentDescription = "Carrito", tint = Color.White, modifier = Modifier.size(22.dp))
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Selector de Dirección
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onAddressClick() }
            ) {
                Icon(Icons.Default.LocationOn, contentDescription = "Ubicación", tint = Color.White, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Entregar en: ", fontSize = 11.sp, color = Color.White.copy(alpha = 0.85f))
                Text(deliveryAddressForOrder, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Buscador Integrado
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onToggleSearchBar() },
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                if (showSearchBar) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        TextField(
                            value = searchQueryText,
                            onValueChange = onSearchQueryChange,
                            placeholder = { Text("Locales, platos y productos...", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent
                            )
                        )
                        if (searchQueryText.isNotEmpty()) {
                            IconButton(onClick = onClearSearch) {
                                Icon(Icons.Default.Close, contentDescription = "Limpiar", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        IconButton(onClick = onVoiceSearchClick) {
                            Icon(Icons.Default.Mic, contentDescription = "Voz", tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                } else {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Search, contentDescription = "Buscar", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = if (searchQueryText.isEmpty()) "Locales, platos y productos..." else "🔍 \"$searchQueryText\"",
                            color = if (searchQueryText.isEmpty()) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                            fontSize = 14.sp,
                            modifier = Modifier.weight(1f)
                        )
                        Icon(
                            Icons.Default.Mic,
                            contentDescription = "Micrófono",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier
                                .size(24.dp)
                                .clickable { onVoiceSearchClick() }
                        )
                    }
                }
            }
        }
    }
}
