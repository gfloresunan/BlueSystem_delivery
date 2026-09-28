"use strict";
/**
 * BlueSystem Delivery Enterprise — X→Y Delivery Express Admin Operations
 * Protocol: BSD-X2Y-TRANSFER-VERIFICATION-ENTERPRISE-001
 *
 * Callables autoritativos de administración para verificación y rechazo
 * de comprobantes de pago por transferencia en encomiendas punto a punto (X→Y).
 *
 * Cumple estrictamente:
 * 1. Validación de Roles EIAM y autenticación en backend.
 * 2. SSOT: /deliveryTrips/{tripId} es la entidad canónica de X→Y.
 * 3. Proyección espejo sincronizada en /orders/{tripId}.
 * 4. Liberación autoritativa e inmediata al pool de motorizados (advanceTripDispatch) tras aprobación.
 * 5. Trazabilidad inmutable en /audit_events.
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
exports.adminRejectXToYTransfer = exports.adminVerifyXToYTransfer = exports.VALID_REJECTION_REASONS = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const validator_1 = require("../shared/middleware/validator");
const xToYDispatchEngine_1 = require("../services/xToYDispatchEngine");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
exports.VALID_REJECTION_REASONS = [
    "Comprobante ilegible",
    "Monto incorrecto",
    "Referencia no válida",
    "Transferencia no localizada",
    "Comprobante inconsistente",
    "Otro",
];
/**
 * Callable: adminVerifyXToYTransfer
 *
 * Aprueba el comprobante de pago por transferencia de una encomienda express X→Y,
 * muta el estado financiero a APPROVED y libera inmediatamente el viaje a la flota.
 */
