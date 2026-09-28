package com.example.domain.model.identity

import androidx.annotation.Keep

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.7)
 * Modelo Canónico de Configuración y Branding por Tenant / Brand.
 * 
 * 🔒 REGLA DE SEGURIDAD CRÍTICA:
 * "TenantSettings configura; EIAM autoriza."
 * 
 * TenantSettings controla exclusivamente presentación, branding, colores, moneda y flags operacionales.
 * NUNCA decide roles, permisos ni autorización de seguridad.
 */
@Keep
data class TenantSettings(
    val tenantId: String = "",
    val brandId: String? = null,
    val organizationId: String? = null,
    val businessId: String? = null,
    val branchId: String? = null,
    val displayName: String = "",
    val legalName: String = "",
    val logoUrl: String? = null,
    val primaryColor: String = "#1E88E5",
    val secondaryColor: String = "#0D47A1",
    val accentColor: String = "#FF9800",
    val currency: String = "USD",
    val locale: String = "es-ES",
    val timezone: String = "America/Caracas",
    val features: Map<String, Boolean> = emptyMap(),
    val operationalFlags: Map<String, String> = emptyMap(),
    val version: String = "3.0",
    val updatedAt: Long = System.currentTimeMillis()
) {
    /**
     * Valida que el TenantSettings corresponda a un Tenant no vacío ni ficticio.
     */
    fun isValid(): Boolean {
        if (tenantId.isBlank()) return false
        val tid = tenantId.trim().lowercase()
        return !tid.contains("default") && !tid.contains("tenant_bluesystem_default")
    }

    /**
     * Verifica si una feature visual/operacional está habilitada (solo para UI/UX).
     */
    fun isFeatureEnabled(featureKey: String, defaultValue: Boolean = false): Boolean {
        return features[featureKey] ?: defaultValue
    }
}
