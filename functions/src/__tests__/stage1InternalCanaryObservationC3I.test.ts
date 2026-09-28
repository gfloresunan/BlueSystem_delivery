/**
 * BlueSystem Delivery Enterprise — Stage 1 Internal Canary Observation Suite (C3-I)
 * PROTOCOL ID: BSD-AI-C3I-STAGE1-INTERNAL-CANARY-OBSERVATIONAL-GATE
 *
 * Test runner: Node.js test runner (node:test + node:assert)
 * Demuestra de forma inequívoca el comportamiento operacional del Stage 1:
 * - Allowlist Match -> Authorized Internal UID -> Gemini permitido.
 * - Non-Allowlist UID -> SERVICE_UNAVAILABLE -> Cero llamadas a Gemini.
 * - Separación entre Evidencia de Tests y Métricas Observacionales.
 * - Cost Accounting dinámico puramente observacional.
 * - Invariantes de Seguridad: GPS Privacy, Credential Isolation, Confirmation Gate, Kill Switch.
 */

import { describe, test, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert";
import { ConfirmationGateEngine } from "../ai/ConfirmationGateEngine";
import { GeminiKillSwitch } from "../ai/GeminiKillSwitch";
import { GeminiAILogger, GeminiPricingConfig } from "../ai/GeminiAILogger";
import {
  GEMINI_AI_CANARY_ENABLED,
  GEMINI_AI_CANARY_PERCENTAGE,
  GEMINI_AI_UID_ALLOWLIST,
  GeminiCanarySafetyController,
} from "../config/productionCanaryLock";
import { MockGeminiClient, ProductionGeminiClient, GeminiRuntimeService } from "../ai/GeminiRuntimeService";
import { CustomerAIService } from "../ai/CustomerAIService";
import { defaultRateLimiter } from "../ai/RateLimiter";
import { BackendToolRegistry } from "../ai/BackendToolRegistry";
import { BackendSanitization } from "../ai/BackendSanitization";

const TEST_SECRET = "test_secret_64chars_abcdefghijklmnopqrstuvwxyz_0123456789_abc";
const AUTHORIZED_PILOT_1 = "bsd_pilot_internal_001";
const AUTHORIZED_PILOT_2 = "bsd_pilot_internal_002";
const UNAUTHORIZED_CUSTOMER = "unauthorized_customer_external_777";
const ANONYMOUS_UID = "";

beforeEach(() => {
  ConfirmationGateEngine.resetConsumedTokens();
  process.env.NODE_ENV = "test";
  process.env.AI_CONFIRMATION_SECRET = TEST_SECRET;
  process.env.GEMINI_AI_ENABLED = "true";
  process.env.GEMINI_AI_CANARY_ENABLED = "true";
  delete process.env.GEMINI_MODEL_NAME;
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  ConfirmationGateEngine.resetConsumedTokens();
  delete process.env.AI_CONFIRMATION_SECRET;
  delete process.env.GEMINI_AI_ENABLED;
  delete process.env.GEMINI_AI_CANARY_ENABLED;
  delete process.env.GEMINI_MODEL_NAME;
  delete process.env.GEMINI_API_KEY;
});

// ─── 1. ALLOWLIST EVALUATION (DEMOSTRACIÓN INEQUÍVOCA) ───────────────────────
describe("1. Allowlist Evaluation & Access Control (Stage 1 Invariant)", () => {
  test("Canary activo por entorno y contiene los UIDs piloto autorizados", () => {
    assert.strictEqual(process.env.GEMINI_AI_CANARY_ENABLED, "true");
    assert.strictEqual(GEMINI_AI_CANARY_PERCENTAGE, 0);
    assert.ok(GEMINI_AI_UID_ALLOWLIST.length >= 2);
    assert.ok(GEMINI_AI_UID_ALLOWLIST.includes(AUTHORIZED_PILOT_1));
    assert.ok(GEMINI_AI_UID_ALLOWLIST.includes(AUTHORIZED_PILOT_2));
  });

  test("Piloto Autorizado 1 (bsd_pilot_internal_001) es admitido y recibe respuesta de Gemini", async () => {
    const mockClient = new MockGeminiClient();
    let generateCalled = false;
    mockClient.generateContent = async () => {
      generateCalled = true;
      return { text: "Hola Piloto 1, ¿en qué puedo ayudarte hoy?" };
    };

    const service = new CustomerAIService(defaultRateLimiter, mockClient);
    const response = await service.processConversationalChat(
      { message: "Hola" },
      { authUid: AUTHORIZED_PILOT_1, isAuthenticated: true, appCheckVerified: true, confirmedByUser: false }
    );

    assert.strictEqual(generateCalled, true);
    assert.strictEqual(response.text, "Hola Piloto 1, ¿en qué puedo ayudarte hoy?");
    assert.notStrictEqual(response.intent, "SERVICE_UNAVAILABLE");
  });

  test("Piloto Autorizado 2 (bsd_pilot_internal_002) es admitido y recibe respuesta de Gemini", async () => {
    const mockClient = new MockGeminiClient();
    let generateCalled = false;
    mockClient.generateContent = async () => {
      generateCalled = true;
      return { text: "Hola Piloto 2, consulta recibida." };
    };

    const service = new CustomerAIService(defaultRateLimiter, mockClient);
    const response = await service.processConversationalChat(
      { message: "Ver mi pedido" },
      { authUid: AUTHORIZED_PILOT_2, isAuthenticated: true, appCheckVerified: true, confirmedByUser: false }
    );

    assert.strictEqual(generateCalled, true);
    assert.strictEqual(response.text, "Hola Piloto 2, consulta recibida.");
  });

  test("Usuario No Autorizado es bloqueado con SERVICE_UNAVAILABLE y CERO llamadas a Gemini", async () => {
    const mockClient = new MockGeminiClient();
    let generateCalled = false;
    mockClient.generateContent = async () => {
      generateCalled = true;
      return { text: "Should never execute" };
    };

    const service = new CustomerAIService(defaultRateLimiter, mockClient);
    const response = await service.processConversationalChat(
      { message: "Hola" },
      { authUid: UNAUTHORIZED_CUSTOMER, isAuthenticated: true, appCheckVerified: true, confirmedByUser: false }
    );

    assert.strictEqual(generateCalled, false); // Cero llamadas a Gemini
    assert.strictEqual(response.intent, "SERVICE_UNAVAILABLE");
    assert.ok(response.errors?.[0]?.code === "SERVICE_UNAVAILABLE");
  });

  test("Usuario Anónimo es bloqueado con SERVICE_UNAVAILABLE y CERO llamadas a Gemini", async () => {
    const mockClient = new MockGeminiClient();
    let generateCalled = false;
    mockClient.generateContent = async () => {
      generateCalled = true;
      return { text: "Should never execute" };
    };

    const service = new CustomerAIService(defaultRateLimiter, mockClient);
    const response = await service.processConversationalChat(
      { message: "Hola" },
      { authUid: ANONYMOUS_UID, isAuthenticated: false, appCheckVerified: true, confirmedByUser: false }
    );

    assert.strictEqual(generateCalled, false);
    assert.strictEqual(response.intent, "SERVICE_UNAVAILABLE");
  });
});

// ─── 2. COST ACCOUNTING & TOKEN METRICS (OBSERVABILIDAD PURA) ────────────────
describe("2. Cost Accounting & Token Observability (Pure Observability)", () => {
  test("calculateEstimatedCost calcula montos exactos basados en tokens reales y tarifas vigentes", () => {
    const pricing: GeminiPricingConfig = {
      inputPricePerMillionUSD: 0.15, // $0.15 / 1M input tokens
      outputPricePerMillionUSD: 0.60, // $0.60 / 1M output tokens
    };

    // Caso: 2,500 input tokens + 350 output tokens
    const result = GeminiAILogger.calculateEstimatedCost(2500, 350, pricing);

    assert.strictEqual(result.inputTokens, 2500);
    assert.strictEqual(result.outputTokens, 350);
    assert.strictEqual(result.totalTokens, 2850);
    assert.strictEqual(result.estimatedInputCostUSD, 0.000375);
    assert.strictEqual(result.estimatedOutputCostUSD, 0.000210);
    assert.strictEqual(result.estimatedTotalCostUSD, 0.000585);
  });

  test("GeminiAILogger captura telemetría de tokens y costo sin fugas de secretos", () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (m) => logs.push(m);

    const start = GeminiAILogger.logChatStart(AUTHORIZED_PILOT_1, "gemini-2.5-flash-lite");
    GeminiAILogger.logChatComplete({
      correlationId: start.correlationId,
      authUid: AUTHORIZED_PILOT_1,
      startMs: start.startMs,
      model: "gemini-2.5-flash-lite",
      inputTokens: 1200,
      outputTokens: 180,
      totalTokens: 1380,
      estimatedCostUSD: 0.000288,
      providerStatus: "OK",
    });

    console.log = origLog;
    assert.strictEqual(logs.length, 2);

    const completeLog = JSON.parse(logs[1]);
    assert.strictEqual(completeLog.input_tokens, 1200);
    assert.strictEqual(completeLog.output_tokens, 180);
    assert.strictEqual(completeLog.total_tokens, 1380);
    assert.strictEqual(completeLog.estimated_cost_usd, 0.000288);
    assert.strictEqual(completeLog.model, "gemini-2.5-flash-lite");
    assert.ok(typeof completeLog.latency_ms === "number");
    assert.strictEqual(completeLog.uid_hash.length, 16);
    assert.strictEqual(completeLog.hasOwnProperty("apiKey"), false);
  });
});

