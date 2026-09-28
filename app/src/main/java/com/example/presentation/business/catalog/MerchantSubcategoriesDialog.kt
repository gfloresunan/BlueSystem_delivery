package com.example.presentation.business.catalog

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Sell
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.repository.CategoryRepository
import com.example.domain.model.Category
import com.example.ui.theme.BluePrimary
import kotlinx.coroutines.launch

@Composable
fun MerchantSubcategoriesDialog(
    businessId: String,
    categoryRepository: CategoryRepository = remember { CategoryRepository() },
    onDismiss: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val effectiveBizId = businessId.ifBlank {
        com.example.eiam.domain.resolver.MerchantIdentityResolver.getCachedContext()?.businessId ?: ""
    }
    var subcategoriesList by remember { mutableStateOf<List<Category>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    // Estado del diálogo Crear/Editar
    var showCreateOrEditDialog by remember { mutableStateOf(false) }
    var editingSubCategory by remember { mutableStateOf<Category?>(null) }
    var subCatNameInput by remember { mutableStateOf("") }
    var subCatDescInput by remember { mutableStateOf("") }
    var subCatActiveInput by remember { mutableStateOf(true) }

    // Estado confirmación eliminar
    var subCategoryToDelete by remember { mutableStateOf<Category?>(null) }

    // Cargar Subcategorías del Comercio
    DisposableEffect(effectiveBizId) {
        val job = scope.launch {
            try {
                categoryRepository.getAllMerchantSubCategoriesFlow(effectiveBizId).collect { list ->
                    subcategoriesList = list
                    isLoading = false
                }
            } catch (e: Exception) {
                Log.e("MerchantSubcatDialog", "Error loading subcategories", e)
                isLoading = false
            }
        }
        onDispose { job.cancel() }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = true
        )
    ) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.65f))
                .imePadding(),
            contentAlignment = Alignment.Center
        ) {
            val isTablet = maxWidth > 600.dp
            val dialogWidth = if (isTablet) 600.dp else maxWidth * 0.95f
            val dialogHeight = if (isTablet) 750.dp else maxHeight * 0.88f

            Surface(
                modifier = Modifier
                    .width(dialogWidth)
                    .height(dialogHeight),
                shape = RoundedCornerShape(24.dp),
                color = Color.White,
                shadowElevation = 16.dp
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Surface(
                    color = Color(0xFFF8FAFC),
                    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(BluePrimary, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Sell, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("🏷️ Mis Subcategorías", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0F172A))
                                Text("Administra las categorías internas de tu comercio.", fontSize = 11.sp, color = Color(0xFF64748B))
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
                }

                // Sub-Barra con Botón + Nueva Subcategoría
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Subcategorías (${subcategoriesList.size})", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                    Button(
                        onClick = {
                            editingSubCategory = null
                            subCatNameInput = ""
                            subCatDescInput = ""
                            subCatActiveInput = true
                            showCreateOrEditDialog = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("+ NUEVA SUBCATEGORÍA", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                    }
                }

                // Lista de Subcategorías
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = BluePrimary)
                    } else if (subcategoriesList.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                                .background(Color(0xFFF8FAFC), RoundedCornerShape(16.dp))
                                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(16.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("No tienes subcategorías creadas. Presiona + NUEVA SUBCATEGORÍA.", fontSize = 12.sp, color = Color(0xFF64748B))
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            items(subcategoriesList) { sub ->
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = Color(0xFFF8FAFC),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFCBD5E1)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text("🌮 ${sub.name}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Surface(
                                                    shape = RoundedCornerShape(8.dp),
                                                    color = if (sub.active) Color(0xFFDCFCE7) else Color(0xFFF1F5F9)
                                                ) {
                                                    Text(
                                                        text = if (sub.active) "Activa" else "Inactiva",
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = if (sub.active) Color(0xFF166534) else Color(0xFF64748B),
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                            if (sub.description.isNotBlank()) {
                                                Text(sub.description, fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(top = 2.dp))
                                            }
                                        }

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            IconButton(
                                                onClick = {
                                                    editingSubCategory = sub
                                                    subCatNameInput = sub.name
                                                    subCatDescInput = sub.description
                                                    subCatActiveInput = sub.active
                                                    showCreateOrEditDialog = true
                                                }
                                            ) {
                                                Icon(Icons.Default.Edit, contentDescription = "Editar", tint = BluePrimary, modifier = Modifier.size(18.dp))
                                            }

                                            IconButton(
                                                onClick = {
                                                    subCategoryToDelete = sub
                                                }
                                            ) {
                                                Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                                            }

                                            TextButton(
                                                onClick = {
                                                    scope.launch {
                                                        categoryRepository.toggleMerchantSubCategoryStatus(effectiveBizId, sub.id, !sub.active)
                                                    }
                                                }
                                            ) {
                                                Text(
                                                    text = if (sub.active) "Desactivar" else "Activar",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (sub.active) Color(0xFFDC2626) else Color(0xFF16A34A)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Footer Cerrar
                Surface(
                    color = Color(0xFFF8FAFC),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.End
                    ) {
                        Button(
                            onClick = onDismiss,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF64748B)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Cerrar", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

    // Modal Confirmar Eliminación
    if (subCategoryToDelete != null) {
        AlertDialog(
            onDismissRequest = { subCategoryToDelete = null },
            containerColor = Color.White,
            titleContentColor = Color(0xFF0F172A),
            textContentColor = Color(0xFF0F172A),
            shape = RoundedCornerShape(20.dp),
            title = {
                Text(
                    text = "Eliminar Subcategoría 🗑️",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Color(0xFFEF4444)
                )
            },
            text = {
                Text(
                    text = "¿Estás seguro de que deseas eliminar la subcategoría \"${subCategoryToDelete?.name}\"? Esta acción no se puede deshacer.",
                    fontSize = 13.sp,
                    color = Color(0xFF334155)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val target = subCategoryToDelete
                        subCategoryToDelete = null
                        if (target != null) {
                            scope.launch {
                                categoryRepository.deleteMerchantSubCategory(
                                    businessId = effectiveBizId,
                                    subCategoryId = target.id
                                )
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Eliminar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { subCategoryToDelete = null }) {
                    Text("Cancelar", color = Color(0xFF64748B))
                }
            }
        )
    }

    // Modal Crear / Editar Subcategoría
    if (showCreateOrEditDialog) {
        AlertDialog(
            onDismissRequest = { showCreateOrEditDialog = false },
            containerColor = Color.White,
            titleContentColor = Color(0xFF0F172A),
            textContentColor = Color(0xFF0F172A),
            shape = RoundedCornerShape(20.dp),
            title = {
                Text(
                    text = if (editingSubCategory == null) "Nueva Subcategoría 🏷️" else "Editar Subcategoría ✏️",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = BluePrimary
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    EnterpriseOutlinedTextField(
                        value = subCatNameInput,
                        onValueChange = { subCatNameInput = it },
                        label = "Nombre de la Subcategoría",
                        placeholder = "Ej. Tacos, Bebidas, Extras",
                        singleLine = true
                    )
                    EnterpriseOutlinedTextField(
                        value = subCatDescInput,
                        onValueChange = { subCatDescInput = it },
                        label = "Descripción (Opcional)",
                        placeholder = "Ej. Tacos especiales y combos",
                        singleLine = true
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = subCatActiveInput,
                            onCheckedChange = { subCatActiveInput = it },
                            colors = CheckboxDefaults.colors(checkedColor = BluePrimary)
                        )
                        Text("Activa", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Color(0xFF0F172A))
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (subCatNameInput.isNotBlank()) {
                            scope.launch {
                                val actionName = if (editingSubCategory == null) "CREATE" else "UPDATE"
                                Log.d("SUBCATEGORY_DEBUG", "[SUBCATEGORY_DEBUG] ACTION=$actionName BUSINESS_ID=$effectiveBizId NAME=$subCatNameInput ACTIVE=$subCatActiveInput")
                                if (editingSubCategory == null) {
                                    categoryRepository.addMerchantSubCategory(
                                        businessId = effectiveBizId,
                                        name = subCatNameInput,
                                        description = subCatDescInput,
                                        active = subCatActiveInput
                                    )
                                } else {
                                    categoryRepository.updateMerchantSubCategory(
                                        businessId = effectiveBizId,
                                        subCategoryId = editingSubCategory!!.id,
                                        name = subCatNameInput,
                                        description = subCatDescInput,
                                        active = subCatActiveInput
                                    )
                                }
                                showCreateOrEditDialog = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("✓ Guardar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateOrEditDialog = false }) {
                    Text("Cancelar", color = Color(0xFF64748B))
                }
            }
        )
    }
}
