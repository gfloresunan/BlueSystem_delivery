package com.example.domain.model.coupon

import com.google.firebase.Timestamp

enum class CouponScope {
    GLOBAL,
    MERCHANT_SPECIFIC
}

enum class CouponDiscountType {
    PERCENTAGE,
    FIXED_AMOUNT,
    FREE_DELIVERY
}

data class CouponDomainModel(
    val id: String = "",
    val code: String = "",
    val title: String = "",
    val scope: CouponScope = CouponScope.GLOBAL,
    val businessId: String? = null,
    val businessName: String? = null,
    val branchIds: List<String> = emptyList(),
    val discountType: CouponDiscountType = CouponDiscountType.PERCENTAGE,
    val discountValue: Double = 0.0,
    val minimumOrderAmount: Double = 0.0,
    val maximumDiscountAmount: Double? = null,
    val startsAt: Timestamp? = null,
    val expiresAt: Timestamp? = null,
    val isActive: Boolean = true,
    val usageLimit: Int? = null,
    val usageCount: Int = 0,
    val perCustomerLimit: Int? = null,
    val applicableProductIds: List<String> = emptyList(),
    val applicableCategoryIds: List<String> = emptyList(),
    val stackable: Boolean = false,
    val priority: Int = 1,
    val description: String = "",
    val customerId: String? = null,
    val rewardType: String? = null,
    val sourceRewardId: String? = null,
    val createdBy: String = ""
) {
    val isLoyaltyReward: Boolean
        get() = createdBy.equals("LOYALTY_SYSTEM", ignoreCase = true) ||
                !sourceRewardId.isNullOrBlank() ||
                !rewardType.isNullOrBlank() ||
                code.startsWith("REW-", ignoreCase = true) ||
                code.startsWith("CMB-", ignoreCase = true)

    val isPersonalized: Boolean
        get() = !customerId.isNullOrBlank() || isLoyaltyReward

    fun isValidNow(currentMillis: Long = System.currentTimeMillis()): Boolean {
        if (!isActive) return false
        val startMillis = startsAt?.toDate()?.time ?: 0L
        val expiryMillis = expiresAt?.toDate()?.time ?: Long.MAX_VALUE
        return currentMillis in startMillis..expiryMillis
    }

    fun isExpired(currentMillis: Long = System.currentTimeMillis()): Boolean {
        val expiryMillis = expiresAt?.toDate()?.time ?: Long.MAX_VALUE
        return currentMillis > expiryMillis
    }

    fun isExpiringSoon(thresholdMillis: Long = 48 * 3600 * 1000L, currentMillis: Long = System.currentTimeMillis()): Boolean {
        val expiryMillis = expiresAt?.toDate()?.time ?: return false
        val diff = expiryMillis - currentMillis
        return diff in 1..thresholdMillis
    }

    fun getFormattedDiscount(): String {
        return when (discountType) {
            CouponDiscountType.PERCENTAGE -> "${discountValue.toInt().takeIf { it.toDouble() == discountValue } ?: String.format(java.util.Locale.US, "%.1f", discountValue)}% OFF"
            CouponDiscountType.FIXED_AMOUNT -> "C$ ${String.format(java.util.Locale.US, "%.2f", discountValue)} OFF"
            CouponDiscountType.FREE_DELIVERY -> "Envío Gratis"
        }
    }

    fun getFormattedExpiry(): String {
        val date = expiresAt?.toDate() ?: return "Sin vencimiento"
        val sdf = java.text.SimpleDateFormat("d MMM yyyy", java.util.Locale("es", "NI"))
        return sdf.format(date)
    }
}

data class CouponValidationResult(
    val isValid: Boolean,
    val errorCode: String? = null,
    val errorMessage: String? = null,
    val discountAmount: Double = 0.0,
    val deliveryDiscountAmount: Double = 0.0,
    val finalTotal: Double = 0.0,
    val appliedCoupon: CouponDomainModel? = null
)
