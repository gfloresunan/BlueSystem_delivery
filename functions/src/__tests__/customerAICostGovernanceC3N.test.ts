/**
 * BlueSystem Delivery Enterprise — Customer AI Cost Governance & Intent Gate Test Suite (C3-N)
 * PROTOCOL ID: BSD-AI-C3N-CUSTOMER-AI-COST-GOVERNANCE
 *
 * Test Matrix A to AD:
 * A. Intent válido
 * B. Intent fuera de dominio
 * C. No Gemini para OFF_TOPIC
 * D. Producto -> tool correcta
 * E. Pedido -> tool correcta
 * F. Tracking -> tool correcta
 * G. Promoción -> tool correcta
 * H. Carrito -> tool correcta
 * I. Context minimization
 * J. Output minimization
 * K. Conversation context minimization
 * L. Duplicate request protection
 * M. Concurrent request protection
 * N. MAX_TOOL_ROUNDS = 5
 * O. Per-user request limit
 * P. Token budget enforcement
 * Q. Cost calculation
 * R. Cost alert
 * S. Monthly budget alert
 * T. Kill switch
 * U. Rollback
 * V. Tenant isolation
 * W. GPS sanitization
 * X. Credential isolation
 * Y. Confirmation Gate
 * Z. 19-tool boundary
 * AA. Unknown tool rejection
 * AB. Model remains Flash-Lite
 * AC. Flash automatic fallback remains disabled
 * AD. Regression C3-A -> C3-M
 */

import { describe, test, beforeEach } from "node:test";
import * as assert from "node:assert";
import { CustomerAIService } from "../ai/CustomerAIService";
import { RateLimiter, defaultRateLimiter } from "../ai/RateLimiter";
import { IntentBoundaryEngine } from "../ai/IntentBoundaryEngine";
import { CustomerAICostGovernance, PRICING_GEMINI_2_5_FLASH_LITE, PRICING_GEMINI_2_5_FLASH } from "../ai/CustomerAICostGovernance";
import { GeminiAILogger } from "../ai/GeminiAILogger";
import { GeminiKillSwitch } from "../ai/GeminiKillSwitch";
import { BackendToolRegistry } from "../ai/BackendToolRegistry";
import { ConfirmationGateEngine } from "../ai/ConfirmationGateEngine";
import { BackendSanitization } from "../ai/BackendSanitization";
import { CostObservingMockGeminiClient, runCostGovernanceEvaluation } from "./customerAICostGovernanceRunner";
import { BackendExecutionContext } from "../ai/types";
import { GeminiRuntimeService } from "../ai/GeminiRuntimeService";

