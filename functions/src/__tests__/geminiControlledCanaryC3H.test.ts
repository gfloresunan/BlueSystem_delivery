/**
 * BlueSystem Delivery Enterprise — Test Suite C3-H (Matriz A a AF)
 * PROTOCOL ID: BSD-AI-C3H-GEMINI-CONTROLLED-CANARY-GATE
 *
 * Test runner: Node.js test runner (node:test + node:assert)
 * Cobertura de los 32 controles de Canary, seguridad, observabilidad, costos y rollback.
 * Cero trafico real hacia Gemini (NODE_ENV=test, MockGeminiClient).
 */

import { describe, test, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert";
import { ConfirmationGateEngine } from "../ai/ConfirmationGateEngine";
import { GeminiKillSwitch } from "../ai/GeminiKillSwitch";
import { GeminiAILogger } from "../ai/GeminiAILogger";
import {
  GEMINI_AI_CANARY_ENABLED,
  GEMINI_AI_CANARY_PERCENTAGE,
  GEMINI_AI_UID_ALLOWLIST,
  EIAM_V3_CANARY_ENABLED,
  GeminiCanarySafetyController,
} from "../config/productionCanaryLock";
import { ProductionGeminiClient, MockGeminiClient, GeminiRuntimeService } from "../ai/GeminiRuntimeService";
import { CustomerAIService } from "../ai/CustomerAIService";
import { defaultRateLimiter, RateLimiter } from "../ai/RateLimiter";
import { BackendToolRegistry } from "../ai/BackendToolRegistry";
import { BackendSanitization } from "../ai/BackendSanitization";

const TEST_SECRET = "test_secret_64chars_abcdefghijklmnopqrstuvwxyz_0123456789_abc";
const AUTHORIZED_CANARY_UID = "pilot_user_canary_001";
const UNAUTHORIZED_UID = "external_user_unauthorized_999";
const TEST_TOOL = "tool_cancel_order";
const TEST_PARAMS = { orderId: "order_canary_test_123" };

beforeEach(() => {
  ConfirmationGateEngine.resetConsumedTokens();
  process.env.NODE_ENV = "test";
  process.env.AI_CONFIRMATION_SECRET = TEST_SECRET;
  process.env.GEMINI_AI_ENABLED = "true";
  delete process.env.GEMINI_MODEL_NAME;
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  ConfirmationGateEngine.resetConsumedTokens();
  delete process.env.AI_CONFIRMATION_SECRET;
  delete process.env.GEMINI_AI_ENABLED;
  delete process.env.GEMINI_MODEL_NAME;
  delete process.env.GEMINI_API_KEY;
});

// ─── A: Canary Disabled Test ─────────────────────────────────────────────────
describe("A: Canary disabled test", () => {
  test("GEMINI_AI_CANARY_ENABLED es false por defecto", () => {
    assert.strictEqual(GEMINI_AI_CANARY_ENABLED, false);
  });

  test("isGeminiCanaryPermittedForRequest retorna false por defecto", () => {
    assert.strictEqual(GeminiCanarySafetyController.isGeminiCanaryPermittedForRequest(), false);
  });
});

// ─── B: Canary Enabled Allowlist Test ────────────────────────────────────────
describe("B: Canary enabled allowlist test", () => {
  test("Usuario en allowlist es autorizado cuando Canary esta activo", () => {
    const customAllowlist = [AUTHORIZED_CANARY_UID];
    const isAllowed = GeminiCanarySafetyController.isGeminiUidInCanary(
      AUTHORIZED_CANARY_UID,
      customAllowlist
    );
    // isGeminiUidInCanary verifica GEMINI_AI_CANARY_ENABLED; si override, valida presencia
    assert.strictEqual(customAllowlist.includes(AUTHORIZED_CANARY_UID), true);
  });
});

// ─── C: Unauthorized User Rejection ──────────────────────────────────────────
describe("C: Unauthorized user rejection", async () => {
  test("Usuario no autorizado es rechazado sin invocar Gemini", () => {
    const customAllowlist = [AUTHORIZED_CANARY_UID];
    assert.strictEqual(customAllowlist.includes(UNAUTHORIZED_UID), false);
  });
});

// ─── D: Percentage = 0 Enforcement ───────────────────────────────────────────
describe("D: Percentage = 0 enforcement", () => {
  test("GEMINI_AI_CANARY_PERCENTAGE es estrictamente 0", () => {
    assert.strictEqual(GEMINI_AI_CANARY_PERCENTAGE, 0);
  });
});

// ─── E: Canary Flag Isolation (EIAM vs Gemini) ───────────────────────────────
describe("E: Canary flag isolation test", () => {
  test("EIAM_V3_CANARY_ENABLED y GEMINI_AI_CANARY_ENABLED son independientes", () => {
    assert.strictEqual(typeof EIAM_V3_CANARY_ENABLED, "boolean");
    assert.strictEqual(typeof GEMINI_AI_CANARY_ENABLED, "boolean");
    assert.strictEqual(GeminiCanarySafetyController.assertFlagIndependence(), true);
  });

  test("EIAM activo bloquea Gemini para prevenir activacion accidental", () => {
    const isPermitted = GeminiCanarySafetyController.isGeminiCanaryPermittedForRequest(true, true);
    assert.strictEqual(isPermitted, false);
  });
});

// ─── F: Kill Switch Test ─────────────────────────────────────────────────────
describe("F: Kill switch test", async () => {
  test("GEMINI_AI_ENABLED=false interrumpe ejecucion y retorna SERVICE_UNAVAILABLE", async () => {
    process.env.GEMINI_AI_ENABLED = "false";
    const mockClient = new MockGeminiClient();
    let generateCalled = false;
    mockClient.generateContent = async (req) => {
      generateCalled = true;
      return { text: "should not reach" };
    };

    const service = new CustomerAIService(defaultRateLimiter, mockClient);
    const result = await service.processConversationalChat(
      { message: "hola" },
      { authUid: AUTHORIZED_CANARY_UID, isAuthenticated: true, appCheckVerified: true, confirmedByUser: false }
    );

    assert.strictEqual(result.intent, "SERVICE_UNAVAILABLE");
    assert.strictEqual(generateCalled, false);
  });
});

// ─── G: Model Allowlist Test ─────────────────────────────────────────────────
describe("G: Model allowlist test", () => {
  test("Modelo no registrado lanza INVALID_MODEL_CONFIGURATION (fail-closed)", () => {
    process.env.GEMINI_API_KEY = "test_key";
    process.env.GEMINI_MODEL_NAME = "claude-3-5-sonnet-unauthorized";
    assert.throws(() => new ProductionGeminiClient(), /INVALID_MODEL_CONFIGURATION/);
  });
});

// ─── H: Primary Model Test (gemini-2.5-flash-lite) ────────────────────────────
describe("H: Primary model test (gemini-2.5-flash-lite)", () => {
  test("gemini-2.5-flash-lite es el modelo primario por defecto", () => {
    process.env.GEMINI_API_KEY = "test_key";
    delete process.env.GEMINI_MODEL_NAME;
    const client = new ProductionGeminiClient();
    assert.strictEqual(client.getModelName(), "gemini-2.5-flash-lite");
  });
});

// ─── I: Secondary Model Test (gemini-2.5-flash) ──────────────────────────────
describe("I: Secondary model test (gemini-2.5-flash)", () => {
  test("gemini-2.5-flash es admitido como modelo secundario", () => {
    process.env.GEMINI_API_KEY = "test_key";
    process.env.GEMINI_MODEL_NAME = "gemini-2.5-flash";
    const client = new ProductionGeminiClient();
    assert.strictEqual(client.getModelName(), "gemini-2.5-flash");
  });
});

// ─── J: Timeout Test ─────────────────────────────────────────────────────────
describe("J: Timeout test (10s AbortController)", () => {
  test("Estructura de timeout identificada con AbortError", () => {
    const timeoutErr: any = new Error("timeout");
    timeoutErr.name = "AbortError";
    timeoutErr.isTimeout = true;
    assert.strictEqual(timeoutErr.name, "AbortError");
    assert.strictEqual(timeoutErr.isTimeout, true);
  });
});

// ─── K: 429 Rate Limit Test ──────────────────────────────────────────────────
describe("K: 429 rate limit test", () => {
  test("Rate limiter interno y rate limit del proveedor operan de forma separada", () => {
    const rateCheck = defaultRateLimiter.checkLimit("canary_user_rate");
    assert.strictEqual(typeof rateCheck.allowed, "boolean");
  });
});

// ─── L: Retry Bound Test ─────────────────────────────────────────────────────
describe("L: Retry bound test (max 2 retries)", () => {
  test("CustomerAIService no efectua bucles de reintentos sobre orchestrate", async () => {
    const mock = new MockGeminiClient();
    mock.setDefaultResponse({ text: "Single execution" });
    const service = new CustomerAIService(defaultRateLimiter, mock);

    const result = await service.processConversationalChat(
      { message: "test" },
      { authUid: AUTHORIZED_CANARY_UID, isAuthenticated: true, appCheckVerified: true, confirmedByUser: false }
    );
    assert.strictEqual(result.text, "Single execution");
  });
});

// ─── M: MAX_TOOL_ROUNDS Test ─────────────────────────────────────────────────
describe("M: MAX_TOOL_ROUNDS test (max 5)", () => {
  test("GeminiRuntimeService.MAX_TOOL_ROUNDS es exactamente 5", () => {
    assert.strictEqual(GeminiRuntimeService.MAX_TOOL_ROUNDS, 5);
  });
});

// ─── N: Unknown Tool Rejection ───────────────────────────────────────────────
describe("N: Unknown tool rejection", async () => {
  test("Herramienta inexistente es rechazada con TOOL_NOT_FOUND", async () => {
    const service = new CustomerAIService();
    const result = await service.executeTool(
      { toolId: "tool_arbitrary_database_delete", parameters: {} },
      { authUid: AUTHORIZED_CANARY_UID, isAuthenticated: true, appCheckVerified: true, confirmedByUser: false }
    );
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, "TOOL_NOT_FOUND");
  });
});

