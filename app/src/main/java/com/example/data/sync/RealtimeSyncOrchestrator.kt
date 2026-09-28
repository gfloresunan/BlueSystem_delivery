package com.example.data.sync

import android.util.Log
import com.example.BuildConfig
import com.example.data.repository.*
import com.example.domain.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.*

class RealtimeSyncOrchestrator(
    val configRepo: ConfigurationRepository = ConfigurationRepository(),
    val userProfileRepo: UserProfileRepository = UserProfileRepository(),
    val notificationRepo: NotificationRepository = NotificationRepository(),
    val addressRepo: AddressRepository = AddressRepository(),
    val promotionRepo: PromotionRepository = PromotionRepository(),
    val categoryRepo: CategoryRepository = CategoryRepository(),
    val businessRepo: BusinessRepository = BusinessRepository(),
    val healthMonitor: HealthMonitor = HealthMonitor()
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    val config: StateFlow<SystemConfig> = configRepo.config
    val userProfile: StateFlow<UserProfile?> = userProfileRepo.userProfile
    val notifications: StateFlow<List<AppNotification>> = notificationRepo.notifications
    val unreadCount: StateFlow<Int> = notificationRepo.unreadCount
    val addresses: StateFlow<List<com.example.Address>> = addressRepo.addresses
    val promotions: StateFlow<List<Promotion>> = promotionRepo.promotions
    val categories: StateFlow<List<Category>> = categoryRepo.categories
    val featuredBusinesses: StateFlow<List<BusinessInfo>> = businessRepo.featuredBusinesses
    val healthStatus: StateFlow<HealthStatus> = healthMonitor.healthStatus

    // Derived States: Módulo 3 (Bloqueo)
    val isBlocked: StateFlow<Boolean> = userProfileRepo.userProfile
        .map { profile -> profile?.isUserBlocked() == true }
        .stateIn(scope, SharingStarted.Eagerly, false)

    // Derived States: App Update Center & Resiliency Resolver
    val appUpdateResolution: StateFlow<AppUpdateResolution> = configRepo.config
        .map { cfg ->
            if (cfg.appUpdate != null) {
                com.example.domain.engine.update.AppUpdateResolver.resolve(
                    installedVersion = BuildConfig.VERSION_NAME,
                    config = cfg.appUpdate,
                    currentPlatform = com.example.domain.engine.update.AppUpdateResolver.PLATFORM_ANDROID
                )
            } else if (cfg.forceUpdate && (BuildConfig.VERSION_CODE < cfg.minimumVersion)) {
                // Fallback de retrocompatibilidad estricta con parámetros raíz legacy
                AppUpdateResolution.ShowUpdate(
                    config = AppUpdateConfig(
                        enabled = true,
                        updateType = "FORCED",
                        minimumVersion = "${cfg.minimumVersion}.0.0",
                        latestVersion = "${cfg.minimumVersion}.0.0",
                        forceUpdate = true
                    ),
                    isForced = true,
                    canDismiss = false,
                    storeUrl = "market://details?id=com.aistudio.delivery.djweq",
                    resolutionReason = "LEGACY_ROOT_CONFIG"
                )
            } else {
                AppUpdateResolution.NoUpdate
            }
        }
        .stateIn(scope, SharingStarted.Eagerly, AppUpdateResolution.NoUpdate)

    // Derived States: Módulo 12 (Actualización Obligatoria - Retrocompatibilidad)
    val forceUpdate: StateFlow<Boolean> = appUpdateResolution
        .map { resolution ->
            resolution is AppUpdateResolution.ShowUpdate && resolution.isForced
        }
        .stateIn(scope, SharingStarted.Eagerly, false)

    private var currentActiveUid: String? = null
    private var globalStarted = false

    fun startListeningGuest() {
        SessionManager.setGuestMode()
        if (globalStarted) {
            Log.d("AUDIT_LOG", "GLOBAL_LISTENER_SKIPPED | Already running | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()}")
            return
        }
        globalStarted = true
        Log.d("AUDIT_LOG", "GLOBAL_GUEST_LISTENER_STARTED | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()}")
        configRepo.startListening()
        promotionRepo.startListening()
        categoryRepo.startListening()
        businessRepo.startListening()
        healthMonitor.start(isGuest = true, userRole = "guest")
        healthMonitor.updateActiveListenersCount(4)
    }

    fun startListeningGlobal(isGuest: Boolean = false) {
        if (isGuest) {
            startListeningGuest()
        } else {
            if (globalStarted) return
            globalStarted = true
            configRepo.startListening()
            promotionRepo.startListening()
            categoryRepo.startListening()
            businessRepo.startListening()
            healthMonitor.start(isGuest = false, userRole = "customer")
            healthMonitor.updateActiveListenersCount(4)
        }
    }

    fun startListeningUser(uid: String) {
        if (uid.isEmpty()) return

        // FASE 4: Validar autenticación de Firebase antes de iniciar listeners privados
        val authUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        if (authUser == null || authUser.uid != uid) {
            Log.d("ORCHESTRATOR", "Skipping private listener. Guest mode.")
            return
        }

        SessionManager.setAuthenticatedMode(uid)

        if (uid == currentActiveUid) {
            Log.d("AUDIT_LOG", "USER_LISTENER_SKIPPED | Same UID: $uid | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()}")
            return
        }
        startListeningGlobal(isGuest = false)

        userProfileRepo.startListening(uid)
        notificationRepo.startListening(uid)
        addressRepo.startListening(uid)

        currentActiveUid = uid
        healthMonitor.updateActiveListenersCount(8)
        Log.d("AUDIT_LOG", "USER_LISTENER_STARTED | UID: $uid | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()}")
    }

    fun stopUserSession(): Int {
        var count = 0
        if (userProfileRepo.stopListening()) count++
        if (notificationRepo.stopListening()) count++
        if (addressRepo.stopListening()) count++
        healthMonitor.stop()
        healthMonitor.updateActiveListenersCount(if (globalStarted) 5 else 0)

        val oldUid = currentActiveUid ?: "none"
        currentActiveUid = null

        SessionManager.setLoggingOut()
        Log.d("AUDIT_LOG", "USER_LISTENERS_STOPPED_BEFORE_SIGNOUT | Count: $count | UID: $oldUid | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()}")
        return count
    }

    fun stopAll() {
        val oldUid = currentActiveUid ?: "none"
        stopUserSession()
        globalStarted = false
        healthMonitor.updateActiveListenersCount(0)
        Log.d("AUDIT_LOG", "ALL_LISTENERS_STOPPED | UID: $oldUid | Thread: ${Thread.currentThread().name} | Time: ${System.currentTimeMillis()}")
        configRepo.stopListening()
        promotionRepo.stopListening()
        categoryRepo.stopListening()
        businessRepo.stopListening()
    }
}
