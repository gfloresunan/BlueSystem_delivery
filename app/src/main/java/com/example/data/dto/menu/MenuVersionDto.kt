package com.example.data.dto.menu

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class MenuVersionDto(
    var id: String = "",
    var restaurantId: String = "",
    var version: Long = 1L,
    var checksum: String = "",
    var generatedAt: Long = 0L,
    var publishedAt: Long? = null,
    var generatedBy: String = "SYSTEM",
    var schemaVersion: String = "2.2.0",
    var menuHash: String = "",
    var status: String = "BUILDING"
)
