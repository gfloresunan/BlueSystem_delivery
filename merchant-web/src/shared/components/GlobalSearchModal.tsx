import React, { useState, useMemo } from 'react';
import { Search, Utensils, ShoppingBag, Users, UserCheck, Tag, X, ArrowRight } from 'lucide-react';

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Producto' | 'Pedido' | 'Cliente' | 'Empleado' | 'Promoción';
  moduleKey: string;
  badge?: string;
}

const SEARCH_DATABASE: SearchItem[] = [
  { id: 'p1', title: 'Pizza Suprema', subtitle: 'Catálogo • C$ 420 • Disponible', category: 'Producto', moduleKey: 'catalog' },
  { id: 'p2', title: 'Combo Pollo Frito 8 piezas', subtitle: 'Catálogo • C$ 680 • Disponible', category: 'Producto', moduleKey: 'catalog' },
  { id: 'p3', title: 'Hamburguesa Doble Queso', subtitle: 'Catálogo • C$ 350 • En Stock', category: 'Producto', moduleKey: 'catalog' },
  { id: 'o1', title: 'Pedido #ORD-8821', subtitle: 'Carlos Mendoza • C$ 450 • Cocina', category: 'Pedido', moduleKey: 'orders', badge: 'PREPARANDO' },
  { id: 'o2', title: 'Pedido #ORD-8820', subtitle: 'María López • C$ 780 • En Camino', category: 'Pedido', moduleKey: 'orders', badge: 'EN CAMINO' },
  { id: 'c1', title: 'Carlos Mendoza', subtitle: 'Cliente VIP • 14 pedidos este mes', category: 'Cliente', moduleKey: 'customers' },
  { id: 'c2', title: 'María López', subtitle: 'Cliente VIP • Nivel Oro • C$ 4,500 gastados', category: 'Cliente', moduleKey: 'customers' },
  { id: 's1', title: 'Juan Pérez', subtitle: 'Empleado • Rol: Admin / Gerente', category: 'Empleado', moduleKey: 'staff' },
  { id: 's2', title: 'Ana Martínez', subtitle: 'Empleado • Rol: Cajera sucursal Centro', category: 'Empleado', moduleKey: 'staff' },
  { id: 'pr1', title: 'Promoción 2x1 Martes Pizza', subtitle: 'Activa • Vence en 3 días', category: 'Promoción', moduleKey: 'promotions' },
  { id: 'pr2', title: 'Delivery Gratis > C$ 500', subtitle: 'Activa • Regla de zona centro', category: 'Promoción', moduleKey: 'promotions' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (moduleKey: string) => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return SEARCH_DATABASE.slice(0, 5);
    const q = query.toLowerCase();
    return SEARCH_DATABASE.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: SearchItem['category']) => {
    switch (category) {
      case 'Producto':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case 'Pedido':
        return <ShoppingBag className="w-4 h-4 text-blue-400" />;
      case 'Cliente':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'Empleado':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'Promoción':
        return <Tag className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-obsidian-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, pedidos, clientes, empleados, promociones..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm font-medium outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold">No se encontraron resultados</p>
              <p className="text-xs text-slate-500 mt-1">Prueba buscando por "Pizza", "#ORD-8821" o "Carlos"</p>
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.moduleKey);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/60 transition group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/60">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-200 group-hover:text-blue-400 transition">
                        {item.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                      {item.badge}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Buscador Omnicanal BlueSystem</span>
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">
                ↑
              </kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">
                ↓
              </kbd>{' '}
              Navegar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">
                ENTER
              </kbd>{' '}
              Seleccionar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
