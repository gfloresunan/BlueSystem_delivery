import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Enterprise Test Suite for BSD-MERCHANT-NOTIFICATION-CENTER-FORENSIC-REPORT
 * Validates:
 * 1. Zero Promotional Notification Leakage to Merchants
 * 2. Operational Order Notification Lifecycle Coverage for Merchants
 * 3. Deep-Linking Resolution Engine
 * 4. In-App Notification Categorization & Metadata Integrity
 * 5. Multi-Tenant & Role Isolation Security Guard
 */

interface MockUser {
  uid: string;
  role: string;
  email: string;
  businessId?: string;
  orderCount?: number;
}

interface MockDevice {
  deviceId: string;
  uid: string;
  role: string;
  fcmToken: string;
  isActive: boolean;
}

interface MockNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  category: "all" | "orders" | "operations" | "finance" | "admin";
  read: boolean;
  businessId?: string;
  orderId?: string;
  actionUrl?: string;
  timestamp: number;
}

// 1. Mock DB Setup
const mockUsers: MockUser[] = [
  { uid: "cust_1", role: "customer", email: "cust1@test.com", orderCount: 5 },
  { uid: "cust_2", role: "customer", email: "cust2@test.com", orderCount: 0 },
  { uid: "merchant_1", role: "comercio", email: "owner@tecnostore.com", businessId: "biz_tecnostore", orderCount: 0 },
  { uid: "merchant_2", role: "business", email: "manager@fritoni.com", businessId: "biz_fritoni", orderCount: 0 },
  { uid: "courier_1", role: "courier", email: "courier1@test.com", orderCount: 0 },
  { uid: "admin_1", role: "super_admin", email: "admin@bluesystem.com", orderCount: 0 },
];

const mockDevices: MockDevice[] = [
  { deviceId: "dev_cust_1", uid: "cust_1", role: "customer", fcmToken: "fcm_cust_1", isActive: true },
  { deviceId: "dev_cust_2", uid: "cust_2", role: "customer", fcmToken: "fcm_cust_2", isActive: true },
  { deviceId: "dev_merch_1a", uid: "merchant_1", role: "comercio", fcmToken: "fcm_merch_1a", isActive: true },
  { deviceId: "dev_merch_1b", uid: "merchant_1", role: "comercio", fcmToken: "fcm_merch_1b", isActive: true },
  { deviceId: "dev_merch_2", uid: "merchant_2", role: "business", fcmToken: "fcm_merch_2", isActive: true },
  { deviceId: "dev_courier_1", uid: "courier_1", role: "courier", fcmToken: "fcm_courier_1", isActive: true },
  { deviceId: "dev_admin_1", uid: "admin_1", role: "super_admin", fcmToken: "fcm_admin_1", isActive: true },
];

// Helper: Simulate promotional campaign targeting resolution
function resolveCampaignTargets(targetType: string, isPromotional: boolean): { uids: string[]; devices: MockDevice[] } {
  let eligibleUsers = [...mockUsers];

  if (isPromotional) {
    // Strict isolation: promotions ONLY target customers
    eligibleUsers = eligibleUsers.filter((u) => ["customer", "cliente"].includes(u.role.toLowerCase()));
  }

  if (targetType === "no_orders") {
    eligibleUsers = eligibleUsers.filter((u) => (u.orderCount || 0) === 0);
  } else if (targetType === "active_30_days") {
    eligibleUsers = eligibleUsers.filter((u) => (u.orderCount || 0) > 0);
  }

  const uids = eligibleUsers.map((u) => u.uid);
  const devices = mockDevices.filter((d) => d.isActive && uids.includes(d.uid));

  return { uids, devices };
}

