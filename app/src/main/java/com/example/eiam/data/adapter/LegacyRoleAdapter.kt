package com.example.eiam.data.adapter

import com.example.eiam.domain.model.EiamRole

/**
 * EIAM — LegacyRoleAdapter
 * Convierte los strings de rol legados (userType / role / rol) al enum EiamRole canónico.
 * Garantiza compatibilidad hacia atrás sin modificar ningún archivo existente.
 *
 * Resuelve la triple redundancia del sistema actual:
 *   "customer"  | "cliente"  → CLIENT
 *   "business"  | "comercio" | "merchant" | "owner" → OWNER
 *   "driver"    | "motorizado" | "courier" → DRIVER
 *   "admin"     → ADMIN
 *   "cook"      | "cocinero" → COOK
 *   "cashier"   | "cajero"   → CASHIER
 *   "supervisor"             → SUPERVISOR
 *   "manager"   | "gerente"  → MANAGER
 *   null | ""   | "guest"    → GUEST
 */
object LegacyRoleAdapter {

    /**
     * Convierte cualquier string de rol legacy a EiamRole.
     * Insensible a mayúsculas/minúsculas.
     */
    fun toEiamRole(raw: String?): EiamRole =
        when (raw?.lowercase()?.trim()) {
            // Plataforma
            "super_admin", "superadmin"                -> EiamRole.SUPER_ADMIN
            "admin", "administrator"                   -> EiamRole.ADMIN
            "auditor"                                  -> EiamRole.AUDITOR
            "support", "soporte"                       -> EiamRole.SUPPORT

            // Comercio
            "owner", "business", "comercio", "merchant",
            "negocio", "empresa", "propietario",
            "business_owner", "merchant_owner"         -> EiamRole.OWNER
            "manager", "gerente"                       -> EiamRole.MANAGER
            "supervisor"                               -> EiamRole.SUPERVISOR
            "cashier", "cajero", "caja"                -> EiamRole.CASHIER
            "cook", "cocinero", "kitchen", "cocina"    -> EiamRole.COOK

            // Externos
            "driver", "motorizado", "courier",
            "repartidor", "deliverer"                  -> EiamRole.DRIVER
            "client", "customer", "cliente",
            "user", "usuario"                          -> EiamRole.CLIENT

            // Default: guest
            null, "", "guest", "invitado", "anonymous" -> EiamRole.GUEST

            else                                       -> EiamRole.GUEST // Fail-closed default
        }

    /**
     * Convierte EiamRole al string legacy que espera Firestore y los módulos existentes.
     * Mantiene compatibilidad con el sistema actual sin romper nada.
     */
    fun toLegacyString(role: EiamRole): String =
        when (role) {
            EiamRole.SUPER_ADMIN -> "admin"
            EiamRole.ADMIN       -> "admin"
            EiamRole.AUDITOR     -> "admin"
            EiamRole.SUPPORT     -> "admin"
            EiamRole.OWNER       -> "business"
            EiamRole.MANAGER     -> "business"
            EiamRole.SUPERVISOR  -> "business"
            EiamRole.CASHIER     -> "business"
            EiamRole.COOK        -> "business"
            EiamRole.DRIVER      -> "driver"
            EiamRole.CLIENT      -> "customer"
            EiamRole.GUEST       -> "customer"
        }

    /**
     * Determina el userType legacy (para routing en SplashViewModel).
     */
    fun toLegacyUserType(role: EiamRole): String =
        when (role) {
            EiamRole.SUPER_ADMIN, EiamRole.ADMIN,
            EiamRole.AUDITOR, EiamRole.SUPPORT     -> "admin"
            EiamRole.OWNER, EiamRole.MANAGER,
            EiamRole.SUPERVISOR, EiamRole.CASHIER,
            EiamRole.COOK                          -> "business"
            EiamRole.DRIVER                        -> "driver"
            EiamRole.CLIENT, EiamRole.GUEST        -> "customer"
        }
}

/** Extension function para uso idiomático en Kotlin */
fun String?.toEiamRole(): EiamRole = LegacyRoleAdapter.toEiamRole(this)
