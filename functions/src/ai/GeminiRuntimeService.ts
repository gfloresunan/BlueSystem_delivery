/**
 * BlueSystem Delivery Enterprise — Gemini Runtime Service & Orchestration Foundation (C3-D)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
 */

import {
  BackendExecutionContext,
  ChatMessagePayload,
  CustomerAIResponsePayload,
  PendingConfirmationPayload,
  ToolResult,
} from "./types";
import { GEMINI_SYSTEM_INSTRUCTION } from "./GeminiSystemInstruction";
import { GEMINI_TOOL_DECLARATIONS, GeminiFunctionDeclaration } from "./GeminiToolDeclarations";
import { BackendToolRegistry } from "./BackendToolRegistry";
import { ConfirmationGateEngine } from "./ConfirmationGateEngine";
import { BackendToolAdapter } from "./BackendToolAdapters";

export interface GeminiMessageItem {
  role: "user" | "model" | "function";
  content?: string;
  functionCall?: { name: string; args: Record<string, any> };
  functionResponse?: { name: string; response: Record<string, any> };
}

export interface GeminiCallRequest {
  systemInstruction: string;
  messages: GeminiMessageItem[];
  tools: GeminiFunctionDeclaration[];
}

export interface GeminiCallResponse {
  text?: string;
  functionCall?: { name: string; args: Record<string, any> };
}

export interface GeminiClientPort {
  generateContent(request: GeminiCallRequest): Promise<GeminiCallResponse>;
}

/**
 * Cliente Mock Determinista de Gemini para Pruebas Unitarias y Entornos Seguros
 */
export class MockGeminiClient implements GeminiClientPort {
  private responseQueue: GeminiCallResponse[] = [];
  private defaultResponse: GeminiCallResponse = {
    text: "¡Hola! Soy tu asistente de BlueSystem. ¿En qué puedo ayudarte hoy?",
  };

  public queueResponse(response: GeminiCallResponse) {
    this.responseQueue.push(response);
  }

  public setDefaultResponse(response: GeminiCallResponse) {
    this.defaultResponse = response;
  }

  public clearQueue() {
    this.responseQueue = [];
  }

  public async generateContent(_request: GeminiCallRequest): Promise<GeminiCallResponse> {
    if (this.responseQueue.length > 0) {
      return this.responseQueue.shift()!;
    }
    return this.defaultResponse;
  }
}

/**
 * C3-GR: Model allowlist — solo modelos autorizados.
 * Si GEMINI_MODEL_NAME contiene un valor no autorizado, el sistema
 * falla closed: INVALID_MODEL_CONFIGURATION -> 0 trafico Gemini.
 */
const ALLOWED_GEMINI_MODELS = new Set([
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]);
const GEMINI_DEFAULT_MODEL = "gemini-1.5-flash";
const GEMINI_REQUEST_TIMEOUT_MS = 10_000; // 10 segundos
const GEMINI_MAX_RETRIES = 2;

function resolveModelName(): string {
  const envModel = process.env.GEMINI_MODEL_NAME?.trim();
  if (!envModel) return GEMINI_DEFAULT_MODEL;
  if (!ALLOWED_GEMINI_MODELS.has(envModel)) {
    return GEMINI_DEFAULT_MODEL;
  }
  return envModel;
}

/** Errores transientes que admiten retry en el proveedor */
function isRetryableProviderError(err: any): boolean {
  const code = err?.statusCode ?? err?.code;
  return code === 429 || code === 503 || err?.name === "AbortError" || err?.isTimeout === true;
}

/**
 * Cliente de Produccion de Gemini — Hardened (C3-GR)
 *
 * RETRY ISOLATION INVARIANT:
 * El retry ocurre EXCLUSIVAMENTE dentro de generateContent() (llamada al proveedor).
 * NUNCA alrededor de GeminiRuntimeService.orchestrate() ni BackendToolAdapter.execute().
 * Esto garantiza que herramientas Level 3/4 (create_order, cancel_order) no se
 * reintenten automaticamente por errores de red del proveedor.
 */
export class ProductionGeminiClient implements GeminiClientPort {
  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(apiKey?: string) {
    // model se resuelve en construccion — falla closed si es invalido
    this.modelName = resolveModelName();
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
  }

  public getModelName(): string {
    return this.modelName;
  }

