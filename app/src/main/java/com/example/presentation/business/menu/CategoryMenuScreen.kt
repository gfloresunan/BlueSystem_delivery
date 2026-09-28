package com.example.presentation.business.menu

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.domain.model.Category
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import kotlinx.coroutines.launch
import java.util.Locale

// Enterprise Palette Tokens
private val EnterpriseBg = Color(0xFFF8FAFC)
private val EnterpriseBorder = Color(0xFFE2E8F0)
private val EnterprisePrimary = Color(0xFF2563EB)
private val EnterprisePrimaryLight = Color(0xFFEFF6FF)
private val EnterpriseTextDark = Color(0xFF0F172A)
private val EnterpriseTextMuted = Color(0xFF64748B)
private val EnterpriseGreen = Color(0xFF10B981)
private val EnterpriseGreenLight = Color(0xFFECFDF5)
private val EnterpriseRed = Color(0xFFDC2626)
private val EnterpriseRedLight = Color(0xFFFEF2F2)
private val EnterpriseAmber = Color(0xFFF59E0B)

enum class MenuDisplayMode {
    CATEGORIES, // Vista por carpetas de categorías
    FULL_LIST   // Lista corrida completa
}

enum class MenuFilterChip {
    ALL,
    ACTIVE,
    OUT_OF_STOCK,
    PROMOTION,
    BEST_SELLERS,
    NEWEST
}

