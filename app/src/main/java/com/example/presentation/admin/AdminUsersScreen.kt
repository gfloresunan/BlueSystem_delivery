package com.example.presentation.admin

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.AppUser
import com.example.FirebaseManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminUsersScreen(
    navController: NavController,
    viewModel: AdminUsersViewModel
) {
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedRoleFilter by viewModel.selectedRoleFilter.collectAsState()
    val users by viewModel.filteredUsers.collectAsState()
    val pendingRequests by viewModel.pendingRequests.collectAsState()

    val currentAdminId = viewModel.currentAdminId
    val currentAdminRole by viewModel.currentAdminRole.collectAsState()

    var selectedUserForEdit by remember { mutableStateOf<AppUser?>(null) }
    var userPendingDegradation by remember { mutableStateOf<Pair<AppUser, String>?>(null) }
    var showPendingRequestsTab by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gestión de Usuarios", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                actions = {
                    if (pendingRequests.isNotEmpty()) {
                        IconButton(onClick = { showPendingRequestsTab = !showPendingRequestsTab }) {
                            BadgedBox(badge = { Badge { Text(pendingRequests.size.toString()) } }) {
                                Icon(Icons.Default.Notifications, contentDescription = "Solicitudes", tint = Color.White)
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF6366F1))
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC))
        ) {
            // Pestañas
            TabRow(
                selectedTabIndex = if (showPendingRequestsTab) 1 else 0,
                containerColor = Color.White,
                contentColor = Color(0xFF6366F1)
            ) {
                Tab(
                    selected = !showPendingRequestsTab,
                    onClick = { showPendingRequestsTab = false },
                    text = { Text("Todos los Usuarios") }
                )
                Tab(
                    selected = showPendingRequestsTab,
                    onClick = { showPendingRequestsTab = true },
                    text = { Text("Solicitudes (${pendingRequests.size})") }
                )
            }

            if (showPendingRequestsTab) {
                // Pantalla de Solicitudes Pendientes
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (pendingRequests.isEmpty()) {
                        item {
                            Text("No hay solicitudes pendientes", color = Color.Gray, modifier = Modifier.padding(16.dp))
                        }
                    }
                    items(pendingRequests) { user ->
                        PendingRequestCard(
                            user = user,
                            onApprove = { viewModel.approveRequest(user.uid, user.requestedRole, previousRole = user.role) },
                            onReject = { viewModel.rejectRequest(user.uid) }
                        )
                    }
                }
            } else {
                // Buscador y Filtros
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { viewModel.updateSearchQuery(it) },
                        placeholder = { Text("Buscar por nombre o email...") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedContainerColor = Color.White,
                            focusedContainerColor = Color.White
                        )
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val roles = listOf("ALL", "CLIENT", "BUSINESS", "DRIVER", "ADMIN")
                        items(roles) { role ->
                            FilterChip(
                                selected = selectedRoleFilter == role,
                                onClick = { viewModel.updateRoleFilter(role) },
                                label = { Text(if (role == "ALL") "Todos" else role) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Color(0xFFEEF2FF),
                                    selectedLabelColor = Color(0xFF6366F1)
                                )
                            )
                        }
                    }
                }

                // Lista de Usuarios
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    contentPadding = PaddingValues(bottom = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(users) { user ->
                        UserCard(
                            user = user,
                            currentAdminId = currentAdminId,
                            currentAdminRole = currentAdminRole,
                            onEditClick = { selectedUserForEdit = user }
                        )
                    }
                }
            }
        }
    }

    // Diálogo de Edición
    selectedUserForEdit?.let { user ->
        EditUserRoleDialog(
            user = user,
            onDismiss = { selectedUserForEdit = null },
            onSave = { newRole ->
                val currentRoleMapped = user.role.uppercase().let { if (it.isEmpty() || it == "CUSTOMER") "CLIENT" else it }
                val isDegrading = (currentRoleMapped in listOf("BUSINESS", "DRIVER")) && newRole == "CLIENT"
                if (isDegrading) {
                    selectedUserForEdit = null
                    userPendingDegradation = Pair(user, newRole)
                } else {
                    viewModel.updateUserRole(user.uid, newRole, previousRole = user.role)
                    selectedUserForEdit = null
                }
            }
        )
    }

    // Diálogo de Advertencia por Degradación
    userPendingDegradation?.let { (user, targetRole) ->
        AlertDialog(
            onDismissRequest = { userPendingDegradation = null },
            title = { Text("⚠️ Advertencia de Cambio de Rol", fontWeight = FontWeight.Bold) },
            text = {
                Text("Este usuario perderá acceso al panel de gestión. Si es un comercio, sus productos activos se ocultarán del catálogo. ¿Deseas continuar?")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.updateUserRole(user.uid, targetRole, previousRole = user.role, reason = "Cambio manual por admin (Degradación confirmada)")
                        userPendingDegradation = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Continuar")
                }
            },
            dismissButton = {
                TextButton(onClick = { userPendingDegradation = null }) {
                    Text("Cancelar", color = Color.Gray)
                }
            }
        )
    }
}

