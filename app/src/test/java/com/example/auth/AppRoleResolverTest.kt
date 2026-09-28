package com.example.auth

import com.example.domain.engine.auth.AppRoleResolver
import com.example.domain.model.AppRole
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AppRoleResolverTest {

    // ====================================================================
    // 1. Role Normalization & Synonyms Test Matrix
    // ====================================================================

    @Test
    fun testCustomerRoleNormalization() {
        val customerSynonyms = listOf(
            "customer", "cliente", "client", "user", "usuario", "consumidor",
            "CUSTOMER", "CLIENTE", "Client", " User ", "usuario\n"
        )
        for (synonym in customerSynonyms) {
            assertEquals("Failed for synonym: $synonym", AppRole.CUSTOMER, AppRole.fromString(synonym))
        }
    }

    @Test
    fun testMerchantRoleNormalization() {
        val merchantSynonyms = listOf(
            "merchant", "comercio", "business", "negocio", "restaurante", "restaurant",
            "tienda", "store", "owner", "partner", "aliado", "vendedor", "seller",
            "MERCHANT", "Comercio", "BUSINESS", " Restaurante "
        )
        for (synonym in merchantSynonyms) {
            assertEquals("Failed for synonym: $synonym", AppRole.MERCHANT, AppRole.fromString(synonym))
        }
    }

    @Test
    fun testCourierRoleNormalization() {
        val courierSynonyms = listOf(
            "courier", "repartidor", "motorizado", "driver", "chofer", "rider",
            "delivery", "mensajero", "conductor",
            "COURIER", "Repartidor", "MOTORIZADO", " Driver "
        )
        for (synonym in courierSynonyms) {
            assertEquals("Failed for synonym: $synonym", AppRole.COURIER, AppRole.fromString(synonym))
        }
    }

    @Test
    fun testAdminRoleNormalization() {
        val adminSynonyms = listOf(
            "admin", "administrador", "administrator", "superadmin", "soporte",
            "support", "staff", "operador",
            "ADMIN", "Administrador", " SUPERADMIN "
        )
        for (synonym in adminSynonyms) {
            assertEquals("Failed for synonym: $synonym", AppRole.ADMIN, AppRole.fromString(synonym))
        }
    }

    @Test
    fun testFailClosedOnNullEmptyOrUnknown() {
        val invalidInputs = listOf(
            null, "", " ", "   ", "\t", "\n",
            "unknown", "invalid_role", "hacker", "guest", "null", "undefined", "123"
        )
        for (input in invalidInputs) {
            assertEquals("Failed to fail-closed on: '$input'", AppRole.UNKNOWN, AppRole.fromString(input))
        }
    }

    // ====================================================================
    // 2. Canonical Destination Mapping
    // ====================================================================

    @Test
    fun testCanonicalDestinations() {
        assertEquals("customer_dashboard", AppRoleResolver.getCanonicalDestination(AppRole.CUSTOMER))
        assertEquals("business_dashboard", AppRoleResolver.getCanonicalDestination(AppRole.MERCHANT))
        assertEquals("courier", AppRoleResolver.getCanonicalDestination(AppRole.COURIER))
        assertEquals("admin", AppRoleResolver.getCanonicalDestination(AppRole.ADMIN))
        assertEquals("login_register", AppRoleResolver.getCanonicalDestination(AppRole.UNKNOWN))
    }

    // ====================================================================
    // 3. Route Authorization Matrix (isRouteAuthorized)
    // ====================================================================

    @Test
    fun testCustomerRouteAuthorization() {
        val role = AppRole.CUSTOMER

        // Allowed for CUSTOMER
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "customer_dashboard"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "home"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "orders"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "profile"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "customer_cart"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "solicitar_envio_form"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "customer/order_tracking/123"))

        // FORBIDDEN for CUSTOMER
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "business_dashboard"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "merchant_orders"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "courier"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "courier_dashboard"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "admin"))
    }

    @Test
    fun testMerchantRouteAuthorization() {
        val role = AppRole.MERCHANT

        // Allowed for MERCHANT
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "business_dashboard"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "merchant_orders"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "merchant_menu"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "business_settings"))

        // STRICTLY FORBIDDEN for MERCHANT (Cannot access Customer UI)
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "customer_dashboard"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "home"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "orders"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "profile"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "customer_cart"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "solicitar_envio_form"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "courier"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "admin"))
    }

    @Test
    fun testCourierRouteAuthorization() {
        val role = AppRole.COURIER

        // Allowed for COURIER
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "courier"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "courier_dashboard"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "courier_map"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "courier_earnings"))

        // STRICTLY FORBIDDEN for COURIER (Cannot access Customer or Merchant UI)
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "customer_dashboard"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "home"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "orders"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "profile"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "business_dashboard"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "admin"))
    }

    @Test
    fun testAdminRouteAuthorization() {
        val role = AppRole.ADMIN

        // ADMIN has supervisory access
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "admin"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "admin_users"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "admin_settlements"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "business_dashboard"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "courier"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "customer_dashboard"))
    }

    @Test
    fun testUnknownRoleFailClosed() {
        val role = AppRole.UNKNOWN

        // Only public unauthenticated routes allowed
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "auth"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "login"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "splash"))
        assertTrue(AppRoleResolver.isRouteAuthorized(role, "guest_home"))

        // ALL internal surfaces are FORBIDDEN
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "customer_dashboard"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "home"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "profile"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "business_dashboard"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "courier"))
        assertFalse(AppRoleResolver.isRouteAuthorized(role, "admin"))
    }

    // ====================================================================
    // 4. Biometric Route Verification
    // ====================================================================

    @Test
    fun testBiometricTargetRouteValidation() {
        // Case: Merchant user authenticates via biometric with stale customer targetRoute
        val merchantRole = AppRole.MERCHANT
        val staleCustomerTarget = "customer_dashboard"
        val isTargetAllowed = AppRoleResolver.isRouteAuthorized(merchantRole, staleCustomerTarget)

        assertFalse(isTargetAllowed)
        // If target is disallowed, app must redirect to merchant canonical destination
        val safeDestination = if (isTargetAllowed) staleCustomerTarget else AppRoleResolver.getCanonicalDestination(merchantRole)
        assertEquals("business_dashboard", safeDestination)

        // Case: Courier user authenticates via biometric with valid courier targetRoute
        val courierRole = AppRole.COURIER
        val validCourierTarget = "courier"
        assertTrue(AppRoleResolver.isRouteAuthorized(courierRole, validCourierTarget))
    }
}
