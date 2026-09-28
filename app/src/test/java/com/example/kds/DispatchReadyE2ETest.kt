package com.example.kds

import com.example.domain.engine.kds.DispatchIntegrationSimulatorImpl
import com.example.domain.engine.order.OrderLifecycleEngine
import com.example.domain.engine.order.UserRole
import com.example.domain.model.order.CommercialStatus
import com.example.domain.model.order.OperationalStatus
import com.example.domain.model.order.Order
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DispatchReadyE2ETest {

    private val lifecycleEngine = OrderLifecycleEngine()
    private val dispatchIntegration = DispatchIntegrationSimulatorImpl()

    @Test
    fun `E2E 9 - Ready Order triggers dispatch assignment and out for delivery lifecycle`() = runBlocking {
        val order = Order(id = "o_dispatch", commercialStatus = CommercialStatus.CONFIRMED, operationalStatus = OperationalStatus.READY)

        // 1. Asignar motorizado/driver
        val assignment = dispatchIntegration.assignDriver(order.id, "driver_77")
        assertEquals("driver_77", assignment.driverId)

        // 2. Avanzar estado a OUT_FOR_DELIVERY
        val step1 = lifecycleEngine.updateOperationalStatus(order, OperationalStatus.OUT_FOR_DELIVERY, UserRole.CASHIER)
        assertTrue(step1 is com.example.domain.engine.order.LifecycleTransitionResult.Success)
        val orderOut = (step1 as com.example.domain.engine.order.LifecycleTransitionResult.Success).updatedOrder

        // 3. Confirmar entrega a DELIVERED
        val step2 = lifecycleEngine.updateOperationalStatus(orderOut, OperationalStatus.DELIVERED, UserRole.CASHIER)
        assertTrue(step2 is com.example.domain.engine.order.LifecycleTransitionResult.Success)
        val orderDelivered = (step2 as com.example.domain.engine.order.LifecycleTransitionResult.Success).updatedOrder

        assertEquals(OperationalStatus.DELIVERED, orderDelivered.operationalStatus)
    }
}
