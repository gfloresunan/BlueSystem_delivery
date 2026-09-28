package com.example.domain.model.menu

/**
 * Contrato de Salida Inmutable: SelectedComboSlot (v2.2 Enterprise)
 * Representa la selección inmutable realizada por el cliente para un slot de combo específico.
 */
data class SelectedComboSlot(
    val slotId: String = "",
    val slotName: String = "",
    val selectedProductId: String = "",
    val selectedProductName: String = "",
    val selectedVariantKey: String? = null,
    val selectedOptions: List<SelectedOption> = emptyList(),
    val slotExtraPrice: Double = 0.0
)
