package com.example.domain.registry.dashboard

import com.example.domain.model.dashboard.IDashboardWidget
import com.example.domain.model.dashboard.MerchantDashboardWidget
import com.example.domain.model.dashboard.WidgetDensity
import com.example.domain.model.dashboard.WidgetType

/**
 * Registro y Arquitectura Marketplace para Widgets Modulares (WidgetRegistry)
 */
object WidgetRegistry {

    private val registeredFactories = mutableMapOf<WidgetType, (MerchantDashboardWidget) -> IDashboardWidget>()

    fun registerWidgetFactory(type: WidgetType, factory: (MerchantDashboardWidget) -> IDashboardWidget) {
        registeredFactories[type] = factory
    }

    fun isWidgetRegistered(type: WidgetType): Boolean = registeredFactories.containsKey(type)

    fun createWidgetInstance(config: MerchantDashboardWidget): IDashboardWidget? {
        return registeredFactories[config.type]?.invoke(config)
    }

    fun getAvailableWidgetTypes(): List<WidgetType> {
        return WidgetType.values().toList()
    }
}
