package com.example.domain.model.identity

import androidx.annotation.Keep

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.7)
 * Contratos de Preparación para Particionado de Base de Datos Room (Microfase 2C.7-H).
 * 
 * 🔒 REGLA DE SEGURIDAD ABSOLUTA:
 * Estos contratos son puras interfaces de dominio para futura integración.
 * Queda PROHIBIDO en esta fase modificar OfflineOrderEntity, DAOs existentes,
 * versiones de base de datos o ejecutar migraciones destructivas de Room.
 */

@Keep
interface TenantScopedRecord {
    val tenantId: String
}

@Keep
interface TenantPartitionKey {
    val partitionKey: String
}

@Keep
interface TenantContextProvider {
    fun getActiveTenantId(): String?
    fun getActiveBrandId(): String?
    fun isTenantPartitioningActive(): Boolean
}
