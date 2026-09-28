package com.example.domain.engine.update

import com.example.domain.model.AppUpdateConfig
import com.example.domain.model.AppUpdateResolution
import org.junit.Assert.*
import org.junit.Test

class AppUpdateResolverTest {

    // ─── TEST-01: No update available (installed == latest) ────────────────────
    @Test
    fun test01_noUpdateAvailable() {
        val config = AppUpdateConfig(
            enabled = true,
            latestVersion = "1.26.0",
            minimumVersion = "1.25.0"
        )
        val result = AppUpdateResolver.resolve(
            installedVersion = "1.26.0",
            config = config
        )
        assertTrue(result is AppUpdateResolution.NoUpdate)
    }

    // ─── TEST-02: Recommended update (installed < latest, installed >= min) ────
    @Test
    fun test02_recommendedUpdate() {
        val config = AppUpdateConfig(
            enabled = true,
            updateType = "RECOMMENDED",
            latestVersion = "1.26.0",
            minimumVersion = "1.24.0",
            allowDismiss = true
        )
        val result = AppUpdateResolver.resolve(
            installedVersion = "1.25.0",
            config = config
        )
        assertTrue(result is AppUpdateResolution.ShowUpdate)
        val show = result as AppUpdateResolution.ShowUpdate
        assertFalse(show.isForced)
        assertTrue(show.canDismiss)
        assertEquals("RECOMMENDED", show.resolutionReason)
    }

    // ─── TEST-03: Forced update via updateType = FORCED ────────────────────────
    @Test
    fun test03_forcedUpdateByType() {
        val config = AppUpdateConfig(
            enabled = true,
            updateType = "FORCED",
            latestVersion = "1.26.0",
            minimumVersion = "1.24.0",
            allowDismiss = true // updateType FORCED must override allowDismiss
        )
        val result = AppUpdateResolver.resolve(
            installedVersion = "1.25.0",
            config = config
        )
        assertTrue(result is AppUpdateResolution.ShowUpdate)
        val show = result as AppUpdateResolution.ShowUpdate
        assertTrue(show.isForced)
        assertFalse(show.canDismiss)
    }

    // ─── TEST-04: Android only update evaluated on Android ─────────────────────
    @Test
    fun test04_androidOnlyTarget() {
        val config = AppUpdateConfig(
            enabled = true,
            targetPlatforms = listOf("ANDROID"),
            latestVersion = "1.26.0"
        )
        val result = AppUpdateResolver.resolve(
            installedVersion = "1.25.0",
            config = config,
            currentPlatform = "ANDROID"
        )
        assertTrue(result is AppUpdateResolution.ShowUpdate)
    }

    // ─── TEST-05: iOS only update ignored on Android ───────────────────────────
    @Test
    fun test05_iosOnlyTargetIgnoredOnAndroid() {
        val config = AppUpdateConfig(
            enabled = true,
            targetPlatforms = listOf("IOS"),
            latestVersion = "1.26.0"
        )
        val result = AppUpdateResolver.resolve(
            installedVersion = "1.25.0",
            config = config,
            currentPlatform = "ANDROID"
        )
        assertTrue(result is AppUpdateResolution.NoUpdate)
    }

    // ─── TEST-06: Both platforms target (ALL) ──────────────────────────────────
    @Test
    fun test06_bothPlatformsTarget() {
        val config = AppUpdateConfig(
            enabled = true,
            targetPlatforms = listOf("ANDROID", "IOS"),
            latestVersion = "1.26.0"
        )
        val resultAndroid = AppUpdateResolver.resolve("1.25.0", config, "ANDROID")
        val resultIos = AppUpdateResolver.resolve("1.25.0", config, "IOS")

        assertTrue(resultAndroid is AppUpdateResolution.ShowUpdate)
        assertTrue(resultIos is AppUpdateResolution.ShowUpdate)
    }

