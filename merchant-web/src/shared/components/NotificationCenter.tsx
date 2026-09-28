import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  PackageX,
  X,
  CheckCheck,
  Trash2,
  ShoppingBag,
  Truck,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  Clock,
  PackageCheck,
  RefreshCw,
  ChefHat,
  Sparkles,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
  writeBatch,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

// ─── Tipos Semánticos & Categorías Canónicas ─────────────────────────────────

export type NotificationCategoryTab =
  | 'TODAS'
  | 'PEDIDOS'
  | 'OPERATIVAS'
  | 'FINANZAS'
  | 'ADMINISTRATIVAS';

export type MerchantNotificationPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface MerchantNotificationItem {
  id: string;
  source: 'in_app' | 'order_stream';
  type: string;
  category: 'PEDIDOS' | 'OPERATIVAS' | 'FINANZAS' | 'ADMINISTRATIVAS';
  title: string;
  message: string;
  orderId?: string;
  orderCode?: string;
  businessId?: string;
  branchId?: string;
  destinationRoute?: string;
  action?: string;
  read: boolean;
  priority: MerchantNotificationPriority;
  createdAtMs: number;
  timeFormatted: string;
  customerName?: string;
  total?: number;
  itemsSummary?: string;
}

// ─── Helper: Formatear tiempo relativo reactivo ──────────────────────────────

function formatRelativeTime(tsMs: number): string {
  if (!tsMs || tsMs <= 0) return 'Hace un momento';
  const diffMs = Date.now() - tsMs;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'Ahora mismo';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin === 1) return 'Hace 1 min';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return 'Hace 1 hr';
  if (diffHr < 24) return `Hace ${diffHr} hrs`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Ayer';
  return `Hace ${diffDays} d`;
}

// ─── Helper: Normalización de Timestamp ──────────────────────────────────────

function parseTimestampToMs(val: any): number {
  if (!val) return Date.now();
  try {
    if (typeof val === 'number') return val;
    if (val.toMillis && typeof val.toMillis === 'function') return val.toMillis();
    if (val.toDate && typeof val.toDate === 'function') return val.toDate().getTime();
    if (val.seconds) return val.seconds * 1000;
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  } catch {
    return Date.now();
  }
}

// ─── Interfaces del componente ────────────────────────────────────────────────

interface Props {
  onNavigate: (moduleKey: string) => void;
  businessId: string;
}

// ─── Componente Principal: Enterprise Notification Center ─────────────────────

