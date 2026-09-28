package com.example
import com.example.domain.model.AppRole
import com.example.domain.engine.auth.AppRoleResolver
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.PersistentCacheSettings
import com.google.firebase.firestore.FirebaseFirestore

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import kotlinx.coroutines.tasks.await
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.domain.usecase.CheckSessionUseCase
import com.example.domain.usecase.ObtenerTipoUsuarioUseCase
import com.example.presentation.splash.SplashScreen
import com.example.presentation.splash.SplashViewModel
import com.example.presentation.splash.SplashViewModelFactory
import com.example.presentation.auth.AuthScreen
import com.example.presentation.auth.AuthViewModel
import com.example.presentation.auth.AuthViewModelFactory
import com.example.presentation.auth.BiometricUnlockScreen
import com.example.presentation.auth.SecuritySettingsScreen
import com.example.presentation.auth.BiometricPreferences
import com.example.presentation.admin.AdminUsersScreen
import com.example.presentation.admin.AdminUsersViewModel
import com.example.presentation.admin.AdminUsersViewModelFactory

import com.example.presentation.business.BusinessDashboardScreen
import com.example.presentation.customer.CustomerHomeScreen
import com.example.presentation.courier.CourierMainDashboardScreen

import com.example.ui.theme.MyApplicationTheme
import com.example.data.sync.RealtimeSyncOrchestrator
import com.example.domain.model.AppUpdateResolution
import com.example.presentation.customer.components.AppUpdateModal
import com.example.data.update.AppUpdateFrequencyManager
import com.example.presentation.screens.MaintenanceScreen
import com.example.presentation.screens.ForceUpdateScreen
import com.example.presentation.screens.SuspendedScreen
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.lifecycle.lifecycleScope

import androidx.navigation.NavType
import androidx.navigation.navArgument

import androidx.fragment.app.FragmentActivity

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object LoginRegister : Screen("login_register")
    object SeleccionRol : Screen("seleccion_rol")
    object SolicitarEnvio : Screen("solicitar_envio")
    object EsperandoRepartidor : Screen("esperando_repartidor/{pedidoId}") {
        fun createRoute(pedidoId: String) = "esperando_repartidor/$pedidoId"
    }
    object TrackingPedido : Screen("tracking_pedido/{pedidoId}/{motorizadoId}") {
        fun createRoute(pedidoId: String, motorizadoId: String) = "tracking_pedido/$pedidoId/$motorizadoId"
    }
    object Admin : Screen("admin")
    object Courier : Screen("courier")
    object RutaActiva : Screen("ruta_activa/{pedidoId}/{comercioNombre}/{comercioDireccion}/{clienteDireccion}") {
        fun createRoute(pedidoId: String, comercioNombre: String, comercioDireccion: String, clienteDireccion: String): String {
            return "ruta_activa/$pedidoId/${android.net.Uri.encode(comercioNombre)}/${android.net.Uri.encode(comercioDireccion)}/${android.net.Uri.encode(clienteDireccion)}"
        }
    }
    object AddressManager : Screen("address_manager")
    object OrdersHistory : Screen("orders_history")
    object OrderDetail : Screen("order_detail/{orderId}") {
        fun createRoute(orderId: String) = "order_detail/$orderId"
    }
    object OrderChat : Screen("order_chat/{orderId}?domain={domain}") {
        fun createRoute(
            orderId: String,
            domain: com.example.domain.model.ChatDomain = com.example.domain.model.ChatDomain.COMMERCE_ORDER
        ) = "order_chat/$orderId?domain=${domain.name}"
    }
    object BiometricUnlock : Screen("biometric_unlock/{targetRoute}") {
        fun createRoute(targetRoute: String) = "biometric_unlock/${android.net.Uri.encode(targetRoute)}"
    }
    object SecuritySettings : Screen("security_settings")
    object LoyaltyPoints : Screen("loyalty_points")
    object LoyaltyLevel : Screen("loyalty_level")
    object CustomerCoupons : Screen("customer_coupons")
}

class MainActivity : FragmentActivity() {
    private val realtimeOrchestrator = RealtimeSyncOrchestrator()

    // ── App Lock: Timeout de 5 minutos en segundo plano ─────────────────────
    private var backgroundStartTime = 0L
    private val BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000L // 5 minutos

    // NavController compartido para el re-bloqueo por timeout
    private var _navControllerRef: androidx.navigation.NavController? = null

    // Ruta pendiente de notificación para Cold Start (app cerrada)
    private var pendingTargetRoute: String? = null

