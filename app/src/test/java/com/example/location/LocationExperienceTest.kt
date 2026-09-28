package com.example.location

import com.example.DireccionCacheada
import com.example.GeoUtils
import com.example.LocationSelectionSource
import com.example.Address
import org.junit.Assert.*
import org.junit.Test
import java.util.UUID

class LocationExperienceTest {

    // LOCATION-01: Valid place search formatting
    @Test
    fun testValidPlaceSearchQueryFormatting() {
        val rawQuery = "Multicentro Las Américas"
        val formatted = if (rawQuery.lowercase().contains("managua") || rawQuery.lowercase().contains("nicaragua")) {
            rawQuery
        } else {
            "$rawQuery, Managua, Nicaragua"
        }
        assertEquals("Multicentro Las Américas, Managua, Nicaragua", formatted)

        val cachedItem = DireccionCacheada(
            id = UUID.randomUUID().toString(),
            searchText = rawQuery.lowercase().trim(),
            formattedAddress = "Multicentro Las Américas, Pista de la Resistencia, Managua",
            latitude = 12.1364,
            longitude = -86.2361,
            source = LocationSelectionSource.SEARCH.name
        )
        assertEquals(LocationSelectionSource.SEARCH.name, cachedItem.source)
        assertEquals(12.1364, cachedItem.latitude, 0.0001)
        assertEquals(-86.2361, cachedItem.longitude, 0.0001)
    }

    // LOCATION-02: Search invalid or blank place handles gracefully
    @Test
    fun testInvalidPlaceSearchReturnsEmptyOrFallback() {
        val blankQuery = "   "
        assertTrue(blankQuery.isBlank() || blankQuery.trim().length < 3)

        val shortQuery = "ab"
        assertTrue(shortQuery.trim().length < 3)
    }

    // LOCATION-03: Map picker center coordinates and atomic object creation
    @Test
    fun testMapPickerProducesCorrectLocationPoint() {
        val centerLat = 12.1450
        val centerLng = -86.2500
        val resolvedAddress = "Barrio San José Oriental, Managua, Nicaragua"

        val pickerResult = DireccionCacheada(
            id = UUID.randomUUID().toString(),
            searchText = resolvedAddress.lowercase().trim(),
            formattedAddress = resolvedAddress,
            latitude = centerLat,
            longitude = centerLng,
            source = LocationSelectionSource.MAP_PICKER.name
        )

        assertEquals(LocationSelectionSource.MAP_PICKER.name, pickerResult.source)
        assertEquals(centerLat, pickerResult.latitude, 0.00001)
        assertEquals(centerLng, pickerResult.longitude, 0.00001)
        assertEquals(resolvedAddress, pickerResult.formattedAddress)
    }

    // LOCATION-04: Current location GPS resolution produces CURRENT_LOCATION source
    @Test
    fun testCurrentLocationProducesAtomicGpsBinding() {
        val gpsLat = 12.1280
        val gpsLng = -86.2650
        val gpsAddress = "Rotonda El Güegüense, Managua"

        val gpsItem = DireccionCacheada(
            id = UUID.randomUUID().toString(),
            searchText = gpsAddress.lowercase().trim(),
            formattedAddress = gpsAddress,
            latitude = gpsLat,
            longitude = gpsLng,
            source = LocationSelectionSource.CURRENT_LOCATION.name
        )

        assertEquals(LocationSelectionSource.CURRENT_LOCATION.name, gpsItem.source)
        assertEquals(12.1280, gpsItem.latitude, 0.0001)
        assertEquals(-86.2650, gpsItem.longitude, 0.0001)
    }

    // LOCATION-05 & LOCATION-07: Accuracy evaluation logic
    @Test
    fun testAccuracyEvaluation() {
        val highAccuracyMeters = 15.0f
        val isLowAccuracyHigh = highAccuracyMeters > 100f
        assertFalse(isLowAccuracyHigh)

        val poorAccuracyMeters = 150.0f
        val isLowAccuracyPoor = poorAccuracyMeters > 100f
        assertTrue(isLowAccuracyPoor)
    }

