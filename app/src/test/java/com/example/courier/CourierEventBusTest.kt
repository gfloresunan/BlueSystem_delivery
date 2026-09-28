package com.example.courier

import com.example.domain.engine.courier.CourierEventBus
import com.example.domain.event.CourierDomainEvent
import com.example.domain.model.courier.CourierIncidentType
import com.example.domain.model.courier.DeliveryProofType
import com.example.domain.model.courier.PauseReason
import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CourierEventBusTest {

    @Test
    fun `test publishing ShiftStarted and receiving event from EventBus`() = runTest {
        val event = CourierDomainEvent.ShiftStarted(
            courierId = "c_001",
            initialBatteryLevel = 95,
            initialOdometerKm = 12450.0
        )

        CourierEventBus.publish(event)

        val lastPublished = CourierEventBus.events.replayCache.lastOrNull()
        assertNotNull(lastPublished)
        assertTrue(lastPublished is CourierDomainEvent.ShiftStarted)

        val shiftEvent = lastPublished as CourierDomainEvent.ShiftStarted
        assertEquals("c_001", shiftEvent.courierId)
        assertEquals(95, shiftEvent.initialBatteryLevel)
    }

    @Test
    fun `test publishing all 10 domain events without throwing exceptions`() = runTest {
        val eventsToPublish = listOf(
            CourierDomainEvent.ShiftStarted("c1", 90, 100.0),
            CourierDomainEvent.ShiftPaused("c1", PauseReason.ALMUERZO),
            CourierDomainEvent.IncidentReported("c1", "inc1", CourierIncidentType.LLUVIA_TORRENCIAL, "Lluvia fuerte"),
            CourierDomainEvent.VehicleUpdated("c1", "M-12345", 150.0, 5.0),
            CourierDomainEvent.ProofValidated("c1", "ord1", DeliveryProofType.STANDARD_NORMAL, true),
            CourierDomainEvent.RouteCalculated("c1", "ord1", 4.5, 12.0, listOf(LatLng(12.0, -86.0))),
            CourierDomainEvent.RouteDeviationDetected("c1", "ord1", 250.0, 12.1, -86.1),
            CourierDomainEvent.TrustScoreChanged("c1", 100.0, 95.0, "Mock GPS ping"),
            CourierDomainEvent.RewardGranted("c1", "mission_streak", 50.0),
            CourierDomainEvent.SettlementClosed("c1", 500.0, 45.0, 545.0)
        )

        eventsToPublish.forEach { event ->
            CourierEventBus.publish(event)
        }

        val replayCache = CourierEventBus.events.replayCache
        assertTrue(replayCache.size >= 10)
    }
}
