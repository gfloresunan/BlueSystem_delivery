/**
 * BlueSystem Delivery Enterprise — SSOT Pricing Validation Enforcement Policy
 * Protocolo: BSD-TERRITORIAL-PRICING-GATE-B-PREPARATION-001
 * 
 * Regla de Oro:
 * - Pedidos nuevos bajo contrato pricingValidationStatus -> status autoritativo obligatorio.
 * - Pedidos legacy creados antes del cutover oficial -> operables bajo compatibilidad controlada.
 * - Dominio X->Y -> ZERO-TOUCH (no sujeto a esta validación de Commerce).
 */

export const PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_AT = "2026-10-05T17:25:00.000Z";
export const PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_MS = new Date(PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_AT).getTime();

export const AUTHORITATIVE_PRICING_STATUSES = [
  "VERIFIED_QUOTE",
  "VERIFIED_MUNICIPAL_FLAT",
  "CORRECTED_AUTHORITATIVE",
  "VERIFIED_DISTANCE",
] as const;

export type AuthoritativePricingStatus = typeof AUTHORITATIVE_PRICING_STATUSES[number];

export interface OrderPricingValidationTarget {
  createdAt?: any;
  pricingValidationStatus?: string | null;
  serviceType?: string | null;
  [key: string]: any;
}

/**
 * Evalúa si un pedido cuenta con validación financiera autoritativa o si califica
 * para compatibilidad legacy controlada previa al cutover.
 */
export function isOrderPricingAuthoritative(order: OrderPricingValidationTarget): boolean {
  if (!order) return false;

  // 1. Dominio B: X_TO_Y_DELIVERY posee su propio ciclo independiente blindado (ZERO-TOUCH)
  if (order.serviceType === "X_TO_Y_DELIVERY") {
    return true;
  }

  // 2. Si cuenta con un estatus autoritativo reconocido, siempre es válido (tanto nuevos como sellados)
  const status = (order.pricingValidationStatus || "").toString().trim();
  if (AUTHORITATIVE_PRICING_STATUSES.includes(status as AuthoritativePricingStatus)) {
    return true;
  }

  // 3. Compatibilidad Legacy: Pedidos creados estrictamente ANTES del cutover oficial
  if (order.createdAt) {
    let createdMs: number | null = null;
    if (typeof order.createdAt.toMillis === "function") {
      createdMs = order.createdAt.toMillis();
    } else if (order.createdAt.toDate && typeof order.createdAt.toDate === "function") {
      createdMs = order.createdAt.toDate().getTime();
    } else if (order.createdAt.seconds && typeof order.createdAt.seconds === "number") {
      createdMs = order.createdAt.seconds * 1000;
    } else if (typeof order.createdAt === "string" || typeof order.createdAt === "number") {
      const parsed = new Date(order.createdAt).getTime();
      if (!isNaN(parsed)) createdMs = parsed;
    }

    if (createdMs !== null && !isNaN(createdMs) && createdMs < PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_MS) {
      return true; // Legacy order preservada sin bloqueo
    }
  }

  // 4. Pedidos nuevos (createdAt >= cutover o sin timestamp determinable) sin sello autoritativo quedan bloqueados
  return false;
}
