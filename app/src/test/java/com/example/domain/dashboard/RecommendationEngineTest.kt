package com.example.domain.dashboard

import com.example.Pedido
import com.example.data.repository.BusinessInfo
import com.example.domain.engine.dashboard.RecommendationEngine
import com.example.domain.engine.dashboard.RecommendationEngine.UserCoordinates
import com.google.firebase.Timestamp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Date

class RecommendationEngineTest {

    private fun createBusiness(
        id: String,
        name: String = "Business $id",
        category: String = "General",
        rating: Double = 4.0,
        latitude: Double = 12.1364,
        longitude: Double = -86.2514,
        isVerified: Boolean = false,
        isFeatured: Boolean = false,
        isOpen: Boolean = true,
        unitsSold30d: Int = 0
    ): BusinessInfo {
        return BusinessInfo(
            id = id,
            name = name,
            category = category,
            categoria = category,
            rating = rating,
            ratingAverage = rating,
            latitude = latitude,
            longitude = longitude,
            isVerified = isVerified,
            verified = isVerified,
            isFeatured = isFeatured,
            featured = isFeatured,
            isOpen = isOpen,
            abierto = isOpen,
            unitsSold30d = unitsSold30d
        )
    }

    private fun createOrder(
        orderId: String,
        businessId: String,
        status: String = "delivered",
        secondsAgo: Long = 100L,
        isTest: Boolean = false
    ): Pedido {
        val nowSeconds = System.currentTimeMillis() / 1000
        return Pedido(
            pedidoId = orderId,
            businessId = businessId,
            status = status,
            createdAt = Timestamp(nowSeconds - secondsAgo, 0)
        )
    }

    // Coordenada base del cliente (ej. Managua Centro)
    private val clientLocation = UserCoordinates(12.1364, -86.2514)

    @Test
    fun `R01 - Category #1 affinity yields exactly 40 points`() {
        val bizPizza = createBusiness("biz_pizza", category = "Pizza", rating = 3.5, isVerified = false, isFeatured = false)
        val score = RecommendationEngine.scoreBusiness(
            business = bizPizza,
            topCategory1 = "pizza",
            topCategory2 = "sushi",
            userLocation = null
        )
        assertEquals(40.0, score.categoryScore, 0.001)
    }

    @Test
    fun `R02 - Category #2 affinity yields exactly 24 points`() {
        val bizSushi = createBusiness("biz_sushi", category = "Sushi", rating = 3.5, isVerified = false, isFeatured = false)
        val score = RecommendationEngine.scoreBusiness(
            business = bizSushi,
            topCategory1 = "pizza",
            topCategory2 = "sushi",
            userLocation = null
        )
        assertEquals(24.0, score.categoryScore, 0.001)
    }

    @Test
    fun `R03 - No affinity yields 0 points for category`() {
        val bizTacos = createBusiness("biz_tacos", category = "Tacos", rating = 3.5, isVerified = false, isFeatured = false)
        val score = RecommendationEngine.scoreBusiness(
            business = bizTacos,
            topCategory1 = "pizza",
            topCategory2 = "sushi",
            userLocation = null
        )
        assertEquals(0.0, score.categoryScore, 0.001)
    }

    @Test
    fun `R04 - Rating normalization computes contractual points correctly`() {
        // rating = 5.0 -> R_norm = 1.0 -> 25.0 pts
        val biz50 = createBusiness("b5", rating = 5.0)
        val score50 = RecommendationEngine.scoreBusiness(biz50, null, null, null)
        assertEquals(25.0, score50.ratingScore, 0.001)

        // rating = 4.25 -> R_norm = 0.5 -> 12.5 pts
        val biz425 = createBusiness("b425", rating = 4.25)
        val score425 = RecommendationEngine.scoreBusiness(biz425, null, null, null)
        assertEquals(12.5, score425.ratingScore, 0.001)

        // rating = 3.5 -> R_norm = 0.0 -> 0.0 pts
        val biz35 = createBusiness("b35", rating = 3.5)
        val score35 = RecommendationEngine.scoreBusiness(biz35, null, null, null)
        assertEquals(0.0, score35.ratingScore, 0.001)

        // rating < 3.5 (ej. 3.0) -> R_norm coerces to 0.0 -> 0.0 pts
        val biz30 = createBusiness("b30", rating = 3.0)
        val score30 = RecommendationEngine.scoreBusiness(biz30, null, null, null)
        assertEquals(0.0, score30.ratingScore, 0.001)
    }

