package com.example.data.mapper.menu

import com.example.data.dto.menu.MenuAuditEventDto
import com.example.domain.model.menu.MenuAuditEvent
import com.example.domain.model.menu.MenuAuditEventType

object MenuAuditMapper {

    fun toDomain(dto: MenuAuditEventDto): MenuAuditEvent {
        val type = try {
            MenuAuditEventType.valueOf(dto.eventType)
        } catch (e: Exception) {
            MenuAuditEventType.MENU_PUBLISHED
        }

        return MenuAuditEvent(
            id = dto.id,
            restaurantId = dto.restaurantId,
            eventType = type,
            semanticVersion = dto.semanticVersion,
            userId = dto.userId,
            changeReason = dto.changeReason,
            timestamp = dto.timestamp,
            metadata = dto.metadata
        )
    }

    fun toDto(domain: MenuAuditEvent): MenuAuditEventDto {
        return MenuAuditEventDto(
            id = domain.id,
            restaurantId = domain.restaurantId,
            eventType = domain.eventType.name,
            semanticVersion = domain.semanticVersion,
            userId = domain.userId,
            changeReason = domain.changeReason,
            timestamp = domain.timestamp,
            metadata = domain.metadata
        )
    }
}
