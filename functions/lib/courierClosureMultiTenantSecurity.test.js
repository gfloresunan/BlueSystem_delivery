"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
function evaluateReadCourierDailyClosure(doc, context) {
    if (!context.auth)
        return false;
    const uid = context.auth.uid;
    const token = context.auth.token || {};
    // 1. currentUid() == resource.data.courierId
    if (uid === doc.courierId) {
        return true;
    }
    // 2. isPlatformAdmin()
    const isPlatformAdmin = token.role === "SUPER_ADMIN" ||
        token.role === "PLATFORM_ADMIN" ||
        token.admin === true ||
        token.superadmin === true;
    if (isPlatformAdmin) {
        return true;
    }
    // 3. isBusinessAdmin() — EXCLUIDO FORMALMENTE (GAP-06)
    // Ningún dueño de negocio puede leer cierres de motorizados
    const isBusinessAdmin = [
        "OWNER", "MANAGER", "MERCHANT_OWNER", "MERCHANT_MANAGER", "TENANT_ADMIN"
    ].includes(token.role || "");
    if (isBusinessAdmin) {
        return false; // Bloqueado
    }
    // 4. isSupervisor() con aislamiento estricto por tenant
    const isSupervisor = token.role === "SUPERVISOR" ||
        token.role === "MERCHANT_SUPERVISOR" ||
        token.supervisor === true;
    if (isSupervisor) {
        const callerTenant = token.tenantId || null;
        const docTenant = doc.tenantId || null;
        // Si es supervisor global sin tenant específico
        if (callerTenant === null)
            return true;
        // Si el documento no tiene tenant
        if (docTenant === null)
            return true;
        // Coincidencia exacta de tenant
        if (callerTenant === docTenant)
            return true;
        // Membresía autorizada en tenant
        if (Array.isArray(token.memberships) && token.memberships.includes(docTenant)) {
            return true;
        }
        return false;
    }
    return false;
}
function evaluateWriteCourierDailyClosure() {
    // allow write: if false;
    return false;
}
(0, node_test_1.describe)("GAP-06: Multi-Tenant Security & Tenant Isolation Suite", () => {
    const closureTenantA = {
        id: "closure_A_001",
        courierId: "courier_A",
        tenantId: "tenant_alpha",
        businessDate: "2026-09-29",
        expectedAmountCents: 50000,
    };
    const closureTenantB = {
        id: "closure_B_001",
        courierId: "courier_B",
        tenantId: "tenant_beta",
        businessDate: "2026-09-29",
        expectedAmountCents: 80000,
    };
    (0, node_test_1.it)("Test 1: Courier A puede leer su propio cierre pero Courier B NO puede leer el de Courier A", () => {
        const courierAContext = {
            auth: { uid: "courier_A", token: { role: "COURIER", tenantId: "tenant_alpha" } },
        };
        const courierBContext = {
            auth: { uid: "courier_B", token: { role: "COURIER", tenantId: "tenant_beta" } },
        };
        // Courier A lee Cierre A -> ALLOW
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantA, courierAContext), true);
        // Courier B intenta leer Cierre A -> DENY
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantA, courierBContext), false);
        // Courier B lee su propio Cierre B -> ALLOW
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantB, courierBContext), true);
    });
    (0, node_test_1.it)("Test 2: Administrador de comercio (Business Admin / Store Owner) tiene lectura DENEGADA", () => {
        // Comercio de Tenant A (Ej: Restaurante local)
        const merchantOwnerContext = {
            auth: { uid: "merchant_owner_01", token: { role: "MERCHANT_OWNER", tenantId: "tenant_alpha" } },
        };
        const managerContext = {
            auth: { uid: "manager_01", token: { role: "MANAGER", tenantId: "tenant_alpha" } },
        };
        // Lectura denegada formalmente en Cierre A y B
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantA, merchantOwnerContext), false);
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantB, merchantOwnerContext), false);
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantA, managerContext), false);
    });
    (0, node_test_1.it)("Test 3: Supervisor de Tenant A puede leer Cierre A pero se le RECHAZA acceso a Cierre B (Aislamiento Multi-Tenant)", () => {
        const supervisorAContext = {
            auth: { uid: "sup_alpha", token: { role: "SUPERVISOR", tenantId: "tenant_alpha" } },
        };
        const supervisorBContext = {
            auth: { uid: "sup_beta", token: { role: "SUPERVISOR", tenantId: "tenant_beta" } },
        };
        // Supervisor Alpha en Tenant Alpha -> ALLOW
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantA, supervisorAContext), true);
        // Supervisor Alpha en Tenant Beta -> DENY (Cross-tenant blocked)
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantB, supervisorAContext), false);
        // Supervisor Beta en Tenant Beta -> ALLOW
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantB, supervisorBContext), true);
        // Supervisor Beta en Tenant Alpha -> DENY (Cross-tenant blocked)
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantA, supervisorBContext), false);
    });
    (0, node_test_1.it)("Test 4: Platform Admin / Super Admin conserva acceso gobernado sobre todos los tenants", () => {
        const platformAdminContext = {
            auth: { uid: "platform_admin_01", token: { role: "PLATFORM_ADMIN", admin: true } },
        };
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantA, platformAdminContext), true);
        strict_1.default.equal(evaluateReadCourierDailyClosure(closureTenantB, platformAdminContext), true);
    });
    (0, node_test_1.it)("Test 5: Escritura directa de cliente prohibida en cualquier circunstancia (allow write: if false)", () => {
        strict_1.default.equal(evaluateWriteCourierDailyClosure(), false);
    });
});
