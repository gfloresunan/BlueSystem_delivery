package com.example.domain.engine.intelligence

import com.example.Pedido

enum class VipLevel { BRONZE, SILVER, GOLD, PLATINUM }

data class CustomerProfile(
    val userId: String = "",
    val name: String = "",
    val totalOrders: Int = 0,
    val totalSpent: Double = 0.0,
    val averageTicket: Double = 0.0,
    val vipLevel: VipLevel = VipLevel.BRONZE,
    val favoriteCategory: String = "Restaurantes",
    val favoritePaymentMethod: String = "efectivo",
    val lastOrderDate: String = "",
    val cashbackBalance: Double = 0.0
)

object Customer360Engine {

    /**
     * Construye el perfil Customer360 enriquecido a partir de los pedidos del usuario.
     */
    fun buildCustomerProfile(
        userId: String,
        userName: String,
        userOrders: List<Pedido>
    ): CustomerProfile {
        val filtered = userOrders.filter { it.customerId == userId || it.clienteId == userId }
        if (filtered.isEmpty()) {
            return CustomerProfile(userId = userId, name = userName)
        }

        val totalOrders = filtered.size
        val totalSpent = filtered.sumOf { it.total }
        val averageTicket = if (totalOrders > 0) totalSpent / totalOrders else 0.0

        val vipLevel = when {
            totalSpent >= 5000.0 || totalOrders >= 20 -> VipLevel.PLATINUM
            totalSpent >= 2500.0 || totalOrders >= 10 -> VipLevel.GOLD
            totalSpent >= 1000.0 || totalOrders >= 5 -> VipLevel.SILVER
            else -> VipLevel.BRONZE
        }

        val favoritePaymentMethod = filtered
            .groupingBy { it.paymentMethod }
            .eachCount()
            .maxByOrNull { it.value }?.key ?: "efectivo"

        val cashbackBalance = totalSpent * when (vipLevel) {
            VipLevel.PLATINUM -> 0.08
            VipLevel.GOLD -> 0.05
            VipLevel.SILVER -> 0.03
            VipLevel.BRONZE -> 0.01
        }

        return CustomerProfile(
            userId = userId,
            name = userName,
            totalOrders = totalOrders,
            totalSpent = totalSpent,
            averageTicket = averageTicket,
            vipLevel = vipLevel,
            favoritePaymentMethod = favoritePaymentMethod,
            cashbackBalance = cashbackBalance
        )
    }
}