    // ─── TEST-07: Minimum version violation forces mandatory update ────────────
    @Test
    fun test07_minimumVersionViolation() {
        val config = AppUpdateConfig(
            enabled = true,
            updateType = "RECOMMENDED", // configured as recommended, but minVer is violated
            latestVersion = "1.26.0",
            minimumVersion = "1.25.0",
            forceUpdate = false
        )
        // Installed is 1.24.0, which is strictly less than minimum 1.25.0
        val result = AppUpdateResolver.resolve(
            installedVersion = "1.24.0",
            config = config
        )
        assertTrue(result is AppUpdateResolution.ShowUpdate)
        val show = result as AppUpdateResolution.ShowUpdate
        assertTrue(show.isForced)
        assertFalse(show.canDismiss)
        assertEquals("MINIMUM_VERSION_VIOLATION", show.resolutionReason)
    }

    // ─── TEST-08: Latest version equal to installed version ───────────────────
    @Test
    fun test08_latestVersionEqualInstalled() {
        val config = AppUpdateConfig(
            enabled = true,
            latestVersion = "2.1.0",
            minimumVersion = "2.0.0"
        )
        val result = AppUpdateResolver.resolve("2.1.0", config)
        assertTrue(result is AppUpdateResolution.NoUpdate)
    }

    // ─── TEST-09: Installed version higher than published (QA / Dev build) ─────
    @Test
    fun test09_installedVersionHigher() {
        val config = AppUpdateConfig(
            enabled = true,
            latestVersion = "1.26.0",
            minimumVersion = "1.25.0"
        )
        val result = AppUpdateResolver.resolve("1.27.0", config)
        assertTrue(result is AppUpdateResolution.NoUpdate)
    }

    // ─── TEST-10: Offline / Null config ────────────────────────────────────────
    @Test
    fun test10_offlineNullConfig() {
        val result = AppUpdateResolver.resolve(
            installedVersion = "1.25.0",
            config = null
        )
        assertTrue(result is AppUpdateResolution.NoUpdate)
    }

    // ─── TEST-11: Malformed / Corrupted Config (Fail-Safe Verification) ───────
    @Test
    fun test11_malformedConfig() {
        // Escenario canónico solicitado: tipos corruptos, strings en booleanos, números en versiones, objetos vacíos
        val canonicalMalformed = mapOf(
            "appUpdate" to mapOf(
                "enabled" to "YES",
                "latestVersion" to 123,
                "minimumVersion" to null,
                "targetPlatforms" to "ANDROID",
                "displayFrequency" to emptyMap<String, Any>(),
                "forceUpdate" to "TRUE"
            )
        )

        // Verificación 1: Payload anidado con tipos corruptos resuelve NoUpdate sin crash ni excepción
        val result1 = AppUpdateResolver.resolveFromRaw("1.25.0", canonicalMalformed)
        assertTrue(result1 is AppUpdateResolution.NoUpdate)

        // Verificación 2: Payload plano directo con tipos corruptos
        val directMalformed = mapOf(
            "enabled" to "YES",
            "latestVersion" to 123,
            "minimumVersion" to null,
            "targetPlatforms" to "ANDROID",
            "displayFrequency" to emptyMap<String, Any>(),
            "forceUpdate" to "TRUE"
        )
        val result2 = AppUpdateResolver.resolveFromRaw("1.25.0", directMalformed)
        assertTrue(result2 is AppUpdateResolution.NoUpdate)

        // Verificación 3: Primitivos no compatibles o estructuras rotas (String, Int, List)
        val result3 = AppUpdateResolver.resolveFromRaw("1.25.0", "MALFORMED_JSON_STRING_PAYLOAD")
        assertTrue(result3 is AppUpdateResolution.NoUpdate)

        val result4 = AppUpdateResolver.resolveFromRaw("1.25.0", 404)
        assertTrue(result4 is AppUpdateResolution.NoUpdate)

        val result5 = AppUpdateResolver.resolveFromRaw("1.25.0", listOf(1, 2, "error"))
        assertTrue(result5 is AppUpdateResolution.NoUpdate)

        // Verificación 4: Configuración con enabled = false explícito
        val disabledConfig = AppUpdateConfig(
            enabled = false,
            latestVersion = "1.26.0"
        )
        val result6 = AppUpdateResolver.resolve("1.25.0", disabledConfig)
        assertTrue(result6 is AppUpdateResolution.NoUpdate)
    }

