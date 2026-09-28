package com.example.domain.engine.intelligence

object LoyaltyEngine {

    /**
     * Calcula los puntos de lealtad ganados en una compra (1 punto por cada C$ 10.0).
     */
    fun calculatePointsEarned(orderTotal: Double): Int {
        return (orderTotal / 10.0).toInt()
    }

    /**
     * Determina si el cliente califica para envío gratis por su nivel VIP.
     */
    fun hasFreeDeliveryVipBenefit(vipLevel: VipLevel): Boolean {
        return vipLevel == VipLevel.GOLD || vipLevel == VipLevel.PLATINUM
    }

    /**
     * Retorna el porcentaje de cashback otorgado al usuario por nivel VIP.
     */
    fun getCashbackPercentage(vipLevel: VipLevel): Double {
        return when (vipLevel) {
            VipLevel.PLATINUM -> 8.0
            VipLevel.GOLD -> 5.0
            VipLevel.SILVER -> 3.0
            VipLevel.BRONZE -> 1.0
        }
    }
}
