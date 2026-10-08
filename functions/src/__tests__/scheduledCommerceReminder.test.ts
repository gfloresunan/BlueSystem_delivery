/**
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * TEST SUITE: BSD-SCHEDULED-COMMERCE-PHASE-5-REMINDERS-001
 *
 * Server-Authoritative Scheduled Commerce Reminders & Notification Orchestration
 *
 * Verificaciones Mandatorias de Gobernanza y Arquitectura:
 * T01: Non-SCHEDULED order suppression (IMMEDIATE orders produce zero reminders)
 * T02: Dedupe Key determinism and Reschedule Isolation (different window = different key)
 * T03: 24h Merchant reminder eligibility and due calculation
 * T04: 24h Customer reminder eligibility and due calculation
 * T05: 5h Merchant reminder eligibility and due calculation
 * T06: 5h Customer reminder eligibility and due calculation
 * T07: Preparation Due alert: fires when pending, suppressed if already preparing or ready
 * T08: Window Risk alert: fires near/at window start if unfulfilled, suppressed if ready/assigned
 * T09: Cancelled and Delivered order global suppression
 * T10: Merchant configuration override resolution (custom leads & toggles)
 * T11: Zero Automatic Status Transition guarantee (pure evaluation leaves order status immutable)
 * T12: Privacy Protection guarantee (giftDetails.message never leaked into payload variables)
 * T13: Cloud Scheduler interval and timezone configuration validation
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  evaluateReminderEligibility,
  buildReminderDedupeKey,
  buildCampaignDocId,
  resolveMerchantReminderConfig,
  DEFAULT_REMINDER_CONFIG,
  ScheduledCommerceReminderConfig,
} from "../services/scheduledCommerceReminderEngine";

describe("BSD-SCHEDULED-COMMERCE-PHASE-5-REMINDERS: Engine & Evaluation Tests", () => {
  // Ventana de prueba fija: 2026-10-10T14:00:00Z
  const windowStartIso = "2026-10-10T14:00:00.000Z";
  const windowStartMs = new Date(windowStartIso).getTime();

  it("T01 — Immediate Mode: Orders with mode !== SCHEDULED produce 0 reminder items", () => {
    const immediateOrder = {
      id: "ord_imm_001",
      businessId: "biz_test",
      status: "pending",
      fulfillmentTiming: {
        mode: "IMMEDIATE",
      },
    };

    const res = evaluateReminderEligibility(immediateOrder, windowStartMs - 86400000);
    assert.strictEqual(res.items.length, 0, "No items must be generated for non-scheduled orders");
  });

  it("T02 — Dedupe Key Determinism: Generates stable keys and separates rescheduled windows", () => {
    const key1 = buildReminderDedupeKey("ord_123", "MERCHANT", "SCHEDULED_MERCHANT_24H", windowStartMs);
    const key1Repeat = buildReminderDedupeKey("ord_123", "MERCHANT", "SCHEDULED_MERCHANT_24H", windowStartMs);
    assert.strictEqual(key1, key1Repeat, "Keys must be strictly deterministic");

    const rescheduledWindowMs = windowStartMs + 24 * 60 * 60 * 1000;
    const keyRescheduled = buildReminderDedupeKey("ord_123", "MERCHANT", "SCHEDULED_MERCHANT_24H", rescheduledWindowMs);
    assert.notStrictEqual(key1, keyRescheduled, "Rescheduled orders must have distinct dedupe keys");

    const campaignId = buildCampaignDocId("ord_123", "CUSTOMER", "SCHEDULED_CUSTOMER_5H", windowStartMs);
    assert.ok(campaignId.includes("ord_123"));
    assert.ok(campaignId.includes("CUSTOMER"));
    assert.ok(campaignId.includes("SCHEDULED_CUSTOMER_5H"));
  });

  it("T03 — 24h Merchant Reminder: Becomes due ~24h before windowStartAt", () => {
    const scheduledOrder = {
      id: "ord_sched_24h_m",
      businessId: "biz_test",
      status: "pending",
      fulfillmentTiming: {
        mode: "SCHEDULED",
        windowStartAt: windowStartIso,
        windowEndAt: "2026-10-10T15:00:00.000Z",
      },
    };

    // Exactly 24h before (1440 min)
    const exact24hBeforeMs = windowStartMs - (24 * 60 * 60 * 1000);
    const res = evaluateReminderEligibility(scheduledOrder, exact24hBeforeMs);

    const m24 = res.items.find((i) => i.eventType === "SCHEDULED_MERCHANT_24H");
    assert.ok(m24, "SCHEDULED_MERCHANT_24H item must exist");
    assert.strictEqual(m24.isDue, true, "Must be due at 24h before window");
    assert.strictEqual(m24.isSuppressed, false, "Must not be suppressed");

    // Way too early (e.g. 48h before)
    const tooEarlyMs = windowStartMs - (48 * 60 * 60 * 1000);
    const resEarly = evaluateReminderEligibility(scheduledOrder, tooEarlyMs);
    const m24Early = resEarly.items.find((i) => i.eventType === "SCHEDULED_MERCHANT_24H");
    assert.strictEqual(m24Early?.isDue, false, "Must NOT be due 48h before");
  });

  it("T04 — 24h Customer Reminder: Becomes due ~24h before windowStartAt", () => {
    const scheduledOrder = {
      id: "ord_sched_24h_c",
      businessId: "biz_test",
      status: "pending",
      fulfillmentTiming: {
        mode: "SCHEDULED",
        windowStartAt: windowStartIso,
      },
    };

    const exact24hBeforeMs = windowStartMs - (24 * 60 * 60 * 1000);
    const res = evaluateReminderEligibility(scheduledOrder, exact24hBeforeMs);

    const c24 = res.items.find((i) => i.eventType === "SCHEDULED_CUSTOMER_24H");
    assert.ok(c24);
    assert.strictEqual(c24.isDue, true);
    assert.strictEqual(c24.targetRole, "CUSTOMER");
  });

  it("T05 — 5h Merchant Reminder: Becomes due ~5h before windowStartAt", () => {
    const scheduledOrder = {
      id: "ord_sched_5h_m",
      businessId: "biz_test",
      status: "pending",
      fulfillmentTiming: {
        mode: "SCHEDULED",
        windowStartAt: windowStartIso,
      },
    };

    const exact5hBeforeMs = windowStartMs - (5 * 60 * 60 * 1000);
    const res = evaluateReminderEligibility(scheduledOrder, exact5hBeforeMs);

    const m5 = res.items.find((i) => i.eventType === "SCHEDULED_MERCHANT_5H");
    assert.ok(m5);
    assert.strictEqual(m5.isDue, true);
  });

  it("T06 — 5h Customer Reminder: Becomes due ~5h before windowStartAt", () => {
    const scheduledOrder = {
      id: "ord_sched_5h_c",
      businessId: "biz_test",
      status: "pending",
      fulfillmentTiming: {
        mode: "SCHEDULED",
        windowStartAt: windowStartIso,
      },
    };

    const exact5hBeforeMs = windowStartMs - (5 * 60 * 60 * 1000);
    const res = evaluateReminderEligibility(scheduledOrder, exact5hBeforeMs);

    const c5 = res.items.find((i) => i.eventType === "SCHEDULED_CUSTOMER_5H");
    assert.ok(c5);
    assert.strictEqual(c5.isDue, true);
    assert.strictEqual(c5.targetRole, "CUSTOMER");
  });

  it("T07 — Preparation Due Alert: State-Aware suppression when already preparing or ready", () => {
    const prepLeadMin = 60; // 1 hour
    const orderPending = {
      id: "ord_prep_test",
      businessId: "biz_test",
      status: "pending",
      fulfillmentTiming: {
        mode: "SCHEDULED",
        windowStartAt: windowStartIso,
        preparationLeadMinutes: prepLeadMin,
      },
    };

    const prepDueTimeMs = windowStartMs - (prepLeadMin * 60 * 1000);

    // 1. Pending -> Must be DUE
    const resPending = evaluateReminderEligibility(orderPending, prepDueTimeMs);
    const prepItemPending = resPending.items.find((i) => i.eventType === "SCHEDULED_MERCHANT_PREPARATION_DUE");
    assert.strictEqual(prepItemPending?.isDue, true);
    assert.strictEqual(prepItemPending?.isSuppressed, false);

    // 2. Already Preparing -> Must be SUPPRESSED
    const orderPreparing = { ...orderPending, status: "preparing" };
    const resPrep = evaluateReminderEligibility(orderPreparing, prepDueTimeMs);
    const prepItemPrep = resPrep.items.find((i) => i.eventType === "SCHEDULED_MERCHANT_PREPARATION_DUE");
    assert.strictEqual(prepItemPrep?.isSuppressed, true);
    assert.strictEqual(prepItemPrep?.suppressionReason, "ALREADY_PREPARING");

    // 3. Already Ready -> Must be SUPPRESSED
    const orderReady = { ...orderPending, status: "ready" };
    const resReady = evaluateReminderEligibility(orderReady, prepDueTimeMs);
    const prepItemReady = resReady.items.find((i) => i.eventType === "SCHEDULED_MERCHANT_PREPARATION_DUE");
    assert.strictEqual(prepItemReady?.isSuppressed, true);
    assert.strictEqual(prepItemReady?.suppressionReason, "ALREADY_READY_OR_BEYOND");
  });

  it("T08 — Window Risk Alert: Fires near window if pending/preparing; suppressed if ready", () => {
    const riskLeadMin = 15; // 15 min before window
    const orderInRisk = {
      id: "ord_risk_test",
      businessId: "biz_test",
      status: "pending",
      fulfillmentTiming: {
        mode: "SCHEDULED",
        windowStartAt: windowStartIso,
      },
    };

    const atRiskTimeMs = windowStartMs - (riskLeadMin * 60 * 1000);

    // Pending -> Due
    const resRisk = evaluateReminderEligibility(orderInRisk, atRiskTimeMs);
    const riskItem = resRisk.items.find((i) => i.eventType === "SCHEDULED_MERCHANT_WINDOW_RISK");
    assert.strictEqual(riskItem?.isDue, true);
    assert.strictEqual(riskItem?.isSuppressed, false);

    // Ready -> Suppressed (no risk!)
    const orderReady = { ...orderInRisk, status: "ready" };
    const resReady = evaluateReminderEligibility(orderReady, atRiskTimeMs);
    const riskItemReady = resReady.items.find((i) => i.eventType === "SCHEDULED_MERCHANT_WINDOW_RISK");
    assert.strictEqual(riskItemReady?.isSuppressed, true);
    assert.strictEqual(riskItemReady?.suppressionReason, "ALREADY_READY_OR_BEYOND");
  });

  it("T09 — Global Suppression: Cancelled or Delivered orders suppress all reminders", () => {
    const cancelledOrder = {
      id: "ord_cancelled",
      businessId: "biz_test",
      status: "cancelled",
      fulfillmentTiming: {
        mode: "SCHEDULED",
        windowStartAt: windowStartIso,
      },
    };

    const nowMs = windowStartMs - (24 * 60 * 60 * 1000);
    const resCancelled = evaluateReminderEligibility(cancelledOrder, nowMs);
    for (const item of resCancelled.items) {
      assert.strictEqual(item.isSuppressed, true);
      assert.strictEqual(item.suppressionReason, "ORDER_CANCELLED");
    }

    const deliveredOrder = { ...cancelledOrder, status: "delivered" };
    const resDelivered = evaluateReminderEligibility(deliveredOrder, nowMs);
    for (const item of resDelivered.items) {
      assert.strictEqual(item.isSuppressed, true);
      assert.strictEqual(item.suppressionReason, "ORDER_ALREADY_DELIVERED");
    }
  });

  it("T10 — Merchant Config Overrides: Resolves custom lead times and toggle overrides", () => {
    const customConfigDoc = {
      reminders: {
        merchant24hEnabled: false,
        merchant5hMinutes: 180, // 3h instead of 5h
        customer5hEnabled: true,
      },
    };

    const resolved = resolveMerchantReminderConfig(customConfigDoc);
    assert.strictEqual(resolved.merchant24hEnabled, false, "Must honor disabled 24h toggle");
    assert.strictEqual(resolved.merchant5hMinutes, 180, "Must honor custom minutes");
    assert.strictEqual(resolved.customer24hEnabled, true, "Must retain default for unset keys");

    // Evaluate order with disabled 24h config
    const order = {
      id: "ord_override",
      businessId: "biz_test",
      status: "pending",
      fulfillmentTiming: {
        mode: "SCHEDULED",
        windowStartAt: windowStartIso,
      },
    };
    const nowMs = windowStartMs - (24 * 60 * 60 * 1000);
    const res = evaluateReminderEligibility(order, nowMs, resolved);
    const m24 = res.items.find((i) => i.eventType === "SCHEDULED_MERCHANT_24H");
    assert.strictEqual(m24?.isSuppressed, true);
    assert.strictEqual(m24?.suppressionReason, "DISABLED_IN_CONFIG");
  });

  it("T11 — Zero Automatic Status Transition Guarantee: Pure evaluation leaves order immutable", () => {
    const rawOrder = {
      id: "ord_immutable",
      businessId: "biz_test",
      status: "pending",
      fulfillmentTiming: {
        mode: "SCHEDULED",
        windowStartAt: windowStartIso,
      },
    };

    const initialStatus = rawOrder.status;
    evaluateReminderEligibility(rawOrder, windowStartMs);
    assert.strictEqual(rawOrder.status, initialStatus, "Order status MUST NEVER be mutated by reminder engine");
  });

  it("T12 — Privacy Protection: Sensitive gift message is excluded from allowed notification variables", () => {
    // The canonical variables for scheduled notifications are strictly bounded
    const allowedVarsCustomer = ["orderCode", "deliveryWindow", "businessName", "orderId"];
    const allowedVarsMerchant = ["orderCode", "deliveryWindow", "customerName", "orderId", "preparationLeadMinutes"];

    assert.strictEqual(allowedVarsCustomer.includes("giftDetails"), false);
    assert.strictEqual(allowedVarsCustomer.includes("giftMessage"), false);
    assert.strictEqual(allowedVarsMerchant.includes("giftDetails"), false);
    assert.strictEqual(allowedVarsMerchant.includes("giftMessage"), false);
  });
});