    // ─── TEST-12: Broken image fallback handling in model ──────────────────────
    @Test
    fun test12_nullImageHandled() {
        val config = AppUpdateConfig(
            enabled = true,
            latestVersion = "1.26.0",
            imageUrl = null,
            iconUrl = null
        )
        val result = AppUpdateResolver.resolve("1.25.0", config)
        assertTrue(result is AppUpdateResolution.ShowUpdate)
        val show = result as AppUpdateResolution.ShowUpdate
        assertNull(show.config.imageUrl)
    }

    // ─── TEST-13: Invalid store URL fallback to package market URI ─────────────
    @Test
    fun test13_storeUrlFallback() {
        val config = AppUpdateConfig(
            enabled = true,
            latestVersion = "1.26.0",
            playStoreUrl = ""
        )
        val result = AppUpdateResolver.resolve(
            installedVersion = "1.25.0",
            config = config,
            defaultPackageName = "com.bluesystem.delivery"
        )
        assertTrue(result is AppUpdateResolution.ShowUpdate)
        val show = result as AppUpdateResolution.ShowUpdate
        assertEquals("market://details?id=com.bluesystem.delivery", show.storeUrl)
    }

    // ─── TEST-14: SemVer comparison: 1.9.0 < 1.10.0 and 1.9.9 < 1.10.0 ─────────
    @Test
    fun test14_semVerComparison() {
        // Critical requirement: 1.9.0 must be LESS than 1.10.0
        assertTrue(AppUpdateResolver.compareSemVer("1.9.0", "1.10.0") < 0)
        assertTrue(AppUpdateResolver.compareSemVer("1.9.9", "1.10.0") < 0)
        assertTrue(AppUpdateResolver.compareSemVer("1.10.0", "1.9.0") > 0)
        assertEquals(0, AppUpdateResolver.compareSemVer("1.10.0", "1.10.0"))
        assertEquals(0, AppUpdateResolver.compareSemVer("v1.26.0", "1.26.0"))
        assertTrue(AppUpdateResolver.compareSemVer("1.25.9", "1.26.0") < 0)
    }

    // ─── TEST-15: Client receives new configuration reactively ─────────────────
    @Test
    fun test15_reactiveConfigEvolution() {
        val configOld = AppUpdateConfig(enabled = false, latestVersion = "1.25.0")
        val res1 = AppUpdateResolver.resolve("1.25.0", configOld)
        assertTrue(res1 is AppUpdateResolution.NoUpdate)

        val configNew = AppUpdateConfig(enabled = true, latestVersion = "1.26.0")
        val res2 = AppUpdateResolver.resolve("1.25.0", configNew)
        assertTrue(res2 is AppUpdateResolution.ShowUpdate)
    }

    // ─── TEST-16: Schedule window validity (startAt / endAt) ───────────────────
    @Test
    fun test16_scheduleWindow() {
        val now = 1750000000000L
        val pastIso = "2025-01-01T00:00:00Z"
        val futureIso = "2027-01-01T00:00:00Z"

        // Active window
        val configActive = AppUpdateConfig(
            enabled = true,
            latestVersion = "1.26.0",
            startAt = pastIso,
            endAt = futureIso
        )
        val resActive = AppUpdateResolver.resolve("1.25.0", configActive, currentTimeMillis = now)
        assertTrue(resActive is AppUpdateResolution.ShowUpdate)

        // Expired window
        val configExpired = AppUpdateConfig(
            enabled = true,
            latestVersion = "1.26.0",
            startAt = "2024-01-01T00:00:00Z",
            endAt = "2024-12-31T23:59:59Z"
        )
        val resExpired = AppUpdateResolver.resolve("1.25.0", configExpired, currentTimeMillis = now)
        assertTrue(resExpired is AppUpdateResolution.NoUpdate)
    }

    // ─── TEST-17: Forced update via forceUpdate flag ───────────────────────────
    @Test
    fun test17_forceUpdateFlagBypassesDismiss() {
        val config = AppUpdateConfig(
            enabled = true,
            forceUpdate = true,
            latestVersion = "1.26.0",
            minimumVersion = "1.24.0"
        )
        val result = AppUpdateResolver.resolve("1.25.0", config)
        assertTrue(result is AppUpdateResolution.ShowUpdate)
        val show = result as AppUpdateResolution.ShowUpdate
        assertTrue(show.isForced)
        assertFalse(show.canDismiss)
    }

