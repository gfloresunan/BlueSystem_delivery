package com.example.dashboard

import com.example.domain.model.dashboard.MerchantDashboardWidget
import com.example.domain.model.dashboard.WidgetType
import org.junit.Assert.*
import org.junit.Test

class DashboardSummaryTest {

    @Test
    fun testWidgetVisibilityToggle() {
        val widget = MerchantDashboardWidget(WidgetType.SMART_HEADER, "Header", isVisible = true)
        val hiddenWidget = widget.copy(isVisible = false)

        assertTrue(widget.isVisible)
        assertFalse(hiddenWidget.isVisible)
    }
}
