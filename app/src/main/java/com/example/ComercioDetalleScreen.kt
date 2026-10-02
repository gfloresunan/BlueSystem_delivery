package com.example

import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.composed
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.unit.IntSize
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.example.data.repository.BusinessInfo
import com.example.domain.model.Product
import com.example.eiam.domain.model.Branch
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.UUID

// Tokens de Color Azul Corporativo BlueSystem (BSDS v1.0)
private val bsBlue700 = Color(0xFF2563EB) // Brand Corporate Blue
private val bsBlue800 = Color(0xFF1E40AF) // Deep Blue Accent
private val bsBlue900 = Color(0xFF1E3A8A) // Dark Blue Deep Surface
private val bsObsidian = Color(0xFF0F172A) // Dark Slate Header/Text
private val bsBg = Color(0xFFF8FAFC) // Light Neutral Background
private val bsSurface = Color(0xFFFFFFFF) // Surface Card Background
private val bsSoftBlue = Color(0xFFEFF6FF) // Soft Tint Container
private val bsGrayText = Color(0xFF64748B) // Subtitle Gray
private val bsGold = Color(0xFFF59E0B) // Rating Gold Star
private val bsGreen = Color(0xFF10B981) // Open / Verified Green
private val bsRedAccent = Color(0xFFEF4444) // Discount / Alert Red

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterialApi::class)
@Composable
fun ComercioDetalleScreen(
    comercioId: String,
    initialProductId: String? = null,
    navController: NavController,
    firebaseManager: FirebaseManager,
    viewModel: ComercioDetalleViewModel = viewModel()
) {
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    val db = remember { FirebaseFirestore.getInstance() }

    val uiState by viewModel.uiState.collectAsState()
    val businessInfo = uiState.businessInfo
    val selectedBranch = uiState.selectedBranch

    val globalCartItems by com.example.data.CartManager.cartItems.collectAsState()
    val globalCartCount by com.example.data.CartManager.cartItemCount.collectAsState()

    var selectedProductForDetail by remember { mutableStateOf<Product?>(null) }
    var showCheckoutDialog by remember { mutableStateOf(false) }
    var destinationAddress by remember { mutableStateOf("") }
    var paymentMethod by remember { mutableStateOf("efectivo") }
    var orderProcessing by remember { mutableStateOf(false) }

    LaunchedEffect(comercioId, context) {
        com.example.data.CartManager.initContext(context)
        if (comercioId.isNotEmpty()) {
            viewModel.loadCommerce(comercioId)
        }
    }

    LaunchedEffect(uiState.products, initialProductId) {
        if (!initialProductId.isNullOrBlank() && uiState.products.isNotEmpty() && selectedProductForDetail == null) {
            val decodedInitial = try { java.net.URLDecoder.decode(initialProductId, "UTF-8") } catch (_: Exception) { initialProductId }
            val cleanInitial = decodedInitial.trim().removePrefix("prod_").trim()
            val target = uiState.products.find { prod ->
                val cleanProdId = prod.id.trim().removePrefix("prod_").trim()
                prod.id.equals(initialProductId, ignoreCase = true) ||
                prod.id.equals(decodedInitial, ignoreCase = true) ||
                cleanProdId.equals(cleanInitial, ignoreCase = true) ||
                prod.id.equals(cleanInitial, ignoreCase = true) ||
                cleanProdId.equals(initialProductId, ignoreCase = true) ||
                (cleanInitial.length >= 8 && cleanProdId.contains(cleanInitial)) ||
                (cleanProdId.length >= 8 && cleanInitial.contains(cleanProdId))
            }
            if (target != null) {
                selectedProductForDetail = target
                android.util.Log.d("COMERCIO_NAV", "Producto para modal inicial resuelto con éxito: id=${target.id}, nombre=${target.name}")
            } else {
                android.util.Log.w("COMERCIO_NAV", "No se encontró el producto initialProductId=$initialProductId entre ${uiState.products.size} productos")
            }
        }
    }

    val cartSubtotal = com.example.data.CartManager.subtotal
    val deliveryFee = selectedBranch?.deliveryFee?.takeIf { it > 0 } ?: businessInfo?.getEffectiveDeliveryFee() ?: 45.0
    val cartTotal = cartSubtotal + (if (uiState.deliveryMode == "DELIVERY") deliveryFee else 0.0)
    val cartItemsCount = globalCartCount

    // Filtrado de Productos por Búsqueda, Sucursal y Pestañas Rápidas
    val filteredProducts = uiState.products.filter { product ->
        // Filtrar por Sucursal si aplica
        val matchesBranch = selectedBranch == null ||
                product.branchId.isBlank() ||
                product.branchId == selectedBranch.branchId

        // Filtrar por Búsqueda
        val matchesSearch = uiState.searchQuery.isBlank() ||
                product.name.contains(uiState.searchQuery, ignoreCase = true) ||
                product.description.contains(uiState.searchQuery, ignoreCase = true)

        // Filtrar por Categoría
        val matchesCategory = uiState.selectedCategory == "TODOS" ||
                product.categoryName.equals(uiState.selectedCategory, ignoreCase = true) ||
                (product.category?.name?.equals(uiState.selectedCategory, ignoreCase = true) == true)

        // Filtrar por Pestañas Rápidas (Descuentos / Más vendidos)
        val matchesQuickTab = when (uiState.activeQuickTab) {
            "DISCOUNTS" -> product.hasDiscount || (product.originalPrice != null && product.originalPrice > product.price)
            "TOP_SELLING" -> product.isPopular || product.isTopSeller || product.salesCount > 5
            else -> true
        }

        matchesBranch && matchesSearch && matchesCategory && matchesQuickTab
    }.let { list ->
        if (uiState.activeQuickTab == "PRICE_LOW") {
            list.sortedBy { it.price }
        } else list
    }

    // Extraer lista de categorías únicas para las pestañas horizontales
    val categoriesList = remember(uiState.products, uiState.combos) {
        val catSet = mutableSetOf("TODOS")
        if (uiState.combos.isNotEmpty()) {
            catSet.add("COMBOS")
        }
        uiState.products.forEach { p ->
            val catName = p.categoryName.ifBlank { p.category.name.replace("_", " ") }
            if (catName.isNotBlank()) catSet.add(catName)
        }
        catSet.toList()
    }

    val groupedProducts = filteredProducts.groupBy { p ->
        p.categoryName.ifBlank { p.category.name.replace("_", " ") }
    }

    var isRefreshing by remember { mutableStateOf(false) }
    val pullRefreshState = rememberPullRefreshState(
        refreshing = isRefreshing,
        onRefresh = {
            isRefreshing = true
            viewModel.loadCommerce(comercioId)
            coroutineScope.launch {
                kotlinx.coroutines.delay(1000)
                isRefreshing = false
            }
        }
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bsBg)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pullRefresh(pullRefreshState)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .testTag("lista_productos_comercio"),
                contentPadding = PaddingValues(bottom = 110.dp)
            ) {
                // ITEM 0: Header Banner con portada, degradado y controles top bar
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .background(
                                brush = Brush.verticalGradient(
                                    colors = listOf(bsBlue800, bsBlue900)
                                )
                            )
                    ) {
                        val bannerUrl = businessInfo?.getEffectiveBannerUrl() ?: ""
                        if (bannerUrl.isNotBlank()) {
                            AsyncImage(
                                model = bannerUrl,
                                contentDescription = "Portada del comercio",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                        }

                        // Overlay con gradiente para lecturabilidad de botones
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            Color.Black.copy(alpha = 0.55f),
                                            Color.Transparent,
                                            Color.Black.copy(alpha = 0.65f)
                                        )
                                    )
                                )
                        )

                        // Top bar de controles flotantes (Glassmorphic)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .statusBarsPadding()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = { navController.popBackStack() },
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color.White.copy(alpha = 0.9f), CircleShape)
                                    .shadow(4.dp, CircleShape)
                            ) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Regresar",
                                    tint = bsObsidian,
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                IconButton(
                                    onClick = {
                                        val shareMessage = "¡Mirá este negocio en BlueSystem Delivery! 🍔 ${businessInfo?.getEffectiveName() ?: "Comercio"} en ${selectedBranch?.address ?: businessInfo?.getEffectiveAddress()}."
                                        val intent = Intent(Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(Intent.EXTRA_TEXT, shareMessage)
                                        }
                                        context.startActivity(Intent.createChooser(intent, "Compartir negocio"))
                                    },
                                    modifier = Modifier
                                        .size(40.dp)
                                        .background(Color.White.copy(alpha = 0.9f), CircleShape)
                                        .shadow(4.dp, CircleShape)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Share,
                                        contentDescription = "Compartir",
                                        tint = bsObsidian,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }

                                IconButton(
                                    onClick = {
                                        val currentUser = FirebaseAuth.getInstance().currentUser
                                        if (currentUser == null) {
                                            navController.navigate("auth_screen")
                                        } else {
                                            viewModel.toggleFavorite()
                                        }
                                    },
                                    modifier = Modifier
                                        .size(40.dp)
                                        .background(Color.White.copy(alpha = 0.9f), CircleShape)
                                        .shadow(4.dp, CircleShape)
                                ) {
                                    Icon(
                                        imageVector = if (uiState.isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                        contentDescription = "Favorito",
                                        tint = if (uiState.isFavorite) bsRedAccent else bsObsidian,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }

                        // Badge de Certificación Verificado
                        if (businessInfo?.getEffectiveIsVerified() == true) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(16.dp)
                                    .background(Color.White.copy(alpha = 0.95f), RoundedCornerShape(20.dp))
                                    .padding(horizontal = 10.dp, vertical = 5.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Verified,
                                        contentDescription = "Verificado",
                                        tint = bsBlue700,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "Verificado",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = bsBlue800
                                    )
                                }
                            }
                        }
                    }
                }

                // ITEM 1: Tarjeta Flotante del Comercio (Logo, Título, Leer Opiniones, Selector Sucursal, Delivery/Pickup)
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .offset(y = (-24).dp)
                            .padding(horizontal = 16.dp)
                            .shadow(8.dp, RoundedCornerShape(20.dp)),
                        colors = CardDefaults.cardColors(containerColor = bsSurface),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.Top) {
                                // Logo Avatar
                                Box(
                                    modifier = Modifier
                                        .size(76.dp)
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(bsSoftBlue)
                                        .border(2.5.dp, bsBlue700, RoundedCornerShape(16.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    val logoUrl = businessInfo?.getEffectiveLogoUrl() ?: ""
                                    if (logoUrl.isNotBlank()) {
                                        AsyncImage(
                                            model = logoUrl,
                                            contentDescription = businessInfo?.getEffectiveName(),
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    } else {
                                        Icon(
                                            imageVector = Icons.Default.Storefront,
                                            contentDescription = null,
                                            tint = bsBlue700,
                                            modifier = Modifier.size(36.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(14.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = businessInfo?.getEffectiveName() ?: "Cargando comercio...",
                                        fontSize = 19.sp,
                                        fontWeight = FontWeight.Black,
                                        color = bsObsidian,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )

                                    Spacer(modifier = Modifier.height(4.dp))

                                    // Fila de Calificación & Enlace "Leer opiniones"
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.Star,
                                            contentDescription = null,
                                            tint = bsGold,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(3.dp))
                                        Text(
                                            text = "${businessInfo?.getEffectiveRating() ?: 4.8} (${businessInfo?.getEffectiveRatingCount() ?: uiState.reviews.size.takeIf { it > 0 } ?: 18})",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Black,
                                            color = bsObsidian
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "Leer opiniones",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = bsBlue700,
                                            textDecoration = TextDecoration.Underline,
                                            modifier = Modifier.clickable { viewModel.setShowReviewsDialog(true) }
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.LocationOn,
                                            contentDescription = null,
                                            tint = bsBlue700,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Spacer(modifier = Modifier.width(2.dp))
                                        Text(
                                            text = selectedBranch?.address ?: businessInfo?.getEffectiveAddress() ?: "Managua, Nicaragua",
                                            fontSize = 12.sp,
                                            color = bsGrayText,
                                            fontWeight = FontWeight.Medium,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }

                                    // Municipio / Departamento del comercio debajo de la dirección
                                    val municipioTexto = remember(businessInfo, selectedBranch) {
                                        val muni = selectedBranch?.city?.takeIf { it.isNotBlank() }
                                            ?: businessInfo?.municipalityName?.takeIf { it.isNotBlank() }
                                            ?: businessInfo?.city?.takeIf { it.isNotBlank() }
                                            ?: businessInfo?.departmentName?.takeIf { it.isNotBlank() }
                                            ?: ""
                                        val depto = businessInfo?.departmentName?.takeIf { it.isNotBlank() && !it.equals(muni, ignoreCase = true) }
                                        if (muni.isNotBlank() && depto != null) "$muni, $depto" else muni
                                    }
                                    if (municipioTexto.isNotBlank()) {
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.Place,
                                                contentDescription = null,
                                                tint = Color(0xFF64748B),
                                                modifier = Modifier.size(13.dp)
                                            )
                                            Spacer(modifier = Modifier.width(3.dp))
                                            Text(
                                                text = municipioTexto,
                                                fontSize = 11.5.sp,
                                                color = Color(0xFF475569),
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))

                                    // Badge de Horario y Estado Operativo (BSD-MERCHANT-OPERATING-HOURS-ROOT-CAUSE-001)
                                    val isStoreOpen = selectedBranch?.isCurrentlyOpen() ?: businessInfo?.getEffectiveIsOpen() ?: true
                                    val statusBgColor = if (isStoreOpen) Color(0xFFDCFCE7) else Color(0xFFFEE2E2)
                                    val statusTextColor = if (isStoreOpen) Color(0xFF166534) else Color(0xFF991B1B)
                                    val statusDotColor = if (isStoreOpen) Color(0xFF22C55E) else Color(0xFFEF4444)
                                    val statusLabel = if (isStoreOpen) "ABIERTO" else "CERRADO"

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier
                                            .background(statusBgColor, RoundedCornerShape(6.dp))
                                            .padding(horizontal = 7.dp, vertical = 3.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(6.dp)
                                                .background(statusDotColor, CircleShape)
                                        )
                                        Spacer(modifier = Modifier.width(5.dp))
                                        Text(
                                            text = statusLabel,
                                            fontSize = 10.5.sp,
                                            fontWeight = FontWeight.Black,
                                            color = statusTextColor,
                                            letterSpacing = 0.5.sp
                                        )
                                    }
                                }
                            }

                            // Submenú de Selección de Sucursal (si el comercio posee sucursales)
                            if (uiState.branches.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(10.dp))
                                val canChange = uiState.branches.size > 1
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(bsSoftBlue, RoundedCornerShape(10.dp))
                                        .border(1.dp, Color(0xFFBFDBFE), RoundedCornerShape(10.dp))
                                        .clickable(enabled = canChange) { viewModel.setShowBranchSelectorDialog(true) }
                                        .padding(horizontal = 12.dp, vertical = 8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            modifier = Modifier.weight(1f),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Store,
                                                contentDescription = null,
                                                tint = bsBlue700,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = "Sucursal: ${selectedBranch?.name ?: "Principal"}",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = bsBlue900,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                        if (canChange) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = "Cambiar",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = bsBlue700
                                                )
                                                Icon(
                                                    imageVector = Icons.Default.ArrowDropDown,
                                                    contentDescription = null,
                                                    tint = bsBlue700,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Selector de Modo de Entrega (Delivery vs Retiro en el local)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                                    .padding(4.dp)
                            ) {
                                ModeToggleButton(
                                    title = "Delivery",
                                    isSelected = uiState.deliveryMode == "DELIVERY",
                                    onClick = { viewModel.setDeliveryMode("DELIVERY") },
                                    modifier = Modifier.weight(1f)
                                )
                                ModeToggleButton(
                                    title = "Retiro en el local",
                                    isSelected = uiState.deliveryMode == "PICKUP",
                                    onClick = { viewModel.setDeliveryMode("PICKUP") },
                                    modifier = Modifier.weight(1f)
                                )
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Panel Dinámico con Detalles según Delivery o Retiro en Local
                            if (uiState.deliveryMode == "DELIVERY") {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.AccessTime, contentDescription = null, tint = bsObsidian, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Recibís en ", fontSize = 13.sp, color = bsObsidian)
                                        Text(selectedBranch?.prepTimeMinutes?.let { "$it min" } ?: businessInfo?.getEffectiveDeliveryTime() ?: "35 min", fontSize = 13.sp, fontWeight = FontWeight.Black, color = bsObsidian)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = bsObsidian, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Envío ", fontSize = 13.sp, color = bsObsidian)
                                        Text(if (deliveryFee == 0.0) "Gratis" else "C$ ${deliveryFee.toInt()}", fontSize = 13.sp, fontWeight = FontWeight.Black, color = bsObsidian)
                                    }

                                    val descripcionNegocio = businessInfo?.getEffectiveDescription() ?: ""
                                    if (descripcionNegocio.isNotBlank()) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Row(verticalAlignment = Alignment.Top) {
                                            Icon(
                                                imageVector = Icons.Default.Info,
                                                contentDescription = null,
                                                tint = bsBlue700,
                                                modifier = Modifier.size(15.dp).padding(top = 1.dp)
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Column {
                                                Text(
                                                    text = "Descripción del Negocio",
                                                    fontSize = 11.5.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = bsBlue800
                                                )
                                                Spacer(modifier = Modifier.height(1.dp))
                                                Text(
                                                    text = descripcionNegocio,
                                                    fontSize = 12.sp,
                                                    color = Color(0xFF475569),
                                                    fontWeight = FontWeight.Normal,
                                                    lineHeight = 16.sp
                                                )
                                            }
                                        }
                                    }
                                }
                            } else {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.AccessTime, contentDescription = null, tint = bsObsidian, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Retirás en ", fontSize = 13.sp, color = bsObsidian)
                                        Text(selectedBranch?.prepTimeMinutes?.let { "$it min" } ?: "14 min", fontSize = 13.sp, fontWeight = FontWeight.Black, color = bsObsidian)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.CreditCard, contentDescription = null, tint = bsObsidian, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Solo pago online / Efectivo en caja", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = bsObsidian)
                                    }
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Place, contentDescription = null, tint = bsObsidian, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("Estás a ", fontSize = 13.sp, color = bsObsidian)
                                            Text("1.8 km", fontSize = 13.sp, fontWeight = FontWeight.Black, color = bsObsidian)
                                        }

                                        // Botón Link Google Maps ("Ver mapa ↗")
                                        Text(
                                            text = "Ver mapa ↗",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Black,
                                            color = bsBlue700,
                                            modifier = Modifier.clickable {
                                                val branchLat = selectedBranch?.getEffectiveLatitude() ?: 0.0
                                                val branchLng = selectedBranch?.getEffectiveLongitude() ?: 0.0
                                                val effectiveLat = if (branchLat != 0.0) branchLat else (businessInfo?.getEffectiveLatitude() ?: 0.0)
                                                val effectiveLng = if (branchLng != 0.0) branchLng else (businessInfo?.getEffectiveLongitude() ?: 0.0)
                                                val bizName = businessInfo?.getEffectiveName() ?: "Comercio"
                                                val addr = selectedBranch?.address?.takeIf { it.isNotBlank() } ?: businessInfo?.getEffectiveAddress() ?: ""

                                                if (effectiveLat != 0.0 && effectiveLng != 0.0) {
                                                    val encodedLabel = Uri.encode(bizName)
                                                    val mapUri = Uri.parse("geo:$effectiveLat,$effectiveLng?q=$effectiveLat,$effectiveLng($encodedLabel)")
                                                    val mapIntent = Intent(Intent.ACTION_VIEW, mapUri).apply {
                                                        setPackage("com.google.android.apps.maps")
                                                    }
                                                    try {
                                                        context.startActivity(mapIntent)
                                                    } catch (e: Exception) {
                                                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=$effectiveLat,$effectiveLng"))
                                                        context.startActivity(browserIntent)
                                                    }
                                                } else {
                                                    // Fallback por geocodificación de dirección si las coordenadas numéricas aún no fueron registradas
                                                    val searchTerms = listOfNotNull(
                                                        bizName.takeIf { it.isNotBlank() },
                                                        addr.takeIf { it.isNotBlank() },
                                                        selectedBranch?.city?.takeIf { it.isNotBlank() } ?: businessInfo?.city?.takeIf { it.isNotBlank() },
                                                        "Nicaragua"
                                                    ).joinToString(", ")
                                                    val encodedSearch = Uri.encode(searchTerms)
                                                    val mapUri = Uri.parse("geo:0,0?q=$encodedSearch")
                                                    val mapIntent = Intent(Intent.ACTION_VIEW, mapUri).apply {
                                                        setPackage("com.google.android.apps.maps")
                                                    }
                                                    try {
                                                        context.startActivity(mapIntent)
                                                    } catch (e: Exception) {
                                                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/search/?api=1&query=$encodedSearch"))
                                                        context.startActivity(browserIntent)
                                                    }
                                                }
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ITEM 2: Anuncio Comercial Contextual (BSD-COMMERCE-ANNOUNCEMENT-CARD-ENTERPRISE-001)
                item {
                    val announcement = uiState.announcement
                    if (announcement != null && announcement.isCurrentlyValid()) {
                        CommerceAnnouncementCard(
                            announcement = announcement,
                            onCtaClick = { action, target ->
                                when (action.uppercase()) {
                                    "MERCHANT_DISCOUNTS" -> {
                                        viewModel.setActiveQuickTab("DISCOUNTS")
                                    }
                                    "MERCHANT_MENU" -> {
                                        viewModel.setActiveQuickTab("MENU")
                                    }
                                    "PRODUCT" -> {
                                        if (target.isNotBlank()) {
                                            val targetProd = uiState.products.find { it.id == target || it.id.endsWith(target) }
                                            if (targetProd != null) {
                                                selectedProductForDetail = targetProd
                                            }
                                        }
                                    }
                                    "EXTERNAL_URL" -> {
                                        val trimmedTarget = target.trim()
                                        if (trimmedTarget.startsWith("https://", ignoreCase = true)) {
                                            try {
                                                val parsedUri = Uri.parse(trimmedTarget)
                                                if (parsedUri.scheme.equals("https", ignoreCase = true)) {
                                                    val browserIntent = Intent(Intent.ACTION_VIEW, parsedUri)
                                                    context.startActivity(browserIntent)
                                                } else {
                                                    Log.w("ANNOUNCEMENT_CTA", "Protocolo no permitido (solo HTTPS): $trimmedTarget")
                                                }
                                            } catch (e: Exception) {
                                                Log.w("ANNOUNCEMENT_CTA", "Error abriendo URL externa segura: ${e.message}")
                                            }
                                        } else {
                                            Log.w("ANNOUNCEMENT_CTA", "URL bloqueada por política de seguridad (requiere HTTPS): $trimmedTarget")
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.offset(y = (-12).dp)
                        )
                    } else if (uiState.promotions.isNotEmpty()) {
                        LazyRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .offset(y = (-12).dp)
                                .padding(vertical = 4.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(uiState.promotions) { promo ->
                                Card(
                                    modifier = Modifier
                                        .width(260.dp)
                                        .height(72.dp)
                                        .clickable {
                                            val actionId = promo.getEffectiveActionId()
                                            if (actionId.startsWith("http://") || actionId.startsWith("https://")) {
                                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(actionId))
                                                context.startActivity(intent)
                                            }
                                        },
                                    colors = CardDefaults.cardColors(containerColor = bsSoftBlue),
                                    shape = RoundedCornerShape(16.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBFDBFE))
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .padding(12.dp)
                                            .fillMaxSize(),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(38.dp)
                                                .background(bsBlue700, CircleShape),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Stars,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = promo.getEffectiveTitle(),
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = bsBlue900,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            if (promo.subtitle.isNotBlank()) {
                                                Text(
                                                    text = promo.subtitle,
                                                    fontSize = 11.sp,
                                                    color = bsBlue800,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // ITEM 3: Buscador de Productos
                item {
                    OutlinedTextField(
                        value = uiState.searchQuery,
                        onValueChange = { viewModel.setSearchQuery(it) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        placeholder = { Text("Buscar en ${businessInfo?.getEffectiveName() ?: "el menú"}...", color = bsGrayText, fontSize = 14.sp) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Buscar", tint = bsBlue700) },
                        trailingIcon = {
                            if (uiState.searchQuery.isNotBlank()) {
                                IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Limpiar", tint = bsGrayText)
                                }
                            }
                        },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = bsBlue700,
                            unfocusedBorderColor = Color(0xFFCBD5E1),
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White
                        ),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true
                    )
                }

                // ITEM 4: Pestañas Rápidas ("Menú", "Descuentos", "Más vendidos", "Precio más bajo") + Categorías
                item {
                    Column {
                        LazyRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(
                                "MENU" to "🍴 Menú",
                                "DISCOUNTS" to "🏷️ Descuentos",
                                "TOP_SELLING" to "🔥 Más vendidos",
                                "PRICE_LOW" to "💰 Precio más bajo"
                            ).forEach { (tabKey, tabLabel) ->
                                item {
                                    val isSelected = uiState.activeQuickTab == tabKey
                                    FilterChip(
                                        selected = isSelected,
                                        onClick = { viewModel.setActiveQuickTab(tabKey) },
                                        label = {
                                            Text(
                                                text = tabLabel,
                                                fontSize = 12.sp,
                                                fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
                                                color = if (isSelected) Color.White else bsObsidian
                                            )
                                        },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = bsBlue700,
                                            containerColor = Color.White
                                        ),
                                        shape = RoundedCornerShape(20.dp),
                                        border = FilterChipDefaults.filterChipBorder(
                                            borderColor = if (isSelected) bsBlue700 else Color(0xFFCBD5E1),
                                            enabled = true,
                                            selected = isSelected
                                        )
                                    )
                                }
                            }
                        }

                        // Categorías Adicionales
                        if (categoriesList.size > 1) {
                            LazyRow(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 6.dp),
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(categoriesList) { cat ->
                                    val isSelected = uiState.selectedCategory.equals(cat, ignoreCase = true)
                                    FilterChip(
                                        selected = isSelected,
                                        onClick = { viewModel.selectCategory(cat) },
                                        label = {
                                            Text(
                                                text = cat.uppercase(),
                                                fontSize = 11.sp,
                                                fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium,
                                                color = if (isSelected) Color.White else bsGrayText
                                            )
                                        },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = bsBlue800,
                                            containerColor = Color(0xFFF1F5F9)
                                        ),
                                        shape = RoundedCornerShape(16.dp),
                                        border = null
                                    )
                                }
                            }
                        }
                    }
                }

                // ITEM 5: Lista de Productos Agrupados / Estados de Carga o Vacío
                if (uiState.isLoading) {
                    items(5) {
                        Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                            ProductCardSkeleton()
                        }
                    }
                } else if (uiState.isError) {
                    item {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Warning,
                                    contentDescription = "Error",
                                    tint = bsRedAccent,
                                    modifier = Modifier.size(48.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "No se pudieron cargar los productos",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF991B1B)
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Por favor revisá tu conexión e intentalo de nuevo.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF7F1D1D),
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { viewModel.loadCommerce(comercioId) },
                                    colors = ButtonDefaults.buttonColors(containerColor = bsBlue700)
                                ) {
                                    Text("Reintentar", color = Color.White, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                } else if (filteredProducts.isEmpty() && uiState.combos.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.RestaurantMenu,
                                    contentDescription = null,
                                    tint = bsGrayText,
                                    modifier = Modifier.size(56.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "No hay productos disponibles en esta sección.",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = bsGrayText,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                } else {
                    if (uiState.combos.isNotEmpty() && (uiState.selectedCategory == "TODOS" || uiState.selectedCategory.equals("COMBOS", ignoreCase = true))) {
                        item(key = "header_combos_section") {
                            Text(
                                text = "🎁 COMBOS Y PAQUETES ESPECIALES",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black,
                                color = bsBlue700,
                                letterSpacing = 0.5.sp,
                                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 6.dp)
                            )
                        }

                        itemsIndexed(uiState.combos, key = { _, combo -> "combo_${combo.id}" }) { _, combo ->
                            val comboCartId = "combo_${combo.id}"
                            val currentQty = globalCartItems.find { it.cartItemId == comboCartId || it.productId == comboCartId }?.quantity ?: 0
                            val comboPrice = maxOf(0.0, combo.basePrice - combo.fixedDiscount - (combo.basePrice * (combo.percentageDiscount / 100.0)))

                            Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                    shape = RoundedCornerShape(14.dp)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Surface(
                                                    color = Color(0xFFFEF3C7),
                                                    shape = RoundedCornerShape(6.dp)
                                                ) {
                                                    Text(
                                                        text = "COMBO",
                                                        color = Color(0xFFD97706),
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.Black,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = combo.name,
                                                    fontSize = 15.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = bsObsidian
                                                )
                                            }
                                            if (combo.description.isNotBlank()) {
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text(
                                                    text = combo.description,
                                                    fontSize = 12.sp,
                                                    color = bsGrayText,
                                                    maxLines = 2,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text(
                                                    text = "C$ ${String.format(java.util.Locale.US, "%.2f", comboPrice)}",
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = bsBlue700
                                                )
                                                if (combo.basePrice > comboPrice) {
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Text(
                                                        text = "C$ ${String.format(java.util.Locale.US, "%.2f", combo.basePrice)}",
                                                        fontSize = 12.sp,
                                                        color = bsGrayText,
                                                        style = androidx.compose.ui.text.TextStyle(textDecoration = TextDecoration.LineThrough)
                                                    )
                                                }
                                            }
                                        }

                                        Spacer(modifier = Modifier.width(12.dp))

                                        if (currentQty > 0) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                                            ) {
                                                IconButton(
                                                    onClick = { com.example.data.CartManager.decrementQuantity(comboCartId) },
                                                    modifier = Modifier.size(32.dp)
                                                ) {
                                                    Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Menos", tint = bsBlue700)
                                                }
                                                Text(
                                                    text = "$currentQty",
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 14.sp
                                                )
                                                IconButton(
                                                    onClick = { com.example.data.CartManager.incrementQuantity(comboCartId) },
                                                    modifier = Modifier.size(32.dp)
                                                ) {
                                                    Icon(Icons.Default.AddCircleOutline, contentDescription = "Más", tint = bsBlue700)
                                                }
                                            }
                                        } else {
                                            Button(
                                                onClick = {
                                                    val currentUser = FirebaseAuth.getInstance().currentUser
                                                    if (currentUser == null) {
                                                        navController.navigate("auth_screen")
                                                    } else {
                                                        com.example.data.CartManager.addToCart(
                                                            productId = comboCartId,
                                                            productName = "🎁 ${combo.name}",
                                                            price = comboPrice,
                                                            quantity = 1,
                                                            businessId = comercioId,
                                                            businessName = businessInfo?.name ?: "Comercio",
                                                            imageUrl = "",
                                                            branchId = selectedBranch?.branchId ?: ""
                                                        )
                                                    }
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = bsBlue700),
                                                shape = RoundedCornerShape(10.dp),
                                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                            ) {
                                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Agregar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (!uiState.selectedCategory.equals("COMBOS", ignoreCase = true)) {
                    groupedProducts.forEach { (categoryName, products) ->
                        item(key = "header_$categoryName") {
                            Text(
                                text = "🏷️ ${categoryName.uppercase()}",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black,
                                color = bsObsidian,
                                letterSpacing = 0.5.sp,
                                modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 6.dp)
                            )
                        }

                        itemsIndexed(products, key = { _, prod -> prod.id }) { index, product ->
                            val currentQty = globalCartItems.find { it.productId == product.id }?.quantity ?: 0
                            Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                                ProductCard(
                                    product = product,
                                    quantityInCart = currentQty,
                                    isFavorite = uiState.favoriteProductIds.contains(product.id) || uiState.favoriteProductIds.contains("prod_${product.id}"),
                                    onToggleFavorite = {
                                        val currentUser = FirebaseAuth.getInstance().currentUser
                                        if (currentUser == null) {
                                            navController.navigate("auth_screen")
                                        } else {
                                            viewModel.toggleProductFavorite(product)
                                        }
                                    },
                                    onCardClick = {
                                        selectedProductForDetail = product
                                    },
                                    onAddClick = {
                                        val currentUser = FirebaseAuth.getInstance().currentUser
                                        val isCurrentStoreOpen = selectedBranch?.isCurrentlyOpen() ?: businessInfo?.getEffectiveIsOpen() ?: true
                                        if (currentUser == null) {
                                            navController.navigate("auth_screen")
                                        } else if (!isCurrentStoreOpen) {
                                            android.widget.Toast.makeText(context, "El comercio se encuentra actualmente cerrado y no recibe pedidos.", android.widget.Toast.LENGTH_LONG).show()
                                        } else if (product.optionGroups.isNotEmpty()) {
                                            selectedProductForDetail = product
                                        } else {
                                            if (product.stockQuantity == null || currentQty < product.stockQuantity) {
                                                com.example.data.CartManager.addToCart(
                                                    productId = product.id,
                                                    productName = product.name,
                                                    price = product.price,
                                                    quantity = 1,
                                                    businessId = comercioId,
                                                    businessName = businessInfo?.getEffectiveName() ?: "Comercio",
                                                    imageUrl = product.imageUrl,
                                                    branchId = selectedBranch?.branchId ?: ""
                                                )
                                                android.widget.Toast.makeText(context, "Producto agregado al carrito ✓", android.widget.Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                    },
                                    onRemoveClick = {
                                        com.example.data.CartManager.decrementQuantity(product.id)
                                    },
                                    onShareClick = {
                                        val shareMessage = "¡Mirá esta delicia en BlueSystem Delivery! 🍔 ${product.name} a solo C$ ${product.price.toInt()} en ${businessInfo?.getEffectiveName() ?: "nuestra tienda"}."
                                        val intent = Intent(Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(Intent.EXTRA_TEXT, shareMessage)
                                        }
                                        context.startActivity(Intent.createChooser(intent, "Compartir producto"))
                                    }
                                )
                            }
                        }
                    }
                    }
                }
            }

            PullRefreshIndicator(
                refreshing = isRefreshing,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter),
                contentColor = bsBlue700
            )
        }

        // Barra Flotante Inferior de Carrito de Compras
        AnimatedVisibility(
            visible = cartItemsCount > 0,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding(),
                color = bsSurface,
                shadowElevation = 20.dp
            ) {
                Row(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Mi Carrito • $cartItemsCount ${if (cartItemsCount == 1) "producto" else "productos"}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = bsGrayText
                        )
                        Text(
                            text = "C$ ${String.format("%.2f", cartTotal)}",
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Black,
                            color = bsObsidian
                        )
                    }

                    Button(
                        onClick = {
                            val currentUser = FirebaseAuth.getInstance().currentUser
                            val isCurrentStoreOpen = selectedBranch?.isCurrentlyOpen() ?: businessInfo?.getEffectiveIsOpen() ?: true
                            if (currentUser == null) {
                                navController.navigate("auth_screen")
                            } else if (!isCurrentStoreOpen) {
                                android.widget.Toast.makeText(context, "El comercio se encuentra actualmente cerrado y no recibe pedidos.", android.widget.Toast.LENGTH_LONG).show()
                            } else {
                                showCheckoutDialog = true
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = bsBlue700),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .height(50.dp)
                            .testTag("checkout_cart_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.ShoppingCart,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Ver Mi Carrito 🛒",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }
    }

    // Modal Diálogo para Seleccionar Sucursal
    if (uiState.showBranchSelectorDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.setShowBranchSelectorDialog(false) },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Store, contentDescription = null, tint = bsBlue700)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Seleccionar Sucursal", fontWeight = FontWeight.Black)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Seleccioná la sucursal más cercana para ver su menú y tiempo de entrega:", fontSize = 13.sp, color = bsGrayText)
                    uiState.branches.forEach { branch ->
                        val isSelected = selectedBranch?.branchId == branch.branchId
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    viewModel.selectBranch(branch)
                                    viewModel.setShowBranchSelectorDialog(false)
                                },
                            colors = CardDefaults.cardColors(containerColor = if (isSelected) bsSoftBlue else Color(0xFFF1F5F9)),
                            border = if (isSelected) androidx.compose.foundation.BorderStroke(1.5.dp, bsBlue700) else null
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = branch.name + if (branch.isPrimary) " (Principal)" else "",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = bsObsidian
                                    )
                                    Text(
                                        text = branch.address.ifBlank { "Managua" },
                                        fontSize = 12.sp,
                                        color = bsGrayText
                                    )
                                }
                                if (isSelected) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = bsBlue700)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { viewModel.setShowBranchSelectorDialog(false) }) {
                    Text("Cerrar", color = bsBlue700, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    // Modal Diálogo de Revisión y Gestión de Carrito (GAP-009 E2E Hardening)
    if (showCheckoutDialog) {
        AlertDialog(
            onDismissRequest = { showCheckoutDialog = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(20.dp),
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = bsBlue700)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Mi Carrito", fontWeight = FontWeight.Black, fontSize = 18.sp, color = bsObsidian)
                    }
                    if (globalCartItems.isNotEmpty()) {
                        TextButton(
                            onClick = { com.example.data.CartManager.clear() },
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text("Vaciar", color = Color(0xFFEF4444), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            text = {
                if (globalCartItems.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.RemoveShoppingCart, contentDescription = null, tint = bsGrayText, modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Tu carrito está vacío", fontWeight = FontWeight.Bold, color = bsObsidian, fontSize = 16.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Agregá productos del comercio para realizar tu orden.", fontSize = 12.sp, color = bsGrayText, textAlign = TextAlign.Center)
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 380.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        globalCartItems.forEach { item ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(item.productName, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = bsObsidian)
                                        if (item.selectedOptions.isNotEmpty()) {
                                            Text(
                                                text = item.selectedOptions.joinToString(", ") { opt ->
                                                    if (opt.finalPrice > 0) "${opt.optionName} (+C$ ${opt.finalPrice.toInt()})" else opt.optionName
                                                },
                                                fontSize = 11.sp,
                                                color = bsBlue700,
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                        Text(
                                            "C$ ${String.format(java.util.Locale.US, "%.2f", item.unitPriceWithExtras)} c/u",
                                            fontSize = 12.sp,
                                            color = bsGrayText
                                        )
                                    }

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        IconButton(
                                            onClick = { com.example.data.CartManager.decrementQuantity(item.cartItemId) },
                                            modifier = Modifier.size(28.dp)
                                        ) {
                                            Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Menos", tint = bsBlue700, modifier = Modifier.size(20.dp))
                                        }
                                        Text(
                                            text = "${item.quantity}",
                                            fontWeight = FontWeight.Black,
                                            fontSize = 14.sp,
                                            modifier = Modifier.padding(horizontal = 4.dp)
                                        )
                                        IconButton(
                                            onClick = { com.example.data.CartManager.incrementQuantity(item.cartItemId) },
                                            modifier = Modifier.size(28.dp)
                                        ) {
                                            Icon(Icons.Default.AddCircleOutline, contentDescription = "Más", tint = bsBlue700, modifier = Modifier.size(20.dp))
                                        }
                                    }
                                }
                            }
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = Color(0xFFE2E8F0))

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Subtotal:", fontSize = 15.sp, fontWeight = FontWeight.Black, color = bsObsidian)
                            Text(
                                "C$ ${String.format(java.util.Locale.US, "%.2f", cartSubtotal)}",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black,
                                color = bsBlue700
                            )
                        }
                    }
                }
            },
            confirmButton = {
                if (globalCartItems.isNotEmpty()) {
                    Button(
                        onClick = {
                            val currentUser = FirebaseAuth.getInstance().currentUser
                            if (currentUser == null) {
                                navController.navigate("auth_screen")
                            } else {
                                showCheckoutDialog = false
                                navController.previousBackStackEntry?.savedStateHandle?.set("open_cart", true)
                                navController.popBackStack()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = bsBlue700),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Payment, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Ir a Pagar 🚀", fontWeight = FontWeight.Black)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showCheckoutDialog = false }) {
                    Text("Seguir Comprando", fontWeight = FontWeight.Bold, color = bsGrayText)
                }
            }
        )
    }


    // Modal Diálogo de Reseñas / Opiniones ("Leer opiniones")
    if (uiState.showReviewsDialog) {
        var ratingInput by remember { mutableStateOf(5.0) }
        var commentInput by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { viewModel.setShowReviewsDialog(false) },
            containerColor = Color.White,
            shape = RoundedCornerShape(20.dp),
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = bsGold)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Opiniones y Reseñas", fontWeight = FontWeight.Black, color = bsObsidian)
                }
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "${businessInfo?.getEffectiveRating() ?: 4.8}",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.Black,
                            color = bsObsidian
                        )
                        Column {
                            Row {
                                repeat(5) { i ->
                                    Icon(Icons.Default.Star, contentDescription = null, tint = bsGold, modifier = Modifier.size(16.dp))
                                }
                            }
                            Text(
                                text = "Basado en ${businessInfo?.getEffectiveRatingCount() ?: uiState.reviews.size.takeIf { it > 0 } ?: 18} opiniones",
                                fontSize = 11.sp,
                                color = bsGrayText
                            )
                        }
                    }

                    HorizontalDivider(color = Color(0xFFE2E8F0))

                    // Formulario para dejar nueva opinión
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(bsSoftBlue, RoundedCornerShape(12.dp))
                            .border(1.dp, Color(0xFFBFDBFE), RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    ) {
                        Text("Dejar tu opinión", fontSize = 13.sp, fontWeight = FontWeight.Black, color = bsBlue900)
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            (1..5).forEach { star ->
                                Icon(
                                    imageVector = if (star <= ratingInput) Icons.Default.Star else Icons.Default.StarBorder,
                                    contentDescription = null,
                                    tint = bsGold,
                                    modifier = Modifier
                                        .size(26.dp)
                                        .clickable { ratingInput = star.toDouble() }
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        OutlinedTextField(
                            value = commentInput,
                            onValueChange = { commentInput = it },
                            placeholder = { Text("Escribí tu comentario sobre el comercio...", fontSize = 12.sp, color = bsGrayText) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = bsBlue700,
                                unfocusedBorderColor = Color(0xFFCBD5E1),
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White,
                                focusedTextColor = bsObsidian,
                                unfocusedTextColor = bsObsidian
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = {
                                viewModel.submitReview(ratingInput, commentInput) { success ->
                                    if (success) {
                                        commentInput = ""
                                        android.widget.Toast.makeText(context, "¡Gracias por tu opinión! ⭐", android.widget.Toast.LENGTH_SHORT).show()
                                    } else {
                                        android.widget.Toast.makeText(context, "Error al publicar la opinión", android.widget.Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = bsBlue700),
                            enabled = commentInput.isNotBlank() && !uiState.submittingReview,
                            modifier = Modifier.align(Alignment.End),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            if (uiState.submittingReview) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            } else {
                                Text("Publicar Opinión", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }

                    HorizontalDivider(color = Color(0xFFE2E8F0))

                    // Lista de Reseñas de Clientes
                    if (uiState.reviews.isEmpty()) {
                        Text(
                            text = "Aún no hay opiniones registradas. ¡Sé el primero en dejar tu reseña!",
                            fontSize = 12.sp,
                            color = bsGrayText,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 220.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(uiState.reviews) { rev ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                                ) {
                                    Column(modifier = Modifier.padding(10.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(rev.userName, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = bsObsidian)
                                            Row {
                                                repeat(rev.rating.toInt().coerceIn(1, 5)) {
                                                    Icon(Icons.Default.Star, contentDescription = null, tint = bsGold, modifier = Modifier.size(12.dp))
                                                }
                                            }
                                        }
                                        if (rev.comment.isNotBlank()) {
                                            Text(rev.comment, fontSize = 12.sp, color = bsObsidian, modifier = Modifier.padding(top = 4.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { viewModel.setShowReviewsDialog(false) }) {
                    Text("Cerrar", color = bsBlue700, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    selectedProductForDetail?.let { prod ->
        CustomerProductDetailDialog(
            product = prod,
            comercioId = comercioId,
            businessName = businessInfo?.getEffectiveName() ?: "Comercio",
            branchId = selectedBranch?.branchId ?: "",
            onDismiss = { selectedProductForDetail = null },
            onAddToCart = { selectedOptions, finalPrice ->
                val currentUser = FirebaseAuth.getInstance().currentUser
                val isCurrentStoreOpen = selectedBranch?.isCurrentlyOpen() ?: businessInfo?.getEffectiveIsOpen() ?: true
                if (currentUser == null) {
                    selectedProductForDetail = null
                    navController.navigate("auth_screen")
                } else if (!isCurrentStoreOpen) {
                    android.widget.Toast.makeText(context, "El comercio se encuentra actualmente cerrado y no recibe pedidos.", android.widget.Toast.LENGTH_LONG).show()
                } else {
                    com.example.data.CartManager.addToCart(
                        productId = prod.id,
                        productName = prod.name,
                        price = prod.price,
                        quantity = 1,
                        businessId = comercioId,
                        businessName = businessInfo?.getEffectiveName() ?: "Comercio",
                        imageUrl = prod.imageUrl,
                        branchId = selectedBranch?.branchId ?: "",
                        selectedOptions = selectedOptions
                    )
                    android.widget.Toast.makeText(context, "¡Producto agregado al carrito con opciones! ✓", android.widget.Toast.LENGTH_SHORT).show()
                    selectedProductForDetail = null
                }
            }
        )
    }
}

// Componentes Auxiliares UI de Métricas y Productos

@Composable
fun MetricColumn(icon: androidx.compose.ui.graphics.vector.ImageVector, iconColor: Color, title: String, subtitle: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(imageVector = icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(15.dp))
            Spacer(modifier = Modifier.width(3.dp))
            Text(text = title, fontSize = 13.sp, fontWeight = FontWeight.Black, color = bsObsidian)
        }
        Text(text = subtitle, fontSize = 10.sp, color = bsGrayText, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun MetricDivider() {
    Box(
        modifier = Modifier
            .height(24.dp)
            .width(1.dp)
            .background(Color(0xFFE2E8F0))
    )
}

@Composable
fun ModeToggleButton(title: String, isSelected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .height(38.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(if (isSelected) bsBlue700 else Color.Transparent)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = title,
            fontSize = 12.sp,
            fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
            color = if (isSelected) Color.White else bsGrayText
        )
    }
}

@Composable
fun BadgeLabel(text: String, color: Color) {
    Text(
        text = text,
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        color = color,
        modifier = Modifier
            .background(color.copy(alpha = 0.12f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    )
}

@Composable
fun ProductCard(
    product: Product,
    quantityInCart: Int,
    onAddClick: () -> Unit,
    onRemoveClick: () -> Unit,
    onCardClick: () -> Unit = {},
    onShareClick: () -> Unit = {},
    isFavorite: Boolean = false,
    onToggleFavorite: (() -> Unit)? = null
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(2.dp, RoundedCornerShape(14.dp))
            .clickable { onCardClick() },
        colors = CardDefaults.cardColors(containerColor = bsSurface),
        shape = RoundedCornerShape(14.dp)
    ) {
        Box {
            Row(
                modifier = Modifier
                    .padding(12.dp)
                    .fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Foto / Imagen del Producto
                val imgUrl = remember(product) {
                    product.getMainImage().ifBlank { product.imageUrl }.ifBlank { product.thumbnailUrl }
                }
                if (imgUrl.isNotBlank()) {
                    AsyncImage(
                        model = imgUrl,
                        contentDescription = product.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(84.dp)
                            .clip(RoundedCornerShape(12.dp))
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(84.dp)
                            .background(bsSoftBlue, RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.RestaurantMenu,
                            contentDescription = null,
                            tint = bsBlue700,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = product.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = bsObsidian,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    val descText = product.description.ifBlank { product.shortDescription }
                    if (descText.isNotBlank()) {
                        Text(
                            text = descText,
                            fontSize = 12.sp,
                            color = bsGrayText,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                            lineHeight = 16.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = product.formattedPrice,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = bsBlue700
                        )
                        if (product.hasDiscount) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = product.formattedOriginalPrice ?: "",
                                fontSize = 12.sp,
                                color = bsGrayText,
                                textDecoration = TextDecoration.LineThrough
                            )
                        }
                    }

                    // Badges de Atributos
                    Row(
                        modifier = Modifier.padding(top = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        if (product.hasDiscount) {
                            BadgeLabel("-${product.discountPercentage}%", bsRedAccent)
                        }
                        if (product.isPopular) {
                            BadgeLabel("Popular ⭐", bsGold)
                        }
                        if (product.isVegetarian) {
                            BadgeLabel("Veg 🌿", bsGreen)
                        }
                        if (product.isSpicy || product.spicyLevel > 0) {
                            val spicyText = if (product.spicyLevel > 0) "Picante 🌶️ (Nv.${product.spicyLevel})" else "Picante 🌶️"
                            BadgeLabel(spicyText, bsRedAccent)
                        }
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                // Controles de Cantidad (+ / -)
                if (product.stockQuantity != null && product.stockQuantity == 0) {
                    Text(
                        text = "Agotado",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = bsGrayText,
                        modifier = Modifier
                            .background(Color(0xFFF1F5F9), RoundedCornerShape(12.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                } else if (quantityInCart > 0) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        IconButton(
                            onClick = onRemoveClick,
                            modifier = Modifier
                                .size(32.dp)
                                .background(Color(0xFFF1F5F9), CircleShape)
                        ) {
                            Icon(Icons.Default.Remove, contentDescription = "Quitar", tint = bsObsidian, modifier = Modifier.size(16.dp))
                        }
                        Text(
                            text = quantityInCart.toString(),
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = bsObsidian
                        )
                        IconButton(
                            onClick = onAddClick,
                            modifier = Modifier
                                .size(32.dp)
                                .background(bsBlue700, CircleShape)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Añadir", tint = Color.White, modifier = Modifier.size(16.dp))
                        }
                    }
                } else {
                    IconButton(
                        onClick = onAddClick,
                        modifier = Modifier
                            .size(38.dp)
                            .background(bsBlue700, CircleShape)
                            .testTag("add_product_${product.id}")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Añadir",
                            tint = Color.White,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }

            if (onToggleFavorite != null) {
                IconButton(
                    onClick = onToggleFavorite,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .size(32.dp)
                ) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = if (isFavorite) "Quitar de favoritos" else "Guardar en favoritos",
                        tint = if (isFavorite) Color(0xFFFF2D55) else bsGrayText.copy(alpha = 0.6f),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun ProductCardSkeleton() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(105.dp)
            .shadow(2.dp, RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .shimmerEffect()
            )
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Box(modifier = Modifier.fillMaxWidth().height(18.dp).shimmerEffect())
                Spacer(modifier = Modifier.height(6.dp))
                Box(modifier = Modifier.fillMaxWidth(0.6f).height(14.dp).shimmerEffect())
                Spacer(modifier = Modifier.height(10.dp))
                Box(modifier = Modifier.fillMaxWidth(0.4f).height(18.dp).shimmerEffect())
            }
            Spacer(modifier = Modifier.width(10.dp))
            Box(modifier = Modifier.size(36.dp).clip(CircleShape).shimmerEffect())
        }
    }
}

fun Modifier.shimmerEffect(): Modifier = composed {
    var size by remember { mutableStateOf(IntSize.Zero) }
    val transition = rememberInfiniteTransition(label = "")
    val startOffsetX by transition.animateFloat(
        initialValue = -2 * size.width.toFloat(),
        targetValue = 2 * size.width.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(1000)
        ),
        label = ""
    )

    this
        .background(
            brush = Brush.linearGradient(
                colors = listOf(
                    Color(0xFFE2E8F0),
                    Color(0xFFCBD5E1),
                    Color(0xFFE2E8F0),
                ),
                start = Offset(startOffsetX, 0f),
                end = Offset(startOffsetX + size.width.toFloat(), size.height.toFloat())
            )
        )
        .onGloballyPositioned {
            size = it.size
        }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerProductDetailDialog(
    product: Product,
    comercioId: String,
    businessName: String,
    branchId: String,
    onDismiss: () -> Unit,
    onAddToCart: (List<com.example.domain.model.menu.SelectedOption>, Double) -> Unit
) {
    val selectedOptionsMap = remember { mutableStateMapOf<String, com.example.domain.model.menu.SelectedOption>() }

    val basePrice = product.price
    val extrasTotal = selectedOptionsMap.values.sumOf { it.finalPrice }
    val totalPrice = basePrice + extrasTotal

    AlertDialog(
        onDismissRequest = onDismiss,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),
        modifier = Modifier
            .fillMaxWidth(0.92f)
            .wrapContentHeight()
            .clip(RoundedCornerShape(20.dp)),
        containerColor = Color.White,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = product.name,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF0F172A),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color(0xFF64748B))
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(androidx.compose.foundation.rememberScrollState())
            ) {
                // Imagen de Cabecera
                val imgUrl = remember(product) {
                    product.getMainImage().ifBlank { product.imageUrl }.ifBlank { product.thumbnailUrl }
                }
                if (imgUrl.isNotBlank()) {
                    AsyncImage(
                        model = imgUrl,
                        contentDescription = product.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(RoundedCornerShape(14.dp))
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Short Description
                val shortDesc = product.shortDescription.ifBlank { product.description }
                if (shortDesc.isNotBlank()) {
                    Text(
                        text = shortDesc,
                        fontSize = 13.sp,
                        color = Color(0xFF64748B),
                        fontWeight = FontWeight.Medium
                    )
                }

                // Sección de Descripción Larga Explicita
                if (product.longDescription.isNotBlank()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "Descripción",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF0F172A)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = product.longDescription,
                        fontSize = 13.sp,
                        color = Color(0xFF334155),
                        lineHeight = 18.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFFF8FAFC), RoundedCornerShape(10.dp))
                            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(10.dp))
                            .padding(10.dp)
                    )
                }

                // Badges
                Row(
                    modifier = Modifier.padding(top = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (product.isPopular) BadgeLabel("Popular ⭐", Color(0xFFF59E0B))
                    if (product.isNew) BadgeLabel("Nuevo ✨", Color(0xFF10B981))
                    if (product.isTopSeller) BadgeLabel("Más Vendido 🏆", Color(0xFF2563EB))
                    if (product.isRecommended) BadgeLabel("Recomendado 👍", Color(0xFF8B5CF6))
                    if (product.isVegetarian) BadgeLabel("Veg 🌿", Color(0xFF10B981))
                    if (product.isSpicy || product.spicyLevel > 0) {
                        val spicyText = if (product.spicyLevel > 0) "Picante 🌶️ (Nv.${product.spicyLevel})" else "Picante 🌶️"
                        BadgeLabel(spicyText, Color(0xFFEF4444))
                    }
                }

                // Sección de Grupos de Opciones / Variantes / Extras
                if (product.optionGroups.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(14.dp))
                    HorizontalDivider(color = Color(0xFFE2E8F0))
                    Spacer(modifier = Modifier.height(10.dp))

                    product.optionGroups.forEach { group ->
                        Text(
                            text = group.name + if (group.isRequired) " *" else " (Opcional)",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF0F172A)
                        )
                        Spacer(modifier = Modifier.height(6.dp))

                        group.options.forEach { option ->
                            val isSelected = selectedOptionsMap.containsKey(option.id)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (isSelected) Color(0xFFEFF6FF) else Color(0xFFF8FAFC))
                                    .border(1.dp, if (isSelected) Color(0xFF2563EB) else Color(0xFFE2E8F0), RoundedCornerShape(10.dp))
                                    .clickable {
                                        if (isSelected) {
                                            selectedOptionsMap.remove(option.id)
                                        } else {
                                            selectedOptionsMap[option.id] = com.example.domain.model.menu.SelectedOption(
                                                optionGroupId = group.id,
                                                optionGroupName = group.name,
                                                optionId = option.id,
                                                optionName = option.name,
                                                additionalPrice = option.additionalPrice,
                                                isFreeOption = option.additionalPrice <= 0,
                                                finalPrice = if (option.additionalPrice <= 0) 0.0 else option.additionalPrice
                                            )
                                        }
                                    }
                                    .padding(vertical = 8.dp, horizontal = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(
                                        checked = isSelected,
                                        onCheckedChange = null,
                                        colors = CheckboxDefaults.colors(checkedColor = Color(0xFF2563EB))
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = option.name,
                                        fontSize = 13.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = Color(0xFF0F172A)
                                    )
                                }

                                Text(
                                    text = if (option.additionalPrice > 0) "+C$ ${option.additionalPrice.toInt()}" else "Gratis",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (option.additionalPrice > 0) Color(0xFF2563EB) else Color(0xFF10B981)
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onAddToCart(selectedOptionsMap.values.toList(), totalPrice)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = "AGREGAR AL CARRITO • C$ ${String.format(java.util.Locale.US, "%.2f", totalPrice)}",
                    fontWeight = FontWeight.Black,
                    fontSize = 13.sp
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
            }
        }
    )
}

// ─── BSD-COMMERCE-ANNOUNCEMENT-CARD-ENTERPRISE-001 ───────────────────────────
@Composable
fun CommerceAnnouncementCard(
    announcement: CommerceAnnouncement,
    onCtaClick: (action: String, target: String) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .shadow(4.dp, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, bsBlue700.copy(alpha = 0.25f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            // Header con Icono de Campaña y Título
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .background(bsSoftBlue, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Campaign,
                        contentDescription = "Anuncio",
                        tint = bsBlue700,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = announcement.title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
            }

            // Imagen opcional con carga resiliente
            if (announcement.showImage && announcement.imageUrl.isNotBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                var hasImageError by remember { mutableStateOf(false) }

                if (!hasImageError) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 120.dp, max = 170.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(bsSoftBlue)
                    ) {
                        AsyncImage(
                            model = announcement.imageUrl,
                            contentDescription = announcement.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                            onError = { hasImageError = true }
                        )
                    }
                }
            }

            // Descripción del anuncio
            if (announcement.description.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = announcement.description,
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontSize = 12.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 17.sp
                    )
                )
            }

            // Botón CTA opcional
            if (announcement.showCTA && announcement.ctaLabel.isNotBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    Button(
                        onClick = { onCtaClick(announcement.ctaAction, announcement.ctaTarget) },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = bsBlue700,
                            contentColor = Color.White
                        ),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = announcement.ctaLabel,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(13.dp)
                        )
                    }
                }
            }
        }
    }
}
