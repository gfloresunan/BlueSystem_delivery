/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Pure calculation engine for Customer Intelligence & VIP Loyalty
 */

import {
  CustomerActivityStatus,
  CustomerDataQuality,
  CustomerExplainability,
  CustomerIntelligenceProfile,
  CustomerLifetimeStats,
  CustomerOrderSummary,
  CustomerPeriodStats,
  CustomerTopProduct,
  CustomerValueSegment,
  PeriodWindow
} from '../types';

export const CUSTOMER_INTELLIGENCE_THRESHOLDS = {
  VIP_MIN_ORDERS_90D: 6,
  VIP_MIN_GROSS_SALES_90D: 3500.0,
  FREQUENT_MIN_ORDERS_90D: 4,
  RECURRENT_MIN_ORDERS_90D: 2,
  RECURRENT_MAX_ORDERS_90D: 3,
  NEW_CUSTOMER_MAX_DAYS_FIRST_PURCHASE: 30,
  NEW_CUSTOMER_EXACT_LIFETIME_ORDERS: 1,
  ACTIVITY_ACTIVE_MAX_DAYS: 30,
  ACTIVITY_AT_RISK_MIN_DAYS: 31,
  ACTIVITY_AT_RISK_MAX_DAYS: 60,
  ACTIVITY_INACTIVE_MIN_DAYS: 61,
} as const;

/**
 * DEC-01: Canonical Identity Resolution
 * Priority: customerId -> clienteId -> userId -> uid
 */
export function resolveCustomerIdentity(data: any): { canonicalId: string | null; quality: CustomerDataQuality } {
  if (!data || typeof data !== 'object') {
    return { canonicalId: null, quality: 'CORRUPT' };
  }

  const rawId = data.customerId || data.clienteId || data.userId || data.uid;
  if (typeof rawId === 'string' && rawId.trim().length > 0) {
    return { canonicalId: rawId.trim(), quality: 'VALID' };
  }

  // If no canonical ID exists, check if there are auxiliary signals (name or phone)
  const hasPhone = typeof data.customerPhone === 'string' && data.customerPhone.trim().length > 0;
  const hasName = typeof data.customerName === 'string' && data.customerName.trim().length > 0;

  if (hasPhone || hasName) {
    return { canonicalId: null, quality: 'UNRESOLVED_IDENTITY' };
  }

  return { canonicalId: null, quality: 'ANONYMOUS' };
}

/**
 * DEC-02: Valid Purchase Evaluation
 * DELIVERED (primary) or COMPLETED (fallback when deliveredAt is missing).
 * Excludes CANCELLED, REJECTED, REFUNDED.
 */
export function isValidPurchase(data: any): boolean {
  if (!data || typeof data !== 'object') return false;

  const rawStatus = String(data.canonicalStatus || data.status || data.estado || '').trim().toUpperCase();
  const courierPhase = Number(data.courierPhase || 0);

  // Explicitly excluded terminal states
  if (
    rawStatus === 'CANCELLED' ||
    rawStatus === 'REJECTED' ||
    rawStatus === 'REFUNDED' ||
    rawStatus === 'CANCELADO' ||
    rawStatus === 'RECHAZADO'
  ) {
    return false;
  }

  // Valid terminal states
  if (
    rawStatus === 'DELIVERED' ||
    rawStatus === 'COMPLETED' ||
    rawStatus === 'ENTREGADO' ||
    rawStatus === 'COMPLETADO' ||
    courierPhase === 4
  ) {
    return true;
  }

  return false;
}

/**
 * DEC-04: Effective Purchase Timestamp
 * Precedence: deliveredAt -> completedAt -> createdAt
 */
