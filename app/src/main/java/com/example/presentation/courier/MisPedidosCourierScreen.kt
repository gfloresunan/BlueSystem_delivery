package com.example.presentation.courier

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.PedidoOfrecido
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MisPedidosCourierScreen(
    assignedOrders: List<PedidoOfrecido>,
    activeRouteOrder: PedidoOfrecido?,
    historyOrders: List<PedidoOfrecido>,
    onSelectOrder: (orderId: String) -> Unit,
    onNavigateToRoute: (pedido: PedidoOfrecido) -> Unit,
    onBack: () -> Unit
) {
    var selectedSectionTab by remember { mutableIntStateOf(0) } // 0: Activos, 1: En Ruta, 2: Completados
    var serviceTypeFilter by remember { mutableStateOf("ALL") } // ALL, COMMERCE, X_TO_Y

    val filterByService = { list: List<PedidoOfrecido> ->
        when (serviceTypeFilter) {
            "COMMERCE" -> list.filter { it.serviceType != "X_TO_Y_DELIVERY" }
            "X_TO_Y" -> list.filter { it.serviceType == "X_TO_Y_DELIVERY" }
            else -> list
        }
    }

    val activeAssignedOrders = remember(assignedOrders, serviceTypeFilter) {
        val base = assignedOrders.filter { it.status.lowercase() in listOf("ready", "listo", "assigned", "asignado", "courier_accepted") }
        filterByService(base)
    }

    val completedOrders = remember(historyOrders, serviceTypeFilter) {
        val base = historyOrders.filter { it.status.lowercase() in listOf("completed", "completado", "delivered", "entregado") }
        filterByService(base)
    }

    val effectiveActiveRoute = remember(activeRouteOrder, serviceTypeFilter) {
        if (activeRouteOrder == null) null
        else if (serviceTypeFilter == "COMMERCE" && activeRouteOrder.serviceType == "X_TO_Y_DELIVERY") null
        else if (serviceTypeFilter == "X_TO_Y" && activeRouteOrder.serviceType != "X_TO_Y_DELIVERY") null
        else activeRouteOrder
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF020617))
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF0F172A))
                    .border(1.dp, Color(0xFF1E293B), CircleShape)
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Color.White)
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "📦 MIS SERVICIOS",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp
                )
                Text(
                    text = "Asignaciones exclusivas: Comercios y Encomiendas",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Filtro de Servicio: Todos / 🛍️ Comercios / 📦 Encomiendas X→Y
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = serviceTypeFilter == "ALL",
                onClick = { serviceTypeFilter = "ALL" },
                label = { Text("Todos", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF6366F1),
                    selectedLabelColor = Color.White,
                    containerColor = Color(0xFF0F172A),
                    labelColor = Color(0xFF94A3B8)
                )
            )
            FilterChip(
                selected = serviceTypeFilter == "COMMERCE",
                onClick = { serviceTypeFilter = "COMMERCE" },
                label = { Text("🛍️ Comercios", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF3B82F6),
                    selectedLabelColor = Color.White,
                    containerColor = Color(0xFF0F172A),
                    labelColor = Color(0xFF94A3B8)
                )
            )
            FilterChip(
                selected = serviceTypeFilter == "X_TO_Y",
                onClick = { serviceTypeFilter = "X_TO_Y" },
                label = { Text("📦 Encomiendas", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF059669),
                    selectedLabelColor = Color.White,
                    containerColor = Color(0xFF0F172A),
                    labelColor = Color(0xFF94A3B8)
                )
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Tab Selector Sub-Navegación
        TabRow(
            selectedTabIndex = selectedSectionTab,
            containerColor = Color(0xFF0F172A),
            contentColor = Color.White,
            indicator = { tabPositions ->
                if (selectedSectionTab < tabPositions.size) {
                    TabRowDefaults.SecondaryIndicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedSectionTab]),
                        color = Color(0xFF6366F1)
                    )
                }
            },
            divider = { HorizontalDivider(color = Color(0xFF1E293B)) }
        ) {
            Tab(
                selected = selectedSectionTab == 0,
                onClick = { selectedSectionTab = 0 },
                text = {
                    Text(
                        "Activos (${activeAssignedOrders.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = if (selectedSectionTab == 0) Color(0xFF818CF8) else Color(0xFF64748B)
                    )
                }
            )
            Tab(
                selected = selectedSectionTab == 1,
                onClick = { selectedSectionTab = 1 },
                text = {
                    Text(
                        "En Ruta (${if (effectiveActiveRoute != null) 1 else 0})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = if (selectedSectionTab == 1) Color(0xFF818CF8) else Color(0xFF64748B)
                    )
                }
            )
            Tab(
                selected = selectedSectionTab == 2,
                onClick = { selectedSectionTab = 2 },
                text = {
                    Text(
                        "Completados (${completedOrders.size})",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = if (selectedSectionTab == 2) Color(0xFF818CF8) else Color(0xFF64748B)
                    )
                }
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Content
        when (selectedSectionTab) {
            0 -> {
                // Section: ACTIVOS / ASIGNADOS
                if (activeAssignedOrders.isEmpty()) {
                    EmptyOrdersState(message = "No tienes servicios asignados pendientes de iniciar")
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(activeAssignedOrders, key = { it.id }) { pedido ->
                            CourierOrderCard(
                                pedido = pedido,
                                badgeText = if (pedido.serviceType == "X_TO_Y_DELIVERY") "ENCOMIENDA ASIGNADA" else "ASIGNADO A TI",
                                badgeBg = if (pedido.serviceType == "X_TO_Y_DELIVERY") Color(0xFF059669).copy(alpha = 0.2f) else Color(0xFF10B981).copy(alpha = 0.2f),
                                badgeColor = if (pedido.serviceType == "X_TO_Y_DELIVERY") Color(0xFF34D399) else Color(0xFF34D399),
                                primaryActionText = if (pedido.serviceType == "X_TO_Y_DELIVERY") "INICIAR ENCOMIENDA 📦" else "IR A RUTA 🚚",
                                onPrimaryAction = { onNavigateToRoute(pedido) }
                            )
                        }
                    }
                }
            }
            1 -> {
                // Section: EN RUTA
                if (effectiveActiveRoute == null) {
                    EmptyOrdersState(message = "No tienes ningún servicio actualmente en ruta activa")
                } else {
                    Column(modifier = Modifier.fillMaxSize()) {
                        CourierOrderCard(
                            pedido = effectiveActiveRoute,
                            badgeText = if (effectiveActiveRoute.serviceType == "X_TO_Y_DELIVERY") "ENCOMIENDA EN CURSO 📦" else "EN RUTA ACTIVA 🚚",
                            badgeBg = Color(0xFF3B82F6).copy(alpha = 0.2f),
                            badgeColor = Color(0xFF60A5FA),
                            primaryActionText = "ABRIR NAVEGACIÓN Y MAPA 📍",
                            onPrimaryAction = { onNavigateToRoute(effectiveActiveRoute) }
                        )
                    }
                }
            }
            2 -> {
                // Section: COMPLETADOS
                if (completedOrders.isEmpty()) {
                    EmptyOrdersState(message = "No has completado entregas con el filtro seleccionado")
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(completedOrders, key = { it.id }) { pedido ->
                            CourierOrderCard(
                                pedido = pedido,
                                badgeText = if (pedido.serviceType == "X_TO_Y_DELIVERY") "ENCOMIENDA ENTREGADA ✅" else "ENTREGADO ✅",
                                badgeBg = Color(0xFF10B981).copy(alpha = 0.2f),
                                badgeColor = Color(0xFF34D399),
                                primaryActionText = "VER DETALLES",
                                onPrimaryAction = { onSelectOrder(pedido.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CourierOrderCard(
    pedido: PedidoOfrecido,
    badgeText: String,
    badgeBg: Color,
    badgeColor: Color,
    primaryActionText: String,
    onPrimaryAction: () -> Unit
) {
    val isXToY = pedido.serviceType == "X_TO_Y_DELIVERY"
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFF0F172A),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (isXToY) Color(0xFF059669).copy(alpha = 0.4f) else Color(0xFF1E293B)),
        shadowElevation = 6.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header Línea 1: ID + Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (isXToY) "Encomienda #${pedido.displayOrderCode.removePrefix("#")}" else "Pedido #${pedido.displayOrderCode.removePrefix("#")}",
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    color = Color.White
                )
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = badgeBg,
                    border = androidx.compose.foundation.BorderStroke(1.dp, badgeColor.copy(alpha = 0.4f))
                ) {
                    Text(
                        text = badgeText,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = badgeColor,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Línea 2: Ganancia Destacada del Motorizado (Centrada y en Grande)
            val isCompleted = pedido.status.lowercase() in listOf("delivered", "completed", "entregado", "completado")
            val displayEarnings = if (isCompleted && pedido.courierTotalEarnings > 0.0) {
                pedido.courierTotalEarnings
            } else {
                pedido.gananciaRepartidor
            }

            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color(0xFF10B981).copy(alpha = 0.12f),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981).copy(alpha = 0.3f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp, horizontal = 12.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Pago de este Delivery: ",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF94A3B8)
                    )
                    Text(
                        text = "C$ ${String.format(Locale.US, "%.2f", displayEarnings)}",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = Color(0xFF34D399)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = Color(0xFF1E293B))
            Spacer(modifier = Modifier.height(12.dp))

            if (isXToY) {
                // Pickup Info (Punto X)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFFF59E0B).copy(alpha = 0.2f),
                        modifier = Modifier.size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(16.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (pedido.senderName.isNotBlank()) "Punto X (Remitente: ${pedido.senderName})" else "Punto X (Recogida)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color.White
                        )
                        Text(
                            text = pedido.comercioDireccion.ifBlank { "Dirección de recogida" },
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Delivery Info (Punto Y)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFF10B981).copy(alpha = 0.2f),
                        modifier = Modifier.size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(16.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (pedido.recipientName.isNotBlank()) "Punto Y (Destinatario: ${pedido.recipientName})" else "Punto Y (Entrega)",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color(0xFFCBD5E1)
                        )
                        Text(
                            text = pedido.clienteDireccion.ifBlank { "Dirección de entrega" },
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                if (pedido.packageDescription.isNotBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "📦 ${pedido.packageDescription}",
                        fontSize = 11.sp,
                        color = Color(0xFF64748B),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))
                val isRecipientPayer = pedido.payer == "RECIPIENT"
                Text(
                    text = if (isRecipientPayer) "💰 Cobro: Destinatario Paga C$ ${String.format("%.2f", pedido.gananciaRepartidor)}" else "✓ Remitente ya pagó (No cobrar)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isRecipientPayer) Color(0xFFFBBF24) else Color(0xFF34D399)
                )
            } else {
                // Pickup Info (Commerce)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFF6366F1).copy(alpha = 0.2f),
                        modifier = Modifier.size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Store, contentDescription = null, tint = Color(0xFF818CF8), modifier = Modifier.size(16.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = pedido.comercioNombre.ifBlank { "Comercio Aliado" },
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color.White
                        )
                        Text(
                            text = pedido.comercioDireccion.ifBlank { "Dirección de recogida" },
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Delivery Info (Commerce Customer)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFF10B981).copy(alpha = 0.2f),
                        modifier = Modifier.size(28.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(16.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Cliente / Destino",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Color(0xFFCBD5E1)
                        )
                        Text(
                            text = pedido.clienteDireccion.ifBlank { "Dirección de entrega" },
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action button
            Button(
                onClick = onPrimaryAction,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isXToY) Color(0xFF059669) else Color(0xFF6366F1)
                )
            ) {
                Text(primaryActionText, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
            }
        }
    }
}

@Composable
private fun EmptyOrdersState(message: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.DirectionsBike,
                contentDescription = null,
                tint = Color(0xFF334155),
                modifier = Modifier.size(56.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = message,
                color = Color(0xFF64748B),
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}
