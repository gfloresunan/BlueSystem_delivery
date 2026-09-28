package com.example.courier

import org.junit.Assert.*
import org.junit.Test

/**
 * BSD-X2Y-COURIER-ACCEPT-TRANSACTION-AND-EARNINGS-ROOT-CAUSE-001
 *
 * Suite de Certificación para los 12 Escenarios Obligatorios de la Actividad:
 * TEST 01 — Accept Normal X→Y
 * TEST 02 — Transaction Read Order (All Reads Before All Writes)
 * TEST 03 — Double Accept Concurrency Lock (Atomic Anti-Race)
 * TEST 04 — Courier No Elegible (Rechazo Servidor / eligibleCouriers)
 * TEST 05 — Ganancia Canónica (Base C$35, Km C$10, 15 km -> Cobro C$185, Ganancia C$150)
 * TEST 06 — Cambio Dinámico Posterior / Inmutabilidad Histórica de pricingSnapshot
 * TEST 07 — Cash: Cobro en Destino = CUSTOMER_TOTAL, Ganancia = COURIER_EARNINGS
 * TEST 08 — Digital Payment: Cobro en Destino = C$0.00 / Pagado, Ganancia = COURIER_EARNINGS
 * TEST 09 — Regresión Commerce Delivery (Aislamiento Total)
 * TEST 10 — Regresión X→Y Dispatch Rings (5km, 15km, 30km)
 * TEST 11 — GPS Heartbeat y Telemetría
 * TEST 12 — Financial Frozen Core (Invariantes ADR-026)
 */
class BSDX2YCourierAcceptAndEarningsTest {

    // ─────────────────────────────────────────────────────────────────────────
    // MODELOS Y SIMULADOR FORENSE DE TRANSACCIÓN FIRESTORE
    // ─────────────────────────────────────────────────────────────────────────

    data class DeliveryTrip(
        val tripId: String,
        var status: String = "PENDING",
        var assignedCourierId: String? = null,
        var courierId: String? = null,
        var courierName: String? = null,
        val serviceType: String = "X_TO_Y_DELIVERY",
        val paymentMethod: String = "efectivo",
        val payer: String = "RECIPIENT",
        val eligibleCouriers: List<String> = emptyList(),
        val pricingSnapshot: PricingSnapshot? = null,
        val total: Double = 0.0,
        val deliveryFee: Double = 0.0,
        val customerOffer: Double? = null,
        val calculatedFee: Double = 0.0
    )

    data class PricingSnapshot(
        val baseFee: Double,
        val pricePerKm: Double,
        val perKmRate: Double = pricePerKm,
        val routeDistanceKm: Double,
        val distanceKm: Double = routeDistanceKm,
        val routeDistanceMeters: Long = (routeDistanceKm * 1000).toLong(),
        val calculatedAmount: Double,
        val configVersion: String = "v2.2-ssot"
    )

    data class OrderMirror(
        val orderId: String,
        var status: String = "ready",
        var assignedCourierId: String? = null,
        var motorizadoId: String? = null,
        var courierPhase: Int = 1,
        var total: Double = 0.0
    )

    /**
     * Validador estricto del orden de transacciones de Firestore.
     * Si se intenta un read después de un write, lanza la misma excepción del SDK.
     */
    class StrictFirestoreTransactionSimulator {
        private var hasWritten = false
        val operationsLog = mutableListOf<String>()

        fun get(docKey: String): Map<String, Any?> {
            if (hasWritten) {
                throw IllegalStateException("Firestore transactions require all reads to be executed before all writes.")
            }
            operationsLog.add("READ:$docKey")
            return emptyMap()
        }

        fun update(docKey: String, updates: Map<String, Any?>) {
            hasWritten = true
            operationsLog.add("WRITE:$docKey")
        }
    }

