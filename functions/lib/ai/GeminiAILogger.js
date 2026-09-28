"use strict";
/**
 * BlueSystem Delivery Enterprise — Observabilidad Estructurada para Gemini AI (C3-GR / C3-H)
 * PROTOCOL ID: BSD-AI-C3H-GEMINI-CONTROLLED-CANARY-GATE
 *
 * Logging JSON estructurado para operaciones Gemini Customer AI.
 *
 * REGLA ABSOLUTA — NUNCA REGISTRAR EN LOGS:
 * - GEMINI_API_KEY, AI_CONFIRMATION_SECRET, Firebase credentials
 * - FCM token, raw GPS (latitude, longitude), courierUid
 * - passwords, confirmationToken completo, perfil completo del cliente
 *
 * uid_hash = SHA-256 parcial del authUid (16 hex chars). NUNCA el UID raw.
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
exports.GeminiAILogger = void 0;
const crypto = __importStar(require("crypto"));
// ─── Implementacion ──────────────────────────────────────────────────────────
class GeminiAILogger {
    static hashUid(authUid) {
        if (!authUid)
            return "anonymous";
        return crypto.createHash("sha256").update(authUid).digest("hex").substring(0, 16);
    }
    static generateCorrelationId() {
        return `gem_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    }
    /**
     * Cost Accounting Dinamico:
     * Calcula el costo estimado en base a tokens reales y tarifas vigentes parametrizadas.
     * Pura observabilidad — NO influye en la seleccion de modelo ni autorizacion.
     */
    static calculateEstimatedCost(inputTokens, outputTokens, pricing) {
        const inputCost = (inputTokens / 1000000) * pricing.inputPricePerMillionUSD;
        const outputCost = (outputTokens / 1000000) * pricing.outputPricePerMillionUSD;
        return {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            estimatedInputCostUSD: Number(inputCost.toFixed(6)),
            estimatedOutputCostUSD: Number(outputCost.toFixed(6)),
            estimatedTotalCostUSD: Number((inputCost + outputCost).toFixed(6)),
        };
    }
    static log(event) {
        const logEntry = Object.assign({ timestamp: new Date().toISOString(), service: "BlueSystem.CustomerAI" }, event);
        console.log(JSON.stringify(logEntry));
    }
    static logChatStart(authUid, model) {
        const correlationId = this.generateCorrelationId();
        const startMs = Date.now();
        this.log({
            event_name: "GEMINI_CHAT_START",
            correlation_id: correlationId,
            uid_hash: this.hashUid(authUid),
            model,
            success: true,
            execution_plane: "GEMINI",
        });
        return { correlationId, startMs };
    }
    static logChatComplete(params) {
        var _a;
        this.log({
            event_name: "GEMINI_CHAT_COMPLETE",
            correlation_id: params.correlationId,
            uid_hash: this.hashUid(params.authUid),
            model: params.model,
            latency_ms: Date.now() - params.startMs,
            tool_round_count: params.toolRoundCount,
            execution_plane: "GEMINI",
            confirmation_requested: params.confirmationRequested,
            confirmation_completed: params.confirmationCompleted,
            provider_status: (_a = params.providerStatus) !== null && _a !== void 0 ? _a : "OK",
            provider_error: false,
            success: true,
            input_tokens: params.inputTokens,
            output_tokens: params.outputTokens,
            total_tokens: params.totalTokens,
            estimated_cost_usd: params.estimatedCostUSD,
        });
    }
    static logChatError(params) {
        var _a;
        this.log({
            event_name: "GEMINI_CHAT_ERROR",
            correlation_id: params.correlationId,
            uid_hash: this.hashUid(params.authUid),
            model: params.model,
            latency_ms: Date.now() - params.startMs,
            provider_error: true,
            provider_status: (_a = params.providerStatus) !== null && _a !== void 0 ? _a : "ERROR",
            success: false,
            failure_code: params.failureCode,
            execution_plane: "GEMINI",
        });
    }
    static logToolExecution(params) {
        this.log({
            event_name: "GEMINI_TOOL_EXECUTION",
            correlation_id: params.correlationId,
            uid_hash: this.hashUid(params.authUid),
            tool_id: params.toolId,
            execution_plane: "BACKEND",
            success: params.success,
            latency_ms: params.latencyMs,
            failure_code: params.failureCode,
            confirmation_requested: params.confirmationRequired,
        });
    }
    static logKillSwitchDisabled(authUid) {
        this.log({
            event_name: "GEMINI_DISABLED",
            correlation_id: this.generateCorrelationId(),
            uid_hash: this.hashUid(authUid),
            provider_status: "DISABLED",
            execution_plane: "KILL_SWITCH",
            success: false,
            failure_code: "SERVICE_UNAVAILABLE",
        });
    }
    static logOutOfScope(authUid, intent, reason) {
        this.log({
            event_name: "GEMINI_OUT_OF_SCOPE",
            correlation_id: this.generateCorrelationId(),
            uid_hash: this.hashUid(authUid),
            provider_status: "OK",
            execution_plane: "LOCAL",
            success: true,
            failure_code: `OUT_OF_SCOPE_${intent}`,
        });
    }
    static logDailyLimitReached(authUid, requestsToday) {
        this.log({
            event_name: "GEMINI_DAILY_LIMIT_REACHED",
            correlation_id: this.generateCorrelationId(),
            uid_hash: this.hashUid(authUid),
            provider_status: "RATE_LIMITED",
            execution_plane: "LOCAL",
            success: false,
            failure_code: "DAILY_LIMIT_REACHED",
        });
    }
    static logDuplicateRequest(authUid) {
        this.log({
            event_name: "GEMINI_DUPLICATE_REQUEST",
            correlation_id: this.generateCorrelationId(),
            uid_hash: this.hashUid(authUid),
            provider_status: "OK",
            execution_plane: "LOCAL",
            success: true,
            failure_code: "DUPLICATE_REQUEST_AVOIDED",
        });
    }
    static logBudgetAlert(authUid, currentCostUSD, thresholdUSD) {
        this.log({
            event_name: "GEMINI_BUDGET_ALERT",
            correlation_id: this.generateCorrelationId(),
            uid_hash: this.hashUid(authUid),
            provider_status: "OK",
            execution_plane: "LOCAL",
            success: true,
            estimated_cost_usd: currentCostUSD,
            failure_code: `BUDGET_THRESHOLD_${thresholdUSD}`,
        });
    }
}
exports.GeminiAILogger = GeminiAILogger;
//# sourceMappingURL=GeminiAILogger.js.map