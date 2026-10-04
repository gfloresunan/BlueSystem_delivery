package com.example.presentation.customer.home

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.example.BannerPromocional
import com.example.BranchItem
import com.example.DashboardConfig
import com.example.FeaturedProduct
import com.example.FlashDeal
import com.example.Screen
import com.example.data.CartManager
import com.example.data.repository.BusinessInfo
import com.example.data.repository.DashboardAnalyticsTracker
import com.example.domain.engine.NearbyMerchantEngine
import com.example.domain.engine.dashboard.DashboardDeduplicationEngine
import com.example.domain.engine.dashboard.RecommendationEngine
import com.example.domain.model.Category
import com.example.domain.model.Product
import com.example.Pedido
import com.example.presentation.customer.BannersSection

import androidx.compose.runtime.key
import com.example.HomeEditorialAd
import com.example.service.DestinationRouter

/**
 * Orquestador modular del feed dinámico de Customer Home (Fase 5E.2 - BSD-CUSTOMER-HOME-5E-MOD-001).
 * Itera sobre la lista normalizada de secciones (sectionOrder) y renderiza cada bloque
 * garantizando la preservación estricta de analíticas, navegación, favoritos, carrito,
 * deduplicación M=2 (Addendum P0-04) y gobierno seguro de Envíos Express (X→Y).
 *
 * Sprint 18.2 / Protocolo BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001:
 * - Soporte para EDITORIAL_ADS (anuncios editoriales e institucionales).
 * - Renderizado reactivo de títulos dinámicos (blockTitles).
 * - Enrutamiento seguro de acciones de encabezado (blockActions).
 * - key(sectionId) en el loop dinámico para recomposición quirúrgica eficiente.
 */
