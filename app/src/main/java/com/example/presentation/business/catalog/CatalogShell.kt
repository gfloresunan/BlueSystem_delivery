package com.example.presentation.business.catalog

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.model.Category
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.presentation.business.commerce.ProductWorkspaceScreen
import com.example.presentation.business.menu.CategoryMenuScreen
import com.example.presentation.business.menu.MenuFilterChip

/**
 * Pestañas internas del contenedor unificado CatalogShell (Fase 4).
 */
enum class CatalogSubTab(
    val title: String,
    val subtitle: String,
    val icon: ImageVector
) {
    PRODUCTS("Productos", "Catálogo & Stock", Icons.Default.Inventory2),
    MENU("Menú", "Categorías & Visual", Icons.Default.RestaurantMenu),
    PUBLISH("Publicación", "Centro de Control", Icons.Default.CloudUpload)
}

/**
 * CatalogShell: Contenedor Compose puro y aislado para la unificación del catálogo comercial.
 * 
 * En Fase 4:
 * - Proporciona navegación fluida entre Productos, Menú y Publicación.
 * - La pestaña PUBLICACIÓN permanece completamente INERTE (sin llamadas a MenuEngine ni mutaciones Firestore).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CatalogShell(
    restaurantId: String,
    productsList: List<Product> = emptyList(),
    categoriesList: List<Category> = emptyList(),
    onAddProductClick: () -> Unit = {},
    onEditProduct: (Product) -> Unit = {},
    onDuplicateProduct: (Product) -> Unit = {},
    onToggleProductStatus: (String, ProductStatus) -> Unit = { _, _ -> },
    onQuickPriceUpdate: (String, Double) -> Unit = { _, _ -> },
    onDeleteProduct: (String) -> Unit = {},
    onCreateCategory: (String) -> Unit = {},
    onBack: () -> Unit = {}
) {
    var selectedTab by rememberSaveable { mutableStateOf(CatalogSubTab.PRODUCTS) }

    val activeCount = remember(productsList) { productsList.count { it.status == ProductStatus.ACTIVE } }
    val outOfStockCount = remember(productsList) { productsList.count { it.status == ProductStatus.OUT_OF_STOCK } }
    val totalCategories = remember(categoriesList) { categoriesList.size }

    Scaffold(
        topBar = {
            Surface(
                color = Color.White,
                shadowElevation = 4.dp
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Header Superior
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = onBack) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Volver",
                                tint = Color(0xFF0F172A)
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Gestión de Catálogo",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 17.sp,
                                    color = Color(0xFF0F172A)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFEFF6FF)
                                ) {
                                    Text(
                                        text = "Fase 4 Preview",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF2563EB),
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                            Text(
                                text = "Productos: ${productsList.size} · Categorías: $totalCategories",
                                fontSize = 11.sp,
                                color = Color(0xFF64748B)
                            )
                        }
                    }

                    // Selector de 3 Pestañas Moderno y Aislado
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp)
                            .background(Color(0xFFF1F5F9), RoundedCornerShape(14.dp))
                            .padding(4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        CatalogSubTab.values().forEach { tab ->
                            val isSelected = selectedTab == tab
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(
                                        if (isSelected) Color.White else Color.Transparent
                                    )
                                    .then(
                                        if (isSelected) Modifier.shadow(2.dp, RoundedCornerShape(10.dp))
                                        else Modifier
                                    )
                                    .clickable { selectedTab = tab }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = tab.icon,
                                        contentDescription = tab.title,
                                        modifier = Modifier.size(16.dp),
                                        tint = if (isSelected) Color(0xFF2563EB) else Color(0xFF64748B)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = tab.title,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium,
                                        color = if (isSelected) Color(0xFF0F172A) else Color(0xFF64748B)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color(0xFFF8FAFC))
        ) {
            when (selectedTab) {
                CatalogSubTab.PRODUCTS -> {
                    ProductWorkspaceScreen(
                        restaurantId = restaurantId,
                        productsList = productsList,
                        isEmbedded = true,
                        onAddProductClick = onAddProductClick,
                        onEditProduct = onEditProduct,
                        onDuplicateProduct = onDuplicateProduct,
                        onToggleProductStatus = onToggleProductStatus,
                        onQuickPriceUpdate = onQuickPriceUpdate,
                        onDeleteProduct = onDeleteProduct,
                        onBack = onBack
                    )
                }

                CatalogSubTab.MENU -> {
                    CategoryMenuScreen(
                        products = productsList,
                        categories = categoriesList,
                        isEmbedded = true,
                        initialFilterChip = MenuFilterChip.ALL,
                        onAddProductClick = onAddProductClick,
                        onEditProduct = onEditProduct,
                        onDuplicateProduct = onDuplicateProduct,
                        onDeleteProduct = onDeleteProduct,
                        onToggleProductStatus = onToggleProductStatus,
                        onCreateCategory = onCreateCategory
                    )
                }

                CatalogSubTab.PUBLISH -> {
                    CatalogPublishScreen(
                        restaurantId = restaurantId,
                        productsList = productsList,
                        categoriesList = categoriesList,
                        onNavigateToProducts = { selectedTab = CatalogSubTab.PRODUCTS },
                        onNavigateToMenu = { selectedTab = CatalogSubTab.MENU }
                    )
                }
            }
        }
    }
}

/**
 * Vista de Gestión de Publicación de Catálogo (Fase 7.2 - Enterprise v2.2).
 * 
 * Cumple con el Contrato Aprobado:
 * - Detección real de cambios mediante comparación canónica SHA-256 (CanonicalJsonChecksumHelper).
 * - Validación integral previa al snapshot (ValidationEngineImpl).
 * - Previsualización 100% Read-Only (Preview ≠ Publicación).
 * - Diálogo de confirmación explícito antes de cualquier escritura transaccional.
 */
