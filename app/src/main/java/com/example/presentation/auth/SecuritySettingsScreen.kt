package com.example.presentation.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

/**
 * SecuritySettingsScreen — Configuración de seguridad biométrica
 *
 * Accesible desde el perfil del usuario.
 * Permite al usuario:
 *   ✅ Activar/desactivar huella digital
 *   ✅ Activar/desactivar reconocimiento facial (Face ID)
 *   ✅ Configurar si se pide biometría al abrir la app
 *   ✅ Ver el estado actual del hardware biométrico del dispositivo
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SecuritySettingsScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current

    // ── Estado desde BiometricPreferences ────────────────────────────────────
    var biometricEnabled by remember { mutableStateOf(BiometricPreferences.isBiometricEnabled(context)) }
    var askOnOpen by remember { mutableStateOf(BiometricPreferences.isAskOnOpen(context)) }

    // ── Estado del hardware ───────────────────────────────────────────────────
    val biometricStatus = remember { BiometricHelper.checkStatus(context) }
    val isHardwareAvailable = biometricStatus is BiometricStatus.Available || biometricStatus is BiometricStatus.NotEnrolled
    val isEnrolled = biometricStatus is BiometricStatus.Available

    // ── Colores ───────────────────────────────────────────────────────────────
    val activeColor = Color(0xFF6366F1)
    val textPrimary = Color.White
    val textSecondary = Color(0xFF94A3B8)
    val cardBg = Color(0xFF1E293B)
    val surfaceBg = Color(0xFF0F172A)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Seguridad",
                        fontWeight = FontWeight.Bold,
                        color = textPrimary
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Volver",
                            tint = textPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = surfaceBg
                )
            )
        },
        containerColor = surfaceBg
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ── Banner de estado del hardware ─────────────────────────────
            when (biometricStatus) {
                is BiometricStatus.HardwareNotPresent -> {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1C2E)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFF59E0B))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "Este dispositivo no cuenta con hardware biométrico compatible.",
                                color = Color(0xFFF59E0B),
                                fontSize = 13.sp
                            )
                        }
                    }
                }
                is BiometricStatus.NotEnrolled -> {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1C1C2E)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF38BDF8))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "El dispositivo tiene hardware biométrico, pero no hay huellas registradas.\nVe a Ajustes → Seguridad → Huella digital para configurarlas.",
                                color = Color(0xFF38BDF8),
                                fontSize = 13.sp
                            )
                        }
                    }
                }
                else -> { /* Available o Unknown — no se muestra banner */ }
            }

            // ── Sección: Autenticación Biométrica ─────────────────────────
            Text(
                text = "AUTENTICACIÓN BIOMÉTRICA",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = textSecondary,
                modifier = Modifier.padding(top = 8.dp, start = 4.dp)
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = cardBg),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column {
                    // ── Toggle: Activar Huella ────────────────────────────
                    SettingsToggleRow(
                        icon = Icons.Default.Fingerprint,
                        iconTint = if (biometricEnabled && isEnrolled) activeColor else textSecondary,
                        title = "Activar huella digital",
                        subtitle = when {
                            !isHardwareAvailable -> "No disponible en este dispositivo"
                            !isEnrolled -> "Configura una huella en Ajustes del dispositivo primero"
                            biometricEnabled -> "Activa — BlueSystem solicita tu huella al abrir"
                            else -> "Desactiva — no se solicitará biometría"
                        },
                        checked = biometricEnabled && isEnrolled,
                        enabled = isEnrolled,
                        onCheckedChange = { newValue ->
                            biometricEnabled = newValue
                            BiometricPreferences.setBiometricEnabled(context, newValue)
                            if (!newValue) {
                                // Al desactivar, también desactivar el ask-on-open
                                askOnOpen = false
                                BiometricPreferences.setAskOnOpen(context, false)
                            }
                        }
                    )

                    HorizontalDivider(color = Color(0xFF334155))

                    // ── Toggle: Face ID ───────────────────────────────────
                    SettingsToggleRow(
                        icon = Icons.Default.Face,
                        iconTint = if (biometricEnabled && isEnrolled) activeColor else textSecondary,
                        title = "Activar Face ID",
                        subtitle = "Usa reconocimiento facial como alternativa a la huella",
                        checked = biometricEnabled && isEnrolled, // Comparte el mismo toggle (ambas usan BIOMETRIC_STRONG)
                        enabled = isEnrolled,
                        onCheckedChange = { newValue ->
                            biometricEnabled = newValue
                            BiometricPreferences.setBiometricEnabled(context, newValue)
                        }
                    )
                }
            }

            // ── Sección: Comportamiento ───────────────────────────────────
            AnimatedVisibility(
                visible = biometricEnabled && isEnrolled,
                enter = fadeIn(tween(300)) + expandVertically(),
                exit = fadeOut(tween(200)) + shrinkVertically()
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "COMPORTAMIENTO",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = textSecondary,
                        modifier = Modifier.padding(top = 4.dp, start = 4.dp)
                    )

                    Card(
                        colors = CardDefaults.cardColors(containerColor = cardBg),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        SettingsToggleRow(
                            icon = Icons.Default.LockOpen,
                            iconTint = if (askOnOpen) activeColor else textSecondary,
                            title = "Solicitar biometría al abrir",
                            subtitle = "Pide tu huella cada vez que abras la aplicación o después de 5 min en segundo plano",
                            checked = askOnOpen,
                            enabled = true,
                            onCheckedChange = { newValue ->
                                askOnOpen = newValue
                                BiometricPreferences.setAskOnOpen(context, newValue)
                            }
                        )
                    }
                }
            }

            // ── Sección: Seguridad de la Cuenta (Cambio de Contraseña) ───
            var showChangePasswordDialog by remember { mutableStateOf(false) }
            val coroutineScope = rememberCoroutineScope()
            val authManager = remember { com.example.AuthManager() }

            Text(
                text = "SEGURIDAD DE LA CUENTA",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = textSecondary,
                modifier = Modifier.padding(top = 8.dp, start = 4.dp)
            )

            Card(
                colors = CardDefaults.cardColors(containerColor = cardBg),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showChangePasswordDialog = true }
                        .padding(horizontal = 16.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = null,
                        tint = activeColor,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Cambiar Contraseña",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            color = Color.White
                        )
                        Text(
                            text = "Actualiza tu clave de acceso mediante reautenticación segura",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B)
                        )
                    }
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null,
                        tint = Color(0xFF64748B),
                        modifier = Modifier
                            .size(18.dp)
                            .rotate(180f)
                    )
                }
            }

            // ── Diálogo de Cambio de Contraseña ───────────────────────────
            if (showChangePasswordDialog) {
                var currentPass by remember { mutableStateOf("") }
                var newPass by remember { mutableStateOf("") }
                var confirmNewPass by remember { mutableStateOf("") }
                var currentPassVisible by remember { mutableStateOf(false) }
                var newPassVisible by remember { mutableStateOf(false) }
                var confirmNewPassVisible by remember { mutableStateOf(false) }
                var isUpdatingPass by remember { mutableStateOf(false) }
                var dialogErrorMessage by remember { mutableStateOf<String?>(null) }
                var dialogSuccessMessage by remember { mutableStateOf<String?>(null) }

                val tfColors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedLabelColor = activeColor,
                    unfocusedLabelColor = Color(0xFF94A3B8),
                    focusedLeadingIconColor = activeColor,
                    unfocusedLeadingIconColor = Color(0xFF94A3B8),
                    focusedTrailingIconColor = activeColor,
                    unfocusedTrailingIconColor = Color(0xFF94A3B8),
                    focusedBorderColor = activeColor,
                    unfocusedBorderColor = Color(0xFF334155),
                    focusedContainerColor = Color(0xFF0F172A),
                    unfocusedContainerColor = Color(0xFF0F172A)
                )

                AlertDialog(
                    onDismissRequest = {
                        if (!isUpdatingPass) {
                            showChangePasswordDialog = false
                        }
                    },
                    containerColor = Color(0xFF1E293B),
                    titleContentColor = Color.White,
                    textContentColor = Color(0xFF94A3B8),
                    icon = {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(androidx.compose.foundation.shape.CircleShape)
                                .background(activeColor.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.LockReset,
                                contentDescription = null,
                                tint = activeColor,
                                modifier = Modifier.size(26.dp)
                            )
                        }
                    },
                    title = {
                        Text(
                            text = "Cambiar Contraseña",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = Color.White
                        )
                    },
                    text = {
                        Column(
                            modifier = Modifier.verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text(
                                text = "Por motivos de seguridad, introduce tu contraseña actual y la nueva clave que deseas utilizar.",
                                fontSize = 13.sp,
                                color = Color(0xFF94A3B8)
                            )

                            // Contraseña Actual
                            OutlinedTextField(
                                value = currentPass,
                                onValueChange = {
                                    currentPass = it
                                    dialogErrorMessage = null
                                },
                                label = { Text("Contraseña Actual") },
                                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                visualTransformation = if (currentPassVisible) androidx.compose.ui.text.input.VisualTransformation.None else androidx.compose.ui.text.input.PasswordVisualTransformation(),
                                trailingIcon = {
                                    IconButton(onClick = { currentPassVisible = !currentPassVisible }) {
                                        Icon(
                                            imageVector = if (currentPassVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = null
                                        )
                                    }
                                },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                singleLine = true,
                                colors = tfColors
                            )

                            // Nueva Contraseña
                            OutlinedTextField(
                                value = newPass,
                                onValueChange = {
                                    newPass = it
                                    dialogErrorMessage = null
                                },
                                label = { Text("Nueva Contraseña (mín. 6 car.)") },
                                leadingIcon = { Icon(Icons.Default.Key, contentDescription = null) },
                                visualTransformation = if (newPassVisible) androidx.compose.ui.text.input.VisualTransformation.None else androidx.compose.ui.text.input.PasswordVisualTransformation(),
                                trailingIcon = {
                                    IconButton(onClick = { newPassVisible = !newPassVisible }) {
                                        Icon(
                                            imageVector = if (newPassVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = null
                                        )
                                    }
                                },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                singleLine = true,
                                colors = tfColors
                            )

                            // Confirmar Nueva Contraseña
                            OutlinedTextField(
                                value = confirmNewPass,
                                onValueChange = {
                                    confirmNewPass = it
                                    dialogErrorMessage = null
                                },
                                label = { Text("Confirmar Nueva Contraseña") },
                                leadingIcon = { Icon(Icons.Default.Key, contentDescription = null) },
                                visualTransformation = if (confirmNewPassVisible) androidx.compose.ui.text.input.VisualTransformation.None else androidx.compose.ui.text.input.PasswordVisualTransformation(),
                                trailingIcon = {
                                    IconButton(onClick = { confirmNewPassVisible = !confirmNewPassVisible }) {
                                        Icon(
                                            imageVector = if (confirmNewPassVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = null
                                        )
                                    }
                                },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                singleLine = true,
                                colors = tfColors
                            )

                            if (dialogErrorMessage != null) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = MaterialTheme.colorScheme.errorContainer,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = dialogErrorMessage!!,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onErrorContainer,
                                        modifier = Modifier.padding(10.dp)
                                    )
                                }
                            }

                            if (dialogSuccessMessage != null) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFF064E3B),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = dialogSuccessMessage!!,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Color(0xFF6EE7B7),
                                        modifier = Modifier.padding(10.dp)
                                    )
                                }
                            }
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                if (currentPass.isBlank()) {
                                    dialogErrorMessage = "Por favor, ingresa tu contraseña actual."
                                    return@Button
                                }
                                if (newPass.length < 6) {
                                    dialogErrorMessage = "La nueva contraseña debe tener al menos 6 caracteres."
                                    return@Button
                                }
                                if (newPass != confirmNewPass) {
                                    dialogErrorMessage = "Las contraseñas nuevas no coinciden."
                                    return@Button
                                }
                                if (currentPass == newPass) {
                                    dialogErrorMessage = "La nueva contraseña no puede ser idéntica a la actual."
                                    return@Button
                                }

                                isUpdatingPass = true
                                dialogErrorMessage = null
                                dialogSuccessMessage = null

                                coroutineScope.launch {
                                    val result = authManager.cambiarContrasena(currentPass, newPass)
                                    isUpdatingPass = false
                                    result.fold(
                                        onSuccess = {
                                            dialogSuccessMessage = "¡Contraseña actualizada con éxito!"
                                            kotlinx.coroutines.delay(1200)
                                            showChangePasswordDialog = false
                                        },
                                        onFailure = { error ->
                                            dialogErrorMessage = error.localizedMessage ?: "Error al actualizar contraseña"
                                        }
                                    )
                                }
                            },
                            enabled = !isUpdatingPass,
                            colors = ButtonDefaults.buttonColors(containerColor = activeColor)
                        ) {
                            if (isUpdatingPass) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            } else {
                                Text("Guardar Clave", fontWeight = FontWeight.Bold)
                            }
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = { showChangePasswordDialog = false },
                            enabled = !isUpdatingPass
                        ) {
                            Text("Cancelar", color = textSecondary)
                        }
                    }
                )
            }

            // ── Sección informativa ───────────────────────────────────────
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F1F3D)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        Icons.Default.Security,
                        contentDescription = null,
                        tint = Color(0xFF38BDF8),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Privacidad garantizada",
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF38BDF8),
                            fontSize = 13.sp
                        )
                        Text(
                            text = "BlueSystem no almacena contraseñas en texto plano ni datos biométricos. Toda autenticación está protegida por Firebase Authentication.",
                            color = textSecondary,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsToggleRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String,
    checked: Boolean,
    enabled: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconTint,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = if (enabled) Color.White else Color(0xFF64748B)
            )
            Text(
                text = subtitle,
                fontSize = 12.sp,
                color = Color(0xFF64748B)
            )
        }
        Spacer(modifier = Modifier.width(8.dp))
        Switch(
            checked = checked,
            onCheckedChange = if (enabled) onCheckedChange else null,
            enabled = enabled,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = Color(0xFF6366F1),
                uncheckedThumbColor = Color(0xFF94A3B8),
                uncheckedTrackColor = Color(0xFF334155),
                disabledCheckedTrackColor = Color(0xFF334155),
                disabledUncheckedTrackColor = Color(0xFF1E293B)
            )
        )
    }
}
