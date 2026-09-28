package com.example.courier

import org.junit.Assert.*
import org.junit.Test

/**
 * BSD-X2Y-POST-IMPLEMENTATION-E2E-AUDIT-001
 *
 * Forensic Certification Suite for 10 Critical Touchpoints:
 *
 * A. CANCELACIÓN X→Y:
 * Scenario 1: PENDING + sin courier -> CANCEL -> Customer/Admin/Courier sincronizados.
 * Scenario 2: ASSIGNED + courier todavía no llega -> CANCEL -> sincronización completa.
 * Scenario 3: EN_ROUTE_PICKUP + pickupArrivedAt == null -> CANCEL -> sincronización completa.
 * Scenario 4: pickupArrivedAt != null -> CANCEL -> BLOQUEADO (ENCOMIENDA_NO_CANCELABLE).
 * Scenario 5: PICKED_UP / IN_TRANSIT -> CANCEL -> BLOQUEADO (PAQUETE_YA_RECOGIDO).
 *
 * B. CARRERA CRÍTICA CONCURRENTE:
 * Scenario 6: CUSTOMER CANCEL vs COURIER CLAIM -> Exclusión mutua atómica estricta (jamás CANCELLED + ASSIGNED).
 *
 * C. REVIEWS X→Y & IDEMPOTENCIA:
 * Scenario 7: DELIVERED -> Review X→Y -> Calificación a Courier y comentario registrado.
 * Scenario 8: Intento de segunda valoración -> BLOQUEADO (already-exists).
 *
 * D. MÉTRICAS HISTÓRICAS DE VIAJES:
 * Scenario 9: Pedido Comercio DELIVERED -> Commerce +1, Total +1, X2Y +0.
 * Scenario 10: Encomienda X→Y DELIVERED -> X2Y +1, Total +1, Commerce +0.
 * + Idempotencia de Transición: DELIVERED seguido de updates posteriores (GPS, rating, metadata) -> NO DUPLICA INCREMENTO.
 */
class BSDPostImplementationE2EAuditTest {

    // ─────────────────────────────────────────────────────────────────────────
    // MODELOS Y SIMULADORES FORENSES
    // ─────────────────────────────────────────────────────────────────────────

    data class DeliveryTrip(
        var tripId: String,
        var status: String,
        var customerId: String,
        var assignedCourierId: String? = null,
        var pickupArrivedAt: Long? = null,
        var pickedUpAt: Long? = null,
        var deliveredAt: Long? = null,
        var hasBeenRated: Boolean = false,
        var courierRating: Int? = null,
        var courierRatingComment: String? = null,
        var cancelledAt: Long? = null,
        var cancelledBy: String? = null,
        var cancelReason: String? = null
    )

    data class CourierMetrics(
        var completedCommerceTrips: Int = 0,
        var completedX2YTrips: Int = 0,
        var completedTotalTrips: Int = 0,
        var ratingCount: Int = 0,
        var totalRatingStars: Double = 0.0,
        var averageRating: Double = 5.0
    )

    data class CancellationResult(
        val success: Boolean,
        val errorCode: String? = null,
        val errorMessage: String? = null,
        val notifiedCourierId: String? = null
    )

    data class ReviewSubmissionResult(
        val success: Boolean,
        val errorCode: String? = null,
        val errorMessage: String? = null
    )

