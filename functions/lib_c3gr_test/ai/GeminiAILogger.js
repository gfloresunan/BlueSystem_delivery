"use strict";
/**
 * BlueSystem Delivery Enterprise � Observabilidad Estructurada para Gemini AI (C3-GR)
 * PROTOCOL ID: BSD-AI-C3GR-PRE-CANARY-GEMINI-REMEDIATION
 *
 * GAP-C3G-06: Logging JSON estructurado para operaciones Gemini Customer AI.
 *
 * REGLA ABSOLUTA � NUNCA REGISTRAR EN LOGS:
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
// --- Implementacion ----------------------------------------------------------
class GeminiAILogger {
    static hashUid(authUid) {
        if (!authUid)
            return "anonymous";
        return crypto.createHash("sha256").update(authUid).digest("hex").substring(0, 16);
    }
    static generateCorrelationId() {
        return `gem_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    }
    static log(event) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            service: "BlueSystem.CustomerAI",
            ...event,
        };
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
            provider_status: params.providerStatus ?? "OK",
            provider_error: false,
            success: true,
            input_tokens: params.inputTokens,
            output_tokens: params.outputTokens,
            total_tokens: params.totalTokens,
        });
    }
    static logChatError(params) {
        this.log({
            event_name: "GEMINI_CHAT_ERROR",
            correlation_id: params.correlationId,
            uid_hash: this.hashUid(params.authUid),
            model: params.model,
            latency_ms: Date.now() - params.startMs,
            provider_error: true,
            provider_status: params.providerStatus ?? "ERROR",
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
}
exports.GeminiAILogger = GeminiAILogger;
