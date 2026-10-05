package com.example.presentation.admin

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
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
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.launch

data class AdminNotificationItem(
    val id: String = "",
    val type: String = "ADMIN_SYSTEM_ALERT",
    val title: String = "",
    val body: String = "",
    val priority: String = "NORMAL",
    val deepLink: String = "",
    val targetModule: String = "",
    val isRead: Boolean = false,
    val createdAtMillis: Long = 0L
)

/**
 * CENTRO DE NOTIFICACIONES ADMINISTRATIVO (AdminNotificationCenter).
 *
 * Consolida alertas críticas de 12 eventos de plataforma:
 * - ADMIN_NEW_MERCHANT_REQUEST
 * - ADMIN_NEW_COURIER_REQUEST
 * - ADMIN_COURIER_PROFILE_CHANGE
 * - ADMIN_SUPPORT_TICKET_CREATED
 * - ADMIN_SUPPORT_TICKET_PRIORITY
 * - ADMIN_COURIER_CLOSURE_SUBMITTED
 * - ADMIN_COURIER_CASH_DIFFERENCE
 * - ADMIN_TRANSFER_PENDING
 * - ADMIN_INCIDENT_CRITICAL
 * - ADMIN_SYSTEM_ALERT
 * - ADMIN_CONFIGURATION_CHANGED
 * - ADMIN_COMMERCE_STATUS_CHANGED
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminNotificationCenterScreen(
    onBack: () -> Unit,
    onNavigate: (String) -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    val db = remember { FirebaseFirestore.getInstance() }
    val auth = remember { FirebaseAuth.getInstance() }
    val currentAdminUid = auth.currentUser?.uid ?: ""

    var notifications by remember { mutableStateOf<List<AdminNotificationItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    DisposableEffect(currentAdminUid) {
        if (currentAdminUid.isBlank()) {
            isLoading = false
            return@DisposableEffect onDispose {}
        }

        val listener = db.collection("users").document(currentAdminUid)
            .collection("notifications")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, _ ->
                isLoading = false
                if (snapshot != null) {
                    val list = snapshot.documents.mapNotNull { doc ->
                        val data = doc.data ?: return@mapNotNull null
                        AdminNotificationItem(
                            id = doc.id,
                            type = data["type"] as? String ?: "ADMIN_SYSTEM_ALERT",
                            title = data["title"] as? String ?: "Alerta Administrativa",
                            body = data["body"] as? String ?: data["message"] as? String ?: "",
                            priority = (data["priority"] as? String ?: "NORMAL").uppercase(),
                            deepLink = data["deepLink"] as? String ?: data["destinationRoute"] as? String ?: "",
                            targetModule = data["targetModule"] as? String ?: "",
                            isRead = data["isRead"] as? Boolean ?: false,
                            createdAtMillis = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: System.currentTimeMillis()
                        )
                    }
                    notifications = list
                }
            }

        onDispose { listener.remove() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Notificaciones Administrativas", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                        Text("Eventos y alertas de plataforma", fontSize = 11.sp, color = Color.White.copy(alpha = 0.8f))
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Atrás", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BluePrimary)
            )
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BluePrimary)
            }
        } else if (notifications.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.NotificationsNone, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(56.dp))
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("No hay notificaciones administrativas", color = Color(0xFF94A3B8), fontSize = 13.sp)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(notifications, key = { it.id }) { notif ->
                    AdminNotificationCard(
                        notif = notif,
                        onClick = {
                            // Marcar leída
                            coroutineScope.launch {
                                db.collection("users").document(currentAdminUid)
                                    .collection("notifications").document(notif.id).update("isRead", true)
                            }
                            // Deep Link Resolution
                            val destination = when {
                                notif.deepLink.isNotBlank() -> notif.deepLink
                                notif.type.contains("MERCHANT") -> AdminRoutes.MERCHANT_REQUESTS
                                notif.type.contains("COURIER_REQUEST") -> AdminRoutes.COURIER_REQUESTS
                                notif.type.contains("COURIER_PROFILE") -> AdminRoutes.COURIER_PROFILE_MGMT
                                notif.type.contains("SUPPORT") -> AdminRoutes.SUPPORT_CENTER
                                notif.type.contains("CLOSURE") || notif.type.contains("CASH") -> AdminRoutes.COURIER_CASH_CENTER
                                notif.type.contains("COMMERCE") -> AdminRoutes.ENTERPRISE_COMMERCE
                                notif.type.contains("CONFIG") -> AdminRoutes.GLOBAL_CONFIG
                                else -> AdminRoutes.DASHBOARD
                            }
                            onNavigate(destination)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun AdminNotificationCard(
    notif: AdminNotificationItem,
    onClick: () -> Unit
) {
    val icon: ImageVector
    val iconColor: Color

    when {
        notif.type.contains("MERCHANT") -> {
            icon = Icons.Default.Storefront
            iconColor = Color(0xFF4F46E5)
        }
        notif.type.contains("COURIER") -> {
            icon = Icons.Default.TwoWheeler
            iconColor = Color(0xFF0284C7)
        }
        notif.type.contains("SUPPORT") -> {
            icon = Icons.Default.SupportAgent
            iconColor = Color(0xFFD97706)
        }
        notif.type.contains("CLOSURE") || notif.type.contains("CASH") -> {
            icon = Icons.Default.AccountBalanceWallet
            iconColor = Color(0xFF059669)
        }
        notif.type.contains("CRITICAL") || notif.type.contains("INCIDENT") -> {
            icon = Icons.Default.Warning
            iconColor = Color(0xFFDC2626)
        }
        else -> {
            icon = Icons.Default.Notifications
            iconColor = BluePrimary
        }
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (notif.isRead) Color.White else Color(0xFFF0FDF4),
        border = BorderStroke(1.dp, if (notif.isRead) Color(0xFFE2E8F0) else Color(0xFFBBF7D0)),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(iconColor.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(notif.title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF0F172A))
                Spacer(modifier = Modifier.height(2.dp))
                Text(notif.body, fontSize = 11.5.sp, color = Color(0xFF64748B))
            }
            if (!notif.isRead) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF10B981))
                )
            }
        }
    }
}
