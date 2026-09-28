"use strict";
/**
 * BlueSystem Delivery Enterprise — Distributed Tracing Helper
 * Sprint 17.1.2 Enterprise Evolution
 *
 * Propagación de contexto de traza distribuida W3C (traceparent)
 * Permite seguir transacciones completas entre Cliente -> Cloud Functions -> Cloud Run -> GCP Services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tracer = void 0;
class Tracer {
    /**
     * Extrae o genera un contexto de traza W3C Traceparent (version-traceId-spanId-flags)
     */
    static getOrCreateTraceContext(rawTraceParent) {
        if (rawTraceParent && rawTraceParent.startsWith("00-")) {
            const parts = rawTraceParent.split("-");
            if (parts.length === 4) {
                return {
                    traceId: parts[1],
                    spanId: parts[2],
                    traceFlags: parts[3],
                    traceParent: rawTraceParent,
                };
            }
        }
        // Generar un nuevo traceId de 16 bytes (32 caracteres hex) y spanId de 8 bytes (16 caracteres hex)
        const traceId = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
        const spanId = Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
        const traceFlags = "01"; // Sampled
        const traceParent = `00-${traceId}-${spanId}-${traceFlags}`;
        return {
            traceId,
            spanId,
            traceFlags,
            traceParent,
        };
    }
    /**
     * Inyecta los headers de traza W3C en un objeto de headers HTTP para peticiones salientes
     */
    static injectTraceHeaders(traceContext, headers = {}) {
        return Object.assign(Object.assign({}, headers), { traceparent: traceContext.traceParent, "x-cloud-trace-context": `${traceContext.traceId}/${traceContext.spanId};o=1` });
    }
}
exports.Tracer = Tracer;
//# sourceMappingURL=tracer.js.map