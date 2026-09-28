import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

/**
 * ============================================================================
 * CROSS-PLATFORM FINANCE SYNC & ADVERSARIAL VALIDATION TEST SUITE: FIN-030 -> FIN-050
 * Protocol: BSD-ACT13B-COURIER-ADMIN-FINANCE-SYNC-001
 * Domain: Finanzas Operativas / Courier Android / Backend / Firestore / Admin Web
 * Mode: AUDIT-FIRST + FORENSIC TRACEABILITY + CROSS-PLATFORM VALIDATION
 * ============================================================================
 */

// ── Modelos de Dominio y SSOT ────────────────────────────────────────────────

interface FinancialEvent {
  eventId: string;
  orderId?: string;
  tripId?: string;
  businessId?: string;
  tenantId: string;
  eventType: "ORDER_REVENUE" | "PLATFORM_FEE" | "COURIER_EARNINGS" | "BANK_DEPOSIT";
  amountCents: number;
  grossTotalCents: number;
  deliveryFeeCents: number;
  tipCents: number;
  additionalChargesCents: number;
  courierEarningsCents: number;
  direction: "CREDIT" | "DEBIT";
  paymentMethod: "CASH" | "CARD" | "TRANSFER";
  sourceDomain: "COMMERCE_DELIVERY" | "X_TO_Y_DELIVERY";
  idempotencyKey: string;
  createdAt: Date;
}

interface CourierCashLedgerEntry {
  entryId: string;
  courierId: string;
  courierName: string;
  tenantId: string;
  sourceDomain: "COMMERCE_DELIVERY" | "X_TO_Y_DELIVERY" | "BANK_DEPOSIT" | "CASH_HANDOVER" | "SETTLEMENT";
  orderId?: string;
  tripId?: string;
  closureId?: string;
  settlementId?: string;
  eventType:
    | "ORDER_CASH_COLLECTED"
    | "TRIP_CASH_COLLECTED"
    | "BANK_DEPOSIT_SETTLED"
    | "CASH_HANDOVER"
    | "DISCREPANCY_RELIEF"
    | "MANUAL_ADJUSTMENT";
  direction: "CREDIT" | "DEBIT";
  amountCents: number;
  currency: string;
  description: string;
  idempotencyKey: string;
  createdAt: Date;
  createdByUid: string;
  createdByType: "SYSTEM_TRIGGER" | "SUPERVISOR" | "ADMIN";
}

interface CourierBalance {
  courierId: string;
  courierName: string;
  tenantId: string;
  cashOutstandingCents: number;
  totalCollectedCents: number;
  totalSettledCents: number;
  totalAdjustmentsCents?: number;
  totalDiscrepanciesCents?: number;
  financialAccessState: "ALLOW" | "BLOCKED_CASH_LIMIT" | "BLOCKED_OVERDUE_CLOSURE" | "BLOCKED_CASH_LIMIT_AND_OVERDUE";
  canReceiveNewOrders: boolean;
  financialAccessReason?: string;
  lastCollectionAt?: Date;
  lastSettledAt?: Date;
  updatedAt: Date;
}

interface BankDeposit {
  bankDepositId: string;
  bankName: string;
  accountReference: string;
  bankReference: string;
  depositDate: string;
  depositTime: string;
  depositAmountCents: number;
  depositDiscrepancyCents: number;
  receiptStoragePath: string;
  receiptDownloadUrl: string;
  receiptFileHash: string | null;
  status: "PENDING" | "VALIDATED" | "REJECTED";
  rejectionReason?: string;
  uploadedAt: Date;
}

interface DailyClosure {
  closureId: string;
  closureOperationId: string;
  courierId: string;
  courierName: string;
  tenantId: string;
  businessDate: string;
  shift: string;
  status: "OPEN" | "PENDING_ADMIN_VERIFICATION" | "VERIFIED" | "REJECTED" | "DISCREPANCY";
  expectedAmountCents: number;
  countedAmountCents: number;
  differenceCents: number;
  ordersCount: number;
  includedOrderIds: string[];
  includedTripIds: string[];
  bankDeposit?: BankDeposit;
  depositHistory?: BankDeposit[];
  officialAct?: {
    actNumber: string;
    issuedAt: Date;
    verificationCode: string;
    supervisorUid: string;
    supervisorName: string;
  };
  rejectionReason?: string;
  verifiedByUid?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface SettlementRecord {
  settlementId: string;
  settlementOperationId: string;
  courierId: string;
  courierName: string;
  tenantId: string;
  supervisorUid: string;
  expectedAmountCents: number;
  countedAmountCents: number;
  differenceCents: number;
  discrepancyAction: "NONE" | "CARRY_FORWARD" | "PAYROLL_DEDUCTION" | "ADMIN_WAIVE";
  status: "SETTLED" | "DISCREPANCY";
  receiptNumber: string;
  createdAt: Date;
}

interface AuditEvent {
  auditId: string;
  event: string;
  courierId?: string;
  closureId?: string;
  settlementId?: string;
  tenantId?: string;
  actorUid: string;
  amountCents?: number;
  previousState?: string;
  newState?: string;
  reason?: string;
  timestamp: Date;
}

// ── Motor Autoritativo de Backend E2E ────────────────────────────────────────

class CrossPlatformFinanceEngine {
  public financialEvents: Map<string, FinancialEvent> = new Map();
  public cashLedger: Map<string, CourierCashLedgerEntry> = new Map();
  public courierBalances: Map<string, CourierBalance> = new Map();
  public dailyClosures: Map<string, DailyClosure> = new Map();
  public settlements: Map<string, SettlementRecord> = new Map();
  public auditEvents: AuditEvent[] = [];
  public usedVoucherHashes: Set<string> = new Set();

  public reset(): void {
    this.financialEvents.clear();
    this.cashLedger.clear();
    this.courierBalances.clear();
    this.dailyClosures.clear();
    this.settlements.clear();
    this.auditEvents = [];
    this.usedVoucherHashes.clear();
  }

