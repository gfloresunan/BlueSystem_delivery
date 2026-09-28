package com.example.presentation.customer.profile

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.theme.BluePrimary
import com.example.ui.theme.BlueSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerHelpScreen(
    onBack: () -> Unit,
    viewModel: ProfileViewModel = viewModel()
) {
    val context = LocalContext.current
    val supportConfig by viewModel.supportConfig.collectAsState()
    val supportTickets by viewModel.supportTickets.collectAsState()
    val ticketMessages by viewModel.currentTicketMessages.collectAsState()
    val selectedTicketId by viewModel.selectedTicketId.collectAsState()

    var showTicketsDialog by remember { mutableStateOf(false) }
    var expandedFaq by remember { mutableStateOf<Int?>(null) }

    if (showTicketsDialog) {
        SupportTicketsDialog(
            tickets = supportTickets,
            messages = ticketMessages,
            selectedTicketId = selectedTicketId,
            onDismiss = { showTicketsDialog = false },
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

    val faqs = listOf(
        "¿Cómo hago un pedido?" to
            "Navega al inicio, selecciona un comercio o producto, agrégalo al carrito y presiona 'Solicitar Envío'. Recibirás actualizaciones en tiempo real del estado de tu pedido.",
        "¿Cuánto tiempo tarda la entrega?" to
            "El tiempo estimado depende de la distancia y disponibilidad del motorizado. Por lo general entre 20 y 45 minutos.",
        "¿Cómo pago mi pedido?" to
            "Actualmente aceptamos pago en efectivo al momento de la entrega. Próximamente estarán disponibles más métodos de pago.",
        "¿Puedo cancelar un pedido?" to
            "Solo puedes cancelar si el pedido aún está en estado 'Pendiente'. Una vez que el comercio comience a prepararlo, no es posible cancelar.",
        "¿Cómo califico un pedido?" to
            "En tu historial de pedidos, toca el pedido entregado y presiona 'Calificar'. Podrás dar tu opinión del comercio y del motorizado.",
        "¿Cómo guardo mis favoritos?" to
            "Toca el ❤️ en cualquier comercio de la pantalla de inicio para agregarlo a tu lista de favoritos.",
        "¿Cómo administro mis direcciones?" to
            "Ve al Menú → Mis Direcciones Guardadas. Allí puedes agregar, editar o eliminar tus domicilios de entrega.",
        "¿Qué hago si hay un problema con mi pedido?" to
            "Abre un ticket en 'Chat de Asistencia en Vivo' o contáctanos por WhatsApp al número oficial de soporte."
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Centro de Ayuda & Soporte", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = BluePrimary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF8FAFC))
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            // Encabezado
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BluePrimary)
                    .padding(horizontal = 20.dp, vertical = 24.dp)
            ) {
                Column {
                    Text(
                        "¿En qué podemos ayudarte?",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Encuentra respuestas a tus preguntas o chatea con un agente de soporte.",
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.85f)
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Tarjeta de Asistencia en Vivo (Sistema de Tickets)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .clickable { showTicketsDialog = true },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .background(BluePrimary, RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.SupportAgent, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Chat de Asistencia en Vivo", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            if (supportTickets.any { it.unreadByCustomer > 0 }) {
                                Spacer(Modifier.width(6.dp))
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .background(Color(0xFFEF4444), RoundedCornerShape(4.dp))
                                )
                            }
                        }
                        Text(
                            if (supportTickets.isNotEmpty()) "${supportTickets.size} ticket(s) registrado(s)" else "Inicia una conversación con nuestro equipo 24/7",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                        )
                    }
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowRight,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            // Accesos rápidos de contacto configurables desde /system_config/support
            Text(
                "Contacto Directo",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = Color(0xFF64748B),
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column {
                    if (supportConfig.whatsappActive) {
                        HelpContactItem(
                            icon = Icons.Default.Phone,
                            iconColor = Color(0xFF25D366),
                            title = supportConfig.whatsappText,
                            subtitle = supportConfig.whatsappNumber,
                            onClick = {
                                val cleanNum = supportConfig.whatsappNumber.replace(Regex("[^0-9+]"), "")
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/${cleanNum.removePrefix("+")}"))
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    Toast.makeText(context, "No se pudo abrir WhatsApp: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        )
                        HorizontalDivider(color = Color(0xFFF1F5F9))
                    }

                    if (supportConfig.emailActive) {
                        HelpContactItem(
                            icon = Icons.Default.Email,
                            iconColor = BluePrimary,
                            title = supportConfig.emailText,
                            subtitle = supportConfig.supportEmail,
                            onClick = {
                                try {
                                    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${supportConfig.supportEmail}"))
                                    intent.putExtra(Intent.EXTRA_SUBJECT, "Consulta BlueSystem Delivery")
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    Toast.makeText(context, "No se pudo abrir app de correo: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                                }
                            }
                        )
                        HorizontalDivider(color = Color(0xFFF1F5F9))
                    }

                    HelpContactItem(
                        icon = Icons.Default.AccessTime,
                        iconColor = Color(0xFFF59E0B),
                        title = "Horario de Atención",
                        subtitle = "${supportConfig.scheduleDays} · ${supportConfig.scheduleHours}",
                        onClick = null
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            // Preguntas frecuentes
            Text(
                "Preguntas Frecuentes",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = Color(0xFF64748B),
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            Spacer(Modifier.height(8.dp))

            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column {
                    faqs.forEachIndexed { index, (pregunta, respuesta) ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expandedFaq = if (expandedFaq == index) null else index }
                                .padding(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    pregunta,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp,
                                    color = Color(0xFF1E293B),
                                    modifier = Modifier.weight(1f)
                                )
                                Icon(
                                    imageVector = if (expandedFaq == index) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                    contentDescription = null,
                                    tint = BlueSecondary
                                )
                            }
                            if (expandedFaq == index) {
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    respuesta,
                                    fontSize = 13.sp,
                                    color = Color(0xFF64748B),
                                    lineHeight = 20.sp
                                )
                            }
                        }
                        if (index < faqs.size - 1) HorizontalDivider(color = Color(0xFFF1F5F9))
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun HelpContactItem(
    icon: ImageVector,
    iconColor: Color,
    title: String,
    subtitle: String,
    onClick: (() -> Unit)?
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .background(iconColor.copy(alpha = 0.12f), RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
            Text(subtitle, fontSize = 12.sp, color = Color(0xFF64748B))
        }
        if (onClick != null) {
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = Color(0xFFCBD5E1)
            )
        }
    }
}
