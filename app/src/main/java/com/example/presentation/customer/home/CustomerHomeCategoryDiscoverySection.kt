package com.example.presentation.customer.home

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.Screen
import com.example.data.CartItem
import com.example.data.CartManager
import com.example.data.repository.BusinessInfo
import com.example.domain.engine.intelligence.CustomerSearchResult
import com.example.domain.engine.intelligence.CustomerSearchResultType
import com.example.domain.engine.intelligence.EnterpriseSearchEngine
import com.example.domain.model.Category
import com.example.domain.model.Product
import com.example.domain.model.ProductCategory
import com.example.domain.model.ProductStatus
import com.example.presentation.customer.components.PublicBusinessCard
import com.example.presentation.customer.search.GlobalSearchResultItemCard

/**
 * Sección modular de descubrimiento por categorías en Customer Home (Fase 5E.3 - BSD-CUSTOMER-HOME-5E-MOD-001).
 * Implementa la separación canónica entre el dominio de PLATOS/PRODUCTOS (renderizado vertical con
 * GlobalSearchResultItemCard, subtitle = nombre del comercio, badge temático y add-to-cart con control de stock)
 * y el dominio de COMERCIOS (renderizado horizontal con PublicBusinessCard).
 */
@Composable
fun CustomerHomeCategoryDiscoverySection(
    showCategories: Boolean,
    publicBusinesses: List<BusinessInfo>,
    categoriesList: List<Category>,
    selectedCategoryFilter: String,
    onCategoryClick: (String) -> Unit,
    isProductCategoryDomain: Boolean,
    filteredProductsForCategory: List<Product>,
    filteredPublicBusinesses: List<BusinessInfo>,
    favoriteIds: Set<String>,
    onToggleFavorite: (String) -> Unit,
    cartItems: List<CartItem>,
    isGuest: Boolean,
    navController: NavController,
    context: Context,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        // Barra de categorías visible para cambiar o limpiar filtro
        HomeCategoriesSection(
            showCategories = showCategories,
            publicBusinesses = publicBusinesses,
            categoriesList = categoriesList,
            selectedCategoryFilter = selectedCategoryFilter,
            onCategoryClick = onCategoryClick
        )

        if (isProductCategoryDomain) {
            // ── VISTA DE DESCUBRIMIENTO DE PLATOS REALES (DOMINIO PRODUCT) ──
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Text(
                    text = "Platos de \"$selectedCategoryFilter\" (${filteredProductsForCategory.size})",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(12.dp))

                if (filteredProductsForCategory.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
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
                            text = "Sin platos disponibles en esta categoría",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp
                        )
                        TextButton(onClick = { onCategoryClick("") }) {
                            Text("Limpiar filtro de categoría", color = MaterialTheme.colorScheme.primary)
                        }
                    }
                } else {
                    // Lista canónica de platos/productos disponibles (Paridad con Buscador Global - BSD-CUSTOMER-CATALOG-FORENSIC-REPAIR-002)
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        filteredProductsForCategory.forEach { product ->
                            val biz = publicBusinesses.find { it.id == product.businessId }
                            val bizName = biz?.getEffectiveName() ?: "Comercio"
                            val isCombo = product.category == ProductCategory.COMBO
                            val effectiveType = if (isCombo) CustomerSearchResultType.COMBO else CustomerSearchResultType.PRODUCT
                            val discount = if (product.hasDiscount) "-${product.discountPercentage}%" else null
                            val categoryName = product.categoryName.ifBlank { product.category.name.replace("_", " ") }

                            val bizCatNorm = biz?.getEffectiveCategory()?.trim()?.lowercase() ?: ""
                            val isRestaurant = bizCatNorm.contains("restaurante") ||
                                bizCatNorm.contains("comida") ||
                                bizCatNorm.contains("gastronom") ||
                                bizCatNorm.contains("fritanga") ||
                                bizCatNorm.contains("cafeteria") ||
                                bizCatNorm.contains("bar")

                            val badgeLabel = if (isRestaurant) "PLATO" else categoryName.trim().uppercase().ifBlank { "PRODUCTO" }
                            val badgeEmoji = if (isRestaurant) "🍔" else EnterpriseSearchEngine.resolveEmojiForCategory(categoryName, biz?.getEffectiveCategory() ?: "")

                            val searchResult = CustomerSearchResult(
                                id = product.id,
                                type = effectiveType,
                                title = product.name,
                                subtitle = bizName,
                                description = product.description.ifBlank { product.shortDescription },
                                imageUrl = product.getMainImage().ifBlank { product.imageUrl }.ifBlank { product.thumbnailUrl },
                                price = product.price,
                                originalPrice = product.originalPrice,
                                discountTag = discount,
                                businessId = product.businessId,
                                businessName = bizName,
                                branchId = product.branchId,
                                categoryName = categoryName,
                                rating = product.rating,
                                isAvailable = product.status == ProductStatus.ACTIVE,
                                relevanceScore = 100,
                                rawItem = product,
                                badgeLabel = badgeLabel,
                                badgeEmoji = badgeEmoji
                            )

                            val currentQty = cartItems.find { it.productId == product.id }?.quantity ?: 0
                            GlobalSearchResultItemCard(
                                result = searchResult,
                                onAddToCart = {
                                    if (isGuest) {
                                        navController.navigate(Screen.LoginRegister.route)
                                    } else {
                                        if (product.stockQuantity == null || currentQty < (product.stockQuantity ?: 0)) {
                                            CartManager.addToCart(
                                                productId = product.id,
                                                productName = product.name,
                                                price = product.price,
                                                quantity = 1,
                                                businessId = product.businessId,
                                                businessName = bizName,
                                                imageUrl = product.getMainImage().ifBlank { product.imageUrl }.ifBlank { product.thumbnailUrl }
                                            )
                                            Toast.makeText(context, "¡${product.name} agregado al carrito! 🛒", Toast.LENGTH_SHORT).show()
                                        } else {
                                            Toast.makeText(context, "Stock máximo alcanzado", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                },
                                onClick = {
                                    if (product.businessId.isNotBlank()) {
                                        navController.navigate("comercio_detalle_screen/${product.businessId}?productId=${product.id}")
                                    }
                                }
                            )
                        }
                    }
                }

                // Sección secundaria: Comercios donde están disponibles
                if (filteredPublicBusinesses.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(20.dp))
                    Text(
                        text = "Comercios con \"$selectedCategoryFilter\" (${filteredPublicBusinesses.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 0.dp),
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        items(filteredPublicBusinesses) { business ->
                            PublicBusinessCard(
                                business = business,
                                isFavorite = favoriteIds.contains(business.id),
                                onToggleFavorite = { onToggleFavorite(business.id) },
                                onClick = { navController.navigate("comercio_detalle_screen/${business.id}") }
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        } else {
            // ── VISTA DE DESCUBRIMIENTO DE COMERCIOS (DOMINIO BUSINESS - intacto) ──
            Text(
                text = "Comercios en \"$selectedCategoryFilter\" (${filteredPublicBusinesses.size})",
                fontWeight = FontWeight.ExtraBold,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(modifier = Modifier.height(10.dp))

            if (filteredPublicBusinesses.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
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
                        text = "Sin resultados para esta categoría",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 14.sp
                    )
                    TextButton(onClick = { onCategoryClick("") }) {
                        Text("Limpiar filtro de categoría", color = MaterialTheme.colorScheme.primary)
                    }
                }
            } else {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(filteredPublicBusinesses) { business ->
                        PublicBusinessCard(
                            business = business,
                            isFavorite = favoriteIds.contains(business.id),
                            onToggleFavorite = { onToggleFavorite(business.id) },
                            onClick = { navController.navigate("comercio_detalle_screen/${business.id}") }
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