@Composable
private fun CatalogPublishScreen(
    restaurantId: String,
    productsList: List<Product>,
    categoriesList: List<Category>,
    onNavigateToProducts: () -> Unit,
    onNavigateToMenu: () -> Unit
) {
    val versionRepo = remember { com.example.data.repository.menu.MenuVersionRepositoryImpl() }
    val latestMenuVersion by versionRepo.getLatestMenuVersionFlow(restaurantId).collectAsState(initial = null)

    // Adaptación a modelos Core v2.2 para Checksum determinista y Validación
    val v2Categories = remember(categoriesList, restaurantId) {
        categoriesList.mapIndexed { idx, cat ->
            com.example.domain.model.menu.MenuCategory(
                id = cat.id.ifBlank { "cat_$idx" },
                restaurantId = restaurantId,
                primaryName = cat.name.ifBlank { "General" },
                orderIndex = idx,
                isActive = cat.active,
                versionNumber = 1
            )
        }
    }

    val v2Products = remember(productsList, restaurantId) {
        productsList.mapIndexed { idx, prod ->
            com.example.data.adapter.menu.LegacyMenuAdapter.toV2Product(prod, prod.categoryId).copy(
                restaurantId = restaurantId,
                orderIndex = if (prod.order > 0) prod.order else idx,
                versionNumber = 1
            )
        }
    }

    // 1. Cálculo de Checksum Canónico SHA-256
    val currentChecksum = remember(v2Categories, v2Products) {
        com.example.data.mapper.menu.CanonicalJsonChecksumHelper.computeMenuChecksum(v2Categories, v2Products)
    }

    // 2. Validación de Integridad
    val validationEngine = remember { com.example.domain.engine.menu.ValidationEngineImpl() }
    val validationResult = remember(v2Categories, v2Products) {
        validationEngine.validateMenuForPublishing(v2Categories, v2Products)
    }

    val publishedChecksum = latestMenuVersion?.checksum.orEmpty()
    val publishedVersion = latestMenuVersion?.version ?: 0L
    val nextVersion = publishedVersion + 1L

    val isPublished = publishedChecksum.isNotBlank()
    val isSynced = isPublished && (publishedChecksum == currentChecksum)
    val isValid = validationResult.isValid

    var showPreviewDialog by remember { mutableStateOf(false) }
    var showConfirmDialog by remember { mutableStateOf(false) }
    var isPublishing by remember { mutableStateOf(false) }
    var publicationSuccessMessage by remember { mutableStateOf<String?>(null) }
    var publicationErrorMessage by remember { mutableStateOf<String?>(null) }

    val coroutineScope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Tarjeta de Estado del Catálogo
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = when {
                    !isValid -> Color(0xFFFEF2F2)
                    isSynced -> Color(0xFFF0FDF4)
                    else -> Color(0xFFFFFBEB)
                }
            ),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                when {
                    !isValid -> Color(0xFFFECACA)
                    isSynced -> Color(0xFFBBF7D0)
                    else -> Color(0xFFFDE68A)
                }
            )
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .background(
                                color = when {
                                    !isValid -> Color(0xFFEF4444)
                                    isSynced -> Color(0xFF10B981)
                                    else -> Color(0xFFF59E0B)
                                },
                                shape = CircleShape
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = when {
                                !isValid -> Icons.Default.ErrorOutline
                                isSynced -> Icons.Default.CheckCircle
                                else -> Icons.Default.PublishedWithChanges
                            },
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(26.dp)
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = when {
                                !isValid -> "CATÁLOGO NO PUEDE PUBLICARSE"
                                isSynced -> "CATÁLOGO AL DÍA"
                                else -> "CAMBIOS LISTOS PARA PUBLICAR"
                            },
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black,
                            color = when {
                                !isValid -> Color(0xFF991B1B)
                                isSynced -> Color(0xFF166534)
                                else -> Color(0xFF92400E)
                            }
                        )
                        Text(
                            text = when {
                                !isValid -> "Se detectaron inconsistencias que deben corregirse."
                                isSynced -> "La versión visible para los clientes coincide exactamente con tu borrador."
                                else -> "Hay modificaciones en productos o categorías pendientes de publicar."
                            },
                            fontSize = 12.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Metadata de Versiones y Checksum
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White.copy(alpha = 0.8f), RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Versión Publicada", fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
                        Text(
                            text = if (publishedVersion > 0) "v$publishedVersion" else "Sin publicar",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF0F172A)
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Próxima Versión", fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
                        Text(
                            text = "v$nextVersion",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF2563EB)
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text("Integridad SHA-256", fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
                        Text(
                            text = currentChecksum.take(8) + "...",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                            color = Color(0xFF475569)
                        )
                    }
                }
            }
        }

        // Si hay errores de validación, mostrar el banner detallado (Estado 3)
        if (!isValid) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Problemas detectados (${validationResult.errors.size})",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFF991B1B)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    validationResult.errors.forEach { err ->
                        Text(
                            text = "• $err",
                            fontSize = 12.sp,
                            color = Color(0xFFB91C1C),
                            modifier = Modifier.padding(vertical = 2.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onNavigateToProducts,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Ir a Productos", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        OutlinedButton(
                            onClick = onNavigateToMenu,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Ir a Menú", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Resumen de Métricas del Snapshot
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "📦 Contenido del Snapshot",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF0F172A)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    StatSummaryItem(label = "Categorías", value = "${categoriesList.size}", color = Color(0xFF8B5CF6))
                    StatSummaryItem(label = "Total Platos", value = "${productsList.size}", color = Color(0xFF2563EB))
                    StatSummaryItem(label = "Activos", value = "${productsList.count { it.status == ProductStatus.ACTIVE }}", color = Color(0xFF10B981))
                    StatSummaryItem(label = "Agotados", value = "${productsList.count { it.status == ProductStatus.OUT_OF_STOCK }}", color = Color(0xFFEF4444))
                }
            }
        }

        // Botonera de Acción
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Botón VER PREVIEW (100% Read-Only)
            OutlinedButton(
                onClick = { showPreviewDialog = true },
                enabled = isValid,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    if (isValid) Color(0xFF2563EB) else Color(0xFFCBD5E1)
                )
            ) {
                Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(18.dp), tint = if (isValid) Color(0xFF2563EB) else Color(0xFF94A3B8))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Ver Preview",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = if (isValid) Color(0xFF2563EB) else Color(0xFF94A3B8)
                )
            }

            // Botón PUBLICAR (Habilitado solo si hay cambios y es válido)
            Button(
                onClick = { showConfirmDialog = true },
                enabled = isValid && !isSynced && !isPublishing,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF2563EB),
                    disabledContainerColor = Color(0xFFE2E8F0),
                    disabledContentColor = Color(0xFF94A3B8)
                ),
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp)
            ) {
                if (isPublishing) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.RocketLaunch, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isSynced) "Al día" else "Publicar v$nextVersion",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }

    // Modal de Previsualización (100% Read-Only)
    if (showPreviewDialog) {
        CatalogSnapshotPreviewDialog(
            nextVersion = nextVersion,
            categoriesList = categoriesList,
            productsList = productsList,
            checksum = currentChecksum,
            onDismiss = { showPreviewDialog = false }
        )
    }

    // Diálogo de Confirmación de Publicación
    if (showConfirmDialog) {
        CatalogPublishConfirmDialog(
            nextVersion = nextVersion,
            totalCategories = categoriesList.size,
            totalProducts = productsList.size,
            checksum = currentChecksum,
            onDismiss = { showConfirmDialog = false },
            onConfirm = {
                showConfirmDialog = false
                // Candado de certificación: Registro estructurado de intención sin mutar producción
                android.util.Log.d("CATALOG_PUBLISH", "[CATALOG_PUBLISH_INTENT] Publicación autorizada para v$nextVersion (SHA: $currentChecksum)")
            }
        )
    }
}

