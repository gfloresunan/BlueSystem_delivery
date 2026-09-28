package com.example.domain.model.identity

import androidx.annotation.Keep

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.7)
 * Bridge de Resolución de Membresías y Contextos para Android.
 * 
 * Orquesta la interacción entre el resolver dual-read y los modelos de dominio.
 */
@Keep
class AndroidEiamMembershipBridge(
    private val resolver: DualReadMembershipResolver,
    private val contextManager: ActiveTenantContextManager = ActiveTenantContextManager()
) {

    /**
     * Resuelve y cambia el contexto activo para el usuario.
     */
    suspend fun switchActiveTenant(
        callerUid: String,
        targetMembershipId: String,
        settingsProvider: (suspend (String) -> TenantSettings?)? = null
    ): Result<ActiveTenantContext> {
        return contextManager.switchContext(callerUid, targetMembershipId, resolver, settingsProvider)
    }

    /**
     * Obtiene el gestor de estado de contexto activo.
     */
    fun getContextManager(): ActiveTenantContextManager = contextManager

    /**
     * Retorna si el sistema se encuentra operando bajo contexto EIAM v3.
     */
    fun hasActiveTenant(): Boolean = contextManager.isEiamV3Active()
}
