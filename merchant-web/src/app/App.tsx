import { useState, useEffect } from 'react';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardModule } from '../modules/DashboardModule';
import { OrdersModule } from '../modules/OrdersModule';
import { DeliveryControlTowerModule } from '../modules/DeliveryControlTowerModule';
import { CatalogModule } from '../modules/CatalogModule';
import { PromotionsModule } from '../modules/PromotionsModule';
import { CustomersModule } from '../modules/CustomersModule';
import { FinanceModule } from '../modules/FinanceModule';
import { SettingsModule } from '../modules/SettingsModule';
import { StaffModule } from '../modules/StaffModule';
import { ReportsModule } from '../modules/ReportsModule';
import { CommunicationModule } from '../modules/CommunicationModule';
import { ModuleErrorBoundary } from '../shared/components/ModuleErrorBoundary';
import { TabStateProvider, useTabState } from '../shared/context/TabStateContext';
import { OnboardingWizardModule } from '../modules/OnboardingWizardModule';
import { AuthProvider, useAuth } from '../shared/context/AuthContext';
import { TenantProvider, useTenant } from '../shared/eiam/TenantContext';
import { ClientExperienceProvider, useClientExperience } from '../shared/branding/ClientExperienceProvider';
import { BrandThemeProvider } from '../shared/branding/BrandThemeProvider';
import { useGatekeeper } from '../shared/gatekeeper/useGatekeeper';
import { TenantDomainGate } from '../shared/domains/TenantDomainGate';

import { GatekeeperShield } from '../shared/gatekeeper/GatekeeperShield';
import { LoginModule } from '../modules/LoginModule';
import { AcceptInviteModule } from '../modules/AcceptInviteModule';
import { ShieldAlert, RefreshCw, WifiOff } from 'lucide-react';



