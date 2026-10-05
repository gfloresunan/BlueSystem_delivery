package com.example.presentation.admin

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.BluePrimary
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class SupportTicketAdmin(
    val id: String = "",
    val customerId: String = "",
    val customerName: String = "",
    val subject: String = "",
    val category: String = "GENERAL",
    val priority: String = "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
    val status: String = "OPEN", // OPEN, IN_PROGRESS, RESOLVED, CLOSED
    val lastMessage: String = "",
    val createdAtMillis: Long = 0L,
    val updatedAtMillis: Long = 0L
)

data class TicketMessage(
    val id: String = "",
    val senderId: String = "",
    val senderRole: String = "CUSTOMER",
    val text: String = "",
    val createdAtMillis: Long = 0L
)

/**
 * MÓDULO 5: Centro de Soporte & Ayuda Enterprise (AdminSupportCenterScreen).
 *
 * Visualiza y gestiona tickets de soporte en tiempo real (/support_tickets),
 * soporta conversación interactiva en subcolección /messages, asignación de prioridades,
 * resolución y cierre con trazabilidad.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminSupportCenterScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }
    val currentAdminUid = auth.currentUser?.uid ?: "admin"

    var tickets by remember { mutableStateOf<List<SupportTicketAdmin>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedStatusFilter by remember { mutableStateOf("ALL") }
    var activeTicketForChat by remember { mutableStateOf<SupportTicketAdmin?>(null) }
    var chatMessages by remember { mutableStateOf<List<TicketMessage>>(emptyList()) }
    var messageInput by remember { mutableStateOf("") }

    // Listener de tickets
    DisposableEffect(Unit) {
        val listener = db.collection("support_tickets")
            .orderBy("updatedAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                isLoading = false
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val data = doc.data ?: return@mapNotNull null
                        SupportTicketAdmin(
                            id = doc.id,
                            customerId = data["customerId"] as? String ?: data["userId"] as? String ?: "",
                            customerName = data["customerName"] as? String ?: data["userName"] as? String ?: data["nombre"] as? String ?: "Usuario",
                            subject = data["subject"] as? String ?: data["asunto"] as? String ?: data["title"] as? String ?: "Sin asunto",
                            category = data["category"] as? String ?: "General",
                            priority = (data["priority"] as? String ?: "MEDIUM").uppercase(),
                            status = (data["status"] as? String ?: "OPEN").uppercase(),
                            lastMessage = data["lastMessage"] as? String ?: data["ultimoMensaje"] as? String ?: "",
                            createdAtMillis = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: System.currentTimeMillis(),
                            updatedAtMillis = (data["updatedAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: System.currentTimeMillis()
                        )
                    }
                    tickets = list
                }
            }

        onDispose { listener.remove() }
    }

    // Listener de mensajes del ticket seleccionado
    DisposableEffect(activeTicketForChat?.id) {
        val ticketId = activeTicketForChat?.id
        if (ticketId == null) {
            chatMessages = emptyList()
            return@DisposableEffect onDispose {}
        }

        val msgListener = db.collection("support_tickets").document(ticketId)
            .collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .limit(100)
            .addSnapshotListener { snapshot, _ ->
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val data = doc.data ?: return@mapNotNull null
                        TicketMessage(
                            id = doc.id,
                            senderId = data["senderId"] as? String ?: "",
                            senderRole = (data["senderRole"] as? String ?: "CUSTOMER").uppercase(),
                            text = data["text"] as? String ?: data["mensaje"] as? String ?: "",
                            createdAtMillis = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: 0L
                        )
                    }
                    chatMessages = list
                }
            }

        onDispose { msgListener.remove() }
    }

    val filteredTickets = remember(tickets, selectedStatusFilter) {
        when (selectedStatusFilter) {
            "OPEN" -> tickets.filter { it.status in listOf("OPEN", "ABIERTO") }
            "IN_PROGRESS" -> tickets.filter { it.status in listOf("IN_PROGRESS", "EN_ATENCION") }
            "RESOLVED" -> tickets.filter { it.status in listOf("RESOLVED", "RESUELTO", "CLOSED", "CERRADO") }
            else -> tickets
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            if (activeTicketForChat != null) "Ticket #${activeTicketForChat!!.id.take(8).uppercase()}" else "Centro de Soporte",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = Color.White
                        )
                        Text(
                            if (activeTicketForChat != null) activeTicketForChat!!.customerName else "Mesa de ayuda e incidencias",
                            fontSize = 11.sp,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (activeTicketForChat != null) {
                            activeTicketForChat = null
                        } else {
                            onBack()
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BluePrimary)
            )
        }
    ) { paddingValues ->
        if (activeTicketForChat != null) {
            // ── VISTA DE CONVERSACIÓN / CHAT DEL TICKET ───────────────────────
            val ticket = activeTicketForChat!!
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC))
            ) {
                // Header del ticket con estado y acciones rápidas
                Surface(
                    color = Color.White,
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(ticket.subject, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                            Text("Prioridad: ${ticket.priority} • Estado: ${ticket.status}", fontSize = 10.5.sp, color = Color(0xFF64748B))
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            if (ticket.status != "RESOLVED") {
                                Button(
                                    onClick = {
                                        coroutineScope.launch {
                                            db.collection("support_tickets").document(ticket.id).update("status", "RESOLVED").await()
                                            activeTicketForChat = activeTicketForChat?.copy(status = "RESOLVED")
                                            Toast.makeText(context, "Ticket marcado como Resuelto", Toast.LENGTH_SHORT).show()
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                    shape = RoundedCornerShape(6.dp)
                                ) {
                                    Text("Resolver", fontSize = 10.5.sp, color = Color.White)
                                }
                            }
                        }
                    }
                }

                // Lista de mensajes
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    contentPadding = PaddingValues(vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(chatMessages, key = { it.id }) { msg ->
                        val isAdmin = msg.senderRole in listOf("ADMIN", "SUPPORT", "SUPER_ADMIN")
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = if (isAdmin) Arrangement.End else Arrangement.Start
                        ) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (isAdmin) BluePrimary else Color.White,
                                border = if (isAdmin) null else BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                modifier = Modifier.widthIn(max = 280.dp)
                            ) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text(
                                        if (isAdmin) "Soporte BlueSystem" else ticket.customerName,
                                        fontSize = 9.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isAdmin) Color.White.copy(alpha = 0.8f) else Color(0xFF64748B)
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        msg.text,
                                        fontSize = 12.5.sp,
                                        color = if (isAdmin) Color.White else Color(0xFF0F172A)
                                    )
                                }
                            }
                        }
                    }
                }

                // Input para enviar respuesta
                Surface(
                    color = Color.White,
                    shadowElevation = 4.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = messageInput,
                            onValueChange = { messageInput = it },
                            placeholder = { Text("Escribe una respuesta...", fontSize = 12.sp) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(20.dp),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                unfocusedContainerColor = Color(0xFFF8FAFC),
                                focusedContainerColor = Color(0xFFF8FAFC)
                            )
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        IconButton(
                            onClick = {
                                if (messageInput.isNotBlank()) {
                                    val textToSend = messageInput.trim()
                                    messageInput = ""
                                    coroutineScope.launch {
                                        try {
                                            db.collection("support_tickets").document(ticket.id)
                                                .collection("messages").add(
                                                    mapOf(
                                                        "senderId" to currentAdminUid,
                                                        "senderRole" to "ADMIN",
                                                        "text" to textToSend,
                                                        "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                                    )
                                                ).await()

                                            db.collection("support_tickets").document(ticket.id).update(
                                                mapOf(
                                                    "lastMessage" to textToSend,
                                                    "status" to "IN_PROGRESS",
                                                    "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                                                )
                                            ).await()
                                        } catch (e: Exception) {
                                            Toast.makeText(context, "Error al enviar: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Enviar", tint = BluePrimary)
                        }
                    }
                }
            }
        } else {
            // ── VISTA DE LISTA DE TICKETS ─────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC))
            ) {
                // Filtros
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        FilterChip(
                            selected = selectedStatusFilter == "ALL",
                            onClick = { selectedStatusFilter = "ALL" },
                            label = { Text("Todos (${tickets.size})", fontSize = 11.sp) }
                        )
                    }
                    item {
                        FilterChip(
                            selected = selectedStatusFilter == "OPEN",
                            onClick = { selectedStatusFilter = "OPEN" },
                            label = { Text("Abiertos (${tickets.count { it.status in listOf("OPEN", "ABIERTO") }})", fontSize = 11.sp) }
                        )
                    }
                    item {
                        FilterChip(
                            selected = selectedStatusFilter == "IN_PROGRESS",
                            onClick = { selectedStatusFilter = "IN_PROGRESS" },
                            label = { Text("En Atención (${tickets.count { it.status in listOf("IN_PROGRESS", "EN_ATENCION") }})", fontSize = 11.sp) }
                        )
                    }
                    item {
                        FilterChip(
                            selected = selectedStatusFilter == "RESOLVED",
                            onClick = { selectedStatusFilter = "RESOLVED" },
                            label = { Text("Resueltos (${tickets.count { it.status in listOf("RESOLVED", "RESUELTO", "CLOSED") }})", fontSize = 11.sp) }
                        )
                    }
                }

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = BluePrimary)
                    }
                } else if (filteredTickets.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.SupportAgent, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("No hay tickets de soporte en esta vista", color = Color(0xFF94A3B8), fontSize = 13.sp)
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(filteredTickets, key = { it.id }) { ticket ->
                            SupportTicketCard(
                                ticket = ticket,
                                onClick = { activeTicketForChat = ticket }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SupportTicketCard(
    ticket: SupportTicketAdmin,
    onClick: () -> Unit
) {
    val priorityColor = when (ticket.priority) {
        "CRITICAL" -> Color(0xFFDC2626)
        "HIGH" -> Color(0xFFEA580C)
        "MEDIUM" -> Color(0xFFD97706)
        else -> Color(0xFF10B981)
    }

    val statusColor = when (ticket.status) {
        "RESOLVED", "CLOSED" -> Color(0xFF10B981)
        "IN_PROGRESS" -> Color(0xFF2563EB)
        else -> Color(0xFFDC2626)
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
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
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFFEF3C7)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.ConfirmationNumber, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(18.dp))
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(ticket.subject, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(ticket.customerName, fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                }

                Surface(
                    color = statusColor.copy(alpha = 0.12f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        ticket.status,
                        color = statusColor,
                        fontSize = 8.5.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (ticket.lastMessage.isNotBlank()) {
                Text(
                    "Último mensaje: ${ticket.lastMessage}",
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = priorityColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        "Prioridad ${ticket.priority}",
                        color = priorityColor,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                    )
                }
                Text("Tocar para responder →", fontSize = 11.sp, color = BluePrimary, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
