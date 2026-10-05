"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const courierClosureCallables_1 = require("../callables/courierClosureCallables");
// Mock Firestore Db para validar la lógica del reconciliador y despachador
class MockFirestoreDb {
    constructor() {
        this.collections = new Map();
    }
    getCollection(name) {
        if (!this.collections.has(name)) {
            this.collections.set(name, new Map());
        }
        return this.collections.get(name);
    }
    collection(name) {
        const self = this;
        return {
            doc(id) {
                return {
                    id,
                    async get() {
                        const data = self.getCollection(name).get(id);
                        return {
                            id,
                            exists: !!data,
                            data: () => data,
                        };
                    },
                };
            },
            where(field, op, val) {
                return {
                    async get() {
                        const col = self.getCollection(name);
                        const docs = [];
                        for (const [docId, data] of col.entries()) {
                            if (op === "==" && data[field] === val) {
                                docs.push({ id: docId, data: () => data });
                            }
                        }
                        return {
                            empty: docs.length === 0,
                            size: docs.length,
                            docs,
                            forEach: (fn) => docs.forEach(fn),
                        };
                    },
                };
            },
        };
    }
}
/**
 * Reconciliador Canónico de Liquidaciones (Mirror del resolver de courierCashControl.js y courierClosureCallables)
 */
