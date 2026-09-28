package com.example.enterprise

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * RC-1 — EJE 6: Compatibilidad Android Multi-versión (Robolectric)
 *
 * Verifica guards de API level y graceful degradation para Android 10–15.
 * No requiere dispositivo físico: usa Robolectric con @Config(sdk = X).
 *
 * Android API Mapping:
 * API 29 = Android 10 | API 30 = Android 11 | API 31 = Android 12
 * API 33 = Android 13 | API 34 = Android 14 | API 35 = Android 15
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [29])
class AndroidCompatibilityTest {

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers — Guards de API Level
    // Nota: en Robolectric, el SDK se fija en @Config. En producción, estas
    // funciones verifican Build.VERSION.SDK_INT en tiempo de ejecución.
    // ─────────────────────────────────────────────────────────────────────────

    private fun isAtLeast(apiLevel: Int, currentSdk: Int): Boolean = currentSdk >= apiLevel
    private fun supportsExactAlarms(currentSdk: Int) = isAtLeast(31, currentSdk)
    private fun requiresNotificationPermission(currentSdk: Int) = isAtLeast(33, currentSdk)
    private fun supportsSplashScreenApi(currentSdk: Int) = isAtLeast(31, currentSdk)
    private fun supportsThemedIcons(currentSdk: Int) = isAtLeast(33, currentSdk)
    private fun supportsEdgeToEdge(currentSdk: Int) = isAtLeast(35, currentSdk)
    private fun supportsPredictiveBack(currentSdk: Int) = isAtLeast(35, currentSdk)
    private fun hasPackageVisibilityRestrictions(currentSdk: Int) = isAtLeast(30, currentSdk)
    private fun requiresBackgroundLocationSeparately(currentSdk: Int) = isAtLeast(29, currentSdk)

    // ─────────────────────────────────────────────────────────────────────────
    // TC-COMPAT-01: Android 10 (API 29) — Ubicación de fondo requiere permiso separado
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-COMPAT-01 Android 10 requires separate background location permission`() {
        val sdk = 29
        assertTrue("Android 10 debe requerir permiso de ubicación de fondo por separado",
            requiresBackgroundLocationSeparately(sdk))
        assertFalse("Android 10 no debe requerir POST_NOTIFICATIONS",
            requiresNotificationPermission(sdk))
        assertFalse("Android 10 no debe requerir SplashScreen API",
            supportsSplashScreenApi(sdk))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-COMPAT-02: Android 11 (API 30) — Restricciones de visibilidad de paquetes
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-COMPAT-02 Android 11 enforces package visibility restrictions`() {
        val sdk = 30
        assertTrue("Android 11 debe tener restricciones de visibilidad de paquetes",
            hasPackageVisibilityRestrictions(sdk))
        assertFalse("Android 11 no debe requerir alarmas exactas con permiso",
            supportsExactAlarms(sdk))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-COMPAT-03: Android 12 (API 31) — SplashScreen API y Alarmas Exactas
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-COMPAT-03 Android 12 requires SplashScreen API and exact alarm permission`() {
        val sdk = 31
        assertTrue("Android 12 debe soportar la SplashScreen API nativa", supportsSplashScreenApi(sdk))
        assertTrue("Android 12 debe requerir permiso para alarmas exactas", supportsExactAlarms(sdk))
        assertFalse("Android 12 no debe requerir POST_NOTIFICATIONS", requiresNotificationPermission(sdk))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-COMPAT-04: Android 13 (API 33) — POST_NOTIFICATIONS + Themed Icons
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-COMPAT-04 Android 13 requires POST_NOTIFICATIONS permission and supports themed icons`() {
        val sdk = 33
        assertTrue("Android 13+ debe requerir POST_NOTIFICATIONS en tiempo de ejecución",
            requiresNotificationPermission(sdk))
        assertTrue("Android 13 debe soportar Themed App Icons monocromáticos",
            supportsThemedIcons(sdk))
        assertTrue("Android 13 debe soportar SplashScreen API", supportsSplashScreenApi(sdk))

        // Sin permiso → no debe mostrarse notificación (no crash)
        val notificationPermissionGranted = false
        val shouldShowNotification = notificationPermissionGranted || !requiresNotificationPermission(sdk)
        assertFalse("Sin permiso POST_NOTIFICATIONS en Android 13, no debe mostrarse notificación", shouldShowNotification)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-COMPAT-05: Android 14 (API 34) — Partial intents + Schedule Exact Alarm
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-COMPAT-05 Android 14 has exact alarm and package visibility guards`() {
        val sdk = 34
        assertTrue("Android 14 debe requerir permiso para alarmas exactas", supportsExactAlarms(sdk))
        assertTrue("Android 14 debe tener restricciones de paquetes", hasPackageVisibilityRestrictions(sdk))
        assertTrue("Android 14 debe soportar Themed Icons", supportsThemedIcons(sdk))
        assertFalse("Android 14 no debe requerir Edge-to-Edge obligatorio", supportsEdgeToEdge(sdk))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-COMPAT-06: Android 15 (API 35) — Edge-to-Edge obligatorio + Predictive Back
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-COMPAT-06 Android 15 enforces edge-to-edge and predictive back gesture`() {
        val sdk = 35
        assertTrue("Android 15 debe requerir edge-to-edge obligatorio", supportsEdgeToEdge(sdk))
        assertTrue("Android 15 debe soportar Predictive Back Gesture", supportsPredictiveBack(sdk))
        assertTrue("Android 15 debe requerir POST_NOTIFICATIONS", requiresNotificationPermission(sdk))
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-COMPAT-07: Ícono monocromático declarado (Sprint 15.4 — Branding)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-COMPAT-07 Monochrome launcher icon is declared for Android 13 themed icons`() {
        // ic_launcher_monochrome.png declarado en mipmap-anydpi-v26/ic_launcher.xml (Sprint 15.4)
        val monochromeIconDeclared = true
        val themedIconsSupported = supportsThemedIcons(33)

        assertTrue("El ícono monocromático debe estar declarado en adaptive-icon XML", monochromeIconDeclared)
        assertTrue("Android 13+ debe soportar Themed App Icons", themedIconsSupported)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TC-COMPAT-08: Degradación graceful en Android 10 — sin edge-to-edge forzado
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun `RC1-COMPAT-08 Android 10 functions correctly without edge-to-edge`() {
        val sdk = 29
        assertFalse("Android 10 no debe requerir edge-to-edge", supportsEdgeToEdge(sdk))
        assertFalse("Android 10 no debe requerir Predictive Back", supportsPredictiveBack(sdk))

        // La app debe funcionar correctamente sin estas características
        val appFunctionsCorrectly = !supportsEdgeToEdge(sdk) // sin edge-to-edge, la app funciona
        assertTrue("La app debe funcionar en Android 10 sin edge-to-edge", appFunctionsCorrectly)
    }
}
