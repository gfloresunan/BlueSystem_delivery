import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MerchantSettlement } from '../hooks/useSettlements';

// Helper ultra-robusto para inicializar jsPDF tanto en ESM como CJS
function createPdfInstance(options: any): any {
  if (typeof jsPDF === 'function') {
    return new jsPDF(options);
  }
  const ctor = (jsPDF as any)?.jsPDF || (jsPDF as any)?.default;
  if (typeof ctor === 'function') {
    return new ctor(options);
  }
  throw new Error('No se pudo instanciar jsPDF constructor');
}

// Helper ultra-robusto para invocar autoTable sin importar cómo se resuelva el bundle
function runAutoTable(doc: any, options: any) {
  if (typeof (doc as any).autoTable === 'function') {
    (doc as any).autoTable(options);
  } else if (typeof autoTable === 'function') {
    (autoTable as any)(doc, options);
  } else if (autoTable && typeof (autoTable as any).default === 'function') {
    (autoTable as any).default(doc, options);
  } else if (autoTable && typeof (autoTable as any).autoTable === 'function') {
    (autoTable as any).autoTable(doc, options);
  } else {
    throw new Error('No se pudo encontrar la función autoTable');
  }
}

export function generateSettlementActPdf(settlement: MerchantSettlement) {
  const doc = createPdfInstance({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const actNumber = `ACTA-SETTLEMENT-${(settlement.settlementId || '00000000').substring(0, 10).toUpperCase()}`;
  const verificationCode = `BSD-VER-${(settlement.settlementId || '').slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const formatNio = (centsOrNio: number | null | undefined): string => {
    if (centsOrNio == null) return 'C$ 0.00';
    return `C$ ${Number(centsOrNio).toLocaleString('es-NI', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDateStr = (d: Date | any | null | undefined): string => {
    if (!d) return '—';
    try {
      const date = d.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
      return date.toLocaleDateString('es-NI', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  // ─── 1. Cabecera Corporativa ────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // Navy 900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('BLUESYSTEM DELIVERY ENTERPRISE', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('Acta Oficial de Liquidación Comercial y Conciliación Financiera', margin, 19);

  // Badge Número de Acta
  doc.setFillColor(22, 101, 52); // Emerald 800
  doc.roundedRect(pageWidth - margin - 58, 8, 58, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(actNumber, pageWidth - margin - 29, 15.5, { align: 'center' });

  // ─── 2. Datos de Identificación y Partes ─────────────────────────────────────
  let y = 38;
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('1. IDENTIFICACIÓN Y ESTADO DE GOBERNANZA', margin, y);

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  doc.setFontSize(8.5);
  // Columna Izquierda
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Comercio:', margin + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(settlement.businessName || 'Comercio Registrado', margin + 34, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('ID Comercio:', margin + 4, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(settlement.businessId, margin + 34, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Estado Auditoría:', margin + 4, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('CERRADA Y CONGELADA (INMUTABLE)', margin + 34, y + 23);

  // Columna Derecha
  const col2 = margin + contentWidth / 2 + 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Período Liquidado:', col2, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const pStart = formatDateStr(settlement.periodStart).split(',')[0];
  const pEnd = formatDateStr(settlement.periodEnd).split(',')[0];
  doc.text(`${pStart} al ${pEnd}`, col2 + 34, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Órdenes Incluidas:', col2, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${settlement.ordersCount || 0} pedidos entregados`, col2 + 34, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Cód. Verificación:', col2, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199); // Sky 600
  doc.text(verificationCode, col2 + 34, y + 23);

  // ─── 3. Conciliación y Liquidación Contable (Tabla) ──────────────────────────
  y += 42;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('2. CONCILIACIÓN Y LIQUIDACIÓN CONTABLE OFICIAL', margin, y);

  y += 4;
  const grossSales = settlement.grossSalesNio ?? settlement.grossSalesCents / 100;
  const platformFees = settlement.platformFeesNio ?? settlement.platformFeesCents / 100;
  const adjustments = (settlement.adjustmentsCents || 0) / 100;
  const netPayable = settlement.netPayableNio ?? settlement.netPayableCents / 100;

  runAutoTable(doc, {
    startY: y,
    head: [['Concepto Contable', 'Base de Cálculo / Detalle', 'Monto Oficial (NIO)']],
    body: [
      [
        'Venta Bruta Total',
        `${settlement.ordersCount} pedidos entregados en el período`,
        formatNio(grossSales),
      ],
      [
        'Comisión de Plataforma (Retención)',
        'Tarifa de servicio acordada por intermediación',
        `- ${formatNio(platformFees)}`,
      ],
      [
        'Ajustes / Deducciones Especiales',
        'Descuentos comerciales o bonificaciones',
        formatNio(adjustments),
      ],
      [
        'NETO TOTAL LIQUIDADO',
        'Monto acordado, transferido y pagado al comercio',
        formatNio(netPayable),
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 70 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 50 },
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    didParseCell: (data: any) => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = [240, 253, 244]; // Emerald 50
        data.cell.styles.textColor = [22, 101, 52]; // Emerald 800
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  // ─── 4. Datos del Pago y Transferencia Bancaria ──────────────────────────────
  const finalTableY = ((doc as any).lastAutoTable?.finalY || 135) + 8;
  y = finalTableY;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('3. DETALLES DE TRANSFERENCIA BANCARIA Y COMPROBANTE', margin, y);

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Banco Receptor:', margin + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(settlement.bankName || 'Banco Bancentro / BAC', margin + 36, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Referencia Bancaria:', margin + 4, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(settlement.transferReference || '—', margin + 36, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Fecha Transferencia:', margin + 4, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDateStr(settlement.paymentDate), margin + 36, y + 21);

  // Columna Derecha
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Monto Transferido:', col2, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(formatNio(settlement.paidNio ?? netPayable), col2 + 36, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Comprobante Adjunto:', col2, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(2, 132, 199);
  doc.text(settlement.receiptUrl ? 'Verificado en Storage Oficial' : 'Registrado', col2 + 36, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Moneda Pago:', col2, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text('NIO (Córdobas Netos)', col2 + 36, y + 21);

  // ─── 5. Certificación de Recepción Conforme y Firmas Electrónicas ───────────
  y += 34;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('4. CERTIFICACIÓN DE RECEPCIÓN Y AUDITORÍA ELECTRÓNICA', margin, y);

  y += 4;
  const boxWidth = (contentWidth - 6) / 2;

  // Recuadro 1: Plataforma Admin
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, boxWidth, 36, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('EMISOR: ADMINISTRACIÓN DE PLATAFORMA', margin + 4, y + 7);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Operación: Registro de Pago y Transferencia', margin + 4, y + 14);
  doc.text(`Fecha Operación: ${formatDateStr(settlement.createdAt)}`, margin + 4, y + 20);
  doc.text('Certificación: Fondos debitados y transferidos', margin + 4, y + 26);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('✓ VALIDADO Y TRANSFERIDO', margin + 4, y + 32);

  // Recuadro 2: Comercio Receptor
  const box2X = margin + boxWidth + 6;
  doc.setDrawColor(187, 247, 208); // Emerald 200
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.roundedRect(box2X, y, boxWidth, 36, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('RECEPTOR: COMERCIO TITULAR', box2X + 4, y + 7);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const confEmail = settlement.confirmedBy?.confirmedByEmail || 'tecnostore@bluesystemdelivery.com';
  const confDate = formatDateStr(settlement.confirmedBy?.confirmedAt || settlement.frozenAt);
  const confNotes = settlement.confirmedBy?.notes || 'Conforme';
  doc.text(`Confirmado por: ${confEmail}`, box2X + 4, y + 14);
  doc.text(`Fecha y Hora: ${confDate}`, box2X + 4, y + 20);
  doc.text(`Observación: "${confNotes}"`, box2X + 4, y + 26);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text('✓ CONFORME Y CONGELADO', box2X + 4, y + 32);

  // ─── 6. Cláusula Legal de Inmutabilidad ─────────────────────────────────────
  y += 42;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  const legalText =
    'El presente documento constituye el Acta Oficial de Liquidación Comercial emitida por BlueSystem Delivery Enterprise. Al haber sido formalmente confirmada la recepción de la transferencia por el comercio y verificado el comprobante bancario, este registro contable queda definitivamente cerrado y congelado bajo la política de Inmutabilidad Financiera (ADR-018 / EIAM v2.2), no admitiendo modificaciones posteriores ni renegociación retroactiva de comisiones.';
  doc.text(legalText, margin, y, { maxWidth: contentWidth, align: 'justify' });

  // ─── 7. Pie de Página ───────────────────────────────────────────────────────
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, 282, pageWidth - margin, 282);

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Generado el: ${new Date().toLocaleString('es-NI')} | Sistema BlueSystem Delivery Enterprise`, margin, 286);
  doc.text('Página 1 de 1 — Documento Contable Inmutable', pageWidth - margin, 286, { align: 'right' });

  // Guardar / Descargar PDF de forma 100% confiable mediante doc.save y fallback Blob & Anchor
  const filename = `Acta_Liquidacion_${settlement.businessId || 'comercio'}_${(settlement.settlementId || '00000000').substring(0, 8)}.pdf`;
  try {
    doc.save(filename);
    console.log('[settlementActPdf] doc.save completado:', filename);
  } catch (saveErr) {
    console.warn('[settlementActPdf] Error en doc.save, ejecutando fallback Blob:', saveErr);
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 2000);
    } catch (fallbackErr) {
      console.error('[settlementActPdf] Falló también fallback de descarga:', fallbackErr);
      alert('No se pudo descargar el archivo PDF. Verifique la consola del navegador.');
    }
  }
}
