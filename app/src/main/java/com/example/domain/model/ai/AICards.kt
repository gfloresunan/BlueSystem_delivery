package com.example.domain.model.ai

/**
 * Discriminante para Polimorfismo de Tarjetas de IA
 */
enum class AICardType {
    PRODUCT_CARD,
    BUSINESS_CARD,
    ORDER_CARD,
    TRACKING_CARD
}

/**
 * Interfaz Sellada Base para Proyecciones Visuales de IA (Cards)
 */
sealed interface AICard {
    val cardType: AICardType
    val action: AIAction?
}

/**
 * Proyección Sanitizada de Producto para la UI del Asistente
 * INVARIANTE: No expone costos, márgenes, ni tokens internos. El precio es autoritativo de catálogo.
 */
data class AIProductCard(
    override val cardType: AICardType = AICardType.PRODUCT_CARD,
    val productId: String,
    val businessId: String,
    val businessName: String,
    val name: String,
    val description: String = "",
    val price: Double,
    val originalPrice: Double? = null,
    val discountPercentage: Int = 0,
    val imageUrl: String = "",
    val rating: Double = 0.0,
    val isAvailable: Boolean = true,
    val hasRequiredOptions: Boolean = false,
    override val action: AIAction? = null
) : AICard

/**
 * Proyección Sanitizada de Comercio para la UI del Asistente
 * INVARIANTE: No expone datos bancarios, fiscales ni configuraciones privadas.
 */
data class AIBusinessCard(
    override val cardType: AICardType = AICardType.BUSINESS_CARD,
    val businessId: String,
    val name: String,
    val category: String = "",
    val logoUrl: String = "",
    val rating: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val distanceKm: Double = 0.0,
    val formattedDistance: String = "",
    val estimatedDeliveryMinutes: Int = 0,
    val isOpen: Boolean = true,
    override val action: AIAction? = null
) : AICard

/**
 * Proyección Sanitizada de Pedido para la UI del Asistente
 * INVARIANTE: La identidad del pedido es autoritativa. No expone credenciales ni PII ajeno.
 */
data class AIOrderCard(
    override val cardType: AICardType = AICardType.ORDER_CARD,
    val orderId: String,
    val businessName: String,
    val status: String,
    val statusLabel: String,
    val itemsSummary: String,
    val total: Double,
    val paymentMethod: String,
    val createdAtFormatted: String = "",
    val courierAssigned: Boolean = false,
    override val action: AIAction? = null
) : AICard

/**
 * Proyección Sanitizada y Derivada de Telemetría de Seguimiento
 * INVARIANTE ABSOLUTA: PROHIBIDO incluir lat/lng raw, UID de repartidor, teléfono o FCM token.
 */
data class AITrackingCard(
    override val cardType: AICardType = AICardType.TRACKING_CARD,
    val orderId: String,
    val status: String,
    val statusLabel: String,
    val courierDisplayName: String = "Repartidor Asignado",
    val courierPlate: String = "",
    val distanceKm: Double = 0.0,
    val etaMinutes: Int = 0,
    val signalFreshnessSeconds: Int = 0,
    val isMoving: Boolean = false,
    override val action: AIAction? = null
) : AICard
