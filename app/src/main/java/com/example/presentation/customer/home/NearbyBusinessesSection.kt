package com.example.presentation.customer.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.engine.NearbyMerchantEngine
import com.example.presentation.customer.components.PublicBusinessCard
import com.example.ui.theme.BluePrimary

/**
 * Componente Modular de UI: Sección Comercios Cerca de Ti (Actividad #18 Enterprise)
 * PROTOCOL ID: BSDEL-C18-NEARBY-MERCHANTS
 */
import com.example.BlockActionConfig

@Composable
fun NearbyBusinessesSection(
    showNearbySection: Boolean,
    nearbyResult: NearbyMerchantEngine.NearbySearchResult,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    onAddressClick: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = "Comercios Cerca de Ti 🏢",
    headerAction: BlockActionConfig? = null,
    onHeaderActionClick: ((BlockActionConfig) -> Unit)? = null
) {
    if (!showNearbySection) return

    Column(modifier = modifier.fillMaxWidth()) {
        // Header con Título y Badge Dinámico de Proximidad
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = title,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f, fill = false)
            )

            if (headerAction != null && !headerAction.type.equals("NONE", ignoreCase = true) && headerAction.type.isNotBlank()) {
                TextButton(
                    onClick = { onHeaderActionClick?.invoke(headerAction) },
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                ) {
                    Text(
                        text = headerAction.label.ifBlank { "Ver más ›" },
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            } else if (nearbyResult.hasCustomerCoordinates && nearbyResult.items.isNotEmpty()) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (nearbyResult.wasExpanded) Color(0xFFFEF3C7) else Color(0xFFEFF6FF),
                    border = BorderStroke(1.dp, if (nearbyResult.wasExpanded) Color(0xFFF59E0B) else BluePrimary.copy(alpha = 0.3f))
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.NearMe,
                            contentDescription = null,
                            tint = if (nearbyResult.wasExpanded) Color(0xFFB45309) else BluePrimary,
                            modifier = Modifier.size(11.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (nearbyResult.wasExpanded) "Ampliado a ${nearbyResult.activeRadiusKm.toInt()} km" else "${nearbyResult.activeRadiusKm.toInt()} km",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (nearbyResult.wasExpanded) Color(0xFFB45309) else BluePrimary
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Estado 1: Cliente no tiene dirección activa o no tiene coordenadas válidas
        if (!nearbyResult.hasCustomerCoordinates) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = BluePrimary,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Descubre comercios cercanos",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Agrega o selecciona tu dirección para calcular la proximidad exacta.",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    TextButton(
                        onClick = onAddressClick,
                        colors = ButtonDefaults.textButtonColors(contentColor = BluePrimary)
                    ) {
                        Text("Elegir 📍", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
        // Estado 2: Búsqueda ejecutada pero no hay comercios elegibles dentro del radio máximo
        else if (nearbyResult.items.isEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "No encontramos comercios a menos de ${nearbyResult.activeRadiusKm.toInt()} km de tu ubicación.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Explora el catálogo por categorías o intenta con otra dirección de entrega.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                    )
                }
            }
        }
        // Estado 3: Lista de comercios cercanos encontrados ordenados por menor distancia
        else {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                items(nearbyResult.items) { item ->
                    PublicBusinessCard(
                        business = item.business,
                        isFavorite = favoriteIds.contains(item.business.id),
                        distanceText = item.formattedDistance,
                        onToggleFavorite = { onToggleFavorite(item.business.id) },
                        onClick = { onBusinessClick(item.business.id) }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))
    }
}
