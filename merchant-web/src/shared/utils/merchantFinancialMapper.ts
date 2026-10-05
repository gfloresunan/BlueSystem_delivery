/**
 * BlueSystem Delivery Enterprise — Merchant Financial Mapper
 * BSD-MERCHANT-ORDER-FINANCIAL-VISIBILITY-RESPONSIVE-UX-001
 * 
 * Regla Canónica de Integridad Financiera:
 * El comercio debe visualizar exclusivamente el valor de sus productos (merchantProductSubtotal / merchantGrossSales).
 * NUNCA debe mostrarse al comercio deliveryFee, additionalChargeAmount (tarifa de servicio),
 * tipAmount (propina courier) ni customerGrandTotal como parte de la venta del comercio.
 * 
 * Jerarquía Estricta de Fallback (Sin inventar valores):
 * 1. merchantGrossSales (canónico explícito si > 0)
 * 2. subtotal - descuento comercial (si subtotal > 0)
 * 3. suma de items (Σ item.price * item.quantity - descuento)
 * 4. 0.0 (Fallback seguro — NUNCA deducir a ciegas de customerTotal)
 */

export interface MerchantOrderFinancials {
  /** Valor de productos neto correspondiente al comercio */
  productSubtotal: number;
  /** Valor de productos formateado en córdobas (es-NI) */
  productSubtotalFormatted: string;
  /** Subtotal de productos antes de descuentos */
  rawProductsSubtotal: number;
  /** Descuentos comerciales aplicados a la venta del comercio */
  commercialDiscount: number;
  /** Código del cupón comercial si existe */
  couponCode?: string;
  /** Cantidad total de unidades de productos */
  itemCount: number;
  /** Gran total del cliente (reservado únicamente para conciliación/auditoría) */
  customerTotal: number;
}

export function getMerchantOrderFinancials(data: any): MerchantOrderFinancials {
  if (!data) {
    return {
      productSubtotal: 0,
      productSubtotalFormatted: 'C$ 0.00',
      rawProductsSubtotal: 0,
      commercialDiscount: 0,
      itemCount: 0,
      customerTotal: 0
    };
  }

  const discount = Math.max(0, Number(
    data.discountAmount ||
    data.couponDiscount ||
    data.totalDiscount ||
    data.coupon?.discountAmount ||
    0
  ));

  // 1. Prioridad Canónica: merchantGrossSales explícito
  if (data.merchantGrossSales !== undefined && data.merchantGrossSales !== null && Number(data.merchantGrossSales) > 0) {
    const gross = Number(data.merchantGrossSales);
    return buildSummary(gross, gross + discount, discount, data);
  }

  // 2. Subtotal canónico de productos (subtotal - descuento comercial)
  const rawSubtotal = Number(data.subtotal || data.subtotalAmount || 0);
  if (rawSubtotal > 0) {
    const gross = Math.max(0, rawSubtotal - discount);
    return buildSummary(gross, rawSubtotal, discount, data);
  }

  // 3. Suma de items individuales si subtotal viene en 0 o ausente
  if (Array.isArray(data.items) && data.items.length > 0) {
    const itemsSum = data.items.reduce((acc: number, it: any) => {
      const price = Number(it.price || it.unitPrice || 0);
      const qty = Number(it.quantity || 1);
      return acc + (price * qty);
    }, 0);

    if (itemsSum > 0) {
      const gross = Math.max(0, itemsSum - discount);
      return buildSummary(gross, itemsSum, discount, data);
    }
  }

  // 4. Fallback Seguro Endurecido: NO deducir ni inventar a partir de customerTotal
  // Si no hay datos suficientes de productos, reportar 0.0 de forma transparente
  return buildSummary(0, 0, discount, data);
}

/**
 * Redondeo Canónico Financiero a 2 Decimales (ROUND_HALF_UP).
 * Corrige artefactos de punto flotante IEEE-754 (ej. 89.99499999999999 -> 89.995 -> 90.00).
 */
export function roundFinancialCurrency(value: number): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  // 1. Normalización a 8 dígitos para corregir ruido binario de punto flotante
  const normalized = Math.round(value * 1e8) / 1e8;
  // 2. Redondeo financiero estándar ROUND_HALF_UP a centavos enteros
  return Math.round((normalized + Number.EPSILON) * 100) / 100;
}

function buildSummary(
  productSubtotal: number,
  rawProductsSubtotal: number,
  discount: number,
  data: any
): MerchantOrderFinancials {
  const rounded = roundFinancialCurrency(productSubtotal);
  const formatted = `C$ ${rounded.toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  let itemCount = 0;
  if (Array.isArray(data.items)) {
    itemCount = data.items.reduce((acc: number, it: any) => acc + Number(it.quantity || 1), 0);
  } else if (typeof data.items === 'string' && data.items.trim()) {
    itemCount = 1;
  }

  const customerTotal = Number(data.total || data.customerTotal || data.totalAmount || 0);

  return {
    productSubtotal: rounded,
    productSubtotalFormatted: formatted,
    rawProductsSubtotal: roundFinancialCurrency(rawProductsSubtotal),
    commercialDiscount: roundFinancialCurrency(discount),
    couponCode: data.couponCode || data.coupon?.code || undefined,
    itemCount: itemCount > 0 ? itemCount : 1,
    customerTotal
  };
}
