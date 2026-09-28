package com.example.presentation.customer.coupons

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.repository.CouponRedemptionModel
import com.example.data.repository.CouponRepository
import com.example.domain.model.Promotion
import com.example.domain.model.coupon.CouponDiscountType
import com.example.domain.model.coupon.CouponDomainModel
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.Locale

private data class RawBenefitsData(
    val coupons: List<CouponDomainModel> = emptyList(),
    val redemptions: List<CouponRedemptionModel> = emptyList(),
    val promotions: List<Promotion> = emptyList(),
    val errorMessage: String? = null
)

private data class UiControlsState(
    val selectedTab: CouponCategoryTab = CouponCategoryTab.AVAILABLE,
    val selectedCoupon: CouponCardUiModel? = null,
    val copiedCode: String? = null,
    val isRefreshing: Boolean = false
)

class CouponsViewModel(
    private val couponRepository: CouponRepository = CouponRepository(),
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) : ViewModel() {

    private val currentUserId: String?
        get() = auth.currentUser?.uid

    private val _selectedTab = MutableStateFlow(CouponCategoryTab.AVAILABLE)
    private val _selectedCouponForDetail = MutableStateFlow<CouponCardUiModel?>(null)
    private val _copiedCodeEvent = MutableStateFlow<String?>(null)
    private val _isRefreshing = MutableStateFlow(false)
    private val _errorState = MutableStateFlow<String?>(null)

    // Flujo 1: Datos canónicos de Firestore
    private val rawBenefitsFlow: Flow<RawBenefitsData> = combine(
        couponRepository.observeCoupons(currentUserId).catch { e ->
            _errorState.value = e.message
            emit(emptyList())
        },
        couponRepository.observeUserRedemptions(currentUserId ?: "").catch { emit(emptyList()) },
        couponRepository.observePromotions().catch { emit(emptyList()) }
    ) { coupons, redemptions, promotions ->
        RawBenefitsData(
            coupons = coupons,
            redemptions = redemptions,
            promotions = promotions,
            errorMessage = _errorState.value
        )
    }

    // Flujo 2: Controles y eventos de UI
    private val uiControlsFlow: Flow<UiControlsState> = combine(
        _selectedTab,
        _selectedCouponForDetail,
        _copiedCodeEvent,
        _isRefreshing
    ) { tab, coupon, copied, refreshing ->
        UiControlsState(
            selectedTab = tab,
            selectedCoupon = coupon,
            copiedCode = copied,
            isRefreshing = refreshing
        )
    }

    val uiState: StateFlow<CouponsUiState> = combine(
        rawBenefitsFlow,
        uiControlsFlow,
        _errorState
    ) { rawData, controls, explicitError ->
        processState(
            rawCoupons = rawData.coupons,
            redemptions = rawData.redemptions,
            promotions = rawData.promotions,
            selectedTab = controls.selectedTab,
            selectedCoupon = controls.selectedCoupon,
            copiedCode = controls.copiedCode,
            isRefreshing = controls.isRefreshing,
            errorMessage = explicitError ?: rawData.errorMessage
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = CouponsUiState(isLoading = true)
    )

    fun selectCategoryTab(tab: CouponCategoryTab) {
        _selectedTab.value = tab
    }

    fun selectCouponForDetail(coupon: CouponCardUiModel?) {
        _selectedCouponForDetail.value = coupon
    }

    fun copyCouponCode(code: String) {
        _copiedCodeEvent.value = code
    }

    fun clearCopiedEvent() {
        _copiedCodeEvent.value = null
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            _errorState.value = null
            kotlinx.coroutines.delay(600)
            _isRefreshing.value = false
        }
    }

    fun preselectCouponById(couponId: String) {
        val currentCoupons = uiState.value.availableCoupons + uiState.value.personalizedCoupons
        val found = currentCoupons.firstOrNull { it.id == couponId || it.code.equals(couponId, ignoreCase = true) }
        if (found != null) {
            _selectedCouponForDetail.value = found
        }
    }

    private fun processState(
        rawCoupons: List<CouponDomainModel>,
        redemptions: List<CouponRedemptionModel>,
        promotions: List<Promotion>,
        selectedTab: CouponCategoryTab,
        selectedCoupon: CouponCardUiModel?,
        copiedCode: String?,
        isRefreshing: Boolean,
        errorMessage: String?
    ): CouponsUiState {
        val now = System.currentTimeMillis()
        val redemptionIds = redemptions.map { it.couponId }.toSet()
        val redemptionCodes = redemptions.map { it.code.uppercase() }.toSet()

        val available = mutableListOf<CouponCardUiModel>()
        val personalized = mutableListOf<CouponCardUiModel>()
        val used = mutableListOf<CouponCardUiModel>()
        val expired = mutableListOf<CouponCardUiModel>()

        // 1. Procesar cupones de Firestore `/coupons`
        rawCoupons.forEach { coupon ->
            val isRedeemed = redemptionIds.contains(coupon.id) || redemptionCodes.contains(coupon.code.uppercase())
            val matchingRedemption = redemptions.firstOrNull { it.couponId == coupon.id || it.code.equals(coupon.code, ignoreCase = true) }

            val uiModel = mapToCardUiModel(coupon, isRedeemed, matchingRedemption, now)

            when {
                isRedeemed -> {
                    used.add(uiModel.copy(badgeType = CouponBadgeType.USED, isUsable = false))
                }
                coupon.isExpired(now) -> {
                    expired.add(uiModel.copy(badgeType = CouponBadgeType.EXPIRED, isUsable = false))
                }
                coupon.isValidNow(now) -> {
                    available.add(uiModel)
                    if (coupon.isPersonalized) {
                        personalized.add(uiModel)
                    }
                }
                else -> {
                    expired.add(uiModel.copy(badgeType = CouponBadgeType.EXPIRED, isUsable = false))
                }
            }
        }

        // 2. Ordenar disponibles: 1. Mayor urgencia (vencen pronto), 2. Mayor beneficio
        available.sortWith(
            compareByDescending<CouponCardUiModel> { it.badgeType == CouponBadgeType.EXPIRING_SOON }
                .thenByDescending { it.discountValue }
        )

        // 3. Seleccionar el mejor beneficio como Hero
        val hero = available.firstOrNull()

        return CouponsUiState(
            isLoading = false,
            isRefreshing = isRefreshing,
            errorMessage = errorMessage,
            selectedCategory = selectedTab,
            availableCoupons = available,
            promotionalItems = promotions,
            personalizedCoupons = personalized,
            usedCoupons = used,
            expiredCoupons = expired,
            heroBenefit = hero,
            selectedCouponForDetail = selectedCoupon,
            copiedCouponCodeEvent = copiedCode
        )
    }

    private fun mapToCardUiModel(
        coupon: CouponDomainModel,
        isRedeemed: Boolean,
        redemption: CouponRedemptionModel?,
        now: Long
    ): CouponCardUiModel {
        val isExpSoon = coupon.isExpiringSoon(currentMillis = now)
        val badge = when {
            isRedeemed -> CouponBadgeType.USED
            coupon.isExpired(now) -> CouponBadgeType.EXPIRED
            isExpSoon -> CouponBadgeType.EXPIRING_SOON
            coupon.isLoyaltyReward -> CouponBadgeType.LOYALTY
            coupon.isPersonalized -> CouponBadgeType.PERSONALIZED
            else -> CouponBadgeType.AVAILABLE
        }

        val origin = when {
            coupon.isLoyaltyReward -> CouponOrigin.LOYALTY
            coupon.isPersonalized -> CouponOrigin.PERSONALIZED
            coupon.scope.name == "MERCHANT_SPECIFIC" -> CouponOrigin.BUSINESS
            else -> CouponOrigin.PLATFORM
        }

        val minOrderText = if (coupon.minimumOrderAmount > 0) {
            "Compra mínima C$ ${String.format(Locale.US, "%.2f", coupon.minimumOrderAmount)}"
        } else {
            "Sin compra mínima"
        }

        val maxDiscountText = coupon.maximumDiscountAmount?.let { max ->
            if (max > 0) "Máximo descuento: C$ ${String.format(Locale.US, "%.2f", max)}" else null
        }

        val usedDateText = redemption?.redeemedAt?.toDate()?.let { date ->
            val sdf = java.text.SimpleDateFormat("d MMM yyyy, h:mm a", Locale("es", "NI"))
            sdf.format(date)
        }

        return CouponCardUiModel(
            id = coupon.id,
            code = coupon.code,
            title = coupon.title.ifBlank { coupon.description },
            description = coupon.description,
            businessId = coupon.businessId,
            businessName = coupon.businessName,
            badgeType = badge,
            origin = origin,
            formattedDiscount = coupon.getFormattedDiscount(),
            minOrderText = minOrderText,
            maxDiscountText = maxDiscountText,
            validityText = coupon.getFormattedExpiry(),
            isUsable = !isRedeemed && !coupon.isExpired(now) && coupon.isActive,
            isLoyalty = coupon.isLoyaltyReward,
            isPersonalized = coupon.isPersonalized,
            scope = coupon.scope.name,
            branchIds = coupon.branchIds,
            discountValue = coupon.discountValue,
            usageCount = coupon.usageCount,
            usageLimit = coupon.usageLimit,
            usedDateText = usedDateText,
            orderId = redemption?.orderId
        )
    }
}
