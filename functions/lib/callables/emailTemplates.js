"use strict";
/**
 * BlueSystem Delivery Enterprise — Email Templates & SMTP Administration
 * Callables HTTPS para el Admin Web (Módulo Email Templates)
 *
 * Funcionalidades:
 * 1. adminGetEmailTemplates: Lista plantillas registradas (con defaults del sistema).
 * 2. adminSaveEmailTemplate: Valida variables, sanitiza HTML y guarda versión.
 * 3. adminSendTestEmail: Dispara correo de prueba seguro con datos ficticios.
 * 4. adminGetEmailEventsHistory: Consulta historial de entregas (/email_events).
 * 5. adminVerifySmtpConnection: Verifica conectividad y autenticación con el servidor SMTP.
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
exports.adminVerifySmtpConnection = exports.adminGetEmailEventsHistory = exports.adminSendTestEmail = exports.adminSaveEmailTemplate = exports.adminGetEmailTemplates = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const validator_1 = require("../shared/middleware/validator");
const emailService_1 = require("../services/emailService");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
// ─── 1. CALLABLE: adminGetEmailTemplates ──────────────────────────────────────
exports.adminGetEmailTemplates = functions.https.onCall(async (data, context) => {
    (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
    }, "adminGetEmailTemplates");
    try {
        const systemDefaults = emailService_1.EmailTemplateEngine.getSystemTemplates();
        const templatesMap = new Map();
        // Cargar defaults
        for (const t of systemDefaults) {
            templatesMap.set(t.templateId, Object.assign({}, t));
        }
        // Cargar overrides en Firestore
        const snap = await db.collection("email_templates").get();
        snap.forEach((doc) => {
            const customData = doc.data();
            if (customData && customData.templateId) {
                templatesMap.set(customData.templateId, Object.assign(Object.assign({}, templatesMap.get(customData.templateId)), customData));
            }
        });
        return {
            success: true,
            templates: Array.from(templatesMap.values()),
        };
    }
    catch (err) {
        logger_1.Logger.error("[EMAIL-ADMIN] Error listando plantillas:", err === null || err === void 0 ? void 0 : err.message);
        throw new functions.https.HttpsError("internal", "Error al obtener plantillas de correo.");
    }
});
// ─── 2. CALLABLE: adminSaveEmailTemplate ──────────────────────────────────────
exports.adminSaveEmailTemplate = functions.https.onCall(async (data, context) => {
    var _a;
    const { uid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
        requiredFields: ["templateId", "subject", "htmlContent"],
    }, "adminSaveEmailTemplate");
    const templateId = data.templateId.trim();
    // 1. Obtener la definición base para conocer variables permitidas
    let baseTemplate;
    try {
        baseTemplate = await emailService_1.EmailTemplateEngine.resolveTemplate(templateId);
    }
    catch (_b) {
        // Si no existe, usar las variables enviadas
    }
    const allowedVariables = data.allowedVariables || (baseTemplate === null || baseTemplate === void 0 ? void 0 : baseTemplate.allowedVariables) || ["platformName", "tenantName", "supportEmail", "year"];
    // 2. Validación estricta de variables en subject, title, html y buttonUrl
    const fullContent = `${data.subject} ${data.title || ""} ${data.htmlContent} ${data.buttonUrl || ""}`;
    const validation = emailService_1.EmailTemplateEngine.validateVariables(fullContent, allowedVariables);
    if (!validation.isValid) {
        throw new functions.https.HttpsError("invalid-argument", `Variables inválidas o no permitidas detectadas: ${validation.invalidVariables.join(", ")}`);
    }
    // 3. Validación de URL en botón CTA
    if (data.buttonUrl && data.buttonUrl.trim()) {
        const isSafe = emailService_1.HtmlSanitizer.isSafeUrl(data.buttonUrl.trim());
        const hasVariableUrl = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/.test(data.buttonUrl);
        if (!isSafe && !hasVariableUrl) {
            throw new functions.https.HttpsError("invalid-argument", "La URL del botón debe utilizar el protocolo seguro https:// o una variable permitida.");
        }
    }
    // 4. Sanitización de HTML
    const sanitizedHtml = emailService_1.HtmlSanitizer.sanitize(data.htmlContent);
    // 5. Incrementar versión y persistir
    const docRef = db.collection("email_templates").doc(templateId);
    const existingDoc = await docRef.get();
    const currentVersion = existingDoc.exists ? (((_a = existingDoc.data()) === null || _a === void 0 ? void 0 : _a.version) || 1) : ((baseTemplate === null || baseTemplate === void 0 ? void 0 : baseTemplate.version) || 1);
    const newVersion = currentVersion + 1;
    const templatePayload = {
        templateId,
        version: newVersion,
        name: (baseTemplate === null || baseTemplate === void 0 ? void 0 : baseTemplate.name) || templateId,
        description: (baseTemplate === null || baseTemplate === void 0 ? void 0 : baseTemplate.description) || "",
        audience: (baseTemplate === null || baseTemplate === void 0 ? void 0 : baseTemplate.audience) || "SYSTEM",
        eventType: (baseTemplate === null || baseTemplate === void 0 ? void 0 : baseTemplate.eventType) || "CUSTOM",
        subject: data.subject.trim(),
        title: (data.title || "").trim(),
        htmlContent: sanitizedHtml,
        buttonLabel: (data.buttonLabel || "").trim(),
        buttonUrl: (data.buttonUrl || "").trim(),
        allowedVariables,
        status: data.status || "ACTIVE",
        tenantId: data.tenantId || "ten_bluesystem_core",
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
    };
    await docRef.set(templatePayload, { merge: true });
    // 6. Guardar versión histórica inmutable
    await docRef.collection("versions").doc(`v${newVersion}`).set(Object.assign(Object.assign({}, templatePayload), { savedAt: FieldValue.serverTimestamp(), savedBy: uid }));
    // 7. Registro en auditoría
    try {
        await db.collection("audit_events").add({
            event: "EMAIL_TEMPLATE_UPDATED",
            domain: "EMAIL_ADMIN",
            templateId,
            version: newVersion,
            actorUid: uid,
            timestamp: FieldValue.serverTimestamp(),
        });
    }
    catch (_c) {
        // No bloqueante
    }
    logger_1.Logger.info(`[EMAIL-ADMIN] Plantilla ${templateId} actualizada a versión ${newVersion} por ${uid}`);
    return {
        success: true,
        templateId,
        version: newVersion,
        message: `Plantilla ${templateId} guardada exitosamente (v${newVersion}).`,
    };
});
// ─── 3. CALLABLE: adminSendTestEmail ──────────────────────────────────────────
exports.adminSendTestEmail = functions.https.onCall(async (data, context) => {
    const { uid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
        requiredFields: ["templateId", "recipient"],
    }, "adminSendTestEmail");
    const cleanRecipient = data.recipient.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanRecipient)) {
        throw new functions.https.HttpsError("invalid-argument", "El formato del correo destinatario es inválido.");
    }
    try {
        const result = await emailService_1.EmailService.sendTestEmail({
            templateId: data.templateId,
            recipient: cleanRecipient,
            sampleVariables: data.sampleVariables,
            adminUid: uid,
            tenantId: data.tenantId,
        });
        return result;
    }
    catch (err) {
        logger_1.Logger.error("[EMAIL-ADMIN] Error en envío de prueba:", err === null || err === void 0 ? void 0 : err.message);
        throw new functions.https.HttpsError("internal", `Fallo al enviar correo de prueba: ${err === null || err === void 0 ? void 0 : err.message}`);
    }
});
// ─── 4. CALLABLE: adminGetEmailEventsHistory ──────────────────────────────────
exports.adminGetEmailEventsHistory = functions.https.onCall(async (data, context) => {
    (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
    }, "adminGetEmailEventsHistory");
    try {
        const maxLimit = Math.min((data === null || data === void 0 ? void 0 : data.limit) || 50, 100);
        let query = db.collection("email_events").orderBy("createdAt", "desc").limit(maxLimit);
        if (data === null || data === void 0 ? void 0 : data.eventType) {
            query = query.where("eventType", "==", data.eventType.trim());
        }
        if (data === null || data === void 0 ? void 0 : data.status) {
            query = query.where("status", "==", data.status.trim().toUpperCase());
        }
        const snap = await query.get();
        const events = [];
        snap.forEach((doc) => {
            var _a, _b, _c;
            const item = doc.data();
            events.push({
                eventId: doc.id,
                eventType: item.eventType || "UNKNOWN",
                recipient: item.recipient || "",
                subject: item.subject || "",
                templateId: item.templateId || "",
                templateVersion: item.templateVersion || 1,
                status: item.status || "UNKNOWN",
                attempts: item.attempts || item.attempt || 1,
                providerMessageId: item.providerMessageId || null,
                error: item.error || null,
                errorCategory: item.errorCategory || null,
                createdAt: ((_a = item.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) ? item.createdAt.toDate().toISOString() : null,
                sentAt: ((_b = item.sentAt) === null || _b === void 0 ? void 0 : _b.toDate) ? item.sentAt.toDate().toISOString() : null,
                failedAt: ((_c = item.failedAt) === null || _c === void 0 ? void 0 : _c.toDate) ? item.failedAt.toDate().toISOString() : null,
            });
        });
        return {
            success: true,
            events,
        };
    }
    catch (err) {
        logger_1.Logger.error("[EMAIL-ADMIN] Error consultando historial:", err === null || err === void 0 ? void 0 : err.message);
        throw new functions.https.HttpsError("internal", "Error al obtener historial de entregas de email.");
    }
});
// ─── 5. CALLABLE: adminVerifySmtpConnection ───────────────────────────────────
exports.adminVerifySmtpConnection = functions.https.onCall(async (data, context) => {
    (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "SUPERVISOR"],
    }, "adminVerifySmtpConnection");
    try {
        const transport = new emailService_1.SmtpEmailTransport();
        const result = await transport.verifyConnectionDetailed();
        return {
            success: result.success,
            host: result.details.host,
            port: result.details.port,
            user: result.details.user,
            passwordStatus: result.details.passwordStatus,
            phase: result.phase,
            status: result.success ? "CONNECTED" : "FAILED",
            errorCategory: result.errorCategory,
            message: result.success
                ? `Conexión y autenticación SMTP exitosa (${result.details.host}:${result.details.port}).`
                : (result.errorMessage || "No se pudo establecer conexión con el servidor SMTP corporativo."),
        };
    }
    catch (err) {
        return {
            success: false,
            status: "FAILED",
            phase: "UNKNOWN",
            error: (err === null || err === void 0 ? void 0 : err.message) || "Error desconocido verificando SMTP",
        };
    }
});
//# sourceMappingURL=emailTemplates.js.map