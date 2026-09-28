/**
 * BlueSystem Delivery Enterprise — Servicio Central de IA Backend (C3-C / C3-D)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
 */

import {
  BackendExecutionContext,
  ConversationalGatewayRequestPayload,
  CustomerAIResponsePayload,
  GatewayRequestPayload,
  ToolResult,
} from "./types";
import { BackendToolRegistry } from "./BackendToolRegistry";
import { defaultRateLimiter, RateLimiter } from "./RateLimiter";
import {
  BackendToolAdapter,
  CancelOrderAdapter,
  CreateAuthoritativeOrderAdapter,
  GetActiveOrderAdapter,
  GetAvailableCouponsAdapter,
  GetCustomerContextAdapter,
  GetOrderHistoryAdapter,
  GetOrderTrackingAdapter,
  SubmitOrderReviewAdapter,
  ValidateCouponAdapter,
} from "./BackendToolAdapters";
import { ConfirmationGateEngine } from "./ConfirmationGateEngine";
import {
  GeminiClientPort,
  GeminiRuntimeService,
  MockGeminiClient,
  ProductionGeminiClient,
} from "./GeminiRuntimeService";
import { GeminiKillSwitch } from "./GeminiKillSwitch";
import { GeminiAILogger } from "./GeminiAILogger";
import {
  GEMINI_AI_CANARY_ENABLED,
  GeminiCanarySafetyController,
} from "../config/productionCanaryLock";
import { IntentBoundaryEngine } from "./IntentBoundaryEngine";
import { CustomerAICostGovernance } from "./CustomerAICostGovernance";

export class CustomerAIService {
  private adapters: Map<string, BackendToolAdapter> = new Map();
  private rateLimiter: RateLimiter;
  private runtimeService: GeminiRuntimeService;
  private geminiClient: GeminiClientPort;

  constructor(
    rateLimiter: RateLimiter = defaultRateLimiter,
    geminiClient?: GeminiClientPort
  ) {
    this.rateLimiter = rateLimiter;
    this.geminiClient = geminiClient || (process.env.NODE_ENV === "test" ? new MockGeminiClient() : new ProductionGeminiClient());
    this.registerDefaultAdapters();
    this.runtimeService = new GeminiRuntimeService(this.geminiClient, this.adapters);
  }

  private registerDefaultAdapters() {
    const list: BackendToolAdapter[] = [
      new GetCustomerContextAdapter(),
      new GetActiveOrderAdapter(),
      new GetOrderHistoryAdapter(),
      new GetOrderTrackingAdapter(),
      new ValidateCouponAdapter(),
      new CreateAuthoritativeOrderAdapter(),
      new CancelOrderAdapter(),
      new SubmitOrderReviewAdapter(),
      new GetAvailableCouponsAdapter(),
    ];

    list.forEach((adapter) => {
      this.adapters.set(adapter.toolId, adapter);
    });
  }

  public getRuntimeService(): GeminiRuntimeService {
    return this.runtimeService;
  }

