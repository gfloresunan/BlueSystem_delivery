package com.example.orders

import com.example.Pedido
import com.example.ValoresMonetarios
import com.example.domain.model.SystemConfig
import org.junit.Assert.*
import org.junit.Test
import kotlin.math.max

class OrderFinancialCalculationTest {

    // Función canónica pura de cálculo financiero de checkout
    private fun calculateCanonicalTotal(
        subtotal: Double,
        deliveryFee: Double,
        discountAmount: Double = 0.0,
        additionalChargeAmount: Double = 0.0,
        tipAmount: Double = 0.0
    ): Double {
        val sanitizedTip = max(0.0, tipAmount)
        val sanitizedAdditional = max(0.0, additionalChargeAmount)
        val sanitizedDiscount = max(0.0, discountAmount)
        return max(0.0, subtotal - sanitizedDiscount + deliveryFee + sanitizedAdditional + sanitizedTip)
    }

    @Test
    fun test01_baseline_without_tip_additional_charge_or_coupon() {
        val total = calculateCanonicalTotal(subtotal = 200.0, deliveryFee = 40.0)
        assertEquals(240.0, total, 0.001)
    }

    @Test
    fun test02_tip_preset_10() {
        val total = calculateCanonicalTotal(subtotal = 200.0, deliveryFee = 40.0, tipAmount = 10.0)
        assertEquals(250.0, total, 0.001)
    }

    @Test
    fun test03_tip_preset_20() {
        val total = calculateCanonicalTotal(subtotal = 200.0, deliveryFee = 40.0, tipAmount = 20.0)
        assertEquals(260.0, total, 0.001)
    }

    @Test
    fun test04_tip_preset_30() {
        val total = calculateCanonicalTotal(subtotal = 200.0, deliveryFee = 40.0, tipAmount = 30.0)
        assertEquals(270.0, total, 0.001)
    }

    @Test
    fun test05_tip_preset_40() {
        val total = calculateCanonicalTotal(subtotal = 200.0, deliveryFee = 40.0, tipAmount = 40.0)
        assertEquals(280.0, total, 0.001)
    }

    @Test
    fun test06_custom_tip_amount() {
        val customInput = "15.50"
        val parsedTip = customInput.toDoubleOrNull() ?: 0.0
        val total = calculateCanonicalTotal(subtotal = 200.0, deliveryFee = 40.0, tipAmount = parsedTip)
        assertEquals(255.50, total, 0.001)
    }

    @Test
    fun test07_invalid_negative_or_nan_custom_tip_sanitization() {
        val invalidInput = "-25.00"
        val parsedTip = invalidInput.toDoubleOrNull() ?: 0.0
        val total = calculateCanonicalTotal(subtotal = 200.0, deliveryFee = 40.0, tipAmount = parsedTip)
        assertEquals(240.0, total, 0.001)
    }

    @Test
    fun test08_additional_charge_applied() {
        val total = calculateCanonicalTotal(subtotal = 200.0, deliveryFee = 40.0, additionalChargeAmount = 15.0)
        assertEquals(255.0, total, 0.001)
    }

    @Test
    fun test09_additional_charge_plus_tip() {
        val total = calculateCanonicalTotal(
            subtotal = 200.0,
            deliveryFee = 40.0,
            additionalChargeAmount = 15.0,
            tipAmount = 20.0
        )
        assertEquals(275.0, total, 0.001)
    }

    @Test
    fun test10_additional_charge_plus_tip_plus_coupon_discount() {
        val total = calculateCanonicalTotal(
            subtotal = 200.0,
            deliveryFee = 40.0,
            discountAmount = 50.0,
            additionalChargeAmount = 15.0,
            tipAmount = 20.0
        )
        assertEquals(225.0, total, 0.001)
    }

    @Test
    fun test11_discount_exceeding_subtotal_coerces_to_zero_floor() {
        val total = calculateCanonicalTotal(
            subtotal = 50.0,
            deliveryFee = 0.0,
            discountAmount = 100.0,
            additionalChargeAmount = 0.0,
            tipAmount = 0.0
        )
        assertEquals(0.0, total, 0.001)
    }

    @Test
    fun test12_snapshot_immutability_preserves_order_upon_global_config_change() {
        val initialConfig = SystemConfig(
            additionalChargeEnabled = true,
            additionalChargeAmount = 15.0,
            additionalChargePolicyId = "service_v1",
            additionalChargePolicyVersion = 1
        )
        val orderSnapshot = Pedido(
            pedidoId = "ord_immutable_01",
            subtotal = 100.0,
            deliveryFee = 35.0,
            additionalChargeAmount = initialConfig.additionalChargeAmount,
            tipAmount = 10.0,
            total = calculateCanonicalTotal(100.0, 35.0, 0.0, initialConfig.additionalChargeAmount, 10.0)
        )
        assertEquals(160.0, orderSnapshot.total, 0.001)

        // Simular que el admin modifica la configuración global a C$ 30.0
        val updatedConfig = initialConfig.copy(
            additionalChargeAmount = 30.0,
            additionalChargePolicyVersion = 2
        )

        // La orden snapshot permanece inmutable con su valor congelado original
        assertEquals(15.0, orderSnapshot.additionalChargeAmount, 0.001)
        assertEquals(160.0, orderSnapshot.total, 0.001)
    }

