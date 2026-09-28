import React from 'react';

export type BSAIStateType = 'thinking' | 'analyzing' | 'recommending';

const stateTagMap: Record<BSAIStateType, { tag: string; colorClass: string }> = {
  thinking: { tag: 'Pensando...', colorClass: 'text-indigo-200' },
  analyzing: { tag: 'Analizando ventas e inventario...', colorClass: 'text-cyan-300' },
  recommending: { tag: 'Recomendación lista', colorClass: 'text-emerald-300' },
};

interface BSAIInteractiveCopilotProps {
  state: BSAIStateType;
  title: string;
  contentMessage: string;
  actionButtonText?: string;
  onActionClick?: () => void;
  className?: string;
}

/**
 * 🤖 BSAIInteractiveCopilot - Asistente Interactivo Vivo Blue AI para React (BDL 3.0 / ADR-007)
 * Proporciona animación de pulso, tag de estado dinámico y experiencia conversacional de Co-piloto.
 */
export const BSAIInteractiveCopilot: React.FC<BSAIInteractiveCopilotProps> = ({
  state,
  title,
  contentMessage,
  actionButtonText,
  onActionClick,
  className = ''
}) => {
  const stateConfig = stateTagMap[state];

  return (
    <div className={`p-6 rounded-bs-card bg-gradient-to-br from-indigo-600 via-indigo-950 to-slate-950 text-white shadow-bdl-glow-indigo border border-indigo-400/50 relative overflow-hidden transition-all duration-300 ${className}`}>
      {/* Resplandor pulsante animado de fondo */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/30 rounded-full blur-2xl animate-pulse pointer-events-none" />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white animate-bounce">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white leading-tight">
            BlueSystem AI Copilot
          </h4>
          <span className={`text-xs font-medium ${stateConfig.colorClass}`}>
            {stateConfig.tag}
          </span>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mb-1.5 leading-snug">
        {title}
      </h3>

      <p className="text-sm text-indigo-100/90 leading-relaxed max-w-xl">
        {contentMessage}
      </p>

      {actionButtonText && onActionClick && (
        <div className="mt-5">
          <button
            onClick={onActionClick}
            className="h-12 px-6 rounded-bs-md bg-white hover:bg-indigo-50 text-indigo-900 font-semibold text-sm transition-all duration-200 flex items-center gap-2.5 shadow-bs-md active:scale-95"
          >
            <svg className="w-4 h-4 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{actionButtonText}</span>
          </button>
        </div>
      )}
    </div>
  );
};
