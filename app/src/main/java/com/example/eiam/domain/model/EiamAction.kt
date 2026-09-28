package com.example.eiam.domain.model

/**
 * EIAM — EiamAction
 * 100+ acciones granulares organizadas por dominio.
 * Usadas por PermissionEngine para evaluación de permisos.
 */
enum class EiamAction(val domain: ActionDomain, val description: String) {

    // ─── MENÚ ──────────────────────────────────────────────────────────────
    CREATE_PRODUCT         (ActionDomain.MENU,     "Crear producto"),
    EDIT_PRODUCT           (ActionDomain.MENU,     "Editar producto"),
    DELETE_PRODUCT         (ActionDomain.MENU,     "Eliminar producto"),
    EDIT_PRICE             (ActionDomain.MENU,     "Editar precio de producto"),
    PUBLISH_MENU           (ActionDomain.MENU,     "Publicar menú"),
    UNPUBLISH_MENU         (ActionDomain.MENU,     "Despublicar menú"),
    MANAGE_CATEGORIES      (ActionDomain.MENU,     "Gestionar categorías"),
    MANAGE_VARIANTS        (ActionDomain.MENU,     "Gestionar variantes"),
    MANAGE_EXTRAS          (ActionDomain.MENU,     "Gestionar extras / modificadores"),
    MANAGE_COMBOS          (ActionDomain.MENU,     "Gestionar combos"),
    TOGGLE_PRODUCT_STOCK   (ActionDomain.MENU,     "Activar/desactivar stock"),
    VIEW_MENU_ANALYTICS    (ActionDomain.MENU,     "Ver analítica de menú"),

    // ─── PEDIDOS ───────────────────────────────────────────────────────────
    VIEW_ORDERS            (ActionDomain.ORDERS,   "Ver pedidos"),
    CONFIRM_ORDER          (ActionDomain.ORDERS,   "Confirmar pedido"),
    CANCEL_ORDER           (ActionDomain.ORDERS,   "Cancelar pedido"),
    REFUND_ORDER           (ActionDomain.ORDERS,   "Reembolsar pedido"),
    ASSIGN_DRIVER          (ActionDomain.ORDERS,   "Asignar motorizado"),
    REJECT_ORDER           (ActionDomain.ORDERS,   "Rechazar pedido"),
    UPDATE_ORDER_STATUS    (ActionDomain.ORDERS,   "Actualizar estado de pedido"),
    VIEW_ORDER_DETAIL      (ActionDomain.ORDERS,   "Ver detalle de pedido"),
    CREATE_INCIDENT        (ActionDomain.ORDERS,   "Crear incidencia en pedido"),
    RESOLVE_INCIDENT       (ActionDomain.ORDERS,   "Resolver incidencia"),

    // ─── COCINA / KDS ──────────────────────────────────────────────────────
    VIEW_KDS               (ActionDomain.KITCHEN,  "Ver Kitchen Display System"),
    UPDATE_KDS_STATUS      (ActionDomain.KITCHEN,  "Actualizar estado KDS"),
    MANAGE_KDS_STATIONS    (ActionDomain.KITCHEN,  "Gestionar estaciones KDS"),
    VIEW_KITCHEN_ANALYTICS (ActionDomain.KITCHEN,  "Ver analítica de cocina"),

    // ─── FINANZAS ──────────────────────────────────────────────────────────
    VIEW_FINANCE           (ActionDomain.FINANCE,  "Ver finanzas"),
    VIEW_DAILY_SUMMARY     (ActionDomain.FINANCE,  "Ver resumen diario"),
    VIEW_COMMISSIONS       (ActionDomain.FINANCE,  "Ver comisiones"),
    VIEW_SETTLEMENTS       (ActionDomain.FINANCE,  "Ver liquidaciones"),
    VIEW_TIPS              (ActionDomain.FINANCE,  "Ver propinas"),
    VIEW_TOP_PRODUCTS      (ActionDomain.FINANCE,  "Ver productos top"),
    EXPORT_REPORT          (ActionDomain.FINANCE,  "Exportar reporte"),
    EXPORT_PDF             (ActionDomain.FINANCE,  "Exportar PDF"),
    EXPORT_EXCEL           (ActionDomain.FINANCE,  "Exportar Excel"),
    VIEW_FINANCIAL_INSIGHTS(ActionDomain.FINANCE,  "Ver insights financieros"),
    SET_SALES_GOAL         (ActionDomain.FINANCE,  "Establecer meta de ventas"),

