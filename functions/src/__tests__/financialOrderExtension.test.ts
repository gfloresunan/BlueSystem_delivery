/**
 * BLUE SYSTEM DELIVERY ENTERPRISE
 * CANONICAL FINANCIAL DISTRIBUTION & COURIER FINANCIAL CONTRACT TEST SUITE (18 TEST MATRIX)
 *
 * Protocol: FINANCIAL-COURIER-SEMANTIC-CONSISTENCY-001
 * Baseline: v2.3 — Financial Ownership Baseline
 *
 * Valida de forma exhaustiva los invariantes de la separación económica del pedido:
 * 1. deliveryFee -> Courier Delivery Earnings (C$ 60)
 * 2. tipAmount -> Courier Tip Earnings (C$ 40)
 * 3. courierTotalEarnings = courierDeliveryEarnings + courierTipEarnings (C$ 100)
 * 4. courierEarnings = alias controlado retrocompatible (C$ 100)
 * 5. customerTotal = merchantGrossSales + courierDeliveryEarnings + tipAmount + additionalChargeAmount (C$ 1,605)
 * 6. merchantGrossSales = base exclusiva de productos (C$ 1,500)
 * 7. merchantCommissionAmount = 15% de merchantGrossSales (C$ 225)
 * 8. merchantNetPayout = merchantGrossSales - merchantCommissionAmount (C$ 1,275)
 * 9. platformRevenue = merchantCommissionAmount + additionalChargeAmount (C$ 230)
 * 10. Separación COD: cashCollected (C$ 1,605) != courierTotalEarnings (C$ 100). Fondos de terceros = C$ 1,505.
 * 11. Autoridad Financiera Backend: validación y recálculo autoritativo ante manipulación del cliente.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

export interface OrderFinancialParams {
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
  additionalChargeAmount?: number;
  tipAmount?: number;
  commissionRate?: number;
  // Campos posiblemente manipulados por el cliente (para pruebas adversariales)
  declaredMerchantGrossSales?: number;
  declaredCustomerTotal?: number;
  declaredCourierEarnings?: number;
  declaredPlatformRevenue?: number;
}

export function computeOrderFinancialBreakdown(params: OrderFinancialParams) {
  const subtotal = Math.max(0, params.subtotal);
  const deliveryFee = Math.max(0, params.deliveryFee);
  const discount = Math.max(0, params.discountAmount || 0);
  const additionalCharge = Math.max(0, params.additionalChargeAmount || 0);
  const tip = Math.max(0, params.tipAmount || 0);
  const commissionRate = params.commissionRate !== undefined ? params.commissionRate : 0.15;

  // Recálculo autoritativo server-side (ignora manipulaciones declaradas por el cliente)
  const merchantGrossSales = Math.max(0, subtotal - discount);
  const merchantCommissionAmount = Math.round(merchantGrossSales * commissionRate * 100) / 100;
  const merchantNetPayout = Math.max(0, Math.round((merchantGrossSales - merchantCommissionAmount) * 100) / 100);

  const courierDeliveryEarnings = deliveryFee;
  const courierTipEarnings = tip;
  const courierTotalEarnings = Math.round((courierDeliveryEarnings + courierTipEarnings) * 100) / 100;
  const courierEarnings = courierTotalEarnings; // Legacy backward-compatible alias

  const platformAdditionalChargeRevenue = additionalCharge;
  const platformCommissionRevenue = merchantCommissionAmount;
  const platformRevenue = Math.round((platformCommissionRevenue + platformAdditionalChargeRevenue) * 100) / 100;

  const customerTotal = Math.round((merchantGrossSales + deliveryFee + additionalCharge + tip) * 100) / 100;

  return {
    customerTotal,
    merchantGrossSales,
    merchantCommissionRate: commissionRate,
    merchantCommissionAmount,
    merchantNetPayout,
    deliveryFee,
    courierDeliveryEarnings,
    tipAmount: tip,
    courierTipEarnings,
    courierTotalEarnings,
    courierEarnings,
    additionalChargeAmount: additionalCharge,
    platformAdditionalChargeRevenue,
    platformCommissionRevenue,
    platformRevenue,
  };
}

describe("PROTOCOL FINANCIAL-COURIER-SEMANTIC-CONSISTENCY-001 — AUDIT SUITE", () => {
  it("TEST 01 — Definición canónica: deliveryFee = 60, tipAmount = 40 -> courierDelivery = 60, courierTip = 40, courierTotal = 100", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
    });

    assert.equal(res.deliveryFee, 60);
    assert.equal(res.tipAmount, 40);
    assert.equal(res.courierDeliveryEarnings, 60);
    assert.equal(res.courierTipEarnings, 40);
    assert.equal(res.courierTotalEarnings, 100);
    assert.equal(res.courierEarnings, 100); // Alias controlado
  });

  it("TEST 02 — COD: cashCollected = 1605 vs courierTotalEarnings = 100", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
    });

    const cashCollected = res.customerTotal; // Efectivo físico recaudado
    assert.equal(cashCollected, 1605);
    assert.equal(res.courierTotalEarnings, 100);
    assert.notEqual(cashCollected, res.courierTotalEarnings);

    // Fondos de terceros bajo custodia física del repartidor
    const thirdPartyFundsUnderCustody = cashCollected - res.courierTotalEarnings;
    assert.equal(thirdPartyFundsUnderCustody, 1505); // 1500 comercio + 5 plataforma
  });

  it("TEST 03 — merchantGrossSales = 1500 (solo productos, excluye delivery, propina y cargo)", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
    });

    assert.equal(res.merchantGrossSales, 1500);
  });

  it("TEST 04 — Comisión de comercio 15%: 1500 * 15% = 225", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
      commissionRate: 0.15,
    });

    assert.equal(res.merchantCommissionAmount, 225);
  });

  it("TEST 05 — merchantNetPayout: 1500 - 225 = 1275", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
      commissionRate: 0.15,
    });

    assert.equal(res.merchantNetPayout, 1275);
    assert.equal(res.merchantGrossSales - res.merchantCommissionAmount, res.merchantNetPayout);
  });

  it("TEST 06 — Reconciliación Canónica Global: 1275 + 225 + 100 + 5 = 1605", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
      commissionRate: 0.15,
    });

    const sum = res.merchantNetPayout + res.merchantCommissionAmount + res.courierTotalEarnings + res.additionalChargeAmount;
    assert.equal(sum, 1605);
    assert.equal(res.customerTotal, sum);
  });

  it("TEST 07 — Propina (40): Corresponde 100% al Courier (courierTipEarnings = 40)", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
    });

    assert.equal(res.courierTipEarnings, 40);
    // No impacta base de comisión del comercio
    assert.equal(res.merchantGrossSales, 1500);
    assert.equal(res.merchantCommissionAmount, 225);
  });

  it("TEST 08 — Delivery Fee (60): Corresponde 100% al Courier (courierDeliveryEarnings = 60)", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
    });

    assert.equal(res.courierDeliveryEarnings, 60);
    assert.equal(res.merchantGrossSales, 1500);
  });

  it("TEST 09 — Cargo adicional (5): Corresponde 100% a Plataforma/Admin", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
    });

    assert.equal(res.platformAdditionalChargeRevenue, 5);
    assert.equal(res.platformRevenue, 230); // 225 comisión + 5 cargo
  });

  it("TEST 10 — Modificar comisión global futura: Pedidos históricos inmutables", () => {
    const orderHistorical = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
      commissionRate: 0.15,
    });

    assert.equal(orderHistorical.merchantCommissionRate, 0.15);
    assert.equal(orderHistorical.merchantCommissionAmount, 225);

    // Sistema actualiza tasa global a 10% para nuevos pedidos
    const orderNew = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
      commissionRate: 0.10,
    });

    assert.equal(orderNew.merchantCommissionRate, 0.10);
    assert.equal(orderNew.merchantCommissionAmount, 150);

    // El histórico sigue intacto en 225
    assert.equal(orderHistorical.merchantCommissionAmount, 225);
  });

  it("TEST 11 — Manipulación adversarial de merchantGrossSales desde Customer: Backend recalcula autoritativamente", () => {
    // Cliente malicioso intenta reportar gross sales de 999999 o 0 para evadir comisiones
    const fraudulentPayload: OrderFinancialParams = {
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
      declaredMerchantGrossSales: 999999, // Inyección fraudulenta
    };

    const res = computeOrderFinancialBreakdown(fraudulentPayload);
    // El backend ignora declaredMerchantGrossSales y calcula autoritativamente 1500
    assert.equal(res.merchantGrossSales, 1500);
    assert.equal(res.merchantCommissionAmount, 225);
    assert.equal(res.merchantNetPayout, 1275);
  });

  it("TEST 12 — Manipulación adversarial de customerTotal: Backend recalcula autoritativamente", () => {
    // Cliente malicioso intenta reportar total = 1
    const fraudulentPayload: OrderFinancialParams = {
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
      declaredCustomerTotal: 1, // Inyección fraudulenta
    };

    const res = computeOrderFinancialBreakdown(fraudulentPayload);
    // El backend ignora declaredCustomerTotal y calcula 1605
    assert.equal(res.customerTotal, 1605);
  });

  it("TEST 13 — Pedido histórico legacy: Retrocompatibilidad de courierEarnings alias", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
    });

    // Consumers antiguos que lean courierEarnings obtienen el mismo valor canónico (100)
    assert.equal(res.courierEarnings, res.courierTotalEarnings);
    assert.equal(res.courierEarnings, 100);
  });

  it("TEST 14 — Cierre COD: cashCollected = 1605 vs courierTotalEarnings = 100", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
    });

    const cashCollected = res.customerTotal;
    const courierEarnings = res.courierTotalEarnings;
    const merchantFunds = res.merchantGrossSales;
    const platformFunds = res.platformAdditionalChargeRevenue;

    assert.equal(cashCollected, 1605);
    assert.equal(courierEarnings, 100);
    assert.equal(merchantFunds, 1500);
    assert.equal(platformFunds, 5);
    assert.equal(cashCollected - courierEarnings, merchantFunds + platformFunds);
  });

  it("TEST 15 — Reconciliación del Courier: courierTotalEarnings = courierDeliveryEarnings + courierTipEarnings (100 = 60 + 40)", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
    });

    assert.equal(res.courierTotalEarnings, res.courierDeliveryEarnings + res.courierTipEarnings);
    assert.equal(res.courierTotalEarnings, 100);
  });

  it("TEST 16 — Reconciliación de Plataforma: platformRevenue = merchantCommissionAmount + additionalChargeAmount (230 = 225 + 5)", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 40,
      commissionRate: 0.15,
    });

    assert.equal(res.platformRevenue, res.merchantCommissionAmount + res.additionalChargeAmount);
    assert.equal(res.platformRevenue, 230);
  });

  it("TEST 17 — Escenario con Descuento/Cupón: Subtotal 1500, Descuento 200 -> Gross 1300, Comisión 195, Neto 1105", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      discountAmount: 200,
      additionalChargeAmount: 5,
      tipAmount: 40,
      commissionRate: 0.15,
    });

    assert.equal(res.merchantGrossSales, 1300);
    assert.equal(res.merchantCommissionAmount, 195);
    assert.equal(res.merchantNetPayout, 1105);
    assert.equal(res.courierTotalEarnings, 100);
    assert.equal(res.platformRevenue, 200); // 195 + 5
    assert.equal(res.customerTotal, 1405); // 1300 + 60 + 5 + 40
  });

  it("TEST 18 — Escenario sin propina: Subtotal 1500, Delivery 60, Tip 0 -> courierTotalEarnings = 60", () => {
    const res = computeOrderFinancialBreakdown({
      subtotal: 1500,
      deliveryFee: 60,
      additionalChargeAmount: 5,
      tipAmount: 0,
    });

    assert.equal(res.courierDeliveryEarnings, 60);
    assert.equal(res.courierTipEarnings, 0);
    assert.equal(res.courierTotalEarnings, 60);
    assert.equal(res.courierEarnings, 60);
    assert.equal(res.customerTotal, 1565);
  });
});
