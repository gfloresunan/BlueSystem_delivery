/**
 * COURIER-RATE-SSOT-REMEDIATION-004 — Test Suite
 *
 * Tests SSOT-001 through SSOT-021 verifying:
 * 1. Admin rate override of client-supplied rate (Zero-Trust)
 * 2. Commission override isolation (rate independent of commission)
 * 3. Config failure fail-closed (no 7.0 fallback)
 * 4. Null/invalid/negative config rejection
 * 5. Historical immutability
 * 6. Mathematical correctness at rates 7, 8, 10
 * 7. Courier consumer hardening (no invented rate)
 *
 * NO production data. All mocks/fixtures.
 */
import { describe, it } from "node:test";
import * as assert from "assert";

// ────────────────────────────────────────────────────────────────────────────────
// MOCK: system_config/global
// ────────────────────────────────────────────────────────────────────────────────
interface MockGlobalConfig {
  courierRatePerKm: number | null | undefined;
  courierOrderBonus?: number;
  courierRatePolicyVersion?: number;
  merchantCommissionRate?: number;
}

// ────────────────────────────────────────────────────────────────────────────────
// PURE FUNCTION: Replicate the authoritative rate resolution logic from orders.ts
// (notifyNewOrder) after COURIER-RATE-SSOT-REMEDIATION-004
// ────────────────────────────────────────────────────────────────────────────────
interface ResolveRateParams {
  globalConfig: MockGlobalConfig | null; // null = config read failure
  clientPayload: {
    courierRatePerKmApplied?: number | null;
    courierDistanceEarnings?: number;
    courierTotalEarnings?: number;
    courierOrderBonusApplied?: number;
  };
  bizCommissionOverrideRate?: number | null;
  routeDistanceMeters: number;
  tipAmount: number;
}

interface ResolveRateResult {
  courierRatePerKmApplied: number; // 0 = fail-closed
  courierOrderBonus: number;
  courierDistanceEarnings: number;
  courierBonusEarnings: number;
  courierTipEarnings: number;
  courierTotalEarnings: number;
  rateResolutionFailed: boolean;
}

