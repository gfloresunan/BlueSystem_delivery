package com.example.domain.engine.menu

import com.example.domain.model.menu.AvailabilitySchedule
import com.example.domain.model.menu.MenuCombo
import com.example.domain.model.menu.MenuProduct
import java.time.LocalDateTime

data class AvailableProductWrapper(
    val product: MenuProduct,
    val isAvailableForOrder: Boolean,
    val unavailableReason: String? = null,
    val nextAvailableTime: String? = null
)

data class AvailableComboWrapper(
    val combo: MenuCombo,
    val isAvailableForOrder: Boolean,
    val unavailableReason: String? = null
)

/**
 * Filtro de Disponibilidad de Cliente (CustomerAvailabilityFilter - Sprint 13B.5C)
 *
 * Aplica reglas de horario y stock para marcar productos y combos antes del renderizado en el Cliente.
 */
object CustomerAvailabilityFilter {

    private val availabilityEngine = AvailabilityEngineImpl()

    fun filterProducts(
        products: List<MenuProduct>,
        schedulesMap: Map<String, AvailabilitySchedule> = emptyMap(),
        currentDateTime: LocalDateTime = LocalDateTime.now()
    ): List<AvailableProductWrapper> {
        return products.map { product ->
            val schedule = product.availabilityScheduleId?.let { schedulesMap[it] }
            val result = availabilityEngine.evaluateAvailability(
                schedule = schedule,
                currentDateTime = currentDateTime,
                isStockDepleted = (product.status == com.example.domain.model.menu.MenuProductStatus.OUT_OF_STOCK),
                productId = product.id,
                restaurantId = product.restaurantId
            )

            AvailableProductWrapper(
                product = product,
                isAvailableForOrder = result.isAvailable,
                unavailableReason = if (!result.isAvailable) result.reason else null,
                nextAvailableTime = result.nextAvailableTime
            )
        }
    }

    fun filterCombos(
        combos: List<MenuCombo>,
        currentDateTime: LocalDateTime = LocalDateTime.now()
    ): List<AvailableComboWrapper> {
        return combos.map { combo ->
            val isAvailable = (combo.status == com.example.domain.model.menu.MenuComboStatus.ACTIVE)
            AvailableComboWrapper(
                combo = combo,
                isAvailableForOrder = isAvailable,
                unavailableReason = if (!isAvailable) "COMBO_INACTIVE_OR_OUT_OF_STOCK" else null
            )
        }
    }
}
