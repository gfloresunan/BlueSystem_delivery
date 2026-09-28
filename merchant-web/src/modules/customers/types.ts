/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Domain types and data models for Customer Intelligence & VIP Loyalty
 */

export type CustomerValueSegment = 'VIP' | 'FRECUENTE' | 'RECURRENTE' | 'NUEVO' | 'UNCLASSIFIED';

export type CustomerActivityStatus = 'ACTIVO' | 'EN_RIESGO' | 'INACTIVO';

export type CustomerDataQuality = 'VALID' | 'UNRESOLVED_IDENTITY' | 'ANONYMOUS' | 'CORRUPT';

export type PeriodWindow = '30D' | '60D' | '90D' | '12M' | 'LIFETIME';

export interface CustomerOrderSummary {
  orderId: string;
  orderNumber: string;
  merchantGrossSales: number;
  effectivePurchaseAt: Date;
  branchId?: string;
  itemsCount: number;
  itemsList: Array<{ name: string; quantity: number; price: number }>;
}

export interface CustomerTopProduct {
  name: string;
  totalQuantity: number;
  totalSpent: number;
}

export interface CustomerLifetimeStats {
  firstPurchaseAt: Date | null;
  lastPurchaseAt: Date | null;
  lifetimeOrderCount: number;
  lifetimeGrossSales: number;
  lifetimeAverageTicket: number;
  daysAsCustomer: number;
  daysSinceLastPurchase: number;
}

export interface CustomerPeriodStats {
  periodWindow: PeriodWindow;
  periodOrderCount: number;
  periodGrossSales: number;
  periodAverageTicket: number;
}

export interface CustomerExplainability {
  valueTitle: string;
  valueReason: string;
  activityTitle: string;
  activityReason: string;
  metricsAudit: {
    ordersInPeriod: number;
    salesInPeriod: number;
    daysSinceLastPurchase: number;
    lifetimeOrders: number;
    lifetimeSales: number;
  };
}

export interface CustomerIntelligenceProfile {
  id: string; // effectiveCustomerId
  canonicalId: string;
  name: string;
  phone?: string;
  maskedPhone?: string;
  dataQuality: CustomerDataQuality;
  
  // Dual Dimensions
  valueSegment: CustomerValueSegment;
  activityStatus: CustomerActivityStatus;
  
  // Stats
  lifetimeStats: CustomerLifetimeStats;
  periodStats: CustomerPeriodStats;
  
  // Top Products & Orders
  topProducts: CustomerTopProduct[];
  validOrders: CustomerOrderSummary[];
  
  // Explainability & Diagnostics
  explainability: CustomerExplainability;
  
  // Ranking
  rank?: number;
}

export interface CustomerKpiMetrics {
  totalCustomers: number;
  vipCustomers: number;
  frequentCustomers: number;
  recurrentCustomers: number;
  newCustomers: number;
  vipAttributableSales: number;
  totalPeriodSales: number;
  medianTicket: number;
  retentionRate: number; // percentage of active customers
}

export interface CustomerFilterState {
  searchTerm: string;
  valueSegment: CustomerValueSegment | 'ALL';
  activityStatus: CustomerActivityStatus | 'ALL';
  periodWindow: PeriodWindow;
  branchId: string | 'ALL';
  sortBy: 'SALES' | 'ORDERS' | 'RECENCY' | 'NAME';
  sortDirection: 'ASC' | 'DESC';
}

export interface BranchOption {
  id: string;
  name: string;
}
