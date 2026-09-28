package com.example.domain.engine.intelligence

import com.example.data.repository.BusinessInfo
import com.example.domain.model.Product
import com.example.domain.model.ProductCategory
import com.example.domain.model.ProductStatus
import com.example.domain.model.Promotion
import com.example.domain.model.menu.ComboItemSlot
import com.example.domain.model.menu.MenuCombo
import com.example.domain.model.menu.MenuComboStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class EnterpriseSearchEngineTest {

    private lateinit var mockBusinesses: List<BusinessInfo>
    private lateinit var mockProducts: List<Product>
    private lateinit var mockCombos: List<MenuCombo>
    private lateinit var mockPromotions: List<Promotion>

    @Before
    fun setUp() {
        mockBusinesses = listOf(
            BusinessInfo(
                id = "biz_pizza_hut",
                name = "Pizza Hut",
                category = "Pizzería",
                address = "Altamira, Managua",
                rating = 4.8,
                active = true,
                status = "ACTIVE"
            ),
            BusinessInfo(
                id = "biz_pollo_express",
                name = "Pollo Express",
                category = "Pollo y Comida Rápida",
                address = "Plaza Inter, Managua",
                rating = 4.9,
                active = true,
                status = "ACTIVE"
            ),
            BusinessInfo(
                id = "biz_inactive",
                name = "Comercio Cerrado",
                category = "Restaurante",
                active = false,
                status = "DELETED"
            )
        )

        mockProducts = listOf(
            Product(
                id = "prod_hamburguesa",
                businessId = "biz_pollo_express",
                name = "Hamburguesa Doble con Queso",
                description = "Carne de res premium con queso cheddar y papas fritas",
                price = 180.0,
                originalPrice = 220.0,
                category = ProductCategory.MAIN_COURSE,
                categoryName = "Hamburguesas",
                status = ProductStatus.ACTIVE
            ),
            Product(
                id = "prod_pollo_plancha",
                businessId = "biz_pollo_express",
                name = "Pollo a la Plancha",
                description = "Pechuga de pollo a la plancha con ensalada y tajadas",
                price = 150.0,
                category = ProductCategory.MAIN_COURSE,
                categoryName = "Platos Fuertes",
                status = ProductStatus.ACTIVE
            ),
            Product(
                id = "prod_inactive",
                businessId = "biz_pollo_express",
                name = "Hamburguesa Inactiva",
                status = ProductStatus.INACTIVE
            ),
            Product(
                id = "prod_hidden",
                businessId = "biz_pollo_express",
                name = "Hamburguesa Oculta",
                status = ProductStatus.ACTIVE,
                isHidden = true
            )
        )

        mockCombos = listOf(
            MenuCombo(
                id = "combo_familiar_pollo",
                restaurantId = "biz_pollo_express",
                name = "Combo Familiar de Pollo",
                description = "8 piezas de pollo + papas familiares + gaseosa 2L",
                basePrice = 450.0,
                percentageDiscount = 15.0,
                slots = listOf(
                    ComboItemSlot(slotId = "s1", slotName = "Piezas de Pollo"),
                    ComboItemSlot(slotId = "s2", slotName = "Guarnición")
                ),
                status = MenuComboStatus.ACTIVE
            ),
            MenuCombo(
                id = "combo_inactive",
                restaurantId = "biz_pollo_express",
                name = "Combo Cancelado",
                status = MenuComboStatus.INACTIVE
            )
        )

        mockPromotions = listOf(
            Promotion(
                id = "promo_2x1_pollo",
                businessId = "biz_pollo_express",
                title = "2x1 en Piezas de Pollo",
                description = "Compra una pieza y llévate la segunda gratis los martes",
                discountPercentage = 50.0,
                active = true
            ),
            Promotion(
                id = "promo_cupon_pizza",
                businessId = "biz_pizza_hut",
                title = "Super Descuento Pizza",
                description = "20% de descuento en tu pizza familiar",
                couponCode = "PIZZA20",
                discountPercentage = 20.0,
                active = true
            ),
            Promotion(
                id = "promo_expired",
                businessId = "biz_pizza_hut",
                title = "Promoción Vencida",
                active = false
            )
        )
    }

    @Test
    fun test1_buscarComercio_encuentraComercio() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "Pizza",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertEquals(1, results.businesses.size)
        assertEquals("biz_pizza_hut", results.businesses.first().id)
        assertEquals(CustomerSearchResultType.BUSINESS, results.businesses.first().type)
        assertEquals("Pizza Hut", results.businesses.first().title)
    }

    @Test
    fun test2_buscarPlato_encuentraPlato() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "Hamburguesa",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertTrue(results.products.any { it.title.contains("Hamburguesa Doble", ignoreCase = true) })
        val hamburguesa = results.products.first { it.id == "prod_hamburguesa" }
        assertEquals(CustomerSearchResultType.PRODUCT, hamburguesa.type)
        assertEquals(180.0, hamburguesa.price)
    }

    @Test
    fun test3_buscarCombo_encuentraCombo() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "Combo Familiar",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertEquals(1, results.combos.size)
        val combo = results.combos.first()
        assertEquals("combo_familiar_pollo", combo.id)
        assertEquals(CustomerSearchResultType.COMBO, combo.type)
        assertEquals("Combo Familiar de Pollo", combo.title)
    }

    @Test
    fun test4_buscarPromocion_encuentraPromocion() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "2x1",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertEquals(1, results.promotions.size)
        val promo = results.promotions.first()
        assertEquals("promo_2x1_pollo", promo.id)
        assertEquals(CustomerSearchResultType.PROMOTION, promo.type)
        assertTrue(promo.title.contains("2x1"))
    }

    @Test
    fun test5_busquedaParcial_encuentraResultados() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "hambu",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertTrue(results.products.any { it.id == "prod_hamburguesa" })
    }

    @Test
    fun test6_mayusculasYMinusculas_resultadosEquivalentes() {
        val resUpper = EnterpriseSearchEngine.searchCatalog(
            query = "HAMBURGUESA",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )
        val resLower = EnterpriseSearchEngine.searchCatalog(
            query = "hamburguesa",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertEquals(resUpper.totalCount, resLower.totalCount)
        assertEquals(resUpper.products.map { it.id }, resLower.products.map { it.id })
    }

    @Test
    fun test7_sinResultados_retornaListaVacia() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "xyz123abc",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertEquals(0, results.totalCount)
        assertTrue(results.allUnified.isEmpty())
        assertTrue(results.businesses.isEmpty())
        assertTrue(results.products.isEmpty())
        assertTrue(results.combos.isEmpty())
        assertTrue(results.promotions.isEmpty())
    }

    @Test
    fun test8_queryVacia_retornaVacio() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertEquals(0, results.totalCount)
        assertTrue(results.allUnified.isEmpty())
    }

    @Test
    fun test9_normalizacionAcentos_encuentraPlatoConAcento() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "pláncha",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertTrue(results.products.any { it.id == "prod_pollo_plancha" })
    }

    @Test
    fun test10_excluyeComerciosInactivosYEliminados() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "Comercio Cerrado",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertEquals(0, results.businesses.size)
    }

    @Test
    fun test11_excluyeProductosInactivosYOcultos() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "Hamburguesa Inactiva",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertTrue(results.products.none { it.id == "prod_inactive" })
        assertTrue(results.products.none { it.id == "prod_hidden" })
    }

    @Test
    fun test12_excluyePromocionesInactivas() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "Promoción Vencida",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertTrue(results.promotions.none { it.id == "promo_expired" })
    }

    @Test
    fun test13_busquedaMultiEntidad_encuentraTodasLasEntidades() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "pollo",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        // "pollo" coincide con:
        // 1. Comercio: "Pollo Express"
        // 2. Plato: "Pollo a la Plancha"
        // 3. Combo: "Combo Familiar de Pollo"
        // 4. Promoción: "2x1 en Piezas de Pollo"
        assertTrue(results.businesses.any { it.id == "biz_pollo_express" })
        assertTrue(results.products.any { it.id == "prod_pollo_plancha" })
        assertTrue(results.combos.any { it.id == "combo_familiar_pollo" })
        assertTrue(results.promotions.any { it.id == "promo_2x1_pollo" })
        assertTrue(results.totalCount >= 4)
    }

    @Test
    fun test14_rankingRelevancia_priorizaCoincidenciaExacta() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "Pollo Express",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertNotNull(results.allUnified.firstOrNull())
        assertEquals("biz_pollo_express", results.allUnified.first().id)
        assertEquals(CustomerSearchResultType.BUSINESS, results.allUnified.first().type)
    }

    @Test
    fun test15_buscarPorComercio_priorizaPlatosDelComercio() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "que platos tiene Pollo Express",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertTrue(results.products.isNotEmpty())
        assertTrue("Los productos del comercio Pollo Express deben estar en el resultado",
            results.products.any { it.businessId == "biz_pollo_express" })
    }

    @Test
    fun test16_buscarDescuentos_priorizaProductosConDescuento() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "productos con descuento",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertTrue(results.products.isNotEmpty())
        val topProduct = results.products.first()
        assertEquals("prod_hamburguesa", topProduct.id)
        assertTrue("El producto en oferta debe tener discountTag o precio rebajado",
            topProduct.originalPrice != null && topProduct.originalPrice!! > (topProduct.price ?: 0.0))
    }

    @Test
    fun test17_buscarBarato_priorizaProductosPorPrecioAscendente() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "quiero algo barato",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertTrue(results.products.isNotEmpty())
        // Pollo a la plancha cuesta C$ 150 (sin descuento) vs Hamburguesa C$ 180 (con descuento de C$ 220)
        // La intención "barato" debe posicionar primero el de C$ 150
        val firstProduct = results.products.first()
        assertEquals("prod_pollo_plancha", firstProduct.id)
        assertEquals(150.0, firstProduct.price)
    }

    @Test
    fun test18_buscarRestaurantes_retornaExclusivamenteComerciosReales() {
        val results = EnterpriseSearchEngine.searchCatalog(
            query = "qué restaurantes hay",
            businesses = mockBusinesses,
            products = mockProducts,
            combos = mockCombos,
            promotions = mockPromotions
        )

        assertTrue(results.businesses.isNotEmpty())
        val validIds = mockBusinesses.filter { it.status == "ACTIVE" }.map { it.id }.toSet()
        results.businesses.forEach { bizResult ->
            assertTrue("El comercio devuelto '${bizResult.title}' debe pertenecer al catálogo real de BlueSystem",
                validIds.contains(bizResult.id))
        }
    }
}
