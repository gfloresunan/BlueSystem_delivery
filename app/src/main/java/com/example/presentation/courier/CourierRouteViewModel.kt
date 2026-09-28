package com.example.presentation.courier

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.repository.courier.CourierRoutingRepository
import com.example.domain.model.courier.CourierRoute
import com.example.domain.model.courier.CourierRoutePhase
import com.example.domain.model.courier.RouteCardVisibility
import com.example.domain.model.courier.RoutingStatus
import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ViewModel especializado para la navegación y routing de Courier App.
 * Totalmente desacoplado de la máquina de estados comercial de Firestore.
 */
class CourierRouteViewModel(
    private val repository: CourierRoutingRepository = CourierRoutingRepository()
) : ViewModel() {

    companion object {
        private const val TAG = "CourierRouteVM"
    }

    private val _routingStatus = MutableStateFlow(RoutingStatus.IDLE)
    val routingStatus: StateFlow<RoutingStatus> = _routingStatus.asStateFlow()

    private val _activeRoute = MutableStateFlow<CourierRoute?>(null)
    val activeRoute: StateFlow<CourierRoute?> = _activeRoute.asStateFlow()

    private val _customerRoute = MutableStateFlow<CourierRoute?>(null)
    val customerRoute: StateFlow<CourierRoute?> = _customerRoute.asStateFlow()

    // Estado visual de la tarjeta de navegación: Inicia COLLAPSED al navegar para maximizar el mapa
    private val _cardVisibility = MutableStateFlow(RouteCardVisibility.COLLAPSED)
    val cardVisibility: StateFlow<RouteCardVisibility> = _cardVisibility.asStateFlow()

    // Control de debounce para recálculo por desvío
    private var isCalculating = false

    /**
     * Calcula la ruta vial para una fase determinada.
     */
    fun loadRouteForPhase(
        origin: LatLng?,
        destination: LatLng?,
        phase: CourierRoutePhase,
        forceRecalculate: Boolean = false
    ) {
        if (origin == null || destination == null) {
            _routingStatus.value = RoutingStatus.NO_VALID_COORDINATES
            _activeRoute.value = null
            return
        }

        if (isCalculating) return
        isCalculating = true
        _routingStatus.value = if (_activeRoute.value == null) RoutingStatus.CALCULATING else RoutingStatus.UPDATING

        viewModelScope.launch {
            try {
                val (status, route) = repository.resolveRoute(
                    origin = origin,
                    destination = destination,
                    phase = phase,
                    forceRecalculate = forceRecalculate
                )
                _routingStatus.value = status
                if (route != null) {
                    _activeRoute.value = route
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error calculando ruta: ${e.message}", e)
                _routingStatus.value = RoutingStatus.ERROR
            } finally {
                isCalculating = false
            }
        }
    }

    /**
     * Resuelve la ruta hacia el cliente (Fase 2) para tenerla siempre visible en el mapa por calles.
     */
    fun loadCustomerRoute(
        origin: LatLng?,
        destination: LatLng?,
        forceRecalculate: Boolean = false
    ) {
        if (origin == null || destination == null) {
            _customerRoute.value = null
            return
        }
        viewModelScope.launch {
            try {
                val (_, route) = repository.resolveRoute(
                    origin = origin,
                    destination = destination,
                    phase = CourierRoutePhase.TO_CUSTOMER,
                    forceRecalculate = forceRecalculate
                )
                if (route != null) {
                    _customerRoute.value = route
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error calculando ruta al cliente: ${e.message}", e)
            }
        }
    }

    /**
     * Notifica nueva coordenada GPS para evaluar desvío de ruta sin saturar llamadas de red.
     */
    fun onGpsLocationUpdated(
        currentLocation: LatLng?,
        currentPhase: CourierRoutePhase,
        destination: LatLng?
    ) {
        if (currentLocation == null || destination == null) return
        val currentRoute = _activeRoute.value ?: return

        // Solo evalúa si no está calculando actualmente
        if (!isCalculating && repository.shouldRecalculateDueToDeviation(currentLocation, currentRoute)) {
            Log.d(TAG, "DISPARANDO_RECALCULO_POR_DESVIO: fase=$currentPhase")
            loadRouteForPhase(
                origin = currentLocation,
                destination = destination,
                phase = currentPhase,
                forceRecalculate = true
            )
        }
    }

    /**
     * Alterna la visibilidad de la tarjeta inferior para maximizar el mapa o ver detalles.
     */
    fun toggleCardVisibility() {
        _cardVisibility.update { current ->
            if (current == RouteCardVisibility.VISIBLE) RouteCardVisibility.COLLAPSED else RouteCardVisibility.VISIBLE
        }
    }

    fun setCardVisibility(visibility: RouteCardVisibility) {
        _cardVisibility.value = visibility
    }

    /**
     * Restauración automática de la tarjeta completa al entrar a la geocerca de destino.
     */
    fun onArrivedAtGeofence() {
        if (_cardVisibility.value != RouteCardVisibility.VISIBLE) {
            Log.d(TAG, "LLEGADA_GEOFENCE_DETECTADA: Restaurando tarjeta a VISIBLE")
            _cardVisibility.value = RouteCardVisibility.VISIBLE
        }
    }
}