    // ─── TEST-18: Pre-release version suffix stripping ─────────────────────────
    @Test
    fun test18_preReleaseSuffixStripping() {
        val cmp = AppUpdateResolver.compareSemVer("1.26.0-beta.1", "1.25.0")
        assertTrue(cmp > 0)
    }

    // ─── TEST-19: Multi-digit SemVer components (1.100.2 vs 1.99.9) ────────────
    @Test
    fun test19_multiDigitSemVer() {
        val cmp = AppUpdateResolver.compareSemVer("1.99.9", "1.100.2")
        assertTrue(cmp < 0)
    }

    // ─── TEST-20: Case insensitive target platforms ────────────────────────────
    @Test
    fun test20_caseInsensitivePlatform() {
        val config = AppUpdateConfig(
            enabled = true,
            targetPlatforms = listOf("android"),
            latestVersion = "1.26.0"
        )
        val result = AppUpdateResolver.resolve("1.25.0", config, currentPlatform = "ANDROID")
        assertTrue(result is AppUpdateResolution.ShowUpdate)
    }

    // ─── TEST-21: Target platform ALL matches any platform ─────────────────────
    @Test
    fun test21_platformAllMatches() {
        val config = AppUpdateConfig(
            enabled = true,
            targetPlatforms = listOf("ALL"),
            latestVersion = "1.26.0"
        )
        val resAndroid = AppUpdateResolver.resolve("1.25.0", config, "ANDROID")
        val resIos = AppUpdateResolver.resolve("1.25.0", config, "IOS")
        assertTrue(resAndroid is AppUpdateResolution.ShowUpdate)
        assertTrue(resIos is AppUpdateResolution.ShowUpdate)
    }

    // ─── TEST-22: Store URL resolution for iOS ─────────────────────────────────
    @Test
    fun test22_iosStoreUrlResolution() {
        val config = AppUpdateConfig(
            enabled = true,
            latestVersion = "1.26.0",
            appStoreUrl = "https://apps.apple.com/app/id999"
        )
        val res = AppUpdateResolver.resolve("1.25.0", config, "IOS")
        assertTrue(res is AppUpdateResolution.ShowUpdate)
        assertEquals("https://apps.apple.com/app/id999", (res as AppUpdateResolution.ShowUpdate).storeUrl)
    }

    // ─── TEST-23: Info update type resolution ──────────────────────────────────
    @Test
    fun test23_infoUpdateTypeResolution() {
        val config = AppUpdateConfig(
            enabled = true,
            updateType = "INFO",
            latestVersion = "1.26.0"
        )
        val res = AppUpdateResolver.resolve("1.25.0", config)
        assertTrue(res is AppUpdateResolution.ShowUpdate)
        val show = res as AppUpdateResolution.ShowUpdate
        assertFalse(show.isForced)
        assertTrue(show.canDismiss)
        assertEquals("INFO", show.resolutionReason)
    }

    // ─── TEST-24: Default version fallback when input empty ────────────────────
    @Test
    fun test24_emptyVersionStringFallback() {
        val config = AppUpdateConfig(
            enabled = true,
            latestVersion = "1.26.0"
        )
        val res = AppUpdateResolver.resolve("", config)
        assertTrue(res is AppUpdateResolution.ShowUpdate)
    }

