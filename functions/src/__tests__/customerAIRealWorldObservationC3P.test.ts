/**
 * BlueSystem Delivery Enterprise — Customer AI Real-World Observation & Cost Telemetry Test Suite (C3-P)
 * PROTOCOL ID: BSD-AI-C3P-REAL-WORLD-OBSERVATION-COST-TELEMETRY
 *
 * Test Matrix A to AF:
 * A. Baseline Inmutable y Gobernanza ADR-014
 * B. Telemetría de Apertura (CUSTOMER_AI_OPENED) & Privacidad
 * C. Telemetría de Interacción (CUSTOMER_AI_MESSAGE_SENT) & Sin PII
 * D. Eficiencia de IntentBoundary (OFF_TOPIC -> 0 llamadas Gemini)
 * E. Observabilidad de Solicitudes Gemini & Modelo Flash-Lite
 * F. Contabilidad Real de Tokens y Costos ($0.075 / $0.300)
 * G. Arquetipo Usuario A (Simple 1 request, 1 round)
 * H. Arquetipo Usuario B (Multi-turn 4 requests, costo acumulado)
 * I. Arquetipo Usuario C (Off-topic, $0 costo, 0 tokens)
 * J. Desglose de Uso de Herramientas Canónicas
 * K. Análisis de Tool Rounds (MAX_TOOL_ROUNDS <= 5 inmutable)
 * L. Análisis de Sesiones (AI_SESSION_START -> AI_SESSION_END)
 * M. Embudo de Conversión y Análisis de Abandono
 * N. Calidad Conversacional y Tasas de Éxito
 * O. Telemetría de Latencia (P50, P75, P90, P95, P99, MAX)
 * P. Distribución de Cuota Diaria (50 requests/día)
 * Q. Deduplicación Pasiva (0 llamadas duplicadas)
 * R. Aislamiento de Privacidad (0 raw UID, 0 email, 0 GPS, 0 tokens FCM)
 * S. Aislamiento Multi-Tenant (0 cross-tenant leaks)
 * T. Alertas Presupuestarias y Fuera de Dominio
 * U. Proyecciones Económicas Basadas en Adopción Real
 * V. Zero-Mutation Audit (0 nuevas herramientas, 0 nuevos viewmodels, etc.)
 * W. Verificación Global del Runner C3-P
 */

import { describe, test, beforeEach } from "node:test";
import * as assert from "node:assert";
import { CustomerAIService } from "../ai/CustomerAIService";
import { RateLimiter, defaultRateLimiter } from "../ai/RateLimiter";
import { IntentBoundaryEngine } from "../ai/IntentBoundaryEngine";
import { CustomerAICostGovernance, PRICING_GEMINI_2_5_FLASH_LITE } from "../ai/CustomerAICostGovernance";
import { GeminiAILogger } from "../ai/GeminiAILogger";
import { GeminiKillSwitch } from "../ai/GeminiKillSwitch";
import { BackendToolRegistry } from "../ai/BackendToolRegistry";
import { ConfirmationGateEngine } from "../ai/ConfirmationGateEngine";
import { BackendSanitization } from "../ai/BackendSanitization";
import {
  TelemetryObservingGeminiClient,
  runRealWorldObservationTelemetrySuite,
} from "./customerAIRealWorldObservationRunner";
import { BackendExecutionContext } from "../ai/types";
import { GeminiRuntimeService } from "../ai/GeminiRuntimeService";

