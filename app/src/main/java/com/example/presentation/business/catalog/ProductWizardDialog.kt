package com.example.presentation.business.catalog

import android.graphics.Bitmap
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.domain.model.Product
import com.example.domain.model.ProductStatus
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary
import com.example.ui.theme.BlueTertiary
import java.io.ByteArrayOutputStream

/**
 * Wizard Stepper de 5 Pasos para Alta y Edición de Productos
 * Estilo Uber Eats / PedidosYa con Barra Inferior "Sticky" de Navegación Permanente (Jamás se pierde el botón Seguir).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductWizardDialog(
    product: Product? = null,
    onDismiss: () -> Unit,
    onSave: (Product, ByteArray?) -> Unit,
    isSaving: Boolean = false
) {
    var currentStep by remember { mutableIntStateOf(1) } // 1 a 5

    // Campos formulario
    var name by remember { mutableStateOf(product?.name ?: "") }
    var description by remember { mutableStateOf(product?.description ?: "") }
    var categoryName by remember { mutableStateOf(product?.categoryName.orEmpty().ifBlank { product?.category?.name ?: "Platos Principales" }) }
    var priceText by remember { mutableStateOf(product?.price?.let { if (it > 0) String.format("%.2f", it) else "" } ?: "") }
    var originalPriceText by remember { mutableStateOf(product?.originalPrice?.let { String.format("%.2f", it) } ?: "") }
    var taxText by remember { mutableStateOf(product?.taxPercentage?.toInt()?.toString() ?: "15") }
    var prepTimeText by remember { mutableStateOf(product?.preparationTimeMinutes?.toString() ?: "15") }
    var isAvailable by remember { mutableStateOf(product?.status != ProductStatus.OUT_OF_STOCK) }
    var stockText by remember { mutableStateOf(product?.stockQuantity?.toString() ?: "") }
    var isPopular by remember { mutableStateOf(product?.isPopular ?: false) }
    var isVegetarian by remember { mutableStateOf(product?.isVegetarian ?: false) }
    var isSpicy by remember { mutableStateOf(product?.isSpicy ?: false) }

    val context = LocalContext.current
    var showImageSourceDialog by remember { mutableStateOf(false) }

    // Galería multi-foto
    var photosList by remember {
        mutableStateOf(
            if (product?.images?.isNotEmpty() == true) product.images
            else if (product?.imageUrl?.isNotBlank() == true) listOf(product.imageUrl)
            else emptyList()
        )
    }

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            photosList = photosList + it.toString()
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        bitmap?.let {
            try {
                val tempFile = java.io.File(context.cacheDir, "temp_camera_${System.currentTimeMillis()}.jpg")
                tempFile.outputStream().use { out ->
                    it.compress(Bitmap.CompressFormat.JPEG, 85, out)
                }
                photosList = photosList + android.net.Uri.fromFile(tempFile).toString()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    if (showImageSourceDialog) {
        AlertDialog(
            onDismissRequest = { showImageSourceDialog = false },
            title = { Text("Agregar Foto del Platillo 📸", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Selecciona cómo deseas cargar la imagen:", fontSize = 14.sp, color = Color(0xFF64748B))
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                showImageSourceDialog = false
                                cameraLauncher.launch(null)
                            },
                        shape = RoundedCornerShape(14.dp),
                        color = BluePrimary.copy(alpha = 0.08f),
                        border = BorderStroke(1.dp, BluePrimary.copy(alpha = 0.2f))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = BluePrimary)
                            Spacer(modifier = Modifier.width(14.dp))
                            Column {
                                Text("Tomar Foto con Cámara", fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                                Text("Captura directamente desde tu dispositivo", fontSize = 11.sp, color = Color(0xFF64748B))
                            }
                        }
                    }

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                showImageSourceDialog = false
                                imagePicker.launch("image/*")
                            },
                        shape = RoundedCornerShape(14.dp),
                        color = BlueSecondary.copy(alpha = 0.08f),
                        border = BorderStroke(1.dp, BlueSecondary.copy(alpha = 0.2f))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = BlueSecondary)
                            Spacer(modifier = Modifier.width(14.dp))
                            Column {
                                Text("Elegir de Galería", fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                                Text("Carga una foto de tu biblioteca de imágenes", fontSize = 11.sp, color = Color(0xFF64748B))
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showImageSourceDialog = false }) { Text("Cancelar") }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color.White
        )
    }

    // Validación de Pasos para el Checklist
    val step1Done = name.isNotBlank() && categoryName.isNotBlank()
    val step2Done = priceText.toDoubleOrNull() != null && (priceText.toDoubleOrNull() ?: 0.0) > 0
    val step3Done = true
    val step4Done = true
    val step5Done = step1Done && step2Done

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = true
        )
    ) {
        BoxWithConstraints(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            val isTablet = maxWidth > 600.dp
            val dialogWidth = if (isTablet) 640.dp else maxWidth * 0.94f
            val dialogPadding = if (isTablet) 24.dp else 12.dp

            Surface(
                modifier = Modifier
                    .width(dialogWidth)
                    .fillMaxHeight(0.92f)
                    .padding(vertical = dialogPadding),
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                shadowElevation = 16.dp
            ) {
                Column(modifier = Modifier.fillMaxSize()) {

                    // ─── 1. HEADER PERMANENTE (Título + Stepper + Progress) ───
                    Surface(
                        color = Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 14.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .background(
                                                Brush.linearGradient(listOf(BluePrimary, BlueSecondary)),
                                                RoundedCornerShape(12.dp)
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = if (product == null) Icons.Default.AddBusiness else Icons.Default.Edit,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            if (product == null) "Agregar Producto" else "Editar Producto",
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 18.sp,
                                            color = Color(0xFF0F172A)
                                        )
                                        Text(
                                            "Paso $currentStep de 5 — ${
                                                when(currentStep) {
                                                    1 -> "Datos Generales"
                                                    2 -> "Precios e Impuestos"
                                                    3 -> "Stock y Etiquetas"
                                                    4 -> "Opciones y Extras"
                                                    else -> "Vista Previa del Cliente"
                                                }
                                            }",
                                            fontSize = 12.sp,
                                            color = Color(0xFF64748B)
                                        )
                                    }
                                }

                                IconButton(
                                    onClick = onDismiss,
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(Color(0xFFE2E8F0), CircleShape)
                                ) {
                                    Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color(0xFF475569), modifier = Modifier.size(18.dp))
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Stepper de Pasos
                            val stepLabels = listOf(
                                Triple("General", step1Done, 1),
                                Triple("Precios", step2Done, 2),
                                Triple("Stock", step3Done, 3),
                                Triple("Extras", step4Done, 4),
                                Triple("Preview", step5Done, 5)
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                stepLabels.forEach { (label, isDone, stepNum) ->
                                    val isActive = stepNum == currentStep

                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier
                                            .weight(1f)
                                            .clickable { currentStep = stepNum }
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(28.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    when {
                                                        isActive -> BluePrimary
                                                        isDone -> Color(0xFF10B981)
                                                        else -> Color(0xFFE2E8F0)
                                                    }
                                                ),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (isDone && !isActive) {
                                                Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                            } else {
                                                Text(
                                                    stepNum.toString(),
                                                    fontSize = 12.sp,
                                                    color = if (isActive) Color.White else Color(0xFF64748B),
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                        Text(
                                            label,
                                            fontSize = 10.sp,
                                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isActive) BluePrimary else Color(0xFF64748B),
                                            modifier = Modifier.padding(top = 4.dp),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Barra de Progreso
                            LinearProgressIndicator(
                                progress = { currentStep / 5f },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp)),
                                color = BluePrimary,
                                trackColor = Color(0xFFE2E8F0)
                            )
                        }
                    }

                    HorizontalDivider(color = Color(0xFFE2E8F0))

                    // ─── 2. CUERPO ESCROLABLE CON LOS PASOS ───
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .background(Color.White)
                            .verticalScroll(rememberScrollState())
                            .padding(20.dp)
                    ) {
                        when (currentStep) {
                            1 -> Step1Information(
                                name = name,
                                onNameChange = { name = it },
                                description = description,
                                onDescriptionChange = { description = it },
                                categoryName = categoryName,
                                onCategoryChange = { categoryName = it },
                                photosList = photosList,
                                onAddPhotoClick = { showImageSourceDialog = true },
                                onRemovePhoto = { index ->
                                    photosList = photosList.filterIndexed { i, _ -> i != index }
                                }
                            )
                            2 -> Step2Pricing(
                                priceText = priceText,
                                onPriceChange = { priceText = it },
                                originalPriceText = originalPriceText,
                                onOriginalPriceChange = { originalPriceText = it },
                                taxText = taxText,
                                onTaxChange = { taxText = it },
                                prepTimeText = prepTimeText,
                                onPrepTimeChange = { prepTimeText = it }
                            )
                            3 -> Step3Availability(
                                isAvailable = isAvailable,
                                onAvailableChange = { isAvailable = it },
                                stockText = stockText,
                                onStockChange = { stockText = it },
                                isPopular = isPopular,
                                onPopularChange = { isPopular = it },
                                isVegetarian = isVegetarian,
                                onVegetarianChange = { isVegetarian = it },
                                isSpicy = isSpicy,
                                onSpicyChange = { isSpicy = it }
                            )
                            4 -> Step4OptionsPlaceholder()
                            5 -> Step5Preview(
                                name = name.ifBlank { "Nombre del Producto" },
                                description = description.ifBlank { "Descripción sabrosa del producto..." },
                                price = priceText.toDoubleOrNull() ?: 0.0,
                                originalPrice = originalPriceText.toDoubleOrNull(),
                                imageUrl = photosList.firstOrNull() ?: "",
                                prepTime = prepTimeText.toIntOrNull() ?: 15,
                                isPopular = isPopular,
                                isVegetarian = isVegetarian,
                                isSpicy = isSpicy,
                                categoryName = categoryName
                            )
                        }
                    }

                    // ─── 3. BARRA INFERIOR STICKY PERMANENTE (NUNCA SE PIERDE EL BOTÓN SEGUIR) ───
                    Surface(
                        color = Color(0xFFF8FAFC),
                        shadowElevation = 12.dp,
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (currentStep > 1) {
                                OutlinedButton(
                                    onClick = { currentStep-- },
                                    shape = RoundedCornerShape(14.dp),
                                    border = BorderStroke(1.5.dp, Color(0xFFCBD5E1)),
                                    modifier = Modifier.height(48.dp)
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Anterior", fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                                }
                            } else {
                                TextButton(onClick = onDismiss) {
                                    Text("Cancelar", color = Color(0xFF94A3B8), fontWeight = FontWeight.SemiBold)
                                }
                            }

                            if (currentStep < 5) {
                                Button(
                                    onClick = { currentStep++ },
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                                    modifier = Modifier.height(48.dp)
                                ) {
                                    Text("Siguiente Paso", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                                }
                            } else {
                                Button(
                                    onClick = {
                                        val finalPrice = priceText.toDoubleOrNull() ?: 0.0
                                        val finalOrigPrice = originalPriceText.toDoubleOrNull()
                                        val finalStock = stockText.toIntOrNull()
                                        val finalPrep = prepTimeText.toIntOrNull() ?: 15
                                        val mainImg = photosList.firstOrNull() ?: ""

                                        val p = (product ?: Product()).copy(
                                            name = name,
                                            description = description,
                                            categoryName = categoryName,
                                            price = finalPrice,
                                            originalPrice = finalOrigPrice,
                                            taxPercentage = taxText.toDoubleOrNull() ?: 15.0,
                                            preparationTimeMinutes = finalPrep,
                                            status = if (isAvailable) ProductStatus.ACTIVE else ProductStatus.OUT_OF_STOCK,
                                            stockQuantity = finalStock,
                                            isPopular = isPopular,
                                            isVegetarian = isVegetarian,
                                            isSpicy = isSpicy,
                                            imageUrl = mainImg,
                                            images = photosList
                                        )
                                        onSave(p, null)
                                    },
                                    enabled = !isSaving && step5Done,
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp),
                                    modifier = Modifier.height(48.dp)
                                ) {
                                    if (isSaving) {
                                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                    } else {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Guardar Producto 💾", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── COMPOSABLES DE CADA PASO CON UX PROFESIONAL ───

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Step1Information(
    name: String,
    onNameChange: (String) -> Unit,
    description: String,
    onDescriptionChange: (String) -> Unit,
    categoryName: String,
    onCategoryChange: (String) -> Unit,
    photosList: List<String>,
    onAddPhotoClick: () -> Unit,
    onRemovePhoto: (Int) -> Unit
) {
    val predefinedCategories = listOf("Platos Principales", "Hamburguesas", "Pizzas", "Bebidas", "Postres", "Entradas", "Combos", "Snacks")

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Información Básica del Platillo", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0F172A))

        // Nombre del Producto
        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text("Nombre del Platillo o Producto *", fontWeight = FontWeight.Medium) },
            placeholder = { Text("Ej. Hamburguesa Doble Queso BBQ") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BluePrimary,
                unfocusedBorderColor = Color(0xFFCBD5E1)
            ),
            leadingIcon = { Icon(Icons.Default.Restaurant, contentDescription = null, tint = BluePrimary) }
        )

        // Descripción Apetitosa
        OutlinedTextField(
            value = description,
            onValueChange = onDescriptionChange,
            label = { Text("Descripción Detallada (Apetitosa)", fontWeight = FontWeight.Medium) },
            placeholder = { Text("Describe ingredientes, tamaño, cocción y detalles irresistible para el cliente...") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3,
            maxLines = 5,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BluePrimary,
                unfocusedBorderColor = Color(0xFFCBD5E1)
            )
        )

        // Categoría con chips sugeridos
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            OutlinedTextField(
                value = categoryName,
                onValueChange = onCategoryChange,
                label = { Text("Categoría del Menú *", fontWeight = FontWeight.Medium) },
                placeholder = { Text("Escribe o selecciona una categoría abajo...") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BluePrimary,
                    unfocusedBorderColor = Color(0xFFCBD5E1)
                ),
                leadingIcon = { Icon(Icons.Default.Category, contentDescription = null, tint = BlueSecondary) }
            )

            Text("Sugerencias rápidas:", fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                predefinedCategories.forEach { cat ->
                    val isSelected = categoryName.equals(cat, ignoreCase = true)
                    FilterChip(
                        selected = isSelected,
                        onClick = { onCategoryChange(cat) },
                        label = { Text(cat, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BluePrimary,
                            selectedLabelColor = Color.White
                        ),
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            }
        }

        HorizontalDivider(color = Color(0xFFF1F5F9))

        // Galería Multi-Foto
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Galería de Fotos 🖼️", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                    Text("La primera imagen será la portada principal", fontSize = 11.sp, color = Color(0xFF64748B))
                }
                Button(
                    onClick = onAddPhotoClick,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BlueSecondary),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Icon(Icons.Default.AddAPhoto, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("+ Foto", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            if (photosList.isEmpty()) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(110.dp)
                        .clickable { onAddPhotoClick() },
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFFF8FAFC),
                    border = BorderStroke(1.5.dp, Color(0xFFCBD5E1))
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Default.CloudUpload, contentDescription = null, tint = BlueSecondary, modifier = Modifier.size(32.dp))
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Toca para tomar foto o elegir de galería", fontSize = 12.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium)
                    }
                }
            } else {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    itemsIndexed(photosList) { index, photoUrl ->
                        Box(
                            modifier = Modifier
                                .size(100.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .border(
                                    if (index == 0) 2.5.dp else 1.dp,
                                    if (index == 0) BluePrimary else Color(0xFFCBD5E1),
                                    RoundedCornerShape(14.dp)
                                )
                        ) {
                            AsyncImage(
                                model = photoUrl,
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )

                            // Badge de Portada
                            Surface(
                                modifier = Modifier
                                    .align(Alignment.TopStart)
                                    .padding(4.dp),
                                color = if (index == 0) BluePrimary else Color.Black.copy(alpha = 0.75f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    if (index == 0) "Portada 🌟" else "#${index + 1}",
                                    color = Color.White,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                )
                            }

                            // Botón Eliminar
                            IconButton(
                                onClick = { onRemovePhoto(index) },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(4.dp)
                                    .size(24.dp)
                                    .background(Color.Red, CircleShape)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Step2Pricing(
    priceText: String,
    onPriceChange: (String) -> Unit,
    originalPriceText: String,
    onOriginalPriceChange: (String) -> Unit,
    taxText: String,
    onTaxChange: (String) -> Unit,
    prepTimeText: String,
    onPrepTimeChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Estructura de Precios y Tiempos", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0F172A))

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = priceText,
                onValueChange = onPriceChange,
                label = { Text("Precio de Venta (C$) *", fontWeight = FontWeight.Bold) },
                placeholder = { Text("180.00") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BluePrimary,
                    unfocusedBorderColor = Color(0xFFCBD5E1)
                ),
                leadingIcon = { Text("C$", fontWeight = FontWeight.ExtraBold, color = BluePrimary) }
            )

            OutlinedTextField(
                value = originalPriceText,
                onValueChange = onOriginalPriceChange,
                label = { Text("Precio Original (Opcional)", fontWeight = FontWeight.Medium) },
                placeholder = { Text("240.00") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BlueSecondary,
                    unfocusedBorderColor = Color(0xFFCBD5E1)
                )
            )
        }

        // Card informativo de descuento
        val pSale = priceText.toDoubleOrNull() ?: 0.0
        val pOrig = originalPriceText.toDoubleOrNull() ?: 0.0
        if (pOrig > pSale && pSale > 0) {
            val discountPercent = (((pOrig - pSale) / pOrig) * 100).toInt()
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFECFDF5),
                border = BorderStroke(1.dp, Color(0xFFA7F3D0))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.LocalOffer, contentDescription = null, tint = Color(0xFF10B981))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        "¡Descuento activado! Mostraremos una etiqueta de -$discountPercent% de ahorro al cliente.",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF065F46)
                    )
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = taxText,
                onValueChange = onTaxChange,
                label = { Text("IVA Incluido (%)", fontWeight = FontWeight.Medium) },
                placeholder = { Text("15") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(12.dp)
            )

            OutlinedTextField(
                value = prepTimeText,
                onValueChange = onPrepTimeChange,
                label = { Text("Tiempo Prep. (min) *", fontWeight = FontWeight.Medium) },
                placeholder = { Text("15") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                shape = RoundedCornerShape(12.dp),
                leadingIcon = { Icon(Icons.Default.Timer, contentDescription = null, tint = BluePrimary) }
            )
        }
    }
}

@Composable
private fun Step3Availability(
    isAvailable: Boolean,
    onAvailableChange: (Boolean) -> Unit,
    stockText: String,
    onStockChange: (String) -> Unit,
    isPopular: Boolean,
    onPopularChange: (Boolean) -> Unit,
    isVegetarian: Boolean,
    onVegetarianChange: (Boolean) -> Unit,
    isSpicy: Boolean,
    onSpicyChange: (Boolean) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Estado del Inventario y Distintivos", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0F172A))

        // Interruptor Activo/Agotado
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = if (isAvailable) Color(0xFFEFF6FF) else Color(0xFFFEF2F2),
            border = BorderStroke(1.5.dp, if (isAvailable) BlueSecondary else Color(0xFFFCA5A5))
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        if (isAvailable) "Disponible en el Menú 🟢" else "Agotado / Pausado 🔴",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = if (isAvailable) BluePrimary else Color(0xFF991B1B)
                    )
                    Text(
                        if (isAvailable) "Los clientes podrán pedir este producto" else "No figurará para compra activa",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B)
                    )
                }
                Switch(
                    checked = isAvailable,
                    onCheckedChange = onAvailableChange,
                    colors = SwitchDefaults.colors(checkedThumbColor = BluePrimary)
                )
            }
        }

        OutlinedTextField(
            value = stockText,
            onValueChange = onStockChange,
            label = { Text("Stock Disponible (Dejar vacío para ilimitado)") },
            placeholder = { Text("Ej. 25 o déjalo en blanco") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            shape = RoundedCornerShape(12.dp),
            leadingIcon = { Icon(Icons.Default.Inventory2, contentDescription = null, tint = BlueSecondary) }
        )

        HorizontalDivider(color = Color(0xFFF1F5F9))

        Text("Etiquetas Destacadas (UberEats / PedidosYa)", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))

        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onPopularChange(!isPopular) },
            shape = RoundedCornerShape(12.dp),
            color = Color(0xFFFFFBEB),
            border = BorderStroke(1.dp, Color(0xFFFDE68A))
        ) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = isPopular, onCheckedChange = onPopularChange)
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text("Destacado / Más Vendido ⭐", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF92400E))
                    Text("Aparecerá en la parte superior del menú", fontSize = 11.sp, color = Color(0xFFB45309))
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onVegetarianChange(!isVegetarian) },
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFECFDF5),
                border = BorderStroke(1.dp, Color(0xA7F3D0))
            ) {
                Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isVegetarian, onCheckedChange = onVegetarianChange)
                    Text("Vegetariano 🌱", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF065F46))
                }
            }

            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onSpicyChange(!isSpicy) },
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFFEF2F2),
                border = BorderStroke(1.dp, Color(0xFFFCA5A5))
            ) {
                Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isSpicy, onCheckedChange = onSpicyChange)
                    Text("Picante 🌶️", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF991B1B))
                }
            }
        }
    }
}

@Composable
private fun Step4OptionsPlaceholder() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .background(BluePrimary.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Outlined.Layers, contentDescription = null, modifier = Modifier.size(36.dp), tint = BluePrimary)
        }
        Spacer(modifier = Modifier.height(14.dp))
        Text("Opciones y Modificadores Adicionales", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            "Configura tamaños (Pequeño/Grande), salsas y adiciones para este platillo.",
            fontSize = 12.sp,
            color = Color(0xFF64748B),
            modifier = Modifier.padding(horizontal = 20.dp)
        )
    }
}

@Composable
private fun Step5Preview(
    name: String,
    description: String,
    price: Double,
    originalPrice: Double?,
    imageUrl: String,
    prepTime: Int,
    isPopular: Boolean,
    isVegetarian: Boolean,
    isSpicy: Boolean,
    categoryName: String
) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Vista Previa (App Móvil del Cliente)", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0F172A))
        Text("Así se presentará tu producto en la app:", fontSize = 12.sp, color = Color(0xFF64748B))

        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(170.dp)
                        .background(Brush.linearGradient(listOf(BlueSecondary, BlueTertiary))),
                    contentAlignment = Alignment.Center
                ) {
                    if (imageUrl.isNotBlank()) {
                        AsyncImage(
                            model = imageUrl,
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Icon(Icons.Default.Fastfood, contentDescription = null, tint = Color.White.copy(alpha = 0.7f), modifier = Modifier.size(56.dp))
                    }

                    if (isPopular) {
                        Surface(
                            modifier = Modifier
                                .align(Alignment.TopStart)
                                .padding(12.dp),
                            color = Color(0xFFF59E0B),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("⭐ Más Vendido", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                    }
                }

                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(name, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color(0xFF0F172A))
                            Text(categoryName, fontSize = 12.sp, color = BluePrimary, fontWeight = FontWeight.SemiBold)
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text("C$ ${String.format("%.2f", price)}", fontWeight = FontWeight.Black, fontSize = 18.sp, color = BluePrimary)
                            if (originalPrice != null && originalPrice > price) {
                                Text(
                                    "C$ ${String.format("%.2f", originalPrice)}",
                                    fontSize = 12.sp,
                                    color = Color.Gray,
                                    textDecoration = TextDecoration.LineThrough
                                )
                            }
                        }
                    }

                    if (description.isNotBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(description, fontSize = 13.sp, color = Color(0xFF475569), maxLines = 3, overflow = TextOverflow.Ellipsis)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AssistChip(
                            onClick = {},
                            label = { Text("$prepTime min", fontSize = 11.sp) },
                            leadingIcon = { Icon(Icons.Default.Timer, null, modifier = Modifier.size(14.dp)) }
                        )
                        if (isVegetarian) {
                            AssistChip(onClick = {}, label = { Text("🌱 Vegie", fontSize = 11.sp) })
                        }
                        if (isSpicy) {
                            AssistChip(onClick = {}, label = { Text("🌶️ Picante", fontSize = 11.sp) })
                        }
                    }
                }
            }
        }
    }
}
