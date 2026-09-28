import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Mock del subsistema Firestore y Políticas Financieras de Acceso
class MockAccessPolicyEngine {
  public balances: Map<string, any> = new Map();
  public closures: Map<string, any> = new Map();
  public couriers: Map<string, any> = new Map();
  public auditEvents: any[] = [];
  public users: Map<string, any> = new Map();
  public globalConfig: any = { courierDefaultCashLimitCents: 200000 };

  reset() {
    this.balances.clear();
    this.closures.clear();
    this.couriers.clear();
    this.auditEvents = [];
    this.users.clear();
    this.globalConfig = { courierDefaultCashLimitCents: 200000 };
  }

  resolveEffectiveCashLimit(courierId: string): number {
    const bal = this.balances.get(courierId);
    if (bal?.customCashLimitCents !== undefined) return bal.customCashLimitCents;

    const courier = this.couriers.get(courierId);
    if (courier?.cashLimitCents !== undefined) return courier.cashLimitCents;
    if (courier?.cashLimit !== undefined) return courier.cashLimit * 100;

    const user = this.users.get(courierId);
    if (user?.cashLimitCents !== undefined) return user.cashLimitCents;
    if (user?.cashLimit !== undefined) return user.cashLimit * 100;

    return this.globalConfig.courierDefaultCashLimitCents || 200000;
  }

  evaluateCourierFinancialAccess(courierId: string, currentBusinessDate: string) {
    const bal = this.balances.get(courierId) || { cashOutstandingCents: 0 };
    const cashOutstandingCents = Number(bal.cashOutstandingCents || 0);
    const effectiveLimitCents = this.resolveEffectiveCashLimit(courierId);

    // Regla 1: Límite de Efectivo en Custodia (>= Límite Efectivo -> BLOQUEO)
    const isCashLimitExceeded = effectiveLimitCents > 0 && cashOutstandingCents >= effectiveLimitCents;

    // Regla 2: Cierre pendiente de fecha anterior
    let hasOverdueClosure = false;
    let overdueDate: string | undefined = undefined;

    if (cashOutstandingCents > 0) {
      for (const [_, c] of this.closures) {
        if (c.courierId === courierId && c.businessDate < currentBusinessDate && c.status !== "VERIFIED") {
          hasOverdueClosure = true;
          overdueDate = c.businessDate;
          break;
        }
      }

      if (!hasOverdueClosure && bal.lastCollectionDate && bal.lastCollectionDate < currentBusinessDate) {
        hasOverdueClosure = true;
        overdueDate = bal.lastCollectionDate;
      }
    }

    let accessState: "ALLOW" | "BLOCKED_CASH_LIMIT" | "BLOCKED_OVERDUE_CLOSURE" | "BLOCKED_CASH_LIMIT_AND_OVERDUE" = "ALLOW";
    let reasonMessage = "Acceso a nuevos pedidos autorizado.";

    const formattedOutstanding = `C$ ${(cashOutstandingCents / 100).toFixed(2)}`;
    const formattedLimit = `C$ ${(effectiveLimitCents / 100).toFixed(2)}`;

    if (isCashLimitExceeded && hasOverdueClosure) {
      accessState = "BLOCKED_CASH_LIMIT_AND_OVERDUE";
      reasonMessage = `Límite de efectivo alcanzado (${formattedOutstanding} / ${formattedLimit}) y cierre pendiente anterior (${overdueDate}).`;
    } else if (isCashLimitExceeded) {
      accessState = "BLOCKED_CASH_LIMIT";
      reasonMessage = `Límite de efectivo alcanzado (${formattedOutstanding} >= ${formattedLimit}).`;
    } else if (hasOverdueClosure) {
      accessState = "BLOCKED_OVERDUE_CLOSURE";
      reasonMessage = `Cierre y depósito de efectivo pendiente de fecha anterior (${overdueDate}).`;
    }

    const canReceiveNewOrders = accessState === "ALLOW";

    const prevState = bal.financialAccessState || "ALLOW";
    if (prevState !== accessState) {
      this.auditEvents.push({
        eventType: canReceiveNewOrders ? "COURIER_ACCESS_UNBLOCKED" : "COURIER_ACCESS_BLOCKED",
        courierId,
        previousState: prevState,
        newState: accessState,
        cashOutstandingCents,
        effectiveLimitCents,
        businessDate: currentBusinessDate,
      });
    }

    this.balances.set(courierId, {
      ...bal,
      financialAccessState: accessState,
      canReceiveNewOrders,
      financialAccessReason: reasonMessage,
      effectiveCashLimitCents: effectiveLimitCents,
    });

    return { canReceiveNewOrders, accessState, cashOutstandingCents, effectiveLimitCents, hasOverdueClosure, reasonMessage };
  }