    // ─── DELIVERY / FLOTA ──────────────────────────────────────────────────
    VIEW_CONTROL_TOWER     (ActionDomain.DELIVERY, "Ver torre de control"),
    VIEW_FLEET_MAP         (ActionDomain.DELIVERY, "Ver mapa de flota"),
    VIEW_DRIVER_ETA        (ActionDomain.DELIVERY, "Ver ETA de motorizado"),
    MANAGE_DELIVERY_ZONES  (ActionDomain.DELIVERY, "Gestionar zonas de delivery"),
    VIEW_DELIVERY_ALERTS   (ActionDomain.DELIVERY, "Ver alertas de delivery"),
    REASSIGN_DRIVER        (ActionDomain.DELIVERY, "Reasignar motorizado"),

    // ─── ANALÍTICA ─────────────────────────────────────────────────────────
    VIEW_ANALYTICS         (ActionDomain.ANALYTICS,"Ver analítica general"),
    VIEW_SALES_CHART       (ActionDomain.ANALYTICS,"Ver gráfica de ventas"),
    VIEW_CUSTOMER_INSIGHTS (ActionDomain.ANALYTICS,"Ver insights de clientes"),
    VIEW_PRODUCT_RANKING   (ActionDomain.ANALYTICS,"Ver ranking de productos"),
    VIEW_HOURLY_REPORT     (ActionDomain.ANALYTICS,"Ver reporte por hora"),
    COMPARE_PERIODS        (ActionDomain.ANALYTICS,"Comparar períodos"),

    // ─── CONFIGURACIÓN ─────────────────────────────────────────────────────
    EDIT_SETTINGS          (ActionDomain.SETTINGS, "Editar configuración del restaurante"),
    EDIT_BUSINESS_INFO     (ActionDomain.SETTINGS, "Editar información del negocio"),
    EDIT_BRANCH_INFO       (ActionDomain.SETTINGS, "Editar información de sucursal"),
    MANAGE_SCHEDULE        (ActionDomain.SETTINGS, "Gestionar horario de atención"),
    MANAGE_DELIVERY_CONFIG (ActionDomain.SETTINGS, "Gestionar configuración de delivery"),
    MANAGE_PAYMENT_METHODS (ActionDomain.SETTINGS, "Gestionar métodos de pago"),
    MANAGE_TAXES           (ActionDomain.SETTINGS, "Gestionar impuestos"),
    MANAGE_NOTIFICATIONS   (ActionDomain.SETTINGS, "Gestionar notificaciones"),
    MANAGE_BRANDING        (ActionDomain.SETTINGS, "Gestionar branding"),
    MANAGE_SECURITY_CONFIG (ActionDomain.SETTINGS, "Gestionar configuración de seguridad"),
    VIEW_READINESS_SCORE   (ActionDomain.SETTINGS, "Ver Restaurant Readiness Score"),

    // ─── PROMOCIONES ───────────────────────────────────────────────────────
    CREATE_PROMOTION       (ActionDomain.PROMO,    "Crear promoción"),
    EDIT_PROMOTION         (ActionDomain.PROMO,    "Editar promoción"),
    DELETE_PROMOTION       (ActionDomain.PROMO,    "Eliminar promoción"),
    ACTIVATE_PROMOTION     (ActionDomain.PROMO,    "Activar promoción"),
    MANAGE_COUPONS         (ActionDomain.PROMO,    "Gestionar cupones"),
    VIEW_PROMO_ANALYTICS   (ActionDomain.PROMO,    "Ver analítica de promociones"),

    // ─── PERSONAL / EMPLEADOS ──────────────────────────────────────────────
    VIEW_EMPLOYEES         (ActionDomain.STAFF,    "Ver empleados"),
    INVITE_EMPLOYEE        (ActionDomain.STAFF,    "Invitar empleado"),
    EDIT_EMPLOYEE          (ActionDomain.STAFF,    "Editar empleado"),
    SUSPEND_EMPLOYEE       (ActionDomain.STAFF,    "Suspender empleado"),
    REACTIVATE_EMPLOYEE    (ActionDomain.STAFF,    "Reactivar empleado"),
    REMOVE_EMPLOYEE        (ActionDomain.STAFF,    "Eliminar acceso de empleado"),
    CHANGE_EMPLOYEE_ROLE   (ActionDomain.STAFF,    "Cambiar rol de empleado"),
    MOVE_EMPLOYEE_BRANCH   (ActionDomain.STAFF,    "Mover empleado a otra sucursal"),
    VIEW_EMPLOYEE_ACTIVITY (ActionDomain.STAFF,    "Ver actividad del empleado"),

