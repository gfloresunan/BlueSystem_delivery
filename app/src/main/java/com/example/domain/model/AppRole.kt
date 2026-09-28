package com.example.domain.model

/**
 * BSD-ROLE-ROUTING-ISOLATION-001
 * Canonical Application Roles for BlueSystem Delivery Enterprise.
 *
 * Single Source of Truth for frontend surface authorization.
 * Strictly isolates:
 * - CUSTOMER -> Customer App surface
 * - MERCHANT -> Merchant Dashboard / Business surface
 * - COURIER -> Courier / Driver surface
 * - ADMIN -> Admin Governance surface
 * - UNKNOWN -> Fail-Closed (No access to protected surfaces)
 */
enum class AppRole(val canonicalName: String) {
    CUSTOMER("customer"),
    MERCHANT("merchant"),
    COURIER("courier"),
    ADMIN("admin"),
    UNKNOWN("unknown");

    fun isCustomer(): Boolean = this == CUSTOMER
    fun isMerchant(): Boolean = this == MERCHANT
    fun isCourier(): Boolean = this == COURIER
    fun isAdmin(): Boolean = this == ADMIN
    fun isKnown(): Boolean = this != UNKNOWN

    companion object {
        /**
         * Normalizes any incoming role, userType, rol, or claim string into a Canonical AppRole.
         * Fails closed: unrecognized or empty strings return UNKNOWN.
         */
        fun fromString(raw: String?): AppRole {
            if (raw.isNullOrBlank()) return UNKNOWN
            return when (raw.lowercase().trim()) {
                // Customer / Consumer aliases
                "customer", "cliente", "client", "user", "usuario", "consumer", "consumidor" -> CUSTOMER

                // Merchant / Commerce aliases
                "merchant", "business", "commerce", "comercio", "owner", "propietario",
                "business_owner", "merchant_owner", "manager", "gerente", "supervisor",
                "cashier", "cajero", "caja", "cook", "cocinero", "cocina", "kitchen",
                "seller", "vendedor", "negocio", "empresa", "restaurante", "restaurant",
                "tienda", "store", "partner", "aliado" -> MERCHANT

                // Courier / Driver aliases
                "courier", "driver", "motorizado", "repartidor", "deliverer",
                "delivery", "chofer", "rider", "mensajero", "conductor" -> COURIER

                // Admin / Platform aliases
                "admin", "administrator", "administrador", "super_admin", "superadmin",
                "platform_admin", "auditor", "support", "soporte", "staff", "operador" -> ADMIN

                // Fail closed for anything else
                else -> UNKNOWN
            }
        }
    }
}
