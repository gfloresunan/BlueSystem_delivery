import { useState, useCallback } from 'react';

export interface OptimisticNotification {
  id: string;
  type: 'success' | 'error' | 'pending';
  message: string;
  timestamp: number;
}

export function useOptimisticState<T>(initialState: T) {
  const [data, setData] = useState<T>(initialState);
  const [isPending, setIsPending] = useState(false);
  const [lastNotification, setLastNotification] = useState<OptimisticNotification | null>(null);

  const applyOptimistic = useCallback(
    async (
      optimisticUpdater: (prev: T) => T,
      asyncOperation: () => Promise<void>,
      options?: { successMessage?: string; errorMessage?: string }
    ) => {
      // 1. Guardar estado previo para rollback
      let previousData: T;
      setData((prev) => {
        previousData = prev;
        return optimisticUpdater(prev);
      });

      setIsPending(true);
      const notificationId = Date.now().toString();

      setLastNotification({
        id: notificationId,
        type: 'pending',
        message: 'Sincronizando cambios con servidor...',
        timestamp: Date.now(),
      });

      try {
        await asyncOperation();
        setIsPending(false);
        setLastNotification({
          id: notificationId,
          type: 'success',
          message: options?.successMessage || 'Cambios guardados con éxito',
          timestamp: Date.now(),
        });
      } catch (err: any) {
        console.error('[OptimisticUI Error] Falló la operación remota, revirtiendo estado:', err);
        // Rollback
        setData(previousData!);
        setIsPending(false);
        setLastNotification({
          id: notificationId,
          type: 'error',
          message: options?.errorMessage || 'Error al guardar. Se han revertido los cambios.',
          timestamp: Date.now(),
        });
      }
    },
    []
  );

  return {
    data,
    setData,
    isPending,
    lastNotification,
    setLastNotification,
    applyOptimistic,
  };
}
