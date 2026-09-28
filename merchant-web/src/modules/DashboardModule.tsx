import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, TrendingUp, Users, Clock, 
  Settings2, Eye, EyeOff, MoveUp, MoveDown, RotateCcw, Zap, Sparkles, AlertCircle,
  Star, MessageSquareQuote
} from 'lucide-react';
import { SkeletonCard, SkeletonTable, SkeletonChart } from '../shared/components/Skeleton';
import { db } from '../shared/services/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../shared/context/AuthContext';

interface WidgetConfig {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'kpis', name: 'Tarjetas KPI Principales', visible: true, order: 1 },
  { id: 'orders', name: 'Pedidos en Cocina & Delivery', visible: true, order: 2 },
  { id: 'reviews', name: 'Opiniones & Satisfacción de Clientes', visible: true, order: 3 },
  { id: 'health', name: 'Estado Operativo & Readiness Score', visible: true, order: 4 },
  { id: 'chart', name: 'Tendencia de Ventas Diarias', visible: true, order: 5 },
];

/**
 * Zona horaria canónica de la plataforma (Nicaragua, UTC-6)
 */
const TIMEZONE_MANAGUA = 'America/Managua';

/**
 * Retorna fecha YYYY-MM-DD en zona horaria America/Managua
 */
const getManaguaDateStr = (dateInput?: any): string => {
  if (!dateInput) return '';
  const d = dateInput instanceof Date
    ? dateInput
    : typeof dateInput.toDate === 'function'
    ? dateInput.toDate()
    : new Date(dateInput);

  if (isNaN(d.getTime())) return '';

  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE_MANAGUA }).format(d);
  } catch (e) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * Evalúa si un pedido corresponde a la fecha 'hoy' en Nicaragua
 */
const isOrderFromToday = (order: any, todayStr: string): boolean => {
  const primaryDateRaw = order.deliveredAt || order.completedAt || order.entregadoAt || order.createdAt;
  if (!primaryDateRaw) return false;
  const orderDateStr = getManaguaDateStr(primaryDateRaw);
  return orderDateStr === todayStr;
};

