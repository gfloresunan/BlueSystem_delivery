/**
 * usePlatformAnalytics — Actividad #7 Platform Origin Analytics Engine
 * BlueSystem Delivery Enterprise — Production Grade / Multi-Tenant / E2E Certified
 *
 * Procesa y agrega pedidos en tiempo real o por rango de fecha acotado para:
 * - Plataforma (ANDROID, IOS, WEB, LEGACY)
 * - Producto × Plataforma
 * - Comercio × Plataforma
 * - Métricas Financieras (Ventas NIO por canal)
 * - Métricas de negocio: ticket promedio, hora pico, tasa de cancelación
 *
 * Cumplimiento:
 * - EIAM & Multi-Tenant Isolation: Scoped por businessId / orgId / platform role
 * - Zero Mock Data: Datos 100% reales derivados de /orders
 * - Performance: Filtros indexados en Firestore (startAt/endAt por createdAt) + limit(500)
 * - ADR-003: Sin N+1 queries, sin listeners masivos
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

/**
 * DEC-03: Monetary Value Resolution
 * Resuelve las ventas netas reales del comercio excluyendo envío y propinas de motorizado.
 */
export function resolveOrderCommerceSales(data: any): number {
  if (!data || typeof data !== 'object') return 0;
  if (typeof data.merchantGrossSales === 'number' && !isNaN(data.merchantGrossSales) && data.merchantGrossSales >= 0) {
    return data.merchantGrossSales;
  }
  const subtotal = Number(data.subtotal || data.subtotalAmount || 0);
  const discount = Number(data.discountAmount || data.couponDiscount || data.totalDiscount || 0);
  const calculated = Math.max(0, subtotal - discount);
  if (calculated > 0) return calculated;

  const delivery = Number(data.deliveryFee || data.costoEnvio || 0);
  const tip = Number(data.tipAmount || data.tip || 0);
  const total = Number(data.total || data.totalAmount || 0);
  return Math.max(0, total - delivery - tip);
}
export function isTestOrNonCommerce(orderId: string, data: any): boolean {
  if (!orderId || !data) return true;
  if (data.serviceType === 'X_TO_Y_DELIVERY') return true;
  if (data.isTest === true) return true;

  const idLower = orderId.toLowerCase();
  if (
    idLower.startsWith('env_') ||
    idLower.startsWith('ped_e2e_') ||
    idLower.startsWith('ped_ux_') ||
    idLower.startsWith('ped_val_') ||
    idLower.startsWith('ord_e2e_') ||
    idLower.startsWith('test_')
  ) {
    return true;
  }

  const cust = (data.customerName || data.userName || '').toString().toLowerCase();
  if (
    cust.includes('ited virtual') ||
    cust.includes('test') ||
    cust.includes('prueba')
  ) {
    return true;
  }

  const bName = (data.businessName || data.restaurantName || '').toString().toLowerCase();
  if (bName.includes('punto de recogida x') || bName.includes('prueba')) {
    return true;
  }

  const bId = (data.businessId || data.restaurantId || '').toString().trim();
  if (!bId || bId === 'unknown' || bId === 'sin_id') {
    return true;
  }

  return false;
}

export type PlatformFilter = 'ALL' | 'ANDROID' | 'IOS' | 'WEB';
export type DateRangePreset = 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH' | 'CUSTOM';

export interface PlatformMetrics {
  totalOrders: number;
  totalSales: number;
  cancelledOrders: number;
  cancelRate: number;
  avgTicket: number;
  androidOrders: number;
  androidSales: number;
  androidAvgTicket: number;
  androidPercentage: number;
  iosOrders: number;
  iosSales: number;
  iosAvgTicket: number;
  iosPercentage: number;
  webOrders: number;
  webSales: number;
  webAvgTicket: number;
  webPercentage: number;
  legacyOrders: number;
  legacySales: number;
  legacyPercentage: number;
  peakHour: number | null; // 0-23
  topProductName: string | null;
}

export interface ProductPlatformRow {
  productId: string;
  productName: string;
  imageUrl?: string;
  totalQuantity: number;
  totalOrders: number;
  totalRevenue: number;
  androidQuantity: number;
  androidRevenue: number;
  iosQuantity: number;
  iosRevenue: number;
  webQuantity: number;
  webRevenue: number;
  legacyQuantity: number;
  legacyRevenue: number;
}

