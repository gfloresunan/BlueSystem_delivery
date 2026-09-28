package com.example.data.auth

import android.util.Log
import com.example.domain.model.Permission
import com.example.domain.model.UserProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Gestor centralizado del Sistema RBAC Empresarial con 10 Roles Oficiales.
 * Separa por completo la gestión de sesión de la autorización mediante permisos granulares.
 */
object PermissionManager {

    private val _permissions = MutableStateFlow<Set<Permission>>(emptySet())
    val permissions: StateFlow<Set<Permission>> = _permissions.asStateFlow()

    // 1. GUEST (Navegación pública únicamente)
    private val GUEST_PERMISSIONS = setOf(
        Permission.CAN_BROWSE_CATALOG,
        Permission.CAN_VIEW_PRODUCTS
    )

    // 2. CUSTOMER (Cliente Comprador)
    private val CUSTOMER_PERMISSIONS = setOf(
        Permission.CAN_BROWSE_CATALOG,
        Permission.CAN_VIEW_PRODUCTS,
        Permission.CAN_CREATE_ORDER,
        Permission.CAN_CANCEL_ORDER,
        Permission.CAN_VIEW_ORDER,
        Permission.CAN_TRACK_COURIER,
        Permission.CAN_VIEW_PAYMENTS
    )

    // 3. COURIER (Motorizado)
    private val COURIER_PERMISSIONS = setOf(
        Permission.CAN_VIEW_ORDER,
        Permission.CAN_ACCEPT_ORDER,
        Permission.CAN_REJECT_ORDER,
        Permission.CAN_COMPLETE_ORDER,
        Permission.CAN_TRACK_COURIER
    )

    // 4. BUSINESS (Comercio)
    private val BUSINESS_PERMISSIONS = setOf(
        Permission.CAN_VIEW_ORDER,
        Permission.CAN_VIEW_PRODUCTS,
        Permission.CAN_CREATE_PRODUCT,
        Permission.CAN_EDIT_PRODUCT,
        Permission.CAN_DELETE_PRODUCT,
        Permission.CAN_VIEW_INVENTORY,
        Permission.CAN_EDIT_INVENTORY,
        Permission.CAN_MANAGE_INVENTORY,
        Permission.CAN_VIEW_PAYMENTS
    )

    // 5. SUPPORT (Soporte)
    private val SUPPORT_PERMISSIONS = setOf(
        Permission.CAN_VIEW_ORDER,
        Permission.CAN_VIEW_PRODUCTS,
        Permission.CAN_VIEW_USERS,
        Permission.CAN_TRACK_COURIER,
        Permission.CAN_VIEW_PAYMENTS,
        Permission.CAN_PROCESS_REFUNDS
    )

    // 6. OPERATOR (Operador Logístico)
    private val OPERATOR_PERMISSIONS = setOf(
        Permission.CAN_VIEW_ORDER,
        Permission.CAN_ASSIGN_ORDER,
        Permission.CAN_TRACK_COURIER,
        Permission.CAN_VIEW_INVENTORY,
        Permission.CAN_VIEW_USERS
    )

    // 7. SUPERVISOR (Supervisor Operativo)
    private val SUPERVISOR_PERMISSIONS = setOf(
        Permission.CAN_VIEW_ORDER,
        Permission.CAN_ASSIGN_ORDER,
        Permission.CAN_TRACK_COURIER,
        Permission.CAN_VIEW_INVENTORY,
        Permission.CAN_VIEW_USERS,
        Permission.CAN_APPROVE_BUSINESS,
        Permission.CAN_SUSPEND_BUSINESS,
        Permission.CAN_APPROVE_COURIER,
        Permission.CAN_SUSPEND_COURIER,
        Permission.CAN_VIEW_PAYMENTS,
        Permission.CAN_VIEW_FINANCIAL_REPORTS,
        Permission.CAN_VIEW_AUDIT
    )

    // 8. AUDITOR (Solo Lectura)
    private val AUDITOR_PERMISSIONS = setOf(
        Permission.CAN_VIEW_ORDER,
        Permission.CAN_VIEW_PRODUCTS,
        Permission.CAN_VIEW_INVENTORY,
        Permission.CAN_VIEW_USERS,
        Permission.CAN_VIEW_PAYMENTS,
        Permission.CAN_VIEW_FINANCIAL_REPORTS,
        Permission.CAN_VIEW_AUDIT,
        Permission.CAN_EXPORT_AUDIT
    )

    // 9. ADMIN (Administrador General excepto gestión de Firebase/Sistema maestro)
    private val ADMIN_PERMISSIONS = Permission.values().toSet() - setOf(
        Permission.CAN_MANAGE_FIREBASE,
        Permission.CAN_MANAGE_SYSTEM
    )

    // 10. SUPER_ADMIN (Propietario / Maestro - Acceso Absoluto)
    private val SUPER_ADMIN_PERMISSIONS = Permission.values().toSet()

