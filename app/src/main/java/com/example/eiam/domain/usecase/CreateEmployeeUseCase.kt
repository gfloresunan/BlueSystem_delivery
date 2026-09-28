package com.example.eiam.domain.usecase

import com.example.eiam.domain.engine.EmployeeEngine
import com.example.eiam.domain.model.Employee
import com.example.eiam.domain.model.EiamRole

/**
 * EIAM — CreateEmployeeUseCase (FASE 4)
 */
class CreateEmployeeUseCase(
    private val employeeEngine: EmployeeEngine
) {
    suspend operator fun invoke(
        uid: String,
        businessId: String,
        role: EiamRole,
        branchId: String? = null
    ): Result<Employee> {
        return employeeEngine.createEmployee(uid, businessId, role, branchId)
    }
}