exports.adminVerifyXToYTransfer = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        allowedRoles: ["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN", "OPERATOR", "SUPERVISOR"],
    }, "adminVerifyXToYTransfer");
    const tripId = ((data === null || data === void 0 ? void 0 : data.tripId) || "").toString().trim();
    if (!tripId) {
        throw new functions.https.HttpsError("invalid-argument", "ID de encomienda (tripId) requerido.");
    }
    const callerEmail = ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email) || callerUid;
    logger_1.Logger.info(`[X2Y_ADMIN] Iniciando verificación transaccional para tripId=${tripId} por ${callerEmail}`);
    const tripRef = db.collection("deliveryTrips").doc(tripId);
    const orderRef = db.collection("orders").doc(tripId);
    let result = null;
    // Transacción atómica estricta: Previene condiciones de carrera (Admin A vs Admin B)
    const dispatchRequired = await db.runTransaction(async (transaction) => {
        const tripSnap = await transaction.get(tripRef);
        if (!tripSnap.exists) {
            throw new functions.https.HttpsError("not-found", `La encomienda express #${tripId} no existe.`);
        }
        const tripData = tripSnap.data() || {};
        const serviceType = tripData.serviceType || "X_TO_Y_DELIVERY";
        if (serviceType !== "X_TO_Y_DELIVERY") {
            throw new functions.https.HttpsError("failed-precondition", "La entidad no pertenece al dominio Delivery Express X→Y.");
        }
        const currentStatus = (tripData.status || "").toString().toUpperCase().trim();
        const currentPaymentStatus = (tripData.paymentStatus || "").toString().toUpperCase().trim();
        // Idempotencia: Si ya fue aprobada
        if (tripData.paymentVerified === true || currentPaymentStatus === "APPROVED" || currentPaymentStatus === "VERIFIED") {
            result = {
                success: true,
                alreadyProcessed: true,
                code: "ALREADY_VERIFIED",
                tripId,
                paymentStatus: "APPROVED",
                message: "La transferencia ya había sido aprobada previamente.",
            };
            return false;
        }
        // Carrera: Si fue rechazada concurrentemente por otro admin
        if (currentPaymentStatus === "REJECTED" || currentStatus === "PAYMENT_REJECTED") {
            throw new functions.https.HttpsError("failed-precondition", `La transferencia ya fue rechazada previamente (${tripData.paymentRejectionReason || "Rechazada"}). No puede aprobarse.`);
        }
        const now = FieldValue.serverTimestamp();
        // 1. Actualización Canónica en Dominio B: /deliveryTrips/{tripId}
        transaction.update(tripRef, {
            status: "PENDING",
            estado: "pendiente",
            paymentStatus: "APPROVED",
            paymentVerified: true,
            paymentVerifiedBy: callerEmail,
            paymentVerifiedAt: now,
            paymentVerificationAction: "APPROVED",
            verifiedAt: now,
            verifiedBy: callerEmail,
            updatedAt: now,
        });
        // 2. Sincronización en Proyección Operacional /orders/{tripId} (si existe)
        const orderSnap = await transaction.get(orderRef);
        if (orderSnap.exists) {
            transaction.update(orderRef, {
                status: "ready",
                paymentStatus: "APPROVED",
                paymentVerified: true,
                paymentVerifiedBy: callerEmail,
                paymentVerifiedAt: now,
                verifiedAt: now,
                verifiedBy: callerEmail,
                updatedAt: now,
            });
        }
        // 3. Registro en Auditoría Inmutable /audit_events
        const auditRef = db.collection("audit_events").doc();
        transaction.set(auditRef, {
            id: auditRef.id,
            action: "X2Y_TRANSFER_PAYMENT_APPROVED",
            module: "DELIVERY_EXPRESS",
            domain: "X_TO_Y_DELIVERY",
            tripId,
            orderId: tripId,
            previousStatus: currentStatus,
            previousPaymentStatus: currentPaymentStatus,
            newStatus: "PENDING",
            newPaymentStatus: "APPROVED",
            performedByUid: callerUid,
            performedByEmail: callerEmail,
            timestamp: now,
            metadata: {
                amount: tripData.deliveryFee || tripData.calculatedFee || 0,
                referenceNumber: tripData.referenceNumber || "",
                receiptPath: tripData.receiptPath || "",
            },
        });
        result = {
            success: true,
            alreadyProcessed: false,
            tripId,
            paymentStatus: "APPROVED",
            status: "PENDING",
            message: `Pago de encomienda #${tripId.slice(-6).toUpperCase()} verificado con éxito. Encomienda liberada al pool de repartidores.`,
        };
        return true;
    });
    if (result === null || result === void 0 ? void 0 : result.alreadyProcessed) {
        return result;
    }
    logger_1.Logger.info(`[X2Y_ADMIN] Transferencia para tripId=${tripId} aprobada atómicamente por ${callerEmail}`);
    // 4. Liberación autoritativa e inmediata al pool de motorizados (fuera de la transacción Firestore)
    if (dispatchRequired) {
        try {
            const dispatchResult = await (0, xToYDispatchEngine_1.advanceTripDispatch)(tripId);
            result.dispatched = !!dispatchResult;
            result.dispatchStage = (dispatchResult === null || dispatchResult === void 0 ? void 0 : dispatchResult.stage) || "SEARCHING_5KM";
            logger_1.Logger.info(`[X2Y_ADMIN] Despacho automático completado tras aprobación para ${tripId}: stage=${dispatchResult.stage}, candidatos=${dispatchResult.eligibleCount}`);
        }
        catch (dispatchErr) {
            logger_1.Logger.error(`[X2Y_ADMIN] Error al despachar encomienda aprobada ${tripId}:`, dispatchErr);
        }
    }
    return result;
});
/**
 * Callable: adminRejectXToYTransfer
 *
 * Rechaza el comprobante de pago de una encomienda express X→Y con motivo justificado,
 * bajo aislamiento transaccional estricto, impidiendo su despacho al pool de repartidores.
 */
