"use strict";
/**
 * BlueSystem Delivery Enterprise — Courier Onboarding & Verification
 * Triggers: Courier Application Approved & Status Changed
 *
 * Aprovisionamiento atómico e idempotente de motorizados:
 * /courier_applications/{appId} (APPROVED) ──> Firebase Auth + /users/{uid} + /couriers/{uid} + Claims + /audit_events
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
exports.onCourierApplicationStatusChanged = exports.onCourierApplicationApproved = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const geoCatalog_1 = require("../domain/geo/geoCatalog");
const emailService_1 = require("../services/emailService");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
// ─── Helper: Generar contraseña temporal segura ───────────────────────────────
function generateTempPassword() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    let password = "";
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
// ─── TRIGGER: onCourierApplicationApproved ────────────────────────────────────
/**
 * Detecta cuando una solicitud pasa a status = "APPROVED" y ejecuta el aprovisionamiento
 * atómico e idempotente dentro del dominio Courier y Users existente con aislamiento de Tenant.
 */
exports.onCourierApplicationApproved = functions.firestore
    .document("courier_applications/{appId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d, _e;
    const appId = context.params.appId;
    const before = change.before.data();
    const after = change.after.data();
    if (!before || !after)
        return null;
    // Guardia 1: Solo actuar en la transición hacia APPROVED
    if (before.status === "APPROVED")
        return null;
    if (after.status !== "APPROVED")
        return null;
    // Guardia 2: Idempotencia estricta — si ya fue provisionado, no duplicar
    if (after.provisionedUid && after.provisionedCourierId) {
        logger_1.Logger.info(`[COURIER-ONBOARDING] Solicitud appId=${appId} ya fue provisionada previamente. Omitiendo.`, {
            appId,
            uid: after.provisionedUid,
        });
        return null;
    }
    const resolvedTenantId = after.tenantId || "ten_bluesystem_core";
    logger_1.Logger.info(`[COURIER-ONBOARDING] Iniciando aprovisionamiento de motorizado para appId=${appId}, tenantId=${resolvedTenantId}`, {
        appId,
        tenantId: resolvedTenantId,
        email: after.personal.email,
        plate: after.vehicle.plate,
    });
    let uid;
    const tempPassword = generateTempPassword();
    try {
        // 1. Resolver o Crear usuario en Firebase Auth
        let existingAuthUser = null;
        try {
            existingAuthUser = await admin.auth().getUserByEmail(after.personal.email);
        }
        catch (err) {
            if (err.code !== "auth/user-not-found") {
                throw err;
            }
        }
        if (existingAuthUser) {
            uid = existingAuthUser.uid;
            logger_1.Logger.info(`[COURIER-ONBOARDING] Usuario Firebase Auth existente encontrado: ${uid}`, { appId, uid, tenantId: resolvedTenantId });
            // Invariante de Acceso Activo: Sincronizar contraseña temporal y asegurar estado habilitado
            await admin.auth().updateUser(uid, {
                password: tempPassword,
                disabled: false,
            });
            logger_1.Logger.info(`[COURIER-ONBOARDING] Usuario Auth existente sincronizado con contraseña temporal y habilitado para ${after.personal.email}`, { appId, uid });
        }
        else {
            const newUser = await admin.auth().createUser({
                email: after.personal.email,
                displayName: after.personal.fullName,
                password: tempPassword,
                disabled: false,
            });
            uid = newUser.uid;
            logger_1.Logger.info(`[COURIER-ONBOARDING] Nuevo usuario Firebase Auth creado: ${uid}`, { appId, uid, tenantId: resolvedTenantId });
        }
        // 1.5. Resolver URL pública de Foto de Perfil
        let resolvedPhotoUrl = ((_b = (_a = after.documents) === null || _a === void 0 ? void 0 : _a.profilePhoto) === null || _b === void 0 ? void 0 : _b.downloadUrl) || "";
        const profileStoragePath = (_d = (_c = after.documents) === null || _c === void 0 ? void 0 : _c.profilePhoto) === null || _d === void 0 ? void 0 : _d.storagePath;
        if (!resolvedPhotoUrl && profileStoragePath) {
            try {
                const bucket = admin.storage().bucket();
                const file = bucket.file(profileStoragePath);
                const [exists] = await file.exists();
                if (exists) {
                    const [metadata] = await file.getMetadata();
                    let token = (_e = metadata.metadata) === null || _e === void 0 ? void 0 : _e.firebaseStorageDownloadTokens;
                    if (!token) {
                        const crypto = require("crypto");
                        token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
                        await file.setMetadata({
                            metadata: { firebaseStorageDownloadTokens: token },
                        });
                    }
                    resolvedPhotoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(profileStoragePath)}?alt=media&token=${token}`;
                }
            }
            catch (storageErr) {
                logger_1.Logger.warn("[COURIER-ONBOARDING] No se pudo resolver token público de Storage para foto de perfil:", {
                    error: storageErr === null || storageErr === void 0 ? void 0 : storageErr.message,
                });
            }
        }
        // Sincronizar photoURL en Firebase Auth si está disponible
        if (resolvedPhotoUrl) {
            try {
                await admin.auth().updateUser(uid, { photoURL: resolvedPhotoUrl });
                logger_1.Logger.info(`[COURIER-ONBOARDING] photoURL sincronizado en Firebase Auth para ${after.personal.email}`, { uid, resolvedPhotoUrl });
            }
            catch (authPhotoErr) {
                logger_1.Logger.warn("[COURIER-ONBOARDING] No se pudo actualizar photoURL en Firebase Auth:", { error: authPhotoErr === null || authPhotoErr === void 0 ? void 0 : authPhotoErr.message });
            }
        }
        // 2. Transacción Atómica en Firestore
        await db.runTransaction(async (tx) => {
            const now = FieldValue.serverTimestamp();
            const userRef = db.collection("users").doc(uid);
            const courierRef = db.collection("couriers").doc(uid);
            const appRef = db.collection("courier_applications").doc(appId);
            const geo = (0, geoCatalog_1.normalizeGeoLocation)(after.personal.departmentId || after.personal.department, after.personal.municipalityId || after.personal.city);
            // A) /users/{uid} — Identidad canónica con Tenant Context
            tx.set(userRef, {
                uid,
                tenantId: resolvedTenantId,
                name: after.personal.fullName,
                nombre: after.personal.fullName,
                email: after.personal.email,
                phone: after.personal.phone,
                telefono: after.personal.phone,
                photoUrl: resolvedPhotoUrl || "",
                photoURL: resolvedPhotoUrl || "",
                fotoUrl: resolvedPhotoUrl || "",
                profilePhotoUrl: resolvedPhotoUrl || "",
                profilePhotoStoragePath: profileStoragePath || "",
                userType: "driver",
                role: "courier",
                rol: "courier",
                eiamRole: "DRIVER",
                nationalId: after.personal.nationalId,
                departmentId: geo.departmentId,
                departmentName: geo.departmentName,
                municipalityId: geo.municipalityId,
                municipalityName: geo.municipalityName,
                cityId: geo.municipalityId,
                city: geo.municipalityName,
                vehicleBrand: after.vehicle.brand,
                vehicleModel: after.vehicle.model,
                vehiclePlate: after.vehicle.plate,
                vehicleYear: after.vehicle.year || "",
                vehicleColor: after.vehicle.color || "",
                placa: after.vehicle.plate,
                active: true,
                isActive: true,
                isApproved: true,
                approvalStatus: "APPROVED",
                identityOrigin: "ONBOARDING_PORTAL",
                createdVia: "ONBOARDING_PORTAL",
                applicationId: appId,
                updatedAt: now,
            }, { merge: true });
            // B) /couriers/{uid} — Dominio canónico de motorizados con Tenant Context
            // REGLA CRÍTICA: isAvailable = false (la aprobación documental NO activa disponibilidad operativa)
            tx.set(courierRef, {
                courierId: uid,
                tenantId: resolvedTenantId,
                name: after.personal.fullName,
                phone: after.personal.phone,
                email: after.personal.email,
                photoUrl: resolvedPhotoUrl || "",
                photoURL: resolvedPhotoUrl || "",
                fotoUrl: resolvedPhotoUrl || "",
                profilePhotoUrl: resolvedPhotoUrl || "",
                profilePhotoStoragePath: profileStoragePath || "",
                nationalId: after.personal.nationalId,
                departmentId: geo.departmentId,
                departmentName: geo.departmentName,
                municipalityId: geo.municipalityId,
                municipalityName: geo.municipalityName,
                cityId: geo.municipalityId,
                city: geo.municipalityName,
                vehicle: {
                    brand: after.vehicle.brand,
                    model: after.vehicle.model,
                    plate: after.vehicle.plate,
                    year: after.vehicle.year || "",
                    color: after.vehicle.color || "",
                },
                plate: after.vehicle.plate,
                vehicleBrand: after.vehicle.brand,
                vehicleModel: after.vehicle.model,
                vehicleYear: after.vehicle.year || "",
                vehicleColor: after.vehicle.color || "",
                isAvailable: false,
                isActive: true,
                isApproved: true,
                approvalStatus: "APPROVED",
                onboardingStatus: "approved",
                applicationId: appId,
                approvedBy: after.reviewedBy || "ADMIN",
                approvedAt: now,
                updatedAt: now,
            }, { merge: true });
            // C) /courier_applications/{appId} — Marcado de aprovisionamiento
            tx.update(appRef, {
                provisionedUid: uid,
                provisionedCourierId: uid,
                tenantId: resolvedTenantId,
                status: "APPROVED",
                onboardingStatus: "approved",
                updatedAt: now,
            });
            // D) /audit_events — Auditoría inmutable de plataforma
            const auditRef = db.collection("audit_events").doc();
            tx.set(auditRef, {
                event: "COURIER_APPLICATION_APPROVED",
                domain: "COURIER_ONBOARDING",
                uid,
                courierId: uid,
                tenantId: resolvedTenantId,
                applicationId: appId,
                triggeredBy: after.reviewedBy || "ADMIN",
                metadata: {
                    candidateName: after.personal.fullName,
                    email: after.personal.email,
                    plate: after.vehicle.plate,
                    nationalId: after.personal.nationalId,
                    tenantId: resolvedTenantId,
                },
                timestamp: now,
            });
        });
        // 3. Asignación Canónica de Custom Claims JWT con Tenant Context
        await admin.auth().setCustomUserClaims(uid, {
            role: "courier",
            userType: "driver",
            eiamRole: "DRIVER",
            tenantId: resolvedTenantId,
            isApproved: true,
            eiamVer: 3,
        });
        // 4. Dispatch Correo Transaccional de Aprobación de Motorizado
        try {
            await emailService_1.EmailService.sendCourierApplicationApprovedEmail({
                appId,
                email: after.personal.email,
                candidateName: after.personal.fullName,
                plate: after.vehicle.plate,
                courierId: uid,
                tempPassword,
                tenantId: resolvedTenantId,
            });
        }
        catch (emailErr) {
            logger_1.Logger.warn("[COURIER-ONBOARDING] Error enviando correo de aprobación (no bloquea provisión):", emailErr === null || emailErr === void 0 ? void 0 : emailErr.message);
        }
        logger_1.Logger.info(`[COURIER-ONBOARDING] Aprovisionamiento EIAM completado exitosamente para motorizado uid=${uid}, tenantId=${resolvedTenantId}`, {
            appId,
            uid,
            tenantId: resolvedTenantId,
        });
        return { success: true, uid };
    }
    catch (error) {
        logger_1.Logger.error(`[COURIER-ONBOARDING] Error crítico aprovisionando motorizado appId=${appId}`, {
            appId,
            error: (error === null || error === void 0 ? void 0 : error.message) || error,
        });
        throw error;
    }
});
// ─── TRIGGER: onCourierApplicationStatusChanged ───────────────────────────────
/**
 * Registra auditoría y trazabilidad en cambios de estado (REJECTED, UNDER_REVIEW, DOCS_REQUESTED).
 */
exports.onCourierApplicationStatusChanged = functions.firestore
    .document("courier_applications/{appId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d;
    const appId = context.params.appId;
    const before = change.before.data();
    const after = change.after.data();
    if (!before || !after)
        return null;
    if (before.status === after.status)
        return null;
    logger_1.Logger.info(`[COURIER-ONBOARDING] Cambio de estado en solicitud appId=${appId}: ${before.status} -> ${after.status}`, {
        appId,
        oldStatus: before.status,
        newStatus: after.status,
        rejectionReason: after.rejectionReason,
    });
    const eventName = after.status === "REJECTED"
        ? "COURIER_APPLICATION_REJECTED"
        : after.status === "UNDER_REVIEW"
            ? "COURIER_APPLICATION_UNDER_REVIEW"
            : after.status === "DOCS_REQUESTED"
                ? "COURIER_APPLICATION_DOCS_REQUESTED"
                : "COURIER_APPLICATION_STATUS_CHANGED";
    if (after.status === "REJECTED" && ((_a = after.personal) === null || _a === void 0 ? void 0 : _a.email)) {
        try {
            await emailService_1.EmailService.sendCourierApplicationRejectedEmail({
                appId,
                email: after.personal.email,
                candidateName: ((_b = after.personal) === null || _b === void 0 ? void 0 : _b.fullName) || "Aspirante",
                rejectionReason: after.rejectionReason || undefined,
                tenantId: after.tenantId || "ten_bluesystem_core",
            });
        }
        catch (emailErr) {
            logger_1.Logger.warn("[COURIER-ONBOARDING] Error enviando correo de rechazo motorizado:", emailErr === null || emailErr === void 0 ? void 0 : emailErr.message);
        }
    }
    try {
        await db.collection("audit_events").add({
            event: eventName,
            domain: "COURIER_ONBOARDING",
            applicationId: appId,
            previousStatus: before.status,
            newStatus: after.status,
            rejectionReason: after.rejectionReason || null,
            reviewedBy: after.reviewedBy || "SYSTEM",
            candidateName: ((_c = after.personal) === null || _c === void 0 ? void 0 : _c.fullName) || "Aspirante",
            email: ((_d = after.personal) === null || _d === void 0 ? void 0 : _d.email) || "",
            timestamp: FieldValue.serverTimestamp(),
        });
    }
    catch (auditErr) {
        logger_1.Logger.warn("[COURIER-ONBOARDING] Error registrando auditoría de cambio de estado", { error: auditErr });
    }
    return null;
});
//# sourceMappingURL=courierApplications.js.map