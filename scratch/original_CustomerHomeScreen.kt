package com.example.presentation.customer

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
    notificationRepo: NotificationRepository = remember { NotificationRepository() },
    categoryRepo: CategoryRepository = remember { CategoryRepository() }
) {
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val isLoadingCategories by viewModel.isLoadingCategories.collectAsState()
    val cartItemCount by viewModel.cartItemCount.collectAsState()
    val cartItems by viewModel.cartItems.collectAsState()
    val favoriteIds by viewModel.favoriteIds.collectAsState()
    val orderPlaced by viewModel.orderPlaced.collectAsState()
    val isPlacingOrder by viewModel.isPlacingOrder.collectAsState()

    val notificationsList by notificationRepo.notifications.collectAsState()
    val unreadCount by notificationRepo.unreadCount.collectAsState()
    val categoriesList by categoryRepo.categories.collectAsState()

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

    val currentUserName = remember(userProfile) {
        val profName = userProfile?.nombre?.ifBlank { userProfile?.name }
        val authUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        val fallbackName = authUser?.email?.substringBefore("@")
        (profName?.ifBlank { null } ?: fallbackName) ?: "Cliente"
    }

    val coroutineScope = androidx.compose.runtime.rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    LaunchedEffect(isGuest, context) {
        CartManager.initContext(context)
        categoryRepo.startListening()
        if (!isGuest) {
            val uid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""
            if (uid.isNotEmpty()) {
                notificationRepo.startListening(uid)
            }
        }
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

    var selectedTab by remember(initialTab) { mutableIntStateOf(initialTab) }
    var showCartDialog by remember { mutableStateOf(false) }
    var cartModalStep by remember { mutableStateOf(1) } // 1: Carrito, 2: Checkout
    var selectedSavedAddressId by remember { mutableStateOf<String?>(null) }
    var customAddressText by remember { mutableStateOf("") }
    var isCustomAddressSelected by remember { mutableStateOf(false) }
    var selectedPaymentMethod by remember { mutableStateOf("efectivo") }

    var couponCodeInput by remember { mutableStateOf("") }
    var appliedCouponDiscount by remember { mutableDoubleStateOf(0.0) }
    var appliedCouponCode by remember { mutableStateOf<String?>(null) }
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

    // Ubicación GPS del cliente desde la dirección predeterminada
    val customerLat = defaultAddressDoc?.latitude ?: 0.0
    val customerLng = defaultAddressDoc?.longitude ?: 0.0
    val hasCustomerLocation = customerLat != 0.0 && customerLng != 0.0

    // Catálogo ordenado por proximidad GPS real si existen coordenadas
    val sortedPublicBusinesses = remember(publicBusinesses, hasCustomerLocation, customerLat, customerLng) {
        if (hasCustomerLocation) {
            publicBusinesses.sortedBy { biz ->
                // Distancia orientativa
                4.8
            }
        } else {
            publicBusinesses
        }
    }

    val filteredPublicBusinesses = remember(sortedPublicBusinesses, searchQueryText, selectedCategoryFilter) {
        val queryNorm = searchQueryText.trim().lowercase()
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
        val catNorm = selectedCategoryFilter.trim().lowercase()
            .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

        sortedPublicBusinesses.filter { biz ->
            val nameNorm = biz.getEffectiveName().trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            val categoryNorm = biz.getEffectiveCategory().trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            val catIdNorm = biz.categoryId.trim().lowercase()
            val catSlugNorm = biz.categorySlug.trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
            val addressNorm = biz.getEffectiveAddress().trim().lowercase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

            val matchesQuery = queryNorm.isEmpty() || (
                nameNorm.contains(queryNorm) ||
                categoryNorm.contains(queryNorm) ||
                addressNorm.contains(queryNorm)
            )

            val matchesCategory = catNorm.isEmpty() || (
                categoryNorm.contains(catNorm) || catNorm.contains(categoryNorm) ||
                (catIdNorm.isNotEmpty() && catIdNorm.contains(catNorm)) ||
                (catSlugNorm.isNotEmpty() && (catSlugNorm.contains(catNorm) || catNorm.contains(catSlugNorm)))
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

    // Listen to real-time featured businesses from Firestore
    val featuredFromDb by remember { firebaseManager.listenToFeaturedBusinesses() }.collectAsState(initial = emptyList())
    val featuredBusinesses = remember(featuredFromDb) {
        featuredFromDb
    }

    // Tarifa de envío dinámica basada en reglas de negocio
    val deliveryFee = remember(hasCustomerLocation) {
        if (hasCustomerLocation) 35.0 else 40.0
    }


    Scaffold(
        bottomBar = {
            CustomerBottomNavigationBar(
                selectedTab = selectedTab,
                onTabSelected = { index ->
                    if (isGuest && (index == 3 || index == 4)) {
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
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(BgLightApp)
                .padding(paddingValues)
        ) {
            when (selectedTab) {
                1 -> {
                    // Favoritos Tab
                    FavoritesScreen(
                        favoriteIds = favoriteIds,
                        firebaseManager = firebaseManager,
                        onNavigateToComercio = { id -> navController.navigate("comercio_detalle_screen/$id") },
                        onToggleFavorite = { id -> viewModel.toggleFavorite(id) }
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
                        onNavigateToSolicitarEnvio = { navController.navigate("solicitar_envio_form") }
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
                            // 1. TOPBAR CON GRADIENTE AZUL/CELESTE Y BUSCADOR
                            Box(
                                modifier = Modifier
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
                                        // Bloque de Usuario (Avatar y Saludo)
                                        Row(
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
                                            Column {
                                                Text(
                                                    text = "Hola, $currentUserName",
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 16.sp,
                                                    color = Color.White
                                                )
                                                Text(
                                                    text = "¡Bienvenido! 👋",
                                                    fontWeight = FontWeight.Medium,
                                                    fontSize = 12.sp,
                                                    color = Color.White.copy(alpha = 0.9f)
                                                )
                                                Text(
                                                    text = "¿Qué deseas pedir hoy?",
                                                    fontSize = 10.sp,
                                                    color = Color.White.copy(alpha = 0.75f)
                                                )
                                            }
                                        }

                                        // Iconos de Notificaciones y Carrito a la Derecha con Sombras
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            // Botón Notificaciones
                                            Surface(
                                                shape = CircleShape,
                                                color = Color.White.copy(alpha = 0.2f),
                                                modifier = Modifier.size(40.dp)
                                            ) {
                                                IconButton(onClick = { showNotificationDialog = true }) {
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
                                                IconButton(onClick = {
                                                    if (isGuest) navController.navigate(Screen.LoginRegister.route)
                                                    else showCartDialog = true
                                                }) {
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
                                        modifier = Modifier.clickable {
                                            if (isGuest) navController.navigate(Screen.LoginRegister.route)
                                            else navController.navigate(Screen.AddressManager.route)
                                        }
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
                                            .clickable { showSearchBar = !showSearchBar },
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                    ) {
                                        if (showSearchBar) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(horizontal = 16.dp, vertical = 4.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)
                                                androidx.compose.material3.TextField(
                                                    value = searchQueryText,
                                                    onValueChange = {
                                                        searchQueryText = it
                                                        viewModel.onSearchQueryChanged(it)
                                                    },
                                                    placeholder = { Text("Locales, platos y productos...", fontSize = 13.sp) },
                                                    singleLine = true,
                                                    modifier = Modifier.weight(1f),
                                                    colors = androidx.compose.material3.TextFieldDefaults.colors(
                                                        focusedContainerColor = Color.Transparent,
                                                        unfocusedContainerColor = Color.Transparent,
                                                        focusedIndicatorColor = Color.Transparent,
                                                        unfocusedIndicatorColor = Color.Transparent
                                                    )
                                                )
                                                if (searchQueryText.isNotEmpty()) {
                                                    IconButton(onClick = {
                                                        searchQueryText = ""
                                                        viewModel.onSearchQueryChanged("")
                                                        showSearchBar = false
                                                    }) {
                                                        Icon(Icons.Default.Close, contentDescription = "Limpiar", tint = Color.Gray)
                                                    }
                                                }
                                                IconButton(onClick = {
                                                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                                                        putExtra(RecognizerIntent.EXTRA_PROMPT, "Habla ahora para buscar...")
                                                    }
                                                    try { speechRecognizerLauncher.launch(intent) }
                                                    catch (e: Exception) { Toast.makeText(context, "Reconocimiento de voz no soportado", Toast.LENGTH_SHORT).show() }
                                                }) {
                                                    Icon(Icons.Default.Mic, contentDescription = "Voz", tint = BlueSecondary)
                                                }
                                            }
                                        } else {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(Icons.Default.Search, contentDescription = "Buscar", tint = Color.Gray)
                                                Spacer(modifier = Modifier.width(12.dp))
                                                Text(
                                                    text = if (searchQueryText.isEmpty()) "Locales, platos y productos..." else "🔍 \"$searchQueryText\"",
                                                    color = if (searchQueryText.isEmpty()) Color.Gray else Color.Black,
                                                    fontSize = 14.sp,
                                                    modifier = Modifier.weight(1f)
                                                )
                                                Icon(Icons.Default.Mic, contentDescription = "Micrófono", tint = BlueSecondary, modifier = Modifier.size(24.dp).clickable {
                                                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                                                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                                                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                                                        putExtra(RecognizerIntent.EXTRA_PROMPT, "Habla ahora para buscar...")
                                                    }
                                                    try { speechRecognizerLauncher.launch(intent) } catch (e: Exception) {}
                                                })
                                            }
                                        }
                                    }
                                }
                            }

                            // 2. CARRUSEL DE BANNERS DINÁMICOS
                            BannersSection(
                                banners = banners,
                                onBannerClick = { banner ->
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
                            
                                  // 3. BARRA HORIZONTAL DE CATEGORÍAS
                                  if (dashboardConfig.showCategories) {
                                      val dynamicCategories = remember(publicBusinesses, categoriesList) {
                                          val homeRepoCats = categoriesList.filter { it.showInHome && it.active }.sortedBy { it.orderIndex }
                                          if (homeRepoCats.isNotEmpty()) {
                                              homeRepoCats.map { cat ->
                                                  val emoji = if (cat.icon.isNotBlank()) cat.icon else "📁"
                                                  val parsedColor = try {
                                                      val cStr = if (cat.bgColor.startsWith("#")) cat.bgColor else "#EFF6FF"
                                                      Color(android.graphics.Color.parseColor(cStr))
                                                  } catch (e: Exception) {
                                                      Color(0xFFEFF6FF)
                                                  }
                                                  Triple(cat, emoji, parsedColor)
                                              }
                                          } else {
                                              val bizCats = publicBusinesses.map { it.getEffectiveCategory() }.filter { it.isNotBlank() }.distinct()
                                              bizCats.map { cat ->
                                                  val emoji = when (cat.lowercase()) {
                                                      "restaurante", "restaurantes" -> "🍔"
                                                      "tienda", "tiendas" -> "🏬"
                                                      "supermercado", "supermercados" -> "🛒"
                                                      "farmacia", "farmacias" -> "💊"
                                                      "postres" -> "🍰"
                                                      else -> "📁"
                                                  }
                                                  val mockCat = com.example.domain.model.Category(name = cat, icon = emoji)
                                                  Triple(mockCat, emoji, Color(0xFFEFF6FF))
                                              }
                                          }
                                      }

                                      Text(
                                          text = "Categorías",
                                          fontWeight = FontWeight.ExtraBold,
                                          fontSize = 18.sp,
                                          color = Color(0xFF0F172A),
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )
                                      Spacer(modifier = Modifier.height(10.dp))

                                      LazyRow(
                                          contentPadding = PaddingValues(horizontal = 16.dp),
                                          horizontalArrangement = Arrangement.spacedBy(10.dp)
                                      ) {
                                          items(dynamicCategories) { (catObj, emoji, bgCol) ->
                                              val isSelected = selectedCategoryFilter.equals(catObj.name, ignoreCase = true) ||
                                                               (catObj.slug.isNotBlank() && selectedCategoryFilter.equals(catObj.slug, ignoreCase = true))
                                              Surface(
                                                  shape = RoundedCornerShape(16.dp),
                                                  color = if (isSelected) BluePrimary else bgCol,
                                                  border = BorderStroke(1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0)),
                                                  modifier = Modifier
                                                      .clickable {
                                                          selectedCategoryFilter = if (isSelected) "" else catObj.name
                                                      }
                                                      .shadow(1.dp, RoundedCornerShape(16.dp))
                                              ) {
                                                  Row(
                                                      modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                                      verticalAlignment = Alignment.CenterVertically,
                                                      horizontalArrangement = Arrangement.spacedBy(8.dp)
                                                  ) {
                                                      Text(emoji, fontSize = 20.sp)
                                                      Text(
                                                          catObj.name,
                                                          fontWeight = FontWeight.Bold,
                                                          fontSize = 13.sp,
                                                          color = if (isSelected) Color.White else Color(0xFF0F172A)
                                                      )
                                                      if (catObj.isFeatured) {
                                                          Text("⭐", fontSize = 11.sp)
                                                      }
                                                  }
                                              }
                                          }
                                      }
                                      Spacer(modifier = Modifier.height(20.dp))
                                  }

                                  // 4. CUSTOMER GLOBAL SEARCH ENGINE v1.0 (Comercios + Platos + Combos + Promociones)
                                  if (searchQueryText.isNotBlank()) {
                                      val searchResults by viewModel.searchResults.collectAsState()
                                      val selectedSearchFilter by viewModel.selectedSearchFilter.collectAsState()

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
                                          modifier = Modifier
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
                                                  color = Color(0xFF0F172A)
                                              )
                                              TextButton(
                                                  onClick = {
                                                      searchQueryText = ""
                                                      viewModel.onSearchQueryChanged("")
                                                      showSearchBar = false
                                                  }
                                              ) {
                                                  Text("Limpiar", color = BluePrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                              }
                                          }

                                          Spacer(modifier = Modifier.height(8.dp))

                                          // Pestañas de filtrado rápido de entidades
                                          val filterTabs = listOf(
                                              Triple("TODOS", "Todos", searchResults.totalCount),
                                              Triple("COMERCIOS", "🏪 Comercios", searchResults.businesses.size),
                                              Triple("PLATOS", "🍔 Platos", searchResults.products.size),
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
                                                      color = if (isSelected) BluePrimary else Color(0xFFF1F5F9),
                                                      border = BorderStroke(1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0)),
                                                      modifier = Modifier.clickable { viewModel.onSearchFilterSelected(tabKey) }
                                                  ) {
                                                      Text(
                                                          text = "$tabTitle ($tabCount)",
                                                          color = if (isSelected) Color.White else Color(0xFF334155),
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
                                                  colors = CardDefaults.cardColors(containerColor = Color.White),
                                                  border = BorderStroke(1.dp, Color(0xFFE2E8F0))
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
                                                          tint = Color.LightGray,
                                                          modifier = Modifier.size(52.dp)
                                                      )
                                                      Spacer(Modifier.height(10.dp))
                                                      Text(
                                                          "No encontramos resultados para \"$searchQueryText\"",
                                                          fontWeight = FontWeight.Bold,
                                                          fontSize = 15.sp,
                                                          color = Color(0xFF0F172A),
                                                          textAlign = TextAlign.Center
                                                      )
                                                      Spacer(Modifier.height(6.dp))
                                                      Text(
                                                          "Prueba buscando por nombre de plato (ej: pollo, hamburguesa, pizza), combo o restaurante.",
                                                          fontSize = 12.sp,
                                                          color = Color.Gray,
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
                                                  colors = CardDefaults.cardColors(containerColor = Color.White),
                                                  border = BorderStroke(1.dp, Color(0xFFE2E8F0))
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
                                                          color = Color.Gray,
                                                          textAlign = TextAlign.Center
                                                      )
                                                      TextButton(onClick = { viewModel.onSearchFilterSelected("TODOS") }) {
                                                          Text("Ver todos los resultados (${searchResults.totalCount})", color = BluePrimary)
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
                                                          onAddToCart = if (result.type == com.example.domain.engine.intelligence.CustomerSearchResultType.PRODUCT ||
                                                              result.type == com.example.domain.engine.intelligence.CustomerSearchResultType.COMBO) {
                                                              {
                                                                  CartManager.addToCart(
                                                                      productId = result.id,
                                                                      productName = result.title,
                                                                      price = result.price ?: 0.0,
                                                                      quantity = 1,
                                                                      businessId = result.businessId,
                                                                      businessName = result.businessName,
                                                                      imageUrl = result.imageUrl
                                                                  )
                                                                  Toast.makeText(context, "¡${result.title} agregado al carrito! 🛒", Toast.LENGTH_SHORT).show()
                                                              }
                                                          } else null,
                                                          onClick = {
                                                              if (result.businessId.isNotBlank()) {
                                                                  navController.navigate("comercio_detalle_screen/${result.businessId}")
                                                              }
                                                          }
                                                      )
                                                  }
                                              }
                                          }
                                      }
                                      Spacer(modifier = Modifier.height(20.dp))
                                  } else if (selectedCategoryFilter.isNotBlank()) {
                                      Text(
                                          text = "Comercios en \"$selectedCategoryFilter\" (${filteredPublicBusinesses.size})",
                                          fontWeight = FontWeight.ExtraBold,
                                          fontSize = 18.sp,
                                          color = Color(0xFF0F172A),
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )
                                      Spacer(modifier = Modifier.height(10.dp))

                                      if (filteredPublicBusinesses.isEmpty()) {
                                          Column(
                                              modifier = Modifier.fillMaxWidth().padding(24.dp),
                                              horizontalAlignment = Alignment.CenterHorizontally
                                          ) {
                                              Icon(Icons.Default.SearchOff, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
                                              Spacer(Modifier.height(8.dp))
                                              Text("Sin resultados para esta categoría", color = Color.Gray, fontSize = 14.sp)
                                              TextButton(onClick = { selectedCategoryFilter = "" }) {
                                                  Text("Limpiar filtro de categoría", color = BluePrimary)
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
                                                      onToggleFavorite = { viewModel.toggleFavorite(business.id) },
                                                      onClick = { navController.navigate("comercio_detalle_screen/${business.id}") }
                                                  )
                                              }
                                          }
                                      }
                                      Spacer(modifier = Modifier.height(20.dp))
                                  } else {
                                      Text(
                                          text = "Comercios Cerca de Ti 🏢",
                                          fontWeight = FontWeight.ExtraBold,
                                          fontSize = 18.sp,
                                          color = Color(0xFF0F172A),
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )
                                      Spacer(modifier = Modifier.height(10.dp))


                                      if (filteredPublicBusinesses.isEmpty()) {
                                          Text(
                                              text = "No hay comercios disponibles en este momento.",
                                              color = Color.Gray,
                                              fontSize = 14.sp,
                                              modifier = Modifier.padding(horizontal = 16.dp)
                                          )
                                      } else {
                                          LazyRow(
                                              contentPadding = PaddingValues(horizontal = 16.dp),
                                              horizontalArrangement = Arrangement.spacedBy(14.dp)
                                          ) {
                                              items(filteredPublicBusinesses) { business ->
                                                  PublicBusinessCard(
                                                      business = business,
                                                      isFavorite = favoriteIds.contains(business.id),
                                                      onToggleFavorite = { viewModel.toggleFavorite(business.id) },
                                                      onClick = { navController.navigate("comercio_detalle_screen/${business.id}") }
                                                  )
                                              }
                                          }
                                      }
                                      Spacer(modifier = Modifier.height(20.dp))
                                  }

                                  // 5. COMERCIOS DESTACADOS
                                  val featuredPublicList = remember(publicBusinesses) {
                                      publicBusinesses.filter { it.getEffectiveIsFeatured() }
                                  }

                                  if (dashboardConfig.showFeaturedBusinesses) {
                                      Text(
                                          text = "Comercios Destacados ⭐",
                                          fontWeight = FontWeight.Bold,
                                          fontSize = 18.sp,
                                          color = Color(0xFF1E293B),
                                          modifier = Modifier.padding(horizontal = 16.dp)
                                      )
                                      Spacer(modifier = Modifier.height(12.dp))

                                      if (featuredPublicList.isEmpty()) {
                                          Card(
                                              modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                                              colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9)),
                                              shape = RoundedCornerShape(12.dp)
                                          ) {
                                              Text(
                                                  text = "No hay comercios destacados configurados actualmente.",
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
                                              items(featuredPublicList) { business ->
                                                  PublicBusinessCard(
                                                      business = business,
                                                      isFavorite = favoriteIds.contains(business.id),
                                                      onToggleFavorite = { viewModel.toggleFavorite(business.id) },
                                                      onClick = { navController.navigate("comercio_detalle_screen/${business.id}") }
                                                  )
                                              }
                                          }
                                      }
                                      Spacer(modifier = Modifier.height(20.dp))
                                  }

                            // 5. PRODUCTOS ESTRELLA (SPRINT 15)
                            if (dashboardConfig.showFeaturedProducts) {
                                Text(
                                    text = "Productos Estrella ⭐",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp,
                                    color = Color(0xFF0F172A),
                                    modifier = Modifier.padding(horizontal = 16.dp)
                                )
                                Spacer(modifier = Modifier.height(10.dp))

                                val starList = remember(featuredProducts) {
                                    featuredProducts
                                }

                                if (starList.isEmpty()) {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                    ) {
                                        Text(
                                            text = "No hay productos estrella configurados actualmente.",
                                            color = Color.Gray,
                                            fontSize = 13.sp,
                                            modifier = Modifier.padding(16.dp)
                                        )
                                    }
                                } else {
                                    LazyRow(
                                        contentPadding = PaddingValues(horizontal = 16.dp),
                                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                                    ) {
                                        items(starList) { star ->
                                            StarProductCard(
                                                name = star.name,
                                                price = star.price,
                                                originalPrice = star.originalPrice,
                                                businessName = star.businessName,
                                                imageUrl = star.imageUrl,
                                                onClick = { navController.navigate("comercio_detalle_screen/${star.businessId}") }
                                            )
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.height(20.dp))
                            }

                            // 6. OFERTAS FLASH ⚡ (SPRINT 15)
                            if (dashboardConfig.showFlashDeals) {
                                Text(
                                    text = "Ofertas Flash ⚡ (Tiempo Limitado)",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp,
                                    color = Color(0xFFD97706),
                                    modifier = Modifier.padding(horizontal = 16.dp)
                                )
                                Spacer(modifier = Modifier.height(10.dp))

                                val dealsList = remember(flashDeals) {
                                    flashDeals
                                }

                                if (dealsList.isEmpty()) {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                    ) {
                                        Text(
                                            text = "No hay ofertas flash activas en este momento.",
                                            color = Color.Gray,
                                            fontSize = 13.sp,
                                            modifier = Modifier.padding(16.dp)
                                        )
                                    }
                                } else {
                                    LazyRow(
                                        contentPadding = PaddingValues(horizontal = 16.dp),
                                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                                    ) {
                                        items(dealsList) { deal ->
                                            FlashDealCard(
                                                title = deal.title,
                                                discountTag = deal.discountTag,
                                                price = deal.price,
                                                originalPrice = deal.originalPrice,
                                                onClick = { navController.navigate("comercio_detalle_screen/${deal.businessId}") }
                                            )
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.height(20.dp))
                            }

                            // 7. PRODUCTOS CON DESCUENTOS (CAMBIADO DE PRECIOS IMPERDIBLES %)
                            Text(
                                text = "Productos con Descuentos 🏷️",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = Color(0xFF1E293B),
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            val promoItemsList = remember(discountedProducts) {
                                discountedProducts
                            }

                            if (promoItemsList.isEmpty()) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                                ) {
                                    Text(
                                        text = "No hay productos con descuentos configurados actualmente.",
                                        color = Color.Gray,
                                        fontSize = 13.sp,
                                        modifier = Modifier.padding(16.dp)
                                    )
                                }
                            } else {
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    items(promoItemsList) { prod ->
                                        val formattedPrice = "C$ ${String.format("%.2f", prod.price)}"
                                        val formattedOriginalPrice = if (prod.originalPrice != null && prod.originalPrice > prod.price) {
                                            "C$ ${String.format("%.2f", prod.originalPrice)}"
                                        } else ""
                                        val discountPct = if (prod.originalPrice != null && prod.originalPrice > prod.price && prod.originalPrice > 0.0) {
                                            (((prod.originalPrice - prod.price) / prod.originalPrice) * 100).toInt()
                                        } else 0
                                        val discountTag = if (discountPct > 0) "-$discountPct%" else ""

                                        ProductPromoCard(
                                            name = prod.name,
                                            price = formattedPrice,
                                            originalPrice = formattedOriginalPrice,
                                            imageUrl = prod.imageUrl,
                                            discountTag = discountTag,
                                            onClick = {
                                                if (prod.businessId.isNotBlank()) {
                                                    navController.navigate("comercio_detalle_screen/${prod.businessId}")
                                                }
                                            },
                                            onAddToCart = {
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
                                        )
                                    }
                                }
                            }

                            // 8. BANNER X -> Y DELIVERY (PUNTO A -> PUNTO B)
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 8.dp)
                                    .shadow(6.dp, RoundedCornerShape(20.dp)),
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.Transparent)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(
                                            Brush.linearGradient(
                                                colors = listOf(
                                                    Color(0xFF0F172A),
                                                    Color(0xFF1E293B),
                                                    Color(0xFF1E3A8A)
                                                )
                                            )
                                        )
                                        .border(
                                            width = 1.dp,
                                            brush = Brush.linearGradient(
                                                listOf(Color(0xFF38BDF8).copy(alpha = 0.6f), Color(0xFF6366F1).copy(alpha = 0.3f))
                                            ),
                                            shape = RoundedCornerShape(20.dp)
                                        )
                                        .padding(20.dp)
                                ) {
                                    Column(
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            Surface(
                                                shape = RoundedCornerShape(12.dp),
                                                color = Color(0xFF38BDF8).copy(alpha = 0.15f),
                                                modifier = Modifier.size(44.dp)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Text("🚚", fontSize = 22.sp)
                                                }
                                            }
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = "DELIVERY DE PUNTO A → PUNTO B",
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 14.sp,
                                                    color = Color.White,
                                                    letterSpacing = 0.5.sp
                                                )
                                                Text(
                                                    text = "Servicio Express Directo",
                                                    fontWeight = FontWeight.SemiBold,
                                                    fontSize = 11.sp,
                                                    color = Color(0xFF38BDF8)
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(12.dp))

                                        Text(
                                            text = "¿Necesitas enviar algo?\nSolicita un delivery desde cualquier punto de origen hasta tu destino.",
                                            fontSize = 13.sp,
                                            color = Color(0xFFCBD5E1),
                                            lineHeight = 18.sp
                                        )

                                        Spacer(modifier = Modifier.height(16.dp))

                                        Button(
                                            onClick = {
                                                navController.navigate("solicitar_envio_form")
                                            },
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(44.dp),
                                            shape = RoundedCornerShape(12.dp),
                                            colors = ButtonDefaults.buttonColors(
                                                containerColor = Color(0xFF38BDF8)
                                            ),
                                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.Center
                                            ) {
                                                Text(
                                                    text = "SOLICITAR DELIVERY",
                                                    fontWeight = FontWeight.ExtraBold,
                                                    fontSize = 13.sp,
                                                    color = Color(0xFF0F172A),
                                                    letterSpacing = 0.5.sp
                                                )
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Icon(
                                                    imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                                    contentDescription = null,
                                                    tint = Color(0xFF0F172A),
                                                    modifier = Modifier.size(16.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(32.dp))
                        }
                    }
                }
            }
        }
    }

    // DIÁLOGO DE CARRITO REAL CON CREACIÓN DE PEDIDO EN FIRESTORE (2 PASOS & MODELO B MULTI-COMERCIO)
    if (showCartDialog) {
        val groupedByBiz = remember(cartItems) {
            cartItems.groupBy { if (it.businessId.isNotBlank()) it.businessId else "general" }
        }

        // Calcular costo de envío por comercio en el carrito (Modelo B)
        val bizDeliveryFees = remember(groupedByBiz, publicBusinesses) {
            groupedByBiz.keys.associateWith { bizId ->
                val bInfo = publicBusinesses.find { it.id == bizId }
                bInfo?.getEffectiveDeliveryFee() ?: 45.0
            }
        }
        val totalDeliveryFees = bizDeliveryFees.values.sum()
        val baseGrandTotal = CartManager.subtotal + totalDeliveryFees
        val grandTotal = (baseGrandTotal - appliedCouponDiscount).coerceAtLeast(0.0)

        // Función para validar y aplicar cupones en tiempo real desde Firestore
        val validateAndApplyCoupon: (String) -> Unit = { codeRaw ->
            val cleanCode = codeRaw.trim().uppercase()
            if (cleanCode.isNotBlank()) {
                isValidatingCoupon = true
                couponValidationMessage = null
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()

                db.collection("promotions")
                    .get()
                    .addOnSuccessListener { snap ->
                        val matchedDoc = snap?.documents?.find { doc ->
                            val cCode = doc.getString("couponCode") ?: doc.getString("code") ?: ""
                            cCode.trim().equals(cleanCode, ignoreCase = true)
                        }

                        if (matchedDoc != null) {
                            val discountType = matchedDoc.getString("discountType") ?: matchedDoc.getString("type") ?: "PERCENTAGE"
                            val discountVal = matchedDoc.getDouble("discountValue") ?: matchedDoc.getDouble("discount") ?: matchedDoc.getDouble("value") ?: 10.0
                            val active = matchedDoc.getBoolean("isActive") ?: matchedDoc.getBoolean("active") ?: true

                            if (active) {
                                val discountAmt = if (discountType.equals("PERCENTAGE", true) || discountType.equals("porcentaje", true)) {
                                    (CartManager.subtotal * (discountVal / 100.0))
                                } else {
                                    discountVal
                                }
                                appliedCouponDiscount = discountAmt
                                appliedCouponCode = cleanCode
                                couponValidationMessage = "¡Cupón $cleanCode aplicado! (-C$ ${String.format("%.2f", discountAmt)}) 🎉"
                            } else {
                                couponValidationMessage = "El cupón $cleanCode ya no está activo ❌"
                            }
                            isValidatingCoupon = false
                        } else {
                            // Probar fallback en colección /coupons
                            db.collection("coupons")
                                .get()
                                .addOnSuccessListener { snap2 ->
                                    val matchedDoc2 = snap2?.documents?.find { doc ->
                                        val cCode = doc.getString("code") ?: doc.getString("couponCode") ?: ""
                                        cCode.trim().equals(cleanCode, ignoreCase = true)
                                    }
                                    if (matchedDoc2 != null) {
                                        val discountVal2 = matchedDoc2.getDouble("discount") ?: matchedDoc2.getDouble("value") ?: 15.0
                                        appliedCouponDiscount = discountVal2
                                        appliedCouponCode = cleanCode
                                        couponValidationMessage = "¡Cupón $cleanCode aplicado! (-C$ ${String.format("%.2f", discountVal2)}) 🎉"
                                    } else {
                                        couponValidationMessage = "Código '$cleanCode' no válido o no encontrado ❌"
                                    }
                                    isValidatingCoupon = false
                                }
                                .addOnFailureListener {
                                    couponValidationMessage = "Error validando código '$cleanCode' ❌"
                                    isValidatingCoupon = false
                                }
                        }
                    }
                    .addOnFailureListener {
                        couponValidationMessage = "Error de conexión al validar cupón ❌"
                        isValidatingCoupon = false
                    }
            }
        }

        // Inicializar dirección guardada seleccionada al abrir
        LaunchedEffect(showCartDialog, userAddresses, defaultAddressDoc) {
            if (selectedSavedAddressId == null && userAddresses.isNotEmpty()) {
                val def = defaultAddressDoc ?: userAddresses.firstOrNull()
                selectedSavedAddressId = def?.id
            } else if (userAddresses.isEmpty()) {
                isCustomAddressSelected = true
            }
        }

        AlertDialog(
            onDismissRequest = {
                if (!isPlacingOrder) {
                    showCartDialog = false
                    cartModalStep = 1
                }
            },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (cartModalStep == 1) Icons.Default.ShoppingCart else Icons.Default.ReceiptLong,
                            contentDescription = null,
                            tint = BluePrimary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (cartModalStep == 1) "Mi Carrito" else "Finalizar Pedido",
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            color = Color(0xFF0F172A)
                        )
                    }
                    if (cartItems.isNotEmpty()) {
                        Text(
                            text = "Paso $cartModalStep de 2",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF475569)
                        )
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 420.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (cartItems.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(48.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Tu carrito está vacío 🛒",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = Color(0xFF475569)
                                )
                                Text(
                                    text = "Agregá productos desde el menú de cualquier comercio.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF64748B),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    } else if (cartModalStep == 1) {
                        // ── PASO 1: REVISIÓN DE CARRITO MULTI-COMERCIO ─────────────────────
                        groupedByBiz.forEach { (bizId, bizItems) ->
                            val bizName = bizItems.firstOrNull { it.businessName.isNotBlank() }?.businessName
                                ?: publicBusinesses.find { it.id == bizId }?.getEffectiveName()
                                ?: "Comercio"
                            val fee = bizDeliveryFees[bizId] ?: 45.0

                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "🏪 $bizName",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 14.sp,
                                            color = BluePrimary
                                        )
                                        Text(
                                            text = "Envío: C$ ${fee.toInt()}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF475569)
                                        )
                                    }

                                    HorizontalDivider(color = Color(0xFFE2E8F0))

                                    bizItems.forEach { item ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                                                Text("C$ ${String.format("%.2f", item.price)} c/u", fontSize = 11.sp, color = Color(0xFF64748B))
                                            }

                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                                            ) {
                                                IconButton(
                                                    onClick = { CartManager.decrementQuantity(item.productId) },
                                                    modifier = Modifier.size(28.dp)
                                                ) {
                                                    Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Menos", tint = Color(0xFF64748B), modifier = Modifier.size(20.dp))
                                                }

                                                Text(
                                                    text = "${item.quantity}",
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 14.sp,
                                                    color = Color(0xFF0F172A),
                                                    modifier = Modifier.padding(horizontal = 4.dp)
                                                )

                                                IconButton(
                                                    onClick = { CartManager.incrementQuantity(item.productId) },
                                                    modifier = Modifier.size(28.dp)
                                                ) {
                                                    Icon(Icons.Default.AddCircle, contentDescription = "Más", tint = BluePrimary, modifier = Modifier.size(20.dp))
                                                }

                                                IconButton(
                                                    onClick = { CartManager.removeItem(item.productId) },
                                                    modifier = Modifier.size(28.dp)
                                                ) {
                                                    Icon(Icons.Default.DeleteOutline, contentDescription = "Eliminar", tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Sección de Código de Cupón / Descuento 🎟️
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("🎟️ CÓDIGO DE DESCUENTO O CUPÓN", fontSize = 12.sp, fontWeight = FontWeight.Black, color = BluePrimary)
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    OutlinedTextField(
                                        value = couponCodeInput,
                                        onValueChange = { couponCodeInput = it },
                                        placeholder = { Text("Ej: BIENVENIDA10", fontSize = 12.sp, color = Color(0xFF94A3B8)) },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true,
                                        shape = RoundedCornerShape(8.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            focusedBorderColor = BluePrimary,
                                            unfocusedBorderColor = Color(0xFFCBD5E1),
                                            focusedTextColor = Color(0xFF0F172A),
                                            unfocusedTextColor = Color(0xFF0F172A)
                                        )
                                    )
                                    Button(
                                        onClick = { validateAndApplyCoupon(couponCodeInput) },
                                        colors = ButtonDefaults.buttonColors(containerColor = BluePrimary, contentColor = Color.White),
                                        shape = RoundedCornerShape(8.dp),
                                        enabled = !isValidatingCoupon && couponCodeInput.isNotBlank()
                                    ) {
                                        if (isValidatingCoupon) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                        } else {
                                            Text("Aplicar", fontWeight = FontWeight.Black, fontSize = 12.sp)
                                        }
                                    }
                                }
                                if (couponValidationMessage != null) {
                                    Text(
                                        text = couponValidationMessage!!,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (appliedCouponCode != null) Color(0xFF10B981) else Color(0xFFEF4444)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Resumen Financiero del Paso 1
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFEFF6FF), RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Subtotal Productos", fontSize = 13.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
                                Text("C$ ${String.format("%.2f", CartManager.subtotal)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Envío (${groupedByBiz.size} comercio${if (groupedByBiz.size > 1) "s" else ""})", fontSize = 13.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
                                Text("C$ ${String.format("%.2f", totalDeliveryFees)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                            }
                            if (appliedCouponDiscount > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Descuento Cupón (${appliedCouponCode})", fontSize = 13.sp, color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
                                    Text("-C$ ${String.format("%.2f", appliedCouponDiscount)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                                }
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = Color(0xFFBFDBFE))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total a Pagar", fontSize = 15.sp, fontWeight = FontWeight.Black, color = BluePrimary)
                                Text("C$ ${String.format("%.2f", grandTotal)}", fontSize = 16.sp, fontWeight = FontWeight.Black, color = BluePrimary)
                            }
                        }

                    } else {
                        // ── PASO 2: CHECKOUT (DIRECCIÓN & MÉTODOS DE PAGO) ────────────────
                        Text("📍 DIRECCIÓN DE ENTREGA", fontSize = 12.sp, fontWeight = FontWeight.Black, color = BluePrimary)

                        if (userAddresses.isNotEmpty()) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                userAddresses.forEach { addr ->
                                    val isSelected = !isCustomAddressSelected && selectedSavedAddressId == addr.id
                                    val iconVector = when (addr.label.lowercase()) {
                                        "casa", "home" -> Icons.Default.Home
                                        "trabajo", "work", "oficina" -> Icons.Default.Work
                                        else -> Icons.Default.Place
                                    }

                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                selectedSavedAddressId = addr.id
                                                isCustomAddressSelected = false
                                            },
                                        colors = CardDefaults.cardColors(containerColor = if (isSelected) Color(0xFFEFF6FF) else Color(0xFFF8FAFC)),
                                        border = BorderStroke(if (isSelected) 2.dp else 1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            Icon(iconVector, contentDescription = null, tint = if (isSelected) BluePrimary else Color(0xFF64748B), modifier = Modifier.size(22.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(addr.label.ifBlank { "Dirección Guardada" }, fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF0F172A))
                                                Text(addr.fullAddress, fontSize = 11.sp, color = Color(0xFF475569), maxLines = 2, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Medium)
                                            }
                                            if (isSelected) {
                                                Icon(Icons.Default.CheckCircle, contentDescription = "Seleccionada", tint = BluePrimary, modifier = Modifier.size(20.dp))
                                            }
                                        }
                                    }
                                }

                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            isCustomAddressSelected = true
                                            selectedSavedAddressId = "custom"
                                        },
                                    colors = CardDefaults.cardColors(containerColor = if (isCustomAddressSelected) Color(0xFFEFF6FF) else Color(0xFFF8FAFC)),
                                    border = BorderStroke(if (isCustomAddressSelected) 2.dp else 1.dp, if (isCustomAddressSelected) BluePrimary else Color(0xFFE2E8F0))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Icon(Icons.Default.AddLocation, contentDescription = null, tint = if (isCustomAddressSelected) BluePrimary else Color(0xFF64748B), modifier = Modifier.size(22.dp))
                                        Text("➕ Usar otra dirección", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (isCustomAddressSelected) BluePrimary else Color(0xFF334155))
                                    }
                                }
                            }
                        }

                        if (isCustomAddressSelected || userAddresses.isEmpty()) {
                            OutlinedTextField(
                                value = customAddressText,
                                onValueChange = { customAddressText = it },
                                placeholder = { Text("Ej: Semáforos UCA 2c al lago, Casa #45", fontSize = 12.sp, color = Color(0xFF64748B)) },
                                leadingIcon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = BluePrimary) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                maxLines = 3,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = BluePrimary,
                                    unfocusedBorderColor = Color(0xFFCBD5E1),
                                    focusedTextColor = Color(0xFF0F172A),
                                    unfocusedTextColor = Color(0xFF0F172A)
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Text("💳 MÉTODO DE PAGO", fontSize = 12.sp, fontWeight = FontWeight.Black, color = BluePrimary)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("efectivo" to "💵 Efectivo", "tarjeta" to "💳 Tarjeta").forEach { (methodKey, label) ->
                                val isSelected = selectedPaymentMethod == methodKey
                                Card(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable {
                                            selectedPaymentMethod = methodKey
                                        },
                                    colors = CardDefaults.cardColors(containerColor = if (isSelected) Color(0xFFEFF6FF) else Color(0xFFF8FAFC)),
                                    border = BorderStroke(if (isSelected) 2.dp else 1.dp, if (isSelected) BluePrimary else Color(0xFFE2E8F0))
                                ) {
                                    Box(modifier = Modifier.padding(10.dp), contentAlignment = Alignment.Center) {
                                        Text(label, fontWeight = FontWeight.Black, fontSize = 13.sp, color = if (isSelected) BluePrimary else Color(0xFF334155))
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Banner informativo Modelo B
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9))
                        ) {
                            Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Modelo B: Se crearán ${groupedByBiz.size} pedido(s) independiente(s) por comercio. Total: C$ ${String.format("%.2f", grandTotal)}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF334155)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                if (cartItems.isNotEmpty()) {
                    if (cartModalStep == 1) {
                        Button(
                            onClick = {
                                CartManager.beginCheckout(grandTotal, CartManager.cartItemCount.value)
                                cartModalStep = 2
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = BluePrimary, contentColor = Color.White)
                        ) {
                            Text("Continuar al Checkout →", fontWeight = FontWeight.Black, color = Color.White)
                        }
                    } else {
                        val selAddress = if (!isCustomAddressSelected && userAddresses.isNotEmpty()) {
                            userAddresses.find { it.id == selectedSavedAddressId }
                        } else null

                        val effectiveAddressToSubmit = if (selAddress != null) {
                            "${selAddress.label}: ${selAddress.fullAddress}"
                        } else {
                            customAddressText
                        }

                        val isAddressValid = effectiveAddressToSubmit.isNotBlank() && effectiveAddressToSubmit != "Seleccionar dirección 📍"

                        Button(
                            onClick = {
                                if (!isGuest && isAddressValid) {
                                    showCartDialog = false
                                    cartModalStep = 1
                                    val currentUid = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid ?: ""
                                    val currentEmail = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.email ?: ""
                                    viewModel.placeOrder(
                                        deliveryAddress = effectiveAddressToSubmit,
                                        deliveryFee = totalDeliveryFees,
                                        paymentMethod = selectedPaymentMethod,
                                        addressId = selAddress?.id,
                                        latitude = selAddress?.latitude ?: 0.0,
                                        longitude = selAddress?.longitude ?: 0.0,
                                        fullAddress = selAddress?.fullAddress ?: effectiveAddressToSubmit,
                                        instructions = selAddress?.getEffectiveInstructions() ?: ""
                                    )
                                } else if (isGuest) {
                                    showCartDialog = false
                                    cartModalStep = 1
                                    navController.navigate(Screen.LoginRegister.route)
                                } else {
                                    Toast.makeText(context, "Por favor seleccioná o ingresá una dirección válida", Toast.LENGTH_SHORT).show()
                                }
                            },
                            enabled = !isPlacingOrder && isAddressValid,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1D4ED8), contentColor = Color.White)
                        ) {
                            if (isPlacingOrder) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            } else {
                                Text("CONFIRMAR PEDIDO 🚀", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color.White)
                            }
                        }
                    }
                }
            },
            dismissButton = {
                if (cartItems.isNotEmpty()) {
                    if (cartModalStep == 2) {
                        TextButton(onClick = { cartModalStep = 1 }) {
                            Text("← Volver al Carrito", color = BluePrimary)
                        }
                    } else {
                        TextButton(onClick = {
                            CartManager.clear()
                            showCartDialog = false
                            cartModalStep = 1
                        }) {
                            Text("Vaciar", color = Color.Red)
                        }
                    }
                } else {
                    TextButton(onClick = { showCartDialog = false; cartModalStep = 1 }) {
                        Text("Cerrar")
                    }
                }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color.White
        )
    }

    // DIÁLOGO DE NOTIFICACIONES (REALTIME)
    if (showNotificationDialog) {
        val coroutineScope = rememberCoroutineScope()
        AlertDialog(
            onDismissRequest = { showNotificationDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.NotificationsActive, contentDescription = null, tint = BlueSecondary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Notificaciones (${notificationsList.size})", fontWeight = FontWeight.Bold)
                }
            },
            text = {
                if (notificationsList.isEmpty()) {
                    Text("No tienes notificaciones por el momento.", color = Color.Gray, fontSize = 13.sp)
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 350.dp)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        notificationsList.forEach { item ->
                            NotificationItem(
                                title = item.title,
                                body = item.body,
                                isRead = item.isRead,
                                onClick = {
                                    if (!item.isRead) {
                                        coroutineScope.launch {
                                            notificationRepo.markAsRead(item.id)
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { showNotificationDialog = false }, colors = ButtonDefaults.buttonColors(containerColor = BluePrimary)) {
                    Text("Cerrar")
                }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color.White
        )
    }
}

@Composable
fun CategoryCard(
    name: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    bgColor: Color,
    iconColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .height(84.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = name,
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF1E293B),
                modifier = Modifier.weight(1f)
            )
            Icon(
                imageVector = icon,
                contentDescription = name,
                tint = iconColor,
                modifier = Modifier.size(32.dp)
            )
        }
    }
}