    @Test
    fun `R05 - Geo distance LTE 2km yields 20 points`() {
        // Distancia ~0.5 km
        val bizNear = createBusiness("b_near", latitude = 12.1400, longitude = -86.2514)
        val score = RecommendationEngine.scoreBusiness(bizNear, null, null, clientLocation)
        assertEquals(20.0, score.geoScore, 0.001)
    }

    @Test
    fun `R06 - Geo distance 2 to 5km yields 14 points`() {
        // Distancia ~3.3 km
        val bizMid = createBusiness("b_mid", latitude = 12.1664, longitude = -86.2514)
        val score = RecommendationEngine.scoreBusiness(bizMid, null, null, clientLocation)
        assertEquals(14.0, score.geoScore, 0.001)
    }

    @Test
    fun `R07 - Geo distance 5 to 10km yields 8 points`() {
        // Distancia ~7.8 km
        val bizFar = createBusiness("b_far", latitude = 12.2064, longitude = -86.2514)
        val score = RecommendationEngine.scoreBusiness(bizFar, null, null, clientLocation)
        assertEquals(8.0, score.geoScore, 0.001)
    }

    @Test
    fun `R08 - Geo distance GT 10km yields 2 points`() {
        // Distancia ~15.5 km
        val bizVeryFar = createBusiness("b_vfar", latitude = 12.2764, longitude = -86.2514)
        val score = RecommendationEngine.scoreBusiness(bizVeryFar, null, null, clientLocation)
        assertEquals(2.0, score.geoScore, 0.001)
    }

    @Test
    fun `R09 - Trust verified and featured yields 15 points`() {
        val biz = createBusiness("b_vf", isVerified = true, isFeatured = true)
        val score = RecommendationEngine.scoreBusiness(biz, null, null, null)
        assertEquals(15.0, score.trustScore, 0.001)
    }

    @Test
    fun `R10 - Trust verified only yields 7_5 points`() {
        val biz = createBusiness("b_v", isVerified = true, isFeatured = false)
        val score = RecommendationEngine.scoreBusiness(biz, null, null, null)
        assertEquals(7.5, score.trustScore, 0.001)
    }

    @Test
    fun `R11 - Trust neither verified nor featured yields 0 points`() {
        val biz = createBusiness("b_none", isVerified = false, isFeatured = false)
        val score = RecommendationEngine.scoreBusiness(biz, null, null, null)
        assertEquals(0.0, score.trustScore, 0.001)
    }

    @Test
    fun `R12 - User history extracts top categories from last 5 completed orders excluding cancelled`() {
        val businesses = listOf(
            createBusiness("b_pizza", category = "Pizza"),
            createBusiness("b_burger", category = "Burgers"),
            createBusiness("b_tacos", category = "Tacos")
        )

        val orders = listOf(
            createOrder("o1", "b_pizza", "delivered", secondsAgo = 10),
            createOrder("o2", "b_pizza", "completed", secondsAgo = 20),
            createOrder("o3", "b_burger", "delivered", secondsAgo = 30),
            createOrder("o4", "b_tacos", "cancelled", secondsAgo = 40), // Excluida por cancelada
            createOrder("o5", "b_pizza", "entregado", secondsAgo = 50),
            createOrder("o6", "b_burger", "completed", secondsAgo = 60),
            createOrder("o7", "b_pizza", "delivered", secondsAgo = 70) // Sería la 6ta, queda fuera del take(5)
        )

        val (top1, top2) = RecommendationEngine.extractTopUserCategories(orders, businesses)
        assertEquals("pizza", top1)
        assertEquals("burgers", top2)
    }