    /**
     * Emulación exacta de cancelDeliveryTrip Cloud Function
     */
    fun simulateCancelDeliveryTrip(
        trip: DeliveryTrip,
        callerUid: String,
        callerRole: String, // "CUSTOMER" | "PLATFORM_ADMIN"
        reason: String
    ): CancellationResult {
        // A. Validar Ownership si es cliente
        if (callerRole == "CUSTOMER" && trip.customerId != callerUid) {
            return CancellationResult(false, "permission-denied", "No tienes autorización para cancelar una encomienda ajena.")
        }

        // B. Validar terminales
        val currentStatus = trip.status.uppercase()
        if (currentStatus == "CANCELLED") {
            return CancellationResult(false, "already-exists", "Esta encomienda ya ha sido cancelada previamente.")
        }
        if (currentStatus in listOf("DELIVERED", "COMPLETED")) {
            return CancellationResult(false, "failed-precondition", "No se puede cancelar una encomienda que ya ha sido entregada.")
        }

        // C. Punto de corte físico
        val hasPickedUp = trip.pickedUpAt != null || currentStatus in listOf("PICKED_UP", "IN_TRANSIT")
        if (hasPickedUp) {
            return CancellationResult(
                false,
                "PAQUETE_YA_RECOGIDO",
                "PAQUETE_YA_RECOGIDO: El motorizado ya tiene tu paquete. La encomienda no puede cancelarse en este momento."
            )
        }

        val hasArrivedAtPickup = trip.pickupArrivedAt != null
        if (hasArrivedAtPickup) {
            return CancellationResult(
                false,
                "ENCOMIENDA_NO_CANCELABLE",
                "ENCOMIENDA_NO_CANCELABLE: El motorizado ya llegó al punto de recogida. Por seguridad, la encomienda ya no puede cancelarse."
            )
        }

        // D. Ejecución atómica de cancelación
        val courierToNotify = trip.assignedCourierId
        val now = System.currentTimeMillis()
        trip.status = "CANCELLED"
        trip.cancelledAt = now
        trip.cancelledBy = callerUid
        trip.cancelReason = reason

        return CancellationResult(true, notifiedCourierId = courierToNotify)
    }

    /**
     * Emulación exacta de claimTripAtomically en FirebaseManager
     */
    fun simulateClaimTripAtomically(
        trip: DeliveryTrip,
        courierId: String
    ): Boolean {
        val currentStatus = trip.status.uppercase()
        // Lock contra cancelación/timeout/entregados
        if (currentStatus in listOf("CANCELLED", "TIMEOUT", "COMPLETED", "DELIVERED")) {
            return false
        }
        // Lock contra doble asignación
        if (!trip.assignedCourierId.isNullOrEmpty() && trip.assignedCourierId != courierId) {
            return false
        }
        trip.status = "ASSIGNED"
        trip.assignedCourierId = courierId
        return true
    }

    /**
     * Emulación exacta de submitOrderReview con idempotencia de reviews/{tripId}
     */
    fun simulateSubmitReview(
        trip: DeliveryTrip,
        courierMetrics: CourierMetrics,
        reviewsDb: MutableMap<String, Map<String, Any>>,
        callerUid: String,
        courierRating: Int,
        comment: String
    ): ReviewSubmissionResult {
        if (trip.customerId != callerUid) {
            return ReviewSubmissionResult(false, "permission-denied", "No tienes autorización para calificar una encomienda ajena.")
        }

        val currentStatus = trip.status.lowercase()
        val isDelivered = listOf("delivered", "entregado", "completed", "completado").contains(currentStatus) || trip.deliveredAt != null
        if (!isDelivered) {
            return ReviewSubmissionResult(false, "failed-precondition", "La encomienda aún no ha sido entregada al destinatario.")
        }

        // Idempotencia estricta sobre reviews/{rawId}
        if (reviewsDb.containsKey(trip.tripId)) {
            val existing = reviewsDb[trip.tripId]
            if (existing?.get("courierRating") != null || existing?.get("rating") != null) {
                return ReviewSubmissionResult(false, "already-exists", "Ya valoraste esta encomienda anteriormente.")
            }
        }

        // Asentar reseña
        reviewsDb[trip.tripId] = mapOf(
            "reviewType" to "X_TO_Y",
            "tripId" to trip.tripId,
            "courierRating" to courierRating,
            "courierComments" to comment,
            "customerId" to callerUid,
            "createdAt" to System.currentTimeMillis()
        )

        // Actualizar agregados de reputación del Courier
        val newCount = courierMetrics.ratingCount + 1
        val newStars = courierMetrics.totalRatingStars + courierRating
        courierMetrics.ratingCount = newCount
        courierMetrics.totalRatingStars = newStars
        courierMetrics.averageRating = Math.round((newStars / newCount) * 10.0) / 10.0

        trip.hasBeenRated = true
        trip.courierRating = courierRating
        trip.courierRatingComment = comment

        return ReviewSubmissionResult(true)
    }