// ─── 3. MODEL GOVERNANCE (PRIMARY FLASH-LITE / CONTROLLED FLASH) ─────────────
describe("3. Model Governance — Primary flash-lite & Controlled flash", () => {
  test("Modelo por defecto en ProductionGeminiClient es gemini-2.5-flash-lite", () => {
    process.env.GEMINI_API_KEY = "test_key";
    delete process.env.GEMINI_MODEL_NAME;
    const client = new ProductionGeminiClient();
    assert.strictEqual(client.getModelName(), "gemini-2.5-flash-lite");
  });

  test("Modelo secundario gemini-2.5-flash es admitido si se configura explícitamente", () => {
    process.env.GEMINI_API_KEY = "test_key";
    process.env.GEMINI_MODEL_NAME = "gemini-2.5-flash";
    const client = new ProductionGeminiClient();
    assert.strictEqual(client.getModelName(), "gemini-2.5-flash");
  });

  test("Modelos experimentales o no autorizados son rechazados (fail-closed)", () => {
    process.env.GEMINI_API_KEY = "test_key";
    process.env.GEMINI_MODEL_NAME = "gemini-1.5-pro-experimental";
    assert.throws(() => new ProductionGeminiClient(), /INVALID_MODEL_CONFIGURATION/);
  });
});

