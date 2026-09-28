"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Active Context Derivation Engine
 *
 * Capa pura para derivar el ActiveTenantContext a partir de una membresía resuelta.
 * Regla de Oro: Solo RESOLVED_V3 y RESOLVED_LEGACY con status 'ACTIVE' producen contexto activo (Fail-Closed).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveContextDeriver = void 0;
class ActiveContextDeriver {
    /**
     * Deriva el ActiveTenantContext a partir del resultado del Dual-Read Resolver
     */
    static deriveFromResolutionResult(res) {
        // 1. Validar estado de resolución
        if (res.status !== 'RESOLVED_V3' && res.status !== 'RESOLVED_LEGACY') {
            return {
                success: false,
                context: null,
                errorDetail: `No se puede derivar contexto activo para estado de resolución '${res.status}'. Motivo: ${res.errorDetail || 'Membresía no resuelta'}.`
            };
        }
        // 2. Validar presencia de entidad
        if (!res.membership) {
            return {
                success: false,
                context: null,
                errorDetail: 'La resolución indica éxito pero el objeto de membresía es nulo.'
            };
        }
        return this.deriveFromMembershipEntity(res.membership);
    }
    /**
     * Deriva el ActiveTenantContext a partir de una entidad de Membresía V3
     */
    static deriveFromMembershipEntity(membership) {
        var _a, _b, _c, _d;
        // 3. Validar estado de ciclo de vida (Solo ACTIVE es elegible)
        if (membership.status !== 'ACTIVE') {
            return {
                success: false,
                context: null,
                errorDetail: `La membresía '${membership.membershipId}' está en estado '${membership.status}' (se requiere 'ACTIVE').`
            };
        }
        // 4. Validar tenantId (No puede ser vacío ni ficticio)
        if (!membership.tenantId || membership.tenantId.trim().length === 0) {
            return {
                success: false,
                context: null,
                errorDetail: `La membresía '${membership.membershipId}' no posee un tenantId válido.`
            };
        }
        const tidLower = membership.tenantId.toLowerCase();
        if (tidLower.includes('default') || tidLower.includes('tenant_bluesystem_default')) {
            return {
                success: false,
                context: null,
                errorDetail: 'Violación de Seguridad: Intento de derivar contexto activo sobre tenant default ficticio bloqueado.'
            };
        }
        // 5. Construcción del Contexto Activo Canónico
        const context = {
            tenantId: membership.tenantId,
            brandId: (_a = membership.brandId) !== null && _a !== void 0 ? _a : null,
            organizationId: (_b = membership.organizationId) !== null && _b !== void 0 ? _b : null,
            businessId: (_c = membership.businessId) !== null && _c !== void 0 ? _c : null,
            branchId: (_d = membership.branchId) !== null && _d !== void 0 ? _d : null,
            role: membership.role,
            membershipId: membership.membershipId,
            status: 'ACTIVE'
        };
        return {
            success: true,
            context
        };
    }
}
exports.ActiveContextDeriver = ActiveContextDeriver;
//# sourceMappingURL=activeContextDeriver.js.map