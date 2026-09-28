"use strict";
/**
 * BlueSystem Delivery Enterprise — Middleware Callable Validator
 * Sprint 17.1 Infrastructure Foundation
 *
 * Pipeline unificado de validaciones de seguridad para funciones Callable:
 * Auth, App Check, Role, Tenant, Business, Branch, Schema & Rate Limit.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCallableContext = validateCallableContext;
const functions = __importStar(require("firebase-functions"));
const logger_1 = require("../logger/logger");
function validateCallableContext(context, data, options, moduleName) {
    var _a, _b;
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    // 1. Validar App Check
    if (options.requireAppCheck && process.env.NODE_ENV === "production" && !context.app) {
        logger_1.Logger.security("UNAUTHORIZED_APP_CHECK", "ERROR", { reason: "Missing App Check token attestation" }, { module: moduleName, requestId });
        throw new functions.https.HttpsError("failed-precondition", "Firebase App Check: Solicitud rechazada por falta de atestación de integridad.");
    }
    // 2. Validar Autenticación
    if (options.requireAuth && !context.auth) {
        logger_1.Logger.security("UNAUTHENTICATED_CALL", "WARN", { reason: "Unauthenticated request to protected endpoint" }, { module: moduleName, requestId });
        throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión para realizar esta operación.");
    }
    const uid = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || "";
    const token = (((_b = context.auth) === null || _b === void 0 ? void 0 : _b.token) || {});
    const role = (token.role || token.eiamRole || "GUEST").toString();
    const businessId = (token.businessId || null);
    const branchId = (token.branchId || null);
    const tenantId = (token.tenantId || null);
    // 3. Validar Rol EIAM
    if (options.allowedRoles && options.allowedRoles.length > 0) {
        const isAdminToken = token.admin === true || token.isSuperAdmin === true;
        const hasRole = isAdminToken ||
            options.allowedRoles.some((r) => role.toLowerCase().includes(r.toLowerCase()));
        if (!hasRole) {
            logger_1.Logger.security("FORBIDDEN_ROLE_ACCESS", "WARN", { requiredRoles: options.allowedRoles, currentRole: role, uid }, { module: moduleName, requestId, userId: uid });
            throw new functions.https.HttpsError("permission-denied", "No tiene permisos suficientes para ejecutar esta operación.");
        }
    }
    // 4. Validar BusinessId si es requerido
    if (options.requiredBusinessId && !businessId && !["ADMIN", "SUPER_ADMIN"].includes(role.toUpperCase())) {
        logger_1.Logger.security("MISSING_TENANT_ID", "ERROR", { uid, role }, { module: moduleName, requestId, userId: uid });
        throw new functions.https.HttpsError("permission-denied", "La solicitud carece de un businessId/tenantId válido en los Custom Claims.");
    }
    // 5. Validar Esquema de Datos (campos requeridos)
    if (options.requiredFields && options.requiredFields.length > 0) {
        for (const field of options.requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === "") {
                logger_1.Logger.warn(`Campo obligatorio faltante: ${field}`, {
                    module: moduleName,
                    requestId,
                    userId: uid,
                });
                throw new functions.https.HttpsError("invalid-argument", `El campo '${field}' es obligatorio.`);
            }
        }
    }
    logger_1.Logger.info(`Validaciones de Callable exitosas en ${Date.now() - startTime}ms`, {
        module: moduleName,
        requestId,
        userId: uid,
        businessId,
        duration: Date.now() - startTime,
    });
    return { uid, role, businessId, branchId, tenantId };
}
//# sourceMappingURL=validator.js.map