import React from 'react';

export type BDLContextType = 'operations' | 'finance' | 'customers' | 'delivery' | 'kitchen' | 'ai' | 'security' | 'offline';

const contextColorMap: Record<BDLContextType, { border: string; bg: string; text: string; hex: string }> = {
  operations: { border: 'border-l-[#22C55E]', bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', hex: '#22C55E' },
  finance: { border: 'border-l-[#F59E0B]', bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', hex: '#F59E0B' },
  customers: { border: 'border-l-[#2563EB]', bg: 'bg-[#2563EB]/10', text: 'text-[#2563EB]', hex: '#2563EB' },
  delivery: { border: 'border-l-[#06B6D4]', bg: 'bg-[#06B6D4]/10', text: 'text-[#06B6D4]', hex: '#06B6D4' },
  kitchen: { border: 'border-l-[#F97316]', bg: 'bg-[#F97316]/10', text: 'text-[#F97316]', hex: '#F97316' },
  ai: { border: 'border-l-[#4F46E5]', bg: 'bg-[#4F46E5]/10', text: 'text-[#4F46E5]', hex: '#4F46E5' },
  security: { border: 'border-l-[#EF4444]', bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', hex: '#EF4444' },
  offline: { border: 'border-l-[#6B7280]', bg: 'bg-[#6B7280]/10', text: 'text-[#6B7280]', hex: '#6B7280' },
};

interface BSContextCardProps {
  context: BDLContextType;
  title: string;
  value: string;
  icon?: React.ReactNode;
  subtitle?: string;
  badgeText?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * 🎨 BSContextCard - Tarjeta Contextual Semántica de BDL v2.0 (ADR-006)
 * Permite el reconocimiento instantáneo del módulo en < 3s mediante borde lateral cromático e icono contextual.
 */
export const BSContextCard: React.FC<BSContextCardProps> = ({
  context,
  title,
  value,
  icon,
  subtitle,
  badgeText,
  children,
  className = ''
}) => {
  const styles = contextColorMap[context];

  return (
    <div className={`p-5 rounded-bs-card border-l-[6px] ${styles.border} bg-bsSurface-light dark:bg-bsSurface-dark border-y border-r border-slate-200/60 dark:border-slate-800 shadow-bs-low hover:shadow-bs-md transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.bg} ${styles.text}`}>
              <span className="w-5 h-5">{icon}</span>
            </div>
          )}
          <div>
            <h3 className="text-[18px] font-semibold text-bsText-primaryLight dark:text-bsText-primaryDark leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-bsText-secondaryLight dark:text-bsText-secondaryDark mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {badgeText && (
          <span className={`px-2.5 py-1 rounded-bs-sm text-xs font-semibold ${styles.bg} ${styles.text}`}>
            {badgeText}
          </span>
        )}
      </div>

      <div className="mt-3">
        <span className="text-[32px] font-semibold tracking-tight text-bsText-primaryLight dark:text-bsText-primaryDark leading-tight">
          {value}
        </span>
      </div>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
};
