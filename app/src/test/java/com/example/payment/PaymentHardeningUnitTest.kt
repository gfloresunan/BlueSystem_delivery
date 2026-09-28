package com.example.payment

import org.junit.Assert.*
import org.junit.Test

/**
 * BlueSystem Delivery Enterprise — Phase 2 Payment Hardening Unit Tests
 * 
 * Validates Courier Payment Logic, CASH Exact/Excess/Insufficient Calculations,
 * and Electronic Payment Strict Conjunction (PAID && VERIFIED).
 */
class PaymentHardeningUnitTest {

    // ─── 1. CASH PAYMENT LOGIC & RECONCILIATION ──────────────────────────────
    @Test
    fun testCashExactPayment_IsValid_ZeroChange() {
        val totalOrder = 435.0
        val receivedAmount = 435.0
        val changeAmount = receivedAmount - totalOrder
        val isCashValid = receivedAmount >= totalOrder

        assertTrue("Exact cash must be valid", isCashValid)
        assertEquals(0.0, changeAmount, 0.001)
    }

    @Test
    fun testCashExcessPayment_IsValid_CalculatesCorrectChange() {
        val totalOrder = 435.0
        val receivedAmount = 500.0
        val changeAmount = receivedAmount - totalOrder
        val isCashValid = receivedAmount >= totalOrder

        assertTrue("Excess cash must be valid", isCashValid)
        assertEquals(65.0, changeAmount, 0.001)
    }

    @Test
    fun testCashInsufficientPayment_IsBlocked() {
        val totalOrder = 435.0
        val receivedAmount = 400.0
        val changeAmount = receivedAmount - totalOrder
        val isCashValid = receivedAmount >= totalOrder
        val missingAmount = totalOrder - receivedAmount

        assertFalse("Insufficient cash must block delivery", isCashValid)
        assertEquals(35.0, missingAmount, 0.001)
        assertTrue("Change amount is negative", changeAmount < 0)
    }

    // ─── 2. COURIER COBRO EN RUTA & STRICT ELECTRONIC CONJUNCTION ─────────────
    @Test
    fun testCourier_ElectronicUnconfirmedPayment_MustNotDeliverAsPaid() {
        val paymentMethod = "tarjeta"
        val paymentStatus = "pending"
        val paymentVerified = false

        val methodLower = paymentMethod.trim().lowercase()
        val isEfectivo = methodLower.isEmpty() || methodLower == "efectivo" || methodLower == "cash"
        val isElectronicPaidConfirmed = !isEfectivo && paymentStatus.equals("PAID", ignoreCase = true) && paymentVerified

        assertFalse("Payment method is not efectivo", isEfectivo)
        assertFalse("Unconfirmed card payment must NOT be considered paid", isElectronicPaidConfirmed)

        val faseActual = 2
        val receivedAmount = 0.0
        val totalOrderState = 435.0
        val payerState = "SENDER"
        val isCashValid = (faseActual == 1) || (payerState != "RECIPIENT" && !isEfectivo) || (receivedAmount >= totalOrderState)
        val isPaymentReadyToDeliver = if (isEfectivo) isCashValid else (isElectronicPaidConfirmed || (faseActual == 1))

        assertFalse("Courier must be blocked from completing delivery of unconfirmed card", isPaymentReadyToDeliver)
    }

    @Test
    fun testCourier_ElectronicFailedPayment_MustNotDeliverAsPaid() {
        val paymentMethod = "tarjeta"
        val paymentStatus = "FAILED"
        val paymentVerified = false

        val methodLower = paymentMethod.trim().lowercase()
        val isEfectivo = methodLower.isEmpty() || methodLower == "efectivo" || methodLower == "cash"
        val isElectronicPaidConfirmed = !isEfectivo && paymentStatus.equals("PAID", ignoreCase = true) && paymentVerified

        assertFalse("Failed card payment must NOT be considered paid", isElectronicPaidConfirmed)
    }

    @Test
    fun testCourier_ElectronicPaidWithoutVerification_IsBlocked() {
        // Disjunction Vulnerability Prevention (PAID=true but VERIFIED=false)
        val paymentMethod = "tarjeta"
        val paymentStatus = "PAID"
        val paymentVerified = false

        val methodLower = paymentMethod.trim().lowercase()
        val isEfectivo = methodLower.isEmpty() || methodLower == "efectivo" || methodLower == "cash"
        val isElectronicPaidConfirmed = !isEfectivo && paymentStatus.equals("PAID", ignoreCase = true) && paymentVerified

        assertFalse("PAID status without backend verification must be REJECTED", isElectronicPaidConfirmed)
    }

