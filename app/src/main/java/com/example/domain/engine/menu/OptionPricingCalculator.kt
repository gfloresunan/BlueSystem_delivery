package com.example.domain.engine.menu

import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.SelectedOption

/**
 * Calculador de Precios de Opciones (OptionPricingCalculator - Sprint 13B.2B)
 *
 * REGLA DE NEGOCIO (Precondición 5):
 * Cuando allowFreeOptionsCount = N, las N opciones gratuitas se asignan estrictamente
 * por orden determinista de `orderIndex` ascendente (las primeras del grupo en la carta),
 * garantizando determinismo absoluto independientemente del orden de clic del cliente.
 */
object OptionPricingCalculator {

    fun calculateSelectedOptions(
        group: MenuOptionGroup,
        selectedOptions: List<MenuOption>
    ): List<SelectedOption> {
        if (selectedOptions.isEmpty()) return emptyList()

        // 1. Ordenar selecciones estrictamente por orderIndex ascendente (Determinismo)
        val sortedSelections = selectedOptions.sortedBy { it.orderIndex }
        val freeLimit = group.allowFreeOptionsCount

        // 2. Mapear respetando el límite de opciones gratuitas
        return sortedSelections.mapIndexed { index, option ->
            val isFree = index < freeLimit
            SelectedOption(
                optionGroupId = group.id,
                optionGroupName = group.name,
                optionId = option.id,
                optionName = option.name,
                additionalPrice = option.additionalPrice,
                isFreeOption = isFree,
                finalPrice = if (isFree) 0.0 else option.additionalPrice
            )
        }
    }
}
