package com.example.whitelabel

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — ANDROID CLIENT EXPERIENCE & NAVIGATION (FASE 2D.5)
 * Dynamic Navigation and Client Experience Configuration Models
 */

enum class CommercialModel {
    MARKETPLACE,
    AGENCY,
    WHITE_LABEL_COMMERCE,
    ENTERPRISE
}

enum class ModuleVisibility {
    VISIBLE,
    HIDDEN,
    DISABLED,
    DENIED
}

data class AndroidNavigationItem(
    val id: String,
    val title: String,
    val route: String,
    val iconName: String,
    val requiredModule: String,
    val order: Int,
    val visibility: ModuleVisibility = ModuleVisibility.VISIBLE
)

data class AndroidClientExperienceSnapshot(
    val tenantId: String,
    val brandId: String,
    val commercialModel: CommercialModel,
    val appDisplayName: String,
    val appShortName: String,
    val designTokens: BrandDesignTokens,
    val enabledModules: List<String>,
    val navigationItems: List<AndroidNavigationItem>,
    val isFallback: Boolean = false
)

object EntitlementDrivenNavigation {
    fun filterVisibleNavigation(
        items: List<AndroidNavigationItem>,
        enabledModules: Set<String>,
        userRole: String
    ): List<AndroidNavigationItem> {
        return items
            .filter { item ->
                enabledModules.contains(item.requiredModule) && item.visibility == ModuleVisibility.VISIBLE
            }
            .sortedBy { it.order }
    }
}
