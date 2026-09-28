/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Customer Intelligence Table & Mobile Cards
 */

import React from 'react';
import { ChevronRight, ArrowUpDown } from 'lucide-react';
import { CustomerFilterState, CustomerIntelligenceProfile } from '../types';
import { CustomerActivityBadge, CustomerValueBadge } from './CustomerBadges';

interface CustomerTableProps {
  customers: CustomerIntelligenceProfile[];
  onSelectCustomer: (customer: CustomerIntelligenceProfile) => void;
  filterState?: CustomerFilterState;
  onSortChange: (sortBy: CustomerFilterState['sortBy']) => void;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onSelectCustomer,
  onSortChange,
}) => {
  const formatCurrency = (amount: number) => {
    return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '—';
    return date.toLocaleDateString('es-NI', {
      day: '2-digit',
      month: 'short',
    });
  };

  const formatDaysAgo = (days: number) => {
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    return `Hace ${days} d`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block bg-obsidian-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            {/* Table Header */}
            <thead className="bg-obsidian-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                <th className="py-3.5 px-4">
                  <button
                    onClick={() => onSortChange('NAME')}
                    className="flex items-center gap-1 hover:text-slate-200 transition-colors"
                  >
                    <span>Cliente</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Segmento de Valor</th>
                <th className="py-3.5 px-4">Actividad</th>
                <th className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => onSortChange('ORDERS')}
                    className="flex items-center gap-1 mx-auto hover:text-slate-200 transition-colors"
                  >
                    <span>Pedidos</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => onSortChange('SALES')}
                    className="flex items-center gap-1 ml-auto hover:text-slate-200 transition-colors"
                  >
                    <span>Venta Período</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-right">Ticket Prom.</th>
                <th className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => onSortChange('RECENCY')}
                    className="flex items-center gap-1 mx-auto hover:text-slate-200 transition-colors"
                  >
                    <span>Última Compra</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-center w-20">Acción</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  {/* Rank */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-mono font-bold ${
                        customer.rank === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : customer.rank === 2
                          ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                          : customer.rank === 3
                          ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                          : 'text-slate-500 font-normal'
                      }`}
                    >
                      {customer.rank}
                    </span>
                  </td>

                  {/* Customer Name */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">
                      {customer.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{customer.maskedPhone}</div>
                  </td>

                  {/* Value Segment */}
                  <td className="py-3.5 px-4">
                    <CustomerValueBadge
                      segment={customer.valueSegment}
                      explainReason={customer.explainability.valueReason}
                      size="sm"
                    />
                  </td>

                  {/* Activity Status */}
                  <td className="py-3.5 px-4">
                    <CustomerActivityBadge
                      status={customer.activityStatus}
                      explainReason={customer.explainability.activityReason}
                      size="sm"
                    />
                  </td>

                  {/* Orders */}
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-200">
                    {customer.periodStats.periodOrderCount}
                  </td>

                  {/* Gross Sales */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                    {formatCurrency(customer.periodStats.periodGrossSales)}
                  </td>

                  {/* Average Ticket */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-xs">
                    {formatCurrency(customer.periodStats.periodAverageTicket)}
                  </td>

                  {/* Last Purchase */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="text-xs text-slate-300 font-medium">
                      {formatDaysAgo(customer.lifetimeStats.daysSinceLastPurchase)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatDate(customer.lifetimeStats.lastPurchaseAt)}
                    </div>
                  </td>

                  {/* Action Button */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(customer);
                      }}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Ver Detalle"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {customers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => onSelectCustomer(customer)}
            className="bg-obsidian-900 border border-slate-800 rounded-2xl p-4 space-y-3 cursor-pointer active:bg-slate-800/60 transition-colors shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center">
                  #{customer.rank}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">{customer.name}</h3>
                  <div className="text-[11px] text-slate-500 font-mono">{customer.maskedPhone}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <CustomerValueBadge
                segment={customer.valueSegment}
                explainReason={customer.explainability.valueReason}
                size="sm"
              />
              <CustomerActivityBadge
                status={customer.activityStatus}
                explainReason={customer.explainability.activityReason}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Pedidos</span>
                <span className="font-mono font-semibold text-slate-200">
                  {customer.periodStats.periodOrderCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Venta</span>
                <span className="font-mono font-bold text-slate-100">
                  {formatCurrency(customer.periodStats.periodGrossSales)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Última Compra</span>
                <span className="text-slate-300">
                  {formatDaysAgo(customer.lifetimeStats.daysSinceLastPurchase)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
