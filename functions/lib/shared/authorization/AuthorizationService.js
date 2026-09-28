"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — AUTHORIZATION & RBAC CANONICAL SERVICE
 * Protocol: BSD-GLOBAL-RBAC-EIAM-IMPLEMENTATION-002
 *
 * Central authoritative engine for:
 * 1. Role Hierarchy (L10 to L0) & Nominal Canonicalization.
 * 2. Atomic Permissions Registry (DOMAIN:ACTION).
 * 3. User-Level Overrides Engine (Precedence: DENY > USER GRANT > ROLE GRANT).
 * 4. Multi-Tenant Scoped Boundary Enforcement (GLOBAL, TENANT, BUSINESS, BRANCH, INDIVIDUAL).
 * 5. Last SuperAdmin Safeguard & Hierarchy Guarding.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationService = exports.ROLE_DEFAULT_PERMISSIONS = exports.ATOMIC_PERMISSIONS = exports.ROLE_HIERARCHY_LEVELS = exports.CanonicalRole = exports.PermissionScopeLevel = void 0;
exports.normalizeRoleToCanonical = normalizeRoleToCanonical;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../logger/logger");
function getDb() {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    return admin.firestore();
}
var PermissionScopeLevel;
(function (PermissionScopeLevel) {
    PermissionScopeLevel["GLOBAL"] = "GLOBAL";
    PermissionScopeLevel["TENANT"] = "TENANT";
    PermissionScopeLevel["BUSINESS"] = "BUSINESS";
    PermissionScopeLevel["BRANCH"] = "BRANCH";
    PermissionScopeLevel["INDIVIDUAL"] = "INDIVIDUAL";
})(PermissionScopeLevel || (exports.PermissionScopeLevel = PermissionScopeLevel = {}));
var CanonicalRole;
(function (CanonicalRole) {
    CanonicalRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    CanonicalRole["ADMIN"] = "ADMIN";
    CanonicalRole["AUDITOR"] = "AUDITOR";
    CanonicalRole["SUPPORT"] = "SUPPORT";
    CanonicalRole["OWNER"] = "OWNER";
    CanonicalRole["MANAGER"] = "MANAGER";
    CanonicalRole["SUPERVISOR"] = "SUPERVISOR";
    CanonicalRole["OPERATOR"] = "OPERATOR";
    CanonicalRole["CASHIER"] = "CASHIER";
    CanonicalRole["COOK"] = "COOK";
    CanonicalRole["DRIVER"] = "DRIVER";
    CanonicalRole["CLIENT"] = "CLIENT";
    CanonicalRole["GUEST"] = "GUEST";
})(CanonicalRole || (exports.CanonicalRole = CanonicalRole = {}));
exports.ROLE_HIERARCHY_LEVELS = {
    [CanonicalRole.SUPER_ADMIN]: 10,
    [CanonicalRole.ADMIN]: 9,
    [CanonicalRole.AUDITOR]: 8,
    [CanonicalRole.SUPPORT]: 7,
    [CanonicalRole.OWNER]: 6,
    [CanonicalRole.MANAGER]: 5,
    [CanonicalRole.SUPERVISOR]: 4,
    [CanonicalRole.OPERATOR]: 4,
    [CanonicalRole.CASHIER]: 3,
    [CanonicalRole.COOK]: 3,
    [CanonicalRole.DRIVER]: 2,
    [CanonicalRole.CLIENT]: 1,
    [CanonicalRole.GUEST]: 0,
};
// ─── 2. Role Normalization Engine ─────────────────────────────────────────────
function normalizeRoleToCanonical(rawRole) {
    if (!rawRole)
        return CanonicalRole.CLIENT;
    const str = rawRole.toLowerCase().trim();
    // Platform Aliases
    if (["super_admin", "superadmin", "gerente_general", "super-admin"].includes(str))
        return CanonicalRole.SUPER_ADMIN;
    if (["admin", "administrator", "administrador", "platform_admin", "platformadmin"].includes(str))
        return CanonicalRole.ADMIN;
    if (["auditor", "governance_auditor", "compliance_auditor"].includes(str))
        return CanonicalRole.AUDITOR;
    if (["support", "soporte", "helpdesk"].includes(str))
        return CanonicalRole.SUPPORT;
    if (["operator", "operador", "operations", "control_tower_operator"].includes(str))
        return CanonicalRole.OPERATOR;
    // Business Aliases
    if (["owner", "business", "comercio", "merchant", "merchant_owner", "business_owner", "propietario", "tenant_admin"].includes(str))
        return CanonicalRole.OWNER;
    if (["manager", "gerente", "store_manager", "branch_manager"].includes(str))
        return CanonicalRole.MANAGER;
    if (["supervisor", "merchant_supervisor", "shift_supervisor"].includes(str))
        return CanonicalRole.SUPERVISOR;
    if (["cashier", "cajero", "caja", "seller", "vendedor", "pos_operator"].includes(str))
        return CanonicalRole.CASHIER;
    if (["cook", "cocinero", "cocina", "kitchen", "kds_operator"].includes(str))
        return CanonicalRole.COOK;
    // Logistics & Fleet Aliases
    if (["driver", "courier", "motorizado", "repartidor", "deliverer", "chofer", "rider"].includes(str))
        return CanonicalRole.DRIVER;
    // Customer & Public Aliases
    if (["client", "customer", "cliente", "user", "usuario", "consumer"].includes(str))
        return CanonicalRole.CLIENT;
    if (["guest", "invitado", "anonymous"].includes(str))
        return CanonicalRole.GUEST;
    return CanonicalRole.CLIENT;
}
// ─── 3. Atomic Permissions Registry (DOMAIN:ACTION) ──────────────────────────
exports.ATOMIC_PERMISSIONS = [
    // Governance
    "tenants:provision",
    "tenants:manage",
    "tenants:delete",
    "system:configure",
    "build:manage",
    // EIAM & RBAC
    "rbac:manage_roles",
    "rbac:manage_overrides",
    "rbac:view_audit",
    "claims:issue",
    "users:create",
    "users:edit",
    "users:block",
    "users:delete",
    "staff:invite",
    // Commerce & Menu
    "menu:manage",
    "menu:stock_toggle",
    "orders:read",
    "orders:create",
    "orders:status_update",
    "orders:cancel",
    "promotions:manage",
    "reviews:moderate",
    // Finance & Settlements
    "finance:read_ledger",
    "finance:settle_merchant",
    "finance:confirm_settlement",
    "finance:dispute_settlement",
    // Fleet & Logistics
    "fleet:view_pool",
    "fleet:claim_order",
    "fleet:broadcast_gps",
    "fleet:cash_closure",
    "fleet:approve_closure",
    "fleet:control_tower",
    // Support & Incidents
    "support:read_tickets",
    "support:manage_tickets",
    "incidents:manage",
];
// ─── 4. Default Permissions by Role ──────────────────────────────────────────
exports.ROLE_DEFAULT_PERMISSIONS = {
    [CanonicalRole.SUPER_ADMIN]: [
        "tenants:provision", "tenants:manage", "tenants:delete", "system:configure", "build:manage",
        "rbac:manage_roles", "rbac:manage_overrides", "rbac:view_audit", "claims:issue",
        "users:create", "users:edit", "users:block", "users:delete", "staff:invite",
        "menu:manage", "menu:stock_toggle", "orders:read", "orders:create", "orders:status_update", "orders:cancel",
        "promotions:manage", "reviews:moderate",
        "finance:read_ledger", "finance:settle_merchant", "finance:confirm_settlement", "finance:dispute_settlement",
        "fleet:view_pool", "fleet:claim_order", "fleet:broadcast_gps", "fleet:cash_closure", "fleet:approve_closure", "fleet:control_tower",
        "support:read_tickets", "support:manage_tickets", "incidents:manage"
    ],
    [CanonicalRole.ADMIN]: [
        "tenants:manage", "build:manage",
        "rbac:manage_roles", "rbac:manage_overrides", "rbac:view_audit", "claims:issue",
        "users:create", "users:edit", "users:block", "staff:invite",
        "menu:manage", "menu:stock_toggle", "orders:read", "orders:status_update", "orders:cancel",
        "promotions:manage", "reviews:moderate",
        "finance:read_ledger", "finance:settle_merchant",
        "fleet:view_pool", "fleet:approve_closure", "fleet:control_tower",
        "support:read_tickets", "support:manage_tickets", "incidents:manage"
    ],
    [CanonicalRole.AUDITOR]: [
        "rbac:view_audit", "orders:read", "finance:read_ledger", "fleet:control_tower",
        "support:read_tickets"
    ],
    [CanonicalRole.SUPPORT]: [
        "orders:read", "support:read_tickets", "support:manage_tickets", "incidents:manage",
        "users:edit"
    ],
    [CanonicalRole.OPERATOR]: [
        "orders:read", "orders:status_update", "fleet:view_pool", "fleet:control_tower",
        "support:read_tickets", "incidents:manage"
    ],
    [CanonicalRole.OWNER]: [
        "staff:invite", "menu:manage", "menu:stock_toggle", "orders:read", "orders:create",
        "orders:status_update", "orders:cancel", "promotions:manage",
        "finance:read_ledger", "finance:confirm_settlement", "finance:dispute_settlement",
        "fleet:control_tower"
    ],
    [CanonicalRole.MANAGER]: [
        "staff:invite", "menu:manage", "menu:stock_toggle", "orders:read",
        "orders:status_update", "orders:cancel", "promotions:manage",
        "finance:read_ledger", "fleet:control_tower"
    ],
    [CanonicalRole.SUPERVISOR]: [
        "menu:stock_toggle", "orders:read", "orders:status_update", "fleet:control_tower",
        "incidents:manage"
    ],
    [CanonicalRole.CASHIER]: [
        "orders:read", "orders:create", "orders:status_update", "menu:stock_toggle"
    ],
    [CanonicalRole.COOK]: [
        "orders:read", "orders:status_update", "menu:stock_toggle"
    ],
    [CanonicalRole.DRIVER]: [
        "fleet:view_pool", "fleet:claim_order", "fleet:broadcast_gps", "fleet:cash_closure",
        "orders:read", "orders:status_update"
    ],
    [CanonicalRole.CLIENT]: [
        "orders:create", "orders:read", "orders:cancel"
    ],
    [CanonicalRole.GUEST]: [],
};
// ─── 6. Authorization Service Class ──────────────────────────────────────────
class AuthorizationService {
    /**
     * Obtiene los overrides específicos del usuario desde /user_permission_overrides/{uid}
     */
    static async getUserOverrides(uid) {
        try {
            const snap = await getDb().collection("user_permission_overrides").doc(uid).get();
            if (snap.exists) {
                return snap.data();
            }
        }
        catch (e) {
            logger_1.Logger.warn(`[AUTHZ_SERVICE] Error leyendo overrides para uid=${uid}: ${e.message}`);
        }
        return null;
    }
    /**
     * Calcula los permisos efectivos de un usuario combinando Role + Grants - Denies
     * Precedencia: Explicit DENY > User GRANT > Role GRANT
     */
    static async calculateEffectivePermissions(uid, fallbackRole) {
        let rawRole = fallbackRole || "CLIENT";
        try {
            const userDoc = await getDb().collection("users").doc(uid).get();
            if (userDoc.exists) {
                const u = userDoc.data() || {};
                rawRole = u.eiamRole || u.role || u.rol || u.userType || rawRole;
            }
        }
        catch (e) {
            logger_1.Logger.warn(`[AUTHZ_SERVICE] Error consultando /users/${uid}: ${e.message}`);
        }
        const canonicalRole = normalizeRoleToCanonical(rawRole);
        const roleLevel = exports.ROLE_HIERARCHY_LEVELS[canonicalRole] || 0;
        const defaultPerms = exports.ROLE_DEFAULT_PERMISSIONS[canonicalRole] || [];
        const overrides = await this.getUserOverrides(uid);
        const grants = (overrides === null || overrides === void 0 ? void 0 : overrides.grants) || [];
        const denies = (overrides === null || overrides === void 0 ? void 0 : overrides.denies) || [];
        // effective = (Default ∪ Grants) \ Denies
        const effectiveSet = new Set(defaultPerms);
        for (const g of grants) {
            effectiveSet.add(g);
        }
        for (const d of denies) {
            effectiveSet.delete(d);
        }
        return {
            canonicalRole,
            roleLevel,
            effectivePermissions: effectiveSet,
            grants,
            denies,
        };
    }
    /**
     * Evalúa autorización estricta para una acción con validación de Scopes
     */
    static async authorize(uid, permission, callerToken, requiredScope) {
        const { canonicalRole, effectivePermissions, denies } = await this.calculateEffectivePermissions(uid, callerToken.role || callerToken.eiamRole);
        // 1. Explicit Deny Check
        if (denies.includes(permission)) {
            return { allowed: false, reason: `PERMISSION_EXPLICITLY_DENIED: User ${uid} has explicit override DENY for ${permission}` };
        }
        // 2. Permission Check
        const hasPermission = effectivePermissions.has(permission) ||
            effectivePermissions.has("*") ||
            (canonicalRole === CanonicalRole.SUPER_ADMIN);
        if (!hasPermission) {
            return { allowed: false, reason: `FORBIDDEN_PERMISSION: Missing '${permission}' for role '${canonicalRole}'` };
        }
        // 3. Multi-Tenant Scope Validation
        if (requiredScope && canonicalRole !== CanonicalRole.SUPER_ADMIN) {
            const userTenantId = callerToken.tenantId || null;
            const userBizId = callerToken.businessId || null;
            const userBranchId = callerToken.branchId || null;
            if (requiredScope.tenantId && userTenantId && requiredScope.tenantId !== userTenantId) {
                return { allowed: false, reason: `CROSS_TENANT_DENIED: Caller tenant '${userTenantId}' does not match target tenant '${requiredScope.tenantId}'` };
            }
            if (requiredScope.businessId && userBizId && requiredScope.businessId !== userBizId) {
                return { allowed: false, reason: `CROSS_BUSINESS_DENIED: Caller business '${userBizId}' does not match target business '${requiredScope.businessId}'` };
            }
            if (requiredScope.branchId && userBranchId && requiredScope.branchId !== userBranchId) {
                return { allowed: false, reason: `CROSS_BRANCH_DENIED: Caller branch '${userBranchId}' does not match target branch '${requiredScope.branchId}'` };
            }
        }
        return { allowed: true, reason: "AUTHORIZED" };
    }
    /**
     * Auditoría explicativa: "Why does this user have access?"
     */
    static async explainAccess(uid, permission, scopeContext = {}) {
        const { canonicalRole, roleLevel, effectivePermissions, grants, denies } = await this.calculateEffectivePermissions(uid);
        const defaultPerms = exports.ROLE_DEFAULT_PERMISSIONS[canonicalRole] || [];
        if (denies.includes(permission)) {
            return {
                allowed: false,
                permission,
                origin: "USER_DENY",
                baseRole: canonicalRole,
                effectiveRoleLevel: roleLevel,
                scopeValid: true,
                scopeContext,
                details: `Permiso denegado explícitamente mediante User Override DENY en /user_permission_overrides/${uid}.`,
            };
        }
        if (grants.includes(permission)) {
            return {
                allowed: true,
                permission,
                origin: "USER_GRANT",
                baseRole: canonicalRole,
                effectiveRoleLevel: roleLevel,
                scopeValid: true,
                scopeContext,
                details: `Permiso otorgado explícitamente mediante User Override GRANT (excepción individual autorizada).`,
            };
        }
        if (defaultPerms.includes(permission) || canonicalRole === CanonicalRole.SUPER_ADMIN) {
            return {
                allowed: true,
                permission,
                origin: "ROLE_DEFAULT",
                baseRole: canonicalRole,
                effectiveRoleLevel: roleLevel,
                scopeValid: true,
                scopeContext,
                details: `Permiso concedido por herencia directa del Rol Canónico '${canonicalRole}' (Nivel L${roleLevel}).`,
            };
        }
        return {
            allowed: false,
            permission,
            origin: "DEFAULT_DENY",
            baseRole: canonicalRole,
            effectiveRoleLevel: roleLevel,
            scopeValid: false,
            scopeContext,
            details: `Permiso denegado por política estándar: '${permission}' no forma parte del rol '${canonicalRole}' ni existe un Grant individual.`,
        };
    }
    /**
     * Salvaguarda de Seguridad: Previene la eliminación o degradación del Último SuperAdmin
     */
    static async assertNotLastSuperAdmin(targetUid) {
        const targetDoc = await getDb().collection("users").doc(targetUid).get();
        if (!targetDoc.exists)
            return;
        const targetData = targetDoc.data() || {};
        const targetRole = normalizeRoleToCanonical(targetData.role || targetData.eiamRole);
        if (targetRole === CanonicalRole.SUPER_ADMIN) {
            const superAdminsSnap = await getDb().collection("users")
                .where("isActive", "==", true)
                .get();
            let activeSuperAdmins = 0;
            superAdminsSnap.forEach((doc) => {
                const d = doc.data();
                const r = normalizeRoleToCanonical(d.role || d.eiamRole);
                if (r === CanonicalRole.SUPER_ADMIN && doc.id !== targetUid) {
                    activeSuperAdmins++;
                }
            });
            if (activeSuperAdmins === 0) {
                throw new Error("LAST_SUPER_ADMIN_PROTECTION: Operación abortada. No se puede eliminar, bloquear o degradar al último SUPER_ADMIN activo de la plataforma.");
            }
        }
    }
    /**
     * Validación de Jerarquía de Modificación de Roles (P1 Fix)
     * SUPER_ADMIN (L10) puede modificar L10 y L9.
     * ADMIN (L9) NO puede crear/promover a L10, ni alterar su propio rol, ni alterar usuarios L10 o L9.
     */
    static validateRoleMutationHierarchy(callerRoleRaw, callerUid, targetUid, newRoleRaw, oldRoleRaw) {
        const callerRole = normalizeRoleToCanonical(callerRoleRaw);
        const callerLevel = exports.ROLE_HIERARCHY_LEVELS[callerRole] || 0;
        const newRole = normalizeRoleToCanonical(newRoleRaw);
        const newLevel = exports.ROLE_HIERARCHY_LEVELS[newRole] || 0;
        const oldRole = normalizeRoleToCanonical(oldRoleRaw);
        const oldLevel = exports.ROLE_HIERARCHY_LEVELS[oldRole] || 0;
        // 1. Un usuario no puede auto-modificar su propio rol hacia arriba o hacia abajo sin ser SuperAdmin
        if (callerUid === targetUid && callerRole !== CanonicalRole.SUPER_ADMIN) {
            throw new Error("SELF_ROLE_MUTATION_FORBIDDEN: Los administradores no pueden alterar su propio rol.");
        }
        // 2. Solo SUPER_ADMIN (L10) puede otorgar o remover el rol SUPER_ADMIN (L10)
        if (newRole === CanonicalRole.SUPER_ADMIN && callerRole !== CanonicalRole.SUPER_ADMIN) {
            throw new Error("PRIVILEGE_ESCALATION_BLOCKED: Solo un SUPER_ADMIN (L10) puede conceder privilegios de Super Administrador.");
        }
        // 3. Un ADMIN (L9) no puede modificar a un usuario de nivel igual o superior (L9 o L10)
        if (callerLevel < 10 && (oldLevel >= callerLevel || newLevel >= callerLevel)) {
            throw new Error(`HIERARCHY_VIOLATION: Tu nivel de autoridad (L${callerLevel}) no te permite modificar usuarios o asignar roles de nivel L${Math.max(oldLevel, newLevel)}.`);
        }
    }
}
exports.AuthorizationService = AuthorizationService;
//# sourceMappingURL=AuthorizationService.js.map