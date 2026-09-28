package com.example.eiam.data.adapter

import com.example.domain.engine.order.UserRole
import com.example.enterprise.policy.IPolicyEngine
import com.example.enterprise.policy.PolicyAction
import com.example.eiam.domain.engine.PermissionEngine
import com.example.eiam.domain.model.EiamAction
import com.example.eiam.domain.model.EiamRole

/**
 * EIAM — PolicyEngineAdapter
 * Conecta el IPolicyEngine legacy con el nuevo PermissionEngine v2.0.
 * Permite que los módulos frozen continúen usando IPolicyEngine sin cambios,
 * mientras internamente se evalúa contra PermissionEngine.
 *
 * NUNCA modifica PolicyEngineImpl.kt ni IPolicyEngine.
 */
class PolicyEngineAdapter : IPolicyEngine {

    override fun evaluatePolicy(action: PolicyAction, role: UserRole): Boolean {
        val eiamAction = action.toEiamAction() ?: return false
        val eiamRole = role.toEiamRole()
        return PermissionEngine.evaluate(eiamAction, eiamRole)
    }

    // ─── Mapeo PolicyAction → EiamAction ──────────────────────────────────
    private fun PolicyAction.toEiamAction(): EiamAction? =
        when (this) {
            PolicyAction.PUBLISH_MENU        -> EiamAction.PUBLISH_MENU
            PolicyAction.CREATE_PROMOTION    -> EiamAction.CREATE_PROMOTION
            PolicyAction.EXECUTE_ROLLBACK    -> EiamAction.EXECUTE_ROLLBACK
            PolicyAction.OPEN_RESTAURANT     -> EiamAction.OPEN_RESTAURANT
            PolicyAction.CLOSE_CASH_REGISTER -> EiamAction.CLOSE_CASH_REGISTER
            PolicyAction.ASSIGN_DRIVER       -> EiamAction.ASSIGN_DRIVER
        }

    // ─── Mapeo UserRole → EiamRole ─────────────────────────────────────────
    private fun UserRole.toEiamRole(): EiamRole =
        when (this) {
            UserRole.CLIENT     -> EiamRole.CLIENT
            UserRole.COOK       -> EiamRole.COOK
            UserRole.CASHIER    -> EiamRole.CASHIER
            UserRole.SUPERVISOR -> EiamRole.SUPERVISOR
            UserRole.OWNER      -> EiamRole.OWNER
            UserRole.ADMIN      -> EiamRole.ADMIN
        }
}
