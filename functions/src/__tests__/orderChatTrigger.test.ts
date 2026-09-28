/**
 * BlueSystem Delivery Enterprise — Unit Tests: Order Chat Trigger & Notification Routing
 * BSD-CHAT-CUSTOMER-COURIER-E2E-001 Protocol Validation
 */

import { describe, test } from "node:test";
import * as assert from "node:assert";

interface OrderChatMessagePayload {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: "CUSTOMER" | "COURIER";
  senderName: string;
  text: string;
  type: "TEXT" | "CALL_EVENT";
  tenantId?: string;
  businessId?: string;
}

interface OrderEntity {
  id: string;
  customerId: string;
  assignedCourierId: string;
  orderNumber?: string;
  status: string;
  hasConversation?: boolean;
  messageCount?: number;
  unreadCourierCount?: number;
  unreadCustomerCount?: number;
}

/**
 * Pure domain logic helper matching onOrderChatMessageCreated trigger
 */
function resolveChatNotification(
  message: OrderChatMessagePayload,
  order: OrderEntity,
  userTokensMap: Record<string, string[]>
): {
  recipientUid: string;
  recipientRole: string;
  pushTitle: string;
  payloadData: Record<string, string>;
  targetTokens: string[];
  orderUpdate: Record<string, any>;
} {
  const senderRole = (message.senderRole || "").toUpperCase().trim();
  const senderId = (message.senderId || "").trim();
  const senderName = message.senderName || "Usuario";
  const rawText = (message.text || "").trim();
  const messagePreview = rawText.length > 100 ? `${rawText.substring(0, 97)}...` : rawText;

  let recipientUid = "";
  let recipientRole = "";

  if (senderRole === "CUSTOMER") {
    recipientUid = order.assignedCourierId;
    recipientRole = "COURIER";
  } else if (senderRole === "COURIER") {
    recipientUid = order.customerId;
    recipientRole = "CUSTOMER";
  }

  const orderNumber = order.orderNumber || order.id.slice(-6).toUpperCase();
  const pushTitle =
    senderRole === "COURIER"
      ? `🛵 Motorizado (${senderName})`
      : `💬 Cliente: Pedido #${orderNumber}`;

  const payloadData: Record<string, string> = {
    action: "ORDER_CHAT_MESSAGE",
    orderId: message.orderId,
    messageId: message.id,
    senderId,
    senderRole,
    senderName,
    messagePreview,
    screen: "order_chat",
    title: pushTitle,
    body: messagePreview,
  };

  const targetTokens = recipientUid && recipientUid !== senderId ? (userTokensMap[recipientUid] || []) : [];

  const orderUpdate: Record<string, any> = {
    hasConversation: true,
    lastMessageText: messagePreview,
    lastMessageSenderRole: senderRole,
  };

  if (senderRole === "CUSTOMER") {
    orderUpdate.unreadCourierCount = (order.unreadCourierCount || 0) + 1;
  } else if (senderRole === "COURIER") {
    orderUpdate.unreadCustomerCount = (order.unreadCustomerCount || 0) + 1;
  }

  return {
    recipientUid,
    recipientRole,
    pushTitle,
    payloadData,
    targetTokens,
    orderUpdate,
  };
}

describe("BSD-CHAT-CUSTOMER-COURIER-E2E-001 — Order Chat Trigger & Notification Routing", () => {
  const mockTokens: Record<string, string[]> = {
    courier_uid_123: ["token_courier_device_1", "token_courier_device_2"],
    customer_uid_456: ["token_customer_phone_1"],
  };

  test("Customer -> Courier: Resuelve destinatario y despacha tokens multi-dispositivo", () => {
    const order: OrderEntity = {
      id: "ord_998877",
      customerId: "customer_uid_456",
      assignedCourierId: "courier_uid_123",
      orderNumber: "998877",
      status: "in_transit",
      unreadCourierCount: 0,
      unreadCustomerCount: 0,
    };

    const msg: OrderChatMessagePayload = {
      id: "msg_001",
      orderId: "ord_998877",
      senderId: "customer_uid_456",
      senderRole: "CUSTOMER",
      senderName: "Gerald Cliente",
      text: "¿Aproximadamente en cuántos minutos llega?",
      type: "TEXT",
    };

    const result = resolveChatNotification(msg, order, mockTokens);

    assert.strictEqual(result.recipientUid, "courier_uid_123");
    assert.strictEqual(result.recipientRole, "COURIER");
    assert.strictEqual(result.payloadData.action, "ORDER_CHAT_MESSAGE");
    assert.strictEqual(result.payloadData.screen, "order_chat");
    assert.strictEqual(result.payloadData.orderId, "ord_998877");
    assert.strictEqual(result.targetTokens.length, 2, "Debe entregar a ambos dispositivos del motorizado");
    assert.deepStrictEqual(result.targetTokens, ["token_courier_device_1", "token_courier_device_2"]);
    assert.strictEqual(result.orderUpdate.unreadCourierCount, 1);
    assert.strictEqual(result.orderUpdate.hasConversation, true);
  });

  test("Courier -> Customer: Resuelve destinatario y despacha al cliente", () => {
    const order: OrderEntity = {
      id: "ord_998877",
      customerId: "customer_uid_456",
      assignedCourierId: "courier_uid_123",
      orderNumber: "998877",
      status: "in_transit",
      unreadCourierCount: 1,
      unreadCustomerCount: 0,
    };

    const msg: OrderChatMessagePayload = {
      id: "msg_002",
      orderId: "ord_998877",
      senderId: "courier_uid_123",
      senderRole: "COURIER",
      senderName: "Carlos Motorizado",
      text: "Estoy a 3 minutos en la esquina principal.",
      type: "TEXT",
    };

    const result = resolveChatNotification(msg, order, mockTokens);

    assert.strictEqual(result.recipientUid, "customer_uid_456");
    assert.strictEqual(result.recipientRole, "CUSTOMER");
    assert.strictEqual(result.payloadData.action, "ORDER_CHAT_MESSAGE");
    assert.strictEqual(result.payloadData.screen, "order_chat");
    assert.strictEqual(result.targetTokens.length, 1);
    assert.strictEqual(result.targetTokens[0], "token_customer_phone_1");
    assert.strictEqual(result.orderUpdate.unreadCustomerCount, 1);
  });

  test("Anti-Loop / Self-Notification: No envía push si el emisor es el mismo que el destinatario", () => {
    const order: OrderEntity = {
      id: "ord_112233",
      customerId: "user_same_id",
      assignedCourierId: "user_same_id",
      status: "assigned",
    };

    const msg: OrderChatMessagePayload = {
      id: "msg_003",
      orderId: "ord_112233",
      senderId: "user_same_id",
      senderRole: "CUSTOMER",
      senderName: "Mismo Usuario",
      text: "Mensaje test",
      type: "TEXT",
    };

    const result = resolveChatNotification(msg, order, mockTokens);
    assert.strictEqual(result.targetTokens.length, 0, "No debe enviar push a sí mismo");
  });
});
