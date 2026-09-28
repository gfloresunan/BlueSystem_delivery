package com.example.eiam.domain.model

/**
 * EIAM — FeatureFlag Model (FASE 1)
 * Define banderas de características habilitadas por usuario, rol o tenant.
 */
data class FeatureFlag(
    val key: String,
    val isEnabled: Boolean = false,
    val description: String = "",
    val allowedRoles: List<EiamRole> = emptyList(),
    val allowedTenantIds: List<String> = emptyList()
)
