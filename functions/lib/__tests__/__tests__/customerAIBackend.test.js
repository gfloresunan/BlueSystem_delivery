"use strict";
/**
 * BlueSystem Delivery Enterprise — Backend AI Security & Tool Execution Unit Tests (C3-C)
 * PROTOCOL ID: BSD-AI-C3C-BACKEND-TOOLS-SECURE-AI-GATEWAY
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const RateLimiter_1 = require("../ai/RateLimiter");
const BackendToolRegistry_1 = require("../ai/BackendToolRegistry");
const BackendSanitization_1 = require("../ai/BackendSanitization");
const CustomerAIService_1 = require("../ai/CustomerAIService");
(0, node_test_1.describe)("BlueSystem AI Backend (C3-C) — Security & Execution Suite", () => {
    let rateLimiter;
    let aiService;
    (0, node_test_1.beforeEach)(() => {
        process.env.NODE_ENV = "test";
        process.env.AI_CONFIRMATION_SECRET = "test_confirmation_secret_64chars_abcdefghijklmnopqrstuvwxyz";
        process.env.GEMINI_AI_ENABLED = "true";
        rateLimiter = new RateLimiter_1.RateLimiter(5, 60000); // 5 req/min para tests rápidos
        aiService = new CustomerAIService_1.CustomerAIService(rateLimiter);
    });
    (0, node_test_1.describe)("1. Rate Limiting & Abuse Defense", () => {
        (0, node_test_1.test)("Debe permitir solicitudes dentro del umbral", () => {
            const uid = "usr_test_001";
            for (let i = 0; i < 5; i++) {
                const check = rateLimiter.checkLimit(uid);
                assert.strictEqual(check.allowed, true, `La solicitud ${i + 1} debió ser permitida`);
            }
        });
        (0, node_test_1.test)("Debe bloquear y rechazar al superar el límite de solicitudes por minuto", () => {
            const uid = "usr_test_002";
            for (let i = 0; i < 5; i++) {
                rateLimiter.checkLimit(uid);
            }
            const blockedCheck = rateLimiter.checkLimit(uid);
            assert.strictEqual(blockedCheck.allowed, false);
            assert.strictEqual(blockedCheck.remaining, 0);
        });
        (0, node_test_1.test)("CustomerAIService debe retornar RATE_LIMITED cuando se supera el límite", async () => {
            const uid = "usr_test_flood";
            const context = {
                authUid: uid,
                isAuthenticated: true,
                appCheckVerified: true,
                confirmedByUser: false,
            };
            const request = {
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
    (0, node_test_1.describe)("2. Tool Registry & Plane Boundary Enforcement", () => {
        (0, node_test_1.test)("El registro debe contener exactamente las 9 herramientas backend autoritativas", () => {
            const tools = BackendToolRegistry_1.BackendToolRegistry.getAllBackendTools();
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
                assert.strictEqual(BackendToolRegistry_1.BackendToolRegistry.isRegisteredBackendTool(id), true, `Herramienta ${id} debe estar registrada`);
            });
        });
        (0, node_test_1.test)("Debe rechazar herramientas locales invocadas erróneamente en backend con TOOL_NOT_ELIGIBLE", async () => {
            const context = {
                authUid: "usr_client_001",
                isAuthenticated: true,
                appCheckVerified: true,
                confirmedByUser: false,
            };
            const localToolRequest = {
                toolId: "tool_search_products",
                parameters: { query: "pizza" },
            };
            const result = await aiService.executeTool(localToolRequest, context);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.status, "UNAUTHORIZED");
            assert.strictEqual(result.error?.code, "TOOL_NOT_ELIGIBLE");
            assert.strictEqual(result.sanitizedLlmContext.includes("plano de ejecución local"), true);
        });
        (0, node_test_1.test)("Debe rechazar herramientas inexistentes o especulativas con TOOL_NOT_FOUND", async () => {
            const context = {
                authUid: "usr_client_001",
                isAuthenticated: true,
                appCheckVerified: true,
                confirmedByUser: false,
            };
            const unknownRequest = {
                toolId: "tool_speculative_admin_query",
                parameters: {},
            };
            const result = await aiService.executeTool(unknownRequest, context);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error?.code, "TOOL_NOT_FOUND");
        });
    });
    (0, node_test_1.describe)("3. Authentication & Multi-Tenant Identity Guard", () => {
        (0, node_test_1.test)("Debe rechazar usuarios no autenticados en herramientas protegidas con UNAUTHENTICATED", async () => {
            const unauthContext = {
                authUid: "",
                isAuthenticated: false,
                appCheckVerified: false,
                confirmedByUser: false,
            };
            const request = {
                toolId: "tool_get_active_order",
                parameters: {},
            };
            const result = await aiService.executeTool(request, unauthContext);
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.status, "UNAUTHORIZED");
            assert.strictEqual(result.error?.code, "UNAUTHENTICATED");
        });
    });
    (0, node_test_1.describe)("4. Level 3 & Level 4 Confirmation Gate Integrity", () => {
        (0, node_test_1.test)("tool_create_authoritative_order sin confirmación humana debe retornar REQUIRES_CONFIRMATION", async () => {
            const context = {
                authUid: "usr_buyer_001",
                isAuthenticated: true,
                appCheckVerified: true,
                confirmedByUser: false, // Sin confirmación física
            };
            const request = {
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
        (0, node_test_1.test)("tool_cancel_order sin confirmación humana debe retornar REQUIRES_CONFIRMATION", async () => {
            const context = {
                authUid: "usr_buyer_001",
                isAuthenticated: true,
                appCheckVerified: true,
                confirmedByUser: false,
            };
            const request = {
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
    (0, node_test_1.describe)("5. Backend Sanitization Boundary (RAW OBJECT ≠ LLM CONTEXT)", () => {
        (0, node_test_1.test)("Sanitización de Telemetría: NUNCA debe exponer coordenadas GPS crudas, courierUid ni FCM tokens", () => {
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
            const sanitizedOutput = BackendSanitization_1.BackendSanitization.sanitizeTracking(orderData, telemetry);
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
        (0, node_test_1.test)("Sanitización de Perfil: NUNCA debe exponer contraseñas, emails o credenciales privadas", () => {
            const userData = {
                nombre: "Carlos Mendoza",
                email: "carlos.privado@example.com",
                passwordHash: "$2b$12$eX4mpL3H4sHNotToBeExposed",
                puntos: 350,
                direccion: "Altamira D'Este #45",
            };
            const sanitizedOutput = BackendSanitization_1.BackendSanitization.sanitizeCustomerContext(userData);
            assert.strictEqual(sanitizedOutput.includes("Carlos Mendoza"), true);
            assert.strictEqual(sanitizedOutput.includes("350"), true);
            assert.strictEqual(sanitizedOutput.includes("Altamira"), true);
            assert.strictEqual(sanitizedOutput.includes("passwordHash"), false);
            assert.strictEqual(sanitizedOutput.includes("eX4mpL3H4sH"), false);
            assert.strictEqual(sanitizedOutput.includes("carlos.privado@example.com"), false);
        });
    });
});
