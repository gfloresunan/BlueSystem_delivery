"use strict";
/**
 * BlueSystem Delivery Enterprise — Shared Middleware for Cloud Run Microservices
 * Sprint 17.2 Cloud Run Foundation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedAuthMiddleware = void 0;
class SharedAuthMiddleware {
    static extractRequestContext(headers) {
        const rawTraceParent = (headers["traceparent"] || headers["x-cloud-trace-context"] || "");
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
            uid: (headers["x-user-id"] || ""),
            role: (headers["x-user-role"] || "GUEST"),
            businessId: (headers["x-business-id"] || null),
            branchId: (headers["x-branch-id"] || null),
        };
    }
}
exports.SharedAuthMiddleware = SharedAuthMiddleware;