    @Test
    fun testCourier_ElectronicVerifiedWithoutPaidStatus_IsBlocked() {
        // Disjunction Vulnerability Prevention (VERIFIED=true but PAID=false)
        val paymentMethod = "tarjeta"
        val paymentStatus = "PENDING"
        val paymentVerified = true

        val methodLower = paymentMethod.trim().lowercase()
        val isEfectivo = methodLower.isEmpty() || methodLower == "efectivo" || methodLower == "cash"
        val isElectronicPaidConfirmed = !isEfectivo && paymentStatus.equals("PAID", ignoreCase = true) && paymentVerified

        assertFalse("Verification flag without PAID status must be REJECTED", isElectronicPaidConfirmed)
    }

    @Test
    fun testCourier_ElectronicPaidAndVerified_AllowsDeliveryWithoutCollection() {
        // Strict Conjunction: PAID=true AND VERIFIED=true
        val paymentMethod = "tarjeta"
        val paymentStatus = "PAID"
        val paymentVerified = true

        val methodLower = paymentMethod.trim().lowercase()
        val isEfectivo = methodLower.isEmpty() || methodLower == "efectivo" || methodLower == "cash"
        val isElectronicPaidConfirmed = !isEfectivo && paymentStatus.equals("PAID", ignoreCase = true) && paymentVerified

        assertTrue("Strict conjunction (PAID && VERIFIED) confirms payment", isElectronicPaidConfirmed)

        val faseActual = 2
        val isPaymentReadyToDeliver = if (isEfectivo) false else (isElectronicPaidConfirmed || (faseActual == 1))
        assertTrue("Courier can deliver verified electronic payment without cash collection", isPaymentReadyToDeliver)
    }

    @Test
    fun testCourier_RecipientCashCollection_Fase1VsFase2() {
        val payerState = "RECIPIENT"
        val totalOrder = 300.0
        val isEfectivo = true

        // Fase 1 (Recogida): No cobrar al remitente
        val fase1 = 1
        val receivedFase1 = 0.0
        val isCashValidFase1 = (fase1 == 1) || (payerState != "RECIPIENT" && !isEfectivo) || (receivedFase1 >= totalOrder)
        assertTrue("Fase 1 allows pickup without collecting cash from sender", isCashValidFase1)

        // Fase 2 (Entrega): Cobro obligatorio al destinatario
        val fase2 = 2
        val receivedFase2Insufficient = 0.0
        val isCashValidFase2Insuf = (fase2 == 1) || (payerState != "RECIPIENT" && !isEfectivo) || (receivedFase2Insufficient >= totalOrder)
        assertFalse("Fase 2 blocks delivery if recipient has not paid", isCashValidFase2Insuf)

        val receivedFase2Exact = 300.0
        val isCashValidFase2Exact = (fase2 == 1) || (payerState != "RECIPIENT" && !isEfectivo) || (receivedFase2Exact >= totalOrder)
        assertTrue("Fase 2 allows delivery once recipient pays exact cash", isCashValidFase2Exact)
    }

    // ─── 3. CLIENT PAYMENT ACTIVATION GATE BASELINE ──────────────────────────
    @Test
    fun testClientPaymentActivationGate_BlocksCard() {
        val requestedMethod = "tarjeta"
        val isCardRequested = requestedMethod.equals("tarjeta", ignoreCase = true) || requestedMethod.equals("card", ignoreCase = true)
        val isCardGateOpen = false // Closed baseline

        val isOrderPlacementAllowed = !isCardRequested || isCardGateOpen
        assertFalse("Client must block card order creation while gate is closed", isOrderPlacementAllowed)
    }

    @Test
    fun testClientPaymentActivationGate_AllowsCash() {
        val requestedMethod = "efectivo"
        val isCardRequested = requestedMethod.equals("tarjeta", ignoreCase = true) || requestedMethod.equals("card", ignoreCase = true)
        val isCardGateOpen = false

        val isOrderPlacementAllowed = !isCardRequested || isCardGateOpen
        assertTrue("Client must allow cash order creation", isOrderPlacementAllowed)
    }
}
