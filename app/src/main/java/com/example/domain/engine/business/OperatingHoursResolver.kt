package com.example.domain.engine.business

import java.time.DayOfWeek
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Estado determinístico de disponibilidad operativa del comercio / sucursal.
 */
data class OperatingHoursStatus(
    val isOpen: Boolean,
    val reason: String,
    val todayScheduleText: String = "",
    val openingTime: String? = null,
    val closingTime: String? = null
)

/**
 * Domain Engine: OperatingHoursResolver (BSD-MERCHANT-OPERATING-HOURS-ROOT-CAUSE-001)
 *
 * UNIFIED CANONICAL AVAILABILITY RESOLVER
 * Responsabilidad Única: Resolver de forma determinística si un comercio o sucursal
 * se encuentra operativo en un instante temporal específico bajo la zona horaria del negocio.
 *
 * Características:
 * 1. Zona Horaria Canónica: "America/Managua" (UTC-6) por defecto.
 * 2. Soporte de Nombres de Día: Español ("lunes".."domingo"), Inglés ("monday".."sunday") o numérico (1..7).
 * 3. Formato de Hora Resiliente: "HH:mm" (24h) y "hh:mm a" (12h AM/PM).
 * 4. Soporte Completo de Jornadas Nocturnas / Cruce de Medianoche (Overnight Hours e.g. 18:00 a 02:00).
 * 5. Soporte de Comercios 24 Horas ("00:00" a "23:59" / "00:00" a "00:00").
 * 6. Interruptor Manual de Emergencia (isOpen / manualOpen).
 */
object OperatingHoursResolver {

    const val DEFAULT_TIMEZONE = "America/Managua"

    private val timeFormatter24 = DateTimeFormatter.ofPattern("H:m", Locale.US)
    private val timeFormatter12 = DateTimeFormatter.ofPattern("h:m a", Locale.US)

    /**
     * Resuelve si el comercio está abierto en este instante.
     */
    fun isStoreOpen(
        schedule: Any?,
        manualOpen: Boolean = true,
        timezone: String = DEFAULT_TIMEZONE,
        targetDateTime: ZonedDateTime? = null
    ): Boolean {
        return resolveStatus(schedule, manualOpen, timezone, targetDateTime).isOpen
    }