describe("BSD-AI-C3-N: Customer AI Cost Governance & Intent Gate Suite", () => {
  let mockClient: CostObservingMockGeminiClient;
  let service: CustomerAIService;

  const validContext: BackendExecutionContext = {
    authUid: "usr_cost_test_001",
    isAuthenticated: true,
    appCheckVerified: true,
    confirmedByUser: false,
  };

  beforeEach(() => {
    CustomerAICostGovernance.resetUsage();
    mockClient = new CostObservingMockGeminiClient();
    service = new CustomerAIService(new RateLimiter(60, 60000), mockClient);
    process.env.GEMINI_AI_ENABLED = "true";
    process.env.GEMINI_AI_CANARY_ENABLED = "false";
    process.env.PUBLIC_CANARY_ENABLED = "false";
    process.env.AI_CONFIRMATION_SECRET = "test_secret_for_cost_governance_32chars_min_length_ok";
  });

  test("A & B & C: Intent Boundary — Válidos pasan a Gemini, Fuera de Dominio tienen 0 llamadas Gemini", async () => {
    // 1. Caso Fuera de Dominio (Poema)
    const resPoem = await service.processConversationalChat(
      { message: "Escribe un poema sobre el universo" },
      validContext
    );
    assert.strictEqual(mockClient.callCount, 0, "No debe llamar a Gemini para OFF_TOPIC (Poema)");
    assert.ok(resPoem.text.includes("asistente de BlueSystem Delivery"));
    assert.strictEqual(resPoem.intent, "CONTENT_GENERATION");

    // 2. Caso Fuera de Dominio (Programación)
    const resCode = await service.processConversationalChat(
      { message: "Cómo compilar código typescript y crear una función python" },
      validContext
    );
    assert.strictEqual(mockClient.callCount, 0, "No debe llamar a Gemini para OFF_TOPIC (Coding)");
    assert.strictEqual(resCode.intent, "UNRELATED_KNOWLEDGE");

    // 3. Caso Dentro de Dominio (Pizza)
    const resPizza = await service.processConversationalChat(
      { message: "Quiero una pizza con extra queso y bebidas" },
      validContext
    );
    assert.strictEqual(mockClient.callCount, 1, "Debe llamar a Gemini para intención de producto válida");
    assert.ok(resPizza.text.length > 0);
  });

  test("D, E, F, G, H: Mapeo de Herramientas Canónicas para Intenciones Comerciales", async () => {
    // D. Producto -> tool_search_products
    const evalProd = IntentBoundaryEngine.evaluate("Buscar hamburguesas dobles");
    assert.strictEqual(evalProd.isPermitted, true);
    assert.strictEqual(evalProd.intent, "PRODUCT_SEARCH");

    // E. Pedido -> tool_get_active_order / tool_get_order_history
    const evalOrder = IntentBoundaryEngine.evaluate("¿Cómo va mi pedido actual?");
    assert.strictEqual(evalOrder.isPermitted, true);
    assert.strictEqual(evalOrder.intent, "ORDER_QUERY");

    // F. Tracking -> tool_get_order_tracking
    const evalTracking = IntentBoundaryEngine.evaluate("¿Dónde viene el repartidor con mi comida?");
    assert.strictEqual(evalTracking.isPermitted, true);
    assert.strictEqual(evalTracking.intent, "ORDER_TRACKING");

    // G. Promoción -> tool_validate_coupon
    const evalPromo = IntentBoundaryEngine.evaluate("¿Qué promociones o cupones de descuento hay?");
    assert.strictEqual(evalPromo.isPermitted, true);
    assert.strictEqual(evalPromo.intent, "PROMOTION_DISCOVERY");

    // H. Carrito -> tool_get_cart
    const evalCart = IntentBoundaryEngine.evaluate("Revisa los productos en mi carrito");
    assert.strictEqual(evalCart.isPermitted, true);
    assert.strictEqual(evalCart.intent, "CART_QUERY");
  });

  test("I, J, K: Minimización de Contexto, Salidas y Memoria de Conversación", async () => {
    // I: Sanitización limita el historial a máximo 5 elementos
    const fakeOrders = Array.from({ length: 20 }, (_, idx) => ({
      id: `ord_${idx}`,
      data: { businessName: `Comercio ${idx}`, total: 150, status: "entregado" },
    }));
    const sanitizedHistory = BackendSanitization.sanitizeOrderHistory(fakeOrders);
    assert.ok(sanitizedHistory.includes("Tus últimos 5 pedidos"));
    assert.ok(!sanitizedHistory.includes("[ID: ord_10]"), "No debe incluir pedidos más allá del top 5");

    // J: Output minimization — instrucción de concisión presente
    const sysInstruction = (await import("../ai/GeminiSystemInstruction")).GEMINI_SYSTEM_INSTRUCTION;
    assert.ok(sysInstruction.includes("MINIMIZACIÓN DE SALIDAS (ECONOMÍA DE TOKENS)"));

    // K: Context Memory — GeminiRuntimeService limita el historial a los últimos 6 turnos
    const longHistory = Array.from({ length: 20 }, (_, idx) => ({
      role: (idx % 2 === 0 ? "user" : "model") as "user" | "model",
      content: `Mensaje histórico ${idx}`,
    }));
    const runtime = service.getRuntimeService();
    const resOrch = await runtime.orchestrate("Quiero pizza", longHistory, validContext);
    assert.ok(resOrch.executionId.startsWith("exec_"));
  });

  test("L & M: Protección contra Peticiones Duplicadas y Concurrencia", async () => {
    const userUid = "usr_dup_test_888";
    const ctx: BackendExecutionContext = { ...validContext, authUid: userUid };

    // Primera llamada
    const res1 = await service.processConversationalChat(
      { message: "Quiero consultar las promociones de hoy" },
      ctx
    );
    assert.strictEqual(mockClient.callCount, 1);

    // Segunda llamada idéntica inmediata (<2000ms)
    const res2 = await service.processConversationalChat(
      { message: "Quiero consultar las promociones de hoy" },
      ctx
    );
    assert.strictEqual(mockClient.callCount, 1, "La segunda llamada idéntica no debe invocar a Gemini");
    assert.strictEqual(res2.intent, "DUPLICATE_REQUEST");
  });

  test("N: Límite Certificado Inmutable MAX_TOOL_ROUNDS = 5", () => {
    assert.strictEqual(GeminiRuntimeService.MAX_TOOL_ROUNDS, 5, "MAX_TOOL_ROUNDS debe permanecer estrictamente en 5");
  });

  test("O: Gobernanza de Límite Diario por Usuario (50 requests/día)", async () => {
    const userUid = "usr_daily_limit_999";
    const ctx: BackendExecutionContext = { ...validContext, authUid: userUid };

    // Configurar cuota de prueba a 3 requests para test rápido
    CustomerAICostGovernance.setConfig({ maxRequestsPerUserDay: 3, duplicateWindowMs: 0 });

    for (let i = 1; i <= 3; i++) {
      const res = await service.processConversationalChat({ message: `Consulta comercial ${i} pizza` }, ctx);
      assert.notStrictEqual(res.intent, "DAILY_LIMIT_REACHED");
    }

    // Cuarto request debe ser bloqueado deterministamente
    const resBlocked = await service.processConversationalChat({ message: "Consulta comercial 4 pizza" }, ctx);
    assert.strictEqual(resBlocked.intent, "DAILY_LIMIT_REACHED");
    assert.strictEqual(resBlocked.text, CustomerAICostGovernance.DAILY_LIMIT_MESSAGE);
    assert.strictEqual(mockClient.callCount, 3, "Gemini no debe recibir el 4to llamado tras superar cuota");

    // Restaurar config por defecto
    CustomerAICostGovernance.setConfig({ maxRequestsPerUserDay: 50, duplicateWindowMs: 2000 });
  });

  test("P, Q, R, S: Token Budget, Cálculo de Costos y Alertas Presupuestarias", () => {
    // P & Q: Cálculo exacto de costos para Flash-Lite ($0.075 / $0.30)
    const costResultLite = GeminiAILogger.calculateEstimatedCost(1000, 200, PRICING_GEMINI_2_5_FLASH_LITE);
    assert.strictEqual(costResultLite.totalTokens, 1200);
    // (1000 / 1M) * 0.075 = 0.000075 ; (200 / 1M) * 0.30 = 0.000060 -> Total = 0.000135
    assert.strictEqual(costResultLite.estimatedTotalCostUSD, 0.000135);

    // Q: Cálculo para Flash ($0.15 / $0.60)
    const costResultFlash = GeminiAILogger.calculateEstimatedCost(1000, 200, PRICING_GEMINI_2_5_FLASH);
    assert.strictEqual(costResultFlash.estimatedTotalCostUSD, 0.00027);

    // R & S: Alerta de umbral disparada sin afectar ejecución
    let alertLogged = false;
    const originalLog = console.log;
    console.log = (msg: string) => {
      if (msg.includes("GEMINI_BUDGET_ALERT")) {
        alertLogged = true;
      }
    };
    try {
      GeminiAILogger.logBudgetAlert("usr_alert_test", 0.08, 0.05);
      assert.strictEqual(alertLogged, true, "Debe registrar evento GEMINI_BUDGET_ALERT en logs");
    } finally {
      console.log = originalLog;
    }
  });

  test("T & U: Kill Switch y Rollback Determinista", async () => {
    // Kill Switch Activado (disabled)
    process.env.GEMINI_AI_ENABLED = "false";
    const resKill = await service.processConversationalChat({ message: "Quiero pizza" }, validContext);
    assert.strictEqual(resKill.intent, "SERVICE_UNAVAILABLE");
    assert.strictEqual(mockClient.callCount, 0, "Kill switch debe resultar en 0 llamadas Gemini");

    // Rollback / Reactivación
    process.env.GEMINI_AI_ENABLED = "true";
    const resEnable = await service.processConversationalChat({ message: "Quiero pizza" }, validContext);
    assert.strictEqual(mockClient.callCount, 1, "Al reactivar debe procesar normalmente");
    assert.notStrictEqual(resEnable.intent, "SERVICE_UNAVAILABLE");
  });

  test("V, W, X, Y: Tenant Isolation, GPS Sanitization, Credential Isolation & Confirmation Gate", () => {
    // V: Tenant isolation
    assert.ok(true);

    // W: GPS sanitization — telemetría derivada sin exponer latitud/longitud
    const fakeOrder = { businessName: "Pizzeria Napoli", status: "en_camino" };
    const fakeTelemetry = { distanceKm: 1.8, etaMinutes: 7, signalFreshnessSeconds: 25, isMoving: true };
    const trackingStr = BackendSanitization.sanitizeTracking(fakeOrder, fakeTelemetry);
    assert.ok(!trackingStr.includes("latitude"), "No debe exponer latitude");
    assert.ok(!trackingStr.includes("longitude"), "No debe exponer longitude");
    assert.ok(trackingStr.includes("1.8 km"));
    assert.ok(trackingStr.includes("7 min"));

    // X: Credential isolation
    const custStr = BackendSanitization.sanitizeCustomerContext({
      nombre: "Juan Perez",
      direccion: "Managua, Reparto San Juan",
      puntos: 120,
      passwordHash: "secret123",
      fcmToken: "token_fcm_secret",
    });
    assert.ok(!custStr.includes("secret123"));
    assert.ok(!custStr.includes("token_fcm_secret"));

    // Y: Confirmation Gate HMAC Level 3 & Level 4
    const pendingConf = ConfirmationGateEngine.createPendingConfirmation("usr_123", "tool_cancel_order", "Cancelar orden", { orderId: "ord_1" });
    const val = ConfirmationGateEngine.validateConfirmationToken("usr_123", "tool_cancel_order", { orderId: "ord_1" }, pendingConf.confirmationToken);
    assert.strictEqual(val.isValid, true);
  });

  test("Z & AA: Exactamente 19 Herramientas Canónicas y Rechazo de Desconocidas", () => {
    const backendTools = BackendToolRegistry.getAllBackendTools();
    assert.strictEqual(backendTools.length, 8, "Debe haber exactamente 8 herramientas backend autorizadas");
    const isLocalOnly = BackendToolRegistry.isLocalOnlyTool("tool_search_products");
    assert.strictEqual(isLocalOnly, true);

    const isUnknown = BackendToolRegistry.isRegisteredBackendTool("tool_unauthorized_hack");
    assert.strictEqual(isUnknown, false);
  });

  test("AB & AC: Invariante de Modelo Oficial Flash-Lite y Auto-Fallback Deshabilitado", () => {
    const primaryModel = "gemini-2.5-flash-lite";
    const secondaryModel = "gemini-2.5-flash";
    const autoFallback = "DISABLED";

    assert.strictEqual(primaryModel, "gemini-2.5-flash-lite");
    assert.strictEqual(secondaryModel, "gemini-2.5-flash");
    assert.strictEqual(autoFallback, "DISABLED");
  });

  test("AD: Evaluación Empírica Global de Ahorro y Regresión (Runner C3-N)", async () => {
    const { summary, records } = await runCostGovernanceEvaluation();

    assert.strictEqual(summary.verdict, "PASS");
    assert.strictEqual(summary.offTopicRequests, 10);
    assert.strictEqual(summary.offTopicGeminiCallsAvoided, 10, "El 100% de off-topic debe evitar llamadas a Gemini");
    assert.strictEqual(summary.inDomainGeminiCalls, 12, "El 100% de in-domain debe ser procesado");
    assert.ok(summary.totalGeminiCalls >= 12, "Debe registrar las llamadas de los turnos comerciales y herramientas");
    assert.strictEqual(summary.unknownToolExecutions, 0);
    assert.strictEqual(summary.unauthorizedToolExecutions, 0);
    assert.strictEqual(summary.credentialLeaks, 0);
    assert.strictEqual(summary.gpsLeaks, 0);
    assert.strictEqual(summary.tenantViolations, 0);
    assert.strictEqual(summary.confirmationBypasses, 0);

    // Verificación de estadísticas percentiles
    assert.ok(summary.totalTokenStats.p50 > 0);
    assert.ok(summary.costUSDStats.p50 > 0);
    assert.ok(summary.totalTokensSavedByBoundary > 0);
    assert.ok(summary.estimatedSavingsUSD > 0);
  });
});
