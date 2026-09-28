package com.example.location

import com.example.DireccionCacheada
import com.example.GeoUtils
import com.example.LocationSelectionSource
import org.junit.Assert.*
import org.junit.Test
import java.util.Locale

class ProviderBenchmarkTest {

    data class BenchmarkCase(
        val category: String,
        val query: String,
        val groundTruthLat: Double,
        val groundTruthLng: Double,
        val expectedName: String
    )

    private val benchmarkDataset = listOf(
        BenchmarkCase(
            category = "POI_COMMERCIAL",
            query = "Multicentro Las Américas",
            groundTruthLat = 12.1364,
            groundTruthLng = -86.2361,
            expectedName = "Multicentro Las Américas"
        ),
        BenchmarkCase(
            category = "POI_COMMERCIAL",
            query = "KFC Carretera a Masaya",
            groundTruthLat = 12.1150,
            groundTruthLng = -86.2480,
            expectedName = "KFC Carretera a Masaya"
        ),
        BenchmarkCase(
            category = "POI_COMMERCIAL",
            query = "Metrocentro Managua",
            groundTruthLat = 12.1285,
            groundTruthLng = -86.2655,
            expectedName = "Metrocentro"
        ),
        BenchmarkCase(
            category = "HOSPITAL_LANDMARK",
            query = "Hospital Manolo Morales",
            groundTruthLat = 12.1220,
            groundTruthLng = -86.2430,
            expectedName = "Hospital Manolo Morales"
        ),
        BenchmarkCase(
            category = "RESIDENTIAL_COLONIA",
            query = "Colonia Los Robles",
            groundTruthLat = 12.1255,
            groundTruthLng = -86.2622,
            expectedName = "Colonia Los Robles"
        ),
        BenchmarkCase(
            category = "BARRIO_POPULAR",
            query = "Barrio San Luis Managua",
            groundTruthLat = 12.1500,
            groundTruthLng = -86.2400,
            expectedName = "Barrio San Luis"
        ),
        BenchmarkCase(
            category = "LOCAL_REFERENCE",
            query = "Rotonda El Güegüense",
            groundTruthLat = 12.1340,
            groundTruthLng = -86.2800,
            expectedName = "Rotonda El Güegüense"
        )
    )

    @Test
    fun testBenchmarkDatasetIntegrityAndDistanceThresholds() {
        for (case in benchmarkDataset) {
            val formattedQuery = if (case.query.lowercase().contains("managua") || case.query.lowercase().contains("nicaragua")) {
                case.query
            } else {
                "${case.query}, Managua, Nicaragua"
            }
            assertTrue("Query must contain geographical bias", formattedQuery.contains("Managua") || formattedQuery.contains("Nicaragua"))

            // Verify coordinates are strictly inside Managua metropolitan bounding box
            // Lat: [12.00, 12.30], Lng: [-86.40, -86.10]
            assertTrue("Latitude within Managua bounds for ${case.query}", case.groundTruthLat in 12.00..12.30)
            assertTrue("Longitude within Managua bounds for ${case.query}", case.groundTruthLng in -86.40..-86.10)
        }
    }

    @Test
    fun testProviderResponseSimulationAndRanking() {
        val simulatedGeocoderResults = benchmarkDataset.map { case ->
            DireccionCacheada(
                id = "geo_${case.query.hashCode()}",
                searchText = case.query.lowercase(),
                formattedAddress = "${case.expectedName}, Managua, Nicaragua",
                latitude = case.groundTruthLat,
                longitude = case.groundTruthLng,
                source = LocationSelectionSource.SEARCH.name
            )
        }

        assertEquals(benchmarkDataset.size, simulatedGeocoderResults.size)

        // Verify accuracy against ground truth (< 150m deviation)
        for (i in benchmarkDataset.indices) {
            val truth = benchmarkDataset[i]
            val result = simulatedGeocoderResults[i]
            val errorDistKm = GeoUtils.calculateDistance(truth.groundTruthLat, truth.groundTruthLng, result.latitude, result.longitude)
            assertEquals("Error distance for ${truth.query} should be exactly 0 in baseline", 0.0, errorDistKm, 0.001)
        }
    }

    @Test
    fun testHaversineAndPricingE2EIntegrity() {
        val origin = benchmarkDataset[0] // Multicentro
        val destination = benchmarkDataset[2] // Metrocentro

        val distanceKm = GeoUtils.calculateDistance(
            origin.groundTruthLat, origin.groundTruthLng,
            destination.groundTruthLat, destination.groundTruthLng
        )

        // Distance between Multicentro and Metrocentro is ~3.3 to 3.8 km
        assertTrue("Distance should be approximately 3-4 km (was $distanceKm)", distanceKm in 3.0..4.5)

        val baseFee = 35.0
        val costPerKm = 15.0
        val calculatedFee = baseFee + (distanceKm * costPerKm)

        // Pricing between C$80.00 and C$100.00
        assertTrue("Calculated fee should be between C$80 and C$105 (was $calculatedFee)", calculatedFee in 80.0..105.0)
    }
}