    private val requestNotificationPermissionLauncher = registerForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Log.d("NOTIFICATION_PERM", "Permiso POST_NOTIFICATIONS concedido por el usuario")
        } else {
            Log.w("NOTIFICATION_PERM", "Permiso POST_NOTIFICATIONS denegado por el usuario")
        }
    }

    private fun checkAndRequestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            val hasPermission = androidx.core.content.ContextCompat.checkSelfPermission(
                this,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

            if (!hasPermission) {
                requestNotificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
            } else {
                Log.d("NOTIFICATION_PERM", "Permiso POST_NOTIFICATIONS ya concedido previamente")
            }
        }
    }

    fun consumePendingNotificationRoute(): String? {
        val route = pendingTargetRoute
        pendingTargetRoute = null
        return route
    }

    override fun onStop() {
        super.onStop()
        backgroundStartTime = System.currentTimeMillis()
        Log.d("APP_LOCK", "App a segundo plano: $backgroundStartTime")
    }

    override fun onStart() {
        super.onStart()
        if (backgroundStartTime > 0) {
            val elapsed = System.currentTimeMillis() - backgroundStartTime
            val biometricEnabled = BiometricPreferences.isBiometricEnabled(this)
            val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
            Log.d("APP_LOCK", "App vuelve del segundo plano. Elapsed: ${elapsed}ms, biometric: $biometricEnabled, user: ${currentUser?.uid}")

            if (elapsed >= BACKGROUND_TIMEOUT_MS && biometricEnabled && currentUser != null) {
                // Obtener el destino actual para re-bloquear
                val navController = _navControllerRef
                if (navController != null) {
                    val currentRoute = navController.currentDestination?.route ?: ""
                    // Solo re-bloquear si no estamos ya en la pantalla de desbloqueo o login
                    if (!currentRoute.startsWith("biometric_unlock") &&
                        currentRoute != Screen.LoginRegister.route &&
                        currentRoute != Screen.Splash.route
                    ) {
                        Log.d("APP_LOCK", "TIMEOUT BIOMÉTRICO: Re-bloqueando app desde ruta: $currentRoute")
                        navController.navigate(Screen.BiometricUnlock.createRoute(currentRoute)) {
                            popUpTo(currentRoute) { inclusive = false }
                        }
                    }
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        Log.d("APP_BOOT", "MainActivity creada")

        // 0. Inicializar canales de notificación globalmente e invocar solicitud de permisos runtime
        com.example.service.DeliveryFirebaseMessagingService.createNotificationChannels(this)
        checkAndRequestNotificationPermission()
        com.example.presentation.customer.profile.ProfileThemeManager.init(this)

        // Audit Maps API Key and exact APK SHA-1 fingerprint in runtime
        try {
            val appInfo = packageManager.getApplicationInfo(packageName, android.content.pm.PackageManager.GET_META_DATA)
            val apiKey = appInfo.metaData?.getString("com.google.android.geo.API_KEY")
            Log.d("MAPS_KEY_AUDIT", "Clave Maps leída del manifiesto en tiempo de ejecución: $apiKey")

            val signatures = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                packageManager.getPackageInfo(
                    packageName,
                    android.content.pm.PackageManager.GET_SIGNING_CERTIFICATES
                ).signingInfo?.apkContentsSigners ?: emptyArray()
            } else {
                @Suppress("DEPRECATION")
                packageManager.getPackageInfo(
                    packageName,
                    android.content.pm.PackageManager.GET_SIGNATURES
                ).signatures ?: emptyArray()
            }

            for (sig in signatures) {
                val md = java.security.MessageDigest.getInstance("SHA1")
                md.update(sig.toByteArray())

                val sha = md.digest().joinToString(":") {
                    "%02X".format(it)
                }

                Log.d("APK_SHA", sha)
            }
        } catch (e: Exception) {
            Log.e("MAPS_KEY_AUDIT", "Error leyendo metadatos o firma del APK", e)
        }

        // 1. Configuración de Firestore (persistencia offline)
        val settings = FirebaseFirestoreSettings.Builder()
            .setLocalCacheSettings(PersistentCacheSettings.newBuilder()
                .setSizeBytes(FirebaseFirestoreSettings.CACHE_SIZE_UNLIMITED)
                .build())
            .build()
        try {
            FirebaseFirestore.getInstance().firestoreSettings = settings
            Log.d("APP_BOOT", "Firestore habilitado")
        } catch (e: Exception) {
            // Might have been already initialized
        }

        // Configuración de Caché Global de Imágenes (Coil)
        try {
            val imageLoader = coil.ImageLoader.Builder(applicationContext)
                .memoryCache {
                    coil.memory.MemoryCache.Builder(applicationContext)
                        .maxSizePercent(0.25)
                        .build()
                }
                .diskCache {
                    coil.disk.DiskCache.Builder()
                        .directory(applicationContext.cacheDir.resolve("image_cache"))
                        .maxSizeBytes(50 * 1024 * 1024)
                        .build()
                }
                .respectCacheHeaders(false)
                .build()
            coil.Coil.setImageLoader(imageLoader)
            Log.d("APP_BOOT", "Coil ImageLoader configurado con caché de 50MB")
        } catch (e: Exception) {
            Log.e("APP_BOOT", "Error configurando Coil ImageLoader", e)
        }

        // 2. Inicialización defensiva de Firebase (por si el plugin no la aplicó)
        if (com.google.firebase.FirebaseApp.getApps(this).isEmpty()) {
            val options = com.google.firebase.FirebaseOptions.Builder()
                .setApplicationId("1:514416631826:android:788b99430f87324e88b8cb")
                .setProjectId("bluesystem-7c9af")
                .setStorageBucket("bluesystem-7c9af.firebasestorage.app")
                .setApiKey("AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI")
                .build()
            com.google.firebase.FirebaseApp.initializeApp(this, options)
        }

        // Inicializar Firebase App Check para depuración o producción
        try {
            val firebaseAppCheck = com.google.firebase.appcheck.FirebaseAppCheck.getInstance()
            if (BuildConfig.DEBUG) {
                firebaseAppCheck.installAppCheckProviderFactory(
                    com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory.getInstance()
                )
                Log.d("APP_BOOT", "Firebase App Check: Debug provider registrado")
            } else {
                firebaseAppCheck.installAppCheckProviderFactory(
                    com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory.getInstance()
                )
                Log.d("APP_BOOT", "Firebase App Check: Play Integrity provider registrado")
            }
        } catch (e: Exception) {
            Log.e("APP_BOOT", "Error al registrar proveedor de Firebase App Check", e)
        }

        // 3. Analytics: inicializado DESPUÉS de confirmar que Firebase está disponible
        com.example.AnalyticsHelper.init()
        com.example.AnalyticsHelper.logAppOpen()

        // 4. Log dinámico de autenticación y listener de estado
        val auth = com.google.firebase.auth.FirebaseAuth.getInstance()
        Log.d("AUDIT_LOG", "APP_START | UID: ${auth.currentUser?.uid ?: "null"} | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()} | Route: splash")

        auth.addAuthStateListener { firebaseAuth ->
            val user = firebaseAuth.currentUser
            val currentRoute = _navControllerRef?.currentDestination?.route ?: "splash"
            Log.d("AUDIT_LOG", "AUTH_STATE_CHANGED | UID: ${user?.uid ?: "null"} | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()} | Route: $currentRoute")
            if (user == null) {
                com.example.data.sync.SessionManager.setGuestMode()
                realtimeOrchestrator.stopUserSession()
            } else {
                com.example.data.sync.SessionManager.setAuthenticatedMode(user.uid)
                lifecycleScope.launch {
                    com.example.data.FcmManager.registerCurrentDeviceToken()
                }
            }
        }

        // Procesar intent de notificación si la app fue lanzada desde el System Tray
        handleNotificationIntent(intent)

        // 5. Validar y registrar Google Play Services
        try {
            val playServicesCode = com.google.android.gms.common.GoogleApiAvailability.getInstance()
                .isGooglePlayServicesAvailable(this)
            if (playServicesCode == com.google.android.gms.common.ConnectionResult.SUCCESS) {
                Log.d("APP_BOOT", "Play Services OK")
            }
        } catch (e: Exception) {
            // Ignorar fallas silenciosamente en telemetría
        }

        // 6. Validar si permisos de ubicación ya están concedidos
        val locationGranted = androidx.core.content.ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (locationGranted) {
            Log.d("APP_BOOT", "Permisos concedidos")
        }

        // 7. Sincronización proactiva de configuración global remota (App Update Center)
        realtimeOrchestrator.configRepo.startListening()

        enableEdgeToEdge()

        setContent {
            val appThemeMode by com.example.presentation.customer.profile.ProfileThemeManager.currentTheme.collectAsState()
            val isDarkTheme = when (appThemeMode) {
                com.example.presentation.customer.profile.AppThemeMode.DARK -> true
                com.example.presentation.customer.profile.AppThemeMode.LIGHT -> false
                com.example.presentation.customer.profile.AppThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
            }
            val brandTokens = remember {
                com.example.whitelabel.BrandHydrationResolver.resolveTokens("default", null)
            }
            com.example.whitelabel.BrandThemeProvider(tokens = brandTokens) {
                MyApplicationTheme(darkTheme = isDarkTheme) {
                    val sysConfig by realtimeOrchestrator.config.collectAsState()
                    val isBlocked by realtimeOrchestrator.isBlocked.collectAsState()
                    val forceUpdate by realtimeOrchestrator.forceUpdate.collectAsState()
                    val appUpdateResolution by realtimeOrchestrator.appUpdateResolution.collectAsState()
                    val frequencyManager = remember { AppUpdateFrequencyManager() }
                    val context = androidx.compose.ui.platform.LocalContext.current

                    if (sysConfig.maintenanceMode) {
                        MaintenanceScreen(message = sysConfig.maintenanceMessage)
                    } else if (forceUpdate || (appUpdateResolution is AppUpdateResolution.ShowUpdate && (appUpdateResolution as AppUpdateResolution.ShowUpdate).isForced)) {
                        val forcedUpdate = (appUpdateResolution as? AppUpdateResolution.ShowUpdate)
                        if (forcedUpdate != null) {
                            AppUpdateModal(
                                config = forcedUpdate.config,
                                isForced = true,
                                canDismiss = false,
                                storeUrl = forcedUpdate.storeUrl
                            )
                        } else {
                            ForceUpdateScreen()
                        }
                    } else if (isBlocked) {
                        SuspendedScreen(
                            supportPhone = sysConfig.supportPhone,
                            supportWhatsapp = sysConfig.supportWhatsapp,
                            onDismiss = {
                                Log.d("AUTO_LOGOUT_AUDIT", "Logout solicitado desde: MainActivity.SuspendedScreen.onDismiss\nStackTrace: ${Throwable().stackTraceToString()}")
                                com.google.firebase.auth.FirebaseAuth.getInstance().signOut()
                                realtimeOrchestrator.stopUserSession()
                            }
                        )
                    } else {
                        val authManager = remember { AuthManager() }
                        val firebaseManager = remember { FirebaseManager() }
                        val navController = rememberNavController()
                        _navControllerRef = navController

                        val nonForcedUpdate = (appUpdateResolution as? AppUpdateResolution.ShowUpdate)?.takeIf { !it.isForced }
                        var isDismissedInSession by remember(nonForcedUpdate?.config?.campaignId) { mutableStateOf(false) }

                        Box(modifier = Modifier.fillMaxSize()) {
                            NavHost(
                                navController = navController,
                                startDestination = Screen.Splash.route
                            ) {
                    composable(Screen.Splash.route) {
                        val checkSessionUseCase = remember { CheckSessionUseCase(authManager) }
                        val obtenerTipoUsuarioUseCase = remember { ObtenerTipoUsuarioUseCase(authManager) }
                        val factory = remember { SplashViewModelFactory(checkSessionUseCase, obtenerTipoUsuarioUseCase, applicationContext) }
                        val splashViewModel: SplashViewModel = viewModel(factory = factory)

                        SplashScreen(
                            viewModel = splashViewModel,
                            onNavigate = { event ->
                                val currentUser = authManager.currentUser
                                val uid = currentUser?.uid
                                val destinationRoute = when (event) {
                                    is SplashViewModel.NavigationEvent.NavigateToLoginRegister -> {
                                        Screen.LoginRegister.route
                                    }
                                    is SplashViewModel.NavigationEvent.NavigateToGuest -> {
                                        realtimeOrchestrator.startListeningGlobal(isGuest = true)
                                        "guest_home"
                                    }
                                    is SplashViewModel.NavigationEvent.NavigateToCourier -> {
                                        uid?.let { realtimeOrchestrator.startListeningUser(it) }
                                        Screen.Courier.route
                                    }
                                    is SplashViewModel.NavigationEvent.NavigateToAdmin -> {
                                        uid?.let { realtimeOrchestrator.startListeningUser(it) }
                                        Screen.Admin.route
                                    }
                                    is SplashViewModel.NavigationEvent.NavigateToBusinessDashboard -> {
                                        uid?.let { realtimeOrchestrator.startListeningUser(it) }
                                        "business_dashboard"
                                    }
                                    is SplashViewModel.NavigationEvent.NavigateToSolicitarEnvio -> {
                                        uid?.let { realtimeOrchestrator.startListeningUser(it) }
                                        Screen.SolicitarEnvio.route
                                    }
                                    is SplashViewModel.NavigationEvent.NavigateToBiometricUnlock -> {
                                        uid?.let { realtimeOrchestrator.startListeningUser(it) }
                                        Screen.BiometricUnlock.createRoute(event.targetRoute)
                                    }
                                }
                                val pendingRoute = consumePendingNotificationRoute()
                                val finalDestination = pendingRoute ?: destinationRoute
                                Log.d("AUDIT_LOG", "SPLASH_FINISHED | UID: ${uid ?: "guest"} | Destination: $finalDestination (Pending: ${pendingRoute != null})")
                                navController.navigate(finalDestination) {
                                    popUpTo(Screen.Splash.route) { inclusive = true }
                                }
                                Log.d("AUDIT_LOG", "NAVIGATION_COMPLETED | Route: $finalDestination | UID: ${uid ?: "guest"}")
                            }
                        )
                    }
                    composable(Screen.LoginRegister.route) {
                        val factory = remember { AuthViewModelFactory(authManager) }
                        val authViewModel: AuthViewModel = viewModel(factory = factory)
                        AuthScreen(
                            navController = navController,
                            viewModel = authViewModel,
                            firebaseManager = firebaseManager
                        )
                    }
                    composable("auth_screen") {
                        val factory = remember { AuthViewModelFactory(authManager) }
                        val authViewModel: AuthViewModel = viewModel(factory = factory)
                        AuthScreen(
                            navController = navController,
                            viewModel = authViewModel,
                            firebaseManager = firebaseManager
                        )
                    }
                    composable(Screen.SeleccionRol.route) {
                        RoleSelectorScreen(
                            onRoleSelected = { role ->
                                when (role) {
                                    "admin" -> navController.navigate(Screen.Admin.route)
                                    "courier" -> navController.navigate(Screen.Courier.route)
                                    "business" -> navController.navigate("business_dashboard")
                                    "customer" -> navController.navigate(Screen.SolicitarEnvio.route)
                                }
                            }
                        )
                    }

                    // ── Ruta: Biometric Unlock (App Lock) ───────────────────────────────────
                    composable(
                        route = Screen.BiometricUnlock.route,
                        arguments = listOf(navArgument("targetRoute") { type = NavType.StringType })
                    ) { backStackEntry ->
                        val encodedTarget = backStackEntry.arguments?.getString("targetRoute") ?: ""
                        val targetRoute = android.net.Uri.decode(encodedTarget)

                        // Timeout de 5 min: detectar vuelta desde segundo plano
                        var backgroundTimestamp by remember { mutableLongStateOf(0L) }
                        val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
                        DisposableEffect(lifecycleOwner) {
                            val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
                                when (event) {
                                    androidx.lifecycle.Lifecycle.Event.ON_PAUSE -> {
                                        backgroundTimestamp = System.currentTimeMillis()
                                    }
                                    androidx.lifecycle.Lifecycle.Event.ON_RESUME -> {
                                        // Si pasaron más de 5 minutos en segundo plano, re-bloquear
                                        // (La pantalla ya está mostrando el prompt — no se necesita acción adicional
                                        // porque BiometricUnlockScreen lanza el prompt al entrar)
                                    }
                                    else -> {}
                                }
                            }
                            lifecycleOwner.lifecycle.addObserver(observer)
                            onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
                        }

                        val biometricScope = rememberCoroutineScope()

                        BiometricUnlockScreen(
                            targetRoute = targetRoute,
                            onUnlockSuccess = { requestedRoute ->
                                biometricScope.launch {
                                    val prevRoute = navController.previousBackStackEntry?.destination?.route
                                    val canPop = navController.previousBackStackEntry != null &&
                                                 prevRoute != Screen.Splash.route &&
                                                 prevRoute != Screen.LoginRegister.route

                                    if (canPop) {
                                        Log.d("BIOMETRIC_GUARD", "BIOMETRIC_SUCCESS: Restaurando pantalla anterior de la pila ($prevRoute)")
                                        navController.popBackStack()
                                    } else {
                                        val currentUser = authManager.currentUser
                                        val context = applicationContext
                                        val resolution = AppRoleResolver.resolveRole(context, currentUser)
                                        val role = resolution.role
                                        val isAuth = AppRoleResolver.isRouteAuthorized(role, requestedRoute)
                                        val cleanRoute = if (requestedRoute.contains("{")) AppRoleResolver.getCanonicalDestination(role) else requestedRoute
                                        val safeRoute = if (isAuth) cleanRoute else AppRoleResolver.getCanonicalDestination(role)
                                        Log.d("BIOMETRIC_GUARD", "BIOMETRIC_SUCCESS | uid=${currentUser?.uid} | role=$role | safe=$safeRoute")
                                        navController.navigate(safeRoute) {
                                            popUpTo(Screen.BiometricUnlock.route) { inclusive = true }
                                        }
                                    }
                                }
                            },
                            onSignOut = {
                                performLogoutCleanup(realtimeOrchestrator, authManager, navController)
                            }
                        )
                    }

                    // ── Ruta: Configuración de Seguridad (Biometría) ────────────────────────
                    composable(Screen.SecuritySettings.route) {
                        SecuritySettingsScreen(
                            onBack = { navController.popBackStack() }
                        )
                    }

                    composable(Screen.Admin.route) {
                        AdminSurfaceGuard(navController, authManager) {
                            val coroutineScope = rememberCoroutineScope()
                            AdminDashboardScreen(
                                onBack = { navController.popBackStack() },
                                onNavigateToUsers = { navController.navigate("admin_users") },
                                onAsignarPedidoBackend = { pedidoId, motorizadoId ->
                                    coroutineScope.launch {
                                        firebaseManager.aceptarPedido(pedidoId, motorizadoId)
                                    }
                                },
                                firebaseManager = firebaseManager,
                                onLogout = {
                                    performLogoutCleanup(realtimeOrchestrator, authManager, navController)
                                }
                            )
                        }
                    }
                    
                    composable("admin_users") {
                        AdminSurfaceGuard(navController, authManager) {
                            val factory = remember { AdminUsersViewModelFactory(firebaseManager) }
                            val adminUsersViewModel: AdminUsersViewModel = viewModel(factory = factory)
                            AdminUsersScreen(
                                navController = navController,
                                viewModel = adminUsersViewModel
                            )
                        }
                    }

                    composable(Screen.Courier.route) {
                        CourierSurfaceGuard(navController, authManager) {
                            CourierMainDashboardScreen(
                                navController = navController,
                                firebaseManager = firebaseManager,
                                authManager = authManager,
                                onLogout = {
                                    performLogoutCleanup(realtimeOrchestrator, authManager, navController)
                                }
                            )
                        }
                    }
                    composable("driver_dashboard") {
                        CourierSurfaceGuard(navController, authManager) {
                            LaunchedEffect(Unit) {
                                Log.d("FLOTA_DEBUG", "REDIRECT_DRIVER_DASHBOARD_TO_CANONICAL_COURIER_ROUTE")
                                navController.navigate(Screen.Courier.route) {
                                    popUpTo("driver_dashboard") { inclusive = true }
                                }
                            }
                        }
                    }
                    composable(Screen.AddressManager.route) {
                        CustomerSurfaceGuard(navController, authManager, allowGuest = false) {
                            com.example.presentation.customer.profile.AddressManagerScreen(
                                onBackClick = { navController.popBackStack() },
                                onNavigateToLogin = { navController.navigate(Screen.LoginRegister.route) }
                            )
                        }
                    }
                    composable(Screen.OrdersHistory.route) {
                        CustomerSurfaceGuard(navController, authManager, allowGuest = false) {
                            com.example.presentation.customer.profile.OrdersHistoryScreen(
                                onNavigateToDetail = { orderId -> 
                                    navController.navigate(Screen.OrderDetail.createRoute(orderId))
                                },
                                onNavigateToCart = {
                                    navController.navigate("carrito_screen")
                                },
                                onNavigateToSolicitarEnvio = {
                                    navController.navigate("solicitar_envio_form")
                                }
                            )
                        }
                    }
                    composable(
                        route = Screen.OrderDetail.route,
                        arguments = listOf(androidx.navigation.navArgument("orderId") { type = androidx.navigation.NavType.StringType })
                    ) { backStackEntry ->
                        CustomerSurfaceGuard(navController, authManager, allowGuest = false) {
                            val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                            com.example.presentation.customer.profile.OrderDetailScreen(
                                orderId = orderId,
                                onBackClick = {
                                    navController.navigate("customer_dashboard?tab=3") {
                                        popUpTo("customer_dashboard") { inclusive = true }
                                    }
                                },
                                onNavigateToChat = { targetOrderId ->
                                    navController.navigate(Screen.OrderChat.createRoute(targetOrderId))
                                }
                            )
                        }
                    }
                    composable(
                        route = "customer/order_tracking/{orderId}",
                        arguments = listOf(androidx.navigation.navArgument("orderId") { type = androidx.navigation.NavType.StringType })
                    ) { backStackEntry ->
                        CustomerSurfaceGuard(navController, authManager, allowGuest = false) {
                            val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                            com.example.presentation.customer.profile.OrderDetailScreen(
                                orderId = orderId,
                                onBackClick = {
                                    navController.navigate("customer_dashboard?tab=3") {
                                        popUpTo("customer_dashboard") { inclusive = true }
                                    }
                                },
                                onNavigateToChat = { targetOrderId ->
                                    navController.navigate(Screen.OrderChat.createRoute(targetOrderId))
                                }
                            )
                        }
                    }
                    composable(
                        route = Screen.OrderChat.route,
                        arguments = listOf(
                            androidx.navigation.navArgument("orderId") { type = androidx.navigation.NavType.StringType },
                            androidx.navigation.navArgument("domain") {
                                type = androidx.navigation.NavType.StringType
                                defaultValue = com.example.domain.model.ChatDomain.COMMERCE_ORDER.name
                            }
                        )
                    ) { backStackEntry ->
                        val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                        val domainStr = backStackEntry.arguments?.getString("domain") ?: com.example.domain.model.ChatDomain.COMMERCE_ORDER.name
                        val domain = try {
                            com.example.domain.model.ChatDomain.valueOf(domainStr)
                        } catch (e: Exception) {
                            com.example.domain.model.ChatDomain.COMMERCE_ORDER
                        }
                        val context = androidx.compose.ui.platform.LocalContext.current
                        com.example.presentation.chat.OrderChatScreen(
                            orderId = orderId,
                            domain = domain,
                            onBack = {
                                val popped = navController.popBackStack()
                                if (!popped) {
                                    val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
                                    val role = com.example.domain.engine.auth.AppRoleResolver.getCachedRole(context, currentUser?.uid)
                                    val fallbackDestination = com.example.domain.engine.auth.AppRoleResolver.getCanonicalDestination(role)
                                    Log.d("OrderChatNav", "popBackStack devolvió false (pila vacía). Navegando a fallback ($role): $fallbackDestination")
                                    navController.navigate(fallbackDestination) {
                                        popUpTo(0) { inclusive = true }
                                    }
                                }
                            }
                        )
                    }

                    composable("guest_home") {
                        CustomerHomeScreen(
                            navController = navController,
                            firebaseManager = firebaseManager,
                            isGuest = true,
                            onLogout = {
                                navController.navigate(Screen.LoginRegister.route) {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        )
                    }
                    composable(
                        route = "customer_dashboard?tab={tab}",
                        arguments = listOf(androidx.navigation.navArgument("tab") { defaultValue = "0" })
                    ) { backStackEntry ->
                        CustomerSurfaceGuard(navController, authManager, allowGuest = true) {
                            val initialTab = backStackEntry.arguments?.getString("tab")?.toIntOrNull() ?: 0
                            val isAuthed = authManager.currentUser != null
                            CustomerHomeScreen(
                                navController = navController,
                                firebaseManager = firebaseManager,
                                isGuest = !isAuthed,
                                initialTab = if (!isAuthed && (initialTab == 1 || initialTab == 3 || initialTab == 4)) 0 else initialTab,
                                onLogout = {
                                    performLogoutCleanup(realtimeOrchestrator, authManager, navController)
                                }
                            )
                        }
                    }
                    composable(Screen.SolicitarEnvio.route) {
                        CustomerSurfaceGuard(navController, authManager, allowGuest = false) {
                            CustomerHomeScreen(
                                navController = navController,
                                firebaseManager = firebaseManager,
                                isGuest = false,
                                onLogout = {
                                    performLogoutCleanup(realtimeOrchestrator, authManager, navController)
                                }
                            )
                        }
                    }
                    composable("solicitar_envio_form") {
                        CustomerSurfaceGuard(navController, authManager, allowGuest = false) {
                            SolicitarEnvioScreen(
                                firebaseManager = firebaseManager,
                                onPedidoCreadoExitosamente = { nuevoPedidoId ->
                                    navController.navigate(Screen.EsperandoRepartidor.createRoute(nuevoPedidoId))
                                },
                                onGuardarPedidoFirestore = { id, origen, destino, metodo, costo, origenLat, origenLng, destinoLat, destinoLng, amountPaid, changeNeeded, receiptUrl, referenceNumber, payer, calculatedFee, customerOffer, senderName, senderPhone, recipientName, recipientPhone, packageDescription, deliveryType, notes, routeSnapshot, receiptPath ->
                                    val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                                    val clienteId = authManager.currentUser?.uid ?: "usr_cliente_actual"
                                    // C30 FIX: Las encomiendas X→Y nacen directamente en "ready"
                                    // para ingresar de inmediato al Fleet Pool del Courier.
                                    // Motivo: no hay comercio intermedio que apruebe/prepare el pedido.
                                    // El status de /orders para X_TO_Y_DELIVERY es siempre "ready" (efectivo)
                                    // o "payment_verifying" (transferencia pendiente de confirmación).
                                    // El flujo COMMERCE_DELIVERY (pending→preparing→ready) NO es afectado.
                                    val xToYInitialStatus = if (metodo == "efectivo") "ready" else "payment_verifying"

                                    val unifiedOrder = mapOf(
                                        "pedidoId" to id,
                                        "customerId" to clienteId,
                                        "businessId" to "",
                                        "status" to xToYInitialStatus,
                                        "createdAt" to com.google.firebase.Timestamp.now(),
                                        "orderType" to "delivery",
                                        "serviceType" to "X_TO_Y_DELIVERY",
                                        "customerName" to senderName,
                                        "businessName" to "Punto de Recogida X",
                                        "destinationAddress" to destino,
                                        "businessAddress" to origen,
                                        "total" to costo,
                                        "subtotal" to costo,
                                        "deliveryFee" to costo,
                                        "calculatedFee" to calculatedFee,
                                        "customerOffer" to customerOffer,
                                        "payer" to payer,
                                        "paymentMethod" to metodo,
                                        "paymentStatus" to if (metodo == "efectivo") "pending" else "PENDING_VERIFICATION",
                                        "paymentVerified" to false,
                                        "amountPaid" to amountPaid,
                                        "changeNeeded" to changeNeeded,
                                        "receiptUrl" to receiptUrl,
                                        "receiptPath" to receiptPath,
                                        "referenceNumber" to referenceNumber,
                                        "senderName" to senderName,
                                        "senderPhone" to senderPhone,
                                        "recipientName" to recipientName,
                                        "recipientPhone" to recipientPhone,
                                        "packageDescription" to packageDescription,
                                        "deliveryType" to deliveryType,
                                        "deliveryInstructions" to notes,
                                        "instructions" to notes,
                                        // Legacy objects
                                        "origen" to mapOf(
                                            "nombreComercio" to "Punto de Recogida X",
                                            "nombreCliente" to senderName,
                                            "telefono" to senderPhone,
                                            "direccion" to origen,
                                            "coordenadas" to mapOf("latitud" to origenLat, "longitud" to origenLng)
                                        ),
                                        "destino" to mapOf(
                                            "nombreComercio" to "",
                                            "nombreCliente" to recipientName,
                                            "telefono" to recipientPhone,
                                            "direccion" to destino,
                                            "coordenadas" to mapOf("latitud" to destinoLat, "longitud" to destinoLng)
                                        ),
                                        "valoresMonetarios" to mapOf(
                                            "subtotal" to costo,
                                            "costoEnvio" to costo,
                                            "total" to costo,
                                            "metodoPago" to metodo
                                        )
                                    )
                                    db.collection("orders").document(id).set(unifiedOrder)
                                        .addOnSuccessListener { android.util.Log.d("SOLICITAR_ENVIO", "orders/$id guardado exitosamente") }
                                        .addOnFailureListener { e -> android.util.Log.e("SOLICITAR_ENVIO", "Error al guardar orders/$id", e) }

                                    // Entidad canónica Dominio B: /deliveryTrips/{id} con Snapshot de Routing (Actividad #16)
                                    val routingMap = mapOf(
                                        "routeDistanceMeters" to (routeSnapshot?.routeDistanceMeters ?: (calculatedFee / 15.0 * 1000).toLong()),
                                        "routeDurationSeconds" to (routeSnapshot?.routeDurationSeconds ?: 900L),
                                        "straightLineDistanceMeters" to (routeSnapshot?.straightLineDistanceMeters ?: 0L),
                                        "routingProvider" to (routeSnapshot?.routingProvider ?: "FALLBACK_ESTIMATED"),
                                        "routingVersion" to (routeSnapshot?.routingVersion ?: "v1.0"),
                                        "transportProfile" to (routeSnapshot?.transportProfile ?: "TWO_WHEELER"),
                                        "isFallback" to (routeSnapshot?.isFallback ?: false),
                                        "polyline" to (routeSnapshot?.polyline ?: ""),
                                        "calculatedAt" to (routeSnapshot?.calculatedAt ?: com.google.firebase.Timestamp.now().toString())
                                    )

                                    val ps = routeSnapshot?.pricingSnapshot
                                        ?: throw IllegalStateException("PRICING_SNAPSHOT_REQUIRED: No se puede registrar viaje X->Y sin snapshot autoritativo de tarifas SSOT.")

                                    val pricingSnapshotMap = mapOf(
                                        "baseFee" to ps.baseFee,
                                        "perKmRate" to ps.pricePerKm,
                                        "pricePerKm" to ps.pricePerKm,
                                        "calculatedAmount" to ps.calculatedAmount,
                                        "rawCalculatedTotal" to ps.rawCalculatedTotal,
                                        "roundingAdjustment" to ps.roundingAdjustment,
                                        "courierEarnings" to ps.courierEarnings,
                                        "platformRevenue" to ps.platformRevenue,
                                        "currency" to ps.currency,
                                        "distanceKm" to ps.distanceKm,
                                        "routeDistanceMeters" to ps.distanceMeters,
                                        "routeDistanceKm" to ps.distanceKm,
                                        "calculationPolicy" to ps.pricingPolicy,
                                        "configVersion" to ps.pricingVersion,
                                        "calculatedAt" to (if (ps.calculatedAt.isNotBlank()) ps.calculatedAt else com.google.firebase.Timestamp.now().toString())
                                    )

                                    val deliveryTrip = mapOf(
                                        "tripId" to id,
                                        "id" to id,
                                        "serviceType" to "X_TO_Y_DELIVERY",
                                        "customerId" to clienteId,
                                        "status" to if (metodo == "efectivo") "PENDING" else "PAYMENT_VERIFYING",
                                        "origin" to mapOf(
                                            "address" to origen,
                                            "latitude" to origenLat,
                                            "longitude" to origenLng
                                        ),
                                        "destination" to mapOf(
                                            "address" to destino,
                                            "latitude" to destinoLat,
                                            "longitude" to destinoLng
                                        ),
                                        "routing" to routingMap,
                                        "routeDistanceMeters" to (routeSnapshot?.routeDistanceMeters ?: 0L),
                                        "routeDurationSeconds" to (routeSnapshot?.routeDurationSeconds ?: 0L),
                                        "routingProvider" to (routeSnapshot?.routingProvider ?: "FALLBACK_ESTIMATED"),
                                        "pricingSnapshot" to pricingSnapshotMap,
                                        "deliveryFee" to costo,
                                        "calculatedFee" to calculatedFee,
                                        "customerOffer" to customerOffer,
                                        "payer" to payer,
                                        "paymentMethod" to metodo,
                                        "paymentStatus" to if (metodo == "efectivo") "pending" else "PENDING_VERIFICATION",
                                        "paymentVerified" to false,
                                        "amountPaid" to amountPaid,
                                        "change" to changeNeeded,
                                        "receiptUrl" to receiptUrl,
                                        "receiptPath" to receiptPath,
                                        "referenceNumber" to referenceNumber,
                                        "senderName" to senderName,
                                        "senderPhone" to senderPhone,
                                        "recipientName" to recipientName,
                                        "recipientPhone" to recipientPhone,
                                        "packageDescription" to packageDescription,
                                        "deliveryType" to deliveryType,
                                        "notes" to notes,
                                        "dispatchStage" to "SEARCHING_5KM",
                                        "dispatchRadiusKm" to 5.0,
                                        "eligibleCouriers" to emptyList<String>(),
                                        "candidateCouriersCount" to 0,
                                        "createdAt" to com.google.firebase.Timestamp.now()
                                    )
                                    db.collection("deliveryTrips").document(id).set(deliveryTrip)
                                        .addOnSuccessListener { android.util.Log.d("SOLICITAR_ENVIO", "deliveryTrips/$id guardado exitosamente") }
                                        .addOnFailureListener { e -> android.util.Log.e("SOLICITAR_ENVIO", "Error al guardar deliveryTrips/$id", e) }
                                },
                                onLogout = {
                                    performLogoutCleanup(realtimeOrchestrator, authManager, navController)
                                },
                                onBack = {
                                    navController.popBackStack()
                                },
                                onComercioClick = { comercioId ->
                                    navController.navigate("comercio_detalle_screen/$comercioId")
                                }
                            )
                        }
                    }
                    composable("customer_help") {
                        CustomerSurfaceGuard(navController, authManager, allowGuest = true) {
                            com.example.presentation.customer.profile.CustomerHelpScreen(
                                onBack = { navController.popBackStack() }
                            )
                        }
                    }
                    composable(Screen.LoyaltyPoints.route) {
                        CustomerSurfaceGuard(navController, authManager, allowGuest = false) {
                            com.example.presentation.customer.loyalty.CustomerLoyaltyPointsScreen(
                                onBack = { navController.popBackStack() },
                                onNavigateToCoupons = { navController.navigate(Screen.CustomerCoupons.route) },
                                onNavigateToLevel = { navController.navigate(Screen.LoyaltyLevel.route) }
                            )
                        }
                    }
                    composable(Screen.LoyaltyLevel.route) {
                        CustomerSurfaceGuard(navController, authManager, allowGuest = false) {
                            com.example.presentation.customer.loyalty.CustomerLoyaltyLevelScreen(
                                onBack = { navController.popBackStack() }
                            )
                        }
                    }
                    composable(
                        route = "customer_coupons?couponId={couponId}",
                        arguments = listOf(
                            navArgument("couponId") {
                                type = NavType.StringType
                                nullable = true
                                defaultValue = null
                            }
                        )
                    ) { backStackEntry ->
                        CustomerSurfaceGuard(navController, authManager, allowGuest = true) {
                            val couponId = backStackEntry.arguments?.getString("couponId")
                            com.example.presentation.customer.coupons.CouponsScreen(
                                onBack = { navController.popBackStack() },
                                onNavigateToCommerce = { businessId ->
                                    if (businessId.isNotBlank()) {
                                        navController.navigate("comercio_detalle_screen/$businessId")
                                    } else {
                                        navController.navigate("customer_dashboard")
                                    }
                                },
                                onApplyToCheckout = {
                                    navController.popBackStack()
                                },
                                initialCouponId = couponId
                            )
                        }
                    }
                    composable("business_dashboard") {
                        MerchantSurfaceGuard(navController, authManager) {
                            BusinessDashboardScreen(
                                firebaseManager = firebaseManager,
                                onLogout = {
                                    performLogoutCleanup(realtimeOrchestrator, authManager, navController)
                                }
                            )
                        }
                    }

                    composable(
                        route = "comercio_detalle_screen/{comercioId}?productId={productId}",
                        arguments = listOf(
                            navArgument("comercioId") { type = NavType.StringType },
                            navArgument("productId") {
                                type = NavType.StringType
                                nullable = true
                                defaultValue = null
                            }
                        )
                    ) { backStackEntry ->
                        val comercioId = backStackEntry.arguments?.getString("comercioId") ?: ""
                        val productId = backStackEntry.arguments?.getString("productId")
                        ComercioDetalleScreen(
                            comercioId = comercioId,
                            initialProductId = productId,
                            navController = navController,
                            firebaseManager = firebaseManager
                        )
                    }
                    composable(
                        route = Screen.EsperandoRepartidor.route,
                        arguments = listOf(navArgument("pedidoId") { type = NavType.StringType })
                    ) { backStackEntry ->
                        val pedidoId = backStackEntry.arguments?.getString("pedidoId") ?: ""
                        val flujoEstadoPedido = remember(pedidoId) {
                            firebaseManager.obtenerFlujoMotorizadoAsignado(pedidoId) 
                        }

                        EsperandoRepartidorScreen(
                            pedidoId = pedidoId,
                            flujoEstadoPedido = flujoEstadoPedido,
                            onRepartidorAsignado = { motorizadoId ->
                                navController.navigate(Screen.TrackingPedido.createRoute(pedidoId, motorizadoId)) {
                                    popUpTo(Screen.EsperandoRepartidor.route) { inclusive = true }
                                }
                            },
                            onCancelarPedido = {
                                navController.popBackStack()
                            }
                        )
                    }
                    composable(
                        route = Screen.TrackingPedido.route,
                        arguments = listOf(
                            navArgument("pedidoId") { type = NavType.StringType },
                            navArgument("motorizadoId") { type = NavType.StringType }
                        )
                    ) { backStackEntry ->
                        val pedidoId = backStackEntry.arguments?.getString("pedidoId") ?: ""
                        val motorizadoId = backStackEntry.arguments?.getString("motorizadoId") ?: ""
                        
                        Scaffold(
                            modifier = Modifier.fillMaxSize(),
                            bottomBar = { BottomNavigationBar() }
                        ) { innerPadding ->
                            TrackingScreen(
                                modifier = Modifier.padding(innerPadding),
                                onBack = { navController.popBackStack() },
                                onNavigateToChat = { targetOrderId ->
                                    navController.navigate(Screen.OrderChat.createRoute(targetOrderId))
                                },
                                pedidoId = pedidoId,
                                motorizadoId = motorizadoId,
                                firebaseManager = firebaseManager
                            )
                        }
                    }
                    composable(
                        route = Screen.RutaActiva.route,
                        arguments = listOf(
                            navArgument("pedidoId") { type = NavType.StringType },
                            navArgument("comercioNombre") { type = NavType.StringType },
                            navArgument("comercioDireccion") { type = NavType.StringType },
                            navArgument("clienteDireccion") { type = NavType.StringType }
                        )
                    ) { backStackEntry ->
                        val pedidoId = backStackEntry.arguments?.getString("pedidoId") ?: ""
                        val comercioNombre = backStackEntry.arguments?.getString("comercioNombre") ?: ""
                        val comercioDireccion = backStackEntry.arguments?.getString("comercioDireccion") ?: ""
                        val clienteDireccion = backStackEntry.arguments?.getString("clienteDireccion") ?: ""

                        RutaActivaScreen(
                            pedidoId = pedidoId,
                            comercioNombre = android.net.Uri.decode(comercioNombre),
                            comercioDireccion = android.net.Uri.decode(comercioDireccion),
                            clienteDireccion = android.net.Uri.decode(clienteDireccion),
                            onActualizarEstadoFirestore = { pId, nuevoEstado ->
                                firebaseManager.actualizarEstadoPedido(pId, nuevoEstado)
                            },
                            onFinalizarEntrega = {
                                navController.navigate(Screen.Courier.route) {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        )
                    }
                    }

                    if (nonForcedUpdate != null && !isDismissedInSession && frequencyManager.shouldShowModal(nonForcedUpdate.config, isForced = false, context = context)) {
                        AppUpdateModal(
                            config = nonForcedUpdate.config,
                            isForced = false,
                            canDismiss = nonForcedUpdate.canDismiss,
                            storeUrl = nonForcedUpdate.storeUrl,
                            onDismiss = {
                                isDismissedInSession = true
                                frequencyManager.recordDismissed(nonForcedUpdate.config, context)
                            }
                        )
                    }
                }
                }
            }
            }
        }
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleNotificationIntent(intent)
    }

    private fun handleNotificationIntent(intent: android.content.Intent?) {
        if (intent == null) return
        val orderId = intent.getStringExtra("orderId") ?: ""
        val tripId = intent.getStringExtra("tripId") ?: ""
        val domainStr = intent.getStringExtra("domain") ?: ""
        val campaignId = intent.getStringExtra("campaignId") ?: ""
        val notificationId = intent.getStringExtra("notificationId") ?: if (campaignId.isNotBlank()) campaignId else if (tripId.isNotBlank()) tripId else orderId
        val readSource = intent.getStringExtra("readSource") ?: "system_tray"
        val action = intent.getStringExtra("action") ?: ""
        val screen = intent.getStringExtra("screen") ?: ""
        val deepLink = intent.getStringExtra("deepLink") ?: intent.getStringExtra("navigationRoute") ?: ""

        if (notificationId.isNotBlank() || campaignId.isNotBlank() || orderId.isNotBlank() || tripId.isNotBlank()) {
            Log.d("NOTIFICATION_CLICK", "Notificación abierta desde System Tray. Action: $action, ID: $notificationId, OrderId: $orderId, TripId: $tripId, Domain: $domainStr, Campaign: $campaignId, Source: $readSource")
            val notifRepo = com.example.data.repository.NotificationRepository()
            lifecycleScope.launch {
                notifRepo.trackNotificationOpened(
                    notificationId = if (notificationId.isNotBlank()) notificationId else if (campaignId.isNotBlank()) campaignId else if (tripId.isNotBlank()) tripId else orderId,
                    campaignId = campaignId.ifBlank { null },
                    readSource = readSource
                )
            }
        }

        // 1. Resolución síncrona inmediata para Cold Start (garantiza que Splash encuentre la ruta sin esperar red)
        val immediateRoute = com.example.navigation.NotificationRouter.resolve(intent, "")
        if (!immediateRoute.isNullOrBlank()) {
            pendingTargetRoute = immediateRoute
            Log.d("NOTIFICATION_CLICK", "Ruta inmediata resuelta de forma síncrona para Cold Start: $immediateRoute")
        }

        val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        lifecycleScope.launch {
            val appRole = if (currentUser != null) {
                com.example.domain.engine.auth.AppRoleResolver.resolveRole(applicationContext, currentUser).role
            } else {
                com.example.domain.model.AppRole.UNKNOWN
            }

            // 2. Determinar ruta autoritativa mediante NotificationRouter central con Role Guard
            val targetRoute = com.example.navigation.NotificationRouter.resolve(intent, appRole.name)

            if (!targetRoute.isNullOrBlank()) {
                val nav = _navControllerRef
                if (nav != null) {
                    try {
                        val currentRoute = nav.currentDestination?.route ?: ""
                        if (currentRoute != targetRoute && currentRoute != Screen.Splash.route) {
                            Log.d("NOTIFICATION_CLICK", "Navegando directamente con ruta autoritativa a: $targetRoute")
                            com.example.navigation.NotificationRouter.navigateSafely(nav, targetRoute)
                        } else if (currentRoute == Screen.Splash.route) {
                            pendingTargetRoute = targetRoute
                            Log.d("NOTIFICATION_CLICK", "En Splash. Ruta autoritativa guardada para terminar carga: $targetRoute")
                        }
                    } catch (e: Exception) {
                        Log.e("NOTIFICATION_CLICK", "Error navegando a ruta desde notificación: $targetRoute", e)
                    }
                } else {
                    pendingTargetRoute = targetRoute
                    Log.d("NOTIFICATION_CLICK", "NavController aún no inicializado. Ruta guardada como pendiente: $targetRoute")
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        realtimeOrchestrator.stopAll()
    }
}

// Colors from Design
val BgColor = Color(0xFFFEF7FF)
val TextPrimary = Color(0xFF1D1B20)
val TextSecondary = Color(0xFF49454F)
val PrimaryPurple = Color(0xFF6750A4)
val SecondaryContainer = Color(0xFFE8DEF8)
val OnSecondaryContainer = Color(0xFF21005D)
val ErrorColor = Color(0xFFB3261E)
val MapBgColor = Color(0xFFE1E2E9)
val BorderColor = Color(0xFFCAC4D0)
val CourierDetailBg = Color(0xFFF7F2FA)
val CourierDetailBorder = Color(0xFFEADDFF)

@Composable
fun RoleSelectorScreen(onRoleSelected: (String) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgColor)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.LocalShipping,
            contentDescription = "Delivery Logo",
            tint = PrimaryPurple,
            modifier = Modifier.size(80.dp)
        )
        Spacer(modifier = Modifier.height(32.dp))
        Text(
            "Selecciona tu Rol",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )
        Spacer(modifier = Modifier.height(48.dp))

        RoleButton(
            title = "Administrador",
            description = "Panel de control, mapa global y asignaciones",
            icon = Icons.Default.AdminPanelSettings,
            onClick = { onRoleSelected("admin") }
        )
        Spacer(modifier = Modifier.height(16.dp))
        RoleButton(
            title = "Comercio / Restaurante",
            description = "Gestión de menú, cocina digital y analíticas",
            icon = Icons.Default.Storefront,
            onClick = { onRoleSelected("business") }
        )
        Spacer(modifier = Modifier.height(16.dp))
        RoleButton(
            title = "Motorizado",
            description = "Perfil, mapa de ruta, alertas de pedidos",
            icon = Icons.Default.DirectionsBike,
            onClick = { onRoleSelected("courier") }
        )
        Spacer(modifier = Modifier.height(16.dp))
        RoleButton(
            title = "Cliente Final",
            description = "Seguimiento en tiempo real de tu pedido",
            icon = Icons.Default.Person,
            onClick = { onRoleSelected("customer") }
        )
    }
}

@Composable
fun RoleButton(title: String, description: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 4.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(SecondaryContainer, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = OnSecondaryContainer)
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Text(description, fontSize = 12.sp, color = TextSecondary)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextSecondary)
        }
    }
}


@Composable
fun CourierScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .background(PrimaryPurple)
                    .padding(horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
                Text("App Motorizado", fontSize = 20.sp, color = Color.White, fontWeight = FontWeight.Medium)
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(BgColor)
        ) {
            // Profile & Wallet
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier.size(60.dp).background(SecondaryContainer, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(32.dp), tint = OnSecondaryContainer)
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Repartidor Oficial", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text("Disponible • GPS Activo", color = Color(0xFF4CAF50), fontSize = 12.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Billetera", fontSize = 12.sp, color = TextSecondary)
                    Text("C$ 450.50", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = PrimaryPurple)
                }
            }

            // Map
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(MapBgColor)
            ) {
                Text("Mapa de Ruta (Enviando lat: 12.1364, lng: -86.2514)", modifier = Modifier.align(Alignment.Center), color = TextSecondary)
            }

            // Current Order Actions
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                color = Color.White,
                shadowElevation = 16.dp
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text("Pedido Asignado: ped_54321_orden", fontWeight = FontWeight.Bold)
                    Text("Recoger en: Pizzería La Famosa", fontSize = 14.sp, color = TextSecondary)
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Button(
                            onClick = {},
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryPurple)
                        ) {
                            Text("En ruta a recoger")
                        }
                        Button(
                            onClick = {},
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Entregar")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TrackingScreen(
    modifier: Modifier = Modifier,
    onBack: () -> Unit = {},
    onNavigateToChat: (String) -> Unit = {},
    pedidoId: String = "",
    motorizadoId: String = "",
    firebaseManager: FirebaseManager
) {
    val context = LocalContext.current
    val tripDoc by firebaseManager.listenToDeliveryTrip(pedidoId).collectAsState(initial = null)
    val legacyOrder by firebaseManager.listenToOrder(pedidoId).collectAsState(initial = null)

    // Resuelve el motorizadoId de forma canónica desde /deliveryTrips (SSOT)
    val resolvedCourierId = tripDoc?.getString("assignedCourierId")
        ?: tripDoc?.getString("courierId")
        ?: tripDoc?.getString("motorizadoId")
        ?: legacyOrder?.motorizadoId
        ?: motorizadoId.takeIf { it.isNotBlank() && it != "assigned" && it != "sin_asignar" }
        ?: ""

    val tripStatus = tripDoc?.getString("status") ?: legacyOrder?.estado ?: "ASSIGNED"
    val isFinished = tripStatus in listOf("DELIVERED", "CANCELLED", "COMPLETED")

    // Solo escuchar telemetría GPS si el pedido está activo y hay motorizado asignado
    val ubicacionMotorizado by firebaseManager.listenToCourierLocation(
        if (isFinished || resolvedCourierId.isBlank()) "" else resolvedCourierId
    ).collectAsState(initial = null)

    val originMap = tripDoc?.get("origin") as? Map<*, *>
    val destMap = tripDoc?.get("destination") as? Map<*, *>
    val routingMap = tripDoc?.get("routing") as? Map<*, *>

    val originLat = (originMap?.get("latitude") as? Number)?.toDouble()
    val originLng = (originMap?.get("longitude") as? Number)?.toDouble()
    val originAddress = originMap?.get("address") as? String ?: ""

    val destLat = (destMap?.get("latitude") as? Number)?.toDouble()
    val destLng = (destMap?.get("longitude") as? Number)?.toDouble()
    val destAddress = destMap?.get("address") as? String ?: ""

    val polylineStr = (routingMap?.get("polyline") as? String)
        ?: (tripDoc?.getString("polyline"))
        ?: ""

    val routePoints = remember(polylineStr) {
        if (polylineStr.isNotBlank()) {
            com.example.data.repository.courier.CourierRoutingRepository.decodePolyline(polylineStr)
        } else {
            emptyList()
        }
    }

    val originLatLng = if (originLat != null && originLng != null) com.google.android.gms.maps.model.LatLng(originLat, originLng) else null
    val destLatLng = if (destLat != null && destLng != null) com.google.android.gms.maps.model.LatLng(destLat, destLng) else null

    var showDriverModal by remember { mutableStateOf(false) }

    var driverName by remember { mutableStateOf("Repartidor Asignado") }
    var driverPhone by remember { mutableStateOf("") }
    var driverPlate by remember { mutableStateOf("") }
    var driverOpId by remember(resolvedCourierId) {
        mutableStateOf("DRV-" + (resolvedCourierId.takeLast(4).ifEmpty { "OFICIAL" }).uppercase())
    }

    LaunchedEffect(resolvedCourierId) {
        if (resolvedCourierId.isNotBlank()) {
            try {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                val doc = db.collection("users").document(resolvedCourierId).get().await()
                if (doc.exists()) {
                    val name = doc.getString("nombre") ?: doc.getString("name") ?: ""
                    val phone = doc.getString("telefono") ?: doc.getString("phone") ?: ""
                    val vehiculoMap = doc.get("detallesVehiculo") as? Map<*, *>
                    val plate = vehiculoMap?.get("placa") as? String ?: "M 123456"
                    if (name.isNotBlank()) driverName = name
                    if (phone.isNotBlank()) driverPhone = phone
                    if (plate.isNotBlank()) driverPlate = plate
                }
            } catch (e: Exception) {
                Log.e("TrackingScreen", "Error fetching driver details", e)
            }
        }
    }

    val coroutineScope = rememberCoroutineScope()

    // Control de cancelación con punto de corte de custodia física
    val canCancelTrip = tripStatus.uppercase() in listOf("PENDING", "ASSIGNED", "EN_ROUTE_PICKUP") &&
            tripDoc?.get("pickedUpAt") == null && tripDoc?.get("pickupArrivedAt") == null

    var showCancelTripModal by remember { mutableStateOf(false) }
    var isCancellingTrip by remember { mutableStateOf(false) }

    // Control de valoración de la encomienda (Feature B)
    var showRatingModal by remember { mutableStateOf(false) }
    var ratingSubmitted by remember { mutableStateOf(false) }
    var ratingStars by remember { mutableStateOf(5) }
    var ratingComment by remember { mutableStateOf("") }
    var isSubmittingRating by remember { mutableStateOf(false) }

    LaunchedEffect(tripStatus) {
        if (tripStatus.uppercase() in listOf("DELIVERED", "COMPLETED") && !ratingSubmitted) {
            try {
                val db = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                val reviewDoc = db.collection("reviews").document(pedidoId).get().await()
                if (!reviewDoc.exists()) {
                    showRatingModal = true
                } else {
                    ratingSubmitted = true
                }
            } catch (e: Exception) {
                showRatingModal = true
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BgColor)
    ) {
        TopBar(onBack = onBack, pedidoId = pedidoId)
        Box(modifier = Modifier.weight(1f)) {
            ClienteTrackingMap(
                ubicacionMotorizado = ubicacionMotorizado,
                originLatLng = originLatLng,
                destinationLatLng = destLatLng,
                routePoints = routePoints,
                originAddress = originAddress,
                destinationAddress = destAddress,
                onMarkerClick = { showDriverModal = true }
            )
            BottomSheetUI(
                modifier = Modifier.align(Alignment.BottomCenter),
                driverName = driverName,
                driverPlate = driverPlate,
                driverOpId = driverOpId,
                driverPhone = driverPhone,
                status = tripStatus,
                onCardClick = { showDriverModal = true },
                onNavigateToChat = { onNavigateToChat(pedidoId) },
                canCancel = canCancelTrip,
                onCancelClick = { showCancelTripModal = true }
            )
        }
    }

    // Modal de Confirmación de Cancelación de Encomienda
    if (showCancelTripModal) {
        AlertDialog(
            onDismissRequest = { if (!isCancellingTrip) showCancelTripModal = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(20.dp),
            title = {
                Text(
                    text = "❌ Cancelar Encomienda",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF991B1B)
                )
            },
            text = {
                Text(
                    text = "¿Confirmas que deseas cancelar esta solicitud de encomienda express? Se notificará al repartidor y el viaje quedará cancelado en el sistema.",
                    fontSize = 13.sp,
                    color = Color(0xFF475569)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            isCancellingTrip = true
                            try {
                                val functions = com.google.firebase.functions.FirebaseFunctions.getInstance()
                                val payload = hashMapOf(
                                    "tripId" to pedidoId,
                                    "reason" to "CANCELLED_BY_CUSTOMER",
                                    "actorRole" to "CUSTOMER"
                                )
                                functions.getHttpsCallable("cancelDeliveryTrip").call(payload).await()
                                android.widget.Toast.makeText(context, "Encomienda cancelada exitosamente", android.widget.Toast.LENGTH_SHORT).show()
                                showCancelTripModal = false
                                onBack()
                            } catch (e: Exception) {
                                val msg = e.message ?: ""
                                val userMsg = when {
                                    msg.contains("PAQUETE_YA_RECOGIDO") -> "El motorizado ya tiene en mano tu encomienda. Por seguridad no puede cancelarse."
                                    msg.contains("ENCOMIENDA_NO_CANCELABLE") -> "El motorizado ya llegó al punto de recogida. No es posible cancelar en este momento."
                                    msg.contains("ESTADO_NO_CANCELABLE") -> "La encomienda ya se encuentra en un estado que no permite cancelación."
                                    else -> "No fue posible cancelar el viaje: ${e.localizedMessage ?: msg}"
                                }
                                android.widget.Toast.makeText(context, userMsg, android.widget.Toast.LENGTH_LONG).show()
                            } finally {
                                isCancellingTrip = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                    shape = RoundedCornerShape(10.dp),
                    enabled = !isCancellingTrip
                ) {
                    Text(if (isCancellingTrip) "Cancelando..." else "Sí, Cancelar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelTripModal = false }, enabled = !isCancellingTrip) {
                    Text("No cancelar", color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
                }
            }
        )
    }

    // Modal de Calificación y Reseña de Encomienda (Feature B)
    if (showRatingModal) {
        AlertDialog(
            onDismissRequest = { if (!isSubmittingRating) showRatingModal = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(20.dp),
            title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text("⭐ Califica tu Encomienda", fontSize = 16.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E293B))
                    Spacer(modifier = Modifier.height(2.dp))
                    Text("Tu opinión nos ayuda a mantener la mejor flota", fontSize = 11.sp, color = Color(0xFF64748B))
                }
            },
            text = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(text = driverName, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                    // Estrellas 1 a 5
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        for (i in 1..5) {
                            IconButton(onClick = { ratingStars = i }, modifier = Modifier.size(36.dp)) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = "$i estrellas",
                                    tint = if (i <= ratingStars) Color(0xFFFBBF24) else Color(0xFFCBD5E1),
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }
                    }
                    OutlinedTextField(
                        value = ratingComment,
                        onValueChange = { ratingComment = it },
                        label = { Text("Comentario para el repartidor (opcional)", fontSize = 11.sp) },
                        maxLines = 3,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            isSubmittingRating = true
                            try {
                                val functions = com.google.firebase.functions.FirebaseFunctions.getInstance()
                                val payload = hashMapOf<String, Any>(
                                    "tripId" to pedidoId,
                                    "reviewType" to "X_TO_Y",
                                    "courierId" to resolvedCourierId,
                                    "courierRating" to ratingStars,
                                    "courierComments" to ratingComment
                                )
                                functions.getHttpsCallable("submitOrderReview").call(payload).await()
                                android.widget.Toast.makeText(context, "¡Gracias por calificar al repartidor!", android.widget.Toast.LENGTH_SHORT).show()
                                ratingSubmitted = true
                                showRatingModal = false
                            } catch (e: Exception) {
                                android.widget.Toast.makeText(context, "Error al enviar reseña: ${e.localizedMessage ?: e.message}", android.widget.Toast.LENGTH_LONG).show()
                            } finally {
                                isSubmittingRating = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4F46E5)),
                    shape = RoundedCornerShape(10.dp),
                    enabled = !isSubmittingRating
                ) {
                    Text(if (isSubmittingRating) "Enviando..." else "Enviar Calificación", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRatingModal = false }, enabled = !isSubmittingRating) {
                    Text("Ahora no", color = Color(0xFF64748B))
                }
            }
        )
    }

    if (showDriverModal) {
        AlertDialog(
            onDismissRequest = { showDriverModal = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(20.dp),
            title = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "🛵 MOTORIZADO EN RUTA",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF1E3A8A)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    HorizontalDivider(color = Color(0xFFE2E8F0))
                }
            },
            text = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .background(SecondaryContainer, CircleShape)
                            .border(2.dp, PrimaryPurple, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = "Foto Motorizado",
                            tint = OnSecondaryContainer,
                            modifier = Modifier.size(44.dp)
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = driverName,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                color = SecondaryContainer,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "ID: $driverOpId",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnSecondaryContainer,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                            Surface(
                                color = Color(0xFFEFF6FF),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "Placa: $driverPlate",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1E40AF),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                )
                            }
                        }
                    }

                    Surface(
                        color = Color(0xFFECFDF5),
                        shape = RoundedCornerShape(20.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFA7F3D0))
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(Color(0xFF10B981), CircleShape)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "🟢 En camino al destino",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF065F46)
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                try {
                                    val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$driverPhone"))
                                    context.startActivity(dialIntent)
                                } catch (e: Exception) {
                                    Log.e("TrackingScreen", "Error launching dialer", e)
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryPurple),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f).height(44.dp)
                        ) {
                            Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Llamar", fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                showDriverModal = false
                                onNavigateToChat(pedidoId)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f).height(44.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Chat", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showDriverModal = false }) {
                    Text("Cerrar", fontWeight = FontWeight.Bold, color = PrimaryPurple)
                }
            }
        )
    }
}