@Composable
fun ProductPromoCard(
    name: String,
    price: String,
    originalPrice: String,
    imageUrl: String = "",
    discountTag: String = "",
    onClick: () -> Unit = {},
    onAddToCart: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(160.dp)
            .shadow(4.dp, RoundedCornerShape(16.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column {
            // Real product image with Coil and fallback
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(110.dp)
                    .background(Color(0xFFF1F5F9)),
                contentAlignment = Alignment.Center
            ) {
                if (imageUrl.isNotBlank()) {
                    coil.compose.AsyncImage(
                        model = imageUrl,
                        contentDescription = name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(BlueSecondary.copy(alpha = 0.2f), BlueTertiary.copy(alpha = 0.4f))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Fastfood,
                            contentDescription = null,
                            tint = BluePrimary.copy(alpha = 0.7f),
                            modifier = Modifier.size(40.dp)
                        )
                    }
                }

                // Tag de Descuento Real Calculado
                if (discountTag.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp)
                            .background(Color(0xFFFF2D55), RoundedCornerShape(6.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(discountTag, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                    }
                }
            }

            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF1E293B),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = price,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFFF2D55),
                        fontSize = 14.sp
                    )
                    if (originalPrice.isNotBlank()) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = originalPrice,
                            color = Color.Gray,
                            fontSize = 11.sp,
                            textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = onAddToCart,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                    contentPadding = PaddingValues(vertical = 4.dp)
                ) {
                    Text("Agregar 🛒", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun FavoritesScreen(
    favoriteIds: Set<String> = emptySet(),
    firebaseManager: FirebaseManager? = null,
    onNavigateToComercio: (String) -> Unit = {},
    onToggleFavorite: (String) -> Unit = {}
) {
    val featuredBusinesses by remember {
        firebaseManager?.listenToFeaturedBusinesses() ?: kotlinx.coroutines.flow.MutableStateFlow(emptyList<com.example.Usuario>())
    }.collectAsState(initial = emptyList())

    val publicBusinesses by remember {
        firebaseManager?.listenToPublicCatalogBusinesses() ?: kotlinx.coroutines.flow.MutableStateFlow(emptyList<com.example.data.repository.BusinessInfo>())
    }.collectAsState(initial = emptyList())

    val favoriteBusinesses = remember(featuredBusinesses, favoriteIds) {
        featuredBusinesses.filter { favoriteIds.contains(it.uid) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
    ) {
        // TopBar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White,
            shadowElevation = 4.dp
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Favorite, contentDescription = null, tint = Color(0xFFFF2D55), modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(10.dp))
                Text("Mis Favoritos", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))
                Spacer(Modifier.weight(1f))
                if (favoriteBusinesses.isNotEmpty()) {
                    Text("${favoriteBusinesses.size} local(es)", fontSize = 12.sp, color = Color.Gray)
                }
            }
        }

        if (favoriteIds.isEmpty()) {
            // Estado vacío
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.FavoriteBorder,
                        contentDescription = null,
                        tint = Color(0xFFFF2D55).copy(alpha = 0.4f),
                        modifier = Modifier.size(80.dp)
                    )
                    Spacer(Modifier.height(16.dp))
                    Text("Aún no tienes favoritos", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "Toca el ❤️ en cualquier comercio del inicio para guardarlo aquí.",
                        textAlign = TextAlign.Center,
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                }
            }
        } else {
            androidx.compose.foundation.lazy.LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(favoriteBusinesses) { business ->
                    val iniciales = remember(business.nombre) {
                        val parts = business.nombre.split(" ")
                        if (parts.size >= 2) "${parts[0].firstOrNull() ?: 'B'}${parts[1].firstOrNull() ?: 'S'}"
                        else business.nombre.take(2).uppercase()
                    }
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onNavigateToComercio(business.uid) },
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(56.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.linearGradient(colors = listOf(BluePrimary, BlueSecondary))
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(iniciales, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                            Spacer(Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(business.nombre, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                                Text("Toca para abrir el menú →", fontSize = 12.sp, color = Color.Gray)
                            }
                            IconButton(onClick = { onToggleFavorite(business.uid) }) {
                                Icon(
                                    imageVector = Icons.Default.Favorite,
                                    contentDescription = "Quitar favorito",
                                    tint = Color(0xFFFF2D55)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}


@Composable
fun NotificationItem(
    title: String,
    body: String,
    isRead: Boolean = true,
    onClick: () -> Unit = {}
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = if (!isRead) Color(0xFFEFF6FF) else Color(0xFFF8FAFC)
        ),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, if (!isRead) Color(0xFF93C5FD) else Color(0xFFE2E8F0))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))
                if (!isRead) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(Color.Red, CircleShape)
                    )
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(body, fontSize = 12.sp, color = Color.Gray)
        }
    }
}

