"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
(0, node_test_1.describe)("PHASE 2.1 — Account Deletion Compliance (Apple Guideline 5.1.1(v) & Google Play Data Safety)", () => {
    function validateAccountDeletionPreconditions(ctx) {
        if (!ctx.authUid) {
            return { allowed: false, errorCode: "unauthenticated", reason: "Debe iniciar sesión para solicitar la eliminación de su cuenta." };
        }
        if (ctx.hasActiveCommerceOrders) {
            return { allowed: false, errorCode: "failed-precondition", reason: "No puede eliminar su cuenta mientras tenga pedidos en curso." };
        }
        if (ctx.hasActiveXYTrips) {
            return { allowed: false, errorCode: "failed-precondition", reason: "No puede eliminar su cuenta mientras tenga envíos X→Y en curso." };
        }
        if (ctx.hasActiveCourierTrips) {
            return { allowed: false, errorCode: "failed-precondition", reason: "No puede eliminar su cuenta mientras tenga entregas asignadas activas." };
        }
        if (ctx.courierCashOutstandingCents > 0) {
            return { allowed: false, errorCode: "failed-precondition", reason: "Debe liquidar su saldo pendiente de caja antes de proceder con la eliminación de cuenta." };
        }
        return { allowed: true };
    }
    // Simulador de anonimización
    function anonymizeUserData(uid, rawUser) {
        return {
            ...rawUser,
            name: "Usuario Eliminado",
            nombre: "Usuario Eliminado",
            displayName: "Usuario Eliminado",
            fullName: "Usuario Eliminado",
            email: `deleted_${uid.substring(0, 8)}@bluesystem.anonymized`,
            phone: "",
            telefono: "",
            photoUrl: null,
            photoURL: null,
            profilePicture: null,
            fcmTokens: [],
            fcmToken: null,
            addresses: [],
            direcciones: [],
            accountStatus: "DELETED",
            status: "DELETED",
            isDeleted: true,
        };
    }
    (0, node_test_1.it)("Rechaza solicitud de eliminación de usuario no autenticado", () => {
        const res = validateAccountDeletionPreconditions({
            hasActiveCommerceOrders: false,
            hasActiveXYTrips: false,
            hasActiveCourierTrips: false,
            courierCashOutstandingCents: 0,
        });
        assert.strictEqual(res.allowed, false);
        assert.strictEqual(res.errorCode, "unauthenticated");
    });
    (0, node_test_1.it)("Bloquea eliminación si el cliente tiene pedidos comerciales activos en curso", () => {
        const res = validateAccountDeletionPreconditions({
            authUid: "user_client_123",
            hasActiveCommerceOrders: true,
            hasActiveXYTrips: false,
            hasActiveCourierTrips: false,
            courierCashOutstandingCents: 0,
        });
        assert.strictEqual(res.allowed, false);
        assert.strictEqual(res.errorCode, "failed-precondition");
        assert.ok(res.reason?.includes("pedidos en curso"));
    });
    (0, node_test_1.it)("Bloquea eliminación si el cliente tiene envíos X→Y activos en curso", () => {
        const res = validateAccountDeletionPreconditions({
            authUid: "user_client_123",
            hasActiveCommerceOrders: false,
            hasActiveXYTrips: true,
            hasActiveCourierTrips: false,
            courierCashOutstandingCents: 0,
        });
        assert.strictEqual(res.allowed, false);
        assert.strictEqual(res.errorCode, "failed-precondition");
        assert.ok(res.reason?.includes("envíos X→Y"));
    });
    (0, node_test_1.it)("Bloquea eliminación si el motorizado tiene entregas activas asignadas", () => {
        const res = validateAccountDeletionPreconditions({
            authUid: "courier_active_456",
            hasActiveCommerceOrders: false,
            hasActiveXYTrips: false,
            hasActiveCourierTrips: true,
            courierCashOutstandingCents: 0,
        });
        assert.strictEqual(res.allowed, false);
        assert.strictEqual(res.errorCode, "failed-precondition");
        assert.ok(res.reason?.includes("entregas asignadas"));
    });
    (0, node_test_1.it)("Bloquea eliminación si el motorizado tiene saldo pendiente de liquidar en caja", () => {
        const res = validateAccountDeletionPreconditions({
            authUid: "courier_active_456",
            hasActiveCommerceOrders: false,
            hasActiveXYTrips: false,
            hasActiveCourierTrips: false,
            courierCashOutstandingCents: 54000, // C$ 540.00 pendiente
        });
        assert.strictEqual(res.allowed, false);
        assert.strictEqual(res.errorCode, "failed-precondition");
        assert.ok(res.reason?.includes("saldo pendiente de caja"));
    });
    (0, node_test_1.it)("Permite eliminación y anonimiza completamente los datos personales (PII) cuando no hay restricciones", () => {
        const uid = "user_clean_789";
        const res = validateAccountDeletionPreconditions({
            authUid: uid,
            hasActiveCommerceOrders: false,
            hasActiveXYTrips: false,
            hasActiveCourierTrips: false,
            courierCashOutstandingCents: 0,
        });
        assert.strictEqual(res.allowed, true);
        const originalProfile = {
            name: "Juan Pérez",
            email: "juan.perez@example.com",
            phone: "+50588889999",
            photoUrl: "https://storage.googleapis.com/photos/profile.jpg",
            fcmTokens: ["token_device_abc"],
            addresses: [{ street: "Calle Central", city: "Managua" }],
            accountStatus: "ACTIVE",
        };
        const anonymized = anonymizeUserData(uid, originalProfile);
        assert.strictEqual(anonymized.name, "Usuario Eliminado");
        assert.strictEqual(anonymized.email, `deleted_${uid.substring(0, 8)}@bluesystem.anonymized`);
        assert.strictEqual(anonymized.phone, "");
        assert.strictEqual(anonymized.photoUrl, null);
        assert.strictEqual(anonymized.accountStatus, "DELETED");
        assert.strictEqual(anonymized.isDeleted, true);
        assert.strictEqual(anonymized.fcmTokens.length, 0);
        assert.strictEqual(anonymized.addresses.length, 0);
    });
});
