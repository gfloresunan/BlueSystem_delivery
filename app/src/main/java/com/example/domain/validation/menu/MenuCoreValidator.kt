package com.example.domain.validation.menu

import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuVersion

/**
 * Validador de Reglas Básicas de Dominio para Entidades de Menú Core v2.2.
 */
object MenuCoreValidator {

    data class ValidationResult(
        val isValid: Boolean,
        val errors: List<String> = emptyList()
    )

    fun validateCategory(category: MenuCategory): ValidationResult {
        val errors = mutableListOf<String>()

        if (category.id.isBlank()) errors.add("El campo 'id' de la categoría no puede estar vacío.")
        if (category.restaurantId.isBlank()) errors.add("El campo 'restaurantId' no puede estar vacío.")
        if (category.primaryName.isBlank()) errors.add("El nombre principal 'primaryName' no puede estar vacío.")
        if (category.orderIndex < 0) errors.add("El 'orderIndex' debe ser mayor o igual a 0.")
        if (category.versionNumber < 1) errors.add("El 'versionNumber' de la categoría debe ser >= 1.")

        return ValidationResult(errors.isEmpty(), errors)
    }

    fun validateProduct(product: MenuProduct): ValidationResult {
        val errors = mutableListOf<String>()

        if (product.id.isBlank()) errors.add("El campo 'id' del producto no puede estar vacío.")
        if (product.restaurantId.isBlank()) errors.add("El campo 'restaurantId' no puede estar vacío.")
        if (product.primaryCategoryId.isBlank()) errors.add("El campo 'primaryCategoryId' no puede estar vacío.")
        if (product.name.isBlank()) errors.add("El nombre del producto 'name' no puede estar vacío.")
        if (product.basePrice < 0.0) errors.add("El precio base 'basePrice' no puede ser negativo.")
        if (product.taxPercentage < 0.0) errors.add("El porcentaje de impuesto 'taxPercentage' no puede ser negativo.")
        if (product.orderIndex < 0) errors.add("El 'orderIndex' debe ser mayor o igual a 0.")
        if (product.versionNumber < 1) errors.add("El 'versionNumber' del producto debe ser >= 1.")

        return ValidationResult(errors.isEmpty(), errors)
    }

    fun validateMenuVersion(version: MenuVersion): ValidationResult {
        val errors = mutableListOf<String>()

        if (version.id.isBlank()) errors.add("El campo 'id' de la versión no puede estar vacío.")
        if (version.restaurantId.isBlank()) errors.add("El campo 'restaurantId' no puede estar vacío.")
        if (version.version < 1) errors.add("El número de versión 'version' debe ser >= 1.")
        if (version.checksum.isBlank()) errors.add("El 'checksum' de la versión no puede estar vacío.")

        return ValidationResult(errors.isEmpty(), errors)
    }
}
