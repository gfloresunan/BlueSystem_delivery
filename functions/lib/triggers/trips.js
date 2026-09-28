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
exports.onTripCompleted = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const courierAccessPolicy_1 = require("../callables/courierAccessPolicy");
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
/**
 * Trigger: onTripCompleted — Dominio B: Envíos X a Y (/deliveryTrips/{tripId})
 *
 * Cuando un viaje X_TO_Y transiciona a 'delivered' o 'completed', si el método de pago
 * es efectivo (CASH), genera el asiento inmutable en /courier_cash_ledger (sourceDomain = X_TO_Y_DELIVERY)
 * e incrementa atómicamente el pasivo del repartidor en /courier_balances/{courierId}.
 *
 * Idempotencia: order_{tripId}_courier_collection
 */
exports.onTripCompleted = functions.firestore
    .document("deliveryTrips/{tripId}")
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const before = change.before.data();
    const after = change.after.data();
    const tripId = context.params.tripId;
    if (!before || !after)
        return null;
    // ─── Verificación Estricta de Dominio Canónico X→Y ─────────────────────────
    const serviceType = (after.serviceType || "").toString().trim();
    if (serviceType !== "X_TO_Y_DELIVERY") {
        functions.logger.info(`[TRIP_TRIGGER_SKIP] Documento no es X_TO_Y_DELIVERY (ignorado): serviceType='${serviceType}', tripId=${tripId}`);
        return null;
    }
    const wasCompleted = before.status === "delivered" ||
        before.status === "completed" ||
        before.status === "DELIVERED" ||
        before.status === "COMPLETED";
    const isNowCompleted = after.status === "delivered" ||
        after.status === "completed" ||
        after.status === "DELIVERED" ||
        after.status === "COMPLETED";
    if (wasCompleted || !isNowCompleted)
        return null;
    const paymentMethod = (after.paymentMethod || after.metodoPago || "efectivo").toString().toLowerCase().trim();
    const isCash = paymentMethod === "efectivo" || paymentMethod === "cash";
    const courierUid = (after.assignedCourierId || after.motorizadoId || after.courierId || "").toString().trim();
    if (!courierUid) {
        functions.logger.warn(`[COURIER_LEDGER] Viaje X->Y ${tripId} completado sin courier asignado.`);
        return null;
    }
    const idempotencyKey = `trip_${tripId}_courier_collection`;
    // ─── Verificación de Idempotencia ──────────────────────────────────────────
    const existingSnap = await db
        .collection("courier_cash_ledger")
        .where("idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();
    if (!existingSnap.empty) {
        functions.logger.info(`[COURIER_LEDGER] Asiento de viaje X->Y ya procesado: tripId=${tripId}, courierUid=${courierUid}`);
        return null;
    }
    // ─── Resolver Tarifa y Bono Vigente Server-Side (SSOT Autoridad) ──────────
    const pricingSnapshot = after.pricingSnapshot || null;
    if (!pricingSnapshot || typeof pricingSnapshot !== "object" || Object.keys(pricingSnapshot).length === 0) {
        functions.logger.error(`[COURIER_RATE_SSOT_FAIL] Documento deliveryTrips/${tripId} no posee pricingSnapshot. Abortando liquidación para evitar divergencia contable.`);
        await change.after.ref.update({
            financialReconciliationStatus: "INCONSISTENCY_SNAPSHOT_MISSING",
            reconciliationError: "Snapshot de tarifas ausente",
            reconciledAt: FieldValue.serverTimestamp()
        });
        return null;
    }
    const pricePerKm = Number((_b = (_a = pricingSnapshot.pricePerKm) !== null && _a !== void 0 ? _a : pricingSnapshot.perKmRate) !== null && _b !== void 0 ? _b : 0);
    const baseFee = Number((_c = pricingSnapshot.baseFee) !== null && _c !== void 0 ? _c : 0);
    // Fail-Closed Estricto: Si no hay tarifa por km o base fee válida en el snapshot, marcar inconsistencia y abortar
    if (pricePerKm <= 0 || baseFee <= 0) {
        functions.logger.error(`[COURIER_RATE_SSOT_FAIL] Snapshot de tarifas inválido para tripId=${tripId}: pricePerKm=${pricePerKm}, baseFee=${baseFee}. Abortando liquidación.`);
        await change.after.ref.update({
            financialReconciliationStatus: "INCONSISTENCY_SNAPSHOT_INVALID",
            reconciliationError: `Snapshot de tarifas inválido: pricePerKm=${pricePerKm}, baseFee=${baseFee}`,
            reconciledAt: FieldValue.serverTimestamp()
        });
        return null;
    }
    // ─── Distancia y Ganancias de Encomienda X→Y desde SSOT ───────────────────
    const distanceKmFloat = Number((_f = (_e = (_d = pricingSnapshot.routeDistanceKm) !== null && _d !== void 0 ? _d : pricingSnapshot.distanceKm) !== null && _e !== void 0 ? _e : after.routeDistanceKm) !== null && _f !== void 0 ? _f : (after.routeDistanceMeters ? Number(after.routeDistanceMeters) / 1000 : 0));
    const distanceMeters = Math.round(distanceKmFloat * 1000);
    // courierEarnings: Si pricingSnapshot.courierEarnings viene definido, usarlo directamente
    let courierDistanceEarningsFloat = 0;
    if (pricingSnapshot.courierEarnings != null && !isNaN(Number(pricingSnapshot.courierEarnings))) {
        courierDistanceEarningsFloat = Number(pricingSnapshot.courierEarnings);
    }
    else {
        courierDistanceEarningsFloat = Math.round(distanceKmFloat * pricePerKm * 100) / 100;
    }
    const distanceEarningsCents = Math.round(courierDistanceEarningsFloat * 100);
    const bonusEarningsCents = 0; // Para X->Y, no aplica bono de sistema estándar
    const tipAmountFloat = Number(after.tipAmount || after.tip || 0);
    const tipEarningsCents = Math.round(tipAmountFloat * 100);
    const courierTotalEarningsCents = distanceEarningsCents + bonusEarningsCents + tipEarningsCents;
    const courierEarningsFloat = courierTotalEarningsCents / 100;
    // platformRevenue: Si pricingSnapshot.platformRevenue viene definido, usarlo directamente
    let platformRevenueFloat = 0;
    if (pricingSnapshot.platformRevenue != null && !isNaN(Number(pricingSnapshot.platformRevenue))) {
        platformRevenueFloat = Number(pricingSnapshot.platformRevenue);
    }
    else {
        // Fallback autoritativo derivado de la estructura canónica del snapshot
        const calculatedAmount = Number((_h = (_g = pricingSnapshot.calculatedAmount) !== null && _g !== void 0 ? _g : pricingSnapshot.finalAmount) !== null && _h !== void 0 ? _h : 0);
        const rounding = Number((_j = pricingSnapshot.roundingAdjustment) !== null && _j !== void 0 ? _j : 0);
        if (calculatedAmount > 0) {
            platformRevenueFloat = Math.round((calculatedAmount - courierDistanceEarningsFloat) * 100) / 100;
        }
        else {
            platformRevenueFloat = Math.round((baseFee + rounding) * 100) / 100;
        }
    }
    const platformRevenueCents = Math.round(platformRevenueFloat * 100);
    // Total de cliente autoritativo (desde pricingSnapshot o deliveryTrips)
    const tripTotalFloat = Number((_o = (_m = (_l = (_k = pricingSnapshot.calculatedAmount) !== null && _k !== void 0 ? _k : pricingSnapshot.finalAmount) !== null && _l !== void 0 ? _l : after.canonicalPrice) !== null && _m !== void 0 ? _m : after.deliveryFee) !== null && _o !== void 0 ? _o : (baseFee + courierDistanceEarningsFloat));
    const tripTotalCents = Math.round(tripTotalFloat * 100);
    const courierName = after.driverName || after.motorizadoNombre || after.courierName || "Repartidor";
    const balanceRef = db.collection("courier_balances").doc(courierUid);
    const balanceSnap = await balanceRef.get();
    const currentBalanceData = balanceSnap.exists ? balanceSnap.data() || {} : {};
    const currentOutstandingCents = Number(currentBalanceData.cashOutstandingCents || 0);
    const currentPayableBalanceCents = Number(currentBalanceData.courierPayableBalanceCents || 0);
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    // Eventos Financieros (Phase 3D)
    const eventsRef = db.collection("financial_events");
    batch.set(eventsRef.doc(`X2Y_${tripId}_COURIER_EARNINGS`), {
        domain: "X_TO_Y_DELIVERY",
        type: "COURIER_EARNINGS",
        tripId,
        courierId: courierUid,
        amountCents: courierTotalEarningsCents,
        createdAt: now
    });
    batch.set(eventsRef.doc(`X2Y_${tripId}_PLATFORM_REVENUE`), {
        domain: "X_TO_Y_DELIVERY",
        type: "PLATFORM_REVENUE",
        tripId,
        amountCents: platformRevenueCents,
        createdAt: now
    });
    if (isCash) {
        const cashReceivedFloat = Number(after.cashReceived || 0);
        const changeGivenFloat = Number(after.changeGiven || after.change || 0);
        const cashReceivedCents = Math.round(cashReceivedFloat * 100);
        const changeGivenCents = Math.round(changeGivenFloat * 100);
        const cashCollectedNetCents = after.cashCollectedNet != null
            ? Math.round(Number(after.cashCollectedNet) * 100)
            : Math.max(0, cashReceivedCents - changeGivenCents);
        const discrepancyCents = cashCollectedNetCents - tripTotalCents;
        const isReconciled = discrepancyCents === 0;
        batch.set(eventsRef.doc(`X2Y_${tripId}_CASH_COLLECTION`), {
            domain: "X_TO_Y_DELIVERY",
            type: "CASH_COLLECTION",
            tripId,
            courierId: courierUid,
            amountCents: cashCollectedNetCents,
            createdAt: now
        });
        // Compensación determinista
        const totalPayableToCourierCents = currentPayableBalanceCents + courierTotalEarningsCents;
        const compensationCents = Math.min(cashCollectedNetCents, totalPayableToCourierCents);
        const netCustodyIncrementCents = Math.max(0, cashCollectedNetCents - compensationCents);
        const remainingPayableCents = totalPayableToCourierCents - compensationCents;
        // 1. Asiento en /courier_cash_ledger
        const ledgerRef = db.collection("courier_cash_ledger").doc();
        batch.set(ledgerRef, {
            entryId: ledgerRef.id,
            courierId: courierUid,
            courierName,
            sourceDomain: "X_TO_Y_DELIVERY",
            tripId,
            orderId: tripId,
            eventType: "TRIP_CASH_COLLECTED",
            direction: "CREDIT", // Incrementa custodia física
            amountCents: cashCollectedNetCents,
            compensatedCents: compensationCents,
            netCustodyCents: netCustodyIncrementCents,
            earningsCents: courierTotalEarningsCents,
            distanceEarningsCents,
            bonusEarningsCents,
            tipEarningsCents,
            currency: "NIO",
            description: `Recaudación encomienda X->Y #${tripId.slice(-6).toUpperCase()}`,
            idempotencyKey,
            createdAt: now,
            createdByUid: "SYSTEM_TRIGGER",
            createdByType: "SYSTEM_TRIGGER",
        });
        // 2. Actualización atómica en /courier_balances/{courierUid}
        batch.set(balanceRef, {
            courierId: courierUid,
            courierName,
            cashOutstandingCents: FieldValue.increment(netCustodyIncrementCents),
            courierPayableBalanceCents: remainingPayableCents,
            totalCollectedCents: FieldValue.increment(cashCollectedNetCents),
            totalCompensatedCents: FieldValue.increment(compensationCents),
            totalEarningsCents: FieldValue.increment(courierTotalEarningsCents),
            totalDistanceEarningsCents: FieldValue.increment(distanceEarningsCents),
            totalBonusEarningsCents: FieldValue.increment(bonusEarningsCents),
            totalTipEarningsCents: FieldValue.increment(tipEarningsCents),
            totalDiscrepanciesCents: FieldValue.increment(discrepancyCents !== 0 ? Math.abs(discrepancyCents) : 0),
            lastCollectionAt: now,
            updatedAt: now,
            reconciliationStatus: "IN_SYNC",
        }, { merge: true });
        // 3. Actualización de conciliación en /deliveryTrips/{tripId}
        batch.update(change.after.ref, {
            cashCollectedNet: cashCollectedNetCents / 100,
            cashDiscrepancy: !isReconciled,
            discrepancyAmount: discrepancyCents / 100,
            financialReconciliationStatus: isReconciled ? "RECONCILED_OK" : "DISCREPANCY_DETECTED",
            reconciliationStatus: isReconciled ? "MATCHED" : "DISCREPANCY",
            routeDistanceMeters: distanceMeters,
            routeDistanceKm: distanceKmFloat,
            courierRatePerKmApplied: pricePerKm,
            courierOrderBonusApplied: 0,
            courierDistanceEarnings: courierDistanceEarningsFloat,
            courierBonusEarnings: bonusEarningsCents / 100,
            courierTipEarnings: tipEarningsCents / 100,
            courierTotalEarnings: courierEarningsFloat,
            courierEarnings: courierEarningsFloat, // Legacy alias
            platformRevenue: platformRevenueFloat,
            customerTotal: tripTotalFloat,
            compensatedAmount: compensationCents / 100,
            reconciledAt: now,
        });
        await batch.commit();
        if (courierUid) {
            try {
                await (0, courierAccessPolicy_1.evaluateCourierFinancialAccessInternal)(courierUid);
            }
            catch (evalErr) {
                functions.logger.warn(`[FINANCE_EVAL_WARN] Error reevaluando acceso de courier ${courierUid} tras viaje X->Y:`, evalErr);
            }
        }
        functions.logger.info(`[COURIER_LEDGER] Custodia asentada para viaje X->Y: tripId=${tripId}, courier=${courierUid}, neto=${netCustodyIncrementCents}¢, compensado=${compensationCents}¢, saldo_favor=${remainingPayableCents}¢`);
    }
    else {
        // Viaje X->Y Digital (Tarjeta / Transferencia)
        let compensationCents = 0;
        let newOutstandingCents = currentOutstandingCents;
        let remainingPayableCents = currentPayableBalanceCents;
        if (currentOutstandingCents > 0) {
            compensationCents = Math.min(currentOutstandingCents, courierTotalEarningsCents);
            newOutstandingCents = currentOutstandingCents - compensationCents;
            const surplusPayableCents = courierTotalEarningsCents - compensationCents;
            remainingPayableCents = currentPayableBalanceCents + surplusPayableCents;
        }
        else {
            remainingPayableCents = currentPayableBalanceCents + courierTotalEarningsCents;
        }
        // 1. Asiento en /courier_cash_ledger
        const ledgerRef = db.collection("courier_cash_ledger").doc();
        batch.set(ledgerRef, {
            entryId: ledgerRef.id,
            courierId: courierUid,
            courierName,
            sourceDomain: "X_TO_Y_DELIVERY",
            tripId,
            orderId: tripId,
            eventType: "TRIP_EARNINGS_DIGITAL",
            direction: compensationCents > 0 ? "DEBIT" : "PAYABLE",
            amountCents: courierTotalEarningsCents,
            compensatedCents: compensationCents,
            earningsCents: courierTotalEarningsCents,
            distanceEarningsCents,
            bonusEarningsCents,
            tipEarningsCents,
            currency: "NIO",
            description: `Ganancia encomienda digital #${tripId.slice(-6).toUpperCase()}`,
            idempotencyKey,
            createdAt: now,
            createdByUid: "SYSTEM_TRIGGER",
            createdByType: "SYSTEM_TRIGGER",
        });
        // 2. Actualización en /courier_balances/{courierUid}
        batch.set(balanceRef, {
            courierId: courierUid,
            courierName,
            cashOutstandingCents: newOutstandingCents,
            courierPayableBalanceCents: remainingPayableCents,
            totalCompensatedCents: FieldValue.increment(compensationCents),
            totalEarningsCents: FieldValue.increment(courierTotalEarningsCents),
            totalDistanceEarningsCents: FieldValue.increment(distanceEarningsCents),
            totalBonusEarningsCents: FieldValue.increment(bonusEarningsCents),
            totalTipEarningsCents: FieldValue.increment(tipEarningsCents),
            lastCollectionAt: now,
            updatedAt: now,
            reconciliationStatus: "IN_SYNC",
        }, { merge: true });
        // 3. Conciliación en el viaje
        batch.update(change.after.ref, {
            financialReconciliationStatus: "RECONCILED_OK",
            reconciliationStatus: "MATCHED",
            routeDistanceMeters: distanceMeters,
            routeDistanceKm: distanceKmFloat,
            courierRatePerKmApplied: pricePerKm,
            courierOrderBonusApplied: bonusEarningsCents / 100,
            courierDistanceEarnings: courierDistanceEarningsFloat,
            courierBonusEarnings: bonusEarningsCents / 100,
            courierTipEarnings: tipEarningsCents / 100,
            courierTotalEarnings: courierEarningsFloat,
            courierEarnings: courierEarningsFloat, // Legacy alias
            platformRevenue: platformRevenueFloat,
            customerTotal: tripTotalFloat,
            compensatedAmount: compensationCents / 100,
            reconciledAt: now,
        });
        await batch.commit();
        if (courierUid) {
            try {
                await (0, courierAccessPolicy_1.evaluateCourierFinancialAccessInternal)(courierUid);
            }
            catch (evalErr) {
                functions.logger.warn(`[FINANCE_EVAL_WARN] Error reevaluando acceso de courier ${courierUid} tras viaje digital:`, evalErr);
            }
        }
        functions.logger.info(`[COURIER_LEDGER] Ganancia digital asentada para viaje X->Y: tripId=${tripId}, courier=${courierUid}, ganancia=${courierTotalEarningsCents}¢, compensado=${compensationCents}¢, saldo_favor=${remainingPayableCents}¢`);
    }
    // ─── BSD-X2Y-CANCELLATION-RATING-COURIER-TRIP-METRICS-UX-001: Métricas Históricas ───
    if (courierUid) {
        try {
            const courierRef = db.collection("couriers").doc(courierUid);
            const userRef = db.collection("users").doc(courierUid);
            await Promise.all([
                courierRef.set({
                    completedX2YTrips: FieldValue.increment(1),
                    completedTotalTrips: FieldValue.increment(1),
                    completedTripsCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true }),
                userRef.set({
                    completedX2YTrips: FieldValue.increment(1),
                    completedTotalTrips: FieldValue.increment(1),
                    completedTripsCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true }),
            ]);
            functions.logger.info(`[COURIER_METRICS] Incrementados viajes X->Y para courier=${courierUid}`);
        }
        catch (metricsErr) {
            functions.logger.warn(`[COURIER_METRICS_WARN] Error actualizando métricas X->Y de courier ${courierUid}:`, metricsErr);
        }
    }
    return null;
});
//# sourceMappingURL=trips.js.map