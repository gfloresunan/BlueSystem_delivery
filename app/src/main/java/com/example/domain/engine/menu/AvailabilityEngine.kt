package com.example.domain.engine.menu

import com.example.domain.event.menu.MenuDomainEvent
import com.example.domain.event.menu.ProductAvailabilityChanged
import com.example.domain.event.menu.StockDepleted
import com.example.domain.model.menu.AvailabilityResult
import com.example.domain.model.menu.AvailabilitySchedule
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter

interface IAvailabilityEngine {
    fun evaluateAvailability(
        schedule: AvailabilitySchedule?,
        currentDateTime: LocalDateTime = LocalDateTime.now(),
        isStockDepleted: Boolean = false,
        currentStock: Int? = null,
        productId: String? = null,
        restaurantId: String? = null,
        onEventEmitted: ((MenuDomainEvent) -> Unit)? = null
    ): AvailabilityResult
}

/**
 * Servidor de Dominio: AvailabilityEngineImpl (Sprint 13B.5B Hardened)
 *
 * EVALUACIÓN OPERATIVA EN TIEMPO REAL:
 * Resuelve la disponibilidad real evaluando:
 * 1. Pausas temporales de emergencia ("Sin pollo por 30 min") y su expiración.
 * 2. Disponibilidad por inventario (Stock depleted o stock <= 0).
 * 3. Franjas horarias por día de la semana (DayOfWeek) y rangos ("HH:mm").
 * 4. Emisión de Eventos de Dominio ante cambios operacionales.
 */
class AvailabilityEngineImpl : IAvailabilityEngine {

    private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    override fun evaluateAvailability(
        schedule: AvailabilitySchedule?,
        currentDateTime: LocalDateTime,
        isStockDepleted: Boolean,
        currentStock: Int?,
        productId: String?,
        restaurantId: String?,
        onEventEmitted: ((MenuDomainEvent) -> Unit)?
    ): AvailabilityResult {
        // 1. Evaluación de Inventario Agotado
        if (isStockDepleted || (currentStock != null && currentStock <= 0)) {
            if (productId != null && restaurantId != null && onEventEmitted != null) {
                onEventEmitted(
                    StockDepleted(
                        productId = productId,
                        restaurantId = restaurantId
                    )
                )
                onEventEmitted(
                    ProductAvailabilityChanged(
                        productId = productId,
                        restaurantId = restaurantId,
                        isAvailable = false,
                        reason = "STOCK_DEPLETED"
                    )
                )
            }
            return AvailabilityResult(
                isAvailable = false,
                reason = "OUT_OF_STOCK",
                isStockDepleted = true
            )
        }

        // Si no hay calendario asignado, el ítem está disponible sin restricción horaria
        if (schedule == null) {
            return AvailabilityResult(isAvailable = true, reason = "AVAILABLE_NO_SCHEDULE")
        }

        // 2. Evaluación de Pausa Temporal (Emergency Pause)
        val currentMillis = System.currentTimeMillis()
        if (schedule.isTemporaryPaused) {
            val pausedUntil = schedule.pausedUntilTimestamp
            val isStillPaused = pausedUntil == null || currentMillis < pausedUntil

            if (isStillPaused) {
                val reasonText = schedule.pauseReason ?: "TEMPORARY_PAUSED"
                return AvailabilityResult(
                    isAvailable = false,
                    reason = reasonText,
                    isTemporaryPaused = true
                )
            }
        }

        // 3. Evaluación de Día de la Semana y Franjas Horarias
        val currentDay = currentDateTime.dayOfWeek
        val currentTime = currentDateTime.toLocalTime()

        val daySchedule = schedule.weeklySchedules.find { it.dayOfWeek == currentDay }
            ?: return AvailabilityResult(isAvailable = false, reason = "CLOSED_TODAY")

        if (!daySchedule.isOpen) {
            return AvailabilityResult(isAvailable = false, reason = "CLOSED_TODAY")
        }

        if (daySchedule.timeRanges.isEmpty()) {
            return AvailabilityResult(isAvailable = true, reason = "OPEN_ALL_DAY")
        }

        for (range in daySchedule.timeRanges) {
            val start = parseTime(range.startTime)
            val end = parseTime(range.endTime)

            if (start != null && end != null) {
                if (!currentTime.isBefore(start) && !currentTime.isAfter(end)) {
                    return AvailabilityResult(isAvailable = true, reason = "WITHIN_OPERATIONAL_HOURS")
                }
            }
        }

        val nextRange = daySchedule.timeRanges.find { parseTime(it.startTime)?.isAfter(currentTime) == true }
        val nextTimeStr = nextRange?.startTime

        return AvailabilityResult(
            isAvailable = false,
            reason = "OUTSIDE_OPERATIONAL_HOURS",
            nextAvailableTime = nextTimeStr
        )
    }

    private fun parseTime(timeStr: String): LocalTime? {
        return try {
            LocalTime.parse(timeStr, timeFormatter)
        } catch (e: Exception) {
            null
        }
    }
}
