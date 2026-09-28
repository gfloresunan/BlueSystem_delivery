package com.example.enterprise.communication.advanced

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class TemplateStudioEngineTest {

    private val studio = TemplateStudioEngine()

    @Test
    fun `test Template Studio saves versioned templates and renders dynamic variables`() {
        val template = StudioTemplate(
            templateId = "tmpl_invoice",
            name = "Factura de Pedido {orderId}",
            htmlBody = "<h1>Factura {orderId}</h1><p>Monto: C${'$'}{total}</p>"
        )

        studio.saveTemplate(template)
        val rendered = studio.renderTemplate("tmpl_invoice", mapOf("orderId" to "o_888", "total" to 450.0))

        assertNotNull(rendered)
        assertEquals("Factura de Pedido o_888", rendered?.first)
        assertEquals("<h1>Factura o_888</h1><p>Monto: C$450.0</p>", rendered?.second)
    }
}