    // ─── CLIENTES ──────────────────────────────────────────────────────────
    VIEW_CUSTOMERS         (ActionDomain.CUSTOMERS,"Ver clientes"),
    VIEW_CUSTOMER_DETAIL   (ActionDomain.CUSTOMERS,"Ver detalle de cliente"),
    MANAGE_VIP_PROGRAM     (ActionDomain.CUSTOMERS,"Gestionar programa VIP"),
    BLOCK_CUSTOMER         (ActionDomain.CUSTOMERS,"Bloquear cliente"),
    VIEW_CUSTOMER_ORDERS   (ActionDomain.CUSTOMERS,"Ver pedidos del cliente"),

    // ─── MOTORIZADOS ───────────────────────────────────────────────────────
    VIEW_DRIVERS           (ActionDomain.DRIVERS,  "Ver motorizados"),
    VERIFY_DRIVER          (ActionDomain.DRIVERS,  "Verificar motorizado"),
    SUSPEND_DRIVER         (ActionDomain.DRIVERS,  "Suspender motorizado"),
    MANAGE_DRIVER_DOCS     (ActionDomain.DRIVERS,  "Gestionar documentos de motorizado"),

    // ─── NEGOCIO / SUCURSALES ──────────────────────────────────────────────
    CREATE_BRANCH          (ActionDomain.BUSINESS, "Crear sucursal"),
    EDIT_BRANCH            (ActionDomain.BUSINESS, "Editar sucursal"),
    CLOSE_BRANCH           (ActionDomain.BUSINESS, "Cerrar sucursal"),
    TRANSFER_BUSINESS      (ActionDomain.BUSINESS, "Transferir propiedad del negocio"),
    MANAGE_MEMBERSHIPS     (ActionDomain.BUSINESS, "Gestionar membresías"),

    // ─── OPERACIONES ───────────────────────────────────────────────────────
    OPEN_RESTAURANT        (ActionDomain.OPS,      "Abrir restaurante"),
    CLOSE_CASH_REGISTER    (ActionDomain.OPS,      "Cerrar caja"),
    EXECUTE_ROLLBACK       (ActionDomain.OPS,      "Ejecutar rollback"),
    VIEW_SYSTEM_HEALTH     (ActionDomain.OPS,      "Ver salud del sistema"),

    // ─── PLATAFORMA (ADMIN) ────────────────────────────────────────────────
    MANAGE_ALL_BUSINESSES  (ActionDomain.PLATFORM, "Gestionar todos los comercios"),
    MANAGE_ALL_USERS       (ActionDomain.PLATFORM, "Gestionar todos los usuarios"),
    ASSIGN_PLATFORM_ROLE   (ActionDomain.PLATFORM, "Asignar rol de plataforma"),
    MANAGE_CUSTOM_CLAIMS   (ActionDomain.PLATFORM, "Gestionar Custom Claims"),
    VIEW_AUDIT_LOGS        (ActionDomain.PLATFORM, "Ver logs de auditoría"),
    MANAGE_FEATURE_FLAGS   (ActionDomain.PLATFORM, "Gestionar feature flags"),
    VIEW_PLATFORM_ANALYTICS(ActionDomain.PLATFORM, "Ver analítica de plataforma"),
    IMPERSONATE_USER       (ActionDomain.PLATFORM, "Suplantar usuario (soporte)"),
    MANAGE_TENANTS         (ActionDomain.PLATFORM, "Gestionar tenants"),
    // ─── AUDITORÍA & SEGURIDAD AVANZADA (EIAM v2.1) ───────────────────────
    LOG_DEVICE_CHANGED     (ActionDomain.SECURITY, "Registro de cambio de dispositivo"),
    LOG_PASSWORD_CHANGED   (ActionDomain.SECURITY, "Registro de cambio de contraseña"),
    LOG_PERMISSION_CHANGED (ActionDomain.SECURITY, "Registro de cambio de permisos"),
    LOG_BUSINESS_CHANGED   (ActionDomain.SECURITY, "Registro de cambio de negocio"),
    LOG_BRANCH_CHANGED     (ActionDomain.SECURITY, "Registro de cambio de sucursal"),
    LOG_MFA_ENABLED        (ActionDomain.SECURITY, "Registro de activación de MFA"),
    LOG_SESSION_REVOKED    (ActionDomain.SECURITY, "Registro de sesión revocada"),
    LOG_CLAIM_UPDATED      (ActionDomain.SECURITY, "Registro de actualización de custom claim")
}

enum class ActionDomain {
    MENU, ORDERS, KITCHEN, FINANCE, DELIVERY, ANALYTICS,
    SETTINGS, PROMO, STAFF, CUSTOMERS, DRIVERS, BUSINESS, OPS, PLATFORM, SECURITY
}
