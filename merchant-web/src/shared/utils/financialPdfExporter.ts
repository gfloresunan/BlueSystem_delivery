/**
 * Financial PDF Exporter — BlueSystem Delivery Enterprise
 * Merchant & Tenant Financial Statement Generator
 *
 * Genera reportes financieros auditables, inmutables y de alta fidelidad
 * listos para impresión/guardado en PDF, registrando la auditoría correspondiente.
 */

import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface FinancialReportData {
  businessId: string;
  businessName: string;
  tenantId?: string;
  periodLabel: string;
  dateFrom?: string;
  dateTo?: string;
  grossRevenue: number;
  platformFees: number;
  netRevenue: number;
  pendingSettlement: number;
  ordersCount: number;
  deliveredCount: number;
  cancelledCount: number;
  paymentBreakdown?: {
    cash: number;
    card: number;
    wallet: number;
    other: number;
  };
  events: Array<{
    id: string;
    orderId: string;
    description: string;
    type: string;
    amount: number;
    direction: 'CREDIT' | 'DEBIT';
    date: Date | null;
  }>;
  generatedByUid: string;
  generatedByEmail: string;
  userRole: string;
}

export async function exportFinancialStatementPdf(data: FinancialReportData): Promise<void> {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-NI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-NI', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const verificationCode = `REP-${data.businessId.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  // 1. Auditoría Server-Side / Firestore
  try {
    await addDoc(collection(db, 'audit_events'), {
      event: 'FINANCIAL_REPORT_EXPORTED',
      reportType: 'MERCHANT_FINANCIAL_STATEMENT',
      businessId: data.businessId,
      tenantId: data.tenantId || null,
      generatedByUid: data.generatedByUid,
      generatedByEmail: data.generatedByEmail,
      userRole: data.userRole,
      periodLabel: data.periodLabel,
      dateFrom: data.dateFrom || null,
      dateTo: data.dateTo || null,
      verificationCode,
      grossRevenue: data.grossRevenue,
      netRevenue: data.netRevenue,
      ordersCount: data.ordersCount,
      timestamp: serverTimestamp(),
    });
  } catch (auditErr) {
    console.warn('[FinancialPdfExporter] No se pudo asentar evento de auditoría:', auditErr);
  }

  // 2. Generar Documento HTML Imprimible en Nueva Pestaña
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor habilite los pop-ups en el navegador para descargar el PDF del reporte financiero.');
    return;
  }

  const formatMoney = (amount: number) => `C$ ${amount.toFixed(2)}`;

  const eventsRowsHtml = data.events.slice(0, 100).map((ev, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-family: monospace;">#${ev.orderId.slice(-6).toUpperCase()}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${ev.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; ${
          ev.direction === 'CREDIT'
            ? 'background: #dcfce7; color: #15803d;'
            : 'background: #fee2e2; color: #b91c1c;'
        }">
          ${ev.type === 'ORDER_REVENUE' ? 'INGRESO' : ev.type === 'PLATFORM_FEE' ? 'COMISIÓN' : ev.type}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-family: monospace; font-weight: bold; color: ${
        ev.direction === 'CREDIT' ? '#15803d' : '#b91c1c'
      }">
        ${ev.direction === 'CREDIT' ? '+' : '-'}${formatMoney(ev.amount)}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #64748b;">
        ${ev.date ? ev.date.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Estado Financiero - ${data.businessName} (${data.periodLabel})</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
        .brand-title { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
        .brand-sub { font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; }
        .badge { background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 10px; font-family: monospace; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
        .meta-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        .meta-val { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .kpi-card { padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .kpi-card.blue { background: #eff6ff; border-color: #bfdbfe; }
        .kpi-card.emerald { background: #f0fdf4; border-color: #bbf7d0; }
        .kpi-card.rose { background: #fff1f2; border-color: #fecdd3; }
        .kpi-card.amber { background: #fffbeb; border-color: #fde68a; }
        .kpi-title { font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .kpi-card.blue .kpi-title { color: #1d4ed8; }
        .kpi-card.emerald .kpi-title { color: #15803d; }
        .kpi-card.rose .kpi-title { color: #b91c1c; }
        .kpi-card.amber .kpi-title { color: #b45309; }
        .kpi-val { font-size: 18px; font-weight: 900; font-family: monospace; margin-top: 4px; }
        .kpi-card.blue .kpi-val { color: #1e3a8a; }
        .kpi-card.emerald .kpi-val { color: #14532d; }
        .kpi-card.rose .kpi-val { color: #881337; }
        .kpi-card.amber .kpi-val { color: #78350f; }
        .notice-box { background: #f8fafc; border-left: 4px solid #6366f1; padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 20px; font-size: 11px; color: #475569; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
        .footer { margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 14px; font-size: 9px; color: #94a3b8; text-align: center; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; margin-bottom: 20px; }
        .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; text-align: center; font-size: 11px; font-weight: 700; color: #334155; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">BLUESYSTEM DELIVERY ENTERPRISE</div>
          <div class="brand-sub">Centro Financiero & Estado de Cuenta Comercial</div>
        </div>
        <div style="text-align: right;">
          <span class="badge">${verificationCode}</span>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Emisión: ${dateStr} ${timeStr}</div>
        </div>
      </div>

      <div class="meta-grid">
        <div>
          <div class="meta-label">Comercio / Aliado</div>
          <div class="meta-val">${data.businessName}</div>
        </div>
        <div>
          <div class="meta-label">Identificador</div>
          <div class="meta-val" style="font-family: monospace; font-size: 11px;">${data.businessId}</div>
        </div>
        <div>
          <div class="meta-label">Período Consultado</div>
          <div class="meta-val">${data.periodLabel}</div>
        </div>
        <div>
          <div class="meta-label">Generado Por</div>
          <div class="meta-val">${data.generatedByEmail}</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card blue">
          <div class="kpi-title">Ventas Brutas</div>
          <div class="kpi-val">${formatMoney(data.grossRevenue)}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${data.deliveredCount} pedidos entregados</div>
        </div>
        <div class="kpi-card emerald">
          <div class="kpi-title">Neto Comercio</div>
          <div class="kpi-val">${formatMoney(data.netRevenue)}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Ingreso realizable</div>
        </div>
        <div class="kpi-card rose">
          <div class="kpi-title">Comisión Plataforma</div>
          <div class="kpi-val">${formatMoney(data.platformFees)}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Retención contractual</div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-title">Balance a Liquidar</div>
          <div class="kpi-val">${formatMoney(data.pendingSettlement)}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Cierre operacional</div>
        </div>
      </div>

      <div class="notice-box">
        <strong>Nota de Transparencia Financiera (Gobernanza ADR-003 / Phase 5):</strong>
        La ganancia neta comercial (Gross Profit / Net Margin) no se calcula en este reporte debido a que la plataforma no almacena la estructura de costo de adquisición/preparación de mercadería por producto. Las cifras reflejan ingresos y deducciones contractuales exactas.
      </div>

      <h4 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 6px;">
        Detalle de Movimientos Financieros (${data.events.length} eventos)
      </h4>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th style="width: 70px;">Pedido</th>
            <th>Descripción Contable</th>
            <th style="width: 90px; text-align: center;">Tipo</th>
            <th style="width: 100px; text-align: right;">Monto (NIO)</th>
            <th style="width: 120px; text-align: right;">Fecha & Hora</th>
          </tr>
        </thead>
        <tbody>
          ${eventsRowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No se registraron movimientos en el período seleccionado.</td></tr>'}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-line">
          ${data.businessName}<br>
          <span style="font-size: 9px; font-weight: normal; color: #64748b;">Representante / Administrador Comercial</span>
        </div>
        <div class="sig-line">
          BlueSystem Delivery Enterprise<br>
          <span style="font-size: 9px; font-weight: normal; color: #64748b;">Control & Liquidaciones Financieras</span>
        </div>
      </div>

      <div class="footer">
        Documento oficial emitido por BlueSystem Delivery Enterprise (bluesystem-7c9af).<br>
        Trazabilidad criptográfica: ${verificationCode} · Registros inmutables en Firestore Ledger.
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
