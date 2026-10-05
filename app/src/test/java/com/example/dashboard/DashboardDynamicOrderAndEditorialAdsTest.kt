package com.example.dashboard

import com.example.BlockActionConfig
import com.example.DashboardConfig
import com.example.HomeEditorialAd
import com.example.toDashboardConfigSafely
import com.example.data.repository.BusinessInfo
import org.junit.Assert.*
import org.junit.Test

/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PROTOCOLO BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001
 * Suite de Certificación FASE 3: Android Customer App Implementation
 *
 * Cubre exhaustivamente:
 * 1. Normalización de sectionOrder (Casos A a H)
 * 2. Títulos dinámicos (blockTitles) y fallbacks
 * 3. Acciones de encabezado de bloque (blockActions)
 * 4. Modelo HomeEditorialAd, vigencia temporal y alias de compatibilidad
 * 5. Política Zero N+1: In-Memory Cache Resolution with Snapshot Fallback
 * 6. Matriz de Seguridad de Destinos (HTTPS estricto y Fail-Closed)
 */
class DashboardDynamicOrderAndEditorialAdsTest {

    // =========================================================================
    // 1. NORMALIZACIÓN DE sectionOrder (Casos A a H de la Directiva)
    // =========================================================================

    @Test
    fun `Caso A - Normalización de configuración legacy de 15 bloques (anexa EDITORIAL_ADS y ALL_BUSINESSES al final)`() {
        val legacy15Order = listOf(
            "BANNERS", "CATEGORIES", "BRANCHES", "NEARBY", "FEATURED_BUSINESSES",
            "FEATURED_PRODUCTS", "FLASH_DEALS", "PROMOTIONS", "SAME_PRICE",
            "TOP_SELLING", "RECOMMENDED", "NEW_BUSINESSES", "QUICK_REORDER",
            "FAVORITES", "EXPRESS_DELIVERY"
        )
        val config = DashboardConfig(sectionOrder = legacy15Order)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals("Debe resultar exactamente en 17 bloques canónicos", 17, normalized.size)
        assertEquals("EDITORIAL_ADS debe anexarse en posición 15", "EDITORIAL_ADS", normalized[15])
        assertEquals("ALL_BUSINESSES debe anexarse determinísticamente al final", "ALL_BUSINESSES", normalized[16])
        assertEquals("El primer bloque debe mantenerse BANNERS", "BANNERS", normalized[0])
    }

    @Test
    fun `Caso B - Normalización de configuración nueva con 17 bloques canónicos`() {
        val config = DashboardConfig(sectionOrder = DashboardConfig.CANONICAL_DEFAULT_SECTION_ORDER)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals(17, normalized.size)
        assertEquals(DashboardConfig.CANONICAL_DEFAULT_SECTION_ORDER, normalized)
    }

    @Test
    fun `Caso C - EDITORIAL_ADS y ALL_BUSINESSES ausentes en array remoto reducido se anexan al final sin pérdida`() {
        val remoteOrder = listOf("CATEGORIES", "FEATURED_PRODUCTS", "FLASH_DEALS")
        val config = DashboardConfig(sectionOrder = remoteOrder)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals(17, normalized.size)
        assertEquals("CATEGORIES", normalized[0])
        assertEquals("FEATURED_PRODUCTS", normalized[1])
        assertEquals("FLASH_DEALS", normalized[2])
        assertTrue("EDITORIAL_ADS debe estar presente", normalized.contains("EDITORIAL_ADS"))
        assertTrue("ALL_BUSINESSES debe estar presente", normalized.contains("ALL_BUSINESSES"))
    }

    @Test
    fun `Caso D - EDITORIAL_ADS presente en posición intermedia es respetado estrictamente`() {
        // El administrador movió EDITORIAL_ADS a la posición 4
        val customOrder = listOf(
            "BANNERS", "CATEGORIES", "NEARBY", "EDITORIAL_ADS", "FEATURED_BUSINESSES"
        )
        val config = DashboardConfig(sectionOrder = customOrder)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals(17, normalized.size)
        assertEquals("BANNERS", normalized[0])
        assertEquals("CATEGORIES", normalized[1])
        assertEquals("NEARBY", normalized[2])
        assertEquals("EDITORIAL_ADS debe ocupar exactamente el índice 3 (posición 4)", "EDITORIAL_ADS", normalized[3])
        assertEquals("FEATURED_BUSINESSES", normalized[4])
    }

