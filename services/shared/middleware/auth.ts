/**
 * BlueSystem Delivery Enterprise — Shared Middleware for Cloud Run Microservices
 * Sprint 17.2 Cloud Run Foundation
 */

export interface ServiceRequestContext {
  traceId: string;
  spanId: string;
  traceParent: string;
  uid?: string;
  role?: string;
  businessId?: string | null;
  branchId?: string | null;
}

export class SharedAuthMiddleware {
  public static extractRequestContext(headers: Record<string, string | string[] | undefined>): ServiceRequestContext {
    const rawTraceParent = (headers["traceparent"] || headers["x-cloud-trace-context"] || "") as string;
    
    let traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    let spanId = `span_${Math.random().toString(36).substr(2, 6)}`;

    if (rawTraceParent && rawTraceParent.includes("-")) {
      const parts = rawTraceParent.split("-");
      if (parts.length >= 3) {
        traceId = parts[1];
        spanId = parts[2];
      }
    }

    return {
      traceId,
      spanId,
      traceParent: rawTraceParent || `00-${traceId}-${spanId}-01`,
      uid: (headers["x-user-id"] || "") as string,
      role: (headers["x-user-role"] || "GUEST") as string,
      businessId: (headers["x-business-id"] || null) as string | null,
      branchId: (headers["x-branch-id"] || null) as string | null,
    };
  }
}
