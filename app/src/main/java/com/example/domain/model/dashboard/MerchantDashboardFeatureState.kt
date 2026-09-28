package com.example.domain.model.dashboard

/**
 * Feature Flags para el Sprint 15.1 — Merchant Operations Dashboard
 */
data class MerchantDashboardFeatureState(
    val enableMerchantDashboardV2: Boolean = true,
    val enableMerchantAssistant: Boolean = true,
    val enableAdvancedAnalytics: Boolean = true,
    val enableRealtimeTimeline: Boolean = true,
    val enableDashboardWidgets: Boolean = true
)
