package com.example.presentation.business.catalog

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.example.domain.model.Product
import com.example.domain.model.ProductCategory
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary
import java.io.ByteArrayOutputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductDialog(
    product: Product?,
    onDismiss: () -> Unit,
    onSave: (Product, ByteArray?) -> Unit,
    isSaving: Boolean
) {
    val context = LocalContext.current
    val isEditing = product != null

    // Estados del formulario
    var name by remember { mutableStateOf(product?.name ?: "") }
    var description by remember { mutableStateOf(product?.description ?: "") }
    var price by remember { mutableStateOf(product?.price?.let { if (it > 0) String.format("%.2f", it) else "" } ?: "") }
    var originalPrice by remember { mutableStateOf(product?.originalPrice?.let { String.format("%.2f", it) } ?: "") }
    var selectedCategory by remember { mutableStateOf(product?.category ?: ProductCategory.MAIN_COURSE) }
    var prepTime by remember { mutableStateOf(product?.preparationTimeMinutes?.toString() ?: "15") }
    var isPopular by remember { mutableStateOf(product?.isPopular ?: false) }
    var isVegetarian by remember { mutableStateOf(product?.isVegetarian ?: false) }
    var isSpicy by remember { mutableStateOf(product?.isSpicy ?: false) }
    var stock by remember { mutableStateOf(product?.stockQuantity?.toString() ?: "") }

    // Imagen
    var selectedImageBytes by remember { mutableStateOf<ByteArray?>(null) }
    var selectedImageBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var showImageSourceDialog by remember { mutableStateOf(false) }

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            context.contentResolver.openInputStream(it)?.use { stream ->
                val bytes = stream.readBytes()
                selectedImageBytes = compressImage(bytes)
                selectedImageBitmap = BitmapFactory.decodeByteArray(selectedImageBytes, 0, selectedImageBytes!!.size)
            }
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        bitmap?.let {
            val output = ByteArrayOutputStream()
            it.compress(Bitmap.CompressFormat.JPEG, 80, output)
            val bytes = output.toByteArray()
            selectedImageBytes = bytes
            selectedImageBitmap = it
        }
    }

    if (showImageSourceDialog) {
        AlertDialog(
            onDismissRequest = { showImageSourceDialog = false },
            title = { Text("Seleccionar Imagen del Producto 📸", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Elige el origen para la foto:", fontSize = 14.sp, color = Color(0xFF64748B))
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                showImageSourceDialog = false
                                cameraLauncher.launch(null)
                            },
                        shape = RoundedCornerShape(12.dp),
                        color = BluePrimary.copy(alpha = 0.08f),
                        border = BorderStroke(1.dp, BluePrimary.copy(alpha = 0.2f))
                    ) {
                        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PhotoCamera, contentDescription = null, tint = BluePrimary)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("📸 Tomar Foto con Cámara", fontWeight = FontWeight.Bold)
                        }
                    }

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                showImageSourceDialog = false
                                imagePicker.launch("image/*")
                            },
                        shape = RoundedCornerShape(12.dp),
                        color = BlueSecondary.copy(alpha = 0.08f),
                        border = BorderStroke(1.dp, BlueSecondary.copy(alpha = 0.2f))
                    ) {
                        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = BlueSecondary)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("🖼️ Elegir de Galería", fontWeight = FontWeight.Bold)
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

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = true)
    ) {
        BoxWithConstraints(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            val isTablet = maxWidth > 600.dp
            val dialogWidth = if (isTablet) 600.dp else maxWidth * 0.94f

            Surface(
                modifier = Modifier
                    .width(dialogWidth)
                    .fillMaxHeight(0.9f)
                    .padding(vertical = 12.dp),
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                shadowElevation = 16.dp
            ) {
                Column(modifier = Modifier.fillMaxSize()) {

                    // ─── HEADER ───
                    Surface(
                        color = Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp, vertical = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = if (isEditing) Icons.Default.Edit else Icons.Default.AddBox,
                                    contentDescription = null,
                                    tint = BluePrimary,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    if (isEditing) "Editar Producto" else "Nuevo Producto Rápido",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp,
                                    color = Color(0xFF0F172A)
                                )
                            }
                            IconButton(
                                onClick = onDismiss,
                                modifier = Modifier
                                    .size(32.dp)
                                    .background(Color(0xFFE2E8F0), CircleShape)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color(0xFF475569), modifier = Modifier.size(16.dp))
                            }
                        }
                    }

                    HorizontalDivider(color = Color(0xFFE2E8F0))

                    // ─── FORMULARIO ESCROLABLE ───
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                            .padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Selección de imagen
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Color(0xFFF8FAFC))
                                    .border(1.5.dp, Color(0xFFCBD5E1), RoundedCornerShape(16.dp))
                                    .clickable { showImageSourceDialog = true },
                                contentAlignment = Alignment.Center
                            ) {
                                when {
                                    selectedImageBitmap != null -> {
                                        Image(
                                            bitmap = selectedImageBitmap!!.asImageBitmap(),
                                            contentDescription = null,
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Crop
                                        )
                                    }
                                    product?.imageUrl?.isNotBlank() == true -> {
                                        AsyncImage(
                                            model = product.imageUrl,
                                            contentDescription = null,
                                            modifier = Modifier.fillMaxSize(),
                                            contentScale = ContentScale.Crop
                                        )
                                    }
                                    else -> {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(Icons.Default.AddAPhoto, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(36.dp))
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Text("Toca para agregar foto del platillo", fontSize = 12.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium)
                                        }
                                    }
                                }
                            }
                        }

                        // Campos principales
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("Nombre del Producto *", fontWeight = FontWeight.Medium) },
                            placeholder = { Text("Ej. Combo Pollo Crujiente") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp)
                        )

                        OutlinedTextField(
                            value = description,
                            onValueChange = { description = it },
                            label = { Text("Descripción", fontWeight = FontWeight.Medium) },
                            placeholder = { Text("Detalles e ingredientes del platillo...") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2,
                            maxLines = 4,
                            shape = RoundedCornerShape(12.dp)
                        )

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = price,
                                onValueChange = { price = it },
                                label = { Text("Precio (C$) *", fontWeight = FontWeight.Bold) },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                                shape = RoundedCornerShape(12.dp),
                                leadingIcon = { Text("C$", fontWeight = FontWeight.Bold, color = BluePrimary) }
                            )

                            OutlinedTextField(
                                value = originalPrice,
                                onValueChange = { originalPrice = it },
                                label = { Text("Precio Anter.", fontWeight = FontWeight.Medium) },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                                shape = RoundedCornerShape(12.dp)
                            )
                        }

                        // Categorías
                        Text("Categoría del Menú", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(ProductCategory.values()) { cat ->
                                FilterChip(
                                    selected = selectedCategory == cat,
                                    onClick = { selectedCategory = cat },
                                    label = { Text(getDisplayName(cat), fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = BluePrimary,
                                        selectedLabelColor = Color.White
                                    ),
                                    shape = RoundedCornerShape(20.dp)
                                )
                            }
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = prepTime,
                                onValueChange = { prepTime = it },
                                label = { Text("Tiempo Prep. (min)", fontWeight = FontWeight.Medium) },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                shape = RoundedCornerShape(12.dp)
                            )

                            OutlinedTextField(
                                value = stock,
                                onValueChange = { stock = it },
                                label = { Text("Stock (Opcional)", fontWeight = FontWeight.Medium) },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                shape = RoundedCornerShape(12.dp)
                            )
                        }

                        HorizontalDivider(color = Color(0xFFF1F5F9))

                        // Switches
                        SwitchItem(checked = isPopular, onCheckedChange = { isPopular = it }, title = "Popular / Destacado ⭐", description = "Destaca en el inicio del catálogo")
                        SwitchItem(checked = isVegetarian, onCheckedChange = { isVegetarian = it }, title = "Apto para Vegetarianos 🌱", description = "Muestra la etiqueta verde")
                        SwitchItem(checked = isSpicy, onCheckedChange = { isSpicy = it }, title = "Platillo Picante 🌶️", description = "Muestra ícono de picante")
                    }

                    // ─── STICKY FOOTER PERMANENTE ───
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
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedButton(
                                onClick = onDismiss,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp),
                                shape = RoundedCornerShape(14.dp)
                            ) {
                                Text("Cancelar", color = Color(0xFF64748B), fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = {
                                    val newProduct = Product(
                                        id = product?.id ?: "",
                                        businessId = product?.businessId ?: "",
                                        name = name.trim(),
                                        description = description.trim(),
                                        price = price.toDoubleOrNull() ?: 0.0,
                                        originalPrice = originalPrice.toDoubleOrNull(),
                                        category = selectedCategory,
                                        preparationTimeMinutes = prepTime.toIntOrNull() ?: 15,
                                        isPopular = isPopular,
                                        isVegetarian = isVegetarian,
                                        isSpicy = isSpicy,
                                        stockQuantity = stock.toIntOrNull()
                                    )
                                    onSave(newProduct, selectedImageBytes)
                                },
                                modifier = Modifier
                                    .weight(1.5f)
                                    .height(48.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                                enabled = name.isNotBlank() && price.isNotBlank() && !isSaving
                            ) {
                                if (isSaving) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                } else {
                                    Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(if (isEditing) "Guardar Cambios" else "Crear Producto", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SwitchItem(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    title: String,
    description: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
            Text(description, fontSize = 11.sp, color = Color(0xFF64748B))
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange, colors = SwitchDefaults.colors(checkedThumbColor = BluePrimary))
    }
}

private fun compressImage(bytes: ByteArray): ByteArray {
    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    val output = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, 80, output)
    return output.toByteArray()
}

fun getDisplayName(category: ProductCategory): String = when (category) {
    ProductCategory.MAIN_COURSE -> "Platos Principales"
    ProductCategory.APPETIZER -> "Entradas"
    ProductCategory.DESSERT -> "Postres"
    ProductCategory.BEVERAGE -> "Bebidas"
    ProductCategory.COMBO -> "Combos"
    ProductCategory.SPECIAL -> "Especiales"
    else -> "General"
}
