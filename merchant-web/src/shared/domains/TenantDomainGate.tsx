/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — TENANT DOMAIN GATE (FASE 2E)
 * Fail-Closed Multi-Tenant Domain Resolution & Security Interlock Guard
 * 
 * Invariants:
 * 1. Blocks unauthorized cross-tenant operations via domain mismatch.
 * 2. Provides controlled error screens for unknown, inactive or suspended domains.
 * 3. Injects dynamic branding on hot initialization.
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { WebDomainResolutionResult } from './types';
import { ClientDomainResolver } from './domainResolver';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../eiam/TenantContext';
import { useClientExperience } from '../branding/ClientExperienceProvider';
import { Globe, AlertTriangle, ShieldX, RefreshCw, LogOut } from 'lucide-react';



interface TenantDomainContextType {
  domainResult: WebDomainResolutionResult | null;
  isLoading: boolean;
  refreshDomain: () => Promise<void>;
}

const TenantDomainContext = createContext<TenantDomainContextType>({
  domainResult: null,
  isLoading: true,
  refreshDomain: async () => {}
});

export const useTenantDomain = () => useContext(TenantDomainContext);

interface TenantDomainGateProps {
  children: React.ReactNode;
  overrideHostname?: string;
}

export const TenantDomainGate: React.FC<TenantDomainGateProps> = ({ children, overrideHostname }) => {
  const [domainResult, setDomainResult] = useState<WebDomainResolutionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user, isAuthenticated, logout } = useAuth();
  const { activeTenant } = useTenant();
  const { updateExperience } = useClientExperience();

  const resolve = async () => {
    setIsLoading(true);
    const result = await ClientDomainResolver.resolveCurrentDomain(overrideHostname);
    setDomainResult(result);
    setIsLoading(false);

    if (result.status === 'RESOLVED' && result.tenantId) {
      updateExperience(
        {
          tenantId: result.tenantId,
          brandId: result.brandId || 'brand_default',
          displayName: result.displayName || 'BlueSystem Delivery',
          shortName: result.displayName?.split(' ')[0] || 'BlueSystem'
        },
        result.branding
      );
    }
  };

  useEffect(() => {
    resolve();
  }, [overrideHostname]);

  // 1. Loading state
  if (isLoading || !domainResult) {
    return (
      <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center font-sans text-slate-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs font-mono tracking-widest uppercase animate-pulse">
            Resolviendo Espacio de Trabajo Multi-Tenant...
          </p>
        </div>
      </div>
    );
  }

  // 2. UNKNOWN DOMAIN State
  if (domainResult.status === 'UNKNOWN_DOMAIN') {
    return (
      <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center p-6 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30">
            <Globe className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Espacio de Trabajo No Encontrado</h2>
            <p className="text-xs text-slate-300 font-mono bg-slate-800/80 py-2.5 px-3 rounded-xl border border-slate-700 break-words">
              {domainResult.hostname}
            </p>
            <p className="text-xs text-slate-400 pt-2 leading-relaxed">
              No pudimos identificar una organización activa asociada a este dominio. Verifique la dirección o contacte al administrador de su empresa.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar Conexión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. SUSPENDED TENANT State
  if (domainResult.status === 'SUSPENDED_TENANT') {
    return (
      <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center p-6 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Organización Suspendida</h2>
            <p className="text-xs text-amber-400 font-mono bg-amber-950/20 py-2.5 px-3 rounded-xl border border-amber-900/30">
              Tenant: {domainResult.tenantId}
            </p>
            <p className="text-xs text-slate-400 pt-2 leading-relaxed">
              El servicio para esta organización se encuentra suspendido temporalmente por mantenimiento o administración de cuenta.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 4. INACTIVE DOMAIN State
  if (domainResult.status === 'INACTIVE_DOMAIN') {
    return (
      <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center p-6 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-700">
            <Globe className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Dominio en Proceso de Activación</h2>
            <p className="text-xs text-slate-400 font-mono bg-slate-800/60 py-2 px-3 rounded-xl">
              Estado: {domainResult.domainEntity?.status || 'PENDING'}
            </p>
            <p className="text-xs text-slate-400 pt-2">
              Este dominio ha sido registrado pero aún está completando la verificación DNS y provisión SSL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 5. SECURITY INTERLOCK: Tenant Mismatch Check
  // Si el usuario está autenticado y NO es Platform Admin, comparar su tenantId contra el tenantId del dominio
  if (isAuthenticated && user && !domainResult.isPlatformRoot && domainResult.tenantId) {
    const userTenantId = activeTenant?.tenantId;
    const isPlatformAdmin = activeTenant?.role === 'SUPER_ADMIN' || activeTenant?.role === 'ADMIN';

    if (userTenantId && userTenantId !== domainResult.tenantId && !isPlatformAdmin) {
      return (
        <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center p-6 font-sans text-slate-100">
          <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldX className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Aislamiento de Tenant Activo</h2>
              <p className="text-xs text-rose-400 font-mono bg-rose-950/20 py-2.5 px-3 rounded-xl border border-rose-900/30 break-words">
                Tu cuenta ({user.email}) pertenece a otro Tenant.
              </p>
              <p className="text-xs text-slate-400 pt-2 leading-relaxed">
                Por políticas estrictas de seguridad EIAM v3 y aislamiento Multi-Tenant, no puedes acceder a este espacio de trabajo con tu sesión actual.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={logout}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión e Ingresar con Otra Cuenta</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <TenantDomainContext.Provider value={{ domainResult, isLoading, refreshDomain: resolve }}>
      {children}
    </TenantDomainContext.Provider>
  );
};
