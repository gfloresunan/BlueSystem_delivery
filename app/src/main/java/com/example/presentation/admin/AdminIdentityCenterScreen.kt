package com.example.presentation.admin

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.example.eiam.domain.engine.PermissionEngine
import com.example.eiam.domain.engine.RoleEngine
import com.example.eiam.domain.model.EiamRole
import com.example.ui.theme.BluePrimary
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class AdminUserModel(
    val uid: String = "",
    val displayName: String = "",
    val email: String = "",
    val phone: String = "",
    val role: String = "CLIENT",
    val eiamRole: String = "CLIENT",
    val isActive: Boolean = true,
    val tenantId: String? = null,
    val businessId: String? = null,
    val createdAtMillis: Long = 0L,
    val lastLoginMillis: Long = 0L
)

/**
 * MÓDULO 4: Identidades & Usuarios Operacionales (AdminIdentityCenterScreen).
 *
 * Conecta la UI móvil con el EIAM Core real de BlueSystem:
 * - Búsqueda y filtrado de usuarios en tiempo real (/users).
 * - Matriz de roles canónicos EiamRole (CLIENT, COURIER, BUSINESS, ADMIN, SUPER_ADMIN).
 * - Suspensión y activación de cuentas.
 * - Registro inmutable de cambios de identidad en /audit_events.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminIdentityCenterScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }
    val currentAdminUid = auth.currentUser?.uid ?: "admin"

    var users by remember { mutableStateOf<List<AdminUserModel>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedRoleFilter by remember { mutableStateOf("ALL") }
    var selectedUserForEdit by remember { mutableStateOf<AdminUserModel?>(null) }
    var showRoleChangeDialog by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        val listener = db.collection("users")
            .limit(100)
            .addSnapshotListener { snapshot, error ->
                isLoading = false
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val data = doc.data ?: return@mapNotNull null
                        AdminUserModel(
                            uid = doc.id,
                            displayName = data["displayName"] as? String ?: data["name"] as? String ?: data["nombre"] as? String ?: "Usuario sin nombre",
                            email = data["email"] as? String ?: data["correo"] as? String ?: "",
                            phone = data["phone"] as? String ?: data["telefono"] as? String ?: "",
                            role = (data["role"] as? String ?: data["userType"] as? String ?: data["rol"] as? String ?: "CLIENT").uppercase(),
                            eiamRole = (data["eiamRole"] as? String ?: data["role"] as? String ?: "CLIENT").uppercase(),
                            isActive = (data["isActive"] as? Boolean) ?: (data["active"] as? Boolean) ?: true,
                            tenantId = data["tenantId"] as? String,
                            businessId = data["businessId"] as? String ?: data["comercioId"] as? String,
                            createdAtMillis = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: 0L,
                            lastLoginMillis = (data["lastLogin"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: 0L
                        )
                    }
                    users = list
                }
            }

        onDispose { listener.remove() }
    }

    val filteredUsers = remember(users, searchQuery, selectedRoleFilter) {
        users.filter { u ->
            val matchQuery = searchQuery.isBlank() ||
                    u.displayName.contains(searchQuery, ignoreCase = true) ||
                    u.email.contains(searchQuery, ignoreCase = true) ||
                    u.phone.contains(searchQuery, ignoreCase = true) ||
                    u.uid.contains(searchQuery, ignoreCase = true)

            val matchRole = when (selectedRoleFilter) {
                "ADMIN" -> u.role in listOf("ADMIN", "SUPER_ADMIN")
                "COURIER" -> u.role in listOf("COURIER", "DRIVER", "MOTORIZADO")
                "BUSINESS" -> u.role in listOf("BUSINESS", "OWNER", "MERCHANT", "MANAGER")
                "CLIENT" -> u.role in listOf("CLIENT", "CUSTOMER", "USUARIO")
                else -> true
            }

            matchQuery && matchRole
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Identidades & EIAM", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Gobierno de roles, accesos y sesiones", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
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
                placeholder = { Text("Buscar usuario por nombre, email o UID...", fontSize = 12.sp) },
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

            // Filtros de Rol
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedRoleFilter == "ALL",
                        onClick = { selectedRoleFilter = "ALL" },
                        label = { Text("Todos (${users.size})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedRoleFilter == "ADMIN",
                        onClick = { selectedRoleFilter = "ADMIN" },
                        label = { Text("Admins (${users.count { it.role in listOf("ADMIN", "SUPER_ADMIN") }})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedRoleFilter == "COURIER",
                        onClick = { selectedRoleFilter = "COURIER" },
                        label = { Text("Motorizados (${users.count { it.role in listOf("COURIER", "DRIVER", "MOTORIZADO") }})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedRoleFilter == "BUSINESS",
                        onClick = { selectedRoleFilter = "BUSINESS" },
                        label = { Text("Comercios (${users.count { it.role in listOf("BUSINESS", "OWNER", "MERCHANT") }})", fontSize = 11.sp) }
                    )
                }
                item {
                    FilterChip(
                        selected = selectedRoleFilter == "CLIENT",
                        onClick = { selectedRoleFilter = "CLIENT" },
                        label = { Text("Clientes (${users.count { it.role in listOf("CLIENT", "CUSTOMER", "USUARIO") }})", fontSize = 11.sp) }
                    )
                }
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BluePrimary)
                }
            } else if (filteredUsers.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.People, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(10.dp))
                        Text("No se encontraron usuarios coincidentes", color = Color(0xFF94A3B8), fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredUsers, key = { it.uid }) { user ->
                        AdminUserCard(
                            user = user,
                            onToggleStatus = {
                                coroutineScope.launch {
                                    try {
                                        val newStatus = !user.isActive
                                        db.collection("users").document(user.uid).update("isActive", newStatus).await()

                                        db.collection("audit_events").add(
                                            mapOf(
                                                "actorUid" to currentAdminUid,
                                                "actorRole" to "ADMIN",
                                                "action" to if (newStatus) "ADMIN_ACTIVATE_USER" else "ADMIN_SUSPEND_USER",
                                                "module" to "EIAM_IDENTITY",
                                                "targetType" to "user",
                                                "targetId" to user.uid,
                                                "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                            )
                                        ).await()

                                        Toast.makeText(context, if (newStatus) "Usuario activado" else "Usuario suspendido", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                                    }
                                }
                            },
                            onChangeRole = {
                                selectedUserForEdit = user
                                showRoleChangeDialog = true
                            }
                        )
                    }
                }
            }
        }
    }

    // Diálogo para cambio de rol
    if (showRoleChangeDialog && selectedUserForEdit != null) {
        val targetUser = selectedUserForEdit!!
        var selectedRole by remember { mutableStateOf(targetUser.role) }

        AlertDialog(
            onDismissRequest = { showRoleChangeDialog = false },
            title = { Text("Modificar Rol EIAM", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Usuario: ${targetUser.displayName}", fontSize = 12.sp, color = Color(0xFF64748B))
                    Spacer(modifier = Modifier.height(12.dp))
                    val roles = listOf("CLIENT", "COURIER", "BUSINESS", "ADMIN")
                    roles.forEach { r ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            RadioButton(
                                selected = selectedRole == r,
                                onClick = { selectedRole = r }
                            )
                            Text(r, fontWeight = if (selectedRole == r) FontWeight.Bold else FontWeight.Normal, fontSize = 13.sp)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            try {
                                db.collection("users").document(targetUser.uid).update(
                                    mapOf(
                                        "role" to selectedRole.lowercase(),
                                        "rol" to selectedRole.lowercase(),
                                        "userType" to selectedRole.lowercase(),
                                        "eiamRole" to selectedRole
                                    )
                                ).await()

                                db.collection("audit_events").add(
                                    mapOf(
                                        "actorUid" to currentAdminUid,
                                        "actorRole" to "ADMIN",
                                        "action" to "ADMIN_UPDATE_USER_ROLE",
                                        "module" to "EIAM_IDENTITY",
                                        "targetType" to "user",
                                        "targetId" to targetUser.uid,
                                        "beforeRole" to targetUser.role,
                                        "afterRole" to selectedRole,
                                        "timestamp" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                    )
                                ).await()

                                Toast.makeText(context, "Rol actualizado a $selectedRole", Toast.LENGTH_SHORT).show()
                                showRoleChangeDialog = false
                            } catch (e: Exception) {
                                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                ) {
                    Text("Guardar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRoleChangeDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}

@Composable
private fun AdminUserCard(
    user: AdminUserModel,
    onToggleStatus: () -> Unit,
    onChangeRole: () -> Unit
) {
    val roleColor = when (user.role) {
        "ADMIN", "SUPER_ADMIN" -> Color(0xFF6366F1)
        "COURIER", "DRIVER", "MOTORIZADO" -> Color(0xFF0284C7)
        "BUSINESS", "OWNER", "MERCHANT" -> Color(0xFF059669)
        else -> Color(0xFF64748B)
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(roleColor.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            user.displayName.take(1).uppercase(),
                            color = roleColor,
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(user.displayName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                        Text(user.email.ifBlank { user.phone.ifBlank { user.uid } }, fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                }

                Surface(
                    color = roleColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        user.role,
                        color = roleColor,
                        fontSize = 9.sp,
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(if (user.isActive) Color(0xFF10B981) else Color(0xFFDC2626))
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (user.isActive) "Activo" else "Suspendido", fontSize = 10.5.sp, color = if (user.isActive) Color(0xFF10B981) else Color(0xFFDC2626), fontWeight = FontWeight.SemiBold)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    TextButton(onClick = onChangeRole, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) {
                        Text("Cambiar Rol", fontSize = 11.sp)
                    }
                    OutlinedButton(
                        onClick = onToggleStatus,
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = if (user.isActive) Color(0xFFDC2626) else Color(0xFF10B981)
                        ),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(if (user.isActive) "Suspender" else "Activar", fontSize = 10.5.sp)
                    }
                }
            }
        }
    }
}
