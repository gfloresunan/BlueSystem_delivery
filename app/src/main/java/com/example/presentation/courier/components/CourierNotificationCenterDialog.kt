package com.example.presentation.courier.components

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
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.domain.engine.courier.CourierNotificationItem
import com.example.domain.engine.courier.NotificationCategory
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourierNotificationCenterDialog(
    notifications: List<CourierNotificationItem>,
    onDismiss: () -> Unit,
    onMarkAsRead: (id: String) -> Unit,
    onMarkAllAsRead: () -> Unit,
    onSelectNotification: (item: CourierNotificationItem) -> Unit
) {
    var selectedCategoryFilter by remember { mutableStateOf<NotificationCategory?>(null) }

    val filteredNotifications = remember(notifications, selectedCategoryFilter) {
        if (selectedCategoryFilter == null) {
            notifications
        } else {
            notifications.filter { it.category == selectedCategoryFilter }
        }
    }

    val unreadCount = remember(notifications) {
        notifications.count { !it.isRead }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .fillMaxHeight(0.85f)
                .clip(RoundedCornerShape(24.dp)),
            color = Color(0xFF0F172A),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            shadowElevation = 24.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(18.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF6366F1).copy(alpha = 0.2f),
                            modifier = Modifier.size(38.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                BadgedBox(
                                    badge = {
                                        if (unreadCount > 0) {
                                            Badge(containerColor = Color(0xFFEF4444), contentColor = Color.White) {
                                                Text("$unreadCount", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Notifications,
                                        contentDescription = null,
                                        tint = Color(0xFF818CF8),
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Centro de Notificaciones",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp
                            )
                            Text(
                                text = if (unreadCount > 0) "$unreadCount no leída(s)" else "Al día con tus alertas",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (unreadCount > 0) {
                            TextButton(onClick = onMarkAllAsRead) {
                                Text("Leídas", fontSize = 11.sp, color = Color(0xFF818CF8), fontWeight = FontWeight.Bold)
                            }
                        }
                        IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Cerrar", tint = Color(0xFF64748B))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFF1E293B))
                Spacer(modifier = Modifier.height(10.dp))

                // Categorías / Filtros
                ScrollableTabRow(
                    selectedTabIndex = if (selectedCategoryFilter == null) 0 else NotificationCategory.values().indexOf(selectedCategoryFilter) + 1,
                    containerColor = Color.Transparent,
                    contentColor = Color.White,
                    edgePadding = 0.dp,
                    divider = {}
                ) {
                    Tab(
                        selected = selectedCategoryFilter == null,
                        onClick = { selectedCategoryFilter = null },
                        text = { Text("Todas (${notifications.size})", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                    )
                    NotificationCategory.values().forEach { category ->
                        val count = notifications.count { it.category == category }
                        Tab(
                            selected = selectedCategoryFilter == category,
                            onClick = { selectedCategoryFilter = category },
                            text = { Text("${getCategoryLabel(category)} ($count)", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Notification items list
                if (filteredNotifications.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.NotificationsNone,
                                contentDescription = null,
                                tint = Color(0xFF475569),
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "No hay notificaciones en esta categoría",
                                color = Color(0xFF64748B),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredNotifications, key = { it.id }) { item ->
                            NotificationCardItem(
                                item = item,
                                onClick = {
                                    onMarkAsRead(item.id)
                                    onSelectNotification(item)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationCardItem(
    item: CourierNotificationItem,
    onClick: () -> Unit
) {
    val (icon, iconBg, iconTint) = getCategoryStyling(item.category)
    val timeFormat = remember { SimpleDateFormat("HH:mm · dd/MM", Locale.getDefault()) }

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = if (!item.isRead) Color(0xFF1E293B) else Color(0xFF0F172A),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (!item.isRead) Color(0xFF6366F1).copy(alpha = 0.5f) else Color(0xFF334155)
        ),
        shadowElevation = if (!item.isRead) 4.dp else 0.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            Surface(
                shape = CircleShape,
                color = iconBg,
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(imageVector = icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(18.dp))
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = item.title,
                        color = Color.White,
                        fontWeight = if (!item.isRead) FontWeight.ExtraBold else FontWeight.Bold,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = timeFormat.format(Date(item.timestampMs)),
                        color = Color(0xFF64748B),
                        fontSize = 10.sp
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = item.body,
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 16.sp
                )

                if (!item.orderId.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Color(0xFF6366F1).copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = "📦 Pedido #${item.orderId.takeLast(6)}",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF818CF8),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            if (!item.isRead) {
                Spacer(modifier = Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF6366F1))
                )
            }
        }
    }
}

private fun getCategoryLabel(category: NotificationCategory): String = when (category) {
    NotificationCategory.NUEVO_PEDIDO -> "Nuevos"
    NotificationCategory.ASIGNACION -> "Asignaciones"
    NotificationCategory.CAMBIO_ESTADO -> "Estados"
    NotificationCategory.CANCELACION -> "Cancelaciones"
    NotificationCategory.RECHAZO -> "Rechazos"
    NotificationCategory.SISTEMA -> "Sistema"
}

private fun getCategoryStyling(category: NotificationCategory): Triple<ImageVector, Color, Color> = when (category) {
    NotificationCategory.NUEVO_PEDIDO -> Triple(Icons.AutoMirrored.Filled.DirectionsBike, Color(0xFF10B981).copy(alpha = 0.2f), Color(0xFF34D399))
    NotificationCategory.ASIGNACION -> Triple(Icons.Default.AssignmentTurnedIn, Color(0xFF6366F1).copy(alpha = 0.2f), Color(0xFF818CF8))
    NotificationCategory.CAMBIO_ESTADO -> Triple(Icons.Default.Sync, Color(0xFF3B82F6).copy(alpha = 0.2f), Color(0xFF60A5FA))
    NotificationCategory.CANCELACION -> Triple(Icons.Default.Cancel, Color(0xFFEF4444).copy(alpha = 0.2f), Color(0xFFF87171))
    NotificationCategory.RECHAZO -> Triple(Icons.Default.RemoveCircleOutline, Color(0xFFF59E0B).copy(alpha = 0.2f), Color(0xFFFBBF24))
    NotificationCategory.SISTEMA -> Triple(Icons.Default.Info, Color(0xFF64748B).copy(alpha = 0.2f), Color(0xFF94A3B8))
}
