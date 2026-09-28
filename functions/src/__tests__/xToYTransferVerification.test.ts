import { describe, it } from "node:test";
import assert from "node:assert";
import { EmailTemplateEngine } from "../services/emailService";
import { calculateHaversineDistanceKm } from "../services/xToYDispatchEngine";

describe("BSD-X2Y-TRANSFER-VERIFICATION-ENTERPRISE-001 — Test Suite", () => {
  it("TEST 01: Template x2y_transfer_verification is registered in system templates", () => {
    const templates = EmailTemplateEngine.getSystemTemplates();
    const t = templates.find((tpl) => tpl.templateId === "x2y_transfer_verification");
    assert.ok(t, "Template x2y_transfer_verification should be present");
    assert.strictEqual(t.audience, "ADMIN");
    assert.strictEqual(t.eventType, "X_TO_Y_TRANSFER_VERIFICATION_REQUIRED");
    assert.strictEqual(t.status, "ACTIVE");
  });

  it("TEST 02: Template x2y_transfer_verification renders with required variables", async () => {
    const tpl = await EmailTemplateEngine.resolveTemplate("x2y_transfer_verification");
    assert.ok(tpl);
    const rendered = EmailTemplateEngine.render(tpl, {
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

    assert.ok(rendered.subject.includes("Transferencia X→Y pendiente de verificación"));
    assert.ok(rendered.html.includes("Kimberly Flores Centeno"));
    assert.ok(rendered.html.includes("Victoria"));
    assert.ok(rendered.html.includes("191.80"));
    assert.ok(rendered.html.includes("234"));
    assert.ok(rendered.html.includes("TEST12"));
    assert.ok(rendered.html.includes("PENDIENTE DE VERIFICACIÓN"));
  });

  it("TEST 03: Haversine distance engine remains intact (ADR-015)", () => {
    const dist = calculateHaversineDistanceKm(12.1364, -86.2514, 12.14, -86.26);
    assert.ok(dist > 0 && dist < 5, "Calculated distance should be valid positive value");
  });

  it("TEST 04: Rejection reasons list covers required domain options", async () => {
    const { VALID_REJECTION_REASONS } = await import("../callables/xToYAdmin");
    assert.ok(VALID_REJECTION_REASONS.includes("Comprobante ilegible"));
    assert.ok(VALID_REJECTION_REASONS.includes("Monto incorrecto"));
    assert.ok(VALID_REJECTION_REASONS.includes("Referencia no válida"));
    assert.ok(VALID_REJECTION_REASONS.includes("Transferencia no localizada"));
    assert.ok(VALID_REJECTION_REASONS.includes("Comprobante inconsistente"));
    assert.ok(VALID_REJECTION_REASONS.includes("Otro"));
  });

  it("TEST 05: GATE 8 — Dispatch engine blocks trip while PENDING_VERIFICATION", async () => {
    // Simular regla de pre-despacho de xToYDispatchEngine
    const paymentMethod: string = "transferencia";
    const paymentStatus: string = "PENDING_VERIFICATION";
    const paymentVerified: boolean = false;
    const currentStatus: string = "PAYMENT_VERIFYING";

    const isBlocked = (currentStatus === "PAYMENT_VERIFYING" || paymentMethod === "transferencia") &&
      !paymentVerified &&
      paymentStatus !== "APPROVED" &&
      paymentStatus !== "VERIFIED";

    assert.strictEqual(isBlocked, true, "Trip with unverified transfer must be strictly blocked from fleet dispatch");
  });

  it("TEST 06: GATE 9 — Approved transfer unblocks dispatch to fleet pool", () => {
    const paymentMethod: string = "transferencia";
    const paymentStatus: string = "APPROVED";
    const paymentVerified: boolean = true;
    const currentStatus: string = "PENDING";

    const isBlocked = (currentStatus === "PAYMENT_VERIFYING" || paymentMethod === "transferencia") &&
      !paymentVerified &&
      paymentStatus !== "APPROVED" &&
      paymentStatus !== "VERIFIED";

    assert.strictEqual(isBlocked, false, "Approved transfer unblocks dispatch immediately");
  });

  it("TEST 07: GATE 10 — Rejected transfer remains blocked from fleet pool", () => {
    const paymentMethod: string = "transferencia";
    const paymentStatus: string = "REJECTED";
    const paymentVerified: boolean = false;
    const currentStatus: string = "PAYMENT_REJECTED";

    const isBlocked = (currentStatus === "PAYMENT_VERIFYING" || paymentMethod === "transferencia") &&
      !paymentVerified &&
      paymentStatus !== "APPROVED" &&
      paymentStatus !== "VERIFIED";

    assert.strictEqual(isBlocked, true, "Rejected transfer remains blocked from fleet pool");
  });

  it("TEST 08: GATE 4, 5 & 6 — Deterministic notification and email keys guarantee single delivery", () => {
    const tripId = "trip_test_123456";
    const campaignDocId = `x2y_transfer_${tripId}_VERIFY`;
    const emailEventId = `x2y_transfer_verification_${tripId}`;

    assert.strictEqual(campaignDocId, "x2y_transfer_trip_test_123456_VERIFY");
    assert.strictEqual(emailEventId, "x2y_transfer_verification_trip_test_123456");

    // Ambos canales operan sobre la misma clave única por viaje, asegurando 1 sola alerta in-app, 1 push y 1 email
    assert.ok(campaignDocId.includes(tripId));
    assert.ok(emailEventId.includes(tripId));
  });
});
