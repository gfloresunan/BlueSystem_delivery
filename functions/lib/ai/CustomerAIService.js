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
const productionCanaryLock_1 = require("../config/productionCanaryLock");
const IntentBoundaryEngine_1 = require("./IntentBoundaryEngine");
const CustomerAICostGovernance_1 = require("./CustomerAICostGovernance");
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
            new BackendToolAdapters_1.GetAvailableCouponsAdapter(),
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
     * C3-N:
     * 0. Kill Switch — PRIMER check.
     * 0.5. Canary Gate — Allowlist / Canary público.
     * 0.7. Intent Boundary — Rechazo determinista 0 Gemini para fuera de dominio.
     * 0.8. Duplicate Protection — Detección de doble-tap / peticiones idénticas rápidas.
     * 0.9. Daily Quota Gate — Límite diario de requests por usuario.
     * 1. Observabilidad Inicio.
     * 2. Rate Limiting por minuto.
     * 3. Orquestación Gemini Runtime (MAX_TOOL_ROUNDS = 5).
     * 4. Observabilidad Cierre y Contabilidad de Costo/Tokens.
     */
    async processConversationalChat(payload, context) {
        var _a, _b, _c, _d, _e, _f, _g;
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
        // 0.5. Canary Gate — COMPUERTA CONTROLADA POR ALLOWLIST O PUBLIC CANARY (C3-H..L)
        const isCanaryActive = process.env.GEMINI_AI_CANARY_ENABLED !== undefined
            ? process.env.GEMINI_AI_CANARY_ENABLED === "true"
            : productionCanaryLock_1.GEMINI_AI_CANARY_ENABLED;
        const isPublicCanaryActive = process.env.PUBLIC_CANARY_ENABLED === "true";
        if ((isCanaryActive || isPublicCanaryActive) && !productionCanaryLock_1.GeminiCanarySafetyController.isUidAuthorizedForCanary(context.authUid)) {
            GeminiAILogger_1.GeminiAILogger.log({
                event_name: "GEMINI_DISABLED",
                correlation_id: GeminiAILogger_1.GeminiAILogger.generateCorrelationId(),
                uid_hash: GeminiAILogger_1.GeminiAILogger.hashUid(context.authUid),
                provider_status: "DISABLED",
                execution_plane: "KILL_SWITCH",
                success: false,
                failure_code: "SERVICE_UNAVAILABLE",
            });
            return {
                text: "El asistente de IA no está disponible en este momento. Por favor intenta más tarde.",
                intent: "SERVICE_UNAVAILABLE",
                errors: [
                    {
                        code: "SERVICE_UNAVAILABLE",
                        userMessage: "Acceso no habilitado en la fase de prueba actual.",
                        recoverable: true,
                    },
                ],
                executionId: `exec_canary_${Date.now()}`,
            };
        }
        // 0.7. Intent Boundary Gate — PRIMERA LÍNEA DE AHORRO (C3-N)
        // Evalúa si la consulta está fuera del dominio de BlueSystem.
        // Si está fuera de dominio: 0 llamadas Gemini, 0 herramientas, 0 Firestore.
        const intentEvaluation = IntentBoundaryEngine_1.IntentBoundaryEngine.evaluate(payload.message);
        if (!intentEvaluation.isPermitted) {
            GeminiAILogger_1.GeminiAILogger.logOutOfScope(context.authUid, intentEvaluation.intent, intentEvaluation.reason);
            return {
                text: intentEvaluation.deterministicResponse || IntentBoundaryEngine_1.IntentBoundaryEngine.STANDARD_REJECTION_MESSAGE,
                intent: intentEvaluation.intent,
                executionId: `exec_oos_${Date.now()}`,
            };
        }
        // 0.8. Protección contra Preguntas Duplicadas (C3-N)
        if (context.authUid) {
            const duplicateCheck = CustomerAICostGovernance_1.CustomerAICostGovernance.checkDuplicate(context.authUid, payload.message);
            if (duplicateCheck.isDuplicate) {
                GeminiAILogger_1.GeminiAILogger.logDuplicateRequest(context.authUid);
                return {
                    text: duplicateCheck.cachedResponse || "Tu solicitud anterior está en proceso. Por favor espera un momento.",
                    intent: "DUPLICATE_REQUEST",
                    executionId: `exec_dup_${Date.now()}`,
                };
            }
        }
        // 0.9. Gobernanza de Cuota Diaria por Usuario (C3-N)
        if (context.authUid) {
            const dailyCheck = CustomerAICostGovernance_1.CustomerAICostGovernance.checkDailyQuota(context.authUid);
            if (!dailyCheck.allowed) {
                GeminiAILogger_1.GeminiAILogger.logDailyLimitReached(context.authUid, dailyCheck.usage.requests);
                return {
                    text: CustomerAICostGovernance_1.CustomerAICostGovernance.DAILY_LIMIT_MESSAGE,
                    intent: "DAILY_LIMIT_REACHED",
                    errors: [
                        {
                            code: "RATE_LIMITED",
                            userMessage: "Límite diario de solicitudes de asistencia alcanzado.",
                            suggestedAction: "RETRY_TOMORROW",
                        },
                    ],
                    executionId: `exec_daily_limit_${Date.now()}`,
                };
            }
        }
        // 1. Observabilidad — inicio del request (GAP-C3G-06)
        const modelName = this.geminiClient instanceof GeminiRuntimeService_1.ProductionGeminiClient
            ? this.geminiClient.getModelName()
            : "mock";
        const { correlationId, startMs } = GeminiAILogger_1.GeminiAILogger.logChatStart(context.authUid, modelName);
        // 2. Control de Abuso / Rate Limiting por Minuto
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
                failureCode: ((_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.includes("GEMINI_TIMEOUT")) ? "GEMINI_TIMEOUT" :
                    ((_b = err === null || err === void 0 ? void 0 : err.message) === null || _b === void 0 ? void 0 : _b.includes("GEMINI_RATE_LIMITED")) ? "GEMINI_RATE_LIMITED" : "GEMINI_UNAVAILABLE",
                providerStatus: ((_c = err === null || err === void 0 ? void 0 : err.message) === null || _c === void 0 ? void 0 : _c.includes("GEMINI_TIMEOUT")) ? "TIMEOUT" :
                    ((_d = err === null || err === void 0 ? void 0 : err.message) === null || _d === void 0 ? void 0 : _d.includes("GEMINI_RATE_LIMITED")) ? "RATE_LIMITED" : "ERROR",
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
        // 4. Observabilidad — cierre exitoso y Contabilidad de Costos (C3-N)
        // Estimación y registro de tokens de forma no disruptiva
        const approxInputTokens = Math.max(10, Math.round((payload.message.length + (((_e = payload.conversationHistory) === null || _e === void 0 ? void 0 : _e.reduce((a, b) => a + b.content.length, 0)) || 0)) / 4) + 120);
        const approxOutputTokens = Math.max(5, Math.round((((_f = result.text) === null || _f === void 0 ? void 0 : _f.length) || 0) / 4));
        const pricing = CustomerAICostGovernance_1.CustomerAICostGovernance.getPricingForModel(modelName);
        const costEstimate = GeminiAILogger_1.GeminiAILogger.calculateEstimatedCost(approxInputTokens, approxOutputTokens, pricing);
        if (context.authUid) {
            CustomerAICostGovernance_1.CustomerAICostGovernance.recordUsage(context.authUid, {
                inputTokens: approxInputTokens,
                outputTokens: approxOutputTokens,
                estimatedCostUSD: costEstimate.estimatedTotalCostUSD,
                toolRounds: ((_g = result.actions) === null || _g === void 0 ? void 0 : _g.length) || 1,
            });
            CustomerAICostGovernance_1.CustomerAICostGovernance.recordRecentResponse(context.authUid, payload.message, result.text);
        }
        // Verificación de alerta de costo
        const config = CustomerAICostGovernance_1.CustomerAICostGovernance.getConfig();
        if (costEstimate.estimatedTotalCostUSD >= config.requestCostAlertThresholdUSD) {
            GeminiAILogger_1.GeminiAILogger.logBudgetAlert(context.authUid, costEstimate.estimatedTotalCostUSD, config.requestCostAlertThresholdUSD);
        }
        GeminiAILogger_1.GeminiAILogger.logChatComplete({
            correlationId,
            authUid: context.authUid,
            startMs,
            model: modelName,
            confirmationRequested: Boolean(result.pendingConfirmation),
            providerStatus: "OK",
            inputTokens: approxInputTokens,
            outputTokens: approxOutputTokens,
            totalTokens: approxInputTokens + approxOutputTokens,
            estimatedCostUSD: costEstimate.estimatedTotalCostUSD,
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
        const effectiveContext = Object.assign(Object.assign({}, context), { confirmedByUser: isConfirmed });
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
            console.error(`[CustomerAIService] Error executing tool ${toolId}:`, err === null || err === void 0 ? void 0 : err.message);
            return {
                toolId,
                status: "FAILED",
                success: false,
                sanitizedLlmContext: "Ocurrió un error inesperado al procesar la solicitud en el servidor.",
                error: {
                    code: "INTERNAL_ERROR",
                    userMessage: "Error interno del servidor.",
                    technicalReason: (err === null || err === void 0 ? void 0 : err.name) || "InternalException",
                },
            };
        }
    }
}
exports.CustomerAIService = CustomerAIService;
exports.defaultCustomerAIService = new CustomerAIService();
//# sourceMappingURL=CustomerAIService.js.map