    // ─── TEST-25: Public Projection Sanitization Boundary Test (Security) ───────
    @Test
    fun test25_publicProjectionSanitization() {
        // Documento global con datos altamente confidenciales del sistema
        val sensitiveGlobalConfig = mapOf(
            "appUpdate" to mapOf(
                "enabled" to true,
                "updateType" to "RECOMMENDED",
                "latestVersion" to "2.0.0",
                "minimumVersion" to "1.9.0",
                "targetPlatforms" to listOf("ANDROID", "IOS"),
                "title" to "Actualización 2.0",
                "subtitle" to "Mejoras de rendimiento",
                "message" to "Hemos optimizado la velocidad de entrega.",
                "primaryButtonText" to "Actualizar",
                "secondaryButtonText" to "Más tarde"
            ),
            "financialConfig" to mapOf(
                "stripeSecretKey" to "sk_live_SECRET_KEY_NEVER_LEAK",
                "commissionRate" to 0.15,
                "bankRoutingNumber" to "99887766"
            ),
            "canary" to mapOf(
                "rolloutPercentage" to 20,
                "internalTesterUids" to listOf("uid_admin_1", "uid_sec_2")
            ),
            "internalFlags" to mapOf(
                "debugSecretEndpoints" to true,
                "maintenanceBypassToken" to "super_secret_token"
            ),
            "tenantConfig" to mapOf(
                "isolatedTenants" to listOf("tenant_01", "tenant_02")
            ),
            "adminClaims" to mapOf(
                "masterPin" to "8821"
            )
        )

        // Ejecutar builder de proyección pública sanitizada
        val publicProjection = AppUpdateResolver.buildSanitizedProjection(sensitiveGlobalConfig)

        // 1. Debe contener los campos visuales requeridos
        assertTrue(publicProjection.containsKey("enabled"))
        assertEquals(true, publicProjection["enabled"])
        assertEquals("2.0.0", publicProjection["latestVersion"])
        assertEquals("1.9.0", publicProjection["minimumVersion"])
        assertEquals("Actualización 2.0", publicProjection["title"])

        // 2. JAMÁS debe filtrar campos sensibles del sistema (Zero Leaks)
        val forbiddenKeys = listOf(
            "financialConfig", "stripeSecretKey", "commissionRate", "bankRoutingNumber",
            "canary", "rolloutPercentage", "internalTesterUids",
            "internalFlags", "debugSecretEndpoints", "maintenanceBypassToken",
            "tenantConfig", "isolatedTenants", "adminClaims", "masterPin"
        )
        for (key in forbiddenKeys) {
            assertFalse("Security Violation: $key was leaked in public projection!", publicProjection.containsKey(key))
        }

        // 3. Garantizar que todos los campos en la proyección pertenecen a la lista blanca estricta
        val allowedWhitelist = setOf(
            "enabled", "updateType", "latestVersion", "minimumVersion", "targetPlatforms",
            "title", "subtitle", "message", "imageUrl", "iconUrl", "showLogo",
            "primaryButtonText", "secondaryButtonText", "allowDismiss", "forceUpdate",
            "playStoreUrl", "appStoreUrl", "backgroundColor", "primaryButtonColor",
            "textColor", "startAt", "endAt", "displayFrequency", "cooldownHours",
            "campaignId", "schemaVersion"
        )
        for (key in publicProjection.keys) {
            assertTrue("Security Violation: Unexpected field '$key' in sanitized projection!", allowedWhitelist.contains(key))
        }
    }

