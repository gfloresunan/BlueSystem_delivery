package com.example.presentation.customer.coupons

import com.example.domain.model.Promotion

enum class CouponCategoryTab(val displayName: String, val icon: String) {
    AVAILABLE("Disponibles", "🎟️"),
    PROMOTIONAL("Promociones", "📢"),
    PERSONALIZED("Personalizados", "⭐"),
    USED("Usados", "✔️"),
    EXPIRED("Vencidos", "⏰")
}

enum class CouponBadgeType(val label: String) {
    AVAILABLE("Disponible"),
    EXPIRING_SOON("Vence pronto"),
    LOYALTY("Fidelidad"),
    PERSONALIZED("Solo para ti"),
    USED("Usado"),
    EXPIRED("Vencido")
}

enum class CouponOrigin {
    BUSINESS,
    PLATFORM,
    LOYALTY,
    PERSONALIZED,
    CAMPAIGN
}

data class CouponCardUiModel(
    val id: String = "",
    val code: String = "",
    val title: String = "",
    val description: String = "",
    val businessId: String? = null,
    val businessName: String? = null,
    val badgeType: CouponBadgeType = CouponBadgeType.AVAILABLE,
    val origin: CouponOrigin = CouponOrigin.PLATFORM,
    val formattedDiscount: String = "",
    val minOrderText: String = "",
    val maxDiscountText: String? = null,
    val validityText: String = "",
    val isUsable: Boolean = true,
    val isLoyalty: Boolean = false,
    val isPersonalized: Boolean = false,
    val scope: String = "GLOBAL",
    val branchIds: List<String> = emptyList(),
    val discountValue: Double = 0.0,
    val usageCount: Int = 0,
    val usageLimit: Int? = null,
    val usedDateText: String? = null,
    val orderId: String? = null
)

data class CouponsUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val isOffline: Boolean = false,
    val selectedCategory: CouponCategoryTab = CouponCategoryTab.AVAILABLE,
    val availableCoupons: List<CouponCardUiModel> = emptyList(),
    val promotionalItems: List<Promotion> = emptyList(),
    val personalizedCoupons: List<CouponCardUiModel> = emptyList(),
    val usedCoupons: List<CouponCardUiModel> = emptyList(),
    val expiredCoupons: List<CouponCardUiModel> = emptyList(),
    val heroBenefit: CouponCardUiModel? = null,
    val selectedCouponForDetail: CouponCardUiModel? = null,
    val copiedCouponCodeEvent: String? = null
) {
    val totalActiveBenefitsCount: Int
        get() = availableCoupons.size + promotionalItems.size
}
