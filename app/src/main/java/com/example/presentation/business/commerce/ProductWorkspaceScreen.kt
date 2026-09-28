package com.example.presentation.business.commerce

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.presentation.business.catalog.MerchantSubcategoriesDialog
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class WorkspaceFilter {
    ALL, ACTIVE, OUT_OF_STOCK, PROMOTIONS
}

enum class ActiveBottomSheet {
    NONE, CATEGORIES, VARIANTS, COMBOS, PROMOTIONS
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductWorkspaceScreen(
    restaurantId: String,
    productsList: List<Product> = emptyList(),
    isEmbedded: Boolean = false,
    onAddProductClick: () -> Unit = {},
    onEditProduct: (Product) -> Unit = {},
    onDuplicateProduct: (Product) -> Unit = {},
    onToggleProductStatus: (String, ProductStatus) -> Unit = { _, _ -> },
    onQuickPriceUpdate: (String, Double) -> Unit = { _, _ -> },
    onDeleteProduct: (String) -> Unit = {},
    onBack: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val configuration = LocalConfiguration.current
    val isTablet = configuration.screenWidthDp >= 600

    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf(WorkspaceFilter.ALL) }
    var activeBottomSheet by remember { mutableStateOf(ActiveBottomSheet.NONE) }
    var isFabExpanded by remember { mutableStateOf(false) }

    // Estado Selección Múltiple
    var isSelectionMode by remember { mutableStateOf(false) }
    val selectedProductIds = remember { mutableStateListOf<String>() }
    var showOverflowMenu by remember { mutableStateOf(false) }
    var showSubcategoriesDialog by remember { mutableStateOf(false) }

    // Filtrar Productos Reactivamente
    val filteredProducts = remember(productsList, searchQuery, selectedFilter) {
        productsList.filter { p ->
            val matchesQuery = p.name.contains(searchQuery, ignoreCase = true) ||
                    p.categoryName.contains(searchQuery, ignoreCase = true)
            val matchesFilter = when (selectedFilter) {
                WorkspaceFilter.ALL -> true
                WorkspaceFilter.ACTIVE -> p.status == ProductStatus.ACTIVE
                WorkspaceFilter.OUT_OF_STOCK -> p.status == ProductStatus.OUT_OF_STOCK
                WorkspaceFilter.PROMOTIONS -> p.isPopular || p.isTopSeller || p.originalPrice != null
            }
            matchesQuery && matchesFilter
        }
    }

    val activeCount = productsList.count { it.status == ProductStatus.ACTIVE }
    val outOfStockCount = productsList.count { it.status == ProductStatus.OUT_OF_STOCK }
    val promosCount = productsList.count { it.isPopular || it.isTopSeller || it.originalPrice != null }

    val bgDark = Color(0xFFF8FAFC)
    val accentBlue = Color(0xFF2563EB)

