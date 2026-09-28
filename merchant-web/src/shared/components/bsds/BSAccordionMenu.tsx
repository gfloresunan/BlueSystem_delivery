import React, { useState } from 'react';

interface BSAccordionMenuProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  initiallyExpanded?: boolean;
  className?: string;
}

/**
 * 🍔 BSAccordionMenu - Menú estilo hamburguesa colapsable/expandible BSDS v1.0 (ADR-005)
 * Agrupa opciones y herramientas secundarias para mantener la interfaz limpia.
 */
export const BSAccordionMenu: React.FC<BSAccordionMenuProps> = ({
  title,
  children,
  icon,
  initiallyExpanded = false,
  className = ''
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <div className={`rounded-bs-card border border-slate-200/60 dark:border-slate-800 bg-bsSecSurface-light dark:bg-bsSecSurface-dark overflow-hidden transition-all duration-300 ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          {icon ? (
            <span className="w-5 h-5 text-bsPrimary-700 dark:text-bsPrimary-400">{icon}</span>
          ) : (
            <svg className="w-5 h-5 text-bsPrimary-700 dark:text-bsPrimary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
          <span className="text-[18px] font-medium text-bsText-primaryLight dark:text-bsText-primaryDark">
            {title}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-bsText-secondaryLight dark:text-bsText-secondaryDark transition-transform duration-250 ${expanded ? 'rotate-180' : 'rotate-0'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[1000px] opacity-100 p-5 pt-2' : 'max-h-0 opacity-0 p-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
};