export const NotificationCenter: React.FC<Props> = ({ onNavigate, businessId }) => {
  const { user, identity } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationCategoryTab>('TODAS');

  // Streams de datos
  const [inAppNotifs, setInAppNotifs] = useState<MerchantNotificationItem[]>([]);
  const [orderNotifs, setOrderNotifs] = useState<MerchantNotificationItem[]>([]);

  // Estado de lectura local / supresión para eventos sintetizados
  const [locallyReadIds, setLocallyReadIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('bs_merchant_read_notifs');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [locallyDeletedIds, setLocallyDeletedIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('bs_merchant_deleted_notifs');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [isLoadingInApp, setIsLoadingInApp] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');

  const drawerRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const unsubInAppRef = useRef<(() => void) | null>(null);
  const unsubOrdersRef = useRef<(() => void) | null>(null);

  const effectiveBusinessId = businessId || identity?.businessId || '';
  const effectiveUid = user?.uid || identity?.uid || '';

  // Guardar en localStorage sincronizaciones de lectura local
  const persistLocallyRead = useCallback((newMap: Record<string, boolean>) => {
    setLocallyReadIds(newMap);
    try {
      localStorage.setItem('bs_merchant_read_notifs', JSON.stringify(newMap));
    } catch { /* ignore */ }
  }, []);

  const persistLocallyDeleted = useCallback((newMap: Record<string, boolean>) => {
    setLocallyDeletedIds(newMap);
    try {
      localStorage.setItem('bs_merchant_deleted_notifs', JSON.stringify(newMap));
    } catch { /* ignore */ }
  }, []);

  // ─── 1. STREAM A: Suscripción a Buzón In-App (/users/{uid}/notifications) ───
  useEffect(() => {
    if (unsubInAppRef.current) {
      unsubInAppRef.current();
      unsubInAppRef.current = null;
    }

    if (!effectiveUid) {
      setInAppNotifs([]);
      return;
    }

    setIsLoadingInApp(true);
    setHasError(false);

    try {
      const notifsQuery = query(
        collection(db, 'users', effectiveUid, 'notifications'),
        limit(80)
      );

      const unsub = onSnapshot(
        notifsQuery,
        (snapshot) => {
          const items: MerchantNotificationItem[] = [];

          snapshot.forEach((docSnap) => {
            const d = docSnap.data();

            // Filtrar eliminadas lógicas
            if (d.visibilityStatus === 'DELETED' || d.deletedByUser === true) {
              return;
            }

            // Aislamiento Multi-Tenant por comercio si viene estampado
            if (
              effectiveBusinessId &&
              d.businessId &&
              d.businessId !== effectiveBusinessId &&
              d.comercioId &&
              d.comercioId !== effectiveBusinessId
            ) {
              return;
            }

            // Exclusión de campañas estrictamente dirigidas a clientes
            const targetAud = (d.targetAudience || d.audience || '').toString().toUpperCase();
            if (targetAud === 'CUSTOMER' || targetAud === 'CLIENTE') {
              return;
            }

            const typeRaw = (d.type || '').toString().toUpperCase();
            const catRaw = (d.category || '').toString().toUpperCase();

            // Clasificación de Categoría Canónica
            let category: 'PEDIDOS' | 'OPERATIVAS' | 'FINANZAS' | 'ADMINISTRATIVAS' = 'ADMINISTRATIVAS';
            if (catRaw.includes('PEDIDO') || typeRaw.includes('ORDER') || typeRaw.includes('COURIER') || typeRaw.includes('DRIVER')) {
              category = 'PEDIDOS';
            } else if (catRaw.includes('OPERAC') || typeRaw.includes('STOCK') || typeRaw.includes('CATALOG') || typeRaw.includes('BRANCH') || typeRaw.includes('SLA')) {
              category = 'OPERATIVAS';
            } else if (catRaw.includes('FINAN') || catRaw.includes('LIQUID') || typeRaw.includes('SETTLEMENT') || typeRaw.includes('FINANCIAL') || typeRaw.includes('CLOSURE')) {
              category = 'FINANZAS';
            }

            // Clasificación de Prioridad
            let priority: MerchantNotificationPriority = 'NORMAL';
            const prioRaw = (d.priority || '').toString().toUpperCase();
            if (prioRaw === 'URGENT' || prioRaw === 'CRITICAL' || typeRaw.includes('CANCEL') || typeRaw.includes('SLA_WARNING')) {
              priority = 'CRITICAL';
            } else if (prioRaw === 'HIGH' || typeRaw === 'NEW_ORDER' || typeRaw.includes('ASSIGNED') || typeRaw.includes('SETTLEMENT')) {
              priority = 'HIGH';
            } else if (prioRaw === 'LOW') {
              priority = 'LOW';
            }

            const tsMs = parseTimestampToMs(d.createdAt || d.sentAt || d.timestamp);

            items.push({
              id: docSnap.id,
              source: 'in_app',
              type: d.type || 'SYSTEM',
              category,
              title: d.title || 'Notificación',
              message: d.body || d.message || '',
              orderId: d.orderId || d.entityId || '',
              orderCode: d.orderCode || d.orderShortCode || '',
              businessId: d.businessId || effectiveBusinessId,
              branchId: d.branchId || '',
              destinationRoute: d.destinationRoute || d.navigationRoute || (d.orderId ? 'orders' : ''),
              action: d.action || 'OPEN',
              read: d.isRead === true || d.read === true,
              priority,
              createdAtMs: tsMs,
              timeFormatted: formatRelativeTime(tsMs),
              customerName: d.customerName || d.clientName || '',
              total: Number(d.total || 0),
            });
          });

          setInAppNotifs(items);
          setIsLoadingInApp(false);
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        },
        (err) => {
          console.error('[NotificationCenter] Error en listener in_app:', err);
          setIsLoadingInApp(false);
          setHasError(true);
        }
      );

      unsubInAppRef.current = unsub;
    } catch (err) {
      console.error('[NotificationCenter] Error inicializando listener in_app:', err);
      setIsLoadingInApp(false);
      setHasError(true);
    }

    return () => {
      if (unsubInAppRef.current) {
        unsubInAppRef.current();
        unsubInAppRef.current = null;
      }
    };
  }, [effectiveUid, effectiveBusinessId]);

  // ─── 2. STREAM B: Suscripción a Pedidos Canónicos en Tiempo Real (/orders) ───
  useEffect(() => {
    if (unsubOrdersRef.current) {
      unsubOrdersRef.current();
      unsubOrdersRef.current = null;
    }

    if (!effectiveBusinessId) {
      setOrderNotifs([]);
      return;
    }

    setIsLoadingOrders(true);

    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('businessId', '==', effectiveBusinessId),
        limit(50)
      );

      const unsub = onSnapshot(
        ordersQuery,
        (snapshot) => {
          const items: MerchantNotificationItem[] = [];

          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const orderId = docSnap.id;
            const status = (d.status || d.estado || 'pending').toString().toLowerCase();

            // Código legible
            const shortCode = d.orderShortCode || d.orderCode || `#${orderId.slice(-4).toUpperCase()}`;
            const custName = d.customerName || d.clienteNombre || d.userName || 'Cliente';
            const orderTotal = Number(d.total || 0);

            // Resumen de items
            let itemsSummary = '';
            if (Array.isArray(d.items)) {
              itemsSummary = d.items
                .map((it: any) => `${it.quantity || 1}x ${it.name || it.productName || 'Item'}`)
                .slice(0, 3)
                .join(', ');
              if (d.items.length > 3) itemsSummary += ` (+${d.items.length - 3} más)`;
            }

            const tsMs = parseTimestampToMs(d.updatedAt || d.createdAt || d.fecha);

            // Mapeo semántico por estado operativo
            let title = `Pedido ${shortCode}`;
            let message = `Actualización de pedido (${status})`;
            let priority: MerchantNotificationPriority = 'NORMAL';
            let notifType = 'ORDER_STATUS';

            switch (status) {
              case 'pending':
              case 'pendiente':
              case 'created':
                title = `🛒 ¡Nuevo Pedido Entrante! (${shortCode})`;
                message = `${custName} · Total: C$ ${orderTotal.toFixed(2)}${itemsSummary ? ` · ${itemsSummary}` : ''}`;
                priority = 'HIGH';
                notifType = 'NEW_ORDER';
                break;
              case 'preparing':
              case 'preparando':
              case 'accepted':
                title = `👨‍🍳 En Preparación (${shortCode})`;
                message = `Orden en cocina para ${custName} · C$ ${orderTotal.toFixed(2)}`;
                priority = 'NORMAL';
                notifType = 'ORDER_PREPARING';
                break;
              case 'ready':
              case 'listo':
                title = `📦 Pedido Listo para Despacho (${shortCode})`;
                message = `Empacado y listo para entregar al repartidor/cliente.`;
                priority = 'HIGH';
                notifType = 'ORDER_READY';
                break;
              case 'assigned':
              case 'asignado':
              case 'courier_accepted':
                title = `🛵 Repartidor Asignado (${shortCode})`;
                message = d.assignedCourierName || d.driverName
                  ? `${d.assignedCourierName || d.driverName} se dirige al local para recolección.`
                  : `Un repartidor ha tomado el pedido y va en camino.`;
                priority = 'HIGH';
                notifType = 'COURIER_ASSIGNED';
                break;
              case 'in_transit':
              case 'en_camino':
              case 'picked_up':
              case 'delivering':
                title = `🚀 Pedido en Camino (${shortCode})`;
                message = `El pedido se encuentra en ruta hacia la dirección del cliente.`;
                priority = 'NORMAL';
                notifType = 'ORDER_IN_TRANSIT';
                break;
              case 'delivered':
              case 'entregado':
              case 'completed':
                title = `✅ Pedido Entregado con Éxito (${shortCode})`;
                message = `Entrega finalizada satisfactoriamente para ${custName}.`;
                priority = 'LOW';
                notifType = 'ORDER_DELIVERED';
                break;
              case 'cancelled':
              case 'cancelado':
              case 'rejected':
                title = `🚫 Pedido Cancelado (${shortCode})`;
                message = d.cancellationReason || d.cancelReason
                  ? `Motivo: ${d.cancellationReason || d.cancelReason}`
                  : `El pedido ha sido cancelado.`;
                priority = 'CRITICAL';
                notifType = 'ORDER_CANCELLED';
                break;
            }

            // ID determinista para deduplicación con el Stream In-App
            const deterministicId = `order_${orderId}_${status}`;

            items.push({
              id: deterministicId,
              source: 'order_stream',
              type: notifType,
              category: 'PEDIDOS',
              title,
              message,
              orderId,
              orderCode: shortCode,
              businessId: effectiveBusinessId,
              branchId: d.branchId || '',
              destinationRoute: 'orders',
              action: 'OPEN_ORDER',
              read: false, // Se evalúa con locallyReadIds
              priority,
              createdAtMs: tsMs,
              timeFormatted: formatRelativeTime(tsMs),
              customerName: custName,
              total: orderTotal,
              itemsSummary,
            });
          });

          setOrderNotifs(items);
          setIsLoadingOrders(false);
        },
        (err) => {
          console.error('[NotificationCenter] Error en listener orders:', err);
          setIsLoadingOrders(false);
        }
      );

      unsubOrdersRef.current = unsub;
    } catch (err) {
      console.error('[NotificationCenter] Error inicializando orders stream:', err);
      setIsLoadingOrders(false);
    }

    return () => {
      if (unsubOrdersRef.current) {
        unsubOrdersRef.current();
        unsubOrdersRef.current = null;
      }
    };
  }, [effectiveBusinessId]);

  // ─── 3. FUSIÓN DUAL-STREAM & DEDUPLICACIÓN DETERMINISTA ─────────────────────
  const consolidatedNotifications = useMemo(() => {
    const mapById = new Map<string, MerchantNotificationItem>();

    // 1. Insertar notificaciones del buzón in-app
    inAppNotifs.forEach((item) => {
      if (locallyDeletedIds[item.id]) return;
      const isRead = item.read || !!locallyReadIds[item.id];
      mapById.set(item.id, { ...item, read: isRead });
    });

    // 2. Fusionar eventos de pedidos (si no existe ya un documento in-app idéntico)
    orderNotifs.forEach((item) => {
      if (locallyDeletedIds[item.id]) return;

      // Buscar si ya existe una notificación idéntica o del mismo orderId con mismo estado
      const existingInApp = Array.from(mapById.values()).find(
        (existing) => existing.orderId === item.orderId && existing.type === item.type
      );

      if (!existingInApp) {
        const isRead = !!locallyReadIds[item.id];
        mapById.set(item.id, { ...item, read: isRead });
      }
    });

    // 3. Convertir a array y ordenar cronológicamente (más reciente primero)
    const list = Array.from(mapById.values());
    list.sort((a, b) => b.createdAtMs - a.createdAtMs);
    return list;
  }, [inAppNotifs, orderNotifs, locallyReadIds, locallyDeletedIds]);

  // ─── 4. FILTRADO POR PESTAÑA CATEGORIAL ────────────────────────────────────
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'TODAS') return consolidatedNotifications;
    return consolidatedNotifications.filter((n) => n.category === activeTab);
  }, [consolidatedNotifications, activeTab]);

  // Conteos por categoría
  const categoryCounts = useMemo(() => {
    const counts = {
      TODAS: consolidatedNotifications.length,
      PEDIDOS: 0,
      OPERATIVAS: 0,
      FINANZAS: 0,
      ADMINISTRATIVAS: 0,
    };
    consolidatedNotifications.forEach((n) => {
      if (counts[n.category] !== undefined) {
        counts[n.category]++;
      }
    });
    return counts;
  }, [consolidatedNotifications]);

  // Conteo total de no leídas para el Badge de la campana
  const unreadCount = useMemo(() => {
    return consolidatedNotifications.filter((n) => !n.read).length;
  }, [consolidatedNotifications]);

  // ─── 5. ACCIONES ATÓMICAS (Marcar Leída / Limpiar) ──────────────────────────

  const markAllAsRead = async () => {
    if (consolidatedNotifications.length === 0) return;

    // 1. Actualización optimista local
    const newReadMap = { ...locallyReadIds };
    consolidatedNotifications.forEach((n) => {
      newReadMap[n.id] = true;
    });
    persistLocallyRead(newReadMap);

    // 2. Persistencia en Firestore para las notificaciones in-app
    if (effectiveUid) {
      try {
        const batch = writeBatch(db);
        let batchCount = 0;

        inAppNotifs.filter((n) => !n.read).forEach((n) => {
          if (batchCount < 450) {
            const notifRef = doc(db, 'users', effectiveUid, 'notifications', n.id);
            batch.update(notifRef, {
              isRead: true,
              read: true,
              readAt: serverTimestamp(),
            });
            batchCount++;
          }
        });

        if (batchCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.error('[NotificationCenter] Error marcando todas en Firestore:', err);
      }
    }
  };

  const clearAllNotifications = async () => {
    if (consolidatedNotifications.length === 0) return;

    // 1. Actualización optimista local
    const newDeletedMap = { ...locallyDeletedIds };
    consolidatedNotifications.forEach((n) => {
      newDeletedMap[n.id] = true;
    });
    persistLocallyDeleted(newDeletedMap);

    // 2. Marcado lógico en Firestore para in-app
    if (effectiveUid) {
      try {
        const batch = writeBatch(db);
        let batchCount = 0;

        inAppNotifs.forEach((n) => {
          if (batchCount < 450) {
            const notifRef = doc(db, 'users', effectiveUid, 'notifications', n.id);
            batch.update(notifRef, {
              visibilityStatus: 'DELETED',
              deletedByUser: true,
              deletedAt: serverTimestamp(),
            });
            batchCount++;
          }
        });

        if (batchCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.error('[NotificationCenter] Error limpiando notificaciones:', err);
      }
    }
  };

  const handleNotificationClick = async (notif: MerchantNotificationItem) => {
    // 1. Marcar como leída
    if (!notif.read) {
      const newReadMap = { ...locallyReadIds, [notif.id]: true };
      persistLocallyRead(newReadMap);

      if (notif.source === 'in_app' && effectiveUid) {
        try {
          const notifRef = doc(db, 'users', effectiveUid, 'notifications', notif.id);
          await updateDoc(notifRef, {
            isRead: true,
            read: true,
            readAt: serverTimestamp(),
          });
        } catch (err) {
          console.warn('[NotificationCenter] Error marcando leída individual:', err);
        }
      }
    }

    // 2. Navegación contextual segura
    const route = notif.destinationRoute || '';
    if (route) {
      onNavigate(route);
    } else if (notif.category === 'PEDIDOS' || notif.orderId) {
      onNavigate('orders');
    } else if (notif.category === 'FINANZAS') {
      onNavigate('finance');
    } else if (notif.category === 'OPERATIVAS') {
      onNavigate('catalog');
    } else {
      onNavigate('orders');
    }

    setIsOpen(false);
  };

  // ─── 6. TECLADO & CLIC FUERA (Accesibilidad Enterprise) ─────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        bellButtonRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Actualizar timestamps relativos cada 30 segundos
  const [, setTicker] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // ─── 7. HELPER DE ICONOGRAFÍA & ESTILOS POR TIPO ───────────────────────────
  const renderIconAndPill = (notif: MerchantNotificationItem) => {
    const t = notif.type.toUpperCase();

    if (t === 'NEW_ORDER') {
      return {
        icon: <ShoppingBag className="w-5 h-5 text-blue-400" />,
        badgeBg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        badgeText: 'Nuevo Pedido',
      };
    }
    if (t === 'ORDER_PREPARING') {
      return {
        icon: <ChefHat className="w-5 h-5 text-amber-400" />,
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        badgeText: 'En Cocina',
      };
    }
    if (t === 'ORDER_READY') {
      return {
        icon: <PackageCheck className="w-5 h-5 text-emerald-400" />,
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        badgeText: 'Listo para Despacho',
      };
    }
    if (t === 'COURIER_ASSIGNED' || t.includes('DRIVER')) {
      return {
        icon: <Truck className="w-5 h-5 text-indigo-400" />,
        badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
        badgeText: 'Courier en Local',
      };
    }
    if (t === 'ORDER_IN_TRANSIT') {
      return {
        icon: <Truck className="w-5 h-5 text-cyan-400" />,
        badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
        badgeText: 'En Ruta',
      };
    }
    if (t === 'ORDER_DELIVERED') {
      return {
        icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        badgeText: 'Entregado',
      };
    }
    if (t === 'ORDER_CANCELLED') {
      return {
        icon: <PackageX className="w-5 h-5 text-rose-400" />,
        badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
        badgeText: 'Cancelado',
      };
    }
    if (notif.category === 'FINANZAS') {
      return {
        icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        badgeText: 'Finanzas',
      };
    }
    if (notif.category === 'OPERATIVAS') {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        badgeText: 'Operación',
      };
    }
    return {
      icon: <ShieldAlert className="w-5 h-5 text-slate-400" />,
      badgeBg: 'bg-slate-800 border-slate-700 text-slate-300',
      badgeText: 'Sistema',
    };
  };

  const isLoading = isLoadingInApp || isLoadingOrders;

  return (
    <div className="relative">
      {/* ─── Botón Trigger de Campana ────────────────────────────────────────── */}
      <button
        ref={bellButtonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all duration-200 ${
          isOpen
            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10'
            : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-300 hover:text-white'
        }`}
        title="Centro de Notificaciones Operativas"
        aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} no leídas` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-obsidian-900 shadow-lg shadow-rose-500/30 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ─── Drawer / Popover Enterprise ───────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Overlay sutil para mobile / backdrop blur */}
          <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-none" />

          <div
            ref={drawerRef}
            role="dialog"
            aria-label="Panel de Notificaciones del Comercio"
            className="fixed sm:absolute right-2 sm:right-0 top-18 sm:top-full mt-2 w-[calc(100vw-1rem)] sm:w-[480px] md:w-[500px] max-h-[85vh] sm:max-h-[640px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-3 duration-200 font-sans"
          >
            {/* ─── Header Sticky ───────────────────────────────────────────── */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-100 tracking-tight">Centro de Notificaciones</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[11px] font-bold">
                        {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{lastSyncTime === 'Sincronizado' ? 'Sincronizado en tiempo real' : `Actualizado ${lastSyncTime}`}</span>
                  </p>
                </div>
              </div>

              {/* Botones de Acción en Header */}
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Leer todas</span>
                  </button>
                )}
                {consolidatedNotifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-400 transition border border-transparent hover:border-rose-500/20"
                    title="Limpiar todas las notificaciones"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
                  aria-label="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Pestañas de Categoría con Contadores ────────────────────────── */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-800/80 bg-slate-950/50 overflow-x-auto text-xs font-semibold no-scrollbar">
              {(
                [
                  { key: 'TODAS', label: 'Todas' },
                  { key: 'PEDIDOS', label: 'Pedidos' },
                  { key: 'OPERATIVAS', label: 'Operativas' },
                  { key: 'FINANZAS', label: 'Finanzas' },
                  { key: 'ADMINISTRATIVAS', label: 'Admin' },
                ] as { key: NotificationCategoryTab; label: string }[]
              ).map((tab) => {
                const isActive = activeTab === tab.key;
                const count = categoryCounts[tab.key] || 0;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 bg-slate-800/30 border border-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-700/60 text-slate-300'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ─── Lista de Notificaciones con Alto Contraste ───────────────── */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/20 max-h-[460px]">
              {isLoading && consolidatedNotifications.length === 0 ? (
                // Skeletons de Carga Enterprise
                <div className="space-y-3 py-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 animate-pulse flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between">
                          <div className="h-3.5 bg-slate-800 rounded w-1/3" />
                          <div className="h-3 bg-slate-800 rounded w-16" />
                        </div>
                        <div className="h-3 bg-slate-800 rounded w-4/5" />
                        <div className="h-3 bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : hasError && consolidatedNotifications.length === 0 ? (
                // Estado de Error
                <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-200">No pudimos sincronizar tus notificaciones</p>
                    <p className="text-slate-500 text-[11px] mt-1">Verifica tu conexión a internet o reintenta.</p>
                  </div>
                  <button
                    onClick={() => {
                      setHasError(false);
                      setIsLoadingInApp(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar</span>
                  </button>
                </div>
              ) : filteredNotifications.length === 0 ? (
                // Estado Vacío Informativo
                <div className="py-12 text-center text-slate-400 text-xs space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                    <Sparkles className="w-7 h-7 text-blue-400/60" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-slate-200">
                      {activeTab === 'TODAS'
                        ? '¡Todo al día!'
                        : `Sin notificaciones en ${activeTab.toLowerCase()}`}
                    </p>
                    <p className="text-slate-500 text-xs max-w-xs mx-auto">
                      Los eventos de tus pedidos en curso, asignaciones de courier, liquidaciones y avisos de plataforma aparecerán aquí.
                    </p>
                  </div>
                </div>
              ) : (
                // Lista de Tarjetas de Notificación
                filteredNotifications.map((notif) => {
                  const { icon, badgeBg, badgeText } = renderIconAndPill(notif);
                  const isUnread = !notif.read;

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group ${
                        isUnread
                          ? 'bg-slate-800/90 hover:bg-slate-800 border-blue-500/40 shadow-md shadow-blue-500/5'
                          : 'bg-slate-950/40 hover:bg-slate-800/40 border-slate-800/80 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Indicador visual de No Leída */}
                      {isUnread && (
                        <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500 animate-pulse" />
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        {/* Contenedor de Icono */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          {icon}
                        </div>

                        {/* Contenido de la Tarjeta */}
                        <div className="flex-1 min-w-0 pr-4">
                          {/* Título y Badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-100 group-hover:text-blue-400 transition-colors">
                              {notif.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeBg}`}>
                              {badgeText}
                            </span>
                          </div>

                          {/* Mensaje descriptivo */}
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                            {notif.message}
                          </p>

                          {/* Footer de Tarjeta: Timestamp + CTA */}
                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3 h-3" />
                              <span>{formatRelativeTime(notif.createdAtMs)}</span>
                            </span>

                            <span className="text-blue-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>
                                {notif.category === 'PEDIDOS'
                                  ? 'Ver pedido'
                                  : notif.category === 'FINANZAS'
                                  ? 'Ver finanzas'
                                  : 'Abrir'}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ─── Footer Informativo ──────────────────────────────────────── */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-medium text-slate-300">Buzón Operativo En Vivo</span>
              </span>
              <span className="text-slate-500">
                {consolidatedNotifications.length} {consolidatedNotifications.length === 1 ? 'notificación' : 'notificaciones'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
