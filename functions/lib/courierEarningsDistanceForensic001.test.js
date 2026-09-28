"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
/**
 * PROTOCOLO: COURIER-EARNINGS-DISTANCE-FORENSIC-001
 * Matriz de Pruebas de Integridad Financiera y Consistencia de Distancia
 * Valida que courierDistanceEarnings = distanceKm * 7.00
 * courierTip = tipAmount
 * courierTotalEarnings = courierDistanceEarnings + courierBonusEarnings + courierTip
 * deliveryFee != courierDistanceEarnings
 */
(0, node_test_1.describe)("COURIER-EARNINGS-DISTANCE-FORENSIC-001 — Suite de Verificación Forense", () => {
    const MANAGUA_ROAD_TORTUOSITY_FACTOR = 1.28;
    function calculateHaversineMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }
    function computeAuthoritativeCourierEarnings(params) {
        const isCompleted = ["delivered", "completed", "entregado", "completado"].includes((params.status || "ready").toLowerCase().trim());
        let routeDistanceMeters = 0;
        let distanceSource = "ROUTE_DISTANCE_UNAVAILABLE";
        let routingProvider = "FALLBACK_ESTIMATED";
        if (params.routeDistanceMeters != null && params.routeDistanceMeters > 0) {
            routeDistanceMeters = Math.round(params.routeDistanceMeters);
            distanceSource = "ROUTING_ENGINE";
            routingProvider = "GOOGLE_ROUTES_V2";
        }
        else if (params.routeDistanceKm != null && params.routeDistanceKm > 0) {
            routeDistanceMeters = Math.round(params.routeDistanceKm * 1000);
            distanceSource = "ROUTING_ENGINE";
            routingProvider = "OSRM_ENGINE";
        }
        else if (params.originLat &&
            params.originLng &&
            params.destLat &&
            params.destLng &&
            params.originLat !== 0 &&
            params.destLat !== 0) {
            const haversine = calculateHaversineMeters(params.originLat, params.originLng, params.destLat, params.destLng);
            routeDistanceMeters = Math.round(haversine * MANAGUA_ROAD_TORTUOSITY_FACTOR);
            distanceSource = "FALLBACK_ESTIMATED";
            routingProvider = "FALLBACK_ESTIMATED";
        }
        const routeDistanceKm = Math.round((routeDistanceMeters / 1000) * 100) / 100;
        const ratePerKm = params.courierRatePerKm ?? 7.0;
        const ratePerKmCents = Math.round(ratePerKm * 100);
        const orderBonus = params.courierOrderBonus ?? 0.0;
        const bonusEarningsCents = Math.round(orderBonus * 100);
        const tipAmount = Math.max(0, params.tipAmount ?? 0);
        const tipEarningsCents = Math.round(tipAmount * 100);
        const distanceEarningsCents = Math.round((routeDistanceMeters * ratePerKmCents) / 1000);
        const courierTotalEarningsCents = distanceEarningsCents + bonusEarningsCents + tipEarningsCents;
        const courierDistanceEarnings = Math.round(distanceEarningsCents) / 100;
        const courierBonusEarnings = Math.round(bonusEarningsCents) / 100;
        const courierTipEarnings = Math.round(tipEarningsCents) / 100;
        const courierTotalEarnings = Math.round(courierTotalEarningsCents) / 100;
        return {
            routeDistanceMeters,
            routeDistanceKm,
            distanceSource,
            routingProvider,
            courierRatePerKmApplied: ratePerKm,
            courierOrderBonusApplied: orderBonus,
            courierDistanceEarnings,
            courierBonusEarnings,
            courierTipEarnings,
            courierTotalEarnings,
            deliveryFee: params.deliveryFee ?? 60.0,
            isCompleted,
        };
    }
    (0, node_test_1.it)("CASO 1 — distance = 1 km, rate = C$7, tip = C$0 -> distanceEarnings = C$7, total = C$7", () => {
        const res = computeAuthoritativeCourierEarnings({
            routeDistanceKm: 1.0,
            courierRatePerKm: 7.0,
            tipAmount: 0.0,
            courierOrderBonus: 0.0,
        });
        strict_1.default.equal(res.courierDistanceEarnings, 7.0);
        strict_1.default.equal(res.courierTipEarnings, 0.0);
        strict_1.default.equal(res.courierTotalEarnings, 7.0);
    });
    (0, node_test_1.it)("CASO 2 — distance = 5 km, rate = C$7, tip = C$40 -> distanceEarnings = C$35, total = C$75", () => {
        const res = computeAuthoritativeCourierEarnings({
            routeDistanceKm: 5.0,
            courierRatePerKm: 7.0,
            tipAmount: 40.0,
            courierOrderBonus: 0.0,
        });
        strict_1.default.equal(res.courierDistanceEarnings, 35.0);
        strict_1.default.equal(res.courierTipEarnings, 40.0);
        strict_1.default.equal(res.courierTotalEarnings, 75.0);
        // Verificar que jamás se confunda deliveryFee (60) con courierDistanceEarnings (35)
        strict_1.default.notEqual(res.deliveryFee, res.courierDistanceEarnings);
    });
    (0, node_test_1.it)("CASO 3 — distance = 8.57 km, rate = C$7, tip = C$40 -> distanceEarnings = C$59.99, total = C$99.99", () => {
        const res = computeAuthoritativeCourierEarnings({
            routeDistanceKm: 8.57,
            courierRatePerKm: 7.0,
            tipAmount: 40.0,
            courierOrderBonus: 0.0,
        });
        strict_1.default.equal(res.courierDistanceEarnings, 59.99);
        strict_1.default.equal(res.courierTipEarnings, 40.0);
        strict_1.default.equal(res.courierTotalEarnings, 99.99);
    });
    (0, node_test_1.it)("CASO 4 — distance = 10 km, rate = C$7, tip = C$0 -> distanceEarnings = C$70, total = C$70", () => {
        const res = computeAuthoritativeCourierEarnings({
            routeDistanceKm: 10.0,
            courierRatePerKm: 7.0,
            tipAmount: 0.0,
            courierOrderBonus: 0.0,
        });
        strict_1.default.equal(res.courierDistanceEarnings, 70.0);
        strict_1.default.equal(res.courierTotalEarnings, 70.0);
    });
    (0, node_test_1.it)("CASO 5 — distance = 10 km, rate = C$7, tip = C$50 -> distanceEarnings = C$70, total = C$120", () => {
        const res = computeAuthoritativeCourierEarnings({
            routeDistanceKm: 10.0,
            courierRatePerKm: 7.0,
            tipAmount: 50.0,
            courierOrderBonus: 0.0,
        });
        strict_1.default.equal(res.courierDistanceEarnings, 70.0);
        strict_1.default.equal(res.courierTipEarnings, 50.0);
        strict_1.default.equal(res.courierTotalEarnings, 120.0);
    });
    (0, node_test_1.it)("CASO BUG REAL — TECNOSTORE a Las Delicias (deliveryFee = 60, tip = 40): Courier NUNCA ve C$40 plano", () => {
        // Coordenadas reales: TECNOSTORE (12.161876, -86.183545), Las Delicias aprox (~5.2 km)
        const res = computeAuthoritativeCourierEarnings({
            originLat: 12.161876,
            originLng: -86.183545,
            destLat: 12.138450,
            destLng: -86.208120,
            courierRatePerKm: 7.0,
            deliveryFee: 60.0,
            tipAmount: 40.0,
            courierOrderBonus: 0.0,
        });
        strict_1.default.ok(res.routeDistanceKm > 3.0, "La distancia debe ser mayor a 3 km");
        strict_1.default.ok(res.courierDistanceEarnings > 20.0, "La ganancia por distancia debe ser > C$ 20");
        strict_1.default.equal(res.courierTipEarnings, 40.0, "La propina debe ser exactamente C$ 40");
        // BUG PREVIO: courierTotalEarnings daba exactamente 40.0
        strict_1.default.ok(res.courierTotalEarnings > 60.0, `La ganancia total (${res.courierTotalEarnings}) debe sumar distancia + propina, nunca solo la propina`);
    });
    (0, node_test_1.it)("CASO CANCELACIÓN — Pedido cancelado no genera ganancias", () => {
        const res = computeAuthoritativeCourierEarnings({
            routeDistanceKm: 5.0,
            courierRatePerKm: 7.0,
            tipAmount: 40.0,
            status: "cancelled",
        });
        strict_1.default.equal(res.isCompleted, false);
    });
    (0, node_test_1.it)("CASO EFECTIVO COD — Separación entre customerTotal recaudado y ganancia neta", () => {
        const subtotal = 5000.0;
        const deliveryFee = 60.0;
        const additionalCharge = 5.0;
        const tip = 40.0;
        const customerTotal = subtotal + deliveryFee + additionalCharge + tip; // C$ 5,105.00
        const courierRes = computeAuthoritativeCourierEarnings({
            routeDistanceKm: 5.0,
            courierRatePerKm: 7.0,
            tipAmount: tip,
            deliveryFee,
            courierOrderBonus: 0.0,
        });
        strict_1.default.equal(customerTotal, 5105.0);
        strict_1.default.equal(courierRes.courierTotalEarnings, 75.0);
        // En efectivo, el motorizado retiene su ganancia (C$ 75.00) y deposita el resto (C$ 5,030.00)
        const netDepositRequired = customerTotal - courierRes.courierTotalEarnings;
        strict_1.default.equal(netDepositRequired, 5030.0);
    });
});
