package com.example.data.dto.menu

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class MenuAuditEventDto(
    var id: String = "",
    var restaurantId: String = "",
    var eventType: String = "MENU_PUBLISHED",
    var semanticVersion: String = "",
    var userId: String = "",
    var changeReason: String = "",
    var timestamp: Long = 0L,
    var metadata: Map<String, String> = emptyMap()
)