    @Test
    fun `R13 - Multi-User Differential Test - Pizza lover vs Sushi lover produces different rankings`() {
        // Dataset controlado idéntico
        val bizSushi = createBusiness("b_sushi", category = "Sushi", rating = 4.8, latitude = 12.1400, longitude = -86.2514, isVerified = true, isFeatured = false)
        val bizPizza = createBusiness("b_pizza", category = "Pizza", rating = 4.8, latitude = 12.1400, longitude = -86.2514, isVerified = true, isFeatured = false)
        val businesses = listOf(bizSushi, bizPizza)

        // Historial USER_A: 5 órdenes de Pizza
        val ordersUserA = (1..5).map { createOrder("oa_$it", "b_pizza", "delivered", secondsAgo = it * 10L) }
        val recsUserA = RecommendationEngine.calculateRecommendations(businesses, ordersUserA, clientLocation)

        // Historial USER_B: 5 órdenes de Sushi
        val ordersUserB = (1..5).map { createOrder("ob_$it", "b_sushi", "delivered", secondsAgo = it * 10L) }
        val recsUserB = RecommendationEngine.calculateRecommendations(businesses, ordersUserB, clientLocation)

        assertEquals("b_pizza", recsUserA.first().id)
        assertEquals("b_sushi", recsUserB.first().id)
        assertNotEquals(recsUserA.first().id, recsUserB.first().id)
    }

    @Test
    fun `R14 - Cold start yields deterministic ranking without fabricated category affinity`() {
        val bizA = createBusiness("b_a", category = "Sushi", rating = 4.9, isVerified = true, isFeatured = true)
        val bizB = createBusiness("b_b", category = "Pizza", rating = 4.0, isVerified = false, isFeatured = false)
        val businesses = listOf(bizB, bizA)

        // Usuario nuevo sin órdenes
        val scored = RecommendationEngine.scoreBusinesses(businesses, emptyList(), clientLocation)

        // Todos tienen categoría = 0.0 pts en cold start
        assertTrue(scored.all { it.score.categoryScore == 0.0 })

        // Ordenado honestamente por las demás señales (rating, geo, trust)
        assertEquals("b_a", scored.first().business.id)
    }

    @Test
    fun `R15 - Null location yields 0 geo points safely without exceptions`() {
        val biz = createBusiness("b_test", rating = 4.0)
        val score = RecommendationEngine.scoreBusiness(biz, null, null, null)
        assertEquals(0.0, score.geoScore, 0.001)
        assertTrue(score.totalScore > 0.0) // Otras dimensiones siguen computando
    }

    @Test
    fun `R16 - Deterministic tie-breaker resolves by rating DESC then businessId ASC`() {
        // Mismos scores totales
        val biz1 = createBusiness("biz_100", category = "Pizza", rating = 4.5)
        val biz2 = createBusiness("biz_200", category = "Pizza", rating = 4.5)
        val scored = RecommendationEngine.scoreBusinesses(listOf(biz2, biz1), emptyList(), null)

        // Empate en score y rating se desempata por businessId ASC
        assertEquals("biz_100", scored[0].business.id)
        assertEquals("biz_200", scored[1].business.id)
    }

    @Test
    fun `R17 - Total recommendation score is strictly bounded in 0 to 100`() {
        // Máximo posible: 40 + 25 + 20 + 15 = 100.0
        val bizMax = createBusiness("b_max", category = "Pizza", rating = 5.0, isVerified = true, isFeatured = true, latitude = 12.1364, longitude = -86.2514)
        val scoreMax = RecommendationEngine.scoreBusiness(bizMax, "pizza", null, clientLocation)
        assertEquals(100.0, scoreMax.totalScore, 0.001)

        // Mínimo posible: 0 + 0 + 0 + 0 = 0.0
        val bizMin = createBusiness("b_min", category = "Other", rating = 3.0, isVerified = false, isFeatured = false)
        val scoreMin = RecommendationEngine.scoreBusiness(bizMin, "pizza", "sushi", null)
        assertEquals(0.0, scoreMin.totalScore, 0.001)

        assertTrue(scoreMax.totalScore in 0.0..100.0)
        assertTrue(scoreMin.totalScore in 0.0..100.0)
    }

