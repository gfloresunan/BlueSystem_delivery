package com.example.presentation.business

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.Pedido
import com.example.FirebaseManager
import com.example.ui.theme.BluePrimary
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.presentation.business.catalog.CatalogScreen
import com.example.presentation.business.catalog.ProductWizardDialog
import com.example.presentation.business.menu.CategoryMenuScreen
import com.example.data.repository.CategoryRepository
import com.example.data.repository.ProductRepository
import com.example.presentation.business.menu.MenuFilterChip
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import com.example.data.repository.BusinessRepository
import com.example.data.repository.BusinessInfo
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import com.example.toPedidoSafely
import com.example.eiam.domain.model.MerchantIdentityContext
import com.example.eiam.domain.resolver.MerchantIdentityResolver

val pYaRed = Color(0xFF2563EB)
val pYaLightRed = Color(0xFFEFF6FF)
val pYaDark = Color(0xFF0F172A)
val pYaBg = Color(0xFFF8FAFC)
val pYaGray = Color(0xFF64748B)
val pYaGreen = Color(0xFF10B981)
val pYaOrange = Color(0xFFF59E0B)


enum class BusinessTab {
    DASHBOARD, // Inicio / Resumen Operativo
    ORDERS,    // Pedidos en Tiempo Real (MOOC)
    MENU,      // Catálogo / Menú por Categorías (SSOT)
    MORE,      // Mi Negocio (Perfil, Horarios, Notificaciones, Configuración)
    FINANCE,   // Centro Financiero y Liquidaciones
    PROMOTIONS,// Promociones y Ofertas
    KDS,       // Kitchen Display System (Cocina)
    STAFF      // Personal y Empleados (EIAM)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessDashboardScreen(
    firebaseManager: FirebaseManager,
    onLogout: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current

    var identityContext by remember { mutableStateOf<MerchantIdentityContext?>(null) }
    var isResolvingIdentity by remember { mutableStateOf(true) }
    var identityError by remember { mutableStateOf<String?>(null) }
    var resolveTrigger by remember { mutableStateOf(0) }

    LaunchedEffect(resolveTrigger) {
        isResolvingIdentity = true
        identityError = null
        val res = MerchantIdentityResolver.resolve(forceRefresh = resolveTrigger > 0)
        res.onSuccess { ctx ->
            identityContext = ctx
            isResolvingIdentity = false
            com.example.data.FcmManager.registerCurrentDeviceToken("business")
        }.onFailure { err ->
            identityError = err.message ?: "No fue posible verificar la identidad del comercio"
            isResolvingIdentity = false
            identityContext = null
        }
    }