function MainAppContent() {
  const { activeModule, setActiveModule } = useTabState();
  const { identity, loading: authLoading, isAuthenticated, error, errorInfo, retryAuth, logout } = useAuth();
  const { activeTenant, settings, status: tenantStatus, isLoading: isTenantLoading } = useTenant();
  const { updateExperience } = useClientExperience();
  const { isModuleEnabled } = useGatekeeper();
  const [triggerNewProductCounter, setTriggerNewProductCounter] = useState(0);

  // Sincronizar contexto de Tenant activo con la experiencia del cliente (Hidratación dinámica de marca)
  useEffect(() => {
    if (activeTenant) {
      updateExperience({
        tenantId: activeTenant.tenantId || 'default_tenant',
        brandId: activeTenant.brandId || 'brand_default',
        displayName: settings?.displayName || (activeTenant.tenantId ? activeTenant.tenantId.replace('ten_', '').replace(/_/g, ' ').toUpperCase() : 'BlueSystem Delivery'),
        shortName: activeTenant.brandId ? activeTenant.brandId.replace('brand_', '').toUpperCase() : 'BlueSystem',
        role: activeTenant.role || 'MERCHANT_OWNER',
        currency: settings?.currency || 'MXN'
      });
    }
  }, [activeTenant, settings, updateExperience]);

  // Force onboarding module if wizard is not completed
  useEffect(() => {
    if (isAuthenticated && identity && !identity.wizardCompleted) {
      if (activeModule !== 'onboarding') {
        setActiveModule('onboarding');
      }
    }
  }, [isAuthenticated, identity, activeModule, setActiveModule]);

  const handleTriggerNewProduct = () => {
    setTriggerNewProductCounter((prev) => prev + 1);
  };

  // 1. Loading State (Auth Loading or Tenant Resolving for Authenticated Session)
  const isAppLoading = authLoading || (isAuthenticated && (isTenantLoading || tenantStatus === 'LOADING' || tenantStatus === 'UNINITIALIZED'));

  if (isAppLoading) {
    return (
      <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs font-mono tracking-widest uppercase animate-pulse">
            {authLoading ? 'Verificando identidad EIAM...' : 'Resolviendo contexto de Tenant activo...'}
          </p>
        </div>
      </div>
    );
  }

  // 2. Error States: Distinct separation between NETWORK_ERROR and AUTHORIZATION_ERROR
  if (error || errorInfo) {
    const isNetworkError = errorInfo?.category === 'NETWORK_ERROR' || 
      (error && (
        error.includes('auth/network-request-failed') ||
        error.includes('net::ERR_CONNECTION_CLOSED') ||
        error.includes('securetoken.googleapis.com') ||
        error.includes('Fallo de conectividad')
      ));

    if (isNetworkError) {
      return (
        <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
              <WifiOff className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Error de Conectividad</h2>
              <p className="text-xs text-amber-400 font-mono bg-amber-950/20 py-2.5 px-3 rounded-xl border border-amber-900/30 break-words">
                {errorInfo?.message || error || 'Fallo al contactar el servicio seguro de autenticación.'}
              </p>
              <p className="text-xs text-slate-400 pt-2">
                No se pudo establecer conexión segura con los servidores de autenticación (securetoken.googleapis.com). Por favor, verifica tu conexión a internet o reintenta la conexión.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  retryAuth();
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar Conexión</span>
              </button>
              <button
                onClick={logout}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl transition border border-slate-700/50"
              >
                Cerrar Sesión EIAM
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-obsidian-950 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Error de Autorización</h2>
            <p className="text-xs text-rose-400 font-mono bg-rose-950/20 py-2.5 px-3 rounded-xl border border-rose-900/30 break-words">
              {errorInfo?.message || error}
            </p>
            <p className="text-xs text-slate-400 pt-2">
              No tienes los permisos requeridos o tu comercio no ha completado el aprovisionamiento.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                retryAuth();
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reintentar Validación</span>
            </button>
            <button
              onClick={logout}
              className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs py-3 rounded-xl transition border border-rose-500/30"
            >
              Cerrar Sesión EIAM
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated State (Show login form or accept-invite)
  if (!isAuthenticated) {
    const inviteToken = new URLSearchParams(window.location.search).get('token');
    if (inviteToken) {
      return (
        <AcceptInviteModule 
          token={inviteToken} 
          onSuccess={() => retryAuth()} 
          onCancel={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.pathname);
            retryAuth();
          }}
        />
      );
    }
    return <LoginModule />;
  }

  const renderModuleContent = () => {
    // ─── GATEKEEPER ROUTE SHIELD (GAP-02) ────────────────────────────────────
    const decision = isModuleEnabled(activeModule);
    if (!decision.allowed && activeModule !== 'onboarding') {
      return (
        <GatekeeperShield 
          decision={decision} 
          moduleName={activeModule.toUpperCase()} 
          onGoBack={() => setActiveModule('dashboard')}
        />
      );
    }

    switch (activeModule) {
      case 'onboarding':
        return (
          <ModuleErrorBoundary moduleName="Onboarding Wizard">
            <OnboardingWizardModule 
              businessId={identity?.businessId} 
              onWizardCompleted={() => setActiveModule('dashboard')} 
            />
          </ModuleErrorBoundary>
        );
      case 'dashboard':
        return (
          <ModuleErrorBoundary moduleName="Dashboard">
            <DashboardModule />
          </ModuleErrorBoundary>
        );
      case 'orders':
        return (
          <ModuleErrorBoundary moduleName="Pedidos & Cocina">
            <OrdersModule />
          </ModuleErrorBoundary>
        );
      case 'delivery':
        return (
          <ModuleErrorBoundary moduleName="Control Tower Delivery">
            <DeliveryControlTowerModule />
          </ModuleErrorBoundary>
        );
      case 'catalog':
        return (
          <ModuleErrorBoundary moduleName="Catálogo & Menú">
            <CatalogModule key={triggerNewProductCounter} />
          </ModuleErrorBoundary>
        );
      case 'promotions':
        return (
          <ModuleErrorBoundary moduleName="Promociones">
            <PromotionsModule />
          </ModuleErrorBoundary>
        );
      case 'customers':
        return (
          <ModuleErrorBoundary moduleName="Clientes VIP">
            <CustomersModule />
          </ModuleErrorBoundary>
        );
      case 'finance':
        return (
          <ModuleErrorBoundary moduleName="Finanzas (MFC)">
            <FinanceModule />
          </ModuleErrorBoundary>
        );
      case 'settings':
        return (
          <ModuleErrorBoundary moduleName="Configuración (RSC)">
            <SettingsModule />
          </ModuleErrorBoundary>
        );
      case 'staff':
        return (
          <ModuleErrorBoundary moduleName="Personal & Staff">
            <StaffModule />
          </ModuleErrorBoundary>
        );
      case 'reports':
        return (
          <ModuleErrorBoundary moduleName="Reportes & Analítica">
            <ReportsModule />
          </ModuleErrorBoundary>
        );
      case 'communication':
        return (
          <ModuleErrorBoundary moduleName="Comunicación (ECP)">
            <CommunicationModule />
          </ModuleErrorBoundary>
        );
      default:
        return (
          <ModuleErrorBoundary moduleName="Dashboard">
            <DashboardModule />
          </ModuleErrorBoundary>
        );
    }
  };

  return (
    <MainLayout
      activeModule={activeModule}
      onNavigate={setActiveModule}
      onTriggerNewProduct={handleTriggerNewProduct}
    >
      {renderModuleContent()}
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <ClientExperienceProvider>
          <TenantDomainGate>
            <BrandThemeProvider>
              <TabStateProvider>
                <MainAppContent />
              </TabStateProvider>
            </BrandThemeProvider>
          </TenantDomainGate>
        </ClientExperienceProvider>
      </TenantProvider>
    </AuthProvider>
  );
}

