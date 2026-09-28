package com.example.domain.engine.courier

import com.example.domain.model.courier.CourierIncidentType
import com.example.domain.model.courier.IncidentReport
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

/**
 * Motor de gestión de incidencias operativas en ruta (IncidentEngine).
 */
class IncidentEngine {

    private val _activeIncidents = MutableStateFlow<List<IncidentReport>>(emptyList())
    val activeIncidents: StateFlow<List<IncidentReport>> = _activeIncidents.asStateFlow()

    /**
     * Registra una nueva incidencia operativa.
     */
    fun reportIncident(
        courierId: String,
        incidentType: CourierIncidentType,
        description: String,
        orderId: String? = null,
        photoEvidenceUrl: String? = null,
        latitude: Double = 0.0,
        longitude: Double = 0.0
    ): Result<IncidentReport> {

        if (incidentType.requiresEvidence && photoEvidenceUrl.isNullOrBlank()) {
            return Result.failure(IllegalArgumentException("El tipo de incidencia '${incidentType.displayName}' requiere evidencia fotográfica obligatoria."))
        }

        val report = IncidentReport(
            reportId = UUID.randomUUID().toString(),
            orderId = orderId,
            courierId = courierId,
            incidentType = incidentType,
            description = description,
            photoEvidenceUrl = photoEvidenceUrl,
            latitude = latitude,
            longitude = longitude,
            timestampMs = System.currentTimeMillis(),
            status = "REGISTERED"
        )

        _activeIncidents.update { current ->
            current + report
        }

        return Result.success(report)
    }

    /**
     * Resuelve o cierra un informe de incidencia.
     */
    fun resolveIncident(reportId: String, resolutionNotes: String): Boolean {
        var found = false
        _activeIncidents.update { list ->
            list.map { item ->
                if (item.reportId == reportId) {
                    found = true
                    item.copy(status = "RESOLVED")
                } else item
            }
        }
        return found
    }

    /**
     * Obtiene el listado de incidencias pendientes de resolución para una orden.
     */
    fun getPendingIncidentsForOrder(orderId: String): List<IncidentReport> {
        return _activeIncidents.value.filter { it.orderId == orderId && it.status == "REGISTERED" }
    }
}
