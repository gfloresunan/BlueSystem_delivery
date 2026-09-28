package com.example.eiam.domain.model

/**
 * EIAM — EiamRole
 * Enum unificado y canónico de todos los roles de la plataforma.
 * Reemplaza internamente la triple redundancia: userType / role / rol.
 * Compatible hacia atrás mediante LegacyRoleAdapter.
 *
 * Jerarquía (mayor = más permisos):
 * SUPER_ADMIN(10) > ADMIN(9) > AUDITOR(8) > SUPPORT(7) >
 * OWNER(6) > MANAGER(5) > SUPERVISOR(4) > CASHIER(3) > COOK(3) >
 * DRIVER(2) > CLIENT(1) > GUEST(0)
 */
enum class EiamRole(val level: Int, val displayName: String) {
    // Roles de plataforma BlueSystem
    SUPER_ADMIN(10, "Super Administrador"),
    ADMIN(9,       "Administrador"),
    AUDITOR(8,     "Auditor"),
    SUPPORT(7,     "Soporte"),

    // Roles de comercio
    OWNER(6,       "Propietario"),
    MANAGER(5,     "Gerente"),
    SUPERVISOR(4,  "Supervisor"),
    CASHIER(3,     "Cajero"),
    COOK(3,        "Cocinero"),

    // Roles externos
    DRIVER(2,      "Motorizado"),
    CLIENT(1,      "Cliente"),
    GUEST(0,       "Invitado");

    fun isAtLeast(other: EiamRole): Boolean = this.level >= other.level
    fun isPlatformAdmin(): Boolean = this.level >= ADMIN.level
    fun isBusinessStaff(): Boolean = this in setOf(OWNER, MANAGER, SUPERVISOR, CASHIER, COOK)
    fun isBusinessAdmin(): Boolean = this in setOf(OWNER, MANAGER)

    @Deprecated(
        message = "Use isBusinessStaff() instead. isBusinessRole() was introduced for backward " +
                  "compatibility during EIAM refactor and will be removed in a future sprint.",
        replaceWith = ReplaceWith("isBusinessStaff()")
    )
    fun isBusinessRole(): Boolean = isBusinessStaff()
}
