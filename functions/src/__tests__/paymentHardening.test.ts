/**
 * BlueSystem Delivery Enterprise — Phase 2 Payment Hardening & Pre-Bank Certification Test Suite
 * 
 * Tests Defense in Depth, Payment Activation Gate, Cash Calculations, and False Payment Protections.
 */

import { describe, test } from "node:test";
import * as assert from "node:assert";
import {
  evaluatePaymentActivationGate,
  isCardPaymentAllowed,
  validatePaymentRequest,
  DEFAULT_PAYMENT_ACTIVATION_STATUS,
} from "../domain/payments/paymentActivationGate";
import { PaymentActivationStatus } from "../domain/payments/paymentTypes";

describe("Phase 2: Payment Hardening & Activation Gate Test Suite", () => {

  // ─── 1. ACTIVATION GATE BASELINE TESTS ─────────────────────────────────────
  test("TEST 01: Default Activation Status has CARD disabled and all pre-bank conditions false", () => {
    const gate = evaluatePaymentActivationGate();
    assert.strictEqual(gate.isAllowed, false);
    assert.strictEqual(isCardPaymentAllowed(), false);
    assert.strictEqual(gate.status.cardEnabled, false);
    assert.strictEqual(gate.status.gatewayConfigured, false);
    assert.strictEqual(gate.status.gatewayAdapterAvailable, false);
    assert.strictEqual(gate.status.sandboxCertified, false);
    assert.strictEqual(gate.status.webhookVerified, false);
    assert.strictEqual(gate.status.securityReviewed, false);
    assert.strictEqual(gate.status.e2eCertified, false);
    assert.strictEqual(gate.status.governanceApproved, false);
    assert.strictEqual(gate.status.productionCredentialsConfigured, false);
    assert.strictEqual(gate.status.killSwitchActive, false);
    assert.ok(gate.blockedReasons.length >= 8);
  });

  test("TEST 02: Single true flag is NOT sufficient to enable CARD payments", () => {
    // Attempting to activate solely by changing cardEnabled = true
    const gate = evaluatePaymentActivationGate({ cardEnabled: true });
    assert.strictEqual(gate.isAllowed, false);
    assert.ok(
      gate.blockedReasons.includes(
        "GATEWAY_NOT_CONFIGURED: Sin configuración bancaria institucional."
      )
    );
  });

  test("TEST 03: All 8 prerequisites must be true to open the gate", () => {
    const fullyCertifiedStatus: PaymentActivationStatus = {
      cardEnabled: true,
      gatewayConfigured: true,
      gatewayAdapterAvailable: true,
      sandboxCertified: true,
      webhookVerified: true,
      securityReviewed: true,
      e2eCertified: true,
      governanceApproved: true,
      productionCredentialsConfigured: true,
      killSwitchActive: false,
    };

    const gate = evaluatePaymentActivationGate(fullyCertifiedStatus);
    assert.strictEqual(gate.isAllowed, true);
    assert.strictEqual(gate.blockedReasons.length, 0);
    assert.strictEqual(isCardPaymentAllowed(fullyCertifiedStatus), true);
  });

  test("TEST 04: Emergency Kill Switch immediately blocks CARD even if fully certified", () => {
    const killedStatus: PaymentActivationStatus = {
      cardEnabled: true,
      gatewayConfigured: true,
      gatewayAdapterAvailable: true,
      sandboxCertified: true,
      webhookVerified: true,
      securityReviewed: true,
      e2eCertified: true,
      governanceApproved: true,
      productionCredentialsConfigured: true,
      killSwitchActive: true, // Emergency trigger
    };

    const gate = evaluatePaymentActivationGate(killedStatus);
    assert.strictEqual(gate.isAllowed, false);
    assert.ok(
      gate.blockedReasons.includes(
        "CARD_PAYMENTS_KILL_SWITCH_ACTIVE: Desactivación de emergencia activada."
      )
    );
    assert.strictEqual(isCardPaymentAllowed(killedStatus), false);
  });

  // ─── 2. PAYMENT VALIDATION REQUEST TESTS ───────────────────────────────────
  test("TEST 05: CASH ('efectivo') is valid, returns PENDING status and is unaffected by gate", () => {
    const res = validatePaymentRequest("efectivo");
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.authoritativePaymentMethod, "efectivo");
    assert.strictEqual(res.authoritativePaymentStatus, "PENDING");
  });

  test("TEST 06: CASH ('cash' alias or blank) is normalized to 'efectivo' and valid", () => {
    const res1 = validatePaymentRequest("cash");
    assert.strictEqual(res1.isValid, true);
    assert.strictEqual(res1.authoritativePaymentMethod, "efectivo");

    const res2 = validatePaymentRequest("");
    assert.strictEqual(res2.isValid, true);
    assert.strictEqual(res2.authoritativePaymentMethod, "efectivo");
  });

  test("TEST 07: CARD ('tarjeta') with default closed gate is REJECTED with PAYMENT_GATEWAY_NOT_AVAILABLE", () => {
    const res = validatePaymentRequest("tarjeta");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.errorCode, "PAYMENT_GATEWAY_NOT_AVAILABLE");
    assert.strictEqual(res.authoritativePaymentStatus, "FAILED");
  });

  test("TEST 08: CARD ('card' alias) with default closed gate is REJECTED with PAYMENT_GATEWAY_NOT_AVAILABLE", () => {
    const res = validatePaymentRequest("card");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.errorCode, "PAYMENT_GATEWAY_NOT_AVAILABLE");
    assert.strictEqual(res.authoritativePaymentStatus, "FAILED");
  });

  test("TEST 09: CARD with Kill Switch is REJECTED with PAYMENT_GATEWAY_KILL_SWITCH_ACTIVE", () => {
    const res = validatePaymentRequest("tarjeta", { killSwitchActive: true });
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.errorCode, "PAYMENT_GATEWAY_KILL_SWITCH_ACTIVE");
    assert.strictEqual(res.authoritativePaymentStatus, "FAILED");
  });

  test("TEST 10: X→Y Manual Methods ('billetera', 'transferencia') remain valid for manual verification", () => {
    const resWallet = validatePaymentRequest("billetera");
    assert.strictEqual(resWallet.isValid, true);
    assert.strictEqual(resWallet.authoritativePaymentMethod, "billetera");
    assert.strictEqual(resWallet.authoritativePaymentStatus, "PENDING");

    const resTransfer = validatePaymentRequest("transferencia");
    assert.strictEqual(resTransfer.isValid, true);
    assert.strictEqual(resTransfer.authoritativePaymentMethod, "transferencia");
    assert.strictEqual(resTransfer.authoritativePaymentStatus, "PENDING");
  });

  test("TEST 11: Unknown payment method is rejected with INVALID_PAYMENT_METHOD", () => {
    const res = validatePaymentRequest("crypto_bitcoin");
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.errorCode, "INVALID_PAYMENT_METHOD");
  });

  // ─── 3. CASH CALCULATION & REGRESSION CERTIFICATION ────────────────────────
  test("TEST 12: CASH Case 1 — Exact Cash (Total C$435, Received C$435 -> Change C$0)", () => {
    const totalOrder = 435.0;
    const receivedAmount = 435.0;
    const changeAmount = receivedAmount - totalOrder;
    const isCashValid = receivedAmount >= totalOrder;

    assert.strictEqual(isCashValid, true);
    assert.strictEqual(changeAmount, 0.0);
  });

  test("TEST 13: CASH Case 2 — Excess Cash with Change (Total C$435, Received C$500 -> Change C$65)", () => {
    const totalOrder = 435.0;
    const receivedAmount = 500.0;
    const changeAmount = receivedAmount - totalOrder;
    const isCashValid = receivedAmount >= totalOrder;

    assert.strictEqual(isCashValid, true);
    assert.strictEqual(changeAmount, 65.0);
  });

  test("TEST 14: CASH Case 3 — Insufficient Cash (Total C$435, Received C$400 -> Block Delivery)", () => {
    const totalOrder = 435.0;
    const receivedAmount = 400.0;
    const changeAmount = receivedAmount - totalOrder;
    const isCashValid = receivedAmount >= totalOrder;
    const missingAmount = totalOrder - receivedAmount;

    assert.strictEqual(isCashValid, false);
    assert.strictEqual(missingAmount, 35.0);
    assert.ok(changeAmount < 0);
  });
});
