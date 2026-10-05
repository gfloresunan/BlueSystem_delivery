import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  EmailService,
  EmailTemplateEngine,
  EmailTransport,
} from "../services/emailService";
import {
  dispatchCourierClosureEmailNotification,
  CourierClosureEmailNotificationParams,
} from "../callables/courierClosureCallables";

// Mock de Transporte SMTP para capturar correos enviados en memoria
class MockEmailTransport implements EmailTransport {
  public sentEmails: any[] = [];
  public shouldFail = false;

  public async send(options: any): Promise<{ messageId: string; response?: string }> {
    if (this.shouldFail) {
      throw new Error("SMTP connection refused");
    }
    const messageId = `msg_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.sentEmails.push({ ...options, messageId });
    return { messageId, response: "250 OK: Message queued" };
  }

  public async verifyConnection(): Promise<boolean> {
    return !this.shouldFail;
  }
}

// Mock de Firestore en memoria para colecciones de Email y Usuarios
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
      doc(id?: string) {
        const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        return {
          id: docId,
          async get() {
            const data = self.getCollection(name).get(docId);
            return {
              id: docId,
              exists: !!data,
              data: () => data,
            };
          },
          async set(data: any, options?: any) {
            const col = self.getCollection(name);
            if (options?.merge && col.has(docId)) {
              col.set(docId, { ...col.get(docId), ...data });
            } else {
              col.set(docId, data);
            }
          },
          async update(data: any) {
            const col = self.getCollection(name);
            const prev = col.get(docId) || {};
            col.set(docId, { ...prev, ...data });
          },
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
                return {
                  docs,
                  size: docs.length,
                  empty: docs.length === 0,
                  forEach: (fn: (d: any) => void) => docs.forEach(fn),
                };
              },
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
            return {
              docs,
              size: docs.length,
              empty: docs.length === 0,
              forEach: (fn: (d: any) => void) => docs.forEach(fn),
            };
          },
        };
      },
      async add(data: any) {
        const id = `aud_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        self.getCollection(name).set(id, data);
        return { id };
      },
    };
  }
}

