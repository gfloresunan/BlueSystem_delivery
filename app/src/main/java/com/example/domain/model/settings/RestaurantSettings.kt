package com.example.domain.model.settings

/**
 * Objeto Raíz de Configuración Unificada del Restaurante (RestaurantSettings - 19 Módulos)
 */
data class RestaurantSettings(
    val restaurantId: String = "",
    val commercialName: String = "",
    val legalName: String = "",
    val description: String = "",
    val cuisineType: String = "Restaurante",
    val category: String = "Restaurante",
    val phone: String = "",
    val whatsapp: String = "",
    val address: String = "",
    val currencySymbol: String = "C$",
    val timezone: String = "America/Managua",

    val isOpen: Boolean = true,

    val branches: List<BranchConfig> = emptyList(),
    val activeBranchId: String = "main_branch",

    val schedule: WeeklySchedule = WeeklySchedule(),
    val scheduleText: String = "",

    val maxDeliveryRadiusKm: Double = 5.0,
    val deliveryFee: Double = 45.0,
    val freeDeliveryThreshold: Double = 500.0,
    val minimumOrderAmount: Double = 100.0,
    val deliveryTime: String = "20-35 min",

    val acceptCashPayment: Boolean = true,
    val acceptCardPayment: Boolean = true,
    val acceptTransferPayment: Boolean = true,

    val vatTaxPercentage: Double = 15.0,

    val prepTimeMinutes: Int = 20,
    val autoPrintOrders: Boolean = false,
    val autoAssignCouriers: Boolean = false,
    val smartCourierSuggestion: Boolean = true,

    val branding: BrandingConfig = BrandingConfig(),
    val logoUrl: String = "",
    val bannerUrl: String = "",

    val readiness: ReadinessChecklist = ReadinessChecklist(),
    val changeHistory: List<AuditLogEntry> = emptyList(),

    val version: Int = 1,
    val checksumSha256: String = "",
    val updatedAtMs: Long = System.currentTimeMillis()
)

data class AuditLogEntry(
    val id: String = "log_${System.currentTimeMillis()}",
    val userName: String = "Administrador",
    val action: String = "Actualización",
    val detail: String = "",
    val timeAgo: String = "Reciente",
    val timestampMs: Long = System.currentTimeMillis()
)
