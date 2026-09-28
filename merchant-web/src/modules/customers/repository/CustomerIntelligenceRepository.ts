/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Repository & Data Access Layer for Customer Intelligence
 */

import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../../shared/services/firebase';
import { CustomerIntelligenceProfile, CustomerKpiMetrics, PeriodWindow, BranchOption } from '../types';
import {
  aggregateCustomerOrders,
  calculateMedian,
  sortCustomers
} from '../utils/customerCalculations';

export interface ICustomerIntelligenceProvider {
  fetchCustomerProfiles(
    businessId: string,
    selectedBranchId?: string | 'ALL',
    periodWindow?: PeriodWindow
  ): Promise<{ profiles: CustomerIntelligenceProfile[]; kpis: CustomerKpiMetrics; branches: BranchOption[] }>;
}

export class ClientAggregationProvider implements ICustomerIntelligenceProvider {
  // In-memory cache keyed by businessId
  private static cache: Map<string, { timestamp: number; rawOrders: any[] }> = new Map();
  private static CACHE_TTL_MS = 60 * 1000; // 1 minute session cache

  async fetchCustomerProfiles(
    businessId: string,
    selectedBranchId: string | 'ALL' = 'ALL',
    periodWindow: PeriodWindow = '90D',
    forceRefresh = false
  ): Promise<{ profiles: CustomerIntelligenceProfile[]; kpis: CustomerKpiMetrics; branches: BranchOption[] }> {
    if (!businessId) {
      return {
        profiles: [],
        kpis: this.getEmptyKpiMetrics(),
        branches: [],
      };
    }

    let rawOrders: any[] = [];
    const cached = ClientAggregationProvider.cache.get(businessId);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < ClientAggregationProvider.CACHE_TTL_MS) {
      rawOrders = cached.rawOrders;
    } else {
      try {
        const ordersRef = collection(db, 'orders');
        // Multi-tenant query: strictly bounded by businessId
        const q = query(
          ordersRef,
          where('businessId', '==', businessId),
          limit(3000)
        );

        const snap = await getDocs(q);
        rawOrders = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Update in-memory session cache
        ClientAggregationProvider.cache.set(businessId, {
          timestamp: now,
          rawOrders,
        });
      } catch (err) {
        console.error('[CustomerIntelligenceRepository] Error fetching orders:', err);
        throw err;
      }
    }

    // Extract available branches dynamically from the orders dataset
    const branchMap = new Map<string, string>();
    for (const order of rawOrders) {
      const bId = order.branchId || order.sucursalId;
      const bName = order.branchName || order.sucursalNombre || (bId ? `Sucursal ${bId.slice(-4)}` : null);
      if (bId && bName && !branchMap.has(bId)) {
        branchMap.set(bId, bName);
      }
    }

    const branches: BranchOption[] = Array.from(branchMap.entries()).map(([id, name]) => ({ id, name }));

    // Aggregate profiles using pure calculations
    const profiles = aggregateCustomerOrders(
      rawOrders,
      businessId,
      selectedBranchId,
      periodWindow
    );

    // Default sorting
    const sortedProfiles = sortCustomers(profiles, 'SALES', 'DESC');

    // Calculate aggregated KPI metrics
    const kpis = this.calculateKpis(sortedProfiles);

    return { profiles: sortedProfiles, kpis, branches };
  }

  private calculateKpis(profiles: CustomerIntelligenceProfile[]): CustomerKpiMetrics {
    const totalCustomers = profiles.length;
    let vipCustomers = 0;
    let frequentCustomers = 0;
    let recurrentCustomers = 0;
    let newCustomers = 0;
    let activeCustomers = 0;
    let vipAttributableSales = 0;
    let totalPeriodSales = 0;
    const tickets: number[] = [];

    for (const p of profiles) {
      if (p.valueSegment === 'VIP') {
        vipCustomers++;
        vipAttributableSales += p.periodStats.periodGrossSales;
      } else if (p.valueSegment === 'FRECUENTE') {
        frequentCustomers++;
      } else if (p.valueSegment === 'RECURRENTE') {
        recurrentCustomers++;
      } else if (p.valueSegment === 'NUEVO') {
        newCustomers++;
      }

      if (p.activityStatus === 'ACTIVO') {
        activeCustomers++;
      }

      totalPeriodSales += p.periodStats.periodGrossSales;
      if (p.periodStats.periodAverageTicket > 0) {
        tickets.push(p.periodStats.periodAverageTicket);
      }
    }

    const medianTicket = calculateMedian(tickets);
    const retentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;

    return {
      totalCustomers,
      vipCustomers,
      frequentCustomers,
      recurrentCustomers,
      newCustomers,
      vipAttributableSales,
      totalPeriodSales,
      medianTicket,
      retentionRate,
    };
  }

  private getEmptyKpiMetrics(): CustomerKpiMetrics {
    return {
      totalCustomers: 0,
      vipCustomers: 0,
      frequentCustomers: 0,
      recurrentCustomers: 0,
      newCustomers: 0,
      vipAttributableSales: 0,
      totalPeriodSales: 0,
      medianTicket: 0,
      retentionRate: 0,
    };
  }

  public static clearCache(businessId?: string): void {
    if (businessId) {
      ClientAggregationProvider.cache.delete(businessId);
    } else {
      ClientAggregationProvider.cache.clear();
    }
  }
}

export const customerIntelligenceRepository = new ClientAggregationProvider();
