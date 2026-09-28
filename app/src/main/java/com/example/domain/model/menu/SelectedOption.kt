package com.example.domain.model.menu

/**
 * Contrato de Salida Inmutable: SelectedOption (v2.2 Enterprise)
 * Representa la selección realizada por un cliente en un grupo de opciones para un producto.
 * Prepara la estructura inmutable consumible por el carrito de compras (CartItem).
 */
data class SelectedOption(
    val optionGroupId: String = "",
    val optionGroupName: String = "",
    val optionId: String = "",
    val optionName: String = "",
    val additionalPrice: Double = 0.0,
    val isFreeOption: Boolean = false,
    val finalPrice: Double = if (isFreeOption) 0.0 else additionalPrice
)
