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
        const errCode = (error === null || error === void 0 ? void 0 : error.code) || (error === null || error === void 0 ? void 0 : error.name) || "UNKNOWN_ERROR";
        const combinedContext = Object.assign(Object.assign({}, context), { errorCode: errCode, stack: errStack || (context === null || context === void 0 ? void 0 : context.stack) });
        this.emit("ERROR", message, combinedContext);
    }
    static audit(operation, performedBy, details, context) {
        const auditContext = Object.assign(Object.assign({}, context), { operation, userId: performedBy, auditDetails: details, status: "SUCCESS" });
        this.emit("AUDIT", `[AUDIT] ${operation} by ${performedBy}`, auditContext);
    }
    static security(event, severity, details, context) {
        const securityContext = Object.assign(Object.assign({}, context), { operation: event, securityDetails: details, status: "FAILURE" });
        this.emit("SECURITY", `[SECURITY ${severity}] ${event}`, securityContext);
    }
    static emit(severity, message, context) {
        const payload = Object.assign(Object.assign(Object.assign(Object.assign({ timestamp: new Date().toISOString(), severity, service: (context === null || context === void 0 ? void 0 : context.service) || this.defaultService, module: (context === null || context === void 0 ? void 0 : context.module) || "core", operation: (context === null || context === void 0 ? void 0 : context.operation) || "execute", requestId: (context === null || context === void 0 ? void 0 : context.requestId) || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, correlationId: (context === null || context === void 0 ? void 0 : context.correlationId) || (context === null || context === void 0 ? void 0 : context.requestId) || "", tenantId: (context === null || context === void 0 ? void 0 : context.tenantId) || null, businessId: (context === null || context === void 0 ? void 0 : context.businessId) || null, branchId: (context === null || context === void 0 ? void 0 : context.branchId) || null, userId: (context === null || context === void 0 ? void 0 : context.userId) || null, duration: (context === null || context === void 0 ? void 0 : context.duration) || 0, status: (context === null || context === void 0 ? void 0 : context.status) || "SUCCESS", message }, ((context === null || context === void 0 ? void 0 : context.errorCode) ? { errorCode: context.errorCode } : {})), ((context === null || context === void 0 ? void 0 : context.stack) ? { stack: context.stack } : {})), ((context === null || context === void 0 ? void 0 : context.auditDetails) ? { auditDetails: context.auditDetails } : {})), ((context === null || context === void 0 ? void 0 : context.securityDetails) ? { securityDetails: context.securityDetails } : {}));
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
//# sourceMappingURL=logger.js.map