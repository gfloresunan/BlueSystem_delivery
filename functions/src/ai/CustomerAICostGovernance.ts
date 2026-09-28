/**
 * BlueSystem Delivery Enterprise — Cost & Usage Governance Engine (C3-N)
 * PROTOCOL ID: BSD-AI-C3N-CUSTOMER-AI-COST-GOVERNANCE
 *
 * Centraliza las políticas de gobernanza de costo, presupuesto de tokens,
 * cuotas diarias por usuario, deduplicación de peticiones y alertas presupuestarias.
 */

import * as crypto from "crypto";
import { GeminiPricingConfig } from "./GeminiAILogger";

export interface UserDailyUsage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  toolRounds: number;
  timestamps: number[];
}

export interface CostGovernanceConfig {
  maxRequestsPerUserDay: number;
  maxToolRounds: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxConversationTurns: number;
  maxProductsInContext: number;
  maxPromotionsInContext: number;
  duplicateWindowMs: number;
  requestCostAlertThresholdUSD: number;
  globalMonthlyBudgetAlertUSD: number;
}

export const DEFAULT_COST_GOVERNANCE_CONFIG: CostGovernanceConfig = {
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

export const PRICING_GEMINI_2_5_FLASH_LITE: GeminiPricingConfig = {
  inputPricePerMillionUSD: 0.075,
  outputPricePerMillionUSD: 0.30,
};

export const PRICING_GEMINI_2_5_FLASH: GeminiPricingConfig = {
  inputPricePerMillionUSD: 0.15,
  outputPricePerMillionUSD: 0.60,
};

export class CustomerAICostGovernance {
  private static userUsageMap: Map<string, UserDailyUsage> = new Map();
  private static lastUserRequests: Map<string, { hash: string; timestamp: number; responseText?: string }> = new Map();
  private static config: CostGovernanceConfig = { ...DEFAULT_COST_GOVERNANCE_CONFIG };

  public static readonly DAILY_LIMIT_MESSAGE =
    "Has alcanzado temporalmente el límite diario del asistente. Puedes continuar usando BlueSystem normalmente.";

  public static setConfig(customConfig: Partial<CostGovernanceConfig>) {
    this.config = { ...this.config, ...customConfig };
  }

  public static getConfig(): CostGovernanceConfig {
    return { ...this.config };
  }

  public static resetUsage(uid?: string) {
    if (uid) {
      this.userUsageMap.delete(uid);
      this.lastUserRequests.delete(uid);
    } else {
      this.userUsageMap.clear();
      this.lastUserRequests.clear();
    }
  }

  /**
   * Verifica y detecta solicitudes duplicadas inmediatas (por double-tap, recomposición, retry).
   */
  public static checkDuplicate(uid: string, message: string): { isDuplicate: boolean; cachedResponse?: string } {
    if (!uid || !message) return { isDuplicate: false };

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
  public static recordRecentResponse(uid: string, message: string, responseText: string) {
    if (!uid || !message) return;
    const hash = crypto.createHash("sha256").update(message.trim().toLowerCase()).digest("hex");
    this.lastUserRequests.set(uid, { hash, timestamp: Date.now(), responseText });
  }

  /**
   * Verifica la cuota diaria de uso por usuario (24h deslizante).
   */
  public static checkDailyQuota(uid: string): { allowed: boolean; remainingRequests: number; usage: UserDailyUsage } {
    if (!uid) {
      const emptyUsage: UserDailyUsage = {
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
  public static recordUsage(
    uid: string,
    metrics: {
      inputTokens: number;
      outputTokens: number;
      estimatedCostUSD: number;
      toolRounds: number;
    }
  ) {
    if (!uid) return;

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
  public static getPricingForModel(modelName?: string): GeminiPricingConfig {
    if (modelName === "gemini-2.5-flash") {
      return PRICING_GEMINI_2_5_FLASH;
    }
    return PRICING_GEMINI_2_5_FLASH_LITE;
  }
}
