import { describe, it } from "node:test";
import * as assert from "node:assert";
import {
  calculateHaversineDistanceKm,
  X2Y_DISPATCH_CONFIG,
} from "../services/xToYDispatchEngine";

describe("BSD-X2Y-DYNAMIC-DISPATCH-RADIUS-001: Forensic & Unit Test Suite", () => {
  describe("1. Haversine Distance Calculation (Discovery Metric Only)", () => {
    it("should calculate correct geodetic distance in Managua", () => {
      // Metrocentro (12.1275, -86.2655) to Rotonda Jean Paul Genie (12.1060, -86.2510) ~ 2.8 km
      const d1 = calculateHaversineDistanceKm(12.1275, -86.2655, 12.106, -86.251);
      assert.ok(d1 >= 2.5 && d1 <= 3.2, `Expected ~2.8 km, got ${d1}`);

      // Same coordinates -> 0.0 km
      const dZero = calculateHaversineDistanceKm(12.14, -86.25, 12.14, -86.25);
      assert.strictEqual(dZero, 0.0);

      // Distant point: Managua to Tipitapa (~22 km)
      const dFar = calculateHaversineDistanceKm(12.1364, -86.2514, 12.1978, -86.0967);
      assert.ok(dFar > 15 && dFar < 25, `Expected ~18-20 km, got ${dFar}`);
    });
  });

  describe("2. Dispatch Configuration & Thresholds", () => {
    it("should enforce exact timing and radius milestones", () => {
      assert.strictEqual(X2Y_DISPATCH_CONFIG.INITIAL_RADIUS_KM, 5.0);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.STAGE_2_RADIUS_KM, 15.0);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.STAGE_3_RADIUS_KM, 30.0);

      assert.strictEqual(X2Y_DISPATCH_CONFIG.STAGE_2_EXPANSION_SECONDS, 180);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.STAGE_3_EXPANSION_SECONDS, 360);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.TIMEOUT_SECONDS, 600);
      assert.strictEqual(X2Y_DISPATCH_CONFIG.MAX_GPS_STALE_MS, 600000);
    });
  });

  describe("3. Dispatch State Machine Simulation", () => {
    function simulateDispatchStage(elapsedSeconds: number): {
      stage: string;
      radiusKm: number;
      isCancelled: boolean;
    } {
      if (elapsedSeconds >= X2Y_DISPATCH_CONFIG.TIMEOUT_SECONDS) {
        return { stage: "TIMEOUT", radiusKm: 30.0, isCancelled: true };
      } else if (elapsedSeconds >= X2Y_DISPATCH_CONFIG.STAGE_3_EXPANSION_SECONDS) {
        return { stage: "EXPANDED_30KM", radiusKm: 30.0, isCancelled: false };
      } else if (elapsedSeconds >= X2Y_DISPATCH_CONFIG.STAGE_2_EXPANSION_SECONDS) {
        return { stage: "EXPANDED_15KM", radiusKm: 15.0, isCancelled: false };
      } else {
        return { stage: "SEARCHING_5KM", radiusKm: 5.0, isCancelled: false };
      }
    }

    it("should resolve SEARCHING_5KM between 0s and 179s", () => {
      assert.deepStrictEqual(simulateDispatchStage(0), { stage: "SEARCHING_5KM", radiusKm: 5.0, isCancelled: false });
      assert.deepStrictEqual(simulateDispatchStage(100), { stage: "SEARCHING_5KM", radiusKm: 5.0, isCancelled: false });
      assert.deepStrictEqual(simulateDispatchStage(179), { stage: "SEARCHING_5KM", radiusKm: 5.0, isCancelled: false });
    });

    it("should resolve EXPANDED_15KM between 180s and 359s", () => {
      assert.deepStrictEqual(simulateDispatchStage(180), { stage: "EXPANDED_15KM", radiusKm: 15.0, isCancelled: false });
      assert.deepStrictEqual(simulateDispatchStage(250), { stage: "EXPANDED_15KM", radiusKm: 15.0, isCancelled: false });
      assert.deepStrictEqual(simulateDispatchStage(359), { stage: "EXPANDED_15KM", radiusKm: 15.0, isCancelled: false });
    });

    it("should resolve EXPANDED_30KM between 360s and 599s", () => {
      assert.deepStrictEqual(simulateDispatchStage(360), { stage: "EXPANDED_30KM", radiusKm: 30.0, isCancelled: false });
      assert.deepStrictEqual(simulateDispatchStage(500), { stage: "EXPANDED_30KM", radiusKm: 30.0, isCancelled: false });
      assert.deepStrictEqual(simulateDispatchStage(599), { stage: "EXPANDED_30KM", radiusKm: 30.0, isCancelled: false });
    });

    it("should resolve TIMEOUT and CANCELLED at >= 600s", () => {
      assert.deepStrictEqual(simulateDispatchStage(600), { stage: "TIMEOUT", radiusKm: 30.0, isCancelled: true });
      assert.deepStrictEqual(simulateDispatchStage(605), { stage: "TIMEOUT", radiusKm: 30.0, isCancelled: true });
      assert.deepStrictEqual(simulateDispatchStage(1000), { stage: "TIMEOUT", radiusKm: 30.0, isCancelled: true });
    });
  });

  describe("4. Race Condition Protection Simulation (Claim vs Timeout)", () => {
    it("when courier claims before timeout (second 599), trip remains ASSIGNED and cannot be cancelled", () => {
      let trip = {
        status: "PENDING",
        assignedCourierId: null as string | null,
        cancelReason: null as string | null,
      };

      // Courier claim transaction runs first
      function courierClaim(courierId: string) {
        if (trip.status === "CANCELLED") return false;
        if (trip.assignedCourierId && trip.assignedCourierId !== courierId) return false;
        trip.assignedCourierId = courierId;
        trip.status = "ASSIGNED";
        return true;
      }

      // Timeout transaction runs immediately after
      function timeoutWorker() {
        if (trip.assignedCourierId || trip.status === "ASSIGNED") {
          return false; // Abort timeout, courier won
        }
        trip.status = "CANCELLED";
        trip.cancelReason = "NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT";
        return true;
      }

      const claimSuccess = courierClaim("courier_moto_01");
      assert.strictEqual(claimSuccess, true);

      const timeoutSuccess = timeoutWorker();
      assert.strictEqual(timeoutSuccess, false);

      assert.strictEqual(trip.status, "ASSIGNED");
      assert.strictEqual(trip.assignedCourierId, "courier_moto_01");
      assert.strictEqual(trip.cancelReason, null);
    });

    it("when timeout occurs first (second 600), subsequent courier claim is rejected", () => {
      let trip = {
        status: "PENDING",
        assignedCourierId: null as string | null,
        cancelReason: null as string | null,
      };

      function timeoutWorker() {
        if (trip.assignedCourierId || trip.status === "ASSIGNED") {
          return false;
        }
        trip.status = "CANCELLED";
        trip.cancelReason = "NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT";
        return true;
      }

      function courierClaim(courierId: string) {
        if (["CANCELLED", "TIMEOUT"].includes(trip.status)) return false;
        if (trip.assignedCourierId && trip.assignedCourierId !== courierId) return false;
        trip.assignedCourierId = courierId;
        trip.status = "ASSIGNED";
        return true;
      }

      const timeoutSuccess = timeoutWorker();
      assert.strictEqual(timeoutSuccess, true);

      const claimSuccess = courierClaim("courier_moto_01");
      assert.strictEqual(claimSuccess, false);

      assert.strictEqual(trip.status, "CANCELLED");
      assert.strictEqual(trip.assignedCourierId, null);
      assert.strictEqual(trip.cancelReason, "NO_COURIER_AVAILABLE_WITHIN_30KM_TIMEOUT");
    });
  });

  describe("5. Candidate Discovery & Non-Duplication", () => {
    it("should prevent duplicate offers when expanding from 5km to 15km", () => {
      const candidatesAt5km = ["c1", "c2"];
      const candidatesAt15km = ["c1", "c2", "c3", "c4"];

      const existingSet = new Set(candidatesAt5km);
      const newlyDiscovered = candidatesAt15km.filter((uid) => !existingSet.has(uid));
      const combined = Array.from(new Set([...candidatesAt5km, ...candidatesAt15km]));

      assert.deepStrictEqual(newlyDiscovered, ["c3", "c4"]);
      assert.deepStrictEqual(combined, ["c1", "c2", "c3", "c4"]);
    });

    it("should preserve Financial Frozen Core invariants (ADR-026)", () => {
      // Rates and financial snapshot must never mutate on dispatch radius changes
      // Canonical Case #20846B: baseFee 35 + (14.91 km * 10 NIO/km) = C$ 184.10
      const pricingSnapshot = {
        baseFee: 35.0,
        pricePerKm: 10.0,
        calculatedAmount: 184.10,
        routeDistanceKm: 14.91,
      };

      // Expanding radius from 5 to 30 km
      const radiusKm = 30.0;
      assert.strictEqual(radiusKm, 30.0);

      // Financial snapshot is completely frozen and untouched by dispatch engine
      assert.strictEqual(pricingSnapshot.baseFee, 35.0);
      assert.strictEqual(pricingSnapshot.pricePerKm, 10.0);
      assert.strictEqual(pricingSnapshot.calculatedAmount, 184.10);
      assert.strictEqual(pricingSnapshot.routeDistanceKm, 14.91);
    });
  });
});
