package com.example.domain.repository.menu

import com.example.domain.model.menu.MenuAuditEvent

interface IMenuAuditRepository {
    suspend fun recordEvent(event: MenuAuditEvent)
    suspend fun getAuditHistory(restaurantId: String): List<MenuAuditEvent>
}
