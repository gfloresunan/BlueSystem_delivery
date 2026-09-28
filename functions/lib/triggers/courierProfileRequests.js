"use strict";
/**
 * BlueSystem Delivery Enterprise — Courier Profile Management
 * Trigger: onCourierProfileRequestStatusChanged
 *
 * Gestión atómica, idempotente y segura de solicitudes de actualización de perfil de motorizados.
 * /courier_profile_requests/{requestId} (APPROVED) ──> /couriers/{uid} + /users/{uid} + /audit_events + FCM
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
exports.onCourierProfileRequestStatusChanged = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const messaging = admin.messaging();
/**
 * Helper: Envía notificación FCM directa a los dispositivos activos del motorizado
 */
async function sendCourierNotification(uid, title, body, actionData = {}) {
    try {
        // 1. Notificación interna en subcolección de usuario
        await db.collection("users").doc(uid).collection("notifications").add({
            title,
            body,
            type: "PROFILE_UPDATE",
            read: false,
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
            data: actionData,
        });
        // 2. Dispositivos push activos
        const devicesSnap = await db.collection("user_devices")
            .where("uid", "==", uid)
            .where("isActive", "==", true)
            .get();
        const tokens = [];
        devicesSnap.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken && data.fcmToken.length > 20) {
                tokens.push(data.fcmToken);
            }
        });
        if (tokens.length > 0) {
            await messaging.sendEachForMulticast({
                tokens,
                notification: {
                    title,
                    body,
                },
                data: Object.assign({ action: "PROFILE_UPDATE", screen: "courier_dashboard" }, actionData),
                android: {
                    priority: "high",
                },
            });
            logger_1.Logger.info(`[COURIER-PROFILE] Push FCM enviado a ${tokens.length} dispositivo(s) de uid=${uid}`);
        }
    }
    catch (err) {
        logger_1.Logger.warn(`[COURIER-PROFILE] Advertencia al enviar notificación a uid=${uid}`, { error: (err === null || err === void 0 ? void 0 : err.message) || err });
    }
}
/**
 * TRIGGER: onCourierProfileRequestStatusChanged
 * Monitorea cambios de estado en /courier_profile_requests/{requestId}
 */
