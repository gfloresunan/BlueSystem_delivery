"use strict";
/**
 * BlueSystem Delivery Enterprise — Structured Logging Engine
 * Sprint 17.1 Infrastructure Foundation
 *
 * PROHIBIDO el uso de console.log / console.error nativos en producción.
 * Todos los eventos deben canalizarse a través de este Structured Logger compatible con Cloud Logging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    static info(message, context) {
        this.emit("INFO", message, context);
    }
    static warn(message, context) {
        this.emit("WARN", message, context);
    }
    static error(message, error, context) {
        const errStack = error instanceof Error ? error.stack : undefined;
        const errCode = error?.code || error?.name || "UNKNOWN_ERROR";
        const combinedContext = {
            ...context,
            errorCode: errCode,
            stack: errStack || context?.stack,
        };
        this.emit("ERROR", message, combinedContext);
    }
    static audit(operation, performedBy, details, context) {
        const auditContext = {
            ...context,
            operation,
            userId: performedBy,
            auditDetails: details,
            status: "SUCCESS",
        };
        this.emit("AUDIT", `[AUDIT] ${operation} by ${performedBy}`, auditContext);
    }
    static security(event, severity, details, context) {
        const securityContext = {
            ...context,
            operation: event,
            securityDetails: details,
            status: "FAILURE",
        };
        this.emit("SECURITY", `[SECURITY ${severity}] ${event}`, securityContext);
    }
    static emit(severity, message, context) {
        const payload = {
            timestamp: new Date().toISOString(),
            severity,
            service: context?.service || this.defaultService,
            module: context?.module || "core",
            operation: context?.operation || "execute",
            requestId: context?.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            correlationId: context?.correlationId || context?.requestId || "",
            tenantId: context?.tenantId || null,
            businessId: context?.businessId || null,
            branchId: context?.branchId || null,
            userId: context?.userId || null,
            duration: context?.duration || 0,
            status: context?.status || "SUCCESS",
            message,
            ...(context?.errorCode ? { errorCode: context.errorCode } : {}),
            ...(context?.stack ? { stack: context.stack } : {}),
            ...(context?.auditDetails ? { auditDetails: context.auditDetails } : {}),
            ...(context?.securityDetails ? { securityDetails: context.securityDetails } : {}),
        };
        // Imprimir objeto JSON estructurado directamente a stdout/stderr para GCP Cloud Logging
        const jsonOutput = JSON.stringify(payload);
        if (severity === "ERROR" || severity === "SECURITY") {
            process.stderr.write(jsonOutput + "\n");
        }
        else {
            process.stdout.write(jsonOutput + "\n");
        }
    }
}
exports.Logger = Logger;
Logger.defaultService = "bluesystem-backend";
