/**
 * BlueSystem Delivery Enterprise — TopSellingScheduler Test Suite
 * Actividad: BSD-C2D-TOPSELLING-RECOMMENDED-SEMANTIC-CORRECTION-001 (P1-01)
 *
 * Tests T01 a T14 para el contrato canónico de agregación de Top Selling:
 * T01 — 30-day window
 * T02 — old order expiration
 * T03 — delivered qualified
 * T04 — completed qualified
 * T05 — cancelled exclusion
 * T06 — rejected exclusion
 * T07 — refunded exclusion
 * T08 — test order exclusion
 * T09 — quantity aggregation
 * T10 — zero reset
 * T11 — idempotency
 * T12 — descending ranking
 * T13 — rating immunity
 * T14 — scheduler configuration
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  calculateAuthoritativeUnitsSold30d,
  TOP_SELLING_CRON_SCHEDULE,
  TOP_SELLING_TIMEZONE,
  TOP_SELLING_WINDOW_DAYS,
  RawOrderData,
} from "../schedulers/topSellingScheduler";

describe("Top Selling Scheduler — Canonical 30-Day Aggregation Pipeline", () => {
  const fixedNow = new Date("2026-09-07T12:00:00.000Z");

  // Helper para generar timestamps relativos
  const daysAgo = (days: number): Date => {
    return new Date(fixedNow.getTime() - days * 24 * 60 * 60 * 1000);
  };

  it("T01 — 30-day window: Incluye órdenes dentro de la ventana de 30 días", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_1",
        businessId: "biz_A",
        status: "delivered",
        createdAt: daysAgo(5),
        items: [{ quantity: 10 }],
      },
      {
        id: "ord_2",
        businessId: "biz_A",
        status: "completed",
        createdAt: daysAgo(29),
        items: [{ quantity: 15 }],
      },
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    assert.strictEqual(result.get("biz_A"), 25);
  });

  it("T02 — old order expiration: Excluye órdenes con más de 30 días de antigüedad", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_recent",
        businessId: "biz_A",
        status: "delivered",
        createdAt: daysAgo(10),
        items: [{ quantity: 20 }],
      },
      {
        id: "ord_expired",
        businessId: "biz_A",
        status: "delivered",
        createdAt: daysAgo(31), // > 30 días
        items: [{ quantity: 50 }],
      },
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    // Solo ord_recent (20) califica, ord_expired (50) debe ser excluida
    assert.strictEqual(result.get("biz_A"), 20);
  });

  it("T03 — delivered qualified: Órdenes con status 'delivered' o 'entregado' califican", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_deliv",
        businessId: "biz_A",
        status: "delivered",
        createdAt: daysAgo(2),
        items: [{ quantity: 12 }],
      },
      {
        id: "ord_entre",
        businessId: "biz_A",
        status: "entregado",
        createdAt: daysAgo(3),
        items: [{ quantity: 8 }],
      },
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    assert.strictEqual(result.get("biz_A"), 20);
  });

  it("T04 — completed qualified: Órdenes con status 'completed' califican", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_comp",
        businessId: "biz_A",
        status: "completed",
        createdAt: daysAgo(1),
        items: [{ quantity: 35 }],
      },
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    assert.strictEqual(result.get("biz_A"), 35);
  });

  it("T05 — cancelled exclusion: Órdenes canceladas se excluyen absolutamente", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_ok",
        businessId: "biz_A",
        status: "delivered",
        createdAt: daysAgo(1),
        items: [{ quantity: 10 }],
      },
      {
        id: "ord_canc",
        businessId: "biz_A",
        status: "cancelled",
        createdAt: daysAgo(1),
        items: [{ quantity: 100 }],
      },
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    assert.strictEqual(result.get("biz_A"), 10);
  });

  it("T06 — rejected exclusion: Órdenes rechazadas se excluyen absolutamente", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_ok",
        businessId: "biz_A",
        status: "completed",
        createdAt: daysAgo(2),
        items: [{ quantity: 15 }],
      },
      {
        id: "ord_rej",
        businessId: "biz_A",
        status: "rejected",
        createdAt: daysAgo(2),
        items: [{ quantity: 200 }],
      },
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    assert.strictEqual(result.get("biz_A"), 15);
  });

  it("T07 — refunded exclusion: Órdenes reembolsadas se excluyen absolutamente", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_ok",
        businessId: "biz_A",
        status: "delivered",
        createdAt: daysAgo(3),
        items: [{ quantity: 25 }],
      },
      {
        id: "ord_ref",
        businessId: "biz_A",
        status: "refunded",
        createdAt: daysAgo(3),
        items: [{ quantity: 300 }],
      },
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    assert.strictEqual(result.get("biz_A"), 25);
  });

  it("T08 — test order exclusion: Órdenes de prueba con isTest o testOrder son excluidas", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_ok",
        businessId: "biz_A",
        status: "delivered",
        createdAt: daysAgo(1),
        items: [{ quantity: 10 }],
      },
      {
        id: "ord_test1",
        businessId: "biz_A",
        status: "delivered",
        isTest: true,
        createdAt: daysAgo(1),
        items: [{ quantity: 1000 }],
      },
      {
        id: "ord_test2",
        businessId: "biz_A",
        status: "completed",
        testOrder: true,
        createdAt: daysAgo(1),
        items: [{ quantity: 500 }],
      },
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    assert.strictEqual(result.get("biz_A"), 10);
  });

  it("T09 — quantity aggregation: Agregación correcta de unidades vendidas por item", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_1",
        businessId: "biz_A",
        status: "delivered",
        createdAt: daysAgo(4),
        items: [
          { productId: "p1", quantity: 3 },
          { productId: "p2", quantity: 2 },
        ], // 5 unidades
      },
      {
        id: "ord_2",
        businessId: "biz_A",
        status: "completed",
        createdAt: daysAgo(5),
        productos: [{ id: "p3", cantidad: 4 }], // 4 unidades
      },
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    assert.strictEqual(result.get("biz_A"), 9);
  });

  it("T10 — zero reset: Comercios sin ventas en los últimos 30 días quedan en 0", () => {
    const eligibleBusinesses = ["biz_active", "biz_stale", "biz_new"];
    const orders: RawOrderData[] = [
      {
        id: "ord_active",
        businessId: "biz_active",
        status: "delivered",
        createdAt: daysAgo(2),
        items: [{ quantity: 40 }],
      },
      {
        id: "ord_stale_old",
        businessId: "biz_stale",
        status: "delivered",
        createdAt: daysAgo(35), // Expirado (>30d)
        items: [{ quantity: 100 }],
      },
      // biz_new no tiene órdenes
    ];

    const result = calculateAuthoritativeUnitsSold30d(orders, eligibleBusinesses, fixedNow);
    assert.strictEqual(result.get("biz_active"), 40);
    assert.strictEqual(result.get("biz_stale"), 0); // Reset a 0 porque su venta expiró
    assert.strictEqual(result.get("biz_new"), 0); // 0 garantizado
  });

  it("T11 — idempotency: Múltiples ejecuciones sobre el mismo dataset producen el mismo valor", () => {
    const orders: RawOrderData[] = [
      {
        id: "ord_1",
        businessId: "biz_A",
        status: "delivered",
        createdAt: daysAgo(10),
        items: [{ quantity: 100 }],
      },
    ];

    const run1 = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    const run2 = calculateAuthoritativeUnitsSold30d(orders, ["biz_A"], fixedNow);
    assert.strictEqual(run1.get("biz_A"), 100);
    assert.strictEqual(run2.get("biz_A"), 100);
  });

  it("T12 — descending ranking: Ordenamiento correcto por unitsSold30d DESC", () => {
    const businesses = ["biz_A", "biz_B", "biz_C", "biz_D", "biz_E"];
    const orders: RawOrderData[] = [
      { businessId: "biz_A", status: "delivered", createdAt: daysAgo(1), items: [{ quantity: 500 }] },
      { businessId: "biz_B", status: "delivered", createdAt: daysAgo(2), items: [{ quantity: 300 }] },
      { businessId: "biz_C", status: "delivered", createdAt: daysAgo(3), items: [{ quantity: 100 }] },
      { businessId: "biz_D", status: "delivered", createdAt: daysAgo(4), items: [{ quantity: 50 }] },
      { businessId: "biz_E", status: "delivered", createdAt: daysAgo(5), items: [{ quantity: 10 }] },
    ];

    const totals = calculateAuthoritativeUnitsSold30d(orders, businesses, fixedNow);

    const sortedBiz = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);

    assert.deepStrictEqual(sortedBiz, ["biz_A", "biz_B", "biz_C", "biz_D", "biz_E"]);
  });

  it("T13 — rating immunity: Comercio con más ventas y menor rating precede a comercio con mayor rating", () => {
    // Comercio A: 500 ventas, rating 3.8
    // Comercio B: 100 ventas, rating 5.0
    const businesses = ["biz_A", "biz_B"];
    const orders: RawOrderData[] = [
      { businessId: "biz_A", status: "delivered", createdAt: daysAgo(2), items: [{ quantity: 500 }] },
      { businessId: "biz_B", status: "delivered", createdAt: daysAgo(2), items: [{ quantity: 100 }] },
    ];

    const totals = calculateAuthoritativeUnitsSold30d(orders, businesses, fixedNow);
    assert.strictEqual(totals.get("biz_A"), 500);
    assert.strictEqual(totals.get("biz_B"), 100);

    const ranked = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);

    assert.strictEqual(ranked[0], "biz_A");
    assert.strictEqual(ranked[1], "biz_B");
  });

  it("T14 — scheduler configuration: Cron 0 2 * * * y Timezone UTC exactos", () => {
    assert.strictEqual(TOP_SELLING_CRON_SCHEDULE, "0 2 * * *");
    assert.strictEqual(TOP_SELLING_TIMEZONE, "UTC");
    assert.strictEqual(TOP_SELLING_WINDOW_DAYS, 30);
  });
});