    if (isResolvingIdentity) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(pYaBg),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                CircularProgressIndicator(color = pYaRed)
                Text(
                    text = "Verificando identidad del comercio...",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = pYaDark
                )
                Text(
                    text = "Validando credenciales EIAM multi-tenant",
                    fontSize = 12.sp,
                    color = pYaGray
                )
            }
        }
        return
    }

    val resolvedIdentity = identityContext
    if (resolvedIdentity == null || !resolvedIdentity.isResolved || identityError != null) {
        FailClosedMerchantIdentityScreen(
            errorMessage = identityError ?: "Identidad del comercio no disponible",
            onRetry = { resolveTrigger++ },
            onLogout = onLogout
        )
        return
    }

    val canonicalBusinessId = resolvedIdentity.businessId
    val categoryRepo = remember { CategoryRepository() }
    val productRepo = remember { ProductRepository() }

    LaunchedEffect(canonicalBusinessId) {
        categoryRepo.startListening(canonicalBusinessId)
    }

    var activeTab by remember { mutableStateOf(BusinessTab.DASHBOARD) }
    var menuInitialFilter by remember { mutableStateOf(MenuFilterChip.ALL) }
    var isOpen by remember { mutableStateOf(true) }
    var showProductWizard by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<Product?>(null) }
    var isDashboardConfigurable by remember { mutableStateOf(false) }

    // Flujo reactivo de pedidos tenant-scoped
    val ordersFlow = remember(canonicalBusinessId) {
        callbackFlow<List<Pedido>> {
            val db = FirebaseFirestore.getInstance()
            if (canonicalBusinessId.isBlank()) {
                trySend(emptyList())
                close()
                return@callbackFlow
            }

            val query = db.collection("orders")
                .whereEqualTo("businessId", canonicalBusinessId)
                .orderBy("createdAt", Query.Direction.DESCENDING)

            var fallbackSubscription: com.google.firebase.firestore.ListenerRegistration? = null
            val subscription = query.addSnapshotListener { snapshot, error ->
                if (error != null) {
                    val fallbackQuery = db.collection("orders").whereEqualTo("businessId", canonicalBusinessId)
                    fallbackSubscription = fallbackQuery.addSnapshotListener { snap2, err2 ->
                        if (err2 != null) {
                            trySend(emptyList())
                            return@addSnapshotListener
                        }
                        val list = snap2?.documents?.mapNotNull { doc -> doc.toPedidoSafely() } ?: emptyList()
                        trySend(list.sortedByDescending { it.createdAt?.seconds ?: 0L })
                    }
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { doc -> doc.toPedidoSafely() } ?: emptyList()
                trySend(list)
            }
            awaitClose {
                subscription.remove()
                fallbackSubscription?.remove()
            }
        }
    }

    val orders by ordersFlow.collectAsState(initial = emptyList())

    // Clasificación de pedidos
    val nuevosOrders = orders.filter { it.status.lowercase() == "pending" || it.status.lowercase() == "payment_verifying" }
    val preparandoOrders = orders.filter { it.status.lowercase() == "preparing" }
    val esperandoRepartidor = orders.filter { it.status.lowercase() == "ready" }
    val enCaminoOrders = orders.filter { it.status.lowercase() == "in_transit" }
    val entregadosHoy = orders.filter { it.status.lowercase() == "delivered" || it.status.lowercase() == "completed" }
    val canceladosOrders = orders.filter { it.status.lowercase() == "cancelled" || it.status.lowercase() == "rejected" }

    // Métricas financieras calculadas dinámicamente
    val ventasHoyAmount = entregadosHoy.sumOf { it.total }
    val ticketPromedioAmount = if (entregadosHoy.isNotEmpty()) ventasHoyAmount / entregadosHoy.size else 0.0

    // Conteo dinámico de producto más vendido (cálculo legítimo sin fallbacks mock)
    val topProductCalculated = remember(orders) {
        val counts = orders.flatMap { it.items ?: emptyList() }
            .filter { item -> item != null && !item.name.isNullOrBlank() }
            .groupBy { item -> item.name }
            .mapValues { entry -> entry.value.sumOf { item -> item.quantity } }
        counts.maxByOrNull { it.value }?.key ?: "Sin ventas registradas"
    }

    val v2MenuEngine = remember {
        com.example.domain.engine.menu.MenuEngineImpl(
            categoryRepository = com.example.data.repository.menu.MenuCategoryRepositoryImpl(),
            productRepository = com.example.data.repository.menu.MenuProductRepositoryImpl(),
            versionRepository = com.example.data.repository.menu.MenuVersionRepositoryImpl()
        )
    }

    val v2PublishedProducts by v2MenuEngine.getPublishedLegacyProductsForCustomer(canonicalBusinessId).collectAsState(initial = emptyList())
    val firestoreProducts by productRepo.getProductsByBusiness(canonicalBusinessId).collectAsState(initial = emptyList())
    val firestoreCategories by categoryRepo.getCategoriesFlow(canonicalBusinessId).collectAsState(initial = emptyList())

    // Lista de productos 100% tenant-scoped y reactiva (EMPTY != ERROR, ZERO DEMO FALLBACK)
    val effectiveProductsList = remember(v2PublishedProducts, firestoreProducts) {
        if (firestoreProducts.isNotEmpty()) firestoreProducts else v2PublishedProducts
    }

    val businessRepo = remember { BusinessRepository() }
    val businessInfo by businessRepo.getBusinessFlow(canonicalBusinessId).collectAsState(initial = null)

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    var showLogoutDialogInDrawer by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = Color(0xFF0F172A),
                drawerContentColor = Color.White,
                modifier = Modifier.width(300.dp)
            ) {
                MerchantNavigationDrawerContent(
                    businessInfo = businessInfo,
                    activeTab = activeTab,
                    pendingOrdersCount = nuevosOrders.size,
                    onSelectTab = { tab ->
                        activeTab = tab
                        coroutineScope.launch { drawerState.close() }
                    },
                    onRequestLogout = {
                        coroutineScope.launch { drawerState.close() }
                        showLogoutDialogInDrawer = true
                    }
                )
            }
        }
    ) {
        Scaffold(
            bottomBar = {
                val isRestaurant = businessInfo?.let { 
                    it.category.contains("restauran", ignoreCase = true) || 
                    it.categoria.contains("restauran", ignoreCase = true) || 
                    it.categorySlug.contains("restauran", ignoreCase = true) || 
                    it.category.contains("comida", ignoreCase = true) 
                } ?: true
                val catalogLabel = if (isRestaurant) "Menú" else "Catálogo"
                val catalogIcon = if (isRestaurant) Icons.Default.RestaurantMenu else Icons.Default.Inventory2

                val merchantNavColors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Color.White,
                    selectedTextColor = BluePrimary,
                    indicatorColor = BluePrimary,
                    unselectedIconColor = Color(0xFF64748B),
                    unselectedTextColor = Color(0xFF64748B)
                )

                NavigationBar(containerColor = Color.White, tonalElevation = 8.dp) {
                    NavigationBarItem(
                        selected = activeTab == BusinessTab.DASHBOARD,
                        onClick = { activeTab = BusinessTab.DASHBOARD },
                        icon = { Icon(Icons.Default.Dashboard, contentDescription = "Inicio") },
                        label = { Text("Inicio", fontSize = 11.sp, fontWeight = if (activeTab == BusinessTab.DASHBOARD) FontWeight.Bold else FontWeight.SemiBold) },
                        colors = merchantNavColors
                    )
                    NavigationBarItem(
                        selected = activeTab == BusinessTab.ORDERS,
                        onClick = { activeTab = BusinessTab.ORDERS },
                        icon = {
                            BadgedBox(badge = { 
                                if (nuevosOrders.isNotEmpty()) {
                                    Badge(containerColor = Color(0xFFEF4444), contentColor = Color.White) { 
                                        Text(nuevosOrders.size.toString(), fontWeight = FontWeight.Bold) 
                                    }
                                }
                            }) {
                                Icon(Icons.Default.ReceiptLong, contentDescription = "Pedidos")
                            }
                        },
                        label = { Text("Pedidos", fontSize = 11.sp, fontWeight = if (activeTab == BusinessTab.ORDERS) FontWeight.Bold else FontWeight.SemiBold) },
                        colors = merchantNavColors
                    )
                    NavigationBarItem(
                        selected = activeTab == BusinessTab.MENU,
                        onClick = { activeTab = BusinessTab.MENU; menuInitialFilter = MenuFilterChip.ALL },
                        icon = { Icon(catalogIcon, contentDescription = catalogLabel) },
                        label = { Text(catalogLabel, fontSize = 11.sp, fontWeight = if (activeTab == BusinessTab.MENU) FontWeight.Bold else FontWeight.SemiBold) },
                        colors = merchantNavColors
                    )
                    NavigationBarItem(
                        selected = activeTab == BusinessTab.MORE,
                        onClick = { activeTab = BusinessTab.MORE },
                        icon = { Icon(Icons.Default.Storefront, contentDescription = "Mi Negocio") },
                        label = { Text("Mi Negocio", fontSize = 11.sp, fontWeight = if (activeTab == BusinessTab.MORE) FontWeight.Bold else FontWeight.SemiBold) },
                        colors = merchantNavColors
                    )
                }
            },
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(pYaBg)
                    .padding(innerPadding)
            ) {
                when (activeTab) {
                    BusinessTab.DASHBOARD -> com.example.presentation.business.dashboard.MerchantOperationsDashboardScreen(
                        businessId = canonicalBusinessId,
                        onNavigateTab = { target ->
                            when (target) {
                                "MENU", "COMMERCE", "CATALOG_SHELL", "ADD_PRODUCT" -> activeTab = BusinessTab.MENU
                                "ORDERS", "KDS" -> activeTab = BusinessTab.ORDERS
                                "FINANCE", "SETTLEMENTS", "FINANZAS" -> activeTab = BusinessTab.FINANCE
                                "PROMOTIONS", "OFERTAS", "CUPONES" -> activeTab = BusinessTab.MENU
                                "MORE", "STATS", "SETTINGS" -> activeTab = BusinessTab.MORE
                                else -> activeTab = BusinessTab.DASHBOARD
                            }
                        },
                        onOpenWizard = { editingProduct = null; showProductWizard = true },
                        onOpenKds = { activeTab = BusinessTab.ORDERS },
                        onOpenDrawer = { coroutineScope.launch { drawerState.open() } },
                        onLogout = onLogout
                    )

                    BusinessTab.ORDERS -> com.example.presentation.business.orders.MerchantOrdersOperationsCenterScreen(
                        businessId = canonicalBusinessId,
                        onOpenKds = { activeTab = BusinessTab.ORDERS }
                    )

                    BusinessTab.MENU -> CategoryMenuScreen(
                        products = effectiveProductsList,
                        categories = firestoreCategories,
                        initialFilterChip = menuInitialFilter,
                        onAddProductClick = { editingProduct = null; showProductWizard = true },
                        onEditProduct = { p -> editingProduct = p; showProductWizard = true },
                        onDuplicateProduct = { p ->
                            val copy = p.copy(
                                id = "",
                                name = "${p.name} (Copia)",
                                businessId = canonicalBusinessId
                            )
                            coroutineScope.launch {
                                productRepo.addProduct(copy)
                                snackbarHostState.showSnackbar("📑 Producto '${copy.name}' duplicado")
                            }
                        },
                        onToggleProductStatus = { id, currentStatus ->
                            coroutineScope.launch {
                                productRepo.toggleProductStatus(id, currentStatus)
                                val newStatus = if (currentStatus == ProductStatus.ACTIVE) "Agotado" else "Disponible"
                                snackbarHostState.showSnackbar("👁️ Estado cambiado a $newStatus")
                            }
                        },
                        onDeleteProduct = { id ->
                            coroutineScope.launch {
                                productRepo.deleteProduct(id, permanentDelete = true)
                                snackbarHostState.showSnackbar("🗑️ Producto eliminado del catálogo")
                            }
                        },
                        onReorderProducts = { reorderedList ->
                            coroutineScope.launch {
                                productRepo.reorderProducts(reorderedList.map { it.id })
                                snackbarHostState.showSnackbar("↕️ Orden del catálogo actualizado")
                            }
                        },
                        onCreateCategory = { catName ->
                            coroutineScope.launch {
                                categoryRepo.addCategory(name = catName, businessId = canonicalBusinessId)
                                snackbarHostState.showSnackbar("📁 Categoría '$catName' creada exitosamente")
                            }
                        }
                    )

                    BusinessTab.MORE -> com.example.presentation.business.settings.RestaurantSettingsCenterScreen(
                        restaurantId = canonicalBusinessId,
                        onBack = { activeTab = BusinessTab.DASHBOARD },
                        onOpenFinance = { activeTab = BusinessTab.FINANCE }
                    )

                    BusinessTab.FINANCE -> com.example.presentation.business.finance.MerchantFinanceCenterScreen(
                        businessId = canonicalBusinessId,
                        onNavigateBack = { activeTab = BusinessTab.DASHBOARD }
                    )

                    BusinessTab.PROMOTIONS -> PromotionsManagementView(
                        businessId = canonicalBusinessId
                    )

                    BusinessTab.KDS -> com.example.presentation.kitchen.KitchenDashboardScreen(
                        restaurantId = canonicalBusinessId,
                        onBack = { activeTab = BusinessTab.DASHBOARD }
                    )

                    BusinessTab.STAFF -> com.example.eiam.presentation.merchant.MerchantStaffCenterScreen(
                        businessId = canonicalBusinessId,
                        onNavigateBack = { activeTab = BusinessTab.DASHBOARD }
                    )
                }
            }
        }
    }

    if (showLogoutDialogInDrawer) {
        AlertDialog(
            onDismissRequest = { showLogoutDialogInDrawer = false },
            icon = { Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(32.dp)) },
            title = { Text("¿Deseas cerrar sesión?", fontWeight = FontWeight.Bold) },
            text = { Text("Se cerrará tu sesión activa en este dispositivo. Tus pedidos y la información del comercio permanecerán protegidos.") },
            confirmButton = {
                Button(
                    onClick = {
                        showLogoutDialogInDrawer = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Cerrar sesión", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showLogoutDialogInDrawer = false }) {
                    Text("Cancelar")
                }
            }
        )
    }

    if (showProductWizard) {
        com.example.presentation.business.catalog.ProductWizardEnterpriseDialog(
            product = editingProduct,
            businessId = canonicalBusinessId,
            onDismiss = { showProductWizard = false },
            onSaveSuccess = {
                showProductWizard = false
                editingProduct = null
                activeTab = BusinessTab.MENU
                coroutineScope.launch {
                    snackbarHostState.showSnackbar("¡Producto guardado exitosamente!")
                }
            }
        )
    }
}

