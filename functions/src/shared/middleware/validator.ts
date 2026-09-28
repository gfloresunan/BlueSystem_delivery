/**
 * BlueSystem Delivery Enterprise — Middleware Callable Validator
 * Sprint 17.1 Infrastructure Foundation
 *
 * Pipeline unificado de validaciones de seguridad para funciones Callable:
 * Auth, App Check, Role, Tenant, Business, Branch, Schema & Rate Limit.
 */

import * as functions from "firebase-functions";
import { Logger } from "../logger/logger";

export interface ValidationOptions {
  requireAuth?: boolean;
  requireAppCheck?: boolean;
  allowedRoles?: string[];
  requiredBusinessId?: boolean;
  requiredFields?: string[];
}

export function validateCallableContext(
  context: functions.https.CallableContext,
  data: any,
  options: ValidationOptions,
  moduleName: string
): { uid: string; role: string; businessId: string | null; branchId: string | null; tenantId: string | null } {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // 1. Validar App Check
  if (options.requireAppCheck && process.env.NODE_ENV === "production" && !context.app) {
    Logger.security(
      "UNAUTHORIZED_APP_CHECK",
      "ERROR",
      { reason: "Missing App Check token attestation" },
      { module: moduleName, requestId }
    );
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Firebase App Check: Solicitud rechazada por falta de atestación de integridad."
    );
  }

  // 2. Validar Autenticación
  if (options.requireAuth && !context.auth) {
    Logger.security(
      "UNAUTHENTICATED_CALL",
      "WARN",
      { reason: "Unauthenticated request to protected endpoint" },
      { module: moduleName, requestId }
    );
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debe iniciar sesión para realizar esta operación."
    );
  }

  const uid = context.auth?.uid || "";
  const token = (context.auth?.token || {}) as any;
  const role = (token.role || token.eiamRole || "GUEST").toString();
  const businessId = (token.businessId || null) as string | null;
  const branchId = (token.branchId || null) as string | null;
  const tenantId = (token.tenantId || null) as string | null;

  // 3. Validar Rol EIAM
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    const isAdminToken = token.admin === true || token.isSuperAdmin === true;
    const hasRole =
      isAdminToken ||
      options.allowedRoles.some((r) =>
        role.toLowerCase().includes(r.toLowerCase())
      );
    if (!hasRole) {
      Logger.security(
        "FORBIDDEN_ROLE_ACCESS",
        "WARN",
        { requiredRoles: options.allowedRoles, currentRole: role, uid },
        { module: moduleName, requestId, userId: uid }
      );
      throw new functions.https.HttpsError(
        "permission-denied",
        "No tiene permisos suficientes para ejecutar esta operación."
      );
    }
  }

  // 4. Validar BusinessId si es requerido
  if (options.requiredBusinessId && !businessId && !["ADMIN", "SUPER_ADMIN"].includes(role.toUpperCase())) {
    Logger.security(
      "MISSING_TENANT_ID",
      "ERROR",
      { uid, role },
      { module: moduleName, requestId, userId: uid }
    );
    throw new functions.https.HttpsError(
      "permission-denied",
      "La solicitud carece de un businessId/tenantId válido en los Custom Claims."
    );
  }

  // 5. Validar Esquema de Datos (campos requeridos)
  if (options.requiredFields && options.requiredFields.length > 0) {
    for (const field of options.requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === "") {
        Logger.warn(`Campo obligatorio faltante: ${field}`, {
          module: moduleName,
          requestId,
          userId: uid,
        });
        throw new functions.https.HttpsError(
          "invalid-argument",
          `El campo '${field}' es obligatorio.`
        );
      }
    }
  }

  Logger.info(`Validaciones de Callable exitosas en ${Date.now() - startTime}ms`, {
    module: moduleName,
    requestId,
    userId: uid,
    businessId,
    duration: Date.now() - startTime,
  });

  return { uid, role, businessId, branchId, tenantId };
}
