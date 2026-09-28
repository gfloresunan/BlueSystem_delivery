"use strict";
/**
 * BlueSystem Delivery Enterprise — Cancel Delivery Trip (Server-Authoritative)
 * Protocol: BSD-X2Y-CANCELLATION-RATING-COURIER-TRIP-METRICS-UX-001
 *
 * Permite la cancelación atómica de encomiendas Punto A → Punto B (/deliveryTrips/{tripId})
 * garantizando el punto de corte por custodia física (pickedUpAt / pickupArrivedAt),
 * previniendo condiciones de carrera con la aceptación del motorizado,
 * registrando auditoría inmutable en /audit_events y despachando notificaciones FCM idempotentes.
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
exports.cancelDeliveryTrip = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;
exports.cancelDeliveryTrip = functions.https.onCall(async (data, context) => {
    // 1. Validar autenticación
    if (!context.auth || !context.auth.uid) {
        throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión para realizar esta operación.");
    }
    const callerUid = context.auth.uid;
    const tripId = ((data === null || data === void 0 ? void 0 : data.tripId) || "").trim();
    if (!tripId) {
        throw new functions.https.HttpsError("invalid-argument", "El identificador del viaje (tripId) es obligatorio.");
    }
    const cancellationReason = ((data === null || data === void 0 ? void 0 : data.reason) || "").trim() || "CANCELLED_BY_USER";
    const requestedRole = ((data === null || data === void 0 ? void 0 : data.actorRole) || "CUSTOMER").toUpperCase();
    // 2. Resolver y validar rol del solicitante
    const token = context.auth.token || {};
    const rawRole = (token.role || token.eiamRole || "").toString().toUpperCase();
    const isAdminCaller = rawRole === "ADMIN" ||
        rawRole === "SUPER_ADMIN" ||
        rawRole === "PLATFORM_ADMIN" ||
        rawRole === "AUDITOR" ||
        rawRole === "OPERATOR" ||
        rawRole === "SUPERVISOR" ||
        token.admin === true ||
        token.isSuperAdmin === true ||
        token.isPlatformAdmin === true;
    const effectiveRole = isAdminCaller && requestedRole === "PLATFORM_ADMIN" ? "PLATFORM_ADMIN" : "CUSTOMER";
    let courierToNotifyUid = null;
    let customerToNotifyUid = null;
    let previousStatusForAudit = "UNKNOWN";
    // 3. Transacción atómica Server-Authoritative
    await db.runTransaction(async (transaction) => {
        const tripRef = db.collection("deliveryTrips").doc(tripId);
        const tripSnap = await transaction.get(tripRef);
        if (!tripSnap.exists) {
            throw new functions.https.HttpsError("not-found", "La encomienda solicitada no existe.");
        }
        const tripData = tripSnap.data() || {};
        const currentStatus = (tripData.status || tripData.estado || "PENDING").toString().toUpperCase().trim();
        previousStatusForAudit = currentStatus;
        // A. Validar Ownership si es cliente
        const customerId = (tripData.customerId || tripData.clienteId || "").toString().trim();
        customerToNotifyUid = customerId || null;
        if (effectiveRole === "CUSTOMER") {
            if (customerId && customerId !== callerUid) {
                throw new functions.https.HttpsError("permission-denied", "No tienes autorización para cancelar una encomienda ajena.");
            }
        }
        // B. Validar si ya está en estado terminal
        if (currentStatus === "CANCELLED" || currentStatus === "CANCELADO") {
            throw new functions.https.HttpsError("already-exists", "Esta encomienda ya ha sido cancelada previamente.");
        }
        if (currentStatus === "DELIVERED" || currentStatus === "ENTREGADO" || currentStatus === "COMPLETED" || currentStatus === "COMPLETADO") {
            throw new functions.https.HttpsError("failed-precondition", "No se puede cancelar una encomienda que ya ha sido entregada.");
        }
        // C. Validar Punto de Corte de Custodia Física
        // Si el motorizado ya tiene el paquete (pickedUpAt != null o status PICKED_UP / IN_TRANSIT)
        const hasPickedUp = Boolean(tripData.pickedUpAt) || currentStatus === "PICKED_UP" || currentStatus === "IN_TRANSIT";
        if (hasPickedUp) {
            throw new functions.https.HttpsError("failed-precondition", "PAQUETE_YA_RECOGIDO: El motorizado ya tiene tu paquete. La encomienda no puede cancelarse en este momento.");
        }
        // Si el motorizado ya llegó al punto de recogida (pickupArrivedAt != null)
        const hasArrivedAtPickup = Boolean(tripData.pickupArrivedAt);
        if (hasArrivedAtPickup) {
            throw new functions.https.HttpsError("failed-precondition", "ENCOMIENDA_NO_CANCELABLE: El motorizado ya llegó al punto de recogida y tu paquete se encuentra en proceso de recogida o ya fue recogido. Por seguridad, la encomienda ya no puede cancelarse.");
        }
        // D. Resolver motorizado asignado si existiese
        const assignedCourierId = (tripData.assignedCourierId ||
            tripData.courierId ||
            tripData.motorizadoId ||
            "").toString().trim();
        if (assignedCourierId) {
            courierToNotifyUid = assignedCourierId;
        }
        const now = FieldValue.serverTimestamp();
        // E. Mutar /deliveryTrips/{tripId} a CANCELLED
        transaction.update(tripRef, {
            status: "CANCELLED",
            estado: "cancelado",
            cancelReason: cancellationReason,
            cancelledAt: now,
            cancelledBy: callerUid,
            cancelledByRole: effectiveRole,
            updatedAt: now,
        });
        // F. Sincronizar espejo en /orders/{tripId} si existe
        const orderRef = db.collection("orders").doc(tripId);
        transaction.set(orderRef, {
            status: "cancelled",
            estado: "cancelado",
            cancelReason: cancellationReason,
            cancelledAt: now,
            cancelledBy: callerUid,
            cancelledByRole: effectiveRole,
            updatedAt: now,
        }, { merge: true });
        // G. Asentar evento inmutable en /audit_events
        const auditEventRef = db.collection("audit_events").doc();
        transaction.set(auditEventRef, {
            id: auditEventRef.id,
            eventType: "X2Y_TRIP_CANCELLED",
            tripId: tripId,
            actorUid: callerUid,
            actorRole: effectiveRole,
            previousStatus: previousStatusForAudit,
            newStatus: "CANCELLED",
            reason: cancellationReason,
            timestamp: now,
        });
    });
    // 4. Despacho FCM Asíncrono e Idempotente
    const shortId = tripId.slice(-6).toUpperCase();
    // Notificar al motorizado si estaba asignado
    if (courierToNotifyUid) {
        try {
            const tokensSnap = await db
                .collection("user_devices")
                .where("uid", "==", courierToNotifyUid)
                .where("isActive", "==", true)
                .get();
            const tokens = [];
            tokensSnap.forEach((doc) => {
                var _a;
                const t = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
                if (t && typeof t === "string" && t.length > 20 && !tokens.includes(t)) {
                    tokens.push(t);
                }
            });
            if (tokens.length > 0) {
                await messaging.sendEachForMulticast({
                    tokens,
                    notification: {
                        title: "❌ Encomienda cancelada",
                        body: `La encomienda #${shortId} ya no requiere recogida.`,
                    },
                    data: {
                        type: "TRIP_CANCELLED",
                        tripId: tripId,
                        status: "CANCELLED",
                    },
                });
            }
        }
        catch (fcmErr) {
            functions.logger.warn(`[CANCEL_TRIP_FCM] Error notificando a courier ${courierToNotifyUid}:`, fcmErr);
        }
    }
    // Si canceló el Admin, notificar al cliente
    if (effectiveRole === "PLATFORM_ADMIN" && customerToNotifyUid && customerToNotifyUid !== callerUid) {
        try {
            const custTokensSnap = await db
                .collection("user_devices")
                .where("uid", "==", customerToNotifyUid)
                .where("isActive", "==", true)
                .get();
            const custTokens = [];
            custTokensSnap.forEach((doc) => {
                var _a;
                const t = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
                if (t && typeof t === "string" && t.length > 20 && !custTokens.includes(t)) {
                    custTokens.push(t);
                }
            });
            if (custTokens.length > 0) {
                await messaging.sendEachForMulticast({
                    tokens: custTokens,
                    notification: {
                        title: "❌ Encomienda cancelada",
                        body: `Tu encomienda #${shortId} fue cancelada por administración.`,
                    },
                    data: {
                        type: "TRIP_CANCELLED",
                        tripId: tripId,
                        status: "CANCELLED",
                    },
                });
            }
        }
        catch (fcmCustErr) {
            functions.logger.warn(`[CANCEL_TRIP_FCM] Error notificando a cliente ${customerToNotifyUid}:`, fcmCustErr);
        }
    }
    return {
        success: true,
        tripId: tripId,
        status: "CANCELLED",
        cancelledByRole: effectiveRole,
        reason: cancellationReason,
    };
});
//# sourceMappingURL=cancelDeliveryTrip.js.map