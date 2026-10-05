"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const courierClosureCallables_1 = require("../callables/courierClosureCallables");
// Mock minimal de Firestore para probar dispatchCourierClosureAdminNotification en aislamiento E2E
class MockFirestoreDb {
    constructor() {
        this.collections = new Map();
        this.subcollections = new Map(); // key: "users/{uid}/notifications"
    }
    getCollection(name) {
        if (!this.collections.has(name)) {
            this.collections.set(name, new Map());
        }
        return this.collections.get(name);
    }
    getSubcollection(path) {
        if (!this.subcollections.has(path)) {
            this.subcollections.set(path, new Map());
        }
        return this.subcollections.get(path);
    }
    collection(name) {
        const self = this;
        return {
            doc(id) {
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
                    async set(data, options) {
                        const col = self.getCollection(name);
                        if (options && options.merge && col.has(docId)) {
                            col.set(docId, { ...col.get(docId), ...data });
                        }
                        else {
                            col.set(docId, data);
                        }
                    },
                    collection(subName) {
                        const subPath = `${name}/${docId}/${subName}`;
                        return {
                            doc(subDocId) {
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
                                    async set(data, options) {
                                        const subCol = self.getSubcollection(subPath);
                                        if (options && options.merge && subCol.has(subDocId)) {
                                            subCol.set(subDocId, { ...subCol.get(subDocId), ...data });
                                        }
                                        else {
                                            subCol.set(subDocId, data);
                                        }
                                    }
                                };
                            }
                        };
                    }
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
                                return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
                            }
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
                        return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
                    }
                };
            },
            async add(data) {
                const id = `aud_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                self.getCollection(name).set(id, data);
                return { id };
            }
        };
    }
    batch() {
        const operations = [];
        return {
            set(docRef, data, options) {
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
(0, node_test_1.describe)("GAP-01: Courier Daily Closure Admin Notification Suite", () => {
    let mockDb;
    (0, node_test_1.beforeEach)(() => {
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
    (0, node_test_1.it)("TEST A: Despacha notificación y encola campaña al registrar comprobante de depósito", async () => {
        const res = await (0, courierClosureCallables_1.dispatchCourierClosureAdminNotification)({
            closureId: "clos_20260929_henry_001",
            courierId: "courier_henry_paz",
            courierName: "Henry Paz",
            depositAmountCents: 504000, // C$ 5,040.00
            expectedAmountCents: 504000,
            bankName: "BAC Credomatic",
            bankReference: "TR-982341",
            businessDate: "2026-09-29",
            tenantId: "ten_bluesystem_core",
        }, mockDb);
        strict_1.default.equal(res.success, true);
        strict_1.default.equal(res.idempotent, false);
        strict_1.default.equal(res.adminCount, 2); // admin_gerald y supervisor_carlos
        strict_1.default.equal(res.campaignDocId, "courier_closure_clos_20260929_henry_001_pending_admin");
        // Verificar campaña en notification_campaigns
        const camp = mockDb.getCollection("notification_campaigns").get("courier_closure_clos_20260929_henry_001_pending_admin");
        strict_1.default.ok(camp, "La campaña en notification_campaigns debe existir");
        strict_1.default.equal(camp.status, "QUEUED");
        strict_1.default.equal(camp.targetType, "admin");
        strict_1.default.equal(camp.category, "Liquidaciones");
        strict_1.default.equal(camp.amount, 5040);
        strict_1.default.equal(camp.bankReference, "TR-982341");
        strict_1.default.ok(camp.deepLink.includes("courierCashControl?closureId=clos_20260929_henry_001"));
        // Verificar notificaciones in-app
        const geraldNotif = mockDb.getSubcollection("users/admin_gerald/notifications").get("courier_closure_clos_20260929_henry_001_pending_admin");
        strict_1.default.ok(geraldNotif, "admin_gerald debe tener la notificación in-app");
        strict_1.default.equal(geraldNotif.type, "COURIER_DAILY_CLOSURE_PENDING");
        strict_1.default.equal(geraldNotif.courierName, "Henry Paz");
        strict_1.default.equal(geraldNotif.amount, 5040);
        const carlosNotif = mockDb.getSubcollection("users/supervisor_carlos/notifications").get("courier_closure_clos_20260929_henry_001_pending_admin");
        strict_1.default.ok(carlosNotif, "supervisor_carlos debe tener la notificación in-app");
        // Verificar evento de auditoría
        const auditCol = mockDb.getCollection("audit_events");
        let auditFound = false;
        for (const [_, a] of auditCol.entries()) {
            if (a.event === "COURIER_CLOSURE_ADMIN_NOTIFIED" && a.closureId === "clos_20260929_henry_001") {
                auditFound = true;
                strict_1.default.equal(a.adminRecipientsCount, 2);
            }
        }
        strict_1.default.equal(auditFound, true, "Debe existir evento COURIER_CLOSURE_ADMIN_NOTIFIED en /audit_events");
    });
    (0, node_test_1.it)("TEST B: Idempotencia estricta ante reintentos (cero duplicación de campañas ni notificaciones)", async () => {
        // 1er despacho
        const res1 = await (0, courierClosureCallables_1.dispatchCourierClosureAdminNotification)({
            closureId: "clos_20260929_henry_002",
            courierId: "courier_henry_paz",
            courierName: "Henry Paz",
            depositAmountCents: 150000,
            expectedAmountCents: 150000,
            bankName: "Banco LAFISE",
            bankReference: "LAF-00129",
            businessDate: "2026-09-29",
        }, mockDb);
        strict_1.default.equal(res1.success, true);
        strict_1.default.equal(res1.idempotent, false);
        const campaignCountBefore = mockDb.getCollection("notification_campaigns").size;
        // 2do despacho (reintento o clic duplicado)
        const res2 = await (0, courierClosureCallables_1.dispatchCourierClosureAdminNotification)({
            closureId: "clos_20260929_henry_002",
            courierId: "courier_henry_paz",
            courierName: "Henry Paz",
            depositAmountCents: 150000,
            expectedAmountCents: 150000,
            bankName: "Banco LAFISE",
            bankReference: "LAF-00129",
            businessDate: "2026-09-29",
        }, mockDb);
        strict_1.default.equal(res2.success, true);
        strict_1.default.equal(res2.idempotent, true); // Identificado como idempotente
        const campaignCountAfter = mockDb.getCollection("notification_campaigns").size;
        strict_1.default.equal(campaignCountAfter, campaignCountBefore, "No deben crearse campañas duplicadas");
    });
    (0, node_test_1.it)("TEST C: Aislamiento Multi-Tenant (Admins de otro tenant son excluidos)", async () => {
        const res = await (0, courierClosureCallables_1.dispatchCourierClosureAdminNotification)({
            closureId: "clos_20260929_henry_003",
            courierId: "courier_henry_paz",
            courierName: "Henry Paz",
            depositAmountCents: 200000,
            expectedAmountCents: 200000,
            bankName: "Banpro",
            bankReference: "BP-5566",
            businessDate: "2026-09-29",
            tenantId: "ten_comercio_especifico",
        }, mockDb);
        // Solo superadmin/admin sin mismatch de tenant puede recibir
        const tenantBNotif = mockDb.getSubcollection("users/admin_tenant_b/notifications").get("courier_closure_clos_20260929_henry_003_pending_admin");
        strict_1.default.equal(tenantBNotif, undefined, "Admin de tenant ajeno NO debe recibir notificación");
    });
    (0, node_test_1.it)("TEST D: Usuarios inactivos y no administradores son excluidos absolutamente", async () => {
        await (0, courierClosureCallables_1.dispatchCourierClosureAdminNotification)({
            closureId: "clos_20260929_henry_004",
            courierId: "courier_henry_paz",
            courierName: "Henry Paz",
            depositAmountCents: 300000,
            expectedAmountCents: 300000,
            bankName: "BAC",
            bankReference: "REF-999",
            businessDate: "2026-09-29",
        }, mockDb);
        const inactiveNotif = mockDb.getSubcollection("users/admin_inactivo/notifications").get("courier_closure_clos_20260929_henry_004_pending_admin");
        strict_1.default.equal(inactiveNotif, undefined, "Admin inactivo NO debe recibir notificación");
        const clientNotif = mockDb.getSubcollection("users/client_pedro/notifications").get("courier_closure_clos_20260929_henry_004_pending_admin");
        strict_1.default.equal(clientNotif, undefined, "Cliente regular NO debe recibir notificación");
    });
    (0, node_test_1.it)("TEST E: Formato y Deep Link verificados contra la especificación de Admin Web", async () => {
        const res = await (0, courierClosureCallables_1.dispatchCourierClosureAdminNotification)({
            closureId: "clos_20260929_henry_005",
            courierId: "courier_henry_paz",
            courierName: "Henry Paz",
            depositAmountCents: 125050, // C$ 1,250.50
            expectedAmountCents: 125050,
            bankName: "BAC Credomatic",
            bankReference: "BAC-778899",
            businessDate: "2026-09-29",
        }, mockDb);
        const camp = mockDb.getCollection("notification_campaigns").get(res.campaignDocId);
        strict_1.default.equal(camp.title, "🔔 Nueva liquidación de efectivo pendiente");
        strict_1.default.ok(camp.body.includes("Henry Paz"));
        strict_1.default.ok(camp.body.includes("C$ 1250.50"));
        strict_1.default.ok(camp.body.includes("BAC-778899"));
        strict_1.default.equal(camp.deepLink, "panel-admin/public/dashboard.html#courierCashControl?closureId=clos_20260929_henry_005");
    });
});
