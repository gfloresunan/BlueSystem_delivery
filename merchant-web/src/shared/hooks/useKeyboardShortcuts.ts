import { useEffect } from 'react';

export interface ShortcutHandlers {
  onOpenCommandPalette?: () => void;
  onNewProduct?: () => void;
  onGoToOrders?: () => void;
  onGoToDashboard?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      // CTRL + K -> Command Palette
      if (isCtrlOrCmd && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        handlers.onOpenCommandPalette?.();
        return;
      }

      // CTRL + SHIFT + P -> Pedidos
      if (isCtrlOrCmd && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        handlers.onGoToOrders?.();
        return;
      }

      // CTRL + N -> Nuevo Producto
      if (isCtrlOrCmd && !event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handlers.onNewProduct?.();
        return;
      }

      // CTRL + D -> Dashboard
      if (isCtrlOrCmd && !event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        handlers.onGoToDashboard?.();
        return;
      }

      // ESC -> Close open modal
      if (event.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
