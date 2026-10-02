package com.example.presentation.customer.profile

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Devices
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Warning
import androidx.compose.runtime.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.functions.FirebaseFunctions
import com.example.data.repository.CustomerSettings

@Composable
fun ProfileSettings(
    settings: CustomerSettings,
    onSettingsChanged: (CustomerSettings) -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "Configuración & Preferencias ⚙️",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 6.dp)
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Theme Selection (Dark / Light / System)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.DarkMode, contentDescription = null, tint = Color(0xFF6366F1))
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "Tema de la App",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        listOf("dark" to "🌙 Oscuro", "light" to "☀️ Claro", "system" to "⚙️ Auto").forEach { (mode, label) ->
                            val isSelected = settings.themeMode == mode
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier.clickable {
                                    onSettingsChanged(settings.copy(themeMode = mode))
                                }
                            ) {
                                Text(
                                    text = label,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                Spacer(modifier = Modifier.height(12.dp))

                // Notifications Center Toggles
                Text(
                    text = "Centro de Notificaciones 🔔",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(6.dp))

                listOf(
                    "Promociones & Ofertas" to settings.notifPromos,
                    "Estado de Pedidos" to settings.notifOrders,
                    "Marketing & Novedades" to settings.notifMarketing,
                    "Soporte & Asistencia" to settings.notifSupport
                ).forEach { (label, isChecked) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 2.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Switch(
                            checked = isChecked,
                            onCheckedChange = {
                                when (label) {
                                    "Promociones & Ofertas" -> onSettingsChanged(settings.copy(notifPromos = it))
                                    "Estado de Pedidos" -> onSettingsChanged(settings.copy(notifOrders = it))
                                    "Marketing & Novedades" -> onSettingsChanged(settings.copy(notifMarketing = it))
                                    "Soporte & Asistencia" -> onSettingsChanged(settings.copy(notifSupport = it))
                                }
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                Spacer(modifier = Modifier.height(12.dp))

                // Security Section
                Text(
                    text = "Seguridad de la Cuenta 🛡️",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Fingerprint, contentDescription = null, tint = Color(0xFF10B981))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Autenticación Biométrica / PIN", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = settings.biometricEnabled,
                        onCheckedChange = { onSettingsChanged(settings.copy(biometricEnabled = it)) }
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { Toast.makeText(context, "Sesiones activas sincronizadas", Toast.LENGTH_SHORT).show() }
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Devices, contentDescription = null, tint = Color.Gray)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Cerrar otras sesiones activas", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.Gray)
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                Spacer(modifier = Modifier.height(12.dp))

                // Account Deletion Section (Apple 5.1.1(v) & Google Play Data Safety Mandate)
                var showDeleteAccountDialog by remember { mutableStateOf(false) }
                var isDeletingAccount by remember { mutableStateOf(false) }
                val coroutineScope = rememberCoroutineScope()

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showDeleteAccountDialog = true }
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.DeleteForever, contentDescription = null, tint = Color(0xFFEF4444))
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                "Eliminar mi cuenta",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFEF4444)
                            )
                            Text(
                                "Eliminar datos personales y cuenta permanentemente",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                            )
                        }
                    }
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color(0xFFEF4444))
                }

                if (showDeleteAccountDialog) {
                    AlertDialog(
                        onDismissRequest = { if (!isDeletingAccount) showDeleteAccountDialog = false },
                        icon = { Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFEF4444)) },
                        title = {
                            Text(
                                text = "¿Eliminar cuenta definitivamente?",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        },
                        text = {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    "Esta acción es irreversible y cumple con las políticas de privacidad de Apple y Google Play:",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    "• Sus datos personales (nombre, teléfono, correo) serán anonimizados de inmediato.\n" +
                                    "• Sus sesiones activas y tokens de dispositivo serán revocados.\n" +
                                    "• No debe tener pedidos o viajes en curso al momento de solicitar la baja.",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                if (isDeletingAccount) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
                                    Text(
                                        "Eliminando cuenta...",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.align(Alignment.CenterHorizontally)
                                    )
                                }
                            }
                        },
                        confirmButton = {
                            Button(
                                onClick = {
                                    isDeletingAccount = true
                                    coroutineScope.launch {
                                        try {
                                            val functions = FirebaseFunctions.getInstance()
                                            functions.getHttpsCallable("deleteMyAccount").call().await()
                                            FirebaseAuth.getInstance().signOut()
                                            Toast.makeText(context, "Cuenta eliminada correctamente.", Toast.LENGTH_LONG).show()
                                            showDeleteAccountDialog = false
                                            onLogout()
                                        } catch (e: Exception) {
                                            isDeletingAccount = false
                                            val errorMsg = e.message ?: "Error al eliminar la cuenta."
                                            Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                                        }
                                    }
                                },
                                enabled = !isDeletingAccount,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                            ) {
                                Text("Sí, eliminar definitivamente", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        },
                        dismissButton = {
                            TextButton(
                                onClick = { showDeleteAccountDialog = false },
                                enabled = !isDeletingAccount
                            ) {
                                Text("Cancelar")
                            }
                        }
                    )
                }
            }
        }
    }
}