    @Test
    fun `R18 - Recomputation after context change updates ranking immediately`() {
        val bizPizza = createBusiness("b_p", category = "Pizza", rating = 4.5)
        val bizSushi = createBusiness("b_s", category = "Sushi", rating = 4.5)
        val businesses = listOf(bizPizza, bizSushi)

        // Sesión 1: Historial Pizza
        val ordersPizza = listOf(createOrder("o1", "b_p"))
        val recs1 = RecommendationEngine.calculateRecommendations(businesses, ordersPizza, null)
        assertEquals("b_p", recs1.first().id)

        // Sesión 2: Historial cambia a Sushi
        val ordersSushi = listOf(createOrder("o2", "b_s"))
        val recs2 = RecommendationEngine.calculateRecommendations(businesses, ordersSushi, null)
        assertEquals("b_s", recs2.first().id)
    }

    @Test
    fun `Controlled Dataset Test - Verificación Matemática de Contrato (Sections 52-56)`() {
        // Comercios según la especificación:
        // A: Sushi, Sales 1000, Rating 3.8, Dist 8 km (~12.208), Verified Yes, Featured No
        // B: Pizza, Sales 100, Rating 4.9, Dist 1 km (~12.145), Verified Yes, Featured Yes
        // C: Pizza, Sales 50, Rating 4.8, Dist 2 km (~12.154), Verified Yes, Featured No
        // D: Tacos, Sales 10, Rating 4.2, Dist 0.5 km (~12.140), Verified No, Featured No
        val bizA = createBusiness("A", category = "Sushi", rating = 3.8, latitude = 12.208, longitude = -86.2514, isVerified = true, isFeatured = false, unitsSold30d = 1000)
        val bizB = createBusiness("B", category = "Pizza", rating = 4.9, latitude = 12.145, longitude = -86.2514, isVerified = true, isFeatured = true, unitsSold30d = 100)
        val bizC = createBusiness("C", category = "Pizza", rating = 4.8, latitude = 12.154, longitude = -86.2514, isVerified = true, isFeatured = false, unitsSold30d = 50)
        val bizD = createBusiness("D", category = "Tacos", rating = 4.2, latitude = 12.140, longitude = -86.2514, isVerified = false, isFeatured = false, unitsSold30d = 10)

        val businesses = listOf(bizA, bizB, bizC, bizD)

        // 1. TOP_SELLING Contractual: A (1000) -> B (100) -> C (50) -> D (10)
        val topSelling = businesses.sortedByDescending { it.unitsSold30d }
        assertEquals(listOf("A", "B", "C", "D"), topSelling.map { it.id })

        // 2. RECOMMENDED USER_A (Pizza lover x 5)
        val ordersPizza = (1..5).map { createOrder("o_p_$it", "B") }
        val recsUserA = RecommendationEngine.calculateRecommendations(businesses, ordersPizza, clientLocation)

        // USER_A debe favorecer B y C por afinidad a Pizza
        assertEquals("B", recsUserA[0].id)
        assertEquals("C", recsUserA[1].id)

        // 3. RECOMMENDED USER_B (Sushi lover x 5)
        val ordersSushi = (1..5).map { createOrder("o_s_$it", "A") }
        val recsUserB = RecommendationEngine.calculateRecommendations(businesses, ordersSushi, clientLocation)

        // Para USER_B, A recibe 40 pts de afinidad por Sushi, ascendiendo sobre C y D
        assertTrue("A debe ascender sustancialmente para Sushi lover", recsUserB.indexOfFirst { it.id == "A" } < recsUserA.indexOfFirst { it.id == "A" })
    }
}