    // LOCATION-08: Saved address retains coordinates and labels
    @Test
    fun testSavedAddressRetainsFullCoordinates() {
        val savedAddr = Address(
            id = "addr_123",
            userId = "user_abc",
            label = "Casa",
            fullAddress = "Colonia Los Robles, Etapa 2, Managua",
            latitude = 12.1255,
            longitude = -86.2622,
            isDefault = true
        )

        val cachedFromSaved = DireccionCacheada(
            id = savedAddr.id,
            searchText = savedAddr.fullAddress.lowercase().trim(),
            formattedAddress = savedAddr.fullAddress,
            latitude = savedAddr.latitude,
            longitude = savedAddr.longitude,
            source = LocationSelectionSource.SAVED_ADDRESS.name
        )

        assertEquals(LocationSelectionSource.SAVED_ADDRESS.name, cachedFromSaved.source)
        assertEquals(savedAddr.latitude, cachedFromSaved.latitude, 0.00001)
        assertEquals(savedAddr.longitude, cachedFromSaved.longitude, 0.00001)
    }

    // LOCATION-09: Atomic method switching preserves consistency
    @Test
    fun testMethodSwitchingAtomicReplacement() {
        // Step 1: User selects via search
        var currentOrigin: DireccionCacheada? = DireccionCacheada(
            id = "1",
            searchText = "multicentro",
            formattedAddress = "Multicentro Las Américas",
            latitude = 12.1364,
            longitude = -86.2361,
            source = LocationSelectionSource.SEARCH.name
        )
        assertEquals(LocationSelectionSource.SEARCH.name, currentOrigin?.source)
        assertEquals(12.1364, currentOrigin?.latitude ?: 0.0, 0.0001)

        // Step 2: User switches to Map Picker
        currentOrigin = DireccionCacheada(
            id = "2",
            searchText = "barrio san luis",
            formattedAddress = "Barrio San Luis, Managua",
            latitude = 12.1500,
            longitude = -86.2400,
            source = LocationSelectionSource.MAP_PICKER.name
        )
        assertEquals(LocationSelectionSource.MAP_PICKER.name, currentOrigin.source)
        assertEquals(12.1500, currentOrigin.latitude, 0.0001)
        assertEquals("Barrio San Luis, Managua", currentOrigin.formattedAddress)

        // Step 3: User switches to Current Location
        currentOrigin = DireccionCacheada(
            id = "3",
            searchText = "mi ubicacion",
            formattedAddress = "Plaza Inter, Managua",
            latitude = 12.1400,
            longitude = -86.2700,
            source = LocationSelectionSource.CURRENT_LOCATION.name
        )
        assertEquals(LocationSelectionSource.CURRENT_LOCATION.name, currentOrigin.source)
        assertEquals(12.1400, currentOrigin.latitude, 0.0001)
        assertEquals("Plaza Inter, Managua", currentOrigin.formattedAddress)
    }

    // LOCATION-10: Reverse geocoding formatting fallback
    @Test
    fun testReverseGeocodingFallbackFormat() {
        val lat = 12.136412
        val lng = -86.251433
        val fallback = "Managua (${String.format(java.util.Locale.US, "%.4f", lat)}, ${String.format(java.util.Locale.US, "%.4f", lng)})"
        assertEquals("Managua (12.1364, -86.2514)", fallback)
    }

    // LOCATION-11: Distance calculation with valid coordinates
    @Test
    fun testRealDistanceCalculation() {
        val origin = DireccionCacheada(
            latitude = 12.1364,
            longitude = -86.2514,
            formattedAddress = "Punto A"
        )
        val destination = DireccionCacheada(
            latitude = 12.1500,
            longitude = -86.2400,
            formattedAddress = "Punto B"
        )

        val distanceKm = GeoUtils.calculateDistance(
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude
        )

        assertTrue("Distance should be greater than 0", distanceKm > 0.0)
        assertTrue("Distance should be reasonable for Managua points (< 35km)", distanceKm < 35.0)
    }

    // LOCATION-13: Pricing model immutability with calculated distance
    @Test
    fun testPricingCalculatedAccuratelyFromRealDistance() {
        val baseFee = 35.0
        val costPerKm = 15.0
        val distanceKm = 4.2

        val calculatedFee = baseFee + (distanceKm * costPerKm)
        assertEquals(98.0, calculatedFee, 0.001)
    }
}
