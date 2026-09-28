package com.example.eiam.domain.engine

import com.example.eiam.domain.model.EiamAction
import com.example.eiam.domain.model.EiamRole
import com.example.eiam.domain.model.ActionDomain

/**
 * EIAM — PermissionEngine v2.0
 * Evalúa permisos para 100+ EiamActions sobre 12 EiamRoles.
 * Reemplaza PolicyEngineImpl (que solo cubre 6 acciones).
 *
 * Compatibilidad garantizada mediante PolicyEngineAdapter.
 * NO modifica PolicyEngineImpl.kt existente.
 */
object PermissionEngine {

    /**
     * Evalúa si un rol puede ejecutar una acción.
     */
    fun evaluate(action: EiamAction, role: EiamRole): Boolean =
        role in permissionMatrix.getOrDefault(action, emptySet())

    fun hasPermission(
        userRole: EiamRole,
        action: EiamAction,
        userBusinessId: String? = null,
        targetBusinessId: String? = null
    ): Boolean {
        if (targetBusinessId != null && userBusinessId != null && userBusinessId != targetBusinessId) {
            if (!userRole.isPlatformAdmin()) return false
        }
        return evaluate(action, userRole)
    }

    /**
     * Devuelve todas las acciones permitidas para un rol.
     */
    fun getPermissions(role: EiamRole): List<EiamAction> =
        permissionMatrix.entries
            .filter { role in it.value }
            .map { it.key }

    /**
     * Verifica si un rol tiene acceso a alguna acción de un dominio.
     */
    fun hasAnyDomainPermission(role: EiamRole, domain: ActionDomain): Boolean =
        EiamAction.values()
            .filter { it.domain == domain }
            .any { evaluate(it, role) }

    // ─── MATRIZ DE PERMISOS COMPLETA ───────────────────────────────────────

    private val permissionMatrix: Map<EiamAction, Set<EiamRole>> = buildMap {

        // ─── PLATAFORMA — Solo ADMIN+ ──────────────────────────────────────
        val platformAdmins = setOf(
            EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.AUDITOR, EiamRole.SUPPORT
        )
        val superAndAdmin = setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN)

        put(EiamAction.MANAGE_ALL_BUSINESSES, superAndAdmin)
        put(EiamAction.MANAGE_ALL_USERS, superAndAdmin)
        put(EiamAction.ASSIGN_PLATFORM_ROLE, superAndAdmin)
        put(EiamAction.MANAGE_CUSTOM_CLAIMS, superAndAdmin)
        put(EiamAction.MANAGE_FEATURE_FLAGS, superAndAdmin)
        put(EiamAction.MANAGE_TENANTS, superAndAdmin)
        put(EiamAction.IMPERSONATE_USER, setOf(EiamRole.SUPER_ADMIN, EiamRole.SUPPORT))
        put(EiamAction.VIEW_AUDIT_LOGS, platformAdmins)
        put(EiamAction.VIEW_PLATFORM_ANALYTICS, platformAdmins)
        put(EiamAction.VIEW_SYSTEM_HEALTH, platformAdmins + EiamRole.OWNER)

