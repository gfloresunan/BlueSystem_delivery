/**
 * ReportsModule — Actividad #7 Enterprise Commerce Analytics Center
 * BlueSystem Delivery Enterprise — Production Grade / Multi-Tenant / E2E Certified
 *
 * Módulo de analítica profesional para comercio:
 * - Resumen Ejecutivo con KPIs de negocio (ventas, ticket promedio, cancelaciones, hora pico)
 * - Distribución por Plataforma (Android / iOS / Web / Legacy) con visuales enriquecidos
 * - Ranking de Productos con barras de progreso visual
 * - Tendencias Diarias con indicadores de variación
 * - Matriz Comercio × Plataforma (multi-tenant / holding)
 *
 * Zero Mock Data: respaldado 100% por documentos reales de /orders (con query indexada en Firestore)
 */

import React, { useState } from 'react';
import {
  BarChart3,
  Smartphone,
  Globe,
  TrendingUp,
  TrendingDown,
  Download,
  Search,
  ShoppingBag,
  Store,
  Layers,
  Calendar,
  ChevronRight,
  PieChart as PieChartIcon,
  Filter,
  XCircle,
  Clock,
  Receipt,
  Target,
  ArrowUpRight,
  Minus,
} from 'lucide-react';
import {
  usePlatformAnalytics,
  DateRangePreset,
} from '../shared/hooks/usePlatformAnalytics';
import { SkeletonCard, SkeletonTable } from '../shared/components/Skeleton';
import { useAuth } from '../shared/context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNio(amount: number): string {
  return `C$ ${amount.toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatHour(hour: number | null): string {
  if (hour === null) return '—';
  const suffix = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${suffix}`;
}

