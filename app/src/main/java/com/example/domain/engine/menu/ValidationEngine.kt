package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuCategory
import com.example.domain.model.menu.MenuProduct
import com.example.domain.model.menu.MenuVersion
import com.example.domain.validation.menu.MenuCoreValidator

interface IValidationEngine {
    fun validateCategory(category: MenuCategory): MenuCoreValidator.ValidationResult
    fun validateProduct(product: MenuProduct): MenuCoreValidator.ValidationResult
    fun validateMenuVersion(version: MenuVersion): MenuCoreValidator.ValidationResult
    fun validateMenuForPublishing(
        categories: List<MenuCategory>,
        products: List<MenuProduct>
    ): MenuCoreValidator.ValidationResult
}

/**
 * Servidor de Dominio: ValidationEngineImpl (Sprint 13B.1B)
 * Encargado del control de integridad del catálogo delimitado estrictamente al alcance Core v2.2.
 */
class ValidationEngineImpl : IValidationEngine {

    override fun validateCategory(category: MenuCategory): MenuCoreValidator.ValidationResult {
        return MenuCoreValidator.validateCategory(category)
    }

    override fun validateProduct(product: MenuProduct): MenuCoreValidator.ValidationResult {
        return MenuCoreValidator.validateProduct(product)
    }

    override fun validateMenuVersion(version: MenuVersion): MenuCoreValidator.ValidationResult {
        return MenuCoreValidator.validateMenuVersion(version)
    }

    override fun validateMenuForPublishing(
        categories: List<MenuCategory>,
        products: List<MenuProduct>
    ): MenuCoreValidator.ValidationResult {
        val errors = mutableListOf<String>()

        if (categories.isEmpty()) {
            errors.add("El menú debe contener al menos 1 categoría activa para ser publicado.")
        }

        if (products.isEmpty()) {
            errors.add("El menú debe contener al menos 1 producto para ser publicado.")
        }

        // Verificar que todos los productos estén vinculados a una categoría existente
        val categoryIds = categories.map { it.id }.toSet()
        products.forEach { prod ->
            if (prod.primaryCategoryId.isNotBlank() && !categoryIds.contains(prod.primaryCategoryId)) {
                errors.add("El producto '${prod.name}' está asociado a una categoría inexistente ('${prod.primaryCategoryId}').")
            }

            val prodValidation = validateProduct(prod)
            if (!prodValidation.isValid) {
                errors.addAll(prodValidation.errors)
            }
        }

        categories.forEach { cat ->
            val catValidation = validateCategory(cat)
            if (!catValidation.isValid) {
                errors.addAll(catValidation.errors)
            }
        }

        return MenuCoreValidator.ValidationResult(errors.isEmpty(), errors)
    }
}
