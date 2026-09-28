package com.example.location

import com.example.DashboardConfig
import com.example.data.repository.BusinessInfo
import com.example.domain.engine.NearbyMerchantEngine
import org.junit.Assert.*
import org.junit.Test

class NearbyMerchantEngineTest {

    // Helper: Crea un comercio de prueba en coordenadas específicas
    private fun createBusiness(
        id: String,
        name: String,
        lat: Double,
        lng: Double,
        isActive: Boolean = true,
        isDeleted: Boolean = false,
        status: String = "ACTIVE",
        tenantId: String = "TENANT_DEFAULT"
    ): BusinessInfo {
        return BusinessInfo(
            id = id,
            name = name,
            nombre = name,
            comercioNombre = name,
            latitude = lat,
            longitude = lng,
            lat = lat,
            lng = lng,
            isActive = isActive,
            active = isActive,
            isDeleted = isDeleted,
            status = status,
            lifecycleStatus = status,
            tenantId = tenantId
        )
    }

    // Coordenadas de prueba:
    // Cliente en Plaza España, Managua: (12.1278, -86.2753)
    private val clientLat = 12.1278
    private val clientLng = -86.2753

    // TEST-01: Cliente tiene dirección activa válida -> Comercios cercanos descubiertos
    @Test
    fun testClientWithValidActiveAddressFindsNearbyMerchants() {
        val biz1 = createBusiness("biz1", "Café Plaza", 12.1290, -86.2760) // ~0.15 km
        val biz2 = createBusiness("biz2", "Pizza Central", 12.1380, -86.2800) // ~1.2 km
        val biz3 = createBusiness("biz3", "Restaurante Lejano", 12.5000, -86.8000) // > 50 km

        val result = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = clientLat,
            customerLng = clientLng,
            businesses = listOf(biz1, biz2, biz3),
            config = DashboardConfig(nearbyInitialRadiusKm = 5.0, nearbyMinimumMerchantCount = 2)
        )

