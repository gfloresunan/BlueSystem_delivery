package com.example.presentation.customer.search

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.engine.intelligence.CustomerSearchResult
import com.example.domain.engine.intelligence.CustomerSearchResultType
import com.example.domain.engine.intelligence.CustomerSearchResults

@Composable
fun CustomerSearchOverlay(
    searchQueryText: String,
    searchResults: CustomerSearchResults,
    selectedSearchFilter: String,
    onSearchFilterSelected: (String) -> Unit,
    onClearSearch: () -> Unit,
    onAddToCart: (CustomerSearchResult) -> Unit,
    onResultClick: (CustomerSearchResult) -> Unit,
    modifier: Modifier = Modifier
) {
    val activeResultsList = remember(searchResults, selectedSearchFilter) {
        when (selectedSearchFilter) {
            "COMERCIOS" -> searchResults.businesses
            "PLATOS" -> searchResults.products
            "COMBOS" -> searchResults.combos
            "PROMOCIONES" -> searchResults.promotions
            else -> searchResults.allUnified
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Resultados (${searchResults.totalCount})",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            TextButton(onClick = onClearSearch) {
                Text("Limpiar", color = MaterialTheme.colorScheme.primary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Pestañas de filtrado rápido de entidades
        val filterTabs = listOf(
            Triple("TODOS", "Todos", searchResults.totalCount),
            Triple("COMERCIOS", "🏪 Comercios", searchResults.businesses.size),
            Triple("PLATOS", "🛍️ Productos", searchResults.products.size),
            Triple("COMBOS", "🍱 Combos", searchResults.combos.size),
            Triple("PROMOCIONES", "🎁 Promos", searchResults.promotions.size)
        )

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(filterTabs) { (tabKey, tabTitle, tabCount) ->
                val isSelected = selectedSearchFilter == tabKey
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerLow,
                    border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                    modifier = Modifier.clickable { onSearchFilterSelected(tabKey) }
                ) {
                    Text(
                        text = "$tabTitle ($tabCount)",
                        color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        if (searchResults.totalCount == 0) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.SearchOff,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(52.dp)
                    )
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "No encontramos resultados para \"$searchQueryText\"",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Prueba buscando por nombre de plato (ej: pollo, hamburguesa, pizza), combo o restaurante.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else if (activeResultsList.isEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "No hay resultados en la categoría seleccionada.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                    TextButton(onClick = { onSearchFilterSelected("TODOS") }) {
                        Text("Ver todos los resultados (${searchResults.totalCount})", color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        } else {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                activeResultsList.forEach { result ->
                    GlobalSearchResultItemCard(
                        result = result,
                        onAddToCart = if (result.type == CustomerSearchResultType.PRODUCT ||
                            result.type == CustomerSearchResultType.COMBO) {
                            { onAddToCart(result) }
                        } else null,
                        onClick = { onResultClick(result) }
                    )
                }
            }
        }
    }
}