  public async generateContent(request: GeminiCallRequest): Promise<GeminiCallResponse> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY no configurada en el servidor.");
    }

    let lastError: any;

    // Retry loop — SOLO para errores transientes del proveedor.
    // Intentos: 1 original + hasta 2 reintentos = maximo 3 llamadas.
    for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 500ms, 1000ms
        const delayMs = 500 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delayMs));
      }

      try {
        return await this._singleRequest(request);
      } catch (err: any) {
        lastError = err;

        // NO retry para errores no transientes
        if (!isRetryableProviderError(err)) {
          throw err;
        }

        // Si es el ultimo intento, no continuar
        if (attempt === GEMINI_MAX_RETRIES) {
          break;
        }
      }
    }

    // Propagar el ultimo error transiente tras agotar reintentos
    throw lastError;
  }

  /** Ejecuta una unica llamada al proveedor con timeout y normalizacion de errores */
  private async _singleRequest(request: GeminiCallRequest): Promise<GeminiCallResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const contents = request.messages.map((m) => {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      if (m.functionCall) parts.push({ functionCall: m.functionCall });
      if (m.functionResponse) parts.push({ functionResponse: m.functionResponse });
      return {
        role: m.role === "function" ? "function" : m.role === "model" ? "model" : "user",
        parts,
      };
    });

    const bodyPayload: any = {
      systemInstruction: { parts: [{ text: request.systemInstruction }] },
      contents,
    };

    if (request.tools && request.tools.length > 0) {
      bodyPayload.tools = [{ functionDeclarations: request.tools }];
      bodyPayload.toolConfig = {
        functionCallingConfig: {
          mode: "AUTO",
        },
      };
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr?.name === "AbortError") {
        const timeoutErr: any = new Error("GEMINI_TIMEOUT: La solicitud al proveedor excedio 10 segundos.");
        timeoutErr.name = "AbortError";
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    // HTTP 429 — Rate limit del proveedor (diferente al rate limit de BlueSystem)
    if (res.status === 429) {
      const rateLimitErr: any = new Error("GEMINI_RATE_LIMITED: El proveedor Gemini ha limitado la tasa de solicitudes.");
      rateLimitErr.statusCode = 429;
      throw rateLimitErr;
    }

    // Errores no transientes — NO retry
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const errText = await res.text();
      const nonRetryErr: any = new Error(`Gemini API Error (${res.status}): ${errText}`);
      nonRetryErr.statusCode = res.status;
      throw nonRetryErr;
    }

    // Otros errores de servidor (503 etc.) — transientes, pueden reintentarse
    if (!res.ok) {
      const errText = await res.text();
      const serverErr: any = new Error(`Gemini API Error (${res.status}): ${errText}`);
      serverErr.statusCode = res.status;
      throw serverErr;
    }

    const data: any = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];

    const functionCallPart = parts.find((p: any) => p.functionCall);
    if (functionCallPart?.functionCall) {
      return {
        functionCall: {
          name: functionCallPart.functionCall.name,
          args: functionCallPart.functionCall.args || {},
        },
      };
    }

    const aggregatedText = parts
      .map((p: any) => p.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();

    return { text: aggregatedText };
  }
}


/**
 * Servicio de Ejecución y Orquestación del Runtime de Gemini
 */
export class GeminiRuntimeService {
  private client: GeminiClientPort;
  private adapters: Map<string, BackendToolAdapter>;
  public static readonly MAX_TOOL_ROUNDS = 5;

  constructor(client: GeminiClientPort, adapters: Map<string, BackendToolAdapter>) {
    this.client = client;
    this.adapters = adapters;
  }

