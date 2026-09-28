package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuProduct

data class OptionValidationResult(
    val isValid: Boolean,
    val errors: List<String> = emptyList()
)

interface IOptionValidationEngine {
    fun validateOptionGroup(group: MenuOptionGroup): OptionValidationResult
    fun validateProductOptionGroupLink(
        product: MenuProduct,
        availableGroups: List<MenuOptionGroup>
    ): OptionValidationResult
}

/**
 * Servidor de Dominio: OptionValidationEngineImpl (Sprint 13B.2B)
 * Garantiza la integridad de las reglas de negocio de los grupos de opciones.
 */
class OptionValidationEngineImpl : IOptionValidationEngine {

    override fun validateOptionGroup(group: MenuOptionGroup): OptionValidationResult {
        val errors = mutableListOf<String>()

        if (group.name.isBlank()) {
            errors.add("El nombre del grupo de opciones no puede estar vacío.")
        }
        if (group.minSelection < 0) {
            errors.add("La selección mínima (minSelection) no puede ser negativa.")
        }
        if (group.maxSelection < 1) {
            errors.add("La selección máxima (maxSelection) debe ser al menos 1.")
        }
        if (group.minSelection > group.maxSelection) {
            errors.add("La selección mínima minSelection (${group.minSelection}) no puede superar a la selección máxima maxSelection (${group.maxSelection}).")
        }
        if (group.isRequired && group.minSelection < 1) {
            errors.add("Un grupo marcado como obligatorio (isRequired=true) debe exigir minSelection >= 1.")
        }
        if (group.allowFreeOptionsCount < 0) {
            errors.add("El contador de opciones gratuitas (allowFreeOptionsCount) no puede ser negativo.")
        }

        return OptionValidationResult(isValid = errors.isEmpty(), errors = errors)
    }

    override fun validateProductOptionGroupLink(
        product: MenuProduct,
        availableGroups: List<MenuOptionGroup>
    ): OptionValidationResult {
        val errors = mutableListOf<String>()
        val availableIds = availableGroups.map { it.id }.toSet()

        // Verificación de duplicados en optionGroupIds
        if (product.optionGroupIds.size != product.optionGroupIds.toSet().size) {
            errors.add("El producto '${product.name}' contiene IDs de grupos de opciones duplicados.")
        }

        // Verificación de existencia N:M
        for (groupId in product.optionGroupIds) {
            if (groupId !in availableIds) {
                errors.add("El producto '${product.name}' referencia al grupo de opciones inexistente ID '$groupId'.")
            }
        }

        return OptionValidationResult(isValid = errors.isEmpty(), errors = errors)
    }
}
