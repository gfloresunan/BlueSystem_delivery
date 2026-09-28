"use strict";
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
exports.sendCorporatePasswordReset = exports.sendCorporateEmailVerification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const emailService_1 = require("../services/emailService");
const logger_1 = require("../shared/logger/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Callable: sendCorporateEmailVerification
 * Genera el enlace de verificación nativo de Firebase Auth y lo despacha
 * a través de EmailService con el remitente corporativo (noreply@bluesystemdelivery.com).
 */
exports.sendCorporateEmailVerification = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!uid) {
        throw new functions.https.HttpsError("unauthenticated", "Usuario no autenticado.");
    }
    try {
        const authUser = await admin.auth().getUser(uid);
        if (!authUser.email) {
            throw new functions.https.HttpsError("invalid-argument", "El usuario no tiene una dirección de correo electrónico asociada.");
        }
        if (authUser.emailVerified) {
            return {
                success: true,
                alreadyVerified: true,
                message: "El correo electrónico ya ha sido verificado.",
            };
        }
        // Obtener nombre del usuario desde Firestore si existe
        let customerName = authUser.displayName || "";
        let tenantId = undefined;
        try {
            const userDoc = await db.collection("users").doc(uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                customerName = (uData === null || uData === void 0 ? void 0 : uData.nombre) || (uData === null || uData === void 0 ? void 0 : uData.name) || customerName;
                tenantId = (uData === null || uData === void 0 ? void 0 : uData.tenantId) || undefined;
            }
        }
        catch (docErr) {
            logger_1.Logger.warn(`[AUTH_VERIFICATION] No se pudo leer documento de usuario para uid=${uid}: ${docErr === null || docErr === void 0 ? void 0 : docErr.message}`);
        }
        // Generar enlace seguro de verificación de Firebase Auth con fallback robusto
        let verificationLink;
        try {
            const actionCodeSettings = {
                url: "https://bluesystemdelivery.com",
                handleCodeInApp: false,
            };
            verificationLink = await admin.auth().generateEmailVerificationLink(authUser.email, actionCodeSettings);
        }
        catch (linkErr1) {
            logger_1.Logger.warn(`[AUTH_VERIFICATION] Aviso con ActionCodeSettings principal (${linkErr1 === null || linkErr1 === void 0 ? void 0 : linkErr1.message}), intentando fallback web.app...`);
            try {
                const fallbackSettings = {
                    url: "https://bluesystem-7c9af.web.app",
                    handleCodeInApp: false,
                };
                verificationLink = await admin.auth().generateEmailVerificationLink(authUser.email, fallbackSettings);
            }
            catch (linkErr2) {
                logger_1.Logger.warn(`[AUTH_VERIFICATION] Fallback web.app falló (${linkErr2 === null || linkErr2 === void 0 ? void 0 : linkErr2.message}), generando enlace estándar...`);
                verificationLink = await admin.auth().generateEmailVerificationLink(authUser.email);
            }
        }
        // Transformar el enlace para que apunte al portal corporativo oficial en español (https://bluesystemdelivery.com/verify-email.html)
        let corporateVerificationLink = verificationLink;
        try {
            const parsedUrl = new URL(verificationLink);
            const oobCode = parsedUrl.searchParams.get("oobCode");
            const apiKey = parsedUrl.searchParams.get("apiKey") || "";
            if (oobCode) {
                corporateVerificationLink = `https://admin.bluesystemdelivery.com/verify-email.html?mode=verifyEmail&oobCode=${encodeURIComponent(oobCode)}&apiKey=${encodeURIComponent(apiKey)}`;
            }
        }
        catch (urlParseErr) {
            logger_1.Logger.warn(`[AUTH_VERIFICATION] Aviso al formatear URL corporativa:`, urlParseErr === null || urlParseErr === void 0 ? void 0 : urlParseErr.message);
            corporateVerificationLink = verificationLink;
        }
        // Enviar correo a través de EmailService (SMTP 465 SSL noreply@bluesystemdelivery.com)
        const emailResult = await emailService_1.EmailService.sendCorporateVerificationEmail({
            uid,
            email: authUser.email,
            customerName: customerName.trim().length > 0 ? customerName.trim() : "Cliente",
            verificationLink: corporateVerificationLink,
            tenantId,
        });
        logger_1.Logger.info(`[AUTH_VERIFICATION] Correo de verificación corporativo despachado para uid=${uid}, email=${authUser.email}, status=${emailResult.status}`);
        return {
            success: emailResult.success,
            status: emailResult.status,
            message: "Correo de verificación corporativo enviado exitosamente.",
        };
    }
    catch (error) {
        logger_1.Logger.error(`[AUTH_VERIFICATION] Error generando o enviando verificación para uid=${uid}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        const msg = (error === null || error === void 0 ? void 0 : error.message) || "";
        if (msg.includes("TOO_MANY_ATTEMPTS_TRY_LATER") || msg.includes("too-many-requests")) {
            throw new functions.https.HttpsError("resource-exhausted", "Has realizado demasiados intentos recientemente. Por favor espera unos minutos antes de solicitar un nuevo correo de verificación.");
        }
        throw new functions.https.HttpsError("internal", msg || "Error al procesar la solicitud de verificación.");
    }
});
/**
 * Callable: sendCorporatePasswordReset
 * Protocolo: BSD-PASSWORD-RECOVERY-SURGICAL-FIX-001
 *
 * Genera el enlace de restablecimiento seguro nativo de Firebase Auth con ActionCodeSettings
 * y despacha el correo transaccional en español con branding corporativo mediante EmailService (SMTP 465 SSL).
 * Mantiene protección anti-enumeración de usuarios (retorna respuesta neutra idéntica si el usuario no existe).
 * Protege contra double-click e idempotencia mediante ventanas de deduplicación.
 */
exports.sendCorporatePasswordReset = functions.https.onCall(async (data, context) => {
    const rawEmail = data === null || data === void 0 ? void 0 : data.email;
    if (!rawEmail || typeof rawEmail !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "Por favor, ingresa tu correo electrónico.");
    }
    const cleanEmail = rawEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
        throw new functions.https.HttpsError("invalid-argument", "El formato del correo electrónico no es válido.");
    }
    const genericSuccessResponse = {
        success: true,
        message: "Si existe una cuenta asociada a este correo, recibirás las instrucciones para restablecer tu contraseña.",
    };
    try {
        let authUser;
        try {
            authUser = await admin.auth().getUserByEmail(cleanEmail);
        }
        catch (userErr) {
            // Protección Anti-Enumeración: No revelar si el correo existe o no
            if (userErr.code === "auth/user-not-found") {
                const masked = cleanEmail.replace(/^(.)(.*)(@.*)$/, "$1***$3");
                logger_1.Logger.info(`[AUTH_PASSWORD_RESET] Solicitud para correo no registrado (Anti-Enumeration Handled): ${masked}`);
                return genericSuccessResponse;
            }
            throw userErr;
        }
        const uid = authUser.uid;
        // Obtener nombre y tenantId del usuario si existe en Firestore
        let contactName = authUser.displayName || "";
        let tenantId = undefined;
        try {
            const userDoc = await db.collection("users").doc(uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                contactName = (uData === null || uData === void 0 ? void 0 : uData.nombre) || (uData === null || uData === void 0 ? void 0 : uData.name) || contactName;
                tenantId = (uData === null || uData === void 0 ? void 0 : uData.tenantId) || undefined;
            }
        }
        catch (docErr) {
            logger_1.Logger.warn(`[AUTH_PASSWORD_RESET] Aviso al leer /users/${uid}:`, docErr === null || docErr === void 0 ? void 0 : docErr.message);
        }
        if (!contactName.trim()) {
            contactName = "Usuario";
        }
        // Generar enlace seguro de Firebase Auth con dominio corporativo y fallback robusto
        let resetLink;
        try {
            const actionCodeSettings = {
                url: "https://bluesystemdelivery.com",
                handleCodeInApp: false,
            };
            resetLink = await admin.auth().generatePasswordResetLink(cleanEmail, actionCodeSettings);
        }
        catch (linkErr1) {
            logger_1.Logger.warn(`[AUTH_PASSWORD_RESET] Aviso con ActionCodeSettings principal (${linkErr1 === null || linkErr1 === void 0 ? void 0 : linkErr1.message}), intentando fallback web.app...`);
            try {
                const fallbackSettings = {
                    url: "https://bluesystem-7c9af.web.app",
                    handleCodeInApp: false,
                };
                resetLink = await admin.auth().generatePasswordResetLink(cleanEmail, fallbackSettings);
            }
            catch (linkErr2) {
                logger_1.Logger.warn(`[AUTH_PASSWORD_RESET] Fallback web.app falló (${linkErr2 === null || linkErr2 === void 0 ? void 0 : linkErr2.message}), generando enlace estándar...`);
                resetLink = await admin.auth().generatePasswordResetLink(cleanEmail);
            }
        }
        // Transformar el enlace para que apunte al portal corporativo personalizado en español (admin.bluesystemdelivery.com)
        let corporateResetLink = resetLink;
        try {
            const parsedUrl = new URL(resetLink);
            const oobCode = parsedUrl.searchParams.get("oobCode");
            const apiKey = parsedUrl.searchParams.get("apiKey") || "";
            if (oobCode) {
                corporateResetLink = `https://admin.bluesystemdelivery.com/reset-password.html?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}&apiKey=${encodeURIComponent(apiKey)}`;
            }
        }
        catch (urlParseErr) {
            logger_1.Logger.warn(`[AUTH_PASSWORD_RESET] Aviso al formatear URL corporativa:`, urlParseErr === null || urlParseErr === void 0 ? void 0 : urlParseErr.message);
            corporateResetLink = resetLink;
        }
        const eventId = (data === null || data === void 0 ? void 0 : data.clientRequestId)
            ? `pwd_reset_${uid}_${data.clientRequestId.trim().replace(/[^a-zA-Z0-9_-]/g, "")}`
            : `pwd_reset_${uid}_${Date.now()}`;
        const emailResult = await emailService_1.EmailService.sendTransactionalEmail({
            eventId,
            eventType: "USER_PASSWORD_RESET",
            recipient: cleanEmail,
            recipientUid: uid,
            templateId: "user_password_reset",
            tenantId: tenantId || "ten_bluesystem_core",
            entityType: "USER",
            entityId: uid,
            variables: {
                email: cleanEmail,
                contactName: contactName.trim(),
                resetLink: corporateResetLink,
                reasonNote: "",
            },
        });
        if (!emailResult.success && emailResult.status === "FAILED") {
            logger_1.Logger.error(`[AUTH_PASSWORD_RESET] 🔴 Fallo en despacho de correo: ${emailResult.error} [${emailResult.errorCategory}]`);
            throw new functions.https.HttpsError("internal", "No fue posible procesar la solicitud en este momento. Inténtalo nuevamente más tarde.");
        }
        logger_1.Logger.info(`[AUTH_PASSWORD_RESET] 🟢 Correo corporativo de recuperación despachado para uid=${uid}, status=${emailResult.status}`);
        return genericSuccessResponse;
    }
    catch (error) {
        logger_1.Logger.error(`[AUTH_PASSWORD_RESET] 🔴 Error procesando recuperación para correo:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "No fue posible procesar la solicitud en este momento. Inténtalo nuevamente más tarde.");
    }
});
//# sourceMappingURL=authVerification.js.map