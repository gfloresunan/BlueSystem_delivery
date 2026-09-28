package com.example.menu

import com.example.domain.engine.menu.AvailabilityEngineImpl
import com.example.domain.engine.menu.CustomerAvailabilityFilter
import com.example.domain.event.menu.MenuDomainEvent
import com.example.domain.event.menu.ProductAvailabilityChanged
import com.example.domain.event.menu.StockDepleted
import com.example.domain.model.menu.AvailabilitySchedule
import com.example.domain.model.menu.DaySchedule
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuProductStatus
import com.example.domain.model.menu.TimeRange
import java.time.DayOfWeek
import java.time.LocalDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AvailabilityEngineE2ETest {

    private val engine = AvailabilityEngineImpl()

    @Test
    fun `test complete E2E operational availability lifecycle from schedules to emergency pause and domain events`() {
        // 1. Configuración de horario de sucursal (Lunes a Domingo 08:00 a 22:00)
        val dailyRange = TimeRange(startTime = "08:00", endTime = "22:00")
        val weeklySchedules = DayOfWeek.values().map { day ->
            DaySchedule(dayOfWeek = day, timeRanges = listOf(dailyRange), isOpen = true)
        }

        val branchSchedule = AvailabilitySchedule(
            id = "sched_branch_centro",
            restaurantId = "rest_01",
            branchId = "branch_centro",
            name = "Horario Sucursal Centro",
            weeklySchedules = weeklySchedules
        )

        val productChicken = MenuProduct(
            id = "prod_pollomuestra",
            restaurantId = "rest_01",
            name = "Pollo Asado 1/2",
            availabilityScheduleId = "sched_branch_centro",
            status = MenuProductStatus.ACTIVE
        )

        val wednesdayNoon = LocalDateTime.of(2026, 7, 29, 12, 0) // Miércoles 12:00 PM

        // 2. Operación Normal (12:00 PM) -> Producto Disponible
        val normalResult = engine.evaluateAvailability(branchSchedule, currentDateTime = wednesdayNoon)
        assertTrue("El producto debe estar disponible durante el horario normal", normalResult.isAvailable)

        // 3. Pausa de Emergencia ("Sin pollo durante 30 minutos")
        val pausedSchedule = branchSchedule.copy(
            isTemporaryPaused = true,
            pauseReason = "Sin pollo durante 30 minutos"
        )

        val pausedResult = engine.evaluateAvailability(pausedSchedule, currentDateTime = wednesdayNoon)
        assertFalse("El producto debe bloquearse durante la pausa de emergencia", pausedResult.isAvailable)
        assertEquals("Sin pollo durante 30 minutos", pausedResult.reason)

        // 4. Filtrado en el árbol del Cliente durante la Pausa
        val filteredForCustomer = CustomerAvailabilityFilter.filterProducts(
            products = listOf(productChicken),
            schedulesMap = mapOf("sched_branch_centro" to pausedSchedule),
            currentDateTime = wednesdayNoon
        )
        assertFalse(filteredForCustomer.first().isAvailableForOrder)

        // 5. Agotamiento de Stock (StockDepleted) -> Emisión de Eventos de Dominio para KDS / Notificaciones
        val domainEvents = mutableListOf<MenuDomainEvent>()
        val depletedResult = engine.evaluateAvailability(
            schedule = branchSchedule,
            currentDateTime = wednesdayNoon,
            isStockDepleted = true,
            productId = productChicken.id,
            restaurantId = productChicken.restaurantId,
            onEventEmitted = { domainEvents.add(it) }
        )

        assertFalse(depletedResult.isAvailable)
        assertTrue(depletedResult.isStockDepleted)
        assertEquals(2, domainEvents.size)
        assertTrue(domainEvents.any { it is StockDepleted })
        assertTrue(domainEvents.any { it is ProductAvailabilityChanged })
    }
}