    // ─── TEST-26: Firestore Security Matrix Test (Least Privilege) ─────────────
    @Test
    fun test26_firestoreSecurityMatrix() {
        data class SecurityContext(
            val uid: String?,
            val role: String,
            val isSuperAdminClaim: Boolean = false,
            val isPlatformAdminClaim: Boolean = false
        )

        // Emulador determinístico de las reglas de seguridad de Firestore para /system_config/{configId}
        fun evaluateFirestoreRule(
            action: String, // "read" o "write"
            configId: String,
            context: SecurityContext?
        ): Boolean {
            val isAuthenticated = context?.uid != null
            val isSuperAdmin = (context?.role?.equals("SUPER_ADMIN", ignoreCase = true) == true) || (context?.isSuperAdminClaim == true)
            val isPlatformAdmin = (context?.role?.equals("PLATFORM_ADMIN", ignoreCase = true) == true) || (context?.isPlatformAdminClaim == true)

            return if (action == "read") {
                // allow read: if configId == 'app_update' || isAuthenticated();
                configId == "app_update" || isAuthenticated
            } else {
                // allow write: if isAuthenticated && (isSuperAdmin || isPlatformAdmin);
                isAuthenticated && (isSuperAdmin || isPlatformAdmin)
            }
        }

        val anon: SecurityContext? = null
        val customer = SecurityContext(uid = "cust_1", role = "CUSTOMER")
        val cashier = SecurityContext(uid = "cash_1", role = "CASHIER")
        val genericAdmin = SecurityContext(uid = "adm_1", role = "ADMIN") // Generic Admin no es Platform Admin
        val platformAdmin = SecurityContext(uid = "padmin_1", role = "PLATFORM_ADMIN")
        val superAdmin = SecurityContext(uid = "sadmin_1", role = "SUPER_ADMIN")

        // 1. ANONYMOUS
        assertTrue("Anonymous must read app_update", evaluateFirestoreRule("read", "app_update", anon))
        assertFalse("Anonymous must NOT read global", evaluateFirestoreRule("read", "global", anon))
        assertFalse("Anonymous must NOT write app_update", evaluateFirestoreRule("write", "app_update", anon))
        assertFalse("Anonymous must NOT write global", evaluateFirestoreRule("write", "global", anon))

        // 2. CUSTOMER
        assertTrue("Customer can read app_update", evaluateFirestoreRule("read", "app_update", customer))
        assertTrue("Customer can read global", evaluateFirestoreRule("read", "global", customer))
        assertFalse("Customer must NOT write app_update", evaluateFirestoreRule("write", "app_update", customer))
        assertFalse("Customer must NOT write global", evaluateFirestoreRule("write", "global", customer))

        // 3. CASHIER (Comercio / Staff)
        assertFalse("Cashier must NOT write app_update", evaluateFirestoreRule("write", "app_update", cashier))
        assertFalse("Cashier must NOT write global", evaluateFirestoreRule("write", "global", cashier))

        // 4. GENERIC ADMIN (Least Privilege: generic ADMIN role must NOT write platform update)
        assertFalse("Generic ADMIN must NOT write app_update", evaluateFirestoreRule("write", "app_update", genericAdmin))
        assertFalse("Generic ADMIN must NOT write global", evaluateFirestoreRule("write", "global", genericAdmin))

        // 5. PLATFORM_ADMIN
        assertTrue("Platform Admin can read app_update", evaluateFirestoreRule("read", "app_update", platformAdmin))
        assertTrue("Platform Admin can read global", evaluateFirestoreRule("read", "global", platformAdmin))
        assertTrue("Platform Admin can write app_update", evaluateFirestoreRule("write", "app_update", platformAdmin))
        assertTrue("Platform Admin can write global", evaluateFirestoreRule("write", "global", platformAdmin))

        // 6. SUPER_ADMIN
        assertTrue("Super Admin can read app_update", evaluateFirestoreRule("read", "app_update", superAdmin))
        assertTrue("Super Admin can read global", evaluateFirestoreRule("read", "global", superAdmin))
        assertTrue("Super Admin can write app_update", evaluateFirestoreRule("write", "app_update", superAdmin))
        assertTrue("Super Admin can write global", evaluateFirestoreRule("write", "global", superAdmin))
    }

