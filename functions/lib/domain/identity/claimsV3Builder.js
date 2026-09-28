"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 DOMAIN LAYER (FASE 2C.4)
 * Pure Custom Claims v3 Builder
 *
 * Generador determinístico y libre de efectos secundarios para Custom Claims V3.
 * Sin llamadas a Firebase Auth, sin lecturas de base de datos, sin Math.random() ni Date.now().
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimsV3Builder = void 0;
class ClaimsV3Builder {
    /**
     * Construye los Claims Canónicos V3 a partir de un ActiveTenantContext
     */
    static buildCanonicalClaims(context) {
        var _a, _b, _c, _d;
        return {
            role: context.role,
            tenantId: context.tenantId,
            brandId: (_a = context.brandId) !== null && _a !== void 0 ? _a : null,
            orgId: (_b = context.organizationId) !== null && _b !== void 0 ? _b : null,
            businessId: (_c = context.businessId) !== null && _c !== void 0 ? _c : null,
            branchId: (_d = context.branchId) !== null && _d !== void 0 ? _d : null,
            status: 'ACTIVE',
            eiamVer: 3
        };
    }
    /**
     * Construye Claims para actores globales de plataforma (SUPER_ADMIN, ADMIN, AUDITOR, SUPPORT)
     */
    static buildPlatformClaims(role) {
        return {
            role,
            tenantId: null,
            brandId: null,
            orgId: null,
            businessId: null,
            branchId: null,
            status: 'ACTIVE',
            eiamVer: 3
        };
    }
    /**
     * Construye Claims globales para cliente consumidor
     */
    static buildGlobalClientClaims() {
        return {
            role: 'CLIENT',
            tenantId: null,
            brandId: null,
            orgId: null,
            businessId: null,
            branchId: null,
            status: 'ACTIVE',
            eiamVer: 3
        };
    }
}
exports.ClaimsV3Builder = ClaimsV3Builder;
//# sourceMappingURL=claimsV3Builder.js.map