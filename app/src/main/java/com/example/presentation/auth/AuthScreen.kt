package com.example.presentation.auth

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.compose.ui.res.painterResource
import com.example.FirebaseManager
import kotlinx.coroutines.launch
import android.widget.Toast
import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.CustomCredential
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.facebook.CallbackManager
import com.facebook.FacebookCallback
import com.facebook.FacebookException
import com.facebook.login.LoginManager
import com.facebook.login.LoginResult
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.foundation.text.ClickableText
import android.content.Intent
import android.net.Uri


fun formatAuthError(rawError: String?): String {
    if (rawError.isNullOrBlank()) return "Ocurrió un error inesperado. Por favor, reintenta."
    val err = rawError.lowercase()
    return when {
        err.contains("invalid_credential") || err.contains("invalid-credential") || 
        err.contains("user-not-found") || err.contains("wrong-password") || 
        err.contains("invalid credential") || err.contains("contraseña incorrecta") -> {
            "El correo o la contraseña no son correctos."
        }
        err.contains("network") || err.contains("connection") || err.contains("red") || err.contains("network-request-failed") -> {
            "No pudimos conectarnos. Verifica tu conexión e inténtalo nuevamente."
        }
        err.contains("email-already-in-use") || err.contains("already in use") || err.contains("ya registrado") -> {
            "Este correo electrónico ya se encuentra registrado."
        }
        err.contains("weak-password") || err.contains("weak password") -> {
            "La contraseña es muy débil. Debe tener al menos 6 caracteres."
        }
        err.contains("invalid-email") || err.contains("invalid email") -> {
            "El formato del correo electrónico no es válido."
        }
        err.contains("cancelado") || err.contains("cancelled") || err.contains("cancellation") -> {
            "Inicio de sesión cancelado."
        }
        else -> rawError
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthScreen(
    navController: NavController,
    viewModel: AuthViewModel,
    firebaseManager: FirebaseManager
) {
    var isLogin by remember { mutableStateOf(true) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }
    var showOtherMethods by remember { mutableStateOf(false) }
    var validationError by remember { mutableStateOf<String?>(null) }
    var isTermsAccepted by remember { mutableStateOf(false) }
    var termsUrl by remember { mutableStateOf<String?>(null) }
    var privacyUrl by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            com.google.firebase.firestore.FirebaseFirestore.getInstance()
                .collection("brands")
                .document("tuanigo")
                .get()
                .addOnSuccessListener { doc ->
                    if (doc != null && doc.exists()) {
                        val meta = doc.get("metadata") as? Map<*, *>
                        termsUrl = meta?.get("termsUrl") as? String ?: doc.getString("termsUrl")
                        privacyUrl = meta?.get("privacyUrl") as? String ?: doc.getString("privacyUrl")
                    }
                }
        } catch (_: Exception) {}
    }

    // ── Estado: Diálogo de recuperación de contraseña (Forgot Password) ─────
    var showForgotPasswordDialog by remember { mutableStateOf(false) }
    var forgotPasswordEmail by remember { mutableStateOf("") }
    var isSendingReset by remember { mutableStateOf(false) }
    var resetStatusMessage by remember { mutableStateOf<String?>(null) }
    var resetIsError by remember { mutableStateOf(false) }

    val uiState by viewModel.uiState.collectAsState()
    val coroutineScope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current
    
    // SharedPreferences para recordar último usuario / proveedor (UX Improvement #3)
    val prefs = remember { context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE) }
    val lastEmail = remember { prefs.getString("last_user_email", "") ?: "" }
    val lastName = remember { prefs.getString("last_user_name", "") ?: "" }
    val lastProvider = remember { prefs.getString("last_auth_provider", "") ?: "" }

    val credentialManager = remember { CredentialManager.create(context) }
    val callbackManager = remember { CallbackManager.Factory.create() }

    // ── Estado: Diálogo de activación biométrica (post-login) ───────────────
    var showBiometricActivationDialog by remember { mutableStateOf(false) }
    var pendingTargetRoute by remember { mutableStateOf("") }

    
    val facebookLauncher = rememberLauncherForActivityResult(
        contract = LoginManager.getInstance().createLogInActivityResultContract(callbackManager)
    ) {
        // FacebookCallback se encarga de procesar el resultado automáticamente
    }

    DisposableEffect(Unit) {
        LoginManager.getInstance().registerCallback(
            callbackManager,
            object : FacebookCallback<LoginResult> {
                override fun onSuccess(result: LoginResult) {
                    val token = result.accessToken.token
                    viewModel.loginWithFacebookToken(token)
                }

                override fun onCancel() {
                    Toast.makeText(context, "Inicio de sesión con Facebook cancelado.", Toast.LENGTH_SHORT).show()
                }

                override fun onError(error: FacebookException) {
                    Toast.makeText(context, formatAuthError(error.localizedMessage), Toast.LENGTH_LONG).show()
                }
            }
        )
        onDispose {
            LoginManager.getInstance().unregisterCallback(callbackManager)
        }
    }

    val textFieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Color(0xFF1E293B),
        unfocusedTextColor = Color(0xFF1E293B),
        focusedLabelColor = Color(0xFF6366F1),
        unfocusedLabelColor = Color(0xFF64748B),
        focusedLeadingIconColor = Color(0xFF6366F1),
        unfocusedLeadingIconColor = Color(0xFF64748B),
        focusedTrailingIconColor = Color(0xFF6366F1),
        unfocusedTrailingIconColor = Color(0xFF64748B),
        focusedBorderColor = Color(0xFF6366F1),
        unfocusedBorderColor = Color(0xFFCBD5E1),
        focusedContainerColor = Color.White,
        unfocusedContainerColor = Color.White
    )

    // Manejo de éxito con persistencia de último usuario (UX Improvement #3)
    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Success) {
            val user = (uiState as AuthUiState.Success).user
            val currentFirebaseUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
            android.util.Log.d("FLOTA_DEBUG", "LOGIN_OK: Usuario autenticado con correo ${user.email} (UID: ${currentFirebaseUser?.uid})")

            // Resolver rol canónico autoritativo de forma determinística
            val resolution = com.example.domain.engine.auth.AppRoleResolver.resolveRole(
                context = context,
                user = currentFirebaseUser,
                forceRefresh = true
            )
            val appRole = resolution.role
            android.util.Log.d("AUTH_FLOW", "LOGIN_ROLE_RESOLVED | uid=${currentFirebaseUser?.uid} | role=$appRole | source=${resolution.source}")

            if (appRole == com.example.domain.model.AppRole.UNKNOWN) {
                android.util.Log.e("AUTH_FLOW", "FAIL_CLOSED: No se pudo verificar el rol del usuario tras autenticación.")
                Toast.makeText(context, "No fue posible verificar los permisos de tu cuenta. Por favor, contacta a soporte.", Toast.LENGTH_LONG).show()
                return@LaunchedEffect
            }

            // Guardar en SharedPreferences
            prefs.edit()
                .putString("last_user_email", user.email)
                .putString("last_user_name", name.ifEmpty { user.email.substringBefore("@") })
                .putString("last_auth_provider", if (email.isNotEmpty()) "Email" else "Google")
                .apply()

            val targetRoute = com.example.domain.engine.auth.AppRoleResolver.getCanonicalDestination(appRole)

            // ── Verificar si mostrar el prompt de activación biométrica ───────
            val biometricStatus = BiometricHelper.checkStatus(context)
            val isBiometricEnabled = BiometricPreferences.isBiometricEnabled(context)
            val wasPromptShown = BiometricPreferences.wasActivationPromptShown(context)
            val loginCount = BiometricPreferences.getLoginCount(context)

            // Incrementar contador de logins
            BiometricPreferences.incrementLoginCount(context)

            val shouldShowActivationPrompt = biometricStatus is BiometricStatus.Available
                && !isBiometricEnabled
                && (!wasPromptShown || loginCount % 5 == 0) // Volver a sugerir cada 5 logins

            if (shouldShowActivationPrompt) {
                // Mostrar diálogo de activación antes de navegar
                pendingTargetRoute = targetRoute
                showBiometricActivationDialog = true
                BiometricPreferences.markActivationPromptShown(context)
            } else {
                // Navegar directamente a la superficie autorizada
                try {
                    navController.navigate(targetRoute) {
                        popUpTo("login_register") { inclusive = true }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("FLOTA_DEBUG", "ERROR EN NAVEGACION A DASHBOARD", e)
                    throw e
                }
            }
        }
    }

    // ── Diálogo de activación biométrica (post-login) ────────────────────────
    if (showBiometricActivationDialog) {
        AlertDialog(
            onDismissRequest = {
                showBiometricActivationDialog = false
                navController.navigate(pendingTargetRoute) {
                    popUpTo("login_register") { inclusive = true }
                }
            },
            icon = {
                androidx.compose.foundation.layout.Box(
                    modifier = androidx.compose.ui.Modifier
                        .size(52.dp)
                        .clip(androidx.compose.foundation.shape.CircleShape)
                        .background(androidx.compose.ui.graphics.Color(0xFF6366F1).copy(alpha = 0.12f)),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Fingerprint,
                        contentDescription = null,
                        tint = androidx.compose.ui.graphics.Color(0xFF6366F1),
                        modifier = androidx.compose.ui.Modifier.size(28.dp)
                    )
                }
            },
            title = {
                Text(
                    text = "¿Deseas proteger TuaniGo con tu huella digital?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Activa el acceso biométrico para ingresar más rápido la próxima vez, sin introducir tu contraseña.",
                    fontSize = 14.sp,
                    color = androidx.compose.ui.graphics.Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showBiometricActivationDialog = false
                        BiometricPreferences.setBiometricEnabled(context, true)
                        android.util.Log.d("FLOTA_DEBUG", "BIOMETRIC_ACTIVATED: Usuario activó App Lock biométrico")
                        navController.navigate(pendingTargetRoute) {
                            popUpTo("login_register") { inclusive = true }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = androidx.compose.ui.graphics.Color(0xFF6366F1)
                    )
                ) {
                    Text("Activar", color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showBiometricActivationDialog = false
                        navController.navigate(pendingTargetRoute) {
                            popUpTo("login_register") { inclusive = true }
                        }
                    }
                ) {
                    Text("Más tarde", color = androidx.compose.ui.graphics.Color(0xFF6366F1))
                }
            }
        )
    }

    // ── Diálogo de recuperación de contraseña (Forgot Password) ─────────────
    if (showForgotPasswordDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!isSendingReset) {
                    showForgotPasswordDialog = false
                    resetStatusMessage = null
                }
            },
            icon = {
                Box(
                    modifier = Modifier
                        .size(52.dp)
                        .clip(androidx.compose.foundation.shape.CircleShape)
                        .background(Color(0xFFEEF2FF)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.LockReset,
                        contentDescription = null,
                        tint = Color(0xFF6366F1),
                        modifier = Modifier.size(28.dp)
                    )
                }
            },
            title = {
                Text(
                    text = "Recuperar Contraseña",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color(0xFF1E293B)
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Ingresa el correo electrónico asociado a tu cuenta para recibir las instrucciones oficiales de restablecimiento.",
                        fontSize = 13.sp,
                        color = Color(0xFF64748B)
                    )
                    OutlinedTextField(
                        value = forgotPasswordEmail,
                        onValueChange = {
                            forgotPasswordEmail = it
                            resetStatusMessage = null
                        },
                        label = { Text("Correo Electrónico") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        colors = textFieldColors
                    )
                    if (resetStatusMessage != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = if (resetIsError) MaterialTheme.colorScheme.errorContainer else Color(0xFFDCFCE7),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = resetStatusMessage!!,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = if (resetIsError) MaterialTheme.colorScheme.onErrorContainer else Color(0xFF15803D),
                                modifier = Modifier.padding(10.dp)
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (forgotPasswordEmail.isBlank()) {
                            resetStatusMessage = "Por favor, ingresa tu correo electrónico."
                            resetIsError = true
                            return@Button
                        }
                        isSendingReset = true
                        resetStatusMessage = null
                        viewModel.sendPasswordReset(forgotPasswordEmail.trim()) { success, message ->
                            isSendingReset = false
                            resetIsError = !success
                            resetStatusMessage = message
                        }
                    },
                    enabled = !isSendingReset,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                ) {
                    if (isSendingReset) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Enviar Enlace", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showForgotPasswordDialog = false
                        resetStatusMessage = null
                    },
                    enabled = !isSendingReset
                ) {
                    Text("Cerrar", color = Color(0xFF64748B))
                }
            }
        )
    }

    Box(
        modifier = Modifier.fillMaxSize()
    ) {
        // Fondo celeste con ondas inferiores oficiales de TuaniGo
        Image(
            painter = painterResource(id = com.example.R.drawable.fondo_login_pantalla),
            contentDescription = null,
            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        // Cabecera artística de TuaniGo (Mascota scooter, branding, badges)
        Image(
            painter = painterResource(id = com.example.R.drawable.fondo_login_cabecera),
            contentDescription = "TuaniGo Delivery",
            contentScale = androidx.compose.ui.layout.ContentScale.FillWidth,
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight()
                .align(Alignment.TopCenter)
        )

        // Contenedor principal con tarjeta blanca flotante responsiva
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Espacio de separación para lucir la ilustración de cabecera y el lema completo sin cortes
            Spacer(modifier = Modifier.height(206.dp))

            // Tarjeta blanca principal flotante con bordes redondeados y márgenes responsivos
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 500.dp)
                    .weight(1f)
                    .padding(start = 14.dp, end = 14.dp, bottom = 6.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // ── PESTAÑAS: INGRESAR / CREAR CUENTA ────────────────────
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Pestaña Ingresar
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .weight(1f)
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null
                                ) {
                                    isLogin = true
                                    validationError = null
                                    viewModel.resetState()
                                }
                                .padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = "Ingresar",
                                fontSize = 14.5.sp,
                                fontWeight = if (isLogin) FontWeight.Bold else FontWeight.Medium,
                                color = if (isLogin) Color(0xFF0F172A) else Color(0xFF94A3B8)
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            Box(
                                modifier = Modifier
                                    .height(3.dp)
                                    .fillMaxWidth(0.55f)
                                    .background(
                                        if (isLogin) Color(0xFF2563EB) else Color.Transparent,
                                        RoundedCornerShape(2.dp)
                                    )
                            )
                        }

                        // Divisor vertical sutil entre pestañas
                        Text(
                            text = "|",
                            color = Color(0xFFE2E8F0),
                            fontSize = 15.sp,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )

                        // Pestaña Crear cuenta
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .weight(1f)
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null
                                ) {
                                    isLogin = false
                                    showOtherMethods = true
                                    validationError = null
                                    viewModel.resetState()
                                }
                                .padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = "Crear cuenta",
                                fontSize = 14.5.sp,
                                fontWeight = if (!isLogin) FontWeight.Bold else FontWeight.Medium,
                                color = if (!isLogin) Color(0xFF0F172A) else Color(0xFF94A3B8)
                            )
                            Spacer(modifier = Modifier.height(3.dp))
                            Box(
                                modifier = Modifier
                                    .height(3.dp)
                                    .fillMaxWidth(0.55f)
                                    .background(
                                        if (!isLogin) Color(0xFF2563EB) else Color.Transparent,
                                        RoundedCornerShape(2.dp)
                                    )
                            )
                        }
                    }

                    HorizontalDivider(
                        color = Color(0xFFF1F5F9),
                        thickness = 1.dp,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )

                    // ── ENCABEZADOS SEGÚN LA PESTAÑA ACTIVA ──────────────────
                    if (isLogin) {
                        Text(
                            text = "¡Bienvenido!",
                            fontSize = 19.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF0F172A),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(1.dp))
                        Text(
                            text = "Ingresa para continuar con TuaniGo",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B),
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Text(
                            text = "¡Crea tu cuenta!",
                            fontSize = 19.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF0F172A),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(1.dp))
                        Text(
                            text = "Regístrate para pedir, enviar y descubrir con TuaniGo.",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // ── CONTENIDO DE LA PESTAÑA INGRESAR ────────────────────
                    if (isLogin) {
                        // Card de "Continuar como último usuario" (si existe)
                        if (lastEmail.isNotEmpty() && !showOtherMethods) {
                            Surface(
                                onClick = {
                                    email = lastEmail
                                    showOtherMethods = true
                                },
                                enabled = uiState !is AuthUiState.Loading,
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFF8FAFC),
                                border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .background(Color(0xFFEEF2FF), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = (lastName.ifEmpty { lastEmail }).take(1).uppercase(),
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF2563EB),
                                            fontSize = 14.sp
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(text = "Continuar como", fontSize = 9.5.sp, color = Color.Gray)
                                        Text(
                                            text = lastName.ifEmpty { lastEmail },
                                            fontSize = 12.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF1E293B)
                                        )
                                    }
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = Color(0xFFEEF2FF)
                                    ) {
                                        Text(
                                            text = lastProvider.ifEmpty { "Email" },
                                            fontSize = 9.5.sp,
                                            color = Color(0xFF2563EB),
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // Botón Oficial: Continuar con Google
                        Button(
                            onClick = {
                                android.util.Log.d("Auth", "Clic en Google Credential Manager")
                                coroutineScope.launch {
                                    try {
                                        val googleIdOption = GetGoogleIdOption.Builder()
                                            .setFilterByAuthorizedAccounts(false)
                                            .setServerClientId(context.getString(com.example.R.string.default_web_client_id))
                                            .setAutoSelectEnabled(false)
                                            .build()

                                        val request = GetCredentialRequest.Builder()
                                            .addCredentialOption(googleIdOption)
                                            .build()

                                        val result = credentialManager.getCredential(
                                            context = context,
                                            request = request
                                        )
                                        val credential = result.credential
                                        if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                                            val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                                            val idToken = googleIdTokenCredential.idToken
                                            viewModel.loginWithGoogleToken(idToken)
                                        } else {
                                            Toast.makeText(context, "Tipo de credencial no esperado.", Toast.LENGTH_SHORT).show()
                                        }
                                    } catch (e: GetCredentialCancellationException) {
                                        Toast.makeText(context, "Inicio de sesión cancelado.", Toast.LENGTH_SHORT).show()
                                    } catch (e: GetCredentialException) {
                                        android.util.Log.e("Auth", "Error en Credential Manager de Google", e)
                                        Toast.makeText(context, formatAuthError(e.localizedMessage), Toast.LENGTH_LONG).show()
                                    } catch (e: Exception) {
                                        android.util.Log.e("Auth", "Excepción al iniciar sesión con Google", e)
                                        Toast.makeText(context, formatAuthError(e.localizedMessage), Toast.LENGTH_LONG).show()
                                    }
                                }
                            },
                            enabled = uiState !is AuthUiState.Loading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color(0xFF0F172A)
                            ),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 1.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Image(
                                    painter = painterResource(id = com.example.R.drawable.ic_google_logo),
                                    contentDescription = "Google",
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "Continuar con Google",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.5.sp,
                                    color = Color(0xFF1E293B),
                                    modifier = Modifier.weight(1f)
                                )
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    tint = Color(0xFF94A3B8),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        // Botón Oficial: Continuar con Facebook
                        Button(
                            onClick = {
                                android.util.Log.d("Auth", "Clic en Facebook")
                                try {
                                    facebookLauncher.launch(listOf("public_profile"))
                                } catch (e: Exception) {
                                    android.util.Log.e("Auth", "Error al abrir Facebook login", e)
                                    Toast.makeText(context, formatAuthError(e.localizedMessage), Toast.LENGTH_LONG).show()
                                }
                            },
                            enabled = uiState !is AuthUiState.Loading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF1877F2),
                                contentColor = Color.White
                            ),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 1.dp),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.Facebook, contentDescription = "Facebook", tint = Color.White, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "Continuar con Facebook",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.5.sp,
                                    color = Color.White,
                                    modifier = Modifier.weight(1f)
                                )
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = null,
                                    tint = Color.White.copy(alpha = 0.85f),
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        // Separador " o "
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 0.dp)
                        ) {
                            HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
                            Text(" o ", color = Color(0xFF94A3B8), fontSize = 11.5.sp, modifier = Modifier.padding(horizontal = 6.dp))
                            HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        // Si no está abierto el formulario por correo, mostrar botón alternativo y card verde
                        if (!showOtherMethods) {
                            Surface(
                                onClick = { showOtherMethods = true },
                                enabled = uiState !is AuthUiState.Loading,
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFF1F5F9),
                                border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(horizontal = 14.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Email,
                                        contentDescription = null,
                                        tint = Color(0xFF1E293B),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Text(
                                        text = "Correo o teléfono",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.5.sp,
                                        color = Color(0xFF1E293B),
                                        modifier = Modifier.weight(1f)
                                    )
                                    Icon(
                                        imageVector = Icons.Default.ChevronRight,
                                        contentDescription = null,
                                        tint = Color(0xFF94A3B8),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // Card Promocional Verde Oficial: "¿No tienes cuenta? Crear cuenta >"
                            Surface(
                                onClick = {
                                    isLogin = false
                                    showOtherMethods = true
                                    validationError = null
                                    viewModel.resetState()
                                },
                                enabled = uiState !is AuthUiState.Loading,
                                shape = RoundedCornerShape(14.dp),
                                color = Color(0xFFEDF7ED),
                                border = BorderStroke(1.dp, Color(0xFFC8E6C9)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .background(Color(0xFFA5D6A7), RoundedCornerShape(8.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.PersonAdd,
                                            contentDescription = null,
                                            tint = Color(0xFF1B5E20),
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "¿No tienes cuenta?",
                                            fontSize = 11.5.sp,
                                            maxLines = 1,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF1B5E20)
                                        )
                                        Text(
                                            text = "Crea tu cuenta y descubre con TuaniGo.",
                                            fontSize = 9.sp,
                                            maxLines = 1,
                                            color = Color(0xFF2E7D32)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        shape = RoundedCornerShape(20.dp),
                                        color = Color(0xFF0F5132)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                                        ) {
                                            Text(
                                                text = "Crear cuenta",
                                                fontSize = 10.5.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                            Spacer(modifier = Modifier.width(2.dp))
                                            Icon(
                                                imageVector = Icons.Default.ChevronRight,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(11.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        } else {
                            // Formulario desplegado de Correo y Contraseña
                            Column(modifier = Modifier.fillMaxWidth()) {
                                OutlinedTextField(
                                    value = email,
                                    onValueChange = { email = it; validationError = null },
                                    label = { Text("Correo o teléfono") },
                                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true,
                                    colors = textFieldColors
                                )

                                Spacer(modifier = Modifier.height(14.dp))

                                OutlinedTextField(
                                    value = password,
                                    onValueChange = { password = it; validationError = null },
                                    label = { Text("Contraseña") },
                                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                    trailingIcon = {
                                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                            Icon(
                                                imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                                contentDescription = null
                                            )
                                        }
                                    },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true,
                                    colors = textFieldColors
                                )

                                // Enlace: ¿Olvidaste tu contraseña?
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 4.dp),
                                    horizontalArrangement = Arrangement.End
                                ) {
                                    TextButton(
                                        onClick = {
                                            forgotPasswordEmail = email.trim()
                                            resetStatusMessage = null
                                            resetIsError = false
                                            showForgotPasswordDialog = true
                                        },
                                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)
                                    ) {
                                        Text(
                                            text = "¿Olvidaste tu contraseña?",
                                            fontSize = 13.sp,
                                            color = Color(0xFF2563EB),
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                }

                                if (validationError != null) {
                                    Text(
                                        text = validationError!!,
                                        color = MaterialTheme.colorScheme.error,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        modifier = Modifier.padding(top = 6.dp)
                                    )
                                }

                                if (uiState is AuthUiState.Error) {
                                    Text(
                                        text = formatAuthError((uiState as AuthUiState.Error).mensaje),
                                        color = MaterialTheme.colorScheme.error,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        modifier = Modifier.padding(top = 6.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.height(18.dp))

                                Button(
                                    onClick = {
                                        validationError = null
                                        if (email.isBlank() || password.isBlank()) {
                                            validationError = "Por favor, ingresa tu correo y contraseña."
                                            return@Button
                                        }
                                        viewModel.login(email.trim(), password)
                                    },
                                    enabled = uiState !is AuthUiState.Loading,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(52.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                                ) {
                                    if (uiState is AuthUiState.Loading) {
                                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                                    } else {
                                        Text("INICIAR SESIÓN", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                TextButton(
                                    onClick = { showOtherMethods = false },
                                    modifier = Modifier.align(Alignment.CenterHorizontally)
                                ) {
                                    Text("Ver otros métodos de acceso", color = Color(0xFF64748B), fontSize = 13.sp)
                                }
                            }
                        }
                    } else {
                        // ── CONTENIDO DE LA PESTAÑA CREAR CUENTA ────────────────
                        Column(modifier = Modifier.fillMaxWidth()) {
                            // 1. Nombre Completo
                            OutlinedTextField(
                                value = name,
                                onValueChange = { name = it; validationError = null },
                                label = { Text("Nombre Completo") },
                                leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true,
                                colors = textFieldColors
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // 2. Número de Teléfono
                            OutlinedTextField(
                                value = phone,
                                onValueChange = { phone = it; validationError = null },
                                label = { Text("Número de Teléfono") },
                                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true,
                                colors = textFieldColors
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // 3. Correo Electrónico
                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it; validationError = null },
                                label = { Text("Correo Electrónico") },
                                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true,
                                colors = textFieldColors
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // 4. Contraseña
                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it; validationError = null },
                                label = { Text("Contraseña (mín. 6 car.)") },
                                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                trailingIcon = {
                                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                        Icon(
                                            imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = null
                                        )
                                    }
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true,
                                colors = textFieldColors
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // 5. Confirmar Contraseña
                            OutlinedTextField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it; validationError = null },
                                label = { Text("Confirmar Contraseña") },
                                leadingIcon = { Icon(Icons.Default.LockReset, contentDescription = null) },
                                visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                trailingIcon = {
                                    IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                                        Icon(
                                            imageVector = if (confirmPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = null
                                        )
                                    }
                                },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true,
                                colors = textFieldColors
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // ── CHECKBOX LEGAL Y ENLACES INDEPENDIENTES ─────────
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Checkbox(
                                    checked = isTermsAccepted,
                                    onCheckedChange = { isTermsAccepted = it },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = Color(0xFF2563EB),
                                        uncheckedColor = Color(0xFF94A3B8)
                                    )
                                )
                                Spacer(modifier = Modifier.width(6.dp))

                                val termsText = buildAnnotatedString {
                                    append("Acepto los ")
                                    pushStringAnnotation(tag = "TERMS", annotation = "terms")
                                    withStyle(style = SpanStyle(color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold, textDecoration = TextDecoration.Underline)) {
                                        append("Términos y Condiciones")
                                    }
                                    pop()
                                    append(" y las ")
                                    pushStringAnnotation(tag = "PRIVACY", annotation = "privacy")
                                    withStyle(style = SpanStyle(color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold, textDecoration = TextDecoration.Underline)) {
                                        append("Políticas de Privacidad")
                                    }
                                    pop()
                                    append(" de TuaniGo.")
                                }

                                ClickableText(
                                    text = termsText,
                                    style = androidx.compose.ui.text.TextStyle(
                                        fontSize = 12.sp,
                                        color = Color(0xFF475569),
                                        lineHeight = 16.sp
                                    ),
                                    onClick = { offset ->
                                        termsText.getStringAnnotations(tag = "TERMS", start = offset, end = offset).firstOrNull()?.let {
                                            val target = termsUrl?.takeIf { u -> u.isNotBlank() }
                                            if (target != null) {
                                                try {
                                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(target)))
                                                } catch (e: Exception) {
                                                    Toast.makeText(context, "No se pudo abrir el enlace legal.", Toast.LENGTH_SHORT).show()
                                                }
                                            } else {
                                                Toast.makeText(context, "Los Términos y Condiciones no están disponibles en este momento.", Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                        termsText.getStringAnnotations(tag = "PRIVACY", start = offset, end = offset).firstOrNull()?.let {
                                            val target = privacyUrl?.takeIf { u -> u.isNotBlank() }
                                            if (target != null) {
                                                try {
                                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(target)))
                                                } catch (e: Exception) {
                                                    Toast.makeText(context, "No se pudo abrir el enlace legal.", Toast.LENGTH_SHORT).show()
                                                }
                                            } else {
                                                Toast.makeText(context, "La Política de Privacidad no está disponible en este momento.", Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                    }
                                )
                            }

                            if (validationError != null) {
                                Text(
                                    text = validationError!!,
                                    color = MaterialTheme.colorScheme.error,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }

                            if (uiState is AuthUiState.Error) {
                                Text(
                                    text = formatAuthError((uiState as AuthUiState.Error).mensaje),
                                    color = MaterialTheme.colorScheme.error,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            // Botón Principal: Crear cuenta →
                            Button(
                                onClick = {
                                    validationError = null
                                    if (name.isBlank()) {
                                        validationError = "Por favor, ingresa tu nombre completo."
                                        return@Button
                                    }
                                    if (email.isBlank()) {
                                        validationError = "Por favor, ingresa tu correo electrónico."
                                        return@Button
                                    }
                                    if (password.length < 6) {
                                        validationError = "La contraseña debe tener al menos 6 caracteres."
                                        return@Button
                                    }
                                    if (password != confirmPassword) {
                                        validationError = "Las contraseñas no coinciden."
                                        return@Button
                                    }
                                    viewModel.register(email.trim(), password, name.trim(), phone.trim(), "customer")
                                },
                                enabled = uiState !is AuthUiState.Loading,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))
                            ) {
                                if (uiState is AuthUiState.Loading) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                                } else {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.Center
                                    ) {
                                        Text(
                                            text = "Crear cuenta",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = Color.White
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Icon(
                                            imageVector = Icons.Default.ArrowForward,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Enlace alternador: ¿Ya tienes cuenta? Inicia sesión
                            TextButton(
                                onClick = {
                                    isLogin = true
                                    validationError = null
                                    viewModel.resetState()
                                },
                                enabled = uiState !is AuthUiState.Loading,
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            ) {
                                Text(
                                    text = "¿Ya tienes cuenta? Inicia sesión",
                                    color = Color(0xFF2563EB),
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }

                    // Indicador de carga dinámico
                    AnimatedVisibility(
                        visible = uiState is AuthUiState.Loading,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.5.dp,
                                color = Color(0xFF2563EB)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Procesando... Por favor espera",
                                fontSize = 13.sp,
                                color = Color(0xFF2563EB),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // ── MODO INVITADO (GUEST MODE) CON DIVISORES E ICONO ─────
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null
                                ) {
                                    navController.navigate("guest_home") {
                                        popUpTo("login_register") { inclusive = true }
                                    }
                                }
                                .padding(horizontal = 10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Visibility,
                                contentDescription = null,
                                tint = Color(0xFF64748B),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Explorar como invitado",
                                color = Color(0xFF64748B),
                                fontWeight = FontWeight.Medium,
                                fontSize = 12.5.sp
                            )
                        }
                        HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
                    }
                }
            }
        }
    }
}

