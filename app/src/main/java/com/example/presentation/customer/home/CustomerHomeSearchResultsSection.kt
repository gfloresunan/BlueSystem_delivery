package com.example.presentation.customer.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.domain.engine.intelligence.CustomerSearchResult
import com.example.domain.engine.intelligence.CustomerSearchResults
import com.example.domain.engine.intelligence.CustomerSearchResultType
import com.example.presentation.customer.search.GlobalSearchResultItemCard

/**
 * Sección modular de resultados de búsqueda global en Customer Home (Fase 5E.3 - BSD-CUSTOMER-HOME-5E-MOD-001).
 * Preserva al 100% las pestañas de filtrado (TODOS, COMERCIOS, PLATOS, COMBOS, PROMOCIONES),
 * la disposición visual vertical y el composable canónico GlobalSearchResultItemCard.
 */
@Composable
fun CustomerHomeSearchResultsSection(
    searchQueryText: String,
    searchResults: CustomerSearchResults,
    selectedSearchFilter: String,
    onSearchFilterSelected: (String) -> Unit,
    onClearSearch: () -> Unit,
    navController: NavController,
    modifier: Modifier = Modifier
) {
    val activeResultsList: List<CustomerSearchResult> = remember(searchResults, selectedSearchFilter) {
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
                Text(
                    text = "Limpiar",
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Pestañas de filtrado rápido de entidades
        val filterTabs: List<Triple<String, String, Int>> = listOf(
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
                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { onSearchFilterSelected(tabKey) }
                ) {
                    Text(
                        text = "$tabTitle ($tabCount)",
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (activeResultsList.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.SearchOff,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.size(48.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "No se encontraron coincidencias para \"$searchQueryText\"",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 14.sp
                )
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                for (result in activeResultsList) {
                    GlobalSearchResultItemCard(
                        result = result,
                        onClick = {
                            when (result.type) {
                                CustomerSearchResultType.BUSINESS -> {
                                    navController.navigate("comercio_detalle_screen/${result.id}")
                                }
                                CustomerSearchResultType.PRODUCT,
                                CustomerSearchResultType.COMBO -> {
                                    if (result.businessId.isNotBlank()) {
                                        navController.navigate("comercio_detalle_screen/${result.businessId}?productId=${result.id}")
                                    }
                                }
                                CustomerSearchResultType.PROMOTION -> {
                                    if (result.businessId.isNotBlank()) {
                                        navController.navigate("comercio_detalle_screen/${result.businessId}")
                                    }
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}