    /**
     * Actualiza el conjunto de permisos según el perfil de usuario.
     */
    fun updatePermissionsForUser(profile: UserProfile?) {
        if (profile == null) {
            setGuestPermissions()
            return
        }

        if (profile.isUserBlocked()) {
            Log.w("PERMISSION_MANAGER", "Usuario bloqueado/inactivo. Se revocan todos los permisos. UID: ${profile.uid}")
            _permissions.value = emptySet()
            return
        }

        val effectiveRole = profile.getEffectiveRole()
        updatePermissionsForRole(effectiveRole)
    }

    /**
     * Actualiza el conjunto de permisos mapeando la matriz RBAC de los 10 roles oficiales.
     */
    fun updatePermissionsForRole(role: String, isActive: Boolean = true) {
        if (!isActive) {
            _permissions.value = emptySet()
            return
        }

        val newPermissions = when (role.lowercase().trim()) {
            "super_admin", "superadmin", "propietario" -> SUPER_ADMIN_PERMISSIONS
            "admin", "administrador" -> ADMIN_PERMISSIONS
            "supervisor" -> SUPERVISOR_PERMISSIONS
            "auditor" -> AUDITOR_PERMISSIONS
            "support", "soporte" -> SUPPORT_PERMISSIONS
            "operator", "operador" -> OPERATOR_PERMISSIONS
            "business", "comercio" -> BUSINESS_PERMISSIONS
            "driver", "motorizado", "courier" -> COURIER_PERMISSIONS
            "customer", "cliente" -> CUSTOMER_PERMISSIONS
            "guest", "invitado" -> GUEST_PERMISSIONS
            else -> GUEST_PERMISSIONS
        }

        Log.d("PERMISSION_MANAGER", "Matriz RBAC aplicada para rol '$role': totalPermisos=${newPermissions.size}")
        _permissions.value = newPermissions
    }

    /**
     * Configura permisos de Invitado (Guest).
     */
    fun setGuestPermissions() {
        Log.d("PERMISSION_MANAGER", "Establecidos permisos de GUEST")
        _permissions.value = GUEST_PERMISSIONS
    }

    /**
     * Limpia completamente los permisos activos.
     */
    fun clearPermissions() {
        Log.d("PERMISSION_MANAGER", "Permisos limpiados")
        _permissions.value = emptySet()
    }

    /**
     * Verifica si se cuenta con un permiso específico.
     */
    fun hasPermission(permission: Permission): Boolean {
        return _permissions.value.contains(permission)
    }

    /**
     * Alias para consultar permisos (can).
     */
    fun can(permission: Permission): Boolean = hasPermission(permission)

    /**
     * Valida de forma estricta que se posea el permiso especificado (Fase 10).
     * Si no se posee, registra un evento PERMISSION_DENIED en PermissionAuditLogger y retorna false.
     */
    fun require(permission: Permission, screen: String = "UnknownScreen"): Boolean {
        val granted = hasPermission(permission)
        if (!granted) {
            PermissionAuditLogger.logPermissionDenied(permission.name, screen)
        }
        return granted
    }

    /**
     * Valida que se posea AL MENOS UNO de los permisos indicados (disyunción OR).
     */
    fun requireAny(vararg permissions: Permission, screen: String = "UnknownScreen"): Boolean {
        val granted = permissions.any { hasPermission(it) }
        if (!granted) {
            val names = permissions.joinToString("|") { it.name }
            PermissionAuditLogger.logPermissionDenied(names, screen)
        }
        return granted
    }

    /**
     * Valida que se posean TODOS los permisos indicados (conjunción AND).
     */
    fun requireAll(vararg permissions: Permission, screen: String = "UnknownScreen"): Boolean {
        val missing = permissions.filter { !hasPermission(it) }
        if (missing.isNotEmpty()) {
            val names = missing.joinToString("&") { it.name }
            PermissionAuditLogger.logPermissionDenied(names, screen)
            return false
        }
        return true
    }

    // Getters de conveniencia
    val canCreateOrder: Boolean get() = can(Permission.CAN_CREATE_ORDER)
    val canSeeOrders: Boolean get() = can(Permission.CAN_VIEW_ORDER)
    val canTrackCourier: Boolean get() = can(Permission.CAN_TRACK_COURIER)
    val canManageUsers: Boolean get() = can(Permission.CAN_VIEW_USERS)
    val canViewPayments: Boolean get() = can(Permission.CAN_VIEW_PAYMENTS)
    val canApproveBusiness: Boolean get() = can(Permission.CAN_APPROVE_BUSINESS)
    val canAccessAdminPanel: Boolean get() = requireAny(
        Permission.CAN_VIEW_AUDIT,
        Permission.CAN_VIEW_USERS,
        Permission.CAN_MANAGE_SETTINGS
    )
}