        // ─── NEGOCIO — OWNER + Admins ──────────────────────────────────────
        val businessAdmins = setOf(
            EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER, EiamRole.MANAGER
        )
        put(EiamAction.CREATE_BRANCH,       businessAdmins)
        put(EiamAction.EDIT_BRANCH,         businessAdmins)
        put(EiamAction.CLOSE_BRANCH,        setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER))
        put(EiamAction.TRANSFER_BUSINESS,   setOf(EiamRole.SUPER_ADMIN, EiamRole.OWNER))
        put(EiamAction.MANAGE_MEMBERSHIPS,  businessAdmins)

        // ─── PERSONAL / EMPLEADOS ──────────────────────────────────────────
        put(EiamAction.VIEW_EMPLOYEES,      businessAdmins + EiamRole.SUPERVISOR)
        put(EiamAction.INVITE_EMPLOYEE,     businessAdmins)
        put(EiamAction.EDIT_EMPLOYEE,       businessAdmins)
        put(EiamAction.SUSPEND_EMPLOYEE,    businessAdmins)
        put(EiamAction.REACTIVATE_EMPLOYEE, businessAdmins)
        put(EiamAction.REMOVE_EMPLOYEE,     setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER))
        put(EiamAction.CHANGE_EMPLOYEE_ROLE,businessAdmins)
        put(EiamAction.MOVE_EMPLOYEE_BRANCH,businessAdmins)
        put(EiamAction.VIEW_EMPLOYEE_ACTIVITY,businessAdmins + EiamRole.SUPERVISOR)

        // ─── MENÚ ──────────────────────────────────────────────────────────
        val menuManagers = setOf(
            EiamRole.SUPER_ADMIN, EiamRole.ADMIN,
            EiamRole.OWNER, EiamRole.MANAGER, EiamRole.SUPERVISOR
        )
        put(EiamAction.CREATE_PRODUCT,    businessAdmins)
        put(EiamAction.EDIT_PRODUCT,      businessAdmins)
        put(EiamAction.DELETE_PRODUCT,    setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER, EiamRole.MANAGER))
        put(EiamAction.EDIT_PRICE,        businessAdmins)
        put(EiamAction.PUBLISH_MENU,      menuManagers)
        put(EiamAction.UNPUBLISH_MENU,    menuManagers)
        put(EiamAction.MANAGE_CATEGORIES, businessAdmins)
        put(EiamAction.MANAGE_VARIANTS,   businessAdmins)
        put(EiamAction.MANAGE_EXTRAS,     businessAdmins)
        put(EiamAction.MANAGE_COMBOS,     businessAdmins)
        put(EiamAction.TOGGLE_PRODUCT_STOCK, menuManagers + EiamRole.CASHIER)
        put(EiamAction.VIEW_MENU_ANALYTICS,  menuManagers)

        // ─── PEDIDOS ───────────────────────────────────────────────────────
        val orderOperators = setOf(
            EiamRole.SUPER_ADMIN, EiamRole.ADMIN,
            EiamRole.OWNER, EiamRole.MANAGER,
            EiamRole.SUPERVISOR, EiamRole.CASHIER
        )
        put(EiamAction.VIEW_ORDERS,         orderOperators)
        put(EiamAction.VIEW_ORDER_DETAIL,   orderOperators)
        put(EiamAction.CONFIRM_ORDER,       orderOperators)
        put(EiamAction.CANCEL_ORDER,        orderOperators)
        put(EiamAction.REFUND_ORDER,        setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER, EiamRole.MANAGER, EiamRole.SUPERVISOR))
        put(EiamAction.ASSIGN_DRIVER,       orderOperators)
        put(EiamAction.REASSIGN_DRIVER,     setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER, EiamRole.MANAGER, EiamRole.SUPERVISOR))
        put(EiamAction.REJECT_ORDER,        orderOperators)
        put(EiamAction.UPDATE_ORDER_STATUS, orderOperators + EiamRole.COOK)
        put(EiamAction.CREATE_INCIDENT,     orderOperators)
        put(EiamAction.RESOLVE_INCIDENT,    setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER, EiamRole.MANAGER, EiamRole.SUPERVISOR))

        // ─── COCINA / KDS ──────────────────────────────────────────────────
        val kitchenStaff = setOf(
            EiamRole.SUPER_ADMIN, EiamRole.ADMIN,
            EiamRole.OWNER, EiamRole.MANAGER,
            EiamRole.SUPERVISOR, EiamRole.COOK
        )
        put(EiamAction.VIEW_KDS,            kitchenStaff + EiamRole.CASHIER)
        put(EiamAction.UPDATE_KDS_STATUS,   kitchenStaff)
        put(EiamAction.MANAGE_KDS_STATIONS, businessAdmins)
        put(EiamAction.VIEW_KITCHEN_ANALYTICS, businessAdmins + EiamRole.SUPERVISOR)

        // ─── FINANZAS ──────────────────────────────────────────────────────
        val financeViewers = setOf(
            EiamRole.SUPER_ADMIN, EiamRole.ADMIN,
            EiamRole.AUDITOR, EiamRole.OWNER, EiamRole.MANAGER
        )
        put(EiamAction.VIEW_FINANCE,        financeViewers)
        put(EiamAction.VIEW_DAILY_SUMMARY,  financeViewers + EiamRole.SUPERVISOR)
        put(EiamAction.VIEW_COMMISSIONS,    financeViewers)
        put(EiamAction.VIEW_SETTLEMENTS,    financeViewers)
        put(EiamAction.VIEW_TIPS,           financeViewers + EiamRole.CASHIER)
        put(EiamAction.VIEW_TOP_PRODUCTS,   financeViewers + EiamRole.SUPERVISOR)
        put(EiamAction.EXPORT_REPORT,       financeViewers)
        put(EiamAction.EXPORT_PDF,          financeViewers)
        put(EiamAction.EXPORT_EXCEL,        setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER, EiamRole.MANAGER))
        put(EiamAction.VIEW_FINANCIAL_INSIGHTS, financeViewers)
        put(EiamAction.SET_SALES_GOAL,      businessAdmins)

        // ─── DELIVERY ──────────────────────────────────────────────────────
        val deliveryOps = orderOperators
        put(EiamAction.VIEW_CONTROL_TOWER,    deliveryOps)
        put(EiamAction.VIEW_FLEET_MAP,        deliveryOps)
        put(EiamAction.VIEW_DRIVER_ETA,       deliveryOps)
        put(EiamAction.MANAGE_DELIVERY_ZONES, businessAdmins)
        put(EiamAction.VIEW_DELIVERY_ALERTS,  deliveryOps)

        // ─── ANALÍTICA ─────────────────────────────────────────────────────
        val analyticsViewers = financeViewers + EiamRole.SUPERVISOR
        put(EiamAction.VIEW_ANALYTICS,       analyticsViewers)
        put(EiamAction.VIEW_SALES_CHART,     analyticsViewers)
        put(EiamAction.VIEW_CUSTOMER_INSIGHTS, financeViewers)
        put(EiamAction.VIEW_PRODUCT_RANKING,  analyticsViewers)
        put(EiamAction.VIEW_HOURLY_REPORT,    analyticsViewers)
        put(EiamAction.COMPARE_PERIODS,       financeViewers)

        // ─── CONFIGURACIÓN ─────────────────────────────────────────────────
        put(EiamAction.EDIT_SETTINGS,         businessAdmins)
        put(EiamAction.EDIT_BUSINESS_INFO,    setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER))
        put(EiamAction.EDIT_BRANCH_INFO,      businessAdmins)
        put(EiamAction.MANAGE_SCHEDULE,       businessAdmins + EiamRole.SUPERVISOR)
        put(EiamAction.MANAGE_DELIVERY_CONFIG,businessAdmins)
        put(EiamAction.MANAGE_PAYMENT_METHODS,businessAdmins)
        put(EiamAction.MANAGE_TAXES,          setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER))
        put(EiamAction.MANAGE_NOTIFICATIONS,  businessAdmins + EiamRole.SUPERVISOR)
        put(EiamAction.MANAGE_BRANDING,       setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER))
        put(EiamAction.MANAGE_SECURITY_CONFIG,setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER))
        put(EiamAction.VIEW_READINESS_SCORE,  businessAdmins + EiamRole.SUPERVISOR)

        // ─── PROMOCIONES ───────────────────────────────────────────────────
        put(EiamAction.CREATE_PROMOTION,     businessAdmins)
        put(EiamAction.EDIT_PROMOTION,       businessAdmins)
        put(EiamAction.DELETE_PROMOTION,     setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER))
        put(EiamAction.ACTIVATE_PROMOTION,   businessAdmins + EiamRole.SUPERVISOR)
        put(EiamAction.MANAGE_COUPONS,       businessAdmins)
        put(EiamAction.VIEW_PROMO_ANALYTICS, businessAdmins + EiamRole.SUPERVISOR)

        // ─── CLIENTES ──────────────────────────────────────────────────────
        put(EiamAction.VIEW_CUSTOMERS,       businessAdmins + EiamRole.SUPERVISOR)
        put(EiamAction.VIEW_CUSTOMER_DETAIL, businessAdmins + EiamRole.SUPERVISOR)
        put(EiamAction.MANAGE_VIP_PROGRAM,   businessAdmins)
        put(EiamAction.BLOCK_CUSTOMER,       setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER))
        put(EiamAction.VIEW_CUSTOMER_ORDERS, businessAdmins + EiamRole.SUPERVISOR + EiamRole.CASHIER)

        // ─── MOTORIZADOS ───────────────────────────────────────────────────
        put(EiamAction.VIEW_DRIVERS,         businessAdmins + EiamRole.SUPERVISOR)
        put(EiamAction.VERIFY_DRIVER,        superAndAdmin)
        put(EiamAction.SUSPEND_DRIVER,       superAndAdmin)
        put(EiamAction.MANAGE_DRIVER_DOCS,   superAndAdmin)

        // ─── OPERACIONES ───────────────────────────────────────────────────
        put(EiamAction.OPEN_RESTAURANT,      orderOperators)
        put(EiamAction.CLOSE_CASH_REGISTER,  orderOperators)
        put(EiamAction.EXECUTE_ROLLBACK,     setOf(EiamRole.SUPER_ADMIN, EiamRole.ADMIN, EiamRole.OWNER, EiamRole.MANAGER))
    }
}