@Composable
fun TopBar(onBack: () -> Unit = {}, pedidoId: String = "") {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(64.dp)
            .background(BgColor)
            .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 4.dp)
        ) {
            Text(
                "Rastreo de Pedido",
                fontSize = 20.sp,
                fontWeight = FontWeight.Medium,
                color = TextPrimary
            )
            Text(
                if (pedidoId.isNotBlank()) "Orden #${pedidoId.takeLast(5).uppercase()}" else "Orden #ped_54321",
                fontSize = 12.sp,
                color = TextSecondary
            )
        }
        IconButton(onClick = { }) {
            Icon(Icons.Default.MoreVert, contentDescription = "Options")
        }
    }
}

@Composable
fun MapArea() {
    // Coordenadas simuladas para la ruta del motorizado (Polilínea)
    val routeWaypoints = remember {
        listOf(
            Offset(60f, 100f),   // Restaurante
            Offset(100f, 100f),
            Offset(130f, 140f),
            Offset(200f, 130f),
            Offset(180f, 220f),
            Offset(260f, 280f),
            Offset(300f, 320f)   // Cliente
        )
    }

    var currentIndex by remember { mutableIntStateOf(0) }

    // Simular el movimiento del motorizado
    LaunchedEffect(Unit) {
        while (currentIndex < routeWaypoints.size - 1) {
            delay(2500)
            currentIndex++
        }
    }

    val currentTarget = routeWaypoints[currentIndex]

    // 1. Animación suave de posición (Interpolación)
    val animatedX by animateFloatAsState(
        targetValue = currentTarget.x,
        animationSpec = tween(durationMillis = 2500, easing = LinearEasing),
        label = "x_anim"
    )
    val animatedY by animateFloatAsState(
        targetValue = currentTarget.y,
        animationSpec = tween(durationMillis = 2500, easing = LinearEasing),
        label = "y_anim"
    )

    // 1. Animación suave de rotación (Bearing)
    var targetBearing by remember { mutableFloatStateOf(90f) }
    LaunchedEffect(currentTarget) {
        if (currentIndex > 0) {
            val prev = routeWaypoints[currentIndex - 1]
            val dy = currentTarget.y - prev.y
            val dx = currentTarget.x - prev.x
            // Bearing en la pantalla (X a la derecha, Y hacia abajo)
            var angle = Math.toDegrees(kotlin.math.atan2(dy.toDouble(), dx.toDouble())).toFloat()
            targetBearing = angle + 90f // Ajustar porque el icono Navigation apunta hacia arriba
        }
    }

    val animatedBearing by animateFloatAsState(
        targetValue = targetBearing,
        animationSpec = tween(1000, easing = FastOutSlowInEasing),
        label = "bearing_anim"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MapBgColor)
            .drawBehind {
                // Simulated map grid
                val dotRadius = 1.dp.toPx()
                val spacing = 20.dp.toPx()
                for (x in 0 until size.width.toInt() step spacing.toInt()) {
                    for (y in 0 until size.height.toInt() step spacing.toInt()) {
                        drawCircle(
                            color = TextPrimary.copy(alpha = 0.2f),
                            radius = dotRadius,
                            center = Offset(x.toFloat(), y.toFloat())
                        )
                    }
                }
            }
    ) {
        // 2. Trazado de Ruta Real (Polilínea simulada)
        Canvas(modifier = Modifier.fillMaxSize()) {
            val path = Path().apply {
                moveTo(routeWaypoints.first().x.dp.toPx(), routeWaypoints.first().y.dp.toPx())
                for (i in 1 until routeWaypoints.size) {
                    lineTo(routeWaypoints[i].x.dp.toPx(), routeWaypoints[i].y.dp.toPx())
                }
            }
            drawPath(
                path = path,
                color = PrimaryPurple.copy(alpha = 0.6f),
                style = Stroke(
                    width = 4.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 10f), 0f),
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round
                )
            )
        }

        // Restaurant Marker
        Box(
            modifier = Modifier
                .offset(x = 60.dp, y = 100.dp)
                .offset(x = (-16).dp, y = (-16).dp) // Center offset
                .background(Color.White, CircleShape)
                .border(2.dp, PrimaryPurple, CircleShape)
                .padding(4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .background(SecondaryContainer, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Storefront, contentDescription = null, modifier = Modifier.size(16.dp), tint = OnSecondaryContainer)
            }
        }

        // Destination Marker
        Box(
            modifier = Modifier
                .offset(x = 300.dp, y = 320.dp)
                .offset(x = (-16).dp, y = (-16).dp) // Center offset
                .background(Color.White, CircleShape)
                .border(2.dp, ErrorColor, CircleShape)
                .padding(4.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .background(Color.White, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = "Destination",
                    tint = ErrorColor,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        // Courier Live Position (Animated with Bearing)
        Column(
            modifier = Modifier
                .offset(x = animatedX.dp, y = animatedY.dp)
                .offset(x = (-16).dp, y = (-16).dp), // Adjust center
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .rotate(animatedBearing) // Aplica la rotación calculada
                    .background(PrimaryPurple, CircleShape)
                    .border(3.dp, Color.White, CircleShape)
                    .padding(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Navigation, // Icono direccional
                    contentDescription = "Courier",
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(4.dp),
                shadowElevation = 2.dp,
                modifier = Modifier.padding(top = 4.dp).offset(y = 12.dp)
            ) {
                Text(
                    if (currentIndex == routeWaypoints.size - 1) "En sitio" else "En movimiento",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }
        }
    }
}

@Composable
fun BottomSheetUI(
    modifier: Modifier = Modifier,
    driverName: String = "Repartidor Asignado",
    driverPlate: String = "Placa Asignada",
    driverOpId: String = "DRV-OFICIAL",
    driverPhone: String = "",
    status: String = "ASSIGNED",
    onCardClick: () -> Unit = {},
    onNavigateToChat: () -> Unit = {},
    canCancel: Boolean = false,
    onCancelClick: () -> Unit = {}
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        color = Color.White,
        shadowElevation = 16.dp
    ) {
        Column(
            modifier = Modifier.padding(start = 24.dp, end = 24.dp, top = 24.dp, bottom = 32.dp)
        ) {
            // Drag Handle
            Box(
                modifier = Modifier
                    .width(32.dp)
                    .height(4.dp)
                    .background(BorderColor, RoundedCornerShape(50))
                    .align(Alignment.CenterHorizontally)
            )
            Spacer(modifier = Modifier.height(24.dp))

            // Progress Indicator
            ProgressIndicator(status = status)

            Spacer(modifier = Modifier.height(32.dp))

            // Courier Details
            CourierDetails(
                driverName = driverName,
                driverPlate = driverPlate,
                driverOpId = driverOpId,
                driverPhone = driverPhone,
                onCardClick = onCardClick,
                onNavigateToChat = onNavigateToChat
            )

            // Botón de Cancelación (Pre-Custodia Física)
            if (canCancel) {
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedButton(
                    onClick = onCancelClick,
                    modifier = Modifier.fillMaxWidth().height(42.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFCA5A5))
                ) {
                    Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Cancelar Solicitud de Encomienda", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun ProgressIndicator(status: String = "ASSIGNED") {
    val upperStatus = status.uppercase()
    val isAssignedDone = upperStatus in listOf("ASSIGNED", "EN_ROUTE_PICKUP", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "COMPLETED")
    val isPickupDone = upperStatus in listOf("PICKED_UP", "IN_TRANSIT", "DELIVERED", "COMPLETED")
    val isTransitDone = upperStatus in listOf("DELIVERED", "COMPLETED")
    val isDeliveredDone = upperStatus in listOf("DELIVERED", "COMPLETED")

    val progressFraction = when (upperStatus) {
        "PENDING" -> 0.08f
        "ASSIGNED" -> 0.15f
        "EN_ROUTE_PICKUP" -> 0.40f
        "PICKED_UP", "IN_TRANSIT" -> 0.70f
        "DELIVERED", "COMPLETED" -> 1.0f
        else -> 0.5f
    }

    Box(modifier = Modifier.fillMaxWidth()) {
        // Background line
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(2.dp)
                .padding(horizontal = 16.dp)
                .background(Color(0xFFE6E1E5))
                .align(Alignment.TopCenter)
                .offset(y = 11.dp)
        )
        // Active line
        Box(
            modifier = Modifier
                .fillMaxWidth(progressFraction)
                .height(2.dp)
                .padding(start = 16.dp)
                .background(PrimaryPurple)
                .align(Alignment.TopStart)
                .offset(y = 11.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            ProgressStep(
                title = "Asignado",
                active = isAssignedDone,
                completed = isAssignedDone && upperStatus != "ASSIGNED" && upperStatus != "PENDING",
                isCurrent = upperStatus == "ASSIGNED" || upperStatus == "PENDING"
            )
            ProgressStep(
                title = "En Origen",
                active = isAssignedDone,
                completed = isPickupDone,
                isCurrent = upperStatus == "EN_ROUTE_PICKUP"
            )
            ProgressStep(
                title = "En Camino",
                active = isPickupDone,
                completed = isTransitDone,
                isCurrent = upperStatus == "PICKED_UP" || upperStatus == "IN_TRANSIT"
            )
            ProgressStep(
                title = "Entregado",
                active = isDeliveredDone,
                completed = isDeliveredDone,
                isCurrent = upperStatus == "DELIVERED" || upperStatus == "COMPLETED"
            )
        }
    }
}

@Composable
fun ProgressStep(title: String, active: Boolean, completed: Boolean, isCurrent: Boolean = false) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .background(
                    color = if (completed) PrimaryPurple else if (isCurrent) Color.White else Color(0xFFE6E1E5),
                    shape = CircleShape
                )
                .then(
                    if (isCurrent) Modifier.border(2.dp, PrimaryPurple, CircleShape) else Modifier
                ),
            contentAlignment = Alignment.Center
        ) {
            if (completed) {
                Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
            } else if (isCurrent) {
                Box(modifier = Modifier.size(8.dp).background(PrimaryPurple, CircleShape))
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = title,
            fontSize = 10.sp,
            fontWeight = if (isCurrent) FontWeight.Medium else FontWeight.Normal,
            color = if (active) (if (isCurrent) TextPrimary else PrimaryPurple) else TextSecondary
        )
    }
}

@Composable
fun CourierDetails(
    driverName: String = "Repartidor Asignado",
    driverPlate: String = "Placa Asignada",
    driverOpId: String = "DRV-OFICIAL",
    driverPhone: String = "",
    onCardClick: () -> Unit = {},
    onNavigateToChat: () -> Unit = {}
) {
    val context = LocalContext.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(CourierDetailBg, RoundedCornerShape(16.dp))
            .border(1.dp, CourierDetailBorder, RoundedCornerShape(16.dp))
            .clickable { onCardClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .background(Color(0xFFDEE1E6), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Person, contentDescription = "Courier Profile", tint = TextSecondary, modifier = Modifier.size(32.dp))
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(driverName, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                Box(
                    modifier = Modifier
                        .background(SecondaryContainer, RoundedCornerShape(4.dp))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(driverPlate, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = OnSecondaryContainer)
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text("ID: $driverOpId", fontSize = 11.sp, color = TextSecondary)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            IconButton(
                onClick = onNavigateToChat,
                modifier = Modifier
                    .size(44.dp)
                    .background(Color(0xFFEFF6FF), CircleShape)
                    .border(1.dp, Color(0xFFBFDBFE), CircleShape)
            ) {
                Icon(Icons.AutoMirrored.Filled.Chat, contentDescription = "Chat", tint = Color(0xFF3B82F6), modifier = Modifier.size(20.dp))
            }
            IconButton(
                onClick = {
                    try {
                        val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${driverPhone.ifEmpty { "+505 8888-9999" }}"))
                        context.startActivity(dialIntent)
                    } catch (e: Exception) {
                        Log.e("CourierDetails", "Error launching dialer", e)
                    }
                },
                modifier = Modifier
                    .size(44.dp)
                    .background(Color.White, CircleShape)
                    .border(1.dp, BorderColor, CircleShape)
            ) {
                Icon(Icons.Default.Phone, contentDescription = "Call", tint = PrimaryPurple, modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
fun BottomNavigationBar() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp)
            .background(Color(0xFFF3EDF7))
            .border(1.dp, BorderColor.copy(alpha = 0.3f))
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically
    ) {
        BottomNavItem(icon = Icons.Default.Home, label = "Inicio", selected = false)
        BottomNavItem(icon = Icons.Default.LocationOn, label = "Tracking", selected = true)
        BottomNavItem(icon = Icons.Default.Person, label = "Perfil", selected = false)
    }
}

@Composable
fun BottomNavItem(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, selected: Boolean) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable { }
    ) {
        Box(
            modifier = Modifier
                .background(
                    if (selected) SecondaryContainer else Color.Transparent,
                    RoundedCornerShape(16.dp)
                )
                .padding(horizontal = 20.dp, vertical = 4.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (selected) TextPrimary else TextPrimary.copy(alpha = 0.6f)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = if (selected) TextPrimary else TextPrimary.copy(alpha = 0.6f)
        )
    }
}

private fun performLogoutCleanup(
    orchestrator: com.example.data.sync.RealtimeSyncOrchestrator,
    authManager: AuthManager,
    navController: androidx.navigation.NavHostController,
    reason: String = "USER_EXPLICIT_LOGOUT"
) {
    val uid = authManager.currentUser?.uid ?: "none"
    Log.d("AUDIT_LOG", "SESSION_EVENT | LOGOUT_INITIATED | Reason: $reason | UID: $uid | StackTrace: ${Throwable().stackTraceToString()}")
    val stoppedCount = orchestrator.stopUserSession()
    Log.d("AUDIT_LOG", "USER_LISTENERS_RELEASED | Count: $stoppedCount | UID: $uid | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()}")

    authManager.cerrarSesion()

    orchestrator.startListeningGlobal(isGuest = true)

    navController.navigate("guest_home") {
        popUpTo(0) { inclusive = true }
    }
    Log.d("AUDIT_LOG", "LOGOUT_COMPLETED_NAVIGATED_TO_GUEST | Reason: $reason | UID: $uid | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()}")
}

@Composable
fun CustomerSurfaceGuard(
    navController: androidx.navigation.NavController,
    authManager: AuthManager,
    allowGuest: Boolean = false,
    content: @Composable () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val currentUser = authManager.currentUser
    var isAuthorized by remember(currentUser?.uid) { mutableStateOf<Boolean?>(null) }

    if (currentUser == null) {
        if (allowGuest) {
            content()
        } else {
            androidx.compose.runtime.LaunchedEffect(Unit) {
                Log.d("ROLE_GUARD", "UNAUTHENTICATED_ACCESS_BLOCKED | Redirecting to login")
                navController.navigate(Screen.LoginRegister.route) {
                    popUpTo(0) { inclusive = false }
                }
            }
        }
        return
    }

    androidx.compose.runtime.LaunchedEffect(currentUser.uid) {
        val resolution = AppRoleResolver.resolveRole(context, currentUser)
        val role = resolution.role
        Log.d("ROLE_GUARD", "CUSTOMER_SURFACE_GUARD_EVAL | uid=${currentUser.uid} | role=$role")

        when (role) {
            AppRole.CUSTOMER -> {
                isAuthorized = true
            }
            AppRole.MERCHANT -> {
                Log.w("ROLE_GUARD", "MERCHANT_ON_CUSTOMER_SURFACE_BLOCKED | Redirecting to business_dashboard")
                isAuthorized = false
                navController.navigate("business_dashboard") {
                    popUpTo(0) { inclusive = false }
                }
            }
            AppRole.COURIER -> {
                Log.w("ROLE_GUARD", "COURIER_ON_CUSTOMER_SURFACE_BLOCKED | Redirecting to courier")
                isAuthorized = false
                navController.navigate(Screen.Courier.route) {
                    popUpTo(0) { inclusive = false }
                }
            }
            AppRole.ADMIN -> {
                Log.w("ROLE_GUARD", "ADMIN_ON_CUSTOMER_SURFACE_BLOCKED | Redirecting to admin")
                isAuthorized = false
                navController.navigate(Screen.Admin.route) {
                    popUpTo(0) { inclusive = false }
                }
            }
            AppRole.UNKNOWN -> {
                Log.e("ROLE_GUARD", "UNKNOWN_ROLE_BLOCKED | Fail-closed redirecting to login")
                isAuthorized = false
                navController.navigate(Screen.LoginRegister.route) {
                    popUpTo(0) { inclusive = false }
                }
            }
        }
    }

    if (isAuthorized == true) {
        content()
    }
}

@Composable
fun CourierSurfaceGuard(
    navController: androidx.navigation.NavController,
    authManager: AuthManager,
    content: @Composable () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val currentUser = authManager.currentUser
    var isAuthorized by remember(currentUser?.uid) { mutableStateOf<Boolean?>(null) }

    if (currentUser == null) {
        androidx.compose.runtime.LaunchedEffect(Unit) {
            navController.navigate(Screen.LoginRegister.route) {
                popUpTo(0) { inclusive = false }
            }
        }
        return
    }

    androidx.compose.runtime.LaunchedEffect(currentUser.uid) {
        val resolution = AppRoleResolver.resolveRole(context, currentUser)
        val role = resolution.role
        Log.d("ROLE_GUARD", "COURIER_SURFACE_GUARD_EVAL | uid=${currentUser.uid} | role=$role")

        when (role) {
            AppRole.COURIER, AppRole.ADMIN -> {
                isAuthorized = true
            }
            AppRole.MERCHANT -> {
                isAuthorized = false
                navController.navigate("business_dashboard") {
                    popUpTo(0) { inclusive = false }
                }
            }
            AppRole.CUSTOMER -> {
                isAuthorized = false
                navController.navigate("customer_dashboard") {
                    popUpTo(0) { inclusive = false }
                }
            }
            AppRole.UNKNOWN -> {
                isAuthorized = false
                navController.navigate(Screen.LoginRegister.route) {
                    popUpTo(0) { inclusive = false }
                }
            }
        }
    }

    if (isAuthorized == true) {
        content()
    }
}

@Composable
fun MerchantSurfaceGuard(
    navController: androidx.navigation.NavController,
    authManager: AuthManager,
    content: @Composable () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val currentUser = authManager.currentUser
    var isAuthorized by remember(currentUser?.uid) { mutableStateOf<Boolean?>(null) }

    if (currentUser == null) {
        androidx.compose.runtime.LaunchedEffect(Unit) {
            navController.navigate(Screen.LoginRegister.route) {
                popUpTo(0) { inclusive = false }
            }
        }
        return
    }

    androidx.compose.runtime.LaunchedEffect(currentUser.uid) {
        val resolution = AppRoleResolver.resolveRole(context, currentUser)
        val role = resolution.role
        Log.d("ROLE_GUARD", "MERCHANT_SURFACE_GUARD_EVAL | uid=${currentUser.uid} | role=$role")

        when (role) {
            AppRole.MERCHANT, AppRole.ADMIN -> {
                isAuthorized = true
            }
            AppRole.COURIER -> {
                isAuthorized = false
                navController.navigate(Screen.Courier.route) {
                    popUpTo(0) { inclusive = false }
                }
            }
            AppRole.CUSTOMER -> {
                isAuthorized = false
                navController.navigate("customer_dashboard") {
                    popUpTo(0) { inclusive = false }
                }
            }
            AppRole.UNKNOWN -> {
                isAuthorized = false
                navController.navigate(Screen.LoginRegister.route) {
                    popUpTo(0) { inclusive = false }
                }
            }
        }
    }

    if (isAuthorized == true) {
        content()
    }
}

@Composable
fun AdminSurfaceGuard(
    navController: androidx.navigation.NavController,
    authManager: AuthManager,
    content: @Composable () -> Unit
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val currentUser = authManager.currentUser
    var isAuthorized by remember(currentUser?.uid) { mutableStateOf<Boolean?>(null) }

    if (currentUser == null) {
        androidx.compose.runtime.LaunchedEffect(Unit) {
            navController.navigate(Screen.LoginRegister.route) {
                popUpTo(0) { inclusive = false }
            }
        }
        return
    }

    androidx.compose.runtime.LaunchedEffect(currentUser.uid) {
        val resolution = AppRoleResolver.resolveRole(context, currentUser)
        val role = resolution.role
        Log.d("ROLE_GUARD", "ADMIN_SURFACE_GUARD_EVAL | uid=${currentUser.uid} | role=$role")

        if (role == AppRole.ADMIN) {
            isAuthorized = true
        } else {
            isAuthorized = false
            val dest = AppRoleResolver.getCanonicalDestination(role)
            navController.navigate(dest) {
                popUpTo(0) { inclusive = false }
            }
        }
    }

    if (isAuthorized == true) {
        content()
    }
}