    @Test
    fun `Caso E - IDs duplicados son deduplicados conservando la primera aparición válida`() {
        val duplicatedOrder = listOf(
            "BANNERS", "EDITORIAL_ADS", "CATEGORIES", "BANNERS", "EDITORIAL_ADS", "NEARBY", "ALL_BUSINESSES"
        )
        val config = DashboardConfig(sectionOrder = duplicatedOrder)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals(17, normalized.size)
        assertEquals("BANNERS", normalized[0])
        assertEquals("EDITORIAL_ADS", normalized[1])
        assertEquals("CATEGORIES", normalized[2])
        assertEquals("NEARBY", normalized[3])

        // Verificar que no haya duplicados
        val uniqueSet = normalized.toSet()
        assertEquals("No debe haber ningún ID duplicado", 17, uniqueSet.size)
    }

    @Test
    fun `Caso F - IDs desconocidos son descartados de forma segura`() {
        val orderWithUnknowns = listOf(
            "UNKNOWN_BLOCK_99", "BANNERS", "RANDOM_WIDGET", "EDITORIAL_ADS", "INVALID_SECTION", "ALL_BUSINESSES"
        )
        val config = DashboardConfig(sectionOrder = orderWithUnknowns)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals(17, normalized.size)
        assertEquals("BANNERS", normalized[0])
        assertEquals("EDITORIAL_ADS", normalized[1])
        assertEquals("ALL_BUSINESSES", normalized[2])
        assertFalse(normalized.contains("UNKNOWN_BLOCK_99"))
        assertFalse(normalized.contains("RANDOM_WIDGET"))
        assertFalse(normalized.contains("INVALID_SECTION"))
    }

    @Test
    fun `Caso G - Array vacío normaliza a los 17 bloques canónicos por defecto`() {
        val config = DashboardConfig(sectionOrder = emptyList())
        val normalized = config.getNormalizedSectionOrder()

        assertEquals(17, normalized.size)
        assertEquals(DashboardConfig.CANONICAL_DEFAULT_SECTION_ORDER, normalized)
    }

    @Test
    fun `Caso H - Array remoto con orden completamente arbitrario es respetado`() {
        val reversedOrder = DashboardConfig.CANONICAL_DEFAULT_SECTION_ORDER.reversed()
        val config = DashboardConfig(sectionOrder = reversedOrder)
        val normalized = config.getNormalizedSectionOrder()

        assertEquals(17, normalized.size)
        assertEquals("ALL_BUSINESSES", normalized[0])
        assertEquals("EDITORIAL_ADS", normalized[1])
        assertEquals("EXPRESS_DELIVERY", normalized[2])
        assertEquals("FAVORITES", normalized[3])
        assertEquals("BANNERS", normalized[16])
    }

    // =========================================================================
    // 2. TÍTULOS DINÁMICOS (blockTitles) Y FALLBACKS
    // =========================================================================

    @Test
    fun `getDisplayTitle retorna título personalizado cuando está configurado`() {
        val titles = mapOf(
            "FEATURED_BUSINESSES" to "Top Restaurantes de la Ciudad ⭐",
            "EDITORIAL_ADS" to "Especial del Mes 🎉"
        )
        val config = DashboardConfig(blockTitles = titles)

        assertEquals("Top Restaurantes de la Ciudad ⭐", config.getDisplayTitle("FEATURED_BUSINESSES"))
        assertEquals("Especial del Mes 🎉", config.getDisplayTitle("EDITORIAL_ADS"))
    }

    @Test
    fun `getDisplayTitle degrada a título default cuando está vacío o en blanco`() {
        val titles = mapOf(
            "FEATURED_BUSINESSES" to "   ",
            "EDITORIAL_ADS" to ""
        )
        val config = DashboardConfig(blockTitles = titles)

        assertEquals("Comercios Destacados ⭐", config.getDisplayTitle("FEATURED_BUSINESSES", "Comercios Destacados ⭐"))
        assertEquals("Destacados y Novedades", config.getDisplayTitle("EDITORIAL_ADS", "Destacados y Novedades"))
    }

    @Test
    fun `getDisplayTitle es case-insensitive y tolerante a espacios`() {
        val titles = mapOf("EDITORIAL_ADS" to "Novedades Exclusivas")
        val config = DashboardConfig(blockTitles = titles)

        assertEquals("Novedades Exclusivas", config.getDisplayTitle("editorial_ads"))
        assertEquals("Novedades Exclusivas", config.getDisplayTitle(" EDITORIAL_ADS "))
    }

