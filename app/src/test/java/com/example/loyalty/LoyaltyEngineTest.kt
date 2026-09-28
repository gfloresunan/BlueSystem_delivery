package com.example.loyalty

import com.example.domain.model.loyalty.*
import com.example.presentation.customer.loyalty.LoyaltyViewModel
import com.google.firebase.Timestamp
import org.junit.Assert.*
import org.junit.Test
import java.util.Date

/**
 * Unit tests for BlueSystem Delivery Enterprise Loyalty & Tier System.
 */
class LoyaltyEngineTest {

    private val testLevels = listOf(
        LoyaltyLevel("bronce", "Bronce", "Nivel inicial", 0, 499, listOf("10 pts por pedido"), "🥉", 1),
        LoyaltyLevel("plata", "Plata", "Cliente recurrente", 500, 999, listOf("5% descuento"), "🥈", 2),
        LoyaltyLevel("oro", "Oro", "Cliente preferencial", 1000, 1999, listOf("Atención VIP"), "🥇", 3),
        LoyaltyLevel("platino", "Platino", "Cliente VIP", 2000, 4999, listOf("Delivery gratis"), "🏆", 4),
        LoyaltyLevel("diamante", "Diamante", "Cliente Elite", 5000, 0, listOf("Beneficios ilimitados"), "💎", 5)
    )

    @Test
    fun testRewardAvailabilityStatus_AvailableWhenPointsSufficient() {
        val reward = LoyaltyReward(
            id = "rew1",
            name = "C$50 Descuento",
            pointsCost = 50,
            scope = "GLOBAL",
            active = true
        )

        val (status, label) = reward.getAvailabilityStatus(userAvailablePoints = 100)
        assertEquals(RewardAvailabilityStatus.AVAILABLE, status)
        assertEquals("Puedes canjear", label)
    }

    @Test
    fun testRewardAvailabilityStatus_InsufficientPointsCalculatesMissing() {
        val reward = LoyaltyReward(
            id = "rew1",
            name = "C$100 Descuento",
            pointsCost = 100,
            scope = "GLOBAL",
            active = true
        )

        val (status, label) = reward.getAvailabilityStatus(userAvailablePoints = 40)
        assertEquals(RewardAvailabilityStatus.INSUFFICIENT_POINTS, status)
        assertEquals("Te faltan 60 pts", label)
    }

    @Test
    fun testRewardAvailabilityStatus_MerchantSpecificScope() {
        val reward = LoyaltyReward(
            id = "rew_fritoni",
            name = "C$50 Descuento Fritoni",
            pointsCost = 50,
            scope = "MERCHANT_SPECIFIC",
            businessId = "fritoni",
            active = true
        )

        // Global points is 100, but Fritoni points is only 20
        val (status, label) = reward.getAvailabilityStatus(
            userAvailablePoints = 100,
            merchantPoints = 20
        )
        assertEquals(RewardAvailabilityStatus.INSUFFICIENT_POINTS, status)
        assertEquals("Te faltan 30 pts", label)

        // Now Fritoni points is 50 -> Available
        val (statusOk, labelOk) = reward.getAvailabilityStatus(
            userAvailablePoints = 100,
            merchantPoints = 50
        )
        assertEquals(RewardAvailabilityStatus.AVAILABLE, statusOk)
        assertEquals("Puedes canjear", labelOk)
    }

    @Test
    fun testTierProgression_BasedOnLifetimePointsEarned() {
        // Customer earned 2,000 pts total (Platino), but redeemed 1,500 and has only 500 available
        val lifetimeEarned = 2000

        val result = LoyaltyViewModel.calculateTierProgression(lifetimeEarned, testLevels)

        assertEquals("Platino", result.currentLevel.name)
        assertEquals("Diamante", result.nextLevel?.name)
        assertEquals(3000, result.pointsRemaining) // 5000 - 2000
    }

    @Test
    fun testTierProgression_ProgressionAtBoundaries() {
        val bronze = LoyaltyViewModel.calculateTierProgression(0, testLevels)
        assertEquals("Bronce", bronze.currentLevel.name)
        assertEquals("Plata", bronze.nextLevel?.name)
        assertEquals(500, bronze.pointsRemaining)

        val gold = LoyaltyViewModel.calculateTierProgression(1500, testLevels)
        assertEquals("Oro", gold.currentLevel.name)
        assertEquals("Platino", gold.nextLevel?.name)
        assertEquals(500, gold.pointsRemaining) // 2000 - 1500

        val diamond = LoyaltyViewModel.calculateTierProgression(6000, testLevels)
        assertEquals("Diamante", diamond.currentLevel.name)
        assertNull(diamond.nextLevel)
        assertEquals(0, diamond.pointsRemaining)
    }

    @Test
    fun testComboReward_AvailabilityAndComponentParsing() {
        val combo = LoyaltyReward(
            id = "combo_super_pack",
            name = "🎁 Super Combo Hamburguesa & Delivery",
            description = "Hamburguesa doble + Delivery gratis",
            pointsCost = 150,
            rewardType = "COMBO",
            scope = "GLOBAL",
            comboItems = listOf(
                LoyaltyComboItem(type = "PRODUCT", productId = "prod_1", productName = "Hamburguesa Doble", quantity = 1),
                LoyaltyComboItem(type = "FREE_DELIVERY")
            ),
            active = true
        )

        assertEquals("COMBO", combo.rewardType)
        assertEquals(2, combo.comboItems.size)
        assertEquals("PRODUCT", combo.comboItems[0].type)
        assertEquals("Hamburguesa Doble", combo.comboItems[0].productName)
        assertEquals("FREE_DELIVERY", combo.comboItems[1].type)

        // Status check
        val (statusInsufficient, labelInsufficient) = combo.getAvailabilityStatus(userAvailablePoints = 100)
        assertEquals(RewardAvailabilityStatus.INSUFFICIENT_POINTS, statusInsufficient)
        assertEquals("Te faltan 50 pts", labelInsufficient)

        val (statusOk, labelOk) = combo.getAvailabilityStatus(userAvailablePoints = 200)
        assertEquals(RewardAvailabilityStatus.AVAILABLE, statusOk)
        assertEquals("Puedes canjear", labelOk)
    }

    @Test
    fun testBackwardCompatibility_ExistingRewardTypesUnchanged() {
        val fixed = LoyaltyReward(id = "r1", rewardType = "FIXED_DISCOUNT", pointsCost = 50, discountValue = 50.0)
        val percent = LoyaltyReward(id = "r2", rewardType = "PERCENTAGE_DISCOUNT", pointsCost = 100, discountValue = 15.0)
        val delivery = LoyaltyReward(id = "r3", rewardType = "FREE_DELIVERY", pointsCost = 30)

        assertEquals("FIXED_DISCOUNT", fixed.rewardType)
        assertEquals(0, fixed.comboItems.size)
        assertEquals("PERCENTAGE_DISCOUNT", percent.rewardType)
        assertEquals("FREE_DELIVERY", delivery.rewardType)
    }
}
