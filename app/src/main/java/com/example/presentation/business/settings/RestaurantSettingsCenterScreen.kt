package com.example.presentation.business.settings

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.model.settings.AuditLogEntry
import com.example.domain.model.settings.RestaurantSettings
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary

val rscBg = Color(0xFFF8FAFC)
val rscDark = Color(0xFF0F172A)
val rscGreen = Color(0xFF10B981)
val rscBlue = Color(0xFF2563EB)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RestaurantSettingsCenterScreen(
    restaurantId: String,
    onBack: () -> Unit,
    onOpenFinance: (() -> Unit)? = null,
    viewModel: RestaurantSettingsViewModel = remember { RestaurantSettingsViewModel() }
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(restaurantId) {
        viewModel.startSettingsCenter(restaurantId)
    }

    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg, duration = SnackbarDuration.Short)
            viewModel.clearFeedbackMessages()
        }
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let { err ->
            snackbarHostState.showSnackbar(err, duration = SnackbarDuration.Long)
            viewModel.clearFeedbackMessages()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = rscBg
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = BluePrimary)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "Cargando Mi Negocio...",
                            fontSize = 13.sp,
                            color = Color.Gray,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            } else {
                Column(modifier = Modifier.fillMaxSize()) {

                    // ─── 1. SMART HEADER MODERNO ───
                    RscSmartHeader(
                        settings = uiState.settings,
                        onBack = onBack,
                        onOpenWizard = { viewModel.openSetupWizard() },
                        onExport = { viewModel.exportConfiguration() }
                    )

                    // ─── 2. WIDGETS DE SALUD & HISTORIAL ───
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        RscRestaurantHealthWidget(
                            settings = uiState.settings,
                            modifier = Modifier.weight(1.1f)
                        )
                        RscChangeHistoryWidget(
                            history = uiState.settings.changeHistory,
                            modifier = Modifier.weight(0.9f)
                        )
                    }

                    // ─── 3. LISTA DE LAS 3 CATEGORÍAS ACTIVAS (RESPONSIVE & FULL-WIDTH) ───
                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(bottom = 24.dp)
                    ) {
                        if (onOpenFinance != null) {
                            item(key = "rsc_finance_tile") {
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = Color.White,
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    shadowElevation = 2.dp,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { onOpenFinance() }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                            Surface(
                                                shape = CircleShape,
                                                color = Color(0xFFEFF6FF),
                                                modifier = Modifier.size(42.dp)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Icon(
                                                        Icons.Default.AccountBalance,
                                                        contentDescription = null,
                                                        tint = Color(0xFF2563EB),
                                                        modifier = Modifier.size(22.dp)
                                                    )
                                                }
                                            }
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Column {
                                                Text(
                                                    "Centro Financiero",
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFF0F172A)
                                                )
                                                Spacer(modifier = Modifier.height(2.dp))
                                                Text(
                                                    "Ventas reales, comisiones, pagos y liquidaciones",
                                                    fontSize = 11.sp,
                                                    color = Color(0xFF64748B),
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }
                                        Icon(
                                            Icons.Default.ChevronRight,
                                            contentDescription = null,
                                            tint = Color(0xFF94A3B8),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }
                        }

                        items(SettingsCategory.values()) { category ->
                            RscCategoryCard(
                                category = category,
                                settings = uiState.settings,
                                onClick = { viewModel.selectCategory(category) }
                            )
                        }
                    }
                }
            }

            // ─── 4. DIALOG MODULAR DE EDICIÓN PARA LAS 3 CATEGORÍAS ───
            if (uiState.isDrawerEditorOpen) {
                RscCategoryEditorDialog(
                    category = uiState.selectedCategory,
                    settings = uiState.settings,
                    isSaving = uiState.isSaving,
                    onClose = { viewModel.closeDrawerEditor() },
                    onSave = { updatedSettings ->
                        viewModel.saveSettings(updatedSettings)
                    }
                )
            }

            // ─── 5. RESTAURANT SETUP WIZARD DIALOG ───
            if (uiState.isSetupWizardOpen) {
                RestaurantSetupWizardDialog(
                    step = uiState.setupWizardStep,
                    settings = uiState.settings,
                    onDismiss = { viewModel.closeSetupWizard() },
                    onNext = { viewModel.nextWizardStep() },
                    onPrev = { viewModel.prevWizardStep() },
                    onFinish = {
                        viewModel.closeSetupWizard()
                        viewModel.saveSettings()
                    }
                )
            }

            // ─── 6. MODAL EXPORTACIÓN CONFIGURACIÓN JSON ───
            if (uiState.exportedJsonString != null) {
                AlertDialog(
                    onDismissRequest = { viewModel.closeExportDialog() },
                    title = {
                        Text(
                            "Configuración Exportada (JSON) 💾",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                    },
                    text = {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 300.dp)
                                .verticalScroll(rememberScrollState())
                        ) {
                            Text(
                                uiState.exportedJsonString!!,
                                fontSize = 11.sp,
                                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                color = rscDark
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = { viewModel.closeExportDialog() },
                            colors = ButtonDefaults.buttonColors(containerColor = BluePrimary)
                        ) {
                            Text("Cerrar")
                        }
                    }
                )
            }
        }
    }
}