/**
 * Pantalla Enterprise de Gestión de Menú y Catálogo Comercial.
 * Soporta categorías reales de Firestore, buscador null-safe, filtros dinámicos,
 * modo dual adaptativo (Teléfono / Tablet), reordenamiento y operaciones CRUD completas.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryMenuScreen(
    products: List<Product>,
    categories: List<Category> = emptyList(),
    isEmbedded: Boolean = false,
    onAddProductClick: () -> Unit,
    onEditProduct: (Product) -> Unit,
    onDuplicateProduct: (Product) -> Unit,
    onToggleProductStatus: (String, ProductStatus) -> Unit,
    onDeleteProduct: (String) -> Unit,
    onReorderProducts: ((List<Product>) -> Unit)? = null,
    initialFilterChip: MenuFilterChip = MenuFilterChip.ALL,
    onCreateCategory: (String) -> Unit = {},
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onRetry: () -> Unit = {}
) {
    val context = LocalContext.current
    val prefsRepo = remember { com.example.data.repository.BusinessPreferencesRepository(context) }

    var displayMode by remember {
        mutableStateOf(
            try { MenuDisplayMode.valueOf(prefsRepo.getMenuDisplayMode()) } catch (e: Exception) { MenuDisplayMode.FULL_LIST }
        )
    }
    var selectedCategoryName by remember { mutableStateOf<String?>(null) }
    var selectedFilterChip by remember(initialFilterChip) {
        mutableStateOf(
            if (initialFilterChip != MenuFilterChip.ALL) initialFilterChip
            else try { MenuFilterChip.valueOf(prefsRepo.getMenuFilterChip()) } catch (e: Exception) { MenuFilterChip.ALL }
        )
    }
    var searchQuery by remember { mutableStateOf("") }
    var newCategoryNameText by remember { mutableStateOf("") }
    var showNewCategoryDialog by remember { mutableStateOf(false) }
    var isReorderMode by remember { mutableStateOf(false) }
    var productToDelete by remember { mutableStateOf<Product?>(null) }

    val coroutineScope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(products.size) {
        Log.d("MERCHANT_MENU_LOAD", "[MERCHANT_MENU_LOAD] Total productos cargados: ${products.size}")
    }

    LaunchedEffect(displayMode) {
        prefsRepo.saveMenuDisplayMode(displayMode.name)
    }

    LaunchedEffect(selectedFilterChip) {
        prefsRepo.saveMenuFilterChip(selectedFilterChip.name)
    }

    // Categorías dinámicas reales (Fusión de categorías de Firestore + categorías registradas en productos)
    val dynamicCategoriesList = remember(categories, products) {
        val catMap = mutableMapOf<String, String>() // name to id
        categories.filter { it.active }.forEach { cat ->
            if (cat.name.isNotBlank()) catMap[cat.name.trim()] = cat.id
        }
        products.forEach { prod ->
            val name = prod.categoryName.ifBlank { prod.category.name }.trim()
            if (name.isNotBlank() && !catMap.containsKey(name)) {
                catMap[name] = prod.categoryId.ifBlank { "custom_$name" }
            }
        }
        catMap.keys.toList().sorted()
    }

    // Mapa de productos agrupados por categoría
    val categoriesMap = remember(products) {
        products.groupBy { it.categoryName.ifBlank { it.category.name }.trim() }
    }

    // Filtrado en memoria rápido, case-insensitive y null-safe
    val filteredProducts = remember(products, selectedFilterChip, searchQuery, selectedCategoryName, displayMode) {
        var list = if (selectedCategoryName != null) {
            categoriesMap[selectedCategoryName] ?: emptyList()
        } else {
            products
        }

        if (searchQuery.isNotBlank()) {
            val q = searchQuery.trim().lowercase(Locale.ROOT)
            list = list.filter {
                it.name.lowercase(Locale.ROOT).contains(q) ||
                it.description.lowercase(Locale.ROOT).contains(q) ||
                it.categoryName.lowercase(Locale.ROOT).contains(q) ||
                it.subCategoryName.lowercase(Locale.ROOT).contains(q)
            }
        }

        when (selectedFilterChip) {
            MenuFilterChip.ALL -> list
            MenuFilterChip.ACTIVE -> list.filter { it.status == ProductStatus.ACTIVE }
            MenuFilterChip.OUT_OF_STOCK -> list.filter { it.status == ProductStatus.OUT_OF_STOCK || it.status == ProductStatus.INACTIVE }
            MenuFilterChip.PROMOTION -> list.filter { it.hasDiscount }
            MenuFilterChip.BEST_SELLERS -> list.sortedByDescending { it.salesCount }
            MenuFilterChip.NEWEST -> list.sortedByDescending { it.createdAt.seconds }
        }
    }

    BoxWithConstraints(modifier = Modifier.fillMaxSize().background(EnterpriseBg)) {
        val isExpandedScreen = maxWidth >= 600.dp

        Scaffold(
            containerColor = EnterpriseBg,
            topBar = {
                if (!isEmbedded) {
                    Surface(
                        color = Color.White,
                        shadowElevation = 2.dp,
                        border = BorderStroke(1.dp, EnterpriseBorder)
                    ) {
                        TopAppBar(
                            title = {
                                Column {
                                    Text(
                                        text = if (selectedCategoryName != null) selectedCategoryName!! else "Menú y Catálogo",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = EnterpriseTextDark
                                    )
                                    Text(
                                        text = "${filteredProducts.size} de ${products.size} productos",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = EnterpriseTextMuted
                                    )
                                }
                            },
                            navigationIcon = {
                                if (selectedCategoryName != null) {
                                    IconButton(onClick = { selectedCategoryName = null }) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.ArrowBack,
                                            contentDescription = "Volver",
                                            tint = EnterpriseTextDark
                                        )
                                    }
                                }
                            },
                            actions = {
                                // Toggle Modo Reordenamiento
                                IconButton(onClick = {
                                    isReorderMode = !isReorderMode
                                    coroutineScope.launch {
                                        snackbarHostState.showSnackbar(
                                            if (isReorderMode) "↕️ Modo Reordenamiento Activo: Usa los controles para mover posiciones" else "✓ Reordenamiento completado"
                                        )
                                    }
                                }) {
                                    Icon(
                                        imageVector = if (isReorderMode) Icons.Default.Done else Icons.Default.SwapVert,
                                        contentDescription = "Reordenar Catálogo",
                                        tint = if (isReorderMode) EnterprisePrimary else EnterpriseTextDark
                                    )
                                }

                                // Toggle Modo Vista (Categorías / Lista corrida)
                                if (!isExpandedScreen) {
                                    IconButton(onClick = {
                                        displayMode = if (displayMode == MenuDisplayMode.CATEGORIES) MenuDisplayMode.FULL_LIST else MenuDisplayMode.CATEGORIES
                                        selectedCategoryName = null
                                    }) {
                                        Icon(
                                            imageVector = if (displayMode == MenuDisplayMode.CATEGORIES) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                                            contentDescription = "Conmutar Vista",
                                            tint = EnterpriseTextDark
                                        )
                                    }
                                }

                                // Crear Categoría
                                IconButton(onClick = { showNewCategoryDialog = true }) {
                                    Icon(
                                        Icons.Default.CreateNewFolder,
                                        contentDescription = "Nueva Categoría",
                                        tint = EnterprisePrimary
                                    )
                                }
                            },
                            colors = TopAppBarDefaults.topAppBarColors(
                                containerColor = Color.White
                            )
                        )
                    }
                }
            },
            floatingActionButton = {
                ExtendedFloatingActionButton(
                    onClick = onAddProductClick,
                    icon = { Icon(Icons.Default.Add, contentDescription = null, tint = Color.White) },
                    text = { Text("Agregar Producto", fontWeight = FontWeight.Bold, color = Color.White) },
                    containerColor = EnterprisePrimary,
                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp)
                )
            },
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp)
            ) {
                if (isEmbedded) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (selectedCategoryName != null) {
                            TextButton(
                                onClick = { selectedCategoryName = null },
                                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)
                            ) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(selectedCategoryName ?: "", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        } else {
                            Text(
                                text = "${filteredProducts.size} productos",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = EnterpriseTextMuted
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(
                                onClick = {
                                    isReorderMode = !isReorderMode
                                    coroutineScope.launch {
                                        snackbarHostState.showSnackbar(
                                            if (isReorderMode) "↕️ Modo Reordenamiento Activo" else "✓ Reordenamiento completado"
                                        )
                                    }
                                },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    imageVector = if (isReorderMode) Icons.Default.Done else Icons.Default.SwapVert,
                                    contentDescription = "Reordenar",
                                    tint = if (isReorderMode) EnterprisePrimary else EnterpriseTextDark,
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            if (!isExpandedScreen) {
                                IconButton(
                                    onClick = {
                                        displayMode = if (displayMode == MenuDisplayMode.CATEGORIES) MenuDisplayMode.FULL_LIST else MenuDisplayMode.CATEGORIES
                                        selectedCategoryName = null
                                    },
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(
                                        imageVector = if (displayMode == MenuDisplayMode.CATEGORIES) Icons.AutoMirrored.Filled.ViewList else Icons.Default.GridView,
                                        contentDescription = "Conmutar Vista",
                                        tint = EnterpriseTextDark,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }

                            IconButton(
                                onClick = { showNewCategoryDialog = true },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    Icons.Default.CreateNewFolder,
                                    contentDescription = "Nueva Categoría",
                                    tint = EnterprisePrimary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                } else {
                    Spacer(modifier = Modifier.height(10.dp))
                }

                // Buscador Enterprise
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Buscar por nombre, categoría o subcategoría...", color = EnterpriseTextMuted, fontSize = 13.sp) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = EnterpriseTextMuted) },
                    trailingIcon = {
                        if (searchQuery.isNotBlank()) {
                            IconButton(onClick = { searchQuery = "" }) {
                                Icon(Icons.Default.Clear, contentDescription = "Limpiar", tint = EnterpriseTextMuted)
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White,
                        focusedBorderColor = EnterprisePrimary,
                        unfocusedBorderColor = EnterpriseBorder,
                        focusedTextColor = EnterpriseTextDark,
                        unfocusedTextColor = EnterpriseTextDark
                    )
                )

                // Chips de Categorías Horizontales Rápidas
                if (dynamicCategoriesList.isNotEmpty()) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(top = 6.dp, bottom = 4.dp)
                    ) {
                        item {
                            FilterChip(
                                selected = selectedCategoryName == null,
                                onClick = { selectedCategoryName = null },
                                label = { Text("Todas (${products.size})", fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = EnterprisePrimaryLight,
                                    selectedLabelColor = EnterprisePrimary,
                                    containerColor = Color.White,
                                    labelColor = EnterpriseTextDark
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = selectedCategoryName == null,
                                    borderColor = if (selectedCategoryName == null) EnterprisePrimary else EnterpriseBorder
                                )
                            )
                        }
                        items(dynamicCategoriesList) { catName ->
                            val count = categoriesMap[catName]?.size ?: 0
                            val isSelected = selectedCategoryName == catName
                            FilterChip(
                                selected = isSelected,
                                onClick = { selectedCategoryName = if (isSelected) null else catName },
                                label = { Text("$catName ($count)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = EnterprisePrimaryLight,
                                    selectedLabelColor = EnterprisePrimary,
                                    containerColor = Color.White,
                                    labelColor = EnterpriseTextDark
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = isSelected,
                                    borderColor = if (isSelected) EnterprisePrimary else EnterpriseBorder
                                )
                            )
                        }
                    }
                }

                // Chips de Filtrado Avanzado
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(vertical = 4.dp)
                ) {
                    val chips = listOf(
                        MenuFilterChip.ALL to "Todos",
                        MenuFilterChip.ACTIVE to "🟢 Activos",
                        MenuFilterChip.OUT_OF_STOCK to "🔴 Agotados",
                        MenuFilterChip.PROMOTION to "🏷️ Promoción",
                        MenuFilterChip.BEST_SELLERS to "⭐ Más Vendidos",
                        MenuFilterChip.NEWEST to "🆕 Nuevos"
                    )

                    items(chips) { (chip, label) ->
                        val isSelected = selectedFilterChip == chip
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedFilterChip = chip },
                            label = { Text(label, fontSize = 11.sp, fontWeight = FontWeight.Medium) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = EnterprisePrimaryLight,
                                selectedLabelColor = EnterprisePrimary,
                                containerColor = Color.White,
                                labelColor = EnterpriseTextDark
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = isSelected,
                                borderColor = if (isSelected) EnterprisePrimary else EnterpriseBorder
                            )
                        )
                    }
                }

                // Banner de Reordenamiento
                AnimatedVisibility(visible = isReorderMode) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = EnterprisePrimaryLight,
                        border = BorderStroke(1.dp, EnterprisePrimary.copy(alpha = 0.3f))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.DragHandle, contentDescription = null, tint = EnterprisePrimary)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Modo Reordenar: Usa las flechas para subir/bajar",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold,
                                    color = EnterprisePrimary
                                )
                            }
                            TextButton(onClick = { isReorderMode = false }) {
                                Text("Listo", fontWeight = FontWeight.Bold, color = EnterprisePrimary)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Estado de Carga
                if (isLoading) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = EnterprisePrimary)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Cargando catálogo comercial...", style = MaterialTheme.typography.bodyMedium, color = EnterpriseTextMuted)
                        }
                    }
                } else if (!errorMessage.isNullOrBlank()) {
                    // Estado de Error
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, EnterpriseRed.copy(alpha = 0.3f)),
                            modifier = Modifier.padding(24.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(Icons.Default.Warning, contentDescription = null, tint = EnterpriseRed, modifier = Modifier.size(48.dp))
                                Spacer(modifier = Modifier.height(12.dp))
                                Text("No pudimos cargar el menú", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = EnterpriseTextDark)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(errorMessage, style = MaterialTheme.typography.bodySmall, color = EnterpriseTextMuted, textAlign = TextAlign.Center)
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = onRetry,
                                    colors = ButtonDefaults.buttonColors(containerColor = EnterprisePrimary)
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = null)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Reintentar")
                                }
                            }
                        }
                    }
                } else if (filteredProducts.isEmpty()) {
                    // Estado Vacío
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, EnterpriseBorder),
                            modifier = Modifier.padding(24.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(72.dp)
                                        .clip(CircleShape)
                                        .background(EnterprisePrimaryLight),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.RestaurantMenu, contentDescription = null, tint = EnterprisePrimary, modifier = Modifier.size(36.dp))
                                }
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = if (searchQuery.isNotBlank()) "No se encontraron productos" else "Tu catálogo está listo",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = EnterpriseTextDark
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = if (searchQuery.isNotBlank()) "Intenta con otro término de búsqueda." else "Agrega productos a tu menú para comenzar a recibir pedidos de clientes.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = EnterpriseTextMuted,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(20.dp))
                                Button(
                                    onClick = onAddProductClick,
                                    colors = ButtonDefaults.buttonColors(containerColor = EnterprisePrimary),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Agregar Producto")
                                }
                            }
                        }
                    }
                } else {
                    // Contenido Principal
                    if (isExpandedScreen) {
                        // Vista Split-Pane para Tablet
                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(top = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            // Panel Izquierdo: Categorías
                            Surface(
                                modifier = Modifier
                                    .width(260.dp)
                                    .fillMaxHeight(),
                                shape = RoundedCornerShape(16.dp),
                                color = Color.White,
                                border = BorderStroke(1.dp, EnterpriseBorder)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        "Categorías",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = EnterpriseTextDark,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )

                                    LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        item {
                                            Surface(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable { selectedCategoryName = null },
                                                shape = RoundedCornerShape(10.dp),
                                                color = if (selectedCategoryName == null) EnterprisePrimaryLight else Color.Transparent
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(10.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text("Todos los productos", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium, color = if (selectedCategoryName == null) EnterprisePrimary else EnterpriseTextDark)
                                                    Badge(containerColor = if (selectedCategoryName == null) EnterprisePrimary else EnterpriseBorder) {
                                                        Text("${products.size}", color = if (selectedCategoryName == null) Color.White else EnterpriseTextDark)
                                                    }
                                                }
                                            }
                                        }

                                        items(dynamicCategoriesList) { catName ->
                                            val count = categoriesMap[catName]?.size ?: 0
                                            val isSelected = selectedCategoryName == catName
                                            Surface(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable { selectedCategoryName = catName },
                                                shape = RoundedCornerShape(10.dp),
                                                color = if (isSelected) EnterprisePrimaryLight else Color.Transparent
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(10.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(catName, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, color = if (isSelected) EnterprisePrimary else EnterpriseTextDark)
                                                    Badge(containerColor = if (isSelected) EnterprisePrimary else EnterpriseBorder) {
                                                        Text("$count", color = if (isSelected) Color.White else EnterpriseTextDark)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Panel Derecho: Grid de Productos
                            Box(modifier = Modifier.weight(1f)) {
                                LazyVerticalGrid(
                                    columns = GridCells.Adaptive(minSize = 240.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                    contentPadding = PaddingValues(bottom = 80.dp)
                                ) {
                                    items(filteredProducts, key = { it.id }) { product ->
                                        val index = filteredProducts.indexOf(product)
                                        ProductItemCard(
                                            product = product,
                                            isReorderMode = isReorderMode,
                                            onMoveUp = {
                                                if (index > 0) {
                                                    val mutable = filteredProducts.toMutableList()
                                                    val item = mutable.removeAt(index)
                                                    mutable.add(index - 1, item)
                                                    onReorderProducts?.invoke(mutable)
                                                }
                                            },
                                            onMoveDown = {
                                                if (index < filteredProducts.size - 1) {
                                                    val mutable = filteredProducts.toMutableList()
                                                    val item = mutable.removeAt(index)
                                                    mutable.add(index + 1, item)
                                                    onReorderProducts?.invoke(mutable)
                                                }
                                            },
                                            onEdit = { onEditProduct(product) },
                                            onDuplicate = { onDuplicateProduct(product) },
                                            onToggleStatus = { onToggleProductStatus(product.id, product.status) },
                                            onDeleteRequest = { productToDelete = product }
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        // Vista en Teléfono
                        if (displayMode == MenuDisplayMode.CATEGORIES && selectedCategoryName == null) {
                            Column {
                                Text(
                                    "Carpetas de Categorías",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = EnterpriseTextDark,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                )

                                LazyVerticalGrid(
                                    columns = GridCells.Fixed(2),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                    contentPadding = PaddingValues(bottom = 80.dp)
                                ) {
                                    items(dynamicCategoriesList) { catName ->
                                        val count = categoriesMap[catName]?.size ?: 0
                                        CategoryCard(
                                            title = catName,
                                            productCount = count,
                                            onClick = { selectedCategoryName = catName }
                                        )
                                    }

                                    item {
                                        AddCategoryCard(onClick = { showNewCategoryDialog = true })
                                    }
                                }
                            }
                        } else {
                            // Lista Corrida de Productos
                            LazyColumn(
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                                contentPadding = PaddingValues(bottom = 80.dp)
                            ) {
                                items(filteredProducts, key = { it.id }) { product ->
                                    val index = filteredProducts.indexOf(product)
                                    ProductItemCard(
                                        product = product,
                                        isReorderMode = isReorderMode,
                                        onMoveUp = {
                                            if (index > 0) {
                                                val mutable = filteredProducts.toMutableList()
                                                val item = mutable.removeAt(index)
                                                mutable.add(index - 1, item)
                                                onReorderProducts?.invoke(mutable)
                                            }
                                        },
                                        onMoveDown = {
                                            if (index < filteredProducts.size - 1) {
                                                val mutable = filteredProducts.toMutableList()
                                                val item = mutable.removeAt(index)
                                                mutable.add(index + 1, item)
                                                onReorderProducts?.invoke(mutable)
                                            }
                                        },
                                        onEdit = { onEditProduct(product) },
                                        onDuplicate = { onDuplicateProduct(product) },
                                        onToggleStatus = { onToggleProductStatus(product.id, product.status) },
                                        onDeleteRequest = { productToDelete = product }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Diálogo de Nueva Categoría
    if (showNewCategoryDialog) {
        AlertDialog(
            onDismissRequest = { showNewCategoryDialog = false },
            title = { Text("Nueva Categoría", fontWeight = FontWeight.Bold, color = EnterpriseTextDark) },
            text = {
                Column {
                    Text("Crea una categoría para organizar tus productos en el menú.", style = MaterialTheme.typography.bodySmall, color = EnterpriseTextMuted)
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = newCategoryNameText,
                        onValueChange = { newCategoryNameText = it },
                        label = { Text("Nombre de la Categoría") },
                        placeholder = { Text("Ej. Almuerzos Ejecutivos") },
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newCategoryNameText.isNotBlank()) {
                            val catName = newCategoryNameText.trim()
                            selectedCategoryName = catName
                            onCreateCategory(catName)
                            newCategoryNameText = ""
                            showNewCategoryDialog = false
                            coroutineScope.launch {
                                snackbarHostState.showSnackbar("📁 Categoría '$catName' guardada")
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EnterprisePrimary)
                ) {
                    Text("Crear Categoría")
                }
            },
            dismissButton = {
                TextButton(onClick = { showNewCategoryDialog = false }) {
                    Text("Cancelar", color = EnterpriseTextMuted)
                }
            }
        )
    }

    // Diálogo de Confirmación para Eliminar Producto
    productToDelete?.let { prod ->
        AlertDialog(
            onDismissRequest = { productToDelete = null },
            title = { Text("¿Eliminar producto?", fontWeight = FontWeight.Bold, color = EnterpriseRed) },
            text = {
                Text(
                    "¿Estás seguro de que deseas eliminar permanentemente '${prod.name}'? Esta acción no se puede deshacer.",
                    color = EnterpriseTextDark
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onDeleteProduct(prod.id)
                        productToDelete = null
                        coroutineScope.launch {
                            snackbarHostState.showSnackbar("🗑️ Producto '${prod.name}' eliminado")
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EnterpriseRed)
                ) {
                    Text("Eliminar")
                }
            },
            dismissButton = {
                TextButton(onClick = { productToDelete = null }) {
                    Text("Cancelar", color = EnterpriseTextMuted)
                }
            }
        )
    }
}

@Composable
private fun CategoryCard(
    title: String,
    productCount: Int,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(105.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = BorderStroke(1.dp, EnterpriseBorder),
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(EnterprisePrimaryLight),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Folder, contentDescription = null, tint = EnterprisePrimary, modifier = Modifier.size(20.dp))
            }
            Column {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = EnterpriseTextDark, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("$productCount productos", style = MaterialTheme.typography.labelSmall, color = EnterpriseTextMuted)
            }
        }
    }
}

@Composable
private fun AddCategoryCard(onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(105.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = EnterprisePrimaryLight.copy(alpha = 0.5f),
        border = BorderStroke(1.dp, EnterprisePrimary.copy(alpha = 0.3f))
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(Icons.Default.AddCircleOutline, contentDescription = null, tint = EnterprisePrimary, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text("+ Nueva Categoría", style = MaterialTheme.typography.labelMedium, color = EnterprisePrimary, fontWeight = FontWeight.Bold)
        }
    }
}

/**
 * Card Enterprise para cada Producto en el Catálogo.
 */
