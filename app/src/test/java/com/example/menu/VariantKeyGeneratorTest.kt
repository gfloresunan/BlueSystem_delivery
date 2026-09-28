package com.example.menu

import com.example.domain.engine.menu.VariantKeyGenerator
import com.example.domain.model.menu.ProductSize
import org.junit.Assert.assertEquals
import org.junit.Test

class VariantKeyGeneratorTest {

    @Test
    fun `test VariantKeyGenerator produces identical key regardless of map insertion order`() {
        val size = ProductSize(id = "size_large", name = "Familiar")

        val map1 = mapOf("Masa" to "Integral", "Orilla" to "Queso")
        val map2 = mapOf("Orilla" to "Queso", "Masa" to "Integral") // Orden invertido

        val key1 = VariantKeyGenerator.generateVariantKey("pizza_01", size, map1)
        val key2 = VariantKeyGenerator.generateVariantKey("pizza_01", size, map2)

        assertEquals("Las claves deterministas deben ser idénticas independientemente del orden de inserción", key1, key2)
        assertEquals("var_pizza_01_size_large_masa=integral_orilla=queso", key1)
    }
}
