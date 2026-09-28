/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Value Segment & Activity Badges with Explainability Tooltips
 */

import React, { useState } from 'react';
import { Crown, Sparkles, UserCheck, UserPlus, Clock, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import { CustomerActivityStatus, CustomerValueSegment } from '../types';

interface ValueBadgeProps {
  segment: CustomerValueSegment;
  explainReason?: string;
  size?: 'sm' | 'md';
}

export const CustomerValueBadge: React.FC<ValueBadgeProps> = ({ segment, explainReason, size = 'md' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  let icon = <UserCheck className="w-3.5 h-3.5" />;
  let label = 'Ocasional';

  switch (segment) {
    case 'VIP':
      bg = 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-sm shadow-amber-500/10';
      icon = <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />;
      label = 'VIP';
      break;
    case 'FRECUENTE':
      bg = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      icon = <Sparkles className="w-3.5 h-3.5 text-blue-400" />;
      label = 'Frecuente';
      break;
    case 'RECURRENTE':
      bg = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      icon = <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
      label = 'Recurrente';
      break;
    case 'NUEVO':
      bg = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      icon = <UserPlus className="w-3.5 h-3.5 text-purple-400" />;
      label = 'Nuevo';
      break;
    case 'UNCLASSIFIED':
    default:
      bg = 'bg-slate-800/40 text-slate-400 border-slate-700/50 border-dashed';
      icon = <UserCheck className="w-3.5 h-3.5 text-slate-500" />;
      label = 'Sin segmento';
      break;
  }

  const py = size === 'sm' ? 'py-0.5 text-[11px]' : 'py-1 text-xs';

  return (
    <div className="relative inline-flex items-center">
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 ${py} rounded-full font-semibold border ${bg} transition-colors cursor-help`}
      >
        {icon}
        <span>{label}</span>
      </span>

      {showTooltip && explainReason && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-obsidian-950 border border-slate-700/80 rounded-xl shadow-2xl text-slate-200 text-xs font-normal pointer-events-none backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Criterio de Valor</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">{explainReason}</p>
        </div>
      )}
    </div>
  );
};

interface ActivityBadgeProps {
  status: CustomerActivityStatus;
  explainReason?: string;
  size?: 'sm' | 'md';
}

export const CustomerActivityBadge: React.FC<ActivityBadgeProps> = ({ status, explainReason, size = 'md' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  let bg = 'bg-slate-800 text-slate-400 border-slate-700';
  let icon = <Clock className="w-3 h-3" />;
  let label = 'Inactivo';

  switch (status) {
    case 'ACTIVO':
      bg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      icon = <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
      label = 'Activo';
      break;
    case 'EN_RIESGO':
      bg = 'bg-yellow-500/10 text-yellow-300 border-yellow-500/25';
      icon = <ShieldAlert className="w-3 h-3 text-yellow-400" />;
      label = 'En Riesgo';
      break;
    case 'INACTIVO':
    default:
      bg = 'bg-rose-500/10 text-rose-400 border-rose-500/25';
      icon = <Clock className="w-3 h-3 text-rose-400" />;
      label = 'Inactivo';
      break;
  }

  const py = size === 'sm' ? 'py-0.5 text-[11px]' : 'py-1 text-xs';

  return (
    <div className="relative inline-flex items-center">
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 px-2.5 ${py} rounded-full font-medium border ${bg} transition-colors cursor-help`}
      >
        {icon}
        <span>{label}</span>
      </span>

      {showTooltip && explainReason && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-obsidian-950 border border-slate-700/80 rounded-xl shadow-2xl text-slate-200 text-xs font-normal pointer-events-none backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Criterio de Actividad</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">{explainReason}</p>
        </div>
      )}
    </div>
  );
};