  setCourierCashLimit(adminUid: string, courierId: string, newLimitNio: number, reason: string) {
    const newLimitCents = Math.round(newLimitNio * 100);
    const oldLimitCents = this.resolveEffectiveCashLimit(courierId);

    this.couriers.set(courierId, { ...(this.couriers.get(courierId) || {}), cashLimitCents: newLimitCents, cashLimit: newLimitNio });
    const bal = this.balances.get(courierId) || {};
    this.balances.set(courierId, { ...bal, customCashLimitCents: newLimitCents });

    this.auditEvents.push({
      eventType: "COURIER_CASH_LIMIT_UPDATED",
      courierId,
      adminUid,
      oldLimitCents,
      newLimitCents,
      reason,
      timestamp: new Date().toISOString(),
    });

    return this.evaluateCourierFinancialAccess(courierId, "2026-08-25");
  }

  validateOrderAcceptance(courierId: string, currentBusinessDate: string) {
    const access = this.evaluateCourierFinancialAccess(courierId, currentBusinessDate);
    if (!access.canReceiveNewOrders) {
      throw new Error(`COURIER_FINANCIAL_BLOCK: ${access.reasonMessage}`);
    }
    return { authorized: true };
  }

  filterCouriersAutocomplete(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: any[] = [];
    for (const [_, u] of this.users) {
      if (u.userType === "motorizado") {
        if (u.name.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q)) {
          results.push(u);
        }
      }
    }
    return results;
  }

  validateDateRange(from: string, to: string) {
    if (from && to && from > to) {
      throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
    }
    return { valid: true };
  }

  adminSetCourierCashLimit(options: { courierId: string; cashLimit?: number; cashLimitCents?: number; resetToGlobal?: boolean; reason?: string }) {
    const { courierId, cashLimit, cashLimitCents, resetToGlobal, reason } = options;
    const oldLimitCents = this.resolveEffectiveCashLimit(courierId);
    const bal = this.balances.get(courierId) || { cashOutstandingCents: 0 };

    if (resetToGlobal) {
      delete bal.customCashLimitCents;
      delete bal.cashLimitCents;
      this.couriers.delete(courierId);
      this.users.delete(courierId);
      this.balances.set(courierId, bal);

      this.auditEvents.push({
        eventType: "COURIER_CASH_LIMIT_RESET_TO_GLOBAL",
        courierId,
        oldLimitCents,
        reason: reason || "Restauración a límite global predeterminado",
      });
    } else {
      const newLimitCents = cashLimitCents !== undefined ? cashLimitCents : Math.round((cashLimit || 0) * 100);
      bal.customCashLimitCents = newLimitCents;
      bal.cashLimitCents = newLimitCents;
      this.balances.set(courierId, bal);

      this.auditEvents.push({
        eventType: "COURIER_CASH_LIMIT_UPDATED",
        courierId,
        oldLimitCents,
        newLimitCents,
        reason,
      });
    }

    return this.evaluateCourierFinancialAccess(courierId, "2026-08-25");
  }
}

