"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// Mock de DB para validar la resolución de ANEXO I y consistencia matemática de Actas Oficiales
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
 * Función de resolución de ANEXO I (SSOT Resolver idéntico al implementado en printOfficialAct)
 */
async function resolveOfficialActDetailedItems(db, closure) {
    const detailedItems = [];
    // Intento A: Buscar en /courier_cash_ledger por closureId
    const ledgerSnap = await db.collection("courier_cash_ledger")
        .where("closureId", "==", closure.closureId || closure.id)
        .get();
    if (!ledgerSnap.empty) {
        ledgerSnap.forEach((doc) => {
            const d = doc.data();
            if (d.entryType === "CREDIT" || d.eventType === "ORDER_CASH_COLLECTED" || d.eventType === "TRIP_CASH_COLLECTED") {
                const totalCents = Number(d.amountCents || 0);
                const earnCents = Number(d.earningsCents || 0);
                const custCents = Number(d.netCustodyCents || Math.max(0, totalCents - earnCents));
                detailedItems.push({
                    id: "#" + (d.orderId || d.tripId || doc.id).slice(-6).toUpperCase(),
                    type: (d.sourceDomain === "EXPRESS_TRIP" || d.tripId) ? "Viaje X→Y" : "Comercio",
                    ref: d.orderId ? `Pedido ${d.orderId.slice(-6)}` : `Viaje ${d.tripId ? d.tripId.slice(-6) : ""}`,
                    method: "Efectivo",
                    amountCents: totalCents,
                    earningsCents: earnCents,
                    custodyCents: custCents,
                });
            }
        });
    }
    // Intento B: Si no hay registros directos, consultar por includedOrderIds
    if (detailedItems.length === 0 && Array.isArray(closure.includedOrderIds) && closure.includedOrderIds.length > 0) {
        for (const oId of closure.includedOrderIds) {
            const oDoc = await db.collection("orders").doc(oId).get();
            if (oDoc.exists) {
                const oData = oDoc.data();
                const cashRec = Number(oData.cashReceived || oData.total || 0);
                const courierEarn = Number(oData.courierEarnings || oData.courierFee || 0);
                const netCust = Math.max(0, cashRec - courierEarn);
                detailedItems.push({
                    id: "#" + (oData.orderCode || oDoc.id).slice(-6).toUpperCase(),
                    type: "Comercio",
                    ref: oData.storeName || oData.businessName || "Comercio Local",
                    method: "Efectivo",
                    amountCents: Math.round(cashRec * 100),
                    earningsCents: Math.round(courierEarn * 100),
                    custodyCents: Math.round(netCust * 100),
                });
            }
        }
    }
    return detailedItems;
}
(0, node_test_1.describe)("GAP-05: Detailed Official Act & ANEXO I Mathematical Reconciliation Suite", () => {
    let db;
    (0, node_test_1.beforeEach)(() => {
        db = new MockFirestoreDb();
        // 1. Cierre diario modelo
        db.getCollection("courier_daily_closures").set("closure_act_001", {
            id: "closure_act_001",
            closureId: "closure_act_001",
            courierId: "courier_123",
            courierName: "Juan Pérez",
            businessDate: "2026-09-29",
            expectedAmountCents: 85000, // C$ 850.00 custodia neta
            totalCashCollectedCents: 100000, // C$ 1,000.00 recaudado bruto
            totalCompensatedCents: 15000, // C$ 150.00 ganancias compensadas
            countedAmountCents: 85000,
            status: "VERIFIED",
            officialAct: {
                actNumber: "ACTA-CASH-20260929-1234-ABCD",
                verificationCode: "VERIF-SECURE-999",
            },
        });
        // 2. Asientos en /courier_cash_ledger vinculados a este closureId
        // Pedido 1: Total C$ 450, Ganancia C$ 70, Custodia Neta C$ 380
        db.getCollection("courier_cash_ledger").set("ledger_entry_01", {
            closureId: "closure_act_001",
            courierId: "courier_123",
            orderId: "ord_1001",
            entryType: "CREDIT",
            eventType: "ORDER_CASH_COLLECTED",
            sourceDomain: "COMMERCE_DELIVERY",
            amountCents: 45000,
            earningsCents: 7000,
            netCustodyCents: 38000,
        });
        // Pedido 2: Total C$ 350, Ganancia C$ 50, Custodia Neta C$ 300
        db.getCollection("courier_cash_ledger").set("ledger_entry_02", {
            closureId: "closure_act_001",
            courierId: "courier_123",
            orderId: "ord_1002",
            entryType: "CREDIT",
            eventType: "ORDER_CASH_COLLECTED",
            sourceDomain: "COMMERCE_DELIVERY",
            amountCents: 35000,
            earningsCents: 5000,
            netCustodyCents: 30000,
        });
        // Viaje Express X→Y: Total C$ 200, Ganancia C$ 30, Custodia Neta C$ 170
        db.getCollection("courier_cash_ledger").set("ledger_entry_03", {
            closureId: "closure_act_001",
            courierId: "courier_123",
            tripId: "trip_2001",
            entryType: "CREDIT",
            eventType: "TRIP_CASH_COLLECTED",
            sourceDomain: "EXPRESS_TRIP",
            amountCents: 20000,
            earningsCents: 3000,
            netCustodyCents: 17000,
        });
    });
    (0, node_test_1.it)("Test 1: Resuelve correctamente todos los pedidos y viajes X→Y asociados al closureId", async () => {
        const closure = db.getCollection("courier_daily_closures").get("closure_act_001");
        const items = await resolveOfficialActDetailedItems(db, closure);
        strict_1.default.equal(items.length, 3);
        // Validar Pedido 1
        strict_1.default.equal(items[0].id, "#D_1001");
        strict_1.default.equal(items[0].type, "Comercio");
        strict_1.default.equal(items[0].amountCents, 45000);
        strict_1.default.equal(items[0].earningsCents, 7000);
        strict_1.default.equal(items[0].custodyCents, 38000);
        // Validar Viaje X→Y
        strict_1.default.equal(items[2].id, "#P_2001");
        strict_1.default.equal(items[2].type, "Viaje X→Y");
        strict_1.default.equal(items[2].amountCents, 20000);
        strict_1.default.equal(items[2].earningsCents, 3000);
        strict_1.default.equal(items[2].custodyCents, 17000);
    });
    (0, node_test_1.it)("Test 2: Reconciliación matemática exacta (SSOT) — La suma de ANEXO I coincide exactamente con los totales del Cierre", async () => {
        const closure = db.getCollection("courier_daily_closures").get("closure_act_001");
        const items = await resolveOfficialActDetailedItems(db, closure);
        const sumTotalCollected = items.reduce((acc, i) => acc + i.amountCents, 0);
        const sumEarnings = items.reduce((acc, i) => acc + i.earningsCents, 0);
        const sumCustody = items.reduce((acc, i) => acc + i.custodyCents, 0);
        // 1. Total recaudado coincide: 450 + 350 + 200 = 1,000 (100000¢)
        strict_1.default.equal(sumTotalCollected, closure.totalCashCollectedCents);
        // 2. Total ganancias compensadas coincide: 70 + 50 + 30 = 150 (15000¢)
        strict_1.default.equal(sumEarnings, closure.totalCompensatedCents);
        // 3. Custodia Neta entregable coincide: 380 + 300 + 170 = 850 (85000¢)
        strict_1.default.equal(sumCustody, closure.expectedAmountCents);
        // 4. Fórmula fundamental: Recaudado - Compensado = Custodia Neta
        strict_1.default.equal(sumTotalCollected - sumEarnings, sumCustody);
    });
    (0, node_test_1.it)("Test 3: Fallback a includedOrderIds cuando no hay vínculo directo por closureId", async () => {
        // Cierre sin asientos directos por closureId pero con includedOrderIds
        db.getCollection("courier_daily_closures").set("closure_fallback", {
            id: "closure_fallback",
            courierId: "courier_123",
            businessDate: "2026-09-29",
            includedOrderIds: ["order_fb_1"],
            expectedAmountCents: 40000,
        });
        db.getCollection("orders").set("order_fb_1", {
            orderCode: "ORD-9999",
            storeName: "Super Pollo",
            cashReceived: 500,
            courierEarnings: 100,
            total: 500,
        });
        const closure = db.getCollection("courier_daily_closures").get("closure_fallback");
        const items = await resolveOfficialActDetailedItems(db, closure);
        strict_1.default.equal(items.length, 1);
        strict_1.default.equal(items[0].ref, "Super Pollo");
        strict_1.default.equal(items[0].amountCents, 50000);
        strict_1.default.equal(items[0].earningsCents, 10000);
        strict_1.default.equal(items[0].custodyCents, 40000); // 500 - 100 = 400 (40000¢)
    });
    (0, node_test_1.it)("Test 4: Integridad de datos — Ningún ítem tiene montos negativos o calculados de forma ficticia", async () => {
        const closure = db.getCollection("courier_daily_closures").get("closure_act_001");
        const items = await resolveOfficialActDetailedItems(db, closure);
        items.forEach((item) => {
            strict_1.default.ok(item.amountCents >= 0, `amountCents no puede ser negativo: ${item.amountCents}`);
            strict_1.default.ok(item.earningsCents >= 0, `earningsCents no puede ser negativo: ${item.earningsCents}`);
            strict_1.default.ok(item.custodyCents >= 0, `custodyCents no puede ser negativo: ${item.custodyCents}`);
            strict_1.default.equal(item.amountCents - item.earningsCents, item.custodyCents, "Matemática interna consistente");
        });
    });
});
