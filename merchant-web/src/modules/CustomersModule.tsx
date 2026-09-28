/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * BSD-CUSTOMER-INTELLIGENCE-PHASE-2-IMPLEMENTATION-001
 * Merchant Web → Clientes VIP & Inteligencia Comercial
 */

import React from 'react';
import { Crown, RefreshCw, AlertCircle, Lightbulb } from 'lucide-react';
import { useGatekeeper } from '../shared/gatekeeper/useGatekeeper';
import { GatekeeperShield } from '../shared/gatekeeper/GatekeeperShield';
import { BSEmptyState } from '../shared/components/bsds/BSEmptyState';
import { useCustomerIntelligence } from './customers/hooks/useCustomerIntelligence';
import { CustomerKpiGrid } from './customers/components/CustomerKpiGrid';
import { CustomerFilterBar } from './customers/components/CustomerFilterBar';
import { CustomerTable } from './customers/components/CustomerTable';
import { CustomerDetailDrawer } from './customers/components/CustomerDetailDrawer';
import { CustomerSkeleton } from './customers/components/CustomerSkeleton';

export const CustomersModule: React.FC = () => {
  // 1. Gatekeeper Authorization Check
  const { isModuleEnabled } = useGatekeeper();
  const decision = isModuleEnabled('customers');

  if (!decision.allowed) {
    return <GatekeeperShield decision={decision} moduleName="Clientes VIP & Fidelización" />;
  }

  // 2. Customer Intelligence Engine Hook
  const {
    profiles,
    totalProfilesCount,
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
  } = useCustomerIntelligence();

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ─── HEADER & ACTIONS ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Crown className="w-5 h-5 fill-amber-400/20" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Clientes VIP & Inteligencia Comercial
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Inteligencia de clientes, segmentación de valor y retención comercial.
          </p>
        </div>

        {/* Refresh & Metadata */}
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-slate-500 hidden sm:inline-block">
              Actualizado: {lastUpdated.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-obsidian-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* ─── LOADING STATE ─────────────────────────────────────────────────── */}
      {isLoading && profiles.length === 0 ? (
        <CustomerSkeleton />
      ) : error ? (
        /* ─── ERROR STATE ───────────────────────────────────────────────────── */
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Error al Cargar Clientes</h3>
            <p className="text-xs text-slate-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => handleRefresh()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Reintentar Carga
          </button>
        </div>
      ) : totalProfilesCount === 0 ? (
        /* ─── EMPTY STATE (NO CUSTOMERS IN COMMERCE) ────────────────────────── */
        <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-2xl space-y-4">
          <BSEmptyState
            type="customers"
            title="Sin clientes registrados aún"
            description="A medida que tus clientes completen pedidos válidos aparecerán automáticamente clasificados con inteligencia de fidelización aquí."
            actionButtonText="Actualizar Datos"
            onActionClick={handleRefresh}
          />
        </div>
      ) : (
        /* ─── MAIN CONTENT ──────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Cold Start Banner (Protection for low data volumes) */}
          {totalProfilesCount > 0 && totalProfilesCount < 5 && (
            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-indigo-300">
              <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200">Inteligencia Comercial en Calibración: </span>
                Actualmente se registran {totalProfilesCount} clientes válidos. Los segmentos se consolidarán con mayor precisión a medida que aumente el volumen de pedidos.
              </div>
            </div>
          )}

          {/* KPI Cards Grid */}
          <CustomerKpiGrid kpis={kpis} periodLabel={periodLabel} />

          {/* Filter Bar */}
          <CustomerFilterBar
            filterState={filterState}
            onFilterChange={updateFilters}
            branches={branches}
            onResetFilters={resetFilters}
          />

          {/* Table / Results */}
          {profiles.length === 0 ? (
            <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <div className="text-3xl">🔍</div>
              <h3 className="text-base font-bold text-slate-200">No se encontraron clientes</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No hay clientes que coincidan con los filtros o la búsqueda seleccionada.
              </p>
              <button
                onClick={resetFilters}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <CustomerTable
              customers={profiles}
              onSelectCustomer={setSelectedCustomer}
              filterState={filterState}
              onSortChange={handleSortChange}
            />
          )}

          {/* Lateral Customer Detail Drawer */}
          <CustomerDetailDrawer
            customer={selectedCustomer}
            isOpen={selectedCustomer !== null}
            onClose={() => setSelectedCustomer(null)}
            periodLabel={periodLabel}
          />
        </div>
      )}
    </div>
  );
};
