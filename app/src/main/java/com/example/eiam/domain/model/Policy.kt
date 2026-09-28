package com.example.eiam.domain.model

/**
 * EIAM — Policy Model (FASE 1)
 * Define una política de seguridad basada en reglas sobre acciones y recursos.
 */
enum class PolicyEffect {
    ALLOW,
    DENY
}

data class Policy(
    val policyId: String,
    val name: String,
    val description: String,
    val effect: PolicyEffect = PolicyEffect.ALLOW,
    val actions: List<EiamAction> = emptyList(),
    val roles: List<EiamRole> = emptyList(),
    val isEnabled: Boolean = true
)
