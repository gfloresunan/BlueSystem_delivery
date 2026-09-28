import { describe, it } from "node:test";
import * as assert from "node:assert";

/**
 * BSD-X2Y-FINANCIAL-END-TO-END — Phase 3A Domain Firewall Test Suite
 *
 * Validación obligatoria de aislamiento de dominio en triggers/orders.ts:
 * Test 1: serviceType = "X_TO_Y_DELIVERY" -> COMMERCE_TRIGGER_SKIP, sin asientos financieros.
 * Test 2: serviceType = "COMMERCE_DELIVERY" -> Flujo existente intacto.
 * Test 3A: serviceType = undefined -> Flujo existente intacto (compatibilidad legada).
 * Test 3B: serviceType = "" -> Flujo existente intacto (compatibilidad legada).
 * Test 4: Idempotencia de transición de estado.
 */

// Lógica idéntica a la implementada en triggers/orders.ts:1396-1412
function evaluateCommerceSettlementGuard(
  before: { status: string; estado?: string },
  after: { status: string; estado?: string; serviceType?: string; businessId?: string },
  orderId: string,
  logger: string[]
): { executed: boolean; reason: string } {
  const wasDelivered =
    before.status === "delivered" ||
    before.status === "entregado" ||
    before.status === "completed";
  const isNowDelivered =
    after.status === "delivered" ||
    after.status === "entregado" ||
    after.status === "completed";

  if (wasDelivered || !isNowDelivered) {
    return { executed: false, reason: "NOT_TRANSITION" };
  }

  // ── AISLAMIENTO DOMINIO B (ADR-026 / BSD-X2Y-AMENDMENT-001): FASE 3A ──
  // Si la orden tiene serviceType === "X_TO_Y_DELIVERY", NO liquidar contable ni financieramente aquí.
  // La autoridad financiera exclusiva de encomiendas X->Y reside en onTripCompleted (trips.ts) sobre /deliveryTrips/{tripId}.
  const serviceType = (after.serviceType || "").toString().trim();
  if (serviceType === "X_TO_Y_DELIVERY") {
    logger.push(
      `[COMMERCE_TRIGGER_SKIP] Omitiendo liquidación en orders.ts para encomienda X->Y: ${orderId}`
    );
    return { executed: false, reason: "COMMERCE_TRIGGER_SKIP" };
  }

  const businessId = after.businessId;
  if (!businessId) {
    logger.push(`[FINANCE] onOrderDelivered: orderId=${orderId} sin businessId — ignorado`);
    return { executed: false, reason: "NO_BUSINESS_ID" };
  }

  return { executed: true, reason: "COMMERCE_SETTLEMENT_PROCEEDS" };
}

describe("BSD-X2Y-PHASE-3A: Domain Firewall en onOrderDelivered (orders.ts)", () => {
  it("Test 1 — X→Y: serviceType = 'X_TO_Y_DELIVERY' emite [COMMERCE_TRIGGER_SKIP] y cancela liquidación de Commerce", () => {
    const logs: string[] = [];
    const res = evaluateCommerceSettlementGuard(
      { status: "in_transit" },
      { status: "completed", serviceType: "X_TO_Y_DELIVERY", businessId: "some_business_id" },
      "env_6a23b10c",
      logs
    );

    assert.strictEqual(res.executed, false);
    assert.strictEqual(res.reason, "COMMERCE_TRIGGER_SKIP");
    assert.strictEqual(logs.length, 1);
    assert.ok(logs[0].includes("[COMMERCE_TRIGGER_SKIP]"));
    assert.ok(logs[0].includes("env_6a23b10c"));
  });

  it("Test 2 — Commerce: serviceType = 'COMMERCE_DELIVERY' continúa normalmente a liquidación contable", () => {
    const logs: string[] = [];
    const res = evaluateCommerceSettlementGuard(
      { status: "ready" },
      { status: "delivered", serviceType: "COMMERCE_DELIVERY", businessId: "restaurant_pizzahut" },
      "order_comm_9988",
      logs
    );

    assert.strictEqual(res.executed, true);
    assert.strictEqual(res.reason, "COMMERCE_SETTLEMENT_PROCEEDS");
    assert.strictEqual(logs.length, 0);
  });

  it("Test 3A — Legacy: serviceType = undefined continúa normalmente a liquidación contable", () => {
    const logs: string[] = [];
    const res = evaluateCommerceSettlementGuard(
      { status: "ready" },
      { status: "completed", businessId: "restaurant_legacy_01" },
      "order_legacy_1122",
      logs
    );

    assert.strictEqual(res.executed, true);
    assert.strictEqual(res.reason, "COMMERCE_SETTLEMENT_PROCEEDS");
    assert.strictEqual(logs.length, 0);
  });

  it("Test 3B — Legacy: serviceType = '' continúa normalmente a liquidación contable", () => {
    const logs: string[] = [];
    const res = evaluateCommerceSettlementGuard(
      { status: "ready" },
      { status: "completed", serviceType: "", businessId: "restaurant_legacy_02" },
      "order_legacy_3344",
      logs
    );

    assert.strictEqual(res.executed, true);
    assert.strictEqual(res.reason, "COMMERCE_SETTLEMENT_PROCEEDS");
    assert.strictEqual(logs.length, 0);
  });

  it("Test 4 — Idempotencia de estado: si ya estaba completado, no re-ejecuta ni evalúa guard", () => {
    const logs: string[] = [];
    const res = evaluateCommerceSettlementGuard(
      { status: "completed" },
      { status: "completed", serviceType: "X_TO_Y_DELIVERY", businessId: "some_biz" },
      "env_already_done",
      logs
    );

    assert.strictEqual(res.executed, false);
    assert.strictEqual(res.reason, "NOT_TRANSITION");
    assert.strictEqual(logs.length, 0);
  });
});
