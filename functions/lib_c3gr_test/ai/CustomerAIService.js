"use strict";
/**
 * BlueSystem Delivery Enterprise — Servicio Central de IA Backend (C3-C / C3-D)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCustomerAIService = exports.CustomerAIService = void 0;
const BackendToolRegistry_1 = require("./BackendToolRegistry");
const RateLimiter_1 = require("./RateLimiter");
const BackendToolAdapters_1 = require("./BackendToolAdapters");
const ConfirmationGateEngine_1 = require("./ConfirmationGateEngine");
const GeminiRuntimeService_1 = require("./GeminiRuntimeService");
const GeminiKillSwitch_1 = require("./GeminiKillSwitch");
const GeminiAILogger_1 = require("./GeminiAILogger");
class CustomerAIService {
    constructor(rateLimiter = RateLimiter_1.defaultRateLimiter, geminiClient) {
        this.adapters = new Map();
        this.rateLimiter = rateLimiter;
        this.geminiClient = geminiClient || (process.env.NODE_ENV === "test" ? new GeminiRuntimeService_1.MockGeminiClient() : new GeminiRuntimeService_1.ProductionGeminiClient());
        this.registerDefaultAdapters();
        this.runtimeService = new GeminiRuntimeService_1.GeminiRuntimeService(this.geminiClient, this.adapters);
    }
    registerDefaultAdapters() {
        const list = [
            new BackendToolAdapters_1.GetCustomerContextAdapter(),
            new BackendToolAdapters_1.GetActiveOrderAdapter(),
            new BackendToolAdapters_1.GetOrderHistoryAdapter(),
            new BackendToolAdapters_1.GetOrderTrackingAdapter(),
            new BackendToolAdapters_1.ValidateCouponAdapter(),
            new BackendToolAdapters_1.CreateAuthoritativeOrderAdapter(),
            new BackendToolAdapters_1.CancelOrderAdapter(),
            new BackendToolAdapters_1.SubmitOrderReviewAdapter(),
        ];
        list.forEach((adapter) => {
            this.adapters.set(adapter.toolId, adapter);
        });
    }
    getRuntimeService() {
        return this.runtimeService;
    }
    getGeminiClient() {
        return this.geminiClient;
    }
    /**
     * Procesa una conversacion natural del cliente mediante Gemini orquestado.
     *
     * C3-GR: Kill Switch es el PRIMER check — antes del rate limiter y antes de cualquier
     * llamada a GeminiRuntimeService. Si el switch esta desactivado, retorna respuesta
     * normalizada sin generar trafico hacia el proveedor Gemini.
     */
    async processConversationalChat(payload, context) {
        // 0. Kill Switch — PRIMER CHECK (GAP-C3G-08)
        if (!GeminiKillSwitch_1.GeminiKillSwitch.isGeminiEnabled()) {
            GeminiAILogger_1.GeminiAILogger.logKillSwitchDisabled(context.authUid);
            return {
                text: "El asistente de IA no está disponible en este momento. Por favor intenta más tarde.",
                intent: "SERVICE_UNAVAILABLE",
                errors: [
                    {
                        code: "SERVICE_UNAVAILABLE",
                        userMessage: "Servicio de asistencia temporalmente deshabilitado.",
                        recoverable: true,
                    },
                ],
                executionId: `exec_ks_${Date.now()}`,
            };
        }
        // 1. Observabilidad — inicio del request (GAP-C3G-06)
        const modelName = this.geminiClient instanceof GeminiRuntimeService_1.ProductionGeminiClient
            ? this.geminiClient.getModelName()
            : "mock";
        const { correlationId, startMs } = GeminiAILogger_1.GeminiAILogger.logChatStart(context.authUid, modelName);
        // 2. Control de Abuso / Rate Limiting
        if (context.authUid) {
            const rateCheck = this.rateLimiter.checkLimit(context.authUid);
            if (!rateCheck.allowed) {
                GeminiAILogger_1.GeminiAILogger.logChatError({
                    correlationId,
                    authUid: context.authUid,
                    startMs,
                    failureCode: "RATE_LIMITED",
                    providerStatus: "RATE_LIMITED",
                    model: modelName,
                });
                return {
                    text: "Has alcanzado el límite de mensajes por minuto. Por favor, espera un momento.",
                    intent: "RATE_LIMITED",
                    errors: [
                        {
                            code: "RATE_LIMITED",
                            userMessage: "Límite de solicitudes por minuto alcanzado.",
                            suggestedAction: "RETRY_AFTER_COOLDOWN",
                        },
                    ],
                    executionId: `exec_rl_${Date.now()}`,
                };
            }
        }
        // 3. Orquestar runtime de Gemini
        let result;
        try {
            result = await this.runtimeService.orchestrate(payload.message, payload.conversationHistory || [], context);
        }
        catch (err) {
            GeminiAILogger_1.GeminiAILogger.logChatError({
                correlationId,
                authUid: context.authUid,
                startMs,
                failureCode: err?.message?.includes("GEMINI_TIMEOUT") ? "GEMINI_TIMEOUT" :
                    err?.message?.includes("GEMINI_RATE_LIMITED") ? "GEMINI_RATE_LIMITED" : "GEMINI_UNAVAILABLE",
                providerStatus: err?.message?.includes("GEMINI_TIMEOUT") ? "TIMEOUT" :
                    err?.message?.includes("GEMINI_RATE_LIMITED") ? "RATE_LIMITED" : "ERROR",
                model: modelName,
            });
            return {
                text: "Lo sentimos, el servicio de asistencia no está disponible temporalmente.",
                intent: "ERROR",
                errors: [
                    {
                        code: "GEMINI_UNAVAILABLE",
                        userMessage: "Error de comunicación con el motor de IA.",
                    },
                ],
                executionId: `exec_err_${Date.now()}`,
            };
        }
        // 4. Observabilidad — cierre exitoso
        GeminiAILogger_1.GeminiAILogger.logChatComplete({
            correlationId,
            authUid: context.authUid,
            startMs,
            model: modelName,
            confirmationRequested: Boolean(result.pendingConfirmation),
            providerStatus: "OK",
        });
        return result;
    }
    /**
     * Ejecuta directamente una herramienta del backend.
     */
    async executeTool(request, context) {
        const { toolId, parameters } = request;
        // 1. Validación de Herramientas Locales
        if (BackendToolRegistry_1.BackendToolRegistry.isLocalOnlyTool(toolId)) {
            return {
                toolId,
                status: "UNAUTHORIZED",
                success: false,
                sanitizedLlmContext: `La herramienta '${toolId}' pertenece al plano de ejecución local del cliente y no debe invocarse en el backend.`,
                error: {
                    code: "TOOL_NOT_ELIGIBLE",
                    userMessage: "Operación local no permitida en backend.",
                },
            };
        }
        // 2. Validación de Allowlist
        const toolDef = BackendToolRegistry_1.BackendToolRegistry.getTool(toolId);
        if (!toolDef) {
            return {
                toolId: toolId || "unknown",
                status: "FAILED",
                success: false,
                sanitizedLlmContext: `Herramienta '${toolId}' no reconocida o no registrada en el catálogo de IA.`,
                error: {
                    code: "TOOL_NOT_FOUND",
                    userMessage: "Herramienta desconocida.",
                },
            };
        }
        // 3. Verificación de Autenticación Requerida
        if (toolDef.requiresAuthentication && (!context.isAuthenticated || !context.authUid)) {
            return {
                toolId,
                status: "UNAUTHORIZED",
                success: false,
                sanitizedLlmContext: "Esta operación requiere que inicies sesión con tu cuenta.",
                error: {
                    code: "UNAUTHENTICATED",
                    userMessage: "Autenticación requerida.",
                },
            };
        }
        // 4. Validación Criptográfica de Confirmación para Herramientas Level 3 / Level 4
        let isConfirmed = context.confirmedByUser;
        if (toolDef.requiresConfirmation && request.confirmationToken) {
            const validation = ConfirmationGateEngine_1.ConfirmationGateEngine.validateConfirmationToken(context.authUid, toolId, parameters || {}, request.confirmationToken);
            if (validation.isValid) {
                isConfirmed = true;
            }
        }
        const effectiveContext = {
            ...context,
            confirmedByUser: isConfirmed,
        };
        // 5. Rate Limiting por UID
        if (context.authUid) {
            const rateCheck = this.rateLimiter.checkLimit(context.authUid);
            if (!rateCheck.allowed) {
                return {
                    toolId: toolId || "unknown",
                    status: "FAILED",
                    success: false,
                    sanitizedLlmContext: "Has superado el límite de solicitudes. Por favor espera un momento.",
                    error: {
                        code: "RATE_LIMITED",
                        userMessage: "Límite de solicitudes por minuto alcanzado.",
                        suggestedAction: "RETRY_AFTER_COOLDOWN",
                    },
                };
            }
        }
        // 6. Resolución del Adaptador
        const adapter = this.adapters.get(toolId);
        if (!adapter) {
            return {
                toolId,
                status: "FAILED",
                success: false,
                sanitizedLlmContext: `No hay un adaptador disponible para '${toolId}'.`,
                error: {
                    code: "INTERNAL_ERROR",
                    userMessage: "Error de configuración de adaptador.",
                },
            };
        }
        // 7. Ejecución Segura
        try {
            return await adapter.execute(parameters || {}, effectiveContext);
        }
        catch (err) {
            console.error(`[CustomerAIService] Error executing tool ${toolId}:`, err?.message);
            return {
                toolId,
                status: "FAILED",
                success: false,
                sanitizedLlmContext: "Ocurrió un error inesperado al procesar la solicitud en el servidor.",
                error: {
                    code: "INTERNAL_ERROR",
                    userMessage: "Error interno del servidor.",
                    technicalReason: err?.name || "InternalException",
                },
            };
        }
    }
}
exports.CustomerAIService = CustomerAIService;
exports.defaultCustomerAIService = new CustomerAIService();
