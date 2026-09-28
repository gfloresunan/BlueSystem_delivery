import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Logger } from "../shared/logger/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Trigger: onSupportTicketCreated
 * Se ejecuta al crear un nuevo ticket de soporte. Notifica a los administradores.
 */
export const onSupportTicketCreated = functions.firestore
  .document("support_tickets/{ticketId}")
  .onCreate(async (snap, context) => {
    const ticketId = context.params.ticketId;
    const ticketData = snap.data();
    if (!ticketData) return;

    const customerName = ticketData.customerName || "Cliente";
    const subject = ticketData.subject || "Nuevo ticket de soporte";

    Logger.info(`[SUPPORT_TICKETS] Nuevo ticket creado: ${ticketId} por ${customerName} (${ticketData.customerId})`);

    try {
      // Buscar dispositivos de administradores y soporte
      const adminDevicesSnap = await db.collection("user_devices")
        .where("isActive", "==", true)
        .where("role", "in", ["admin", "super_admin", "support", "ADMIN", "SUPER_ADMIN", "SUPPORT"])
        .get();

      const tokens: string[] = [];
      adminDevicesSnap.forEach((doc) => {
        const token = doc.data().fcmToken || doc.data().token;
        if (token && typeof token === "string" && !tokens.includes(token)) {
          tokens.push(token);
        }
      });

      if (tokens.length > 0) {
        const displayTicketId = typeof ticketId === "string" ? ticketId.substring(0, 8).toUpperCase() : ticketId;
        const payload: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
            title: `🎫 Nuevo Ticket de Soporte (#${displayTicketId})`,
            body: `${customerName}: ${subject}`,
          },
          data: {
            type: "SUPPORT_TICKET_NEW",
            ticketId,
            customerId: ticketData.customerId || "",
          },
        };

        const response = await messaging.sendEachForMulticast(payload);
        Logger.info(`[SUPPORT_TICKETS] Notificación enviada a ${response.successCount}/${tokens.length} administradores`);
      }
    } catch (err: any) {
      Logger.error(`[SUPPORT_TICKETS] Error notificando a administradores para ticket ${ticketId}:`, err);
    }
  });

/**
 * Trigger: onSupportTicketMessageCreated
 * Se ejecuta cuando se crea un mensaje dentro de un ticket (/support_tickets/{ticketId}/messages/{messageId}).
 * Actualiza el ticket padre y despacha FCM al destinatario correspondiente.
 */
export const onSupportTicketMessageCreated = functions.firestore
  .document("support_tickets/{ticketId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const ticketId = context.params.ticketId;
    const messageId = context.params.messageId;
    const msgData = snap.data();
    if (!msgData) return;

    const senderRole = (msgData.senderRole || "CUSTOMER").toString().toUpperCase();
    const messageText = msgData.text || msgData.message || "";
    const senderName = msgData.senderName || (senderRole === "ADMIN" ? "Soporte BlueSystem" : "Cliente");

    Logger.info(`[SUPPORT_TICKETS] Mensaje creado en ticket ${ticketId} por ${senderRole} (${senderName})`);

    try {
      const ticketRef = db.collection("support_tickets").doc(ticketId);
      const ticketDoc = await ticketRef.get();
      if (!ticketDoc.exists) return;
      const ticket = ticketDoc.data() || {};

      const now = admin.firestore.Timestamp.now();

      if (senderRole === "ADMIN") {
        // ── 1. Administrador respondió → Actualizar ticket y notificar al cliente ──
        const newStatus = ticket.status === "CLOSED" || ticket.status === "RESOLVED" ? ticket.status : "WAITING_CUSTOMER";

        await ticketRef.update({
          lastMessage: messageText,
          lastMessageSender: "ADMIN",
          lastMessageAt: now,
          status: newStatus,
          unreadByCustomer: admin.firestore.FieldValue.increment(1),
          updatedAt: now,
        });

        const customerId = ticket.customerId;
        if (customerId) {
          // A. Registrar notificación en /users/{customerId}/notifications
          const notifId = `notif_sup_${ticketId}_${Date.now()}`;
          await db.collection("users").doc(customerId).collection("notifications").doc(notifId).set({
            id: notifId,
            userId: customerId,
            title: "Soporte BlueSystem 🎧",
            message: `Soporte respondió a tu solicitud: "${messageText.length > 60 ? messageText.substring(0, 57) + '...' : messageText}"`,
            type: "support",
            category: "support",
            entityType: "SUPPORT_TICKET",
            entityId: ticketId,
            isRead: false,
            read: false,
            sentAt: now,
            createdAt: now,
          });

          // B. Enviar Push FCM a los dispositivos del cliente
          const customerDevicesSnap = await db.collection("user_devices")
            .where("uid", "==", customerId)
            .where("isActive", "==", true)
            .get();

          const tokens: string[] = [];
          customerDevicesSnap.forEach((doc) => {
            const token = doc.data().fcmToken || doc.data().token;
            if (token && typeof token === "string" && !tokens.includes(token)) {
              tokens.push(token);
            }
          });

          if (tokens.length > 0) {
            const payload: admin.messaging.MulticastMessage = {
              tokens,
              notification: {
                title: "Soporte BlueSystem 🎧",
                body: `Soporte respondió a tu solicitud: ${messageText}`,
              },
              data: {
                type: "SUPPORT_REPLY",
                ticketId,
                click_action: "FLUTTER_NOTIFICATION_CLICK",
              },
            };
            const res = await messaging.sendEachForMulticast(payload);
            Logger.info(`[SUPPORT_TICKETS] Notificación enviada al cliente ${customerId} (${res.successCount}/${tokens.length} dispositivos)`);
          }
        }
      } else {
        // ── 2. Cliente respondió → Actualizar ticket y notificar al staff de soporte ──
        const newStatus = ticket.status === "CLOSED" ? "CLOSED" : "WAITING_ADMIN";

        await ticketRef.update({
          lastMessage: messageText,
          lastMessageSender: "CUSTOMER",
          lastMessageAt: now,
          status: newStatus,
          unreadByAdmin: admin.firestore.FieldValue.increment(1),
          updatedAt: now,
        });

        // Notificar a administradores
        const adminDevicesSnap = await db.collection("user_devices")
          .where("isActive", "==", true)
          .where("role", "in", ["admin", "super_admin", "support", "ADMIN", "SUPER_ADMIN", "SUPPORT"])
          .get();

        const tokens: string[] = [];
        adminDevicesSnap.forEach((doc) => {
          const token = doc.data().fcmToken || doc.data().token;
          if (token && typeof token === "string" && !tokens.includes(token)) {
            tokens.push(token);
          }
        });

        if (tokens.length > 0) {
          const payload: admin.messaging.MulticastMessage = {
            tokens,
            notification: {
              title: `💬 Respuesta en Ticket #${ticketId}`,
              body: `${senderName}: ${messageText}`,
            },
            data: {
              type: "SUPPORT_TICKET_MESSAGE",
              ticketId,
              customerId: ticket.customerId || "",
            },
          };
          await messaging.sendEachForMulticast(payload);
        }
      }
    } catch (err: any) {
      Logger.error(`[SUPPORT_TICKETS] Error procesando mensaje de soporte en ticket ${ticketId}:`, err);
    }
  });
