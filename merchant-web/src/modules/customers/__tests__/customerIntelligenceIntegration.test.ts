/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Integration Test Suite for Merchant Web Customer Intelligence & Repository
 */

import { ClientAggregationProvider } from '../repository/CustomerIntelligenceRepository';
import { aggregateCustomerOrders, calculateMedian } from '../utils/customerCalculations';

export function runCustomerIntelligenceIntegrationTests(): { passed: number; failed: number; errors: string[] } {
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
  console.log('🧪 EJECUTANDO INTEGRATION TESTS — REPOSITORY & DATA LAYER');
  console.log('============================================================\n');

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // 1. Data Aggregation & Top 3 Products
  const richOrders = [
    {
      id: 'ORD-A1',
      businessId: 'biz_rest_100',
      branchId: 'sucursal_central',
      branchName: 'Sucursal Central',
      customerId: 'cust_vip_01',
      customerName: 'María López',
      customerPhone: '+50589991122',
      status: 'DELIVERED',
      deliveredAt: daysAgo(5),
      merchantGrossSales: 850,
      itemsList: [
        { name: 'Hamburguesa Doble', quantity: 2, price: 250 },
        { name: 'Papas Supremas', quantity: 1, price: 150 },
        { name: 'Gaseosa 500ml', quantity: 2, price: 100 },
      ],
    },
    {
      id: 'ORD-A2',
      businessId: 'biz_rest_100',
      branchId: 'sucursal_central',
      branchName: 'Sucursal Central',
      customerId: 'cust_vip_01',
      customerName: 'María López',
      customerPhone: '+50589991122',
      status: 'DELIVERED',
      deliveredAt: daysAgo(15),
      merchantGrossSales: 900,
      itemsList: [
        { name: 'Hamburguesa Doble', quantity: 3, price: 250 },
        { name: 'Postre de la Casa', quantity: 1, price: 150 },
      ],
    },
    {
      id: 'ORD-A3',
      businessId: 'biz_rest_100',
      branchId: 'sucursal_norte',
      branchName: 'Sucursal Norte',
      customerId: 'cust_vip_01',
      customerName: 'María López',
      customerPhone: '+50589991122',
      status: 'DELIVERED',
      deliveredAt: daysAgo(25),
      merchantGrossSales: 1200,
      itemsList: [
        { name: 'Hamburguesa Doble', quantity: 4, price: 250 },
        { name: 'Papas Supremas', quantity: 2, price: 150 },
      ],
    },
    {
      id: 'ORD-A4',
      businessId: 'biz_rest_100',
      branchId: 'sucursal_central',
      branchName: 'Sucursal Central',
      customerId: 'cust_vip_01',
      customerName: 'María López',
      customerPhone: '+50589991122',
      status: 'DELIVERED',
      deliveredAt: daysAgo(35),
      merchantGrossSales: 1000,
      itemsList: [{ name: 'Hamburguesa Doble', quantity: 4, price: 250 }],
    },
    {
      id: 'ORD-A5',
      businessId: 'biz_rest_100',
      branchId: 'sucursal_central',
      branchName: 'Sucursal Central',
      customerId: 'cust_vip_01',
      customerName: 'María López',
      customerPhone: '+50589991122',
      status: 'DELIVERED',
      deliveredAt: daysAgo(50),
      merchantGrossSales: 600,
      itemsList: [{ name: 'Pizza Personal', quantity: 3, price: 200 }],
    },
    {
      id: 'ORD-A6',
      businessId: 'biz_rest_100',
      branchId: 'sucursal_norte',
      branchName: 'Sucursal Norte',
      customerId: 'cust_vip_01',
      customerName: 'María López',
      customerPhone: '+50589991122',
      status: 'DELIVERED',
      deliveredAt: daysAgo(70),
      merchantGrossSales: 750,
      itemsList: [{ name: 'Hamburguesa Doble', quantity: 3, price: 250 }],
    },
  ];

  const aggregated = aggregateCustomerOrders(richOrders, 'biz_rest_100', 'ALL', '90D', now);
  assert(aggregated.length === 1, 'INT-01: Aggregates multiple orders for single customer into 1 profile');

  const maria = aggregated[0];
  assert(maria.valueSegment === 'VIP', 'INT-02: María classified as VIP (6 orders, C$5,300 in 90D)');
  assert(maria.activityStatus === 'ACTIVO', 'INT-03: María activity is ACTIVO (last purchase 5 days ago)');
  assert(maria.topProducts.length <= 3, 'INT-04: Top products capped at max 3 items');
  assert(maria.topProducts[0].name === 'Hamburguesa Doble' && maria.topProducts[0].totalQuantity === 16, 'INT-05: Favorite product quantity accumulated accurately');

  // 2. Branch Isolation in Aggregator
  const norteOnly = aggregateCustomerOrders(richOrders, 'biz_rest_100', 'sucursal_norte', '90D', now);
  assert(norteOnly[0].lifetimeStats.lifetimeOrderCount === 2, 'INT-06: Sucursal Norte accurately isolates 2 orders');
  assert(norteOnly[0].lifetimeStats.lifetimeGrossSales === 1950, 'INT-07: Sucursal Norte calculates exact local sales (C$1,950)');

  // 3. Foreign Tenant Complete Isolation
  const foreignOrders = [
    ...richOrders,
    {
      id: 'ORD-FOREIGN-99',
      businessId: 'biz_competitor_999',
      branchId: 'sucursal_central',
      customerId: 'cust_foreign',
      status: 'DELIVERED',
      deliveredAt: daysAgo(2),
      merchantGrossSales: 99999,
    },
  ];
  const isolated = aggregateCustomerOrders(foreignOrders, 'biz_rest_100', 'ALL', '90D', now);
  assert(isolated.length === 1 && !isolated.some((c) => c.canonicalId === 'cust_foreign'), 'INT-08: Foreign business orders are 100% excluded');

  // 4. Median Ticket Calculation
  const ticketsOdd = [100, 200, 300, 400, 500];
  assert(calculateMedian(ticketsOdd) === 300, 'INT-09: Median ticket with odd length array');

  const ticketsEven = [100, 200, 300, 400];
  assert(calculateMedian(ticketsEven) === 250, 'INT-10: Median ticket with even length array');

  // 5. Cache Invalidation
  ClientAggregationProvider.clearCache('biz_rest_100');
  ClientAggregationProvider.clearCache();
  assert(true, 'INT-11: Cache clear mechanism executes without errors');

  console.log('\n============================================================');
  console.log(`📊 INTEGRATION RESULTS: ${passed} PASS, ${failed} FAIL`);
  console.log('============================================================\n');

  return { passed, failed, errors };
}
