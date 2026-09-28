package com.example.domain.engine.marketing

data class PromoRule(
    val id: String,
    val description: String,
    val minSubtotal: Double = 0.0,
    val freeDelivery: Boolean = false,
    val discountPct: Double = 0.0,
    val freeGiftItem: String? = null
)

object PromoRuleEngine {

    /**
     * Evalúa las reglas de promoción aplicables a un subtotal de compra.
     */
    fun evaluatePromotions(subtotal: Double): List<PromoRule> {
        val activeRules = mutableListOf<PromoRule>()

        if (subtotal >= 800.0) {
            activeRules.add(
                PromoRule(
                    id = "rule_free_delivery",
                    description = "¡Envío Gratis por compra mayor a C$ 800!",
                    minSubtotal = 800.0,
                    freeDelivery = true
                )
            )
        }

        if (subtotal >= 500.0) {
            activeRules.add(
                PromoRule(
                    id = "rule_free_soda",
                    description = "¡Refresco Gratis incluido en tu pedido!",
                    minSubtotal = 500.0,
                    freeGiftItem = "Refresco Coca-Cola 1.5L"
                )
            )
        }

        return activeRules
    }

    /**
     * Calcula el costo de envío final ajustado por promociones.
     */
    fun calculateFinalDeliveryFee(subtotal: Double, baseDeliveryFee: Double): Double {
        return if (subtotal >= 800.0) 0.0 else baseDeliveryFee
    }
}
