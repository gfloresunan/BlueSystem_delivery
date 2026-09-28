package com.example.dashboard

import com.example.domain.model.dashboard.WidgetType
import com.example.domain.registry.dashboard.WidgetRegistry
import org.junit.Assert.*
import org.junit.Test

class WidgetRegistryFactoryTest {

    @Test
    fun testWidgetRegistryAvailableTypes() {
        val types = WidgetRegistry.getAvailableWidgetTypes()
        assertTrue(types.contains(WidgetType.SYSTEM_HEALTH_WIDGET))
        assertTrue(types.contains(WidgetType.DAILY_GOAL_WIDGET))
    }
}