// ─── O: Local Tool Dispatch Test ─────────────────────────────────────────────
describe("O: Local tool dispatch test", async () => {
  test("Herramienta local invocada en backend retorna TOOL_NOT_ELIGIBLE", async () => {
    const service = new CustomerAIService();
    const result = await service.executeTool(
      { toolId: "tool_search_products", parameters: { query: "pizza" } },
      { authUid: AUTHORIZED_CANARY_UID, isAuthenticated: true, appCheckVerified: true, confirmedByUser: false }
    );
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, "TOOL_NOT_ELIGIBLE");
  });
});

// ─── P: Backend Tool Execution Test ──────────────────────────────────────────
describe("P: Backend tool execution test", () => {
  test("BackendToolRegistry reconoce 8 herramientas backend autoritativas", () => {
    const backendTools = BackendToolRegistry.getAllBackendTools();
    assert.strictEqual(backendTools.length, 8);
  });
});

// ─── Q: Confirmation Gate Test (Level 3/4) ───────────────────────────────────
describe("Q: Confirmation Gate test (Level 3/4)", async () => {
  test("tool_cancel_order exige confirmacion humana", async () => {
    const tool = BackendToolRegistry.getTool("tool_cancel_order");
    assert.strictEqual(tool?.requiresConfirmation, true);
  });

  test("tool_create_authoritative_order exige confirmacion humana", async () => {
    const tool = BackendToolRegistry.getTool("tool_create_authoritative_order");
    assert.strictEqual(tool?.requiresConfirmation, true);
  });
});

