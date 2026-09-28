package com.example.domain

import com.example.domain.model.DynamicMenuItem
import com.example.domain.model.PromotionalPopup
import org.junit.Assert.*
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Locale

class DynamicMenuAndPopupTest {

    // ═════════════════════════════════════════════════════════════════════════
    // PRUEBAS DE MENÚ DINÁMICO
    // ═════════════════════════════════════════════════════════════════════════

    @Test
    fun testC10_MENU_01_createAndFilterActiveMenuItems() {
        val items = listOf(
            DynamicMenuItem(id = "1", title = "WhatsApp", order = 1, active = true),
            DynamicMenuItem(id = "2", title = "Zona VIP", order = 2, active = false),
            DynamicMenuItem(id = "3", title = "Promociones", order = 3, active = true)
        )

        val activeItems = items.filter { it.active }.sortedBy { it.order }

        assertEquals(2, activeItems.size)
        assertEquals("WhatsApp", activeItems[0].title)
        assertEquals("Promociones", activeItems[1].title)
    }

    @Test
    fun testC10_MENU_02_reorderMenuItems() {
        val items = listOf(
            DynamicMenuItem(id = "1", title = "Promociones", order = 10, active = true),
            DynamicMenuItem(id = "2", title = "WhatsApp", order = 2, active = true),
            DynamicMenuItem(id = "3", title = "Zona VIP", order = 1, active = true)
        )

        val sorted = items.sortedBy { it.order }

        assertEquals("Zona VIP", sorted[0].title)
        assertEquals("WhatsApp", sorted[1].title)
        assertEquals("Promociones", sorted[2].title)
    }

    @Test
    fun testC10_MENU_03_multiTenantFiltering() {
        val allItems = listOf(
            DynamicMenuItem(id = "1", title = "Global Promo", tenantId = "GLOBAL", active = true),
            DynamicMenuItem(id = "2", title = "Tenant A Only", tenantId = "TENANT_A", active = true),
            DynamicMenuItem(id = "3", title = "Tenant B Only", tenantId = "TENANT_B", active = true)
        )

        val customerTenantId = "TENANT_A"
        val filteredForA = allItems.filter { item ->
            val t = item.tenantId.trim().uppercase()
            t.isEmpty() || t == "GLOBAL" || t == customerTenantId
        }

        assertEquals(2, filteredForA.size)
        assertTrue(filteredForA.any { it.title == "Global Promo" })
        assertTrue(filteredForA.any { it.title == "Tenant A Only" })
        assertFalse(filteredForA.any { it.title == "Tenant B Only" })
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRUEBAS DE POP-UP PROMOCIONAL
    // ═════════════════════════════════════════════════════════════════════════

    @Test
    fun testC10_POP_01_priorityOrderingSelectsHighest() {
        val popups = listOf(
            PromotionalPopup(id = "p1", title = "Baja Prioridad", priority = 10, active = true),
            PromotionalPopup(id = "p2", title = "Alta Prioridad", priority = 100, active = true),
            PromotionalPopup(id = "p3", title = "Media Prioridad", priority = 50, active = true)
        )

        val top = popups.filter { it.active }.maxByOrNull { it.priority }

        assertNotNull(top)
        assertEquals("p2", top?.id)
        assertEquals("Alta Prioridad", top?.title)
    }

    @Test
    fun testC10_POP_02_timeValidityEvaluation() {
        val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US)
        val now = System.currentTimeMillis()
        val past = iso.format(now - 100_000_000L)
        val future = iso.format(now + 100_000_000L)

        val activeValid = PromotionalPopup(id = "1", startDate = past, endDate = future, active = true)
        val futureCamp = PromotionalPopup(id = "2", startDate = future, endDate = iso.format(now + 200_000_000L), active = true)
        val expiredCamp = PromotionalPopup(id = "3", startDate = iso.format(now - 200_000_000L), endDate = past, active = true)

        fun isValid(p: PromotionalPopup): Boolean {
            val s = if (p.startDate.isNotBlank()) iso.parse(p.startDate)?.time ?: 0L else 0L
            val e = if (p.endDate.isNotBlank()) iso.parse(p.endDate)?.time ?: Long.MAX_VALUE else Long.MAX_VALUE
            return now in s..e && p.active
        }

        assertTrue(isValid(activeValid))
        assertFalse(isValid(futureCamp))
        assertFalse(isValid(expiredCamp))
    }

    @Test
    fun testC10_POP_03_multiTenantIsolation() {
        val popups = listOf(
            PromotionalPopup(id = "1", title = "Global Popup", tenantId = "GLOBAL", priority = 10),
            PromotionalPopup(id = "2", title = "Tenant A VIP", tenantId = "TENANT_A", priority = 100),
            PromotionalPopup(id = "3", title = "Tenant B VIP", tenantId = "TENANT_B", priority = 100)
        )

        val tenantBCustomerId = "TENANT_B"
        val visibleForB = popups.filter { p ->
            val t = p.tenantId.trim().uppercase()
            t == "GLOBAL" || t == tenantBCustomerId
        }.sortedByDescending { it.priority }

        assertEquals(2, visibleForB.size)
        assertEquals("Tenant B VIP", visibleForB[0].title)
        assertEquals("Global Popup", visibleForB[1].title)
        assertFalse(visibleForB.any { it.title == "Tenant A VIP" })
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRUEBAS DE MATRIZ DE SEGURIDAD DE DESTINOS
    // ═════════════════════════════════════════════════════════════════════════

    @Test
    fun testSEC_destinationSecurityPolicy() {
        val dangerousUrls = listOf(
            "javascript:alert(1)",
            "javascript:void(0)",
            "data:text/html,<script>alert(1)</script>",
            "file:///data/user/0/com.example/databases",
            "vbscript:msgbox",
            "intent://evil.com#Intent;action=..."
        )

        fun isSafe(url: String): Boolean {
            val lower = url.trim().lowercase()
            return !lower.startsWith("javascript:") &&
                    !lower.startsWith("data:") &&
                    !lower.startsWith("file:") &&
                    !lower.startsWith("vbscript:") &&
                    !lower.startsWith("intent:")
        }

        dangerousUrls.forEach { dangerousUrl ->
            assertFalse("URL peligrosa '$dangerousUrl' debió ser bloqueada", isSafe(dangerousUrl))
        }

        val safeUrls = listOf(
            "https://wa.me/50588888888",
            "https://bluesystem.app/vip",
            "profile",
            "orders",
            "coupons",
            "solicitar_envio"
        )

        safeUrls.forEach { safeUrl ->
            assertTrue("URL segura '$safeUrl' debió ser permitida", isSafe(safeUrl))
        }
    }
}
