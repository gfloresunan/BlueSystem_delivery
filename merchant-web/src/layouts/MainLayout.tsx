import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, ShoppingBag, MapPin, UtensilsCrossed, 
  Tag, Users, Wallet, Settings, UserCheck, BarChart3, MessageSquare, 
  HelpCircle, LogOut, Search, Command, Sparkles, ChevronDown
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../shared/services/firebase';
import { Breadcrumbs } from './components/Breadcrumbs';
import { NotificationCenter } from '../shared/components/NotificationCenter';
import { GlobalSearchModal } from '../shared/components/GlobalSearchModal';
import { CommandPaletteModal } from '../shared/components/CommandPaletteModal';
import { UserProfileModal } from '../shared/components/UserProfileModal';
import { useKeyboardShortcuts } from '../shared/hooks/useKeyboardShortcuts';
import { useAuth } from '../shared/context/AuthContext';
import { useClientExperience } from '../shared/branding/ClientExperienceProvider';
import { useGatekeeper } from '../shared/gatekeeper/useGatekeeper';

interface MainLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onNavigate: (moduleKey: string) => void;
  onTriggerNewProduct?: () => void;
}

// Badge estático eliminado — badge dinámico calculado en tiempo real por useOrderBadge
const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'orders', label: 'Pedidos', icon: ShoppingBag },
  { key: 'delivery', label: 'Control Tower', icon: MapPin },
  { key: 'catalog', label: 'Catálogo & Menú', icon: UtensilsCrossed },
  { key: 'promotions', label: 'Promociones', icon: Tag },
  { key: 'customers', label: 'Clientes VIP', icon: Users },
  { key: 'finance', label: 'Finanzas (MFC)', icon: Wallet },
  { key: 'settings', label: 'Configuración (RSC)', icon: Settings },
  { key: 'staff', label: 'Personal & Staff', icon: UserCheck },
  { key: 'reports', label: 'Reportes', icon: BarChart3 },
  { key: 'communication', label: 'Comunicación (ECP)', icon: MessageSquare },
];

/**
 * Hook: Escucha en tiempo real la colección /orders filtrada por businessId
 * y cuenta únicamente los pedidos en estado PENDING (nuevos pedidos sin procesar).
 * Badge = 0 para un comercio nuevo o sin pedidos pendientes.
 * Se suscribe/desuscribe correctamente al cambiar businessId o desmontar.
 */