/**
 * Pantalla Fail-Closed de Seguridad Multi-Tenant cuando no existe identidad empresarial válida.
 */
@Composable
fun FailClosedMerchantIdentityScreen(
    errorMessage: String,
    onRetry: () -> Unit,
    onLogout: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(pYaBg)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Surface(
                    shape = CircleShape,
                    color = Color(0xFFFEE2E2),
                    modifier = Modifier.size(64.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Default.Shield,
                            contentDescription = null,
                            tint = Color(0xFFDC2626),
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                Text(
                    text = "IDENTIDAD DEL COMERCIO NO DISPONIBLE",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF0F172A),
                    textAlign = TextAlign.Center
                )

                Text(
                    text = "No fue posible verificar la identidad empresarial de esta cuenta o no tienes un comercio asignado.\n\nPor seguridad multi-tenant, no se cargarán datos no autorizados.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xFF64748B),
                    textAlign = TextAlign.Center
                )

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFF8FAFC),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Detalle técnico:",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF475569)
                        )
                        Text(
                            text = errorMessage,
                            fontSize = 11.sp,
                            color = Color(0xFFEF4444),
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onLogout,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Cerrar sesión", color = Color(0xFFDC2626), fontWeight = FontWeight.Bold)
                    }

                    Button(
                        onClick = onRetry,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = pYaRed),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Reintentar", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

