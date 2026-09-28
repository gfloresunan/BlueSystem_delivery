import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;

/**
 * Helper: Obtiene de forma canónica los tokens FCM activos para un usuario (soporta multi-dispositivo)
 */
async function getUserActiveTokens(uid: string): Promise<string[]> {
  if (!uid) return [];
  const queryRef = db
    .collection("user_devices")
    .where("uid", "==", uid)
    .where("isActive", "==", true);

  const snap = await queryRef.get();
  const tokens: string[] = [];

  snap.forEach((doc) => {
    const d = doc.data();
    const t = d?.fcmToken ? d?.fcmToken.trim() : "";
    if (t && t.length > 20 && !tokens.includes(t)) {
      tokens.push(t);
    }
  });
  return tokens;
}

/**
 * TRIGGER: Nuevo mensaje en /deliveryTrips/{tripId}/messages/{messageId} (Dominio B: X->Y Delivery)
 * 1. Resuelve autoritativamente al receptor desde el viaje (/deliveryTrips/{tripId})
 * 2. Emite notificación push FCM multi-dispositivo
 * 3. Actualiza contadores y metadatos agregados en /deliveryTrips/{tripId} (Zero N+1 reads)
 */
export const onTripChatMessageCreated = functions.firestore
  .document("deliveryTrips/{tripId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { tripId, messageId } = context.params;

    if (!message) return null;

    const senderRole = (message.senderRole || "").toString().toUpperCase().trim();
    const senderId = (message.senderId || "").toString().trim();
    const senderName = message.senderNameSnapshot || message.senderName || "Mensaje del envío";
    const rawText = (message.text || "").toString().trim();
    const messagePreview = rawText.length > 100 ? `${rawText.substring(0, 97)}...` : rawText;

    try {
      // 1. Obtener el viaje de forma autoritativa
      const tripRef = db.collection("deliveryTrips").doc(tripId);
      const tripSnap = await tripRef.get();

      if (!tripSnap.exists) {
        functions.logger.warn(`[TRIP_CHAT_TRIGGER] Viaje ${tripId} no existe para el mensaje ${messageId}`);
        return null;
      }

      const tripData = tripSnap.data() || {};
      const customerId = (tripData.customerId || tripData.clienteId || "").toString().trim();
      const assignedCourierId = (tripData.assignedCourierId || tripData.courierId || tripData.motorizadoId || "").toString().trim();
      const tripNumber = tripId.slice(-6).toUpperCase();

      // 2. Determinar destinatario seguro
      let recipientUid = "";
      let recipientRole = "";

      if (senderRole === "CUSTOMER") {
        recipientUid = assignedCourierId;
        recipientRole = "COURIER";
      } else if (senderRole === "COURIER") {
        recipientUid = customerId;
        recipientRole = "CUSTOMER";
      }

      // Si no hay destinatario asignado o el sender es el mismo que recipient
      if (!recipientUid || recipientUid === senderId) {
        functions.logger.info(`[TRIP_CHAT_TRIGGER] Sin destinatario válido para tripId=${tripId}, senderRole=${senderRole}`);
      } else {
        // 3. Enviar FCM multi-dispositivo
        const tokens = await getUserActiveTokens(recipientUid);
        if (tokens.length > 0) {
          const pushTitle = senderRole === "COURIER" 
            ? `🛵 Motorizado (${senderName})`
            : `📦 Cliente: Envío #${tripNumber}`;

          await messaging.sendEachForMulticast({
            tokens,
            data: {
              action: "TRIP_CHAT_MESSAGE",
              tripId,
              orderId: tripId,
              domain: "X_TO_Y_TRIP",
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
            } as any,
          });
          functions.logger.info(`[TRIP_CHAT_TRIGGER] FCM enviado a ${recipientUid} (${tokens.length} dispositivos) para tripId=${tripId}`);
        }
      }

      // 4. Actualización atómica de metadatos en el viaje
      const updateData: Record<string, any> = {
        hasConversation: true,
        messageCount: FieldValue.increment(1),
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessageText: messagePreview,
        lastMessageSenderRole: senderRole,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (senderRole === "CUSTOMER") {
        updateData.unreadCourierCount = FieldValue.increment(1);
      } else if (senderRole === "COURIER") {
        updateData.unreadCustomerCount = FieldValue.increment(1);
      }

      await tripRef.update(updateData);

      // 5. Registrar evento de auditoría
      await db.collection("audit_events").add({
        event: "TRIP_CHAT_MESSAGE_SENT",
        tripId,
        messageId,
        senderId,
        senderRole,
        recipientUid: recipientUid || null,
        timestamp: FieldValue.serverTimestamp(),
      });

      return null;
    } catch (error: any) {
      functions.logger.error(`[TRIP_CHAT_TRIGGER_ERROR] Error procesando mensaje ${messageId} en viaje ${tripId}:`, error);
      return null;
    }
  });
