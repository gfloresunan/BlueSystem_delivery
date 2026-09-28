package com.example.domain.model

/**
 * Enum definitivo de 31 Permisos Granulares organizados por módulos.
 * Arquitectura RBAC Empresarial de BlueSystem Delivery.
 */
enum class Permission {
    // Módulo Pedidos
    CAN_CREATE_ORDER,
    CAN_CANCEL_ORDER,
    CAN_VIEW_ORDER,
    CAN_ACCEPT_ORDER,
    CAN_ASSIGN_ORDER,
    CAN_COMPLETE_ORDER,
    CAN_REJECT_ORDER,

    // Módulo Productos
    CAN_VIEW_PRODUCTS,
    CAN_CREATE_PRODUCT,
    CAN_EDIT_PRODUCT,
    CAN_DELETE_PRODUCT,

    // Módulo Inventario
    CAN_VIEW_INVENTORY,
    CAN_EDIT_INVENTORY,
    CAN_MANAGE_INVENTORY,

    // Módulo Comercios
    CAN_APPROVE_BUSINESS,
    CAN_SUSPEND_BUSINESS,
    CAN_EDIT_BUSINESS,

    // Módulo Usuarios
    CAN_VIEW_USERS,
    CAN_EDIT_USERS,
    CAN_BLOCK_USERS,
    CAN_ASSIGN_ROLES,
    CAN_RESET_PASSWORDS,

    // Módulo Repartidores
    CAN_TRACK_COURIER,
    CAN_APPROVE_COURIER,
    CAN_SUSPEND_COURIER,

    // Módulo Pagos & Finanzas
    CAN_VIEW_PAYMENTS,
    CAN_PROCESS_REFUNDS,
    CAN_VIEW_FINANCIAL_REPORTS,

    // Módulo Auditoría
    CAN_VIEW_AUDIT,
    CAN_EXPORT_AUDIT,

    // Módulo Sistema & Administración Maestra
    CAN_MANAGE_SETTINGS,
    CAN_MANAGE_PERMISSIONS,
    CAN_MANAGE_MODULES,
    CAN_MANAGE_FIREBASE,
    CAN_MANAGE_SYSTEM,

    // Permiso legacy/compatibilidad de navegación pública
    CAN_BROWSE_CATALOG
}