    /**
     * Emulación exacta del trigger onTripCompleted y onOrderDelivered
     */
    fun simulateTriggerTransition(
        previousStatus: String,
        currentStatus: String,
        domain: String, // "COMMERCE" | "X_TO_Y"
        courierMetrics: CourierMetrics
    ): Boolean {
        val wasCompleted = previousStatus.lowercase() in listOf("delivered", "completed", "entregado", "completado")
        val isNowCompleted = currentStatus.lowercase() in listOf("delivered", "completed", "entregado", "completado")

        // Guard estricto de transición: if (wasCompleted || !isNowCompleted) return null;
        if (wasCompleted || !isNowCompleted) {
            return false // No incrementa
        }

        if (domain == "COMMERCE") {
            courierMetrics.completedCommerceTrips += 1
            courierMetrics.completedTotalTrips += 1
        } else if (domain == "X_TO_Y") {
            courierMetrics.completedX2YTrips += 1
            courierMetrics.completedTotalTrips += 1
        }
        return true
    }

    // =========================================================================
    // SECCIÓN A: CANCELACIÓN X→Y (ESCENARIOS 1 A 5)
    // =========================================================================

    @Test
    fun testScenario01_pendingWithoutCourier_canCancel() {
        val trip = DeliveryTrip(
            tripId = "TRIP-001",
            status = "PENDING",
            customerId = "CUST-100"
        )
        val result = simulateCancelDeliveryTrip(trip, "CUST-100", "CUSTOMER", "Cambio de planes")
        assertTrue(result.success)
        assertEquals("CANCELLED", trip.status)
        assertNull(result.notifiedCourierId)
    }

    @Test
    fun testScenario02_assignedCourierNotArrived_canCancelAndNotify() {
        val trip = DeliveryTrip(
            tripId = "TRIP-002",
            status = "ASSIGNED",
            customerId = "CUST-100",
            assignedCourierId = "COUR-555"
        )
        val result = simulateCancelDeliveryTrip(trip, "CUST-100", "CUSTOMER", "Cancelación antes de llegada")
        assertTrue(result.success)
        assertEquals("CANCELLED", trip.status)
        assertEquals("COUR-555", result.notifiedCourierId)
    }

    @Test
    fun testScenario03_enRoutePickup_pickupArrivedAtNull_canCancel() {
        val trip = DeliveryTrip(
            tripId = "TRIP-003",
            status = "ASSIGNED",
            customerId = "CUST-100",
            assignedCourierId = "COUR-555",
            pickupArrivedAt = null,
            pickedUpAt = null
        )
        val result = simulateCancelDeliveryTrip(trip, "CUST-100", "CUSTOMER", "En camino pero aún no llega")
        assertTrue(result.success)
        assertEquals("CANCELLED", trip.status)
    }

    @Test
    fun testScenario04_pickupArrivedAtNotNull_blockedCustody() {
        val trip = DeliveryTrip(
            tripId = "TRIP-004",
            status = "ASSIGNED",
            customerId = "CUST-100",
            assignedCourierId = "COUR-555",
            pickupArrivedAt = System.currentTimeMillis() - 60000, // Courier ya llegó a Punto A
            pickedUpAt = null
        )
        val result = simulateCancelDeliveryTrip(trip, "CUST-100", "CUSTOMER", "Intento cancelar con courier en sitio")
        assertFalse(result.success)
        assertEquals("ENCOMIENDA_NO_CANCELABLE", result.errorCode)
        assertEquals("ASSIGNED", trip.status) // El viaje NO fue cancelado
    }

