package com.example.enterprise.policy

import com.example.domain.engine.order.UserRole

enum class PolicyAction {
    PUBLISH_MENU,
    CREATE_PROMOTION,
    EXECUTE_ROLLBACK,
    OPEN_RESTAURANT,
    CLOSE_CASH_REGISTER,
    ASSIGN_DRIVER
}

interface IPolicyEngine {
    fun evaluatePolicy(action: PolicyAction, role: UserRole): Boolean
}

/**
 * Servidor Enterprise: PolicyEngineImpl (Pilar 5).
 * Centralizador único de políticas y reglas de permisos de negocio.
 * Evita la duplicación de lógica de autorización entre módulos.
 */
class PolicyEngineImpl : IPolicyEngine {

    override fun evaluatePolicy(action: PolicyAction, role: UserRole): Boolean {
        return when (action) {
            PolicyAction.PUBLISH_MENU -> role in setOf(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
            PolicyAction.CREATE_PROMOTION -> role in setOf(UserRole.OWNER, UserRole.ADMIN)
            PolicyAction.EXECUTE_ROLLBACK -> role in setOf(UserRole.OWNER, UserRole.ADMIN)
            PolicyAction.OPEN_RESTAURANT -> role in setOf(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.OWNER, UserRole.ADMIN)
            PolicyAction.CLOSE_CASH_REGISTER -> role in setOf(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.OWNER, UserRole.ADMIN)
            PolicyAction.ASSIGN_DRIVER -> role in setOf(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
        }
    }
}