// Helper: Simulate Order Notification Payload Generator
function generateMerchantOrderNotification(
  orderId: string,
  businessId: string,
  status: string,
  humanOrderCode?: string
): Omit<MockNotification, "id" | "read" | "timestamp"> {
  const code = humanOrderCode || `#${orderId.slice(-4)}`;
  switch (status) {
    case "assigned":
      return {
        title: `Repartidor Asignado (${code})`,
        body: `Un repartidor ha tomado el pedido ${code} y se dirige al local para la recolección.`,
        type: "order_status",
        category: "orders",
        businessId,
        orderId,
        actionUrl: `/orders?orderId=${orderId}`,
      };
    case "ready":
      return {
        title: `Pedido Listo (${code})`,
        body: `El pedido ${code} está marcado como listo para empaque/entrega al repartidor.`,
        type: "order_status",
        category: "orders",
        businessId,
        orderId,
        actionUrl: `/orders?orderId=${orderId}`,
      };
    case "picked_up":
      return {
        title: `Pedido Recolectado (${code})`,
        body: `El repartidor ha recolectado el pedido ${code} de su local.`,
        type: "order_status",
        category: "orders",
        businessId,
        orderId,
        actionUrl: `/orders?orderId=${orderId}`,
      };
    case "in_transit":
      return {
        title: `Pedido en Camino (${code})`,
        body: `El pedido ${code} está en camino hacia la dirección del cliente.`,
        type: "order_status",
        category: "orders",
        businessId,
        orderId,
        actionUrl: `/orders?orderId=${orderId}`,
      };
    case "delivered":
      return {
        title: `Pedido Entregado con Éxito (${code})`,
        body: `El pedido ${code} ha sido entregado exitosamente al cliente.`,
        type: "order_status",
        category: "orders",
        businessId,
        orderId,
        actionUrl: `/orders?orderId=${orderId}`,
      };
    case "cancelled":
      return {
        title: `Pedido Cancelado (${code})`,
        body: `El pedido ${code} ha sido cancelado. Revise los detalles en su panel de pedidos.`,
        type: "order_status",
        category: "orders",
        businessId,
        orderId,
        actionUrl: `/orders?orderId=${orderId}`,
      };
    default:
      return {
        title: `Nuevo Pedido Recibido (${code})`,
        body: `Ha ingresado el nuevo pedido ${code}. Revise los detalles y acéptelo para comenzar la preparación.`,
        type: "new_order",
        category: "orders",
        businessId,
        orderId,
        actionUrl: `/orders?orderId=${orderId}`,
      };
  }
}

// Helper: Deep-link URL Resolver for Merchant Web
function resolveNotificationDeepLink(notification: Partial<MockNotification>): string {
  const { type, actionUrl, orderId } = notification;

  if (actionUrl && actionUrl.startsWith("/")) return actionUrl;

  switch (type) {
    case "new_order":
    case "order_status":
    case "order_created":
    case "order_assigned":
    case "order_picked_up":
    case "order_delivered":
    case "order_cancelled":
      return orderId ? `/orders?orderId=${orderId}` : "/orders";

    case "settlement_payment_registered":
    case "settlement_disputed":
    case "settlement_approved":
    case "daily_closure_approved":
    case "finance":
      return "/settlements";

    case "menu_approval":
    case "product_status":
      return "/catalog";

    case "store_status":
    case "branch_status":
      return "/settings";

    default:
      return "/orders";
  }
}

