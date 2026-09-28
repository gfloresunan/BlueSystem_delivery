package com.example.domain.model.loyalty

import com.google.firebase.Timestamp
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * BlueSystem Delivery Enterprise — Loyalty Domain Models v1.0
 * 100% Real data structures for Customer App (No Mocks).
 */

data class LoyaltyGlobalSummary(
    val customerId: String = "",
    val globalPointsBalance: Int = 0,
    val lifetimePointsEarned: Int = 0,
    val lifetimePointsRedeemed: Int = 0,
    val updatedAt: Timestamp? = null
)

data class MerchantLoyaltyBalance(
    val businessId: String = "",
    val businessName: String = "Comercio",
    val businessLogoUrl: String = "",
    val pointsBalance: Int = 0,
    val lifetimePointsEarned: Int = 0,
    val completedOrdersCount: Int = 0,
    val updatedAt: Timestamp? = null
)

enum class RewardType {
    FIXED_DISCOUNT,
    PERCENTAGE_DISCOUNT,
    FREE_PRODUCT,
    FREE_DELIVERY,
    COMBO
}

data class LoyaltyComboItem(
    val type: String = "PRODUCT", // PRODUCT, FIXED_DISCOUNT, PERCENTAGE_DISCOUNT, FREE_DELIVERY
    val productId: String? = null,
    val productName: String? = null,
    val quantity: Int = 1,
    val value: Double = 0.0,
    val businessId: String? = null,
    val businessName: String? = null
)

enum class RewardScope {
    GLOBAL,
    MERCHANT_SPECIFIC
}

enum class RewardAvailabilityStatus {
    AVAILABLE,          // Puedes canjear
    INSUFFICIENT_POINTS,// Te faltan X puntos
    REDEEMED,           // Canjeado
    EXHAUSTED,          // Agotado
    EXPIRED             // Vencido
}

data class LoyaltyReward(
    val id: String = "",
    val name: String = "",
    val description: String = "",
    val imageUrl: String = "",
    val rewardType: String = "FIXED_DISCOUNT",
    val pointsCost: Int = 0,
    val scope: String = "GLOBAL",
    val businessId: String? = null,
    val businessName: String? = null,
    val discountType: String? = "FIXED_AMOUNT",
    val discountValue: Double = 0.0,
    val freeProductId: String? = null,
    val deliveryFree: Boolean = false,
    val comboItems: List<LoyaltyComboItem> = emptyList(),
    val active: Boolean = true,
    val maxRedemptions: Int? = null,
    val maxRedemptionsPerCustomer: Int? = null,
    val currentRedemptionsCount: Int = 0,
    val validityDays: Int = 30,
    val startsAt: Timestamp? = null,
    val expiresAt: Timestamp? = null
) {
    fun getAvailabilityStatus(
        userAvailablePoints: Int,
        merchantPoints: Int? = null,
        userRedeemedCount: Int = 0
    ): Pair<RewardAvailabilityStatus, String> {
        if (!active) {
            return RewardAvailabilityStatus.EXHAUSTED to "No disponible"
        }

        val now = System.currentTimeMillis()
        if (expiresAt != null && expiresAt.toDate().time < now) {
            return RewardAvailabilityStatus.EXPIRED to "Vencido"
        }

        if (maxRedemptions != null && maxRedemptions > 0 && currentRedemptionsCount >= maxRedemptions) {
            return RewardAvailabilityStatus.EXHAUSTED to "Agotado"
        }

        if (maxRedemptionsPerCustomer != null && maxRedemptionsPerCustomer > 0 && userRedeemedCount >= maxRedemptionsPerCustomer) {
            return RewardAvailabilityStatus.REDEEMED to "Límite alcanzado"
        }

        val effectivePoints = if (scope == "MERCHANT_SPECIFIC") (merchantPoints ?: 0) else userAvailablePoints
        if (effectivePoints < pointsCost) {
            val missing = pointsCost - effectivePoints
            return RewardAvailabilityStatus.INSUFFICIENT_POINTS to "Te faltan $missing pts"
        }

        return RewardAvailabilityStatus.AVAILABLE to "Puedes canjear"
    }
}

data class LoyaltyLevel(
    val id: String = "bronce",
    val name: String = "Bronce",
    val description: String = "Nivel inicial de bienvenida",
    val minPoints: Int = 0,
    val maxPoints: Int = 499,
    val benefits: List<String> = emptyList(),
    val icon: String = "🥉",
    val sortOrder: Int = 1,
    val active: Boolean = true
)

data class LoyaltyAllocationItem(
    val businessId: String = "",
    val businessName: String = "",
    val points: Int = 0
)

data class LoyaltyTransactionItem(
    val transactionId: String = "",
    val customerId: String = "",
    val businessId: String = "",
    val businessName: String = "",
    val orderId: String? = null,
    val rewardId: String? = null,
    val rewardType: String = "FIXED_DISCOUNT",
    val couponCode: String? = null,
    val type: String = "EARN", // EARN, REDEEM, ADJUSTMENT, REVERSAL
    val points: Int = 0,
    val balanceBefore: Int = 0,
    val balanceAfter: Int = 0,
    val scope: String = "MERCHANT_SPECIFIC",
    val allocation: List<LoyaltyAllocationItem> = emptyList(),
    val comboSnapshot: List<LoyaltyComboItem> = emptyList(),
    val description: String = "",
    val createdAt: Timestamp? = null,
    val formattedDate: String = ""
) {
    fun getDisplayDate(): String {
        if (formattedDate.isNotBlank()) return formattedDate
        val date = createdAt?.toDate() ?: Date()
        val sdf = SimpleDateFormat("d 'de' MMMM", Locale("es", "NI"))
        return sdf.format(date)
    }
}

data class RedeemRewardResult(
    val success: Boolean = false,
    val message: String = "",
    val couponCode: String? = null,
    val pointsRedeemed: Int = 0,
    val remainingGlobalPoints: Int = 0,
    val rewardName: String = "",
    val rewardType: String = "FIXED_DISCOUNT",
    val comboSnapshot: List<LoyaltyComboItem> = emptyList(),
    val allocation: List<LoyaltyAllocationItem> = emptyList()
)