  public getGeminiClient(): GeminiClientPort {
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
  public async processConversationalChat(
    payload: ConversationalGatewayRequestPayload,
    context: BackendExecutionContext
  ): Promise<CustomerAIResponsePayload> {
    // 0. Kill Switch — PRIMER CHECK (GAP-C3G-08)
    if (!GeminiKillSwitch.isGeminiEnabled()) {
      GeminiAILogger.logKillSwitchDisabled(context.authUid);
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
      : GEMINI_AI_CANARY_ENABLED;

    const isPublicCanaryActive = process.env.PUBLIC_CANARY_ENABLED === "true";

    if ((isCanaryActive || isPublicCanaryActive) && !GeminiCanarySafetyController.isUidAuthorizedForCanary(context.authUid)) {
      GeminiAILogger.log({
        event_name: "GEMINI_DISABLED",
        correlation_id: GeminiAILogger.generateCorrelationId(),
        uid_hash: GeminiAILogger.hashUid(context.authUid),
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
    const intentEvaluation = IntentBoundaryEngine.evaluate(payload.message);
    if (!intentEvaluation.isPermitted) {
      GeminiAILogger.logOutOfScope(context.authUid, intentEvaluation.intent, intentEvaluation.reason);
      return {
        text: intentEvaluation.deterministicResponse || IntentBoundaryEngine.STANDARD_REJECTION_MESSAGE,
        intent: intentEvaluation.intent,
        executionId: `exec_oos_${Date.now()}`,
      };
    }

    // 0.8. Protección contra Preguntas Duplicadas (C3-N)
    if (context.authUid) {
      const duplicateCheck = CustomerAICostGovernance.checkDuplicate(context.authUid, payload.message);
      if (duplicateCheck.isDuplicate) {
        GeminiAILogger.logDuplicateRequest(context.authUid);
        return {
          text: duplicateCheck.cachedResponse || "Tu solicitud anterior está en proceso. Por favor espera un momento.",
          intent: "DUPLICATE_REQUEST",
          executionId: `exec_dup_${Date.now()}`,
        };
      }
    }

    // 0.9. Gobernanza de Cuota Diaria por Usuario (C3-N)
    if (context.authUid) {
      const dailyCheck = CustomerAICostGovernance.checkDailyQuota(context.authUid);
      if (!dailyCheck.allowed) {
        GeminiAILogger.logDailyLimitReached(context.authUid, dailyCheck.usage.requests);
        return {
          text: CustomerAICostGovernance.DAILY_LIMIT_MESSAGE,
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
    const modelName = this.geminiClient instanceof ProductionGeminiClient
      ? this.geminiClient.getModelName()
      : "mock";
    const { correlationId, startMs } = GeminiAILogger.logChatStart(context.authUid, modelName);

    // 2. Control de Abuso / Rate Limiting por Minuto
    if (context.authUid) {
      const rateCheck = this.rateLimiter.checkLimit(context.authUid);
      if (!rateCheck.allowed) {
        GeminiAILogger.logChatError({
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
    let result: CustomerAIResponsePayload;
    try {
      result = await this.runtimeService.orchestrate(
        payload.message,
        payload.conversationHistory || [],
        context
      );
    } catch (err: any) {
      GeminiAILogger.logChatError({
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

    // 4. Observabilidad — cierre exitoso y Contabilidad de Costos (C3-N)
    // Estimación y registro de tokens de forma no disruptiva
    const approxInputTokens = Math.max(10, Math.round((payload.message.length + (payload.conversationHistory?.reduce((a, b) => a + b.content.length, 0) || 0)) / 4) + 120);
    const approxOutputTokens = Math.max(5, Math.round((result.text?.length || 0) / 4));
    const pricing = CustomerAICostGovernance.getPricingForModel(modelName);
    const costEstimate = GeminiAILogger.calculateEstimatedCost(approxInputTokens, approxOutputTokens, pricing);

    if (context.authUid) {
      CustomerAICostGovernance.recordUsage(context.authUid, {
        inputTokens: approxInputTokens,
        outputTokens: approxOutputTokens,
        estimatedCostUSD: costEstimate.estimatedTotalCostUSD,
        toolRounds: result.actions?.length || 1,
      });
      CustomerAICostGovernance.recordRecentResponse(context.authUid, payload.message, result.text);
    }

    // Verificación de alerta de costo
    const config = CustomerAICostGovernance.getConfig();
    if (costEstimate.estimatedTotalCostUSD >= config.requestCostAlertThresholdUSD) {
      GeminiAILogger.logBudgetAlert(context.authUid, costEstimate.estimatedTotalCostUSD, config.requestCostAlertThresholdUSD);
    }

    GeminiAILogger.logChatComplete({
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
  public async executeTool(
    request: GatewayRequestPayload,
    context: BackendExecutionContext
  ): Promise<ToolResult> {
    const { toolId, parameters } = request;

    // 1. Validación de Herramientas Locales
    if (BackendToolRegistry.isLocalOnlyTool(toolId)) {
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
    const toolDef = BackendToolRegistry.getTool(toolId);
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
      const validation = ConfirmationGateEngine.validateConfirmationToken(
        context.authUid,
        toolId,
        parameters || {},
        request.confirmationToken
      );
      if (validation.isValid) {
        isConfirmed = true;
      }
    }

    const effectiveContext: BackendExecutionContext = {
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
    } catch (err: any) {
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

export const defaultCustomerAIService = new CustomerAIService();