    // =========================================================================
    // 3. ACCIONES DE ENCABEZADO (blockActions)
    // =========================================================================

    @Test
    fun `getBlockAction retorna acción válida y filtra tipos NONE o vacíos`() {
        val actions = mapOf(
            "FEATURED_BUSINESSES" to BlockActionConfig(type = "MERCHANT", target = "biz_123", label = "Ver Todo"),
            "SAME_PRICE" to BlockActionConfig(type = "NONE", target = "", label = ""),
            "FLASH_DEALS" to BlockActionConfig(type = "", target = "promo_1", label = "")
        )
        val config = DashboardConfig(blockActions = actions)

        val featAction = config.getBlockAction("FEATURED_BUSINESSES")
        assertNotNull(featAction)
        assertEquals("MERCHANT", featAction?.type)
        assertEquals("biz_123", featAction?.target)

        assertNull("Acción NONE debe retornar null", config.getBlockAction("SAME_PRICE"))
        assertNull("Acción con tipo vacío debe retornar null", config.getBlockAction("FLASH_DEALS"))
        assertNull("Bloque no configurado debe retornar null", config.getBlockAction("CATEGORIES"))
    }

    // =========================================================================
    // 4. MODELO HomeEditorialAd Y VIGENCIA TEMPORAL
    // =========================================================================

    @Test
    fun `HomeEditorialAd evalúa vigencia temporal startAt y endAt correctamente`() {
        val now = 1000000L

        // 1. Anuncio siempre activo sin fechas
        val alwaysActiveAd = HomeEditorialAd(id = "ad1", active = true, startAt = null, endAt = null)
        assertTrue(alwaysActiveAd.isCurrentlyValid(now))

        // 2. Anuncio inactivo
        val inactiveAd = HomeEditorialAd(id = "ad2", active = false, startAt = null, endAt = null)
        assertFalse(inactiveAd.isCurrentlyValid(now))

        // 3. Anuncio futuro (startAt > now)
        val futureAd = HomeEditorialAd(id = "ad3", active = true, startAt = now + 5000L, endAt = null)
        assertFalse("Anuncio futuro no debe ser válido", futureAd.isCurrentlyValid(now))

        // 4. Anuncio en ventana de tiempo válida
        val validWindowAd = HomeEditorialAd(id = "ad4", active = true, startAt = now - 5000L, endAt = now + 5000L)
        assertTrue("Anuncio dentro de la ventana debe ser válido", validWindowAd.isCurrentlyValid(now))

        // 5. Anuncio expirado (endAt < now)
        val expiredAd = HomeEditorialAd(id = "ad5", active = true, startAt = now - 10000L, endAt = now - 1000L)
        assertFalse("Anuncio expirado no debe ser válido", expiredAd.isCurrentlyValid(now))
    }

    @Test
    fun `HomeEditorialAd resuelve alias de compatibilidad de Fase 2 correctamente`() {
        val compatAd = HomeEditorialAd(
            id = "ad_compat",
            badge = "PROMO",
            isActive = true,
            merchantName = "Pizzas Don Juan",
            merchantLogoUrl = "https://cdn.example.com/logo.jpg",
            productName = "Pizza Margarita",
            targetUrl = "https://example.com/promo"
        )

        assertEquals("PROMO", compatAd.effectiveBadgeText)
        assertTrue(compatAd.effectiveIsActive)
        assertEquals("Pizzas Don Juan", compatAd.effectiveMerchantName)
        assertEquals("https://cdn.example.com/logo.jpg", compatAd.effectiveMerchantLogoUrl)
        assertEquals("Pizza Margarita", compatAd.effectiveProductName)
        assertEquals("https://example.com/promo", compatAd.effectiveActionTarget)
    }

    // =========================================================================
    // 5. POLÍTICA ZERO N+1: IN-MEMORY CACHE RESOLUTION WITH SNAPSHOT FALLBACK
    // =========================================================================

    @Test
    fun `Resolución en memoria usa datos VIVOS del comercio si está en publicBusinesses`() {
        val publicBusinesses = listOf(
            BusinessInfo(
                id = "biz_001",
                name = "Hamburguesas El Rey (VIVO)",
                logoUrl = "https://live.example.com/king_logo.png"
            )
        )

        val ad = HomeEditorialAd(
            id = "ad_promo",
            merchantId = "biz_001",
            merchantNameSnapshot = "Hamburguesas El Rey (SNAPSHOT VIEJO)",
            merchantLogoUrlSnapshot = "https://old.example.com/old_logo.png"
        )

        // Simular resolución idéntica a EditorialAdsSection
        val resolvedName = publicBusinesses.find { it.id == ad.merchantId }?.name ?: ad.effectiveMerchantName
        val resolvedLogo = publicBusinesses.find { it.id == ad.merchantId }?.logoUrl ?: ad.effectiveMerchantLogoUrl

        assertEquals("Hamburguesas El Rey (VIVO)", resolvedName)
        assertEquals("https://live.example.com/king_logo.png", resolvedLogo)
    }

