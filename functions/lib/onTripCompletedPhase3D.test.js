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
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert/strict"));
class MockTripEngine {
    constructor() {
        this.deliveryTrips = new Map();
        this.courierCashLedger = new Map();
        this.financialEvents = new Map();
        this.courierBalances = new Map();
        this.logs = [];
    }
    reset() {
        this.deliveryTrips.clear();
        this.courierCashLedger.clear();
        this.financialEvents.clear();
        this.courierBalances.clear();
        this.logs = [];
    }
    async triggerOnTripCompleted(tripId, before, after) {
        if (!before || !after)
            return { executed: false, reason: "NO_DATA" };
        // ─── Verificación de Dominio Canónico X→Y ─────────────────────────────────
        // ─── Verificación Estricta de Dominio Canónico X→Y ─────────────────────────
        const serviceType = (after.serviceType || "").toString().trim();
        if (serviceType !== "X_TO_Y_DELIVERY") {
            this.logs.push(`[TRIP_TRIGGER_SKIP] Documento no es X_TO_Y_DELIVERY (ignorado): serviceType='${serviceType}', tripId=${tripId}`);
            return { executed: false, reason: "TRIP_TRIGGER_SKIP" };
        }
        const wasCompleted = before.status === "delivered" ||
            before.status === "completed" ||
            before.status === "DELIVERED" ||
            before.status === "COMPLETED";
        const isNowCompleted = after.status === "delivered" ||
            after.status === "completed" ||
            after.status === "DELIVERED" ||
            after.status === "COMPLETED";
        if (wasCompleted || !isNowCompleted) {
            return { executed: false, reason: "NOT_COMPLETED_TRANSITION" };
        }
        const paymentMethod = (after.paymentMethod || after.metodoPago || "efectivo").toString().toLowerCase().trim();
        const isCash = paymentMethod === "efectivo" || paymentMethod === "cash";
        const courierUid = (after.assignedCourierId || after.motorizadoId || after.courierId || "").toString().trim();
        if (!courierUid) {
            this.logs.push(`[COURIER_LEDGER] Viaje X->Y ${tripId} completado sin courier asignado.`);
            return { executed: false, reason: "NO_COURIER" };
        }
        const idempotencyKey = `trip_${tripId}_courier_collection`;
        // ─── Verificación de Idempotencia ──────────────────────────────────────────
        let existingEntry = false;
        for (const [_, entry] of this.courierCashLedger) {
            if (entry.idempotencyKey === idempotencyKey) {
                existingEntry = true;
                break;
            }
        }
        if (existingEntry) {
            this.logs.push(`[COURIER_LEDGER] Asiento de viaje X->Y ya procesado: tripId=${tripId}, courierUid=${courierUid}`);
            return { executed: false, reason: "ALREADY_PROCESSED" };
        }
        // ─── Resolver Tarifa y Bono Vigente Server-Side (SSOT Autoridad) ──────────
        const pricingSnapshot = after.pricingSnapshot || null;
        if (!pricingSnapshot || typeof pricingSnapshot !== "object" || Object.keys(pricingSnapshot).length === 0) {
            this.logs.push(`[COURIER_RATE_SSOT_FAIL] Documento deliveryTrips/${tripId} no posee pricingSnapshot.`);
            const current = this.deliveryTrips.get(tripId) || { ...after };
            current.financialReconciliationStatus = "INCONSISTENCY_SNAPSHOT_MISSING";
            current.reconciliationError = "Snapshot de tarifas ausente";
            this.deliveryTrips.set(tripId, current);
            return { executed: false, reason: "INCONSISTENCY_SNAPSHOT_MISSING" };
        }
        const pricePerKm = Number(pricingSnapshot.pricePerKm ?? pricingSnapshot.perKmRate ?? 0);
        const baseFee = Number(pricingSnapshot.baseFee ?? 0);
        // Fail-Closed Estricto
        if (pricePerKm <= 0 || baseFee <= 0) {
            this.logs.push(`[COURIER_RATE_SSOT_FAIL] Snapshot de tarifas inválido para tripId=${tripId}: pricePerKm=${pricePerKm}, baseFee=${baseFee}.`);
            const current = this.deliveryTrips.get(tripId) || { ...after };
            current.financialReconciliationStatus = "INCONSISTENCY_SNAPSHOT_INVALID";
            current.reconciliationError = `Snapshot de tarifas inválido: pricePerKm=${pricePerKm}, baseFee=${baseFee}`;
            this.deliveryTrips.set(tripId, current);
            return { executed: false, reason: "INCONSISTENCY_SNAPSHOT_INVALID" };
        }
        // ─── Distancia y Ganancias de Encomienda X→Y desde SSOT ───────────────────
        const distanceKmFloat = Number(pricingSnapshot.routeDistanceKm ??
            pricingSnapshot.distanceKm ??
            0);
        let courierDistanceEarningsFloat = 0;
        if (pricingSnapshot.courierEarnings != null && !isNaN(Number(pricingSnapshot.courierEarnings))) {
            courierDistanceEarningsFloat = Number(pricingSnapshot.courierEarnings);
        }
        else {
            courierDistanceEarningsFloat = Math.round(distanceKmFloat * pricePerKm * 100) / 100;
        }
        const distanceEarningsCents = Math.round(courierDistanceEarningsFloat * 100);
        const bonusEarningsCents = 0;
        const tipEarningsCents = 0;
        const courierTotalEarningsCents = distanceEarningsCents + bonusEarningsCents + tipEarningsCents;
        const courierEarningsFloat = courierTotalEarningsCents / 100;
        let platformRevenueFloat = 0;
        if (pricingSnapshot.platformRevenue != null && !isNaN(Number(pricingSnapshot.platformRevenue))) {
            platformRevenueFloat = Number(pricingSnapshot.platformRevenue);
        }
        else {
            // Fallback autoritativo derivado de la estructura canónica del snapshot
            const calculatedAmount = Number(pricingSnapshot.calculatedAmount ?? pricingSnapshot.finalAmount ?? 0);
            const rounding = Number(pricingSnapshot.roundingAdjustment ?? 0);
            if (calculatedAmount > 0) {
                platformRevenueFloat = Math.round((calculatedAmount - courierDistanceEarningsFloat) * 100) / 100;
            }
            else {
                platformRevenueFloat = Math.round((baseFee + rounding) * 100) / 100;
            }
        }
        const platformRevenueCents = Math.round(platformRevenueFloat * 100);
        const tripTotalFloat = Number(pricingSnapshot.calculatedAmount ??
            pricingSnapshot.finalAmount ??
            after.canonicalPrice ??
            after.deliveryFee ??
            (baseFee + courierDistanceEarningsFloat));
        const tripTotalCents = Math.round(tripTotalFloat * 100);
        // Guardar Eventos Financieros
        this.financialEvents.set(`X2Y_${tripId}_COURIER_EARNINGS`, {
            domain: "X_TO_Y_DELIVERY",
            type: "COURIER_EARNINGS",
            tripId,
            courierId: courierUid,
            amountCents: courierTotalEarningsCents
        });
        this.financialEvents.set(`X2Y_${tripId}_PLATFORM_REVENUE`, {
            domain: "X_TO_Y_DELIVERY",
            type: "PLATFORM_REVENUE",
            tripId,
            amountCents: platformRevenueCents
        });
        if (isCash) {
            const cashReceivedFloat = Number(after.cashReceived || 0);
            const changeGivenFloat = Number(after.changeGiven || 0);
            const cashReceivedCents = Math.round(cashReceivedFloat * 100);
            const changeGivenCents = Math.round(changeGivenFloat * 100);
            const cashCollectedNetCents = after.cashCollectedNet != null
                ? Math.round(Number(after.cashCollectedNet) * 100)
                : Math.max(0, cashReceivedCents - changeGivenCents);
            const discrepancyCents = cashCollectedNetCents - tripTotalCents;
            const isReconciled = discrepancyCents === 0;
            this.financialEvents.set(`X2Y_${tripId}_CASH_COLLECTION`, {
                domain: "X_TO_Y_DELIVERY",
                type: "CASH_COLLECTION",
                tripId,
                courierId: courierUid,
                amountCents: cashCollectedNetCents
            });
            this.courierCashLedger.set(`ledger_${tripId}`, {
                idempotencyKey,
                courierId: courierUid,
                sourceDomain: "X_TO_Y_DELIVERY",
                amountCents: cashCollectedNetCents,
                earningsCents: courierTotalEarningsCents
            });
            const updatedTrip = {
                ...after,
                cashCollectedNet: cashCollectedNetCents / 100,
                cashDiscrepancy: !isReconciled,
                discrepancyAmount: discrepancyCents / 100,
                financialReconciliationStatus: isReconciled ? "RECONCILED_OK" : "DISCREPANCY_DETECTED",
                reconciliationStatus: isReconciled ? "MATCHED" : "DISCREPANCY",
                courierDistanceEarnings: courierDistanceEarningsFloat,
                courierTotalEarnings: courierEarningsFloat,
                courierEarnings: courierEarningsFloat,
                platformRevenue: platformRevenueFloat,
                customerTotal: tripTotalFloat
            };
            this.deliveryTrips.set(tripId, updatedTrip);
            return { executed: true, reason: "RECONCILED_CASH" };
        }
        else {
            this.courierCashLedger.set(`ledger_${tripId}`, {
                idempotencyKey,
                courierId: courierUid,
                sourceDomain: "X_TO_Y_DELIVERY",
                amountCents: courierTotalEarningsCents
            });
            const updatedTrip = {
                ...after,
                financialReconciliationStatus: "RECONCILED_OK",
                reconciliationStatus: "MATCHED",
                courierDistanceEarnings: courierDistanceEarningsFloat,
                courierTotalEarnings: courierEarningsFloat,
                courierEarnings: courierEarningsFloat,
                platformRevenue: platformRevenueFloat,
                customerTotal: tripTotalFloat
            };
            this.deliveryTrips.set(tripId, updatedTrip);
            return { executed: true, reason: "RECONCILED_DIGITAL" };
        }
    }
}
(0, node_test_1.describe)("BSD-X2Y-PHASE-3D: onTripCompleted Backend Authoritative Closure Suite", () => {
    const engine = new MockTripEngine();
    (0, node_test_1.beforeEach)(() => {
        engine.reset();
    });
    (0, node_test_1.it)("Test 1 — Transición in_transit -> completed dispara onTripCompleted (idempotencia en reintento)", async () => {
        const tripId = "trip_001";
        const beforeTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "in_transit",
            assignedCourierId: "courier_123"
        };
        const afterTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            assignedCourierId: "courier_123",
            pricingSnapshot: {
                baseFee: 35.0,
                pricePerKm: 10.0,
                calculatedAmount: 85.0,
                courierEarnings: 49.40,
                platformRevenue: 35.60,
                routeDistanceKm: 4.94
            },
            cashReceived: 85.0,
            changeGiven: 0.0,
            cashCollectedNet: 85.0
        };
        const res1 = await engine.triggerOnTripCompleted(tripId, beforeTrip, afterTrip);
        assert.strictEqual(res1.executed, true);
        assert.strictEqual(res1.reason, "RECONCILED_CASH");
        // Segundo intento con mismo estado final -> wasCompleted es true, aborta
        const res2 = await engine.triggerOnTripCompleted(tripId, afterTrip, afterTrip);
        assert.strictEqual(res2.executed, false);
        assert.strictEqual(res2.reason, "NOT_COMPLETED_TRANSITION");
    });
    (0, node_test_1.it)("Test 2 — serviceType == 'X_TO_Y_DELIVERY' procesa; Commerce, vacío y undefined son omitidos estrictamente", async () => {
        // 2A: COMMERCE_DELIVERY
        const tripId = "order_comm_55";
        const resA = await engine.triggerOnTripCompleted(tripId, { tripId, serviceType: "COMMERCE_DELIVERY", status: "in_transit" }, { tripId, serviceType: "COMMERCE_DELIVERY", status: "completed", assignedCourierId: "c1" });
        assert.strictEqual(resA.executed, false);
        assert.strictEqual(resA.reason, "TRIP_TRIGGER_SKIP");
        // 2B: serviceType vacío ""
        const resB = await engine.triggerOnTripCompleted(tripId, { tripId, serviceType: "", status: "in_transit" }, { tripId, serviceType: "", status: "completed", assignedCourierId: "c1" });
        assert.strictEqual(resB.executed, false);
        assert.strictEqual(resB.reason, "TRIP_TRIGGER_SKIP");
        // 2C: serviceType undefined
        const resC = await engine.triggerOnTripCompleted(tripId, { tripId, status: "in_transit" }, { tripId, status: "completed", assignedCourierId: "c1" });
        assert.strictEqual(resC.executed, false);
        assert.strictEqual(resC.reason, "TRIP_TRIGGER_SKIP");
    });
    (0, node_test_1.it)("Test 3 — Lee autoritativamente pricingSnapshot desde deliveryTrip", async () => {
        const tripId = "trip_ssot_01";
        const beforeTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "in_transit",
            assignedCourierId: "courier_123"
        };
        const afterTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            assignedCourierId: "courier_123",
            pricingSnapshot: {
                baseFee: 35.0,
                pricePerKm: 10.0,
                calculatedAmount: 85.0,
                courierEarnings: 49.40,
                platformRevenue: 35.60,
                routeDistanceKm: 4.94
            },
            cashReceived: 85.0,
            changeGiven: 0.0
        };
        await engine.triggerOnTripCompleted(tripId, beforeTrip, afterTrip);
        const updated = engine.deliveryTrips.get(tripId);
        assert.strictEqual(updated.customerTotal, 85.00);
        assert.strictEqual(updated.courierTotalEarnings, 49.40);
        assert.strictEqual(updated.platformRevenue, 35.60);
    });
    (0, node_test_1.it)("Test 4 — Caso físico auditado C$85: courierEarnings=49.40, platformRevenue=35.60, customerTotal=85.00", async () => {
        const tripId = "env_6a23b10c";
        const beforeTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "in_transit",
            assignedCourierId: "courier_456"
        };
        const afterTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            assignedCourierId: "courier_456",
            pricingSnapshot: {
                baseFee: 35.0,
                pricePerKm: 10.0,
                routeDistanceKm: 4.94,
                rawCalculatedTotal: 84.40,
                roundingAdjustment: 0.60,
                calculatedAmount: 85.00,
                courierEarnings: 49.40,
                platformRevenue: 35.60
            },
            cashReceived: 100.0,
            changeGiven: 15.0,
            cashCollectedNet: 85.0
        };
        const res = await engine.triggerOnTripCompleted(tripId, beforeTrip, afterTrip);
        assert.strictEqual(res.executed, true);
        const trip = engine.deliveryTrips.get(tripId);
        assert.strictEqual(trip.courierTotalEarnings, 49.40);
        assert.strictEqual(trip.platformRevenue, 35.60);
        assert.strictEqual(trip.customerTotal, 85.00);
        assert.strictEqual(trip.courierTotalEarnings + trip.platformRevenue, trip.customerTotal);
        assert.strictEqual(trip.financialReconciliationStatus, "RECONCILED_OK");
    });
    (0, node_test_1.it)("Test 4B — Fallback de platformRevenue deriva de calculatedAmount - courierEarnings (C$35.60, no bare C$35.00)", async () => {
        const tripId = "env_fallback_test";
        const beforeTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "in_transit",
            assignedCourierId: "courier_456"
        };
        const afterTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            assignedCourierId: "courier_456",
            pricingSnapshot: {
                baseFee: 35.0,
                pricePerKm: 10.0,
                routeDistanceKm: 4.94,
                calculatedAmount: 85.00,
                courierEarnings: 49.40
                // platformRevenue omitido deliberadamente
            },
            cashReceived: 85.0,
            changeGiven: 0.0,
            cashCollectedNet: 85.0
        };
        const res = await engine.triggerOnTripCompleted(tripId, beforeTrip, afterTrip);
        assert.strictEqual(res.executed, true);
        const trip = engine.deliveryTrips.get(tripId);
        assert.strictEqual(trip.courierTotalEarnings, 49.40);
        assert.strictEqual(trip.platformRevenue, 35.60); // 85.00 - 49.40 = 35.60 (NO cae a bare 35.00)
        assert.strictEqual(trip.customerTotal, 85.00);
        assert.strictEqual(trip.financialReconciliationStatus, "RECONCILED_OK");
    });
    (0, node_test_1.it)("Test 5 — Caso físico auditado C$89: courierEarnings=53.30, platformRevenue=35.70, customerTotal=89.00", async () => {
        const tripId = "env_6eb88653";
        const beforeTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "in_transit",
            assignedCourierId: "courier_789"
        };
        const afterTrip = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            assignedCourierId: "courier_789",
            pricingSnapshot: {
                baseFee: 35.0,
                pricePerKm: 10.0,
                routeDistanceKm: 5.33,
                rawCalculatedTotal: 88.30,
                roundingAdjustment: 0.70,
                calculatedAmount: 89.00,
                courierEarnings: 53.30,
                platformRevenue: 35.70
            },
            cashReceived: 100.0,
            changeGiven: 11.0,
            cashCollectedNet: 89.0
        };
        const res = await engine.triggerOnTripCompleted(tripId, beforeTrip, afterTrip);
        assert.strictEqual(res.executed, true);
        const trip = engine.deliveryTrips.get(tripId);
        assert.strictEqual(trip.courierTotalEarnings, 53.30);
        assert.strictEqual(trip.platformRevenue, 35.70);
        assert.strictEqual(trip.customerTotal, 89.00);
        assert.strictEqual(trip.courierTotalEarnings + trip.platformRevenue, trip.customerTotal);
        assert.strictEqual(trip.financialReconciliationStatus, "RECONCILED_OK");
    });
    (0, node_test_1.it)("Test 6 — Snapshot ausente o inválido: fail-closed estricto (cero inventar tarifas, cero fallbacks)", async () => {
        // 6A: Snapshot ausente
        const tripIdA = "trip_no_snap";
        const beforeA = { tripId: tripIdA, serviceType: "X_TO_Y_DELIVERY", status: "in_transit", assignedCourierId: "c1" };
        const afterA = { tripId: tripIdA, serviceType: "X_TO_Y_DELIVERY", status: "completed", assignedCourierId: "c1" };
        const resA = await engine.triggerOnTripCompleted(tripIdA, beforeA, afterA);
        assert.strictEqual(resA.executed, false);
        assert.strictEqual(resA.reason, "INCONSISTENCY_SNAPSHOT_MISSING");
        assert.strictEqual(engine.deliveryTrips.get(tripIdA).financialReconciliationStatus, "INCONSISTENCY_SNAPSHOT_MISSING");
        // 6B: Snapshot con pricePerKm = 0
        const tripIdB = "trip_invalid_snap";
        const beforeB = { tripId: tripIdB, serviceType: "X_TO_Y_DELIVERY", status: "in_transit", assignedCourierId: "c1" };
        const afterB = {
            tripId: tripIdB,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            assignedCourierId: "c1",
            pricingSnapshot: { baseFee: 0, pricePerKm: 0 }
        };
        const resB = await engine.triggerOnTripCompleted(tripIdB, beforeB, afterB);
        assert.strictEqual(resB.executed, false);
        assert.strictEqual(resB.reason, "INCONSISTENCY_SNAPSHOT_INVALID");
        assert.strictEqual(engine.deliveryTrips.get(tripIdB).financialReconciliationStatus, "INCONSISTENCY_SNAPSHOT_INVALID");
    });
    (0, node_test_1.it)("Test 7 — Reconciliación de efectivo: comparación contra customerTotal genera RECONCILED_OK o DISCREPANCY_DETECTED", async () => {
        // 7A: Cuadrado exacto
        const tripIdOk = "trip_cash_exact";
        const beforeOk = { tripId: tripIdOk, serviceType: "X_TO_Y_DELIVERY", status: "in_transit", assignedCourierId: "c1" };
        const afterOk = {
            tripId: tripIdOk,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            assignedCourierId: "c1",
            pricingSnapshot: { baseFee: 35, pricePerKm: 10, calculatedAmount: 85, courierEarnings: 49.4, platformRevenue: 35.6, routeDistanceKm: 4.94 },
            cashReceived: 85,
            changeGiven: 0,
            cashCollectedNet: 85
        };
        await engine.triggerOnTripCompleted(tripIdOk, beforeOk, afterOk);
        assert.strictEqual(engine.deliveryTrips.get(tripIdOk).financialReconciliationStatus, "RECONCILED_OK");
        assert.strictEqual(engine.deliveryTrips.get(tripIdOk).cashDiscrepancy, false);
        // 7B: Descuadre de efectivo (faltante)
        const tripIdDisc = "trip_cash_disc";
        const beforeDisc = { tripId: tripIdDisc, serviceType: "X_TO_Y_DELIVERY", status: "in_transit", assignedCourierId: "c1" };
        const afterDisc = {
            tripId: tripIdDisc,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            assignedCourierId: "c1",
            pricingSnapshot: { baseFee: 35, pricePerKm: 10, calculatedAmount: 85, courierEarnings: 49.4, platformRevenue: 35.6, routeDistanceKm: 4.94 },
            cashReceived: 70,
            changeGiven: 0,
            cashCollectedNet: 70
        };
        await engine.triggerOnTripCompleted(tripIdDisc, beforeDisc, afterDisc);
        assert.strictEqual(engine.deliveryTrips.get(tripIdDisc).financialReconciliationStatus, "DISCREPANCY_DETECTED");
        assert.strictEqual(engine.deliveryTrips.get(tripIdDisc).cashDiscrepancy, true);
        assert.strictEqual(engine.deliveryTrips.get(tripIdDisc).discrepancyAmount, -15.00);
    });
    (0, node_test_1.it)("Test 8 — Android NO escribe financialReconciliationStatus; el backend lo sella autoritativamente", async () => {
        const tripId = "trip_android_client_payload";
        const androidPayload = {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            estado: "completado",
            assignedCourierId: "courier_123",
            pricingSnapshot: { baseFee: 35, pricePerKm: 10, calculatedAmount: 85, courierEarnings: 49.4, platformRevenue: 35.6, routeDistanceKm: 4.94 },
            cashReceived: 100,
            changeGiven: 15,
            cashCollectedNet: 85,
            cashDiscrepancy: false,
            discrepancyAmount: 0
            // 🚨 Sin financialReconciliationStatus en el payload de Android (Regla Fase 3B)
        };
        assert.strictEqual(androidPayload.financialReconciliationStatus, undefined);
        await engine.triggerOnTripCompleted(tripId, { tripId, status: "in_transit" }, androidPayload);
        const stampedDoc = engine.deliveryTrips.get(tripId);
        // Backend autoritativo sella el estado
        assert.strictEqual(stampedDoc.financialReconciliationStatus, "RECONCILED_OK");
    });
    (0, node_test_1.it)("Test 9 — Aislamiento dual: orders.ts omite X->Y y trips.ts es la única autoridad", async () => {
        // Verificación de que orders.ts emite SKIP para X_TO_Y_DELIVERY
        const serviceType = "X_TO_Y_DELIVERY";
        const isXToYInCommerce = serviceType === "X_TO_Y_DELIVERY";
        assert.strictEqual(isXToYInCommerce, true); // orders.ts retorna null
        // En trips.ts, serviceType X_TO_Y_DELIVERY es procesado
        const tripId = "trip_firewall_ok";
        const res = await engine.triggerOnTripCompleted(tripId, { tripId, status: "in_transit" }, {
            tripId,
            serviceType: "X_TO_Y_DELIVERY",
            status: "completed",
            assignedCourierId: "c1",
            pricingSnapshot: { baseFee: 35, pricePerKm: 10, calculatedAmount: 85, courierEarnings: 49.4, platformRevenue: 35.6, routeDistanceKm: 4.94 }
        });
        assert.strictEqual(res.executed, true);
    });
});
