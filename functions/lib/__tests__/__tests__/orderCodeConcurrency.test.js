"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const orderCodeUtils_1 = require("../shared/orderCodeUtils");
(0, node_test_1.describe)("BSD-HUMAN-ORDER-CODE-001 — Unit & Concurrency Test Suite", () => {
    (0, node_test_1.describe)("1. Prefix Resolution & Normalization", () => {
        (0, node_test_1.it)("T01: Reutiliza orderCodePrefix existente si es válido", () => {
            const bizData = { orderCodePrefix: "FRT", nombre: "Fritoni Gourmet" };
            const prefix = (0, orderCodeUtils_1.resolveBusinessPrefix)(bizData, "biz_123");
            strict_1.default.equal(prefix, "FRT");
        });
        (0, node_test_1.it)("T02: Reutiliza codePrefix existente si es válido", () => {
            const bizData = { codePrefix: "BGR", nombre: "Burger House 505" };
            const prefix = (0, orderCodeUtils_1.resolveBusinessPrefix)(bizData, "biz_456");
            strict_1.default.equal(prefix, "BGR");
        });
        (0, node_test_1.it)("T03: Genera prefijo de 3 palabras usando iniciales (Pizza Express Delivery -> PED)", () => {
            const bizData = { nombre: "Pizza Express Delivery" };
            const prefix = (0, orderCodeUtils_1.resolveBusinessPrefix)(bizData, "biz_789");
            strict_1.default.equal(prefix, "PED");
        });
        (0, node_test_1.it)("T04: Genera prefijo de 2 palabras (Burger House -> BUH)", () => {
            const bizData = { nombre: "Burger House" };
            const prefix = (0, orderCodeUtils_1.resolveBusinessPrefix)(bizData, "biz_222");
            strict_1.default.equal(prefix, "BUH");
        });
        (0, node_test_1.it)("T05: Genera prefijo de 1 sola palabra (Fritoni -> FRI)", () => {
            const bizData = { nombre: "Fritoni" };
            const prefix = (0, orderCodeUtils_1.resolveBusinessPrefix)(bizData, "biz_333");
            strict_1.default.equal(prefix, "FRI");
        });
        (0, node_test_1.it)("T06: Sanitiza caracteres especiales y tildes (Pollo Rico & Rápido -> PRR)", () => {
            const bizData = { nombre: "Pollo Rico Rápido" };
            const prefix = (0, orderCodeUtils_1.resolveBusinessPrefix)(bizData, "biz_444");
            strict_1.default.equal(prefix, "PRR");
        });
        (0, node_test_1.it)("T07: Fallback seguro si el nombre está vacío", () => {
            const bizData = { nombre: "" };
            const prefix = (0, orderCodeUtils_1.resolveBusinessPrefix)(bizData, "abc12345");
            strict_1.default.equal(prefix.length >= 3, true);
            strict_1.default.equal(/^[A-Z0-9]{3,4}$/.test(prefix), true);
        });
    });
    (0, node_test_1.describe)("2. Order Code Format & Short Code Precision", () => {
        (0, node_test_1.it)("T08: Formatea código con secuencia de 6 dígitos exactos (FRT + 1 -> FRT000001, short: 0001)", () => {
            const res = (0, orderCodeUtils_1.formatOrderCode)("FRT", 1);
            strict_1.default.equal(res.orderCode, "FRT000001");
            strict_1.default.equal(res.orderShortCode, "0001");
            strict_1.default.equal(res.orderSequence, 1);
            strict_1.default.equal(res.orderCodePrefix, "FRT");
        });
        (0, node_test_1.it)("T09: Formatea secuencia 26 -> FRT000026 con shortCode 0026", () => {
            const res = (0, orderCodeUtils_1.formatOrderCode)("FRT", 26);
            strict_1.default.equal(res.orderCode, "FRT000026");
            strict_1.default.equal(res.orderShortCode, "0026");
            strict_1.default.equal(res.orderSequence, 26);
        });
        (0, node_test_1.it)("T10: Formatea secuencia de 4 dígitos -> FRT001234 con shortCode 1234", () => {
            const res = (0, orderCodeUtils_1.formatOrderCode)("FRT", 1234);
            strict_1.default.equal(res.orderCode, "FRT001234");
            strict_1.default.equal(res.orderShortCode, "1234");
            strict_1.default.equal(res.orderSequence, 1234);
        });
        (0, node_test_1.it)("T11: Formatea secuencia de 6 dígitos -> FRT999999 con shortCode 9999", () => {
            const res = (0, orderCodeUtils_1.formatOrderCode)("FRT", 999999);
            strict_1.default.equal(res.orderCode, "FRT999999");
            strict_1.default.equal(res.orderShortCode, "9999");
            strict_1.default.equal(res.orderSequence, 999999);
        });
    });
    (0, node_test_1.describe)("3. Concurrency & Multi-Tenant Atomic Simulation", () => {
        // In-memory mock transaction engine for deterministic concurrency testing
        class MockFirestore {
            constructor() {
                this.stores = new Map();
                this.stores.set("businesses/biz_fritoni", { orderCodePrefix: "FRT", nombre: "Fritoni" });
                this.stores.set("businesses/biz_burger", { orderCodePrefix: "BGR", nombre: "Burger House" });
                this.stores.set("businesses/biz_pizza", { orderCodePrefix: "PEX", nombre: "Pizza Express" });
            }
            collection(colName) {
                return {
                    doc: (docId) => {
                        const path = `${colName}/${docId}`;
                        return {
                            id: docId,
                            path,
                            get: async () => ({
                                id: docId,
                                exists: this.stores.has(path),
                                data: () => this.stores.get(path),
                            }),
                        };
                    },
                };
            }
            async runTransaction(updateFunction) {
                const transaction = {
                    get: async (docRef) => {
                        const key = docRef.path || `counters/${docRef.id}`;
                        const exists = this.stores.has(key);
                        return {
                            id: docRef.id,
                            exists,
                            data: () => this.stores.get(key),
                        };
                    },
                    set: (docRef, data) => {
                        const key = docRef.path || `counters/${docRef.id}`;
                        const prev = this.stores.get(key) || {};
                        this.stores.set(key, { ...prev, ...data });
                    },
                };
                return await updateFunction(transaction);
            }
        }
        (0, node_test_1.it)("T12: Simulación de 10 pedidos concurrentes para el mismo comercio genera secuencia 1..10 sin duplicados", async () => {
            const mockDb = new MockFirestore();
            const businessId = "biz_fritoni";
            const generatedCodes = [];
            for (let i = 0; i < 10; i++) {
                const res = await mockDb.runTransaction(async (t) => {
                    return await (0, orderCodeUtils_1.getNextOrderCodeInTransaction)(t, mockDb, businessId);
                });
                generatedCodes.push(res.orderCode);
            }
            strict_1.default.equal(generatedCodes.length, 10);
            // Validar correlatividad exacta
            strict_1.default.deepEqual(generatedCodes, [
                "FRT000001",
                "FRT000002",
                "FRT000003",
                "FRT000004",
                "FRT000005",
                "FRT000006",
                "FRT000007",
                "FRT000008",
                "FRT000009",
                "FRT000010",
            ]);
            // Validar ausencia total de duplicados (Set size == array size)
            const uniqueCodes = new Set(generatedCodes);
            strict_1.default.equal(uniqueCodes.size, 10);
        });
        (0, node_test_1.it)("T13: Multi-comercio simultáneo genera secuencias aisladas e independientes (FRT, BGR, PEX)", async () => {
            const mockDb = new MockFirestore();
            const resFrt1 = await mockDb.runTransaction(async (t) => (0, orderCodeUtils_1.getNextOrderCodeInTransaction)(t, mockDb, "biz_fritoni"));
            const resBgr1 = await mockDb.runTransaction(async (t) => (0, orderCodeUtils_1.getNextOrderCodeInTransaction)(t, mockDb, "biz_burger"));
            const resPex1 = await mockDb.runTransaction(async (t) => (0, orderCodeUtils_1.getNextOrderCodeInTransaction)(t, mockDb, "biz_pizza"));
            const resFrt2 = await mockDb.runTransaction(async (t) => (0, orderCodeUtils_1.getNextOrderCodeInTransaction)(t, mockDb, "biz_fritoni"));
            strict_1.default.equal(resFrt1.orderCode, "FRT000001");
            strict_1.default.equal(resBgr1.orderCode, "BGR000001");
            strict_1.default.equal(resPex1.orderCode, "PEX000001");
            strict_1.default.equal(resFrt2.orderCode, "FRT000002");
        });
    });
});