// ─── SMART HEADER DEL RSC ───
@Composable
fun RscSmartHeader(
    settings: RestaurantSettings,
    onBack: () -> Unit,
    onOpenWizard: () -> Unit,
    onExport: () -> Unit
) {
    val score = settings.readiness.readinessScorePercent

    Surface(
        color = Color.White,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .background(
                                Brush.linearGradient(listOf(BluePrimary, BlueSecondary)),
                                RoundedCornerShape(10.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Storefront,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f, fill = false)) {
                        Text(
                            "Mi Negocio",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 16.sp,
                            color = rscDark
                        )
                        Text(
                            settings.commercialName.ifBlank { "Configuración del Comercio" },
                            fontSize = 12.sp,
                            color = Color(0xFF64748B),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                // Badge de Readiness Horizontal Fijo (Sin wrapping vertical)
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFDCFCE7),
                    border = BorderStroke(1.dp, Color(0xFF10B981)),
                    modifier = Modifier.padding(start = 8.dp)
                ) {
                    Text(
                        text = "Readiness $score%",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF15803D),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        softWrap = false,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

// ─── TARJETA RESPONSIVE DE CATEGORÍA DE CONFIGURACIÓN ───
@Composable
fun RscCategoryCard(
    category: SettingsCategory,
    settings: RestaurantSettings,
    onClick: () -> Unit
) {
    val subtitleText = when (category) {
        SettingsCategory.RESTAURANT -> {
            val phone = settings.phone.ifBlank { "Sin teléfono" }
            val cat = settings.category.ifBlank { "Comercio" }
            "${settings.commercialName.ifBlank { "Nombre no configurado" }} • $cat • 📞 $phone"
        }
        SettingsCategory.BRANCHES -> {
            settings.address.ifBlank { "Dirección de sucursal matriz no configurada" }
        }
        SettingsCategory.SCHEDULE -> {
            val status = if (settings.isOpen) "Abierto Ahora 🟢" else "Cerrado Temporalmente 🔴"
            val sched = settings.scheduleText.ifBlank { "Horario estándar" }
            "$status • $sched"
        }
    }

    val iconVector = when (category) {
        SettingsCategory.RESTAURANT -> Icons.Default.Storefront
        SettingsCategory.BRANCHES -> Icons.Default.Place
        SettingsCategory.SCHEDULE -> Icons.Default.Schedule
    }

    val iconColor = when (category) {
        SettingsCategory.RESTAURANT -> Color(0xFF2563EB)
        SettingsCategory.BRANCHES -> Color(0xFFEA580C)
        SettingsCategory.SCHEDULE -> Color(0xFF10B981)
    }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(iconColor.copy(alpha = 0.12f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    iconVector,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    category.title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = rscDark,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    subtitleText,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = BluePrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    category.description,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = "Editar",
                tint = Color(0xFF94A3B8),
                modifier = Modifier.size(22.dp)
            )
        }
    }
}

// ─── WIDGET RESTAURANT HEALTH (SALUD DE CONFIGURACIÓN Y READINESS) ───
@Composable
fun RscRestaurantHealthWidget(settings: RestaurantSettings, modifier: Modifier = Modifier) {
    val score = settings.readiness.readinessScorePercent
    val completed = settings.readiness.items.filter { it.isCompleted }
    val pending = settings.readiness.items.filter { !it.isCompleted }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        shadowElevation = 2.dp,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Salud del Negocio 🟢",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = rscDark,
                    maxLines = 1
                )
                Text(
                    "$score%",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 13.sp,
                    color = if (score >= 80) rscGreen else Color(0xFFF59E0B),
                    softWrap = false
                )
            }

            if (completed.isNotEmpty()) {
                Text(
                    "✔ ${completed.take(3).joinToString { it.title.split(" ").first() }}",
                    fontSize = 10.sp,
                    color = Color(0xFF10B981),
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (pending.isNotEmpty()) {
                Text(
                    "⚠ Falta: ${pending.joinToString { it.title.split(" ").first() }}",
                    fontSize = 10.sp,
                    color = Color(0xFFF59E0B),
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            } else {
                Text(
                    "✔ Configuración Completa",
                    fontSize = 10.sp,
                    color = Color(0xFF10B981),
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

// ─── WIDGET CHANGE HISTORY (HISTORIAL DE CAMBIOS AUDITABLES) ───
@Composable
fun RscChangeHistoryWidget(history: List<AuditLogEntry>, modifier: Modifier = Modifier) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        shadowElevation = 2.dp,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                "Audit Trail ⏱️",
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = rscDark
            )

            if (history.isEmpty()) {
                Text("Sin cambios recientes", fontSize = 10.sp, color = Color.Gray)
            } else {
                history.take(2).forEach { item ->
                    Column {
                        Text(
                            "${item.userName.ifBlank { "Comercio" }} • ${item.timeAgo}",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF64748B)
                        )
                        Text(
                            "${item.action}: ${item.detail}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = rscDark,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

// ─── DIALOG MODULAR DE EDICIÓN PARA LAS 3 CATEGORÍAS ───
@Composable
fun RscCategoryEditorDialog(
    category: SettingsCategory,
    settings: RestaurantSettings,
    isSaving: Boolean,
    onClose: () -> Unit,
    onSave: (RestaurantSettings) -> Unit
) {
    // Local form state cloned from current settings with category & settings as key
    var commercialName by remember(category, settings) { mutableStateOf(settings.commercialName) }
    var legalName by remember(category, settings) { mutableStateOf(settings.legalName) }
    var phone by remember(category, settings) { mutableStateOf(settings.phone) }
    var whatsapp by remember(category, settings) { mutableStateOf(settings.whatsapp) }
    var address by remember(category, settings) { mutableStateOf(settings.address) }
    var businessCategory by remember(category, settings) { mutableStateOf(settings.category) }

    var scheduleText by remember(category, settings) { mutableStateOf(settings.scheduleText) }
    var isOpen by remember(category, settings) { mutableStateOf(settings.isOpen) }

    AlertDialog(
        onDismissRequest = { if (!isSaving) onClose() },
        title = {
            Column {
                Text(
                    category.title,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 16.sp,
                    color = rscDark
                )
                Text(
                    category.description,
                    fontSize = 11.sp,
                    color = Color(0xFF64748B)
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 380.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                when (category) {
                    SettingsCategory.RESTAURANT -> {
                        OutlinedTextField(
                            value = commercialName,
                            onValueChange = { commercialName = it },
                            label = { Text("Nombre Comercial") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = legalName,
                            onValueChange = { legalName = it },
                            label = { Text("Razón Social") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { phone = it },
                            label = { Text("Teléfono de Contacto") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = whatsapp,
                            onValueChange = { whatsapp = it },
                            label = { Text("WhatsApp de Pedidos") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = address,
                            onValueChange = { address = it },
                            label = { Text("Dirección Física") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = businessCategory,
                            onValueChange = { businessCategory = it },
                            label = { Text("Categoría (ej: Comida Rápida, Farmacia)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    SettingsCategory.BRANCHES -> {
                        OutlinedTextField(
                            value = address,
                            onValueChange = { address = it },
                            label = { Text("Dirección de Sucursal Matriz") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { phone = it },
                            label = { Text("Teléfono Operativo de Sucursal") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            "Nota: La gestión de sucursales sincroniza inventario y catálogo centralizado.",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B)
                        )
                    }

                    SettingsCategory.SCHEDULE -> {
                        OutlinedTextField(
                            value = scheduleText,
                            onValueChange = { scheduleText = it },
                            label = { Text("Horario de Atención (ej: 08:00 AM - 10:00 PM)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isOpen) Color(0xFFF0FDF4) else Color(0xFFFEF2F2),
                            border = BorderStroke(1.dp, if (isOpen) Color(0xFFBBF7D0) else Color(0xFFFECACA)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        if (isOpen) "Comercio Abierto 🟢" else "Comercio Pausado 🔴",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = if (isOpen) Color(0xFF15803D) else Color(0xFFB91C1C)
                                    )
                                    Text(
                                        if (isOpen) "Recibiendo pedidos en vivo" else "Los clientes verán la tienda cerrada",
                                        fontSize = 10.sp,
                                        color = Color(0xFF64748B)
                                    )
                                }
                                Switch(
                                    checked = isOpen,
                                    onCheckedChange = { isOpen = it }
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val updated = settings.copy(
                        commercialName = commercialName,
                        legalName = legalName,
                        phone = phone,
                        whatsapp = whatsapp,
                        address = address,
                        category = businessCategory,
                        scheduleText = scheduleText,
                        isOpen = isOpen
                    )
                    onSave(updated)
                },
                enabled = !isSaving,
                colors = ButtonDefaults.buttonColors(containerColor = rscGreen)
            ) {
                if (isSaving) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Text("Guardar Cambios ✔", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(
                onClick = onClose,
                enabled = !isSaving
            ) {
                Text("Cancelar")
            }
        }
    )
}
