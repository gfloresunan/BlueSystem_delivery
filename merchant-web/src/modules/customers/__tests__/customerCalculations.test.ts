/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Unit Test Suite for Customer Intelligence Calculations
 */

import {
  resolveCustomerIdentity,
  isValidPurchase,
  resolveMerchantGrossSales,
  deduplicateOrders,
  classifyCustomer,
  maskPhone,
  sortCustomers,
  aggregateCustomerOrders
} from '../utils/customerCalculations';
import { CustomerLifetimeStats } from '../types';

export function runCustomerIntelligenceUnitTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ PASS: ${testName}`);
    } else {
      failed++;
      const msg = `  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  console.log('\n============================================================');
  console.log('🧪 EJECUTANDO TESTS DE CUSTOMER INTELLIGENCE (FASE 2)');
  console.log('============================================================\n');

  // 1. Identity Resolution (DEC-01)
  const idRes1 = resolveCustomerIdentity({ customerId: 'cust_101', clienteId: 'c_2', userId: 'u_3' });
  assert(idRes1.canonicalId === 'cust_101' && idRes1.quality === 'VALID', 'E2E-17: customerId primary priority');

  const idRes2 = resolveCustomerIdentity({ clienteId: 'cliente_202', userId: 'u_3' });
  assert(idRes2.canonicalId === 'cliente_202' && idRes2.quality === 'VALID', 'E2E-17: clienteId fallback');

  const idRes3 = resolveCustomerIdentity({ userId: 'user_303' });
  assert(idRes3.canonicalId === 'user_303' && idRes3.quality === 'VALID', 'E2E-17: userId fallback');

  const idRes4 = resolveCustomerIdentity({ uid: 'uid_404' });
  assert(idRes4.canonicalId === 'uid_404' && idRes4.quality === 'VALID', 'E2E-17: uid fallback');

  const idRes5 = resolveCustomerIdentity({ customerPhone: '+50588889999', customerName: 'Juan Pérez' });
  assert(idRes5.canonicalId === null && idRes5.quality === 'UNRESOLVED_IDENTITY', 'E2E-18: Phone without ID gives UNRESOLVED_IDENTITY');

  const idRes6 = resolveCustomerIdentity({});
  assert(idRes6.canonicalId === null && idRes6.quality === 'ANONYMOUS', 'Anonymous purchase gives ANONYMOUS');

  // 2. Valid Purchases & Idempotency (DEC-02)
  assert(isValidPurchase({ status: 'DELIVERED' }) === true, 'DELIVERED is valid purchase');
  assert(isValidPurchase({ canonicalStatus: 'COMPLETED' }) === true, 'COMPLETED is valid purchase');
  assert(isValidPurchase({ status: 'CANCELLED' }) === false, 'E2E-02: CANCELLED is invalid');
  assert(isValidPurchase({ status: 'REJECTED' }) === false, 'E2E-03: REJECTED is invalid');

  const deduped = deduplicateOrders([
    { id: 'ORD-1', status: 'DELIVERED', merchantGrossSales: 300 },
    { id: 'ORD-1', status: 'COMPLETED', merchantGrossSales: 300 },
    { id: 'ORD-2', status: 'DELIVERED', merchantGrossSales: 500 },
  ]);
  assert(deduped.length === 2 && deduped[0].id === 'ORD-1' && deduped[1].id === 'ORD-2', 'E2E-04: Deduplication enforces 1 purchase per orderId');

  // 3. Monetary Value (DEC-03)
  const salesVal = resolveMerchantGrossSales({
    subtotalAmount: 400,
    couponDiscount: 50,
    deliveryFee: 80,
    tipAmount: 20,
    totalAmount: 450,
    merchantGrossSales: 350,
  });
  assert(salesVal === 350, 'E2E-05: merchantGrossSales excludes delivery and tip');

  // 4. Segmentation & Dual Activity (DEC-07, 08, 17)
  const baseStats: CustomerLifetimeStats = {
    firstPurchaseAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    lastPurchaseAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    lifetimeOrderCount: 10,
    lifetimeGrossSales: 6000,
    lifetimeAverageTicket: 600,
    daysAsCustomer: 100,
    daysSinceLastPurchase: 5,
  };

  const vipRes = classifyCustomer(baseStats, 6, 3500);
  assert(vipRes.valueSegment === 'VIP' && vipRes.activityStatus === 'ACTIVO', 'E2E-06: VIP classified with 6 orders and C$3,500 in 90D');

  const freqRes1 = classifyCustomer(baseStats, 5, 5000);
  assert(freqRes1.valueSegment === 'FRECUENTE', 'E2E-07: 5 orders and C$5,000 gives FRECUENTE (not VIP by frequency)');

  const freqRes2 = classifyCustomer(baseStats, 8, 3000);
  assert(freqRes2.valueSegment === 'FRECUENTE', 'E2E-08: 8 orders and C$3,000 gives FRECUENTE (not VIP by amount)');

  const freqRes3 = classifyCustomer(baseStats, 4, 1800);
  assert(freqRes3.valueSegment === 'FRECUENTE', 'E2E-09: 4 orders gives FRECUENTE');

  const recRes = classifyCustomer(baseStats, 2, 800);
  assert(recRes.valueSegment === 'RECURRENTE', 'E2E-10: 2 orders gives RECURRENTE');

  const newStats: CustomerLifetimeStats = {
    firstPurchaseAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    lastPurchaseAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    lifetimeOrderCount: 1,
    lifetimeGrossSales: 450,
    lifetimeAverageTicket: 450,
    daysAsCustomer: 8,
    daysSinceLastPurchase: 8,
  };
  const newRes = classifyCustomer(newStats, 1, 450);
  assert(newRes.valueSegment === 'NUEVO' && newRes.activityStatus === 'ACTIVO', 'E2E-11: 1 order within 30D gives NUEVO');

  const oldSingleStats: CustomerLifetimeStats = {
    firstPurchaseAt: new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000),
    lastPurchaseAt: new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000),
    lifetimeOrderCount: 1,
    lifetimeGrossSales: 400,
    lifetimeAverageTicket: 400,
    daysAsCustomer: 1000,
    daysSinceLastPurchase: 1000,
  };
  const oldSingleRes = classifyCustomer(oldSingleStats, 0, 0);
  assert(oldSingleRes.valueSegment === 'UNCLASSIFIED' && oldSingleRes.activityStatus === 'INACTIVO', 'E2E-12: 1 order 3 years ago gives UNCLASSIFIED (Sin segmento) and INACTIVO');

  const riskStats = { ...baseStats, daysSinceLastPurchase: 45 };
  assert(classifyCustomer(riskStats, 0, 0).activityStatus === 'EN_RIESGO', 'E2E-13: 45 days gives EN_RIESGO');

  const inactiveStats = { ...baseStats, daysSinceLastPurchase: 90 };
  assert(classifyCustomer(inactiveStats, 0, 0).activityStatus === 'INACTIVO', 'E2E-13: 90 days gives INACTIVO');

  const highValueInactive: CustomerLifetimeStats = {
    firstPurchaseAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000),
    lastPurchaseAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    lifetimeOrderCount: 25,
    lifetimeGrossSales: 18500,
    lifetimeAverageTicket: 740,
    daysAsCustomer: 300,
    daysSinceLastPurchase: 90,
  };
  const vipInactRes = classifyCustomer(highValueInactive, 0, 0);
  assert(vipInactRes.activityStatus === 'INACTIVO' && vipInactRes.explainability.valueTitle === 'Histórico Alto Valor', 'E2E-14: VIP Histórico + Inactivo dual model');

  // 5. Deterministic Sorting (DEC-09)
  const c1: any = {
    id: '1',
    name: 'Carlos',
    periodStats: { periodGrossSales: 1000, periodOrderCount: 4 },
    lifetimeStats: { lastPurchaseAt: new Date(100000) },
  };
  const c2: any = {
    id: '2',
    name: 'Alberto',
    periodStats: { periodGrossSales: 1000, periodOrderCount: 4 },
    lifetimeStats: { lastPurchaseAt: new Date(100000) },
  };
  const c3: any = {
    id: '3',
    name: 'Beto',
    periodStats: { periodGrossSales: 2000, periodOrderCount: 2 },
    lifetimeStats: { lastPurchaseAt: new Date(50000) },
  };
  const sorted = sortCustomers([c1, c2, c3], 'SALES', 'DESC');
  assert(sorted[0].name === 'Beto' && sorted[1].name === 'Alberto' && sorted[2].name === 'Carlos', 'E2E-22: Deterministic sorting and tie-breaking');

  // 6. Mask Phone (DEC-15)
  assert(maskPhone('+50588889999') === '+505 ••••-••99', 'E2E-23: Phone masking E.164');

  // 7. Multi-Tenant & Multi-Branch Isolation (DEC-06, E2E-15, E2E-16)
  const sampleOrders = [
    { id: '1', businessId: 'biz_A', branchId: 'br_1', customerId: 'c1', status: 'DELIVERED', merchantGrossSales: 100, createdAt: new Date() },
    { id: '2', businessId: 'biz_A', branchId: 'br_2', customerId: 'c1', status: 'DELIVERED', merchantGrossSales: 200, createdAt: new Date() },
    { id: '3', businessId: 'biz_B', branchId: 'br_1', customerId: 'c1', status: 'DELIVERED', merchantGrossSales: 500, createdAt: new Date() },
  ];
  const profA = aggregateCustomerOrders(sampleOrders, 'biz_A', 'ALL');
  assert(profA.length === 1 && profA[0].lifetimeStats.lifetimeGrossSales === 300, 'E2E-15: Multi-Tenant isolated from biz_B');

  const profBranch1 = aggregateCustomerOrders(sampleOrders, 'biz_A', 'br_1');
  assert(profBranch1[0].lifetimeStats.lifetimeGrossSales === 100, 'E2E-16: Branch filtering isolates branch');

  console.log('\n============================================================');
  console.log(`📊 RESULTADO: ${passed} PASS, ${failed} FAIL`);
  console.log('============================================================\n');

  return { passed, failed, errors };
}
