/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — MODULE & PLAN CATALOG (FASE 2D.3)
 * Catálogo Canónico de Módulos, Capacidades por Rol y Planes de Suscripción
 */

import { CapabilityModule, PlanTier, SubscriptionQuotas } from '../platform/models';

export interface ModuleDefinition {
  moduleId: CapabilityModule;
  name: string;
  description: string;
  requiredEntitlements: CapabilityModule[];
  supportedRoles: string[]; // Roles con permiso de interactuar con el módulo
  roleCapabilities: Record<string, string[]>; // Mapeo de rol a acciones permitidas
}

export const MODULE_CATALOG: Record<string, ModuleDefinition> = Object.freeze({
  ORDERS: {
    moduleId: 'ORDERS',
    name: 'Gestión de Pedidos',
    description: 'Recepción, seguimiento y estados de órdenes',
    requiredEntitlements: ['ORDERS'],
    supportedRoles: ['OWNER', 'MANAGER', 'CASHIER', 'ADMIN', 'COOK'],
    roleCapabilities: {
      OWNER: ['VIEW_ORDERS', 'UPDATE_STATUS', 'CANCEL_ORDER', 'REFUND_ORDER'],
      MANAGER: ['VIEW_ORDERS', 'UPDATE_STATUS', 'CANCEL_ORDER'],
      CASHIER: ['VIEW_ORDERS', 'CREATE_ORDER', 'UPDATE_STATUS', 'ACCEPT_PAYMENT'],
      ADMIN: ['VIEW_ORDERS', 'UPDATE_STATUS', 'CANCEL_ORDER'],
      COOK: ['VIEW_ORDERS', 'UPDATE_KDS_STATUS']
    }
  },
  CATALOG: {
    moduleId: 'CATALOG',
    name: 'Catálogo de Productos',
    description: 'Gestión de categorías, productos y precios',
    requiredEntitlements: ['CATALOG'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN'],
    roleCapabilities: {
      OWNER: ['CREATE_PRODUCT', 'EDIT_PRODUCT', 'DELETE_PRODUCT', 'EDIT_PRICE'],
      MANAGER: ['CREATE_PRODUCT', 'EDIT_PRODUCT', 'EDIT_PRICE'],
      ADMIN: ['CREATE_PRODUCT', 'EDIT_PRODUCT', 'EDIT_PRICE']
    }
  },
  CUSTOMERS: {
    moduleId: 'CUSTOMERS',
    name: 'Gestión de Clientes',
    description: 'Directorio de clientes y fidelización',
    requiredEntitlements: ['CUSTOMERS'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN', 'CASHIER'],
    roleCapabilities: {
      OWNER: ['VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS', 'EXPORT_CUSTOMERS'],
      MANAGER: ['VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS'],
      ADMIN: ['VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS'],
      CASHIER: ['VIEW_CUSTOMERS']
    }
  },
  PROMOTIONS: {
    moduleId: 'PROMOTIONS',
    name: 'Promociones y Cupones',
    description: 'Campañas de descuento y puntos de lealtad',
    requiredEntitlements: ['PROMOTIONS'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN'],
    roleCapabilities: {
      OWNER: ['CREATE_PROMOTION', 'EDIT_PROMOTION', 'DELETE_PROMOTION'],
      MANAGER: ['CREATE_PROMOTION', 'EDIT_PROMOTION'],
      ADMIN: ['CREATE_PROMOTION', 'EDIT_PROMOTION']
    }
  },
  FINANCE: {
    moduleId: 'FINANCE',
    name: 'Finanzas y Caja',
    description: 'Arqueo de caja, liquidaciones y cuentas por cobrar',
    requiredEntitlements: ['FINANCE'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN', 'CASHIER'],
    roleCapabilities: {
      OWNER: ['VIEW_FINANCE', 'CLOSE_CASH_DRAWER', 'SETTLE_COURIERS', 'VIEW_PROFIT_MARGINS'],
      MANAGER: ['VIEW_FINANCE', 'CLOSE_CASH_DRAWER', 'SETTLE_COURIERS'],
      ADMIN: ['VIEW_FINANCE', 'CLOSE_CASH_DRAWER'],
      CASHIER: ['CLOSE_CASH_DRAWER', 'VIEW_DAILY_CASH']
    }
  },
  REPORTS: {
    moduleId: 'REPORTS',
    name: 'Reportes y Analítica',
    description: 'Reportes de ventas, rendimiento y exportación',
    requiredEntitlements: ['REPORTS'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN'],
    roleCapabilities: {
      OWNER: ['VIEW_REPORTS', 'EXPORT_REPORTS', 'VIEW_AUDIT_LOGS'],
      MANAGER: ['VIEW_REPORTS', 'EXPORT_REPORTS'],
      ADMIN: ['VIEW_REPORTS']
    }
  },
  CONTROL_TOWER: {
    moduleId: 'CONTROL_TOWER',
    name: 'Torre de Control de Entregas',
    description: 'Mapa de despacho en vivo y telemetría de repartidores (ADR-013)',
    requiredEntitlements: ['CONTROL_TOWER', 'GPS_TRACKING'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN'],
    roleCapabilities: {
      OWNER: ['VIEW_RADAR', 'MANUAL_DISPATCH', 'REASSIGN_COURIER', 'VIEW_TELEMETRY'],
      MANAGER: ['VIEW_RADAR', 'MANUAL_DISPATCH', 'REASSIGN_COURIER'],
      ADMIN: ['VIEW_RADAR', 'MANUAL_DISPATCH']
    }
  },
  FLEET_CORE: {
    moduleId: 'FLEET_CORE',
    name: 'Gestión de Flota',
    description: 'Registro, documentación y asignación de motorizados',
    requiredEntitlements: ['FLEET_CORE'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN'],
    roleCapabilities: {
      OWNER: ['CREATE_COURIER', 'EDIT_COURIER', 'SUSPEND_COURIER', 'VIEW_FLEET'],
      MANAGER: ['VIEW_FLEET', 'EDIT_COURIER'],
      ADMIN: ['VIEW_FLEET', 'EDIT_COURIER']
    }
  },
  GPS_TRACKING: {
    moduleId: 'GPS_TRACKING',
    name: 'Telemetría GPS en Vivo',
    description: 'Suscripción reactiva a /ubicaciones_repartidores',
    requiredEntitlements: ['GPS_TRACKING'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN'],
    roleCapabilities: {
      OWNER: ['STREAM_GPS'],
      MANAGER: ['STREAM_GPS'],
      ADMIN: ['STREAM_GPS']
    }
  },
  X_TO_Y_DELIVERY: {
    moduleId: 'X_TO_Y_DELIVERY',
    name: 'Motor de Envíos Punto a Punto X->Y 2.0',
    description: 'Geocodificación, cotización de ruta y selección segura (ADR-015)',
    requiredEntitlements: ['X_TO_Y_DELIVERY'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN', 'CASHIER'],
    roleCapabilities: {
      OWNER: ['REQUEST_DELIVERY', 'SET_CUSTOM_FARE'],
      MANAGER: ['REQUEST_DELIVERY'],
      ADMIN: ['REQUEST_DELIVERY'],
      CASHIER: ['REQUEST_DELIVERY']
    }
  },
  NOTIFICATIONS: {
    moduleId: 'NOTIFICATIONS',
    name: 'Notificaciones Push FCM',
    description: 'Enrutamiento y colas de notificación',
    requiredEntitlements: ['NOTIFICATIONS'],
    supportedRoles: ['OWNER', 'MANAGER', 'ADMIN'],
    roleCapabilities: {
      OWNER: ['BROADCAST_NOTIFICATION', 'CONFIG_TEMPLATES'],
      MANAGER: ['CONFIG_TEMPLATES'],
      ADMIN: ['CONFIG_TEMPLATES']
    }
  },
  ANALYTICS: {
    moduleId: 'ANALYTICS',
    name: 'Business Intelligence Avanzado',
    description: 'Métricas agregadas, cohortes y retención',
    requiredEntitlements: ['ANALYTICS'],
    supportedRoles: ['OWNER'],
    roleCapabilities: {
      OWNER: ['VIEW_BI_DASHBOARD', 'EXPORT_RAW_ANALYTICS']
    }
  },
  GOVERNANCE: {
    moduleId: 'GOVERNANCE',
    name: 'Gobernanza y Auditoría de Seguridad',
    description: 'Bitácoras inmutables y monitoreo forense',
    requiredEntitlements: ['GOVERNANCE'],
    supportedRoles: ['OWNER'],
    roleCapabilities: {
      OWNER: ['VIEW_AUDIT_TRAIL', 'SECURITY_EXPORTS']
    }
  },
  MULTI_BRANCH: {
    moduleId: 'MULTI_BRANCH',
    name: 'Multi-Sucursal',
    description: 'Operación centralizada de múltiples sucursales físicas',
    requiredEntitlements: ['MULTI_BRANCH'],
    supportedRoles: ['OWNER', 'ADMIN'],
    roleCapabilities: {
      OWNER: ['CREATE_BRANCH', 'TRANSFER_INVENTORY', 'CENTRAL_CASH_CONSOLIDATION'],
      ADMIN: ['TRANSFER_INVENTORY']
    }
  },
  MULTI_BRAND: {
    moduleId: 'MULTI_BRAND',
    name: 'Multi-Marca',
    description: 'Gestión de múltiples identidades comerciales bajo un mismo tenant',
    requiredEntitlements: ['MULTI_BRAND'],
    supportedRoles: ['OWNER'],
    roleCapabilities: {
      OWNER: ['CREATE_BRAND', 'ASSIGN_BRAND_STORES']
    }
  },
  API_ACCESS: {
    moduleId: 'API_ACCESS',
    name: 'Acceso a APIs de Integración',
    description: 'API Keys y Webhooks para sistemas externos / ERPs',
    requiredEntitlements: ['API_ACCESS'],
    supportedRoles: ['OWNER'],
    roleCapabilities: {
      OWNER: ['GENERATE_API_KEY', 'MANAGE_WEBHOOKS']
    }
  }
});

export interface PlanDefinition {
  planTier: PlanTier;
  planName: string;
  description: string;
  defaultEntitlements: CapabilityModule[];
  defaultQuotas: SubscriptionQuotas;
}

export const PLAN_CATALOG: Record<PlanTier, PlanDefinition> = Object.freeze({
  STARTER: {
    planTier: 'STARTER',
    planName: 'Plan Starter',
    description: 'Ideal para comercios individuales que inician su operación',
    defaultEntitlements: ['ORDERS', 'CATALOG', 'CUSTOMERS'],
    defaultQuotas: {
      maxBusinesses: 1,
      maxBranches: 1,
      maxUsers: 3,
      maxCouriers: 2,
      maxOrders: 300,
      maxStorageMb: 500,
      maxApiRequests: 1000
    }
  },
  PROFESSIONAL: {
    planTier: 'PROFESSIONAL',
    planName: 'Plan Professional',
    description: 'Para negocios consolidados con flota de reparto y finanzas',
    defaultEntitlements: [
      'ORDERS',
      'CATALOG',
      'CUSTOMERS',
      'PROMOTIONS',
      'FINANCE',
      'REPORTS',
      'CONTROL_TOWER',
      'FLEET_CORE',
      'GPS_TRACKING',
      'X_TO_Y_DELIVERY',
      'NOTIFICATIONS'
    ],
    defaultQuotas: {
      maxBusinesses: 3,
      maxBranches: 5,
      maxUsers: 15,
      maxCouriers: 10,
      maxOrders: 3000,
      maxStorageMb: 2000,
      maxApiRequests: 10000
    }
  },
  ENTERPRISE: {
    planTier: 'ENTERPRISE',
    planName: 'Plan Enterprise Holding',
    description: 'Para cadenas comerciales, holdings y agencias de gran escala',
    defaultEntitlements: [
      'ORDERS',
      'CATALOG',
      'CUSTOMERS',
      'PROMOTIONS',
      'FINANCE',
      'REPORTS',
      'CONTROL_TOWER',
      'FLEET_CORE',
      'GPS_TRACKING',
      'X_TO_Y_DELIVERY',
      'NOTIFICATIONS',
      'ANALYTICS',
      'GOVERNANCE',
      'MULTI_BRANCH',
      'MULTI_BRAND',
      'API_ACCESS'
    ],
    defaultQuotas: {
      maxBusinesses: -1, // Ilimitado
      maxBranches: -1,
      maxUsers: -1,
      maxCouriers: -1,
      maxOrders: -1,
      maxStorageMb: 50000,
      maxApiRequests: 1000000
    }
  },
  CUSTOM: {
    planTier: 'CUSTOM',
    planName: 'Plan Contractual White-Label',
    description: 'Suscripción personalizada según contrato comercial',
    defaultEntitlements: [
      'ORDERS',
      'CATALOG',
      'CUSTOMERS',
      'PROMOTIONS',
      'FINANCE',
      'REPORTS',
      'CONTROL_TOWER',
      'FLEET_CORE',
      'GPS_TRACKING',
      'X_TO_Y_DELIVERY'
    ],
    defaultQuotas: {
      maxBusinesses: 10,
      maxBranches: 20,
      maxUsers: 50,
      maxCouriers: 30,
      maxOrders: 10000,
      maxStorageMb: 10000,
      maxApiRequests: 50000
    }
  }
});
