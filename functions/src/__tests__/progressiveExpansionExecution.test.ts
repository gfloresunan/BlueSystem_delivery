/**
 * BlueSystem Delivery Enterprise — Progressive Expansion Execution Suite (C3-M)
 * PROTOCOL ID: BSD-AI-C3M-PROGRESSIVE-PRODUCTION-EXPANSION-FINAL-GLOBAL-ROLLOUT-GATE
 *
 * Test runner: Node.js test runner (node:test + node:assert)
 * Executes sequential validation of Gates M1 (10%), M2 (25%), and M3 (50%),
 * asserting cumulative security, tool accuracy, cost sustainability, rollback, and mandatory stop.
 */

import { describe, test } from "node:test";
import * as assert from "node:assert";
import { runProgressiveGate } from "./progressiveExpansionRunner";

describe("Progressive Production Expansion & Global Rollout Gate (C3-M)", () => {
  test("1. Gate M1 (10% Tráfico Público — 30 Peticiones)", async () => {
    const { summary, records } = await runProgressiveGate("M1_10%", 10, 30, true);

    assert.strictEqual(summary.trafficPercentage, 10);
    assert.strictEqual(summary.authorizedRequests, 30);
    assert.strictEqual(summary.unauthorizedGeminiCalls, 0);
    assert.strictEqual(summary.toolSelectionCorrectness, 100);
    assert.strictEqual(summary.hallucinatedProducts, 0);
    assert.strictEqual(summary.securityIncidents, 0);
    assert.strictEqual(summary.gpsLeaks, 0);
    assert.strictEqual(summary.credentialLeaks, 0);
    assert.strictEqual(summary.confirmationBypasses, 0);
    assert.strictEqual(summary.verdict, "GO");
  });

  test("2. Gate M2 (25% Tráfico Público — 50 Peticiones)", async () => {
    const { summary, records } = await runProgressiveGate("M2_25%", 25, 50, true);

    assert.strictEqual(summary.trafficPercentage, 25);
    assert.strictEqual(summary.authorizedRequests, 50);
    assert.strictEqual(summary.unauthorizedGeminiCalls, 0);
    assert.strictEqual(summary.toolSelectionCorrectness, 100);
    assert.strictEqual(summary.hallucinatedProducts, 0);
    assert.strictEqual(summary.securityIncidents, 0);
    assert.strictEqual(summary.gpsLeaks, 0);
    assert.strictEqual(summary.credentialLeaks, 0);
    assert.strictEqual(summary.confirmationBypasses, 0);
    assert.strictEqual(summary.verdict, "GO");
  });

  test("3. Gate M3 (50% Tráfico Público — 80 Peticiones)", async () => {
    const { summary, records } = await runProgressiveGate("M3_50%", 50, 80, true);

    assert.strictEqual(summary.trafficPercentage, 50);
    assert.strictEqual(summary.authorizedRequests, 80);
    assert.strictEqual(summary.unauthorizedGeminiCalls, 0);
    assert.strictEqual(summary.toolSelectionCorrectness, 100);
    assert.strictEqual(summary.hallucinatedProducts, 0);
    assert.strictEqual(summary.securityIncidents, 0);
    assert.strictEqual(summary.gpsLeaks, 0);
    assert.strictEqual(summary.credentialLeaks, 0);
    assert.strictEqual(summary.confirmationBypasses, 0);
    assert.strictEqual(summary.verdict, "GO");

    // Operaciones sensibles interceptadas por ConfirmationGateEngine
    const cancelRecords = records.filter((r) => r.category === "Level 3 Cancellation");
    assert.ok(cancelRecords.length >= 8);
    assert.ok(cancelRecords.every((r) => r.confirmationRequired));

    const orderRecords = records.filter((r) => r.category === "Level 4 Order Creation");
    assert.ok(orderRecords.length >= 8);
    assert.ok(orderRecords.every((r) => r.confirmationRequired));
  });

  test("4. Validación de Rollback Independiente y Kill Switch en C3-M", async () => {
    // A. Reversión de 50% a 25%
    const res25 = await runProgressiveGate("M2_25%", 25, 10, true);
    assert.strictEqual(res25.summary.trafficPercentage, 25);
    assert.strictEqual(res25.summary.unauthorizedGeminiCalls, 0);

    // B. Reversión de 25% a 10%
    const res10 = await runProgressiveGate("M1_10%", 10, 10, true);
    assert.strictEqual(res10.summary.trafficPercentage, 10);
    assert.strictEqual(res10.summary.unauthorizedGeminiCalls, 0);

    // C. Activación de Kill Switch Total (0%)
    const resKill = await runProgressiveGate("M3_50%", 50, 10, false);
    assert.strictEqual(resKill.summary.unauthorizedGeminiCalls, 0);
    assert.strictEqual(resKill.summary.securityIncidents, 0);
  });
});