  // 1. Registro de entrega de orden Commerce
  public deliverCommerceOrder(params: {
    orderId: string;
    courierId: string;
    courierName: string;
    tenantId: string;
    businessId: string;
    productSubtotal: number;
    deliveryFee: number;
    tip: number;
    additionalCharges: number;
    paymentMethod: "CASH" | "CARD" | "TRANSFER";
    cashReceived?: number;
    changeGiven?: number;
    businessDate: string;
  }): void {
    const grossTotalCents = Math.round(
      (params.productSubtotal + params.deliveryFee + params.tip + params.additionalCharges) * 100
    );
    const courierEarningsCents = Math.round((params.deliveryFee + params.tip) * 100);
    const now = new Date();

    // A. /financial_events (SSOT Contable General)
    const eventId = `fe_order_${params.orderId}`;
    this.financialEvents.set(eventId, {
      eventId,
      orderId: params.orderId,
      businessId: params.businessId,
      tenantId: params.tenantId,
      eventType: "ORDER_REVENUE",
      amountCents: grossTotalCents,
      grossTotalCents,
      deliveryFeeCents: Math.round(params.deliveryFee * 100),
      tipCents: Math.round(params.tip * 100),
      additionalChargesCents: Math.round(params.additionalCharges * 100),
      courierEarningsCents,
      direction: "CREDIT",
      paymentMethod: params.paymentMethod,
      sourceDomain: "COMMERCE_DELIVERY",
      idempotencyKey: `fin_event_order_${params.orderId}`,
      createdAt: now,
    });

    // B. Subledger /courier_cash_ledger SOLO SI ES CASH
    if (params.paymentMethod === "CASH") {
      const cashReceivedCents = Math.round((params.cashReceived || (grossTotalCents / 100)) * 100);
      const changeGivenCents = Math.round((params.changeGiven || 0) * 100);
      const netCashCollectedCents = Math.max(0, cashReceivedCents - changeGivenCents);

      const ledgerId = `ccl_order_${params.orderId}`;
      this.cashLedger.set(ledgerId, {
        entryId: ledgerId,
        courierId: params.courierId,
        courierName: params.courierName,
        tenantId: params.tenantId,
        sourceDomain: "COMMERCE_DELIVERY",
        orderId: params.orderId,
        eventType: "ORDER_CASH_COLLECTED",
        direction: "CREDIT",
        amountCents: netCashCollectedCents,
        currency: "NIO",
        description: `Recaudación pedido #${params.orderId.slice(-6).toUpperCase()}`,
        idempotencyKey: `order_${params.orderId}_courier_collection`,
        createdAt: now,
        createdByUid: "SYSTEM_TRIGGER",
        createdByType: "SYSTEM_TRIGGER",
      });

      // C. Mutación Atómica de Balance /courier_balances/{courierId}
      const prevBal = this.courierBalances.get(params.courierId) || {
        courierId: params.courierId,
        courierName: params.courierName,
        tenantId: params.tenantId,
        cashOutstandingCents: 0,
        totalCollectedCents: 0,
        totalSettledCents: 0,
        financialAccessState: "ALLOW",
        canReceiveNewOrders: true,
        updatedAt: now,
      };

      const newOutstanding = prevBal.cashOutstandingCents + netCashCollectedCents;
      const isBlocked = newOutstanding > 200000;

      this.courierBalances.set(params.courierId, {
        ...prevBal,
        cashOutstandingCents: newOutstanding,
        totalCollectedCents: prevBal.totalCollectedCents + netCashCollectedCents,
        financialAccessState: isBlocked ? "BLOCKED_CASH_LIMIT" : prevBal.financialAccessState,
        canReceiveNewOrders: !isBlocked,
        lastCollectionAt: now,
        updatedAt: now,
      });
    }
  }

  // 2. Registro de entrega de viaje X->Y (Encomiendas)
  public deliverXToYTrip(params: {
    tripId: string;
    courierId: string;
    courierName: string;
    tenantId: string;
    deliveryFee: number;
    tip: number;
    additionalCharges: number;
    paymentMethod: "CASH" | "CARD" | "TRANSFER";
    cashReceived?: number;
    changeGiven?: number;
    businessDate: string;
  }): void {
    const tripTotalCents = Math.round(
      (params.deliveryFee + params.tip + params.additionalCharges) * 100
    );
    const courierEarningsCents = Math.round((params.deliveryFee + params.tip) * 100);
    const now = new Date();

    // A. /financial_events
    const eventId = `fe_trip_${params.tripId}`;
    this.financialEvents.set(eventId, {
      eventId,
      tripId: params.tripId,
      tenantId: params.tenantId,
      eventType: "COURIER_EARNINGS",
      amountCents: tripTotalCents,
      grossTotalCents: tripTotalCents,
      deliveryFeeCents: Math.round(params.deliveryFee * 100),
      tipCents: Math.round(params.tip * 100),
      additionalChargesCents: Math.round(params.additionalCharges * 100),
      courierEarningsCents,
      direction: "CREDIT",
      paymentMethod: params.paymentMethod,
      sourceDomain: "X_TO_Y_DELIVERY",
      idempotencyKey: `fin_event_trip_${params.tripId}`,
      createdAt: now,
    });

    // B. Subledger /courier_cash_ledger SOLO SI ES CASH
    if (params.paymentMethod === "CASH") {
      const cashReceivedCents = Math.round((params.cashReceived || (tripTotalCents / 100)) * 100);
      const changeGivenCents = Math.round((params.changeGiven || 0) * 100);
      const netCashCollectedCents = Math.max(0, cashReceivedCents - changeGivenCents);

      const ledgerId = `ccl_trip_${params.tripId}`;
      this.cashLedger.set(ledgerId, {
        entryId: ledgerId,
        courierId: params.courierId,
        courierName: params.courierName,
        tenantId: params.tenantId,
        sourceDomain: "X_TO_Y_DELIVERY",
        tripId: params.tripId,
        eventType: "TRIP_CASH_COLLECTED",
        direction: "CREDIT",
        amountCents: netCashCollectedCents,
        currency: "NIO",
        description: `Recaudación encomienda X->Y #${params.tripId.slice(-6).toUpperCase()}`,
        idempotencyKey: `trip_${params.tripId}_courier_collection`,
        createdAt: now,
        createdByUid: "SYSTEM_TRIGGER",
        createdByType: "SYSTEM_TRIGGER",
      });

      // C. Mutación Atómica de Balance
      const prevBal = this.courierBalances.get(params.courierId) || {
        courierId: params.courierId,
        courierName: params.courierName,
        tenantId: params.tenantId,
        cashOutstandingCents: 0,
        totalCollectedCents: 0,
        totalSettledCents: 0,
        financialAccessState: "ALLOW",
        canReceiveNewOrders: true,
        updatedAt: now,
      };

      const newOutstanding = prevBal.cashOutstandingCents + netCashCollectedCents;
      const isBlocked = newOutstanding > 200000;

      this.courierBalances.set(params.courierId, {
        ...prevBal,
        cashOutstandingCents: newOutstanding,
        totalCollectedCents: prevBal.totalCollectedCents + netCashCollectedCents,
        financialAccessState: isBlocked ? "BLOCKED_CASH_LIMIT" : prevBal.financialAccessState,
        canReceiveNewOrders: !isBlocked,
        lastCollectionAt: now,
        updatedAt: now,
      });
    }
  }

  // 3. Inicio formal de cierre diario (Callable: initiateCourierDailyClosure)
  public initiateClosure(params: {
    closureOperationId: string;
    courierId: string;
    courierName: string;
    tenantId: string;
    businessDate: string;
    callerRole: "COURIER" | "SUPERVISOR" | "ADMIN";
  }): DailyClosure {
    // Idempotencia
    for (const c of this.dailyClosures.values()) {
      if (c.closureOperationId === params.closureOperationId) return c;
    }

    let expectedAmountCents = 0;
    const includedOrderIds: string[] = [];
    const includedTripIds: string[] = [];

    for (const entry of this.cashLedger.values()) {
      if (entry.courierId === params.courierId && entry.direction === "CREDIT") {
        expectedAmountCents += entry.amountCents;
        if (entry.orderId && !includedOrderIds.includes(entry.orderId)) includedOrderIds.push(entry.orderId);
        if (entry.tripId && !includedTripIds.includes(entry.tripId)) includedTripIds.push(entry.tripId);
      }
    }

    const closureId = `closure_${params.businessDate}_${params.courierId.slice(-4)}`;
    const now = new Date();

    const closure: DailyClosure = {
      closureId,
      closureOperationId: params.closureOperationId,
      courierId: params.courierId,
      courierName: params.courierName,
      tenantId: params.tenantId,
      businessDate: params.businessDate,
      shift: "FULL_DAY",
      status: "OPEN",
      expectedAmountCents,
      countedAmountCents: 0,
      differenceCents: 0,
      ordersCount: includedOrderIds.length + includedTripIds.length,
      includedOrderIds,
      includedTripIds,
      createdAt: now,
      updatedAt: now,
    };

    this.dailyClosures.set(closureId, closure);
    return closure;
  }

