package com.example

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary
import com.example.ui.theme.BlueTertiary
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

enum class AdminTab {
    ORDERS,      // Órdenes en Tiempo Real
    DRIVERS,     // Flota de Motorizados & GPS
    COMMERCE,    // Comercios & Sucursales
    USERS,       // Usuarios & Permisos
    FINANCE      // Finanzas & Auditoría
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    onBack: () -> Unit,
    onNavigateToUsers: () -> Unit = {},
    onAsignarPedidoBackend: suspend (pedidoId: String, motorizadoId: String) -> Unit,
    firebaseManager: FirebaseManager,
    onLogout: () -> Unit
) {
    var activeTab by remember { mutableStateOf(AdminTab.ORDERS) }
    var orderToAssign by remember { mutableStateOf<Pedido?>(null) }
    var showCreateStoreDialog by remember { mutableStateOf(false) }
    var orderSearchQuery by remember { mutableStateOf("") }
    var selectedOrderStatusFilter by remember { mutableStateOf("ALL") }

    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    val db = remember { FirebaseFirestore.getInstance() }

    LaunchedEffect(Unit) {
        com.example.data.FcmManager.registerCurrentDeviceToken("admin")
    }

    // 1. Snapshot listeners de Firestore en Tiempo Real
    val orders by firebaseManager.listenToPedidos().collectAsState(initial = emptyList())
    val drivers by firebaseManager.listenToDrivers().collectAsState(initial = emptyList())
    val motorizadosActivosPorGps by firebaseManager.obtenerFlujoMotorizadosActivos().collectAsState(initial = emptyList())
    val allUsers by firebaseManager.listenToAllUsers().collectAsState(initial = emptyList())

    // Filtros de Comercios y Usuarios
    val businessUsers = remember(allUsers) {
        allUsers.filter { u ->
            val r = (u.rol.ifEmpty { u.role.ifEmpty { u.userType } }).lowercase()
            r in listOf("business", "comercio", "restaurant", "merchant", "owner")
        }
    }

    val pendingRoleRequests = remember(allUsers) {
        allUsers.filter { it.requestedRole.isNotBlank() && it.requestedRole != it.role }
    }

    // 2. Cálculos de KPIs
    val pendingCount = remember(orders) { orders.count { it.status.lowercase() == "pending" } }
    val inTransitCount = remember(orders) { orders.count { it.status.lowercase() in listOf("in_transit", "ready", "picked_up") } }
    val activeDriversCount = remember(drivers) { drivers.count { it.active } }
    val totalRevenue = remember(orders) { orders.filter { it.status.lowercase() == "delivered" }.sumOf { it.total } }

    // Filtrar órdenes por búsqueda y estado
    val filteredOrders = remember(orders, orderSearchQuery, selectedOrderStatusFilter) {
        orders.filter { order ->
            val matchesQuery = orderSearchQuery.isBlank() ||
                    order.pedidoId.contains(orderSearchQuery, ignoreCase = true) ||
                    order.customerName.contains(orderSearchQuery, ignoreCase = true) ||
                    order.businessName.contains(orderSearchQuery, ignoreCase = true)

            val matchesStatus = when (selectedOrderStatusFilter) {
                "PENDING" -> order.status.lowercase() == "pending"
                "IN_TRANSIT" -> order.status.lowercase() in listOf("in_transit", "ready", "picked_up")
                "DELIVERED" -> order.status.lowercase() == "delivered"
                else -> true
            }

            matchesQuery && matchesStatus
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("BlueSystem Enterprise", fontWeight = FontWeight.Black, fontSize = 17.sp, color = Color.White)
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                color = Color(0xFF10B981),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text("ADMIN", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                            }
                        }
                        Text("Centro de Operaciones Global", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                actions = {
                    if (pendingRoleRequests.isNotEmpty()) {
                        IconButton(onClick = onNavigateToUsers) {
                            BadgedBox(badge = { Badge { Text(pendingRoleRequests.size.toString()) } }) {
                                Icon(Icons.Default.Notifications, contentDescription = "Solicitudes Pendientes", tint = Color.White)
                            }
                        }
                    }

                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Cerrar Sesión", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BluePrimary
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color(0xFFF8FAFC))
        ) {
            // ─── BLOQUE 1: KPIs DE OPERACIÓN (TARJETAS MODERNAS CON SOMBRA) ───
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    AdminKpiCard(
                        title = "Pendientes",
                        value = pendingCount.toString(),
                        subtitle = "Buscando motorizado",
                        icon = Icons.Default.HourglassTop,
                        bgColor = Color(0xFFFFF1F2),
                        accentColor = Color(0xFFE11938)
                    )
                }
                item {
                    AdminKpiCard(
                        title = "En Ruta",
                        value = inTransitCount.toString(),
                        subtitle = "En camino al cliente",
                        icon = Icons.Default.DirectionsBike,
                        bgColor = Color(0xFFEFF6FF),
                        accentColor = BluePrimary
                    )
                }
                item {
                    AdminKpiCard(
                        title = "Flota Activa",
                        value = "$activeDriversCount / ${drivers.size}",
                        subtitle = "Drivers en línea",
                        icon = Icons.Default.CheckCircle,
                        bgColor = Color(0xFFECFDF5),
                        accentColor = Color(0xFF10B981)
                    )
                }
                item {
                    AdminKpiCard(
                        title = "Ventas Entregadas",
                        value = "C$ ${String.format("%.0f", totalRevenue)}",
                        subtitle = "Ingreso total procesado",
                        icon = Icons.Default.AttachMoney,
                        bgColor = Color(0xFFFFFBEB),
                        accentColor = Color(0xFFD97706)
                    )
                }
            }

            // ─── BLOQUE 2: BARRA DE PESTAÑAS (SCROLLABLE TAB ROW) ───
            ScrollableTabRow(
                selectedTabIndex = activeTab.ordinal,
                containerColor = Color.White,
                contentColor = BluePrimary,
                edgePadding = 12.dp,
                modifier = Modifier.shadow(1.dp)
            ) {
                Tab(
                    selected = activeTab == AdminTab.ORDERS,
                    onClick = { activeTab = AdminTab.ORDERS },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Receipt, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Órdenes (${orders.size})", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                )
                Tab(
                    selected = activeTab == AdminTab.DRIVERS,
                    onClick = { activeTab = AdminTab.DRIVERS },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.TwoWheeler, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Flota & GPS (${drivers.size})", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                )
                Tab(
                    selected = activeTab == AdminTab.COMMERCE,
                    onClick = { activeTab = AdminTab.COMMERCE },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Storefront, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Comercios (${businessUsers.size})", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                )
                Tab(
                    selected = activeTab == AdminTab.USERS,
                    onClick = { activeTab = AdminTab.USERS },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.People, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Usuarios (${allUsers.size})", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                )
                Tab(
                    selected = activeTab == AdminTab.FINANCE,
                    onClick = { activeTab = AdminTab.FINANCE },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Insights, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Finanzas", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                )
            }

            // ─── BLOQUE 3: CONTENIDO SEGÚN LA PESTAÑA SELECCIONADA ───
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .weight(1f)
            ) {
                when (activeTab) {
                    AdminTab.ORDERS -> {
                        Column(modifier = Modifier.fillMaxSize()) {
                            // Buscador y filtros de órdenes
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                OutlinedTextField(
                                    value = orderSearchQuery,
                                    onValueChange = { orderSearchQuery = it },
                                    placeholder = { Text("Buscar orden, cliente o comercio...", fontSize = 12.sp) },
                                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray) },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = BluePrimary,
                                        unfocusedBorderColor = Color(0xFFCBD5E1),
                                        focusedContainerColor = Color.White,
                                        unfocusedContainerColor = Color.White
                                    )
                                )
                            }

                            // Chips de estado
                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.padding(bottom = 8.dp)
                            ) {
                                val statusFilters = listOf(
                                    "ALL" to "Todas",
                                    "PENDING" to "Pendientes",
                                    "IN_TRANSIT" to "En Camino",
                                    "DELIVERED" to "Entregadas"
                                )
                                items(statusFilters) { (key, label) ->
                                    val isSel = selectedOrderStatusFilter == key
                                    FilterChip(
                                        selected = isSel,
                                        onClick = { selectedOrderStatusFilter = key },
                                        label = { Text(label, fontSize = 12.sp) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = BluePrimary,
                                            selectedLabelColor = Color.White
                                        ),
                                        shape = RoundedCornerShape(20.dp)
                                    )
                                }
                            }

                            if (filteredOrders.isEmpty()) {
                                EmptyAdminState(
                                    icon = Icons.Default.Inbox,
                                    message = "No hay órdenes que coincidan con el filtro activo"
                                )
                            } else {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    items(filteredOrders, key = { it.pedidoId }) { order ->
                                        AdminOrderCard(
                                            order = order,
                                            onAssignClick = { orderToAssign = order }
                                        )
                                    }
                                }
                            }
                        }
                    }

                    AdminTab.DRIVERS -> {
                        Column(modifier = Modifier.fillMaxSize()) {
                            // Mapa Global interactivo
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(220.dp)
                                    .padding(horizontal = 16.dp, vertical = 10.dp)
                                    .clip(RoundedCornerShape(16.dp))
                            ) {
                                MapaGlobalAdmin(
                                    motorizados = motorizadosActivosPorGps,
                                    modifier = Modifier.fillMaxSize()
                                )
                            }

                            Text(
                                "Flota Registrada (${drivers.size} repartidores)",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Color(0xFF0F172A),
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                            )

                            if (drivers.isEmpty()) {
                                EmptyAdminState(icon = Icons.Default.TwoWheeler, message = "No hay motorizados registrados en la plataforma")
                            } else {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    items(drivers) { driver ->
                                        AdminDriverCard(driver = driver)
                                    }
                                }
                            }
                        }
                    }

                    AdminTab.COMMERCE -> {
                        Column(modifier = Modifier.fillMaxSize()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Directorio de Comercios", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                                Button(
                                    onClick = { showCreateStoreDialog = true },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary)
                                ) {
                                    Icon(Icons.Default.AddBusiness, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("+ Registrar Comercio", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }

                            if (businessUsers.isEmpty()) {
                                EmptyAdminState(icon = Icons.Default.Storefront, message = "No hay comercios registrados aún en la base de datos")
                            } else {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize(),
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    items(businessUsers) { biz ->
                                        AdminCommerceCard(commerce = biz)
                                    }
                                }
                            }
                        }
                    }

                    AdminTab.USERS -> {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Surface(
                                modifier = Modifier.size(80.dp),
                                shape = CircleShape,
                                color = BluePrimary.copy(alpha = 0.1f)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.ManageAccounts, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(44.dp))
                                }
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Gestor Completo de Usuarios", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color(0xFF0F172A))
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                "Administra roles, aprobaciones de nuevos comercios/drivers y permisos de la plataforma.",
                                fontSize = 13.sp,
                                color = Color(0xFF64748B),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = onNavigateToUsers,
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                                modifier = Modifier.height(48.dp)
                            ) {
                                Icon(Icons.Default.Group, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Abrir Módulo de Usuarios y Permisos", fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    AdminTab.FINANCE -> {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            item {
                                Card(
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(20.dp)) {
                                        Text("Balance General de la Plataforma 📈", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0F172A))
                                        Spacer(modifier = Modifier.height(14.dp))

                                        FinanceRow("Ventas Totales Entregadas", "C$ ${String.format("%.2f", totalRevenue)}", BluePrimary)
                                        FinanceRow("Comisión Estimada (15%)", "C$ ${String.format("%.2f", totalRevenue * 0.15)}", Color(0xFF10B981))
                                        FinanceRow("Órdenes Completadas", "${orders.count { it.status.lowercase() == "delivered" }} pedidos", Color(0xFF475569))
                                        FinanceRow("Tarifas de Envío Totales", "C$ ${String.format("%.2f", orders.count { it.status.lowercase() == "delivered" } * 45.0)}", BlueSecondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ─── DIÁLOGOS ADMINISTRATIVOS ───

    // 1. Modal para Asignar Motorizado
    if (orderToAssign != null) {
        val order = orderToAssign!!
        AlertDialog(
            onDismissRequest = { orderToAssign = null },
            title = { Text("Asignar Motorizado a la Orden", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Selecciona un repartidor activo en Managua para la orden #${order.pedidoId.takeLast(6).uppercase()}.",
                        fontSize = 13.sp,
                        color = Color(0xFF475569)
                    )

                    if (drivers.isEmpty()) {
                        Text("No hay motorizados registrados disponibles.", color = Color.Red, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(drivers) { driver ->
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            coroutineScope.launch {
                                                onAsignarPedidoBackend(order.pedidoId, driver.uid)
                                                orderToAssign = null
                                                Toast.makeText(context, "Motorizado ${driver.nombre} asignado a la orden", Toast.LENGTH_SHORT).show()
                                            }
                                        },
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color(0xFFF8FAFC),
                                    border = BorderStroke(1.dp, Color(0xFFCBD5E1))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(10.dp)
                                                .background(if (driver.active) Color(0xFF10B981) else Color(0xFF94A3B8), CircleShape)
                                        )
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(driver.nombre, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                            Text(driver.telefono.ifEmpty { "Sin teléfono registrado" }, fontSize = 12.sp, color = Color(0xFF64748B))
                                        }
                                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = BluePrimary)
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { orderToAssign = null }) {
                    Text("Cancelar", fontWeight = FontWeight.Bold)
                }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color.White
        )
    }

    // 2. Modal para Registrar Nuevo Comercio en Tiempo Real desde Admin
    if (showCreateStoreDialog) {
        var storeName by remember { mutableStateOf("") }
        var storeCategory by remember { mutableStateOf("Restaurante") }
        var storePhone by remember { mutableStateOf("") }
        var storeAddress by remember { mutableStateOf("") }
        var isSavingStore by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { showCreateStoreDialog = false },
            title = { Text("Registrar Nuevo Comercio 🏪", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = storeName,
                        onValueChange = { storeName = it },
                        label = { Text("Nombre del Comercio *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp)
                    )
                    OutlinedTextField(
                        value = storeCategory,
                        onValueChange = { storeCategory = it },
                        label = { Text("Categoría (Ej. Restaurante, Farmacia)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp)
                    )
                    OutlinedTextField(
                        value = storePhone,
                        onValueChange = { storePhone = it },
                        label = { Text("Teléfono de Contacto") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp)
                    )
                    OutlinedTextField(
                        value = storeAddress,
                        onValueChange = { storeAddress = it },
                        label = { Text("Dirección del Local en Managua") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        shape = RoundedCornerShape(10.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (storeName.isBlank()) return@Button
                        isSavingStore = true
                        coroutineScope.launch {
                            try {
                                val newId = "biz_" + java.util.UUID.randomUUID().toString().take(8)
                                val storeData = mapOf(
                                    "uid" to newId,
                                    "nombre" to storeName,
                                    "name" to storeName,
                                    "comercioNombre" to storeName,
                                    "categoria" to storeCategory,
                                    "telefono" to storePhone,
                                    "direccion" to storeAddress,
                                    "rol" to "business",
                                    "role" to "business",
                                    "userType" to "business",
                                    "isFeatured" to true,
                                    "isActive" to true,
                                    "active" to true,
                                    "fechaRegistro" to com.google.firebase.Timestamp.now().toString()
                                )
                                db.collection("users").document(newId).set(storeData).await()
                                isSavingStore = false
                                showCreateStoreDialog = false
                                Toast.makeText(context, "¡Comercio $storeName registrado con éxito!", Toast.LENGTH_LONG).show()
                            } catch (e: Exception) {
                                isSavingStore = false
                                Toast.makeText(context, "Error al crear comercio: ${e.message}", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                    enabled = storeName.isNotBlank() && !isSavingStore
                ) {
                    if (isSavingStore) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White)
                    } else {
                        Text("Guardar Comercio", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreateStoreDialog = false }) { Text("Cancelar") }
            },
            shape = RoundedCornerShape(20.dp),
            containerColor = Color.White
        )
    }
}

// ─── COMPOSABLES DE TARJETAS ADMINISTRATIVAS ───

@Composable
private fun AdminKpiCard(
    title: String,
    value: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    bgColor: Color,
    accentColor: Color
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = bgColor),
        modifier = Modifier
            .width(160.dp)
            .shadow(1.dp, RoundedCornerShape(16.dp))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(20.dp))
                Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = accentColor)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
            Text(subtitle, fontSize = 10.sp, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun AdminOrderCard(
    order: Pedido,
    onAssignClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Orden #${order.pedidoId.takeLast(6).uppercase()}", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = Color(0xFF0F172A))
                    Text("Cliente: ${order.customerName.ifEmpty { "Cliente Activo" }}", fontSize = 12.sp, color = Color(0xFF64748B))
                    Text("Comercio: ${order.businessName.ifEmpty { "Comercio Local" }}", fontSize = 12.sp, color = BluePrimary, fontWeight = FontWeight.SemiBold)
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text("C$ ${String.format("%.2f", order.total)}", fontWeight = FontWeight.Black, fontSize = 17.sp, color = BluePrimary)
                    Text(order.paymentMethod.ifEmpty { "DELIVERY" }.uppercase(), fontSize = 10.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = Color(0xFFF1F5F9))
            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val st = order.status.lowercase()
                val (badgeBg, badgeText, label) = when (st) {
                    "pending" -> Triple(Color(0xFFFFF1F2), Color(0xFFE11938), "Sin Motorizado 🔴")
                    "ready" -> Triple(Color(0xFFEFF6FF), BluePrimary, "Listo en Cocina 🟡")
                    "in_transit" -> Triple(Color(0xFFFEF3C7), Color(0xFFD97706), "En Ruta 🛵")
                    "delivered" -> Triple(Color(0xFFECFDF5), Color(0xFF10B981), "Entregado 🟢")
                    else -> Triple(Color(0xFFF1F5F9), Color(0xFF475569), st.uppercase())
                }

                Surface(shape = RoundedCornerShape(8.dp), color = badgeBg) {
                    Text(label, color = badgeText, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                }

                Button(
                    onClick = onAssignClick,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = if (st == "pending") BluePrimary else Color(0xFFE2E8F0)),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Icon(Icons.Default.TwoWheeler, contentDescription = null, tint = if (st == "pending") Color.White else Color(0xFF475569), modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (st == "pending") "Asignar Driver" else "Reasignar", fontSize = 12.sp, color = if (st == "pending") Color.White else Color(0xFF475569), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun AdminDriverCard(driver: DriverUser) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(Brush.linearGradient(listOf(BluePrimary, BlueSecondary)), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(driver.nombre.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(driver.nombre, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                Text("Tel: ${driver.telefono.ifEmpty { "Sin teléfono" }}", fontSize = 11.sp, color = Color(0xFF64748B))
            }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = if (driver.active) Color(0xFFECFDF5) else Color(0xFFF1F5F9)
            ) {
                Text(
                    if (driver.active) "🟢 En Línea" else "⚪ Offline",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (driver.active) Color(0xFF10B981) else Color(0xFF64748B),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun AdminCommerceCard(commerce: AppUser) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(Color(0xFFEFF6FF), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Storefront, contentDescription = null, tint = BluePrimary, modifier = Modifier.size(24.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(commerce.nombre.ifEmpty { "Comercio Sin Nombre" }, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                Text("Tel: ${commerce.telefono.ifEmpty { "No especificado" }} • Email: ${commerce.email}", fontSize = 11.sp, color = Color(0xFF64748B), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = if (commerce.active) Color(0xFFECFDF5) else Color(0xFFFFF1F2)
            ) {
                Text(
                    if (commerce.active) "Activo 🟢" else "Pausado 🔴",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (commerce.active) Color(0xFF10B981) else Color(0xFFE11938),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun FinanceRow(label: String, value: String, valueColor: Color) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 13.sp, color = Color(0xFF475569), fontWeight = FontWeight.Medium)
        Text(value, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = valueColor)
    }
}

@Composable
private fun EmptyAdminState(icon: androidx.compose.ui.graphics.vector.ImageVector, message: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(48.dp))
            Spacer(modifier = Modifier.height(12.dp))
            Text(message, fontSize = 13.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
}
