package com.example.domain.model.identity

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Auth Safety Gate en Kotlin.
 */

class AuthMutationBlockedException(message: String) : RuntimeException("[AUTH_SAFETY_GATE_BLOCKED] $message")

interface AuthClaimsMutationGateway {
    suspend fun setCustomUserClaims(uid: String, claims: Map<String, Any?>)
    fun isMutationPermitted(): Boolean
    fun getAttemptedMutationsCount(): Int
}

class DisabledAuthClaimsMutationGateway : AuthClaimsMutationGateway {
    private var attemptedMutations = 0

    override suspend fun setCustomUserClaims(uid: String, claims: Map<String, Any?>) {
        attemptedMutations++
        throw AuthMutationBlockedException("Llamada a setCustomUserClaims para UID '$uid' bloqueada por seguridad.")
    }

    override fun isMutationPermitted(): Boolean = false

    override fun getAttemptedMutationsCount(): Int = attemptedMutations
}

object AuthSafetyGate {
    private val instance: AuthClaimsMutationGateway = DisabledAuthClaimsMutationGateway()

    fun getGateway(): AuthClaimsMutationGateway = instance

    fun isMutationPermitted(): Boolean = false
}
