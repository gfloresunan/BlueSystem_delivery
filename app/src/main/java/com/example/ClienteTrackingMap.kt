package com.example

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import com.google.maps.android.compose.*

@Composable
fun ClienteTrackingMap(
    ubicacionMotorizado: UbicacionRepartidor?,
    modifier: Modifier = Modifier,
    originLatLng: LatLng? = null,
    destinationLatLng: LatLng? = null,
    routePoints: List<LatLng> = emptyList(),
    originAddress: String = "",
    destinationAddress: String = "",
    onMarkerClick: () -> Unit = {}
) {
    val puntoCentral = remember(ubicacionMotorizado, originLatLng, destinationLatLng) {
        when {
            ubicacionMotorizado != null -> LatLng(ubicacionMotorizado.coordenadas.latitud, ubicacionMotorizado.coordenadas.longitud)
            originLatLng != null -> originLatLng
            destinationLatLng != null -> destinationLatLng
            else -> LatLng(12.1364, -86.2514)
        }
    }
    
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(puntoCentral, 15f)
    }

    var markerReferencia by remember { mutableStateOf<Marker?>(null) }
    var boundsAdjusted by remember { mutableStateOf(false) }

    LaunchedEffect(originLatLng, destinationLatLng) {
        if (!boundsAdjusted && originLatLng != null && destinationLatLng != null) {
            try {
                val boundsBuilder = LatLngBounds.builder()
                boundsBuilder.include(originLatLng)
                boundsBuilder.include(destinationLatLng)
                ubicacionMotorizado?.let {
                    boundsBuilder.include(LatLng(it.coordenadas.latitud, it.coordenadas.longitud))
                }
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngBounds(boundsBuilder.build(), 120)
                )
                boundsAdjusted = true
            } catch (_: Exception) {
            }
        }
    }

    GoogleMap(
        modifier = modifier.fillMaxSize(),
        cameraPositionState = cameraPositionState,
        uiSettings = MapUiSettings(zoomControlsEnabled = false),
        onMapClick = { }
    ) {
        if (originLatLng != null) {
            Marker(
                state = rememberMarkerState(position = originLatLng),
                title = "Origen: $originAddress",
                icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
            )
        }

        if (destinationLatLng != null) {
            Marker(
                state = rememberMarkerState(position = destinationLatLng),
                title = "Destino: $destinationAddress",
                icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED)
            )
        }

        if (routePoints.isNotEmpty()) {
            Polyline(
                points = routePoints,
                color = Color(0xFF2563EB),
                width = 12f
            )
        }

        MapEffect(ubicacionMotorizado) { map ->
            if (ubicacionMotorizado != null) {
                val nuevaPosicion = LatLng(ubicacionMotorizado.coordenadas.latitud, ubicacionMotorizado.coordenadas.longitud)
                
                if (markerReferencia == null) {
                    val markerOptions = MarkerOptions()
                        .position(nuevaPosicion)
                        .title("Motorizado en Ruta")
                        .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN))
                    val marker = map.addMarker(markerOptions)
                    markerReferencia = marker
                    map.setOnMarkerClickListener {
                        onMarkerClick()
                        true
                    }
                    if (originLatLng == null && destinationLatLng == null) {
                        map.animateCamera(CameraUpdateFactory.newLatLngZoom(nuevaPosicion, 16f))
                    }
                } else {
                    MarkerAnimationUtils.animarMarcador(
                        marcador = markerReferencia!!,
                        posicionNueva = nuevaPosicion,
                        duracionMs = 2000
                    )
                    if (originLatLng == null && destinationLatLng == null) {
                        map.animateCamera(CameraUpdateFactory.newLatLng(nuevaPosicion))
                    }
                }
            }
        }
    }
}
