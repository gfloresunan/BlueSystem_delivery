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
exports.reconcileMerchantIdentity = exports.deprovisionTenant = exports.adminDisableNotificationForUser = exports.adminDeleteCampaign = exports.sendFcmDiagnostic = exports.diagnoseFcmSystem = exports.adminUpdateUser = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../triggers/auth");
const logger_1 = require("../shared/logger/logger");
const validator_1 = require("../shared/middleware/validator");
const emailService_1 = require("../services/emailService");
const AuthorizationService_1 = require("../shared/authorization/AuthorizationService");
const db = admin.firestore();
/**
 * Determina explícitamente el tipo de almacenamiento de la identidad (AUTH_BACKED vs FIRESTORE_ONLY)
 */
async function resolveIdentityStorageType(uid) {
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    const firestoreRecordExists = userDoc.exists;
    let authRecordExists = false;
    try {
        const authUser = await admin.auth().getUser(uid);
        if (authUser && authUser.uid) {
            authRecordExists = true;
        }
    }
    catch (err) {
        authRecordExists = false;
    }
    if (!firestoreRecordExists && !authRecordExists) {
        return { identityType: "NOT_FOUND", authRecordExists: false, firestoreRecordExists: false };
    }
    if (authRecordExists) {
        return {
            identityType: "AUTH_BACKED",
            authRecordExists: true,
            firestoreRecordExists,
            userData: userDoc.exists ? userDoc.data() : null
        };
    }
    return {
        identityType: "FIRESTORE_ONLY",
        authRecordExists: false,
        firestoreRecordExists,
        userData: userDoc.exists ? userDoc.data() : null
    };
}
/**
 * 4. CALLABLE: adminUpdateUser
 * Modifica roles, estado activo o elimina usuarios del sistema con sincronización EIAM
 * P1 Hardened: Validación estricta de jerarquía L10->L0 y protección del Último SuperAdmin.
 */