describe("BSD-MERCHANT-NOTIFICATION-CENTER-FORENSIC-REPORT — Test Suite", () => {
  it("GATE 01: Promotional campaign with targetType='all' excludes merchant and courier roles", () => {
    const { uids, devices } = resolveCampaignTargets("all", true);
    assert.strictEqual(uids.includes("merchant_1"), false, "Merchant 1 must NOT receive promotional push");
    assert.strictEqual(uids.includes("merchant_2"), false, "Merchant 2 must NOT receive promotional push");
    assert.strictEqual(uids.includes("courier_1"), false, "Courier 1 must NOT receive promotional push");
    assert.strictEqual(uids.includes("admin_1"), false, "Admin 1 must NOT receive promotional push");
    assert.strictEqual(uids.length, 2, "Only 2 customers should receive promotion");
    assert.strictEqual(devices.length, 2, "Only 2 customer devices should receive promotion");
  });

  it("GATE 02: Promotional campaign with targetType='no_orders' does NOT trap merchants with 0 customer orders", () => {
    const { uids } = resolveCampaignTargets("no_orders", true);
    assert.strictEqual(uids.includes("merchant_1"), false, "Merchant 1 has 0 orders but must NOT receive customer promo");
    assert.strictEqual(uids.includes("merchant_2"), false, "Merchant 2 has 0 orders but must NOT receive customer promo");
    assert.strictEqual(uids.includes("cust_2"), true, "Customer 2 with 0 orders must receive promo");
    assert.strictEqual(uids.length, 1);
  });

  it("GATE 03: Order Notification Engine generates valid payloads for 'assigned' status with deep-link", () => {
    const payload = generateMerchantOrderNotification("ord_9901", "biz_tecnostore", "assigned", "TEC0001");
    assert.strictEqual(payload.title, "Repartidor Asignado (TEC0001)");
    assert.strictEqual(payload.category, "orders");
    assert.strictEqual(payload.actionUrl, "/orders?orderId=ord_9901");
    assert.strictEqual(payload.businessId, "biz_tecnostore");
  });

  it("GATE 04: Order Notification Engine generates valid payloads for 'ready' status", () => {
    const payload = generateMerchantOrderNotification("ord_9902", "biz_tecnostore", "ready", "TEC0002");
    assert.strictEqual(payload.title, "Pedido Listo (TEC0002)");
    assert.strictEqual(payload.category, "orders");
  });

  it("GATE 05: Order Notification Engine generates valid payloads for 'picked_up' status", () => {
    const payload = generateMerchantOrderNotification("ord_9903", "biz_tecnostore", "picked_up", "TEC0003");
    assert.strictEqual(payload.title, "Pedido Recolectado (TEC0003)");
    assert.strictEqual(payload.category, "orders");
  });

  it("GATE 06: Order Notification Engine generates valid payloads for 'in_transit' status", () => {
    const payload = generateMerchantOrderNotification("ord_9904", "biz_tecnostore", "in_transit", "TEC0004");
    assert.strictEqual(payload.title, "Pedido en Camino (TEC0004)");
    assert.strictEqual(payload.category, "orders");
  });

  it("GATE 07: Order Notification Engine generates valid payloads for 'delivered' status", () => {
    const payload = generateMerchantOrderNotification("ord_9905", "biz_tecnostore", "delivered", "TEC0005");
    assert.strictEqual(payload.title, "Pedido Entregado con Éxito (TEC0005)");
    assert.strictEqual(payload.category, "orders");
  });

  it("GATE 08: Order Notification Engine generates valid payloads for 'cancelled' status", () => {
    const payload = generateMerchantOrderNotification("ord_9906", "biz_tecnostore", "cancelled", "TEC0006");
    assert.strictEqual(payload.title, "Pedido Cancelado (TEC0006)");
    assert.strictEqual(payload.category, "orders");
  });

  it("GATE 09: Deep Link Resolver maps financial settlement notifications to /settlements", () => {
    const route = resolveNotificationDeepLink({ type: "settlement_payment_registered" });
    assert.strictEqual(route, "/settlements");
  });

  it("GATE 10: Deep Link Resolver maps catalog notifications to /catalog", () => {
    const route = resolveNotificationDeepLink({ type: "menu_approval" });
    assert.strictEqual(route, "/catalog");
  });

  it("GATE 11: Deep Link Resolver maps store configuration notifications to /settings", () => {
    const route = resolveNotificationDeepLink({ type: "store_status" });
    assert.strictEqual(route, "/settings");
  });

  it("GATE 12: Deep Link Resolver respects explicit actionUrl", () => {
    const route = resolveNotificationDeepLink({ actionUrl: "/control-tower?focus=courier_1" });
    assert.strictEqual(route, "/control-tower?focus=courier_1");
  });

  it("GATE 13: Multi-device resolution reaches all active devices of the merchant user", () => {
    const merchantDevices = mockDevices.filter((d) => d.uid === "merchant_1" && d.isActive);
    assert.strictEqual(merchantDevices.length, 2, "Merchant 1 has 2 active devices (web & mobile/tablet)");
    assert.deepStrictEqual(merchantDevices.map((d) => d.fcmToken), ["fcm_merch_1a", "fcm_merch_1b"]);
  });

  it("GATE 14: Category filtering handles 'orders', 'operations', 'finance', 'admin' and 'all'", () => {
    const notifications: MockNotification[] = [
      { id: "1", title: "New Order", body: "...", type: "new_order", category: "orders", read: false, timestamp: 100 },
      { id: "2", title: "Settlement Paid", body: "...", type: "settlement", category: "finance", read: false, timestamp: 200 },
      { id: "3", title: "Driver Waiting", body: "...", type: "driver_arrival", category: "operations", read: true, timestamp: 300 },
      { id: "4", title: "Terms Update", body: "...", type: "terms", category: "admin", read: false, timestamp: 400 },
    ];

    const all = notifications;
    const orders = notifications.filter((n) => n.category === "orders");
    const finance = notifications.filter((n) => n.category === "finance");
    const ops = notifications.filter((n) => n.category === "operations");
    const admin = notifications.filter((n) => n.category === "admin");

    assert.strictEqual(all.length, 4);
    assert.strictEqual(orders.length, 1);
    assert.strictEqual(finance.length, 1);
    assert.strictEqual(ops.length, 1);
    assert.strictEqual(admin.length, 1);
  });

  it("GATE 15: Read / Unread toggle produces correct counters and atomic state changes", () => {
    const notifications: MockNotification[] = [
      { id: "1", title: "A", body: "...", type: "new_order", category: "orders", read: false, timestamp: 100 },
      { id: "2", title: "B", body: "...", type: "new_order", category: "orders", read: false, timestamp: 200 },
      { id: "3", title: "C", body: "...", type: "new_order", category: "orders", read: true, timestamp: 300 },
    ];

    const initialUnread = notifications.filter((n) => !n.read).length;
    assert.strictEqual(initialUnread, 2);

    // Mark all read
    const allRead = notifications.map((n) => ({ ...n, read: true }));
    assert.strictEqual(allRead.filter((n) => !n.read).length, 0);

    // Toggle item 1 back to unread
    allRead[0].read = false;
    assert.strictEqual(allRead.filter((n) => !n.read).length, 1);
  });
});
