package com.example.coupons

import com.example.data.repository.CouponRedemptionModel
import com.example.domain.model.Promotion
import com.example.domain.model.coupon.CouponDiscountType
import com.example.domain.model.coupon.CouponDomainModel
import com.example.domain.model.coupon.CouponScope
import com.example.presentation.customer.coupons.CouponBadgeType
import com.example.presentation.customer.coupons.CouponCategoryTab
import com.google.firebase.Timestamp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Date

class CouponsViewModelTest {

    @Test
    fun `test coupon validity and expiration calculation`() {
        val now = System.currentTimeMillis()
        val futureDate = Date(now + 24 * 3600 * 1000L) // +24h
        val pastDate = Date(now - 24 * 3600 * 1000L) // -24h

        val activeCoupon = CouponDomainModel(
            id = "c1",
            code = "DESCUENTO20",
            discountType = CouponDiscountType.PERCENTAGE,
            discountValue = 20.0,
            startsAt = Timestamp(Date(now - 3600 * 1000L)),
            expiresAt = Timestamp(futureDate),
            isActive = true
        )

        val expiredCoupon = CouponDomainModel(
            id = "c2",
            code = "EXPIRADO10",
            discountType = CouponDiscountType.FIXED_AMOUNT,
            discountValue = 10.0,
            startsAt = Timestamp(Date(now - 72 * 3600 * 1000L)),
            expiresAt = Timestamp(pastDate),
            isActive = true
        )

        assertTrue("Cupón activo y dentro de fecha debe ser válido", activeCoupon.isValidNow(now))
        assertFalse("Cupón expirado no debe ser válido", expiredCoupon.isValidNow(now))
        assertTrue("Cupón expirado debe retornar true en isExpired", expiredCoupon.isExpired(now))
        assertTrue("Cupón que vence en 24h debe retornar true en isExpiringSoon", activeCoupon.isExpiringSoon(thresholdMillis = 48 * 3600 * 1000L, currentMillis = now))
    }

    @Test
    fun `test loyalty and personalized detection`() {
        val loyaltyCoupon = CouponDomainModel(
            id = "loyalty1",
            code = "REW-AB12CD",
            discountType = CouponDiscountType.FIXED_AMOUNT,
            discountValue = 50.0,
            customerId = "user123",
            createdBy = "LOYALTY_SYSTEM",
            sourceRewardId = "rew_99"
        )

        val globalCoupon = CouponDomainModel(
            id = "glob1",
            code = "BIENVENIDA",
            discountType = CouponDiscountType.PERCENTAGE,
            discountValue = 15.0,
            customerId = null,
            createdBy = "ADMIN"
        )

        assertTrue("Cupón de fidelidad debe ser detectado como loyalty", loyaltyCoupon.isLoyaltyReward)
        assertTrue("Cupón con customerId o fidelidad debe ser detectado como personalizado", loyaltyCoupon.isPersonalized)
        assertFalse("Cupón global no debe ser de fidelidad", globalCoupon.isLoyaltyReward)
        assertFalse("Cupón global sin customerId no debe ser personalizado", globalCoupon.isPersonalized)
    }

    @Test
    fun `test formatted discount strings in spanish format`() {
        val percentage = CouponDomainModel(
            code = "PCT",
            discountType = CouponDiscountType.PERCENTAGE,
            discountValue = 25.0
        )
        val fixed = CouponDomainModel(
            code = "FIXED",
            discountType = CouponDiscountType.FIXED_AMOUNT,
            discountValue = 100.0
        )
        val freeDelivery = CouponDomainModel(
            code = "FREE",
            discountType = CouponDiscountType.FREE_DELIVERY,
            discountValue = 0.0
        )

        assertEquals("25% OFF", percentage.getFormattedDiscount())
        assertEquals("C$ 100.00 OFF", fixed.getFormattedDiscount())
        assertEquals("Envío Gratis", freeDelivery.getFormattedDiscount())
    }

    @Test
    fun `test category tabs have spanish display names`() {
        assertEquals("Disponibles", CouponCategoryTab.AVAILABLE.displayName)
        assertEquals("Promociones", CouponCategoryTab.PROMOTIONAL.displayName)
        assertEquals("Personalizados", CouponCategoryTab.PERSONALIZED.displayName)
        assertEquals("Usados", CouponCategoryTab.USED.displayName)
        assertEquals("Vencidos", CouponCategoryTab.EXPIRED.displayName)
    }

    @Test
    fun `test smart badges have spanish labels without internal enums`() {
        assertEquals("Disponible", CouponBadgeType.AVAILABLE.label)
        assertEquals("Vence pronto", CouponBadgeType.EXPIRING_SOON.label)
        assertEquals("Fidelidad", CouponBadgeType.LOYALTY.label)
        assertEquals("Solo para ti", CouponBadgeType.PERSONALIZED.label)
        assertEquals("Usado", CouponBadgeType.USED.label)
        assertEquals("Vencido", CouponBadgeType.EXPIRED.label)
    }
}
