package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import java.util.UUID

@Entity(tableName = "pending_actions")
data class PendingActionEntity(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val orderId: String = "",
    val actionType: String,
    val payload: String,
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val status: String = "PENDING",
    val lastError: String? = null
)