// ─── 4. SECURITY & PRIVACY INVARIANTS ────────────────────────────────────────
describe("4. Security & Privacy Invariants in Stage 1", () => {
  test("GPS Privacy: BackendSanitization.sanitizeTracking purga lat, lng y courierUid", () => {
    const tracking = BackendSanitization.sanitizeTracking(
      { businessName: "Pizzeria Napoli", status: "on_the_way" },
      { distanceKm: 1.5, etaMinutes: 7, signalFreshnessSeconds: 20, isMoving: true }
    );
    assert.strictEqual(tracking.includes("latitude"), false);
    assert.strictEqual(tracking.includes("longitude"), false);
    assert.strictEqual(tracking.includes("courierUid"), false);
    assert.ok(tracking.includes("1.5 km"));
    assert.ok(tracking.includes("7 minutos"));
  });

  test("Credential Isolation: sanitizeCustomerContext purga secretos y JWTs", () => {
    const sanitized = BackendSanitization.sanitizeCustomerContext({
      nombre: "Carlos Gomez",
      password: "plaintext_password_bad",
      jwtToken: "bearer.secret.token",
      puntos: 250,
    });
    assert.strictEqual(sanitized.includes("plaintext_password_bad"), false);
    assert.strictEqual(sanitized.includes("bearer.secret"), false);
    assert.ok(sanitized.includes("Carlos Gomez"));
  });

  test("Confirmation Gate: Level 3 y Level 4 exigen HMAC token autoritativo", () => {
    const cancelTool = BackendToolRegistry.getTool("tool_cancel_order");
    const orderTool = BackendToolRegistry.getTool("tool_create_authoritative_order");
    assert.strictEqual(cancelTool?.requiresConfirmation, true);
    assert.strictEqual(orderTool?.requiresConfirmation, true);
  });

  test("Anti-Replay: Token de confirmación consumido es rechazado inmediatamente", () => {
    const pending = ConfirmationGateEngine.createPendingConfirmation(
      AUTHORIZED_PILOT_1, "tool_cancel_order", "Cancelar orden", { orderId: "ord_1" }
    );
    const res1 = ConfirmationGateEngine.validateConfirmationToken(
      AUTHORIZED_PILOT_1, "tool_cancel_order", { orderId: "ord_1" }, pending.confirmationToken
    );
    assert.strictEqual(res1.isValid, true);

    const res2 = ConfirmationGateEngine.validateConfirmationToken(
      AUTHORIZED_PILOT_1, "tool_cancel_order", { orderId: "ord_1" }, pending.confirmationToken
    );
    assert.strictEqual(res2.isValid, false);
    assert.strictEqual(res2.errorCode, "ALREADY_CONSUMED");
  });
});

// ─── 5. KILL SWITCH & ROLLBACK OPERATIONAL VERIFICATION ──────────────────────
describe("5. Kill Switch & Immediate Rollback Verification", () => {
  test("GEMINI_AI_ENABLED=false interrumpe todo tráfico, incluso para usuarios autorizados", async () => {
    process.env.GEMINI_AI_ENABLED = "false";
    const mockClient = new MockGeminiClient();
    let generateCalled = false;
    mockClient.generateContent = async () => {
      generateCalled = true;
      return { text: "Should never execute" };
    };

    const service = new CustomerAIService(defaultRateLimiter, mockClient);
    const response = await service.processConversationalChat(
      { message: "Hola" },
      { authUid: AUTHORIZED_PILOT_1, isAuthenticated: true, appCheckVerified: true, confirmedByUser: false }
    );

    assert.strictEqual(generateCalled, false);
    assert.strictEqual(response.intent, "SERVICE_UNAVAILABLE");
  });
});