/**
 * Executive Operations Dashboard View con Centro de Alertas Operativo y Acciones Ampliadas (Uber Eats Level).
 */
@Composable
private fun ExecutiveDashboardView(
    storeName: String = "Mi Comercio",
    isOpen: Boolean,
    onToggleOpen: () -> Unit,
    nuevosCount: Int,
    preparandoCount: Int,
    esperandoCount: Int,
    enCaminoCount: Int,
    entregadosCount: Int,
    canceladosCount: Int,
    ventasHoy: Double,
    ticketPromedio: Double,
    topProduct: String,
    onQuickAction: (String) -> Unit,
    onLogout: () -> Unit,
    onSelectAlertProduct: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Executive Operations Header
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(storeName.ifBlank { "Mi Comercio" }, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Salir", tint = Color.Red)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(if (isOpen) Color(0xFFDCFCE7) else Color(0xFFFEE2E2), RoundedCornerShape(12.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(if (isOpen) pYaGreen else Color.Red))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (isOpen) "🟢 ABIERTO (Recibiendo Pedidos)" else "🔴 CERRADO (Pausado)",
                            fontWeight = FontWeight.Bold,
                            color = if (isOpen) Color(0xFF166534) else Color(0xFF991B1B)
                        )
                    }
                    Switch(checked = isOpen, onCheckedChange = { onToggleOpen() })
                }
            }
        }

        // 2. Centro de Alertas Operativo Superior
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
            modifier = Modifier.border(1.dp, Color(0xFFFCD34D), RoundedCornerShape(16.dp))
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.NotificationsActive, contentDescription = null, tint = pYaOrange)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Centro de Alertas del Comercio", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF92400E))
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (nuevosCount > 0) {
                        AssistChip(
                            onClick = { onQuickAction("ORDERS") },
                            label = { Text("🔔 $nuevosCount Nuevos", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                            colors = AssistChipDefaults.assistChipColors(containerColor = Color(0xFFFEE2E2), labelColor = Color(0xFF991B1B))
                        )
                    }
                    if (preparandoCount > 0) {
                        AssistChip(
                            onClick = { onQuickAction("ORDERS") },
                            label = { Text("👨‍🍳 $preparandoCount En Prep.", fontSize = 10.sp) },
                            colors = AssistChipDefaults.assistChipColors(containerColor = Color(0xFFFEF3C7), labelColor = Color(0xFF92400E))
                        )
                    }
                    if (nuevosCount == 0 && preparandoCount == 0) {
                        AssistChip(
                            onClick = {},
                            label = { Text("🟢 Operación Normal", fontSize = 10.sp) },
                            colors = AssistChipDefaults.assistChipColors(containerColor = Color(0xFFDCFCE7), labelColor = Color(0xFF166534))
                        )
                    }
                }
            }
        }

        // 3. Grid de Pedidos del Día
        Text("Estado Operativo del Día", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatusCard("🔔 Nuevos", nuevosCount.toString(), pYaRed, Modifier.weight(1f))
            StatusCard("👨‍🍳 Preparando", preparandoCount.toString(), pYaOrange, Modifier.weight(1f))
            StatusCard("🛵 Repartidor", esperandoCount.toString(), Color(0xFF0284C7), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatusCard("🚚 En Camino", enCaminoCount.toString(), Color(0xFF7C3AED), Modifier.weight(1f))
            StatusCard("✅ Entregados", entregadosCount.toString(), pYaGreen, Modifier.weight(1f))
            StatusCard("❌ Cancelados", canceladosCount.toString(), Color.Gray, Modifier.weight(1f))
        }

        // 4. KPIs Financieros
        Text("Métricas Financieras Hoy", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            KpiCard("Ventas Hoy", "C$ ${ventasHoy.toInt()}", pYaGreen, Modifier.weight(1f))
            KpiCard("Ticket Promedio", "C$ ${ticketPromedio.toInt()}", pYaRed, Modifier.weight(1f))
        }

        // 5. Matriz Ampliada de Acciones Rápidas (9 Botones)
        Text("Acciones Rápidas", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QuickActionButton("➕ Producto", Icons.Default.Add, pYaRed, Modifier.weight(1f)) { onQuickAction("ADD_PRODUCT") }
                QuickActionButton("📋 Menú", Icons.Default.RestaurantMenu, Color(0xFF0284C7), Modifier.weight(1f)) { onQuickAction("MENU") }
                QuickActionButton("📦 Stock", Icons.Default.Inventory2, Color(0xFF059669), Modifier.weight(1f)) { onQuickAction("MENU") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QuickActionButton("🏷️ Cupones", Icons.Default.ConfirmationNumber, Color(0xFFD97706), Modifier.weight(1f)) { onQuickAction("PROMOS") }
                QuickActionButton("🎁 Promos", Icons.Default.LocalOffer, Color(0xFF7C3AED), Modifier.weight(1f)) { onQuickAction("PROMOS") }
                QuickActionButton("💬 Opiniones", Icons.Default.RateReview, Color(0xFF2563EB), Modifier.weight(1f)) { onQuickAction("MORE") }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QuickActionButton("🔔 Avisos", Icons.Default.Notifications, Color(0xFF4B5563), Modifier.weight(1f)) { onQuickAction("MORE") }
                QuickActionButton("📊 Analíticas", Icons.Default.BarChart, pYaGreen, Modifier.weight(1f)) { onQuickAction("STATS") }
                QuickActionButton("⚙️ Ajustes", Icons.Default.Settings, Color(0xFF475569), Modifier.weight(1f)) { onQuickAction("MORE") }
            }
        }
    }
}

