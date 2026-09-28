package com.example.menu

import com.example.domain.engine.menu.AvailabilityEngineImpl
import com.example.domain.event.menu.MenuDomainEvent
import com.example.domain.event.menu.ProductAvailabilityChanged
import com.example.domain.event.menu.StockDepleted
import com.example.domain.model.menu.AvailabilitySchedule
import com.example.domain.model.menu.DaySchedule
import com.example.domain.model.menu.TimeRange
import java.time.DayOfWeek
import java.time.LocalDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AvailabilityEngineTest {

    private val engine = AvailabilityEngineImpl()

    @Test
    fun `test evaluateAvailability allows order during active breakfast time window`() {
        val range = TimeRange(startTime = "07:00", endTime = "11:00")
        val day = DaySchedule(dayOfWeek = DayOfWeek.MONDAY, timeRanges = listOf(range), isOpen = true)
        val schedule = AvailabilitySchedule(id = "s_bf", name = "Desayunos", weeklySchedules = listOf(day))

        // Lunes 09:30 AM -> dentro del rango 07:00 a 11:00
        val current = LocalDateTime.of(2026, 7, 27, 9, 30) // 27 Julio 2026 es Lunes
        val result = engine.evaluateAvailability(schedule, currentDateTime = current)

        assertTrue("El producto debe estar disponible a las 09:30 AM", result.isAvailable)
        assertEquals("WITHIN_OPERATIONAL_HOURS", result.reason)
    }

    @Test
    fun `test evaluateAvailability blocks order outside breakfast time window`() {
        val range = TimeRange(startTime = "07:00", endTime = "11:00")
        val day = DaySchedule(dayOfWeek = DayOfWeek.MONDAY, timeRanges = listOf(range), isOpen = true)
        val schedule = AvailabilitySchedule(id = "s_bf", name = "Desayunos", weeklySchedules = listOf(day))

        // Lunes 02:00 PM (14:00) -> fuera del rango
        val current = LocalDateTime.of(2026, 7, 27, 14, 0)
        val result = engine.evaluateAvailability(schedule, currentDateTime = current)

        assertFalse("El menú de desayunos no debe estar disponible a las 2:00 PM", result.isAvailable)
        assertEquals("OUTSIDE_OPERATIONAL_HOURS", result.reason)
    }

    @Test
    fun `test evaluateAvailability handles temporary emergency pause and emits domain events on stock depletion`() {
        val schedule = AvailabilitySchedule(
            id = "s_main",
            name = "General",
            isTemporaryPaused = true,
            pauseReason = "Sin pollo durante 30 minutos"
        )

        val result = engine.evaluateAvailability(schedule)

        assertFalse("Debe bloquearse por la pausa temporal de emergencia", result.isAvailable)
        assertEquals("Sin pollo durante 30 minutos", result.reason)

        // Prueba de Stock Depleted con emisión de Eventos de Dominio
        val emittedEvents = mutableListOf<MenuDomainEvent>()
        val stockResult = engine.evaluateAvailability(
            schedule = schedule,
            isStockDepleted = true,
            productId = "prod_chicken",
            restaurantId = "rest_01",
            onEventEmitted = { emittedEvents.add(it) }
        )

        assertFalse(stockResult.isAvailable)
        assertTrue(stockResult.isStockDepleted)
        assertEquals(2, emittedEvents.size)
        assertTrue(emittedEvents.any { it is StockDepleted })
        assertTrue(emittedEvents.any { it is ProductAvailabilityChanged })
    }
}