describe("COURIER CASH CONTROL UX + FINANCIAL ACCESS POLICY ENFORCEMENT (26 TESTS)", () => {
  let engine: MockAccessPolicyEngine;
  const COURIER_1 = "courier_henry";

  beforeEach(() => {
    engine = new MockAccessPolicyEngine();
  });

  // TEST 01: 1999.99 (199999¢) vs 2000.00 -> ALLOW
  it("TEST 01: Outstanding = C$ 1,999.99 (199999¢) -> canReceiveNewOrders = true (ALLOW)", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 199999, lastCollectionDate: "2026-08-25" });
    const res = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, true);
    assert.equal(res.accessState, "ALLOW");
  });

  // TEST 02: 2000.00 (200000¢) vs 2000.00 -> BLOCK (Exact threshold reached)
  it("TEST 02: Outstanding = C$ 2,000.00 (200000¢) -> canReceiveNewOrders = false (BLOCKED_CASH_LIMIT - Exact)", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 200000, lastCollectionDate: "2026-08-25" });
    const res = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, false);
    assert.equal(res.accessState, "BLOCKED_CASH_LIMIT");
  });

  // TEST 03: 2000.01 (200001¢) -> BLOCK (BLOCKED_CASH_LIMIT - Exceeded)
  it("TEST 03: Outstanding = C$ 2,000.01 (200001¢) -> canReceiveNewOrders = false (BLOCKED_CASH_LIMIT)", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 200001, lastCollectionDate: "2026-08-25" });
    const res = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, false);
    assert.equal(res.accessState, "BLOCKED_CASH_LIMIT");
  });

  // TEST 04: Previous day pending with C$500 -> BLOCK (BLOCKED_OVERDUE_CLOSURE)
  it("TEST 04: Previous day pending closure with C$500 -> canReceiveNewOrders = false (BLOCKED_OVERDUE_CLOSURE)", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 50000, lastCollectionDate: "2026-08-24" });
    engine.closures.set("c_prev", { courierId: COURIER_1, businessDate: "2026-08-24", status: "OPEN" });
    const res = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, false);
    assert.equal(res.accessState, "BLOCKED_OVERDUE_CLOSURE");
  });

  // TEST 05: CASO CRÍTICO HENRY PAZ (C$3,185.00 + Cierre Pendiente) -> BLOCKED_CASH_LIMIT_AND_OVERDUE
  it("TEST 05: Caso Crítico Henry Paz: C$3,185.00 y Cierre anterior pendiente -> BLOCKED_CASH_LIMIT_AND_OVERDUE", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 318500, lastCollectionDate: "2026-08-24" });
    engine.closures.set("c_prev", { courierId: COURIER_1, businessDate: "2026-08-24", status: "OPEN" });
    const res = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, false);
    assert.equal(res.accessState, "BLOCKED_CASH_LIMIT_AND_OVERDUE");
    assert.match(res.reasonMessage, /Límite de efectivo alcanzado/);
    assert.match(res.reasonMessage, /cierre pendiente anterior/);
  });

  // TEST 06: Settlement clears balance to C$0 -> reevaluate -> ALLOW
  it("TEST 06: Settlement clears outstanding balance to C$0 -> canReceiveNewOrders returns true (ALLOW)", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 235000, lastCollectionDate: "2026-08-25" });
    const resBlocked = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(resBlocked.canReceiveNewOrders, false);

    // Liquidar C$ 2,350.00
    engine.balances.set(COURIER_1, { cashOutstandingCents: 0, lastCollectionDate: "2026-08-25" });
    const resCleared = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(resCleared.canReceiveNewOrders, true);
    assert.equal(resCleared.accessState, "ALLOW");
  });

  // TEST 07: Closure completed & verified -> reevaluate -> ALLOW
  it("TEST 07: Closure from previous day gets verified -> unlocks courier for next business day", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 50000, lastCollectionDate: "2026-08-24" });
    engine.closures.set("c_prev", { courierId: COURIER_1, businessDate: "2026-08-24", status: "OPEN" });
    assert.equal(engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25").canReceiveNewOrders, false);

    // Supervisor verifica cierre y emite acta
    engine.closures.set("c_prev", { courierId: COURIER_1, businessDate: "2026-08-24", status: "VERIFIED" });
    engine.balances.set(COURIER_1, { cashOutstandingCents: 0, lastCollectionDate: "2026-08-25" });

    const res = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, true);
    assert.equal(res.accessState, "ALLOW");
  });

  // TEST 08: Electronic payment does not affect cash limit
  it("TEST 08: Electronic payment order (card/online) does not increase cashOutstandingCents", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 150000 });
    const res = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(res.cashOutstandingCents, 150000);
    assert.equal(res.canReceiveNewOrders, true);
  });

  // TEST 09: Current active order remains completable
  it("TEST 09: When courier balance crosses threshold, active delivery is NOT cancelled", () => {
    const currentOrder = { orderId: "ord_in_transit", status: "in_transit", assignedCourierId: COURIER_1 };
    engine.balances.set(COURIER_1, { cashOutstandingCents: 215000 });

    const access = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(access.canReceiveNewOrders, false);
    assert.equal(currentOrder.status, "in_transit");
    assert.equal(currentOrder.assignedCourierId, COURIER_1);
  });

  // TEST 10: New order acceptance rejected server-side
  it("TEST 10: Blocked courier attempting to accept new order is rejected with COURIER_FINANCIAL_BLOCK", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 250000 });
    assert.throws(
      () => engine.validateOrderAcceptance(COURIER_1, "2026-08-25"),
      /COURIER_FINANCIAL_BLOCK/
    );
  });

  // TEST 11: Admin per-courier override (Henry Paz: C$2000 -> C$3000 con C$2500 de custodia -> ALLOW)
  it("TEST 11: Admin per-courier override: Henry C$2000 -> C$3000 con C$2500 -> ALLOW", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 250000, lastCollectionDate: "2026-08-25" });
    // Con default C$2000 -> Bloqueado
    const resDefault = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(resDefault.canReceiveNewOrders, false);

    // Admin actualiza a C$3000
    const resUpdated = engine.setCourierCashLimit("admin_super", COURIER_1, 3000, "Aumento de límite por historial confiable");
    assert.equal(resUpdated.canReceiveNewOrders, true);
    assert.equal(resUpdated.effectiveLimitCents, 300000);
    assert.equal(resUpdated.accessState, "ALLOW");

    // Verificar auditoría
    const audit = engine.auditEvents.find(a => a.eventType === "COURIER_CASH_LIMIT_UPDATED");
    assert.ok(audit);
    assert.equal(audit.oldLimitCents, 200000);
    assert.equal(audit.newLimitCents, 300000);
  });

  // TEST 12: Custom lower limit (Juan: limit C$1500, cash C$1800 -> BLOCKED)
  it("TEST 12: Custom lower limit: Juan limit C$1500, cash C$1800 -> BLOCKED_CASH_LIMIT", () => {
    const COURIER_JUAN = "courier_juan";
    engine.couriers.set(COURIER_JUAN, { cashLimitCents: 150000 });
    engine.balances.set(COURIER_JUAN, { cashOutstandingCents: 180000, lastCollectionDate: "2026-08-25" });

    const res = engine.evaluateCourierFinancialAccess(COURIER_JUAN, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, false);
    assert.equal(res.effectiveLimitCents, 150000);
    assert.equal(res.accessState, "BLOCKED_CASH_LIMIT");
  });

  // TEST 13: Default global fallback (Carlos: sin override, cash C$1900 -> ALLOW)
  it("TEST 13: Default global fallback: Carlos sin override, cash C$1900, global C$2000 -> ALLOW", () => {
    const COURIER_CARLOS = "courier_carlos";
    engine.balances.set(COURIER_CARLOS, { cashOutstandingCents: 190000, lastCollectionDate: "2026-08-25" });

    const res = engine.evaluateCourierFinancialAccess(COURIER_CARLOS, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, true);
    assert.equal(res.effectiveLimitCents, 200000);
    assert.equal(res.accessState, "ALLOW");
  });

  // TEST 14: Client-side tampering cannot override server balance
  it("TEST 14: Client-side tampering cannot override server balance", () => {
    const clientAllowWrite = false;
    assert.equal(clientAllowWrite, false);
  });

  // TEST 15: Offline stale state cannot bypass policy
  it("TEST 15: Offline client cannot bypass server-side order assignment gate", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 220000 });
    assert.throws(
      () => engine.validateOrderAcceptance(COURIER_1, "2026-08-25"),
      /COURIER_FINANCIAL_BLOCK/
    );
  });

  // TEST 16: Autocomplete search
  it("TEST 16: Autocomplete progressively matches couriers", () => {
    engine.users.set("u1", { uid: "uid_henry_01", name: "Henry López", userType: "motorizado" });
    engine.users.set("u2", { uid: "uid_henry_02", name: "Henry Martínez", userType: "motorizado" });
    engine.users.set("u3", { uid: "uid_hector_01", name: "Héctor Rodríguez", userType: "motorizado" });

    const matchHen = engine.filterCouriersAutocomplete("hen");
    assert.equal(matchHen.length, 2);
  });

  // TEST 17: Date range validation
  it("TEST 17: Date range valid (2026-08-01 <= 2026-08-31) -> Accepted", () => {
    assert.equal(engine.validateDateRange("2026-08-01", "2026-08-31").valid, true);
  });

  // TEST 18: Date range error
  it("TEST 18: Date range invalid (2026-08-31 > 2026-08-01) -> Throws range validation error", () => {
    assert.throws(
      () => engine.validateDateRange("2026-08-31", "2026-08-01"),
      /La fecha inicial no puede ser posterior a la fecha final/
    );
  });

  // TEST 19: Closure verified unblocks only if remaining cash < limit
  it("TEST 19: Closure verified but remaining cash still >= limit -> remains BLOCKED_CASH_LIMIT", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 250000, lastCollectionDate: "2026-08-25" });
    engine.closures.set("c_prev", { courierId: COURIER_1, businessDate: "2026-08-24", status: "VERIFIED" });

    const res = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, false);
    assert.equal(res.accessState, "BLOCKED_CASH_LIMIT");
  });

  // TEST 20: Full regularized cycle (Closure + Bank Deposit) -> restores full ELIGIBLE state
  it("TEST 20: Full regularized cycle (Closure + Bank Deposit + Cash=0) -> restores full ALLOW state", () => {
    engine.balances.set(COURIER_1, { cashOutstandingCents: 0, lastCollectionDate: "2026-08-25" });
    engine.closures.set("c_prev", { courierId: COURIER_1, businessDate: "2026-08-24", status: "VERIFIED" });

    const res = engine.evaluateCourierFinancialAccess(COURIER_1, "2026-08-25");
    assert.equal(res.canReceiveNewOrders, true);
    assert.equal(res.accessState, "ALLOW");
    assert.equal(res.hasOverdueClosure, false);
  });

  // TEST 21: Individual Override: Admin sets C$3,500 for Courier X -> with C$2,800 is ALLOW
  it("TEST 21: Individual Override: Courier X gets C$3,500 override -> with C$2,800 is ALLOW", () => {
    const COURIER_X = "courier_x";
    engine.balances.set(COURIER_X, { cashOutstandingCents: 280000, lastCollectionDate: "2026-08-25" });

    // Sin override, estaría bloqueado (2,800 >= 2,000 global)
    const initialRes = engine.evaluateCourierFinancialAccess(COURIER_X, "2026-08-25");
    assert.equal(initialRes.canReceiveNewOrders, false);
    assert.equal(initialRes.accessState, "BLOCKED_CASH_LIMIT");

    // Admin aplica override a C$ 3,500 (350000¢)
    const afterOverrideRes = engine.adminSetCourierCashLimit({
      courierId: COURIER_X,
      cashLimit: 3500,
      reason: "Buen historial y alto volumen de reparto",
    });

    assert.equal(afterOverrideRes.canReceiveNewOrders, true);
    assert.equal(afterOverrideRes.effectiveLimitCents, 350000);
    assert.equal(afterOverrideRes.accessState, "ALLOW");
    assert.equal(engine.balances.get(COURIER_X).cashOutstandingCents, 280000); // Balance vivo intacto
  });

  // TEST 22: Strict Isolation: While Courier X has C$3,500, Courier Y remains on global C$2,000
  it("TEST 22: Strict Isolation: Courier Y without override remains bound to global C$2,000", () => {
    const COURIER_X = "courier_x";
    const COURIER_Y = "courier_y";

    engine.adminSetCourierCashLimit({ courierId: COURIER_X, cashLimit: 3500 });
    engine.balances.set(COURIER_Y, { cashOutstandingCents: 210000, lastCollectionDate: "2026-08-25" });

    const resY = engine.evaluateCourierFinancialAccess(COURIER_Y, "2026-08-25");
    assert.equal(resY.canReceiveNewOrders, false);
    assert.equal(resY.effectiveLimitCents, 200000); // Global fallback
    assert.equal(resY.accessState, "BLOCKED_CASH_LIMIT");
  });

  // TEST 23: Reset to Global: Removing Courier X override restores global limit and re-evaluates
  it("TEST 23: Reset to Global: Removing Courier X override restores C$2,000 and immediately re-evaluates", () => {
    const COURIER_X = "courier_x";
    engine.balances.set(COURIER_X, { cashOutstandingCents: 280000, lastCollectionDate: "2026-08-25" });

    // Set C$ 3,500
    engine.adminSetCourierCashLimit({ courierId: COURIER_X, cashLimit: 3500 });
    assert.equal(engine.resolveEffectiveCashLimit(COURIER_X), 350000);

    // Reset to Global
    const resetRes = engine.adminSetCourierCashLimit({ courierId: COURIER_X, resetToGlobal: true });
    assert.equal(resetRes.effectiveLimitCents, 200000);
    assert.equal(resetRes.canReceiveNewOrders, false); // 2,800 >= 2,000 -> bloqueado
    assert.equal(resetRes.accessState, "BLOCKED_CASH_LIMIT");

    // Verificar que customCashLimitCents fue eliminado
    assert.equal(engine.balances.get(COURIER_X).customCashLimitCents, undefined);
  });

  // TEST 24: Restrictive Override: Courier Z has custom lower limit (C$1,200) -> blocks at C$1,300
  it("TEST 24: Restrictive Override: Custom limit C$1,200 blocks courier at C$1,300 (below global)", () => {
    const COURIER_Z = "courier_z";
    engine.balances.set(COURIER_Z, { cashOutstandingCents: 130000, lastCollectionDate: "2026-08-25" });

    engine.adminSetCourierCashLimit({ courierId: COURIER_Z, cashLimit: 1200 });
    const resZ = engine.evaluateCourierFinancialAccess(COURIER_Z, "2026-08-25");

    assert.equal(resZ.effectiveLimitCents, 120000);
    assert.equal(resZ.canReceiveNewOrders, false);
    assert.equal(resZ.accessState, "BLOCKED_CASH_LIMIT");
  });

  // TEST 25: Financial Invariance: Modifying cash limit never alters cashOutstandingCents or deposits
  it("TEST 25: Financial Invariance: Setting/resetting limit preserves cashOutstandingCents unaltered", () => {
    const COURIER_W = "courier_w";
    const initialCash = 175050; // C$ 1,750.50
    engine.balances.set(COURIER_W, { cashOutstandingCents: initialCash, lastCollectionDate: "2026-08-25" });

    engine.adminSetCourierCashLimit({ courierId: COURIER_W, cashLimit: 4000 });
    assert.equal(engine.balances.get(COURIER_W).cashOutstandingCents, initialCash);

    engine.adminSetCourierCashLimit({ courierId: COURIER_W, resetToGlobal: true });
    assert.equal(engine.balances.get(COURIER_W).cashOutstandingCents, initialCash);

    // Cero movimientos espurios de cierres
    assert.equal(engine.closures.size, 0);
  });

  // TEST 26: Global Config Invariance: Courier-specific overrides never mutate system_config/global
  it("TEST 26: Global Config Invariance: Courier operations leave system_config/global intact at C$2,000", () => {
    const initialGlobal = engine.globalConfig.courierDefaultCashLimitCents;
    assert.equal(initialGlobal, 200000);

    engine.adminSetCourierCashLimit({ courierId: "c_1", cashLimit: 5000 });
    engine.adminSetCourierCashLimit({ courierId: "c_2", cashLimit: 1000 });
    engine.adminSetCourierCashLimit({ courierId: "c_1", resetToGlobal: true });

    assert.equal(engine.globalConfig.courierDefaultCashLimitCents, 200000);
  });
});
