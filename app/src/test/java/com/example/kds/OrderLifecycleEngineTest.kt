package com.example.kds

import com.example.domain.engine.order.LifecycleTransitionResult
import com.example.domain.engine.order.OrderLifecycleEngine
import com.example.domain.engine.order.UserRole
import com.example.domain.model.order.CommercialStatus
import com.example.domain.model.order.OperationalStatus
import com.example.domain.model.order.Order
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OrderLifecycleEngineTest {

    private val engine = OrderLifecycleEngine()

    @Test
    fun `test client can set commercial status to PENDING_PAYMENT`() {
        val order = Order(id = "o1", commercialStatus = CommercialStatus.CREATED)
        val result = engine.updateCommercialStatus(order, CommercialStatus.PENDING_PAYMENT, UserRole.CLIENT)

        assertTrue(result is LifecycleTransitionResult.Success)
        val updated = (result as LifecycleTransitionResult.Success).updatedOrder
        assertEquals(CommercialStatus.PENDING_PAYMENT, updated.commercialStatus)
    }

    @Test
    fun `test cook cannot confirm commercial status`() {
        val order = Order(id = "o1", commercialStatus = CommercialStatus.PENDING_PAYMENT)
        val result = engine.updateCommercialStatus(order, CommercialStatus.CONFIRMED, UserRole.COOK)

        assertTrue(result is LifecycleTransitionResult.Error)
    }

    @Test
    fun `test cook can transition operational status to PREPARING when confirmed`() {
        val order = Order(id = "o1", commercialStatus = CommercialStatus.CONFIRMED, operationalStatus = OperationalStatus.QUEUED)
        val result = engine.updateOperationalStatus(order, OperationalStatus.PREPARING, UserRole.COOK)

        assertTrue(result is LifecycleTransitionResult.Success)
        val updated = (result as LifecycleTransitionResult.Success).updatedOrder
        assertEquals(OperationalStatus.PREPARING, updated.operationalStatus)
    }

    @Test
    fun `test operational transition fails if order is not CONFIRMED commercially`() {
        val order = Order(id = "o1", commercialStatus = CommercialStatus.CREATED, operationalStatus = OperationalStatus.QUEUED)
        val result = engine.updateOperationalStatus(order, OperationalStatus.PREPARING, UserRole.COOK)

        assertTrue(result is LifecycleTransitionResult.Error)
    }
}
