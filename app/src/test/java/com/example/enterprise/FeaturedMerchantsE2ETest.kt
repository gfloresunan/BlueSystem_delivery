package com.example.enterprise

import com.example.data.repository.BusinessInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Suite E2E y de Invariantes Arquitectónicas para la Actividad #17: Comercios Destacados (Featured Merchants)
 * Protocolo: BSD-ACT17-FEATURED-MERCHANTS-ENTERPRISE-001
 */
class FeaturedMerchantsE2ETest {

    // ─────────────────────────────────────────────────────────────────────────
    // C01 & C02: FEATURED FILTERING Y VALIDACIÓN DE CATÁLOGO
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `test C01 and C02 - Featured merchant appears in featured and non-featured does not`() {
        val featuredBiz = BusinessInfo(
            id = "biz_featured_001",
            name = "Restaurante El Destacado",
            category = "Restaurante",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isFeatured = true,
            featured = true
        )

        val regularBiz = BusinessInfo(
            id = "biz_regular_002",
            name = "Pulpería La Esperanza",
            category = "Supermercado",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isFeatured = false,
            featured = false
        )

        val catalog = listOf(featuredBiz, regularBiz)

        // Ambos son ítems válidos en el catálogo general
        val validCatalog = catalog.filter { it.isValidPublicCatalogItem() }
        assertEquals(2, validCatalog.size)

        // Solo el featured aparece en la sección de Comercios Destacados ⭐
        val featuredList = validCatalog.filter { it.getEffectiveIsFeatured() }
        assertEquals(1, featuredList.size)
        assertEquals("Restaurante El Destacado", featuredList.first().getEffectiveName())
        assertTrue(featuredList.first().getEffectiveIsFeatured())
        assertFalse(regularBiz.getEffectiveIsFeatured())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // C03 & C04: SEPARACIÓN CONCEPTUAL ESTRICTA (FEATURED vs POPULAR)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `test C03 - Popular merchant can be popular without being featured`() {
        val popularOnlyBiz = BusinessInfo(
            id = "biz_popular_003",
            name = "Taquería Popular",
            category = "Restaurante",
            rating = 4.9,
            ratingCount = 350,
            reviewsCount = 350,
            isActive = true,
            active = true,
            status = "ACTIVE",
            isFeatured = false,
            featured = false
        )

        // Verificación de alta popularidad por métricas
        val isHighlyRated = popularOnlyBiz.getEffectiveRating() >= 4.5 && popularOnlyBiz.getEffectiveRatingCount() > 50
        assertTrue("El comercio debe calificar como popular por sus métricas", isHighlyRated)

        // Pero NO debe ser clasificado como Featured
        assertFalse("Popular NO debe forzar isFeatured = true", popularOnlyBiz.getEffectiveIsFeatured())
    }

    @Test
    fun `test C04 - Featured merchant can be featured without having high popular volume`() {
        val newFeaturedBiz = BusinessInfo(
            id = "biz_new_featured_004",
            name = "Café Gourmet Nuevo (Destacado por Admin)",
            category = "Cafetería",
            rating = 0.0, // Sin calificaciones aún
            ratingCount = 0,
            isActive = true,
            active = true,
            status = "ACTIVE",
            isFeatured = true,
            featured = true
        )

        // Es destacado por decisión administrativa manual
        assertTrue("El administrador puede destacar un comercio nuevo", newFeaturedBiz.getEffectiveIsFeatured())
        assertEquals(0, newFeaturedBiz.ratingCount)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // C05, C06, C07: INDEPENDENCIA CON NEARBY, CATEGORÍAS Y FAVORITOS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `test C05 - Featured merchant can also have valid GPS coordinates for Nearby without mixing logic`() {
        val nearbyAndFeaturedBiz = BusinessInfo(
            id = "biz_nearby_005",
            name = "Pizzería Central",
            category = "Restaurante",
            latitude = 12.136389,
            longitude = -86.251389,
            isActive = true,
            active = true,
            status = "ACTIVE",
            isFeatured = true,
            featured = true
        )

        assertTrue(nearbyAndFeaturedBiz.getEffectiveIsFeatured())
        assertTrue(nearbyAndFeaturedBiz.hasValidLocation())
        assertEquals(12.136389, nearbyAndFeaturedBiz.getEffectiveLatitude(), 0.0001)
    }

