package com.example.domain.model.gatekeeper

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — GATEKEEPER MODELS (FASE 2D.3)
 * Modelos de Dominio de Control de Acceso y Entitlements para Android.
 */

enum class CapabilityModule {
    ORDERS,
    CATALOG,
    CUSTOMERS,
    PROMOTIONS,
    FINANCE,
    REPORTS,
    CONTROL_TOWER,
    FLEET_CORE,
    GPS_TRACKING,
    X_TO_Y_DELIVERY,
    NOTIFICATIONS,
    ANALYTICS,
    GOVERNANCE,
    MULTI_BRANCH,
    MULTI_BRAND,
    API_ACCESS
}

data class GatekeeperAccessDecision(
    val allowed: Boolean,
    val reason: String,
    val module: CapabilityModule? = null,
    val requiredEntitlements: List<String> = emptyList()
)

data class AndroidGatekeeperContext(
    val uid: String,
    val tenantId: String,
    val businessId: String?,
    val role: String,
    val enabledModules: Set<CapabilityModule> = emptySet()
) {
    fun canAccess(module: CapabilityModule): GatekeeperAccessDecision {
        if (uid.isBlank() || tenantId.isBlank()) {
            return GatekeeperAccessDecision(allowed = false, reason = "CONTEXT_INVALID", module = module)
        }

        // Cook role confinement
        if (role.equals("COOK", ignoreCase = true) && module != CapabilityModule.ORDERS) {
            return GatekeeperAccessDecision(allowed = false, reason = "ROLE_UNAUTHORIZED", module = module)
        }

        // Default Deny if not in enabled modules
        if (!enabledModules.contains(module)) {
            return GatekeeperAccessDecision(allowed = false, reason = "ENTITLEMENT_MISSING", module = module)
        }

        return GatekeeperAccessDecision(allowed = true, reason = "ALLOWED", module = module)
    }
}
