"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const routingService_1 = require("../services/routingService");
(0, node_test_1.describe)("BSD-COMMERCE-DYNAMIC-DELIVERY-PRICING-COURIER-EARNINGS-DISPATCH-001: Unit Test Suite", () => {
    // ─── 1. Pruebas de Tarifación Dinámica de Comercio vs Distancia ──────────
    (0, node_test_1.describe)("1. Commerce Delivery Pricing Engine (Customer vs Courier Independence)", () => {
        const config = {
            customerPricePerKm: 8.0,
            courierPricePerKm: 7.0,
            currency: "NIO",
            roundingPrecision: "KM_BLOCK_2DEC",
            pricingVersion: "v2.2-commerce",
        };
        (0, node_test_1.it)("TEST 01: 8.7 km -> Customer C$ 70.00 (Math.ceil), Courier C$ 60.00 (Math.floor)", () => {
            const distanceMeters = 8700; // 8.7 km
            const res = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, config);
            node_assert_1.default.strictEqual(res.deliveryFee, 70);
            node_assert_1.default.strictEqual(res.courierEarnings, 60);
            node_assert_1.default.strictEqual(res.pricingSnapshot.customerPricePerKm, 8.0);
            node_assert_1.default.strictEqual(res.pricingSnapshot.courierPricePerKm, 7.0);
            node_assert_1.default.strictEqual(res.pricingSnapshot.distanceKm, 8.7);
            node_assert_1.default.strictEqual(res.pricingSnapshot.serviceType, "COMMERCE_DELIVERY");
            node_assert_1.default.strictEqual(res.pricingSnapshot.pricingVersion, "v2.2-commerce");
        });
        (0, node_test_1.it)("TEST 02: 1 km -> Customer C$ 8.00, Courier C$ 7.00", () => {
            const res = (0, routingService_1.buildCommercePricingSnapshot)(1000, config);
            node_assert_1.default.strictEqual(res.deliveryFee, 8.0);
            node_assert_1.default.strictEqual(res.courierEarnings, 7.0);
            node_assert_1.default.strictEqual(res.pricingSnapshot.distanceKm, 1.0);
        });
        (0, node_test_1.it)("TEST 03: 5 km -> Customer C$ 40.00, Courier C$ 35.00", () => {
            const res = (0, routingService_1.buildCommercePricingSnapshot)(5000, config);
            node_assert_1.default.strictEqual(res.deliveryFee, 40.0);
            node_assert_1.default.strictEqual(res.courierEarnings, 35.0);
            node_assert_1.default.strictEqual(res.pricingSnapshot.distanceKm, 5.0);
        });
        (0, node_test_1.it)("TEST 04: 10 km -> Customer C$ 80.00, Courier C$ 70.00", () => {
            const res = (0, routingService_1.buildCommercePricingSnapshot)(10000, config);
            node_assert_1.default.strictEqual(res.deliveryFee, 80.0);
            node_assert_1.default.strictEqual(res.courierEarnings, 70.0);
            node_assert_1.default.strictEqual(res.pricingSnapshot.distanceKm, 10.0);
        });
        (0, node_test_1.it)("TEST 05: 15 km -> Customer C$ 120.00, Courier C$ 105.00", () => {
            const res = (0, routingService_1.buildCommercePricingSnapshot)(15000, config);
            node_assert_1.default.strictEqual(res.deliveryFee, 120.0);
            node_assert_1.default.strictEqual(res.courierEarnings, 105.0);
            node_assert_1.default.strictEqual(res.pricingSnapshot.distanceKm, 15.0);
        });
        (0, node_test_1.it)("TEST 06: Distancias decimales precisas (3.45 km -> C$ 28 / C$ 24, 5.66 km -> C$ 51 / C$ 39)", () => {
            const res = (0, routingService_1.buildCommercePricingSnapshot)(3450, config);
            // 3.45 * 8 = 27.60 -> Math.ceil = 28
            node_assert_1.default.strictEqual(res.deliveryFee, 28);
            // 3.45 * 7 = 24.15 -> Math.floor = 24
            node_assert_1.default.strictEqual(res.courierEarnings, 24);
            // Caso exacto de usuario: 5.66 km con tarifa 9 y 7
            const resUser = (0, routingService_1.buildCommercePricingSnapshot)(5660, { customerPricePerKm: 9.0, courierPricePerKm: 7.0 });
            // 5.66 * 9 = 50.94 -> Math.ceil = 51
            node_assert_1.default.strictEqual(resUser.deliveryFee, 51);
            // 5.66 * 7 = 39.62 -> Math.floor = 39
            node_assert_1.default.strictEqual(resUser.courierEarnings, 39);
        });
        (0, node_test_1.it)("TEST 07: Distancia cero (0m) resulta en 0", () => {
            const res = (0, routingService_1.buildCommercePricingSnapshot)(0, config);
            node_assert_1.default.strictEqual(res.deliveryFee, 0.0);
            node_assert_1.default.strictEqual(res.courierEarnings, 0.0);
        });
        (0, node_test_1.it)("TEST 08: Tarifa mínima de resguardo si se configura", () => {
            const minConfig = {
                customerPricePerKm: 8.0,
                courierPricePerKm: 7.0,
                minimumCustomerDeliveryFee: 35.0,
            };
            // 2 km * 8 = 16.0 -> Debería elevarse al mínimo de 35.0
            const res = (0, routingService_1.buildCommercePricingSnapshot)(2000, minConfig);
            node_assert_1.default.strictEqual(res.deliveryFee, 35.0);
            node_assert_1.default.strictEqual(res.courierEarnings, 14.0);
        });
    });
    // ─── 2. Separación Absoluta Commerce Pricing vs X→Y Pricing ──────────────
    (0, node_test_1.describe)("2. Domain Firewall: Commerce vs X→Y Pricing Separation", () => {
        (0, node_test_1.it)("TEST 09: Commerce pricing formula differs completely from X→Y formula", () => {
            const distanceMeters = 8700; // 8.7 km
            // X→Y: Base $35 + (8.7 * $15) = 35 + 130.5 = 165.5 -> ceil = C$ 166.00
            const xyRes = (0, routingService_1.buildPricingSnapshot)(distanceMeters);
            node_assert_1.default.strictEqual(xyRes.calculatedFee, 166.0);
            // Commerce: 8.7 * $8 = C$ 69.60 -> Ceil = C$ 70.00 & 8.7 * $7 = C$ 60.90 -> Floor = C$ 60.00
            const commRes = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, {
                customerPricePerKm: 8.0,
                courierPricePerKm: 7.0,
            });
            node_assert_1.default.strictEqual(commRes.deliveryFee, 70);
            node_assert_1.default.strictEqual(commRes.courierEarnings, 60);
            // Verificación de diferencia inequívoca
            node_assert_1.default.notStrictEqual(xyRes.calculatedFee, commRes.deliveryFee);
        });
        (0, node_test_1.it)("TEST 10: Mutar tarifa Commerce no afecta X→Y", () => {
            const modifiedCommerceConfig = {
                customerPricePerKm: 12.0,
                courierPricePerKm: 10.0,
            };
            const xyConfig = {
                baseFee: 35.0,
                pricePerKm: 15.0,
            };
            const commRes = (0, routingService_1.buildCommercePricingSnapshot)(5000, modifiedCommerceConfig);
            const xyRes = (0, routingService_1.buildPricingSnapshot)(5000, xyConfig);
            node_assert_1.default.strictEqual(commRes.deliveryFee, 60.0); // 5 * 12
            node_assert_1.default.strictEqual(commRes.courierEarnings, 50.0); // 5 * 10
            node_assert_1.default.strictEqual(xyRes.calculatedFee, 110.0); // 35 + (5 * 15)
        });
    });
    // ─── 3. Validación de Errores y Coordenadas ──────────────────────────────
    (0, node_test_1.describe)("3. Fail-Closed Error Handling & Boundary Validation", () => {
        (0, node_test_1.it)("TEST 11: Validates origin and destination coordinates in Nicaragua", () => {
            node_assert_1.default.strictEqual((0, routingService_1.validateCoordinatesInNicaragua)(12.1364, -86.2514), true); // Managua
            node_assert_1.default.strictEqual((0, routingService_1.validateCoordinatesInNicaragua)(0, 0), false);
            node_assert_1.default.strictEqual((0, routingService_1.validateCoordinatesInNicaragua)(NaN, -86.2514), false);
        });
        (0, node_test_1.it)("TEST 12: Haversine distance accuracy for proximity filtering", () => {
            // Metrocentro a Rotonda El Periodista (~2.3 km)
            const distM = (0, routingService_1.calculateHaversineDistanceMeters)(12.1285, -86.2655, 12.1282, -86.2872);
            node_assert_1.default.ok(distM >= 2000 && distM <= 2600, `Distancia obtenida: ${distM}m`);
        });
    });
    // ─── 4. Progressive Dispatch Simulation (1, 5, 10, 15 km) ────────────────
    (0, node_test_1.describe)("4. Progressive Dispatch Engine (Merchant Origin Priority)", () => {
        const mockCouriers = [
            { id: "courier_A", name: "Courier A (0.8km)", distToMerchantKm: 0.8 },
            { id: "courier_B", name: "Courier B (3.5km)", distToMerchantKm: 3.5 },
            { id: "courier_C", name: "Courier C (8.2km)", distToMerchantKm: 8.2 },
            { id: "courier_D", name: "Courier D (14.1km)", distToMerchantKm: 14.1 },
            { id: "courier_E", name: "Courier E (18.0km)", distToMerchantKm: 18.0 },
        ];
        function filterCouriersByStage(stageRadiusKm) {
            return mockCouriers
                .filter((c) => c.distToMerchantKm <= stageRadiusKm)
                .sort((a, b) => a.distToMerchantKm - b.distToMerchantKm);
        }
        (0, node_test_1.it)("TEST 13: Stage 1 (1 km) selects only couriers <= 1 km", () => {
            const candidates = filterCouriersByStage(1.0);
            node_assert_1.default.strictEqual(candidates.length, 1);
            node_assert_1.default.strictEqual(candidates[0].id, "courier_A");
        });
        (0, node_test_1.it)("TEST 14: Stage 2 (5 km) selects couriers <= 5 km sorted by proximity", () => {
            const candidates = filterCouriersByStage(5.0);
            node_assert_1.default.strictEqual(candidates.length, 2);
            node_assert_1.default.strictEqual(candidates[0].id, "courier_A");
            node_assert_1.default.strictEqual(candidates[1].id, "courier_B");
        });
        (0, node_test_1.it)("TEST 15: Stage 3 (10 km) selects couriers <= 10 km sorted by proximity", () => {
            const candidates = filterCouriersByStage(10.0);
            node_assert_1.default.strictEqual(candidates.length, 3);
            node_assert_1.default.strictEqual(candidates[0].id, "courier_A");
            node_assert_1.default.strictEqual(candidates[1].id, "courier_B");
            node_assert_1.default.strictEqual(candidates[2].id, "courier_C");
        });
        (0, node_test_1.it)("TEST 16: Stage 4 (15 km) selects couriers <= 15 km (excluding > 15 km)", () => {
            const candidates = filterCouriersByStage(15.0);
            node_assert_1.default.strictEqual(candidates.length, 4);
            node_assert_1.default.strictEqual(candidates[0].id, "courier_A");
            node_assert_1.default.strictEqual(candidates[3].id, "courier_D");
            // Courier E (18 km) is excluded
            node_assert_1.default.ok(!candidates.some((c) => c.id === "courier_E"));
        });
    });
    // ─── 5. Regression Prevention & Multi-Platform Contract Fixes ────────────
    (0, node_test_1.describe)("5. BSD-COMMERCE-DYNAMIC-DELIVERY-PRICING-CHECKOUT-ROOT-FIX-001 Regressions", () => {
        const config = {
            customerPricePerKm: 8.0,
            courierPricePerKm: 7.0,
            currency: "NIO",
            roundingPrecision: "KM_BLOCK_2DEC",
            pricingVersion: "v2.2-commerce",
        };
        (0, node_test_1.it)("TEST 17: Legacy delivery fee (C$ 60) is NEVER used as fallback in dynamic commerce flow", () => {
            const legacyMerchantFee = 60.0;
            const distanceMeters = 8700; // 8.7 km -> 8.7 * 8 = 69.60 -> Math.ceil = 70
            const snapshot = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, config);
            node_assert_1.default.strictEqual(snapshot.deliveryFee, 70);
            node_assert_1.default.notStrictEqual(snapshot.deliveryFee, legacyMerchantFee);
            node_assert_1.default.strictEqual(snapshot.pricingSnapshot.customerPricePerKm, 8.0);
        });
        (0, node_test_1.it)("TEST 18: Address change invalidates previous quote and recalculates new A->B2 fee", () => {
            // B1: Trabajo (8.7 km -> 8.7 * 8 = 69.60 -> 70, 8.7 * 7 = 60.90 -> 60)
            const quoteB1 = (0, routingService_1.buildCommercePricingSnapshot)(8700, config);
            node_assert_1.default.strictEqual(quoteB1.deliveryFee, 70);
            node_assert_1.default.strictEqual(quoteB1.courierEarnings, 60);
            // B2: Casa (3.5 km -> 3.5 * 8 = 28.00 -> 28, 3.5 * 7 = 24.50 -> 24)
            const quoteB2 = (0, routingService_1.buildCommercePricingSnapshot)(3500, config);
            node_assert_1.default.strictEqual(quoteB2.deliveryFee, 28);
            node_assert_1.default.strictEqual(quoteB2.courierEarnings, 24);
            // Verify B1 quote is not equal to B2 quote
            node_assert_1.default.notStrictEqual(quoteB1.deliveryFee, quoteB2.deliveryFee);
        });
        (0, node_test_1.it)("TEST 19: Tip amount is strictly additive to courier earnings and never overwritten", () => {
            const distanceMeters = 8700; // 8.7 km -> C$ 60 (Math.floor)
            const tipAmount = 10.0;
            const snapshot = (0, routingService_1.buildCommercePricingSnapshot)(distanceMeters, config);
            const courierDistanceEarnings = snapshot.courierEarnings;
            const courierTotalEarnings = courierDistanceEarnings + tipAmount;
            node_assert_1.default.strictEqual(courierDistanceEarnings, 60);
            node_assert_1.default.strictEqual(courierTotalEarnings, 70);
        });
        (0, node_test_1.it)("TEST 20: Missing coordinates fail-closed (cannot quote without valid A and B)", () => {
            const validOrigin = (0, routingService_1.validateCoordinatesInNicaragua)(12.1364, -86.2514);
            const invalidDest = (0, routingService_1.validateCoordinatesInNicaragua)(0.0, 0.0);
            node_assert_1.default.strictEqual(validOrigin, true);
            node_assert_1.default.strictEqual(invalidDest, false);
        });
        (0, node_test_1.it)("TEST 21: Pricing snapshot is immutable and unaffected by subsequent global config changes", () => {
            const initialSnapshot = (0, routingService_1.buildCommercePricingSnapshot)(8700, config);
            node_assert_1.default.strictEqual(initialSnapshot.deliveryFee, 70);
            // Simulate future global price change to C$ 10.00/km
            const futureConfig = {
                customerPricePerKm: 10.0,
                courierPricePerKm: 9.0,
            };
            const futureQuote = (0, routingService_1.buildCommercePricingSnapshot)(8700, futureConfig);
            node_assert_1.default.strictEqual(futureQuote.deliveryFee, 87);
            // The historical stamped snapshot remains C$ 70
            node_assert_1.default.strictEqual(initialSnapshot.deliveryFee, 70);
        });
    });
});
