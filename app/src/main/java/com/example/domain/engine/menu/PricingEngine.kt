package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuCombo
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.ProductVariant
import com.example.domain.model.menu.SelectedComboSlot
import com.example.domain.model.menu.SelectedOption

/**
 * Contrato Único de Desglose de Precios (PriceBreakdown - Precondición 2)
 */
data class PriceBreakdown(
    val basePrice: Double = 0.0,
    val variantOverridePrice: Double? = null,
    val effectiveItemPrice: Double = 0.0,
    val sizeAdjustment: Double = 0.0,
    val optionsTotal: Double = 0.0,
    val comboDiscount: Double = 0.0,
    val promotionDiscount: Double = 0.0,
    val selectedOptions: List<SelectedOption> = emptyList(),
    val selectedComboSlots: List<SelectedComboSlot> = emptyList(),
    val subtotal: Double = 0.0,
    val taxPercentage: Double = 0.0,
    val taxAmount: Double = 0.0,
    val totalPrice: Double = 0.0
)

interface IPricingEngine {
    fun calculateItemPrice(
        product: MenuProduct,
        variant: ProductVariant? = null,
        optionSelections: Map<MenuOptionGroup, List<MenuOption>> = emptyMap()
    ): PriceBreakdown

    fun calculateComboPrice(
        combo: MenuCombo,
        selectedSlots: List<SelectedComboSlot> = emptyList(),
        taxPercentage: Double = 0.0
    ): PriceBreakdown
}

/**
 * Servidor de Dominio: PricingEngineImpl (Sprint 13B.4C Hardened)
 *
 * UNIFICACIÓN DE CONTRATOS DE PRECIOS:
 * Proporciona un cálculo desacoplado y consolidado para productos individuales y combos reales.
 */
class PricingEngineImpl : IPricingEngine {

    override fun calculateItemPrice(
        product: MenuProduct,
        variant: ProductVariant?,
        optionSelections: Map<MenuOptionGroup, List<MenuOption>>
    ): PriceBreakdown {
        val (effectiveItemPrice, sizeAdjustment) = if (variant?.priceOverride != null) {
            Pair(variant.priceOverride, 0.0)
        } else if (variant?.size != null) {
            val size = variant.size
            val adj = (product.basePrice * (size.priceMultiplier - 1.0)) + size.priceAdjustment
            Pair(product.basePrice, adj)
        } else {
            Pair(product.basePrice, 0.0)
        }

        val allSelectedOptionContracts = mutableListOf<SelectedOption>()
        var optionsTotal = 0.0

        for ((group, selectedOpts) in optionSelections) {
            val contracts = OptionPricingCalculator.calculateSelectedOptions(group, selectedOpts)
            allSelectedOptionContracts.addAll(contracts)
            optionsTotal += contracts.sumOf { it.finalPrice }
        }

        val subtotal = effectiveItemPrice + sizeAdjustment + optionsTotal
        val taxPercentage = product.taxPercentage
        val taxAmount = subtotal * (taxPercentage / 100.0)
        val totalPrice = subtotal + taxAmount

        return PriceBreakdown(
            basePrice = product.basePrice,
            variantOverridePrice = variant?.priceOverride,
            effectiveItemPrice = effectiveItemPrice,
            sizeAdjustment = sizeAdjustment,
            optionsTotal = optionsTotal,
            selectedOptions = allSelectedOptionContracts,
            subtotal = subtotal,
            taxPercentage = taxPercentage,
            taxAmount = taxAmount,
            totalPrice = totalPrice
        )
    }

    override fun calculateComboPrice(
        combo: MenuCombo,
        selectedSlots: List<SelectedComboSlot>,
        taxPercentage: Double
    ): PriceBreakdown {
        val slotExtrasTotal = selectedSlots.sumOf { it.slotExtraPrice }
        val rawComboTotal = combo.basePrice + slotExtrasTotal

        val calculatedDiscount = if (combo.percentageDiscount > 0.0) {
            rawComboTotal * (combo.percentageDiscount / 100.0)
        } else {
            combo.fixedDiscount
        }

        val subtotal = (rawComboTotal - calculatedDiscount).coerceAtLeast(0.0)
        val taxAmount = subtotal * (taxPercentage / 100.0)
        val totalPrice = subtotal + taxAmount

        return PriceBreakdown(
            basePrice = combo.basePrice,
            effectiveItemPrice = combo.basePrice,
            optionsTotal = slotExtrasTotal,
            comboDiscount = calculatedDiscount,
            selectedComboSlots = selectedSlots,
            subtotal = subtotal,
            taxPercentage = taxPercentage,
            taxAmount = taxAmount,
            totalPrice = totalPrice
        )
    }
}
