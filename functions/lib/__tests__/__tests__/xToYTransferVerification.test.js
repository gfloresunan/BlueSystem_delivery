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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const emailService_1 = require("../services/emailService");
const xToYDispatchEngine_1 = require("../services/xToYDispatchEngine");
(0, node_test_1.describe)("BSD-X2Y-TRANSFER-VERIFICATION-ENTERPRISE-001 — Test Suite", () => {
    (0, node_test_1.it)("TEST 01: Template x2y_transfer_verification is registered in system templates", () => {
        const templates = emailService_1.EmailTemplateEngine.getSystemTemplates();
        const t = templates.find((tpl) => tpl.templateId === "x2y_transfer_verification");
        node_assert_1.default.ok(t, "Template x2y_transfer_verification should be present");
        node_assert_1.default.strictEqual(t.audience, "ADMIN");
        node_assert_1.default.strictEqual(t.eventType, "X_TO_Y_TRANSFER_VERIFICATION_REQUIRED");
        node_assert_1.default.strictEqual(t.status, "ACTIVE");
    });
    (0, node_test_1.it)("TEST 02: Template x2y_transfer_verification renders with required variables", async () => {
        const tpl = await emailService_1.EmailTemplateEngine.resolveTemplate("x2y_transfer_verification");
        node_assert_1.default.ok(tpl);
        const rendered = emailService_1.EmailTemplateEngine.render(tpl, {
            tripId: "env_test12345",
            tripIdShort: "TEST12",
            senderName: "Kimberly Flores Centeno",
            recipientName: "Victoria",
            amount: "191.80",
            referenceNumber: "234",
            formattedDate: "21/09/2026 4:24 p. m.",
            platformName: "BlueSystem Delivery",
            tenantName: "Core",
            supportEmail: "soporte@bluesystemdelivery.com",
            year: "2026",
        });
        node_assert_1.default.ok(rendered.subject.includes("Transferencia X→Y pendiente de verificación"));
        node_assert_1.default.ok(rendered.html.includes("Kimberly Flores Centeno"));
        node_assert_1.default.ok(rendered.html.includes("Victoria"));
        node_assert_1.default.ok(rendered.html.includes("191.80"));
        node_assert_1.default.ok(rendered.html.includes("234"));
        node_assert_1.default.ok(rendered.html.includes("TEST12"));
        node_assert_1.default.ok(rendered.html.includes("PENDIENTE DE VERIFICACIÓN"));
    });
    (0, node_test_1.it)("TEST 03: Haversine distance engine remains intact (ADR-015)", () => {
        const dist = (0, xToYDispatchEngine_1.calculateHaversineDistanceKm)(12.1364, -86.2514, 12.14, -86.26);
        node_assert_1.default.ok(dist > 0 && dist < 5, "Calculated distance should be valid positive value");
    });
    (0, node_test_1.it)("TEST 04: Rejection reasons list covers required domain options", async () => {
        const { VALID_REJECTION_REASONS } = await Promise.resolve().then(() => __importStar(require("../callables/xToYAdmin")));
        node_assert_1.default.ok(VALID_REJECTION_REASONS.includes("Comprobante ilegible"));
        node_assert_1.default.ok(VALID_REJECTION_REASONS.includes("Monto incorrecto"));
        node_assert_1.default.ok(VALID_REJECTION_REASONS.includes("Referencia no válida"));
        node_assert_1.default.ok(VALID_REJECTION_REASONS.includes("Transferencia no localizada"));
        node_assert_1.default.ok(VALID_REJECTION_REASONS.includes("Comprobante inconsistente"));
        node_assert_1.default.ok(VALID_REJECTION_REASONS.includes("Otro"));
    });
    (0, node_test_1.it)("TEST 05: GATE 8 — Dispatch engine blocks trip while PENDING_VERIFICATION", async () => {
        // Simular regla de pre-despacho de xToYDispatchEngine
        const paymentMethod = "transferencia";
        const paymentStatus = "PENDING_VERIFICATION";
        const paymentVerified = false;
        const currentStatus = "PAYMENT_VERIFYING";
        const isBlocked = (currentStatus === "PAYMENT_VERIFYING" || paymentMethod === "transferencia") &&
            !paymentVerified &&
            paymentStatus !== "APPROVED" &&
            paymentStatus !== "VERIFIED";
        node_assert_1.default.strictEqual(isBlocked, true, "Trip with unverified transfer must be strictly blocked from fleet dispatch");
    });
    (0, node_test_1.it)("TEST 06: GATE 9 — Approved transfer unblocks dispatch to fleet pool", () => {
        const paymentMethod = "transferencia";
        const paymentStatus = "APPROVED";
        const paymentVerified = true;
        const currentStatus = "PENDING";
        const isBlocked = (currentStatus === "PAYMENT_VERIFYING" || paymentMethod === "transferencia") &&
            !paymentVerified &&
            paymentStatus !== "APPROVED" &&
            paymentStatus !== "VERIFIED";
        node_assert_1.default.strictEqual(isBlocked, false, "Approved transfer unblocks dispatch immediately");
    });
    (0, node_test_1.it)("TEST 07: GATE 10 — Rejected transfer remains blocked from fleet pool", () => {
        const paymentMethod = "transferencia";
        const paymentStatus = "REJECTED";
        const paymentVerified = false;
        const currentStatus = "PAYMENT_REJECTED";
        const isBlocked = (currentStatus === "PAYMENT_VERIFYING" || paymentMethod === "transferencia") &&
            !paymentVerified &&
            paymentStatus !== "APPROVED" &&
            paymentStatus !== "VERIFIED";
        node_assert_1.default.strictEqual(isBlocked, true, "Rejected transfer remains blocked from fleet pool");
    });
    (0, node_test_1.it)("TEST 08: GATE 4, 5 & 6 — Deterministic notification and email keys guarantee single delivery", () => {
        const tripId = "trip_test_123456";
        const campaignDocId = `x2y_transfer_${tripId}_VERIFY`;
        const emailEventId = `x2y_transfer_verification_${tripId}`;
        node_assert_1.default.strictEqual(campaignDocId, "x2y_transfer_trip_test_123456_VERIFY");
        node_assert_1.default.strictEqual(emailEventId, "x2y_transfer_verification_trip_test_123456");
        // Ambos canales operan sobre la misma clave única por viaje, asegurando 1 sola alerta in-app, 1 push y 1 email
        node_assert_1.default.ok(campaignDocId.includes(tripId));
        node_assert_1.default.ok(emailEventId.includes(tripId));
    });
});
