package com.example.domain.engine.courier

import com.example.domain.model.courier.Vehicle
import com.example.domain.model.courier.VehicleFuelLog
import com.example.domain.model.courier.VehicleMaintenanceLog
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

/**
 * Motor de gestión de flota y ciclo de vida de vehículos (VehicleEngine).
 */
class VehicleEngine {

    private val _assignedVehicle = MutableStateFlow<Vehicle?>(null)
    val assignedVehicle: StateFlow<Vehicle?> = _assignedVehicle.asStateFlow()

    fun setVehicle(vehicle: Vehicle) {
        _assignedVehicle.value = vehicle
    }

    fun updateOdometer(newOdometerKm: Double): Boolean {
        val current = _assignedVehicle.value ?: return false
        if (newOdometerKm < current.currentOdometerKm) {
            return false // El odómetro no puede retroceder
        }
        _assignedVehicle.update { it?.copy(currentOdometerKm = newOdometerKm) }
        return true
    }

    fun addFuelEntry(liters: Double, cost: Double, odometerKm: Double): VehicleFuelLog? {
        val current = _assignedVehicle.value ?: return null
        val log = VehicleFuelLog(
            logId = UUID.randomUUID().toString(),
            odometerKm = odometerKm,
            litersRefueled = liters,
            totalCost = cost
        )
        val updatedFuelHistory = current.fuelHistory + log
        _assignedVehicle.update {
            it?.copy(
                currentOdometerKm = maxOf(it.currentOdometerKm, odometerKm),
                fuelHistory = updatedFuelHistory
            )
        }
        return log
    }

    fun addMaintenanceEntry(serviceType: String, cost: Double, odometerKm: Double, notes: String): VehicleMaintenanceLog? {
        val current = _assignedVehicle.value ?: return null
        val log = VehicleMaintenanceLog(
            logId = UUID.randomUUID().toString(),
            odometerKm = odometerKm,
            serviceType = serviceType,
            cost = cost,
            notes = notes
        )
        val updatedMaintenanceHistory = current.maintenanceHistory + log
        _assignedVehicle.update {
            it?.copy(
                currentOdometerKm = maxOf(it.currentOdometerKm, odometerKm),
                maintenanceHistory = updatedMaintenanceHistory
            )
        }
        return log
    }
}
