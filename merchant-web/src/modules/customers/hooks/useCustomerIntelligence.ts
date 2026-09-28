/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * React Hook for Customer Intelligence State & Filtering
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { customerIntelligenceRepository } from '../repository/CustomerIntelligenceRepository';
import {
  BranchOption,
  CustomerFilterState,
  CustomerIntelligenceProfile,
  CustomerKpiMetrics
} from '../types';
import { sortCustomers } from '../utils/customerCalculations';

const initialFilterState: CustomerFilterState = {
  searchTerm: '',
  valueSegment: 'ALL',
  activityStatus: 'ALL',
  periodWindow: '90D',
  branchId: 'ALL',
  sortBy: 'SALES',
  sortDirection: 'DESC',
};

const emptyKpis: CustomerKpiMetrics = {
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

export function useCustomerIntelligence() {
  const { identity } = useAuth();
  const businessId = identity?.businessId || identity?.restaurantId || '';

  const [filterState, setFilterState] = useState<CustomerFilterState>(initialFilterState);
  const [profiles, setProfiles] = useState<CustomerIntelligenceProfile[]>([]);
  const [kpis, setKpis] = useState<CustomerKpiMetrics>(emptyKpis);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerIntelligenceProfile | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch profiles from repository
  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!businessId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await customerIntelligenceRepository.fetchCustomerProfiles(
          businessId,
          filterState.branchId,
          filterState.periodWindow,
          forceRefresh
        );

        setProfiles(result.profiles);
        setKpis(result.kpis);
        setBranches(result.branches);
        setLastUpdated(new Date());
      } catch (err: any) {
        console.error('[useCustomerIntelligence] Failed to load data:', err);
        setError('No fue posible cargar la información de inteligencia de clientes.');
      } finally {
        setIsLoading(false);
      }
    },
    [businessId, filterState.branchId, filterState.periodWindow]
  );

  // Initial load or branch/period window change
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Update filter parameters
  const updateFilters = useCallback((updates: Partial<CustomerFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilterState(initialFilterState);
  }, []);

  // Change sort column
  const handleSortChange = useCallback((sortBy: CustomerFilterState['sortBy']) => {
    setFilterState((prev) => {
      if (prev.sortBy === sortBy) {
        return {
          ...prev,
          sortDirection: prev.sortDirection === 'DESC' ? 'ASC' : 'DESC',
        };
      }
      return {
        ...prev,
        sortBy,
        sortDirection: 'DESC',
      };
    });
  }, []);

  // Manual Refresh
  const handleRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // Filter & Sort Profiles in Memory
  const filteredProfiles = useMemo(() => {
    let result = [...profiles];

    // 1. Search term filter
    const term = filterState.searchTerm.trim().toLowerCase();
    if (term.length > 0) {
      result = result.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(term);
        const phoneMatch = p.phone ? p.phone.includes(term) : false;
        return nameMatch || phoneMatch;
      });
    }

    // 2. Value Segment filter
    if (filterState.valueSegment !== 'ALL') {
      result = result.filter((p) => p.valueSegment === filterState.valueSegment);
    }

    // 3. Activity Status filter
    if (filterState.activityStatus !== 'ALL') {
      result = result.filter((p) => p.activityStatus === filterState.activityStatus);
    }

    // 4. Sort
    return sortCustomers(result, filterState.sortBy, filterState.sortDirection);
  }, [profiles, filterState]);

  // Period label for UI
  const periodLabel = useMemo(() => {
    switch (filterState.periodWindow) {
      case '30D':
        return 'Últimos 30 días';
      case '60D':
        return 'Últimos 60 días';
      case '90D':
        return 'Últimos 90 días';
      case '12M':
        return 'Últimos 12 meses';
      case 'LIFETIME':
        return 'Histórico Total';
      default:
        return 'Período activo';
    }
  }, [filterState.periodWindow]);

  return {
    businessId,
    profiles: filteredProfiles,
    totalProfilesCount: profiles.length,
    kpis,
    branches,
    filterState,
    updateFilters,
    resetFilters,
    handleSortChange,
    isLoading,
    error,
    selectedCustomer,
    setSelectedCustomer,
    lastUpdated,
    handleRefresh,
    periodLabel,
  };
}
