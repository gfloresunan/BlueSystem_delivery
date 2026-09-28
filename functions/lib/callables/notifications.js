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
exports.sendPushNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../shared/logger/logger");
const validator_1 = require("../shared/middleware/validator");
const db = admin.firestore();
const messaging = admin.messaging();
/**
 * 6. CALLABLE: sendPushNotification (OPTIMIZADA O(1) / Consultas Indexadas)
 * Envía notificaciones Push (FCM) masivas o segmentadas sin realizar escaneos O(N) de la BD.
 */
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
    const { uid: callerUid } = (0, validator_1.validateCallableContext)(context, data, {
        requireAuth: true,
        requireAppCheck: true,
        allowedRoles: ["ADMIN", "SUPER_ADMIN", "SUPERVISOR", "SUPPORT", "AUDITOR", "admin", "super_admin", "supervisor", "call_center", "marketing"],
        requiredFields: ["title", "body"],
    }, "sendPushNotification");
    try {
        const startTime = Date.now();
        const { title, body, imageUrl, actionUrl, targetType, segment, targetUids } = data;
        // Consultar únicamente dispositivos activos e indexados
        let devicesQuery = db.collection("user_devices").where("isActive", "==", true);
        const targetTypeLower = (targetType || "all").toString().toLowerCase().trim();
        const actionLower = (data.action || data.type || "").toString().toLowerCase().trim();
        const isPromo = actionLower.includes("promo") ||
            actionLower.includes("coupon") ||
            actionLower.includes("descuento") ||
            actionLower.includes("marketing") ||
            (title || "").toLowerCase().includes("descuento") ||
            (title || "").toLowerCase().includes("envío gratis") ||
            (title || "").toLowerCase().includes("hora feliz");
        if (Array.isArray(targetUids) && targetUids.length > 0) {
            // Búsqueda canónica multi-dispositivo por campo "uid" (soporta hasta 30 UIDs por lote de consulta Firestore "in")
            devicesQuery = devicesQuery.where("uid", "in", targetUids.slice(0, 30));
        }
        else if (targetTypeLower === "segment" && segment) {
            const segLower = segment.toString().toLowerCase().trim();
            devicesQuery = devicesQuery.where("role", "==", segLower);
        }
        else if (["courier", "driver", "motorizado"].includes(targetTypeLower)) {
            devicesQuery = devicesQuery.where("role", "in", ["courier", "driver", "motorizado"]);
        }
        else if (["customer", "cliente"].includes(targetTypeLower)) {
            devicesQuery = devicesQuery.where("role", "in", ["customer", "cliente"]);
        }
        else if (["business", "comercio", "merchant"].includes(targetTypeLower)) {
            devicesQuery = devicesQuery.where("role", "in", ["business", "comercio", "merchant"]);
        }
        else if (["admin", "super_admin"].includes(targetTypeLower)) {
            devicesQuery = devicesQuery.where("role", "in", ["admin", "super_admin"]);
        }
        else if (targetTypeLower === "all" && isPromo) {
            // Promoción masiva por defecto dirigida a clientes
            devicesQuery = devicesQuery.where("role", "in", ["customer", "cliente"]);
        }
        else if (targetTypeLower !== "all") {
            devicesQuery = devicesQuery.where("role", "==", targetTypeLower);
        }
        const devicesSnap = await devicesQuery.get();
        const validTokensMap = new Map(); // token -> userUid
        let androidDevices = 0;
        let iosDevices = 0;
        let invalidTokensCount = 0;
        devicesSnap.forEach((doc) => {
            const dData = doc.data();
            const deviceDocId = doc.id;
            const userUid = dData.uid || deviceDocId.split("_")[0];
            const token = dData.fcmToken ? dData.fcmToken.trim() : "";
            const platform = (dData.platform || "Android").toLowerCase();
            if (platform.includes("ios"))
                iosDevices++;
            else
                androidDevices++;
            if (token && token.length > 20) {
                if (!validTokensMap.has(token)) {
                    validTokensMap.set(token, userUid);
                }
            }
            else {
                invalidTokensCount++;
            }
        });
        const tokensArray = Array.from(validTokensMap.keys());
        const recipientUidsList = Array.from(validTokensMap.values());
        const tokensFound = tokensArray.length;
        let notificationsSent = 0;
        let notificationsFailed = 0;
        let cleanedTokensCount = 0;
        if (tokensFound > 0) {
            const action = data.action || data.type || "";
            const isOperativeAction = [
                "NEW_ORDER",
                "ORDER_ASSIGNED",
                "ORDER_STATUS",
                "ORDER_STATUS_CHANGED",
                "ORDER_CANCELLED",
                "PAYMENT_REJECTED",
                "PAYMENT_STATUS",
                "FCM_TEST",
                "FCM_DATA_TEST",
            ].includes(String(action).toUpperCase()) ||
                data.isDataOnly === true ||
                data.payloadType === "data_only";
            const dataMap = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ title: String(title || ""), body: String(body || "") }, (action ? { action: String(action) } : {})), (data.type ? { type: String(data.type) } : {})), (data.orderId ? { orderId: String(data.orderId) } : {})), (data.testId ? { testId: String(data.testId) } : {})), (data.timestamp ? { timestamp: String(data.timestamp) } : {})), (imageUrl ? { imageUrl: String(imageUrl) } : {})), (actionUrl ? { actionUrl: String(actionUrl) } : {}));
            const notificationPayload = Object.assign(Object.assign({ tokens: [] }, (isOperativeAction ? {} : { notification: Object.assign({ title, body }, (imageUrl ? { imageUrl } : {})) })), { data: dataMap, android: {
                    priority: "high",
                    directBootOk: true,
                } });
            for (let i = 0; i < tokensArray.length; i += 500) {
                const chunk = tokensArray.slice(i, i + 500);
                const response = await messaging.sendEachForMulticast(Object.assign(Object.assign({}, notificationPayload), { tokens: chunk }));
                notificationsSent += response.successCount;
                notificationsFailed += response.failureCount;
                if (response.failureCount > 0) {
                    const batch = db.batch();
                    let batchCount = 0;
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success && resp.error) {
                            const errCode = resp.error.code || "";
                            const errMessage = resp.error.message || "";
                            if (errCode.includes("registration-token-not-registered") ||
                                errCode.includes("invalid-registration-token") ||
                                errMessage.includes("NotRegistered")) {
                                const failedToken = chunk[idx];
                                const failedUid = validTokensMap.get(failedToken);
                                if (failedUid) {
                                    const devRef = db.collection("user_devices").doc(failedUid);
                                    batch.update(devRef, {
                                        fcmToken: null,
                                        isActive: false,
                                        tokenStatus: "invalid",
                                        lastCleanedAt: admin.firestore.FieldValue.serverTimestamp(),
                                    });
                                    batchCount++;
                                    cleanedTokensCount++;
                                }
                            }
                        }
                    });
                    if (batchCount > 0) {
                        await batch.commit();
                    }
                }
            }
        }
        const executionTimeMs = Date.now() - startTime;
        const notificationDoc = await db.collection("notifications").add({
            title,
            body,
            imageUrl: imageUrl || "",
            actionUrl: actionUrl || "",
            targetType: targetType || "all",
            targetSegment: segment || "",
            targetDevices: tokensFound,
            successCount: notificationsSent,
            failureCount: notificationsFailed,
            invalidTokens: invalidTokensCount,
            cleanedTokens: cleanedTokensCount,
            status: notificationsSent > 0 ? "sent" : tokensFound === 0 ? "no_devices" : "failed",
            executionTimeMs,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: callerUid,
        });
        if (recipientUidsList.length > 0) {
            for (let i = 0; i < recipientUidsList.length; i += 500) {
                const chunk = recipientUidsList.slice(i, i + 500);
                const batch = db.batch();
                let opsInBatch = 0;
                chunk.forEach((uid) => {
                    // Escribir notificación en buzón de usuario ÚNICAMENTE para usuarios registrados legítimos (no Guest)
                    if (uid && !uid.startsWith("guest_") && !uid.startsWith("device_")) {
                        const userNotifRef = db
                            .collection("users")
                            .doc(uid)
                            .collection("notifications")
                            .doc(notificationDoc.id);
                        batch.set(userNotifRef, {
                            title,
                            body,
                            imageUrl: imageUrl || "",
                            actionUrl: actionUrl || "",
                            sentAt: admin.firestore.FieldValue.serverTimestamp(),
                            isRead: false,
                        });
                        opsInBatch++;
                    }
                });
                if (opsInBatch > 0) {
                    await batch.commit();
                }
            }
        }
        logger_1.Logger.info(`Campana Push FCM finalizada: ${notificationsSent} enviadas en ${executionTimeMs}ms`, {
            module: "sendPushNotification",
            userId: callerUid,
            duration: executionTimeMs,
            status: "SUCCESS",
        });
        return {
            success: true,
            devicesFound: tokensFound,
            notificationsSent,
            notificationsFailed,
            cleanedTokens: cleanedTokensCount,
            campaignId: notificationDoc.id,
            executionTimeMs,
            message: `${notificationsSent} notificaciones enviadas correctamente en ${executionTimeMs}ms.`,
        };
    }
    catch (e) {
        logger_1.Logger.error("Error en sendPushNotification execution", e, { module: "sendPushNotification", userId: callerUid });
        throw new functions.https.HttpsError("internal", e.message || "Error al enviar notificaciones.");
    }
});
//# sourceMappingURL=notifications.js.map