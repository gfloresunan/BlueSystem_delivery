"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const settlementRecipientResolver_1 = require("../services/settlementRecipientResolver");
// Mock de Firestore en memoria
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
                    async set(data, options) {
                        const col = self.getCollection(name);
                        if (options?.merge && col.has(docId)) {
                            col.set(docId, { ...col.get(docId), ...data });
                        }
                        else {
                            col.set(docId, data);
                        }
                    },
                };
            },
            where(field, op, val) {
                return {
                    where(f2, op2, v2) {
                        return this;
                    },
                    limit(n) {
                        return {
                            async get() {
                                const col = self.getCollection(name);
                                const docs = [];
                                for (const [id, data] of col.entries()) {
                                    let match = false;
                                    if (op === "in" && Array.isArray(val)) {
                                        match = val.includes(data[field]);
                                    }
                                    else if (op === "==") {
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
                                    forEach: (fn) => docs.forEach(fn),
                                };
                            },
                        };
                    },
                    async get() {
                        const col = self.getCollection(name);
                        const docs = [];
                        for (const [id, data] of col.entries()) {
                            let match = false;
                            if (op === "in" && Array.isArray(val)) {
                                match = val.includes(data[field]);
                            }
                            else if (op === "==") {
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
                            forEach: (fn) => docs.forEach(fn),
                        };
                    },
                };
            },
            async add(data) {
                const id = `aud_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                self.getCollection(name).set(id, data);
                return { id };
            },
        };
    }
    batch() {
        const ops = [];
        return {
            set(ref, data, options) {
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
(0, node_test_1.describe)("GAP-03: Settlement Notification Recipient Resolver Suite", () => {
    let mockDb;
    (0, node_test_1.beforeEach)(() => {
        mockDb = new MockFirestoreDb();
        settlementRecipientResolver_1.SettlementNotificationRecipientResolver.setDb(mockDb);
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
    (0, node_test_1.it)("TEST A: Defaults canónicos cuando no existe configuración previa", async () => {
        const recipients = await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.resolveRecipients("ten_bluesystem_core", mockDb);
        // Por default, ADMIN, FINANCE_MANAGER y ACCOUNTANT activos están habilitados
        strict_1.default.ok(recipients.some((r) => r.uid === "user_a_admin"));
        strict_1.default.ok(recipients.some((r) => r.uid === "user_b_finance"));
        strict_1.default.ok(recipients.some((r) => r.uid === "user_c_accountant"));
        // Usuario inactivo no debe aparecer
        strict_1.default.ok(!recipients.some((r) => r.uid === "user_d_inactive"));
    });
    (0, node_test_1.it)("TEST B: Cambio de configuración de roles A -> B (A deja de recibir, B recibe)", async () => {
        // Configurar para que SOLO FINANCE_MANAGER reciba
        await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.updateConfig({
            enabledRoles: ["FINANCE_MANAGER"],
            specificUserUids: [],
            reason: "Restricción a únicamente gerencia financiera para turno nocturno",
            actorUid: "admin_tester",
        }, mockDb);
        const recipients = await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.resolveRecipients("ten_bluesystem_core", mockDb);
        // Usuario B (FINANCE_MANAGER) recibe
        strict_1.default.ok(recipients.some((r) => r.uid === "user_b_finance"));
        // Usuario A (ADMIN) ya NO recibe
        strict_1.default.ok(!recipients.some((r) => r.uid === "user_a_admin"));
        // Usuario C (ACCOUNTANT) ya NO recibe
        strict_1.default.ok(!recipients.some((r) => r.uid === "user_c_accountant"));
    });
    (0, node_test_1.it)("TEST C: Agregar destinatario específico Usuario C -> recibe B + C", async () => {
        // Roles: FINANCE_MANAGER + Usuario específico C
        await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.updateConfig({
            enabledRoles: ["FINANCE_MANAGER"],
            specificUserUids: ["user_c_accountant"],
            reason: "Agregar a Usuario C de forma expresa para supervisión contable",
            actorUid: "admin_tester",
        }, mockDb);
        const recipients = await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.resolveRecipients("ten_bluesystem_core", mockDb);
        // B recibe (por rol)
        strict_1.default.ok(recipients.some((r) => r.uid === "user_b_finance"));
        // C recibe (por UID específico)
        strict_1.default.ok(recipients.some((r) => r.uid === "user_c_accountant"));
        // A sigue sin recibir
        strict_1.default.ok(!recipients.some((r) => r.uid === "user_a_admin"));
    });
    (0, node_test_1.it)("TEST D: Desactivación de Usuario B -> únicamente Usuario C continúa recibiendo", async () => {
        // Inactivar a Usuario B en la base de datos
        mockDb.getCollection("users").get("user_b_finance").isActive = false;
        // Con la misma configuración de FINANCE_MANAGER + user_c
        const recipients = await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.resolveRecipients("ten_bluesystem_core", mockDb);
        // B está inactivo -> EXCLUIDO
        strict_1.default.ok(!recipients.some((r) => r.uid === "user_b_finance"));
        // C está activo -> RECIBE
        strict_1.default.ok(recipients.some((r) => r.uid === "user_c_accountant"));
    });
    (0, node_test_1.it)("TEST E: Aislamiento Multi-Tenant (Admin de otro tenant queda excluido)", async () => {
        // Habilitar rol ADMIN
        await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.updateConfig({
            enabledRoles: ["ADMIN", "PLATFORM_ADMIN"],
            specificUserUids: [],
            reason: "Prueba de aislamiento multi-tenant",
            actorUid: "admin_tester",
        }, mockDb);
        const recipients = await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.resolveRecipients("ten_bluesystem_core", mockDb);
        // User A es PLATFORM_ADMIN -> Recibe
        strict_1.default.ok(recipients.some((r) => r.uid === "user_a_admin"));
        // User E es ADMIN de ten_comercio_externo -> NO debe recibir alertas de ten_bluesystem_core
        strict_1.default.ok(!recipients.some((r) => r.uid === "user_e_external_admin"));
    });
    (0, node_test_1.it)("TEST F: Validación de seguridad y auditoría inmutable en /audit_events", async () => {
        // Intentar actualizar sin motivo válido -> DEBE LANZAR ERROR
        await strict_1.default.rejects(async () => {
            await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.updateConfig({
                enabledRoles: ["ADMIN"],
                specificUserUids: [],
                reason: "123", // Menos de 5 caracteres
                actorUid: "admin_tester",
            }, mockDb);
        }, /motivo válido de auditoría/);
        // Actualización legítima
        await settlementRecipientResolver_1.SettlementNotificationRecipientResolver.updateConfig({
            enabledRoles: ["ADMIN", "FINANCE_MANAGER"],
            specificUserUids: ["user_c_accountant"],
            reason: "Auditoría formal de liquidaciones periódicas",
            actorUid: "admin_super",
            actorEmail: "super@bluesystemdelivery.com",
        }, mockDb);
        // Verificar asiento en /audit_events
        const audits = mockDb.getCollection("audit_events");
        strict_1.default.ok(audits.size > 0, "Debe existir registro en /audit_events");
        let auditFound = false;
        for (const [_, aud] of audits.entries()) {
            if (aud.event === "SETTLEMENT_NOTIFICATION_CONFIG_UPDATED") {
                auditFound = true;
                strict_1.default.equal(aud.actorUid, "admin_super");
                strict_1.default.equal(aud.reason, "Auditoría formal de liquidaciones periódicas");
                strict_1.default.ok(aud.previousConfig);
                strict_1.default.ok(aud.newConfig);
            }
        }
        strict_1.default.ok(auditFound, "El evento SETTLEMENT_NOTIFICATION_CONFIG_UPDATED debe estar registrado");
    });
});
