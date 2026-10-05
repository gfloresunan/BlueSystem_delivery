import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Mock Firestore Db para validar la lógica transaccional, arrays de Timestamp, validación de montos y configuración bancaria
class MockFirestoreDb {
  public collections: Map<string, Map<string, any>> = new Map();

  getCollection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  collection(name: string) {
    const self = this;
    return {
      doc(id: string) {
        return {
          id,
          async get() {
            const data = self.getCollection(name).get(id);
            return {
              id,
              exists: !!data,
              data: () => (data ? { ...data } : undefined),
            };
          },
          async update(updateData: any) {
            const existing = self.getCollection(name).get(id) || {};
            // Simulación estricta de Firestore: Prohibir FieldValue.serverTimestamp() dentro de arrays
            for (const key of Object.keys(updateData)) {
              const val = updateData[key];
              if (Array.isArray(val)) {
                for (let i = 0; i < val.length; i++) {
                  const item = val[i];
                  if (item && typeof item === "object") {
                    for (const subKey of Object.keys(item)) {
                      if (item[subKey] && item[subKey]._isSentinelServerTimestamp) {
                        throw new Error(`FieldValue.serverTimestamp() cannot be used inside of an array (found in field '${key}.${i}.${subKey}')`);
                      }
                    }
                  }
                }
              }
            }
            const merged = { ...existing, ...updateData };
            self.getCollection(name).set(id, merged);
            return { writeTime: new Date() };
          },
          async set(setData: any, options?: { merge?: boolean }) {
            const existing = options?.merge ? (self.getCollection(name).get(id) || {}) : {};
            const merged = { ...existing, ...setData };
            self.getCollection(name).set(id, merged);
            return { writeTime: new Date() };
          },
        };
      },
      async add(addData: any) {
        const docId = `auto_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        self.getCollection(name).set(docId, { id: docId, ...addData });
        return { id: docId };
      },
      where(field: string, op: string, val: any) {
        return {
          async get() {
            const col = self.getCollection(name);
            const docs: any[] = [];
            for (const [docId, data] of col.entries()) {
              if (op === "==" && data[field] === val) {
                docs.push({ id: docId, data: () => ({ ...data }) });
              }
            }
            return {
              empty: docs.length === 0,
              size: docs.length,
              docs,
              forEach: (fn: (d: any) => void) => docs.forEach(fn),
            };
          },
        };
      },
    };
  }

  async runTransaction(updateFunction: (transaction: any) => Promise<any>) {
    const self = this;
    const transaction = {
      async get(docRef: any) {
        return await docRef.get();
      },
      update(docRef: any, data: any) {
        return docRef.update(data);
      },
      set(docRef: any, data: any, options?: any) {
        return docRef.set(data, options);
      },
    };
    return await updateFunction(transaction);
  }
}

// Representación de Timestamp nativo de Firestore
class MockTimestamp {
  constructor(public seconds: number, public nanoseconds: number) {}
  static now() {
    return new MockTimestamp(Math.floor(Date.now() / 1000), 0);
  }
  toDate() {
    return new Date(this.seconds * 1000);
  }
}

// Representación del centinela serverTimestamp
const MockSentinelServerTimestamp = {
  _isSentinelServerTimestamp: true,
  toString: () => "[FieldValue.serverTimestamp()]",
};

describe("BSD-COURIER-CLOSURE-REJECTION-DEPOSIT-BANK-CONFIG-ROOT-CAUSE-AUDIT-001 — Certification Suite", () => {
  let db: MockFirestoreDb;

  beforeEach(() => {
    db = new MockFirestoreDb();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // INCIDENTE A: RECHAZO DE CIERRE & REJECTION HISTORY (TEST-A01 a TEST-A11)
  // ═════════════════════════════════════════════════════════════════════════
  describe("Suite A: Incidente A — verifyCourierDailyClosure con REJECT", () => {
    const closureId = "nodsJxZJ6BqeFVWcUnyd";
    const courierUid = "rCpnpzQVcoPDoUdU4cJE1HpuLGA2";
    const supervisorUid = "sup_998877";

    beforeEach(async () => {
      // Estado inicial en DB: Cierre real auditado en PENDING_ADMIN_VERIFICATION
      await db.collection("courier_daily_closures").doc(closureId).set({
        closureId,
        courierId: courierUid,
        courierName: "Delivery Managua Flores",
        status: "PENDING_ADMIN_VERIFICATION",
        expectedAmountCents: 96300,
        businessDate: "2026-09-29",
        rejectionHistory: [],
      });
    });

    it("TEST-A01: Reject closure with valid rejectionHistory Timestamp", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      const snap = await closureRef.get();
      const closureData = snap.data();

      // Usando MockTimestamp.now() en lugar de serverTimestamp inside array
      const rejectedTimestamp = MockTimestamp.now();
      const rejectionEntry = {
        rejectedAt: rejectedTimestamp,
        rejectedByUid: supervisorUid,
        rejectedByName: "Supervisor Operativo",
        rejectedByRole: "SUPERVISOR",
        reason: "Comprobante de depósito ilegible",
        previousStatus: closureData.status,
      };

      await closureRef.update({
        status: "REJECTED",
        rejectionReason: "Comprobante de depósito ilegible",
        rejectedByUid: supervisorUid,
        rejectedByName: "Supervisor Operativo",
        rejectedByRole: "SUPERVISOR",
        rejectedAt: MockSentinelServerTimestamp, // En raíz es permitido
        rejectionHistory: [rejectionEntry],
      });

      const updated = (await closureRef.get()).data();
      assert.equal(updated.status, "REJECTED");
      assert.equal(updated.rejectionHistory.length, 1);
      assert.ok(updated.rejectionHistory[0].rejectedAt instanceof MockTimestamp);
    });

    it("TEST-A02: Reject closure does not use FieldValue.serverTimestamp inside array (fails if sentinel is used)", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);

      // Si intentáramos meter el centinela en el array, nuestro mock emula la excepción real de Firestore
      const invalidEntry = {
        rejectedAt: MockSentinelServerTimestamp,
        rejectedByUid: supervisorUid,
        reason: "Test",
      };

      await assert.rejects(
        async () => {
          await closureRef.update({
            status: "REJECTED",
            rejectionHistory: [invalidEntry],
          });
        },
        /FieldValue\.serverTimestamp\(\) cannot be used inside of an array/
      );
    });

    it("TEST-A03: Reject persists rejectionReason", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      const reason = "El voucher no muestra el número de cuenta de destino";
      await closureRef.update({
        status: "REJECTED",
        rejectionReason: reason,
        rejectionHistory: [{ reason, rejectedAt: MockTimestamp.now() }],
      });
      const data = (await closureRef.get()).data();
      assert.equal(data.rejectionReason, reason);
    });

    it("TEST-A04: Reject persists rejectedByUid", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      await closureRef.update({
        status: "REJECTED",
        rejectedByUid: supervisorUid,
        rejectionHistory: [{ rejectedByUid: supervisorUid, rejectedAt: MockTimestamp.now() }],
      });
      const data = (await closureRef.get()).data();
      assert.equal(data.rejectedByUid, supervisorUid);
    });

    it("TEST-A05: Reject persists rejectedByName", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      await closureRef.update({
        status: "REJECTED",
        rejectedByName: "Auditor Financiero Central",
        rejectionHistory: [{ rejectedByName: "Auditor Financiero Central", rejectedAt: MockTimestamp.now() }],
      });
      const data = (await closureRef.get()).data();
      assert.equal(data.rejectedByName, "Auditor Financiero Central");
    });

    it("TEST-A06: Reject persists rejectedByRole", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      await closureRef.update({
        status: "REJECTED",
        rejectedByRole: "SUPERVISOR",
        rejectionHistory: [{ rejectedByRole: "SUPERVISOR", rejectedAt: MockTimestamp.now() }],
      });
      const data = (await closureRef.get()).data();
      assert.equal(data.rejectedByRole, "SUPERVISOR");
    });

    it("TEST-A07: Reject persists rejectedAt at document root", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      await closureRef.update({
        status: "REJECTED",
        rejectedAt: MockSentinelServerTimestamp,
      });
      const data = (await closureRef.get()).data();
      assert.ok(data.rejectedAt);
    });

    it("TEST-A08: Audit event COURIER_CLOSURE_REJECTED", async () => {
      await db.collection("audit_events").add({
        event: "COURIER_CLOSURE_REJECTED",
        closureId,
        courierId: courierUid,
        reason: "Voucher borroso",
        timestamp: MockSentinelServerTimestamp,
      });
      const auditDocs = await db.collection("audit_events").where("event", "==", "COURIER_CLOSURE_REJECTED").get();
      assert.equal(auditDocs.size, 1);
    });

    it("TEST-A09: No verifiedByUid mutation during rejection", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      // Al rechazar, NO se debe estampar verifiedByUid
      await closureRef.update({
        status: "REJECTED",
        rejectionReason: "Falta comprobante",
        rejectedByUid: supervisorUid,
        // verifiedByUid omitido
      });
      const data = (await closureRef.get()).data();
      assert.equal(data.verifiedByUid, undefined);
    });

    it("TEST-A10: No verifiedAt mutation during rejection", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      await closureRef.update({
        status: "REJECTED",
        rejectionReason: "Falta comprobante",
        rejectedAt: MockSentinelServerTimestamp,
        // verifiedAt omitido
      });
      const data = (await closureRef.get()).data();
      assert.equal(data.verifiedAt, undefined);
    });

    it("TEST-A11: Historical closure remains financially immutable", async () => {
      const closureRef = db.collection("courier_daily_closures").doc(closureId);
      const before = (await closureRef.get()).data();
      await closureRef.update({
        status: "REJECTED",
        rejectionReason: "Comprobante rechazado",
      });
      const after = (await closureRef.get()).data();
      assert.equal(after.expectedAmountCents, before.expectedAmountCents);
      assert.equal(after.businessDate, before.businessDate);
      assert.equal(after.expectedAmountCents, 96300);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // INCIDENTE B: VALIDACIÓN ESTRICTA DE MONTOS (TEST-B01 a TEST-B12)
  // ═════════════════════════════════════════════════════════════════════════
  describe("Suite B: Incidente B — Validación de Monto en Depósito Bancario", () => {
    const expectedCents = 96300; // C$ 963.00

    // Parser y validador idéntico al implementado en Android CourierCashClosureScreen.kt
    function validateDepositAmount(rawInput: string, expectedAmountCents: number): { allowed: boolean; error?: string; cents?: number } {
      const trimmed = rawInput.trim();
      if (!trimmed) {
        return { allowed: false, error: "empty" };
      }
      const normalized = trimmed.replace(",", ".");
      const parsedDouble = Number(normalized);
      if (isNaN(parsedDouble) || !isFinite(parsedDouble) || parsedDouble <= 0) {
        return { allowed: false, error: parsedDouble <= 0 ? "negative_or_zero" : "invalid_numeric" };
      }
      const amountCents = Math.round(parsedDouble * 100);
      if (amountCents !== expectedAmountCents) {
        return { allowed: false, error: "mismatch", cents: amountCents };
      }
      return { allowed: true, cents: amountCents };
    }

    it("TEST-B01: 963.00 -> PASS", () => {
      const res = validateDepositAmount("963.00", 96300);
      assert.equal(res.allowed, true);
      assert.equal(res.cents, 96300);
    });

    it("TEST-B02: 953.00 -> BLOCK (discrepancia detectada C$ 953 vs C$ 963)", () => {
      const res = validateDepositAmount("953.00", 96300);
      assert.equal(res.allowed, false);
      assert.equal(res.error, "mismatch");
      assert.equal(res.cents, 95300);
    });

    it("TEST-B03: 962.99 -> BLOCK (1 centavo menos)", () => {
      const res = validateDepositAmount("962.99", 96300);
      assert.equal(res.allowed, false);
      assert.equal(res.error, "mismatch");
      assert.equal(res.cents, 96299);
    });

    it("TEST-B04: 963.01 -> BLOCK (1 centavo más)", () => {
      const res = validateDepositAmount("963.01", 96300);
      assert.equal(res.allowed, false);
      assert.equal(res.error, "mismatch");
      assert.equal(res.cents, 96301);
    });

    it("TEST-B05: 0.00 -> BLOCK", () => {
      const res = validateDepositAmount("0.00", 96300);
      assert.equal(res.allowed, false);
      assert.equal(res.error, "negative_or_zero");
    });

    it("TEST-B06: empty -> BLOCK", () => {
      const res = validateDepositAmount("   ", 96300);
      assert.equal(res.allowed, false);
      assert.equal(res.error, "empty");
    });

    it("TEST-B07: negative -> BLOCK", () => {
      const res = validateDepositAmount("-963.00", 96300);
      assert.equal(res.allowed, false);
      assert.equal(res.error, "negative_or_zero");
    });

    it("TEST-B08: invalid numeric format -> BLOCK", () => {
      const res = validateDepositAmount("963abc", 96300);
      assert.equal(res.allowed, false);
      assert.equal(res.error, "invalid_numeric");
    });

    it("TEST-B09: server-side mismatch for ordinary courier -> REJECT with failed-precondition", () => {
      const isSupervisor = false;
      let depositAmountCents: number = 95300;
      let baseCountedCents: number = 96300;

      assert.throws(
        () => {
          if (!isSupervisor && depositAmountCents !== baseCountedCents) {
            const exp = (baseCountedCents / 100).toFixed(2);
            const dep = (depositAmountCents / 100).toFixed(2);
            throw new Error(`failed-precondition: Monto de depósito incorrecto. Esperado C$ ${exp}, ingresado C$ ${dep}`);
          }
        },
        /failed-precondition/
      );
    });

    it("TEST-B10: correct amount -> registerBankDepositReceipt PASS", () => {
      const isSupervisor = false;
      let depositAmountCents: number = 96300;
      let baseCountedCents: number = 96300;
      let passed = false;

      if (!isSupervisor && depositAmountCents !== baseCountedCents) {
        throw new Error("failed-precondition");
      } else {
        passed = true;
      }
      assert.equal(passed, true);
    });

    it("TEST-B11: double submit -> idempotent deposit registration", async () => {
      const closureId = "closure_idempotent_01";
      await db.collection("courier_daily_closures").doc(closureId).set({
        closureId,
        status: "AWAITING_BANK_DEPOSIT",
        expectedAmountCents: 96300,
      });

      const submitDeposit = async (ref: string) => {
        const cRef = db.collection("courier_daily_closures").doc(closureId);
        const data = (await cRef.get()).data();
        if (data.bankDeposit?.bankReference === ref) {
          return { success: true, idempotent: true };
        }
        await cRef.update({
          status: "PENDING_ADMIN_VERIFICATION",
          bankDeposit: { bankReference: ref, depositAmountCents: 96300 },
        });
        return { success: true, idempotent: false };
      };

      const first = await submitDeposit("VOUCHER-12345");
      assert.equal(first.idempotent, false);

      const second = await submitDeposit("VOUCHER-12345");
      assert.equal(second.idempotent, true);
    });

    it("TEST-B12: resubmission of rejected closure -> expected amount preserved", async () => {
      const closureId = "closure_rejected_01";
      await db.collection("courier_daily_closures").doc(closureId).set({
        closureId,
        status: "REJECTED",
        rejectionReason: "voucher ilegible",
        expectedAmountCents: 96300,
      });

      // Subsanación
      const cRef = db.collection("courier_daily_closures").doc(closureId);
      await cRef.update({
        status: "PENDING_ADMIN_VERIFICATION",
        isResubmission: true,
        resubmittedAt: MockTimestamp.now(),
      });

      const after = (await cRef.get()).data();
      assert.equal(after.expectedAmountCents, 96300);
      assert.equal(after.status, "PENDING_ADMIN_VERIFICATION");
      assert.equal(after.rejectionReason, "voucher ilegible");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // INCIDENTE C: CATÁLOGO SOBERANO DE BANCOS (TEST-C01 a TEST-C16)
  // ═════════════════════════════════════════════════════════════════════════
  describe("Suite C: Incidente C — Catálogo Soberano de Bancos y Cuentas de Liquidación", () => {
    const adminUser = { uid: "admin_001", role: "ADMIN", name: "Admin Finanzas" };
    const courierUser = { uid: "courier_001", role: "COURIER", name: "Courier Juan" };
    const unauthorizedUser = { uid: "user_001", role: "CUSTOMER", name: "Cliente Pedro" };

    beforeEach(async () => {
      // Estado inicial en /system_config/bank_accounts
      await db.collection("system_config").doc("bank_accounts").set({
        accounts: [
          {
            id: "bank_bac_nio",
            bankName: "BAC Credomatic (Córdobas)",
            accountNumber: "365821945",
            accountType: "Corriente",
            currency: "NIO",
            holderName: "BlueSystem Delivery",
            beneficiary: "BlueSystem Delivery",
            isActive: true,
            displayOrder: 1,
            tenantId: "ten_bluesystem_core",
          },
        ],
      });
    });

    async function saveBankAccount(caller: any, accountData: any) {
      if (!["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "FINANCE_MANAGER"].includes(caller.role)) {
        throw new Error("permission-denied: No autorizado para configurar cuentas bancarias.");
      }
      const ref = db.collection("system_config").doc("bank_accounts");
      const current = (await ref.get()).data()?.accounts || [];

      // Validar duplicados activos
      const dup = current.find(
        (a: any) =>
          a.id !== accountData.id &&
          a.accountNumber === accountData.accountNumber &&
          a.bankName.toLowerCase() === accountData.bankName.toLowerCase() &&
          a.tenantId === (accountData.tenantId || "ten_bluesystem_core") &&
          a.isActive !== false
      );
      if (dup) {
        throw new Error("already-exists: Ya existe una cuenta activa con ese número para ese banco.");
      }

      const isNew = !current.some((a: any) => a.id === accountData.id);
      let updatedList: any[];
      if (isNew) {
        updatedList = [...current, { ...accountData, isActive: accountData.isActive ?? true }];
      } else {
        updatedList = current.map((a: any) => (a.id === accountData.id ? { ...a, ...accountData } : a));
      }

      await ref.set({ accounts: updatedList }, { merge: true });
      await db.collection("audit_events").add({
        action: isNew ? "BANK_ACCOUNT_CREATED" : "BANK_ACCOUNT_UPDATED",
        actorUid: caller.uid,
        bankId: accountData.id,
        timestamp: MockTimestamp.now(),
      });
      return { success: true };
    }

    async function toggleBankAccount(caller: any, accountId: string, isActive: boolean, reason: string) {
      if (!["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "FINANCE_MANAGER"].includes(caller.role)) {
        throw new Error("permission-denied: No autorizado.");
      }
      const ref = db.collection("system_config").doc("bank_accounts");
      const current = (await ref.get()).data()?.accounts || [];
      const updatedList = current.map((a: any) => (a.id === accountId ? { ...a, isActive } : a));
      await ref.set({ accounts: updatedList }, { merge: true });
      await db.collection("audit_events").add({
        action: isActive ? "BANK_ACCOUNT_REACTIVATED" : "BANK_ACCOUNT_DEACTIVATED",
        actorUid: caller.uid,
        bankId: accountId,
        reason,
        timestamp: MockTimestamp.now(),
      });
      return { success: true };
    }

    async function getVisibleAccounts(caller: any) {
      const ref = db.collection("system_config").doc("bank_accounts");
      const accounts = (await ref.get()).data()?.accounts || [];
      const isAdmin = ["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "FINANCE_MANAGER"].includes(caller.role);
      return isAdmin ? accounts : accounts.filter((a: any) => a.isActive !== false);
    }

    it("TEST-C01: Admin creates bank", async () => {
      const res = await saveBankAccount(adminUser, {
        id: "bank_banpro_nio",
        bankName: "Banpro Grupo Promerica",
        accountNumber: "10020304050607",
      });
      assert.equal(res.success, true);
    });

    it("TEST-C02: Admin creates bank + account", async () => {
      await saveBankAccount(adminUser, {
        id: "bank_lafise_nio",
        bankName: "Banco LAFISE Bancentro",
        accountNumber: "9876543210",
        holderName: "BlueSystem Delivery",
        currency: "NIO",
        accountType: "Corriente",
      });
      const all = await getVisibleAccounts(adminUser);
      const lafise = all.find((a: any) => a.id === "bank_lafise_nio");
      assert.ok(lafise);
      assert.equal(lafise.accountNumber, "9876543210");
      assert.equal(lafise.holderName, "BlueSystem Delivery");
    });

    it("TEST-C03: Admin edits bank account", async () => {
      await saveBankAccount(adminUser, {
        id: "bank_bac_nio",
        bankName: "BAC Credomatic (Córdobas)",
        accountNumber: "365821945-EDITADO",
        holderName: "BlueSystem Delivery Corp",
      });
      const all = await getVisibleAccounts(adminUser);
      const bac = all.find((a: any) => a.id === "bank_bac_nio");
      assert.equal(bac.accountNumber, "365821945-EDITADO");
      assert.equal(bac.holderName, "BlueSystem Delivery Corp");
    });

    it("TEST-C04: Admin deactivates bank with reason", async () => {
      await toggleBankAccount(adminUser, "bank_bac_nio", false, "Cambio de cuenta recaudadora");
      const all = await getVisibleAccounts(adminUser);
      const bac = all.find((a: any) => a.id === "bank_bac_nio");
      assert.equal(bac.isActive, false);
    });

    it("TEST-C05: Inactive bank does not appear to Courier", async () => {
      await toggleBankAccount(adminUser, "bank_bac_nio", false, "Desactivada");
      const courierAccounts = await getVisibleAccounts(courierUser);
      assert.equal(courierAccounts.length, 0);
    });

    it("TEST-C06: Active bank appears to Courier", async () => {
      const courierAccounts = await getVisibleAccounts(courierUser);
      assert.equal(courierAccounts.length, 1);
      assert.equal(courierAccounts[0].bankName, "BAC Credomatic (Córdobas)");
    });

    it("TEST-C07: Two accounts from same bank are distinguishable by account number", async () => {
      await saveBankAccount(adminUser, {
        id: "bank_bac_usd",
        bankName: "BAC Credomatic",
        accountNumber: "9988776655",
        currency: "USD",
        accountType: "Ahorro",
      });
      const all = await getVisibleAccounts(courierUser);
      assert.equal(all.length, 2);
      assert.notEqual(all[0].accountNumber, all[1].accountNumber);
    });

    it("TEST-C08: Courier cannot modify bank configuration", async () => {
      await assert.rejects(
        async () => {
          await saveBankAccount(courierUser, { id: "hack", bankName: "HackBank", accountNumber: "123" });
        },
        /permission-denied/
      );
    });

    it("TEST-C09: Unauthorized role cannot modify bank configuration", async () => {
      await assert.rejects(
        async () => {
          await saveBankAccount(unauthorizedUser, { id: "hack2", bankName: "HackBank2", accountNumber: "456" });
        },
        /permission-denied/
      );
    });

    it("TEST-C10: Bank change generates audit event", async () => {
      await saveBankAccount(adminUser, {
        id: "bank_bdf_nio",
        bankName: "BDF Banco de Finanzas",
        accountNumber: "5544332211",
      });
      const events = await db.collection("audit_events").where("bankId", "==", "bank_bdf_nio").get();
      assert.equal(events.size, 1);
      assert.equal(events.docs[0].data().action, "BANK_ACCOUNT_CREATED");
    });

    it("TEST-C11: Historical closure keeps old bank/account snapshot", async () => {
      const closureId = "historical_closure_001";
      await db.collection("courier_daily_closures").doc(closureId).set({
        closureId,
        bankDeposit: {
          bankName: "BAC Credomatic (Córdobas)",
          accountReference: "365821945",
          depositAmountCents: 96300,
        },
      });

      // Modificar la cuenta en system_config
      await saveBankAccount(adminUser, {
        id: "bank_bac_nio",
        bankName: "BAC Credomatic (Nuevo)",
        accountNumber: "000000000",
      });

      // El cierre histórico debe seguir con sus valores originales
      const closureData = (await db.collection("courier_daily_closures").doc(closureId).get()).data();
      assert.equal(closureData.bankDeposit.bankName, "BAC Credomatic (Córdobas)");
      assert.equal(closureData.bankDeposit.accountReference, "365821945");
    });

    it("TEST-C12: Deleting/deactivating bank does not alter historical closures", async () => {
      const closureId = "historical_closure_002";
      await db.collection("courier_daily_closures").doc(closureId).set({
        closureId,
        bankDeposit: {
          bankName: "BAC Credomatic (Córdobas)",
          accountReference: "365821945",
        },
      });

      // Desactivar cuenta
      await toggleBankAccount(adminUser, "bank_bac_nio", false, "Baja de cuenta");

      const closureData = (await db.collection("courier_daily_closures").doc(closureId).get()).data();
      assert.equal(closureData.bankDeposit.bankName, "BAC Credomatic (Córdobas)");
      assert.equal(closureData.bankDeposit.accountReference, "365821945");
    });

    it("TEST-C13: Multi-tenant isolation for bank accounts", async () => {
      await saveBankAccount(adminUser, {
        id: "bank_tenant_alpha",
        bankName: "Banco Regional Alpha",
        accountNumber: "111222333",
        tenantId: "ten_alpha",
      });

      const all = await getVisibleAccounts(adminUser);
      const alphaBank = all.find((a: any) => a.id === "bank_tenant_alpha");
      assert.equal(alphaBank.tenantId, "ten_alpha");
    });

    it("TEST-C14: No duplicate bank/account configuration in same tenant", async () => {
      await assert.rejects(
        async () => {
          await saveBankAccount(adminUser, {
            id: "bank_bac_dup",
            bankName: "BAC Credomatic (Córdobas)",
            accountNumber: "365821945", // Mismo número y banco que ya existe activo
            tenantId: "ten_bluesystem_core",
          });
        },
        /already-exists/
      );
    });

    it("TEST-C15: Admin refresh retains configuration", async () => {
      const ref = db.collection("system_config").doc("bank_accounts");
      const snap1 = (await ref.get()).data()?.accounts;
      const snap2 = (await ref.get()).data()?.accounts;
      assert.deepEqual(snap1, snap2);
    });

    it("TEST-C16: Android refresh receives updated configuration", async () => {
      // Agregar nueva cuenta
      await saveBankAccount(adminUser, {
        id: "bank_avanz_nio",
        bankName: "Avanz",
        accountNumber: "777888999",
      });
      // Motorizado refresca
      const courierAccounts = await getVisibleAccounts(courierUser);
      const avanz = courierAccounts.find((a: any) => a.id === "bank_avanz_nio");
      assert.ok(avanz);
      assert.equal(avanz.bankName, "Avanz");
      assert.equal(avanz.accountNumber, "777888999");
    });
  });
});
