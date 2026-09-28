import React from 'react';

interface BSCardProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * 📦 BSCard - Tarjeta base estándar BSDS v1.0 (ADR-005)
 * Padding: 20px (p-5) | Radio: 18px (rounded-bs-card) | Elevation: shadow-bs-low/md
 */
export const BSCard: React.FC<BSCardProps> = ({
  children,
  title,
  icon,
  action,
  className = ''
}) => {
  return (
    <div className={`p-5 rounded-bs-card bg-bsSurface-light dark:bg-bsSurface-dark border border-slate-200/60 dark:border-slate-800 shadow-bs-low hover:shadow-bs-md transition-shadow duration-200 ${className}`}>
      {(title || icon || action) && (
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-bsPrimary-700 dark:text-bsPrimary-500 w-5 h-5">{icon}</span>}
            {title && (
              <h3 className="text-[20px] font-semibold text-bsText-primaryLight dark:text-bsText-primaryDark leading-snug">
                {title}
              </h3>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
