/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Filter Bar for Customer Intelligence
 */

import React from 'react';
import { Search, Calendar, Store, RotateCcw } from 'lucide-react';
import { BranchOption, CustomerActivityStatus, CustomerFilterState, CustomerValueSegment, PeriodWindow } from '../types';

interface CustomerFilterBarProps {
  filterState: CustomerFilterState;
  onFilterChange: (updates: Partial<CustomerFilterState>) => void;
  branches: BranchOption[];
  onResetFilters: () => void;
}

export const CustomerFilterBar: React.FC<CustomerFilterBarProps> = ({
  filterState,
  onFilterChange,
  branches,
  onResetFilters,
}) => {
  const periodOptions: Array<{ id: PeriodWindow; label: string }> = [
    { id: '30D', label: '30 Días' },
    { id: '60D', label: '60 Días' },
    { id: '90D', label: '90 Días' },
    { id: '12M', label: '12 Meses' },
    { id: 'LIFETIME', label: 'Histórico' },
  ];

  const valueSegments: Array<{ id: CustomerValueSegment | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'Todos' },
    { id: 'VIP', label: '⭐ VIP' },
    { id: 'FRECUENTE', label: '🔷 Frecuente' },
    { id: 'RECURRENTE', label: '🟢 Recurrente' },
    { id: 'NUEVO', label: '⚪ Nuevo' },
  ];

  const activityStatuses: Array<{ id: CustomerActivityStatus | 'ALL'; label: string }> = [
    { id: 'ALL', label: 'Todos' },
    { id: 'ACTIVO', label: '🟢 Activo (≤30d)' },
    { id: 'EN_RIESGO', label: '🟡 En Riesgo (31-60d)' },
    { id: 'INACTIVO', label: '🟠 Inactivo (>60d)' },
  ];

  const hasActiveFilters =
    filterState.searchTerm !== '' ||
    filterState.valueSegment !== 'ALL' ||
    filterState.activityStatus !== 'ALL' ||
    filterState.branchId !== 'ALL' ||
    filterState.periodWindow !== '90D';

  return (
    <div className="bg-obsidian-900 border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
      {/* Top Row: Search + Period + Branch */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={filterState.searchTerm}
            onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
            className="w-full pl-10 pr-4 py-2 bg-obsidian-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
          />
        </div>

        {/* Period Selector & Branch Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="bg-obsidian-950 border border-slate-800 rounded-xl p-1 flex items-center gap-1 overflow-x-auto max-w-full">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1 mr-0.5 shrink-0" />
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onFilterChange({ periodWindow: opt.id })}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all shrink-0 ${
                  filterState.periodWindow === opt.id
                    ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Branch Dropdown */}
          {branches.length > 0 && (
            <div className="relative">
              <div className="flex items-center gap-1.5 bg-obsidian-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterState.branchId}
                  onChange={(e) => onFilterChange({ branchId: e.target.value })}
                  className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-obsidian-900 text-slate-200">
                    Todas las Sucursales
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-obsidian-900 text-slate-200">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
              title="Restablecer filtros"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Value Segment & Activity Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
        {/* Value Segments */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-slate-500 shrink-0 font-medium mr-1">Valor:</span>
          {valueSegments.map((seg) => (
            <button
              key={seg.id}
              onClick={() => onFilterChange({ valueSegment: seg.id })}
              className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                filterState.valueSegment === seg.id
                  ? 'bg-slate-700 text-slate-100 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        {/* Activity Statuses */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-slate-500 shrink-0 font-medium mr-1">Actividad:</span>
          {activityStatuses.map((st) => (
            <button
              key={st.id}
              onClick={() => onFilterChange({ activityStatus: st.id })}
              className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                filterState.activityStatus === st.id
                  ? 'bg-slate-700 text-slate-100 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
