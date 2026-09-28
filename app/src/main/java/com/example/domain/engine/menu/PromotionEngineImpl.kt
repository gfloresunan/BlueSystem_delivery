package com.example.domain.engine.menu

import com.example.domain.model.menu.DiscountType
import com.example.domain.model.menu.MenuPromotion
import kotlin.math.min

class PromotionEngineImpl : IPromotionEngine {

    override fun evaluatePromotions(
        activePromotions: List<MenuPromotion>,
        context: PromotionEvaluationContext
    ): PromotionEvaluationResult {
        // 1. Filtrar promociones válidas temporalmente y activas
        val validPromotions = activePromotions
            .filter { it.isValidAt(context.timestamp) }
            .sortedByDescending { it.priority }

        var totalDiscount = 0.0
        var isFreeShipping = false
        val appliedPromos = mutableListOf<MenuPromotion>()
        var appliedCoupon: String? = null

        for (promo in validPromotions) {
            val rule = promo.rule

            // Validar cupón si aplica
            if (!rule.couponCode.isNullOrBlank()) {
                if (!rule.couponCode.equals(context.couponCode, ignoreCase = true)) {
                    continue
                }
            }

            // Validar monto mínimo de pedido
            if (context.cartSubtotal < rule.minOrderAmount) {
                continue
            }

            // Validar categorías aplicables si la lista no está vacía
            if (rule.applicableCategoryIds.isNotEmpty()) {
                val matchesCategory = context.cartItemCategoryIds.any { it in rule.applicableCategoryIds }
                if (!matchesCategory) continue
            }

            // Validar productos aplicables si la lista no está vacía
            if (rule.applicableProductIds.isNotEmpty()) {
                val matchesProduct = context.cartItemProductIds.any { it in rule.applicableProductIds }
                if (!matchesProduct) continue
            }

            // Calcular el descuento según el tipo
            var discountForPromo = 0.0
            when (promo.discountType) {
                DiscountType.PERCENTAGE -> {
                    discountForPromo = context.cartSubtotal * (promo.discountValue / 100.0)
                }
                DiscountType.FIXED_AMOUNT -> {
                    discountForPromo = min(context.cartSubtotal - totalDiscount, promo.discountValue)
                }
                DiscountType.BUY_X_GET_Y -> {
                    // 2x1 o N x M: aplicar descuento equivalente al valor fijo del beneficio
                    discountForPromo = promo.discountValue
                }
                DiscountType.FREE_SHIPPING -> {
                    isFreeShipping = true
                }
            }

            if (discountForPromo > 0.0 || isFreeShipping) {
                totalDiscount += discountForPromo
                appliedPromos.add(promo)

                if (!rule.couponCode.isNullOrBlank()) {
                    appliedCoupon = rule.couponCode
                }
            }
        }

        return PromotionEvaluationResult(
            totalDiscountAmount = totalDiscount.coerceAtMost(context.cartSubtotal),
            appliedPromotions = appliedPromos,
            isFreeShipping = isFreeShipping,
            appliedCouponCode = appliedCoupon
        )
    }
}