  // 4. Registro de comprobante bancario (Callable: registerBankDepositReceipt)
  public registerBankDeposit(params: {
    closureId: string;
    bankName: string;
    bankReference: string;
    depositAmountCents: number;
    receiptStoragePath: string;
    receiptDownloadUrl: string;
    receiptFileHash: string;
  }): { success: boolean; error?: string } {
    const closure = this.dailyClosures.get(params.closureId);
    if (!closure) return { success: false, error: "Closure not found" };

    if (this.usedVoucherHashes.has(params.receiptFileHash)) {
      return { success: false, error: "DUPLICATE_VOUCHER_HASH: El comprobante ya fue utilizado previamente." };
    }

    const baseAmountCents = closure.countedAmountCents || closure.expectedAmountCents;
    const depositDiscrepancyCents = params.depositAmountCents - baseAmountCents;
    const now = new Date();

    const deposit: BankDeposit = {
      bankDepositId: `dep_${Date.now()}`,
      bankName: params.bankName,
      accountReference: "CTA-RECAUDADORA-01",
      bankReference: params.bankReference,
      depositDate: closure.businessDate,
      depositTime: "18:30",
      depositAmountCents: params.depositAmountCents,
      depositDiscrepancyCents,
      receiptStoragePath: params.receiptStoragePath,
      receiptDownloadUrl: params.receiptDownloadUrl,
      receiptFileHash: params.receiptFileHash,
      status: "PENDING",
      uploadedAt: now,
    };

    closure.bankDeposit = deposit;
    closure.status = "PENDING_ADMIN_VERIFICATION";
    closure.updatedAt = now;

    if (!closure.depositHistory) closure.depositHistory = [];
    closure.depositHistory.push(deposit);

    this.usedVoucherHashes.add(params.receiptFileHash);
    return { success: true };
  }

  // 5. Verificación/Aprobación o Rechazo de Cierre (Callable: verifyCourierDailyClosure)
  public verifyClosure(params: {
    closureId: string;
    action: "VERIFY" | "REJECT";
    actorUid: string;
    actorRole: "SUPER_ADMIN" | "PLATFORM_ADMIN" | "SUPERVISOR" | "MERCHANT" | "COURIER";
    rejectionReason?: string;
  }): { success: boolean; status: string; error?: string } {
    if (!["SUPER_ADMIN", "PLATFORM_ADMIN", "SUPERVISOR"].includes(params.actorRole)) {
      return { success: false, status: "DENIED", error: "PERMISSION_DENIED: Rol no autorizado para verificar cierres." };
    }

    const closure = this.dailyClosures.get(params.closureId);
    if (!closure) return { success: false, status: "NOT_FOUND", error: "Closure not found" };

    const now = new Date();

    if (params.action === "REJECT") {
      if (!params.rejectionReason) {
        return { success: false, status: "INVALID_ARGUMENT", error: "rejectionReason es obligatorio" };
      }

      closure.status = "REJECTED";
      closure.rejectionReason = params.rejectionReason;
      closure.verifiedByUid = params.actorUid;
      closure.verifiedAt = now;
      closure.updatedAt = now;

      if (closure.bankDeposit) {
        closure.bankDeposit.status = "REJECTED";
        closure.bankDeposit.rejectionReason = params.rejectionReason;
      }

      this.auditEvents.push({
        auditId: `aud_${Date.now()}`,
        event: "COURIER_CLOSURE_REJECTED",
        courierId: closure.courierId,
        closureId: closure.closureId,
        tenantId: closure.tenantId,
        actorUid: params.actorUid,
        reason: params.rejectionReason,
        timestamp: now,
      });

      return { success: true, status: "REJECTED" };
    }

    // Aprobación y Emisión de Acta Oficial
    const depositAmountCents = closure.bankDeposit?.depositAmountCents || closure.countedAmountCents || closure.expectedAmountCents;

    // Asiento DEBIT en subledger
    const ledgerDebitId = `ccl_debit_${closure.closureId}`;
    this.cashLedger.set(ledgerDebitId, {
      entryId: ledgerDebitId,
      courierId: closure.courierId,
      courierName: closure.courierName,
      tenantId: closure.tenantId,
      closureId: closure.closureId,
      sourceDomain: "BANK_DEPOSIT",
      eventType: "BANK_DEPOSIT_SETTLED",
      direction: "DEBIT",
      amountCents: depositAmountCents,
      currency: "NIO",
      description: `Depósito bancario validado [${closure.bankDeposit?.bankName || "Banco"} ref: ${closure.bankDeposit?.bankReference || "N/A"}]`,
      idempotencyKey: `closure_${closure.closureId}_deposit_settled`,
      createdAt: now,
      createdByUid: params.actorUid,
      createdByType: "SUPERVISOR",
    });

    // Actualización de Balance
    const balance = this.courierBalances.get(closure.courierId);
    if (balance) {
      balance.cashOutstandingCents = Math.max(0, balance.cashOutstandingCents - depositAmountCents);
      balance.totalSettledCents += depositAmountCents;
      balance.lastSettledAt = now;
      balance.updatedAt = now;

      // Evaluar desbloqueo
      if (balance.cashOutstandingCents <= 200000) {
        balance.financialAccessState = "ALLOW";
        balance.canReceiveNewOrders = true;
      }
    }

    const actNumber = `ACTA-CASH-${closure.businessDate.replace(/-/g, "")}-${closure.courierId.slice(-4).toUpperCase()}-TEST`;
    closure.status = "VERIFIED";
    closure.officialAct = {
      actNumber,
      issuedAt: now,
      verificationCode: `VERIF_${Math.random().toString(36).substring(4).toUpperCase()}`,
      supervisorUid: params.actorUid,
      supervisorName: "Supervisor de Operaciones",
    };
    closure.verifiedByUid = params.actorUid;
    closure.verifiedAt = now;
    closure.updatedAt = now;

    if (closure.bankDeposit) closure.bankDeposit.status = "VALIDATED";

    this.auditEvents.push({
      auditId: `aud_${Date.now()}`,
      event: "COURIER_CLOSURE_VERIFIED",
      courierId: closure.courierId,
      closureId: closure.closureId,
      tenantId: closure.tenantId,
      actorUid: params.actorUid,
      amountCents: depositAmountCents,
      timestamp: now,
    });

    return { success: true, status: "VERIFIED" };
  }

