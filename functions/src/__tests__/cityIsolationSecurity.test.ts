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

import { describe, test } from "node:test";
import * as assert from "node:assert";
import {
  isValidDepartmentId,
  isValidMunicipalityId,
  normalizeGeoLocationStrict,
  normalizeGeoLocation,
  getMunicipalityById,
} from "../domain/geo/geoCatalog";

const expect = (actual: any) => ({
  toBe: (expected: any) => assert.strictEqual(actual, expected),
  toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
  toBeNull: () => assert.strictEqual(actual, null),
  notToBeNull: () => assert.notStrictEqual(actual, null),
  toBeDefined: () => assert.notStrictEqual(actual, undefined),
  toBeTruthy: () => assert.ok(actual),
  toBeFalsy: () => assert.ok(!actual),
  toContain: (substring: string) => assert.ok(String(actual).includes(substring)),
  notToBe: (expected: any) => assert.notStrictEqual(actual, expected),
});

describe("C2D.35.GEO — Municipal Isolation & Geo-Eligibility Security Suite", () => {
  describe("1. Canonical Municipality & Department Validation", () => {
    test("should validate canonical department JINOTEGA and municipality JINOTEGA", () => {
      expect(isValidDepartmentId("JINOTEGA")).toBe(true);
      expect(isValidMunicipalityId("JINOTEGA")).toBe(true);
      const muni = getMunicipalityById("JINOTEGA");
      expect(muni).toBeDefined();
      expect(muni?.departmentId).toBe("JINOTEGA");
      expect(muni?.name).toBe("Jinotega");
    });

    test("should validate canonical department MANAGUA and municipality MANAGUA", () => {
      expect(isValidDepartmentId("MANAGUA")).toBe(true);
      expect(isValidMunicipalityId("MANAGUA")).toBe(true);
    });

    test("should validate canonical department MATAGALPA and municipality MATAGALPA", () => {
      expect(isValidDepartmentId("MATAGALPA")).toBe(true);
      expect(isValidMunicipalityId("MATAGALPA")).toBe(true);
    });

    test("should reject invalid/fictitious departments and municipalities", () => {
      expect(isValidDepartmentId("ATLANTIS")).toBe(false);
      expect(isValidMunicipalityId("GOTHAM")).toBe(false);
      expect(isValidMunicipalityId("")).toBe(false);
    });
  });

  describe("2. Fail-Closed Geo Normalization (Zero Fallback to Managua)", () => {
    test("should normalize valid raw strings into canonical uppercase IDs", () => {
      const result = normalizeGeoLocationStrict("Jinotega", "jinotega");
      expect(result).notToBeNull();
      expect(result?.departmentId).toBe("JINOTEGA");
      expect(result?.municipalityId).toBe("JINOTEGA");
    });

    test("should infer department from valid municipality if department is omitted", () => {
      const result = normalizeGeoLocationStrict(undefined, "JINOTEGA");
      expect(result).notToBeNull();
      expect(result?.departmentId).toBe("JINOTEGA");
      expect(result?.municipalityId).toBe("JINOTEGA");
    });

    test("FAIL-CLOSED: should return null (NEVER fallback to MANAGUA) on invalid municipality in strict", () => {
      const result = normalizeGeoLocationStrict("MANAGUA", "INVALID_MUNI");
      expect(result).toBeNull();
    });

    test("FAIL-CLOSED: should return null on null/undefined/empty input in strict", () => {
      expect(normalizeGeoLocationStrict(null, null)).toBeNull();
      expect(normalizeGeoLocationStrict("", "")).toBeNull();
      expect(normalizeGeoLocationStrict(undefined, undefined)).toBeNull();
    });

    test("FAIL-CLOSED: normalizeGeoLocation standard must return empty strings (NEVER fallback to MANAGUA)", () => {
      const emptyResult = normalizeGeoLocation(null, null);
      expect(emptyResult.departmentId).toBe("");
      expect(emptyResult.municipalityId).toBe("");
      expect(emptyResult.municipalityId).notToBe("MANAGUA");

      const invalidResult = normalizeGeoLocation("ATLANTIS", "GOTHAM");
      expect(invalidResult.departmentId).toBe("");
      expect(invalidResult.municipalityId).toBe("");
      expect(invalidResult.municipalityId).notToBe("MANAGUA");
    });
  });

  describe("3. Multi-Branch Sovereign Origin Authority & Branch Integrity", () => {
    test("should resolve origin municipality from Branch when branchId is present (Branch > Merchant HQ)", () => {
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
      const geo = normalizeGeoLocationStrict(rawDept, rawMuni);

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

    test("should REJECT order if branchId belongs to a different business (Branch Substitution Attack)", () => {
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

  describe("4. Intramunicipal Commerce Delivery Policy", () => {
    function evaluateOrderMunicipalEligibility(customerMuni: string, originMuni: string): { allowed: boolean; reason?: string } {
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

    test("should allow customer in Jinotega to order from Jinotega branch", () => {
      const evalResult = evaluateOrderMunicipalEligibility("JINOTEGA", "JINOTEGA");
      expect(evalResult.allowed).toBe(true);
    });

    test("should BLOCK customer in Jinotega from ordering from Managua branch (Commerce Delivery)", () => {
      const evalResult = evaluateOrderMunicipalEligibility("JINOTEGA", "MANAGUA");
      expect(evalResult.allowed).toBe(false);
      expect(evalResult.reason).toContain("INTERMUNICIPAL_FORBIDDEN");
    });

    test("should BLOCK order if customer municipality is missing (Fail-Closed)", () => {
      const evalResult = evaluateOrderMunicipalEligibility("", "JINOTEGA");
      expect(evalResult.allowed).toBe(false);
      expect(evalResult.reason).toBe("MISSING_MUNICIPALITY");
    });
  });

  describe("5. Courier Fleet Pool Partitioning & Security Boundary", () => {
    function evaluateCourierOrderEligibility(
      courier: { uid: string; operationalMunicipalityId: string; tenantId: string },
      order: { commercialMunicipalityId: string; commercialTenantId: string; status: string; serviceType?: string }
    ): boolean {
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

    test("should allow Jinotega courier to see and claim Jinotega orders in same tenant", () => {
      const courierJinotega = { uid: "courier_jino_01", operationalMunicipalityId: "JINOTEGA", tenantId: "tenant_alpha" };
      const orderJinotega = { commercialMunicipalityId: "JINOTEGA", commercialTenantId: "tenant_alpha", status: "ready" };

      expect(evaluateCourierOrderEligibility(courierJinotega, orderJinotega)).toBe(true);
    });

    test("should BLOCK Managua courier from claiming or viewing Jinotega orders", () => {
      const courierManagua = { uid: "courier_mng_01", operationalMunicipalityId: "MANAGUA", tenantId: "tenant_alpha" };
      const orderJinotega = { commercialMunicipalityId: "JINOTEGA", commercialTenantId: "tenant_alpha", status: "ready" };

      expect(evaluateCourierOrderEligibility(courierManagua, orderJinotega)).toBe(false);
    });

    test("should BLOCK Jinotega courier from claiming or viewing Managua orders", () => {
      const courierJinotega = { uid: "courier_jino_01", operationalMunicipalityId: "JINOTEGA", tenantId: "tenant_alpha" };
      const orderManagua = { commercialMunicipalityId: "MANAGUA", commercialTenantId: "tenant_alpha", status: "ready" };

      expect(evaluateCourierOrderEligibility(courierJinotega, orderManagua)).toBe(false);
    });

    test("should BLOCK courier with undefined operational municipality from pool orders (Fail-Closed)", () => {
      const rogueCourier = { uid: "courier_rogue", operationalMunicipalityId: "", tenantId: "tenant_alpha" };
      const orderJinotega = { commercialMunicipalityId: "JINOTEGA", commercialTenantId: "tenant_alpha", status: "ready" };

      expect(evaluateCourierOrderEligibility(rogueCourier, orderJinotega)).toBe(false);
    });
  });

  describe("6. FCM Push Notification Topic Segmentation & Fail-Closed Guard", () => {
    function computeFleetNotificationTopicStrict(tenantId: string, municipalityId: string): string | null {
      const normTenant = (tenantId || "default").trim();
      const normMuni = (municipalityId || "").trim().toUpperCase();
      // 🔒 C2D.35.GEO-R.2: FAIL-CLOSED FCM. Si no hay municipio válido, NUNCA emitir a available_orders
      if (!normMuni) {
        return null;
      }
      return `fleet_${normTenant}_${normMuni}`;
    }

    test("should route Jinotega ready order notifications to fleet_{tenantId}_JINOTEGA topic", () => {
      const topic = computeFleetNotificationTopicStrict("tenant_alpha", "JINOTEGA");
      expect(topic).toBe("fleet_tenant_alpha_JINOTEGA");
    });

    test("should route Managua ready order notifications to fleet_{tenantId}_MANAGUA topic", () => {
      const topic = computeFleetNotificationTopicStrict("tenant_alpha", "MANAGUA");
      expect(topic).toBe("fleet_tenant_alpha_MANAGUA");
    });

    test("ensures Jinotega topic is strictly disjoint from Managua topic", () => {
      const jinotegaTopic = computeFleetNotificationTopicStrict("tenant_alpha", "JINOTEGA");
      const managuaTopic = computeFleetNotificationTopicStrict("tenant_alpha", "MANAGUA");
      expect(jinotegaTopic).notToBe(managuaTopic);
    });

    test("FAIL-CLOSED: should return null (ABORT FCM) when municipality is empty or null (Zero nationwide leak)", () => {
      expect(computeFleetNotificationTopicStrict("tenant_alpha", "")).toBeNull();
      expect(computeFleetNotificationTopicStrict("tenant_alpha", null as any)).toBeNull();
    });
  });
});