@Composable
fun CustomerHomeFeedSection(
    dashboardConfig: DashboardConfig,
    banners: List<BannerPromocional>,
    publicBusinesses: List<BusinessInfo>,
    categoriesList: List<Category>,
    selectedCategoryFilter: String,
    onCategoryClick: (String) -> Unit,
    branches: List<BranchItem>,
    nearbyResult: NearbyMerchantEngine.NearbySearchResult,
    favoriteIds: Set<String>,
    onToggleFavorite: (String) -> Unit,
    featuredProducts: List<FeaturedProduct>,
    flashDeals: List<FlashDeal>,
    discountedProducts: List<FeaturedProduct>,
    isGuest: Boolean,
    navController: NavController,
    context: Context,
    modifier: Modifier = Modifier,
    allProducts: List<Product> = emptyList(),
    recentOrders: List<Pedido> = emptyList(),
    customerLat: Double = 0.0,
    customerLng: Double = 0.0,
    editorialAds: List<HomeEditorialAd> = emptyList()
) {
    val orderedSections = remember(dashboardConfig) { dashboardConfig.getNormalizedSectionOrder() }

    // ─── Deduplicación M=2 en Secciones Curadas Dinámicas (Addendum P0-04) ───
    val curatedFeedResult = remember(publicBusinesses, orderedSections, recentOrders, customerLat, customerLng) {
        val nowMs = System.currentTimeMillis()
        val ninetyDaysMs = 90L * 24 * 60 * 60 * 1000
        val thirtyDaysAgoMs = nowMs - (30L * 24 * 60 * 60 * 1000)

        val featuredPool = publicBusinesses.filter { it.getEffectiveIsFeatured() }

        val samePricePool = publicBusinesses.filter { biz ->
            if (!biz.isOpen || !biz.priceParityVerified) return@filter false
            val certTime = biz.priceParityVerifiedAt?.toDate()?.time
            if (certTime != null && (nowMs - certTime) > ninetyDaysMs) return@filter false
            true
        }

        // TOP_SELLING canónico: ordenado estrictamente por unitsSold30d DESC (sin fallback de rating)
        val topSellingPool = publicBusinesses.filter { it.isOpen && it.unitsSold30d > 0 }
            .sortedByDescending { it.unitsSold30d }

        // RECOMMENDED canónico: calculado por RecommendationEngine con 40% Afinidad, 25% Rating, 20% Geo, 15% Trust
        val userCoords = if (NearbyMerchantEngine.isValidCoordinate(customerLat, customerLng)) {
            RecommendationEngine.UserCoordinates(customerLat, customerLng)
        } else {
            null
        }

        val recommendedPool = RecommendationEngine.calculateRecommendations(
            publicBusinesses = publicBusinesses,
            recentOrders = recentOrders,
            userLocation = userCoords,
            branches = branches,
            limit = 100
        )

        val newBusinessesPool = publicBusinesses.filter { biz ->
            val activatedMs = biz.activatedAt?.toDate()?.time ?: return@filter false
            activatedMs >= thirtyDaysAgoMs
        }.sortedByDescending { it.activatedAt!!.toDate().time }

        DashboardDeduplicationEngine.filterCuratedSections(
            sectionOrder = orderedSections,
            featuredPool = featuredPool,
            samePricePool = samePricePool,
            topSellingPool = topSellingPool,
            recommendedPool = recommendedPool,
            newBusinessesPool = newBusinessesPool
        )
    }

    for (sectionId in orderedSections) {
        key(sectionId) {
            when (sectionId) {
                "BANNERS" -> {
                    BannersSection(
                        showBanners = dashboardConfig.showBanners,
                        banners = banners,
                        onBannerClick = { banner ->
                            DashboardAnalyticsTracker.logEvent(
                                eventType = "click",
                                itemType = "banner",
                                itemId = banner.id.ifBlank { banner.getEffectiveActionId() },
                                itemName = banner.title.ifBlank { "Banner Promocional" }
                            )
                            val actionType = banner.getEffectiveActionType()
                            val actionId = banner.getEffectiveActionId()
                            if (actionType == "comercio" && actionId.isNotEmpty()) {
                                navController.navigate("comercio_detalle_screen/$actionId")
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    )
                }
                "CATEGORIES" -> {
                    HomeCategoriesSection(
                        showCategories = dashboardConfig.showCategories,
                        publicBusinesses = publicBusinesses,
                        categoriesList = categoriesList,
                        selectedCategoryFilter = selectedCategoryFilter,
                        onCategoryClick = onCategoryClick,
                        title = dashboardConfig.getDisplayTitle("CATEGORIES", "¿Qué se te antoja hoy?"),
                        headerAction = dashboardConfig.getBlockAction("CATEGORIES"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "BRANCHES" -> {
                    BranchesSection(
                        showBranchesBlock = dashboardConfig.showBranchesBlock,
                        branches = branches,
                        onBranchClick = { businessId ->
                            DashboardAnalyticsTracker.logEvent("click", "branch", businessId, "Sucursal Comercio")
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        title = dashboardConfig.getDisplayTitle("BRANCHES", "Sucursales por Comercio 🏢"),
                        headerAction = dashboardConfig.getBlockAction("BRANCHES"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "NEARBY" -> {
                    NearbyBusinessesSection(
                        showNearbySection = dashboardConfig.showNearbyBusinesses,
                        nearbyResult = nearbyResult,
                        favoriteIds = favoriteIds,
                        onBusinessClick = { businessId ->
                            DashboardAnalyticsTracker.logEvent("click", "business", businessId, "Comercio Cercano")
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        onToggleFavorite = onToggleFavorite,
                        onAddressClick = {
                            if (isGuest) navController.navigate(Screen.LoginRegister.route)
                            else navController.navigate(Screen.AddressManager.route)
                        },
                        title = dashboardConfig.getDisplayTitle("NEARBY", "Comercios Cerca de Ti 🏢"),
                        headerAction = dashboardConfig.getBlockAction("NEARBY"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "FEATURED_BUSINESSES" -> {
                    FeaturedBusinessesSection(
                        showFeaturedBusinesses = dashboardConfig.showFeaturedBusinesses,
                        publicBusinesses = curatedFeedResult.featuredBusinesses,
                        favoriteIds = favoriteIds,
                        onBusinessClick = { businessId ->
                            DashboardAnalyticsTracker.logEvent("click", "business", businessId, "Comercio Destacado")
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        onToggleFavorite = onToggleFavorite,
                        title = dashboardConfig.getDisplayTitle("FEATURED_BUSINESSES", "Comercios Destacados ⭐"),
                        headerAction = dashboardConfig.getBlockAction("FEATURED_BUSINESSES"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "FEATURED_PRODUCTS" -> {
                    StarProductsSection(
                        showFeaturedProducts = dashboardConfig.showFeaturedProducts,
                        featuredProducts = featuredProducts,
                        onProductClick = { businessId ->
                            DashboardAnalyticsTracker.logEvent("click", "product", businessId, "Producto Estrella")
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        title = dashboardConfig.getDisplayTitle("FEATURED_PRODUCTS", "Productos Estrella ⭐"),
                        headerAction = dashboardConfig.getBlockAction("FEATURED_PRODUCTS"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "FLASH_DEALS" -> {
                    FlashDealsSection(
                        showFlashDeals = dashboardConfig.showFlashDeals,
                        flashDeals = flashDeals,
                        onDealClick = { deal ->
                            DashboardAnalyticsTracker.logEvent("click", "deal", deal.businessId, "Oferta Flash")
                            val targetProdId = deal.productId.ifBlank { deal.id.removePrefix("fd_") }
                            if (targetProdId.isNotBlank()) {
                                navController.navigate("comercio_detalle_screen/${deal.businessId}?productId=$targetProdId")
                            } else {
                                navController.navigate("comercio_detalle_screen/${deal.businessId}")
                            }
                        },
                        title = dashboardConfig.getDisplayTitle("FLASH_DEALS", "Ofertas Flash ⚡ (Tiempo Limitado)"),
                        headerAction = dashboardConfig.getBlockAction("FLASH_DEALS"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "PROMOTIONS" -> {
                    DiscountedProductsSection(
                        showPromotions = dashboardConfig.showPromotions,
                        discountedProducts = discountedProducts,
                        onProductClick = { businessId ->
                            DashboardAnalyticsTracker.logEvent("click", "product", businessId, "Producto Descuento")
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        onAddToCart = { prod ->
                            if (isGuest) {
                                navController.navigate(Screen.LoginRegister.route)
                            } else {
                                CartManager.addToCart(
                                    productId = prod.productId.ifBlank { prod.id },
                                    productName = prod.name,
                                    price = prod.price,
                                    quantity = 1,
                                    businessId = prod.businessId,
                                    businessName = prod.businessName
                                )
                                Toast.makeText(context, "¡${prod.name} agregado al carrito! 🛒", Toast.LENGTH_SHORT).show()
                            }
                        },
                        title = dashboardConfig.getDisplayTitle("PROMOTIONS", "Productos con Descuentos 🏷️"),
                        headerAction = dashboardConfig.getBlockAction("PROMOTIONS"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "SAME_PRICE" -> {
                    SamePriceSection(
                        showSamePrice = dashboardConfig.showSamePrice,
                        publicBusinesses = curatedFeedResult.samePriceBusinesses,
                        favoriteIds = favoriteIds,
                        onBusinessClick = { businessId ->
                            DashboardAnalyticsTracker.logEvent("click", "business", businessId, "Mismo Precio Local")
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        onToggleFavorite = onToggleFavorite,
                        title = dashboardConfig.getDisplayTitle("SAME_PRICE", "Mismo Precio que en Local 💰"),
                        headerAction = dashboardConfig.getBlockAction("SAME_PRICE"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "TOP_SELLING" -> {
                    TopSellingSection(
                        showTopSelling = dashboardConfig.showTopSelling,
                        publicBusinesses = curatedFeedResult.topSellingBusinesses,
                        favoriteIds = favoriteIds,
                        onBusinessClick = { businessId ->
                            DashboardAnalyticsTracker.logEvent("click", "business", businessId, "Los Más Vendidos")
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        onToggleFavorite = onToggleFavorite,
                        title = dashboardConfig.getDisplayTitle("TOP_SELLING", "Los Más Vendidos 🔥"),
                        headerAction = dashboardConfig.getBlockAction("TOP_SELLING"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "RECOMMENDED" -> {
                    RecommendedSection(
                        showRecommended = dashboardConfig.showRecommended,
                        publicBusinesses = curatedFeedResult.recommendedBusinesses,
                        favoriteIds = favoriteIds,
                        onBusinessClick = { businessId ->
                            DashboardAnalyticsTracker.logEvent("click", "business", businessId, "Recomendado")
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        onToggleFavorite = onToggleFavorite,
                        title = dashboardConfig.getDisplayTitle("RECOMMENDED", "Recomendados para ti 🎯"),
                        headerAction = dashboardConfig.getBlockAction("RECOMMENDED"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "NEW_BUSINESSES" -> {
                    NewBusinessesSection(
                        showNewBusinesses = dashboardConfig.showNewBusinesses,
                        publicBusinesses = curatedFeedResult.newBusinesses,
                        favoriteIds = favoriteIds,
                        onBusinessClick = { businessId ->
                            DashboardAnalyticsTracker.logEvent("click", "business", businessId, "Comercio Nuevo")
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        onToggleFavorite = onToggleFavorite,
                        title = dashboardConfig.getDisplayTitle("NEW_BUSINESSES", "Comercios Nuevos 🟢"),
                        headerAction = dashboardConfig.getBlockAction("NEW_BUSINESSES"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "QUICK_REORDER" -> {
                    QuickReorderSection(
                        showQuickReorder = dashboardConfig.showQuickReorder,
                        recentOrders = recentOrders,
                        allProducts = allProducts,
                        publicBusinesses = publicBusinesses,
                        navController = navController,
                        context = context,
                        title = dashboardConfig.getDisplayTitle("QUICK_REORDER", "Volver a Pedir 🔄"),
                        headerAction = dashboardConfig.getBlockAction("QUICK_REORDER"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "EXPRESS_DELIVERY" -> {
                    // Gobiernado estrictamente por showExpressDeliveryBanner Y xToYServiceEnabled (P0-02, P0-03)
                    if (dashboardConfig.showExpressDeliveryBanner && dashboardConfig.xToYServiceEnabled) {
                        ExpressDeliveryBanner(
                            onRequestDelivery = {
                                if (isGuest) {
                                    navController.navigate(Screen.LoginRegister.route)
                                } else {
                                    navController.navigate("solicitar_envio_form")
                                }
                            }
                        )
                    }
                }
                "FAVORITES" -> {
                    FavoritesBlockSection(
                        showFavorites = dashboardConfig.showFavoritesBlock,
                        publicBusinesses = publicBusinesses,
                        favoriteIds = favoriteIds,
                        onBusinessClick = { businessId ->
                            navController.navigate("comercio_detalle_screen/$businessId")
                        },
                        onToggleFavorite = onToggleFavorite,
                        title = dashboardConfig.getDisplayTitle("FAVORITES", "Tus Comercios Favoritos ❤️"),
                        headerAction = dashboardConfig.getBlockAction("FAVORITES"),
                        onHeaderActionClick = { action ->
                            DestinationRouter.navigateBlockAction(context, navController, action)
                        }
                    )
                }
                "EDITORIAL_ADS" -> {
                    if (dashboardConfig.showEditorialAds) {
                        EditorialAdsSection(
                            ads = editorialAds,
                            publicBusinesses = publicBusinesses,
                            navController = navController,
                            context = context,
                            title = dashboardConfig.getDisplayTitle("EDITORIAL_ADS", "Destacados y Novedades"),
                            headerAction = dashboardConfig.getBlockAction("EDITORIAL_ADS"),
                            onHeaderActionClick = { action ->
                                DestinationRouter.navigateBlockAction(context, navController, action)
                            }
                        )
                    }
                }
            }
        }
    }

    // CATÁLOGO GENERAL DE COMERCIOS (BSD-CUSTOMER-MARKETPLACE-CATALOG-UNIFICATION-001)
    // Inmunidad semántica absoluta (Addendum P0-04)
    AllBusinessesSection(
        publicBusinesses = publicBusinesses,
        favoriteIds = favoriteIds,
        onBusinessClick = { businessId ->
            navController.navigate("comercio_detalle_screen/$businessId")
        },
        onToggleFavorite = onToggleFavorite
    )
}