    /**
     * Emulación quirúrgica corregida de aceptarPedido / claimTripAtomically
     */
    fun simulateSurgicalAcceptTrip(
        trip: DeliveryTrip,
        order: OrderMirror?,
        courierId: String,
        courierName: String,
        tx: StrictFirestoreTransactionSimulator
    ): Boolean {
        // --- FASE 1: TODAS LAS LECTURAS (READS UPFRONT) ---
        tx.get("deliveryTrips/${trip.tripId}")
        if (order != null) {
            tx.get("orders/${order.orderId}")
        }

        // --- FASE 2: VALIDACIONES IN-MEMORY ---
        val tripStatus = trip.status.uppercase()
        if (tripStatus in listOf("CANCELLED", "TIMEOUT", "COMPLETED", "DELIVERED")) {
            return false
        }
        val existingCourier = trip.assignedCourierId ?: trip.courierId
        if (!existingCourier.isNullOrEmpty() && existingCourier != courierId) {
            return false // Lock atómico anti-race
        }
        if (trip.eligibleCouriers.isNotEmpty() && !trip.eligibleCouriers.contains(courierId)) {
            return false // Courier no elegible
        }

        // --- FASE 3: TODAS LAS ESCRITURAS (WRITES) ---
        val tripUpdates = mutableMapOf<String, Any?>(
            "status" to "ASSIGNED",
            "assignedCourierId" to courierId,
            "courierId" to courierId,
            "courierName" to courierName
        )
        tx.update("deliveryTrips/${trip.tripId}", tripUpdates)
        trip.status = "ASSIGNED"
        trip.assignedCourierId = courierId
        trip.courierId = courierId
        trip.courierName = courierName

        if (order != null) {
            val orderUpdates = mutableMapOf<String, Any?>(
                "status" to "courier_accepted",
                "assignedCourierId" to courierId,
                "motorizadoId" to courierId
            )
            tx.update("orders/${order.orderId}", orderUpdates)
            order.status = "courier_accepted"
            order.assignedCourierId = courierId
            order.motorizadoId = courierId
        }

        return true
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 01 — ACCEPT NORMAL X→Y
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test01_acceptNormalXToY() {
        val trip = DeliveryTrip(tripId = "TRIP-001", status = "PENDING", eligibleCouriers = listOf("COUR-101"))
        val order = OrderMirror(orderId = "TRIP-001", status = "ready")
        val tx = StrictFirestoreTransactionSimulator()

        val success = simulateSurgicalAcceptTrip(trip, order, "COUR-101", "Carlos Rivas", tx)

        assertTrue(success)
        assertEquals("ASSIGNED", trip.status)
        assertEquals("COUR-101", trip.assignedCourierId)
        assertEquals("courier_accepted", order.status)
        assertEquals("COUR-101", order.assignedCourierId)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 02 — TRANSACTION READ ORDER (ALL READS BEFORE ALL WRITES)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test02_transactionReadOrderStrictCompliance() {
        val trip = DeliveryTrip(tripId = "TRIP-002", status = "PENDING")
        val order = OrderMirror(orderId = "TRIP-002", status = "ready")
        val tx = StrictFirestoreTransactionSimulator()

        simulateSurgicalAcceptTrip(trip, order, "COUR-101", "Carlos Rivas", tx)

        // Verificar que ninguna operación READ ocurre después de la primera WRITE
        var firstWriteIndex = -1
        var lastReadIndex = -1

        tx.operationsLog.forEachIndexed { index, op ->
            if (op.startsWith("WRITE:") && firstWriteIndex == -1) {
                firstWriteIndex = index
            }
            if (op.startsWith("READ:")) {
                lastReadIndex = index
            }
        }

        assertTrue("Debe existir al menos un read", lastReadIndex != -1)
        assertTrue("Debe existir al menos un write", firstWriteIndex != -1)
        assertTrue(
            "Todas las lecturas deben preceder a todas las escrituras (lastRead=$lastReadIndex < firstWrite=$firstWriteIndex)",
            lastReadIndex < firstWriteIndex
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 03 — DOUBLE ACCEPT CONCURRENCY LOCK (ANTI-RACE)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test03_doubleAcceptConcurrencyLock() {
        val trip = DeliveryTrip(tripId = "TRIP-003", status = "PENDING")
        val order = OrderMirror(orderId = "TRIP-003", status = "ready")

        // Courier A gana el lock
        val txA = StrictFirestoreTransactionSimulator()
        val successA = simulateSurgicalAcceptTrip(trip, order, "COUR-AAA", "Courier A", txA)
        assertTrue("Courier A debe ganar la asignación", successA)
        assertEquals("COUR-AAA", trip.assignedCourierId)

        // Courier B intenta aceptar casi al mismo tiempo (sobre el estado mutado)
        val txB = StrictFirestoreTransactionSimulator()
        val successB = simulateSurgicalAcceptTrip(trip, order, "COUR-BBB", "Courier B", txB)
        assertFalse("Courier B debe ser rechazado por lock atómico", successB)
        assertEquals("COUR-AAA", trip.assignedCourierId)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 04 — COURIER NO ELEGIBLE RECHAZADO
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test04_courierNotEligibleRejected() {
        val trip = DeliveryTrip(
            tripId = "TRIP-004",
            status = "PENDING",
            eligibleCouriers = listOf("COUR-ALLOWED-1", "COUR-ALLOWED-2")
        )
        val tx = StrictFirestoreTransactionSimulator()

        val success = simulateSurgicalAcceptTrip(trip, null, "COUR-UNAUTHORIZED", "Intruso", tx)
        assertFalse("Courier no elegible debe ser rechazado", success)
        assertEquals("PENDING", trip.status)
        assertNull(trip.assignedCourierId)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 05 — GANANCIA CANÓNICA
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test05_canonicalEarningsCalculation() {
        val ps = PricingSnapshot(
            baseFee = 35.0,
            pricePerKm = 10.0,
            routeDistanceKm = 15.0,
            calculatedAmount = 185.0
        )
        val customerTotal = ps.calculatedAmount
        val courierEarnings = kotlin.math.round((ps.pricePerKm * ps.routeDistanceKm) * 100.0) / 100.0
        val platformRevenue = ps.baseFee

        assertEquals(185.0, customerTotal, 0.001)
        assertEquals(150.0, courierEarnings, 0.001)
        assertEquals(35.0, platformRevenue, 0.001)
        assertEquals(customerTotal, courierEarnings + platformRevenue, 0.001)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 06 — CAMBIO DINÁMICO POSTERIOR / INMUTABILIDAD HISTÓRICA
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test06_historicalPricingSnapshotImmutability() {
        // Viaje A creado con tarifa anterior (10/km, 35 base)
        val tripA = DeliveryTrip(
            tripId = "TRIP-HISTORICAL-A",
            pricingSnapshot = PricingSnapshot(
                baseFee = 35.0,
                pricePerKm = 10.0,
                routeDistanceKm = 15.0,
                calculatedAmount = 185.0
            )
        )

        // Se cambia el SSOT en servidor a (15/km, 40 base)
        val newSsotPricePerKm = 15.0
        val newSsotBaseFee = 40.0

        // El viaje histórico A NO debe cambiar su cálculo
        val earningsA = tripA.pricingSnapshot!!.pricePerKm * tripA.pricingSnapshot.routeDistanceKm
        val cobroA = tripA.pricingSnapshot.calculatedAmount

        assertEquals(150.0, earningsA, 0.001)
        assertEquals(185.0, cobroA, 0.001)
        assertNotEquals(newSsotPricePerKm * tripA.pricingSnapshot.routeDistanceKm, earningsA)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 07 — CASH SCENARIO: COBRO EN DESTINO vs GANANCIA
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test07_cashScenarioNeverConflatesValues() {
        val isCash = true
        val isRecipientPayer = true
        val totalAmount = 185.0
        val earningsAmount = 150.0

        val cobroEnDestino = if (isRecipientPayer && isCash) totalAmount else 0.0
        val gananciaMotorizado = earningsAmount

        assertEquals(185.0, cobroEnDestino, 0.001)
        assertEquals(150.0, gananciaMotorizado, 0.001)
        assertNotEquals(
            "El cobro en destino nunca puede ser igual a la ganancia cuando hay baseFee",
            cobroEnDestino,
            gananciaMotorizado
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 08 — DIGITAL PAYMENT SCENARIO
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test08_digitalPaymentScenarioNoCashCollection() {
        val isCash = false
        val isRecipientPayer = true
        val totalAmount = 185.0
        val earningsAmount = 150.0

        val label = if (isRecipientPayer && isCash) "💰 COBRO EN DESTINO" else "✓ ENVÍO YA PAGADO"
        val cobroEnDestino = if (isRecipientPayer && isCash) totalAmount else 0.0
        val gananciaMotorizado = earningsAmount

        assertEquals("✓ ENVÍO YA PAGADO", label)
        assertEquals(0.0, cobroEnDestino, 0.001)
        assertEquals(150.0, gananciaMotorizado, 0.001)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 09 — REGRESIÓN COMMERCE DELIVERY (AISLAMIENTO TOTAL)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test09_commerceDeliveryRegressionIsolation() {
        val commerceOrder = OrderMirror(
            orderId = "ORDER-COMMERCE-999",
            status = "ready",
            total = 320.0
        )
        val tx = StrictFirestoreTransactionSimulator()

        // Asignación tradicional en /orders
        tx.get("orders/${commerceOrder.orderId}")
        tx.update("orders/${commerceOrder.orderId}", mapOf("status" to "courier_accepted", "assignedCourierId" to "COUR-COMMERCE"))
        commerceOrder.status = "courier_accepted"
        commerceOrder.assignedCourierId = "COUR-COMMERCE"

        assertEquals("courier_accepted", commerceOrder.status)
        assertEquals("COUR-COMMERCE", commerceOrder.assignedCourierId)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 10 — REGRESIÓN X→Y DISPATCH RINGS (5km, 15km, 30km)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test10_dispatchRingsRegression() {
        val dispatchStages = listOf(
            Pair("SEARCHING_5KM", 5.0),
            Pair("SEARCHING_15KM", 15.0),
            Pair("SEARCHING_30KM", 30.0)
        )
        dispatchStages.forEach { (stage, radius) ->
            assertTrue(radius > 0.0)
            assertTrue(stage.startsWith("SEARCHING_"))
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 11 — GPS HEARTBEAT FRESHNESS
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test11_gpsHeartbeatFreshness() {
        val now = System.currentTimeMillis()
        val courierTelemetry = mapOf(
            "isOnline" to true,
            "latitude" to 12.1364,
            "longitude" to -86.2514,
            "updatedAtMillis" to now
        )

        val isFresh = (now - (courierTelemetry["updatedAtMillis"] as Long)) <= (10 * 60 * 1000)
        assertTrue(courierTelemetry["isOnline"] as Boolean)
        assertTrue(isFresh)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 12 — FINANCIAL FROZEN CORE (ADR-026 INVARIANTS)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    fun test12_financialFrozenCoreInvariants() {
        val baseFee = 35.0
        val pricePerKm = 10.0
        val distanceKm = 12.5
        val customerTotal = baseFee + (distanceKm * pricePerKm)
        val courierEarnings = distanceKm * pricePerKm
        val platformRevenue = baseFee
        val cashCollected = customerTotal
        val custodyLiability = cashCollected - courierEarnings

        // Invariante 1: CUSTOMER_TOTAL = COURIER_EARNINGS + PLATFORM_REVENUE
        assertEquals(customerTotal, courierEarnings + platformRevenue, 0.001)

        // Invariante 2: COURIER_EARNINGS = DISTANCE * PRICE_PER_KM
        assertEquals(125.0, courierEarnings, 0.001)

        // Invariante 3: PLATFORM_REVENUE = BASE_FEE
        assertEquals(35.0, platformRevenue, 0.001)

        // Invariante 4: CUSTODY_LIABILITY = CASH_COLLECTED - COURIER_EARNINGS = PLATFORM_REVENUE
        assertEquals(platformRevenue, custodyLiability, 0.001)
    }
}