describe("GAP-02: Courier Settlement Corporate Email Integration Suite", () => {
  let mockTransport: MockEmailTransport;
  let mockDb: MockFirestoreDb;

  beforeEach(() => {
    mockTransport = new MockEmailTransport();
    mockDb = new MockFirestoreDb();
    EmailService.setTransport(mockTransport);
    EmailService.setDb(mockDb);
    EmailTemplateEngine.setDb(mockDb);

    // Poblar usuarios en base de datos
    const usersCol = mockDb.getCollection("users");
    // Admin 1 (Super Admin, Activo)
    usersCol.set("admin_gerald", {
      role: "SUPER_ADMIN",
      email: "gerald@bluesystemdelivery.com",
      name: "Gerald Flores",
      isActive: true,
      tenantId: "ten_bluesystem_core",
    });

    // Finance Manager (Activo)
    usersCol.set("finance_maria", {
      role: "FINANCE_MANAGER",
      email: "finanzas@bluesystemdelivery.com",
      name: "María Finanzas",
      isActive: true,
      tenantId: "ten_bluesystem_core",
    });

    // Admin Inactivo (NO debe recibir correo)
    usersCol.set("admin_inactivo", {
      role: "ADMIN",
      email: "inactivo@bluesystemdelivery.com",
      name: "Admin Inactivo",
      isActive: false,
      tenantId: "ten_bluesystem_core",
    });

    // Admin de otro tenant (Tenant Externo -> NO debe recibir)
    usersCol.set("admin_tenant_externo", {
      role: "ADMIN",
      email: "admin@tenantexterno.com",
      name: "Admin Externo",
      isActive: true,
      tenantId: "ten_comercio_externo",
    });

    // Motorizado Henry Paz
    usersCol.set("courier_henry_paz", {
      role: "COURIER",
      email: "henry.paz@delivery.com",
      name: "Henry Paz",
      phone: "+505 8888 1234",
      plate: "M-98214",
      isActive: true,
      tenantId: "ten_bluesystem_core",
    });
  });

  it("TEST A: Despacho de courier_closure_submitted al registrar depósito con desglose financiero", async () => {
    const params: CourierClosureEmailNotificationParams = {
      eventType: "SUBMITTED",
      closureId: "clos_20260929_henry_001",
      courierId: "courier_henry_paz",
      courierName: "Henry Paz",
      businessDate: "2026-09-29",
      depositAmountCents: 504000, // C$ 5,040.00
      expectedAmountCents: 504000,
      discrepancyAmountCents: 0,
      bankName: "BAC Credomatic",
      bankReference: "DEP-992144",
      totalOrders: 14,
      totalTrips: 3,
      courierEarningsCents: 125000,
      netCustodyCents: 504000,
      tenantId: "ten_bluesystem_core",
    };

    const res = await dispatchCourierClosureEmailNotification(params, mockDb as any);

    assert.equal(res.success, true);
    assert.equal(res.emailsSent, 2); // admin_gerald y finance_maria
    assert.ok(res.recipients.includes("gerald@bluesystemdelivery.com"));
    assert.ok(res.recipients.includes("finanzas@bluesystemdelivery.com"));

    // Validar correos en mockTransport
    assert.equal(mockTransport.sentEmails.length, 2);
    const sent = mockTransport.sentEmails[0];
    assert.ok(sent.subject.includes("Cierre y Depósito Pendiente"));
    assert.ok(sent.subject.includes("Henry Paz"));
    assert.ok(sent.html.includes("5040.00"));
    assert.ok(sent.html.includes("BAC Credomatic"));
    assert.ok(sent.html.includes("DEP-992144"));
    assert.ok(sent.html.includes("CUADRADO EXACTO"));

    // Validar persistencia en /email_events
    const event1 = mockDb.getCollection("email_events").get("email_closure_clos_20260929_henry_001_submitted_admin_gerald");
    assert.ok(event1, "Asiento en /email_events debe existir");
    assert.equal(event1.status, "SENT");
    assert.equal(event1.templateId, "courier_closure_submitted");
  });

  it("TEST B: Idempotencia estricta ante reintentos (cero emails duplicados)", async () => {
    const params: CourierClosureEmailNotificationParams = {
      eventType: "SUBMITTED",
      closureId: "clos_20260929_henry_002",
      courierId: "courier_henry_paz",
      courierName: "Henry Paz",
      businessDate: "2026-09-29",
      depositAmountCents: 300000,
      expectedAmountCents: 300000,
      bankName: "Banpro",
      bankReference: "BP-1029",
      tenantId: "ten_bluesystem_core",
    };

    // 1er despacho
    await dispatchCourierClosureEmailNotification(params, mockDb as any);
    const emailsCountFirst = mockTransport.sentEmails.length;
    assert.equal(emailsCountFirst, 2);

    // 2do despacho (reintento)
    await dispatchCourierClosureEmailNotification(params, mockDb as any);
    const emailsCountSecond = mockTransport.sentEmails.length;

    // Ningún email nuevo debe ser enviado por EmailService debido a su filtro de idempotencia atómica
    assert.equal(emailsCountSecond, emailsCountFirst, "No deben enviarse emails duplicados");
  });

  it("TEST C: Despacho de courier_deposit_verified al aprobar cierre emite Acta y código", async () => {
    const params: CourierClosureEmailNotificationParams = {
      eventType: "VERIFIED",
      closureId: "clos_20260929_henry_003",
      courierId: "courier_henry_paz",
      courierName: "Henry Paz",
      businessDate: "2026-09-29",
      depositAmountCents: 450000,
      expectedAmountCents: 450000,
      actNumber: "ACTA-CASH-20260929-HPAZ-8812",
      verificationCode: "VAL-88210492",
      verifiedByName: "Supervisor de Operaciones",
      tenantId: "ten_bluesystem_core",
    };

    const res = await dispatchCourierClosureEmailNotification(params, mockDb as any);

    assert.equal(res.success, true);
    assert.equal(res.emailsSent, 1); // Notifica al motorizado
    assert.equal(res.recipients[0], "henry.paz@delivery.com");

    const sent = mockTransport.sentEmails.find((e) => e.to === "henry.paz@delivery.com");
    assert.ok(sent);
    assert.ok(sent.subject.includes("ACTA-CASH-20260929-HPAZ-8812"));
    assert.ok(sent.html.includes("VAL-88210492"));
    assert.ok(sent.html.includes("Supervisor de Operaciones"));
  });

  it("TEST D: Despacho de courier_closure_rejected al rechazar cierre incluye motivo auditable", async () => {
    const params: CourierClosureEmailNotificationParams = {
      eventType: "REJECTED",
      closureId: "clos_20260929_henry_004",
      courierId: "courier_henry_paz",
      courierName: "Henry Paz",
      businessDate: "2026-09-29",
      rejectionReason: "El comprobante de depósito no coincide con el monto total declarado; falta C$ 250.00.",
      verifiedByName: "Gerald Flores (Platform Admin)",
      tenantId: "ten_bluesystem_core",
    };

    const res = await dispatchCourierClosureEmailNotification(params, mockDb as any);

    assert.equal(res.success, true);
    assert.equal(res.emailsSent, 1);
    assert.equal(res.recipients[0], "henry.paz@delivery.com");

    const sent = mockTransport.sentEmails.find((e) => e.to === "henry.paz@delivery.com");
    assert.ok(sent);
    assert.ok(sent.subject.includes("Cierre Diario Observado"));
    assert.ok(sent.html.includes("falta C$ 250.00"));
    assert.ok(sent.html.includes("Gerald Flores (Platform Admin)"));
  });

  it("TEST E: Aislamiento Multi-Tenant y exclusión de usuarios inactivos", async () => {
    const params: CourierClosureEmailNotificationParams = {
      eventType: "SUBMITTED",
      closureId: "clos_20260929_henry_005",
      courierId: "courier_henry_paz",
      courierName: "Henry Paz",
      businessDate: "2026-09-29",
      depositAmountCents: 100000,
      expectedAmountCents: 100000,
      tenantId: "ten_bluesystem_core",
    };

    const res = await dispatchCourierClosureEmailNotification(params, mockDb as any);

    assert.ok(!res.recipients.includes("inactivo@bluesystemdelivery.com"), "Inactivo debe ser excluido");
    assert.ok(!res.recipients.includes("admin@tenantexterno.com"), "Admin de otro tenant debe ser excluido");
  });
});