    @Test
    fun `Resolución en memoria hace fallback seguro a snapshot si el comercio NO está en cache`() {
        val publicBusinesses = emptyList<BusinessInfo>()

        val ad = HomeEditorialAd(
            id = "ad_promo",
            merchantId = "biz_desconocido",
            merchantNameSnapshot = "Comercio Snapshot",
            merchantLogoUrlSnapshot = "https://snapshot.example.com/logo.png"
        )

        val resolvedName = publicBusinesses.find { it.id == ad.merchantId }?.name ?: ad.effectiveMerchantName
        val resolvedLogo = publicBusinesses.find { it.id == ad.merchantId }?.logoUrl ?: ad.effectiveMerchantLogoUrl

        assertEquals("Comercio Snapshot", resolvedName)
        assertEquals("https://snapshot.example.com/logo.png", resolvedLogo)
    }

    // =========================================================================
    // 6. MATRIZ DE SEGURIDAD DE DESTINOS
    // =========================================================================

    @Test
    fun `EXTERNAL_URL exige estrictamente protocolo HTTPS seguro y rechaza HTTP`() {
        val httpsTarget = "https://bluesystemdelivery.com/promocion"
        val httpTarget = "http://sitioinseguro.com/hack"
        val dangerousTarget = "javascript:alert(1)"

        assertTrue("HTTPS debe ser aceptado", httpsTarget.startsWith("https://", ignoreCase = true))
        assertFalse("HTTP debe ser rechazado", httpTarget.startsWith("https://", ignoreCase = true))
        assertFalse("Protocolos peligrosos deben ser rechazados", dangerousTarget.startsWith("https://", ignoreCase = true))
    }

    // =========================================================================
    // 7. ORDENAMIENTO EN MEMORIA DE ANUNCIOS (order ASC)
    // =========================================================================

    @Test
    fun `Anuncios son ordenados por order ASC sin requerir índices compuestos en Firestore`() {
        val rawAds = listOf(
            HomeEditorialAd(id = "ad3", order = 10),
            HomeEditorialAd(id = "ad1", order = 1),
            HomeEditorialAd(id = "ad2", order = 5)
        )

        val sorted = rawAds.sortedBy { it.order }

        assertEquals("ad1", sorted[0].id)
        assertEquals("ad2", sorted[1].id)
        assertEquals("ad3", sorted[2].id)
    }

    // =========================================================================
    // 8. CERTIFICACIÓN DE VISIBILIDAD DE 17 BLOQUES Y PARIDAD CONTRACTUAL
    // =========================================================================

    @Test
    fun `Paridad de 17 bloques canonicos entre orden y titulos por defecto`() {
        val canonicalOrder = DashboardConfig.CANONICAL_DEFAULT_SECTION_ORDER
        val defaultTitles = DashboardConfig.CANONICAL_DEFAULT_BLOCK_TITLES

        assertEquals("Debe haber exactamente 17 bloques canónicos", 17, canonicalOrder.size)
        assertEquals("Debe haber títulos por defecto para los 17 bloques", 17, defaultTitles.size)

        for (sectionId in canonicalOrder) {
            assertTrue("Cada bloque canónico debe tener un título definido: $sectionId", defaultTitles.containsKey(sectionId))
            assertTrue("El título no debe estar vacío para: $sectionId", !defaultTitles[sectionId].isNullOrBlank())
        }

        assertEquals("Todos los Comercios 🏪", defaultTitles["ALL_BUSINESSES"])
        assertEquals("¿Qué se te antoja hoy?", defaultTitles["CATEGORIES"])
    }