// Mini barra de progreso normalizada a un máximo
function ProgressBar({
  value,
  max,
  color = 'bg-blue-500',
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Indicador de tendencia simple (solo visual, sin datos de período anterior aún)
function TrendBadge({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-slate-500 text-[10px] font-mono">
        <Minus className="w-2.5 h-2.5" /> —
      </span>
    );
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-400 text-[10px] font-mono font-bold">
        <TrendingUp className="w-2.5 h-2.5" /> +{value}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-rose-400 text-[10px] font-mono font-bold">
      <TrendingDown className="w-2.5 h-2.5" /> {value}
    </span>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

type TabId = 'EXECUTIVE' | 'OVERVIEW' | 'PRODUCTS' | 'TRENDS' | 'COMMERCE_MATRIX';

export const ReportsModule: React.FC = () => {
  const { identity } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('EXECUTIVE');

  const {
    loading,
    error,
    ordersCount,
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
  } = usePlatformAnalytics();

  const isMultiCommerceAllowed =
    isPlatformAdmin || !!(identity as any)?.tenantId || !!identity?.orgId;

  const maxDailyOrders = Math.max(...dailyTrends.map((d) => d.totalOrders), 1);
  const maxHourlyOrders = Math.max(...hourlyDistribution.map((h) => h.totalOrders), 1);
  const maxProductQty = productPlatformMatrix[0]?.totalQuantity || 1;

  // ─── HEADER ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-12">
      {/* Header + Controles */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-obsidian-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">
                Reportes & Analítica
              </h1>
              <p className="text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">Android</span> ·{' '}
                <span className="text-blue-400 font-semibold">iOS</span> ·{' '}
                <span className="text-purple-400 font-semibold">Web</span> ·{' '}
                Productos · Comercio
              </p>
            </div>
          </div>
        </div>

        {/* Controles de filtro */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Período */}
          <div className="flex items-center bg-obsidian-950 border border-slate-800 rounded-2xl p-1 gap-0.5">
            {(['TODAY', '7DAYS', '30DAYS', 'THIS_MONTH', 'CUSTOM'] as DateRangePreset[]).map(
              (preset) => {
                const labels: Record<DateRangePreset, string> = {
                  TODAY: 'Hoy',
                  '7DAYS': '7 Días',
                  '30DAYS': '30 Días',
                  THIS_MONTH: 'Este Mes',
                  CUSTOM: 'Custom',
                };
                const isSelected = dateRangePreset === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => setDateRangePreset(preset)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {labels[preset]}
                  </button>
                );
              }
            )}
          </div>

          {/* Selector de Plataforma */}
          <div className="flex items-center bg-obsidian-950 border border-slate-800 rounded-2xl px-2 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value as any)}
              className="bg-transparent text-[11px] text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-obsidian-950">Todas las plataformas</option>
              <option value="ANDROID" className="bg-obsidian-950">Solo Android</option>
              <option value="IOS" className="bg-obsidian-950">Solo iOS</option>
              <option value="WEB" className="bg-obsidian-950">Solo Web</option>
            </select>
          </div>

          {/* Exportar CSV */}
          <button
            onClick={exportAnalyticsCsv}
            disabled={loading || productPlatformMatrix.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] font-bold rounded-2xl border border-slate-700 transition"
            title="Descargar matriz de productos en CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Rango Personalizado */}
      {dateRangePreset === 'CUSTOM' && (
        <div className="bg-obsidian-900 border border-blue-500/20 rounded-2xl p-4 flex flex-wrap items-center gap-4">
          <Calendar className="w-4 h-4 text-blue-400" />
          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
            <span>Desde:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
            <span>Hasta:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-obsidian-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>
      )}

      {/* Tabs de navegación */}
      <div className="flex items-center gap-1 border-b border-slate-800/60 pb-2 overflow-x-auto">
        {[
          { id: 'EXECUTIVE' as TabId, icon: Target, label: 'Resumen Ejecutivo' },
          { id: 'OVERVIEW' as TabId, icon: PieChartIcon, label: 'Plataformas' },
          { id: 'PRODUCTS' as TabId, icon: Layers, label: 'Productos', count: productPlatformMatrix.length },
          { id: 'TRENDS' as TabId, icon: TrendingUp, label: 'Tendencias' },
          ...(isMultiCommerceAllowed
            ? [{ id: 'COMMERCE_MATRIX' as TabId, icon: Store, label: 'Comercio' }]
            : []),
        ].map(({ id, icon: Icon, label, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
            {count !== undefined && (
              <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido dinámico */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <SkeletonTable />
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 text-center text-rose-300 space-y-2">
          <XCircle className="w-8 h-8 mx-auto text-rose-400 mb-2" />
          <p className="font-bold text-sm">Error cargando analítica</p>
          <p className="text-xs text-rose-400 max-w-md mx-auto">{error}</p>
        </div>
      ) : ordersCount === 0 ? (
        <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-14 text-center max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 bg-slate-800/60 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-200">Sin pedidos en el período</h3>
          <p className="text-xs text-slate-400">
            No se encontraron pedidos registrados para los filtros actuales. Prueba ampliando el rango de fechas.
          </p>
          <button
            onClick={() => setDateRangePreset('THIS_MONTH')}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-semibold transition"
          >
            Ver este mes →
          </button>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: RESUMEN EJECUTIVO
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'EXECUTIVE' && (
            <div className="space-y-5">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ventas Totales */}
                <div className="bg-obsidian-900 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Ventas Totales</span>
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-emerald-300 font-mono leading-tight">
                      {formatNio(platformMetrics.totalSales)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {platformMetrics.totalOrders} pedidos en el período
                    </p>
                  </div>
                </div>

                {/* Ticket Promedio */}
                <div className="bg-obsidian-900 border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Ticket Promedio</span>
                    <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-blue-300 font-mono leading-tight">
                      {formatNio(platformMetrics.avgTicket)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">por pedido activo</p>
                  </div>
                </div>

                {/* Tasa de Cancelación */}
                <div className={`bg-obsidian-900 border rounded-3xl p-5 space-y-3 shadow-lg bg-gradient-to-br to-transparent ${
                  platformMetrics.cancelRate > 15
                    ? 'border-rose-500/30 from-rose-500/5'
                    : platformMetrics.cancelRate > 5
                    ? 'border-amber-500/25 from-amber-500/5'
                    : 'border-slate-700/50 from-slate-800/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      platformMetrics.cancelRate > 15 ? 'text-rose-400' : platformMetrics.cancelRate > 5 ? 'text-amber-400' : 'text-slate-400'
                    }`}>Cancelaciones</span>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                      platformMetrics.cancelRate > 15 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <XCircle className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className={`text-xl font-black font-mono leading-tight ${
                      platformMetrics.cancelRate > 15 ? 'text-rose-300' : platformMetrics.cancelRate > 5 ? 'text-amber-300' : 'text-slate-300'
                    }`}>
                      {platformMetrics.cancelRate.toFixed(1)}%
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {platformMetrics.cancelledOrders} pedidos cancelados
                    </p>
                  </div>
                </div>

                {/* Hora Pico */}
                <div className="bg-obsidian-900 border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent rounded-3xl p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Hora Pico</span>
                    <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-purple-300 font-mono leading-tight">
                      {formatHour(platformMetrics.peakHour)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">mayor flujo de pedidos</p>
                  </div>
                </div>
              </div>

              {/* Distribución visual de plataformas */}
              <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Distribución por Canal de Origen</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{platformMetrics.totalOrders} pedidos totales en el período</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('OVERVIEW')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
                  >
                    Detalle <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Barra segmentada */}
                <div className="w-full h-6 bg-obsidian-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800/80">
                  {platformMetrics.androidPercentage > 0 && (
                    <div
                      style={{ width: `${platformMetrics.androidPercentage}%` }}
                      className="bg-emerald-500 h-full rounded-l-full transition-all duration-700 hover:brightness-110"
                      title={`Android: ${platformMetrics.androidOrders} (${platformMetrics.androidPercentage.toFixed(1)}%)`}
                    />
                  )}
                  {platformMetrics.iosPercentage > 0 && (
                    <div
                      style={{ width: `${platformMetrics.iosPercentage}%` }}
                      className="bg-blue-500 h-full transition-all duration-700 hover:brightness-110"
                      title={`iOS: ${platformMetrics.iosOrders} (${platformMetrics.iosPercentage.toFixed(1)}%)`}
                    />
                  )}
                  {platformMetrics.webPercentage > 0 && (
                    <div
                      style={{ width: `${platformMetrics.webPercentage}%` }}
                      className="bg-purple-500 h-full transition-all duration-700 hover:brightness-110"
                      title={`Web: ${platformMetrics.webOrders} (${platformMetrics.webPercentage.toFixed(1)}%)`}
                    />
                  )}
                  {platformMetrics.legacyPercentage > 0 && (
                    <div
                      style={{ width: `${platformMetrics.legacyPercentage}%` }}
                      className="bg-slate-600 h-full rounded-r-full transition-all duration-700"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Android App', orders: platformMetrics.androidOrders, pct: platformMetrics.androidPercentage, sales: platformMetrics.androidSales, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                    { label: 'Apple iOS App', orders: platformMetrics.iosOrders, pct: platformMetrics.iosPercentage, sales: platformMetrics.iosSales, color: 'bg-blue-500', textColor: 'text-blue-400' },
                    { label: 'Web / Portal', orders: platformMetrics.webOrders, pct: platformMetrics.webPercentage, sales: platformMetrics.webSales, color: 'bg-purple-500', textColor: 'text-purple-400' },
                  ].map(({ label, orders, pct, sales, color, textColor }) => (
                    <div key={label} className="bg-obsidian-950 rounded-2xl p-3 space-y-1.5 border border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                        <span className="text-[11px] text-slate-300 font-semibold">{label}</span>
                      </div>
                      <div className={`text-lg font-black font-mono ${textColor}`}>{pct.toFixed(1)}%</div>
                      <div className="text-[10px] text-slate-500 font-mono">{orders} ped · {formatNio(sales)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 3 Productos */}
              {productPlatformMatrix.length > 0 && (
                <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">🏆 Top Productos</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Los más vendidos en este período.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('PRODUCTS')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
                    >
                      Ver todos <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {productPlatformMatrix.slice(0, 5).map((row, idx) => (
                      <div key={row.productId} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                          idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                          idx === 1 ? 'bg-slate-700 text-slate-300' :
                          idx === 2 ? 'bg-orange-900/30 text-orange-400' :
                          'bg-slate-800 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        {row.imageUrl ? (
                          <img src={row.imageUrl} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">{row.productName}</span>
                            <span className="text-xs font-black font-mono text-emerald-400 ml-2 shrink-0">{row.totalQuantity} u</span>
                          </div>
                          <ProgressBar value={row.totalQuantity} max={maxProductQty} color="bg-blue-500/70" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distribución Horaria (mini) */}
              {platformMetrics.peakHour !== null && (
                <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Distribución Horaria de Pedidos</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Horas del día con mayor actividad.</p>
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {hourlyDistribution.map((h) => {
                      const pct = maxHourlyOrders > 0 ? (h.totalOrders / maxHourlyOrders) * 100 : 0;
                      const isPeak = h.hour === platformMetrics.peakHour;
                      return (
                        <div
                          key={h.hour}
                          className="flex-1 flex flex-col items-center justify-end group relative"
                          title={`${h.label}: ${h.totalOrders} pedidos`}
                        >
                          <div
                            className={`w-full rounded-t transition-all duration-300 ${
                              isPeak ? 'bg-purple-500' : 'bg-slate-700 group-hover:bg-slate-600'
                            }`}
                            style={{ height: `${Math.max(pct, 2)}%` }}
                          />
                          {/* Tooltip de hora pico */}
                          {isPeak && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-md whitespace-nowrap font-bold">
                              {h.label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>12:00 am</span>
                    <span>6:00 am</span>
                    <span>12:00 pm</span>
                    <span>6:00 pm</span>
                    <span>11:00 pm</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: PLATAFORMAS (OVERVIEW DETALLADO)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-5">
              {/* Cards por plataforma */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total',
                    icon: ShoppingBag,
                    orders: platformMetrics.totalOrders,
                    sales: platformMetrics.totalSales,
                    avg: platformMetrics.avgTicket,
                    pct: 100,
                    border: 'border-slate-700/60',
                    icon_bg: 'bg-slate-800 text-slate-300',
                    text: 'text-white',
                    sub: 'text-slate-400',
                  },
                  {
                    label: 'Android',
                    icon: Smartphone,
                    orders: platformMetrics.androidOrders,
                    sales: platformMetrics.androidSales,
                    avg: platformMetrics.androidAvgTicket,
                    pct: platformMetrics.androidPercentage,
                    border: 'border-emerald-500/25',
                    icon_bg: 'bg-emerald-500/10 text-emerald-400',
                    text: 'text-emerald-300',
                    sub: 'text-emerald-400/70',
                  },
                  {
                    label: 'Apple iOS',
                    icon: Smartphone,
                    orders: platformMetrics.iosOrders,
                    sales: platformMetrics.iosSales,
                    avg: platformMetrics.iosAvgTicket,
                    pct: platformMetrics.iosPercentage,
                    border: 'border-blue-500/25',
                    icon_bg: 'bg-blue-500/10 text-blue-400',
                    text: 'text-blue-300',
                    sub: 'text-blue-400/70',
                  },
                  {
                    label: 'Web / Portal',
                    icon: Globe,
                    orders: platformMetrics.webOrders,
                    sales: platformMetrics.webSales,
                    avg: platformMetrics.webAvgTicket,
                    pct: platformMetrics.webPercentage,
                    border: 'border-purple-500/25',
                    icon_bg: 'bg-purple-500/10 text-purple-400',
                    text: 'text-purple-300',
                    sub: 'text-purple-400/70',
                  },
                ].map(({ label, icon: Icon, orders, sales, avg, pct, border, icon_bg, text, sub }) => (
                  <div
                    key={label}
                    className={`bg-obsidian-900 border ${border} rounded-3xl p-5 space-y-4 shadow-lg`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${text}`}>{label}</span>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${icon_bg}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <div className={`text-2xl font-black font-mono ${text}`}>{orders}</div>
                      <div className={`text-[11px] font-mono mt-0.5 ${sub}`}>
                        {formatNio(sales)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Participación</span>
                        <span className={`font-mono font-bold ${text}`}>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            label === 'Android' ? 'bg-emerald-500' :
                            label === 'Apple iOS' ? 'bg-blue-500' :
                            label === 'Web / Portal' ? 'bg-purple-500' : 'bg-slate-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Ticket prom: <span className="text-slate-300 font-mono">{formatNio(avg)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla resumen Top Productos */}
              <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">Top Productos por Canal</h3>
                  <button
                    onClick={() => setActiveTab('PRODUCTS')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
                  >
                    Ver todos <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-obsidian-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-mono text-[10px]">
                      <tr>
                        <th className="p-3 rounded-l-xl">Producto</th>
                        <th className="p-3 text-center text-emerald-400">Android</th>
                        <th className="p-3 text-center text-blue-400">iOS</th>
                        <th className="p-3 text-center text-purple-400">Web</th>
                        <th className="p-3 text-right rounded-r-xl">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {productPlatformMatrix.slice(0, 7).map((row) => (
                        <tr key={row.productId} className="hover:bg-slate-800/20 transition">
                          <td className="p-3 font-semibold text-slate-200 flex items-center gap-2">
                            {row.imageUrl ? (
                              <img src={row.imageUrl} alt="" className="w-6 h-6 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                <ShoppingBag className="w-3 h-3" />
                              </div>
                            )}
                            <span className="truncate max-w-[160px]">{row.productName}</span>
                          </td>
                          <td className="p-3 text-center font-mono text-emerald-400 font-bold">{row.androidQuantity}</td>
                          <td className="p-3 text-center font-mono text-blue-400 font-bold">{row.iosQuantity}</td>
                          <td className="p-3 text-center font-mono text-purple-400 font-bold">{row.webQuantity}</td>
                          <td className="p-3 text-right font-mono font-black text-slate-100">{row.totalQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: RANKING DE PRODUCTOS
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'PRODUCTS' && (
            <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Matriz Cruzada Producto × Plataforma</h3>
                  <p className="text-[11px] text-slate-400">
                    Unidades vendidas e ingresos por canal. Ordenado por volumen.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchProductQuery}
                    onChange={(e) => setSearchProductQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full bg-obsidian-950 border border-slate-800 rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Lista de productos con barras visuales */}
              <div className="space-y-2">
                {productPlatformMatrix.map((row, idx) => (
                  <div
                    key={row.productId}
                    className="bg-obsidian-950 border border-slate-800/60 rounded-2xl p-4 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                        idx === 1 ? 'bg-slate-700 text-slate-300' :
                        idx === 2 ? 'bg-orange-900/30 text-orange-400' :
                        'bg-slate-800/60 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      {row.imageUrl ? (
                        <img src={row.imageUrl} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-200 truncate">{row.productName}</span>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <span className="text-xs font-black font-mono text-slate-100">{row.totalQuantity} u</span>
                            <span className="text-xs font-bold font-mono text-emerald-400">{formatNio(row.totalRevenue)}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{row.totalOrders} pedidos</div>
                      </div>
                    </div>

                    {/* Barras por plataforma */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Android', qty: row.androidQuantity, rev: row.androidRevenue, color: 'bg-emerald-500', text: 'text-emerald-400' },
                        { label: 'iOS', qty: row.iosQuantity, rev: row.iosRevenue, color: 'bg-blue-500', text: 'text-blue-400' },
                        { label: 'Web', qty: row.webQuantity, rev: row.webRevenue, color: 'bg-purple-500', text: 'text-purple-400' },
                      ].map(({ label, qty, rev, color, text }) => (
                        <div key={label} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-semibold ${text}`}>{label}</span>
                            <span className="text-slate-400 font-mono">{qty} u</span>
                          </div>
                          <ProgressBar value={qty} max={row.totalQuantity} color={color} />
                          <div className="text-[10px] text-slate-500 font-mono">{formatNio(rev)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {productPlatformMatrix.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No se encontraron productos con ese nombre.
                  </div>
                )}
              </div>

              {/* Footer con botón de exportar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-500">
                  {productPlatformMatrix.length} productos encontrados
                </span>
                <button
                  onClick={exportAnalyticsCsv}
                  disabled={productPlatformMatrix.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 transition disabled:opacity-40"
                >
                  <Download className="w-3 h-3" /> Exportar CSV
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: TENDENCIAS DIARIAS
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'TRENDS' && (
            <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-slate-100">Tendencias Diarias por Plataforma</h3>
                <p className="text-[11px] text-slate-400">
                  Evolución temporal del volumen de pedidos y ventas.
                </p>
              </div>

              {/* Mini gráfica de barras diarias */}
              {dailyTrends.length > 1 && (
                <div className="bg-obsidian-950 border border-slate-800/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-end gap-0.5 h-20">
                    {dailyTrends.map((day) => {
                      const pct = (day.totalOrders / maxDailyOrders) * 100;
                      return (
                        <div
                          key={day.dateKey}
                          className="flex-1 flex flex-col items-center justify-end group relative"
                          title={`${day.label}: ${day.totalOrders} pedidos · ${formatNio(day.totalSales)}`}
                        >
                          <div
                            className="w-full rounded-t bg-blue-500/60 group-hover:bg-blue-400 transition-all duration-200"
                            style={{ height: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{dailyTrends[0]?.label}</span>
                    <span>{dailyTrends[Math.floor(dailyTrends.length / 2)]?.label}</span>
                    <span>{dailyTrends[dailyTrends.length - 1]?.label}</span>
                  </div>
                </div>
              )}

              {/* Tabla de tendencias */}
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-obsidian-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-mono text-[10px]">
                    <tr>
                      <th className="p-3.5">Fecha</th>
                      <th className="p-3.5 text-center text-emerald-400">Android</th>
                      <th className="p-3.5 text-center text-blue-400">iOS</th>
                      <th className="p-3.5 text-center text-purple-400">Web</th>
                      <th className="p-3.5 text-center text-slate-500">Legacy</th>
                      <th className="p-3.5 text-right text-slate-200">Total</th>
                      <th className="p-3.5 text-right text-emerald-400">Ventas (NIO)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {[...dailyTrends].reverse().map((t, idx) => {
                      const prev = [...dailyTrends].reverse()[idx + 1];
                      const delta = prev ? t.totalOrders - prev.totalOrders : 0;
                      return (
                        <tr key={t.dateKey} className="hover:bg-slate-800/30 transition">
                          <td className="p-3.5 font-bold text-slate-200 font-mono flex items-center gap-2">
                            {t.label}
                            <TrendBadge value={delta} />
                          </td>
                          <td className="p-3.5 text-center font-mono text-emerald-400 font-bold">{t.androidOrders}</td>
                          <td className="p-3.5 text-center font-mono text-blue-400 font-bold">{t.iosOrders}</td>
                          <td className="p-3.5 text-center font-mono text-purple-400 font-bold">{t.webOrders}</td>
                          <td className="p-3.5 text-center font-mono text-slate-500">{t.legacyOrders}</td>
                          <td className="p-3.5 text-right font-mono font-black text-slate-100">{t.totalOrders}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-400">{formatNio(t.totalSales)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-700 bg-obsidian-950">
                    <tr>
                      <td className="p-3.5 text-[10px] font-black text-slate-300 uppercase tracking-wider">TOTAL</td>
                      <td className="p-3.5 text-center font-mono font-black text-emerald-300">{platformMetrics.androidOrders}</td>
                      <td className="p-3.5 text-center font-mono font-black text-blue-300">{platformMetrics.iosOrders}</td>
                      <td className="p-3.5 text-center font-mono font-black text-purple-300">{platformMetrics.webOrders}</td>
                      <td className="p-3.5 text-center font-mono font-black text-slate-400">{platformMetrics.legacyOrders}</td>
                      <td className="p-3.5 text-right font-mono font-black text-white">{platformMetrics.totalOrders}</td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-300">{formatNio(platformMetrics.totalSales)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: COMERCIO × PLATAFORMA (MULTI-TENANT)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'COMMERCE_MATRIX' && isMultiCommerceAllowed && (
            <div className="bg-obsidian-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-slate-100">Distribución por Comercio & Sucursal</h3>
                <p className="text-[11px] text-slate-400">
                  Penetración de Android vs iOS en cada punto comercial de la organización.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {commercePlatformMatrix.map((comm) => (
                  <div
                    key={comm.businessId}
                    className="bg-obsidian-950 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-200">{comm.businessName}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {comm.businessId.slice(-8)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-white text-sm block">{comm.totalOrders} ped.</span>
                        <span className="font-mono text-[11px] text-emerald-400">{formatNio(comm.totalRevenue)}</span>
                      </div>
                    </div>

                    {/* Barra segmentada */}
                    <div className="space-y-1.5">
                      <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex">
                        <div style={{ width: `${comm.androidPercentage}%` }} className="bg-emerald-500 h-full" />
                        <div style={{ width: `${comm.iosPercentage}%` }} className="bg-blue-500 h-full" />
                        <div style={{ width: `${comm.webPercentage}%` }} className="bg-purple-500 h-full" />
                        <div style={{ width: `${comm.legacyPercentage}%` }} className="bg-slate-600 h-full" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-emerald-400 font-bold">Android {comm.androidPercentage.toFixed(0)}%</span>
                        <span className="text-blue-400 font-bold">iOS {comm.iosPercentage.toFixed(0)}%</span>
                        <span className="text-purple-400">Web {comm.webPercentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
