"use strict";
/**
 * BlueSystem Delivery Enterprise — Sprint 18.1
 * Callable: Merchant Wizard Completed + Merchant Application Submit
 *
 * Funciones callable invocadas desde Merchant Web y Onboarding Portal:
 * - completeMerchantWizard: Mueve lifecycleStatus ONBOARDING → ACTIVE
 * - updateMerchantWizardStep: Persiste el progreso del wizard (paso a paso)
 * - submitMerchantApplication: Crea la solicitud de afiliación desde el Portal
 *
 * ADR-011: Merchant Onboarding Portal & Lifecycle Architecture
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
exports.getMerchantApplicationStatus = exports.completeMerchantWizard = exports.updateMerchantWizardStep = exports.submitMerchantApplication = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const validator_1 = require("../shared/middleware/validator");
const emailService_1 = require("../services/emailService");
const geoCatalog_1 = require("../domain/geo/geoCatalog");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
// ─── CALLABLE: submitMerchantApplication ──────────────────────────────────────
/**
 * Recibe la solicitud de afiliación desde el Merchant Onboarding Portal.
 * NO requiere autenticación (el portal es público).
 *
 * Valida server-side la legitimidad del Tenant y persiste la solicitud en /merchant_applications
 * con estado PENDING y asociación estricta de tenantId.
 */
