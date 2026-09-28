package com.example.domain.model

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class SystemConfig(
    val maintenanceMode: Boolean = false,
    val maintenanceMessage: String = "",
    val minimumVersion: Int = 1,
    val forceUpdate: Boolean = false,
    val allowGuest: Boolean = true,
    val showPromotions: Boolean = true,
    val supportPhone: String = "",
    val supportWhatsapp: String = "",
    val defaultCountry: String = "NI",
    val defaultCurrency: String = "NIO",
    val primaryColor: String = "#1565C0",
    val appName: String = "BlueSystem Delivery",
    val additionalChargeEnabled: Boolean = false,
    val additionalChargeAmount: Double = 0.0,
    val additionalChargeDescription: String = "Cargo adicional por servicio",
    val additionalChargePolicyId: String = "global_delivery_charge",
    val additionalChargePolicyVersion: Int = 1,
    val appUpdate: AppUpdateConfig? = null
)