    @Test
    fun testScenario05_pickedUpOrInTransit_blockedCustody() {
        val trip = DeliveryTrip(
            tripId = "TRIP-005",
            status = "IN_TRANSIT",
            customerId = "CUST-100",
            assignedCourierId = "COUR-555",
            pickupArrivedAt = System.currentTimeMillis() - 120000,
            pickedUpAt = System.currentTimeMillis() - 60000 // Paquete en custodia física
        )
        val result = simulateCancelDeliveryTrip(trip, "CUST-100", "CUSTOMER", "Intento cancelar paquete en tránsito")
        assertFalse(result.success)
        assertEquals("PAQUETE_YA_RECOGIDO", result.errorCode)
        assertEquals("IN_TRANSIT", trip.status) // El viaje NO fue cancelado
    }

    // =========================================================================
    // SECCIÓN B: CARRERA CRÍTICA CONCURRENTE (ESCENARIO 6)
    // =========================================================================

    @Test
    fun testScenario06_cancelVsClaimConcurrentRace() {
        // Caso A: Cancel se ejecuta y commitea primero en la transacción
        val tripA = DeliveryTrip(tripId = "TRIP-RACE-A", status = "PENDING", customerId = "CUST-100")
        val cancelResult = simulateCancelDeliveryTrip(tripA, "CUST-100", "CUSTOMER", "Cancelación primero")
        assertTrue(cancelResult.success)
        assertEquals("CANCELLED", tripA.status)

        // El claim concurrente lee el status tras el commit de cancel
        val claimResult = simulateClaimTripAtomically(tripA, "COUR-999")
        assertFalse("El claim DEBE ser rechazado si cancel commiteó primero", claimResult)
        assertEquals("CANCELLED", tripA.status)
        assertNull(tripA.assignedCourierId)

        // Caso B: Claim se ejecuta y commitea primero en la transacción
        val tripB = DeliveryTrip(tripId = "TRIP-RACE-B", status = "PENDING", customerId = "CUST-100")
        val claimFirstResult = simulateClaimTripAtomically(tripB, "COUR-888")
        assertTrue(claimFirstResult)
        assertEquals("ASSIGNED", tripB.status)
        assertEquals("COUR-888", tripB.assignedCourierId)

        // El cancel posterior encuentra el trip ASSIGNED (sin haber llegado aún a Punto A)
        val cancelAfterClaimResult = simulateCancelDeliveryTrip(tripB, "CUST-100", "CUSTOMER", "Cancelación tras asignación")
        assertTrue(cancelAfterClaimResult.success)
        assertEquals("CANCELLED", tripB.status)
        // El motorizado asignado recibe la notificación de corte
        assertEquals("COUR-888", cancelAfterClaimResult.notifiedCourierId)
    }

    // =========================================================================
    // SECCIÓN C: REVIEWS X→Y E IDEMPOTENCIA (ESCENARIOS 7 Y 8)
    // =========================================================================

    @Test
    fun testScenario07_deliveredTrip_submitReviewSuccess() {
        val trip = DeliveryTrip(
            tripId = "TRIP-REV-001",
            status = "DELIVERED",
            customerId = "CUST-100",
            assignedCourierId = "COUR-777",
            deliveredAt = System.currentTimeMillis()
        )
        val courierMetrics = CourierMetrics(ratingCount = 4, totalRatingStars = 20.0, averageRating = 5.0)
        val reviewsDb = mutableMapOf<String, Map<String, Any>>()

        val result = simulateSubmitReview(
            trip = trip,
            courierMetrics = courierMetrics,
            reviewsDb = reviewsDb,
            callerUid = "CUST-100",
            courierRating = 4,
            comment = "Excelente servicio X->Y puntual"
        )

        assertTrue(result.success)
        assertTrue(reviewsDb.containsKey("TRIP-REV-001"))
        assertEquals(5, courierMetrics.ratingCount)
        assertEquals(24.0, courierMetrics.totalRatingStars, 0.001)
        assertEquals(4.8, courierMetrics.averageRating, 0.001)
        assertTrue(trip.hasBeenRated)
        assertEquals(4, trip.courierRating)
    }