    Scaffold(
        topBar = {
            if (!isEmbedded) {
                TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("📦 Productos", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = Color(0xFF0F172A))
                        }
                        Text("Catálogo en vivo · Sincronizado", fontSize = 11.sp, color = Color(0xFF10B981), fontWeight = FontWeight.SemiBold)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color(0xFF0F172A))
                    }
                },
                actions = {
                    // Botón Selección Múltiple
                    IconButton(onClick = {
                        isSelectionMode = !isSelectionMode
                        if (!isSelectionMode) selectedProductIds.clear()
                    }) {
                        Icon(
                            if (isSelectionMode) Icons.Default.ChecklistRtl else Icons.Default.Checklist,
                            contentDescription = "Selección Múltiple",
                            tint = if (isSelectionMode) accentBlue else Color(0xFF64748B)
                        )
                    }

                    // Menú Contextual Overflow
                    Box {
                        IconButton(onClick = { showOverflowMenu = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "Opciones", tint = Color(0xFF0F172A))
                        }
                        DropdownMenu(
                            expanded = showOverflowMenu,
                            onDismissRequest = { showOverflowMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("🏷️ Mis Subcategorías", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                                onClick = {
                                    showOverflowMenu = false
                                    showSubcategoriesDialog = true
                                },
                                leadingIcon = { Icon(Icons.Default.Sell, contentDescription = null, modifier = Modifier.size(16.dp), tint = accentBlue) }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    },
        floatingActionButton = {
            // Speed Dial FAB Inteligente No Invasivo
            Box(contentAlignment = Alignment.BottomEnd) {
                if (isFabExpanded) {
                    Column(
                        horizontalAlignment = Alignment.End,
                        modifier = Modifier.padding(bottom = 60.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color.White,
                            shadowElevation = 6.dp,
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier.width(200.dp)
                        ) {
                            Column(modifier = Modifier.padding(vertical = 6.dp)) {
                                Text(
                                    "Acciones Rápidas",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF64748B),
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp)
                                )
                                HorizontalDivider(color = Color(0xFFF1F5F9))
                                
                                DropdownMenuItem(
                                    text = { Text("+ Nuevo producto", fontSize = 13.sp, fontWeight = FontWeight.Bold) },
                                    onClick = {
                                        isFabExpanded = false
                                        onAddProductClick()
                                    },
                                    leadingIcon = { Icon(Icons.Default.AddBox, contentDescription = null, tint = accentBlue, modifier = Modifier.size(18.dp)) }
                                )
                                DropdownMenuItem(
                                    text = { Text("+ Nueva categoría", fontSize = 13.sp) },
                                    onClick = {
                                        isFabExpanded = false
                                        activeBottomSheet = ActiveBottomSheet.CATEGORIES
                                    },
                                    leadingIcon = { Icon(Icons.Default.Category, contentDescription = null, tint = Color(0xFF8B5CF6), modifier = Modifier.size(18.dp)) }
                                )
                                DropdownMenuItem(
                                    text = { Text("+ Nuevo combo", fontSize = 13.sp) },
                                    onClick = {
                                        isFabExpanded = false
                                        activeBottomSheet = ActiveBottomSheet.COMBOS
                                    },
                                    leadingIcon = { Icon(Icons.Default.Fastfood, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp)) }
                                )
                                DropdownMenuItem(
                                    text = { Text("+ Promoción", fontSize = 13.sp) },
                                    onClick = {
                                        isFabExpanded = false
                                        activeBottomSheet = ActiveBottomSheet.PROMOTIONS
                                    },
                                    leadingIcon = { Icon(Icons.Default.LocalOffer, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp)) }
                                )
                            }
                        }
                    }
                }

                FloatingActionButton(
                    onClick = { isFabExpanded = !isFabExpanded },
                    containerColor = accentBlue,
                    contentColor = Color.White,
                    shape = CircleShape,
                    modifier = Modifier.size(52.dp)
                ) {
                    Icon(
                        imageVector = if (isFabExpanded) Icons.Default.Close else Icons.Default.Add,
                        contentDescription = "Acciones Rápidas",
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        },
        containerColor = bgDark
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Spacer(modifier = Modifier.height(2.dp))

                // ─── 1. RESUMEN COMPACTO DE MÉTRICAS ───
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CompactMetricItem(label = "Productos", count = productsList.size, color = Color(0xFF0F172A))
                        VerticalDivider(modifier = Modifier.height(18.dp), color = Color(0xFFE2E8F0))
                        CompactMetricItem(label = "Activos", count = activeCount, color = Color(0xFF16A34A))
                        VerticalDivider(modifier = Modifier.height(18.dp), color = Color(0xFFE2E8F0))
                        CompactMetricItem(label = "Agotados", count = outOfStockCount, color = Color(0xFFDC2626))
                        VerticalDivider(modifier = Modifier.height(18.dp), color = Color(0xFFE2E8F0))
                        CompactMetricItem(label = "Promos", count = promosCount, color = Color(0xFFD97706))
                    }
                }

                // ─── 2. IA INSIGHTS INTERACTIVO ───
                if (outOfStockCount > 0) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFEEF2FF),
                        border = BorderStroke(1.dp, Color(0xFFC7D2FE)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedFilter = WorkspaceFilter.OUT_OF_STOCK }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier.size(22.dp).clip(CircleShape).background(Color(0xFF4F46E5)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "🤖 IA Insights: $outOfStockCount productos agotados requieren atención.",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF3730A3),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Ver",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFF4338CA)
                            )
                        }
                    }
                }

                // ─── 3. BUSCADOR OMNIBOX COMPACTO ───
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    shadowElevation = 1.dp,
                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                    modifier = Modifier.fillMaxWidth().height(46.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(modifier = Modifier.weight(1f)) {
                            if (searchQuery.isEmpty()) {
                                Text("Buscar producto o categoría...", fontSize = 13.sp, color = Color(0xFF94A3B8))
                            }
                            androidx.compose.foundation.text.BasicTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                singleLine = true,
                                textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp, color = Color(0xFF0F172A)),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = { searchQuery = "" }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.Close, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                }

                // ─── 4. CHIPS DE FILTRO ───
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    item {
                        FilterChipItem("Todos (${productsList.size})", selectedFilter == WorkspaceFilter.ALL) {
                            selectedFilter = WorkspaceFilter.ALL
                        }
                    }
                    item {
                        FilterChipItem("🟢 Activos ($activeCount)", selectedFilter == WorkspaceFilter.ACTIVE) {
                            selectedFilter = WorkspaceFilter.ACTIVE
                        }
                    }
                    item {
                        FilterChipItem("🔴 Agotados ($outOfStockCount)", selectedFilter == WorkspaceFilter.OUT_OF_STOCK) {
                            selectedFilter = WorkspaceFilter.OUT_OF_STOCK
                        }
                    }
                    item {
                        FilterChipItem("🎁 Promos ($promosCount)", selectedFilter == WorkspaceFilter.PROMOTIONS) {
                            selectedFilter = WorkspaceFilter.PROMOTIONS
                        }
                    }
                }

                // ─── 5. BARRA DE ACCIONES MASIVAS ───
                if (isSelectionMode && selectedProductIds.isNotEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF0F172A),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("☑️ ${selectedProductIds.size} seleccionados", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                TextButton(onClick = {
                                    selectedProductIds.forEach { id ->
                                        onToggleProductStatus(id, ProductStatus.ACTIVE)
                                    }
                                    selectedProductIds.clear()
                                }) {
                                    Text("Activar", fontSize = 11.sp, color = Color(0xFF22C55E), fontWeight = FontWeight.Bold)
                                }
                                TextButton(onClick = {
                                    selectedProductIds.forEach { id ->
                                        onToggleProductStatus(id, ProductStatus.OUT_OF_STOCK)
                                    }
                                    selectedProductIds.clear()
                                }) {
                                    Text("Pausar", fontSize = 11.sp, color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }

                // ─── 6. CATÁLOGO DE PRODUCTOS (GRID TABLET / LAZYCOLUMN MOBILE) ───
                if (filteredProducts.isEmpty()) {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Inbox, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(44.dp))
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("No se encontraron productos", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF64748B))
                        }
                    }
                } else if (isTablet) {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(bottom = 88.dp)
                    ) {
                        items(filteredProducts, key = { it.id }) { product ->
                            ProductCardEnterprise(
                                product = product,
                                isSelectionMode = isSelectionMode,
                                isSelected = selectedProductIds.contains(product.id),
                                onSelectToggle = {
                                    if (selectedProductIds.contains(product.id)) selectedProductIds.remove(product.id)
                                    else selectedProductIds.add(product.id)
                                },
                                onEdit = { onEditProduct(product) },
                                onDuplicate = { onDuplicateProduct(product) },
                                onToggleStatus = { onToggleProductStatus(product.id, product.status) },
                                onQuickPriceUpdate = { newPrice -> onQuickPriceUpdate(product.id, newPrice) },
                                onDelete = { onDeleteProduct(product.id) }
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f).fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(bottom = 88.dp)
                    ) {
                        items(filteredProducts, key = { it.id }) { product ->
                            ProductCardEnterprise(
                                product = product,
                                isSelectionMode = isSelectionMode,
                                isSelected = selectedProductIds.contains(product.id),
                                onSelectToggle = {
                                    if (selectedProductIds.contains(product.id)) selectedProductIds.remove(product.id)
                                    else selectedProductIds.add(product.id)
                                },
                                onEdit = { onEditProduct(product) },
                                onDuplicate = { onDuplicateProduct(product) },
                                onToggleStatus = { onToggleProductStatus(product.id, product.status) },
                                onQuickPriceUpdate = { newPrice -> onQuickPriceUpdate(product.id, newPrice) },
                                onDelete = { onDeleteProduct(product.id) }
                            )
                        }
                    }
                }
            }

            if (showSubcategoriesDialog) {
                MerchantSubcategoriesDialog(
                    businessId = restaurantId,
                    onDismiss = { showSubcategoriesDialog = false }
                )
            }

            // ─── BOTTOM SHEETS CONTEXTUALES ───
            if (activeBottomSheet == ActiveBottomSheet.CATEGORIES) {
                CategoriesBottomSheet(onDismiss = { activeBottomSheet = ActiveBottomSheet.NONE })
            }
            if (activeBottomSheet == ActiveBottomSheet.COMBOS) {
                CombosBottomSheet(
                    restaurantId = restaurantId,
                    onDismiss = { activeBottomSheet = ActiveBottomSheet.NONE },
                    onSaveSuccess = { }
                )
            }
            if (activeBottomSheet == ActiveBottomSheet.PROMOTIONS) {
                PromotionsBottomSheet(onDismiss = { activeBottomSheet = ActiveBottomSheet.NONE })
            }
        }
    }
}