exports.onCourierProfileRequestStatusChanged = functions.firestore
    .document("courier_profile_requests/{requestId}")
    .onUpdate(async (change, context) => {
    const requestId = context.params.requestId;
    const before = change.before.data();
    const after = change.after.data();
    if (!before || !after)
        return null;
    if (before.status === after.status)
        return null;
    const courierId = after.courierId;
    if (!courierId) {
        logger_1.Logger.error(`[COURIER-PROFILE] Solicitud requestId=${requestId} no tiene courierId asignado.`);
        return null;
    }
    logger_1.Logger.info(`[COURIER-PROFILE] Transición de estado en solicitud requestId=${requestId}: ${before.status} -> ${after.status}`, {
        requestId,
        courierId,
        oldStatus: before.status,
        newStatus: after.status,
    });
    // ── CASO 1: APROBACIÓN ADMINISTRATIVA ────────────────────────────────────
    if (after.status === "APPROVED" && before.status !== "APPROVED") {
        // Idempotencia: Verificar si ya fue aplicado
        if (after.appliedAt) {
            logger_1.Logger.info(`[COURIER-PROFILE] Solicitud requestId=${requestId} ya fue aplicada previamente. Omitiendo.`, { requestId });
            return null;
        }
        try {
            await db.runTransaction(async (tx) => {
                var _a;
                const now = FieldValue.serverTimestamp();
                const reqRef = db.collection("courier_profile_requests").doc(requestId);
                const courierRef = db.collection("couriers").doc(courierId);
                const userRef = db.collection("users").doc(courierId);
                const courierSnap = await tx.get(courierRef);
                const userSnap = await tx.get(userRef);
                const newVals = after.newValues || {};
                // Construir mapa de actualización para /couriers/{courierId}
                const courierUpdates = {
                    updatedAt: now,
                };
                if (newVals.name)
                    courierUpdates.name = newVals.name;
                if (newVals.phone)
                    courierUpdates.phone = newVals.phone;
                if (newVals.email)
                    courierUpdates.email = newVals.email;
                if (newVals.nationalId)
                    courierUpdates.nationalId = newVals.nationalId;
                if (newVals.city)
                    courierUpdates.city = newVals.city;
                if (newVals.department)
                    courierUpdates.department = newVals.department;
                // Datos de vehículo
                if (newVals.vehiclePlate || newVals.vehicleBrand || newVals.vehicleModel || newVals.vehicleYear || newVals.vehicleColor) {
                    const currentVehicle = courierSnap.exists ? ((_a = courierSnap.data()) === null || _a === void 0 ? void 0 : _a.vehicle) || {} : {};
                    const updatedVehicle = Object.assign(Object.assign({}, currentVehicle), { brand: newVals.vehicleBrand || currentVehicle.brand || "", model: newVals.vehicleModel || currentVehicle.model || "", plate: newVals.vehiclePlate || currentVehicle.plate || "", year: newVals.vehicleYear || currentVehicle.year || 2024, color: newVals.vehicleColor || currentVehicle.color || "" });
                    courierUpdates.vehicle = updatedVehicle;
                    if (newVals.vehiclePlate)
                        courierUpdates.plate = newVals.vehiclePlate;
                    if (newVals.vehicleBrand)
                        courierUpdates.vehicleBrand = newVals.vehicleBrand;
                    if (newVals.vehicleModel)
                        courierUpdates.vehicleModel = newVals.vehicleModel;
                    if (newVals.vehicleYear)
                        courierUpdates.vehicleYear = newVals.vehicleYear;
                    if (newVals.vehicleColor)
                        courierUpdates.vehicleColor = newVals.vehicleColor;
                }
                tx.set(courierRef, courierUpdates, { merge: true });
                // Construir mapa de actualización para /users/{courierId}
                const userUpdates = {
                    updatedAt: now,
                };
                if (newVals.name) {
                    userUpdates.name = newVals.name;
                    userUpdates.nombre = newVals.name;
                }
                if (newVals.phone) {
                    userUpdates.phone = newVals.phone;
                    userUpdates.telefono = newVals.phone;
                }
                if (newVals.email)
                    userUpdates.email = newVals.email;
                if (newVals.nationalId)
                    userUpdates.nationalId = newVals.nationalId;
                if (newVals.city)
                    userUpdates.city = newVals.city;
                if (newVals.vehiclePlate) {
                    userUpdates.vehiclePlate = newVals.vehiclePlate;
                    userUpdates.placa = newVals.vehiclePlate;
                }
                if (newVals.vehicleBrand)
                    userUpdates.vehicleBrand = newVals.vehicleBrand;
                if (newVals.vehicleModel)
                    userUpdates.vehicleModel = newVals.vehicleModel;
                if (newVals.vehicleYear) {
                    userUpdates.vehicleYear = newVals.vehicleYear;
                    userUpdates.year = newVals.vehicleYear;
                }
                if (newVals.vehicleColor) {
                    userUpdates.vehicleColor = newVals.vehicleColor;
                    userUpdates.color = newVals.vehicleColor;
                }
                tx.set(userRef, userUpdates, { merge: true });
                // Marcar solicitud como aplicada
                tx.update(reqRef, {
                    appliedAt: now,
                    updatedAt: now,
                });
                // Registrar Auditoría Inmutable
                const auditRef = db.collection("audit_events").doc();
                tx.set(auditRef, {
                    event: "COURIER_PROFILE_REQUEST_APPROVED",
                    domain: "COURIER_PROFILE",
                    courierId,
                    requestId,
                    triggeredBy: after.reviewedBy || "ADMIN",
                    oldValues: after.oldValues || {},
                    newValues: after.newValues || {},
                    timestamp: now,
                });
            });
            // Enviar notificación Push FCM al motorizado
            await sendCourierNotification(courierId, "✅ Perfil Actualizado Exitosamente", "Tu solicitud de modificación de información y/o vehículo ha sido aprobada por Administración.", { requestId, status: "APPROVED" });
            logger_1.Logger.info(`[COURIER-PROFILE] Solicitud requestId=${requestId} aprobada y aplicada atómicamente para courierId=${courierId}`);
        }
        catch (err) {
            logger_1.Logger.error(`[COURIER-PROFILE] Error aplicando aprobación de perfil para requestId=${requestId}`, {
                requestId,
                error: (err === null || err === void 0 ? void 0 : err.message) || err,
            });
            throw err;
        }
    }
    // ── CASO 2: RECHAZO ADMINISTRATIVO ───────────────────────────────────────
    else if (after.status === "REJECTED" && before.status !== "REJECTED") {
        const reason = after.rejectionReason || "Información o documentación inconsistente.";
        try {
            // Registrar Auditoría Inmutable
            await db.collection("audit_events").add({
                event: "COURIER_PROFILE_REQUEST_REJECTED",
                domain: "COURIER_PROFILE",
                courierId,
                requestId,
                triggeredBy: after.reviewedBy || "ADMIN",
                rejectionReason: reason,
                oldValues: after.oldValues || {},
                newValues: after.newValues || {},
                timestamp: FieldValue.serverTimestamp(),
            });
            // Enviar notificación Push FCM al motorizado
            await sendCourierNotification(courierId, "⚠️ Solicitud de Modificación No Aprobada", `Tu solicitud de cambio requiere corrección. Motivo: ${reason}`, { requestId, status: "REJECTED", reason });
            logger_1.Logger.info(`[COURIER-PROFILE] Solicitud requestId=${requestId} rechazada correctamente con motivo: ${reason}`);
        }
        catch (auditErr) {
            logger_1.Logger.warn(`[COURIER-PROFILE] Error registrando auditoría de rechazo para requestId=${requestId}`, { error: auditErr });
        }
    }
    return null;
});
//# sourceMappingURL=courierProfileRequests.js.map