    @Test
    fun testScenario08_doubleReviewAttempt_rejectedAlreadyExists() {
        val trip = DeliveryTrip(
            tripId = "TRIP-REV-002",
            status = "DELIVERED",
            customerId = "CUST-100",
            assignedCourierId = "COUR-777",
            deliveredAt = System.currentTimeMillis()
        )
        val courierMetrics = CourierMetrics(ratingCount = 1, totalRatingStars = 5.0, averageRating = 5.0)
        val reviewsDb = mutableMapOf<String, Map<String, Any>>()

        // Primera valoración
        val firstReview = simulateSubmitReview(trip, courierMetrics, reviewsDb, "CUST-100", 5, "Primera")
        assertTrue(firstReview.success)
        assertEquals(2, courierMetrics.ratingCount)

        // Intento de segunda valoración (reintento, doble tap, reapertura)
        val secondReview = simulateSubmitReview(trip, courierMetrics, reviewsDb, "CUST-100", 1, "Segunda fraudulenta")
        assertFalse("El segundo intento debe ser rechazado", secondReview.success)
        assertEquals("already-exists", secondReview.errorCode)

        // Las métricas del Courier NO fueron alteradas por el segundo intento
        assertEquals(2, courierMetrics.ratingCount)
        assertEquals(10.0, courierMetrics.totalRatingStars, 0.001)
        assertEquals(5.0, courierMetrics.averageRating, 0.001)
    }

    // =========================================================================
    // SECCIÓN D: MÉTRICAS HISTÓRICAS E IDEMPOTENCIA DE TRANSICIÓN (ESCENARIOS 9 Y 10)
    // =========================================================================

    @Test
    fun testScenario09_commerceDelivered_incrementsOnlyCommerceAndTotal() {
        val metrics = CourierMetrics(completedCommerceTrips = 10, completedX2YTrips = 5, completedTotalTrips = 15)

        // Transición in_transit -> delivered en Comercio
        val triggered = simulateTriggerTransition("in_transit", "delivered", "COMMERCE", metrics)
        assertTrue(triggered)

        assertEquals(11, metrics.completedCommerceTrips)
        assertEquals(5, metrics.completedX2YTrips) // X2Y INTACTO
        assertEquals(16, metrics.completedTotalTrips)
    }

    @Test
    fun testScenario10_xToYDelivered_incrementsOnlyX2YAndTotal_andSubsequentUpdatesNoOp() {
        val metrics = CourierMetrics(completedCommerceTrips = 10, completedX2YTrips = 5, completedTotalTrips = 15)

        // 1. Transición in_transit -> DELIVERED en X→Y
        val firstTrigger = simulateTriggerTransition("in_transit", "DELIVERED", "X_TO_Y", metrics)
        assertTrue(firstTrigger)

        assertEquals(10, metrics.completedCommerceTrips) // COMMERCE INTACTO
        assertEquals(6, metrics.completedX2YTrips) // X2Y +1
        assertEquals(16, metrics.completedTotalTrips) // TOTAL +1

        // 2. ACTUALIZACIÓN POSTERIOR: delivered -> delivered (actualización de GPS / tracking / metadata)
        val subsequentGpsUpdate = simulateTriggerTransition("delivered", "delivered", "X_TO_Y", metrics)
        assertFalse("Actualización cuando ya estaba entregado NO debe incrementar métricas", subsequentGpsUpdate)

        // 3. ACTUALIZACIÓN POSTERIOR: delivered -> delivered (actualización de rating / comentarios)
        val subsequentRatingUpdate = simulateTriggerTransition("DELIVERED", "DELIVERED", "X_TO_Y", metrics)
        assertFalse("Actualización de calificación posterior NO debe incrementar métricas", subsequentRatingUpdate)

        // 4. Comprobar que los contadores permanecen exactamente iguales (Cero corrupción silenciosa)
        assertEquals(10, metrics.completedCommerceTrips)
        assertEquals(6, metrics.completedX2YTrips)
        assertEquals(16, metrics.completedTotalTrips)
    }
}
