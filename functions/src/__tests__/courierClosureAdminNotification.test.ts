import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { dispatchCourierClosureAdminNotification } from "../callables/courierClosureCallables";

// Mock minimal de Firestore para probar dispatchCourierClosureAdminNotification en aislamiento E2E
class MockFirestoreDb {
  public collections: Map<string, Map<string, any>> = new Map();
  public subcollections: Map<string, Map<string, any>> = new Map(); // key: "users/{uid}/notifications"

  getCollection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  getSubcollection(path: string) {
    if (!this.subcollections.has(path)) {
      this.subcollections.set(path, new Map());
    }
    return this.subcollections.get(path)!;
  }

  collection(name: string) {
    const self = this;
    return {
      doc(id?: string) {
        const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        return {
          id: docId,
          async get() {
            const col = self.getCollection(name);
            const exists = col.has(docId);
            const data = col.get(docId) || {};
            return {
              exists,
              id: docId,
              data: () => data,
            };
          },
          async set(data: any, options?: any) {
            const col = self.getCollection(name);
            if (options && options.merge && col.has(docId)) {
              col.set(docId, { ...col.get(docId), ...data });
            } else {
              col.set(docId, data);
            }
          },
          collection(subName: string) {
            const subPath = `${name}/${docId}/${subName}`;
            return {
              doc(subDocId: string) {
                return {
                  id: subDocId,
                  async get() {
                    const subCol = self.getSubcollection(subPath);
                    const exists = subCol.has(subDocId);
                    return {
                      exists,
                      id: subDocId,
                      data: () => subCol.get(subDocId) || {},
                    };
                  },
                  async set(data: any, options?: any) {
                    const subCol = self.getSubcollection(subPath);
                    if (options && options.merge && subCol.has(subDocId)) {
                      subCol.set(subDocId, { ...subCol.get(subDocId), ...data });
                    } else {
                      subCol.set(subDocId, data);
                    }
                  }
                };
              }
            };
          }
        };
      },
      where(field: string, op: string, val: any) {
        return {
          where(f2: string, op2: string, v2: any) {
            return this;
          },
          limit(n: number) {
            return {
              async get() {
                const col = self.getCollection(name);
                const docs: any[] = [];
                for (const [id, data] of col.entries()) {
                  let match = false;
                  if (op === "in" && Array.isArray(val)) {
                    match = val.includes(data[field]);
                  } else if (op === "==") {
                    match = data[field] === val;
                  }
                  if (match) {
                    docs.push({
                      id,
                      data: () => data,
                    });
                  }
                }
                return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: (doc: any) => void) => docs.forEach(fn) };
              }
            };
          },
          async get() {
            const col = self.getCollection(name);
            const docs: any[] = [];
            for (const [id, data] of col.entries()) {
              let match = false;
              if (op === "in" && Array.isArray(val)) {
                match = val.includes(data[field]);
              } else if (op === "==") {
                match = data[field] === val;
              }
              if (match) {
                docs.push({
                  id,
                  data: () => data,
                });
              }
            }
            return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn: (doc: any) => void) => docs.forEach(fn) };
          }
        };
      },
      async add(data: any) {
        const id = `aud_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        self.getCollection(name).set(id, data);
        return { id };
      }
    };
  }

  batch() {
    const operations: Array<() => Promise<void>> = [];
    return {
      set(docRef: any, data: any, options?: any) {
        operations.push(async () => {
          await docRef.set(data, options);
        });
      },
      async commit() {
        for (const op of operations) {
          await op();
        }
      }
    };
  }

  reset() {
    this.collections.clear();
    this.subcollections.clear();
  }
}

describe("GAP-01: Courier Daily Closure Admin Notification Suite", () => {
  let mockDb: MockFirestoreDb;

  beforeEach(() => {
    mockDb = new MockFirestoreDb();

    // Poblar usuarios del sistema
    const usersCol = mockDb.getCollection("users");
    // Admin 1 (Plataforma, Activo)
    usersCol.set("admin_gerald", {
      role: "PLATFORM_ADMIN",
      email: "gerald@bluesystemdelivery.com",
      name: "Gerald Flores",
      isActive: true,
      tenantId: "ten_bluesystem_core",
    });

    // Admin 2 (Supervisor, Activo)
    usersCol.set("supervisor_carlos", {
      role: "SUPERVISOR",
      email: "carlos@bluesystemdelivery.com",
      name: "Carlos Supervisor",
      isActive: true,
      tenantId: "ten_bluesystem_core",
    });

    // Admin 3 (Inactivo -> NO DEBE RECIBIR)
    usersCol.set("admin_inactivo", {
      role: "ADMIN",
      email: "inactivo@bluesystemdelivery.com",
      name: "Admin Inactivo",
      isActive: false,
      tenantId: "ten_bluesystem_core",
    });

    // Usuario Regular (Cliente -> NO DEBE RECIBIR)
    usersCol.set("client_pedro", {
      role: "CUSTOMER",
      email: "pedro@cliente.com",
      name: "Pedro Cliente",
      isActive: true,
    });

    // Admin de Tenant Ajeno (Tenant B -> NO DEBE RECIBIR si el closure es de Tenant A)
    usersCol.set("admin_tenant_b", {
      role: "ADMIN",
      email: "admin@tenantb.com",
      name: "Admin Tenant B",
      isActive: true,
      tenantId: "ten_comercio_externo",
    });
  });

  it("TEST A: Despacha notificación y encola campaña al registrar comprobante de depósito", async () => {
    const res = await dispatchCourierClosureAdminNotification(
      {
        closureId: "clos_20260929_henry_001",
        courierId: "courier_henry_paz",
        courierName: "Henry Paz",
        depositAmountCents: 504000, // C$ 5,040.00
        expectedAmountCents: 504000,
        bankName: "BAC Credomatic",
        bankReference: "TR-982341",
        businessDate: "2026-09-29",
        tenantId: "ten_bluesystem_core",
      },
      mockDb as any
    );

    assert.equal(res.success, true);
    assert.equal(res.idempotent, false);
    assert.equal(res.adminCount, 2); // admin_gerald y supervisor_carlos
    assert.equal(res.campaignDocId, "courier_closure_clos_20260929_henry_001_pending_admin");

    // Verificar campaña en notification_campaigns
    const camp = mockDb.getCollection("notification_campaigns").get("courier_closure_clos_20260929_henry_001_pending_admin");
    assert.ok(camp, "La campaña en notification_campaigns debe existir");
    assert.equal(camp.status, "QUEUED");
    assert.equal(camp.targetType, "admin");
    assert.equal(camp.category, "Liquidaciones");
    assert.equal(camp.amount, 5040);
    assert.equal(camp.bankReference, "TR-982341");
    assert.ok(camp.deepLink.includes("courierCashControl?closureId=clos_20260929_henry_001"));

    // Verificar notificaciones in-app
    const geraldNotif = mockDb.getSubcollection("users/admin_gerald/notifications").get("courier_closure_clos_20260929_henry_001_pending_admin");
    assert.ok(geraldNotif, "admin_gerald debe tener la notificación in-app");
    assert.equal(geraldNotif.type, "COURIER_DAILY_CLOSURE_PENDING");
    assert.equal(geraldNotif.courierName, "Henry Paz");
    assert.equal(geraldNotif.amount, 5040);

    const carlosNotif = mockDb.getSubcollection("users/supervisor_carlos/notifications").get("courier_closure_clos_20260929_henry_001_pending_admin");
    assert.ok(carlosNotif, "supervisor_carlos debe tener la notificación in-app");

    // Verificar evento de auditoría
    const auditCol = mockDb.getCollection("audit_events");
    let auditFound = false;
    for (const [_, a] of auditCol.entries()) {
      if (a.event === "COURIER_CLOSURE_ADMIN_NOTIFIED" && a.closureId === "clos_20260929_henry_001") {
        auditFound = true;
        assert.equal(a.adminRecipientsCount, 2);
      }
    }
    assert.equal(auditFound, true, "Debe existir evento COURIER_CLOSURE_ADMIN_NOTIFIED en /audit_events");
  });

  it("TEST B: Idempotencia estricta ante reintentos (cero duplicación de campañas ni notificaciones)", async () => {
    // 1er despacho
    const res1 = await dispatchCourierClosureAdminNotification(
      {
        closureId: "clos_20260929_henry_002",
        courierId: "courier_henry_paz",
        courierName: "Henry Paz",
        depositAmountCents: 150000,
        expectedAmountCents: 150000,
        bankName: "Banco LAFISE",
        bankReference: "LAF-00129",
        businessDate: "2026-09-29",
      },
      mockDb as any
    );
    assert.equal(res1.success, true);
    assert.equal(res1.idempotent, false);

    const campaignCountBefore = mockDb.getCollection("notification_campaigns").size;

    // 2do despacho (reintento o clic duplicado)
    const res2 = await dispatchCourierClosureAdminNotification(
      {
        closureId: "clos_20260929_henry_002",
        courierId: "courier_henry_paz",
        courierName: "Henry Paz",
        depositAmountCents: 150000,
        expectedAmountCents: 150000,
        bankName: "Banco LAFISE",
        bankReference: "LAF-00129",
        businessDate: "2026-09-29",
      },
      mockDb as any
    );
    assert.equal(res2.success, true);
    assert.equal(res2.idempotent, true); // Identificado como idempotente

    const campaignCountAfter = mockDb.getCollection("notification_campaigns").size;
    assert.equal(campaignCountAfter, campaignCountBefore, "No deben crearse campañas duplicadas");
  });

  it("TEST C: Aislamiento Multi-Tenant (Admins de otro tenant son excluidos)", async () => {
    const res = await dispatchCourierClosureAdminNotification(
      {
        closureId: "clos_20260929_henry_003",
        courierId: "courier_henry_paz",
        courierName: "Henry Paz",
        depositAmountCents: 200000,
        expectedAmountCents: 200000,
        bankName: "Banpro",
        bankReference: "BP-5566",
        businessDate: "2026-09-29",
        tenantId: "ten_comercio_especifico",
      },
      mockDb as any
    );

    // Solo superadmin/admin sin mismatch de tenant puede recibir
    const tenantBNotif = mockDb.getSubcollection("users/admin_tenant_b/notifications").get("courier_closure_clos_20260929_henry_003_pending_admin");
    assert.equal(tenantBNotif, undefined, "Admin de tenant ajeno NO debe recibir notificación");
  });

  it("TEST D: Usuarios inactivos y no administradores son excluidos absolutamente", async () => {
    await dispatchCourierClosureAdminNotification(
      {
        closureId: "clos_20260929_henry_004",
        courierId: "courier_henry_paz",
        courierName: "Henry Paz",
        depositAmountCents: 300000,
        expectedAmountCents: 300000,
        bankName: "BAC",
        bankReference: "REF-999",
        businessDate: "2026-09-29",
      },
      mockDb as any
    );

    const inactiveNotif = mockDb.getSubcollection("users/admin_inactivo/notifications").get("courier_closure_clos_20260929_henry_004_pending_admin");
    assert.equal(inactiveNotif, undefined, "Admin inactivo NO debe recibir notificación");

    const clientNotif = mockDb.getSubcollection("users/client_pedro/notifications").get("courier_closure_clos_20260929_henry_004_pending_admin");
    assert.equal(clientNotif, undefined, "Cliente regular NO debe recibir notificación");
  });

  it("TEST E: Formato y Deep Link verificados contra la especificación de Admin Web", async () => {
    const res = await dispatchCourierClosureAdminNotification(
      {
        closureId: "clos_20260929_henry_005",
        courierId: "courier_henry_paz",
        courierName: "Henry Paz",
        depositAmountCents: 125050, // C$ 1,250.50
        expectedAmountCents: 125050,
        bankName: "BAC Credomatic",
        bankReference: "BAC-778899",
        businessDate: "2026-09-29",
      },
      mockDb as any
    );

    const camp = mockDb.getCollection("notification_campaigns").get(res.campaignDocId);
    assert.equal(camp.title, "🔔 Nueva liquidación de efectivo pendiente");
    assert.ok(camp.body.includes("Henry Paz"));
    assert.ok(camp.body.includes("C$ 1250.50"));
    assert.ok(camp.body.includes("BAC-778899"));
    assert.equal(camp.deepLink, "panel-admin/public/dashboard.html#courierCashControl?closureId=clos_20260929_henry_005");
  });
});
