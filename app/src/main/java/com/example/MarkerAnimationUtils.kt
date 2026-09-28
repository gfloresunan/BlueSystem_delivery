package com.example

import android.animation.ValueAnimator
import android.view.animation.LinearInterpolator
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

object MarkerAnimationUtils {

    /**
     * Desplaza un marcador de Google Maps de forma suave entre dos coordenadas
     * y calcula su rotación automática según el sentido de la marcha.
     */
    fun animarMarcador(
        marcador: Marker,
        posicionNueva: LatLng,
        duracionMs: Long = 2000
    ) {
        val posicionInicial = marcador.position
        
        // 1. Calcular la rotación (Bearing) antes de moverlo
        val rotacion = calcularRotacion(posicionInicial, posicionNueva)
        if (rotacion != 0f) {
            marcador.rotation = rotacion
        }

        // 2. Interpolar la posición de forma lineal
        val valueAnimator = ValueAnimator.ofFloat(0f, 1f)
        valueAnimator.duration = duracionMs
        valueAnimator.interpolator = LinearInterpolator()
        valueAnimator.addUpdateListener { animation ->
            val v = animation.animatedValue as Float
            val lat = v * posicionNueva.latitude + (1 - v) * posicionInicial.latitude
            val lng = v * posicionNueva.longitude + (1 - v) * posicionInicial.longitude
            
            marcador.position = LatLng(lat, lng)
        }
        valueAnimator.start()
    }

    private fun calcularRotacion(inicio: LatLng, fin: LatLng): Float {
        val lat1 = Math.toRadians(inicio.latitude)
        val lon1 = Math.toRadians(inicio.longitude)
        val lat2 = Math.toRadians(fin.latitude)
        val lon2 = Math.toRadians(fin.longitude)

        val dLon = lon2 - lon1
        val y = sin(dLon) * cos(lat2)
        val x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon)
        
        val tance = atan2(y, x)
        return ((Math.toDegrees(tance) + 360) % 360).toFloat()
    }
}
