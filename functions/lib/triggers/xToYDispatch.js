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
exports.onTripPaymentVerified = exports.onTripCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const xToYDispatchEngine_1 = require("../services/xToYDispatchEngine");
const logger_1 = require("../shared/logger/logger");
const emailService_1 = require("../services/emailService");
const db = admin.firestore();
/**
 * Resuelve los UIDs y correos de administradores autorizados para alertas operativas.
 */
async function getPlatformAdminRecipients() {
    const uids = new Set();
    const emails = new Set();
    try {
        const adminsSnap = await db.collection("users")
            .where("role", "in", ["admin", "ADMIN", "superadmin", "SUPERADMIN", "platform_admin", "PLATFORM_ADMIN"])
            .limit(10)
            .get();
        for (const doc of adminsSnap.docs) {
            uids.add(doc.id);
            const data = doc.data() || {};
            if (data.email && typeof data.email === "string" && data.email.includes("@")) {
                emails.add(data.email.trim().toLowerCase());
            }
        }
    }
    catch (err) {
        logger_1.Logger.warn("[X2Y_DISPATCH] Error consultando usuarios admin:", err === null || err === void 0 ? void 0 : err.message);
    }
    try {
        const globalCfg = await db.collection("system_config").doc("global").get();
        if (globalCfg.exists) {
            const gData = globalCfg.data() || {};
            if (gData.adminEmail && typeof gData.adminEmail === "string") {
                emails.add(gData.adminEmail.trim().toLowerCase());
            }
            if (Array.isArray(gData.adminNotificationEmails)) {
                gData.adminNotificationEmails.forEach((em) => {
                    if (typeof em === "string" && em.includes("@"))
                        emails.add(em.trim().toLowerCase());
                });
            }
        }
    }
    catch (cfgErr) {
        // ignore
    }
    if (emails.size === 0) {
        emails.add("soporte@bluesystemdelivery.com");
    }
    return { uids: Array.from(uids), emails: Array.from(emails) };
}
/**
 * Trigger: onTripCreated — Dominio B: Envíos X a Y (/deliveryTrips/{tripId})
 *
 * Se dispara al crearse una nueva encomienda express.
 * 1. Si requiere verificación de transferencia (PAYMENT_VERIFYING / PENDING_VERIFICATION),
 *    despacha notificación in-app (/users/{uid}/notifications), FCM campaign y Email corporativo.
 * 2. Si nace en PENDING o READY (Efectivo), ejecuta de inmediato la etapa inicial (SEARCHING_5KM).
 */
