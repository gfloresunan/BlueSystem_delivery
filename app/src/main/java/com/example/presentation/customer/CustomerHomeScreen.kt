package com.example.presentation.customer

import com.example.presentation.customer.components.*
import com.example.presentation.customer.search.*
import com.example.presentation.customer.favorites.FavoritesScreen
import com.example.presentation.customer.cart.*
import com.example.presentation.customer.home.*
import com.example.presentation.customer.ai.CustomerAIAgentViewModel
import com.example.presentation.customer.ai.CustomerAIFloatingButton
import com.example.presentation.customer.ai.CustomerAIOverlay
import com.example.domain.engine.NearbyMerchantEngine
import com.example.domain.engine.ai.*
import com.example.domain.model.Product
import com.example.domain.model.Promotion
import com.example.domain.model.menu.MenuCombo
import com.example.BranchItem
import com.example.data.repository.BusinessInfo
import com.example.data.repository.DashboardAnalyticsTracker

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.FirebaseManager
import com.example.Screen
import com.example.BannerPromocional
import com.example.ProductCard
import com.example.domain.model.ProductStatus
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary
import com.example.ui.theme.BlueTertiary
import com.example.ui.theme.BgLightApp
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.BorderStroke
import android.widget.Toast
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.data.CartManager
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.app.Activity
import java.util.Locale
import com.example.ui.theme.FabAccent
import com.example.Usuario
import com.example.data.repository.NotificationRepository
import com.example.data.repository.CategoryRepository
import com.example.data.repository.PromotionalPopupRepository
import com.example.domain.model.PromotionalPopup
import com.example.service.DestinationRouter
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerHomeScreen(
    navController: NavController,
    firebaseManager: FirebaseManager,
    isGuest: Boolean,
    initialTab: Int = 0,
    onLogout: () -> Unit,
    viewModel: CustomerHomeViewModel = viewModel(),
    aiViewModel: CustomerAIAgentViewModel = viewModel(),
    notificationRepo: NotificationRepository = remember { NotificationRepository() },
    categoryRepo: CategoryRepository = remember { CategoryRepository() },
    popupRepo: PromotionalPopupRepository = remember { PromotionalPopupRepository() },
    configRepo: com.example.data.repository.ConfigurationRepository = remember { com.example.data.repository.ConfigurationRepository() }
) {
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val isLoadingCategories by viewModel.isLoadingCategories.collectAsState()
    val cartItemCount by viewModel.cartItemCount.collectAsState()
    val cartItems by viewModel.cartItems.collectAsState()
    val favoriteIds by viewModel.favoriteIds.collectAsState()
    val favoriteBusinessIds by viewModel.favoriteBusinessIds.collectAsState()
    val favoriteProductIds by viewModel.favoriteProductIds.collectAsState()
    val favoriteProducts by viewModel.favoriteProducts.collectAsState()
    val orderPlaced by viewModel.orderPlaced.collectAsState()
    val orderErrorMessage by viewModel.orderErrorMessage.collectAsState()
    val isPlacingOrder by viewModel.isPlacingOrder.collectAsState()

    val systemConfig by configRepo.config.collectAsState()
    val notificationsList by notificationRepo.notifications.collectAsState()
    val unreadCount by notificationRepo.unreadCount.collectAsState()
    val categoriesList by categoryRepo.categories.collectAsState()
    val activePopups by popupRepo.activePopups.collectAsState()
    var activePopupToShow by remember { mutableStateOf<PromotionalPopup?>(null) }

    val userProfile by viewModel.currentUserProfile.collectAsState()
    val userAddresses by viewModel.addresses.collectAsState()
    val defaultAddressDoc by viewModel.defaultAddress.collectAsState()
    val realPromotions by viewModel.promotions.collectAsState()

    val publicBusinesses by viewModel.publicBusinesses.collectAsState()
    val dashboardConfig by viewModel.dashboardConfig.collectAsState()
    val featuredProducts by viewModel.featuredProducts.collectAsState()
    val flashDeals by viewModel.flashDeals.collectAsState()
    val discountedProducts by viewModel.discountedProducts.collectAsState()
    val branches by viewModel.branches.collectAsState()
    val recommendedBusinesses by viewModel.recommendedBusinesses.collectAsState()
    val trendingBusinesses by viewModel.trendingBusinesses.collectAsState()
    val allProducts by viewModel.allProducts.collectAsState()
    val recentOrders by viewModel.recentOrders.collectAsState()

    val commerceQuote by viewModel.commerceDeliveryQuote.collectAsState()
    val isCalculatingCommerceQuote by viewModel.isCalculatingCommerceQuote.collectAsState()
    val quoteErrorMessage by viewModel.quoteErrorMessage.collectAsState()

    val currentUserName = remember(userProfile, isGuest) {
        val profName = userProfile?.nombre?.ifBlank { userProfile?.name }
        val authUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        val fallbackName = authUser?.email?.substringBefore("@")
        (profName?.ifBlank { null } ?: fallbackName) ?: if (isGuest) "Invitado" else "Cliente"
    }

    val coroutineScope = androidx.compose.runtime.rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    LaunchedEffect(isGuest, context) {
        CartManager.initContext(context)
        configRepo.startListening()
        categoryRepo.startListening()
        popupRepo.startListening()
        if (!isGuest) {
            val uid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""
            if (uid.isNotEmpty()) {
                notificationRepo.startListening(uid)
            }
        }
    }

    LaunchedEffect(currentUserName) {
        aiViewModel.setCustomerName(currentUserName)
    }

    // Configuración reactiva del Despachador de Herramientas Locales para el Asistente IA
    LaunchedEffect(allProducts, publicBusinesses, realPromotions, branches) {
        val catalogProvider = object : CatalogDataProvider {
            override fun getProducts(): List<Product> = allProducts
            override fun getCombos(): List<MenuCombo> = emptyList()
            override fun getPromotions(): List<Promotion> = realPromotions
        }
        val businessProvider = object : BusinessDataProvider {
            override fun getBusinesses(): List<BusinessInfo> = publicBusinesses
            override fun getBranches(): List<BranchItem> = branches
        }
        val adapters = listOf(
            SearchProductsAdapter(catalogProvider = catalogProvider, businessProvider = businessProvider),
            SearchBusinessesAdapter(catalogProvider = catalogProvider, businessProvider = businessProvider),
            ResolveCatalogEntityAdapter(catalogProvider = catalogProvider, businessProvider = businessProvider),
            GetProductDetailAdapter(catalogProvider = catalogProvider, businessProvider = businessProvider),
            GetBusinessDetailAdapter(businessProvider = businessProvider),
            GetNearbyBusinessesAdapter(businessProvider = businessProvider),
            GetCartAdapter(),
            AddToCartAdapter(catalogProvider = catalogProvider, businessProvider = businessProvider),
            UpdateCartQuantityAdapter(),
            RemoveFromCartAdapter(),
            ClearCartAdapter()
        )
        android.util.Log.d("CUSTOMER_AI_DEBUG", "AI DISPATCHER ATTACHED | products=${allProducts.size} | businesses=${publicBusinesses.size} | promotions=${realPromotions.size}")
        aiViewModel.setLocalToolDispatcher(LocalToolDispatcher(adapters))
    }

    // Navegar al detalle del pedido creado
    LaunchedEffect(orderPlaced) {
        val oid = orderPlaced
        if (oid != null) {
            Toast.makeText(context, "¡Pedido #${oid.takeLast(6).uppercase()} creado con éxito! 🚀", Toast.LENGTH_LONG).show()
            navController.navigate(Screen.OrderDetail.createRoute(oid))
            viewModel.clearOrderPlaced()
        }
    }

    // Notificación de error de creación de pedido (Regla de Integridad Geográfica)
    LaunchedEffect(orderErrorMessage) {
        val err = orderErrorMessage
        if (err != null) {
            Toast.makeText(context, err, Toast.LENGTH_LONG).show()
            viewModel.clearOrderErrorMessage()
        }
    }

    var selectedTab by remember(initialTab) { mutableIntStateOf(initialTab) }
    var showCartDialog by remember { mutableStateOf(false) }

    // Evaluación reactiva de Campaña Pop-up Promocional (Actividad #10 Enterprise)
    LaunchedEffect(activePopups, selectedTab, showCartDialog) {
        if (activePopupToShow == null && selectedTab == 0 && !showCartDialog && activePopups.isNotEmpty()) {
            val top = popupRepo.getTopEligiblePopup(context, "CUSTOMER_HOME")
            if (top != null) {
                activePopupToShow = top
            }
        }
    }
    var cartModalStep by remember { mutableStateOf(1) } // 1: Carrito, 2: Checkout

    // Transición fluida de Checkout desde pantallas hijas (GAP-009 E2E Hardening)
    LaunchedEffect(navController.currentBackStackEntry) {
        val entry = navController.currentBackStackEntry
        val shouldOpenCheckout = entry?.savedStateHandle?.remove<Boolean>("open_checkout") == true
        val shouldOpenCart = entry?.savedStateHandle?.remove<Boolean>("open_cart") == true
        if (shouldOpenCheckout) {
            cartModalStep = 2
            showCartDialog = true
        } else if (shouldOpenCart) {
            cartModalStep = 1
            showCartDialog = true
        }
    }
    var selectedSavedAddressId by remember { mutableStateOf<String?>(null) }
    var customAddressText by remember { mutableStateOf("") }
    var isCustomAddressSelected by remember { mutableStateOf(false) }
    var selectedPaymentMethod by remember { mutableStateOf("efectivo") }

    var couponCodeInput by remember { mutableStateOf("") }
    var appliedCouponDiscount by remember { mutableDoubleStateOf(0.0) }
    var appliedCouponCode by remember { mutableStateOf<String?>(null) }
    var appliedCouponSnapshot by remember { mutableStateOf<Map<String, Any?>?>(null) }
    var couponValidationMessage by remember { mutableStateOf<String?>(null) }
    var isValidatingCoupon by remember { mutableStateOf(false) }

    LaunchedEffect(userAddresses) {
        if (userAddresses.isNotEmpty() && selectedSavedAddressId == null) {
            val def = userAddresses.find { it.isDefault } ?: userAddresses.firstOrNull()
            if (def != null) {
                selectedSavedAddressId = def.id
                isCustomAddressSelected = false
            }
        }
    }

    var showNotificationDialog by remember { mutableStateOf(false) }
    var showSearchBar by remember { mutableStateOf(false) }
    val deliveryAddressForOrder = remember(defaultAddressDoc) {
        val full = defaultAddressDoc?.fullAddress ?: ""
        val label = defaultAddressDoc?.label ?: ""
        if (full.isNotBlank()) full
        else if (label.isNotBlank()) label
        else "Seleccionar dirección 📍"
    }
    var searchQueryText by remember { mutableStateOf("") }
    var selectedCategoryFilter by remember { mutableStateOf("") }

    // Ubicación GPS del cliente desde la dirección activa / predeterminada
    val customerLat = defaultAddressDoc?.latitude ?: 0.0
    val customerLng = defaultAddressDoc?.longitude ?: 0.0
    val hasCustomerLocation = NearbyMerchantEngine.isValidCoordinate(customerLat, customerLng)

    // Descubrimiento geoespacial canónico y cálculo multi-etapa de comercios cercanos
    val nearbyResult = remember(customerLat, customerLng, publicBusinesses, branches, dashboardConfig) {
        NearbyMerchantEngine.findNearbyMerchants(
            customerLat = customerLat,
            customerLng = customerLng,
            businesses = publicBusinesses,
            branches = branches,
            config = dashboardConfig
        )
    }

    // Catálogo general ordenado por proximidad GPS real si existen coordenadas
    val sortedPublicBusinesses = remember(publicBusinesses, nearbyResult) {
        if (nearbyResult.hasCustomerCoordinates && nearbyResult.items.isNotEmpty()) {
            val nearbyOrderMap = nearbyResult.items.mapIndexed { index, item -> item.business.id to index }.toMap()
            publicBusinesses.sortedBy { nearbyOrderMap[it.id] ?: Int.MAX_VALUE }
        } else {
            publicBusinesses
        }
    }

    // Determinar si la categoría seleccionada pertenece al dominio PRODUCT o al dominio BUSINESS.
    val isProductCategoryDomain = remember(selectedCategoryFilter, categoriesList) {
        val catNorm = selectedCategoryFilter.trim().lowercase()
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        if (catNorm.isEmpty()) false
        else {
            val selectedCatType = categoriesList.firstOrNull { cat ->
                cat.name.trim().lowercase()
                    .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
                    .equals(catNorm) ||
                cat.slug.trim().lowercase().equals(catNorm)
            }?.type?.trim()?.uppercase() ?: ""
            selectedCatType == "PRODUCT" || selectedCatType == "PRODUCTO"
        }
    }

    // Filtrar productos reales para categorías de tipo PRODUCT (Deduplicación por id, manteniendo múltiples del mismo comercio)
    val filteredProductsForCategory = remember(allProducts, selectedCategoryFilter, isProductCategoryDomain) {
        val catNorm = selectedCategoryFilter.trim().lowercase()
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        if (!isProductCategoryDomain || catNorm.isEmpty()) {
            emptyList()
        } else {
            allProducts.filter { prod ->
                val isActive = prod.status != ProductStatus.INACTIVE && !prod.isHidden
                if (!isActive) return@filter false

                val prodCatNorm = prod.categoryName.trim().lowercase()
                    .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
                val prodSubCatNorm = prod.subCategoryName.trim().lowercase()
                    .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
                val prodCatIdNorm = prod.categoryId.trim().lowercase()

                (prodCatNorm.isNotEmpty() && (prodCatNorm.contains(catNorm) || catNorm.contains(prodCatNorm))) ||
                (prodSubCatNorm.isNotEmpty() && (prodSubCatNorm.contains(catNorm) || catNorm.contains(prodSubCatNorm))) ||
                (prodCatIdNorm.isNotEmpty() && prodCatIdNorm.contains(catNorm))
            }.distinctBy { it.id }
        }
    }

    val filteredPublicBusinesses = remember(sortedPublicBusinesses, filteredProductsForCategory, searchQueryText, selectedCategoryFilter) {
        val queryNorm = searchQueryText.trim().lowercase()
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        val catNorm = selectedCategoryFilter.trim().lowercase()
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        val catStem = if (catNorm.endsWith("es")) catNorm.dropLast(2) else if (catNorm.endsWith("s")) catNorm.dropLast(1) else catNorm

        val matchingProductBusinessIds: Set<String> = if (filteredProductsForCategory.isNotEmpty()) {
            filteredProductsForCategory.map { it.businessId.trim() }.filter { it.isNotBlank() }.toSet()
        } else {
            emptySet()
        }

        sortedPublicBusinesses.filter { biz ->
            val nameNorm = biz.getEffectiveName().trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            val categoryNorm = biz.getEffectiveCategory().trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            val catStemBiz = if (categoryNorm.endsWith("es")) categoryNorm.dropLast(2) else if (categoryNorm.endsWith("s")) categoryNorm.dropLast(1) else categoryNorm
            val catIdNorm = biz.categoryId.trim().lowercase()
            val catSlugNorm = biz.categorySlug.trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            val addressNorm = biz.getEffectiveAddress().trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

            val matchesQuery = queryNorm.isEmpty() || (
                nameNorm.contains(queryNorm) ||
                categoryNorm.contains(queryNorm) ||
                catStemBiz.contains(queryNorm) ||
                addressNorm.contains(queryNorm)
            )

            val matchesCategory = catNorm.isEmpty() || (
                categoryNorm.contains(catNorm) || catNorm.contains(categoryNorm) ||
                catStemBiz.contains(catStem) || catStem.contains(catStemBiz) ||
                (catIdNorm.isNotEmpty() && catIdNorm.contains(catNorm)) ||
                (catSlugNorm.isNotEmpty() && (catSlugNorm.contains(catNorm) || catNorm.contains(catSlugNorm))) ||
                matchingProductBusinessIds.contains(biz.id)
            )

            matchesQuery && matchesCategory
        }
    }


    // Launcher de reconocimiento de voz
    val speechRecognizerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val results = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val spokenText = results?.firstOrNull() ?: ""
            if (spokenText.isNotEmpty()) {
                searchQueryText = spokenText
                viewModel.onSearchQueryChanged(spokenText)
                Toast.makeText(context, "Buscando: $spokenText", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    // Listen to real-time promotional banners from Firestore
    val banners by remember { firebaseManager.listenToPromotionalBanners() }.collectAsState(initial = emptyList())


    // Tarifa de envío dinámica basada en reglas de negocio
    val deliveryFee = remember(hasCustomerLocation) {
        if (hasCustomerLocation) 35.0 else 40.0
    }


    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
        bottomBar = {
            CustomerBottomNavigationBar(
                selectedTab = selectedTab,
                onTabSelected = { index ->
                    if (isGuest && (index == 1 || index == 3 || index == 4)) {
                        navController.navigate(Screen.LoginRegister.route)
                    } else {
                        selectedTab = index
                    }
                },
                cartItemCount = cartItemCount,
                onCartClick = {
                    if (isGuest) {
                        navController.navigate(Screen.LoginRegister.route)
                    } else {
                        showCartDialog = true
                    }
                }
            )
        },
        floatingActionButton = {
            CustomerAIFloatingButton(
                onClick = {
                    aiViewModel.openOverlay()
                }
            )
        },
        floatingActionButtonPosition = FabPosition.End
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
        ) {
            when (selectedTab) {
                1 -> {
                    // Favoritos Tab (Comercios y Platos/Productos)
                    FavoritesScreen(
                        favoriteIds = favoriteIds,
                        favoriteBusinessIds = favoriteBusinessIds,
                        favoriteProductIds = favoriteProductIds,
                        favoriteProducts = favoriteProducts,
                        publicBusinesses = publicBusinesses,
                        firebaseManager = firebaseManager,
                        onNavigateToComercio = { id -> navController.navigate("comercio_detalle_screen/$id") },
                        onNavigateToProduct = { bizId, pId -> navController.navigate("comercio_detalle_screen/$bizId?productId=$pId") },
                        onToggleFavoriteBusiness = { id -> viewModel.toggleFavoriteBusiness(id) },
                        onToggleFavoriteProduct = { item -> viewModel.toggleFavoriteProductById(item.productId, item.name, item.price, item.businessId, item.businessName, item.imageUrl, item.category) },
                        onAddToCart = { item ->
                            CartManager.addToCart(
                                productId = item.productId,
                                productName = item.name,
                                price = item.price,
                                quantity = 1,
                                businessId = item.businessId,
                                businessName = item.businessName
                            )
                            Toast.makeText(context, "¡${item.name} agregado al carrito! 🛒", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
                3 -> {
                    // Pedidos Tab
                    com.example.presentation.customer.profile.OrdersHistoryScreen(
                        onNavigateToDetail = { orderId -> 
                            navController.navigate(Screen.OrderDetail.createRoute(orderId))
                        }
                    )
                }
                4 -> {
                    // Menú / Perfil Tab
                    com.example.presentation.customer.profile.ProfileScreen(
                        isGuest = isGuest,
                        onNavigateToAddresses = { navController.navigate(Screen.AddressManager.route) },
                        onNavigateToLogin = { navController.navigate(Screen.LoginRegister.route) },
                        onLogout = onLogout,
                        onNavigateToBusinessDashboard = { navController.navigate("business_dashboard") },
                        onNavigateToOrders = { selectedTab = 3 },
                        onNavigateToHelp = { navController.navigate("customer_help") },
                        onNavigateToSolicitarEnvio = { navController.navigate("solicitar_envio_form") },
                        onNavigateToFavorites = { selectedTab = 1 },
                        onNavigateToLoyaltyPoints = { navController.navigate(Screen.LoyaltyPoints.route) },
                        onNavigateToLoyaltyLevel = { navController.navigate(Screen.LoyaltyLevel.route) },
                        onNavigateToCoupons = { navController.navigate(Screen.CustomerCoupons.route) },
                        onNavigateToSecurity = { navController.navigate(Screen.SecuritySettings.route) },
                        navController = navController
                    )
                }

                else -> {
                    // Inicio / Home Tab
                    PullToRefreshBox(
                        isRefreshing = isRefreshing,
                        onRefresh = { viewModel.refresh() },
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .verticalScroll(rememberScrollState())
                        ) {
                            // 1. TOPBAR & HEADER MODULARIZADO (FASE 5E.1)
                            HomeHeader(
                                currentUserName = currentUserName,
                                unreadCount = unreadCount,
                                cartItemCount = cartItemCount,
                                deliveryAddressForOrder = deliveryAddressForOrder,
                                searchQueryText = searchQueryText,
                                onSearchQueryChange = {
                                    searchQueryText = it
                                    viewModel.onSearchQueryChanged(it)
                                },
                                showSearchBar = showSearchBar,
                                onToggleSearchBar = { showSearchBar = !showSearchBar },
                                onClearSearch = {
                                    searchQueryText = ""
                                    viewModel.onSearchQueryChanged("")
                                    showSearchBar = false
                                },
                                onVoiceSearchClick = {
                                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                                        putExtra(RecognizerIntent.EXTRA_PROMPT, "Habla ahora para buscar...")
                                    }
                                    try { speechRecognizerLauncher.launch(intent) }
                                    catch (e: Exception) { Toast.makeText(context, "Reconocimiento de voz no soportado", Toast.LENGTH_SHORT).show() }
                                },
                                onNotificationsClick = { showNotificationDialog = true },
                                onCartClick = {
                                    if (isGuest) navController.navigate(Screen.LoginRegister.route)
                                    else showCartDialog = true
                                },
                                onAddressClick = {
                                    if (isGuest) navController.navigate(Screen.LoginRegister.route)
                                    else navController.navigate(Screen.AddressManager.route)
                                }
                            )

                            // ─── VISTAS DEL INICIO: BÚSQUEDA GLOBAL / FILTRADO POR CATEGORÍA / FEED DINÁMICO ORDENADO ───
                            if (searchQueryText.isNotBlank()) {
                                val searchResults by viewModel.searchResults.collectAsState()
                                val selectedSearchFilter by viewModel.selectedSearchFilter.collectAsState()

                                CustomerHomeSearchResultsSection(
                                    searchQueryText = searchQueryText,
                                    searchResults = searchResults,
                                    selectedSearchFilter = selectedSearchFilter,
                                    onSearchFilterSelected = { viewModel.onSearchFilterSelected(it) },
                                    onClearSearch = {
                                        searchQueryText = ""
                                        viewModel.onSearchQueryChanged("")
                                        showSearchBar = false
                                    },
                                    navController = navController
                                )
                                Spacer(modifier = Modifier.height(20.dp))
                            } else if (selectedCategoryFilter.isNotBlank()) {
                                CustomerHomeCategoryDiscoverySection(
                                    showCategories = dashboardConfig.showCategories,
                                    publicBusinesses = publicBusinesses,
                                    categoriesList = categoriesList,
                                    selectedCategoryFilter = selectedCategoryFilter,
                                    onCategoryClick = { selectedCategoryFilter = it },
                                    isProductCategoryDomain = isProductCategoryDomain,
                                    filteredProductsForCategory = filteredProductsForCategory,
                                    filteredPublicBusinesses = filteredPublicBusinesses,
                                    favoriteIds = favoriteIds,
                                    onToggleFavorite = {
                                        if (isGuest) navController.navigate(Screen.LoginRegister.route)
                                        else viewModel.toggleFavorite(it)
                                    },
                                    cartItems = cartItems,
                                    isGuest = isGuest,
                                    navController = navController,
                                    context = context
                                )
                            } else {
                                CustomerHomeFeedSection(
                                    dashboardConfig = dashboardConfig,
                                    banners = banners,
                                    publicBusinesses = publicBusinesses,
                                    categoriesList = categoriesList,
                                    selectedCategoryFilter = selectedCategoryFilter,
                                    onCategoryClick = { selectedCategoryFilter = it },
                                    branches = branches,
                                    nearbyResult = nearbyResult,
                                    favoriteIds = favoriteIds,
                                    onToggleFavorite = {
                                        if (isGuest) navController.navigate(Screen.LoginRegister.route)
                                        else viewModel.toggleFavorite(it)
                                    },
                                    featuredProducts = featuredProducts,
                                    flashDeals = flashDeals,
                                    discountedProducts = discountedProducts,
                                    isGuest = isGuest,
                                    navController = navController,
                                    context = context,
                                    allProducts = allProducts,
                                    recentOrders = recentOrders,
                                    customerLat = customerLat,
                                    customerLng = customerLng
                                )
                                Spacer(modifier = Modifier.height(32.dp))
                            }
                        }
                    }
                }
            }
        }
    }

    // DIÁLOGO DE CARRITO & CHECKOUT MODULARIZADO (FASE 5D.1 EXTENDIDO)
    val effectiveAddCharge = if (systemConfig.additionalChargeEnabled) systemConfig.additionalChargeAmount else 0.0

    CartCheckoutDialog(
        showCartDialog = showCartDialog,
        cartModalStep = cartModalStep,
        cartItems = cartItems,
        subtotal = CartManager.subtotal,
        publicBusinesses = publicBusinesses,
        userAddresses = userAddresses,
        defaultAddressDoc = defaultAddressDoc,
        isPlacingOrder = isPlacingOrder,
        isGuest = isGuest,
        additionalChargeAmount = effectiveAddCharge,
        additionalChargeDescription = systemConfig.additionalChargeDescription,
        additionalChargePolicyId = systemConfig.additionalChargePolicyId,
        additionalChargePolicyVersion = systemConfig.additionalChargePolicyVersion,
        couponCodeInput = couponCodeInput,
        appliedCouponDiscount = appliedCouponDiscount,
        appliedCouponCode = appliedCouponCode,
        couponValidationMessage = couponValidationMessage,
        isValidatingCoupon = isValidatingCoupon,
        commerceQuote = commerceQuote,
        isCalculatingCommerceQuote = isCalculatingCommerceQuote,
        quoteErrorMessage = quoteErrorMessage,
        onCalculateCommerceQuote = { bizId, branchId, destLat, destLng ->
            viewModel.calculateCommerceDeliveryQuote(bizId, branchId, destLat, destLng)
        },
        onClearCommerceQuote = {
            viewModel.clearCommerceQuote()
        },
        onDismiss = {
            showCartDialog = false
            cartModalStep = 1
            viewModel.clearCommerceQuote()
        },
        onStepChange = { step ->
            cartModalStep = step
            if (step == 1) {
                viewModel.clearCommerceQuote()
            }
        },
        onIncrementQuantity = { CartManager.incrementQuantity(it) },
        onDecrementQuantity = { CartManager.decrementQuantity(it) },
        onRemoveItem = { CartManager.removeItem(it) },
        onClearCart = { CartManager.clear() },
        onApplyCoupon = { codeRaw ->
            val cleanCode = codeRaw.trim().uppercase()
            if (cleanCode.isNotBlank()) {
                isValidatingCoupon = true
                couponValidationMessage = null
                val targetBizId = cartItems.firstOrNull()?.businessId ?: ""
                coroutineScope.launch {
                    val couponRepo = com.example.data.repository.CouponRepository()
                    val result = couponRepo.validateCoupon(
                        rawCode = cleanCode,
                        businessId = targetBizId,
                        cartSubtotal = CartManager.subtotal,
                        deliveryFee = 0.0,
                        customerId = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid
                    )
                    if (result.isValid) {
                        val totalDisc = result.discountAmount + result.deliveryDiscountAmount
                        appliedCouponDiscount = totalDisc
                        appliedCouponCode = cleanCode
                        appliedCouponSnapshot = result.appliedCoupon?.let { c ->
                            mapOf(
                                "couponId" to c.id,
                                "code" to c.code,
                                "scope" to c.scope.name,
                                "businessId" to c.businessId,
                                "discountType" to c.discountType.name,
                                "discountValue" to c.discountValue,
                                "discountAmount" to totalDisc
                            )
                        }
                        couponValidationMessage = "¡Cupón $cleanCode aplicado! (-C$ ${String.format(java.util.Locale.US, "%.2f", totalDisc)}) 🎉"
                    } else {
                        appliedCouponDiscount = 0.0
                        appliedCouponCode = null
                        appliedCouponSnapshot = null
                        couponValidationMessage = "${result.errorMessage ?: "Código no válido"} ❌"
                    }
                    isValidatingCoupon = false
                }
            }
        },
        onCouponCodeChange = { couponCodeInput = it },
        onProceedToCheckout = { grandTotal, itemCount ->
            CartManager.beginCheckout(grandTotal, itemCount)
            cartModalStep = 2
        },
        onConfirmOrder = { effectiveAddress, deliveryFee, paymentMethod, addressId, lat, lng, fullAddr, instr, tipAmt, tipType, addChargeAmt, addChargePolicyId, addChargePolicyVer, deliveryNote, quote ->
            val primaryBizId = cartItems.firstOrNull()?.businessId ?: "general"
            val primaryBizName = cartItems.firstOrNull()?.businessName ?: "Comercio"
            DashboardAnalyticsTracker.logEvent(
                eventType = "order",
                itemType = "order",
                itemId = primaryBizId,
                itemName = primaryBizName,
                revenueAmount = CartManager.subtotal
            )
            showCartDialog = false
            cartModalStep = 1
            viewModel.placeOrder(
                deliveryAddress = effectiveAddress,
                deliveryFee = deliveryFee,
                paymentMethod = paymentMethod,
                addressId = addressId,
                latitude = lat,
                longitude = lng,
                fullAddress = fullAddr,
                instructions = instr,
                couponCode = appliedCouponCode,
                couponDiscount = appliedCouponDiscount,
                couponSnapshot = appliedCouponSnapshot,
                tipAmount = tipAmt,
                tipSelectionType = tipType,
                additionalChargeAmount = addChargeAmt,
                additionalChargePolicyId = addChargePolicyId,
                additionalChargePolicyVersion = addChargePolicyVer,
                deliveryNote = deliveryNote,
                commerceQuote = quote
            )
        },
        onGuestRedirectToAuth = {
            showCartDialog = false
            cartModalStep = 1
            navController.navigate(Screen.LoginRegister.route)
        },
        onInvalidAddressWarning = {
            Toast.makeText(context, "Por favor seleccioná o ingresá una dirección válida", Toast.LENGTH_SHORT).show()
        }
    )

    // DIÁLOGO DE NOTIFICACIONES (REALTIME)
    if (showNotificationDialog) {
        val coroutineScope = rememberCoroutineScope()
        com.example.presentation.customer.profile.CustomerNotificationsDialog(
            notifications = notificationsList,
            unreadCount = unreadCount,
            onDismiss = { showNotificationDialog = false },
            onMarkAsRead = { notifId ->
                coroutineScope.launch {
                    notificationRepo.markAsRead(notifId)
                }
            },
            onMarkAllAsRead = {
                coroutineScope.launch {
                    notificationRepo.markAllAsRead()
                }
            },
            onNotificationClick = { item ->
                val route = com.example.navigation.NotificationRouter.resolve(item, "customer")
                com.example.navigation.NotificationRouter.navigateSafely(navController, route)
            }
        )
    }

    // ─── DIÁLOGO DE POP-UP PROMOCIONAL (Actividad #10 Enterprise) ─────────────
    if (activePopupToShow != null) {
        PromotionalPopupDialog(
            popup = activePopupToShow,
            onDismiss = {
                val currentPopup = activePopupToShow
                if (currentPopup != null) {
                    popupRepo.recordPopupDismissed(currentPopup, context)
                }
                activePopupToShow = null
            },
            onActionClick = { popup ->
                popupRepo.recordPopupDismissed(popup, context)
                activePopupToShow = null
                DestinationRouter.navigateToDestination(
                    context = context,
                    navController = navController,
                    destinationType = popup.actionType,
                    destination = popup.actionTarget
                )
            }
        )
    }

    // ─── ASISTENTE IA CONVERSACIONAL (Phase C3-E / C3-N) ─────────────────────
    CustomerAIOverlay(
        viewModel = aiViewModel,
        onNavigateToProduct = { productId, businessId ->
            val targetBizId = businessId.ifBlank {
                allProducts.find { it.id == productId }?.businessId ?: publicBusinesses.firstOrNull()?.id ?: ""
            }
            if (targetBizId.isNotBlank()) {
                navController.navigate("comercio_detalle_screen/$targetBizId?productId=$productId")
            }
        },
        onNavigateToBusiness = { businessId ->
            if (businessId.isNotBlank()) {
                navController.navigate("comercio_detalle_screen/$businessId")
            }
        },
        onNavigateToOrder = { orderId ->
            if (orderId.isNotBlank()) {
                navController.navigate(Screen.OrderDetail.createRoute(orderId))
            }
        }
    )
    }
}
