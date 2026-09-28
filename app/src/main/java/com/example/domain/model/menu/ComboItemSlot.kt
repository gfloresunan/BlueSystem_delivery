package com.example.domain.model.menu

/**
 * Entidad de Dominio: ComboItemSlot (v2.2 Enterprise)
 * Representa un slot de selección dentro de un Combo (ej: "Plato Principal", "Bebida", "Acompañamiento").
 */
data class ComboItemSlot(
    val slotId: String = "",
    val slotName: String = "",
    val isRequired: Boolean = true,
    val allowedProductIds: List<String> = emptyList(), // Lista de productos seleccionables en este slot
    val allowVariantCustomization: Boolean = true, // Permite al cliente elegir variante (tamaño/masa)
    val allowOptionCustomization: Boolean = true, // Permite al cliente elegir opciones adicionales
    val defaultProductId: String? = null,
    val orderIndex: Int = 0
)
