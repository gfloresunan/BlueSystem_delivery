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

import * as crypto from "crypto";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type GeminiEventName =
  | "GEMINI_CHAT_START"
  | "GEMINI_CHAT_COMPLETE"
  | "GEMINI_CHAT_ERROR"
  | "GEMINI_TOOL_EXECUTION"
  | "GEMINI_CONFIRMATION_GATE"
  | "GEMINI_RATE_LIMITED"
  | "GEMINI_TIMEOUT"
  | "GEMINI_DISABLED"
  | "GEMINI_PROVIDER_ERROR"
  | "GEMINI_ROUNDS_EXCEEDED"
  | "GEMINI_MODEL_CONFIG_ERROR"
  | "GEMINI_OUT_OF_SCOPE"
  | "GEMINI_DAILY_LIMIT_REACHED"
  | "GEMINI_DUPLICATE_REQUEST"
  | "GEMINI_BUDGET_ALERT";

export type GeminiProviderStatus =
  | "OK"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "DISABLED"
  | "ERROR"
  | "INVALID_MODEL"
  | "UNKNOWN";

export type GeminiExecutionPlane = "LOCAL" | "BACKEND" | "GEMINI" | "KILL_SWITCH";

export interface GeminiPricingConfig {
  inputPricePerMillionUSD: number;
  outputPricePerMillionUSD: number;
}

export interface EstimatedCostResult {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedInputCostUSD: number;
  estimatedOutputCostUSD: number;
  estimatedTotalCostUSD: number;
}

export interface GeminiAILogEvent {
  event_name: GeminiEventName;
  correlation_id: string;
  uid_hash?: string;
  model?: string;
  latency_ms?: number;
  tool_round_count?: number;
  tool_id?: string;
  execution_plane?: GeminiExecutionPlane;
  confirmation_requested?: boolean;
  confirmation_completed?: boolean;
  provider_error?: boolean;
  provider_status?: GeminiProviderStatus;
  success: boolean;
  failure_code?: string;
  // Cost Accounting — solo si el proveedor los entrega, nunca aproximados
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
}

// ─── Implementacion ──────────────────────────────────────────────────────────

export class GeminiAILogger {
  public static hashUid(authUid: string): string {
    if (!authUid) return "anonymous";
    return crypto.createHash("sha256").update(authUid).digest("hex").substring(0, 16);
  }

  public static generateCorrelationId(): string {
    return `gem_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  }

  /**
   * Cost Accounting Dinamico:
   * Calcula el costo estimado en base a tokens reales y tarifas vigentes parametrizadas.
   * Pura observabilidad — NO influye en la seleccion de modelo ni autorizacion.
   */
  public static calculateEstimatedCost(
    inputTokens: number,
    outputTokens: number,
    pricing: GeminiPricingConfig
  ): EstimatedCostResult {
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePerMillionUSD;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePerMillionUSD;
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedInputCostUSD: Number(inputCost.toFixed(6)),
      estimatedOutputCostUSD: Number(outputCost.toFixed(6)),
      estimatedTotalCostUSD: Number((inputCost + outputCost).toFixed(6)),
    };
  }

  public static log(event: GeminiAILogEvent): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: "BlueSystem.CustomerAI",
      ...event,
    };
    console.log(JSON.stringify(logEntry));
  }

  public static logChatStart(authUid: string, model?: string): { correlationId: string; startMs: number } {
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

  public static logChatComplete(params: {
    correlationId: string;
    authUid: string;
    startMs: number;
    model?: string;
    toolRoundCount?: number;
    confirmationRequested?: boolean;
    confirmationCompleted?: boolean;
    providerStatus?: GeminiProviderStatus;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    estimatedCostUSD?: number;
  }): void {
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
      estimated_cost_usd: params.estimatedCostUSD,
    });
  }

  public static logChatError(params: {
    correlationId: string;
    authUid: string;
    startMs: number;
    failureCode: string;
    providerStatus?: GeminiProviderStatus;
    model?: string;
  }): void {
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

  public static logToolExecution(params: {
    correlationId: string;
    authUid: string;
    toolId: string;
    success: boolean;
    latencyMs: number;
    failureCode?: string;
    confirmationRequired?: boolean;
  }): void {
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

  public static logKillSwitchDisabled(authUid: string): void {
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

  public static logOutOfScope(authUid: string, intent: string, reason?: string): void {
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

  public static logDailyLimitReached(authUid: string, requestsToday: number): void {
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

  public static logDuplicateRequest(authUid: string): void {
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

  public static logBudgetAlert(authUid: string, currentCostUSD: number, thresholdUSD: number): void {
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