/**
 * Diálogo de Previsualización del Snapshot (100% Read-Only).
 * No realiza ninguna mutación en Firestore ni ejecuta MenuEngine.
 */
@Composable
private fun CatalogSnapshotPreviewDialog(
    nextVersion: Long,
    categoriesList: List<Category>,
    productsList: List<Product>,
    checksum: String,
    onDismiss: () -> Unit
) {
    val productsByCategory = remember(productsList) {
        productsList.groupBy { it.categoryName.ifBlank { it.category.name }.trim() }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Preview, contentDescription = null, tint = Color(0xFF2563EB))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Previsualización del Menú (v$nextVersion)",
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 420.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFF1F5F9),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)
                ) {
                    Text(
                        text = "SHA-256: ${checksum.take(16)}...",
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        fontSize = 11.sp,
                        color = Color(0xFF475569),
                        modifier = Modifier.padding(8.dp)
                    )
                }

                androidx.compose.foundation.lazy.LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    categoriesList.forEach { category ->
                        val catProds = productsByCategory[category.name.trim()] ?: emptyList()
                        item {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = Color(0xFFF8FAFC),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(
                                        text = "${category.name} (${catProds.size} platos)",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Color(0xFF0F172A)
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    catProds.forEach { p ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(text = "• ${p.name}", fontSize = 12.sp, color = Color(0xFF475569))
                                            Text(
                                                text = "$${String.format(java.util.Locale.US, "%.2f", p.price)}",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = Color(0xFF0F172A)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0F172A))
            ) {
                Text("Cerrar")
            }
        }
    )
}

