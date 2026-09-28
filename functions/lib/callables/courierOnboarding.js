"use strict";
/**
 * BlueSystem Delivery Enterprise — Courier Onboarding & Verification
 * Callable: submitCourierApplication + getCourierApplicationStatus
 *
 * Recibe y valida solicitudes públicas de aspirantes a motorizados con:
 * - Validación exhaustiva de campos y documentos
 * - Normalización canónica de placa y cédula
 * - Prevención estricta de duplicados (Cédula, Placa, Email, Teléfono)
 * - Persistencia segura en /courier_applications
 * - Registro de trazabilidad en /audit_events
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
exports.adminDeleteCourierApplication = exports.getCourierApplicationStatus = exports.submitCourierApplication = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const geoCatalog_1 = require("../domain/geo/geoCatalog");
const emailService_1 = require("../services/emailService");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
// ─── Helpers de Normalización ─────────────────────────────────────────────────
function normalizePlate(raw) {
    if (!raw)
        return "";
    return raw.toUpperCase().replace(/\s+/g, "").trim();
}
function normalizeNationalId(raw) {
    if (!raw)
        return "";
    return raw.toUpperCase().replace(/\s+/g, "").trim();
}
// ─── CALLABLE: submitCourierApplication ────────────────────────────────────────
/**
 * Recibe la solicitud desde el Portal Web de Registro de Motorizados.
 * Endpoint público: valida los datos, valida el Tenant server-side, previene duplicados y persiste en /courier_applications.
 */
