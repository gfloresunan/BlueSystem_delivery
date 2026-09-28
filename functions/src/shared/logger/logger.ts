/**
 * BlueSystem Delivery Enterprise — Structured Logging Engine
 * Sprint 17.1 Infrastructure Foundation
 *
 * PROHIBIDO el uso de console.log / console.error nativos en producción.
 * Todos los eventos deben canalizarse a través de este Structured Logger compatible con Cloud Logging.
 */

export type LogSeverity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "AUDIT" | "SECURITY";

export interface LogContext {
  service?: string;
  module?: string;
  operation?: string;
  requestId?: string;
  correlationId?: string;
  tenantId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  duration?: number;
  status?: "SUCCESS" | "FAILURE" | "PENDING";
  errorCode?: string;
  stack?: string;
  [key: string]: any;
}

export class Logger {
  private static defaultService = "bluesystem-backend";

  public static info(message: string, context?: LogContext): void {
    this.emit("INFO", message, context);
  }

  public static warn(message: string, context?: LogContext): void {
    this.emit("WARN", message, context);
  }

  public static error(message: string, error?: Error | any, context?: LogContext): void {
    const errStack = error instanceof Error ? error.stack : undefined;
    const errCode = error?.code || error?.name || "UNKNOWN_ERROR";
    const combinedContext: LogContext = {
      ...context,
      errorCode: errCode,
      stack: errStack || context?.stack,
    };
    this.emit("ERROR", message, combinedContext);
  }

  public static audit(operation: string, performedBy: string, details: Record<string, any>, context?: LogContext): void {
    const auditContext: LogContext = {
      ...context,
      operation,
      userId: performedBy,
      auditDetails: details,
      status: "SUCCESS",
    };
    this.emit("AUDIT", `[AUDIT] ${operation} by ${performedBy}`, auditContext);
  }

  public static security(event: string, severity: "WARN" | "ERROR", details: Record<string, any>, context?: LogContext): void {
    const securityContext: LogContext = {
      ...context,
      operation: event,
      securityDetails: details,
      status: "FAILURE",
    };
    this.emit("SECURITY", `[SECURITY ${severity}] ${event}`, securityContext);
  }

  private static emit(severity: LogSeverity, message: string, context?: LogContext): void {
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
    } else {
      process.stdout.write(jsonOutput + "\n");
    }
  }
}
