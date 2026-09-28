package com.example.menu

import com.example.domain.engine.menu.VariantMatrixEngineImpl
import com.example.domain.model.menu.ProductSize
import com.example.domain.model.menu.VariantDimension
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class VariantMatrixStressTest {

    private val matrixEngine = VariantMatrixEngineImpl()

    @Test
    fun `test extreme variant matrix generation performance with 1000 combinations and cache hit verification`() {
        // Simulación de límites operativos máximos recomendados:
        // 10 Tamaños x 1 Dimensión de 10 opciones x 1 Dimensión de 10 opciones = 1,000 combinaciones
        val sizes = (1..10).map { s ->
            ProductSize(id = "s_$s", name = "Tamaño $s", priceAdjustment = (s * 10).toDouble())
        }

        val dimensions = listOf(
            VariantDimension(id = "dim_1", name = "Sabor", options = (1..10).map { "Sabor $it" }),
            VariantDimension(id = "dim_2", name = "Presentación", options = (1..10).map { "Presentación $it" })
        )

        // 1. Primera ejecución (Cache Miss & Generación Matricial)
        val startTime = System.currentTimeMillis()
        val variants = matrixEngine.generateVariantMatrix(
            productId = "prod_massive_01",
            restaurantId = "rest_01",
            sizes = sizes,
            dimensions = dimensions,
            basePrice = 100.0
        )
        val missTime = System.currentTimeMillis() - startTime

        assertEquals("Debe generar exactamente 1,000 combinaciones de variantes", 1000, variants.size)
        assertTrue("La primera generación masiva (Miss) debe tardar menos de 200ms", missTime < 200)

        // 2. Segunda ejecución (Cache Hit)
        val hitStartTime = System.currentTimeMillis()
        val cachedVariants = matrixEngine.generateVariantMatrix(
            productId = "prod_massive_01",
            restaurantId = "rest_01",
            sizes = sizes,
            dimensions = dimensions,
            basePrice = 100.0
        )
        val hitTime = System.currentTimeMillis() - hitStartTime

        assertEquals(1000, cachedVariants.size)
        assertTrue("La recuperación por caché (Hit) debe ser instantánea (<10ms)", hitTime < 10)
    }
}
