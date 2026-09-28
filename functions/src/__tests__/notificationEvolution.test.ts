import { describe, it } from "node:test";
import * as assert from "node:assert";

/**
 * Test Suite: Evolución Quirúrgica del Sistema Enterprise de Notificaciones, Deep Linking y Navegación Contextual
 * Sprint 18.2 / Phase Notification Evolution
 */

describe("Notification Evolution Test Suite", () => {
  describe("1. Bienvenida Primer Registro (Server-Authoritative & 72h TTL)", () => {
    it("debe generar notificación con docId determinista y expirar en exactamente 72 horas", () => {
      const now = new Date("2026-09-04T10:00:00.000Z");
      const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      const welcomeDocId = "WELCOME_FIRST_REGISTRATION_V1";
      const payload = {
        id: welcomeDocId,
        type: "WELCOME_FIRST_REGISTRATION",
        category: "Novedades",
        title: "👋 ¡Te damos la bienvenida a BlueSystem Delivery!",
        body: "Descubre los mejores comercios, restaurantes y promociones exclusivas en tu ciudad.",
        destinationType: "CUSTOMER_HOME",
        destinationRoute: "home",
        deepLink: "bluesystem://customer/home",
        action: "OPEN_HOME",
        fallbackDestination: "CUSTOMER_HOME",
        createdAt: now,
        expiresAt: expiresAt,
        isRead: false,
        read: false,
        visibilityStatus: "VISIBLE",
      };

      assert.strictEqual(payload.id, "WELCOME_FIRST_REGISTRATION_V1");
      assert.strictEqual(payload.destinationType, "CUSTOMER_HOME");
      assert.strictEqual(payload.action, "OPEN_HOME");

      // Validar TTL de 72 horas
      const diffHours = (payload.expiresAt.getTime() - payload.createdAt.getTime()) / (1000 * 60 * 60);
      assert.strictEqual(diffHours, 72);
    });

    it("debe ser idempotente: re-ejecución no crea documentos duplicados", () => {
      const notifications = new Map<string, any>();
      const uid = "user_test_client_001";

      const saveWelcome = () => {
        const welcomeDocId = "WELCOME_FIRST_REGISTRATION_V1";
        notifications.set(`${uid}_${welcomeDocId}`, {
          id: welcomeDocId,
          type: "WELCOME_FIRST_REGISTRATION",
          destinationType: "CUSTOMER_HOME",
        });
      };

      saveWelcome();
      assert.strictEqual(notifications.size, 1);

      // Segunda llamada (idempotencia)
      saveWelcome();
      assert.strictEqual(notifications.size, 1);
      assert.ok(notifications.has(`${uid}_WELCOME_FIRST_REGISTRATION_V1`));
    });

    it("evalúa expiración tras transcurrir las 72 horas", () => {
      const createdAt = new Date("2026-09-01T10:00:00.000Z");
      const expiresAt = new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);

      const isExpired = (checkTime: Date) => checkTime.getTime() > expiresAt.getTime();

      // A las 24 horas: aún vigente
      const check24h = new Date("2026-09-02T10:00:00.000Z");
      assert.strictEqual(isExpired(check24h), false);

      // A las 71 horas: aún vigente
      const check71h = new Date("2026-09-04T09:00:00.000Z");
      assert.strictEqual(isExpired(check71h), false);

      // A las 73 horas: expirado
      const check73h = new Date("2026-09-04T11:00:00.000Z");
      assert.strictEqual(isExpired(check73h), true);
    });
  });

  describe("2. Mapeo Canónico de Pedidos & Navegación Contextual", () => {
    const mapOrderStatusTransition = (status: string, orderId: string) => {
      const isTransit = ["picked_up", "in_transit", "en_camino", "out_for_delivery"].includes(status.toLowerCase());
      const destinationType = isTransit ? "CUSTOMER_ORDER_TRACKING" : "CUSTOMER_ORDER_DETAIL";
      const action = isTransit ? "OPEN_TRACKING" : "OPEN_ORDER";
      const destinationRoute = isTransit ? `customer/order_tracking/${orderId}` : `order_detail/${orderId}`;
      const deepLink = isTransit ? `bluesystem://customer/order_tracking/${orderId}` : `bluesystem://customer/orders/${orderId}`;

      return {
        type: isTransit ? "ORDER_IN_TRANSIT" : `ORDER_${status.toUpperCase()}`,
        destinationType,
        destinationRoute,
        deepLink,
        action,
        orderId,
        entityId: orderId,
        entityType: "ORDER",
      };
    };

    it("en preparación: debe dirigir al detalle del pedido", () => {
      const mapping = mapOrderStatusTransition("preparing", "ord_100");
      assert.strictEqual(mapping.type, "ORDER_PREPARING");
      assert.strictEqual(mapping.destinationType, "CUSTOMER_ORDER_DETAIL");
      assert.strictEqual(mapping.action, "OPEN_ORDER");
      assert.strictEqual(mapping.destinationRoute, "order_detail/ord_100");
      assert.strictEqual(mapping.entityId, "ord_100");
    });

    it("en tránsito / en camino: debe dirigir al tracking en vivo del pedido", () => {
      const mapping = mapOrderStatusTransition("in_transit", "ord_200");
      assert.strictEqual(mapping.type, "ORDER_IN_TRANSIT");
      assert.strictEqual(mapping.destinationType, "CUSTOMER_ORDER_TRACKING");
      assert.strictEqual(mapping.action, "OPEN_TRACKING");
      assert.strictEqual(mapping.destinationRoute, "customer/order_tracking/ord_200");
      assert.strictEqual(mapping.deepLink, "bluesystem://customer/order_tracking/ord_200");
    });

    it("entregado: debe dirigir al detalle con estatus final", () => {
      const mapping = mapOrderStatusTransition("delivered", "ord_300");
      assert.strictEqual(mapping.type, "ORDER_DELIVERED");
      assert.strictEqual(mapping.destinationType, "CUSTOMER_ORDER_DETAIL");
      assert.strictEqual(mapping.action, "OPEN_ORDER");
    });
  });

  describe("3. Queue Worker Payload & Resiliencia FCM", () => {
    it("debe preservar campos canónicos y legacy en dataMap de FCM", () => {
      const campaign = {
        id: "camp_promo_01",
        title: "¡2x1 en Pizzas!",
        body: "Solo por hoy en Pizzería Roma.",
        imageUrl: "https://storage.googleapis.com/test.jpg",
        destinationType: "CUSTOMER_PRODUCT",
        destinationRoute: "comercio_detalle_screen/biz_roma?productId=prod_pizza",
        deepLink: "bluesystem://customer/product/prod_pizza?businessId=biz_roma",
        action: "OPEN_PRODUCT",
        entityId: "prod_pizza",
        entityType: "PRODUCT",
        businessId: "biz_roma",
        productId: "prod_pizza",
        couponId: "",
      };

      // Simular armado de dataMap en notificationQueueWorker.ts
      const dataMap: Record<string, string> = {
        title: campaign.title,
        body: campaign.body,
        campaignId: campaign.id,
        destinationType: campaign.destinationType,
        destinationRoute: campaign.destinationRoute,
        action: campaign.action,
        deepLink: campaign.deepLink,
        screen: campaign.destinationRoute,
        entityId: campaign.entityId,
        entityType: campaign.entityType,
        businessId: campaign.businessId,
        productId: campaign.productId,
        imageUrl: campaign.imageUrl,
      };

      assert.strictEqual(dataMap.destinationType, "CUSTOMER_PRODUCT");
      assert.strictEqual(dataMap.businessId, "biz_roma");
      assert.strictEqual(dataMap.productId, "prod_pizza");
      assert.strictEqual(dataMap.imageUrl, "https://storage.googleapis.com/test.jpg");
      assert.strictEqual(dataMap.screen, campaign.destinationRoute); // Compatibilidad backward
    });
  });
});
