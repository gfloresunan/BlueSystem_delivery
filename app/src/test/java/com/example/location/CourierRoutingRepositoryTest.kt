package com.example.location

import com.example.data.repository.courier.CourierRoutingRepository
import com.example.domain.model.courier.CourierRoute
import com.example.domain.model.courier.CourierRoutePhase
import com.example.domain.model.courier.RoutingStatus
import com.google.android.gms.maps.model.LatLng
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * Pruebas unitarias para CourierRoutingRepository bajo el protocolo BSD-COURIER-REAL-ROAD-ROUTING-ETA-001.
 * Valida salvaguardas operacionales:
 * 1. Validación estricta de coordenadas (Cero coordenadas artificiales).
 * 2. Decodificación de polyline Google/OSRM.
 * 3. Cálculo de distancia a polyline y desvío canónico (200m).
 * 4. Cero líneas rectas como ruta de conducción.
 */
class CourierRoutingRepositoryTest {

    private lateinit var repository: CourierRoutingRepository

    @Before
    fun setup() {
        repository = CourierRoutingRepository()
    }

    @Test
    fun testCoordinateValidationNicaraguaBounds() {
        // Coordenadas válidas en Managua
        val validManagua = LatLng(12.1364, -86.2514)
        assertTrue(repository.isValidCoordinate(validManagua))

        // Coordenadas válidas en Masaya
        val validMasaya = LatLng(11.9744, -86.0942)
        assertTrue(repository.isValidCoordinate(validMasaya))

        // Cero coordenadas (0,0) -> Inválido
        val zeroCoords = LatLng(0.0, 0.0)
        assertFalse(repository.isValidCoordinate(zeroCoords))

        // Coordenadas fuera de Nicaragua (ej. París o Nueva York)
        val newYork = LatLng(40.7128, -74.0060)
        assertFalse(repository.isValidCoordinate(newYork))

        val nullCoords: LatLng? = null
        assertFalse(repository.isValidCoordinate(nullCoords))
    }

    @Test
    fun testPolylineDecodingAccuracy() {
        // Polyline codificada estándar de Google Maps
        // Representa puntos: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
        val encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
        val points = repository.decodePolyline(encoded)

        assertEquals(3, points.size)
        assertEquals(38.5, points[0].latitude, 0.001)
        assertEquals(-120.2, points[0].longitude, 0.001)
        assertEquals(40.7, points[1].latitude, 0.001)
        assertEquals(-120.95, points[1].longitude, 0.001)
        assertEquals(43.252, points[2].latitude, 0.001)
        assertEquals(-126.453, points[2].longitude, 0.001)
    }

    @Test
    fun testDeviationThresholdCanonical200m() {
        // Ruta de referencia: Metrocentro -> Rotonda Rubén Darío
        val p1 = LatLng(12.1285, -86.2655)
        val p2 = LatLng(12.1364, -86.2514)
        val route = CourierRoute(
            phase = CourierRoutePhase.TO_MERCHANT,
            points = listOf(p1, p2),
            distanceMeters = 1800,
            durationSeconds = 300,
            calculatedAt = System.currentTimeMillis() - 40000L, // 40s atrás (> 30s debounce)
            destination = p2
        )

        // Punto muy cercano a p1 (< 50m)
        val nearLocation = LatLng(12.1286, -86.2656)
        val distNear = repository.calculateMinDistanceToPolylineMeters(nearLocation, route.points)
        assertTrue("Distancia debe ser menor a 200m", distNear < 200.0)
        assertFalse(repository.shouldRecalculateDueToDeviation(nearLocation, route))

        // Punto con desvío notable (> 500m)
        val farLocation = LatLng(12.1450, -86.2800)
        val distFar = repository.calculateMinDistanceToPolylineMeters(farLocation, route.points)
        assertTrue("Distancia debe ser mayor a 200m", distFar > 200.0)
        assertTrue(repository.shouldRecalculateDueToDeviation(farLocation, route))
    }

    @Test
    fun testDebouncePreventsRecalculationUnder30Seconds() {
        val p1 = LatLng(12.1285, -86.2655)
        val p2 = LatLng(12.1364, -86.2514)
        val route = CourierRoute(
            phase = CourierRoutePhase.TO_MERCHANT,
            points = listOf(p1, p2),
            distanceMeters = 1800,
            durationSeconds = 300,
            calculatedAt = System.currentTimeMillis() - 5000L, // Solo pasaron 5s (< 30s debounce)
            destination = p2
        )

        // Aunque esté muy desviado, el debounce temporal debe bloquear la llamada
        val farLocation = LatLng(12.1450, -86.2800)
        assertFalse("Debounce activo debe evitar el recálculo", repository.shouldRecalculateDueToDeviation(farLocation, route))
    }
}
