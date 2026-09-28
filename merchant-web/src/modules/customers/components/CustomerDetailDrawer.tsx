/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Lateral Detail Drawer for Customer Intelligence Profile
 */

import React, { useEffect } from 'react';
import { X, Calendar, Phone, ShoppingBag, Receipt, Sparkles } from 'lucide-react';
import { CustomerIntelligenceProfile } from '../types';
import { CustomerActivityBadge, CustomerValueBadge } from './CustomerBadges';

interface CustomerDetailDrawerProps {
  customer: CustomerIntelligenceProfile | null;
  isOpen: boolean;
  onClose: () => void;
  periodLabel: string;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  isOpen,
  onClose,
  periodLabel,
}) => {
  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !customer) return null;

  const formatCurrency = (amount: number) => {
    return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'No disponible';
    return date.toLocaleDateString('es-NI', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-obsidian-950 border-l border-slate-800 h-full shadow-2xl flex flex-col z-10 overflow-hidden font-sans">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-obsidian-900/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">{customer.name}</h2>
              {customer.rank && (
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-800 text-cyan-400 border border-slate-700">
                  #{customer.rank}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Audited Explanation Callout */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Diagnóstico de Fidelidad</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{customer.explainability.valueReason}</p>
            <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
              {customer.explainability.activityReason}
            </p>
          </div>

          {/* Contact & Registration Info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-obsidian-900 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Teléfono de Contacto</span>
              </div>
              <div className="text-slate-200 font-mono font-medium">{customer.maskedPhone}</div>
            </div>

            <div className="bg-obsidian-900 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Primera Compra</span>
              </div>
              <div className="text-slate-200 font-medium">{formatDate(customer.lifetimeStats.firstPurchaseAt)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {customer.lifetimeStats.daysAsCustomer} días como cliente
              </div>
            </div>
          </div>

          {/* Metrics Comparison Grid (Period vs Lifetime) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Métricas de Consumo</span>
              <span className="text-[11px] font-normal text-cyan-400">{periodLabel}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Period Stats */}
              <div className="bg-gradient-to-br from-cyan-950/20 to-obsidian-900 border border-cyan-500/20 rounded-2xl p-3.5 space-y-2">
                <div className="text-xs font-semibold text-cyan-300">En el Período</div>
                <div>
                  <div className="text-lg font-bold text-slate-100 font-mono">
                    {formatCurrency(customer.periodStats.periodGrossSales)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {customer.periodStats.periodOrderCount} pedidos válidos
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                  Ticket Prom: {formatCurrency(customer.periodStats.periodAverageTicket)}
                </div>
              </div>

              {/* Lifetime Stats */}
              <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="text-xs font-semibold text-slate-400">Histórico Total (LTV)</div>
                <div>
                  <div className="text-lg font-bold text-slate-100 font-mono">
                    {formatCurrency(customer.lifetimeStats.lifetimeGrossSales)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {customer.lifetimeStats.lifetimeOrderCount} pedidos totales
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                  Ticket Prom: {formatCurrency(customer.lifetimeStats.lifetimeAverageTicket)}
                </div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          {customer.topProducts.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                <span>Productos Más Frecuentes (Top 3)</span>
              </div>
              <div className="space-y-2">
                {customer.topProducts.map((prod, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-obsidian-900 border border-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-slate-800 text-slate-300 font-bold text-[11px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-200">{prod.name}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-purple-300 font-semibold">{prod.totalQuantity} un.</span>
                      <span className="text-slate-500 text-[11px] ml-1.5">({formatCurrency(prod.totalSpent)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Timeline History */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Historial de Pedidos Válidos ({customer.validOrders.length})</span>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {customer.validOrders.map((ord, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-obsidian-900/90 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-mono font-medium text-slate-200">#{ord.orderNumber}</div>
                    <div className="text-[11px] text-slate-500">
                      {formatDate(ord.effectivePurchaseAt)} • {ord.itemsCount} productos
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400">{formatCurrency(ord.merchantGrossSales)}</div>
                    <div className="text-[10px] text-slate-500">Venta comercio</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