@Composable
fun UserCard(
    user: AppUser,
    currentAdminId: String,
    currentAdminRole: String,
    onEditClick: () -> Unit
) {
    val displayRole = user.role.uppercase().let { if (it.isEmpty() || it == "CUSTOMER") "CLIENT" else it }
    val isAdmin = currentAdminRole.equals("admin", ignoreCase = true)
    val isSelf = user.uid == currentAdminId

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFEEF2FF)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF6366F1))
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(user.nombre.ifEmpty { "Usuario Sin Nombre" }, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(user.email, color = Color.Gray, fontSize = 14.sp)
                Text(user.telefono, color = Color.Gray, fontSize = 12.sp)
            }
            Column(horizontalAlignment = Alignment.End) {
                Badge(containerColor = getRoleColor(displayRole)) {
                    Text(displayRole, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp))
                }
                Spacer(modifier = Modifier.height(8.dp))
                if (isAdmin) {
                    if (isSelf) {
                        // Anti-auto-degradación: Ocultar/deshabilitar edición para la propia cuenta
                        IconButton(onClick = {}, enabled = false, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.Lock, contentDescription = "No puedes modificar tu propio rol", tint = Color.LightGray)
                        }
                    } else {
                        IconButton(onClick = onEditClick, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.Edit, contentDescription = "Editar Rol", tint = Color(0xFF6366F1))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PendingRequestCard(user: AppUser, onApprove: () -> Unit, onReject: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFF59E0B))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Solicitud para: ${user.requestedRole.uppercase()}", fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text("Usuario: ${user.nombre}", fontWeight = FontWeight.SemiBold)
            Text("Email: ${user.email}", color = Color.Gray, fontSize = 14.sp)
            Text("Teléfono: ${user.telefono}", color = Color.Gray, fontSize = 14.sp)

            Spacer(modifier = Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                OutlinedButton(onClick = onReject) {
                    Text("Rechazar", color = Color.Red)
                }
                Spacer(modifier = Modifier.width(8.dp))
                Button(onClick = onApprove, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))) {
                    Text("Aprobar")
                }
            }
        }
    }
}

@Composable
fun EditUserRoleDialog(user: AppUser, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var selectedRole by remember { mutableStateOf(user.role.uppercase().let { if (it.isEmpty() || it == "CUSTOMER") "CLIENT" else it }) }
    val roles = listOf("CLIENT", "BUSINESS", "DRIVER", "ADMIN")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Editar Rol de Usuario") },
        text = {
            Column {
                Text("Selecciona el nuevo rol para ${user.nombre}:", modifier = Modifier.padding(bottom = 12.dp))
                roles.forEach { role ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth().clickable { selectedRole = role }.padding(vertical = 4.dp)
                    ) {
                        RadioButton(
                            selected = selectedRole == role,
                            onClick = { selectedRole = role },
                            colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF6366F1))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(role)
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = { onSave(selectedRole) }, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))) {
                Text("Guardar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = Color.Gray)
            }
        }
    )
}

fun getRoleColor(role: String): Color {
    return when (role) {
        "ADMIN" -> Color(0xFFEF4444)
        "BUSINESS" -> Color(0xFF8B5CF6)
        "DRIVER" -> Color(0xFF10B981)
        else -> Color(0xFF3B82F6) // CLIENT
    }
}
