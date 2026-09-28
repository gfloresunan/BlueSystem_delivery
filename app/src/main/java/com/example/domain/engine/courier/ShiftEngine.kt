package com.example.domain.engine.courier

import com.example.domain.model.courier.CourierShiftState
import com.example.domain.model.courier.PauseReason
import com.example.domain.model.courier.ShiftSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Motor central de gestión de turnos del motorizado (ShiftEngine).
 * Maneja las transiciones de estado, valida movimientos permitidos y registra tiempos de ciclo.
 */
class ShiftEngine {

    private val _currentSession = MutableStateFlow(ShiftSession())
    val currentSession: StateFlow<ShiftSession> = _currentSession.asStateFlow()

    /**
     * Inicia un nuevo turno operativo para el repartidor.
     */
    fun startShift(courierId: String, initialBattery: Int = 100, initialOdometer: Double = 0.0): Boolean {
        if (_currentSession.value.currentState != CourierShiftState.OFFLINE) {
            return false // Ya existe un turno activo
        }
        val shiftId = "shift_${courierId}_${System.currentTimeMillis()}"
        val newSession = ShiftSession(
            shiftId = shiftId,
            courierId = courierId,
            currentState = CourierShiftState.ONLINE,
            startTimeMs = System.currentTimeMillis(),
            initialBatteryLevel = initialBattery,
            initialOdometerKm = initialOdometer
        )
        _currentSession.value = newSession
        return true
    }

    /**
     * Restaura una sesión de turno persistida previamente desde Firestore o almacenamiento local.
     */
    fun restoreSession(session: ShiftSession) {
        _currentSession.value = session
    }

    /**
     * Transiciona el estado del turno verificando reglas de negocio.
     */
    fun transitionTo(newState: CourierShiftState, orderId: String? = null): Boolean {
        val current = _currentSession.value.currentState
        if (!isValidTransition(current, newState)) {
            return false
        }
        _currentSession.update { session ->
            session.copy(
                currentState = newState,
                activeOrderId = orderId ?: session.activeOrderId,
                activePauseReason = if (newState == CourierShiftState.PAUSED) session.activePauseReason else null
            )
        }
        return true
    }

    /**
     * Pausa el turno especificando un motivo explícito.
     */
    fun pauseShift(reason: PauseReason): Boolean {
        val current = _currentSession.value.currentState
        if (current != CourierShiftState.ONLINE && current != CourierShiftState.WAITING_ORDER) {
            return false
        }
        _currentSession.update {
            it.copy(
                currentState = CourierShiftState.PAUSED,
                activePauseReason = reason
            )
        }
        return true
    }

    /**
     * Reanuda un turno pausado regresando a ONLINE/WAITING_ORDER.
     */
    fun resumeShift(): Boolean {
        if (_currentSession.value.currentState != CourierShiftState.PAUSED) {
            return false
        }
        _currentSession.update {
            it.copy(
                currentState = CourierShiftState.WAITING_ORDER,
                activePauseReason = null
            )
        }
        return true
    }

    /**
     * Activa el estado de emergencia SOS.
     */
    fun triggerEmergency(): Boolean {
        _currentSession.update {
            it.copy(currentState = CourierShiftState.EMERGENCY)
        }
        return true
    }

    /**
     * Cierra el turno activo del motorizado.
     */
    fun endShift(finalOdometerKm: Double? = null): ShiftSession {
        val endedSession = _currentSession.value.copy(
            currentState = CourierShiftState.OFFLINE,
            endTimeMs = System.currentTimeMillis(),
            finalOdometerKm = finalOdometerKm
        )
        _currentSession.value = ShiftSession() // Reset a vacio
        return endedSession
    }

    /**
     * Valida la matriz de transiciones permitidas entre estados.
     */
    private fun isValidTransition(from: CourierShiftState, to: CourierShiftState): Boolean {
        if (from == to) return true
        if (to == CourierShiftState.EMERGENCY || to == CourierShiftState.SUSPENDED) return true // Transiciones de prioridad
        if (from == CourierShiftState.SUSPENDED) return to == CourierShiftState.OFFLINE // Solo la administración o deslogueo des-suspende

        return when (from) {
            CourierShiftState.OFFLINE -> to == CourierShiftState.ONLINE
            CourierShiftState.ONLINE -> to in listOf(CourierShiftState.WAITING_ORDER, CourierShiftState.PAUSED, CourierShiftState.OFFLINE)
            CourierShiftState.WAITING_ORDER -> to in listOf(CourierShiftState.ORDER_RESERVED, CourierShiftState.GOING_TO_STORE, CourierShiftState.PAUSED, CourierShiftState.OFFLINE)
            CourierShiftState.ORDER_RESERVED -> to in listOf(CourierShiftState.GOING_TO_STORE, CourierShiftState.WAITING_ORDER, CourierShiftState.ONLINE)
            CourierShiftState.GOING_TO_STORE -> to in listOf(CourierShiftState.AT_STORE, CourierShiftState.WAITING_ORDER)
            CourierShiftState.AT_STORE -> to in listOf(CourierShiftState.ORDER_PICKED, CourierShiftState.WAITING_ORDER)
            CourierShiftState.ORDER_PICKED -> to in listOf(CourierShiftState.GOING_TO_CUSTOMER)
            CourierShiftState.GOING_TO_CUSTOMER -> to in listOf(CourierShiftState.AT_CUSTOMER)
            CourierShiftState.AT_CUSTOMER -> to in listOf(CourierShiftState.DELIVERING)
            CourierShiftState.DELIVERING -> to in listOf(CourierShiftState.DELIVERED, CourierShiftState.GOING_TO_CUSTOMER)
            CourierShiftState.DELIVERED -> to in listOf(CourierShiftState.WAITING_ORDER, CourierShiftState.ONLINE, CourierShiftState.OFFLINE)
            CourierShiftState.PAUSED -> to in listOf(CourierShiftState.ONLINE, CourierShiftState.WAITING_ORDER, CourierShiftState.OFFLINE)
            CourierShiftState.EMERGENCY -> to in listOf(CourierShiftState.ONLINE, CourierShiftState.OFFLINE)
            CourierShiftState.SUSPENDED -> false
        }
    }
}
