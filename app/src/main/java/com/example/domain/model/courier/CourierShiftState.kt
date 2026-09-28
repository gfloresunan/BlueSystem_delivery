package com.example.domain.model.courier

/**
 * Máquina de estados granular para el turno y operación del motorizado (Uber-level Granularity).
 */
enum class CourierShiftState {
    /** Turno cerrado u offline */
    OFFLINE,

    /** Conectado a la red, listo para operar */
    ONLINE,

    /** En espera activa de asignación de pedido */
    WAITING_ORDER,

    /** Pedido ofertado / reservado temporalmente para decisión */
    ORDER_RESERVED,

    /** En ruta de traslado hacia el comercio (Fase 1) */
    GOING_TO_STORE,

    /** Arribado a las instalaciones del comercio */
    AT_STORE,

    /** Pedido recolectado y verificado en la tienda */
    ORDER_PICKED,

    /** En ruta de traslado hacia el cliente (Fase 2) */
    GOING_TO_CUSTOMER,

    /** Arribado a la ubicación/puerta del cliente */
    AT_CUSTOMER,

    /** En proceso de entrega y validación de evidencias (PoD) */
    DELIVERING,

    /** Entrega finalizada exitosamente */
    DELIVERED,

    /** En pausa activa (almuerzo, recarga de combustible, descanso) */
    PAUSED,

    /** Estado de emergencia activado (Botón SOS) */
    EMERGENCY,

    /** Bloqueado por auditoría de seguridad o administración */
    SUSPENDED
}

/**
 * Motivo detallado de la pausa del turno.
 */
enum class PauseReason {
    ALMUERZO,
    COMBUSTIBLE,
    DESCANSO_PERSONAL,
    MANTENIMIENTO_RUTINARIO,
    CONDICION_CLIMATICA
}

/**
 * Representa la sesión de turno activa del motorizado.
 */
data class ShiftSession(
    val shiftId: String = "",
    val courierId: String = "",
    val currentState: CourierShiftState = CourierShiftState.OFFLINE,
    val startTimeMs: Long = 0L,
    val endTimeMs: Long? = null,
    val activePauseReason: PauseReason? = null,
    val initialBatteryLevel: Int = 100,
    val initialOdometerKm: Double = 0.0,
    val finalOdometerKm: Double? = null,
    val activeOrderId: String? = null
)
