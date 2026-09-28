package com.example.eiam.domain.model

import com.google.firebase.Timestamp

/** EIAM — CustomerProfile (separado de Identity) */
data class CustomerProfile(
    val uid: String = "",
    val displayName: String = "",
    val firstName: String = "",
    val lastName: String = "",
    val phone: String = "",
    val photoUrl: String = "",
    val birthDate: String = "",
    val gender: String = "",
    val addresses: List<CustomerAddress> = emptyList(),
    val favoriteBusinessIds: List<String> = emptyList(),
    val favoriteProductIds: List<String> = emptyList(),
    val vipStatus: VipStatus = VipStatus.STANDARD,
    val loyaltyPoints: Int = 0,
    val totalOrders: Int = 0,
    val totalSpent: Double = 0.0,
    val preferredPaymentMethod: String = "",
    val language: String = "es",
    val theme: String = "dark",
    val pushEnabled: Boolean = true,
    val emailEnabled: Boolean = true,
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)

data class CustomerAddress(
    val addressId: String = "",
    val label: String = "Casa",
    val fullAddress: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val instructions: String = "",
    val isDefault: Boolean = false
)

enum class VipStatus { STANDARD, SILVER, GOLD, PLATINUM }
