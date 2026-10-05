package com.example.presentation.customer.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.BusinessInfo
import com.example.presentation.customer.components.PublicBusinessCard

import com.example.BlockActionConfig

/**
 * Componente Modular de UI: Sección Catálogo General - Todos los Comercios (BSD-CUSTOMER-MARKETPLACE-CATALOG-UNIFICATION-001)
 *
 * Muestra el catálogo general de todos los comercios públicos y activos del Marketplace,
 * independientemente de su estado editorial de destacados (isFeatured).
 * Soporta títulos dinámicos y acciones de encabezado gobernadas por Dashboard Manager Enterprise.
 */
@Composable
fun AllBusinessesSection(
    publicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    modifier: Modifier = Modifier,
    title: String = "Todos los Comercios 🏪",
    headerAction: BlockActionConfig? = null,
    onHeaderActionClick: ((BlockActionConfig) -> Unit)? = null
) {
    Column(modifier = modifier.fillMaxWidth()) {
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
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (publicBusinesses.isNotEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerHigh,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                    ) {
                        Text(
                            text = "${publicBusinesses.size} disponibles",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }
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
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (publicBusinesses.isEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "No hay comercios disponibles en este momento.",
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
                items(publicBusinesses) { business ->
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