function resolveCourierRate(params: ResolveRateParams): ResolveRateResult {
  const { globalConfig, clientPayload, routeDistanceMeters, tipAmount } = params;

  // CR-002: Client payload is IGNORED. Backend resolves from global config only.
  let courierRatePerKm: number | null = null;
  let courierOrderBonus = 0.0;

  // CR-003: Global config is ALWAYS read, independent of commission override
  if (globalConfig != null) {
    if (globalConfig.courierRatePerKm != null) {
      courierRatePerKm = Number(globalConfig.courierRatePerKm);
    }
    if (globalConfig.courierOrderBonus != null) {
      courierOrderBonus = Number(globalConfig.courierOrderBonus);
    }
  }

  // CR-004: Fail-closed validation — no hardcoded 7.0
  let rateResolutionFailed = false;
  if (courierRatePerKm == null || isNaN(courierRatePerKm) || courierRatePerKm <= 0) {
    rateResolutionFailed = true;
    courierRatePerKm = null;
  }

  const effectiveCourierRate = courierRatePerKm ?? 0;
  const ratePerKmCents = Math.round(effectiveCourierRate * 100);
  const distanceEarningsCents = courierRatePerKm != null ? Math.round((routeDistanceMeters * ratePerKmCents) / 1000) : 0;
  const bonusEarningsCents = courierRatePerKm != null ? Math.round(courierOrderBonus * 100) : 0;
  const tipEarningsCents = Math.round(tipAmount * 100);
  const courierTotalEarningsCents = distanceEarningsCents + bonusEarningsCents + tipEarningsCents;

  return {
    courierRatePerKmApplied: effectiveCourierRate,
    courierOrderBonus,
    courierDistanceEarnings: Math.round(distanceEarningsCents) / 100,
    courierBonusEarnings: Math.round(bonusEarningsCents) / 100,
    courierTipEarnings: Math.round(tipEarningsCents) / 100,
    courierTotalEarnings: Math.round(courierTotalEarningsCents) / 100,
    rateResolutionFailed,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// PURE FUNCTION: Replicate historical finance logic (onOrderDelivered)
// Uses sealed snapshot from order, NOT current global config
// ────────────────────────────────────────────────────────────────────────────────
function computeHistoricalFinance(orderSnapshot: {
  courierRatePerKmApplied: number;
  routeDistanceMeters: number;
  tipAmount: number;
  courierOrderBonusApplied: number;
}): { distanceEarnings: number; totalEarnings: number } {
  const ratePerKmCents = Math.round(orderSnapshot.courierRatePerKmApplied * 100);
  const distanceEarningsCents = Math.round((orderSnapshot.routeDistanceMeters * ratePerKmCents) / 1000);
  const bonusCents = Math.round(orderSnapshot.courierOrderBonusApplied * 100);
  const tipCents = Math.round(orderSnapshot.tipAmount * 100);
  const totalCents = distanceEarningsCents + bonusCents + tipCents;

  return {
    distanceEarnings: Math.round(distanceEarningsCents) / 100,
    totalEarnings: Math.round(totalCents) / 100,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// PURE FUNCTION: Replicate Courier Android rate consumption (CR-005)
// ────────────────────────────────────────────────────────────────────────────────
function courierConsumeRate(snapshotValue: number | null | undefined): number {
  // After CR-005 fix: no 7.0 fallback, returns 0.0 if missing
  const parsed = snapshotValue != null ? Number(snapshotValue) : null;
  return (parsed != null && parsed > 0.0) ? parsed : 0.0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════════

describe("COURIER-RATE-SSOT-REMEDIATION-004", () => {
  const DISTANCE_4_2_KM_METERS = 4200;
  const TIP_40 = 40.0;

  // ─── SSOT-001: Admin=8, Customer attempts 7 → Applied must be 8 ──────────
  it("SSOT-001: Admin=8, Customer sends rate=7, new order must use 8", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 8 },
      clientPayload: { courierRatePerKmApplied: 7 },
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 8, "Applied rate must be 8, NOT 7");
    assert.strictEqual(result.rateResolutionFailed, false);
  });

  // ─── SSOT-002: Admin=10, Customer attempts 7 → Applied must be 10 ────────
  it("SSOT-002: Admin=10, Customer sends rate=7, new order must use 10", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 10 },
      clientPayload: { courierRatePerKmApplied: 7 },
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 10, "Applied rate must be 10, NOT 7");
  });

  // ─── SSOT-003: Admin=8, Merchant has commissionOverrideRate → Applied=8 ──
  it("SSOT-003: Admin=8, merchant has commission override, rate must still be 8", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 8, merchantCommissionRate: 0.15 },
      clientPayload: {},
      bizCommissionOverrideRate: 0.10,
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 8, "Commission override must NOT affect courier rate");
  });

  // ─── SSOT-004: Admin=10, Merchant has commissionOverrideRate → Applied=10 ─
  it("SSOT-004: Admin=10, merchant has commission override, rate must still be 10", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 10, merchantCommissionRate: 0.15 },
      clientPayload: {},
      bizCommissionOverrideRate: 0.12,
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 10, "Commission override must NOT affect courier rate");
  });

  // ─── SSOT-005: Admin config missing → NO rate=7, fail-closed ─────────────
  it("SSOT-005: Admin config missing, must NOT fallback to 7", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: null },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 0, "Must NOT be 7");
    assert.strictEqual(result.rateResolutionFailed, true, "Must report resolution failure");
    assert.strictEqual(result.courierDistanceEarnings, 0, "No earnings without valid rate");
  });

  // ─── SSOT-006: Config read throws exception → NO rate=7 ──────────────────
  it("SSOT-006: Config read failure (null config), must NOT fallback to 7", () => {
    const result = resolveCourierRate({
      globalConfig: null, // Simulates Firestore exception
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 0, "Must NOT be 7");
    assert.strictEqual(result.rateResolutionFailed, true);
  });

  // ─── SSOT-007: courierRatePerKm = null → NO rate=7 ───────────────────────
  it("SSOT-007: courierRatePerKm is null, must NOT fallback to 7", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: null },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.notStrictEqual(result.courierRatePerKmApplied, 7, "MUST NOT be 7");
    assert.strictEqual(result.rateResolutionFailed, true);
  });

  // ─── SSOT-008: courierRatePerKm = 0 → controlled failure ─────────────────
  it("SSOT-008: courierRatePerKm is 0, must not convert to 7", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 0 },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 0, "Zero rate remains zero");
    assert.strictEqual(result.rateResolutionFailed, true, "Zero is not a valid financial rate");
  });

  // ─── SSOT-009: courierRatePerKm = -5 → reject, no negative payout ────────
  it("SSOT-009: Negative courierRatePerKm, must reject", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: -5 },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 0, "Negative rate must be rejected");
    assert.strictEqual(result.rateResolutionFailed, true);
    assert.strictEqual(result.courierDistanceEarnings, 0, "No negative payout");
  });

  // ─── SSOT-010: Admin=8, Customer sends rate=1000 → Applied=8 ─────────────
  it("SSOT-010: Zero-Trust — Customer sends rate=1000, Admin=8, Applied must be 8", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 8 },
      clientPayload: { courierRatePerKmApplied: 1000 },
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: 0,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 8, "Client manipulation must be ignored");
  });

  // ─── SSOT-011: Configuration change propagation + historical immutability ─
  it("SSOT-011: Admin 7→8→10, historical orders remain immutable", () => {
    // Order A at rate 7
    const orderA = resolveCourierRate({
      globalConfig: { courierRatePerKm: 7 },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
    });
    assert.strictEqual(orderA.courierRatePerKmApplied, 7);

    // Admin changes to 8 → Order B
    const orderB = resolveCourierRate({
      globalConfig: { courierRatePerKm: 8 },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
    });
    assert.strictEqual(orderB.courierRatePerKmApplied, 8);

    // Admin changes to 10 → Order C
    const orderC = resolveCourierRate({
      globalConfig: { courierRatePerKm: 10 },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
    });
    assert.strictEqual(orderC.courierRatePerKmApplied, 10);

    // Historical: Order A snapshot (rate=7) must remain 7 even after global changed to 10
    const histA = computeHistoricalFinance({
      courierRatePerKmApplied: orderA.courierRatePerKmApplied,
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
      courierOrderBonusApplied: 0,
    });
    assert.strictEqual(histA.distanceEarnings, 29.40, "Historical Order A must remain 29.40");
    assert.strictEqual(histA.totalEarnings, 69.40, "Historical Order A total must remain 69.40");

    // Order B snapshot (rate=8) must remain 8
    const histB = computeHistoricalFinance({
      courierRatePerKmApplied: orderB.courierRatePerKmApplied,
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
      courierOrderBonusApplied: 0,
    });
    assert.strictEqual(histB.distanceEarnings, 33.60, "Historical Order B must be 33.60");
  });

  // ─── SSOT-012: Historical finance immutability after config change ────────
  it("SSOT-012: Finance processes historical order with sealed rate, not current global", () => {
    // Order A was sealed at rate=7
    const histA = computeHistoricalFinance({
      courierRatePerKmApplied: 7,
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
      courierOrderBonusApplied: 0,
    });
    assert.strictEqual(histA.distanceEarnings, 29.40);
    assert.strictEqual(histA.totalEarnings, 69.40);

    // Even though Admin now has 10, Order A must remain at 7
    // (The test proves the function uses snapshot, not current global)
    assert.notStrictEqual(histA.distanceEarnings, 42.00, "MUST NOT recalculate with current rate 10");
    assert.notStrictEqual(histA.totalEarnings, 82.00, "MUST NOT recalculate with current rate 10");
  });

  // ─── SSOT-013 through SSOT-015: Mathematical correctness at rates 7, 8, 10
  it("SSOT-013: Rate=7, 4.2km, tip=40 → distance=29.40, total=69.40", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 7 },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
    });
    assert.strictEqual(result.courierDistanceEarnings, 29.40);
    assert.strictEqual(result.courierTotalEarnings, 69.40);
  });

  it("SSOT-014: Rate=8, 4.2km, tip=40 → distance=33.60, total=73.60", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 8 },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
    });
    assert.strictEqual(result.courierDistanceEarnings, 33.60);
    assert.strictEqual(result.courierTotalEarnings, 73.60);
  });

  it("SSOT-015: Rate=10, 4.2km, tip=40 → distance=42.00, total=82.00", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 10 },
      clientPayload: {},
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
    });
    assert.strictEqual(result.courierDistanceEarnings, 42.00);
    assert.strictEqual(result.courierTotalEarnings, 82.00);
  });

  // ─── SSOT-016: Zero-Trust — malicious client payload ──────────────────────
  it("SSOT-016: Malicious client payload with rate=7, earnings=1 while Admin=10", () => {
    const result = resolveCourierRate({
      globalConfig: { courierRatePerKm: 10 },
      clientPayload: {
        courierRatePerKmApplied: 7,
        courierDistanceEarnings: 1,
        courierTotalEarnings: 1,
      },
      routeDistanceMeters: DISTANCE_4_2_KM_METERS,
      tipAmount: TIP_40,
    });
    assert.strictEqual(result.courierRatePerKmApplied, 10, "Admin rate wins");
    assert.strictEqual(result.courierDistanceEarnings, 42.00, "Server-computed, not client");
    assert.strictEqual(result.courierTotalEarnings, 82.00, "Server-computed, not client");
  });

  // ─── SSOT-017: Zero-Trust extreme — various manipulated rates ─────────────
  it("SSOT-017: Extreme manipulation — rate=0, 7, 100, earnings=999999", () => {
    const adminRate = 10;
    const manipulations = [
      { courierRatePerKmApplied: 0 },
      { courierRatePerKmApplied: 7 },
      { courierRatePerKmApplied: 100 },
      { courierRatePerKmApplied: 0, courierDistanceEarnings: 999999 },
      { courierRatePerKmApplied: 0, courierTotalEarnings: 999999 },
    ];

    for (const payload of manipulations) {
      const result = resolveCourierRate({
        globalConfig: { courierRatePerKm: adminRate },
        clientPayload: payload,
        routeDistanceMeters: DISTANCE_4_2_KM_METERS,
        tipAmount: 0,
      });
      assert.strictEqual(
        result.courierRatePerKmApplied,
        adminRate,
        `Client payload ${JSON.stringify(payload)} must NOT override admin rate`
      );
    }
  });

  // ─── SSOT-018: Courier missing snapshot → NO 7.0, NO invented rate ────────
  it("SSOT-018: Courier consumes missing snapshot, must NOT invent 7.0", () => {
    const rate = courierConsumeRate(null);
    assert.strictEqual(rate, 0.0, "Missing snapshot must NOT produce 7.0");

    const rateUndefined = courierConsumeRate(undefined);
    assert.strictEqual(rateUndefined, 0.0, "Undefined snapshot must NOT produce 7.0");
  });

  // ─── SSOT-019: Courier consumes valid snapshot ────────────────────────────
  it("SSOT-019: Courier consumes valid snapshot=8, returns 8", () => {
    const rate = courierConsumeRate(8);
    assert.strictEqual(rate, 8, "Valid snapshot must be consumed as-is");
  });

  // ─── SSOT-020: Courier consumes zero snapshot → 0 (not 7) ────────────────
  it("SSOT-020: Courier consumes snapshot=0, returns 0 (not 7)", () => {
    const rate = courierConsumeRate(0);
    assert.strictEqual(rate, 0.0, "Zero snapshot must remain 0, NOT become 7");
  });

  // ─── SSOT-021: Commission matrix — rate always independent of commission ──
  it("SSOT-021: Commission matrix — rate always independent of commission override", () => {
    const matrix = [
      { rate: 7, hasOverride: false },
      { rate: 8, hasOverride: false },
      { rate: 10, hasOverride: false },
      { rate: 7, hasOverride: true },
      { rate: 8, hasOverride: true },
      { rate: 10, hasOverride: true },
    ];

    for (const { rate, hasOverride } of matrix) {
      const result = resolveCourierRate({
        globalConfig: { courierRatePerKm: rate, merchantCommissionRate: 0.15 },
        clientPayload: {},
        bizCommissionOverrideRate: hasOverride ? 0.10 : null,
        routeDistanceMeters: DISTANCE_4_2_KM_METERS,
        tipAmount: 0,
      });
      assert.strictEqual(
        result.courierRatePerKmApplied,
        rate,
        `Rate=${rate}, Override=${hasOverride}: Applied must be ${rate}`
      );
    }
  });
});
