package com.example

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*

// Estructura para representar los motorizados activos en el mapa
data class MotorizadoActivo(
    val id: String,
    val nombre: String,
    val latitud: Double,
    val longitud: Double,
    val estado: String // "disponible", "en_ruta", "offline"
)

@Composable
fun MapaGlobalAdmin(
    motorizados: List<MotorizadoActivo>,
    modifier: Modifier = Modifier
) {
    // Coordenadas por defecto para centrar el mapa (Managua, Nicaragua)
    val puntoCentral = remember { LatLng(12.1364, -86.2514) }
    
    // Configuración de la cámara inicial
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(puntoCentral, 12f)
    }

    // Propiedades de configuración del mapa de Google
    val uiSettings by remember {
        mutableStateOf(
            MapUiSettings(
                zoomControlsEnabled = false, // Ocultar botones de zoom para un look más limpio
                myLocationButtonEnabled = true
            )
        )
    }
    
    val mapProperties by remember {
        mutableStateOf(
            MapProperties(
                isMyLocationEnabled = false, // Cambiar a true si se tienen permisos de GPS del Admin
                mapType = MapType.NORMAL
            )
        )
    }

    Card(
        shape = RoundedCornerShape(20.dp),
        modifier = modifier.clip(RoundedCornerShape(20.dp))
    ) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = mapProperties,
            uiSettings = uiSettings
        ) {
            // Pintar dinámicamente un marcador por cada motorizado activo
            motorizados.forEach { motorizado ->
                val posicionMotorizado = LatLng(motorizado.latitud, motorizado.longitud)
                
                Marker(
                    state = MarkerState(position = posicionMotorizado),
                    title = motorizado.nombre,
                    snippet = "Estado: ${motorizado.estado.uppercase()}",
                    // Podrías personalizar el icono usando BitmapDescriptorFactory si tienes un recurso local:
                    // icon = BitmapDescriptorFactory.fromResource(R.drawable.ic_moto_marcador)
                )
            }
        }
    }
}
