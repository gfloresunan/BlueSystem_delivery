"use strict";
/**
 * BlueSystem Delivery Enterprise — Domain Engine: Enterprise Coupon Engine v1.0
 * Pure, deterministic, and authoritative evaluation of coupons and promotions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTimestampToMillis = normalizeTimestampToMillis;
exports.evaluateCoupon = evaluateCoupon;
/**
 * Normaliza timestamps de Firestore / Date / number a milisegundos
 */
function normalizeTimestampToMillis(ts) {
    if (!ts)
        return 0;
    if (typeof ts === "number")
        return ts;
    if (typeof ts === "string") {
        const parsed = Date.parse(ts);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof ts.toMillis === "function") {
        return ts.toMillis();
    }
    if (typeof ts.seconds === "number") {
        return ts.seconds * 1000 + (ts.nanoseconds ? Math.floor(ts.nanoseconds / 1000000) : 0);
    }
    if (ts instanceof Date) {
        return ts.getTime();
    }
    return 0;
}
/**
 * Evalúa un cupón de forma pura y determinista
 */
function evaluateCoupon(coupon, context) {
    const now = context.currentTimestamp || Date.now();
    const normalizedInputCode = (context.couponCode || "").trim().toUpperCase();
    const normalizedCouponCode = (coupon.code || "").trim().toUpperCase();
    // 1. Validar Código
    if (!normalizedInputCode || normalizedInputCode !== normalizedCouponCode) {
        return {
            isValid: false,
            errorCode: "INVALID_COUPON",
            errorMessage: "El código de cupón no coincide o no existe.",
            discountAmount: 0,
            deliveryDiscountAmount: 0,
            finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
        };
    }
    // 2. Validar Estado Activo
    if (coupon.isActive !== true) {
        return {
            isValid: false,
            errorCode: "INACTIVE_COUPON",
            errorMessage: "El cupón se encuentra inactivo o pausado.",
            discountAmount: 0,
            deliveryDiscountAmount: 0,
            finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
        };
    }
    // 3. Validar Rango de Fechas
    const startMs = normalizeTimestampToMillis(coupon.startsAt);
    const expiryMs = normalizeTimestampToMillis(coupon.expiresAt);
    if (startMs > 0 && now < startMs) {
        return {
            isValid: false,
            errorCode: "COUPON_NOT_YET_VALID",
            errorMessage: "La promoción de este cupón aún no ha iniciado.",
            discountAmount: 0,
            deliveryDiscountAmount: 0,
            finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
        };
    }
    if (expiryMs > 0 && now > expiryMs) {
        return {
            isValid: false,
            errorCode: "EXPIRED_COUPON",
            errorMessage: "El cupón ha expirado.",
            discountAmount: 0,
            deliveryDiscountAmount: 0,
            finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
        };
    }
    // 4. Validar Alcance (Scope) & Comercio
    if (coupon.scope === "MERCHANT_SPECIFIC") {
        if (!coupon.businessId || coupon.businessId !== context.businessId) {
            return {
                isValid: false,
                errorCode: "COUPON_BUSINESS_MISMATCH",
                errorMessage: "Este cupón no es válido para este comercio.",
                discountAmount: 0,
                deliveryDiscountAmount: 0,
                finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
            };
        }
    }
    // 5. Validar Sucursal si está restringido
    if (coupon.branchIds &&
        coupon.branchIds.length > 0 &&
        context.branchId &&
        !coupon.branchIds.includes(context.branchId)) {
        return {
            isValid: false,
            errorCode: "BRANCH_MISMATCH",
            errorMessage: "El cupón no está disponible para la sucursal seleccionada.",
            discountAmount: 0,
            deliveryDiscountAmount: 0,
            finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
        };
    }
    // 6. Validar Monto Mínimo de Pedido
    const minAmount = coupon.minimumOrderAmount || 0;
    if (context.cartSubtotal < minAmount) {
        return {
            isValid: false,
            errorCode: "MINIMUM_ORDER_NOT_REACHED",
            errorMessage: `El monto mínimo de compra para este cupón es C$ ${minAmount.toFixed(2)}.`,
            discountAmount: 0,
            deliveryDiscountAmount: 0,
            finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
        };
    }
    // 7. Validar Límite Global de Usos
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageLimit > 0) {
        const currentUsage = coupon.usageCount || 0;
        if (currentUsage >= coupon.usageLimit) {
            return {
                isValid: false,
                errorCode: "USAGE_LIMIT_REACHED",
                errorMessage: "Este cupón ha alcanzado el límite máximo de usos disponibles.",
                discountAmount: 0,
                deliveryDiscountAmount: 0,
                finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
            };
        }
    }
    // 8. Validar Límite por Cliente
    if (coupon.perCustomerLimit !== null && coupon.perCustomerLimit !== undefined && coupon.perCustomerLimit > 0) {
        const customerCount = context.customerPreviousRedemptionCount || 0;
        if (customerCount >= coupon.perCustomerLimit) {
            return {
                isValid: false,
                errorCode: "CUSTOMER_LIMIT_REACHED",
                errorMessage: `Has alcanzado el límite de uso de este cupón (${coupon.perCustomerLimit} vez/veces).`,
                discountAmount: 0,
                deliveryDiscountAmount: 0,
                finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
            };
        }
    }
    // 9. Validar Productos / Categorías Elegibles
    let eligibleSubtotal = context.cartSubtotal;
    if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
        const matchingItems = context.items.filter((item) => coupon.applicableProductIds.includes(item.productId));
        if (matchingItems.length === 0) {
            return {
                isValid: false,
                errorCode: "PRODUCT_NOT_ELIGIBLE",
                errorMessage: "Ninguno de los productos en tu carrito es elegible para este cupón.",
                discountAmount: 0,
                deliveryDiscountAmount: 0,
                finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
            };
        }
        eligibleSubtotal = matchingItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    }
    else if (coupon.applicableCategoryIds && coupon.applicableCategoryIds.length > 0) {
        const matchingItems = context.items.filter((item) => item.categoryId && coupon.applicableCategoryIds.includes(item.categoryId));
        if (matchingItems.length === 0) {
            return {
                isValid: false,
                errorCode: "CATEGORY_NOT_ELIGIBLE",
                errorMessage: "Los productos en tu carrito no pertenecen a las categorías aplicables.",
                discountAmount: 0,
                deliveryDiscountAmount: 0,
                finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - (context.existingPromotionDiscount || 0)),
            };
        }
        eligibleSubtotal = matchingItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    }
    // 10. Validar Apilabilidad con Promociones Previas
    const existingPromoDiscount = context.existingPromotionDiscount || 0;
    if (existingPromoDiscount > 0) {
        const isCouponStackable = coupon.stackable === true;
        const isPromoStackable = context.isPromotionStackable !== false;
        if (!isCouponStackable || !isPromoStackable) {
            return {
                isValid: false,
                errorCode: "PROMOTION_NOT_STACKABLE",
                errorMessage: "Este cupón no se puede combinar con otras promociones activas.",
                discountAmount: 0,
                deliveryDiscountAmount: 0,
                finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - existingPromoDiscount),
            };
        }
    }
    // 11. Calcular Descuento
    let calculatedDiscount = 0;
    let calculatedDeliveryDiscount = 0;
    switch (coupon.discountType) {
        case "PERCENTAGE": {
            const pct = Math.max(0, Math.min(100, coupon.discountValue || 0));
            calculatedDiscount = (eligibleSubtotal * pct) / 100.0;
            break;
        }
        case "FIXED_AMOUNT": {
            calculatedDiscount = Math.max(0, coupon.discountValue || 0);
            break;
        }
        case "FREE_DELIVERY": {
            calculatedDeliveryDiscount = Math.max(0, context.deliveryFee || 0);
            break;
        }
        default: {
            return {
                isValid: false,
                errorCode: "INVALID_DISCOUNT_TYPE",
                errorMessage: "Tipo de descuento no reconocido.",
                discountAmount: 0,
                deliveryDiscountAmount: 0,
                finalTotal: Math.max(0, context.cartSubtotal + context.deliveryFee - existingPromoDiscount),
            };
        }
    }
    // Aplicar tope máximo de descuento si está configurado
    if (coupon.maximumDiscountAmount !== null && coupon.maximumDiscountAmount !== undefined && coupon.maximumDiscountAmount > 0) {
        calculatedDiscount = Math.min(calculatedDiscount, coupon.maximumDiscountAmount);
    }
    // Regla crítica: discount <= subtotal (nunca superar el subtotal elegible ni total neto negativo)
    calculatedDiscount = Math.min(calculatedDiscount, context.cartSubtotal);
    // Redondear a 2 decimales para evitar problemas de coma flotante
    calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;
    calculatedDeliveryDiscount = Math.round(calculatedDeliveryDiscount * 100) / 100;
    const totalEffectiveDelivery = Math.max(0, context.deliveryFee - calculatedDeliveryDiscount);
    const totalEffectiveSubtotal = Math.max(0, context.cartSubtotal - existingPromoDiscount - calculatedDiscount);
    const finalTotal = Math.max(0, Math.round((totalEffectiveSubtotal + totalEffectiveDelivery) * 100) / 100);
    return {
        isValid: true,
        discountAmount: calculatedDiscount,
        deliveryDiscountAmount: calculatedDeliveryDiscount,
        finalTotal,
        appliedCouponSnapshot: {
            couponId: coupon.id || coupon.code,
            code: coupon.code,
            scope: coupon.scope,
            businessId: coupon.businessId,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: calculatedDiscount > 0 ? calculatedDiscount : calculatedDeliveryDiscount,
        },
    };
}
