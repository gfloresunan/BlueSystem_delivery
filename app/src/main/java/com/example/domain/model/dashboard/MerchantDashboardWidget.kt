package com.example.domain.model.dashboard

/**
 * Enums de los Widgets Modulares del Enterprise Operations Center (EOC)
 */
enum class WidgetType {
    UNIFIED_SEARCH_BAR,
    SMART_HEADER,
    DAILY_GOAL_WIDGET,
    LIVE_ORDER_KPIS,
    FINANCIAL_KPIS,
    PERFORMANCE_KPIS,
    CLASSIFIED_ALERTS,
    LIVE_ORDERS_CENTER,
    COURIER_TRACKING,
    CUSTOMER_INSIGHTS,
    SYSTEM_HEALTH_WIDGET,
    KDS_SUMMARY,
    PRODUCT_SUMMARY,
    EXECUTIVE_ANALYTICS,
    REALTIME_TIMELINE,
    QUICK_ACTIONS,
    MERCHANT_ASSISTANT
}

enum class WidgetDensity {
    COMPACT,  // Vista ajustada compacta
    MEDIUM,   // Vista estándar
    EXPANDED  // Vista completa expandida
}

data class MerchantDashboardWidget(
    val type: WidgetType,
    val title: String,
    val isVisible: Boolean = true,
    val isPinned: Boolean = false, // Pin to Top ⭐
    val density: WidgetDensity = WidgetDensity.MEDIUM,
    val order: Int = 0
)
