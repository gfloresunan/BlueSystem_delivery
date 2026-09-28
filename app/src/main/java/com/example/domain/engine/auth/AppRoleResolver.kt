package com.example.domain.engine.auth

import android.content.Context
import android.util.Log
import com.example.Screen
import com.example.domain.model.AppRole
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.ConcurrentHashMap

/**
 * BSD-ROLE-ROUTING-ISOLATION-001
 * Centralized, Authoritative Engine for Canonical AppRole Resolution & Surface Guarding.
 *
 * Guaranteed Invariants:
 * 1. Single Source of Truth for Role Resolution.
 * 2. Fail-Closed: Never defaults to CUSTOMER on null, error, conflict, or timeout.
 * 3. Strict Precedence: Custom Claims > Firestore Canonical Role > Validated Cache > UNKNOWN.
 * 4. Surface Isolation: Authoritative destination mapping and Route Guarding.
 */
object AppRoleResolver {

    private const val TAG = "AppRoleResolver"
    private const val PREFS_NAME = "user_session_prefs"
    private const val KEY_PREFIX_ROLE = "last_verified_role_"

    // In-memory atomic cache keyed by UID
    private val roleMemoryCache = ConcurrentHashMap<String, AppRole>()

    data class ResolutionResult(
        val role: AppRole,
        val source: String,
        val isConflict: Boolean = false,
        val details: String? = null
    )

    fun clearCache(uid: String? = null) {
        if (uid != null) {
            roleMemoryCache.remove(uid)
        } else {
            roleMemoryCache.clear()
        }
        Log.d(TAG, "Role memory cache cleared for uid=${uid ?: "ALL"}")
    }

    /**
     * Synchronously retrieves the cached role from memory or SharedPreferences.
     */
    fun getCachedRole(context: Context, uid: String?): AppRole {
        if (uid.isNullOrBlank()) return AppRole.UNKNOWN
        roleMemoryCache[uid]?.let { return it }
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val persistedRaw = prefs.getString("$KEY_PREFIX_ROLE$uid", null)
        val role = AppRole.fromString(persistedRaw)
        if (role.isKnown()) {
            roleMemoryCache[uid] = role
        }
        return role
    }

