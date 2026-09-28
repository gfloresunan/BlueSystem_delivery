package com.example.domain.model.courier

/**
 * Categorías principales de incidencias en ruta.
 */
enum class IncidentCategory {
    CLIENTE,
    COMERCIO,
    VEHICULO,
    SISTEMA_RED,
    CLIMA_ENTORNO
}

/**
 * Catálogo granulado de 25 tipos de incidencias operativas.
 */
enum class CourierIncidentType(val category: IncidentCategory, val displayName: String, val requiresEvidence: Boolean) {
    // --- Categoría CLIENTE ---
    CLIENTE_NO_RESPONDE(IncidentCategory.CLIENTE, "Cliente no responde llamadas/mensajes", false),
    DIRECCION_INCORRECTA(IncidentCategory.CLIENTE, "Dirección de entrega incorrecta o inaccesible", false),
    CLIENTE_RECHAZA_PEDIDO(IncidentCategory.CLIENTE, "Cliente rechaza el pedido", true),
    CLIENTE_SIN_DINERO(IncidentCategory.CLIENTE, "Cliente no cuenta con el efectivo completo", false),
    CLIENTE_SOLICITA_CAMBIO(IncidentCategory.CLIENTE, "Cliente solicita cambio de dirección", false),

    // --- Categoría COMERCIO ---
    PEDIDO_NO_LISTO(IncidentCategory.COMERCIO, "Comercio presenta demora excesiva (>20 min)", false),
    PRODUCTO_AGOTADO(IncidentCategory.COMERCIO, "Falta un producto del pedido en la tienda", false),
    COMERCIO_CERRADO(IncidentCategory.COMERCIO, "El establecimiento se encuentra cerrado", true),
    EMPAQUE_DANADO_TIENDA(IncidentCategory.COMERCIO, "El comercio entregó el paquete dañado", true),
    COMERCIO_NO_RECIBIO_ORDEN(IncidentCategory.COMERCIO, "Comercio no tiene la orden en su sistema (KDS)", false),

    // --- Categoría VEHÍCULO ---
    NEUMATICO_PINCHADO(IncidentCategory.VEHICULO, "Neumático pinchado en ruta", true),
    FALLA_BATERIA(IncidentCategory.VEHICULO, "Falla eléctrica o batería agotada", false),
    AVERIA_MECANICA(IncidentCategory.VEHICULO, "Avería mecánica general del vehículo", true),
    ACCIDENTE_TRANSITO(IncidentCategory.VEHICULO, "Accidente de tránsito en ruta", true),
    FALTA_COMBUSTIBLE(IncidentCategory.VEHICULO, "Sin combustible en trayecto", false),

    // --- Categoría SISTEMA / RED ---
    PERDIDA_SENAL_GPS(IncidentCategory.SISTEMA_RED, "Pérdida prolongada de señal GPS", false),
    CORTE_CONEXION_INTERNET(IncidentCategory.SISTEMA_RED, "Sin datos móviles / conectividad", false),
    ERROR_APLICACION(IncidentCategory.SISTEMA_RED, "Cierre inesperado / Error de aplicación", false),
    FALLA_FCM_NOTIFICACION(IncidentCategory.SISTEMA_RED, "Falla de recepción de notificaciones Push", false),

    // --- Categoría CLIMA / ENTORNO ---
    LLUVIA_TORRENCIAL(IncidentCategory.CLIMA_ENTORNO, "Lluvia torrencial imposibilita tránsito seguro", true),
    INUNDACION_VIAL(IncidentCategory.CLIMA_ENTORNO, "Vías de acceso inundadas", true),
    TRAFICO_CONGESTIONADO(IncidentCategory.CLIMA_ENTORNO, "Congestión vehicular severa / Embotellamiento", false),
    BLOQUEO_CERCO_POLICIAL(IncidentCategory.CLIMA_ENTORNO, "Bloqueo de calles / Cerco policial", false),
    ZONA_ALTO_RIESGO(IncidentCategory.CLIMA_ENTORNO, "Zona insegura / Riesgo de asalto", false)
}

/**
 * Evento de incidencia registrado.
 */
data class IncidentReport(
    val reportId: String = "",
    val orderId: String? = null,
    val courierId: String = "",
    val incidentType: CourierIncidentType,
    val description: String = "",
    val photoEvidenceUrl: String? = null,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val timestampMs: Long = System.currentTimeMillis(),
    val status: String = "REGISTERED" // REGISTERED, UNDER_REVIEW, RESOLVED, DISMISSED
)
