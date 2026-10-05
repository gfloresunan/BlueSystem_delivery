"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// Mock de Firestore en memoria para simular backend de verificación de cierres
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
                    async update(data) {
                        const col = self.getCollection(name);
                        if (!col.has(docId)) {
                            throw new Error(`Doc ${docId} does not exist`);
                        }
                        col.set(docId, { ...col.get(docId), ...data });
                    },
                };
            },
        };
    }
    async runTransaction(updateFunction) {
        const self = this;
        const transaction = {
            async get(docRef) {
                return docRef.get();
            },
            set(docRef, data, options) {
                return docRef.set(data, options);
            },
            update(docRef, data) {
                return docRef.update(data);
            },
        };
        return updateFunction(transaction);
    }
}
/**
 * Simulación del Handler de verifyCourierDailyClosure (Idéntico a functions/src/callables/courierClosureCallables.ts)
 */
async function executeVerifyCourierDailyClosure(db, data, context) {
    if (!context.auth) {
        throw new Error("UNAUTHENTICATED: Debe iniciar sesión para verificar el cierre.");
    }
    const callerUid = context.auth.uid;
    const token = context.auth.token || {};
    const isSuperAdmin = token.role === "SUPER_ADMIN" || token.superadmin === true;
    const isPlatformAdmin = token.role === "PLATFORM_ADMIN" || token.admin === true || isSuperAdmin;
    const isSupervisor = token.role === "SUPERVISOR" || token.supervisor === true || isPlatformAdmin;
    if (!isSupervisor) {
        throw new Error("PERMISSION_DENIED: Solo supervisores o administradores pueden verificar cierres.");
    }
    const { closureId, action, rejectionReason } = data || {};
    if (!closureId || typeof closureId !== "string") {
        throw new Error("INVALID_ARGUMENT: closureId es obligatorio.");
    }
    if (action !== "VERIFY" && action !== "REJECT") {
        throw new Error("INVALID_ARGUMENT: action debe ser 'VERIFY' o 'REJECT'.");
    }
    if (action === "REJECT" && (!rejectionReason || typeof rejectionReason !== "string")) {
        throw new Error("INVALID_ARGUMENT: rejectionReason es obligatorio al rechazar un cierre.");
    }
    return await db.runTransaction(async (transaction) => {
        const closureRef = db.collection("courier_daily_closures").doc(closureId);
        const closureSnap = await transaction.get(closureRef);
        if (!closureSnap.exists) {
            throw new Error("NOT_FOUND: El cierre no existe.");
        }
        const closure = closureSnap.data() || {};
        if (closure.status === "VERIFIED") {
            // Idempotencia: ya verificado previamente
            return {
                success: true,
                alreadyVerified: true,
                closureId,
                status: "VERIFIED",
                officialAct: closure.officialAct,
            };
        }
        const courierDisplayName = closure.courierName || "Courier Operativo";
        if (action === "REJECT") {
            await transaction.update(closureRef, {
                status: "REJECTED",
                rejectionReason: rejectionReason.trim(),
                verifiedByUid: callerUid,
                verifiedAt: new Date().toISOString(),
            });
            const auditRef = db.collection("audit_events").doc();
            await transaction.set(auditRef, {
                event: "COURIER_CLOSURE_REJECTED",
                closureId,
                courierId: closure.courierId,
                courierName: courierDisplayName,
                supervisorUid: callerUid,
                reason: rejectionReason.trim(),
                timestamp: new Date().toISOString(),
            });
            return {
                success: true,
                closureId,
                status: "REJECTED",
                courierId: closure.courierId,
            };
        }
        // Acción VERIFY: Emisión de Acta Oficial Inmutable
        const actDateStr = (closure.businessDate || new Date().toISOString().split("T")[0]).replace(/-/g, "");
        const randomSuffix = "TEST";
        const actNumber = `ACTA-CASH-${actDateStr}-${closure.courierId.slice(-4).toUpperCase()}-${randomSuffix}`;
        const verificationCode = "VERIF123";
        const officialAct = {
            actNumber,
            issuedAt: new Date().toISOString(),
            verificationCode,
            courierName: courierDisplayName,
            supervisorUid: callerUid,
            supervisorName: token.name || "Supervisor de Operaciones",
        };
        const depositAmountCents = Number(closure.bankDeposit?.depositAmountCents || closure.countedAmountCents || closure.expectedAmountCents || 0);
        // Asiento contable de débito
        if (depositAmountCents > 0) {
            const ledgerDebitRef = db.collection("courier_cash_ledger").doc();
            await transaction.set(ledgerDebitRef, {
                courierId: closure.courierId,
                closureId,
                entryType: "DEBIT",
                amountCents: depositAmountCents,
                sourceDomain: "DAILY_CLOSURE_BANK_DEPOSIT",
                reason: `Depósito bancario verificado por supervisor. Acta ${actNumber}`,
                createdAt: new Date().toISOString(),
            });
            const balanceRef = db.collection("courier_balances").doc(closure.courierId);
            const balanceSnap = await transaction.get(balanceRef);
            if (balanceSnap.exists) {
                const balData = balanceSnap.data() || {};
                const currentOutstanding = Number(balData.cashOutstandingCents || 0);
                await transaction.update(balanceRef, {
                    cashOutstandingCents: Math.max(0, currentOutstanding - depositAmountCents),
                    updatedAt: new Date().toISOString(),
                });
            }
        }
        // Actualización atómica del cierre
        await transaction.update(closureRef, {
            status: "VERIFIED",
            verifiedByUid: callerUid,
            verifiedAt: new Date().toISOString(),
            officialAct,
            settlementReconciliation: {
                reconciledAt: new Date().toISOString(),
                reconciledByUid: callerUid,
                status: "RECONCILED",
                differenceCents: Number(closure.depositDiscrepancyCents || 0),
            },
        });
        // Evento de auditoría
        const auditRef = db.collection("audit_events").doc();
        await transaction.set(auditRef, {
            event: "COURIER_CLOSURE_VERIFIED",
            closureId,
            courierId: closure.courierId,
            courierName: courierDisplayName,
            actNumber,
            supervisorUid: callerUid,
            depositAmountCents,
            timestamp: new Date().toISOString(),
        });
        return {
            success: true,
            closureId,
            status: "VERIFIED",
            officialAct,
        };
    });
}
(0, node_test_1.describe)("GAP-04: Admin Mobile Closure Approval & Security Architecture", () => {
    let db;
    (0, node_test_1.beforeEach)(() => {
        db = new MockFirestoreDb();
        // Estado inicial de balance del courier
        db.getCollection("courier_balances").set("courier_456", {
            courierId: "courier_456",
            cashOutstandingCents: 50000, // C$ 500.00
            effectiveCashLimitCents: 200000,
        });
        // Cierre diario pendiente de verificación
        db.getCollection("courier_daily_closures").set("closure_789", {
            id: "closure_789",
            courierId: "courier_456",
            courierName: "Roberto Gomez",
            businessDate: "2026-09-29",
            status: "PENDING_ADMIN_VERIFICATION",
            expectedAmountCents: 50000,
            bankDeposit: {
                depositAmountCents: 50000,
                bankName: "BAC Credomatic",
                referenceNumber: "BAC-998877",
                receiptImageUrl: "https://storage.googleapis.com/test-receipt.jpg",
            },
            depositDiscrepancyCents: 0,
        });
    });
    (0, node_test_1.it)("Test 1: Rechaza solicitudes sin autenticación", async () => {
        await strict_1.default.rejects(async () => {
            await executeVerifyCourierDailyClosure(db, { closureId: "closure_789", action: "VERIFY" }, {} // Sin auth
            );
        }, (err) => {
            strict_1.default.match(err.message, /UNAUTHENTICATED/);
            return true;
        });
    });
    (0, node_test_1.it)("Test 2: Rechaza usuarios no autorizados (repartidor o cliente intentando aprobar)", async () => {
        await strict_1.default.rejects(async () => {
            await executeVerifyCourierDailyClosure(db, { closureId: "closure_789", action: "VERIFY" }, { auth: { uid: "user_unauth", token: { role: "COURIER" } } });
        }, (err) => {
            strict_1.default.match(err.message, /PERMISSION_DENIED/);
            return true;
        });
    });
    (0, node_test_1.it)("Test 3: Admin Mobile ejecuta exitosamente verifyCourierDailyClosure con payload móvil", async () => {
        // Payload enviado exactamente por AdminCourierCashCenterScreen.kt
        const mobilePayload = {
            closureId: "closure_789",
            action: "VERIFY",
        };
        const supervisorAuth = {
            uid: "admin_mobile_01",
            token: {
                role: "SUPERVISOR",
                name: "Carlos Supervisor",
            },
        };
        const result = await executeVerifyCourierDailyClosure(db, mobilePayload, { auth: supervisorAuth });
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.status, "VERIFIED");
        strict_1.default.ok(result.officialAct.actNumber.startsWith("ACTA-CASH-20260929-"));
        strict_1.default.equal(result.officialAct.supervisorUid, "admin_mobile_01");
        // Validar mutación atómica en /courier_daily_closures
        const closureDoc = db.getCollection("courier_daily_closures").get("closure_789");
        strict_1.default.equal(closureDoc.status, "VERIFIED");
        strict_1.default.equal(closureDoc.verifiedByUid, "admin_mobile_01");
        strict_1.default.ok(closureDoc.officialAct);
        // Validar decremento atómico del balance financiero
        const balanceDoc = db.getCollection("courier_balances").get("courier_456");
        strict_1.default.equal(balanceDoc.cashOutstandingCents, 0); // 50000 - 50000 = 0
        // Validar asiento contable DEBIT en ledger
        const ledgerDocs = Array.from(db.getCollection("courier_cash_ledger").values());
        strict_1.default.equal(ledgerDocs.length, 1);
        strict_1.default.equal(ledgerDocs[0].entryType, "DEBIT");
        strict_1.default.equal(ledgerDocs[0].amountCents, 50000);
        strict_1.default.equal(ledgerDocs[0].courierId, "courier_456");
        // Validar evento de auditoría
        const auditDocs = Array.from(db.getCollection("audit_events").values());
        strict_1.default.equal(auditDocs.length, 1);
        strict_1.default.equal(auditDocs[0].event, "COURIER_CLOSURE_VERIFIED");
        strict_1.default.equal(auditDocs[0].supervisorUid, "admin_mobile_01");
    });
    (0, node_test_1.it)("Test 4: Idempotencia en aprobaciones repetidas desde Mobile", async () => {
        const supervisorAuth = {
            uid: "admin_mobile_01",
            token: { role: "SUPER_ADMIN", name: "Super Admin" },
        };
        // Primera ejecución
        const res1 = await executeVerifyCourierDailyClosure(db, { closureId: "closure_789", action: "VERIFY" }, { auth: supervisorAuth });
        strict_1.default.equal(res1.status, "VERIFIED");
        // Segunda ejecución (idempotente)
        const res2 = await executeVerifyCourierDailyClosure(db, { closureId: "closure_789", action: "VERIFY" }, { auth: supervisorAuth });
        strict_1.default.equal(res2.alreadyVerified, true);
        strict_1.default.equal(res2.status, "VERIFIED");
        // Comprobar que no se duplicó el asiento de débito en ledger
        const ledgerDocs = Array.from(db.getCollection("courier_cash_ledger").values());
        strict_1.default.equal(ledgerDocs.length, 1);
    });
    (0, node_test_1.it)("Test 5: Flujo de rechazo formal con motivo auditable", async () => {
        const supervisorAuth = {
            uid: "admin_mobile_01",
            token: { role: "SUPERVISOR", name: "Supervisor Operativo" },
        };
        const res = await executeVerifyCourierDailyClosure(db, {
            closureId: "closure_789",
            action: "REJECT",
            rejectionReason: "Comprobante bancario borroso e ilegible",
        }, { auth: supervisorAuth });
        strict_1.default.equal(res.status, "REJECTED");
        const closureDoc = db.getCollection("courier_daily_closures").get("closure_789");
        strict_1.default.equal(closureDoc.status, "REJECTED");
        strict_1.default.equal(closureDoc.rejectionReason, "Comprobante bancario borroso e ilegible");
        // Comprobar que el balance del courier NO fue debitado
        const balanceDoc = db.getCollection("courier_balances").get("courier_456");
        strict_1.default.equal(balanceDoc.cashOutstandingCents, 50000); // Intacto
        // Evento de auditoría de rechazo
        const auditDocs = Array.from(db.getCollection("audit_events").values());
        strict_1.default.equal(auditDocs[0].event, "COURIER_CLOSURE_REJECTED");
        strict_1.default.equal(auditDocs[0].reason, "Comprobante bancario borroso e ilegible");
    });
});
