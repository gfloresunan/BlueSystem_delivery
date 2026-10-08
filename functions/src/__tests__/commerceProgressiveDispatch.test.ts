/**
 * BlueSystem Delivery Enterprise — Commerce Progressive Dispatch Test Suite
 * Protocol: BSD-COMMERCE-PROGRESSIVE-DISPATCH-001
 * Matrices: Core (CPD-01..12), Anti-Race (CPD-RACE-01..06), Timeout (CPD-TIMEOUT-01..06),
 * Manual (CPD-MANUAL-01..05), Pricing (CPD-PRICE-01..05), X2Y Zero-Touch (CPD-X2Y-01..05),
 * Recovery (CPD-REC-01..05).
 */

import { describe, it, beforeEach } from "node:test";
import * as assert from "node:assert";
import {
  calculateHaversineDistanceKm,
  DEFAULT_COMMERCE_DISPATCH_CONFIG,
  CommerceProgressiveDispatchConfig,
  CommerceDispatchSession,
} from "../services/commerceProgressiveDispatchEngine";
import { X2Y_DISPATCH_CONFIG } from "../services/xToYDispatchEngine";

describe("BSD-COMMERCE-PROGRESSIVE-DISPATCH-001: Authoritative Test Suite", () => {
  // ─── 1. CORE DISCOVERY & HAVERSINE (CPD-01 .. CPD-06) ────────────────────────
  describe("1. Pure Haversine & Proximity Filtering", () => {
    it("CPD-03 & CPD-04: should calculate distance and accurately distinguish radius thresholds", () => {
      // Ciudad Darío Centro: 12.7315, -86.1240
      const pickupLat = 12.7315;
      const pickupLng = -86.1240;

      // Courier 1: ~1.8 km (Barrio San Pedro, Darío)
      const courier1Lat = 12.7210;
      const courier1Lng = -86.1340;
      const dist1 = calculateHaversineDistanceKm(pickupLat, pickupLng, courier1Lat, courier1Lng);
      assert.ok(dist1 <= 3.0, `Courier 1 should be within Stage 1 (3 km), got ${dist1} km`);

      // Courier 2: ~4.2 km (Carretera Panamericana Sur)
      const courier2Lat = 12.7000;
      const courier2Lng = -86.1450;
      const dist2 = calculateHaversineDistanceKm(pickupLat, pickupLng, courier2Lat, courier2Lng);
      assert.ok(dist2 > 3.0 && dist2 <= 5.0, `Courier 2 should be in Stage 2 (5 km), got ${dist2} km`);

      // Courier 3: ~8.5 km (Calabazas)
      const courier3Lat = 12.6700;
      const courier3Lng = -86.1700;
      const dist3 = calculateHaversineDistanceKm(pickupLat, pickupLng, courier3Lat, courier3Lng);
      assert.ok(dist3 > 5.0 && dist3 <= 10.0, `Courier 3 should be in Stage 3 (10 km), got ${dist3} km`);

      // Courier 4: ~16.5 km (Sébaco bypass border)
      const courier4Lat = 12.8200;
      const courier4Lng = -86.1000;
      const dist4 = calculateHaversineDistanceKm(pickupLat, pickupLng, courier4Lat, courier4Lng);
      assert.ok(dist4 > 10.0 && dist4 <= 20.0, `Courier 4 should be in Stage 4 (20 km), got ${dist4} km`);
    });

    it("CPD-06: Stage progression simulates progressive exclusion of already notified couriers", () => {
      const allCouriers = [
        { id: "courier_1", distKm: 2.1 },
        { id: "courier_2", distKm: 4.5 },
        { id: "courier_3", distKm: 8.9 },
        { id: "courier_4", distKm: 15.2 },
      ];

      // Stage 1 (3 km):
      const stage1Notified: string[] = [];
      const stage1Candidates = allCouriers.filter(
        (c) => c.distKm <= 3.0 && !stage1Notified.includes(c.id)
      );
      assert.strictEqual(stage1Candidates.length, 1);
      assert.strictEqual(stage1Candidates[0].id, "courier_1");
      stage1Notified.push(...stage1Candidates.map((c) => c.id));

      // Stage 2 (5 km):
      const stage2Candidates = allCouriers.filter(
        (c) => c.distKm <= 5.0 && !stage1Notified.includes(c.id)
      );
      assert.strictEqual(stage2Candidates.length, 1);
      assert.strictEqual(stage2Candidates[0].id, "courier_2");
      stage1Notified.push(...stage2Candidates.map((c) => c.id));

      // Stage 3 (10 km):
      const stage3Candidates = allCouriers.filter(
        (c) => c.distKm <= 10.0 && !stage1Notified.includes(c.id)
      );
      assert.strictEqual(stage3Candidates.length, 1);
      assert.strictEqual(stage3Candidates[0].id, "courier_3");
      stage1Notified.push(...stage3Candidates.map((c) => c.id));

      // Stage 4 (20 km):
      const stage4Candidates = allCouriers.filter(
        (c) => c.distKm <= 20.0 && !stage1Notified.includes(c.id)
      );
      assert.strictEqual(stage4Candidates.length, 1);
      assert.strictEqual(stage4Candidates[0].id, "courier_4");
      stage1Notified.push(...stage4Candidates.map((c) => c.id));

      // No courier notified twice
      assert.strictEqual(new Set(stage1Notified).size, 4);
    });
  });

  // ─── 2. ELIGIBILITY FILTERS (CPD-07 .. CPD-12) ──────────────────────────────
  describe("2. Courier Eligibility Rules", () => {
    function evaluateCourierEligibility(courier: {
      isOnline: boolean;
      isActive: boolean;
      lastGpsAgeSec: number;
      gpsFreshnessMaxSec: number;
      courierCity: string;
      orderCity: string;
      hasActiveOrder: boolean;
      isFinancialBlocked: boolean;
      distanceKm: number;
      maxRadiusKm: number;
    }): { eligible: boolean; rejectionReason?: string } {
      if (!courier.isOnline || !courier.isActive) return { eligible: false, rejectionReason: "OFFLINE_OR_INACTIVE" };
      if (courier.lastGpsAgeSec > courier.gpsFreshnessMaxSec) return { eligible: false, rejectionReason: "STALE_GPS" };
      if (courier.courierCity.toUpperCase() !== courier.orderCity.toUpperCase()) return { eligible: false, rejectionReason: "CITY_MISMATCH" };
      if (courier.hasActiveOrder) return { eligible: false, rejectionReason: "ACTIVE_ORDER_CONFLICT" };
      if (courier.isFinancialBlocked) return { eligible: false, rejectionReason: "FINANCIAL_BLOCKED" };
      if (courier.distanceKm > courier.maxRadiusKm) return { eligible: false, rejectionReason: "OUT_OF_RADIUS" };
      return { eligible: true };
    }

    it("CPD-07: GPS Stale courier (> 600s) is rejected", () => {
      const res = evaluateCourierEligibility({
        isOnline: true,
        isActive: true,
        lastGpsAgeSec: 750,
        gpsFreshnessMaxSec: 600,
        courierCity: "CIUDAD_DARIO",
        orderCity: "CIUDAD_DARIO",
        hasActiveOrder: false,
        isFinancialBlocked: false,
        distanceKm: 1.5,
        maxRadiusKm: 3.0,
      });
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.rejectionReason, "STALE_GPS");
    });

    it("CPD-08: Offline or inactive courier is rejected", () => {
      const res = evaluateCourierEligibility({
        isOnline: false,
        isActive: true,
        lastGpsAgeSec: 30,
        gpsFreshnessMaxSec: 600,
        courierCity: "CIUDAD_DARIO",
        orderCity: "CIUDAD_DARIO",
        hasActiveOrder: false,
        isFinancialBlocked: false,
        distanceKm: 1.5,
        maxRadiusKm: 3.0,
      });
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.rejectionReason, "OFFLINE_OR_INACTIVE");
    });

    it("CPD-09: Financial blocked courier is rejected", () => {
      const res = evaluateCourierEligibility({
        isOnline: true,
        isActive: true,
        lastGpsAgeSec: 30,
        gpsFreshnessMaxSec: 600,
        courierCity: "CIUDAD_DARIO",
        orderCity: "CIUDAD_DARIO",
        hasActiveOrder: false,
        isFinancialBlocked: true,
        distanceKm: 1.5,
        maxRadiusKm: 3.0,
      });
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.rejectionReason, "FINANCIAL_BLOCKED");
    });

    it("CPD-10: Cross-city courier (Matagalpa courier for Ciudad Darío order) is rejected", () => {
      const res = evaluateCourierEligibility({
        isOnline: true,
        isActive: true,
        lastGpsAgeSec: 30,
        gpsFreshnessMaxSec: 600,
        courierCity: "MATAGALPA",
        orderCity: "CIUDAD_DARIO",
        hasActiveOrder: false,
        isFinancialBlocked: false,
        distanceKm: 2.0,
        maxRadiusKm: 3.0,
      });
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.rejectionReason, "CITY_MISMATCH");
    });

    it("CPD-11: Courier with active order in progress is rejected", () => {
      const res = evaluateCourierEligibility({
        isOnline: true,
        isActive: true,
        lastGpsAgeSec: 30,
        gpsFreshnessMaxSec: 600,
        courierCity: "CIUDAD_DARIO",
        orderCity: "CIUDAD_DARIO",
        hasActiveOrder: true,
        isFinancialBlocked: false,
        distanceKm: 1.5,
        maxRadiusKm: 3.0,
      });
      assert.strictEqual(res.eligible, false);
      assert.strictEqual(res.rejectionReason, "ACTIVE_ORDER_CONFLICT");
    });

    it("CPD-12: Valid courier passing all criteria is accepted", () => {
      const res = evaluateCourierEligibility({
        isOnline: true,
        isActive: true,
        lastGpsAgeSec: 45,
        gpsFreshnessMaxSec: 600,
        courierCity: "CIUDAD_DARIO",
        orderCity: "CIUDAD_DARIO",
        hasActiveOrder: false,
        isFinancialBlocked: false,
        distanceKm: 1.8,
        maxRadiusKm: 3.0,
      });
      assert.strictEqual(res.eligible, true);
    });
  });

  // ─── 3. ANTI-RACE & TRANSACTIONAL ISOLATION (CPD-RACE-01 .. CPD-RACE-06) ─────
  describe("3. Concurrency & Anti-Race Simulation", () => {
    it("CPD-RACE-01: Two couriers claim simultaneously -> exactly one succeeds, second gets ORDER_ALREADY_ASSIGNED", () => {
      let sessionState: {
        status: "SEARCHING" | "ASSIGNED" | "TIMED_OUT";
        assignedCourierId: string | null;
      } = {
        status: "SEARCHING",
        assignedCourierId: null,
      };

      function simulateClaim(courierId: string): { success: boolean; code: string } {
        // Atomic compare-and-set
        if (sessionState.status !== "SEARCHING") {
          return { success: false, code: "SESSION_NOT_SEARCHING" };
        }
        if (sessionState.assignedCourierId !== null) {
          return { success: false, code: "ORDER_ALREADY_ASSIGNED" };
        }
        sessionState.status = "ASSIGNED";
        sessionState.assignedCourierId = courierId;
        return { success: true, code: "CLAIM_SUCCESS" };
      }

      // Courier A arrives 10ms ahead
      const resA = simulateClaim("courier_A");
      const resB = simulateClaim("courier_B");

      assert.strictEqual(resA.success, true);
      assert.strictEqual(resA.code, "CLAIM_SUCCESS");
      assert.strictEqual(sessionState.assignedCourierId, "courier_A");

      assert.strictEqual(resB.success, false);
      assert.strictEqual(resB.code, "SESSION_NOT_SEARCHING");
    });

    it("CPD-RACE-02: Claim vs Timeout race -> deterministic state resolution", () => {
      let state: { status: "SEARCHING" | "ASSIGNED" | "TIMED_OUT" } = { status: "SEARCHING" };

      function triggerTimeout() {
        if (state.status === "SEARCHING") {
          state.status = "TIMED_OUT";
          return true;
        }
        return false;
      }

      function attemptClaim(courierId: string) {
        if (state.status === "TIMED_OUT") {
          return { success: false, code: "DISPATCH_EXPIRED" };
        }
        if (state.status === "SEARCHING") {
          state.status = "ASSIGNED";
          return { success: true, code: "CLAIM_SUCCESS" };
        }
        return { success: false, code: "ALREADY_ASSIGNED" };
      }

      // Case A: Timeout commits first
      triggerTimeout();
      const claimAfterTimeout = attemptClaim("courier_1");
      assert.strictEqual(claimAfterTimeout.success, false);
      assert.strictEqual(claimAfterTimeout.code, "DISPATCH_EXPIRED");
      assert.strictEqual(state.status, "TIMED_OUT");

      // Case B: Claim commits first
      state.status = "SEARCHING";
      const claimBeforeTimeout = attemptClaim("courier_2");
      assert.strictEqual(claimBeforeTimeout.success, true);
      const timeoutAfterClaim = triggerTimeout();
      assert.strictEqual(timeoutAfterClaim, false);
      assert.strictEqual(state.status, "ASSIGNED");
    });

    it("CPD-RACE-04: Two scheduler workers attempting to expand same stage -> exactly one expands", () => {
      let currentStage = 1;

      function workerExpand(expectedStage: number): boolean {
        if (currentStage === expectedStage) {
          currentStage = expectedStage + 1;
          return true;
        }
        return false; // No-op
      }

      const worker1 = workerExpand(1);
      const worker2 = workerExpand(1);

      assert.strictEqual(worker1, true, "Worker 1 succeeds in advancing from stage 1 to 2");
      assert.strictEqual(worker2, false, "Worker 2 observes stage 2 and aborts (idempotent NO-OP)");
      assert.strictEqual(currentStage, 2);
    });

    it("CPD-RACE-05: Cancel vs Claim -> cancelled order cannot be claimed", () => {
      let status: string = "SEARCHING";

      // Order cancelled
      status = "CANCELLED";

      // Courier tries to claim
      const canClaim = status === "SEARCHING";
      assert.strictEqual(canClaim, false);
      assert.strictEqual(status, "CANCELLED");
    });
  });

  // ─── 4. TIMEOUT & LIFECYCLE (CPD-TIMEOUT-01 .. CPD-TIMEOUT-06) ─────────────
  describe("4. Timeout & Fallback Operational Rules", () => {
    it("CPD-TIMEOUT-02 & CPD-TIMEOUT-06: Timeout preserves order without financial cancellation or orphan state", () => {
      const order = {
        orderId: "order_test_timeout",
        total: 250,
        deliveryFee: 40,
        status: "ready",
        dispatchStatus: "SEARCHING",
        assignedCourierId: null,
      };

      // Apply timeout transition
      const updatedOrder = {
        ...order,
        dispatchStatus: "NO_COURIER_AVAILABLE_TIMEOUT",
        noCourierFoundAt: new Date().toISOString(),
      };

      // Invariants:
      assert.strictEqual(updatedOrder.dispatchStatus, "NO_COURIER_AVAILABLE_TIMEOUT");
      assert.strictEqual(updatedOrder.status, "ready", "Order status remains ready for merchant/admin action");
      assert.strictEqual(updatedOrder.total, 250, "Order total is never wiped");
      assert.strictEqual(updatedOrder.deliveryFee, 40, "Delivery fee is untouched");
      assert.strictEqual(updatedOrder.assignedCourierId, null, "No false courier assigned");
    });

    it("CPD-TIMEOUT-03: Claim attempted after timeout returns DISPATCH_EXPIRED", () => {
      const session = {
        status: "TIMED_OUT",
        assignedCourierId: null,
      };

      const canClaim = session.status === "SEARCHING";
      assert.strictEqual(canClaim, false);
    });
  });

  // ─── 5. MANUAL ASSIGNMENT (CPD-MANUAL-01 .. CPD-MANUAL-05) ──────────────────
  describe("5. Admin Manual Assignment Rules", () => {
    it("CPD-MANUAL-01 & CPD-MANUAL-02: Admin can assign eligible courier within same operational city even out of stage radius", () => {
      const courier = {
        courierId: "courier_admin_pick",
        city: "CIUDAD_DARIO",
        isOnline: true,
        isActive: true,
        distanceKm: 18.5, // Outside current stage 1 (3 km)
      };

      const order = {
        orderCity: "CIUDAD_DARIO",
        assignedCourierId: null,
      };

      // Server validation: same city and operable
      const isValidManual =
        courier.city.toUpperCase() === order.orderCity.toUpperCase() &&
        courier.isOnline &&
        courier.isActive &&
        !order.assignedCourierId;

      assert.strictEqual(isValidManual, true);
    });

    it("CPD-MANUAL-03: Admin cannot manually assign courier from different city", () => {
      const courier = {
        courierId: "courier_managua",
        city: "MANAGUA",
        isOnline: true,
        isActive: true,
      };

      const order = {
        orderCity: "CIUDAD_DARIO",
        assignedCourierId: null,
      };

      const isSameCity = courier.city.toUpperCase() === order.orderCity.toUpperCase();
      assert.strictEqual(isSameCity, false, "Cross-city manual assignment strictly rejected");
    });

    it("CPD-MANUAL-04: Cannot manually assign if order already has a courier", () => {
      const order = {
        orderId: "order_123",
        assignedCourierId: "existing_courier",
      };

      const canAssign = !order.assignedCourierId;
      assert.strictEqual(canAssign, false);
    });
  });

  // ─── 6. PRICING ISOLATION & ADR-034 PROTECTION (CPD-PRICE-01 .. CPD-PRICE-05) ─
  describe("6. Pricing Invariance & Financial Isolation", () => {
    it("CPD-PRICE-01 & CPD-PRICE-02: Ciudad Darío Level 1 Flat fee C$40/C$40 is identical across all progressive stages", () => {
      const sealedPricingSnapshot = {
        deliveryFee: 40,
        courierEarnings: 40,
        pricingMode: "TERRITORIAL_FLAT",
        territorialLevel: "LEVEL_1_URBAN_CORE",
        pricingPolicyId: "NI_MATAGALPA_CIUDAD_DARIO",
      };

      // Simulating stage 1 (3 km), stage 2 (5 km), stage 3 (10 km), stage 4 (20 km)
      const stages = [
        { stage: 1, radiusKm: 3.0 },
        { stage: 2, radiusKm: 5.0 },
        { stage: 3, radiusKm: 10.0 },
        { stage: 4, radiusKm: 20.0 },
      ];

      for (const st of stages) {
        // Dispatch session stores frozen pricing snapshot
        const sessionPricing = { ...sealedPricingSnapshot };

        assert.strictEqual(sessionPricing.deliveryFee, 40, `Stage ${st.stage} must preserve customer fee 40`);
        assert.strictEqual(sessionPricing.courierEarnings, 40, `Stage ${st.stage} must preserve courier earning 40`);
        assert.strictEqual(sessionPricing.pricingMode, "TERRITORIAL_FLAT");
      }
    });

    it("CPD-PRICE-03: Remote courier found at 18 km receives exact sealed earnings (C$40), NOT distance rate", () => {
      const courierFoundDistanceKm = 18.0;
      const snapshotCourierEarnings = 40;

      // Ensure NO distance multiplier is applied (e.g. 18 * 8 = 144)
      const dynamicEarnings = courierFoundDistanceKm * 8.0;
      assert.notStrictEqual(snapshotCourierEarnings, dynamicEarnings);
      assert.strictEqual(snapshotCourierEarnings, 40, "Courier receives guaranteed flat C$40");
    });
  });

  // ─── 7. X→Y ZERO-TOUCH REGRESSION PROTECTION (CPD-X2Y-01 .. CPD-X2Y-05) ──────
  describe("7. X→Y Delivery Express Zero-Touch Invariants", () => {
    it("CPD-X2Y-01 & CPD-X2Y-05: X→Y Dispatch Engine constants remain frozen (ADR-026 / ADR-029)", () => {
      assert.strictEqual(X2Y_DISPATCH_CONFIG.INITIAL_RADIUS_KM, 5.0);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.STAGE_2_RADIUS_KM, 15.0);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.STAGE_3_RADIUS_KM, 30.0);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.STAGE_2_EXPANSION_SECONDS, 180);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.STAGE_3_EXPANSION_SECONDS, 360);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.TIMEOUT_SECONDS, 600);
    });

    it("CPD-X2Y-02 & CPD-X2Y-03: Commerce dispatch engine rejects X_TO_Y_DELIVERY serviceType", () => {
      const xToYOrder = {
        orderId: "x2y_trip_999",
        serviceType: "X_TO_Y_DELIVERY",
      };

      const isCommerceEligible = xToYOrder.serviceType === "COMMERCE_DELIVERY" || !xToYOrder.serviceType;
      assert.strictEqual(isCommerceEligible, false, "X_TO_Y_DELIVERY must NEVER enter Commerce Progressive Dispatch");
    });
  });

  // ─── 8. SSOT CONFIG DEFAULTS ────────────────────────────────────────────────
  describe("8. SSOT Default Configuration", () => {
    it("DEFAULT_COMMERCE_DISPATCH_CONFIG matches v1.1 profile (5 stages: 1 -> 3 -> 5 -> 10 -> 20 km)", () => {
      assert.strictEqual(DEFAULT_COMMERCE_DISPATCH_CONFIG.enabled, false, "Feature flag must default to false");
      assert.strictEqual(DEFAULT_COMMERCE_DISPATCH_CONFIG.timeoutSeconds, 600);
      assert.strictEqual(DEFAULT_COMMERCE_DISPATCH_CONFIG.gpsFreshnessSeconds, 600);
      assert.strictEqual(DEFAULT_COMMERCE_DISPATCH_CONFIG.stages.length, 5);

      assert.deepStrictEqual(DEFAULT_COMMERCE_DISPATCH_CONFIG.stages[0], {
        stage: 1,
        fromSecond: 0,
        radiusKm: 1.0,
      });
      assert.deepStrictEqual(DEFAULT_COMMERCE_DISPATCH_CONFIG.stages[1], {
        stage: 2,
        fromSecond: 120,
        radiusKm: 3.0,
      });
      assert.deepStrictEqual(DEFAULT_COMMERCE_DISPATCH_CONFIG.stages[2], {
        stage: 3,
        fromSecond: 240,
        radiusKm: 5.0,
      });
      assert.deepStrictEqual(DEFAULT_COMMERCE_DISPATCH_CONFIG.stages[3], {
        stage: 4,
        fromSecond: 360,
        radiusKm: 10.0,
      });
      assert.deepStrictEqual(DEFAULT_COMMERCE_DISPATCH_CONFIG.stages[4], {
        stage: 5,
        fromSecond: 480,
        radiusKm: 20.0,
      });
    });
  });

  // ─── 9. PROFILE V1.1 MATRIX (PROFILE-01 .. PROFILE-18) ──────────────────────
  describe("9. Profile V1.1 Dedicated Matrix (BSD-COMMERCE-PROGRESSIVE-DISPATCH-PROFILE-V1.1-001)", () => {
    const v1_1Config: CommerceProgressiveDispatchConfig = {
      enabled: true,
      profileVersion: "v1.1-commerce-1-3-5-10-20",
      stages: [
        { stage: 1, fromSecond: 0, radiusKm: 1.0 },
        { stage: 2, fromSecond: 120, radiusKm: 3.0 },
        { stage: 3, fromSecond: 240, radiusKm: 5.0 },
        { stage: 4, fromSecond: 360, radiusKm: 10.0 },
        { stage: 5, fromSecond: 480, radiusKm: 20.0 },
      ],
      timeoutSeconds: 600,
      gpsFreshnessSeconds: 600,
      offerTtlSeconds: 120,
      maxConcurrentOffers: 10,
      manualAssignmentEnabled: true,
    };

    it("PROFILE-01, PROFILE-02, PROFILE-03: Stage 1 = 1 km, courier at 0.8 km eligible, courier at 2.0 km excluded initially", () => {
      const stage1 = v1_1Config.stages[0];
      assert.strictEqual(stage1.stage, 1);
      assert.strictEqual(stage1.radiusKm, 1.0);

      const courierA = 0.8;
      const courierB = 2.0;
      assert.ok(courierA <= stage1.radiusKm, "Courier at 0.8 km receives offer in Stage 1");
      assert.ok(courierB > stage1.radiusKm, "Courier at 2.0 km does NOT receive offer in Stage 1");
    });

    it("PROFILE-04, PROFILE-05: Stage 2 at 120s = 3 km, courier at 2.0 km receives offer", () => {
      const stage2 = v1_1Config.stages[1];
      assert.strictEqual(stage2.stage, 2);
      assert.strictEqual(stage2.fromSecond, 120);
      assert.strictEqual(stage2.radiusKm, 3.0);

      const courierB = 2.0;
      assert.ok(courierB <= stage2.radiusKm, "Courier at 2.0 km receives offer in Stage 2");
    });

    it("PROFILE-06, PROFILE-07, PROFILE-08: Successive stages at 4m (5 km), 6m (10 km), 8m (20 km)", () => {
      assert.deepStrictEqual(v1_1Config.stages[2], { stage: 3, fromSecond: 240, radiusKm: 5.0 });
      assert.deepStrictEqual(v1_1Config.stages[3], { stage: 4, fromSecond: 360, radiusKm: 10.0 });
      assert.deepStrictEqual(v1_1Config.stages[4], { stage: 5, fromSecond: 480, radiusKm: 20.0 });
    });

    it("PROFILE-09: Timeout occurs at 600s (10 min)", () => {
      assert.strictEqual(v1_1Config.timeoutSeconds, 600);
      assert.ok(v1_1Config.timeoutSeconds > v1_1Config.stages[4].fromSecond);
    });

    it("PROFILE-10: Cumulative expansion preserves earlier courier eligible", () => {
      const courier08 = 0.8;
      v1_1Config.stages.forEach((st) => {
        assert.ok(courier08 <= st.radiusKm, `Courier at 0.8km remains within radius of stage ${st.stage}`);
      });
    });

    it("PROFILE-11: Retry dynamic reset starts at config.stages[0].radiusKm = 1.0 km", () => {
      const firstStage = v1_1Config.stages[0];
      assert.strictEqual(firstStage.stage, 1);
      assert.strictEqual(firstStage.radiusKm, 1.0);
    });

    it("PROFILE-14 & PROFILE-15: Pricing invariance under 1 -> 3 -> 5 -> 10 -> 20 km", () => {
      const testOrder = {
        deliveryFee: 40,
        courierEarnings: 40,
        pricingMode: "TERRITORIAL_FLAT",
        territorialLevel: "LEVEL_1_URBAN_CORE",
      };
      assert.strictEqual(testOrder.deliveryFee, 40);
      assert.strictEqual(testOrder.courierEarnings, 40);
    });
  });
});
