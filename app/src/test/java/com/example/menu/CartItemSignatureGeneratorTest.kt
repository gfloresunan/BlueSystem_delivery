package com.example.menu

import com.example.domain.engine.menu.CartItemSignatureGenerator
import com.example.domain.model.menu.SelectedOption
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class CartItemSignatureGeneratorTest {

    @Test
    fun `test generateSignatureKey produces identical key for same configuration regardless of order`() {
        val opt1 = SelectedOption(optionGroupId = "grp_1", optionId = "opt_a")
        val opt2 = SelectedOption(optionGroupId = "grp_2", optionId = "opt_b")

        val sig1 = CartItemSignatureGenerator.generateSignatureKey(
            productId = "prod_01",
            variantKey = "var_fam",
            selectedOptions = listOf(opt1, opt2)
        )

        val sig2 = CartItemSignatureGenerator.generateSignatureKey(
            productId = "prod_01",
            variantKey = "var_fam",
            selectedOptions = listOf(opt2, opt1) // Orden invertido
        )

        assertEquals("Configuraciones idénticas deben producir la misma firma de carrito", sig1, sig2)
    }

    @Test
    fun `test generateSignatureKey produces distinct keys for different option choices`() {
        val opt1 = SelectedOption(optionGroupId = "grp_1", optionId = "opt_a")
        val opt2 = SelectedOption(optionGroupId = "grp_1", optionId = "opt_b")

        val sig1 = CartItemSignatureGenerator.generateSignatureKey(
            productId = "prod_01",
            selectedOptions = listOf(opt1)
        )

        val sig2 = CartItemSignatureGenerator.generateSignatureKey(
            productId = "prod_01",
            selectedOptions = listOf(opt2)
        )

        assertNotEquals("Diferentes opciones deben producir firmas de carrito distintas", sig1, sig2)
    }
}
