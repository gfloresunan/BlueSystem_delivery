import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  SettlementNotificationRecipientResolver,
  SettlementNotificationConfig,
} from "../services/settlementRecipientResolver";

// Mock de Firestore en memoria
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

  batch() {
    const ops: Array<() => Promise<void>> = [];
    return {
      set(ref: any, data: any, options?: any) {
        ops.push(async () => {
          await ref.set(data, options);
        });
      },
      async commit() {
        for (const op of ops) {
          await op();
        }
      },
    };
  }
}

describe("GAP-03: Settlement Notification Recipient Resolver Suite", () => {
  let mockDb: MockFirestoreDb;

  beforeEach(() => {
    mockDb = new MockFirestoreDb();
    SettlementNotificationRecipientResolver.setDb(mockDb);

    const usersCol = mockDb.getCollection("users");

    // Usuario A: Admin de Plataforma
    usersCol.set("user_a_admin", {
      role: "PLATFORM_ADMIN",
      email: "user_a@bluesystemdelivery.com",
      name: "Usuario A (Admin)",
      isActive: true,
      tenantId: "ten_bluesystem_core",
    });

    // Usuario B: Gerente Financiero
    usersCol.set("user_b_finance", {
      role: "FINANCE_MANAGER",
      email: "user_b@bluesystemdelivery.com",
      name: "Usuario B (Finanzas)",
      isActive: true,
      tenantId: "ten_bluesystem_core",
    });

    // Usuario C: Contabilidad (Específico)
    usersCol.set("user_c_accountant", {
      role: "ACCOUNTANT",
      email: "user_c@bluesystemdelivery.com",
      name: "Usuario C (Contabilidad)",
      isActive: true,
      tenantId: "ten_bluesystem_core",
    });

    // Usuario Inactivo
    usersCol.set("user_d_inactive", {
      role: "ADMIN",
      email: "user_d@bluesystemdelivery.com",
      name: "Usuario D (Inactivo)",
      isActive: false,
      tenantId: "ten_bluesystem_core",
    });

    // Admin de otro tenant
    usersCol.set("user_e_external_admin", {
      role: "ADMIN",
      email: "user_e@externo.com",
      name: "Usuario E (Externo)",
      isActive: true,
      tenantId: "ten_comercio_externo",
    });
  });

  it("TEST A: Defaults canónicos cuando no existe configuración previa", async () => {
    const recipients = await SettlementNotificationRecipientResolver.resolveRecipients(
      "ten_bluesystem_core",
      mockDb
    );

    // Por default, ADMIN, FINANCE_MANAGER y ACCOUNTANT activos están habilitados
    assert.ok(recipients.some((r) => r.uid === "user_a_admin"));
    assert.ok(recipients.some((r) => r.uid === "user_b_finance"));
    assert.ok(recipients.some((r) => r.uid === "user_c_accountant"));
    // Usuario inactivo no debe aparecer
    assert.ok(!recipients.some((r) => r.uid === "user_d_inactive"));
  });

  it("TEST B: Cambio de configuración de roles A -> B (A deja de recibir, B recibe)", async () => {
    // Configurar para que SOLO FINANCE_MANAGER reciba
    await SettlementNotificationRecipientResolver.updateConfig(
      {
        enabledRoles: ["FINANCE_MANAGER"],
        specificUserUids: [],
        reason: "Restricción a únicamente gerencia financiera para turno nocturno",
        actorUid: "admin_tester",
      },
      mockDb
    );

    const recipients = await SettlementNotificationRecipientResolver.resolveRecipients(
      "ten_bluesystem_core",
      mockDb
    );

    // Usuario B (FINANCE_MANAGER) recibe
    assert.ok(recipients.some((r) => r.uid === "user_b_finance"));
    // Usuario A (ADMIN) ya NO recibe
    assert.ok(!recipients.some((r) => r.uid === "user_a_admin"));
    // Usuario C (ACCOUNTANT) ya NO recibe
    assert.ok(!recipients.some((r) => r.uid === "user_c_accountant"));
  });

  it("TEST C: Agregar destinatario específico Usuario C -> recibe B + C", async () => {
    // Roles: FINANCE_MANAGER + Usuario específico C
    await SettlementNotificationRecipientResolver.updateConfig(
      {
        enabledRoles: ["FINANCE_MANAGER"],
        specificUserUids: ["user_c_accountant"],
        reason: "Agregar a Usuario C de forma expresa para supervisión contable",
        actorUid: "admin_tester",
      },
      mockDb
    );

    const recipients = await SettlementNotificationRecipientResolver.resolveRecipients(
      "ten_bluesystem_core",
      mockDb
    );

    // B recibe (por rol)
    assert.ok(recipients.some((r) => r.uid === "user_b_finance"));
    // C recibe (por UID específico)
    assert.ok(recipients.some((r) => r.uid === "user_c_accountant"));
    // A sigue sin recibir
    assert.ok(!recipients.some((r) => r.uid === "user_a_admin"));
  });

  it("TEST D: Desactivación de Usuario B -> únicamente Usuario C continúa recibiendo", async () => {
    // Inactivar a Usuario B en la base de datos
    mockDb.getCollection("users").get("user_b_finance").isActive = false;

    // Con la misma configuración de FINANCE_MANAGER + user_c
    const recipients = await SettlementNotificationRecipientResolver.resolveRecipients(
      "ten_bluesystem_core",
      mockDb
    );

    // B está inactivo -> EXCLUIDO
    assert.ok(!recipients.some((r) => r.uid === "user_b_finance"));
    // C está activo -> RECIBE
    assert.ok(recipients.some((r) => r.uid === "user_c_accountant"));
  });

  it("TEST E: Aislamiento Multi-Tenant (Admin de otro tenant queda excluido)", async () => {
    // Habilitar rol ADMIN
    await SettlementNotificationRecipientResolver.updateConfig(
      {
        enabledRoles: ["ADMIN", "PLATFORM_ADMIN"],
        specificUserUids: [],
        reason: "Prueba de aislamiento multi-tenant",
        actorUid: "admin_tester",
      },
      mockDb
    );

    const recipients = await SettlementNotificationRecipientResolver.resolveRecipients(
      "ten_bluesystem_core",
      mockDb
    );

    // User A es PLATFORM_ADMIN -> Recibe
    assert.ok(recipients.some((r) => r.uid === "user_a_admin"));
    // User E es ADMIN de ten_comercio_externo -> NO debe recibir alertas de ten_bluesystem_core
    assert.ok(!recipients.some((r) => r.uid === "user_e_external_admin"));
  });

  it("TEST F: Validación de seguridad y auditoría inmutable en /audit_events", async () => {
    // Intentar actualizar sin motivo válido -> DEBE LANZAR ERROR
    await assert.rejects(
      async () => {
        await SettlementNotificationRecipientResolver.updateConfig(
          {
            enabledRoles: ["ADMIN"],
            specificUserUids: [],
            reason: "123", // Menos de 5 caracteres
            actorUid: "admin_tester",
          },
          mockDb
        );
      },
      /motivo válido de auditoría/
    );

    // Actualización legítima
    await SettlementNotificationRecipientResolver.updateConfig(
      {
        enabledRoles: ["ADMIN", "FINANCE_MANAGER"],
        specificUserUids: ["user_c_accountant"],
        reason: "Auditoría formal de liquidaciones periódicas",
        actorUid: "admin_super",
        actorEmail: "super@bluesystemdelivery.com",
      },
      mockDb
    );

    // Verificar asiento en /audit_events
    const audits = mockDb.getCollection("audit_events");
    assert.ok(audits.size > 0, "Debe existir registro en /audit_events");

    let auditFound = false;
    for (const [_, aud] of audits.entries()) {
      if (aud.event === "SETTLEMENT_NOTIFICATION_CONFIG_UPDATED") {
        auditFound = true;
        assert.equal(aud.actorUid, "admin_super");
        assert.equal(aud.reason, "Auditoría formal de liquidaciones periódicas");
        assert.ok(aud.previousConfig);
        assert.ok(aud.newConfig);
      }
    }
    assert.ok(auditFound, "El evento SETTLEMENT_NOTIFICATION_CONFIG_UPDATED debe estar registrado");
  });
});
