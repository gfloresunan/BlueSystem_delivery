package com.example.domain.model.identity

import androidx.annotation.Keep

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.7)
 * Estado Observable de Contexto Activo de Tenant para UI/ViewModels.
 */
@Keep
sealed class TenantContextState {
    @Keep
    object Uninitialized : TenantContextState()

    @Keep
    object Loading : TenantContextState()

    @Keep
    data class Active(
        val context: ActiveTenantContext,
        val settings: TenantSettings? = null,
        val source: String = "RESOLVED_V3"
    ) : TenantContextState()

    @Keep
    data class Error(
        val code: String,
        val message: String
    ) : TenantContextState()

    @Keep
    object LoggedOut : TenantContextState()
}

/**
 * Estado de Branding para presentación en UI (Jetpack Compose / TopBar / Theme).
 */
@Keep
data class TenantBrandingState(
    val tenantId: String = "",
    val brandId: String? = null,
    val displayName: String = "",
    val logoUrl: String? = null,
    val primaryColorHex: String = "#1E88E5",
    val secondaryColorHex: String = "#0D47A1",
    val accentColorHex: String = "#FF9800",
    val currency: String = "USD",
    val isEiamV3: Boolean = false
)
