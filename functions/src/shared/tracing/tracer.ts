/**
 * BlueSystem Delivery Enterprise — Distributed Tracing Helper
 * Sprint 17.1.2 Enterprise Evolution
 *
 * Propagación de contexto de traza distribuida W3C (traceparent)
 * Permite seguir transacciones completas entre Cliente -> Cloud Functions -> Cloud Run -> GCP Services
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: string;
  traceParent: string;
}

export class Tracer {
  /**
   * Extrae o genera un contexto de traza W3C Traceparent (version-traceId-spanId-flags)
   */
  public static getOrCreateTraceContext(rawTraceParent?: string): TraceContext {
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
    const traceId = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    ).join("");

    const spanId = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    ).join("");

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
  public static injectTraceHeaders(traceContext: TraceContext, headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      traceparent: traceContext.traceParent,
      "x-cloud-trace-context": `${traceContext.traceId}/${traceContext.spanId};o=1`,
    };
  }
}