export function resolveEffectivePurchaseAt(data: any): Date | null {
  if (!data || typeof data !== 'object') return null;

  const rawDate = data.deliveredAt || data.entregadoAt || data.completedAt || data.createdAt || data.fecha;
  if (!rawDate) return null;

  // Handle JavaScript Date instance
  if (rawDate instanceof Date) {
    if (!isNaN(rawDate.getTime())) {
      return rawDate;
    }
  }

  // Handle Firestore Timestamp object ({ seconds, nanoseconds } or toDate())
  if (typeof rawDate.toDate === 'function') {
    try {
      return rawDate.toDate();
    } catch {
      // Fallback
    }
  }

  if (typeof rawDate.seconds === 'number') {
    return new Date(rawDate.seconds * 1000);
  }

  if (typeof rawDate === 'string' || typeof rawDate === 'number') {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  return null;
}

/**
 * DEC-03: Monetary Value Resolution
 * Uses merchantGrossSales strictly (falling back to calculated subtotal minus discounts if missing).
 * Excludes deliveryFee, tipAmount.
 */
export function resolveMerchantGrossSales(data: any): number {
  if (!data || typeof data !== 'object') return 0;

  if (typeof data.merchantGrossSales === 'number' && !isNaN(data.merchantGrossSales) && data.merchantGrossSales >= 0) {
    return data.merchantGrossSales;
  }

  // Fallback calculation: subtotalAmount - couponDiscount
  const subtotal = Number(data.subtotalAmount || data.subtotal || 0);
  const discount = Number(data.couponDiscount || data.discountAmount || 0);
  const calculated = Math.max(0, subtotal - discount);

  if (calculated > 0) {
    return calculated;
  }

  // Total fallback without shipping & tip if available
  const total = Number(data.totalAmount || data.total || 0);
  const shipping = Number(data.deliveryFee || data.costoEnvio || 0);
  const tip = Number(data.tipAmount || data.propina || 0);
  const baseGross = Math.max(0, total - shipping - tip);

  return baseGross;
}

/**
 * Mask Phone Utility (DEC-15)
 * E.164 / Local -> +505 ••••-••99 or ••••••99
 */
export function maskPhone(phone?: string): string {
  if (!phone || typeof phone !== 'string') return 'No disponible';
  const clean = phone.trim();
  if (clean.length < 4) return '••••';

  const lastTwo = clean.slice(-2);
  const prefix = clean.startsWith('+') ? clean.slice(0, 4) : '';
  return `${prefix} ••••-••${lastTwo}`;
}

/**
 * Deduplicate orders by orderId (DEC-02 Invariant: 1 orderId = max 1 purchase)
 */
export function deduplicateOrders(rawOrders: any[]): any[] {
  if (!Array.isArray(rawOrders)) return [];

  const seen = new Set<string>();
  const unique: any[] = [];

  for (const order of rawOrders) {
    if (!order) continue;
    const orderId = String(order.id || order.orderId || order.orderNumber || '').trim();
    if (!orderId) {
      // If no ID at all, treat as unique if valid
      unique.push(order);
      continue;
    }

    if (!seen.has(orderId)) {
      seen.add(orderId);
      unique.push(order);
    }
  }

  return unique;
}

/**
 * Filter orders by date window relative to reference date (now)
 */
export function getWindowCutoffDate(window: PeriodWindow, now: Date = new Date()): Date {
  const cutoff = new Date(now.getTime());
  switch (window) {
    case '30D':
      cutoff.setDate(cutoff.getDate() - 30);
      break;
    case '60D':
      cutoff.setDate(cutoff.getDate() - 60);
      break;
    case '90D':
      cutoff.setDate(cutoff.getDate() - 90);
      break;
    case '12M':
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
    case 'LIFETIME':
    default:
      return new Date(0); // Epoch start
  }
  return cutoff;
}

/**
 * Calculate Median of numbers
 */
export function calculateMedian(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Parse Order Items for Top Products calculation
 */
export function extractOrderItems(order: any): Array<{ name: string; quantity: number; price: number }> {
  const result: Array<{ name: string; quantity: number; price: number }> = [];
  if (!order) return result;

  if (Array.isArray(order.itemsList)) {
    for (const it of order.itemsList) {
      if (it && typeof it === 'object') {
        const name = String(it.name || it.productName || 'Producto').trim();
        const quantity = Number(it.quantity || 1);
        const price = Number(it.price || 0);
        result.push({ name, quantity: Math.max(1, quantity), price });
      }
    }
    return result;
  }

  if (Array.isArray(order.items)) {
    for (const it of order.items) {
      if (it && typeof it === 'object') {
        const name = String(it.name || it.productName || it.title || 'Producto').trim();
        const quantity = Number(it.quantity || 1);
        const price = Number(it.price || 0);
        result.push({ name, quantity: Math.max(1, quantity), price });
      }
    }
    return result;
  }

  return result;
}

/**
 * DEC-07, DEC-08, DEC-17: Value Segment & Activity Classification
 */
export function classifyCustomer(
  lifetimeStats: CustomerLifetimeStats,
  orders90dCount: number,
  grossSales90d: number
): {
  valueSegment: CustomerValueSegment;
  activityStatus: CustomerActivityStatus;
  explainability: CustomerExplainability;
} {
  const { lifetimeOrderCount, lifetimeGrossSales, daysSinceLastPurchase } = lifetimeStats;

  // 1. Calculate Activity Status
  let activityStatus: CustomerActivityStatus = 'INACTIVO';
  let activityTitle = 'Inactivo';
  let activityReason = `Sin compras registradas en los últimos ${daysSinceLastPurchase} días (>60 días).`;

  if (daysSinceLastPurchase <= CUSTOMER_INTELLIGENCE_THRESHOLDS.ACTIVITY_ACTIVE_MAX_DAYS) {
    activityStatus = 'ACTIVO';
    activityTitle = 'Activo';
    activityReason = `Última compra realizada hace ${daysSinceLastPurchase} días (≤30 días).`;
  } else if (daysSinceLastPurchase <= CUSTOMER_INTELLIGENCE_THRESHOLDS.ACTIVITY_AT_RISK_MAX_DAYS) {
    activityStatus = 'EN_RIESGO';
    activityTitle = 'En Riesgo';
    activityReason = `Última compra hace ${daysSinceLastPurchase} días (en ventana de desaceleración 31-60 días).`;
  }

  // 2. Calculate Value Segment
  let valueSegment: CustomerValueSegment = 'UNCLASSIFIED';
  let valueTitle = 'Sin Segmento Activo';
  let valueReason = 'Cliente con compras esporádicas fuera de los umbrales de fidelización.';

  // Check 1: 1 Lifetime order
  if (lifetimeOrderCount === CUSTOMER_INTELLIGENCE_THRESHOLDS.NEW_CUSTOMER_EXACT_LIFETIME_ORDERS) {
    const daysSinceFirst = lifetimeStats.daysAsCustomer;
    if (daysSinceFirst <= CUSTOMER_INTELLIGENCE_THRESHOLDS.NEW_CUSTOMER_MAX_DAYS_FIRST_PURCHASE) {
      valueSegment = 'NUEVO';
      valueTitle = 'Nuevo';
      valueReason = `Primera compra realizada hace ${daysSinceFirst} días (≤30 días) con exactamente 1 pedido histórico.`;
    } else {
      valueSegment = 'UNCLASSIFIED';
      valueTitle = 'Sin Segmento de Fidelización';
      valueReason = `1 único pedido registrado hace ${daysSinceFirst} días (no cumple criterio de Nuevo ≤30d).`;
    }
  } else {
    // Multi-order customer evaluation: Check 90D metrics
    const isVip =
      orders90dCount >= CUSTOMER_INTELLIGENCE_THRESHOLDS.VIP_MIN_ORDERS_90D &&
      grossSales90d >= CUSTOMER_INTELLIGENCE_THRESHOLDS.VIP_MIN_GROSS_SALES_90D;

    if (isVip) {
      valueSegment = 'VIP';
      valueTitle = 'VIP';
      valueReason = `Cumple los requisitos VIP: ${orders90dCount} pedidos (≥6) y C$ ${grossSales90d.toLocaleString('es-NI', { minimumFractionDigits: 2 })} (≥C$3,500) en los últimos 90 días.`;
    } else if (orders90dCount >= CUSTOMER_INTELLIGENCE_THRESHOLDS.FREQUENT_MIN_ORDERS_90D) {
      valueSegment = 'FRECUENTE';
      valueTitle = 'Frecuente';
      valueReason = `Registra ${orders90dCount} pedidos (≥4) en los últimos 90 días con consumo de C$ ${grossSales90d.toLocaleString('es-NI', { minimumFractionDigits: 2 })}.`;
    } else if (
      orders90dCount >= CUSTOMER_INTELLIGENCE_THRESHOLDS.RECURRENT_MIN_ORDERS_90D &&
      orders90dCount <= CUSTOMER_INTELLIGENCE_THRESHOLDS.RECURRENT_MAX_ORDERS_90D
    ) {
      valueSegment = 'RECURRENTE';
      valueTitle = 'Recurrente';
      valueReason = `Registra ${orders90dCount} pedidos (2-3) en los últimos 90 días en proceso de fidelización.`;
    } else {
      // Historical High-Value evaluation (VIP Histórico / Frecuente Histórico)
      if (lifetimeOrderCount >= 10 || lifetimeGrossSales >= 10000) {
        valueTitle = 'Histórico Alto Valor';
        valueReason = `Registra ${lifetimeOrderCount} pedidos y C$ ${lifetimeGrossSales.toLocaleString('es-NI', { minimumFractionDigits: 2 })} en el histórico total del comercio.`;
      }
    }
  }

  const explainability: CustomerExplainability = {
    valueTitle,
    valueReason,
    activityTitle,
    activityReason,
    metricsAudit: {
      ordersInPeriod: orders90dCount,
      salesInPeriod: grossSales90d,
      daysSinceLastPurchase,
      lifetimeOrders: lifetimeOrderCount,
      lifetimeSales: lifetimeGrossSales,
    },
  };

  return { valueSegment, activityStatus, explainability };
}

/**
 * Aggregate Raw Orders into Customer Intelligence Profiles
 */
export function aggregateCustomerOrders(
  rawOrders: any[],
  currentBusinessId: string,
  selectedBranchId: string | 'ALL' = 'ALL',
  periodWindow: PeriodWindow = '90D',
  now: Date = new Date()
): CustomerIntelligenceProfile[] {
  if (!Array.isArray(rawOrders) || rawOrders.length === 0) {
    return [];
  }

  // 1. Deduplicate by orderId
  const uniqueOrders = deduplicateOrders(rawOrders);

  // 2. Group valid orders by canonical customer identity
  const customerMap = new Map<
    string,
    {
      canonicalId: string;
      name: string;
      phone?: string;
      dataQuality: CustomerDataQuality;
      lifetimeOrders: CustomerOrderSummary[];
      windowOrders: CustomerOrderSummary[];
      productMap: Map<string, { totalQuantity: number; totalSpent: number }>;
    }
  >();

  const windowCutoff = getWindowCutoffDate(periodWindow, now);
  const cutoff90d = getWindowCutoffDate('90D', now);

  for (const order of uniqueOrders) {
    // Multi-tenant check
    const orderBizId = String(order.businessId || order.comercioId || '').trim();
    if (orderBizId && currentBusinessId && orderBizId !== currentBusinessId) {
      continue; // Strictly ignore foreign tenant orders
    }

    // Branch filter check
    const orderBranchId = String(order.branchId || order.sucursalId || '').trim();
    if (selectedBranchId !== 'ALL' && orderBranchId !== selectedBranchId) {
      continue;
    }

    // Valid purchase check
    if (!isValidPurchase(order)) {
      continue;
    }

    // Effective date check
    const effectiveDate = resolveEffectivePurchaseAt(order);
    if (!effectiveDate) {
      continue; // Ignore corrupt dates
    }

    // Identity check
    const { canonicalId, quality } = resolveCustomerIdentity(order);
    if (!canonicalId) {
      // Unresolved or anonymous purchases don't form valid profiles
      continue;
    }

    const grossSales = resolveMerchantGrossSales(order);
    const orderNumber = String(order.orderNumber || order.id || 'PED-000');
    const customerName = String(order.customerName || order.clienteNombre || 'Cliente').trim();
    const customerPhone = order.customerPhone || order.telefono;

    const items = extractOrderItems(order);

    const summary: CustomerOrderSummary = {
      orderId: String(order.id || order.orderId || orderNumber),
      orderNumber,
      merchantGrossSales: grossSales,
      effectivePurchaseAt: effectiveDate,
      branchId: orderBranchId || undefined,
      itemsCount: items.reduce((acc, it) => acc + it.quantity, 0),
      itemsList: items,
    };

    if (!customerMap.has(canonicalId)) {
      customerMap.set(canonicalId, {
        canonicalId,
        name: customerName,
        phone: customerPhone,
        dataQuality: quality,
        lifetimeOrders: [],
        windowOrders: [],
        productMap: new Map(),
      });
    }

    const entry = customerMap.get(canonicalId)!;
    if (entry.name === 'Cliente' && customerName !== 'Cliente') {
      entry.name = customerName;
    }
    if (!entry.phone && customerPhone) {
      entry.phone = customerPhone;
    }

    // Add to lifetime
    entry.lifetimeOrders.push(summary);

    // Add to window if applicable
    if (effectiveDate >= windowCutoff) {
      entry.windowOrders.push(summary);
    }

    // Accumulate products for top product calculation
    for (const it of items) {
      const existing = entry.productMap.get(it.name) || { totalQuantity: 0, totalSpent: 0 };
      existing.totalQuantity += it.quantity;
      existing.totalSpent += it.quantity * it.price;
      entry.productMap.set(it.name, existing);
    }
  }

  // 3. Transform grouped data into CustomerIntelligenceProfile items
  const profiles: CustomerIntelligenceProfile[] = [];

  for (const [id, entry] of customerMap.entries()) {
    if (entry.lifetimeOrders.length === 0) continue;

    // Sort orders descending by effective date
    entry.lifetimeOrders.sort((a, b) => b.effectivePurchaseAt.getTime() - a.effectivePurchaseAt.getTime());

    const firstPurchaseAt = entry.lifetimeOrders[entry.lifetimeOrders.length - 1].effectivePurchaseAt;
    const lastPurchaseAt = entry.lifetimeOrders[0].effectivePurchaseAt;

    const lifetimeGrossSales = entry.lifetimeOrders.reduce((acc, o) => acc + o.merchantGrossSales, 0);
    const lifetimeOrderCount = entry.lifetimeOrders.length;
    const lifetimeAverageTicket = lifetimeOrderCount > 0 ? lifetimeGrossSales / lifetimeOrderCount : 0;

    const diffDays = (d1: Date, d2: Date) => Math.max(0, Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAsCustomer = diffDays(now, firstPurchaseAt);
    const daysSinceLastPurchase = diffDays(now, lastPurchaseAt);

    const lifetimeStats: CustomerLifetimeStats = {
      firstPurchaseAt,
      lastPurchaseAt,
      lifetimeOrderCount,
      lifetimeGrossSales,
      lifetimeAverageTicket,
      daysAsCustomer,
      daysSinceLastPurchase,
    };

    // Calculate period stats
    const periodGrossSales = entry.windowOrders.reduce((acc, o) => acc + o.merchantGrossSales, 0);
    const periodOrderCount = entry.windowOrders.length;
    const periodAverageTicket = periodOrderCount > 0 ? periodGrossSales / periodOrderCount : 0;

    const periodStats: CustomerPeriodStats = {
      periodWindow,
      periodOrderCount,
      periodGrossSales,
      periodAverageTicket,
    };

    // Calculate 90-day specific metrics for classification (Standardized Baseline)
    const orders90d = entry.lifetimeOrders.filter((o) => o.effectivePurchaseAt >= cutoff90d);
    const orders90dCount = orders90d.length;
    const grossSales90d = orders90d.reduce((acc, o) => acc + o.merchantGrossSales, 0);

    // Classify
    const { valueSegment, activityStatus, explainability } = classifyCustomer(
      lifetimeStats,
      orders90dCount,
      grossSales90d
    );

    // Top 3 Products
    const topProducts: CustomerTopProduct[] = Array.from(entry.productMap.entries())
      .map(([name, data]) => ({ name, totalQuantity: data.totalQuantity, totalSpent: data.totalSpent }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 3);

    profiles.push({
      id,
      canonicalId: id,
      name: entry.name,
      phone: entry.phone,
      maskedPhone: maskPhone(entry.phone),
      dataQuality: entry.dataQuality,
      valueSegment,
      activityStatus,
      lifetimeStats,
      periodStats,
      topProducts,
      validOrders: entry.lifetimeOrders,
      explainability,
    });
  }

  return profiles;
}

/**
 * DEC-09: Deterministic Sorting of Customers
 * Default: merchantGrossSales DESC -> orderCount DESC -> effectivePurchaseAt DESC -> customerName ASC
 */
export function sortCustomers(
  customers: CustomerIntelligenceProfile[],
  sortBy: 'SALES' | 'ORDERS' | 'RECENCY' | 'NAME' = 'SALES',
  sortDirection: 'ASC' | 'DESC' = 'DESC'
): CustomerIntelligenceProfile[] {
  const sorted = [...customers].sort((a, b) => {
    let cmp = 0;

    switch (sortBy) {
      case 'SALES':
        cmp = (b.periodStats.periodGrossSales || 0) - (a.periodStats.periodGrossSales || 0);
        break;
      case 'ORDERS':
        cmp = (b.periodStats.periodOrderCount || 0) - (a.periodStats.periodOrderCount || 0);
        break;
      case 'RECENCY': {
        const timeA = a.lifetimeStats.lastPurchaseAt?.getTime() || 0;
        const timeB = b.lifetimeStats.lastPurchaseAt?.getTime() || 0;
        cmp = timeB - timeA;
        break;
      }
      case 'NAME':
        cmp = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
        break;
    }

    if (cmp !== 0) {
      return sortDirection === 'DESC' ? cmp : -cmp;
    }

    // Deterministic Tie-Breaking Chain:
    // 1. Sales DESC
    const tieSales = (b.periodStats.periodGrossSales || 0) - (a.periodStats.periodGrossSales || 0);
    if (tieSales !== 0) return tieSales;

    // 2. Orders DESC
    const tieOrders = (b.periodStats.periodOrderCount || 0) - (a.periodStats.periodOrderCount || 0);
    if (tieOrders !== 0) return tieOrders;

    // 3. Recency DESC
    const timeA = a.lifetimeStats.lastPurchaseAt?.getTime() || 0;
    const timeB = b.lifetimeStats.lastPurchaseAt?.getTime() || 0;
    const tieRecency = timeB - timeA;
    if (tieRecency !== 0) return tieRecency;

    // 4. Name ASC
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });

  // Assign deterministic ranks
  return sorted.map((c, idx) => ({ ...c, rank: idx + 1 }));
}