exports.submitMerchantApplication = functions.https.onCall(async (data) => {
    var _a;
    // Validaciones básicas
    if (!data.businessName || !data.email || !data.phone || !data.ruc) {
        throw new functions.https.HttpsError("invalid-argument", "Faltan campos obligatorios: businessName, email, phone, ruc.");
    }
    // Validar formato de email
    const cleanEmail = data.email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
        throw new functions.https.HttpsError("invalid-argument", "El correo electrónico no tiene un formato válido.");
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
            throw new functions.https.HttpsError("failed-precondition", `La empresa '${targetSlug}' no se encuentra activa para recibir solicitudes.`);
        }
        resolvedTenantId = tenantDoc.id;
        resolvedTenantSlug = tenantData.slug || targetSlug;
        resolvedTenantName = tenantData.name || tenantData.legalName || "Tenant";
    }
    // Verificar que no exista ya una solicitud PENDING o APPROVED con el mismo email en el mismo tenant
    const existingSnap = await db
        .collection("merchant_applications")
        .where("email", "==", cleanEmail)
        .where("tenantId", "==", resolvedTenantId)
        .where("status", "in", ["PENDING", "UNDER_REVIEW", "APPROVED", "ONBOARDING"])
        .limit(1)
        .get();
    if (!existingSnap.empty) {
        throw new functions.https.HttpsError("already-exists", "Ya existe una solicitud activa con este correo electrónico para esta empresa.");
    }
    // Normalización y validación geográfica estructurada (catálogo oficial)
    const geo = (0, geoCatalog_1.normalizeGeoLocation)(data.departmentId, data.municipalityId || data.city);
    if (data.departmentId &&
        data.municipalityId &&
        !(0, geoCatalog_1.isValidMunicipality)(data.departmentId, data.municipalityId)) {
        throw new functions.https.HttpsError("invalid-argument", `El municipio '${data.municipalityId}' no pertenece al departamento '${data.departmentId}'.`);
    }
    // ─── Validación y Resolución Confiable del Rubro Comercial (Zero-Trust Server-Side) ────
    const targetCategoryId = (data.businessCategoryId || data.category || "").trim().toLowerCase();
    if (!targetCategoryId) {
        throw new functions.https.HttpsError("invalid-argument", "El rubro comercial (businessCategoryId) es obligatorio.");
    }
    const categoryDoc = await db.collection("business_categories").doc(targetCategoryId).get();
    if (!categoryDoc.exists) {
        throw new functions.https.HttpsError("not-found", `El rubro comercial '${targetCategoryId}' no existe en el catálogo maestro de la plataforma.`);
    }
    const categoryData = categoryDoc.data();
    if (categoryData.active !== true || categoryData.showInOnboarding !== true) {
        throw new functions.https.HttpsError("failed-precondition", `El rubro comercial '${categoryData.name || targetCategoryId}' no se encuentra disponible para recibir nuevas solicitudes de afiliación.`);
    }
    const resolvedBusinessCategoryId = categoryDoc.id;
    const resolvedCategoryName = categoryData.name || targetCategoryId;
    // Construir el documento de la aplicación con trazabilidad inmutable de Tenant
    const appRef = db.collection("merchant_applications").doc();
    const now = FieldValue.serverTimestamp();
    const publicAppId = data.applicationId &&
        typeof data.applicationId === "string" &&
        data.applicationId.trim().startsWith("APP-")
        ? data.applicationId.trim()
        : `APP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const geoPoint = data.location
        ? new admin.firestore.GeoPoint(data.location.latitude, data.location.longitude)
        : null;
    await appRef.set({
        appId: publicAppId,
        firestoreDocId: appRef.id,
        documentUploadReference: publicAppId,
        tenantId: resolvedTenantId,
        tenantSlug: resolvedTenantSlug,
        tenantName: resolvedTenantName,
        businessName: data.businessName.trim(),
        legalName: (data.legalName || data.businessName).trim(),
        ruc: data.ruc.trim(),
        departmentId: geo.departmentId,
        departmentName: geo.departmentName,
        municipalityId: geo.municipalityId,
        municipalityName: geo.municipalityName,
        address: data.address.trim(),
        city: geo.municipalityName,
        zone: ((_a = data.zone) === null || _a === void 0 ? void 0 : _a.trim()) || "",
        businessCategoryId: resolvedBusinessCategoryId,
        category: resolvedCategoryName,
        categoria: resolvedCategoryName,
        contactName: data.contactName.trim(),
        phone: data.phone.trim(),
        email: cleanEmail,
        location: geoPoint,
        documents: data.documents || [],
        documentUrls: data.documentUrls || [],
        status: "PENDING",
        rejectionReason: null,
        docsRequestedNote: null,
        reviewedBy: null,
        reviewedAt: null,
        provisionedBusinessId: null,
        provisionedUid: null,
        provisioningError: null,
        createdAt: now,
        updatedAt: now,
    });
    logger_1.Logger.info(`[MERCHANT-ONBOARDING] Solicitud creada: docId=${appRef.id}, publicAppId=${publicAppId}, tenantId=${resolvedTenantId}, email=${data.email}`, { module: "submitMerchantApplication", docId: appRef.id, appId: publicAppId, tenantId: resolvedTenantId });
    // Dispatch correo transaccional de confirmación de recepción
    try {
        await emailService_1.EmailService.sendApplicationReceivedEmail({
            appId: publicAppId,
            firestoreDocId: appRef.id,
            email: cleanEmail,
            contactName: data.contactName.trim(),
            businessName: data.businessName.trim(),
        });
    }
    catch (emailErr) {
        logger_1.Logger.error("[MERCHANT-ONBOARDING] Error dispatching received email", emailErr, { appId: publicAppId, docId: appRef.id });
    }
    return {
        success: true,
        applicationId: publicAppId,
        firestoreDocId: appRef.id,
        message: "Tu solicitud fue recibida exitosamente. Te contactaremos en 24-48 horas.",
    };
});
// ─── CALLABLE: updateMerchantWizardStep ───────────────────────────────────────
/**
 * Persiste el progreso del Wizard de primer acceso, paso a paso.
 * El Merchant Web llama esta función al completar cada paso.
 *
 * Requiere autenticación con rol MERCHANT_OWNER.
 */
exports.updateMerchantWizardStep = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false, // El web portal puede no tener AppCheck
        allowedRoles: [
            "MERCHANT_OWNER", "OWNER", "business", "owner", "merchant",
        ],
        requiredFields: ["step"],
    }, "updateMerchantWizardStep");
    const step = data.step;
    if (step < 1 || step > 5) {
        throw new functions.https.HttpsError("invalid-argument", "El paso del wizard debe estar entre 1 y 5.");
    }
    // Obtener el businessId desde los claims del usuario
    const userSnap = await db.collection("users").doc(callerUid).get();
    if (!userSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Usuario no encontrado.");
    }
    const businessId = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.businessId;
    if (!businessId) {
        throw new functions.https.HttpsError("failed-precondition", "El usuario no tiene un businessId asociado.");
    }
    const businessRef = db.collection("businesses").doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Comercio no encontrado.");
    }
    if (((_b = businessSnap.data()) === null || _b === void 0 ? void 0 : _b.wizardCompleted) === true) {
        throw new functions.https.HttpsError("failed-precondition", "El wizard ya fue completado anteriormente.");
    }
    // Construir la actualización según el paso
    const stepUpdates = buildStepUpdates(step, data, businessId, callerUid);
    await businessRef.update(Object.assign(Object.assign({}, stepUpdates), { onboardingStep: step, updatedAt: FieldValue.serverTimestamp() }));
    logger_1.Logger.info(`[WIZARD] Paso ${step}/5 guardado para businessId=${businessId}`, { module: "updateMerchantWizardStep", callerUid, businessId, step });
    return {
        success: true,
        step,
        businessId,
        message: `Paso ${step} guardado correctamente.`,
    };
});
// ─── CALLABLE: completeMerchantWizard ─────────────────────────────────────────
/**
 * Finaliza el Wizard de primer acceso.
 * Mueve lifecycleStatus de ONBOARDING → ACTIVE.
 *
 * Requiere que todos los 5 pasos estén completados (onboardingStep === 5).
 */
exports.completeMerchantWizard = functions.https.onCall(async (data, context) => {
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false,
        allowedRoles: [
            "MERCHANT_OWNER", "OWNER", "business", "owner", "merchant",
        ],
        requiredFields: ["businessId"],
    }, "completeMerchantWizard");
    const { businessId } = data;
    const businessRef = db.collection("businesses").doc(businessId);
    const businessSnap = await businessRef.get();
    if (!businessSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Comercio no encontrado.");
    }
    const business = businessSnap.data();
    // Verificar que el caller es el owner del comercio
    if (business.ownerUid !== callerUid) {
        throw new functions.https.HttpsError("permission-denied", "No tienes permiso para completar el wizard de este comercio.");
    }
    if (business.wizardCompleted === true) {
        throw new functions.https.HttpsError("failed-precondition", "El wizard ya fue completado anteriormente.");
    }
    if (business.lifecycleStatus !== "ONBOARDING") {
        throw new functions.https.HttpsError("failed-precondition", `El comercio no está en estado ONBOARDING. Estado actual: ${business.lifecycleStatus}`);
    }
    const now = FieldValue.serverTimestamp();
    // Transacción para activar el comercio
    await db.runTransaction(async (tx) => {
        // Activar el comercio
        tx.update(businessRef, {
            lifecycleStatus: "ACTIVE",
            wizardCompleted: true,
            onboardingStep: 5,
            onboardingCompletedAt: now,
            isOpen: true, // El comercio arranca abierto por defecto
            updatedAt: now,
        });
        // Registrar evento de auditoría
        tx.set(db.collection("audit_events").doc(), {
            event: "ONBOARDING_COMPLETED",
            domain: "IDENTITY",
            uid: callerUid,
            businessId,
            triggeredBy: callerUid,
            metadata: {
                businessName: business.name,
                completedAt: new Date().toISOString(),
            },
            timestamp: now,
        });
        // Notificar al admin que el comercio está activo
        tx.set(db.collection("admin_notifications").doc(), {
            type: "MERCHANT_ACTIVATED",
            title: "🟢 Nuevo Comercio Activo",
            body: `${business.name} completó el onboarding y está operacional.`,
            businessId,
            uid: callerUid,
            isRead: false,
            createdAt: now,
        });
    });
    logger_1.Logger.info(`[WIZARD] Wizard completado. businessId=${businessId}, uid=${callerUid}. Estado: ACTIVE`, { module: "completeMerchantWizard", callerUid, businessId });
    return {
        success: true,
        businessId,
        lifecycleStatus: "ACTIVE",
        message: "¡Bienvenido a BlueSystem! Tu comercio está activo y listo para recibir pedidos.",
    };
});
// ─── CALLABLE: getMerchantApplicationStatus ───────────────────────────────────
/**
 * Permite al solicitante consultar el estado de su solicitud por email.
 * No requiere autenticación (el portal de afiliación es público).
 */
exports.getMerchantApplicationStatus = functions.https.onCall(async (data) => {
    if (!data || !data.email || typeof data.email !== "string" || !data.email.trim()) {
        throw new functions.https.HttpsError("invalid-argument", "El email es requerido.");
    }
    const cleanEmail = data.email.toLowerCase().trim();
    let snap;
    try {
        snap = await db
            .collection("merchant_applications")
            .where("email", "==", cleanEmail)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
    }
    catch (error) {
        logger_1.Logger.error("[getMerchantApplicationStatus] Fallo al consultar solicitud en Firestore", error, {
            module: "getMerchantApplicationStatus",
            operation: "queryByEmail",
        });
        throw new functions.https.HttpsError("internal", "No fue posible consultar el estado de la solicitud.");
    }
    if (snap.empty) {
        throw new functions.https.HttpsError("not-found", "No se encontró ninguna solicitud con ese email.");
    }
    const doc = snap.docs[0];
    const app = doc.data();
    // Retornar solo los campos públicos (sin datos sensibles)
    return {
        success: true,
        applicationId: app.appId || doc.id,
        businessName: app.businessName,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        // Mensaje contextual según el estado
        statusMessage: getStatusMessage(app.status),
        // Solo mostrar nota si hay documentos solicitados
        docsNote: app.status === "DOCS_REQUESTED" ? app.docsRequestedNote : null,
        rejectionReason: app.status === "REJECTED" ? app.rejectionReason : null,
    };
});
// ─── Helpers Privados ─────────────────────────────────────────────────────────
function getStatusMessage(status) {
    var _a;
    const messages = {
        PENDING: "Tu solicitud fue recibida y está en cola de revisión.",
        UNDER_REVIEW: "Estamos revisando tu solicitud. Te contactaremos pronto.",
        DOCS_REQUESTED: "Necesitamos documentos adicionales. Revisa tu correo.",
        APPROVED: "¡Tu solicitud fue aprobada! Revisa tu email para acceder a Merchant Web.",
        REJECTED: "Tu solicitud no fue aprobada en esta ocasión.",
        ONBOARDING: "Tu cuenta está lista. Completa la configuración en Merchant Web.",
        ACTIVE: "Tu comercio está activo y operacional en BlueSystem.",
    };
    return (_a = messages[status]) !== null && _a !== void 0 ? _a : "Estado desconocido.";
}
function buildStepUpdates(step, data, businessId, uid) {
    const updates = {};
    switch (step) {
        case 1:
            // Datos del negocio
            if (data.businessName)
                updates["name"] = data.businessName.trim();
            if (data.description)
                updates["description"] = data.description.trim();
            if (data.category)
                updates["category"] = data.category.trim();
            if (data.phone)
                updates["phone"] = data.phone.trim();
            if (data.website)
                updates["website"] = data.website.trim();
            break;
        case 2:
            // Sucursal principal
            if (data.departmentId || data.municipalityId || data.city) {
                const geo = (0, geoCatalog_1.normalizeGeoLocation)(data.departmentId, data.municipalityId || data.city);
                updates["departmentId"] = geo.departmentId;
                updates["departmentName"] = geo.departmentName;
                updates["municipalityId"] = geo.municipalityId;
                updates["municipalityName"] = geo.municipalityName;
                updates["city"] = geo.municipalityName;
            }
            if (data.address)
                updates["address"] = data.address.trim();
            if (data.zone)
                updates["zone"] = data.zone.trim();
            if (data.location) {
                updates["location"] = new admin.firestore.GeoPoint(data.location.latitude, data.location.longitude);
            }
            break;
        case 3:
            // Horario de atención
            if (data.schedule)
                updates["schedule"] = data.schedule;
            break;
        case 4:
            // Datos bancarios
            if (data.bankName)
                updates["bankName"] = data.bankName.trim();
            if (data.accountNumber)
                updates["accountNumber"] = data.accountNumber.trim();
            if (data.accountType)
                updates["accountType"] = data.accountType.trim();
            if (data.accountHolder)
                updates["accountHolder"] = data.accountHolder.trim();
            if (data.acceptedPaymentMethods)
                updates["acceptedPaymentMethods"] = data.acceptedPaymentMethods;
            break;
        case 5:
            // Menú inicial — La creación del primer producto se maneja en el cliente
            // Esta función solo registra que el paso 5 fue completado
            break;
    }
    return updates;
}
//# sourceMappingURL=merchant.js.map