    /**
     * Resuelve el estado detallado de operación.
     */
    fun resolveStatus(
        schedule: Any?,
        manualOpen: Boolean = true,
        timezone: String = DEFAULT_TIMEZONE,
        targetDateTime: ZonedDateTime? = null
    ): OperatingHoursStatus {
        // 1. Si el switch manual de emergencia está apagado, el comercio está cerrado forzosamente.
        if (!manualOpen) {
            return OperatingHoursStatus(
                isOpen = false,
                reason = "MANUALLY_CLOSED",
                todayScheduleText = "Cerrado temporalmente"
            )
        }

        // 2. Extracción de mapa normalizado de horarios
        val scheduleMap = extractScheduleMap(schedule)
        if (scheduleMap.isNullOrEmpty()) {
            // Si no hay configuración de horario, rige el interruptor manual
            return OperatingHoursStatus(
                isOpen = manualOpen,
                reason = "NO_SCHEDULE_CONFIGURED",
                todayScheduleText = if (manualOpen) "Abierto" else "Cerrado"
            )
        }

        // 3. Resolución temporal con zona horaria canónica
        val zone = try {
            ZoneId.of(timezone.ifBlank { DEFAULT_TIMEZONE })
        } catch (_: Exception) {
            ZoneId.of(DEFAULT_TIMEZONE)
        }

        val zonedDateTime = targetDateTime ?: ZonedDateTime.now(zone)
        val currentDay = zonedDateTime.dayOfWeek
        val currentTime = zonedDateTime.toLocalTime()

        // 4. Evaluación de la jornada de HOY
        val todayConfig = getDayConfig(scheduleMap, currentDay)
        val todayIsOpen = todayConfig?.isOpen ?: true
        val todayOpenTime = todayConfig?.openTime
        val todayCloseTime = todayConfig?.closeTime

        val todayText = formatDayScheduleText(todayIsOpen, todayOpenTime, todayCloseTime)

        if (todayConfig != null && todayIsOpen && todayOpenTime != null && todayCloseTime != null) {
            // Caso 24 Horas
            if (is24Hours(todayOpenTime, todayCloseTime)) {
                return OperatingHoursStatus(
                    isOpen = true,
                    reason = "OPEN_24_HOURS",
                    todayScheduleText = "Abierto 24 horas",
                    openingTime = formatTimeStr(todayOpenTime),
                    closingTime = formatTimeStr(todayCloseTime)
                )
            }

            // Jornada Regular Diurna (open <= close, e.g. 09:00 a 22:00)
            if (!todayOpenTime.isAfter(todayCloseTime)) {
                if (!currentTime.isBefore(todayOpenTime) && currentTime.isBefore(todayCloseTime)) {
                    return OperatingHoursStatus(
                        isOpen = true,
                        reason = "WITHIN_OPERATIONAL_HOURS",
                        todayScheduleText = todayText,
                        openingTime = formatTimeStr(todayOpenTime),
                        closingTime = formatTimeStr(todayCloseTime)
                    )
                }
            } else {
                // Jornada Nocturna con Cruce de Medianoche (open > close, e.g. 18:00 a 02:00)
                // Durante el día actual, está abierto desde openTime hasta las 23:59:59
                if (!currentTime.isBefore(todayOpenTime)) {
                    return OperatingHoursStatus(
                        isOpen = true,
                        reason = "WITHIN_OVERNIGHT_HOURS",
                        todayScheduleText = todayText,
                        openingTime = formatTimeStr(todayOpenTime),
                        closingTime = formatTimeStr(todayCloseTime)
                    )
                }
            }
        }

        // 5. Evaluación de la jornada de AYER (por si ayer hubo horario nocturno que cruza a hoy)
        val yesterday = currentDay.minus(1)
        val yesterdayConfig = getDayConfig(scheduleMap, yesterday)
        if (yesterdayConfig != null && yesterdayConfig.isOpen && yesterdayConfig.openTime != null && yesterdayConfig.closeTime != null) {
            // Si ayer fue overnight (open > close, e.g. 18:00 a 02:00) y la hora actual es antes de closeTime:
            if (yesterdayConfig.openTime.isAfter(yesterdayConfig.closeTime)) {
                if (currentTime.isBefore(yesterdayConfig.closeTime)) {
                    return OperatingHoursStatus(
                        isOpen = true,
                        reason = "WITHIN_OVERNIGHT_HOURS_FROM_PREVIOUS_DAY",
                        todayScheduleText = todayText,
                        openingTime = formatTimeStr(yesterdayConfig.openTime),
                        closingTime = formatTimeStr(yesterdayConfig.closeTime)
                    )
                }
            }
        }

        // 6. Fuera de horario o día cerrado
        val reason = if (todayConfig != null && !todayIsOpen) "CLOSED_TODAY" else "OUTSIDE_OPERATIONAL_HOURS"
        return OperatingHoursStatus(
            isOpen = false,
            reason = reason,
            todayScheduleText = todayText,
            openingTime = todayOpenTime?.let { formatTimeStr(it) },
            closingTime = todayCloseTime?.let { formatTimeStr(it) }
        )
    }

    private data class ParsedDayConfig(
        val isOpen: Boolean,
        val openTime: LocalTime?,
        val closeTime: LocalTime?
    )

    private fun getDayConfig(scheduleMap: Map<String, Any>, dayOfWeek: DayOfWeek): ParsedDayConfig? {
        val possibleKeys = getDayKeys(dayOfWeek)
        var rawDayData: Any? = null

        for (k in possibleKeys) {
            if (scheduleMap.containsKey(k)) {
                rawDayData = scheduleMap[k]
                break
            }
        }

        if (rawDayData == null) return null

        if (rawDayData is Map<*, *>) {
            val isOpen = parseBoolean(
                rawDayData["isOpen"] ?: rawDayData["enabled"] ?: rawDayData["abierto"] ?: rawDayData["active"],
                default = true
            )
            val rawOpen = (rawDayData["open"] ?: rawDayData["openTime"] ?: rawDayData["apertura"] ?: rawDayData["start"])?.toString()
            val rawClose = (rawDayData["close"] ?: rawDayData["closeTime"] ?: rawDayData["cierre"] ?: rawDayData["end"])?.toString()

            val openTime = parseLocalTime(rawOpen)
            val closeTime = parseLocalTime(rawClose)

            return ParsedDayConfig(isOpen = isOpen, openTime = openTime, closeTime = closeTime)
        }

        return null
    }

