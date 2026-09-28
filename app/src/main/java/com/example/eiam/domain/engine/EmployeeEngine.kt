package com.example.eiam.domain.engine

import com.example.eiam.domain.model.AccountStatus
import com.example.eiam.domain.model.Employee
import com.example.eiam.domain.model.EiamRole
import com.example.eiam.domain.repository.IEmployeeRepository
import com.google.firebase.Timestamp

/**
 * EIAM — EmployeeEngine (FASE 4)
 * Motor central de gestión de empleados del comercio.
 */
class EmployeeEngine(
    private val repository: IEmployeeRepository
) {

    suspend fun createEmployee(
        uid: String,
        businessId: String,
        role: EiamRole,
        branchId: String? = null
    ): Result<Employee> {
        if (!role.isBusinessRole()) {
            return Result.failure(IllegalArgumentException("El rol $role no es un rol de comercio válido."))
        }

        val employee = Employee(
            employeeId = "${businessId}_${uid}",
            uid = uid,
            businessId = businessId,
            branchId = branchId,
            role = role,
            status = AccountStatus.ACTIVE,
            createdAt = Timestamp.now()
        )

        val success = repository.saveEmployee(employee)
        return if (success) {
            Result.success(employee)
        } else {
            Result.failure(RuntimeException("Error guardando el empleado en Firestore."))
        }
    }

    suspend fun suspendEmployee(employeeId: String): Result<Boolean> {
        val success = repository.updateEmployeeStatus(employeeId, isActive = false)
        return if (success) {
            Result.success(true)
        } else {
            Result.failure(RuntimeException("Error al suspender al empleado."))
        }
    }

    suspend fun reactivateEmployee(employeeId: String): Result<Boolean> {
        val success = repository.updateEmployeeStatus(employeeId, isActive = true)
        return if (success) {
            Result.success(true)
        } else {
            Result.failure(RuntimeException("Error al reactivar al empleado."))
        }
    }

    suspend fun changeRole(employeeId: String, newRole: EiamRole): Result<Boolean> {
        if (!newRole.isBusinessRole()) {
            return Result.failure(IllegalArgumentException("El rol $newRole no es un rol de comercio válido."))
        }

        val success = repository.updateEmployeeRole(employeeId, newRole)
        return if (success) {
            Result.success(true)
        } else {
            Result.failure(RuntimeException("Error actualizando el rol del empleado."))
        }
    }
}
