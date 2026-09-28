/**
 * useSettlements — React Hook para el Ciclo de Liquidaciones Comerciales
 * BlueSystem Delivery Enterprise — Protocolo BSD-FINANCE-MERCHANT-SETTLEMENT-001
 *
 * Expone las liquidaciones en tiempo real para el comercio autenticado y provee
 * las acciones transaccionales autoritativas en backend:
 * - confirmSettlement (Confirmación y congelamiento)
 * - disputeSettlement (Apertura formal de disputa)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../services/firebase';

export type SettlementStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'CLOSED'
  | 'DISPUTED'
  | 'UNDER_REVIEW'
  | 'RESOLVED';

export interface SettlementHistoryItem {
  fromStatus: SettlementStatus;
  toStatus: SettlementStatus;
  actorUid: string;
  actorRole: string;
  actorEmail?: string;
  timestamp: any;
  note?: string;
}

export interface DisputeDetails {
  disputedAt: any;
  disputedByUid: string;
  disputedByEmail: string;
  reason: string;
  claimedDifferenceCents: number;
  description: string;
  evidenceUrl?: string | null;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  resolution?: string | null;
  resolvedByUid?: string | null;
  resolvedAt?: any;
}

export interface MerchantSettlement {
  settlementId: string;
  businessId: string;
  businessName?: string;
  currency: 'NIO';
  periodType: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  cutoffAt: Date | null;
  grossSalesCents: number;
  platformFeesCents: number;
  discountsCents: number;
  adjustmentsCents: number;
  netPayableCents: number;
  ordersCount: number;
  // Valores en Córdobas listos para display
  grossSalesNio: number;
  platformFeesNio: number;
  netPayableNio: number;
  paidCents?: number | null;
  paidNio?: number | null;
  bankName?: string | null;
  transferReference?: string | null;
  paymentDate?: Date | null;
  receiptUrl?: string | null;
  receiptPath?: string | null;
  status: SettlementStatus;
  isFrozen: boolean;
  frozenAt?: Date | null;
  confirmedBy?: {
    confirmedAt: any;
    confirmedByUid: string;
    confirmedByEmail: string;
    notes?: string;
  } | null;
  dispute?: DisputeDetails | null;
  history?: SettlementHistoryItem[];
  createdAt: Date | null;
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  return null;
}

const PAGE_SIZE = 20;

export function useSettlements(businessId: string | null | undefined) {
  const [settlements, setSettlements] = useState<MerchantSettlement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);

  const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [nextCursor, setNextCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchPage = useCallback(
    async (pageIndex: number, cursor: QueryDocumentSnapshot<DocumentData> | null) => {
      if (!businessId) {
        setSettlements([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setIsError(false);
      setErrorMessage(null);

      try {
        let q = query(
          collection(db, 'merchant_settlements'),
          where('businessId', '==', businessId),
          orderBy('createdAt', 'desc')
        );

        if (cursor) {
          q = query(q, startAfter(cursor), limit(PAGE_SIZE + 1));
        } else {
          q = query(q, limit(PAGE_SIZE + 1));
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs;
        const hasMore = docs.length > PAGE_SIZE;
        const pageDocs = hasMore ? docs.slice(0, PAGE_SIZE) : docs;

        const list: MerchantSettlement[] = pageDocs.map((docSnap) => {
          const d = docSnap.data();
          const grossCents = Number(d.grossSalesCents || 0);
          const feesCents = Number(d.platformFeesCents || 0);
          const netCents = Number(d.netPayableCents || 0);
          const paidCents = d.paidCents != null ? Number(d.paidCents) : null;

          return {
            settlementId: docSnap.id,
            businessId: d.businessId,
            businessName: d.businessName,
            currency: 'NIO',
            periodType: d.periodType || 'CUSTOM',
            periodStart: toDate(d.periodStart),
            periodEnd: toDate(d.periodEnd),
            cutoffAt: toDate(d.cutoffAt),
            grossSalesCents: grossCents,
            platformFeesCents: feesCents,
            discountsCents: Number(d.discountsCents || 0),
            adjustmentsCents: Number(d.adjustmentsCents || 0),
            netPayableCents: netCents,
            ordersCount: Number(d.ordersCount || 0),
            grossSalesNio: grossCents / 100,
            platformFeesNio: feesCents / 100,
            netPayableNio: netCents / 100,
            paidCents,
            paidNio: paidCents != null ? paidCents / 100 : null,
            bankName: d.bankName || null,
            transferReference: d.transferReference || null,
            paymentDate: toDate(d.paymentDate),
            receiptUrl: d.receiptUrl || null,
            receiptPath: d.receiptPath || null,
            status: (d.status || 'DRAFT') as SettlementStatus,
            isFrozen: d.isFrozen === true,
            frozenAt: toDate(d.frozenAt),
            confirmedBy: d.confirmedBy || null,
            dispute: d.dispute || null,
            history: d.history || [],
            createdAt: toDate(d.createdAt),
          };
        });

        setSettlements(list);
        setHasNextPage(hasMore);
        setCurrentPage(pageIndex);
        if (hasMore && pageDocs.length > 0) {
          setNextCursor(pageDocs[pageDocs.length - 1]);
        } else {
          setNextCursor(null);
        }
      } catch (err: any) {
        console.error('[useSettlements] Error al cargar liquidaciones:', err);
        setIsError(true);
        setErrorMessage('No se pudieron sincronizar las liquidaciones comerciales.');
      } finally {
        setIsLoading(false);
      }
    },
    [businessId]
  );

  useEffect(() => {
    setCurrentPage(1);
    setPageCursors([null]);
    setNextCursor(null);
    fetchPage(1, null);
  }, [businessId, fetchPage]);

  const loadNextPage = async () => {
    if (!hasNextPage || !nextCursor || isLoading) return;
    const nextPageNumber = currentPage + 1;
    setPageCursors((prev) => {
      const updated = [...prev];
      updated[nextPageNumber - 1] = nextCursor;
      return updated;
    });
    await fetchPage(nextPageNumber, nextCursor);
  };

  const loadPrevPage = async () => {
    if (currentPage <= 1 || isLoading) return;
    const prevPageNumber = currentPage - 1;
    const prevCursor = pageCursors[prevPageNumber - 1] || null;
    await fetchPage(prevPageNumber, prevCursor);
  };

  const refreshSettlements = async () => {
    const currentCursor = pageCursors[currentPage - 1] || null;
    await fetchPage(currentPage, currentCursor);
  };

  // Acción: Confirmar Liquidación
  const confirmSettlement = async (settlementId: string, notes?: string) => {
    setIsSubmittingAction(true);
    try {
      const confirmCallable = httpsCallable(functions, 'merchantConfirmSettlement');
      const result = await confirmCallable({ settlementId, notes });
      await refreshSettlements();
      return result.data;
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Acción: Disputar Liquidación
  const disputeSettlement = async (params: {
    settlementId: string;
    reason: string;
    claimedDifferenceCents: number;
    description: string;
    evidenceUrl?: string;
  }) => {
    setIsSubmittingAction(true);
    try {
      const disputeCallable = httpsCallable(functions, 'merchantDisputeSettlement');
      const result = await disputeCallable(params);
      await refreshSettlements();
      return result.data;
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return {
    settlements,
    isLoading,
    isError,
    errorMessage,
    isSubmittingAction,
    currentPage,
    hasNextPage,
    hasPrevPage: currentPage > 1,
    loadNextPage,
    loadPrevPage,
    refreshSettlements,
    confirmSettlement,
    disputeSettlement,
  };
}
