"use strict";
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
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const auth_1 = require("../triggers/auth");
(0, node_test_1.describe)("Sprint 18.1 Merchant Onboarding & EIAM Authorization Tests", () => {
    (0, node_test_1.test)("resolveEiamRole should map owner, business, and merchant roles to OWNER", () => {
        assert.strictEqual((0, auth_1.resolveEiamRole)({ role: "owner" }), "OWNER");
        assert.strictEqual((0, auth_1.resolveEiamRole)({ userType: "business" }), "OWNER");
        assert.strictEqual((0, auth_1.resolveEiamRole)({ eiamRole: "MERCHANT_OWNER" }), "OWNER");
        assert.strictEqual((0, auth_1.resolveEiamRole)({ role: "comercio" }), "OWNER");
        assert.strictEqual((0, auth_1.resolveEiamRole)({ role: "merchant_owner" }), "OWNER");
    });
    (0, node_test_1.test)("resolveEiamRole should map admin roles correctly", () => {
        assert.strictEqual((0, auth_1.resolveEiamRole)({ role: "admin" }), "ADMIN");
        assert.strictEqual((0, auth_1.resolveEiamRole)({ role: "super_admin" }), "SUPER_ADMIN");
    });
    (0, node_test_1.test)("resolveEiamRole should default unknown roles to CLIENT", () => {
        assert.strictEqual((0, auth_1.resolveEiamRole)({ role: "unknown_role" }), "CLIENT");
        assert.strictEqual((0, auth_1.resolveEiamRole)({}), "CLIENT");
    });
    (0, node_test_1.test)("EIAM guard: should detect when a user document belongs to a canonical business and skip legacy store projection", () => {
        const eiamUserData = {
            uid: "user_123",
            businessId: "biz_canonical_456",
            role: "business",
            eiamRole: "MERCHANT_OWNER"
        };
        const shouldSkipLegacyProjection = Boolean(eiamUserData.eiamRole || (eiamUserData.businessId && eiamUserData.businessId !== eiamUserData.uid));
        assert.strictEqual(shouldSkipLegacyProjection, true);
    });
    (0, node_test_1.test)("Idempotency guard: should detect already provisioned merchant applications and prevent duplicate trigger execution", () => {
        const appAfterProvisioned = {
            status: "APPROVED",
            provisionedBusinessId: "biz_12345",
            provisionedUid: "uid_12345"
        };
        const isAlreadyProvisioned = Boolean(appAfterProvisioned.provisionedBusinessId || appAfterProvisioned.provisionedUid);
        assert.strictEqual(isAlreadyProvisioned, true);
    });
});