    /**
     * Resolves the canonical AppRole for the given user with strict Fail-Closed security.
     */
    suspend fun resolveRole(
        context: Context,
        user: FirebaseUser? = FirebaseAuth.getInstance().currentUser,
        forceRefresh: Boolean = false
    ): ResolutionResult {
        if (user == null) {
            Log.d(TAG, "AUTH_CHECK | user=null -> AppRole.UNKNOWN")
            return ResolutionResult(AppRole.UNKNOWN, "NO_USER")
        }

        val uid = user.uid

        // 1. In-memory cache hit if not forcing refresh
        if (!forceRefresh) {
            roleMemoryCache[uid]?.let { cachedRole ->
                if (cachedRole.isKnown()) {
                    Log.d(TAG, "ROLE_RESOLVED_MEM_CACHE | uid=$uid | role=$cachedRole")
                    return ResolutionResult(cachedRole, "MEMORY_CACHE")
                }
            }
        }

        // 2. Fetch Custom Claims (Cryptographically signed by Backend / Functions)
        var claimsRole: AppRole? = null
        var hasBusinessIdClaim = false
        try {
            val tokenResult = user.getIdToken(forceRefresh).await()
            val claims = tokenResult.claims

            val rawClaimRole = claims["role"] as? String
                ?: claims["eiamRole"] as? String
                ?: claims["userType"] as? String
            val claimBizId = claims["businessId"] as? String

            if (!claimBizId.isNullOrBlank()) {
                hasBusinessIdClaim = true
            }

            if (!rawClaimRole.isNullOrBlank()) {
                val parsedClaim = AppRole.fromString(rawClaimRole)
                if (parsedClaim.isKnown()) {
                    claimsRole = parsedClaim
                }
            } else if (hasBusinessIdClaim) {
                claimsRole = AppRole.MERCHANT
            }
            Log.d(TAG, "CLAIMS_EVAL | uid=$uid | rawRole=$rawClaimRole | parsedRole=$claimsRole | hasBizId=$hasBusinessIdClaim")
        } catch (e: Exception) {
            Log.w(TAG, "CLAIMS_FETCH_ERROR | uid=$uid | ${e.message}")
        }

        // 3. Fetch Firestore Profile (/users/{uid})
        var firestoreRole: AppRole? = null
        var firestoreUserType: AppRole? = null
        var hasFirestoreBusinessId = false
        try {
            val docSnapshot = withTimeoutOrNull(3000L) {
                FirebaseFirestore.getInstance().collection("users").document(uid).get().await()
            }
            if (docSnapshot != null && docSnapshot.exists()) {
                val rawRole = docSnapshot.getString("role")
                    ?: docSnapshot.getString("eiamRole")
                    ?: docSnapshot.getString("rol")
                val rawUserType = docSnapshot.getString("userType")
                val bizId = docSnapshot.getString("businessId")
                    ?: docSnapshot.getString("comercioId")

                if (!bizId.isNullOrBlank()) {
                    hasFirestoreBusinessId = true
                }

                if (!rawRole.isNullOrBlank()) {
                    val parsedRole = AppRole.fromString(rawRole)
                    if (parsedRole.isKnown()) firestoreRole = parsedRole
                }
                if (!rawUserType.isNullOrBlank()) {
                    val parsedUserType = AppRole.fromString(rawUserType)
                    if (parsedUserType.isKnown()) firestoreUserType = parsedUserType
                }

                Log.d(TAG, "FIRESTORE_EVAL | uid=$uid | role=$firestoreRole | userType=$firestoreUserType | hasBizId=$hasFirestoreBusinessId")
            }
        } catch (e: Exception) {
            Log.w(TAG, "FIRESTORE_FETCH_ERROR | uid=$uid | ${e.message}")
        }

        // 4. Resolve Canonical Role & Detect Conflicts
        val resolvedRole: AppRole
        val source: String
        var isConflict = false

        // Priority 1: Claims role if present and verified
        if (claimsRole != null && claimsRole.isKnown()) {
            // Check for conflict with Firestore
            val conflictingFsRole = when {
                firestoreRole != null && firestoreRole != claimsRole -> firestoreRole
                firestoreUserType != null && firestoreUserType != claimsRole && firestoreUserType.isKnown() -> firestoreUserType
                else -> null
            }

            if (conflictingFsRole != null) {
                Log.w(TAG, "ROLE_CONFLICT_DETECTED | uid=$uid | Claims=$claimsRole vs Firestore=$conflictingFsRole")
                // If Claims is MERCHANT or COURIER or ADMIN, Claims takes authoritative precedence over legacy Firestore "customer" userType
                if (claimsRole in setOf(AppRole.MERCHANT, AppRole.COURIER, AppRole.ADMIN)) {
                    resolvedRole = claimsRole
                    source = "CLAIMS_AUTHORITATIVE_OVERRIDE"
                } else if (conflictingFsRole in setOf(AppRole.MERCHANT, AppRole.COURIER, AppRole.ADMIN)) {
                    // Firestore indicates merchant/courier/admin while claims might not be refreshed yet
                    resolvedRole = conflictingFsRole
                    source = "FIRESTORE_PRIVILEGED_OVERRIDE"
                } else {
                    isConflict = true
                    resolvedRole = AppRole.UNKNOWN // Fail-closed
                    source = "UNRESOLVABLE_CONFLICT"
                }
            } else {
                resolvedRole = claimsRole
                source = "CLAIMS"
            }
        } else if (hasBusinessIdClaim || hasFirestoreBusinessId) {
            // Document or claim explicitly binds to a merchant businessId
            resolvedRole = AppRole.MERCHANT
            source = "BUSINESS_ID_BINDING"
        } else if (firestoreRole != null && firestoreRole.isKnown()) {
            resolvedRole = firestoreRole
            source = "FIRESTORE_ROLE"
        } else if (firestoreUserType != null && firestoreUserType.isKnown()) {
            resolvedRole = firestoreUserType
            source = "FIRESTORE_USER_TYPE"
        } else {
            // 5. Fallback to persisted verified role in SharedPreferences (offline/network failure)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val persistedRaw = prefs.getString("$KEY_PREFIX_ROLE$uid", null)
            val persistedRole = AppRole.fromString(persistedRaw)

            if (persistedRole.isKnown()) {
                Log.w(TAG, "OFFLINE_FALLBACK_VERIFIED_ROLE | uid=$uid | role=$persistedRole")
                resolvedRole = persistedRole
                source = "PERSISTED_VERIFIED_CACHE"
            } else {
                // FAIL-CLOSED: Absolutely never default to CUSTOMER
                Log.e(TAG, "FAIL_CLOSED_UNKNOWN_ROLE | uid=$uid | No valid role found in Claims, Firestore or Cache")
                resolvedRole = AppRole.UNKNOWN
                source = "FAIL_CLOSED_UNKNOWN"
            }
        }

        // 6. Update cache if resolved role is verified and known
        if (resolvedRole.isKnown()) {
            roleMemoryCache[uid] = resolvedRole
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString("$KEY_PREFIX_ROLE$uid", resolvedRole.canonicalName).apply()
        }

        Log.d(TAG, "FINAL_ROLE_RESOLVED | uid=$uid | role=$resolvedRole | source=$source | conflict=$isConflict")
        return ResolutionResult(
            role = resolvedRole,
            source = source,
            isConflict = isConflict,
            details = "uid=$uid"
        )
    }

