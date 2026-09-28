import React from 'react';

interface BSAIInsightCardProps {
  title: string;
  insightText: string;
  actionText?: string;
  onActionClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * 🤖 BSAIInsightCard - Tarjeta Exclusiva BlueSystem AI de BDL v2.0 (ADR-006)
 * Se distingue visualmente con gradiente Índigo, resplandor Glow e iconografía de IA.
 */
export const BSAIInsightCard: React.FC<BSAIInsightCardProps> = ({
  title,
  insightText,
  actionText,
  onActionClick,
  icon,
  className = ''
}) => {
  return (
    <div className={`p-6 rounded-bs-card bg-gradient-to-r from-indigo-600 via-indigo-800 to-indigo-950 text-white shadow-bdl-glow-indigo border border-indigo-400/40 relative overflow-hidden transition-all duration-300 hover:scale-[1.01] ${className}`}>
      {/* Resplandor decorativo de fondo */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
          {icon ? (
            <span className="w-4 h-4">{icon}</span>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </div>
        <span className="text-xs font-semibold tracking-wide text-indigo-200 uppercase">
          BlueSystem AI Copilot
        </span>
      </div>

      <h3 className="text-xl font-semibold text-white leading-snug mb-1">
        {title}
      </h3>

      <p className="text-sm text-indigo-100 leading-relaxed opacity-90">
        {insightText}
      </p>

      {actionText && onActionClick && (
        <div className="mt-4">
          <button
            onClick={onActionClick}
            className="h-11 px-5 rounded-bs-md bg-white hover:bg-indigo-50 text-indigo-900 font-semibold text-sm transition-all duration-200 flex items-center gap-2 shadow-bs-low active:scale-95"
          >
            <svg className="w-4 h-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{actionText}</span>
          </button>
        </div>
      )}
    </div>
  );
};
