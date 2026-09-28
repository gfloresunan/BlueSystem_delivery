/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — EIAM v3 WEB INTEGRATION (FASE 2C.8)
 * TenantSwitcherTopBar: Componente UI de Conmutación de Tenant / Brand para TopBar.
 * 
 * 🔒 REGLA DE NO-BLOQUEO:
 * Si EIAM v3 no está disponible, el componente se oculta o muestra un estado
 * informativo discreto sin bloquear ninguna acción del Merchant Web.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTenantContext } from './TenantContext';
import { Building2, ChevronDown, Check, Sparkles, Shield } from 'lucide-react';

export const TenantSwitcherTopBar: React.FC = () => {
  const {
    activeContext,
    settings,
    availableMemberships,
    isEiamV3Active,
    isLoading,
    status,
    switchActiveTenant
  } = useTenantContext();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'UNINITIALIZED' || status === 'LOGGED_OUT') {
    return null;
  }

  if (status === 'LEGACY_ONLY') {
    return (
      <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-400 text-xs font-sans">
        <Shield className="w-3.5 h-3.5 text-slate-500" />
        <span>Modo Tradicional</span>
      </div>
    );
  }

  if (isLoading && !activeContext) {
    return (
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/50 animate-pulse text-xs text-slate-400 font-sans">
        <Building2 className="w-3.5 h-3.5 text-blue-400" />
        <span>Cargando Tenant...</span>
      </div>
    );
  }

  if (!isEiamV3Active || !activeContext) {
    return null;
  }

  const tenantDisplayName = settings?.displayName || activeContext.tenantId;
  const brandName = activeContext.brandId ? activeContext.brandId.replace('br_', '').replace('_', ' ').toUpperCase() : null;

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/40 border border-blue-500/30 hover:border-blue-400/50 text-slate-200 transition duration-200 shadow-sm"
        title="Cambiar Contexto de Tenant / Marca (EIAM v3 Preview)"
      >
        <div className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
          <Building2 className="w-3.5 h-3.5" />
        </div>

        <div className="text-left leading-tight hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-100 max-w-[120px] truncate">
              {tenantDisplayName}
            </span>
            <span className="px-1 py-0.2 text-[9px] font-bold uppercase rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> v3
            </span>
          </div>
          {brandName && (
            <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {brandName}
            </p>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      {/* Dropdown de Conmutación */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-obsidian-900 border border-slate-700/80 shadow-2xl shadow-black/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
          <div className="px-4 py-2 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-200 tracking-wide uppercase">Contexto Activo (EIAM v3)</p>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                Simulación
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Seleccione una membresía para conmutar Tenant o Marca.
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {availableMemberships.map((mem) => {
              const isSelected = mem.membershipId === activeContext.membershipId;
              return (
                <button
                  key={mem.membershipId}
                  onClick={() => {
                    switchActiveTenant(mem.membershipId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition text-left ${
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 font-semibold'
                      : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">{mem.tenantId}</span>
                    <span className="text-[10px] text-slate-400">
                      Rol: {mem.role} {mem.brandId ? `• Marca: ${mem.brandId}` : ''}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 mt-1 border-t border-slate-800 text-[10px] text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-slate-400" />
            <span>Aislamiento de contexto garantizado por EIAM v3</span>
          </div>
        </div>
      )}
    </div>
  );
};