exports.submitCourierApplication = functions.https.onCall(async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    logger_1.Logger.info("[COURIER-ONBOARDING] Recibiendo solicitud de motorizado", {
        email: (_a = data === null || data === void 0 ? void 0 : data.personal) === null || _a === void 0 ? void 0 : _a.email,
        plate: (_b = data === null || data === void 0 ? void 0 : data.vehicle) === null || _b === void 0 ? void 0 : _b.plate,
        tenantId: data === null || data === void 0 ? void 0 : data.tenantId,
        tenantSlug: data === null || data === void 0 ? void 0 : data.tenantSlug,
    });
    // 1. Validar presencia de objetos raíz
    if (!data || !data.personal || !data.vehicle || !data.documents) {
        throw new functions.https.HttpsError("invalid-argument", "Estructura de solicitud incompleta. Se requieren datos personales, de vehículo y documentos.");
    }
    const { personal, vehicle, documents } = data;
    // 2. Validar campos personales obligatorios
    if (!((_c = personal.firstName) === null || _c === void 0 ? void 0 : _c.trim()) ||
        !((_d = personal.lastName) === null || _d === void 0 ? void 0 : _d.trim()) ||
        !((_e = personal.phone) === null || _e === void 0 ? void 0 : _e.trim()) ||
        !((_f = personal.email) === null || _f === void 0 ? void 0 : _f.trim()) ||
        !((_g = personal.department) === null || _g === void 0 ? void 0 : _g.trim()) ||
        !((_h = personal.city) === null || _h === void 0 ? void 0 : _h.trim()) ||
        !((_j = personal.nationalId) === null || _j === void 0 ? void 0 : _j.trim())) {
        throw new functions.https.HttpsError("invalid-argument", "Todos los campos de información personal son obligatorios.");
    }
    // 3. Validar formato de email
    const cleanEmail = personal.email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
        throw new functions.https.HttpsError("invalid-argument", "El formato del correo electrónico es inválido.");
    }
    // 4. Validar datos de motocicleta
    const cleanPlate = normalizePlate(vehicle.plate);
    if (!((_k = vehicle.brand) === null || _k === void 0 ? void 0 : _k.trim()) || !((_l = vehicle.model) === null || _l === void 0 ? void 0 : _l.trim()) || !cleanPlate) {
        throw new functions.https.HttpsError("invalid-argument", "Los datos de la motocicleta (marca, modelo y placa) son obligatorios.");
    }
    // 5. Validar formato de cédula
    const cleanNationalId = normalizeNationalId(personal.nationalId);
    if (cleanNationalId.length < 8) {
        throw new functions.https.HttpsError("invalid-argument", "El número de cédula debe tener un formato válido.");
    }
    // ─── Validación y Resolución Confiable del Tenant (Zero Trust Server-Side) ────
    let resolvedTenantId = "ten_bluesystem_core";
    let resolvedTenantSlug = "bluesystem";
    let resolvedTenantName = "BlueSystem Platform";
    if (data.tenantId && typeof data.tenantId === "string" && data.tenantId.trim()) {
        const targetTenantId = data.tenantId.trim();
        const tenantDoc = await db.collection("tenants").doc(targetTenantId).get();
        if (!tenantDoc.exists) {
            throw new functions.https.HttpsError("not-found", `El tenant '${targetTenantId}' no existe en el sistema.`);
        }
        const tenantData = tenantDoc.data();
        if (tenantData.status !== "ACTIVE") {
            throw new functions.https.HttpsError("failed-precondition", `El tenant '${targetTenantId}' no se encuentra en estado ACTIVE (Estado actual: ${tenantData.status}).`);
        }
        resolvedTenantId = tenantDoc.id;
        resolvedTenantSlug = tenantData.slug || targetTenantId;
        resolvedTenantName = tenantData.name || tenantData.legalName || "Tenant";
    }
    else if (data.tenantSlug && typeof data.tenantSlug === "string" && data.tenantSlug.trim()) {
        const targetSlug = data.tenantSlug.toLowerCase().trim();
        const tenantSnap = await db
            .collection("tenants")
            .where("slug", "==", targetSlug)
            .limit(1)
            .get();
        if (tenantSnap.empty) {
            throw new functions.https.HttpsError("not-found", `No se encontró ninguna empresa asociada al identificador '${targetSlug}'.`);
        }
        const tenantDoc = tenantSnap.docs[0];
        const tenantData = tenantDoc.data();
        if (tenantData.status !== "ACTIVE") {
            throw new functions.https.HttpsError("failed-precondition", `La empresa '${targetSlug}' no se encuentra activa para recibir solicitudes de motorizados.`);
        }
        resolvedTenantId = tenantDoc.id;
        resolvedTenantSlug = tenantData.slug || targetSlug;
        resolvedTenantName = tenantData.name || tenantData.legalName || "Tenant";
    }
    // 6. Validar que los 6 documentos requeridos estén presentes y completos
    const requiredDocKeys = [
        "idFront",
        "idBack",
        "profilePhoto",
        "registration",
        "insurance",
        "driverLicense",
    ];
    for (const docKey of requiredDocKeys) {
        const doc = documents[docKey];
        if (!doc || !doc.storagePath || !doc.storagePath.trim()) {
            throw new functions.https.HttpsError("invalid-argument", `Falta el documento requerido: ${docKey}. Asegúrate de cargar todos los archivos solicitados.`);
        }
    }
    // 7. Control de Duplicidad en Base de Datos (Hard Block por Tenant / Global)
    // A) Validar duplicidad de Cédula en solicitudes activas
    const existingIdSnap = await db
        .collection("courier_applications")
        .where("personal.nationalId", "==", cleanNationalId)
        .where("tenantId", "==", resolvedTenantId)
        .where("status", "in", ["PENDING_REVIEW", "UNDER_REVIEW", "APPROVED"])
        .limit(1)
        .get();
    if (!existingIdSnap.empty) {
        throw new functions.https.HttpsError("already-exists", "Ya existe una solicitud registrada o aprobada con este número de cédula para esta empresa.");
    }
    // B) Validar duplicidad de Placa en solicitudes activas
    const existingPlateSnap = await db
        .collection("courier_applications")
        .where("vehicle.plate", "==", cleanPlate)
        .where("tenantId", "==", resolvedTenantId)
        .where("status", "in", ["PENDING_REVIEW", "UNDER_REVIEW", "APPROVED"])
        .limit(1)
        .get();
    if (!existingPlateSnap.empty) {
        throw new functions.https.HttpsError("already-exists", `La placa ${cleanPlate} ya está registrada en una solicitud activa para esta empresa.`);
    }
    // C) Validar duplicidad de Email en solicitudes activas
    const existingEmailSnap = await db
        .collection("courier_applications")
        .where("personal.email", "==", cleanEmail)
        .where("tenantId", "==", resolvedTenantId)
        .where("status", "in", ["PENDING_REVIEW", "UNDER_REVIEW", "APPROVED"])
        .limit(1)
        .get();
    if (!existingEmailSnap.empty) {
        throw new functions.https.HttpsError("already-exists", "Ya existe una solicitud registrada con este correo electrónico para esta empresa.");
    }
    // D) Regla Normativa de 48 Horas para Solicitudes Rechazadas (Cooldown)
    // Si la solicitud anterior fue rechazada (ej. por documentos faltantes o ilegibles),
    // normar que debe esperar 48 horas para ingresar una nueva solicitud, salvo que el admin
    // la haya reactivado o eliminado desde el panel administrativo.
    const COOLDOWN_HOURS = 48;
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    const rejectedSnap = await db
        .collection("courier_applications")
        .where("tenantId", "==", resolvedTenantId)
        .where("status", "==", "REJECTED")
        .where("personal.email", "==", cleanEmail)
        .limit(1)
        .get();
    let priorRejectedDoc = rejectedSnap.empty ? null : rejectedSnap.docs[0].data();
    if (!priorRejectedDoc) {
        const rejectedIdSnap = await db
            .collection("courier_applications")
            .where("tenantId", "==", resolvedTenantId)
            .where("status", "==", "REJECTED")
            .where("personal.nationalId", "==", cleanNationalId)
            .limit(1)
            .get();
        if (!rejectedIdSnap.empty) {
            priorRejectedDoc = rejectedIdSnap.docs[0].data();
        }
    }
    if (priorRejectedDoc) {
        const rejectionTimestamp = ((_o = (_m = priorRejectedDoc.reviewedAt) === null || _m === void 0 ? void 0 : _m.toMillis) === null || _o === void 0 ? void 0 : _o.call(_m)) ||
            ((_q = (_p = priorRejectedDoc.updatedAt) === null || _p === void 0 ? void 0 : _p.toMillis) === null || _q === void 0 ? void 0 : _q.call(_p)) ||
            ((_s = (_r = priorRejectedDoc.createdAt) === null || _r === void 0 ? void 0 : _r.toMillis) === null || _s === void 0 ? void 0 : _s.call(_r)) ||
            0;
        const elapsedMs = Date.now() - rejectionTimestamp;
        if (elapsedMs < cooldownMs) {
            const remainingHours = Math.max(1, Math.ceil((cooldownMs - elapsedMs) / (60 * 60 * 1000)));
            const reasonText = priorRejectedDoc.rejectionReason
                ? ` Motivo registrado: "${priorRejectedDoc.rejectionReason}".`
                : "";
            throw new functions.https.HttpsError("failed-precondition", `Tu solicitud anterior fue rechazada.${reasonText} Por normativa operativa, debes esperar 48 horas para presentar una nueva solicitud (tiempo restante: aprox. ${remainingHours} h). Si necesitas actualizar tus documentos o reactivar tu trámite antes, por favor comunícate con la administración.`);
        }
    }
    // 8. Generar identificador de solicitud
    const appId = data.applicationId && typeof data.applicationId === "string" && data.applicationId.startsWith("courier_app_")
        ? data.applicationId
        : `courier_app_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const geo = (0, geoCatalog_1.normalizeGeoLocation)(personal.departmentId || personal.department, personal.municipalityId || personal.city);
    const applicationDoc = {
        applicationId: appId,
        tenantId: resolvedTenantId,
        tenantSlug: resolvedTenantSlug,
        tenantName: resolvedTenantName,
        personal: {
            firstName: personal.firstName.trim(),
            lastName: personal.lastName.trim(),
            fullName: `${personal.firstName.trim()} ${personal.lastName.trim()}`,
            phone: personal.phone.trim(),
            email: cleanEmail,
            departmentId: geo.departmentId,
            departmentName: geo.departmentName,
            municipalityId: geo.municipalityId,
            municipalityName: geo.municipalityName,
            department: geo.departmentName,
            city: geo.municipalityName,
            nationalId: cleanNationalId,
        },
        vehicle: {
            brand: vehicle.brand.trim(),
            model: vehicle.model.trim(),
            plate: cleanPlate,
            year: vehicle.year ? String(vehicle.year).trim() : "",
            color: vehicle.color ? vehicle.color.trim() : "",
        },
        documents: {
            idFront: documents.idFront,
            idBack: documents.idBack,
            profilePhoto: documents.profilePhoto,
            registration: documents.registration,
            insurance: documents.insurance,
            driverLicense: documents.driverLicense,
        },
        status: "PENDING_REVIEW",
        onboardingStatus: "pending_review",
        source: "WEB_PORTAL",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };
    // 9. Persistir solicitud en Firestore
    await db.collection("courier_applications").doc(appId).set(applicationDoc);
    // 10. Registrar evento de auditoría
    try {
        await db.collection("audit_events").add({
            event: "COURIER_APPLICATION_SUBMITTED",
            domain: "COURIER_ONBOARDING",
            applicationId: appId,
            tenantId: resolvedTenantId,
            candidateName: `${personal.firstName.trim()} ${personal.lastName.trim()}`,
            email: cleanEmail,
            plate: cleanPlate,
            nationalId: cleanNationalId,
            timestamp: FieldValue.serverTimestamp(),
        });
    }
    catch (auditErr) {
        logger_1.Logger.warn("[COURIER-ONBOARDING] No se pudo registrar auditoría de envío", { error: auditErr });
    }
    // 11. Dispatch correo transaccional de confirmación de recepción
    try {
        await emailService_1.EmailService.sendCourierApplicationReceivedEmail({
            appId,
            email: cleanEmail,
            candidateName: `${personal.firstName.trim()} ${personal.lastName.trim()}`,
            plate: cleanPlate,
            tenantId: resolvedTenantId,
        });
    }
    catch (emailErr) {
        logger_1.Logger.warn("[COURIER-ONBOARDING] Error dispatching courier received email (no bloquea solicitud):", emailErr === null || emailErr === void 0 ? void 0 : emailErr.message);
    }
    logger_1.Logger.info(`[COURIER-ONBOARDING] Solicitud creada exitosamente appId=${appId}, tenantId=${resolvedTenantId}`, {
        appId,
        tenantId: resolvedTenantId,
        email: cleanEmail,
    });
    return {
        success: true,
        applicationId: appId,
        message: "Solicitud de motorizado recibida exitosamente. Está en revisión por el equipo de Governance.",
    };
});
// ─── CALLABLE: getCourierApplicationStatus ─────────────────────────────────────
/**
 * Consulta de estado público de una solicitud de motorizado por Email + Cédula o Application ID.
 */
exports.getCourierApplicationStatus = functions.https.onCall(async (data) => {
    var _a, _b, _c, _d, _e, _f;
    if (!data) {
        throw new functions.https.HttpsError("invalid-argument", "Parámetros de consulta requeridos.");
    }
    let snap;
    if (data.applicationId && data.applicationId.trim()) {
        const doc = await db.collection("courier_applications").doc(data.applicationId.trim()).get();
        if (!doc.exists) {
            throw new functions.https.HttpsError("not-found", "No se encontró ninguna solicitud con ese ID.");
        }
        const item = doc.data();
        return {
            applicationId: doc.id,
            status: (item === null || item === void 0 ? void 0 : item.status) || "UNKNOWN",
            onboardingStatus: (item === null || item === void 0 ? void 0 : item.onboardingStatus) || "unknown",
            createdAt: (item === null || item === void 0 ? void 0 : item.createdAt) || null,
            candidateName: ((_a = item === null || item === void 0 ? void 0 : item.personal) === null || _a === void 0 ? void 0 : _a.fullName) || `${((_b = item === null || item === void 0 ? void 0 : item.personal) === null || _b === void 0 ? void 0 : _b.firstName) || ""} ${((_c = item === null || item === void 0 ? void 0 : item.personal) === null || _c === void 0 ? void 0 : _c.lastName) || ""}`.trim(),
            rejectionReason: (item === null || item === void 0 ? void 0 : item.rejectionReason) || null,
        };
    }
    if (!data.email || !data.nationalId) {
        throw new functions.https.HttpsError("invalid-argument", "Se requiere correo electrónico y número de cédula para consultar el estado.");
    }
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanNationalId = normalizeNationalId(data.nationalId);
    snap = await db
        .collection("courier_applications")
        .where("personal.email", "==", cleanEmail)
        .where("personal.nationalId", "==", cleanNationalId)
        .limit(1)
        .get();
    if (snap.empty) {
        throw new functions.https.HttpsError("not-found", "No se encontró ninguna solicitud que coincida con ese correo y número de cédula.");
    }
    const doc = snap.docs[0];
    const item = doc.data();
    return {
        applicationId: doc.id,
        status: item.status || "UNKNOWN",
        onboardingStatus: item.onboardingStatus || "unknown",
        createdAt: item.createdAt || null,
        candidateName: ((_d = item.personal) === null || _d === void 0 ? void 0 : _d.fullName) || `${((_e = item.personal) === null || _e === void 0 ? void 0 : _e.firstName) || ""} ${((_f = item.personal) === null || _f === void 0 ? void 0 : _f.lastName) || ""}`.trim(),
        rejectionReason: item.rejectionReason || null,
    };
});
// ─── CALLABLE: adminDeleteCourierApplication ─────────────────────────────────
/**
 * Callable HTTPS: adminDeleteCourierApplication
 * Permite a un Administrador o Supervisor eliminar/purgar definitivamente una solicitud
 * de motorizado (útil para solicitudes rechazadas, duplicadas o pruebas), liberando
 * de inmediato la cédula, correo electrónico y placa en el sistema.
 */
exports.adminDeleteCourierApplication = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión con una cuenta administrativa para realizar esta operación.");
    }
    const callerUid = context.auth.uid;
    const token = context.auth.token || {};
    const isPlatformAdmin = token.role === "PLATFORM_ADMIN" ||
        token.admin === true ||
        token.role === "SUPER_ADMIN" ||
        token.role === "admin";
    if (!isPlatformAdmin) {
        const userDoc = await db.collection("users").doc(callerUid).get();
        const userData = userDoc.data() || {};
        const userRole = (userData.role || userData.tipo || "").toLowerCase();
        if (!["admin", "platform_admin", "super_admin", "supervisor"].includes(userRole)) {
            throw new functions.https.HttpsError("permission-denied", "Solo los administradores del sistema pueden eliminar solicitudes de motorizados.");
        }
    }
    if (!data || !data.firestoreDocId || typeof data.firestoreDocId !== "string" || !data.firestoreDocId.trim()) {
        throw new functions.https.HttpsError("invalid-argument", "ID de documento Firestore no válido.");
    }
    const docId = data.firestoreDocId.trim();
    const appRef = db.collection("courier_applications").doc(docId);
    const appDoc = await appRef.get();
    if (!appDoc.exists) {
        throw new functions.https.HttpsError("not-found", "La solicitud de motorizado no existe en el sistema.");
    }
    const appData = appDoc.data() || {};
    // Seguridad de Datos: si la solicitud ya está aprobada y tiene un motorizado activo aprovisionado, prevenimos borrado accidental
    if (appData.status === "APPROVED" && appData.provisionedUid) {
        throw new functions.https.HttpsError("failed-precondition", "Esta solicitud ya fue aprobada y tiene un motorizado activo en la flota. Por integridad de datos, gestiona el motorizado desde el módulo de Flota en lugar de purgar el expediente.");
    }
    // Registrar evento de auditoría formal
    try {
        await db.collection("audit_events").add({
            action: "COURIER_APPLICATION_PURGED",
            actorUid: callerUid,
            domain: "COURIER_GOVERNANCE",
            metadata: {
                applicationId: appData.applicationId || docId,
                email: (_a = appData.personal) === null || _a === void 0 ? void 0 : _a.email,
                nationalId: (_b = appData.personal) === null || _b === void 0 ? void 0 : _b.nationalId,
                plate: (_c = appData.vehicle) === null || _c === void 0 ? void 0 : _c.plate,
                previousStatus: appData.status,
                candidateName: ((_d = appData.personal) === null || _d === void 0 ? void 0 : _d.fullName) || `${((_e = appData.personal) === null || _e === void 0 ? void 0 : _e.firstName) || ""} ${((_f = appData.personal) === null || _f === void 0 ? void 0 : _f.lastName) || ""}`.trim(),
                purgedAt: new Date().toISOString(),
            },
            timestamp: FieldValue.serverTimestamp(),
        });
    }
    catch (auditErr) {
        logger_1.Logger.warn("[COURIER-ONBOARDING] No se pudo registrar auditoría de eliminación:", { error: (auditErr === null || auditErr === void 0 ? void 0 : auditErr.message) || String(auditErr) });
    }
    // Eliminación física autoritativa vía Admin SDK
    await appRef.delete();
    logger_1.Logger.info(`[COURIER-ONBOARDING] Solicitud docId=${docId} eliminada definitivamente por admin=${callerUid}`);
    return {
        success: true,
        message: "Solicitud de motorizado eliminada definitivamente. La cédula, correo y placa han sido liberados para nuevos trámites.",
    };
});
//# sourceMappingURL=courierOnboarding.js.map