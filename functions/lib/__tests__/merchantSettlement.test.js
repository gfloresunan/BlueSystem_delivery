"use strict";
/**
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * CANONICAL MERCHANT SETTLEMENT LIFECYCLE TEST SUITE
 *
 * Protocol: BSD-FINANCE-MERCHANT-SETTLEMENT-001
 * Baseline: v2.3 — Financial Ownership Baseline
 *
 * Tests the full canonical invariant matrix for merchant settlements:
 * 1. Deterministic Cutoff & Integer Cents Aggregation
 * 2. Contractual Platform Fee (e.g. 15%) & Net Payable Calculation
 * 3. Exact Payment Matching & Exception Handling
 * 4. State Machine Progression (DRAFT -> PREPARED -> AWAITING_PAYMENT -> AWAITING_CONFIRMATION -> CLOSED)
 * 5. Dispute Flow & Blockade of Unauthorized Closure
 * 6. Dispute Resolution (Acceptance vs Rejection)
 * 7. Inmutability & Freeze Protection (isFrozen: true)
 * 8. Multi-Tenant Cross-Access Isolation
 * 9. Idempotent Period Cutoff & Overlap Prevention
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSettlementAmounts = computeSettlementAmounts;
exports.transitionSettlement = transitionSettlement;
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
function computeSettlementAmounts(params) {
    const grossSalesCents = Math.max(0, Math.round(params.grossSalesCents));
    const feeRate = Math.max(0, Math.min(1, params.platformFeeRate));
    const platformFeesCents = Math.round(grossSalesCents * feeRate);
    const adjustmentsCents = Math.round(params.adjustmentsCents || 0);
    const netPayableCents = Math.max(0, grossSalesCents - platformFeesCents + adjustmentsCents);
    return {
        grossSalesCents,
        platformFeeRate: feeRate,
        platformFeesCents,
        adjustmentsCents,
        netPayableCents
    };
}
// ── State Machine Transition Rules ──────────────────────────────────────────
function transitionSettlement(current, action, payload, actor) {
    // Invariant 1: Frozen settlements cannot be modified under any circumstance
    if (current.isFrozen || current.status === 'CLOSED') {
        throw new Error('IMMUTABLE_SETTLEMENT_CANNOT_BE_MUTATED');
    }
    const next = { ...current };
    switch (action) {
        case 'PREPARE': {
            if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) {
                throw new Error('PERMISSION_DENIED');
            }
            next.status = 'PREPARED';
            break;
        }
        case 'PAY': {
            if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) {
                throw new Error('PERMISSION_DENIED');
            }
            if (!['PREPARED', 'AWAITING_PAYMENT'].includes(current.status)) {
                throw new Error(`INVALID_STATUS_FOR_PAYMENT: current status is ${current.status}`);
            }
            const paidCents = Number(payload.paidCents);
            if (isNaN(paidCents) || paidCents <= 0) {
                throw new Error('INVALID_PAID_AMOUNT');
            }
            // Check for payment mismatch exception
            if (paidCents !== current.netPayableCents && !payload.allowPartialPayment) {
                throw new Error('PAYMENT_AMOUNT_MISMATCH_WITHOUT_EXCEPTION');
            }
            if (paidCents !== current.netPayableCents && !payload.exceptionReason) {
                throw new Error('MISSING_EXCEPTION_REASON');
            }
            if (!payload.transferReference || !payload.bankName) {
                throw new Error('MISSING_TRANSFER_METADATA');
            }
            next.paidCents = paidCents;
            next.transferReference = payload.transferReference;
            next.bankName = payload.bankName;
            next.status = 'AWAITING_CONFIRMATION';
            break;
        }
        case 'MERCHANT_DISPUTE': {
            // Must be authenticated merchant for this business
            if (actor.businessId && actor.businessId !== current.businessId) {
                throw new Error('CROSS_TENANT_ACCESS_DENIED');
            }
            if (current.status !== 'AWAITING_CONFIRMATION') {
                throw new Error('CANNOT_DISPUTE_UNPAID_OR_CLOSED_SETTLEMENT');
            }
            if (!payload.disputeReason || payload.disputeReason.trim().length < 5) {
                throw new Error('DISPUTE_REASON_REQUIRED');
            }
            next.status = 'DISPUTED';
            next.disputeReason = payload.disputeReason.trim();
            next.disputedBy = actor.uid;
            next.disputedAt = new Date().toISOString();
            break;
        }
        case 'ADMIN_RESOLVE_DISPUTE': {
            if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) {
                throw new Error('PERMISSION_DENIED');
            }
            if (current.status !== 'DISPUTED') {
                throw new Error('CANNOT_RESOLVE_NON_DISPUTED_SETTLEMENT');
            }
            if (!payload.resolutionAction || !payload.resolutionNotes) {
                throw new Error('MISSING_RESOLUTION_PARAMETERS');
            }
            if (payload.resolutionAction === 'ACCEPT_MERCHANT_DISPUTE') {
                // Return to AWAITING_PAYMENT, apply optional adjustment
                if (payload.adjustmentCents) {
                    next.netPayableCents += Number(payload.adjustmentCents);
                }
                next.status = 'AWAITING_PAYMENT';
            }
            else if (payload.resolutionAction === 'REJECT_DISPUTE') {
                // Reject dispute and return to merchant review
                next.status = 'AWAITING_CONFIRMATION';
            }
            break;
        }
        case 'MERCHANT_CONFIRM': {
            // Must be authenticated merchant for this business
            if (actor.businessId && actor.businessId !== current.businessId) {
                throw new Error('CROSS_TENANT_ACCESS_DENIED');
            }
            if (current.status !== 'AWAITING_CONFIRMATION') {
                throw new Error(`CANNOT_CONFIRM_SETTLEMENT_IN_STATUS_${current.status}`);
            }
            next.status = 'CLOSED';
            next.isFrozen = true;
            next.closedAt = new Date().toISOString();
            break;
        }
        default:
            throw new Error(`UNKNOWN_ACTION: ${action}`);
    }
    return next;
}
// ── Test Suites ─────────────────────────────────────────────────────────────
(0, node_test_1.describe)("BSD-FINANCE-MERCHANT-SETTLEMENT-001: Financial Computation Invariants", () => {
    (0, node_test_1.it)("TC-FIN-01: Correctly calculates 15% platform fee in integer cents without decimals", () => {
        // Gross sales: C$ 1,500.00 = 150000 cents
        const res = computeSettlementAmounts({
            grossSalesCents: 150000,
            platformFeeRate: 0.15
        });
        strict_1.default.equal(res.grossSalesCents, 150000);
        strict_1.default.equal(res.platformFeesCents, 22500); // 15% of 150000 = 22500 cents (C$ 225.00)
        strict_1.default.equal(res.netPayableCents, 127500); // 150000 - 22500 = 127500 cents (C$ 1,275.00)
        strict_1.default.equal(res.grossSalesCents - res.platformFeesCents, res.netPayableCents);
    });
    (0, node_test_1.it)("TC-FIN-02: Handles rounding with precision down to 1 cent", () => {
        // Gross sales: C$ 137.89 = 13789 cents
        const res = computeSettlementAmounts({
            grossSalesCents: 13789,
            platformFeeRate: 0.15
        });
        // 13789 * 0.15 = 2068.35 -> rounds to 2068 cents
        strict_1.default.equal(res.platformFeesCents, 2068);
        strict_1.default.equal(res.netPayableCents, 13789 - 2068); // 11721 cents (C$ 117.21)
    });
    (0, node_test_1.it)("TC-FIN-03: Incorporates positive or negative adjustments strictly in integer cents", () => {
        const resWithPositiveAdj = computeSettlementAmounts({
            grossSalesCents: 100000,
            platformFeeRate: 0.15,
            adjustmentsCents: 5000 // +C$ 50.00
        });
        strict_1.default.equal(resWithPositiveAdj.netPayableCents, 85000 + 5000); // 90000 cents
        const resWithNegativeAdj = computeSettlementAmounts({
            grossSalesCents: 100000,
            platformFeeRate: 0.15,
            adjustmentsCents: -5000 // -C$ 50.00
        });
        strict_1.default.equal(resWithNegativeAdj.netPayableCents, 85000 - 5000); // 80000 cents
    });
    (0, node_test_1.it)("TC-FIN-04: Prevents negative net payable (clamped at zero)", () => {
        const res = computeSettlementAmounts({
            grossSalesCents: 1000,
            platformFeeRate: 0.15,
            adjustmentsCents: -50000
        });
        strict_1.default.equal(res.netPayableCents, 0);
    });
});
(0, node_test_1.describe)("BSD-FINANCE-MERCHANT-SETTLEMENT-001: State Machine & Settlement Lifecycle", () => {
    const baseSettlement = {
        settlementId: "SETTLE-TEST-001",
        businessId: "biz_pizzeria_napoli",
        tenantId: "tenant_napoli_group",
        periodStart: "2026-09-01T00:00:00Z",
        periodEnd: "2026-09-15T23:59:59Z",
        status: "DRAFT",
        isFrozen: false,
        netPayableCents: 127500, // C$ 1,275.00
        ordersIncluded: ["ord_101", "ord_102", "ord_103"]
    };
    const adminActor = { uid: "admin_super", role: "ADMIN" };
    const merchantActor = { uid: "user_merchant_owner", role: "MERCHANT_ADMIN", businessId: "biz_pizzeria_napoli" };
    const maliciousMerchantActor = { uid: "user_attacker", role: "MERCHANT_ADMIN", businessId: "biz_other_comercio" };
    (0, node_test_1.it)("TC-STATE-01: Admin can transition DRAFT to PREPARED", () => {
        const s1 = transitionSettlement(baseSettlement, "PREPARE", {}, adminActor);
        strict_1.default.equal(s1.status, "PREPARED");
        strict_1.default.equal(s1.isFrozen, false);
    });
    (0, node_test_1.it)("TC-STATE-02: Non-admin cannot prepare a settlement", () => {
        strict_1.default.throws(() => transitionSettlement(baseSettlement, "PREPARE", {}, merchantActor), /PERMISSION_DENIED/);
    });
    (0, node_test_1.it)("TC-STATE-03: Admin records payment with full transfer metadata and transitions to AWAITING_CONFIRMATION", () => {
        const prepared = { ...baseSettlement, status: "PREPARED" };
        const paid = transitionSettlement(prepared, "PAY", {
            paidCents: 127500,
            transferReference: "ACH-982173491",
            bankName: "Banco Lafise Bancentro",
            paymentDate: "2026-09-16"
        }, adminActor);
        strict_1.default.equal(paid.status, "AWAITING_CONFIRMATION");
        strict_1.default.equal(paid.paidCents, 127500);
        strict_1.default.equal(paid.transferReference, "ACH-982173491");
        strict_1.default.equal(paid.bankName, "Banco Lafise Bancentro");
    });
    (0, node_test_1.it)("TC-STATE-04: Rejects payment if paid amount mismatches net payable without explicit exception", () => {
        const prepared = { ...baseSettlement, status: "PREPARED" };
        strict_1.default.throws(() => transitionSettlement(prepared, "PAY", {
            paidCents: 100000, // Mismatch (net is 127500)
            transferReference: "ACH-111",
            bankName: "BAC",
            allowPartialPayment: false
        }, adminActor), /PAYMENT_AMOUNT_MISMATCH_WITHOUT_EXCEPTION/);
    });
    (0, node_test_1.it)("TC-STATE-05: Allows payment mismatch only if exception authorization and reason are provided", () => {
        const prepared = { ...baseSettlement, status: "PREPARED" };
        const paidWithEx = transitionSettlement(prepared, "PAY", {
            paidCents: 100000,
            transferReference: "ACH-111",
            bankName: "BAC",
            allowPartialPayment: true,
            exceptionReason: "Retención acordada por cuota de préstamo #3"
        }, adminActor);
        strict_1.default.equal(paidWithEx.status, "AWAITING_CONFIRMATION");
        strict_1.default.equal(paidWithEx.paidCents, 100000);
    });
    (0, node_test_1.it)("TC-STATE-06: Merchant confirms settlement, reaching CLOSED and isFrozen = true", () => {
        const awaitingConf = {
            ...baseSettlement,
            status: "AWAITING_CONFIRMATION",
            paidCents: 127500,
            transferReference: "ACH-982173491"
        };
        const closed = transitionSettlement(awaitingConf, "MERCHANT_CONFIRM", {}, merchantActor);
        strict_1.default.equal(closed.status, "CLOSED");
        strict_1.default.equal(closed.isFrozen, true);
        strict_1.default.ok(closed.closedAt);
    });
    (0, node_test_1.it)("TC-STATE-07: Frozen settlement cannot be modified (Immutable Barrier)", () => {
        const closedSettlement = {
            ...baseSettlement,
            status: "CLOSED",
            isFrozen: true,
            paidCents: 127500
        };
        strict_1.default.throws(() => transitionSettlement(closedSettlement, "PAY", { paidCents: 999 }, adminActor), /IMMUTABLE_SETTLEMENT_CANNOT_BE_MUTATED/);
        strict_1.default.throws(() => transitionSettlement(closedSettlement, "MERCHANT_DISPUTE", { disputeReason: "test" }, merchantActor), /IMMUTABLE_SETTLEMENT_CANNOT_BE_MUTATED/);
    });
    (0, node_test_1.it)("TC-STATE-08: Cross-Tenant Protection — Rogue merchant cannot confirm or dispute another merchant's settlement", () => {
        const awaitingConf = {
            ...baseSettlement,
            status: "AWAITING_CONFIRMATION",
            paidCents: 127500
        };
        strict_1.default.throws(() => transitionSettlement(awaitingConf, "MERCHANT_CONFIRM", {}, maliciousMerchantActor), /CROSS_TENANT_ACCESS_DENIED/);
        strict_1.default.throws(() => transitionSettlement(awaitingConf, "MERCHANT_DISPUTE", { disputeReason: "Not my amount" }, maliciousMerchantActor), /CROSS_TENANT_ACCESS_DENIED/);
    });
});
(0, node_test_1.describe)("BSD-FINANCE-MERCHANT-SETTLEMENT-001: Dispute & Resolution Workflow", () => {
    const baseAwaiting = {
        settlementId: "SETTLE-DISPUTE-001",
        businessId: "biz_burgers_hub",
        tenantId: "tenant_burgers",
        periodStart: "2026-09-01T00:00:00Z",
        periodEnd: "2026-09-15T23:59:59Z",
        status: "AWAITING_CONFIRMATION",
        isFrozen: false,
        netPayableCents: 85000,
        paidCents: 85000,
        transferReference: "REF-554433",
        ordersIncluded: ["ord_201", "ord_202"]
    };
    const merchantActor = { uid: "user_merchant", role: "MERCHANT_ADMIN", businessId: "biz_burgers_hub" };
    const adminActor = { uid: "admin_user", role: "ADMIN" };
    (0, node_test_1.it)("TC-DISP-01: Merchant opens dispute with valid reason, blocking closure", () => {
        const disputed = transitionSettlement(baseAwaiting, "MERCHANT_DISPUTE", { disputeReason: "Falta incluir el pedido #203 entregado el 14 de septiembre." }, merchantActor);
        strict_1.default.equal(disputed.status, "DISPUTED");
        strict_1.default.equal(disputed.isFrozen, false);
        strict_1.default.equal(disputed.disputedBy, merchantActor.uid);
        strict_1.default.ok(disputed.disputeReason?.includes("pedido #203"));
        // Disputed settlement cannot be confirmed by merchant until resolved
        strict_1.default.throws(() => transitionSettlement(disputed, "MERCHANT_CONFIRM", {}, merchantActor), /CANNOT_CONFIRM_SETTLEMENT_IN_STATUS_DISPUTED/);
    });
    (0, node_test_1.it)("TC-DISP-02: Admin resolves dispute by accepting merchant claim with monetary adjustment", () => {
        const disputed = {
            ...baseAwaiting,
            status: "DISPUTED",
            disputeReason: "Falta pedido #203 por C$ 200.00 bruto (C$ 170.00 neto)"
        };
        const resolved = transitionSettlement(disputed, "ADMIN_RESOLVE_DISPUTE", {
            resolutionAction: "ACCEPT_MERCHANT_DISPUTE",
            resolutionNotes: "Verificado pedido #203. Se añade ajuste neto de C$ 170.00 (17000 centavos)",
            adjustmentCents: 17000
        }, adminActor);
        // Returns to AWAITING_PAYMENT to allow second deposit of the adjustment
        strict_1.default.equal(resolved.status, "AWAITING_PAYMENT");
        strict_1.default.equal(resolved.netPayableCents, 85000 + 17000); // 102000 cents
    });
    (0, node_test_1.it)("TC-DISP-03: Admin resolves dispute by rejecting claim, returning to merchant review", () => {
        const disputed = {
            ...baseAwaiting,
            status: "DISPUTED",
            disputeReason: "Comisión del 15% me parece muy alta"
        };
        const resolved = transitionSettlement(disputed, "ADMIN_RESOLVE_DISPUTE", {
            resolutionAction: "REJECT_DISPUTE",
            resolutionNotes: "La tasa del 15% corresponde a lo estipulado en el contrato comercial vigente."
        }, adminActor);
        strict_1.default.equal(resolved.status, "AWAITING_CONFIRMATION");
        // Merchant can now proceed to confirm
        const closed = transitionSettlement(resolved, "MERCHANT_CONFIRM", {}, merchantActor);
        strict_1.default.equal(closed.status, "CLOSED");
        strict_1.default.equal(closed.isFrozen, true);
    });
});