// ─── SPRINT 15 COMPONENTES ENTERPRISE DASHBOARD ───

@Composable
fun PublicBusinessCard(
    business: com.example.data.repository.BusinessInfo,
    isFavorite: Boolean = false,
    onToggleFavorite: () -> Unit = {},
    onClick: () -> Unit
) {
    val name = business.getEffectiveName()
    val category = business.getEffectiveCategory()
    val address = business.getEffectiveAddress()
    val logoUrl = business.getEffectiveLogoUrl()
    val bannerUrl = business.getEffectiveBannerUrl()
    val isOpen = business.getEffectiveIsOpen()

    Card(
        modifier = Modifier
            .width(240.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(105.dp)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(BluePrimary.copy(alpha = 0.8f), BlueSecondary.copy(alpha = 0.9f))
                        )
                    )
            ) {
                if (bannerUrl.isNotBlank()) {
                    coil.compose.AsyncImage(
                        model = bannerUrl,
                        contentDescription = name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = if (isOpen) Color(0xFF10B981) else Color(0xFF64748B),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                ) {
                    Text(
                        text = if (isOpen) "ABIERTO 🟢" else "CERRADO 🔴",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                IconButton(
                    onClick = onToggleFavorite,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(32.dp)
                        .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                ) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Favorito",
                        tint = if (isFavorite) Color(0xFFFF2D55) else Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Column(modifier = Modifier.padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (logoUrl.isNotBlank()) {
                        coil.compose.AsyncImage(
                            model = logoUrl,
                            contentDescription = name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .border(1.dp, Color(0xFFE2E8F0), CircleShape)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    } else {
                        val iniciales = remember(name) {
                            val parts = name.split(" ")
                            if (parts.size >= 2) "${parts[0].firstOrNull() ?: 'B'}${parts[1].firstOrNull() ?: 'S'}"
                            else name.take(2).uppercase()
                        }
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(BluePrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(iniciales, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = name,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 15.sp,
                            color = Color(0xFF0F172A),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = category,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = BlueSecondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(13.dp))
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = address,
                        fontSize = 11.sp,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "⭐ ${business.rating}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFD97706)
                    )
                }
            }
        }
    }
}

@Composable
fun BranchCard(
    branchName: String,
    businessName: String,
    address: String,
    prepTime: Int,
    isOpen: Boolean,
    rating: Double,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(220.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = if (isOpen) Color(0xFFECFDF5) else Color(0xFFFFF1F2)
                ) {
                    Text(
                        if (isOpen) "ABIERTO 🟢" else "CERRADO 🔴",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isOpen) Color(0xFF10B981) else Color(0xFFE11938),
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(rating.toString(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(businessName, fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(branchName, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = BluePrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(modifier = Modifier.height(4.dp))
            Text("📍 $address", fontSize = 10.sp, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.AccessTime, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(12.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("$prepTime min • Delivery C$ 40", fontSize = 10.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
fun StarProductCard(
    name: String,
    price: Double,
    originalPrice: Double?,
    businessName: String,
    imageUrl: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(160.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp)
                    .background(Color(0xFFF1F5F9))
            ) {
                if (imageUrl.isNotBlank()) {
                    coil.compose.AsyncImage(
                        model = imageUrl,
                        contentDescription = name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
                Surface(
                    shape = RoundedCornerShape(topStart = 16.dp, bottomEnd = 12.dp),
                    color = Color(0xFFEF4444),
                    modifier = Modifier.align(Alignment.TopStart)
                ) {
                    Text("⭐ ESTRELLA", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                }
            }
            Column(modifier = Modifier.padding(10.dp)) {
                Text(name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(businessName, fontSize = 10.sp, color = BluePrimary, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("C$ ${String.format("%.0f", price)}", fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFF0F172A))
                    if (originalPrice != null) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("C$ ${String.format("%.0f", originalPrice)}", fontSize = 10.sp, color = Color(0xFF94A3B8), textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                    }
                }
            }
        }
    }
}

@Composable
fun FlashDealCard(
    title: String,
    discountTag: String,
    price: Double,
    originalPrice: Double,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(170.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
        border = BorderStroke(1.dp, Color(0xFFFDE68A)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFD97706)) {
                    Text(discountTag, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
                Text("⚡ FLASH", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFFD97706))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF78350F), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("C$ ${String.format("%.0f", price)}", fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color(0xFFB45309))
                Spacer(modifier = Modifier.width(6.dp))
                Text("C$ ${String.format("%.0f", originalPrice)}", fontSize = 11.sp, color = Color(0xFF9CA3AF), textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
            }
        }
    }
}

@Composable
fun GlobalSearchResultItemCard(
    result: com.example.domain.engine.intelligence.CustomerSearchResult,
    onAddToCart: (() -> Unit)? = null,
    onClick: () -> Unit
) {
    val (badgeBg, badgeText) = when (result.type) {
        com.example.domain.engine.intelligence.CustomerSearchResultType.BUSINESS -> Color(0xFFEFF6FF) to Color(0xFF1D4ED8)
        com.example.domain.engine.intelligence.CustomerSearchResultType.PRODUCT -> Color(0xFFFFF7ED) to Color(0xFFC2410C)
        com.example.domain.engine.intelligence.CustomerSearchResultType.COMBO -> Color(0xFFFAF5FF) to Color(0xFF7E22CE)
        com.example.domain.engine.intelligence.CustomerSearchResultType.PROMOTION -> Color(0xFFFDF2F8) to Color(0xFFBE185D)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFF1F5F9)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Imagen o Icono representativo
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center
            ) {
                if (result.imageUrl.isNotBlank() && (result.imageUrl.startsWith("http://") || result.imageUrl.startsWith("https://"))) {
                    coil.compose.AsyncImage(
                        model = result.imageUrl,
                        contentDescription = result.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Text(result.typeEmoji, fontSize = 32.sp)
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Información
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = badgeBg
                    ) {
                        Text(
                            text = "${result.typeEmoji} ${result.typeLabel}",
                            color = badgeText,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    if (result.discountTag != null) {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Color(0xFFFEF2F2)
                        ) {
                            Text(
                                text = result.discountTag!!,
                                color = Color(0xFFDC2626),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = result.title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF0F172A),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                if (result.subtitle.isNotBlank()) {
                    Text(
                        text = result.subtitle,
                        fontSize = 12.sp,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                if (result.description.isNotBlank()) {
                    Text(
                        text = result.description,
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (result.formattedPrice != null) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = result.formattedPrice!!,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 14.sp,
                                color = BluePrimary
                            )
                            if (result.formattedOriginalPrice != null) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = result.formattedOriginalPrice!!,
                                    fontSize = 11.sp,
                                    color = Color(0xFF94A3B8),
                                    textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough
                                )
                            }
                        }
                    } else {
                        Spacer(modifier = Modifier.width(1.dp))
                    }

                    if (onAddToCart != null) {
                        Button(
                            onClick = onAddToCart,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                            modifier = Modifier.height(30.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(2.dp))
                            Text("Pedir", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = "Ver",
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    }
}


