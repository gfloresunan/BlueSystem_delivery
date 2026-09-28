"use strict";
/**
 * BlueSystem Delivery Enterprise — Courier Profile Management
 * Callables: submitCourierProfileUpdateRequest & reviewCourierProfileUpdateRequest
 *
 * Recepción y validación de solicitudes de modificación de perfil de motorizados.
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
exports.reviewCourierProfileUpdateRequest = exports.submitCourierProfileUpdateRequest = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const validator_1 = require("../shared/middleware/validator");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
function normalizePlate(raw) {
    if (!raw)
        return "";
    return raw.toUpperCase().replace(/\s+/g, "").trim();
}
/**
 * CALLABLE: submitCourierProfileUpdateRequest
 * Permite a un motorizado autenticado solicitar la modificación de sus datos sensibles o vehículo.
 */
exports.submitCourierProfileUpdateRequest = functions.https.onCall(async (data, context) => {
    const { uid: callerUid, role } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: false,
        requiredFields: ["courierId", "requestType", "newValues"],
    }, "submitCourierProfileUpdateRequest");
    const courierId = data.courierId.trim();
    // Seguridad de Identidad: Solo el propio motorizado o un administrador pueden emitir la solicitud
    const isPlatformAdmin = ["ADMIN", "SUPER_ADMIN", "AUDITOR", "admin", "super_admin"].includes(role);
    if (callerUid !== courierId && !isPlatformAdmin) {
        throw new functions.https.HttpsError("permission-denied", "No tienes autorización para solicitar modificaciones en el perfil de otro motorizado.");
    }
    const { requestType, newValues, documents } = data;
    // Validar existencia del motorizado oficial en Firestore
    const courierDocRef = db.collection("couriers").doc(courierId);
    const courierSnap = await courierDocRef.get();
    if (!courierSnap.exists) {
        throw new functions.https.HttpsError("not-found", "El expediente de motorizado no existe en el sistema oficial.");
    }
    const currentCourierData = courierSnap.data() || {};
    const currentVehicle = currentCourierData.vehicle || {};
    // Construir mapa de Old Values oficiales
    const oldValues = {
        name: currentCourierData.name || "",
        phone: currentCourierData.phone || "",
        email: currentCourierData.email || "",
        nationalId: currentCourierData.nationalId || "",
        vehicleBrand: currentCourierData.vehicleBrand || currentVehicle.brand || "",
        vehicleModel: currentCourierData.vehicleModel || currentVehicle.model || "",
        vehiclePlate: currentCourierData.plate || currentVehicle.plate || "",
        vehicleYear: currentCourierData.vehicleYear || currentVehicle.year || 2024,
        vehicleColor: currentCourierData.vehicleColor || currentVehicle.color || "",
        department: currentCourierData.departmentName || currentCourierData.department || "",
        city: currentCourierData.municipalityName || currentCourierData.city || "",
    };
    // Validaciones específicas si hay cambio de placa
    if (newValues.vehiclePlate) {
        const cleanPlate = normalizePlate(newValues.vehiclePlate);
        newValues.vehiclePlate = cleanPlate;
        if (cleanPlate.length < 3) {
            throw new functions.https.HttpsError("invalid-argument", "La placa vehicular ingresada no tiene un formato válido.");
        }
        // Validar si la nueva placa ya está registrada en otro motorizado activo
        const existingPlateSnap = await db
            .collection("couriers")
            .where("plate", "==", cleanPlate)
            .where("isActive", "==", true)
            .limit(1)
            .get();
        if (!existingPlateSnap.empty && existingPlateSnap.docs[0].id !== courierId) {
            throw new functions.https.HttpsError("already-exists", `La placa ${cleanPlate} ya se encuentra registrada y activa en la flota.`);
        }
    }
    // Verificar si ya tiene una solicitud PENDING_REVIEW del mismo tipo
    const pendingSnap = await db
        .collection("courier_profile_requests")
        .where("courierId", "==", courierId)
        .where("status", "==", "PENDING_REVIEW")
        .limit(1)
        .get();
    if (!pendingSnap.empty) {
        throw new functions.https.HttpsError("already-exists", "Ya tienes una solicitud de modificación pendiente de revisión administrativa.");
    }
    const requestId = `cpr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = FieldValue.serverTimestamp();
    const requestDoc = {
        requestId,
        courierId,
        requestType,
        status: "PENDING_REVIEW",
        oldValues,
        newValues,
        documents: documents || {},
        createdAt: now,
        updatedAt: now,
    };
    await db.collection("courier_profile_requests").doc(requestId).set(requestDoc);
    // Registro de auditoría
    try {
        await db.collection("audit_events").add({
            event: "COURIER_PROFILE_REQUEST_SUBMITTED",
            domain: "COURIER_PROFILE",
            courierId,
            requestId,
            requestType,
            oldValues,
            newValues,
            triggeredBy: callerUid,
            timestamp: now,
        });
    }
    catch (auditErr) {
        logger_1.Logger.warn("[COURIER-PROFILE] Advertencia registrando auditoría de solicitud", { error: auditErr });
    }
    logger_1.Logger.info(`[COURIER-PROFILE] Solicitud creada exitosamente requestId=${requestId} para courierId=${courierId}`);
    return {
        success: true,
        requestId,
        message: "Tu solicitud de modificación ha sido radicada correctamente y está pendiente de validación administrativa.",
    };
});
/**
 * CALLABLE: reviewCourierProfileUpdateRequest
 * Permite a administradores de plataforma aprobar o rechazar solicitudes de perfil.
 */
exports.reviewCourierProfileUpdateRequest = functions.https.onCall(async (data, context) => {
    const { uid: adminUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "AUDITOR", "admin", "super_admin"],
        requiredFields: ["requestId", "decision"],
    }, "reviewCourierProfileUpdateRequest");
    const { requestId, decision, rejectionReason } = data;
    const reqRef = db.collection("courier_profile_requests").doc(requestId);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) {
        throw new functions.https.HttpsError("not-found", "La solicitud de perfil no existe.");
    }
    const reqData = reqSnap.data() || {};
    if (reqData.status !== "PENDING_REVIEW") {
        throw new functions.https.HttpsError("failed-precondition", `La solicitud ya fue procesada previamente con estado: ${reqData.status}`);
    }
    if (decision === "REJECT" && (!rejectionReason || !rejectionReason.trim())) {
        throw new functions.https.HttpsError("invalid-argument", "Se requiere especificar un motivo obligatorio para el rechazo.");
    }
    const newStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const now = FieldValue.serverTimestamp();
    await reqRef.update({
        status: newStatus,
        reviewedBy: adminUid,
        reviewedAt: now,
        rejectionReason: decision === "REJECT" ? (rejectionReason ? rejectionReason.trim() : "") : null,
        updatedAt: now,
    });
    logger_1.Logger.info(`[COURIER-PROFILE] Solicitud requestId=${requestId} revisada por admin=${adminUid} con decisión=${newStatus}`);
    return {
        success: true,
        requestId,
        status: newStatus,
        message: `Solicitud marcada exitosamente como ${newStatus}.`,
    };
});
//# sourceMappingURL=courierProfile.js.map