@Composable
private fun ProductItemCard(
    product: Product,
    isReorderMode: Boolean = false,
    onMoveUp: () -> Unit = {},
    onMoveDown: () -> Unit = {},
    onEdit: () -> Unit,
    onDuplicate: () -> Unit,
    onToggleStatus: () -> Unit,
    onDeleteRequest: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }
    val isAvailable = product.status == ProductStatus.ACTIVE

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = BorderStroke(1.dp, if (isAvailable) EnterpriseBorder else EnterpriseBorder.copy(alpha = 0.6f)),
        shadowElevation = if (isReorderMode) 4.dp else 1.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Controles de Reordenamiento
            if (isReorderMode) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(end = 8.dp)
                ) {
                    IconButton(onClick = onMoveUp, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.KeyboardArrowUp, contentDescription = "Mover Arriba", tint = EnterprisePrimary)
                    }
                    Icon(Icons.Default.DragHandle, contentDescription = null, tint = EnterpriseTextMuted, modifier = Modifier.size(18.dp))
                    IconButton(onClick = onMoveDown, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Mover Abajo", tint = EnterprisePrimary)
                    }
                }
            }

            // Imagen del Producto con Placeholder Elegante
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFFF1F5F9)),
                contentAlignment = Alignment.Center
            ) {
                val imageUrl = product.getMainImage()
                if (imageUrl.isNotBlank()) {
                    AsyncImage(
                        model = imageUrl,
                        contentDescription = product.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Icon(
                        Icons.Default.Fastfood,
                        contentDescription = null,
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Información y Metadatos
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = EnterpriseTextDark,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = product.formattedPrice,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = EnterprisePrimary
                    )
                }

                // Categoría / Subcategoría
                val categoryTag = product.categoryName.ifBlank { product.category.name }
                val subCategoryTag = product.subCategoryName
                val metadataTag = when {
                    categoryTag.isNotBlank() && subCategoryTag.isNotBlank() -> "$categoryTag • $subCategoryTag"
                    categoryTag.isNotBlank() -> categoryTag
                    else -> ""
                }
                if (metadataTag.isNotBlank()) {
                    Text(
                        text = metadataTag,
                        style = MaterialTheme.typography.labelSmall,
                        color = EnterprisePrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 1.dp)
                    )
                }

                if (product.description.isNotBlank()) {
                    Text(
                        text = product.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = EnterpriseTextMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                // Barra de Estado & Acciones Rápidas
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Badge Interactivo de Disponibilidad (1-clic toggle)
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = if (isAvailable) EnterpriseGreenLight else EnterpriseRedLight,
                        border = BorderStroke(1.dp, if (isAvailable) EnterpriseGreen.copy(alpha = 0.3f) else EnterpriseRed.copy(alpha = 0.3f)),
                        modifier = Modifier.clickable { onToggleStatus() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(if (isAvailable) EnterpriseGreen else EnterpriseRed)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isAvailable) "Disponible" else "Agotado",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isAvailable) EnterpriseGreen else EnterpriseRed
                            )
                        }
                    }

                    // Acciones: Editar Directo + Menú Desplegable
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedButton(
                            onClick = onEdit,
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                            modifier = Modifier.height(28.dp),
                            border = BorderStroke(1.dp, EnterprisePrimary.copy(alpha = 0.5f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = EnterprisePrimary)
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Editar", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        }

                        Box {
                            IconButton(onClick = { showMenu = true }, modifier = Modifier.size(28.dp)) {
                                Icon(Icons.Default.MoreVert, contentDescription = "Opciones", tint = EnterpriseTextMuted, modifier = Modifier.size(18.dp))
                            }
                            DropdownMenu(
                                expanded = showMenu,
                                onDismissRequest = { showMenu = false },
                                modifier = Modifier.background(Color.White)
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Editar producto", color = EnterpriseTextDark) },
                                    leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null, tint = EnterprisePrimary) },
                                    onClick = { showMenu = false; onEdit() }
                                )
                                DropdownMenuItem(
                                    text = { Text("Duplicar", color = EnterpriseTextDark) },
                                    leadingIcon = { Icon(Icons.Default.ContentCopy, contentDescription = null, tint = EnterpriseTextDark) },
                                    onClick = { showMenu = false; onDuplicate() }
                                )
                                DropdownMenuItem(
                                    text = { Text(if (isAvailable) "Marcar como Agotado" else "Marcar como Activo", color = EnterpriseTextDark) },
                                    leadingIcon = {
                                        Icon(
                                            if (isAvailable) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = null,
                                            tint = if (isAvailable) EnterpriseAmber else EnterpriseGreen
                                        )
                                    },
                                    onClick = { showMenu = false; onToggleStatus() }
                                )
                                HorizontalDivider(color = EnterpriseBorder)
                                DropdownMenuItem(
                                    text = { Text("Eliminar", color = EnterpriseRed, fontWeight = FontWeight.Bold) },
                                    leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = EnterpriseRed) },
                                    onClick = { showMenu = false; onDeleteRequest() }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
