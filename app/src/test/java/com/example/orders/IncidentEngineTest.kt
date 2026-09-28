package com.example.orders

import com.example.domain.model.orders.IncidentStatus
import com.example.domain.model.orders.IncidentType
import com.example.domain.model.orders.OrderIncident
import org.junit.Assert.*
import org.junit.Test

class IncidentEngineTest {

    @Test
    fun testIncidentCreationIntegrity() {
        val incident = OrderIncident(
            id = "inc_001",
            orderId = "ord_001",
            type = IncidentType.CUSTOMER_UNRESPONSIVE,
            description = "Llamadas sin respuesta"
        )

        assertEquals("inc_001", incident.id)
        assertEquals(IncidentStatus.OPEN, incident.status)
    }
}
