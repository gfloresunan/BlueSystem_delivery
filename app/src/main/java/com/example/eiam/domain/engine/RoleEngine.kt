package com.example.eiam.domain.engine

import com.example.eiam.domain.model.EiamRole

/**
 * EIAM — RoleEngine v2.0
 * Motor de roles unificado. Centraliza:
 *   1. Jerarquía de roles
 *   2. Resolución de herencia
 *   3. Comparación de niveles
 *
 * NO modifica ningún archivo existente.
 * El LegacyRoleAdapter convierte strings legados a EiamRole.
 */
object RoleEngine {

    /** Verifica si un rol tiene nivel >= otro (jerarquía) */
    fun isAtLeast(role: EiamRole, minimum: EiamRole): Boolean =
        role.level >= minimum.level

    fun hasMinimumRole(role: EiamRole, minimum: EiamRole): Boolean =
        isAtLeast(role, minimum)

    fun isBusinessRole(role: EiamRole): Boolean =
        isBusinessStaff(role)

    /** Verifica si un rol tiene acceso a módulos de plataforma */
    fun isPlatformAdmin(role: EiamRole): Boolean =
        role.level >= EiamRole.ADMIN.level

    /** Verifica si el rol pertenece al staff de un comercio */
    fun isBusinessStaff(role: EiamRole): Boolean =
        role in setOf(
            EiamRole.OWNER, EiamRole.MANAGER,
            EiamRole.SUPERVISOR, EiamRole.CASHIER, EiamRole.COOK
        )

    /** Verifica si puede gestionar empleados del comercio */
    fun canManageStaff(role: EiamRole): Boolean =
        role in setOf(EiamRole.OWNER, EiamRole.MANAGER)

    /** Verifica si puede ver configuración del restaurante */
    fun canAccessSettings(role: EiamRole): Boolean =
        role in setOf(EiamRole.OWNER, EiamRole.MANAGER, EiamRole.SUPERVISOR)

    /** Devuelve todos los roles que puede asignar un actor */
    fun getAssignableRoles(actorRole: EiamRole): List<EiamRole> =
        when {
            actorRole.isPlatformAdmin() -> EiamRole.values().toList()
            actorRole == EiamRole.OWNER -> listOf(
                EiamRole.MANAGER, EiamRole.SUPERVISOR,
                EiamRole.CASHIER, EiamRole.COOK
            )
            actorRole == EiamRole.MANAGER -> listOf(
                EiamRole.SUPERVISOR, EiamRole.CASHIER, EiamRole.COOK
            )
            else -> emptyList()
        }

    /** Devuelve el nivel numérico del rol */
    fun getLevel(role: EiamRole): Int = role.level

    /** Compara dos roles. Retorna positivo si A > B */
    fun compare(a: EiamRole, b: EiamRole): Int = a.level.compareTo(b.level)
}