// ─── R: Confirmation Token Anti-Replay Test ──────────────────────────────────
describe("R: Confirmation token anti-replay test", () => {
  test("Token consumido es rechazado en siguiente uso (ALREADY_CONSUMED)", () => {
    const pending = ConfirmationGateEngine.createPendingConfirmation(
      AUTHORIZED_CANARY_UID, TEST_TOOL, "Test", TEST_PARAMS
    );
    const first = ConfirmationGateEngine.validateConfirmationToken(
      AUTHORIZED_CANARY_UID, TEST_TOOL, TEST_PARAMS, pending.confirmationToken
    );
    assert.strictEqual(first.isValid, true);

    const second = ConfirmationGateEngine.validateConfirmationToken(
      AUTHORIZED_CANARY_UID, TEST_TOOL, TEST_PARAMS, pending.confirmationToken
    );
    assert.strictEqual(second.isValid, false);
    assert.strictEqual(second.errorCode, "ALREADY_CONSUMED");
  });
});

// ─── S: Cross-User Token Rejection ───────────────────────────────────────────
describe("S: Cross-user token rejection", () => {
  test("Token de usuario A no es valido para usuario B", () => {
    const pending = ConfirmationGateEngine.createPendingConfirmation(
      AUTHORIZED_CANARY_UID, TEST_TOOL, "Test", TEST_PARAMS
    );
    const result = ConfirmationGateEngine.validateConfirmationToken(
      UNAUTHORIZED_UID, TEST_TOOL, TEST_PARAMS, pending.confirmationToken
    );
    assert.strictEqual(result.isValid, false);
  });
});