function useOrderBadge(businessId: string): number {
  const [pendingCount, setPendingCount] = useState(0);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Cancelar listener anterior antes de crear uno nuevo
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!businessId) {
      setPendingCount(0);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('businessId', '==', businessId),
      where('status', 'in', ['pending', 'PENDING'])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Contar solo los documentos que no estén cancelados
        const count = snap.docs.filter(d => {
          const status = (d.data().status || d.data().estado || '').toLowerCase();
          return status === 'pending';
        }).length;
        setPendingCount(count);
      },
      (err) => {
        // En caso de error de permisos, el badge muestra 0 — no bloquea la UI
        console.error('[useOrderBadge] Error en listener de pedidos pendientes:', err);
        setPendingCount(0);
      }
    );

    unsubRef.current = unsub;

    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [businessId]);

  return pendingCount;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeModule,
  onNavigate,
  onTriggerNewProduct,
}) => {
  const { user, identity, logout } = useAuth();
  const { brand } = useClientExperience();
  const { isModuleEnabled } = useGatekeeper();

  // Badge dinámico en tiempo real — solo pedidos PENDING del comercio actual
  const pendingOrdersBadge = useOrderBadge(identity?.businessId || '');

  // Estado del logo: permite fallback limpio cuando la URL falla
  const [logoError, setLogoError] = useState(false);

  const [isSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Registrar atajos globales de teclado
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onNewProduct: () => {
      onNavigate('catalog');
      onTriggerNewProduct?.();
    },
    onGoToOrders: () => onNavigate('orders'),
    onGoToDashboard: () => onNavigate('dashboard'),
    onEscape: () => {
      setIsSearchOpen(false);
      setIsCommandPaletteOpen(false);
    },
  });

  const displayName = user?.displayName || identity?.email?.split('@')[0] || 'Comercio';
  const roleDisplay = identity?.role || 'MERCHANT_OWNER';
  const initials = displayName.substring(0, 2).toUpperCase();

  // Filtrar elementos del menú según Entitlements y Rol en Gatekeeper
  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    const decision = isModuleEnabled(item.key);
    return decision.allowed;
  });

  // Dynamic Brand Short Badge
  const brandBadgeText = (brand.shortName || brand.displayName || 'BS').substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-obsidian-950 text-slate-100 overflow-hidden font-sans">
      {/* ─── SIDEBAR IZQUIERDA ────────────────────────────────────────────── */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-obsidian-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-20`}>
        {/* Dynamic Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          {brand.visual.logoUrl && !logoError ? (
            <img 
              src={brand.visual.logoUrl} 
              alt={brand.displayName} 
              className="w-10 h-10 rounded-xl object-cover shadow-lg border border-slate-700"
              onError={() => setLogoError(true)}
            />
          ) : (
            // Fallback limpio de letras: nunca broken image, nunca logo de otro comercio
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg select-none"
              style={{ backgroundColor: brand.visual.primaryColor || '#2563EB' }}
              title={brand.displayName}
            >
              {brandBadgeText}
            </div>
          )}
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm text-slate-100 leading-tight truncate">
              {brand.displayName || 'BlueSystem'}
            </h1>
            <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 inline" />
              <span>{brand.shortName || 'Merchant Portal'}</span>
            </span>
          </div>
        </div>

        {/* Navigation List (Filtered by Gatekeeper) */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {/* Badge dinámico: solo para módulo 'orders', solo si hay pedidos PENDING reales */}
                {item.key === 'orders' && pendingOrdersBadge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500 text-white shadow-sm animate-pulse">
                    {pendingOrdersBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-800/50 transition">
            <HelpCircle className="w-5 h-5" />
            <span>Ayuda & Soporte</span>
          </button>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN WORKSPACE ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header className="h-16 bg-obsidian-900 border-b border-slate-800 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            {/* Breadcrumb Contextual */}
            <Breadcrumbs activeModule={activeModule} onNavigate={onNavigate} />

            {/* Status Switcher */}
            <button
              onClick={() => setIsStoreOpen(!isStoreOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                isStoreOpen
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-xs font-semibold">{isStoreOpen ? 'Restaurante Abierto' : 'Tienda Cerrada'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Buscador Global & Command Palette Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs text-slate-400 transition"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-slate-300 font-semibold flex items-center gap-0.5">
                <Command className="w-3 h-3" /> K
              </kbd>
            </button>

            {/* Desktop Notification Drawer — businessId requerido para filtrar solo pedidos del comercio autenticado */}
            <NotificationCenter onNavigate={onNavigate} businessId={identity?.businessId || ''} />

            {/* Profile Avatar Trigger (Editable & Password Change) */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-3 pl-2.5 pr-2 py-1 border-l border-slate-800 hover:bg-slate-800/60 rounded-xl transition cursor-pointer text-left group"
              title="Mi Perfil y Cambio de Contraseña"
            >
              <div className="text-right hidden sm:block font-sans">
                <p className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition">{displayName}</p>
                <p className="text-[11px] text-blue-400 font-medium">{roleDisplay}</p>
              </div>
              <div 
                className="w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-105 group-hover:border-blue-400 transition"
                style={{ 
                  backgroundColor: `${brand.visual.primaryColor || '#2563EB'}20`, 
                  borderColor: `${brand.visual.primaryColor || '#2563EB'}60`,
                  color: brand.visual.primaryColor || '#60A5FA'
                }}
              >
                {initials}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition hidden sm:block" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-obsidian-950">
          {children}
        </main>
      </div>

      {/* Modales Globales */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={onNavigate}
        onTriggerNewProduct={onTriggerNewProduct}
        onToggleStoreStatus={() => setIsStoreOpen(!isStoreOpen)}
      />
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};