export interface CommercePlatformRow {
  businessId: string;
  businessName: string;
  totalOrders: number;
  totalRevenue: number;
  androidOrders: number;
  androidPercentage: number;
  iosOrders: number;
  iosPercentage: number;
  webOrders: number;
  webPercentage: number;
  legacyOrders: number;
  legacyPercentage: number;
}

export interface DailyTrendPoint {
  dateKey: string; // YYYY-MM-DD
  label: string;
  totalOrders: number;
  androidOrders: number;
  iosOrders: number;
  webOrders: number;
  legacyOrders: number;
  totalSales: number;
}

export interface HourlyPoint {
  hour: number;
  label: string;
  totalOrders: number;
}

export interface UsePlatformAnalyticsOptions {
  overrideBusinessId?: string;
  overrideTenantId?: string;
}

const QUERY_LIMIT = 500;

export function usePlatformAnalytics(options: UsePlatformAnalyticsOptions = {}) {
  const { identity } = useAuth();

  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('30DAYS');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>('ALL');
  const [searchProductQuery, setSearchProductQuery] = useState<string>('');

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Determinar los identificadores autorizados por EIAM
  const effectiveBusinessId = useMemo(() => {
    if (options.overrideBusinessId) return options.overrideBusinessId;
    return identity?.businessId || '';
  }, [options.overrideBusinessId, identity?.businessId]);

  const effectiveTenantId = useMemo(() => {
    if (options.overrideTenantId) return options.overrideTenantId;
    return (identity as any)?.tenantId || identity?.orgId || '';
  }, [options.overrideTenantId, identity]);

  const isPlatformAdmin = useMemo(() => {
    const role = (identity?.role || '').toUpperCase();
    return ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'OPERATIONS'].includes(role);
  }, [identity?.role]);

  // Calcular fechas de inicio y fin de la ventana temporal
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (dateRangePreset) {
      case 'TODAY':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case '7DAYS':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        break;
      case '30DAYS':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        break;
      case 'THIS_MONTH':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'CUSTOM':
        if (customStartDate) {
          const parts = customStartDate.split('-');
          start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
        }
        if (customEndDate) {
          const parts = customEndDate.split('-');
          end = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
        }
        break;
    }

    return { startDate: start, endDate: end };
  }, [dateRangePreset, customStartDate, customEndDate]);

  // ─── FIX CRÍTICO: Listener con filtros de fecha en Firestore + limit ──────
  useEffect(() => {
    setLoading(true);
    setError(null);

    const startTs = Timestamp.fromDate(startDate);
    const endTs = Timestamp.fromDate(endDate);
    const ordersCol = collection(db, 'orders');
    let q;

    if (effectiveBusinessId) {
      // Comercio individual: filtrar por businessId + rango de fecha en servidor
      q = query(
        ordersCol,
        where('businessId', '==', effectiveBusinessId),
        where('createdAt', '>=', startTs),
        where('createdAt', '<=', endTs),
        orderBy('createdAt', 'desc'),
        limit(QUERY_LIMIT)
      );
    } else if (effectiveTenantId && !isPlatformAdmin) {
      // Tenant multi-branch: filtrar por tenantId + rango de fecha en servidor
      q = query(
        ordersCol,
        where('tenantId', '==', effectiveTenantId),
        where('createdAt', '>=', startTs),
        where('createdAt', '<=', endTs),
        orderBy('createdAt', 'desc'),
        limit(QUERY_LIMIT)
      );
    } else if (isPlatformAdmin) {
      // Platform Admin: todos los pedidos en el rango de fecha
      q = query(
        ordersCol,
        where('createdAt', '>=', startTs),
        where('createdAt', '<=', endTs),
        orderBy('createdAt', 'desc'),
        limit(QUERY_LIMIT)
      );
    } else {
      setOrders([]);
      setLoading(false);
      return;
    }

    let unsubFallback: (() => void) | null = null;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          const orderId = doc.id;

          // Ignorar pedidos de prueba/mock y envíos X->Y de paquetería entre usuarios o sin comercio
          if (isTestOrNonCommerce(orderId, data)) {
            return;
          }

          // Resolver fecha del pedido de forma segura (la query ya filtró en servidor)
          let orderDate: Date | null = null;
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === 'function') {
              orderDate = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              orderDate = data.createdAt;
            } else if (typeof data.createdAt === 'string') {
              orderDate = new Date(data.createdAt);
            } else if (typeof data.createdAt.seconds === 'number') {
              orderDate = new Date(data.createdAt.seconds * 1000);
            }
          }

          // Normalizar plataforma canónica:
          // En BlueSystem Delivery, los clientes operan nativamente desde la App Android.
          // Un pedido sin platform explícito proviene del cliente móvil Android.
          let rawPlatform = (data.platform || data.orderSource || data.source || '')
            .toString()
            .trim()
            .toUpperCase();
          if (rawPlatform === 'IOS') {
            rawPlatform = 'IOS';
          } else if (rawPlatform === 'WEB') {
            rawPlatform = 'WEB';
          } else {
            rawPlatform = 'ANDROID';
          }

          list.push({
            id: orderId,
            ...data,
            resolvedPlatform: rawPlatform,
            resolvedCreatedAt: orderDate || new Date(),
          });
        });

        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error('[usePlatformAnalytics] Error leyendo orders:', err);
        // Fallback: intentar sin filtro de fecha compuesto (por si falta el índice)
        if (err.code === 'failed-precondition' && effectiveBusinessId) {
          console.warn('[usePlatformAnalytics] Índice compuesto no disponible. Usando query simple con filtrado en cliente.');
          const fallbackQ = query(
            ordersCol,
            where('businessId', '==', effectiveBusinessId),
            orderBy('createdAt', 'desc'),
            limit(QUERY_LIMIT)
          );
          unsubFallback = onSnapshot(fallbackQ, (snapshot) => {
            const list: any[] = [];
            const startMs = startDate.getTime();
            const endMs = endDate.getTime();
            snapshot.forEach((doc) => {
              const data = doc.data();
              if (isTestOrNonCommerce(doc.id, data)) {
                return;
              }
              let orderDate: Date | null = null;
              if (data.createdAt?.toDate) orderDate = data.createdAt.toDate();
              else if (typeof data.createdAt?.seconds === 'number') orderDate = new Date(data.createdAt.seconds * 1000);
              if (orderDate && (orderDate.getTime() < startMs || orderDate.getTime() > endMs)) return;
              let rawPlatform = (data.platform || '').toString().trim().toUpperCase();
              if (rawPlatform === 'IOS') rawPlatform = 'IOS';
              else if (rawPlatform === 'WEB') rawPlatform = 'WEB';
              else rawPlatform = 'ANDROID';
              list.push({ id: doc.id, ...data, resolvedPlatform: rawPlatform, resolvedCreatedAt: orderDate || new Date() });
            });
            setOrders(list);
            setLoading(false);
          });
          return;
        }
        setError(err.message || 'Error consultando analítica de pedidos.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (unsubFallback) {
        unsubFallback();
      }
    };
  }, [effectiveBusinessId, effectiveTenantId, isPlatformAdmin, startDate, endDate]);

  // Filtrado de pedidos según plataforma seleccionada
  const filteredOrders = useMemo(() => {
    if (selectedPlatform === 'ALL') return orders;
    return orders.filter((o) => o.resolvedPlatform === selectedPlatform);
  }, [orders, selectedPlatform]);

  // ─── Métricas agregadas de plataforma + métricas de negocio ─────────────
  const platformMetrics = useMemo<PlatformMetrics>(() => {
    let totalOrders = 0;
    let totalSales = 0;
    let cancelledOrders = 0;
    let androidOrders = 0;
    let androidSales = 0;
    let iosOrders = 0;
    let iosSales = 0;
    let webOrders = 0;
    let webSales = 0;
    let legacyOrders = 0;
    let legacySales = 0;

    const hourMap = new Map<number, number>();

    orders.forEach((ord) => {
      const statusStr = String(ord.status || ord.estado || '').toLowerCase();
      const isCancelled = ['cancelled', 'rejected', 'cancelado', 'cancel', 'rechazado'].includes(statusStr);
      const amount = resolveOrderCommerceSales(ord);

      totalOrders += 1;
      if (isCancelled) {
        cancelledOrders += 1;
      } else {
        totalSales += amount;
      }

      // Hora pico
      const orderDate = ord.resolvedCreatedAt as Date;
      if (orderDate instanceof Date && !isNaN(orderDate.getTime())) {
        const h = orderDate.getHours();
        hourMap.set(h, (hourMap.get(h) || 0) + 1);
      }

      switch (ord.resolvedPlatform) {
        case 'ANDROID':
          androidOrders += 1;
          if (!isCancelled) androidSales += amount;
          break;
        case 'IOS':
          iosOrders += 1;
          if (!isCancelled) iosSales += amount;
          break;
        case 'WEB':
          webOrders += 1;
          if (!isCancelled) webSales += amount;
          break;
        default:
          androidOrders += 1;
          if (!isCancelled) androidSales += amount;
          break;
      }
    });

    const activeSales = totalOrders - cancelledOrders;
    const safeDivide = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

    // Hora con más pedidos
    let peakHour: number | null = null;
    let maxHourCount = 0;
    hourMap.forEach((count, hour) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = hour;
      }
    });

    return {
      totalOrders,
      totalSales,
      cancelledOrders,
      cancelRate: safeDivide(cancelledOrders, totalOrders),
      avgTicket: activeSales > 0 ? totalSales / activeSales : 0,
      androidOrders,
      androidSales,
      androidAvgTicket: androidOrders > 0 ? androidSales / androidOrders : 0,
      androidPercentage: safeDivide(androidOrders, totalOrders),
      iosOrders,
      iosSales,
      iosAvgTicket: iosOrders > 0 ? iosSales / iosOrders : 0,
      iosPercentage: safeDivide(iosOrders, totalOrders),
      webOrders,
      webSales,
      webAvgTicket: webOrders > 0 ? webSales / webOrders : 0,
      webPercentage: safeDivide(webOrders, totalOrders),
      legacyOrders,
      legacySales,
      legacyPercentage: safeDivide(legacyOrders, totalOrders),
      peakHour,
      topProductName: null, // Rellenado por productPlatformMatrix
    };
  }, [orders]);

  // ─── Matriz cruzada Producto × Plataforma ───────────────────────────────
  const productPlatformMatrix = useMemo<ProductPlatformRow[]>(() => {
    const map = new Map<string, ProductPlatformRow>();

    orders.forEach((ord) => {
      const items = Array.isArray(ord.items) ? ord.items : [];
      const platform = ord.resolvedPlatform as 'ANDROID' | 'IOS' | 'WEB' | 'LEGACY';

      items.forEach((item: any) => {
        const prodId = String(item.productId || item.id || item.productName || 'unknown');
        const prodName = String(item.productName || item.name || 'Producto Sin Nombre');
        const qty = Number(item.quantity || 1);
        const itemPrice = Number(item.price || item.unitPrice || item.unitCost || 0);
        const revenue = Number(item.subtotal || item.total || qty * itemPrice || 0);
        const img = item.imageUrl || item.image || item.imageURL || '';

        if (!map.has(prodId)) {
          map.set(prodId, {
            productId: prodId,
            productName: prodName,
            imageUrl: img,
            totalQuantity: 0,
            totalOrders: 0,
            totalRevenue: 0,
            androidQuantity: 0,
            androidRevenue: 0,
            iosQuantity: 0,
            iosRevenue: 0,
            webQuantity: 0,
            webRevenue: 0,
            legacyQuantity: 0,
            legacyRevenue: 0,
          });
        }

        const row = map.get(prodId)!;
        row.totalQuantity += qty;
        row.totalOrders += 1;
        row.totalRevenue += revenue;

        if (platform === 'ANDROID') {
          row.androidQuantity += qty;
          row.androidRevenue += revenue;
        } else if (platform === 'IOS') {
          row.iosQuantity += qty;
          row.iosRevenue += revenue;
        } else if (platform === 'WEB') {
          row.webQuantity += qty;
          row.webRevenue += revenue;
        } else {
          row.legacyQuantity += qty;
          row.legacyRevenue += revenue;
        }
      });
    });

    let result = Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);

    if (searchProductQuery.trim()) {
      const qLower = searchProductQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.productName.toLowerCase().includes(qLower) ||
          r.productId.toLowerCase().includes(qLower)
      );
    }

    return result;
  }, [orders, searchProductQuery]);

  // ─── Hora pico por distribución horaria ─────────────────────────────────
  const hourlyDistribution = useMemo<HourlyPoint[]>(() => {
    const map = new Map<number, number>();
    orders.forEach((ord) => {
      const d = ord.resolvedCreatedAt as Date;
      if (d instanceof Date && !isNaN(d.getTime())) {
        const h = d.getHours();
        map.set(h, (map.get(h) || 0) + 1);
      }
    });

    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${h.toString().padStart(2, '0')}:00`,
      totalOrders: map.get(h) || 0,
    }));
  }, [orders]);

  // ─── Matriz cruzada Comercio × Plataforma (Holding / Multi-Branch) ───────
  const commercePlatformMatrix = useMemo<CommercePlatformRow[]>(() => {
    const map = new Map<string, CommercePlatformRow>();

    orders.forEach((ord) => {
      const bizId = String(ord.businessId || 'unknown');
      const bizName = String(ord.businessName || ord.restaurantName || bizId);
      const total = resolveOrderCommerceSales(ord);
      const platform = ord.resolvedPlatform as 'ANDROID' | 'IOS' | 'WEB' | 'LEGACY';

      if (!map.has(bizId)) {
        map.set(bizId, {
          businessId: bizId,
          businessName: bizName,
          totalOrders: 0,
          totalRevenue: 0,
          androidOrders: 0,
          androidPercentage: 0,
          iosOrders: 0,
          iosPercentage: 0,
          webOrders: 0,
          webPercentage: 0,
          legacyOrders: 0,
          legacyPercentage: 0,
        });
      }

      const row = map.get(bizId)!;
      row.totalOrders += 1;
      row.totalRevenue += total;

      if (platform === 'ANDROID') row.androidOrders += 1;
      else if (platform === 'IOS') row.iosOrders += 1;
      else if (platform === 'WEB') row.webOrders += 1;
      else row.androidOrders += 1;
    });

    const rows = Array.from(map.values());
    rows.forEach((r) => {
      if (r.totalOrders > 0) {
        r.androidPercentage = (r.androidOrders / r.totalOrders) * 100;
        r.iosPercentage = (r.iosOrders / r.totalOrders) * 100;
        r.webPercentage = (r.webOrders / r.totalOrders) * 100;
        r.legacyPercentage = 0;
      }
    });

    return rows.sort((a, b) => b.totalOrders - a.totalOrders);
  }, [orders]);

  // ─── Tendencia diaria ────────────────────────────────────────────────────
  const dailyTrends = useMemo<DailyTrendPoint[]>(() => {
    const dayMap = new Map<string, DailyTrendPoint>();

    orders.forEach((ord) => {
      const d = ord.resolvedCreatedAt as Date;
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('es-NI', { day: '2-digit', month: 'short' });
      const amount = resolveOrderCommerceSales(ord);
      const platform = ord.resolvedPlatform;

      if (!dayMap.has(key)) {
        dayMap.set(key, {
          dateKey: key,
          label,
          totalOrders: 0,
          androidOrders: 0,
          iosOrders: 0,
          webOrders: 0,
          legacyOrders: 0,
          totalSales: 0,
        });
      }

      const point = dayMap.get(key)!;
      point.totalOrders += 1;
      point.totalSales += amount;

      if (platform === 'ANDROID') point.androidOrders += 1;
      else if (platform === 'IOS') point.iosOrders += 1;
      else if (platform === 'WEB') point.webOrders += 1;
      else point.androidOrders += 1;
    });

    return Array.from(dayMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [orders]);

  // ─── Exportar a CSV ──────────────────────────────────────────────────────
  const exportAnalyticsCsv = useCallback(() => {
    const headers = [
      'ID_Producto',
      'Producto',
      'Cantidad_Total',
      'Total_Pedidos',
      'Ingresos_Totales_NIO',
      'Android_Unidades',
      'Android_Ingresos_NIO',
      'iOS_Unidades',
      'iOS_Ingresos_NIO',
      'Web_Unidades',
      'Web_Ingresos_NIO',
      'Legacy_Unidades',
      'Legacy_Ingresos_NIO',
    ];

    const rows = productPlatformMatrix.map((p) => [
      `"${p.productId}"`,
      `"${p.productName.replace(/"/g, '""')}"`,
      p.totalQuantity,
      p.totalOrders,
      p.totalRevenue.toFixed(2),
      p.androidQuantity,
      p.androidRevenue.toFixed(2),
      p.iosQuantity,
      p.iosRevenue.toFixed(2),
      p.webQuantity,
      p.webRevenue.toFixed(2),
      p.legacyQuantity,
      p.legacyRevenue.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `analitica_plataforma_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [productPlatformMatrix]);

  return {
    loading,
    error,
    ordersCount: orders.length,
    filteredOrders,
    platformMetrics,
    productPlatformMatrix,
    commercePlatformMatrix,
    dailyTrends,
    hourlyDistribution,
    dateRangePreset,
    setDateRangePreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    selectedPlatform,
    setSelectedPlatform,
    searchProductQuery,
    setSearchProductQuery,
    exportAnalyticsCsv,
    isPlatformAdmin,
  };
}
