package com.example.presentation.customer.profile

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.example.data.repository.DynamicMenuRepository
import com.example.data.repository.NotificationRepository
import com.example.service.DestinationRouter
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    isGuest: Boolean,
    onNavigateToAddresses: () -> Unit,
    onNavigateToLogin: () -> Unit,
    onLogout: () -> Unit,
    onNavigateToBusinessDashboard: (() -> Unit)? = null,
    onNavigateToOrders: (() -> Unit)? = null,
    onNavigateToHelp: (() -> Unit)? = null,
    onNavigateToSolicitarEnvio: (() -> Unit)? = null,
    onNavigateToFavorites: (() -> Unit)? = null,
    onNavigateToLoyaltyPoints: (() -> Unit)? = null,
    onNavigateToLoyaltyLevel: (() -> Unit)? = null,
    onNavigateToCoupons: (() -> Unit)? = null,
    onNavigateToSecurity: (() -> Unit)? = null,
    navController: NavController? = null,
    viewModel: ProfileViewModel = viewModel(),
    dynamicMenuRepo: DynamicMenuRepository = remember { DynamicMenuRepository() },
    notificationRepo: NotificationRepository = remember { NotificationRepository() }
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val currentUser by viewModel.currentUser.collectAsState()
    val isLoadingProfile by viewModel.isLoadingProfile.collectAsState()
    val profileError by viewModel.profileError.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val addresses by viewModel.addresses.collectAsState()
    val customerStats by viewModel.customerStats.collectAsState()
    val customerSettings by viewModel.customerSettings.collectAsState()
    val dynamicMenuItems by dynamicMenuRepo.dynamicMenuItems.collectAsState()

    // Soporte StateFlows
    val supportTickets by viewModel.supportTickets.collectAsState()
    val ticketMessages by viewModel.currentTicketMessages.collectAsState()
    val selectedTicketId by viewModel.selectedTicketId.collectAsState()

    // Notificaciones StateFlows
    val notificationsList by notificationRepo.notifications.collectAsState()
    val unreadNotifCount by notificationRepo.unreadCount.collectAsState()

    LaunchedEffect(currentUser?.uid) {
        dynamicMenuRepo.startListening()
        currentUser?.uid?.let { uid ->
            if (uid.isNotBlank()) {
                notificationRepo.startListening(uid)
            }
        }
    }

    var showEditProfileDialog by remember { mutableStateOf(false) }
    var showSupportDialog by remember { mutableStateOf(false) }
    var showNotificationsDialog by remember { mutableStateOf(false) }
    var showSettingsDialog by remember { mutableStateOf(false) }
    var showInviteFriendsDialog by remember { mutableStateOf(false) }
    var isLoyaltySubmenuExpanded by remember { mutableStateOf(true) }

    // ── Estado de verificación de correo de Firebase Auth ──────────────────
    val auth = remember { com.google.firebase.auth.FirebaseAuth.getInstance() }
    val authUser = auth.currentUser
    var isEmailVerified by remember(authUser) { mutableStateOf(authUser?.isEmailVerified ?: false) }
    var isSendingVerification by remember { mutableStateOf(false) }
    var isReloadingAuth by remember { mutableStateOf(false) }

    // Dialog de Edición de Perfil Real (CAMBIO 8: Preservado 100%)
    if (showEditProfileDialog) {
        EditProfileDialog(
            currentUser = currentUser,
            onDismiss = { showEditProfileDialog = false },
            onSaveProfile = { name, phone, onComplete ->
                viewModel.updateUserProfile(name, phone, onComplete)
            },
            onUploadAvatar = { uri, onComplete ->
                viewModel.uploadAvatar(uri, context, onComplete)
            }
        )
    }

    // Modal de Notificaciones (CAMBIO 6)
    if (showNotificationsDialog) {
        CustomerNotificationsDialog(
            notifications = notificationsList,
            unreadCount = unreadNotifCount,
            onDismiss = { showNotificationsDialog = false },
            onMarkAsRead = { notifId ->
                coroutineScope.launch {
                    notificationRepo.markAsRead(notifId)
                }
            },
            onMarkAllAsRead = {
                coroutineScope.launch {
                    notificationRepo.markAllAsRead()
                }
            },
            onNotificationClick = { item ->
                navController?.let { nc ->
                    val route = com.example.navigation.NotificationRouter.resolve(item, "customer")
                    com.example.navigation.NotificationRouter.navigateSafely(nc, route)
                }
            }
        )
    }

    // Modal de Soporte & Tickets en Vivo (CAMBIO 4)
    if (showSupportDialog) {
        SupportTicketsDialog(
            tickets = supportTickets,
            messages = ticketMessages,
            selectedTicketId = selectedTicketId,
            onDismiss = { showSupportDialog = false },
            onCreateTicket = { subject, msg, onComplete ->
                viewModel.createSupportTicket(subject, msg, onComplete)
            },
            onSelectTicket = { ticketId ->
                viewModel.selectTicketAndListen(ticketId)
            },
            onSendMessage = { ticketId, text, onComplete ->
                viewModel.sendTicketMessage(ticketId, text, onComplete)
            }
        )
    }

    // Modal de Configuración & Preferencias (CAMBIO 7)
    if (showSettingsDialog) {
        AlertDialog(
            onDismissRequest = { showSettingsDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Settings, contentDescription = null, tint = BluePrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Configuración & Preferencias", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 460.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    ProfileSettings(
                        settings = customerSettings,
                        onSettingsChanged = { newSettings ->
                            viewModel.savePreferences(newSettings, context)
                        },
                        onLogout = {
                            showSettingsDialog = false
                            onLogout()
                        }
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { showSettingsDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary)
                ) {
                    Text("Listo")
                }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = MaterialTheme.colorScheme.surface
        )
    }

    if (showInviteFriendsDialog) {
        AlertDialog(
            onDismissRequest = { showInviteFriendsDialog = false },
            title = { Text("Invita Amigos a BlueSystem 🎁", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Comparte BlueSystem Delivery con tus amigos y familiares para que disfruten de entregas express y comercios locales.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "https://bluesystemdelivery.com/invite",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(12.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    showInviteFriendsDialog = false
                    Toast.makeText(context, "¡Enlace copiado al portapapeles!", Toast.LENGTH_SHORT).show()
                }) { Text("Copiar Enlace") }
            },
            dismissButton = {
                TextButton(onClick = { showInviteFriendsDialog = false }) { Text("Cerrar") }
            }
        )
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = MaterialTheme.colorScheme.surface,
                drawerContentColor = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.width(300.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Header del Drawer
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(BluePrimary),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Person, contentDescription = null, tint = Color.White)
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            val rawName = if (isGuest || authUser == null) {
                                "Invitado"
                            } else {
                                currentUser?.nombre?.ifBlank { currentUser?.name } ?: authUser.displayName?.ifBlank { "Mi Perfil" } ?: "Mi Perfil"
                            }
                            Text(
                                text = rawName,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            val userEmailText = if (isGuest || authUser == null) {
                                "Modo Exploración"
                            } else {
                                currentUser?.email ?: authUser.email ?: ""
                            }
                            if (userEmailText.isNotBlank()) {
                                Text(
                                    text = userEmailText,
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))

                    // 👤 Mi Perfil
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.Person, contentDescription = null) },
                        label = { Text("Mi Perfil", fontWeight = FontWeight.SemiBold) },
                        selected = true,
                        onClick = { coroutineScope.launch { drawerState.close() } }
                    )

                    // ❤️ Favoritos
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.Favorite, contentDescription = null, tint = Color(0xFFEF4444)) },
                        label = { Text("Favoritos") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToFavorites?.invoke()
                        }
                    )

                    // 📍 Mis direcciones
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF10B981)) },
                        label = { Text("Mis direcciones") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToAddresses()
                        }
                    )

                    // 🚚 Envío A → B
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.LocalShipping, contentDescription = null, tint = Color(0xFF3B82F6)) },
                        label = { Text("Envío A → B") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToSolicitarEnvio?.invoke()
                        }
                    )

                    // 🎁 Fidelidad (Categoría Expandible y Navegable)
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.CardGiftcard, contentDescription = null, tint = Color(0xFFF59E0B)) },
                        label = {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Fidelidad", fontWeight = FontWeight.Bold)
                                Icon(
                                    imageVector = if (isLoyaltySubmenuExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        },
                        selected = false,
                        onClick = { isLoyaltySubmenuExpanded = !isLoyaltySubmenuExpanded }
                    )

                    AnimatedVisibility(visible = isLoyaltySubmenuExpanded) {
                        Column(modifier = Modifier.padding(start = 24.dp)) {
                            NavigationDrawerItem(
                                icon = { Text("⭐", fontSize = 14.sp) },
                                label = { Text("Puntos", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) },
                                selected = false,
                                onClick = {
                                    coroutineScope.launch { drawerState.close() }
                                    onNavigateToLoyaltyPoints?.invoke()
                                }
                            )
                            NavigationDrawerItem(
                                icon = { Text("🏆", fontSize = 14.sp) },
                                label = { Text("Nivel cliente", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) },
                                selected = false,
                                onClick = {
                                    coroutineScope.launch { drawerState.close() }
                                    onNavigateToLoyaltyLevel?.invoke()
                                }
                            )
                        }
                    }

                    // 🎟️ Mis cupones
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.ConfirmationNumber, contentDescription = null, tint = Color(0xFF8B5CF6)) },
                        label = { Text("Mis cupones") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToCoupons?.invoke()
                        }
                    )

                    // 🛡️ Seguridad & Contraseña
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.Security, contentDescription = null, tint = Color(0xFF6366F1)) },
                        label = { Text("Seguridad & Contraseña") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToSecurity?.invoke()
                        }
                    )

                    // ⚙️ Configuración & Preferencias (CAMBIO 7)
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.Settings, contentDescription = null, tint = BluePrimary) },
                        label = { Text("Configuración & Preferencias", fontWeight = FontWeight.SemiBold) },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            showSettingsDialog = true
                        }
                    )

                    // ❓ Ayuda & Soporte
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Default.HelpOutline, contentDescription = null) },
                        label = { Text("Ayuda & Soporte") },
                        selected = false,
                        onClick = {
                            coroutineScope.launch { drawerState.close() }
                            onNavigateToHelp?.invoke()
                        }
                    )

                    // ─── ADMIN DYNAMIC MENU (Actividad #10 Enterprise) ─────────
                    if (dynamicMenuItems.isNotEmpty()) {
                        HorizontalDivider(
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f),
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                        Text(
                            text = "MÁS OPCIONES",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
                        )

                        dynamicMenuItems.forEach { item ->
                            NavigationDrawerItem(
                                icon = {
                                    when (item.iconKey.lowercase()) {
                                        "whatsapp" -> Text("💬", fontSize = 16.sp)
                                        "vip" -> Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFF59E0B))
                                        "gift" -> Icon(Icons.Default.CardGiftcard, contentDescription = null, tint = Color(0xFF10B981))
                                        "tag" -> Icon(Icons.Default.LocalOffer, contentDescription = null, tint = Color(0xFFEC4899))
                                        "card" -> Icon(Icons.Default.CreditCard, contentDescription = null, tint = Color(0xFF8B5CF6))
                                        "support" -> Icon(Icons.Default.SupportAgent, contentDescription = null, tint = Color(0xFF3B82F6))
                                        "link" -> Icon(Icons.Default.Link, contentDescription = null, tint = Color(0xFF06B6D4))
                                        "info" -> Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF6366F1))
                                        "location" -> Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF10B981))
                                        "bell" -> Icon(Icons.Default.Notifications, contentDescription = null, tint = Color(0xFFF59E0B))
                                        else -> Icon(Icons.Default.Star, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                    }
                                },
                                label = {
                                    Column {
                                        Text(item.title, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                        if (item.description.isNotBlank()) {
                                            Text(
                                                text = item.description,
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                },
                                selected = false,
                                onClick = {
                                    coroutineScope.launch { drawerState.close() }
                                    if (navController != null) {
                                        DestinationRouter.navigateToDestination(
                                            context = context,
                                            navController = navController,
                                            destinationType = item.destinationType,
                                            destination = item.destination
                                        )
                                    }
                                }
                            )
                        }
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))

                    // 🚪 Iniciar / Cerrar sesión
                    if (isGuest || authUser == null) {
                        NavigationDrawerItem(
                            icon = { Icon(Icons.Default.Login, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                            label = { Text("Iniciar sesión", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold) },
                            selected = false,
                            onClick = {
                                coroutineScope.launch { drawerState.close() }
                                onNavigateToLogin()
                            }
                        )
                    } else {
                        NavigationDrawerItem(
                            icon = { Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                            label = { Text("Cerrar sesión", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold) },
                            selected = false,
                            onClick = {
                                coroutineScope.launch { drawerState.close() }
                                onLogout()
                            }
                        )
                    }
                }
            }
        }
    ) {
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // TopBar con Botón Menú Hamburguesa y Centro de Notificaciones 🔔 (CAMBIO 6)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = { coroutineScope.launch { drawerState.open() } },
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surface)
                    ) {
                        Icon(Icons.Default.Menu, contentDescription = "Abrir Menú Lateral", tint = MaterialTheme.colorScheme.primary)
                    }

                    Text(
                        text = "Mi Perfil",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.onBackground
                    )

                    // Campana de Notificaciones con Badge (CAMBIO 6)
                    IconButton(
                        onClick = { showNotificationsDialog = true },
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surface)
                    ) {
                        BadgedBox(
                            badge = {
                                if (unreadNotifCount > 0) {
                                    Badge(
                                        containerColor = Color(0xFFEF4444),
                                        contentColor = Color.White
                                    ) {
                                        Text(if (unreadNotifCount > 9) "9+" else unreadNotifCount.toString(), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = "Mis Notificaciones",
                                tint = if (unreadNotifCount > 0) BluePrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                if (isGuest || authUser == null) {
                    GuestProfileCard(onNavigateToLogin = onNavigateToLogin)
                } else if (isLoadingProfile && currentUser == null) {
                    // Estado de Carga explícito (F-04)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(36.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            CircularProgressIndicator(
                                color = BluePrimary,
                                modifier = Modifier.size(36.dp),
                                strokeWidth = 3.dp
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Text(
                                text = "Cargando perfil...",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                } else if (currentUser == null) {
                    // Estado de Error explícito (F-04)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(40.dp)
                            )
                            Text(
                                text = "No se pudo cargar el perfil",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                            Text(
                                text = profileError ?: "Ocurrió un problema al obtener los datos de tu cuenta. Por favor verifica tu conexión e intenta nuevamente.",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.8f),
                                textAlign = TextAlign.Center
                            )
                            Button(
                                onClick = { viewModel.refresh() },
                                colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Reintentar", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                } else {
                    // 1. Identidad Real Autenticada (0 Identidades Ficticias)
                    val rawName = currentUser?.nombre?.ifBlank { currentUser?.name } ?: authUser.displayName ?: ""
                    val rawPhone = currentUser?.telefono?.ifBlank { currentUser?.phone } ?: authUser.phoneNumber ?: ""
                    val userRole = (currentUser?.rol?.ifEmpty { currentUser?.role?.ifEmpty { currentUser?.userType ?: "Cliente" } } ?: "Cliente").replaceFirstChar { it.uppercase() }
                    val realUid = currentUser?.uid?.ifBlank { authUser.uid } ?: authUser.uid
                    val realEmail = currentUser?.email?.ifBlank { authUser.email ?: "" } ?: authUser.email ?: ""

                    ProfileHeader(
                        userName = rawName.ifBlank { "Usuario" },
                        userEmail = realEmail,
                        userPhone = rawPhone,
                        photoUrl = currentUser?.photoUrl?.ifBlank { authUser.photoUrl?.toString() ?: "" } ?: authUser.photoUrl?.toString() ?: "",
                        clientId = realUid.take(8).uppercase(),
                        roleTitle = userRole,
                        isEmailVerified = isEmailVerified,
                        onEditProfileClick = { showEditProfileDialog = true }
                    )

                    // ── Banner de Verificación de Correo Electrónico Corporativo (CAMBIO 2) ──
                    if (!isGuest && authUser != null && !isEmailVerified) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                            border = BorderStroke(1.dp, Color(0xFFFDE68A))
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.MarkEmailUnread,
                                        contentDescription = null,
                                        tint = Color(0xFFD97706),
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = "Correo Electrónico No Verificado",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = Color(0xFF92400E)
                                    )
                                }
                                Text(
                                    text = "Verifica tu correo electrónico para garantizar la máxima seguridad de tu cuenta y recibir los comprobantes oficiales de tus pedidos.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF78350F)
                                )
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Button(
                                        onClick = {
                                            isSendingVerification = true
                                            coroutineScope.launch {
                                                val result = com.example.AuthManager().enviarVerificacionCorreo()
                                                isSendingVerification = false
                                                result.fold(
                                                    onSuccess = {
                                                        Toast.makeText(context, "Correo de verificación corporativo enviado. Revisa tu bandeja de entrada.", Toast.LENGTH_LONG).show()
                                                    },
                                                    onFailure = { err ->
                                                        Toast.makeText(context, err.localizedMessage ?: "Error al enviar verificación.", Toast.LENGTH_LONG).show()
                                                    }
                                                )
                                            }
                                        },
                                        enabled = !isSendingVerification,
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706))
                                    ) {
                                        if (isSendingVerification) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                        } else {
                                            Text("Reenviar Correo", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    OutlinedButton(
                                        onClick = {
                                            isReloadingAuth = true
                                            coroutineScope.launch {
                                                val result = com.example.AuthManager().recargarEstadoUsuario()
                                                isReloadingAuth = false
                                                result.fold(
                                                    onSuccess = { u ->
                                                        if (u?.isEmailVerified == true) {
                                                            isEmailVerified = true
                                                            Toast.makeText(context, "¡Correo verificado correctamente!", Toast.LENGTH_SHORT).show()
                                                        } else {
                                                            Toast.makeText(context, "El correo aún no ha sido verificado.", Toast.LENGTH_SHORT).show()
                                                        }
                                                    },
                                                    onFailure = {
                                                        Toast.makeText(context, "No se pudo actualizar el estado.", Toast.LENGTH_SHORT).show()
                                                    }
                                                )
                                            }
                                        },
                                        enabled = !isReloadingAuth,
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(10.dp),
                                        border = BorderStroke(1.dp, Color(0xFFD97706))
                                    ) {
                                        if (isReloadingAuth) {
                                            CircularProgressIndicator(color = Color(0xFFD97706), modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                        } else {
                                            Text("Ya lo Verifiqué", fontSize = 12.sp, color = Color(0xFFD97706), fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 2. Resumen 100% Real (CAMBIO 3: Métrica Real de Pedidos)
                    ProfileSummary(
                        ordersCount = customerStats.totalOrders,
                        addressesCount = addresses.size,
                        isAccountActive = currentUser?.active ?: true
                    )

                    // 3. Acciones Rápidas Prioritarias (CAMBIO 8: Editar 100% funcional)
                    ProfilePrimaryActions(
                        onEditProfileClick = { showEditProfileDialog = true },
                        onAddressesClick = onNavigateToAddresses,
                        onDeliveryClick = onNavigateToSolicitarEnvio
                    )

                    // 4. Menú Estructurado por Categorías
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                    ) {
                        Column {
                            // Fidelidad & Puntos
                            ProfileMenuItem(
                                icon = Icons.Default.Stars,
                                title = "Programa de Fidelidad 🎁",
                                subtitle = "Tus puntos acumulados, recompensas y nivel",
                                onClick = { onNavigateToLoyaltyPoints?.invoke() }
                            )
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))

                            // Mis Cupones
                            ProfileMenuItem(
                                icon = Icons.Default.ConfirmationNumber,
                                title = "Mis Cupones & Promociones",
                                subtitle = "Descuentos, promociones y recompensas disponibles",
                                onClick = { onNavigateToCoupons?.invoke() }
                            )
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))

                            // Sección Comercio si el usuario tiene rol administrativo
                            val roleLower = userRole.lowercase()
                            val isBusinessUser = roleLower in listOf("business", "comercio", "merchant", "owner", "admin", "super_admin")
                            if (isBusinessUser && onNavigateToBusinessDashboard != null) {
                                ProfileMenuItem(
                                    icon = Icons.Default.Storefront,
                                    title = "Panel de Comercio / Restaurante",
                                    subtitle = "Gestión de pedidos KDS y catálogo",
                                    onClick = onNavigateToBusinessDashboard
                                )
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                            }

                            // Soporte & Ayuda (CAMBIO 4: Sistema de Tickets en Vivo)
                            ProfileMenuItem(
                                icon = Icons.Default.SupportAgent,
                                title = "Centro de Soporte & Ayuda 🎧",
                                subtitle = if (supportTickets.any { it.unreadByCustomer > 0 }) "¡Tienes respuestas de soporte pendientes!" else "Chat de soporte 24/7 y tickets",
                                onClick = { showSupportDialog = true }
                            )
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))

                            // Invitar Amigos
                            ProfileMenuItem(
                                icon = Icons.Default.Share,
                                title = "Invitar Amigos",
                                subtitle = "Comparte BlueSystem con tu comunidad",
                                onClick = { showInviteFriendsDialog = true }
                            )
                        }
                    }

                    // 5. Botón Cerrar Sesión Canónico
                    Button(
                        onClick = onLogout,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Cerrar Sesión", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
fun GuestProfileCard(onNavigateToLogin: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "¡Bienvenido a BlueSystem!",
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Inicia sesión para guardar tus direcciones, acceder a tu perfil y realizar pedidos express.",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onNavigateToLogin,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text("Iniciar Sesión / Registrarse")
            }
        }
    }
}

@Composable
fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = BluePrimary,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            if (!subtitle.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
            modifier = Modifier.size(20.dp)
        )
    }
}
