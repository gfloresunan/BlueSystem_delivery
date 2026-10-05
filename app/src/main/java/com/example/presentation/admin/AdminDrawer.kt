package com.example.presentation.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary
import com.google.firebase.auth.FirebaseAuth

/**
 * Drawer Enterprise de Navegación Exclusivo para el Administrador Móvil.
 *
 * Contiene exactamente los 9 módulos canónicos organizados por dominios:
 * - SOLICITUDES: Solicitudes de Comercio, Solicitudes de Motorizado
 * - FLOTA: Modificaciones Perfil Motorizados, Live Courier Monitor & Telemetría
 * - IDENTIDAD Y SOPORTE: Identidades & Usuarios Operacionales, Centro de Soporte & Ayuda Enterprise
 * - FINANZAS: Caja de Motorizados & Cierres Diarios
 * - COMERCIOS: Gestión Enterprise de Comercios & Sucursales
 * - CONFIGURACIÓN: Configuración Global & Comisiones Enterprise
 *
 * Nota Arquitectónica: El Dashboard es el HOME (pantalla inicial) y no se duplica en el Drawer.
 */
@Composable
fun AdminDrawerContent(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onCloseDrawer: () -> Unit,
    onLogout: () -> Unit
) {
    val auth = remember { FirebaseAuth.getInstance() }
    val currentUser = auth.currentUser
    val adminName = currentUser?.displayName?.ifBlank { currentUser.email?.substringBefore('@') } ?: "Super Administrador"
    val adminEmail = currentUser?.email ?: "admin@bluesystemdelivery.com"

    ModalDrawerSheet(
        modifier = Modifier.width(310.dp),
        drawerContainerColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
        ) {
            // ─── HEADER ENTERPRISE ───────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BluePrimary)
                    .padding(horizontal = 20.dp, vertical = 24.dp)
            ) {
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(CircleShape)
                                    .background(Color.White.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.AdminPanelSettings,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = "BlueSystem",
                                    color = Color.White,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 17.sp
                                )
                                Surface(
                                    color = Color(0xFF10B981),
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = "ENTERPRISE ADMIN",
                                        color = Color.White,
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }

                        // Indicador de conexión activa
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFF34D399))
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("En línea", color = Color.White.copy(alpha = 0.8f), fontSize = 10.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = adminName,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                    Text(
                        text = adminEmail,
                        color = Color.White.copy(alpha = 0.75f),
                        fontSize = 11.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ─── SECCIÓN: SOLICITUDES ─────────────────────────────────────────
            DrawerSectionHeader("SOLICITUDES")
            DrawerMenuItem(
                icon = Icons.Default.Storefront,
                title = "1. Solicitudes de Comercio",
                subtitle = "Altas, RUC y aprobaciones",
                isSelected = currentRoute == AdminRoutes.MERCHANT_REQUESTS,
                onClick = {
                    onCloseDrawer()
                    onNavigate(AdminRoutes.MERCHANT_REQUESTS)
                }
            )
            DrawerMenuItem(
                icon = Icons.Default.TwoWheeler,
                title = "2. Solicitudes de Motorizado",
                subtitle = "Expedientes y licencias",
                isSelected = currentRoute == AdminRoutes.COURIER_REQUESTS,
                onClick = {
                    onCloseDrawer()
                    onNavigate(AdminRoutes.COURIER_REQUESTS)
                }
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp), color = Color(0xFFF1F5F9))

            // ─── SECCIÓN: FLOTA ───────────────────────────────────────────────
            DrawerSectionHeader("FLOTA")
            DrawerMenuItem(
                icon = Icons.Default.Badge,
                title = "3. Modificaciones Perfil Motorizados",
                subtitle = "Gestión y cambios de datos",
                isSelected = currentRoute == AdminRoutes.COURIER_PROFILE_MGMT,
                onClick = {
                    onCloseDrawer()
                    onNavigate(AdminRoutes.COURIER_PROFILE_MGMT)
                }
            )
            DrawerMenuItem(
                icon = Icons.Default.GpsFixed,
                title = "7. Live Courier Monitor",
                subtitle = "Telemetría y GPS en tiempo real",
                isSelected = currentRoute == AdminRoutes.LIVE_COURIER_MONITOR,
                onClick = {
                    onCloseDrawer()
                    onNavigate(AdminRoutes.LIVE_COURIER_MONITOR)
                }
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp), color = Color(0xFFF1F5F9))

            // ─── SECCIÓN: IDENTIDAD Y SOPORTE ─────────────────────────────────
            DrawerSectionHeader("IDENTIDAD Y SOPORTE")
            DrawerMenuItem(
                icon = Icons.Default.Security,
                title = "4. Identidades & EIAM",
                subtitle = "Usuarios, roles y sesiones",
                isSelected = currentRoute == AdminRoutes.IDENTITY_CENTER,
                onClick = {
                    onCloseDrawer()
                    onNavigate(AdminRoutes.IDENTITY_CENTER)
                }
            )
            DrawerMenuItem(
                icon = Icons.Default.SupportAgent,
                title = "5. Centro de Soporte & Ayuda",
                subtitle = "Tickets e incidencias de ruta",
                isSelected = currentRoute == AdminRoutes.SUPPORT_CENTER,
                onClick = {
                    onCloseDrawer()
                    onNavigate(AdminRoutes.SUPPORT_CENTER)
                }
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp), color = Color(0xFFF1F5F9))

            // ─── SECCIÓN: FINANZAS ────────────────────────────────────────────
            DrawerSectionHeader("FINANZAS")
            DrawerMenuItem(
                icon = Icons.Default.AccountBalanceWallet,
                title = "6. Caja de Motorizados",
                subtitle = "Cierres diarios, arqueos y actas",
                isSelected = currentRoute == AdminRoutes.COURIER_CASH_CENTER,
                onClick = {
                    onCloseDrawer()
                    onNavigate(AdminRoutes.COURIER_CASH_CENTER)
                }
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp), color = Color(0xFFF1F5F9))

            // ─── SECCIÓN: COMERCIOS ───────────────────────────────────────────
            DrawerSectionHeader("COMERCIOS")
            DrawerMenuItem(
                icon = Icons.Default.Business,
                title = "8. Comercios & Sucursales",
                subtitle = "Gestión multi-tenant de tiendas",
                isSelected = currentRoute == AdminRoutes.ENTERPRISE_COMMERCE,
                onClick = {
                    onCloseDrawer()
                    onNavigate(AdminRoutes.ENTERPRISE_COMMERCE)
                }
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp), color = Color(0xFFF1F5F9))

            // ─── SECCIÓN: CONFIGURACIÓN ───────────────────────────────────────
            DrawerSectionHeader("CONFIGURACIÓN")
            DrawerMenuItem(
                icon = Icons.Default.SettingsSuggest,
                title = "9. Configuración Global",
                subtitle = "Tarifas X→Y, comisiones y flags",
                isSelected = currentRoute == AdminRoutes.GLOBAL_CONFIG,
                onClick = {
                    onCloseDrawer()
                    onNavigate(AdminRoutes.GLOBAL_CONFIG)
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ─── FOOTER CERRAR SESIÓN ─────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFFDC2626)
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Cerrar Sesión Administrativa", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun DrawerSectionHeader(title: String) {
    Text(
        text = title,
        color = Color(0xFF64748B),
        fontSize = 10.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 1.sp,
        modifier = Modifier.padding(start = 20.dp, top = 8.dp, bottom = 4.dp)
    )
}

@Composable
private fun DrawerMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val containerColor = if (isSelected) Color(0xFFEFF6FF) else Color.Transparent
    val contentColor = if (isSelected) BluePrimary else Color(0xFF1E293B)
    val iconColor = if (isSelected) BluePrimary else Color(0xFF64748B)

    Surface(
        color = containerColor,
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 2.dp)
            .clickable(onClick = onClick)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isSelected) BluePrimary.copy(alpha = 0.12f) else Color(0xFFF1F5F9)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(18.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    color = contentColor,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                    fontSize = 12.5.sp
                )
                Text(
                    text = subtitle,
                    color = Color(0xFF94A3B8),
                    fontSize = 10.sp
                )
            }
            if (isSelected) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(BluePrimary)
                )
            }
        }
    }
}
