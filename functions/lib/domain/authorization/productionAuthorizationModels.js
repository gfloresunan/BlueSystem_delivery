"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PHASE 2D.13
 * PRODUCTION AUTHORIZATION & ROLLOUT READINESS CONTRACTS (C2D.13)
 *
 * Architecture: ONE CORE / ZERO FORKS / ZERO PRODUCTION MUTATION
 * Governance: ADR-014 (NO AUTO-ROLLOUT POLICY)
 * Invariant: CERTIFICATION ≠ READINESS ≠ AUTHORIZATION ≠ EXECUTION ≠ ROLLOUT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionAuthorizationLevel = void 0;
var ProductionAuthorizationLevel;
(function (ProductionAuthorizationLevel) {
    ProductionAuthorizationLevel["LEVEL_0_NO_AUTHORIZATION"] = "LEVEL_0_NO_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_1_READINESS_REVIEW"] = "LEVEL_1_READINESS_REVIEW";
    ProductionAuthorizationLevel["LEVEL_2_DEPLOYMENT_AUTHORIZATION"] = "LEVEL_2_DEPLOYMENT_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION"] = "LEVEL_3_FIRST_TENANT_PROVISIONING_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_4_FIRST_USER_CLAIMS_AUTHORIZATION"] = "LEVEL_4_FIRST_USER_CLAIMS_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_5_CONTROLLED_CANARY_AUTHORIZATION"] = "LEVEL_5_CONTROLLED_CANARY_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION"] = "LEVEL_6_LIMITED_EXPANSION_AUTHORIZATION";
    ProductionAuthorizationLevel["LEVEL_7_GENERAL_ROLLOUT_AUTHORIZATION"] = "LEVEL_7_GENERAL_ROLLOUT_AUTHORIZATION";
})(ProductionAuthorizationLevel || (exports.ProductionAuthorizationLevel = ProductionAuthorizationLevel = {}));
//# sourceMappingURL=productionAuthorizationModels.js.map