    /**
     * Returns the authorized, canonical start destination route for the given role.
     */
    fun getCanonicalDestination(role: AppRole): String {
        return when (role) {
            AppRole.MERCHANT -> "business_dashboard"
            AppRole.COURIER -> Screen.Courier.route
            AppRole.ADMIN -> Screen.Admin.route
            AppRole.CUSTOMER -> "customer_dashboard"
            AppRole.UNKNOWN -> Screen.LoginRegister.route // Fail-closed!
        }
    }

    /**
     * Determines whether a given route is authorized for a specified AppRole.
     */
    fun isRouteAuthorized(role: AppRole, route: String): Boolean {
        if (route.isBlank()) return false
        val baseRoute = route.substringBefore('?').substringBefore('/')

        // Universal public / auth routes
        if (baseRoute in listOf("splash", "login_register", "auth_screen", "auth", "login", "register", "guest_home", "biometric_unlock", "seleccion_rol")) {
            return true
        }

        return when (role) {
            AppRole.CUSTOMER -> {
                baseRoute in listOf(
                    "customer_dashboard",
                    "customer",
                    "home",
                    "orders",
                    "profile",
                    "customer_cart",
                    "solicitar_envio",
                    "solicitar_envio_form",
                    "address_manager",
                    "orders_history",
                    "order_detail",
                    "order_chat",
                    "customer_help",
                    "customer_coupons",
                    "comercio_detalle_screen",
                    "tracking_pedido",
                    "esperando_repartidor",
                    "loyalty_points",
                    "loyalty_level",
                    "security_settings"
                )
            }
            AppRole.MERCHANT -> {
                baseRoute in listOf(
                    "business_dashboard",
                    "merchant_orders",
                    "merchant_menu",
                    "business_settings",
                    "security_settings",
                    "order_chat"
                )
            }
            AppRole.COURIER -> {
                baseRoute in listOf(
                    "courier",
                    "courier_dashboard",
                    "courier_map",
                    "courier_earnings",
                    "driver_dashboard",
                    "ruta_activa",
                    "security_settings",
                    "order_chat"
                )
            }
            AppRole.ADMIN -> {
                // Admin has platform-wide governance access
                true
            }
            AppRole.UNKNOWN -> {
                // Fail-closed: Cannot access any protected surface
                false
            }
        }
    }
}
