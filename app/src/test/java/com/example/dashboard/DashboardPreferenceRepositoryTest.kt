package com.example.dashboard

import com.example.domain.model.dashboard.MerchantDashboardWidget
import com.example.domain.model.dashboard.WidgetDensity
import com.example.domain.model.dashboard.WidgetType
import org.junit.Assert.*
import org.junit.Test

class DashboardPreferenceRepositoryTest {

    @Test
    fun testWidgetPinToTopModelMapping() {
        val widget = MerchantDashboardWidget(
            type = WidgetType.CLASSIFIED_ALERTS,
            title = "Alertas",
            isPinned = true,
            density = WidgetDensity.EXPANDED
        )

        assertTrue(widget.isPinned)
        assertEquals(WidgetDensity.EXPANDED, widget.density)
    }
}
