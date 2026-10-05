package com.example.presentation.admin

/**
 * Rutas canónicas para el ecosistema Admin Android Enterprise (BSD-ADMIN-MOBILE-ENTERPRISE-CONSOLIDATION-001).
 * Todas las rutas están protegidas por RoleGuard y PermissionCheck.
 */
object AdminRoutes {
    const val DASHBOARD = "admin/dashboard"
    const val MERCHANT_REQUESTS = "admin/merchant_requests"
    const val COURIER_REQUESTS = "admin/courier_requests"
    const val COURIER_PROFILE_MGMT = "admin/courier_profile_mgmt"
    const val IDENTITY_CENTER = "admin/identity_center"
    const val SUPPORT_CENTER = "admin/support_center"
    const val COURIER_CASH_CENTER = "admin/courier_cash_center"
    const val LIVE_COURIER_MONITOR = "admin/live_courier_monitor"
    const val ENTERPRISE_COMMERCE = "admin/enterprise_commerce"
    const val GLOBAL_CONFIG = "admin/global_config"
    const val NOTIFICATIONS = "admin/notifications"

    // Deep Link templates
    fun merchantRequestDetail(id: String) = "admin/merchant_requests/$id"
    fun courierRequestDetail(id: String) = "admin/courier_requests/$id"
    fun courierProfileDetail(id: String) = "admin/courier/$id"
    fun supportTicketDetail(ticketId: String) = "admin/support/$ticketId"
    fun courierClosureDetail(closureId: String) = "admin/courier_cash_center/$closureId"
    fun commerceDetail(businessId: String) = "admin/enterprise_commerce/$businessId"
}
