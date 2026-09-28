import assert from "node:assert";
import test, { describe, it } from "node:test";
import {
  buildCommercePricingSnapshot,
  calculateCommerceAuthoritativeFee,
  buildPricingSnapshot,
  calculateAuthoritativeFee,
  COMMERCE_DEFAULT_CUSTOMER_RATE_PER_KM,
  COMMERCE_DEFAULT_COURIER_RATE_PER_KM,
  TARIFA_BASE_NIO,
  COSTO_POR_KM_NIO,
  CommerceDeliveryPricingConfig,
  XToYPricingConfig,
  validateCoordinatesInNicaragua,
  calculateHaversineDistanceMeters,
} from "../services/routingService";

describe("BSD-COMMERCE-DYNAMIC-DELIVERY-PRICING-COURIER-EARNINGS-DISPATCH-001: Unit Test Suite", () => {
  // ─── 1. Pruebas de Tarifación Dinámica de Comercio vs Distancia ──────────
  describe("1. Commerce Delivery Pricing Engine (Customer vs Courier Independence)", () => {
    const config: CommerceDeliveryPricingConfig = {
      customerPricePerKm: 8.0,
      courierPricePerKm: 7.0,
      currency: "NIO",
      roundingPrecision: "KM_BLOCK_2DEC",
      pricingVersion: "v2.2-commerce",
    };

    it("TEST 01: 8.7 km -> Customer C$ 69.60, Courier C$ 60.90", () => {
      const distanceMeters = 8700; // 8.7 km
      const res = buildCommercePricingSnapshot(distanceMeters, config);

      assert.strictEqual(res.deliveryFee, 69.6);
      assert.strictEqual(res.courierEarnings, 60.9);
      assert.strictEqual(res.pricingSnapshot.customerPricePerKm, 8.0);
      assert.strictEqual(res.pricingSnapshot.courierPricePerKm, 7.0);
      assert.strictEqual(res.pricingSnapshot.distanceKm, 8.7);
      assert.strictEqual(res.pricingSnapshot.serviceType, "COMMERCE_DELIVERY");
      assert.strictEqual(res.pricingSnapshot.pricingVersion, "v2.2-commerce");
    });

    it("TEST 02: 1 km -> Customer C$ 8.00, Courier C$ 7.00", () => {
      const res = buildCommercePricingSnapshot(1000, config);
      assert.strictEqual(res.deliveryFee, 8.0);
      assert.strictEqual(res.courierEarnings, 7.0);
      assert.strictEqual(res.pricingSnapshot.distanceKm, 1.0);
    });

    it("TEST 03: 5 km -> Customer C$ 40.00, Courier C$ 35.00", () => {
      const res = buildCommercePricingSnapshot(5000, config);
      assert.strictEqual(res.deliveryFee, 40.0);
      assert.strictEqual(res.courierEarnings, 35.0);
      assert.strictEqual(res.pricingSnapshot.distanceKm, 5.0);
    });

    it("TEST 04: 10 km -> Customer C$ 80.00, Courier C$ 70.00", () => {
      const res = buildCommercePricingSnapshot(10000, config);
      assert.strictEqual(res.deliveryFee, 80.0);
      assert.strictEqual(res.courierEarnings, 70.0);
      assert.strictEqual(res.pricingSnapshot.distanceKm, 10.0);
    });

    it("TEST 05: 15 km -> Customer C$ 120.00, Courier C$ 105.00", () => {
      const res = buildCommercePricingSnapshot(15000, config);
      assert.strictEqual(res.deliveryFee, 120.0);
      assert.strictEqual(res.courierEarnings, 105.0);
      assert.strictEqual(res.pricingSnapshot.distanceKm, 15.0);
    });

    it("TEST 06: Distancias decimales precisas (3.45 km)", () => {
      const res = buildCommercePricingSnapshot(3450, config);
      // 3.45 * 8 = 27.60
      assert.strictEqual(res.deliveryFee, 27.6);
      // 3.45 * 7 = 24.15
      assert.strictEqual(res.courierEarnings, 24.15);
    });

    it("TEST 07: Distancia cero (0m) resulta en 0", () => {
      const res = buildCommercePricingSnapshot(0, config);
      assert.strictEqual(res.deliveryFee, 0.0);
      assert.strictEqual(res.courierEarnings, 0.0);
    });

    it("TEST 08: Tarifa mínima de resguardo si se configura", () => {
      const minConfig: CommerceDeliveryPricingConfig = {
        customerPricePerKm: 8.0,
        courierPricePerKm: 7.0,
        minimumCustomerDeliveryFee: 35.0,
      };
      // 2 km * 8 = 16.0 -> Debería elevarse al mínimo de 35.0
      const res = buildCommercePricingSnapshot(2000, minConfig);
      assert.strictEqual(res.deliveryFee, 35.0);
      assert.strictEqual(res.courierEarnings, 14.0);
    });
  });

  // ─── 2. Separación Absoluta Commerce Pricing vs X→Y Pricing ──────────────
  describe("2. Domain Firewall: Commerce vs X→Y Pricing Separation", () => {
    it("TEST 09: Commerce pricing formula differs completely from X→Y formula", () => {
      const distanceMeters = 8700; // 8.7 km

      // X→Y: Base $35 + (8.7 * $15) = 35 + 130.5 = 165.5 -> ceil = C$ 166.00
      const xyRes = buildPricingSnapshot(distanceMeters);
      assert.strictEqual(xyRes.calculatedFee, 166.0);

      // Commerce: 8.7 * $8 = C$ 69.60 (Customer) & 8.7 * $7 = C$ 60.90 (Courier)
      const commRes = buildCommercePricingSnapshot(distanceMeters, {
        customerPricePerKm: 8.0,
        courierPricePerKm: 7.0,
      });
      assert.strictEqual(commRes.deliveryFee, 69.6);
      assert.strictEqual(commRes.courierEarnings, 60.9);

      // Verificación de diferencia inequívoca
      assert.notStrictEqual(xyRes.calculatedFee, commRes.deliveryFee);
    });

    it("TEST 10: Mutar tarifa Commerce no afecta X→Y", () => {
      const modifiedCommerceConfig: CommerceDeliveryPricingConfig = {
        customerPricePerKm: 12.0,
        courierPricePerKm: 10.0,
      };
      const xyConfig: XToYPricingConfig = {
        baseFee: 35.0,
        pricePerKm: 15.0,
      };

      const commRes = buildCommercePricingSnapshot(5000, modifiedCommerceConfig);
      const xyRes = buildPricingSnapshot(5000, xyConfig);

      assert.strictEqual(commRes.deliveryFee, 60.0); // 5 * 12
      assert.strictEqual(commRes.courierEarnings, 50.0); // 5 * 10
      assert.strictEqual(xyRes.calculatedFee, 110.0); // 35 + (5 * 15)
    });
  });

  // ─── 3. Validación de Errores y Coordenadas ──────────────────────────────
  describe("3. Fail-Closed Error Handling & Boundary Validation", () => {
    it("TEST 11: Validates origin and destination coordinates in Nicaragua", () => {
      assert.strictEqual(validateCoordinatesInNicaragua(12.1364, -86.2514), true); // Managua
      assert.strictEqual(validateCoordinatesInNicaragua(0, 0), false);
      assert.strictEqual(validateCoordinatesInNicaragua(NaN, -86.2514), false);
    });

    it("TEST 12: Haversine distance accuracy for proximity filtering", () => {
      // Metrocentro a Rotonda El Periodista (~2.3 km)
      const distM = calculateHaversineDistanceMeters(12.1285, -86.2655, 12.1282, -86.2872);
      assert.ok(distM >= 2000 && distM <= 2600, `Distancia obtenida: ${distM}m`);
    });
  });

  // ─── 4. Progressive Dispatch Simulation (1, 5, 10, 15 km) ────────────────
  describe("4. Progressive Dispatch Engine (Merchant Origin Priority)", () => {
    interface MockCourier {
      id: string;
      name: string;
      distToMerchantKm: number;
    }

    const mockCouriers: MockCourier[] = [
      { id: "courier_A", name: "Courier A (0.8km)", distToMerchantKm: 0.8 },
      { id: "courier_B", name: "Courier B (3.5km)", distToMerchantKm: 3.5 },
      { id: "courier_C", name: "Courier C (8.2km)", distToMerchantKm: 8.2 },
      { id: "courier_D", name: "Courier D (14.1km)", distToMerchantKm: 14.1 },
      { id: "courier_E", name: "Courier E (18.0km)", distToMerchantKm: 18.0 },
    ];

    function filterCouriersByStage(stageRadiusKm: number): MockCourier[] {
      return mockCouriers
        .filter((c) => c.distToMerchantKm <= stageRadiusKm)
        .sort((a, b) => a.distToMerchantKm - b.distToMerchantKm);
    }

    it("TEST 13: Stage 1 (1 km) selects only couriers <= 1 km", () => {
      const candidates = filterCouriersByStage(1.0);
      assert.strictEqual(candidates.length, 1);
      assert.strictEqual(candidates[0].id, "courier_A");
    });

    it("TEST 14: Stage 2 (5 km) selects couriers <= 5 km sorted by proximity", () => {
      const candidates = filterCouriersByStage(5.0);
      assert.strictEqual(candidates.length, 2);
      assert.strictEqual(candidates[0].id, "courier_A");
      assert.strictEqual(candidates[1].id, "courier_B");
    });

    it("TEST 15: Stage 3 (10 km) selects couriers <= 10 km sorted by proximity", () => {
      const candidates = filterCouriersByStage(10.0);
      assert.strictEqual(candidates.length, 3);
      assert.strictEqual(candidates[0].id, "courier_A");
      assert.strictEqual(candidates[1].id, "courier_B");
      assert.strictEqual(candidates[2].id, "courier_C");
    });

    it("TEST 16: Stage 4 (15 km) selects couriers <= 15 km (excluding > 15 km)", () => {
      const candidates = filterCouriersByStage(15.0);
      assert.strictEqual(candidates.length, 4);
      assert.strictEqual(candidates[0].id, "courier_A");
      assert.strictEqual(candidates[3].id, "courier_D");
      // Courier E (18 km) is excluded
      assert.ok(!candidates.some((c) => c.id === "courier_E"));
    });
  });
});