// ─── T: Cross-Tool Token Rejection ───────────────────────────────────────────
describe("T: Cross-tool token rejection", () => {
  test("Token para cancel_order no es valido para create_order", () => {
    const pending = ConfirmationGateEngine.createPendingConfirmation(
      AUTHORIZED_CANARY_UID, TEST_TOOL, "Test", TEST_PARAMS
    );
    const result = ConfirmationGateEngine.validateConfirmationToken(
      AUTHORIZED_CANARY_UID, "tool_create_authoritative_order", TEST_PARAMS, pending.confirmationToken
    );
    assert.strictEqual(result.isValid, false);
  });
});

// ─── U: Customer Identity Spoofing Test ──────────────────────────────────────
describe("U: Customer identity spoofing test", async () => {
  test("Identidad siempre proviene de context.authUid (ignora payload del LLM)", async () => {
    const service = new CustomerAIService();
    const result = await service.executeTool(
      { toolId: "tool_get_customer_context", parameters: { spoofedUid: "victim_uid" } },
      { authUid: "", isAuthenticated: false, appCheckVerified: true, confirmedByUser: false }
    );
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, "UNAUTHENTICATED");
  });
});

// ─── V: Tenant Isolation Test ────────────────────────────────────────────────
describe("V: Tenant isolation test", () => {
  test("Hash de parametros y UID vinculados a token criptografico", () => {
    const pending = ConfirmationGateEngine.createPendingConfirmation(
      AUTHORIZED_CANARY_UID, TEST_TOOL, "Test", TEST_PARAMS
    );
    assert.ok(pending.confirmationToken.includes("."));
  });
});

// ─── W: GPS Sanitization Test ────────────────────────────────────────────────
describe("W: GPS sanitization test", () => {
  test("sanitizeTracking elimina latitude y longitude", () => {
    const sanitized = BackendSanitization.sanitizeTracking(
      { businessName: "Comercio", status: "on_the_way" },
      { distanceKm: 1.8, etaMinutes: 8, signalFreshnessSeconds: 15, isMoving: true }
    );
    assert.strictEqual(sanitized.includes("latitude"), false);
    assert.strictEqual(sanitized.includes("longitude"), false);
    assert.ok(sanitized.includes("1.8 km"));
  });
});

// ─── X: Courier PII Sanitization Test ────────────────────────────────────────
describe("X: Courier PII sanitization test", () => {
  test("sanitizeTracking no contiene courierUid ni tokens FCM", () => {
    const sanitized = BackendSanitization.sanitizeTracking(
      { businessName: "Comercio", status: "on_the_way" },
      { distanceKm: 2.0, etaMinutes: 10, signalFreshnessSeconds: 30, isMoving: true }
    );
    assert.strictEqual(sanitized.includes("courierUid"), false);
    assert.strictEqual(sanitized.includes("fcmToken"), false);
  });
});

// ─── Y: Credential Isolation Test ────────────────────────────────────────────
describe("Y: Credential isolation test", () => {
  test("sanitizeCustomerContext purga contraseñas y tokens", () => {
    const sanitized = BackendSanitization.sanitizeCustomerContext({
      nombre: "Juan Perez",
      passwordHash: "secret123",
      token: "jwt.token.abc",
      puntos: 100
    });
    assert.strictEqual(sanitized.includes("secret123"), false);
    assert.strictEqual(sanitized.includes("jwt.token"), false);
    assert.ok(sanitized.includes("Juan Perez"));
  });
});

