package com.example.domain.model.menu

enum class MenuAuditEventType {
    MENU_PUBLISHED,
    MENU_ARCHIVED,
    SNAPSHOT_CREATED,
    SNAPSHOT_RESTORED,
    ROLLBACK_EXECUTED
}

data class MenuAuditEvent(
    val id: String = "",
    val restaurantId: String = "",
    val eventType: MenuAuditEventType = MenuAuditEventType.MENU_PUBLISHED,
    val semanticVersion: String = "",
    val userId: String = "",
    val changeReason: String = "",
    val timestamp: Long = System.currentTimeMillis(),
    val metadata: Map<String, String> = emptyMap()
)
