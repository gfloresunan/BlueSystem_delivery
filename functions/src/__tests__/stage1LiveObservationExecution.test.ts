/**
 * BlueSystem Delivery Enterprise — Stage 1 Live Observation Window Execution Suite
 * PROTOCOL ID: BSD-AI-C3I-STAGE1-LIVE-OBSERVATION
 *
 * Test runner: Node.js test runner (node:test + node:assert)
 * Runs live observation telemetry collection and asserts all operational & security invariants.
 */

import { describe, test } from "node:test";
import * as assert from "node:assert";
import { runStage1LiveObservation } from "./stage1LiveObservationRunner";
import { ConfirmationGateEngine } from "../ai/ConfirmationGateEngine";
import { GeminiKillSwitch } from "../ai/GeminiKillSwitch";

describe("Stage 1 Live Observation Window — Telemetry & Verification", () => {
  test("Ejecución de la ventana operacional real de observación Stage 1", async () => {
    const result = await runStage1LiveObservation();
    const { summary, metrics } = result;

    // 1. Verificación de tráfico y allowlist
    assert.strictEqual(summary.authorizedPilotRequests, 7);
    assert.strictEqual(summary.blockedUnauthorizedRequests, 5);
    assert.strictEqual(summary.unauthorizedGeminiCalls, 0);

    // 2. Verificación de tokens y costos
    assert.ok(summary.totalTokens > 0);
    assert.ok(summary.avgTotalTokens >= 500 && summary.avgTotalTokens <= 1200);
    assert.ok(summary.avgCostPerRequestUSD > 0 && summary.avgCostPerRequestUSD < 0.005);
    assert.ok(summary.estCostPerUserDayUSD > 0 && summary.estCostPerUserDayUSD < 0.10);

    // 3. Verificación de latencias
    assert.ok(summary.minLatencyMs >= 150);
    assert.ok(summary.p50LatencyMs >= 150);
    assert.ok(summary.maxLatencyMs <= 5000);

    // 4. Invariantes de Seguridad Inquebrantables
    assert.strictEqual(summary.securityIncidents, 0);
    assert.strictEqual(summary.credentialLeaks, 0);
    assert.strictEqual(summary.gpsLeaks, 0);
    assert.strictEqual(summary.tenantViolations, 0);
    assert.strictEqual(summary.confirmationBypasses, 0);
    assert.strictEqual(summary.unknownToolExecutions, 0);
    assert.strictEqual(summary.timeoutRate, 0);
    assert.strictEqual(summary.http429Rate, 0);

    // 5. Verificación de Confirmation Gate (Turn P1-T4)
    const cancelMetric = metrics.find((m) => m.turn.includes("Cancel"));
    assert.ok(cancelMetric);
    assert.strictEqual(cancelMetric.confirmationRequested, true);
  });
});
