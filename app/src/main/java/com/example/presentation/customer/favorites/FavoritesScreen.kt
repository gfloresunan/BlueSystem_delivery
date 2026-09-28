package com.example.presentation.customer.favorites

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddShoppingCart
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.RestaurantMenu
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.FirebaseManager
import com.example.data.repository.BusinessInfo
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary
import com.example.ui.theme.FabAccent
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Pantalla de Mis Favoritos Enterprise (Protocolo BSD-CUSTOMER-FAVORITES-UPGRADE-001)
 * Divide los favoritos en tres pestañas sincronizadas en tiempo real con Firestore:
 * 1. Comercios Favoritos (resueltos contra catálogo público completo).
 * 2. Platos Favoritos (restaurantes, comida, cafeterías, postres).
 * 3. Productos Favoritos (tiendas, tecnología, ferretería, farmacia y otros comercios).
 */
@Composable
fun FavoritesScreen(
    favoriteIds: Set<String> = emptySet(),
    favoriteBusinessIds: Set<String> = emptySet(),
    favoriteProductIds: Set<String> = emptySet(),
    favoriteProducts: List<FavoriteProductItem> = emptyList(),
    publicBusinesses: List<BusinessInfo> = emptyList(),
    firebaseManager: FirebaseManager? = null,
    onNavigateToComercio: (String) -> Unit = {},
    onNavigateToProduct: (businessId: String, productId: String) -> Unit = { _, _ -> },
    onToggleFavoriteBusiness: (String) -> Unit = {},
    onToggleFavoriteProduct: (FavoriteProductItem) -> Unit = {},
    onAddToCart: (FavoriteProductItem) -> Unit = {}
) {
    // 1. Carga resiliente de catálogo público en caso de no ser provisto directamente
    val livePublicBusinesses by remember(publicBusinesses, firebaseManager) {
        if (publicBusinesses.isNotEmpty()) MutableStateFlow(publicBusinesses)
        else firebaseManager?.listenToPublicCatalogBusinesses() ?: MutableStateFlow(emptyList())
    }.collectAsState(initial = publicBusinesses)

    // 2. Filtro canónico de comercios favoritos (resuelve contra todo el catálogo público)
    val favoriteBusinesses = remember(livePublicBusinesses, favoriteBusinessIds, favoriteIds) {
        livePublicBusinesses.filter { biz ->
            favoriteBusinessIds.contains(biz.id) || favoriteIds.contains(biz.id) || favoriteIds.contains("biz_${biz.id}")
        }
    }

    // 3. Separación inteligente de Platos (Restaurantes/Comida) vs Productos (Tecnología, Tiendas, Ferretería, etc.)
    val (favoriteDishes, favoriteGeneralProducts) = remember(favoriteProducts, livePublicBusinesses) {
        val foodKeywords = listOf(
            "restaurante", "restaurantes", "comida", "comidas", "alimento", "alimentos",
            "fritanga", "bar", "cafeteria", "cafetería", "cafe", "café", "postre", "postres",
            "reposteria", "repostería", "panaderia", "panadería", "pizza", "pizzeria", "pizzería",
            "hamburguesa", "burger", "asados", "taco", "tacos", "gastronomia", "gastronomía",
            "plato", "platos", "combo", "combos", "menu", "menú", "desayuno", "almuerzo", "cena"
        )

        val dishes = mutableListOf<FavoriteProductItem>()
        val prods = mutableListOf<FavoriteProductItem>()

        for (item in favoriteProducts) {
            val cleanBizId = item.businessId.trim().removePrefix("biz_")
            val biz = livePublicBusinesses.find {
                it.id.equals(cleanBizId, ignoreCase = true) ||
                it.id.equals(item.businessId, ignoreCase = true) ||
                "biz_${it.id}".equals(item.businessId, ignoreCase = true)
            }
            val bizCat = (biz?.getEffectiveCategory() ?: "").trim().lowercase()
            val itemCat = item.category.trim().lowercase()

            val isBizFood = foodKeywords.any { bizCat.contains(it) }
            val isItemFood = foodKeywords.any { itemCat.contains(it) }

            val isDish = if (biz != null && bizCat.isNotBlank()) {
                isBizFood
            } else {
                isBizFood || isItemFood
            }

            if (isDish) {
                dishes.add(item)
            } else {
                prods.add(item)
            }
        }
        Pair(dishes, prods)
    }

    var selectedTabIndex by remember { mutableIntStateOf(0) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // TopBar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 4.dp
        ) {
            Column {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Favorite,
                        contentDescription = null,
                        tint = FabAccent,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = "Mis Favoritos",
                        fontWeight = FontWeight.Bold,
                        fontSize = 20.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(Modifier.weight(1f))
                    val totalCount = favoriteBusinesses.size + favoriteDishes.size + favoriteGeneralProducts.size
                    if (totalCount > 0) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.primaryContainer
                        ) {
                            Text(
                                text = "$totalCount guardado(s)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                // Pestañas (Tabs)
                TabRow(
                    selectedTabIndex = selectedTabIndex,
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.primary
                ) {
                    Tab(
                        selected = selectedTabIndex == 0,
                        onClick = { selectedTabIndex = 0 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Storefront, contentDescription = null, modifier = Modifier.size(15.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Comercios (${favoriteBusinesses.size})", fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp)
                            }
                        }
                    )
                    Tab(
                        selected = selectedTabIndex == 1,
                        onClick = { selectedTabIndex = 1 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.RestaurantMenu, contentDescription = null, modifier = Modifier.size(15.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Platos (${favoriteDishes.size})", fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp)
                            }
                        }
                    )
                    Tab(
                        selected = selectedTabIndex == 2,
                        onClick = { selectedTabIndex = 2 },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.ShoppingBag, contentDescription = null, modifier = Modifier.size(15.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Productos (${favoriteGeneralProducts.size})", fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp)
                            }
                        }
                    )
                }
            }
        }

        when (selectedTabIndex) {
            0 -> {
                // ─── PESTAÑA 0: COMERCIOS FAVORITOS ──────────────────────────
                if (favoriteBusinesses.isEmpty()) {
                    EmptyFavoritesView(
                        title = "No tienes comercios favoritos",
                        message = "Toca el corazón ❤️ en cualquier comercio del inicio para guardarlo aquí y encontrarlo rápido."
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(favoriteBusinesses, key = { it.id }) { business ->
                            FavoriteBusinessCard(
                                business = business,
                                onClick = { onNavigateToComercio(business.id) },
                                onRemoveFavorite = { onToggleFavoriteBusiness(business.id) }
                            )
                        }
                    }
                }
            }
            1 -> {
                // ─── PESTAÑA 1: PLATOS FAVORITOS (RESTAURANTES) ──────────────
                if (favoriteDishes.isEmpty()) {
                    EmptyFavoritesView(
                        title = "No tienes platos favoritos",
                        message = "Toca el corazón ❤️ en la lista de platos de un restaurante para agregarlo a tus favoritos."
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(favoriteDishes, key = { it.productId }) { productItem ->
                            FavoriteProductCard(
                                productItem = productItem,
                                isDish = true,
                                onClick = {
                                    val targetBiz = livePublicBusinesses.find {
                                        it.id.equals(productItem.businessId, ignoreCase = true) ||
                                        it.id.equals(productItem.businessId.removePrefix("biz_"), ignoreCase = true) ||
                                        "biz_${it.id}".equals(productItem.businessId, ignoreCase = true)
                                    }
                                    val resolvedBizId = targetBiz?.id?.takeIf { it.isNotBlank() } ?: productItem.businessId.trim()
                                    val rawProdId = productItem.productId.trim()
                                    if (resolvedBizId.isNotBlank()) {
                                        onNavigateToProduct(resolvedBizId, rawProdId)
                                    }
                                },
                                onRemoveFavorite = { onToggleFavoriteProduct(productItem) },
                                onAddToCart = { onAddToCart(productItem) }
                            )
                        }
                    }
                }
            }
            2 -> {
                // ─── PESTAÑA 2: PRODUCTOS FAVORITOS (TIENDAS / OTROS) ────────
                if (favoriteGeneralProducts.isEmpty()) {
                    EmptyFavoritesView(
                        title = "No tienes productos favoritos",
                        message = "Toca el corazón ❤️ en artículos de tiendas, tecnología y ferreterías para verlos aquí."
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(favoriteGeneralProducts, key = { it.productId }) { productItem ->
                            FavoriteProductCard(
                                productItem = productItem,
                                isDish = false,
                                onClick = {
                                    val targetBiz = livePublicBusinesses.find {
                                        it.id.equals(productItem.businessId, ignoreCase = true) ||
                                        it.id.equals(productItem.businessId.removePrefix("biz_"), ignoreCase = true) ||
                                        "biz_${it.id}".equals(productItem.businessId, ignoreCase = true)
                                    }
                                    val resolvedBizId = targetBiz?.id?.takeIf { it.isNotBlank() } ?: productItem.businessId.trim()
                                    val rawProdId = productItem.productId.trim()
                                    if (resolvedBizId.isNotBlank()) {
                                        onNavigateToProduct(resolvedBizId, rawProdId)
                                    }
                                },
                                onRemoveFavorite = { onToggleFavoriteProduct(productItem) },
                                onAddToCart = { onAddToCart(productItem) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FavoriteBusinessCard(
    business: BusinessInfo,
    onClick: () -> Unit,
    onRemoveFavorite: () -> Unit
) {
    val bName = business.getEffectiveName()
    val bLogo = business.getEffectiveLogoUrl()
    val isOpen = business.getEffectiveIsOpen()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Logo o Avatar con iniciales
            if (bLogo.isNotBlank()) {
                AsyncImage(
                    model = bLogo,
                    contentDescription = bName,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(12.dp))
                )
            } else {
                val iniciales = remember(bName) {
                    val parts = bName.trim().split(" ")
                    if (parts.size >= 2) "${parts[0].firstOrNull() ?: 'B'}${parts[1].firstOrNull() ?: 'S'}"
                    else bName.take(2).uppercase()
                }
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Brush.linearGradient(colors = listOf(BluePrimary, BlueSecondary))),
                    contentAlignment = Alignment.Center
                ) {
                    Text(iniciales, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }

            Spacer(Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = bName,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    Spacer(Modifier.width(6.dp))
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isOpen) Color(0xFFE8F5E9) else Color(0xFFFFEBEE)
                    ) {
                        Text(
                            text = if (isOpen) "ABIERTO 🟢" else "CERRADO 🔴",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isOpen) Color(0xFF2E7D32) else Color(0xFFC62828),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Spacer(Modifier.height(3.dp))
                Text(
                    text = business.getEffectiveCategory(),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Medium
                )

                Spacer(Modifier.height(3.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("⭐ ${business.getEffectiveRating()}", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFF59E0B))
                    Spacer(Modifier.width(8.dp))
                    Text("🛵 ${business.getEffectiveDeliveryTime()}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            IconButton(onClick = onRemoveFavorite) {
                Icon(
                    imageVector = Icons.Default.Favorite,
                    contentDescription = "Quitar de favoritos",
                    tint = Color(0xFFFF2D55),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

@Composable
private fun FavoriteProductCard(
    productItem: FavoriteProductItem,
    isDish: Boolean = true,
    onClick: () -> Unit,
    onRemoveFavorite: () -> Unit,
    onAddToCart: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Imagen del plato o producto
            if (productItem.imageUrl.isNotBlank()) {
                AsyncImage(
                    model = productItem.imageUrl,
                    contentDescription = productItem.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(68.dp)
                        .clip(RoundedCornerShape(12.dp))
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(68.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isDish) Icons.Default.RestaurantMenu else Icons.Default.ShoppingBag,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = productItem.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (productItem.businessName.isNotBlank()) {
                    Text(
                        text = "de ${productItem.businessName}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "C$ ${String.format(java.util.Locale.US, "%.2f", productItem.price)}",
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onRemoveFavorite) {
                    Icon(
                        imageVector = Icons.Default.Favorite,
                        contentDescription = "Quitar de favoritos",
                        tint = Color(0xFFFF2D55),
                        modifier = Modifier.size(22.dp)
                    )
                }

                Button(
                    onClick = onAddToCart,
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.height(36.dp)
                ) {
                    Icon(Icons.Default.AddShoppingCart, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Pedir", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun EmptyFavoritesView(
    title: String,
    message: String
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Icon(
                imageVector = Icons.Default.FavoriteBorder,
                contentDescription = null,
                tint = Color(0xFFFF2D55).copy(alpha = 0.4f),
                modifier = Modifier.size(72.dp)
            )
            Spacer(Modifier.height(16.dp))
            Text(
                text = title,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = message,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 13.sp,
                lineHeight = 18.sp
            )
        }
    }
}
