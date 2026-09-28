package com.example.eiam.security.claims

import com.example.eiam.domain.model.EiamRole

/**
 * EIAM — ClaimsValidator (FASE 9)
 * Validador estático de consistencia de Custom Claims.
 */
object ClaimsValidator {

    /**
     * Valida si la combinación de Claims es coherente para un tenant y rol.
     */
    fun validateClaims(claims: EiamClaims): Boolean {
        if (claims.uid.isBlank()) return false

        // Los clientes y guests no requieren businessId obligatoriamente
        if (claims.role == EiamRole.CLIENT || claims.role == EiamRole.GUEST) {
            return true
        }

        // Si es un rol de comercio, businessId no debe estar vacío
        if (claims.role.isBusinessRole()) {
            return !claims.businessId.isNull_or_blank()
        }

        // Si es rol de plataforma, es válido
        if (claims.role.isPlatformAdmin()) {
            return true
        }

        return true
    }

    private fun String?.isNull_or_blank(): Boolean {
        return this == null || this.trim().isEmpty()
    }
}