exports.adminRejectXToYTransfer = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        allowedRoles: ["ADMIN", "SUPERADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN", "OPERATOR", "SUPERVISOR"],
    }, "adminRejectXToYTransfer");
    const tripId = ((data === null || data === void 0 ? void 0 : data.tripId) || "").toString().trim();
    const reason = ((data === null || data === void 0 ? void 0 : data.reason) || "").toString().trim();
    const details = ((data === null || data === void 0 ? void 0 : data.details) || "").toString().trim();
    if (!tripId) {
        throw new functions.https.HttpsError("invalid-argument", "ID de encomienda (tripId) requerido.");
    }
    if (!reason) {
        throw new functions.https.HttpsError("invalid-argument", "Debe especificar un motivo de rechazo.");
    }
    const fullReason = details ? `${reason}: ${details}` : reason;
    const callerEmail = ((_b = (_a = context.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email) || callerUid;
    logger_1.Logger.info(`[X2Y_ADMIN] Rechazando transaccionalmente comprobante para tripId=${tripId}. Motivo: ${fullReason}`);
    const tripRef = db.collection("deliveryTrips").doc(tripId);
    const orderRef = db.collection("orders").doc(tripId);
    return await db.runTransaction(async (transaction) => {
        const tripSnap = await transaction.get(tripRef);
        if (!tripSnap.exists) {
            throw new functions.https.HttpsError("not-found", `La encomienda express #${tripId} no existe.`);
        }
        const tripData = tripSnap.data() || {};
        const currentStatus = (tripData.status || "").toString().toUpperCase().trim();
        const currentPaymentStatus = (tripData.paymentStatus || "").toString().toUpperCase().trim();
        // Idempotencia: Si ya está rechazada
        if (currentPaymentStatus === "REJECTED" || currentStatus === "PAYMENT_REJECTED") {
            return {
                success: true,
                alreadyProcessed: true,
                code: "ALREADY_REJECTED",
                tripId,
                paymentStatus: "REJECTED",
                reason: tripData.paymentRejectionReason || fullReason,
                message: "La transferencia ya había sido rechazada previamente.",
            };
        }
        // Carrera: Si ya fue aprobada por otro admin
        if (tripData.paymentVerified === true || currentPaymentStatus === "APPROVED" || currentPaymentStatus === "VERIFIED") {
            throw new functions.https.HttpsError("failed-precondition", "La transferencia ya fue aprobada previamente por un administrador. No puede ser rechazada.");
        }
        const now = FieldValue.serverTimestamp();
        // 1. Dominio B: /deliveryTrips/{tripId}
        transaction.update(tripRef, {
            status: "PAYMENT_REJECTED",
            paymentStatus: "REJECTED",
            paymentVerified: false,
            paymentRejectionReason: fullReason,
            rejectionReason: fullReason,
            paymentRejectedBy: callerEmail,
            paymentRejectedAt: now,
            rejectedBy: callerEmail,
            rejectedAt: now,
            updatedAt: now,
        });
        // 2. Proyección Operacional: /orders/{tripId}
        const orderSnap = await transaction.get(orderRef);
        if (orderSnap.exists) {
            transaction.update(orderRef, {
                status: "payment_rejected",
                paymentStatus: "REJECTED",
                paymentVerified: false,
                paymentRejectionReason: fullReason,
                rejectionReason: fullReason,
                paymentRejectedBy: callerEmail,
                paymentRejectedAt: now,
                rejectedBy: callerEmail,
                rejectedAt: now,
                updatedAt: now,
            });
        }
        // 3. Auditoría Inmutable
        const auditRef = db.collection("audit_events").doc();
        transaction.set(auditRef, {
            id: auditRef.id,
            action: "X2Y_TRANSFER_PAYMENT_REJECTED",
            module: "DELIVERY_EXPRESS",
            domain: "X_TO_Y_DELIVERY",
            tripId,
            orderId: tripId,
            reason: fullReason,
            previousStatus: currentStatus,
            previousPaymentStatus: currentPaymentStatus,
            newStatus: "PAYMENT_REJECTED",
            newPaymentStatus: "REJECTED",
            performedByUid: callerUid,
            performedByEmail: callerEmail,
            timestamp: now,
        });
        logger_1.Logger.info(`[X2Y_ADMIN] Transferencia para tripId=${tripId} rechazada atómicamente por ${callerEmail}`);
        return {
            success: true,
            alreadyProcessed: false,
            tripId,
            paymentStatus: "REJECTED",
            status: "PAYMENT_REJECTED",
            reason: fullReason,
            message: `Transferencia rechazada para la encomienda #${tripId.slice(-6).toUpperCase()}.`,
        };
    });
});
//# sourceMappingURL=xToYAdmin.js.map