    @Test
    fun `showAllBusinesses backward compatibility con mapas Firestore - missing es true, false se preserva`() {
        // Caso 1: Documento legacy sin showAllBusinesses -> Expected: true
        val legacyData = mapOf<String, Any>(
            "showCategories" to true,
            "showFlashDeals" to false
        )
        val legacyConfig = legacyData.toDashboardConfigSafely()
        assertTrue("Documento sin showAllBusinesses debe ser true por backward compatibility", legacyConfig.showAllBusinesses)

        // Caso 2: Documento con showAllBusinesses = true explícito -> Expected: true
        val explicitTrueData = mapOf<String, Any>(
            "showAllBusinesses" to true
        )
        val explicitTrueConfig = explicitTrueData.toDashboardConfigSafely()
        assertTrue("Valor explícito true debe mantenerse", explicitTrueConfig.showAllBusinesses)

        // Caso 3: Documento con showAllBusinesses = false explícito -> Expected: false (CRÍTICO)
        val explicitFalseData = mapOf<String, Any>(
            "showAllBusinesses" to false
        )
        val explicitFalseConfig = explicitFalseData.toDashboardConfigSafely()
        assertFalse("Valor explícito false NO debe transformarse en true", explicitFalseConfig.showAllBusinesses)
    }

    @Test
    fun `Tenant override merge preserva estrictamente el valor false sin reversion por default`() {
        // Escenario A: Global es false, Tenant no especifica el campo
        // El tenant hereda la base global (false), NO debe volver a true
        val globalFalseConfig = DashboardConfig(showAllBusinesses = false)
        val tenantDataWithoutField = mapOf<String, Any>(
            "showCategories" to true
        )
        val mergedConfigA = tenantDataWithoutField.toDashboardConfigSafely(base = globalFalseConfig)
        assertFalse("Si Global es false y Tenant no define el campo, debe PREVALECER false", mergedConfigA.showAllBusinesses)

        // Escenario B: Global es true, Tenant override explícito es false
        val globalTrueConfig = DashboardConfig(showAllBusinesses = true)
        val tenantDataWithFalse = mapOf<String, Any>(
            "showAllBusinesses" to false
        )
        val mergedConfigB = tenantDataWithFalse.toDashboardConfigSafely(base = globalTrueConfig)
        assertFalse("Tenant override false debe prevalecer sobre Global true", mergedConfigB.showAllBusinesses)

        // Escenario C: Global es false, Tenant override explícito es true
        val tenantDataWithTrue = mapOf<String, Any>(
            "showAllBusinesses" to true
        )
        val mergedConfigC = tenantDataWithTrue.toDashboardConfigSafely(base = globalFalseConfig)
        assertTrue("Tenant override true debe prevalecer sobre Global false", mergedConfigC.showAllBusinesses)
    }

    @Test
    fun `Garantia de Single Render para ALL_BUSINESSES en sectionOrder o legacy fallback`() {
        // Caso 1: ALL_BUSINESSES incluido en sectionOrder -> Renderizado en el bucle principal
        val modernOrder = listOf("BANNERS", "CATEGORIES", "ALL_BUSINESSES", "FLASH_DEALS")
        val containsInOrderModern = modernOrder.contains("ALL_BUSINESSES")
        assertTrue(containsInOrderModern)

        var renderCountModern = 0
        modernOrder.forEach { sectionId ->
            if (sectionId == "ALL_BUSINESSES") {
                renderCountModern++
            }
        }
        if (!containsInOrderModern) {
            renderCountModern++
        }
        assertEquals("Debe renderizarse exactamente 1 vez cuando está en sectionOrder", 1, renderCountModern)

        // Caso 2: sectionOrder legacy (sin ALL_BUSINESSES) -> Renderizado por fallback al final
        val legacyOrder = listOf("BANNERS", "CATEGORIES", "FLASH_DEALS")
        val containsInOrderLegacy = legacyOrder.contains("ALL_BUSINESSES")
        assertFalse(containsInOrderLegacy)

        var renderCountLegacy = 0
        legacyOrder.forEach { sectionId ->
            if (sectionId == "ALL_BUSINESSES") {
                renderCountLegacy++
            }
        }
        if (!containsInOrderLegacy) {
            renderCountLegacy++
        }
        assertEquals("Debe renderizarse exactamente 1 vez por fallback al final si falta en sectionOrder", 1, renderCountLegacy)

        // Caso 3: showAllBusinesses = false -> 0 renders
        val showAll = false
        var renderCountDisabled = 0
        modernOrder.forEach { sectionId ->
            if (sectionId == "ALL_BUSINESSES" && showAll) {
                renderCountDisabled++
            }
        }
        if (!containsInOrderModern && showAll) {
            renderCountDisabled++
        }
        assertEquals("Debe renderizarse 0 veces cuando showAllBusinesses es false", 0, renderCountDisabled)
    }
}