    private fun getDayKeys(day: DayOfWeek): List<String> {
        return when (day) {
            DayOfWeek.MONDAY -> listOf("lunes", "monday", "lun", "mon", "1")
            DayOfWeek.TUESDAY -> listOf("martes", "tuesday", "mar", "tue", "2")
            DayOfWeek.WEDNESDAY -> listOf("miercoles", "miércoles", "wednesday", "mie", "wed", "3")
            DayOfWeek.THURSDAY -> listOf("jueves", "thursday", "jue", "thu", "4")
            DayOfWeek.FRIDAY -> listOf("viernes", "friday", "vie", "fri", "5")
            DayOfWeek.SATURDAY -> listOf("sabado", "sábado", "saturday", "sab", "sat", "6")
            DayOfWeek.SUNDAY -> listOf("domingo", "sunday", "dom", "sun", "7", "0")
        }
    }

    private fun parseLocalTime(timeStr: String?): LocalTime? {
        if (timeStr.isNullOrBlank()) return null
        val clean = timeStr.trim().uppercase(Locale.US)

        // Intento 1: HH:mm (24h)
        try {
            if (clean.contains(":")) {
                val parts = clean.split(":")
                val h = parts[0].trim().toIntOrNull()
                val mPart = parts[1].trim().take(2)
                val m = mPart.toIntOrNull()
                if (h != null && m != null && h in 0..24 && m in 0..59) {
                    if (h == 24 && m == 0) return LocalTime.of(23, 59)
                    if (clean.contains("PM") && h < 12) {
                        return LocalTime.of((h + 12) % 24, m)
                    }
                    if (clean.contains("AM") && h == 12) {
                        return LocalTime.of(0, m)
                    }
                    if (!clean.contains("AM") && !clean.contains("PM") && h in 0..23) {
                        return LocalTime.of(h, m)
                    }
                }
            }
        } catch (_: Exception) {}

        // Intento 2: DateTimeFormatter 12h
        try {
            return LocalTime.parse(clean, timeFormatter12)
        } catch (_: Exception) {}

        // Intento 3: DateTimeFormatter 24h
        try {
            return LocalTime.parse(clean, timeFormatter24)
        } catch (_: Exception) {}

        return null
    }

    private fun is24Hours(open: LocalTime, close: LocalTime): Boolean {
        return (open.hour == 0 && open.minute == 0 && (close.hour == 23 && close.minute == 59 || close.hour == 0 && close.minute == 0))
    }

    private fun parseBoolean(value: Any?, default: Boolean): Boolean {
        return when (value) {
            is Boolean -> value
            is String -> value.equals("true", ignoreCase = true) || value == "1"
            is Number -> value.toInt() == 1
            else -> default
        }
    }

    private fun formatTimeStr(time: LocalTime): String {
        return String.format(Locale.US, "%02d:%02d", time.hour, time.minute)
    }

    private fun formatDayScheduleText(isOpen: Boolean, open: LocalTime?, close: LocalTime?): String {
        if (!isOpen) return "Cerrado hoy"
        if (open != null && close != null) {
            if (is24Hours(open, close)) return "Abierto 24 horas"
            return "${formatTimeStr(open)} - ${formatTimeStr(close)}"
        }
        return "Horario regular"
    }

    @Suppress("UNCHECKED_CAST")
    private fun extractScheduleMap(schedule: Any?): Map<String, Any>? {
        if (schedule == null) return null
        if (schedule is Map<*, *>) {
            val result = mutableMapOf<String, Any>()
            for ((k, v) in schedule) {
                if (k != null && v != null) {
                    result[k.toString().lowercase(Locale.ROOT).trim()] = v
                }
            }
            return result
        }
        return null
    }
}
