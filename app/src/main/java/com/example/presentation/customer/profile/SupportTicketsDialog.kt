package com.example.presentation.customer.profile

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.example.ui.theme.BlueSecondary
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

enum class SupportDialogView {
    TICKET_LIST,
    NEW_TICKET_FORM,
    CHAT_THREAD
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportTicketsDialog(
    tickets: List<SupportTicket>,
    messages: List<SupportTicketMessage>,
    selectedTicketId: String?,
    onDismiss: () -> Unit,
    onCreateTicket: (subject: String, message: String, onComplete: (Boolean, String?) -> Unit) -> Unit,
    onSelectTicket: (ticketId: String) -> Unit,
    onSendMessage: (ticketId: String, text: String, onComplete: (Boolean, String?) -> Unit) -> Unit
) {
    val context = LocalContext.current
    var currentView by remember { mutableStateOf(if (selectedTicketId != null) SupportDialogView.CHAT_THREAD else SupportDialogView.TICKET_LIST) }
    var activeTicketId by remember { mutableStateOf(selectedTicketId) }

    LaunchedEffect(selectedTicketId) {
        if (selectedTicketId != null) {
            activeTicketId = selectedTicketId
        }
    }

    var newSubject by remember { mutableStateOf("") }
    var newInitialMessage by remember { mutableStateOf("") }
    var isSubmittingTicket by remember { mutableStateOf(false) }

    var chatInputText by remember { mutableStateOf("") }
    var isSendingChatMessage by remember { mutableStateOf(false) }

    val activeTicket = remember(tickets, activeTicketId) {
        tickets.find { it.id == activeTicketId || it.ticketId == activeTicketId }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (currentView != SupportDialogView.TICKET_LIST) {
                        IconButton(
                            onClick = {
                                currentView = SupportDialogView.TICKET_LIST
                                activeTicketId = null
                            },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Volver",
                                tint = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        Spacer(modifier = Modifier.width(4.dp))
                    } else {
                        Icon(
                            imageVector = Icons.Default.HeadsetMic,
                            contentDescription = null,
                            tint = BluePrimary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }

                    Text(
                        text = when (currentView) {
                            SupportDialogView.TICKET_LIST -> "Soporte & Ayuda 🎧"
                            SupportDialogView.NEW_TICKET_FORM -> "Nuevo Ticket"
                            SupportDialogView.CHAT_THREAD -> "Ticket #${activeTicket?.id?.take(8)?.uppercase() ?: "SOPORTE"}"
                        },
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                if (currentView == SupportDialogView.TICKET_LIST) {
                    IconButton(
                        onClick = { currentView = SupportDialogView.NEW_TICKET_FORM },
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(BluePrimary)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Crear Ticket",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        },
        text = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(440.dp)
            ) {
                when (currentView) {
                    SupportDialogView.TICKET_LIST -> {
                        if (tickets.isEmpty()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ChatBubbleOutline,
                                    contentDescription = null,
                                    modifier = Modifier.size(56.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "No tienes tickets de soporte activos.",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "¿Tienes algún problema con un pedido o consulta? Crea un ticket y te atenderemos en vivo.",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Button(
                                    onClick = { currentView = SupportDialogView.NEW_TICKET_FORM },
                                    colors = ButtonDefaults.buttonColors(containerColor = BluePrimary),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Crear Nuevo Ticket", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(tickets) { ticket ->
                                    val statusColor = resolveStatusColor(ticket.status)
                                    val unread = ticket.unreadByCustomer

                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                activeTicketId = ticket.id
                                                onSelectTicket(ticket.id)
                                                currentView = SupportDialogView.CHAT_THREAD
                                            },
                                        shape = RoundedCornerShape(14.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = "#${ticket.id.take(8).uppercase()}",
                                                    fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                                                    fontSize = 11.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                ) {
                                                    if (unread > 0) {
                                                        Box(
                                                            modifier = Modifier
                                                                .clip(CircleShape)
                                                                .background(Color(0xFFEF4444))
                                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                                        ) {
                                                            Text(
                                                                text = "$unread nuevo",
                                                                fontSize = 9.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                color = Color.White
                                                            )
                                                        }
                                                    }
                                                    Box(
                                                        modifier = Modifier
                                                            .clip(RoundedCornerShape(6.dp))
                                                            .background(statusColor.copy(alpha = 0.15f))
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = resolveStatusLabel(ticket.status),
                                                            fontSize = 10.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = statusColor
                                                        )
                                                    }
                                                }
                                            }
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = ticket.subject.ifBlank { "Sin Asunto" },
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onSurface,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                text = ticket.lastMessage.ifBlank { "Toca para abrir la conversación" },
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                maxLines = 2,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    SupportDialogView.NEW_TICKET_FORM -> {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "Describe tu solicitud para que nuestro equipo de soporte pueda ayudarte de inmediato.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            OutlinedTextField(
                                value = newSubject,
                                onValueChange = { newSubject = it },
                                label = { Text("Asunto") },
                                placeholder = { Text("Ej: Consulta sobre mi pedido o recarga") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp)
                            )

                            OutlinedTextField(
                                value = newInitialMessage,
                                onValueChange = { newInitialMessage = it },
                                label = { Text("Mensaje detallado") },
                                placeholder = { Text("Explica detalladamente tu caso...") },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp),
                                maxLines = 6,
                                shape = RoundedCornerShape(12.dp)
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            Button(
                                onClick = {
                                    if (newSubject.isBlank() || newInitialMessage.isBlank()) {
                                        Toast.makeText(context, "Por favor completa todos los campos", Toast.LENGTH_SHORT).show()
                                        return@Button
                                    }
                                    isSubmittingTicket = true
                                    onCreateTicket(newSubject, newInitialMessage) { success, ticketIdOrErr ->
                                        isSubmittingTicket = false
                                        if (success) {
                                            Toast.makeText(context, "Ticket creado exitosamente.", Toast.LENGTH_SHORT).show()
                                            if (ticketIdOrErr != null && ticketIdOrErr.isNotBlank()) {
                                                activeTicketId = ticketIdOrErr
                                                onSelectTicket(ticketIdOrErr)
                                            }
                                            newSubject = ""
                                            newInitialMessage = ""
                                            currentView = SupportDialogView.CHAT_THREAD
                                        } else {
                                            Toast.makeText(context, ticketIdOrErr ?: "Error al crear ticket", Toast.LENGTH_LONG).show()
                                        }
                                    }
                                },
                                enabled = !isSubmittingTicket,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = BluePrimary)
                            ) {
                                if (isSubmittingTicket) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                                } else {
                                    Text("Enviar Solicitud", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    SupportDialogView.CHAT_THREAD -> {
                        val listState = rememberLazyListState()
                        val coroutineScope = rememberCoroutineScope()

                        LaunchedEffect(messages.size) {
                            if (messages.isNotEmpty()) {
                                listState.animateScrollToItem(messages.size - 1)
                            }
                        }

                        Column(modifier = Modifier.fillMaxSize()) {
                            // Subheader con estado del ticket
                            activeTicket?.let { ticket ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = ticket.subject,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f)
                                    )
                                    val statusColor = resolveStatusColor(ticket.status)
                                    Text(
                                        text = resolveStatusLabel(ticket.status),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = statusColor
                                    )
                                }
                            }

                            // Mensajes scrolleables
                            LazyColumn(
                                state = listState,
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                                    .padding(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(messages) { msg ->
                                    val isMe = msg.senderRole.uppercase() == "CUSTOMER"
                                    val timeStr = msg.createdAt?.toDate()?.let {
                                        SimpleDateFormat("HH:mm", Locale.getDefault()).format(it)
                                    } ?: ""

                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalAlignment = if (isMe) Alignment.End else Alignment.Start
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .widthIn(max = 240.dp)
                                                .clip(
                                                    RoundedCornerShape(
                                                        topStart = 14.dp,
                                                        topEnd = 14.dp,
                                                        bottomStart = if (isMe) 14.dp else 2.dp,
                                                        bottomEnd = if (isMe) 2.dp else 14.dp
                                                    )
                                                )
                                                .background(if (isMe) BluePrimary else MaterialTheme.colorScheme.surface)
                                                .padding(10.dp)
                                        ) {
                                            Column {
                                                if (!isMe) {
                                                    Text(
                                                        text = "Soporte BlueSystem 🎧",
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = BlueSecondary
                                                    )
                                                    Spacer(modifier = Modifier.height(2.dp))
                                                }
                                                Text(
                                                    text = msg.text,
                                                    fontSize = 12.sp,
                                                    color = if (isMe) Color.White else MaterialTheme.colorScheme.onSurface
                                                )
                                                if (timeStr.isNotBlank()) {
                                                    Spacer(modifier = Modifier.height(2.dp))
                                                    Text(
                                                        text = timeStr,
                                                        fontSize = 9.sp,
                                                        color = if (isMe) Color.White.copy(alpha = 0.7f) else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                                        modifier = Modifier.align(Alignment.End)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Input bar
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                OutlinedTextField(
                                    value = chatInputText,
                                    onValueChange = { chatInputText = it },
                                    placeholder = { Text("Escribe tu respuesta...", fontSize = 12.sp) },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp),
                                    maxLines = 3
                                )
                                IconButton(
                                    onClick = {
                                        val text = chatInputText.trim()
                                        val targetId = activeTicketId ?: selectedTicketId ?: tickets.firstOrNull()?.id ?: return@IconButton
                                        if (text.isBlank()) return@IconButton

                                        isSendingChatMessage = true
                                        chatInputText = ""
                                        onSendMessage(targetId, text) { success, _ ->
                                            isSendingChatMessage = false
                                        }
                                    },
                                    enabled = !isSendingChatMessage && chatInputText.isNotBlank(),
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                        .background(if (chatInputText.isNotBlank()) BluePrimary else MaterialTheme.colorScheme.surfaceVariant)
                                ) {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.Send,
                                        contentDescription = "Enviar",
                                        tint = if (chatInputText.isNotBlank()) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cerrar", fontWeight = FontWeight.Bold)
            }
        },
        shape = RoundedCornerShape(20.dp),
        containerColor = MaterialTheme.colorScheme.surface
    )
}

private fun resolveStatusColor(status: String): Color {
    return when (status.uppercase()) {
        "OPEN" -> Color(0xFF10B981)
        "IN_PROGRESS" -> Color(0xFF8B5CF6)
        "WAITING_CUSTOMER" -> Color(0xFF3B82F6)
        "WAITING_ADMIN" -> Color(0xFFF59E0B)
        "RESOLVED" -> Color(0xFF64748B)
        "CLOSED" -> Color(0xFFEF4444)
        else -> Color(0xFF10B981)
    }
}

private fun resolveStatusLabel(status: String): String {
    return when (status.uppercase()) {
        "OPEN" -> "Abierto"
        "IN_PROGRESS" -> "En Atención"
        "WAITING_CUSTOMER" -> "Esperando tu respuesta"
        "WAITING_ADMIN" -> "En espera de agente"
        "RESOLVED" -> "Resuelto ✓"
        "CLOSED" -> "Cerrado"
        else -> status
    }
}