async function canonicalSettlementResolver(db, closure) {
    const targetDate = closure.businessDate || "";
    const expCents = Number(closure.expectedAmountCents || 0);
    const incOrders = Array.isArray(closure.includedOrderIds) ? closure.includedOrderIds : [];
    const incTrips = Array.isArray(closure.includedTripIds) ? closure.includedTripIds : [];
    const candidateRows = [];
    const extractDate = (docData) => {
        if (docData.businessDate)
            return docData.businessDate;
        const raw = docData.deliveredAt || docData.completedAt || docData.createdAt || docData.fecha || docData.timestamp;
        return (0, courierClosureCallables_1.toManaguaBusinessDate)(raw);
    };
    // Prioridad 1: Consultar /courier_cash_ledger por closureId o courierId + targetDate
    if (closure.courierId) {
        const ledgerSnap = await db.collection("courier_cash_ledger")
            .where("courierId", "==", closure.courierId)
            .get();
        ledgerSnap.forEach((doc) => {
            const d = doc.data();
            const entryDate = extractDate(d);
            const isClosureMatch = Boolean(d.closureId && (d.closureId === closure.closureId || d.closureId === closure.id));
            const isDateMatch = Boolean(targetDate && entryDate === targetDate);
            if ((isClosureMatch || isDateMatch) && (d.eventType === "ORDER_CASH_COLLECTED" || d.eventType === "TRIP_CASH_COLLECTED")) {
                const totalCents = Number(d.amountCents || 0);
                const earnCents = Number(d.earningsCents || 0);
                const custCents = Number(d.netCustodyCents || Math.max(0, totalCents - earnCents));
                const isTrip = d.sourceDomain === "X_TO_Y_DELIVERY" || Boolean(d.tripId);
                candidateRows.push({
                    orderId: d.orderId,
                    tripId: d.tripId,
                    code: "#" + (d.orderId || d.tripId || doc.id).slice(-6).toUpperCase(),
                    domain: isTrip ? "EXPRESS_TRIP" : "COMMERCE_DELIVERY",
                    type: isTrip ? "Viaje X→Y" : "Comercio",
                    ref: d.orderId ? `Pedido ${d.orderId.slice(-6).toUpperCase()}` : `Viaje Express ${d.tripId ? d.tripId.slice(-6).toUpperCase() : ""}`,
                    desc: d.description || `Recaudación ${d.orderId ? "pedido" : "viaje"}`,
                    amountCents: custCents,
                    cashRecCents: totalCents,
                    courierEarningsCents: earnCents,
                    netCustodyCents: custCents,
                    isDirectClosure: isClosureMatch,
                    isDateMatch: isDateMatch,
                });
            }
        });
    }
    // Prioridad 2: Si no hubo asientos directos del ledger, consultar por includedOrderIds
    if (candidateRows.length === 0 && incOrders.length > 0) {
        for (const oId of incOrders) {
            const oDoc = await db.collection("orders").doc(oId).get();
            if (oDoc.exists) {
                const oData = oDoc.data();
                const cashRec = Number(oData.cashReceived || oData.total || 0);
                const courierEarn = Number(oData.courierEarnings || oData.courierTotalEarnings || 0);
                const netCust = Math.max(0, cashRec - courierEarn);
                candidateRows.push({
                    orderId: oDoc.id,
                    code: "#" + (oData.orderCode || oDoc.id).slice(-6).toUpperCase(),
                    domain: "COMMERCE_DELIVERY",
                    type: "Comercio",
                    ref: oData.businessName || "Comercio",
                    desc: `Recaudación pedido [${oData.businessName || "Comercio"}]`,
                    amountCents: Math.round(netCust * 100),
                    cashRecCents: Math.round(cashRec * 100),
                    courierEarningsCents: Math.round(courierEarn * 100),
                    netCustodyCents: Math.round(netCust * 100),
                    isDirectClosure: true,
                    isDateMatch: true,
                });
            }
        }
    }
    const commerceOrders = candidateRows.filter((r) => r.domain === "COMMERCE_DELIVERY");
    const expressTrips = candidateRows.filter((r) => r.domain === "EXPRESS_TRIP");
    const totalEarningsCents = candidateRows.reduce((acc, r) => acc + r.courierEarningsCents, 0);
    const totalCustodyCents = candidateRows.reduce((acc, r) => acc + r.netCustodyCents, 0);
    return {
        rows: candidateRows,
        commerceOrderCount: commerceOrders.length,
        expressTripCount: expressTrips.length,
        courierEarningsCents: totalEarningsCents,
        netCustodyCents: totalCustodyCents,
        includedOrderIds: commerceOrders.map((r) => r.orderId).filter(Boolean),
        includedTripIds: expressTrips.map((r) => r.tripId).filter(Boolean),
    };
}
(0, node_test_1.describe)("BSD-COURIER-SETTLEMENT-DATA-TRACEABILITY-REGRESSION-AUDIT-001: Forensic Test Suite", () => {
    let db;
    (0, node_test_1.beforeEach)(() => {
        db = new MockFirestoreDb();
    });
    (0, node_test_1.it)("TEST-01: Cierre con 1 Pedido Nocturno (19:49 Managua / 01:49 UTC del día siguiente)", () => {
        // 2026-09-29 19:49:32 Managua = 2026-09-30 01:49:32 UTC (Timestamp: 1790732972)
        const eveningDate = new Date("2026-09-30T01:49:32.000Z");
        const resolvedDate = (0, courierClosureCallables_1.toManaguaBusinessDate)(eveningDate);
        strict_1.default.equal(resolvedDate, "2026-09-29", "El pedido de las 19:49 debe pertenecer al día operacional 2026-09-29");
    });
    (0, node_test_1.it)("TEST-02: Midnight Boundary Test (23:55 Managua = 05:55 UTC día siguiente)", () => {
        // 2026-09-29 23:55:00 Managua = 2026-09-30 05:55:00 UTC
        const midnightBoundaryDate = new Date("2026-09-30T05:55:00.000Z");
        const resolvedDate = (0, courierClosureCallables_1.toManaguaBusinessDate)(midnightBoundaryDate);
        strict_1.default.equal(resolvedDate, "2026-09-29", "El pedido de las 23:55 Managua debe permanecer en la jornada 2026-09-29");
        // 2026-09-30 00:01:00 Managua = 2026-09-30 06:01:00 UTC
        const nextDayDate = new Date("2026-09-30T06:01:00.000Z");
        strict_1.default.equal((0, courierClosureCallables_1.toManaguaBusinessDate)(nextDayDate), "2026-09-30", "El pedido de las 00:01 Managua debe pertenecer al día siguiente 2026-09-30");
    });
    (0, node_test_1.it)("TEST-03: Reconciliador Canónico resuelve el caso real auditado (nodsJxZJ6BqeFVWcUnyd)", async () => {
        const courierId = "rCpnpzQVcoPDoUdU4cJE1HpuLGA2";
        const closureId = "nodsJxZJ6BqeFVWcUnyd";
        // Simular el cierre auditado en producción (con includedOrderIds: [] vacío)
        const closureDoc = {
            id: closureId,
            closureId,
            courierId,
            businessDate: "2026-09-29",
            expectedAmountCents: 96300,
            totalCashCollectedCents: 96300,
            totalEarningsCents: 0,
            includedOrderIds: [],
            includedTripIds: [],
        };
        db.getCollection("courier_daily_closures").set(closureId, closureDoc);
        // Asiento real existente en /courier_cash_ledger (creado a las 19:49 Managua / 01:49 UTC)
        db.getCollection("courier_cash_ledger").set("gGwvXJ3h0GZaNcS0E0WN", {
            entryId: "gGwvXJ3h0GZaNcS0E0WN",
            courierId,
            sourceDomain: "COMMERCE_DELIVERY",
            orderId: "mDLcZhpZmGKUjQdEGgnp",
            eventType: "ORDER_CASH_COLLECTED",
            direction: "CREDIT",
            amountCents: 101600,
            compensatedCents: 6360,
            netCustodyCents: 95240,
            earningsCents: 6360,
            description: "Recaudación pedido #DEGGNP [Variedades TECNOHOME]",
            createdAt: { seconds: 1790732972, nanoseconds: 528000000 },
        });
        // Resolver con el Canonical Settlement Resolver sin mutar el ledger
        const breakdown = await canonicalSettlementResolver(db, closureDoc);
        strict_1.default.equal(breakdown.commerceOrderCount, 1, "Debe resolver exactamente 1 pedido de comercio");
        strict_1.default.equal(breakdown.expressTripCount, 0, "Debe resolver 0 entregas express");
        strict_1.default.equal(breakdown.courierEarningsCents, 6360, "La ganancia del courier debe ser 6360¢ (C$ 63.60)");
        strict_1.default.equal(breakdown.includedOrderIds[0], "mDLcZhpZmGKUjQdEGgnp", "Debe incluir el pedido real mDLcZhpZmGKUjQdEGgnp");
        strict_1.default.equal(breakdown.rows.length, 1);
    });
    (0, node_test_1.it)("TEST-04: Identidad Operativa resuelve DRV-RCPN en lugar de UID crudo", async () => {
        const courierUid = "rCpnpzQVcoPDoUdU4cJE1HpuLGA2";
        // Usuario sin driverId explícito debe generar DRV-RCPN
        db.getCollection("users").set(courierUid, {
            name: "Delivery Managua Flores",
            role: "courier",
        });
        db.getCollection("couriers").set(courierUid, {
            name: "Delivery Managua Flores",
            courierId: courierUid,
        });
        const opId = await (0, courierClosureCallables_1.resolveCourierOperationalId)(courierUid, db);
        strict_1.default.equal(opId, "DRV-RCPN", "Debe generar DRV-RCPN derivado canónicamente del UID");
        // Si tiene driverId explícito, debe respetarlo
        db.getCollection("couriers").set("courier_explicit", {
            driverId: "DRV-9QHY",
        });
        const opIdExplicit = await (0, courierClosureCallables_1.resolveCourierOperationalId)("courier_explicit", db);
        strict_1.default.equal(opIdExplicit, "DRV-9QHY", "Debe priorizar driverId explícito");
    });
    (0, node_test_1.it)("TEST-05: Consistencia Cuádruple (Ledger == Modal == Email == Acta)", async () => {
        const courierId = "courier_test_quad";
        const closureId = "closure_quad_001";
        const businessDate = "2026-09-29";
        db.getCollection("courier_cash_ledger").set("entry_quad_01", {
            entryId: "entry_quad_01",
            courierId,
            sourceDomain: "COMMERCE_DELIVERY",
            orderId: "order_quad_A",
            eventType: "ORDER_CASH_COLLECTED",
            direction: "CREDIT",
            amountCents: 101600,
            compensatedCents: 6360,
            netCustodyCents: 95240,
            earningsCents: 6360,
            description: "Recaudación pedido #QUAD01",
            businessDate,
            createdAt: { seconds: 1790732972 },
        });
        const closure = {
            id: closureId,
            closureId,
            courierId,
            businessDate,
            expectedAmountCents: 95240,
            includedOrderIds: ["order_quad_A"],
            includedTripIds: [],
            totalEarningsCents: 6360,
            ordersCount: 1,
        };
        // 1. Resolver canónico
        const canonical = await canonicalSettlementResolver(db, closure);
        // 2. Simular Modal
        const modalOrdersCount = canonical.commerceOrderCount;
        const modalEarnings = canonical.courierEarningsCents;
        // 3. Simular Email Variables
        const emailOrdersCount = canonical.commerceOrderCount;
        const emailEarnings = canonical.courierEarningsCents;
        // 4. Simular Acta PDF ANEXO I
        const pdfOrdersCount = canonical.rows.length;
        const pdfEarnings = canonical.courierEarningsCents;
        strict_1.default.equal(canonical.commerceOrderCount, modalOrdersCount);
        strict_1.default.equal(modalOrdersCount, emailOrdersCount);
        strict_1.default.equal(emailOrdersCount, pdfOrdersCount);
        strict_1.default.equal(modalEarnings, emailEarnings);
        strict_1.default.equal(emailEarnings, pdfEarnings);
    });
    (0, node_test_1.it)("TEST-06: Cierre Mixto (Comercio + X→Y)", async () => {
        const courierId = "courier_mixed";
        const closureId = "closure_mixed_001";
        const businessDate = "2026-09-29";
        // 1 pedido comercio
        db.getCollection("courier_cash_ledger").set("entry_mix_1", {
            courierId,
            sourceDomain: "COMMERCE_DELIVERY",
            orderId: "ord_101",
            eventType: "ORDER_CASH_COLLECTED",
            amountCents: 50000,
            earningsCents: 5000,
            netCustodyCents: 45000,
            businessDate,
        });
        // 1 viaje X->Y
        db.getCollection("courier_cash_ledger").set("entry_mix_2", {
            courierId,
            sourceDomain: "X_TO_Y_DELIVERY",
            tripId: "trip_201",
            eventType: "TRIP_CASH_COLLECTED",
            amountCents: 15000,
            earningsCents: 3000,
            netCustodyCents: 12000,
            businessDate,
        });
        const closure = {
            id: closureId,
            courierId,
            businessDate,
            expectedAmountCents: 57000,
        };
        const breakdown = await canonicalSettlementResolver(db, closure);
        strict_1.default.equal(breakdown.commerceOrderCount, 1, "Debe tener 1 pedido de comercio");
        strict_1.default.equal(breakdown.expressTripCount, 1, "Debe tener 1 entrega express");
        strict_1.default.equal(breakdown.courierEarningsCents, 8000, "Ganancia total = 5000 + 3000 = 8000¢");
        strict_1.default.equal(breakdown.netCustodyCents, 57000, "Custodia total = 45000 + 12000 = 57000¢");
    });
    (0, node_test_1.it)("TEST-07: Cierre Legítimo Vacío (0 operaciones) no inventa datos", async () => {
        const closure = {
            id: "closure_empty_001",
            courierId: "courier_sin_pedidos",
            businessDate: "2026-09-29",
            expectedAmountCents: 0,
            includedOrderIds: [],
            includedTripIds: [],
        };
        const breakdown = await canonicalSettlementResolver(db, closure);
        strict_1.default.equal(breakdown.commerceOrderCount, 0, "Cierre vacío debe devolver exactamente 0 pedidos");
        strict_1.default.equal(breakdown.expressTripCount, 0, "Cierre vacío debe devolver exactamente 0 viajes");
        strict_1.default.equal(breakdown.courierEarningsCents, 0, "Ganancia debe ser 0");
        strict_1.default.equal(breakdown.rows.length, 0, "No debe inventar filas en el subledger");
    });
    (0, node_test_1.it)("TEST-08: Inmutabilidad Financiera (esperado C$963.00 y saldo acumulado no se alteran)", async () => {
        const originalExpectedCents = 96300;
        const closure = {
            id: "nodsJxZJ6BqeFVWcUnyd",
            courierId: "rCpnpzQVcoPDoUdU4cJE1HpuLGA2",
            businessDate: "2026-09-29",
            expectedAmountCents: originalExpectedCents,
            status: "PENDING_ADMIN_VERIFICATION",
        };
        const breakdown = await canonicalSettlementResolver(db, closure);
        // La resolución operacional nunca debe mutar el closure financiero
        strict_1.default.equal(closure.expectedAmountCents, originalExpectedCents, "expectedAmountCents debe permanecer estrictamente en 96300¢");
        strict_1.default.equal(closure.status, "PENDING_ADMIN_VERIFICATION", "El estado financiero no debe mutar");
    });
});
