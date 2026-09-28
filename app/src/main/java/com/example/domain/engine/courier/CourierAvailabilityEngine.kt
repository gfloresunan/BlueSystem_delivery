package com.example.domain.engine.courier

import com.example.domain.model.courier.CourierShiftState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class OperationalAvailability {
    DISPONIBLE,
    NO_DISPONIBLE,
    SOBRECARGADO,
    BATERIA_BAJA,
    SIN_INTERNET,
    VEHICULO_AVERIO,
    EN_DESCANSO,
    EN_INCIDENTE
}

/**
 * Motor de cálculo de disponibilidad operativa real (CourierAvailabilityEngine).
 * Determina si el repartidor está apto para recibir asignaciones inteligentes (Hito 15).
 */
class CourierAvailabilityEngine {

    private val _availability = MutableStateFlow(OperationalAvailability.NO_DISPONIBLE)
    val availability: StateFlow<OperationalAvailability> = _availability.asStateFlow()

    fun evaluateAvailability(
        shiftState: CourierShiftState,
        batteryLevel: Int,
        isOnline: Boolean,
        isVehicleRoadworthy: Boolean,
        hasActiveIncident: Boolean,
        activeOrdersCount: Int = 0
    ): OperationalAvailability {

        val result = when {
            shiftState == CourierShiftState.OFFLINE || shiftState == CourierShiftState.SUSPENDED -> OperationalAvailability.NO_DISPONIBLE
            hasActiveIncident || shiftState == CourierShiftState.EMERGENCY -> OperationalAvailability.EN_INCIDENTE
            !isVehicleRoadworthy -> OperationalAvailability.VEHICULO_AVERIO
            !isOnline -> OperationalAvailability.SIN_INTERNET
            batteryLevel < 15 -> OperationalAvailability.BATERIA_BAJA
            shiftState == CourierShiftState.PAUSED -> OperationalAvailability.EN_DESCANSO
            activeOrdersCount >= 3 -> OperationalAvailability.SOBRECARGADO
            shiftState in listOf(CourierShiftState.ONLINE, CourierShiftState.WAITING_ORDER) -> OperationalAvailability.DISPONIBLE
            else -> OperationalAvailability.NO_DISPONIBLE
        }

        _availability.value = result
        return result
    }
}
