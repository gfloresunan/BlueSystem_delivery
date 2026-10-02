import React from 'react';
import { BSButton } from './BSButton';

export type BSEmptyStateType = 'orders' | 'inventory' | 'sales' | 'drivers' | 'customers' | 'ai' | 'general';

interface EmptyStateConfig {
  emoji: string;
  defaultTitle: string;
  defaultDescription: string;
  accentBg: string;
}

const emptyStateMap: Record<BSEmptyStateType, EmptyStateConfig> = {
  orders: { emoji: '📦', defaultTitle: 'Sin pedidos activos', defaultDescription: 'Los nuevos pedidos recibidos aparecerán automáticamente aquí.', accentBg: 'bg-emerald-500/10 text-emerald-500' },
  inventory: { emoji: '📦', defaultTitle: 'Sin inventario registrado', defaultDescription: 'Comienza agregando productos a tu catálogo comercial.', accentBg: 'bg-sky-500/10 text-sky-500' },
  sales: { emoji: '💰', defaultTitle: 'Sin ventas registradas', defaultDescription: 'No se registran transacciones monetarias en esta jornada.', accentBg: 'bg-amber-500/10 text-amber-500' },
  drivers: { emoji: '🛵', defaultTitle: 'Sin repartidores en ruta', defaultDescription: 'No hay repartidores asignados a entregas en este momento.', accentBg: 'bg-cyan-500/10 text-cyan-500' },
  customers: { emoji: '⭐', defaultTitle: 'Sin clientes VIP registrados', defaultDescription: 'Tus clientes más frecuentes figurarán en este panel.', accentBg: 'bg-blue-500/10 text-blue-500' },
  ai: { emoji: '🤖', defaultTitle: 'Sin recomendaciones de IA', defaultDescription: 'BlueSystem AI está analizando tus métricas en tiempo real.', accentBg: 'bg-indigo-500/10 text-indigo-500' },
  general: { emoji: '🔍', defaultTitle: 'Sin datos disponibles', defaultDescription: 'No se encontraron registros que coincidan con la búsqueda.', accentBg: 'bg-slate-500/10 text-slate-500' },
};

interface BSEmptyStateProps {
  type: BSEmptyStateType;
  title?: string;
  description?: string;
  actionButtonText?: string;
  onActionClick?: () => void;
  className?: string;
}

/**
 * 🎨 BSEmptyState - Estado Vacío Semántico React de BDL 3.0 (ADR-007)
 * Ilustraciones e iconos de marca para asegurar que la interfaz nunca se sienta incompleta.
 */
export const BSEmptyState: React.FC<BSEmptyStateProps> = ({
  type,
  title,
  description,
  actionButtonText,
  onActionClick,
  className = ''
}) => {
  const config = emptyStateMap[type];

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl ${config.accentBg} mb-5 shadow-bs-low`}>
        <span>{config.emoji}</span>
      </div>

      <h3 className="text-2xl font-semibold text-bsText-primaryLight dark:text-bsText-primaryDark mb-2">
        {title || config.defaultTitle}
      </h3>

      <p className="text-base text-bsText-secondaryLight dark:text-bsText-secondaryDark max-w-md mb-6">
        {description || config.defaultDescription}
      </p>

      {actionButtonText && onActionClick && (
        <BSButton onClick={onActionClick} fullWidth={false} className="min-w-[200px]">
          {actionButtonText}
        </BSButton>
      )}
    </div>
  );
};
