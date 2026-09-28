/**
 * BlueSystem Delivery Enterprise — Backend AI Security & Tool Execution Unit Tests (C3-C)
 * PROTOCOL ID: BSD-AI-C3C-BACKEND-TOOLS-SECURE-AI-GATEWAY
 */

import { describe, test, beforeEach } from "node:test";
import * as assert from "node:assert";
import { RateLimiter } from "../ai/RateLimiter";
import { BackendToolRegistry } from "../ai/BackendToolRegistry";
import { BackendSanitization } from "../ai/BackendSanitization";
import { CustomerAIService } from "../ai/CustomerAIService";
import { BackendExecutionContext, GatewayRequestPayload } from "../ai/types";

describe("BlueSystem AI Backend (C3-C) — Security & Execution Suite", () => {
  let rateLimiter: RateLimiter;
  let aiService: CustomerAIService;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.AI_CONFIRMATION_SECRET = "test_confirmation_secret_64chars_abcdefghijklmnopqrstuvwxyz";
    process.env.GEMINI_AI_ENABLED = "true";
    rateLimiter = new RateLimiter(5, 60000); // 5 req/min para tests rápidos
    aiService = new CustomerAIService(rateLimiter);
  });

  describe("1. Rate Limiting & Abuse Defense", () => {
    test("Debe permitir solicitudes dentro del umbral", () => {
      const uid = "usr_test_001";
      for (let i = 0; i < 5; i++) {
        const check = rateLimiter.checkLimit(uid);
        assert.strictEqual(check.allowed, true, `La solicitud ${i + 1} debió ser permitida`);
      }
    });

    test("Debe bloquear y rechazar al superar el límite de solicitudes por minuto", () => {
      const uid = "usr_test_002";
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit(uid);
      }
      const blockedCheck = rateLimiter.checkLimit(uid);
      assert.strictEqual(blockedCheck.allowed, false);
      assert.strictEqual(blockedCheck.remaining, 0);
    });

    test("CustomerAIService debe retornar RATE_LIMITED cuando se supera el límite", async () => {
      const uid = "usr_test_flood";
      const context: BackendExecutionContext = {
        authUid: uid,
        isAuthenticated: true,
        appCheckVerified: true,
        confirmedByUser: false,
      };

      const request: GatewayRequestPayload = {
        toolId: "tool_get_customer_context",
        parameters: {},
      };

      // Consumir cupo de 5
      for (let i = 0; i < 5; i++) {
        await aiService.executeTool(request, context);
      }

      // 6ta solicitud debe fallar por Rate Limit
      const result = await aiService.executeTool(request, context);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error?.code, "RATE_LIMITED");
      assert.strictEqual(result.sanitizedLlmContext.includes("límite de solicitudes"), true);
    });
  });

  describe("2. Tool Registry & Plane Boundary Enforcement", () => {
    test("El registro debe contener exactamente las 9 herramientas backend autoritativas", () => {
      const tools = BackendToolRegistry.getAllBackendTools();
      assert.strictEqual(tools.length, 9);

      const expectedToolIds = [
        "tool_get_customer_context",
        "tool_get_active_order",
        "tool_get_order_history",
        "tool_get_order_tracking",
        "tool_validate_coupon",
        "tool_create_authoritative_order",
        "tool_cancel_order",
        "tool_submit_order_review",
        "tool_get_available_coupons",
      ];

      expectedToolIds.forEach((id) => {
        assert.strictEqual(BackendToolRegistry.isRegisteredBackendTool(id), true, `Herramienta ${id} debe estar registrada`);
      });
    });

    test("Debe rechazar herramientas locales invocadas erróneamente en backend con TOOL_NOT_ELIGIBLE", async () => {
      const context: BackendExecutionContext = {
        authUid: "usr_client_001",
        isAuthenticated: true,
        appCheckVerified: true,
        confirmedByUser: false,
      };

      const localToolRequest: GatewayRequestPayload = {
        toolId: "tool_search_products",
        parameters: { query: "pizza" },
      };

      const result = await aiService.executeTool(localToolRequest, context);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.status, "UNAUTHORIZED");
      assert.strictEqual(result.error?.code, "TOOL_NOT_ELIGIBLE");
      assert.strictEqual(result.sanitizedLlmContext.includes("plano de ejecución local"), true);
    });

    test("Debe rechazar herramientas inexistentes o especulativas con TOOL_NOT_FOUND", async () => {
      const context: BackendExecutionContext = {
        authUid: "usr_client_001",
        isAuthenticated: true,
        appCheckVerified: true,
        confirmedByUser: false,
      };

      const unknownRequest: GatewayRequestPayload = {
        toolId: "tool_speculative_admin_query",
        parameters: {},
      };

      const result = await aiService.executeTool(unknownRequest, context);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error?.code, "TOOL_NOT_FOUND");
    });
  });

  describe("3. Authentication & Multi-Tenant Identity Guard", () => {
    test("Debe rechazar usuarios no autenticados en herramientas protegidas con UNAUTHENTICATED", async () => {
      const unauthContext: BackendExecutionContext = {
        authUid: "",
        isAuthenticated: false,
        appCheckVerified: false,
        confirmedByUser: false,
      };

      const request: GatewayRequestPayload = {
        toolId: "tool_get_active_order",
        parameters: {},
      };

      const result = await aiService.executeTool(request, unauthContext);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.status, "UNAUTHORIZED");
      assert.strictEqual(result.error?.code, "UNAUTHENTICATED");
    });
  });

  describe("4. Level 3 & Level 4 Confirmation Gate Integrity", () => {
    test("tool_create_authoritative_order sin confirmación humana debe retornar REQUIRES_CONFIRMATION", async () => {
      const context: BackendExecutionContext = {
        authUid: "usr_buyer_001",
        isAuthenticated: true,
        appCheckVerified: true,
        confirmedByUser: false, // Sin confirmación física
      };

      const request: GatewayRequestPayload = {
        toolId: "tool_create_authoritative_order",
        parameters: {
          businessId: "biz_001",
          items: [{ productId: "p1", name: "Hamburguesa", price: 150, quantity: 1 }],
        },
      };

      const result = await aiService.executeTool(request, context);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.status, "REQUIRES_CONFIRMATION");
      assert.strictEqual(result.error?.code, "REQUIRES_CONFIRMATION");
      assert.strictEqual(result.error?.suggestedAction, "REQUEST_ORDER_CONFIRMATION");
    });

    test("tool_cancel_order sin confirmación humana debe retornar REQUIRES_CONFIRMATION", async () => {
      const context: BackendExecutionContext = {
        authUid: "usr_buyer_001",
        isAuthenticated: true,
        appCheckVerified: true,
        confirmedByUser: false,
      };

      const request: GatewayRequestPayload = {
        toolId: "tool_cancel_order",
        parameters: { orderId: "ord_999" },
      };

      const result = await aiService.executeTool(request, context);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.status, "REQUIRES_CONFIRMATION");
      assert.strictEqual(result.error?.code, "REQUIRES_CONFIRMATION");
      assert.strictEqual(result.error?.suggestedAction, "REQUEST_CANCEL_ORDER_CONFIRMATION");
    });
  });

  describe("5. Backend Sanitization Boundary (RAW OBJECT ≠ LLM CONTEXT)", () => {
    test("Sanitización de Telemetría: NUNCA debe exponer coordenadas GPS crudas, courierUid ni FCM tokens", () => {
      const orderData = {
        businessName: "Burger Express",
        status: "on_the_way",
      };

      const telemetry = {
        distanceKm: 2.34,
        etaMinutes: 7.5,
        signalFreshnessSeconds: 25,
        isMoving: true,
      };

      const sanitizedOutput = BackendSanitization.sanitizeTracking(orderData, telemetry);

      // Verificaciones positivas
      assert.strictEqual(sanitizedOutput.includes("2.3 km"), true);
      assert.strictEqual(sanitizedOutput.includes("~8 minutos"), true);
      assert.strictEqual(sanitizedOutput.includes("En tiempo real"), true);

      // Verificaciones negativas estrictas de seguridad (Frontera de privacidad)
      assert.strictEqual(sanitizedOutput.includes("latitude"), false);
      assert.strictEqual(sanitizedOutput.includes("longitude"), false);
      assert.strictEqual(sanitizedOutput.includes("lat"), false);
      assert.strictEqual(sanitizedOutput.includes("lng"), false);
      assert.strictEqual(sanitizedOutput.includes("courierUid"), false);
      assert.strictEqual(sanitizedOutput.includes("fcmToken"), false);
    });

    test("Sanitización de Perfil: NUNCA debe exponer contraseñas, emails o credenciales privadas", () => {
      const userData = {
        nombre: "Carlos Mendoza",
        email: "carlos.privado@example.com",
        passwordHash: "$2b$12$eX4mpL3H4sHNotToBeExposed",
        puntos: 350,
        direccion: "Altamira D'Este #45",
      };

      const sanitizedOutput = BackendSanitization.sanitizeCustomerContext(userData);
      assert.strictEqual(sanitizedOutput.includes("Carlos Mendoza"), true);
      assert.strictEqual(sanitizedOutput.includes("350"), true);
      assert.strictEqual(sanitizedOutput.includes("Altamira"), true);

      assert.strictEqual(sanitizedOutput.includes("passwordHash"), false);
      assert.strictEqual(sanitizedOutput.includes("eX4mpL3H4sH"), false);
      assert.strictEqual(sanitizedOutput.includes("carlos.privado@example.com"), false);
    });
  });
});
