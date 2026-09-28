package com.example.presentation.kitchen

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.domain.engine.kds.*
import com.example.domain.model.order.*
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue

/**
 * Pantalla Principal KDS: Tablero Kanban de Cocina Enterprise v3.0 (Hito 14).
 * Presenta 6 columnas Kanban: NUEVOS, PREPARANDO, ENSAMBLANDO, LISTOS, DESPACHADOS, CANCELADOS
 * con soporte para filtrado por Estación de Cocina y alertas de SLA.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KitchenDashboardScreen(
    restaurantId: String = "rest_demo",
    onBack: () -> Unit = {}
) {
    val queueEngine = remember { KdsQueueEngine() }
    val assemblyEngine = remember { KitchenAssemblyEngine() }
    val slaEngine = remember { KitchenSLAEngine() }
    val timerEngine = remember { KitchenTimerEngine() }

    var selectedStation by remember { mutableStateOf<KitchenStation?>(null) }
    var ticketsState by remember { mutableStateOf<List<KdsTicket>>(emptyList()) }

    // Sincronización en Tiempo Real desde Firestore /orders (GAP-002 E2E Hardening)
    DisposableEffect(restaurantId) {
        val db = FirebaseFirestore.getInstance()
        val listener = db.collection("orders")
            .whereEqualTo("businessId", restaurantId)
            .addSnapshotListener { snapshot, error ->
                if (error != null || snapshot == null) return@addSnapshotListener

                val newTickets = mutableListOf<KdsTicket>()
                for (doc in snapshot.documents) {
                    val rawStatus = doc.getString("status")?.trim()?.lowercase() ?: "pending"
                    val itemsRaw = doc.get("items") as? List<*> ?: emptyList<Any>()
                    val parsedItems = itemsRaw.mapNotNull { item ->
                        val map = item as? Map<*, *> ?: return@mapNotNull null
                        val name = (map["productName"] as? String) ?: (map["name"] as? String) ?: "Producto"
                        val qty = (map["quantity"] as? Number)?.toInt() ?: 1
                        val id = (map["productId"] as? String) ?: ""
                        val station = when {
                            name.contains("burger", ignoreCase = true) || name.contains("carne", ignoreCase = true) || name.contains("pollo", ignoreCase = true) -> KitchenStation.GRILL
                            name.contains("papa", ignoreCase = true) || name.contains("frito", ignoreCase = true) || name.contains("aros", ignoreCase = true) -> KitchenStation.FRYER
                            name.contains("soda", ignoreCase = true) || name.contains("jugo", ignoreCase = true) || name.contains("bebida", ignoreCase = true) || name.contains("smoothie", ignoreCase = true) -> KitchenStation.DRINKS
                            name.contains("postre", ignoreCase = true) || name.contains("helado", ignoreCase = true) -> KitchenStation.DESSERT
                            name.contains("ensalada", ignoreCase = true) -> KitchenStation.COLD_PREP
                            else -> KitchenStation.GRILL
                        }
                        OrderItem(id = id, productName = name, quantity = qty, targetStation = station)
                    }

                    val opStatus = when (rawStatus) {
                        "pending", "pendiente", "payment_verifying" -> OperationalStatus.QUEUED
                        "preparing", "en_preparacion", "preparando" -> OperationalStatus.PREPARING
                        "assembling", "ensamblando" -> OperationalStatus.ASSEMBLING
                        "ready", "listo", "esperando_repartidor" -> OperationalStatus.READY
                        "in_transit", "en_camino", "en_ruta", "assigned", "asignado" -> OperationalStatus.OUT_FOR_DELIVERY
                        "delivered", "entregado", "completed" -> OperationalStatus.DELIVERED
                        else -> OperationalStatus.QUEUED
                    }

                    val commStatus = when (rawStatus) {
                        "cancelled", "cancelado", "rejected" -> CommercialStatus.CANCELLED
                        else -> CommercialStatus.CONFIRMED
                    }

                    val order = Order(
                        id = doc.id,
                        restaurantId = restaurantId,
                        priority = OrderPriority.NORMAL,
                        commercialStatus = commStatus,
                        operationalStatus = opStatus,
                        items = parsedItems
                    )

                    newTickets.add(
                        KdsTicket(
                            ticketId = "tkt_${doc.id}",
                            order = order,
                            station = selectedStation ?: KitchenStation.GRILL,
                            status = opStatus
                        )
                    )
                }

                ticketsState = if (selectedStation != null) {
                    newTickets.filter { it.station == selectedStation || it.order.items.any { item -> item.targetStation == selectedStation } }
                } else {
                    newTickets
                }
            }

        onDispose {
            listener.remove()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Kitchen Display System (KDS)", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("Tablero Kanban de Operaciones en Cocina", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFF121212))
                .padding(12.dp)
        ) {
            // Barra de Filtro por Estaciones de Cocina
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedStation == null,
                        onClick = { selectedStation = null; ticketsState = queueEngine.getQueueByStation(restaurantId) },
                        label = { Text("Todas las Estaciones") }
                    )
                }
                items(KitchenStation.values()) { station ->
                    FilterChip(
                        selected = selectedStation == station,
                        onClick = {
                            selectedStation = station
                            ticketsState = queueEngine.getQueueByStation(restaurantId, station)
                        },
                        label = { Text(station.name) }
                    )
                }
            }

            val sortedTickets = slaEngine.sortQueueBySLA(ticketsState)

            // Tablero Kanban 6 Columnas
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item { KanbanColumn("🆕 NUEVOS", sortedTickets.filter { it.status == OperationalStatus.QUEUED }, queueEngine, timerEngine) { ticketsState = queueEngine.getQueueByStation(restaurantId, selectedStation) } }
                item { KanbanColumn("🍳 PREPARANDO", sortedTickets.filter { it.status == OperationalStatus.PREPARING }, queueEngine, timerEngine) { ticketsState = queueEngine.getQueueByStation(restaurantId, selectedStation) } }
                item { KanbanColumn("🍱 ENSAMBLANDO", sortedTickets.filter { it.status == OperationalStatus.ASSEMBLING }, queueEngine, timerEngine) { ticketsState = queueEngine.getQueueByStation(restaurantId, selectedStation) } }
                item { KanbanColumn("📦 LISTOS", sortedTickets.filter { it.status == OperationalStatus.READY }, queueEngine, timerEngine) { ticketsState = queueEngine.getQueueByStation(restaurantId, selectedStation) } }
                item { KanbanColumn("🚚 DESPACHADOS", sortedTickets.filter { it.status == OperationalStatus.OUT_FOR_DELIVERY }, queueEngine, timerEngine) { ticketsState = queueEngine.getQueueByStation(restaurantId, selectedStation) } }
                item { KanbanColumn("❌ CANCELADOS", sortedTickets.filter { it.order.commercialStatus == CommercialStatus.CANCELLED }, queueEngine, timerEngine) { ticketsState = queueEngine.getQueueByStation(restaurantId, selectedStation) } }
            }
        }
    }
}

@Composable
fun KanbanColumn(
    title: String,
    tickets: List<KdsTicket>,
    queueEngine: KdsQueueEngine,
    timerEngine: KitchenTimerEngine,
    onQueueUpdated: () -> Unit
) {
    Surface(
        modifier = Modifier
            .width(280.dp)
            .fillMaxHeight(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Badge(containerColor = MaterialTheme.colorScheme.primary) {
                    Text(tickets.size.toString(), color = Color.White)
                }
            }

            HorizontalDivider()

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(top = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(tickets) { tkt ->
                    KdsTicketCard(tkt, queueEngine, timerEngine, onQueueUpdated)
                }
            }
        }
    }
}

@Composable
fun KdsTicketCard(
    ticket: KdsTicket,
    queueEngine: KdsQueueEngine,
    timerEngine: KitchenTimerEngine,
    onQueueUpdated: () -> Unit
) {
    val timerMetrics = timerEngine.calculateTimerMetrics(ticket.order)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (timerMetrics.isDelayed) Color(0xFF3E1B1B) else MaterialTheme.colorScheme.surface
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(ticket.order.id, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                AssistChip(
                    onClick = {},
                    label = { Text(ticket.order.priority.name, fontSize = 10.sp) },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = if (ticket.order.priority == OrderPriority.VIP) Color(0xFFFFD700) else MaterialTheme.colorScheme.secondaryContainer
                    )
                )
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text("Estación: ${ticket.station.name}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Tiempo transcurrido: ${timerMetrics.elapsedTimeMinutes} min", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)

            Spacer(modifier = Modifier.height(8.dp))
            ticket.order.items.forEach { item ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("• ${item.quantity}x ${item.productName}", fontSize = 13.sp)
                    Text(item.targetStation.name, fontSize = 10.sp, color = Color.Gray)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                if (ticket.status == OperationalStatus.QUEUED) {
                    Button(
                        onClick = {
                            queueEngine.start(ticket.ticketId)
                            FirebaseFirestore.getInstance().collection("orders").document(ticket.order.id)
                                .update(mapOf("status" to "preparing", "updatedAt" to FieldValue.serverTimestamp()))
                            onQueueUpdated()
                        },
                        modifier = Modifier.height(32.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Text("Iniciar", fontSize = 12.sp)
                    }
                } else if (ticket.status == OperationalStatus.PREPARING) {
                    Button(
                        onClick = {
                            queueEngine.ready(ticket.ticketId)
                            FirebaseFirestore.getInstance().collection("orders").document(ticket.order.id)
                                .update(mapOf("status" to "ready", "updatedAt" to FieldValue.serverTimestamp()))
                            onQueueUpdated()
                        },
                        modifier = Modifier.height(32.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Text("Finalizar", fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
