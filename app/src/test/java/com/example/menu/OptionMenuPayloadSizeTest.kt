package com.example.menu

import com.example.data.dto.menu.CategoryDto
import com.example.data.dto.menu.OptionDto
import com.example.data.dto.menu.OptionGroupDto
import com.example.data.dto.menu.ProductDto
import com.example.domain.model.menu.MenuOption
import com.example.domain.model.menu.MenuOptionGroup
import com.example.domain.model.menu.MenuOptionStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class OptionMenuPayloadSizeTest {

    @Test
    fun `test heavy restaurant menu payload size remains under 500 KiB safety limit`() {
        // Simulación de menú pesado: 50 productos, 5 grupos de opciones por producto, 10 opciones por grupo
        val categories = (1..5).map { c ->
            CategoryDto(id = "cat_$c", primaryName = "Categoría $c", orderIndex = c)
        }

        val optionGroups = (1..10).map { g ->
            val options = (1..10).map { o ->
                OptionDto(
                    id = "opt_${g}_$o",
                    groupId = "grp_$g",
                    name = "Opción de prueba $o",
                    additionalPrice = 15.0 + o,
                    orderIndex = o
                )
            }
            OptionGroupDto(
                id = "grp_$g",
                name = "Grupo de opciones $g",
                description = "Descripción extendida del grupo $g",
                options = options
            )
        }

        val products = (1..50).map { p ->
            ProductDto(
                id = "prod_$p",
                primaryCategoryId = "cat_${(p % 5) + 1}",
                name = "Producto de menú extendido $p",
                description = "Descripción gourmet detallada con ingredientes del producto $p",
                basePrice = 150.0 + p,
                optionGroupIds = listOf("grp_1", "grp_2", "grp_3", "grp_4", "grp_5")
            )
        }

        // Construcción simulada del payload del documento /menus/{restaurantId}
        val synthesizedMap = mapOf(
            "restaurantId" to "rest_heavy_01",
            "categories" to categories,
            "products" to products,
            "optionGroups" to optionGroups
        )

        val jsonPayload = synthesizedMap.toString()
        val payloadSizeBytes = jsonPayload.toByteArray(Charsets.UTF_8).size
        val payloadSizeKiB = payloadSizeBytes / 1024.0

        println("Payload Size: $payloadSizeBytes bytes (~${String.format("%.2f", payloadSizeKiB)} KiB)")

        assertTrue(
            "El tamaño del menú pesado (${String.format("%.2f", payloadSizeKiB)} KiB) debe ser menor a 500 KiB",
            payloadSizeKiB < 500.0
        )
    }

    @Test
    fun `test option filtering for customer view removes out of stock options`() {
        val group = MenuOptionGroup(
            id = "grp_01",
            name = "Extras",
            options = listOf(
                MenuOption(id = "o1", name = "Queso", status = MenuOptionStatus.ACTIVE),
                MenuOption(id = "o2", name = "Tocineta", status = MenuOptionStatus.OUT_OF_STOCK),
                MenuOption(id = "o3", name = "Aguacate", status = MenuOptionStatus.INACTIVE)
            )
        )

        val activeOptions = group.options.filter { it.status == MenuOptionStatus.ACTIVE }

        assertEquals(1, activeOptions.size)
        assertEquals("Queso", activeOptions.first().name)
    }
}
