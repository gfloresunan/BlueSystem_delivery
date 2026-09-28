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
                    text = "¿Deseas proteger BlueSystem con tu huella digital?",
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
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFEEF2FF))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 60.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header Logo / Text
            Icon(
                imageVector = Icons.Default.LocalShipping,
                contentDescription = "Logo",
                tint = Color(0xFF6366F1),
                modifier = Modifier.size(80.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "BlueSystem",
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF1E293B)
            )
            Text(
                text = "Delivery Express",
                fontSize = 16.sp,
                color = Color(0xFF64748B),
                letterSpacing = 1.sp
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Auth Card with rounded top
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = if (isLogin) "Bienvenido" else "Crear Cuenta",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1E293B)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (isLogin) "Ingresa o regístrate para continuar" else "Completa tus datos para unirte a BlueSystem",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    // --- UX Improvement #3: Card de Continuar como Ultimo Usuario ---
                    if (lastEmail.isNotEmpty() && isLogin && !showOtherMethods) {
                        Surface(
                            onClick = {
                                if (lastEmail.isNotEmpty()) {
                                    email = lastEmail
                                }
                                showOtherMethods = true
                            },
                            enabled = uiState !is AuthUiState.Loading,
                            shape = RoundedCornerShape(14.dp),
                            color = Color(0xFFF8FAFC),
                            border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 20.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(42.dp)
                                        .background(Color(0xFFEEF2FF), RoundedCornerShape(21.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = (lastName.ifEmpty { lastEmail }).take(1).uppercase(),
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF4F46E5),
                                        fontSize = 18.sp
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(text = "Continuar como", fontSize = 11.sp, color = Color.Gray)
                                    Text(
                                        text = lastName.ifEmpty { lastEmail },
                                        fontSize = 14.sp,
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
                                        fontSize = 10.sp,
                                        color = Color(0xFF4F46E5),
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                    }

                    // Social Auth Buttons (UX Improvement #6: Google Credential Manager One Tap)
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
                            .height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Color.Black
                        ),
                        border = BorderStroke(1.dp, Color(0xFFCBD5E1))
                    ) {
                        Image(
                            painter = painterResource(id = com.example.R.drawable.ic_google_logo),
                            contentDescription = "Logotipo Oficial de Google",
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("Continuar con Google", fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B))
                    }

                    Spacer(modifier = Modifier.height(16.dp))

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
                            .height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF1877F2),
                            contentColor = Color.White
                        )
                    ) {
                        Icon(Icons.Default.Facebook, contentDescription = "Facebook")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Continuar con Facebook", fontWeight = FontWeight.SemiBold)
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
                        Text(" o ", color = Color.Gray, modifier = Modifier.padding(horizontal = 8.dp))
                        HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE2E8F0))
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    OutlinedButton(
                        onClick = { showOtherMethods = !showOtherMethods },
                        enabled = uiState !is AuthUiState.Loading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF475569)),
                        border = BorderStroke(1.dp, Color(0xFFCBD5E1))
                    ) {
                        Text(if (showOtherMethods) "Ocultar formulario" else "Otro método (Email/Teléfono)", fontWeight = FontWeight.SemiBold)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // --- UX Improvement #1: Animación de Entrada FadeIn + ScaleIn (250ms) ---
                    AnimatedVisibility(
                        visible = isLogin && !showOtherMethods,
                        enter = fadeIn(animationSpec = tween(250)) + scaleIn(initialScale = 0.95f, animationSpec = tween(250)),
                        exit = fadeOut(animationSpec = tween(200)) + shrinkVertically(animationSpec = tween(200))
                    ) {
                        Surface(
                            onClick = {
                                isLogin = false
                                showOtherMethods = true
                                viewModel.resetState()
                            },
                            enabled = uiState !is AuthUiState.Loading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(60.dp),
                            shape = RoundedCornerShape(14.dp),
                            color = Color(0xFFEEF2FF),
                            border = BorderStroke(1.5.dp, Color(0xFF6366F1)),
                            shadowElevation = 2.dp
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(horizontal = 16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(10.dp),
                                        color = Color(0xFF6366F1).copy(alpha = 0.15f),
                                        modifier = Modifier.size(38.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = Icons.Default.PersonAdd,
                                                contentDescription = "Registro",
                                                tint = Color(0xFF4F46E5),
                                                modifier = Modifier.size(22.dp)
                                            )
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = "¿No tienes cuenta?",
                                            fontSize = 11.sp,
                                            color = Color(0xFF6366F1),
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            text = "Regístrate aquí",
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF1E1B4B)
                                        )
                                    }
                                }
                                Icon(
                                    imageVector = Icons.Default.ArrowForward,
                                    contentDescription = "Ir a registro",
                                    tint = Color(0xFF4F46E5),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }

                    // --- UX Improvement #2: Animación Fluida de Formulario (Expand, Slide, Fade) ---
                    AnimatedVisibility(
                        visible = showOtherMethods,
                        enter = expandVertically(animationSpec = tween(300)) + fadeIn(animationSpec = tween(300)) + slideInVertically(initialOffsetY = { -20 }, animationSpec = tween(300)),
                        exit = shrinkVertically(animationSpec = tween(300)) + fadeOut(animationSpec = tween(300)) + slideOutVertically(targetOffsetY = { -20 }, animationSpec = tween(300))
                    ) {
                        Column(modifier = Modifier.padding(top = 16.dp)) {
                            // --- Campo: Nombre (Solo Registro) ---
                            AnimatedVisibility(visible = !isLogin) {
                                OutlinedTextField(
                                    value = name,
                                    onValueChange = { name = it },
                                    label = { Text("Nombre Completo") },
                                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true,
                                    colors = textFieldColors
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                            }

                            // --- Campo: Teléfono (Solo Registro) ---
                            AnimatedVisibility(visible = !isLogin) {
                                OutlinedTextField(
                                    value = phone,
                                    onValueChange = { phone = it },
                                    label = { Text("Número de Teléfono") },
                                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true,
                                    colors = textFieldColors
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                            }

                            // --- Campo: Email ---
                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it },
                                label = { Text("Correo Electrónico") },
                                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true,
                                colors = textFieldColors
                            )
                            
                            Spacer(modifier = Modifier.height(16.dp))

                            // --- Campo: Contraseña ---
                            OutlinedTextField(
                                value = password,
                                onValueChange = {
                                    password = it
                                    validationError = null
                                },
                                label = { Text(if (isLogin) "Contraseña" else "Contraseña (mín. 6 car.)") },
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

                            // --- Enlace: ¿Olvidaste tu contraseña? (Solo Login) ---
                            AnimatedVisibility(visible = isLogin) {
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
                                            color = Color(0xFF6366F1),
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }
                                }
                            }

                            // --- Campo: Confirmar Contraseña (Solo Registro) ---
                            AnimatedVisibility(visible = !isLogin) {
                                Column {
                                    Spacer(modifier = Modifier.height(16.dp))
                                    OutlinedTextField(
                                        value = confirmPassword,
                                        onValueChange = {
                                            confirmPassword = it
                                            validationError = null
                                        },
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
                                }
                            }

                            // --- Validación local de campos ---
                            if (validationError != null) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = validationError!!,
                                    color = MaterialTheme.colorScheme.error,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            // --- UX Improvement #4: Feedback de Error Amigable desde Backend ---
                            if (uiState is AuthUiState.Error) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = formatAuthError((uiState as AuthUiState.Error).mensaje),
                                    color = MaterialTheme.colorScheme.error,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            Spacer(modifier = Modifier.height(24.dp))

                            // --- Botón Principal ---
                            Button(
                                onClick = {
                                    validationError = null
                                    if (isLogin) {
                                        if (email.isBlank() || password.isBlank()) {
                                            validationError = "Por favor, ingresa tu correo y contraseña."
                                            return@Button
                                        }
                                        viewModel.login(email.trim(), password)
                                    } else {
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
                                        // Customer App registra exclusivamente con rol 'customer'
                                        viewModel.register(email.trim(), password, name.trim(), phone.trim(), "customer")
                                    }
                                },
                                enabled = uiState !is AuthUiState.Loading,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                            ) {
                                if (uiState is AuthUiState.Loading) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                                } else {
                                    Text(
                                        text = if (isLogin) "INICIAR SESIÓN" else "REGISTRARME",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp,
                                        color = Color.White
                                    )
                                }
                            }

                            // --- Botón Alternador ---
                            TextButton(
                                onClick = {
                                    isLogin = !isLogin
                                    validationError = null
                                    viewModel.resetState()
                                },
                                enabled = uiState !is AuthUiState.Loading,
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            ) {
                                Text(
                                    text = if (isLogin) "¿No tienes cuenta? Regístrate aquí" else "¿Ya tienes cuenta? Inicia Sesión",
                                    color = Color(0xFF4F46E5),
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    // --- UX Improvement #5: Indicador Visual de Carga Dinámico ---
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
                                color = Color(0xFF6366F1)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Iniciando sesión... Por favor espera",
                                fontSize = 13.sp,
                                color = Color(0xFF4F46E5),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // --- BOTÓN EXPLORACIÓN PÚBLICA (GUEST MODE) ---
                    TextButton(
                        onClick = {
                            navController.navigate("guest_home") {
                                popUpTo("login_register") { inclusive = true }
                            }
                        },
                        enabled = uiState !is AuthUiState.Loading,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    ) {
                        Text(
                            text = "Explorar como invitado",
                            color = Color.Gray,
                            fontWeight = FontWeight.Medium,
                            fontSize = 14.sp
                        )
                    }
                }
            }
        }
    }
}
