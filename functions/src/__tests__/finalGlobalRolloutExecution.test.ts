/**
 * BlueSystem Delivery Enterprise — Final Global Rollout Execution Suite (C3-M4)
 * PROTOCOL ID: BSD-AI-C3M4-FINAL-GLOBAL-ROLLOUT
 *
 * Test runner: Node.js test runner (node:test + node:assert)
 * Validates 100% Global Public Production Traffic execution, verifying:
 * 1. 100% Public Traffic Coverage (Gate M4).
 * 2. Exact Tool Selection across 19 Canonical Tools.
 * 3. 0 Hallucinations, 0 Leaks, 0 Confirmation Bypasses.
 * 4. Model Invariant: gemini-2.5-flash-lite (Active) / gemini-2.5-flash (Inactive).
 * 5. Full Rollback Spectrum & Kill Switch Determinism.
 */

import { describe, test } from "node:test";
import * as assert from "node:assert";
import { runFinalGlobalRollout } from "./finalGlobalRolloutRunner";
import { GeminiCanarySafetyController } from "../config/productionCanaryLock";

describe("Final 100% Global Production Rollout Gate (C3-M4)", () => {
  test("1. Gate M4 (100% Tráfico Global — 100 Peticiones Públicas)", async () => {
    const { summary, records } = await runFinalGlobalRollout(100, 100, true);

    assert.strictEqual(summary.trafficPercentage, 100);
    assert.strictEqual(summary.authorizedRequests, 100);
    assert.strictEqual(summary.unauthorizedGeminiCalls, 0);
    assert.strictEqual(summary.unknownToolExecutions, 0);
    assert.strictEqual(summary.unauthorizedToolExecutions, 0);
    assert.strictEqual(summary.toolSelectionCorrectness, 100);
    assert.strictEqual(summary.hallucinatedProducts, 0);
    assert.strictEqual(summary.hallucinatedBusinesses, 0);
    assert.strictEqual(summary.hallucinatedPrices, 0);
    assert.strictEqual(summary.fabricatedDiscounts, 0);
    assert.strictEqual(summary.fabricatedOrderStates, 0);
    assert.strictEqual(summary.securityIncidents, 0);
    assert.strictEqual(summary.gpsLeaks, 0);
    assert.strictEqual(summary.credentialLeaks, 0);
    assert.strictEqual(summary.tenantViolations, 0);
    assert.strictEqual(summary.confirmationBypasses, 0);
    assert.strictEqual(summary.primaryModel, "gemini-2.5-flash-lite");
    assert.strictEqual(summary.secondaryModel, "gemini-2.5-flash");
    assert.strictEqual(summary.autoFallback, "DISABLED");
    assert.strictEqual(summary.verdict, "GO");

    // Operaciones sensibles interceptadas por ConfirmationGateEngine
    const cancelRecords = records.filter((r) => r.category === "Level 3 Cancellation");
    assert.ok(cancelRecords.length >= 10);
    assert.ok(cancelRecords.every((r) => r.confirmationRequired));

    const orderRecords = records.filter((r) => r.category === "Level 4 Order Creation");
    assert.ok(orderRecords.length >= 10);
    assert.ok(orderRecords.every((r) => r.confirmationRequired));
  });

  test("2. Cobertura Universal: 100% de UIDs Aleatorios Autorizados en Gate M4", () => {
    process.env.PUBLIC_CANARY_ENABLED = "true";
    process.env.PUBLIC_CANARY_PERCENTAGE = "100";

    const testSampleUids = [
      "usr_managua_001",
      "usr_leon_772",
      "usr_granada_339",
      "usr_esteli_554",
      "usr_masaya_912",
      "usr_chinandega_108",
      "usr_matagalpa_441",
      "usr_jinotega_883",
      "usr_rivas_226",
      "usr_carazo_670",
    ];

    for (const uid of testSampleUids) {
      const isAuthorized = GeminiCanarySafetyController.isUidAuthorizedForCanary(uid);
      assert.strictEqual(isAuthorized, true, `UID ${uid} debe estar autorizado al 100%`);
    }
  });

  test("3. Validación de Rollback Multinivel Determinista (100% -> 50% -> 25% -> 10% -> 0%)", async () => {
    // 100% -> 50%
    const res50 = await runFinalGlobalRollout(50, 20, true);
    assert.strictEqual(res50.summary.trafficPercentage, 50);
    assert.strictEqual(res50.summary.unauthorizedGeminiCalls, 0);

    // 50% -> 25%
    const res25 = await runFinalGlobalRollout(25, 20, true);
    assert.strictEqual(res25.summary.trafficPercentage, 25);
    assert.strictEqual(res25.summary.unauthorizedGeminiCalls, 0);

    // 25% -> 10%
    const res10 = await runFinalGlobalRollout(10, 20, true);
    assert.strictEqual(res10.summary.trafficPercentage, 10);
    assert.strictEqual(res10.summary.unauthorizedGeminiCalls, 0);

    // 100% -> 0% (Kill Switch Total)
    const resKill = await runFinalGlobalRollout(100, 10, false);
    assert.strictEqual(resKill.summary.unauthorizedGeminiCalls, 0);
    assert.strictEqual(resKill.summary.securityIncidents, 0);
  });
});