@Composable
private fun StatusCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold, color = color)
            Text(label, style = MaterialTheme.typography.labelSmall, fontSize = 10.sp, maxLines = 1)
        }
    }
}

@Composable
private fun KpiCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
private fun QuickActionButton(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = modifier.height(48.dp),
        contentPadding = PaddingValues(horizontal = 4.dp),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color)
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(4.dp))
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

@Composable
private fun OrdersKitchenView(nuevosOrders: List<Pedido>, preparandoOrders: List<Pedido>, listosOrders: List<Pedido>, onAcceptOrder: (String) -> Unit, onReadyOrder: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Cocina Digital en Tiempo Real", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(12.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(nuevosOrders) { order ->
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Pedido #${order.displayOrderCode.removePrefix("#")}", fontWeight = FontWeight.Bold)
                        Text("Total: C$ ${order.total.toInt()}", color = pYaRed, fontWeight = FontWeight.Bold)
                        Button(onClick = { onAcceptOrder(order.pedidoId) }, colors = ButtonDefaults.buttonColors(containerColor = pYaGreen), modifier = Modifier.padding(top = 8.dp)) {
                            Text("Aceptar y Comenzar Preparación")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PromotionsManagementView(
    businessId: String,
    viewModel: com.example.presentation.business.promotions.PromotionViewModel = remember { com.example.presentation.business.promotions.PromotionViewModel() }
) {
    LaunchedEffect(businessId) {
        viewModel.loadPromotions(businessId)
    }

    val promotions by viewModel.promotions.collectAsState()
    val coroutineScope = rememberCoroutineScope()

    var showDialog by remember { mutableStateOf(false) }
    var editingPromo by remember { mutableStateOf<com.example.domain.model.Promotion?>(null) }
    var titleInput by remember { mutableStateOf("") }
    var descInput by remember { mutableStateOf("") }
    var couponInput by remember { mutableStateOf("") }
    var discountInput by remember { mutableStateOf("") }
    var minOrderInput by remember { mutableStateOf("") }
    var activeInput by remember { mutableStateOf(true) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Gestión de Promociones 🏷️", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                Text("Crea ofertas activas y cupones de descuento sincronizados con Firestore.", fontSize = 12.sp, color = Color.Gray)
            }
            Button(
                onClick = {
                    editingPromo = null
                    titleInput = ""
                    descInput = ""
                    couponInput = ""
                    discountInput = ""
                    minOrderInput = ""
                    activeInput = true
                    showDialog = true
                },
                colors = ButtonDefaults.buttonColors(containerColor = pYaRed),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("+ Promo", fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        if (promotions.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .background(Color(0xFFF8FAFC), RoundedCornerShape(16.dp))
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.LocalOffer, contentDescription = null, modifier = Modifier.size(48.dp), tint = Color.Gray)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("No hay promociones registradas para este comercio", fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                    Text("Presiona '+ Promo' para publicar tu primera oferta real en Firestore.", fontSize = 11.sp, color = Color.Gray)
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(promotions) { promo ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(promo.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    if (promo.couponCode.isNotBlank()) {
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Surface(
                                            color = Color(0xFFEFF6FF),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                text = "CUPÓN: ${promo.couponCode}",
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF2563EB)
                                            )
                                        }
                                    }
                                }
                                if (promo.description.isNotBlank()) {
                                    Text(promo.description, fontSize = 12.sp, color = Color.Gray)
                                }
                                if (promo.discountPercentage > 0) {
                                    Text("Descuento: ${promo.discountPercentage.toInt()}%", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF059669))
                                }
                                Text(
                                    text = if (promo.active) "ACTIVA ✔" else "INACTIVA",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (promo.active) pYaGreen else Color.Red
                                )
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Switch(
                                    checked = promo.active,
                                    onCheckedChange = {
                                        viewModel.togglePromotionActive(promo.id, promo.active)
                                    }
                                )
                                IconButton(
                                    onClick = {
                                        editingPromo = promo
                                        titleInput = promo.title
                                        descInput = promo.description
                                        couponInput = promo.couponCode
                                        discountInput = if (promo.discountPercentage > 0) promo.discountPercentage.toString() else ""
                                        minOrderInput = if (promo.minOrderAmount > 0) promo.minOrderAmount.toString() else ""
                                        activeInput = promo.active
                                        showDialog = true
                                    }
                                ) {
                                    Icon(Icons.Default.Edit, contentDescription = null, tint = Color(0xFF2563EB))
                                }
                                IconButton(
                                    onClick = {
                                        viewModel.deletePromotion(promo.id)
                                    }
                                ) {
                                    Icon(Icons.Default.Delete, contentDescription = null, tint = Color.Red)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text(if (editingPromo == null) "Nueva Promoción 🏷️" else "Editar Promoción", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = titleInput,
                        onValueChange = { titleInput = it },
                        label = { Text("Título de la Oferta (Ej. 20% OFF en Pizzas)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = descInput,
                        onValueChange = { descInput = it },
                        label = { Text("Descripción / Términos") },
                        minLines = 2,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = discountInput,
                            onValueChange = { discountInput = it },
                            label = { Text("% Descuento") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = couponInput,
                            onValueChange = { couponInput = it },
                            label = { Text("Código Cupón") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    OutlinedTextField(
                        value = minOrderInput,
                        onValueChange = { minOrderInput = it },
                        label = { Text("Monto Mínimo de Pedido (opcional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Promoción Activa", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Switch(
                            checked = activeInput,
                            onCheckedChange = { activeInput = it }
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (titleInput.isNotBlank()) {
                            viewModel.savePromotion(
                                id = editingPromo?.id ?: "",
                                businessId = businessId,
                                title = titleInput,
                                description = descInput,
                                discountPercentage = discountInput.toDoubleOrNull() ?: 0.0,
                                couponCode = couponInput.trim().uppercase(),
                                minOrderAmount = minOrderInput.toDoubleOrNull() ?: 0.0,
                                active = activeInput,
                                onSuccess = { showDialog = false }
                            )
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = pYaRed)
                ) {
                    Text(if (editingPromo == null) "Publicar Promoción" else "Guardar Cambios")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) { Text("Cancelar") }
            }
        )
    }
}


@Composable
private fun MoreSettingsView(onLogout: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Configuración del Comercio", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Perfil del Negocio", fontWeight = FontWeight.Bold)
                Text("Horarios de atención, dirección y fotos de portada.")
            }
        }
        Button(onClick = onLogout, colors = ButtonDefaults.buttonColors(containerColor = Color.Red), modifier = Modifier.fillMaxWidth()) {
            Icon(Icons.Default.ExitToApp, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Cerrar Sesión")
        }
    }
}

@Composable
fun MerchantNavigationDrawerContent(
    businessInfo: BusinessInfo?,
    activeTab: BusinessTab,
    pendingOrdersCount: Int,
    onSelectTab: (BusinessTab) -> Unit,
    onRequestLogout: () -> Unit
) {
    val storeName = businessInfo?.getEffectiveName()?.ifBlank { "Mi Comercio" } ?: "Mi Comercio"
    val logoUrl = businessInfo?.getEffectiveLogoUrl() ?: ""

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        // Header del Drawer
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = Color.White,
                shadowElevation = 4.dp,
                modifier = Modifier.size(48.dp)
            ) {
                if (logoUrl.isNotBlank()) {
                    AsyncImage(
                        model = logoUrl,
                        contentDescription = storeName,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Storefront, contentDescription = null, tint = Color(0xFF0052CC), modifier = Modifier.size(28.dp))
                    }
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = storeName,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "Panel de Operaciones",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp
                )
            }
        }

        HorizontalDivider(color = Color(0xFF1E293B), modifier = Modifier.padding(vertical = 8.dp))

        // Items de Navegación del Drawer
        NavigationDrawerItem(
            label = { Text("Dashboard", fontWeight = FontWeight.Bold) },
            selected = activeTab == BusinessTab.DASHBOARD,
            onClick = { onSelectTab(BusinessTab.DASHBOARD) },
            icon = { Icon(Icons.Default.Dashboard, contentDescription = null) },
            colors = NavigationDrawerItemDefaults.colors(
                selectedContainerColor = Color(0xFF1E293B),
                selectedTextColor = Color(0xFF60A5FA),
                selectedIconColor = Color(0xFF60A5FA),
                unselectedTextColor = Color(0xFFCBD5E1),
                unselectedIconColor = Color(0xFF94A3B8)
            )
        )

        NavigationDrawerItem(
            label = { Text("Pedidos", fontWeight = FontWeight.Bold) },
            selected = activeTab == BusinessTab.ORDERS,
            onClick = { onSelectTab(BusinessTab.ORDERS) },
            icon = { Icon(Icons.Default.ReceiptLong, contentDescription = null) },
            badge = {
                if (pendingOrdersCount > 0) {
                    Badge(containerColor = Color(0xFFEF4444), contentColor = Color.White) {
                        Text("$pendingOrdersCount", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            colors = NavigationDrawerItemDefaults.colors(
                selectedContainerColor = Color(0xFF1E293B),
                selectedTextColor = Color(0xFF60A5FA),
                selectedIconColor = Color(0xFF60A5FA),
                unselectedTextColor = Color(0xFFCBD5E1),
                unselectedIconColor = Color(0xFF94A3B8)
            )
        )


        NavigationDrawerItem(
            label = { Text("Catálogo / Menú", fontWeight = FontWeight.Bold) },
            selected = activeTab == BusinessTab.MENU,
            onClick = { onSelectTab(BusinessTab.MENU) },
            icon = { Icon(Icons.Default.RestaurantMenu, contentDescription = null) },
            colors = NavigationDrawerItemDefaults.colors(
                selectedContainerColor = Color(0xFF1E293B),
                selectedTextColor = Color(0xFF60A5FA),
                selectedIconColor = Color(0xFF60A5FA),
                unselectedTextColor = Color(0xFFCBD5E1),
                unselectedIconColor = Color(0xFF94A3B8)
            )
        )

        NavigationDrawerItem(
            label = { Text("Mi Negocio", fontWeight = FontWeight.Bold) },
            selected = activeTab == BusinessTab.MORE,
            onClick = { onSelectTab(BusinessTab.MORE) },
            icon = { Icon(Icons.Default.Storefront, contentDescription = null) },
            colors = NavigationDrawerItemDefaults.colors(
                selectedContainerColor = Color(0xFF1E293B),
                selectedTextColor = Color(0xFF60A5FA),
                selectedIconColor = Color(0xFF60A5FA),
                unselectedTextColor = Color(0xFFCBD5E1),
                unselectedIconColor = Color(0xFF94A3B8)
            )
        )

        NavigationDrawerItem(
            label = { Text("Finanzas y Liquidaciones", fontWeight = FontWeight.Bold) },
            selected = activeTab == BusinessTab.FINANCE,
            onClick = { onSelectTab(BusinessTab.FINANCE) },
            icon = { Icon(Icons.Default.AccountBalance, contentDescription = null) },
            colors = NavigationDrawerItemDefaults.colors(
                selectedContainerColor = Color(0xFF1E293B),
                selectedTextColor = Color(0xFF60A5FA),
                selectedIconColor = Color(0xFF60A5FA),
                unselectedTextColor = Color(0xFFCBD5E1),
                unselectedIconColor = Color(0xFF94A3B8)
            )
        )



        Spacer(modifier = Modifier.weight(1f))
        HorizontalDivider(color = Color(0xFF1E293B), modifier = Modifier.padding(vertical = 8.dp))

        NavigationDrawerItem(
            label = { Text("Cerrar Sesión", fontWeight = FontWeight.Bold, color = Color(0xFFEF4444)) },
            selected = false,
            onClick = onRequestLogout,
            icon = { Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color(0xFFEF4444)) },
            colors = NavigationDrawerItemDefaults.colors(
                unselectedContainerColor = Color.Transparent,
                unselectedTextColor = Color(0xFFEF4444),
                unselectedIconColor = Color(0xFFEF4444)
            )
        )
    }
}
