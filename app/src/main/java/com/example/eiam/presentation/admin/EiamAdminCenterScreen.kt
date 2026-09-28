package com.example.eiam.presentation.admin

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

enum class AdminTab(val title: String) {
    USERS("Usuarios"),
    ORGANIZATIONS("Organizaciones & Comercios"),
    EMPLOYEES("Sucursales & Empleados"),
    ROLES("Roles & Permisos"),
    SESSIONS("Sesiones & Dispositivos"),
    INVITATIONS("Invitaciones"),
    AUDIT("Auditoría de Seguridad")
}

@Composable
fun EiamAdminCenterScreen(
    viewModel: EiamAdminViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf(AdminTab.USERS) }

    LaunchedEffect(Unit) {
        viewModel.loadUsers()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "EIAM — Enterprise Admin Center v2.1",
            style = MaterialTheme.typography.headlineSmall
        )
        Text(
            text = "Centro Unificado de Identidad, Accesos y Auditoría de Plataforma",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        ScrollableTabRow(selectedTabIndex = selectedTab.ordinal) {
            AdminTab.values().forEach { tab ->
                Tab(
                    selected = selectedTab == tab,
                    onClick = { selectedTab = tab },
                    text = { Text(tab.title) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            when (selectedTab) {
                AdminTab.USERS -> UsersSection(uiState)
                AdminTab.ORGANIZATIONS -> OrganizationsSection()
                AdminTab.EMPLOYEES -> EmployeesSection()
                AdminTab.ROLES -> RolesPermissionsSection()
                AdminTab.SESSIONS -> SessionsDevicesSection()
                AdminTab.INVITATIONS -> InvitationsSection()
                AdminTab.AUDIT -> AuditSection()
            }
        }
    }
}

@Composable
private fun UsersSection(uiState: EiamAdminUiState) {
    Column {
        Text("Submódulo: Gestión de Usuarios", style = MaterialTheme.typography.titleMedium)
        uiState.users.forEach { user ->
            Text("• ${user.displayName ?: "Usuario"} [${user.activeRole}] — ${user.email}")
        }
    }
}

@Composable
private fun OrganizationsSection() {
    Column {
        Text("Submódulo: Organizaciones & Holding (Organization Engine)", style = MaterialTheme.typography.titleMedium)
        Text("Visualización de estructura matricial Grupo -> Comercios -> Sucursales.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun EmployeesSection() {
    Column {
        Text("Submódulo: Sucursales & Empleados (Employee Engine)", style = MaterialTheme.typography.titleMedium)
        Text("Administración centralizada de staff y asignación de permisos por sucursal.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun RolesPermissionsSection() {
    Column {
        Text("Submódulo: Roles & Matriz de Permisos RBAC/ABAC", style = MaterialTheme.typography.titleMedium)
        Text("Visualización de la matriz de 12 niveles de jerarquía EIAM.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun SessionsDevicesSection() {
    Column {
        Text("Submódulo: Sesiones Activas & Device Risk Scores", style = MaterialTheme.typography.titleMedium)
        Text("Supervisión de nivel de riesgo de hardware, IPs, Emuladores y Root.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun InvitationsSection() {
    Column {
        Text("Submódulo: Gestión de Invitaciones Multicanal", style = MaterialTheme.typography.titleMedium)
        Text("Monitoreo de invitaciones por Email, WhatsApp, SMS, QR y Links temporales.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun AuditSection() {
    Column {
        Text("Submódulo: Logs & Línea de Tiempo de Seguridad", style = MaterialTheme.typography.titleMedium)
        Text("Registro detallado de cambios de dispositivo, permisos, sesión y claims.", style = MaterialTheme.typography.bodySmall)
    }
}
