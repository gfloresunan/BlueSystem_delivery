"use strict";
/**
 * BlueSystem Delivery Enterprise — Gemini Runtime Service & Orchestration Foundation (C3-D)
 * PROTOCOL ID: BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiRuntimeService = exports.ProductionGeminiClient = exports.MockGeminiClient = void 0;
const GeminiSystemInstruction_1 = require("./GeminiSystemInstruction");
const GeminiToolDeclarations_1 = require("./GeminiToolDeclarations");
const BackendToolRegistry_1 = require("./BackendToolRegistry");
const ConfirmationGateEngine_1 = require("./ConfirmationGateEngine");
/**
 * Cliente Mock Determinista de Gemini para Pruebas Unitarias y Entornos Seguros
 */
class MockGeminiClient {
    constructor() {
        this.responseQueue = [];
        this.defaultResponse = {
            text: "¡Hola! Soy tu asistente de BlueSystem. ¿En qué puedo ayudarte hoy?",
        };
    }
    queueResponse(response) {
        this.responseQueue.push(response);
    }
    setDefaultResponse(response) {
        this.defaultResponse = response;
    }
    clearQueue() {
        this.responseQueue = [];
    }
    async generateContent(_request) {
        if (this.responseQueue.length > 0) {
            return this.responseQueue.shift();
        }
        return this.defaultResponse;
    }
}
exports.MockGeminiClient = MockGeminiClient;
/**
 * C3-GR: Model allowlist — solo modelos autorizados.
 * Si GEMINI_MODEL_NAME contiene un valor no autorizado, el sistema
 * falla closed: INVALID_MODEL_CONFIGURATION -> 0 trafico Gemini.
 */
const ALLOWED_GEMINI_MODELS = new Set(["gemini-2.5-flash-lite", "gemini-2.5-flash"]);
const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash-lite";
const GEMINI_REQUEST_TIMEOUT_MS = 10000; // 10 segundos
const GEMINI_MAX_RETRIES = 2;
function resolveModelName() {
    const envModel = process.env.GEMINI_MODEL_NAME?.trim();
    if (!envModel)
        return GEMINI_DEFAULT_MODEL;
    if (!ALLOWED_GEMINI_MODELS.has(envModel)) {
        throw new Error(`INVALID_MODEL_CONFIGURATION: El modelo '${envModel}' no pertenece a la allowlist autorizada. ` +
            `Modelos permitidos: ${[...ALLOWED_GEMINI_MODELS].join(", ")}.`);
    }
    return envModel;
}
/** Errores transientes que admiten retry en el proveedor */
function isRetryableProviderError(err) {
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
class ProductionGeminiClient {
    constructor(apiKey) {
        // model se resuelve en construccion — falla closed si es invalido
        this.modelName = resolveModelName();
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    }
    getModelName() {
        return this.modelName;
    }
    async generateContent(request) {
        if (!this.apiKey) {
            throw new Error("GEMINI_API_KEY no configurada en el servidor.");
        }
        let lastError;
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
            }
            catch (err) {
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
    async _singleRequest(request) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
        const contents = request.messages.map((m) => {
            const parts = [];
            if (m.content)
                parts.push({ text: m.content });
            if (m.functionCall)
                parts.push({ functionCall: m.functionCall });
            if (m.functionResponse)
                parts.push({ functionResponse: m.functionResponse });
            return {
                role: m.role === "function" ? "function" : m.role === "model" ? "model" : "user",
                parts,
            };
        });
        const bodyPayload = {
            systemInstruction: { parts: [{ text: request.systemInstruction }] },
            contents,
        };
        if (request.tools && request.tools.length > 0) {
            bodyPayload.tools = [{ functionDeclarations: request.tools }];
        }
        let res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload),
                signal: controller.signal,
            });
        }
        catch (fetchErr) {
            clearTimeout(timeoutId);
            if (fetchErr?.name === "AbortError") {
                const timeoutErr = new Error("GEMINI_TIMEOUT: La solicitud al proveedor excedio 10 segundos.");
                timeoutErr.name = "AbortError";
                timeoutErr.isTimeout = true;
                throw timeoutErr;
            }
            throw fetchErr;
        }
        finally {
            clearTimeout(timeoutId);
        }
        // HTTP 429 — Rate limit del proveedor (diferente al rate limit de BlueSystem)
        if (res.status === 429) {
            const rateLimitErr = new Error("GEMINI_RATE_LIMITED: El proveedor Gemini ha limitado la tasa de solicitudes.");
            rateLimitErr.statusCode = 429;
            throw rateLimitErr;
        }
        // Errores no transientes — NO retry
        if (res.status === 400 || res.status === 401 || res.status === 403) {
            const errText = await res.text();
            const nonRetryErr = new Error(`Gemini API Error (${res.status}): ${errText}`);
            nonRetryErr.statusCode = res.status;
            throw nonRetryErr;
        }
        // Otros errores de servidor (503 etc.) — transientes, pueden reintentarse
        if (!res.ok) {
            const errText = await res.text();
            const serverErr = new Error(`Gemini API Error (${res.status}): ${errText}`);
            serverErr.statusCode = res.status;
            throw serverErr;
        }
        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0];
        if (candidate?.functionCall) {
            return {
                functionCall: {
                    name: candidate.functionCall.name,
                    args: candidate.functionCall.args || {},
                },
            };
        }
        return { text: candidate?.text || "" };
    }
}
exports.ProductionGeminiClient = ProductionGeminiClient;
/**
 * Servicio de Ejecución y Orquestación del Runtime de Gemini
 */
