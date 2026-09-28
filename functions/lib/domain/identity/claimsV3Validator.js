"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Claims V3 Security Validator
 *
 * Validaciones exhaustivas de seguridad, Platform Role Guard y Brand Null Safety.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimsV3Validator = void 0;
const validators_1 = require("./validators");
const PLATFORM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'SUPPORT'];
const GLOBAL_USER_ROLES = ['CLIENT', 'GUEST'];
const COMMERCIAL_TENANT_ROLES = ['OWNER', 'MANAGER', 'SUPERVISOR', 'CASHIER', 'COOK', 'DRIVER'];
class ClaimsV3Validator {
    /**
     * Valida exhaustivamente un objeto CanonicalCustomClaimsV3
     */
    static validate(claims) {
        const errors = [];
        // 1. Validar eiamVer
        if (claims.eiamVer !== 3) {
            errors.push("eiamVer debe ser exactamente 3.");
        }
        // 2. Validar status
        if (claims.status !== 'ACTIVE') {
            errors.push("status debe ser exactamente 'ACTIVE'.");
        }
        // 3. Validar role
        if (!claims.role || !validators_1.VALID_EIAM_ROLES.includes(claims.role)) {
            errors.push(`role '${claims.role}' es inválido o no reconocido.`);
            return { isValid: false, errors };
        }
        const role = claims.role;
        // 4. Platform Role Guard & Tenant Scope
        if (claims.tenantId === null || claims.tenantId === undefined) {
            // Si tenantId es null, SOLO se permite si el rol es de Plataforma o Usuario Global
            const isAllowedGlobal = PLATFORM_ROLES.includes(role) || GLOBAL_USER_ROLES.includes(role);
            if (!isAllowedGlobal) {
                errors.push(`Violación de Gobernanza: El rol comercial '${role}' requiere obligatoriamente un tenantId no nulo.`);
            }
        }
        else {
            // Si tenantId está presente, validar formato e inmutabilidad
            if (typeof claims.tenantId !== 'string' || claims.tenantId.trim().length === 0) {
                errors.push("tenantId si se define no puede ser un string vacío ni whitespace.");
            }
            else {
                const tid = claims.tenantId.toLowerCase();
                if (tid.includes('default') || tid.includes('tenant_bluesystem_default')) {
                    errors.push("Violación de Seguridad: Prohibido el uso de tenant default ficticio en Custom Claims.");
                }
            }
        }
        // 5. Validar scopes opcionales (brandId, orgId, businessId, branchId)
        if (claims.brandId !== null && claims.brandId !== undefined) {
            if (typeof claims.brandId !== 'string' || claims.brandId.trim().length === 0) {
                errors.push("brandId si se define debe ser un string no vacío o null.");
            }
        }
        if (claims.orgId !== null && claims.orgId !== undefined) {
            if (typeof claims.orgId !== 'string' || claims.orgId.trim().length === 0) {
                errors.push("orgId si se define debe ser un string no vacío o null.");
            }
        }
        if (claims.businessId !== null && claims.businessId !== undefined) {
            if (typeof claims.businessId !== 'string' || claims.businessId.trim().length === 0) {
                errors.push("businessId si se define debe ser un string no vacío o null.");
            }
        }
        if (claims.branchId !== null && claims.branchId !== undefined) {
            if (typeof claims.branchId !== 'string' || claims.branchId.trim().length === 0) {
                errors.push("branchId si se define debe ser un string no vacío o null.");
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Helper para verificar si un rol es estrictamente de plataforma
     */
    static isPlatformRole(role) {
        return PLATFORM_ROLES.includes(role);
    }
}
exports.ClaimsV3Validator = ClaimsV3Validator;
//# sourceMappingURL=claimsV3Validator.js.map