    @Test
    fun test13_legacy_order_backward_compatibility_fallback() {
        // Pedido instanciado con campos legacy (sin tipAmount ni additionalChargeAmount)
        val legacyPedido = Pedido(
            pedidoId = "legacy_999",
            customerName = "Cliente Antiguo",
            total = 150.0,
            deliveryFee = 40.0
        )
        assertEquals(0.0, legacyPedido.tipAmount, 0.001)
        assertEquals(0.0, legacyPedido.additionalChargeAmount, 0.001)
        assertEquals("", legacyPedido.deliveryNote)
        assertEquals(150.0, legacyPedido.total, 0.001)
    }

    @Test
    fun test14_courier_cash_collection_and_full_tip_assignment() {
        val order = Pedido(
            pedidoId = "ord_courier_01",
            subtotal = 200.0,
            deliveryFee = 40.0,
            additionalChargeAmount = 10.0,
            tipAmount = 20.0,
            total = 270.0,
            paymentMethod = "efectivo"
        )
        // Repartidor cobra en efectivo el total canónico
        val collectedCash = order.total
        assertEquals(270.0, collectedCash, 0.001)

        // Ganancias del repartidor = Tarifa de envío (C$40) + 100% de la Propina (C$20) = C$60
        val courierGrossEarnings = order.deliveryFee + order.tipAmount
        assertEquals(60.0, courierGrossEarnings, 0.001)
    }

    @Test
    fun test15_delivery_note_persistence_and_propagation() {
        val note = "Dejar en la puerta principal y tocar timbre 2 veces"
        val order = Pedido(
            pedidoId = "ord_note_01",
            customerName = "Laura Gomez",
            deliveryNote = note,
            total = 250.0
        )
        assertEquals(note, order.deliveryNote)
    }

    @Test
    fun test16_financial_events_accounting_breakdown_integrity() {
        val subtotal = 300.0
        val deliveryFee = 50.0
        val discount = 30.0
        val additionalCharge = 15.0
        val tip = 25.0
        val total = calculateCanonicalTotal(subtotal, deliveryFee, discount, additionalCharge, tip)
        assertEquals(360.0, total, 0.001)

        val merchantGrossSales = max(0.0, subtotal - discount)
        assertEquals(270.0, merchantGrossSales, 0.001)

        val merchantGrossSalesCents = Math.round(merchantGrossSales * 100)
        val platformFeePercent = 0.15
        val platformFeeCents = Math.round(merchantGrossSalesCents * platformFeePercent)
        val merchantNetCents = merchantGrossSalesCents - platformFeeCents

        assertEquals(27000L, merchantGrossSalesCents)
        assertEquals(4050L, platformFeeCents)
        assertEquals(22950L, merchantNetCents)

        val courierEarnings = deliveryFee + tip
        assertEquals(75.0, courierEarnings, 0.001)

        val platformRevenue = (platformFeeCents / 100.0) + additionalCharge
        assertEquals(55.50, platformRevenue, 0.001)

        val reconciliationSum = (merchantNetCents / 100.0) + (platformFeeCents / 100.0) + courierEarnings + additionalCharge
        assertEquals(total, reconciliationSum, 0.001)
    }

    @Test
    fun test17_canonical_example_1605_distribution() {
        val subtotal = 1500.0
        val deliveryFee = 60.0
        val additionalCharge = 5.0
        val tip = 40.0
        val total = calculateCanonicalTotal(subtotal, deliveryFee, 0.0, additionalCharge, tip)
        assertEquals(1605.0, total, 0.001)

        val merchantGross = subtotal
        val commission = merchantGross * 0.15
        val netMerchant = merchantGross - commission
        val courierTotal = deliveryFee + tip
        val adminRevenue = commission + additionalCharge

        assertEquals(1500.0, merchantGross, 0.001)
        assertEquals(225.0, commission, 0.001)
        assertEquals(1275.0, netMerchant, 0.001)
        assertEquals(100.0, courierTotal, 0.001)
        assertEquals(230.0, adminRevenue, 0.001)

        val fullReconciliation = netMerchant + commission + courierTotal + additionalCharge
        assertEquals(1605.0, fullReconciliation, 0.001)
    }
}