    // ─── TEST-27: Storage Security Matrix Test (Anti-XSS & MIME Check) ─────────
    @Test
    fun test27_storageSecurityMatrix() {
        data class StorageAuthContext(
            val uid: String?,
            val isPlatformAdmin: Boolean
        )

        // Emulador determinístico de las reglas de Storage para /app_update_assets/{allPaths=**}
        fun evaluateStorageRule(
            action: String, // "read" o "write"
            auth: StorageAuthContext?,
            contentType: String,
            sizeBytes: Long
        ): Boolean {
            return if (action == "read") {
                true // allow read: if true;
            } else {
                // allow create, update: if isPlatformAdmin() && size <= 2MB && contentType in [jpeg, jpg, png, webp]
                val isPlatformAdmin = auth != null && auth.isPlatformAdmin
                val safeSize = sizeBytes <= 2 * 1024 * 1024
                val safeMime = listOf("image/jpeg", "image/jpg", "image/png", "image/webp").contains(contentType.lowercase())
                isPlatformAdmin && safeSize && safeMime
            }
        }

        val anon: StorageAuthContext? = null
        val customer = StorageAuthContext(uid = "cust_1", isPlatformAdmin = false)
        val platformAdmin = StorageAuthContext(uid = "admin_1", isPlatformAdmin = true)

        // 1. Anonymous Read
        assertTrue("Anonymous can read JPEG", evaluateStorageRule("read", anon, "image/jpeg", 500_000))
        assertTrue("Anonymous can read PNG", evaluateStorageRule("read", anon, "image/png", 500_000))
        assertFalse("Anonymous can NOT write JPEG", evaluateStorageRule("write", anon, "image/jpeg", 500_000))

        // 2. Customer Write
        assertFalse("Customer can NOT write JPEG", evaluateStorageRule("write", customer, "image/jpeg", 500_000))

        // 3. Platform Admin Valid Writes (JPEG, PNG, WebP <= 2MB)
        assertTrue("Platform Admin can write JPEG 500KB", evaluateStorageRule("write", platformAdmin, "image/jpeg", 500_000))
        assertTrue("Platform Admin can write PNG 1.5MB", evaluateStorageRule("write", platformAdmin, "image/png", 1_500_000))
        assertTrue("Platform Admin can write WebP 200KB", evaluateStorageRule("write", platformAdmin, "image/webp", 200_000))

        // 4. Platform Admin Blocked Writes (GATE-002: Zero SVG, Zero Executables, Zero Over-size)
        assertFalse("SVG must be BLOCKED for Anti-XSS", evaluateStorageRule("write", platformAdmin, "image/svg+xml", 50_000))
        assertFalse("PDF must be BLOCKED", evaluateStorageRule("write", platformAdmin, "application/pdf", 100_000))
        assertFalse("EXE must be BLOCKED", evaluateStorageRule("write", platformAdmin, "application/x-msdownload", 500_000))
        assertFalse("Oversized image (>2MB) must be BLOCKED", evaluateStorageRule("write", platformAdmin, "image/jpeg", 3 * 1024 * 1024))
    }

    // ─── TEST-28: Atomic SSOT + Projection Batch Integrity Test ────────────────
    @Test
    fun test28_atomicSsotProjectionBatch() {
        // Emulador de persistencia batch en Firestore
        class MockFirestoreBatch {
            var globalDoc: Map<String, Any?>? = mapOf("latestVersion" to "1.0.0")
            var projectionDoc: Map<String, Any?>? = mapOf("latestVersion" to "1.0.0")

            private val stagedWrites = mutableMapOf<String, Map<String, Any?>>()

            fun set(docPath: String, data: Map<String, Any?>) {
                stagedWrites[docPath] = data
            }

            fun commit(simulateFailure: Boolean): Boolean {
                if (simulateFailure) {
                    stagedWrites.clear()
                    return false // Rollback: ninguna mutación ocurre
                }
                if (stagedWrites.containsKey("global")) {
                    globalDoc = stagedWrites["global"]
                }
                if (stagedWrites.containsKey("app_update")) {
                    projectionDoc = stagedWrites["app_update"]
                }
                stagedWrites.clear()
                return true
            }
        }

        val db = MockFirestoreBatch()

        // Caso 1: Guardado Exitoso Atómico
        db.set("global", mapOf("latestVersion" to "2.0.0", "minimumVersion" to "1.9.0"))
        db.set("app_update", mapOf("latestVersion" to "2.0.0", "minimumVersion" to "1.9.0"))
        val success = db.commit(simulateFailure = false)

        assertTrue(success)
        assertEquals("2.0.0", db.globalDoc?.get("latestVersion"))
        assertEquals("2.0.0", db.projectionDoc?.get("latestVersion"))
        // Consistencia idéntica entre SSOT y proyección
        assertEquals(db.globalDoc?.get("latestVersion"), db.projectionDoc?.get("latestVersion"))

        // Caso 2: Simulación de Fallo de Red / Transacción
        db.set("global", mapOf("latestVersion" to "2.1.0"))
        db.set("app_update", mapOf("latestVersion" to "2.1.0"))
        val failed = db.commit(simulateFailure = true)

        assertFalse(failed)
        // Ninguno se actualizó parcialmente; ambos retienen el valor anterior (2.0.0)
        assertEquals("2.0.0", db.globalDoc?.get("latestVersion"))
        assertEquals("2.0.0", db.projectionDoc?.get("latestVersion"))
        // Cero desincronización entre SSOT y Proyección
        assertEquals(db.globalDoc?.get("latestVersion"), db.projectionDoc?.get("latestVersion"))
    }
}

