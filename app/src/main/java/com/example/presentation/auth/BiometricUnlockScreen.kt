package com.example.presentation.auth

import android.app.Activity
import androidx.biometric.BiometricPrompt
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.ComponentActivity

/**
 * BiometricUnlockScreen — App Lock Biométrico (Opción 1 aprobada)
 *
 * Se interpone entre el Splash y el Home cuando el usuario tiene:
 *   ✅ Sesión de Firebase activa
 *   ✅ Biometría de App Lock habilitada en BiometricPreferences
 *
 * No almacena credenciales. Solo desbloquea la UI.
 *
 * Maneja todos los casos definidos:
 *   Caso 1: Huella correcta → onUnlockSuccess()
 *   Caso 2: 5 intentos fallidos → bloquear y mostrar mensaje
 *   Caso 3: Huella eliminada del dispositivo → mensaje + fallback
 *   Caso 4: Sin hardware biométrico → ocultar (no debe llegar aquí)
 *   Caso 5: Hardware presente pero sin configurar → mensaje guía
 */
import androidx.fragment.app.FragmentActivity

@Composable
fun BiometricUnlockScreen(
    targetRoute: String,
    onUnlockSuccess: (targetRoute: String) -> Unit,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    val activity = context as? FragmentActivity

    // ── Estado interno ────────────────────────────────────────────────────────
    var failedAttempts by remember { mutableIntStateOf(0) }
    var isLocked by remember { mutableStateOf(false) }        // Bloqueado por 5 fallos
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showFallbackDialog by remember { mutableStateOf(false) }
    var biometricStatus by remember { mutableStateOf<BiometricStatus?>(null) }

    // ── Verificar disponibilidad del sensor al entrar ────────────────────────
    LaunchedEffect(Unit) {
        if (activity != null) {
            biometricStatus = BiometricHelper.checkStatus(context)
        }
    }

    // ── Lanzar prompt automáticamente al entrar (solo si disponible) ─────────
    LaunchedEffect(biometricStatus) {
        if (biometricStatus is BiometricStatus.Available && !isLocked && activity != null) {
            BiometricHelper.showPrompt(
                activity = activity,
                title = "BlueSystem",
                subtitle = "Confirma tu identidad para continuar",
                negativeButtonText = "Usar contraseña",
                onResult = { result ->
                    when (result) {
                        is BiometricResult.Success -> {
                            failedAttempts = 0
                            onUnlockSuccess(targetRoute)
                        }
                        is BiometricResult.Error -> {
                            val code = result.code
                            when (code) {
                                BiometricPrompt.ERROR_NEGATIVE_BUTTON,
                                BiometricPrompt.ERROR_USER_CANCELED -> {
                                    // Usuario eligió "Usar contraseña" o canceló → mostrar fallback
                                    showFallbackDialog = true
                                }
                                BiometricPrompt.ERROR_LOCKOUT,
                                BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> {
                                    // Caso 2: Demasiados intentos
                                    isLocked = true
                                    errorMessage = "No fue posible verificar tu identidad.\nPuedes intentarlo nuevamente o cerrar sesión."
                                }
                                BiometricPrompt.ERROR_HW_NOT_PRESENT,
                                BiometricPrompt.ERROR_HW_UNAVAILABLE -> {
                                    // Caso 3/4: Hardware no disponible
                                    errorMessage = "La autenticación biométrica ya no está disponible.\nIngresa con tu contraseña."
                                    showFallbackDialog = true
                                }
                                BiometricPrompt.ERROR_NO_BIOMETRICS -> {
                                    // Caso 3: El usuario eliminó su huella del dispositivo
                                    // Deshabilitar biometría automáticamente
                                    BiometricPreferences.setBiometricEnabled(context, false)
                                    errorMessage = "La autenticación biométrica ya no está disponible.\nIngresa con tu contraseña."
                                    showFallbackDialog = true
                                }
                                else -> {
                                    errorMessage = "No fue posible verificar tu identidad."
                                }
                            }
                        }
                        is BiometricResult.Failure -> {
                            failedAttempts++
                            if (failedAttempts >= 5) {
                                // Caso 2: 5 intentos fallidos
                                isLocked = true
                                errorMessage = "No fue posible verificar tu identidad.\nPuedes intentarlo nuevamente o cerrar sesión."
                            } else {
                                errorMessage = "Huella no reconocida. Intento $failedAttempts de 5."
                            }
                        }
                    }
                }
            )
        }
    }

    // ── Diálogo de fallback (contraseña / cerrar sesión) ────────────────────
    if (showFallbackDialog) {
        AlertDialog(
            onDismissRequest = { showFallbackDialog = false },
            icon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF6366F1)) },
            title = { Text("Opciones de acceso", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    text = "¿Cómo deseas ingresar a BlueSystem?",
                    color = Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showFallbackDialog = false
                        // Cerrar sesión → ir al Login
                        BiometricPreferences.setBiometricEnabled(context, false)
                        onSignOut()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                ) {
                    Text("Cerrar sesión", color = Color.White)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showFallbackDialog = false }
                ) {
                    Text("Cancelar")
                }
            }
        )
    }

    // ── UI Principal ─────────────────────────────────────────────────────────
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF0F0F1A), Color(0xFF1A1035))
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp),
            modifier = Modifier.padding(32.dp)
        ) {
            // ── Logo / Icono de bloqueo ───────────────────────────────────
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF6366F1).copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                if (isLocked) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Bloqueado",
                        tint = Color(0xFFF59E0B),
                        modifier = Modifier.size(52.dp)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Fingerprint,
                        contentDescription = "Biometría",
                        tint = Color(0xFF6366F1),
                        modifier = Modifier.size(52.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // ── Título ───────────────────────────────────────────────────
            Text(
                text = "BlueSystem",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )

            Text(
                text = if (isLocked) "Demasiados intentos fallidos" else "Verifica tu identidad para continuar",
                fontSize = 14.sp,
                color = Color(0xFF94A3B8),
                textAlign = TextAlign.Center
            )

            // ── Mensaje de error con AnimatedVisibility ──────────────────
            AnimatedVisibility(
                visible = errorMessage != null,
                enter = fadeIn(tween(300)) + expandVertically(),
                exit = fadeOut(tween(200)) + shrinkVertically()
            ) {
                errorMessage?.let { msg ->
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (isLocked) Color(0xFFFFF3CD) else Color(0xFFFFEDED)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = msg,
                            modifier = Modifier.padding(16.dp),
                            color = if (isLocked) Color(0xFF856404) else Color(0xFFDC2626),
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // ── Botón principal ───────────────────────────────────────────
            when {
                biometricStatus is BiometricStatus.NotEnrolled -> {
                    // Caso 5: Hardware disponible pero sin configurar
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "⚙️ Configura una huella digital en tu dispositivo para utilizar esta función.\n\nVe a Ajustes → Seguridad → Huella digital.",
                            modifier = Modifier.padding(16.dp),
                            color = Color(0xFF94A3B8),
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = onSignOut,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF6366F1)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF6366F1))
                    ) {
                        Text("Cerrar sesión")
                    }
                }

                isLocked -> {
                    // Caso 2: Bloqueado por demasiados intentos
                    Button(
                        onClick = {
                            isLocked = false
                            failedAttempts = 0
                            errorMessage = null
                            if (activity != null) {
                                BiometricHelper.showPrompt(
                                    activity = activity,
                                    onResult = { result ->
                                        if (result is BiometricResult.Success) {
                                            onUnlockSuccess(targetRoute)
                                        } else {
                                            isLocked = true
                                            errorMessage = "No fue posible verificar tu identidad.\nPuedes intentarlo nuevamente o cerrar sesión."
                                        }
                                    }
                                )
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                    ) {
                        Icon(Icons.Default.Fingerprint, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Intentar nuevamente", fontWeight = FontWeight.SemiBold, color = Color.White)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    TextButton(onClick = onSignOut) {
                        Text("Cerrar sesión", color = Color(0xFF94A3B8))
                    }
                }

                else -> {
                    // Estado normal: botón de huella
                    Button(
                        onClick = {
                            if (activity != null) {
                                BiometricHelper.showPrompt(
                                    activity = activity,
                                    onResult = { result ->
                                        when (result) {
                                            is BiometricResult.Success -> onUnlockSuccess(targetRoute)
                                            is BiometricResult.Failure -> {
                                                failedAttempts++
                                                if (failedAttempts >= 5) {
                                                    isLocked = true
                                                    errorMessage = "No fue posible verificar tu identidad.\nPuedes intentarlo nuevamente o cerrar sesión."
                                                }
                                            }
                                            is BiometricResult.Error -> {
                                                if (result.code == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                                                    showFallbackDialog = true
                                                }
                                            }
                                        }
                                    }
                                )
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                    ) {
                        Icon(Icons.Default.Fingerprint, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Ingresar con huella digital", fontWeight = FontWeight.SemiBold, color = Color.White)
                    }

                    // Botón alternativo: "No puedo usar la huella"
                    TextButton(
                        onClick = { showFallbackDialog = true },
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    ) {
                        Text(
                            text = "No puedo usar la huella",
                            color = Color(0xFF94A3B8),
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}
