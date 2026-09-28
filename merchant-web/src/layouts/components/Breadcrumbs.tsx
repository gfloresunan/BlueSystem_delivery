import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface Props {
  activeModule: string;
  onNavigate: (moduleKey: string) => void;
  subDetail?: string;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Pedidos & Cocina',
  delivery: 'Control Tower',
  catalog: 'Catálogo & Menú',
  promotions: 'Promociones',
  customers: 'Clientes VIP',
  finance: 'Finanzas (MFC)',
  settings: 'Configuración (RSC)',
  staff: 'Personal & Staff',
  reports: 'Reportes & Analítica',
  communication: 'Comunicación (ECP)',
};

export const Breadcrumbs: React.FC<Props> = ({ activeModule, onNavigate, subDetail }) => {
  const currentLabel = MODULE_LABELS[activeModule] || 'Módulo';

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-1 hover:text-slate-200 transition"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Inicio</span>
      </button>

      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

      {activeModule === 'dashboard' ? (
        <span className="font-semibold text-slate-200">{currentLabel}</span>
      ) : (
        <button
          onClick={() => onNavigate(activeModule)}
          className={`hover:text-slate-200 transition ${!subDetail ? 'font-semibold text-slate-200' : ''}`}
        >
          {currentLabel}
        </button>
      )}

      {subDetail && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="font-semibold text-blue-400">{subDetail}</span>
        </>
      )}
    </nav>
  );
};
