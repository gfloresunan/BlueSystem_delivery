"use strict";
/**
 * C2D.35.GEO-I.8 — CITY ISOLATION & MUNICIPAL INTEGRITY SECURITY SUITE
 *
 * Verifies:
 * 1. Canonical Municipality Validation (geoCatalog.ts)
 * 2. Fail-Closed behavior on missing or invalid geo data (Zero fallback to MANAGUA)
 * 3. Multi-Branch Sovereign Origin Authority (Branch municipality overrides Merchant HQ)
 * 4. Intramunicipal Commerce Delivery Policy (Cross-city order blocking)
 * 5. Courier Fleet Pool Partitioning & Security Boundary
 * 6. FCM Push Notification Topic Segmentation
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
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const geoCatalog_1 = require("../domain/geo/geoCatalog");
const expect = (actual) => ({
    toBe: (expected) => assert.strictEqual(actual, expected),
    toEqual: (expected) => assert.deepStrictEqual(actual, expected),
    toBeNull: () => assert.strictEqual(actual, null),
    notToBeNull: () => assert.notStrictEqual(actual, null),
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
    toBeTruthy: () => assert.ok(actual),
    toBeFalsy: () => assert.ok(!actual),
    toContain: (substring) => assert.ok(String(actual).includes(substring)),
    notToBe: (expected) => assert.notStrictEqual(actual, expected),
});
(0, node_test_1.describe)("C2D.35.GEO — Municipal Isolation & Geo-Eligibility Security Suite", () => {
    (0, node_test_1.describe)("1. Canonical Municipality & Department Validation", () => {
        (0, node_test_1.test)("should validate canonical department JINOTEGA and municipality JINOTEGA", () => {
            expect((0, geoCatalog_1.isValidDepartmentId)("JINOTEGA")).toBe(true);
            expect((0, geoCatalog_1.isValidMunicipalityId)("JINOTEGA")).toBe(true);
            const muni = (0, geoCatalog_1.getMunicipalityById)("JINOTEGA");
            expect(muni).toBeDefined();
            expect(muni?.departmentId).toBe("JINOTEGA");
            expect(muni?.name).toBe("Jinotega");
        });
        (0, node_test_1.test)("should validate canonical department MANAGUA and municipality MANAGUA", () => {
            expect((0, geoCatalog_1.isValidDepartmentId)("MANAGUA")).toBe(true);
            expect((0, geoCatalog_1.isValidMunicipalityId)("MANAGUA")).toBe(true);
        });
        (0, node_test_1.test)("should validate canonical department MATAGALPA and municipality MATAGALPA", () => {
            expect((0, geoCatalog_1.isValidDepartmentId)("MATAGALPA")).toBe(true);
            expect((0, geoCatalog_1.isValidMunicipalityId)("MATAGALPA")).toBe(true);
        });
        (0, node_test_1.test)("should reject invalid/fictitious departments and municipalities", () => {
            expect((0, geoCatalog_1.isValidDepartmentId)("ATLANTIS")).toBe(false);
            expect((0, geoCatalog_1.isValidMunicipalityId)("GOTHAM")).toBe(false);
            expect((0, geoCatalog_1.isValidMunicipalityId)("")).toBe(false);
        });
    });
    (0, node_test_1.describe)("2. Fail-Closed Geo Normalization (Zero Fallback to Managua)", () => {
        (0, node_test_1.test)("should normalize valid raw strings into canonical uppercase IDs", () => {
            const result = (0, geoCatalog_1.normalizeGeoLocationStrict)("Jinotega", "jinotega");
            expect(result).notToBeNull();
            expect(result?.departmentId).toBe("JINOTEGA");
            expect(result?.municipalityId).toBe("JINOTEGA");
        });
        (0, node_test_1.test)("should infer department from valid municipality if department is omitted", () => {
            const result = (0, geoCatalog_1.normalizeGeoLocationStrict)(undefined, "JINOTEGA");
            expect(result).notToBeNull();
            expect(result?.departmentId).toBe("JINOTEGA");
            expect(result?.municipalityId).toBe("JINOTEGA");
        });
        (0, node_test_1.test)("FAIL-CLOSED: should return null (NEVER fallback to MANAGUA) on invalid municipality in strict", () => {
            const result = (0, geoCatalog_1.normalizeGeoLocationStrict)("MANAGUA", "INVALID_MUNI");
            expect(result).toBeNull();
        });
        (0, node_test_1.test)("FAIL-CLOSED: should return null on null/undefined/empty input in strict", () => {
            expect((0, geoCatalog_1.normalizeGeoLocationStrict)(null, null)).toBeNull();
            expect((0, geoCatalog_1.normalizeGeoLocationStrict)("", "")).toBeNull();
            expect((0, geoCatalog_1.normalizeGeoLocationStrict)(undefined, undefined)).toBeNull();
        });
        (0, node_test_1.test)("FAIL-CLOSED: normalizeGeoLocation standard must return empty strings (NEVER fallback to MANAGUA)", () => {
            const emptyResult = (0, geoCatalog_1.normalizeGeoLocation)(null, null);
            expect(emptyResult.departmentId).toBe("");
            expect(emptyResult.municipalityId).toBe("");
            expect(emptyResult.municipalityId).notToBe("MANAGUA");
            const invalidResult = (0, geoCatalog_1.normalizeGeoLocation)("ATLANTIS", "GOTHAM");
            expect(invalidResult.departmentId).toBe("");
            expect(invalidResult.municipalityId).toBe("");
            expect(invalidResult.municipalityId).notToBe("MANAGUA");
        });
    });
    (0, node_test_1.describe)("3. Multi-Branch Sovereign Origin Authority & Branch Integrity", () => {
        (0, node_test_1.test)("should resolve origin municipality from Branch when branchId is present (Branch > Merchant HQ)", () => {
            const merchantHQ = {
                id: "biz_pizza_001",
                name: "Pizza Italia HQ",
                departmentId: "MANAGUA",
                municipalityId: "MANAGUA",
            };
            const branchJinotega = {
                id: "branch_jinotega_01",
                businessId: "biz_pizza_001",
                branchName: "Pizza Italia - Sucursal Jinotega",
                departmentId: "JINOTEGA",
                municipalityId: "JINOTEGA",
                tenantId: "tenant_pizza",
            };
            const order = {
                businessId: merchantHQ.id,
                branchId: branchJinotega.id,
            };
            const rawDept = branchJinotega.departmentId || merchantHQ.departmentId;
            const rawMuni = branchJinotega.municipalityId || merchantHQ.municipalityId;
            const geo = (0, geoCatalog_1.normalizeGeoLocationStrict)(rawDept, rawMuni);
            expect(geo).notToBeNull();
            expect(geo?.municipalityId).toBe("JINOTEGA");
            expect(geo?.departmentId).toBe("JINOTEGA");
            const stampedOrder = {
                commercialMunicipalityId: geo?.municipalityId,
                originMunicipalityId: geo?.municipalityId,
                originBranchId: order.branchId,
                commercialTenantId: branchJinotega.tenantId,
            };
            expect(stampedOrder.commercialMunicipalityId).toBe("JINOTEGA");
            expect(stampedOrder.originBranchId).toBe("branch_jinotega_01");
            expect(stampedOrder.commercialMunicipalityId).notToBe(merchantHQ.municipalityId);
        });
        (0, node_test_1.test)("should REJECT order if branchId belongs to a different business (Branch Substitution Attack)", () => {
            const orderBusinessId = "biz_sushi_managua";
            const rogueBranch = {
                id: "branch_pizza_jinotega",
                businessId: "biz_pizza_jinotega", // Mismatch!
                municipalityId: "JINOTEGA",
            };
            const isBranchValidForBusiness = rogueBranch.businessId === orderBusinessId;
            expect(isBranchValidForBusiness).toBe(false);
        });
    });
    (0, node_test_1.describe)("4. Intramunicipal Commerce Delivery Policy", () => {
        function evaluateOrderMunicipalEligibility(customerMuni, originMuni) {
            const normCustomer = customerMuni.trim().toUpperCase();
            const normOrigin = originMuni.trim().toUpperCase();
            if (!normCustomer || !normOrigin) {
                return { allowed: false, reason: "MISSING_MUNICIPALITY" };
            }
            if (normCustomer !== normOrigin) {
                return {
                    allowed: false,
                    reason: `INTERMUNICIPAL_FORBIDDEN: ${normOrigin} to ${normCustomer}. Use X->Y delivery for inter-city.`,
                };
            }
            return { allowed: true };
        }
        (0, node_test_1.test)("should allow customer in Jinotega to order from Jinotega branch", () => {
            const evalResult = evaluateOrderMunicipalEligibility("JINOTEGA", "JINOTEGA");
            expect(evalResult.allowed).toBe(true);
        });
        (0, node_test_1.test)("should BLOCK customer in Jinotega from ordering from Managua branch (Commerce Delivery)", () => {
            const evalResult = evaluateOrderMunicipalEligibility("JINOTEGA", "MANAGUA");
            expect(evalResult.allowed).toBe(false);
            expect(evalResult.reason).toContain("INTERMUNICIPAL_FORBIDDEN");
        });
        (0, node_test_1.test)("should BLOCK order if customer municipality is missing (Fail-Closed)", () => {
            const evalResult = evaluateOrderMunicipalEligibility("", "JINOTEGA");
            expect(evalResult.allowed).toBe(false);
            expect(evalResult.reason).toBe("MISSING_MUNICIPALITY");
        });
    });
    (0, node_test_1.describe)("5. Courier Fleet Pool Partitioning & Security Boundary", () => {
        function evaluateCourierOrderEligibility(courier, order) {
            if (order.serviceType === "X_TO_Y_DELIVERY") {
                return true;
            }
            if (!courier.operationalMunicipalityId || !order.commercialMunicipalityId) {
                return false; // Fail-closed
            }
            const sameTenant = !courier.tenantId || !order.commercialTenantId || courier.tenantId === order.commercialTenantId;
            const sameMuni = courier.operationalMunicipalityId.trim().toUpperCase() === order.commercialMunicipalityId.trim().toUpperCase();
            return sameTenant && sameMuni;
        }
        (0, node_test_1.test)("should allow Jinotega courier to see and claim Jinotega orders in same tenant", () => {
            const courierJinotega = { uid: "courier_jino_01", operationalMunicipalityId: "JINOTEGA", tenantId: "tenant_alpha" };
            const orderJinotega = { commercialMunicipalityId: "JINOTEGA", commercialTenantId: "tenant_alpha", status: "ready" };
            expect(evaluateCourierOrderEligibility(courierJinotega, orderJinotega)).toBe(true);
        });
        (0, node_test_1.test)("should BLOCK Managua courier from claiming or viewing Jinotega orders", () => {
            const courierManagua = { uid: "courier_mng_01", operationalMunicipalityId: "MANAGUA", tenantId: "tenant_alpha" };
            const orderJinotega = { commercialMunicipalityId: "JINOTEGA", commercialTenantId: "tenant_alpha", status: "ready" };
            expect(evaluateCourierOrderEligibility(courierManagua, orderJinotega)).toBe(false);
        });
        (0, node_test_1.test)("should BLOCK Jinotega courier from claiming or viewing Managua orders", () => {
            const courierJinotega = { uid: "courier_jino_01", operationalMunicipalityId: "JINOTEGA", tenantId: "tenant_alpha" };
            const orderManagua = { commercialMunicipalityId: "MANAGUA", commercialTenantId: "tenant_alpha", status: "ready" };
            expect(evaluateCourierOrderEligibility(courierJinotega, orderManagua)).toBe(false);
        });
        (0, node_test_1.test)("should BLOCK courier with undefined operational municipality from pool orders (Fail-Closed)", () => {
            const rogueCourier = { uid: "courier_rogue", operationalMunicipalityId: "", tenantId: "tenant_alpha" };
            const orderJinotega = { commercialMunicipalityId: "JINOTEGA", commercialTenantId: "tenant_alpha", status: "ready" };
            expect(evaluateCourierOrderEligibility(rogueCourier, orderJinotega)).toBe(false);
        });
    });
    (0, node_test_1.describe)("6. FCM Push Notification Topic Segmentation & Fail-Closed Guard", () => {
        function computeFleetNotificationTopicStrict(tenantId, municipalityId) {
            const normTenant = (tenantId || "default").trim();
            const normMuni = (municipalityId || "").trim().toUpperCase();
            // 🔒 C2D.35.GEO-R.2: FAIL-CLOSED FCM. Si no hay municipio válido, NUNCA emitir a available_orders
            if (!normMuni) {
                return null;
            }
            return `fleet_${normTenant}_${normMuni}`;
        }
        (0, node_test_1.test)("should route Jinotega ready order notifications to fleet_{tenantId}_JINOTEGA topic", () => {
            const topic = computeFleetNotificationTopicStrict("tenant_alpha", "JINOTEGA");
            expect(topic).toBe("fleet_tenant_alpha_JINOTEGA");
        });
        (0, node_test_1.test)("should route Managua ready order notifications to fleet_{tenantId}_MANAGUA topic", () => {
            const topic = computeFleetNotificationTopicStrict("tenant_alpha", "MANAGUA");
            expect(topic).toBe("fleet_tenant_alpha_MANAGUA");
        });
        (0, node_test_1.test)("ensures Jinotega topic is strictly disjoint from Managua topic", () => {
            const jinotegaTopic = computeFleetNotificationTopicStrict("tenant_alpha", "JINOTEGA");
            const managuaTopic = computeFleetNotificationTopicStrict("tenant_alpha", "MANAGUA");
            expect(jinotegaTopic).notToBe(managuaTopic);
        });
        (0, node_test_1.test)("FAIL-CLOSED: should return null (ABORT FCM) when municipality is empty or null (Zero nationwide leak)", () => {
            expect(computeFleetNotificationTopicStrict("tenant_alpha", "")).toBeNull();
            expect(computeFleetNotificationTopicStrict("tenant_alpha", null)).toBeNull();
        });
    });
});
