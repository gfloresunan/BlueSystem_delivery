/**
 * FinanceModule — Phase 5 & Actividad #4 Finance Integration
 * BlueSystem Delivery Enterprise
 *
 * Muestra KPIs financieros reales del comercio: ingresos brutos, comisiones,
 * neto del período, balance pendiente de liquidar y auditoría inmutable.
 *
 * Fuente de datos: /merchant_summaries/{businessId} (aggregated doc, real-time)
 *                  /financial_events (historial de transacciones con filtros de fecha)
 *
 * Cumplimiento:
 * - ADR-003: 1 listener por doc agregado, sin N+1 queries
 * - EIAM: businessId derivado de verifiedBusinessId del AuthContext
 * - Multi-Tenant Isolation: comercio solo accede a sus propios datos financieros
 * - Regla de Ganancia Honesta: no inventa margen si no hay datos de costos
 * - Exportación PDF: documento oficial auditable con registro en /audit_events
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingBag,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Calendar,
  HelpCircle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../shared/context/AuthContext';
import { useFinanceData, FinancialEvent, FinanceFilterPeriod } from '../shared/hooks/useFinanceData';
import { SkeletonCard, SkeletonTable } from '../shared/components/Skeleton';
import { exportFinancialStatementPdf } from '../shared/utils/financialPdfExporter';
import { MerchantSettlementsTab } from './finance/MerchantSettlementsTab';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNio(amount: number): string {
  return `C$ ${amount.toFixed(2)}`;
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('es-NI', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: React.ReactNode;
  variant: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
}

const VARIANTS = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: 'text-blue-400',
    value: 'text-blue-300',
    ring: 'ring-blue-500/30',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    value: 'text-emerald-300',
    ring: 'ring-emerald-500/30',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-400',
    value: 'text-amber-300',
    ring: 'ring-amber-500/30',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: 'text-rose-400',
    value: 'text-rose-300',
    ring: 'ring-rose-500/30',
  },
  slate: {
    bg: 'bg-slate-800/40',
    border: 'border-slate-700/50',
    icon: 'text-slate-400',
    value: 'text-slate-300',
    ring: 'ring-slate-700/30',
  },
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, subLabel, icon, variant }) => {
  const v = VARIANTS[variant];
  return (
    <div className={`${v.bg} border ${v.border} rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-lg shadow-black/20`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 ${v.bg} rounded-xl flex items-center justify-center ${v.icon} ring-1 ${v.ring}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold ${v.value} font-mono tracking-tight`}>{value}</p>
        {subLabel && <p className="text-xs text-slate-500 mt-1">{subLabel}</p>}
      </div>
    </div>
  );
};

interface EventRowProps {
  event: FinancialEvent;
}

const EventRow: React.FC<EventRowProps> = ({ event }) => {
  const isCredit = event.direction === 'CREDIT';
  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
      <td className="py-3.5 px-4">
        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg ${
          isCredit
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        }`}>
          {isCredit
            ? <ArrowUpRight className="w-3.5 h-3.5" />
            : <ArrowDownLeft className="w-3.5 h-3.5" />}
          {event.eventType === 'ORDER_REVENUE' ? 'INGRESO BRUTO' :
           event.eventType === 'PLATFORM_FEE' ? 'COMISIÓN' :
           event.eventType === 'REFUND' ? 'DEVOLUCIÓN' : 'AJUSTE'}
        </div>
      </td>
      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-[280px] truncate">
        {event.description}
      </td>
      <td className="py-3.5 px-4 text-right">
        <span className={`text-sm font-mono font-bold ${isCredit ? 'text-emerald-300' : 'text-rose-300'}`}>
          {isCredit ? '+' : '-'}{formatNio(event.amount)}
        </span>
      </td>
      <td className="py-3.5 px-4 text-right text-xs text-slate-400">
        {formatDate(event.createdAt)}
      </td>
      <td className="py-3.5 px-4 text-right">
        <span className="text-xs font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
          #{event.orderId.slice(-6).toUpperCase()}
        </span>
      </td>
    </tr>
  );
};

// ─── Módulo Principal ──────────────────────────────────────────────────────────

export const FinanceModule: React.FC = () => {
  const { identity, user } = useAuth();
  const businessId = identity?.businessId || null;
  const [selectedPeriod, setSelectedPeriod] = useState<FinanceFilterPeriod>('TODAY');
  const [activeSubTab, setActiveSubTab] = useState<'RESUMEN' | 'TRANSACTIONS' | 'SETTLEMENTS'>('RESUMEN');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const {
    summary,
    filteredEvents,
    isLoading,
    isError,
    errorMessage,
    periodLabel,
  } = useFinanceData(businessId, {
    period: selectedPeriod,
    dateFrom: customDateFrom || undefined,
    dateTo: customDateTo || undefined,
  });

  const handleExportPdf = async () => {
    if (!businessId || !summary) return;
    setIsExportingPdf(true);
    setExportFeedback(null);

    try {
      await exportFinancialStatementPdf({
        businessId,
        businessName: identity?.businessId || 'Comercio Registrado',
        tenantId: identity?.orgId,
        periodLabel,
        dateFrom: customDateFrom,
        dateTo: customDateTo,
        grossRevenue: summary.revenue,
        platformFees: summary.platformFees,
        netRevenue: summary.netRevenue,
        pendingSettlement: summary.pendingSettlement,
        ordersCount: summary.ordersCount,
        deliveredCount: summary.ordersCount,
        cancelledCount: 0,
        events: filteredEvents.map((ev) => ({
          id: ev.eventId,
          orderId: ev.orderId,
          description: ev.description,
          type: ev.eventType,
          amount: ev.amount,
          direction: ev.direction,
          date: ev.createdAt,
        })),
        generatedByUid: user?.uid || 'anonymous',
        generatedByEmail: user?.email || identity?.email || 'merchant@bluesystem.com',
        userRole: identity?.role || 'OWNER',
      });

      setExportFeedback('Reporte PDF generado correctamente y registrado en auditoría.');
      setTimeout(() => setExportFeedback(null), 5000);
    } catch (err: any) {
      console.error('Error exportando PDF:', err);
      setExportFeedback('Error al exportar PDF: ' + (err.message || 'Inténtelo de nuevo.'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-7 w-64 bg-slate-800 rounded-md animate-pulse" />
          <div className="h-9 w-48 bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <div className="space-y-1">
          <p className="text-slate-100 font-semibold">Error al cargar finanzas</p>
          <p className="text-xs text-slate-400">{errorMessage}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </button>
      </div>
    );
  }

  // ── Sin businessId ────────────────────────────────────────────────────────
  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <p className="text-slate-300 text-sm">Comercio no identificado. Inicia sesión nuevamente.</p>
      </div>
    );
  }

  const hasData = summary && summary.ordersCount > 0;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-3xl border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Merchant Finance Center</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Trazabilidad Inmutable
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Resumen de ventas, deducciones de plataforma y liquidaciones en tiempo real.
            {summary?.lastUpdatedAt && (
              <span className="text-slate-500 ml-1">
                · Actualizado {formatDate(summary.lastUpdatedAt)}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || filteredEvents.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
              filteredEvents.length === 0
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/40 hover:shadow-indigo-500/20'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPdf ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
          </button>
        </div>
      </div>

      {/* Feedback de Exportación */}
      {exportFeedback && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-xl">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* ── Sub-navegación Canónica: Resumen | Transacciones | Liquidaciones ── */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('RESUMEN')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'RESUMEN'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Resumen General</span>
        </button>
        <button
          onClick={() => setActiveSubTab('TRANSACTIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'TRANSACTIONS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Transacciones</span>
        </button>
        <button
          onClick={() => setActiveSubTab('SETTLEMENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeSubTab === 'SETTLEMENTS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Liquidaciones</span>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md font-mono border border-indigo-500/30">
            Oficial
          </span>
        </button>
      </div>

      {/* ── Vista 3: Liquidaciones Formales (BSD-FINANCE-MERCHANT-SETTLEMENT-001) ── */}
      {activeSubTab === 'SETTLEMENTS' && (
        <MerchantSettlementsTab
          businessId={businessId}
          pendingSettlementNio={summary?.pendingSettlement ?? 0}
        />
      )}

      {/* ── Vistas 1 y 2: Resumen y Transacciones ──────────────────────────── */}
      {activeSubTab !== 'SETTLEMENTS' && (
        <>
          {/* Filtros de Período */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider px-2">Período:</span>
              {(['TODAY', 'YESTERDAY', 'THIS_MONTH', 'CUSTOM'] as FinanceFilterPeriod[]).map((p) => {
                const isSel = selectedPeriod === p;
                const label = p === 'TODAY' ? 'Hoy' : p === 'YESTERDAY' ? 'Ayer' : p === 'THIS_MONTH' ? 'Este Mes' : 'Personalizado';
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriod(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isSel
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {selectedPeriod === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="bg-transparent text-slate-200 outline-none text-xs"
                  />
                </div>
                <span className="text-xs text-slate-500">hasta</span>
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="bg-transparent text-slate-200 outline-none text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5 KPI Cards (visibles en Resumen) */}
          {activeSubTab === 'RESUMEN' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCard
                label="Ventas Brutas"
                value={formatNio(summary?.revenue ?? 0)}
                subLabel={`${summary?.ordersCount ?? 0} pedido${(summary?.ordersCount ?? 0) !== 1 ? 's' : ''} en ${periodLabel.toLowerCase()}`}
                icon={<TrendingUp className="w-4 h-4" />}
                variant="blue"
              />
              <KpiCard
                label="Neto Comercio"
                value={formatNio(summary?.netRevenue ?? 0)}
                subLabel="Ingreso real tras comisiones"
                icon={<Wallet className="w-4 h-4" />}
                variant="emerald"
              />
              <KpiCard
                label="Comisión Plataforma"
                value={formatNio(summary?.platformFees ?? 0)}
                subLabel="15% deducido automáticamente"
                icon={<TrendingDown className="w-4 h-4" />}
                variant="rose"
              />
              <KpiCard
                label="Pendiente de Liquidar"
                value={formatNio(summary?.pendingSettlement ?? 0)}
                subLabel="Liquidación semanal acumulada"
                icon={<Clock className="w-4 h-4" />}
                variant="amber"
              />
              <KpiCard
                label="Ganancia / Margen"
                value="No disponible"
                subLabel="Sin estructura de costos de producto"
                icon={<HelpCircle className="w-4 h-4" />}
                variant="slate"
              />
            </div>
          )}

          {/* Historial de Transacciones */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-200">
                  Movimientos del Período ({periodLabel})
                </h2>
                {filteredEvents.length > 0 && (
                  <span className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2.5 py-0.5 rounded-full font-mono">
                    {filteredEvents.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Tiempo real
              </div>
            </div>

            {!hasData && filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
                <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
                  <Wallet className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="text-base font-bold text-slate-100">Sin movimientos en este período</h3>
                  <p className="text-xs text-slate-400">
                    Los eventos financieros se generan automáticamente al confirmar la entrega de los pedidos.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3.5 py-2 rounded-xl border border-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Registros inmutables y trazables en el ledger financiero</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-950/40">
                      <th className="py-3 px-4 font-semibold">Tipo</th>
                      <th className="py-3 px-4 font-semibold">Descripción Contable</th>
                      <th className="py-3 px-4 font-semibold text-right">Monto (NIO)</th>
                      <th className="py-3 px-4 font-semibold text-right">Fecha & Hora</th>
                      <th className="py-3 px-4 font-semibold text-right">Pedido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event) => (
                      <EventRow key={event.eventId} event={event} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Nota de Trazabilidad ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 bg-slate-900/40 border border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Todos los eventos financieros son <strong className="text-slate-200">inmutables</strong> y generados
          automáticamente por el sistema tras la entrega de cada orden.
          Los montos se calculan y persisten en centavos para garantizar consistencia aritmética estricta.
          Cada evento posee un <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">idempotencyKey</code> único
          para evitar duplicidades transaccionales.
        </p>
      </div>
    </div>
  );
};