/**
 * Diálogo de Confirmación Explícita de Publicación.
 */
@Composable
private fun CatalogPublishConfirmDialog(
    nextVersion: Long,
    totalCategories: Int,
    totalProducts: Int,
    checksum: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.RocketLaunch, contentDescription = null, tint = Color(0xFF2563EB))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Confirmar Publicación",
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "¿Deseas publicar la versión v$nextVersion del menú?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF0F172A)
                )

                Text(
                    text = "Esta acción congelará el catálogo actual y lo publicará de forma instantánea para todos los clientes.",
                    fontSize = 12.sp,
                    color = Color(0xFF64748B)
                )

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color(0xFFEFF6FF),
                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp)
                ) {
                    Column(modifier = Modifier.padding(10.dp)) {
                        Text("• $totalCategories categorías incluidas", fontSize = 12.sp, color = Color(0xFF1E40AF))
                        Text("• $totalProducts productos incluidos", fontSize = 12.sp, color = Color(0xFF1E40AF))
                        Text("• SHA-256: ${checksum.take(12)}...", fontSize = 11.sp, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, color = Color(0xFF1E40AF))
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
            ) {
                Text("Confirmar y Publicar")
            }
        },
        dismissButton = {
            OutlinedButton(
                onClick = onDismiss,
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Cancelar")
            }
        }
    )
}

@Composable
private fun StatSummaryItem(
    label: String,
    value: String,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            color = color
        )
        Text(
            text = label,
            fontSize = 11.sp,
            color = Color(0xFF64748B)
        )
    }
}