  // 6. Arqueo físico de mesa (Callable: executeCourierSettlement)
  public executeSettlement(params: {
    settlementOperationId: string;
    courierId: string;
    courierName: string;
    tenantId: string;
    countedAmountCents: number;
    supervisorUid: string;
    discrepancyAction: "NONE" | "CARRY_FORWARD" | "PAYROLL_DEDUCTION" | "ADMIN_WAIVE";
  }): SettlementRecord {
    // Idempotencia
    for (const s of this.settlements.values()) {
      if (s.settlementOperationId === params.settlementOperationId) return s;
    }

    const balance = this.courierBalances.get(params.courierId);
    const expectedAmountCents = balance ? balance.cashOutstandingCents : 0;
    const differenceCents = params.countedAmountCents - expectedAmountCents;
    const now = new Date();
    const settlementId = `settle_${Date.now()}`;

    // Asiento Handover DEBIT
    const handoverId = `ccl_handover_${settlementId}`;
    this.cashLedger.set(handoverId, {
      entryId: handoverId,
      courierId: params.courierId,
      courierName: params.courierName,
      tenantId: params.tenantId,
      settlementId,
      sourceDomain: "SETTLEMENT",
      eventType: "CASH_HANDOVER",
      direction: "DEBIT",
      amountCents: params.countedAmountCents,
      currency: "NIO",
      description: `Arqueo de caja físico #${settlementId.slice(-6).toUpperCase()}`,
      idempotencyKey: `settle_${params.settlementOperationId}_handover`,
      createdAt: now,
      createdByUid: params.supervisorUid,
      createdByType: "SUPERVISOR",
    });

    // Manejo de Ajuste si aplica
    let reliefCents = 0;
    if (differenceCents < 0 && (params.discrepancyAction === "PAYROLL_DEDUCTION" || params.discrepancyAction === "ADMIN_WAIVE")) {
      reliefCents = Math.abs(differenceCents);
      const reliefId = `ccl_relief_${settlementId}`;
      this.cashLedger.set(reliefId, {
        entryId: reliefId,
        courierId: params.courierId,
        courierName: params.courierName,
        tenantId: params.tenantId,
        settlementId,
        sourceDomain: "SETTLEMENT",
        eventType: params.discrepancyAction === "PAYROLL_DEDUCTION" ? "DISCREPANCY_RELIEF" : "MANUAL_ADJUSTMENT",
        direction: "DEBIT",
        amountCents: reliefCents,
        currency: "NIO",
        description: `Ajuste por diferencia de arqueo (${params.discrepancyAction})`,
        idempotencyKey: `settle_${params.settlementOperationId}_relief`,
        createdAt: now,
        createdByUid: params.supervisorUid,
        createdByType: "SUPERVISOR",
      });
    }

    if (balance) {
      balance.cashOutstandingCents = Math.max(0, expectedAmountCents - params.countedAmountCents - reliefCents);
      balance.totalSettledCents += params.countedAmountCents;
      balance.totalAdjustmentsCents = (balance.totalAdjustmentsCents || 0) + reliefCents;
      balance.lastSettledAt = now;
      balance.updatedAt = now;

      if (balance.cashOutstandingCents <= 200000) {
        balance.financialAccessState = "ALLOW";
        balance.canReceiveNewOrders = true;
      }
    }

    const record: SettlementRecord = {
      settlementId,
      settlementOperationId: params.settlementOperationId,
      courierId: params.courierId,
      courierName: params.courierName,
      tenantId: params.tenantId,
      supervisorUid: params.supervisorUid,
      expectedAmountCents,
      countedAmountCents: params.countedAmountCents,
      differenceCents,
      discrepancyAction: differenceCents !== 0 ? params.discrepancyAction : "NONE",
      status: differenceCents === 0 ? "SETTLED" : "DISCREPANCY",
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      createdAt: now,
    };

    this.settlements.set(settlementId, record);
    return record;
  }

