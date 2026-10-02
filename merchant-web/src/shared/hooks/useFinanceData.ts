/**
 * useFinanceData — Phase 5 & Actividad #4 Finance Integration
 * BlueSystem Delivery Enterprise
 *
 * Hook reactivo que escucha /merchant_summaries/{businessId} en tiempo real
 * y expone métricas financieras en unidades de Córdoba (NIO) a partir de
 * los centavos almacenados.
 *
 * Soporta filtros de período: 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'CUSTOM'.
 * Cumplimiento ADR-003: un único listener por documento agregado (no N+1 queries).
 */

import { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  limit,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MerchantFinanceSummary {
  businessId: string;
  // Métricas del período seleccionado (en Córdobas, ya dividido por 100)
  revenue: number;
  ordersCount: number;
  platformFees: number;
  netRevenue: number;
  // Acumulado pendiente de liquidar
  pendingSettlement: number;
  // Metadata
  lastUpdatedAt: Date | null;
  lastOrderId?: string;
}

export type FinancialEventType = 'ORDER_REVENUE' | 'PLATFORM_FEE' | 'REFUND' | 'ADJUSTMENT';
export type FinancialDirection = 'CREDIT' | 'DEBIT';

export interface FinancialEvent {
  eventId: string;
  businessId: string;
  orderId: string;
  eventType: FinancialEventType;
  amountCents: number;
  amount: number; // amountCents / 100 — listo para display
  direction: FinancialDirection;
  currency: 'NIO';
  description: string;
  orderTotal: number;
  customerTotal?: number;
  merchantGrossSales?: number;
  createdAt: Date | null;
  idempotencyKey: string;
}

export type FinanceFilterPeriod = 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'CUSTOM';

export interface UseFinanceDataOptions {
  period?: FinanceFilterPeriod;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}

export interface UseFinanceDataReturn {
  summary: MerchantFinanceSummary | null;
  recentEvents: FinancialEvent[];
  filteredEvents: FinancialEvent[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  periodLabel: string;
  /** Porcentaje de comisión resuelto de platform_config/fees (0.15 = 15%) */
  platformFeePercent: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convierte centavos (integer) a Córdobas (número con 2 decimales) */
function centsToNio(cents: number): number {
  return Math.round(cents) / 100;
}

/** Convierte Timestamp de Firestore a Date */
function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const EMPTY_SUMMARY: MerchantFinanceSummary = {
  businessId: '',
  revenue: 0,
  ordersCount: 0,
  platformFees: 0,
  netRevenue: 0,
  pendingSettlement: 0,
  lastUpdatedAt: null,
};

export function useFinanceData(
  businessId: string | null | undefined,
  options?: UseFinanceDataOptions
): UseFinanceDataReturn {
  const period = options?.period || 'TODAY';
  const dateFrom = options?.dateFrom;
  const dateTo = options?.dateTo;

  const [summary, setSummary] = useState<MerchantFinanceSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<FinancialEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<FinancialEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Porcentaje de comisión resuelto dinámicamente desde SSOT canónico (/system_config/global)
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(0.15);

  const unsubSummary = useRef<Unsubscribe | null>(null);
  const unsubEvents = useRef<Unsubscribe | null>(null);

  // Resolver configuración de fee una sola vez al montar desde /system_config/global
  useEffect(() => {
    getDoc(doc(db, 'system_config', 'global'))
      .then((snap) => {
        if (snap.exists() && snap.data()?.merchantCommissionRate != null) {
          setPlatformFeePercent(Number(snap.data()!.merchantCommissionRate));
        }
      })
      .catch(() => {
        // Fallback canónico al 15% si la configuración no está disponible
      });
  }, []);

  // Calcular etiquetas de período
  const periodLabel = (() => {
    if (period === 'TODAY') return 'Hoy';
    if (period === 'YESTERDAY') return 'Ayer';
    if (period === 'THIS_MONTH') return 'Este Mes';
    if (dateFrom && dateTo) return `${dateFrom} al ${dateTo}`;
    if (dateFrom) return `Desde ${dateFrom}`;
    return 'Período Personalizado';
  })();

  useEffect(() => {
    // Limpiar listeners previos
    if (unsubSummary.current) unsubSummary.current();
    if (unsubEvents.current) unsubEvents.current();

    if (!businessId) {
      setIsLoading(false);
      setSummary(null);
      setRecentEvents([]);
      setFilteredEvents([]);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    let summaryLoaded = false;
    let eventsLoaded = false;

    const checkAllLoaded = () => {
      if (summaryLoaded && eventsLoaded) setIsLoading(false);
    };

    // ── Listener 1: /merchant_summaries/{businessId} (ADR-003: doc agregado en tiempo real) ─
    const summaryDocRef = doc(db, 'merchant_summaries', businessId);
    unsubSummary.current = onSnapshot(
      summaryDocRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (period === 'TODAY') {
            setSummary({
              businessId,
              revenue: centsToNio(d.todayRevenueCents ?? 0),
              ordersCount: d.todayOrdersCount ?? 0,
              platformFees: centsToNio(d.todayPlatformFeesCents ?? 0),
              netRevenue: centsToNio(d.todayNetCents ?? 0),
              pendingSettlement: centsToNio(d.pendingSettlementCents ?? 0),
              lastUpdatedAt: toDate(d.lastUpdatedAt),
              lastOrderId: d.lastOrderId,
            });
          }
        } else {
          // Aún no hay datos financieros agregados
          if (period === 'TODAY') {
            setSummary({ ...EMPTY_SUMMARY, businessId });
          }
        }
        summaryLoaded = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('[useFinanceData] Error en summary listener:', err);
        setIsError(true);
        setErrorMessage('No se pudo cargar el resumen financiero. Verifica tu conexión.');
        summaryLoaded = true;
        checkAllLoaded();
      }
    );

    // ── Listener 2: Eventos Financieros (/financial_events) ─────────────────
    // Para TODAY usamos limit(100) — máximo de eventos del día (50 ORDER_REVENUE + 50 PLATFORM_FEE).
    // Para otros períodos, acotamos directamente por fecha en Firestore para garantizar
    // que NUNCA se truncan los resultados del período completo. Esto evita el bug de
    // calcular métricas incompletas (ventas, comisiones, ticket promedio).
    const now = new Date();
    let qStart: Date | null = null;
    let qEnd: Date | null = null;

    if (period === 'TODAY') {
      qStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      qEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      qStart = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
      qEnd   = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
    } else if (period === 'THIS_MONTH') {
      qStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      qEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'CUSTOM') {
      if (dateFrom) {
        const [y, m, d] = dateFrom.split('-').map(Number);
        qStart = new Date(y, m - 1, d, 0, 0, 0, 0);
      }
      if (dateTo) {
        const [y, m, d] = dateTo.split('-').map(Number);
        qEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
      }
    }

    // Construir query con bounds de Firestore cuando es posible
    let eventsQuery;
    if (period === 'TODAY') {
      // Para HOY: limit(100) es suficiente (hasta ~50 órdenes generan 2 eventos c/u)
      eventsQuery = query(
        collection(db, 'financial_events'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    } else if (qStart && qEnd) {
      // Para períodos acotados: query con startAt/endAt en Firestore — sin truncar
      eventsQuery = query(
        collection(db, 'financial_events'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc'),
        endAt(Timestamp.fromDate(qStart)),
        startAt(Timestamp.fromDate(qEnd))
      );
    } else {
      // Fallback defensivo: últimos 500 eventos
      eventsQuery = query(
        collection(db, 'financial_events'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
    }

    unsubEvents.current = onSnapshot(
      eventsQuery,
      (snap) => {
        const allEvents: FinancialEvent[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            eventId: docSnap.id,
            businessId: d.businessId,
            orderId: d.orderId,
            eventType: d.eventType as FinancialEventType,
            amountCents: d.amountCents ?? 0,
            amount: centsToNio(d.amountCents ?? 0),
            direction: d.direction as FinancialDirection,
            currency: 'NIO',
            description: d.description ?? '',
            orderTotal: d.orderTotal ?? 0,
            customerTotal: d.customerTotal ?? d.orderTotal ?? 0,
            merchantGrossSales: d.merchantGrossSales ?? d.subtotal ?? d.orderTotal ?? 0,
            createdAt: toDate(d.createdAt),
            idempotencyKey: d.idempotencyKey ?? '',
          };
        });

        setRecentEvents(allEvents);

        // Filtrado por fecha en memoria de los eventos cargados
        const now = new Date();
        let startBoundary: Date | null = null;
        let endBoundary: Date | null = null;

        if (period === 'TODAY') {
          startBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          endBoundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        } else if (period === 'YESTERDAY') {
          const yest = new Date(now);
          yest.setDate(yest.getDate() - 1);
          startBoundary = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
          endBoundary = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
        } else if (period === 'THIS_MONTH') {
          startBoundary = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          endBoundary = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (period === 'CUSTOM') {
          if (dateFrom) {
            const [y, m, d] = dateFrom.split('-').map(Number);
            startBoundary = new Date(y, m - 1, d, 0, 0, 0, 0);
          }
          if (dateTo) {
            const [y, m, d] = dateTo.split('-').map(Number);
            endBoundary = new Date(y, m - 1, d, 23, 59, 59, 999);
          }
        }

        const matched = allEvents.filter((ev) => {
          if (!ev.createdAt) return false;
          if (startBoundary && ev.createdAt < startBoundary) return false;
          if (endBoundary && ev.createdAt > endBoundary) return false;
          return true;
        });

        setFilteredEvents(matched);

        // Si el período es diferente a TODAY, derivamos el summary a partir de los eventos
        // REALES ya filtrados por Firestore (sin truncar). Los montos de PLATFORM_FEE
        // vienen del ledger inmutable del backend — no se recalculan en el cliente.
        if (period !== 'TODAY') {
          let revCents = 0;
          let feeCents = 0;
          const orderIds = new Set<string>();

          // allEvents ya está acotado por Firestore a las fechas del período;
          // para TODAY el filter en memoria garantiza el día correcto.
          allEvents.forEach((ev) => {
            if (ev.eventType === 'ORDER_REVENUE') {
              revCents += ev.amountCents;
              if (ev.orderId) orderIds.add(ev.orderId);
            } else if (ev.eventType === 'PLATFORM_FEE') {
              feeCents += ev.amountCents;
            }
          });

          const netCents = Math.max(0, revCents - feeCents);

          setSummary({
            businessId,
            revenue: centsToNio(revCents),
            ordersCount: orderIds.size,
            // Comisión leída del ledger inmutable (backend); nunca recalculada en cliente
            platformFees: centsToNio(feeCents),
            netRevenue: centsToNio(netCents),
            pendingSettlement: centsToNio(netCents),
            lastUpdatedAt: allEvents.length > 0 ? allEvents[0].createdAt : null,
          });
        }

        eventsLoaded = true;
        checkAllLoaded();
      },
      (err) => {
        console.error('[useFinanceData] Error en events listener:', err);
        eventsLoaded = true;
        checkAllLoaded();
      }
    );

    return () => {
      if (unsubSummary.current) unsubSummary.current();
      if (unsubEvents.current) unsubEvents.current();
    };
  }, [businessId, period, dateFrom, dateTo]);

  return {
    summary,
    recentEvents,
    filteredEvents: period === 'TODAY' ? recentEvents : filteredEvents,
    isLoading,
    isError,
    errorMessage,
    periodLabel,
    platformFeePercent,
  };
}
