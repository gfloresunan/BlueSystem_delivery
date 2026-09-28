package com.example.domain.engine.navigation

import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap

/**
 * StreetRoutingEngine - Motor de Trazado de Rutas por Calles Reales (Zero Maps Cost).
 * Obtiene la geometría calle a calle (turn-by-turn geometry) vía OSRM y la cachea en memoria.
 */
object StreetRoutingEngine {
    private val routeCache = ConcurrentHashMap<String, List<LatLng>>()

    suspend fun getRouteCoordinates(origin: LatLng, destination: LatLng): List<LatLng> {
        val cacheKey = "${String.format(java.util.Locale.US, "%.4f,%.4f", origin.latitude, origin.longitude)}_${String.format(java.util.Locale.US, "%.4f,%.4f", destination.latitude, destination.longitude)}"
        routeCache[cacheKey]?.let { return it }

        return withContext(Dispatchers.IO) {
            try {
                val urlString = "https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson"
                val url = URL(urlString)
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 4000
                conn.readTimeout = 4000
                conn.requestMethod = "GET"
                conn.setRequestProperty("User-Agent", "BlueSystemDelivery/2.2")

                if (conn.responseCode == 200) {
                    val response = conn.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(response)
                    val routes = json.optJSONArray("routes")
                    if (routes != null && routes.length() > 0) {
                        val firstRoute = routes.getJSONObject(0)
                        val geometry = firstRoute.getJSONObject("geometry")
                        val coordinates = geometry.getJSONArray("coordinates")
                        val points = mutableListOf<LatLng>()
                        for (i in 0 until coordinates.length()) {
                            val coord = coordinates.getJSONArray(i)
                            val lng = coord.getDouble(0)
                            val lat = coord.getDouble(1)
                            points.add(LatLng(lat, lng))
                        }
                        if (points.isNotEmpty()) {
                            routeCache[cacheKey] = points
                            return@withContext points
                        }
                    }
                }
                listOf(origin, destination)
            } catch (e: Exception) {
                android.util.Log.w("StreetRoutingEngine", "Fallback straight line: ${e.message}")
                listOf(origin, destination)
            }
        }
    }
}
