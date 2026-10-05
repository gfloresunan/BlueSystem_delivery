package com.example.presentation.admin

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BluePrimary
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class AdminBusinessModel(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val category: String = "Restaurante",
    val phone: String = "",
    val email: String = "",
    val city: String = "Managua",
    val address: String = "",
    val isActive: Boolean = true,
    val isOpen: Boolean = true,
    val logoUrl: String = "",
    val branchesCount: Int = 1,
    val rating: Double = 5.0
)

/**
 * MÓDULO 8: Gestión Enterprise de Comercios & Sucursales (AdminEnterpriseCommerceScreen).
 *
 * Administra el catálogo comercial y red de sucursales (/businesses y /branches):
 * - Consulta de estado operativo (Abierto/Cerrado, Activo/Suspendido).
 * - Supervisión de datos empresariales, dirección y categorización.
 * - Activación / Suspensión administrativa con auditoría inmutable.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminEnterpriseCommerceScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }
    val currentAdminUid = auth.currentUser?.uid ?: "admin"

    var businesses by remember { mutableStateOf<List<AdminBusinessModel>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategoryFilter by remember { mutableStateOf("ALL") }
    var selectedBusinessForDetail by remember { mutableStateOf<AdminBusinessModel?>(null) }

    DisposableEffect(Unit) {
        val listener = db.collection("businesses")
            .limit(100)
            .addSnapshotListener { snapshot, error ->
                isLoading = false
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val data = doc.data ?: return@mapNotNull null
                        AdminBusinessModel(
                            id = doc.id,
                            name = data["name"] as? String ?: data["nombre"] as? String ?: "Comercio",
                            description = data["description"] as? String ?: data["descripcion"] as? String ?: "",
                            category = data["category"] as? String ?: data["categoria"] as? String ?: "Restaurante",
                            phone = data["phone"] as? String ?: data["telefono"] as? String ?: "",
                            email = data["email"] as? String ?: data["correo"] as? String ?: "",
                            city = data["city"] as? String ?: data["ciudad"] as? String ?: "Managua",
                            address = data["address"] as? String ?: data["direccion"] as? String ?: "",
                            isActive = (data["isActive"] as? Boolean) ?: (data["active"] as? Boolean) ?: true,
                            isOpen = (data["isOpen"] as? Boolean) ?: (data["abierto"] as? Boolean) ?: true,
                            logoUrl = data["logoUrl"] as? String ?: data["photoUrl"] as? String ?: "",
                            rating = (data["rating"] as? Number)?.toDouble() ?: 5.0
                        )
                    }
                    businesses = list
                }
            }

        onDispose { listener.remove() }
    }

    val filteredBusinesses = remember(businesses, searchQuery, selectedCategoryFilter) {
        businesses.filter { b ->
            val matchQuery = searchQuery.isBlank() ||
                    b.name.contains(searchQuery, ignoreCase = true) ||
                    b.phone.contains(searchQuery, ignoreCase = true) ||
                    b.id.contains(searchQuery, ignoreCase = true)

            val matchCategory = if (selectedCategoryFilter == "ALL") true else b.category.equals(selectedCategoryFilter, ignoreCase = true)

            matchQuery && matchCategory
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Comercios & Sucursales", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Directorio comercial multi-tenant", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BluePrimary)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC))
        ) {
            // Buscador
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar comercio por nombre o ID...", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(18.dp)) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = Color.White,
                    focusedContainerColor = Color.White,
                    unfocusedBorderColor = Color(0xFFE2E8F0)
                )
            )

            // Categorías
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedCategoryFilter == "ALL",
                        onClick = { selectedCategoryFilter = "ALL" },
                        label = { Text("Todos (${businesses.size})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedCategoryFilter == "Restaurante",
                        onClick = { selectedCategoryFilter = "Restaurante" },
                        label = { Text("Restaurantes", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedCategoryFilter == "Supermercado",
                        onClick = { selectedCategoryFilter = "Supermercado" },
                        label = { Text("Supermercados", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedCategoryFilter == "Farmacia",
                        onClick = { selectedCategoryFilter = "Farmacia" },
                        label = { Text("Farmacias", fontSize = 11.sp) }
                    )
                }
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BluePrimary)
                }
            } else if (filteredBusinesses.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Storefront, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        Text("No se encontraron comercios", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredBusinesses, key = { it.id }) { business ->
                        AdminBusinessCard(
                            business = business,
                            onToggleActive = {
                                coroutineScope.launch {
                                    try {
                                        val newActive = !business.isActive
                                        db.collection("businesses").document(business.id).update("isActive", newActive).await()

                                        db.collection("audit_events").add(
                                            mapOf(
                                                "actorUid" to currentAdminUid,
                                                "actorRole" to "ADMIN",
                                                "action" to if (newActive) "ADMIN_ACTIVATE_BUSINESS" else "ADMIN_SUSPEND_BUSINESS",
                                                "module" to "ENTERPRISE_COMMERCE",
                                                "targetType" to "business",
                                                "targetId" to business.id,
                                                "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            )
                                        ).await()

                                        Toast.makeText(context, if (newActive) "Comercio reactivado" else "Comercio suspendido", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                                    }
                                }
                            },
                            onViewDetail = { selectedBusinessForDetail = business }
                        )
                    }
                }
            }
        }
    }

    // Modal de detalle
    selectedBusinessForDetail?.let { b ->
        AlertDialog(
            onDismissRequest = { selectedBusinessForDetail = null },
            title = { Text(b.name, fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Categoría: ${b.category}", fontSize = 12.sp)
                    Text("Teléfono: ${b.phone}", fontSize = 12.sp)
                    Text("Correo: ${b.email}", fontSize = 12.sp)
                    Text("Dirección: ${b.address}", fontSize = 12.sp)
                    Text("Ciudad: ${b.city}", fontSize = 12.sp)
                    Text("Estado Operacional: ${if (b.isOpen) "Abierto" else "Cerrado"}", fontSize = 12.sp)
                    Text("Estado Administrativo: ${if (b.isActive) "Activo" else "Suspendido"}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedBusinessForDetail = null }) {
                    Text("Cerrar")
                }
            }
        )
    }
}

@Composable
private fun AdminBusinessCard(
    business: AdminBusinessModel,
    onToggleActive: () -> Unit,
    onViewDetail: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFEEF2FF)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Storefront, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(20.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(business.name, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = Color(0xFF0F172A))
                        Text("🏷️ ${business.category} • 📍 ${business.city}", fontSize = 10.5.sp, color = Color(0xFF64748B))
                    }
                }

                Surface(
                    color = if (business.isActive) Color(0xFFECFDF5) else Color(0xFFFEF2F2),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        if (business.isActive) "ACTIVO" else "SUSPENDIDO",
                        color = if (business.isActive) Color(0xFF10B981) else Color(0xFFDC2626),
                        fontSize = 8.5.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    if (business.isOpen) "🟢 Abierto ahora" else "🔴 Cerrado",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (business.isOpen) Color(0xFF10B981) else Color(0xFF94A3B8)
                )

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    TextButton(onClick = onViewDetail, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) {
                        Text("Detalle", fontSize = 11.sp)
                    }
                    OutlinedButton(
                        onClick = onToggleActive,
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = if (business.isActive) Color(0xFFDC2626) else Color(0xFF10B981)
                        ),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(if (business.isActive) "Suspender" else "Activar", fontSize = 10.5.sp)
                    }
                }
            }
        }
    }
}