exports.onTripCreated = functions.firestore
    .document("deliveryTrips/{tripId}")
    .onCreate(async (snap, context) => {
    const tripId = context.params.tripId;
    const trip = snap.data();
    if (!trip)
        return null;
    const status = (trip.status || "").toString().toUpperCase().trim();
    const paymentStatus = (trip.paymentStatus || "").toString().toUpperCase().trim();
    const paymentMethod = (trip.paymentMethod || "").toString().toLowerCase().trim();
    // Caso A: Transferencia bancaria requiere verificación de comprobante por Admin
    if (status === "PAYMENT_VERIFYING" || paymentStatus === "PENDING_VERIFICATION" || paymentMethod === "transferencia") {
        logger_1.Logger.info(`[X2Y_DISPATCH] Viaje ${tripId} creado con pago por transferencia. Disparando pipeline de alertas administrativas.`);
        const customerFee = Number(trip.deliveryFee || trip.calculatedFee || trip.customerOffer || 0);
        const tripIdShort = tripId.slice(-6).toUpperCase();
        const notifTitle = "💳 Transferencia pendiente de verificación";
        const notifBody = `La encomienda X→Y #${tripIdShort} tiene un comprobante pendiente de revisión por C$ ${customerFee.toFixed(2)}.`;
        try {
            const { uids: adminUids, emails: adminEmails } = await getPlatformAdminRecipients();
            // 1. Encolar Campaña de Notificación FCM Idempotente
            const campaignDocId = `x2y_transfer_${tripId}_VERIFY`;
            const campaignRef = db.collection("notification_campaigns").doc(campaignDocId);
            const existingCamp = (await campaignRef.get()).exists;
            if (!existingCamp) {
                await campaignRef.set({
                    id: campaignDocId,
                    campaignId: campaignDocId,
                    title: notifTitle,
                    body: notifBody,
                    type: "OPERATIONAL",
                    category: "Transferencias",
                    priority: "HIGH",
                    status: "QUEUED",
                    targetType: "admin",
                    action: "OPEN_X_TO_Y_TRANSFER_VERIFICATION",
                    destinationType: "SCREEN",
                    destinationRoute: "delivery_express_transfer_verification",
                    navigationRoute: "delivery_express_transfer_verification",
                    tripId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
                    attempts: 0,
                });
            }
            // 2. Persistir Notificación In-App en el buzón /users/{adminUid}/notifications (Idempotente)
            const inAppPayload = {
                type: "X_TO_Y_TRANSFER_VERIFICATION",
                action: "OPEN_X_TO_Y_TRANSFER_VERIFICATION",
                tripId,
                orderId: tripId,
                paymentMethod: "transferencia",
                paymentStatus: "PENDING_VERIFICATION",
                amount: customerFee,
                referenceNumber: trip.referenceNumber || "",
                screen: "delivery_express_transfer_verification",
                title: notifTitle,
                body: notifBody,
                category: "Transferencias",
                priority: "HIGH",
                isRead: false,
                read: false,
                deletedByUser: false,
                visibilityStatus: "VISIBLE",
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                deepLink: `panel-admin/public/dashboard.html#deliveryExpress-transfer-verification?tripId=${tripId}`,
            };
            const batch = db.batch();
            for (const adminUid of adminUids) {
                // Idempotencia estricta SSOT: Mismo ID que campaignDocId evita duplicados con el queue worker
                const notifRef = db.collection("users").doc(adminUid).collection("notifications").doc(campaignDocId);
                batch.set(notifRef, Object.assign(Object.assign({}, inAppPayload), { id: campaignDocId, notificationId: campaignDocId }), { merge: true });
            }
            if (adminUids.length > 0) {
                await batch.commit();
                logger_1.Logger.info(`[X2Y_DISPATCH] Notificación in-app registrada para ${adminUids.length} administradores bajo ID ${campaignDocId}.`);
            }
            // 3. Despacho Idempotente de Correo Transaccional Corporativo (EmailService)
            const formattedDate = trip.createdAt && typeof trip.createdAt.toDate === "function"
                ? trip.createdAt.toDate().toLocaleString("es-NI", { dateStyle: "short", timeStyle: "short" })
                : new Date().toLocaleString("es-NI");
            for (const targetEmail of adminEmails) {
                try {
                    await emailService_1.EmailService.sendXToYTransferVerificationEmail({
                        tripId,
                        recipientEmail: targetEmail,
                        senderName: trip.senderName || "Cliente Remitente",
                        recipientName: trip.recipientName || "Destinatario",
                        amount: customerFee,
                        referenceNumber: trip.referenceNumber || "S/R",
                        formattedDate,
                    });
                    logger_1.Logger.info(`[X2Y_DISPATCH] Correo de verificación enviado exitosamente a ${targetEmail} para tripId=${tripId}`);
                }
                catch (emailErr) {
                    logger_1.Logger.warn(`[X2Y_DISPATCH] Error despachando correo a ${targetEmail}:`, emailErr === null || emailErr === void 0 ? void 0 : emailErr.message);
                }
            }
        }
        catch (pipelineErr) {
            logger_1.Logger.error(`[X2Y_DISPATCH] Error en pipeline de notificación admin para ${tripId}:`, pipelineErr);
        }
        return null;
    }
    if (status !== "PENDING" && status !== "READY") {
        logger_1.Logger.info(`[X2Y_DISPATCH] Viaje ${tripId} creado con estado ${status}. Omitiendo dispatch inicial.`);
        return null;
    }
    logger_1.Logger.info(`[X2Y_DISPATCH] Iniciando ciclo de despacho inicial para tripId=${tripId}`);
    try {
        const result = await (0, xToYDispatchEngine_1.advanceTripDispatch)(tripId);
        logger_1.Logger.info(`[X2Y_DISPATCH] Dispatch inicial completado para ${tripId}: stage=${result.stage}, candidatos=${result.eligibleCount}`);
    }
    catch (err) {
        logger_1.Logger.error(`[X2Y_DISPATCH] Error ejecutando dispatch inicial para ${tripId}`, err);
    }
    return null;
});
/**
 * Trigger: onTripPaymentVerified — Dominio B: Envíos X a Y (/deliveryTrips/{tripId})
 *
 * Cuando el Administrador aprueba la transferencia (PAYMENT_VERIFYING -> PENDING/READY),
 * dispara automáticamente el ciclo de despacho (advanceTripDispatch) para que los couriers
 * reciban la encomienda de inmediato sin esperar el cron scheduler.
 */
exports.onTripPaymentVerified = functions.firestore
    .document("deliveryTrips/{tripId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const tripId = context.params.tripId;
    if (!before || !after)
        return null;
    const beforeStatus = (before.status || "").toString().toUpperCase().trim();
    const afterStatus = (after.status || "").toString().toUpperCase().trim();
    const wasVerifying = beforeStatus === "PAYMENT_VERIFYING" || before.paymentVerified !== true || (before.paymentStatus || "").toString().toUpperCase() === "PENDING_VERIFICATION";
    const isNowApproved = (afterStatus === "PENDING" || afterStatus === "READY") && (after.paymentVerified === true || (after.paymentStatus || "").toString().toUpperCase() === "APPROVED");
    if (wasVerifying && isNowApproved) {
        logger_1.Logger.info(`[X2Y_DISPATCH] Transferencia aprobada para ${tripId}. Disparando despacho al pool de motorizados.`);
        try {
            const result = await (0, xToYDispatchEngine_1.advanceTripDispatch)(tripId);
            logger_1.Logger.info(`[X2Y_DISPATCH] Despacho post-verificación ejecutado para ${tripId}: stage=${result.stage}, candidatos=${result.eligibleCount}`);
        }
        catch (err) {
            logger_1.Logger.error(`[X2Y_DISPATCH] Error ejecutando despacho post-verificación para ${tripId}`, err);
        }
    }
    return null;
});
//# sourceMappingURL=xToYDispatch.js.map