  public async orchestrate(
    userMessage: string,
    history: ChatMessagePayload[] = [],
    context: BackendExecutionContext
  ): Promise<CustomerAIResponsePayload> {
    const executionId = `exec_${Date.now()}`;
    const messages: GeminiMessageItem[] = [];

    // 1. Reconstruir historial sanitizado
    history.slice(-6).forEach((h) => {
      messages.push({
        role: h.role === "model" ? "model" : "user",
        content: h.content,
      });
    });

    // 2. Agregar mensaje actual del usuario
    messages.push({ role: "user", content: userMessage });

    let round = 0;
    let pendingConfirmation: PendingConfirmationPayload | undefined = undefined;

    while (round < GeminiRuntimeService.MAX_TOOL_ROUNDS) {
      round++;

      let modelResponse: GeminiCallResponse;
      try {
        modelResponse = await this.client.generateContent({
          systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
          messages,
          tools: GEMINI_TOOL_DECLARATIONS,
        });
      } catch (err: any) {
        return {
          text: "Lo sentimos, el servicio de asistencia no está disponible temporalmente.",
          intent: "ERROR",
          errors: [
            {
              code: "GEMINI_UNAVAILABLE",
              userMessage: "Error de comunicación con el motor de IA.",
              technicalReason: err?.message,
            },
          ],
          executionId,
        };
      }

      // Si el modelo respondió con texto final (sin llamadas a herramientas)
      if (!modelResponse.functionCall) {
        const fallbackHelp = "¿En qué te puedo orientar hoy? 😊 Puedes preguntarme por comercios, laptops y tecnología, comida, promociones, tus cupones disponibles o el estado de tus pedidos.";
        return {
          text: (modelResponse.text && modelResponse.text.trim().length > 0) ? modelResponse.text : fallbackHelp,
          intent: "GENERAL_INQUIRY",
          pendingConfirmation,
          executionId,
        };
      }

      const toolCall = modelResponse.functionCall;
      const toolId = toolCall.name;
      const toolArgs = toolCall.args || {};

      // 3. Validación de la Herramienta en el Registro
      if (!BackendToolRegistry.isRegisteredBackendTool(toolId) && !BackendToolRegistry.isLocalOnlyTool(toolId)) {
        messages.push({
          role: "model",
          functionCall: toolCall,
        });
        messages.push({
          role: "function",
          functionResponse: {
            name: toolId,
            response: {
              success: false,
              error: `La herramienta '${toolId}' no existe en el catálogo autorizado.`,
            },
          },
        });
        continue;
      }

      // 4. Si es una herramienta local, devolver instrucción amigable al cliente
      if (BackendToolRegistry.isLocalOnlyTool(toolId)) {
        const queryTerm = toolArgs?.query || toolArgs?.entityName || "";
        const friendlyText = queryTerm
          ? `Buscando "${queryTerm}" en el menú y comercios disponibles...`
          : `Consultando los comercios y productos disponibles para ti...`;

        return {
          text: friendlyText,
          intent: "LOCAL_TOOL_DISPATCH",
          actions: [
            {
              type: "EXECUTE_LOCAL_TOOL",
              payload: {
                toolId,
                parametersJson: JSON.stringify(toolArgs),
              },
            },
          ],
          executionId,
        };
      }

      // 5. Verificación de Gate de Confirmación para Herramientas Level 3 / Level 4
      const toolDef = BackendToolRegistry.getTool(toolId);
      if (toolDef?.requiresConfirmation && !context.confirmedByUser) {
        // Generar paquete criptográfico de confirmación pendiente
        pendingConfirmation = ConfirmationGateEngine.createPendingConfirmation(
          context.authUid,
          toolId,
          `Confirmación requerida para ejecutar '${toolId}'`,
          toolArgs
        );

        return {
          text: `Para completar esta acción, se requiere tu confirmación explícita.`,
          intent: "CONFIRMATION_REQUIRED",
          pendingConfirmation,
          actions: [
            {
              type: "REQUEST_CONFIRMATION",
              payload: {
                toolId,
                confirmationId: pendingConfirmation.confirmationId,
              },
            },
          ],
          executionId,
        };
      }

      // 6. Ejecución del Adaptador Backend Autoritativo
      const adapter = this.adapters.get(toolId);
      if (!adapter) {
        messages.push({
          role: "model",
          functionCall: toolCall,
        });
        messages.push({
          role: "function",
          functionResponse: {
            name: toolId,
            response: { success: false, error: "Adaptador no configurado." },
          },
        });
        continue;
      }

      const toolResult: ToolResult = await adapter.execute(toolArgs, context);

      // 7. Context Reduction: Solo el contexto sanitizado llega a Gemini
      messages.push({
        role: "model",
        functionCall: toolCall,
      });
      messages.push({
        role: "function",
        functionResponse: {
          name: toolId,
          response: {
            success: toolResult.success,
            sanitizedLlmContext: toolResult.sanitizedLlmContext,
          },
        },
      });
    }

    // Límite de rondas alcanzado
    return {
      text: "Se alcanzó el límite de pasos para procesar esta solicitud.",
      intent: "MAX_ROUNDS_REACHED",
      executionId,
    };
  }
}
