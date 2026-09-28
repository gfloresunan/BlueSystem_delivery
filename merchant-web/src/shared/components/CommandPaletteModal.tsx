import React, { useState, useMemo } from 'react';
import { Command, Plus, Tag, ShoppingBag, Wallet, Settings, Store, FileSpreadsheet, X, Zap } from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (moduleKey: string) => void;
  onTriggerNewProduct?: () => void;
  onToggleStoreStatus?: () => void;
}

export const CommandPaletteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onNavigate,
  onTriggerNewProduct,
  onToggleStoreStatus,
}) => {
  const [query, setQuery] = useState('');

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'cmd-1',
        title: 'Crear nuevo producto',
        category: 'Catálogo',
        icon: Plus,
        shortcut: 'CTRL + N',
        action: () => {
          onNavigate('catalog');
          onTriggerNewProduct?.();
        },
      },
      {
        id: 'cmd-2',
        title: 'Crear nueva promoción 2x1',
        category: 'Promociones',
        icon: Tag,
        action: () => onNavigate('promotions'),
      },
      {
        id: 'cmd-3',
        title: 'Ver pedidos en cocina & delivery',
        category: 'Operaciones',
        icon: ShoppingBag,
        shortcut: 'CTRL + SHIFT + P',
        action: () => onNavigate('orders'),
      },
      {
        id: 'cmd-4',
        title: 'Exportar balance y reportes de ventas',
        category: 'Finanzas',
        icon: FileSpreadsheet,
        action: () => onNavigate('finance'),
      },
      {
        id: 'cmd-5',
        title: 'Alternar estado de restaurante (Abierto / Cerrado)',
        category: 'Configuración',
        icon: Store,
        action: () => onToggleStoreStatus?.(),
      },
      {
        id: 'cmd-6',
        title: 'Ir al Merchant Dashboard',
        category: 'Navegación',
        icon: Zap,
        shortcut: 'CTRL + D',
        action: () => onNavigate('dashboard'),
      },
      {
        id: 'cmd-7',
        title: 'Abrir Configuración de la Sucursal (RSC)',
        category: 'Configuración',
        icon: Settings,
        action: () => onNavigate('settings'),
      },
      {
        id: 'cmd-8',
        title: 'Ver resumen financiero (MFC)',
        category: 'Finanzas',
        icon: Wallet,
        action: () => onNavigate('finance'),
      },
    ],
    [onNavigate, onTriggerNewProduct, onToggleStoreStatus]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) => cmd.title.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q)
    );
  }, [query, commands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="bg-obsidian-900 border border-blue-500/30 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Top Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/60">
          <Command className="w-5 h-5 text-blue-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe un comando o acción rápida (ej: Crear promoción, Abrir tienda)..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm font-medium outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">No se encontraron comandos coincidentes</div>
          ) : (
            filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-600/10 hover:border-blue-500/30 border border-transparent transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition">
                        {cmd.title}
                      </p>
                      <span className="text-[11px] text-slate-400">{cmd.category}</span>
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 font-mono rounded font-semibold">
                      {cmd.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Bottom Hint */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span>Command Palette • BlueSystem v2.1</span>
          <span>Presiona ESC para cerrar</span>
        </div>
      </div>
    </div>
  );
};