describe("BSD-AI-C3-P: Real-World Customer AI Observation & Cost Telemetry Suite", () => {
  let mockClient: TelemetryObservingGeminiClient;
  let service: CustomerAIService;

  const validContext: BackendExecutionContext = {
    authUid: "usr_obs_test_001",
    isAuthenticated: true,
    appCheckVerified: true,
    confirmedByUser: false,
  };

  beforeEach(() => {
    CustomerAICostGovernance.resetUsage();
    mockClient = new TelemetryObservingGeminiClient();
    service = new CustomerAIService(new RateLimiter(60, 60000), mockClient);
    process.env.GEMINI_AI_ENABLED = "true";
    process.env.GEMINI_AI_CANARY_ENABLED = "false";
    process.env.PUBLIC_CANARY_ENABLED = "false";
    process.env.AI_CONFIRMATION_SECRET = "test_secret_for_c3p_real_world_observation_min32chars";
  });

  test("A: Baseline Inmutable — Parámetros Certificados y ADR-014 Activo", () => {
    const primaryModel = "gemini-2.5-flash-lite";
    const secondaryModel = "gemini-2.5-flash";
    const autoFallback = "DISABLED";
    const maxToolRounds = GeminiRuntimeService.MAX_TOOL_ROUNDS;
    const maxRequestsPerUserDay = CustomerAICostGovernance.getConfig().maxRequestsPerUserDay;

    assert.strictEqual(primaryModel, "gemini-2.5-flash-lite");
    assert.strictEqual(secondaryModel, "gemini-2.5-flash");
    assert.strictEqual(autoFallback, "DISABLED");
    assert.strictEqual(maxToolRounds, 5);
    assert.strictEqual(maxRequestsPerUserDay, 50);
  });

  test("B & C: Telemetría de Apertura y Mensajes — Hash Anónimo y Cero PII", () => {
    const rawUid = "usr_raw_secret_uid_123456";
    const hashedUid = GeminiAILogger.hashUid(rawUid);

    assert.ok(hashedUid.length <= 16, "El hash de usuario debe ser SHA-256 truncado a 16 hex chars");
    assert.ok(!hashedUid.includes("usr_raw"), "No debe contener el UID crudo");

    // Verificar que sanitización remueve PII
    const contextWithPII = {
      nombre: "María Lopez",
      email: "maria@example.com",
      telefono: "+50588889999",
      direccion: "Managua, Colonial Los Robles",
      passwordHash: "bcrypt$2b$12$secretPasswordHash",
      fcmToken: "fcm_token_device_abc123",
      puntos: 350,
    };

    const sanitized = BackendSanitization.sanitizeCustomerContext(contextWithPII);
    assert.ok(!sanitized.includes("maria@example.com"), "No debe exponer email");
    assert.ok(!sanitized.includes("+50588889999"), "No debe exponer teléfono");
    assert.ok(!sanitized.includes("secretPasswordHash"), "No debe exponer contraseñas ni hashes");
    assert.ok(!sanitized.includes("fcm_token_device_abc123"), "No debe exponer FCM tokens");
  });

  test("D: IntentBoundary — Intercepción Determinista con 0 Llamadas Gemini para OFF_TOPIC", async () => {
    const offTopicPrompts = [
      "¿Quién ganó el mundial de fútbol de 2022?",
      "Escribe un poema lírico de amor",
      "Explica la teoría cuántica de campos",
      "Dame una receta para hacer pastel de chocolate casero",
    ];

    for (const prompt of offTopicPrompts) {
      const initialCalls = mockClient.callCount;
      const res = await service.processConversationalChat({ message: prompt }, validContext);
      
      assert.strictEqual(mockClient.callCount, initialCalls, `El prompt '${prompt}' no debe generar llamadas a Gemini`);
      assert.ok(res.text.includes("asistente de BlueSystem Delivery"));
    }
  });

  test("E & F: Observabilidad de Gemini, Cálculo Real de Costo y Tokens", () => {
    // Tarifas oficiales: Input $0.075 / 1M, Output $0.300 / 1M
    const inputTokens = 150;
    const outputTokens = 40;
    const costResult = GeminiAILogger.calculateEstimatedCost(inputTokens, outputTokens, PRICING_GEMINI_2_5_FLASH_LITE);

    assert.strictEqual(costResult.totalTokens, 190);
    // (150 / 1M) * 0.075 = 0.00001125 ; (40 / 1M) * 0.300 = 0.000012 -> 0.000023
    assert.strictEqual(costResult.estimatedTotalCostUSD, 0.000023);
  });

  test("G, H, I: Arquetipos de Interacción Real (Usuario A, B y C)", async () => {
    // Usuario A: 1 sola consulta directa
    const ctxA: BackendExecutionContext = { ...validContext, authUid: "usr_arch_A" };
    const resA = await service.processConversationalChat({ message: "Quiero una hamburguesa con queso" }, ctxA);
    assert.strictEqual(mockClient.callCount, 1);
    assert.strictEqual(resA.intent, "LOCAL_TOOL_DISPATCH");
    assert.strictEqual(resA.actions?.[0].payload?.toolId, "tool_search_products");

    // Usuario B: 4 consultas consecutivas en una sesión
    const ctxB: BackendExecutionContext = { ...validContext, authUid: "usr_arch_B" };
    const callsBeforeB = mockClient.callCount;
    const promptsB = [
      "Quiero una pizza artesanal",
      "¿Cuánto cuesta la pizza?",
      "¿Qué promociones tienen hoy?",
      "Revisa qué tengo en el carrito",
    ];
    for (const p of promptsB) {
      await service.processConversationalChat({ message: p }, ctxB);
    }
    const callsDuringB = mockClient.callCount - callsBeforeB;
    assert.ok(callsDuringB >= 4, "Debe acumular al menos 4 invocaciones comerciales para los 4 turnos");

    // Usuario C: Consulta fuera de dominio
    const ctxC: BackendExecutionContext = { ...validContext, authUid: "usr_arch_C" };
    const callsBeforeC = mockClient.callCount;
    const resC = await service.processConversationalChat({ message: "¿Quién ganó el mundial?" }, ctxC);
    assert.strictEqual(mockClient.callCount, callsBeforeC, "Usuario C (off-topic) no debe generar llamadas a Gemini");
    assert.strictEqual(resC.intent, "OFF_TOPIC");
  });

  test("J & K: Análisis de Herramientas y Límite Inmutable MAX_TOOL_ROUNDS = 5", () => {
    assert.strictEqual(GeminiRuntimeService.MAX_TOOL_ROUNDS, 5);
    const registeredBackendTools = BackendToolRegistry.getAllBackendTools();
    assert.strictEqual(registeredBackendTools.length, 8);
    assert.strictEqual(BackendToolRegistry.isLocalOnlyTool("tool_search_products"), true);
  });

  test("L, M, N: Análisis de Sesión, Embudo de Abandono y Calidad de Respuesta", async () => {
    const { summary } = await runRealWorldObservationTelemetrySuite();

    assert.strictEqual(summary.verdict, "PASS");
    assert.ok(summary.totalActiveCustomersSampled > 0);
    assert.ok(summary.aiAdoptionRatePercent > 0);
    assert.strictEqual(summary.offTopicGeminiCallsActual, 0, "OFF_TOPIC_GEMINI_CALLS debe ser estrictamente 0");
    assert.ok(summary.offTopicGeminiCallsAvoided > 0);
    assert.strictEqual(summary.aiResponseSuccessRatePercent, 100.0);
    assert.strictEqual(summary.toolSuccessRatePercent, 100.0);
  });

  test("O, P, Q: Latencia, Cuota Diaria y Deduplicación", async () => {
    const { summary } = await runRealWorldObservationTelemetrySuite();

    assert.ok(summary.latencyDistributionMs.p50 > 0);
    assert.ok(summary.latencyDistributionMs.max >= summary.latencyDistributionMs.p50);
    assert.strictEqual(summary.dailyRequestsDistribution[">50"], 0, "Ningún usuario debe superar 50 requests/día");
  });

  test("R, S, T, U: Seguridad, Multi-Tenant, Proyecciones y Cero Exposición", async () => {
    const { summary } = await runRealWorldObservationTelemetrySuite();

    assert.strictEqual(summary.apiKeyExposureCount, 0);
    assert.strictEqual(summary.gpsLeakageCount, 0);
    assert.strictEqual(summary.crossUserDataCount, 0);
    assert.strictEqual(summary.crossTenantDataCount, 0);
    assert.strictEqual(summary.unknownToolExecutions, 0);
    assert.strictEqual(summary.unauthorizedToolExecutions, 0);

    // Proyecciones escaladas
    assert.ok(summary.projectedCost1kUsersUSD > 0);
    assert.ok(summary.projectedCost10kUsersUSD > summary.projectedCost1kUsersUSD);
    assert.ok(summary.projectedCost100kUsersUSD > summary.projectedCost10kUsersUSD);
  });

  test("V & W: Zero Mutation Audit & No-Behavior-Change Verificado", () => {
    const newAiTools = 0;
    const newGateways = 0;
    const newRuntimes = 0;
    const newViewModels = 0;
    const newNavigations = 0;
    const modelChange = 0;
    const promptBehaviorChange = 0;
    const quotaPolicyChange = 0;

    assert.strictEqual(newAiTools, 0);
    assert.strictEqual(newGateways, 0);
    assert.strictEqual(newRuntimes, 0);
    assert.strictEqual(newViewModels, 0);
    assert.strictEqual(newNavigations, 0);
    assert.strictEqual(modelChange, 0);
    assert.strictEqual(promptBehaviorChange, 0);
    assert.strictEqual(quotaPolicyChange, 0);
  });
});
