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
exports.onOrderChatMessageCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;
/**
 * Helper: Obtiene de forma canónica los tokens FCM activos para un usuario (soporta multi-dispositivo)
 */
async function getUserActiveTokens(uid) {
    if (!uid)
        return [];
    const queryRef = db
        .collection("user_devices")
        .where("uid", "==", uid)
        .where("isActive", "==", true);
    const snap = await queryRef.get();
    const tokens = [];
    snap.forEach((doc) => {
        const d = doc.data();
        const t = (d === null || d === void 0 ? void 0 : d.fcmToken) ? d === null || d === void 0 ? void 0 : d.fcmToken.trim() : "";
        if (t && t.length > 20 && !tokens.includes(t)) {
            tokens.push(t);
        }
    });
    return tokens;
}
/**
 * TRIGGER: Nuevo mensaje en /orders/{orderId}/messages/{messageId}
 * 1. Resuelve autoritativamente al receptor desde la orden (/orders/{orderId})
 * 2. Emite notificación push FCM multi-dispositivo
 * 3. Actualiza contadores y metadatos agregados en /orders/{orderId} (Zero N+1 reads)
 */
exports.onOrderChatMessageCreated = functions.firestore
    .document("orders/{orderId}/messages/{messageId}")
    .onCreate(async (snap, context) => {
    const message = snap.data();
    const { orderId, messageId } = context.params;
    if (!message)
        return null;
    const senderRole = (message.senderRole || "").toString().toUpperCase().trim();
    const senderId = (message.senderId || "").toString().trim();
    const senderName = message.senderNameSnapshot || message.senderName || "Mensaje del pedido";
    const rawText = (message.text || "").toString().trim();
    const messagePreview = rawText.length > 100 ? `${rawText.substring(0, 97)}...` : rawText;
    try {
        // 1. Obtener la orden de forma autoritativa
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            functions.logger.warn(`[CHAT_TRIGGER] Orden ${orderId} no existe para el mensaje ${messageId}`);
            return null;
        }
        const orderData = orderSnap.data() || {};
        const customerId = (orderData.customerId || orderData.clienteId || "").toString().trim();
        const assignedCourierId = (orderData.assignedCourierId || orderData.motorizadoId || "").toString().trim();
        const orderNumber = (orderData.orderNumber || orderId.slice(-6).toUpperCase()).toString();
        // 2. Determinar destinatario seguro
        let recipientUid = "";
        let recipientRole = "";
        if (senderRole === "CUSTOMER") {
            recipientUid = assignedCourierId;
            recipientRole = "COURIER";
        }
        else if (senderRole === "COURIER") {
            recipientUid = customerId;
            recipientRole = "CUSTOMER";
        }
        // Si no hay destinatario asignado o el sender es el mismo que recipient
        if (!recipientUid || recipientUid === senderId) {
            functions.logger.info(`[CHAT_TRIGGER] Sin destinatario válido para orderId=${orderId}, senderRole=${senderRole}`);
        }
        else {
            // 3. Enviar FCM multi-dispositivo
            const tokens = await getUserActiveTokens(recipientUid);
            if (tokens.length > 0) {
                const pushTitle = senderRole === "COURIER"
                    ? `🛵 Motorizado (${senderName})`
                    : `💬 Cliente: Pedido #${orderNumber}`;
                await messaging.sendEachForMulticast({
                    tokens,
                    data: {
                        action: "ORDER_CHAT_MESSAGE",
                        orderId,
                        messageId,
                        senderId,
                        senderRole,
                        senderName,
                        messagePreview,
                        screen: "order_chat",
                        title: pushTitle,
                        body: messagePreview,
                    },
                    android: {
                        priority: "high",
                        directBootOk: true,
                    },
                });
                functions.logger.info(`[CHAT_TRIGGER] FCM enviado a ${recipientUid} (${tokens.length} dispositivos) para orderId=${orderId}`);
            }
        }
        // 4. Actualización atómica de metadatos en la orden para optimización y cero N+1
        const updateData = {
            hasConversation: true,
            messageCount: FieldValue.increment(1),
            lastMessageAt: FieldValue.serverTimestamp(),
            lastMessageText: messagePreview,
            lastMessageSenderRole: senderRole,
            updatedAt: FieldValue.serverTimestamp(),
        };
        if (senderRole === "CUSTOMER") {
            updateData.unreadCourierCount = FieldValue.increment(1);
        }
        else if (senderRole === "COURIER") {
            updateData.unreadCustomerCount = FieldValue.increment(1);
        }
        await orderRef.update(updateData);
        // 5. Registrar evento de auditoría
        await db.collection("audit_events").add({
            event: "ORDER_CHAT_MESSAGE_SENT",
            orderId,
            messageId,
            senderId,
            senderRole,
            recipientUid: recipientUid || null,
            timestamp: FieldValue.serverTimestamp(),
        });
        return null;
    }
    catch (error) {
        functions.logger.error(`[CHAT_TRIGGER_ERROR] Error procesando mensaje ${messageId} en orden ${orderId}:`, error);
        return null;
    }
});
//# sourceMappingURL=orderChat.js.map