exports.adminUpdateUser = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
        requiredFields: ["action", "targetUid"],
    }, "adminUpdateUser");
    const { action, targetUid, email, role, isActive, nombre, telefono, reason } = data;
    const callerRole = ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.role) || "admin";
    const targetUserDoc = await db.collection("users").doc(targetUid).get();
    const targetEmail = targetUserDoc.exists ? (_c = targetUserDoc.data()) === null || _c === void 0 ? void 0 : _c.email : (email || "unknown");
    const targetCurrentRole = targetUserDoc.exists
        ? (((_d = targetUserDoc.data()) === null || _d === void 0 ? void 0 : _d.role) || ((_e = targetUserDoc.data()) === null || _e === void 0 ? void 0 : _e.rol) || ((_f = targetUserDoc.data()) === null || _f === void 0 ? void 0 : _f.eiamRole) || "customer")
        : "customer";
    try {
        switch (action) {
            case "setRole": {
                if (!role) {
                    throw new functions.https.HttpsError("invalid-argument", "El campo 'role' es requerido para la acción 'setRole'.");
                }
                // P1 & Hierarchy Safeguard: Validar que el llamador tenga nivel suficiente
                try {
                    AuthorizationService_1.AuthorizationService.validateRoleMutationHierarchy(callerRole, callerUid, targetUid, role, targetCurrentRole);
                }
                catch (hierarchyErr) {
                    throw new functions.https.HttpsError("permission-denied", hierarchyErr.message);
                }
                // Safeguard: Proteger último SuperAdmin si se está cambiando de rol a un SuperAdmin
                try {
                    await AuthorizationService_1.AuthorizationService.assertNotLastSuperAdmin(targetUid);
                }
                catch (lastAdminErr) {
                    throw new functions.https.HttpsError("failed-precondition", lastAdminErr.message);
                }
                const oldRole = targetCurrentRole;
                await db.collection("users").doc(targetUid).update({
                    role: role,
                    rol: role,
                    eiamRole: role,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                const userData = targetUserDoc.exists ? targetUserDoc.data() : {};
                const existingClaims = (await admin.auth().getUser(targetUid).catch(() => ({ customClaims: {} }))).customClaims || {};
                const eiamRole = (0, auth_1.resolveEiamRole)({ eiamRole: role, role });
                const updatedClaims = Object.assign(Object.assign({}, existingClaims), { role: eiamRole, businessId: (_j = (_h = (_g = userData === null || userData === void 0 ? void 0 : userData.businessId) !== null && _g !== void 0 ? _g : userData === null || userData === void 0 ? void 0 : userData.eiamBusinessId) !== null && _h !== void 0 ? _h : existingClaims.businessId) !== null && _j !== void 0 ? _j : null, branchId: (_l = (_k = userData === null || userData === void 0 ? void 0 : userData.branchId) !== null && _k !== void 0 ? _k : existingClaims.branchId) !== null && _l !== void 0 ? _l : null, orgId: (_p = (_o = (_m = userData === null || userData === void 0 ? void 0 : userData.orgId) !== null && _m !== void 0 ? _m : userData === null || userData === void 0 ? void 0 : userData.organizationId) !== null && _o !== void 0 ? _o : existingClaims.orgId) !== null && _p !== void 0 ? _p : null, tenantId: (_r = (_q = userData === null || userData === void 0 ? void 0 : userData.tenantId) !== null && _q !== void 0 ? _q : existingClaims.tenantId) !== null && _r !== void 0 ? _r : null });
                try {
                    await admin.auth().setCustomUserClaims(targetUid, updatedClaims);
                }
                catch (claimsErr) {
                    logger_1.Logger.warn(`No se pudieron actualizar Custom Claims para ${targetUid} (quizás no existe en Auth): ${(claimsErr === null || claimsErr === void 0 ? void 0 : claimsErr.message) || String(claimsErr)}`);
                }
                logger_1.Logger.audit("CAMBIAR_ROL", callerUid, { targetUid, targetEmail, oldRole, newRole: role }, { module: "adminUpdateUser", userId: callerUid });
                return { success: true, message: `Rol cambiado con éxito a: ${role}` };
            }
            case "setBlockStatus": {
                // Hierarchy & Safeguard check on blocking
                if (!isActive) {
                    try {
                        AuthorizationService_1.AuthorizationService.validateRoleMutationHierarchy(callerRole, callerUid, targetUid, targetCurrentRole, targetCurrentRole);
                        await AuthorizationService_1.AuthorizationService.assertNotLastSuperAdmin(targetUid);
                    }
                    catch (guardErr) {
                        throw new functions.https.HttpsError("permission-denied", guardErr.message);
                    }
                }
                const oldStatus = targetUserDoc.exists ? (((_s = targetUserDoc.data()) === null || _s === void 0 ? void 0 : _s.isActive) !== false) : true;
                try {
                    await admin.auth().updateUser(targetUid, { disabled: !isActive });
                }
                catch (authBlockErr) {
                    logger_1.Logger.warn(`No se pudo actualizar status en Auth para ${targetUid}: ${(authBlockErr === null || authBlockErr === void 0 ? void 0 : authBlockErr.message) || String(authBlockErr)}`);
                }
                await db.collection("users").doc(targetUid).update({
                    isActive: isActive,
                    active: isActive,
                    status: isActive ? "ACTIVE" : "BLOCKED",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                logger_1.Logger.audit(isActive ? "DESBLOQUEAR_USUARIO" : "BLOQUEAR_USUARIO", callerUid, { targetUid, targetEmail, oldStatus, newStatus: isActive }, { module: "adminUpdateUser", userId: callerUid });
                return { success: true, message: isActive ? "Usuario desbloqueado" : "Usuario bloqueado" };
            }
            case "deleteUser": {
                // Hierarchy & Safeguard check on delete
                try {
                    AuthorizationService_1.AuthorizationService.validateRoleMutationHierarchy(callerRole, callerUid, targetUid, targetCurrentRole, targetCurrentRole);
                    await AuthorizationService_1.AuthorizationService.assertNotLastSuperAdmin(targetUid);
                }
                catch (guardErr) {
                    throw new functions.https.HttpsError("permission-denied", guardErr.message);
                }
                // 1. Detección explícita de tipo de almacenamiento
                const storageInfo = await resolveIdentityStorageType(targetUid);
                if (storageInfo.identityType === "NOT_FOUND") {
                    logger_1.Logger.info(`[HARD_DELETE] La identidad ${targetUid} ya no existe en el sistema.`, { targetUid });
                    return {
                        success: true,
                        idempotent: true,
                        result: "USER_ALREADY_DELETED",
                        message: "La identidad ya fue eliminada del sistema.",
                        uid: targetUid,
                        identityType: "NONE",
                        authDeleted: false,
                        authDeletion: "NOT_APPLICABLE",
                        firestoreDeleted: false,
                        devicesDeleted: false
                    };
                }
                let authDeleted = false;
                let authDeletion = "NOT_APPLICABLE";
                // 2. Eliminación Auth solo si es AUTH_BACKED
                if (storageInfo.identityType === "AUTH_BACKED") {
                    try {
                        await admin.auth().deleteUser(targetUid);
                        authDeleted = true;
                        authDeletion = "SUCCESS";
                    }
                    catch (authErr) {
                        logger_1.Logger.error(`[HARD_DELETE] Error al eliminar usuario Auth ${targetUid}:`, authErr);
                        throw new functions.https.HttpsError("internal", authErr.message || "Error al eliminar usuario de Firebase Auth.");
                    }
                }
                // 3. Eliminación física del documento /users/{targetUid} en Firestore
                const userRef = db.collection("users").doc(targetUid);
                const userDoc = await userRef.get();
                let firestoreDeleted = false;
                if (userDoc.exists) {
                    await userRef.delete();
                    firestoreDeleted = true;
                }
                // 4. Limpieza completa de dispositivos en /user_devices
                let devicesDeletedCount = 0;
                try {
                    const directDevDoc = db.collection("user_devices").doc(targetUid);
                    const directDevSnap = await directDevDoc.get();
                    if (directDevSnap.exists) {
                        await directDevDoc.delete();
                        devicesDeletedCount++;
                    }
                    const qSnap1 = await db.collection("user_devices").where("uid", "==", targetUid).get().catch(() => null);
                    if (qSnap1 && !qSnap1.empty) {
                        const batch1 = db.batch();
                        qSnap1.forEach(doc => {
                            if (doc.id !== targetUid) {
                                batch1.delete(doc.ref);
                                devicesDeletedCount++;
                            }
                        });
                        await batch1.commit();
                    }
                    const qSnap2 = await db.collection("user_devices").where("userId", "==", targetUid).get().catch(() => null);
                    if (qSnap2 && !qSnap2.empty) {
                        const batch2 = db.batch();
                        qSnap2.forEach(doc => {
                            batch2.delete(doc.ref);
                            devicesDeletedCount++;
                        });
                        await batch2.commit();
                    }
                }
                catch (devErr) {
                    logger_1.Logger.warn(`[HARD_DELETE] Aviso al limpiar dispositivos para ${targetUid}: ${devErr.message}`);
                }
                const devicesDeleted = devicesDeletedCount > 0;
                const targetUserData = storageInfo.userData || {};
                const origin = targetUserData.identityOrigin || targetUserData.originClassification || targetUserData.createdVia || "UNKNOWN";
                const createdViaVal = targetUserData.createdVia || origin;
                // 5. Registro de auditoría con tipo explícito
                await db.collection("audit_events").add({
                    event: "IDENTITY_HARD_DELETE",
                    action: "HARD_DELETE_IDENTITY",
                    domain: "GOVERNANCE",
                    targetUid,
                    targetEmail: targetEmail || targetUserData.email || "N/A",
                    actorUid: callerUid,
                    actorRole: ((_u = (_t = context.auth) === null || _t === void 0 ? void 0 : _t.token) === null || _u === void 0 ? void 0 : _u.role) || "admin",
                    identityType: storageInfo.identityType,
                    identityOrigin: origin,
                    createdVia: createdViaVal,
                    authDeleted,
                    authDeletion,
                    firestoreDeleted,
                    devicesDeleted,
                    devicesDeletedCount,
                    historicalDataPreserved: true,
                    operation: "IDENTITY_HARD_DELETE",
                    result: storageInfo.identityType === "AUTH_BACKED" ? "AUTH_BACKED_HARD_DELETE_SUCCESS" : "FIRESTORE_ONLY_HARD_DELETE_SUCCESS",
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                }).catch(() => null);
                logger_1.Logger.audit("ELIMINAR_USUARIO", callerUid, {
                    targetUid,
                    targetEmail,
                    identityType: storageInfo.identityType,
                    authDeleted,
                    authDeletion,
                    firestoreDeleted,
                    devicesDeleted,
                    devicesDeletedCount,
                    deletedAt: Date.now()
                }, { module: "adminUpdateUser", userId: callerUid });
                return {
                    success: true,
                    message: storageInfo.identityType === "AUTH_BACKED"
                        ? "Identidad AUTH_BACKED eliminada permanentemente de Auth y Firestore."
                        : "Identidad FIRESTORE_ONLY eliminada permanentemente de Firestore.",
                    uid: targetUid,
                    identityType: storageInfo.identityType,
                    authDeleted,
                    authDeletion,
                    firestoreDeleted,
                    devicesDeleted,
                    devicesDeletedCount,
                    result: storageInfo.identityType === "AUTH_BACKED" ? "AUTH_BACKED_HARD_DELETE_SUCCESS" : "FIRESTORE_ONLY_HARD_DELETE_SUCCESS"
                };
            }
            // ─── EIAM-ADMIN NEW ACTIONS ─────────────────────────────────────────────
            case "resetPasswordLink": {
                const correlationId = `pwd_reset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                logger_1.Logger.info(`[EIAM_PASSWORD_RESET] REQUEST_START correlationId=${correlationId}`, {
                    targetUid,
                    callerUid,
                    correlationId,
                });
                // 1. Validar existencia del usuario objetivo en Firestore
                const userDocRef = db.collection("users").doc(targetUid);
                const userDocSnap = await userDocRef.get();
                if (!userDocSnap.exists) {
                    logger_1.Logger.warn(`[EIAM_PASSWORD_RESET] AUTH_LOOKUP_FAILED: Usuario ${targetUid} no existe en Firestore`, {
                        targetUid,
                        correlationId,
                    });
                    throw new functions.https.HttpsError("not-found", `El usuario ${targetUid} no existe en el sistema.`);
                }
                const targetData = userDocSnap.data() || {};
                const emailForReset = (targetData.email || email || "").trim();
                const targetName = targetData.nombre || targetData.name || "Usuario";
                const targetTenant = targetData.tenantId || "ten_bluesystem_core";
                const targetBusinessId = targetData.businessId || null;
                const targetBranchId = targetData.branchId || null;
                const targetRole = targetData.eiamRole || targetData.role || targetData.rol || "CUSTOMER";
                if (!emailForReset || !emailForReset.includes("@")) {
                    throw new functions.https.HttpsError("invalid-argument", "El usuario no tiene una dirección de correo electrónico válida configurada.");
                }
                logger_1.Logger.info(`[EIAM_PASSWORD_RESET] TARGET_RESOLVED`, {
                    targetUid,
                    targetEmail: emailForReset,
                    targetTenant,
                    correlationId,
                });
                // 2. Validación de Aislamiento Multi-Tenant y RBAC EIAM
                const callerClaims = ((_v = context.auth) === null || _v === void 0 ? void 0 : _v.token) || {};
                const callerRole = (callerClaims.role || callerClaims.eiamRole || "ADMIN").toUpperCase();
                const callerTenant = callerClaims.tenantId;
                // Si el caller no es SUPER_ADMIN global y tiene tenantId, validar que coincida con el target
                if (callerRole !== "SUPER_ADMIN" && callerTenant && callerTenant !== targetTenant) {
                    logger_1.Logger.error(`[EIAM_PASSWORD_RESET] TENANT_VALIDATION_FAILED: Caller tenant ${callerTenant} != Target tenant ${targetTenant}`, null, {
                        callerUid,
                        callerTenant,
                        targetUid,
                        targetTenant,
                        correlationId,
                    });
                    throw new functions.https.HttpsError("permission-denied", "[EIAM_SECURITY_VIOLATION] No está autorizado para gestionar usuarios de otro tenant.");
                }
                // Si el target es SUPER_ADMIN y el caller no lo es, denegar
                if (targetRole.toUpperCase() === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
                    logger_1.Logger.error(`[EIAM_PASSWORD_RESET] ROLE_VALIDATION_FAILED: Caller ${callerRole} cannot reset SUPER_ADMIN`, null, {
                        callerUid,
                        targetUid,
                        correlationId,
                    });
                    throw new functions.https.HttpsError("permission-denied", "[EIAM_SECURITY_VIOLATION] No está autorizado para restablecer credenciales de un Administrador Global.");
                }
                logger_1.Logger.info(`[EIAM_PASSWORD_RESET] AUTH_VALIDATED & TENANT_VALIDATED & ROLE_VALIDATED`, { targetUid, correlationId });
                // 3. Resolución y Aseguramiento de Identidad en Firebase Auth (Backing de identidades FIRESTORE_ONLY)
                let authUserRecord = null;
                try {
                    authUserRecord = await admin.auth().getUser(targetUid);
                }
                catch (authErr) {
                    if (authErr.code === "auth/user-not-found") {
                        try {
                            const userByEmail = await admin.auth().getUserByEmail(emailForReset);
                            if (userByEmail && userByEmail.uid !== targetUid) {
                                logger_1.Logger.error(`[EIAM_PASSWORD_RESET] CONFLICT: Auth user con email ${emailForReset} tiene UID diferente: ${userByEmail.uid} != ${targetUid}`);
                                throw new functions.https.HttpsError("already-exists", `El correo ${emailForReset} ya está vinculado a otra cuenta en Authentication.`);
                            }
                            authUserRecord = userByEmail;
                        }
                        catch (byEmailErr) {
                            if (byEmailErr.code === "auth/user-not-found") {
                                // Crear el AuthRecord con el UID canónico EXACTO de Firestore
                                logger_1.Logger.info(`[EIAM_PASSWORD_RESET] Respaldo de identidad en Auth para UID canónico: ${targetUid}`);
                                authUserRecord = await admin.auth().createUser({
                                    uid: targetUid,
                                    email: emailForReset,
                                    displayName: targetName,
                                    disabled: targetData.isActive === false || targetData.active === false,
                                });
                                // Asignar inmediatamente sus Custom Claims canónicos
                                const eiamRole = (0, auth_1.resolveEiamRole)({ eiamRole: targetRole, role: targetData.role || targetData.rol });
                                await admin.auth().setCustomUserClaims(targetUid, {
                                    role: eiamRole,
                                    eiamRole: targetData.eiamRole || eiamRole,
                                    businessId: targetBusinessId,
                                    branchId: targetBranchId,
                                    orgId: targetData.orgId || targetData.organizationId || null,
                                    tenantId: targetTenant,
                                });
                            }
                            else {
                                throw byEmailErr;
                            }
                        }
                    }
                    else {
                        throw authErr;
                    }
                }
                // 4. Generación de Action Code Link con ActionCodeSettings y fallback robusto
                logger_1.Logger.info(`[EIAM_PASSWORD_RESET] LINK_GENERATION_START`, { targetUid, correlationId });
                let resetLink;
                try {
                    const actionCodeSettings = {
                        url: "https://bluesystemdelivery.com",
                        handleCodeInApp: false,
                    };
                    resetLink = await admin.auth().generatePasswordResetLink(emailForReset, actionCodeSettings);
                    logger_1.Logger.info(`[EIAM_PASSWORD_RESET] LINK_GENERATION_SUCCESS`, { targetUid, correlationId });
                }
                catch (linkErr1) {
                    logger_1.Logger.warn(`[EIAM_PASSWORD_RESET] Aviso con ActionCodeSettings principal (${linkErr1 === null || linkErr1 === void 0 ? void 0 : linkErr1.message}), intentando fallback web.app...`);
                    try {
                        const fallbackSettings = {
                            url: "https://bluesystem-7c9af.web.app",
                            handleCodeInApp: false,
                        };
                        resetLink = await admin.auth().generatePasswordResetLink(emailForReset, fallbackSettings);
                    }
                    catch (linkErr2) {
                        logger_1.Logger.warn(`[EIAM_PASSWORD_RESET] Fallback web.app falló (${linkErr2 === null || linkErr2 === void 0 ? void 0 : linkErr2.message}), generando enlace estándar...`);
                        resetLink = await admin.auth().generatePasswordResetLink(emailForReset);
                    }
                }
                // Transformar el enlace para que apunte al portal corporativo oficial en español (https://bluesystemdelivery.com/reset-password.html)
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
                    logger_1.Logger.warn(`[EIAM_PASSWORD_RESET] Aviso al formatear URL corporativa:`, urlParseErr === null || urlParseErr === void 0 ? void 0 : urlParseErr.message);
                    corporateResetLink = resetLink;
                }
                // 5. Envío del Correo Transaccional via EmailService
                logger_1.Logger.info(`[EIAM_PASSWORD_RESET] EMAIL_SEND_START`, { targetUid, emailForReset, correlationId });
                let emailResult = { success: false, status: "SKIPPED" };
                try {
                    emailResult = await emailService_1.EmailService.sendPasswordResetEmail({
                        uid: targetUid,
                        email: emailForReset,
                        contactName: targetName,
                        resetLink: corporateResetLink,
                        reason: reason || "Restablecimiento administrativo de contraseña",
                    });
                    logger_1.Logger.info(`[EIAM_PASSWORD_RESET] EMAIL_SEND_SUCCESS`, { targetUid, emailResult, correlationId });
                }
                catch (emailErr) {
                    logger_1.Logger.warn(`[EIAM_PASSWORD_RESET] EMAIL_SEND_FAILED: ${emailErr.message}`, { targetUid, correlationId });
                }
                // 6. Registro de Auditoría Canónico (Zero Credential Exposure)
                await db.collection("audit_events").add({
                    action: "USER_PASSWORD_RESET",
                    event: "PASSWORD_RESET_REQUESTED",
                    domain: "IDENTITY_ADMIN",
                    actorUid: callerUid,
                    actorRole: callerRole,
                    targetUid,
                    targetEmail: emailForReset,
                    tenantId: targetTenant,
                    businessId: targetBusinessId,
                    branchId: targetBranchId,
                    method: "RESET_LINK",
                    emailStatus: emailResult.status || "SENT",
                    reason: reason || "Restablecimiento administrativo de contraseña",
                    correlationId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
                logger_1.Logger.audit("USER_PASSWORD_RESET", callerUid, { targetUid, targetEmail: emailForReset, method: "RESET_LINK", correlationId }, { module: "adminUpdateUser", userId: callerUid });
                logger_1.Logger.info(`[EIAM_PASSWORD_RESET] REQUEST_COMPLETE correlationId=${correlationId}`);
                return {
                    success: true,
                    link: corporateResetLink,
                    emailSent: emailResult.success !== false,
                    emailStatus: emailResult.status,
                    correlationId,
                };
            }
            case "revokeSessions": {
                // Revokes all refresh tokens for the user — forces re-login on all devices.
                await admin.auth().revokeRefreshTokens(targetUid);
                // Also clear /sessions collection for this user
                const sessionsSnap = await db
                    .collection("sessions")
                    .where("uid", "==", targetUid)
                    .get()
                    .catch(() => null);
                if (sessionsSnap && !sessionsSnap.empty) {
                    const batch = db.batch();
                    sessionsSnap.forEach((doc) => batch.delete(doc.ref));
                    await batch.commit();
                }
                await db.collection("audit_events").add({
                    action: "USER_SESSIONS_REVOKED",
                    domain: "IDENTITY_ADMIN",
                    actorUid: callerUid,
                    actorRole: ((_x = (_w = context.auth) === null || _w === void 0 ? void 0 : _w.token) === null || _x === void 0 ? void 0 : _x.role) || "admin",
                    targetUid,
                    targetEmail,
                    reason: reason || "Revocación administrativa de sesiones",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
                logger_1.Logger.audit("USER_SESSIONS_REVOKED", callerUid, { targetUid, targetEmail }, { module: "adminUpdateUser", userId: callerUid });
                return { success: true, message: "Sesiones revocadas. El usuario deberá iniciar sesión nuevamente." };
            }
            case "updateProfile": {
                // Updates basic profile fields in Firestore only (no Auth layer changes).
                const oldData = targetUserDoc.exists ? targetUserDoc.data() : {};
                const updatePayload = {
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                if (nombre !== undefined && nombre !== null) {
                    updatePayload.nombre = nombre;
                    updatePayload.name = nombre;
                }
                if (telefono !== undefined && telefono !== null) {
                    updatePayload.telefono = telefono;
                    updatePayload.phone = telefono;
                }
                await db.collection("users").doc(targetUid).update(updatePayload);
                await db.collection("audit_events").add({
                    action: "USER_PROFILE_UPDATED",
                    domain: "IDENTITY_ADMIN",
                    actorUid: callerUid,
                    actorRole: ((_z = (_y = context.auth) === null || _y === void 0 ? void 0 : _y.token) === null || _z === void 0 ? void 0 : _z.role) || "admin",
                    targetUid,
                    targetEmail,
                    before: {
                        nombre: (oldData === null || oldData === void 0 ? void 0 : oldData.nombre) || (oldData === null || oldData === void 0 ? void 0 : oldData.name) || "",
                        telefono: (oldData === null || oldData === void 0 ? void 0 : oldData.telefono) || (oldData === null || oldData === void 0 ? void 0 : oldData.phone) || "",
                    },
                    after: {
                        nombre: (_0 = nombre !== null && nombre !== void 0 ? nombre : oldData === null || oldData === void 0 ? void 0 : oldData.nombre) !== null && _0 !== void 0 ? _0 : "",
                        telefono: (_1 = telefono !== null && telefono !== void 0 ? telefono : oldData === null || oldData === void 0 ? void 0 : oldData.telefono) !== null && _1 !== void 0 ? _1 : "",
                    },
                    reason: reason || "Actualización administrativa de perfil",
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
                logger_1.Logger.audit("USER_PROFILE_UPDATED", callerUid, {
                    targetUid,
                    targetEmail,
                    before: { nombre: oldData === null || oldData === void 0 ? void 0 : oldData.nombre, telefono: oldData === null || oldData === void 0 ? void 0 : oldData.telefono },
                    after: { nombre, telefono },
                }, { module: "adminUpdateUser", userId: callerUid });
                return { success: true, message: "Perfil actualizado correctamente." };
            }
            default:
                throw new functions.https.HttpsError("invalid-argument", "Acción no soportada.");
        }
    }
    catch (e) {
        if (e instanceof functions.https.HttpsError) {
            throw e;
        }
        logger_1.Logger.error("Error en adminUpdateUser execution", e, { module: "adminUpdateUser", userId: callerUid });
        throw new functions.https.HttpsError("internal", e.message || "Error interno.");
    }
});
/**
 * 5. CALLABLE: diagnoseFcmSystem
 * Diagnóstico del sistema FCM y métricas de dispositivos
 */
exports.diagnoseFcmSystem = functions.https.onCall(async (data, context) => {
    (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["admin", "super_admin", "supervisor", "ADMIN", "SUPER_ADMIN"],
    }, "diagnoseFcmSystem");
    try {
        const startTime = Date.now();
        // 1. Métricas de Usuarios
        const usersSnap = await db.collection("users").get();
        const totalUsers = usersSnap.size;
        let activeUsers = 0;
        let blockedUsers = 0;
        const rolesCount = { customer: 0, courier: 0, business: 0, admin: 0, unknown: 0 };
        const userUidSet = new Set();
        usersSnap.forEach((doc) => {
            const d = doc.data();
            userUidSet.add(doc.id);
            if (d.isActive !== false && d.active !== false) {
                activeUsers++;
            }
            else {
                blockedUsers++;
            }
            const r = (d.role || d.rol || "customer").toLowerCase();
            if (r.includes("customer") || r.includes("cliente"))
                rolesCount.customer++;
            else if (r.includes("courier") || r.includes("driver") || r.includes("motorizado"))
                rolesCount.courier++;
            else if (r.includes("business") || r.includes("comercio"))
                rolesCount.business++;
            else if (r.includes("admin"))
                rolesCount.admin++;
            else
                rolesCount.unknown++;
        });
        // 2. Métricas de Dispositivos y Tokens FCM
        const devicesSnap = await db.collection("user_devices").get();
        const totalDevices = devicesSnap.size;
        let validTokensCount = 0;
        let emptyTokensCount = 0;
        let androidCount = 0;
        let iosCount = 0;
        const deviceUidSet = new Set();
        const tokenSet = new Set();
        let duplicateTokensCount = 0;
        devicesSnap.forEach((doc) => {
            const d = doc.data();
            const uid = doc.id || d.uid;
            if (uid)
                deviceUidSet.add(uid);
            const token = d.fcmToken ? d.fcmToken.trim() : "";
            if (token && token.length > 20 && d.isActive !== false) {
                validTokensCount++;
                if (tokenSet.has(token)) {
                    duplicateTokensCount++;
                }
                else {
                    tokenSet.add(token);
                }
            }
            else {
                emptyTokensCount++;
            }
            const platform = (d.platform || "Android").toLowerCase();
            if (platform.includes("ios"))
                iosCount++;
            else
                androidCount++;
        });
        let usersWithoutDevice = 0;
        userUidSet.forEach((uid) => {
            if (!deviceUidSet.has(uid))
                usersWithoutDevice++;
        });
        let orphanedDevices = 0;
        deviceUidSet.forEach((uid) => {
            if (!userUidSet.has(uid))
                orphanedDevices++;
        });
        // 3. Métricas de Campañas en Cola (`notification_campaigns`)
        const campaignsSnap = await db.collection("notification_campaigns").limit(500).get();
        const queueCounts = {
            QUEUED: 0,
            PROCESSING: 0,
            RETRY: 0,
            FAILED: 0,
            SENT: 0,
            SCHEDULED: 0,
            DRAFT: 0,
        };
        campaignsSnap.forEach((doc) => {
            const st = (doc.data().status || "QUEUED").toUpperCase();
            if (queueCounts[st] !== undefined) {
                queueCounts[st]++;
            }
        });
        // 4. Métricas de Entregas FCM Persistentes (`campaign_deliveries`)
        const deliveriesSnap = await db.collection("campaign_deliveries").limit(500).get();
        const deliveryCounts = {
            PENDING: 0,
            SENDING: 0,
            FCM_ACCEPTED: 0,
            FAILED_RETRYABLE: 0,
            FAILED_PERMANENT: 0,
        };
        deliveriesSnap.forEach((doc) => {
            const st = (doc.data().status || "PENDING").toUpperCase();
            if (deliveryCounts[st] !== undefined) {
                deliveryCounts[st]++;
            }
        });
        // 5. Última Actividad de Campaña
        const lastCampaignSnap = await db
            .collection("notification_campaigns")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        let lastCampaignData = null;
        let lastFcmMessageId = null;
        if (!lastCampaignSnap.empty) {
            const lastDoc = lastCampaignSnap.docs[0];
            const data = lastDoc.data();
            lastCampaignData = {
                campaignId: lastDoc.id,
                title: data.title || "Sin título",
                status: data.status || "DESCONOCIDO",
                createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
                processingStartedAt: data.processingStartedAt ? data.processingStartedAt.toDate().toISOString() : null,
                successCount: data.successCount || 0,
                failureCount: data.failureCount || 0,
            };
            // Buscar último fcmMessageId en campaign_deliveries para esta campaña
            const lastDeliverySnap = await db
                .collection("campaign_deliveries")
                .where("campaignId", "==", lastDoc.id)
                .where("status", "==", "FCM_ACCEPTED")
                .limit(1)
                .get();
            if (!lastDeliverySnap.empty) {
                lastFcmMessageId = lastDeliverySnap.docs[0].data().fcmMessageId || null;
            }
        }
        const executionTimeMs = Date.now() - startTime;
        logger_1.Logger.info(`Diagnóstico FCM completado en ${executionTimeMs}ms`, {
            module: "diagnoseFcmSystem",
            duration: executionTimeMs,
        });
        return {
            success: true,
            timestamp: new Date().toISOString(),
            executionTimeMs,
            appCheckStatus: "ACTIVE",
            authStatus: "ACTIVE",
            cloudFunctionsStatus: "ACTIVE",
            queueWorkerStatus: "ACTIVE",
            firestoreStatus: "OK",
            firebaseMessagingStatus: "OK",
            users: {
                total: totalUsers,
                active: activeUsers,
                blocked: blockedUsers,
                roles: rolesCount,
            },
            devices: {
                total: totalDevices,
                validTokens: validTokensCount,
                emptyOrInvalidTokens: emptyTokensCount,
                duplicateTokens: duplicateTokensCount,
                android: androidCount,
                ios: iosCount,
                usersWithoutDevice,
                orphanedDevices,
            },
            campaigns: {
                QUEUED: queueCounts.QUEUED,
                PROCESSING: queueCounts.PROCESSING,
                RETRY: queueCounts.RETRY,
                FAILED: queueCounts.FAILED,
                SENT: queueCounts.SENT,
                SCHEDULED: queueCounts.SCHEDULED,
                DRAFT: queueCounts.DRAFT,
                total: campaignsSnap.size,
            },
            deliveries: {
                PENDING: deliveryCounts.PENDING,
                SENDING: deliveryCounts.SENDING,
                FCM_ACCEPTED: deliveryCounts.FCM_ACCEPTED,
                FAILED_RETRYABLE: deliveryCounts.FAILED_RETRYABLE,
                FAILED_PERMANENT: deliveryCounts.FAILED_PERMANENT,
                total: deliveriesSnap.size,
            },
            lastActivity: {
                campaignId: (lastCampaignData === null || lastCampaignData === void 0 ? void 0 : lastCampaignData.campaignId) || null,
                title: (lastCampaignData === null || lastCampaignData === void 0 ? void 0 : lastCampaignData.title) || null,
                status: (lastCampaignData === null || lastCampaignData === void 0 ? void 0 : lastCampaignData.status) || null,
                processingStartedAt: (lastCampaignData === null || lastCampaignData === void 0 ? void 0 : lastCampaignData.processingStartedAt) || null,
                successCount: (lastCampaignData === null || lastCampaignData === void 0 ? void 0 : lastCampaignData.successCount) || 0,
                failureCount: (lastCampaignData === null || lastCampaignData === void 0 ? void 0 : lastCampaignData.failureCount) || 0,
                lastFcmMessageId,
            },
        };
    }
    catch (e) {
        logger_1.Logger.error("Error en diagnoseFcmSystem", e, { module: "diagnoseFcmSystem" });
        throw new functions.https.HttpsError("internal", e.message || "Error interno.");
    }
});
/**
 * 5.1 CALLABLE: sendFcmDiagnostic
 * Ejecuta un Smoke Test FCM controlado hacia UN usuario y dispositivo específico.
 */
exports.sendFcmDiagnostic = functions.https.onCall(async (data, context) => {
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["admin", "super_admin", "supervisor", "ADMIN", "SUPER_ADMIN"],
        requiredFields: ["targetUid", "deviceId"],
    }, "sendFcmDiagnostic");
    const targetUid = (data.targetUid || "").toString().trim();
    const deviceId = (data.deviceId || "").toString().trim();
    if (!targetUid || !deviceId || data.targetType === "all") {
        throw new functions.https.HttpsError("invalid-argument", "El diagnóstico FCM requiere especificar un targetUid y deviceId únicos de prueba. Prohibido targetType=all.");
    }
    try {
        const startTime = Date.now();
        // 1. Obtener dispositivo objetivo de user_devices
        const deviceDocId = `${targetUid}_${deviceId}`;
        let deviceDoc = await db.collection("user_devices").doc(deviceDocId).get();
        if (!deviceDoc.exists) {
            // Búsqueda alternativa por uid y deviceId
            const searchSnap = await db
                .collection("user_devices")
                .where("uid", "==", targetUid)
                .where("deviceId", "==", deviceId)
                .limit(1)
                .get();
            if (!searchSnap.empty) {
                deviceDoc = searchSnap.docs[0];
            }
        }
        if (!deviceDoc.exists) {
            throw new functions.https.HttpsError("not-found", `Dispositivo de prueba no encontrado para UID: ${targetUid}, DeviceID: ${deviceId}`);
        }
        const devData = deviceDoc.data();
        const fcmToken = devData.fcmToken ? devData.fcmToken.trim() : "";
        if (!fcmToken || fcmToken.length < 20 || devData.isActive === false) {
            throw new functions.https.HttpsError("failed-precondition", `El dispositivo ${deviceId} no posee un token FCM activo válido.`);
        }
        // 2. Construir payload Data-Only de diagnóstico
        const testId = `diag_${Date.now()}`;
        const campaignId = `camp_diag_${Date.now()}`;
        const timestampStr = String(Date.now());
        const dataMap = {
            type: "FCM_DIAGNOSTIC",
            action: "FCM_DIAGNOSTIC",
            title: "BlueSystem FCM Diagnostic",
            body: "Prueba controlada de FCM",
            testId,
            timestamp: timestampStr,
            campaignId,
        };
        const messaging = admin.messaging();
        const fcmPayload = {
            tokens: [fcmToken],
            notification: {
                title: "BlueSystem FCM Diagnostic",
                body: "Prueba controlada de FCM",
            },
            data: dataMap,
            android: {
                priority: "high",
                directBootOk: true,
            },
        };
        // 3. Registrar estado SENDING en campaign_deliveries
        const deliveryKey = `${campaignId}_${targetUid}_${deviceId}`;
        const deliveryRef = db.collection("campaign_deliveries").doc(deliveryKey);
        await deliveryRef.set({
            campaignId,
            uid: targetUid,
            deviceId,
            status: "SENDING",
            attempts: 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // 4. Enviar FCM Multicast
        const fcmResponse = await messaging.sendEachForMulticast(fcmPayload);
        const resp = fcmResponse.responses[0];
        let fcmStatus = "FAILED_RETRYABLE";
        let fcmMessageId = null;
        let errorMessage = null;
        if (resp.success && resp.messageId) {
            fcmStatus = "FCM_ACCEPTED";
            fcmMessageId = resp.messageId;
            await deliveryRef.update({
                status: "FCM_ACCEPTED",
                fcmMessageId: resp.messageId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        else {
            errorMessage = resp.error ? resp.error.message : "Error desconocido en FCM API";
            fcmStatus = "FAILED_PERMANENT";
            await deliveryRef.update({
                status: "FAILED_PERMANENT",
                lastError: errorMessage,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        const executionTimeMs = Date.now() - startTime;
        logger_1.Logger.info(`Smoke test FCM completado para ${targetUid}_${deviceId}`, {
            module: "sendFcmDiagnostic",
            userId: callerUid,
            targetUid,
            deviceId,
            fcmStatus,
            duration: executionTimeMs,
        });
        return {
            success: resp.success,
            targetUid,
            deviceId,
            fcmTokenStatus: "VALID",
            fcmStatus,
            fcmMessageId,
            deliveryKey,
            errorMessage,
            executionTimeMs,
            note: "FCM_ACCEPTED significa aceptado por los servidores de Google FCM / APNs.",
        };
    }
    catch (e) {
        logger_1.Logger.error("Error en sendFcmDiagnostic execution", e, { module: "sendFcmDiagnostic", userId: callerUid });
        throw new functions.https.HttpsError("internal", e.message || "Error ejecutando Smoke Test FCM.");
    }
});
/**
 * 7. CALLABLE: adminDeleteCampaign (Fase 4.2 Lifecycle)
 * Marca eliminación lógica de una campaña en notification_campaigns manteniendo
 * todas las entregas (campaign_deliveries), métricas y auditoría intactas.
 */
exports.adminDeleteCampaign = functions.https.onCall(async (data, context) => {
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
        requiredFields: ["campaignId"],
    }, "adminDeleteCampaign");
    const campaignId = (data.campaignId || "").toString().trim();
    const campaignRef = db.collection("notification_campaigns").doc(campaignId);
    const docSnap = await campaignRef.get();
    if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", `La campaña ${campaignId} no existe.`);
    }
    // 1. Marcar campaña maestra como DELETED
    await campaignRef.update({
        "visibility.status": "DELETED",
        "visibility.deletedAt": admin.firestore.FieldValue.serverTimestamp(),
        "visibility.deletedBy": callerUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // 2. Localizar y marcar todas las notificaciones materializadas en buzones de usuarios
    const docRefsToUpdate = new Map();
    // Estrategia A: Collection Group Query por campaignId
    try {
        const cgSnap = await db.collectionGroup("notifications").where("campaignId", "==", campaignId).get();
        cgSnap.forEach((doc) => {
            docRefsToUpdate.set(doc.ref.path, doc.ref);
        });
    }
    catch (err) {
        logger_1.Logger.warn("Advertencia en collectionGroup notifications query", { error: err.message, campaignId });
    }
    // Estrategia B: Ledger de entregas campaign_deliveries
    try {
        const deliveriesSnap = await db.collection("campaign_deliveries").where("campaignId", "==", campaignId).get();
        deliveriesSnap.forEach((delivDoc) => {
            const data = delivDoc.data();
            const recipientUid = data.uid || data.userId || data.recipientUid;
            if (recipientUid && !recipientUid.startsWith("guest_") && !recipientUid.startsWith("device_")) {
                const notifRef = db.collection("users").doc(recipientUid).collection("notifications").doc(campaignId);
                docRefsToUpdate.set(notifRef.path, notifRef);
            }
        });
    }
    catch (err) {
        logger_1.Logger.warn("Advertencia en lookup de campaign_deliveries", { error: err.message, campaignId });
    }
    // 3. Actualizar buzones de clientes en lotes atómicos (máximo 500 ops por batch)
    const refsArray = Array.from(docRefsToUpdate.values());
    let userNotificationsUpdated = 0;
    for (let i = 0; i < refsArray.length; i += 500) {
        const chunk = refsArray.slice(i, i + 500);
        const batch = db.batch();
        chunk.forEach((ref) => {
            batch.set(ref, {
                campaignId,
                visibilityStatus: "DELETED",
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                deletedBy: callerUid,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        });
        await batch.commit();
        userNotificationsUpdated += chunk.length;
    }
    // 4. Registro inmutable en audit_events
    await db.collection("audit_events").add({
        event: "NOTIFICATION_DELETED",
        action: "NOTIFICATION_DELETED",
        domain: "NOTIFICATIONS",
        campaignId,
        actorUid: callerUid,
        userNotificationsAffected: userNotificationsUpdated,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => null);
    logger_1.Logger.audit("NOTIFICATION_DELETED", callerUid, { campaignId, userNotificationsUpdated }, { module: "adminDeleteCampaign", userId: callerUid });
    return { success: true, campaignId, visibilityStatus: "DELETED", userNotificationsAffected: userNotificationsUpdated };
});
/**
 * 8. CALLABLE: adminDisableNotificationForUser (Fase 4.2 Lifecycle)
 * Deshabilita una notificación para un usuario específico sin alterar
 * las entregas de otros usuarios ni las analíticas históricas de la campaña.
 */
exports.adminDisableNotificationForUser = functions.https.onCall(async (data, context) => {
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
        requiredFields: ["campaignId", "targetUid"],
    }, "adminDisableNotificationForUser");
    const campaignId = (data.campaignId || "").toString().trim();
    const targetUid = (data.targetUid || "").toString().trim();
    const userNotifRef = db.collection("users").doc(targetUid).collection("notifications").doc(campaignId);
    await userNotifRef.set({
        campaignId,
        visibilityStatus: "DISABLED",
        disabledAt: admin.firestore.FieldValue.serverTimestamp(),
        disabledBy: callerUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await db.collection("audit_events").add({
        event: "NOTIFICATION_DISABLED",
        action: "NOTIFICATION_DISABLED",
        domain: "NOTIFICATIONS",
        campaignId,
        targetUid,
        actorUid: callerUid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => null);
    logger_1.Logger.audit("NOTIFICATION_DISABLED", callerUid, { campaignId, targetUid }, { module: "adminDisableNotificationForUser", userId: callerUid });
    return { success: true, campaignId, targetUid, visibilityStatus: "DISABLED" };
});
/**
 * 6. CALLABLE: deprovisionTenant (Sprint 18.1 Tenant Deprovisioning & Governance Center)
 * Realiza el ciclo de vida seguro de desaprovisionamiento (DEACTIVATE o DELETE/SOFT_DELETE)
 * de un comercio mediante Admin SDK de manera atómica, idempotente y auditable.
 */
exports.deprovisionTenant = functions.https.onCall(async (data, context) => {
    const { uid: callerUid, role: callerRole } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN"],
        requiredFields: ["businessId", "mode"],
    }, "deprovisionTenant");
    const businessId = (data.businessId || "").toString().trim();
    const mode = (data.mode || "").toString().toUpperCase();
    const reason = (data.reason || "Acción administrativa desde Governance Center").toString().trim();
    if (!["DEACTIVATE", "DELETE", "HARD_DELETE"].includes(mode)) {
        throw new functions.https.HttpsError("invalid-argument", "El modo de desaprovisionamiento debe ser 'DEACTIVATE', 'DELETE' o 'HARD_DELETE'.");
    }
    // 1. Buscar referencias del tenant en /businesses y /users
    const businessDocRef = db.collection("businesses").doc(businessId);
    const userDocRef = db.collection("users").doc(businessId);
    const [businessSnap, userSnap] = await Promise.all([
        businessDocRef.get(),
        userDocRef.get(),
    ]);
    if (!businessSnap.exists && !userSnap.exists) {
        // Buscar si existen órdenes o productos vinculados a este businessId
        const [productsCheck, ordersCheck] = await Promise.all([
            db.collection("products").where("businessId", "==", businessId).limit(1).get(),
            db.collection("orders").where("businessId", "==", businessId).limit(1).get(),
        ]);
        if (productsCheck.empty && ordersCheck.empty) {
            throw new functions.https.HttpsError("not-found", `No se encontró el comercio con ID '${businessId}' en la plataforma.`);
        }
    }
    const currentBusinessData = businessSnap.exists ? businessSnap.data() : (userSnap.exists ? userSnap.data() : {});
    const currentLifecycle = (currentBusinessData === null || currentBusinessData === void 0 ? void 0 : currentBusinessData.lifecycleStatus) || "";
    const currentStatus = (currentBusinessData === null || currentBusinessData === void 0 ? void 0 : currentBusinessData.status) || "";
    // 2. Verificar Idempotencia
    if (mode === "DEACTIVATE" && currentLifecycle === "SUSPENDED" && (currentStatus === "DISABLED" || currentStatus === "INACTIVE")) {
        logger_1.Logger.info(`deprovisionTenant idempotente: el comercio ${businessId} ya está deshabilitado.`, { module: "deprovisionTenant", userId: callerUid });
        return {
            success: true,
            idempotent: true,
            businessId,
            mode,
            message: "El comercio ya se encuentra deshabilitado.",
        };
    }
    if (mode === "DELETE" && currentLifecycle === "DEPROVISIONED" && currentStatus === "DELETED") {
        logger_1.Logger.info(`deprovisionTenant idempotente: el comercio ${businessId} ya está deprovisionado.`, { module: "deprovisionTenant", userId: callerUid });
        return {
            success: true,
            idempotent: true,
            businessId,
            mode,
            message: "El comercio ya se encuentra deprovisionado definitivamente.",
        };
    }
    const operationId = `deprov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
    // 3. Auditoría Inicial (STARTED)
    await db.collection("audit_events").add({
        event: mode === "HARD_DELETE" ? "BUSINESS_HARD_DELETE_STARTED" : (mode === "DEACTIVATE" ? "BUSINESS_DEACTIVATION_STARTED" : "BUSINESS_DEPROVISIONMENT_STARTED"),
        domain: "GOVERNANCE",
        businessId,
        businessName: (currentBusinessData === null || currentBusinessData === void 0 ? void 0 : currentBusinessData.name) || (currentBusinessData === null || currentBusinessData === void 0 ? void 0 : currentBusinessData.comercioNombre) || (currentBusinessData === null || currentBusinessData === void 0 ? void 0 : currentBusinessData.nombre) || businessId,
        organizationId: (currentBusinessData === null || currentBusinessData === void 0 ? void 0 : currentBusinessData.orgId) || (currentBusinessData === null || currentBusinessData === void 0 ? void 0 : currentBusinessData.organizationId) || "",
        actorUid: callerUid,
        actorRole: callerRole,
        operationId,
        mode,
        reason,
        timestamp: serverTimestamp,
    });
    try {
        // 4. Cancelación de Pedidos Activos (pending, preparing, created, in_transit)
        const activeOrdersSnap = await db
            .collection("orders")
            .where("businessId", "==", businessId)
            .where("status", "in", ["pending", "preparing", "draft", "created", "accepted", "in_transit"])
            .get();
        const orderCancelPromises = [];
        activeOrdersSnap.forEach((orderDoc) => {
            orderCancelPromises.push(orderDoc.ref.update({
                status: "cancelled",
                estado: "cancelled",
                cancelReason: mode === "HARD_DELETE" ? "TENANT_HARD_DELETED" : (mode === "DEACTIVATE" ? "TENANT_DEACTIVATED" : "TENANT_DEPROVISIONED"),
                cancelledAt: serverTimestamp,
                updatedAt: serverTimestamp,
            }));
        });
        await Promise.all(orderCancelPromises);
        // 5. Actualización de Master Data (/businesses, /users root, /branches, /restaurant_settings, /products, /dashboard_summary)
        const masterUpdates = [];
        if (mode === "HARD_DELETE") {
            if (businessSnap.exists) {
                masterUpdates.push(businessDocRef.delete());
            }
            if (userSnap.exists) {
                const uData = userSnap.data();
                if ((uData === null || uData === void 0 ? void 0 : uData.userType) === "business" || (uData === null || uData === void 0 ? void 0 : uData.role) === "business") {
                    masterUpdates.push(userDocRef.delete());
                }
            }
        }
        else if (mode === "DEACTIVATE") {
            if (businessSnap.exists) {
                masterUpdates.push(businessDocRef.update({
                    status: "DISABLED",
                    lifecycleStatus: "SUSPENDED",
                    active: false,
                    isActive: false,
                    suspensionReason: reason,
                    updatedAt: serverTimestamp,
                }));
            }
            if (userSnap.exists) {
                masterUpdates.push(userDocRef.update({
                    status: "DISABLED",
                    lifecycleStatus: "SUSPENDED",
                    active: false,
                    isActive: false,
                    updatedAt: serverTimestamp,
                }));
            }
        }
        else {
            // mode === "DELETE" (Soft Delete & Deprovision)
            if (businessSnap.exists) {
                masterUpdates.push(businessDocRef.update({
                    status: "DELETED",
                    lifecycleStatus: "DEPROVISIONED",
                    isDeleted: true,
                    active: false,
                    isActive: false,
                    deletedAt: serverTimestamp,
                    updatedAt: serverTimestamp,
                }));
            }
            if (userSnap.exists) {
                masterUpdates.push(userDocRef.update({
                    status: "DELETED",
                    lifecycleStatus: "DEPROVISIONED",
                    isDeleted: true,
                    active: false,
                    isActive: false,
                    deletedAt: serverTimestamp,
                    updatedAt: serverTimestamp,
                }));
            }
        }
        // Actualizar sucursales (/branches)
        const branchesSnap = await db.collection("branches").where("businessId", "==", businessId).get();
        branchesSnap.forEach((bDoc) => {
            if (mode === "HARD_DELETE") {
                masterUpdates.push(bDoc.ref.delete());
            }
            else {
                masterUpdates.push(bDoc.ref.update(mode === "DEACTIVATE"
                    ? { active: false, status: "DISABLED", updatedAt: serverTimestamp }
                    : { isDeleted: true, active: false, status: "DELETED", updatedAt: serverTimestamp }));
            }
        });
        // Actualizar configuración (/restaurant_settings)
        const settingsRef = db.collection("restaurant_settings").doc(businessId);
        const settingsSnap = await settingsRef.get();
        if (settingsSnap.exists) {
            if (mode === "HARD_DELETE") {
                masterUpdates.push(settingsRef.delete());
            }
            else {
                masterUpdates.push(settingsRef.update(mode === "DEACTIVATE"
                    ? { isOpen: false, isOperating: false, status: "DISABLED", updatedAt: serverTimestamp }
                    : { isOpen: false, isOperating: false, status: "DELETED", updatedAt: serverTimestamp }));
            }
        }
        // Actualizar productos (/products)
        const productsSnap = await db.collection("products").where("businessId", "==", businessId).get();
        productsSnap.forEach((pDoc) => {
            if (mode === "HARD_DELETE") {
                masterUpdates.push(pDoc.ref.delete());
            }
            else {
                masterUpdates.push(pDoc.ref.update(mode === "DEACTIVATE"
                    ? { active: false, isAvailable: false, updatedAt: serverTimestamp }
                    : { isDeleted: true, active: false, isAvailable: false, updatedAt: serverTimestamp }));
            }
        });
        // Actualizar dashboard summary (/dashboard_summary)
        const dashSummaryRef = db.collection("dashboard_summary").doc(businessId);
        const dashSummarySnap = await dashSummaryRef.get();
        if (dashSummarySnap.exists) {
            if (mode === "HARD_DELETE") {
                masterUpdates.push(dashSummaryRef.delete());
            }
            else {
                masterUpdates.push(dashSummaryRef.update({ active: false, updatedAt: serverTimestamp }));
            }
        }
        // Actualizar solicitudes (/merchant_applications)
        const appSnap = await db.collection("merchant_applications").where("businessId", "==", businessId).get();
        appSnap.forEach((appDoc) => {
            masterUpdates.push(appDoc.ref.update({
                status: "TERMINATED",
                terminatedAt: serverTimestamp,
                updatedAt: serverTimestamp,
            }));
        });
        await Promise.all(masterUpdates);
        // 6. Identificar y procesar Staff Users (/employees, /membership, /users)
        const [employeesSnap, membershipSnap, usersWithBusinessSnap] = await Promise.all([
            db.collection("employees").where("businessId", "==", businessId).get(),
            db.collection("membership").where("businessId", "==", businessId).get(),
            db.collection("users").where("businessId", "==", businessId).get(),
        ]);
        const staffUidSet = new Set();
        if (userSnap.exists)
            staffUidSet.add(businessId);
        employeesSnap.forEach((doc) => {
            var _a;
            const u = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.uid;
            if (u)
                staffUidSet.add(u);
        });
        membershipSnap.forEach((doc) => {
            var _a;
            const u = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.uid;
            if (u)
                staffUidSet.add(u);
        });
        usersWithBusinessSnap.forEach((doc) => {
            staffUidSet.add(doc.id);
        });
        // Actualizar colecciones de membresía y empleados
        const membershipPromises = [];
        employeesSnap.forEach((empDoc) => {
            membershipPromises.push(empDoc.ref.update({
                status: "TERMINATED",
                isDeleted: true,
                active: false,
                updatedAt: serverTimestamp,
            }));
        });
        membershipSnap.forEach((mDoc) => {
            membershipPromises.push(mDoc.ref.update({
                status: "TERMINATED",
                updatedAt: serverTimestamp,
            }));
        });
        // Expirar invitaciones pendientes
        const pendingInvitesSnap = await db.collection("invitations").where("businessId", "==", businessId).get();
        pendingInvitesSnap.forEach((invDoc) => {
            membershipPromises.push(invDoc.ref.update({
                status: "EXPIRED",
                updatedAt: serverTimestamp,
            }));
        });
        await Promise.all(membershipPromises);
        // 7. Procesar Firebase Auth & Sesiones de Usuarios Staff
        const authAndSessionPromises = [];
        for (const staffUid of staffUidSet) {
            // Verificar si el usuario tiene membresías en OTROS comercios activos antes de deshabilitarlo globalmente
            const otherMembershipsSnap = await db
                .collection("membership")
                .where("uid", "==", staffUid)
                .get();
            let hasOtherActiveMemberships = false;
            otherMembershipsSnap.forEach((mDoc) => {
                const d = mDoc.data();
                if (d.businessId !== businessId && d.status !== "TERMINATED") {
                    hasOtherActiveMemberships = true;
                }
            });
            // Si el usuario es exclusivo del tenant (no tiene otros comercios)
            if (!hasOtherActiveMemberships && staffUid !== callerUid) {
                // Deshabilitar cuenta Auth y revocar tokens
                authAndSessionPromises.push(admin
                    .auth()
                    .updateUser(staffUid, { disabled: true })
                    .then(() => admin.auth().revokeRefreshTokens(staffUid))
                    .catch((e) => logger_1.Logger.warn(`No se pudo deshabilitar Auth user ${staffUid}: ${e.message}`, { module: "deprovisionTenant" })));
                if (mode === "DELETE") {
                    authAndSessionPromises.push(admin
                        .auth()
                        .setCustomUserClaims(staffUid, null)
                        .catch((e) => logger_1.Logger.warn(`No se pudo limpiar claims para ${staffUid}: ${e.message}`, { module: "deprovisionTenant" })));
                }
                // Actualizar /users/{staffUid}
                authAndSessionPromises.push(db
                    .collection("users")
                    .doc(staffUid)
                    .update(mode === "DEACTIVATE"
                    ? { isActive: false, active: false, status: "DISABLED", updatedAt: serverTimestamp }
                    : { isActive: false, active: false, status: "DELETED", isDeleted: true, updatedAt: serverTimestamp })
                    .catch(() => null));
                // Purgar sesiones y dispositivos
                const [sessionsSnap, devicesSnap, userDevicesSnap] = await Promise.all([
                    db.collection("sessions").where("uid", "==", staffUid).get(),
                    db.collection("devices").where("uid", "==", staffUid).get(),
                    db.collection("user_devices").where("uid", "==", staffUid).get(),
                ]);
                sessionsSnap.forEach((sDoc) => authAndSessionPromises.push(sDoc.ref.delete()));
                devicesSnap.forEach((dDoc) => authAndSessionPromises.push(dDoc.ref.update({ isActive: false })));
                userDevicesSnap.forEach((udDoc) => authAndSessionPromises.push(udDoc.ref.update({ isActive: false })));
            }
        }
        await Promise.all(authAndSessionPromises);
        // 8. Auditoría Final (COMPLETE)
        await db.collection("audit_events").add({
            event: mode === "HARD_DELETE" ? "BUSINESS_HARD_DELETE" : (mode === "DEACTIVATE" ? "BUSINESS_DEACTIVATED" : "BUSINESS_DEPROVISIONED"),
            domain: "GOVERNANCE",
            businessId,
            actorUid: callerUid,
            actorRole: callerRole,
            operationId,
            mode,
            reason,
            cancelledOrdersCount: activeOrdersSnap.size,
            affectedStaffCount: staffUidSet.size,
            result: "SUCCESS",
            timestamp: serverTimestamp,
        });
        logger_1.Logger.audit(mode === "HARD_DELETE" ? "BUSINESS_HARD_DELETE" : (mode === "DEACTIVATE" ? "BUSINESS_DEACTIVATED" : "BUSINESS_DEPROVISIONED"), callerUid, { businessId, mode, operationId, cancelledOrders: activeOrdersSnap.size }, { module: "deprovisionTenant", userId: callerUid });
        return {
            success: true,
            idempotent: false,
            businessId,
            mode,
            operationId,
            cancelledOrdersCount: activeOrdersSnap.size,
            affectedStaffCount: staffUidSet.size,
            message: mode === "HARD_DELETE"
                ? "Comercio y sus sucursales operativas fueron eliminados definitivamente de la base de datos."
                : (mode === "DEACTIVATE"
                    ? "Comercio desactivado correctamente con sincronización global en el ecosistema."
                    : "Comercio deprovisionado correctamente con preservación estricta de historial financiero."),
        };
    }
    catch (e) {
        logger_1.Logger.error("Error en deprovisionTenant execution", e, { module: "deprovisionTenant", userId: callerUid });
        throw new functions.https.HttpsError("internal", e.message || "Error interno al desaprovisionar el comercio.");
    }
});
/**
 * CALLABLE: reconcileMerchantIdentity
 * Permite a administradores de plataforma ejecutar la reconciliación canónica
 * de un comercio o de todos los comercios del sistema.
 */
exports.reconcileMerchantIdentity = functions.https.onCall(async (data, context) => {
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["admin", "super_admin", "ADMIN", "SUPER_ADMIN", "auditor", "AUDITOR"],
    }, "reconcileMerchantIdentity");
    const { businessId, all } = data || {};
    const { reconcileMerchantIdentityInternal } = await Promise.resolve().then(() => __importStar(require("../triggers/merchantLifecycleSync")));
    if (businessId) {
        const result = await reconcileMerchantIdentityInternal(businessId, callerUid);
        return {
            success: true,
            mode: "SINGLE",
            result,
        };
    }
    if (all === true) {
        const bizSnap = await db.collection("businesses").get();
        const results = [];
        for (const doc of bizSnap.docs) {
            const r = await reconcileMerchantIdentityInternal(doc.id, callerUid);
            results.push(r);
        }
        return {
            success: true,
            mode: "BATCH",
            totalProcessed: results.length,
            synchronized: results.filter((r) => r.result === "SYNCHRONIZED").length,
            noChange: results.filter((r) => r.result === "NO_CHANGE").length,
            results,
        };
    }
    throw new functions.https.HttpsError("invalid-argument", "Debe especificar 'businessId' o 'all: true' para la reconciliación.");
});
//# sourceMappingURL=admin.js.map