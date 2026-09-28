import React from 'react';

interface BSKpiCardProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
  trend?: string;
  accentColorClass?: string;
  className?: string;
}

/**
 * 📊 BSKpiCard - Tarjeta KPI estándar BSDS v1.0 (ADR-005)
 * Valor Display XL (36px text-4xl font-bold) + Tendencia + Icono
 */
export const BSKpiCard: React.FC<BSKpiCardProps> = ({
  value,
  label,
  icon,
  trend,
  accentColorClass = 'text-bsPrimary-700 bg-bsPrimary-700/10',
  className = ''
}) => {
  return (
    <div className={`p-5 rounded-bs-card bg-bsSurface-light dark:bg-bsSurface-dark border border-slate-200/60 dark:border-slate-800 shadow-bs-low hover:shadow-bs-md transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${accentColorClass}`}>
              <span className="w-6 h-6">{icon}</span>
            </div>
          )}
          <span className="text-sm font-medium text-bsText-secondaryLight dark:text-bsText-secondaryDark">
            {label}
          </span>
        </div>
        {trend && (
          <span className="px-2.5 py-1 rounded-bs-sm text-xs font-semibold bg-bsStatus-success/15 text-bsStatus-success">
            {trend}
          </span>
        )}
      </div>

      <div className="mt-3.5">
        <span className="text-[36px] font-bold tracking-tight text-bsText-primaryLight dark:text-bsText-primaryDark leading-tight">
          {value}
        </span>
      </div>
    </div>
  );
};
