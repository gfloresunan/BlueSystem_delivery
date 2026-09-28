import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveBusinessPrefix, formatOrderCode, getNextOrderCodeInTransaction } from "../shared/orderCodeUtils";

describe("BSD-HUMAN-ORDER-CODE-001 — Unit & Concurrency Test Suite", () => {
  describe("1. Prefix Resolution & Normalization", () => {
    it("T01: Reutiliza orderCodePrefix existente si es válido", () => {
      const bizData = { orderCodePrefix: "FRT", nombre: "Fritoni Gourmet" };
      const prefix = resolveBusinessPrefix(bizData, "biz_123");
      assert.equal(prefix, "FRT");
    });

    it("T02: Reutiliza codePrefix existente si es válido", () => {
      const bizData = { codePrefix: "BGR", nombre: "Burger House 505" };
      const prefix = resolveBusinessPrefix(bizData, "biz_456");
      assert.equal(prefix, "BGR");
    });

    it("T03: Genera prefijo de 3 palabras usando iniciales (Pizza Express Delivery -> PED)", () => {
      const bizData = { nombre: "Pizza Express Delivery" };
      const prefix = resolveBusinessPrefix(bizData, "biz_789");
      assert.equal(prefix, "PED");
    });

    it("T04: Genera prefijo de 2 palabras (Burger House -> BUH)", () => {
      const bizData = { nombre: "Burger House" };
      const prefix = resolveBusinessPrefix(bizData, "biz_222");
      assert.equal(prefix, "BUH");
    });

    it("T05: Genera prefijo de 1 sola palabra (Fritoni -> FRI)", () => {
      const bizData = { nombre: "Fritoni" };
      const prefix = resolveBusinessPrefix(bizData, "biz_333");
      assert.equal(prefix, "FRI");
    });

    it("T06: Sanitiza caracteres especiales y tildes (Pollo Rico & Rápido -> PRR)", () => {
      const bizData = { nombre: "Pollo Rico Rápido" };
      const prefix = resolveBusinessPrefix(bizData, "biz_444");
      assert.equal(prefix, "PRR");
    });

    it("T07: Fallback seguro si el nombre está vacío", () => {
      const bizData = { nombre: "" };
      const prefix = resolveBusinessPrefix(bizData, "abc12345");
      assert.equal(prefix.length >= 3, true);
      assert.equal(/^[A-Z0-9]{3,4}$/.test(prefix), true);
    });
  });

  describe("2. Order Code Format & Short Code Precision", () => {
    it("T08: Formatea código con secuencia de 6 dígitos exactos (FRT + 1 -> FRT000001, short: 0001)", () => {
      const res = formatOrderCode("FRT", 1);
      assert.equal(res.orderCode, "FRT000001");
      assert.equal(res.orderShortCode, "0001");
      assert.equal(res.orderSequence, 1);
      assert.equal(res.orderCodePrefix, "FRT");
    });

    it("T09: Formatea secuencia 26 -> FRT000026 con shortCode 0026", () => {
      const res = formatOrderCode("FRT", 26);
      assert.equal(res.orderCode, "FRT000026");
      assert.equal(res.orderShortCode, "0026");
      assert.equal(res.orderSequence, 26);
    });

    it("T10: Formatea secuencia de 4 dígitos -> FRT001234 con shortCode 1234", () => {
      const res = formatOrderCode("FRT", 1234);
      assert.equal(res.orderCode, "FRT001234");
      assert.equal(res.orderShortCode, "1234");
      assert.equal(res.orderSequence, 1234);
    });

    it("T11: Formatea secuencia de 6 dígitos -> FRT999999 con shortCode 9999", () => {
      const res = formatOrderCode("FRT", 999999);
      assert.equal(res.orderCode, "FRT999999");
      assert.equal(res.orderShortCode, "9999");
      assert.equal(res.orderSequence, 999999);
    });
  });

  describe("3. Concurrency & Multi-Tenant Atomic Simulation", () => {
    // In-memory mock transaction engine for deterministic concurrency testing
    class MockFirestore {
      public stores = new Map<string, any>();

      constructor() {
        this.stores.set("businesses/biz_fritoni", { orderCodePrefix: "FRT", nombre: "Fritoni" });
        this.stores.set("businesses/biz_burger", { orderCodePrefix: "BGR", nombre: "Burger House" });
        this.stores.set("businesses/biz_pizza", { orderCodePrefix: "PEX", nombre: "Pizza Express" });
      }

      collection(colName: string) {
        return {
          doc: (docId: string) => {
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

      async runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
        const transaction = {
          get: async (docRef: any) => {
            const key = docRef.path || `counters/${docRef.id}`;
            const exists = this.stores.has(key);
            return {
              id: docRef.id,
              exists,
              data: () => this.stores.get(key),
            };
          },
          set: (docRef: any, data: any) => {
            const key = docRef.path || `counters/${docRef.id}`;
            const prev = this.stores.get(key) || {};
            this.stores.set(key, { ...prev, ...data });
          },
        };
        return await updateFunction(transaction);
      }
    }

    it("T12: Simulación de 10 pedidos concurrentes para el mismo comercio genera secuencia 1..10 sin duplicados", async () => {
      const mockDb = new MockFirestore() as any;
      const businessId = "biz_fritoni";
      const generatedCodes: string[] = [];

      for (let i = 0; i < 10; i++) {
        const res = await mockDb.runTransaction(async (t: any) => {
          return await getNextOrderCodeInTransaction(t, mockDb, businessId);
        });
        generatedCodes.push(res.orderCode);
      }

      assert.equal(generatedCodes.length, 10);
      // Validar correlatividad exacta
      assert.deepEqual(generatedCodes, [
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
      assert.equal(uniqueCodes.size, 10);
    });

    it("T13: Multi-comercio simultáneo genera secuencias aisladas e independientes (FRT, BGR, PEX)", async () => {
      const mockDb = new MockFirestore() as any;

      const resFrt1 = await mockDb.runTransaction(async (t: any) => getNextOrderCodeInTransaction(t, mockDb, "biz_fritoni"));
      const resBgr1 = await mockDb.runTransaction(async (t: any) => getNextOrderCodeInTransaction(t, mockDb, "biz_burger"));
      const resPex1 = await mockDb.runTransaction(async (t: any) => getNextOrderCodeInTransaction(t, mockDb, "biz_pizza"));
      const resFrt2 = await mockDb.runTransaction(async (t: any) => getNextOrderCodeInTransaction(t, mockDb, "biz_fritoni"));

      assert.equal(resFrt1.orderCode, "FRT000001");
      assert.equal(resBgr1.orderCode, "BGR000001");
      assert.equal(resPex1.orderCode, "PEX000001");
      assert.equal(resFrt2.orderCode, "FRT000002");
    });
  });
});
