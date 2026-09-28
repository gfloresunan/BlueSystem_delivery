package com.example.data.mapper.menu

import com.example.data.dto.menu.AvailabilityScheduleDto
import com.example.data.dto.menu.DayScheduleDto
import com.example.data.dto.menu.TimeRangeDto
import com.example.domain.model.menu.AvailabilitySchedule
import com.example.domain.model.menu.DaySchedule
import com.example.domain.model.menu.TimeRange
import java.time.DayOfWeek

/**
 * Mapper Bivalente: AvailabilityMapper (v2.2 Enterprise)
 */
object AvailabilityMapper {

    fun rangeToDomain(dto: TimeRangeDto): TimeRange {
        return TimeRange(startTime = dto.startTime, endTime = dto.endTime)
    }

    fun rangeToDto(domain: TimeRange): TimeRangeDto {
        return TimeRangeDto(startTime = domain.startTime, endTime = domain.endTime)
    }

    fun dayToDomain(dto: DayScheduleDto): DaySchedule {
        val dayEnum = try {
            DayOfWeek.valueOf(dto.dayOfWeek.uppercase())
        } catch (e: Exception) {
            DayOfWeek.MONDAY
        }

        return DaySchedule(
            dayOfWeek = dayEnum,
            timeRanges = dto.timeRanges.map { rangeToDomain(it) },
            isOpen = dto.isOpen
        )
    }

    fun dayToDto(domain: DaySchedule): DayScheduleDto {
        return DayScheduleDto(
            dayOfWeek = domain.dayOfWeek.name,
            timeRanges = domain.timeRanges.map { rangeToDto(it) },
            isOpen = domain.isOpen
        )
    }

    fun scheduleToDomain(dto: AvailabilityScheduleDto): AvailabilitySchedule {
        return AvailabilitySchedule(
            id = dto.id,
            restaurantId = dto.restaurantId,
            branchId = dto.branchId,
            name = dto.name,
            weeklySchedules = dto.weeklySchedules.map { dayToDomain(it) },
            isTemporaryPaused = dto.isTemporaryPaused,
            pausedUntilTimestamp = dto.pausedUntilTimestamp,
            pauseReason = dto.pauseReason,
            createdAt = dto.createdAt,
            updatedAt = dto.updatedAt
        )
    }

    fun scheduleToDto(domain: AvailabilitySchedule): AvailabilityScheduleDto {
        return AvailabilityScheduleDto(
            id = domain.id,
            restaurantId = domain.restaurantId,
            branchId = domain.branchId,
            name = domain.name,
            weeklySchedules = domain.weeklySchedules.map { dayToDto(it) },
            isTemporaryPaused = domain.isTemporaryPaused,
            pausedUntilTimestamp = domain.pausedUntilTimestamp,
            pauseReason = domain.pauseReason,
            createdAt = domain.createdAt,
            updatedAt = domain.updatedAt
        )
    }
}
