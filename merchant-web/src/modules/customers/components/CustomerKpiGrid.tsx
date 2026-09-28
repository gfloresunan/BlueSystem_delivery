/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * KPI Cards Grid for Customer Intelligence
 */

import React from 'react';
import { Users, Crown, Sparkles, TrendingUp, Receipt } from 'lucide-react';
import { CustomerKpiMetrics } from '../types';

interface CustomerKpiGridProps {
  kpis: CustomerKpiMetrics;
  periodLabel: string;
}

export const CustomerKpiGrid: React.FC<CustomerKpiGridProps> = ({ kpis, periodLabel }) => {
  const formatCurrency = (amount: number) => {
    return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const cards = [
    {
      title: 'Total Clientes',
      value: kpis.totalCustomers.toLocaleString('es-NI'),
      subtext: `${kpis.retentionRate.toFixed(1)}% activos en 30d`,
      icon: Users,
      color: 'from-blue-500/20 to-indigo-500/5 text-blue-400 border-blue-500/30',
      iconBg: 'bg-blue-500/10 text-blue-400',
    },
    {
      title: 'Clientes VIP',
      value: kpis.vipCustomers.toLocaleString('es-NI'),
      subtext: `≥6 pedidos y ≥C$3,500 en 90d`,
      icon: Crown,
      color: 'from-amber-500/20 to-orange-500/5 text-amber-300 border-amber-500/30 shadow-lg shadow-amber-500/5',
      iconBg: 'bg-amber-500/15 text-amber-400',
    },
    {
      title: 'Clientes Frecuentes',
      value: kpis.frequentCustomers.toLocaleString('es-NI'),
      subtext: `≥4 pedidos en 90d`,
      icon: Sparkles,
      color: 'from-cyan-500/20 to-sky-500/5 text-cyan-300 border-cyan-500/30',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
    },
    {
      title: 'Venta Clientes VIP',
      value: formatCurrency(kpis.vipAttributableSales),
      subtext: periodLabel,
      icon: TrendingUp,
      color: 'from-emerald-500/20 to-teal-500/5 text-emerald-300 border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      title: 'Ticket Mediano',
      value: formatCurrency(kpis.medianTicket),
      subtext: 'Línea base por pedido',
      icon: Receipt,
      color: 'from-purple-500/20 to-pink-500/5 text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/10 text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`bg-gradient-to-br ${card.color} bg-obsidian-900 border rounded-2xl p-4.5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-opacity-60`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 tracking-wide">{card.title}</span>
              <div className={`p-2 rounded-xl ${card.iconBg}`}>
                <IconComponent className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-100 tracking-tight font-mono">{card.value}</div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