        assertTrue("Debe tener coordenadas de cliente válidas", result.hasCustomerCoordinates)
        assertTrue("Servicio debe estar disponible", result.isServiceAvailable)
        assertEquals(2, result.items.size)
        assertEquals("biz1", result.items[0].business.id)
        assertEquals("biz2", result.items[1].business.id)
        assertTrue("La distancia debe ser menor a 5 km", result.items[0].distanceKm < 5.0)
    }

    // TEST-02: Cliente no tiene dirección activa / lat/lng 0.0 -> Retorna vacío sin crash
    @Test
    fun testClientWithNoAddressOrZeroCoordinatesHandlesGracefully() {
        val biz1 = createBusiness("biz1", "Café Plaza", 12.1290, -86.2760)

        val resultZero = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = 0.0,
            customerLng = 0.0,
            businesses = listOf(biz1)
        )

        assertFalse("No debe tener coordenadas válidas", resultZero.hasCustomerCoordinates)
        assertFalse("Servicio no disponible", resultZero.isServiceAvailable)
        assertTrue("Lista de ítems debe estar vacía", resultZero.items.isEmpty())

        val resultNaN = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = Double.NaN,
            customerLng = -86.2753,
            businesses = listOf(biz1)
        )
        assertFalse("Coordenadas NaN deben ser rechazadas", resultNaN.hasCustomerCoordinates)
        assertTrue("Lista vacía ante NaN", resultNaN.items.isEmpty())
    }

    // TEST-03: Cambio de Dirección Casa -> Trabajo -> Recálculo reactivo con nuevas coordenadas
    @Test
    fun testAddressSwitchCasaToTrabajoRecalculatesProximity() {
        // Ubicación Casa (Plaza España): (12.1278, -86.2753)
        val casaLat = 12.1278
        val casaLng = -86.2753

        // Ubicación Trabajo (Carretera a Masaya km 10): (12.0650, -86.2100)
        val trabajoLat = 12.0650
        val trabajoLng = -86.2100

        val bizCasa = createBusiness("biz_casa", "Comercio Casa", 12.1280, -86.2750) // Cerca de casa (~0.05 km)
        val bizTrabajo = createBusiness("biz_trabajo", "Comercio Trabajo", 12.0660, -86.2110) // Cerca de trabajo (~0.15 km)

        // Búsqueda para Casa
        val resultCasa = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = casaLat,
            customerLng = casaLng,
            businesses = listOf(bizCasa, bizTrabajo),
            config = DashboardConfig(nearbyInitialRadiusKm = 2.0, nearbyAutoExpandEnabled = false)
        )
        assertEquals(1, resultCasa.items.size)
        assertEquals("biz_casa", resultCasa.items.first().business.id)

        // Búsqueda para Trabajo
        val resultTrabajo = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = trabajoLat,
            customerLng = trabajoLng,
            businesses = listOf(bizCasa, bizTrabajo),
            config = DashboardConfig(nearbyInitialRadiusKm = 2.0, nearbyAutoExpandEnabled = false)
        )
        assertEquals(1, resultTrabajo.items.size)
        assertEquals("biz_trabajo", resultTrabajo.items.first().business.id)
    }

    // TEST-04: 8 comercios en 5 km, mínimo 5 -> Se detiene en 5 km (No expande innecesariamente)
    @Test
    fun testSufficientMerchantsInInitialRadiusDoesNotExpand() {
        val businesses = (1..8).map { i ->
            // Distribuir a menos de 4 km
            createBusiness("biz$i", "Comercio $i", clientLat + (i * 0.003), clientLng + (i * 0.003))
        }

        val result = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = clientLat,
            customerLng = clientLng,
            businesses = businesses,
            config = DashboardConfig(
                nearbyInitialRadiusKm = 5.0,
                nearbySecondaryRadiusKm = 10.0,
                nearbyMaxRadiusKm = 15.0,
                nearbyMinimumMerchantCount = 5,
                nearbyAutoExpandEnabled = true
            )
        )

        assertEquals(8, result.items.size)
        assertEquals(5.0, result.activeRadiusKm, 0.01)
        assertFalse("No debe haberse expandido", result.wasExpanded)
        assertEquals(1, result.expansionStage)
    }

    // TEST-05: 2 comercios en 5 km, mínimo 5 -> Expande automáticamente a 10 km
    @Test
    fun testInsufficientMerchantsInInitialRadiusExpandsToSecondaryRadius() {
        val biz1 = createBusiness("biz1", "Cerca 1", clientLat + 0.01, clientLng + 0.01) // ~1.5 km
        val biz2 = createBusiness("biz2", "Cerca 2", clientLat + 0.02, clientLng + 0.02) // ~3.1 km
        val biz3 = createBusiness("biz3", "Medio 1", clientLat + 0.05, clientLng + 0.05) // ~7.7 km
        val biz4 = createBusiness("biz4", "Medio 2", clientLat + 0.055, clientLng + 0.055) // ~8.5 km
        val biz5 = createBusiness("biz5", "Medio 3", clientLat + 0.06, clientLng + 0.06) // ~9.3 km

        val result = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = clientLat,
            customerLng = clientLng,
            businesses = listOf(biz1, biz2, biz3, biz4, biz5),
            config = DashboardConfig(
                nearbyInitialRadiusKm = 5.0,
                nearbySecondaryRadiusKm = 10.0,
                nearbyMaxRadiusKm = 15.0,
                nearbyMinimumMerchantCount = 5,
                nearbyAutoExpandEnabled = true
            )
        )

        assertEquals(5, result.items.size)
        assertEquals(10.0, result.activeRadiusKm, 0.01)
        assertTrue("Debe haberse expandido", result.wasExpanded)
        assertEquals(2, result.expansionStage)
    }

    // TEST-06: 2 en 5 km + 3 en 10 km -> Total 5 alcanzado, se detiene en 10 km
    @Test
    fun testReachingMinimumAtSecondaryRadiusStopsExpansion() {
        val biz1 = createBusiness("biz1", "Cerca 1", clientLat + 0.01, clientLng + 0.01)
        val biz2 = createBusiness("biz2", "Cerca 2", clientLat + 0.02, clientLng + 0.02)
        val biz3 = createBusiness("biz3", "Medio 1", clientLat + 0.05, clientLng + 0.05)
        val biz4 = createBusiness("biz4", "Medio 2", clientLat + 0.055, clientLng + 0.055)
        val biz5 = createBusiness("biz5", "Medio 3", clientLat + 0.06, clientLng + 0.06)
        val bizFar = createBusiness("bizFar", "Lejano 13km", clientLat + 0.08, clientLng + 0.08) // ~13 km

        val result = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = clientLat,
            customerLng = clientLng,
            businesses = listOf(biz1, biz2, biz3, biz4, biz5, bizFar),
            config = DashboardConfig(
                nearbyInitialRadiusKm = 5.0,
                nearbySecondaryRadiusKm = 10.0,
                nearbyMaxRadiusKm = 15.0,
                nearbyMinimumMerchantCount = 5,
                nearbyAutoExpandEnabled = true
            )
        )

        assertEquals(5, result.items.size)
        assertEquals(10.0, result.activeRadiusKm, 0.01)
        assertEquals(2, result.expansionStage)
        assertFalse("No debe incluir el comercio de 13 km porque ya se alcanzó el umbral en 10 km",
            result.items.any { it.business.id == "bizFar" })
    }

    // TEST-07: Comercios insuficientes hasta 15 km -> Retorna todos los disponibles hasta el máximo y se detiene
    @Test
    fun testInsufficientMerchantsAtMaxRadiusReturnsAllAvailableUpToMax() {
        val biz1 = createBusiness("biz1", "Cerca 1", clientLat + 0.01, clientLng + 0.01) // ~1.5 km
        val biz2 = createBusiness("biz2", "Medio 1", clientLat + 0.05, clientLng + 0.05) // ~7.7 km
        val biz3 = createBusiness("biz3", "Max 1", clientLat + 0.08, clientLng + 0.08) // ~12.3 km
        val bizVeryFar = createBusiness("bizVeryFar", "Fuera de rango", clientLat + 0.5, clientLng + 0.5) // ~75 km

        val result = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = clientLat,
            customerLng = clientLng,
            businesses = listOf(biz1, biz2, biz3, bizVeryFar),
            config = DashboardConfig(
                nearbyInitialRadiusKm = 5.0,
                nearbySecondaryRadiusKm = 10.0,
                nearbyMaxRadiusKm = 15.0,
                nearbyMinimumMerchantCount = 5,
                nearbyAutoExpandEnabled = true
            )
        )

        assertEquals(3, result.items.size)
        assertEquals(15.0, result.activeRadiusKm, 0.01)
        assertTrue(result.wasExpanded)
        assertEquals(3, result.expansionStage)
        assertFalse("No debe incluir comercio fuera del radio máximo",
            result.items.any { it.business.id == "bizVeryFar" })
    }

    // TEST-08: Ordenamiento estricto por proximidad (Nearest First)
    @Test
    fun testStrictAscendingProximityOrdering() {
        val bizFar = createBusiness("bizFar", "D = 7 km", clientLat + 0.05, clientLng + 0.05)
        val bizNear = createBusiness("bizNear", "A = 0.5 km", clientLat + 0.003, clientLng + 0.003)
        val bizMid1 = createBusiness("bizMid1", "B = 1.2 km", clientLat + 0.008, clientLng + 0.008)
        val bizMid2 = createBusiness("bizMid2", "C = 3 km", clientLat + 0.02, clientLng + 0.02)

        val result = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = clientLat,
            customerLng = clientLng,
            businesses = listOf(bizFar, bizNear, bizMid2, bizMid1),
            config = DashboardConfig(nearbyInitialRadiusKm = 10.0, nearbyMinimumMerchantCount = 4)
        )

        assertEquals(4, result.items.size)
        assertEquals("bizNear", result.items[0].business.id)
        assertEquals("bizMid1", result.items[1].business.id)
        assertEquals("bizMid2", result.items[2].business.id)
        assertEquals("bizFar", result.items[3].business.id)

        // Validar distancias crecientes estrictas
        assertTrue(result.items[0].distanceKm < result.items[1].distanceKm)
        assertTrue(result.items[1].distanceKm < result.items[2].distanceKm)
        assertTrue(result.items[2].distanceKm < result.items[3].distanceKm)
    }

    // TEST-09: Exclusión de comercios inactivos o eliminados
    @Test
    fun testInactiveOrDeletedMerchantsAreExcluded() {
        val bizActive = createBusiness("biz1", "Activo", clientLat + 0.005, clientLng + 0.005, isActive = true)
        val bizInactive = createBusiness("biz2", "Inactivo", clientLat + 0.002, clientLng + 0.002, isActive = false)
        val bizDeleted = createBusiness("biz3", "Eliminado", clientLat + 0.001, clientLng + 0.001, isDeleted = true)
        val bizDeprovisioned = createBusiness("biz4", "Deprovisioned", clientLat + 0.001, clientLng + 0.001, status = "DEPROVISIONED")

        val result = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = clientLat,
            customerLng = clientLng,
            businesses = listOf(bizActive, bizInactive, bizDeleted, bizDeprovisioned)
        )

        assertEquals(1, result.items.size)
        assertEquals("biz1", result.items.first().business.id)
    }

    // TEST-10: Exclusión segura de comercios con coordenadas inválidas
    @Test
    fun testInvalidCoordinatesAreExcludedSafely() {
        val bizValid = createBusiness("bizValid", "Válido", clientLat + 0.005, clientLng + 0.005)
        val bizZero = createBusiness("bizZero", "Sin Coords", 0.0, 0.0)
        val bizOutOfRange = createBusiness("bizOut", "Fuera de Rango", 120.0, -200.0)

        val result = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = clientLat,
            customerLng = clientLng,
            businesses = listOf(bizValid, bizZero, bizOutOfRange)
        )

        assertEquals(1, result.items.size)
        assertEquals("bizValid", result.items.first().business.id)
    }

    // TEST-11: Expansión deshabilitada respeta estrictamente el radio inicial
    @Test
    fun testDisabledAutoExpandRespectsInitialRadiusOnly() {
        val biz1 = createBusiness("biz1", "En 5km", clientLat + 0.01, clientLng + 0.01) // ~1.5 km
        val biz2 = createBusiness("biz2", "En 8km", clientLat + 0.05, clientLng + 0.05) // ~7.7 km

        val result = NearbyMerchantEngine.findNearbyMerchants(
            customerLat = clientLat,
            customerLng = clientLng,
            businesses = listOf(biz1, biz2),
            config = DashboardConfig(
                nearbyInitialRadiusKm = 5.0,
                nearbyMinimumMerchantCount = 5,
                nearbyAutoExpandEnabled = false
            )
        )

        assertEquals(1, result.items.size)
        assertEquals(5.0, result.activeRadiusKm, 0.01)
        assertFalse(result.wasExpanded)
    }

    // TEST-12: Sanitización de configuración ante valores incoherentes
    @Test
    fun testConfigSanitizationHandlesIncoherentValues() {
        val corruptedConfig = DashboardConfig(
            nearbyInitialRadiusKm = -5.0,
            nearbySecondaryRadiusKm = -10.0,
            nearbyMaxRadiusKm = -2.0,
            nearbyMinimumMerchantCount = 0
        )

        val sanitized = NearbyMerchantEngine.sanitizeConfig(corruptedConfig)

        assertEquals(5.0, sanitized.nearbyInitialRadiusKm, 0.01)
        assertEquals(10.0, sanitized.nearbySecondaryRadiusKm, 0.01)
        assertEquals(15.0, sanitized.nearbyMaxRadiusKm, 0.01)
        assertEquals(5, sanitized.nearbyMinimumMerchantCount)
    }
}