    @Test
    fun `test C06 and C07 - Featured does not alter category or favorites logic`() {
        val favoriteIds = setOf("biz_001", "biz_002")
        val featuredBiz = BusinessInfo(
            id = "biz_001",
            name = "Farmacia San Rafael",
            category = "Farmacia",
            isActive = true,
            active = true,
            status = "ACTIVE",
            isFeatured = true,
            featured = true
        )

        val nonFeaturedBiz = BusinessInfo(
            id = "biz_002",
            name = "Super Express",
            category = "Supermercado",
            isActive = true,
            active = true,
            status = "ACTIVE",
            isFeatured = false,
            featured = false
        )

        // Ambos pueden ser favoritos independientemente de si son destacados o no
        assertTrue(favoriteIds.contains(featuredBiz.id))
        assertTrue(favoriteIds.contains(nonFeaturedBiz.id))
        assertEquals("Farmacia", featuredBiz.getEffectiveCategory())
        assertEquals("Supermercado", nonFeaturedBiz.getEffectiveCategory())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // D01, D02, D03: REGLAS DE DISPONIBILIDAD Y SUSPENSIÓN
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `test D01 - Inactive merchant with isFeatured=true is excluded from public catalog and featured list`() {
        val inactiveFeaturedBiz = BusinessInfo(
            id = "biz_inactive_006",
            name = "Comercio Suspendido",
            category = "Restaurante",
            isActive = false,
            active = false,
            status = "SUSPENDED",
            lifecycleStatus = "SUSPENDED",
            isFeatured = true,
            featured = true
        )

        // La regla de disponibilidad debe excluirlo del catálogo público
        assertFalse("Comercio inactivo NO debe ser un item válido de catálogo", inactiveFeaturedBiz.isValidPublicCatalogItem())
        assertFalse("getEffectiveIsActive() debe ser false para comercios suspendidos", inactiveFeaturedBiz.getEffectiveIsActive())

        val catalog = listOf(inactiveFeaturedBiz)
        val validFeatured = catalog.filter { it.isValidPublicCatalogItem() && it.getEffectiveIsFeatured() }
        assertTrue("No debe haber comercios destacados inactivos visibles al cliente", validFeatured.isEmpty())
    }

    @Test
    fun `test D02 - Deleted merchant with isFeatured=true is excluded from public catalog`() {
        val deletedBiz = BusinessInfo(
            id = "biz_deleted_007",
            name = "Comercio Eliminado",
            category = "Restaurante",
            isActive = true,
            status = "DELETED",
            lifecycleStatus = "DELETED",
            isDeleted = true,
            isFeatured = true,
            featured = true
        )

        assertFalse(deletedBiz.isValidPublicCatalogItem())
        assertFalse(deletedBiz.getEffectiveIsActive())
    }

    @Test
    fun `test D03 - Closed merchant with isFeatured=true remains valid item but reflects closed status`() {
        val closedFeaturedBiz = BusinessInfo(
            id = "biz_closed_008",
            name = "Asados Nocturnos",
            category = "Restaurante",
            isActive = true,
            active = true,
            status = "ACTIVE",
            isOpen = false,
            abierto = false,
            isFeatured = true,
            featured = true
        )

        // Permanece en el catálogo y como destacado, pero getEffectiveIsOpen() retorna false para mostrar badge 🌙 CERRADO
        assertTrue(closedFeaturedBiz.isValidPublicCatalogItem())
        assertTrue(closedFeaturedBiz.getEffectiveIsFeatured())
        assertFalse("El estado cerrado debe preservarse", closedFeaturedBiz.getEffectiveIsOpen())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // D04: DEFAULT FALSE PARA DOCUMENTOS SIN CAMPO EXPLÍCITO
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `test D04 - Default value is false when isFeatured and featured are absent`() {
        val defaultBiz = BusinessInfo(
            id = "biz_default_009",
            name = "Comercio Estándar",
            category = "Tecnología",
            isActive = true,
            status = "ACTIVE"
            // isFeatured y featured quedan con su valor por defecto (false)
        )

        assertFalse("El valor predeterminado de isFeatured debe ser false", defaultBiz.isFeatured)
        assertFalse("El valor predeterminado de featured debe ser false", defaultBiz.featured)
        assertFalse("getEffectiveIsFeatured() debe ser false", defaultBiz.getEffectiveIsFeatured())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // D05: MULTI-TENANT ISOLATION
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `test D05 - Multi-Tenant isolation preserves tenantId in featured queries`() {
        val tenantABiz = BusinessInfo(
            id = "biz_tenant_a",
            name = "Comercio Tenant Alpha",
            tenantId = "tenant_alpha_001",
            isActive = true,
            status = "ACTIVE",
            isFeatured = true,
            featured = true
        )

        val tenantBBiz = BusinessInfo(
            id = "biz_tenant_b",
            name = "Comercio Tenant Beta",
            tenantId = "tenant_beta_002",
            isActive = true,
            status = "ACTIVE",
            isFeatured = true,
            featured = true
        )

        val multiTenantList = listOf(tenantABiz, tenantBBiz)

        // Consulta filtrada por Tenant Alpha
        val alphaFeatured = multiTenantList
            .filter { it.tenantId == "tenant_alpha_001" }
            .filter { it.getEffectiveIsFeatured() }
        assertEquals(1, alphaFeatured.size)
        assertEquals("biz_tenant_a", alphaFeatured.first().id)

        // Consulta filtrada por Tenant Beta
        val betaFeatured = multiTenantList
            .filter { it.tenantId == "tenant_beta_002" }
            .filter { it.getEffectiveIsFeatured() }
        assertEquals(1, betaFeatured.size)
        assertEquals("biz_tenant_b", betaFeatured.first().id)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // D06: IDEMPOTENCIA
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    fun `test D06 - Toggling featured status is idempotent`() {
        val biz = BusinessInfo(
            id = "biz_idempotent_010",
            name = "Comercio Idempotente",
            isActive = true,
            status = "ACTIVE",
            isFeatured = false,
            featured = false
        )

        assertFalse(biz.getEffectiveIsFeatured())

        // Simular acción "Destacar" 5 veces consecutivas
        repeat(5) {
            biz.isFeatured = true
            biz.featured = true
        }
        assertTrue(biz.getEffectiveIsFeatured())

        // Simular acción "Quitar Destacado" 5 veces consecutivas
        repeat(5) {
            biz.isFeatured = false
            biz.featured = false
        }
        assertFalse(biz.getEffectiveIsFeatured())
    }
}
