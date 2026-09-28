/**
 * MerchantSettlementsTab — Ciclo de Liquidación Financiera para el Comercio
 * BlueSystem Delivery Enterprise — Protocolo BSD-FINANCE-MERCHANT-SETTLEMENT-001
 *
 * Permite al comercio consultar sus liquidaciones, revisar el desglose y comprobante,
 * confirmar la recepción (cerrando y congelando el período) o reportar discrepancias/abrir disputa.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  FileText,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  X,
  Send,
  Eye,
  Download,
} from 'lucide-react';
import {
  useSettlements,
  MerchantSettlement,
  SettlementStatus,
} from '../../shared/hooks/useSettlements';
import { generateSettlementActPdf } from '../../shared/utils/settlementActPdf';

interface MerchantSettlementsTabProps {
  businessId: string;
  pendingSettlementNio: number;
}

function formatNio(amount: number): string {
  return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('es-NI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('es-NI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const MerchantSettlementsTab: React.FC<MerchantSettlementsTabProps> = ({
  businessId,
  pendingSettlementNio,
}) => {
  const {
    settlements,
    isLoading,
    isError,
    errorMessage,
    isSubmittingAction,
    currentPage,
    hasNextPage,
    hasPrevPage,
    loadNextPage,
    loadPrevPage,
    confirmSettlement,
    disputeSettlement,
  } = useSettlements(businessId);

  // Estados de modales
  const [selectedSettlement, setSelectedSettlement] = useState<MerchantSettlement | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmNotes, setConfirmNotes] = useState<string>('');
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeReason, setDisputeReason] = useState<string>('TRANSFER_MISMATCH');
  const [disputeDifference, setDisputeDifference] = useState<string>('');
  const [disputeDescription, setDisputeDescription] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Status Badge Renderer ──────────────────────────────────────────────────
  const renderStatusBadge = (status: SettlementStatus, isFrozen: boolean) => {
    if (isFrozen || status === 'CLOSED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          <Lock className="w-3 h-3 text-slate-400" />
          Cerrada / Congelada
        </span>
      );
    }
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            <Clock className="w-3 h-3 text-slate-400" />
            Borrador
          </span>
        );
      case 'PREPARED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3 text-blue-400" />
            Preparada
          </span>
        );
      case 'AWAITING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            En Proceso de Pago
          </span>
        );
      case 'PAID':
      case 'AWAITING_CONFIRMATION':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 animate-pulse">
            <DollarSign className="w-3 h-3 text-purple-300" />
            Pago Registrado · Requiere Confirmación
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Confirmada
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            En Disputa
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            En Revisión Admin
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            <CheckCircle2 className="w-3 h-3 text-indigo-300" />
            Disputa Resuelta
          </span>
        );
      default:
        return null;
    }
  };

  // ─── Handler: Confirmar ────────────────────────────────────────────────────
  const handleConfirmSubmit = async () => {
    if (!selectedSettlement) return;
    try {
      await confirmSettlement(selectedSettlement.settlementId, confirmNotes);
      setFeedbackMessage({
        type: 'success',
        text: '¡Liquidación confirmada exitosamente! El período ha quedado cerrado y el registro congelado para auditoría.',
      });
      setShowConfirmModal(false);
      setSelectedSettlement(null);
      setConfirmNotes('');
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error al confirmar liquidación.',
      });
    }
  };

  // ─── Handler: Disputar ─────────────────────────────────────────────────────
  const handleDisputeSubmit = async () => {
    if (!selectedSettlement) return;
    if (!disputeDescription.trim()) {
      alert('Por favor describe detalladamente el motivo de la discrepancia.');
      return;
    }

    const claimedDiffCents = Math.round(Number(disputeDifference || 0) * 100);

    try {
      await disputeSettlement({
        settlementId: selectedSettlement.settlementId,
        reason: disputeReason,
        claimedDifferenceCents: claimedDiffCents,
        description: disputeDescription,
      });
      setFeedbackMessage({
        type: 'success',
        text: 'Disputa registrada formalmente. La liquidación permanecerá bloqueada hasta su revisión por administración.',
      });
      setShowDisputeModal(false);
      setSelectedSettlement(null);
      setDisputeDescription('');
      setDisputeDifference('');
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Error al registrar disputa.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Cargando ciclo de liquidaciones...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-sm font-bold text-slate-200">Error al consultar liquidaciones</p>
        <p className="text-xs text-rose-400">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Feedback Message ──────────────────────────────────────────────── */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Período Actual & Balance Acumulado ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 flex flex-col justify-between gap-4 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                Período en Curso
              </span>
              <h3 className="text-lg font-bold text-white mt-2">
                Saldo Acumulado Pendiente de Liquidar
              </h3>
              <p className="text-xs text-slate-400">
                Monto neto acumulado de pedidos entregados que se consolidará en el próximo corte.
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-300 font-mono tracking-tight">
              {formatNio(pendingSettlementNio)}
            </span>
            <span className="text-xs text-slate-500 font-semibold">Neto a transferir</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between gap-4 shadow-lg">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              Gobernanza Financiera
            </span>
            <h4 className="text-sm font-bold text-slate-200 mt-2">Inmutabilidad Post-Cierre</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Al confirmar la recepción del pago, el período se cierra y el registro se congela de
              forma definitiva para auditoría e integridad contable.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trazabilidad 100% Certificada</span>
          </div>
        </div>
      </div>

      {/* ── Tabla de Liquidaciones Anteriores ─────────────────────────────── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-200">Historial de Liquidaciones</h3>
            <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-mono">
              {settlements.length}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Auditoría BSD-FINANCE-001
          </div>
        </div>

        {settlements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">Sin liquidaciones formalizadas aún</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Cuando la administración realice el primer corte de período y genere la liquidación
              oficial, aparecerá en esta sección para tu revisión y confirmación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Liquidación</th>
                  <th className="py-3 px-4 font-semibold">Período Liquidado</th>
                  <th className="py-3 px-4 font-semibold text-right">Venta Bruta</th>
                  <th className="py-3 px-4 font-semibold text-right">Comisión</th>
                  <th className="py-3 px-4 font-semibold text-right">Neto Pagadero</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {settlements.map((s) => {
                  const isAwaitingAction =
                    s.status === 'AWAITING_CONFIRMATION' || s.status === 'PAID';
                  return (
                    <tr
                      key={s.settlementId}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                        #{s.settlementId.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {formatDateShort(s.periodStart)} al {formatDateShort(s.periodEnd)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {s.ordersCount} órdenes incluidas
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {formatNio(s.grossSalesNio)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-rose-400">
                        - {formatNio(s.platformFeesNio)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-300 text-sm">
                        {formatNio(s.netPayableNio)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(s.status, s.isFrozen)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 mx-auto">
                          <button
                            onClick={() => setSelectedSettlement(s)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 text-xs ${
                              isAwaitingAction
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            <span>{isAwaitingAction ? 'Revisar & Confirmar' : 'Ver Detalle'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          {(s.status === 'CLOSED' || s.isFrozen) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  generateSettlementActPdf(s);
                                } catch (pdfErr: any) {
                                  console.error('Error al generar PDF de liquidación:', pdfErr);
                                  alert('Error al generar PDF: ' + (pdfErr?.message || pdfErr));
                                }
                              }}
                              title="Descargar Acta Oficial de Liquidación (PDF)"
                              className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center justify-center cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Controles de Paginación ────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span className="font-mono">
              Página <strong className="text-white font-bold">{currentPage}</strong>
            </span>
            {isLoading && (
              <span className="text-[11px] text-indigo-400 animate-pulse">
                · Sincronizando...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadPrevPage}
              disabled={!hasPrevPage || isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Anterior</span>
            </button>
            <button
              onClick={loadNextPage}
              disabled={!hasNextPage || isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Siguiente</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: Detalle de Liquidación ─────────────────────────────────── */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl space-y-6 p-6 my-8">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Liquidación Oficial de Comercio
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <h3 className="text-lg font-black text-white font-mono">
                    #{selectedSettlement.settlementId.slice(-10).toUpperCase()}
                  </h3>
                  {renderStatusBadge(selectedSettlement.status, selectedSettlement.isFrozen)}
                </div>
              </div>
              <button
                onClick={() => setSelectedSettlement(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner de Estado Inmutable */}
            {selectedSettlement.isFrozen && (
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="text-emerald-300 font-bold">
                    ✓ Liquidación Confirmada · ✓ Período Cerrado
                  </p>
                  <p className="text-slate-400">
                    🔒 Registro congelado para auditoría contable. No admite modificaciones posteriores.
                  </p>
                </div>
              </div>
            )}

            {/* Banner de Disputa Activa */}
            {selectedSettlement.status === 'DISPUTED' && selectedSettlement.dispute && (
              <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>⚠ Disputa Registrada en Revisión</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono">
                  <p>
                    <strong className="text-slate-400">Motivo:</strong>{' '}
                    {selectedSettlement.dispute.reason}
                  </p>
                  <p>
                    <strong className="text-slate-400">Diferencia Reclamada:</strong> C${' '}
                    {(selectedSettlement.dispute.claimedDifferenceCents / 100).toFixed(2)}
                  </p>
                  <p>
                    <strong className="text-slate-400">Descripción:</strong>{' '}
                    {selectedSettlement.dispute.description}
                  </p>
                </div>
              </div>
            )}

            {/* Snapshot Financiero: 4 Cajas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Ventas Brutas</span>
                <p className="text-sm font-bold text-slate-200">
                  {formatNio(selectedSettlement.grossSalesNio)}
                </p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Comisión Plataforma</span>
                <p className="text-sm font-bold text-rose-400">
                  - {formatNio(selectedSettlement.platformFeesNio)}
                </p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Ajustes / Desc.</span>
                <p className="text-sm font-bold text-slate-300">
                  {formatNio(selectedSettlement.adjustmentsCents / 100)}
                </p>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/30 space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase font-bold">Neto a Pagar</span>
                <p className="text-sm font-black text-emerald-300">
                  {formatNio(selectedSettlement.netPayableNio)}
                </p>
              </div>
            </div>

            {/* Información de Transferencia Bancaria */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span>Datos del Pago y Transferencia</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Banco Receptor:</span>
                  <p className="font-semibold text-slate-200">
                    {selectedSettlement.bankName || 'Pendiente de asignación'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Referencia Bancaria:</span>
                  <p className="font-mono font-semibold text-slate-200">
                    {selectedSettlement.transferReference || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Fecha de Transferencia:</span>
                  <p className="text-slate-200">
                    {formatDate(selectedSettlement.paymentDate || null)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Monto Transferido:</span>
                  <p className="font-mono font-bold text-emerald-400">
                    {selectedSettlement.paidNio != null
                      ? formatNio(selectedSettlement.paidNio)
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Comprobante Adjunto */}
              {selectedSettlement.receiptUrl && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Comprobante de depósito adjunto
                  </span>
                  <a
                    href={selectedSettlement.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Comprobante</span>
                  </a>
                </div>
              )}
            </div>

            {/* Acciones para el Comercio */}
            {(selectedSettlement.status === 'AWAITING_CONFIRMATION' ||
              selectedSettlement.status === 'PAID') &&
              !selectedSettlement.isFrozen && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isSubmittingAction}
                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Recepción Conforme</span>
                  </button>
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    disabled={isSubmittingAction}
                    className="w-full sm:w-auto px-5 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reportar Diferencia / Disputar</span>
                  </button>
                </div>
              )}

            {/* Acción Oficial Post-Cierre: Descargar Acta Oficial en PDF */}
            {(selectedSettlement.status === 'CLOSED' || selectedSettlement.isFrozen) && (
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => {
                    try {
                      generateSettlementActPdf(selectedSettlement);
                    } catch (pdfErr: any) {
                      console.error('Error al generar PDF de liquidación:', pdfErr);
                      alert('Error al generar PDF: ' + (pdfErr?.message || pdfErr));
                    }
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Acta Oficial de Liquidación (PDF)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Confirmar Recepción ────────────────────────────────────── */}
      {showConfirmModal && selectedSettlement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">
                ¿Confirmar Recepción de Liquidación?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Al confirmar, declaras haber recibido satisfactoriamente la transferencia de{' '}
                <strong className="text-emerald-300 font-mono">
                  {formatNio(selectedSettlement.netPayableNio)}
                </strong>
                . El período quedará cerrado formalmente y el registro se congelará para auditoría.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Notas u Observaciones (Opcional)
              </label>
              <textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Ej. Depósito recibido en cuenta BAC..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmittingAction}
                className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmittingAction}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {isSubmittingAction ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Cerrar & Congelar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reportar Discrepancia / Disputar ────────────────────────── */}
      {showDisputeModal && selectedSettlement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Reportar Diferencia / Disputa</h3>
              <p className="text-xs text-slate-400">
                Esta acción abrirá una disputa formal y evitará el cierre de la liquidación hasta
                que sea revisada por la administración.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Motivo de la Disputa
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500 font-semibold"
                >
                  <option value="TRANSFER_MISMATCH">La transferencia no coincide con el neto</option>
                  <option value="MISSING_ORDER">Falta una orden entregada en el período</option>
                  <option value="INCORRECT_FEE">La comisión calculada no corresponde</option>
                  <option value="INCORRECT_ADJUSTMENT">Existe un ajuste incorrecto</option>
                  <option value="OTHER">Otro motivo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Monto de la Diferencia Reclamada (C$ Córdobas)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={disputeDifference}
                  onChange={(e) => setDisputeDifference(e.target.value)}
                  placeholder="Ej. 150.00"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Descripción Detallada
                </label>
                <textarea
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Explica detalladamente la diferencia observada..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowDisputeModal(false)}
                disabled={isSubmittingAction}
                className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDisputeSubmit}
                disabled={isSubmittingAction || !disputeDescription.trim()}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isSubmittingAction ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Abrir Disputa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
