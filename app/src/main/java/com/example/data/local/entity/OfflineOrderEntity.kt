package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters

@Entity(tableName = "offline_orders")
data class OfflineOrderEntity(
    @PrimaryKey
    val orderId: String = "",
    val businessId: String = "",
    val businessName: String = "",
    val customerId: String = "",
    val customerName: String = "",
    val customerPhone: String = "",
    val customerAddress: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val total: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val status: String = "",
    val courierPhase: Int? = null,
    val assignedCourierId: String = "",
    val itemsJson: String = "",
    val paymentMethod: String = "",
    val amountPaid: Double? = null,
    val receiptUrl: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)