class GeminiRuntimeService {
    constructor(client, adapters) {
        this.client = client;
        this.adapters = adapters;
    }
    async orchestrate(userMessage, history = [], context) {
        const executionId = `exec_${Date.now()}`;
        const messages = [];
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
        let pendingConfirmation = undefined;
        while (round < GeminiRuntimeService.MAX_TOOL_ROUNDS) {
            round++;
            let modelResponse;
            try {
                modelResponse = await this.client.generateContent({
                    systemInstruction: GeminiSystemInstruction_1.GEMINI_SYSTEM_INSTRUCTION,
                    messages,
                    tools: GeminiToolDeclarations_1.GEMINI_TOOL_DECLARATIONS,
                });
            }
            catch (err) {
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
                return {
                    text: modelResponse.text || "No tengo una respuesta para esa consulta.",
                    intent: "GENERAL_INQUIRY",
                    pendingConfirmation,
                    executionId,
                };
            }
            const toolCall = modelResponse.functionCall;
            const toolId = toolCall.name;
            const toolArgs = toolCall.args || {};
            // 3. Validación de la Herramienta en el Registro
            if (!BackendToolRegistry_1.BackendToolRegistry.isRegisteredBackendTool(toolId) && !BackendToolRegistry_1.BackendToolRegistry.isLocalOnlyTool(toolId)) {
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
            // 4. Si es una herramienta local, devolver instrucción de ejecución local al cliente
            if (BackendToolRegistry_1.BackendToolRegistry.isLocalOnlyTool(toolId)) {
                return {
                    text: `Preparando consulta local para '${toolId}'...`,
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
            const toolDef = BackendToolRegistry_1.BackendToolRegistry.getTool(toolId);
            if (toolDef?.requiresConfirmation && !context.confirmedByUser) {
                // Generar paquete criptográfico de confirmación pendiente
                pendingConfirmation = ConfirmationGateEngine_1.ConfirmationGateEngine.createPendingConfirmation(context.authUid, toolId, `Confirmación requerida para ejecutar '${toolId}'`, toolArgs);
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
            const toolResult = await adapter.execute(toolArgs, context);
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
exports.GeminiRuntimeService = GeminiRuntimeService;
GeminiRuntimeService.MAX_TOOL_ROUNDS = 5;