@Composable
fun CompactMetricItem(label: String, count: Int, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text("$count", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = color)
        Spacer(modifier = Modifier.width(3.dp))
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF64748B))
    }
}

@Composable
fun FilterChipItem(label: String, isSelected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = if (isSelected) Color(0xFF2563EB) else Color.White,
        border = BorderStroke(1.dp, if (isSelected) Color(0xFF2563EB) else Color(0xFFE2E8F0)),
        shadowElevation = 0.5.dp,
        modifier = Modifier.clickable { onClick() }
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = if (isSelected) Color.White else Color(0xFF475569),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoriesBottomSheet(
    onDismiss: () -> Unit,
    categoryRepo: com.example.data.repository.CategoryRepository = remember { com.example.data.repository.CategoryRepository() }
) {
    val scope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    var newCategoryName by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("📂 Gestión de Categorías", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("Organiza y crea categorías en tiempo real.", fontSize = 12.sp, color = Color(0xFF64748B))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = newCategoryName,
                    onValueChange = { newCategoryName = it },
                    placeholder = { Text("Nueva categoría...") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                Button(
                    onClick = {
                        val clean = newCategoryName.trim()
                        if (clean.isNotBlank()) {
                            isSaving = true
                            scope.launch {
                                try {
                                    val result = categoryRepo.addCategory(name = clean)
                                    if (result.isSuccess) {
                                        android.widget.Toast.makeText(context, "Categoría '$clean' creada ✓", android.widget.Toast.LENGTH_SHORT).show()
                                        newCategoryName = ""
                                        onDismiss()
                                    } else {
                                        android.widget.Toast.makeText(context, "Error al crear categoría", android.widget.Toast.LENGTH_SHORT).show()
                                    }
                                } catch (e: Exception) {
                                    android.widget.Toast.makeText(context, "Error: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                                } finally {
                                    isSaving = false
                                }
                            }
                        }
                    },
                    enabled = !isSaving && newCategoryName.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                ) {
                    Text(if (isSaving) "..." else "+ Crear")
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CombosBottomSheet(
    restaurantId: String,
    onDismiss: () -> Unit,
    onSaveSuccess: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val comboRepo = remember { com.example.data.repository.menu.MenuComboRepositoryImpl() }

    var comboName by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var basePrice by remember { mutableStateOf("") }
    var discount by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("🍔 Crear Nuevo Combo Enterprise", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF0F172A))
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color(0xFF64748B))
                }
            }
            Text("Configura un paquete de productos con descuento especial para tus clientes y sincronízalo a Firestore.", fontSize = 12.sp, color = Color(0xFF64748B))

            if (errorMessage != null) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFFEF2F2),
                    border = BorderStroke(1.dp, Color(0xFFFCA5A5))
                ) {
                    Text(errorMessage ?: "", color = Color(0xFF991B1B), fontSize = 11.sp, modifier = Modifier.padding(8.dp))
                }
            }

            OutlinedTextField(
                value = comboName,
                onValueChange = { comboName = it },
                label = { Text("Nombre del Combo (ej. Combo Familiar 2x1)") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Descripción (ej. Incluye 2 Hamburguesas + 2 Bebidas)") },
                singleLine = false,
                maxLines = 2,
                modifier = Modifier.fillMaxWidth()
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = basePrice,
                    onValueChange = { basePrice = it },
                    label = { Text("Precio Base (C$)") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = discount,
                    onValueChange = { discount = it },
                    label = { Text("Descuento (C$)") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(
                onClick = {
                    val p = basePrice.toDoubleOrNull()
                    val d = discount.toDoubleOrNull() ?: 0.0
                    if (comboName.isBlank()) {
                        errorMessage = "Ingresa un nombre para el combo"
                        return@Button
                    }
                    if (p == null || p <= 0) {
                        errorMessage = "Ingresa un precio válido"
                        return@Button
                    }

                    isSaving = true
                    errorMessage = null
                    scope.launch {
                        val newCombo = com.example.domain.model.menu.MenuCombo(
                            id = "",
                            restaurantId = restaurantId,
                            name = comboName.trim(),
                            description = description.trim(),
                            basePrice = p,
                            fixedDiscount = d,
                            status = com.example.domain.model.menu.MenuComboStatus.ACTIVE
                        )
                        val result = comboRepo.saveCombo(newCombo)
                        isSaving = false
                        result.onSuccess {
                            onSaveSuccess()
                            onDismiss()
                        }.onFailure { err ->
                            errorMessage = err.message ?: "Error al guardar el combo"
                        }
                    }
                },
                enabled = !isSaving,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (isSaving) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                } else {
                    Icon(Icons.Default.Save, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Guardar Combo en Firestore", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PromotionsBottomSheet(onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("🏷️ Crear Nueva Promoción", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("Las promociones se gestionan y sincronizan desde el módulo de Promociones.", fontSize = 12.sp, color = Color(0xFF64748B))
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Aceptar")
            }
            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
