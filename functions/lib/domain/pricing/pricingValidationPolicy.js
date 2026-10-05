"use strict";
/**
 * BlueSystem Delivery Enterprise — SSOT Pricing Validation Enforcement Policy
 * Protocolo: BSD-TERRITORIAL-PRICING-GATE-B-PREPARATION-001
 *
 * Regla de Oro:
 * - Pedidos nuevos bajo contrato pricingValidationStatus -> status autoritativo obligatorio.
 * - Pedidos legacy creados antes del cutover oficial -> operables bajo compatibilidad controlada.
 * - Dominio X->Y -> ZERO-TOUCH (no sujeto a esta validación de Commerce).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTHORITATIVE_PRICING_STATUSES = exports.PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_MS = exports.PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_AT = void 0;
exports.isOrderPricingAuthoritative = isOrderPricingAuthoritative;
exports.PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_AT = "2026-10-05T17:25:00.000Z";
exports.PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_MS = new Date(exports.PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_AT).getTime();
exports.AUTHORITATIVE_PRICING_STATUSES = [
    "VERIFIED_QUOTE",
    "VERIFIED_MUNICIPAL_FLAT",
    "CORRECTED_AUTHORITATIVE",
    "VERIFIED_DISTANCE",
];
/**
 * Evalúa si un pedido cuenta con validación financiera autoritativa o si califica
 * para compatibilidad legacy controlada previa al cutover.
 */
function isOrderPricingAuthoritative(order) {
    if (!order)
        return false;
    // 1. Dominio B: X_TO_Y_DELIVERY posee su propio ciclo independiente blindado (ZERO-TOUCH)
    if (order.serviceType === "X_TO_Y_DELIVERY") {
        return true;
    }
    // 2. Si cuenta con un estatus autoritativo reconocido, siempre es válido (tanto nuevos como sellados)
    const status = (order.pricingValidationStatus || "").toString().trim();
    if (exports.AUTHORITATIVE_PRICING_STATUSES.includes(status)) {
        return true;
    }
    // 3. Compatibilidad Legacy: Pedidos creados estrictamente ANTES del cutover oficial
    if (order.createdAt) {
        let createdMs = null;
        if (typeof order.createdAt.toMillis === "function") {
            createdMs = order.createdAt.toMillis();
        }
        else if (order.createdAt.toDate && typeof order.createdAt.toDate === "function") {
            createdMs = order.createdAt.toDate().getTime();
        }
        else if (order.createdAt.seconds && typeof order.createdAt.seconds === "number") {
            createdMs = order.createdAt.seconds * 1000;
        }
        else if (typeof order.createdAt === "string" || typeof order.createdAt === "number") {
            const parsed = new Date(order.createdAt).getTime();
            if (!isNaN(parsed))
                createdMs = parsed;
        }
        if (createdMs !== null && !isNaN(createdMs) && createdMs < exports.PRICING_VALIDATION_ENFORCEMENT_EFFECTIVE_MS) {
            return true; // Legacy order preservada sin bloqueo
        }
    }
    // 4. Pedidos nuevos (createdAt >= cutover o sin timestamp determinable) sin sello autoritativo quedan bloqueados
    return false;
}
//# sourceMappingURL=pricingValidationPolicy.js.map