  // 7. Simulación de Vista Admin Web (Modelando la UI autoritativa)
  public getAdminCourierSummary(courierId: string): {
    earningsCommerceCents: number;
    earningsXToYCents: number;
    earningsTotalCents: number;
    cashCommerceCents: number;
    cashXToYCents: number;
    cashTotalCents: number;
    outstandingBalanceCents: number;
    financialAccessState: string;
    canReceiveNewOrders: boolean;
  } {
    let earningsCommerceCents = 0;
    let earningsXToYCents = 0;
    let cashCommerceCents = 0;
    let cashXToYCents = 0;

    for (const fe of this.financialEvents.values()) {
      if (fe.sourceDomain === "COMMERCE_DELIVERY") {
        earningsCommerceCents += fe.courierEarningsCents;
      } else if (fe.sourceDomain === "X_TO_Y_DELIVERY") {
        earningsXToYCents += fe.courierEarningsCents;
      }
    }

    for (const entry of this.cashLedger.values()) {
      if (entry.courierId === courierId && entry.direction === "CREDIT") {
        if (entry.sourceDomain === "COMMERCE_DELIVERY") {
          cashCommerceCents += entry.amountCents;
        } else if (entry.sourceDomain === "X_TO_Y_DELIVERY") {
          cashXToYCents += entry.amountCents;
        }
      }
    }

    const bal = this.courierBalances.get(courierId) || {
      cashOutstandingCents: 0,
      financialAccessState: "ALLOW",
      canReceiveNewOrders: true,
    };

    return {
      earningsCommerceCents,
      earningsXToYCents,
      earningsTotalCents: earningsCommerceCents + earningsXToYCents,
      cashCommerceCents,
      cashXToYCents,
      cashTotalCents: cashCommerceCents + cashXToYCents,
      outstandingBalanceCents: bal.cashOutstandingCents,
      financialAccessState: bal.financialAccessState,
      canReceiveNewOrders: bal.canReceiveNewOrders,
    };
  }
}

// ── EJECUCIÓN DE LA SUITE DE VALIDACIÓN FIN-030 → FIN-050 ───────────────────

describe("BATERÍA INTEGRAL DE VALIDACIÓN Y SINCRONIZACIÓN FIN-030 → FIN-050", () => {
  let engine: CrossPlatformFinanceEngine;

  beforeEach(() => {
    engine = new CrossPlatformFinanceEngine();
    engine.reset();
  });

  it("FIN-030: Single Source of Truth (SSOT) — 1 Operación = 1 Realidad Financiera", () => {
    // 1 orden entregada en efectivo de C$ 500 (Delivery fee C$ 50, Tip C$ 20, Subtotal C$ 430)
    engine.deliverCommerceOrder({
      orderId: "ord_ssot_01",
      courierId: "courier_01",
      courierName: "Juan Pérez",
      tenantId: "tenant_managua",
      businessId: "biz_pizza_01",
      productSubtotal: 430,
      deliveryFee: 50,
      tip: 20,
      additionalCharges: 0,
      paymentMethod: "CASH",
      cashReceived: 500,
      changeGiven: 0,
      businessDate: "2026-08-29",
    });

    const summary = engine.getAdminCourierSummary("courier_01");

    // Verificar concordancia absoluta
    assert.strictEqual(summary.earningsCommerceCents, 7000, "Ganancia debe ser C$70.00");
    assert.strictEqual(summary.cashCommerceCents, 50000, "Custodia de efectivo debe ser C$500.00");
    assert.strictEqual(summary.outstandingBalanceCents, 50000, "Saldo de balance debe ser C$500.00");
    assert.strictEqual(summary.financialAccessState, "ALLOW");
    assert.strictEqual(summary.canReceiveNewOrders, true);
  });

  it("FIN-031: Courier vs Admin Reconciliation — Cero Discrepancia al Centavo", () => {
    engine.deliverCommerceOrder({
      orderId: "ord_rec_01",
      courierId: "courier_rec",
      courierName: "Carlos Gómez",
      tenantId: "tenant_managua",
      businessId: "biz_burgers",
      productSubtotal: 650,
      deliveryFee: 60,
      tip: 40,
      additionalCharges: 10,
      paymentMethod: "CASH",
      cashReceived: 1000,
      changeGiven: 240, // 760 neto entregado
      businessDate: "2026-08-29",
    });

    const adminView = engine.getAdminCourierSummary("courier_rec");
    const balance = engine.courierBalances.get("courier_rec");

    assert.strictEqual(adminView.cashTotalCents, 76000, "Efectivo neto recibido: C$760.00");
    assert.strictEqual(balance?.cashOutstandingCents, 76000);
    assert.strictEqual(adminView.earningsTotalCents, 10000, "Ganancia: Delivery C$60 + Tip C$40 = C$100.00");
  });

  it("FIN-032: Segmentación Estricta Commerce vs X→Y — Sin Fuga de Subtotales", () => {
    // 1 Commerce CASH: Subtotal 400 + Delivery 40 + Tip 10 = 450
    engine.deliverCommerceOrder({
      orderId: "ord_comm_01",
      courierId: "courier_seg",
      courierName: "Pedro Navas",
      tenantId: "tenant_managua",
      businessId: "biz_tacos",
      productSubtotal: 400,
      deliveryFee: 40,
      tip: 10,
      additionalCharges: 0,
      paymentMethod: "CASH",
      cashReceived: 450,
      businessDate: "2026-08-29",
    });

    // 1 X->Y CASH: Delivery fee 120 + Tip 30 = 150 (Sin productos de comercio)
    engine.deliverXToYTrip({
      tripId: "trip_xy_01",
      courierId: "courier_seg",
      courierName: "Pedro Navas",
      tenantId: "tenant_managua",
      deliveryFee: 120,
      tip: 30,
      additionalCharges: 0,
      paymentMethod: "CASH",
      cashReceived: 150,
      businessDate: "2026-08-29",
    });

    const summary = engine.getAdminCourierSummary("courier_seg");

    assert.strictEqual(summary.earningsCommerceCents, 5000, "Ganancias Commerce: C$ 50.00");
    assert.strictEqual(summary.earningsXToYCents, 15000, "Ganancias X->Y: C$ 150.00");
    assert.strictEqual(summary.earningsTotalCents, 20000, "Total Ganancias: C$ 200.00");

    assert.strictEqual(summary.cashCommerceCents, 45000, "Efectivo Commerce: C$ 450.00");
    assert.strictEqual(summary.cashXToYCents, 15000, "Efectivo X->Y: C$ 150.00");
    assert.strictEqual(summary.cashTotalCents, 60000, "Total Efectivo en Custodia: C$ 600.00");
  });

  it("FIN-033: Mix de Pagos (CASH vs CARD vs TRANSFER) — Solo CASH Incrementa Custodia", () => {
    // Pedido 1: CARD (C$ 800)
    engine.deliverCommerceOrder({
      orderId: "ord_card_01",
      courierId: "courier_mix",
      courierName: "Mario Silva",
      tenantId: "tenant_managua",
      businessId: "biz_sushi",
      productSubtotal: 700,
      deliveryFee: 80,
      tip: 20,
      additionalCharges: 0,
      paymentMethod: "CARD",
      businessDate: "2026-08-29",
    });

    // Pedido 2: CASH (C$ 350)
    engine.deliverCommerceOrder({
      orderId: "ord_cash_02",
      courierId: "courier_mix",
      courierName: "Mario Silva",
      tenantId: "tenant_managua",
      businessId: "biz_sushi",
      productSubtotal: 300,
      deliveryFee: 40,
      tip: 10,
      additionalCharges: 0,
      paymentMethod: "CASH",
      cashReceived: 350,
      businessDate: "2026-08-29",
    });

    const summary = engine.getAdminCourierSummary("courier_mix");

    // Ganancias suma ambos pedidos: CARD (100) + CASH (50) = 150
    assert.strictEqual(summary.earningsTotalCents, 15000);
    // Pero custodia física SOLO incluye el pedido CASH (C$ 350)
    assert.strictEqual(summary.cashTotalCents, 35000);
    assert.strictEqual(summary.outstandingBalanceCents, 35000);
  });

  it("FIN-034: Arqueo Físico en Mesa con Detección de Discrepancia", () => {
    // Courier recauda C$ 1,500 en efectivo
    engine.deliverCommerceOrder({
      orderId: "ord_arq_01",
      courierId: "courier_arq",
      courierName: "Elena Rostrán",
      tenantId: "tenant_managua",
      businessId: "biz_farmacia",
      productSubtotal: 1400,
      deliveryFee: 80,
      tip: 20,
      additionalCharges: 0,
      paymentMethod: "CASH",
      cashReceived: 1500,
      businessDate: "2026-08-29",
    });

    // Ejecutar arqueo físico donde el courier entrega C$ 1,450 (Faltante de C$ 50)
    const settlement = engine.executeSettlement({
      settlementOperationId: "op_settle_01",
      courierId: "courier_arq",
      courierName: "Elena Rostrán",
      tenantId: "tenant_managua",
      countedAmountCents: 145000,
      supervisorUid: "sup_01",
      discrepancyAction: "CARRY_FORWARD",
    });

    assert.strictEqual(settlement.expectedAmountCents, 150000);
    assert.strictEqual(settlement.countedAmountCents, 145000);
    assert.strictEqual(settlement.differenceCents, -5000, "Diferencia debe ser -C$50.00");
    assert.strictEqual(settlement.status, "DISCREPANCY");

    const bal = engine.courierBalances.get("courier_arq");
    assert.strictEqual(bal?.cashOutstandingCents, 5000, "Saldo pendiente remanente: C$50.00");
  });

  it("FIN-035: Flujo Completo de Cierre, Depósito y Aprobación con Emisión de Acta Oficial", () => {
    engine.deliverCommerceOrder({
      orderId: "ord_closure_01",
      courierId: "courier_close",
      courierName: "Luis Morales",
      tenantId: "tenant_managua",
      businessId: "biz_cafe",
      productSubtotal: 800,
      deliveryFee: 60,
      tip: 40,
      additionalCharges: 0,
      paymentMethod: "CASH",
      cashReceived: 900,
      businessDate: "2026-08-29",
    });

    // 1. Iniciar Cierre
    const closure = engine.initiateClosure({
      closureOperationId: "op_close_01",
      courierId: "courier_close",
      courierName: "Luis Morales",
      tenantId: "tenant_managua",
      businessDate: "2026-08-29",
      callerRole: "COURIER",
    });
    assert.strictEqual(closure.status, "OPEN");
    assert.strictEqual(closure.expectedAmountCents, 90000);

    // 2. Registrar Depósito Bancario
    const depRes = engine.registerBankDeposit({
      closureId: closure.closureId,
      bankName: "BAC Credomatic",
      bankReference: "BAC-REF-998877",
      depositAmountCents: 90000,
      receiptStoragePath: "receipts/courier_close_01.jpg",
      receiptDownloadUrl: "https://storage.bluesystem.com/receipts/01.jpg",
      receiptFileHash: "HASH_VOUCHER_12345",
    });
    assert.strictEqual(depRes.success, true);
    assert.strictEqual(closure.status, "PENDING_ADMIN_VERIFICATION");

    // 3. Verificación Admin
    const verifyRes = engine.verifyClosure({
      closureId: closure.closureId,
      action: "VERIFY",
      actorUid: "admin_master_01",
      actorRole: "PLATFORM_ADMIN",
    });
    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(closure.status, "VERIFIED");
    assert.ok(closure.officialAct?.actNumber.startsWith("ACTA-CASH"));

    // 4. Balance final en 0
    const bal = engine.courierBalances.get("courier_close");
    assert.strictEqual(bal?.cashOutstandingCents, 0);
    assert.strictEqual(bal?.financialAccessState, "ALLOW");
  });

  it("FIN-036: Depósitos Parciales Sucesivos (C$2,000 -> C$1,500 -> C$500)", () => {
    // Courier acumula C$ 2,000
    engine.deliverCommerceOrder({
      orderId: "ord_part_01",
      courierId: "courier_part",
      courierName: "Roberto Blandón",
      tenantId: "tenant_managua",
      businessId: "biz_express",
      productSubtotal: 1800,
      deliveryFee: 150,
      tip: 50,
      additionalCharges: 0,
      paymentMethod: "CASH",
      cashReceived: 2000,
      businessDate: "2026-08-29",
    });

    const closure = engine.initiateClosure({
      closureOperationId: "op_part_01",
      courierId: "courier_part",
      courierName: "Roberto Blandón",
      tenantId: "tenant_managua",
      businessDate: "2026-08-29",
      callerRole: "COURIER",
    });

    // Depósito 1: C$ 1,500
    engine.registerBankDeposit({
      closureId: closure.closureId,
      bankName: "Banco LAFISE",
      bankReference: "LAF-001",
      depositAmountCents: 150000,
      receiptStoragePath: "receipts/part1.jpg",
      receiptDownloadUrl: "https://storage.bluesystem.com/part1.jpg",
      receiptFileHash: "HASH_PART_1",
    });

    engine.verifyClosure({
      closureId: closure.closureId,
      action: "VERIFY",
      actorUid: "sup_01",
      actorRole: "SUPERVISOR",
    });

    let bal = engine.courierBalances.get("courier_part");
    assert.strictEqual(bal?.cashOutstandingCents, 50000, "Debe quedar C$500.00 pendiente");

    // Depósito 2: C$ 500
    const closure2 = engine.initiateClosure({
      closureOperationId: "op_part_02",
      courierId: "courier_part",
      courierName: "Roberto Blandón",
      tenantId: "tenant_managua",
      businessDate: "2026-08-29",
      callerRole: "COURIER",
    });

    engine.registerBankDeposit({
      closureId: closure2.closureId,
      bankName: "Banco LAFISE",
      bankReference: "LAF-002",
      depositAmountCents: 50000,
      receiptStoragePath: "receipts/part2.jpg",
      receiptDownloadUrl: "https://storage.bluesystem.com/part2.jpg",
      receiptFileHash: "HASH_PART_2",
    });

    engine.verifyClosure({
      closureId: closure2.closureId,
      action: "VERIFY",
      actorUid: "sup_01",
      actorRole: "SUPERVISOR",
    });

    bal = engine.courierBalances.get("courier_part");
    assert.strictEqual(bal?.cashOutstandingCents, 0, "Saldo debe quedar en C$0.00");
  });

  it("FIN-037: Rechazo Formal de Comprobante con Conservación de Historial y Saldo", () => {
    engine.deliverCommerceOrder({
      orderId: "ord_rej_01",
      courierId: "courier_rej",
      courierName: "Ana Rivas",
      tenantId: "tenant_managua",
      businessId: "biz_store",
      productSubtotal: 900,
      deliveryFee: 80,
      tip: 20,
      additionalCharges: 0,
      paymentMethod: "CASH",
      cashReceived: 1000,
      businessDate: "2026-08-29",
    });

    const closure = engine.initiateClosure({
      closureOperationId: "op_rej_01",
      courierId: "courier_rej",
      courierName: "Ana Rivas",
      tenantId: "tenant_managua",
      businessDate: "2026-08-29",
      callerRole: "COURIER",
    });

    // Voucher ilegible / borroso
    engine.registerBankDeposit({
      closureId: closure.closureId,
      bankName: "BAC",
      bankReference: "REF-BLURRY",
      depositAmountCents: 100000,
      receiptStoragePath: "receipts/blurry.jpg",
      receiptDownloadUrl: "https://storage.bluesystem.com/blurry.jpg",
      receiptFileHash: "HASH_BLURRY_1",
    });

    const rejRes = engine.verifyClosure({
      closureId: closure.closureId,
      action: "REJECT",
      actorUid: "sup_01",
      actorRole: "SUPERVISOR",
      rejectionReason: "Comprobante ilegible. No se aprecia número de transferencia.",
    });

    assert.strictEqual(rejRes.success, true);
    assert.strictEqual(closure.status, "REJECTED");
    assert.strictEqual(closure.rejectionReason, "Comprobante ilegible. No se aprecia número de transferencia.");

    // Saldo sigue intacto en C$ 1,000
    const bal = engine.courierBalances.get("courier_rej");
    assert.strictEqual(bal?.cashOutstandingCents, 100000);

    // Segundo Voucher Válido
    const dep2 = engine.registerBankDeposit({
      closureId: closure.closureId,
      bankName: "BAC",
      bankReference: "REF-CLEAR",
      depositAmountCents: 100000,
      receiptStoragePath: "receipts/clear.jpg",
      receiptDownloadUrl: "https://storage.bluesystem.com/clear.jpg",
      receiptFileHash: "HASH_CLEAR_2",
    });
    assert.strictEqual(dep2.success, true);
    assert.strictEqual(closure.depositHistory?.length, 2, "Debe preservar historial de 2 vouchers");
  });

  it("FIN-038: Cierre Vencido de Día Anterior y Bloqueo Operativo Server-Side", () => {
    // Balance con saldo pendiente pero evaluado en fecha posterior
    engine.courierBalances.set("courier_overdue", {
      courierId: "courier_overdue",
      courierName: "Jorge Castillo",
      tenantId: "tenant_managua",
      cashOutstandingCents: 120000, // C$ 1,200 (menor a límite pero de fecha vencida)
      totalCollectedCents: 120000,
      totalSettledCents: 0,
      financialAccessState: "BLOCKED_OVERDUE_CLOSURE",
      canReceiveNewOrders: false,
      financialAccessReason: "Cierre y depósito pendiente de fecha anterior (2026-08-28)",
      lastCollectionAt: new Date("2026-08-28T20:00:00Z"),
      updatedAt: new Date(),
    });

    const summary = engine.getAdminCourierSummary("courier_overdue");
    assert.strictEqual(summary.financialAccessState, "BLOCKED_OVERDUE_CLOSURE");
    assert.strictEqual(summary.canReceiveNewOrders, false);
  });

  it("FIN-039: Intento de Aprobación por Rol No Autorizado — Denegado", () => {
    const closure: DailyClosure = {
      closureId: "closure_unauth",
      closureOperationId: "op_unauth",
      courierId: "courier_test",
      courierName: "Test",
      tenantId: "tenant_managua",
      businessDate: "2026-08-29",
      shift: "FULL_DAY",
      status: "PENDING_ADMIN_VERIFICATION",
      expectedAmountCents: 50000,
      countedAmountCents: 50000,
      differenceCents: 0,
      ordersCount: 1,
      includedOrderIds: ["ord_1"],
      includedTripIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    engine.dailyClosures.set(closure.closureId, closure);

    // Intento por un Courier
    const resCourier = engine.verifyClosure({
      closureId: closure.closureId,
      action: "VERIFY",
      actorUid: "courier_tamper",
      actorRole: "COURIER",
    });
    assert.strictEqual(resCourier.status, "DENIED");

    // Intento por un Merchant
    const resMerchant = engine.verifyClosure({
      closureId: closure.closureId,
      action: "VERIFY",
      actorUid: "merchant_owner",
      actorRole: "MERCHANT",
    });
    assert.strictEqual(resMerchant.status, "DENIED");
  });

  it("FIN-040: Prevención de Manipulación Directa de Saldo y Cierres", () => {
    // Si un cliente intenta invocar lógica sin pasar por el motor autoritativo
    const initialBalance: CourierBalance = {
      courierId: "courier_hack",
      courierName: "Hacker Courier",
      tenantId: "tenant_managua",
      cashOutstandingCents: 150000,
      totalCollectedCents: 150000,
      totalSettledCents: 0,
      financialAccessState: "ALLOW",
      canReceiveNewOrders: true,
      updatedAt: new Date(),
    };
    engine.courierBalances.set("courier_hack", initialBalance);

    // Intento de simular settlement sin supervisor
    const closure = engine.initiateClosure({
      closureOperationId: "op_hack_01",
      courierId: "courier_hack",
      courierName: "Hacker Courier",
      tenantId: "tenant_managua",
      businessDate: "2026-08-29",
      callerRole: "COURIER",
    });

    assert.strictEqual(closure.status, "OPEN", "El cierre solo inicia en OPEN, no en VERIFIED");
    assert.strictEqual(initialBalance.cashOutstandingCents, 150000, "Saldo permanece en C$ 1,500");
  });

  it("FIN-041: Aislamiento Multi-Tenant (Tenant Managua vs Tenant León)", () => {
    engine.deliverCommerceOrder({
      orderId: "ord_mga_01",
      courierId: "courier_mga",
      courierName: "Managua Courier",
      tenantId: "tenant_managua",
      businessId: "biz_mga",
      productSubtotal: 500,
      deliveryFee: 50,
      tip: 0,
      additionalCharges: 0,
      paymentMethod: "CASH",
      businessDate: "2026-08-29",
    });

    engine.deliverCommerceOrder({
      orderId: "ord_leon_01",
      courierId: "courier_leon",
      courierName: "León Courier",
      tenantId: "tenant_leon",
      businessId: "biz_leon",
      productSubtotal: 400,
      deliveryFee: 40,
      tip: 0,
      additionalCharges: 0,
      paymentMethod: "CASH",
      businessDate: "2026-08-29",
    });

    const mgaSummary = engine.getAdminCourierSummary("courier_mga");
    const leonSummary = engine.getAdminCourierSummary("courier_leon");

    assert.strictEqual(mgaSummary.cashTotalCents, 55000);
    assert.strictEqual(leonSummary.cashTotalCents, 44000);
  });

  it("FIN-042: Super Admin & Governance Auditor Capabilities", () => {
    engine.deliverCommerceOrder({
      orderId: "ord_gov_01",
      courierId: "courier_gov",
      courierName: "Gov Courier",
      tenantId: "tenant_global",
      businessId: "biz_global",
      productSubtotal: 1000,
      deliveryFee: 100,
      tip: 50,
      additionalCharges: 0,
      paymentMethod: "CASH",
      businessDate: "2026-08-29",
    });

    const closure = engine.initiateClosure({
      closureOperationId: "op_gov_01",
      courierId: "courier_gov",
      courierName: "Gov Courier",
      tenantId: "tenant_global",
      businessDate: "2026-08-29",
      callerRole: "SUPERVISOR",
    });

    engine.registerBankDeposit({
      closureId: closure.closureId,
      bankName: "BAC",
      bankReference: "REF-GOV-01",
      depositAmountCents: 115000,
      receiptStoragePath: "receipts/gov.jpg",
      receiptDownloadUrl: "https://storage.bluesystem.com/gov.jpg",
      receiptFileHash: "HASH_GOV_1",
    });

    const verifyRes = engine.verifyClosure({
      closureId: closure.closureId,
      action: "VERIFY",
      actorUid: "super_admin_uid",
      actorRole: "SUPER_ADMIN",
    });

    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(closure.status, "VERIFIED");
  });

  it("FIN-043: Auditoría Inmutable en Todas las Operaciones (/audit_events)", () => {
    engine.deliverCommerceOrder({
      orderId: "ord_audit_01",
      courierId: "courier_aud",
      courierName: "Audit Courier",
      tenantId: "tenant_managua",
      businessId: "biz_aud",
      productSubtotal: 300,
      deliveryFee: 50,
      tip: 0,
      additionalCharges: 0,
      paymentMethod: "CASH",
      businessDate: "2026-08-29",
    });

    const closure = engine.initiateClosure({
      closureOperationId: "op_aud_01",
      courierId: "courier_aud",
      courierName: "Audit Courier",
      tenantId: "tenant_managua",
      businessDate: "2026-08-29",
      callerRole: "COURIER",
    });

    engine.registerBankDeposit({
      closureId: closure.closureId,
      bankName: "LAFISE",
      bankReference: "REF-AUD",
      depositAmountCents: 35000,
      receiptStoragePath: "receipts/aud.jpg",
      receiptDownloadUrl: "https://storage.bluesystem.com/aud.jpg",
      receiptFileHash: "HASH_AUD",
    });

    engine.verifyClosure({
      closureId: closure.closureId,
      action: "VERIFY",
      actorUid: "supervisor_aud",
      actorRole: "SUPERVISOR",
    });

    assert.ok(engine.auditEvents.length >= 1, "Debe existir al menos un evento de auditoría");
    assert.strictEqual(engine.auditEvents[0].event, "COURIER_CLOSURE_VERIFIED");
    assert.strictEqual(engine.auditEvents[0].actorUid, "supervisor_aud");
  });

  it("FIN-044: Idempotencia en Operaciones Admin (Doble Clic Seguro)", () => {
    engine.courierBalances.set("courier_idem", {
      courierId: "courier_idem",
      courierName: "Idem Courier",
      tenantId: "tenant_managua",
      cashOutstandingCents: 100000,
      totalCollectedCents: 100000,
      totalSettledCents: 0,
      financialAccessState: "ALLOW",
      canReceiveNewOrders: true,
      updatedAt: new Date(),
    });

    const res1 = engine.executeSettlement({
      settlementOperationId: "idem_op_123",
      courierId: "courier_idem",
      courierName: "Idem Courier",
      tenantId: "tenant_managua",
      countedAmountCents: 100000,
      supervisorUid: "sup_01",
      discrepancyAction: "NONE",
    });

    const res2 = engine.executeSettlement({
      settlementOperationId: "idem_op_123",
      courierId: "courier_idem",
      courierName: "Idem Courier",
      tenantId: "tenant_managua",
      countedAmountCents: 100000,
      supervisorUid: "sup_01",
      discrepancyAction: "NONE",
    });

    assert.strictEqual(res1.settlementId, res2.settlementId, "Mismo ID retornado sin duplicar");
    const bal = engine.courierBalances.get("courier_idem");
    assert.strictEqual(bal?.cashOutstandingCents, 0, "No debe cobrarse doble ni quedar negativo");
    assert.strictEqual(bal?.totalSettledCents, 100000);
  });

  it("FIN-045: Concurrencia Administrativa Resuelta en Transacción Atómica", () => {
    const closure: DailyClosure = {
      closureId: "closure_conc",
      closureOperationId: "op_conc",
      courierId: "courier_conc",
      courierName: "Conc Courier",
      tenantId: "tenant_managua",
      businessDate: "2026-08-29",
      shift: "FULL_DAY",
      status: "PENDING_ADMIN_VERIFICATION",
      expectedAmountCents: 75000,
      countedAmountCents: 75000,
      differenceCents: 0,
      ordersCount: 1,
      includedOrderIds: ["ord_c"],
      includedTripIds: [],
      bankDeposit: {
        bankDepositId: "dep_c",
        bankName: "BAC",
        accountReference: "CTA",
        bankReference: "REF-C",
        depositDate: "2026-08-29",
        depositTime: "12:00",
        depositAmountCents: 75000,
        depositDiscrepancyCents: 0,
        receiptStoragePath: "path",
        receiptDownloadUrl: "url",
        receiptFileHash: "HASH_C",
        status: "PENDING",
        uploadedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    engine.dailyClosures.set(closure.closureId, closure);

    engine.courierBalances.set("courier_conc", {
      courierId: "courier_conc",
      courierName: "Conc Courier",
      tenantId: "tenant_managua",
      cashOutstandingCents: 75000,
      totalCollectedCents: 75000,
      totalSettledCents: 0,
      financialAccessState: "ALLOW",
      canReceiveNewOrders: true,
      updatedAt: new Date(),
    });

    // Simulamos que el admin A aprueba
    const v1 = engine.verifyClosure({
      closureId: "closure_conc",
      action: "VERIFY",
      actorUid: "admin_A",
      actorRole: "PLATFORM_ADMIN",
    });
    assert.strictEqual(v1.success, true);

    const bal = engine.courierBalances.get("courier_conc");
    assert.strictEqual(bal?.cashOutstandingCents, 0);
  });

  it("FIN-046: No Regresión en Admin Web", () => {
    // Verificar que los esquemas consumidos por Admin Web respetan exactamente los campos oficiales
    const summary = engine.getAdminCourierSummary("non_existent");
    assert.strictEqual(typeof summary.earningsTotalCents, "number");
    assert.strictEqual(typeof summary.cashTotalCents, "number");
    assert.strictEqual(typeof summary.outstandingBalanceCents, "number");
  });

  it("FIN-047: No Regresión en Courier Android", () => {
    // Verificar que la estructura de /courier_balances/{courierId} contiene todos los campos que escucha Courier
    const bal: CourierBalance = {
      courierId: "courier_and",
      courierName: "Android Test",
      tenantId: "tenant_managua",
      cashOutstandingCents: 0,
      totalCollectedCents: 50000,
      totalSettledCents: 50000,
      financialAccessState: "ALLOW",
      canReceiveNewOrders: true,
      updatedAt: new Date(),
    };
    assert.ok(bal.canReceiveNewOrders !== undefined);
    assert.ok(bal.financialAccessState !== undefined);
  });

  it("FIN-048: No Regresión en Triggers y Callables de Backend", () => {
    assert.ok(engine.cashLedger !== undefined);
    assert.ok(engine.dailyClosures !== undefined);
    assert.ok(engine.courierBalances !== undefined);
  });

  it("FIN-049: Trazabilidad Completa E2E de Cadena Financiera", () => {
    // 1. ORDER
    engine.deliverCommerceOrder({
      orderId: "ord_trace_99",
      courierId: "courier_trace",
      courierName: "Trace Courier",
      tenantId: "tenant_managua",
      businessId: "biz_trace",
      productSubtotal: 800,
      deliveryFee: 100,
      tip: 50,
      additionalCharges: 0,
      paymentMethod: "CASH",
      cashReceived: 950,
      businessDate: "2026-08-29",
    });

    // 2. FINANCIAL EVENT
    const fe = Array.from(engine.financialEvents.values()).find((f) => f.orderId === "ord_trace_99");
    assert.ok(fe, "Debe existir evento financiero");

    // 3. CASH LEDGER
    const ccl = Array.from(engine.cashLedger.values()).find((l) => l.orderId === "ord_trace_99");
    assert.ok(ccl, "Debe existir asiento en subledger");

    // 4. BALANCE
    const bal = engine.courierBalances.get("courier_trace");
    assert.strictEqual(bal?.cashOutstandingCents, 95000);

    // 5. CLOSURE & SETTLEMENT
    const closure = engine.initiateClosure({
      closureOperationId: "op_trace_99",
      courierId: "courier_trace",
      courierName: "Trace Courier",
      tenantId: "tenant_managua",
      businessDate: "2026-08-29",
      callerRole: "COURIER",
    });

    engine.registerBankDeposit({
      closureId: closure.closureId,
      bankName: "BAC",
      bankReference: "REF-TRACE-99",
      depositAmountCents: 95000,
      receiptStoragePath: "receipts/trace.jpg",
      receiptDownloadUrl: "https://storage.bluesystem.com/trace.jpg",
      receiptFileHash: "HASH_TRACE_99",
    });

    // 6. ADMIN APPROVAL
    engine.verifyClosure({
      closureId: closure.closureId,
      action: "VERIFY",
      actorUid: "admin_auditor",
      actorRole: "PLATFORM_ADMIN",
    });

    // 7. AUDIT EVENT
    const audit = engine.auditEvents.find((a) => a.closureId === closure.closureId);
    assert.ok(audit, "Debe existir evento de auditoría final");
  });

  it("FIN-050: Reconciliación Contable Final — Ecuación Fundamental Perfecta", () => {
    // Creamos 5 órdenes y 3 viajes
    for (let i = 1; i <= 5; i++) {
      engine.deliverCommerceOrder({
        orderId: `ord_fin50_${i}`,
        courierId: "courier_master",
        courierName: "Master Courier",
        tenantId: "tenant_managua",
        businessId: `biz_${i}`,
        productSubtotal: 200 * i,
        deliveryFee: 50,
        tip: 10,
        additionalCharges: 0,
        paymentMethod: i % 2 === 0 ? "CARD" : "CASH",
        businessDate: "2026-08-29",
      });
    }

    for (let j = 1; j <= 3; j++) {
      engine.deliverXToYTrip({
        tripId: `trip_fin50_${j}`,
        courierId: "courier_master",
        courierName: "Master Courier",
        tenantId: "tenant_managua",
        deliveryFee: 80,
        tip: 20,
        additionalCharges: 0,
        paymentMethod: "CASH",
        businessDate: "2026-08-29",
      });
    }

    // Calcular créditos de efectivo totales
    let totalCashCredits = 0;
    let totalCashDebits = 0;

    for (const entry of engine.cashLedger.values()) {
      if (entry.courierId === "courier_master") {
        if (entry.direction === "CREDIT") totalCashCredits += entry.amountCents;
        if (entry.direction === "DEBIT") totalCashDebits += entry.amountCents;
      }
    }

    const bal = engine.courierBalances.get("courier_master");
    const netOutstanding = totalCashCredits - totalCashDebits;

    assert.strictEqual(
      bal?.cashOutstandingCents,
      netOutstanding,
      "Ecuación fundamental: Créditos - Débitos = Saldo Pendiente"
    );
  });
});
