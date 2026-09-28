"use strict";
/**
 * BlueSystem Delivery Enterprise — Cost & Usage Governance Engine (C3-N)
 * PROTOCOL ID: BSD-AI-C3N-CUSTOMER-AI-COST-GOVERNANCE
 *
 * Centraliza las políticas de gobernanza de costo, presupuesto de tokens,
 * cuotas diarias por usuario, deduplicación de peticiones y alertas presupuestarias.
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
exports.CustomerAICostGovernance = exports.PRICING_GEMINI_2_5_FLASH = exports.PRICING_GEMINI_2_5_FLASH_LITE = exports.DEFAULT_COST_GOVERNANCE_CONFIG = void 0;
const crypto = __importStar(require("crypto"));
exports.DEFAULT_COST_GOVERNANCE_CONFIG = {
    maxRequestsPerUserDay: 50,
    maxToolRounds: 5, // Límite certificado inmutable
    maxInputTokens: 4000,
    maxOutputTokens: 1000,
    maxConversationTurns: 6,
    maxProductsInContext: 5,
    maxPromotionsInContext: 5,
    duplicateWindowMs: 2000, // 2 segundos para double-tap / retry
    requestCostAlertThresholdUSD: 0.05,
    globalMonthlyBudgetAlertUSD: 100.0,
};
exports.PRICING_GEMINI_2_5_FLASH_LITE = {
    inputPricePerMillionUSD: 0.075,
    outputPricePerMillionUSD: 0.30,
};
exports.PRICING_GEMINI_2_5_FLASH = {
    inputPricePerMillionUSD: 0.15,
    outputPricePerMillionUSD: 0.60,
};
class CustomerAICostGovernance {
    static setConfig(customConfig) {
        this.config = { ...this.config, ...customConfig };
    }
    static getConfig() {
        return { ...this.config };
    }
    static resetUsage(uid) {
        if (uid) {
            this.userUsageMap.delete(uid);
            this.lastUserRequests.delete(uid);
        }
        else {
            this.userUsageMap.clear();
            this.lastUserRequests.clear();
        }
    }
    /**
     * Verifica y detecta solicitudes duplicadas inmediatas (por double-tap, recomposición, retry).
     */
    static checkDuplicate(uid, message) {
        if (!uid || !message)
            return { isDuplicate: false };
        const hash = crypto.createHash("sha256").update(message.trim().toLowerCase()).digest("hex");
        const now = Date.now();
        const last = this.lastUserRequests.get(uid);
        if (last && last.hash === hash && now - last.timestamp < this.config.duplicateWindowMs) {
            return {
                isDuplicate: true,
                cachedResponse: last.responseText || "Procesando tu solicitud anterior, por favor espera un momento.",
            };
        }
        this.lastUserRequests.set(uid, { hash, timestamp: now });
        return { isDuplicate: false };
    }
    /**
     * Actualiza la respuesta en el caché de peticiones recientes para deduplicación.
     */
    static recordRecentResponse(uid, message, responseText) {
        if (!uid || !message)
            return;
        const hash = crypto.createHash("sha256").update(message.trim().toLowerCase()).digest("hex");
        this.lastUserRequests.set(uid, { hash, timestamp: Date.now(), responseText });
    }
    /**
     * Verifica la cuota diaria de uso por usuario (24h deslizante).
     */
    static checkDailyQuota(uid) {
        if (!uid) {
            const emptyUsage = {
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                estimatedCostUSD: 0,
                toolRounds: 0,
                timestamps: [],
            };
            return { allowed: true, remainingRequests: this.config.maxRequestsPerUserDay, usage: emptyUsage };
        }
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        let usage = this.userUsageMap.get(uid);
        if (!usage) {
            usage = {
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                estimatedCostUSD: 0,
                toolRounds: 0,
                timestamps: [],
            };
            this.userUsageMap.set(uid, usage);
        }
        // Filtrar timestamps fuera de la ventana de 24h
        usage.timestamps = usage.timestamps.filter((t) => t > dayAgo);
        usage.requests = usage.timestamps.length;
        if (usage.requests >= this.config.maxRequestsPerUserDay) {
            return {
                allowed: false,
                remainingRequests: 0,
                usage: { ...usage },
            };
        }
        return {
            allowed: true,
            remainingRequests: this.config.maxRequestsPerUserDay - usage.requests,
            usage: { ...usage },
        };
    }
    /**
     * Registra el uso real tras una ejecución de chat.
     */
    static recordUsage(uid, metrics) {
        if (!uid)
            return;
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        let usage = this.userUsageMap.get(uid);
        if (!usage) {
            usage = {
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                estimatedCostUSD: 0,
                toolRounds: 0,
                timestamps: [],
            };
            this.userUsageMap.set(uid, usage);
        }
        usage.timestamps = usage.timestamps.filter((t) => t > dayAgo);
        usage.timestamps.push(now);
        usage.requests = usage.timestamps.length;
        usage.inputTokens += metrics.inputTokens;
        usage.outputTokens += metrics.outputTokens;
        usage.totalTokens += metrics.inputTokens + metrics.outputTokens;
        usage.estimatedCostUSD = Number((usage.estimatedCostUSD + metrics.estimatedCostUSD).toFixed(6));
        usage.toolRounds += metrics.toolRounds;
    }
    /**
     * Retorna el precio correspondiente según el nombre de modelo.
     */
    static getPricingForModel(modelName) {
        if (modelName === "gemini-2.5-flash") {
            return exports.PRICING_GEMINI_2_5_FLASH;
        }
        return exports.PRICING_GEMINI_2_5_FLASH_LITE;
    }
}
exports.CustomerAICostGovernance = CustomerAICostGovernance;
CustomerAICostGovernance.userUsageMap = new Map();
CustomerAICostGovernance.lastUserRequests = new Map();
CustomerAICostGovernance.config = { ...exports.DEFAULT_COST_GOVERNANCE_CONFIG };
CustomerAICostGovernance.DAILY_LIMIT_MESSAGE = "Has alcanzado temporalmente el límite diario del asistente. Puedes continuar usando BlueSystem normalmente.";