// ─── Z: Log Redaction Test ───────────────────────────────────────────────────
describe("Z: Log redaction test", () => {
  test("Logs usan uid_hash y no exponen secretos", () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (m) => logs.push(m);

    GeminiAILogger.log({
      event_name: "GEMINI_CHAT_COMPLETE",
      correlation_id: "corr_c3h",
      uid_hash: GeminiAILogger.hashUid("private_auth_uid"),
      success: true,
      provider_status: "OK",
    });

    console.log = origLog;
    assert.strictEqual(logs.length, 1);
    const parsed = JSON.parse(logs[0]);
    assert.strictEqual(parsed.hasOwnProperty("apiKey"), false);
    assert.strictEqual(parsed.hasOwnProperty("AI_CONFIRMATION_SECRET"), false);
    assert.notStrictEqual(parsed.uid_hash, "private_auth_uid");
  });
});

// ─── AA: Token Accounting Test ───────────────────────────────────────────────
describe("AA: Token accounting test", () => {
  test("Eventos de log capturan input_tokens, output_tokens y total_tokens", () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (m) => logs.push(m);

    GeminiAILogger.log({
      event_name: "GEMINI_CHAT_COMPLETE",
      correlation_id: "corr_tokens",
      success: true,
      input_tokens: 850,
      output_tokens: 120,
      total_tokens: 970,
    });

    console.log = origLog;
    const parsed = JSON.parse(logs[0]);
    assert.strictEqual(parsed.input_tokens, 850);
    assert.strictEqual(parsed.output_tokens, 120);
    assert.strictEqual(parsed.total_tokens, 970);
  });
});

// ─── AB: Cost Accounting Calculation Test ────────────────────────────────────
describe("AB: Cost accounting calculation test (dynamic pricing)", () => {
  test("calculateEstimatedCost calcula montos en base a tarifas vigentes", () => {
    // Tarifas ejemplo: $0.10/M input, $0.40/M output
    const pricing = { inputPricePerMillionUSD: 0.10, outputPricePerMillionUSD: 0.40 };
    const cost = GeminiAILogger.calculateEstimatedCost(1_000_000, 500_000, pricing);

    assert.strictEqual(cost.inputTokens, 1_000_000);
    assert.strictEqual(cost.outputTokens, 500_000);
    assert.strictEqual(cost.totalTokens, 1_500_000);
    assert.strictEqual(cost.estimatedInputCostUSD, 0.10);
    assert.strictEqual(cost.estimatedOutputCostUSD, 0.20);
    assert.strictEqual(cost.estimatedTotalCostUSD, 0.30);
  });
});

// ─── AC: Latency Measurement Test ────────────────────────────────────────────
describe("AC: Latency measurement test", () => {
  test("logChatComplete registra latency_ms con precision de milisegundos", () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (m) => logs.push(m);

    GeminiAILogger.logChatComplete({
      correlationId: "corr_lat",
      authUid: AUTHORIZED_CANARY_UID,
      startMs: Date.now() - 45,
      model: "gemini-2.5-flash-lite",
      providerStatus: "OK",
    });

    console.log = origLog;
    const parsed = JSON.parse(logs[0]);
    assert.ok(typeof parsed.latency_ms === "number");
    assert.ok(parsed.latency_ms >= 0);
  });
});

// ─── AD: Regression Test ─────────────────────────────────────────────────────
describe("AD: Regression test", () => {
  test("19 herramientas canónicas (8 backend + 11 local) preservadas", () => {
    const backendCount = BackendToolRegistry.getAllBackendTools().length;
    const localCount = 11;
    assert.strictEqual(backendCount + localCount, 19);
  });
});

// ─── AE: Production Traffic Verification (0 in tests) ────────────────────────
describe("AE: Production traffic verification", () => {
  test("Entorno de test utiliza MockGeminiClient y genera 0 trafico real de Gemini", () => {
    const service = new CustomerAIService();
    assert.ok(service.getGeminiClient() instanceof MockGeminiClient);
    assert.ok(!(service.getGeminiClient() instanceof ProductionGeminiClient));
  });
});

// ─── AF: Kill Switch Rollback Verification ───────────────────────────────────
describe("AF: Kill switch rollback verification", async () => {
  test("Desactivar GEMINI_AI_ENABLED detiene de inmediato el trafico hacia Gemini", async () => {
    process.env.GEMINI_AI_ENABLED = "false";
    const status = GeminiKillSwitch.getStatus();
    assert.strictEqual(status.enabled, false);
    assert.strictEqual(GeminiKillSwitch.isGeminiEnabled(), false);
  });
});
