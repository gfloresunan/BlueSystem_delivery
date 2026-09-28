package com.example.presentation.customer.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.BusinessInfo
import com.example.presentation.customer.components.PublicBusinessCard

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — CURATED BUSINESS SECTIONS
 * Protocolo: BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001
 * Implementa las reglas semánticas y contratos de P0-04, P0-05, P0-06, S-02, S-03.
 */

@Composable
fun SamePriceSection(
    showSamePrice: Boolean,
    publicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!showSamePrice) return

    val samePriceList = remember(publicBusinesses) {
        val nowMs = System.currentTimeMillis()
        val ninetyDaysMs = 90L * 24 * 60 * 60 * 1000 // Validez de certificación: 90 días (Addendum S-03)
        publicBusinesses.filter { biz ->
            if (!biz.isOpen || !biz.priceParityVerified) return@filter false
            val certTime = biz.priceParityVerifiedAt?.toDate()?.time
            if (certTime != null && (nowMs - certTime) > ninetyDaysMs) {
                return@filter false // Certificación caducada
            }
            true
        }.take(10)
    }
    if (samePriceList.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Mismo Precio que en Local 💰",
            fontWeight = FontWeight.ExtraBold,
            fontSize = 18.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(samePriceList, key = { it.id }) { business ->
                PublicBusinessCard(
                    business = business,
                    isFavorite = favoriteIds.contains(business.id),
                    onToggleFavorite = { onToggleFavorite(business.id) },
                    onClick = { onBusinessClick(business.id) }
                )
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}

@Composable
fun TopSellingSection(
    showTopSelling: Boolean,
    publicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!showTopSelling) return

    val topList = remember(publicBusinesses) {
        // Business-Level ordenado por métrica canónica unitsSold30d (BSD-C2D-TOPSELLING-RECOMMENDED-SEMANTIC-CORRECTION-001)
        publicBusinesses.filter { it.isOpen && it.unitsSold30d > 0 }
            .sortedByDescending { it.unitsSold30d }
            .take(10)
    }
    if (topList.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Los Más Vendidos 🔥",
            fontWeight = FontWeight.ExtraBold,
            fontSize = 18.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(topList, key = { it.id }) { business ->
                PublicBusinessCard(
                    business = business,
                    isFavorite = favoriteIds.contains(business.id),
                    onToggleFavorite = { onToggleFavorite(business.id) },
                    onClick = { onBusinessClick(business.id) }
                )
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}

@Composable
fun RecommendedSection(
    showRecommended: Boolean,
    publicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!showRecommended) return

    val recommendedList = remember(publicBusinesses) {
        // Consumo directo de la lista calculada por RecommendationEngine y deduplicada
        publicBusinesses.filter { it.isOpen }.take(10)
    }
    if (recommendedList.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Recomendados para ti 🎯",
            fontWeight = FontWeight.ExtraBold,
            fontSize = 18.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(recommendedList, key = { it.id }) { business ->
                PublicBusinessCard(
                    business = business,
                    isFavorite = favoriteIds.contains(business.id),
                    onToggleFavorite = { onToggleFavorite(business.id) },
                    onClick = { onBusinessClick(business.id) }
                )
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}

@Composable
fun NewBusinessesSection(
    showNewBusinesses: Boolean,
    publicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!showNewBusinesses) return

    val newList = remember(publicBusinesses) {
        // Regla P0-05: activatedAt >= now - 30 days. Si activatedAt == null -> NOT ELIGIBLE.
        // Prohibido utilizar approvedAt como fallback.
        val thirtyDaysAgoMs = System.currentTimeMillis() - (30L * 24 * 60 * 60 * 1000)
        publicBusinesses.filter { biz ->
            val activatedMs = biz.activatedAt?.toDate()?.time ?: return@filter false
            activatedMs >= thirtyDaysAgoMs
        }.sortedByDescending { it.activatedAt!!.toDate().time }.take(8)
    }
    if (newList.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Comercios Nuevos 🟢",
            fontWeight = FontWeight.ExtraBold,
            fontSize = 18.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(newList, key = { it.id }) { business ->
                PublicBusinessCard(
                    business = business,
                    isFavorite = favoriteIds.contains(business.id),
                    onToggleFavorite = { onToggleFavorite(business.id) },
                    onClick = { onBusinessClick(business.id) }
                )
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}

@Composable
fun FavoritesBlockSection(
    showFavorites: Boolean,
    publicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onBusinessClick: (businessId: String) -> Unit,
    onToggleFavorite: (businessId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    if (!showFavorites || favoriteIds.isEmpty()) return

    val favList = remember(publicBusinesses, favoriteIds) {
        // INMUNIDAD ABSOLUTA a M=2 (Addendum P0-04)
        publicBusinesses.filter { favoriteIds.contains(it.id) }
    }
    if (favList.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Tus Comercios Favoritos ❤️",
            fontWeight = FontWeight.ExtraBold,
            fontSize = 18.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            items(favList, key = { it.id }) { business ->
                PublicBusinessCard(
                    business = business,
                    isFavorite = true,
                    onToggleFavorite = { onToggleFavorite(business.id) },
                    onClick = { onBusinessClick(business.id) }
                )
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
    }
}
