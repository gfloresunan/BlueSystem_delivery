package com.example.presentation.business.catalog

import android.util.Log
import android.net.Uri
import android.graphics.Bitmap
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.example.data.repository.ProductDraftRepository
import com.example.domain.model.Product
import com.example.domain.model.menu.MenuOptionGroup
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary
import java.io.ByteArrayOutputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EnterpriseOutlinedTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    singleLine: Boolean = false,
    minLines: Int = 1,
    isError: Boolean = false,
    errorMessage: String? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    readOnly: Boolean = false,
    trailingIcon: @Composable (() -> Unit)? = null
) {
    Column(modifier = modifier) {
        Text(
            text = label,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(bottom = 4.dp)
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = placeholder?.let { { Text(it, color = Color(0xFF64748B), fontSize = 13.sp) } },
            singleLine = singleLine,
            minLines = minLines,
            isError = isError,
            readOnly = readOnly,
            trailingIcon = trailingIcon,
            keyboardOptions = keyboardOptions,
            textStyle = LocalTextStyle.current.copy(
                color = Color(0xFF0F172A),
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp
            ),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color(0xFF0F172A),
                unfocusedTextColor = Color(0xFF0F172A),
                disabledTextColor = Color(0xFF64748B),
                focusedBorderColor = BluePrimary,
                unfocusedBorderColor = Color(0xFFCBD5E1),
                errorBorderColor = Color(0xFFDC2626),
                focusedContainerColor = Color(0xFFF8FAFC),
                unfocusedContainerColor = Color.White,
                errorContainerColor = Color(0xFFFEF2F2)
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        )
        if (isError && !errorMessage.isNullOrBlank()) {
            Text(
                text = errorMessage,
                color = Color(0xFFDC2626),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 4.dp, start = 4.dp)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductWizardEnterpriseDialog(
    product: Product? = null,
    businessId: String,
    onDismiss: () -> Unit,
    onSaveSuccess: () -> Unit,
    viewModel: ProductWizardViewModel = remember {
        ProductWizardViewModel(draftRepository = null)
    }
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(product, businessId) {
        viewModel.initWizard(product, businessId)
    }

    var showAddGroupDialog by remember { mutableStateOf(false) }
    var groupNameInput by remember { mutableStateOf("") }
    var groupRequiredInput by remember { mutableStateOf(false) }

    var showAddItemDialogForGroupId by remember { mutableStateOf<String?>(null) }
    var optionNameInput by remember { mutableStateOf("") }
    var optionPriceInput by remember { mutableStateOf("") }

    var showManageSubCategoriesDialog by remember { mutableStateOf(false) }

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { viewModel.addPhoto(it.toString()) }
    }

    Log.d("PRODUCT_FOOTER_DEBUG", """
        [PRODUCT_FOOTER_DEBUG]
        STEP                      = ${uiState.currentStep}
        IS_EDITING                = ${uiState.isEditing}
        IS_SAVING                 = ${uiState.isSaving}
        FOOTER_COMPOSABLE_ENTERED = TRUE
        BACK_BUTTON_COMPOSED      = ${uiState.currentStep > 1}
        NEXT_BUTTON_COMPOSED      = ${uiState.currentStep < 6}
        SAVE_BUTTON_COMPOSED      = ${uiState.currentStep == 6}
    """.trimIndent())

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.65f))
                .statusBarsPadding()
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 8.dp, vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            val isTablet = maxWidth > 600.dp
            val dialogWidth = if (isTablet) 640.dp else maxWidth
            val dialogHeight = if (isTablet) 800.dp else maxHeight

            Surface(
                modifier = Modifier
                    .width(dialogWidth)
                    .height(dialogHeight),
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                shadowElevation = 16.dp
            ) {
                Column(modifier = Modifier.fillMaxSize()) {

                    // ─── 1. HEADER PERMANENTE CON STEPPER DE ICONOS (FIJO) ───
                    Surface(
                        color = Color(0xFFF8FAFC),
                        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(38.dp)
                                            .background(
                                                Brush.linearGradient(listOf(BluePrimary, BlueSecondary)),
                                                RoundedCornerShape(12.dp)
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = if (uiState.isEditing) Icons.Default.Edit else Icons.Default.AddBusiness,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            if (uiState.isEditing) "Editar Producto Enterprise" else "Nuevo Producto Enterprise",
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 16.sp,
                                            color = Color(0xFF0F172A)
                                        )
                                        Text(
                                            "Paso ${uiState.currentStep} de 6 — ${
                                                when(uiState.currentStep) {
                                                    1 -> "Información General"
                                                    2 -> "Precios e Impuestos"
                                                    3 -> "Galería de Fotos"
                                                    4 -> "Variantes y Extras"
                                                    5 -> "Inventario y Disponibilidad"
                                                    else -> "Vista Previa del Cliente"
                                                }
                                            }",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = BluePrimary
                                        )
                                    }
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

                            Spacer(modifier = Modifier.height(10.dp))

                            // Stepper de 6 Pasos (Solo Iconos Profesional)
                            val stepIcons = listOf(
                                Icons.Default.Description,
                                Icons.Default.Payments,
                                Icons.Default.PhotoLibrary,
                                Icons.Default.Extension,
                                Icons.Default.Inventory2,
                                Icons.Default.Visibility
                            )

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                stepIcons.forEachIndexed { idx, icon ->
                                    val stepNum = idx + 1
                                    val isActive = stepNum == uiState.currentStep
                                    val isPassed = stepNum < uiState.currentStep

                                    Box(
                                        modifier = Modifier
                                            .size(38.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when {
                                                    isActive -> BluePrimary
                                                    isPassed -> BluePrimary.copy(alpha = 0.15f)
                                                    else -> Color(0xFFE2E8F0)
                                                }
                                            )
                                            .border(
                                                width = if (isActive) 2.dp else 1.dp,
                                                color = if (isActive) BluePrimary else if (isPassed) BluePrimary.copy(alpha = 0.5f) else Color(0xFFCBD5E1),
                                                shape = CircleShape
                                            )
                                            .clickable { viewModel.setStep(stepNum) },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = icon,
                                            contentDescription = "Paso $stepNum",
                                            tint = if (isActive) Color.White else if (isPassed) BluePrimary else Color(0xFF64748B),
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // ─── ALERTA RESTAURAR BORRADOR ───
                    if (uiState.hasDraft) {
                        Surface(
                            color = Color(0xFFFEF3C7),
                            border = BorderStroke(1.dp, Color(0xFFF59E0B)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Restore, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Borrador no guardado detectado", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF92400E))
                                }
                                Row {
                                    TextButton(onClick = { viewModel.restoreDraft() }) {
                                        Text("Restaurar", color = BluePrimary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                    }
                                    TextButton(onClick = { viewModel.discardDraft() }) {
                                        Text("Descartar", color = Color.Red, fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                    }

                    if (uiState.uploadError != null) {
                        Surface(
                            color = Color(0xFFFEF2F2),
                            border = BorderStroke(1.dp, Color(0xFFEF4444)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        uiState.uploadError ?: "Error en la operación",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF991B1B)
                                    )
                                }
                            }
                        }
                    }

                    // ─── ESTADO DE SUBIDA Y PROGRESO ───
                    if (uiState.isSaving || uiState.isUploadingPhotos) {
                        Surface(
                            color = Color(0xFFEFF6FF),
                            border = BorderStroke(1.dp, BluePrimary.copy(alpha = 0.3f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                    Text(
                                        uiState.uploadStatusMessage ?: uiState.statusMessage ?: "Guardando producto...",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = BluePrimary
                                    )
                                    if (uiState.uploadProgressPercent > 0) {
                                        Text("${uiState.uploadProgressPercent}%", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = BluePrimary)
                                    }
                                }
                                LinearProgressIndicator(
                                    progress = { if (uiState.uploadProgressPercent > 0) uiState.uploadProgressPercent / 100f else 0.5f },
                                    modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                                    color = BluePrimary,
                                    trackColor = Color(0xFFDBEAFE)
                                )
                            }
                        }
                    }

                    // ─── 2. BODY SCROLLABLE DE LOS PASOS (PESO DINÁMICO 1F) ───
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .background(Color.White)
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        when (uiState.currentStep) {
                            1 -> Step1InformationContent(
                                state = uiState,
                                viewModel = viewModel,
                                onManageSubCategoriesClick = { showManageSubCategoriesDialog = true }
                            )
                            2 -> Step2PricingContent(uiState, viewModel)
                            3 -> Step3GalleryContent(uiState, viewModel) { imagePicker.launch("image/*") }
                            4 -> Step4OptionsContent(
                                uiState = uiState,
                                viewModel = viewModel,
                                onAddGroupClick = { showAddGroupDialog = true },
                                onAddItemClick = { groupId -> showAddItemDialogForGroupId = groupId }
                            )
                            5 -> Step5InventoryContent(uiState, viewModel)
                            else -> Step6PreviewContent(
                                state = uiState,
                                viewModel = viewModel,
                                onSaveClick = {
                                    viewModel.saveProduct(context) {
                                        onSaveSuccess()
                                        onDismiss()
                                    }
                                }
                            )
                        }
                    }

                    // ─── 3. BARRA INFERIOR STICKY PERMANENTE DE NAVEGACIÓN (FIJA AL FONDO) ───
                    Surface(
                        color = Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        shape = RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (uiState.currentStep > 1) {
                                OutlinedButton(
                                    onClick = { viewModel.prevStep() },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.height(42.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF0F172A)),
                                    border = BorderStroke(1.dp, Color(0xFFCBD5E1))
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, modifier = Modifier.size(15.dp), tint = Color(0xFF0F172A))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("← Atrás", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF0F172A))
                                }
                            } else {
                                Spacer(modifier = Modifier.width(8.dp))
                            }

                            if (uiState.currentStep < 6) {
                                Button(
                                    onClick = { viewModel.nextStep() },
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                                    modifier = Modifier.height(42.dp)
                                ) {
                                    Text("Siguiente Paso ${uiState.currentStep + 1} →", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                                }
                            } else {
                                val isBusy = uiState.isSaving || uiState.isUploadingPhotos
                                Button(
                                    onClick = {
                                        if (!isBusy) {
                                            viewModel.saveProduct(context) {
                                                onSaveSuccess()
                                                onDismiss()
                                            }
                                        }
                                    },
                                    enabled = !isBusy,
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = Color(0xFF10B981),
                                        disabledContainerColor = Color(0xFF9CA3AF)
                                    ),
                                    modifier = Modifier.height(42.dp)
                                ) {
                                    if (isBusy) {
                                        CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("⏳ Guardando...", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color.White)
                                    } else {
                                        Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.White)
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = if (uiState.isEditing) "✓ Guardar Cambios" else "✓ Guardar Producto",
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 13.sp,
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ─── MODALES DEL PASO 4 (GRUPOS DE OPCIONES & EXTRAS — TEMA CLARO HIGH CONTRAST) ───
    if (showAddGroupDialog) {
        AlertDialog(
            onDismissRequest = { showAddGroupDialog = false },
            containerColor = Color.White,
            titleContentColor = Color(0xFF0F172A),
            textContentColor = Color(0xFF0F172A),
            shape = RoundedCornerShape(20.dp),
            title = { Text("🧩 Nuevo Grupo de Opciones", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BluePrimary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Ej. 'Elige tu salsa', 'Selecciona el tamaño'", fontSize = 12.sp, color = Color(0xFF64748B))
                    EnterpriseOutlinedTextField(
                        value = groupNameInput,
                        onValueChange = { groupNameInput = it },
                        label = "Nombre del Grupo",
                        placeholder = "ej. Tamaños de Pizza",
                        singleLine = true
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = groupRequiredInput,
                            onCheckedChange = { groupRequiredInput = it },
                            colors = CheckboxDefaults.colors(checkedColor = BluePrimary)
                        )
                        Text("☐ Selección Obligatoria", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color(0xFF0F172A))
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (groupNameInput.isNotBlank()) {
                            viewModel.addOptionGroup(groupNameInput, groupRequiredInput)
                            groupNameInput = ""
                            groupRequiredInput = false
                            showAddGroupDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                    shape = RoundedCornerShape(10.dp)
                ) { Text("Agregar Grupo", fontWeight = FontWeight.Bold, color = Color.White) }
            },
            dismissButton = {
                TextButton(onClick = { showAddGroupDialog = false }) { Text("Cancelar", color = Color(0xFF64748B)) }
            }
        )
    }

    if (showAddItemDialogForGroupId != null) {
        val targetId = showAddItemDialogForGroupId!!
        AlertDialog(
            onDismissRequest = { showAddItemDialogForGroupId = null },
            containerColor = Color.White,
            titleContentColor = Color(0xFF0F172A),
            textContentColor = Color(0xFF0F172A),
            shape = RoundedCornerShape(20.dp),
            title = { Text("➕ Agregar Adicional / Extra", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = BluePrimary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    EnterpriseOutlinedTextField(
                        value = optionNameInput,
                        onValueChange = { optionNameInput = it },
                        label = "Nombre de la Opción",
                        placeholder = "Ej. Tocino Extra",
                        singleLine = true
                    )
                    EnterpriseOutlinedTextField(
                        value = optionPriceInput,
                        onValueChange = { optionPriceInput = it },
                        label = "Precio Adicional (C$)",
                        placeholder = "30.00",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val p = optionPriceInput.replace(',', '.').toDoubleOrNull() ?: 0.0
                        if (optionNameInput.isNotBlank()) {
                            viewModel.addOptionItem(targetId, optionNameInput, p)
                            optionNameInput = ""
                            optionPriceInput = ""
                            showAddItemDialogForGroupId = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                    shape = RoundedCornerShape(10.dp)
                ) { Text("Agregar Opción", fontWeight = FontWeight.Bold, color = Color.White) }
            },
            dismissButton = {
                TextButton(onClick = { showAddItemDialogForGroupId = null }) { Text("Cancelar", color = Color(0xFF64748B)) }
            }
        )
    }

    // Modal Administrar Subcategorías del Comercio
    if (showManageSubCategoriesDialog) {
        MerchantSubcategoriesDialog(
            businessId = uiState.businessId,
            onDismiss = { showManageSubCategoriesDialog = false }
        )
    }
}

// ─── PASO 1: INFORMACIÓN ───
@Composable
fun Step1InformationContent(
    state: ProductWizardUiState,
    viewModel: ProductWizardViewModel,
    onManageSubCategoriesClick: () -> Unit = {}
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Información Básica del Producto 📋", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))

        EnterpriseOutlinedTextField(
            value = state.name,
            onValueChange = { viewModel.updateName(it) },
            label = "Nombre del Producto *",
            placeholder = "Ej. Hamburguesa Doble Queso",
            singleLine = true,
            isError = state.name.isBlank(),
            errorMessage = if (state.name.isBlank()) "El nombre es obligatorio" else null
        )

        EnterpriseOutlinedTextField(
            value = state.shortDescription,
            onValueChange = { viewModel.updateShortDescription(it) },
            label = "Descripción Corta (Para Cards)",
            placeholder = "Con carne 100% res, queso cheddar fundido y tocineta"
        )

        EnterpriseOutlinedTextField(
            value = state.longDescription,
            onValueChange = { viewModel.updateLongDescription(it) },
            label = "Descripción Larga / Detallada",
            placeholder = "Ingredientes completos, modo de preparación...",
            minLines = 3
        )

        var categoryExpanded by remember { mutableStateOf(false) }
        var subCategoryExpanded by remember { mutableStateOf(false) }

        // Categoría Global Admin Web
        Box(modifier = Modifier.fillMaxWidth()) {
            EnterpriseOutlinedTextField(
                value = state.categoryName.ifBlank { "Seleccionar Categoría" },
                onValueChange = {},
                readOnly = true,
                label = "Categoría Global (Admin Web) *",
                trailingIcon = {
                    IconButton(onClick = { categoryExpanded = !categoryExpanded }) {
                        Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Color(0xFF0F172A))
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { categoryExpanded = true },
                isError = state.categoryName.isBlank()
            )

            DropdownMenu(
                expanded = categoryExpanded,
                onDismissRequest = { categoryExpanded = false }
            ) {
                state.availableGlobalCategories.forEach { cat ->
                    DropdownMenuItem(
                        text = { Text(cat.name, fontWeight = FontWeight.Medium) },
                        onClick = {
                            viewModel.selectCategory(cat)
                            categoryExpanded = false
                        }
                    )
                }
            }
        }

        // Subcategoría por Comercio con diseño prominente
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFFF8FAFC), RoundedCornerShape(16.dp))
                .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(16.dp))
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text("SUBCATEGORÍA DEL COMERCIO", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = BluePrimary)

            Box(modifier = Modifier.fillMaxWidth()) {
                EnterpriseOutlinedTextField(
                    value = state.subCategoryName.ifBlank { "Seleccionar Subcategoría" },
                    onValueChange = {},
                    readOnly = true,
                    label = "Subcategoría Asignada",
                    trailingIcon = {
                        IconButton(onClick = { subCategoryExpanded = !subCategoryExpanded }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Color(0xFF0F172A))
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { subCategoryExpanded = true }
                )

                DropdownMenu(
                    expanded = subCategoryExpanded,
                    onDismissRequest = { subCategoryExpanded = false }
                ) {
                    if (state.availableSubCategories.isEmpty()) {
                        DropdownMenuItem(
                            text = { Text("Sin subcategorías en catálogo. Presiona 'Administrar'", fontSize = 12.sp, color = Color(0xFF64748B)) },
                            onClick = { subCategoryExpanded = false; onManageSubCategoriesClick() }
                        )
                    } else {
                        state.availableSubCategories.forEach { subCat ->
                            DropdownMenuItem(
                                text = { Text(subCat.name, fontWeight = FontWeight.Medium) },
                                onClick = {
                                    viewModel.selectSubCategory(subCat)
                                    subCategoryExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            // Botón ⚙ ADMINISTRAR SUBCATEGORÍAS
            Button(
                onClick = onManageSubCategoriesClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(42.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFEFF6FF),
                    contentColor = BluePrimary
                ),
                border = BorderStroke(1.5.dp, BluePrimary)
            ) {
                Icon(Icons.Default.Settings, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("⚙ ADMINISTRAR SUBCATEGORÍAS", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = BluePrimary)
            }

            // Advertencia si la subcategoría del producto no existe en el catálogo del comercio
            val isOrphanSubCategory = state.subCategoryName.isNotBlank() &&
                    state.availableSubCategories.isNotEmpty() &&
                    state.availableSubCategories.none { it.name.equals(state.subCategoryName, ignoreCase = true) || it.id == state.subCategoryId }

            if (isOrphanSubCategory) {
                Surface(
                    color = Color(0xFFFEF3C7),
                    border = BorderStroke(1.dp, Color(0xFFF59E0B)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("⚠ Subcategoría actualmente asignada", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF92400E))
                        }
                        Text(
                            "\"${state.subCategoryName}\" está asignada al producto, pero no existe actualmente en el catálogo del comercio.",
                            fontSize = 11.sp,
                            color = Color(0xFF78350F)
                        )
                        var isCreatingSubCat by remember { mutableStateOf(false) }
                        Button(
                            onClick = {
                                isCreatingSubCat = true
                                viewModel.createMissingSubCategory(state.subCategoryName) {
                                    isCreatingSubCat = false
                                }
                            },
                            enabled = !isCreatingSubCat,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            if (isCreatingSubCat) {
                                CircularProgressIndicator(modifier = Modifier.size(14.dp), color = Color.White, strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(6.dp))
                            }
                            Text("Crear como subcategoría", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }

        // Banderas Comerciales & Badges (Multiselección 6 badges)
        Text("Banderas Comerciales & Badges 🏷️", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                EnterpriseBadgeChip("🔥 Popular", state.isPopular, Color(0xFFEF4444), Modifier.weight(1f)) { viewModel.toggleIsPopular() }
                EnterpriseBadgeChip("✨ Nuevo", state.isNew, Color(0xFF10B981), Modifier.weight(1f)) { viewModel.toggleIsNew() }
                EnterpriseBadgeChip("🏆 Más Vendido", state.isTopSeller, BluePrimary, Modifier.weight(1f)) { viewModel.toggleIsTopSeller() }
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                EnterpriseBadgeChip("👍 Recomendado", state.isRecommended, Color(0xFF8B5CF6), Modifier.weight(1f)) { viewModel.toggleIsRecommended() }
                EnterpriseBadgeChip("🌿 Vegetariano", state.isVegetarian, Color(0xFF16A34A), Modifier.weight(1f)) { viewModel.toggleIsVegetarian() }
                EnterpriseBadgeChip("🌶️ Picante", state.isSpicy, Color(0xFFDC2626), Modifier.weight(1f)) { viewModel.toggleIsSpicy() }
            }
        }

        // Nivel de Picante (Segmentado 0 a 5 interactivo y compacto)
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Nivel de Picante 🌶️:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                Text(
                    text = when (state.spicyLevel) {
                        0 -> "Sin picante"
                        1 -> "Nivel 1 — Suave"
                        2 -> "Nivel 2 — Medio"
                        3 -> "Nivel 3 — Picante"
                        4 -> "Nivel 4 — Muy picante"
                        else -> "Nivel 5 — Extra picante"
                    },
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (state.spicyLevel > 0) Color(0xFFDC2626) else Color(0xFF64748B)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                val spicyLevels = listOf(
                    0 to "🚫",
                    1 to "🌶️",
                    2 to "🌶️🌶️",
                    3 to "🌶️🌶️🌶️",
                    4 to "🌶️x4",
                    5 to "🌶️x5"
                )
                spicyLevels.forEach { (lvl, label) ->
                    val isSelected = state.spicyLevel == lvl
                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .height(36.dp)
                            .clickable { viewModel.setSpicyLevel(lvl) },
                        shape = RoundedCornerShape(10.dp),
                        color = if (isSelected) BluePrimary else Color(0xFFF1F5F9),
                        border = BorderStroke(
                            width = if (isSelected) 2.dp else 1.dp,
                            color = if (isSelected) BluePrimary else Color(0xFFCBD5E1)
                        )
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = label,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Bold,
                                color = if (isSelected) Color.White else Color(0xFF0F172A)
                            )
                        }
                    }
                }
            }
        }
    }
}

// ─── PASO 2: PRECIOS ───
@Composable
fun Step2PricingContent(state: ProductWizardUiState, viewModel: ProductWizardViewModel) {
    val price = state.priceText.replace(',', '.').toDoubleOrNull() ?: 0.0
    val cost = state.estimatedCostText.replace(',', '.').toDoubleOrNull() ?: 0.0
    val margin = if (price > 0 && cost > 0) (((price - cost) / price) * 100).toInt() else 0
    val profit = if (price > 0 && cost > 0) price - cost else 0.0

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Precios, Márgenes e Impuestos 💵", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))

        Surface(
            color = Color(0xFFF8FAFC),
            border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                EnterpriseOutlinedTextField(
                    value = state.priceText,
                    onValueChange = { viewModel.updatePriceText(it) },
                    label = "Precio de Venta (C$) *",
                    placeholder = "200.00",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    isError = price <= 0,
                    errorMessage = if (price <= 0) "El precio debe ser mayor a 0" else null
                )

                EnterpriseOutlinedTextField(
                    value = state.originalPriceText,
                    onValueChange = { viewModel.updateOriginalPriceText(it) },
                    label = "Precio Anterior (C$) — Para Descuento",
                    placeholder = "250.00",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    isError = state.priceError != null,
                    errorMessage = state.priceError
                )

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    EnterpriseOutlinedTextField(
                        value = state.estimatedCostText,
                        onValueChange = { viewModel.updateEstimatedCostText(it) },
                        label = "Costo Estimado (C$)",
                        placeholder = "100.00",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                    EnterpriseOutlinedTextField(
                        value = state.taxPercentageText,
                        onValueChange = { viewModel.updateTaxPercentageText(it) },
                        label = "% ISV Impuesto",
                        placeholder = "15",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f)
                    )
                }

                if (price > 0 && cost > 0) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = Color(0xFFCBD5E1))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Margen Estimado: $margin%", fontWeight = FontWeight.Bold, color = BluePrimary)
                        Text("Ganancia Bruta: C$ ${String.format(java.util.Locale.US, "%.2f", profit)}", fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                    }
                }
            }
        }
    }
}

// ─── PASO 3: GALERÍA ───
@Composable
fun Step3GalleryContent(state: ProductWizardUiState, viewModel: ProductWizardViewModel, onSelectPhoto: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Galería Profesional 📸", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
            Button(onClick = onSelectPhoto, shape = RoundedCornerShape(12.dp)) {
                Icon(Icons.Default.AddAPhoto, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Cargar Foto")
            }
        }

        if (state.photosList.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .background(Color(0xFFF1F5F9), RoundedCornerShape(16.dp))
                    .border(1.dp, Color(0xFFCBD5E1), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Image, contentDescription = null, modifier = Modifier.size(48.dp), tint = Color(0xFF94A3B8))
                    Text("No hay fotos cargadas aún", color = Color(0xFF64748B), fontSize = 13.sp)
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(state.photosList) { idx, photo ->
                    val isCover = idx == state.coverImageIndex
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, if (isCover) BluePrimary else Color(0xFFE2E8F0))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(50.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color.Gray)
                                ) {
                                    AsyncImage(model = photo, contentDescription = null, contentScale = ContentScale.Crop)
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("Fotografía #${idx + 1}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                                    if (isCover) {
                                        Text("🌟 PORTADA DE CARD", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = BluePrimary)
                                    }
                                }
                            }
                            Row {
                                if (!isCover) {
                                    IconButton(onClick = { viewModel.setCoverImage(idx) }) {
                                        Icon(Icons.Default.StarBorder, contentDescription = null, tint = BluePrimary)
                                    }
                                }
                                IconButton(onClick = { viewModel.removePhoto(idx) }) {
                                    Icon(Icons.Default.Delete, contentDescription = null, tint = Color.Red)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── PASO 4: OPCIONES Y EXTRAS (PERSISTENCIA TOTAL) ───
@Composable
fun Step4OptionsContent(
    uiState: ProductWizardUiState,
    viewModel: ProductWizardViewModel,
    onAddGroupClick: () -> Unit,
    onAddItemClick: (String) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Variantes, Tamaños y Extras 🧩", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF0F172A))
                Text("Persistencia Real en Firestore y Motor v2.2", fontSize = 11.sp, color = BluePrimary, fontWeight = FontWeight.Bold)
            }
            Button(
                onClick = onAddGroupClick,
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                modifier = Modifier.height(36.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("+ NUEVO GRUPO", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
            }
        }

        if (uiState.optionGroups.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .background(Color(0xFFF8FAFC), RoundedCornerShape(16.dp))
                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text("Sin grupos de opciones. Presiona + NUEVO GRUPO para agregar extras.", fontSize = 12.sp, color = Color(0xFF64748B))
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(uiState.optionGroups) { group ->
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFFF8FAFC),
                        border = BorderStroke(1.dp, Color(0xFFCBD5E1))
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(group.name, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = Color(0xFF0F172A))
                                    if (group.isRequired) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("(Obligatorio)", fontSize = 10.sp, color = Color.Red, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Row {
                                    IconButton(onClick = { onAddItemClick(group.id) }) {
                                        Icon(Icons.Default.AddCircleOutline, contentDescription = null, tint = BluePrimary)
                                    }
                                    IconButton(onClick = { viewModel.removeOptionGroup(group.id) }) {
                                        Icon(Icons.Default.Delete, contentDescription = null, tint = Color.Red)
                                    }
                                }
                            }

                            if (group.options.isEmpty()) {
                                Text("Sin opciones. Agrega adicionales a este grupo.", fontSize = 11.sp, color = Color(0xFF94A3B8))
                            } else {
                                group.options.forEach { item ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("• ${item.name}", fontSize = 13.sp, color = Color(0xFF0F172A))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(if (item.additionalPrice > 0) "+C$ ${item.additionalPrice.toInt()}" else "Gratis", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Icon(
                                                Icons.Default.Close,
                                                contentDescription = null,
                                                modifier = Modifier.size(14.dp).clickable { viewModel.removeOptionItem(group.id, item.id) },
                                                tint = Color.Gray
                                            )
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
}

// ─── PASO 5: INVENTARIO ───
@Composable
fun Step5InventoryContent(state: ProductWizardUiState, viewModel: ProductWizardViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Control de Stock y Disponibilidad 📦", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color(0xFFF8FAFC),
            border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Producto Disponible para Venta", fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                    Switch(checked = state.isAvailable, onCheckedChange = { viewModel.updateIsAvailable(it) })
                }

                EnterpriseOutlinedTextField(
                    value = state.stockQuantityText,
                    onValueChange = { viewModel.updateStockQuantityText(it) },
                    label = "Cantidad en Stock (Vacío = Ilimitado)",
                    placeholder = "ej. 25",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                EnterpriseOutlinedTextField(
                    value = state.minStockAlertText,
                    onValueChange = { viewModel.updateMinStockAlertText(it) },
                    label = "Alerta de Stock Mínimo",
                    placeholder = "ej. 5",
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Ocultar automáticamente si stock = 0", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color(0xFF0F172A))
                    Checkbox(checked = state.autoHideOnZeroStock, onCheckedChange = { viewModel.toggleAutoHideOnZeroStock() })
                }
            }
        }
    }
}

// ─── PASO 6: VISTA PREVIA (LIVE CARD ESPEJO CON BADGES Y SCROLL) ───
@Composable
fun Step6PreviewContent(
    state: ProductWizardUiState,
    viewModel: ProductWizardViewModel,
    onSaveClick: (() -> Unit)? = null
) {
    val price = state.priceText.replace(',', '.').toDoubleOrNull() ?: 0.0
    val origPrice = state.originalPriceText.replace(',', '.').toDoubleOrNull()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Vista Previa del Cliente (Live Card Espejo) 📱", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF0F172A))
            FilterChip(
                selected = state.previewDarkMode,
                onClick = { viewModel.togglePreviewDarkMode() },
                label = { Text(if (state.previewDarkMode) "🌙 Oscuro" else "☀️ Claro") }
            )
        }

        Surface(
            shape = RoundedCornerShape(20.dp),
            color = if (state.previewDarkMode) Color(0xFF0F172A) else Color.White,
            shadowElevation = 8.dp,
            border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFFE2E8F0))
                ) {
                    val coverPhoto = state.photosList.getOrNull(state.coverImageIndex) ?: state.photosList.firstOrNull()
                    if (coverPhoto != null) {
                        AsyncImage(model = coverPhoto, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    }

                    // Renderizado de todos los Badges sobre la foto
                    Column(
                        modifier = Modifier
                            .padding(8.dp)
                            .align(Alignment.TopStart),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            if (state.isPopular) LiveCardBadgeTag("🔥 POPULAR", Color(0xFFEF4444))
                            if (state.isNew) LiveCardBadgeTag("✨ NUEVO", Color(0xFF10B981))
                            if (state.isTopSeller) LiveCardBadgeTag("🏆 TOP VENTAS", BluePrimary)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            if (state.isRecommended) LiveCardBadgeTag("👍 RECOMENDADO", Color(0xFF8B5CF6))
                            if (state.isVegetarian) LiveCardBadgeTag("🌿 VEG", Color(0xFF16A34A))
                            if (state.spicyLevel > 0 || state.isSpicy) {
                                LiveCardBadgeTag("🌶️ ${if (state.spicyLevel > 0) "Nv.${state.spicyLevel}" else "Picante"}", Color(0xFFDC2626))
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    state.name.ifBlank { "Nombre del Producto" },
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 16.sp,
                    color = if (state.previewDarkMode) Color.White else Color(0xFF0F172A)
                )
                Text(
                    state.shortDescription.ifBlank { "Descripción rápida del platillo..." },
                    fontSize = 12.sp,
                    color = if (state.previewDarkMode) Color(0xFF94A3B8) else Color(0xFF64748B),
                    maxLines = 2
                )

                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("C$ ${String.format(java.util.Locale.US, "%.2f", price)}", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = BluePrimary)
                    if (origPrice != null && origPrice > price) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "C$ ${String.format(java.util.Locale.US, "%.2f", origPrice)}",
                            fontSize = 13.sp,
                            color = Color.Gray,
                            textDecoration = TextDecoration.LineThrough
                        )
                    }
                }

                if (state.optionGroups.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Extras configurados: ${state.optionGroups.size} grupo(s)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                }
            }
        }

        // ─── BOTÓN PROMINENTE DE GUARDADO DENTRO DE LA VISTA PREVIA ───
        Spacer(modifier = Modifier.height(12.dp))
        val isBusy = state.isSaving || state.isUploadingPhotos
        Button(
            onClick = {
                if (!isBusy) {
                    onSaveClick?.invoke()
                }
            },
            enabled = !isBusy,
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF10B981),
                disabledContainerColor = Color(0xFF9CA3AF)
            ),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            if (isBusy) {
                CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                Spacer(modifier = Modifier.width(8.dp))
                Text("⏳ Guardando...", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
            } else {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.White)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = if (state.isEditing) "✓ Guardar Cambios" else "✓ Guardar Producto",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 15.sp,
                    color = Color.White
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}

// ─── COMPOSABLES AUXILIARES DE BADGES Y CHIPS ───
@Composable
fun EnterpriseBadgeChip(
    text: String,
    isSelected: Boolean,
    activeColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .height(34.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) activeColor else Color(0xFFF1F5F9),
        border = BorderStroke(
            width = if (isSelected) 1.5.dp else 1.dp,
            color = if (isSelected) activeColor else Color(0xFFCBD5E1)
        )
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 4.dp)) {
            Text(
                text = text,
                fontSize = 11.sp,
                fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium,
                color = if (isSelected) Color.White else Color(0xFF0F172A),
                maxLines = 1
            )
        }
    }
}

@Composable
fun LiveCardBadgeTag(text: String, color: Color) {
    Surface(
        color = color,
        shape = RoundedCornerShape(6.dp),
        shadowElevation = 2.dp
    ) {
        Text(
            text = text,
            fontSize = 9.sp,
            color = Color.White,
            fontWeight = FontWeight.ExtraBold,
            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
        )
    }
}
