package com.example.eiam.sdk

import com.example.eiam.domain.engine.PermissionEngine
import com.example.eiam.domain.engine.RoleEngine
import com.example.eiam.domain.model.EiamAction
import com.example.eiam.domain.model.EiamRole

/**
 * EIAM — Facade EiamSdk (FASE 16)
 * Punto de entrada único para consultar identidad, roles y permisos en cualquier módulo de BlueSystem.
 */
object EiamSdk {

    private var currentUidProvider: (() -> String?)? = null
    private var currentRoleProvider: (() -> EiamRole)? = null
    private var currentBusinessIdProvider: (() -> String?)? = null

    fun initialize(
        uidProvider: () -> String?,
        roleProvider: () -> EiamRole,
        businessIdProvider: () -> String?
    ) {
        currentUidProvider = uidProvider
        currentRoleProvider = roleProvider
        currentBusinessIdProvider = businessIdProvider
    }

    fun getCurrentUid(): String? = currentUidProvider?.invoke()
    fun getCurrentRole(): EiamRole = currentRoleProvider?.invoke() ?: EiamRole.GUEST
    fun getCurrentBusinessId(): String? = currentBusinessIdProvider?.invoke()

    fun hasPermission(action: EiamAction, targetBusinessId: String? = null): Boolean {
        val role = getCurrentRole()
        val userBusinessId = getCurrentBusinessId()

        return PermissionEngine.hasPermission(
            userRole = role,
            action = action,
            userBusinessId = userBusinessId,
            targetBusinessId = targetBusinessId
        )
    }

    fun hasRoleAtLeast(minimumRole: EiamRole): Boolean {
        val currentRole = getCurrentRole()
        return RoleEngine.hasMinimumRole(currentRole, minimumRole)
    }
}