export const DashboardModule: React.FC = () => {
  const { identity } = useAuth();
  const merchantId = identity?.businessId || '';
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);

  const [kpiData, setKpiData] = useState<{
    todaySales: number;
    activeOrders: number;
    slaMinutes: number | null;
    customersCount: number;
  }>({
    todaySales: 0.0,
    activeOrders: 0,
    slaMinutes: null,
    customersCount: 0,
  });

  const [realOrders, setRealOrders] = useState<any[]>([]);
  const [dailyTrend, setDailyTrend] = useState<Array<{ dateStr: string; label: string; amount: number }>>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(true);

  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem('bluesystem_merchant_dashboard_widgets_v1');
      if (!saved) return DEFAULT_WIDGETS;
      const parsed: WidgetConfig[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map(w => w.id));
      const missingDefaults = DEFAULT_WIDGETS.filter(dw => !existingIds.has(dw.id));
      return [...parsed, ...missingDefaults];
    } catch (e) {
      return DEFAULT_WIDGETS;
    }
  });

  useEffect(() => {
    if (!merchantId) {
      setIsLoading(false);
      return;
    }

    // Listener de orders del comercio utilizando resolver de identidad canónico (businessId)
    const q = query(
      collection(db, 'orders'),
      where('businessId', '==', merchantId)
    );

    const unsubOrders = onSnapshot(
      q,
      (snap) => {
        const uniqueOrdersMap = new Map<string, any>();
        
        snap.docs.forEach((d) => {
          const data = d.data();
          const docId = d.id;
          const canonicalBizId = data.businessId || data.comercioId || data.restaurantId || data.merchantId;
          
          if (canonicalBizId && canonicalBizId === merchantId) {
            uniqueOrdersMap.set(docId, { id: docId, ...data });
          }
        });

        const allOrders = Array.from(uniqueOrdersMap.values());
        
        // Ordenar cronológicamente descendente
        allOrders.sort((a, b) => {
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });

        setRealOrders(allOrders);

        // --- CÁLCULO DE KPIS EN TIEMPO REAL (ZONA HORARIA AMERICA/MANAGUA) ---
        const nowManaguaStr = getManaguaDateStr(new Date());
        let salesSum = 0;
        let activeCount = 0;
        const customerSet = new Set<string>();
        const slaDurations: number[] = [];

        // Generar estructura de tendencia de los últimos 7 días
        const trendMap = new Map<string, number>();
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const trendDays: Array<{ dateStr: string; label: string }> = [];

        for (let i = 6; i >= 0; i--) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - i);
          const dStr = getManaguaDateStr(targetDate);
          const dayName = daysOfWeek[targetDate.getDay()];
          trendDays.push({ dateStr: dStr, label: i === 0 ? 'Hoy' : dayName });
          trendMap.set(dStr, 0);
        }

        allOrders.forEach((ord) => {
          const statusStr = String(ord.status || ord.estado || 'pending').toLowerCase();
          const isCancelled = ['cancelled', 'rejected', 'cancelado', 'rechazado'].includes(statusStr);
          const isDelivered = ['delivered', 'completed', 'entregado', 'completado'].includes(statusStr);

          // 1. Venta bruta canónica del comercio
          const subtotalVal = Number(ord.subtotal || 0);
          const discountVal = Number(ord.discountAmount || ord.couponDiscount || ord.coupon?.discountAmount || 0);
          const grossSale = Number(
            ord.merchantGrossSales ?? (subtotalVal > 0 ? Math.max(0, subtotalVal - discountVal) : (ord.total || ord.totalAmount || 0))
          );

          // 2. Evaluación de pertenencia a fecha actual (Nicaragua)
          const isToday = isOrderFromToday(ord, nowManaguaStr);
          const orderDateStr = getManaguaDateStr(ord.deliveredAt || ord.completedAt || ord.entregadoAt || ord.createdAt);

          // 3. Acumulación en tendencia de 7 días
          if (!isCancelled && orderDateStr && trendMap.has(orderDateStr)) {
            trendMap.set(orderDateStr, (trendMap.get(orderDateStr) || 0) + grossSale);
          }

          // 4. VENTAS HOY
          if (!isCancelled && isToday) {
            salesSum += grossSale;

            // CLIENTES HOY: Tracking exclusivo de clientes únicos de pedidos de hoy
            const custId = ord.customerId || ord.clienteId || ord.customerName || ord.clienteNombre;
            if (custId) customerSet.add(custId);

            // SLA TIEMPO PREP / ENTREGA: Cálculo real para pedidos completados hoy con marcas de tiempo
            if (isDelivered && ord.createdAt) {
              const start = ord.createdAt.toDate ? ord.createdAt.toDate().getTime() : new Date(ord.createdAt).getTime();
              const endRaw = ord.deliveredAt || ord.completedAt || ord.entregadoAt || ord.updatedAt;
              if (endRaw) {
                const end = endRaw.toDate ? endRaw.toDate().getTime() : new Date(endRaw).getTime();
                const diffMin = (end - start) / 60000;
                if (!isNaN(diffMin) && diffMin > 0 && diffMin < 180) {
                  slaDurations.push(diffMin);
                }
              }
            }
          }

          // 5. PEDIDOS ACTIVOS: pedidos en cocina / delivery en curso
          if (!isCancelled && !isDelivered) {
            activeCount++;
          }
        });

        const calculatedSla = slaDurations.length > 0
          ? Math.round((slaDurations.reduce((a, b) => a + b, 0) / slaDurations.length) * 10) / 10
          : null;

        setKpiData({
          todaySales: salesSum,
          activeOrders: activeCount,
          slaMinutes: calculatedSla,
          customersCount: customerSet.size,
        });

        setDailyTrend(trendDays.map(td => ({
          dateStr: td.dateStr,
          label: td.label,
          amount: trendMap.get(td.dateStr) || 0
        })));

        setSyncError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error listening to orders in DashboardModule:', err);
        setSyncError(err.message || 'Error de sincronización con Firestore');
        setIsLoading(false);
      }
    );

    // Listener de Reseñas de Clientes (/businesses/{merchantId}/reviews)
    let unsubReviewsFallback: (() => void) | null = null;
    const qReviews = query(
      collection(db, 'businesses', merchantId, 'reviews'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubReviews = onSnapshot(
      qReviews,
      (snap) => {
        const revList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReviews(revList);
        setReviewsLoading(false);
      },
      (err) => {
        console.warn('Fallback reviews listener without orderBy createdAt:', err);
        unsubReviewsFallback = onSnapshot(
          collection(db, 'businesses', merchantId, 'reviews'),
          (snap2) => {
            const revList = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
            revList.sort((a: any, b: any) => {
              const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return tB - tA;
            });
            setReviews(revList);
            setReviewsLoading(false);
          },
          (err2) => {
            console.error('Error fetching fallback reviews:', err2);
            setReviewsLoading(false);
          }
        );
      }
    );

    return () => {
      unsubOrders();
      unsubReviews();
      if (unsubReviewsFallback) unsubReviewsFallback();
    };
  }, [merchantId]);

  const saveWidgets = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    localStorage.setItem('bluesystem_merchant_dashboard_widgets_v1', JSON.stringify(newWidgets));
  };

  const toggleWidgetVisibility = (id: string) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    saveWidgets(updated);
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const sorted = [...widgets].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((w) => w.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap orders
    const tempOrder = sorted[index].order;
    sorted[index].order = sorted[targetIndex].order;
    sorted[targetIndex].order = tempOrder;

    saveWidgets(sorted);
  };

  const resetWidgets = () => {
    saveWidgets(DEFAULT_WIDGETS);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-64 bg-slate-800 rounded-md animate-pulse mb-2" />
          <div className="h-4 w-96 bg-slate-800/60 rounded-md animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonTable rows={4} />
          </div>
          <div>
            <SkeletonChart />
          </div>
        </div>
      </div>
    );
  }

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  // Pedidos para el widget de Cocina & Delivery: activos + entregados hoy (excluye cancelados e historial viejo)
  const nowManaguaTodayStr = getManaguaDateStr(new Date());
  const displayOrders = realOrders.filter((ord) => {
    const statusStr = String(ord.status || ord.estado || '').toLowerCase();
    const isCancelled = ['cancelled', 'rejected', 'cancelado', 'rechazado'].includes(statusStr);
    if (isCancelled) return false;

    const isDelivered = ['delivered', 'completed', 'entregado', 'completado'].includes(statusStr);
    if (!isDelivered) return true; // Activo en curso

    // Si está completado/entregado, solo mostrarlo si ocurrió HOY
    return isOrderFromToday(ord, nowManaguaTodayStr);
  });

  const totalTrendSales = dailyTrend.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header con botón de personalización */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Merchant Operations Dashboard</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Layout Web v2.1
            </span>
          </div>
          <p className="text-sm text-slate-400">Resumen ejecutivo y operativo en tiempo real con widgets configurables.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCustomizeMode(!isCustomizeMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
              isCustomizeMode
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>{isCustomizeMode ? 'Finalizar Edición' : 'Personalizar Dashboard'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Error de Sincronización si aplica */}
      {syncError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error al sincronizar con Firestore</p>
            <p className="text-rose-400/80">{syncError}</p>
          </div>
        </div>
      )}

      {/* Drawer de personalización de layout */}
      {isCustomizeMode && (
        <div className="p-4 bg-obsidian-900 border border-blue-500/30 rounded-2xl shadow-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-slate-100">Personalizar Widgets del Dashboard</h3>
            </div>
            <button
              onClick={resetWidgets}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Orden</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sortedWidgets.map((w, idx) => (
              <div
                key={w.id}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
              >
                <span className="text-xs font-medium text-slate-200 truncate">{w.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveWidget(w.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveWidget(w.id, 'down')}
                    disabled={idx === sortedWidgets.length - 1}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleWidgetVisibility(w.id)}
                    className={`p-1 rounded transition ${w.visible ? 'text-blue-400 hover:bg-blue-500/20' : 'text-slate-600 hover:bg-slate-800'}`}
                  >
                    {w.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renderizado de Widgets Activos */}
      <div className="space-y-6">
        {sortedWidgets.map((widget) => {
          if (!widget.visible) return null;

          switch (widget.id) {
            case 'kpis':
              return (
                <div key="kpis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Tarjeta A: Ventas Hoy */}
                  <div className="bg-obsidian-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Ventas Hoy</span>
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-100 mt-2">
                      C$ {kpiData.todaySales.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {syncError ? (
                      <span className="text-xs text-rose-400 font-medium">Error de sincronización</span>
                    ) : (
                      <span className="text-xs text-emerald-400 font-medium">Sincronizado Firestore</span>
                    )}
                  </div>

                  {/* Tarjeta B: Pedidos Activos */}
                  <div className="bg-obsidian-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Pedidos Activos</span>
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-100 mt-2">
                      {kpiData.activeOrders} {kpiData.activeOrders === 1 ? 'Pedido' : 'Pedidos'}
                    </p>
                    <span className="text-xs text-blue-400 font-medium">En tiempo real</span>
                  </div>

                  {/* Tarjeta C: SLA Tiempo Prep. */}
                  <div className="bg-obsidian-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase">SLA Tiempo Prep.</span>
                      <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-100 mt-2">
                      {kpiData.slaMinutes !== null ? `${kpiData.slaMinutes.toFixed(1)} min` : 'N/A'}
                    </p>
                    <span className="text-xs text-amber-400 font-medium">
                      {kpiData.slaMinutes !== null ? 'Promedio entregas hoy' : 'Sin entregas hoy'}
                    </span>
                  </div>

                  {/* Tarjeta D: Clientes Hoy */}
                  <div className="bg-obsidian-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Clientes Hoy</span>
                      <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-100 mt-2">
                      {kpiData.customersCount} {kpiData.customersCount === 1 ? 'Cliente' : 'Clientes'}
                    </p>
                    <span className="text-xs text-purple-400 font-medium">Únicos hoy</span>
                  </div>
                </div>
              );

            case 'orders':
              return (
                <div key="orders" className="bg-obsidian-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-100">Pedidos en Cocina & Delivery</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                        {displayOrders.length} {displayOrders.length === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Tiempo Real</span>
                  </div>
                  <div className="space-y-3">
                    {displayOrders.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-slate-800">
                        Sin pedidos activos o entregados hoy en Firestore para <span className="font-semibold text-slate-300">{merchantId}</span>.
                      </div>
                    ) : (
                      displayOrders.map((ord) => (
                        <div key={ord.id} className="flex items-center justify-between p-3.5 bg-slate-800/40 rounded-xl border border-slate-800 hover:bg-slate-800/70 transition">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-400 text-sm">
                                #{(ord.orderCode || ord.orderNumber || ord.id.substring(0, 8)).toUpperCase()}
                              </span>
                              <span className="text-slate-300 font-semibold text-sm">{ord.customerName || ord.clienteNombre || 'Cliente'}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {Array.isArray(ord.items)
                                ? ord.items.map((i: any) => `${i.quantity || 1}x ${i.productName || i.name || 'Item'}`).join(', ')
                                : ord.itemsSummary || ord.notes || 'Detalle de pedido'}
                            </p>
                            {(ord.assignedCourierName || ord.driverName || ord.motorizadoNombre) && (
                              <p className="text-[11px] text-purple-400 font-semibold mt-1">
                                🛵 {ord.assignedCourierName || ord.driverName || ord.motorizadoNombre} ({ord.assignedCourierPlate || ord.motorizadoPlaca || 'M 123456'})
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              {(ord.status || ord.estado || 'PENDING').toUpperCase()}
                            </span>
                            <p className="text-xs text-emerald-400 font-bold mt-1.5" title="Venta de productos del comercio">
                              C$ {Number(ord.merchantGrossSales ?? (ord.subtotal ? Math.max(0, Number(ord.subtotal) - Number(ord.discountAmount || ord.couponDiscount || 0)) : (ord.total || ord.totalAmount || 0))).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Total Pago: C$ {Number(ord.total || ord.totalAmount || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );

            case 'reviews': {
              const totalRev = reviews.length;
              const avgScore = totalRev > 0
                ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / totalRev).toFixed(1)
                : '5.0';
              const avgNum = parseFloat(avgScore);

              const starCounts = [5, 4, 3, 2, 1].map((stars) => {
                const count = reviews.filter(r => Math.round(Number(r.rating) || 0) === stars).length;
                return {
                  stars,
                  count,
                  pct: totalRev > 0 ? Math.round((count / totalRev) * 100) : 0
                };
              });

              return (
                <div key="reviews" className="bg-obsidian-900 border border-slate-800 rounded-xl p-5">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                        <Star className="w-5 h-5 fill-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-100">Opiniones & Satisfacción de Clientes</h2>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                            ⭐ {avgScore} / 5.0
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Calificaciones y comentarios en tiempo real emitidos por comensales en la App Cliente.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono self-start sm:self-auto bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                      {totalRev} {totalRev === 1 ? 'reseña registrada' : 'reseñas registradas'}
                    </span>
                  </div>

                  {reviewsLoading ? (
                    <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span>Cargando opiniones de clientes...</span>
                    </div>
                  ) : totalRev === 0 ? (
                    <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 flex flex-col items-center">
                      <div className="p-3 bg-slate-800/80 rounded-full text-slate-500 mb-3">
                        <MessageSquareQuote className="w-8 h-8" />
                      </div>
                      <p className="font-semibold text-slate-300 text-sm">Sin opiniones registradas aún</p>
                      <p className="text-xs text-slate-500 max-w-md mt-1">
                        Cuando tus clientes reciban sus pedidos y califiquen los productos y servicio en la app móvil, podrás leer sus comentarios y ver las calificaciones aquí en tiempo real.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Rating Summary Bar */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 items-center">
                        <div className="flex flex-col items-center justify-center text-center p-2 md:border-r md:border-slate-800">
                          <span className="text-4xl font-extrabold text-slate-100">{avgScore}</span>
                          <div className="flex items-center gap-1 my-1.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${s <= Math.round(avgNum) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-400">Promedio global ({totalRev} opiniones)</span>
                        </div>

                        {/* Breakdown Bars */}
                        <div className="md:col-span-2 space-y-1.5">
                          {starCounts.map(({ stars, count, pct }) => (
                            <div key={stars} className="flex items-center gap-2 text-xs">
                              <span className="w-8 font-mono text-slate-400 flex items-center gap-0.5">
                                {stars} <Star className="w-3 h-3 fill-amber-400/80 text-amber-400/80" />
                              </span>
                              <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-12 text-right font-mono text-slate-400 text-[11px]">
                                {count} ({pct}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reviews Stream */}
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {reviews.map((rev) => {
                          const ratingVal = Math.round(Number(rev.rating) || 5);
                          const dateFormatted = rev.date || (rev.createdAt?.toDate ? rev.createdAt.toDate().toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Reciente');
                          const clientName = rev.userName || rev.authorName || 'Cliente';
                          const firstLetter = clientName.charAt(0).toUpperCase();

                          return (
                            <div
                              key={rev.id}
                              className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  {rev.userPhotoUrl ? (
                                    <img
                                      src={rev.userPhotoUrl}
                                      alt={clientName}
                                      className="w-8 h-8 rounded-full object-cover border border-slate-700"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                                      {firstLetter}
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-slate-200">{clientName}</span>
                                      {rev.orderId && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                                          #{rev.orderId.substring(0, 8).toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-slate-500">{dateFormatted}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-0.5 text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-3.5 h-3.5 ${s <= ratingVal ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                                    />
                                  ))}
                                  <span className="text-xs font-bold ml-1 text-amber-300">{rev.rating || 5}</span>
                                </div>
                              </div>

                              {rev.comment && rev.comment.trim().length > 0 ? (
                                <p className="text-xs text-slate-300 pl-11 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                                  "{rev.comment}"
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-500 pl-11 italic">
                                  (Calificación sin comentario escrito)
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            case 'health':
              return (
                <div key="health" className="bg-obsidian-900 border border-slate-800 rounded-xl p-5">
                  <h2 className="text-md font-bold text-slate-100 mb-3 font-sans">Restaurant Health & Operational Status</h2>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 font-sans">Readiness Score</span>
                    <span className="text-sm font-bold text-slate-500 font-sans">N/A</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-4">
                    <div className="bg-slate-700 h-full w-0" />
                  </div>
                  <div className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-800 rounded-xl font-sans">
                    Módulo operativo en desarrollo
                  </div>
                </div>
              );

            case 'chart':
              return (
                <div key="chart" className="bg-obsidian-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-md font-bold text-slate-100 font-sans">Tendencia de Ventas (Últimos 7 Días)</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Ventas brutas acumuladas por día calendario</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 font-mono">
                      C$ {totalTrendSales.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {totalTrendSales === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-500 text-center font-sans">
                      No existen ventas registradas en los últimos 7 días.
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-2 pt-2 pb-1 items-end h-32">
                      {dailyTrend.map((td) => {
                        const maxSale = Math.max(...dailyTrend.map(d => d.amount), 1);
                        const heightPercent = Math.max(8, Math.round((td.amount / maxSale) * 100));
                        return (
                          <div key={td.dateStr} className="flex flex-col items-center h-full justify-end group">
                            <span className="text-[10px] text-slate-400 font-mono mb-1 opacity-0 group-hover:opacity-100 transition truncate max-w-full">
                              C$ {Math.round(td.amount)}
                            </span>
                            <div className="w-full bg-slate-800/80 rounded-t-md overflow-hidden flex items-end h-20">
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className={`w-full transition-all duration-500 rounded-t-md ${
                                  td.label === 'Hoy'
                                    ? 'bg-blue-500 group-hover:bg-blue-400 shadow-lg shadow-blue-500/20'
                                    : td.amount > 0
                                    ? 'bg-emerald-500/80 group-hover:bg-emerald-400'
                                    : 'bg-slate-700/40'
                                }`}
                              />
                            </div>
                            <span className={`text-[11px] mt-1.5 font-medium truncate ${td.label === 'Hoy' ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                              {td.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};
