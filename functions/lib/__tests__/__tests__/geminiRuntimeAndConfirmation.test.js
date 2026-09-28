"use strict";
/**
 * BlueSystem Delivery Enterprise — Gemini Runtime & Confirmation Gate Tests (C3-D)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
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
const ConfirmationGateEngine_1 = require("../ai/ConfirmationGateEngine");
const GeminiSystemInstruction_1 = require("../ai/GeminiSystemInstruction");
const GeminiToolDeclarations_1 = require("../ai/GeminiToolDeclarations");
const GeminiRuntimeService_1 = require("../ai/GeminiRuntimeService");
const CustomerAIService_1 = require("../ai/CustomerAIService");
const RateLimiter_1 = require("../ai/RateLimiter");
(0, node_test_1.describe)("BlueSystem AI (C3-D) — Gemini Runtime & Confirmation Gate Foundation Suite", () => {
    let mockGemini;
    let aiService;
    (0, node_test_1.beforeEach)(() => {
        process.env.NODE_ENV = "test";
        process.env.AI_CONFIRMATION_SECRET = "test_confirmation_secret_64chars_abcdefghijklmnopqrstuvwxyz";
        process.env.GEMINI_AI_ENABLED = "true";
        ConfirmationGateEngine_1.ConfirmationGateEngine.resetConsumedTokens();
        mockGemini = new GeminiRuntimeService_1.MockGeminiClient();
        aiService = new CustomerAIService_1.CustomerAIService(new RateLimiter_1.RateLimiter(60, 60000), mockGemini);
    });
    (0, node_test_1.describe)("1. Confirmation Gate & Cryptographic Token Security", () => {
        (0, node_test_1.test)("Debe generar y validar exitosamente un token de confirmación para tool_create_authoritative_order", () => {
            const authUid = "usr_client_001";
            const toolId = "tool_create_authoritative_order";
            const params = { businessId: "biz_napoli", items: [{ productId: "p1", price: 180, quantity: 1 }] };
            const pending = ConfirmationGateEngine_1.ConfirmationGateEngine.createPendingConfirmation(authUid, toolId, "Confirmación de pedido", params);
            assert.ok(pending.confirmationToken, "Debe generar un token");
            assert.ok(pending.expiresAt > Date.now(), "Debe tener fecha de expiración futura");
            const validation = ConfirmationGateEngine_1.ConfirmationGateEngine.validateConfirmationToken(authUid, toolId, params, pending.confirmationToken);
            assert.strictEqual(validation.isValid, true, "El token generado debe ser válido");
        });
        (0, node_test_1.test)("Anti-Tampering: Debe rechazar el token si se modifican los parámetros de la operación", () => {
            const authUid = "usr_client_001";
            const toolId = "tool_create_authoritative_order";
            const originalParams = { businessId: "biz_napoli", items: [{ productId: "p1", price: 180, quantity: 1 }] };
            const pending = ConfirmationGateEngine_1.ConfirmationGateEngine.createPendingConfirmation(authUid, toolId, "Confirmación de pedido", originalParams);
            // Parámetros alterados maliciosamente (ej. cambiar precio o items)
            const tamperedParams = { businessId: "biz_napoli", items: [{ productId: "p1", price: 10, quantity: 1 }] };
            const validation = ConfirmationGateEngine_1.ConfirmationGateEngine.validateConfirmationToken(authUid, toolId, tamperedParams, pending.confirmationToken);
            assert.strictEqual(validation.isValid, false);
            assert.strictEqual(validation.errorCode, "INVALID_TOKEN");
        });
        (0, node_test_1.test)("Multi-Tenant Isolation: Un token de User A NO debe autorizar la operación para User B", () => {
            const userA = "usr_victim_001";
            const userB = "usr_attacker_002";
            const toolId = "tool_cancel_order";
            const params = { orderId: "ord_999" };
            const pendingUserA = ConfirmationGateEngine_1.ConfirmationGateEngine.createPendingConfirmation(userA, toolId, "Cancelar orden de User A", params);
            // User B intenta usar el token de User A
            const validation = ConfirmationGateEngine_1.ConfirmationGateEngine.validateConfirmationToken(userB, toolId, params, pendingUserA.confirmationToken);
            assert.strictEqual(validation.isValid, false);
            assert.strictEqual(validation.errorCode, "INVALID_TOKEN");
        });
        (0, node_test_1.test)("Cross-Tool Protection: Un token para tool_clear_cart NO debe autorizar tool_create_authoritative_order", () => {
            const authUid = "usr_client_001";
            const clearCartParams = {};
            const orderParams = { businessId: "biz_001", items: [{ productId: "p1", quantity: 1 }] };
            const pendingClearCart = ConfirmationGateEngine_1.ConfirmationGateEngine.createPendingConfirmation(authUid, "tool_clear_cart", "Vaciar carrito", clearCartParams);
            const validation = ConfirmationGateEngine_1.ConfirmationGateEngine.validateConfirmationToken(authUid, "tool_create_authoritative_order", orderParams, pendingClearCart.confirmationToken);
            assert.strictEqual(validation.isValid, false);
            assert.strictEqual(validation.errorCode, "INVALID_TOKEN");
        });
        (0, node_test_1.test)("Anti-Replay: Un token consumido no puede volver a ser utilizado", () => {
            const authUid = "usr_client_001";
            const toolId = "tool_cancel_order";
            const params = { orderId: "ord_123" };
            const pending = ConfirmationGateEngine_1.ConfirmationGateEngine.createPendingConfirmation(authUid, toolId, "Cancelar pedido", params);
            // Primer consumo -> Exitoso
            const firstUse = ConfirmationGateEngine_1.ConfirmationGateEngine.validateConfirmationToken(authUid, toolId, params, pending.confirmationToken);
            assert.strictEqual(firstUse.isValid, true);
            // Segundo consumo -> Rechazado por Replay
            const secondUse = ConfirmationGateEngine_1.ConfirmationGateEngine.validateConfirmationToken(authUid, toolId, params, pending.confirmationToken);
            assert.strictEqual(secondUse.isValid, false);
            assert.strictEqual(secondUse.errorCode, "ALREADY_CONSUMED");
        });
    });
    (0, node_test_1.describe)("2. Gemini System Instruction & Tool Declarations Contract", () => {
        (0, node_test_1.test)("La instrucción del sistema debe contener los principios inquebrantables de seguridad", () => {
            assert.ok(GeminiSystemInstruction_1.GEMINI_SYSTEM_INSTRUCTION.includes("NUNCA inventes"), "Debe prohibir inventar datos");
            assert.ok(GeminiSystemInstruction_1.GEMINI_SYSTEM_INSTRUCTION.includes("autoridad financiera"), "Debe limitar autoridad financiera");
            assert.ok(GeminiSystemInstruction_1.GEMINI_SYSTEM_INSTRUCTION.includes("confirmación explícita"), "Debe exigir confirmación");
            assert.ok(GeminiSystemInstruction_1.GEMINI_SYSTEM_INSTRUCTION.includes("Inyecciones de Prompt"), "Debe incluir defensa de inyección");
        });
        (0, node_test_1.test)("El catálogo de declaraciones de Gemini debe contener las 20 herramientas canónicas", () => {
            assert.strictEqual(GeminiToolDeclarations_1.GEMINI_TOOL_DECLARATIONS.length, 20);
            const expectedNames = [
                "tool_search_products",
                "tool_search_businesses",
                "tool_resolve_catalog_entity",
                "tool_get_product_detail",
                "tool_get_business_detail",
                "tool_get_nearby_businesses",
                "tool_get_cart",
                "tool_add_to_cart",
                "tool_update_cart_quantity",
                "tool_remove_from_cart",
                "tool_clear_cart",
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
            expectedNames.forEach((name) => {
                const found = GeminiToolDeclarations_1.GEMINI_TOOL_DECLARATIONS.some((d) => d.name === name);
                assert.strictEqual(found, true, `Declaración ${name} debe existir`);
            });
        });
    });
    (0, node_test_1.describe)("3. Gemini Runtime Orchestration & Safety Boundaries", () => {
        (0, node_test_1.test)("Debe procesar una consulta conversacional simple y devolver respuesta estructurada", async () => {
            mockGemini.setDefaultResponse({
                text: "¡Hola! Con gusto te muestro las promociones del día.",
            });
            const context = {
                authUid: "usr_client_001",
                isAuthenticated: true,
                appCheckVerified: true,
                confirmedByUser: false,
            };
            const response = await aiService.processConversationalChat({ message: "Hola, ¿qué opciones tienes hoy?" }, context);
            assert.strictEqual(response.intent, "GENERAL_INQUIRY");
            assert.strictEqual(response.text.includes("promociones del día"), true);
            assert.ok(response.executionId.startsWith("exec_"));
        });
        (0, node_test_1.test)("Debe emitir EXECUTE_LOCAL_TOOL cuando Gemini solicita una herramienta del plano local", async () => {
            mockGemini.queueResponse({
                functionCall: {
                    name: "tool_search_products",
                    args: { query: "pizza margarita" },
                },
            });
            const context = {
                authUid: "usr_client_001",
                isAuthenticated: true,
                appCheckVerified: true,
                confirmedByUser: false,
            };
            const response = await aiService.processConversationalChat({ message: "Búscame pizza margarita" }, context);
            assert.strictEqual(response.intent, "LOCAL_TOOL_DISPATCH");
            assert.ok(response.actions?.length === 1);
            assert.strictEqual(response.actions?.[0].type, "EXECUTE_LOCAL_TOOL");
            assert.strictEqual(response.actions?.[0].payload.toolId, "tool_search_products");
        });
        (0, node_test_1.test)("Debe emitir REQUEST_CONFIRMATION y PendingConfirmation cuando Gemini solicita crear orden", async () => {
            mockGemini.queueResponse({
                functionCall: {
                    name: "tool_create_authoritative_order",
                    args: {
                        businessId: "biz_001",
                        items: [{ productId: "p1", quantity: 1, price: 150 }],
                    },
                },
            });
            const context = {
                authUid: "usr_client_001",
                isAuthenticated: true,
                appCheckVerified: true,
                confirmedByUser: false, // Sin confirmación previa
            };
            const response = await aiService.processConversationalChat({ message: "Quiero ordenar esta pizza ahora mismo" }, context);
            assert.strictEqual(response.intent, "CONFIRMATION_REQUIRED");
            assert.ok(response.pendingConfirmation, "Debe incluir pendingConfirmation");
            assert.strictEqual(response.pendingConfirmation?.toolId, "tool_create_authoritative_order");
            assert.ok(response.pendingConfirmation?.confirmationToken, "Debe tener token firmado");
            assert.strictEqual(response.actions?.[0].type, "REQUEST_CONFIRMATION");
        });
        (0, node_test_1.test)("Debe limitar las rondas de herramientas a MAX_TOOL_ROUNDS para evitar bucles infinitos", async () => {
            // Configurar bucle infinito simulado de llamadas
            for (let i = 0; i < 10; i++) {
                mockGemini.queueResponse({
                    functionCall: {
                        name: "tool_unknown_speculative_call",
                        args: {},
                    },
                });
            }
            const context = {
                authUid: "usr_client_001",
                isAuthenticated: true,
                appCheckVerified: true,
                confirmedByUser: false,
            };
            const response = await aiService.processConversationalChat({ message: "Buscar productos en bucle infinito" }, context);
            assert.strictEqual(response.intent, "MAX_ROUNDS_REACHED");
        });
    });
});
