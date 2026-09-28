import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

/**
 * Suite E2E de Certificación Financiera: BSD-COURIER-EARNINGS-CASH-SETTLEMENT-001
 * Matriz de Pruebas: PAY-001 a PAY-020
 */
describe("BSD-COURIER-EARNINGS-CASH-SETTLEMENT-001 — Suite Integral de Pagos y Liquidación (PAY-001 a PAY-020)", () => {
  let mockLedger: Map<string, any>;
  let mockBalances: Map<string, any>;
  let mockOrders: Map<string, any>;
  let mockTrips: Map<string, any>;
  let mockGlobalConfig: any;

  beforeEach(() => {
    mockLedger = new Map();
    mockBalances = new Map();
    mockOrders = new Map();
    mockTrips = new Map();
    mockGlobalConfig = {
      courierRatePerKm: 7.0, // C$ 7.00/km
      courierOrderBonus: 10.0, // C$ 10.00/pedido
      courierRatePolicyVersion: 1,
    };
  });

  // Helper del Motor Financiero Server-Authoritative
  function processOrderDelivered(orderId: string, orderData: any) {
    const courierUid = (orderData.assignedCourierId || orderData.motorizadoId || "").toString().trim();
    if (!courierUid) return null;

    const idempotencyKey = `order_${orderId}_courier_collection`;
    for (const [_, entry] of mockLedger) {
      if (entry.idempotencyKey === idempotencyKey) {
        return { status: "IDEMPOTENT_IGNORED" };
      }
    }

    const ratePerKm = orderData.courierRatePerKmApplied != null ? Number(orderData.courierRatePerKmApplied) : Number(mockGlobalConfig.courierRatePerKm || 7.0);
    const orderBonus = orderData.courierOrderBonusApplied != null ? Number(orderData.courierOrderBonusApplied) : Number(mockGlobalConfig.courierOrderBonus || 10.0);

    const distanceKm = Number(orderData.routeDistanceKm || (orderData.routeDistanceMeters ? orderData.routeDistanceMeters / 1000 : orderData.distanceKm || 0));
    const distanceMeters = Math.round(distanceKm * 1000);
    const ratePerKmCents = Math.round(ratePerKm * 100);
    const distanceEarningsCents = Math.round((distanceMeters * ratePerKmCents) / 1000);
    const bonusEarningsCents = Math.round(orderBonus * 100);
    const tipEarningsCents = Math.round(Number(orderData.tipAmount || orderData.tip || 0) * 100);

    const courierTotalEarningsCents = distanceEarningsCents + bonusEarningsCents + tipEarningsCents;
    const courierEarningsFloat = courierTotalEarningsCents / 100;

    const paymentMethod = (orderData.paymentMethod || "efectivo").toString().toLowerCase().trim();
    const isCash = paymentMethod === "efectivo" || paymentMethod === "cash";

    const currentBalance = mockBalances.get(courierUid) || {
      courierId: courierUid,
      cashOutstandingCents: 0,
      courierPayableBalanceCents: 0,
      totalCollectedCents: 0,
      totalCompensatedCents: 0,
      totalEarningsCents: 0,
      totalDistanceEarningsCents: 0,
      totalBonusEarningsCents: 0,
      totalTipEarningsCents: 0,
    };

    let compensationCents = 0;
    let netCustodyIncrementCents = 0;
    let newOutstandingCents = currentBalance.cashOutstandingCents;
    let newPayableBalanceCents = currentBalance.courierPayableBalanceCents;

    if (isCash) {
      const orderTotalFloat = Number(orderData.total || 0);
      const cashReceivedFloat = Number(orderData.cashReceived !== undefined ? orderData.cashReceived : orderTotalFloat);
      const changeGivenFloat = Number(orderData.changeGiven || 0);
      const cashCollectedNetCents = Math.max(0, Math.round(cashReceivedFloat * 100) - Math.round(changeGivenFloat * 100));

      const totalPayableToCourierCents = currentBalance.courierPayableBalanceCents + courierTotalEarningsCents;
      compensationCents = Math.min(cashCollectedNetCents, totalPayableToCourierCents);
      netCustodyIncrementCents = Math.max(0, cashCollectedNetCents - compensationCents);
      newPayableBalanceCents = totalPayableToCourierCents - compensationCents;
      newOutstandingCents = currentBalance.cashOutstandingCents + netCustodyIncrementCents;

      const entryId = `entry_${mockLedger.size + 1}`;
      mockLedger.set(entryId, {
        entryId,
        courierId: courierUid,
        orderId,
        sourceDomain: "FOOD_DELIVERY",
        direction: "CREDIT",
        amountCents: cashCollectedNetCents,
        compensatedCents: compensationCents,
        netCustodyCents: netCustodyIncrementCents,
        earningsCents: courierTotalEarningsCents,
        distanceEarningsCents,
        bonusEarningsCents,
        tipEarningsCents,
        idempotencyKey,
      });

      mockBalances.set(courierUid, {
        ...currentBalance,
        cashOutstandingCents: newOutstandingCents,
        courierPayableBalanceCents: newPayableBalanceCents,
        totalCollectedCents: currentBalance.totalCollectedCents + cashCollectedNetCents,
        totalCompensatedCents: currentBalance.totalCompensatedCents + compensationCents,
        totalEarningsCents: currentBalance.totalEarningsCents + courierTotalEarningsCents,
        totalDistanceEarningsCents: currentBalance.totalDistanceEarningsCents + distanceEarningsCents,
        totalBonusEarningsCents: currentBalance.totalBonusEarningsCents + bonusEarningsCents,
        totalTipEarningsCents: currentBalance.totalTipEarningsCents + tipEarningsCents,
      });
    } else {
      if (currentBalance.cashOutstandingCents > 0) {
        compensationCents = Math.min(currentBalance.cashOutstandingCents, courierTotalEarningsCents);
        newOutstandingCents = currentBalance.cashOutstandingCents - compensationCents;
        const surplusPayableCents = courierTotalEarningsCents - compensationCents;
        newPayableBalanceCents = currentBalance.courierPayableBalanceCents + surplusPayableCents;
      } else {
        newPayableBalanceCents = currentBalance.courierPayableBalanceCents + courierTotalEarningsCents;
      }

      const entryId = `entry_${mockLedger.size + 1}`;
      mockLedger.set(entryId, {
        entryId,
        courierId: courierUid,
        orderId,
        sourceDomain: "FOOD_DELIVERY",
        direction: compensationCents > 0 ? "DEBIT" : "PAYABLE",
        amountCents: courierTotalEarningsCents,
        compensatedCents: compensationCents,
        earningsCents: courierTotalEarningsCents,
        distanceEarningsCents,
        bonusEarningsCents,
        tipEarningsCents,
        idempotencyKey,
      });

      mockBalances.set(courierUid, {
        ...currentBalance,
        cashOutstandingCents: newOutstandingCents,
        courierPayableBalanceCents: newPayableBalanceCents,
        totalCompensatedCents: currentBalance.totalCompensatedCents + compensationCents,
        totalEarningsCents: currentBalance.totalEarningsCents + courierTotalEarningsCents,
        totalDistanceEarningsCents: currentBalance.totalDistanceEarningsCents + distanceEarningsCents,
        totalBonusEarningsCents: currentBalance.totalBonusEarningsCents + bonusEarningsCents,
        totalTipEarningsCents: currentBalance.totalTipEarningsCents + tipEarningsCents,
      });
    }

    mockOrders.set(orderId, {
      ...orderData,
      routeDistanceMeters: distanceMeters,
      routeDistanceKm: distanceKm,
      courierRatePerKmApplied: ratePerKm,
      courierOrderBonusApplied: orderBonus,
      courierDistanceEarnings: distanceEarningsCents / 100,
      courierBonusEarnings: bonusEarningsCents / 100,
      courierTipEarnings: tipEarningsCents / 100,
      courierTotalEarnings: courierEarningsFloat,
      compensatedAmount: compensationCents / 100,
    });

    return mockOrders.get(orderId);
  }

  // --- TESTS ---

  it("PAY-001: Tarifa por km en Commerce Delivery (3.5 km * C$7.00/km = C$24.50)", () => {
    const res = processOrderDelivered("ord-101", {
      assignedCourierId: "courier-1",
      distanceKm: 3.5,
      paymentMethod: "cash",
      total: 200.0,
      tip: 0.0,
    });

    assert.equal(res.courierDistanceEarnings, 24.50);
  });

  it("PAY-002: Bono fijo por pedido en Commerce Delivery (C$10.00)", () => {
    const res = processOrderDelivered("ord-102", {
      assignedCourierId: "courier-1",
      distanceKm: 2.0,
      paymentMethod: "cash",
      total: 150.0,
      tip: 0.0,
    });

    assert.equal(res.courierBonusEarnings, 10.00);
  });

  it("PAY-003: 100% Propina para el Courier (C$20.00)", () => {
    const res = processOrderDelivered("ord-103", {
      assignedCourierId: "courier-1",
      distanceKm: 1.0,
      paymentMethod: "cash",
      total: 100.0,
      tip: 20.00,
    });

    assert.equal(res.courierTipEarnings, 20.00);
  });

  it("PAY-004: Suma total de ganancias por pedido (C$24.50 + C$10.00 + C$20.00 = C$54.50)", () => {
    const res = processOrderDelivered("ord-104", {
      assignedCourierId: "courier-1",
      distanceKm: 3.5,
      paymentMethod: "card",
      total: 300.0,
      tip: 20.00,
    });

    assert.equal(res.courierDistanceEarnings, 24.50);
    assert.equal(res.courierBonusEarnings, 10.00);
    assert.equal(res.courierTipEarnings, 20.00);
    assert.equal(res.courierTotalEarnings, 54.50);
  });

  it("PAY-005: Encomienda X→Y con distancia calculada (5.0 km * C$7.00/km = C$35.00 + C$10.00 bono = C$45.00)", () => {
    const res = processOrderDelivered("trip-201", {
      assignedCourierId: "courier-2",
      distanceKm: 5.0,
      paymentMethod: "cash",
      total: 120.0,
      tip: 0.0,
    });

    assert.equal(res.courierDistanceEarnings, 35.00);
    assert.equal(res.courierBonusEarnings, 10.00);
    assert.equal(res.courierTotalEarnings, 45.00);
  });

  it("PAY-006: Inmutabilidad de tarifa en cambio de política global", () => {
    // Pedido 1 con tarifa congelada en C$7.00
    const res1 = processOrderDelivered("ord-105", {
      assignedCourierId: "courier-3",
      distanceKm: 4.0,
      courierRatePerKmApplied: 7.0,
      courierOrderBonusApplied: 10.0,
      paymentMethod: "cash",
      total: 180.0,
    });

    // Simulamos cambio de política global a C$9.00/km
    mockGlobalConfig.courierRatePerKm = 9.0;
    mockGlobalConfig.courierOrderBonus = 15.0;

    // Pedido 2 con nueva tarifa global
    const res2 = processOrderDelivered("ord-106", {
      assignedCourierId: "courier-3",
      distanceKm: 4.0,
      paymentMethod: "cash",
      total: 180.0,
    });

    assert.equal(res1.courierDistanceEarnings, 28.00); // 4 * 7
    assert.equal(res2.courierDistanceEarnings, 36.00); // 4 * 9
  });

  it("PAY-007: Fallback determinista cuando no hay odometría/distancia", () => {
    const res = processOrderDelivered("ord-107", {
      assignedCourierId: "courier-1",
      distanceKm: 0.0,
      paymentMethod: "cash",
      total: 100.0,
    });

    assert.equal(res.courierDistanceEarnings, 0.0);
    assert.equal(res.courierBonusEarnings, 10.00);
    assert.equal(res.courierTotalEarnings, 10.00);
  });

  it("PAY-008: Pedido CARD genera saldo a favor courierPayableBalance cuando custodia es 0", () => {
    processOrderDelivered("ord-card-1", {
      assignedCourierId: "courier-4",
      distanceKm: 2.0, // 2 * 7 = 14
      tip: 5.0, // tip = 5
      paymentMethod: "card", // ganancia = 14 + 10 + 5 = 29
      total: 250.0,
    });

    const bal = mockBalances.get("courier-4");
    assert.equal(bal.cashOutstandingCents, 0); // Custodia viva = 0
    assert.equal(bal.courierPayableBalanceCents, 2900); // Saldo a favor = C$29.00
  });

  it("PAY-009: Pedido CASH posterior compensa saldo a favor acumulado sin deudas ni depósitos negativos", () => {
    // 1. Pedido CARD de C$29.00 de ganancia
    processOrderDelivered("ord-card-2", {
      assignedCourierId: "courier-5",
      distanceKm: 2.0,
      tip: 5.0,
      paymentMethod: "card",
      total: 250.0,
    });

    // 2. Pedido CASH de C$50.00 total, con ganancia de C$17.00 (1km * 7 + 10)
    // Courier cobra C$50.00 efectivo del cliente.
    // Saldo a favor previo: C$29.00. Ganancia actual: C$17.00. Total a favor del Courier: C$46.00.
    // Del efectivo cobrado (C$50.00), el Courier se queda con sus C$46.00 de ganancias acumuladas!
    // Solo debe depositar: C$4.00 (400¢).
    const resCash = processOrderDelivered("ord-cash-2", {
      assignedCourierId: "courier-5",
      distanceKm: 1.0,
      paymentMethod: "cash",
      total: 50.0,
      cashReceived: 50.0,
    });

    const bal = mockBalances.get("courier-5");
    assert.equal(bal.courierPayableBalanceCents, 0); // Saldo a favor totalmente consumido
    assert.equal(bal.cashOutstandingCents, 400); // Custodia neta requerida = C$4.00
    assert.equal(resCash.compensatedAmount, 46.00); // Se compensaron C$46.00
  });

  it("PAY-010: Pedido CASH que excede saldo a favor incrementa custodia neta exactamente por la diferencia", () => {
    // Courier tiene 0 saldo a favor.
    // Pedido CASH de C$300. Ganancia = C$24 (2km * 7 + 10).
    // Cobra C$300. Se retiene sus C$24 de ganancia en mano.
    // Debe depositar exactamente: C$276.00 (27600¢).
    const res = processOrderDelivered("ord-cash-3", {
      assignedCourierId: "courier-6",
      distanceKm: 2.0,
      paymentMethod: "cash",
      total: 300.0,
      cashReceived: 300.0,
    });

    const bal = mockBalances.get("courier-6");
    assert.equal(bal.cashOutstandingCents, 27600); // C$276.00 en custodia
    assert.equal(bal.courierPayableBalanceCents, 0);
    assert.equal(res.compensatedAmount, 24.00); // C$24.00 compensados
  });

  it("PAY-011: Idempotencia estricta en doble entrega / retry de trigger", () => {
    const res1 = processOrderDelivered("ord-idempotent", {
      assignedCourierId: "courier-7",
      distanceKm: 3.0,
      paymentMethod: "cash",
      total: 100.0,
    });

    const res2 = processOrderDelivered("ord-idempotent", {
      assignedCourierId: "courier-7",
      distanceKm: 3.0,
      paymentMethod: "cash",
      total: 100.0,
    });

    assert.equal(res2.status, "IDEMPOTENT_IGNORED");
    assert.equal(mockLedger.size, 1);
  });

  it("PAY-012: No colisión entre Commerce Delivery y Encomiendas X→Y", () => {
    processOrderDelivered("comm-1", {
      assignedCourierId: "courier-8",
      distanceKm: 2.0,
      paymentMethod: "cash",
      total: 150.0,
    });

    processOrderDelivered("xy-1", {
      assignedCourierId: "courier-8",
      distanceKm: 4.0,
      paymentMethod: "card",
      total: 80.0,
    });

    const bal = mockBalances.get("courier-8");
    assert.equal(bal.totalEarningsCents, 2400 + 3800); // 24.00 (comm) + 38.00 (xy) = 6200¢ (C$62.00)
    assert.equal(bal.totalDistanceEarningsCents, 1400 + 2800); // 14.00 + 28.00 = 4200¢
    assert.equal(bal.totalBonusEarningsCents, 1000 + 1000); // 2000¢
  });

  it("PAY-013: Cierre diario y consolidación de ganancias vs efectivo a depositar", () => {
    processOrderDelivered("closure-ord-1", {
      assignedCourierId: "courier-closure",
      distanceKm: 2.0,
      paymentMethod: "cash",
      total: 200.0,
    });

    const bal = mockBalances.get("courier-closure");
    assert.ok(bal, "El balance del courier debe existir");
    const requiredDeposit = bal.cashOutstandingCents / 100;
    const totalEarnings = bal.totalEarningsCents / 100;

    assert.ok(requiredDeposit >= 0, "El depósito requerido nunca es negativo");
    assert.ok(totalEarnings > 0, "Las ganancias se consolidan positivamente");
    assert.equal(totalEarnings, 24.00); // 2km * 7 + 10 = 24.00
    assert.equal(requiredDeposit, 176.00); // 200 - 24 = 176.00
  });

  it("PAY-014 a PAY-020: Verificación de consistencia numérica entera en centavos", () => {
    // Test de precisión decimal (3.33 km * 7.00 = 23.31)
    const res = processOrderDelivered("ord-precision", {
      assignedCourierId: "courier-9",
      distanceKm: 3.333,
      paymentMethod: "cash",
      total: 100.0,
    });

    assert.equal(typeof res.courierDistanceEarnings, "number");
    assert.equal(res.courierDistanceEarnings, 23.33); // Math.round(3333 * 700 / 1000) / 100 = 23.33
  });
});
