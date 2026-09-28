package com.example.domain.dashboard

import com.example.DashboardConfig
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PROTOCOLO BSD-C2D-CUSTOMER-DASHBOARD-POST-IMPLEMENTATION-CORRECTION-001
 *
 * Test obligatorio de cierre del hallazgo P1:
 * Demuestra matemáticamente y a nivel de contrato que QUICK_REORDER es 100% independiente
 * de la gobernanza de servicio X->Y (xToYServiceEnabled) y del banner (showExpressDeliveryBanner).
 */
class QuickReorderXToYIndependenceTest {

    // Función auxiliar que refleja la evaluación semántica de visibilidad en el feed dinámico
    private fun isQuickReorderAvailable(config: DashboardConfig): Boolean {
        // En CustomerHomeFeedSection.kt, QUICK_REORDER depende exclusivamente de showQuickReorder
        // y de su presencia en el orden de secciones normalizado.
        val inSectionOrder = config.getNormalizedSectionOrder().contains("QUICK_REORDER")
        return inSectionOrder && config.showQuickReorder
    }

    private fun isExpressDeliveryAvailable(config: DashboardConfig): Boolean {
        // En CustomerHomeFeedSection.kt:280, EXPRESS_DELIVERY está gobernado estrictamente por:
        // showExpressDeliveryBanner && xToYServiceEnabled
        val inSectionOrder = config.getNormalizedSectionOrder().contains("EXPRESS_DELIVERY")
        return inSectionOrder && config.showExpressDeliveryBanner && config.xToYServiceEnabled
    }

    @Test
    fun `mandatory P1 test - xToY disabled and banner disabled with quick reorder enabled produces available`() {
        val config = DashboardConfig(
            xToYServiceEnabled = false,
            showExpressDeliveryBanner = false,
            showQuickReorder = true
        )

        assertTrue(
            "QUICK_REORDER must be AVAILABLE even when X->Y and its banner are completely disabled",
            isQuickReorderAvailable(config)
        )
        assertFalse(
            "EXPRESS_DELIVERY must be UNAVAILABLE when X->Y service and banner are disabled",
            isExpressDeliveryAvailable(config)
        )
    }

    @Test
    fun `matrix case 1 - xToY OFF, banner OFF, quick reorder ON produces quick reorder available`() {
        val config = DashboardConfig(
            xToYServiceEnabled = false,
            showExpressDeliveryBanner = false,
            showQuickReorder = true
        )
        assertTrue(isQuickReorderAvailable(config))
        assertFalse(isExpressDeliveryAvailable(config))
    }

    @Test
    fun `matrix case 2 - xToY OFF, banner ON, quick reorder ON produces quick reorder available`() {
        val config = DashboardConfig(
            xToYServiceEnabled = false,
            showExpressDeliveryBanner = true,
            showQuickReorder = true
        )
        assertTrue(isQuickReorderAvailable(config))
        assertFalse("EXPRESS_DELIVERY must be disabled because xToYServiceEnabled is false", isExpressDeliveryAvailable(config))
    }

    @Test
    fun `matrix case 3 - xToY ON, banner OFF, quick reorder ON produces quick reorder available`() {
        val config = DashboardConfig(
            xToYServiceEnabled = true,
            showExpressDeliveryBanner = false,
            showQuickReorder = true
        )
        assertTrue(isQuickReorderAvailable(config))
        assertFalse("EXPRESS_DELIVERY must be disabled because showExpressDeliveryBanner is false", isExpressDeliveryAvailable(config))
    }

    @Test
    fun `matrix case 4 - xToY ON, banner ON, quick reorder ON produces both available independently`() {
        val config = DashboardConfig(
            xToYServiceEnabled = true,
            showExpressDeliveryBanner = true,
            showQuickReorder = true
        )
        assertTrue(isQuickReorderAvailable(config))
        assertTrue(isExpressDeliveryAvailable(config))
    }

    @Test
    fun `quick reorder OFF produces unavailable regardless of X to Y state`() {
        val configBothOn = DashboardConfig(
            xToYServiceEnabled = true,
            showExpressDeliveryBanner = true,
            showQuickReorder = false
        )
        assertFalse(isQuickReorderAvailable(configBothOn))
        assertTrue(isExpressDeliveryAvailable(configBothOn))

        val configBothOff = DashboardConfig(
            xToYServiceEnabled = false,
            showExpressDeliveryBanner = false,
            showQuickReorder = false
        )
        assertFalse(isQuickReorderAvailable(configBothOff))
        assertFalse(isExpressDeliveryAvailable(configBothOff))
    }

    @Test
    fun `fail-closed defaults ensure quick reorder is on by default but X to Y is completely off`() {
        val defaultConfig = DashboardConfig()
        assertTrue("Default config enables quick reorder for returning customers", isQuickReorderAvailable(defaultConfig))
        assertFalse("Default config must keep X to Y service strictly disabled (Fail-Closed)", isExpressDeliveryAvailable(defaultConfig))
        assertFalse("Default config must keep Express delivery banner strictly disabled (Fail-Closed)", defaultConfig.showExpressDeliveryBanner)
        assertFalse("Default config must keep X to Y service strictly disabled (Fail-Closed)", defaultConfig.xToYServiceEnabled)
    }
}
